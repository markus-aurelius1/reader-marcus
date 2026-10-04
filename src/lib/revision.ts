// Adaptive revision state: revision units, completed revisions, recall answers, exam targets and
// revision preferences. Local-first like the rest of the reader — every action updates the
// screen, is written to IndexedDB and queued for sync; nothing here waits on the network.
// The rules are in scheduler.ts (pure); what is shown is built in revisionModel.ts (pure).
//
//   RevisionUnit    the current scheduling state of one section            ru~<sectionKey>   newest wins
//   RevisionEvent   one completed review — immutable                       rev~<eventId>     written once
//   RecallAttempt   one Knew / Missed / Skip — immutable                   ra~<attemptId>    written once
//   ExamTarget      an exam date                                           exam~<id>         field-merged
//   RevisionPreferences                                                    rpref~default     field-merged
//
// Nothing here is a total, a streak or a memory score: those are derived when shown.
import { create } from 'zustand'
import { db } from './db'
import { deviceId, markDirty, registerKind, storeHooks, useStore, type KindAdapter } from './store'
import { keyOf, type Field, type Rec } from '../sync/merge'
import type { ExamTarget, RecallAttempt, RecallIntensity, RecallOutcome, RevisionEvent, RevisionGrade, RevisionPreferences, RevisionUnit } from './contract'
import { DEFAULT_FINAL_WINDOW_DAYS, DEFAULT_RETENTION, SCHEDULER_VERSION, clampRetention, dateKey, dayOf, dayOfIso, examHorizon, parseDay, review } from './scheduler'
import { horizonOf, liveExams, primaryExam, type ExamRow, type Stamps } from './revisionModel'
import { sectionRef } from './recall'
import { timeZone } from './timer'

interface PrefRow extends RevisionPreferences {
  st: Stamps
}
const EXAM_FIELDS = ['name', 'shortName', 'stage', 'examDate', 'timeZone', 'primary', 'active', 'finalRevisionWindowDays', 'createdAt', 'removed'] as const
const PREF_FIELDS = ['enabled', 'desiredRetention', 'recallIntensity', 'guidedRevisionEnabled', 'examAwareScheduling', 'finalRevisionWindowDays', 'schedulerTimeZone'] as const
const PREF_ID = 'rpref~default'

interface RevisionState {
  ready: boolean
  units: Record<string, RevisionUnit>
  events: Record<string, RevisionEvent>
  attempts: Record<string, RecallAttempt>
  exams: Record<string, ExamRow>
  prefs: PrefRow | null
}
export const useRevision = create<RevisionState>(() => ({ ready: false, units: {}, events: {}, attempts: {}, exams: {}, prefs: null }))

/** Replaceable in tests. */
export const clock = { now: () => Date.now() }
let boot: Promise<void> | null = null
const iso = (ms: number) => new Date(ms).toISOString()
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) // stored and synced as plain data: no undefined fields
const newId = (prefix: string, now: number) => prefix + now.toString(36) + Math.random().toString(36).slice(2, 8)

// Other tabs of this browser share the database: tell them to re-read it.
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window && import.meta.env.MODE !== 'test' ? new BroadcastChannel('upsc-revision') : null
const saved = (p: Promise<unknown>) => p.then(() => channel?.postMessage(1)).catch((e) => console.error('[revision] save failed', e))

async function load() {
  const [units, events, attempts, exams, prefs] = await Promise.all([
    db.getAll<RevisionUnit>('revisionUnits'), db.getAll<RevisionEvent>('revisionEvents'), db.getAll<RecallAttempt>('recallAttempts'), db.getAll<ExamRow>('examTargets'), db.getAll<PrefRow>('revisionPreferences'),
  ])
  const index = <T extends { id: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.id, r]))
  useRevision.setState({ units: index(units), events: index(events.map((e) => Object.freeze(e))), attempts: index(attempts), exams: index(exams), prefs: prefs.find((p) => p.id === 'default') ?? null, ready: true })
}
channel?.addEventListener('message', () => void load().catch(() => {}))

export function initRevision(): Promise<void> {
  return (boot ??= load().catch((e) => {
    console.error('[revision] IndexedDB unavailable; revision will not persist', e)
    useRevision.setState({ ready: true })
  }))
}

