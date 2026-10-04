// Current Affairs rules: day state, the two-device merge, tracking, consistency, streaks, the
// calendar, the archive, the Home card — and how reading the news shows in the time analytics.
// Everything is derived; nothing here is a stored figure.
import { describe, expect, it } from 'vitest'
import type { ContentRef, CurrentAffairsDay, StudyContext, StudySession } from './contract'
import { activityTime, buildIndex, compare, heatmap, period, series, streak, summarize, totalBetween } from './analytics'
import {
  REMINDER_HOUR, buildModel, caActivity, caArchive, caCalendar, caContext, caStats, caStreak, caTime, cleanTags, cleanUrl, dayIdOf, dayInfo, firstDay, homeCard, isDayId, mergeDay, missedDays,
  notesLinking, parseDateQuery, parseDayId, settled, stateOf, statusOf, uniqueRefs, type EntryLike,
} from './currentAffairsModel'
import { finish, pause, resume, start, switchContext } from './timer'

const MIN = 60000
const IST = 'Asia/Kolkata'
/** An instant given as a date and a time of day in India. */
const at = (date: string, time = '10:00') => Date.parse(`${date}T${time}:00+05:30`)
const iso = (date: string, time?: string) => new Date(at(date, time)).toISOString()
const D = parseDayId

/** A day record made on its own day at 08:00, then changed as given. */
const day = (id: string, patch: Partial<CurrentAffairsDay> = {}, today?: number): CurrentAffairsDay =>
  settled({ id, date: id, timeZone: IST, status: 'pending', createdAt: iso(id, '08:00'), updatedAt: iso(id, '08:00'), ...patch }, today)
const rows = (...list: CurrentAffairsDay[]) => Object.fromEntries(list.map((d) => [d.id, d]))
const note = (id: string, dayId: string, patch: Partial<EntryLike> = {}): EntryLike => ({ id, dayId, title: `Note ${id}`, noteDocumentId: `ca/${id}`, linkedContentRefs: [], createdAt: iso(dayId, '09:00'), updatedAt: iso(dayId, '09:00'), ...patch })
const notes = (...list: EntryLike[]) => Object.fromEntries(list.map((e) => [e.id, e]))

describe('the status of a day', () => {
  it('pending on its own day, missed once the day has passed', () => {
    const d = day('2026-10-04')
    expect(statusOf(d, D('2026-10-04'))).toBe('pending')
    expect(statusOf(d, D('2026-10-05'))).toBe('missed')
    expect(statusOf(d, D('2026-11-20'))).toBe('missed')
  })

  it('completed when marked on the day itself — right up to local midnight', () => {
    expect(day('2026-10-04', { completedAt: iso('2026-10-04', '09:15') }).status).toBe('completed')
    expect(day('2026-10-04', { completedAt: iso('2026-10-04', '23:59') }).status).toBe('completed')
  })

  it('caught up when marked on a later calendar day: the date stays, the real moment is kept', () => {
    const d = day('2026-10-03', { completedAt: iso('2026-10-04', '08:30') }, D('2026-10-04'))
    expect(d).toMatchObject({ id: '2026-10-03', date: '2026-10-03', status: 'caught-up', completedAt: iso('2026-10-04', '08:30'), caughtUpAt: iso('2026-10-04', '08:30') })
    // ten minutes past midnight is already the next day
    expect(day('2026-10-03', { completedAt: iso('2026-10-04', '00:10') }).status).toBe('caught-up')
    // an on-time day carries no caught-up date
    expect(day('2026-10-03', { completedAt: iso('2026-10-03', '21:00') }).caughtUpAt).toBeUndefined()
  })

  it('the calendar is the study timezone: the same instant is on the day in one zone and after it in another', () => {
    const done = '2026-10-04T19:00:00.000Z' // 00:30 on the 5th in India, 19:00 on the 4th in UTC
    expect(statusOf({ date: '2026-10-04', timeZone: IST, status: 'pending', completedAt: done })).toBe('caught-up')
    expect(statusOf({ date: '2026-10-04', timeZone: 'UTC', status: 'pending', completedAt: done })).toBe('completed')
  })

  it('excused is its own state, and a completion overrides it', () => {
    expect(day('2026-10-03', { excusedAt: iso('2026-10-04') }, D('2026-10-06')).status).toBe('excused')
    expect(day('2026-10-03', { excusedAt: iso('2026-10-04'), completedAt: iso('2026-10-05') }).status).toBe('caught-up')
  })

  it('Undo reopens the day: what was marked before it no longer counts', () => {
    const undone = day('2026-10-04', { completedAt: iso('2026-10-04', '09:00'), reopenedAt: iso('2026-10-04', '09:05') }, D('2026-10-04'))
    expect(undone.status).toBe('pending')
    expect(undone.completedAt).toBeUndefined()
    expect(statusOf(undone, D('2026-10-05'))).toBe('missed')
    // completed again after the undo
    expect(day('2026-10-04', { reopenedAt: iso('2026-10-04', '09:05'), completedAt: iso('2026-10-04', '20:00') }).status).toBe('completed')
  })

  it('without a calendar to compare with, a day already found missed stays missed', () => {
    expect(statusOf({ date: '2026-10-01', timeZone: IST, status: 'missed' })).toBe('missed')
    expect(statusOf({ date: '2026-10-01', timeZone: IST, status: 'pending' })).toBe('pending')
  })
})

