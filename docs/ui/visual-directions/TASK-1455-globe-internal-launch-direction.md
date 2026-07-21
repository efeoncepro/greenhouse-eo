# TASK-1455 — Globe internal launch visual direction

## Mode and source

- Mode: `repo-native-benchmark` anchored in canonical assets under `public/branding/SVG/`.
- Product truth: an internal creative-platform foundation is live; production capabilities are not.

## Alternatives

### A — Orbital Threshold — selected

Immersive midnight field, oversized/cropped Globe geometry as the single visual moment, compact operational status rail and one luminous entry action. Reading order: mark → “Creative operations, connected” → concise foundation statement → CTA → internal status.

Why selected: it makes arrival memorable without inventing a dashboard or hiding that this is an internal foundation.

### B — Studio Console — rejected

Bright operational console with header, status tiles and recent-work placeholders. Rejected because empty modules would imply capabilities/data that do not exist and drift toward a generic admin template.

### C — Gallery Field — rejected

Editorial art-board with campaign thumbnails and typographic collage. Rejected because fabricated work would be decorative/misleading and weaken the identity/security milestone.

## Decision

Select `Orbital Threshold`. It gives Globe a product-level arrival through one dominant canonical brand gesture, keeps the identity/security milestone legible and avoids fabricating projects or creative capabilities. The first fold must preserve this asymmetry at desktop and recompute it at 390px; a centered logo plus generic card is not an acceptable fallback.

## Desktop target

- 1440×1000, asymmetric 7/5 composition.
- Left lead contains eyebrow, headline, one paragraph and CTA.
- Right/lower art stage uses the canonical Globe mark at architectural scale, cropped by the viewport rather than boxed in a card.
- A thin status rail anchors environment, connection and “internal only”.

## Mobile target

- 390×844, content first, mark becomes a cropped top-right/or lower atmospheric shape.
- CTA full width; status rail wraps into two compact rows.
- No compressed desktop split, no horizontal scroll.

## Visual roles

- Midnight/navy is structural.
- Canonical Globe blue/orange/magenta stays inside supplied brand art and a restrained action accent.
- Poppins/display for the brand moment; system/Geist-like sans for operations where local font loading permits.
- Depth comes from open planes, subtle radial light and one hairline rail, not nested cards.

## Signature details

- The Globe silhouette crosses the fold edge, suggesting scale and a world in motion.
- A small “Greenhouse connected” signal makes governance visible without becoming a dashboard.
- Correlation/status details use tabular rhythm and low visual priority.

## Anti-patterns

- no card grid, model-logo wall, fake projects, particles, infinite orbit, glassmorphism stack or rainbow gradient;
- no raw JSON, access token, environment secret or provider error;
- no public-sales copy or “ready for production” claim.

## Token mapping

- Use local CSS custom properties derived from the supplied brand SVG and documented AXIS neutrals; centralize them once.
- Spacing follows 4/8 multiples; radii are restrained; focus ring is explicit.
- Motion variables are centralized and disabled through `prefers-reduced-motion`.

## Acceptance signature

At a glance the screen must read “Efeonce Globe exists, it is premium, connected and internal”; it must not read “temporary OAuth test page” or “empty MUI dashboard”.
