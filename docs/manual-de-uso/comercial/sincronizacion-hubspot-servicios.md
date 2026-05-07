# Manual de uso — Sincronización HubSpot p_services

> **Tipo de documento:** Manual operativo paso-a-paso
> **Version:** 2.0
> **Creado:** 2026-05-06 por TASK-813
> **Ultima actualizacion:** 2026-05-07 por TASK-813 (post-merge a main + alto detalle)
> **Documentacion funcional:** `docs/documentation/comercial/servicios-engagement.md`
> **Spec técnica:** `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`

## Para qué sirve

HubSpot tiene un custom object `p_services` (objectTypeId `0-162`) donde sales registra cada servicio firmado/activo de un cliente. Greenhouse necesita estos datos para:

- Attribution P&L per-cliente (Finance)
- Métricas ICO (Inversión, Capacidad Operativa)
- Dashboards comerciales (Pulse, MRR/ARR)
- Materialización de Member Loaded Cost (TASK-710-713)
- Cost Attribution per-cliente-per-período (TASK-708/709)

TASK-813 cerró el bucle: ahora el sync ocurre **automático en tiempo real** cuando sales toca un service en HubSpot. Antes había 30 filas seedeadas el 2026-03-16 que no representaban nada real, y los services HubSpot reales nunca llegaban a Greenhouse.

## Antes de empezar

### Permisos requeridos

| Acción | Permiso necesario |
|---|---|
| Operar el sync día a día | `efeonce_admin` o route_group `commercial` |
| Reconfigurar webhook | HubSpot Developer Portal admin |
| Rotar secret HubSpot | GCP Secret Manager IAM `roles/secretmanager.secretVersionManager` |
| Ejecutar backfill manual | Acceso `gcloud` con SA tenant `efeonce-group` |

### Herramientas locales

- `pnpm pg:connect:status` debe estar OK localmente para diagnósticos.
- `gcloud auth login` + `gcloud auth application-default login` ambos vigentes (regla operativa CLAUDE.md).
- `gh` CLI autenticado para consultar workflow runs.

### Verificar que el sistema esté arriba

```bash
# 1. Reliability signals comerciales
pnpm staging:request /api/admin/operations | jq '.subsystems[] | select(.name == "Commercial Health")'

# 2. Last cron run del ops-worker
gcloud scheduler jobs describe ops-hubspot-services-sync \
  --location=us-east4 --project=efeonce-group --format=json | jq '.lastAttemptTime, .state'

# 3. Webhook endpoint registrado
pnpm pg:connect:shell <<'EOF'
SELECT endpoint_key, auth_mode, secret_ref, active
FROM greenhouse_sync.webhook_endpoints
WHERE endpoint_key = 'hubspot-services';
EOF
```

Esperado del último query: 1 fila con `auth_mode='provider_native'`, `secret_ref='HUBSPOT_APP_CLIENT_SECRET'`, `active=true`.

---

## Setup inicial (one-time, ya completado para Greenhouse)

Esta sección documenta el setup que TASK-813 ya ejecutó. Solo se vuelve relevante si:

- Se levanta un environment nuevo (otro tenant Greenhouse, sandbox)
- Se rota el secret HubSpot
- Se debe explicar a un agente nuevo cómo está configurado

### 1. App HubSpot Developer Portal

App canónica: **Greenhouse Bridge** (`developers.hubspot.com/apps`).

Webhook subscription configurada en `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/src/app/webhooks/webhooks-hsmeta.json`. La app HubSpot solo permite **1 componente webhooks por proyecto**, así que tanto companies como p_services se suscriben en el mismo target URL `hubspot-companies` y el handler internamente delega service events.

Eventos suscritos para p_services (`objectType: "service"` — nombre canónico HubSpot):

- `service.creation`
- `service.deletion`
- `service.propertyChange` × 10 propiedades (ef_linea_de_servicio, hs_name, hs_pipeline_stage, etc.)

Target URL del webhook: `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies` (path único).

### 2. Secrets en GCP Secret Manager

