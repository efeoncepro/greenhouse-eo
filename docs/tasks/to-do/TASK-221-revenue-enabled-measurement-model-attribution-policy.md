# TASK-221 - Revenue Enabled Measurement Model & Attribution Policy

## Delta 2026-04-04

- `TASK-220` ya dejó un contrato runtime inicial para `Brief Clarity Score` y `brief efectivo`.
- Para esta task cambia un supuesto importante:
  - la palanca `Early Launch` ya no depende siempre de un inicio proxy
  - pero tampoco puede asumirse como `observed` universalmente; depende de que exista `BCS` válido y governance suficiente
- `TASK-219` ya dejó un contrato runtime inicial para `Iteration Velocity`.
- Para esta task cambia un supuesto importante:
  - `RE Iteration` ya no debe partir de cero
  - pero tampoco puede apoyarse en `pipeline_velocity` ni en la heurística legacy de `RpA` como sustituto de la palanca de iteración
- Regla nueva para `TASK-221`:
  - `Early Launch` debe distinguir explícitamente entre `TTM` con inicio observado por `brief efectivo` y `TTM` con inicio proxy operativo
  - la palanca `Iteration` debe distinguir explícitamente entre evidencia `observed` y `proxy`
  - mientras la iteración siga en proxy operativo, el modelo de `Revenue Enabled` debe presentarla con sus límites de confianza y no como uplift plenamente observado

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `8`
- Domain: `delivery / ico / business`

## Summary

Convertir `Revenue Enabled` de tesis estratégica a modelo de medición defendible, definiendo sus tres palancas (`Early Launch`, `Iteration`, `Throughput`), la política de atribución, los supuestos permitidos, el uso de rangos y la distinción entre `observed` y `estimated`.

## Why This Task Exists

Hoy `Revenue Enabled` es una North Star conceptualmente fuerte, pero todavía no un KPI canónico y auditable del runtime.

Si Greenhouse quiere sostener esta narrativa frente a clientes enterprise o CFOs, necesita una policy explícita para:

- qué evidencia cuenta
- qué supuestos se permiten
- cuándo el dato es observado vs estimado
- cuándo debe presentarse como rango

## Goal

- Formalizar el modelo de cálculo de `Revenue Enabled`.
- Definir la política de atribución y de evidencia.
- Crear el baseline para reporting estratégico y `CVR`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- `Revenue Enabled` no debe vender precisión falsa.
- observed, estimated y range deben ser clases explícitas.
- las tres palancas deben poder trazarse a señales operativas o de negocio defendibles.

## Dependencies & Impact

### Depends on

- `TASK-218`
- `TASK-219`
- `TASK-220`
- `TASK-216`
- `TASK-213`

### Impacts to

- `TASK-222`
- `Agency`
- decks comerciales y narrativa enterprise
- posibles QBR/CVR y scorecards ejecutivos

### Files owned

- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `src/lib/ico-engine/*`
- futuros readers de business metrics

## Current Repo State

### Ya existe

- definición estratégica fuerte de `Revenue Enabled`
- 3 palancas bien definidas en el contrato maestro
- narrativa comercial consistente

### Gap actual

- no existe measurement model canónico productivo
- no existe policy de observed vs estimated vs range
- no existe attribution policy suficientemente explícita

## Scope

### Slice 1 - Measurement model

- definir estructura formal de las 3 palancas
- explicitar insumos mínimos y supuestos permitidos

### Slice 2 - Attribution policy

- definir observed / estimated / range
- documentar límites de causalidad y trazabilidad

### Slice 3 - Runtime/reporting contract

- dejar modelo reusable para reporting estratégico
- preparar surfaces futuras sin prometer exactitud inexistente

## Out of Scope

- cerrar integraciones completas con todos los canales de revenue
- automatizar dashboards ejecutivos completos en la misma lane
- convertir de inmediato `Revenue Enabled` en KPI disponible para todos los tenants

## Acceptance Criteria

- [ ] Existe un measurement model canónico de `Revenue Enabled`
- [ ] Las tres palancas tienen fórmula de alto nivel, supuestos y límites explícitos
- [ ] Existe policy de `observed`, `estimated` y `range`
- [ ] La narrativa de negocio queda respaldada por una política de medición defendible

## Verification

- revisión manual de consistencia contra `Contrato_Metricas_ICO_v1`
- revisión documental cruzada con arquitectura `ICO`
