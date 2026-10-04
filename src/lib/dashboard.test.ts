// The Home view model: derived from sessions + progress + queue + goal, nothing stored.
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { Chapter, Subject } from './content'
import type { ContentRef, StudyContext, StudyGoal, StudyQueueItem, StudySession } from './contract'
import { buildIndex, goalStreak, streak } from './analytics'
import { buildDashboard, HEATMAP_WEEKS, type DashboardInput } from './dashboard'
import type { Progress } from './store'

const MIN = 60000
const H = 60 * MIN
const IST = 'Asia/Kolkata'
// Saturday 3 October 2026, 18:00 in India
const NOW = Date.parse('2026-10-03T12:30:00Z')

const chapter = (subjectKey: string, id: string, sections: string[]): Chapter => ({
  id, key: `${subjectKey}/${id}`, subjectKey, topicId: 't1', topicTitle: 'Topic', title: id, taxonomy: [], related: [],
  sections: sections.map((s) => ({ id: s, key: `${subjectKey}/${id}/${s}`, title: s, html: '' })),
})
const subject = (stage: string, id: string, chapters: [string, string[]][]): Subject => ({
  id, stage, key: `${stage}/${id}`, title: id, topics: [{ id: 't1', title: 'Topic', chapters: chapters.map((c) => c[0]) }], pyq: null,
  chapters: chapters.map(([c, s]) => chapter(`${stage}/${id}`, c, s)),
})
const polity = subject('prelims', 'polity', [['parliament', ['a', 'b', 'c', 'd']], ['judiciary', ['a', 'b']]])
const economy = subject('prelims', 'economy', [['inflation', ['a', 'b']]])
const ethics = subject('mains', 'gs4-ethics', [['values', ['a', 'b']]])

const ctx = (chapterId: string, subjectId = 'polity', sectionId?: string): StudyContext => ({
  ref: { kind: sectionId ? 'section' : 'chapter', stage: 'prelims', subjectId, topicId: 't1', chapterId, ...(sectionId ? { sectionId } : {}) },
  subjectTitle: subjectId, chapterTitle: chapterId,
})
let n = 0
/** A completed session of `min` minutes starting at an India-time timestamp. */
function ses(at: string, min: number, c = ctx('parliament')): StudySession {
  const start = Date.parse(at + '+05:30')
  const span = { id: `sp${++n}`, context: c, startedAt: new Date(start).toISOString(), endedAt: new Date(start + min * MIN).toISOString(), durationMs: min * MIN }
  return { id: `s${n}`, startedAt: span.startedAt, endedAt: span.endedAt, durationMs: span.durationMs, spans: [span], source: 'timer', createdDeviceId: 'A', timeZone: IST, createdAt: span.endedAt }
}
const empty: Progress = { sections: {}, chapters: {} }
const input = (sessions: StudySession[], extra: Partial<DashboardInput> = {}): DashboardInput => ({
  ix: buildIndex(sessions, IST), now: NOW, subjects: [polity, economy], progress: empty, recents: [], queue: [], active: null, goal: null, ...extra,
})
const goal = (g: Partial<StudyGoal>): StudyGoal => ({ id: 'default', enabled: true, updatedAt: '2026-10-01T00:00:00.000Z', ...g })

