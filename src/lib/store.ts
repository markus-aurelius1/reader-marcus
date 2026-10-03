import { create } from 'zustand'
import { db } from './db'
import { anchor, newHid, textStream, type Color, type FoundMark, type Highlight } from './highlight'
import { migrateOverrides, newRev, type V2Override } from './migrate'
import { sectionByKey, type Chapter, type Section, type Subject } from './content'
import { keyOf, kindOf, type Field, type Kind, type Rec } from '../sync/merge'
import { relink } from './links'
import type { ContentRef, ProgressSummary, RecentDestination, StudyTimerPreferences } from './contract'
import { timeZone, type Env } from './timer'

export type Override = V2Override
export type { Highlight }
export type Status = 'new' | 'reading' | 'revised' | 'mastered'
export const STATUS_LABEL: Record<Status, string> = {
  new: 'Not started',
  reading: 'Reading',
  revised: 'Revised',
  mastered: 'Mastered',
}
export interface SectionState {
  done?: boolean
  difficult?: boolean
  revise?: boolean
}
export interface ChapterState {
  status?: Status
  scroll?: number
  section?: string
  at?: number
}
export interface Progress {
  sections: Record<string, SectionState>
  chapters: Record<string, ChapterState>
  last?: { chapterKey: string; at: number }
}
export interface Prefs {
  theme: 'light' | 'dark' | 'system'
  recall: boolean
  sidebar: boolean
  collapsed: string[]
  // NavigationPreferences (docs/READER_V2_CONTRACT.md)
  favourites: ContentRef[]
  recents: RecentDestination[]
  // StudyTimerPreferences
  timer: StudyTimerPreferences
}
export type SaveState = 'idle' | 'editing' | 'saving' | 'saved'
/** docId → field → [time, device]: when each progress / preference field last changed. */
type Stamps = Record<string, Record<string, [number, string]>>

const PREFS_KEY = 'upsc-prefs'
const SYNCED_PREFS = ['theme', 'recall', 'collapsed', 'favourites', 'recents', 'timer'] as const
// changed by ordinary reading; they ride with the next sync instead of starting one
const LAZY_PREFS = ['collapsed', 'recents']
const defaultTimer: StudyTimerPreferences = { trackingGranularity: 'chapter', followNavigation: true }
const defaultPrefs: Prefs = { theme: 'system', recall: false, sidebar: true, collapsed: [], favourites: [], recents: [], timer: defaultTimer }
function readPrefs(): Prefs {
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }
  } catch {
    return defaultPrefs
  }
}

export const deviceId = (() => {
  try {
    let id = localStorage.getItem('upsc-device')
    if (!id) {
      id = 'd' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('upsc-device', id)
    }
    return id
  } catch {
    return 'd-anon'
  }
})()

interface State {
  ready: boolean
  overrides: Record<string, Override> // includes reset tombstones (deleted: true, no title/html)
  highlights: Record<string, Highlight> // includes tombstones (deleted: true)
  progress: Progress
  prefs: Prefs
  conflicts: Record<string, Rec> // docId → cloud version awaiting the user's choice
  /** Bumped per section when a change arrives from another device, so open editors reload. */
  ext: Record<string, number>
  saveState: SaveState
  editMode: boolean
  focus: boolean
  init: () => Promise<void>
  saveOverride: (key: string, patch: { title?: string; html?: string }, immediate?: boolean) => void
  resetOverrides: (prefix: string) => Promise<{ kept: number; unplaced: number }>
  addHighlight: (sectionKey: string, a: { start: number; end: number; text: string; before: string; color: Color }, replace?: string[]) => string
  recolorHighlights: (ids: string[], color: Color) => void
  removeHighlights: (ids: string[]) => void
  reconcileMarks: (sectionKey: string, marks: FoundMark[], known: Set<string>) => Set<string>
  setSection: (key: string, patch: SectionState) => void
  setChapter: (key: string, patch: ChapterState, touch?: boolean) => void
  setPref: (patch: Partial<Prefs>) => void
  set: (patch: Partial<Pick<State, 'editMode' | 'focus'>>) => void
}

// ---- persistence plumbing ---------------------------------------------------
const dirtyRows = new Set<string>() // override keys waiting for the debounced IndexedDB write
let flushTimer = 0
let progressTimer = 0
let stamps: Stamps = {}

