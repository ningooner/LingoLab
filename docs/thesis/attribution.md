# Attribution and licences

LingoLab is licensed under **MPL-2.0** (see `LICENSE`).

## Upstream project
- **ClassQuiz** by Marlon W (Mawoka) and contributors: https://github.com/mawoka-myblock/ClassQuiz, MPL-2.0.
  LingoLab is a fork with full history (ADR-0002, ADR-0005).
- Upstream files keep their `SPDX-FileCopyrightText` lines. Files modified in this project add
  `SPDX-FileCopyrightText: 2026 Bruno Zingg`.
- `frontend/src/lib/tinykeys.ts` is MIT-licensed (see `LICENSES/MIT.txt`).

Find upstream-derived vs. new files:
```bash
grep -rl "Bruno Zingg" --include=*.{ts,tsx,py,md} . | grep -v node_modules     # touched or created by Bruno
grep -rL "Bruno Zingg" --include=*.py classquiz                                 # untouched upstream backend files
```

## Third-party components and assets (update when adding)

| Component | Licence | Use |
|---|---|---|
| React, Vite, TanStack Router/Query, Zustand, zod, react-hook-form | MIT | Frontend |
| @hookform/resolvers | MIT | zod ↔ react-hook-form bridge (replaces legacy yup), added in PR #2 |
| @simplewebauthn/browser | MIT | WebAuthn registration ceremony on `/account/settings/security`; the library legacy uses, so the payload matches the backend (PR #9) |
| qrcode.react | ISC | TOTP QR code, rendered locally so the secret never leaves the browser (PR #9) |
| fuse.js | Apache-2.0 | Fuzzy search on `/dashboard`; the library legacy uses, with the same options (PR #11) |
| thumbhash | MIT | Blurred placeholders for stored images (`components/MediaComponent.tsx`), as in legacy (PR #11) |
| sonner | MIT | Toasts, replacing legacy `alert()` (ADR-0011) |
| shadcn/ui (components and agent skill) | MIT | UI components |
| Tailwind CSS | MIT | Styling |
| lucide-react | ISC | Icons |
| i18next / react-i18next | MIT | Translations |
| socket.io-client | MIT | Real-time |
| Tiptap | MIT | Rich text (replaces CKEditor 5, which is GPL/commercial) |
| Lexend, Atkinson Hyperlegible Next (via Fontsource) | OFL-1.1 | Fonts |
| chrome-devtools-mcp | Apache-2.0 | Development tool only |
| UI UX Pro Max skill | MIT | Development tool only (one-time) |

## Other sources
- Okabe–Ito colour-blind-safe palette: Okabe, M., & Ito, K., *Color Universal Design* (TODO(Bruno): verify the exact citation).
- Legacy translations (Weblate contributors of ClassQuiz), reused under MPL-2.0.

## Removed or not used
- Sentry and Plausible (privacy), CKEditor 5 (licensing).
