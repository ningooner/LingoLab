# ADR-0014: Work around the avatar `Content-Type` bug client-side instead of fixing the backend

- **Status:** Accepted (temporary; remove the workaround once upstream fixes the header)
- **Date:** 2026-09-17
- **Decided by:** Bruno Zingg (found and proposed by Claude during PR #7)

## Context

`/account/settings/avatar` displays the avatar being built by requesting SVG markup from
`GET /api/v1/avatar/custom`. That endpoint is declared with
`response_class=PlainTextResponse` and then *appends* a second Content-Type header, so the response
carries both `text/plain; charset=utf-8` and `image/svg+xml`. Browsers honour the first one and
refuse to paint the response in an `<img>`.

The consequence is not subtle: **every avatar image is blank in the legacy app**, and always has
been. Porting the route faithfully would have meant porting a wizard whose preview shows nothing.

The rewrite phase forbids modifying `classquiz/` (project rule and ADR-0003), and the correct fix is
one line in that directory.

## Options considered

1. **Fix the backend.** Pro: the real fix, one line, benefits every consumer. Con: explicitly out of
   scope for this phase; would fork the backend from upstream and add a migration burden at every
   upstream merge.
2. **Rewrite the header in the Vite dev proxy.** Pro: no application code. Con: works in development
   only. In production the app is served by Caddy behind a Cloudflare Tunnel, so the bug would come
   back at deployment — and, worse, would be *hidden* during development, which is the failure mode
   most likely to reach users.
3. **Relabel the bytes client-side.** A hook, `web/src/features/settings/useAvatarSvg.ts`, fetches
   the markup with `fetch`, wraps it in a `Blob` typed `image/svg+xml`, and serves it from an object
   URL. Pro: works identically in dev and production; contained in one file with one obvious reason
   to be deleted. Con: an extra fetch per image instead of letting the browser load the `<img>`
   directly, and a workaround living in our code for a defect that is not ours.
4. **Replicate the blank preview.** Pro: literal parity. Con: parity with a route that visibly does
   not work; the wizard's entire purpose is the preview.

## Decision

Option 3. `useAvatarSvg` relabels the response client-side. The hook is documented as temporary and
should be deleted once the upstream `Content-Type` is corrected.

Option 1 remains the correct fix and is deferred, not rejected on the merits.

## Consequences

- Positive: the avatar wizard works, in development and in production, without touching
  `classquiz/`.
- Positive: the workaround is isolated in one hook with a stated removal condition, so it does not
  spread into the components.
- Negative: an extra network round trip per avatar image, and a blob URL lifecycle to manage.
- Negative and worth stating plainly: **the bug has not been reported upstream.** The project takes
  from a fork (ClassQuiz, MPL-2.0) and this is a defect found by reading its code that upstream does
  not know about. Reporting it — or sending the one-line fix — is an open-source-ethics item for the
  thesis (proposal §9.3), not merely a housekeeping task. TODO(Bruno): decide whether to file an
  upstream issue or PR, and record the outcome here.
- Neutral: the same PR also *replicated* a second backend bug on this route (`hair_color` indexed
  into the 15-member `Color` enum instead of `HairColor`, `classquiz/routers/avatar.py:54`), because
  that one degrades the palette rather than breaking the route. The difference between the two calls
  is the subject of ADR-0015.

## References

- Commit `efc779c`, PR #7
- `MIGRATION.md`, quirks rows for `account/settings/avatar`
- `web/src/features/settings/useAvatarSvg.ts` and `useAvatarSvg.test.ts`
- ADR-0002 (fork), ADR-0003 (parity first), ADR-0015 (fix vs. replicate)
