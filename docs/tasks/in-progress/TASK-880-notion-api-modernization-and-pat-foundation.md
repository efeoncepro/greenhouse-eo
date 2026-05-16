# TASK-880 — Notion API Modernization & PAT Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `integrations|platform|identity`
- Blocked by: `none` (puede correr en paralelo con TASK-879 — esta task entrega los primitives, TASK-879 explora topología)
- Branch: `develop` (operator override: no branch switch for this execution)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Bumpear el header `Notion-Version` consumido por todos los callers Greenhouse de `2022-06-28` (junio 2022, ~4 años atrás) a `2026-03-11` y reemplazar el modelo de auth single-token global (`NOTION_TOKEN`) por un resolver canónico de tokens Notion que distinga explícitamente entre:

- `operator_pat`: Personal Access Token user-scoped para flujos interactivos donde el operador debe actuar con sus propios permisos.
- `workspace_internal_connection`: token de internal connection / service-owned connection para automatizaciones team-owned y syncs no ligados a una persona.
- `global_token`: fallback legacy actual, preservado para compatibilidad y rollback.

Es la foundation técnica que desbloquea todo lo nuevo de Notion Developer Platform 3.5 (Meeting Notes, Markdown API, Views API, MCP improvements, External Agents) y simultáneamente cierra un gap real de seguridad: hoy un solo token global firma sync + discovery + governance + admin triggers, sin audit trail por actor o por token source.

## Why This Task Exists

Greenhouse depende fuertemente de Notion (5,274 delivery tasks + 153 projects + 33 sprints en PG al 2026-05-14, governance de spaces, identity reconciliation TASK-877, future commercial↔delivery orchestrator EPIC-005) pero la integración corre con dos deudas estructurales:

1. **API version stale**: `Notion-Version: 2022-06-28` está hardcodeada en `notion-client.ts`, `notion-governance.ts`, `notion-users.ts` y otros consumers. Notion ya shipped breaking changes en `2026-03-11` (`archived` → `in_trash`, `after` → objeto `position`, `transcription` → `meeting_notes`) que no podemos absorber sin esta foundation. Sin upgrade, ningún endpoint nuevo (Meeting Notes, Markdown API, Views API) está disponible.
2. **Single-token blast radius**: `NOTION_TOKEN` global en GCP Secret Manager firma TODO. Si leakea: blast radius = todos los workspaces conectados, sin distinción de operador. No hay audit trail real (`source_sync_runs.triggered_by` es self-reportado, no verificable contra Notion-side audit). Los PATs user-scoped reducen blast radius en flujos interactivos; los internal connections/service-owned tokens siguen siendo el modelo correcto para automatizaciones estables de equipo.

Sin esta task, TASK-879 (pilot Workers/CLI) puede correr en sandbox pero no produce primitives reusables; TASK-738 (portal SDK migration) y TASK-739 (API modernization readiness) quedan en limbo; las oportunidades Tier 1 (Meeting Notes ingest TASK-881, Markdown reports publisher) están bloqueadas.

## Goal

