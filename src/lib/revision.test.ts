// Adaptive revision as the app runs it: zustand state + IndexedDB + the sync queue, the one study
// timer, and the real sync engine against a fake cloud. A "reload" is a fresh copy of the modules;
// another device is a fresh copy with its own storage (testkit.ts parks and restores storage).
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentRef, RevisionEvent, RevisionGrade, RevisionUnit, StudyContext, StudySession } from './contract'
import { Cloud, deleteDb, idle, restore, snapshot } from './testkit'

const TZ = 'Asia/Kolkata'
const DAY = 86400000
const MIN = 60000
const T0 = Date.parse('2026-10-05T04:30:00.000Z') // 10:00 on 5 Oct in India
let now = T0
const K = (section: string, chapter = 'parliament', subject = 'polity') => `prelims/${subject}/${chapter}/${section}`
const ctx = (chapterId: string, sectionId?: string): StudyContext => ({ ref: { kind: sectionId ? 'section' : 'chapter', stage: 'prelims', subjectId: 'polity', chapterId, ...(sectionId ? { sectionId } : {}) }, subjectTitle: 'Polity', chapterTitle: chapterId, ...(sectionId ? { sectionTitle: sectionId } : {}) })

async function boot(device?: string) {
  vi.resetModules()
  if (device) localStorage.setItem('upsc-device', device)
  const store = await import('./store')
  const study = await import('./study')
  const plan = await import('./plan')
  const pyq = await import('./pyqState')
  const rev = await import('./revision')
  const reset = await import('./reset')
  const model = await import('./revisionModel')
  const analytics = await import('./analytics')
  const { db } = await import('./db')
  const { syncOnce } = await import('../sync/engine')
  for (const m of [study, plan, pyq, rev, reset]) m.clock.now = () => now
  await store.useStore.getState().init()
  await study.initStudy()
  await plan.initPlan()
  await pyq.initPyqState()
  await rev.initRevision()
  await reset.initReset()
  if (rev.useRevision.getState().prefs?.schedulerTimeZone !== TZ) rev.setRevisionPrefs({ schedulerTimeZone: TZ })
  const s = () => rev.useRevision.getState()
  const done = (key: string, on = true) => store.useStore.getState().setSection(key, { done: on })
  const unit = (key: string): RevisionUnit => s().units[key]
  const events = (key?: string): RevisionEvent[] => Object.values(s().events).filter((e) => !key || e.revisionUnitId === key).sort((a, b) => a.ordinal - b.ordinal || (a.completedAt < b.completedAt ? -1 : 1))
  /** Complete the unit's next revision now. */
  const revise = (key: string, grade: RevisionGrade = 'good', durationMs = 6 * MIN) => rev.completeRevision({ unitId: key, grade, eventId: rev.newRevisionEventId(), startedAt: new Date(now - durationMs).toISOString(), durationMs })!
  const today = () => rev.revisionToday()
  const queue = (flags?: Parameters<typeof model.buildQueue>[0]['flags']) =>
    model.buildQueue({ units: Object.values(s().units), events: Object.values(s().events), today: today(), tz: TZ, exam: model.horizonOf(model.primaryExam(s().exams), today()), flags })
  const queued = async () => (await db.getAll<{ id: string }>('outbox')).map((o) => o.id)
  const sync = (cloud: Cloud) => syncOnce(cloud, store.syncLocal)
  return { store, study, plan, rev, reset, model, analytics, db, s, done, unit, events, revise, today, queue, queued, sync }
}

beforeEach(async () => {
  now = T0
  localStorage.clear()
  await deleteDb()
})

