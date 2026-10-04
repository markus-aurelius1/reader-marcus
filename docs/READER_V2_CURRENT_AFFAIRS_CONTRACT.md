# NOTES READER v2 — CURRENT AFFAIRS CONTRACT (Job 5.6)

> **Status: FROZEN** (2026-10-04). Companion to [`READER_V2_CONTRACT.md`](READER_V2_CONTRACT.md) and
> [`READER_V2_REVISION_CONTRACT.md`](READER_V2_REVISION_CONTRACT.md); their principles all apply here.
> Change this document only when something genuinely requires it, and record the change in the
> Amendments table first.

Daily news study: a day-by-day record, the learner's own current-affairs notes, and the time spent.
Not a news feed: nothing is fetched, scraped or summarised.

## Principles added by this contract

1. There is one timer. Reading the news is a kind of span inside it (`current-affairs`), not a second timer.
2. **No duration is stored on a day.** Reading time is always derived from `StudySession` spans.
3. A day is complete only when the learner says so. Timer activity never completes a day, and
   completion never requires a note or any reading time.
4. A missed day keeps its own date. Catching it up records when that really happened.
5. Excused is its own state. It is never counted as completed.
6. Current Affairs time is an **activity**, not a subject. A note may link to Polity; its reading
   time is still `current-affairs`.
7. A note enters spaced revision only when the learner asks ("Add to Revision"). There is no second
   revision system.
8. Calm: no XP, coins, confetti, streak warnings, modal reminders or red guilt states.

---

# DATA CONTRACT

```ts
// ------------------------------------------------------------
// TIMER (amends READER_V2_CONTRACT.md / READER_V2_REVISION_CONTRACT.md)
// ------------------------------------------------------------

type StudyActivity = "initial-study" | "revision" | "current-affairs";

/** What a Current Affairs span, or a revised Current Affairs note, is about. No exam stage. */
interface CurrentAffairsRef {
  kind: "current-affairs";
  dayId: string;      // YYYY-MM-DD, the news day
  entryId?: string;   // a note of that day
}

type StudyRef = ContentRef | CurrentAffairsRef;

interface StudyContext {
  ref: StudyRef;            // was ContentRef
  subjectTitle: string;     // "Current Affairs" for a CurrentAffairsRef
  topicTitle?: string;
  chapterTitle: string;     // the day ("Sat 4 Oct 2026"), or the note's title
  sectionTitle?: string;
}

interface StudySpan {
  // existing fields…
  activity?: StudyActivity;        // absent = "initial-study"

  currentAffairsDayId?: string;    // the news day the reading was for
  currentAffairsEntryId?: string;
}

interface ActiveStudySession {
  // existing fields…
  currentActivity?: {
    activity: StudyActivity;
    revisionUnitId?: string; revisionEventId?: string; revisionOrdinal?: number;
    currentAffairsDayId?: string; currentAffairsEntryId?: string;
  };
}

// ------------------------------------------------------------
// DAILY RECORD
// ------------------------------------------------------------

type CurrentAffairsDayStatus =
  | "pending"
  | "completed"
  | "missed"
  | "caught-up"
  | "excused";

interface CurrentAffairsDay {
  id: string;         // YYYY-MM-DD in the study timezone
  date: string;       // the same date
  timeZone: string;   // the study timezone when the record was made

  status: CurrentAffairsDayStatus;

  firstStartedAt?: string;
  completedAt?: string;    // when it was marked complete — on the day, or later
  caughtUpAt?: string;     // = completedAt, when that fell on a later calendar day

  excusedAt?: string;      // "Excuse this day"
  reopenedAt?: string;     // "Undo": completion / excuse before this instant no longer count

  createdAt: string;
  updatedAt: string;
}
// No duration field. Reading time comes from StudySession spans.

// ------------------------------------------------------------
// NOTES
// ------------------------------------------------------------

interface CurrentAffairsEntry {
  id: string;
  dayId: string;

  title: string;

  sourceName?: string;
  sourceUrl?: string;        // http(s) only

  noteDocumentId: string;    // "ca/<id>": the note body, stored as a reader edit (edit~ca/<id>)

  tags?: string[];
  linkedContentRefs: ContentRef[];   // subject · chapter · section · pyq

  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// REVISION (amends READER_V2_REVISION_CONTRACT.md)
// ------------------------------------------------------------

interface RevisionUnit  { target: StudyRef /* was ContentRef */ }
interface RevisionEvent { target: StudyRef }
interface RecallAttempt { target: StudyRef }
// A Current Affairs note in revision is the unit "ca/<entryId>", target CurrentAffairsRef.
```

