# TASK-1003 — notion-bq-sync: migración al endpoint canónico `/v1/data_sources/{id}/query` (matar API deprecada)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `integrations.notion|cross-repo|infra`
- Blocked by: `none`
- Blocks: `TASK-1000`
- Branch: `task/TASK-1003-notion-data-sources-endpoint` (en repo hermano `efeoncepro/notion-bigquery`)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El Cloud Run `notion-bq-sync` (repo hermano `efeoncepro/notion-bigquery`) consume el endpoint **deprecado** `POST /v1/databases/{id}/query` (Notion lo deprecó 2025-09-03). Efeonce/Sky funcionan **solo** porque tienen guardados database ids viejos que ese endpoint aún acepta; los clientes nuevos (Berel) tienen data_source ids (modelo 2026) que el endpoint viejo rechaza con 404. Migrar el sync al endpoint canónico **`POST /v1/data_sources/{id}/query` + Notion-Version `2026-03-11`**, con gate de paridad de filas sobre Efeonce/Sky antes del cutover. Desbloquea TASK-1000 y mata la deuda deprecada que pone en riesgo los bonos de payroll.

## Why This Task Exists

`notion-bq-sync` alimenta `notion_ops` BQ → (downstream) métricas ICO → **bonos de payroll de Efeonce/Sky**. Hoy todo el sync depende de un endpoint que Notion ya deprecó. Cuando Notion lo apague, el sync se rompe silenciosamente → métricas stale → bonos mal calculados. Además, el wizard de alta de cliente (TASK-992/998) **ya es canónico** (guarda data_source ids del `/v1/search` 2026), pero el sync no puede consumirlos → ningún cliente nuevo sincroniza (bloquea TASK-1000). El sync es el laggard; hay que ponerlo al día con la API canónica 2026.

Evidencia completa: `docs/audits/notion/NOTION_BQ_SYNC_PER_SPACE_TOKEN_ROLLOUT_AND_DEPRECATED_API_AUDIT_2026-06-03.md`.

## Goal

- `notion-bq-sync` queryea via `POST /v1/data_sources/{id}/query` con Notion-Version `2026-03-11`.
- Efeonce/Sky migran sus stored ids (database → data_source) con **paridad de filas verificada** antes del cutover.
- Berel (y todo cliente nuevo) sincroniza nativo con sus data_source ids + token scoped.
- Cero parches: NO se guardan parent database ids para seguir usando el endpoint viejo.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- Skill `notion-platform` §0 (estado canónico), `api-reference/endpoints-canonical.md`, `developer-platform-2026/data-sources-vs-databases.md`, `developer-platform-2026/notion-version-history.md`, `reference/changelog-notion-api.md`.
- `docs/audits/notion/NOTION_BQ_SYNC_PER_SPACE_TOKEN_ROLLOUT_AND_DEPRECATED_API_AUDIT_2026-06-03.md` (este hallazgo).
- CLAUDE.md → "Notion sync canónico", "Notion Integrations Registry", "Notion teamspace linking per-client token", "Cross-repo action safety", "Runtime Rollout Completion Gate", Solution Quality Contract.

Reglas obligatorias:

- **NO parche:** prohibido guardar parent database ids para seguir en el endpoint viejo. La solución es la migración al endpoint canónico.
- **Payroll-crítico:** gate de paridad de filas (row count + campos clave) sobre Efeonce/Sky ANTES del cutover. Detrás de flag, reversible < 5 min.
- **Cross-repo:** todo cambio va en `efeoncepro/notion-bigquery` (Cloud Run). NO hay GitHub Actions auto-deploy ahí; deploy manual via `deploy.sh` (Cloud Build desde source). Verificar deploy + smoke antes de declarar complete.
- **Notion-Version bump cuidado:** `2022-06-28` → `2026-03-11`. Breaking changes confirmados/por-confirmar contra el extractor real:
  - ✅ **CONFIRMADO `archived`→`in_trash`**: `main.py:1182` hace `page.get("archived", False)` para escribir `raw_pages_snapshot.archived`. En `2025-09-03+` el campo page-level es `in_trash` → quedaría siempre-False silenciosamente. Fix obligatorio: `page.get("in_trash", page.get("archived", False))`.
  - ⚠️ **POR CONFIRMAR (Slice 0) paginación**: `notion_query_all` (`main.py:594`) usa `start_cursor`/`next_cursor`/`has_more`. Verificar empíricamente que el endpoint `/v1/data_sources/{id}/query` los mantiene en `2026-03-11` (el `after`→`position` del changelog puede ser de OTRO endpoint, no de query). NO asumir.
  - ⚠️ **POR CONFIRMAR (Slice 0) property shapes**: `_extract_prop` (`main.py:631`) parsea por tipo. Rollups/relations/formulas pueden cambiar shape entre versiones → lo atrapa el gate de paridad.