// ---- sync queue (outbox) ----------------------------------------------------
const outbox = new Map<string, number>() // docId → sequence of its latest change
let seq = 0
let cursor = 0
/** Set by the sync module; called whenever something is queued. `lazy` = reading position only. */
export const syncHooks = { onDirty: (_lazy: boolean) => {}, onConflicts: () => {} }

export function markDirty(id: string, lazy = false) {
  seq++
  outbox.set(id, seq)
  db.put('outbox', { id, seq }).catch(() => {})
  syncHooks.onDirty(lazy)
}
function stamp(id: string, fields: string[], t = Date.now()) {
  stamps = { ...stamps, [id]: { ...stamps[id], ...Object.fromEntries(fields.map((f) => [f, [t, deviceId] as [number, string]])) } }
}
const baseStream = (key: string) => {
  const s = sectionByKey(key)
  return s ? textStream(s.html) : undefined
}
const putHighlights = (rows: Highlight[]) => rows.length && db.putMany('highlights', rows).catch((e) => console.error('[store] highlight save failed', e))

export const useStore = create<State>((set, get) => ({
  ready: false,
  overrides: {},
  highlights: {},
  progress: { sections: {}, chapters: {} },
  prefs: readPrefs(),
  conflicts: {},
  ext: {},
  saveState: 'idle',
  editMode: false,
  focus: false,

  async init() {
    try {
      const [rows, hl, progress, st, schema, out, cur, conf] = await Promise.all([
        db.getAll<Override>('overrides'),
        db.getAll<Highlight>('highlights'),
        db.get<Progress>('kv', 'progress'),
        db.get<Stamps>('kv', 'stamps'),
        db.get<number>('kv', 'schema'),
        db.getAll<{ id: string; seq: number }>('outbox'),
        db.get<number>('kv', 'syncCursor'),
        db.getAll<{ id: string; remote: Rec }>('conflicts'),
      ])
      let overrideRows = rows
      let highlightRows = hl
      const prog = progress ?? { sections: {}, chapters: {} }
      stamps = st ?? {}
      if (schema !== 2) {
        // v1 → v2: lift highlights out of saved HTML; give existing progress/preferences a timestamp.
        const m = migrateOverrides(rows, (k) => sectionByKey(k)?.html, deviceId)
        overrideRows = m.overrides
        highlightRows = [...hl, ...m.highlights]
        const now = Date.now()
        for (const [k, v] of Object.entries(prog.sections)) stamp(`sec~${k}`, Object.keys(v), now)
        for (const [k, v] of Object.entries(prog.chapters)) stamp(`chap~${k}`, Object.keys(v), now)
        if (localStorage.getItem(PREFS_KEY)) stamp('pref~main', [...SYNCED_PREFS], now)
        await db.putMany('highlights', m.highlights)
        await db.putMany('overrides', m.overrides)
        await db.delMany('overrides', m.drop)
        await db.put('kv', stamps, 'stamps')
        await db.put('kv', 2, 'schema')
      }
      for (const o of out) {
        outbox.set(o.id, o.seq)
        seq = Math.max(seq, o.seq)
      }
      cursor = cur ?? 0
      set({
        overrides: Object.fromEntries(overrideRows.map((r) => [r.key, r])),
        highlights: Object.fromEntries(highlightRows.map((r) => [r.id, r])),
        conflicts: Object.fromEntries(conf.map((c) => [c.id, c.remote])),
        progress: prog,
        ready: true,
      })
      navigator.storage?.persist?.().catch(() => {})
    } catch (e) {
      console.error('[store] IndexedDB unavailable; changes will not persist', e)
      set({ ready: true })
    }
  },

  saveOverride(key, patch, immediate) {
    const prev = get().overrides[key]
    const next: Override = { ...prev, ...patch, key, updatedAt: Date.now(), rev: newRev(), deviceId, deleted: undefined }
    set({ overrides: { ...get().overrides, [key]: next }, saveState: 'editing' })
    dirtyRows.add(key)
    markDirty(`edit~${key}`)
    clearTimeout(flushTimer)
    flushTimer = window.setTimeout(flushOverrides, immediate ? 0 : 700)
  },

  async resetOverrides(prefix) {
    const st = get()
    const inScope = (k: string) => k === prefix || k.startsWith(prefix + '/')
    const overrides = { ...st.overrides }
    const put: Override[] = []
    const del: string[] = []
    const affected = new Set<string>()
    for (const row of Object.values(st.overrides)) {
      if (!inScope(row.key) || row.deleted) continue
      affected.add(row.key)
      dirtyRows.delete(row.key)
      if (row.synced) {
        // other devices know this edit: leave a tombstone so the reset reaches them too
        const tomb: Override = { key: row.key, deleted: true, updatedAt: Date.now(), rev: newRev(), synced: row.synced, deviceId }
        overrides[row.key] = tomb
        put.push(tomb)
        markDirty(`edit~${row.key}`)
      } else {
        delete overrides[row.key]
        del.push(row.key)
        outbox.delete(`edit~${row.key}`)
        db.del('outbox', `edit~${row.key}`).catch(() => {})
      }
    }
    // Highlights stay. Re-anchor each one to the original text; those whose words existed only
    // in the edited text are kept, unplaced, and listed on the Highlights page.
    const highlights = { ...st.highlights }
    const changed: Highlight[] = []
    let kept = 0
    let unplaced = 0
    for (const h of Object.values(st.highlights)) {
      if (h.deleted || !affected.has(h.sectionKey)) continue
      const text = baseStream(h.sectionKey)
      const a = text === undefined ? null : anchor(text, h)
      if (!a) {
        unplaced++
        continue
      }
      kept++
      if (a.start !== h.start || a.end !== h.end) {
        const next = { ...h, start: a.start, end: a.end, updatedAt: Date.now(), deviceId }
        highlights[h.id] = next
        changed.push(next)
        markDirty(`hl~${h.id}`)
      }
    }
    set({ overrides, highlights })
    await Promise.all([db.putMany('overrides', put), db.delMany('overrides', del), putHighlights(changed) || undefined])
    return { kept, unplaced }
  },

  addHighlight(sectionKey, a, replace = []) {
    const now = Date.now()
    const id = newHid()
    const highlights = { ...get().highlights }
    const rows: Highlight[] = []
    for (const r of replace) {
      const old = highlights[r]
      if (!old || old.deleted) continue
      rows.push((highlights[r] = { ...old, deleted: true, updatedAt: now, deviceId }))
      markDirty(`hl~${r}`)
    }
    rows.push((highlights[id] = { id, sectionKey, ...a, createdAt: now, updatedAt: now, deviceId }))
    markDirty(`hl~${id}`)
    set({ highlights })
    putHighlights(rows)
    return id
  },

  recolorHighlights(ids, color) {
    const highlights = { ...get().highlights }
    const rows: Highlight[] = []
    for (const id of ids) {
      const h = highlights[id]
      if (!h || h.deleted || h.color === color) continue
      rows.push((highlights[id] = { ...h, color, updatedAt: Date.now(), deviceId }))
      markDirty(`hl~${id}`)
    }
    set({ highlights })
    putHighlights(rows)
  },

  removeHighlights(ids) {
    const highlights = { ...get().highlights }
    const rows: Highlight[] = []
    for (const id of ids) {
      const h = highlights[id]
      if (!h || h.deleted) continue
      rows.push((highlights[id] = { ...h, deleted: true, updatedAt: Date.now(), deviceId }))
      markDirty(`hl~${id}`)
    }
    set({ highlights })
    putHighlights(rows)
  },

  // Edit Mode shows highlights as <mark>s inside the editor; after every change the marks found
  // there are written back as highlight records (moved, recoloured, created or removed).
  reconcileMarks(sectionKey, marks, known) {
    const now = Date.now()
    const highlights = { ...get().highlights }
    const rows: Highlight[] = []
    const seen = new Set<string>()
    for (const m of marks) {
      seen.add(m.hid)
      const h = highlights[m.hid]
      if (!h || h.deleted) {
        rows.push((highlights[m.hid] = { id: m.hid, sectionKey, color: m.color, start: m.start, end: m.end, text: m.text, before: m.before, createdAt: h?.createdAt ?? now, updatedAt: now, deviceId }))
      } else if (h.start !== m.start || h.end !== m.end || h.text !== m.text || h.color !== m.color) {
        rows.push((highlights[m.hid] = { ...h, color: m.color, start: m.start, end: m.end, text: m.text, before: m.before, updatedAt: now, deviceId }))
      } else continue
      markDirty(`hl~${m.hid}`)
    }
    for (const id of known) {
      const h = highlights[id]
      if (seen.has(id) || !h || h.deleted) continue
      rows.push((highlights[id] = { ...h, deleted: true, updatedAt: now, deviceId }))
      markDirty(`hl~${id}`)
    }
    if (rows.length) {
      set({ highlights })
      putHighlights(rows)
    }
    return seen
  },

  setSection(key, patch) {
    const p = get().progress
    set({ progress: { ...p, sections: { ...p.sections, [key]: { ...p.sections[key], ...patch } } } })
    stamp(`sec~${key}`, Object.keys(patch))
    markDirty(`sec~${key}`)
    flushProgress() // a deliberate tick is written at once; only scrolling is debounced
  },

  setChapter(key, patch, touch) {
    const p = get().progress
    const prev = p.chapters[key] ?? {}
    const changed = (Object.keys(patch) as (keyof ChapterState)[]).filter((f) => prev[f] !== patch[f])
    if (!changed.length && !touch) return
    const next: Progress = { ...p, chapters: { ...p.chapters, [key]: { ...prev, ...patch } } }
    if (touch) next.last = { chapterKey: key, at: Date.now() }
    set({ progress: next })
    if (changed.length) {
      stamp(`chap~${key}`, changed)
      // reading position alone is not urgent: let it ride with the next sync
      markDirty(`chap~${key}`, changed.every((f) => f === 'scroll' || f === 'section' || f === 'at'))
    }
    if (changed.includes('status')) flushProgress()
    else queueProgress()
  },

  setPref(patch) {
    const prefs = { ...get().prefs, ...patch }
    set({ prefs })
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    const synced = Object.keys(patch).filter((k) => (SYNCED_PREFS as readonly string[]).includes(k))
    if (synced.length) {
      stamp('pref~main', synced)
      markDirty('pref~main', synced.every((k) => LAZY_PREFS.includes(k)))
      queueProgress()
    }
  },

  set: (patch) => set(patch),
}))

