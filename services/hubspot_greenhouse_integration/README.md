# HubSpot Greenhouse Integration Service

> **Ubicación canónica:** este repo (`greenhouse-eo/services/hubspot_greenhouse_integration/`) desde 2026-04-24.
> Antes de eso vivía en `cesargrowth11/hubspot-bigquery`. La mudanza se documenta en [TASK-574](../../docs/tasks/in-progress/TASK-574-absorb-hubspot-greenhouse-integration-service.md). El historial git de sus 38 commits originales está preservado en este directorio.

Cloud Run service en Python 3.12 + Flask que actúa como **write bridge HubSpot ↔ Greenhouse**: expone 23 endpoints HTTP para lecturas canónicas, escrituras autenticadas y el webhook handler que recibe notificaciones del portal HubSpot y las propaga al runtime de `greenhouse-eo`.

- **URL pública:** `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app`
- **Región:** `us-central1` (NO `us-east4`; preservada desde antes del cutover)
- **Runtime SA:** `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
- **Deploy SA (GitHub Actions):** `github-actions-deployer@efeonce-group.iam.gserviceaccount.com`
- **Consumer principal:** `src/lib/integrations/hubspot-greenhouse-service.ts` (Next.js runtime en Vercel)

## Rutas expuestas (23 total)

### Lectura — no-auth

| Método | Path | Uso |
|---|---|---|
| GET | `/health` | Liveness + smoke post-deploy |
| GET | `/contract` | Descripción de contratos + versión desplegada |
| GET | `/deals/metadata` | Pipelines + stages + owners disponibles para CreateDealDrawer |
| GET | `/companies/<id>` | Perfil full de una company por HubSpot id |
| GET | `/companies/search` | Search de companies (nombre, dominio) |
| GET | `/companies/<id>/owner` | Owner actual de la company |
| GET | `/owners/resolve` | Resolver `email → hubspot_owner_id` (usado por bridge de owners) |
| GET | `/companies/<id>/contacts` | Listar contactos asociados |
| GET | `/companies/<id>/deals` | Listar deals asociados |
| GET | `/services/<id>` | Custom object `service` (detalle) |
| GET | `/companies/<id>/services` | Custom object `service` (listado por company) |
| GET | `/products` | Catálogo de productos del portal |
| GET | `/products/<id>` | Detalle de producto |
| GET | `/products/reconcile` | Scan de drift para el catálogo |
| GET | `/quotes/<id>/line-items` | Line items de una quote |
| GET | `/companies/<id>/quotes` | Quotes asociadas |

### Escritura — Bearer auth (`Authorization: Bearer $GREENHOUSE_INTEGRATION_API_TOKEN` o header `x-greenhouse-integration-key`)

| Método | Path | Uso |
|---|---|---|
| PATCH | `/companies/<id>/lifecycle` | Outbound lifecycle sync (TASK-540) |
| POST | `/deals` | Create deal inline desde quote builder (TASK-572, TASK-573) |
| POST | `/products` | Create product desde catalog projection (TASK-547) |
| PATCH | `/products/<id>` | Update product |
| POST | `/products/<id>/archive` | Archive product |
| POST | `/quotes` | Create quote (TASK-583) |

### Webhook — HMAC signature (`HUBSPOT_APP_CLIENT_SECRET`)

| Método | Path | Uso |
|---|---|---|
| POST | `/webhooks/hubspot` | Recibir eventos inbound del portal (company/contact updates) → llamar `POST {GREENHOUSE_BASE_URL}/api/integrations/v1/hubspot/sync-capabilities` |

## Variables de entorno

### Secretos (Secret Manager del proyecto `efeonce-group`)

| Env | Secret ID | Consumer |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | `hubspot-access-token` | Cliente `hubspot_client.py` (todas las llamadas a HubSpot API v3) |
| `GREENHOUSE_INTEGRATION_API_TOKEN` | `greenhouse-integration-api-token` | Validación de Bearer en endpoints de escritura + cliente `greenhouse_client.py` |
| `HUBSPOT_APP_CLIENT_SECRET` | `hubspot-app-client-secret` | `validate_hubspot_request_signature()` en webhook handler |

### No-secret

| Env | Default | Uso |
|---|---|---|
| `GREENHOUSE_BASE_URL` | `https://greenhouse.efeoncepro.com` | Base URL para llamadas back al runtime Vercel (webhook → sync_capabilities) |
| `HUBSPOT_GREENHOUSE_BUSINESS_LINE_PROP` | `linea_de_servicio` | Nombre de la custom property HubSpot que mantiene business line |
| `HUBSPOT_GREENHOUSE_SERVICE_MODULE_PROP` | `servicios_especificos` | Custom property que lista service modules |
| `HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_SECONDS` | `30` | Timeout HTTP hacia HubSpot + Greenhouse |
| `HUBSPOT_GREENHOUSE_WEBHOOK_MAX_AGE_MS` | `300000` | Ventana anti-replay para signatures del webhook |
| `PYTHONUNBUFFERED` | `1` | Logging sin buffering (inyectado por Dockerfile + deploy.sh) |