describe('streaks', () => {
  const ix = (days: string[]) => buildIndex(days.map((d) => ses(`${d}T09:00:00`, 30)), IST)
  it('counts consecutive local days ending today', () => {
    expect(streak(ix(['2026-09-28', '2026-10-01', '2026-10-02', '2026-10-03']), NOW)).toEqual({ currentDays: 3, longestDays: 3, lastStudyDate: '2026-10-03' })
  })
  it('is still alive when today has no study yet but yesterday did', () => {
    expect(streak(ix(['2026-10-01', '2026-10-02']), NOW)).toMatchObject({ currentDays: 2, lastStudyDate: '2026-10-02' })
  })
  it('ends after a missed day; the longest run is remembered', () => {
    expect(streak(ix(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-01']), NOW)).toEqual({ currentDays: 0, longestDays: 4, lastStudyDate: '2026-10-01' })
  })
  it('no sessions: no streak and no date', () => {
    expect(streak(ix([]), NOW)).toEqual({ currentDays: 0, longestDays: 0 })
  })
  it('a session across midnight counts for both days', () => {
    expect(streak(buildIndex([ses('2026-10-02T23:30:00', 60)], IST), NOW)).toMatchObject({ currentDays: 2 })
  })
  it('two sessions on one day are one day', () => {
    expect(streak(buildIndex([ses('2026-10-03T07:00:00', 10), ses('2026-10-03T09:00:00', 10)], IST), NOW).currentDays).toBe(1)
  })
  it('goal streak: days that reached the target, today not held against it until it is over', () => {
    const days = buildIndex([ses('2026-09-30T09:00:00', 30), ses('2026-10-01T09:00:00', 130), ses('2026-10-02T09:00:00', 120), ses('2026-10-03T09:00:00', 20)], IST)
    expect(goalStreak(days, NOW, 2 * H)).toBe(2)
    expect(goalStreak(days, NOW, 20 * MIN)).toBe(4)
    expect(goalStreak(days, NOW, 5 * H)).toBe(0)
    expect(goalStreak(days, NOW, 0)).toBe(0)
  })
})

describe('dashboard view model', () => {
  it('no session history: zeros and empty lists, nothing made up', () => {
    const m = buildDashboard(input([]))
    expect(m).toMatchObject({ hasSessions: false, todayStudyMs: 0, yesterdayStudyMs: 0, weekStudyMs: 0, previousWeekEquivalentMs: 0, resume: null, streak: { currentDays: 0, longestDays: 0 }, goals: { dailyStreak: 0 }, queue: [], revisionRows: [] })
    expect(m.today.changePercent).toBeUndefined()
    expect(m.goals.daily).toBeUndefined()
    expect(m.heatmap.every((d) => d.durationMs === 0 && d.sessionCount === 0)).toBe(true)
    expect(m.weekSeries.map((b) => b.durationMs)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(m.subjectProgress.map((s) => [s.subjectId, s.studyTimeMs, s.lastStudiedAt, s.completionPercent])).toEqual([['polity', 0, undefined, 0], ['economy', 0, undefined, 0]])
    expect(m.activeSession).toBeUndefined()
    expect(m.mainsProgress).toBeUndefined()
  })

  it('today ↔ yesterday and week-to-date ↔ the same part of last week', () => {
    const m = buildDashboard(input([
      ses('2026-10-03T08:00:00', 50), // today (Saturday)
      ses('2026-10-02T09:00:00', 90), // yesterday
      ses('2026-09-28T09:00:00', 60), // Monday this week
      ses('2026-09-26T09:00:00', 45), // last Saturday morning: inside the comparison
      ses('2026-09-26T20:00:00', 30), // last Saturday evening: after "by now"
      ses('2026-09-27T09:00:00', 120), // last Sunday: after "by now"
    ]))
    expect([m.todayStudyMs, m.yesterdayStudyMs]).toEqual([50 * MIN, 90 * MIN])
    expect([m.weekStudyMs, m.previousWeekEquivalentMs]).toEqual([200 * MIN, 45 * MIN])
    expect(m.weekSeries.map((b) => b.durationMs / MIN)).toEqual([60, 0, 0, 0, 90, 50, 0])
    expect(m.weekSeries.map((b) => b.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('heatmap: whole weeks from a Monday to today', () => {
    const m = buildDashboard(input([ses('2026-10-01T09:00:00', 30), ses('2026-10-01T15:00:00', 30)]))
    expect(m.heatmap).toHaveLength((HEATMAP_WEEKS - 1) * 7 + 6) // …Monday → Saturday
    expect(m.heatmap[m.heatmap.length - 1].date).toBe('2026-10-03')
    expect(m.heatmap.find((d) => d.date === '2026-10-01')).toEqual({ date: '2026-10-01', durationMs: 60 * MIN, sessionCount: 2 })
  })

  it('progress per stage and subject comes from the reader state; Mains only when it has content', () => {
    const progress: Progress = {
      sections: { 'prelims/polity/parliament/a': { done: true }, 'prelims/polity/parliament/b': { done: true }, 'prelims/polity/judiciary/a': { done: true }, 'mains/gs4-ethics/values/a': { done: true } },
      chapters: { 'prelims/polity/parliament': { status: 'reading', at: 5, section: 'c' }, 'prelims/polity/judiciary': { status: 'revised', at: 9 }, 'prelims/economy/inflation': { status: 'mastered' } },
      last: { chapterKey: 'prelims/polity/parliament', at: 20 },
    }
    const m = buildDashboard(input([ses('2026-10-03T08:00:00', 40), ses('2026-10-01T08:00:00', 25, ctx('inflation', 'economy'))], { progress, subjects: [polity, economy, ethics] }))
    expect(m.prelimsProgress).toMatchObject({ totalUnits: 3, notStarted: 0, reading: 1, revised: 1, mastered: 1, completionPercent: 38 })
    expect(m.mainsProgress).toMatchObject({ totalUnits: 1, notStarted: 1, completionPercent: 50 })
    expect(m.stages.map((s) => [s.id, s.subjects])).toEqual([['prelims', 2], ['mains', 1]])
    const [p, e] = m.subjectProgress
    expect(p).toMatchObject({ key: 'prelims/polity', subjectTitle: 'polity', completionPercent: 50, sectionsDone: 3, sectionsTotal: 6, studyTimeMs: 40 * MIN, resumeChapterKey: 'prelims/polity/judiciary' })
    expect(p.lastStudiedAt).toBe(Date.parse('2026-10-03T08:40:00+05:30'))
    expect(e).toMatchObject({ studyTimeMs: 25 * MIN, mastered: 1 })
    expect(e.resumeChapterKey).toBeUndefined() // never opened
    expect(m.resume).toMatchObject({ done: 2, total: 4, status: 'reading' })
    expect([m.resume!.subject.id, m.resume!.chapter.id, m.resume!.section?.id]).toEqual(['polity', 'parliament', 'c'])
  })

  it('a last-opened chapter that is no longer in the library is not offered', () => {
    expect(buildDashboard(input([], { progress: { ...empty, last: { chapterKey: 'prelims/gone/x', at: 1 } } })).resume).toBeNull()
  })

  it('revision: ★ and ↻ sections, longest since studied first, never-timed ones at the top', () => {
    const progress: Progress = { chapters: {}, sections: { 'prelims/polity/parliament/b': { difficult: true }, 'prelims/polity/judiciary/a': { revise: true, difficult: true }, 'prelims/economy/inflation/a': { revise: true }, 'prelims/polity/parliament/a': { done: true } } }
    const m = buildDashboard(input([ses('2026-10-02T08:00:00', 30, ctx('parliament')), ses('2026-09-20T08:00:00', 30, ctx('judiciary', 'polity', 'a'))], { progress }))
    expect(m.revision).toMatchObject({ difficultCount: 2, reviseCount: 2 })
    expect(m.revision.targets).toHaveLength(3)
    expect(m.revision.targets[0]).toEqual({ kind: 'section', stage: 'prelims', subjectId: 'polity', topicId: 't1', chapterId: 'parliament', sectionId: 'b' })
    expect(m.revisionRows.map((r) => r.section.key)).toEqual(['prelims/economy/inflation/a', 'prelims/polity/judiciary/a', 'prelims/polity/parliament/b'])
    expect(m.revisionRows[0].lastStudiedAt).toBeUndefined()
  })

  it('goals: progress only when a goal is set; a weekly goal uses the week so far', () => {
    const sessions = [ses('2026-10-03T08:00:00', 90), ses('2026-10-02T08:00:00', 125), ses('2026-10-01T08:00:00', 120), ses('2026-09-30T08:00:00', 30)]
    expect(buildDashboard(input(sessions)).goals).toEqual({ daily: undefined, weekly: undefined, dailyStreak: 0 })
    const m = buildDashboard(input(sessions, { goal: goal({ dailyTargetMs: 2 * H, weeklyTargetMs: 5 * H }) }))
    expect(m.goals.daily).toEqual({ targetMs: 2 * H, doneMs: 90 * MIN, percent: 75, met: false })
    expect(m.goals.weekly).toEqual({ targetMs: 5 * H, doneMs: 365 * MIN, percent: 100, met: true })
    expect(m.goals.dailyStreak).toBe(2)
    expect(buildDashboard(input(sessions, { goal: goal({ weeklyTargetMs: 10 * H }) })).goals).toMatchObject({ daily: undefined, weekly: { percent: 61, met: false }, dailyStreak: 0 })
    expect(buildDashboard(input(sessions, { goal: goal({ enabled: false, dailyTargetMs: 2 * H }) })).goals.daily).toBeUndefined()
  })

  it('queue: waiting items in the order given, completed ones newest first; the active timer is passed through', () => {
    const item = (id: string, order: number, completedAt?: string): StudyQueueItem => ({ id, target: ctx(id).ref as ContentRef, title: id, reason: 'manual', order, createdAt: '2026-10-01T00:00:00.000Z', ...(completedAt ? { completedAt } : {}) })
    const queue = [item('a', 1), item('b', 2, '2026-10-02T00:00:00.000Z'), item('c', 3), item('d', 4, '2026-10-03T00:00:00.000Z')]
    const active = { sessionId: 'x', state: 'running' as const, startedAt: new Date(NOW - 5 * MIN).toISOString(), currentContext: ctx('parliament'), currentSpanStartedAt: new Date(NOW - 5 * MIN).toISOString(), accumulatedMs: 0, completedSpans: [], ownerDeviceId: 'A', updatedAt: new Date(NOW).toISOString(), revision: 1 }
    const m = buildDashboard(input([], { queue, active }))
    expect(m.queue).toBe(queue)
    expect(m.queueOpen.map((q) => q.id)).toEqual(['a', 'c'])
    expect(m.queueDone.map((q) => q.id)).toEqual(['d', 'b'])
    expect(m.activeSession).toBe(active)
    expect(m.todayStudyMs).toBe(0) // a running timer is not study time until it is stopped
  })

  it('large history: ten years of sessions give the same figures as a direct sum, quickly', () => {
    const sessions: StudySession[] = []
    const day0 = Date.parse('2026-10-03T09:00:00+05:30')
    for (let d = 0; d < 3650; d++) for (let k = 0; k < 5; k++) sessions.push(ses(new Date(day0 - d * 86400000 + k * 2 * H + 19800000).toISOString().slice(0, 19), 45, k % 2 ? ctx('inflation', 'economy') : ctx('parliament')))
    const ix = buildIndex(sessions, IST)
    const t0 = performance.now()
    const m = buildDashboard({ ...input([]), ix, goal: goal({ dailyTargetMs: 3 * H }) })
    const took = performance.now() - t0
    expect(m.hasSessions).toBe(true)
    expect(m.todayStudyMs).toBe(5 * 45 * MIN)
    expect(m.weekStudyMs).toBe(6 * 5 * 45 * MIN)
    expect(m.streak).toMatchObject({ currentDays: 3650, longestDays: 3650, lastStudyDate: '2026-10-03' })
    expect(m.goals.dailyStreak).toBe(3650)
    expect(m.subjectProgress.reduce((a, s) => a + s.studyTimeMs, 0)).toBe(sessions.reduce((a, s) => a + s.durationMs, 0))
    expect(took).toBeLessThan(500)
  })
})
