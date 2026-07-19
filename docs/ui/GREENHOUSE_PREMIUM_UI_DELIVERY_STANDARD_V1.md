# Greenhouse Premium UI Delivery Standard V1

Status: accepted
Owner: Platform / Product Design
Adoption: `TASK-1453` and every later new `ui-standard`/`ui-platform` task
Last updated: 2026-07-18

## Purpose

Make premium UI quality a reproducible delivery system rather than a late
prompting preference. It governs how agents turn product intent or an external
visual into differentiated Greenhouse UI with enterprise craft, causal motion
and auditable evidence.

## The four gates

| Gate | Question | Canonical command |
|---|---|---|
| Design contract | Is direction complete enough to implement without inventing? | `pnpm design-contract:lint` / `pnpm ui:readiness-check --task …` |
| UI code | Does implementation respect tokens, primitives and composition rules? | `pnpm ui:code-lint --changed` |
| UI visual | Does required desktop/mobile evidence, dossier and baseline exist? | `pnpm ui:visual-gate --task …` |
| UI quality | Does reviewed evidence meet the premium score threshold? | `pnpm ui:quality --task …` |

`design:lint` remains a compatibility alias for DESIGN.md structure; it is not
the product-quality gate.

### UI code gate compatibility policy

`ui:code-lint` distingue canon nuevo de infraestructura compatible:

- Una primitive Greenhouse nueva usa `theme.greenhouseElevation.<role>`. En ese scope,
  `var(--mui-customShadows-*)` continúa bloqueado porque no expresa intención semántica.
- Fuera de `src/components/greenhouse/primitives/**`, `var(--mui-customShadows-*)` se
  reconoce como token Vuexy de compatibilidad. No es una sombra literal ni convierte
  `customShadows` en el canon para trabajo nuevo.
- `fontSize` inline sigue bloqueado para texto/`Typography`. Un glyph Tabler renderizado
  con `<i>` o `<Box component='i'>` puede declarar su tamaño óptico explícito: es tamaño
  de ícono, no tipografía. La regla ESLint canónica mantiene la misma frontera.
- `--changed` evalúa el archivo completo para obtener contexto JSX, pero sólo reporta
  líneas realmente añadidas y conserva sus números de línea originales.

## Rigor

- `ui-lite` — tiny copy/style/state fix; no new composition. Direction/scorecard
  may be unnecessary, but tokens, a11y and proportional visual verification apply.
- `ui-standard` — new or meaningful visible surface/component. Full loop.
- `ui-platform` — primitive, recipe, shell, motion system or Design System.
  Full loop + Lab + platform docs + cross-archetype proof.

## Visual Direction Contract

Every full-loop task selects one mode.

### Source-led

Copy/version or durably reference the external source. Record source/provenance,
selected frame/state, desktop/mobile target, intent-vs-literal mapping,
token/primitive fidelity, deviations and baseline surface ID.

### Repo-native benchmark

Create `docs/ui/visual-directions/TASK-…-direction.md` with:

- two or three materially different alternatives;
- selected thesis and rejected alternatives;
- first-fold reading order and action hierarchy;
- density, depth, typography and color roles;
- responsive transformation;
- signature details and anti-patterns;
- token mapping and acceptance signature.

“Modern”, “premium”, a chat link or an expired Claude artifact is not a
direction contract.

## Readiness

For tasks at/after adoption, `UI ready: yes` requires substantive,
non-placeholder:

1. existing source/direction;
2. desktop target;
3. mobile target;
4. action hierarchy;
5. visual fidelity mapping;
6. implementation mapping;
7. state/copy/accessibility inventory;
8. GVC scenario with `qualityProfile: premium`;
9. desktop/mobile markers and scroll-width check;
10. review dossier and baseline decision;
11. design decision log;
12. flow/motion contracts when triggered.

## Surface grammar

Choose a recipe before freehand composition:

- operational workbench;
- list-detail;
- command center;
- review studio;
- analytics/report;
- settings/flow.

Recipes define regions, hierarchy, density, responsive transformation, state
placement and motion seams. They are not skins and do not own domain data/copy.

## First-fold checkpoint

