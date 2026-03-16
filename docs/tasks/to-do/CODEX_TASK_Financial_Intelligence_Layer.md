# CODEX TASK — Financial Intelligence Layer

## Estado del brief

Este documento reemplaza la version inicial de `Financial Intelligence Layer` y la deja alineada con la arquitectura vigente de Greenhouse al `2026-03-15`.

No parte desde cero:
- `Finance` ya existe como modulo operativo
- el backend activo de referencia es `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`
- `docs/tasks/complete/CODEX_TASK_Financial_Module.md` queda solo como referencia historica

## Resumen

Extender `Finance` con una capa de inteligencia financiera que agregue:
- P&L mensual
- margen por capability o linea de servicio
- margen por cliente
- tendencias de gasto por categoria
- ingresos por partnerships
- snapshots base de unit economics

Esta tarea es aditiva:
- no crea un modulo nuevo en el sidebar
- no redefine identidades de cliente, colaborador o provider
- no convierte `Finance` en un maestro paralelo

La capa nueva vive dentro de `/finance` mediante:
- nuevas APIs de analytics
- una vista dedicada `/finance/analytics`
- un CRUD de `cost allocations`
- read models y snapshots sobre runtime financiero existente

## Alineacion obligatoria

Antes de implementar, revisar:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md`
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`

## Correcciones arquitectonicas bloqueadas

Esta task debe ejecutarse con estas reglas, no con el supuesto legacy del brief original:

1. Runtime financiero es `Postgres-first`
- nuevas escrituras y nuevas tablas viven en `greenhouse_finance`
- `BigQuery` queda para marts, reporting y compatibilidad transicional
- no introducir logica nueva que dependa primariamente de `greenhouse.fin_*` como write model

2. Las identidades canonicas son obligatorias
- cliente: `client_id`
- colaborador: `member_id`
- provider externo: `provider_id`
- capability o linea: `module_id` y `module_code`

3. Las referencias legacy sobreviven solo como soporte
- `hubspot_company_id`
- `client_profile_id`
- `supplier_id`
- labels legacy de `service_line`

4. Montos financieros usan precision exacta
- `NUMERIC` en BigQuery
- `numeric` en PostgreSQL
- no usar `FLOAT64` para montos, porcentajes de asignacion o rates financieros persistidos

5. Service line no se hardcodea como taxonomia paralela
- el corte correcto es contra `greenhouse_core.service_modules`
- para margen por linea se deben usar assignments canonicos en `greenhouse_core.client_service_modules`
- si una linea no existe en el catalogo canonico, primero se corrige el catalogo, no esta task

6. P&L no es cashflow
- el dashboard financiero ya tiene flujo de caja
- el P&L de esta task debe modelar vista de resultados por periodo
- `cash collected` puede mostrarse como metrica complementaria, pero no debe reemplazar el ingreso del P&L

## Objetivo de producto

La capa debe responder cinco preguntas:
- cuanto ingreso y cuanto costo tuvo Greenhouse en un mes dado
- que capabilities o lineas contribuyen mas margen o mas erosion
- que clientes tienen mejor o peor margen operativo
- como se mueve el gasto por categoria a lo largo del tiempo
- que parte del revenue proviene de partnerships o revenue share

## Dependencias previas

### Debe existir

- [x] Route group `/finance` operativo
- [x] APIs base de `Finance` existentes
- [x] Modelo canonico de Finance ya documentado
- [x] `Finance v2` como task backend activa
- [x] `greenhouse_core.service_modules` y `greenhouse_core.client_service_modules` como catalogo y assignment layer

### No asumir como verdad cerrada

- [ ] que todas las vistas productivas lean ya solo desde PostgreSQL
- [ ] que todos los service modules requeridos para finance ya existan en el catalogo
- [ ] que todo costo historico ya venga correctamente categorizado

## Modelo de datos

## Store canonico

Para esta task, el modelo operativo nuevo debe vivir en PostgreSQL:
- `greenhouse_finance.income`
- `greenhouse_finance.expenses`
- `greenhouse_finance.client_profiles`
- `greenhouse_finance.cost_allocations` nuevo
- `greenhouse_finance.client_economics` nuevo

