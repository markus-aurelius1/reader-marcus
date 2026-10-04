// One revision, two views: Recall and Notes. Whichever is open, and across a reload, it stays the
// same revision — one event id, one round, one timer span, one event when it is graded.
// A "reload" is a fresh copy of the modules over the same IndexedDB and localStorage.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RevisionEvent, RevisionGrade, StudyContext, StudySession } from './contract'
import { deleteDb, idle } from './testkit'

const TZ = 'Asia/Kolkata'
const DAY = 86400000
const MIN = 60000
const T0 = Date.parse('2026-10-05T04:30:00.000Z') // 10:00 on 5 Oct in India
let now = T0
const K = (section: string, chapter = 'parliament') => `prelims/polity/${chapter}/${section}`
const ctx = (chapterId: string, sectionId?: string): StudyContext => ({ ref: { kind: sectionId ? 'section' : 'chapter', stage: 'prelims', subjectId: 'polity', chapterId, ...(sectionId ? { sectionId } : {}) }, subjectTitle: 'Polity', chapterTitle: chapterId, ...(sectionId ? { sectionTitle: sectionId } : {}) })
const BUDGET = ctx('parliament', 'budget')

async function boot() {
  vi.resetModules()
  const store = await import('./store')
  const study = await import('./study')
  const plan = await import('./plan')
  const pyq = await import('./pyqState')
  const rev = await import('./revision')
  const reset = await import('./reset')
  const run = await import('./revisionRun')
  const analytics = await import('./analytics')
  for (const m of [study, plan, pyq, rev, reset]) m.clock.now = () => now
  await store.useStore.getState().init()
  await study.initStudy()
  await plan.initPlan()
  await pyq.initPyqState()
  await rev.initRevision()
  await reset.initReset()
  if (rev.useRevision.getState().prefs?.schedulerTimeZone !== TZ) rev.setRevisionPrefs({ schedulerTimeZone: TZ })
  const timer = () => study.activeTimer(study.useStudy.getState())
  const sessions = (): StudySession[] => Object.values(study.useStudy.getState().sessions)
  const events = (): RevisionEvent[] => Object.values(rev.useRevision.getState().events).sort((a, b) => a.ordinal - b.ordinal)
  const done = (key: string) => store.useStore.getState().setSection(key, { done: true })
  /** Minutes pass while the app is open (a longer silence would read as an unattended timer). */
  const pass = (min: number) => {
    now += min * MIN
    study.keepAwayTime()
  }
  /** Open the Recall view of a unit, as views/Revision.tsx does. */
  const recall = (key = K('budget'), c = BUDGET) => {
    const cur = run.openRevision(key, c)!
    run.trackRevision(cur)
    return cur
  }
  /** Read in the reader — the Notes view, and wherever its links lead. */
  const read = (c: StudyContext) => run.followReading(c)
  return { store, study, rev, reset, run, analytics, timer, sessions, events, done, pass, recall, read }
}

beforeEach(async () => {
  now = T0
  localStorage.clear()
  await deleteDb()
})

describe('Recall → Notes → Recall', () => {
  it('is one revision throughout: the same event id, round and timer span', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    const cur = t.recall()
    expect(cur).toMatchObject({ unitId: K('budget'), ordinal: 1 })
    const a0 = t.timer()!
    expect(a0.currentActivity).toEqual({ activity: 'revision', revisionUnitId: K('budget'), revisionEventId: cur.eventId, revisionOrdinal: 1 })

    t.pass(3)
    t.read(ctx('parliament')) // Review Notes: the chapter of the unit
    t.pass(2)
    t.read(ctx('parliament', 'question-hour')) // scrolling on, timed by section
    t.pass(2)
    t.read(ctx('judiciary')) // a cross-link into another chapter
    expect(t.run.useRun.getState().run.current).toEqual(cur)
    expect(t.timer()).toBe(a0) // nothing was closed, opened or rewritten

    t.pass(1)
    const back = t.recall() // back to Recall
    expect(back).toBe(cur)
    expect(t.timer()).toBe(a0)
    expect(t.study.revisionSpanMs(cur.eventId)).toBe(8 * MIN)
    expect(t.run.revisionOf(t.run.readRun())).toBe(cur)
  })

  it('reading notes during a revision is never initial study; without one the timer follows the reader as before', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    t.study.startTimer(ctx('judiciary')) // studying, then a revision begins
    t.pass(4)
    const cur = t.recall()
    t.pass(3)
    t.read(ctx('judiciary'))
    t.pass(3)
    t.read(ctx('executive'))
    t.pass(2)
    expect(t.timer()!.currentActivity?.revisionEventId).toBe(cur.eventId)
    expect(t.timer()!.completedSpans.map((s) => s.activity ?? 'initial-study')).toEqual(['initial-study'])
    t.run.finishRevision('good')
    // the study timer that was already running is paused; reading on is study again
    expect(t.timer()!.state).toBe('paused')
    t.read(ctx('executive'))
    t.study.resumeTimer()
    t.pass(4)
    const s = t.study.stopTimer()!
    expect(t.sessions()).toHaveLength(1)
    expect(s.spans.map((x) => [x.context.ref.kind === 'current-affairs' ? '' : x.context.ref.chapterId, x.activity ?? 'initial-study', x.durationMs])).toEqual([['judiciary', 'initial-study', 4 * MIN], ['parliament', 'revision', 8 * MIN], ['executive', 'initial-study', 4 * MIN]])
  })
})