describe('enrolment', () => {
  it('the first Done enrols the section once, with R1 on the next calendar day', async () => {
    const t = await boot()
    t.rev.titles.of = () => 'Budget'
    t.done(K('budget'))
    const u = t.unit(K('budget'))
    expect(u).toMatchObject({ id: K('budget'), title: 'Budget', status: 'new', dueDate: '2026-10-06', revisionCount: 0, lapseCount: 0, desiredRetention: 0.9, schedulerTimeZone: TZ })
    expect(u.target).toEqual({ kind: 'section', stage: 'prelims', subjectId: 'polity', chapterId: 'parliament', sectionId: 'budget' })
    expect(u.scheduler.stability).toBeUndefined() // no memory state until a real review
    expect(u.initialStudyCompletedAt).toBe(new Date(T0).toISOString())
    await idle()
    expect(await t.db.getAll('revisionUnits')).toHaveLength(1)
    expect(await t.queued()).toContain(`ru~${K('budget')}`)
  })

  it('Done clicked twice, or set again from elsewhere, never makes a second unit', async () => {
    const t = await boot()
    t.done(K('budget'))
    const first = t.unit(K('budget'))
    now += 5 * MIN
    t.done(K('budget')) // already done: no transition
    t.rev.enrol(K('budget'), 'Budget')
    expect(Object.keys(t.s().units)).toEqual([K('budget')])
    expect(t.unit(K('budget'))).toBe(first)
  })

  it('★ and ↻ do not enrol; switching scheduling off stops new enrolments', async () => {
    const t = await boot()
    t.store.useStore.getState().setSection(K('budget'), { difficult: true, revise: true })
    expect(t.s().units).toEqual({})
    t.rev.setRevisionPrefs({ enabled: false })
    t.done(K('budget'))
    expect(t.s().units).toEqual({})
  })

  it('unticking Done before any review sets the unit aside; ticking again brings it back as new', async () => {
    const t = await boot()
    t.done(K('budget'))
    t.done(K('budget'), false)
    expect(t.unit(K('budget')).status).toBe('suspended')
    expect(t.queue().items).toHaveLength(0)
    now += 2 * DAY
    t.done(K('budget'))
    expect(t.unit(K('budget'))).toMatchObject({ status: 'new', dueDate: '2026-10-08', revisionCount: 0 })
    expect(Object.keys(t.s().units)).toHaveLength(1)
  })

  it('unticking Done after a review keeps the unit and its history', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    t.revise(K('budget'))
    const before = t.unit(K('budget'))
    t.done(K('budget'), false)
    expect(t.unit(K('budget'))).toBe(before)
    expect(t.events(K('budget'))).toHaveLength(1)
  })

  it('the calendar day is the scheduler timezone\'s, not UTC\'s', async () => {
    now = Date.parse('2026-10-05T19:00:00.000Z') // 00:30 on 6 Oct in India, still 5 Oct in New York
    const t = await boot()
    t.done(K('budget'))
    expect(t.unit(K('budget')).dueDate).toBe('2026-10-07')
    t.rev.setRevisionPrefs({ schedulerTimeZone: 'America/New_York' })
    t.done(K('committees'))
    expect(t.unit(K('committees')).dueDate).toBe('2026-10-06')
    expect(t.unit(K('budget')).dueDate).toBe('2026-10-07') // a timezone change rewrites no date
  })

  it('existing completed sections are scheduled only on request, spread over the coming days', async () => {
    const t = await boot()
    t.rev.setRevisionPrefs({ enabled: false })
    const keys = Array.from({ length: 23 }, (_, i) => K(`s${i}`))
    keys.forEach((k) => t.done(k))
    t.rev.setRevisionPrefs({ enabled: true })
    expect(t.s().units).toEqual({}) // nothing was enrolled behind the learner's back
    expect(t.rev.unscheduledDone()).toHaveLength(23)
    expect(t.rev.scheduleExisting(keys.map((key) => ({ key, title: key })))).toBe(23)
    const due = keys.map((k) => t.unit(k).dueDate)
    expect(due.filter((d) => d === '2026-10-06')).toHaveLength(t.rev.MIGRATION_PER_DAY)
    expect(new Set(due)).toEqual(new Set(['2026-10-06', '2026-10-07', '2026-10-08']))
    expect(t.rev.scheduleExisting(keys.map((key) => ({ key, title: key })))).toBe(0) // idempotent
  })
})

