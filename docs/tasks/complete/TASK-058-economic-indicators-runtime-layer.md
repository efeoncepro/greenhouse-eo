# TASK-058 - Economic Indicators Runtime Layer

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Implementación`
- Rank: `22`
- Domain: `finance`
- GitHub Project: `Greenhouse Delivery`

## Summary

Crear una capa server-side común para indicadores económicos de Chile y migrar los consumers vivos a un contrato consistente.

El baseline operativo de esta lane es cubrir `USD_CLP`, `UF` y `UTM`, dejando `IPC` incorporado al catálogo y al modelo de fetch/persistencia aunque todavía no tenga un consumer obligatorio en runtime.

La lane también debe dejar persistencia histórica mínima defendible: backfill desde `2026-01-01` hasta la fecha actual y sync diario hacia adelante, para soportar recalculo y ajuste de períodos cerrados o corregidos.

## Why This Task Exists

Hoy el repo ya consume indicadores económicos, pero lo hace de forma fragmentada:

- `Finance` ya sincroniza `USD/CLP` y lo usa para ingresos, egresos, P&L y economics
- `AI Tooling` lee `USD/CLP` por su cuenta y mantiene fallback hardcoded
- `Payroll` depende de `UF` para Isapre, pero la sigue pidiendo manualmente por período
- existe helper para `UTM` en cálculo tributario Chile, pero el cálculo real de nómina aún no lo consume

Esto deja tres gaps operativos:

- la capa actual está sesgada a `exchange rates` y no modela bien indicadores no FX como `UF`, `UTM` o `IPC`
- distintos módulos podrían volver a implementar fetch, fallback histórico y persistencia por separado
- `Payroll` sigue mezclando cálculo normativo con ingreso manual de insumos que el backend ya puede hidratar
- los projections reactivos que ya dependen de tasas o snapshots económicos no tienen todavía una semántica general de invalidación para indicadores no FX
- si mañana se corrige un período de enero/febrero 2026, el sistema necesita consultar un valor histórico persistido y no depender del proveedor externo en tiempo real

## Goal

- Crear una capa común de indicadores económicos para backend
- Mantener `USD/CLP` bajo esa capa sin romper los consumers existentes
- Autohidratar `UF` en `Payroll` para períodos Chile cuando corresponda
- Integrar `UTM` al cálculo de impuesto Chile en `Payroll`
- Eliminar consumers aislados de tipo de cambio o defaults hardcoded cuando ya exista helper canónico
- Dejar `IPC` disponible en el catálogo de indicadores para futuros consumers sin forzar una UI ficticia en esta lane
- Persistir histórico de indicadores desde `2026-01-01` hasta hoy y seguir almacenando snapshots diarios hacia adelante
- Publicar eventos outbox canónicos para que los projections reactivos que dependan de indicadores económicos se refresquen sin polling ad hoc

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`

Reglas obligatorias:

- `Finance` sigue siendo owner de la persistencia operativa de indicadores económicos compartidos
- la nueva capa debe ser `server-only`; frontend no debe resolver indicadores directo desde cliente
- no mezclar en esta lane rediseños amplios de UI ni refactors de módulos no relacionados
- `UF` y `UTM` deben snapshotearse de manera reproducible por período/entry cuando afecten cálculo de nómina
- `IPC` puede entrar como capacidad disponible sin inventar consumers de producto que hoy no existen
- los cambios en indicadores persistidos deben emitir eventos outbox explícitos cuando puedan afectar projections derivadas
- el histórico mínimo operado por el repo para esta lane empieza en `2026-01-01`; no intentar un backfill masivo abierto sin justificarlo

## Dependencies & Impact

### Depends on

