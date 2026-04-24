# TASK-574 — Absorber el Cloud Run `hubspot-greenhouse-integration` en `services/` de `greenhouse-eo`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `—`
- Status real: `Avanzada`
- Rank: `TBD`
- Domain: `infra / integrations`
- Blocked by: `none`
- Branch: `task/TASK-574-absorb-hubspot-greenhouse-integration-service`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Mover el servicio Cloud Run `hubspot-greenhouse-integration` desde el repo hermano `cesargrowth11/hubspot-bigquery` (carpeta `services/hubspot_greenhouse_integration/`) al monorepo `greenhouse-eo` bajo `services/hubspot_greenhouse_integration/`, siguiendo el mismo patrón que `services/ops-worker/` y `services/commercial-cost-worker/`. El pipeline HubSpot → BigQuery (`main.py` Cloud Function + `greenhouse_bridge.py` top-level) permanece en el sibling; solo el write-bridge HTTP se muda. Objetivo: todo cambio de contrato HubSpot↔Greenhouse (deals, companies, products, quotes, services, webhooks HubSpot inbound) se despacha en un solo PR + un solo deploy + sin context-switch de repo. Ganancia adicional: el servicio recibe CI propia por primera vez (hoy deploya manual sin pipeline).

### Alcance real confirmado por inspección del sibling (2026-04-23) + Delta 2026-04-24 (Discovery re-ejecutada en ejecución)

- **23 rutas HTTP activas** (spec original decía 17 — el servicio creció entre planificación y ejecución):
  - Lectura (no-auth): `GET /health`, `GET /contract`, `GET /deals/metadata`, `GET /companies/<id>`, `GET /companies/search`, `GET /companies/<id>/owner`, **`GET /owners/resolve`** _(nueva)_, `GET /companies/<id>/contacts`, **`GET /companies/<id>/deals`** _(nueva)_, `GET /services/<id>`, `GET /companies/<id>/services`, `GET /products`, `GET /products/<id>`, `GET /products/reconcile`, `GET /quotes/<id>/line-items`, `GET /companies/<id>/quotes`
  - Escritura (Bearer auth): **`PATCH /companies/<id>/lifecycle`** _(nueva)_, `POST /deals`, `POST /products`, **`PATCH /products/<id>`** _(nueva)_, `POST /products/<id>/archive`, `POST /quotes`
  - Webhook (HMAC signature): `POST /webhooks/hubspot`
- **3410 LOC Python runtime** (spec decía 3116; +294 LOC). 8 módulos: `app.py` (1267), `hubspot_client.py` (1001), `models.py` (411), `contract.py` (391), `webhooks.py` (218), `greenhouse_client.py` (80), `config.py` (41), `__init__.py` (1).
- **1660 LOC de tests** (spec decía 1341) en `tests/test_hubspot_greenhouse_integration_app.py`; framework `unittest` stdlib con 40 test functions. `test_greenhouse_bridge.py` (302 LOC) corresponde al bridge del BQ sync, NO al servicio — se queda en sibling.
- **Dependencias runtime**: `flask>=2.0`, `requests>=2.28`, `gunicorn>=22.0` (floating — follow-up post-cutover: pinear para builds reproducibles). Procfile: `web: gunicorn --bind :${PORT:-8080} app:app`.
- **Acoplamiento cross-service con otros módulos del sibling = NINGUNO** (grep confirmado Discovery 2026-04-24). Todo import interno del servicio es relativo (`from .config import ...`); no depende de `main.py`, `greenhouse_bridge.py`, etc.
- **El servicio llama back a `greenhouse-eo`** vía `GreenhouseClient` (POST `sync_capabilities` desde webhooks HubSpot inbound). Coupling es puramente HTTP, no import; sobrevive a la mudanza sin cambio.
- **Tres secretos**: `HUBSPOT_ACCESS_TOKEN`, `GREENHOUSE_INTEGRATION_API_TOKEN`, `HUBSPOT_APP_CLIENT_SECRET` (este último para validación de firma de webhook HubSpot).
- **Cero CI en el sibling** — deploys 100% manual via `bash deploy.sh`.
- **Skill `skills/efeonce-hubspot-greenhouse-ops/`** vive en el sibling — debe migrar a `.claude/skills/` y `.codex/skills/` del monorepo.

## Why This Task Exists

- El dolor operativo actual: toda task que cruza el bridge (`TASK-539`, `TASK-540`, `TASK-552`, `TASK-563`, `TASK-571`, `TASK-572`, `TASK-573`) obliga a los agentes a recordar el repo hermano, clonarlo, editarlo, deployarlo por separado, y volver para cerrar la task. La evidencia viva está en `Handoff.md`: sesiones sucesivas documentan deploys aislados del sibling y pull-requests que asumían paths del servicio que el agente nunca validó porque no estaba clonado. Cada olvido es una bomba de tiempo (drift entre contrato esperado y contrato desplegado).
- Alternativas descartadas:
  - **Acceso directo a HubSpot desde `greenhouse-eo`**: duplica write-paths, fragmenta rate-limit budget por portal, rompe el audit chokepoint único. Descartada.
  - **Mejor skill/doc para agentes**: mitigación, no solución. No elimina los dos deploys ni los dos PRs.
