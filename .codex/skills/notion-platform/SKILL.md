---
name: notion-platform
description: Use for Notion API, MCP, webhooks, data sources, Enhanced Markdown, page bodies, projects, tasks, recursive subtasks, multi-teamspace resolution, due/status/result queries, writeback, Workers, ntn CLI, Notion-Version changes, HMAC, echo-loop prevention, or Greenhouse-Notion integration design. Trigger on requests to create, delegate, assign, update, format, query, or track Notion work; headings, toggle headings, callouts, tables, mentions; gh:work or gh:delegate; and any code using @notionhq/client.
metadata:
  version: "1.1"
  last_updated: "2026-07-18"
  maintainer: Greenhouse Platform team
---

# notion-platform — Skill canonical para Notion API + Developer Platform 2026 + integración Greenhouse

> **Filosofía**: Esta skill es **viva**. Cada vez que la Notion Developer Platform evolucione (cron de releases ~mensual desde mayo 2026), el agente que la invoque debe verificar si lo que va a recomendar está consistente con `developer-platform-2026/notion-version-history.md` y `reference/changelog-notion-api.md`. Si emerge feature nuevo no documentado, agregarlo + bumpear `version` aquí.

## 0. Estado canónico al 2026-07-18

| Eje | Estado vigente |
|---|---|
| Notion-Version recomendada | **`2026-03-11`** (breaking vs 2025-09-03 — `after→position`, `archived→in_trash`, `transcription→meeting_notes`) |
| Endpoint canonical para query | **`POST /v1/data_sources/{id}/query`** (databases endpoint deprecated desde 2025-09-03) |
| Workers | **Beta pública** (Business + Enterprise; free hasta Aug 11, 2026 → después credits) |
| ntn CLI | **GA en todos los planes** — `curl -fsSL https://ntn.dev \| bash` |
| External Agents API | **Alpha waitlist** (Claude Code, Cursor, Codex, Decagon pre-integrados) |
| Notion Agent SDK | **Alpha waitlist** (embed agents en third-party tools) |
| Database Sync | **Beta** (Workers-powered) |
| Bulk PATCH `/v1/pages/bulk` | **NO EXISTE en docs canonical** — TASK-901 design needs revision (ver `patterns-canonical/bulk-patch-batching.md`) |
| PAT (Personal Access Tokens) | **GA** desde May 12, 2026 — admin-controlled per plan |
| Webhooks | GA con HMAC-SHA256, at-most-once, 8 retries, ~24h dead-letter |
| Enhanced Markdown | GA para create/read/update page content; formato Notion-flavored con toggles, callouts, tablas, menciones y colores |
| Work management | Proyectos planos + tareas recursivas en el mismo Tasks data source; multi-space via registry, nunca discovery repetido |
| Work-management implementation | Contract/template complete; governed CLI, renderer/linter, wrapper and runtime tests are pending implementation |

## 1. When to invoke this skill — triggers matrix

Invoca esta skill **antes** de cualquiera de las siguientes situaciones:

### Triggers léxicos
- "Notion API", "Notion webhook", "Workers Notion", "ntn", "Notion-Version", "data source", "[GH] property"
- "bulk PATCH", "echo loop", "page properties_updated", "writeback", "external agent", "agent tool"
- "Custom Agent", "External Agent", "Notion MCP", "verification_token", "X-Notion-Signature"
- "notion-bq-sync", "sync conformed", "Notion teamspace", "Notion data source"

### Triggers de tarea
- Cualquier código que toque `@notionhq/client`, Notion REST API o webhooks Notion
- Diseñar writeback/sync con Notion (TASK-901, TASK-902+, TASK-910)
- Evaluar Workers vs Cloud Run para compute Notion-resident (TASK-879)
- HMAC validation / property allowlist / echo-loop filter design
- Bulk write planning (TASK-901 S5/S8)
- `ntn` CLI workflows (deploy, auth, list Workers)
- External Agents / Notion Agent SDK evaluation
- Database links / data sources migration
- Notion-Version bump en cualquier consumer
- Modificación de cualquier task con prefijo TASK-879/880/901/908/910

