# TASK-223 - ICO Methodological Accelerators Instrumentation

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

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
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

### Gap actual

- no existe instrumentación productiva del efecto de estas capas
- no existe manera canónica de relacionarlas con mejora de métricas operativas

## Scope

### Slice 1 - Design System instrumentation

- definir señales observables y trazables

### Slice 2 - Brand Voice instrumentation

- definir señales observables y trazables

### Slice 3 - Effect analysis model

- preparar modelo de correlación con drivers operativos

## Out of Scope

- vender estas capas como productos
- exponer prompts, frameworks o artefactos internos
- construir tooling completo de AI governance en esta lane

## Acceptance Criteria

- [ ] Existe contrato documental de instrumentación para `Design System`
- [ ] Existe contrato documental de instrumentación para `Brand Voice para AI`
- [ ] La lane define cómo conectar estas señales con métricas operativas sin exponer IP interna

## Verification

- revisión manual de consistencia documental
