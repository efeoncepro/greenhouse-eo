# Greenhouse Team Capacity Architecture V1

## Purpose

Este documento define la arquitectura canónica de capacidad de equipo en Greenhouse.

Su objetivo es evitar que `Agency`, `People`, `My`, `Finance` u otros módulos vuelvan a recalcular de forma distinta:

- `FTE`
- horas contratadas
- horas asignadas
- uso operativo
- disponibilidad
- costo hora
- costo cargado
- referencia de tarifa sugerida

La regla principal es:

- los cálculos puros viven en helpers reutilizables
- la combinación de fuentes por `member_id + periodo` vive en un snapshot persistido y reactivo

## Scope

Aplica a:

- `Agency > Team`
- `People > Person Intelligence`
- `My > Assignments`
- cualquier vista que necesite leer capacidad, uso operativo o costo de capacidad por persona
- futuras agregaciones de costo/capacidad para `Organization` y `Finance`

No aplica a:

- pricing comercial final negociado con cliente
- imputación manual de tiempo
- cálculo de rentabilidad por cliente completo

## Architecture Layers

### 1. Pure helpers

Los módulos puros viven en:

- `src/lib/team-capacity/units.ts`
- `src/lib/team-capacity/economics.ts`
- `src/lib/team-capacity/overhead.ts`
- `src/lib/team-capacity/pricing.ts`

Reglas:

- no leen base de datos
- no deciden el período por sí solos
- no aplican filtros de negocio como exclusión de `Efeonce` interno
- no publican eventos
- no materializan snapshots

Responsabilidades:

- `units.ts`
  - `FTE <-> horas`
  - clamps
  - envelope base de capacidad
- `economics.ts`
  - compensación fuente
  - costo laboral objetivo
  - `costPerHour`
  - contexto FX
- `overhead.ts`
  - overhead directo por persona
  - overhead compartido prorrateado
  - `loadedCost`
- `pricing.ts`
  - referencia de venta sugerida
  - política base `markup` o `targetMargin`

### 2. Reactive snapshot

La lectura estable de dominio vive en:

- tabla serving: `greenhouse_serving.member_capacity_economics`
- store: `src/lib/member-capacity-economics/store.ts`
- proyección: `src/lib/sync/projections/member-capacity-economics.ts`

Granularidad:

- `member_id`
- `period_year`
- `period_month`

Motivo:

- múltiples fuentes participan en el cálculo
- varios consumers necesitan la misma respuesta
- recalcular on-read vuelve a introducir drift semántico

### 3. Consumer views

Los consumers deben leer el snapshot y no recomputar fórmulas de dominio localmente.

Consumer principal ya cortado:

- `src/app/api/team/capacity-breakdown/route.ts`
- `src/views/agency/AgencyTeamView.tsx`

Consumers siguientes esperados:

- `src/lib/sync/projections/person-intelligence.ts`
- `src/views/greenhouse/people/tabs/PersonIntelligenceTab.tsx`
- `src/views/greenhouse/my/MyAssignmentsView.tsx`

## Canonical Semantics

### Contracted capacity

`contracted_fte` y `contracted_hours` representan la capacidad contractual base de la persona en el período.

Reglas:

- `1.0 FTE = 160h/mes` como baseline por defecto
- no aumenta porque la persona tenga múltiples assignments
- no depende de throughput ni tareas

### Assigned capacity

`assigned_hours` representa dedicación cliente comprometida.

Fuente:

- `greenhouse_core.client_team_assignments`

Reglas:

- expresa compromiso comercial
- no equivale a uso real
- excluye carga interna de `Efeonce`

### Operational usage

`usage_kind`, `used_hours` y `usage_percent` representan consumo operativo observado.

Reglas:

- no es lo mismo que `assigned_hours`
- si la fuente es porcentual/índice, no debe mostrarse como horas
- la UI debe respetar `usage_kind`

Valores válidos hoy:

- `hours`
- `percent`
- `none`

### Availability

Disponibilidad comercial:

- `commercial_availability_hours = contracted_hours - assigned_hours`

Disponibilidad operativa:

- `operational_availability_hours = contracted_hours - used_hours`

Regla:

- si no hay `used_hours`, la disponibilidad operativa puede quedar `null`
- `Agency > Team` usa por defecto la disponibilidad comercial como card principal

## Currency and FX Policy

La compensación conserva siempre moneda fuente.

Campos relevantes del snapshot:

- `source_currency`
- `target_currency`
- `fx_rate`
- `fx_rate_date`
- `fx_provider`
- `fx_strategy`

