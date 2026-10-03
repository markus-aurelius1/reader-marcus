# NOTES READER v2 — FROZEN ARCHITECTURE

> **Status: FROZEN** (2026-10-03). This contract is the shared reference for all Reader v2 work.
> Change it only when something genuinely requires it, and record the change here first.

## Core principles

1. Existing notes/content architecture remains intact.
2. Existing Firebase + IndexedDB local-first sync remains intact.
3. Never store analytics counters as authoritative data.
4. **Completed study sessions are the source of truth for time analytics.**
5. Only one timer may be active globally for a user.
6. Analytics are derived from sessions + existing progress state.
7. Static navigation/cross-links/PYQ metadata are content data, not cloud user state.
8. All routes and relationships use stable IDs.
9. Desktop and mobile get different navigation presentations, not squeezed versions of each other.
10. No XP/coins/childish gamification. Use progress, streaks, heatmaps, goals and visual feedback instead.

---

# FROZEN DATA CONTRACT

```ts
// ============================================================
// READER V2 — SHARED DATA CONTRACT
// ============================================================

type ExamStage = "prelims" | "mains";

type ContentKind =
  | "stage"
  | "paper"
  | "subject"
  | "topic"
  | "chapter"
  | "section"
  | "pyq";

// ------------------------------------------------------------
// CONTENT REFERENCES
// ------------------------------------------------------------

interface ContentRef {
  stage: ExamStage;

  // Mainly for Mains: GS1, GS2, GS3, GS4, SOC1 etc.
  paperId?: string;

  // Required for every kind except "stage" and "paper".
  subjectId?: string;

  topicId?: string;
  chapterId?: string;
  sectionId?: string;

  taxonomyId?: string;

  // Required when kind === "pyq"; the canonical PyqHubRecord.pyqId.
  pyqId?: string;

  kind: ContentKind;
}

/*
Identity of a ContentRef (its stable key):

  stage                                  "prelims"
  paper                                  "mains~gs1"
  subject                                "prelims/polity"
  topic                                  "prelims/polity~foundations"
  chapter                                "prelims/polity/parliament"
  section                                "prelims/polity/parliament/budget"
  pyq                                    "pyq:<pyqId>"

Subject / chapter / section keys are exactly the stage/subject/chapter/section
keys the v1 reader already stores progress, edits and highlights under.
paperId, topicId and taxonomyId never change the identity of a subject,
chapter or section; they are context only.
*/

/*
A timer always runs against a chapter, or a section inside it
(see StudyTimerPreferences.trackingGranularity). So ref.kind is
"chapter" | "section", ref.chapterId is set, and chapterTitle is required.
*/
interface StudyContext {
  ref: ContentRef;

  subjectTitle: string;
  topicTitle?: string;
  chapterTitle: string;
  sectionTitle?: string;
}

// ------------------------------------------------------------
// STUDY TIMER
// ------------------------------------------------------------

type StudyTimerState = "running" | "paused";

interface StudySpan {
  id: string;

  context: StudyContext;

  startedAt: string;
  endedAt: string;

  // Active study only; pause time excluded.
  durationMs: number;
}

interface StudySession {
  id: string;

  startedAt: string;
  endedAt: string;

  durationMs: number;

  // Allows one timer run to cross chapters while preserving
  // correct subject/topic/chapter attribution.
  spans: StudySpan[];

  source: "timer" | "recovered";

  createdDeviceId: string;

  // IANA timezone at session creation.
  timeZone: string;

  createdAt: string;
  syncedAt?: string;
}

/*
Completed StudySession records are immutable.

Analytics must derive from them rather than maintaining
separate cumulative counters.
*/

interface ActiveStudySession {
  sessionId: string;

  state: StudyTimerState;

  startedAt: string;

  // Running span.
  currentContext: StudyContext;
  currentSpanStartedAt?: string;

  // Time accumulated before current running span.
  accumulatedMs: number;

  completedSpans: StudySpan[];

  ownerDeviceId: string;

  updatedAt: string;
  revision: number;

  /*
  Used only if a device starts while offline and cannot know
  whether another device already owns an active timer.
  */
  offlineProvisional?: boolean;
}

// ------------------------------------------------------------
// TIMER PREFERENCES
// ------------------------------------------------------------

interface StudyTimerPreferences {
  // Default: chapter.
  trackingGranularity: "chapter" | "section";

  // If true, moving to another tracked reader unit while timer
  // runs closes the previous span and starts another automatically.
  followNavigation: boolean;

  // Optional reminder only; never auto-stop study.
  longSessionReminderMinutes?: number;

  updatedAt: string;
}

// ------------------------------------------------------------
// STUDY GOALS
// ------------------------------------------------------------

interface StudyGoal {
  id: "default";

  enabled: boolean;

  dailyTargetMs?: number;
  weeklyTargetMs?: number;

  updatedAt: string;
}

// ------------------------------------------------------------
// STUDY QUEUE
// ------------------------------------------------------------

interface StudyQueueItem {
  id: string;

  target: ContentRef;
  title: string;

  reason:
    | "manual"
    | "revision"
    | "difficult"
    | "continue";

  order: number;

  createdAt: string;
  completedAt?: string;
}

// ------------------------------------------------------------
// NAVIGATION
// ------------------------------------------------------------

interface NavigationNode {
  id: string;

  kind:
    | "stage"
    | "paper"
    | "subject"
    | "topic"
    | "chapter"
    | "section";

  title: string;

  parentId?: string;
  childrenIds: string[];

  target: ContentRef;

  order: number;
}

/*
NavigationNode is generated from content metadata.
Do not sync it to Firestore.
*/

interface RecentDestination {
  target: ContentRef;
  title: string;
  visitedAt: string;
}

interface NavigationPreferences {
  favouriteTargets: ContentRef[];

  recentTargets: RecentDestination[];

  updatedAt: string;
}

// ------------------------------------------------------------
// CROSS-LINKING
// ------------------------------------------------------------

type CrossLinkRelation =
  | "related"
  | "compare"
  | "prerequisite"
  | "see-also"
  | "prelims-mains"
  | "inter-subject"
  | "pyq-note";

interface CrossLink {
  id: string;

  from: ContentRef;
  to: ContentRef;

  relation: CrossLinkRelation;

  label?: string;

  /*
  Optional short human-readable reason:
  "Finance Commission → Fiscal Federalism"
  */
  reason?: string;

  weight?: number;

  source: "content" | "manual" | "derived";
}

/*
CrossLinks are static reader/content metadata.
They are not personal user state and should not be synced.
*/

// ------------------------------------------------------------
// PYQ HUB
// ------------------------------------------------------------

type PyqExam = "UPSC-CSE" | "UPPCS";

interface PyqHubRecord {
  pyqId: string;

  exam: PyqExam;
  year: number;

  stage: "prelims";

  /*
  Preserve canonical identity.
  Do not fabricate question text.
  */
  questionAvailable: boolean;

  oneLiner?: string;

  demandTags?: string[];

  linkedContent: ContentRef[];

  subjectIds: string[];
  topicIds: string[];

  status:
    | "validated"
    | "review-required"
    | "demand-only";

  dynamic?: boolean;
}

interface PyqUserState {
  pyqId: string;

  seen?: boolean;
  revised?: boolean;
  difficult?: boolean;

  updatedAt: string;
}

// ------------------------------------------------------------
// ANALYTICS — DERIVED ONLY
// ------------------------------------------------------------

type AnalyticsPeriod =
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

interface AnalyticsFilter {
  period: AnalyticsPeriod;

  startAt?: string;
  endAt?: string;

  stage?: ExamStage;
  paperId?: string;
  subjectId?: string;
  topicId?: string;
  chapterId?: string;
}

interface TimeBucket {
  key: string;
  label: string;
  durationMs: number;
}

interface StudyDistribution {
  id: string;
  label: string;
  durationMs: number;
  percent: number;
}

interface StudyAnalytics {
  totalDurationMs: number;

  sessionCount: number;
  averageSessionMs: number;
  longestSessionMs: number;

  currentPeriodMs: number;
  comparisonPeriodMs: number;

  changeAbsoluteMs: number;
  changePercent?: number;

  dailySeries: TimeBucket[];

  byStage: StudyDistribution[];
  bySubject: StudyDistribution[];
  byTopic: StudyDistribution[];
  byChapter: StudyDistribution[];
}

/*
StudyAnalytics MUST be calculated from StudySession records.

A local cache is allowed for performance, but it must be
fully regenerable and never treated as authoritative.
*/

// ------------------------------------------------------------
// HEATMAP
// ------------------------------------------------------------

interface StudyHeatmapDay {
  date: string; // YYYY-MM-DD
  durationMs: number;
  sessionCount: number;
}

// ------------------------------------------------------------
// STREAK — DERIVED FROM THE HEATMAP DAYS
// ------------------------------------------------------------

interface StudyStreak {
  // Consecutive local calendar days with study time, ending today
  // (or yesterday, if nothing has been studied yet today).
  currentDays: number;
  longestDays: number;

  lastStudyDate?: string; // YYYY-MM-DD
}

// ------------------------------------------------------------
// PROGRESS — DERIVED FROM EXISTING READER STATE
// ------------------------------------------------------------

interface ProgressSummary {
  totalUnits: number;

  notStarted: number;
  reading: number;
  revised: number;
  mastered: number;

  completionPercent: number;
}

interface SubjectProgressSummary extends ProgressSummary {
  subjectId: string;
  subjectTitle: string;

  studyTimeMs: number;
}

// ------------------------------------------------------------
// REVISION
// ------------------------------------------------------------

interface RevisionSummary {
  difficultCount: number;
  reviseCount: number;

  targets: ContentRef[];
}

// ------------------------------------------------------------
// DASHBOARD — VIEW MODEL ONLY
// ------------------------------------------------------------

interface DashboardViewModel {
  todayStudyMs: number;
  yesterdayStudyMs: number;

  weekStudyMs: number;
  previousWeekEquivalentMs: number;

  activeSession?: ActiveStudySession;

  prelimsProgress?: ProgressSummary;
  mainsProgress?: ProgressSummary;

  subjectProgress: SubjectProgressSummary[];

  heatmap: StudyHeatmapDay[];
  streak: StudyStreak;

  revision: RevisionSummary;

  recentTargets: RecentDestination[];

  queue: StudyQueueItem[];
}

/*
DashboardViewModel is calculated at runtime.
Never persist it as authoritative state.
*/
```

