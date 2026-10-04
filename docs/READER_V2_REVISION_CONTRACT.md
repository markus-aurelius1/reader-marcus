# NOTES READER v2 — REVISION CONTRACT (Job 5.5)

> **Status: FROZEN** (2026-10-04). Companion to [`READER_V2_CONTRACT.md`](READER_V2_CONTRACT.md); its
> core principles all apply here. Change this document only when something genuinely requires it,
> and record the change in the Amendments table first.

Adaptive revision · Recall Engine v2 · exam targets · safe reset.

## Principles added by this contract

1. The schedulable unit is whatever the learner actually marks **Done**: a section.
2. **Completed revisions are immutable events.** A unit holds only its current schedule.
3. Only a unit's **next** due date exists. Later dates are decided after each review, never projected.
4. A missed date is never moved silently. Deferral and recovery change presentation, not history.
5. RecallUnits are **derived content metadata** — never stored as truth, never synced.
6. There is one timer. Revision is a kind of span inside it, not a second timer.
7. No memory score, no counter, no forecast is stored. Everything shown is derived on demand from
   `StudySession`, `RevisionUnit`, `RevisionEvent`, `RecallAttempt` and the existing progress state.
8. A reset must hold across devices: old offline data can never come back.
9. No XP, coins, levels, confetti, punitive streak warnings or forced quizzes while reading.

---

# DATA CONTRACT

```ts
// ------------------------------------------------------------
// REVISION SCHEDULING
// ------------------------------------------------------------

type RevisionGrade = "again" | "hard" | "good" | "easy";

type RevisionStatus =
  | "new"                    // enrolled, not yet reviewed
  | "active"
  | "suspended"              // set aside; not listed, history intact
  | "completed-exam-cycle";  // had its final-window review for the current primary exam

interface SchedulerSnapshot {
  difficulty?: number;
  stability?: number;

  // Retrievability is derived when needed (scheduler.retrievability); it is never stored.

  lastReviewAt?: string;
  scheduledDays?: number;     // the interval the scheduler itself chose (before any exam constraint)

  schedulerVersion: string;   // "fsrs:<ts-fsrs version>"
}

interface RevisionUnit {
  id: string;                 // the section key: stage/subject/chapter/section

  target: ContentRef;         // kind "section"
  title: string;

  status: RevisionStatus;

  enrolledAt: string;
  initialStudyCompletedAt: string;

  // Calendar date in the scheduler timezone. Never changed because it was missed.
  dueDate: string; // YYYY-MM-DD

  // Presentation only: hidden from Today until this date.
  deferredUntilDate?: string;

  revisionCount: number;
  lapseCount: number;

  scheduler: SchedulerSnapshot;

  desiredRetention: number;
  schedulerTimeZone: string;

  // The exam whose horizon set dueDate, when one did.
  examTargetId?: string;

  createdAt: string;
  updatedAt: string;
}

interface RevisionEvent {     // immutable
  id: string;

  revisionUnitId: string;
  target: ContentRef;

  ordinal: number;            // R1 = 1, R2 = 2 …

  scheduledDueDate: string;   // the date it was due on, as it stood

  startedAt: string;
  completedAt: string;

  overdueDays: number;        // 0 when on time or early

  grade: RevisionGrade;

  schedulerBefore: SchedulerSnapshot;
  schedulerAfter: SchedulerSnapshot;

  nextDueDate: string;

  studySessionId?: string;    // the timer session it was timed in, when it was
  durationMs: number;

  recallAttemptCount?: number;
  recallMissCount?: number;

  examTargetId?: string;

  deviceId: string;
  createdAt: string;
}

// ------------------------------------------------------------
// RECALL
// ------------------------------------------------------------

type RecallKind =
  | "term-definition" | "entity-role" | "date-event" | "cause-effect"
  | "comparison" | "list" | "process" | "law-provision"
  | "location" | "table-relation" | "trap" | "fact";

type RecallPriority = "normal" | "high" | "pyq" | "trap";
type RecallIntensity = "light" | "standard" | "exam";

interface RecallUnit {        // derived; never stored, never synced
  id: string;                 // <sectionKey>#<structuralPath>:<role>

  target: ContentRef;
  structuralPath: string;     // e.g. table[0]/tr[2]/td[1]

  kind: RecallKind;
  priority: RecallPriority;

  cueAnchorIds: string[];     // structural paths of what stays visible
  answerAnchorIds: string[];  // structural paths of what is concealed

  reversePromptAllowed: boolean;

  contentHash: string;        // of cue text + answer text
}

type RecallOutcome = "knew" | "missed" | "skipped";

interface RecallAttempt {     // immutable
  id: string;

  recallUnitId: string;
  contentHash: string;

  target: ContentRef;

  revisionUnitId?: string;
  revisionEventId?: string;

  outcome: RecallOutcome;

  attemptedAt: string;
  deviceId: string;
}

// ------------------------------------------------------------
// TIMER (amends READER_V2_CONTRACT.md)
// ------------------------------------------------------------

type StudyActivity = "initial-study" | "revision";

interface StudySpan {
  // existing fields…

  activity?: StudyActivity;   // absent = "initial-study"

  revisionUnitId?: string;
  revisionEventId?: string;
  revisionOrdinal?: number;   // R1 / R2 / R3 …
}

interface ActiveStudySession {
  // existing fields…

  // What the open span is spent on; absent = initial study.
  currentActivity?: {
    activity: StudyActivity;
    revisionUnitId?: string;
    revisionEventId?: string;
    revisionOrdinal?: number;
  };
}

// ------------------------------------------------------------
// EXAM TARGETS
// ------------------------------------------------------------

interface ExamTarget {
  id: string;

  name: string;
  shortName?: string;

  stage?: "prelims" | "mains" | "other";

  examDate: string; // YYYY-MM-DD
  timeZone: string;

  primary: boolean;
  active: boolean;

  finalRevisionWindowDays: number;

  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// PREFERENCES
// ------------------------------------------------------------

interface RevisionPreferences {
  id: "default";

  enabled: boolean;                    // default true

  desiredRetention: number;            // default 0.90, kept within 0.75 – 0.97

  recallIntensity: RecallIntensity;    // default "standard"

  guidedRevisionEnabled: boolean;      // default true

  examAwareScheduling: boolean;        // default true

  finalRevisionWindowDays: number;     // default 21; the default for a new exam target

  schedulerTimeZone: string;           // until chosen: the timezone of the device in hand

  updatedAt: string;
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------

type ResetScope = "study-history" | "full-personal";

interface UserDataEpoch {
  epoch: number;

  resetAt?: string;
  resetScope?: ResetScope;

  updatedAt: string;
}
```