BigQuery puede seguir teniendo:
- replicas legacy
- marts analiticos
- views de reporting

Pero no debe ser el ownership principal de las nuevas mutaciones.

## Reglas de anclaje

### Cliente

Persistir siempre:
- `client_id`

Compatibilidad opcional:
- `hubspot_company_id`
- `client_profile_id`

### Collaborator

Persistir siempre:
- `member_id`

Compatibilidad opcional:
- `payroll_entry_id`

### Provider

Cuando el costo o partnership involucra una organizacion externa reusable:
- persistir `provider_id`

Compatibilidad opcional:
- `supplier_id`
- snapshots como `partner_name`

### Capability o linea

Persistir siempre:
- `module_id`

Snapshot util:
- `module_code`
- `module_name`

## Extensiones de schema

### 1. Extender `greenhouse_finance.income`

Agregar soporte a revenue no tradicional sin romper el modelo base:

- ampliar `income_type` para aceptar:
  - `partnership_commission`
  - `partnership_revenue_share`
  - `partnership_referral_fee`
  - `staff_augmentation`

- agregar columnas nuevas:
  - `partner_provider_id` nullable
  - `partner_name_snapshot` nullable
  - `partner_program` nullable
  - `partner_deal_reference` nullable
  - `partner_commission_rate` `numeric` nullable

Regla:
- si el partner existe como provider canonico, usar `partner_provider_id`
- `partner_name_snapshot` queda como resiliencia historica y export

### 2. Extender `greenhouse_finance.expenses`

Agregar clasificacion analitica ortogonal al `expense_type`:

- `cost_category` nullable
- `cost_is_direct` boolean default false
- `allocated_client_id` nullable

Valores permitidos de `cost_category`:
- `direct_labor`
- `indirect_labor`
- `tools_software`
- `infrastructure`
- `media_spend`
- `professional_services`
- `facilities`
- `travel_entertainment`
- `financial`
- `taxes_social`
- `client_acquisition`
- `other`

Reglas:
- `allocated_client_id` usa `client_id`, no `hubspot_company_id`
- si hace falta conservar referencia CRM, dejar `hubspot_company_id` solo como enrichment

### 3. Nueva tabla `greenhouse_finance.cost_allocations`

Objetivo:
- asignar costos a cliente o capability
- soportar reparto mensual de payroll, tools y overhead controlado

Shape recomendado:

