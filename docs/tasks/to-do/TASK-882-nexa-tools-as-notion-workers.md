# TASK-882 — Nexa Tools as Notion Workers (EPIC-005 pillar)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-005` (commercial-delivery-orchestrator)
- Status real: `Diseno (blocked)`
- Rank: `TBD`
- Domain: `integrations|delivery|ai|platform`
- Blocked by: `TASK-880` (cliente canonical Greenhouse-side); External Agents API GA (alpha al 2026-05-13 — esperar GA o aceptar alpha como dependencia explícita); decisión pricing post 11-ago-2026 (Workers transition a Notion credits)
- Branch: `task/TASK-882-nexa-tools-as-notion-workers`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar 3-5 **tools read-only** como Notion Workers que expongan capabilities Greenhouse (ICO score, sprint health, meeting context, assignments) accesibles vía External Agents API directamente desde dentro de Notion. Habilita el patrón "Nexa-in-Notion": cuando un PM le pregunte a Nexa desde Notion `@Nexa dame el ICO de este proyecto`, la tool corre Notion-side via Worker que llama Greenhouse API platform-health (TASK-672) + readers canonical, y responde inline en el chat de Notion sin que el PM tenga que cambiar de surface. Es el use case más alto-valor identificado para Notion Workers en el verdict de TASK-879 Slice 4 (2026-05-15) — donde Workers GANAN sobre Cloud Run porque viven al lado del usuario en su entorno nativo, con audit log Notion-nativo + multi-agent operability OOB + latencia ~4s suficiente para chat interactivo.

## Why This Task Exists

Nexa hoy vive en Microsoft Teams (TASK-671 build out). Funciona, pero los PMs Greenhouse + clientes Globe (Sky, etc. — enterprise marketing teams) operan **principalmente en Notion** (sprint plans, meeting notes, project briefs, decisión-making). Pedirles que cambien a Teams para hablar con Nexa es friction explícito. La External Agents API de Notion (lanzada 2026-05-13 en alpha) cierra exactamente este gap: permite traer agents externos a operar dentro del editor Notion sin requerir surfaces propias.

El verdict canonical de TASK-879 Slice 4 (2026-05-15) identificó que Workers son el runtime correcto para esto:

- **Latencia ~4s validada live** (TASK-879 Slice 3 evidence) — suficiente para uso conversacional.
- **Audit log nativo per run** — Notion provee timestamps + exitCode + capability key + duración sin configurar nada.
- **Multi-agent operability OOB** — múltiples agents concurrentes pueden invocar las mismas tools.
- **Stack JS/TS alineado** con Greenhouse.
- **Sin servidor propio** — corre en infra Notion, NO requiere Cloud Run nuevo.

Sin esta task, Nexa queda confinada a Teams y perdemos el momentum que TASK-879 Slice 3 demostró: Workers funcionan end-to-end en Efeonce y son apt para production tools cuando External Agents API salga de alpha.

## Goal

