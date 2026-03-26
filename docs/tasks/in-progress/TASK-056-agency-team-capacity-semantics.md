# TASK-056 - Agency Team Capacity Semantics

## Delta 2026-03-26

- Se implementaron los helpers puros canónicos en `src/lib/team-capacity/`:
  - `units.ts`
  - `economics.ts`
  - `overhead.ts`
  - `pricing.ts`
- Se agregó la proyección reactiva `member_capacity_economics` y su store en `greenhouse_serving`.
- `Agency > Team` ya consume el snapshot `member_capacity_economics` por período actual en vez de recomputar semántica híbrida on-read.
- La vista dejó de tratar `Usadas` como horas por defecto y ahora presenta `Uso operativo`, con soporte para:
  - horas reales si existieran
  - índice/porcentaje cuando la fuente operativa es ICO
  - fallback honesto a `—`
- La carga comercial sigue excluyendo `Efeonce` interno.
- El snapshot todavía deja `overhead` en `0` y `suggestedBillRateTarget` como referencia base; falta profundizar la capa de costos compartidos/política comercial en siguientes slices.
- Validación ejecutada en este slice:
  - `pnpm test src/lib/team-capacity/units.test.ts src/lib/team-capacity/economics.test.ts src/lib/team-capacity/overhead.test.ts src/lib/team-capacity/pricing.test.ts src/lib/team-capacity/shared.test.ts src/lib/sync/projections/member-capacity-economics.test.ts src/app/api/team/capacity-breakdown/route.test.ts src/views/agency/AgencyTeamView.test.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Parcial`
- Rank: `2`
- Domain: `ops`
- Legacy ID: `TASK-008` follow-up

## Summary

`Agency > Team` ya dejó de sobrecontar assignments internos y FTE imposibles, pero la vista sigue mezclando conceptos de capacidad comercial con señales de uso operativo. Esta task formaliza el contrato de dominio antes de seguir iterando backend/UI.

El objetivo es separar de forma explícita `capacidad contractual`, `dedicación comprometida`, `uso operativo` y `disponibilidad`, y dejar dos capas canónicas reutilizables:

- unidades de capacidad: `FTE <-> horas`
- economía de capacidad: `costo hora`, `costo hundido`, `tarifa sugerida`

Ninguna de estas capas debe mezclar por sí sola reglas comerciales específicas de una vista.

## Why This Task Exists

El runtime reciente confirmó tres problemas semánticos distintos:

1. `Contratadas`, `Asignadas` y `Usadas` no son equivalentes
- `1.0 FTE` representa la capacidad base del período
- una asignación cliente representa compromiso comercial
- el uso operativo debe representar consumo real o estimado del período

2. `Efeonce` interno no debe contaminar la lectura comercial
- la autogestión interna aprovecha horas libres del equipo
- no debe tratarse como presión de demanda cliente en `Agency > Team`

3. El repo no tiene todavía una unidad canónica compartida para capacidad
- hoy se repite `FTE * 160` e inferencias similares en varias zonas
- eso facilita drift entre Team, People, Finance y futuras vistas operativas

4. Tampoco existe una capa canónica para cuantificar el costo real de una hora de capacidad
- salario base, bonos y costos variables hoy viven en módulos relacionados pero no en una abstracción reusable para pricing/capacidad
- sin esa capa, distintas vistas pueden terminar calculando distinto:
  - cuánto le cuesta una hora a la agencia
  - cuánto debería sugerirse cobrar por esa hora

## Goal

- Definir el contrato canónico de `Agency > Team` sin mezclar capacidad comercial y uso operativo.
- Dejar una propuesta explícita de helper reusable para conversiones `FTE <-> horas`.
- Dejar una propuesta explícita de cuantificador económico por persona/período para traducir compensación a `costo hora` y `tarifa sugerida`.
- Preparar el refactor posterior de backend/UI con reglas de negocio y fallback claros.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md`
- `docs/tasks/complete/TASK-008-team-identity-capacity-system.md`
- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`

Reglas obligatorias:

