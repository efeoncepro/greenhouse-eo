# TASK-221 - Revenue Enabled Measurement Model & Attribution Policy

## Delta 2026-04-04 — Implementación cerrada

- `Revenue Enabled` ya tiene helper canónico inicial en `src/lib/ico-engine/revenue-enabled.ts`.
- El contrato runtime ya distingue:
  - `observed`
  - `range`
  - `estimated`
  - `unavailable`
- `Creative Hub` dejó de reconstruir `Revenue Enabled` con heurísticas locales (`OTD`, `RpA`, benchmarks de industria`) y ahora consume el measurement model canónico.
- La policy quedó formalizada en:
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- No se creó migración ni materialización nueva:
  - esta entrega cierra el contrato `on-read`
  - la atribución monetaria total por tenant/campaña sigue pendiente de lanes futuras

## Delta 2026-04-04

- Discovery/auditoría del repo corrigió supuestos operativos antes de implementación:
  - `Revenue Enabled` todavía no existe como contrato canónico propio, pero la lane ya no parte desde cero
  - ya existen foundations runtime reutilizables para:
    - `TTM` en `src/lib/ico-engine/time-to-market.ts`
    - `Iteration Velocity` en `src/lib/ico-engine/iteration-velocity.ts`
    - `Brief Clarity Score` + `effectiveBriefAt` en `src/lib/ico-engine/brief-clarity.ts`
  - ya existe un consumer visible `Revenue Enabled` en `Creative Hub`, pero hoy usa heurísticas locales y no un modelo canónico de `RE`
  - la dependencia `TASK-213` debe leerse como paraguas programático y no como blocker técnico duro para esta task
  - el repo no tiene todavía:
    - tipo/helper canónico de `Revenue Enabled`
    - policy runtime formal de `observed` / `estimated` / `range`
    - materialización o read model específico de `RE`
    - attribution layer de revenue incremental por campaña/palanca
- Regla operativa nueva:
  - esta task debe reutilizar los contratos ya existentes de `TTM`, `Iteration Velocity` y `BCS`, y cortar consumers heurísticos a un modelo de atribución explícito en vez de recalcular supuestos locales

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

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Cerrada`
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
- `TASK-213` como paraguas de alineación, no como blocker técnico duro

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
- contrato runtime inicial de `TTM` con evidencia explícita y consumer en campañas
- contrato runtime inicial de `Iteration Velocity` con distinción `observed/proxy`
- contrato runtime inicial de `Brief Clarity Score` y `effectiveBriefAt`
- summary materializado reutilizable de métricas ICO para consumers
- consumer visible heurístico de `Revenue Enabled` en `Creative Hub`

### Gap actual

- no existe measurement model canónico productivo de `Revenue Enabled`
- no existe policy runtime formal de `observed` vs `estimated` vs `range`
- no existe attribution policy suficientemente explícita para revenue incremental
- no existe read model/materialización específica para `RE` ni sus tres palancas
- `Throughput` canónico hoy es conteo de tareas completadas, no todavía `campañas adicionales` o capacidad liberada atribuible
- el consumer actual de `Creative Hub` sigue mezclando heurísticas locales (`industry benchmarks`, `RpA`, `OTD`) con narrativa de `Revenue Enabled`

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
- cortar o encapsular heurísticas locales existentes para que futuros consumers no dupliquen lógica

## Out of Scope

- cerrar integraciones completas con todos los canales de revenue
- automatizar dashboards ejecutivos completos en la misma lane
- convertir de inmediato `Revenue Enabled` en KPI disponible para todos los tenants

## Acceptance Criteria

- [x] Existe un measurement model canónico de `Revenue Enabled`
- [x] Las tres palancas tienen fórmula de alto nivel, supuestos y límites explícitos
- [x] Existe policy de `observed`, `estimated` y `range`
- [x] La narrativa de negocio queda respaldada por una política de medición defendible
- [x] Queda explícito qué consumers existentes siguen heurísticos y cómo deben converger al contrato canónico

## Verification

- `pnpm exec vitest run src/lib/ico-engine/revenue-enabled.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- revisión documental cruzada con arquitectura `ICO`