---

# DAY STATE

```text
Study timezone   RevisionPreferences.schedulerTimeZone — the one calendar for due dates and news
                 days. "Today" is the civil day of the current instant there. A day id is that
                 date; a timezone change rewrites no record, only "today" moves.

Record           made lazily, by the first deliberate act on a day: Start Reading, Mark Complete,
                 Excuse. Adding a note does not make one. Nothing is pre-created. The id is the
                 date, so two devices acting on one day make one record.

status           a function of the record and the calendar (currentAffairsModel.statusOf):

                 completedAt later than reopenedAt   → completed    its date ≤ the news day
                                                       caught-up    its date is a later day
                 else excusedAt later than reopenedAt → excused
                 else the news day is before today    → missed
                 else                                  → pending

                 The stored `status` is that value as last evaluated. The first evaluation after
                 the day has passed writes pending → missed: at app start, and when the day
                 changes while Home, Current Affairs or its Insights tab is open. What is shown
                 never waits for that write — it is derived with today's date each time.
                 Completing a missed day writes caught-up with completedAt = caughtUpAt = the
                 real instant; `date` is never changed.

A day without    today → pending · later → not yet · earlier, on or after the tracking start →
a record         missed · earlier than that → not tracked (no status, never counted).
Tracking start   the calendar day on which the earliest existing day record was created.
                 Derived, not stored: years of absent days cost nothing, and a Study History
                 reset — which removes the day records — starts tracking afresh.

Undo             sets reopenedAt. The day is pending or missed again; nothing else is erased.
Excuse           sets excusedAt. Marking the day complete later overrides it.
Completion       allowed for today and any earlier day; never for a future day. It needs no note
                 and no reading time. Marking a day complete stops and saves a timer of this
                 device that is reading that day.
```

## Two devices

```text
kind "cad" — one record per day, merged by rule (currentAffairsModel.mergeDay), not by "newest wins":

  reopenedAt       the later
  completedAt      the earliest that is later than reopenedAt   ← the day was done when it was first done
  excusedAt        the latest that is later than reopenedAt
  firstStartedAt   the earlier        createdAt  the earlier        updatedAt  the later
  status           re-derived; once missed, missed until completed or excused

The merge is commutative and idempotent: both devices reach the same record whatever the order.
A day completed on time on one device and "caught up" offline on another stays completed.
```

---

# TIMER

```text
Start Reading        no timer            → the one timer starts in a current-affairs span
                     timer running here  → the open span closes, a current-affairs span opens;
                                           same timer, same session (a paused timer resumes).
                                           So Study → Current Affairs and Revision → Current
                                           Affairs are a change of span, never a second timer.
                     timer on another    → left alone. "Continue here" takes it over into a
                     device                current-affairs span, by the ownership rules of Job 2.
Pause / Resume /     the global timer's own actions.
Stop
Leaving              the span stays open until the timer is paused, stopped or moved. With
                     "Follow the chapter I am reading" on, opening a chapter moves the timer to
                     that chapter as initial study (Current Affairs → Study).
Midnight             a span keeps the news day it was started for. Analytics cut it at local
                     midnight like any span; the Today view of the new day offers "Read today's".
Span id / session    unchanged. A current-affairs span carries activity, currentAffairsDayId and,
                     when started from a note, currentAffairsEntryId.
Revising a note      activity "revision" with a CurrentAffairsRef context: revision time, not
                     current-affairs time.
```