- La mudanza aprovecha que `greenhouse-eo` ya tiene convención `services/<name>/` con Dockerfile + `deploy.sh` per-service, y que `ops-worker` ya demostró que un Cloud Run puede vivir dentro del monorepo con build isolado. Agregar un servicio Python al patrón es incremental, no estructural.
- El sibling `hubspot-bigquery` NO se archiva: sigue siendo source-of-truth del pipeline HubSpot → BigQuery ingestion (`hubspot_crm.*`). Esa lane no es la que genera agent coordination tax.

## Goal

- Todo código del Cloud Run `hubspot-greenhouse-integration` vive en `greenhouse-eo/services/hubspot_greenhouse_integration/`, con historial git preservado (blame + autoría + fechas reales de commits originales).
- El mismo Cloud Run service (`hubspot-greenhouse-integration` en `us-central1`) se despliega ahora desde GitHub Actions de `greenhouse-eo`, con Workload Identity Federation (cero credenciales long-lived), sin cambio de URL pública para el consumidor Vercel.
- El workflow de deploy del sibling queda deshabilitado en el mismo commit del cutover; un `README.md` stub apunta a la nueva ubicación.
- `AGENTS.md`, `project_context.md`, `CLAUDE.md`, `.codex/`, y `GREENHOUSE_REPO_ECOSYSTEM_V1.md` reflejan la nueva topología.
- Una nueva task HubSpot bridge jamás vuelve a requerir que el agente recuerde "ah, pero eso vive en otro repo".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` (sección 3)
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`
- patrón vigente en `services/ops-worker/` y `services/commercial-cost-worker/`

Reglas obligatorias:

- **No se rompe el contrato HTTP público**: mismo service Cloud Run, misma URL, mismos endpoints. El consumidor Vercel (`greenhouse-eo` runtime) NO sufre cambio de env var ni de auth.
- **Historial git obligatorio**: extracción vía `git filter-repo` sobre clone del sibling preservando SOLO `services/hubspot_greenhouse_integration/` con toda su historia. Subtree squash prohibido.
- **Workload Identity Federation obligatorio**: cero SA-key JSON en GitHub Secrets. Provider reutilizado si `ops-worker` ya lo tiene; set up WIF nuevo como slice dedicada si no.
- **Ownership explícito del Cloud Run**: en el cutover el SA del deploy workflow de `greenhouse-eo` tiene `roles/run.admin`; el SA del sibling pierde ese rol.
- **Cero acoplamiento oculto con BQ sync**: si el módulo Python del bridge comparte código con el BQ ingestion, se duplica localmente (copia en el nuevo servicio > dependencia invisible).
- **Cutover atómico**: nuevo workflow habilitado + viejo workflow deshabilitado + stub README en sibling, todo en el mismo commit. No hay ventana de dual-deploy en producción.
- **Observabilidad mantenida**: misma Cloud Run service, mismos log drains, mismo Sentry project. No crear instancia paralela.

## Normative Docs

- `docs/tasks/complete/TASK-572-hubspot-integration-post-deals-deploy.md` (servicio vivo)
- `docs/tasks/complete/TASK-573-quote-builder-deal-birth-contract-completion.md` (último delta del contrato)
- `docs/tasks/to-do/TASK-576-hubspot-quote-publish-contract-completion.md` (contrato publish-ready de quotes que el servicio absorbido debe soportar sin regresión)
- `services/ops-worker/README.md` (patrón de referencia para estructura `services/`)
- `services/ops-worker/deploy.sh` (patrón de script de deploy)
- `services/ops-worker/Dockerfile` (patrón de Dockerfile per-service)

## Dependencies & Impact

### Depends on

- Acceso read/write a `cesargrowth11/hubspot-bigquery` (para extraer + deshabilitar workflow).
- Acceso admin a GCP project `efeonce-group` (para reconfigurar IAM del Cloud Run service + WIF provider).
- Secret Manager access: `GREENHOUSE_INTEGRATION_API_TOKEN`, `HUBSPOT_API_TOKEN`, `HUBSPOT_PORTAL_ID`, y cualquier otro secret consumido por el servicio — ya existen, solo se transfiere acceso al nuevo SA de deploy.
- `git filter-repo` instalable local para Fase 2.

### Blocks / Impacts

