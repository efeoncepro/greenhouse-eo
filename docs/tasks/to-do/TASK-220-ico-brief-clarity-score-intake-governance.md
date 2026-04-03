# TASK-220 - ICO Brief Clarity Score & Intake Governance

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `6`
- Domain: `delivery / ico / intake`

## Summary

Formalizar `Brief Clarity Score (BCS)` como driver canónico de `ICO`, junto con las reglas de intake y governance necesarias para que el brief no entre al flujo operativo sin los mínimos que protegen `FTR`, `RpA`, `cycle time` y `TTM`.

## Why This Task Exists

`Contrato_Metricas_ICO_v1` pone a `BCS` al inicio de la cadena causal:

- `BCS ↑ -> FTR ↑ -> RpA ↓ -> Cycle Time ↓`

Hoy esa señal no existe como contrato productivo fuerte, aunque operativamente ya sabemos que briefs pobres disparan retrabajo y retraso.

## Goal

- Definir un `BCS` canónico y auditable.
- Convertir la política de briefing en reglas operativas medibles.
- Hacer que `BCS` funcione como predictor serio del resto de drivers.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- `BCS` no debe quedarse como concepto narrativo; debe tener campos, score y política de intake.
- si se usa IA en validación, el score debe seguir siendo auditable y explicable.
- el intake no debe degradar la semántica del engine por falta de requisitos básicos.

## Dependencies & Impact

### Depends on

- `TASK-214`
- `TASK-216`
- `TASK-213`

### Impacts to

- `TASK-218`
- `TASK-219`
- `TASK-221`
- operación Delivery y procesos de briefing

### Files owned

- `src/lib/ico-engine/*`
- `src/lib/delivery/*`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- política operativa de briefing documentada en el contrato maestro
- evidencia conceptual fuerte de que calidad de brief afecta `FTR`, `RpA` y `cycle time`

### Gap actual

- no existe `BCS` canónico en runtime
- no existe intake score auditable y reusable por `ICO`
- no existe policy formal de rechazo o degradación por brief incompleto

## Scope

### Slice 1 - Score model

- definir dimensiones, pesos y mínimos del `BCS`
- distinguir score completo vs score usable

### Slice 2 - Intake governance

- formalizar qué no puede entrar al flujo sin brief suficiente
- definir excepciones y rutas de override

### Slice 3 - Runtime wiring

- dejar contrato para registrar, leer y analizar `BCS`
- preparar correlación con `FTR`, `RpA`, `cycle time`

## Out of Scope

- construir el AI agent completo de scoring en esta misma lane
- rediseñar todo el intake UX
- cerrar `Revenue Enabled`

## Acceptance Criteria

- [ ] `BCS` tiene definición canónica y auditable
- [ ] Existe una policy explícita de intake mínimo
- [ ] `BCS` puede analizarse como predictor de `FTR`, `RpA` y `cycle time`
- [ ] La lane deja claro cuándo el score viene de validación automática vs revisión humana

## Verification

- `pnpm exec vitest run src/lib/ico-engine/*.test.ts`
- `pnpm exec eslint src/lib/ico-engine src/lib/delivery`
- revisión manual del contrato documental y fixtures de scoring