// ---- preferences ----------------------------------------------------------------------------
/** The preferences in force: what was chosen, over the defaults. */
export function prefsOf(row: PrefRow | null): RevisionPreferences {
  return {
    id: 'default',
    enabled: row?.enabled ?? true,
    desiredRetention: clampRetention(row?.desiredRetention ?? DEFAULT_RETENTION),
    recallIntensity: (row?.recallIntensity ?? 'standard') as RecallIntensity,
    guidedRevisionEnabled: row?.guidedRevisionEnabled ?? true,
    examAwareScheduling: row?.examAwareScheduling ?? true,
    finalRevisionWindowDays: row?.finalRevisionWindowDays ?? DEFAULT_FINAL_WINDOW_DAYS,
    // until one is chosen, the calendar of the device in hand
    schedulerTimeZone: row?.schedulerTimeZone || timeZone(),
    updatedAt: row?.updatedAt ?? iso(0),
  }
}
export const revisionPrefs = () => prefsOf(useRevision.getState().prefs)
/** Today's calendar day in the scheduler timezone. */
export const revisionToday = (now = clock.now()) => dayOf(now, revisionPrefs().schedulerTimeZone)

export function setRevisionPrefs(patch: Partial<Omit<RevisionPreferences, 'id' | 'updatedAt'>>) {
  const now = clock.now()
  const prev = useRevision.getState().prefs
  const clean = { ...patch }
  if (clean.desiredRetention !== undefined) clean.desiredRetention = clampRetention(clean.desiredRetention)
  if (clean.finalRevisionWindowDays !== undefined) clean.finalRevisionWindowDays = Math.min(120, Math.max(1, Math.round(clean.finalRevisionWindowDays) || DEFAULT_FINAL_WINDOW_DAYS))
  const row = { ...prev, ...clean, id: 'default', updatedAt: iso(now), st: { ...prev?.st, ...Object.fromEntries(Object.keys(clean).map((k) => [k, [now, deviceId]])) } } as PrefRow
  useRevision.setState({ prefs: row })
  saved(db.put('revisionPreferences', row))
  markDirty(PREF_ID)
  if ('examAwareScheduling' in clean) reconstrain()
}

// ---- units ------------------------------------------------------------------------------------
function putUnits(rows: RevisionUnit[], event?: RevisionEvent) {
  if (!rows.length && !event) return
  const s = useRevision.getState()
  const clean = rows.map(plain)
  useRevision.setState({ units: { ...s.units, ...Object.fromEntries(clean.map((u) => [u.id, u])) }, ...(event ? { events: { ...s.events, [event.id]: event } } : {}) })
  saved(db.putAll([...clean.map((u) => ({ store: 'revisionUnits', value: u })), ...(event ? [{ store: 'revisionEvents', value: event }] : [])]))
  clean.forEach((u) => markDirty(`ru~${u.id}`))
  if (event) markDirty(`rev~${event.id}`)
}

const horizon = (today: number) => {
  const s = useRevision.getState()
  return prefsOf(s.prefs).examAwareScheduling ? horizonOf(primaryExam(s.exams), today) : null
}

/**
 * A section was marked Done: enrol it, once. R1 falls on the next calendar day; from the first
 * real review onwards the adaptive scheduler takes over.
 * `dueDay` is given only when existing completed sections are scheduled in bulk.
 */
export function enrol(sectionKey: string, title: string, completedAt = clock.now(), dueDay?: number): RevisionUnit | null {
  const s = useRevision.getState()
  const p = prefsOf(s.prefs)
  if (!p.enabled) return null
  const now = clock.now()
  const tz = p.schedulerTimeZone
  const bootstrap = dateKey(dueDay ?? dayOf(now, tz) + 1)
  const prev = s.units[sectionKey]
  if (prev) {
    // never a second enrolment; a unit set aside before any review comes back as new
    if (prev.status !== 'suspended') return prev
    const back: RevisionUnit = prev.revisionCount ? { ...prev, status: 'active', updatedAt: iso(now) } : { ...prev, status: 'new', dueDate: bootstrap, initialStudyCompletedAt: iso(completedAt), deferredUntilDate: undefined, updatedAt: iso(now) }
    putUnits([back])
    return back
  }
  const unit: RevisionUnit = {
    id: sectionKey, target: sectionRef(sectionKey), title, status: 'new',
    enrolledAt: iso(now), initialStudyCompletedAt: iso(completedAt), dueDate: bootstrap,
    revisionCount: 0, lapseCount: 0, scheduler: { schedulerVersion: SCHEDULER_VERSION },
    desiredRetention: p.desiredRetention, schedulerTimeZone: tz, createdAt: iso(now), updatedAt: iso(now),
  }
  putUnits([unit])
  return unit
}

/**
 * Done was unticked. A unit with no review yet is set aside (it returns if the section is ticked
 * again); one that has been revised keeps its schedule — history is never undone by a tick.
 */
