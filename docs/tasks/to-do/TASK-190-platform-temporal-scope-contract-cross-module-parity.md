# TASK-190 - Platform Temporal Scope Contract & Cross-Module Time Semantics

## Delta 2026-04-03

- Esta lane impacta directamente métricas `ICO` y debe alinearse al contrato maestro `docs/architecture/Contrato_Metricas_ICO_v1.md`.
- Regla nueva:
  - cualquier definición de `today`, `month`, `period`, `current month`, `latest available`, `from/to`, `operational month` o snapshots debe preservar la cadencia y semántica temporal que necesitarán `OTD`, `TTM`, `Cycle Time`, `Iteration Velocity`, `Revenue Enabled` y `CVR`
  - el contrato temporal no puede romper la coherencia entre:
    - tiempo real operacional
    - lectura mensual táctica
    - lectura trimestral estratégica
- Esta task es un habilitador temporal de `ICO`, no un lugar para redefinir métricas por fuera del contrato.

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `53`
- Domain: `platform`

## Summary

Greenhouse ya tiene foundation real de calendario operativo, pero no tiene un contrato temporal unificado entre UI, APIs y serving. Hoy conviven semánticas distintas para `today`, `month`, `operational month`, `latest available`, `from/to`, `year/month` y `rolling months`, lo que produce vistas inconsistentes entre Finance, Agency, Payroll, Leave, People e ICO.

Esta task define el contrato temporal canónico de plataforma y el plan para llevar todos los módulos a paridad temporal real sin inventar datos ni degradar la semántica de negocio.

## Why This Task Exists

El repo ya muestra una contradicción visible:

- `Admin > Calendario operativo` ya usa foundation shared sobre `GreenhouseCalendar`, `GreenhouseDatePicker`, `FullCalendar`, `operational-calendar.ts` y Nager.Date.
- `Leave` ya trabaja con rangos `from/to`.
- `Payroll` ya trabaja con semántica de `mes operativo`.
- `Finance`, `Cost Intelligence`, `Agency Economics`, `People Finance` e `ICO` siguen mezclando:
  - `year/month`
  - `current month`
  - `latest available`
  - `rolling months`
  - snapshots mensuales sin equivalente diario o semanal

Consecuencia directa:

- la misma pantalla puede mostrar ingresos, costos y márgenes sobre períodos efectivos distintos
- el cambio de mes deja tarjetas en cero o tablas vacías aunque sí exista un período previo materializado
- la UI puede exponer controles temporales que el backend no soporta semánticamente

La plataforma necesita una source of truth temporal reusable antes de seguir ampliando filtros `Hoy`, `Semana`, `Mes`, `Año`, `Agenda` en superficies nuevas o existentes.

## Goal

