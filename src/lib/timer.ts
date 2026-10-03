// Study timer rules. Pure: no I/O, no clock of its own — every function takes `now` (ms).
// docs/READER_V2_CONTRACT.md → Timer semantics. Unit-tested in timer.test.ts.
//
// An ActiveStudySession is a list of closed spans plus, while running, one open span that began at
// currentSpanStartedAt. Elapsed time is always derived from those timestamps, so a reload, a
// closed browser or another device computes the same figure. Pausing closes the open span;
// nothing accrues until Resume opens the next one.
import type { ActiveStudySession, StudyContext, StudySession, StudySpan } from './contract'
import type { Rec } from '../sync/merge'

/** Left in place of the active timer once it stops, so other devices learn that it ended. */
export interface StoppedTimer {
  sessionId: string
  revision: number
  ownerDeviceId: string
  updatedAt: string
  /** Spans of the session it ended as. */
  spanIds: string[]
}
export type Runtime = ActiveStudySession | StoppedTimer
export interface Env {
  now: number
  dev: string
  tz: string
}

/** Anything shorter is an accidental Start/Stop, not a study session. */
export const MIN_SESSION_MS = 1000
export const RUN_ID = 'run~active'

const iso = (ms: number) => new Date(ms).toISOString()
const sum = (spans: StudySpan[]) => spans.reduce((n, s) => n + s.durationMs, 0)

export const isActive = (r: Runtime | null | undefined): r is ActiveStudySession => !!r && 'state' in r
export const newSessionId = (now: number) => 's' + now.toString(36) + Math.random().toString(36).slice(2, 8)
export const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** The tracked unit: stage/subject/chapter[/section] — the reader's own stable keys. */
export const contextKey = (c: StudyContext) => [c.ref.stage, c.ref.subjectId, c.ref.chapterId, c.ref.sectionId].filter(Boolean).join('/')

// A span is named by the device that opened it and the moment it opened, so two copies of one
// timer that drifted apart still agree on the spans they share.
const openSpanId = (a: ActiveStudySession) => `${a.ownerDeviceId}-${Date.parse(a.currentSpanStartedAt!).toString(36)}`

function closeSpan(a: ActiveStudySession, now: number): ActiveStudySession {
  if (a.state !== 'running' || !a.currentSpanStartedAt) return a
  const from = Date.parse(a.currentSpanStartedAt)
  const durationMs = Math.max(0, now - from)
  const span: StudySpan = { id: openSpanId(a), context: a.currentContext, startedAt: a.currentSpanStartedAt, endedAt: iso(from + durationMs), durationMs }
  return { ...a, completedSpans: durationMs ? [...a.completedSpans, span] : a.completedSpans, accumulatedMs: a.accumulatedMs + durationMs, currentSpanStartedAt: undefined }
}
const bump = (a: ActiveStudySession, now: number): ActiveStudySession => ({ ...a, updatedAt: iso(now), revision: a.revision + 1 })

export function start(context: StudyContext, now: number, dev: string, offlineProvisional = false): ActiveStudySession {
  return {
    sessionId: newSessionId(now),
    state: 'running',
    startedAt: iso(now),
    currentContext: context,
    currentSpanStartedAt: iso(now),
    accumulatedMs: 0,
    completedSpans: [],
    ownerDeviceId: dev,
    updatedAt: iso(now),
    revision: 1,
    ...(offlineProvisional ? { offlineProvisional: true } : {}),
  }
}

export const pause = (a: ActiveStudySession, now: number) => (a.state === 'running' ? bump({ ...closeSpan(a, now), state: 'paused' }, now) : a)

export const resume = (a: ActiveStudySession, now: number) => (a.state === 'paused' ? bump({ ...a, state: 'running', currentSpanStartedAt: iso(now) }, now) : a)

/** Moving to another tracked unit: the open span ends where it is, the next one begins. */
export function switchContext(a: ActiveStudySession, context: StudyContext, now: number): ActiveStudySession {
  if (contextKey(a.currentContext) === contextKey(context)) return a
  if (a.state === 'paused') return bump({ ...a, currentContext: context }, now)
  return bump({ ...closeSpan(a, now), currentContext: context, currentSpanStartedAt: iso(now) }, now)
}