### Triggers de archivo
- Modificando `src/lib/sync/sync-notion-conformed.ts`, `src/lib/sync/projections/notion-*`, `src/lib/webhooks/handlers/notion-*`
- Modificando `services/notion-bq-sync/` (legacy Cloud Run)
- Tocando `notion-integration-token-*` secrets en GCP Secret Manager
- Cualquier endpoint en `src/app/api/webhooks/notion-*/route.ts`

## 2. Load order recomendado

Para cualquier task que invoque esta skill:

1. **Siempre primero**: este SKILL.md (estado canónico §0 + hard rules §5)
2. **Si tocas API**: `api-reference/endpoints-canonical.md` + `api-reference/auth-and-tokens.md`
3. **Si tocas webhooks**: `api-reference/webhooks-canonical.md` + `patterns-canonical/hmac-validation.md` + `patterns-canonical/echo-loop-filter.md`
4. **Si tocas writeback**: `patterns-canonical/bulk-patch-batching.md` + `use-cases-greenhouse/writeback-gh-metrics.md`
5. **Si evalúas Workers**: `developer-platform-2026/workers-canonical.md` + `decision-frameworks/workers-vs-cloud-run.md`
6. **Si evalúas Agents**: `developer-platform-2026/external-agents-api.md` + `developer-platform-2026/agent-tools.md`
7. **Si tocas Greenhouse-specific**: `greenhouse-runtime/tenant-config.md` + `greenhouse-runtime/demo-teamspace.md` + `greenhouse-runtime/property-allowlist.md`
   - **Si vinculás/onboardeás el teamspace de un cliente nuevo** (Berel, ANAM, …): `greenhouse-runtime/teamspace-linking-per-client-token.md` (token POR teamspace — el token ES el scope; REST NO enumera teamspaces; MCP NO es runtime-available)
8. **Si generas o actualizas el body de una page**: `api-reference/enhanced-markdown-canonical.md` + `patterns-canonical/enhanced-markdown-renderer.md`
9. **Si creas o consultas proyectos/tareas/subtareas**: `use-cases-greenhouse/work-management.md` + `greenhouse-runtime/work-space-registry.md`; para bodies, cargar además `output-templates/work-management-markdown-templates.md`
10. **Siempre antes de cerrar**: `anti-patterns-catalog.md` + `edge-cases-and-gotchas.md`

## 3. 5-pillar Notion Platform contract

Toda decisión Notion-related en Greenhouse debe superar los 5 pillars:

### Pillar 1 — Determinism
- **NUNCA** confiar payload de webhook como source of truth — siempre **re-fetch** desde API antes de compute
- Hash dedupe per (page_id, input_hash) para idempotency cross-replay
- Helper canonical (`calculateRpa`, futuros `calculateOtd`/etc.) es pure function determinística

### Pillar 2 — Safety
- **HMAC-SHA256** validation siempre en webhooks (`X-Notion-Signature: sha256=<hex>`, timing-safe compare)
- **Echo-loop filter** mandatory cuando Greenhouse escribe a Notion (compare `webhook.integration_id` vs bots in `event.authors[]`)
- **Property allowlist** explícito (`INPUT_PROPS_ALLOWLIST` constant) — drop early
- **Read-only properties** `[GH] <metric>` para operadores via permissions UI (Greenhouse integration es el único writer)

### Pillar 3 — Resilience
- Rate-limit aware: Notion permite ~3 req/sec promedio. **Cloud Tasks throttling** (2.5 req/sec safety margin) para todos los writes batched
- HTTP 429 → respetar `Retry-After`, backoff exponencial
- At-most-once delivery: 8 retries, 24h dead-letter window. **Nightly safety net** (Cloud Run Job) para webhooks perdidos
- Degraded mode honesto: cuando inputs missing → `dataStatus='unavailable'`, NUNCA fallback silencioso

