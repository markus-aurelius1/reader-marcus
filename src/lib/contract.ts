// Reader v2 shared types — the subset of docs/READER_V2_CONTRACT.md that code uses so far.
// The contract document is the source of truth; add a type here only when something needs it.

export type ExamStage = 'prelims' | 'mains'

export type ContentKind = 'stage' | 'paper' | 'subject' | 'topic' | 'chapter' | 'section' | 'pyq'

export interface ContentRef {
  stage: ExamStage
  paperId?: string
  subjectId?: string
  topicId?: string
  chapterId?: string
  sectionId?: string
  taxonomyId?: string
  pyqId?: string
  kind: ContentKind
}

export interface NavigationNode {
  id: string
  kind: Exclude<ContentKind, 'pyq'>
  title: string
  parentId?: string
  childrenIds: string[]
  target: ContentRef
  order: number
}

export interface RecentDestination {
  target: ContentRef
  title: string
  visitedAt: string
}

// ---- study timer -------------------------------------------------------------

/** A timer always runs against a chapter, or a section inside it: ref.kind is "chapter" | "section". */
export interface StudyContext {
  ref: ContentRef
  subjectTitle: string
  topicTitle?: string
  chapterTitle: string
  sectionTitle?: string
}

export type StudyTimerState = 'running' | 'paused'

export interface StudySpan {
  id: string
  context: StudyContext
  startedAt: string
  endedAt: string
  /** Active study only; pause time excluded. */
  durationMs: number
}

/** Completed sessions are immutable and are the only source of study-time figures. */
export interface StudySession {
  id: string
  startedAt: string
  endedAt: string
  durationMs: number
  spans: StudySpan[]
  source: 'timer' | 'recovered'
  createdDeviceId: string
  /** IANA timezone at session creation. */
  timeZone: string
  createdAt: string
  syncedAt?: string
}

export interface ActiveStudySession {
  sessionId: string
  state: StudyTimerState
  startedAt: string
  currentContext: StudyContext
  /** Set while running. */
  currentSpanStartedAt?: string
  /** Time accumulated before the current running span. */
  accumulatedMs: number
  completedSpans: StudySpan[]
  ownerDeviceId: string
  updatedAt: string
  revision: number
  /** Started offline, without knowing whether another device already had a timer. */
  offlineProvisional?: boolean
}

export interface StudyTimerPreferences {
  trackingGranularity: 'chapter' | 'section'
  followNavigation: boolean
  longSessionReminderMinutes?: number
}

// ---- analytics: derived only, never stored or synced ---------------------------------

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface AnalyticsFilter {
  period: AnalyticsPeriod
  startAt?: string
  endAt?: string
  stage?: ExamStage
  paperId?: string
  subjectId?: string
  topicId?: string
  chapterId?: string
}

export interface TimeBucket {
  key: string
  label: string
  durationMs: number
}

export interface StudyDistribution {
  id: string
  label: string
  durationMs: number
  percent: number
}

/** Calculated from StudySession records (lib/analytics.ts). */
export interface StudyAnalytics {
  totalDurationMs: number
  sessionCount: number
  averageSessionMs: number
  longestSessionMs: number
  currentPeriodMs: number
  comparisonPeriodMs: number
  changeAbsoluteMs: number
  changePercent?: number
  dailySeries: TimeBucket[]
  byStage: StudyDistribution[]
  bySubject: StudyDistribution[]
  byTopic: StudyDistribution[]
  byChapter: StudyDistribution[]
}

export interface StudyHeatmapDay {
  date: string // YYYY-MM-DD
  durationMs: number
  sessionCount: number
}

// ---- progress and revision: derived from the existing reader state --------------------

export interface ProgressSummary {
  /** Chapters. */
  totalUnits: number
  notStarted: number
  reading: number
  revised: number
  mastered: number
  /** Sections marked done ÷ all sections — the reader's measure of completion. */
  completionPercent: number
}

export interface SubjectProgressSummary extends ProgressSummary {
  subjectId: string
  subjectTitle: string
  studyTimeMs: number
}

export interface RevisionSummary {
  difficultCount: number
  reviseCount: number
  targets: ContentRef[]
}

// ---- goals, queue, streak, dashboard ----------------------------------------------------

/** Opt-in. No target exists until the user sets one. */
export interface StudyGoal {
  id: 'default'
  enabled: boolean
  dailyTargetMs?: number
  weeklyTargetMs?: number
  updatedAt: string
}

export interface StudyQueueItem {
  id: string
  target: ContentRef
  title: string
  reason: 'manual' | 'revision' | 'difficult' | 'continue'
  order: number
  createdAt: string
  completedAt?: string
}

/** Derived from the days with study time. */
export interface StudyStreak {
  /** Consecutive local calendar days with study time, ending today (or yesterday, if nothing yet today). */
  currentDays: number
  longestDays: number
  lastStudyDate?: string // YYYY-MM-DD
}

/** Calculated at runtime (lib/dashboard.ts). Never stored or synced. */
export interface DashboardViewModel {
  todayStudyMs: number
  yesterdayStudyMs: number
  weekStudyMs: number
  previousWeekEquivalentMs: number
  activeSession?: ActiveStudySession
  prelimsProgress?: ProgressSummary
  mainsProgress?: ProgressSummary
  subjectProgress: SubjectProgressSummary[]
  heatmap: StudyHeatmapDay[]
  streak: StudyStreak
  revision: RevisionSummary
  recentTargets: RecentDestination[]
  queue: StudyQueueItem[]
}

// ---- cross-links: static content metadata, never synced -----------------------------------

export type CrossLinkRelation = 'related' | 'compare' | 'prerequisite' | 'see-also' | 'prelims-mains' | 'inter-subject' | 'pyq-note'

export interface CrossLink {
  id: string
  from: ContentRef
  to: ContentRef
  relation: CrossLinkRelation
  label?: string
  /** Short human-readable reason: "Finance Commission → Fiscal Federalism". */
  reason?: string
  weight?: number
  source: 'content' | 'manual' | 'derived'
}

// ---- PYQ hub ---------------------------------------------------------------------------

export type PyqExam = 'UPSC-CSE' | 'UPPCS'
export type PyqStatus = 'validated' | 'review-required' | 'demand-only'

/** Static, built from each subject's PYQ files (lib/pyq.ts). Never synced. */
export interface PyqHubRecord {
  pyqId: string
  exam: PyqExam
  year: number
  stage: ExamStage
  /** Question text is never fabricated: false until a subject actually carries it. */
  questionAvailable: boolean
  oneLiner?: string
  demandTags?: string[]
  linkedContent: ContentRef[]
  subjectIds: string[]
  topicIds: string[]
  status: PyqStatus
  dynamic?: boolean
}

/** The learner's own flags on a question: the only PYQ data that is stored and synced. */
export interface PyqUserState {
  pyqId: string
  seen?: boolean
  revised?: boolean
  difficult?: boolean
  updatedAt: string
}
