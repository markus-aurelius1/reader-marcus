// Current Affairs state: one record per news day acted on, and the learner's notes.
// Local-first like the rest of the reader — every action updates the screen, is written to
// IndexedDB and queued for sync; nothing here waits on the network. The rules and everything
// shown are in currentAffairsModel.ts (pure).
//
//   CurrentAffairsDay     completion state of one news day        cad~<YYYY-MM-DD>   merged by rule
//   CurrentAffairsEntry   a note's title, source, tags, links     cae~<entryId>      field-merged
//   the note's body       a reader edit under "ca/<entryId>"      edit~ca/<entryId>  conflict-checked
//
// No reading time is kept here: it is derived from the study sessions, where reading the news is
// a span of the one timer (activity "current-affairs").
import { create } from 'zustand'
import { db } from './db'
import { deviceId, markDirty, registerKind, useStore, type KindAdapter } from './store'
import { keyOf, type Field, type Rec } from '../sync/merge'
import type { ContentRef, CurrentAffairsDay, CurrentAffairsEntry, SpanActivity } from './contract'
import { dayOf } from './analytics'
import { caActivity, caContext, cleanTags, cleanUrl, dayIdOf, isDayId, parseDayId, settled, statusOf, uniqueRefs } from './currentAffairsModel'
import { revisionPrefs, setAside } from './revision'
import { activeTimer, beginActivitySpan, continueHere, ownsTimer, useStudy } from './study'

/** field → [time, device] of its last change. */
type Stamps = Record<string, [number, string]>
/** A note as stored: the contract's entry, a removal marker and the field timestamps. */
export interface EntryRow extends CurrentAffairsEntry {
  removed?: boolean
  st: Stamps
}
const ENTRY_FIELDS = ['dayId', 'title', 'sourceName', 'sourceUrl', 'noteDocumentId', 'tags', 'linkedContentRefs', 'createdAt', 'removed'] as const

interface CaState {
  ready: boolean
  days: Record<string, CurrentAffairsDay>
  entries: Record<string, EntryRow>
}
export const useCA = create<CaState>(() => ({ ready: false, days: {}, entries: {} }))

/** Replaceable in tests. */
export const clock = { now: () => Date.now() }
let boot: Promise<void> | null = null
const iso = (ms: number) => new Date(ms).toISOString()
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) // stored and synced as plain data: no undefined fields

// Other tabs of this browser share the database: tell them to re-read it.
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window && import.meta.env.MODE !== 'test' ? new BroadcastChannel('upsc-current-affairs') : null
const saved = (p: Promise<unknown>) => p.then(() => channel?.postMessage(1)).catch((e) => console.error('[current-affairs] save failed', e))

async function load() {
  const [days, entries] = await Promise.all([db.getAll<CurrentAffairsDay>('currentAffairsDays'), db.getAll<EntryRow>('currentAffairsEntries')])
  useCA.setState({ days: Object.fromEntries(days.map((d) => [d.id, d])), entries: Object.fromEntries(entries.map((e) => [e.id, e])), ready: true })
}
channel?.addEventListener('message', () => void load().catch(() => {}))

export function initCurrentAffairs(): Promise<void> {
  return (boot ??= load()
    .then(() => void settleDays())
    .catch((e) => {
      console.error('[current-affairs] IndexedDB unavailable; Current Affairs will not persist', e)
      useCA.setState({ ready: true })
    }))
}

// ---- the study calendar ---------------------------------------------------------------------
/** One calendar for due dates and news days: the scheduler timezone of the revision preferences. */
export const studyTimeZone = () => revisionPrefs().schedulerTimeZone
/** Today's day number in the study timezone. */
export const caToday = (now = clock.now()) => dayOf(now, studyTimeZone())
export const todayId = (now = clock.now()) => dayIdOf(caToday(now))

// ---- days --------------------------------------------------------------------------------------
function writeDay(dayId: string, patch: Partial<CurrentAffairsDay>): CurrentAffairsDay {
  const s = useCA.getState()
  const now = clock.now()
  const prev = s.days[dayId]
  // made lazily, by the first deliberate act on the day; the id is the date, so there is only ever one
  const base: CurrentAffairsDay = prev ?? { id: dayId, date: dayId, timeZone: studyTimeZone(), status: 'pending', createdAt: iso(now), updatedAt: iso(now) }
  const row = plain(settled({ ...base, ...patch, updatedAt: iso(now) }, caToday(now)))
  useCA.setState({ days: { ...s.days, [dayId]: row } })
  saved(db.put('currentAffairsDays', row))
  markDirty(`cad~${dayId}`)
  return row
}

