# GREENHOUSE — notion-bq-sync: migración al endpoint canónico Notion `data_sources` (V1)

> **Tipo:** Spec de arquitectura + decisión (ADR embebido)
> **Versión:** 1.0
> **Creado:** 2026-06-04 por Claude (TASK-1003)
> **Estado:** ✅ Implementado y en producción (cutover live 2026-06-04)
> **Dominio:** `integrations.notion` · `cross-repo` · `infra` · payroll-crítico
> **Repos:** `efeoncepro/notion-bigquery` (Cloud Run, código del extractor) + `efeoncepro/greenhouse-eo` (SSOT PG, docs, downstream conformed)
> **Tasks:** TASK-1003 (esta migración) · TASK-1000 (per-space token, desbloqueada) · TASK-998 (teamspace linking) · TASK-992 (wizard de alta)
> **Evidencia fuente:** `docs/audits/notion/NOTION_BQ_SYNC_PER_SPACE_TOKEN_ROLLOUT_AND_DEPRECATED_API_AUDIT_2026-06-03.md`

---

## 1. Resumen ejecutivo

El extractor `notion-bq-sync` (Cloud Run, repo hermano `efeoncepro/notion-bigquery`) que alimenta Notion → BigQuery `notion_ops` → conformed → métricas ICO → **bonos de payroll** usaba el endpoint **deprecado** `POST /v1/databases/{id}/query` con `Notion-Version: 2022-06-28`. Notion lo deprecó el **2025-09-03**. Efeonce/Sky seguían funcionando **solo** porque tenían guardados *database ids viejos* que ese endpoint aún acepta; los clientes nuevos (Berel) tienen *data_source ids* (modelo 2026) que el endpoint viejo rechaza con **404**.

**TASK-1003 migró el extractor al endpoint canónico `POST /v1/data_sources/{id}/query` + `Notion-Version: 2026-03-11`**, con un **resolver runtime** que acepta ambos tipos de id, detrás de un **feature flag** (default OFF), validado por un **gate de paridad de filas** read-only sobre Efeonce/Sky antes del cutover. La migración mató la deuda deprecada para todos y desbloqueó el onboarding de clientes nuevos (TASK-1000/998).

**Resultado:** los 3 tenants (Efeonce, Sky, Berel) sincronizan por el endpoint canónico, paridad total verificada, cero errores, reversible <5 min.

---

## 2. Contexto: el modelo de datos Notion 2026 (database vs data_source)

Antes del 2025-09-03, en la API de Notion todo era **"database"**. Después, Notion hizo split:

```
Database (contenedor conceptual, wrapper de UI)
  └── Data Source[] (1+ por database — la entidad realmente queryable)
        └── Page[] (filas)
```

- En la práctica, **la mayoría de databases tienen 1 sola data source** (verificado empíricamente para los 7 datasets de Efeonce/Sky — todos 1:1).
- El endpoint de query cambió: `POST /v1/databases/{id}/query` (deprecado) → **`POST /v1/data_sources/{id}/query`** (canónico).
- El `/v1/search` del modelo 2026 devuelve **data_sources** (parent `database_id`), no databases. Por eso el wizard de alta (`discoverNotionDatabasesForToken`, TASK-998) guarda **data_source ids** — ya es canónico.

**La inconsistencia que generó el bug:** Efeonce/Sky fueron registrados antes del split → tienen *database ids* guardados. Berel se registró con el wizard 2026 → tiene *data_source ids*. El extractor usaba el endpoint viejo (acepta database ids, rechaza data_source ids con 404). El extractor era el laggard; el wizard ya estaba al día.

Referencia: skill `notion-platform` §0 + `developer-platform-2026/data-sources-vs-databases.md` + `notion-version-history.md`.

---

## 3. Por qué era una bomba de tiempo payroll

```
Notion → notion-bq-sync (extractor) → BigQuery notion_ops.raw_pages_snapshot + stg_*
       → ops-worker runNotionSyncOrchestration → greenhouse_conformed.delivery_*
       → PG greenhouse_delivery.* → métricas ICO (OTD, RpA, FTR…) → bonos de payroll
```

El endpoint deprecado seguía funcional **en tiempo prestado**. Cuando Notion lo apagara, el sync de Efeonce/Sky se rompería **silenciosamente** → métricas stale → bonos mal calculados. No era hipotético: era deuda deprecada activa sobre el path más sensible del negocio.

---

## 4. Decisión arquitectónica

### 4.1 Elegido — Resolución runtime del id (database ↔ data_source)

El extractor resuelve, en runtime, el id configurado a un **data_source id queryable**, y usa **siempre** el endpoint canónico. Maneja ambos tipos por construcción:

