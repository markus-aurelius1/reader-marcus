// Analytics rules: everything is derived from StudySession rows. Sessions here are built with the
// real timer functions where pausing matters, so the figures are checked end to end.
import { describe, expect, it } from 'vitest'
import type { StudyContext, StudySession } from './contract'
import { buildIndex, compare, dateKey, dayNo, dayOf, dayStart, durationBins, heatmap, indexOf, period, series, studyAnalytics, summarize, totalBetween, windows } from './analytics'
import { finish, pause, resume, start, switchContext } from './timer'

const MIN = 60000
const H = 60 * MIN
const IST = 'Asia/Kolkata'
const NY = 'America/New_York'

const ctx = (chapterId: string, subjectId = 'polity', stage: 'prelims' | 'mains' = 'prelims', sectionId?: string): StudyContext => ({
  ref: { kind: sectionId ? 'section' : 'chapter', stage, subjectId, topicId: `${subjectId}-t1`, chapterId, ...(sectionId ? { sectionId } : {}), ...(stage === 'mains' ? { paperId: 'gs2' } : {}) },
  subjectTitle: subjectId,
  topicTitle: `${subjectId} topic`,
  chapterTitle: chapterId,
})
let n = 0
/** A completed session: spans given as [start ISO, minutes, context]. */
function ses(spans: [string, number, StudyContext?][], id = `s${++n}`, dev = 'A'): StudySession {
  const list = spans.map(([at, min, c], i) => ({ id: `${dev}-${id}-${i}`, context: c ?? ctx('parliament'), startedAt: new Date(at).toISOString(), endedAt: new Date(Date.parse(at) + min * MIN).toISOString(), durationMs: min * MIN }))
  return { id, startedAt: list[0].startedAt, endedAt: list[list.length - 1].endedAt, durationMs: list.reduce((a, s) => a + s.durationMs, 0), spans: list, source: 'timer', createdDeviceId: dev, timeZone: IST, createdAt: list[list.length - 1].endedAt }
}
const at = (iso: string) => Date.parse(iso)
const day = (iso: string) => dayNo(+iso.slice(0, 4), +iso.slice(5, 7), +iso.slice(8, 10))

describe('calendar days in a timezone', () => {
  it('a day starts at local midnight', () => {
    expect(new Date(dayStart(day('2026-10-03'), IST)).toISOString()).toBe('2026-10-02T18:30:00.000Z')
    expect(new Date(dayStart(day('2026-10-03'), 'UTC')).toISOString()).toBe('2026-10-03T00:00:00.000Z')
    expect(new Date(dayStart(day('2026-01-15'), NY)).toISOString()).toBe('2026-01-15T05:00:00.000Z')
    expect(new Date(dayStart(day('2026-07-15'), NY)).toISOString()).toBe('2026-07-15T04:00:00.000Z')
  })

  it('the same instant is a different calendar day in different zones', () => {
    const t = at('2026-10-02T20:00:00Z') // 01:30 on the 3rd in India, 16:00 on the 2nd in New York
    expect(dateKey(dayOf(t, IST))).toBe('2026-10-03')
    expect(dateKey(dayOf(t, NY))).toBe('2026-10-02')
  })

  it('DST days are 23 and 25 hours long', () => {
    expect(dayStart(day('2026-03-09'), NY) - dayStart(day('2026-03-08'), NY)).toBe(23 * H)
    expect(dayStart(day('2026-11-02'), NY) - dayStart(day('2026-11-01'), NY)).toBe(25 * H)
    expect(period('day', at('2026-03-08T15:00:00Z'), NY).buckets).toHaveLength(23)
    expect(period('day', at('2026-11-01T15:00:00Z'), NY).buckets).toHaveLength(25)
  })

  it('a zone whose clocks change at midnight still gets the first instant of the day', () => {
    // Santiago, 6 Sep 2026: 00:00 does not exist, the day begins at 01:00 local (04:00 UTC)
    const s = dayStart(day('2026-09-06'), 'America/Santiago')
    expect(dayOf(s, 'America/Santiago')).toBe(day('2026-09-06'))
    expect(dayOf(s - 1, 'America/Santiago')).toBe(day('2026-09-05'))
  })
})