## Storage contract

```text
IndexedDB
│
├── existing reader stores
│   ├── edits
│   ├── highlights
│   ├── progress
│   ├── preferences
│   ├── outbox
│   └── conflicts
│
├── studySessions
├── activeStudySession
├── studyGoals
├── studyQueue
├── pyqUserState
└── optionalAnalyticsCache   ← regenerable only
```

Preferred conceptual Firestore layout:

```text
users/{uid}/studySessions/{sessionId}

users/{uid}/studyRuntime/active

users/{uid}/studyGoals/default

users/{uid}/studyQueue/{itemId}

users/{uid}/pyqState/{pyqId}
```

If the existing sync abstraction has a cleaner compatible equivalent, reuse it rather than rewriting working Firebase code.

### Preferences

`NavigationPreferences` and `StudyTimerPreferences` are not separate stores. They are fields of the
existing preferences record, next to theme / recall / collapsed:

```text
local    localStorage "upsc-prefs"
cloud    users/{uid}/state/pref~main      (existing sync record, merged field by field)

fields   favourites   ← NavigationPreferences.favouriteTargets
         recents      ← NavigationPreferences.recentTargets (newest first, capped)
         timer        ← StudyTimerPreferences (added with the timer)
```

Their `updatedAt` is the per-field timestamp the existing sync already keeps for every
preference field; it is not stored a second time.