- Definir un contrato temporal canónico shared entre UI, APIs y serving.
- Alinear la semántica de `calendar`, `operational` y `financial` por dominio.
- Eliminar defaults implícitos basados en `new Date()` del cliente para superficies cross-module.
- Establecer reglas explícitas de `fallbackPolicy`, `basis` y `effectivePeriod`.
- Trazar el roadmap de read models faltantes para que Finance, Agency, People, Payroll e ICO lleguen a paridad temporal real.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`

Reglas obligatorias:

- la timezone canónica del contrato temporal es `America/Santiago`
- la semántica de `mes operativo` debe salir de `src/lib/calendar/operational-calendar.ts`, no de helpers locales
- ningún consumer nuevo de Finance, Agency, People, Payroll o ICO debe depender de `new Date()` del cliente como source of truth del período efectivo
- `calendar time`, `operational time` y `financial time` son conceptos distintos y deben declararse explícitamente
- una misma surface no puede mezclar `current month` y `latest available` sin exponer `effectivePeriod` visible
- los controles temporales expuestos por la UI deben corresponder a un contrato de datos real, no solo a una capacidad visual de FullCalendar

## Dependencies & Impact

### Depends on

- `src/lib/calendar/operational-calendar.ts`
- `src/lib/calendar/nager-date-holidays.ts`
- `src/components/greenhouse/GreenhouseCalendar.tsx`
- `src/components/greenhouse/GreenhouseDatePicker.tsx`
- `src/lib/finance/reporting.ts`
- `src/lib/payroll/current-payroll-period.ts`
- `src/app/api/hr/core/leave/calendar/route.ts`
- `src/app/api/finance/dashboard/pnl/route.ts`
- `src/app/api/finance/intelligence/operational-pl/route.ts`
- `src/app/api/finance/intelligence/client-economics/route.ts`
- `greenhouse_serving.operational_pl_snapshots`
- `greenhouse_finance.client_economics`
- `greenhouse_serving.member_capacity_economics`
- `greenhouse_serving.period_closure_status`

### Impacts to

- `TASK-143` — Agency Economics API & View
- `TASK-160` — Agency Enterprise Hardening
- `TASK-167` — Operational P&L: Organization Scope
- `TASK-176` — Labor Provisions: Fully-Loaded Cost Model Completeness
- `TASK-177` — Operational P&L: Business Unit Scope
- `TASK-178` — Finance Budget Engine
- `TASK-181` — Finance Clients: Canonical Source Migration to Organizations
- cualquier follow-on de `Finance Dashboard`, `Cost Intelligence`, `Payroll`, `People Finance` e `ICO` que agregue filtros o drilldowns temporales

### Files owned

- `docs/tasks/to-do/TASK-190-platform-temporal-scope-contract-cross-module-parity.md`
- `docs/architecture/` temporal-contract follow-on doc if promoted from task to canonical architecture
- `src/lib/time/resolve-temporal-scope.ts`
- `src/lib/time/find-latest-available-period.ts`
- `src/components/greenhouse/TemporalScopeSelector.tsx`
- `src/lib/finance/reporting.ts`
- `src/app/api/finance/dashboard/pnl/route.ts`
- `src/app/api/finance/intelligence/operational-pl/route.ts`
- `src/app/api/finance/intelligence/client-economics/route.ts`

## Current Repo State

### Ya existe

- Foundation UI compartida de calendario activada en `TASK-137`.
- `Admin > Calendario operativo` ya es una vista real sobre:
  - `GreenhouseCalendar`
  - `GreenhouseDatePicker`
  - `operational-calendar.ts`
  - `nager-date-holidays.ts`
- `Leave` ya consume rangos reales `from/to`.
- `Payroll` ya usa semántica de `mes operativo` y último día hábil.
- `Finance` ya distingue parcialmente `accrual` vs `cash` en algunos readers.
- `operational_pl_snapshots`, `client_economics`, `member_capacity_economics` y `period_closure_status` ya existen como serving materializado.

### Gap actual

- no existe un tipo shared tipo `TemporalScope` o `resolveTemporalScope()`
- no existe política shared de:
  - `view`
  - `mode`
  - `basis`
  - `fallbackPolicy`
  - `effectivePeriod`
- `Finance Dashboard` usa rolling series mensuales y `current month`, no período explícito shared
- `Agency Economics` hoy consulta el mes actual del runtime en vez de resolver el período efectivo desde un contrato shared
- `client_economics` y `operational_pl` son mensuales, pero la plataforma ya tiene una foundation visual que invita a filtros más ricos sin que exista todavía serving diario o semanal equivalente
- `Leave`, `Payroll`, `Finance`, `Agency`, `People` e `ICO` no hablan el mismo idioma temporal

## Scope

### Slice 1 - Contrato temporal shared de plataforma

- Definir el tipo canónico `TemporalScope` y su output resuelto:
  - `anchorDate`
  - `view`
  - `mode`
  - `basis`
  - `fallbackPolicy`
  - `timezone`
  - `countryCode`
  - `from`
  - `to`
  - `calendarMonthKey`
  - `operationalMonthKey`
  - `effectivePeriodKey`
- Establecer las tres semánticas oficiales:
  - `calendar`
  - `operational`
  - `financial`
- Documentar qué significa `Hoy`, `Semana`, `Mes`, `Año` y `Agenda` en cada una

### Slice 2 - Selector temporal shared para UI

- Definir el componente shared `TemporalScopeSelector`
- Reusar `GreenhouseDatePicker` y la foundation de `GreenhouseCalendar`
- Estandarizar state en URL:
  - `date`
  - `view`
  - `mode`
  - `basis`
  - `fallback`
- Definir reglas de label visible:
  - período solicitado
  - período efectivo
  - fallback aplicado

### Slice 3 - Alineación de alto impacto en APIs existentes

- Definir el contrato de migración para:
  - `/api/finance/dashboard/pnl`
  - `/api/finance/intelligence/operational-pl`
  - `/api/finance/intelligence/client-economics`
  - `/api/finance/dashboard/cashflow`
  - surfaces equivalentes de Agency y People
- Eliminar defaults implícitos no declarados de `current month`
- Exigir respuesta estándar con:
  - `requestedPeriodKey`
  - `effectivePeriodKey`
  - `fallbackApplied`

### Slice 4 - Roadmap de paridad temporal real por dominio

- Mapear qué módulos ya soportan rango real
- Mapear qué módulos son solo `month/year`
- Definir los read models faltantes para llegar a soporte real de `day/week/year` donde hoy solo existe snapshot mensual
- Priorizar por valor:
  - Finance
  - Cost Intelligence
  - Agency
  - People Finance
  - ICO

## Out of Scope

- Implementar en esta misma lane todos los read models diarios y semanales de Finance
- Reescribir todas las vistas del portal en un solo lote
- Cambiar fórmulas financieras de revenue, margin, payroll o cashflow
- Rediseñar `Payroll`, `Leave`, `Agency` o `ICO` más allá del contrato temporal
- Habilitar `Hoy` o `Semana` en módulos mensuales inventando datos a partir de snapshots agregados

## Acceptance Criteria

- [ ] Existe una task/spec ejecutable que define `TemporalScope`, `mode`, `view`, `basis` y `fallbackPolicy`
- [ ] Queda documentado qué dominios ya soportan rango real y cuáles siguen siendo mensuales
- [ ] Queda documentado qué APIs deben adoptar primero el contrato temporal shared
- [ ] Queda explícita la regla de timezone canónica `America/Santiago`
- [ ] Queda explícita la distinción entre `calendar time`, `operational time` y `financial time`
- [ ] Queda explícita la regla de `effectivePeriodKey` para evitar mezclar `current month` y `latest available`
- [ ] El roadmap de read models faltantes deja claro qué hace falta para que la plataforma soporte `day/week/month/year/agenda` de forma real
- [ ] La task referencia superficies reales del repo y no queda como brief abstracto desconectado del runtime

## Verification

- Auditoría documental de:
  - `src/lib/calendar/operational-calendar.ts`
  - `src/components/greenhouse/GreenhouseCalendar.tsx`
  - `src/components/greenhouse/GreenhouseDatePicker.tsx`
  - `src/lib/finance/reporting.ts`
  - `src/app/api/finance/dashboard/pnl/route.ts`
  - `src/app/api/finance/intelligence/operational-pl/route.ts`
  - `src/app/api/finance/intelligence/client-economics/route.ts`
  - `src/app/api/hr/core/leave/calendar/route.ts`
  - `src/lib/payroll/current-payroll-period.ts`
- Validación manual de coherencia contra:
  - `Admin > Calendario operativo`
  - `Finance Dashboard`
  - `Agency Economics`
  - `Payroll`
  - `Leave`

## Follow-ups

- Derivar un documento de arquitectura viva si la lane deja de ser solo backlog y pasa a ser contrato canónico de plataforma
- Crear subtasks de implementación por dominio una vez acordado el contrato shared
- Usar esta task como gate para nuevos filtros temporales en Finance, Agency, People, Payroll e ICO