- **Re-fetch / rate-limit / HMAC** según contrato `notion-platform` (no aplica HMAC acá, es pull; sí rate-limit ~3 req/s).

## Normative Docs

- `docs/audits/notion/NOTION_BQ_SYNC_PER_SPACE_TOKEN_ROLLOUT_AND_DEPRECATED_API_AUDIT_2026-06-03.md`
- `docs/tasks/in-progress/TASK-1000-notion-bq-sync-per-space-token-resolution.md`
- Repo hermano: `/Users/jreye/Documents/notion-bigquery/main.py` (extractor + sync), `deploy.sh`, `.env.yaml`, `requirements.txt`.

## Dependencies & Impact

### Depends on

- Notion API `2026-03-11` (`/v1/data_sources/{id}/query`, `/v1/databases/{id}` para resolver data_sources).
- Per-space token infra (TASK-1000) — **ya desplegada y verificada** (IAM + PG connector + flag + revisión `00019-fgp`).

### Blocks / Impacts

- **TASK-1000** (per-space token): no puede cerrarse hasta que Berel sincronice, lo cual requiere esta migración.
- **Pipeline conformed downstream** (ops-worker `runNotionSyncOrchestration` en greenhouse-eo): consume `notion_ops` BQ. Si la migración cambia el shape de `raw_pages_snapshot`/`stg_*`, verificar que el conformed sigue parseando (paridad downstream).
- **Métricas ICO / bonos payroll**: blast radius máximo si rompe Efeonce/Sky.

### Files owned

- `efeoncepro/notion-bigquery`: `main.py` — `_notion_query_page` (`:441` URL), `_notion_headers` (`:368` version), `notion_query_all` (`:594` paginación), `extract_page_properties` (`:758`) + el write de `archived` (`:1182`), nuevo resolver `resolve_data_source_id`. `.env.yaml` (Notion-Version + flag). Posible `deploy.sh`.
- `greenhouse-eo` (OPCIONAL, Slice 4 cleanup): `greenhouse.space_notion_sources` BQ mirror — migrar database ids → data_source ids de Efeonce/Sky para eliminar el overhead de resolución runtime. NO requerido para el cutover (el resolver runtime maneja ambos tipos). NUNCA el wizard (ya canónico).

## Current Repo State

### Already exists

- Per-space token path (`load_per_client_space_configs_from_pg`, `_resolve_notion_token_for_space`) — desplegado, flag ON, PG conecta (verificado).
- El wizard de alta YA guarda data_source ids (canónico).
- Berel registrado con data_source ids + token scoped `notion-integration-token-greenhouse-grupo-berel` (`sync_enabled=FALSE`).

### Gap

- El sync usa `POST /v1/databases/{id}/query` (deprecado) + Notion-Version vieja → no acepta data_source ids (404 en Berel).
- Efeonce/Sky tienen database ids viejos en `space_notion_sources` (BQ mirror) — hay que resolverlos a data_source ids para migrar.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — Pre-flight empírico (investigar antes de codear — NO se salta)

Antes de tocar `main.py`, confirmar contra la API real (token grupo-berel para data_source; token `notion-token` para una DB Efeonce/Sky) y documentar en el progress log:

- **Paginación** del endpoint `/v1/data_sources/{id}/query` con `Notion-Version: 2026-03-11`: ¿devuelve `has_more`/`next_cursor` con `start_cursor`, o cambió a `position`? (decide si `notion_query_all` se toca).
- **Shape de página**: ¿`id`/`url`/`created_time`/`last_edited_time`/`properties` intactos? ¿el campo de borrado es `in_trash` (vs `archived`)?
- **Multi-data-source**: para CADA database de Efeonce/Sky, `GET /v1/databases/{id}` → contar `data_sources[]`. Si alguna tiene >1, **STOP y escalar decisión** (cuál sincronizar) antes de seguir.
- **Property shape diff**: dump de 1 página Efeonce con `2022-06-28` vs `2026-03-11`, diff de `properties` (rollups/relations/formulas).

