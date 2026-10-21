# Design direction — Libro Search

This document is the project's visual contract. Use the principles of Impeccable for intentional hierarchy and a clear product identity; use Anti-Slop to reject generic AI UI patterns.

## Product feel
A focused, editorial book-finding tool: quiet, legible, slightly literary, and quick. The interface should make the search query and source-by-source reliability the most important elements.

## Hierarchy
1. Search input and submit action.
2. Search query and total of verified results.
3. Results with title, source, and a direct original-source link.
4. Per-source status, clearly separated from actual book results.
5. Supporting information and limitations.

## Visual language
- Warm near-black surfaces with restrained lime/olive accent are acceptable as the current prototype direction; use accent only for primary actions, focus, and meaningful status.
- Typography must be readable at mobile sizes. Use a small, deliberate type scale and avoid excessively tight display text.
- Use thin borders and spacing before shadows. No glassmorphism, neon glows, decorative gradient blobs, or nested card stacks.
- Do not show fabricated book covers. Until real cover metadata is sourced, use a neutral typographic placeholder that is clearly not a cover.
- Source status must use text as well as color, so color is never the only signal.
- Responsive first: one-column results on narrow screens; no horizontal overflow.
- Keep motion minimal and honor reduced-motion preferences.

## Result design
A result should display only verified fields. Minimum: title, source name, and original URL. Author, language, format, publication year, and cover may appear only when extracted and validated. Duplicate detection must not merge unrelated editions just because titles are similar.

## States
- Idle: explain that the query searches the configured sources.
- Loading: show that sources are being queried, without fabricated progress.
- Success: distinguish result count from number of sources responding.
- Partial failure: show each source's own state and allow opening its search page.
- Empty: say that no result was detected; do not imply that the book does not exist.
- Error: actionable, plain-language explanation.

## Quality gate
Before calling the interface done, inspect it at mobile and desktop widths, test keyboard focus and form submission, check long titles and source names, and confirm that status labels match actual API responses.