describe('one day changed on two devices', () => {
  const both = (a: CurrentAffairsDay, b: CurrentAffairsDay) => {
    const m = mergeDay(a, b)
    expect(mergeDay(b, a)).toEqual(m) // the order of syncing does not matter
    expect(mergeDay(m, a)).toEqual(m) // and merging again changes nothing
    expect(mergeDay(m, b)).toEqual(m)
    return m
  }

  it('a day completed on time on one device and caught up offline on another stays completed', () => {
    const a = day('2026-10-03', { completedAt: iso('2026-10-03', '20:00'), updatedAt: iso('2026-10-03', '20:00') })
    const b = day('2026-10-03', { completedAt: iso('2026-10-04', '09:00'), updatedAt: iso('2026-10-04', '09:00') })
    expect(b.status).toBe('caught-up')
    const m = both(a, b)
    expect(m).toMatchObject({ status: 'completed', completedAt: iso('2026-10-03', '20:00'), updatedAt: iso('2026-10-04', '09:00') })
    expect(m.caughtUpAt).toBeUndefined()
  })

  it('a stale device that found the day missed does not undo the other device\'s completion', () => {
    const done = day('2026-10-03', { completedAt: iso('2026-10-03', '20:00'), updatedAt: iso('2026-10-03', '20:00') })
    const stale = day('2026-10-03', { firstStartedAt: iso('2026-10-03', '07:30'), updatedAt: iso('2026-10-05', '08:00') }, D('2026-10-05'))
    expect(stale.status).toBe('missed')
    expect(both(done, stale)).toMatchObject({ status: 'completed', firstStartedAt: iso('2026-10-03', '07:30') })
  })

  it('an Undo made after the completion wins over an older copy that still says completed', () => {
    const done = day('2026-10-04', { completedAt: iso('2026-10-04', '09:00'), updatedAt: iso('2026-10-04', '09:00') })
    const undone = day('2026-10-04', { reopenedAt: iso('2026-10-04', '09:05'), updatedAt: iso('2026-10-04', '09:05') })
    const m = both(done, undone)
    expect(m.status).toBe('pending')
    expect(m.completedAt).toBeUndefined()
  })

  it('excused on one device, completed on the other: completed', () => {
    const m = both(day('2026-10-02', { excusedAt: iso('2026-10-03', '10:00') }), day('2026-10-02', { completedAt: iso('2026-10-04', '10:00') }))
    expect(m).toMatchObject({ status: 'caught-up', excusedAt: iso('2026-10-03', '10:00') })
  })

  it('the earliest start and creation stand; a missed day stays missed; no duplicate is made', () => {
    const a = day('2026-10-01', { firstStartedAt: iso('2026-10-01', '07:00'), createdAt: iso('2026-10-01', '07:00'), updatedAt: iso('2026-10-01', '07:00') })
    const b = settled({ ...day('2026-10-01', { firstStartedAt: iso('2026-10-01', '09:00'), createdAt: iso('2026-10-01', '09:00'), updatedAt: iso('2026-10-02', '06:00') }), status: 'missed' })
    const m = both(a, b)
    expect(m).toMatchObject({ id: '2026-10-01', status: 'missed', firstStartedAt: iso('2026-10-01', '07:00'), createdAt: iso('2026-10-01', '07:00'), updatedAt: iso('2026-10-02', '06:00') })
  })
})

