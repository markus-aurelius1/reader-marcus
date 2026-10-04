// Study timer state: the one active timer and the completed sessions.
// Local-first like the rest of the reader — every action updates the screen, is written to
// IndexedDB and queued for sync; nothing here waits on the network. The rules are in timer.ts.
//
// Completed StudySession rows are the only record of study time. Nothing keeps a running total.
import { create } from 'zustand'
import { db } from './db'
import { deviceId, markDirty, registerKind, syncLocal, type KindAdapter } from './store'
import { keyOf, kindOf } from '../sync/merge'
import type { ActiveStudySession, SpanActivity, StudyContext, StudySession } from './contract'
import { RUN_ID, durationText, finish, isActive, pause, resume, runRec, sesRec, start, switchContext, takeOver, timeZone, type Env, type Runtime } from './timer'

interface StudyState {
  ready: boolean
  /** The active timer, or the marker left by the last one. */
  runtime: Runtime | null
  sessions: Record<string, StudySession>
  /** When the app was last open, if the timer then ran unattended for a long stretch. */
  away: number | null
  notice: string
}
export const useStudy = create<StudyState>(() => ({ ready: false, runtime: null, sessions: {}, away: null, notice: '' }))

/** Replaceable in tests. */
export const clock = { now: () => Date.now() }
const SEEN = 'upsc-timer-seen'
/** A longer silence than this means the app was closed or the device asleep. */
export const AWAY_MS = 5 * 60000

let runSynced: string | null | undefined // cloud revision the local timer state is based on
let boot: Promise<void> | null = null
const env = (): Env => ({ now: clock.now(), dev: deviceId, tz: timeZone() })
const freeze = (s: StudySession): StudySession => {
  s.spans.forEach((x) => Object.freeze(Object.freeze(x).context))
  Object.freeze(s.spans)
  return Object.freeze(s)
}

export const activeTimer = (s: StudyState): ActiveStudySession | null => (isActive(s.runtime) ? s.runtime : null)
export const ownsTimer = (a: ActiveStudySession | null) => !!a && a.ownerDeviceId === deviceId
const mine = () => {
  const a = activeTimer(useStudy.getState())
  return ownsTimer(a) ? a : null
}

// Other tabs of this browser share the database: tell them to re-read it.
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window && import.meta.env.MODE !== 'test' ? new BroadcastChannel('upsc-study') : null
const saved = (p: Promise<unknown>) => p.then(() => channel?.postMessage(1)).catch((e) => console.error('[study] save failed', e))

async function load() {
  const [rows, runtime, synced] = await Promise.all([db.getAll<StudySession>('studySessions'), db.get<Runtime>('activeStudySession', 'active'), db.get<string | null>('kv', 'runSynced')])
  runSynced = synced
  useStudy.setState({ sessions: Object.fromEntries(rows.map((r) => [r.id, freeze(r)])), runtime: runtime ?? null, ready: true })
  return rows
}
channel?.addEventListener('message', () => void load().catch(() => {}))

/** Screen first, then IndexedDB, then the sync queue. */
function commit(runtime: Runtime, session?: StudySession | null) {
  const s = useStudy.getState()
  // a stored session is never replaced
  const add = session && !s.sessions[session.id] ? freeze(session) : null
  useStudy.setState({ runtime, sessions: add ? { ...s.sessions, [add.id]: add } : s.sessions })
  saved(db.putAll([{ store: 'activeStudySession', value: runtime, key: 'active' }, ...(add ? [{ store: 'studySessions', value: add }] : [])]))
  if (add) markDirty(`ses~${add.id}`)
  markDirty(RUN_ID)
  beat()
}

// While the timer runs here, note when the app was last alive. A long gap — the browser was
// closed, the device slept — is offered back to the user instead of being counted silently.
function beat() {
  try {
    if (mine()?.state !== 'running') return localStorage.removeItem(SEEN)
    const now = clock.now()
    const seen = Number(localStorage.getItem(SEEN))
    if (seen && now - seen > AWAY_MS && useStudy.getState().away === null) useStudy.setState({ away: seen })
    localStorage.setItem(SEEN, String(now))
  } catch {
    /* storage unavailable: no away detection */
  }
}

export function initStudy(): Promise<void> {
  return (boot ??= (async () => {
    try {
      const rows = await load()
      // a crash between saving a session and queueing it must not leave it unsent
      const queued = syncLocal.dirty()
      for (const r of rows) if (!r.syncedAt && !queued.has(`ses~${r.id}`)) markDirty(`ses~${r.id}`, true)
      beat()
      window.setInterval(beat, 20000)
      document.addEventListener('visibilitychange', beat)
      window.addEventListener('pagehide', beat)
    } catch (e) {
      console.error('[study] IndexedDB unavailable; the timer will not persist', e)
      useStudy.setState({ ready: true })
    }
  })())
}

// ---- actions ------------------------------------------------------------------
/** Start a timer on `context`. Does nothing while a timer exists — there is only ever one. */
export function startTimer(context: StudyContext, offlineProvisional = false, activity?: SpanActivity) {
  if (activeTimer(useStudy.getState())) return
  commit(start(context, clock.now(), deviceId, offlineProvisional, activity))
}

function change(fn: (a: ActiveStudySession, now: number) => ActiveStudySession) {
  const a = mine()
  if (!a) return
  const next = fn(a, clock.now())
  if (next === a) return
  useStudy.setState({ away: null }) // acting on the timer accepts the time it has counted
  commit(next)
}
export const pauseTimer = () => change(pause)
export const resumeTimer = () => change(resume)

