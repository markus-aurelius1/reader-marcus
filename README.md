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
| `Sync paused — will retry` with `permission-denied` | rules not deployed, or signed in to a different Firebase project than the build's |
| Stays on `Offline — changes queued` while online | Firestore unreachable (network filter / ad-blocker); the queue is kept and retried |

### Sync behaviour

| | |
|---|---|
| **What syncs** | Section edits (heading + body), highlights and colours, section done / ★ / ↻, chapter status, reading position and last-opened chapter, theme, Recall Mode, collapsed sections. Never the notes themselves, the Source Pack or build assets. |
| **Granularity** | One small cloud document per section edit, per highlight, per section's flags, per chapter's status/position, and one for preferences — scrolling or ticking a box never rewrites an edit. |
| **Local-first** | Every change updates the screen, is written to IndexedDB and is added to a persistent queue. The queue is sent when you are signed in and online; nothing waits on the network. |
| **Offline** | Status shows `Offline — changes queued`. The queue survives reloads and restarts and drains automatically on reconnect. |
| **First sign-in** | Nothing local is replaced. Every local record is compared with the cloud: local-only records are uploaded, cloud-only records downloaded, flags and preferences merged field by field. |
| **Merging** | Flags, status, position and preferences: newest change per field wins, so progress from one device and a highlight from another both survive. Highlights: newest change per highlight wins; removals propagate. |
| **Conflicts** | Only when the *same section's text* was edited on two devices before they synced. Both versions are kept; status shows `Conflict`; choose **Keep this device**, **Keep cloud version** or **View both**. Until you choose, this device keeps its own text and the cloud copy is stored locally. |
| **Sign out** | Stops syncing; everything stays on the device. Signing in to a different account merges this device's data into that account. |
| **Local-only mode** | Leave the `VITE_FIREBASE_*` values empty, or simply don't sign in ("Continue locally"). |

"Newest" uses each device's clock, so a device with a badly wrong clock can win or lose a field unexpectedly. Sync is periodic (after changes, on reconnect, when the app regains focus, every two minutes, or **Sync now**), not live collaboration. Exports remain the backup mechanism.

## Checks

```bash
npm run test     # merge, queue, conflict, anchoring, migration and cross-link unit tests
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
| Theme, Recall Mode, explorer panel, collapsed sections, favourites, recent destinations | localStorage `upsc-prefs` (all but the panel state sync as `pref~main`) |

Highlights are stored apart from the text and re-attached to it when a section is shown. **Reset Local Edits** therefore restores the original text and keeps highlights, progress, status, flags and reading position. A highlight made on words that existed only in your edit cannot be placed on the original text: it is kept and listed on the Highlights page as "not in the current text", where you can remove it.

Database version 2 adds the `highlights`, `outbox` and `conflicts` stores; data saved by version 1 is migrated in place on first launch (highlights are lifted out of the saved HTML).
