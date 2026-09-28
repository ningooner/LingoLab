# AI usage log

A record of how AI tools were used in this project, kept for the thesis's AI-use declaration and methodology chapter.
Check PHZH's current rules on declaring AI use: TODO(Bruno).

## Tools

| Tool | Version / model | Used for | Since |
|---|---|---|---|
| Claude (claude.ai chat) | Claude Opus 5 | Proposal review, repository and licence analysis, stack decisions, workspace kit | 2026-09-15 |
| Claude Code | TODO(Bruno): record via `/model` and `claude --version` | Implementation (frontend rewrite, features), tests, PRs | TODO |
| chrome-devtools-mcp (with Brave) | latest at install | Agent-driven browser checks: screenshots, console, network, accessibility | TODO |
| shadcn MCP + official shadcn skill | latest at install | Component search and installation | TODO |
| Context7 MCP | hosted | Current library documentation | TODO |
| UI UX Pro Max (one-time) | TODO | Design inspiration, compared against `lingolab-design` | TODO |

## How AI output is checked
- Every change goes through a PR that Bruno reviews and merges.
- Type check, lint, unit and e2e tests must pass.
- UI is checked in the browser (agent screenshots, then Bruno's own check).
- Behaviour is compared with the legacy ClassQuiz app.
- Licences of new dependencies are checked (`attribution.md`).

## Log

| Date | Task | Tool | What the AI did | What Bruno did / decided | Verification |
|---|---|---|---|---|---|
| 2026-09-15 | Proposal review and pivot analysis | Claude (chat) | Read the proposal; analysed ClassQuiz (code size, stack, containers); summarised MPL-2.0; flagged schedule risk | Chose self-hosting, forking ClassQuiz, React rewrite, MPL-2.0 | Bruno reviewed; repo facts checked from a cloned copy |
| 2026-09-15 | Workspace kit v1–v3 | Claude (chat) | Wrote `CLAUDE.md` files, skills, `MIGRATION.md`, dev compose, MCP config, design-system draft, documentation system and seed ADRs | Set requirements (Brave, design consistency, ask-before-documenting); reviewed and committed | Package versions checked against npm; hook tested; compose file not run (TODO) |
| 2026-09-15 | Push blocked by secret scanning | Claude (chat) | Diagnosed upstream secrets in history; proposed allow-and-remove | Resolved on GitHub (TODO: confirm) | Push succeeded (TODO: confirm) |
| 2026-09-17 | Phase 0 foundation (PR #1) | Claude Code (Opus 5) | Scaffolded `web/`: Vite/React/TS strict, Tailwind v4 + shadcn, design tokens, TanStack Router/Query, generated API client, auth context, i18n, app shell, socket layer | Set the stack and design system (ADR-0006, ADR-0009); reviewed and merged | typecheck, lint, Vitest, Playwright; `/styleguide` checked in the browser |
| 2026-09-17 | Port `/account/login` + `/account/register` (PR #2) | Claude Code (Opus 5) | Rebuilt the two-step login state machine and the register form; found the unchecked `returnTo` open redirect and the absent captcha; wrote tests and the PR route inventory | Approved splitting the login methods (password/OAuth first); reviewed and merged | typecheck, lint, 35 unit + 4 e2e; brave-devtools at 390/1280px, light/dark, en/de |
| 2026-09-17 | Port the password-reset pair (PR #3) | Claude Code (Opus 5) | Found the `let { token: string }` destructuring-rename bug that makes the legacy reset impossible; wired the token through; dropped the unreachable 404 alert | Reviewed and merged; kept the inverted upstream route names | typecheck, lint, 70 unit + 36 e2e; browser check; tests pin the token and the anti-enumeration wording |
| 2026-09-17 | Port `/account/oauth-error` (PR #5) | Claude Code (Opus 5) | Ported the page; added `oauth_error_page.*` keys in en + de; removed the upstream issue-tracker link; made the `?error` mapping explicit | Reviewed and merged | typecheck, lint, unit test pinning that the page links nowhere external |
| 2026-09-17 | Port `/account/settings` (PR #6) | Claude Code (Opus 5) | Ported profile, password, API keys and sessions; found `session_key` leaking to the client, API keys logged to the console and rendered in full; flagged `ua-parser-js` v2 as AGPL-3.0 and wrote a local replacement | Confirmed the licence allow-list; reviewed and merged | typecheck, lint, unit + e2e; a unit test pins that `session_key` cannot reach the DOM |
| 2026-09-17 | Port `/account/settings/avatar` (PR #7) | Claude Code (Opus 5) | Corrected the task brief (a 12-step wizard, not upload+crop); diagnosed the double `Content-Type` that blanks every avatar; wrote `useAvatarSvg`; fixed the latent `settings_/` routing bug from PR #6 | Reviewed and merged; accepted the client-side workaround over a backend change (ADR-0014) | typecheck, lint, 133 unit + 58 e2e (24 new); browser check at 390/1280px |
| 2026-09-17 | Port `/account/settings/security` (PRs #8 → #9) | Claude Code (Opus 5) | Ported backup code, TOTP, WebAuthn and the require-password switch; found the missing cancelled-prompt guard, the dead `transports` loop and the hardcoded `aria-checked`; added `@simplewebauthn/browser` and `qrcode.react` | Reviewed on #8; re-landed as #9 after the stacked base branch was deleted on merging #7 | typecheck, lint, 159 unit (20 files) + 72 e2e; wrong-password path exercised against the real backend; WebAuthn ceremony itself not automatable |
| 2026-09-17 | Phase 1 documentation | Claude Code (Opus 5) | Wrote the Phase 1 devlog and ADR-0011 … ADR-0015 from commits, PR bodies and `MIGRATION.md` | Requested `/document all` for the whole phase; reviews the drafts | Facts checked against `git log`, `gh pr view` and the repo; open questions left as `TODO(Bruno)` |
