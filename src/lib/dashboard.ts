// The Home dashboard's view model. Pure: built on every render from the study index (completed
// sessions), the reader's progress state, the queue and the goal. Nothing in it is stored or
// synced, and no figure is calculated anywhere else — study time comes from lib/analytics.ts,
// progress from store.progressSummary.
import type { Chapter, Section, Subject } from './content'
import type { ActiveStudySession, ContentRef, DashboardViewModel, ExamStage, RecentDestination, StudyGoal, StudyQueueItem, SubjectProgressSummary, TimeBucket } from './contract'
import { compare, dayOf, goalStreak, heatmap, period, series, streak, weekStart, type Comparison, type StudyIndex } from './analytics'
import { chapterProgress, progressSummary, type Progress, type ProgressDetail, type SectionState, type Status } from './store'

/** Weeks shown in the Home heatmap (the full year is on Insights → Time). */
export const HEATMAP_WEEKS = 13
/** Revision rows shown on Home. */
export const REVISION_ROWS = 5

export interface DashboardInput {
  ix: StudyIndex
  now: number
  subjects: Subject[]
  progress: Progress
  recents: RecentDestination[]
  /** Queue items still in the queue, in queue order. */
  queue: StudyQueueItem[]
  active: ActiveStudySession | null
  goal: StudyGoal | null
}

export interface ResumeTarget {
  subject: Subject
  chapter: Chapter
  section?: Section
  done: number
  total: number
  status: Status
}
export interface SubjectCard extends SubjectProgressSummary {
  key: string
  stage: string
  sectionsDone: number
  sectionsTotal: number
  /** End of the latest timed study on the subject. */
  lastStudiedAt?: number
  /** The chapter of this subject opened most recently. */
  resumeChapterKey?: string
}
export interface StageCard {
  id: string
  subjects: number
  progress: ProgressDetail
}
export interface GoalProgress {
  targetMs: number
  doneMs: number
  percent: number
  met: boolean
}
export interface RevisionRow {
  subject: Subject
  chapter: Chapter
  section: Section
  ref: ContentRef
  state: SectionState
  /** When the section (or, failing that, its chapter) was last timed. */
  lastStudiedAt?: number
}

export interface DashboardModel extends DashboardViewModel {
  hasSessions: boolean
  today: Comparison
  week: Comparison
  /** Monday to Sunday of the current week. */
  weekSeries: (TimeBucket & { title: string })[]
  resume: ResumeTarget | null
  stages: StageCard[]
  subjectProgress: SubjectCard[]
  goals: { daily?: GoalProgress; weekly?: GoalProgress; dailyStreak: number }
  /** Flagged sections, longest since studied first. */
  revisionRows: RevisionRow[]
  queueOpen: StudyQueueItem[]
  queueDone: StudyQueueItem[]
}

const sectionRef = (c: Chapter, s: Section): ContentRef => {
  const [stage, subjectId] = c.key.split('/')
  return { kind: 'section', stage: stage as ExamStage, subjectId, topicId: c.topicId, chapterId: c.id, sectionId: s.id }
}
const goalProgress = (targetMs: number | undefined, doneMs: number): GoalProgress | undefined =>
  targetMs && targetMs > 0 ? { targetMs, doneMs, percent: Math.min(100, Math.round((doneMs / targetMs) * 100)), met: doneMs >= targetMs } : undefined

export function buildDashboard({ ix, now, subjects, progress, recents, queue, active, goal }: DashboardInput): DashboardModel {
  const tz = ix.tz
  const today = compare(ix, 'day', now)
  const week = compare(ix, 'week', now)
  const last = dayOf(now, tz)

  // where the reader was left
  let resume: ResumeTarget | null = null
  for (const subject of subjects) {
    const chapter = progress.last && subject.chapters.find((c) => c.key === progress.last!.chapterKey)
    if (!chapter) continue
    const cp = chapterProgress(progress, chapter)
    resume = { subject, chapter, section: chapter.sections.find((x) => x.id === progress.chapters[chapter.key]?.section), ...cp }
    break
  }

  const stageIds = [...new Set(subjects.map((s) => s.stage))]
  const stages: StageCard[] = stageIds.map((id) => {
    const list = subjects.filter((s) => s.stage === id)
    return { id, subjects: list.length, progress: progressSummary(progress, list.flatMap((s) => s.chapters)) }
  })

  const subjectProgress: SubjectCard[] = subjects.map((s) => {
    const { sectionsDone, sectionsTotal, difficult: _d, revise: _r, ...summary } = progressSummary(progress, s.chapters)
    const opened = s.chapters.map((c) => ({ key: c.key, at: progress.chapters[c.key]?.at ?? 0 })).filter((c) => c.at > 0).sort((a, b) => b.at - a.at)[0]
    return { ...summary, sectionsDone, sectionsTotal, subjectId: s.id, subjectTitle: s.title, key: s.key, stage: s.stage, studyTimeMs: ix.total.get(s.key) ?? 0, lastStudiedAt: ix.last.get(s.key), resumeChapterKey: opened?.key }
  })

  const flagged: RevisionRow[] = []
  for (const subject of subjects)
    for (const chapter of subject.chapters)
      for (const section of chapter.sections) {
        const state = progress.sections[section.key]
        if (state?.difficult || state?.revise) flagged.push({ subject, chapter, section, ref: sectionRef(chapter, section), state, lastStudiedAt: ix.last.get(section.key) ?? ix.last.get(chapter.key) })
      }
  // stable: sections never timed come first, in library order
  const revisionRows = flagged.map((r, i) => ({ r, i })).sort((a, b) => (a.r.lastStudiedAt ?? 0) - (b.r.lastStudiedAt ?? 0) || a.i - b.i).map((x) => x.r)

  const daily = goal?.enabled ? goalProgress(goal.dailyTargetMs, today.currentMs) : undefined
  const weekly = goal?.enabled ? goalProgress(goal.weeklyTargetMs, week.currentMs) : undefined

  return {
    hasSessions: ix.sessions.length > 0,
    today,
    week,
    todayStudyMs: today.currentMs,
    yesterdayStudyMs: today.comparisonMs,
    weekStudyMs: week.currentMs,
    previousWeekEquivalentMs: week.comparisonMs,
    weekSeries: series(ix, period('week', now, tz).buckets),
    ...(active ? { activeSession: active } : {}),
    resume,
    stages,
    prelimsProgress: stages.find((s) => s.id === 'prelims')?.progress,
    mainsProgress: stages.find((s) => s.id === 'mains')?.progress,
    subjectProgress,
    heatmap: heatmap(ix, weekStart(last) - (HEATMAP_WEEKS - 1) * 7, last),
    streak: streak(ix, now),
    goals: { daily, weekly, dailyStreak: daily ? goalStreak(ix, now, daily.targetMs) : 0 },
    revision: { difficultCount: flagged.filter((r) => r.state.difficult).length, reviseCount: flagged.filter((r) => r.state.revise).length, targets: flagged.map((r) => r.ref) },
    revisionRows,
    recentTargets: recents,
    queue,
    queueOpen: queue.filter((q) => !q.completedAt),
    queueDone: queue.filter((q) => q.completedAt).sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1)),
  }
}
