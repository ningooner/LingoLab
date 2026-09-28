# 2026-09-17: Phase 1 — the account routes

- **Phase / area:** Phase 1: Accounts
- **Related:** PRs #2, #3, #5, #6, #7, #9 (and the closed #8); commits `dac801e`, `9625162`, `befcec9`, `1ab4457`, `efc779c`, `51de62f`; ADR-0011 … ADR-0015; `MIGRATION.md` Phase 1
- **Time spent (approx.):** TODO(Bruno)

## Goal

Rebuild every `/account/*` route of the legacy SvelteKit app (`frontend/`) in the new React app
(`web/`), following the parity-first rule of ADR-0003: same behaviour, new styling, no new features
and no backend changes. Phase 1 was chosen as the first phase because every later phase depends on
a working sign-in, and because the account area is small enough to establish the porting method
before the thesis-critical Phase 2 (create → host → play → results).

## What happened

All seven routes were ported in six pull requests, merged on 2026-09-17 in this order:

| PR | Route(s) | Legacy size |
|---|---|---|
| #2 | `/account/login`, `/account/register` | 146 + 385 lines |
| #3 | `/account/reset-password`, `/account/password-reset` | 145 + 172 |
| #5 | `/account/oauth-error` | 54 |
| #6 | `/account/settings` | 331 |
| #7 | `/account/settings/avatar` | 178 |
| #9 | `/account/settings/security` | 295 + 133 in two child components |

(PR #4 was developer documentation for `web/`, not a route.)

### What the legacy app turned out to actually do

The most consistent finding of Phase 1 was that the legacy app's *stated* behaviour and its *actual*
behaviour diverge often, and that the divergence is only visible by reading the Svelte source. Three
cases changed the shape of the work:

1. **`/account/password-reset` cannot complete a password reset at all.** Line 12 reads
   `let { token: string } = data`, which is a destructuring *rename*: it binds the token to a local
   variable called `string` and leaves `token` undefined where the request body is assembled. Every
   reset upstream therefore posts `{password, token: undefined}` and receives a 400. This was found
   while porting, not before.
2. **`/account/register` has no captcha and no proof-of-work.** The task brief assumed a hCaptcha /
   proof-of-work gate. `VITE_CAPTCHA_ENABLED` turned out to have exactly one consumer,
   `dashboard/start_game.svelte` (the captcha *players* solve when joining a game); the third-party
   scripts live in `play/join.svelte`; and `frontend/src/lib/hashcash.ts` is dead code that nothing
   imports. The backend agrees: `create_user` accepts `{username, password, email}` and nothing else.
3. **`/account/settings/avatar` is not an upload screen.** The brief described an image upload with
   cropping built on `@uppy/svelte`. The route is a twelve-step wizard that picks integer indices
   into the backend's avataaars enums; the picture is rendered server-side. Uppy is a legacy
   dependency, but only `lib/editor/*` and `routes/edit/files/uploader.svelte` import it.

In addition, avatar images have never displayed in the legacy app at all: `GET /api/v1/avatar/custom`
is declared `response_class=PlainTextResponse` and then appends a second Content-Type, so the
response carries both `text/plain` and `image/svg+xml` and browsers honour the first.

Roughly fifteen further quirks were recorded in the `MIGRATION.md` "Legacy quirks" table across
these routes, ranging from debug residue (`console.log` of the API-key list on every load, an
unreachable "You stupid Mawoka!" fallback) to genuine security issues (an unchecked `returnTo`
open redirect on login; the session endpoint returning a live `session_key` into the page's JS
memory).

### How the parity-first rule held up

The rule survived, but it needed a decision procedure rather than a slogan, because "replicate the
legacy behaviour" is ambiguous once the legacy behaviour is broken. The line that emerged, and is
recorded in ADR-0015, is: a deviation is allowed when the legacy code cannot do what it evidently
intends (a crash, a dead handler, an unreachable branch, a missing guard that five sibling handlers
have), and is not allowed when the legacy code does something coherent that we merely disagree with.

Applied across Phase 1 this produced:

- **Fixed, not replicated:** the `password-reset` token bug; the login open redirect; the
  `require_password` 401 mishandling on the security page; the avatar route's missing auth guard,
  dead `Finish` button and silently-swallowed save failure.
- **Replicated deliberately:** the backend's decoy session for unknown accounts (intentional
  anti-enumeration); `?verified` being tested by presence only; the `423 Locked` registration case
  falling into the generic error branch; `authenticatorAttachment` forced to `'cross-platform'`,
  which still blocks Touch ID and Windows Hello; the avatar `hair_color` enum mix-up, which is a
  backend bug and the backend is out of scope.
- **Dropped:** the unreachable 404 "user not found" alert on the reset page (porting it would have
  turned an anti-enumeration feature into a leak); the link to the upstream author's issue tracker;
  the click-the-backup-code-text-to-download behaviour; the upstream donation footer and branding.