| Secret ID | Para qué |
|---|---|
| `hubspot-access-token` | Bearer token para fetch HubSpot API directo |
| `hubspot-app-client-secret` | HMAC-SHA256 secret para validar firma webhooks v3 |

Variables Vercel (production + staging):

| Var | Valor |
|---|---|
| `HUBSPOT_ACCESS_TOKEN_SECRET_REF` | `hubspot-access-token` |
| `HUBSPOT_APP_CLIENT_SECRET_SECRET_REF` | `hubspot-app-client-secret` |

### 3. Backfill inicial idempotente

```bash
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts --apply --create-missing-spaces
```

Reporta: `created/updated/skipped` por client + `spacesAutoCreated[]` + `errors[]`.

### 4. Cloud Scheduler cron diario (safety net)

```bash
gcloud scheduler jobs describe ops-hubspot-services-sync \
  --location=us-east4 --project=efeonce-group
```

Schedule canónico: `0 6 * * *` America/Santiago. Ejecuta el mismo `backfill-from-hubspot.ts --apply` vía endpoint `/hubspot-services/sync` del ops-worker. Idempotente.

---

## Operaciones diarias

### Verificar estado actual del sync

```bash
pnpm pg:connect:shell <<'EOF'
SELECT
  hubspot_sync_status,
  COUNT(*) AS total,
  MAX(hubspot_last_synced_at) AS last_sync
FROM greenhouse_core.services
WHERE hubspot_service_id IS NOT NULL
GROUP BY hubspot_sync_status
ORDER BY 2 DESC;
EOF
```

Salida esperada:

| `hubspot_sync_status` | total | last_sync |
|---|---|---|
| `synced` | ~13 | reciente |
| `unmapped` | ~3 | reciente |
| (filas archivadas con `active=FALSE`) | 30 | 2026-03-16 (legacy) |

### Listar services huérfanos (organization_unresolved)

```bash
pnpm staging:request /api/admin/integrations/hubspot/orphan-services
```

Output: lista de `webhook_inbox_events` con `error_message LIKE 'organization_unresolved:%'`. Cada fila incluye `hubspot_company_id` y `hubspot_service_id` para que el operador comercial decida.

### Verificar últimos webhooks recibidos

```sql
SELECT
  received_at,
  status,
  error_message,
  payload_json->'subscriptionType' AS event_type,
  payload_json->'objectId' AS hubspot_object_id
FROM greenhouse_sync.webhook_inbox_events
WHERE webhook_endpoint_id = (
  SELECT webhook_endpoint_id FROM greenhouse_sync.webhook_endpoints
  WHERE endpoint_key = 'hubspot-services'
)
ORDER BY received_at DESC LIMIT 20;
```

### Forzar un sync manual ad-hoc

Cuando se necesita drenar un cambio HubSpot inmediatamente sin esperar webhook (ej. testing post-deploy):

```bash
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts --apply
```

Sin `--apply` corre dry-run y reporta qué cambiaría.

### Re-clasificar un service que quedó `unmapped`

1. Operador comercial entra a HubSpot.
2. Abre el p_services específico.
3. Completa la propiedad `ef_linea_de_servicio` con uno de los valores canónicos: `globe`, `wave`, `crm_solutions`, `agencia_creativa`, `procurement`, etc.
4. Guarda. HubSpot envía webhook `service.propertyChange` automáticamente.
5. Greenhouse re-clasifica en < 10s. El status flip-ea a `synced`.

---

## Estados y señales

### `hubspot_sync_status` values canónicos

| Valor | Qué significa | Acción operador |
|---|---|---|
| `synced` | OK, datos completos, downstream consume | Ninguna |
| `unmapped` | `ef_linea_de_servicio` NULL en HubSpot | Operador completa propiedad en HubSpot |
| `pending` | Solo legacy seed pre-TASK-813 (todos archivados) | Ninguna — están con `active=FALSE` |

### Status `active` columna

`active=FALSE` indica que el service NO debe ser leído por consumers downstream (P&L, ICO, etc.). Las 30 filas legacy seedeadas tienen `active=FALSE AND status='legacy_seed_archived'`. Cualquier query que muestre filas legacy es bug downstream.