/** "Continue here": the same session carries on, owned by `dev`. */
export function takeOver(a: ActiveStudySession, dev: string, now: number, context?: StudyContext): ActiveStudySession {
  const { offlineProvisional: _p, ...rest } = closeSpan(a, now)
  return bump({ ...rest, state: 'running', ownerDeviceId: dev, currentContext: context ?? a.currentContext, currentSpanStartedAt: iso(now) }, now)
}

/** Active study time so far. Paused time is never part of it. */
export const elapsed = (a: ActiveStudySession, now: number) => a.accumulatedMs + (a.state === 'running' && a.currentSpanStartedAt ? Math.max(0, now - Date.parse(a.currentSpanStartedAt)) : 0)

function toSession(id: string, spans: StudySpan[], source: StudySession['source'], env: Env): StudySession | null {
  const durationMs = sum(spans)
  if (durationMs < MIN_SESSION_MS) return null
  return { id, startedAt: spans[0].startedAt, endedAt: spans[spans.length - 1].endedAt, durationMs, spans, source, createdDeviceId: env.dev, timeZone: env.tz, createdAt: iso(env.now) }
}

/**
 * Stop. `at` is where the last span ends — normally now; earlier when the session is cut back to
 * the moment the app was last open. Returns the session (null when nothing worth keeping was
 * recorded) and the marker that replaces the active timer.
 */
export function finish(a: ActiveStudySession, env: Env, at = env.now, source: StudySession['source'] = 'timer'): { session: StudySession | null; stopped: StoppedTimer } {
  const spans = closeSpan(a, at).completedSpans
  return {
    session: toSession(a.sessionId, spans, source, env),
    stopped: { sessionId: a.sessionId, revision: a.revision + 1, ownerDeviceId: env.dev, updatedAt: iso(env.now), spanIds: spans.map((s) => s.id) },
  }
}

const knownSpans = (r: Runtime) => new Set(isActive(r) ? [...r.completedSpans.map((s) => s.id), ...(r.state === 'running' && r.currentSpanStartedAt ? [openSpanId(r)] : [])] : r.spanIds)

/**
 * This device's timer has to give way to the cloud's. Whatever it recorded that the cloud version
 * does not contain is kept as a session of its own, so no study time is dropped.
 */
export function salvage(local: ActiveStudySession, cloud: Runtime, env: Env): StudySession | null {
  const sameSession = local.sessionId === cloud.sessionId
  const known = sameSession ? knownSpans(cloud) : new Set<string>()
  const mine = local.ownerDeviceId === env.dev ? closeSpan(local, env.now) : local
  return toSession(sameSession ? `${local.sessionId}_${env.dev}` : local.sessionId, mine.completedSpans.filter((s) => !known.has(s.id)), 'recovered', env)
}

/** The same session id completed differently on two devices: the spans only this copy has. */
export function salvageSession(local: StudySession, cloud: StudySession, env: Env): StudySession | null {
  const known = new Set(cloud.spans.map((s) => s.id))
  return toSession(`${local.id}_${env.dev}`, local.spans.filter((s) => !known.has(s.id)), 'recovered', env)
}

// ---- sync records ---------------------------------------------------------------
// The revision names the device that made the change: two devices that each took one step from
// the same state must not look identical.
export const runRec = (r: Runtime): Rec => ({ id: RUN_ID, kind: 'run', t: Date.parse(r.updatedAt), dev: r.ownerDeviceId, rev: `${r.sessionId}:${r.revision}:${r.ownerDeviceId}`, del: !isActive(r), data: r as unknown as Record<string, unknown> })

export function sesRec(s: StudySession): Rec {
  const { syncedAt: _s, ...data } = s
  return { id: `ses~${s.id}`, kind: 'ses', t: Date.parse(s.createdAt), dev: s.createdDeviceId, data }
}

// ---- display --------------------------------------------------------------------
const two = (n: number) => String(n).padStart(2, '0')
/** 01:24:37 */
export function clockText(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`
}
/** 42:18, or 1:24:37 past the hour. */
export const shortClock = (ms: number) => (ms < 3600000 ? clockText(ms).slice(3) : clockText(ms).replace(/^0/, ''))
/** 42 min · 1 h 24 min */
export function durationText(ms: number) {
  const m = Math.round(ms / 60000)
  return m < 1 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${two(m % 60)} min`
}