/** A real date, today or earlier: the only days that can be read, completed or excused. */
const actable = (dayId: string) => isDayId(dayId) && parseDayId(dayId) <= caToday()

/**
 * The first reliable evaluation after a day has passed: a record still pending for an earlier
 * day becomes missed. Its date is never changed; days with no record are not given one.
 */
export function settleDays(): number {
  const today = caToday()
  let n = 0
  for (const d of Object.values(useCA.getState().days)) {
    if (d.status === statusOf(d, today)) continue
    writeDay(d.id, {})
    n++
  }
  return n
}

/** The news of `dayId` was started (or continued): the first start is kept on the day. */
function markStarted(dayId: string) {
  if (!useCA.getState().days[dayId]?.firstStartedAt) writeDay(dayId, { firstStartedAt: iso(clock.now()) })
}

/**
 * Start Reading. The one global timer moves into a current-affairs span for this news day — it
 * is started if there is none, switched (and resumed) if it is running here, and left alone if
 * another device owns it. Starting the timer never completes the day.
 */
export function startReading(dayId = todayId(), entryId?: string, offlineProvisional = false): 'started' | 'switched' | 'remote' | 'invalid' {
  if (!actable(dayId)) return 'invalid'
  const r = beginActivitySpan(caContext(dayId), caActivity(dayId, entryId), offlineProvisional)
  if (r !== 'remote') markStarted(dayId)
  return r
}

/** "Continue here" on a timer another device is running: it carries on here, reading this day's news. */
export function continueReadingHere(dayId = todayId()) {
  const a = activeTimer(useStudy.getState())
  if (!a || ownsTimer(a) || !actable(dayId)) return
  continueHere(caContext(dayId), caActivity(dayId))
  markStarted(dayId)
}

/** What the timer is reading now, when its open span is a current-affairs span. */
export const readingNow = (a: ReturnType<typeof activeTimer>): SpanActivity | null => (a?.currentActivity?.activity === 'current-affairs' ? a.currentActivity : null)

/**
 * Mark a day's Current Affairs complete. Explicit, and needs neither a note nor any reading time.
 * A day completed after its own date is caught up: the date stays, the real moment is recorded.
 */
export function completeDay(dayId = todayId()): CurrentAffairsDay | null {
  if (!actable(dayId)) return null
  const prev = useCA.getState().days[dayId]
  if (prev && (prev.status === 'completed' || prev.status === 'caught-up')) return prev // already done: the first completion stands
  return writeDay(dayId, { completedAt: iso(clock.now()) })
}

/** A day intentionally left out. Kept apart from completed days in every figure. */
export function excuseDay(dayId: string): CurrentAffairsDay | null {
  if (!actable(dayId)) return null
  return writeDay(dayId, { excusedAt: iso(clock.now()) })
}

/** Undo a completion or an excuse: the day is open again (pending today, missed if it has passed). */
export function reopenDay(dayId: string): CurrentAffairsDay | null {
  const prev = useCA.getState().days[dayId]
  if (!prev || (prev.status !== 'completed' && prev.status !== 'caught-up' && prev.status !== 'excused')) return prev ?? null
  return writeDay(dayId, { reopenedAt: iso(clock.now()), completedAt: undefined, caughtUpAt: undefined, excusedAt: undefined })
}

// ---- notes -------------------------------------------------------------------------------------
export const noteKey = (entryId: string) => `ca/${entryId}`

function writeEntry(id: string, patch: Partial<EntryRow>): EntryRow {
  const s = useCA.getState()
  const now = clock.now()
  const prev = s.entries[id]
  const row = plain({ ...prev, ...patch, id, updatedAt: iso(now), st: { ...prev?.st, ...Object.fromEntries(Object.keys(patch).map((k) => [k, [now, deviceId]])) } }) as EntryRow
  useCA.setState({ entries: { ...s.entries, [id]: row } })
  saved(db.put('currentAffairsEntries', row))
  markDirty(`cae~${id}`)
  return row
}

export interface EntryInput {
  title: string
  sourceName?: string
  sourceUrl?: string
  tags?: string[] | string
  linkedContentRefs?: ContentRef[]
}
const cleanInput = (i: Partial<EntryInput>): Partial<EntryRow> => ({
  ...(i.title !== undefined ? { title: i.title.replace(/\s+/g, ' ').trim().slice(0, 200) } : {}),
  ...(i.sourceName !== undefined ? { sourceName: i.sourceName.replace(/\s+/g, ' ').trim().slice(0, 80) || undefined } : {}),
  // a source link is optional; anything that is not a web address is not kept
  ...(i.sourceUrl !== undefined ? { sourceUrl: cleanUrl(i.sourceUrl) } : {}),
  ...(i.tags !== undefined ? { tags: cleanTags(i.tags) } : {}),
  ...(i.linkedContentRefs !== undefined ? { linkedContentRefs: uniqueRefs(i.linkedContentRefs) } : {}),
})

