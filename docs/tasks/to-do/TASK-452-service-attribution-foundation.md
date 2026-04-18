# TASK-452 - Service Attribution Foundation

## Metadata
- **Task ID:** TASK-452
- **Type:** implementation
- **Priority:** P1
- **Severity:** High
- **Owner:** Codex
- **Status:** to-do
- **Area:** data
- **Repos:** starter-kit
- **Dependencies:** greenhouse_core.services, greenhouse_finance.income, greenhouse_finance.expenses, greenhouse_finance.cost_allocations, greenhouse_serving.commercial_cost_attribution, greenhouse_serving.operational_pl_snapshots, src/lib/cost-intelligence/compute-operational-pl.ts, src/lib/sync/projections/operational-pl.ts
- **Blocks:** TASK-146, TASK-147, TASK-351
- **Branch Name:** task/TASK-452-service-attribution-foundation
- **Effort:** Alto
- **Impact:** Alto

## Summary
Crear la capa canonica que atribuye revenue, direct cost y labor/overhead a `service_id` dentro de cada `space_id`, de modo que Greenhouse pueda materializar P&L por servicio sin heuristicas opacas ni calculos inline en UI.

## Background
El audit de `TASK-146` confirmó que el runtime actual solo materializa economics a nivel `client`, `space` y `organization` sobre `greenhouse_serving.operational_pl_snapshots`. No existe hoy una tabla, proyeccion ni contrato canonico que responda estas preguntas por `service_id`:

- que ingresos pertenecen a cada servicio;
- que costos directos pertenecen a cada servicio;
- que costo laboral / overhead pertenece a cada servicio;
- con que evidencia y nivel de confianza se hizo esa asignacion;
- que filas quedan sin resolver y requieren remediacion.

Aunque existen señales parciales (`service_line`, `hubspot_deal_id`, `client_id`, `space_id`, `commercial_cost_attribution`, `services.total_cost`, `services.amount_paid`), ninguna de ellas es hoy un `service_id` canonico y auditable de punta a punta. Implementar `service_economics` encima del estado actual fabricaria margen por servicio a partir de joins ambiguos.

Esta task crea la fundacion para que `TASK-146` pueda construir `greenhouse_serving.service_economics` sobre hechos confiables, idempotentes y tenant-safe.

## Desired Outcome
Al cerrar esta task, el sistema debe poder responder de forma trazable y reproducible:

1. que montos de revenue se atribuyen a cada `service_id` y por que;
2. que montos de direct cost se atribuyen a cada `service_id` y por que;
3. que montos de labor / overhead se atribuyen a cada `service_id` y por que;
4. que casos siguen sin resolver, con visibilidad suficiente para remediarlos;
5. que eventos o materializaciones deben recalcular servicio-periodo cuando cambia la data upstream.

## Scope
### In scope
- Diseñar el contrato canonico de atribucion por servicio con `space_id` como aislamiento de tenant.
- Crear el storage y/o projection fact table donde vivan las atribuciones por servicio y periodo.
- Implementar resolvers que intenten ligar fuentes financieras/comerciales a `service_id` con evidencia auditable.
- Persistir `source_domain`, `source_type`, `source_id`, `amount_kind`, `amount`, `attribution_method`, `confidence` y metadata de evidencia.
- Definir el tratamiento de casos ambiguos o sin resolucion, sin inventar asignaciones.
- Conectar la materializacion al pipeline reactivo existente o a un materializer dedicado idempotente.
- Dejar contratos reutilizables para que `TASK-146` pueda construir `service_economics` sin recalcular joins complejos en runtime.
- Actualizar arquitectura y documentacion del dominio.

### Out of scope
- Implementar la tabla final `greenhouse_serving.service_economics`.
- Implementar `GET /api/agency/services/[serviceId]/economics`.
- Cambios UI en Economics, Space 360 o service detail.
- Crear un backoffice completo de overrides manuales, salvo que resulte estrictamente necesario como mecanismo minimo de remediacion.

## Architecture Alignment
Documentos a revisar y actualizar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
- `docs/documentation/finance/` o documentacion funcional equivalente si cambia la explicacion operativa del dominio

Planos afectados:

- **Views:** ninguno directo en esta task; se trata de fundacion de datos.
- **Entitlements / capabilities:** ninguno nuevo salvo que se agregue una surface minima de remediacion manual en una task posterior.

## Constraints
- Toda query y toda fila persistida debe conservar `space_id`.
- `service_id` es el ancla canonica. `service_line` puede ser evidencia, nunca identidad suficiente por si sola cuando existe ambiguedad.
- No calcular rentabilidad final en UI.
- Reutilizar `getDb`, `query`, `withTransaction`; nunca crear `new Pool()`.
- Modulos nuevos de acceso a datos deben usar Kysely via `const db = await getDb()`.
- Mantener domain-per-schema; evitar tablas nuevas fuera del schema correcto.
- Las materializaciones deben ser idempotentes y re-ejecutables por periodo.
- Los casos ambiguos deben quedar marcados como `unresolved` o equivalente; no asignarlos arbitrariamente.

## Proposed Deliverables
1. Migracion para tabla(s) de atribucion por servicio y sus indices.
2. Tipos / contratos de dominio para attribution facts y unresolved cases.
3. Resolver backend que proyecte fuentes de finance/commercial a `service_id`.
4. Materializer o projection hook para recalcular por `space_id + period`.
5. Reporte o consulta reutilizable de filas no atribuidas / ambiguas.
6. Actualizacion documental que deje claro como nace `service-level P&L`.

## Acceptance Criteria
- Existe una fuente canonica persistida para attribution facts por `service_id`.
- Cada attribution fact conserva `space_id`, `service_id`, periodo, monto, tipo de monto y referencia al origen.
- El sistema distingue explicitamente `revenue`, `direct_cost`, `labor_cost` y `overhead_cost` (o categorias equivalentes justificadas).
- El motor no usa `service_line` como match automatico cuando mas de un servicio compite por la misma señal.
- Las filas sin asignacion quedan registradas con causa y evidencia suficiente para remediacion.
- La materializacion es idempotente.
- `TASK-146` queda desbloqueada a nivel de contrato de datos aunque su API/UI siga pendiente.
- La arquitectura y documentacion del dominio quedan actualizadas.

## Implementation Notes
- Evaluar si la tabla vive mejor en `greenhouse_serving` como fact table transversal o en otro schema del dominio economico, pero dejar una decision explicita y justificada.
- Priorizar joins canonicos fuertes en este orden, segun disponibilidad real:
  1. `service_id` directo;
  2. puentes documentales canonicos ya implementados;
  3. `hubspot_deal_id` o referencias comerciales equivalentes;
  4. señales blandas (`service_line`, labels) solo cuando el match sea univoco dentro de `space_id`.
- Si una fuente upstream todavia no entrega suficiente granularidad, registrarla como `unresolved` en vez de inventar atribucion.

## Verification
- `pnpm lint`
- `pnpm build` o `pnpm tsc --noEmit`
- tests unitarios para resolvers/materializer
- `pnpm migrate:up` si hay migraciones
- verificacion de que no se introdujo ningun `new Pool()` fuera de `src/lib/postgres/client.ts`

## Rollout / Follow-up
- `TASK-146` debe cambiar su implementacion para consumir esta fundacion y materializar `service_economics`.
- `TASK-147` puede reaprovechar el mismo contrato si necesita puentes campaign-service con impacto economico.
- Si la remediacion manual resulta necesaria, abrir task separada para una surface operativa y audit trail de overrides.
