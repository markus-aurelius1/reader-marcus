// Study goals and the personal study queue.
// Local-first like the rest of the reader: every action updates the screen, is written to
// IndexedDB and queued for sync. Both are merged field by field across devices (sync/merge.ts),
// so reordering an item on one device and completing it on another both survive.
//
// Nothing here is a total or a counter: goal progress and streaks are derived from the study
// sessions each time they are shown (lib/analytics.ts, lib/dashboard.ts).
import { create } from 'zustand'
import { db } from './db'
import { deviceId, markDirty, registerKind, type KindAdapter } from './store'
import { keyOf, kindOf, type Field, type Rec } from '../sync/merge'
import type { ContentRef, StudyGoal, StudyQueueItem } from './contract'

/** field → [time, device] of its last change. */
type Stamps = Record<string, [number, string]>
/** A queue item as stored: the contract's item, a removal marker and the field timestamps. */
export interface QueueRow extends StudyQueueItem {
  removed?: boolean
  st: Stamps
}
interface GoalRow extends StudyGoal {
  st: Stamps
}
const QUEUE_FIELDS = ['target', 'title', 'reason', 'order', 'createdAt', 'completedAt', 'removed'] as const
const GOAL_FIELDS = ['enabled', 'dailyTargetMs', 'weeklyTargetMs'] as const
const GOAL_ID = 'goal~default'

interface PlanState {
  ready: boolean
  goal: GoalRow | null
  queue: Record<string, QueueRow>
}
export const usePlan = create<PlanState>(() => ({ ready: false, goal: null, queue: {} }))

/** Replaceable in tests. */
export const clock = { now: () => Date.now() }
let boot: Promise<void> | null = null

// Other tabs of this browser share the database: tell them to re-read it.
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window && import.meta.env.MODE !== 'test' ? new BroadcastChannel('upsc-plan') : null
const saved = (p: Promise<unknown>) => p.then(() => channel?.postMessage(1)).catch((e) => console.error('[plan] save failed', e))

async function load() {
  const [rows, goals] = await Promise.all([db.getAll<QueueRow>('studyQueue'), db.getAll<GoalRow>('studyGoals')])
  usePlan.setState({ queue: Object.fromEntries(rows.map((r) => [r.id, r])), goal: goals.find((g) => g.id === 'default') ?? null, ready: true })
}
channel?.addEventListener('message', () => void load().catch(() => {}))

export function initPlan(): Promise<void> {
  return (boot ??= load().catch((e) => {
    console.error('[plan] IndexedDB unavailable; goals and the queue will not persist', e)
    usePlan.setState({ ready: true })
  }))
}

// ---- queue --------------------------------------------------------------------
/** Same identity as nav.refKey for the kinds a queue item can point at. */
export const targetKey = (r: ContentRef) => [r.stage, r.subjectId, r.chapterId, r.sectionId].filter(Boolean).join('/')
const byOrder = (a: StudyQueueItem, b: StudyQueueItem) => a.order - b.order || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1)

/** Items still in the queue (not removed), in queue order. */
export const queueItems = (rows: Record<string, QueueRow>): QueueRow[] => Object.values(rows).filter((r) => !r.removed && r.target && r.title).sort(byOrder)
export const openItems = (rows: Record<string, QueueRow>) => queueItems(rows).filter((r) => !r.completedAt)

function write(id: string, patch: Partial<QueueRow>) {
  const s = usePlan.getState()
  const prev = s.queue[id]
  const now = clock.now()
  const row = { ...prev, ...patch, id, st: { ...prev?.st, ...Object.fromEntries(Object.keys(patch).map((k) => [k, [now, deviceId]])) } } as QueueRow
  usePlan.setState({ queue: { ...s.queue, [id]: row } })
  saved(db.put('studyQueue', row))
  markDirty(`q~${id}`)
}

/** Add to the end of the queue. A target already waiting in the queue is not added twice. */
export function addToQueue(target: ContentRef, title: string, reason: StudyQueueItem['reason'] = 'manual'): string {
  const open = openItems(usePlan.getState().queue)
  const there = open.find((r) => targetKey(r.target) === targetKey(target))
  if (there) return there.id
  const now = clock.now()
  const id = 'q' + now.toString(36) + Math.random().toString(36).slice(2, 8)
  // no undefined fields: the reference is stored and synced as plain data
  write(id, { target: JSON.parse(JSON.stringify(target)), title, reason, order: (open[open.length - 1]?.order ?? 0) + 1, createdAt: new Date(now).toISOString() })
  return id
}

/** Mark complete (or back to waiting). */
export const completeQueueItem = (id: string, done = true) => usePlan.getState().queue[id] && write(id, { completedAt: done ? new Date(clock.now()).toISOString() : undefined })

export const removeQueueItem = (id: string) => usePlan.getState().queue[id] && write(id, { removed: true })

