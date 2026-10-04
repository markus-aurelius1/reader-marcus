import { describe, expect, it } from 'vitest'
import type { RevisionEvent, RevisionGrade, SchedulerSnapshot } from './contract'
import { FALLBACK_REVISION_MS, GRADES, SCHEDULER_VERSION, buildMedians, dateKey, dayOfIso, estimateMs, examHorizon, hash32, parseDay, priorityScore, retrievability, review } from './scheduler'

const TZ = 'Asia/Kolkata'
const NEW: SchedulerSnapshot = { schedulerVersion: SCHEDULER_VERSION }
const D0 = parseDay('2026-10-05')
/** Noon IST on a day number. */
const noon = (day: number) => new Date(day * 86400000 + 6.5 * 3600000).toISOString()
const first = (grade: RevisionGrade, today = D0) => review({ scheduler: NEW, revisionCount: 0, lapseCount: 0, grade, today, tz: TZ, retention: 0.9, nowIso: noon(today) })
const again = (prev: ReturnType<typeof review>, grade: RevisionGrade, today: number, count = 1) => review({ scheduler: prev.after, revisionCount: count, lapseCount: 0, grade, today, tz: TZ, retention: 0.9, nowIso: noon(today) })

describe('calendar days', () => {
  it('parses and formats a date without a timezone in between', () => {
    expect(dateKey(parseDay('2026-10-05'))).toBe('2026-10-05')
    expect(parseDay('2027-01-01') - parseDay('2026-12-31')).toBe(1)
    expect(parseDay('2028-03-01') - parseDay('2028-02-28')).toBe(2) // leap year
  })

  it('an instant belongs to the calendar day of the scheduler timezone', () => {
    // 20:00 UTC on 5 Oct is already 6 Oct in India, still 5 Oct in New York
    expect(dateKey(dayOfIso('2026-10-05T20:00:00.000Z', 'Asia/Kolkata'))).toBe('2026-10-06')
    expect(dateKey(dayOfIso('2026-10-05T20:00:00.000Z', 'America/New_York'))).toBe('2026-10-05')
    expect(dateKey(dayOfIso('2026-10-05T18:29:59.000Z', 'Asia/Kolkata'))).toBe('2026-10-05') // one second before midnight IST
    expect(dateKey(dayOfIso('2026-10-05T18:30:00.000Z', 'Asia/Kolkata'))).toBe('2026-10-06')
  })
})

describe('adaptive scheduler (FSRS adapter)', () => {
  it('the first review sets a memory state and an interval that grows with the grade', () => {
    const days = GRADES.map((g) => first(g).intervalDays)
    expect(days[0]).toBe(1) // Again: back the next day
    for (let i = 1; i < days.length; i++) expect(days[i]).toBeGreaterThan(days[i - 1])
    const r = first('good')
    expect(r.after.stability).toBeGreaterThan(0)
    expect(r.after.difficulty).toBeGreaterThanOrEqual(1)
    expect(r.after.scheduledDays).toBe(r.intervalDays)
    expect(r.after.lastReviewAt).toBe(noon(D0))
    expect(r.after.schedulerVersion).toBe(SCHEDULER_VERSION)
  })

  it('never schedules the next review earlier than the next calendar day', () => {
    for (const g of GRADES) {
      expect(first(g).intervalDays).toBeGreaterThanOrEqual(1)
      const r1 = first('good')
      expect(again(r1, g, D0 + r1.intervalDays).intervalDays).toBeGreaterThanOrEqual(1)
      expect(again(r1, g, D0).intervalDays).toBeGreaterThanOrEqual(1) // reviewed again the same day
    }
  })

  it('is not a fixed ladder: the same review after Hard, Good and Easy leads to different dates', () => {
    const r1 = first('good')
    const next = GRADES.map((g) => again(r1, g, D0 + r1.intervalDays).intervalDays)
    expect(new Set(next).size).toBe(4)
    expect(next).toEqual([...next].sort((a, b) => a - b))
    // and the second interval depends on the first grade, too
    const afterHard = again(first('hard'), 'good', D0 + first('hard').intervalDays).intervalDays
    const afterEasy = again(first('easy'), 'good', D0 + first('easy').intervalDays).intervalDays
    expect(afterEasy).toBeGreaterThan(afterHard)
  })

  it('uses the real time since the last review: a late success earns a longer interval than an on-time one', () => {
    const r1 = first('good')
    const onTime = again(r1, 'good', D0 + r1.intervalDays).intervalDays
    const late = again(r1, 'good', D0 + r1.intervalDays + 20).intervalDays
    const early = again(r1, 'good', D0 + 1).intervalDays
    expect(late).toBeGreaterThan(onTime)
    expect(early).toBeLessThanOrEqual(onTime)
  })

  it('Again after a review is a lapse and brings the unit back the next day; a first Again is not a lapse', () => {
    const r1 = first('good')
    const lapse = again(r1, 'again', D0 + r1.intervalDays)
    expect(lapse.lapse).toBe(true)
    expect(lapse.intervalDays).toBe(1)
    expect(lapse.after.stability!).toBeLessThan(r1.after.stability!)
    expect(first('again').lapse).toBe(false)
  })

  it('is deterministic: the same review gives the same date on every device', () => {
    const a = again(first('good'), 'hard', D0 + 9, 1)
    const b = again(first('good'), 'hard', D0 + 9, 1)
    expect(a).toEqual(b)
  })

  it('a higher desired retention means shorter intervals', () => {
    const at = (retention: number) => review({ scheduler: first('good').after, revisionCount: 1, lapseCount: 0, grade: 'good', today: D0 + 3, tz: TZ, retention, nowIso: noon(D0 + 3) }).intervalDays
    expect(at(0.95)).toBeLessThan(at(0.9))
    expect(at(0.8)).toBeGreaterThan(at(0.9))
  })

  it('retrievability falls as days pass and is derived, not stored', () => {
    const s = first('good').after
    const r0 = retrievability(s, D0, TZ, D0)
    const r30 = retrievability(s, D0 + 30, TZ, D0)
    expect(r0).toBeCloseTo(1, 5)
    expect(r30).toBeLessThan(r0)
    expect(retrievability(NEW, D0 + 5, TZ, D0)).toBeLessThan(retrievability(NEW, D0 + 1, TZ, D0)) // not yet reviewed
    expect(s).not.toHaveProperty('retrievability')
  })
})

