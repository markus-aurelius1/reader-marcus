import { describe, expect, it } from 'vitest'
import type { StudyContext } from './contract'
import { MIN_SESSION_MS, clockText, elapsed, finish, isActive, pause, resume, salvage, shortClock, start, switchContext, takeOver, type Env } from './timer'

const MIN = 60000
const T0 = Date.parse('2026-10-03T10:00:00.000Z')
const ctx = (chapterId: string, subjectId = 'economy', sectionId?: string): StudyContext => ({
  ref: { kind: sectionId ? 'section' : 'chapter', stage: 'prelims', subjectId, topicId: 'macro', chapterId, sectionId, taxonomyId: 'ECO-01' },
  subjectTitle: subjectId,
  topicTitle: 'Macro',
  chapterTitle: chapterId,
})
const env = (now: number, dev = 'A', tz = 'Asia/Kolkata'): Env => ({ now, dev, tz })

describe('study timer', () => {
  it('start: running, owned by this device, counting from the start time', () => {
    const a = start(ctx('inflation'), T0, 'A')
    expect(a).toMatchObject({ state: 'running', ownerDeviceId: 'A', accumulatedMs: 0, completedSpans: [], revision: 1 })
    expect(elapsed(a, T0 + 5 * MIN)).toBe(5 * MIN)
  })

  it('pause: time stops; paused time is never counted', () => {
    const a = pause(start(ctx('inflation'), T0, 'A'), T0 + 10 * MIN)
    expect(a.state).toBe('paused')
    expect(a.currentSpanStartedAt).toBeUndefined()
    expect(elapsed(a, T0 + 10 * MIN)).toBe(10 * MIN)
    expect(elapsed(a, T0 + 500 * MIN)).toBe(10 * MIN)
  })

  it('resume: a new active segment; the pause is left out of the total', () => {
    let a = pause(start(ctx('inflation'), T0, 'A'), T0 + 10 * MIN)
    a = resume(a, T0 + 40 * MIN)
    expect(a.state).toBe('running')
    expect(elapsed(a, T0 + 45 * MIN)).toBe(15 * MIN)
    const { session } = finish(a, env(T0 + 45 * MIN))
    expect(session!.durationMs).toBe(15 * MIN)
    expect(session!.spans.map((s) => s.durationMs)).toEqual([10 * MIN, 5 * MIN])
    // wall-clock extent is kept; only active time is counted
    expect(Date.parse(session!.endedAt) - Date.parse(session!.startedAt)).toBe(45 * MIN)
  })

  it('pausing twice or resuming a running timer changes nothing', () => {
    const a = start(ctx('inflation'), T0, 'A')
    expect(resume(a, T0 + MIN)).toBe(a)
    const p = pause(a, T0 + MIN)
    expect(pause(p, T0 + 2 * MIN)).toBe(p)
  })

  it('navigation while running: the span closes with its real duration and the next begins; the clock never breaks', () => {
    let a = start(ctx('inflation'), T0, 'A')
    a = switchContext(a, ctx('taxation'), T0 + 12 * MIN)
    expect(a.state).toBe('running')
    expect(a.completedSpans).toHaveLength(1)
    expect(a.completedSpans[0]).toMatchObject({ durationMs: 12 * MIN, context: { chapterTitle: 'inflation' } })
    expect(a.currentContext.chapterTitle).toBe('taxation')
    expect(elapsed(a, T0 + 12 * MIN)).toBe(12 * MIN) // nothing lost at the switch
    expect(elapsed(a, T0 + 20 * MIN)).toBe(20 * MIN)
  })

  it('staying on the same chapter does not open a new span', () => {
    const a = start(ctx('inflation'), T0, 'A')
    expect(switchContext(a, ctx('inflation'), T0 + MIN)).toBe(a)
  })

  it('tracking by section: a different section of the same chapter is a different unit', () => {
    const a = switchContext(start(ctx('inflation', 'economy', 'causes'), T0, 'A'), ctx('inflation', 'economy', 'control'), T0 + MIN)
    expect(a.completedSpans[0].context.ref).toMatchObject({ kind: 'section', sectionId: 'causes' })
    expect(a.currentContext.ref.sectionId).toBe('control')
  })

  it('navigation while paused moves the context without recording time', () => {
    let a = pause(start(ctx('inflation'), T0, 'A'), T0 + 5 * MIN)
    a = switchContext(a, ctx('taxation'), T0 + 30 * MIN)
    expect(a.completedSpans).toHaveLength(1)
    a = resume(a, T0 + 31 * MIN)
    const { session } = finish(a, env(T0 + 33 * MIN))
    expect(session!.spans.map((s) => [s.context.chapterTitle, s.durationMs])).toEqual([['inflation', 5 * MIN], ['taxation', 2 * MIN]])
  })

  it('stop: one session whose spans attribute every minute to stage, subject, topic, chapter and taxonomy', () => {
    let a = start(ctx('parliament', 'polity'), T0, 'A')
    a = switchContext(a, ctx('inflation'), T0 + 20 * MIN)
    a = switchContext(a, ctx('taxation'), T0 + 50 * MIN)
    const { session, stopped } = finish(a, env(T0 + 60 * MIN))
    expect(session).toMatchObject({ id: a.sessionId, durationMs: 60 * MIN, source: 'timer', createdDeviceId: 'A' })
    expect(session!.spans.map((s) => [s.context.ref.subjectId, s.context.ref.chapterId, s.durationMs])).toEqual([['polity', 'parliament', 20 * MIN], ['economy', 'inflation', 30 * MIN], ['economy', 'taxation', 10 * MIN]])
    expect(session!.spans[1].context.ref).toMatchObject({ stage: 'prelims', topicId: 'macro', taxonomyId: 'ECO-01', kind: 'chapter' })
    expect(session!.spans.reduce((n, s) => n + s.durationMs, 0)).toBe(session!.durationMs)
    expect(new Set(session!.spans.map((s) => s.id)).size).toBe(3)
    expect(isActive(stopped)).toBe(false)
    expect(stopped.spanIds).toEqual(session!.spans.map((s) => s.id))
  })

  it('stop while paused ends the session at the last active moment', () => {
    const a = pause(start(ctx('inflation'), T0, 'A'), T0 + 10 * MIN)
    const { session } = finish(a, env(T0 + 300 * MIN))
    expect(session!.durationMs).toBe(10 * MIN)
    expect(Date.parse(session!.endedAt)).toBe(T0 + 10 * MIN)
  })

  it('records the IANA timezone; a session across midnight keeps the timestamps needed to split it by day', () => {
    const lateNight = Date.parse('2026-10-03T18:00:00.000Z') // 23:30 IST
    const a = start(ctx('inflation'), lateNight, 'A')
    const { session } = finish(a, env(lateNight + 60 * MIN, 'A', 'Asia/Kolkata'))
    expect(session!.timeZone).toBe('Asia/Kolkata')
    const day = (isoTime: string) => new Intl.DateTimeFormat('en-CA', { timeZone: session!.timeZone }).format(new Date(isoTime))
    expect([day(session!.spans[0].startedAt), day(session!.spans[0].endedAt)]).toEqual(['2026-10-03', '2026-10-04'])
  })

  it('an accidental start/stop leaves no session', () => {
    const a = start(ctx('inflation'), T0, 'A')
    expect(finish(a, env(T0 + MIN_SESSION_MS - 1)).session).toBeNull()
  })

  it('a clock that jumps backwards never produces negative time', () => {
    const a = start(ctx('inflation'), T0, 'A')
    expect(elapsed(a, T0 - 5 * MIN)).toBe(0)
    expect(pause(a, T0 - 5 * MIN).accumulatedMs).toBe(0)
  })

  it('recovery: stopping at the moment the app was last open leaves the unattended stretch out', () => {
    const a = start(ctx('inflation'), T0, 'A')
    const { session } = finish(a, env(T0 + 600 * MIN), T0 + 25 * MIN, 'recovered')
    expect(session).toMatchObject({ durationMs: 25 * MIN, source: 'recovered' })
  })

  it('continue here: the same session, a new owner, no time lost and none double-counted', () => {
    const a = switchContext(start(ctx('inflation'), T0, 'A'), ctx('taxation'), T0 + 10 * MIN)
    const b = takeOver(a, 'B', T0 + 30 * MIN, ctx('parliament', 'polity'))
    expect(b.sessionId).toBe(a.sessionId)
    expect(b.ownerDeviceId).toBe('B')
    expect(b.revision).toBe(a.revision + 1)
    expect(elapsed(b, T0 + 30 * MIN)).toBe(30 * MIN)
    const { session } = finish(b, env(T0 + 45 * MIN, 'B'))
    expect(session!.durationMs).toBe(45 * MIN)
    expect(session!.spans.map((s) => s.context.chapterTitle)).toEqual(['inflation', 'taxation', 'parliament'])
  })

  it('continue here resumes a paused timer without counting the pause', () => {
    const a = pause(start(ctx('inflation'), T0, 'A'), T0 + 10 * MIN)
    const b = takeOver(a, 'B', T0 + 60 * MIN)
    expect(b.state).toBe('running')
    expect(elapsed(b, T0 + 61 * MIN)).toBe(11 * MIN)
  })

  it('salvage: a different timer that must give way is kept whole', () => {
    const cloud = start(ctx('inflation'), T0, 'A')
    const local = start(ctx('taxation'), T0 + 5 * MIN, 'B', true)
    const s = salvage(local, cloud, env(T0 + 25 * MIN, 'B'))
    expect(s).toMatchObject({ id: local.sessionId, durationMs: 20 * MIN, source: 'recovered', createdDeviceId: 'B' })
  })

  it('salvage: two copies of one timer share their common spans; only the local extras are kept', () => {
    const base = switchContext(start(ctx('inflation'), T0, 'A'), ctx('taxation'), T0 + 10 * MIN)
    const cloud = takeOver(base, 'B', T0 + 20 * MIN) // B continued it
    const local = switchContext(base, ctx('parliament', 'polity'), T0 + 15 * MIN) // A, unaware, moved on
    const s = salvage(local, cloud, env(T0 + 30 * MIN, 'A'))
    expect(s!.id).toBe(`${base.sessionId}_A`)
    expect(s!.spans.map((x) => x.context.chapterTitle)).toEqual(['parliament'])
    expect(s!.durationMs).toBe(15 * MIN)
  })

  it('formats', () => {
    expect(clockText(((1 * 60 + 24) * 60 + 37) * 1000)).toBe('01:24:37')
    expect(shortClock((42 * 60 + 18) * 1000)).toBe('42:18')
    expect(shortClock(((1 * 60 + 24) * 60 + 37) * 1000)).toBe('1:24:37')
  })
})
