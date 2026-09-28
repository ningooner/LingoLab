# ADR-0013: Un-nest the settings child routes with TanStack Router's trailing underscore

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decided by:** Bruno Zingg (found and proposed by Claude during PR #7)

## Context

TanStack Router's file-based routing derives the route tree from the directory layout: a file at
`routes/account/settings/avatar.tsx` becomes a child of `routes/account/settings.tsx` and renders
inside that parent's `<Outlet />`.

PR #6 placed `avatar.tsx` and `security.tsx` under `routes/account/settings/`. The ported
`/account/settings` page renders no `<Outlet />` — it is a self-contained page, exactly as the legacy
app's settings page is — so **neither child route could ever render**. The parent's auth guard also
ran first and redirected with its own `returnTo`, masking the problem behind a plausible-looking
redirect. The defect was latent for one PR because no child route existed yet at the time.

The legacy app has no shared settings layout either: `/account/settings`,
`/account/settings/avatar` and `/account/settings/security` are three independent pages that happen
to share a URL prefix.

## Options considered

1. **Add an `<Outlet />` and a layout to `/account/settings`.** Pro: idiomatic nesting. Con: invents
   a shared settings shell that legacy does not have, which is a redesign of a flow and therefore
   forbidden during the parity phase (ADR-0003). It would also make the parent's data fetching and
   auth guard run on every child page.
2. **Flatten the URLs** (for example `/account/avatar`). Pro: no router subtlety. Con: changes URLs
   that exist in the legacy app, breaking parity and any bookmarks.
3. **Use TanStack Router's trailing-underscore convention:** move both files to
   `routes/account/settings_/`. The underscore un-nests the segment, so the routes become top-level
   again while the *URLs* stay `/account/settings/avatar` and `/account/settings/security`.

## Decision

Option 3. Both files live in `web/src/routes/account/settings_/`. URLs are unchanged, each page
carries its own `requireAuth` guard, and the route tree now matches the legacy app's structure: three
sibling pages, no shared layout.

## Consequences

- Positive: both child routes render; each guards itself with its own `returnTo`; the file layout
  now expresses the intended structure rather than an accidental one.
- Positive: it keeps the door open for a genuine settings layout later, as an explicit
  post-parity design decision rather than a side effect of where a file was put.
- Negative: the trailing underscore is easy to miss in review and to delete in a refactor. Anyone
  moving these files back under `settings/` silently breaks both pages, and nothing fails at
  compile time — the routes simply never render.
- Neutral: this is a fix to our own code from PR #6, not a deviation from legacy. It is recorded in
  the `MIGRATION.md` quirks table anyway, because that table is the project's record of *why* the
  route structure looks as it does.

## References

- Commit `efc779c`, PR #7 (fixing a latent bug introduced in PR #6, commit `1ab4457`)
- `MIGRATION.md`, quirks row `account/settings (PR #6)`
- `web/src/routes/account/settings_/{avatar,security}.tsx`
