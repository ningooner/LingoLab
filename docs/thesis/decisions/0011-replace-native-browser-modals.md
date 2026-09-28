# ADR-0011: Replace native `prompt()` / `alert()` / `confirm()` with shadcn dialogs and sonner toasts

- **Status:** Accepted
- **Date:** 2026-09-17
- **Decided by:** Bruno Zingg (proposed by Claude during PRs #2, #3, #6, #9)

## Context

The legacy SvelteKit app uses the browser's native modal functions throughout the account area:
`prompt()` to ask for the current password before every mutating call on
`/account/settings/security`, `alert()` to report wrong credentials on login, failed resets, failed
password changes and 401s, and `confirm()` before deleting an API key or replacing a backup code.

Under the parity-first rule (ADR-0003) these are behaviour, not styling, so replacing them needed a
decision rather than a silent restyle. Four forces argued against porting them literally:

- They cannot be styled at all, so they break the design system (ADR-0009) on pages that otherwise
  follow it, and cannot be translated — the browser decides the language of the buttons.
- Browsers increasingly suppress them: Chrome blocks them in cross-origin iframes and offers users a
  "prevent this page from creating additional dialogs" checkbox that silently disables the app's
  only way of asking for a password.
- They block the main thread, and `prompt()` in particular cannot be driven reliably from
  Playwright, so the whole password-confirmation path of `/account/settings/security` would have
  been untestable.
- `prompt()` shows the typed password in clear text with no `type="password"` field and no password
  manager integration.

## Options considered

1. **Port them literally.** Pro: maximal parity, zero new code. Con: unstyled, untranslatable,
   untestable, suppressible, and shows passwords in clear text.
2. **Replace them with shadcn `Dialog` / `AlertDialog` and sonner toasts, keeping the call
   contract.** Pro: styled, translatable, testable, accessible (focus trap, labelled controls),
   password managers work. Con: a real behavioural deviation that has to be recorded; more code; the
   asynchronous replacement of a synchronous API risks changing control flow at the call sites.
3. **Replace only the ones that are outright broken (`prompt()`), keep `alert()`/`confirm()`.** Pro:
   smaller deviation. Con: three visual idioms on one page, and the same styling and i18n problems
   remain for the majority of the messages.

## Decision

Option 2. All three native modals are replaced:

- `prompt()` → a focus-trapped shadcn password dialog (`features/settings/useConfirmPassword.tsx`).
- `alert()` → `toast.error` via sonner, which was already a dependency, or an inline field error
  where the message belongs to a specific input (for example a wrong current password).
- `confirm()` → shadcn `AlertDialog` with a destructive confirm button.

The **call contract is deliberately preserved**: the password dialog resolves to a password or
`null`, so every call site keeps the legacy `if (!pw) return;` guard and the cancel semantics are
unchanged. This is what makes the change a presentation change rather than a logic change.

## Consequences

- Positive: the account area is consistently styled and fully translated (en + de); the
  password-confirmation path became testable and is covered by unit tests and Playwright specs; the
  destructive actions that legacy did not confirm at all (deleting a session, which can sign you out
  of the browser you are using) could be brought into the same idiom.
- Positive for the thesis's user group: teachers regularly mirror their screens onto classroom
  projectors, and a clear-text `prompt()` for the account password is a poor fit for that setting.
- Negative: a documented deviation from legacy behaviour on six routes, which has to be carried in
  the parity comparison rather than assumed away.
- Negative: the replacement is asynchronous where the original was synchronous. This is contained by
  keeping the resolve-to-password-or-null contract, but any future call site that forgets the
  `if (!pw) return;` guard will behave differently from legacy — exactly the bug that legacy's own
  `save_password_required()` had (ADR-0015).
- Neutral: sonner and the shadcn dialog primitives were already in the project; no new dependency.

## References

- Commits `dac801e`, `9625162`, `1ab4457`, `51de62f`
- PRs #2, #3, #6, #9
- `MIGRATION.md`, "Legacy quirks" rows for `account/login`, both reset routes, `account/settings`,
  `account/settings/security`
- ADR-0003 (parity first), ADR-0009 (design system)
