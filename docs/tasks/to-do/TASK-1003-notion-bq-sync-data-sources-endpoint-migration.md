# TASK-1003 — notion-bq-sync: migración al endpoint canónico `/v1/data_sources/{id}/query` (matar API deprecada)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
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