### Never sync

```text
NavigationNode
CrossLink
PyqHubRecord
DashboardViewModel
StudyAnalytics
ProgressSummary
StudyStreak
heatmap aggregates
static notes
source packs
```

These are either static content or derived data.

---

# TIMER SEMANTICS

```text
START
  ↓
ActiveStudySession
  ↓
navigate to another chapter while running
  ↓
close current StudySpan
  ↓
start new StudySpan
  ↓
PAUSE
  ↓
no time counted
  ↓
RESUME
  ↓
new active segment
  ↓
STOP
  ↓
immutable StudySession
  ↓
IndexedDB
  ↓
Firebase sync
  ↓
Analytics derived later
```

Only **one active timer per user**.

If another device detects an active timer:

```text
Study timer already running
Economic Concepts · 42:18

[Continue here] [Open topic]
```

`Continue here` transfers timer ownership without creating a second session.

If a device starts offline and discovers an overlapping active cloud timer later:

- never discard either record;
- flag the provisional session;
- preserve the time;
- resolve deterministically or surface a minimal conflict;
- no silent data loss.

## Timer rules as built (Job 2)

```text
Elapsed time     accumulatedMs + (now − currentSpanStartedAt) while running. Always derived from
                 timestamps, so a reload, a closed browser or another device shows the same figure.

Span             one unbroken stretch of active study on one tracked unit. Pause, a change of
                 tracked unit and a change of owner each close the open span.
Span id          <ownerDeviceId>-<start time>. Two copies of one timer that drifted apart still
                 agree on the spans they share.

Session          written on Stop from the closed spans. durationMs = sum of span durations.
                 Under one second of study: nothing is written.
source           "timer"      Stop
                 "recovered"  ended at the moment the app was last open (unattended stretch left
                              out), or split off while reconciling two devices (below)

studyRuntime/active   holds the ActiveStudySession, or once it stops a marker
                      { sessionId, revision, ownerDeviceId, updatedAt, spanIds }
                      so that other devices learn the timer ended.

Cloud documents  the existing sync record envelope { id, kind, t, dev, rev?, del?, data, st }
                 with data = the contract object; kind "ses" (create-only) and "run".
```

