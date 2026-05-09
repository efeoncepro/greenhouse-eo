# TASK-836 — Pre-backfill snapshot + plan de revert

> **Capturado:** 2026-05-09 (pre-Slice 6)
> **Owner:** TASK-836 implementación
> **Estado:** snapshot pre-migration documentado; apply pendiente de ejecución operativa

## Pre-snapshot (PG, antes del refactor del UPSERT)

### Distribución actual de services con HubSpot ID

```sql
SELECT pipeline_stage, status, active, engagement_kind, hubspot_sync_status, COUNT(*) AS n
FROM greenhouse_core.services
WHERE hubspot_service_id IS NOT NULL
GROUP BY 1,2,3,4,5
ORDER BY 1,2,3,4,5;
```

| pipeline_stage | status | active | engagement_kind | hubspot_sync_status | count |
|---|---|---|---|---|---|
| `active` | `active` | `true` | `regular` | `synced` | **6** |

### Distribución completa (incluye legacy archived)

| pipeline_stage | status | active | engagement_kind | n |
|---|---|---|---|---|
| `active` | `active` | `true` | `regular` | 6 |
| `active` | `legacy_seed_archived` | `false` | `discovery` | 30 |

**Total: 36 services. 6 con HubSpot ID, 30 legacy archived (TASK-813).**

### Reliability signals base (pre-migration)

| signalId | severity | count | observación |
|---|---|---|---|
| `commercial.service_engagement.sync_lag` | ok | 0 | sync al día |
| `commercial.service_engagement.organization_unresolved` | ok | 0 | sin orphans |
| `commercial.service_engagement.legacy_residual_reads` | ok | 0 | sin contaminación |
| `commercial.service_engagement.lifecycle_stage_unknown` | n/a (no creada aún) | — | post-Slice 7 = 0 esperado |
| `commercial.service_engagement.engagement_kind_unmapped` | n/a (no creada aún) | — | post-Slice 7 = 0 esperado |
| `commercial.service_engagement.renewed_stuck` | n/a (no creada aún) | — | post-Slice 7 = 0 esperado |
| `commercial.service_engagement.lineage_orphan` | n/a (no creada aún) | — | post-Slice 7 = 0 esperado |

### Schema base (post-Slice 2 migration)

- 32 columnas (30 originales + `unmapped_reason` + `parent_service_id`).
- 8 CHECK constraints (5 originales + `services_status_check` + `services_hubspot_sync_status_check` + `services_unmapped_reason_check`).
- 2 triggers: `services_engagement_requires_decision_before_120d` (TASK-810) + `services_lineage_protection_trigger` (TASK-836 Slice 2).
- 30 stages legacy_seed_archived intactos.

## Diff esperado post-apply (cuando operador ejecute backfill)

Cuando el operador ejecute `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/services/backfill-from-hubspot.ts --apply`:

### Para cada service ya materializado (6 services):

1. SELECT pre-UPSERT del estado actual (`active/active/regular`).
2. Mapper resuelve `hs_pipeline_stage` real desde HubSpot. Para los 6 services Globe activos en HubSpot, se espera que la mayoría queden en `pipeline_stage='active'`. Algunos podrían pasar a:
   - `pipeline_stage='renewal_pending'` si HubSpot los movió a "En renovación".
   - `pipeline_stage='closed', active=FALSE` si HubSpot los cerró.
3. Cascade preserva `engagement_kind='regular'` (caso 4 de la cascade — fila ya existe, regular por default histórico).
4. Outbox `lifecycle_changed v1` se emite SOLO para services cuyo stage real difiere del `'active'` hardcoded. Si los 6 quedan en `active`, el outbox se silencia (cero diff). Si alguno cambia, los consumers downstream (P&L, attribution) reaccionan.

### Para los 11 services HubSpot no materializados aún:

- Backfill los crea con `pipeline_stage` real desde HubSpot.
- Si están en `Closed`, nacen con `active=FALSE` directamente — NO contaminan P&L del período.
- Si linea_de_servicio no está poblada en HubSpot, quedan `unmapped` (signal `legacy_residual_reads` cubre).

### Reliability signals post-apply esperados:

- `lifecycle_stage_unknown` = 0 (mapper cubre los 6 stage IDs canónicos verificados).
- `engagement_kind_unmapped` = 0 hasta que el operador agregue Sample Sprints en stage `validation` (eso ocurre cuando ejecute el runbook + el wizard de TASK-837).
- `renewed_stuck` = 0 (sin services en stage `renewed` por > 60 días).
- `lineage_orphan` = 0 (ningún service tiene `parent_service_id` aún).
- `sync_lag` puede pasar a > 0 temporalmente durante el backfill; debe volver a 0 al finalizar.
- `legacy_residual_reads` no afectado (sigue 0).