export function unenrol(sectionKey: string) {
  const u = useRevision.getState().units[sectionKey]
  if (!u || u.revisionCount > 0 || u.status === 'suspended') return
  putUnits([{ ...u, status: 'suspended', updatedAt: iso(clock.now()) }])
}

/** "Defer today": hidden from Today until tomorrow. The due date and its overdue count stay as they are. */
export function deferUnit(unitId: string, on = true) {
  const u = useRevision.getState().units[unitId]
  if (!u) return
  putUnits([{ ...u, deferredUntilDate: on ? dateKey(revisionToday() + 1) : undefined, updatedAt: iso(clock.now()) }])
}

export interface CompleteInput {
  unitId: string
  grade: RevisionGrade
  /** Chosen when the revision began, so its timer spans and recall answers already carry it. */
  eventId: string
  startedAt: string
  durationMs: number
  studySessionId?: string
}
export const newRevisionEventId = () => newId('e', clock.now())

/**
 * A scheduled revision is finished: the immutable event is written and the unit moves to its
 * next date. The next interval comes from the real day of this review and the grade — early,
 * on time or overdue alike; the date it was due on is kept on the event, never rewritten.
 */
export function completeRevision(i: CompleteInput): RevisionEvent | null {
  const s = useRevision.getState()
  const u = s.units[i.unitId]
  if (!u) return null
  if (s.events[i.eventId]) return s.events[i.eventId] // already recorded (a double click, a reload)
  const p = prefsOf(s.prefs)
  const now = clock.now()
  const tz = p.schedulerTimeZone
  const today = dayOf(now, tz)
  const r = review({ scheduler: u.scheduler, revisionCount: u.revisionCount, lapseCount: u.lapseCount, grade: i.grade, today, tz, retention: p.desiredRetention, nowIso: iso(now) })
  const h = examHorizon(today + r.intervalDays, today, horizon(today), u.id)
  const mine = Object.values(s.attempts).filter((a) => a.revisionEventId === i.eventId)
  const next: RevisionUnit = {
    ...u, status: h.cycleDone ? 'completed-exam-cycle' : 'active', dueDate: dateKey(h.due), deferredUntilDate: undefined,
    revisionCount: u.revisionCount + 1, lapseCount: u.lapseCount + (r.lapse ? 1 : 0), scheduler: r.after,
    desiredRetention: p.desiredRetention, schedulerTimeZone: tz, examTargetId: h.examTargetId, updatedAt: iso(now),
  }
  const event: RevisionEvent = Object.freeze(plain({
    id: i.eventId, revisionUnitId: u.id, target: u.target, ordinal: u.revisionCount + 1,
    scheduledDueDate: u.dueDate, startedAt: i.startedAt, completedAt: iso(now),
    overdueDays: Math.max(0, today - parseDay(u.dueDate)), grade: i.grade,
    schedulerBefore: u.scheduler, schedulerAfter: r.after, nextDueDate: next.dueDate,
    studySessionId: i.studySessionId, durationMs: Math.max(0, Math.round(i.durationMs)),
    recallAttemptCount: mine.length || undefined, recallMissCount: mine.length ? mine.filter((a) => a.outcome === 'missed').length : undefined,
    examTargetId: h.examTargetId, deviceId, createdAt: iso(now),
  }))
  putUnits([next], event)
  return event
}

/**
 * Exam targets or exam-aware scheduling changed: units whose next review is still ahead are
 * checked against the new horizon. A review already missed is never moved.
 */
export function reconstrain() {
  const s = useRevision.getState()
  const p = prefsOf(s.prefs)
  const today = dayOf(clock.now(), p.schedulerTimeZone)
  const exam = horizon(today)
  const changed: RevisionUnit[] = []
  for (const u of Object.values(s.units)) {
    if (u.status === 'suspended' || !u.revisionCount || !u.scheduler.lastReviewAt || parseDay(u.dueDate) <= today) continue
    const last = dayOfIso(u.scheduler.lastReviewAt, p.schedulerTimeZone)
    const natural = last + (u.scheduler.scheduledDays ?? 1)
    // judged from the day of its last review, as it was when that review was scheduled
    const h = examHorizon(natural, last, exam, u.id)
    const due = Math.max(today + 1, h.due)
    const status = h.cycleDone ? 'completed-exam-cycle' : 'active'
    if (dateKey(due) === u.dueDate && (h.examTargetId ?? null) === (u.examTargetId ?? null) && status === u.status) continue
    changed.push({ ...u, dueDate: dateKey(due), examTargetId: h.examTargetId, status, updatedAt: iso(clock.now()) })
  }
  putUnits(changed)
}

