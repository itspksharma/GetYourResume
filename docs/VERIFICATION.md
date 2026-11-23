# Verification record

Executed locally on 24 November 2026 with Node 22.23.2 and installed Chrome.

- `npm run check`: passed strict TypeScript, ESLint, 55 Vitest/React Testing Library tests, and the Vite production build.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`: all 5 browser journeys passed. These cover guided profile creation/editing, local persistence, analysis, tailoring, version isolation, template switching, print triggering, JSON export/restore, mobile navigation and theme, corrupt-storage recovery, and standard fallback when AI is disconnected.
- The print test generated a real multipage PDF from explicitly fictional data, verified its page count, imported that file through the application, and confirmed that the candidate name and last work entry survived extraction. It also checked that navigation was hidden for print and that no uncaught browser errors occurred.
- Desktop, mobile, and resume-builder screenshots were generated in `docs/screenshots/` and visually inspected. Mobile screenshots wait for the navigation transition to complete.
- Wrangler `deploy --dry-run` succeeded with the AI and both rate-limit bindings. No Worker was published by this check.
- A separate production build with `VITE_BASE_PATH=/GetYourResume/` passed; the emitted HTML points scripts, styles, and favicon at that project prefix.
- The final dependency installation reported zero known npm vulnerabilities. This is a point-in-time advisory check, not a security guarantee.

## Not yet verified

- A real Workers AI inference request, production Turnstile verification, account free-tier state, and deployed abuse limits require the owner's Cloudflare setup. Provider responses and verification are mocked in Worker unit tests only; the application itself has no fake provider responses.
- GitHub Pages and Worker deployment have not been performed. Configure account-specific origins, hostname, widget keys, and deployment credentials using the README.
- Browser print dialogs and pagination on browsers other than the tested Chrome require manual checking. The automated PDF test verifies multipage text continuity and the Chrome print route, not universal ATS parsing or every possible layout.
- DOCX extraction is implemented with Mammoth and included in the production build but has not been exercised by a browser fixture test. Scanned PDF OCR is intentionally unsupported.

No performance, ATS acceptance, hiring prediction, test coverage percentage, or live model accuracy is claimed.
