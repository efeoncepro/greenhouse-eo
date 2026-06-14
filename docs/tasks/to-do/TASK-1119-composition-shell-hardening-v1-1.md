# TASK-1119 — Composition Shell hardening V1.1 (drift prevention + observability)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `none` (extiende TASK-1114; aditivo)
- Branch: `task/TASK-1119-composition-shell-hardening-v1-1`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Robustece el Composition Shell (TASK-1114) **antes de su adopción amplia**: cierra el gap honesto de observabilidad de un substrato de layout (no tiene reliability signal de runtime) con guards dev-time + baseline GVC + lint rule + telemetry + tests más duros del reducer + tuning de `min-inline-size`. Todo aditivo, sin cambiar el contrato.

## Why This Task Exists

El ADR (`GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` §4-Pillar) declaró el residual: un substrato de layout no tiene signal de runtime; la red es GVC + tests. Antes de que más surfaces opten, hay que prevenir drift (singleton VT, morph ad-hoc) y darle observabilidad/regresión. Cheap + previene la clase de bug que el morph silencioso (2 elementos con el mismo `view-transition-name`) introduce.

## Goal

- Drift imposible de introducir silenciosamente (guard + lint).
- Regresión visual fijada (baseline GVC committeado).
- Reducer endurecido + `min-inline-size` validado contra overflow.
- Observabilidad de uso (telemetry de cambios de composición).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` + `_UI_PLATFORM_V1.md`
- Precedentes: lint rules `greenhouse/no-direct-gsap-in-views` / `no-direct-floating-ui-in-views` (patrón) · telemetry de `adaptive-sidecar-controller` (`createAdaptiveSidecarEvent`) · GVC baseline V1.5 (TASK-1018, `baseline.surfaceId` + `fe:capture:diff --promote`)

Reglas obligatorias:
- Aditivo: no cambiar el contrato público de `CompositionShell` ni el comportamiento default.
- Cero hardcode; guards/telemetry dev-time o no-bloqueantes.

## Dependencies & Impact

### Depends on
- TASK-1114 (substrato shipped).

### Blocks / Impacts
- Adopción amplia del Composition Shell (sidecar/workspace/Nexa migraciones).

### Files owned
- `src/components/greenhouse/primitives/composition-shell/**` (guard + telemetry + tests)
- `eslint-plugins/greenhouse/rules/no-ad-hoc-layout-morph.mjs` (+ tests)
- `scripts/frontend/baselines/composition-shell-*/` (baseline GVC committeado)

## Current Repo State

### Already exists
- Substrato + controller + reducer + 16 tests + Lab + scenario `design-system-composition-shell` (TASK-1114).
- Patrón de lint rules + telemetry + GVC baseline (precedentes arriba).

### Gap
- Sin guard del singleton VT, sin baseline committeado, sin lint rule, sin telemetry, reducer solo con tests puntuales, `min-inline-size` sin validar overflow.

## Scope

### Slice 1 — Singleton view-transition-name guard (dev-time)
- Dev-only warning si dos elementos terminan con el mismo `view-transition-name` (rompe el morph silencioso). No-bloqueante en prod.

### Slice 2 — Baseline GVC committeado
- Promover el scenario `design-system-composition-shell` a baseline durable (`baseline.surfaceId` + `fe:capture:diff --promote`) → regresión visual byte-a-byte en cada cambio futuro.

### Slice 3 — Lint rule `greenhouse/no-ad-hoc-layout-morph`
- Bloquear `view-transition-name` / grid-morph de layout a mano en views de producto (override block para el substrato + primitives). Mirror de las reglas gsap/floating-ui. RuleTester.

### Slice 4 — Telemetry hook
- Eventos de cambio de composición (mirror `createAdaptiveSidecarEvent`) para observabilidad de uso real. Opt-in.

### Slice 5 — Reducer hardening + min-inline-size
- Property-based / concurrency tests del reducer (secuencias rápidas compose/reset/dirty). Validar `min-inline-size` (480/360) contra overflow en los breakpoints + tunear si hace falta.

### Slice 6 — Persistencia route-local (opcional)
- Composición en URL state + restore sin flash (route-local; broad queda V2).

## Out of Scope
- Enriquecimiento de fluidez (framer-motion buttery, shared-element) → TASK-1117.
- Cross-route → TASK-1118.
- Adaptive Card → TASK-1115.

## Rollout Plan & Risk Matrix

N/A operationally safe — additive UI/governance, no production runtime impact, sin flags. Cada slice es revert-PR. El lint rule entra warn-first y promueve a error tras un sweep.

## Verification
- `pnpm local:check` + tests del reducer + `pnpm test:lint-rules` (la rule nueva) verde.
- GVC baseline diff `match` en el scenario.
- `greenhouse-documentation-governor` al cierre.