describe('days without a record', () => {
  it('nothing is pre-created: with no record there is no tracking, only today, which is pending', () => {
    const m = buildModel({ days: {}, entries: {}, today: D('2026-10-04') })
    expect(m.start).toBeNull()
    expect(stateOf(m, D('2026-10-04'))).toBe('pending')
    expect(stateOf(m, D('2026-10-03'))).toBe('none')
    expect(stateOf(m, D('2026-10-05'))).toBe('future')
    expect(missedDays(m)).toEqual([])
    expect(caStreak(m)).toEqual({ currentDays: 0, longestDays: 0 })
    expect(firstDay(m)).toBeNull()
  })

  it('opening the app after several days away: every day since tracking began is missed, without one record being made', () => {
    const days = rows(day('2026-10-01', { completedAt: iso('2026-10-01', '09:00') }))
    const m = buildModel({ days, entries: {}, today: D('2026-10-06') })
    expect(m.start).toBe(D('2026-10-01'))
    expect([2, 3, 4, 5].map((n) => stateOf(m, D(`2026-10-0${n}`)))).toEqual(['missed', 'missed', 'missed', 'missed'])
    expect(stateOf(m, D('2026-10-06'))).toBe('pending')
    expect(stateOf(m, D('2026-09-30'))).toBe('none') // before tracking began
    expect(missedDays(m).map(dayIdOf)).toEqual(['2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02'])
    expect(missedDays(m, D('2026-10-04')).map(dayIdOf)).toEqual(['2026-10-05', '2026-10-04'])
    expect(Object.keys(days)).toEqual(['2026-10-01'])
  })

  it('a record for an earlier date does not move the start of tracking back', () => {
    // on the 5th the learner caught up the news of 20 September
    const m = buildModel({ days: rows(day('2026-09-20', { createdAt: iso('2026-10-05'), completedAt: iso('2026-10-05') })), entries: {}, today: D('2026-10-06') })
    expect(m.start).toBe(D('2026-10-05'))
    expect(stateOf(m, D('2026-09-20'))).toBe('caught-up')
    expect(stateOf(m, D('2026-09-25'))).toBe('none')
    expect(stateOf(m, D('2026-10-05'))).toBe('missed')
  })

  it('a note needs no day record, and does not start tracking', () => {
    const m = buildModel({ days: {}, entries: notes(note('a', '2026-10-02'), note('b', '2026-10-02'), note('gone', '2026-10-02', { removed: true })), today: D('2026-10-04') })
    const d = dayInfo(m, D('2026-10-02'))
    expect(d.state).toBe('none')
    expect(d.notes.map((e) => e.id)).toEqual(['a', 'b'])
    expect(firstDay(m)).toBe(D('2026-10-02'))
  })
})

describe('period figures', () => {
  // 1 completed · 2 missed (no record) · 3 caught up · 4 excused · 5 completed · 6 missed (started, never completed) · 7 today
  const days = rows(
    day('2026-10-01', { completedAt: iso('2026-10-01', '21:00') }),
    day('2026-10-03', { completedAt: iso('2026-10-05', '07:00') }),
    day('2026-10-04', { excusedAt: iso('2026-10-04', '08:00') }),
    day('2026-10-05', { completedAt: iso('2026-10-05', '22:00') }),
    day('2026-10-06', { firstStartedAt: iso('2026-10-06', '07:10') }),
  )
  const m = buildModel({ days, entries: notes(note('a', '2026-10-01'), note('b', '2026-10-05'), note('c', '2026-10-05'), note('old', '2026-09-01')), today: D('2026-10-07') })

  it('counts each state once; excused days are never counted as completed', () => {
    const s = caStats(m, D('2026-10-01'), D('2026-10-07'))
    expect(s).toMatchObject({ elapsed: 7, completed: 2, caughtUp: 1, missed: 2, excused: 1, pending: 1, eligible: 5, notes: 3 })
    expect(s.days.map((d) => d.state)).toEqual(['completed', 'missed', 'caught-up', 'excused', 'completed', 'missed', 'pending'])
  })

  it('consistency = (completed + caught up) ÷ (completed + caught up + missed); on-time is shown beside it', () => {
    const s = caStats(m, D('2026-10-01'), D('2026-10-07'))
    expect(s.consistency).toBeCloseTo(3 / 5)
    expect(s.onTime).toBeCloseTo(2 / 5)
    // the excused day is in neither the numerator nor the denominator
    expect(s.consistency).not.toBeCloseTo(4 / 6)
    expect(s.consistency).not.toBeCloseTo(3 / 6)
  })

  it('a period never runs past today, and with nothing to count there is no percentage', () => {
    const s = caStats(m, D('2026-10-07'), D('2026-10-31'))
    expect(s).toMatchObject({ elapsed: 1, pending: 1, eligible: 0, to: D('2026-10-07') })
    expect(s.consistency).toBeUndefined()
    expect(s.onTime).toBeUndefined()
    const before = caStats(m, D('2026-09-01'), D('2026-09-30')) // before tracking began
    expect(before).toMatchObject({ elapsed: 30, eligible: 0, notes: 1 })
    expect(before.consistency).toBeUndefined()
  })

  it('today counts as soon as it is completed', () => {
    const done = buildModel({ days: { ...days, ...rows(day('2026-10-07', { completedAt: iso('2026-10-07', '08:00') })) }, entries: {}, today: D('2026-10-07') })
    const s = caStats(done, D('2026-10-01'), D('2026-10-07'))
    expect(s).toMatchObject({ completed: 3, pending: 0, eligible: 6 })
    expect(s.consistency).toBeCloseTo(4 / 6)
  })
})

