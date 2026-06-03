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
- **Notion-Version bump cuidado:** `2022-06-28` → `2026-03-11` trae breaking changes (paginación `after`→`position` (cursors), `archived`→`in_trash`, shapes de respuesta de properties). Validar el extractor contra cada cambio.
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

- `efeoncepro/notion-bigquery`: `main.py` (extractor, query builder, pagination), `.env.yaml` (Notion-Version, flag), posible `deploy.sh`.
- `greenhouse-eo`: `greenhouse_core.space_notion_sources` (migrar database ids → data_source ids de Efeonce/Sky — vía script/migración de datos, NO el wizard).

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

### Slice 1 — Extractor canónico data_sources + Notion-Version 2026-03-11

- Cambiar el query a `POST /v1/data_sources/{id}/query` + header `Notion-Version: 2026-03-11`.
- Adaptar paginación (`start_cursor`/`next_cursor` siguen, pero validar `position` vs `after` según changelog) y shapes de properties.
- Adaptar el retrieve de schema si aplica (`GET /v1/data_sources/{id}` en vez de `/v1/databases/{id}`).
- Clasificar 404 como NO-transient (hoy lo reintenta 3x inútilmente).

### Slice 2 — Resolver/migrar ids de Efeonce/Sky (database → data_source)

- Script idempotente: para cada space legacy, `GET /v1/databases/{db_id}` → `data_sources[].id` (manejar DBs multi-data-source: elegir la canónica o sincronizar todas).
- Persistir los data_source ids (en el BQ mirror `greenhouse.space_notion_sources` y/o donde el sync los lee).
- Dejar trazabilidad del mapping database_id → data_source_id.

### Slice 3 — Gate de paridad de filas (Efeonce/Sky) detrás de flag

- Flag (`NOTION_DATA_SOURCES_ENDPOINT_ENABLED` o reusar disciplina existente) default OFF.
- Shadow/compare: correr endpoint nuevo en paralelo y comparar row count + campos clave (`task_status`, fechas, nombres) vs el viejo, sobre Efeonce/Sky. Cero diff antes del cutover.

### Slice 4 — Cutover + re-habilitar Berel + verificar downstream

- Flip flag ON. Smoke: Efeonce/Sky sincronizan idéntico (paridad) + Berel extrae sus 3 bases vía data_sources + token scoped.
- Re-habilitar Berel `sync_enabled=TRUE`.
- Verificar pipeline conformed downstream (ops-worker) para Berel (ojo: propiedades custom → ver Out of Scope).
- Cerrar TASK-1000.

## Out of Scope

- **Estandarización de propiedades de Berel** (nombres/estados custom vs template Efeonce). Es un problema del pipeline **conformed** (ops-worker, greenhouse-eo), no de este sync (que es schema-agnostic). Regla canónica: enforce template L1 en Notion ANTES del onboarding; NO aliases custom. Se trata por separado cuando Berel tenga data real.
- El wizard de alta (ya canónico — no se toca).
- Migrar a Notion Workers / cualquier reescritura mayor del sync.

## Rollout Plan & Risk Matrix

**Payroll-crítico (Efeonce/Sky) — esta sección es load-bearing.**

- **Ordering:** Slice 1 (extractor) → Slice 2 (migrar ids) → Slice 3 (paridad verde ≥1 corrida) → Slice 4 (cutover + Berel). NUNCA flipear sin paridad verde.
- **Flag:** default OFF. Cutover = flip ON. Rollback = flip OFF + redeploy, o traffic a revisión previa (`00019-fgp` actual, o `00017-pct` pre-rollout) — < 5 min.
- **Riesgos:**
  - Breaking changes Notion-Version → extractor produce shape distinto → **paridad lo detecta** antes del cutover.
  - DB multi-data-source en Efeonce/Sky → elegir la data_source equivocada → row mismatch → **paridad lo detecta**.
  - Cloud Build falla / startup regression → smoke health + corrida manual antes de confiar el diario.
- **Verificación de cierre (Runtime Rollout Completion Gate):** deploy aplicado + smoke Efeonce/Sky paridad + Berel extrae + `notion_ops` BQ con data de Berel + conformed downstream chequeado + TASK-1000 cerrado.

## Verification

- Paridad de filas Efeonce/Sky (row count + campos clave) endpoint nuevo vs viejo: cero diff.
- Berel: `POST /v1/data_sources/{ds}/query` con token scoped → 200 + páginas extraídas a `notion_ops`.
- Logs: `Loaded N per-client space config(s) from PG SSOT` + `Sync complete` 0 errores incluyendo Berel.
- TASK-1000 desbloqueada y cerrada.
