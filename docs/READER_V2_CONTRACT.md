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

  // The stage of the subjects that record the question. Prelims today;
  // a Mains subject with PYQ files needs no further change.
  stage: ExamStage;

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

/*
Units are chapters: the four counts are chapters by status.
completionPercent is sections marked done ÷ all sections — the reader's
existing measure of completion.
*/
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
├── studyGoals              one row, id "default"
├── studyQueue              one row per item
├── pyqUserState            one row per flagged question, key pyqId
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
                 Goals and queue items use the envelope's field form { id, kind, t, dev, f, st }
                 (kind "goal" / "q"): see "Dashboard rules as built".
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

## Analytics rules as built (Job 3)

```text
Source           completed StudySession rows only (src/lib/analytics.ts, pure). Nothing is stored:
                 no counters, no analytics store, no synced aggregate. The one cache is an
                 in-memory index rebuilt whenever the sessions change. A timer that is still
                 running is not in any figure until it is stopped.

Study time       a span counts from startedAt for durationMs — active study only, so a pause
                 never appears in any total, chart or heatmap day.
Overlap          spans that overlap in wall-clock time (two devices at once, or the same record
                 twice) count once; the overlapping stretch belongs to the span that began first.
                 A session with no time left of its own is not counted as a session.

Timezone         the IANA zone of the device showing the figures (not the zone stored on each
                 session): one calendar for every period, bucket and heatmap day. Day boundaries
                 are local midnights, correct across DST changes.
Midnight         a span crossing local midnight is cut there; each day gets its own part.
Week             Monday to Sunday.

Period so far ↔ comparison
  today          midnight → now          ↔ the whole of yesterday
  week           Monday → now            ↔ last week's Monday → same weekday, same time into the day
  month          the 1st → now           ↔ last month's 1st → same day of the month, same time
  year           1 January → now         ↔ last year's 1 January → same date, same time
                 "Same time" is the time elapsed since local midnight, never past the end of
                 that day. Where the earlier month has no such day (the 31st; 29 February) the
                 comparison runs to the end of that month.
Change           absolute difference always. A percentage only when the comparison period has
                 at least one minute of study; otherwise it is left out and the page says so in
                 words. Never ∞, never NaN.

Sessions         a session belongs to the period in which it ended and is counted at its full
                 length (a session crossing midnight is one session, not two).
                 average = total ÷ count; longest = the longest of them.
Active days      local calendar days with any study time.
Filters          stage / paper / subject / topic / chapter (AnalyticsFilter). Inside a filter a
                 session counts only its time in that scope.
Attribution      by the span's own StudyContext; time tracked by section counts towards its
                 chapter, topic, subject and stage.
Last studied     the end of the latest span on that section / chapter / subject.
```

## Dashboard rules as built (Job 4)

```text
View model       DashboardViewModel is built on every render by buildDashboard (src/lib/dashboard.ts,
                 pure) from the study index, the reader's progress state, the queue and the goal.
                 Home calculates nothing itself and stores nothing: no totals, no streak, no
                 goal progress, no view model — on disk or in the cloud.
Study time       the Job 3 functions, unchanged: today ↔ yesterday, week-to-date ↔ the same
                 elapsed part of last week. A running timer is shown on Home but is not in any
                 figure until it is stopped.
Heatmap          the last 13 Monday–Sunday weeks, ending today (the full year is Insights → Time).

Streak           consecutive local calendar days with any study time, ending today — or
                 yesterday while nothing has been studied yet today. longestDays over all time.
Goal streak      consecutive days on which study time reached the daily target, ending today —
                 or yesterday while today is still short of it. Measured against the target as
                 it is now; earlier targets are not kept.

Goals            opt-in. No StudyGoal exists until the user sets a target, and no target is
                 suggested. enabled = at least one target is set; removing both keeps the
                 record with enabled false (so the removal syncs).
                 daily progress  = today's study time ÷ dailyTargetMs
                 weekly progress = this week's study time so far ÷ weeklyTargetMs

Queue            StudyQueueItem rows; target is a chapter or a section. One waiting item per
                 target. reason: "continue" (the chapter in progress, added from Home),
                 "revision" / "difficult" (added from a flagged section), "manual" (added in
                 the reader).
order            ascending; a new item goes last. Moving an item gives it an order between its
                 new neighbours, so a reorder rewrites one record, not the list.
Complete         sets completedAt; the item leaves the waiting list and can be put back.
Remove           a removed: true field on the stored row (a tombstone, so it reaches other
                 devices). StudyQueueItem itself is unchanged; removed rows are never listed.

Sync             goal~default and q~<itemId> are merged field by field, like progress and
                 preferences: the newest change to each field wins, so completing an item on
                 one device and reordering it on another both survive. updatedAt of a goal is
                 the newest field timestamp.
```