/** Sections spread per day when existing completed sections are scheduled in one go. */
export const MIGRATION_PER_DAY = 10
/**
 * "Schedule existing completed topics": never run automatically. Sections already marked Done
 * that have no unit are enrolled, their first review spread over the coming days.
 */
export function scheduleExisting(sections: { key: string; title: string; doneAt?: number }[]): number {
  const s = useRevision.getState()
  const todo = sections.filter((x) => !s.units[x.key])
  const first = revisionToday() + 1
  todo.forEach((x, i) => enrol(x.key, x.title, x.doneAt ?? clock.now(), first + Math.floor(i / MIGRATION_PER_DAY)))
  return todo.length
}

// ---- recall attempts ------------------------------------------------------------------------------
export function recordAttempt(a: { recallUnitId: string; contentHash: string; unitId: string; eventId: string; outcome: RecallOutcome }): RecallAttempt {
  const s = useRevision.getState()
  const now = clock.now()
  const row: RecallAttempt = { id: newId('a', now), recallUnitId: a.recallUnitId, contentHash: a.contentHash, target: sectionRef(a.unitId), revisionUnitId: a.unitId, revisionEventId: a.eventId, outcome: a.outcome, attemptedAt: iso(now), deviceId }
  useRevision.setState({ attempts: { ...s.attempts, [row.id]: row } })
  saved(db.put('recallAttempts', row))
  markDirty(`ra~${row.id}`)
  return row
}

// ---- exam targets -----------------------------------------------------------------------------------
function writeExam(id: string, patch: Partial<ExamRow>, now = clock.now()) {
  const s = useRevision.getState()
  const prev = s.exams[id]
  const row = { ...prev, ...patch, id, updatedAt: iso(now), st: { ...prev?.st, ...Object.fromEntries(Object.keys(patch).map((k) => [k, [now, deviceId]])) } } as ExamRow
  useRevision.setState({ exams: { ...s.exams, [id]: row } })
  saved(db.put('examTargets', row))
  markDirty(`exam~${id}`)
}

/** Exactly one active target is primary: if none is, the nearest active one becomes it. */
function ensurePrimary() {
  const s = useRevision.getState()
  if (primaryExam(s.exams)) return
  const first = liveExams(s.exams).find((e) => e.active)
  if (first) writeExam(first.id, { primary: true })
}

export type ExamInput = Pick<ExamTarget, 'name' | 'examDate'> & Partial<Pick<ExamTarget, 'shortName' | 'stage' | 'timeZone' | 'active' | 'finalRevisionWindowDays'>>

export function addExam(e: ExamInput): string {
  const now = clock.now()
  const id = newId('x', now)
  writeExam(id, plain({ name: e.name.trim(), shortName: e.shortName?.trim() || undefined, stage: e.stage, examDate: e.examDate, timeZone: e.timeZone || revisionPrefs().schedulerTimeZone, primary: false, active: e.active ?? true, finalRevisionWindowDays: e.finalRevisionWindowDays ?? revisionPrefs().finalRevisionWindowDays, createdAt: iso(now) }), now)
  ensurePrimary()
  reconstrain()
  return id
}

export function updateExam(id: string, patch: Partial<ExamInput>) {
  const prev = useRevision.getState().exams[id]
  if (!prev || prev.removed) return
  const changed = Object.fromEntries(Object.entries(patch).filter(([k, v]) => v !== undefined && (prev as unknown as Record<string, unknown>)[k] !== v)) as Partial<ExamRow>
  if (!Object.keys(changed).length) return
  // a target that is switched off cannot stay primary
  if (changed.active === false && prev.primary) changed.primary = false
  writeExam(id, changed)
  ensurePrimary()
  reconstrain()
}

export function setPrimaryExam(id: string) {
  const s = useRevision.getState()
  const target = s.exams[id]
  if (!target || target.removed || !target.active) return
  const now = clock.now()
  for (const e of liveExams(s.exams)) if (e.primary && e.id !== id) writeExam(e.id, { primary: false }, now)
  writeExam(id, { primary: true }, now)
  reconstrain()
}

export function removeExam(id: string) {
  if (!useRevision.getState().exams[id]) return
  writeExam(id, { removed: true, primary: false, active: false })
  ensurePrimary()
  reconstrain()
}

// ---- Done → enrolment ---------------------------------------------------------------------------
/** The title a new unit is given: the section's current heading. Set by the app (needs the content). */
export const titles = { of: (sectionKey: string) => sectionKey.split('/').pop() ?? sectionKey }
storeHooks.onSectionDone = (key, done) => {
  if (!useRevision.getState().ready) return
  if (done) enrol(key, titles.of(key))
  else unenrol(key)
}

