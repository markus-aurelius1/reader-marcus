// The scheduled revision in progress on this device, and the run of units still to come
// ("Start Revision"). One revision has two views — Recall (the guided prompts) and Notes (the
// unit's own notes, in the reader) — and it is the same revision in both: the same event id, the
// same round, the same timer span. Switching between them, Back and a reload change none of it.
//
// A convenience of this browser only (localStorage "upsc-revision-run"); nothing here is study
// data. What is recorded is still written by lib/revision.ts (the event) and lib/study.ts (the time).
import { create } from 'zustand'
import type { RevisionEvent, RevisionGrade, SpanActivity, StudyContext, StudySession } from './contract'
import { clock, completeRevision, newRevisionEventId, useRevision } from './revision'
import { activeTimer, beginRevisionSpan, followContext, keepActivity, ownsTimer, pauseTimer, revisionSpanMs, stopTimer, useStudy } from './study'

const RUN = 'upsc-revision-run'

export interface RunCurrent {
  unitId: string
  eventId: string
  startedAt: string
  /** R1 / R2 / R3 …, as it stood when the revision began. */
  ordinal?: number
  /** What the timer tracks for it — kept so that the span can be held from the Notes view. */
  context?: StudyContext
}
export interface Run {
  queue: string[]
  /** The timer was started by this run, so the run stops it when it ends. */
  ownTimer?: boolean
  current?: RunCurrent
}
interface RunState {
  run: Run
  /** The event id of the revision whose grade is being asked for ("Finish Revision"). */
  finishing: string | null
}

const load = (): Run => {
  try {
    return { queue: [], ...JSON.parse(localStorage.getItem(RUN) || '{}') }
  } catch {
    return { queue: [] }
  }
}
export const useRun = create<RunState>(() => ({ run: load(), finishing: null }))
export const readRun = () => useRun.getState().run
export function writeRun(r: Run | null) {
  const s = useRun.getState()
  useRun.setState({ run: r ?? { queue: [] }, finishing: r?.current?.eventId === s.finishing ? s.finishing : null })
  try {
    if (r) localStorage.setItem(RUN, JSON.stringify(r))
    else localStorage.removeItem(RUN)
  } catch {
    /* storage unavailable: no resume after a reload */
  }
}
// another tab of this browser began, finished or left a revision
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => e.key === RUN && useRun.setState({ run: load() }))

type RevisionRows = Pick<ReturnType<typeof useRevision.getState>, 'units' | 'events'>
/** The revision in progress: begun, not yet graded, its unit still there. */
export const revisionOf = (run: Run, s: RevisionRows = useRevision.getState()): RunCurrent | null => {
  const c = run.current
  return c && !s.events[c.eventId] && s.units[c.unitId] ? c : null
}
export function useRevising(): RunCurrent | null {
  const run = useRun((s) => s.run)
  return useRevision((s) => revisionOf(run, s))
}
export const ordinalOf = (c: RunCurrent) => c.ordinal ?? (useRevision.getState().units[c.unitId]?.revisionCount ?? 0) + 1
export const activityOf = (c: RunCurrent): SpanActivity => ({ activity: 'revision', revisionUnitId: c.unitId, revisionEventId: c.eventId, revisionOrdinal: ordinalOf(c) })
export const setFinishing = (eventId: string | null) => useRun.setState({ finishing: eventId })

/**
 * The revision of `unitId` opens: the one already in progress for it is carried on — after a
 * reload, and when coming back from its notes — otherwise a new one begins, with a new event id.
 */
export function openRevision(unitId: string, context: StudyContext): RunCurrent | null {
  const unit = useRevision.getState().units[unitId]
  if (!unit) return null
  const run = readRun()
  const prev = run.current?.unitId === unitId ? run.current : null
  if (prev?.ordinal && JSON.stringify(prev.context) === JSON.stringify(context)) return prev
  const current: RunCurrent = prev
    ? { ...prev, ordinal: prev.ordinal ?? unit.revisionCount + 1, context }
    : { unitId, eventId: newRevisionEventId(), startedAt: new Date(clock.now()).toISOString(), ordinal: unit.revisionCount + 1, context }
  const queued = run.queue.includes(unitId)
  writeRun({ queue: queued ? run.queue : [unitId], ownTimer: queued ? run.ownTimer : undefined, current })
  return current
}

