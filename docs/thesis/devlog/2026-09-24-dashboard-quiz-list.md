# 2026-09-24: /dashboard, part 1: the quiz list

- **Phase / area:** Phase 2: Core loop (first route)
- **Related:** PR #11 (squash-merged as `7cb6184`; branch commits `a8c52f8` placeholder routes and `e32930b` quiz list); continued in [part 2](2026-09-24-dashboard-start-game.md); `MIGRATION.md` item `/dashboard`, sub-item "quiz list"; ADR-0011 (replace native browser modals); ADR-0015 (when to fix a legacy bug)
- **Time spent (approx.):** TODO(Bruno)

## Goal

Start Phase 2 with the teacher's home screen. Legacy `/dashboard` lists the teacher's quizzes and
quiztivities and offers per-item actions (view, analytics, edit, play, delete, download), plus a
dialog to start a live game. The aim of this task was the list half only. The start-game dialog was
split off into a second PR.

## What happened

1. **Handoff and inventory.** The session started from a handoff note that the previous session had
   left in Claude's memory. Bruno pasted it as the task. Following the `port-route` skill, Claude
   read the four route files, followed every `$lib` import, and wrote the route inventory to
   `.claude/tmp/dashboard.md`. The route alone is about 540 lines, and about 790 with its
   components, which is above the skill's ~400-line limit. Claude proposed two PRs (quiz list first,
   then the start-game dialog) and stopped to ask before writing code.
2. **Decisions raised.** Besides the split, Claude put eight questions to Bruno. Three came from the
   handoff note, and Claude found the others while reading the code:
   - drop the Google reCAPTCHA option for players (privacy rules), with an ADR;
   - replace the native `confirm()` on delete with a dialog;
   - keep or delete the unused `lib/hashcash.ts`;
   - list quiztivities, although `MIGRATION.md` names them as Phase 4 cut candidates;
   - the command-palette notice, which advertises a feature `web/` does not have;
   - the "ClassQuizControllers" toggle (physical buzzer devices; upstream name in the UI);
   - a failed game start, which legacy answers with `alert()` and a redirect to the login page
     whatever the error.

   While reading the backend, Claude also found that `POST /quiz/start` defaults
   `captcha_enabled` to `True`. A client that omits the parameter therefore switches the captcha
   on, so it must always send `False`.
3. **Implementation** (by Claude, on branch `web/dashboard-quiz-list`):
   - The dashboard links to eight pages that are not ported yet. They were registered as
     `ComingSoon` placeholder routes (the Phase 0 convention), so the links stay type-checked
     (`a8c52f8`).
   - The API layer (`dashboardApi.ts`) merges both lists, quizzes first as in legacy, into one item
     type. Quiztivities have no description, cover, `public` flag or counters in the backend model,
     so those fields are explicitly null for them.
   - Search keeps legacy's library, Fuse.js, and its options.
   - `MediaComponent.svelte` was ported as a shared `components/MediaComponent.tsx`, because the
     editor and `/view` will need it. It shows a thumbhash placeholder until the image has loaded.
   - Analytics and download became shadcn dialogs, and delete an `AlertDialog`, following ADR-0011.
     On success the list is refetched and a toast confirms it. On failure a toast says the quiz was
     not deleted, and it stays in the list. Legacy reloads the page in both cases.
   - Until the second PR lands, Play on a quiz shows a "not built yet" toast.
   - Two new dependencies: `fuse.js` (Apache-2.0) and `thumbhash` (MIT), both on the allowed licence
     list.
4. **Two self-corrections before commit.** The first version of `MediaComponent` put the thumbhash
   placeholder on the `<img>` element. That element is transparent while it loads, so the
   placeholder would never have been visible. Claude noticed this while writing the next component
   and moved the placeholder to a wrapper. Later, the two commits were first split so that the
   generated route tree landed in the second one. The first commit would then not have typechecked
   on its own, so Claude re-created both commits before pushing.
5. **Real data exposed a legacy bug.** Docker was not running at the start. Claude started Docker
   Desktop and the `compose.dev.yml` services, registered a local test account, uploaded one cover
   image and inserted three quizzes directly into the dev database. The inserted data showed that
   questions store their text in a field called `question`. Legacy's search indexes
   `questions.title`, a field that does not exist, so question text had never been searchable.
   Reading the legacy search code again showed a second defect: `search()` runs once, on mount, and
   nothing reacts to the input afterwards. In the legacy app, typing into the search box filters
   nothing. Following ADR-0015, both were fixed rather than replicated: results update as you type,
   and the question text is indexed. Both are logged in the "Legacy quirks" table.
6. **An export failure traced to the dev setup.** Downloading a quiz in the app's own format
   (`.cqa`) returned HTTP 500. The first cause was Claude's hand-inserted test data: the questions
   lacked the `image` key that the editor always writes. After the data was fixed, a second 500
   remained for the quiz with a cover image. The backend fetches images from its own
   `ROOT_ADDRESS`, which in `compose.dev.yml` is `http://localhost:5173`. Inside the api container
   that address is the container itself. A quiz without images exported correctly, and so did the
   Excel format. Legacy calls the same endpoint, so the frontend was not changed. The case was
   added to "Manual checks before cut-over".
