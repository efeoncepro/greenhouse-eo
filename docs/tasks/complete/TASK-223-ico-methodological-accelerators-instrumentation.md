# TASK-223 - ICO Methodological Accelerators Instrumentation

## Delta 2026-04-04 — auditoría runtime corrige el alcance inicial

- La lane no parte desde cero:
  - `BCS`, `Iteration Velocity`, `Revenue Enabled` y `CVR` ya existen como contratos runtime reutilizables.
  - `Creative Hub` ya es el host client-facing correcto para cualquier lectura metodológica ligada a `CVR`.
- Regla nueva para `TASK-223`:
  - el alcance inicial debe crear contrato runtime y wiring editorial sobre `CVR`, no prometer causalidad madura ya observada
  - la correlación con outcomes debe reutilizar readers canónicos (`BCS`, `Iteration Velocity`, `read-metrics`, `Revenue Enabled`) y no recalcular métricas inline
  - la señal metodológica debe viajar por un carril auditable compatible con `ico_engine.ai_metric_scores`

## Delta 2026-04-04 — TASK-222 cerró el primer host visible de CVR

- `TASK-222` ya dejó el primer contrato runtime de `CVR` y su host client-facing real en `Creative Hub`.
- Regla nueva para `TASK-223`:
  - cualquier futura instrumentación metodológica debe enchufarse a ese bloque `CVR` y no abrir otra surface paralela para narrativa enterprise
  - la matriz `Basic / Pro / Enterprise` sigue siendo editorial; no se puede asumir entitlement runtime por tier al proponer nuevas señales
  - si una hipótesis metodológica impacta `Revenue Enabled`, debe convivir con los guardrails ya visibles de `CVR` y no degradarlos

## Delta 2026-04-04

- `TASK-221` ya cerró la policy inicial de `Revenue Enabled` y su distinción explícita entre `observed`, `range`, `estimated` y `unavailable`.
- Regla nueva para `TASK-223`:
  - ninguna hipótesis metodológica puede presentarse como impacto directo en `Revenue Enabled` sin respetar esa policy de atribución
  - si la cadena causal termina en `Iteration` proxy o en `Throughput` operativo, el outcome económico debe seguir leyéndose como `estimated`
  - cualquier futura correlación con `Revenue Enabled` debe reutilizar el helper canónico y no reconstruir montos o uplift con heurísticas locales

## Delta 2026-04-04

- `TASK-220` ya dejó un contrato runtime inicial para `Brief Clarity Score`, con `intakePolicyStatus`, `qualityGateReasons` y `brief efectivo` observable cuando existe score válido.
- Regla nueva para `TASK-223`:
  - cualquier hipótesis causal sobre aceleradores metodológicos que impacten la calidad upstream debe correlacionarse contra `BCS` y no contra proxies locales de briefing
  - si una cuenta no tiene `BCS` auditado, la lane metodológica no puede inventar causalidad aguas arriba
- `TASK-219` ya dejó un contrato runtime inicial para `Iteration Velocity` como iteraciones útiles cerradas en `30d`, con distinción explícita entre proxy operativo y evidencia observada.
- Regla nueva para `TASK-223`:
  - cualquier hipótesis causal sobre `Design System` o `Brand Voice para AI` debe correlacionarse contra ese contrato canónico de `Iteration Velocity`
  - no se permite usar `pipeline_velocity` ni heurísticas derivadas de `RpA` como sustituto de iteración útil

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `10`
- Domain: `ico / methodology / internal`

## Summary

Instrumentar las capas metodológicas aceleradoras del contrato (`Design System` y `Brand Voice para AI`) para que dejen de ser solo capacidades narrativas y puedan analizarse como factores que mejoran `FTR`, `RpA`, `cycle time`, `throughput` e `Iteration Velocity`.

## Why This Task Exists

`Contrato_Metricas_ICO_v1` declara que estas capas son aceleradores reales del sistema. Hoy eso está bien articulado conceptualmente, pero no existe una instrumentación canónica que permita medir su efecto de forma consistente.

## Goal

- Definir cómo se observa e instrumenta el efecto del `Design System`.
- Definir cómo se observa e instrumenta el efecto de `Brand Voice para AI`.
- Preparar futuras correlaciones con drivers operativos sin exponer frameworks internos como entregables.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- estas capas siguen siendo internas; no deben tratarse como productos standalone
- la instrumentación debe medir efecto, no revelar IP interna
- cualquier señal nueva debe ser auditable y no puramente aspiracional

## Dependencies & Impact

### Depends on

- `TASK-220`
- `TASK-219`
- `TASK-221`

### Impacts to

- reporting interno de mejora continua
- narrativa avanzada enterprise
- futuras optimizaciones de metodología

### Files owned

- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- futuros módulos `src/lib/ico-engine/*`

## Current Repo State

### Ya existe

- la doctrina metodológica está bien descrita en el contrato maestro
- ya existe capa outcome canónica reutilizable para correlación:
  - `BCS`
  - `Iteration Velocity`
  - `Revenue Enabled`
  - `read-metrics`
- `Creative Hub` ya hospeda el primer bloque visible de `CVR`
- `ico_engine.ai_metric_scores` ya existe como carril auditado reusable para scoring probabilístico

### Gap actual

- no existe instrumentación productiva del efecto de estas capas
- no existe reader canónico para `Design System` ni para `Brand Voice para AI`
- no existe todavía una capa canónica que enchufe esas señales al contrato runtime de `CVR`

## Scope

### Slice 1 - Design System instrumentation

- definir señales observables, trazables y auditables compatibles con el carril AI score existente

### Slice 2 - Brand Voice instrumentation

- definir señales observables, trazables y auditables compatibles con el carril AI score existente

### Slice 3 - Effect analysis model

- conectar esas señales contra outcomes canónicos existentes sin recalcular métricas inline
- enchufar la lectura editorial al bloque `CVR` ya visible en `Creative Hub`

## Out of Scope

- vender estas capas como productos
- exponer prompts, frameworks o artefactos internos
- construir tooling completo de AI governance en esta lane

## Acceptance Criteria

- [ ] Existe contrato runtime inicial de instrumentación para `Design System`
- [ ] Existe contrato runtime inicial de instrumentación para `Brand Voice para AI`
- [ ] La lane define cómo conectar estas señales con outcomes canónicos (`BCS`, `Iteration Velocity`, `read-metrics`, `Revenue Enabled`) sin exponer IP interna
- [ ] Si hay surfacing visible, cuelga del bloque `CVR` ya existente en `Creative Hub`

## Verification

- `pnpm exec vitest run src/lib/ico-engine/methodological-accelerators.test.ts src/lib/ico-engine/creative-velocity-review.test.ts src/lib/capability-queries/creative-cvr.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src`
