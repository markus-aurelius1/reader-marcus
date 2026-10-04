// Adaptive revision scheduling. Pure: no I/O, no clock of its own — every function takes the
// calendar day it is asked about. docs/READER_V2_REVISION_CONTRACT.md → Scheduling.
// Unit-tested in scheduler.test.ts.
//
// The memory model is FSRS, through the maintained ts-fsrs package. Nothing outside this file
// touches that package: the application sees review(), retrievability() and plain numbers.
//
// A learning unit is a whole section of notes, not a flashcard, so everything here works in
// calendar days in the scheduler timezone: no learning steps, no same-day relearning, and the
// next review is never earlier than the next calendar day.
import { FSRSVersion, Rating, State, createEmptyCard, fsrs, generatorParameters, type Card, type FSRS } from 'ts-fsrs'
import type { RevisionEvent, RevisionGrade, SchedulerSnapshot } from './contract'
import { dateKey, dayNo, dayOf } from './analytics'

const DAY = 86400000
export const SCHEDULER_VERSION = `fsrs:${FSRSVersion}`
export const DEFAULT_RETENTION = 0.9
export const RETENTION_RANGE: [number, number] = [0.75, 0.97]
export const DEFAULT_FINAL_WINDOW_DAYS = 21
/** Used until a unit, its subject or the learner has any revision of their own to go by. */
export const FALLBACK_REVISION_MS = 5 * 60000
/** A shorter revision than this says nothing about how long one takes (opened and closed at once). */
export const MIN_ESTIMATE_SAMPLE_MS = 30000
export const GRADES: RevisionGrade[] = ['again', 'hard', 'good', 'easy']

export const clampRetention = (r: number) => (Number.isFinite(r) ? Math.min(RETENTION_RANGE[1], Math.max(RETENTION_RANGE[0], r)) : DEFAULT_RETENTION)

/** YYYY-MM-DD → day number (days since 1970-01-01 of that civil date). */
export const parseDay = (date: string) => dayNo(+date.slice(0, 4), +date.slice(5, 7), +date.slice(8, 10))
export { dateKey, dayOf }
/** The calendar day an ISO instant falls on in `tz`. */
export const dayOfIso = (iso: string, tz: string) => dayOf(Date.parse(iso), tz)

/** Deterministic 32-bit string hash (FNV-1a): spreads units over a window, names content versions. */
export function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// ---- the FSRS adapter ----------------------------------------------------------------
const RATING: Record<RevisionGrade, Rating.Again | Rating.Hard | Rating.Good | Rating.Easy> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy }
const engines = new Map<number, FSRS>()
function engine(retention: number): FSRS {
  const r = clampRetention(retention)
  let f = engines.get(r)
  // no fuzz: the same review always gives the same date, on every device
  if (!f) engines.set(r, (f = fsrs(generatorParameters({ request_retention: r, enable_fuzz: false, enable_short_term: false }))))
  return f
}
// ts-fsrs counts elapsed days between two instants. Noon UTC of a day number makes that count
// exactly the difference in calendar days, whatever the timezone of the device.
const at = (day: number) => new Date(day * DAY + DAY / 2)

export interface ReviewInput {
  /** State before this review; a unit never reviewed has no stability yet. */
  scheduler: SchedulerSnapshot
  revisionCount: number
  lapseCount: number
  grade: RevisionGrade
  /** The calendar day of the review in the scheduler timezone. */
  today: number
  tz: string
  retention: number
  /** The instant of the review, stored as lastReviewAt. */
  nowIso: string
}
export interface ReviewResult {
  after: SchedulerSnapshot
  /** Days until the next review as FSRS sets them: at least 1. */
  intervalDays: number
  lapse: boolean
}

/** One review. The interval FSRS chooses depends on the real time since the last review and the grade. */
export function review(i: ReviewInput): ReviewResult {
  const f = engine(i.retention)
  const s = i.scheduler
  let card: Card
  if (s.stability === undefined || s.difficulty === undefined || !s.lastReviewAt) card = createEmptyCard(at(i.today))
  else {
    // a review can never be before the previous one, even if the timezone changed in between
    const last = Math.min(i.today, dayOfIso(s.lastReviewAt, i.tz))
    card = { due: at(last + (s.scheduledDays ?? 1)), stability: s.stability, difficulty: s.difficulty, elapsed_days: i.today - last, scheduled_days: s.scheduledDays ?? 1, reps: i.revisionCount, lapses: i.lapseCount, learning_steps: 0, state: State.Review, last_review: at(last) }
  }
  const next = f.next(card, at(i.today), RATING[i.grade]).card
  const intervalDays = Math.max(1, Math.round(next.scheduled_days))
  return {
    after: { difficulty: next.difficulty, stability: next.stability, lastReviewAt: i.nowIso, scheduledDays: intervalDays, schedulerVersion: SCHEDULER_VERSION },
    intervalDays,
    lapse: i.grade === 'again' && i.revisionCount > 0,
  }
}

