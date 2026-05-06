# Manual de uso — Sincronización HubSpot p_services

## Para qué sirve

HubSpot tiene un custom object `p_services` (objectTypeId `0-162`) donde sales registra cada servicio firmado/activo de un cliente. Greenhouse necesita estos datos para attribution P&L, ICO, dashboards comerciales y materialización de engagements. TASK-813 cerró el bucle: ahora el sync ocurre automático.

## Antes de empezar

- HubSpot Developer Portal access para configurar webhook (one-time setup operacional).
- Acceso GCP Secret Manager para verificar `hubspot-access-token` y `hubspot-app-client-secret`.
- `pnpm pg:connect:status` debe estar OK localmente para diagnósticos.

## Paso a paso — setup inicial (one-time)

### 1. Confirmar webhook endpoint registrado

```sql
SELECT endpoint_key, auth_mode, secret_ref, active
FROM greenhouse_sync.webhook_endpoints
WHERE endpoint_key = 'hubspot-services';
```

Esperado: 1 fila con `auth_mode='provider_native'`, `secret_ref='HUBSPOT_APP_CLIENT_SECRET'`, `active=true`.

### 2. Configurar suscripción en HubSpot Developer Portal

1. Login en `developers.hubspot.com/apps`.
2. App "Greenhouse Bridge" → Webhooks.
3. Create subscription:
   - Event: `p_services.creation` + `p_services.propertyChange`
   - Target URL: `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-services`
   - Signature method: v3
4. Activar la suscripción.

### 3. Backfill inicial (recomendado, idempotente)

```bash
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts --apply --create-missing-spaces
```

Reporta: created/updated/skipped por client + spaces auto-creados + errors.

### 4. Verificar

```sql
SELECT hubspot_service_id, name, hubspot_sync_status, hubspot_last_synced_at
FROM greenhouse_core.services
WHERE hubspot_service_id IS NOT NULL
ORDER BY hubspot_last_synced_at DESC;
```

## Estados / señales

| `hubspot_sync_status` | Qué significa | Acción |
|---|---|---|
| `synced` | OK, datos completos | Ninguna |
| `unmapped` | `ef_linea_de_servicio` NULL en HubSpot | Operador completa propiedad en HubSpot |
| `pending` | Legacy seed pre-TASK-813 | Ninguna (archivado en `legacy_seed_archived`) |

## Qué NO hacer

- **NO** ejecutar el archive-legacy-seed.ts en producción sin entender qué archiva. Es one-shot para las 30 filas seedeadas el 2026-03-16.
- **NO** matchear services por nombre (colisión real demostrada).
- **NO** modificar `core.services` directo via SQL — toda escritura pasa por el sync.
- **NO** sincronizar Greenhouse → HubSpot. Solo back-fill de propiedades `ef_*` está permitido (V1.1 follow-up).

## Problemas comunes

### Webhook no llega

```bash
# Verificar últimos eventos recibidos
pnpm pg:connect:shell <<EOF
SELECT received_at, status, error_message
FROM greenhouse_sync.webhook_inbox_events
WHERE webhook_endpoint_id = (
  SELECT webhook_endpoint_id FROM greenhouse_sync.webhook_endpoints
  WHERE endpoint_key = 'hubspot-services'
)
ORDER BY received_at DESC LIMIT 10;
EOF
```

Si no hay rows: HubSpot no está enviando. Revisar suscripción Developer Portal.

### Signature validation failed

Secret rotado pero no actualizado. Verificar `HUBSPOT_APP_CLIENT_SECRET` en GCP Secret Manager y app HubSpot.

### Service huérfano (organization_unresolved)

Aparece en `/admin/operations` como reliability signal `commercial.service_engagement.organization_unresolved`. Endpoint admin para listar:

```bash
pnpm staging:request /api/admin/integrations/hubspot/orphan-services
```

Operador comercial decide:
- Crear client en Greenhouse via UI Admin Tenants
- O archivar service en HubSpot (era basura)

### Sync stale (>24h)

Reliability signal `commercial.service_engagement.sync_lag`. Causas:
- Webhook caído → revisar Developer Portal
- Cron Cloud Scheduler caído → `gcloud scheduler jobs describe ops-hubspot-services-sync --location=us-east4 --project=efeonce-group`
- Secret rotado sin redeploy

## Referencias técnicas

- Spec: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- CLAUDE.md sección "HubSpot inbound webhook — p_services (0-162)"
- Code paths:
  - Webhook handler: `src/lib/webhooks/handlers/hubspot-services.ts`
  - Backfill script: `scripts/services/backfill-from-hubspot.ts`
  - Archive script: `scripts/services/archive-legacy-seed.ts`
  - HubSpot direct API helper: `src/lib/hubspot/list-services-for-company.ts`
  - Reliability readers: `src/lib/reliability/queries/services-*.ts`
  - Cloud Scheduler cron: `services/ops-worker/server.ts:handleHubspotServicesSync`