- `member_id` sigue siendo el ancla canónica del colaborador.
- `client_team_assignments` expresa compromiso comercial, no uso operativo real.
- `Efeonce` interno no debe computarse como carga cliente en esta vista.
- un helper de unidades no debe decidir semántica de negocio; solo convertir, normalizar y capear.
- un cuantificador económico no debe decidir descuentos comerciales ni pricing final de venta; solo producir costos y referencias defendibles por período/persona.
- si `usedHours` no tiene fuente defendible, la UI no debe inventarlas ni equipararlas a `assignedHours`.

## Dependencies & Impact

### Depends on

- `greenhouse_core.client_team_assignments`
- `greenhouse_serving.ico_member_metrics`
- `greenhouse_serving.person_operational_metrics` o su reemplazo canónico futuro
- `greenhouse_finance.exchange_rates`
- `src/lib/finance/exchange-rates.ts`
- `TASK-008` como baseline de capacidad pendiente
- `TASK-055` como baseline activa de FX histórico y costo laboral canonizado
- `TASK-011` y `TASK-042` si se necesita consolidar señales operativas por persona

### Impacts to

- `Agency > Team`
- `People 360` y futuros tabs operativos por persona
- `Finance Intelligence` si reutiliza nociones de `FTE`, capacidad o costo por FTE
- `Staff Augmentation` y cualquier vista de disponibilidad comercial

### Files owned

- `src/app/api/team/capacity-breakdown/route.ts`
- `src/lib/team-capacity/shared.ts`
- `src/views/agency/AgencyTeamView.tsx`
- `src/lib/person-intelligence/**`
- `src/lib/person-360/**`
- `src/lib/team-capacity/**`
- `src/lib/finance/exchange-rates.ts`
- `docs/tasks/to-do/TASK-056-agency-team-capacity-semantics.md`

## Current Repo State

### Ya existe

- La vista ya excluye `Efeonce` interno de la carga cliente.
- La vista ya no permite `2.0 FTE` artificiales por persona.
- El runtime actual ya se redujo a los 3 miembros billable con señal operacional materializada en `Sky Airline`.
- `Agency > Team` ya está protegida contra caché vieja y contra freezes por fetch lento.

### Gap actual

- `Usadas` todavía no tiene una definición de negocio cerrada.
- La vista sigue usando el mismo lienzo para capacidad comercial y ocupación operativa.
- No existe helper canónico para conversiones y envelopes de capacidad.
- No existe todavía una política de moneda/FX explícita para capacidad y pricing aunque el repo ya tiene una integración funcional `USD/CLP`.
- Sigue faltando una decisión explícita sobre si `Uso operativo` se mostrará como:
  - horas reales
  - horas estimadas
  - índice/porcentaje operativo

## Consumers Audit

Superficies del repo que hoy consumen o probablemente consumirán estas capas:

### Consumo directo de capacidad

- `src/app/api/team/capacity-breakdown/route.ts`
  - runtime actual de `Agency > Team`
  - hoy mezcla cálculo de envelope, uso operativo y enriquecimiento con inteligencia
- `src/lib/team-capacity/shared.ts`
  - helper actual de capacidad
  - candidato natural a descomponerse en `units.ts` y contratos más explícitos
- `src/views/agency/AgencyTeamView.tsx`
  - UI principal que hoy mezcla `Asignadas`, `Usadas` y `Disponibles`
- `src/app/api/agency/capacity/route.ts`
  - superficie Agency adicional que debe mantenerse coherente con el nuevo contrato
- `src/views/greenhouse/GreenhouseClientTeam.tsx`
  - muestra FTE, horas/mes y breakdown de equipo

### Consumo por persona

- `src/lib/sync/projections/person-intelligence.ts`
  - hoy materializa capacidad y `cost_per_hour`
  - hoy usa `computeCapacityBreakdown()` con semántica todavía parcial
- `src/views/greenhouse/people/tabs/PersonIntelligenceTab.tsx`
  - consume `contratadas`, `asignadas`, `usadas`, `disponibles`, `cost_per_hour`
- `src/views/greenhouse/my/MyAssignmentsView.tsx`
  - hoy hace conversiones locales `fte * 160` y calcula disponibilidad de forma demasiado simplificada
- `src/types/team.ts`
- `src/types/people.ts`
  - ambos tipos deberán alinearse al nuevo contrato

### Consumo económico / financiero

- `src/lib/account-360/organization-economics.ts`
  - ya usa `headcountFte`, `costPerFte` y costo laboral; probable consumidor futuro de `costPerHour`/`loadedCost`