// Revisions whose span was begun while their views stayed on screen: going from the notes back to
// Recall must not start or resume a timer the learner stopped or paused in between.
const begun = new Set<string>()
export const forgetBegun = () => begun.clear()

/**
 * The Recall view opened. The first time, the one timer moves into the revision's span (started
 * if there is none, resumed if paused; another device's timer is left alone). Coming back to it
 * from the notes only keeps a timer of this device in that span.
 */
export function trackRevision(c: RunCurrent, offlineProvisional = false) {
  if (!c.context) return
  if (begun.has(c.eventId)) return keepActivity(c.context, activityOf(c))
  begun.add(c.eventId)
  if (beginRevisionSpan(c.context, activityOf(c), offlineProvisional) === 'started') writeRun({ ...readRun(), ownTimer: true })
}

/**
 * The reader moved to another tracked unit. While a revision is in progress that is reading its
 * notes — and whatever they link to — so this device's timer stays in the revision's span: the
 * same unit, event and round. Otherwise the timer follows the reader, as initial study.
 */
export function followReading(context: StudyContext) {
  const c = readRun().current
  if (!c) return followContext(context)
  const s = useRevision.getState()
  if (!s.ready) return // not known yet whether that revision is still open
  if (!revisionOf(readRun(), s)) return followContext(context)
  if (c.context) keepActivity(c.context, activityOf(c))
}

// Time a view of the revision was on screen: what it took when no timer of this device recorded it.
const seen = { id: '', ms: 0, since: null as number | null }
export function watchRevision(eventId: string, on: boolean) {
  if (seen.id !== eventId) Object.assign(seen, { id: eventId, ms: 0, since: null })
  if (on && seen.since === null) seen.since = performance.now()
  else if (!on && seen.since !== null) {
    seen.ms += performance.now() - seen.since
    seen.since = null
  }
}
const seenMs = (eventId: string) => (seen.id === eventId ? seen.ms + (seen.since === null ? 0 : performance.now() - seen.since) : 0)

/** What became of the timer when a revision ended. */
export interface TimerEnd {
  /** next: the run goes on · stopped: the run's own timer was saved · paused: a study timer that was already running. */
  timer: 'next' | 'stopped' | 'paused' | 'none'
  session?: StudySession | null
}
// the revision's time ends here: a timer this run started is stopped and saved; one that was
// already running for study is paused rather than left counting as revision
function endTimer(run: Run, eventId: string): TimerEnd {
  const a = activeTimer(useStudy.getState())
  if (!ownsTimer(a) || a?.currentActivity?.revisionEventId !== eventId) return { timer: 'none' }
  if (run.ownTimer) return { timer: 'stopped', session: stopTimer() }
  pauseTimer()
  return { timer: 'paused' }
}

export interface Finished extends TimerEnd {
  event: RevisionEvent
  /** The next unit of the run, whose own revision span begins when it opens. */
  next?: string
}
/** The grade was given, from either view: the one event is written and the run moves on or ends. */
export function finishRevision(grade: RevisionGrade, c: RunCurrent | undefined = readRun().current): Finished | null {
  if (!c) return null
  const a = activeTimer(useStudy.getState())
  const mine = ownsTimer(a) && a?.currentActivity?.revisionEventId === c.eventId
  const event = completeRevision({ unitId: c.unitId, grade, eventId: c.eventId, startedAt: c.startedAt, durationMs: (mine ? revisionSpanMs(c.eventId) : 0) || seenMs(c.eventId), studySessionId: mine ? a!.sessionId : undefined })
  if (!event) return null
  const run = readRun()
  const rest = run.queue.filter((id) => id !== c.unitId && !!useRevision.getState().units[id])
  if (rest.length) {
    writeRun({ queue: rest, ownTimer: run.ownTimer })
    return { event, next: rest[0], timer: 'next' }
  }
  writeRun(null)
  return { event, ...endTimer(run, c.eventId) }
}

/**
 * Left without a grade: no event, no change to the unit; the time already spent stays in its
 * spans. The timer ends as it does at the end of a run.
 */
export function leaveRevision(): TimerEnd {
  const run = readRun()
  writeRun(null)
  return run.current ? endTimer(run, run.current.eventId) : { timer: 'none' }
}