```sql
CREATE TABLE greenhouse_finance.cost_allocations (
  allocation_id text primary key,

  source_type text not null,
  source_expense_id text null,
  source_member_id text null,
  source_provider_id text null,
  source_supplier_id text null,
  source_description_snapshot text null,

  target_type text not null,
  target_client_id text null,
  target_module_id text null,
  target_module_code_snapshot text null,
  target_name_snapshot text null,

  allocation_percent numeric not null,
  allocation_amount_clp numeric null,

  period_month date not null,
  recurring_mode text not null default 'single_month',
  valid_to_month date null,

  notes text null,
  created_by_user_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Reglas:
- `target_type` solo puede ser `client` o `service_module`
- `service_module` debe resolver a `module_id`
- `allocation_percent` se persiste como `numeric`
- la suma de allocations activas para un mismo source y mismo mes no puede exceder `1.0`
- si se usa `source_provider_id`, ese provider debe existir en `greenhouse_core.providers`

### 4. Nueva tabla `greenhouse_finance.client_economics`

Objetivo:
- guardar snapshots mensuales
- evitar recalculos pesados en request path

Shape recomendado:

```sql
CREATE TABLE greenhouse_finance.client_economics (
  snapshot_id text primary key,
  client_id text not null,
  hubspot_company_id text null,
  client_name_snapshot text not null,
  period_month date not null,

  revenue_clp numeric not null default 0,
  cash_collected_clp numeric not null default 0,
  direct_cost_clp numeric not null default 0,
  tools_cost_clp numeric not null default 0,
  overhead_allocated_clp numeric not null default 0,
  total_cost_clp numeric not null default 0,

  gross_margin_clp numeric not null default 0,
  gross_margin_percent numeric not null default 0,
  operating_margin_clp numeric not null default 0,
  operating_margin_percent numeric not null default 0,

  months_active int not null default 0,
  lifetime_revenue_clp numeric not null default 0,
  lifetime_cost_clp numeric not null default 0,
  lifetime_margin_clp numeric not null default 0,

  acquisition_cost_clp numeric not null default 0,
  acquisition_source text null,
  ltv_to_cac_ratio numeric null,

  active_module_codes jsonb null,
  service_lines_count int not null default 0,

  calculated_at timestamptz not null default now()
);
```

Reglas:
- `client_id` es la llave de negocio
- `hubspot_company_id` queda solo como soporte de drilldown
- `active_module_codes` refleja catalogo canonico, no labels hardcodeados

## Marts y read models

## Donde vive la capa analitica

El calculo pesado puede salir desde:
- servicios en PostgreSQL cuando el agregado es chico y operacional
- `greenhouse_marts` en BigQuery cuando el agregado es historico o cross-period

No crear nuevas views analiticas en `greenhouse.*` como destino final si el mismo concepto ya cabe mejor en `greenhouse_marts`.

## Read models recomendados

Crear o materializar read models equivalentes a:
- `greenhouse_marts.finance_monthly_pnl`
- `greenhouse_marts.finance_expense_trends`
- `greenhouse_marts.finance_payroll_trend`
- `greenhouse_marts.finance_tools_spend`
- `greenhouse_marts.finance_partnership_income`
- `greenhouse_marts.finance_module_margin_monthly`

`client_economics` puede vivir directamente en PostgreSQL porque es snapshot operacional servido por Finance.

## Regla del P&L

El P&L mensual debe separar al menos:
- ingresos por servicios
- ingresos por partnerships
- ingresos por staff augmentation
- costo directo
- overhead operativo
- resultado operativo

Y debe exponer tambien:
- `cash_collected_clp` como metrica complementaria

No usar como regla base:
- `payment_status IN ('paid', 'partial')` para definir revenue del P&L

Eso sirve para cashflow o cobranza, no como definicion principal de resultados.

## APIs nuevas

Todos los endpoints quedan bajo `/api/finance/analytics` y deben seguir el mismo guard del modulo.

### GET

- `/api/finance/analytics/pnl`
- `/api/finance/analytics/pnl/summary`
- `/api/finance/analytics/margin/service-line`
- `/api/finance/analytics/margin/client`
- `/api/finance/analytics/trends/expenses`
- `/api/finance/analytics/trends/payroll`
- `/api/finance/analytics/trends/tools`
- `/api/finance/analytics/partnerships`
- `/api/finance/analytics/unit-economics`

### POST

- `/api/finance/analytics/unit-economics/calculate`

### CRUD de allocations

- `GET /api/finance/cost-allocations`
- `POST /api/finance/cost-allocations`
- `PUT /api/finance/cost-allocations/[id]`
- `DELETE /api/finance/cost-allocations/[id]`

## Reglas de implementacion API

1. No consultar `raw` ni APIs fuente directo desde estas rutas.
2. Resolver siempre `clientId`, `memberId`, `providerId`, `moduleId`.
3. Exponer tambien referencias de compatibilidad cuando aporten contexto:
- `hubspotCompanyId`
- `clientProfileId`
- `supplierId`
- `moduleCode`
4. El endpoint de calculo batch no debe ejecutar backfills ni migraciones.
5. El endpoint de calculo batch debe ser idempotente por `period_month`.

## Vistas UI

### 1. `/finance`

Extender el dashboard actual con:
- KPI de margen bruto
- KPI de margen operativo
- KPI de costo de nomina
- KPI de partnerships

Charts nuevos:
- mini P&L ultimos 6 meses
- distribucion de gasto por categoria
- evolucion de nomina y headcount
- top tools o providers de software

### 2. `/finance/analytics`

Nueva vista con tabs:
- `P&L`
- `Capabilities`
- `Trends`
- `Partnerships`
- `Clients`

Nota:
- el tab que antes se planteaba como `Lineas de servicio` debe apoyarse en `service_modules` o `business_line modules`
- no hardcodear una lista fija en frontend si no sale del catalogo o de metadata server-side

### 3. `/finance/cost-allocations`

Vista CRUD para definir allocations por:
- colaborador
- gasto puntual
- provider o supplier profile

Destinos:
- cliente
- capability o linea canonicamente registrada

Validaciones:
- no exceder 100 por ciento por source y mes
- no aceptar target ambiguo
- no aceptar `target_module_id` inexistente

## Logica de negocio

### Clasificacion automatica de `cost_category`

La sugerencia automatica sigue siendo valida, con estas reglas:

| expense_type | Condicion | cost_category sugerido |
|---|---|---|
| `payroll` | `member.role_category` productivo | `direct_labor` |
| `payroll` | `member.role_category` soporte | `indirect_labor` |
| `supplier` | provider o supplier category `software` | `tools_software` |
| `supplier` | provider o supplier category `infrastructure` | `infrastructure` |
| `supplier` | provider o supplier category `professional_services` | `professional_services` |
| `supplier` | provider o supplier category `media` | `media_spend` |
| `social_security` | cualquiera | `taxes_social` |
| `tax` | cualquiera | `taxes_social` |
| `miscellaneous` | `subscriptions` | `tools_software` |
| `miscellaneous` | `office` | `facilities` |
| `miscellaneous` | `travel` o `meals` | `travel_entertainment` |
| `miscellaneous` | `banking_fees` o `insurance` | `financial` |
| `miscellaneous` | `legal` | `professional_services` |

Regla:
- sigue siendo sugerencia editable, no enforce duro

### Margen por capability o linea

Para `margin/service-line`:
- revenue se agrega por `module_id` o `module_code`
- costo se agrega por `cost_allocations.target_module_id`
- clientes activos se resuelven por `client_service_modules`

No usar como clave principal:
- strings fijos en frontend
- deals de HubSpot como assignment canonico

### Margen por cliente

Para `margin/client`:
- revenue se resuelve por `client_id`
- costo directo viene de allocations directas al cliente
- si falta allocation directa, usar fallback de prorrateo explicito y documentado
- la respuesta debe indicar si el margen usa costo directo real, costo mixto o costo prorrateado

### Unit economics

El calculo batch mensual debe:
- encontrar clientes con revenue en el periodo
- sumar revenue del periodo por `client_id`
- sumar cash collected del periodo por `client_id`
- aplicar allocations directas
- prorratear overhead solo cuando corresponda
- calcular lifetime acumulado
- calcular CAC solo desde `cost_category = 'client_acquisition'`
- hacer upsert idempotente en `greenhouse_finance.client_economics`

## Backfills

### 1. Backfill de `cost_category`

Permitido y recomendado.

Debe ejecutarse como script explicito, nunca en request path.

### 2. Backfill de allocations base

Permitido crear seeds iniciales para:
- payroll fijo por capability
- tools de uso obvio
- overhead distribuido

Pero:
- los seeds deben quedar trazables
- no asumir porcentajes invisibles sin auditoria

### 3. Sincronizacion a BigQuery

Si se publican estos nuevos objetos a BigQuery:
- hacerlo via outbox o pipeline controlado
- no reintroducir bootstrap DDL en request path

## Orden de ejecucion sugerido

### Fase 1. Foundation de datos — COMPLETADA (2026-03-15, commit c3facc0)

1. [x] Extender `greenhouse_finance.income` (partner columns)
2. [x] Extender `greenhouse_finance.expenses` (cost_category, cost_is_direct, allocated_client_id)
3. [x] Crear `greenhouse_finance.cost_allocations`
4. [x] Crear `greenhouse_finance.client_economics`
5. [x] Crear script de backfill de `cost_category` (script existe, pendiente ejecutar)

### Fase 2. Analytics P0 — PARCIALMENTE COMPLETADA

6. [x] Implementar `pnl` (commit f876d49 + fix payroll integration en Phase 5)
7. [ ] Implementar `pnl/summary`
8. [ ] Implementar `trends/expenses`
9. [ ] Implementar `trends/payroll`
10. [ ] Implementar `trends/tools`
11. [x] Extender dashboard `/finance` (P&L card + Costo de Personal card)
12. [x] Crear `/finance/intelligence` con vista de client economics (commit e59ba03)

Implementado fuera de spec pero alineado:
- [x] `GET /api/finance/intelligence/client-economics` (GET + POST compute)
- [x] `GET /api/finance/intelligence/client-economics/trend` (commit 5a69c3d)
- [x] Trend chart de evolución de márgenes en ClientEconomicsView (Phase 5)
- [x] CSV export en ClientEconomicsView (Phase 5)
- [x] Fix: payroll gross → directLabor en P&L con anti-doble-conteo (Phase 5)

### Fase 3. Partnerships P1

13. [ ] Implementar soporte partnership en `income` (columnas ya existen en schema)
14. [ ] Implementar endpoint `partnerships`
15. [ ] Implementar tab `Partnerships`

### Fase 4. Cost allocation y module margin P1

16. [ ] Implementar CRUD de allocations (store CRUD existe, falta UI)
17. [x] `margin/service-line` parcial — by-service-line enriquecido con labor costs (commit e59ba03)
18. [ ] Implementar tab `Capabilities`

Implementado fuera de spec:
- [x] Vista SQL `greenhouse_serving.client_labor_cost_allocation` (FTE-weighted payroll, commit 5a69c3d)
- [x] `computeClientLaborCosts()` engine (commit 5a69c3d)
- [x] PersonFinanceTab en Person 360 — cost attribution por Space (Phase 5)
- [x] Finance tab wired en TAB_CONFIG + PersonTabs (Phase 5)

### Fase 5. Client economics P2

19. [ ] Implementar `unit-economics/calculate` (compute batch parcial en client-economics POST)
20. [ ] Implementar `unit-economics` (LTV/CAC pendiente)
21. [x] `margin/client` parcial — client economics con margen por Space (commit e59ba03)
22. [x] Tab `Clients` parcial — ClientEconomicsView con KPIs, charts, tabla (commit e59ba03)

## Criterios de aceptacion

### Datos

- [x] Nuevas columnas y tablas persisten en `greenhouse_finance`, no solo en BigQuery legacy
- [x] Todos los montos y porcentajes persistidos usan precision exacta
- [ ] `cost_allocations` valida sumas por source y periodo (CRUD existe, validación parcial)
- [x] `client_economics` usa `client_id` como anchor de negocio

### Arquitectura

- [x] Ninguna API nueva depende de raw source APIs
- [x] Ninguna superficie nueva usa `hubspot_company_id` o `supplier_id` como identidad primaria
- [ ] Margen por capability usa catalogo canonico de modules (pendiente Fase 4)
- [x] La task no reabre un silo de `service_line` fuera de `service_modules`

### Producto

- [x] `/finance` muestra KPIs y charts nuevos sin romper el dashboard actual
- [x] `/finance/intelligence` resuelve client economics y tendencias como primera entrega util
- [ ] partnerships quedan separados del revenue operacional (pendiente Fase 3)
- [ ] client economics muestra `LTV/CAC` solo cuando existe CAC confiable (pendiente Fase 5)

### Operacion

- [x] backfills y calculos batch corren fuera del hot path
- [x] el calculo mensual es idempotente (upsert por client_id + period)
- [ ] la respuesta API indica cuando un margen usa prorrateo de fallback

## Fuera de alcance

- no rehacer el modulo `Finance`
- no mover todo el dashboard financiero a una UX nueva
- no reemplazar cashflow por P&L
- no usar deals como layer canonica de capability assignment
- no crear una taxonomia nueva de lineas si el catalogo canonico aun no existe

## Nota final para implementacion

Si al ejecutar esta task se detecta que:
- falta algun `module_code` necesario para finance
- falta `provider_id` para partners o tools importantes
- faltan FKs canonicas en Finance para resolver `client_id` o `member_id`

entonces el primer paso no es forzar la feature con labels legacy.

El primer paso es corregir el backbone canonico o documentar la decision faltante antes de seguir.