Presentation-layer changes were treated as expected rather than as deviations: every native
`prompt()`, `alert()` and `confirm()` became a shadcn dialog or a sonner toast (ADR-0011), and two
legacy layouts that were unusable below ~1000px were made responsive.

### Process problems

Two things went wrong that were not code problems:

- **A wrong task brief was believed too long.** The avatar route was described as an upload+crop
  screen. Reading `frontend/src/routes/account/settings/avatar/+page.svelte` first would have shown
  in a minute that it is a wizard. The working rule now is to read the legacy source before trusting
  any description of a route, including a description written earlier in this project.
- **A stacked PR was destroyed by merging its base.** #8 (`/account/settings/security`) was opened
  against `web/account-settings-avatar` rather than `main`. Merging #7 deleted that base branch, and
  GitHub auto-closed #8 without retargeting it; a PR whose base branch is gone cannot be reopened.
  The identical commit was re-landed as #9 (`git diff` against the reviewed commit was empty), so
  the review discussion now lives on #8 and the merge on #9. For the thesis record this means the
  security route's history is split across two PR numbers.

## Human vs. AI

- **Bruno decided / specified:** the parity-first rule and the no-backend-changes rule (ADR-0003);
  the phase order in `MIGRATION.md`; the licence allow-list that ruled out `ua-parser-js` v2
  (AGPL-3.0) and CKEditor; the privacy rules that ruled out third-party scripts and console logging
  of personal data; the design system that the restyling follows (ADR-0009); reviewed and merged
  every PR.
- **Claude proposed / implemented:** all route implementations, tests, PR route inventories and
  commit messages; found and diagnosed the legacy quirks listed above; proposed each
  fix-vs-replicate call with its reasoning in `MIGRATION.md` before implementing it.
- **Corrections Bruno made to AI output:** TODO(Bruno) — record anything changed in review on
  #2, #3, #5, #6, #7 and #8/#9, including whatever prompted the discussion on #8.

## Verification

Each PR was gated on `pnpm -C web typecheck`, `lint`, `test` (Vitest) and `e2e` (Playwright), plus a
browser check via the brave-devtools MCP at 390px and 1280px, in light and dark mode, in English and
German, watching for console errors and third-party requests.

Test totals grew across the phase as recorded in the PRs: 70 unit / 36 e2e at #3, 133 unit / 58 e2e
at #7, and **159 unit tests across 20 files and 72 e2e tests** at #9. Several tests exist
specifically to pin decisions that a later refactor could silently undo: that `session_key` cannot
reach the DOM, that the reset confirmation never reveals whether an account exists, that the
oauth-error page links nowhere external, and that the reset token is actually sent.

Not covered automatically: the WebAuthn registration ceremony itself, which needs a real or
CDP-virtual authenticator plus browser permission UI. It is tested up to the point the browser takes
over. The wrong-password path on the security page was additionally exercised against the real
backend on `:8000`, which returned a genuine 401.

## Observations for the thesis

- Porting an existing application is, in practice, largely an act of **reading**: the majority of the
  decisions recorded in Phase 1 came from discovering what the legacy code does rather than from
  choosing how to write the new code. This is worth stating in the methodology chapter, since it
  contradicts the intuition that a "rewrite for parity" is mechanical work.
- The AI-assisted workflow was good at exactly this reading task — a swapped `for`-loop condition, a
  destructuring rename, an enum indexed into the wrong type, a Content-Type appended twice — and
  these are defects that had survived in a released open-source application. Whether that
  constitutes a general finding or an artefact of this particular codebase is TODO(Bruno) to judge.
- The parity rule's real function was not to prevent change but to force every change to be
  *argued and recorded*. The `MIGRATION.md` quirks table, written as a side effect of the rule, is
  now the most detailed artefact of the rewrite process.
- Several findings concern the target users directly: API keys rendered permanently in full on a
  page teachers mirror onto classroom projectors, and session deletion with no confirmation although
  it can sign you out of the browser you are using.

## Open points

- **Phase 1 is not fully closed.** The TOTP, backup-code and passkey *sign-in* branches of
  `/account/login` are still stubbed: `SUPPORTED_METHODS = ['PASSWORD']` in
  `web/src/features/auth/useLoginFlow.ts:11`, and the method picker filters the rest out. The
  consequence is asymmetric and user-visible: `/account/settings/security` lets a teacher **enrol**
  a second factor they cannot yet **sign in with**. Completing it needs `startAuthentication()` plus
  the TOTP and backup-code forms, and is tracked as its own item in `MIGRATION.md`.
- The avatar Content-Type bug is worked around client-side in `useAvatarSvg.ts` and has **not been
  reported upstream** (ADR-0014).
- `authenticatorAttachment` and the `hair_color` enum mix-up are flagged for after parity.
- Backend timestamps are naive and normalised to UTC client-side; correct only because the api
  container runs UTC. Worth fixing in the backend later.
- `lib/hashcash.ts` remains ported but unused in `web/`; keep or drop it with the `/play` captcha
  decision.