describe('streak', () => {
  const model = (today: string, ...list: CurrentAffairsDay[]) => buildModel({ days: rows(...list), entries: {}, today: D(today) })
  const done = (id: string) => day(id, { completedAt: iso(id, '20:00') })

  it('covered days in a row, ending today or — while today is open — yesterday', () => {
    expect(caStreak(model('2026-10-04', done('2026-10-01'), done('2026-10-02'), done('2026-10-03')))).toEqual({ currentDays: 3, longestDays: 3 })
    expect(caStreak(model('2026-10-04', done('2026-10-01'), done('2026-10-02'), done('2026-10-03'), done('2026-10-04')))).toEqual({ currentDays: 4, longestDays: 4 })
  })

  it('a caught-up day counts; an excused day is passed over, neither counting nor breaking', () => {
    const m = model('2026-10-05', done('2026-10-01'), day('2026-10-02', { excusedAt: iso('2026-10-02') }), day('2026-10-03', { completedAt: iso('2026-10-04', '07:00') }), done('2026-10-04'))
    expect(caStreak(m)).toEqual({ currentDays: 3, longestDays: 3 })
  })

  it('a missed day ends the run; the longest run is remembered only by being derived again', () => {
    const m = model('2026-10-07', done('2026-10-01'), done('2026-10-02'), done('2026-10-03'), done('2026-10-05'), done('2026-10-06'))
    expect(caStreak(m)).toEqual({ currentDays: 2, longestDays: 3 })
    const lapsed = model('2026-10-09', done('2026-10-01'), done('2026-10-02'))
    expect(caStreak(lapsed)).toEqual({ currentDays: 0, longestDays: 2 })
  })
})

describe('calendar and archive', () => {
  const days = rows(
    day('2026-10-01', { completedAt: iso('2026-10-01', '21:00') }),
    day('2026-10-03', { completedAt: iso('2026-10-04', '07:00') }),
    day('2026-10-04', { excusedAt: iso('2026-10-04', '08:00') }),
  )
  const readMs = new Map([['2026-10-01', 46 * MIN], ['2026-10-03', 38 * MIN], ['2026-09-28', 12 * MIN]])
  const m = buildModel({ days, entries: notes(note('a', '2026-10-01'), note('b', '2026-10-03'), note('c', '2026-10-03')), today: D('2026-10-05'), readMs })

  it('a Monday-to-Sunday month grid with each day\'s state, reading time and notes', () => {
    const cells = caCalendar(m, 2026, 10)
    expect(cells).toHaveLength(35)
    expect([cells[0].id, cells[34].id]).toEqual(['2026-09-28', '2026-11-01'])
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31)
    const by = Object.fromEntries(cells.map((c) => [c.id, c]))
    expect(by['2026-10-01']).toMatchObject({ state: 'completed', readMs: 46 * MIN, completedAt: iso('2026-10-01', '21:00') })
    expect(by['2026-10-02']).toMatchObject({ state: 'missed', readMs: 0 })
    expect(by['2026-10-03']).toMatchObject({ state: 'caught-up', readMs: 38 * MIN, completedAt: iso('2026-10-04', '07:00') })
    expect(by['2026-10-03'].notes).toHaveLength(2)
    expect(by['2026-10-04'].state).toBe('excused')
    expect(by['2026-10-05'].state).toBe('pending')
    expect(by['2026-10-06'].state).toBe('future')
    expect(by['2026-09-30'].state).toBe('none')
  })

  it('the archive lists a month newest first: only days with something to show, never a future day', () => {
    expect(caArchive(m, 2026, 10).map((d) => `${d.id} ${d.state} ${Math.round(d.readMs / MIN)}m ${d.notes.length}`)).toEqual([
      '2026-10-05 pending 0m 0',
      '2026-10-04 excused 0m 0',
      '2026-10-03 caught-up 38m 2',
      '2026-10-02 missed 0m 0',
      '2026-10-01 completed 46m 1',
    ])
    // September: reading time on an untracked day is still shown; empty days are not listed
    expect(caArchive(m, 2026, 9).map((d) => `${d.id} ${d.state} ${Math.round(d.readMs / MIN)}m`)).toEqual(['2026-09-28 none 12m'])
    expect(caArchive(m, 2026, 11)).toEqual([])
    expect(firstDay(m)).toBe(D('2026-09-28'))
  })

  it('no reading time is stored on a day: it comes in from the study sessions', () => {
    for (const d of Object.values(days)) expect(Object.keys(d).some((k) => /ms|duration|minutes|time$/i.test(k) && k !== 'timeZone')).toBe(false)
  })
})