Reading time of a news day = the active time of every span whose `currentAffairsDayId` is that day —
completed sessions (`StudyIndex.caByDay`) plus, on the Current Affairs pages and the Home card only,
the spans of a timer still running. Every Insights figure counts completed sessions only, as before.

---

# ANALYTICS

```text
Activity         every slice of study time is exactly one of
                   initial-study   no activity on the span
                   revision        activity "revision"
                   current-affairs activity "current-affairs"
                 Summary.byActivity and activityTime().currentAffairsMs report them.
Totals           today / yesterday, week, month, year, heatmaps, streaks and goals count all three.
Subject figures  a span with a CurrentAffairsRef has no stage, subject, topic or chapter: it is in
                 no subject distribution and matches no stage / subject filter, whatever its notes
                 link to. Scope { activity } selects one activity.

Period figures   over the days from..to of the study calendar, never past today:
  elapsed        days in the period
  completed      completed on the day
  caughtUp       completed on a later day
  missed
  excused
  pending        today, while not completed
  eligible       completed + caughtUp + missed          (excused, pending and untracked days left out)
  consistency    (completed + caughtUp) ÷ eligible      absent when eligible = 0
  onTime         completed ÷ eligible                   shown beside consistency, never instead of it
  study time     current-affairs time inside the period by the clock
  average        study time ÷ days in the period with any current-affairs time
  notes          entries whose news day is in the period

Streak           consecutive covered days (completed or caught-up), ending today or — while today
                 is pending — yesterday. An excused day is skipped: it neither counts nor breaks.
                 A missed or untracked day ends the run.
```

Day states follow the study timezone. Time figures follow the base contract: windows, buckets and
heatmap days are those of the device showing them.

Nothing above is stored. `StudyIndex` is the same regenerable in-memory cache as before.

---

# HOME

```text
A compact card under the hero, built by currentAffairsModel.homeCard. Local hour = the study timezone.

  today complete                    ✓ CURRENT AFFAIRS COMPLETE · Today · 43 min · 2 notes
  a current-affairs span running    Today · 24 min · Reading now                [ Continue ]
  today excused                     Excused today                               (one quiet line)
  07:00 or later, not complete      Today's news is waiting · 0 min read        [ Start Reading ]
  before 07:00                      no card — unless today's reading was already started or a
                                    note written, then the 07:00 card
  + missed days in the last 7       "1 missed day"                              [ Catch Up ]

Evaluated when Home is shown and each minute while it stays open. No OS / push notification.
```

---

# NOTES, LINKS, SEARCH, REVISION

```text
Body             the existing rich editor and the existing edit pipeline: an edit record under the
                 key "ca/<entryId>" (IndexedDB overrides, cloud edit~ca/<id>, conflict-checked like
                 any edited section). Metadata is the CurrentAffairsEntry, merged field by field.
Delete           removed: true on the entry (a tombstone) and the body reset; a revision unit of
                 the note is set aside.

Links            linkedContentRefs, chosen by the learner from search results. Stable ContentRefs,
                 resolved against the library when shown: a renamed place shows its new title, one
                 no longer in the library is not listed (the ref is kept). No keyword auto-linking.
Backlinks        derived (currentAffairsModel.notesLinking). Shown in a chapter's Related panel.

Search           Cmd-K: Current Affairs destinations, dates ("4 oct", "2026-10-04", "yesterday"),
                 and notes by title, text, tag, source name and linked destination. Results are
                 tagged Current Affairs / CA note / CA date beside Section, In text, PYQ …
                 Source URLs are not indexed.

Add to Revision  explicit. Makes the RevisionUnit "ca/<entryId>" (status new, R1 the next day) in
                 the Job 5.5 scheduler; revised at #/revise/ca/<entryId> like any unit.
```

---

# UI AND ROUTES