/** The reader moved to another tracked unit (followNavigation). */
export function followContext(context: StudyContext) {
  if (useStudy.getState().away !== null) return // not until the unattended stretch is settled
  const a = mine()
  if (!a) return
  // reading the notes of the unit under revision is part of revising it
  const r = a.currentActivity?.activity === 'revision' ? a.currentContext.ref : null
  if (r && r.stage === context.ref.stage && r.subjectId === context.ref.subjectId && r.chapterId === context.ref.chapterId) return
  const next = switchContext(a, context, clock.now())
  if (next !== a) commit(next)
}

/**
 * Scheduled revision of a unit begins: the one timer moves into a revision span. No second timer
 * is ever created — a timer running here is switched (and resumed if paused); with none, one is
 * started; one owned by another device is left alone.
 */
export function beginRevisionSpan(context: StudyContext, activity: SpanActivity, offlineProvisional = false): 'started' | 'switched' | 'remote' {
  const any = activeTimer(useStudy.getState())
  if (!any) {
    commit(start(context, clock.now(), deviceId, offlineProvisional, activity))
    return 'started'
  }
  if (!ownsTimer(any)) return 'remote'
  const now = clock.now()
  const next = switchContext(resume(any, now), context, now, activity)
  if (next !== any) {
    useStudy.setState({ away: null })
    commit(next)
  }
  return 'switched'
}

/** Active time recorded so far for one revision (its closed spans and the open one). */
export function revisionSpanMs(eventId: string): number {
  const a = activeTimer(useStudy.getState())
  if (!a) return 0
  const closed = a.completedSpans.filter((s) => s.revisionEventId === eventId).reduce((n, s) => n + s.durationMs, 0)
  const open = a.currentActivity?.revisionEventId === eventId && a.state === 'running' && a.currentSpanStartedAt ? Math.max(0, clock.now() - Date.parse(a.currentSpanStartedAt)) : 0
  return closed + open
}

/** Stop and save. `at` ends the session earlier than now (the unattended stretch is left out). */
export function stopTimer(at?: number): StudySession | null {
  const a = mine()
  if (!a) return null
  const e = env()
  const { session, stopped } = finish(a, e, at ?? e.now, at === undefined ? 'timer' : 'recovered')
  useStudy.setState({ away: null })
  commit(stopped, session)
  return session
}

/** Take over the timer another device is running: the same session continues here. */
export function continueHere(context?: StudyContext, activity?: SpanActivity) {
  const a = activeTimer(useStudy.getState())
  if (!a || ownsTimer(a)) return
  commit(takeOver(a, deviceId, clock.now(), context, activity))
}

export const keepAwayTime = () => useStudy.setState({ away: null })
export const clearNotice = () => useStudy.setState({ notice: '' })

// ---- sync adapter -----------------------------------------------------------------
const adapter: KindAdapter = {
  get(id) {
    const s = useStudy.getState()
    if (kindOf(id) === 'run') return s.runtime ? runRec(s.runtime) : null
    const x = s.sessions[keyOf(id)]
    return x ? sesRec(x) : null
  },

  apply(rec) {
    const s = useStudy.getState()
    if (rec.kind === 'run') {
      runSynced = rec.rev
      useStudy.setState({ runtime: rec.data as unknown as Runtime, away: null })
      saved(db.putAll([{ store: 'activeStudySession', value: rec.data, key: 'active' }, { store: 'kv', value: rec.rev ?? null, key: 'runSynced' }]))
      beat()
      return
    }
    const data = rec.data as unknown as StudySession
    // split off here while reconciling, so not in the cloud yet; anything else just came from it
    const local = data.source === 'recovered' && data.createdDeviceId === deviceId && !s.sessions[data.id]
    const session = freeze(local ? data : { ...data, syncedAt: new Date(clock.now()).toISOString() })
    useStudy.setState({
      sessions: { ...s.sessions, [session.id]: session },
      notice: local ? `Another timer was already running. The ${durationText(session.durationMs)} recorded on this device is saved as its own session.` : s.notice,
    })
    saved(db.put('studySessions', session))
  },

  synced: (id) => (kindOf(id) === 'run' ? runSynced : undefined),

  markSynced(id, rev) {
    if (kindOf(id) !== 'run') return
    if (runSynced !== rev) {
      runSynced = rev
      db.put('kv', rev ?? null, 'runSynced').catch(() => {})
    }
    // the cloud accepted a timer that was started offline: it is no longer provisional
    const a = mine()
    if (a?.offlineProvisional && runRec(a).rev === rev) {
      const { offlineProvisional: _p, ...rest } = a
      commit({ ...rest, revision: a.revision + 1, updatedAt: new Date(clock.now()).toISOString() })
    }
  },

  sent(id) {
    if (kindOf(id) !== 'ses') return
    const s = useStudy.getState()
    const x = s.sessions[keyOf(id)]
    if (!x || x.syncedAt) return
    const session = freeze({ ...x, syncedAt: new Date(clock.now()).toISOString() })
    useStudy.setState({ sessions: { ...s.sessions, [session.id]: session } })
    saved(db.put('studySessions', session))
  },

  ids() {
    const s = useStudy.getState()
    return [...Object.keys(s.sessions).map((k) => `ses~${k}`), ...(s.runtime ? [RUN_ID] : [])]
  },

  rebind() {
    runSynced = null
    db.put('kv', null, 'runSynced').catch(() => {})
  },

  async wipe() {
    runSynced = null
    useStudy.setState({ runtime: null, sessions: {}, away: null, notice: '' })
    try {
      localStorage.removeItem(SEEN)
    } catch {
      /* storage unavailable */
    }
    await db.clear(['studySessions', 'activeStudySession'])
    await db.put('kv', null, 'runSynced')
    channel?.postMessage(1)
  },
}
registerKind('ses', adapter)
registerKind('run', adapter)
