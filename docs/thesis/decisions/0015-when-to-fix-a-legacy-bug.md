# ADR-0015: When to fix a legacy bug and when to replicate it

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decided by:** Bruno Zingg (criterion drafted by Claude from the Phase 1 cases)

## Context

ADR-0003 requires the React app to reproduce the legacy app's behaviour and forbids new features and
redesigned flows during the rewrite. The project rules add: if something in the legacy app looks like
a bug, record it in `MIGRATION.md` and *replicate the intended behaviour*.

Phase 1 turned up roughly fifteen such cases and showed that the rule needs a sharper criterion,
because "the intended behaviour" is doing a lot of work. Two cases from the same pull request make
the ambiguity concrete:

- **`save_password_required()`** on `/account/settings/security` was the only one of six handlers
  missing the `if (!pw) return;` guard. With a cancelled password prompt it sent `password: null`,
  took the resulting 401, and read `.require_password` off the error body `{detail:"Invalid"}` —
  silently setting the switch to `undefined`. Nothing about that outcome is intended by anything.
- **`authenticatorAttachment`** in the same file is forced to `'cross-platform'`, overriding what the
  backend sent, so platform authenticators (Touch ID, Windows Hello) cannot enrol. That is a
  coherent, if debatable, policy: it works, consistently, and someone could have meant it.

Replicating the first would have shipped a broken switch. Fixing the second would have changed which
physical devices teachers can use to sign in — a behaviour change, made by us, during a phase whose
whole point is not to make them.

## Options considered

1. **Replicate everything literally, including defects.** Pro: an unambiguous rule, and the strongest
   possible parity comparison. Con: ships known-broken behaviour (a reset route that cannot reset a
   password, an open redirect, a save that hangs forever); indefensible for security defects.
2. **Fix anything that looks wrong.** Pro: a better application. Con: dissolves the parity rule — the
   comparison with legacy stops being meaningful, and every fix is an unreviewed scope increase.
3. **Fix by an explicit criterion, record every call.** Pro: keeps parity meaningful while refusing
   to ship defects; produces a written record of each deviation. Con: requires judgement per case and
   discipline in recording.

## Decision

Option 3, with this criterion:

> **Fix** when the legacy code cannot do what it evidently intends — it crashes, the handler is dead,
> the branch is unreachable, a guard is missing that its own siblings have, or the behaviour is a
> security or privacy defect.
>
> **Replicate** when the legacy code does something coherent that we merely disagree with —
> especially when changing it would alter which users, devices or inputs the system accepts.

"Evident intent" is read from the code itself: sibling handlers doing the same job correctly, a
button's label and enabled state, a server loader that exists for one purpose, an enum the backend
declares. Where intent cannot be read off the code, the case is replicated and flagged, not guessed.

Three procedural requirements make the criterion auditable:

1. Every call — fix, replicate or drop — goes in the `MIGRATION.md` "Legacy quirks" table with its
   reasoning, before implementation.
2. Every fix is pinned by a test, so a later refactor cannot silently revert it.
3. Every replicated defect is flagged for after parity, so replication is a deferral and not an
   endorsement.

## Consequences

Applied across Phase 1, this produced:

| Fixed | Why it met the criterion |
|---|---|
| `password-reset` token bound by a destructuring rename, so every reset posted `token: undefined` and 400'd | The route cannot complete a reset at all; its server loader exists only to read `?token` |
| `returnTo` on login redirected to unchecked (open redirect) | Security defect |
| `save_password_required()` missing the cancelled-prompt guard | Five sibling handlers have it |
| Avatar route had no auth guard, a dead `Finish` button, and a save failure that hung the spinner forever | Dead handler; missing guard; unhandled error path |
| `session_key` (a live credential) delivered into the page; API keys rendered in full and logged to the console | Security and privacy defects |

| Replicated | Why it met the criterion |
|---|---|
| `authenticatorAttachment = 'cross-platform'` | Changes which devices can enrol |
| Backend indexes `hair_color` into the wrong enum | A backend bug; degrades the palette rather than breaking the route, and fixing it means touching `classquiz/` |
| `423 Locked` on register falling into the generic error branch | Coherent, if unhelpful; flagged for when self-hosting docs land |
| `?verified` tested by presence, so `?verified=false` also shows the success badge | Harmless and coherent |
| The backend's decoy session for unknown accounts | Not a bug at all: deliberate anti-enumeration |

A third outcome, **drop**, appeared for behaviour that is dead or actively harmful to keep: the
unreachable `alert('user not found!')` on the reset page (porting it would have turned an
anti-enumeration feature into a leak the moment the backend changed), the link to the upstream
author's issue tracker, and the click-the-backup-code-text-to-download behaviour.

- Positive: no known-broken behaviour was shipped, and the parity comparison stays meaningful because
  every departure from it is named.
- Negative: the criterion is a judgement, not a test. The `authenticatorAttachment` call in
  particular is arguable — it is replicated here, and remains a live limitation for any teacher whose
  only authenticator is a platform one.
- Negative: each replicated defect is a small debt, and the "after parity" list is where they
  accumulate. It needs to be worked, not just appended to.
- Neutral for the thesis: the fix/replicate split is itself a finding about rewriting an existing
  open-source application under a parity constraint, and the quirks table is its evidence.

## References

- `MIGRATION.md`, "Legacy quirks" (the table is the per-case record this ADR governs)
- Commits `dac801e`, `9625162`, `befcec9`, `1ab4457`, `efc779c`, `51de62f`; PRs #2, #3, #5, #6, #7, #9
- ADR-0003 (parity first), ADR-0014 (a backend bug worked around rather than fixed)