### Slice 1 — Resolver runtime de id (database↔data_source) + endpoint + version

**Decisión de diseño (ver §Design Decisions): el código resuelve el id configurado a un data_source id en runtime — NO depende de una migración de datos previa.** Maneja ambos tipos por construcción → Efeonce/Sky siguen funcionando aunque sus ids guardados sigan siendo database ids.

- Nuevo `resolve_data_source_id(configured_id, token)`: si `GET /v1/data_sources/{id}`→200 úsalo; si no, `GET /v1/databases/{id}`→`data_sources[0].id` (con guard multi-data-source de Slice 0) + `logger.warning` "migrar id guardado a data_source". Cache por corrida.
- `_notion_query_page` → `POST /v1/data_sources/{ds}/query`; `_notion_headers` → `Notion-Version` desde env (default `2026-03-11`).
- Fix `archived`→`in_trash` en el write de `raw_pages_snapshot` (`:1182`), con fallback `page.get("in_trash", page.get("archived", False))`.
- Aplicar lo que Slice 0 haya revelado (paginación / property shapes).
- **Clasificar 404 como NO-transient** (hoy reintenta 3x inútil) → fail-fast + log claro por space.

### Slice 2 — Gate de paridad de filas (Efeonce/Sky) detrás de flag

- Flag `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` (default OFF) — disciplina TASK-1000.
- Shadow/compare endpoint nuevo vs viejo sobre Efeonce/Sky: **row count + campos clave** (`notion_page_id`, `last_edited_time`, `in_trash/archived`, `task_status`, nombres) + **diff del `raw_properties_json` de una muestra**. Cero diff requerido antes del cutover.

### Slice 3 — Cutover + re-habilitar Berel + verificar downstream

- Flip flag ON. Smoke: Efeonce/Sky paridad + Berel extrae sus 3 bases vía data_sources + token scoped.
- Re-habilitar Berel `sync_enabled=TRUE`.
- **Verificar pipeline conformed downstream** (ops-worker `runNotionSyncOrchestration`) para Berel: `notion_ops` → `greenhouse_conformed.delivery_*` → PG. Ojo propiedades custom (ver Out of Scope).
- Cerrar TASK-1000.

### Slice 4 (OPCIONAL) — Cleanup de ids guardados Efeonce/Sky → data_source

- Migrar los database ids del BQ mirror `greenhouse.space_notion_sources` a sus data_source ids (elimina el overhead de resolución runtime). Idempotente, con trazabilidad del mapping. NO requerido para el cutover.

## Design Decisions (arch-architect)

### Decisión clave — resolución runtime vs migración de datos previa

**Elegido: resolución runtime del id (el código acepta database ID o data_source ID y resuelve al data_source queryable).**

- **Rechazado — migración de datos previa (resolver+guardar data_source ids de Efeonce/Sky ANTES del cutover):** crea ventana de estado mixto, dos fuentes de verdad durante la transición, y un one-shot con ambigüedad multi-data-source que si sale mal toca payroll. El runtime resolver lo evita: Efeonce/Sky siguen con sus ids actuales y funcionan; el cleanup (Slice 4) es opcional y desacoplado del riesgo.
- **Rechazado — soportar ambos endpoints (databases para legacy, data_sources para nuevos):** mantiene vivo el endpoint deprecado = no mata la deuda (el objetivo de la task). El runtime resolver usa SIEMPRE el endpoint nuevo; solo el *id* se resuelve.

### Notion-Version: `2026-03-11`

Consistente con `discoverNotionDatabasesForToken` (el wizard ya usa 2026-03-11) + canon skill `notion-platform` §0. El riesgo del bump lo absorbe el gate de paridad (Slice 2). Versión por env var para poder pinear/revertir sin redeploy de código.

### 4-Pilares

| Pilar | Cómo se cubre |
| --- | --- |
| **Safety** | Flag default OFF; gate de paridad obligatorio pre-cutover; rollback <5 min (flag OFF / traffic a revisión previa); Berel aislado (`sync_enabled` gate); token scoped por space (TASK-1000). |
| **Robustness** | Runtime resolver maneja ambos id-types; fix `in_trash`/`archived`; 404 fail-fast (no reintento inútil); Slice 0 valida shapes contra API real antes de codear. |
| **Resilience** | Degrade-to-today intacto (path per-client falla → legacy-only); resolver loguea warning si encuentra database id legacy; cache por corrida ante rate-limit. |
| **Scalability** | Todo cliente nuevo entra nativo (data_source ids del wizard), cero casos especiales; endpoint canónico sin deuda deprecada. |