Before exhaustive backend/state wiring:

1. implement shell, dominant hierarchy, primary action and representative data;
2. capture desktop and 390px mobile;
3. inspect reading order, proportions, density, depth and signature;
4. record `ACCEPT FIRST FOLD` or `REVISE` with exact findings.

## Motion bar

Rich motion is default where it reduces uncertainty: region entrance without
delaying first paint, selection/detail ownership, density/layout morph,
pending/result feedback, preview replacement and focus restoration.

Motion is interruptible, localized, tokenized and compositor-conscious. Reduced
motion preserves final state and meaning. Every intermediate frame preserves
text/status contrast: never fade live state-copy below AA; prefer transform,
clip or a persistent base layer and audit transition frames with GVC/axe.
Ambient loops, decorative parallax, bounce/shake errors and local timing/easing
are not enterprise motion.

## GVC premium evidence

Full-loop scenarios declare `qualityProfile: 'premium'` and include:

- desktop and 390px mobile;
- first-fold/full-page/interaction markers;
- runtime/layout/keyboard/performance/enterprise checks;
- page scroll-width assertion;
- reduced-motion/focus evidence where applicable;
- generated review dossier;
- baseline for source-led parity or documented repo-native baseline decision.

`fullPage` does not prove overflow safety. Measure the DOM.

## Visual Quality Scorecard

Review actual dossier/captures and score 1–5:

| Dimension | What it tests |
|---|---|
| Hierarchy | reading order, dominant decision, action clarity |
| Proportions | regional balance, fold, whitespace, content scale |
| Rhythm | spacing consistency, grouping and cadence |
| Density | information value without card wallpaper or emptiness |
| Depth | base, operational, selected/context and floating relationships |
| Surface economy | every border/radius/background earns a grouping or stack role; no card-on-card wallpaper |
| Visual impact | a memorable dominant moment, asymmetric composition or editorial gesture supports the task |
| Typography | Geist/Poppins variants, contrast, lines, numerals |
| Color | restrained roles, semantic accuracy, contrast |
| Iconography | semantics, size and optical alignment |
| Responsive | intentional transformation, touch/focus, no clipping |
| Motion | causal feedback, timing and reduced equivalence |
| Fidelity | selected direction/source preserved through mapping |
| Generic-template resistance | identity beyond default MUI/Vuexy |

Pass:

- average ≥4.5;
- no dimension <4;
- hierarchy, surface economy, visual impact, fidelity and generic-template resistance ≥4.5;
- desktop and mobile evidence linked;
- rationale and a concrete next action for every score below 4.5.

Automated heuristics inform review; they cannot assign honest aesthetic scores
by themselves.

### Chrome budget and spatial composition

- A card is a semantic containment boundary, not the default section wrapper.
- A normal first fold should expose at most three simultaneously visible
  `contained` surfaces; immersive, stage, selected and floating layers must have
  distinct jobs and cannot imitate another white card.
- Never place a bordered/rounded surface inside another merely to create spacing.
  Prefer open sections, rails, bands, dividers, background zones and typographic
  grouping.
- Every `ui-standard` surface needs one dominant visual moment tied to intent:
  decision canvas, evidence stage, narrative lead, asymmetric impact panel or
  another documented gesture. A uniform grid of polished cards still fails.
- Desktop must use the available plane; mobile must recompute the hierarchy, not
  serialize every desktop panel into a long card stack.
- Composed primitives declare `data-ui-surface` so GVC can audit actual platform
  surfaces instead of only `.MuiCard/.MuiPaper` classes.

## Stop conditions

Do not start/continue/close at the applicable stage with missing direction,
placeholder readiness, unreviewed first fold, missing mobile, ambiguous primary,
misleading partial state, no reduced-motion equivalence, missing dossier/
scorecard/baseline decision, failed thresholds or enterprise `BLOCK`.

## Adoption and legacy

- Hard contract rules apply to `TASK-1453+`.
- Older active tasks remain warning-first until edited/taken.
- Completed tasks are not migrated only for this standard.
- Diagnostic scenarios may use `qualityProfile: 'diagnostic'` with rationale,
  but cannot satisfy UI acceptance.
