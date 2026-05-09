# Sample Sprint outbound recovery (TASK-837)

> **Tipo de documento:** Runbook operativo
> **Versión:** 1.0
> **Creado:** 2026-05-09 (TASK-837)
> **Spec arquitectural:** [GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1](../../architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md), [GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1](../../architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md)

Este runbook cubre los 6 escenarios operativos de la projection outbound de Sample Sprints (HubSpot `p_services` 0-162). Audiencia: operador comercial + operador HubSpot.

## Mapa de estados canónico (`services.hubspot_sync_status`)

```
outbound_pending  ──>  outbound_in_progress  ──>  ready
                              │                   │
                              ├──>  partial_associations  ──> (retry) ─> ready
                              │
                              └──>  outbound_dead_letter  ──> (humano) ─> ready
```

Estados pre-TASK-837 (TASK-813b inbound): `pending | synced | unmapped`. Coexisten en la misma columna pero los outbound y los inbound NUNCA se mezclan en el mismo flow.

---

## Escenario 1 — `outbound_pending_overdue`

**Síntoma**: Reliability signal `commercial.sample_sprint.outbound_pending_overdue` > 0. Sample Sprints declarados quedaron > 15 minutos sin proyectar a HubSpot.

**Causa probable**: Reactive consumer caído o backlog en Cloud Scheduler.

**Diagnóstico**:

```bash
# 1. Verificar Cloud Scheduler health
gcloud scheduler jobs describe ops-reactive-finance --location=us-east4 --project=efeonce-group

# 2. Verificar últimas runs del consumer
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ops-worker AND textPayload:sample_sprint_hubspot_outbound" --limit=20 --format=json

# 3. Verificar backlog en outbox
psql ... -c "SELECT COUNT(*) FROM greenhouse_sync.outbox_events WHERE event_type = 'service.engagement.outbound_requested' AND status = 'pending';"
```

**Resolución**:

1. Si el consumer está caído: `gcloud run services update ops-worker --region=us-east4` + retrigger del cron job.
2. Si el backlog es legítimo (volumen alto): aumentar concurrency del consumer dispatcher.
3. Si hay un service stuck: verificar el outbox event para ese service específico y forzar replay.

---

## Escenario 2 — `outbound_dead_letter`

**Síntoma**: Reliability signal `commercial.sample_sprint.outbound_dead_letter` > 0. Reactive consumer agotó retries (3) y no pudo proyectar el service a HubSpot.

**Causa probable**: bridge HubSpot caído de forma persistente, o token expirado, o validation error que no se autocorrige.

**Diagnóstico**:

```bash
# 1. Identificar services en dead-letter
psql ... -c "
  SELECT service_id, name, hubspot_deal_id, idempotency_key, updated_at
    FROM greenhouse_core.services
   WHERE hubspot_sync_status = 'outbound_dead_letter'
   ORDER BY updated_at DESC;
"

# 2. Buscar el último error capturado en Sentry
# Filtros Sentry: domain=integrations.hubspot, source=sample_sprint_outbound

# 3. Verificar bridge health
curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/health
```

**Resolución**:

- **V1**: dead-letter UX manual (Slice 5 pendiente). Operador con capability `commercial.engagement.recover_outbound` (FINANCE_ADMIN o EFEONCE_ADMIN) re-emite el outbox event vía endpoint admin (TODO TASK-837 Slice 5).
- **Workaround pre-Slice 5**: re-emitir manualmente el outbox event vía SQL (revisión cuidadosa requerida):

```sql
INSERT INTO greenhouse_sync.outbox_events
  (aggregate_type, aggregate_id, event_type, payload, status)
VALUES (
  'service',
  '<service_id>',
  'service.engagement.outbound_requested',
  jsonb_build_object(
    'version', 1,
    'serviceId', '<service_id>',
    'idempotencyKey', '<service_id>',
    'requestedAt', NOW()::text
  ),
  'pending'
);

UPDATE greenhouse_core.services
   SET hubspot_sync_status = 'outbound_pending'
 WHERE service_id = '<service_id>';
```

- Si el error es `HUBSPOT_VALIDATION` (422), corregir las properties del service o del Deal antes de reintentar.
- Si el error es persistente upstream: documentar en ISSUE-### + escalar a CESAR.

---

## Escenario 3 — `partial_associations`

**Síntoma**: Reliability signal `commercial.sample_sprint.partial_associations` > 0. Service creado en HubSpot pero alguna asociación (Deal/Company/Contact) falló.

