# TASK-577 — Notion Write Bridge (HTTP service)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-005`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `integrations / delivery`
- Blocked by: `TASK-574` recomendado (servicio absorbido en monorepo); puede arrancar en paralelo si se aceptan 2 cortes de refactor
- Branch: `task/TASK-577-notion-write-bridge`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Agregar capacidad de escritura a Notion al servicio Python absorbido (`services/hubspot_greenhouse_integration/` post TASK-574) con 8 endpoints HTTP + bootstrap de una **integration Notion dedicada** (`Greenhouse Commercial-Delivery Orchestrator`). Primer milestone de EPIC-005: sin este bridge, ni forward ni reverse orchestrator pueden proyectar a Notion. Diseñado como extensión del patrón existente (Flask + gunicorn + Secret Manager + `x-greenhouse-integration-key` auth), no como servicio nuevo.

## Why This Task Exists

EPIC-005 convierte a Greenhouse en orquestador canónico Commercial↔Delivery. Hoy `greenhouse-eo` no tiene capacidad de escribir a Notion — `notion-bigquery` es ingestion-only read, el sibling `notion-hubspot-sync` escribe a Notion desde su propio Cloud Function con mappings hardcoded. Para que Greenhouse reemplace al sibling, primero necesita un write bridge con el mismo contrato HTTP que el resto de `services/hubspot_greenhouse_integration/` ya usa.

## Goal

- 8 rutas HTTP Notion-write live en `services/hubspot_greenhouse_integration/` (o `services/commercial_delivery_bridge/` si Discovery aprueba rename).
- Integration Notion dedicada creada en el workspace Efeonce con grant per-DB.
- 2 secretos separados en Secret Manager (`notion-orchestrator-token-staging`, `notion-orchestrator-token-prod`).
- Runbook scriptado `scripts/bootstrap-notion-orchestrator-integration.md` para que cualquier operador pueda rehacer el setup.
- `notion-bigquery` integration queda intacta — no comparte token ni scope.
- Tests unitarios + integration de los 8 endpoints con signature regression + idempotency.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` (agrega integration Notion dedicada + rotación trimestral)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (nuevo módulo del bridge)
- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md` (contexto)
- `docs/tasks/to-do/TASK-574-absorb-hubspot-greenhouse-integration-service.md` (dependency natural)

Reglas obligatorias:

- **Una integration, read+write scope, grant per-DB**. No workspace-wide.
- **`notion-bigquery` integration NO se toca**. Lifecycle independiente.
- **Secretos separados staging/prod**. Nunca compartir.
- **Least privilege**: scope solo a DBs que el orchestrator consume (Tareas, Proyectos, Companies si existe, Contacts si existe).
- **Retry + backoff**: Notion API tiene rate limits (~3 req/s). Cliente Python usa `urllib3.Retry` con exponential backoff, mismo patrón que `hubspot_client.py`.
- **Signature / auth consistente** con rutas existentes: `Authorization: Bearer` + `x-greenhouse-integration-key`.

## Normative Docs

- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- `services/hubspot_greenhouse_integration/` post TASK-574 (referencia de patrón)
- Notion API docs: https://developers.notion.com/reference

## Dependencies & Impact

### Depends on

- `TASK-574` cerrada (código del servicio en monorepo). Si no cerró, hay que duplicar el porting.
- Admin access al workspace Notion Efeonce para crear la integration + grant per-DB.
- Admin access GCP `efeonce-group` para crear los 2 secretos en Secret Manager.
- Notion API token de la integration nueva (no la existente de `notion-bigquery`).

### Blocks / Impacts

- Bloquea TASK-579 (Forward Orchestrator), TASK-580 (Reverse Orchestrator), TASK-582 (Admin Surface). Todas usan estas rutas.
- NO rompe nada existente — es puramente aditivo al servicio absorbido.

### Files owned