describe('Home card', () => {
  const none = buildModel({ days: {}, entries: {}, today: D('2026-10-04') })

  it('before 07:00 there is no reminder; from 07:00 today\'s news is waiting', () => {
    expect(REMINDER_HOUR).toBe(7)
    expect(homeCard({ m: none, now: at('2026-10-04', '06:59'), tz: IST }).state).toBe('hidden')
    expect(homeCard({ m: none, now: at('2026-10-04', '00:05'), tz: IST }).state).toBe('hidden')
    expect(homeCard({ m: none, now: at('2026-10-04', '07:00'), tz: IST })).toMatchObject({ state: 'due', todayId: '2026-10-04', readMs: 0, notes: 0, missed: 0 })
    expect(homeCard({ m: none, now: at('2026-10-04', '22:30'), tz: IST }).state).toBe('due')
  })

  it('the hour is the study timezone\'s, not the device\'s', () => {
    const now = at('2026-10-04', '07:10') // 01:40 UTC
    expect(homeCard({ m: none, now, tz: IST }).state).toBe('due')
    expect(homeCard({ m: buildModel({ days: {}, entries: {}, today: D('2026-10-04') }), now, tz: 'UTC' }).state).toBe('hidden')
  })

  it('reading started before 07:00 shows the card early; a note written early does too', () => {
    const started = buildModel({ days: rows(day('2026-10-04', { firstStartedAt: iso('2026-10-04', '05:30'), createdAt: iso('2026-10-04', '05:30') })), entries: {}, today: D('2026-10-04'), readMs: new Map([['2026-10-04', 20 * MIN]]) })
    expect(homeCard({ m: started, now: at('2026-10-04', '06:10'), tz: IST })).toMatchObject({ state: 'due', readMs: 20 * MIN })
    const noted = buildModel({ days: {}, entries: notes(note('a', '2026-10-04')), today: D('2026-10-04') })
    expect(homeCard({ m: noted, now: at('2026-10-04', '06:10'), tz: IST })).toMatchObject({ state: 'due', notes: 1 })
  })

  it('reading now: active at any hour, with the day being read', () => {
    const c = homeCard({ m: none, now: at('2026-10-04', '05:00'), tz: IST, reading: { dayId: '2026-10-04', ms: 24 * MIN, paused: false, remote: false } })
    expect(c).toMatchObject({ state: 'active', activeId: '2026-10-04', activeMs: 24 * MIN, paused: false })
  })

  it('complete: a small success state with the time and the notes', () => {
    const m = buildModel({ days: rows(day('2026-10-04', { completedAt: iso('2026-10-04', '09:00') })), entries: notes(note('a', '2026-10-04'), note('b', '2026-10-04')), today: D('2026-10-04'), readMs: new Map([['2026-10-04', 43 * MIN]]) })
    expect(homeCard({ m, now: at('2026-10-04', '09:30'), tz: IST })).toMatchObject({ state: 'complete', readMs: 43 * MIN, notes: 2, missed: 0 })
  })

  it('a missed previous day is mentioned, with the most recent one to catch up; an old backlog is not', () => {
    const m = buildModel({ days: rows(day('2026-09-20', { completedAt: iso('2026-09-20', '09:00') }), day('2026-10-02', { completedAt: iso('2026-10-02', '09:00') })), entries: {}, today: D('2026-10-04') })
    // 21 Sept – 1 Oct and 3 Oct were missed; only the six of them in the last seven days are mentioned
    const c = homeCard({ m, now: at('2026-10-04', '08:00'), tz: IST })
    expect(c).toMatchObject({ state: 'due', missedId: '2026-10-03' })
    expect(c.missed).toBe(6)
    expect(missedDays(m)).toHaveLength(12)
    // completing today keeps the quiet mention
    const done = buildModel({ days: { ...m.rows, ...rows(day('2026-10-04', { completedAt: iso('2026-10-04', '08:10') })) }, entries: {}, today: D('2026-10-04') })
    expect(homeCard({ m: done, now: at('2026-10-04', '08:15'), tz: IST })).toMatchObject({ state: 'complete', missedId: '2026-10-03' })
  })

  it('an excused today is one quiet line, never a reminder', () => {
    const m = buildModel({ days: rows(day('2026-10-04', { excusedAt: iso('2026-10-04', '06:00') })), entries: {}, today: D('2026-10-04') })
    expect(homeCard({ m, now: at('2026-10-04', '12:00'), tz: IST }).state).toBe('excused')
  })
})