### Reliability signals (subsystem `Commercial Health`)

| Signal | Severidad | Steady | Cuándo dispara |
|---|---|---|---|
| `commercial.service_engagement.sync_lag` | Warning si > 24h, Error si > 48h | 0 | Webhook caído O cron caído |
| `commercial.service_engagement.organization_unresolved` | Warning > 24h, Error > 7 días | 0 | Service huérfano sin client owner |
| `commercial.service_engagement.legacy_residual_reads` | Error si > 0 | 0 | Consumer downstream lee filas legacy archivadas |

Dashboard: `/admin/operations` (filter por subsystem `Commercial Health`).

---

## Qué NO hacer

- **NO** ejecutar `archive-legacy-seed.ts` en producción **sin** entender qué archiva. Es one-shot para las 30 filas seedeadas el 2026-03-16. Re-ejecución es safe (idempotente), pero apuntar al criterio incorrecto archiva services reales.
- **NO** matchear services por nombre. Colisión real demostrada: dos clientes con engagement "CRM Solutions" causaba dedup errado pre-TASK-813. **Siempre** usar `hubspot_service_id` como PK natural.
- **NO** modificar `core.services` directo via SQL. Toda escritura pasa por el helper canónico `upsertServiceFromHubSpot` (`src/lib/services/upsert-service-from-hubspot.ts`). Hard rule documentada en CLAUDE.md.
- **NO** sincronizar Greenhouse → HubSpot. Solo el path HubSpot → Greenhouse está autorizado en V1. El back-fill de propiedades `ef_*` queda como follow-up V1.1 con governance review.
- **NO** crear webhook component nuevo en HubSpot Developer Platform. Solo se permite 1 componente por app. Eventos nuevos se agregan al existente `hubspot-bigquery` component.
- **NO** desactivar el cron Cloud Scheduler `ops-hubspot-services-sync` aunque el webhook esté funcionando. Es safety net que cubre webhooks perdidos.
- **NO** poblar `service_module_id` manualmente para resolver un service `unmapped`. La resolución debe venir de HubSpot (`ef_linea_de_servicio`) para preservar source-of-truth.

---

## Problemas comunes y troubleshooting

### Webhook no llega

**Síntoma**: edits en HubSpot no se reflejan en Greenhouse en < 10s.

**Diagnóstico**:

```sql
SELECT received_at, status, error_message
FROM greenhouse_sync.webhook_inbox_events
WHERE webhook_endpoint_id = (
  SELECT webhook_endpoint_id FROM greenhouse_sync.webhook_endpoints
  WHERE endpoint_key = 'hubspot-services'
)
ORDER BY received_at DESC LIMIT 5;
```

Si **no hay rows recientes**: HubSpot no está enviando.

**Causas**:

1. Suscripción Developer Portal pausada o eliminada → revisar app `Greenhouse Bridge` en `developers.hubspot.com/apps`.
2. App HubSpot no instalada en el tenant productivo → Account Settings > Integrations > Connected Apps.
3. URL target incorrecta → debe ser `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies`.

**Resolución**: re-verificar configuración en HubSpot Developer Portal. Si urgente, ejecutar backfill manual mientras tanto.

### Signature validation failed

**Síntoma**: webhook llega pero falla con `error_message='HubSpot signature validation failed'`.

**Causa**: `HUBSPOT_APP_CLIENT_SECRET` rotado en HubSpot pero no actualizado en GCP Secret Manager (o viceversa).

**Diagnóstico**:

```bash
# Ver qué secret tiene Vercel apuntando
vercel env ls

# Ver el secret actual en GCP
gcloud secrets versions list hubspot-app-client-secret --project=efeonce-group

# Comparar con el que aparece en HubSpot Developer Portal
# (Settings > Auth > Client secret)
```

**Resolución**:

