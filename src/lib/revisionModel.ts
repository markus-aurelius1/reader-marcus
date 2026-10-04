// Revision view models. Pure: the queue, the calendar, the Home summary, the exam countdown and
// the Revision analytics are all calculated here, on demand, from RevisionUnits, RevisionEvents,
// RecallAttempts and exam targets. Nothing in this file is stored or synced, and none of it
// changes a due date or the scheduler's state. Unit-tested in revision.test.ts.
import type { ExamTarget, RecallAttempt, RevisionEvent, RevisionGrade, RevisionUnit } from './contract'
import { dateKey, dayOf, dayStart, civil, dayNo, weekStart } from './analytics'
import { buildMedians, estimateMs, parseDay, priorityScore, retrievability, type ExamHorizon, type Medians } from './scheduler'

const DAY = 86400000
const HOUR = 3600000

// ---- exam targets -------------------------------------------------------------------------
/** field → [time, device] of its last change. */
export type Stamps = Record<string, [number, string]>
/** An exam target as stored: the contract's target, a removal marker and the field timestamps. */
export interface ExamRow extends ExamTarget {
  removed?: boolean
  st: Stamps
}

export const liveExams = (rows: Record<string, ExamRow>): ExamRow[] =>
  Object.values(rows).filter((r) => !r.removed && r.name && r.examDate).sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : a.id < b.id ? -1 : 1))

/**
 * The one primary exam. Exactly one active target is primary: making a target primary clears the
 * others, and if two devices each chose one while apart, the later choice stands.
 */
export function primaryExam(rows: Record<string, ExamRow>): ExamRow | null {
  const flagged = liveExams(rows).filter((e) => e.active && e.primary)
  return flagged.sort((a, b) => (b.st?.primary?.[0] ?? 0) - (a.st?.primary?.[0] ?? 0) || (a.id < b.id ? -1 : 1))[0] ?? null
}

/** The primary exam as a scheduling constraint — none once its date has passed. */
export function horizonOf(exam: ExamRow | null, today: number): ExamHorizon | null {
  if (!exam) return null
  const examDay = parseDay(exam.examDate)
  return examDay > today ? { id: exam.id, examDay, windowDays: exam.finalRevisionWindowDays } : null
}