describe('reviews', () => {
  it('a completed revision is an immutable event; the unit holds only the current schedule', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY + 2 * 3600000
    const e = t.revise(K('budget'), 'good', 14 * MIN)
    const u = t.unit(K('budget'))
    expect(e).toMatchObject({ revisionUnitId: K('budget'), ordinal: 1, scheduledDueDate: '2026-10-06', overdueDays: 0, grade: 'good', durationMs: 14 * MIN, nextDueDate: u.dueDate })
    expect(e.schedulerBefore.stability).toBeUndefined()
    expect(e.schedulerAfter).toEqual(u.scheduler)
    expect(u).toMatchObject({ status: 'active', revisionCount: 1, lapseCount: 0 })
    expect(u.dueDate > '2026-10-06').toBe(true)
    expect(Object.isFrozen(e)).toBe(true)
    expect(() => ((e as { grade: string }).grade = 'easy')).toThrow()
    // recording the same revision again (a double click, a reload) changes nothing
    expect(t.rev.completeRevision({ unitId: K('budget'), grade: 'again', eventId: e.id, startedAt: e.startedAt, durationMs: 1 })).toBe(e)
    expect(t.unit(K('budget'))).toBe(u)
    await idle()
    expect(await t.db.getAll('revisionEvents')).toHaveLength(1)
    expect(await t.queued()).toEqual(expect.arrayContaining([`rev~${e.id}`, `ru~${K('budget')}`]))
  })

  it('R1, R2, R3: ordinals count up and each interval follows from the grade before it', async () => {
    const t = await boot()
    t.done(K('budget'))
    const grades: RevisionGrade[] = ['good', 'hard', 'easy']
    const gaps: number[] = []
    for (const g of grades) {
      now = Date.parse(t.unit(K('budget')).dueDate + 'T05:00:00.000Z')
      const e = t.revise(K('budget'), g)
      gaps.push((Date.parse(e.nextDueDate) - Date.parse(e.scheduledDueDate)) / DAY)
    }
    const ev = t.events(K('budget'))
    expect(ev.map((e) => e.ordinal)).toEqual([1, 2, 3])
    expect(ev.map((e) => e.grade)).toEqual(grades)
    expect(ev[1].schedulerBefore).toEqual(ev[0].schedulerAfter)
    expect(ev[2].schedulerBefore).toEqual(ev[1].schedulerAfter)
    expect(t.unit(K('budget')).revisionCount).toBe(3)
    expect(gaps[2]).toBeGreaterThan(gaps[0]) // Easy after two reviews outgrows the first Good
    expect(gaps).not.toEqual([1, 3, 7]) // not the fixed ladder
  })

  it('Again brings the unit back the next day and counts a lapse', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    t.revise(K('budget'), 'good')
    now = Date.parse(t.unit(K('budget')).dueDate + 'T05:00:00.000Z')
    const e = t.revise(K('budget'), 'again')
    expect(t.unit(K('budget'))).toMatchObject({ revisionCount: 2, lapseCount: 1, status: 'active' })
    expect(Date.parse(e.nextDueDate) - Date.parse(e.completedAt.slice(0, 10))).toBe(DAY)
  })

  it('a missed revision stays overdue on its original date; Defer today hides it without moving it', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += 4 * DAY // due 6 Oct, today 9 Oct
    let q = t.queue()
    expect(q.todayList.map((i) => [i.unit.id, i.state, i.overdueDays])).toEqual([[K('budget'), 'overdue', 3]])
    expect(t.unit(K('budget')).dueDate).toBe('2026-10-06')
    t.rev.deferUnit(K('budget'))
    expect(t.unit(K('budget'))).toMatchObject({ dueDate: '2026-10-06', deferredUntilDate: '2026-10-10' })
    q = t.queue()
    expect(q.todayList).toEqual([])
    expect(q.overdue.map((i) => [i.state, i.overdueDays])).toEqual([['deferred', 3]])
    now += DAY // the deferral has run out
    expect(t.queue().todayList.map((i) => [i.state, i.overdueDays])).toEqual([['overdue', 4]])
    // completed late: the event keeps the date it was due and the real delay; the next date runs from today
    const e = t.revise(K('budget'), 'good')
    expect(e).toMatchObject({ scheduledDueDate: '2026-10-06', overdueDays: 4, ordinal: 1 })
    expect(e.nextDueDate > '2026-10-10').toBe(true)
    expect(t.unit(K('budget')).deferredUntilDate).toBeUndefined()
  })

  it('revising early is allowed: the event records the date it was due, the scheduler the real interval', async () => {
    const t = await boot()
    t.done(K('budget'))
    t.done(K('committees'))
    now += DAY
    t.revise(K('budget'), 'easy')
    t.revise(K('committees'), 'easy')
    const due = t.unit(K('budget')).dueDate
    now += DAY // well before the due date
    const early = t.revise(K('budget'), 'good')
    expect(early).toMatchObject({ ordinal: 2, scheduledDueDate: due, overdueDays: 0 })
    now = Date.parse(due + 'T05:00:00.000Z')
    const onTime = t.revise(K('committees'), 'good')
    const gap = (e: RevisionEvent) => (Date.parse(e.nextDueDate) - Date.parse(e.completedAt.slice(0, 10))) / DAY
    expect(gap(early)).toBeLessThanOrEqual(gap(onTime))
  })

  it('units, events and recall answers survive a reload', async () => {
    let t = await boot()
    t.done(K('budget'))
    now += DAY
    const e = t.revise(K('budget'), 'hard')
    const a = t.rev.recordAttempt({ recallUnitId: `${K('budget')}#table[0]/tr[1]/td[1]:cell`, contentHash: 'h1', unitId: K('budget'), eventId: e.id, outcome: 'missed' })
    const u = t.unit(K('budget'))
    await idle()
    t = await boot()
    expect(t.unit(K('budget'))).toEqual(u)
    expect(t.events()).toEqual([e])
    expect(Object.isFrozen(t.events()[0])).toBe(true)
    expect(Object.values(t.s().attempts)).toEqual([a])
    expect(a).toMatchObject({ outcome: 'missed', revisionUnitId: K('budget'), revisionEventId: e.id, contentHash: 'h1' })
  })

  it('an event counts the recall answers given during it', async () => {
    const t = await boot()
    t.done(K('budget'))
    now += DAY
    const eventId = t.rev.newRevisionEventId()
    for (const outcome of ['knew', 'missed', 'missed', 'skipped'] as const) t.rev.recordAttempt({ recallUnitId: `u-${outcome}-${Math.random()}`, contentHash: 'h', unitId: K('budget'), eventId, outcome })
    const e = t.rev.completeRevision({ unitId: K('budget'), grade: 'hard', eventId, startedAt: new Date(now).toISOString(), durationMs: MIN })!
    expect(e).toMatchObject({ recallAttemptCount: 4, recallMissCount: 2 })
    const none = (t.done(K('committees')), t.revise(K('committees')))
    expect(none.recallAttemptCount).toBeUndefined()
  })
})

