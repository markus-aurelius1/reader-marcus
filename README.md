# UPSC Notes Reader

Local-first revision-notes reader for UPSC CSE + UPPCS. React + TypeScript + Vite, installable PWA, works offline. No backend: edits, highlights and progress live in the browser (IndexedDB); theme / recall / explorer preferences, favourites and recent destinations in localStorage.

## Run

```bash
npm install        # once
npm run build      # after any content or code change
npm run preview    # http://localhost:4310  (or double-click Start-Notes.bat)
```

`npm run dev` (http://localhost:5310) gives live reload while writing content. Install it as an app from the browser's address bar; after the first visit it opens offline.

**Install** — when the browser reports the app as installable (Chrome / Edge / Samsung Internet, desktop and Android) an **Install** button appears in the top bar and in the ⋯ menu and opens the browser's own install prompt; it disappears once installed and never shows inside the installed app. On iPhone / iPad and Firefox for Android, ⋯ → **Install app…** shows the Add to Home Screen steps instead. Logic: `src/lib/install.ts`.

Your edits and highlights are stored per browser and per address — keep using the same address (or sign in to sync, below), and use **⋯ → Export** for backups.

## Layout

```
content/                      ← all notes; the reader never names a subject in code
  library.json                ← Prelims / Mains (GS1–GS4, Optional) slots shown on the Study page and in the explorer
  prelims/polity/
    subject.json              ← title, topics → chapter order, taxonomy coverage contract
    chapters/<chapter>.md     ← one file per reading unit; "## " starts a section
    pyq.json                  ← generated from the Source Pack (PYQs + Insights tabs)
source/                       ← Source Packs as supplied (input only)
scripts/check-content.mjs     ← coverage + cross-link checks (npm run check)
scripts/extract-pyq.mjs       ← builds pyq.json from a Source Pack
scripts/e2e.mjs               ← end-to-end regression         (npm run e2e)
src/                          ← reader UI (lib/, views/, editor/, components/, styles/) + sync/
firestore.rules, .env.example ← optional cross-device sync
```

## Navigation (Reader v2)

The frozen v2 architecture, data contract and route table are in [`docs/READER_V2_CONTRACT.md`](docs/READER_V2_CONTRACT.md).

- **Routes** are defined once, in `src/lib/router.ts` (`href` builds, `parse` reads). v1 links (`#/s/…`, `#/r/…`, `#/progress`) are rewritten in place.
- **Navigation tree** (`src/lib/nav.ts`) is generated from `library.json` + each `subject.json` + the chapter files — a new subject appears in the rail's Study explorer, the subject switcher, breadcrumbs and Ctrl/Cmd+K with no code change.
- **Presentation**: desktop/tablet use a primary rail (`components/Nav.tsx`) plus the Study explorer (`components/Explorer.tsx`: panel ≥ 1024px, drawer below); phones use a bottom tab bar and the explorer as a bottom sheet.
- **Favourites / recent destinations** are fields of the existing preferences record (see the storage table).

`scripts/e2e.mjs` → "Navigation v2" covers all of the above; extend its subject lists when a subject is added.

## Study timer (Reader v2)

The reader header carries a study timer: **Start** on any chapter, then a running `01:24:37` with Pause / Resume / Stop. It follows the reader — changing chapter closes the span for the previous chapter and opens the next without breaking the clock — and survives navigation, refresh, closing the browser and reopening the installed app, because elapsed time is always computed from stored timestamps. Paused time is never counted.

- **Stop** writes one immutable `StudySession` (its spans carry stage, paper, subject, topic, chapter and optionally section). Sessions are the only record of study time; nothing keeps a running total, and later statistics are derived from them.
- **One timer per account.** Another signed-in device shows `Timer running — Economy · 42:18` with **Continue here** (takes over the same session) and **Open topic**.
- **Closed for a while with the timer running?** On return the timer is still running; the reader offers **Keep the time** or **Stop at** the moment it was last open.
- **Offline.** Everything works; changes queue as usual. A timer started offline on a signed-in device is marked provisional. If another device turns out to have a timer running, that one stays and the offline one is saved as its own session (`source: "recovered"`) — no time is dropped.

Code: `src/lib/timer.ts` (pure rules), `src/lib/study.ts` (state, IndexedDB, sync adapter), `src/components/Timer.tsx` (header control and notices). Rules and reconciliation: [`docs/READER_V2_CONTRACT.md`](docs/READER_V2_CONTRACT.md) → "Timer rules as built".

## Home (Reader v2)

**Home** is the study dashboard. It answers, in this order: where did I leave off, what is next, how much have I studied, how far through the syllabus am I, and what needs attention.

| Card | Shows |
| --- | --- |
| **Continue studying** | The last-opened chapter with its subject, status and sections done; **Resume**. |
| **Timer** | The running timer (live clock, topic, Pause / Resume / Stop, or **Continue here** when another device owns it); otherwise **Start studying**, which starts the timer on the chapter to resume and opens it. |
| **Today** | Study time today beside yesterday; progress towards the daily and weekly goals when goals are set. |
| **Study progress** | Prelims overall (Mains once it has content) with the Not started / Reading / Revised / Mastered split. |
| **Subjects** | One compact row per subject: progress, time studied, last studied, **Resume** / **Open**. |
| **This week** | Week-to-date time beside the same part of last week, a daily chart, a 13-week heatmap and the study-day streak. Opens Insights → Time. |
| **Study queue** | A personal, ordered list of chapters and sections: **Add current chapter**, move up / down, mark complete, remove, **Start next**. A chapter can also be added from its own page (**Add to queue**). |
| **Revision** | ★ Difficult and ↻ Revise sections, longest since studied first, each with ＋ to queue it. Opens Insights → Revision. |
| **Recent** · **Favourites** | Recent destinations and latest highlights; favourite chapters and subjects. |

- **Goals are opt-in.** There is no target until you set one (**Set a daily or weekly goal**), and none is suggested. Only the targets are stored; progress and streaks are worked out from the sessions.
- **Nothing on Home is stored.** The page is a view model (`src/lib/dashboard.ts`) rebuilt from the completed sessions, the reader's progress, the queue and the goal, using the same functions as Insights — so the two can never disagree. A timer that is still running is shown but not counted until it is stopped.
- **Layout.** Desktop: a three-part top row over two dense columns. Tablet: Continue across the top, then two columns. Phone: one column with the actions first (continue, timer, today, queue, revision), then the charts. Motion is limited to cards rising in, fills growing and numbers settling, and is switched off with *reduced motion*.
- With no history Home says so in words: no charts, no sample figures.

Code: `src/lib/dashboard.ts` (view model, `dashboard.test.ts`), `src/lib/plan.ts` (queue and goals: state, IndexedDB, sync; `plan.test.ts`), `src/views/Home.tsx`, `src/components/Queue.tsx`. Rules: [`docs/READER_V2_CONTRACT.md`](docs/READER_V2_CONTRACT.md) → "Dashboard rules as built".

## Insights (Reader v2)

**Insights** has five tabs. Every study-time figure is calculated, each time it is shown, from the completed sessions on the device — there are no stored totals — so it is the same on every synced device and can never drift from the sessions.

| Tab | Shows |
| --- | --- |
| **Overview** | Today, this week, this month and this year so far, each beside its comparison period; sessions completed, average and longest session, active study days; study time by subject. |
| **Time** | Day / Week / Month / Year selector with earlier periods; study time by hour, day or month; a 53-week calendar heatmap; trend; sessions by length; longest and most recent sessions; a stage / subject filter. |
| **Subjects** | Time by exam stage, by subject (most studied first, reading progress beside it), by topic and chapter; least recently studied subjects. Every row opens what it names. |
| **Progress** | The reader's progress page: Prelims overall (Mains once it has content), per subject completion, Not started / Reading / Revised / Mastered, ★ and ↻ counts, and tracked time. Chapter status is set here as before. |
| **Revision** | The revision queue: ★ Difficult and ↻ Revise sections with the time since each was last studied and the highlights made in it, plus chapters in progress. |

Rules, in short: days and weeks follow the device's timezone (weeks run Monday–Sunday); a session crossing midnight is split between the two days; paused time is never counted; time recorded on two devices at once counts once; "so far" periods are compared with the same elapsed part of the previous period; a percentage is shown only when there is something to divide by. The full rules are in [`docs/READER_V2_CONTRACT.md`](docs/READER_V2_CONTRACT.md) → "Analytics rules as built".

With no tracked sessions the time tabs say so and draw nothing. Old links `#/progress` and `#/revision` open the matching tab.

Code: `src/lib/analytics.ts` (pure calculations, `analytics.test.ts`), `src/views/Insights.tsx` (the five tabs), `src/components/Charts.tsx` (bar, line and heatmap in plain HTML/SVG — no chart dependency).

## Adding the next subject

1. **Place the source** — put the Source Pack in `source/`.
2. **Synthesise the notes** — one markdown file per chapter in `content/<stage>/<subject>/chapters/`, in the dialect below. Each file starts with:
   ```
   ---
   title: Parliament
   taxonomy: <taxonomy_id of the leaf node(s) this chapter owns, comma-separated>
   related: <optional — cross-link ids of closely related chapters, comma-separated>
   ---
   ```
3. **Register metadata** — `content/<stage>/<subject>/subject.json`:
   ```json
   { "title": "Economy",
     "topics": [{ "id": "macro", "title": "Macroeconomy", "chapters": ["national-income", "inflation"] }],
     "taxonomy": ["<every leaf taxonomy_id of the pack>"] }
   ```
   Topic and chapter order here is the reading order.
4. **Navigation** — the folder name must match a slot id in `content/library.json` (e.g. `prelims/economy`, `mains/gs2-polity`). For a new slot (an optional subject, say) add a line there; unlisted subjects still appear under the stage's last group.
5. **Generate + check**
   ```bash
   node scripts/extract-pyq.mjs source/<pack>.md content/<stage>/<subject>
   npm run check
   npm run build
   ```
   `npm run check` fails if a taxonomy node is covered zero or several times, a chapter is missing/unlisted, a cross-link is broken (in any subject), or a marker is unbalanced. The PYQs and Insights tabs appear only when `pyq.json` exists.
   `extract-pyq` reads both pack layouts: leaf packs (`## 2. PYQ Demand Map` → `### UPSC`) and topic packs with a child-subtopic ledger (`### 3. PYQ Demand Map` → `#### A. <child>` → `##### UPSC`).
6. **Cross-link** — link the new chapters to related sections in the subjects already present (next section). Nothing else is needed for backlinks, search or exports.

No application code changes: reader, editor, highlights, progress, search, cross-links, export and print pick the subject up automatically.

## Cross-links

One mechanism for every subject, present and future. A link names its destination by **content id** — the folder, file and section ids — never by title or URL, so it survives edits, renamed headings, re-ordering and exports.

| Write | Goes to |
|---|---|
| `[label](@chapter#section)` | a section in the same subject |
| `[label](@stage/subject/chapter#section)` | any subject — Prelims ↔ Prelims, Prelims ↔ Mains, optional papers |
| `[label](@stage/subject/chapter)` · `[label](@stage/subject)` | a whole chapter · a subject's overview |
| `related: a, b#c, mains/gs2-polity/x` in the frontmatter | chapter-level "Related chapters", shown at the end of **both** chapters |

- `stage/subject` is the folder under `content/` (`prelims/economy`, `mains/gs3-economy`, `mains/sociology`). Give a section a fixed id with `## Title {#id}` when other chapters link to it.
- **Back** in the browser / app returns to where the link was followed; a link opens the exact section and expands it if collapsed.
- **Related** — the destination lists, under the section, every section elsewhere that links to it. Nothing is written twice: one link gives both directions. Links inside a single chapter are not listed.
- **Search (Ctrl K)** — destinations linked with the best match are offered right after the top results ("related to …").
- **Edits and sync** — a link keeps its id inside edited text; its route is re-derived from the id whenever the section is shown, so old edits follow the current library.
- **Exports** — Markdown keeps `[label](@id)`. In exported HTML a link inside the file jumps within the file; any other link opens the reader the file was exported from.
- **Subjects not added yet** — a link into a subject that is not in the library renders as plain text, is reported by `npm run check` as *pending* (not an error), and switches on by itself when that subject is added. A wrong chapter or section id in an existing subject is an error.
- Link only where it saves a look-up: a definition owned by another chapter, the constitutional side of an economic fact, the Mains treatment of a Prelims concept. One home per fact; link the rest.

## Notes dialect

| Write | Renders as |
|---|---|
| `## Section title` | collapsible section (id = slug of the title, or `{#custom-id}`) |
| `### Sub-heading`, lists, tables, `**bold**` | as usual |
| `{{answer}}` | recall item — blurred in Recall Mode, click to reveal |
| `==text==` | high-yield emphasis |
| `!!text!!` | red keyword |
| `` `Art. 368` `` | article / act anchor |
| `[label](@chapter-id#section-id)` | cross-link inside the subject; `@stage/subject/chapter#section` for any other subject → [Cross-links](#cross-links) |
| `> [!TRAP] …` | callout — kinds: `TRAP`, `EXC`, `UPPCS`, `DYN`, `VERIFY`, `FLOW`, `NOTE` |

A callout may hold a list or a table (prefix each line with `> `). **⋯ → Export to Markdown** writes this same dialect, so an edited chapter can replace its file in `content/`.

## Content rules used for the notes

- Leaf Source Packs are the factual payload; parent aggregates are only a cross-check. Taxonomy is a coverage contract (every leaf node exactly once), not the reading order.
- `CORRECT` replaces the old wording; `OMIT` never enters; unresolved `VERIFY` goes in a `[!VERIFY]` callout; perishable facts go in `[!DYN]`. Both are listed under Insights → "Check before the exam".
- Disputed / malformed PYQ answer keys are never encoded as facts. No source URLs or PYQ IDs in the notes.
- UPSC core first; extra UPPCS recall goes in `[!UPPCS]` blocks.
- Revision style: short bullets, tables, arrows, traps, exceptions. One home per fact, cross-reference elsewhere.
- Recall items only for article numbers, compositions, majorities, appointments/removals, sequences, exceptions and confusing pairs.

## Cross-device sync (optional)

The reader is local-first. IndexedDB is the working copy on every device; the cloud only relays changes between devices. Without sign-in, without network, or without any Firebase configuration, everything works exactly as before and no Firebase code is loaded.

### Firebase setup (one time)

1. [Firebase console](https://console.firebase.google.com) → **Add project** (Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
3. **Build → Firestore Database → Create database** → production mode → pick a region.
4. **Firestore → Rules** → paste the contents of [`firestore.rules`](firestore.rules) → **Publish**
   (or `npx firebase-tools deploy --only firestore:rules --project <project-id>`).
5. **Project settings → Your apps → Web app (`</>`)** → register → copy the config values into `.env.local` (see [`.env.example`](.env.example)):
   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<project-id>
   VITE_FIREBASE_APP_ID=…
   ```
6. **Authentication → Settings → Authorized domains** → add every domain the reader is served from. `localhost` is already there; Google sign-in needs `localhost` or HTTPS.
7. `npm run build` (the values are read at build time), then open the app → cloud icon → **Sign in with Google**.

`.env.local` is git-ignored. The values identify the project and are not secrets; access is enforced by the rules, which let a signed-in user read and write only `users/{their uid}/state/*`.

Local development without Firebase: `node scripts/mock-cloud.mjs` and build/run with `VITE_SYNC_MOCK=http://localhost:4320`.

### Production (Vercel)

Live at **https://reader-marcus.vercel.app** — Vercel project `reader-marcus`, Firebase project `reader-marcus` (Firestore in `asia-south1`).

- Deploy: `vercel deploy --prod` (builds with `npm run build`, serves `dist/`; settings in [`vercel.json`](vercel.json)). Routing is hash-based, so no SPA rewrite is needed.
- Environment: the four `VITE_FIREBASE_*` values live in Vercel → Project → Settings → Environment Variables. They are read at build time, so redeploy after changing them.
- Sign-in domain: in production `VITE_FIREBASE_AUTH_DOMAIN` is the site's own hostname, and `vercel.json` proxies `/__/auth/*` to `<project>.firebaseapp.com`. Sign-in then stays first-party, which is what makes the redirect fallback work in browsers that block third-party storage. Locally (`.env.local`) the auth domain stays `<project>.firebaseapp.com`.
- A new hostname needs three entries: Firebase → Authentication → Settings → **Authorized domains**; and on the Google Cloud OAuth web client, **Authorized JavaScript origins** (`https://<host>`) and **Authorized redirect URIs** (`https://<host>/__/auth/handler`). Then update `VITE_FIREBASE_AUTH_DOMAIN` and the rewrite target if the Firebase project changed.
- Rules: `npx firebase-tools deploy --only firestore:rules --project reader-marcus`.
- Updates: the service worker checks for a new build on every load and takes over immediately; `sw.js` and `index.html` are served `no-cache`.

Troubleshooting

| Symptom | Cause |
|---|---|
| Vercel login page instead of the reader | Vercel → Project → Settings → Deployment Protection → Vercel Authentication is on for all deployments |
| `auth/unauthorized-domain` | hostname missing from Firebase Authorized domains |
| Google `redirect_uri_mismatch` | `https://<host>/__/auth/handler` missing from the OAuth client's redirect URIs |
| Popup opens the reader itself | an old service worker is intercepting `/__/auth/*` — reload once |
| `Sync paused — will retry` with `permission-denied` | rules not deployed (the study timer, queue and goals need the `studySessions` / `studyRuntime` / `studyQueue` / `studyGoals` rules — deploy `firestore.rules` before the app), or signed in to a different Firebase project than the build's |
| Stays on `Offline — changes queued` while online | Firestore unreachable (network filter / ad-blocker); the queue is kept and retried |

### Sync behaviour

| | |
|---|---|
| **What syncs** | Section edits (heading + body), highlights and colours, section done / ★ / ↻, chapter status, reading position and last-opened chapter, theme, Recall Mode, collapsed sections, completed study sessions, the active study timer and timer preferences, the study queue and study goals. Never the notes themselves, the Source Pack or build assets. |
| **Granularity** | One small cloud document per section edit, per highlight, per section's flags, per chapter's status/position, and one for preferences — scrolling or ticking a box never rewrites an edit. |
| **Local-first** | Every change updates the screen, is written to IndexedDB and is added to a persistent queue. The queue is sent when you are signed in and online; nothing waits on the network. |
| **Offline** | Status shows `Offline — changes queued`. The queue survives reloads and restarts and drains automatically on reconnect. |
| **First sign-in** | Nothing local is replaced. Every local record is compared with the cloud: local-only records are uploaded, cloud-only records downloaded, flags and preferences merged field by field. |
| **Merging** | Flags, status, position and preferences: newest change per field wins, so progress from one device and a highlight from another both survive. Highlights: newest change per highlight wins; removals propagate. |
| **Conflicts** | Only when the *same section's text* was edited on two devices before they synced. Both versions are kept; status shows `Conflict`; choose **Keep this device**, **Keep cloud version** or **View both**. Until you choose, this device keeps its own text and the cloud copy is stored locally. |
| **Queue and goals** | Each queue item and the goal are small records merged field by field: completing an item on one device and reordering it on another both survive; removals propagate. Dashboard figures are never uploaded — every device derives them. |
| **Study timer** | Completed sessions are written once and never changed. The active timer is one record with one owning device; it is the only record with a live listener, so a timer started on one device appears on the others within a moment. Two timers that diverged offline are reconciled without dropping time (see *Study timer* above). |
| **Sign out** | Stops syncing; everything stays on the device. Signing in to a different account merges this device's data into that account. |
| **Local-only mode** | Leave the `VITE_FIREBASE_*` values empty, or simply don't sign in ("Continue locally"). |

"Newest" uses each device's clock, so a device with a badly wrong clock can win or lose a field unexpectedly. Sync is periodic (after changes, on reconnect, when the app regains focus, every two minutes, or **Sync now**), not live collaboration. Exports remain the backup mechanism.

## Checks

```bash
npm run test     # merge, queue, conflict, anchoring, migration, cross-link, study-timer, timer-sync, analytics,
                 # dashboard and study-queue / goals unit tests
npm run check    # content contract (taxonomy coverage, cross-links across subjects, markers)
npm run e2e      # headless-Chrome regression of the production build: reader, migration, print-to-PDF,
                 # cross-links, offline, responsive, and two-device sync against the mock cloud  → e2e-out/
npm run verify   # typecheck + all of the above
```

There is no linter: typescript-eslint does not yet support the TypeScript 7 compiler this project uses; `tsc --strict` is the static check.

## Where things are stored

| Data | Store |
|---|---|
| Edited section headings / bodies | IndexedDB `upsc-notes` → `overrides` (one row per section) |
| Highlights | IndexedDB → `highlights` (one row each: position, quoted words, colour) |
| Progress, flags, reading position | IndexedDB → `kv` → `progress` (+ `stamps`: when each field changed) |
| Sync queue · unresolved conflicts | IndexedDB → `outbox` · `conflicts` |
| Completed study sessions | IndexedDB → `studySessions` (one immutable row each) · cloud `users/{uid}/studySessions/{sessionId}` |
| The active study timer | IndexedDB → `activeStudySession` (one row) · cloud `users/{uid}/studyRuntime/active` |
| Study queue | IndexedDB → `studyQueue` (one row per item) · cloud `users/{uid}/studyQueue/{itemId}` |
| Study goals (only once set) | IndexedDB → `studyGoals` (one row) · cloud `users/{uid}/studyGoals/default` |
| Theme, Recall Mode, explorer panel, collapsed sections, favourites, recent destinations | localStorage `upsc-prefs` (all but the panel state sync as `pref~main`) |

Highlights are stored apart from the text and re-attached to it when a section is shown. **Reset Local Edits** therefore restores the original text and keeps highlights, progress, status, flags and reading position. A highlight made on words that existed only in your edit cannot be placed on the original text: it is kept and listed on the Highlights page as "not in the current text", where you can remove it.

Database version 2 adds the `highlights`, `outbox` and `conflicts` stores; data saved by version 1 is migrated in place on first launch (highlights are lifted out of the saved HTML).
