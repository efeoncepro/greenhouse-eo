# Audit — notion-bq-sync per-space token rollout + deprecated Notion API discovery

> **Tipo:** Auditoría técnica + operativa (reusable / handoff de sesión)
> **Fecha:** 2026-06-03
> **Autor:** Claude (sesión wizard alta de cliente + TASK-1000 rollout)
> **Repos tocados:** `efeoncepro/greenhouse-eo` (wizard) + `efeoncepro/notion-bigquery` (Cloud Run sync, repo hermano)
> **Tasks relacionadas:** TASK-992/998/1001 (wizard), TASK-1000 (per-space token, in-progress), **TASK-1003 (migración endpoint, nueva — creada por este audit)**
> **Estado al cierre:** estado seguro. Efeonce/Sky intactos. Berel `sync_enabled=FALSE`. Per-space infra desplegada y verificada. Bloqueador real identificado (endpoint deprecado) → TASK-1003.

---

## 0. TL;DR

1. **Wizard de alta de cliente (gaps #5/#7): RESUELTO + desplegado + verificado.** Las fases comerciales ahora persisten y auto-completan su ítem; el ítem de Notion se materializa `in_progress` (no `pending`). Commit `d91751d97` en `develop` (staging live). Live test contra DB real + GVC del ficha de Berel.
2. **TASK-1000 (per-space Notion token): infra desplegada y verificada,** PERO **Berel no puede sincronizar todavía** por un bloqueador real distinto del token.
3. **Hallazgo crítico:** el Cloud Run `notion-bq-sync` consume el endpoint **DEPRECADO** `POST /v1/databases/{id}/query` (Notion lo deprecó 2025-09-03). Efeonce/Sky funcionan **solo** porque tienen guardados **database ids viejos** que ese endpoint aún acepta. Berel tiene **data_source ids** (lo canónico 2026, lo que devuelve `/v1/search`) → el endpoint viejo los rechaza con **404**. **Es una bomba de tiempo:** cuando Notion apague el endpoint viejo, se rompe el sync de Efeonce/Sky → se rompen los bonos de payroll.
4. **Decisión (Solution Quality Contract — NO parches):** NO se guardan parent database ids para meter a Berel por el endpoint viejo. El fix robusto/escalable es **migrar el sync al endpoint canónico `/v1/data_sources/{id}/query` + Notion-Version `2026-03-11`** → **TASK-1003** (cross-repo, payroll-crítico, con gate de paridad de filas sobre Efeonce/Sky antes del cutover).
5. **El wizard YA es canónico** (guarda data_source ids). El laggard es el sync, no el wizard.

---

## 1. Contexto de la sesión

Sesión continuación del hardening del **wizard de alta de cliente** (`/agency/clients/new`, TASK-992/998/1001). Objetivos del usuario:
- Cerrar los gaps detectados (fases no persistían; ítem de Notion mostrado como pendiente).
- Ejecutar el rollout TASK-1000 (per-space Notion token en el repo hermano) — "avanza con todo, que no quede nada a medias".
- Al toparse con el 404 de Berel: el usuario detectó el riesgo arquitectónico ("¿Sky y Efeonce funcionan porque usan la API vieja? esto hay que resolverlo") y exigió solución robusta, no parche.

---

## 2. Wizard de alta — gaps #5 / #7 (RESUELTO)

### Gap #5 — las fases comerciales se perdían
El wizard capturaba `phases` en el estado pero `handleSubmit` **no las enviaba** → se perdían. El ítem `declare_engagement_phases` quedaba siempre `pending`.

**Fix (cadena completa):** `ClientOnboardingView.handleSubmit` envía `phases` → `route parsePhases()` → `provisionClientFromWizard` persiste `metadata.phases` + agrega `declare_engagement_phases` a `autoCompleteItemCodes` cuando hay fases → `provisionClientLifecycle` materializa el ítem `completed`.

### Gap #7 — ítem de Notion deshonesto
`provision_notion_workspace` tiene `requires_evidence=TRUE` → **nunca** puede auto-completarse sin asset. Cuando el alta vinculó Notion, mostrarlo `pending` era deshonesto.

**Fix:** nuevo param `autoInProgressItemCodes` en `provisionClientLifecycle`. Cuando `notionConnected || notionAnchors`, el ítem se materializa `in_progress` (status `info`, "En curso"), no `pending`. Espejo del patrón `dismiss-phantom` (estado sobre la fila).

### Verificación
- `tsc` 0, lint 0, suite focal 55 passing.
- **Live test contra DB real** (`provision-client-from-wizard.live.test.ts`): phases→`completed` + Notion→`in_progress`, revertido.
- **Berel backfilled:** `provision_notion_workspace` `pending` → `in_progress` (vínculo real).
- **GVC del ficha** (`/agency/clients/org-32333527.../lifecycle`): banner "Onboarding en curso — 4 de 10 completados", items 1/3/4 Completado, contrato/fases/equipo Pendiente honesto. Queja original ("todo falta") resuelta.

**Commit:** `d91751d97` en `develop` (pusheado). Archivos: `provision-client-lifecycle.ts`, `provision-client-from-wizard.ts`, `provision/route.ts`, `ClientOnboardingView.tsx`, `provision-client-from-wizard.live.test.ts`.

### Checklist canónico (10 ítems, template `standard_onboarding_v1`)
Auto-completables por el alta (sin evidencia): `verify_hubspot_company_synced` (si HubSpot+companyId), `declare_engagement_kind` (si clientKind), `declare_commercial_terms` (si paymentCurrency), `declare_engagement_phases` (si phases) [**nuevo #5**], `provision_communication_channels` (si teamsAnchor).
In-progress por el alta: `provision_notion_workspace` (si Notion vinculado) [**nuevo #7**, requires_evidence].
Humanos post-alta (quedan pending): `confirm_legal_documents` (evidencia), `assign_team_members`, `provision_client_users_access` (TASK-1001), `confirm_billing_setup`.

---

## 3. TASK-1000 — per-space Notion token rollout (DESPLEGADO + VERIFICADO; bloqueado por TASK-1003)

### Qué se desplegó (repo hermano `notion-bigquery`, Cloud Run `notion-bq-sync`, us-central1)

**IAM** al SA `183008134038-compute@developer.gserviceaccount.com` (reversible, dormante hasta flag ON):
- `roles/cloudsql.client` (project-level `efeonce-group`) — para el Cloud SQL Connector.
- `roles/secretmanager.secretAccessor` en `notion-integration-token-greenhouse-grupo-berel` (token scoped de Berel) y `greenhouse-pg-dev-app-password` (password de `greenhouse_app`).

**Deploy** (`bash deploy.sh` → Cloud Build desde source, git HEAD `5a6766c`):
- Revisión `00018-5g9` (flag OFF) → luego `00019-fgp` (flag ON + PG env).
- **Bug encontrado:** el tráfico estaba **pinneado a `00017-pct`** (revisión vieja del 2026-05-26, `latestRevision: None`) → las revisiones nuevas se creaban con **0% tráfico**. Resuelto con `gcloud run services update-traffic notion-bq-sync --to-latest` → 100% → `00019-fgp`.

**Env vars agregadas** (revisión `00019-fgp`):
```
NOTION_PER_SPACE_TOKEN_ENABLED=true
GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev
GREENHOUSE_POSTGRES_DB=greenhouse_app
GREENHOUSE_POSTGRES_USER=greenhouse_app
GREENHOUSE_POSTGRES_PASSWORD=<secret greenhouse-pg-dev-app-password:latest>
```

### Verificado funcionando (ortogonal al bloqueador)
- **PG conecta desde Cloud Run** (Cloud SQL Connector + password auth + IAM): log `Loaded 0 per-client space config(s) from PG SSOT` (Berel FALSE) y `Loaded 1` (Berel TRUE).
- **Degrade-to-today confirmado:** con flag ON + Berel FALSE → GET health devuelve 2 spaces (Efeonce + Sky), idéntico a hoy.
- **Efeonce/Sky sincronizan OK** con el código nuevo + token global: full sync 1374 tareas Efeonce + 4118 tareas Sky + 88 proyectos + 16 sprints, **0 errores**.
- **El token scoped de Berel funciona** (acceso confirmado vía `/v1/search` → 200, 10 resultados).

### El bloqueador (ver §4)
Con Berel `sync_enabled=TRUE`, el sync intentó `POST /v1/databases/{berel_data_source_id}/query` → **404** en las 3 bases (3 reintentos cada una, aislado a Berel; Efeonce/Sky sin afectación). **Berel revertido a `sync_enabled=FALSE`** (estado seguro).

---

## 4. HALLAZGO CRÍTICO — endpoint Notion deprecado (bomba de tiempo payroll)

### Evidencia (token scoped grupo-berel, db tareas `35c39c2f-efe7-8139-8448-000b7ed67b13`)

| Test | Endpoint | Notion-Version | HTTP |
|---|---|---|---|
| A | `GET /v1/databases/{id}` (retrieve as DB) | 2022-06-28 | **404** |
| B | `POST /v1/databases/{id}/query` (**lo que usa el sync**) | 2022-06-28 | **404** |
| C | `GET /v1/data_sources/{id}` | 2026-03-11 | **200** ✓ |
| D | `POST /v1/data_sources/{id}/query` (**canónico 2026**) | 2026-03-11 | **200** ✓ |
| E | `/v1/search` (qué ve el token) | 2026-03-11 | **200**, 10 results, parents `data_source_id` |

### Causa raíz
- **El sync `notion-bq-sync` usa `POST /v1/databases/{id}/query`**, deprecado por Notion **desde 2025-09-03** (ver skill `notion-platform` §0). Sigue funcional pero en tiempo prestado.
- **Efeonce/Sky** tienen guardados **database ids viejos** → el endpoint deprecado los acepta. *Por eso funcionan.*
- **Berel** tiene **data_source ids** (lo que devuelve `/v1/search`, modelo 2026; el wizard `discoverNotionDatabasesForToken` los guarda) → el endpoint viejo los rechaza (404).
- **El wizard YA es canónico** (data_source ids). El **sync es el laggard** (endpoint + Notion-Version viejos).

### El modelo de datos Notion 2026 (database vs data_source)
- Una **database** (contenedor) tiene N **data_sources** (tablas queryables). El `/v1/search` 2026 devuelve data_sources cuyo `parent.type='database_id'`.
- Berel: cada DB tiene 1 data_source. `GET /v1/data_sources/{ds}` → `parent.database_id`. Ejemplos resueltos:
  - tareas ds `35c39c2f-efe7-8139-...` → parent db `35c39c2f-efe7-80c9-bc37-e811a7b95a7c`
  - sprints ds `35c39c2f-efe7-81cd-...` → parent db `35c39c2f-efe7-80ef-bf33-d63d6910eed0`
  - (la resolución de parent salió **inconsistente** en un retry — 2 de 3 vacías → chasing parent ids es frágil, otra razón para NO parchear).

### Por qué es riesgo payroll
El extractor de Efeonce/Sky alimenta **bonos de payroll** (métricas ICO: OTD, RpA, etc.). Cuando Notion apague `/v1/databases/{id}/query`, el sync se rompe silenciosamente → métricas stale → bonos mal calculados. **No es hipotético: es deuda deprecada activa.**

---

## 5. Decisión arquitectónica (NO parche)

### Rechazado: guardar parent database ids de Berel
Meter a Berel por el endpoint viejo (guardando `parent.database_id`). Dobla la apuesta sobre infra deprecada + resolución de parent frágil. **Viola Solution Quality Contract.**

### Aceptado: migrar el sync al endpoint canónico → **TASK-1003**
`POST /v1/data_sources/{id}/query` + Notion-Version `2026-03-11`:
1. **Berel funciona nativo** (sus ids ya son data_source ids).
2. **Efeonce/Sky se migran:** resolver database id → data_source id (`GET /v1/databases/{id}` → `data_sources[0].id`), guardar el data_source id, apuntar al endpoint nuevo. Mata la deuda deprecada para todos.
3. **Escalable:** todo cliente nuevo entra por el camino canónico, cero casos especiales.
4. **El wizard NO se toca** (ya canónico).

### Por qué es migración cuidada (no end-of-session)
El bump `2022-06-28` → `2026-03-11` trae **breaking changes** (paginación `after→position`, `archived→in_trash`, shapes de respuesta). Requiere **gate de paridad de filas** sobre Efeonce/Sky (mismo row count + campos antes/después) **antes del cutover**, detrás de flag, reversible.

---

## 6. Estado actual del runtime (al cierre de sesión)

| Componente | Estado |
|---|---|
| `develop` (greenhouse-eo) | gaps #5/#7 mergeados (`d91751d97`) + staging live |
| Cloud Run `notion-bq-sync` | revisión `00019-fgp` (código `5a6766c`), 100% tráfico, **flag ON** |
| Efeonce/Sky sync | ✅ funcionando (código nuevo, token global, endpoint viejo) — full sync verificado 0 errores |
| Berel `space_notion_sources.sync_enabled` | **FALSE** (revertido — no errores en el diario; cliente nuevo sin data → cero impacto) |
| Berel `notion_token_secret_ref` | `notion-integration-token-greenhouse-grupo-berel` (data_source ids guardados) |
| IAM compute SA | cloudsql.client + secretAccessor (grupo-berel + pg-app-password) — activos |
| Cloud Scheduler `notion-bq-daily-sync` | recreado (03:00 America/Santiago) — corre flag ON, Berel FALSE → idéntico a hoy |

**Nota:** dejar la **flag ON** es seguro (con Berel FALSE el per-client carga 0 = idéntico a hoy) y deja la infra lista para cuando TASK-1003 aterrice. Reversible: `NOTION_PER_SPACE_TOKEN_ENABLED=false` + redeploy, o traffic a `00017-pct`.

---

## 7. Pendientes (continuación en otra sesión)

### TASK-1003 (nueva — el bloqueador real)
Migrar `notion-bq-sync` a `/v1/data_sources/{id}/query` + `2026-03-11`, con gate de paridad sobre Efeonce/Sky. **Bloquea TASK-1000.** Spec en `docs/tasks/to-do/TASK-1003-*.md`.

### TASK-1000 (per-space token) — infra lista, bloqueada por TASK-1003
Cuando TASK-1003 pase paridad: re-habilitar Berel (`sync_enabled=TRUE`) + smoke (debe extraer las 3 bases vía data_sources endpoint con su token scoped) + verificar `notion_ops` BQ + el pipeline conformed downstream (ver abajo).

### Pipeline conformed downstream (ops-worker, greenhouse-eo) — pendiente de verificar para Berel
El insight del usuario sobre **propiedades distintas** aplica acá: `notion-bq-sync` → `notion_ops` BQ es schema-agnostic (vuelca JSON crudo), pero `runNotionSyncOrchestration` (ops-worker) mapea `notion_ops` → `greenhouse_conformed.delivery_*` → PG `greenhouse_delivery.*` y **ahí sí importan los nombres de propiedad/estado**. Si Berel tiene columnas/estados custom (otro idioma, otro set), el cascade canónico los mapea a NULL/sin-clasificar (no rompe, deja data incompleta).
**Regla canónica (CLAUDE.md):** enforce del **template L1** en Notion ANTES del onboarding — NO agregar aliases custom-per-cliente. Cuando Berel tenga data real, auditar sus columnas vs el template Efeonce y estandarizar en Notion.

### Wizard de alta — estado
- Gaps #5/#7: **DONE** (esta sesión).
- Pendientes forward-looking (de la spec `GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md` §9): extraer `OriginCard`/stepper-rail/banner a `src/components/greenhouse/*` cuando emerja un 2º wizard; smoke E2E del alta en `tests/e2e/smoke/`; reconciliar Notion/Teams link (wizard) vs checklist (open question de gobernanza).
- TASK-1001 (invitar personas del portal en el onboarding): in-progress, separada.

### Limpieza menor
- Secreto huérfano `notion-integration-token-greenhouse-berel` (sin `grupo-`, de un intento previo de diagnóstico). Berel usa `-grupo-berel`. Evaluar borrarlo (verify-then-delete) — no urgente.

---

## 8. Comandos de referencia (para continuar)

```bash
# Estado del Cloud Run
gcloud run services describe notion-bq-sync --region=us-central1 --project=efeonce-group --format='value(status.latestReadyRevisionName)'
gcloud run revisions list --service=notion-bq-sync --region=us-central1 --project=efeonce-group --limit=3

# Health (ejercita load_all_space_configs → per-client PG)
curl -s 'https://notion-bq-sync-y6egnifl6a-uc.a.run.app' | python3 -m json.tool

# Logs per-client
gcloud run services logs read notion-bq-sync --region=us-central1 --project=efeonce-group --limit=30 | grep -iE "per-client|SSOT"

# Re-habilitar Berel (SOLO tras TASK-1003 + paridad): UPDATE greenhouse_core.space_notion_sources SET sync_enabled=TRUE WHERE space_id='space-cli-0863869c-eaac-4630-9bd0-af283c56f7fb'

# Revertir flag (emergencia): NOTION_PER_SPACE_TOKEN_ENABLED=false + redeploy, o:
# gcloud run services update-traffic notion-bq-sync --region=us-central1 --to-revisions=notion-bq-sync-00017-pct=100

# Repo hermano local
cd /Users/jreye/Documents/notion-bigquery   # HEAD 5a6766c, main con TASK-1000 (PRs #2 #3)
```

### IDs canónicos
- Berel org `org-32333527-02a8-487b-819e-6f76a761777d`, client `cli-0863869c`, space `space-cli-0863869c-eaac-4630-9bd0-af283c56f7fb`, case `clc-3fd39544-8e8a-47a2-bf53-c017500af277`.
- Berel data_source ids: tareas `35c39c2f-efe7-8139-8448-000b7ed67b13`, proyectos `35c39c2f-efe7-818f-bfc5-000bbf660c0f`, sprints `35c39c2f-efe7-81cd-bcc3-000b78ba002d`.
- Efeonce space `spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad`, Sky space `spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9` (database ids viejos en BQ `greenhouse.space_notion_sources`).