### Open Questions (resolver en Slice 0 / escalar a operador)

1. ¿El endpoint data_sources mantiene paginación `start_cursor`/`next_cursor` en 2026-03-11? (empírico Slice 0).
2. ¿Alguna database de Efeonce/Sky tiene >1 data_source? Si sí, ¿cuál es la canónica o se sincronizan todas? (decisión operador).
3. ¿El `raw_properties_json` cambia lo suficiente para romper el pipeline conformed downstream (ops-worker)? (paridad Slice 2 + verificación Slice 3).

## Out of Scope

- **Estandarización de propiedades de Berel** (nombres/estados custom vs template Efeonce). Es un problema del pipeline **conformed** (ops-worker, greenhouse-eo), no de este sync (que es schema-agnostic). Regla canónica: enforce template L1 en Notion ANTES del onboarding; NO aliases custom. Se trata por separado cuando Berel tenga data real.
- El wizard de alta (ya canónico — no se toca).
- Migrar a Notion Workers / cualquier reescritura mayor del sync.

## Rollout Plan & Risk Matrix

**Payroll-crítico (Efeonce/Sky) — esta sección es load-bearing.**

- **Ordering:** Slice 0 (pre-flight empírico — STOP si multi-data-source) → Slice 1 (resolver runtime + endpoint + version + `in_trash`) → Slice 2 (paridad verde ≥1 corrida) → Slice 3 (cutover + Berel + downstream) → Slice 4 opcional (cleanup ids). NUNCA flipear sin paridad verde.
- **Flag:** `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` default OFF. Cutover = flip ON. Rollback = flip OFF + redeploy, o traffic a revisión previa (`00019-fgp` actual, o `00017-pct` pre-rollout) — < 5 min. Notion-Version por env var (pin/revert sin redeploy de código).
- **Riesgos:**
  - Breaking changes Notion-Version → extractor produce shape distinto → **Slice 0 lo anticipa + paridad lo detecta** antes del cutover. `in_trash`/`archived` ya identificado.
  - DB multi-data-source en Efeonce/Sky → **Slice 0 hace STOP** antes de codear; no se asume `data_sources[0]` a ciegas.
  - Runtime resolver agrega 1 GET por space/corrida → cacheable; Slice 4 lo elimina migrando ids. No bloquea.
  - Cloud Build falla / startup regression → smoke health + corrida manual antes de confiar el diario.
- **Verificación de cierre (Runtime Rollout Completion Gate):** deploy aplicado + smoke Efeonce/Sky paridad + Berel extrae + `notion_ops` BQ con data de Berel + conformed downstream chequeado + TASK-1000 cerrado.

## Verification

- Paridad de filas Efeonce/Sky (row count + campos clave) endpoint nuevo vs viejo: cero diff.
- Berel: `POST /v1/data_sources/{ds}/query` con token scoped → 200 + páginas extraídas a `notion_ops`.
- Logs: `Loaded N per-client space config(s) from PG SSOT` + `Sync complete` 0 errores incluyendo Berel.
- TASK-1000 desbloqueada y cerrada.

<!-- ZONE 4 — PROGRESS LOG -->

## Progress Log

### Slice 0 — pre-flight empírico (2026-06-03, read-only contra API real; develop)

Probado con token `notion-token` (Efeonce/Sky) y `notion-integration-token-greenhouse-grupo-berel` (Berel). Las 3 Open Questions resueltas **favorablemente** — de-riesga el cutover:

- **OQ1 — Paginación: RESUELTA, SIN CAMBIO.** `POST /v1/data_sources/{id}/query` con `Notion-Version: 2026-03-11` devuelve `has_more` + `next_cursor` + `results` idéntico a hoy. El `after→position` del changelog es de *append de bloques*, NO de query. → [`notion_query_all`](../../../notion-bigquery/main.py) NO se toca en su lógica de paginación.
- **OQ2 — Multi-data-source: RESUELTA, SIN STOP.** Cada database Efeonce (tareas/proyectos/sprints/revisiones) y Sky (tareas/proyectos/sprints) tiene **exactamente 1 data_source**. Berel: sus ids configurados YA son data_sources. `data_sources[0]` es inequívoco para todos → no hay escalación a operador.
- **OQ3 — Property shapes: RESUELTA, CERO DIFF.** Misma página Efeonce tareas (`37439c2f…`): OLD `databases/query`@2022-06-28 vs NEW `data_sources/query`@2026-03-11 → 70 props en ambas, 0 añadidas, 0 quitadas, 0 type-changes. **El `raw_properties_json` es idéntico → el pipeline conformed downstream parsea igual.**
- **`in_trash` vs `archived`: CONFIRMADO.** Las páginas del endpoint nuevo exponen `in_trash` (no `archived`; `archived` ausente). El write actual `page.get("archived", False)` (`main.py:1182`) escribiría siempre-False bajo 2026-03-11. **Fix obligatorio:** `page.get("in_trash", page.get("archived", False))`. Campos nuevos aditivos (`is_archived`, `is_locked`, `public_url`, `created_by`, `last_edited_by`) — no rompen el extractor.
- **Resolver confirmado empíricamente** (try data_source → fallback databases): Berel `GET /v1/data_sources/{id}`→200 (id YA es data_source, 0 resolución extra); Efeonce/Sky `GET /v1/data_sources/{id}`→404 → `GET /v1/databases/{id}`→`data_sources[0].id`. El resolver hereda el token per-space gratis vía el contextvar de `_notion_headers` (TASK-1000).

**Mapping database id (configurado en BQ mirror) → data_source id (resuelto):**

| Tenant | Tabla | configured (database id, BQ mirror) | resolved data_source id |
| --- | --- | --- | --- |
| Efeonce | tareas | `3a54f0904be14158833533ba96557a73` | `5126d7d8-bf3f-454c-80f4-be31d1ca38d4` |
| Efeonce | proyectos | `15288d9b145940529acc75439bbd5470` | `abaeb422-4538-44d8-b43f-026a907746a2` |
| Efeonce | sprints | `0c40f928047a4879ae702bfd0183520d` | `17f9ed19-280e-49fe-8b1f-57cecd58b849` |
| Efeonce | revisiones | `f791ecc4f84c4cfc9d19fe0d42ec9a7f` | `15652bac-9d9b-435c-9d25-44969f3a8a94` |
| Sky | tareas | `23039c2fefe781389d1ec8238fc40523` | `23039c2f-efe7-81f8-af2d-000b67594d18` |
| Sky | proyectos | `23039c2fefe7817a8272ffe6be1a696a` | `23039c2f-efe7-8116-8a83-000b758078f8` |
| Sky | sprints | `27c39c2fefe780948dd2f4cc6dcf3dc6` | `27c39c2f-efe7-8043-8a5d-000b16376e2c` |
| Berel | tareas | `35c39c2f-efe7-8139-8448-000b7ed67b13` (YA data_source) | (id se usa directo) |
| Berel | proyectos | `35c39c2f-efe7-818f-bfc5-000bbf660c0f` (YA data_source) | (id se usa directo) |
| Berel | sprints | `35c39c2f-efe7-81cd-bcc3-000b78ba002d` (YA data_source) | (id se usa directo) |

### Open Questions — resoluciones pre-execution (rationale)

1. **¿Paginación cambia?** → NO (OQ1 empírica). `notion_query_all` intacto. *Más robusto*: igual el código no asume — itera hasta `has_more=false` (ya lo hace).
2. **¿Multi-data-source en Efeonce/Sky?** → NO (OQ2 empírica, todos 1:1). Resolver usa `data_sources[0]` con guard: si alguna vez `len>1`, **fail-fast + log + saltar ESE space** (nunca adivinar) — defensa para clientes futuros.
3. **¿`raw_properties_json` rompe el conformed?** → NO (OQ3 empírica, cero diff). Igual el gate de paridad (Slice 2) lo re-verifica antes del cutover y Slice 3 valida el conformed para Berel.
4. **Modelo de ejecución de la paridad** (fork de diseño, recomendado + aprobado): comparador **read-only** que NO escribe a BQ (el sync hace DELETE+APPEND per space; dual-write arriesgaría contaminar `notion_ops` que alimenta payroll). Endpoint/modo dedicado que querea viejo vs nuevo y diffea row count + campos clave + muestra de `raw_properties_json`.
5. **Base de la rama TASK-1003 en el repo hermano** (drift detectado): el código desplegado (`5a6766c`, PG password auth + per-space) vive en `task/TASK-1000-pg-password-auth`, **NO en `origin/main`**. La rama TASK-1003 DEBE basarse en ese HEAD (o en la rama que el operador decida mergear primero), no en main, o se pierde la infra per-space de TASK-1000. → **RESUELTO: rama `task/TASK-1003-notion-data-sources-endpoint` basada en `task/TASK-1000-pg-password-auth` (`5a6766c`)** — la más segura/robusta/escalable: artefacto de deploy coherente (= deployed + migración), topología lineal, y al mergear a main consolida el commit pg-password desplegado-pero-no-mergeado. Aprobado por operador.

