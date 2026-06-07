# GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1

> **Status:** Proposed  
> **Date:** 2026-06-07  
> **Owner:** UI Platform / Design System  
> **Scope:** Elevation, shadow, floating/overlay/modal depth, Greenhouse primitives, design-token documentation  
> **Reversibility:** two-way for runtime adoption; one-way for governance once accepted unless superseded by a new ADR  
> **Confidence:** medium-high  
> **Validated as of:** 2026-06-07 against repo runtime and external design-system references  
> **Audit input:** `docs/audits/design-tokens/ELEVATION_SHADOW_TOKEN_AUDIT_2026-06-07.md`  
> **Implementation task:** `docs/tasks/to-do/TASK-1049-greenhouse-elevation-shadow-token-system.md`

## Context

Greenhouse currently has two runtime shadow sources inherited from Vuexy/MUI:

- `src/@core/theme/shadows.ts`: the MUI 24-step numeric shadow scale.
- `src/@core/theme/customShadows.ts`: Vuexy custom shadows (`xs/sm/md/lg/xl`) and colored shadows (`primary/error/success/...`).

The extended token spec documents these as `boxShadow: 0/1/2/4/6/8/16` and `var(--mui-customShadows-*)` in `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6. `DESIGN.md` gives editorial guidance: Greenhouse depth should be restrained, flat-to-soft, and not layered excessively. UI Platform docs already prohibit `elevation > 0` in internal cards.

The gap is that Greenhouse does not yet have a semantic elevation token system. The current `GreenhouseFloatingSurface` primitive uses `Paper elevation={6}` directly. That creates a visual result governed by a generic MUI index instead of a Greenhouse role such as `floating`, `overlay`, or `modal`.

External design systems support the same conclusion:

- Material 3 treats elevation as part of `Surface`, connected to color, border, shape and hierarchy.
- Atlassian documents elevation with named roles such as surface/raised/overlay.
- Fluent 2 frames elevation as hierarchy and focus between layers.
- USWDS exposes discrete shadow tokens with documented intended use.

Greenhouse should follow the pattern: elevation is a semantic relation between surfaces, not a raw CSS effect.

## Decision

Greenhouse will introduce a **semantic elevation/shadow token system** for Greenhouse-owned UI primitives.

The new system will define named elevation roles and make those roles the preferred contract for primitives and product UI. MUI numeric shadows and Vuexy `customShadows` remain available as compatibility infrastructure, but they are **not** the source of truth for new Greenhouse primitives.

Canonical V1 roles:

| Role | Intent | Primary consumers |
|---|---|---|
| `none` | Flat or outlined surface; no visual depth. | internal cards, panels, table shells, dense dashboards |
| `raised` | Soft local lift for hover/selection or rare resting surfaces that need separation. | interactive cards, selectable tiles |
| `floating` | Anchored, transient contextual surface. | `GreenhouseFloatingSurface`, popovers, menus, rich tooltips, evidence peeks |
| `overlay` | Higher transient layer that floats above working context but is not modal. | command previews, floating docks, top-of-stack contextual affordances |
| `modal` | Blocking temporary surface requiring clear stack separation. | MUI Dialog, temporary Drawer, destructive/legal/financial confirmations |
| `overflow` | Scroll/sticky-edge affordance rather than container depth. | sticky table edges, scroll shadows, overflow masks |

The first implementation must create a runtime source of truth, expected path:

- `src/components/theme/elevation-tokens.ts`

The exact exported names may be refined during TASK-1049, but the module must expose:

- a stable `GreenhouseElevationLevel` union;
- a token object or resolver for each role;
- light/dark-aware values;
- border/surface guidance where relevant, not only `boxShadow`;
- enough metadata for tests and documentation.

The SoT module is the values authority, but the tokens must reach consumers **through the theme**, not via a direct module import in primitives. This mirrors the canonical typography precedent (`typography-tokens.ts` is the SoT, `mergedTheme.ts` derives, consumers read `theme.*`). Reason: `prefers-color-scheme` and the `darkSemi` second theme are resolved at the theme layer; a directly-imported object would sit outside the theme switch. The exact surfacing mechanism (a `theme.greenhouseElevation.*` namespace, or an intentional mapping onto `customShadows`) is decided in TASK-1049 Plan Mode, but a primitive must never `import` the elevation module to read a raw value.

### Visual direction (starting point, calibrate in GVC)

This ADR does not lock exact CSS values, but it pins the **convergent 2026 elevation recipe** as the starting direction so calibration is not done blind. Serious product systems (GitHub Primer, shadcn/ui, Linear, Vercel Geist) converge on **two soft layers + a 1px hairline ring**, not a single heavy drop:

```css
/* floating — starting direction, refine in GVC */
box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
/* + 1px hairline border/ring carrying the separation */
```

Hard anti-dated ceiling for the whole system: **no role's shadow may exceed `0 8px 24px rgba(0,0,0,0.1)`** (the "dated drop shadow" threshold). `floating` sits clearly below it; `modal` may approach it but must not return to the heavy single-drop `theme.shadows[6/8]` look the operator flagged. Exact alpha/offset values are GVC-calibrated in light + dark.

`GreenhouseFloatingSurface` must become the first consumer:

- `Paper elevation={0}`;
- `boxShadow` from the semantic elevation token;
- border/background from token or theme;
- no raw `theme.shadows[n]` or local literal shadow in the primitive;
- any variant-specific depth must be declared in the controller and documented.

## Documentation Contract

When this decision is accepted and implemented, the following docs must move together:

- `DESIGN.md` §Elevation & Depth: compact agent-facing rules.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6: semantic role table and migration guidance.
- `docs/architecture/ui-platform/PRIMITIVES.md`: Floating Surface consumes semantic elevation.
- `docs/architecture/ui-platform/HISTORIAL.md`: append-only delta.
- **A dedicated live design-system page `/admin/design-system/elevation`** must be created — mirror of the typography (`/admin/design-system/typography/mockup`) and motion (`/admin/design-system/motion`) pages — rendering every elevation role live from the theme (light + `darkSemi`, forced-colors note). It is INTERNAL (gated `administracion.design_system`, never `client_*`) and must be reachable by nav (route-reachability, TASK-982). The `/admin/design-system/floating-surfaces` lab is updated as the real consumer, complementing — not replacing — the token page.

If a future task adds or changes a role, it must update the runtime SoT and these docs in the same PR.

## Runtime Rules

- Product views and Greenhouse primitives should consume semantic elevation roles.
- `theme.shadows[n]` and `Paper elevation={n}` are legacy/MUI infrastructure, acceptable inside MUI/Vuexy compatibility layers and legacy code, but not preferred for new Greenhouse primitives.
- `theme.customShadows.*` is compatibility/runtime support. It may be referenced internally by the resolver if intentionally mapped, but agents must not pick `customShadows.md`/`lg` ad hoc.
- Cards inside operational workbenches remain flat/outlined by default.
- Elevation must not be used as decoration when hierarchy is already clear via spacing, border, density or contrast.
- Floating, overlay and modal roles must remain visually distinct but restrained.
- **`forced-colors` (Windows High Contrast):** the browser strips `box-shadow` entirely, so a surface that separates only via shadow becomes visually fused with its background. Every floating/overlay/modal token must carry its separation through the **border** (a real `1px` border-color, not a shadow ring) so the surface stays legible when shadows are removed. The shadow is the enhancement; the border is the floor.
- **`raised` is not an escape hatch to re-elevate cards.** The Flat 3.0 / `elevation > 0` prohibition on internal cards stands. `raised` is for transient hover/selection lift and rare resting surfaces that genuinely need separation — never a blanket card resting state in dashboards/workbenches.

## Alternatives Considered

### Patch `GreenhouseFloatingSurface` with a nicer local shadow

Rejected. It would satisfy the immediate aesthetic discomfort but leave the same governance gap for the next primitive. It also creates an unowned literal that docs and tests cannot track.

### Replace `elevation={6}` with `theme.customShadows.lg`

Rejected as the canonical answer. `customShadows` is useful runtime infrastructure, but it does not express Greenhouse roles or variant intent. It may become an implementation detail of a semantic token, not the agent-facing contract.

### Continue documenting numeric MUI shadow indices

Rejected for new Greenhouse primitives. Numeric indices are acceptable as legacy explanation, but they are too low-level for UI Platform governance.

### Redesign all shadows globally in one sweep

Rejected. The safe first step is a semantic SoT plus the most visible consumer (`GreenhouseFloatingSurface`). A repo-wide migration can follow only after GVC evidence and operator approval.

## Consequences

Benefits:

- Floating surfaces stop inheriting a generic old-looking MUI depth by accident.
- Agents get an explicit contract and do not choose shadows by taste.
- Greenhouse aligns elevation governance with existing color/typography/motion governance.
- The UI Platform can distinguish cards, popovers, command previews, docks and modals without multiplying local CSS.

Costs:

- Adds one more token module and documentation surface.
- Requires tests and GVC before any visual cutover.
- Some future migrations may reveal direct `theme.shadows[n]` usage that needs triage.

Risks:

- Overcorrecting to shadows that are too flat can hurt separation in dense tables/workbenches.
- Dark mode can make shadows ineffective if border/surface treatment is not paired with the token.
- `forced-colors` mode removes shadows entirely; without a real border the surface disappears into its background.
- If the role table grows too quickly, agents may again choose by taste.

Mitigations:

- Keep V1 roles small.
- Include border/surface guidance in each token; the border (not the shadow) must carry separation under `forced-colors`.
- Use GVC desktop + mobile evidence for Floating Surface, in both light and `darkSemi`.
- Treat broad migration as follow-up, not first task scope.

## Reversibility

The runtime part is reversible by reverting the token module and Floating Surface adoption. Documentation governance should only become binding after this ADR is accepted; while status is `Proposed`, it is an implementation proposal and not a runtime rule.

If the visual result is rejected during TASK-1049, the task should preserve the audit and ADR, record the rejected token values, and either propose a V2 visual direction or keep the current runtime unchanged.

## Revisit When

Reopen this decision if:

- AXIS/Figma introduces an explicit elevation token set that supersedes this contract.
- MUI/Vuexy runtime changes shadow generation materially.
- Greenhouse adds a dedicated overlay manager or z-index/elevation platform primitive.
- GVC or operator review shows the V1 roles do not distinguish floating/overlay/modal well enough.

## Sources

- Audit: `docs/audits/design-tokens/ELEVATION_SHADOW_TOKEN_AUDIT_2026-06-07.md`
- Material 3 design system overview: https://developer.android.google.cn/develop/ui/compose/designsystems/material3?hl=en
- Material 3 Surface component: https://composables.com/docs/androidx.compose.material3/material3/components/Surface
- Atlassian elevation foundation: https://design-system-docs-proxy.services.atlassian.com/foundations/elevation/
- Fluent 2 elevation: https://fluent2.microsoft.design/elevation
- USWDS shadow tokens: https://designsystem.digital.gov/design-tokens/shadow/

## Self-Critique

This ADR intentionally does not prescribe exact CSS shadow values. That avoids premature aesthetic lock-in before GVC review, but it means TASK-1049 must do the visual calibration work carefully. The guardrail is that TASK-1049 must produce before/after evidence and cannot close on code alone.

