# TASK-1453 — Premium UI Platform Visual Direction

## Decision

Direction selected: **Quiet Command Center** — enterprise density with editorial hierarchy, restrained luminous depth, strong selection context and causal motion. It is not a dark cockpit skin: light surfaces remain primary and depth is reserved for focus, preview and decision zones.

## Reference inputs

- Greenhouse AXIS palette, Geist typography and current Composition Shell.
- Existing strong repo examples: Composition Shell Lab, card-density Lab and artifact composer surfaces.
- The failure mode captured by the operator: flat white card wallpaper, weak hierarchy, uniform primary-blue accents and unstructured density.

## Alternatives rejected

1. **Pure Vuexy admin** — safe and familiar, but generic and visually flat.
2. **Marketing glassmorphism** — visually rich, but noisy and inappropriate for dense operational work.
3. **Dark control room** — dramatic, but unsuitable as universal enterprise default.

## Visual thesis

- A first fold must reveal one dominant decision, one contextual relationship and at most five supporting signals.
- Use contrast of scale/weight/spacing before color.
- Depth is zoned: base canvas → operational surface → selected/context surface → floating transient.
- The base canvas is spatial substrate only. Navigation chrome may cross it, but sustained readable content—headings, lists, metadata, evidence and decisions—belongs to a recipe-owned paper/work plane.
- Chrome is budgeted: open sections, rails and dividers carry most grouping; contained surfaces are reserved for selected, immersive, stage or floating roles.
- Every archetype has one task-native visual impact moment, not uniformly distributed card polish.
- Primary blue is an action/selection signal, not decoration.
- Motion explains ownership and causality; it does not celebrate routine clicks.

## Desktop target

- 12-column composition through Composition Shell regions.
- Editorial header with concise title, state and one primary action.
- Signal strip is a band, not a grid of identical KPI cards.
- Inventory/detail maintains a visible selection seam.
- Report archetype uses a narrative lead and evidence sequence.
- Settings archetype shows progress/context without turning every step into a card.

## Mobile target

- One narrative/decision column.
- Primary context before secondary metrics.
- Temporary context uses canonical drawer/sidecar behavior.
- Commands remain reachable without sticky overlays covering content.
- Every container can honestly condense; no clipping or hidden primary datum.

## Token mapping

- Typography: Geist theme variants only.
- Color: `theme.palette.*` / `theme.axis.*` / CSS palette variables.
- Spacing: theme spacing, 4n rhythm.
- Radius: custom shape tokens.
- Depth: theme shadows/elevation tokens and approved gradient tokens.
- Motion: canonical core motion tokens and wrappers.

## Signature details

- Section eyebrows and compact provenance/freshness lines.
- Selection seam/rail connecting inventory to detail.
- Controlled gradient or tinted depth only in hero/preview/focus zones.
- Metric typography with tabular numerals where relevant.
- Action clusters separated by consequence, not by arbitrary button rows.
- Empty/partial states preserve the shape of the normal composition.

## Anti-patterns

- Nested rounded white cards at every level.
- Operational text or rows floating directly on `background.default` without a reading-plane owner.
- One blue outline per selectable thing.
- More than one contained primary in the same header/context.
- Uniform font size/weight across metadata, title and action.
- Placeholder charts, fake zeros or unlabeled skeleton rectangles.
- Direct MUI composition when a Greenhouse primitive/recipe exists.

## Acceptance signature

- Visual scorecard average ≥4.5/5.
- No dimension below 4/5.
- Desktop and mobile evidence.
- hierarchy, surface economy, visual impact, `generic-template-feel` and `fidelity` each ≥4.5/5.
- Reduced-motion outcome equivalent.