---

# SCHEDULING

```text
Done (first time)
  ↓
RevisionUnit, status "new"
  ↓
R1 due the next calendar day            ← the bootstrap; the only fixed step
  ↓
the learner revises → Again / Hard / Good / Easy
  ↓
adaptive scheduler (FSRS)
  ↓
next due date → exam horizon check → effective due date
  ↓
R2 … (decided only when R1 is done)
```

There is **no** `1 → 3 → 7 → 14 → 30` ladder anywhere.

## Rules as built

```text
Scheduler        FSRS, through the maintained ts-fsrs package. Only lib/scheduler.ts imports it;
                 the app sees review(), retrievability() and plain numbers. Long-term mode: no
                 learning steps, no same-day relearning, no fuzz (the same review gives the same
                 date on every device). schedulerVersion "fsrs:<version>".

Unit             one section. RevisionUnit.id is the section key, so two devices that mark the
                 same section Done make the same unit: there is never a second enrolment.
Enrolment        on the transition not-done → done made on this device (not when a tick arrives
                 by sync — the unit arrives by sync too). status "new", dueDate = today + 1.
                 Nothing is enrolled while RevisionPreferences.enabled is false.
Done twice       no change. The existing unit stands.
Done unticked    no review yet  → status "suspended" (ticking again: "new", due the next day)
                 reviewed        → nothing changes; history is never undone by a tick.
★ / ↻            do not enrol. The manual pipeline (Revision → Manual) stays as it was.

Resolution       calendar days in RevisionPreferences.schedulerTimeZone. "Today" is the civil
                 day of the current instant there. Elapsed time between reviews is the difference
                 in calendar days. The next review is never earlier than the next calendar day.
Review           grade + the real number of days since the last review → FSRS → interval.
                 Early, on time and overdue reviews are all scheduled this way; an overdue review
                 is not penalised or "caught up", it is simply measured.
Lapse            Again on a unit that has been reviewed before. lapseCount + 1; back the next day.
Timezone change  rewrites no date. Due dates are calendar dates; only "today" moves.

Missed           dueDate stays. The unit reads OVERDUE · n DAYS until it is revised.
Defer today      sets deferredUntilDate = tomorrow. dueDate, overdue count and scheduler state
                 are untouched; the unit is hidden from Today until then. Cleared on review.
Event            written when the grade is given: scheduledDueDate is the unit's dueDate at that
                 moment, overdueDays = max(0, today − dueDate), ordinal = revisionCount + 1.
                 Events are frozen in memory, create-only in the cloud, never edited.
```