// ---- sync adapters ---------------------------------------------------------------------------------
function fieldRec(id: string, kind: Rec['kind'], row: { st: Stamps } | null | undefined, fields: readonly string[]): Rec | null {
  if (!row?.st) return null
  const f: Record<string, Field> = {}
  for (const name of fields) {
    const st = row.st[name]
    if (st) f[name] = { v: (row as unknown as Record<string, unknown>)[name] ?? null, t: st[0], d: st[1] }
  }
  const times = Object.values(f).map((x) => x.t)
  return times.length ? { id, kind, t: Math.max(...times), dev: deviceId, f } : null
}
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
const wipe = (store: string, patch: Partial<RevisionState>) => async () => {
  useRevision.setState(patch)
  await db.clear([store])
  channel?.postMessage(1)
}

const unitAdapter: KindAdapter = {
  get(id) {
    const u = useRevision.getState().units[keyOf(id)]
    return u ? { id, kind: 'ru', t: Date.parse(u.updatedAt), dev: deviceId, data: u as unknown as Record<string, unknown> } : null
  },
  apply(rec) {
    const u = rec.data as unknown as RevisionUnit
    const s = useRevision.getState()
    useRevision.setState({ units: { ...s.units, [u.id]: u } })
    saved(db.put('revisionUnits', u))
  },
  ids: () => Object.keys(useRevision.getState().units).map((k) => `ru~${k}`),
  wipe: wipe('revisionUnits', { units: {} }),
}
// Completed revisions and recall answers are history: a row already here is never replaced.
const historyAdapter = (kind: 'rev' | 'ra', store: string, field: 'events' | 'attempts'): KindAdapter => ({
  get(id) {
    const x = useRevision.getState()[field][keyOf(id)]
    return x ? { id, kind, t: Date.parse('createdAt' in x ? x.createdAt : x.attemptedAt), dev: x.deviceId, data: x as unknown as Record<string, unknown> } : null
  },
  apply(rec) {
    const s = useRevision.getState()
    const row = rec.data as unknown as { id: string }
    if (s[field][row.id]) return
    useRevision.setState({ [field]: { ...s[field], [row.id]: Object.freeze(row) } } as Partial<RevisionState>)
    saved(db.put(store, row))
  },
  ids: () => Object.keys(useRevision.getState()[field]).map((k) => `${kind}~${k}`),
  wipe: wipe(store, { [field]: {} } as Partial<RevisionState>),
})
const examAdapter: KindAdapter = {
  get: (id) => fieldRec(id, 'exam', useRevision.getState().exams[keyOf(id)], EXAM_FIELDS),
  apply(rec) {
    const s = useRevision.getState()
    const id = keyOf(rec.id)
    const { values, st } = fromRec(rec, EXAM_FIELDS)
    const row = { ...s.exams[id], ...values, id, updatedAt: iso(rec.t), st: { ...s.exams[id]?.st, ...st } } as ExamRow
    useRevision.setState({ exams: { ...s.exams, [id]: row } })
    saved(db.put('examTargets', row))
  },
  ids: () => Object.keys(useRevision.getState().exams).map((k) => `exam~${k}`),
  wipe: wipe('examTargets', { exams: {} }),
}
const prefAdapter: KindAdapter = {
  get: (id) => fieldRec(id, 'rpref', useRevision.getState().prefs, PREF_FIELDS),
  apply(rec) {
    const s = useRevision.getState()
    const { values, st } = fromRec(rec, PREF_FIELDS)
    const row = { ...s.prefs, ...values, id: 'default', updatedAt: iso(rec.t), st: { ...s.prefs?.st, ...st } } as PrefRow
    useRevision.setState({ prefs: row })
    saved(db.put('revisionPreferences', row))
  },
  ids: () => (useRevision.getState().prefs ? [PREF_ID] : []),
  wipe: wipe('revisionPreferences', { prefs: null }),
}
registerKind('ru', unitAdapter)
registerKind('rev', historyAdapter('rev', 'revisionEvents', 'events'))
registerKind('ra', historyAdapter('ra', 'recallAttempts', 'attempts'))
registerKind('exam', examAdapter)
registerKind('rpref', prefAdapter)

/** Sections marked Done that have no revision unit — what "Schedule existing completed topics" would enrol. */
export const unscheduledDone = () => {
  const { progress } = useStore.getState()
  const units = useRevision.getState().units
  return Object.keys(progress.sections).filter((k) => progress.sections[k]?.done && !units[k])
}