/**
 * Estimated probability of recall today. Derived when needed, never stored.
 * A unit not reviewed yet is treated as one day of stability from the day it was studied.
 */
export function retrievability(s: SchedulerSnapshot, today: number, tz: string, studiedDay: number, retention = DEFAULT_RETENTION): number {
  const f = engine(retention)
  if (s.stability === undefined || !s.lastReviewAt) return f.forgetting_curve(Math.max(0, today - studiedDay), 1)
  return f.forgetting_curve(Math.max(0, today - dayOfIso(s.lastReviewAt, tz)), s.stability)
}

// ---- exam horizon ---------------------------------------------------------------------
export interface ExamHorizon {
  id: string
  /** Day number of the exam date. */
  examDay: number
  windowDays: number
}
export interface Horizon {
  due: number
  /** Set when the exam, not FSRS, decided the date. */
  examTargetId?: string
  /** This review was itself the final-window review: nothing more is forced before the exam. */
  cycleDone?: boolean
}

/**
 * FSRS due → exam horizon check → effective due. Intervals are not shortened in general: only a
 * unit whose next review would fall on or after the exam is brought forward, into the final
 * window [examDay − windowDays, examDay − 1], on a day chosen from its id so that units are
 * spread across the window instead of piling onto one date.
 */
export function examHorizon(fsrsDue: number, today: number, exam: ExamHorizon | null | undefined, unitId: string): Horizon {
  if (!exam || exam.examDay <= today || fsrsDue < exam.examDay) return { due: fsrsDue }
  const start = exam.examDay - Math.max(1, exam.windowDays)
  if (today >= start) return { due: fsrsDue, examTargetId: exam.id, cycleDone: true }
  const span = exam.examDay - start // days start … examDay − 1
  return { due: start + (hash32(unitId) % span), examTargetId: exam.id }
}

// ---- workload ---------------------------------------------------------------------------
export interface Medians {
  unit: Map<string, number>
  subject: Map<string, number>
  global?: number
}
const median = (xs: number[]) => {
  if (!xs.length) return undefined
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const subjectOf = (unitId: string) => unitId.split('/', 2).join('/')

/** Median revision durations by unit, by subject and overall, from the completed reviews. */
export function buildMedians(events: Iterable<RevisionEvent>): Medians {
  const unit = new Map<string, number[]>()
  const subject = new Map<string, number[]>()
  const all: number[] = []
  for (const e of events) {
    if (!(e.durationMs >= MIN_ESTIMATE_SAMPLE_MS)) continue
    const push = (m: Map<string, number[]>, k: string) => (m.get(k) ?? m.set(k, []).get(k)!).push(e.durationMs)
    push(unit, e.revisionUnitId)
    push(subject, subjectOf(e.revisionUnitId))
    all.push(e.durationMs)
  }
  const med = (m: Map<string, number[]>) => new Map([...m].map(([k, v]) => [k, median(v)!]))
  return { unit: med(unit), subject: med(subject), global: median(all) }
}

/** The unit's own median → its subject's → the learner's → the one fallback. */
export const estimateMs = (unitId: string, m: Medians) => m.unit.get(unitId) ?? m.subject.get(subjectOf(unitId)) ?? m.global ?? FALLBACK_REVISION_MS

// ---- recovery priority -------------------------------------------------------------------
/** Documented in the contract. A workload ordering only: it never changes a date or FSRS state. */
export const PRIORITY_WEIGHTS = { risk: 0.4, overdue: 0.2, difficulty: 0.15, exam: 0.1, importance: 0.15 } as const
export interface PriorityInput {
  /** 1 − retrievability. */
  risk: number
  overdueDays: number
  scheduledDays: number
  /** FSRS difficulty 1 – 10; undefined before the first review. */
  difficulty?: number
  /** Days to the primary exam; undefined when there is none ahead. */
  daysToExam?: number
  difficult: boolean
  pyq: boolean
}
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
export function priorityScore(p: PriorityInput): number {
  const w = PRIORITY_WEIGHTS
  return (
    w.risk * clamp01(p.risk) +
    w.overdue * clamp01(p.overdueDays / Math.max(7, p.scheduledDays)) +
    w.difficulty * (p.difficulty === undefined ? 0.5 : clamp01((p.difficulty - 1) / 9)) +
    w.exam * (p.daysToExam === undefined ? 0 : clamp01(1 - p.daysToExam / 90)) +
    w.importance * ((p.difficult ? 0.5 : 0) + (p.pyq ? 0.5 : 0))
  )
}