- `src/lib/account-360/organization-store.ts`
  - consume `headcount_fte` y economics derivados
- `src/app/api/organizations/[id]/economics/route.ts`
  - posible consumer futuro del snapshot de costo/capacidad por persona agregado
- `src/lib/finance/postgres-store-intelligence.ts`
  - no debería duplicar fórmulas de costo horario si esta lane las canoniza

### Superficies de referencia / nomenclatura

- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/tasks/complete/TASK-008-team-identity-capacity-system.md`

## Reactive Projection Fit

### Qué sí debe quedarse como helper puro

Estas piezas conviene que sigan siendo funciones puras reutilizables, sin `outbox` ni materialización:

- conversiones de unidades:
  - `fteToHours`
  - `hoursToFte`
  - clamps y envelopes básicos
- aritmética económica pura:
  - `costPerHour`
  - `loadedCostPerHour`
  - `suggestedBillRate`
- prorrateo puro:
  - reparto de overhead por regla ya definida
- conversión de moneda cuando ya se tiene `fxRate`

Regla:
- helper puro = sin acceso a DB, sin heurísticas de membresía, sin decidir el período por sí solo

### Qué sí conviene materializar con outbox -> projections

La combinación de fuentes para producir una lectura estable por miembro/período sí conviene materializarla:

- assignments
- compensación/payroll
- tipo de cambio
- overhead/persona
- señal operativa ICO

Propuesta de serving/proyección derivada:

- `greenhouse_serving.member_capacity_economics`
  - granularidad: `member_id + period_year + period_month`
  - pensado para alimentar:
    - `Agency > Team`
    - `People > Intelligence`
    - `My Assignments`
    - vistas de economics agregadas

Campos mínimos sugeridos:

- `member_id`
- `period_year`
- `period_month`
- `contracted_fte`
- `contracted_hours`
- `assigned_hours`
- `usage_kind`
- `used_hours` o `usage_percent`
- `commercial_availability_hours`
- `operational_availability_hours`
- `source_currency`
- `target_currency`
- `total_comp_source`
- `total_labor_cost_target`
- `direct_overhead_target`
- `shared_overhead_target`
- `loaded_cost_target`
- `cost_per_hour_target`
- `suggested_bill_rate_target`
- `fx_rate`
- `fx_rate_date`
- `fx_provider`
- `fx_strategy`
- `snapshot_status`
- `materialized_at`

### Por qué conviene proyección y no solo cálculo on-read

- `Agency > Team` ya demostró que on-read mezcla demasiadas fuentes y semánticas.
- `person-intelligence` ya usa el patrón de proyección para capacidad + costo.
- `costPerHour` y `suggestedBillRate` dependen de múltiples dominios con distintos triggers.
- un snapshot mensual evita que cada vista recalcule distinto o con distinto fallback.

### Eventos/Triggers que deberían refrescar esta proyección

Eventos ya existentes del catálogo que deberían impactarla:

- `assignment.created`
- `assignment.updated`
- `assignment.removed`
- `member.updated`
- `compensation.updated`
- `compensation_version.created`
- `payroll_period.updated`
- `payroll_period.calculated`
- `payroll_period.approved`
- `payroll_entry.upserted`
- `ico.materialization.completed`

Eventos que probablemente faltan o deben ampliarse:

- `finance.exchange_rate.updated`
- `finance.exchange_rate.synced`
- `finance.overhead.updated`
- `finance.license_cost.updated`
- `finance.tooling_cost.updated`

Regla derivada:
- si la lane crea catálogo de overhead/licencias, debe publicar outbox events para mantener `member_capacity_economics` fresco

### Recomendación operativa

- Helpers puros para fórmulas y conversiones
- Proyección reactiva para snapshot por miembro/período
- Routes/UI deben leer el snapshot y no recomputar semántica compleja localmente
- `person-intelligence` y `Agency > Team` deben converger en el mismo snapshot base en vez de duplicar fórmulas

## Scope

### Slice 1 - Contrato de dominio

- Definir formalmente estas métricas:
  - `contractedCapacity`
  - `assignedCommercialLoad`
  - `operationalUsage`
  - `commercialAvailability`
  - `operationalAvailability`
- Documentar fórmula, fuente, fallback y semántica UX de cada una.

### Slice 2 - Helper canónico de unidades

- Diseñar un módulo reusable para:
  - `fteToHours`
  - `hoursToFte`
  - `clampFte`
  - `clampHours`
  - envelope comercial y operativo
- Establecer explícitamente qué NO resuelve ese helper:
  - exclusión de clientes internos
  - pertenencia de miembros a una vista
  - inferencia de `usedHours`

### Slice 3 - Cuantificador económico de capacidad

- Diseñar una segunda capa reusable para convertir compensación del período en economía horaria:
  - `baseSalary`
  - `fixedBonuses`
  - `variableBonuses`
  - `employerCosts`
  - `monthlyCapacityHours`
  - `costPerHour`
  - `suggestedBillRate`
- Separar explícitamente:
  - costo agencia por hora
  - referencia sugerida de venta por hora
  - margen objetivo aplicado
- Dejar claro qué inputs son obligatorios y cuáles son opcionales o parametrizables por país/período.

### Slice 4 - Moneda y FX

- Anclar la spec a la integración existente en `src/lib/finance/exchange-rates.ts`.
- Regla base:
  - la compensación conserva siempre su moneda fuente (`CLP` o `USD`)
  - el costo calculado puede persistirse en moneda objetivo además de la fuente
  - ninguna conversión debe perder `rate`, `rateDate`, `provider` ni `strategy`
- Política propuesta para esta lane:
  - moneda fuente: la del payroll/compensación
  - moneda objetivo por defecto en Agency: `CLP`
  - estrategia FX canónica: último día hábil del período
  - fuente primaria: `mindicador`
  - fallback operativo: el fallback ya implementado en `exchange-rates.ts`
- Toda conversión debe poder explicar:
  - `sourceCurrency`
  - `targetCurrency`
  - `fxRate`
  - `fxDate`
  - `fxProvider`
  - `fxStrategy`

### Slice 5 - Contrato de API + UX

- Proponer payload estable para `GET /api/team/capacity-breakdown`.
- Renombrar en diseño si hace falta:
  - `Usadas` -> `Uso operativo`
  - `Disponibles` -> `Disponible comercial`
- Definir qué copy de fallback mostrar cuando falte fuente confiable.

### Slice 6 - Follow-up técnico

- Derivar implementación posterior en backend/UI una vez cerrado el contrato.
- Revisar si `person_operational_360` y consumers relacionados siguen materializando semántica vieja de assignments.

## Out of Scope

- Implementar time tracking real.
- Rehacer toda la capa de `People 360`.
- Resolver pricing comercial final de contratos en esta misma lane.
- Mezclar este trabajo con migraciones grandes de UI o refactors de otras vistas.

## Open Questions

- ¿`Uso operativo` debe expresarse en horas o en porcentaje/índice mientras no exista imputación real?
- ¿El estado por persona debe reflejar:
  - saturación comercial
  - saturación operativa
  - ambas por separado?
- ¿La vista debe exponer dos disponibilidades (`comercial` y `operativa`) o una sola principal?
- ¿La `tarifa sugerida` debe ser:
  - solo `costPlus`
  - derivada de margen objetivo por rol
  - configurable por organización/servicio?
- ¿Qué componentes del costo deben entrar en `costPerHour`:
  - salario base
  - bonos fijos
  - bonos variables
  - cargas empleador
  - overhead de agencia?
- ¿Qué vistas deben exponer ambos montos:
  - fuente (`USD`)
  - convertidos (`CLP`)?
- ¿La `tarifa sugerida` debe mostrarse en una sola moneda o en par dual `USD/CLP` cuando el servicio se comercializa en dólares?

## Mini Spec Propuesto

### Conceptos

- `contractedCapacity`
  - capacidad contractual del período
  - unidad base: `FTE` y `hours`
- `assignedCommercialLoad`
  - dedicación externa comprometida a clientes
  - excluye `Efeonce` interno
- `operationalUsage`
  - uso real o estimado del período
  - no equivale a asignación comercial
- `capacityEconomics`
  - traducción de compensación + overhead a costo hora y referencia de venta

### Fórmulas base

- `contractedHours = contractedFte * monthlyBaseHours`
- `commercialAvailabilityHours = max(contractedHours - assignedHours, 0)`
- `operationalAvailabilityHours = max(contractedHours - usedHours, 0)` si `usedHours` existe
- `totalLaborCostSource = baseSalary + fixedBonuses + variableBonuses + employerCosts`
- `costPerHourTarget = loadedCostTarget / contractedHours`
- `suggestedBillRateTarget = loadedCostTarget / contractedHours * pricingMultiplier`

### Moneda y FX

- Monedas soportadas en la lane inicial: `CLP`, `USD`
- La compensación debe conservar:
  - monto fuente
  - moneda fuente
- La conversión a moneda objetivo debe usar la integración actual:
  - helper/fuente: `src/lib/finance/exchange-rates.ts`
  - tabla persistida: `greenhouse_finance.exchange_rates`
  - proveedor primario: `mindicador`
  - estrategia canónica: último día hábil del período
- Si no existe FX defendible:
  - no inventar conversión
  - marcar el snapshot como parcial
  - degradar UI a fuente o `—`

### Fallbacks UX

- Si no hay `usedHours` defendibles:
  - mostrar `Uso operativo` como índice/porcentaje o `—`
- Si no hay costo laboral completo:
  - no mostrar `costPerHour` como definitivo
- Si no hay FX válido:
  - mantener moneda fuente y explicitar ausencia de conversión

## Exact Module Contracts

Los siguientes contratos quedan propuestos como baseline de implementación. Todavía no se implementan en esta task; se documentan para evitar drift entre módulos.

### 1. `src/lib/team-capacity/units.ts`

Responsabilidad:
- conversiones puras entre `FTE`, horas y envelopes de capacidad
- sin acceso a DB
- sin semántica de cliente interno
- sin inferir uso operativo

Tipos propuestos:

```ts
export type CapacityUnitConfig = {
  monthlyBaseHours?: number // default: 160
  maxFte?: number // default: 1
}