describe('notes: links, tags, sources, dates', () => {
  const sec: ContentRef = { kind: 'section', stage: 'prelims', subjectId: 'polity', chapterId: 'parliament', sectionId: 'budget' }
  const chap: ContentRef = { kind: 'chapter', stage: 'prelims', subjectId: 'economy', chapterId: 'inflation' }
  const pyq: ContentRef = { kind: 'pyq', stage: 'prelims', pyqId: 'UPSC-CSE-2019-GS1-Q045' }

  it('backlinks are derived from the notes: which notes link to a place, newest first, deleted ones left out', () => {
    const all = notes(
      note('a', '2026-10-01', { linkedContentRefs: [sec] }),
      note('b', '2026-10-03', { linkedContentRefs: [chap, sec] }),
      note('c', '2026-10-03', { linkedContentRefs: [pyq] }),
      note('d', '2026-10-04', { linkedContentRefs: [sec], removed: true }),
    )
    expect(notesLinking(all, ['prelims/polity/parliament/budget']).map((e) => e.id)).toEqual(['b', 'a'])
    expect(notesLinking(all, ['prelims/economy/inflation', 'pyq:UPSC-CSE-2019-GS1-Q045']).map((e) => e.id)).toEqual(['c', 'b'])
    expect(notesLinking(all, ['prelims/polity/parliament'])).toEqual([]) // a link to a section is not a link to its chapter
  })

  it('the same place linked twice is one link', () => {
    expect(uniqueRefs([sec, chap, { ...sec, topicId: 'x' }, pyq, pyq])).toEqual([sec, chap, pyq])
  })

  it('tags are trimmed, de-duplicated without regard to case, and capped', () => {
    expect(cleanTags('Economy, #RBI,  rbi ,, monetary   policy')).toEqual(['Economy', 'RBI', 'monetary policy'])
    expect(cleanTags(['a', 'A', ' b '])).toEqual(['a', 'b'])
    expect(cleanTags(undefined)).toEqual([])
    expect(cleanTags(Array.from({ length: 30 }, (_, i) => `t${i}`))).toHaveLength(12)
  })

  it('a source link is optional and only ever a web address', () => {
    expect(cleanUrl('')).toBeUndefined()
    expect(cleanUrl('  https://www.thehindu.com/news/a?b=1  ')).toBe('https://www.thehindu.com/news/a?b=1')
    expect(cleanUrl('pib.gov.in/release')).toBe('https://pib.gov.in/release')
    expect(cleanUrl('javascript:alert(1)')).toBeUndefined()
    expect(cleanUrl('data:text/html,x')).toBeUndefined()
    expect(cleanUrl('not a link')).toBeUndefined()
  })

  it('dates typed into search: ISO, day and month in either order, today and yesterday', () => {
    const today = D('2026-10-04')
    expect(parseDateQuery('2026-10-03', today)).toBe(D('2026-10-03'))
    expect(parseDateQuery('3 oct', today)).toBe(D('2026-10-03'))
    expect(parseDateQuery('Oct 3', today)).toBe(D('2026-10-03'))
    expect(parseDateQuery('3rd October 2026', today)).toBe(D('2026-10-03'))
    expect(parseDateQuery('today', today)).toBe(today)
    expect(parseDateQuery('yesterday', today)).toBe(today - 1)
    // without a year: the most recent such date, never one still to come
    expect(parseDateQuery('25 dec', today)).toBe(D('2025-12-25'))
    expect(parseDateQuery('31 feb', today)).toBeNull()
    expect(parseDateQuery('money bill', today)).toBeNull()
    expect(parseDateQuery('2019 q45', today)).toBeNull()
    expect(isDayId('2026-02-30')).toBe(false)
    expect(isDayId('2026-10-04')).toBe(true)
  })
})

// ---- reading the news in the time analytics -----------------------------------------------------
const lib = (chapterId: string, subjectId = 'polity'): StudyContext => ({ ref: { kind: 'chapter', stage: 'prelims', subjectId, topicId: `${subjectId}-t1`, chapterId }, subjectTitle: subjectId, topicTitle: 'T', chapterTitle: chapterId })
let n = 0
type SpanIn = [string, string, number, StudyContext, ('ca' | 'rev')?, string?]
/** A completed session: spans given as [date, time in India, minutes, context, kind, news day]. */
function ses(spans: SpanIn[], dev = 'A'): StudySession {
  const id = `s${++n}`
  const list = spans.map(([date, time, min, context, kind, newsDay], i) => ({
    id: `${dev}-${id}-${i}`, context, startedAt: iso(date, time), endedAt: new Date(at(date, time) + min * MIN).toISOString(), durationMs: min * MIN,
    ...(kind === 'ca' ? { activity: 'current-affairs' as const, currentAffairsDayId: newsDay ?? date } : kind === 'rev' ? { activity: 'revision' as const, revisionUnitId: 'u', revisionEventId: 'e', revisionOrdinal: 1 } : {}),
  }))
  return { id, startedAt: list[0].startedAt, endedAt: list[list.length - 1].endedAt, durationMs: list.reduce((a, s) => a + s.durationMs, 0), spans: list, source: 'timer', createdDeviceId: dev, timeZone: IST, createdAt: list[list.length - 1].endedAt }
}
const news = (d: string) => caContext(d)