```bash
# 1. Copiar el client secret actual del Developer Portal
# 2. Publicarlo (sin newlines residuales)
printf %s "$NUEVO_SECRET" | gcloud secrets versions add hubspot-app-client-secret \
  --data-file=- --project=efeonce-group

# 3. Trigger redeploy Vercel para que tome la nueva versión
git commit --allow-empty -m "chore: trigger redeploy hubspot client secret rotation"
git push origin develop
```

### Service huérfano persistente (organization_unresolved)

**Síntoma**: signal `commercial.service_engagement.organization_unresolved` en error (> 7 días).

**Causa**: hay un service en HubSpot cuya company association NO tiene match en Greenhouse `core.clients`.

**Diagnóstico**:

```bash
pnpm staging:request /api/admin/integrations/hubspot/orphan-services
```

Output incluye `hubspot_company_id` y `hubspot_service_id`. Cruzar con HubSpot UI:

```bash
# Ver el company en HubSpot
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
curl -s -H "Authorization: Bearer $HUBSPOT_ACCESS_TOKEN" \
  "https://api.hubapi.com/crm/v3/objects/companies/$HUBSPOT_COMPANY_ID" | jq
```

**Resolución por escenario**:

| Escenario | Acción |
|---|---|
| Cliente real, falta crearlo en Greenhouse | UI Admin Tenants → "Crear cliente" con HubSpot company ID |
| Service en HubSpot era basura/test | Archivar el service en HubSpot. Webhook delete event limpia la cola. |
| Holding/filial cross-billing (caso ANAM-Aguas Andinas) | Verificar que la company association apunte al pagador. Re-asociar en HubSpot. |

### Sync stale (>24h sin updates) sin webhooks pendientes

**Síntoma**: `commercial.service_engagement.sync_lag` en warning/error pero `webhook_inbox_events` está limpio.

**Causa probable**: cron Cloud Scheduler no está corriendo.

**Diagnóstico**:

```bash
gcloud scheduler jobs describe ops-hubspot-services-sync \
  --location=us-east4 --project=efeonce-group --format=json | jq '
  {state, lastAttemptTime, schedule, retryConfig}
'
```

Si `state` no es `ENABLED`:

```bash
gcloud scheduler jobs resume ops-hubspot-services-sync \
  --location=us-east4 --project=efeonce-group
```

Si `lastAttemptTime` es viejo: el job está corriendo pero el endpoint está fallando. Ver logs:

```bash
gcloud run services logs read ops-worker \
  --project=efeonce-group --region=us-east4 --limit=50 | grep hubspot-services
```

### UPSERT no refresca space después de re-asociación HubSpot

**Síntoma**: operador re-asocia un service a otra company en HubSpot, sync corre, pero Greenhouse mantiene el space viejo.

**Era un bug pre-2026-05-07** — fixed por commit `8d6a5ee8`. El UPSERT ahora incluye `space_id`, `organization_id`, `hubspot_company_id` en el `ON CONFLICT DO UPDATE`. Si reaparece, es regression — verificar `src/lib/services/upsert-service-from-hubspot.ts` y abrir issue.

### Backfill devuelve "Unable to infer object type"

**Síntoma**: script `backfill-from-hubspot.ts` falla con error 400 de HubSpot.

**Causa**: cliente Cloud Run bridge usaba paths `/p_services/...` cuando HubSpot ahora exige `/0-162/...`.

**Resolución**: ya fixeado en `services/hubspot_greenhouse_integration/hubspot_client.py`. Si emerge regression, verificar que las 3 sustituciones sigan vigentes:

- `/crm/v3/objects/p_services/` → `/crm/v3/objects/0-162/`
- `/crm/v4/objects/companies/{id}/associations/p_services` → `/associations/0-162`

El helper directo `src/lib/hubspot/list-services-for-company.ts` ya bypassa el bridge y va directo a HubSpot API.

### Ejecutar el archive de legacy seed (one-shot — ya ejecutado, dejar como referencia)

**No re-ejecutar en producción**. Documentado solo por completitud.

```bash
# Dry-run primero (siempre)
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/archive-legacy-seed.ts

# Apply real (one-shot)
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/archive-legacy-seed.ts --apply
```