## PYQ Hub and cross-link rules as built (Job 5)

```text
PyqHubRecord     built once per page load by buildPyqIndex (src/lib/pyq.ts, pure) from each subject's
                 pyq.json (IDs under the Source Pack's demand labels, generated) and pyq-meta.json
                 (flags + demand label → sections, curated). Never stored, never synced.
Identity         one record per canonical ID. A question listed by several chapters or subjects is
                 one record whose linkedContent, subjectIds and topicIds name all of them.
Text             questionAvailable is false and oneLiner is absent unless the content carries them.
                 oneLiner comes from an optional pyq-oneliners.json per subject ({ pyqId: text });
                 nothing else changes when it appears. No placeholder is ever shown.
demandTags       the pack's own demand labels. Bookkeeping labels ("General", "Review flags",
                 "Cross-linked", exclusions) are not demand and are not shown as tags.
linkedContent    section refs where pyq-meta.json maps the label to sections, otherwise the chapter.
status           validated unless the pack flags the ID. Across subjects the strictest wins:
                 review-required > demand-only > validated. dynamic is independent of status.
                 The pack's wording for the flag is kept beside the record (index.notes).

PyqUserState     seen / revised / difficult. IndexedDB pyqUserState (key pyqId); cloud
                 users/{uid}/pyqState/{pyqId} as pyq~<pyqId>, field form { id, kind, t, dev, f, st },
                 merged field by field. A cleared flag is a field with value null.
                 updatedAt is the newest field timestamp.

CrossLink        buildLinks (src/lib/links.ts, pure), built once per page load. Sources: a link in
                 the notes (section → target), a chapter's related: line (chapter → target), a
                 question's linkedContent (pyq → note). source is "content" for all three.
id               <from key> ">" <to key>
relation         derived from the two ends:  pyq → note            pyq-note
                                             different stages       prelims-mains
                                             different subjects     inter-subject
                                             same subject, chapter-level related:   see-also
                                             same subject, in the text              related
                 compare / prerequisite are reserved for a link that states it; none does yet.
Backlinks        never stored. The index keeps each link once and looks it up from either end.
Related          lists notes linked in either direction, each place once, destinations first;
                 links inside one chapter are indexed but not listed.

Hub filter       the query string of #/pyqs. Changing a filter replaces the address (no history
                 entry), so Back leaves the hub in one step and Forward / Back return to it as it was.
```

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
#/pyqs                                          PYQ Hub — Prelims
#/pyqs?stage=&exam=&year=&subject=&topic=       PYQ Hub filtered; every parameter optional
       &chapter=&section=&status=&mine=&q=&id=    (subject / topic / chapter / section are content ids)
#/insights                                      Insights → Overview
#/insights/{time|subjects|progress|revision}    Insights tabs
#/highlights                                    Highlights
```

Earlier links keep working and are rewritten in place (no extra history entry):

```text
#/s/{stage}/{subject}[/pyq|/insights]   → #/study/{stage}/{subject}[?tab=…]
#/r/{stage}/{subject}/{chapter}[/…]     → #/study/{stage}/{subject}/{chapter}[/…]
#/progress                              → #/insights/progress
#/revision                              → #/insights/revision
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
| 2026-10-03 | Routes: `#/insights/{tab}`; `#/progress` → `#/insights/progress`; `#/revision` becomes an alias of `#/insights/revision` | Job 3: Insights has five tabs; Progress and the Revision queue live inside it, so each has one address |
| 2026-10-03 | "Analytics rules as built"; `ProgressSummary` units documented | Job 3 fixed the calculation rules the contract left open (timezone used, week start, overlap, session attribution, percentage rule); types unchanged |
| 2026-10-03 | "Dashboard rules as built": streak and goal-streak rules, goal semantics, queue order / completion / removal, field-merged `goal` and `q` records | Job 4 built Home, the study queue and goals; a removal has to reach other devices, and two devices must be able to change one queue item without losing either change. Types unchanged |
| 2026-10-04 | `PyqHubRecord.stage` is `ExamStage` (was the literal `"prelims"`) | Job 5: the hub must take Mains questions later without another redesign |
| 2026-10-04 | "PYQ Hub and cross-link rules as built"; `#/pyqs` query parameters; `pyqUserState` row key | Job 5 fixed what the contract left open: how records, status, relations and backlinks are derived, and where the hub filter lives. No other type changed |
| 2026-10-03 | "Timer rules as built": span ids, stopped marker in `studyRuntime/active`, record envelope for study documents, meaning of `source: "recovered"`, two-device reconciliation | Job 2 needed a deterministic, loss-free rule for timers that diverge offline; types unchanged |
