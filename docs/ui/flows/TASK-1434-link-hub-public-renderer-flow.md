# TASK-1434 — Link Hub Public Renderer Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1434 — Link Hub public renderer`
- Related wireframe: [TASK-1434-link-hub-public-renderer.md](../wireframes/TASK-1434-link-hub-public-renderer.md)
- Intended surface: `links.efeoncepro.com/<slug>` and an active custom host
- Flow type: `public single-page + governed outbound navigation`

## Flow

1. The visitor opens the profile URL inside Instagram, TikTok or a normal browser.
2. The renderer resolves only the published projection and shows brand, destinations and honest unavailable states.
3. The visitor activates a typed destination; the browser uses the kind-specific safe navigation policy.
4. A best-effort click event is emitted without delaying or blocking navigation.
5. For embedded Growth Forms, the canonical form flow owns validation, consent, submission and success/recovery.

## Routing and recovery

- Standard host resolves by slug; custom host resolves by verified hostname to the same `link_page_id`.
- Missing, paused or unpublished pages return a branded safe not-found state and never expose draft existence.
- External destinations preserve native back behavior; no client-side router intercepts them.
- Analytics failure is fail-open for navigation. Unsafe/unknown schemes are fail-closed before publication.
- Reload reads the same immutable published version until a new version is promoted.

## Focus and accessibility

- Initial focus remains at document start; a skip link reaches the destination list when needed.
- Every destination is a native link/button with visible focus and an accessible name.
- New-tab behavior is declared in visible/accessible copy when used; focus is never moved programmatically on tap.
- Embedded form errors use the Growth Forms focus/error contract.

## GVC scenario plan

- Capture Efeonce fixture at 390 and 1440, plus one custom-brand fixture.
- Exercise keyboard traversal, one outbound destination, unavailable link, embedded-form state and analytics failure.
- Assert `scrollWidth <= clientWidth`, no error boundary, correct focus order and no draft data.

## Decision log

- Use native public navigation plus typed destination adapters; no SPA workflow or custom transition layer.
- The flow file exists because outbound navigation, embedded forms and recovery cross trust boundaries even though the visual surface is one page.