### Slice 1 — resolver + endpoint + versión + in_trash + 404 (2026-06-03, repo hermano, commit `f5d93f7`)

Todo detrás de `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` (default OFF → **sync bit-for-bit con hoy**). Cambios en `main.py`:
- `resolve_data_source_id(configured_id)` — try `/v1/data_sources/{id}` (200=ya es data_source, Berel/nuevos) → fallback `/v1/databases/{id}`→`data_sources[0].id` (Efeonce/Sky legacy). Multi-data-source → fail-fast. Cache estable. Hereda token per-space (TASK-1000) vía `_notion_headers`.
- `_notion_query_url(query_id, use_data_sources)` (puro, testeable) + `_notion_query_page(use_data_sources)` — endpoint flag-gated.
- `notion_query_all` — resuelve una vez por corrida; **conserva `database_id` configurado como identidad** para snapshot/binding; solo la URL usa el id resuelto.
- `_notion_headers` — Notion-Version atada al flag (OFF=`2022-06-28`, ON=`NOTION_VERSION` env / `2026-03-11`).
- `build_raw_snapshot_rows` — `page.get("in_trash", page.get("archived", False))` (incondicional, safe ambas versiones; columna BQ sigue `archived`).
- `_is_transient_sync_error` — 4xx (salvo 429) NO transitorio → mata el reintento 3x del 404.
- `tests/test_data_sources_endpoint_migration.py` — contrato de invariantes de seguridad (flag OFF=legacy, in_trash fallback, 404 fail-fast, resolución gated). Verde + test existente sin regresión + `py_compile` OK.

### Slice 2 — gate de paridad read-only (2026-06-03, repo hermano, commit `42388c4`)

`parity_check_task1003.py` (stdlib urllib, sin deps): compara endpoint viejo vs canónico sobre Efeonce/Sky **sin escribir a BigQuery** — row count + page_id set + last_edited_time + flag de borrado + firma nombre→tipo de propiedades + muestra de `raw_properties_json`. Exit 1 si hay diff. **La corrida autoritativa (full) va en Slice 3, justo antes del cutover.**

### ⚠️ Gotcha de deploy para Slice 3 (load-bearing — no romper el flujo per-space)

`.env.yaml` está **gitignored** en el repo hermano (config local de deploy) y `deploy.sh` la pasa con `--env-vars-file` (que **reemplaza** todas las env vars). Las vars per-space de TASK-1000 (`NOTION_PER_SPACE_TOKEN_ENABLED`, `GREENHOUSE_POSTGRES_*` + secret `greenhouse-pg-dev-app-password`) se setearon **manual** sobre la revisión `00019-fgp`, NO vía `.env.yaml`. Un `deploy.sh` ciego las **borraría** → se cae el path per-space. **Slice 3 debe**: (a) capturar el env+secrets vivos de `00019-fgp`, (b) reconciliarlos (o usar `--update-env-vars`/`--set-secrets` en el paso manual post-deploy) de modo que el nuevo deploy preserve per-space + PG + agregue el flip del flag data_sources. El default OFF del flag vive en el código (`or "false"`), así que el código es seguro sin `.env.yaml`.

### Slice 2 — PARIDAD FULL VERDE (evidencia 2026-06-03, read-only contra API real)

`parity_check_task1003.py --sample 5` (full, sin escribir BQ) → **PARIDAD TOTAL** en los 7 tables. Endpoint viejo (`/databases`@2022-06-28) vs canónico (`/data_sources`@2026-03-11), conteos full:

