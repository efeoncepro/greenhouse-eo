# TASK-220 - ICO Brief Clarity Score & Intake Governance

## Delta 2026-04-04

- `TASK-220` ya dejó un contrato runtime inicial para `Brief Clarity Score`.
- Resultado implementado:
  - `src/lib/ico-engine/brief-clarity.ts` sirve `BCS` project-level desde `ico_engine.ai_metric_scores` + readiness de Notion por `space`
  - `GET /api/projects/[id]/ico` ya expone `briefClarityScore`
  - `src/lib/campaigns/campaign-metrics.ts` ya usa `brief efectivo` observado cuando existe score válido, y solo cae a proxy cuando no existe evidencia auditada
  - la lane viaja con `available/degraded/unavailable`, `confidenceLevel`, `intakePolicyStatus`, `effectiveBriefAt` y `qualityGateReasons`
- `TASK-218` ya cerró el primer contrato runtime de `TTM` con inicio proxy y activación jerarquizada.
- Implicación nueva:
  - `TASK-220` no habilitó “el primer TTM”, pero sí cerró la source policy inicial de `brief efectivo`
  - `TTM` ya puede graduar a `available` cuando el inicio y la activación son observados
- `TASK-219` ya cerró un contrato runtime inicial de `Iteration Velocity`; por lo tanto `TASK-220` ya no es prerequisito para “existencia de la señal”, sino para madurar su lectura upstream y bajar degradación metodológica.
- La auditoría del repo confirmó que ya existe foundation parcial reutilizable:
  - `ico_engine.ai_metric_scores` como carril genérico de AI scoring auditable
  - `briefing` como fase normalizada en runtime
  - readiness de Notion, property mappings y quality runs como patrón reusable de intake governance
- `TASK-213` sigue siendo marco programático útil, pero no debe leerse como prerequisito técnico bloqueante para implementar esta lane.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
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
- `TASK-213` como alineación programática, no como bloqueo técnico duro

### Impacts to

- `TASK-218`
- `TASK-219`
- `TASK-221`
- `TASK-223`
- operación Delivery y procesos de briefing

### Files owned

- `src/lib/ico-engine/*`
- `src/lib/delivery/*`
- `src/lib/campaigns/*`
- `src/lib/space-notion/*`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- política operativa de briefing documentada en el contrato maestro
- evidencia conceptual fuerte de que calidad de brief afecta `FTR`, `RpA` y `cycle time`
- `ico_engine.ai_metric_scores` como foundation genérica para scoring AI auditable
- `TTM` ya consume un start-side proxy de `brief efectivo` desde campañas/delivery
- readiness de Notion por `space`, property mappings y data quality runs como patrón reusable de governance de intake

### Gap actual

- el writer AI canónico todavía no está institucionalizado como proceso único del engine
- la lane todavía no tiene consumer UI dedicado fuera de `TTM` y project ICO route
- la policy de override humano sigue siendo follow-on y no parte de esta slice inicial

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

- [x] `BCS` tiene definición canónica y auditable
- [x] Existe una policy explícita de intake mínimo
- [x] `BCS` puede analizarse como predictor de `FTR`, `RpA` y `cycle time`
- [x] La lane deja claro cuándo el score viene de validación automática vs revisión humana

## Verification

- `pnpm exec vitest run src/lib/ico-engine/brief-clarity.test.ts src/lib/ico-engine/time-to-market.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`
- revisión manual del contrato documental y del wiring `BCS -> project ICO route -> TTM`