### Pillar 4 — Observability
- Append-only `notion_metrics_writeback_log` con `input_hash`, `computed_values`, `formula_version`, `writeback_status`, `attempt_count`, `triggered_by`
- 6+ reliability signals canonical (writeback_dead_letter, writeback_lag, echo_loop_detected, webhook_signature_failures, shadow_paridad, nightly_drift_detected)
- `captureWithDomain(err, 'integrations.notion', { tags: { source: ..., stage: ... } })` — NUNCA `Sentry.captureException` directo

### Pillar 5 — Reversibility
- Writeback **gated por feature flag** (`NOTION_<METRIC>_WRITEBACK_ENABLED=false` default)
- Fórmulas Notion legacy preservadas mínimo **90 días** post-flip stable
- Rollback canonical < 5 min: env var flip + redeploy Cloud Run
- Snapshot pre-flip BQ restorable < 1h

## 4. Core decision frameworks (10)

Estos frameworks viven en `decision-frameworks/` y se aplican a las decisiones canonicales más comunes:

1. **Workers vs Cloud Run para compute Notion-resident** → `decision-frameworks/workers-vs-cloud-run.md` ★ POPULATED
2. **Webhook vs Polling** → `decision-frameworks/webhook-vs-polling.md` ★ POPULATED
3. **Bulk PATCH vs Individual PATCH** (cuando `/v1/pages/bulk` no existe canonical) → stub
4. **PAT vs Internal Integration Token** → stub
5. **Formula property vs Writeback canonical** → stub
6. **Agent tool (Workers) vs Traditional integration** → stub
7. **Cuándo bumpear Notion-Version** → ver `developer-platform-2026/notion-version-history.md`
8. **Database vs Data Source query** → ver `developer-platform-2026/data-sources-vs-databases.md`
9. **Cuándo usar Notion MCP vs API directa** → ver `reference/notion-mcp-tools-inventory.md`
10. **Cuándo confiar payload webhook vs re-fetch** → siempre re-fetch (regla absoluta — ver `patterns-canonical/re-fetch-pattern.md` stub)

## 5. Hard rules canonical

Reglas duras non-negociables:

