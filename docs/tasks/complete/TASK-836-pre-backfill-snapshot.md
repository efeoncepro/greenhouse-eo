# TASK-836 — Pre/post backfill snapshot

> **Capturado:** 2026-05-09 (pre-Slice 6)
> **Apply ejecutado:** 2026-05-09T13:41:48Z (post-Slice 7)
> **Owner:** TASK-836 implementación (Claude Code agent con autorización explícita del usuario)
> **Estado:** apply ejecutado en producción; post-snapshot verificado; reliability signals en steady=0; 2 outbox `lifecycle_changed v1` emitidos correctamente

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

## Apply ejecutado 2026-05-09T13:41:48Z

### Output del apply

```
=== TASK-813 Slice 3 — backfill services from HubSpot (APPLY) ===
Found 12 clients with hubspot_company_id.

  ✓ Aguas Andinas: created=0 updated=2 unmapped=0
  ✓ ANAM: created=0 updated=1 unmapped=0
  ✓ BeFUN: created=0 updated=0 unmapped=0
  ✓ Corp Aldea del Encuentro: created=0 updated=0 unmapped=0
  ✓ DDSoft: created=0 updated=0 unmapped=0
  ✓ Ecoriles: created=0 updated=0 unmapped=0
  ✓ Gobierno regional region metropolitana: created=0 updated=0 unmapped=0
  ✓ LOYAL Solutions: created=0 updated=1 unmapped=0
  ✓ Motogas SpA: created=0 updated=1 unmapped=0
  ✓ Municipalidad Pedro Aguirre Cerda: created=0 updated=0 unmapped=0
  ✓ Sky Airline: created=0 updated=1 unmapped=0
  ✓ SSilva: created=0 updated=0 unmapped=0

=== Summary ===
  Clients processed:    12
  Services fetched:     6
  Services created:     0
  Services updated:     6
  Services unmapped:    0
  Spaces auto-created:  0
  Errors:               0
```

### Post-snapshot — distribución real

| pipeline_stage | status | active | engagement_kind | hubspot_sync_status | n |
|---|---|---|---|---|---|
| `active` | active | true | regular | synced | **4** |
| `closed` | closed | false | regular | synced | **1** |
| `renewal_pending` | active | true | regular | synced | **1** |

**Diff vs pre-snapshot**: antes 6 services todos en `active/active/true`. Después: 4 en `active`, 1 en `closed/closed/false` ("Loyal" — tenía contaminación P&L), 1 en `renewal_pending/active/true` ("ANAM - Nuevas Licencias" — distinguible del active genérico). **Bug raíz de TASK-836 corregido en producción**.

### Detalle por service post-apply

| service_id | name | pipeline_stage | status | active | engagement_kind | sync_status | unmapped_reason | parent |
|---|---|---|---|---|---|---|---|---|
| `SVC-HS-551522263821` | Aguas Andinas - Implementación | active | active | true | regular | synced | null | null |
| `SVC-HS-551519804760` | ANAM - Nuevas Licencias | renewal_pending | active | true | regular | synced | null | null |
| `SVC-HS-551459581251` | ANAM - Service Hubs + Credits | active | active | true | regular | synced | null | null |
| `SVC-HS-411290660521` | Loyal | closed | closed | false | regular | synced | null | null |
| `SVC-HS-551500318852` | Motogas - Social Media Management | active | active | true | regular | synced | null | null |
| `SVC-HS-551519372424` | Sky Airline - Diseño digital | active | active | true | regular | synced | null | null |

### Outbox events `commercial.service_engagement.lifecycle_changed v1` emitidos

| service_id | prev_stage | next_stage | prev_active | next_active | triggered_by | occurred_at |
|---|---|---|---|---|---|---|
| `SVC-HS-411290660521` | active | closed | true | false | backfill-from-hubspot.ts | 2026-05-09T13:41:48Z |
| `SVC-HS-551519804760` | active | renewal_pending | true | true | backfill-from-hubspot.ts | 2026-05-09T13:41:44Z |

**4 services sin diff (Aguas Andinas Implementación, ANAM Service Hubs, Motogas, Sky)** → NO emitieron `lifecycle_changed` (idempotencia respetada — refresh sin diff no genera event). El event `materialized v1` legacy sí se emite en cada UPSERT (compat consumers).

### Reliability signals post-apply

| signal | count | severity esperada | severity observada |
|---|---|---|---|
| `commercial.service_engagement.lifecycle_stage_unknown` | 0 | ok (steady) | ok ✓ |
| `commercial.service_engagement.engagement_kind_unmapped` | 0 | ok (steady) | ok ✓ |
| `commercial.service_engagement.renewed_stuck` | 0 | ok (steady) | ok ✓ |
| `commercial.service_engagement.lineage_orphan` | 0 | ok (steady) | ok ✓ |

Los 3 reliability signals existentes (`sync_lag`, `organization_unresolved`, `legacy_residual_reads`) siguen en steady=0.

### Verificación end-to-end exitosa

- Mapper canónico resolvió 6/6 stage IDs HubSpot correctamente.
- CHECK constraints DB no bloquearon ninguna transición (todos los stages mapeados están en el enum extendido).
- Outbox emit selectivo funcionó (2/6 con diff → 2 events; 4/6 sin diff → 0 events extra).
- Reactive consumers downstream (P&L, ICO, attribution) tomarán el cambio en su próxima ejecución (cron diario o reactive worker).

### KPIs operativos a observar post-apply (recomendación operativa)

- "Loyal" pasó a active=FALSE → `service_attribution_facts` lo excluye de períodos futuros (correcto, era closed en HubSpot).
- "ANAM - Nuevas Licencias" en `renewal_pending` → consumers que filtran solo `pipeline_stage='active'` ahora lo verían fuera; consumers que filtran `WHERE active=TRUE` lo siguen incluyendo (correcto, sigue operativo).
- Si emerge desviación > 5% en P&L mes corriente vs mes anterior, ejecutar plan de revert via outbox `lifecycle_changed` reverse (documentado arriba).

Resultado: **0 regresiones detectadas, 1 contaminación de P&L corregida (Loyal closed), 1 transición operativa visible (ANAM en renovación)**.