export type CapacityEnvelope = {
  contractedFte: number
  contractedHours: number
  assignedHours: number
  usedHours: number | null
  commercialAvailabilityHours: number
  operationalAvailabilityHours: number | null
  overassignedCommercially: boolean
  overloadedOperationally: boolean | null
}
```

Funciones propuestas:

```ts
export const fteToHours: (fte: number, config?: CapacityUnitConfig) => number
export const hoursToFte: (hours: number, config?: CapacityUnitConfig) => number
export const clampFte: (fte: number, config?: CapacityUnitConfig) => number
export const clampHours: (hours: number) => number
export const buildCapacityEnvelope: (input: {
  contractedFte: number
  assignedHours: number
  usedHours?: number | null
  config?: CapacityUnitConfig
}) => CapacityEnvelope
```

Reglas:
- `contractedHours = fteToHours(contractedFte)`
- `commercialAvailabilityHours = max(contractedHours - assignedHours, 0)`
- `operationalAvailabilityHours = usedHours != null ? max(contractedHours - usedHours, 0) : null`
- `overassignedCommercially = assignedHours > contractedHours`
- `overloadedOperationally = usedHours != null ? usedHours > contractedHours : null`

### 2. `src/lib/team-capacity/economics.ts`

Responsabilidad:
- convertir compensación del período en costo laboral por hora
- conservar moneda fuente y conversión objetivo
- sin decidir pricing comercial final

Tipos propuestos:

```ts
export type CompensationBreakdown = {
  sourceCurrency: 'CLP' | 'USD'
  baseSalarySource: number
  fixedBonusesSource: number
  variableBonusesSource: number
  employerCostsSource: number
}

