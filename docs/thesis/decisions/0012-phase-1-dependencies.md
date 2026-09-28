# ADR-0012: Dependencies added in Phase 1, and the deferred uploader question

- **Status:** Accepted (the uploader question remains open, deferred to Phase 2)
- **Date:** 2026-09-17
- **Decided by:** Bruno Zingg (proposed by Claude during PRs #2, #6, #7, #9)

## Context

The project's licence allow-list (MPL-2.0 project rules) permits MIT, ISC, BSD, Apache-2.0 and
MPL-2.0 without asking; anything else needs a decision. The privacy rules additionally forbid the
browser from calling any third-party service. Phase 1 therefore required a licence and privacy check
for every library the legacy routes depend on, not only for genuinely new ones.

Three separate cases arose.

## Options considered

### 1. Second-factor and TOTP libraries (`/account/settings/security`)

The WebAuthn registration ceremony and the TOTP QR code both need library support.

- **`@simplewebauthn/browser` (MIT)** — the same library the legacy app uses. Alternative: hand-roll
  the ceremony against the raw WebAuthn API. Rejected: the base64url encoding of the credential
  payload has to match what the backend's `py_webauthn` counterpart expects byte for byte, and
  reimplementing that for no gain is risk without benefit.
- **`qrcode.react` (ISC)** — the mapped replacement for legacy's `qrcode`, per the table in
  `web/CLAUDE.md`. It renders the QR code locally in the browser. Alternative: a hosted QR
  generator, which is ruled out outright — it would send the user's TOTP secret to a third party.

### 2. Form resolver (`/account/register`)

`@hookform/resolvers` (MIT) was added to bridge react-hook-form and zod, replacing legacy's yup
setup. No licence question.

### 3. Libraries deliberately *not* added (`/account/settings`)

Legacy formats session timestamps with `luxon` and user agents with `ua-parser-js`.
**`ua-parser-js` v2 is AGPL-3.0**, outside the allow-list; v1 is MIT but an unmaintained major
version. Options: ask for an AGPL exception, pin the unmaintained v1, or do without.

### 4. File uploads (`@uppy/react` vs. a custom dropzone) — deferred

`web/CLAUDE.md` carried an open question about replacing legacy's `@uppy/svelte`. The avatar route
was assumed to be where it would be answered. It is not: `/account/settings/avatar` is a twelve-step
wizard with no upload at all, and Uppy's only importers in the legacy app are `lib/editor/*` and
`routes/edit/files/uploader.svelte` — all Phase 2.

## Decision

- Add **`@simplewebauthn/browser` @14 (MIT)** and **`qrcode.react` @4 (ISC)**, both on the
  allow-list, both rendering entirely client-side.
- Add **`@hookform/resolvers` (MIT)**.
- Add **neither `luxon` nor `ua-parser-js`**. Dates use the built-in `Intl.DateTimeFormat`, which is
  already locale-aware; a roughly 30-line local parser in `web/src/lib/userAgent.ts` produces the
  same `"Chrome 140 (macOS)"` label and never echoes a raw user-agent string, so an
  attacker-controlled value cannot reach the table.
- **Defer the `@uppy/react` vs. custom-dropzone decision to Phase 2**, where the editor and media
  routes actually upload files. No upload dependency was added in Phase 1.

## Consequences

- Positive: every Phase 1 dependency is on the allow-list and needs no exception; nothing added in
  Phase 1 causes a third-party network request, which keeps the privacy rules intact for the whole
  account area.
- Positive: avoiding `ua-parser-js` removed both an AGPL exposure and an XSS-shaped risk (a raw UA
  string rendered into a table), at the cost of a small amount of code we now maintain.
- Negative: `lib/userAgent.ts` is ours to keep correct as browsers change. It is intentionally
  narrow — it produces a label, not a full parse — and is covered by unit tests.
- Neutral: the uploader question is still open and will be decided against the requirements of the
  editor, which is the right place for it; it should not be treated as a Phase 1 omission.

## References

- Commits `dac801e`, `1ab4457`, `efc779c`, `51de62f`
- PRs #2, #6, #7, #9
- `MIGRATION.md`, quirks rows for `account/settings` (ua-parser-js) and `account/settings/avatar`
  (Uppy)
- `docs/thesis/attribution.md`