| Tenant/tabla | row count | page_id set | last_edited+borrado | firma props | raw_props muestra |
| --- | --- | --- | --- | --- | --- |
| efeonce/tareas | 1374 | ✅ idéntico | ✅ | ✅ | 0 diff |
| efeonce/proyectos | 66 | ✅ | ✅ | ✅ | 0 diff |
| efeonce/sprints | 19 | ✅ | ✅ | ✅ | 0 diff |
| efeonce/revisiones | 86 | ✅ | ✅ | ✅ | 0 diff |
| sky/tareas | 4118 | ✅ | ✅ | ✅ | 0 diff |
| sky/proyectos | 88 | ✅ | ✅ | ✅ | 0 diff |
| sky/sprints | 16 | ✅ | ✅ | ✅ | 0 diff |

Exit 0 = **seguro flipear el flag**. (Re-correr este gate justo antes del flip en Slice 3 para foto fresca.)

### Slice 3 — config viva de `00019-fgp` (SSOT del deploy reconciliado)

Capturada read-only (`gcloud run services describe`). Lo que el deploy DEBE preservar (sino se cae el path per-space/PG):

- **Env plain:** `BQ_DATASET`, `BQ_LOCATION`, `BQ_RAW_SNAPSHOT_TABLE`, `BQ_SPACE_NOTION_TABLE`, `NOTION_DB_{TAREAS,PROYECTOS,SPRINTS,REVISIONES}`, `NOTION_MAX_RETRIES`, `NOTION_BACKOFF_BASE_SECONDS`, `NOTION_BACKOFF_MAX_SECONDS`, `NOTION_PER_SPACE_TOKEN_ENABLED=true`, `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev`, `GREENHOUSE_POSTGRES_DB=greenhouse_app`, `GREENHOUSE_POSTGRES_USER=greenhouse_app`
- **Secrets:** `NOTION_TOKEN→notion-token:latest`, `GREENHOUSE_POSTGRES_PASSWORD→greenhouse-pg-dev-app-password:latest`
- **SA:** `183008134038-compute@developer.gserviceaccount.com` · maxScale 3 · sin mount cloudsql (Python Connector).

### Slice 3 — comandos canónicos del cutover (NEEDS operator go-ahead, payroll-crítico)

Mecanismo robusto: `gcloud run deploy --source --update-env-vars` (**merge**, preserva env+secrets; NUNCA `deploy.sh --env-vars-file` que reemplaza). Deploy con flag **OFF primero** (cero cambio) → smoke → flip ON → smoke → Berel.

```bash
cd /Users/jreye/Documents/notion-bigquery   # rama task/TASK-1003-notion-data-sources-endpoint

# 1) Paridad fresca (debe dar PARIDAD TOTAL)
export TOK_GLOBAL="$(gcloud secrets versions access latest --secret=notion-token --project=efeonce-group)"
python3 parity_check_task1003.py            # exit 0

# 2) Deploy nuevo código con flag OFF (merge preserva per-space+PG+secrets) → comportamiento idéntico a hoy
gcloud run deploy notion-bq-sync --source . --region=us-central1 --project=efeonce-group \
  --update-env-vars NOTION_DATA_SOURCES_ENDPOINT_ENABLED=false
# smoke: GET health → 2 spaces (Efeonce+Sky); corrida manual → 0 errores

# 3) Flip ON (sin rebuild) → smoke Efeonce/Sky por el endpoint nuevo
gcloud run services update notion-bq-sync --region=us-central1 --project=efeonce-group \
  --update-env-vars NOTION_DATA_SOURCES_ENDPOINT_ENABLED=true
# smoke: corrida manual → row counts == paridad, 0 errores

# 4) Re-habilitar Berel + verificar
#   UPDATE greenhouse_core.space_notion_sources SET sync_enabled=TRUE
#     WHERE space_id='space-cli-0863869c-eaac-4630-9bd0-af283c56f7fb';
#   corrida → notion_ops con data de Berel + conformed downstream (ops-worker runNotionSyncOrchestration)

# ROLLBACK <5min (cualquier punto):
gcloud run services update notion-bq-sync --region=us-central1 --project=efeonce-group \
  --update-env-vars NOTION_DATA_SOURCES_ENDPOINT_ENABLED=false
#   o traffic a la revisión previa:
# gcloud run services update-traffic notion-bq-sync --region=us-central1 --to-revisions=notion-bq-sync-00019-fgp=100
```

5. Cerrar TASK-1000 (re-habilitar Berel desbloqueado). Verificar conformed downstream para Berel (ojo propiedades custom → Out of Scope, template L1).

### Slice 3 — CUTOVER EJECUTADO + VERIFICADO (2026-06-04, live, autorizado por operador)