**Causa probable**: Race condition en HubSpot (e.g. Contact eliminado entre Deal-fetch y service-create), o rate limit transitorio.

**Diagnóstico**:

```bash
# Identificar services partial
psql ... -c "
  SELECT service_id, hubspot_service_id, hubspot_deal_id, updated_at,
         commitment_terms_json->'hubspotDealContext' AS deal_ctx
    FROM greenhouse_core.services
   WHERE hubspot_sync_status = 'partial_associations';
"
```

**Resolución**:

- El reactive consumer reintenta automáticamente en el siguiente ciclo. Re-correr el service idempotency-skipea el create y solo retry asociaciones faltantes.
- Si después de 3 retries sigue partial → cae a dead-letter (Escenario 2).
- Para forzar retry inmediato: re-emitir outbox event (mismo SQL que Escenario 2).

---

## Escenario 4 — `deal_closed_but_active`

**Síntoma**: Reliability signal `commercial.sample_sprint.deal_closed_but_active` > 0. Sample Sprint sigue activo pero el Deal HubSpot ya fue cerrado (won/lost).

**Causa probable**: Operador comercial cerró el Deal en HubSpot sin coordinar con el Sample Sprint correspondiente.

**Diagnóstico**:

```bash
psql ... -c "
  SELECT s.service_id, s.name, s.hubspot_deal_id, d.dealname, d.is_won, d.dealstage_label
    FROM greenhouse_core.services s
    JOIN greenhouse_commercial.deals d ON d.hubspot_deal_id = s.hubspot_deal_id
   WHERE s.engagement_kind != 'regular'
     AND s.hubspot_sync_status = 'ready' AND s.status = 'active'
     AND d.is_closed = TRUE AND d.is_deleted = FALSE;
"
```

**Resolución (operador comercial)**:

1. **Si el Sample Sprint convirtió a cliente**: registrar outcome `converted` en Greenhouse vía UI (`/agency/sample-sprints/<id>`).
2. **Si no convirtió**: registrar outcome `cancelled` o `dropped`.
3. **Si el Deal se cerró por error**: reabrir el Deal en HubSpot (lifecycle: cambiar stage de vuelta).

---

## Escenario 5 — `deal_associations_drift`

**Síntoma**: Reliability signal `commercial.sample_sprint.deal_associations_drift` > 0. El Deal HubSpot perdió su company link después de que el Sample Sprint se proyectó.

**Causa probable**: Operador HubSpot eliminó la company association del Deal.

**Diagnóstico (V1, PG-only proxy)**:

```bash
psql ... -c "
  SELECT s.service_id, s.hubspot_deal_id, d.dealname
    FROM greenhouse_core.services s
    JOIN greenhouse_commercial.deals d ON d.hubspot_deal_id = s.hubspot_deal_id
   WHERE s.engagement_kind != 'regular'
     AND s.hubspot_sync_status IN ('ready', 'partial_associations')
     AND s.status = 'active'
     AND d.client_id IS NULL AND d.is_deleted = FALSE;
"
```

**Resolución**:

1. Verificar manualmente en HubSpot UI si el Deal tiene una company asociada. Si no: re-asociar.
2. Después del próximo cron sync (4h), `d.client_id` se repuebla y la signal vuelve a 0.
3. **V1.1 follow-up**: poll HubSpot associations live para detección más precisa (queue task derivada).

---

## Escenario 6 — `outcome_terminal_pservices_open`

**Síntoma**: Reliability signal `commercial.sample_sprint.outcome_terminal_pservices_open` > 0. Sample Sprint con outcome `converted | cancelled | dropped` registrado en Greenhouse pero el `p_services` HubSpot sigue en stage `Validación / Sample Sprint`.

**Causa probable**: V1 no automatiza el cierre HubSpot — operador HubSpot debe mover manualmente.

**Diagnóstico**:

```bash
psql ... -c "
  SELECT s.service_id, s.hubspot_service_id, s.name, oc.outcome_kind, s.pipeline_stage
    FROM greenhouse_core.services s
    JOIN greenhouse_commercial.engagement_outcomes oc ON oc.service_id = s.service_id
   WHERE s.engagement_kind != 'regular'
     AND s.hubspot_sync_status = 'ready'
     AND oc.outcome_kind IN ('converted', 'cancelled', 'dropped')
     AND s.pipeline_stage = 'validation';
"
```