export type FxContext = {
  sourceCurrency: 'CLP' | 'USD'
  targetCurrency: 'CLP' | 'USD'
  rate: number
  rateDate: string
  provider: string
  strategy: 'period_last_business_day'
}

export type LaborEconomicsSnapshot = {
  sourceCurrency: 'CLP' | 'USD'
  targetCurrency: 'CLP' | 'USD'
  totalCompensationSource: number
  totalLaborCostTarget: number | null
  contractedHours: number
  costPerHourTarget: number | null
  fx: FxContext | null
  snapshotStatus: 'complete' | 'missing_fx' | 'missing_compensation' | 'invalid_capacity'
}
```

Funciones propuestas:

```ts
export const getTotalCompensationSource: (input: CompensationBreakdown) => number
export const convertCompensationToTarget: (input: {
  compensation: CompensationBreakdown
  fx?: FxContext | null
}) => { totalCompensationSource: number; totalLaborCostTarget: number | null; snapshotStatus: LaborEconomicsSnapshot['snapshotStatus'] }
export const getCostPerHour: (input: {
  totalLaborCostTarget: number | null
  contractedHours: number
}) => number | null
export const buildLaborEconomicsSnapshot: (input: {
  compensation: CompensationBreakdown | null
  contractedHours: number
  targetCurrency: 'CLP' | 'USD'
  fx?: FxContext | null
}) => LaborEconomicsSnapshot
```

Reglas:
- `totalCompensationSource = base + fixedBonuses + variableBonuses + employerCosts`
- si `sourceCurrency === targetCurrency`, `fx` es opcional
- si falta FX y las monedas difieren, `totalLaborCostTarget = null`
- si `contractedHours <= 0`, `costPerHourTarget = null`

### 3. `src/lib/team-capacity/overhead.ts`

Responsabilidad:
- prorratear costos no salariales sobre la capacidad
- separar overhead directo por persona y overhead compartido

Tipos propuestos:

```ts
export type DirectMemberOverhead = {
  memberId: string
  periodYear: number
  periodMonth: number
  sourceCurrency: 'CLP' | 'USD'
  licenseCostSource: number
  toolingCostSource: number
  equipmentCostSource: number
}