Secuencia ejecutada paso a paso, cada gate verde. Rama TASK-1003 pusheada a `origin/efeoncepro/notion-bigquery` (código live trazable).

1. **Deploy flag OFF** (`gcloud run deploy --source --update-env-vars` merge) → revisión `00020-6vw`. Env+secrets verificados: per-space + `GREENHOUSE_POSTGRES_PASSWORD` + `NOTION_TOKEN` **preservados** + `NOTION_DATA_SOURCES_ENDPOINT_ENABLED=false`. Health 200, 2 spaces (degrade-to-today). **Hazard de deploy evitado.**
2. **Paridad fresca full** → PARIDAD TOTAL los 7 tables.
3. **Flip ON** (`gcloud run services update --update-env-vars`) → revisión `00021-wkl`, ambos flags `true`.
4. **Smoke Efeonce** (POST `?space_id=spc-c0cf6478…`): 4/4 success, **1374/66/19/86** (== paridad), 0 errores, HTTP 200.
5. **Smoke Sky** (POST `?space_id=spc-ae463d9f…`): 3/3 success, **4118/88/16** (== paridad), 0 errores, HTTP 200.
6. **Berel re-habilitado** (`greenhouse_core.space_notion_sources.sync_enabled=TRUE`) + sync (POST `?space_id=space-cli-0863869c…`): 3/3 success, **tareas 80 / proyectos 4 / sprints 0**, 0 errores — el 404 previo **resuelto**.
7. **BQ `notion_ops` verificado** (`raw_pages_snapshot`, últimos 20 min): los 3 tenants con conteos exactos, `archived_true=0`.
8. **Logs limpios:** resolver loguea `database id legacy → data_source` (Efeonce/Sky), `Loaded 1 per-client space config from PG SSOT` (Berel per-space PG OK), 3× `Sync complete … 0 errors`. Scheduler diario intacto (ENABLED, `0 3 * * *`, URL 200).

**Estado runtime:** revisión activa `00021-wkl` (código `42388c4`, flag ON). Endpoint canónico `/v1/data_sources/{id}/query` + `2026-03-11` para los 3 tenants. Rollback <5 min disponible (flag OFF / traffic a `00020-6vw`/`00019-fgp`).

**Downstream conformed** (ops-worker `runNotionSyncOrchestration`): no se toca con esta migración (consume `notion_ops`, no Notion). Para Efeonce/Sky es **safe-by-construction** (paridad probó shape byte-idéntico) y corre en el cron diario (`ops-notion-conformed-sync` 07:20 Santiago). Berel conformed = Out of Scope (propiedades custom → template L1 antes de confiar las métricas).

**Slice 4 (opcional) — EJECUTADO + VERIFICADO (2026-06-04):** migrados los database ids guardados de Efeonce/Sky a sus data_source ids en **PG `greenhouse_core.space_notion_sources` (SSOT)** + **BQ mirror `greenhouse.space_notion_sources`** (lo que lee el sync). Verificado seguro con ground truth: el view `greenhouse_serving.notion_workspace_360` resuelve `client_id` vía `notion_workspaces.client_id` + JOINs por `space_id`/`client_id` (NO por el valor del database id), y lee de `notion_workspaces`/`notion_workspace_source_bindings` (NO de delivery) → cambiar `source_database_id` toca solo metadata (no join key). Backfill canónico `scripts/notion/backfill-task1003-data-source-ids.ts` (dry-run default, idempotente) + BQ DML. **Resultado:** sync completo post-Slice-4 = 10/10 tables, row counts idénticos, 0 errores, **warning "database id legacy" ausente** (el resolver resuelve directo `GET /v1/data_sources`→200). Efeonce/Sky consistentes con los clientes nuevos.

### Documentación (2026-06-04)

- Arquitectura (alto detalle): `docs/architecture/GREENHOUSE_NOTION_BQ_SYNC_DATA_SOURCES_MIGRATION_V1.md`
- Funcional (lenguaje simple): `docs/documentation/operations/notion-bigquery-sync.md`
- Manual de uso (runbook operador): `docs/manual-de-uso/operations/notion-bq-sync-operacion.md`
- CLAUDE.md + AGENTS.md: sección "Notion data_sources endpoint canónico (TASK-1003)"
- Backfill ids: `scripts/notion/backfill-task1003-data-source-ids.ts`