Criterio: `created_at::date = '2026-03-16'`. Marca `active=FALSE`, `status='legacy_seed_archived'`, `engagement_kind='discovery'`. Emite outbox event v1 `commercial.service_engagement.archived_legacy_seed` con audit trail.

---

## Verificación post-deploy completa (post-merge a main)

Cuando se mergea a `main` un cambio que toque este pipeline:

```bash
# 1. Esperar deploy Vercel
gh run list --workflow=ci.yml --branch=main --limit=1
gh run watch <run-id>

# 2. Verificar deploy ops-worker (si hubo cambio en services/ops-worker/)
gh run list --workflow=ops-worker-deploy.yml --branch=main --limit=1

# 3. Health endpoint
curl -s https://greenhouse.efeoncepro.com/api/auth/health | jq

# 4. Reliability signals
pnpm staging:request /api/admin/operations | jq '.subsystems[] | select(.name == "Commercial Health")'

# 5. Smoke test webhook end-to-end
# (Editar manualmente un p_services en HubSpot prod, esperar < 10s, verificar)
pnpm pg:connect:shell <<'EOF'
SELECT hubspot_service_id, name, hubspot_last_synced_at
FROM greenhouse_core.services
WHERE hubspot_service_id = '<id_editado>';
EOF
```

---

## Referencias técnicas

### Specs

- **Arquitectural full**: `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (515 líneas, 18 secciones, 4-pillar score 8.75/10).
- **Modelo comercial 4-capas**: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`.
- **Hard rules**: CLAUDE.md sección "HubSpot inbound webhook — p_services (0-162)".
- **Doc funcional**: `docs/documentation/comercial/servicios-engagement.md`.

### Code paths principales

| Archivo | Rol |
|---|---|
| `src/lib/services/upsert-service-from-hubspot.ts` | Helper canónico SSOT (TASK-813a) |
| `src/lib/services/allocate-space-numeric-code.ts` | Race-safe space numeric_code allocator |
| `src/lib/webhooks/handlers/hubspot-services.ts` | Webhook handler real-time |
| `src/lib/webhooks/handlers/hubspot-companies.ts` | Companies webhook + delegate service events (single component constraint) |
| `src/lib/sync/projections/hubspot-services-intake.ts` | Reactive projection async (TASK-813b) |
| `src/lib/services/service-sync.ts` | Adapter de helpers + organization resolution |
| `src/lib/hubspot/list-services-for-company.ts` | HubSpot API direct helper (bypass bridge) |
| `scripts/services/backfill-from-hubspot.ts` | Backfill manual idempotente |
| `scripts/services/archive-legacy-seed.ts` | One-shot archive de seed legacy |
| `services/ops-worker/server.ts` (`handleHubspotServicesSync`) | Cloud Run cron handler |
| `services/ops-worker/deploy.sh` | Cloud Scheduler upsert idempotente |
| `src/lib/reliability/queries/services-sync-lag.ts` | Reliability signal #1 |
| `src/lib/reliability/queries/services-organization-unresolved.ts` | Reliability signal #2 |
| `src/lib/reliability/queries/services-legacy-residual-reads.ts` | Reliability signal #3 |

### Outbox events v1

- `commercial.service_engagement.intake_requested`
- `commercial.service_engagement.materialized`
- `commercial.service_engagement.archived_legacy_seed`
- `space.auto_created`

Catálogo completo: `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (delta 2026-05-06).

### Tests

- `src/lib/webhooks/handlers/hubspot-services.test.ts` — 8 tests (signature, dedup, async refactor, multi-format subscriptionType)
- `src/lib/sync/projections/hubspot-services-intake.test.ts` — 7 tests (projection contract, idempotency, retries)

### Migraciones relevantes

- `migrations/20260506200742463_task-801-engagement-primitive-services-extension.sql` — TASK-801 DDL (engagement_kind enum, commitment_terms_json, service_id TEXT FK, attribution_intent)
- Ver migrations adicionales referenciadas en TASK-813 lifecycle complete.