export type SharedOverheadPool = {
  periodYear: number
  periodMonth: number
  targetCurrency: 'CLP' | 'USD'
  totalSharedOverheadTarget: number
  allocationMethod: 'headcount' | 'fte_weighted' | 'contracted_hours' | 'assigned_hours'
}

export type MemberOverheadSnapshot = {
  directOverheadTarget: number | null
  sharedOverheadTarget: number | null
  totalOverheadTarget: number | null
  overheadPerHourTarget: number | null
  snapshotStatus: 'complete' | 'partial' | 'missing_inputs'
}
```

Funciones propuestas:

```ts
export const getDirectOverheadTarget: (input: {
  direct: DirectMemberOverhead | null
  targetCurrency: 'CLP' | 'USD'
  fx?: FxContext | null
}) => number | null
export const allocateSharedOverheadTarget: (input: {
  pool: SharedOverheadPool | null
  memberWeight: number
  totalWeight: number
}) => number | null
export const buildMemberOverheadSnapshot: (input: {
  directOverheadTarget: number | null
  sharedOverheadTarget: number | null
  contractedHours: number
}) => MemberOverheadSnapshot
```

Reglas:
- el prorrateo compartido no puede dividir por `0`
- `overheadPerHourTarget = totalOverheadTarget / contractedHours` cuando ambos existan
- si solo existe una parte del overhead, el snapshot queda `partial`

### 4. `src/lib/team-capacity/pricing.ts`

Responsabilidad:
- producir una referencia de venta desde costo cargado
- no reemplaza pricing comercial final ni descuentos de negocio

Tipos propuestos:

```ts
export type PricingPolicy = {
  targetMarginPct?: number
  markupMultiplier?: number
  minimumBillRateTarget?: number | null
}