- Implementar 3-5 tools read-only (V1 scope) como Notion Workers que expongan: ICO de un proyecto, salud del sprint, última reunión + attendees + summary, status alto-nivel, asignaciones del PM.
- Cada tool llama Greenhouse API platform-health (TASK-672) o readers canonical (`getOrganizationExecutiveSnapshot`, `readSpaceMetrics`, etc. ya re-exportados por TASK-822 Client Portal BFF) usando un token API scoped + capability granular nueva (`integrations.notion.worker.invoke`).
- Conectar las tools al External Agents API endpoint donde Nexa registre las capabilities y las invoque con identity context del caller (PM real Greenhouse).
- Identity bridge canonical: cuando el PM Notion-side invoca `@Nexa getProjectIco`, el Worker resuelve `notion_user_id → members.notion_user_id → member_id` (reusando cascade TASK-877 + bot identity) y pasa el `member_id` al endpoint Greenhouse para que la respuesta respete capability boundaries del caller real.
- Reliability signals: `integrations.notion.workers.tool_failure_rate` (warning si > 5% últimas 24h) + `integrations.notion.workers.tool_latency_p95` (warning si > 8s, error si > 15s).
- Auth canonical: token API Greenhouse persistido como Worker env var via `ntn workers env`, scoped (NO admin), rotation runbook documentado, audit per inbound call con `request_id` correlation Notion-side ↔ Greenhouse-side.
- Pricing observability: monitor consumo de Notion credits por Worker via `ntn workers usage` post 11-ago-2026; documentar threshold de re-evaluación (si excede $X/mes, evaluar fallback a Cloud Run con Teams bot polling).
- Sin breaking change para Nexa-en-Teams (TASK-671) — esta task es additive, multi-channel.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (TASK-672 Platform Health V1 contract)
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (BFF readers re-exportados V1.1)
- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **NUNCA** exponer un tool desde un Worker que pueda mutar state Greenhouse-side. V1 es 100% read-only. Mutations (e.g. update task status, post comment, mark sprint as done) son out-of-scope V1; emergerán en V2 con capability `worker.mutate.*` separada y audit row obligatorio.
- **NUNCA** persistir el token API Greenhouse en código del Worker (commit ni Notion source). Solo via `ntn workers env set` con secret name canonical (`GREENHOUSE_API_TOKEN`).
- **NUNCA** dar al token Worker capabilities admin / mutation / sensitive. Capability scope canonical: `integrations.notion.worker.invoke` (action=`read`, scope=`tenant`, allowed_consumers=`worker_runtime`). Endpoints inbound DEBEN validar que el caller subject tenga ese capability + matchee `worker_runtime` source.
- **NUNCA** loggear `member_id` resuelto en logs Notion-side (los runs de Worker son visibles a admins workspace). Logger interno del Worker usa `notion_user_id` solo; el `member_id` pasa a Greenhouse pero NO se persiste local en el Worker.
- **NUNCA** invocar `Sentry.captureException` directo en Greenhouse-side endpoints inbound de Workers. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'worker_inbound', tool, workerRunId } })`.
- **NUNCA** proceed con production deploy del Worker antes de External Agents API GA. Si Notion mantiene alpha > Q3 2026, re-evaluar timing.
- **NUNCA** confiar en `ntn workers exec` como path de invocación production — ese es CLI testing. Production invocation viene **siempre** desde External Agents API → Notion runtime → Worker. Si emerge necesidad de invocar la tool desde Greenhouse-side directly (e.g. background sync), agregar Cloud Run endpoint paralelo, NO via Worker.
- Cualquier tool nueva post V1 require capability mapping + audit + reliability signal extension. NUNCA agregar tool a Worker sin matching gate Greenhouse-side.

## Normative Docs

- TASK-879 Slice 3 evidence (2026-05-15) — Worker pilot cross-agent validated
- TASK-879 Slice 4 verdict (2026-05-15) — hybrid arquitectura canonical
- TASK-880 spec — cliente canonical + cascade auth resolver
- TASK-881 spec — Meeting Notes endpoint contract validated (consumer share-able si tool `getLastMeetingSummary` lo necesita)
- TASK-822 spec — Client Portal BFF readers re-exportados
- TASK-672 spec — Platform Health V1 API contract
- TASK-671 spec — Nexa Teams bot (compañero Multi-channel)
- Notion docs:
  - https://developers.notion.com/workers/get-started/overview
  - https://developers.notion.com/workers/guides/tools
  - https://developers.notion.com/agents/external-agents (alpha al 2026-05-13)
  - https://developers.notion.com/cli/get-started/overview

## Dependencies & Impact

### Depends on

- **TASK-880** (foundation) — necesita `NotionApiClient` canonical para que Worker llame Notion API (e.g. resolver attendees, fetch page context cuando tool lo requiera).
- **External Agents API GA** — alpha al 2026-05-13. Si Notion mantiene alpha > Q3 2026, evaluar shipping con alpha aceptado como riesgo documentado o esperar.
- **TASK-672** Platform Health V1 — contract `platform-health.v1` para que Workers consulten estado plataforma antes de actuar.
- **TASK-877** identity reconciliation — `identity_profile_source_links` con `notion_user_id` populated para resolver caller PM → member_id Greenhouse-side.
- **TASK-822** Client Portal BFF — `getOrganizationExecutiveSnapshot`, `readSpaceMetrics` ya re-exportados como curated readers; tools V1 los consumen directo.
- **TASK-879** Slice 3 evidence — Worker pilot funcional + cross-agent operability validada (sandbox `019e2937-183d-7383-9159-83c29cb685ee`).
- `services/ops-worker/` — referencia de Cloud Run sibling (NO se reemplaza, complementa).
- `src/lib/api-platform/` — endpoints inbound canonicals (a crear bajo `/api/notion-workers/v1/*`).
- `greenhouse_core.notion_personal_access_tokens` (TASK-880 Slice 2) — extender con scope tier `worker_runtime` o crear tabla paralela `greenhouse_core.notion_worker_api_tokens`.
- `greenhouse_core.capabilities_registry` — seed nueva capability `integrations.notion.worker.invoke`.

### Blocks / Impacts

- **Habilita**: Nexa-in-Notion como surface multi-channel (Teams + Notion). Reduce friction PM significativamente.
- **Coordina con**: TASK-671 (Nexa Teams bot) — compartir capability discovery + tool registry; misma logic backend, distintos canales.
- **Coordina con**: EPIC-005 commercial-delivery-orchestrator — primera materialización del agent angle del epic.
- **Impacta**: si esta task ship, futuras tasks de tools (mutaciones, automation triggers) deben extender el Worker existente, NO crear paralelos.
- **No impacta**: pipeline canonical delivery / ICO / payroll. Tools son read-only; consumen estado, no lo mutan.
- **Riesgo cross-task**: si pricing post 11-ago-2026 hace Workers inviable, fallback path es exponer las mismas capabilities como Bot Framework conversation extensions o Notion App custom integration — pero esos paths NO ofrecen latencia ~4s ni audit nativo.

### Files owned

- `services/notion-workers/nexa-tools/` — NEW directory para Worker code (sibling a `services/ops-worker/`, `services/commercial-cost-worker/`, etc.)
  - `package.json`, `tsconfig.json`, `src/index.ts` con tool registrations
  - `src/tools/get-project-ico.ts`
  - `src/tools/get-sprint-health.ts`
  - `src/tools/get-last-meeting-summary.ts`
  - `src/tools/get-project-status.ts`
  - `src/tools/get-my-assignments.ts`
  - `src/lib/greenhouse-api-client.ts` — HTTP client interno del Worker para llamar Greenhouse API
  - `src/lib/identity-resolver.ts` — `notion_user_id → member_id` cascade lookup
  - `src/lib/redact.ts` — local mirror de `redactSensitive` (Workers no comparten code con `src/lib/`)
- `src/app/api/notion-workers/v1/*` — endpoints inbound canonical bajo este namespace:
  - `POST /api/notion-workers/v1/identity/resolve` — recibe `notion_user_id`, devuelve `member_id` + redacted user info
  - `GET /api/notion-workers/v1/projects/[projectId]/ico`
  - `GET /api/notion-workers/v1/sprints/[sprintId]/health`
  - `GET /api/notion-workers/v1/projects/[projectId]/last-meeting`
  - `GET /api/notion-workers/v1/projects/[projectId]/status`
  - `GET /api/notion-workers/v1/me/assignments`
- `src/lib/api-platform/worker-auth.ts` — gate canonical para validar token Worker + capability scope + request_id correlation
- `src/lib/reliability/queries/notion-workers-tool-failure-rate.ts` — signal reader
- `src/lib/reliability/queries/notion-workers-tool-latency-p95.ts` — signal reader
- `migrations/<timestamp>_task-882-notion-worker-api-tokens.sql` — schema canonical para tokens scoped (extender notion_personal_access_tokens TASK-880 con scope tier `worker_runtime` o crear tabla paralela)
- `migrations/<timestamp>_task-882-capabilities-registry-seed.sql`
- `docs/architecture/GREENHOUSE_NEXA_TOOLS_NOTION_WORKERS_V1.md` — NEW spec
- `docs/architecture/DECISIONS_INDEX.md` — entry nueva
- `docs/documentation/plataforma/nexa-en-notion.md` — NEW doc funcional
- `docs/manual-de-uso/plataforma/nexa-en-notion.md` — NEW manual operador + cliente
- `scripts/notion-workers/deploy-nexa-tools.sh` — deploy idempotente vía `ntn workers deploy`
- `scripts/notion-workers/rotate-greenhouse-api-token.sh` — rotation runbook scriptado

## Current Repo State

### Already exists

- Worker pilot sandbox `greenhouse-cli-readiness-sandbox` (`019e2937-183d-7383-9159-83c29cb685ee`) vivo en Notion workspace Efeonce con tool sample `sayHello` ejecutada exitosamente cross-agent (TASK-879 Slice 3 evidence).
- `ntn` CLI 0.14.0 instalado + autenticado contra workspace Efeonce (TASK-879 Slice 1).
- Cloud Run sibling pattern para new services (`services/ops-worker/`, `services/commercial-cost-worker/`, `services/ico-batch/`, `services/hubspot_greenhouse_integration/`) — patron reusable para `services/notion-workers/nexa-tools/`.
- Platform Health V1 API contract (TASK-672) operativo — endpoints `/api/admin/platform-health` y `/api/platform/ecosystem/health` ya entregan composición canonical.
- Client Portal BFF readers (TASK-822) re-exportan `getOrganizationExecutiveSnapshot` + `readSpaceMetrics` que las tools V1 pueden consumir.
- TASK-877 `identity_profile_source_links` con `notion_user_id` poblado para colaboradores internos (poblado para algunos clientes según workspace shares).
- ICO engine readers operativos (`/api/projects/[id]/ico` o equivalente — verificar en Slice 0 audit).
- `captureWithDomain('integrations.notion', ...)` operativo (TASK-844).

### Gap

- No existe directory `services/notion-workers/` ni Worker production-grade.
- No hay endpoints inbound `/api/notion-workers/v1/*`.
- No hay capability `integrations.notion.worker.invoke` ni grant runtime.
- No hay schema PG para tokens API scoped a Worker runtime (decisión: extender TASK-880 `notion_personal_access_tokens` con tier `worker_runtime` o crear tabla paralela — Slice 0 evalúa).
- No hay reliability signals para tool failure rate ni latency p95.
- No hay External Agents API integration code (Nexa Notion-side).
- No hay deploy automation (`scripts/notion-workers/deploy-nexa-tools.sh`).
- No hay rotation runbook ni surface admin para revocar token Worker.
- No hay observability bridging Notion `ntn workers runs list` ↔ Greenhouse-side request_id correlation.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Discovery + External Agents API readiness check

- Verificar status External Agents API: alpha vs GA, waitlist required, rate limits, pricing.
- Si alpha al inicio de Slice 1: documentar como riesgo aceptado + plan de revert si Notion deprecates.
- Audit endpoints Greenhouse que las tools V1 necesitan consumir. Confirmar disponibilidad + shape:
  - ICO: `/api/projects/[id]/ico` o `getIcoForProject(projectId)` reader canonical
  - Sprint health: `getSprintHealthSnapshot(sprintId)` (TASK-708 commercial cost attribution + TASK-720 capacity?)
  - Last meeting: blocked by TASK-881 V1 (si no shipped, V1 omite tool `getLastMeetingSummary` y queda como follow-up)
  - Project status: `getOrganizationExecutiveSnapshot` (TASK-822 BFF) o `getProjectStatusSnapshot` reader nuevo
  - My assignments: `client_team_assignments` reader scoped al `member_id` resuelto
- Decisión auth model: extender `notion_personal_access_tokens` (TASK-880 Slice 2) con tier `worker_runtime` o tabla paralela `notion_worker_api_tokens`. Recomendación: tabla paralela porque shape es distinto (Worker token NO está atado a operador humano, está atado a Worker ID + lifecycle del Worker).
- Decisión observability: cómo correlacionar Notion `ntn workers runs list <workerId>` con Greenhouse-side `audit_log`. Propuesta: pasar `worker_run_id` Notion-side como header `X-Notion-Worker-Run-Id` en cada llamada inbound; Greenhouse loggea + correlaciona.
- Decisión identity bridge: cuando External Agents API invoca el Worker en nombre del PM, ¿qué identity context viene en el payload? Si no viene `notion_user_id`, identity resolution falla. Confirmar contract.
- Output: `docs/audits/notion/TASK-882-external-agents-api-and-tools-contract-2026-XX-XX.md`.

### Slice 1 — Worker scaffold + Greenhouse API client + identity resolver

- Crear directory `services/notion-workers/nexa-tools/` con Worker scaffold (`ntn workers new nexa-tools` template).
- Implementar `src/lib/greenhouse-api-client.ts`:
  - HTTP client con base URL Greenhouse production (`https://greenhouse.efeoncepro.com` o staging `https://dev-greenhouse.efeoncepro.com` configurable).
  - Auth via Bearer token leído de Worker env var `GREENHOUSE_API_TOKEN`.
  - Headers: `Authorization`, `X-Notion-Worker-Run-Id` (auto-poblado desde Worker context), `X-Notion-User-Id` (caller identity), `X-Greenhouse-Client-Source: notion_worker_nexa_tools_v1`.
  - Timeout 8s (>= max latencia tolerable end-to-end). Retry 1x para 5xx (NO 429 — backoff exponencial).
  - Errores con `redactSensitive` (local mirror) antes de cualquier log.
- Implementar `src/lib/identity-resolver.ts`:
  - `resolveCallerMember(notionUserId)` → `{memberId, displayName} | null`. Cache TTL 5 min in-memory per Worker invocation context.
  - Llama `POST /api/notion-workers/v1/identity/resolve` con `notion_user_id`.
- Tool boilerplate: cada tool registrada con `worker.tool(<name>, schema)` valida input schema + invoca client + retorna structured response.
- Tests Vitest local: 10+ tests cubren happy path, retry, timeout, identity miss, redaction.
- NO deploy todavía — Slice 1 solo construye scaffold + tests pasan local.

### Slice 2 — Endpoints inbound Greenhouse-side + capability + token storage

- Migration `<timestamp>_task-882-notion-worker-api-tokens.sql`:
  - Tabla `greenhouse_core.notion_worker_api_tokens` (separada de `notion_personal_access_tokens` TASK-880):
    - `worker_token_id UUID PK DEFAULT gen_random_uuid()`
    - `worker_id TEXT NOT NULL` (Notion-side worker UUID)
    - `worker_name TEXT NOT NULL` (e.g. `nexa-tools`)
    - `workspace_id TEXT NOT NULL`
    - `token_value_full TEXT NOT NULL` (encrypted at rest pattern TASK-697 + TASK-880)
    - `token_value_hash BYTEA NOT NULL`
    - `token_display_mask TEXT NOT NULL`
    - `scope TEXT NOT NULL CHECK (scope = 'worker_runtime')` (enum cerrado V1)
    - `created_by TEXT NOT NULL` (admin que registró el token)
    - `last_used_at TIMESTAMPTZ NULL`
    - `last_rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `revoked_at TIMESTAMPTZ NULL`, `revoked_by TEXT NULL`, `revoke_reason TEXT NULL`
    - `created_at`, `updated_at` audit
    - UNIQUE INDEX partial `(worker_id) WHERE revoked_at IS NULL` (un token activo por worker).
  - Trigger `set_updated_at`.
  - Anti pre-up-marker DO block.
  - Audit log table `greenhouse_core.notion_worker_api_token_audit_log` (append-only, trigger anti-update/delete).
  - GRANTs estrictos.
- Migration `<timestamp>_task-882-capabilities-registry-seed.sql`:
  - `integrations.notion.worker.invoke` (module=`integrations`, action=`read`, scope=`tenant`).
  - `integrations.notion.worker.register_token` (action=`create`, scope=`tenant`) — EFEONCE_ADMIN only.
  - `integrations.notion.worker.revoke_token` (action=`delete`, scope=`tenant`) — EFEONCE_ADMIN only.
  - Grants en `src/lib/entitlements/runtime.ts` (CLAUDE.md TASK-873 invariant).
- Implementar gate canonical `src/lib/api-platform/worker-auth.ts`:
  - `requireNotionWorkerSubject(req) → {workerId, workerName, callerMemberId | null}`.
  - Valida Bearer token contra `notion_worker_api_tokens.token_value_hash`. Rechaza con `401 unauthorized` si miss o revoked.
  - Resuelve `X-Notion-User-Id` header → `callerMemberId` via `identity_profile_source_links`. Devuelve null si miss (tool decide si proceeder con scope = `system` o requerir caller identity).
  - Persiste audit row en `notion_worker_api_token_audit_log` per request.
  - Update `last_used_at` per request.
- Implementar endpoints `/api/notion-workers/v1/*` (5 endpoints):
  - `POST /identity/resolve` — body `{notion_user_id}`, response `{memberId, displayName, hasAccess: boolean}` masked.
  - `GET /projects/[projectId]/ico` — gate: caller debe ser miembro del project o admin.
  - `GET /sprints/[sprintId]/health` — gate: caller miembro del space/project.
  - `GET /projects/[projectId]/last-meeting` — gate: caller miembro + capability `delivery.meeting_notes.read` (TASK-881 capability si shipped, sino skip endpoint y queda follow-up).
  - `GET /projects/[projectId]/status` — gate: caller miembro.
  - `GET /me/assignments` — caller-scoped, devuelve `client_team_assignments` activos del `callerMemberId`.
- Cada endpoint retorna response shape canonical: `{ok: true, data: {...}, requestId}` o `{ok: false, error: canonicalErrorResponse(...), requestId}`. Compatible con External Agents API tool result format.
- Tests: 25+ tests cubren auth, capability gating, identity resolution, response shape, error contracts.

### Slice 3 — Tool implementations + deploy + smoke

- Implementar las 5 tools en `services/notion-workers/nexa-tools/src/tools/`:
  - `getProjectIco`: input `{projectId}`, output `{ico: number, factors: [...], lastUpdated: ISO-8601, healthLabel: 'green'|'yellow'|'red'}`.
  - `getSprintHealth`: input `{sprintId}`, output `{progressPct, deliveryRiskLabel, blockedTasks: [...], lastUpdated}`.
  - `getLastMeetingSummary`: input `{projectId}`, output `{meetingDate, attendees: [...], summary: string, transcriptUrl?: string}`. SKIP si TASK-881 no shipped — feature flag `NEXA_LAST_MEETING_TOOL_ENABLED` default false.
  - `getProjectStatus`: input `{projectId}`, output `{status: 'active'|'at_risk'|...|, activeTasksCount, completedTasksCount, lastUpdated}`.
  - `getMyAssignments`: input `{}` (caller from context), output `{assignments: [{projectId, projectName, role, fteContribution}, ...]}`.
- Deploy via `bash scripts/notion-workers/deploy-nexa-tools.sh`:
  - Lee env vars del operador (`NOTION_WORKSPACE_ID`, `GREENHOUSE_API_TOKEN_REF` apuntando a GCP Secret Manager).
  - Corre `ntn workers deploy` desde `services/notion-workers/nexa-tools/`.
  - Set env vars Worker-side via `ntn workers env set <workerId> GREENHOUSE_API_TOKEN <value>`.
  - Verifica deploy con `ntn workers exec` smoke test post-deploy.
- Smoke staging: cada tool ejecutada via `ntn workers exec <toolName> --worker-id <id> -d '{...}'` con caller identity test → assert response shape + endpoint Greenhouse loggeó audit row + identity resolution OK.
- Tests E2E (manual o Playwright si emerge necesidad): tool execution end-to-end desde Notion → External Agents API → Worker → Greenhouse → response.

### Slice 4 — External Agents API registration + Nexa wiring + observability

- Si External Agents API es GA: registrar `nexa-tools` Worker como agent provider. Configurar agent metadata (name, description, icon, capability list).
- Si alpha: documentar workaround si emerge friction (e.g. registro manual via Notion admin UI).
- Wire Nexa-Notion-side: cuando un PM invoca `@Nexa <command>` en Notion, External Agents API routea a las tools del Worker basado en intent matching.
- Reliability signals:
  - `integrations.notion.workers.tool_failure_rate` (kind=drift, severity=warning >5% últimas 24h, error >15%):
    - Reader cuenta `notion_worker_api_token_audit_log` rows con `response_status >= 500` últimas 24h / total requests.
  - `integrations.notion.workers.tool_latency_p95` (kind=lag, warning >8s, error >15s):
    - Reader computa `percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)` desde audit log.
- Wire-up en `getReliabilityOverview` source `integrations.notion[]`. Subsystem rollup: `Integrations`.
- Observability bridging: dashboard admin `/admin/integrations/notion/workers` muestra:
  - Workers registrados (consume `ntn workers list` via API o GCP Cloud Function intermediario)
  - Last 24h: total tool calls, failure rate, p95 latency
  - Per tool: invocation count + avg latency + error rate
  - Token rotation due (>180d sin rotation)
- Tests: 15+ tests reliability signals + endpoints admin.

### Slice 5 — Pricing observability + rotation runbook + docs + close

- Implementar monitor pricing post 11-ago-2026:
  - Cron weekly que invoque `ntn workers usage <workerId>` (si CLI accessible desde server) o equivalente API.
  - Persiste `greenhouse_sync.notion_workers_usage_history` (worker_id, period_start, period_end, credits_consumed, ai_calls_count).
  - Reliability signal `integrations.notion.workers.credits_burn_rate` (warning si > $50/mes equivalent, error si > $200/mes — thresholds tunables).
- Implementar rotation flow para `GREENHOUSE_API_TOKEN`:
  - Script `scripts/notion-workers/rotate-greenhouse-api-token.sh`:
    1. Genera nuevo token via admin endpoint POST `/api/admin/notion-workers/tokens` (capability `integrations.notion.worker.register_token`).
    2. Set Worker env via `ntn workers env set <workerId> GREENHOUSE_API_TOKEN <new_value>`.
    3. Smoke test post-rotation con `ntn workers exec`.
    4. Revoca token viejo via DELETE `/api/admin/notion-workers/tokens/[id]`.
  - Runbook documentado en `docs/operations/runbooks/notion-workers-token-rotation.md`.
- Surface admin (`/admin/integrations/notion/workers`):
  - Lista tokens registered + status + last_used + rotate/revoke actions
  - Botón "Probar tool" — invoca smoke test in-place
- Doc funcional `docs/documentation/plataforma/nexa-en-notion.md` v1.0.
- Manual operador + cliente `docs/manual-de-uso/plataforma/nexa-en-notion.md` (cómo invocar `@Nexa` desde Notion + qué tools están disponibles + qué hacer si falla).
- ADR entry en `docs/architecture/DECISIONS_INDEX.md`: "Nexa Tools canonical = Notion Workers para read-only tools, NO Cloud Run para use case Notion-native".
- Spec `GREENHOUSE_NEXA_TOOLS_NOTION_WORKERS_V1.md` con boundaries + tool registry + token lifecycle + observability contract.
- CLAUDE.md + AGENTS.md hard rules section "Nexa Tools as Notion Workers invariants".

## Out of Scope

- NO mutations Greenhouse-side desde Workers V1. Read-only enforced por capability gate.
- NO mutations Notion-side desde Workers V1 (e.g. tool que crea pages, comenta, marca tasks done). Esos son V2.
- NO migración de tools existentes Nexa-Teams a Workers — los 2 canales coexisten.
- NO refactor del Bot Framework Connector (TASK-671) — esta task es additive.
- NO External Agents API integration custom si Notion no lo expone públicamente. Si alpha NO permite registro programático, V1 ship con registro manual via admin UI documentado en runbook.
- NO observability profunda de Worker internals (Notion no expone más allá de runs list + logs). Bridging Greenhouse-side cubre lo necesario.
- NO capability granular per-tool en V1 — un único `integrations.notion.worker.invoke` cubre las 5 tools. V2 agrega per-tool si emerge necesidad de scoping fino.
- NO pricing optimization profundo (bundling, batching, caching) en V1. Monitor + threshold + escalation.
- NO multi-workspace Worker. V1 vive en workspace Efeonce. Multi-workspace (e.g. Worker dedicado al workspace de Sky) es V2 contingente con cliente piloto.

## Detailed Spec

### Tool registry V1

| Tool | Endpoint inbound GH | Caller identity required? | Capability gate (caller-side) |
|---|---|---|---|
| `getProjectIco` | `GET /api/notion-workers/v1/projects/[projectId]/ico` | Yes | caller miembro del project OR admin |
| `getSprintHealth` | `GET /api/notion-workers/v1/sprints/[sprintId]/health` | Yes | caller miembro del space |
| `getLastMeetingSummary` | `GET /api/notion-workers/v1/projects/[projectId]/last-meeting` | Yes | caller miembro + `delivery.meeting_notes.read` (TASK-881) |
| `getProjectStatus` | `GET /api/notion-workers/v1/projects/[projectId]/status` | Yes | caller miembro del project |
| `getMyAssignments` | `GET /api/notion-workers/v1/me/assignments` | Yes (mandatory) | caller-scoped, no capability adicional |

### Identity bridge contract

External Agents API debe pasar identity context del PM caller en el payload de invocación:

```json
{
  "tool": "getProjectIco",
  "input": { "projectId": "<notion_project_id>" },
  "context": {
    "user": {
      "notion_user_id": "<uuid>",
      "workspace_id": "d1de7cb1-0325-4b73-a4d3-f266ae396f15"
    },
    "agent_run_id": "<external_agents_api_run_id>"
  }
}
```

Worker resuelve `notion_user_id → callerMemberId` antes de llamar Greenhouse API.

Si `notion_user_id` ausente del context (e.g. caller no logueado, anonymous mode): Worker rechaza con `INSUFFICIENT_CONTEXT` y NO invoca Greenhouse.

### Auth chain

```text
Notion User PM (Julio)
  ↓ "@Nexa getProjectIco for Sky Sprint 12"
External Agents API
  ↓ POST tool invoke con context.user.notion_user_id
Notion Worker `nexa-tools`
  ↓ resolveCallerMember(notion_user_id) → memberId via Greenhouse
  ↓ HTTP GET /api/notion-workers/v1/projects/<id>/ico
  ↓   Bearer GREENHOUSE_API_TOKEN
  ↓   X-Notion-User-Id: <notion_user_id>
  ↓   X-Notion-Worker-Run-Id: <run_id>
Greenhouse API endpoint
  ↓ requireNotionWorkerSubject(req) → {workerId, callerMemberId}
  ↓ can(callerMemberSubject, 'project.ico.read', 'read', 'tenant') ? 
  ↓ getProjectIcoSnapshot(projectId)
  ↓ persist audit row + return
```

### Reliability signal thresholds rationale

- `tool_failure_rate > 5%`: tools con failure rate sostenido reflejan bug Worker-side o Greenhouse-side. Investigation mandatory.
- `tool_failure_rate > 15%`: signal critical — pager-level. Probable downtime Greenhouse o token revoked.
- `tool_latency_p95 > 8s`: usuario PM percibe lag conversacional inaceptable. Tuning required.
- `tool_latency_p95 > 15s`: tool unusable. External Agents API probablemente timeoutea antes.

### Pricing model (post 11-ago-2026)

Notion credits per Worker run:
- Tool sample sin AI: validado live `0` credits (TASK-879 Slice 3).
- Tools V1 NO usan AI internamente (solo HTTP fetch a Greenhouse + JSON return). Estimate: similar zero-cost.
- Si emerge tool V2 que usa Notion AI (e.g. summarize meeting notes inline): credits non-zero.

Threshold de re-evaluación: si consumo mensual > $200 USD equivalente, evaluar:
- Bundling tool calls (batch multiple invocations)
- Caching response Greenhouse-side con TTL corto
- Fallback a Bot Framework conversation extension Notion-side (con polling)

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 DEBE finalizar antes de cualquier otro slice.
- Slice 1 (Worker scaffold) puede correr en paralelo con Slice 2 (endpoints) — son code-bases distintas.
- Slice 2 DEBE finalizar antes de Slice 3 (Worker necesita endpoints para llamar).
- Slice 3 DEBE finalizar antes de Slice 4 (Worker desplegado para registrar en External Agents API).
- Slice 4 DEBE finalizar antes de Slice 5 (signals necesitan tools en producción para tener data).
- TASK-880 Slice 0-2 (foundation auth) DEBE estar mergeado antes de Slice 1 (Worker reusará patterns auth).
- TASK-881 Slice 4 (Meeting Notes endpoint) recomendable pero NO bloqueante — tool `getLastMeetingSummary` skip-eable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| External Agents API alpha cambia contract sin notice | Integrations / Notion | high | feature flag global `NEXA_NOTION_TOOLS_ENABLED` default false; revert <5min | `tool_failure_rate` spike + Sentry domain=integrations.notion |
| Token GREENHOUSE_API_TOKEN leak via Worker logs | Secrets / Auth | medium | redactSensitive en Worker + audit log ANY token usage Greenhouse-side | secret scan / audit log review |
| Pricing post 11-ago-2026 escala sin budget | Cost / Ops | medium | reliability signal `credits_burn_rate` con threshold + escalation runbook | signal warning >$50/mes |
| Tool returns PII de cliente via summary que External Agents API logea | Privacy / compliance | medium | redact en Worker antes de return + capability gate caller-side | Sentry payload review |
| Multi-agent collision (Codex + Claude + Nexa concurrent runs) | Notion Workers | low (validated cross-agent OK) | Worker stateless por design; concurrent runs OK per evidence TASK-879 Slice 3 | run failure rate spike |
| Identity resolution miss (PM client no en `identity_profile_source_links`) | Identity | medium | endpoint identity/resolve devuelve graceful fallback `hasAccess: false`; Worker responde "no tengo acceso" en lugar de crash | `identity_profile_source_links` lag signal |
| Latencia chain (Notion → External Agents API → Worker → GH → Worker → Notion) > 15s | UX | medium | timeout 8s en Worker; circuit breaker en GH endpoints | `tool_latency_p95` |
| Worker deploy fails sin rollback claro | Ops | low | `ntn workers delete` + redeploy versión anterior; idempotent deploy script | deploy script exit code |

### Feature flags / cutover

- `NEXA_NOTION_TOOLS_ENABLED` (env var Vercel + Worker — kill-switch global). Default `false`. Si `false`, endpoints inbound `/api/notion-workers/v1/*` retornan `503 service_unavailable` y External Agents API recibe error.
- `NEXA_LAST_MEETING_TOOL_ENABLED` (default `false` hasta TASK-881 V1 shipped + verified live).
- `NEXA_NOTION_TOOLS_PRICING_MONITOR_ENABLED` (default `true` post 11-ago-2026 cuando pricing transition emerja).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert audit doc | <5 min | sí |
| Slice 1 | Revert PR — Worker scaffold no deployado | <10 min | sí |
| Slice 2 | Migration down (DROP table + revoke capability) + revert PR | <30 min | sí |
| Slice 3 | `ntn workers delete <workerId>` + revert deploy script | <10 min | sí |
| Slice 4 | Disable flag + remove agent registration External Agents API admin UI | <10 min | sí |
| Slice 5 | Disable monitor cron + revert signals wire-up | <10 min | sí |

### Production verification sequence

1. TASK-880 Slice 4 (version bump) verificado en producción 7d sin regresión → green light TASK-882.
2. External Agents API status verificado (alpha vs GA) en Slice 0.
3. Slice 1 Worker scaffold + tests verde local.
4. Slice 2 migrations aplicadas en staging → `pnpm migrate:status` verifica + DO blocks pasan + capabilities seedadas + grants en runtime.ts.
5. Slice 3 Worker deployado a workspace test (NO production Efeonce todavía si emerge workspace de testing) → smoke test cada tool.
6. Slice 4 External Agents API registration + flag `NEXA_NOTION_TOOLS_ENABLED=true` en staging → verificar PM piloto puede invocar `@Nexa getProjectIco` y recibir respuesta válida.
7. Promote a producción con flag `false` → activación gradual: 1 PM Greenhouse interno (Julio) → 1 PM piloto cliente → roll-out general.
8. Monitor reliability signals durante 30d post-prod por workspace.

### Out-of-band coordination required

- Verificar plan tier Notion para External Agents API (puede requerir Plus/Business/Enterprise tier).
- Coordinar con cliente piloto (Sky o equivalente) si esta task ship multi-workspace V1 — informar acceso de Nexa a su workspace + capability boundaries + audit trail.
- Consentimiento legal del cliente para que Nexa procese context de meeting notes / project data desde Notion (puede requerir adenda contractual).
- Coordinar con External Agents API team Notion (waitlist alpha) si requirements emergen pre-GA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] External Agents API status documentado + tools V1 registry definido (Slice 0).
- [ ] Worker `nexa-tools` deployado + 5 tools operativas + tests Vitest 25+ verde + smoke test cada tool verde (Slice 3).
- [ ] 5 endpoints inbound `/api/notion-workers/v1/*` operativos + capability `integrations.notion.worker.invoke` seeded + grants en runtime.ts + parity test verde (Slice 2).
- [ ] `notion_worker_api_tokens` table aplicada + audit log append-only operativo + token rotation runbook scriptado (Slice 5).
- [ ] Identity bridge funcional: PM Greenhouse invoca tool desde Notion → Worker resuelve `notion_user_id → memberId` → endpoint respeta capability boundaries del caller real.
- [ ] Reliability signals `tool_failure_rate` + `tool_latency_p95` registrados + visible en `/admin/operations` + steady state verificado.
- [ ] Surface admin `/admin/integrations/notion/workers` operativa (lista workers + tokens + métricas + rotate action).
- [ ] Doc funcional + manual operador/cliente + ADR + spec arquitectónica V1 merged.
- [ ] CLAUDE.md + AGENTS.md hard rules agregadas.
- [ ] Verificación con PM piloto (Julio + 1 cliente) post staging activation: invoca cada tool desde Notion + respuesta válida + audit trail completo + sin PII leak.
- [ ] Pricing monitor implementado + threshold + escalation runbook documentado (Slice 5).
- [ ] No regresión: Nexa Teams bot (TASK-671) sigue funcional sin cambios.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (full suite — CLAUDE.md task closing quality gate)
- `pnpm build` (Turbopack)
- `pnpm migrate:status` post Slice 2
- Smoke staging: cada tool ejecutada via External Agents API real con PM caller real → assert response + audit + no PII leak.
- Manual review reliability dashboard `/admin/operations` post-deploy.
- Manual review audit log `notion_worker_api_token_audit_log` post primera invocación.
- Verificación pricing post 11-ago-2026: 7d steady state + signal `credits_burn_rate` < threshold.

## Closing Protocol

- [ ] `Lifecycle` sincronizado, archivo en `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con aprendizajes
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado sobre TASK-671 (Nexa Teams bot — multi-channel coexistencia), EPIC-005 (commercial-delivery-orchestrator — primer pillar materializado), TASK-880 (foundation usada), TASK-881 (Meeting Notes consumer si shipped)
- [ ] CLAUDE.md sección "Nexa Tools as Notion Workers invariants" agregada
- [ ] AGENTS.md mirror del invariant
- [ ] Spec arquitectónica `GREENHOUSE_NEXA_TOOLS_NOTION_WORKERS_V1.md` v1.0
- [ ] ADR en `DECISIONS_INDEX.md`
- [ ] Cliente piloto comunicado + audit log compartido si lo solicitan
- [ ] Doc funcional `docs/documentation/plataforma/nexa-en-notion.md`
- [ ] Manual operador/cliente `docs/manual-de-uso/plataforma/nexa-en-notion.md`
- [ ] Sandbox Worker `greenhouse-cli-readiness-sandbox` (TASK-879) preservado o deletado con justificación documentada
- [ ] Pricing observability operativa post 11-ago-2026 (si fecha alcanza durante implementación)

## Follow-ups

- Future TASK — V2 mutations: agregar tools que mutan state (e.g. `markTaskDone`, `postCommentToProject`, `triggerSyncRefresh`) con capability `worker.mutate.*` separada + audit row obligatorio + caller approval flow.
- Future TASK — Tool catalog expansion (V1+N): agregar tools per dominio operativo (finance close summary, payroll status, AI tooling licenses status, commercial pipeline snapshot).
- Future TASK — Multi-workspace Worker (cuando emerja un cliente Globe que quiera Nexa nativo en su Notion): deploy Worker dedicado al workspace del cliente + capability boundaries cross-tenant.
- Future TASK — AI-powered tools V2 con Notion AI credits (e.g. `summarizeProjectStatus` que invoca AI inline). Requires pricing model establecido + budget alocation.
- Future TASK — Multi-channel orchestration: cuando un PM hace `@Nexa` desde Notion AND desde Teams, mantener context conversation cross-channel. Probably requires EPIC-005 conversational state management.
- Future TASK — Nexa proactive notifications: Worker scheduled job que detecta drift (sprint atrasado, ICO bajando) y posta proactivamente en Notion el space/project page. V1 es solo reactive (PM invoca); proactive es V2.

## Open Questions

- ¿External Agents API permite registrar tools programáticamente o solo via Notion admin UI? Slice 0 confirma.
- ¿El context.user del External Agents API payload incluye SIEMPRE `notion_user_id` o puede venir anónimo? Slice 0 confirma; afecta gracefulness de identity resolution.
- ¿`ntn workers exec` desde server-side (e.g. cron) requiere CLI install en Cloud Run? Probable que sí; alternativa es API HTTP equivalente.
- ¿Pricing model post 11-ago-2026 cubre tools que solo hacen HTTP fetch (zero AI)? Si no, el costo puede ser inesperado para use case high-volume.
- ¿Workers cross-region (latencia US vs LATAM) — Notion Workers donde se ejecutan? Si LATAM tiene latencia adicional, p95 threshold puede necesitar ajuste.
- ¿Identity context cross-workspace — PM cliente Sky en su workspace invoca Nexa, ¿el `notion_user_id` resuelve correctamente a su `member_id` Greenhouse? Depende de TASK-877 cobertura cross-tenant.
- ¿Capability per-tool (V2) granularity — separar `getProjectIco` vs `getSprintHealth` con caps distintas si emerge necesidad de scope fino? V1 lumps en `worker.invoke`; V2 puede splittear.

## Delta 2026-05-15

Task creada como follow-up canonical de TASK-879 Slice 4 verdict (2026-05-15) que identificó "Tools para External Agents API / Nexa-in-Notion" como el use case más alto-valor donde Workers ganan sobre Cloud Run. Materializa el primer pillar agent angle de EPIC-005. Bloqueada por TASK-880 (cliente canonical) + External Agents API GA (alpha 2026-05-13) + decisión pricing post 11-ago-2026. Coordina con TASK-671 (Nexa Teams bot) — los 2 canales son complementarios, no excluyentes.