/** A note for a news day. The day itself is not completed, and no day record is made for it. */
export function addEntry(dayId: string, input: EntryInput): string | null {
  if (!actable(dayId)) return null
  const now = clock.now()
  const id = 'n' + now.toString(36) + Math.random().toString(36).slice(2, 8)
  writeEntry(id, { dayId, noteDocumentId: noteKey(id), linkedContentRefs: [], tags: [], createdAt: iso(now), ...cleanInput(input) })
  return id
}

export function updateEntry(id: string, patch: Partial<EntryInput>) {
  const prev = useCA.getState().entries[id]
  if (!prev || prev.removed) return
  const next = cleanInput(patch)
  const changed = Object.fromEntries(Object.entries(next).filter(([k, v]) => JSON.stringify(v ?? null) !== JSON.stringify((prev as unknown as Record<string, unknown>)[k] ?? null)))
  if (Object.keys(changed).length) writeEntry(id, changed)
}

/** The note's text: saved through the reader's own edit pipeline (debounced, queued, conflict-checked). */
export const saveNoteBody = (id: string, html: string, immediate = false) => useStore.getState().saveOverride(noteKey(id), { html }, immediate)
export const noteBody = (overrides: ReturnType<typeof useStore.getState>['overrides'], id: string) => {
  const o = overrides[noteKey(id)]
  return o && !o.deleted ? (o.html ?? '') : ''
}

/**
 * Delete a note: a tombstone, so the removal reaches other devices; its text goes with it, and a
 * revision unit made for it is set aside.
 */
export async function removeEntry(id: string) {
  const prev = useCA.getState().entries[id]
  if (!prev || prev.removed) return
  writeEntry(id, { removed: true })
  setAside(noteKey(id))
  await useStore.getState().resetOverrides(noteKey(id))
}

// ---- sync adapters -----------------------------------------------------------------------------
const dayAdapter: KindAdapter = {
  get(id) {
    const d = useCA.getState().days[keyOf(id)]
    return d ? { id, kind: 'cad', t: Date.parse(d.updatedAt), dev: deviceId, data: d as unknown as Record<string, unknown> } : null
  },
  apply(rec) {
    const d = rec.data as unknown as CurrentAffairsDay
    const s = useCA.getState()
    useCA.setState({ days: { ...s.days, [d.id]: d } })
    saved(db.put('currentAffairsDays', d))
  },
  ids: () => Object.keys(useCA.getState().days).map((k) => `cad~${k}`),
  async wipe() {
    useCA.setState({ days: {} })
    await db.clear(['currentAffairsDays'])
    channel?.postMessage(1)
  },
}

const entryAdapter: KindAdapter = {
  get(id) {
    const row = useCA.getState().entries[keyOf(id)]
    if (!row?.st) return null
    const f: Record<string, Field> = {}
    for (const name of ENTRY_FIELDS) {
      const st = row.st[name]
      if (st) f[name] = { v: (row as unknown as Record<string, unknown>)[name] ?? null, t: st[0], d: st[1] }
    }
    const times = Object.values(f).map((x) => x.t)
    return times.length ? { id, kind: 'cae', t: Math.max(...times), dev: deviceId, f } : null
  },
  apply(rec: Rec) {
    const s = useCA.getState()
    const id = keyOf(rec.id)
    const values: Record<string, unknown> = {}
    const st: Stamps = {}
    for (const [name, fld] of Object.entries(rec.f ?? {})) {
      if (!(ENTRY_FIELDS as readonly string[]).includes(name)) continue
      values[name] = fld.v ?? undefined
      st[name] = [fld.t, fld.d]
    }
    const row = { ...s.entries[id], ...values, id, updatedAt: iso(rec.t), st: { ...s.entries[id]?.st, ...st } } as EntryRow
    if (!Array.isArray(row.linkedContentRefs)) row.linkedContentRefs = []
    useCA.setState({ entries: { ...s.entries, [id]: row } })
    saved(db.put('currentAffairsEntries', row))
  },
  ids: () => Object.keys(useCA.getState().entries).map((k) => `cae~${k}`),
  async wipe() {
    useCA.setState({ entries: {} })
    await db.clear(['currentAffairsEntries'])
    channel?.postMessage(1)
  },
}
registerKind('cad', dayAdapter)
registerKind('cae', entryAdapter)