export async function flushOverrides() {
  clearTimeout(flushTimer)
  if (!dirtyRows.size) return
  const { overrides } = useStore.getState()
  const rows = [...dirtyRows].map((k) => overrides[k]).filter(Boolean)
  dirtyRows.clear()
  useStore.setState({ saveState: 'saving' })
  try {
    await db.putMany('overrides', rows)
    if (!dirtyRows.size) useStore.setState({ saveState: 'saved' })
  } catch (e) {
    console.error('[store] save failed', e)
    rows.forEach((r) => dirtyRows.add(r.key))
  }
}

function queueProgress() {
  clearTimeout(progressTimer)
  progressTimer = window.setTimeout(flushProgress, 400)
}
export function flushProgress() {
  clearTimeout(progressTimer)
  db.put('kv', useStore.getState().progress, 'progress').catch((e) => console.error('[store] progress save failed', e))
  db.put('kv', stamps, 'stamps').catch(() => {})
}

if (typeof window !== 'undefined') {
  const flushAll = () => {
    flushOverrides()
    flushProgress()
  }
  window.addEventListener('pagehide', flushAll)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushAll())
}

// ---- sync adapter: the store seen as a set of independent records -------------
/** Record kinds kept outside this store (study sessions and the timer: see study.ts). */
export interface KindAdapter {
  get(id: string): Rec | null
  apply(rec: Rec): void
  synced?(id: string): string | null | undefined
  markSynced?(id: string, rev: string | undefined): void
  /** The record reached the cloud. */
  sent?(id: string): void
  ids(): string[]
  /** A different account: forget what the previous cloud knew. */
  rebind?(): void
}
const adapters: Partial<Record<Kind, KindAdapter>> = {}
export const registerKind = (kind: Kind, adapter: KindAdapter) => {
  adapters[kind] = adapter
}
const FIELDS = { sec: ['done', 'difficult', 'revise'], chap: ['status', 'scroll', 'section', 'at'], pref: [...SYNCED_PREFS] } as const