describe('the revision timer', () => {
  it('runs on without a break through both views, and is saved as one session with one span', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    const cur = t.recall()
    for (const c of [ctx('parliament'), ctx('judiciary'), ctx('parliament', 'budget')]) {
      t.pass(4)
      t.read(c)
      t.pass(1)
      t.recall()
    }
    expect(t.timer()!.completedSpans).toHaveLength(0)
    const f = t.run.finishRevision('good')!
    expect(f.timer).toBe('stopped')
    expect(f.next).toBeUndefined()
    expect(t.sessions()).toHaveLength(1)
    expect(f.session!.spans).toHaveLength(1)
    expect(f.session!.spans[0]).toMatchObject({ activity: 'revision', revisionUnitId: K('budget'), revisionEventId: cur.eventId, revisionOrdinal: 1, durationMs: 15 * MIN })
    expect(f.event).toMatchObject({ id: cur.eventId, durationMs: 15 * MIN, studySessionId: f.session!.id })
  })

  it('a timer paused or stopped while reading the notes is not resumed or restarted by going back to Recall', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    const cur = t.recall()
    t.pass(3)
    t.read(ctx('parliament'))
    t.study.pauseTimer()
    t.pass(4)
    t.recall()
    expect(t.timer()!.state).toBe('paused')
    expect(t.study.revisionSpanMs(cur.eventId)).toBe(3 * MIN)
    t.study.resumeTimer()
    t.pass(2)
    t.study.stopTimer()
    t.read(ctx('parliament'))
    t.recall()
    expect(t.timer()).toBeNull()
    expect(t.sessions()).toHaveLength(1)
    // a timer started from the reader while the revision is in progress times the revision
    t.study.startTimer(ctx('parliament'))
    t.read(ctx('parliament'))
    expect(t.timer()!.currentActivity?.revisionEventId).toBe(cur.eventId)
    // leaving the revision's views and opening it again is a fresh start: the timer comes back
    t.study.stopTimer()
    t.run.forgetBegun()
    t.recall()
    expect(t.timer()).toMatchObject({ state: 'running', currentActivity: { revisionEventId: cur.eventId } })
  })

  it("another device's timer is left alone in both views", async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    t.study.startTimer(ctx('judiciary'))
    const a = t.timer()!
    t.study.useStudy.setState({ runtime: { ...a, ownerDeviceId: 'elsewhere' } })
    const before = t.study.useStudy.getState().runtime
    t.recall()
    t.read(ctx('parliament'))
    t.recall()
    expect(t.study.useStudy.getState().runtime).toBe(before)
    const f = t.run.finishRevision('good')!
    expect(f.timer).toBe('none')
    expect(f.event.studySessionId).toBeUndefined()
    expect(t.study.useStudy.getState().runtime).toBe(before)
  })
})

