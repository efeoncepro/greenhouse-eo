# TASK-1052 — Chart-card primitives a elevation roles + lint rule cubre customShadows

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|design-system`
- Blocked by: `none (TASK-1049/1051 SHIPPED)`
- Branch: `develop (operador: mantenerse en develop, sin branch)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Tier 1 del follow-up de TASK-1051: cerrar la **capa primitive** del contrato de elevación. Migrar los últimos primitives que usan `customShadows` (4 archivos: los 3 chart cards + `MetricTrendCard`) al rol semántico `theme.greenhouseElevation.<role>`, y **extender la lint rule** `greenhouse/no-direct-mui-elevation-in-primitives` para que también bloquee `customShadows` (string `var(--mui-customShadows-*)` + member `theme.customShadows.*`) dentro de `primitives/**`. Con esto, NINGÚN primitive Greenhouse usa sombra directa MUI/Vuexy.

## Why This Task Exists

TASK-1051 cerró `elevation={n}` + `theme.shadows[n]` en primitives, pero dejó `customShadows` fuera de la lint rule a propósito: los chart-card primitives todavía lo usaban y activarlo habría roto el build. Esta task migra esos consumidores y luego sube el candado, completando la gobernanza de la capa primitive.

## Goal

- Migrar los 7 callsites `customShadows` en los 4 primitives al rol correcto (tooltip→`floating`, card container→`raised`).
- Extender la lint rule a `customShadows` (string + member) en primitives.
- GVC de las chart cards + tooltips; cero regresión visual relevante.
- Docs sync + cierre.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6
- `DESIGN.md` §Elevation
- CLAUDE.md → "Patron canonico Elevation / Shadow tokens (TASK-1049)"
- `eslint-plugins/greenhouse/rules/no-direct-mui-elevation-in-primitives.mjs` (extender)

Reglas: rol por semántica, no por matchear el shade. NO flaggear `customShadows` fuera de primitives (views/Vuexy/`card-statistics` quedan compat por ADR). NO migrar views/mockups (Tier 2/3, oportunista).

## Dependencies & Impact

### Depends on
- TASK-1049/1051 SHIPPED (SoT + rule base).

### Files owned
- `src/components/greenhouse/primitives/GreenhouseChartCard.tsx`
- `src/components/greenhouse/primitives/GreenhouseMetricBreakdownChartCard.tsx`
- `src/components/greenhouse/primitives/GreenhouseStackedDistributionChartCard.tsx`
- `src/components/greenhouse/primitives/MetricTrendCard.tsx`
- `eslint-plugins/greenhouse/rules/no-direct-mui-elevation-in-primitives.mjs`
- `eslint-plugins/greenhouse/rules/__tests__/no-direct-mui-elevation-in-primitives.test.mjs`
- `Handoff.md` + `changelog.md` al cierre

## Current Repo State

### Already exists
- SoT `theme.greenhouseElevation` (TASK-1049) + lint rule base (TASK-1051).

### Gap
- 4 primitives con `customShadows`: tooltip `customShadows-sm` (×4, `role='status'`) + card container `customShadows-md` (×3).
- Lint rule no cubre `customShadows`.

## Scope

### Slice 1 — Migrar los 4 primitives
- Chart tooltips (`customShadows-sm`, `role='status'`) → `theme.greenhouseElevation.floating.boxShadow` (ya tienen border 1px divider).
- Chart card containers (`customShadows-md`) → `theme.greenhouseElevation.raised.boxShadow` (preservan su border).
- Mapeo: `GreenhouseChartCard` (sm→floating, md→raised), `GreenhouseMetricBreakdownChartCard` (sm→floating, md→raised), `GreenhouseStackedDistributionChartCard` (sm→floating, md→raised), `MetricTrendCard` (sm→floating; su hover ya es `raised` desde TASK-1051).

### Slice 2 — GVC
- Capturar chart cards (charts lab) + tooltip on-hover. Verificar resting/hover legibles, light/dark.

### Slice 3 — Extender lint rule
- Agregar a `no-direct-mui-elevation-in-primitives`: flag string literal `var(--mui-customShadows-` y member `*.customShadows.*` en primitives.
- Tests RuleTester (valid: roles; invalid: customShadows string + member).
- Pasar a verde solo tras Slice 1 (cero `customShadows` en primitives).

### Slice 4 — Docs + cierre
- changelog, Handoff, CLAUDE.md (rule ahora cubre customShadows), Delta en TASK-1051 (Tier 1 cerrado).

## Out of Scope
- Views/app/`card-statistics`/`DialogCloseButton`/mockups con `customShadows`/`theme.shadows[n]` (Tier 2/3 — compat por ADR, oportunista).
- Flatten de chart cards a `none` (rediseño, no migración).
- Cambiar valores del SoT.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule
Slice 1 (migrar) → Slice 2 (GVC) → Slice 3 (rule a error tras 0 customShadows en primitives) → Slice 4 (docs).

### Risk matrix
| Riesgo | Sistema | Prob | Mitigation | Signal |
|---|---|---|---|---|
| Card container pierde presencia al pasar a `raised` (más sutil que `customShadows-md`) | UI | medium | GVC light/dark; si el operador quiere más, ajustar alpha del rol `raised` (SoT, un lugar) | revisión GVC |
| Lint rule a error rompe build por `customShadows` no migrado en primitives | CI | low | activar tras grep 0 en primitives | `pnpm lint` |
| Falso positivo en views (no debe flaggear) | DX | low | rule scopeada a `primitives/**` | RuleTester |

### Rollback plan per slice
| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revertir diff de los 4 primitives | <5 min | sí |
| 3 | revertir extensión de la rule | <5 min | sí |

### Production verification sequence
1. `rg customShadows src/components/greenhouse/primitives/` → 0 tras Slice 1.
2. `pnpm lint` (rule extendida) + `pnpm tsc --noEmit`.
3. `pnpm test:lint-rules` + drift-guard + primitives tests.
4. GVC charts.
5. `pnpm build`.

## Acceptance Criteria
- [ ] 0 `customShadows` y 0 `theme.shadows[`/`elevation={n≥1}` en `src/components/greenhouse/primitives/**`.
- [ ] Los 4 primitives consumen `theme.greenhouseElevation.<role>` (tooltip `floating`, card `raised`).
- [ ] Lint rule extendida cubre `customShadows` (string + member) en primitives, con RuleTester.
- [ ] `pnpm lint` verde (rule a error). 0 violaciones.
- [ ] GVC charts revisado light/dark.
- [ ] drift-guard + primitives tests verdes; docs sync + Delta TASK-1051 (Tier 1 cerrado).

## Verification
- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test:lint-rules`
- `pnpm test src/components/greenhouse/primitives src/components/theme`
- `pnpm fe:capture` charts
- `pnpm build` · `pnpm task:lint --task TASK-1052`

## Closing Protocol
- [ ] Lifecycle complete + mover a complete/.
- [ ] README + TASK_ID_REGISTRY sync.
- [ ] Handoff + changelog.
- [ ] Delta en TASK-1051 marcando Tier 1 cerrado; Tier 2/3 quedan como follow-up oportunista.

## Follow-ups
- Tier 2 (views/app `theme.shadows[n]`/`customShadows`): oportunista al tocar, o warn-rule scopeada a views si se busca convergencia gradual.
- Tier 3 (mockups + Vuexy `card-statistics`): no tocar hasta promoción a runtime.