export interface Countdown {
  exam: ExamRow
  days: number
  /** "232 days" · "6d 14h" inside the last week · "Today". Never seconds. */
  text: string
}
/** The primary exam while it is still ahead; after it, the nearest active exam that is. */
export function countdown(rows: Record<string, ExamRow>, now: number): Countdown | null {
  const ahead = (e: ExamRow) => parseDay(e.examDate) >= dayOf(now, e.timeZone)
  const primary = primaryExam(rows)
  const exam = primary && ahead(primary) ? primary : liveExams(rows).find((e) => e.active && ahead(e))
  if (!exam) return null
  const examDay = parseDay(exam.examDate)
  const days = examDay - dayOf(now, exam.timeZone)
  const ms = Math.max(0, dayStart(examDay, exam.timeZone) - now)
  // inside the last seven days: days and hours to the start of the exam date
  const text = days <= 0 ? 'Today' : ms < 7 * DAY ? `${Math.floor(ms / DAY)}d ${Math.floor((ms % DAY) / HOUR)}h` : `${days} days`
  return { exam, days, text }
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
/** 24 MAY 2027 */
export const examDateText = (date: string) => `${+date.slice(8, 10)} ${MONTHS[+date.slice(5, 7) - 1]} ${date.slice(0, 4)}`

// ---- the queue ------------------------------------------------------------------------------
export type DueState = 'due' | 'overdue' | 'upcoming' | 'deferred'
export interface QueueItem {
  unit: RevisionUnit
  /** The number of the review that is next: R1, R2 … */
  ordinal: number
  dueDay: number
  /** deferred: due or overdue, put off to a later day by the learner. The due date itself is unchanged. */
  state: DueState
  /** Days past the original due date; 0 unless overdue. */
  overdueDays: number
  estimateMs: number
  /** Recovery ordering only. */
  priority: number
  subjectKey: string
  chapterKey: string
}
export interface QueueInput {
  units: Iterable<RevisionUnit>
  events: Iterable<RevisionEvent>
  today: number
  tz: string
  /** The primary exam, while it constrains scheduling. */
  exam?: ExamHorizon | null
  /** ★ Difficult on the section, and PYQs recorded against it. */
  flags?: (unitId: string) => { difficult?: boolean; pyq?: boolean }
}
export interface Recovery {
  recommended: QueueItem[]
  rest: QueueItem[]
}
export interface Queue {
  today: number
  medians: Medians
  /** Every scheduled unit (suspended ones are left out). */
  items: QueueItem[]
  /** What needs doing today: due today and overdue, minus what was deferred. */
  todayList: QueueItem[]
  /** Past their date, deferred or not, oldest first. */
  overdue: QueueItem[]
  upcoming: QueueItem[]
  completedToday: RevisionEvent[]
  recovery: Recovery | null
}

/** Recovery Mode starts when today's list is longer than this, or would take longer than RECOVERY_MAX_MS. */
export const RECOVERY_MIN_UNITS = 15
export const RECOVERY_MAX_MS = 90 * 60000
/** What Recovery Mode recommends for one day. */
export const RECOVERY_BUDGET_MS = 60 * 60000

/** The subject a unit is listed under. A Current Affairs note ("ca/<entryId>") has none: it is listed under Current Affairs. */
export const unitSubjectKey = (unitId: string) => (unitId.startsWith('ca/') ? 'current-affairs' : unitId.split('/', 2).join('/'))
const unitChapterKey = (u: RevisionUnit) => (u.target.kind === 'current-affairs' ? `current-affairs/${u.target.dayId}` : u.id.split('/', 3).join('/'))

const sum = (xs: QueueItem[]) => xs.reduce((n, x) => n + x.estimateMs, 0)
export const workloadMs = sum
const byDue = (a: QueueItem, b: QueueItem) => a.dueDay - b.dueDay || (a.unit.id < b.unit.id ? -1 : 1)

export function buildQueue({ units, events, today, tz, exam, flags }: QueueInput): Queue {
  const all = [...events]
  const medians = buildMedians(all)
  const items: QueueItem[] = []
  for (const unit of units) {
    if (unit.status === 'suspended' || !unit.dueDate) continue
    const dueDay = parseDay(unit.dueDate)
    const put = unit.deferredUntilDate ? parseDay(unit.deferredUntilDate) : 0
    const overdueDays = Math.max(0, today - dueDay)
    const state: DueState = dueDay > today ? 'upcoming' : put > today ? 'deferred' : overdueDays ? 'overdue' : 'due'
    const f = flags?.(unit.id) ?? {}
    const studied = dayOf(Date.parse(unit.initialStudyCompletedAt), tz)
    const [subject, chapter] = [unitSubjectKey(unit.id), unitChapterKey(unit)]
    items.push({
      unit, ordinal: unit.revisionCount + 1, dueDay, state, overdueDays,
      estimateMs: estimateMs(unit.id, medians),
      priority: priorityScore({
        risk: 1 - retrievability(unit.scheduler, today, tz, studied, unit.desiredRetention),
        overdueDays, scheduledDays: unit.scheduler.scheduledDays ?? 1, difficulty: unit.scheduler.difficulty,
        daysToExam: exam ? exam.examDay - today : undefined, difficult: !!f.difficult, pyq: !!f.pyq,
      }),
      subjectKey: subject, chapterKey: chapter,
    })
  }
  items.sort(byDue)
  const todayList = items.filter((i) => i.state === 'due' || i.state === 'overdue')
  const overdue = items.filter((i) => i.dueDay < today)
  const upcoming = items.filter((i) => i.state === 'upcoming')
  const completedToday = all.filter((e) => dayOf(Date.parse(e.completedAt), tz) === today).sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1))

  let recovery: Recovery | null = null
  if (todayList.length > RECOVERY_MIN_UNITS || sum(todayList) > RECOVERY_MAX_MS) {
    // highest priority first; ties fall back to the oldest due date, then the id — never to chance
    const ranked = [...todayList].sort((a, b) => b.priority - a.priority || byDue(a, b))
    const recommended: QueueItem[] = []
    let ms = 0
    for (const i of ranked) {
      if (recommended.length && ms + i.estimateMs > RECOVERY_BUDGET_MS) break
      recommended.push(i)
      ms += i.estimateMs
    }
    recovery = { recommended, rest: ranked.slice(recommended.length) }
  }
  return { today, medians, items, todayList, overdue, upcoming, completedToday, recovery }
}