describe('Current Affairs in the time analytics', () => {
  const sessions = [
    ses([['2026-10-03', '08:00', 30, news('2026-10-03'), 'ca']]),
    ses([['2026-10-04', '07:30', 40, news('2026-10-04'), 'ca'], ['2026-10-04', '08:10', 60, lib('parliament')], ['2026-10-04', '09:10', 20, lib('parliament'), 'rev']]),
    // on the 4th, the 2nd's news was caught up
    ses([['2026-10-04', '18:00', 15, news('2026-10-02'), 'ca', '2026-10-02']]),
  ]
  const ix = buildIndex(sessions, IST)
  const now = at('2026-10-04', '20:00')

  it('reading time is one of three activities: initial study, revision, current affairs', () => {
    const s = summarize(ix, -Infinity, Infinity)
    expect(s.totalMs).toBe(165 * MIN)
    expect(s.byActivity).toEqual({ 'initial-study': 60 * MIN, revision: 20 * MIN, 'current-affairs': 85 * MIN })
    const t = activityTime(ix)
    expect(t).toMatchObject({ initialMs: 60 * MIN, revisionMs: 20 * MIN, currentAffairsMs: 85 * MIN })
    expect(t.time[0]).toBe(60 * MIN) // reading the news is not initial study
  })

  it('it is an activity, not a subject: in no stage, subject, topic or chapter figure', () => {
    const s = summarize(ix, -Infinity, Infinity)
    expect(s.bySubject.map((d) => [d.id, d.durationMs])).toEqual([['prelims/polity', 80 * MIN]])
    expect(s.byStage.map((d) => [d.id, d.durationMs])).toEqual([['prelims', 80 * MIN]])
    expect(s.byChapter.map((d) => d.id)).toEqual(['prelims/polity/parliament'])
    expect(ix.total.get('prelims')).toBe(80 * MIN)
    expect(ix.total.get('prelims/polity')).toBe(80 * MIN)
    expect([...ix.total.keys()].some((k) => k.includes('current-affairs'))).toBe(false)
    expect(activityTime(ix).bySubject.map((x) => x.key)).toEqual(['prelims/polity'])
    // a stage or subject filter never includes it
    expect(totalBetween(ix, -Infinity, Infinity, { stage: 'prelims' })).toBe(80 * MIN)
    expect(totalBetween(ix, -Infinity, Infinity, { subjectId: 'polity' })).toBe(80 * MIN)
  })

  it('the activity scope selects it — alone, and never together with a subject', () => {
    expect(totalBetween(ix, -Infinity, Infinity, { activity: 'current-affairs' })).toBe(85 * MIN)
    expect(totalBetween(ix, -Infinity, Infinity, { activity: 'revision' })).toBe(20 * MIN)
    expect(totalBetween(ix, -Infinity, Infinity, { activity: 'initial-study' })).toBe(60 * MIN)
    expect(totalBetween(ix, -Infinity, Infinity, { activity: 'current-affairs', subjectId: 'polity' })).toBe(0)
    expect(summarize(ix, -Infinity, Infinity, { activity: 'current-affairs' }).sessionCount).toBe(3)
  })

  it('today, yesterday, the week, heatmaps and the study streak all include it', () => {
    const today = compare(ix, 'day', now)
    expect(today.currentMs).toBe(135 * MIN)
    expect(today.comparisonMs).toBe(30 * MIN)
    expect(compare(ix, 'week', now).currentMs).toBe(165 * MIN)
    expect(heatmap(ix, D('2026-10-03'), D('2026-10-04')).map((d) => d.durationMs)).toEqual([30 * MIN, 135 * MIN])
    expect(heatmap(ix, D('2026-10-03'), D('2026-10-04'), { activity: 'current-affairs' }).map((d) => d.durationMs)).toEqual([30 * MIN, 55 * MIN])
    expect(streak(ix, now).currentDays).toBe(2)
    const week = series(ix, period('week', now, IST).buckets, { activity: 'current-affairs' })
    expect(week.map((b) => b.durationMs / MIN)).toEqual([0, 0, 0, 0, 0, 30, 55])
  })

  it('a day\'s reading time is the time spent on that day\'s news, whenever it was read', () => {
    expect(Object.fromEntries(ix.caByDay)).toEqual({ '2026-10-03': 30 * MIN, '2026-10-04': 40 * MIN, '2026-10-02': 15 * MIN })
  })

  it('period time and the average per day read', () => {
    expect(caTime(ix, -Infinity, Infinity)).toEqual({ ms: 85 * MIN, readDays: 2, averageMs: 42.5 * MIN })
    expect(caTime(ix, at('2026-10-04', '00:00'), now)).toEqual({ ms: 55 * MIN, readDays: 1, averageMs: 55 * MIN })
    expect(caTime(buildIndex([], IST), -Infinity, Infinity)).toEqual({ ms: 0, readDays: 0, averageMs: 0 })
  })

  it('a span that crosses midnight is cut there for the calendar, and stays whole for its news day', () => {
    const late = buildIndex([ses([['2026-10-04', '23:30', 60, news('2026-10-04'), 'ca']])], IST)
    expect(heatmap(late, D('2026-10-04'), D('2026-10-05')).map((d) => d.durationMs)).toEqual([30 * MIN, 30 * MIN])
    expect(late.caByDay.get('2026-10-04')).toBe(60 * MIN)
    expect(late.caByDay.has('2026-10-05')).toBe(false)
  })

  it('two devices reading at once count once', () => {
    const both = buildIndex([ses([['2026-10-04', '07:00', 30, news('2026-10-04'), 'ca']], 'A'), ses([['2026-10-04', '07:10', 30, news('2026-10-04'), 'ca']], 'B')], IST)
    expect(summarize(both, -Infinity, Infinity).byActivity['current-affairs']).toBe(40 * MIN)
    expect(both.caByDay.get('2026-10-04')).toBe(40 * MIN)
  })

  it('revising a Current Affairs note is revision time, not current-affairs time, and still no subject', () => {
    const noteCtx: StudyContext = { ref: { kind: 'current-affairs', dayId: '2026-10-03', entryId: 'n1' }, subjectTitle: 'Current Affairs', chapterTitle: 'RBI policy' }
    const r = buildIndex([ses([['2026-10-04', '10:00', 10, noteCtx, 'rev']])], IST)
    const s = summarize(r, -Infinity, Infinity)
    expect(s.byActivity).toEqual({ 'initial-study': 0, revision: 10 * MIN, 'current-affairs': 0 })
    expect(s.bySubject).toEqual([])
    expect(r.caByDay.size).toBe(0)
    expect(activityTime(r).byTopic.map((t) => t.key)).toEqual(['ca/n1'])
  })
})