export function clearCompleted() {
  for (const r of queueItems(usePlan.getState().queue)) if (r.completedAt) write(r.id, { removed: true })
}

/**
 * Move a waiting item one place up (-1) or down (+1). Only the moved item is rewritten: it takes
 * an order between its new neighbours, so a reorder is one small record, not the whole list.
 */
export function moveQueueItem(id: string, dir: -1 | 1) {
  const open = openItems(usePlan.getState().queue)
  const i = open.findIndex((r) => r.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= open.length) return
  const rest = open.filter((r) => r.id !== id)
  const before = rest[j - 1]?.order
  const after = rest[j]?.order
  const order = before === undefined ? after! - 1 : after === undefined ? before + 1 : (before + after) / 2
  if (order === before || order === after) {
    // the gap is used up: number the whole list afresh
    rest.splice(j, 0, open[i])
    rest.forEach((r, k) => r.order !== k + 1 && write(r.id, { order: k + 1 }))
  } else write(id, { order })
}

// ---- goals --------------------------------------------------------------------
/** The goal, when one is set. */
export const activeGoal = (s: PlanState): StudyGoal | null => (s.goal?.enabled && (s.goal.dailyTargetMs || s.goal.weeklyTargetMs) ? s.goal : null)

/** Set, change or (with no targets) remove the goals. */
export function setGoal(targets: { dailyTargetMs?: number; weeklyTargetMs?: number }) {
  const now = clock.now()
  const clean = (v?: number) => (v && v > 0 ? Math.round(v) : undefined)
  const patch = { dailyTargetMs: clean(targets.dailyTargetMs), weeklyTargetMs: clean(targets.weeklyTargetMs) }
  const prev = usePlan.getState().goal
  const goal: GoalRow = { id: 'default', ...patch, enabled: !!(patch.dailyTargetMs || patch.weeklyTargetMs), updatedAt: new Date(now).toISOString(), st: { ...prev?.st, ...Object.fromEntries(GOAL_FIELDS.map((f) => [f, [now, deviceId]])) } }
  usePlan.setState({ goal })
  saved(db.put('studyGoals', goal))
  markDirty(GOAL_ID)
}

// ---- sync adapter -------------------------------------------------------------
function toRec(id: string, row: { st: Stamps } | null | undefined, fields: readonly string[]): Rec | null {
  if (!row?.st) return null
  const f: Record<string, Field> = {}
  for (const name of fields) {
    const st = row.st[name]
    if (st) f[name] = { v: (row as unknown as Record<string, unknown>)[name] ?? null, t: st[0], d: st[1] }
  }
  const times = Object.values(f).map((x) => x.t)
  return times.length ? { id, kind: kindOf(id), t: Math.max(...times), dev: deviceId, f } : null
}

/** A merged record → the values and timestamps of the fields it carries. */
function fromRec(rec: Rec, fields: readonly string[]) {
  const values: Record<string, unknown> = {}
  const st: Stamps = {}
  for (const [name, fld] of Object.entries(rec.f ?? {})) {
    if (!fields.includes(name)) continue
    values[name] = fld.v ?? undefined
    st[name] = [fld.t, fld.d]
  }
  return { values, st }
}

const adapter: KindAdapter = {
  get(id) {
    const s = usePlan.getState()
    return kindOf(id) === 'goal' ? toRec(id, s.goal, GOAL_FIELDS) : toRec(id, s.queue[keyOf(id)], QUEUE_FIELDS)
  },

  apply(rec) {
    const s = usePlan.getState()
    if (rec.kind === 'goal') {
      const { values, st } = fromRec(rec, GOAL_FIELDS)
      const goal = { ...s.goal, ...values, id: 'default', updatedAt: new Date(rec.t).toISOString(), st: { ...s.goal?.st, ...st } } as GoalRow
      usePlan.setState({ goal })
      saved(db.put('studyGoals', goal))
      return
    }
    const id = keyOf(rec.id)
    const { values, st } = fromRec(rec, QUEUE_FIELDS)
    const row = { ...s.queue[id], ...values, id, st: { ...s.queue[id]?.st, ...st } } as QueueRow
    usePlan.setState({ queue: { ...s.queue, [id]: row } })
    saved(db.put('studyQueue', row))
  },

  ids() {
    const s = usePlan.getState()
    return [...Object.keys(s.queue).map((k) => `q~${k}`), ...(s.goal ? [GOAL_ID] : [])]
  },
}
// a reset can take the queue and leave the goals, or take both
const wipeQueue = async () => {
  usePlan.setState({ queue: {} })
  await db.clear(['studyQueue'])
  channel?.postMessage(1)
}
const wipeGoal = async () => {
  usePlan.setState({ goal: null })
  await db.clear(['studyGoals'])
  channel?.postMessage(1)
}
registerKind('goal', { ...adapter, wipe: wipeGoal })
registerKind('q', { ...adapter, wipe: wipeQueue })