export interface ChapterGroup {
  chapterKey: string
  subjectKey: string
  items: QueueItem[]
  ms: number
}
/** Sections under their chapter, chapters in the order their first section appears. */
export function byChapter(items: QueueItem[]): ChapterGroup[] {
  const out = new Map<string, ChapterGroup>()
  for (const i of items) {
    const g = out.get(i.chapterKey) ?? { chapterKey: i.chapterKey, subjectKey: i.subjectKey, items: [], ms: 0 }
    g.items.push(i)
    g.ms += i.estimateMs
    out.set(i.chapterKey, g)
  }
  return [...out.values()]
}

// ---- Home summary -----------------------------------------------------------------------------
export interface RevisionDaySummary {
  /** Units enrolled at all: with none, Home has nothing to say about revision. */
  enrolled: number
  dueCount: number
  dueMs: number
  overdueCount: number
  deferredCount: number
  completedToday: number
  /** Completed today + still to do today. */
  totalToday: number
  tomorrowCount: number
  tomorrowMs: number
  next7Count: number
  /** The next day with anything due, once today is clear. */
  next: { day: number; count: number; ms: number } | null
  recovery: { count: number; ms: number; rest: number } | null
}
export function daySummary(q: Queue): RevisionDaySummary {
  const done = new Set(q.completedToday.map((e) => e.revisionUnitId)).size
  const tomorrow = q.upcoming.filter((i) => i.dueDay === q.today + 1)
  const first = q.upcoming[0]
  const nextDay = first ? q.upcoming.filter((i) => i.dueDay === first.dueDay) : []
  return {
    enrolled: q.items.length,
    dueCount: q.todayList.length,
    dueMs: sum(q.todayList),
    overdueCount: q.todayList.filter((i) => i.state === 'overdue').length,
    deferredCount: q.items.filter((i) => i.state === 'deferred').length,
    completedToday: done,
    totalToday: done + q.todayList.length,
    tomorrowCount: tomorrow.length,
    tomorrowMs: sum(tomorrow),
    next7Count: q.upcoming.filter((i) => i.dueDay <= q.today + 7).length,
    next: first ? { day: first.dueDay, count: nextDay.length, ms: sum(nextDay) } : null,
    recovery: q.recovery ? { count: q.recovery.recommended.length, ms: sum(q.recovery.recommended), rest: q.recovery.rest.length } : null,
  }
}

// ---- calendar -----------------------------------------------------------------------------------
export interface CalendarDay {
  day: number
  date: string
  inMonth: boolean
  /** Due on this day (today or later). */
  due: QueueItem[]
  /** Was due on this day and has not been done. */
  overdue: QueueItem[]
  /** Put off to this day. */
  deferred: QueueItem[]
  completed: RevisionEvent[]
  exams: ExamRow[]
  ms: number
}
/** A Monday-to-Sunday month grid. Only each unit's current next review is shown: later ones do not exist yet. */
export function calendarMonth(q: Queue, events: Iterable<RevisionEvent>, exams: ExamRow[], year: number, month: number, tz: string): CalendarDay[] {
  const first = dayNo(year, month, 1)
  const last = dayNo(year, month + 1, 0)
  const from = weekStart(first)
  const to = weekStart(last) + 6
  const days = new Map<number, CalendarDay>()
  for (let d = from; d <= to; d++) days.set(d, { day: d, date: dateKey(d), inMonth: d >= first && d <= last, due: [], overdue: [], deferred: [], completed: [], exams: [], ms: 0 })
  for (const i of q.items) {
    const cell = days.get(i.dueDay)
    if (cell) (i.dueDay < q.today ? cell.overdue : cell.due).push(i)
    const put = i.state === 'deferred' ? days.get(parseDay(i.unit.deferredUntilDate!)) : undefined
    if (put) put.deferred.push(i)
  }
  for (const e of events) days.get(dayOf(Date.parse(e.completedAt), tz))?.completed.push(e)
  for (const x of exams) days.get(parseDay(x.examDate))?.exams.push(x)
  for (const c of days.values()) c.ms = sum(c.due) + sum(c.deferred) + (c.day === q.today ? sum(q.todayList.filter((i) => i.state === 'overdue')) : 0)
  return [...days.values()]
}
export const monthOf = (day: number) => {
  const c = civil(day)
  return { year: c.y, month: c.m }
}

