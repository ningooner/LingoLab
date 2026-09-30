# ADR-0016: Phase 2 breakdown into twelve PRs, and the media and scope choices it required

- **Status:** Accepted
- **Date:** 2026-09-30
- **Decided by:** Bruno Zingg (breakdown and recommendations proposed by Claude in a planning session)

## Context

Phase 2 of the rewrite is the core loop (create → host → play → results), the part the thesis
depends on. After `/dashboard` was merged (PRs #11 and #12), `MIGRATION.md` listed the rest of the
phase as seven items, of which only `/edit` was split further (four sub-items). Bruno asked Claude to
plan the phase and to say whether it was already broken down.

Claude read the legacy route files and surveyed the shared components they import. Three findings
made the existing list unsuitable as a work plan:

- `/create` (138 lines) and `/edit` (176 lines) are both thin wrappers around the same
  `lib/editor.svelte`, which pulls in `lib/editor/*` (about 3,100 lines). `/create` could therefore
  not be ported as the small, separate first step the checklist suggested.
- `/play` and `/admin` share `lib/play/*` (about 2,000 lines), and neither can be exercised end to
  end without the other. Each was a single checklist line.
- The SLIDE question type is a canvas editor built on the `pikaso` library (about 650 lines in
  `slide.svelte` and `slides/*`) and needs a read-only renderer on the host and quiz-view screens.
  The checklist listed it as one of seven question types.

The survey also surfaced five questions that had to be answered before the work could be sequenced.
One of them, the uploader, had been deferred to Phase 2 by ADR-0012.

## Options considered

### 1. How to split the phase

1. **Keep the existing list** (seven items, `/edit` in four parts). Rejected: `/create` cannot be
   delivered on its own, and `/play` and `/admin` exceed the roughly 400-line threshold at which the
   `port-route` skill requires a split.
2. **Twelve PRs in dependency order** (proposed by Claude): five for the editor, four for the live
   game split into lobby and question loop on each side, then results, quiz view and the file
   manager. The first editor PR includes the ABCD question type so that a quiz can be created and
   saved as soon as it merges.

### 2. File uploads: `@uppy/react` or a custom dropzone

Legacy's `lib/editor/uploader.svelte` uses Uppy with the Dashboard, XHR upload, image editor and
compressor plugins. It accepts images only, up to 10,490,000 bytes, and posts to `/api/v1/storage/`.

1. **`@uppy/react` (MIT):** keeps legacy's in-browser crop and compression; adds several `@uppy/*`
   packages.
2. **Custom dropzone** posting to the same endpoint (recommended by Claude): no new dependency;
   crop and compression are not carried over.

### 3. Pixabay image search

The uploader has a Pixabay tab. The search request goes through the backend
(`/api/v1/pixabay/images`), but the result thumbnails are rendered with `src={image.webformatURL}`,
so the browser loads them directly from Pixabay's servers.

1. **Port it:** parity, but the browser calls a third-party service, which the project's privacy
   rules forbid.
2. **Drop the tab** (recommended by Claude).

### 4. SLIDE question type

1. **Port it with `pikaso`**, subject to a licence check.
2. **Move it to the Phase 4 cut list.**

Bruno asked for the licence check. The npm registry reports `pikaso` 3.0.3 as MIT, with two
dependencies, `konva` and `deepmerge`, both MIT. All three are on the project's allow-list.

### 5. Video tab in the uploader

The tab opens `/edit/videos` in a popup. That route is a Phase 4 cut candidate (it needs
ffmpeg.wasm, whose licensing has not been checked).

1. **Port the tab now**, ahead of the Phase 4 decision.
2. **Leave it out until that decision** (proposed by Claude).

### 6. Captcha-protected games in `/play`

ADR-less decision from PR #12: games started from `web/` always send `captcha_enabled=false`. A game
started directly through the API still defaults to captcha on, and legacy's `join.svelte` then loads
hCaptcha or Google reCAPTCHA in the player's browser.

1. **Load the captcha script in that case:** parity, but a third-party script in a minor's browser.
2. **Never load it; show a message that the game cannot be joined here** (proposed by Claude).

## Decision

Bruno accepted the twelve-PR breakdown and decided:

- **Uploader:** custom dropzone, not `@uppy/react`.
- **Pixabay:** dropped.
- **SLIDE type:** Bruno asked for the licence check rather than stating a choice. After the check
  passed, Claude recorded the type as ported (PR 5) and told Bruno it had read his answer that way.
  TODO(Bruno): confirm that SLIDE is to be ported, or move it to the Phase 4 cut list.
- **Video tab:** left out for now; to be revisited with the `/edit/videos` decision.
- **Captcha games:** no captcha script is loaded; a game that reports captcha as enabled shows a
  "this game can't be joined here" message.

The breakdown and these decisions were written into `MIGRATION.md` under Phase 2 by Claude. No code
was written and no dependency was installed in this session.

## Consequences

- Positive: every Phase 2 PR has a stated scope and dependency, and the create → host → play loop
  is complete after PR 9 of 12.
- Positive: none of the Phase 2 choices causes a third-party request from the browser, consistent
  with the account area (ADR-0012) and the player-captcha decision in PR #12.
- Negative: three deviations from legacy behaviour. Teachers can no longer crop or compress an image
  in the browser before upload, can no longer search Pixabay from the editor, and (for now) cannot
  attach a video. These are scope reductions, not bug fixes, and should be reported as such.
- Negative: a game started through the API with captcha enabled cannot be joined from `web/`.
  Games started from the dashboard are unaffected.
- Neutral: `pikaso` becomes a new dependency when PR 5 is built; `docs/thesis/attribution.md` is to
  be updated at that point, not now. Legacy pins `pikaso` ^2.9.0; the registry's current version is
  3.0.3, so the API may differ from what the legacy code uses.
- Risk: the line counts are legacy Svelte lines and only indicate relative size. The plan has not
  been tested against actual effort; PR boundaries may move once the `port-route` inventory for each
  one is written.

## References

- `MIGRATION.md`, Phase 2 and "Phase 2 decisions (Bruno, 2026-09-30)" (uncommitted at the time of writing)
- ADR-0012 (uploader question deferred to Phase 2)
- PR #12, commit `01e01da` (player captcha dropped in the start-game dialog)
- Legacy sources read: `frontend/src/lib/editor.svelte`, `lib/editor/uploader.svelte`,
  `lib/editor/uploader/Pixabay.svelte`, `lib/play/join.svelte`, `routes/create`, `routes/edit`,
  `routes/play`, `routes/admin`
- npm registry, queried 2026-09-30: `pikaso` 3.0.3 (MIT), `konva` 10.7.0 (MIT), `deepmerge` 4.3.1
  (MIT), `@uppy/react` 6.0.0 (MIT)