describe('R1 / R2 / R3', () => {
  it('each round keeps its own event, ordinal and time, with the notes read in every one', async () => {
    const t = await boot()
    t.done(K('budget'))
    const grades: RevisionGrade[] = ['good', 'hard', 'easy']
    const ids: string[] = []
    for (const [i, grade] of grades.entries()) {
      now += 2 * DAY
      const cur = t.recall()
      expect(cur.ordinal).toBe(i + 1)
      ids.push(cur.eventId)
      t.pass(2)
      t.read(ctx('parliament'))
      t.pass(i + 1)
      t.read(ctx('judiciary'))
      t.pass(1)
      if (i === 1) t.recall()
      expect(t.timer()!.currentActivity).toMatchObject({ revisionEventId: cur.eventId, revisionOrdinal: i + 1 })
      t.run.finishRevision(grade)
      t.run.forgetBegun()
    }
    expect(new Set(ids).size).toBe(3)
    expect(t.events().map((e) => [e.id, e.ordinal, e.grade, e.durationMs])).toEqual([[ids[0], 1, 'good', 4 * MIN], [ids[1], 2, 'hard', 5 * MIN], [ids[2], 3, 'easy', 6 * MIN]])
    expect(t.rev.useRevision.getState().units[K('budget')].revisionCount).toBe(3)
    const spans = t.sessions().sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1)).flatMap((s) => s.spans)
    expect(spans.map((s) => [s.activity, s.revisionUnitId, s.revisionEventId, s.revisionOrdinal, s.durationMs])).toEqual(ids.map((id, i) => ['revision', K('budget'), id, i + 1, (4 + i) * MIN]))
    const a = t.analytics.activityTime(t.analytics.indexOf(t.study.useStudy.getState().sessions, TZ))
    //                     initial  R1        R2        R3       R4  R5+
    expect(a.time).toEqual([0, 4 * MIN, 5 * MIN, 6 * MIN, 0, 0])
    expect(a.byTopic.map((x) => x.key)).toEqual(['prelims/polity/parliament']) // none of it went to the chapter the link led to
  })
})

describe('reload while reading the notes', () => {
  it('the revision, its event id, its round and its running span are all still there', async () => {
    let t = await boot()
    t.done(K('budget'))
    now += DAY
    t.recall()
    now += DAY
    t.study.keepAwayTime()
    t.run.finishRevision('good') // R1 done; the next one is R2
    t.run.forgetBegun()
    now += 3 * DAY
    const cur = t.recall()
    expect(cur.ordinal).toBe(2)
    t.pass(3)
    t.read(ctx('judiciary'))
    t.pass(1)
    const sessionId = t.timer()!.sessionId
    await idle()

    t = await boot() // reload on the notes page: the Recall view is not mounted
    expect(t.run.readRun().current).toEqual(cur)
    expect(t.run.revisionOf(t.run.readRun())).toEqual(cur)
    t.read(ctx('judiciary'))
    t.pass(2)
    t.read(ctx('executive'))
    expect(t.timer()).toMatchObject({ sessionId, state: 'running', completedSpans: [], currentActivity: { activity: 'revision', revisionUnitId: K('budget'), revisionEventId: cur.eventId, revisionOrdinal: 2 } })
    expect(t.study.revisionSpanMs(cur.eventId)).toBe(6 * MIN)
    const back = t.recall() // Back, to Recall
    expect(back).toEqual(cur)
    expect(t.timer()!.completedSpans).toHaveLength(0)
    const f = t.run.finishRevision('hard')!
    expect(f.event).toMatchObject({ id: cur.eventId, ordinal: 2, grade: 'hard', durationMs: 6 * MIN })
    expect(t.events()).toHaveLength(2)
  })

  it('until the revision records have loaded, the timer is not moved', async () => {
    let t = await boot()
    t.done(K('budget'))
    now += DAY
    const cur = t.recall()
    t.pass(2)
    await idle()
    t = await boot()
    t.rev.useRevision.setState({ ready: false })
    t.read(ctx('judiciary'))
    expect(t.timer()!.currentActivity?.revisionEventId).toBe(cur.eventId)
    t.rev.useRevision.setState({ ready: true })
    t.read(ctx('judiciary'))
    expect(t.timer()!.currentActivity?.revisionEventId).toBe(cur.eventId)
  })
})