// ---- analytics ----------------------------------------------------------------------------------
export interface RevisionStats {
  /** Reviews that came due: completed in the period, plus those waiting now. */
  scheduled: number
  completed: number
  /** completed ÷ scheduled; undefined when nothing was scheduled. */
  completionRate?: number
  onTime: number
  late: number
  /** Units past their date now. */
  backlog: number
  grades: Record<RevisionGrade, number>
  recall: { knew: number; missed: number; skipped: number }
  /** Completed reviews by ordinal: index 1 = R1 … index 5 = R5 and later. */
  byOrdinal: number[]
  upcoming7: { count: number; ms: number }
  upcoming30: { count: number; ms: number }
  bySubject: { subjectKey: string; units: number; completed: number; waiting: number; upcoming30: number }[]
}

/** Everything is counted from the records each time: no counter is kept anywhere. */
export function revisionStats(q: Queue, events: Iterable<RevisionEvent>, attempts: Iterable<RecallAttempt>, from: number, to: number): RevisionStats {
  const inPeriod = (iso: string) => {
    const t = Date.parse(iso)
    return t >= from && t < to
  }
  const done = [...events].filter((e) => inPeriod(e.completedAt))
  const grades: Record<RevisionGrade, number> = { again: 0, hard: 0, good: 0, easy: 0 }
  const byOrdinal = [0, 0, 0, 0, 0, 0]
  for (const e of done) {
    grades[e.grade]++
    byOrdinal[Math.min(5, Math.max(1, e.ordinal))]++
  }
  const recall = { knew: 0, missed: 0, skipped: 0 }
  for (const a of attempts) if (inPeriod(a.attemptedAt)) recall[a.outcome]++
  const waiting = q.items.filter((i) => i.dueDay <= q.today)
  const scheduled = done.length + waiting.length
  const within = (n: number) => q.upcoming.filter((i) => i.dueDay <= q.today + n)
  const subjects = new Map<string, RevisionStats['bySubject'][number]>()
  const row = (k: string) => subjects.get(k) ?? subjects.set(k, { subjectKey: k, units: 0, completed: 0, waiting: 0, upcoming30: 0 }).get(k)!
  for (const i of q.items) {
    const r = row(i.subjectKey)
    r.units++
    if (i.dueDay <= q.today) r.waiting++
    else if (i.dueDay <= q.today + 30) r.upcoming30++
  }
  for (const e of done) row(unitSubjectKey(e.revisionUnitId)).completed++
  return {
    scheduled,
    completed: done.length,
    completionRate: scheduled ? done.length / scheduled : undefined,
    onTime: done.filter((e) => e.overdueDays === 0).length,
    late: done.filter((e) => e.overdueDays > 0).length,
    backlog: q.overdue.length,
    grades,
    recall,
    byOrdinal,
    upcoming7: { count: within(7).length, ms: sum(within(7)) },
    upcoming30: { count: within(30).length, ms: sum(within(30)) },
    bySubject: [...subjects.values()].sort((a, b) => b.units - a.units || (a.subjectKey < b.subjectKey ? -1 : 1)),
  }
}