## KPIs operativos sample (a capturar antes del apply)

> **Pendiente de ejecutar por operador con acceso runtime**:

```sql
-- 1. MRR/ARR mensual computado (3 clientes Globe + 3 Efeonce internos)
-- Pendiente: capturar el output de greenhouse_serving.commercial_cost_attribution_v2
-- por client_id para el último trimestre, antes y después del apply.

-- 2. ICO actual del cliente
-- Pendiente: capturar greenhouse_serving.ico_organization_metrics o equivalente.

-- 3. Cost attribution acumulado por service_id último trimestre
SELECT service_id, SUM(amount_clp) AS total_clp
FROM greenhouse_serving.commercial_cost_attribution_v2
WHERE service_id IS NOT NULL
  AND period_year = 2026
  AND period_month BETWEEN 3 AND 5
GROUP BY 1
ORDER BY total_clp DESC;
```

## Plan de revert (en caso de regresión post-apply)

### Cuándo activarlo

- Post-snapshot muestra services con `active TRUE → FALSE` en clientes activos comerciales.
- Reliability signals rojos fuera de lo esperado (e.g. `lifecycle_stage_unknown > 0` indica drift de configuración HubSpot vs código).
- Desviación > 5% en KPIs P&L mes corriente vs mes anterior.

### Procedimiento

1. **Capturar evidencia**:
   - Re-ejecutar las queries del pre-snapshot.
   - Diff completo `pre vs post`.
   - Lista de services específicos afectados.
   - Reliability signals rojos.

2. **Revert via outbox lifecycle_changed reverse** (NUNCA DELETE/UPDATE ad-hoc):
   - Por cada service afectado, emitir un evento `lifecycle_changed` reverse via el helper canónico:
     ```ts
     await publishOutboxEvent({
       aggregateType: 'service_engagement',
       aggregateId: serviceId,
       eventType: 'commercial.service_engagement.lifecycle_changed',
       payload: {
         version: 1,
         serviceId,
         hubspotServiceId,
         previousPipelineStage: nextValueAfterApply,
         nextPipelineStage: previousValueBeforeApply,
         previousActive: nextActiveAfterApply,
         nextActive: previousActiveBeforeApply,
         /* ... */
         triggeredBy: 'manual_command',
         occurredAt: new Date().toISOString()
       }
     })
     ```
   - Ejecutar `upsertServiceFromHubSpot` con los valores previos forzados (vía un wrapper que pasa el stage ID equivalente al previous).
   - Cada revert es atomic + outbox; los consumers downstream se materializan automáticamente.

3. **NO hacer**:
   - `UPDATE greenhouse_core.services SET active=TRUE WHERE...` directo.
   - `DELETE FROM greenhouse_core.services WHERE...`.
   - Cualquier mutación que no pase por `upsertServiceFromHubSpot()` o por el helper canónico.

### Helper revert recomendado (no implementado en V1, scope follow-up si necesario)

Si emerge necesidad real de revert masivo, implementar `scripts/services/revert-lifecycle-stage.ts` que:
- Toma input: lista de service_ids + pipeline_stage previo.
- Llama el UPSERT canónico con valores previous.
- Emite outbox `lifecycle_changed` con triggeredBy='manual_command_revert'.
- Idempotente.

## Decisión: cuándo ejecutar el apply

El apply de Slice 6 NO se ejecuta en esta sesión de implementación. Razones:

1. Requiere `HUBSPOT_ACCESS_TOKEN` con scope `crm.objects.custom.read` activo.
2. Es operación humana sobre producción real (PG mutación + outbox events emitidos a consumers downstream).
3. La spec explícitamente lista pre/post snapshots como entregable + plan de revert documentado, no la ejecución del apply.

El operador con acceso a runtime ejecuta:

```bash
# Pre-snapshot capturado arriba — ya documentado.

# Dry-run obligatorio (no muta PG):
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts

# Revisar dry-run output. Si OK:

# Apply idempotente:
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts --apply --create-missing-spaces

# Post-snapshot — ejecutar las mismas queries del pre-snapshot.
# Diff debe alinearse con `Diff esperado post-apply` arriba.
```

## Trazabilidad

- Spec: `docs/tasks/in-progress/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md`
- Migration: `migrations/20260509125228920_task-836-services-lifecycle-validation-stage-and-lineage-protection.sql`
- UPSERT refactor: `src/lib/services/upsert-service-from-hubspot.ts` (TASK-836 Slice 4)
- Backfill script: `scripts/services/backfill-from-hubspot.ts` (sin cambios — consume UPSERT canónico)
- Runbook HubSpot: `docs/operations/runbooks/hubspot-service-pipeline-config.md`