export type PricingSnapshot = {
  loadedCostPerHourTarget: number | null
  suggestedBillRateTarget: number | null
  targetCurrency: 'CLP' | 'USD'
  policyType: 'margin' | 'markup' | 'minimum_floor'
  snapshotStatus: 'complete' | 'missing_cost'
}
```

Funciones propuestas:

```ts
export const getLoadedCostPerHour: (input: {
  laborCostPerHourTarget: number | null
  overheadPerHourTarget: number | null
}) => number | null
export const getSuggestedBillRate: (input: {
  loadedCostPerHourTarget: number | null
  pricingPolicy: PricingPolicy
}) => PricingSnapshot
```

Reglas:
- si existe `targetMarginPct`, `suggestedBillRate = loadedCost / (1 - margin)`
- si existe `markupMultiplier`, `suggestedBillRate = loadedCost * markup`
- si existe `minimumBillRateTarget`, aplicar piso
- si falta costo cargado, no inventar tarifa sugerida

### 5. Snapshot canónico `member_capacity_economics`

Responsabilidad:
- ensamblar por miembro/período las distintas fuentes ya normalizadas
- surface compartida para Agency, People, My y Economics

Tipo propuesto:

```ts
export type MemberCapacityEconomicsSnapshot = {
  memberId: string
  periodYear: number
  periodMonth: number

  contractedFte: number
  contractedHours: number
  assignedHours: number

  usageKind: 'hours' | 'percent' | 'index' | 'none'
  usedHours: number | null
  usagePercent: number | null
  usageIndex: number | null

  commercialAvailabilityHours: number
  operationalAvailabilityHours: number | null

  sourceCurrency: 'CLP' | 'USD'
  targetCurrency: 'CLP' | 'USD'
  totalCompensationSource: number | null
  totalLaborCostTarget: number | null
  directOverheadTarget: number | null
  sharedOverheadTarget: number | null
  loadedCostTarget: number | null
  costPerHourTarget: number | null
  loadedCostPerHourTarget: number | null
  suggestedBillRateTarget: number | null

  fxRate: number | null
  fxRateDate: string | null
  fxProvider: string | null
  fxStrategy: 'period_last_business_day' | null

  snapshotStatus: 'complete' | 'partial_usage' | 'partial_cost' | 'partial_fx' | 'invalid'
  materializedAt: string
}
```

Read model sugerido:

- `Agency > Team`
  - usa `contractedHours`, `assignedHours`, `usage*`, `commercialAvailabilityHours`
- `People > Intelligence`
  - usa snapshot completo
- `My Assignments`
  - usa contracted/assigned/commercial availability
- `Organization Economics`
  - consume agregados o derivados por cliente/organización, no recalcula `costPerHour` desde cero

### 6. Contrato sugerido para `GET /api/team/capacity-breakdown`

La route no debería exponer cálculo ad hoc, sino leer el snapshot y traducirlo a UI:

```ts
export type TeamCapacityBreakdownResponse = {
  period: { year: number; month: number }
  summary: {
    contractedHours: number
    assignedHours: number
    usageKind: 'hours' | 'percent' | 'index' | 'none'
    usedHours: number | null
    usagePercent: number | null
    commercialAvailabilityHours: number
    memberCount: number
  }
  members: Array<{
    memberId: string
    displayName: string
    roleTitle: string | null
    contractedFte: number
    contractedHours: number
    assignedHours: number
    usageKind: 'hours' | 'percent' | 'index' | 'none'
    usedHours: number | null
    usagePercent: number | null
    commercialAvailabilityHours: number
    operationalAvailabilityHours: number | null
    snapshotStatus: MemberCapacityEconomicsSnapshot['snapshotStatus']
    economics?: {
      targetCurrency: 'CLP' | 'USD'
      costPerHourTarget: number | null
      suggestedBillRateTarget: number | null
    } | null
  }>
}
```

Regla UX derivada:
- la route debe devolver tanto `usageKind` como el valor asociado para que la UI no asuma que siempre son horas
- `Agency > Team` no debe etiquetar `Usadas` como horas si `usageKind !== 'hours'`

## Acceptance Criteria

- [ ] Existe un contrato escrito y estable para `Contratadas`, `Asignadas`, `Uso operativo` y `Disponibilidad`.
- [ ] Queda documentado que `Asignadas` no equivale a `Usadas`.
- [ ] Queda definido el comportamiento de `Efeonce` interno como costo hundido/autogestión, fuera de carga cliente.
- [ ] Queda propuesta una capa reusable de conversiones `FTE <-> horas` sin lógica de negocio embebida.
- [ ] Queda propuesta una capa reusable de cuantificación económica por persona/período para `costPerHour` y `suggestedBillRate`.
- [ ] Quedan inventariados los consumers del repo que deberán converger a esta semántica.
- [ ] Queda documentado qué parte debe resolverse con helpers puros y qué parte conviene materializar vía `outbox -> projections`.
- [ ] El siguiente trabajo de implementación puede ejecutarse sin depender de memoria conversacional.

## Verification

- Revisión contra `TASK-008` y arquitectura base.
- Consistencia con runtime observado en `Agency > Team`.
- Validación manual del contrato con stakeholders antes de tocar backend/UI nuevamente.