1. **NUNCA** escribir Notion API call inline sin pasar por wrapper canonical (TBD: `src/lib/notion-client/`) — necesario para retry, rate-limit, Notion-Version, token resolution unificada
2. **NUNCA** confiar payload webhook como source of truth — siempre re-fetch desde Notion API antes de compute
3. **NUNCA** omitir echo-loop filter cuando Greenhouse escribe a Notion (sin filter = infinite loop que satura rate limit)
4. **NUNCA** omitir HMAC validation en webhook handler — incluso en staging
5. **NUNCA** usar PAT en path productivo automatizado — solo internal integration tokens (PAT es user-scoped, contamina audit log Notion)
6. **NUNCA** loggear payload completo Notion webhook (puede contener PII de property values) — usar `redactSensitive` primero
7. **NUNCA** crear formula property en Notion para métrica crítica ICO (boundary ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1`) — compute en Greenhouse + writeback `[GH] <metric>`
8. **NUNCA** usar Workers en producción para flow crítico bonus payroll mientras esté en Beta (Aug 11, 2026 transición a credits — pricing aún no estable)
9. **NUNCA** exceder rate limit Notion (3 req/sec sustained) sin Cloud Tasks throttling intermedio
10. **SIEMPRE** incluir `Notion-Version` header explícito en cada request (default canonical: `2026-03-11`)
11. **SIEMPRE** prefer `/v1/data_sources/{id}/query` sobre `/v1/databases/{id}/query` (legacy deprecated 2025-09-03)
12. **SIEMPRE** incluir audit trail append-only (`notion_metrics_writeback_log` o equivalente) en writeback
13. **SIEMPRE** marcar `[GH] <property>` como read-only para operadores via Notion permissions UI
14. **SIEMPRE** pasar Cloud Run endpoint que consume Notion API por `wrapCronHandler` canonical (TASK-844)
15. **SIEMPRE** invocar `captureWithDomain(err, 'integrations.notion', ...)` — Sentry directo está prohibido
16. **SIEMPRE** que emerja un Notion-Version bump nuevo, leer `developer-platform-2026/notion-version-history.md` antes de bumpear cualquier consumer (breaking changes posibles)
17. **SIEMPRE** que un agente nuevo emerja con webhook handler Notion, agregar test anti-regresión para echo-loop filter + HMAC validation
18. **NUNCA** construir manualmente Notion-flavored Markdown cuando exista el renderer/plantilla canónica; los agentes entregan DTOs normalizados
19. **NUNCA** indentar children de Enhanced Markdown con espacios; usar tabs reales y validar round-trip
20. **NUNCA** representar una subtarea como subpage o nesting de blocks; es una page del mismo Tasks data source con relación autorreferencial
21. **NUNCA** inferir teamspace por prefijo de ID ni elegir un destino ambiguo; resolver alias → `space_id` → registry → data source + secret ref
22. **SIEMPRE** validar schema fingerprint y property IDs antes de write; los nombres físicos son labels de UX, no identidad estable
23. **SIEMPRE** separar estado actual de historial: `last_edited_time` no demuestra progreso y un webhook es señal para re-fetch
24. **SIEMPRE** tratar estado terminal sin resultado/evidencia exigida como cierre incompleto

## 6. File map — POPULATED ★ vs STUB ◯

### api-reference/ — API foundations (8 archivos)
- `auth-and-tokens.md` ★ — Internal integration / OAuth / PAT (May 12, 2026) / scopes / Bearer
- `data-model.md` ★ — pages, blocks, **data sources** (vs databases legacy), properties, workspaces, teamspaces, users, agents
- `endpoints-canonical.md` ★ — Inventario completo endpoints v2026-03-11
- `webhooks-canonical.md` ★ — Event types + HMAC + verification_token + retry + at-most-once + aggregated
- `rate-limits.md` ★ — 3 req/sec promedio, 429, Retry-After, headers
- `pagination.md` ★ — cursors opaque, page_size, has_more, 10k limit + `request_status.incomplete`
- `error-handling.md` ★ — Status codes + error object shape + retryable vs non-retryable
- `enhanced-markdown-canonical.md` ★ — gramática, create/read/update, unsupported/truncation, límites y gotchas de Notion-flavored Markdown

### developer-platform-2026/ — Material nuevo crítico mayo 2026 (7 archivos POPULATED)
- `workers-canonical.md` ★ — Sandbox runtime, ntn deploy, agent tool / webhook trigger / sync schedule, pricing credits (Aug 11)
- `worker-syncs.md` ★ — Bidirectional sync con sistemas externos (Zendesk, Salesforce, Postgres)
- `agent-tools.md` ★ — Workers attached to Custom Agents — deterministic vs LLM reasoning
- `external-agents-api.md` ★ — Alpha waitlist; Claude Code/Cursor/Codex/Decagon pre-integrados
- `ntn-cli.md` ★ — Install `curl -fsSL https://ntn.dev | bash`, comandos, workers.json
- `data-sources-vs-databases.md` ★ — Terminology shift 2025-09-03 + migration path
- `notion-version-history.md` ★ — Changelog versiones API + breaking changes per version

### sdks-and-clients/ (3 POPULATED + 1 stub)
- `notion-client-node.md` ★ — `@notionhq/client` v5.23.0+ for async Markdown operations
- `notion-mcp-server.md` ★ — Tools disponibles + cuándo invocar vs API directa
- `notion-sdk-python.md` ◯ — stub (trigger: Python service emerge en repo Greenhouse)
- `community-sdks.md` ◯ — stub

### patterns-canonical/ (3 POPULATED + 4 stubs)
- `hmac-validation.md` ★ — Timing-safe compare, raw body, header parse, error responses
- `echo-loop-filter.md` ★ — 3 capas: integration_id check + property allowlist + hash dedupe
- `bulk-patch-batching.md` ★ — **CRÍTICO**: `/v1/pages/bulk` NO existe — alternativas (sequential throttled, Workers, parallel limited)
- `rate-limit-handling.md` ◯ — stub (trigger: TASK-901 S5)
- `idempotency-keys.md` ◯ — stub
- `re-fetch-pattern.md` ◯ — stub
- `property-writeback.md` ◯ — stub (trigger: TASK-901 S6)

### greenhouse-runtime/ (5 POPULATED + 2 stubs)
- `tenant-config.md` ★ — Efeonce + Sky data source IDs canonical
- `demo-teamspace.md` ★ — TASK-910 IDs canonical (Demo Greenhouse 36339c2f-...)
- `property-allowlist.md` ★ — INPUT_PROPS canonical + `[GH] <metric>` read-only convention
- `teamspace-linking-per-client-token.md` ★ — **TASK-998**: vincular teamspace de cliente nuevo = token POR teamspace (el token ES el scope). REST no enumera teamspaces; MCP no es runtime-available; gate real = acceso de la integración. Helper `discoverNotionDatabasesForToken`.
- `work-space-registry.md` ★ — resolución multi-teamspace para work management sin discovery repetido
- `notion-bq-sync.md` ◯ — stub (legacy Cloud Run, TASK-577 absorption pending)
- `bridge-identity-notion-member.md` ◯ — stub (TASK-877 follow-up + reliability signal)

### use-cases-greenhouse/ (3 POPULATED + 3 stubs)
- `read-pipeline-conformed.md` ★ — Sync orchestration BQ raw → conformed → PG
- `writeback-gh-metrics.md` ★ — TASK-901 pipeline canonical end-to-end
- `work-management.md` ★ — proyectos planos, tareas recursivas, consultas live, due state, result contract y ledger
- `demo-sandbox.md` ◯ — stub (TASK-910 implementation detail)
- `discovery-endpoints.md` ◯ — stub
- `backfill-historical.md` ◯ — stub (TASK-901 S8)

### decision-frameworks/ (2 POPULATED + 4 stubs)
- `workers-vs-cloud-run.md` ★ — Trade-offs explícitos para metric compute
- `webhook-vs-polling.md` ★ — Canonical preference + edge cases
- `bulk-vs-individual-patch.md` ◯ — stub
- `pat-vs-integration-token.md` ◯ — stub (TASK-880)
- `formula-vs-writeback.md` ◯ — stub
- `agent-tool-vs-traditional.md` ◯ — stub

### anti-patterns-catalog.md ★ — 30+ anti-patterns prohibidos
### edge-cases-and-gotchas.md ★ — 30+ casos reales aprendidos
### future-roadmap.md ★ — Workers GA timeline + bidirectional sync mature + multi-workspace federation

### investigation-gaps/ (1 POPULATED + 3 stubs)
- `workers-production-readiness.md` ★ — Qué falta saber antes de usar Workers en path bonus crítico
- `external-agents-alpha-access.md` ◯ — stub
- `database-links-capability.md` ◯ — stub
- `custom-agents-metric-compute.md` ◯ — stub

### reference/ (3 POPULATED + 2 stubs)
- `glossary.md` ★ — 40+ términos canonical
- `notion-mcp-tools-inventory.md` ★ — `mcp__claude_ai_Notion__*` disponibles
- `changelog-notion-api.md` ★ — Diff por versión 2025-09-03 → 2026-03-11 → current
- `useful-links.md` ◯ — stub
- `adr-bibliography-greenhouse.md` ◯ — stub (apunta a TASK-879/880/901/908/910)

### output-templates/ (3 POPULATED + 2 stubs)
- `webhook-handler-template.md` ★ — Skeleton canonical para handler nuevo
- `data-source-query-template.md` ★ — Pattern query + pagination
- `work-management-markdown-templates.md` ★ — templates compactos para proyecto, tarea, subtarea, cierre y snapshot
- `writeback-projection-template.md` ◯ — stub (TASK-901 reference)
- `workers-tool-template.md` ◯ — stub (cuando Workers GA emerja)

### patterns-canonical/ — additions V1.1
- `enhanced-markdown-renderer.md` ★ — AST cerrado, escaping, lint, golden tests y round-trip

**V1.1** adds the work-management, Enhanced Markdown, renderer and multi-space registry contracts while retaining the existing platform/API references and explicit stubs.

## 7. Maintenance protocol — skill viva

Esta skill es viva — evoluciona a medida que Notion Developer Platform evoluciona (cron releases ~mensual desde mayo 2026).

### Cuándo bumpear `version` del SKILL.md
- Nuevo Notion-Version GA → bump minor (`1.1`)
- Feature nueva en Developer Platform (Workers, agents, sync, etc.) → bump minor
- Breaking change que invalida hard rule → bump major (`2.0`)

### Cuándo poblar un stub
Cada stub declara su `Next review trigger` explícito. Cuando el trigger se cumpla:
1. Lee el contenido más reciente de docs canonical (developers.notion.com/page/changelog)
2. Poblar el archivo con detalle profundo siguiendo el template del archivo POPULATED hermano
3. Actualizar `last_updated` en SKILL.md
4. Bumpear version si aplica

### Cuándo agregar archivo nuevo
Si emerge una capability nueva no cubierta por la estructura vigente:
1. Agregar a la sección correspondiente
2. Update file map en este SKILL.md
3. Update mirror Codex en `~/.codex/skills/notion-platform/`

### Cuándo invalidar archivo
Si una capability se deprecate (ej. `/v1/databases/{id}/query` 2025-09-03):
1. NO borrar el archivo — agregar Delta header al inicio: `## Deprecated 2026-MM-DD — see <replacement>.md`
2. Update SKILL.md §0 estado canónico

### Cuándo cross-ref a otras skills
- Si decisión cruza con compute/runtime crítico → `arch-architect` Greenhouse overlay
- Si decisión cruza con métricas ICO → `greenhouse-ico`
- Si decisión cruza con backend Cloud Run/PG → `greenhouse-backend`
- Si decisión cruza con UI consumer de Notion data → `greenhouse-ux`

## 8. Cross-skills relevantes

| Si tu decisión Notion también toca... | Invoca también... |
|---|---|
| Architecture, ADR, blast radius | `arch-architect` |
| Métricas ICO (RpA, OTD, FTR, etc.) | `greenhouse-ico` |
| Cloud Run services, ops-worker | `greenhouse-cron-sync-ops` |
| PostgreSQL queries / schema | `greenhouse-postgres` |
| BigQuery materialization | `gcp-bigquery` |
| Reliability signals + dashboard | (no skill dedicada — pattern en `greenhouse-backend`) |
| Secret Manager + WIF | (CLAUDE.md `Secret Manager Hygiene` + `gcp-bigquery`) |

## 9. Anti-pattern resumen (full catalog en `anti-patterns-catalog.md`)

Los 5 más comunes que esta skill detecta inmediatamente:

1. **Confiar payload webhook** → siempre re-fetch
2. **Computar métrica leyendo formula Notion** (boundary violation) → compute en Greenhouse + writeback
3. **Inline PATCH a Notion sin Cloud Tasks throttling** → enqueue siempre
4. **Notion-Version implícito** (no header) → siempre explícito
5. **PAT en path productivo** → solo internal integration token

---

**Última verificación de la expansión work-management/Enhanced Markdown**: 2026-07-18. Las referencias heredadas conservan su propio `Last verified` y deben revalidarse cuando su dominio aplique.
**Próxima review automática recomendada**: cuando Notion publique nuevo release (~ mensual)