La política canónica actual es:

- moneda objetivo de snapshot: `CLP`
- estrategia FX: `period_last_business_day`
- integración operativa: `src/lib/finance/exchange-rates.ts`

Reglas:

- si la compensación está en `USD`, no se pierde el monto fuente
- la conversión a `CLP` requiere FX defendible
- si no existe FX válido, el snapshot no debe inventar el costo convertido

## Snapshot Contract

El snapshot `member_capacity_economics` debe exponer, como mínimo:

- identidad:
  - `member_id`
  - `period_year`
  - `period_month`
- capacidad:
  - `contracted_fte`
  - `contracted_hours`
  - `assigned_hours`
  - `usage_kind`
  - `used_hours`
  - `usage_percent`
  - `commercial_availability_hours`
  - `operational_availability_hours`
- economía:
  - `source_currency`
  - `target_currency`
  - `total_comp_source`
  - `total_labor_cost_target`
  - `direct_overhead_target`
  - `shared_overhead_target`
  - `loaded_cost_target`
  - `cost_per_hour_target`
  - `suggested_bill_rate_target`
- trazabilidad:
  - `fx_rate`
  - `fx_rate_date`
  - `fx_provider`
  - `fx_strategy`
  - `snapshot_status`
  - `source_compensation_version_id`
  - `source_payroll_period_id`
  - `assignment_count`
  - `materialized_at`

## Reactive Projection Fit

La proyección existe porque este dominio necesita ensamblar varias fuentes.

Triggers actuales documentados en el event catalog:

- `member.*`
- `assignment.*`
- `compensation_version.*`
- `payroll_period.*`
- `payroll_entry.upserted`
- `finance.exchange_rate.upserted`
- eventos futuros de overhead/licencias/tooling

Reglas:

- nuevos cálculos de capacidad/economía deben escalar desde esta proyección
- no crear un segundo snapshot competidor con semántica parecida
- si falta un input, agregar el evento y enriquecer la proyección existente

## Consumer Rules

### Agency

`Agency > Team` debe:

- usar el snapshot mensual actual
- excluir `Efeonce` interno en capacidad comercial
- mostrar `Uso operativo` según `usage_kind`
- no etiquetar `percent` como horas

### People

`Person Intelligence` debe converger al mismo snapshot.

Regla:

- no recalcular `costPerHour` ni `contracted/assigned/used` por otra vía si el snapshot ya lo resuelve

### My

`My Assignments` debe reutilizar:

- `fteToHours`
- snapshot de capacidad/economía

Regla:

- no repetir `fte * 160` inline si ya existe helper o snapshot canónico

### Finance / Organization

Estas vistas pueden agregar el snapshot, pero no redefinirlo.

Regla:

- agregaciones financieras deben partir desde el snapshot canónico y luego sumar reglas de negocio propias

## Escalation Guidance

Cuando una persona o agente necesite extender esta arquitectura:

### Reutilizar helpers existentes si el problema es

- convertir `FTE` a horas
- convertir horas a `FTE`
- calcular `costPerHour`
- combinar costo laboral + overhead
- derivar referencia base de bill rate

### Reutilizar la proyección existente si el problema es

- leer capacidad por miembro/período
- leer uso operativo por miembro/período
- leer costo hora por miembro/período
- alinear Agency, People o My sobre la misma semántica

### Escalar la proyección existente si falta

- una nueva fuente de overhead
- una nueva política de licencias/tooling
- una nueva fuente de uso operativo más confiable
- una política de pricing más rica

### No crear otra capa paralela si lo que falta es

- un nuevo consumer
- un nuevo campo derivado del mismo snapshot
- un nuevo evento que invalide el mismo snapshot

## Current Limitations

Estado intencional actual:

- `usage_kind = percent` cuando la señal operativa proviene de ICO y no hay horas defendibles
- `direct_overhead_target` y `shared_overhead_target` pueden seguir en `0`
- `suggested_bill_rate_target` es referencia base, no pricing final comercial

Esto no es una falla; es una implementación incremental deliberada.

## File Reference

- `src/lib/team-capacity/units.ts`
- `src/lib/team-capacity/economics.ts`
- `src/lib/team-capacity/overhead.ts`
- `src/lib/team-capacity/pricing.ts`
- `src/lib/team-capacity/shared.ts`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/app/api/team/capacity-breakdown/route.ts`
- `src/views/agency/AgencyTeamView.tsx`
- `docs/tasks/in-progress/TASK-056-agency-team-capacity-semantics.md`