describe('Finish Revision from the Notes view', () => {
  it('writes the one event and moves the unit on, exactly as from Recall', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += 4 * DAY // three days overdue
    const cur = t.recall()
    t.rev.recordAttempt({ recallUnitId: 'r1', contentHash: 'h', unitId: K('budget'), eventId: cur.eventId, outcome: 'missed' })
    t.pass(2)
    t.read(ctx('parliament'))
    t.pass(4)
    const before = t.rev.useRevision.getState().units[K('budget')]
    const f = t.run.finishRevision('good')!
    const after = t.rev.useRevision.getState().units[K('budget')]
    expect(f.event).toMatchObject({ id: cur.eventId, revisionUnitId: K('budget'), ordinal: 1, grade: 'good', scheduledDueDate: before.dueDate, overdueDays: 3, startedAt: cur.startedAt, durationMs: 6 * MIN, recallAttemptCount: 1, recallMissCount: 1, nextDueDate: after.dueDate })
    expect(after).toMatchObject({ revisionCount: 1, status: 'active' })
    expect(after.scheduler.stability).toBeGreaterThan(0)
    expect(after.dueDate > before.dueDate).toBe(true)
    expect(t.run.readRun()).toEqual({ queue: [] })
    expect(localStorage.getItem('upsc-revision-run')).toBeNull()
    expect(t.run.revisionOf(t.run.readRun())).toBeNull()
    expect(t.timer()).toBeNull() // the timer the revision started is stopped and saved
  })

  it('in a run, the next unit follows with its own event and span, in the same timer session', async () => {
    const t = await boot()
    t.done(K('budget'))
    t.done(K('speaker'))
    now += DAY
    t.run.writeRun({ queue: [K('budget'), K('speaker')] }) // Start Revision
    const first = t.recall()
    t.pass(3)
    t.read(ctx('parliament'))
    const f = t.run.finishRevision('easy')!
    expect(f).toMatchObject({ next: K('speaker'), timer: 'next' })
    expect(t.run.readRun()).toEqual({ queue: [K('speaker')], ownTimer: true })
    const second = t.recall(K('speaker'), ctx('parliament', 'speaker'))
    expect(second.eventId).not.toBe(first.eventId)
    t.pass(2)
    t.read(ctx('parliament'))
    const g = t.run.finishRevision('good')!
    expect(g.timer).toBe('stopped')
    expect(t.sessions()).toHaveLength(1)
    expect(g.session!.spans.map((s) => [s.revisionUnitId, s.revisionEventId, s.durationMs])).toEqual([[K('budget'), first.eventId, 3 * MIN], [K('speaker'), second.eventId, 2 * MIN]])
  })
})

describe('no duplicates', () => {
  it('switching views any number of times makes no event, no session and no second revision', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    const cur = t.recall()
    for (let i = 0; i < 6; i++) {
      t.pass(1)
      t.read(ctx(i % 2 ? 'judiciary' : 'parliament'))
      expect(t.recall()).toBe(cur)
    }
    expect(t.events()).toHaveLength(0)
    expect(t.sessions()).toHaveLength(0)
    expect(t.timer()!.completedSpans).toHaveLength(0)
    expect(t.rev.useRevision.getState().units[K('budget')].revisionCount).toBe(0)
  })

  it('the grade given twice — a double click, or once in each view — records one event', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    const cur = t.recall()
    t.pass(3)
    t.read(ctx('parliament'))
    const f = t.run.finishRevision('good', cur)!
    const again = t.run.finishRevision('easy', cur)! // the Recall view still held the same revision
    expect(again.event).toBe(f.event)
    expect(t.run.finishRevision('easy')).toBeNull() // nothing is in progress any more
    expect(t.events()).toHaveLength(1)
    expect(t.events()[0].grade).toBe('good')
    expect(t.sessions()).toHaveLength(1)
    expect(t.rev.useRevision.getState().units[K('budget')].revisionCount).toBe(1)
    await idle()
    const fresh = await boot()
    expect(fresh.events()).toHaveLength(1)
    expect(fresh.sessions()).toHaveLength(1)
  })

  it('left without a grade: no event, the unit as it was, the time kept in its span', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    const cur = t.recall()
    const before = t.rev.useRevision.getState().units[K('budget')]
    t.pass(3)
    t.read(ctx('parliament'))
    const end = t.run.leaveRevision()
    expect(end.timer).toBe('stopped')
    expect(end.session!.spans).toMatchObject([{ activity: 'revision', revisionEventId: cur.eventId, durationMs: 3 * MIN }])
    expect(t.events()).toHaveLength(0)
    expect(t.rev.useRevision.getState().units[K('budget')]).toBe(before)
    expect(t.run.readRun()).toEqual({ queue: [] })
    // opening it again is a new revision, still R1
    t.run.forgetBegun()
    const next = t.recall()
    expect(next.eventId).not.toBe(cur.eventId)
    expect(next.ordinal).toBe(1)
  })

  it('a Study History reset ends the revision in progress', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    t.recall()
    await t.reset.resetPersonalData('study-history')
    expect(t.run.readRun()).toEqual({ queue: [] })
    expect(localStorage.getItem('upsc-revision-run')).toBeNull()
  })
})