## Exam horizon

```text
FSRS due  →  exam horizon check  →  effective due
```

```text
Applies when     examAwareScheduling is on and there is a primary exam whose date is still ahead.
Leaves alone     any review that already falls before the exam date. Intervals are not shortened
                 in general.
Brings forward   a review that would fall on or after the exam: placed inside
                 [examDate − finalRevisionWindowDays, examDate − 1]. The day is chosen from the
                 unit id (hash mod window length), so units are spread across the window and a
                 unit always lands on the same day. RevisionUnit.examTargetId names the exam.
                 SchedulerSnapshot is not altered: scheduledDays stays what FSRS chose.
Final review     a review done inside the window is the last one before the exam: the unit takes
                 its FSRS date (after the exam) and status "completed-exam-cycle".
Exam edited /    units whose next review is still ahead are re-checked from their own scheduler
primary changed  state (reconstrain). A review already missed is never moved.
Exam passed      the constraint stops applying; nothing is rewritten.
```

## Priority (Recovery Mode only)

Recovery Mode starts when today's list has more than 15 units or would take more than 90 minutes.
It recommends units, highest priority first, up to 60 minutes; the rest is shown as backlog.

```text
priority = 0.40 · forgetting risk        1 − retrievability today
         + 0.20 · overdue severity       overdueDays ÷ max(7, scheduledDays), capped at 1
         + 0.15 · difficulty             (FSRS difficulty − 1) ÷ 9; 0.5 before the first review
         + 0.10 · exam proximity         1 − daysToExam ÷ 90, floor 0; 0 with no exam ahead
         + 0.15 · importance             ★ Difficult 0.5 + PYQs recorded against the section 0.5
ties     older due date first, then the unit id
```

A workload ordering only. It never changes a due date, a status or the scheduler state, and it is
not part of the memory model.

## Workload estimate

```text
the unit's own median revision duration
↓ the median of its subject
↓ the median of all revisions
↓ FALLBACK_REVISION_MS (5 minutes)
```

One function (`scheduler.estimateMs`). Revisions shorter than 30 seconds are not counted as samples.

---

# RECALL ENGINE v2