function fieldRec(id: string, values: Record<string, unknown> | undefined): Rec | null {
  const st = stamps[id]
  if (!st) return null
  const f: Record<string, Field> = {}
  for (const [name, [t, d]] of Object.entries(st)) f[name] = { v: values?.[name] ?? null, t, d }
  return { id, kind: kindOf(id), t: Math.max(...Object.values(st).map((x) => x[0])), dev: deviceId, f }
}

export const syncLocal = {
  get(id: string): Rec | null {
    const s = useStore.getState()
    const key = keyOf(id)
    switch (kindOf(id)) {
      case 'ses':
      case 'run':
        return adapters[kindOf(id)]?.get(id) ?? null
      case 'edit': {
        const o = s.overrides[key]
        if (!o) return null
        return { id, kind: 'edit', t: o.updatedAt, dev: o.deviceId ?? deviceId, rev: o.rev, del: !!o.deleted, data: o.deleted ? undefined : { title: o.title ?? null, html: o.html ?? null } }
      }
      case 'hl': {
        const h = s.highlights[key]
        if (!h) return null
        const { id: _i, updatedAt, deviceId: dev, deleted, ...data } = h
        return { id, kind: 'hl', t: updatedAt, dev: dev ?? deviceId, del: !!deleted, data }
      }
      case 'sec':
        return fieldRec(id, s.progress.sections[key] as Record<string, unknown> | undefined)
      case 'chap':
        return fieldRec(id, s.progress.chapters[key] as Record<string, unknown> | undefined)
      case 'pref':
        return fieldRec(id, s.prefs as unknown as Record<string, unknown>)
    }
  },

  synced: (id: string) => (adapters[kindOf(id)] ? adapters[kindOf(id)]!.synced?.(id) : useStore.getState().overrides[keyOf(id)]?.synced),

  apply(rec: Rec) {
    const s = useStore.getState()
    const key = keyOf(rec.id)
    if (rec.kind === 'ses' || rec.kind === 'run') adapters[rec.kind]?.apply(rec)
    else if (rec.kind === 'edit') {
      const d = (rec.data ?? {}) as { title?: string | null; html?: string | null }
      const row: Override = rec.del
        ? { key, deleted: true, updatedAt: rec.t, rev: rec.rev, synced: rec.rev, deviceId: rec.dev }
        : { key, title: d.title ?? undefined, html: d.html ?? undefined, updatedAt: rec.t, rev: rec.rev, synced: rec.rev, deviceId: rec.dev }
      dirtyRows.delete(key)
      useStore.setState({ overrides: { ...s.overrides, [key]: row }, ext: { ...s.ext, [key]: (s.ext[key] ?? 0) + 1 } })
      db.put('overrides', row).catch(() => {})
    } else if (rec.kind === 'hl') {
      const h = { ...(rec.data as unknown as Highlight), id: key, updatedAt: rec.t, deviceId: rec.dev, deleted: rec.del || undefined }
      const sk = h.sectionKey
      useStore.setState({ highlights: { ...s.highlights, [key]: h }, ext: { ...s.ext, [sk]: (s.ext[sk] ?? 0) + 1 } })
      db.put('highlights', h).catch(() => {})
    } else {
      const values: Record<string, unknown> = {}
      const st: Record<string, [number, string]> = {}
      for (const [name, fld] of Object.entries(rec.f ?? {})) {
        if (!(FIELDS[rec.kind as keyof typeof FIELDS] as readonly string[]).includes(name)) continue
        values[name] = fld.v ?? undefined
        st[name] = [fld.t, fld.d]
      }
      stamps = { ...stamps, [rec.id]: { ...stamps[rec.id], ...st } }
      if (rec.kind === 'pref') {
        const prefs = { ...s.prefs, ...(values as Partial<Prefs>) }
        for (const k of ['collapsed', 'favourites', 'recents'] as const) if (!Array.isArray(prefs[k])) prefs[k] = []
        if (!prefs.timer || typeof prefs.timer !== 'object') prefs.timer = defaultTimer
        useStore.setState({ prefs })
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
      } else if (rec.kind === 'sec') {
        const p = s.progress
        useStore.setState({ progress: { ...p, sections: { ...p.sections, [key]: { ...p.sections[key], ...values } } } })
      } else {
        const p = s.progress
        const ch = { ...p.chapters[key], ...values } as ChapterState
        const last = ch.at && ch.at > (p.last?.at ?? 0) ? { chapterKey: key, at: ch.at } : p.last
        useStore.setState({ progress: { ...p, chapters: { ...p.chapters, [key]: ch }, last } })
      }
      queueProgress()
    }
  },

  markSynced(id: string, rev: string | undefined) {
    if (adapters[kindOf(id)]) return adapters[kindOf(id)]!.markSynced?.(id, rev)
    const s = useStore.getState()
    const key = keyOf(id)
    const o = s.overrides[key]
    if (!o || o.synced === rev) return
    const row = { ...o, synced: rev ?? null }
    useStore.setState({ overrides: { ...s.overrides, [key]: row } })
    db.put('overrides', row).catch(() => {})
  },

  dirty: () => new Map(outbox),
  clearDirty(id: string, at: number) {
    if (outbox.get(id) !== at) return
    outbox.delete(id)
    db.del('outbox', id).catch(() => {})
    adapters[kindOf(id)]?.sent?.(id)
  },
  markDirty: (id: string) => markDirty(id),
  env: (): Env => ({ now: Date.now(), dev: deviceId, tz: timeZone() }),
  cursor: () => cursor,
  setCursor(c: number) {
    if (c === cursor) return
    cursor = c
    db.put('kv', c, 'syncCursor').catch(() => {})
  },
  conflicts: () => new Map(Object.entries(useStore.getState().conflicts)),
  setConflict(id: string, remote: Rec | null) {
    const conflicts = { ...useStore.getState().conflicts }
    if (remote) {
      conflicts[id] = remote
      db.put('conflicts', { id, remote }).catch(() => {})
    } else {
      delete conflicts[id]
      db.del('conflicts', id).catch(() => {})
    }
    useStore.setState({ conflicts })
    syncHooks.onConflicts()
  },

  /** Signing in to a different account: forget what the previous cloud knew and queue everything. */
  async rebind(uid: string) {
    const prevUid = await db.get<string>('kv', 'syncUid')
    if (prevUid === uid) return false
    const s = useStore.getState()
    const overrides = Object.fromEntries(Object.entries(s.overrides).map(([k, o]) => [k, { ...o, synced: null }]))
    useStore.setState({ overrides, conflicts: {} })
    await db.putMany('overrides', Object.values(overrides))
    await db.delMany('conflicts', Object.keys(s.conflicts))
    for (const k of Object.keys(overrides)) markDirty(`edit~${k}`)
    for (const k of Object.keys(s.highlights)) markDirty(`hl~${k}`)
    for (const id of Object.keys(stamps)) markDirty(id)
    for (const a of Object.values(adapters)) {
      a.rebind?.()
      a.ids().forEach((id) => markDirty(id))
    }
    this.setCursor(0)
    await db.put('kv', uid, 'syncUid')
    return true
  },
  pending: () => outbox.size,
}