- `GET /v1/data_sources/{id}` → 200 ⇒ el id YA es un data_source (Berel/clientes nuevos del wizard) → úsalo directo.
- Si no (404) ⇒ `GET /v1/databases/{id}` → `data_sources[0].id` (Efeonce/Sky con database ids legacy).
- `> 1` data_source ⇒ **fail-fast** (nunca adivinar; el caller aísla ese space).

### 4.2 Rechazado — Migración de datos previa (resolver+guardar ids antes del cutover)

Crea ventana de estado mixto + dos fuentes de verdad durante la transición + un one-shot con ambigüedad multi-data-source que si sale mal toca payroll. El runtime resolver lo evita: Efeonce/Sky siguen con sus ids actuales y funcionan; el cleanup (Slice 4) es opcional y desacoplado del riesgo.

### 4.3 Rechazado — Soportar ambos endpoints (databases legacy + data_sources nuevos)

Mantiene vivo el endpoint deprecado = no mata la deuda (el objetivo de la task). El runtime resolver usa **siempre** el endpoint nuevo; solo el *id* se resuelve.

### 4.4 Rechazado — Parche: guardar parent database ids de Berel

Meter a Berel por el endpoint viejo guardando `parent.database_id`. Dobla la apuesta sobre infra deprecada + la resolución de parent salió frágil/inconsistente en pruebas. Viola el Solution Quality Contract.

### 4.5 Notion-Version `2026-03-11`

Consistente con `discoverNotionDatabasesForToken` (el wizard ya usa 2026-03-11) + el canon de la skill `notion-platform`. Por env var (`NOTION_VERSION`) para pinear/revertir sin redeploy de código. El riesgo del bump lo absorbió el gate de paridad.

---

## 5. Implementación (extractor, `main.py`)

Todo gateado por `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` (default **OFF** → bit-for-bit con el comportamiento previo).

| Pieza | Cambio |
| --- | --- |
| `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` | flag env (default OFF). ON = endpoint canónico + resolver + version nueva. |
| `NOTION_VERSION_CANONICAL` / `_LEGACY` | `2026-03-11` (env-overridable) cuando ON; `2022-06-28` cuando OFF. |
| `_notion_headers()` | `Notion-Version` atada al flag. |
| `resolve_data_source_id(configured_id)` | resolver runtime (try data_source → fallback databases[0]); fail-fast multi-source; hereda token per-space (TASK-1000) vía `_notion_headers`; cache estable por mapping. |
| `_notion_query_url(query_id, use_data_sources)` | helper puro (testeable sin deps): `data_sources` vs `databases`. |
| `_notion_query_page(query_id, body, use_data_sources)` | endpoint flag-gated. |
| `notion_query_all(database_id, …)` | resuelve **una vez por corrida**; **conserva `database_id` configurado como identidad** para snapshot/binding; solo la URL usa el id resuelto. |
| `build_raw_snapshot_rows` | `page.get("in_trash", page.get("archived", False))` — en 2026-03-11 el campo page-level es `in_trash` (`archived` deprecado). Safe en ambas versiones; la columna BQ sigue `archived`. |
| `_is_transient_sync_error` | 4xx (salvo 429) NO transitorio → mata el reintento 3x inútil del 404. |
| `tests/test_data_sources_endpoint_migration.py` | contrato de invariantes (flag OFF=legacy, in_trash fallback, 404 fail-fast, resolución gated). |
| `parity_check_task1003.py` | gate de paridad read-only (no escribe BQ). |

**Seam crítico:** el resolver transforma **solo la URL de query**. El `database_id` configurado sigue siendo la identidad para `source_database_id`, `_resolve_space_context` y el binding multi-tenant (DELETE+APPEND por `space_id`). Mezclarlos rompería el binding.

**Token per-space gratis:** como `_notion_headers` lee el contextvar `_CURRENT_NOTION_TOKEN` que el loop multi-tenant ya setea (TASK-1000), el resolver y la query heredan el token scoped del space sin código extra.

---

## 6. Hallazgos empíricos (Slice 0 — pre-flight read-only)

Las 3 Open Questions resueltas favorablemente contra la API real:

1. **Paginación: sin cambio.** `/v1/data_sources/{id}/query` @ 2026-03-11 devuelve `has_more`/`next_cursor`/`results` idéntico. El `after→position` del changelog es de *append de bloques*, NO de query.
2. **Multi-data-source: todos 1:1.** Efeonce (4 dbs) + Sky (3) + Berel (3): cada database tiene exactamente 1 data_source → `data_sources[0]` inequívoco, sin STOP.
3. **Property shapes: cero diff.** Misma página Efeonce: 70 props en ambas versiones, 0 añadidas/quitadas/type-changed → el conformed downstream parsea igual.
4. **`in_trash` confirmado** (las páginas nuevas exponen `in_trash`, no `archived`).