```text
#/current-affairs                     Today
#/current-affairs/calendar[?d=date]   month grid: ✓ completed · × missed · ● today/pending ·
                                      ↺ caught-up · ○ excused; the selected day below
#/current-affairs/notes[?tag=]        every note, newest first
#/current-affairs/archive[?m=YYYY-MM] one month, newest day first: 04 Oct ✓ 43 min 2 notes
#/current-affairs/day/{date}          one day
#/current-affairs/note/{entryId}      one note
#/insights/current-affairs            analytics
#/revise/ca/{entryId}                 scheduled revision of a note

Desktop rail     Home · Study · PYQ Hub · Insights · Revision · Current Affairs · Highlights
Phone            the five tabs are unchanged; Current Affairs is in More.
```

---

# RESET

```text
group     record kinds
study     + cad     day records. With the sessions (ses) this is the whole completion, missed,
                    caught-up and streak state; revision units of notes (ru) go with it too.
notes     + cae     the notes: entries, tags, source links, linked refs. Their bodies are
                    edit~ca/<id>, already in this group.

Reset Study History   removes day records and all current-affairs study time; keeps the notes.
Full Personal Reset   removes the notes as well.
```

Every Current Affairs record is pushed with `ep` like any other; a device that was offline through a
reset drops the wiped groups before it exchanges anything and cannot bring them back.

---

# STORAGE

```text
IndexedDB (v7, added beside the existing stores; nothing existing is read or rewritten)
├── currentAffairsDays      key id (YYYY-MM-DD)
└── currentAffairsEntries   key id          + removed, + field timestamps
```

```text
Firestore                                       sync record        merge
users/{uid}/currentAffairsDays/{dayId}          cad~<dayId>        by rule (above)
users/{uid}/currentAffairsEntries/{entryId}     cae~<entryId>      field by field
users/{uid}/state/edit~ca|<entryId>             edit~ca/<entryId>  conflict-checked (existing)
```

UI → IndexedDB → outbox → cloud, like everything else; nothing waits on the network.

### Never sync

```text
reading time per day, consistency, streaks, calendars, archive rows, the Home card, backlinks
```

---

# EDGE CASES

| Case | What happens |
| --- | --- |
| First opened after several missed days | Every day since tracking began is missed, by derivation. No record is made for them; each can be caught up or excused on its own. |
| Reading started before 07:00 | Works as at any hour. The Home card then shows from that moment instead of waiting for 07:00. |
| Timer runs across midnight | One span, cut at local midnight in the calendar and heatmap; all of it belongs to the news day it was started for. |
| Timer switches Current Affairs ↔ Study / Revision | The open span closes and the next opens in the same session. Never a second timer. |
| Start on device B while device A owns the timer | B's start is refused and records nothing; B is offered *Continue here*, which takes the same session over. |
| A missed day completed later | `caught-up`; `date` unchanged; `completedAt` = `caughtUpAt` = when it was really done. |
| A caught-up day with no timer history | Reading time is simply 0. Nothing is fabricated. |
| Notes without completing the day | Allowed. The day stays pending (or missed). |
| A day completed with no notes, or after very short reading | Allowed. Completion is the learner's statement, not a threshold. |
| Timezone change | No record is rewritten. Each record keeps the timezone it was made in; only "today" moves. |
| Completion while offline | Local at once, queued, sent on reconnect. |
| The same day completed on two devices | One record. The earliest completion stands on both. |
| Source URL edited | Replaced when the field is left. Anything that is not an http(s) address is dropped; a note never needs one. |
| A linked section renamed or removed | Renamed: shown under its new title (the ref is the stable id). Removed: not listed, the ref kept. |
| Reset while offline | Applied here at once; the epoch is raised at the next sync. |
| A stale device reconnects after a reset | It drops the wiped groups before exchanging anything; whatever it queued for them is discarded. |

---

# AMENDMENTS

| Date | Change | Why |
| --- | --- | --- |
| 2026-10-04 | Contract created with Job 5.6 as built | — |