- `services/hubspot_greenhouse_integration/notion_client.py` (nuevo, ~200-300 LOC estimadas)
- `services/hubspot_greenhouse_integration/app.py` (agregar 8 rutas + handlers)
- `services/hubspot_greenhouse_integration/config.py` (agregar env vars `NOTION_ORCHESTRATOR_TOKEN`, `NOTION_TAREAS_DB_ID`, `NOTION_PROYECTOS_DB_ID`, `NOTION_COMPANIES_DB_ID`, `NOTION_CONTACTS_DB_ID`)
- `services/hubspot_greenhouse_integration/contract.py` (declarar las 8 rutas nuevas en el contract)
- `services/hubspot_greenhouse_integration/models.py` (agregar builders `build_notion_task_payload`, `build_notion_company_payload`, etc.)
- `services/hubspot_greenhouse_integration/tests/test_notion_*.py` (nuevos tests)
- `services/hubspot_greenhouse_integration/deploy.sh` (agregar `--set-secrets=NOTION_ORCHESTRATOR_TOKEN=notion-orchestrator-token-<env>:latest`)
- `scripts/bootstrap-notion-orchestrator-integration.md` (runbook nuevo)
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` (documenta integration + rotación)
- `.env.example` (agregar `NOTION_*` placeholder vars)

## Current Repo State

### Already exists

- Servicio `services/hubspot_greenhouse_integration/` post TASK-574 con `app.py`, `hubspot_client.py`, `contract.py`, `models.py`, `webhooks.py`, `greenhouse_client.py`, `config.py`, `Procfile`, `deploy.sh`, tests.
- Patrón de rutas Flask + gunicorn + auth bearer + `x-greenhouse-integration-key` validado (17 rutas live).
- Secret Manager del GCP project `efeonce-group` con patrón `--set-secrets=` en el deploy.sh.
- `notion-bigquery` integration vive en el sibling `cesargrowth11/notion-bigquery` con read-only scope sobre las DBs Tareas + Proyectos.

### Gap

- Cero capacidad de escritura a Notion desde `greenhouse-eo`.
- No existe integration Notion dedicada para writes.
- No hay `notion_client.py` ni en el servicio ni en otro módulo.
- No hay runbook para crear la integration + grant per-DB + secretos.
- `config.py` del servicio no lee env vars Notion.

## Scope

### Slice 1 — Bootstrap integration Notion dedicada

- Crear la integration en el workspace Notion Efeonce: nombre `Greenhouse Commercial-Delivery Orchestrator`, type `Internal`, capabilities `Read content + Update content + Insert content`, NO workspace-wide.
- Grant per-DB explícito: Tareas, Proyectos, + cualquier DB adicional que TASK-580 bootstrapee (Companies, Contacts).
- Copiar el token → Secret Manager con 2 entries:
  - `notion-orchestrator-token-staging`
  - `notion-orchestrator-token-prod`
- Rotación trimestral documentada, alineada con cadencia de `ops-worker` (mismo trimestre).
- Escribir `scripts/bootstrap-notion-orchestrator-integration.md` con los pasos exactos para rehacer el setup (incluye commands `gcloud secrets create`, URL del Notion developer portal, screenshots descriptivos).

### Slice 2 — Decisión de rename del servicio

- Grep de references a `hubspot_greenhouse_integration` en el monorepo post TASK-574: imports, deploy workflows, README, docs.
- Si el número es bajo (< 20) y reemplazable con sed + manual checks → renombrar servicio a `commercial_delivery_bridge` + actualizar el Cloud Run service name.
- Si es alto o hay external references (env vars de Vercel apuntando al path) → dejar el nombre viejo, documentar el gap en `Handoff.md` como follow-up.
- Decisión y razón queda registrada en el PR de esta task.

### Slice 3 — `notion_client.py`

- Cliente Python con:
  - `NotionClient(token, timeout_seconds)` constructor
  - `create_page(database_id, properties, children=None)` → POST `/v1/pages`
  - `update_page(page_id, properties)` → PATCH `/v1/pages/{id}`
  - `query_database(database_id, filter=None, sorts=None, start_cursor=None)` → POST `/v1/databases/{id}/query`
  - `retrieve_page(page_id)` → GET `/v1/pages/{id}`
  - Retry + exponential backoff con `urllib3.Retry` (total=3, backoff=0.5s, retry on 408/425/429/500/502/503/504)
  - Rate limit awareness (Notion devuelve 429 con `Retry-After` header)
  - Error mapping: `NotionAuthError` (401), `NotionNotFound` (404), `NotionRateLimitError` (429), `NotionValidationError` (400), `NotionUpstreamError` (5xx)
  - Idempotency via `external_id` custom property (pattern: `gh_{entity}_{uuid}`)

### Slice 4 — 8 rutas HTTP

- `POST /notion/tasks` — crear task en Tareas DB. Payload: `{database_target: 'tareas', parent_page_id?: string, title, status, owner?, priority?, deal_hubspot_id?, contact_identity_profile_id?, external_id}`. Response: `{pageId, url, createdAt}`.
- `PATCH /notion/tasks/<page_id>` — actualizar task. Payload: subset of props. Response: `{pageId, url, updatedAt}`.
- `POST /notion/companies` — crear/upsert company en Companies DB (si existe; si no, devuelve 412 indicando que bootstrap schema pendiente). Payload: `{external_id: hubspot_company_id, name, domain, industry, lifecycle_stage, linea_de_servicio[], servicios_especificos[]}`.
- `PATCH /notion/companies/<page_id>` — actualizar company props.
- `POST /notion/projects` — crear proyecto mensual. Payload: `{year, month, projected_deals: string[], business_line?}`. Response: `{projectPageId, projectName, url}`.
- `GET /notion/projects/current` — resolver proyecto mensual vigente usando canonical state (no Notion-live como hace el sibling). Query params: `year=2026&month=04&business_line?`. Response: `{projectPageId?, projectName, status: 'exists' | 'not_yet_created' | 'multiple_candidates'}`.
- `POST /notion/full-sync` — admin-only, gatilla full-sync on demand. Auth extra: requiere header `x-admin-override-key` + el bearer. Payload: `{dryRun: boolean, scope: 'all' | 'deals' | 'companies' | 'tasks' | 'contacts'}`. Response: `{correlationId, estimatedEntityCount, startedAt}`. Ejecuta async; resultado observable via logs.
- `GET /notion/health` — smoke check de conectividad con Notion API (token válido, rate-limit headroom). Response: `{ok, latencyMs, rateLimitRemaining}`.

Todas las rutas respetan auth existente (`Authorization: Bearer` + `x-greenhouse-integration-key`).

### Slice 5 — `contract.py` update

- Agregar las 8 rutas al contract con request/response schemas.
- Incluir en la respuesta de `GET /contract` para que `greenhouse-eo` pueda detectar la versión.

### Slice 6 — Tests + deploy + smoke

- Tests unitarios de `notion_client.py`: retry behavior, rate-limit handling, error mapping.
- Tests integration de las 8 rutas con mock de Notion API (no staging real para CI).
- Smoke staging: crear task real en Tareas DB de staging + verificar via GET.
- Smoke prod: solo `GET /notion/health` (no crear data en prod).
- Deploy via workflow `hubspot-greenhouse-integration-deploy.yml` (post TASK-574).

## Out of Scope

- Consumir estas rutas desde `greenhouse-eo`. Eso vive en TASK-579 (forward), TASK-580 (reverse), TASK-582 (admin surface).
- Crear las DBs Notion Companies / Contacts. Eso vive en TASK-580 Discovery + slice de bootstrap.
- Reemplazar `notion-bigquery` ingestion. Sigue intacta, lifecycle independiente.
- Admin UI para rotación de token. Rotación manual via runbook por ahora.

## Detailed Spec

### Contract response payload shape (ejemplo `POST /notion/tasks`)

```json
{
  "status": "created",
  "pageId": "f3a8...uuid",
  "url": "https://www.notion.so/...",
  "createdAt": "2026-04-23T14:22:30Z",
  "databaseId": "2a539c2fefe78070943ce1dbcb553038",
  "externalId": "gh_task_f3a8-...-uuid"
}
```

### Error shapes

Alineados con `HubSpotIntegrationError`:

```json
{"error": "Invalid Notion token", "code": "NOTION_AUTH", "details": {...}}
```

Códigos: `NOTION_AUTH` (401), `NOTION_NOT_FOUND` (404), `NOTION_RATE_LIMIT` (429 + `Retry-After` header), `NOTION_VALIDATION` (400), `NOTION_UPSTREAM` (5xx), `NOTION_SCHEMA_MISSING` (412 — para endpoints cuya DB target aún no existe).

### Runbook `scripts/bootstrap-notion-orchestrator-integration.md`

- Paso 1: crear integration en https://www.notion.so/profile/integrations con nombre exacto.
- Paso 2: set capabilities (Read + Update + Insert) + workspace owner.
- Paso 3: grant a cada DB con share link del Notion developer portal.
- Paso 4: copiar internal integration token.
- Paso 5: `gcloud secrets create notion-orchestrator-token-staging --replication-policy=automatic` + `gcloud secrets versions add ...`.
- Idem prod.
- Paso 6: verificar via `curl` con el token + bearer contra `GET /notion/health` del servicio.

## Acceptance Criteria

- [ ] Integration Notion dedicada existe en workspace Efeonce con nombre `Greenhouse Commercial-Delivery Orchestrator`.
- [ ] Grant per-DB explícito (Tareas + Proyectos mínimo; Companies/Contacts si TASK-580 bootstrap las creó).
- [ ] Secretos `notion-orchestrator-token-staging` y `notion-orchestrator-token-prod` live en Secret Manager.
- [ ] `notion-bigquery` integration sigue intacta (no comparte token).
- [ ] `services/hubspot_greenhouse_integration/notion_client.py` existe con retry + backoff + error mapping.
- [ ] 8 rutas responden en el servicio deployado.
- [ ] `GET /contract` incluye las 8 rutas nuevas.
- [ ] Tests unitarios + integration passing.
- [ ] Smoke staging: crear task real + verificar.
- [ ] Smoke prod: `GET /notion/health` OK.
- [ ] Runbook `scripts/bootstrap-notion-orchestrator-integration.md` publicado.
- [ ] `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` documenta la integration + cadencia de rotación.
- [ ] Si Discovery aprobó rename → servicio ahora es `commercial_delivery_bridge`; si no, queda `hubspot_greenhouse_integration` con follow-up declarado.

## Verification

- `pnpm staging:request POST /notion/tasks '{...}'` (via bridge) → 201 con pageId real.
- Verificación visual en el workspace Notion staging: task existe en Tareas DB con external_id correcto.
- `GET /notion/health` → 200.
- Tests suite: `pytest services/hubspot_greenhouse_integration/tests/test_notion_*.py` verde.
- IAM audit: SA del workflow de deploy tiene `roles/secretmanager.secretAccessor` sobre los 2 nuevos secretos.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` documentan el merge
- [ ] Chequeo cruzado sobre `EPIC-005` — acceptance criterion "Notion Write Bridge live" marcado
- [ ] `TASK-579`, `TASK-580`, `TASK-582` notificadas de que ya pueden arrancar

## Follow-ups

- Admin UI para rotación de token Notion (V1 es manual via runbook).
- Métricas Prometheus-style de rate-limit consumption para alertar antes de throttling.
- Circuit breaker si Notion API cae sostenidamente (hoy retry + fail hard).

## Open Questions

- Rename del servicio a `commercial_delivery_bridge`: decide Discovery Slice 2 con evidencia de grep.
- ¿Cuál es el DB ID de Tareas + Proyectos + Companies + Contacts en el workspace staging vs prod? A documentar en el runbook.