**Mapping database id → data_source id (verificado):**

| Tenant | tabla | database id (legacy) | data_source id (canónico) |
| --- | --- | --- | --- |
| Efeonce | tareas | `3a54f0904be14158833533ba96557a73` | `5126d7d8-bf3f-454c-80f4-be31d1ca38d4` |
| Efeonce | proyectos | `15288d9b145940529acc75439bbd5470` | `abaeb422-4538-44d8-b43f-026a907746a2` |
| Efeonce | sprints | `0c40f928047a4879ae702bfd0183520d` | `17f9ed19-280e-49fe-8b1f-57cecd58b849` |
| Efeonce | revisiones | `f791ecc4f84c4cfc9d19fe0d42ec9a7f` | `15652bac-9d9b-435c-9d25-44969f3a8a94` |
| Sky | tareas | `23039c2fefe781389d1ec8238fc40523` | `23039c2f-efe7-81f8-af2d-000b67594d18` |
| Sky | proyectos | `23039c2fefe7817a8272ffe6be1a696a` | `23039c2f-efe7-8116-8a83-000b758078f8` |
| Sky | sprints | `27c39c2fefe780948dd2f4cc6dcf3dc6` | `27c39c2f-efe7-8043-8a5d-000b16376e2c` |
| Berel | tareas/proyectos/sprints | (ya son data_source ids) | `35c39c2f-efe7-…` |

---

## 7. Gate de paridad (Slice 2)

`parity_check_task1003.py` (stdlib urllib, sin deps, **NO escribe a BigQuery**) compara, por cada tabla de Efeonce/Sky, el endpoint viejo (`/databases`@2022-06-28) vs el canónico (`/data_sources`@2026-03-11):

- row count, page_id set, `last_edited_time`, flag de borrado (`archived`↔`in_trash`), firma nombre→tipo de propiedades, muestra de `raw_properties_json`. Exit 1 si hay diff.

**Por qué read-only (no dual-write):** el sync hace DELETE+APPEND por space; un dual-write arriesgaría contaminar `notion_ops` que alimenta payroll. La paridad es una pregunta de lectura.

**Resultado (full):** PARIDAD TOTAL los 7 datasets — Efeonce tareas 1374 / proyectos 66 / sprints 19 / revisiones 86; Sky tareas 4118 / proyectos 88 / sprints 16; cero diff.

---

## 8. Cutover (Slice 3) — secuencia ejecutada

Mecanismo de deploy robusto: **`gcloud run deploy --source --update-env-vars`/`--update-secrets` (MERGE)** — NUNCA `deploy.sh` a secas (usa `--env-vars-file`/`--set-secrets` que REPLACE y borraría las vars per-space + el secret `GREENHOUSE_POSTGRES_PASSWORD` que viven manuales en la revisión, porque `.env.yaml` es gitignored y no los contiene).

1. **Deploy flag OFF** (rev `00020-6vw`): código nuevo, comportamiento idéntico. Env+secrets verificados preservados.
2. **Paridad fresca full** → PARIDAD TOTAL.
3. **Flip ON** (`gcloud run services update --update-env-vars`, sin rebuild → rev `00021-wkl`).
4. **Smoke Efeonce** (1374/66/19/86) + **Sky** (4118/88/16): == paridad, 0 errores.
5. **Berel re-habilitado** (`space_notion_sources.sync_enabled=TRUE`) + sync (80/4/0): nativo por endpoint nuevo + token scoped — el 404 previo resuelto.
6. **BQ `notion_ops` verificado** (3 tenants, conteos exactos). Logs limpios. Scheduler diario intacto.

**Reversible <5 min:** flag OFF (`gcloud run services update --update-env-vars NOTION_DATA_SOURCES_ENDPOINT_ENABLED=false`) o traffic a revisión previa (`00020-6vw`/`00019-fgp`).

---

## 9. Slice 4 — id-swap Efeonce/Sky (consistencia con el modelo nuevo)

Migración de los `notion_db_*` guardados de Efeonce/Sky (database ids → data_source ids) en **PG `greenhouse_core.space_notion_sources` (SSOT)** + **BQ mirror `greenhouse.space_notion_sources`** (lo que lee el sync para legacy).