**Resolución (operador HubSpot, V1 manual)**:

1. Por cada service listado, abrir HubSpot UI → buscar el `p_services` por `hubspot_service_id`.
2. Mover stage de "Validación / Sample Sprint" a "Closed" (HubSpot Service Pipeline).
3. Después del próximo webhook eco, el inbound projection actualiza `services.pipeline_stage='closed'` y la signal baja a 0.

**V1.1 follow-up**: automatizar este cierre desde un reactive consumer escuchando `service.engagement.outcome_recorded v1` (queue task derivada).

---

## Escenario 7 — `legacy_without_deal`

**Síntoma**: Reliability signal `commercial.sample_sprint.legacy_without_deal` > 0. Sample Sprints declarados antes de TASK-837 sin `hubspot_deal_id`.

**Causa probable**: Datos históricos pre-TASK-837 (la task introdujo `hubspotDealId` como required en `declareSampleSprint`).

**Diagnóstico**:

```bash
psql ... -c "
  SELECT service_id, name, engagement_kind, created_at, space_id, organization_id
    FROM greenhouse_core.services
   WHERE engagement_kind != 'regular'
     AND status = 'active'
     AND hubspot_deal_id IS NULL
   ORDER BY created_at DESC;
"
```

**Resolución (operador comercial)**:

Para cada Sample Sprint legacy, decidir:

1. **Vincular Deal existente**: si existe un Deal HubSpot que comercialmente corresponde, hacer:
   ```sql
   UPDATE greenhouse_core.services
      SET hubspot_deal_id = '<deal_id>',
          idempotency_key = service_id,
          hubspot_sync_status = 'outbound_pending',
          updated_at = CURRENT_TIMESTAMP
    WHERE service_id = '<service_id>';

   -- Re-emit outbox event
   INSERT INTO greenhouse_sync.outbox_events ...; -- (mismo SQL Escenario 2)
   ```

2. **Declarar como pre-existing legacy**: si no hay Deal correspondiente y no se quiere proyectar a HubSpot, marcar:
   ```sql
   UPDATE greenhouse_core.services
      SET hubspot_sync_status = 'unmapped',  -- legacy semantic
          updated_at = CURRENT_TIMESTAMP
    WHERE service_id = '<service_id>';
   ```

3. **Cerrar el Sample Sprint**: si era data basura, registrar outcome `dropped` vía UI.

**NUNCA** inventar un Deal retroactivamente para forzar el match — eso introduce datos comerciales falsos en HubSpot.

---

## Operador-facing — Decision tree rápido

| Signal en alerta | Acción inmediata | Owner |
|---|---|---|
| `outbound_pending_overdue` | Verificar Cloud Run health + cron | DevOps / Platform |
| `outbound_dead_letter` | Verificar Sentry + reintento manual | Platform + Comercial |
| `partial_associations` | Esperar retry automático (4h) | Auto-resolves |
| `deal_closed_but_active` | Registrar outcome o reabrir Deal | Comercial |
| `deal_associations_drift` | Re-asociar company en HubSpot | Comercial / HubSpot ops |
| `outcome_terminal_pservices_open` | Mover stage HubSpot manual | HubSpot ops |
| `legacy_without_deal` | Decisión caso-por-caso | Comercial |

---

## Verificación post-recovery

Después de cualquier acción correctiva:

```bash
# 1. Verificar que el signal volvió a steady=0
curl -H "Authorization: Bearer <agent_token>" \
  https://greenhouse.efeoncepro.com/api/admin/operations | jq '.commercialHealth'

# 2. Verificar end-to-end con un service específico
psql ... -c "SELECT hubspot_sync_status, hubspot_service_id FROM greenhouse_core.services WHERE service_id = '<id>';"

# 3. Verificar HubSpot read-back
curl -H "Authorization: Bearer <hubspot_token>" \
  "https://api.hubapi.com/crm/v3/objects/0-162/<hubspot_service_id>?properties=hs_pipeline_stage,ef_engagement_kind,ef_greenhouse_service_id"
```

Esperado: `hubspot_sync_status='ready'`, `hubspot_service_id` populated, HubSpot returns 200 con properties correctas.

---

## Hard Rules (canonizadas en CLAUDE.md)

Ver sección `### Sample Sprint outbound projection invariants (TASK-837)` en CLAUDE.md para las 18 reglas duras anti-regresión.