- Centralizar TODA llamada a la API de Notion en un único cliente canónico (`NotionApiClient`) que enforce `Notion-Version` configurable + PAT cascade + audit log + redacción de tokens en logs.
- Bumpear default version a `2026-03-11` con feature flag transitorio (`NOTION_API_VERSION_OVERRIDE`) para revert <5min sin redeploy.
- Absorber los 3 breaking changes de `2026-03-11` (`archived` → `in_trash`, `after` → `position`, `transcription` → `meeting_notes`) sin romper el pipeline canónico (`runNotionSyncOrchestration` + `syncBqConformedToPostgres`).
- Introducir resolver canónico `resolveNotionAuth({operatorUserId?, workspaceId?, scope, purpose})` con cascade `operator_pat → workspace_internal_connection → global_token` + tabla PG `greenhouse_core.notion_api_tokens` para PATs de operador y tokens de internal connection/service-owned.
- Reliability signal `integrations.notion.api_version_drift` (warning si algún consumer todavía manda version != canonical) + `integrations.notion.auth_token_rotation_overdue` (warning si un token activo tiene > 180 días sin rotación o PAT a <90 días de expirar; error si PAT expirado o >365 días).
- Capability granular `integrations.notion.auth_tokens.{list_self,register_self,verify_self,revoke_self,list_tenant,revoke_tenant,register_workspace,verify_workspace,revoke_workspace}` + admin endpoint `/api/admin/integrations/notion/auth-tokens` (CRUD self-scoped + admin-scoped tenant/workspace).
- Sin breaking change para consumers existentes: cualquier código que hoy importa `notionRequest({...})` sigue funcionando (la cascade resuelve a `global_token` cuando no hay PAT).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (capabilities + audit pattern)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (signal pattern)
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **NUNCA** hardcodear `Notion-Version: 2022-06-28` en código nuevo. Toda llamada pasa por `NotionApiClient` que resuelve la versión desde config canonical.
- **NUNCA** loggear el bearer token (raw o redactado parcialmente) en errores Sentry / Cloud Logging / outbox payloads. Usar `redactSensitive` (`src/lib/observability/redact.ts`) antes de capturar.
- **NUNCA** persistir un PAT plaintext. Storage encrypted at rest siguiendo el pattern TASK-697 (pepper SHA-256 + grants estrictos `greenhouse_runtime` sin DELETE).
- **NUNCA** crear un nuevo callsite Notion fuera de `src/lib/space-notion/` o `src/lib/notion/`. Los wrappers `notionRequest` legacy quedan como re-export delegate al cliente nuevo.
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'integrations.notion', { extra })`.
- Cualquier write path Notion (futuro TASK-577 write bridge, future Markdown publisher) DEBE usar el cliente nuevo con scope `write` declarado.
- Bumpear API version requiere absorber los 3 breaking changes en el mismo PR — NO mergear el bump sin la migration de consumers.

## Normative Docs

- `docs/audits/notion/notion-bq-sync/NOTION_BQ_SYNC_AUDIT_2026-04-30.md`
- `docs/audits/notion/notion-bq-sync/GREENHOUSE_CONSUMPTION_AUDIT_2026-04-30.md`
- Notion API changelog: https://developers.notion.com/page/changelog (especialmente release `2026-03-11` + 12-may-2026 PAT introduction)
- Notion API auth docs (PAT vs integration token vs OAuth)

## Dependencies & Impact

### Depends on

- `src/lib/space-notion/notion-client.ts` (canonical HTTP wrapper hoy, lo absorbemos)
- `src/lib/space-notion/notion-governance.ts` (consumer de notion-client)
- `src/lib/space-notion/notion-performance-report-publication.ts`
- `src/lib/identity/reconciliation/notion-users.ts` (usa fetch propio con `Notion-Version` hardcoded — migrar)
- `src/lib/identity/reconciliation/member-scoped.ts`
- `src/lib/sync/sync-notion-conformed.ts` (read path BQ raw, no usa Notion API directo)
- `src/lib/integrations/notion-readiness.ts` / `notion-sync-orchestration.ts`
- `src/app/api/integrations/notion/discover/route.ts` + `register/route.ts` (proxies a notion-bq-sync sibling — no llama Notion API directo, NO afectado)
- `services/ops-worker/server.ts` (endpoint `/notion-conformed/sync` — corre `runNotionSyncOrchestration` que NO llama Notion API)
- `greenhouse_core` schema (nueva tabla `notion_api_tokens`)
- TASK-697 reveal-sensitive pattern (encryption strategy reusable)
- TASK-742 secret hygiene + redact helpers
- TASK-877 `identity_profile_source_links` (no afectado, pero el resolver respeta el contract)

### Blocks / Impacts

- **Desbloquea**: TASK-881 (Meeting Notes ingestion — necesita API version `2026-03-11+`), futura TASK Markdown reports publisher, futura TASK Views API consumer.
- **Coordina con**: TASK-879 (research/pilot — los hallazgos de Slice 2 inventory de TASK-879 informan el catálogo de consumers a migrar acá; no se bloquean entre sí).
- **Coordina con**: TASK-738 (portal Notion SDK migration) — esta task NO migra a `@notionhq/client` SDK; deja al callsite el modo `fetch` puro vía cliente canónico. Si TASK-738 decide adoptar el SDK, lo hace encima del resolver de auth de esta task.
- **Coordina con**: TASK-739 (API modernization readiness) — esta task ejecuta la modernization mínima (version bump + breaking changes); TASK-739 puede cerrarse o re-scopearse como follow-up de Views API / Markdown API consumers.
- **Impacta**: cualquier script futuro bajo `scripts/integrations/notion/*` debe usar el cliente canónico.
- **No impacta**: sibling `notion-bq-sync` Cloud Run (corre en su propio repo, mantiene su propio token + version) — esta task es solo Greenhouse-side. Coordinar con TASK-737 si emerge necesidad de align upstream.

### Files owned

- `src/lib/notion/api-client.ts` — NEW canonical NotionApiClient
- `src/lib/notion/auth-resolver.ts` — NEW PAT cascade resolver
- `src/lib/notion/auth-tokens-store.ts` — NEW PG store CRUD
- `src/lib/notion/breaking-changes-shims.ts` — NEW absorption helpers (`in_trash`/`archived` dual-read, etc.)
- `src/lib/notion/index.ts` — NEW barrel
- `src/lib/space-notion/notion-client.ts` — REFACTOR a delegate del cliente nuevo
- `src/lib/identity/reconciliation/notion-users.ts` — REFACTOR usar cliente nuevo
- `src/app/api/admin/integrations/notion/auth-tokens/route.ts` — NEW CRUD admin
- `src/app/api/my/integrations/notion/auth-tokens/route.ts` — NEW self-scoped CRUD operador
- `src/app/(dashboard)/admin/integrations/notion/auth-tokens/page.tsx` — NEW admin surface (lista + revoke)
- `src/lib/reliability/queries/notion-api-version-drift.ts` — NEW signal reader
- `src/lib/reliability/queries/notion-pat-age-overdue.ts` — NEW signal reader
- `migrations/<timestamp>_task-880-notion-api-tokens.sql`
- `migrations/<timestamp>_task-880-capabilities-registry-seed.sql`
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md` (Delta)
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md` (Delta — confirmar que esta task no muta la decisión absorption)
- `docs/architecture/DECISIONS_INDEX.md` (entry nueva)
- `docs/documentation/plataforma/integraciones-notion.md` (NEW funcional)
- `docs/manual-de-uso/plataforma/notion-auth-tokens.md` (NEW manual operador/admin)

## Current Repo State

### Already exists

- `notionRequest` wrapper en [src/lib/space-notion/notion-client.ts](src/lib/space-notion/notion-client.ts): pure fetch + Bearer + `Notion-Version: 2022-06-28` + 30s timeout.
- Cron canónico Cloud Scheduler `ops-notion-conformed-sync @ 20 7 * * *` → ops-worker `/notion-conformed/sync` (NO llama Notion API directo, lee BQ raw producido por sibling notion-bq-sync).
- `runNotionSyncOrchestration()` + `syncBqConformedToPostgres()` orquestan BQ → PG sin tocar Notion API.
- Identity reconciliation Notion-side (TASK-877 complete) usa `notionRequest` con `Notion-Version: 2022-06-28`.
- Sibling Cloud Run `notion-bq-sync` (us-central1) sigue como writer único de `notion_ops.*` raw — fuera de scope de esta task.
- `NOTION_TOKEN` env var global registrada en Vercel + GCP Secret Manager (`greenhouse-notion-token` o equivalente — verificar nombre exacto en Slice 0).
- `redactSensitive` en [src/lib/observability/redact.ts](src/lib/observability/redact.ts) (TASK-742) ya cubre Bearer tokens — extender pattern si emergen casos nuevos.
- `captureWithDomain` ya soporta `'integrations.notion'` como dominio (TASK-844 cross-runtime observability).

### Gap

- No existe `NotionApiClient` canonical; cada callsite reimplementa headers + auth + retry.
- No existe tabla PG para PATs ni helper resolver. Single token global = único modo de auth.
- No hay capability granular para PAT lifecycle. Cualquier admin edit del token global pasa por GCP Secret Manager raw (vía `pnpm secrets:rotate` TASK-742).
- No hay reliability signal de version drift ni token age.
- No hay surface admin para listar/revocar PATs ni surface operador para registrar el suyo.
- `Notion-Version: 2022-06-28` está hardcoded en al menos 3 archivos (`notion-client.ts`, `notion-governance.ts`, `notion-users.ts`) — confirmar count exacto en Slice 0.
- No hay test anti-regresión que rompa el build cuando emerja un nuevo callsite Notion fuera del cliente canónico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Discovery + breaking change inventory

- Grep exhaustivo de `Notion-Version`, `notion.com/v1`, `api.notion.com`, `Bearer.*notion`, `NOTION_TOKEN` en `src/`, `services/`, `scripts/`. Producir matriz: filepath × callsite × purpose × auth source × current version.
- Confirmar nombre exacto del secret GCP (`greenhouse-notion-token` o equivalente) + Vercel env var. Documentar en `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`.
- Inventariar específicamente uso de `archived: true|false`, parámetro `after` en append children, bloque `transcription` (los 3 breaking changes de `2026-03-11`). Output: matriz de absorción required.
- Verificar Notion API actual del workspace Efeonce (qué API version responde por default si no se manda header). Documentar.
- Output: `docs/audits/notion/TASK-880-callsite-inventory-2026-05-14.md`.

### Slice 1 — Canonical NotionApiClient + auth resolver foundation

- Crear `src/lib/notion/api-client.ts`: clase `NotionApiClient` con métodos `get/post/patch/delete<T>(path, options)`. Default `Notion-Version` resuelto desde `getCurrentNotionApiVersion()` (lee env var + fallback canonical). Timeout 30s. Retry exponencial 3 attempts para 429/5xx. `captureWithDomain` en error path. Token redactado en error logs.
- Crear `src/lib/notion/auth-resolver.ts`: `resolveNotionAuth({operatorUserId?, workspaceId?, scope: 'read'|'write'|'admin', purpose?})` con cascade `operator_pat → workspace_internal_connection → global_token`. Server-only enforce.
- Crear `src/lib/notion/index.ts` barrel: re-exports + types.
- `src/lib/space-notion/notion-client.ts` se refactoriza a thin delegate que importa el cliente canónico (preserva la signature `notionRequest({...})` 100% backward-compat). Marca el module con `// @deprecated use NotionApiClient from @/lib/notion` en jsdoc.
- Tests Vitest: 15+ tests cubren happy path, 429 retry, 5xx retry, timeout, token redaction en error, cascade resolution (con/sin PAT), invalid token shape rejection.
- NO bumpear version todavía — Slice 1 mantiene `2022-06-28` como default canonical para que sea additive.

### Slice 2 — Notion auth tokens (PG storage + capabilities)

- Migration `<timestamp>_task-880-notion-api-tokens.sql`:
  - Tabla `greenhouse_core.notion_api_tokens`:
    - `token_id UUID PK DEFAULT gen_random_uuid()`
    - `token_kind TEXT NOT NULL CHECK (token_kind IN ('operator_pat','workspace_internal_connection','legacy_global_token_ref'))`
    - `user_id TEXT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL` (requerido para `operator_pat`; NULL para tokens workspace/service-owned).
    - `workspace_id TEXT NOT NULL` (Notion workspace UUID o stable external workspace id; FK opcional a `greenhouse_core.notion_workspaces` si el runtime real lo permite).
    - `label TEXT NOT NULL CHECK (length(label) BETWEEN 3 AND 96)` (operator/admin supplied display name).
    - `token_value_full TEXT NULL` (solo para tokens registrados en PG; encrypted at rest via Cloud SQL TDE + grants estrictos).
    - `secret_ref TEXT NULL` (para tokens gestionados en Secret Manager o fallback legacy).
    - `token_value_hash TEXT NOT NULL` (SHA-256(pepper || raw_token) para dedup + audit lookup; nunca reversible sin pepper).
    - `token_hash_pepper_version TEXT NOT NULL DEFAULT 'v1'`.
    - `token_display_mask TEXT NOT NULL` (`secret_...XXXX` o `ntn_...XXXX`, nunca plaintext).
    - `scope TEXT NOT NULL CHECK (scope IN ('read','write','admin'))`
    - `notion_bot_user_id TEXT NULL`
    - `notion_workspace_name TEXT NULL`
    - `verified_at TIMESTAMPTZ NULL` (NULL hasta que `GET /v1/users/me` confirme que el token funciona).
    - `last_used_at TIMESTAMPTZ NULL`
    - `last_rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `expires_at TIMESTAMPTZ NULL` (requerido para `operator_pat`, porque los PATs expiran al año según docs Notion; NULL permitido para internal connection si Notion no publica expiración).
    - `revoked_at TIMESTAMPTZ NULL`
    - `revoked_by TEXT NULL` + `revoke_reason TEXT NULL`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - UNIQUE INDEX partial `(token_kind, user_id, workspace_id, scope) WHERE revoked_at IS NULL AND token_kind = 'operator_pat'`.
    - UNIQUE INDEX partial `(token_kind, workspace_id, scope) WHERE revoked_at IS NULL AND token_kind = 'workspace_internal_connection'`.
  - Tabla `greenhouse_core.notion_api_token_audit_log` (append-only; trigger anti-update/delete):
    - `audit_id UUID PK`, `token_id UUID FK`, `action TEXT CHECK (action IN ('registered','verified','revoked','used','rotated','secret_ref_updated'))`, `actor_user_id TEXT`, `metadata_json JSONB`, `occurred_at TIMESTAMPTZ`.
  - Trigger `set_updated_at` BEFORE UPDATE.
  - Anti pre-up-marker DO block valida tablas creadas + columns esperadas.
  - GRANTs: `greenhouse_runtime` SELECT/INSERT/UPDATE (NO DELETE — solo soft-delete via `revoked_at`).
- Migration `<timestamp>_task-880-capabilities-registry-seed.sql`:
  - Primero formaliza `integrations` como módulo de entitlements si no existe, con ADR/index antes de seedear capabilities.
  - `integrations.notion.auth_tokens.list_self` (module=`integrations`, action=`read`, scope=`own`) — cualquier `client_user` activo.
  - `integrations.notion.auth_tokens.register_self` (action=`create`, scope=`own`) — cualquier `client_user` activo.
  - `integrations.notion.auth_tokens.verify_self` (action=`execute`, scope=`own`) — cualquier `client_user` activo.
  - `integrations.notion.auth_tokens.revoke_self` (action=`delete`, scope=`own`) — cualquier `client_user` activo.
  - `integrations.notion.auth_tokens.list_tenant` (action=`read`, scope=`tenant`) — `EFEONCE_ADMIN`.
  - `integrations.notion.auth_tokens.revoke_tenant` (action=`delete`, scope=`tenant`) — `EFEONCE_ADMIN`.
  - `integrations.notion.auth_tokens.register_workspace` / `verify_workspace` / `revoke_workspace` (actions `create|execute|delete`, scope=`tenant`) — `EFEONCE_ADMIN` only; estos gestionan `workspace_internal_connection`, no PATs de otro usuario.
  - Grants en `src/lib/entitlements/runtime.ts` (CLAUDE.md TASK-873 invariant: capability seed sin grant runtime = endpoint inaccesible).
- Helper `src/lib/notion/auth-tokens-store.ts`:
  - `registerOperatorPat({userId, workspaceId, label, rawToken, scope, expiresAt})` — atomic: hash + mask + INSERT + audit row + outbox event `notion.auth_token.registered v1`.
  - `registerWorkspaceInternalConnection({workspaceId, label, rawToken|secretRef, scope})` — admin-only helper para automatizaciones team-owned.
  - `revokeNotionAuthToken({tokenId, actorUserId, reason})` — soft-delete + audit + outbox `notion.auth_token.revoked v1`.
  - `verifyNotionAuthToken(tokenId)` — issue test call (`GET /v1/users/me`) usando el cliente canónico, persistir `verified_at`, `notion_bot_user_id` y metadata segura + outbox.
  - `listNotionAuthTokensForUser(userId)` / `listNotionAuthTokensForTenant()` — masked, NUNCA expone `token_value_full`.
  - `resolveActiveOperatorPatForUserAndWorkspace(userId, workspaceId)` y `resolveWorkspaceInternalConnection(workspaceId, scope)` — usados por el auth-resolver.
- Tests: 20+ tests. Idempotency, scope enforcement, hash+pepper paridad, audit append-only, soft-delete preserva audit.

### Slice 3 — Admin + operator surfaces (CRUD UI)

- API routes:
  - `GET/POST /api/my/integrations/notion/auth-tokens` (capability `integrations.notion.auth_tokens.list_self` / `register_self`; solo permite `token_kind='operator_pat'` para el usuario autenticado).
  - `DELETE /api/my/integrations/notion/auth-tokens/[tokenId]` (capability `revoke_self`, gate `token.user_id === session.user.id` y `token_kind='operator_pat'`).
  - `POST /api/my/integrations/notion/auth-tokens/[tokenId]/verify`.
  - `GET /api/admin/integrations/notion/auth-tokens` (capability `list_tenant`).
  - `POST /api/admin/integrations/notion/auth-tokens/workspace` (capability `register_workspace`; crea `workspace_internal_connection` o secret ref, nunca registra PAT en nombre de otro usuario).
  - `DELETE /api/admin/integrations/notion/auth-tokens/[tokenId]` (capability `revoke_tenant` o `revoke_workspace` según `token_kind`).
- Surface operador: bloque "Mis tokens Notion" en `Mi Greenhouse` (`/my/integrations/notion`). Form de registro (label + rawToken + workspaceId pickable from `notion_workspaces` / `space_notion_sources` activos + scope radio + `expires_at`). Lista con masked + verified badge + expiration/rotation status + last_used_at relativo + botón Revocar.
- Surface admin: `/admin/integrations/notion/auth-tokens` con tabla TanStack (token kind, operador cuando aplique, workspace, scope, last_used, expires/rotation status). Drawer con audit log timeline. Filtros por estado/kind/operador/workspace.
- Microcopy en `src/lib/copy/integrations.ts` o módulo existente equivalente (verificar convención actual antes de crear).
- Sin breaking change: cuando un operador NO tiene PAT registrado, fallback automático a global token (cascade canonical).
- Tests: render + interaction + microcopy.

### Slice 4 — Bump Notion-Version a 2026-03-11 + absorber breaking changes

- Env var `NOTION_API_VERSION_OVERRIDE` (default unset). `getCurrentNotionApiVersion()` resuelve override → fallback canonical `2026-03-11`. Si emerge regresión, set `NOTION_API_VERSION_OVERRIDE=2022-06-28` en Vercel + redeploy < 5min.
- Helper `src/lib/notion/breaking-changes-shims.ts`:
  - `mapArchivedToInTrash(payload)` / `mapInTrashToArchived(payload)` — dual-read durante transición.
  - `normalizeAppendChildrenPayload(input)` — convierte legacy `after: blockId` a `position: {type: 'after', after: blockId}`.
  - `normalizeBlockType(typeString)` — `transcription` → `meeting_notes` y vice versa.
- Audit cada callsite identificado en Slice 0 + actualizar al shape nuevo (preferentemente vía shim inline, NO branching condicional).
- Si algún callsite no puede migrar limpio (e.g. consumer downstream que parsea la response esperando `archived`), envolver con `mapInTrashToArchived` SOLO en ese callsite + flag `// TODO TASK-XXX remove backwards-compat shim post Q3 2026`.
- Tests anti-regresión: 10+ tests verifican que el cliente canonical bumped funciona contra fixtures de respuestas Notion v2026-03-11 + que los consumers reciben el shape esperado.
- `runNotionSyncOrchestration` validation pass: smoke run en staging post-bump, assert que `delivery_*` tables se siguen poblando con count > 0 + zero rows con campo nuevo missing.

### Slice 5 — Reliability signals + lint rule + close

- Reliability signal `integrations.notion.api_version_drift` (kind=drift, severity=warning si count>0, steady=0):
  - Reader `src/lib/reliability/queries/notion-api-version-drift.ts`. Cuenta requests Notion en últimas 24h con `notion_version_used != getCurrentNotionApiVersion()`. Source: log structured emitted por `NotionApiClient` cuando consumer fuerza override.
- Reliability signal `integrations.notion.auth_token_rotation_overdue` (kind=drift, severity=warning >180d o PAT expira en <90d, error >365d o PAT expirado):
  - Reader cuenta tokens activos (revoked_at IS NULL) con `last_rotated_at < now() - interval '180 days'` o `expires_at` vencido/próximo.
- Wire-up en `getReliabilityOverview` source `integrations.notion[]`. Subsystem rollup: `Integrations` (verificar que existe; si no, agregar al registry).
- Lint rule `greenhouse/no-direct-notion-api-call` (modo `warn` en V1, promote a `error` post-cleanup):
  - Detecta `fetch('https://api.notion.com/...')` o `Notion-Version: 2022-06-28` literal fuera de `src/lib/notion/**` y `src/lib/space-notion/notion-client.ts` (legacy delegate).
- Doc funcional: `docs/documentation/plataforma/integraciones-notion.md` v1.0 (estructura: qué es, cómo registrar PAT, cómo se usa la cascade, cuándo aparecen los signals).
- Manual operador/admin: `docs/manual-de-uso/plataforma/notion-auth-tokens.md` (paso a paso registrar/revocar/verificar PAT propio y administrar internal connection tokens).
- ADR entry en `docs/architecture/DECISIONS_INDEX.md`: "Notion auth canonical = PAT cascade resolver + global token fallback".
- Spec Delta en `GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md` y `GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`.
- CLAUDE.md + AGENTS.md: hard rules sobre uso del cliente canónico + version bump invariant.

## Out of Scope

- NO migrar a `@notionhq/client` SDK — esa decisión queda en TASK-738 (puede correr encima del cliente canonical de esta task).
- NO migrar `notion-bq-sync` sibling Cloud Run a la nueva API version (sigue corriendo con su propio token + version). Coordinar con TASK-737 si emerge necesidad.
- NO consumir Meeting Notes endpoint todavía — eso es TASK-881 (depende de esta foundation).
- NO consumir Markdown API ni Views API — futuras tasks derivadas.
- NO External Agents API — TASK-879 evalúa, futura task implementa.
- NO write bridge a Notion (TASK-577 sigue siendo owner; cuando emerja, reusará el cliente canónico).
- NO multi-user OAuth flow — los PATs son self-issued por el operador desde Notion Developer Portal y registrados en Greenhouse via copy-paste.
- NO Workers de Notion (TASK-879).
- NO migrar tokens de identity reconciliation TASK-877 (ya canonical via `identity_profile_source_links`).

## Detailed Spec

### Cascade canonical de auth

```text
resolveNotionAuth({operatorUserId, workspaceId, scope, purpose}) →

  if operatorUserId AND workspaceId:
    pat = resolveActiveOperatorPatForUserAndWorkspace(operatorUserId, workspaceId)
    if pat AND pat.scope >= scope AND pat.revoked_at IS NULL AND pat.expires_at > now():
      audit(pat.id, 'used', operatorUserId)
      return {token, source: 'operator_pat', tokenId: pat.id}

  if workspaceId:
    workspaceToken = resolveWorkspaceInternalConnection(workspaceId, scope)
    if workspaceToken:
      audit(workspaceToken.id, 'used', operatorUserId ?? '__system__')
      return {token, source: 'workspace_internal_connection', tokenId: workspaceToken.id}

  globalToken = resolveLegacyGlobalToken()
  return {token: globalToken, source: 'global_token'}
```

Si `scope='write'` y la cascade resuelve a `global_token` sin contrato explícito de write, throw `NotionAuthScopeMismatchError` + `captureWithDomain('integrations.notion', err)`. `purpose='list_users'` debe saltar `operator_pat`, porque Notion documenta que PATs no pueden listar todos los usuarios.

### Storage encryption strategy

Pattern fuente TASK-697 (`src/lib/finance/beneficiary-payment-profiles/reveal-sensitive.ts`):

- Plaintext at rest (Cloud SQL TDE cubre disk encryption).
- Grants estrictos `greenhouse_runtime` SELECT/INSERT/UPDATE solo (NO DELETE — soft-delete via `revoked_at`).
- `token_value_hash = sha256(pepper || raw_token)` con pepper en GCP Secret Manager versionado (`greenhouse-notion-token-pepper-v1` o nombre aprobado por ADR). Sin pepper, hashes de tokens son comparables; el pepper rompe que sean reversibles.
- `token_hash_pepper_version` obligatorio desde V1 para permitir rotación futura sin reescribir la arquitectura.
- `token_display_mask = "secret_" + lastChars(rawToken, 4).padStart(8, "•")` precomputado al INSERT.
- Reveal endpoint NO incluido en V1 — el operador solo ve mask. Si necesita el token completo, lo genera nuevo desde Notion Developer Portal y revoca el viejo.

### Outbox events nuevos (versionados v1, documentar en EVENT_CATALOG)

- `notion.auth_token.registered v1` — `{tokenId, tokenKind, userId?, workspaceId, scope, registeredAt}`.
- `notion.auth_token.verified v1` — `{tokenId, tokenKind, verifiedAt, notionBotUserId}`.
- `notion.auth_token.revoked v1` — `{tokenId, tokenKind, actorUserId, reason, revokedAt}`.
- `notion.auth_token.used v1` — high-volume; emit solo bajo flag `NOTION_AUTH_TOKEN_USAGE_OUTBOX_ENABLED=true` para audit forensic durante incident response. Default OFF.

### Rollback path canónico (Slice 4 bump)

Si bump causa regresión live:

1. Vercel env `NOTION_API_VERSION_OVERRIDE=2022-06-28` + redeploy (< 5 min).
2. Reliability signal `api_version_drift` baja a 0 (todos los callers vuelven a la version vieja).
3. Investigate root cause + fix breaking-changes-shims.ts.
4. Re-deploy bump + remove override.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (discovery) DEBE finalizar antes de Slice 1.
- Slice 1 (cliente canonical) DEBE finalizar antes de Slice 2 (PAT store usa el cliente para verify).
- Slice 2 (auth token store) puede correr en paralelo con Slice 4 (version bump) en términos de código, PERO mergear Slice 2 antes de Slice 4 reduce riesgo (resolver/audit ya disponibles si rollback necesario).
- Slice 3 (UI) depende de Slice 2.
- Slice 4 (version bump) DEBE absorber los 3 breaking changes en el mismo PR — NO mergear bump sin shims.
- Slice 5 (signals + lint + docs) cierra. Lint rule `error` mode SOLO post-cleanup completo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Version bump rompe consumer downstream que parsea `archived` | Identity / Delivery sync | medium | env override + dual-read shims + smoke staging post-bump | `integrations.notion.api_version_drift` + Sentry domain=integrations.notion |
| Token plaintext leakage en logs | Secrets / Identity | low | redactSensitive + token_display_mask precomputado + grants strictos | secret scan / git diff / Sentry payload audit |
| Token pepper missing en Secret Manager | Auth | low | startup check en `resolveNotionAuth` + fail-fast con `captureWithDomain` | Sentry alert al boot + CI check |
| Operador registra PAT con scope=write incorrectamente y rompe rate limits | Notion API | low | scope=write requiere capability extra + verification call obligatoria pre-uso | rate limit 429 spike + Sentry domain=integrations.notion |
| Se usa PAT humano como token de automatización estable | Notion API / Ops | medium | `token_kind` explícito + admin route separada para `workspace_internal_connection` + docs | signal token expiration/rotation + audit |
| Cascade fallback a global_token sin que operador se entere | Audit | medium | source field en audit/outbox usage bajo flag + dashboard "operadores sin PAT" | reliability signal nueva (V2 si emerge necesidad) |
| Shim `transcription`→`meeting_notes` rompe `runNotionSyncOrchestration` | Delivery sync | medium | smoke staging + parity audit post-bump | delivery_tasks count drop signal |
| Lint rule false positive bloquea PR legítimo | Dev velocity | low | `warn` mode en V1; promote a error solo post-cleanup completo | CI noise |

### Feature flags / cutover

- `NOTION_API_VERSION_OVERRIDE` (default unset) — env var Vercel + ops-worker. Override a `2022-06-28` revert instant. Cleanup post 30d steady-state.
- `NOTION_AUTH_TOKEN_RESOLVER_ENABLED` (default `true` desde Slice 2) — kill-switch defensivo. Si `false`, cascade salta directo a global_token. Cleanup post 60d.
- `NOTION_AUTH_TOKEN_USAGE_OUTBOX_ENABLED` (default `false`) — emit outbox event en cada uso de token registrado. Para audit forensic ad-hoc; OFF en steady state por volumen.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert audit doc | <5 min | sí |
| Slice 1 | Revert PR — cliente canonical es additive, legacy delegate intacto | <10 min | sí |
| Slice 2 | Migration down (DROP tablas, idempotente) + revert PR. Tokens registrados en DB se borran; legacy global token queda intacto. | <30 min | sí |
| Slice 3 | Revert UI PR — endpoints quedan accesibles via API direct (no breaking) | <10 min | sí |
| Slice 4 | `NOTION_API_VERSION_OVERRIDE=2022-06-28` + redeploy | <5 min | sí |
| Slice 5 | Revert signals + lint rule | <10 min | sí |

### Production verification sequence

1. Slice 0 audit doc merged → review file paths + sample size completos.
2. Slice 1 cliente canonical merged a develop → CI verde + tests Vitest 15+ verde.
3. Slice 2 migration aplicada en staging → `pnpm migrate:status` verifica + DO block check pasa + capabilities seedadas.
4. Slice 3 UI deployed staging → smoke test: registrar PAT operador test, verificar, revocar. Audit log poblado.
5. Slice 4 bump merged a develop → smoke `runNotionSyncOrchestration` corre en staging via `/api/admin/integrations/notion/trigger-conformed-sync` → assert `greenhouse_delivery.{projects,tasks,sprints}` count NO cae.
6. Slice 4 deploy production → monitor signal `api_version_drift` + Sentry domain=integrations.notion durante 24h. Si drift > 0 sostenido, root cause y fix.
7. Slice 5 lint rule en `warn` mode → revisar reportes + cleanup callsites residuales.
8. Promote lint rule a `error` post-cleanup + CLAUDE.md hard rule.

### Out-of-band coordination required

- Verificar que GCP Secret Manager tiene espacio para nuevo secret versionado de pepper (`greenhouse-notion-token-pepper-v1`, nombre final por ADR) + grant a la service account runtime correspondiente.
- Comunicar a operadores admin (Julio + Cesar) la opción de registrar PAT propio post Slice 3 — opt-in, no obligatorio.
- Coordinar con Workspace Admin Efeonce si se requiere crear/rotar internal connection token service-owned para automatizaciones team-owned.
- Si bump version rompe el upstream `notion-bq-sync` (correlación esperada baja porque sibling tiene su propio path), coordinar con TASK-737.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Audit Slice 0 lista TODOS los callsites Notion API en repo + count exacto + breaking changes affected.
- [ ] `NotionApiClient` canonical existe + tests Vitest 15+ verde + cubre redaction + retry + cascade.
- [ ] `notion_api_tokens` table aplicada en staging + production + DO block anti pre-up-marker pasa.
- [ ] Módulo de entitlements `integrations` formalizado por ADR/index antes de seedear capabilities.
- [ ] Capabilities `integrations.notion.auth_tokens.*` seeded en `capabilities_registry` + grants en `runtime.ts` + parity test verde.
- [ ] Surface admin `/admin/integrations/notion/auth-tokens` operativa + surface operador `/my/integrations/notion` operativa.
- [ ] Default API version bumped a `2026-03-11` + 3 breaking changes absorbed + smoke `runNotionSyncOrchestration` verde.
- [ ] Reliability signals `api_version_drift` + `auth_token_rotation_overdue` registrados + visible en `/admin/operations`.
- [ ] Lint rule `greenhouse/no-direct-notion-api-call` activa en `warn` mode (promote a `error` post-cleanup).
- [ ] Doc funcional + manual operador + ADR entry merged.
- [ ] CLAUDE.md + AGENTS.md hard rules agregadas.
- [ ] No regresión: count `greenhouse_delivery.{projects,tasks,sprints}` post-bump >= count pre-bump (smoke 7d).
- [ ] Outbox events `notion.auth_token.{registered,verified,revoked}` documentados en `GREENHOUSE_EVENT_CATALOG_V1.md`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (full suite — CLAUDE.md task closing quality gate)
- `pnpm build` (Turbopack — atrapa boundary violations server-only)
- `pnpm migrate:status` post Slice 2
- Smoke staging: registrar PAT operador, verify, revoke, audit log + outbox emitidos
- Smoke staging: trigger `runNotionSyncOrchestration` post-bump → assert delivery_* counts
- Manual review reliability dashboard `/admin/operations` post-deploy

## Closing Protocol

- [ ] `Lifecycle` del markdown queda sincronizado con el estado real
- [ ] El archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con aprendizajes
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado sobre TASK-879, TASK-738, TASK-739, TASK-577, TASK-737
- [ ] TASK-881 unblocked (dependency cerrada)
- [ ] CLAUDE.md sección "Notion API canonical client + PAT auth" agregada
- [ ] AGENTS.md mirror del invariant
- [ ] Spec arquitectónica `GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md` con Delta
- [ ] ADR en `DECISIONS_INDEX.md`
- [ ] PATs de operadores piloto (Julio + Cesar opcional) documentados en runbook sin valores secretos

## Follow-ups

- TASK-881 — Notion Meeting Notes Ingestion (consumer del cliente canonical de esta task).
- Future TASK — Notion Markdown Reports Publisher (publica ICO/sprint reports a Notion pages).
- Future TASK — Notion Views API consumer (reemplaza `space_property_mappings` para vistas custom).
- Coordinar con TASK-738 si emerge decisión de adoptar `@notionhq/client` SDK encima del cliente canonical.
- Coordinar con TASK-577 cuando emerja el write bridge — usará `resolveNotionAuth` con scope=write.
- Re-evaluar TASK-737 (notion-bq-sync hardening) post-bump: ¿sibling también necesita upgrade de version?

## Open Questions

Todas las Open Questions originales quedan resueltas antes de implementación:

- ¿El operador admin debe poder registrar un PAT en nombre de otro operador (delegated registration)? → **No en V1.** Cada operador registra su propio PAT. Admin puede listar/revocar por tenant y registrar/rotar tokens `workspace_internal_connection`, pero no copiar ni custodiar PATs personales de otro usuario.
- ¿Necesitamos `workspace_pat`? → **No como PAT.** La categoría correcta es `workspace_internal_connection`: token de internal connection/service-owned para automatizaciones team-owned. Los PATs son user-scoped y expiran al año; no deben ser el contrato de sync estable.
- ¿La verificación de PAT al registrar debe llamar `GET /v1/users/me` o algo más liviano? → **Sí: `GET /v1/users/me`.** Es el endpoint soportado por PATs y permite guardar `notion_bot_user_id`/workspace metadata segura.
- ¿Pepper rotation strategy? → **V1 incluye `token_hash_pepper_version`.** La primera versión puede usar un solo pepper activo, pero el schema ya queda preparado para rotación dual-hash futura.
- ¿Bumpear directo a `2026-03-11` o a algo intermedio? → **Directo a `2026-03-11`.** Es la versión vigente que activa los cambios objetivo y evita migraciones intermedias.
- ¿Pueden los PATs alimentar `notion-users.ts` / `GET /v1/users`? → **No.** Notion documenta y runtime confirmó que PATs no pueden listar todos los usuarios. Ese path debe usar internal/global token explícito.

## Delta 2026-05-14

Task creada como follow-on canonical de TASK-879 (research/pilot Notion Developer Platform). TASK-879 explora qué hacer con Workers/CLI/agents; TASK-880 entrega los primitives técnicos (cliente canonical + PAT auth + version bump) que cualquier topología futura necesita. Bundled con TASK-881 (Meeting Notes ingest) que es el primer consumer real de la nueva API version.

### Delta 2026-05-14 (live PAT validation + docs oficiales cierran Open Questions arquitectónicas)

`ntn` 0.14.0 instalado + autenticado live por Codex contra workspace `Efeonce` (TASK-879 Slice 1 evidence) generó un primer PAT real en Greenhouse y validó hallazgos críticos para esta task:

**Hallazgo 1 — PATs son user-scoped; internal connections son el modelo team-owned**:

La validación live mostró `results: []` para algunos recursos, pero la corrección contra docs oficiales cambia la interpretación: un PAT actúa como el usuario que lo creó y usa los permisos reales de ese usuario. No es un bot con "Add connections" por recurso. Por eso:

- `operator_pat` cubre uso interactivo del admin/desarrollador donde el usuario real es el boundary de seguridad.
- `workspace_internal_connection` cubre production sync y automatizaciones team-owned, porque un PAT humano expira al año y pierde acceso si el usuario pierde permisos o sale del workspace.
- `global_token` legacy probablemente es un Internal Integration Token o equivalente service-owned; Slice 0 debe confirmar su naturaleza sin exponer el valor.

Cierra Open Question original: "¿Necesitamos `workspace_pat`?" → **No como PAT. Sí necesitamos tier `workspace_internal_connection` para automatizaciones.**

**Hallazgo 2 — PATs tienen restricciones de operación documentadas**:

Verificado live: `GET /v1/users` devuelve `403 restricted_resource: Personal access tokens cannot list users`. Implicancia para TASK-877 identity reconciliation: el path canonical via internal/global token NO debe migrar a PATs. PATs son para uso operador/user-scoped, NO para discovery global del workspace.

**Hallazgo 3 — Notion-Version `2026-03-11` confirmado como latest soportado**:

Toda spec extraída con `ntn api ... --spec` declara `notionVersion.enum: ["2026-03-11"]` como required. Eso confirma:
- El bump objetivo `2022-06-28 → 2026-03-11` (Slice 4) es directo a la latest, no requiere version intermedia.
- Cierra Open Question: "¿Bumpear directo a `2026-03-11` o a algo intermedio?" → **Directo, no hay intermedia válida**.

**Hallazgo 4 — `include_transcript` query param en Markdown API es opt-in PII gate**:

Inspección spec del endpoint `GET /v1/pages/{page_id}/markdown` reveló query param `include_transcript: boolean` (default `false`). Cuando `true`, embebe transcripts completos de meeting notes; cuando `false`, devuelve placeholder con URL. Este flag es load-bearing para TASK-881 PII safety strategy y debe estar disponible en `NotionApiClient.get()` como parameter explícito, no oculto en query string raw.

**Hallazgo 5 — Workers gated por Workspace Admin (NO bloqueante para TASK-880)**:

`ntn doctor` reporta `Workers enabled ! not enabled for this workspace`. Habilitar requiere intervención humana de un Workspace Admin de Efeonce. Esto NO bloquea TASK-880 (que no usa Workers), pero confirma que el cascade canonical NO debe asumir Workers como auth source — los Workers tienen su propio modelo de auth (gestionado por Notion). Si futura task incorpora Workers como path async, agregar un cuarto tier al resolver: `worker_runtime_auth → operator_pat → workspace_internal_connection → global_token`.

### Action items derivados (bundled al inicio de Slice 0)

1. Slice 0 audit DEBE confirmar si `NOTION_TOKEN` global actual es Internal Integration Token o PAT (afecta documentación + tier 3 contract), sin revelar el valor del secreto.
2. Pre-Slice 2: definir si se registra un `workspace_internal_connection` service-owned para production sync use cases. Coordinar con Workspace Admin Efeonce si se requiere crear o rotar ese token.
3. El primer PAT operador validado en TASK-879 puede migrarse como fila piloto solo si el operador entrega/rota el token durante Slice 2; no asumir que el valor plaintext sigue disponible ni copiarlo desde `.env`.
4. `NotionApiClient.get()` debe aceptar `include_transcript` como typed param (no query string libre) cuando el path matchea `/v1/pages/{page_id}/markdown`.

## Delta 2026-05-16 — Corrección post-discovery antes de implementación

Discovery de TASK-880 contra runtime real corrigió cuatro supuestos que no deben llegar a código:

- `workspace_pat` queda reemplazado por `workspace_internal_connection`. Los PATs son personales, user-scoped y expiran; no son token estable de automatización.
- La tabla propuesta cambia de `greenhouse_core.notion_personal_access_tokens` a `greenhouse_core.notion_api_tokens`, con `token_kind`, `expires_at` y `token_hash_pepper_version`.
- La ruta personal cambia de `/me/integraciones/notion` a `/my/integrations/notion`, porque el portal usa `/my/*` para superficies user-facing.
- El módulo de entitlements `integrations` todavía no existe; Slice 2 debe formalizarlo con ADR/index antes de seedear `integrations.notion.auth_tokens.*`.
