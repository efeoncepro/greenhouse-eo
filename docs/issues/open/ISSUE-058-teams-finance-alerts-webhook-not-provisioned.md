# ISSUE-058 — Teams Finance Alerts webhook not provisioned in GCP Secret Manager

## Ambiente

staging + production

## Detectado

2026-04-26 — Reliability dashboard mostró `Teams Notifications` subsystem en `degraded · 1 failed` con notes `missing_secret: secret_ref=greenhouse-teams-finance-alerts-webhook` en `source_sync_runs`.

## Síntoma

- Channel `greenhouse-teams-finance-alerts-webhook` declarado en `greenhouse_core.teams_notification_channels` con `secret_ref='greenhouse-teams-finance-alerts-webhook'`.
- El secret correspondiente NO existe en GCP Secret Manager (`gcloud secrets describe ... → NOT_FOUND`).
- El sender intentaba el POST y fallaba en runtime, contaminando el subsystem failure metric.

## Causa raíz

El Azure Logic App que respaldaría este channel todavía no ha sido provisionado. La spec original (TASK-669) declara el contrato Bicep + Workflow pero el deploy a Azure (que crea el endpoint webhook real) no se ha ejecutado en `staging` ni en `production`. Mientras eso no pase, no hay URL real para subir como secret a GCP Secret Manager.

## Impacto

- **Bajo**: cualquier intento de alert al canal Finance se skipea, las alertas Finance no llegan a Teams (operacional, no afecta data).
- Dashboard reliability se contaminaba con falsos `degraded` hasta que se aplicó la mitigación estructural abajo.

## Solución (mitigación inmediata aplicada — 2026-04-26)

Migration `20260426162205347_add-teams-channel-readiness-flag.sql` introdujo el campo `provisioning_status TEXT IN ('ready','pending_setup','configured_but_failing')` en `greenhouse_core.teams_notification_channels`. El channel `greenhouse-teams-finance-alerts-webhook` quedó marcado `provisioning_status='pending_setup'`.

Efectos:

- El sender skipea silentemente cuando ve `pending_setup` — no más HTTP POSTs contra secret faltante.
- La query del dashboard Teams Notifications (`get-operations-overview.ts`) filtra `NOT EXISTS` para failures de runs cuyo `secret_ref` matchea un channel `pending_setup`. El subsystem queda `healthy`.
- El channel reaparecerá en el dashboard automáticamente apenas alguien flip a `'ready'` (que ocurre como parte del deploy real, ver siguiente paso).

## Solución completa (pendiente — bloquea por trabajo Azure)

Para que el canal entregue alerts reales:

1. Ejecutar el deploy Bicep de `infra/azure/teams-notifications/main.bicep` con `parameters.staging.json` (y luego `parameters.prod.json`). Crea el Azure Logic App + obtiene la URL HTTP trigger del workflow.
2. Subir esa URL a GCP Secret Manager: `printf %s "$LOGIC_APP_URL" | gcloud secrets create greenhouse-teams-finance-alerts-webhook --data-file=- --project=efeonce-group --replication-policy=automatic`.
3. Flip el channel:

   ```sql
   UPDATE greenhouse_core.teams_notification_channels
      SET provisioning_status = 'ready',
          provisioning_status_updated_at = NOW(),
          provisioning_status_reason = 'azure_logic_app_deployed_and_secret_published'
    WHERE secret_ref = 'greenhouse-teams-finance-alerts-webhook';
   ```

4. Smoke end-to-end: `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"finance-alerts"}'` debería terminar con HTTP 200 + post visible en el canal Teams.

## Verificación (mitigación aplicada)

```sql
SELECT secret_ref, provisioning_status, provisioning_status_reason
FROM greenhouse_core.teams_notification_channels
WHERE secret_ref = 'greenhouse-teams-finance-alerts-webhook';
-- Debe devolver: provisioning_status='pending_setup'
```

Reliability dashboard `Teams Notifications` debería estar en `healthy` (post-deploy del commit `4468a301`).

## Estado

open — mitigación aplicada, deploy Azure pendiente

## Relacionado

- TASK-669 — Teams Workflow Notifications Channel (Bicep + Logic App deploy infrastructure)
- Migration `20260426162205347_add-teams-channel-readiness-flag.sql`
- CLAUDE.md sección "Reliability dashboard hygiene" → regla #2 "Channel provisioning_status"
- AGENTS.md mismo handoff de patrones canónicos