describe('sessions → slices', () => {
  it('a session crossing local midnight is split between the two days', () => {
    // 23:30 → 00:45 IST
    const ix = buildIndex([ses([['2026-10-02T23:30:00+05:30', 75]])], IST)
    expect(ix.slices.map((s) => [dateKey(s.day), (s.to - s.from) / MIN])).toEqual([['2026-10-02', 30], ['2026-10-03', 45]])
    expect(heatmap(ix, day('2026-10-01'), day('2026-10-04')).map((d) => [d.date, d.durationMs / MIN, d.sessionCount])).toEqual([['2026-10-01', 0, 0], ['2026-10-02', 30, 1], ['2026-10-03', 45, 1], ['2026-10-04', 0, 0]])
    // one session, not two: it is counted where it ended, at its full length
    expect(summarize(ix, dayStart(day('2026-10-02'), IST), dayStart(day('2026-10-03'), IST))).toMatchObject({ totalMs: 30 * MIN, sessionCount: 0 })
    expect(summarize(ix, dayStart(day('2026-10-03'), IST), dayStart(day('2026-10-04'), IST))).toMatchObject({ totalMs: 45 * MIN, sessionCount: 1, longestSessionMs: 75 * MIN, activeDays: 1 })
  })

  it('the split depends on the timezone the figures are shown in', () => {
    const s = ses([['2026-10-02T23:30:00+05:30', 75]]) // 18:00 → 19:15 UTC, one day in UTC
    expect(buildIndex([s], 'UTC').slices).toHaveLength(1)
    expect(buildIndex([s], NY).slices.map((x) => dateKey(x.day))).toEqual(['2026-10-02'])
  })

  it('a session spanning several days fills each of them', () => {
    const ix = buildIndex([ses([['2026-10-01T22:00:00+05:30', 28 * 60]])], IST)
    expect(ix.slices.map((s) => (s.to - s.from) / H)).toEqual([2, 24, 2])
  })

  it('paused time is never part of any total', () => {
    const T0 = at('2026-10-03T10:00:00+05:30')
    let a = start(ctx('parliament'), T0, 'A')
    a = pause(a, T0 + 20 * MIN)
    a = resume(a, T0 + 80 * MIN) // an hour paused
    a = switchContext(a, ctx('inflation', 'economy'), T0 + 90 * MIN)
    const { session } = finish(a, { now: T0 + 100 * MIN, dev: 'A', tz: IST })
    const ix = buildIndex([session!], IST)
    const s = summarize(ix, T0 - H, T0 + 3 * H)
    expect(s.totalMs).toBe(40 * MIN)
    expect(s.longestSessionMs).toBe(40 * MIN)
    expect(totalBetween(ix, T0 + 20 * MIN, T0 + 80 * MIN)).toBe(0) // the pause itself
    expect(series(ix, period('day', T0, IST).buckets).map((b) => b.durationMs / MIN).slice(10, 12)).toEqual([20, 20])
    expect(s.bySubject.map((d) => [d.id, d.durationMs / MIN])).toEqual([['prelims/polity', 30], ['prelims/economy', 10]])
  })

  it('a pause across midnight leaves the paused stretch out of both days', () => {
    const T0 = at('2026-10-02T23:50:00+05:30')
    let a = pause(start(ctx('parliament'), T0, 'A'), T0 + 5 * MIN) // 23:55
    a = resume(a, T0 + 30 * MIN) // 00:20
    const { session } = finish(a, { now: T0 + 40 * MIN, dev: 'A', tz: IST })
    expect(heatmap(buildIndex([session!], IST), day('2026-10-02'), day('2026-10-03')).map((d) => d.durationMs / MIN)).toEqual([5, 10])
  })

  it('two devices running at once: the overlap counts once, for the span that began first', () => {
    const a = ses([['2026-10-03T10:00:00+05:30', 60, ctx('parliament')]], 'main', 'A')
    const b = ses([['2026-10-03T10:40:00+05:30', 60, ctx('inflation', 'economy')]], 'main_B', 'B')
    const ix = buildIndex([b, a], IST)
    const s = summarize(ix, at('2026-10-03T00:00:00+05:30'), at('2026-10-04T00:00:00+05:30'))
    expect(s.totalMs).toBe(100 * MIN)
    expect(s.bySubject.map((d) => [d.id, d.durationMs / MIN])).toEqual([['prelims/polity', 60], ['prelims/economy', 40]])
    expect(s.sessions.map((x) => [x.id, x.ms / MIN])).toEqual([['main', 60], ['main_B', 40]])
    // the same record seen twice adds nothing
    expect(buildIndex([a, { ...a, id: 'copy' }], IST).sessions).toHaveLength(1)
  })

  it('sessions are not modified', () => {
    const s = Object.freeze(ses([['2026-10-03T10:00:00+05:30', 60]]))
    const before = JSON.stringify(s)
    summarize(buildIndex([s], IST), 0, Date.now())
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe('periods', () => {
  const now = at('2026-10-03T15:00:00+05:30') // a Saturday

  it('day, week (Monday–Sunday), month and year in local time', () => {
    const iso = (k: 'day' | 'week' | 'month' | 'year', shift = 0) => {
      const p = period(k, now, IST, shift)
      return [new Date(p.from + 5.5 * H).toISOString().slice(0, 16), new Date(p.to + 5.5 * H).toISOString().slice(0, 16), p.buckets.length, p.label]
    }
    expect(iso('day')).toEqual(['2026-10-03T00:00', '2026-10-04T00:00', 24, 'Sat, 3 Oct 2026'])
    expect(iso('week')).toEqual(['2026-09-28T00:00', '2026-10-05T00:00', 7, '28 Sept – 4 Oct 2026'])
    expect(iso('month')).toEqual(['2026-10-01T00:00', '2026-11-01T00:00', 31, 'October 2026'])
    expect(iso('year')).toEqual(['2026-01-01T00:00', '2027-01-01T00:00', 12, '2026'])
    expect(iso('month', -8).slice(0, 3)).toEqual(['2026-02-01T00:00', '2026-03-01T00:00', 28])
    expect(iso('month', -10).slice(0, 3)).toEqual(['2025-12-01T00:00', '2026-01-01T00:00', 31])
    expect(iso('week', -1).slice(0, 2)).toEqual(['2026-09-21T00:00', '2026-09-28T00:00'])
  })

  it('a week that straddles a month and a year boundary', () => {
    const p = period('week', at('2027-01-01T09:00:00+05:30'), IST)
    expect(p.buckets.map((b) => b.key)).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
  })

  it('leap year: February has 29 days and the year 366', () => {
    expect(period('month', at('2028-02-10T09:00:00+05:30'), IST).buckets).toHaveLength(29)
    const y = period('year', at('2028-02-10T09:00:00+05:30'), IST)
    expect((y.to - y.from) / (24 * H)).toBe(366)
    expect(period('month', at('2027-02-10T09:00:00+05:30'), IST).buckets).toHaveLength(28)
  })

  it('late-evening study lands in the right month and year for the local calendar', () => {
    // 31 Dec 23:30 → 1 Jan 00:30 IST
    const ix = buildIndex([ses([['2026-12-31T23:30:00+05:30', 60]])], IST)
    const dec = period('month', at('2026-12-31T23:59:00+05:30'), IST)
    const jan = period('month', at('2027-01-01T00:40:00+05:30'), IST)
    expect([totalBetween(ix, dec.from, dec.to) / MIN, totalBetween(ix, jan.from, jan.to) / MIN]).toEqual([30, 30])
    expect(series(ix, period('year', at('2026-12-31T23:59:00+05:30'), IST).buckets)[11].durationMs).toBe(30 * MIN)
    expect(series(ix, period('year', at('2027-01-01T00:40:00+05:30'), IST).buckets)[0].durationMs).toBe(30 * MIN)
  })
})

describe('comparisons', () => {
  const local = (ms: number) => new Date(ms + 5.5 * H).toISOString().slice(0, 16)
  const win = (k: 'day' | 'week' | 'month' | 'year', now: string) => {
    const w = windows(k, at(now), IST)
    return [...w.current.map(local), ...w.comparison.map(local)]
  }

  it('today ↔ the whole of yesterday', () => {
    expect(win('day', '2026-10-03T15:00:00+05:30')).toEqual(['2026-10-03T00:00', '2026-10-03T15:00', '2026-10-02T00:00', '2026-10-03T00:00'])
  })

  it('week-to-date ↔ the same elapsed part of the previous week', () => {
    expect(win('week', '2026-10-03T15:00:00+05:30')).toEqual(['2026-09-28T00:00', '2026-10-03T15:00', '2026-09-21T00:00', '2026-09-26T15:00'])
    // on a Monday morning the comparison is last Monday morning, not last week
    expect(win('week', '2026-09-28T09:00:00+05:30')).toEqual(['2026-09-28T00:00', '2026-09-28T09:00', '2026-09-21T00:00', '2026-09-21T09:00'])
  })

  it('month-to-date ↔ the same elapsed part of the previous month', () => {
    expect(win('month', '2026-10-03T15:00:00+05:30')).toEqual(['2026-10-01T00:00', '2026-10-03T15:00', '2026-09-01T00:00', '2026-09-03T15:00'])
    // January compares with December of the year before
    expect(win('month', '2027-01-10T08:00:00+05:30')).toEqual(['2027-01-01T00:00', '2027-01-10T08:00', '2026-12-01T00:00', '2026-12-10T08:00'])
    // the 31st has no counterpart in a 30-day month; nor has 30 March in February
    expect(win('month', '2026-10-31T15:00:00+05:30').slice(2)).toEqual(['2026-09-01T00:00', '2026-10-01T00:00'])
    expect(win('month', '2026-03-30T10:00:00+05:30').slice(2)).toEqual(['2026-02-01T00:00', '2026-03-01T00:00'])
    expect(win('month', '2028-03-29T10:00:00+05:30').slice(2)).toEqual(['2028-02-01T00:00', '2028-02-29T10:00'])
  })

  it('year-to-date ↔ the same elapsed part of the previous year, including leap years', () => {
    expect(win('year', '2026-10-03T15:00:00+05:30')).toEqual(['2026-01-01T00:00', '2026-10-03T15:00', '2025-01-01T00:00', '2025-10-03T15:00'])
    // 29 February has no counterpart: the comparison runs to the end of 28 February
    expect(win('year', '2028-02-29T10:00:00+05:30').slice(2)).toEqual(['2027-01-01T00:00', '2027-03-01T00:00'])
    // after a leap day, the same date is compared (one more day has elapsed this year)
    expect(win('year', '2028-03-01T10:00:00+05:30').slice(2)).toEqual(['2027-01-01T00:00', '2027-03-01T10:00'])
    expect(win('year', '2029-03-01T10:00:00+05:30').slice(2)).toEqual(['2028-01-01T00:00', '2028-03-01T10:00'])
  })

  it('across a DST change the comparison uses elapsed time and never runs past its day', () => {
    // New York, Sunday 8 Mar 2026 (23-hour day), 23:30 local = 22½ hours into the day
    const spring = windows('week', at('2026-03-09T03:30:00Z'), NY)
    expect(new Date(spring.comparison[1]).toISOString()).toBe('2026-03-02T03:30:00.000Z')
    // Sunday 1 Nov 2026 (25-hour day), 23:30 local = 24½ hours in: the Sunday before ends at its midnight
    const autumn = windows('week', at('2026-11-02T04:30:00Z'), NY)
    expect(autumn.comparison[1]).toBe(dayStart(day('2026-10-26'), NY))
  })

  it('totals, change and percentage', () => {
    const ix = buildIndex([
      ses([['2026-10-03T09:00:00+05:30', 90]]), // today
      ses([['2026-10-02T09:00:00+05:30', 60]]), // yesterday
      ses([['2026-09-22T09:00:00+05:30', 30]]), // Tuesday last week
      ses([['2026-09-27T09:00:00+05:30', 500]]), // Sunday last week: after the equivalent point
    ], IST)
    const now = at('2026-10-03T15:00:00+05:30')
    expect(compare(ix, 'day', now)).toMatchObject({ currentMs: 90 * MIN, comparisonMs: 60 * MIN, changeAbsoluteMs: 30 * MIN, changePercent: 50 })
    expect(compare(ix, 'week', now)).toMatchObject({ currentMs: 150 * MIN, comparisonMs: 30 * MIN, changePercent: 400 })
    // a session still to come today is not in "so far"
    expect(compare(ix, 'day', at('2026-10-03T09:30:00+05:30')).currentMs).toBe(30 * MIN)
  })

  it('nothing to compare with: no percentage, never infinity', () => {
    const ix = buildIndex([ses([['2026-10-03T09:00:00+05:30', 90]])], IST)
    const c = compare(ix, 'day', at('2026-10-03T15:00:00+05:30'))
    expect(c).toMatchObject({ currentMs: 90 * MIN, comparisonMs: 0, changeAbsoluteMs: 90 * MIN })
    expect('changePercent' in c).toBe(false)
    const none = compare(buildIndex([], IST), 'year', at('2026-10-03T15:00:00+05:30'))
    expect(none).toMatchObject({ currentMs: 0, comparisonMs: 0, changeAbsoluteMs: 0 })
    expect(none.changePercent).toBeUndefined()
    // a few seconds is no basis for a percentage either
    const tiny = buildIndex([ses([['2026-10-03T09:00:00+05:30', 90]]), ses([['2026-10-02T09:00:00+05:30', 0.5]])], IST)
    expect(compare(tiny, 'day', at('2026-10-03T15:00:00+05:30')).changePercent).toBeUndefined()
    expect(JSON.stringify(studyAnalytics(ix, { period: 'today' }, at('2026-10-03T15:00:00+05:30')))).not.toMatch(/Infinity|NaN|null/)
  })

  it('a fall to zero is −100%', () => {
    const ix = buildIndex([ses([['2026-10-02T09:00:00+05:30', 60]])], IST)
    expect(compare(ix, 'day', at('2026-10-03T15:00:00+05:30'))).toMatchObject({ currentMs: 0, changePercent: -100 })
  })
})

describe('aggregation and filters', () => {
  const sessions = [
    ses([['2026-10-01T09:00:00+05:30', 30, ctx('parliament')], ['2026-10-01T09:30:00+05:30', 20, ctx('judiciary')], ['2026-10-01T09:50:00+05:30', 10, ctx('inflation', 'economy')]], 'a'),
    ses([['2026-10-02T09:00:00+05:30', 45, ctx('parliament', 'polity', 'prelims', 'budget')]], 'b'),
    ses([['2026-10-03T09:00:00+05:30', 15, ctx('federalism', 'gs2-polity', 'mains')]], 'c'),
  ]
  const ix = buildIndex(sessions, IST)
  const now = at('2026-10-03T15:00:00+05:30')
  const all = summarize(ix, 0, now)

  it('by stage, subject, topic and chapter; percentages add up', () => {
    expect(all.totalMs).toBe(120 * MIN)
    expect(all.byStage.map((d) => [d.id, d.durationMs / MIN, Math.round(d.percent * 10) / 10])).toEqual([['prelims', 105, 87.5], ['mains', 15, 12.5]])
    expect(all.bySubject.map((d) => [d.id, d.label, d.durationMs / MIN])).toEqual([['prelims/polity', 'polity', 95], ['mains/gs2-polity', 'gs2-polity', 15], ['prelims/economy', 'economy', 10]])
    expect(all.byTopic.map((d) => [d.id, d.durationMs / MIN])).toEqual([['prelims/polity~polity-t1', 95], ['mains/gs2-polity~gs2-polity-t1', 15], ['prelims/economy~economy-t1', 10]])
    // section-tracked time counts towards its chapter
    expect(all.byChapter.map((d) => [d.id, d.durationMs / MIN])).toEqual([['prelims/polity/parliament', 75], ['prelims/polity/judiciary', 20], ['mains/gs2-polity/federalism', 15], ['prelims/economy/inflation', 10]])
    for (const g of [all.byStage, all.bySubject, all.byTopic, all.byChapter]) expect(g.reduce((a, d) => a + d.percent, 0)).toBeCloseTo(100)
  })

  it('session figures', () => {
    expect(all).toMatchObject({ sessionCount: 3, averageSessionMs: 40 * MIN, longestSessionMs: 60 * MIN, activeDays: 3 })
    expect(durationBins(all.sessions).map((b) => b.count)).toEqual([0, 1, 1, 1, 0])
    expect(ix.sessions[0].contexts.map((c) => c.chapterTitle)).toEqual(['parliament', 'judiciary', 'inflation'])
  })

  it('all-time totals and last-studied moments by stage, subject, chapter and section', () => {
    expect(ix.total.get('prelims/polity')).toBe(95 * MIN)
    expect(ix.total.get('prelims/polity/parliament')).toBe(75 * MIN)
    expect(ix.total.get('prelims/polity/parliament/budget')).toBe(45 * MIN)
    expect(ix.total.get('mains')).toBe(15 * MIN)
    expect(ix.last.get('prelims/polity/parliament')).toBe(at('2026-10-02T09:45:00+05:30'))
    expect(ix.last.get('prelims/economy')).toBe(at('2026-10-01T10:00:00+05:30'))
    expect(ix.last.has('prelims/geography')).toBe(false)
  })

  it('filter by stage, subject, topic, chapter and paper', () => {
    const f = (scope: object) => summarize(ix, 0, now, scope)
    expect(f({ stage: 'mains' })).toMatchObject({ totalMs: 15 * MIN, sessionCount: 1, activeDays: 1 })
    expect(f({ paperId: 'gs2' }).totalMs).toBe(15 * MIN)
    expect(f({ subjectId: 'economy' })).toMatchObject({ totalMs: 10 * MIN, sessionCount: 1, longestSessionMs: 10 * MIN })
    expect(f({ stage: 'prelims', subjectId: 'polity' })).toMatchObject({ totalMs: 95 * MIN, sessionCount: 2, averageSessionMs: 47.5 * MIN, longestSessionMs: 50 * MIN })
    expect(f({ topicId: 'polity-t1' }).totalMs).toBe(95 * MIN)
    expect(f({ subjectId: 'polity', chapterId: 'judiciary' })).toMatchObject({ totalMs: 20 * MIN, sessionCount: 1 })
    expect(f({ subjectId: 'geography' })).toMatchObject({ totalMs: 0, sessionCount: 0, averageSessionMs: 0, longestSessionMs: 0, bySubject: [] })
    expect(heatmap(ix, day('2026-10-01'), day('2026-10-03'), { subjectId: 'polity' }).map((d) => d.durationMs / MIN)).toEqual([50, 45, 0])
    expect(compare(ix, 'day', now, { stage: 'mains' })).toMatchObject({ currentMs: 15 * MIN, comparisonMs: 0 })
  })

  it('StudyAnalytics (contract shape) for a period and for a custom window', () => {
    const week = studyAnalytics(ix, { period: 'week' }, now)
    expect(week).toMatchObject({ totalDurationMs: 120 * MIN, currentPeriodMs: 120 * MIN, comparisonPeriodMs: 0, sessionCount: 3, longestSessionMs: 60 * MIN })
    expect(week.dailySeries.map((b) => [b.key, b.durationMs / MIN])).toEqual([['2026-09-28', 0], ['2026-09-29', 0], ['2026-09-30', 0], ['2026-10-01', 60], ['2026-10-02', 45], ['2026-10-03', 15]])
    const custom = studyAnalytics(ix, { period: 'custom', startAt: '2026-10-01T09:15:00+05:30', endAt: '2026-10-02T09:15:00+05:30', subjectId: 'polity' }, now)
    expect(custom).toMatchObject({ totalDurationMs: 50 * MIN, comparisonPeriodMs: 15 * MIN })
    expect(custom.dailySeries.map((b) => b.durationMs / MIN)).toEqual([35, 15])
  })
})

describe('a long history', () => {
  // five years, ten sessions a day, two spans each: 18,250 sessions
  const sessions: Record<string, StudySession> = {}
  const base = at('2021-10-05T00:00:00+05:30')
  const subjects = ['polity', 'economy', 'history-culture', 'geography', 'environment']
  let expected = 0
  for (let d = 0; d < 1825; d++)
    for (let k = 0; k < 10; k++) {
      const t = new Date(base + d * 24 * H + k * 2 * H + 20 * MIN).toISOString()
      const t2 = new Date(Date.parse(t) + 40 * MIN).toISOString()
      const s = ses([[t, 30, ctx(`ch${(d + k) % 12}`, subjects[k % 5])], [t2, 25 + (k % 3) * 10, ctx(`ch${(d + k + 1) % 12}`, subjects[(k + 1) % 5])]], `big${d}-${k}`)
      sessions[s.id] = s
      expected += s.durationMs
    }
  const now = base + 1825 * 24 * H

  it('is indexed and queried quickly, and the total is exact', () => {
    const t0 = performance.now()
    const ix = indexOf(sessions, IST)
    const built = performance.now() - t0
    const t1 = performance.now()
    const all = summarize(ix, 0, now)
    for (const k of ['day', 'week', 'month', 'year'] as const) {
      compare(ix, k, now)
      series(ix, period(k, now, IST).buckets)
      summarize(ix, period(k, now, IST).from, now, { subjectId: 'economy' })
    }
    const cells = heatmap(ix, dayOf(now, IST) - 370, dayOf(now, IST))
    const queried = performance.now() - t1
    expect(all.totalMs).toBe(expected)
    expect(all.sessionCount).toBe(18250)
    expect(all.activeDays).toBe(1825)
    expect(all.bySubject).toHaveLength(5)
    expect(cells).toHaveLength(371)
    expect(cells[100].sessionCount).toBe(10)
    expect(ix.slices.length).toBeGreaterThanOrEqual(36500)
    expect(built).toBeLessThan(2000)
    expect(queried).toBeLessThan(1000)
    console.log(`  18,250 sessions: index ${built.toFixed(0)} ms, a full page of queries ${queried.toFixed(0)} ms`)
  })

  it('the index is cached until the sessions change, and is always regenerable', () => {
    const ix = indexOf(sessions, IST)
    expect(indexOf(sessions, IST)).toBe(ix)
    expect(indexOf({ ...sessions }, IST)).not.toBe(ix)
    expect(indexOf(sessions, 'UTC').tz).toBe('UTC')
    expect(summarize(buildIndex(Object.values(sessions), IST), 0, now).totalMs).toBe(expected)
  })
})