**Por qué es seguro (verificado con ground truth):** el `source_database_id` resultante es **metadata, no join key**. La resolución de cliente/space es por `space_id` (verificado contra el view `greenhouse_serving.notion_workspace_360`, que resuelve `client_id` vía `notion_workspaces.client_id` + JOINs por `space_id`/`client_id`, NO por el valor del database id; y contra el conformed, que resuelve cliente por `space_id`). El view lee de `notion_workspaces`/`notion_workspace_source_bindings`, NO de las tablas delivery. Idempotente (UPDATE filtrado por id viejo) + reversible.

**Resultado:** Efeonce/Sky quedan consistentes con los clientes nuevos (todos data_source ids); el resolver resuelve directo (`GET /v1/data_sources`→200, sin fallback ni warning). Sync post-Slice-4: 10/10 tables, row counts idénticos, 0 errores, warning "database id legacy" ausente.

Backfill canónico: `scripts/notion/backfill-task1003-data-source-ids.ts` (dry-run default, idempotente) + BQ DML mirror.

---

## 10. Estado runtime (al cierre)

| Componente | Estado |
| --- | --- |
| Cloud Run `notion-bq-sync` | rev `00021-wkl` (código `42388c4`), 100% tráfico, flag ON |
| Endpoint | `POST /v1/data_sources/{id}/query` + `Notion-Version: 2026-03-11` (los 3 tenants) |
| Efeonce/Sky/Berel | sincronizan por endpoint canónico, 0 errores |
| `space_notion_sources` (PG + BQ mirror) | data_source ids (Slice 4) |
| Cloud Scheduler `notion-bq-daily-sync` | ENABLED, `0 3 * * *` America/Santiago |
| Rollback | flag OFF / traffic a `00020-6vw`/`00019-fgp` (<5 min) |

---

## 11. Escalabilidad: ¿se repite por cliente? NO

**El cutover (esta migración) fue una sola vez para todo el sistema; nunca se repite por cliente.** Un cliente nuevo entra de forma idempotente/escalable:

1. El wizard de alta guarda **data_source ids + token scoped** (canónico, TASK-998/992).
2. El operador pone `sync_enabled=TRUE`.
3. El sync diario lo drena nativo por el endpoint canónico + su token — **cero casos especiales, cero deploy, cero código**.

Lo único manual por cliente nuevo es el *onboarding provisioning* (crear su integración Notion + token en Secret Manager + grant `secretAccessor` al SA + registrar el space) — eso es onboarding, no una migración. El punto de atención real es estandarizar el template de propiedades en Notion (L1) para que el conformed mapee bien (fuera de scope de esta migración).

---

## 12. Reglas duras (anti-regresión)

- **NUNCA** reintroducir `/v1/databases/{id}/query` ni `Notion-Version 2022-06-28` en el extractor.
- **NUNCA** guardar parent database ids para meter un cliente por el endpoint viejo (parche rechazado).
- **NUNCA** desplegar `notion-bq-sync` con `bash deploy.sh` a secas (REPLACE de env/secrets → borra per-space + PG password). Usar `gcloud run deploy --source --update-env-vars/--update-secrets` (MERGE), re-aseverando per-space + ambos secrets.
- **NUNCA** flipear el flag ni bumpear `NOTION_VERSION` sin correr `parity_check_task1003.py` → PARIDAD TOTAL.
- **NUNCA** volver `page.get("archived", False)` solo (rompe el flag de borrado bajo 2026-03-11).
- **NUNCA** clasificar 4xx (salvo 429) como transitorio (reintento 3x inútil que oculta el fallo).
- **SIEMPRE** un cliente nuevo entra nativo (data_source ids del wizard + `sync_enabled=TRUE`); no repetir el cutover por cliente.

---

## 13. Referencias

- Task: `docs/tasks/complete/TASK-1003-notion-bq-sync-data-sources-endpoint-migration.md`
- Audit fuente: `docs/audits/notion/NOTION_BQ_SYNC_PER_SPACE_TOKEN_ROLLOUT_AND_DEPRECATED_API_AUDIT_2026-06-03.md`
- Per-space token: `docs/tasks/complete/TASK-1000-notion-bq-sync-per-space-token-resolution.md`
- Sync conformed downstream: `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md` + CLAUDE.md "Notion sync canónico"
- Skill: `notion-platform` (§0 estado canónico, `data-sources-vs-databases.md`, `notion-version-history.md`)
- Doc funcional: `docs/documentation/operations/notion-bigquery-sync.md`
- Manual de uso: `docs/manual-de-uso/operations/notion-bq-sync-operacion.md`
- CLAUDE.md / AGENTS.md: "Notion data_sources endpoint canónico (TASK-1003)"