## Desarrollo local

```bash
# 1. Crear venv + instalar deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/hubspot_greenhouse_integration/requirements.txt
pip install pytest  # para correr tests

# 2. Exportar env mínimas (reemplazar con tokens reales o usar secretos locales)
export HUBSPOT_ACCESS_TOKEN="pat-xxx"
export GREENHOUSE_INTEGRATION_API_TOKEN="$(openssl rand -hex 32)"
export HUBSPOT_APP_CLIENT_SECRET="dummy-for-dev"
export GREENHOUSE_BASE_URL="http://localhost:3000"

# 3. Correr el servicio
cd services/hubspot_greenhouse_integration
gunicorn --bind :8080 --workers 1 --reload app:app
# Health check: curl http://localhost:8080/health
```

### Docker local (paridad con Cloud Run)

```bash
docker build -t hubspot-greenhouse-integration \
    -f services/hubspot_greenhouse_integration/Dockerfile .

docker run --rm -p 8080:8080 \
    -e HUBSPOT_ACCESS_TOKEN=pat-xxx \
    -e GREENHOUSE_INTEGRATION_API_TOKEN=$(openssl rand -hex 32) \
    -e HUBSPOT_APP_CLIENT_SECRET=dummy \
    -e GREENHOUSE_BASE_URL=http://host.docker.internal:3000 \
    hubspot-greenhouse-integration

curl http://localhost:8080/health
curl http://localhost:8080/contract
```

## Tests

Ubicación: `services/hubspot_greenhouse_integration/tests/test_app.py` (40 test functions, framework `unittest` stdlib).

Ejecutar desde la raíz del monorepo (requirement: imports absolutos `services.hubspot_greenhouse_integration.*` dependen de ser encontrados desde el root):

```bash
# Venv activo con flask, requests, gunicorn, pytest instalados
python -m pytest services/hubspot_greenhouse_integration/tests/ -v
```

Estado vigente: la suite debe estar verde antes de desplegar. El workflow
`.github/workflows/hubspot-greenhouse-integration-deploy.yml` ejecuta pytest
por defecto y no declara success si los tests fallan. `skip_tests=true` queda
reservado para break-glass documentado.

Nota historica: durante el cutover desde el sibling existio un estado temporal
`37/40` por failures heredados. Ese estado ya no debe usarse como referencia
operativa para evaluar deployability del bridge.

## Deploy

### Deploy manual (emergencia o primer cutover)

```bash
# Requiere gcloud autenticado como SA con roles/run.admin sobre el service
# + roles/secretmanager.secretAccessor sobre los 3 secretos.
ENV=staging bash services/hubspot_greenhouse_integration/deploy.sh
ENV=production bash services/hubspot_greenhouse_integration/deploy.sh
```

El script:
1. Valida `ENV` (staging|production, sin default).
2. Build via Cloud Build (imagen `gcr.io/efeonce-group/hubspot-greenhouse-integration`).
3. Ensure que el SA runtime tenga acceso a los 3 secretos (idempotente).
4. `gcloud run deploy` con env + secretos en `us-central1` con `--allow-unauthenticated`.
5. Smoke local via `curl /health` + `/contract` (skipeado en CI).

### Deploy automático (post-cutover)

Workflow: [`.github/workflows/hubspot-greenhouse-integration-deploy.yml`](../../.github/workflows/hubspot-greenhouse-integration-deploy.yml)

Triggers:
- Push a `develop` con cambios a `services/hubspot_greenhouse_integration/**` → deploy staging
- Push a `main` con cambios → deploy production
- `workflow_dispatch` manual con input `environment`
- `workflow_call` desde `production-release.yml` con `expected_sha=<target_sha>`

Recovery de drift productivo:

```bash
gh workflow run hubspot-greenhouse-integration-deploy.yml \
  --ref main \
  -f environment=production \
  -f expected_sha=<release target_sha> \
  -f skip_tests=false
```

Despues verificar `/health`, `/contract` y `pnpm release:watchdog --json`.
No editar `greenhouse_sync.release_manifests` por SQL para corregir drift; el
manifest es source of truth append-only del release.

Auth: **Workload Identity Federation** (cero SA-key JSON en GitHub Secrets).
- Provider: `projects/183008134038/locations/global/workloadIdentityPools/vercel/providers/greenhouse-eo`
- Deploy SA: `github-actions-deployer@efeonce-group.iam.gserviceaccount.com`
- Runtime SA: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`

## Observabilidad

- **Logs runtime:** Cloud Logging, filter `resource.type="cloud_run_revision" AND resource.labels.service_name="hubspot-greenhouse-integration"`
- **Métricas:** Cloud Monitoring — request count, error rate, latency p95, cold-start count
- **Sentry:** (no habilitado actualmente; follow-up si se requiere error aggregation)

## Rollback

El deploy genera revisiones numeradas (`hubspot-greenhouse-integration-00XXX-xyz`). Para rollback instantáneo:

```bash
gcloud run services update-traffic hubspot-greenhouse-integration \
    --region us-central1 \
    --to-revisions=<REVISION_ANTERIOR>=100
```

Listar revisiones:

```bash
gcloud run revisions list --service hubspot-greenhouse-integration --region us-central1 --limit 10
```

## Cómo agregar una ruta nueva

1. Editar `app.py`: decorador `@app.{method}(path)` + función handler.
2. Actualizar `contract.py` si la ruta es parte del contract surface (GET `/contract` devuelve esto).
3. Actualizar `models.py` si la ruta toca un tipo canónico (CompanyProfile, DealProfile, etc.).
4. Agregar test en `tests/test_app.py` (mínimo 1 happy path + 1 auth rejection si aplica).
5. Actualizar `src/lib/integrations/hubspot-greenhouse-service.ts` en el monorepo para que el cliente TS conozca el nuevo endpoint.
6. PR + CI valida pytest y deployability. Merge dispara deploy.

## Cómo validar una signature de webhook

El endpoint `POST /webhooks/hubspot` usa `validate_hubspot_request_signature()` que soporta:

- **v1** (signature legacy, deprecada por HubSpot pero aún en algunos payloads): SHA-256 HMAC sobre `client_secret + body`.
- **v3** (signature canónica actual): SHA-256 HMAC sobre `method + url + body + timestamp`, con ventana anti-replay de `HUBSPOT_GREENHOUSE_WEBHOOK_MAX_AGE_MS`.

El webhook app en HubSpot portal apunta al mismo Cloud Run URL pre y post cutover — **no se reconfigura en el portal**.

## Contrato HTTP y arquitectura

- Shape canónico: `contract.py` expone cada ruta con JSON schema simplificado.
- Errors: el servicio propaga rate-limit de HubSpot como `503 Retryable` para que el consumer Vercel pueda reintentar.
- Timeouts: 30s hacia HubSpot por default (`HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_SECONDS`); el cliente TS usa 4s por default.
- Idempotency: endpoints de escritura (`POST /deals`, `POST /products`, `POST /quotes`) soportan header `gh_idempotency_key` que evita duplicados ante retry.

Docs relacionadas:
- [`src/lib/integrations/hubspot-greenhouse-service.ts`](../../src/lib/integrations/hubspot-greenhouse-service.ts) — cliente TS + types compartidos
- [`docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`](../../docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md) — ubicación del servicio en la topología GCP
- [`docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`](../../docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md) — separación monorepo ↔ sibling post-TASK-574
- [`docs/documentation/finance/crear-deal-desde-quote-builder.md`](../../docs/documentation/finance/crear-deal-desde-quote-builder.md) — flujo funcional del inline deal creation

## Follow-ups operativos (no incluidos en TASK-574)

- Pinear `requirements.txt` a versiones exactas para builds reproducibles (hoy `flask>=2.0` → riesgo de drift silencioso).
- Endurecer auth: considerar `--no-allow-unauthenticated` + gateway de Vercel autenticado con OIDC token.
- Habilitar Sentry para agregación de errores en production.
- Migrar el HubSpot Developer Platform app del sibling de v2025.2 a v2026.03 (ver TASK-575).