`lib/recall.ts → annotate(html, sectionKey)` returns the section's RecallUnits and the same HTML
with every answer wrapped. It runs on the effective content (the notes with the learner's edits),
is cached in memory per section, and is rebuilt whenever the text changes.

## Extraction

```text
explicit     {{answer}} in the notes (.rc)                 always kept, exactly as written
table        row heading (+ column heading) → each cell    one unit per answer cell
             answer → row heading                          two-column tables only (reverse prompt)
term         **Term** → fact · **Term**: fact · = · —      cue = the term
             `Art. 368` → provision                        kind law-provision
             **1947** — event                              kind date-event
arrow        cause → effect · step → step → step           cue = the left-hand side
list         a plain list under a heading or "…:"          cue = the lead-in
trap         a TRAP callout                                cue = the TRAP label
```

Not every sentence is a prompt: prose with no such structure yields no unit, and substrings of a
cell or sentence are never concealed on their own.

```text
id            <sectionKey>#<structuralPath>:<role>      role: rc · cell · def · effect · list · trap
              Built from where the answer sits, never from its text.
contentHash   of cue text + answer text. An edited answer keeps its id and changes its hash;
              RecallAttempts made against an older hash are ignored.
kind          from the cue, the column headings and the structure (lib/recall.ts → kinds).
priority      trap   inside a TRAP callout
              pyq    an explicit answer in a section that PYQs are recorded against
              high   any other explicit answer; a derived answer carrying ==high-yield== text
              normal everything else
```

## Intensity

```text
Light      explicit answers and traps (PYQ, trap and high priority)
Standard   + table cells and Term → fact lines                                    ← default
Exam       + arrows and plain lists; and where a derived answer contains explicit
             ones, the whole answer is concealed and they step aside
```

`unitsAt(items, intensity)` is the one rule; each wrapper carries `data-m` listing the intensities
at which it is concealed, so the reader's CSS and the prompt selection cannot disagree.

## Concealment

```html
<span class="rq" data-rid="…" data-lv="standard" data-m="standard exam"><span class="rq-a">answer</span></span>
```

A concealed answer is not rendered (`display: none`) and one fixed label, `[ RECALL ]`, stands in
its place: no blur, and nothing — width included — depends on the answer. A tap, Enter or Space
reveals the exact source content. Print always shows the answers. Wrappers add no text, so
highlights, search and export are unaffected.

Reading with Recall on asks for no grade and records nothing.

## Guided Revision

```text
prompts      selectPrompts(units at the chosen intensity, earlier RecallAttempts): at most 12,
             in the order of the notes.
             missed before (same contentHash)   → more likely to be asked
             PYQ / trap                         → more likely to be asked
             known twice running                → less likely to be asked
             skipped                            → says nothing
             No memory percentage is computed or kept.
card         the cue alone — the surrounding notes are not on the page. A unit cut from a
             sentence shows the sentence with every answer in it blanked.
reveal       then Knew · Missed · Skip (optional; each is one RecallAttempt). "Finish now" ends
             the prompts at any point.
grade        always exactly one question: "How well did you remember this?"
             Again | Hard | Good | Easy  → the scheduler.
no prompts   guided revision off, or a section with no recall units: the section is shown with
             its answers concealed, then the same question.
```

## Recall and Review Notes

A revision in progress has two views, and it is the same revision in both.

```text
Recall         #/revise/{unit} — the guided prompts above.
Review Notes   the unit's own notes in the ordinary reader (the whole chapter, opened at the
               section; a Current Affairs note on its own page) — editing, highlights,
               cross-links, search and navigation exactly as when studying.
bar            on both views while the revision is in progress:
                   Revision R2 · [Recall] [Review Notes] [Finish Revision]   ×
               Finish Revision   asks the one question — in Recall on its card, in the notes
                                 on the bar — and the grade writes the one RevisionEvent.
               ×                 leaves without a grade: no event, no change to the unit.
the same       unit id, event id, ordinal (fixed when the revision began), start time and
revision       recall answers. Switching views, browser Back and a reload change none of
               them; a second event is never written for one revision (the event id is the
               key, and a grade given twice returns the first event).
```

The revision in progress is kept by `lib/revisionRun.ts` (localStorage `upsc-revision-run`: unit,
event id, start, ordinal, timer context). It ends when it is graded, left with ×, replaced by
opening another unit's revision, or removed by a reset.

---

# TIMER

```text
Start a revision     no timer            → the one timer starts, in a revision span
                     timer running here  → the open span closes, a revision span opens; same
                                           timer, same session (a paused timer resumes)
                     timer on another    → left alone; the revision is not timed on this device
                     device                unless "Continue the timer here" is chosen
Next unit in a run   the span closes, the next unit's revision span opens
End of a run         a timer the run started is stopped and saved
                     a timer that was already running is paused (it does not go on counting)
Left without a grade no event, no change to the unit; the time already spent stays in its span;
                     the timer ends as at the end of a run (stopped and saved, or paused)
Reload               the revision in progress (unit, event id, start, ordinal, timer context) is
                     kept in localStorage "upsc-revision-run" — a convenience of that browser,
                     not study data
Review Notes         reading in the reader while a revision is in progress — its own notes, and
                     any chapter a link, search or the pager leads to — stays in the revision's
                     span: same unit, event id and ordinal. The timer does not follow the reader
                     back to initial study until the revision is graded or left.
Recall ⇄ Notes       never closes or opens a span, and never starts or resumes a timer: one that
                     was paused or stopped while reading the notes stays so. A timer started
                     from the reader during the revision times the revision.
```

`RevisionEvent.durationMs` is the active time of its revision spans when this device timed it,
otherwise the time the Guided Revision view was on screen.

Time figures follow the base contract: completed `StudySession` rows are the only source. A span is
initial study unless it carries `activity: "revision"`; `analytics.activityTime` reports

```text
Initial · R1 · R2 · R3 · R4 · R5+        overall, per subject, per chapter, per section
```

---

# EXAM TARGETS

```text
Several targets, exactly one primary among the active ones. The first active target becomes
primary; making another primary clears the rest; switching off or removing the primary promotes
the nearest active target. Two devices that each chose a primary while apart: the later choice
stands (primaryExam resolves by the timestamp of the field).

Countdown      the primary exam while it is ahead; after it, the nearest active exam that is.
               "232 DAYS" + the date. Inside the last seven days: "6d 14h". Never seconds.
Calendar       exam dates are events of their own.
Removal        a removed: true field on the stored row (a tombstone, so it reaches other devices).
```

---

# REVISION UI

```text
Revision                              #/revision
├── Today                             due today + overdue, minus deferred; Start Revision;
│                                     Recovery Mode; completed today
├── Overdue                           #/revision/overdue     incl. deferred, oldest first
├── Upcoming                          #/revision/upcoming    by day for 30 days, then "Later"
├── Calendar                          #/revision/calendar    Due · Completed · Overdue · Deferred · Exam
├── Manual                            #/revision/manual      ★ / ↻ sections (unchanged pipeline)
└── Analytics → Insights              #/insights/revision

Guided revision of one unit           #/revise/{stage}/{subject}/{chapter}/{section}     (Recall)
Its notes, while it is in progress    #/study/{stage}/{subject}/{chapter}/{section}      (Review Notes)
Settings                              #/settings             exam targets, revision, reset
```

Sections are grouped under their chapter, chapters under their subject. Home carries one compact
Revision card and, separately, the compact exam countdown.

Insights → Revision (all derived): scheduled, completed, completion %, on time, late, current
backlog, revision time, initial-study time and their ratio, Again / Hard / Good / Easy, Knew /
Missed, workload for 7 and 30 days, by subject, and the per-topic table Initial · R1 … R5+.

---

# RESET

```text
Reset Study History    removes   progress (done, chapter status, reading position), study
                                 sessions, the active timer, revision units and events, recall
                                 attempts, the study queue, PYQ flags, recent destinations
                       keeps     highlights, edits, ★ Difficult / ↻ Revise marks, favourites,
                                 appearance, goals, exam targets, revision preferences

Full Personal Reset    removes   all of the above and highlights, edits, ★ / ↻ marks, goals,
                                 favourites, sync conflicts
                       options   ☑ Keep exam targets   ☑ Keep appearance / settings   (default on)

Never removed          the notes, the static PYQ corpus, taxonomies, cross-links, the application.
```

Both need `RESET` typed. "Export backup first" saves everything personal on the device as JSON.

## Epoch

```text
users/{uid}/meta/dataEpoch   { epoch, floors: { study, flags, goals, notes, favourites, exams, settings },
                               resetAt, resetScope, updatedAt }
IndexedDB userDataEpoch      this device's copy, plus a reset that the cloud has not heard of yet
```

A reset wipes **groups** of records. `floors[group]` is the epoch at which the group was last wiped.

```text
group        record kinds
study        sec chap ses run q pyq ru rev ra cad    (+ recent destinations)
flags        the difficult / revise fields of sec~…  (kept, and sent again under the new
             epoch, when only "study" is wiped)
goals        goal
notes        edit hl cae
favourites   the favourites field of pref~main
exams        exam
settings     pref rpref
```

```text
On reset     1 this device: drop the groups — screen, IndexedDB, and their queued changes
             2 local-only: epoch + 1 here, floors raised                           (done)
               linked: the reset waits; at the next sync the cloud epoch is raised in one
               transaction and the device takes the result
             3 the cloud records the reset left behind are deleted (only records older than
               their group's floor, so this can run late or twice without harm)
             4 sync continues under the new epoch: every record pushed carries ep = epoch

Every sync   reads the epoch first.
             cloud epoch > this device's  → drop every group whose floor is above the device's
                                            epoch, and its queue, before anything is exchanged;
                                            then adopt the cloud epoch
             a cloud record with ep < its group's floor → ignored, and overwritten when written
             a cloud record with ep > this device's epoch → the push stops and the sync starts
                                            again from the epoch
First sign-in a device that was never linked to the account adopts its epoch without dropping
             anything: local data is merged, as before.
```

So a device that was offline through a reset discards its stale study state on reconnecting, sends
none of it, and anything it did manage to write earlier is inert. Records written by a build that
knew no epochs carry no `ep` and count as epoch 0.

---

# STORAGE

```text
IndexedDB (v6, added beside the existing stores; nothing existing is read or rewritten)
├── revisionUnits          key id (section key)
├── revisionEvents         key id         immutable
├── recallAttempts         key id         immutable
├── examTargets            key id         + removed, + field timestamps
├── revisionPreferences    one row, id "default"
└── userDataEpoch          one row, key "current"
```

```text
Firestore                                       sync record            merge
users/{uid}/revisionUnits/{id}                  ru~<sectionKey>        newest wins, as a whole
users/{uid}/revisionEvents/{id}                 rev~<eventId>          written once
users/{uid}/recallAttempts/{id}                 ra~<attemptId>         written once
users/{uid}/examTargets/{id}                    exam~<id>              field by field
users/{uid}/revisionPreferences/default         rpref~default          field by field
users/{uid}/meta/dataEpoch                      meta~dataEpoch         raised by a reset only
```

Document ids replace `/` with `|` (a section key contains slashes). The same record envelope as
every other synced record, plus `ep`.

Two devices that complete the same revision while apart: both events are kept (each is immutable
and has its own id; two events may share an ordinal), and the unit takes the state of the later
review.

### Never sync

```text
RecallUnit definitions
derived calendars
revision forecasts
revision analytics
Dashboard models
static notes
```

## Migration

Nothing is enrolled by the upgrade. Sections marked Done before this feature stay as they are;
"Schedule existing completed topics" (Settings) enrols them on request, ten per day from tomorrow.

---

# AMENDMENTS

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-04 | Contract created with Job 5.5 as built | — |
| 2026-10-04 | `StudyActivity` gains `"current-affairs"` (Job 5.6) | Reading the news is a third kind of span of the one timer |
| 2026-10-04 | `RevisionUnit.target`, `RevisionEvent.target`, `RecallAttempt.target` are `ContentRef | CurrentAffairsRef`; a unit may be `ca/<entryId>`, revised at `#/revise/ca/<entryId>` and listed under "Current Affairs" | Job 5.6: a Current Affairs note enters revision only by "Add to Revision", in this scheduler — never a second one |
| 2026-10-04 | A unit can be set aside (`suspended`) after reviews, when its note is deleted | The note is gone; its completed revisions stay as history |
| 2026-10-04 | Reset groups: `cad` (Current Affairs day records) in `study`; `cae` (Current Affairs notes) in `notes` | Study History reset clears the day record and keeps the learner's notes; Full reset removes both |
| 2026-10-04 | A revision has two views, Recall and Review Notes, under one bar (`Revision Rn · Recall · Review Notes · Finish Revision · ×`); while it is in progress the timer stays in its revision span wherever the reader goes; it can be left without a grade explicitly; `lib/revisionRun.ts` holds the revision in progress | A scheduled revision was limited to the recall cards, which test only part of a topic; rereading the notes used to turn the time back into initial study |