- Desbloquea velocidad de desarrollo sobre el bridge HubSpot: toda task futura HubSpot↔Greenhouse ahorra 1 repo de context-switch + 1 PR + 1 deploy.
- Impacta a agentes AI: `AGENTS.md` + `CLAUDE.md` + `.codex/` pasan a declarar el bridge como asset de `greenhouse-eo`.
- Impacta a operaciones: un único punto de review para cambios del bridge (no más "revisó el PR en un repo pero el otro no").
- Cierra el riesgo de drift silencioso entre contrato esperado (definido en `src/lib/integrations/hubspot-greenhouse-service.ts`) y contrato deployado (hoy en sibling).
- Debe dejar considerado desde el diseño el carril que cerrará `TASK-576`: quote create/update publish-ready, binding catálogo-first de line items, sender/remitente y empresa emisora. La absorción no puede reubicar el servicio ignorando ese contrato.

### Files owned (monorepo destino)

Code del servicio (8 módulos Python, migrados con historial via `git filter-repo`):

- `services/hubspot_greenhouse_integration/__init__.py`
- `services/hubspot_greenhouse_integration/app.py` (1165 LOC — Flask app + 17 rutas + webhook handler)
- `services/hubspot_greenhouse_integration/hubspot_client.py` (884 LOC)
- `services/hubspot_greenhouse_integration/contract.py` (364 LOC)
- `services/hubspot_greenhouse_integration/models.py` (363 LOC)
- `services/hubspot_greenhouse_integration/webhooks.py` (218 LOC)
- `services/hubspot_greenhouse_integration/greenhouse_client.py` (80 LOC)
- `services/hubspot_greenhouse_integration/config.py` (41 LOC)
- `services/hubspot_greenhouse_integration/requirements.txt`
- `services/hubspot_greenhouse_integration/Procfile` (entrypoint gunicorn)

Tests (migrados desde `/tests/` raíz del sibling a colocación service-local):

- `services/hubspot_greenhouse_integration/tests/__init__.py` (nuevo)
- `services/hubspot_greenhouse_integration/tests/test_app.py` (ex `tests/test_hubspot_greenhouse_integration_app.py`, 1341 LOC)
- Ajustar imports de `from services.hubspot_greenhouse_integration.*` a imports relativos o mantener absolute con `PYTHONPATH` config.

Infra nueva:

- `services/hubspot_greenhouse_integration/Dockerfile` (Python 3.12-slim, gunicorn entry)
- `services/hubspot_greenhouse_integration/deploy.sh` (WIF + gcloud run deploy)
- `services/hubspot_greenhouse_integration/README.md`
- `services/hubspot_greenhouse_integration/.dockerignore`
- `.github/workflows/hubspot-greenhouse-integration-deploy.yml` (primera CI/CD que este código tiene)
- `.github/workflows/hubspot-greenhouse-integration-test.yml` (pytest on PR)
- `.gcloudignore` (delta: excluir `services/hubspot_greenhouse_integration/` del Next.js build de Vercel)

Skill migration:

- `.claude/skills/hubspot-greenhouse-bridge/` (migrado desde `skills/efeonce-hubspot-greenhouse-ops/` del sibling, adaptado al monorepo path)
- `.codex/skills/hubspot-greenhouse-bridge/` (equivalente para Codex)

