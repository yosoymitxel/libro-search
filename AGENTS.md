# Project rules — Libro Search

## Product boundary
This project searches the exact nine user-selected sources below. Do not silently replace them with public catalogues, general web search, or other providers:
1. Docer.com.ar
2. Mundo EPUB
3. PDF Drive
4. Bookmate
5. Libronera — https://libronera.com/
6. Epubera — https://epubera.com/
7. Lectulandia — https://ww3.lectulandia.co/
8. Epublandia — https://epublandia.net/
9. Z-Library — https://z-library.im/

The first four were supplied as names/listing labels; their canonical URLs must be confirmed instead of guessed. Preserve the user's intended source list even when a source is down, redirects, or blocks automation. Report its real status and provide an official/original-site search link when known. Never claim a source works without a real test.

## Anti-slop: honest, specific UI and copy
- No fake book covers, fake metadata, invented counts, placeholder search results, or made-up availability.
- Clearly distinguish verified results, unverified source configurations, blocked sources, and errors.
- UI should serve the book-search workflow; avoid decorative dashboard cards, generic AI slogans, pointless badges, gradients, and animation without purpose.
- Preserve accessible labels, keyboard operation, visible focus, responsive layout, and useful loading/empty/error states.
- Every visual choice must have a reason documented in `DESIGN.md`.

## Ponytail: minimum sufficient implementation
- Read the code path before editing; fix root causes instead of layering workarounds.
- Prefer Node.js built-ins and native browser features before adding dependencies.
- Do not add abstractions, frameworks, files, configuration, or dependencies without a concrete need.
- Keep source-specific behavior isolated in adapters. A broken source must not break the rest.
- Validate untrusted inputs; cap response size, request time, and concurrency.
- Never bypass login, CAPTCHAs, paywalls, rate limits, or anti-bot/access controls. Respect site terms and robots policies.
- For writes or downloads, require explicit authorization; the current product is search-and-link, not a file-hosting service.
- Add a focused test for logic with branches, parsing, security boundaries, or regressions. Report what was and was not tested.

## Source verification
A source is not verified just because a URL returns HTTP 200. Test a known query, inspect response type/content, confirm that extracted links are book records, and note redirect/cookie/JS/access restrictions. Never present generic navigation links as book results. Use an adapter-specific parser only when evidence supports it.

## Required checks before claiming completion
1. Run `npm run check`.
2. Test the API with a known query and inspect per-source status.
3. Verify that failed sources are reported accurately.
4. Review changed files for invented data, insecure URL handling, and regressions.
5. State any remaining unverified sources and limitations plainly.