describe('queue, recovery, calendar and summary', () => {
  it('Today, Overdue and Upcoming; sections grouped under their chapter', async () => {
    const t = await boot()
    t.done(K('budget'))
    t.done(K('committees'))
    t.done(K('writs', 'judiciary'))
    now += DAY
    t.done(K('money-supply', 'money', 'economy')) // due tomorrow
    t.revise(K('committees'), 'good')
    const q = t.queue()
    expect(q.todayList.map((i) => [i.unit.id, i.state, i.ordinal])).toEqual([[K('writs', 'judiciary'), 'due', 1], [K('budget'), 'due', 1]])
    expect(q.upcoming.map((i) => i.unit.id).sort()).toEqual([K('money-supply', 'money', 'economy'), K('committees')].sort())
    expect(q.completedToday.map((e) => e.revisionUnitId)).toEqual([K('committees')])
    const groups = t.model.byChapter([...q.todayList, ...q.upcoming])
    expect(groups.map((g) => [g.chapterKey, g.items.length])).toEqual([['prelims/polity/judiciary', 1], ['prelims/polity/parliament', 2], ['prelims/economy/money', 1]])
    expect(groups[1].items.map((i) => [i.unit.id, i.ordinal])).toEqual([[K('budget'), 1], [K('committees'), 2]])
    const s = t.model.daySummary(q)
    expect(s).toMatchObject({ enrolled: 4, dueCount: 2, overdueCount: 0, completedToday: 1, totalToday: 3, tomorrowCount: 1, recovery: null })
    expect(s.next7Count).toBeGreaterThanOrEqual(1)
  })

  it('estimates come from the revisions already done, then the fallback — one place for all of them', async () => {
    const t = await boot()
    t.done(K('budget'))
    t.done(K('committees'))
    expect(t.queue().items.map((i) => i.estimateMs)).toEqual([5 * MIN, 5 * MIN]) // nothing to go by yet
    now += DAY
    t.revise(K('budget'), 'good', 12 * MIN)
    const est = Object.fromEntries(t.queue().items.map((i) => [i.unit.id, i.estimateMs]))
    expect(est[K('budget')]).toBe(12 * MIN) // its own median
    expect(est[K('committees')]).toBe(12 * MIN) // the subject's
    expect(t.model.daySummary(t.queue()).dueMs).toBe(12 * MIN)
  })

  it('Recovery Mode recommends a manageable day by priority and changes no date or scheduler state', async () => {
    const t = await boot()
    const keys = Array.from({ length: 30 }, (_, i) => K(`s${String(i).padStart(2, '0')}`, `ch${i % 3}`))
    keys.forEach((k) => t.done(k))
    now += DAY
    keys.slice(0, 10).forEach((k, i) => t.revise(k, i % 2 ? 'hard' : 'easy'))
    now += 40 * DAY
    const before = JSON.stringify(t.s().units)
    const flags = (id: string) => ({ difficult: id === keys[29], pyq: id === keys[29] })
    const q = t.queue(flags)
    expect(q.todayList).toHaveLength(30)
    expect(q.recovery).not.toBeNull()
    const { recommended, rest } = q.recovery!
    expect(recommended.length + rest.length).toBe(30)
    expect(t.model.workloadMs(recommended)).toBeLessThanOrEqual(t.model.RECOVERY_BUDGET_MS)
    expect(recommended.length).toBeGreaterThan(0)
    const order = [...recommended, ...rest].map((i) => i.priority)
    expect(order).toEqual([...order].sort((a, b) => b - a)) // highest priority first
    expect(recommended.map((i) => i.unit.id)).toContain(keys[29]) // ★ + PYQ lifts a unit into the day
    expect(t.queue(flags).recovery!.recommended.map((i) => i.unit.id)).toEqual(recommended.map((i) => i.unit.id)) // deterministic
    expect(JSON.stringify(t.s().units)).toBe(before) // presentation only
    expect(t.model.daySummary(q).recovery).toEqual({ count: recommended.length, ms: t.model.workloadMs(recommended), rest: rest.length })
  })

  it('the calendar shows each unit once, on its next date, with due, overdue, deferred, completed and exam days', async () => {
    const t = await boot()
    t.done(K('budget'))
    t.done(K('committees'))
    t.done(K('writs', 'judiciary'))
    now += DAY // 6 Oct: all three due
    const done = t.revise(K('committees'), 'easy')
    now += 2 * DAY // 8 Oct: two overdue
    t.rev.deferUnit(K('writs', 'judiciary'))
    t.done(K('speaker'))
    t.rev.addExam({ name: 'UPSC CSE Prelims', examDate: '2026-10-25' })
    const q = t.queue()
    const cells = t.model.calendarMonth(q, Object.values(t.s().events), t.model.liveExams(t.s().exams), 2026, 10, TZ)
    expect(cells).toHaveLength(35)
    expect(cells[0].date).toBe('2026-09-28') // Monday
    const at = (date: string) => cells.find((c) => c.date === date)!
    expect(at('2026-10-06')).toMatchObject({ inMonth: true })
    expect(at('2026-10-06').overdue.map((i) => i.unit.id).sort()).toEqual([K('writs', 'judiciary'), K('budget')].sort())
    expect(at('2026-10-06').completed.map((e) => e.id)).toEqual([done.id])
    expect(at('2026-10-09').deferred.map((i) => i.unit.id)).toEqual([K('writs', 'judiciary')])
    expect(at('2026-10-09').due.map((i) => i.unit.id)).toEqual([K('speaker')])
    expect(at(done.nextDueDate).due.map((i) => i.unit.id)).toContain(K('committees'))
    expect(at('2026-10-25').exams.map((x) => x.name)).toEqual(['UPSC CSE Prelims'])
    // no unit is projected onto a second future date
    const placed = cells.flatMap((c) => c.due.map((i) => i.unit.id))
    expect(new Set(placed).size).toBe(placed.length)
  })

  it('revision analytics are counted from the records: completed, on time, grades, backlog, workload', async () => {
    const t = await boot()
    const keys = [K('budget'), K('committees'), K('writs', 'judiciary'), K('money-supply', 'money', 'economy')]
    keys.forEach((k) => t.done(k))
    now += DAY
    const e1 = t.revise(keys[0], 'good')
    t.rev.recordAttempt({ recallUnitId: 'r1', contentHash: 'h', unitId: keys[0], eventId: e1.id, outcome: 'knew' })
    t.rev.recordAttempt({ recallUnitId: 'r2', contentHash: 'h', unitId: keys[0], eventId: e1.id, outcome: 'missed' })
    now += 3 * DAY
    t.revise(keys[1], 'again') // three days late
    const st = t.model.revisionStats(t.queue(), Object.values(t.s().events), Object.values(t.s().attempts), -Infinity, Infinity)
    expect(st).toMatchObject({ completed: 2, onTime: 1, late: 1, backlog: 2, grades: { again: 1, hard: 0, good: 1, easy: 0 }, recall: { knew: 1, missed: 1, skipped: 0 } })
    expect(st.scheduled).toBeGreaterThanOrEqual(4)
    expect(st.completionRate).toBeCloseTo(st.completed / st.scheduled)
    expect(st.byOrdinal).toEqual([0, 2, 0, 0, 0, 0])
    expect(st.bySubject.map((s) => [s.subjectKey, s.units, s.completed])).toEqual([['prelims/polity', 3, 2], ['prelims/economy', 1, 0]])
    expect(st.upcoming7.count + st.backlog).toBeLessThanOrEqual(4)
    // nothing recorded → nothing claimed
    const empty = t.model.revisionStats(t.model.buildQueue({ units: [], events: [], today: t.today(), tz: TZ }), [], [], -Infinity, Infinity)
    expect(empty).toMatchObject({ scheduled: 0, completed: 0, backlog: 0 })
    expect(empty.completionRate).toBeUndefined()
  })
})