// ---- derived helpers -------------------------------------------------------
export const secTitle = (o: Record<string, Override>, s: Section) => o[s.key]?.title ?? s.title
/** Current section HTML. Cross-links inside a local edit are re-routed from their ids. */
export const secHtml = (o: Record<string, Override>, s: Section) => {
  const edited = o[s.key]?.html
  return edited === undefined ? s.html : relink(edited, s.key.split('/', 2).join('/'))
}
export const isEdited = (o: Record<string, Override>, s: Section) => !!o[s.key] && !o[s.key].deleted

/** Live highlights grouped by section. */
export function highlightsBySection(h: Record<string, Highlight>): Record<string, Highlight[]> {
  const out: Record<string, Highlight[]> = {}
  for (const x of Object.values(h)) if (!x.deleted) (out[x.sectionKey] ??= []).push(x)
  return out
}

export function chapterProgress(p: Progress, c: Chapter) {
  const done = c.sections.filter((s) => p.sections[s.key]?.done).length
  return { done, total: c.sections.length, status: (p.chapters[c.key]?.status ?? 'new') as Status }
}
export function subjectProgress(p: Progress, s: Subject) {
  let done = 0
  let total = 0
  for (const c of s.chapters) {
    const cp = chapterProgress(p, c)
    done += cp.done
    total += cp.total
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

export interface ProgressDetail extends ProgressSummary {
  sectionsDone: number
  sectionsTotal: number
  /** Sections flagged ★ Difficult / ↻ Revise. */
  difficult: number
  revise: number
}
/** ProgressSummary over any set of chapters: chapters by status, sections done, flags. */
export function progressSummary(p: Progress, chapters: Chapter[]): ProgressDetail {
  const out: ProgressDetail = { totalUnits: chapters.length, notStarted: 0, reading: 0, revised: 0, mastered: 0, completionPercent: 0, sectionsDone: 0, sectionsTotal: 0, difficult: 0, revise: 0 }
  const field = { new: 'notStarted', reading: 'reading', revised: 'revised', mastered: 'mastered' } as const
  for (const c of chapters) {
    out[field[(p.chapters[c.key]?.status ?? 'new') as Status] ?? 'notStarted']++
    for (const s of c.sections) {
      const st = p.sections[s.key]
      out.sectionsTotal++
      if (st?.done) out.sectionsDone++
      if (st?.difficult) out.difficult++
      if (st?.revise) out.revise++
    }
  }
  out.completionPercent = out.sectionsTotal ? Math.round((out.sectionsDone / out.sectionsTotal) * 100) : 0
  return out
}