7. **Documentation of the split.** In `MIGRATION.md`, the `/dashboard` item was split into two
   sub-items; the first is ticked. The decisions for the start-game dialog are recorded under the
   second. Eleven legacy quirks were logged and one manual check was added. The PR description
   carries the full inventory.

## Human vs. AI

- **Bruno decided / specified:** the task (via the pasted handoff note); the two-PR split; dropping
  the player captcha; replacing `confirm()` with a dialog; deleting `hashcash.ts`; listing
  quiztivities for parity; skipping the command-palette notice and logging it as a quirk; dropping
  the controllers toggle ("no buzzers needed"); reporting a failed game start in the dialog, with a
  redirect to login only on 401.
- **Claude proposed / implemented:** the inventory and the split; all eight questions above,
  including a recommendation for each; the placeholder-route approach; all code, tests and i18n
  keys (en + de); the choice of Fuse.js and thumbhash; the fixes for the two search defects, applying
  ADR-0015 without asking again; starting Docker, creating the local test account and test data; the
  `MIGRATION.md` updates; both commits, the push and PR #11.
- **Corrections Bruno made to AI output:** none in this task. Bruno accepted every recommendation but one.
  He answered the question about quiztivities with the first of the two offered options, and the
  controllers toggle with "drop" rather than the recommended rename. The two corrections in step 4
  were Claude's own, made before commit.

## Verification

- `pnpm typecheck` and `pnpm lint` passed. `pnpm test`: 187 tests passed, 16 of them new, in
  `dashboardApi.test.ts`, `searchItems.test.ts` and `lib/media.test.ts`. One new search test first
  failed: Fuse's default threshold, kept from legacy, is loose enough that "irregular" also matched a
  second item. The test was changed to check ranking (the best match comes first) rather than an
  exact result set.
- Playwright `dashboard.spec.ts`: 8 of 8 passed on the Chromium and mobile projects. It covers list,
  search, clear, disabled actions, analytics and delete; a failed delete; the empty state; and the
  signed-out redirect. Full e2e suite: 82 of 82 passed.
- Browser check in Brave through the `brave-devtools` MCP, against the real backend. Walked through:
  the signed-out redirect and a return to `/dashboard` after login, search by question text, the
  analytics values, both download links, a real delete, the Play placeholder toast and the
  full-size cover. The only "issue" in the console was a search field without a `name` attribute,
  which was added. After a reload the console was empty. The failed requests were all explained: a
  401 from the signed-out check before login, and the 500 from the export probe described in step 6.
- Screenshots (taken again while writing this entry, after a real delete during the check had left
  three items):
  - [1280 px, dark](../screenshots/2026-09-24-dashboard-quiz-list-1.png)
  - [1280 px, light](../screenshots/2026-09-24-dashboard-quiz-list-2.png)
  - [delete confirmation](../screenshots/2026-09-24-dashboard-quiz-list-3.png)
  - [390 px, dark, full page](../screenshots/2026-09-24-dashboard-quiz-list-4.png)
- **Not verified:** a side-by-side comparison with the legacy app (not running); behaviour was
  compared against the legacy source instead. The own-format export of a quiz with images, and the
  thumbhash placeholder on a slow connection, are on the manual-checks list.

## Observations for the thesis

- **Test data can find bugs that code reading misses.** The search defect in `questions.title` was
  not visible in the Svelte code, the OpenAPI schema (the list endpoint returns an untyped body) or
  the unit tests. Claude's own mock data had used the same wrong field name as legacy. The mismatch
  only showed when real rows came back from the backend. Mocked tests confirmed the frontend's own
  logic, but could not show whether it matched the data the backend actually returns.
- **The rewrite keeps surfacing behaviour that never worked.** As in Phase 1 (for example the
  password reset ported in PR #3, which could never complete in legacy), a legacy feature, here
  search, was ported although it did nothing in the legacy app. A strict "replicate behaviour" rule
  would have preserved a broken feature. ADR-0015 was applied without a new decision being needed.
- **Front-loading questions.** All decisions were collected in one message before any code was
  written, and each came with a recommendation. Bruno answered them in one reply, and no question
  came up again during implementation.
- **Dev-environment limits are part of the evidence.** The export failure was a property of the
  local compose setup, not of either frontend. Recording it as a manual check rather than "fixing"
  it keeps the backend out of scope, as the rewrite rules require.

## Open points

- PR #11 was merged later the same day (`7cb6184`), together with part 2.
- PR B: start-game dialog, with the decisions listed above. Done in PR #12, see part 2; the ADR on
  dropping the player captcha is still open.
- Suggested but not written: an ADR on the two new dependencies and on fixing the legacy search.
- Manual checks added: own-format export with images on the real server; thumbhash placeholder on a
  slow connection.
- `origin/web/account-settings-security`: later found to be already gone from the remote (see part 2).
- The local test account and its data exist only in the dev database.
  TODO(Bruno): keep or remove them.