describe('exam targets', () => {
  it('several exams, exactly one primary', async () => {
    const t = await boot()
    const a = t.rev.addExam({ name: 'UPSC CSE Prelims', examDate: '2027-05-24', stage: 'prelims' })
    const b = t.rev.addExam({ name: 'UPPCS Prelims', examDate: '2027-03-14' })
    const primaries = () => t.model.liveExams(t.s().exams).filter((e) => e.primary).map((e) => e.id)
    expect(primaries()).toEqual([a]) // the first target becomes primary
    t.rev.setPrimaryExam(b)
    expect(primaries()).toEqual([b])
    expect(t.model.primaryExam(t.s().exams)!.id).toBe(b)
    t.rev.updateExam(b, { active: false }) // a target switched off cannot stay primary
    expect(primaries()).toEqual([a])
    t.rev.removeExam(a)
    expect(t.model.liveExams(t.s().exams).map((e) => e.id)).toEqual([b])
    expect(t.model.primaryExam(t.s().exams)).toBeNull() // b is inactive
    t.rev.updateExam(b, { active: true })
    expect(primaries()).toEqual([b])
    await idle()
    expect((await boot()).model.primaryExam((await boot()).s().exams)?.id).toBe(b)
  })

  it('countdown: days, then days and hours in the last week, never seconds; the next exam after it passes', async () => {
    const t = await boot()
    const a = t.rev.addExam({ name: 'UPSC CSE Prelims', examDate: '2027-05-24', timeZone: TZ })
    expect(t.model.countdown(t.s().exams, now)).toMatchObject({ days: 231, text: '231 days' })
    expect(t.model.examDateText('2027-05-24')).toBe('24 MAY 2027')
    const near = Date.parse('2027-05-17T04:00:00.000Z') // 09:30 IST, 17 May
    expect(t.model.countdown(t.s().exams, near)!.text).toBe('6d 14h')
    expect(t.model.countdown(t.s().exams, Date.parse('2027-05-24T04:00:00.000Z'))!.text).toBe('Today')
    expect(t.model.countdown(t.s().exams, Date.parse('2027-05-25T04:00:00.000Z'))).toBeNull()
    t.rev.addExam({ name: 'UPSC CSE Mains', examDate: '2027-08-21', timeZone: TZ })
    expect(t.model.primaryExam(t.s().exams)!.id).toBe(a)
    expect(t.model.countdown(t.s().exams, Date.parse('2027-05-25T04:00:00.000Z'))!.exam.name).toBe('UPSC CSE Mains')
    t.rev.updateExam(a, { examDate: '2027-05-31' }) // the date was changed
    expect(t.model.countdown(t.s().exams, now)!.days).toBe(238)
  })

  it('a review that would fall after the primary exam is brought into its final window — and only that', async () => {
    const t = await boot()
    const x = t.rev.addExam({ name: 'Prelims', examDate: '2026-12-14', finalRevisionWindowDays: 21 }) // 70 days ahead
    t.done(K('budget'))
    t.done(K('committees'))
    now += DAY
    const short = t.revise(K('committees'), 'hard')
    expect(short.examTargetId).toBeUndefined() // falls well before the exam: left alone
    t.revise(K('budget'), 'easy')
    for (let i = 0; i < 4 && !t.unit(K('budget')).examTargetId; i++) {
      now = Date.parse(t.unit(K('budget')).dueDate + 'T05:00:00.000Z')
      t.revise(K('budget'), 'easy')
    }
    const u = t.unit(K('budget'))
    expect(u.examTargetId).toBe(x)
    expect(u.dueDate >= '2026-11-23' && u.dueDate <= '2026-12-13').toBe(true)
    expect(u.status).toBe('active')
    // the FSRS state is untouched by the constraint: its own interval still reaches past the exam
    const natural = Date.parse(u.scheduler.lastReviewAt!.slice(0, 10)) + u.scheduler.scheduledDays! * DAY
    expect(natural).toBeGreaterThanOrEqual(Date.parse('2026-12-14'))
    // the review inside the window is the last one before the exam
    now = Date.parse(u.dueDate + 'T05:00:00.000Z')
    const last = t.revise(K('budget'), 'good')
    expect(t.unit(K('budget')).status).toBe('completed-exam-cycle')
    expect(last.nextDueDate >= '2026-12-14').toBe(true)
  })

  it('editing the exam, changing the primary or switching the constraint off re-checks future reviews only', async () => {
    const t = await boot()
    const x = t.rev.addExam({ name: 'Prelims', examDate: '2026-12-14' })
    t.done(K('budget'))
    t.done(K('late'))
    now += DAY
    t.revise(K('budget'), 'easy')
    for (let i = 0; i < 4 && !t.unit(K('budget')).examTargetId; i++) {
      now = Date.parse(t.unit(K('budget')).dueDate + 'T05:00:00.000Z')
      t.revise(K('budget'), 'easy')
    }
    const constrained = t.unit(K('budget')).dueDate
    const overdue = t.unit(K('late')).dueDate // never revised: overdue by now
    t.rev.updateExam(x, { examDate: '2028-06-01' }) // far away: the FSRS date stands again
    expect(t.unit(K('budget')).examTargetId).toBeUndefined()
    expect(t.unit(K('budget')).dueDate > constrained).toBe(true)
    const free = t.unit(K('budget')).dueDate
    t.rev.updateExam(x, { examDate: '2026-12-14' })
    expect(t.unit(K('budget'))).toMatchObject({ dueDate: constrained, examTargetId: x })
    const y = t.rev.addExam({ name: 'Mains', examDate: '2028-08-01' })
    t.rev.setPrimaryExam(y) // another exam is primary now
    expect(t.unit(K('budget'))).toMatchObject({ dueDate: free })
    t.rev.setPrimaryExam(x)
    t.rev.setRevisionPrefs({ examAwareScheduling: false })
    expect(t.unit(K('budget')).dueDate).toBe(free)
    expect(t.unit(K('late')).dueDate).toBe(overdue) // a missed date is never moved
    expect(t.events(K('budget')).every((e) => Object.isFrozen(e))).toBe(true)
  })

  it('once the exam has passed its constraint no longer applies', async () => {
    const t = await boot()
    t.rev.addExam({ name: 'Prelims', examDate: '2026-10-20' })
    t.done(K('budget'))
    now = Date.parse('2026-10-21T05:00:00.000Z')
    const e = t.revise(K('budget'), 'easy')
    expect(e.examTargetId).toBeUndefined()
    expect(t.unit(K('budget'))).toMatchObject({ status: 'active' })
    expect(t.queue().items[0].unit.examTargetId).toBeUndefined()
  })
})