describe('the timer in a Current Affairs span', () => {
  const T0 = at('2026-10-04', '07:30')
  const env = (now: number) => ({ now, dev: 'A', tz: IST })
  const act = caActivity('2026-10-04')

  it('a current-affairs span carries its activity and news day, and is written to the session', () => {
    const a = start(caContext('2026-10-04'), T0, 'A', false, act)
    expect(a.currentActivity).toEqual({ activity: 'current-affairs', currentAffairsDayId: '2026-10-04' })
    const { session } = finish(a, env(T0 + 25 * MIN))
    expect(session!.spans).toHaveLength(1)
    expect(session!.spans[0]).toMatchObject({ activity: 'current-affairs', currentAffairsDayId: '2026-10-04', durationMs: 25 * MIN, context: { ref: { kind: 'current-affairs', dayId: '2026-10-04' }, subjectTitle: 'Current Affairs' } })
    expect(caActivity('2026-10-04', 'n1')).toEqual({ activity: 'current-affairs', currentAffairsDayId: '2026-10-04', currentAffairsEntryId: 'n1' })
  })

  it('Study → Current Affairs → Study is one timer and one session with three spans', () => {
    let a = start(lib('parliament'), T0, 'A')
    a = switchContext(a, caContext('2026-10-04'), T0 + 20 * MIN, act)
    a = switchContext(a, lib('judiciary'), T0 + 50 * MIN)
    const { session } = finish(a, env(T0 + 60 * MIN))
    expect(session!.spans.map((s) => [s.activity ?? 'initial-study', s.durationMs / MIN, s.currentAffairsDayId ?? null])).toEqual([['initial-study', 20, null], ['current-affairs', 30, '2026-10-04'], ['initial-study', 10, null]])
    expect(session!.durationMs).toBe(60 * MIN)
    expect(a.currentActivity).toBeUndefined() // back to initial study: nothing left on the timer
  })

  it('Revision → Current Affairs closes the revision span and opens a reading span', () => {
    let a = start(lib('parliament'), T0, 'A', false, { activity: 'revision', revisionUnitId: 'u', revisionEventId: 'e', revisionOrdinal: 2 })
    a = switchContext(a, caContext('2026-10-04'), T0 + 8 * MIN, act)
    const { session } = finish(a, env(T0 + 20 * MIN))
    expect(session!.spans.map((s) => [s.activity, s.revisionOrdinal ?? null, s.currentAffairsDayId ?? null, s.durationMs / MIN])).toEqual([['revision', 2, null, 8], ['current-affairs', null, '2026-10-04', 12]])
  })

  it('reading another day\'s news is a new span; the same day again is not', () => {
    const a = start(caContext('2026-10-04'), T0, 'A', false, act)
    expect(switchContext(a, caContext('2026-10-04'), T0 + MIN, act)).toBe(a)
    const b = switchContext(a, caContext('2026-10-03'), T0 + 10 * MIN, caActivity('2026-10-03'))
    expect(b.completedSpans).toHaveLength(1)
    expect(b.currentActivity).toMatchObject({ currentAffairsDayId: '2026-10-03' })
  })

  it('pause time is never counted, and the span keeps its news day across midnight', () => {
    const late = at('2026-10-04', '23:40')
    let a = start(caContext('2026-10-04'), late, 'A', false, act)
    a = pause(a, late + 10 * MIN)
    a = resume(a, late + 15 * MIN)
    const { session } = finish(a, env(late + 45 * MIN)) // 00:25 on the 5th
    expect(session!.durationMs).toBe(40 * MIN)
    expect(session!.spans.every((s) => s.currentAffairsDayId === '2026-10-04')).toBe(true)
    const ix = buildIndex([session!], IST)
    expect(heatmap(ix, D('2026-10-04'), D('2026-10-05')).map((d) => d.durationMs / MIN)).toEqual([15, 25])
    expect(ix.caByDay.get('2026-10-04')).toBe(40 * MIN)
  })
})