Docs afectadas:

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` (sección 3 re-scoped: sibling = solo BQ ingestion)
- `AGENTS.md`, `project_context.md`, `CLAUDE.md`
- `docs/documentation/finance/crear-deal-desde-quote-builder.md` (path del servicio)
- Cualquier doc que asuma que `services/hubspot_greenhouse_integration/routes/*` vive en el sibling.

### Files que se QUEDAN en el sibling `cesargrowth11/hubspot-bigquery`

Declarados explícitamente para que el cutover no los arrastre:

- `main.py` — Cloud Function BQ sync (`hubspot-bq-sync`), deploy distinto al del Cloud Run absorbido.
- `greenhouse_bridge.py` + `greenhouse_bridge_adapter.py` — bridge DENTRO del BQ sync (capability catalog, tenant pulls vía BigQuery). Distinto del write-bridge HTTP.
- `hsproject.json` + `src/app/` — app HubSpot Developer Platform v2025.2 (webhooks + settings config). Vinculada al BQ sync auth, no al Cloud Run.
- Scripts ops contra el portal HubSpot (no runtime del servicio):
  - `create_hubspot_properties.py`
  - `backfill_company_capabilities_from_deals.py`
  - `rotate_greenhouse_integration_secret.py`
- Tests del BQ sync: `tests/test_main.py` (217 LOC), `tests/test_greenhouse_bridge.py` (302 LOC), `tests/test_backfill_company_capabilities_from_deals.py` (111 LOC).
- `deploy.sh` root — deploy de la Cloud Function BQ sync.

En el sibling `cesargrowth11/hubspot-bigquery`:

- `services/hubspot_greenhouse_integration/` → reemplazado por `README.md` stub
- workflow del sibling para deploy del bridge → deshabilitado (no borrado; archivar comentado)

## Current Repo State

### Already exists

- Patrón `services/<name>/` con Dockerfile + deploy.sh + README vivo en:
  - `services/ops-worker/`
  - `services/commercial-cost-worker/`
  - `services/ico-batch/`
- Workload Identity Federation set up para al menos `ops-worker` (verificar en Fase 1 si es el mismo provider que se puede reusar).
- Cloud Run service `hubspot-greenhouse-integration` live en `us-central1`, revisión actual `hubspot-greenhouse-integration-00017-hf8` (post-TASK-572).
- Cliente HTTP en `src/lib/integrations/hubspot-greenhouse-service.ts` que define el contrato esperado (request/response shapes + códigos de error).
- Secret Manager entries: `GREENHOUSE_INTEGRATION_API_TOKEN`, `HUBSPOT_API_TOKEN`, `HUBSPOT_PORTAL_ID` ya creados (verificar nombres exactos en Fase 1).

### Gap

- El servicio vive físicamente fuera del monorepo.
- El deploy vive fuera del monorepo.
- Los tests viven fuera del monorepo.
- La doc funcional del bridge en `docs/documentation/` apunta a paths del sibling ("spec asumía `services/hubspot-greenhouse-integration/routes/products.ts`"), lo que confirma el gap de visibilidad histórico.
- No hay manera programática de que un agente en una sesión de `greenhouse-eo` vea el código del servicio sin montar el sibling en paralelo.
- No hay CI automático que falle si el cliente en `greenhouse-eo` cambia contrato pero el servicio en sibling queda atrás (hoy el drift solo aparece en staging smoke).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery + inventario cuantificado

- Clonar read-only `cesargrowth11/hubspot-bigquery` en un tmpdir.
- Inventariar todas las rutas del servicio: `/health`, `/contract`, `POST /deals`, `/companies/*`, `/products/*`, `/invoices`, `/companies/:id/lifecycle`, y cualquier otra viva.
- Inventariar env vars que el servicio lee (grep `os.environ` / `os.getenv`).
- Dump de Cloud Run service config: `gcloud run services describe hubspot-greenhouse-integration --region us-central1 --format yaml > /tmp/cloudrun-baseline.yaml`. Snapshot de SA, secrets mounts, env vars, revision actual, traffic split.
- Snapshot de IAM policy del service: `gcloud run services get-iam-policy …`.
- Git log de los últimos 90 días tocando `services/hubspot_greenhouse_integration/` — lista concreta de commits para validar ROI.
- Grep cross-servicio del sibling: imports desde `services/hubspot_greenhouse_integration/` hacia otros módulos del sibling, y vice-versa. Cualquier coupling debe quedar declarado.
- Verificar si `services/ops-worker/` ya usa Workload Identity Federation; si sí, dump del provider + SA utilizados para reusarlos.
- **Output**: un `plan.md` con el inventario completo antes de tocar código.

### Slice 2 — Extracción con historial vía `git filter-repo`

- Instalar `git-filter-repo` si no está.
- Clonar fresh del sibling (`git clone --no-local cesargrowth11/hubspot-bigquery /tmp/hbi-extract`).
- Correr `git filter-repo --path services/hubspot_greenhouse_integration/ --path-rename services/hubspot_greenhouse_integration/:services/hubspot_greenhouse_integration/` para dejar SOLO ese subdirectorio con su historia.
- Desde `greenhouse-eo`: agregar como remote temporal + `git merge --allow-unrelated-histories --no-ff <filtered-ref>`.
- Verificar con `git log --follow services/hubspot_greenhouse_integration/app.py` que el historial quedó preservado.
- Commit de merge: `chore: merge hubspot-greenhouse-integration service history (TASK-574)`.

### Slice 3 — Infra per-service (Dockerfile + deploy.sh + tests en CI)

- `Dockerfile` Python 3.12-slim: `COPY services/hubspot_greenhouse_integration/ /app/`, `pip install --no-cache-dir -r requirements.txt`, expone `$PORT`, ENTRYPOINT `gunicorn --bind :${PORT:-8080} app:app` (matchea Procfile actual).
- `deploy.sh` adaptado a WIF (sin `.env.yaml` generation local — ese mecanismo queda sustituido por `--set-env-vars` + `--set-secrets` desde el GitHub Actions workflow).
- 3 secretos Secret Manager confirmados:
  - `hubspot-access-token` → env `HUBSPOT_ACCESS_TOKEN`
  - `greenhouse-integration-api-token` → env `GREENHOUSE_INTEGRATION_API_TOKEN`
  - `hubspot-app-client-secret` → env `HUBSPOT_APP_CLIENT_SECRET`
- 2 env vars de runtime no-secret:
  - `GREENHOUSE_BASE_URL`
  - `HUBSPOT_GREENHOUSE_BUSINESS_LINE_PROP` (default `linea_de_servicio`)
  - `HUBSPOT_GREENHOUSE_SERVICE_MODULE_PROP` (default `servicios_especificos`)
- `README.md` del servicio: rutas live, cómo correr local (docker run + env), cómo agregar ruta, cómo deploy, cómo validar signature de webhook HubSpot, cómo leer logs.
- Actualizar `.gcloudignore` del monorepo para excluir `services/hubspot_greenhouse_integration/` del build del Next.js.
- Job `pytest` en GitHub Actions condicional a cambios en `services/hubspot_greenhouse_integration/**`. Python 3.12, `pip install -r requirements.txt` + `pytest`. **Primera CI que este código tiene nunca** — el baseline es 0.
- Incluir en el job test del webhook signature validation (`validate_hubspot_request_signature` + `validate_hubspot_request_signature_v1`) como regression guard obligatorio.

### Slice 4 — Deploy workflow + WIF

- Nuevo `.github/workflows/hubspot-greenhouse-integration-deploy.yml` con triggers:
  - `push` a `main` con changes en `services/hubspot_greenhouse_integration/**` → deploy production
  - `push` a `develop` con changes → deploy staging (si aplica)
  - `workflow_dispatch` manual con input `environment`
- Autenticación vía Workload Identity Federation (provider del mismo `efeonce-group` project, SA dedicada al workflow o reusada del `ops-worker` si su scope calza).
- Steps: checkout → setup-gcloud con WIF → `bash services/hubspot_greenhouse_integration/deploy.sh`.
- Smoke post-deploy: `GET /health` + `GET /contract` contra la URL live. Falla el workflow si el smoke falla.

### Slice 5 — IAM + secrets transfer

- En el GCP project, agregar al SA del nuevo workflow los roles:
  - `roles/run.admin` sobre el Cloud Run service `hubspot-greenhouse-integration`
  - `roles/secretmanager.secretAccessor` sobre los secrets consumidos por el servicio
  - `roles/iam.serviceAccountUser` sobre el runtime SA del Cloud Run (para poder desplegarse como tal)
- Remover (tras validación) los mismos roles del SA del workflow del sibling.
- Documentar el nuevo IAM en `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`.

### Slice 6 — Cutover atómico

- PR único que contiene:
  - En `greenhouse-eo`: nuevo workflow habilitado + deploy production ejecutado manualmente PREVIAMENTE via `workflow_dispatch` y validado.
  - En `cesargrowth11/hubspot-bigquery` (PR paralelo fusionado en la misma ventana):
    - `services/hubspot_greenhouse_integration/` reemplazado por un `README.md` stub:
      > Moved to `efeoncepro/greenhouse-eo/services/hubspot_greenhouse_integration/` on YYYY-MM-DD.
      > This sibling now owns only the HubSpot → BigQuery ingestion pipeline.
    - Workflow de deploy del sibling para este servicio: deshabilitado (comentado con nota apuntando al nuevo workflow).
- Validación post-cutover:
  - `gcloud run services describe hubspot-greenhouse-integration --region us-central1` muestra revisión nueva desde el monorepo.
  - `pnpm staging:request POST /api/commercial/organizations/<id>/deals '{...}'` retorna `status='completed'`.
  - Smoke en production (manual, low-stakes endpoint como `/health`).
- Rollback plan: el sibling sigue teniendo el código hasta N+1 semanas después del cutover (solo se marca "moved" pero los archivos no se borran en el cutover mismo — se borran en un PR de limpieza 1 semana después si no hubo regresión).

### Slice 7 — Docs + agent rules + skill migration

- Actualizar `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`:
  - Sección 3 re-scoped: `hubspot-bigquery` es solo BQ ingestion + HubSpot Developer Platform app config.
  - Nueva sección o nota explícita: "HubSpot write bridge + webhooks inbound viven en `greenhouse-eo/services/hubspot_greenhouse_integration/`".
  - Tabla quick-reference: fila "HubSpot deals/companies/products/quotes/webhooks bridge" → `greenhouse-eo`.
- Actualizar `AGENTS.md`, `project_context.md`, `CLAUDE.md`, `.codex/` equivalentes.
- Actualizar `docs/documentation/finance/crear-deal-desde-quote-builder.md` + cualquier doc funcional que referencie el sibling como owner del bridge.
- **Skill migration obligatoria**: mover `skills/efeonce-hubspot-greenhouse-ops/` del sibling a:
  - `.claude/skills/hubspot-greenhouse-bridge/` (formato Claude, filename `skill.md` lowercase)
  - `.codex/skills/hubspot-greenhouse-bridge/` (formato Codex, filename `SKILL.md` uppercase)
  - Actualizar refs internas del skill al nuevo path del servicio.
- Actualizar `Handoff.md` con la fecha de cutover + métricas (revision deployada, time-to-deploy del nuevo workflow, duración end-to-end del primer pytest en CI).
- Actualizar `changelog.md`.

### Slice 8 — Post-cutover cleanup

- 1 semana después del cutover (si no hubo regresión):
  - PR de limpieza en sibling: borrar físicamente el contenido viejo de `services/hubspot_greenhouse_integration/`, dejando solo el README stub.
  - PR en `greenhouse-eo`: borrar cualquier referencia residual al sibling como owner del bridge.
- Registrar cierre en `Handoff.md` + `changelog.md`.

## Out of Scope

- Migrar el pipeline HubSpot → BigQuery ingestion. Sigue en el sibling.
- Cambiar el lenguaje del servicio (Python se queda). Una rewrite a TypeScript no está justificada; el dolor es de ubicación, no de stack.
- Cambiar la URL pública del Cloud Run o crear un segundo service paralelo.
- Consolidar el BQ sync o `notion-bigquery` en el monorepo. Esta task es narrow por diseño.
- Reescribir el cliente `src/lib/integrations/hubspot-greenhouse-service.ts`. El contrato HTTP queda idéntico.

## Detailed Spec

### Topología destino

```
greenhouse-eo/
├── services/
│   ├── commercial-cost-worker/
│   ├── hubspot_greenhouse_integration/          ← nuevo (Python)
│   │   ├── app.py                                ← migrado con historial
│   │   ├── hubspot_client.py                     ← migrado
│   │   ├── contract.py                           ← migrado
│   │   ├── requirements.txt                      ← migrado
│   │   ├── tests/                                ← migrado
│   │   ├── Dockerfile                            ← nuevo (estilo ops-worker)
│   │   ├── deploy.sh                             ← nuevo (estilo ops-worker)
│   │   ├── README.md                             ← nuevo
│   │   └── .dockerignore                         ← nuevo
│   ├── ico-batch/
│   └── ops-worker/
└── .github/
    └── workflows/
        ├── ops-worker-deploy.yml
        └── hubspot-greenhouse-integration-deploy.yml  ← nuevo
```

### Autenticación deploy (WIF)

- Provider: `projects/<project-number>/locations/global/workloadIdentityPools/github-pool/providers/github-provider` (reusar si existe).
- SA: `github-deploy-hubspot-bridge@efeonce-group.iam.gserviceaccount.com` (nueva; dedicada para este workflow).
- Attribute mapping: `google.subject = assertion.sub`, `attribute.repository = assertion.repository`.
- Attribute condition: `assertion.repository == "efeoncepro/greenhouse-eo"`.
- GitHub Actions step: `google-github-actions/auth@v2` con `workload_identity_provider` + `service_account`.

### IAM sobre el Cloud Run service

```
resource: projects/efeonce-group/locations/us-central1/services/hubspot-greenhouse-integration
bindings:
  - role: roles/run.admin
    members:
      - serviceAccount:github-deploy-hubspot-bridge@efeonce-group.iam.gserviceaccount.com
  - role: roles/run.invoker
    members: <consumidores actuales> (sin cambios)
```

### Cutover checklist (máquina de estados)

```
[estado inicial]
  greenhouse-eo: no tiene el servicio
  sibling: deploya el servicio
  Cloud Run: última revisión desde sibling

[Fase 6 pre-cutover]
  greenhouse-eo: historial extraído + Dockerfile + deploy.sh + workflow presente pero NO triggered
  sibling: sin cambios aún
  Cloud Run: última revisión aún desde sibling

[workflow_dispatch manual, production]
  greenhouse-eo deploya nueva revisión → Cloud Run tiene revisión nueva desde monorepo
  smoke valida GET /health y POST /deals idempotent
  si falla → rollback trivial: el sibling sigue pudiendo deployar

[PR de cutover merge]
  greenhouse-eo: workflow ya validado, mergea main
  sibling: stub README + workflow disabled, mergea main
  AGENTS.md + docs actualizados en el mismo PR de greenhouse-eo

[post-cutover]
  solo greenhouse-eo puede deployar el servicio
  sibling conserva el código 1 semana para rollback manual (copiar-pegar si todo falla)

[Slice 8, +7 días]
  sibling borra físicamente los archivos viejos
  se cierra la task
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `services/hubspot_greenhouse_integration/` existe en `greenhouse-eo` con los 8 módulos Python migrados + `Procfile` + `requirements.txt` + `tests/`.
- [ ] `git log --follow services/hubspot_greenhouse_integration/app.py` muestra commits originales del sibling (no un squash).
- [ ] `Dockerfile` + `deploy.sh` + `README.md` + `.dockerignore` siguen patrón `services/ops-worker/`.
- [ ] Entrypoint gunicorn matchea Procfile actual del sibling: `gunicorn --bind :${PORT:-8080} app:app`.
- [ ] Workflow `.github/workflows/hubspot-greenhouse-integration-deploy.yml` deploya al mismo Cloud Run service (`hubspot-greenhouse-integration` en `us-central1`) sin cambio de URL pública.
- [ ] Autenticación deploy usa Workload Identity Federation (no SA-key JSON en GitHub Secrets).
- [ ] Workflow `.github/workflows/hubspot-greenhouse-integration-test.yml` corre pytest en PR con cambios a `services/hubspot_greenhouse_integration/**`.
- [ ] 3 secretos wired correctamente vía `--set-secrets`: `HUBSPOT_ACCESS_TOKEN`, `GREENHOUSE_INTEGRATION_API_TOKEN`, `HUBSPOT_APP_CLIENT_SECRET`.
- [ ] SA del workflow del monorepo tiene `roles/run.admin` sobre el service; SA del sibling lo perdió (audit via `gcloud run services get-iam-policy`).
- [ ] Sibling `cesargrowth11/hubspot-bigquery` tiene `services/hubspot_greenhouse_integration/README.md` stub apuntando al monorepo + workflow/deploy.sh deshabilitados (no borrados aún; cleanup en Slice 8).
- [ ] `greenhouse-eo` consumer (`src/lib/integrations/hubspot-greenhouse-service.ts`) NO sufrió cambios — misma URL base en `.env.example`.
- [ ] Las 17 rutas responden en la revisión nueva: regression smoke por cada una (`GET /health`, `GET /contract`, `GET /deals/metadata`, `GET /companies/<id>`, `GET /companies/search`, `GET /companies/<id>/owner`, `GET /companies/<id>/contacts`, `GET /services/<id>`, `GET /companies/<id>/services`, `POST /deals`, `GET /products`, `GET /products/<id>`, `POST /products`, `POST /products/<id>/archive`, `GET /products/reconcile`, `GET /quotes/<id>/line-items`, `GET /companies/<id>/quotes`, `POST /quotes`, `POST /webhooks/hubspot`).
- [ ] Staging smoke: `pnpm staging:request POST /api/commercial/organizations/<id>/deals` retorna `status='completed'`.
- [ ] Webhook smoke: emitir un webhook HubSpot sandbox con firma válida al `POST /webhooks/hubspot` nuevo y verificar que `GreenhouseClient.sync_capabilities` llega a `greenhouse-eo`.
- [ ] Webhook signature validation regression test passes (signature v1 + v3).
- [ ] Skill migrada a `.claude/skills/hubspot-greenhouse-bridge/` y `.codex/skills/hubspot-greenhouse-bridge/`.
- [ ] `GREENHOUSE_REPO_ECOSYSTEM_V1.md` sección 3 re-scoped; quick-reference actualizada.
- [ ] `AGENTS.md`, `CLAUDE.md`, `project_context.md`, y `.codex/` equivalentes actualizados.
- [ ] `docs/documentation/finance/crear-deal-desde-quote-builder.md` apunta al nuevo path.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build` siguen verdes en `greenhouse-eo` (el Python service está excluido del Next.js build vía `.gcloudignore` y `.dockerignore`).
- [ ] Follow-up TASK creada para migrar el `hsproject.json` del sibling de v2025.2 a v2026.03 (upgrade estratégico, sin deadline duro; v2025.1 es la que expira 2026-08-01, v2025.2 sigue soportada).

## Verification

- Revisión Cloud Run nueva desde monorepo (`gcloud run revisions list --service hubspot-greenhouse-integration --region us-central1` muestra revisión más reciente con label `deployed-from=greenhouse-eo`).
- Smoke manual desde staging: crear deal inline, validar `hubspot_deal_id` real en HubSpot sandbox.
- IAM audit: `gcloud run services get-iam-policy hubspot-greenhouse-integration --region us-central1` muestra al SA del monorepo como admin, al del sibling removido.
- `git log --follow` sobre archivos migrados muestra commits originales, no un único squash.
- Agent drill: abrir una conversación nueva y pedir "dame el código que valida `hubspotCompanyId` en `POST /deals`" — el agente debe encontrarlo sin clonar otro repo.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] Archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` documenta el cutover (fecha, revisión, smoke ejecutado)
- [ ] `changelog.md` registra la mudanza y el efecto en workflow de agentes
- [ ] Chequeo cruzado sobre `TASK-540`, `TASK-552`, `TASK-563`, `TASK-572`, `TASK-573`: deltas de "el servicio ahora vive en el monorepo"
- [ ] Sibling `cesargrowth11/hubspot-bigquery` tiene el PR de stub mergeado y documentado
- [ ] Slice 8 (post-cutover cleanup) ejecutada o agendada explícitamente

## Follow-ups

- `TASK-576` debe poder ejecutarse sobre la topología resultante de `TASK-574` sin redescubrir el servicio; por eso esta task debe dejar inventariados y documentados los módulos, endpoints y tests que tocan `/quotes`, asociaciones, line items y cualquier future update path.
- **Migrar el HubSpot Developer Platform app del sibling (`hsproject.json` + `src/app/`) de v2025.2 a 2026.03** — upgrade estratégico para acceder a Serverless Functions (reintroducidas en 2026.03), Webhooks Journal batched reads, MCP Auth Apps, App Pages y Code Sharing via npm workspaces. Sin deadline duro: v2025.2 no tiene EOL anunciado (solo v2025.1 expira 2026-08-01). La ventana natural para migrar es antes de fin de 2026 para mantenerse dentro del ciclo Supported. Task independiente; vive en sibling porque gobierna el BQ sync auth, no el Cloud Run absorbido.
- Evaluar absorber también `notion-bigquery` y `notion-teams` bajo la misma lógica (cada uno con su task si el ROI justifica).
- Integración lint end-to-end: al cambiar `src/lib/integrations/hubspot-greenhouse-service.ts`, el CI podría correr automáticamente contract tests contra `services/hubspot_greenhouse_integration/tests/` para detectar drift de contrato antes de staging.
- Evaluar migrar el servicio de `flask + gunicorn` a `fastapi + uvicorn` (fuera de scope — el dolor es de ubicación, no de framework).
- Evaluar absorber los scripts ops (`create_hubspot_properties.py`, `backfill_company_capabilities_from_deals.py`) al `scripts/` del monorepo si operaciones los necesita visibles desde greenhouse-eo. Hoy viven lejos del Cloud Run runtime, pueden quedar en sibling.

## Open Questions

Resueltas en el kick-off (2026-04-23):

- **Git strategy**: `git filter-repo --path services/hubspot_greenhouse_integration/` sobre clone fresh del sibling, luego `git merge --allow-unrelated-histories` en `greenhouse-eo`. Preserva blame + fechas + authors. No subtree squash.
- **Autenticación deploy**: Workload Identity Federation obligatorio. No SA-key JSON. Si `services/ops-worker/` ya tiene provider, reusar; si no, setup WIF en Slice 4.
- **Ownership Cloud Run**: un solo admin (SA del monorepo workflow); SA del sibling removido en cutover atómico con `gcloud run services remove-iam-policy-binding`.
- **Coupling con BQ sync**: contrato HTTP público como único punto de integración entre los dos bridges. Cualquier code-share se duplica localmente en el nuevo servicio (copia > dependencia invisible).
- **Priority/Effort**: P1 / Alto. Developer-velocity multiplier confirmado post-inspección del sibling: 17 rutas activas + webhook handler + 3116 LOC + 1341 LOC de tests + skill dedicada = cada task HubSpot↔Greenhouse futura se vuelve monorepo-native.

Resueltas durante la inspección del sibling (2026-04-23):

- **`hsproject.json` + `src/app/`**: se QUEDAN en sibling — son config de la app HubSpot Developer Platform v2025.2 usada por el BQ sync (token estático del Developer App). v2025.2 NO está deprecada (solo v2025.1 expira 2026-08-01). Migrar a v2026.03 es un upgrade estratégico (acceso a Serverless Functions + Webhooks Journal v4 batched + MCP Auth Apps), NO un rescate por deadline. Follow-up independiente de TASK-574.
- **Compatibilidad con `TASK-576`**: la absorción debe dejar claro dónde viven `POST /quotes`, `GET /quotes/{id}/line-items`, asociaciones y tests relacionados, para que el cierre de quote publish-ready ocurra sin ambigüedad después del cutover.
- **Scripts ops**: se QUEDAN en sibling (`create_hubspot_properties.py`, `backfill_company_capabilities_from_deals.py`, `rotate_greenhouse_integration_secret.py`) — operan sobre el portal HubSpot / Secret Manager, no sobre el runtime del servicio.
- **Skill `skills/efeonce-hubspot-greenhouse-ops/`**: migra al monorepo en Slice 7.
- **Webhook handler `POST /webhooks/hubspot`**: migra junto con el resto del servicio. HubSpot app webhook URL apunta al Cloud Run URL (mismo URL post-cutover, sin cambio de config en el portal HubSpot).
- **Segundo bridge en `greenhouse_bridge.py` + `greenhouse_bridge_adapter.py`**: se QUEDA en sibling — es parte del Cloud Function BQ sync (`main.py`), NO del Cloud Run absorbido. Coupling con Greenhouse-EO vía HTTP se mantiene sin cambio.
- **Tres secretos (no dos)**: `HUBSPOT_ACCESS_TOKEN`, `GREENHOUSE_INTEGRATION_API_TOKEN`, `HUBSPOT_APP_CLIENT_SECRET`. Los tres viven ya en Secret Manager del GCP project `efeonce-group`.
- **CI baseline en sibling = 0**: el nuevo workflow es la primera CI/CD que este código tiene. Esto sube la barra de calidad del primer deploy desde monorepo (smoke de las 17 rutas + webhook signature regression).