describe('the timer during revision', () => {
  const activity = (eventId: string, ordinal = 1, unitId = K('budget')) => ({ activity: 'revision' as const, revisionUnitId: unitId, revisionEventId: eventId, revisionOrdinal: ordinal })
  const sessions = (t: Awaited<ReturnType<typeof boot>>): StudySession[] => Object.values(t.study.useStudy.getState().sessions)

  it('starting a revision with no timer starts the one timer in a revision span', async () => {
    const t = await boot()
    expect(t.study.beginRevisionSpan(ctx('parliament', 'budget'), activity('e1'))).toBe('started')
    const a = t.study.activeTimer(t.study.useStudy.getState())!
    expect(a.currentActivity).toEqual(activity('e1'))
    now += 14 * MIN
    expect(t.study.revisionSpanMs('e1')).toBe(14 * MIN)
    const s = t.study.stopTimer()!
    expect(s.spans).toHaveLength(1)
    expect(s.spans[0]).toMatchObject({ activity: 'revision', revisionUnitId: K('budget'), revisionEventId: 'e1', revisionOrdinal: 1, durationMs: 14 * MIN })
  })

  it('an initial-study timer already running is switched, not doubled: one session, two spans', async () => {
    const t = await boot()
    t.study.startTimer(ctx('parliament'))
    const id = t.study.activeTimer(t.study.useStudy.getState())!.sessionId
    now += 38 * MIN
    expect(t.study.beginRevisionSpan(ctx('parliament', 'budget'), activity('e1'))).toBe('switched')
    expect(t.study.beginRevisionSpan(ctx('parliament', 'budget'), activity('e1'))).toBe('switched') // again: nothing changes
    const a = t.study.activeTimer(t.study.useStudy.getState())!
    expect(a.sessionId).toBe(id) // the same timer
    expect(a.completedSpans).toHaveLength(1)
    expect(a.completedSpans[0]).not.toHaveProperty('activity') // initial study is the default
    now += 9 * MIN
    const s = t.study.stopTimer()!
    expect(sessions(t)).toHaveLength(1)
    expect(s.spans.map((x) => [x.activity ?? 'initial-study', x.durationMs])).toEqual([['initial-study', 38 * MIN], ['revision', 9 * MIN]])
    expect(s.durationMs).toBe(47 * MIN)
  })

  it('a paused timer resumes into the revision; reading the same chapter stays revision; another chapter is study again', async () => {
    const t = await boot()
    t.study.startTimer(ctx('parliament'))
    now += 5 * MIN
    t.study.pauseTimer()
    now += 30 * MIN // paused: not counted
    t.study.beginRevisionSpan(ctx('parliament', 'budget'), activity('e1'))
    expect(t.study.activeTimer(t.study.useStudy.getState())!.state).toBe('running')
    now += 4 * MIN
    t.study.followContext(ctx('parliament')) // the notes of the unit under revision
    expect(t.study.activeTimer(t.study.useStudy.getState())!.currentActivity?.revisionEventId).toBe('e1')
    now += 2 * MIN
    t.study.followContext(ctx('judiciary'))
    expect(t.study.activeTimer(t.study.useStudy.getState())!.currentActivity).toBeUndefined()
    now += 3 * MIN
    const s = t.study.stopTimer()!
    expect(s.spans.map((x) => [(x.context.ref as ContentRef).chapterId, x.activity ?? 'initial-study', x.durationMs])).toEqual([['parliament', 'initial-study', 5 * MIN], ['parliament', 'revision', 6 * MIN], ['judiciary', 'initial-study', 3 * MIN]])
  })

  it('a timer owned by another device is left alone', async () => {
    const t = await boot('devA')
    t.study.startTimer(ctx('parliament'))
    await idle()
    const parked = await snapshot()
    localStorage.clear()
    await restore({ ...parked, local: {} })
    const b = await boot('devB') // the same account's data on another device
    const before = b.study.useStudy.getState().runtime
    expect(b.study.beginRevisionSpan(ctx('parliament', 'budget'), activity('e1'))).toBe('remote')
    expect(b.study.useStudy.getState().runtime).toBe(before)
    expect(b.study.revisionSpanMs('e1')).toBe(0)
    b.study.continueHere(ctx('parliament', 'budget'), activity('e1')) // "Continue the timer here"
    const a = b.study.activeTimer(b.study.useStudy.getState())!
    expect(a).toMatchObject({ ownerDeviceId: 'devB', currentActivity: { revisionEventId: 'e1' } })
    expect(a.sessionId).toBe((before as { sessionId: string }).sessionId) // still one timer, one session
  })

  it('a reload in the middle of a revision keeps the span and its time', async () => {
    let t = await boot()
    t.study.beginRevisionSpan(ctx('parliament', 'budget'), activity('e7', 2))
    now += 3 * MIN
    await idle()
    t = await boot()
    expect(t.study.activeTimer(t.study.useStudy.getState())!.currentActivity).toEqual(activity('e7', 2))
    now += 2 * MIN
    expect(t.study.revisionSpanMs('e7')).toBe(5 * MIN)
    expect(t.study.beginRevisionSpan(ctx('parliament', 'budget'), activity('e7', 2))).toBe('switched') // the same span carries on
    expect(t.study.stopTimer()!.spans.map((x) => [x.revisionOrdinal, x.durationMs])).toEqual([[2, 5 * MIN]])
  })

  it('analytics keep initial study and each revision round apart, per topic and overall', async () => {
    const t = await boot()
    const run = (c: StudyContext, ms: number, a?: ReturnType<typeof activity>) => {
      if (a) t.study.beginRevisionSpan(c, a)
      else if (t.study.activeTimer(t.study.useStudy.getState())) {
        t.study.keepAwayTime() // the test clock jumps by minutes: that is not an unattended timer
        t.study.followContext(c)
      }
      else t.study.startTimer(c)
      now += ms
    }
    run(ctx('inflation'), 38 * MIN)
    t.study.stopTimer()
    now += DAY
    run(ctx('inflation', 'cpi'), 16 * MIN, activity('e1', 1, 'prelims/polity/inflation/cpi'))
    t.study.stopTimer()
    now += 3 * DAY
    run(ctx('inflation', 'cpi'), 10 * MIN, activity('e2', 2, 'prelims/polity/inflation/cpi'))
    run(ctx('inflation', 'wpi'), 4 * MIN, activity('e3', 1, 'prelims/polity/inflation/wpi'))
    run(ctx('banking'), 6 * MIN)
    t.study.stopTimer()
    now += 9 * DAY
    for (const n of [3, 4, 5, 6]) {
      run(ctx('inflation', 'cpi'), 7 * MIN, activity(`e${n + 10}`, n, 'prelims/polity/inflation/cpi'))
      t.study.stopTimer()
      now += DAY
    }
    const ix = t.analytics.indexOf(t.study.useStudy.getState().sessions, TZ)
    const a = t.analytics.activityTime(ix)
    //            initial        R1               R2        R3       R4       R5+ (R5 and R6)
    expect(a.time).toEqual([44 * MIN, 20 * MIN, 10 * MIN, 7 * MIN, 7 * MIN, 14 * MIN])
    expect(a.initialMs).toBe(44 * MIN)
    expect(a.revisionMs).toBe(58 * MIN)
    const inflation = a.byTopic.find((x) => x.key === 'prelims/polity/inflation')!
    expect(inflation.time).toEqual([38 * MIN, 20 * MIN, 10 * MIN, 7 * MIN, 7 * MIN, 14 * MIN])
    expect(inflation.totalMs).toBe(96 * MIN)
    expect(inflation.sections!.map((s) => [s.key.split('/').pop(), s.time[1], s.time[2]])).toEqual([['cpi', 16 * MIN, 10 * MIN], ['wpi', 4 * MIN, 0]])
    expect(a.bySubject).toEqual([{ key: 'prelims/polity', label: 'Polity', initialMs: 44 * MIN, revisionMs: 58 * MIN }])
    // the totals the rest of Insights shows are unchanged: every span is still study time
    expect(t.analytics.summarize(ix, -Infinity, Infinity).totalMs).toBe(102 * MIN)
    // a period filter applies to both
    expect(t.analytics.activityTime(ix, T0 + DAY / 2).time[0]).toBe(6 * MIN)
  })
})

