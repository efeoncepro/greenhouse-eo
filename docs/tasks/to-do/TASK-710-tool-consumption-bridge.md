# TASK-710 — Tool Consumption Bridge: provider→tool→assignment→consumption→client

## Delta 2026-08-02 — Adapter de consumo hacia Cost Subledger

Esta task deja de enriquecer o decidir el catálogo. `TASK-712` resuelve primero la convergencia del catálogo,
vendor, lifecycle y unidad/cost model. `TASK-710` se limita a consumption facts, quantity/amount basis, allocation,
actual cost, coverage e idempotencia, proyectados al Cost Subledger. No materializa un MLCM universal ni crea una
segunda identidad de tools/providers.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Crítico` |
| Effort | `Alto` |
| Status real | `Diseño completo` |
| Domain | Cost Intelligence / Tooling / Identity |
| Sequence | Después de TASK-712 y de los contracts de Finance Core/Cost Subledger |

## Summary

Materializar las **dimensiones y facts canónicos del modelo Member-Loaded** definidos en `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` §2. Hoy el portal tiene tablas parciales (`tool_assignments`, `expenses`, `payroll_member_client_allocations`) pero **no existe el bridge** entre asignación nominal de una tool a un member y consumo efectivo (cost incurred) que termina propagándose al cliente vía la asignación FTE del member.

Esta task cierra ese gap entregando:

- Tabla `tool_consumption_period` (Fact 2 del modelo dimensional) — granularidad `(tool_id × member_id × period × client_id?)`
- Tabla `tool_catalog` enriquecida con `cost_model` (`subscription`, `per_credit`, `hybrid`, `included`), `unit_cost_clp`, `revenue_attribution_default`
- Materializer canónico que toma expenses + tool_assignments + payroll_allocations y produce `member_loaded_cost_per_period` (Fact 3) y `client_full_cost_per_period` (Fact 4)
- VIEW canónica que reemplaza la lógica scattered en `commercial_cost_attribution_v2`

## Why This Task Exists

El modelo actual tiene 3 problemas estructurales que MLCM_V1 resuelve:

1. **Gap conceptual**: el costo de una tool (ej. Adobe CC, Notion, Vercel) está conectado al expense pero no al member que la consume. El bridge `member_tool_consumption` es la ausencia más grande del modelo de costos hoy.
2. **Drift por re-derivación**: cada query downstream re-deriva "quién consumió qué" con SQL distinto. La VIEW canónica con CTE consolidada elimina la divergencia.
3. **Imposibilidad de Service P&L fully-loaded** (TASK-146): sin la dimensión `tool_id × member_id × period`, no hay forma defendible de atribuir costos de tools a servicios.

## Scope

### In scope

- Migración crear `tool_consumption_period` con FK a `tool_catalog`, `team_members`, `clients`, periodo `(year, month)`
- Migración enriquecer `tool_catalog` con `cost_model`, `unit_cost_clp`, `revenue_attribution_default`, `is_active`
- Materializer `materializeToolConsumptionPeriod(year, month)` que compone:
  - Expenses con `tool_id IS NOT NULL` (tool subscriptions, credits, license fees)
  - tool_assignments activos en el periodo (member roster por tool)
  - payroll_member_client_allocations del periodo (FTE del member por cliente)
- Idempotencia: re-run para mismo `(year, month)` reemplaza atomicamente vía transaction.
- Outbox event `cost_intelligence.tool_consumption.materialized` con `{periodYear, periodMonth, rowCount, coverage}`
- Reliability signal: % expenses con `tool_id` resueltos / total expenses con `expense_type='tool_subscription' OR cost_category='tooling'`. Threshold warning <90%.
- VIEW canónica `tool_consumption_period_consolidated` que aplica las dimensiones de `cost_dimension` (operating, tooling, financial) descritas en MLCM_V1 §2.
- Tests vitest:
  - paridad TS↔SQL del cost split (subscription / per_credit / hybrid / included)
  - idempotency contract para `materializeToolConsumptionPeriod`
  - coverage signal threshold

### Out of scope

- UI para assignar/desasignar tools a members (cubierto por TASK-711)
- Catálogo final de tools provisionado (cubierto por TASK-712)
- Period closing workflow (cubierto por TASK-713)
- Budget overlay (cubierto por TASK-395 / TASK-178)
- Service dimension (cubierto por TASK-146 — depende de esta task)

## Architecture Reference

Spec raíz: `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`

- §2 Modelo Dimensional (Fact 1, Fact 2, Fact 3, Fact 4)
- §3 Cost Models por Tool (subscription, per_credit, hybrid, included)
- §4 Overhead Distribution (cuando `client_id IS NULL` en tool_consumption)
- §11 Roadmap — Fase 2 Materializers

## Dependencies & Impact

### Depende de

- TASK-705 (cost-attribution rules) — ya completa, provee canonical mapping `expense → cost_category`
- Tabla `tool_catalog` — ya existe, requiere ALTER COLUMN
- Tabla `tool_assignments` — ya existe
- `payroll_member_client_allocations` — ya existe vía consolidated VIEW (TASK-709)

### Impacta a

- TASK-146 (Service P&L) — desbloquea cuando esta task cierra
- TASK-393 (period closing) — consume snapshot de Fact 3/4 que esta task produce
- TASK-176 (labor provisions) — alimenta el bucket `payroll_cost_clp` del Fact 3 que esta task materializa
- `commercial_cost_attribution_v2` VIEW — deprecada en favor del Fact 4 que esta task expone

### Archivos owned

- `migrations/<ts>_task-710-tool-consumption-bridge.sql`
- `migrations/<ts>_task-710-tool-catalog-enrichment.sql`
- `src/lib/cost-intelligence/tool-consumption-materializer.ts`
- `src/lib/cost-intelligence/tool-consumption-reader.ts`
- `src/lib/cost-intelligence/tool-consumption-materializer.test.ts`

## Acceptance Criteria

- `tool_consumption_period` materializado para mes corriente con coverage >90% expenses tool-related
- Reliability signal `cost_intelligence.tool_consumption.coverage` con threshold y route a Finance Data Quality subsystem
- VIEW `tool_consumption_period_consolidated` consumible desde Cost Intelligence panel actual sin breaking changes
- Tests passing: idempotency, paridad TS↔SQL, coverage threshold
- Outbox event registrado en `GREENHOUSE_EVENT_CATALOG_V1.md`
- Spec raíz actualizada con shape final de tabla materializada

## Notes

Esta es la task más estructural del programa MLCM_V1. Cualquier work derivado (Service P&L, partner P&L, BU P&L, budget overlay) depende de que esta materialización exista y sea confiable.
