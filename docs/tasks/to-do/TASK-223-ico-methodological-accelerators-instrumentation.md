# TASK-223 - ICO Methodological Accelerators Instrumentation

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