describe('exam horizon', () => {
  const exam = { id: 'x1', examDay: D0 + 100, windowDays: 21 }

  it('leaves a review that already falls before the exam alone', () => {
    expect(examHorizon(D0 + 40, D0, exam, 'u')).toEqual({ due: D0 + 40 })
    expect(examHorizon(D0 + 99, D0, exam, 'u')).toEqual({ due: D0 + 99 })
  })

  it('brings a review that would fall on or after the exam into the final window', () => {
    for (const due of [D0 + 100, D0 + 180, D0 + 900]) {
      const h = examHorizon(due, D0, exam, 'prelims/polity/parliament/budget')
      expect(h.examTargetId).toBe('x1')
      expect(h.due).toBeGreaterThanOrEqual(exam.examDay - 21)
      expect(h.due).toBeLessThanOrEqual(exam.examDay - 1)
    }
  })

  it('spreads units across the window instead of piling them onto one date', () => {
    const days = new Map<number, number>()
    for (let i = 0; i < 420; i++) {
      const d = examHorizon(D0 + 300, D0, exam, `prelims/polity/chapter-${i % 20}/section-${i}`).due
      days.set(d, (days.get(d) ?? 0) + 1)
    }
    expect(days.size).toBe(21) // every day of the window is used
    expect(Math.max(...days.values())).toBeLessThan(420 / 21 * 2.2) // no day carries a pile
    // and a unit always lands on the same day
    expect(examHorizon(D0 + 300, D0, exam, 'a/b/c/d').due).toBe(examHorizon(D0 + 500, D0 + 3, exam, 'a/b/c/d').due)
  })

  it('a review done inside the window is the final one: nothing more is forced before the exam', () => {
    const h = examHorizon(D0 + 130, D0 + 90, exam, 'u')
    expect(h).toEqual({ due: D0 + 130, examTargetId: 'x1', cycleDone: true })
  })

  it('stops applying once the exam has passed, and when there is no exam', () => {
    expect(examHorizon(D0 + 300, D0 + 100, exam, 'u')).toEqual({ due: D0 + 300 })
    expect(examHorizon(D0 + 300, D0 + 250, exam, 'u')).toEqual({ due: D0 + 300 })
    expect(examHorizon(D0 + 300, D0, null, 'u')).toEqual({ due: D0 + 300 })
  })
})

describe('workload estimate', () => {
  const ev = (unit: string, ms: number): RevisionEvent => ({ revisionUnitId: unit, durationMs: ms }) as RevisionEvent
  it('unit median → subject median → global median → the one fallback', () => {
    expect(estimateMs('prelims/polity/a/x', buildMedians([]))).toBe(FALLBACK_REVISION_MS)
    const m = buildMedians([ev('prelims/polity/a/x', 4 * 60000), ev('prelims/polity/a/x', 10 * 60000), ev('prelims/polity/a/x', 6 * 60000), ev('prelims/polity/b/y', 20 * 60000), ev('prelims/economy/c/z', 2 * 60000)])
    expect(estimateMs('prelims/polity/a/x', m)).toBe(6 * 60000) // its own median
    expect(estimateMs('prelims/polity/q/new', m)).toBe(8 * 60000) // Polity: 4, 6, 10, 20
    expect(estimateMs('prelims/history/q/new', m)).toBe(6 * 60000) // everything: 2, 4, 6, 10, 20
  })
  it('ignores a revision with no recorded duration', () => {
    expect(buildMedians([ev('prelims/polity/a/x', 0)]).global).toBeUndefined()
  })
})

describe('recovery priority', () => {
  const base = { risk: 0.2, overdueDays: 0, scheduledDays: 10, difficulty: 5, difficult: false, pyq: false }
  it('rises with forgetting risk, overdue days, difficulty, exam proximity and importance', () => {
    const p = priorityScore(base)
    expect(priorityScore({ ...base, risk: 0.6 })).toBeGreaterThan(p)
    expect(priorityScore({ ...base, overdueDays: 5 })).toBeGreaterThan(p)
    expect(priorityScore({ ...base, difficulty: 9 })).toBeGreaterThan(p)
    expect(priorityScore({ ...base, daysToExam: 10 })).toBeGreaterThan(priorityScore({ ...base, daysToExam: 80 }))
    expect(priorityScore({ ...base, difficult: true })).toBeGreaterThan(p)
    expect(priorityScore({ ...base, pyq: true })).toBeGreaterThan(p)
  })
  it('is bounded and deterministic', () => {
    const top = priorityScore({ risk: 5, overdueDays: 999, scheduledDays: 1, difficulty: 10, daysToExam: 0, difficult: true, pyq: true })
    expect(top).toBeCloseTo(1, 10)
    expect(priorityScore(base)).toBe(priorityScore({ ...base }))
    expect(hash32('abc')).toBe(hash32('abc'))
  })
})
