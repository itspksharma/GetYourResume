# Verification record

Updated 24 November 2026 using Node 22.23.2 and installed Chrome.

## Application checks

- Strict TypeScript and ESLint passed after the unified-workflow and branding changes.
- All **63 Vitest/React Testing Library/Worker tests** passed. The storage schema and key remain unchanged, and legacy navigation has dedicated tests.
- All **8 Playwright browser journeys** passed on an isolated server at port 5199. They cover guided details, contextual AI generation and explicit acceptance, target-job matching, independent resume editing, data persistence/recovery, JSON restore, AI outage fallback, mobile navigation/theme, metadata in initial HTML, and direct PDF download.
- Browser tests explicitly inject a fake API URL and public test key, mock AI/Turnstile only inside tests, and do not spend the owner's real AI allocation. The existing development server on 5188 is not replaced.
- A production build with the GitHub Pages base `/GetYourResume/` passed. The portrait and font files are bundled public assets. No secret environment values were changed or included in search metadata.

## Visual and document checks

- Updated desktop/mobile/home/builder screenshots were captured under `docs/screenshots/` and visually inspected.
- Both creator portrait locations are checked for a completed image load with nonzero natural width. A browser assertion confirms that the home page's visible full creator name appears once. Greeting text and keyboard operation of the FAQ accordion are checked.
- Actual downloads for ATS Classic, Modern Professional, Developer Portfolio, and US Letter were generated. The PDF tests parse all pages, check A4/Letter dimensions, verify multipage text continuity and preserved user dates/links, and check for embedded fonts. They verify that the fictional candidate's text remains selectable and that application branding, creator identity, browser URLs, and portrait images are absent from the document.
- PDFs were rendered with Poppler for visual review. Line positions are measured explicitly, with reserved space for section and entry headings; long text continues inside the page margins rather than relying on unbreakable layout blocks. A focused PDF download test is rerun after page-break changes.
- The original creator photo is used as a JPEG branding asset. It is outside the resume renderer. Liberation Serif/Sans fonts are bundled with their redistributable license and used by both preview and PDF generation.

## Scope and remaining limits

- This update does not deploy or push changes to the public GitHub Pages site. Existing Cloudflare credentials, Worker configuration, and AI endpoints are left in place. The user verified live AI earlier; this update's automated tests simulate provider responses and do not independently reverify live inference.
- The HTML preview shows content and typography; downloaded PDFs apply final page breaks. Users should review each downloaded page before sending an application.
- The bundled fonts primarily cover Latin-based scripts; they are not a complete worldwide writing-system solution. PDFs contain selectable text but no PDF/UA accessibility conformance claim is made.
- SEO includes factual creator/application structured data, canonical/social metadata, crawlable public information, a sitemap, and an optional `llms.txt` summary. Search ranking, indexing, and AI-answer citations are not guaranteed. Effective robots.txt control for this GitHub project site belongs to the separate origin-root repository.
- Scanned PDF OCR is unsupported. DOCX text extraction is included in the build but has not been exercised by a dedicated browser fixture in this update.
- npm reported zero known vulnerabilities after installing the PDF renderer. This is a point-in-time advisory check, not a security guarantee.

No performance metrics, official ATS acceptance, hiring predictions, coverage percentages, or live-model accuracy are claimed.