describe('across devices', () => {
  it('units, events, recall answers, exam targets and preferences reach a second device; static recall units never leave', async () => {
    const cloud = new Cloud()
    const a = await boot('devA')
    a.done(K('budget'))
    now += DAY
    const e = a.revise(K('budget'), 'good')
    a.rev.recordAttempt({ recallUnitId: 'r1', contentHash: 'h', unitId: K('budget'), eventId: e.id, outcome: 'knew' })
    a.rev.addExam({ name: 'Prelims', examDate: '2027-05-24' })
    a.rev.setRevisionPrefs({ recallIntensity: 'exam' })
    await a.sync(cloud)
    expect(cloud.ids('ru')).toEqual([`ru~${K('budget')}`])
    expect(cloud.ids('rev')).toEqual([`rev~${e.id}`])
    expect(cloud.ids('ra')).toHaveLength(1)
    expect(cloud.ids('exam')).toHaveLength(1)
    expect(cloud.ids('rpref')).toEqual(['rpref~default'])
    // only personal state is uploaded: no recall units, calendars, forecasts or analytics
    expect(new Set(cloud.ids().map((id) => id.split('~')[0]))).toEqual(new Set(['sec', 'ru', 'rev', 'ra', 'exam', 'rpref', 'meta'].filter((k) => cloud.ids(k).length)))
    const unitA = a.unit(K('budget'))
    await idle()
    localStorage.clear()
    await deleteDb()
    const b = await boot('devB')
    await b.sync(cloud)
    expect(b.unit(K('budget'))).toEqual(unitA)
    expect(b.events()).toEqual([e])
    expect(Object.values(b.s().attempts)).toHaveLength(1)
    expect(b.model.primaryExam(b.s().exams)!.name).toBe('Prelims')
    expect(b.rev.revisionPrefs().recallIntensity).toBe('exam')
  })

  it('the same revision completed on two devices while apart: both events are kept, the later review sets the schedule', async () => {
    const cloud = new Cloud()
    let a = await boot('devA')
    a.done(K('budget'))
    await a.sync(cloud)
    await idle()
    const parkedA = await snapshot()
    localStorage.clear()
    await deleteDb()
    let b = await boot('devB')
    await b.sync(cloud)
    now += DAY
    const eb = b.revise(K('budget'), 'hard') // B, offline
    await idle()
    const parkedB = await snapshot()
    await restore(parkedA)
    a = await boot('devA')
    now += 2 * 3600000
    const ea = a.revise(K('budget'), 'easy') // A, later, also offline
    await a.sync(cloud)
    await idle()
    await restore(parkedB)
    b = await boot('devB')
    await b.sync(cloud)
    await a.sync(cloud)
    expect(b.events().map((x) => x.id).sort()).toEqual([ea.id, eb.id].sort()) // nothing lost
    expect(b.events().map((x) => x.ordinal)).toEqual([1, 1])
    expect(cloud.ids('rev')).toHaveLength(2)
    expect(b.unit(K('budget')).scheduler).toEqual(ea.schedulerAfter) // the later review stands
    expect(b.unit(K('budget')).dueDate).toBe(ea.nextDueDate)
    expect((cloud.docs.get(`rev~${eb.id}`)!.rec.data as unknown as RevisionEvent).grade).toBe('hard') // history is not rewritten
  })

  it('two devices each made a different exam primary: one primary remains, the later choice', async () => {
    const cloud = new Cloud()
    let a = await boot('devA')
    const x = a.rev.addExam({ name: 'Prelims', examDate: '2027-05-24' })
    const y = a.rev.addExam({ name: 'Mains', examDate: '2027-08-21' })
    await a.sync(cloud)
    await idle()
    const parkedA = await snapshot()
    localStorage.clear()
    await deleteDb()
    const b = await boot('devB')
    await b.sync(cloud)
    now += MIN
    b.rev.setPrimaryExam(y)
    await idle()
    const parkedB = await snapshot()
    await restore(parkedA)
    a = await boot('devA')
    now += MIN
    a.rev.updateExam(x, { name: 'CSE Prelims' }) // an unrelated field, on the other device
    await a.sync(cloud)
    await restore(parkedB)
    const b2 = await boot('devB')
    await b2.sync(cloud)
    expect(b2.model.liveExams(b2.s().exams).filter((e) => e.primary).map((e) => e.id)).toEqual([y])
    expect(b2.s().exams[x].name).toBe('CSE Prelims') // both changes survive
  })
})