Only the owning device changes the timer. Any other device shows it and offers
**Continue here**, which closes the open span, makes this device the owner and carries on in the
same session.

When two devices changed the timer without seeing each other (a device was offline):

```text
this device has no timer running      → take the cloud's state
cloud timer already ended, ours is a  → ours becomes the active timer
  different session
anything else (two live timers, or    → the cloud timer stands — it is the one other devices follow.
  two versions of one timer)            Spans recorded only on this device are written as a
                                        "recovered" session (<sessionId>_<deviceId> when it is a
                                        version of the same session) and synced like any other.
same session completed on two devices → the copy already in the cloud stands (sessions are
                                        immutable); the other device keeps its extra spans as
                                        <sessionId>_<deviceId>.
```

No branch discards recorded time. Where two devices really did run at once, their sessions
overlap in wall-clock time; analytics must treat overlapping spans as one stretch.

---

# ANALYTICS COMPARISON RULES

Avoid misleading comparisons.

```text
Today
↔ Yesterday

Week-to-date
↔ same elapsed portion of previous week

Month-to-date
↔ same elapsed portion of previous month

Year-to-date
↔ same elapsed portion of previous year
```

All calendar aggregation must be timezone-aware.

Pause time is excluded.

Sessions crossing midnight must be split correctly across heatmap/date buckets.

---

# NAVIGATION INFORMATION ARCHITECTURE

Desktop primary rail:

```text
Home
Study
PYQ Hub
Insights
Highlights
────────
Search / ⌘K
```

Study explorer:

```text
Prelims
  Polity
  Economy
  History & Culture
  Geography
  ...

Mains
  GS1
  GS2
  GS3
  GS4
```

Do **not** display every chapter from every subject permanently.

Only the active branch expands.

Reader header:

```text
breadcrumbs
chapter title
timer
subject switcher
Prev / Next
Related
```

Mobile primary navigation:

```text
Home
Study
PYQs
Insights
More
```

`More` contains Highlights, settings, account/sync and secondary actions.

---

# ROUTES

Hash routes, built only by `href` in `src/lib/router.ts`. Every path segment is a stable content id.

```text
#/                                              Home
#/study                                         Study explorer (library)
#/study/{stage}                                 one stage
#/study/{stage}/{subject}                       subject overview   (?tab=pyq | insights)
#/study/{stage}/{subject}/{chapter}             reader
#/study/{stage}/{subject}/{chapter}/{section}   reader at a section (?h= | ?q= | ?resume)
#/pyqs                                          PYQ Hub
#/insights                                      Insights (includes Progress)
#/highlights                                    Highlights
#/revision                                      Revision queue
```

v1 links keep working and are rewritten in place (no extra history entry):

```text
#/s/{stage}/{subject}[/pyq|/insights]   → #/study/{stage}/{subject}[?tab=…]
#/r/{stage}/{subject}/{chapter}[/…]     → #/study/{stage}/{subject}/{chapter}[/…]
#/progress                              → #/insights
```

---

# AMENDMENTS

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-03 | `ContentRef.pyqId` added; `ContentRef.subjectId` optional for `stage` / `paper`; identity keys documented | A `pyq` ref could not name its question; a stage or paper has no subject |
| 2026-10-03 | `StudyContext` restricted to chapter / section refs (comment only) | Explains why `chapterTitle` is required |
| 2026-10-03 | Preferences storage section | `NavigationPreferences` / `StudyTimerPreferences` had no storage home |
| 2026-10-03 | `StudyStreak` added (derived), `DashboardViewModel.streak`, added to Never sync | Principle 10 names streaks; no type existed |
| 2026-10-03 | Routes section | Job 1 fixed the stable routes |
| 2026-10-03 | "Timer rules as built": span ids, stopped marker in `studyRuntime/active`, record envelope for study documents, meaning of `source: "recovered"`, two-device reconciliation | Job 2 needed a deterministic, loss-free rule for timers that diverge offline; types unchanged |