- `src/lib/finance/exchange-rates.ts`
- `src/lib/finance/shared.ts`
- `src/lib/finance/postgres-store.ts`
- `src/app/api/finance/exchange-rates/latest/route.ts`
- `src/app/api/finance/exchange-rates/sync/route.ts`
- `src/lib/sync/projection-registry.ts`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/lib/sync/projections/person-intelligence.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/compute-chile-tax.ts`
- `docs/tasks/in-progress/TASK-001-hr-payroll-operational-hardening.md`

### Impacts to

- `Finance > Dashboard`
- `Finance > ingresos`
- `Finance > egresos`
- `Finance > P&L`
- `AI Tooling`
- `HR > Payroll`
- `Payroll exports` y explicación de cálculo
- projections reactivas de `people` y `finance` que ya reaccionan a `finance.exchange_rate.upserted`
- futuros consumers de `Organization Economics` y `Financial Intelligence`

### Files owned

- `src/lib/finance/exchange-rates.ts`
- `src/lib/finance/shared.ts`
- `src/lib/finance/*economic*`
- `src/app/api/finance/exchange-rates/*`
- `src/app/api/cron/outbox-react-finance/route.ts`
- `src/app/api/cron/outbox-react-people/route.ts`
- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- `src/lib/ai-tools/service.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/compute-chile-tax.ts`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/lib/sync/projections/person-intelligence.ts`
- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Ya existe

- sync server-side de `USD/CLP` con proveedor primario `mindicador`
- persistencia operativa de `exchange_rates`
- consumers activos de `USD/CLP` en ingresos, egresos, P&L y capacity economics
- `Payroll` ya modela `ufValue`, `taxTableVersion` y snapshots Chile por período/entry
- `computeChileTax()` ya existe como helper basado en `UTM`
- ya existen eventos outbox `finance.exchange_rate.upserted` y projections que reaccionan a ellos

### Gap actual

- la capa actual sigue nombrada y pensada solo como `exchange-rates`
- `AI Tooling` consulta tipo de cambio por fuera del helper común y conserva fallback `950`
- `UF` no se hidrata automáticamente para período de nómina
- `UTM` no está integrada al cálculo real de impuesto en `Payroll`
- `IPC` no tiene contrato runtime aún, aunque sí conviene tenerlo disponible para follow-ups
- `Finance Dashboard` muestra solo tipo de cambio, no una vista mínima de indicadores económicos relevantes
- no existe un contrato histórico explícito desde `2026-01-01` para indicadores no FX
- el mecanismo reactivo actual está centrado en `exchange_rate` y no en un catálogo más general de indicadores económicos

## Delta 2026-03-27

- Migration ejecutada: `scripts/migrations/add-economic-indicators.sql`
- Backfill histórico ejecutado: `2026-01-01 -> 2026-03-27`
- Script reusable agregado: `scripts/backfill-economic-indicators.ts`
- Cobertura verificada en PostgreSQL runtime:
  - `UF`: 86 rows
  - `USD_CLP`: 61 rows
  - `UTM`: 3 rows
  - `IPC`: 0 rows aún devueltos por `mindicador` para la serie 2026 consultada
- `greenhouse_finance.exchange_rates` quedó además sincronizada para `USD/CLP` y `CLP/USD` en el mismo rango histórico
- `Payroll` create/edit de período ya no depende del input manual de `UF`; el backend la resuelve y persiste automáticamente según `year/month`

## Scope

### Slice 1 - Capa común de indicadores

- extraer o crear helper común para indicadores económicos (`USD_CLP`, `UF`, `UTM`, `IPC`)
- normalizar contrato de fetch, fecha efectiva, provider, fallback histórico y persistencia
- mantener compatibilidad con la capa actual de `exchange-rates`

### Slice 2 - Persistencia histórica y sync diario

- backfill controlado de indicadores desde `2026-01-01` hasta hoy
- dejar sync diario hacia adelante para los indicadores activos del catálogo
- persistir fecha efectiva, fecha solicitada, fuente y valor normalizado
- evitar depender del proveedor externo para recalcular períodos históricos posteriores

### Slice 3 - Consumers obligatorios

- migrar `AI Tooling` al helper común
- mantener `Finance` sobre el helper común sin regresión en ingresos/egresos/P&L
- extender `Finance Dashboard` para exponer `USD`, `UF` y `UTM`

### Slice 4 - Payroll Chile

- autohidratar `UF` por período cuando el período/entries Chile la requieran
- integrar `UTM` al cálculo de impuesto Chile usando `taxTableVersion`
- mantener snapshot reproducible en `payroll_periods` y `payroll_entries`

### Slice 5 - Outbox y projections

- emitir eventos outbox canónicos al persistir o corregir indicadores
- asegurar que projections ya sensibles a FX/economics se refresquen cuando cambie un valor histórico relevante
- mantener el uso de reactive refresh acotado a consumers derivados; no obligar a toda lectura simple a pasar por projections

### Slice 6 - Catálogo futuro

- dejar `IPC` disponible en el catálogo/backend
- documentar consumers potenciales sin forzarlos en esta misma implementación

## Out of Scope

- rediseño amplio de `Finance Dashboard`
- incorporar monedas o indicadores no justificados hoy como `EUR`, `tasa de interés corriente` o series bancarias adicionales
- rehacer toda la modelación tributaria chilena más allá de conectar `UTM` y la tabla vigente
- resolver en esta lane automatización externa de tablas SII si aún no existe contrato claro para ello
- backfill histórico previo a `2026-01-01`

## Acceptance Criteria

- [ ] Existe una capa backend común para indicadores económicos que cubre al menos `USD_CLP`, `UF`, `UTM` e `IPC`
- [ ] Existe persistencia histórica mínima desde `2026-01-01` hasta la fecha actual para los indicadores activos definidos por la lane
- [ ] Existe sync diario hacia adelante para seguir guardando los valores día a día
- [ ] Los consumers actuales de `USD/CLP` siguen funcionando sin depender de consultas duplicadas o fallbacks hardcoded ajenos a la capa común
- [ ] `AI Tooling` deja de resolver `USD/CLP` con lógica propia
- [ ] `Payroll` puede resolver `UF` del período sin depender solo de input manual cuando el dato esté disponible
- [ ] `Payroll` usa `UTM` + `taxTableVersion` en el cálculo Chile donde corresponde
- [ ] La UI de `Finance Dashboard` expone al menos `USD`, `UF` y `UTM` con fecha/fuente o estado degradado explícito
- [ ] `IPC` queda disponible en backend con contrato documentado aunque no tenga consumer visible obligatorio
- [ ] La persistencia o corrección de indicadores emite eventos outbox canónicos y los projections afectados pueden refrescarse reactivamente

## Verification

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- validación manual en `/finance` y `/hr/payroll`
- validación manual o script de backfill para comprobar cobertura `2026-01-01 -> hoy`
- validación de refresh reactivo sobre al menos una proyección afectada por indicadores

## Open Questions

- Si `mindicador` cubre suficientemente `UF`, `UTM` e `IPC` para el baseline operativo o si conviene dejar `CMF` como fallback institucional desde el inicio
- Si `Payroll` debe autocompletar `UF` y `UTM` solo al calcular o también al crear/editar el período
- Si la persistencia debe vivir solo en `greenhouse_finance.exchange_rates` extendida o si conviene abrir una tabla más general de indicadores
- Si el evento outbox debe seguir bajo namespace `finance.exchange_rate.*` por compatibilidad o migrar a uno más general como `finance.economic_indicator.*`

## Follow-ups

- evaluar si `IPC` debe alimentar reajustes contractuales o analytics financieros
- evaluar si conviene separar semánticamente `exchange rates` de `economic indicators` también a nivel de storage
- si aparece un consumer real, considerar `EUR_CLP` como extensión posterior y no en este baseline
