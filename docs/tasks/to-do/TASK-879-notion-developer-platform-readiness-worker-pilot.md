# TASK-879 — Notion Developer Platform Readiness & Worker Pilot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops|integrations|platform|delivery`
- Blocked by: `none`
- Branch: `task/TASK-879-notion-developer-platform-readiness-worker-pilot`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Evaluar y pilotear la nueva Notion Developer Platform anunciada el 2026-05-13 para Greenhouse, sin tocar todavia el carril critico production de `notion-bq-sync -> notion_ops -> conformed -> ICO`. La task instala/valida `ntn`, mapea usos legacy, prueba un Worker no critico y actualiza la estrategia de TASK-736/737/738/739/577 con una decision clara: Cloud Run, Notion Workers o arquitectura mixta.

## Why This Task Exists

Greenhouse ya depende fuertemente de Notion: ingestion delivery, governance de spaces, discovery/admin, identidad externa y futuras proyecciones Commercial<->Delivery. Hasta ahora las tasks Notion asumian dos opciones principales: endurecer el sibling `notion-bq-sync` o absorber partes al monorepo/Cloud Run. El lanzamiento de Notion Developer Platform agrega nuevas primitives oficiales (`ntn`, Workers, Worker syncs, agent tools, webhooks y External Agents API alpha) que pueden cambiar la topologia correcta.

El riesgo es tomar esa novedad de forma reactiva y duplicar pipelines. El objetivo de esta task es crear un piloto controlado, medir compatibilidad real y reescribir las decisiones de backlog antes de implementar cambios irreversibles.

## Goal

- Validar localmente el CLI `ntn` y documentar sus prerequisitos, auth y limites para operadores Greenhouse.
- Inventariar los usos Notion legacy en `greenhouse-eo` y el sibling critico, incluyendo API version `2022-06-28`, endpoints `databases` y wrappers manuales.
- Construir o dry-runnear un Worker piloto no critico que demuestre scheduling, secrets, logs y/o tool execution sin mutar production delivery/ICO.
- Decidir explicitamente si `TASK-577`, `TASK-736`, `TASK-737`, `TASK-738` y `TASK-739` deben seguir con Cloud Run/SDK puro o incorporar Notion Workers.
- Dejar un plan de rollout seguro para cualquier migracion posterior, con dual-run o shadow mode antes de production.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No reemplazar el writer production `notion-bq-sync` ni el drain `sync-conformed` en esta task.
- No escribir en bases Notion productivas desde el piloto salvo aprobacion explicita y scope no critico.
- No compartir tokens entre `notion-bigquery`, portal, Worker piloto y futuros writes. Cada carril debe declarar ownership y blast radius.
- Treat Workers as a candidate runtime, not as a source of truth. Postgres/Greenhouse sigue siendo canonico para contratos de producto, identidad y payroll.
- External Agents API queda como `alpha/waitlist`: investigar y documentar, pero no bloquear arquitectura production.
- Cualquier propuesta que cambie source of truth, API externa, webhook, runtime de sync, cloud/deploy/secrets o MCP debe identificar si requiere ADR o delta en `DECISIONS_INDEX`.

## Normative Docs

- `docs/audits/notion/notion-bq-sync/NOTION_BQ_SYNC_AUDIT_2026-04-30.md`
- `docs/audits/notion/notion-bq-sync/GREENHOUSE_CONSUMPTION_AUDIT_2026-04-30.md`
- `docs/tasks/to-do/TASK-736-greenhouse-notion-bq-sync-consumption-hardening.md`
- `docs/tasks/to-do/TASK-737-notion-bq-sync-hardening-contract-and-absorption-readiness.md`
- `docs/tasks/to-do/TASK-738-portal-notion-sdk-migration.md`
- `docs/tasks/to-do/TASK-739-notion-api-modernization-readiness.md`
- `docs/tasks/to-do/TASK-577-notion-write-bridge.md`
- `docs/epics/to-do/EPIC-009-critical-metrics-integrity-notion-ico-payroll-reliquidation-hardening.md`
- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- Notion official docs and changelog for Developer Platform, Workers, CLI, API versioning and External Agents.

## Dependencies & Impact

### Depends on

- `src/lib/space-notion/notion-client.ts`
- `src/lib/space-notion/notion-governance.ts`
- `src/lib/space-notion/notion-performance-report-publication.ts`
- `src/lib/identity/reconciliation/notion-users.ts`
- `src/lib/identity/reconciliation/member-scoped.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/lib/integrations/notion-sync-orchestration.ts`
- `src/lib/integrations/notion-readiness.ts`
- `src/app/api/integrations/notion/discover/route.ts`
- `src/app/api/integrations/notion/register/route.ts`
- `src/mcp/greenhouse/**`
- `greenhouse_core.space_notion_sources`
- `greenhouse_sync.notion_sync_orchestration_runs`
- sibling service `cesargrowth11/notion-bigquery` / `notion-bq-sync`

### Blocks / Impacts

- Informa y debe actualizar `TASK-736`, `TASK-737`, `TASK-738`, `TASK-739` y `TASK-577`.
- Puede crear follow-ups para `TASK-581` si el cutover/retirement del sibling cambia por Workers.
- Puede crear una task separada para `@notionhq/client` upgrade si `TASK-738` necesita dividirse.
- Puede crear una task separada para MCP/agent-tool expansion si Workers agent tools se integran con Greenhouse MCP.

### Files owned

- `docs/tasks/to-do/TASK-879-notion-developer-platform-readiness-worker-pilot.md`
- `docs/tasks/to-do/TASK-736-greenhouse-notion-bq-sync-consumption-hardening.md`
- `docs/tasks/to-do/TASK-737-notion-bq-sync-hardening-contract-and-absorption-readiness.md`
- `docs/tasks/to-do/TASK-738-portal-notion-sdk-migration.md`
- `docs/tasks/to-do/TASK-739-notion-api-modernization-readiness.md`
- `docs/tasks/to-do/TASK-577-notion-write-bridge.md`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- Optional pilot sandbox files under `experiments/`, `scripts/notion/` or another path approved during Plan Mode.

## Current Repo State

### Already exists

- `notion-bq-sync` remains the upstream writer for `notion_ops.{tareas,proyectos,sprints}`.
- `runNotionSyncOrchestration()` and `syncBqConformedToPostgres()` keep delivery runtime fresh.
- Runtime DB snapshot on 2026-05-14 showed 2 active Notion spaces, 5,274 delivery tasks, 153 projects and 33 sprints in Postgres.
- `src/lib/space-notion/notion-client.ts` and `src/lib/identity/reconciliation/notion-users.ts` use manual `fetch` with `Notion-Version: 2022-06-28`.
- `TASK-877` already made Notion identity links Postgres-first via `identity_profile_source_links`, with BigQuery mirror compatibility.
- Greenhouse MCP V1 exists as read-only downstream of API Platform, local stdio and remote private HTTP.

### Gap

- No `ntn` workflow is documented for Greenhouse operators.
- No `@notionhq/client` dependency or SDK adapter exists in `package.json`.
- No `@notionhq/workers` pilot exists.
- Existing Notion tasks predate the 2026-05-13 Developer Platform launch and do not compare Workers vs Cloud Run vs SDK-only.
- `TASK-577` assumes a Python/Cloud Run write bridge as the default path.
- `TASK-736/737` evaluate hardening/absorption without treating Notion Workers as a first-class option.
- `TASK-738/739` discuss SDK/API modernization but not `ntn`, Workers, Worker syncs, agent tools or External Agents API.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Developer Platform discovery and local `ntn` validation

- Verify current Notion Developer Platform docs, CLI installation methods, Node/npm requirements, supported OS, plan limits and beta/credit constraints.
- Install or dry-run `ntn` in a local/sandbox-safe way, without checking credentials into repo.
- Document required auth flows, workspace selection, keychain behavior, command list and failure modes.
- Capture whether Business/Enterprise Worker deploy capability is available for the Efeonce workspace.

### Slice 2 — Legacy surface and dependency map

- Inventory every direct Notion API use in this repo and classify it as portal direct, identity reconciliation, governance, publication, discovery/register, sync orchestration or MCP/agent-adjacent.
- Inventory the sibling `notion-bq-sync` runtime surface needed for this decision: API version, endpoints, auth posture, write strategy, callbacks and data contract.
- Produce a compatibility matrix: current path, legacy API dependency, candidate modern path (`@notionhq/client`, `ntn api`, Worker, Worker sync, webhook, no change).

### Slice 3 — Worker pilot design and sandbox implementation

- Choose one non-critical pilot target. Recommended options:
  - Worker tool/read-only check that reports Notion database metadata/freshness for a sandbox DB.
  - Worker webhook receiver against a test-only endpoint.
  - Worker sync into a new managed sandbox database that does not feed ICO/Payroll/Delivery.
- Keep the pilot isolated from production delivery DBs, `notion_ops`, `greenhouse_conformed` and payroll/ICO materialization.
- Document secrets, deployment, logs, retry behavior, schedule behavior and rollback/delete steps.

### Slice 4 — Decision memo for existing tasks

- Update `TASK-736`, `TASK-737`, `TASK-738`, `TASK-739` and `TASK-577` with the outcome of the Worker/CLI/SDK comparison.
- Update `GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md` if the accepted decision changes or gains a new condition.
- Propose or index an ADR in `docs/architecture/DECISIONS_INDEX.md` if the recommended path changes source ownership, runtime, external API or sync topology.

### Slice 5 — Follow-up backlog and rollout plan

- Create follow-up tasks only if the pilot produces a concrete next action, for example Worker-based write bridge, SDK adapter, upstream contract revision or External Agents waitlist integration.
- Define the safe rollout path for any future migration: shadow mode, dual-run, parity checks, cutover gate, rollback and owner.
- Update `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` if Notion Developer Platform becomes part of the formal ecosystem.

## Out of Scope

- No migration of production `notion-bq-sync` to Workers in this task.
- No deletion, pause or cutover of Cloud Scheduler/Cloud Run jobs.
- No writes to production Notion delivery databases unless explicitly approved as a separate slice and guarded by dry-run.
- No change to payroll/ICO official calculations.
- No replacement of Greenhouse MCP with Notion External Agents API.
- No multi-user OAuth/hosted auth design for MCP; `TASK-659` remains owner of that domain.

## Detailed Spec

The task should produce a decision matrix with at least these options:

| Option | Runtime | Best fit | Risks | Decision |
|---|---|---|---|---|
| A | Existing sibling `notion-bq-sync` hardened | Preserve current ingestion with lower blast radius | Keeps split ownership | **keep** (Slice 4 verdict 2026-05-15) |
| B | Absorb admin/discovery surface only | Reduce portal dependency on public sibling endpoints | Partial duplication | keep / change / reject — pendiente Slice 2 inventory completion |
| C | Full Cloud Run absorption | Maximum repo control | High migration and CI/CD scope | **reject** (Slice 4 verdict 2026-05-15) — sin justificación post-evidencia Workers |
| D | Notion Workers for selected sync/tools/webhooks | Hosted close to Notion, lower infra | Beta, credits, managed DB limits | **change** to "Workers para tools/agents only, NO sync crítico" (Slice 4 verdict 2026-05-15) |
| E | Hybrid: hardened ingestion + Workers for tools/writes | Gradual adoption | More topology to document | **keep / accept as canonical** (Slice 4 verdict 2026-05-15) |

### Slice 4 — Decision verdict 2026-05-15 (post Slice 1 + Slice 3 evidence)

**Veredicto canónico: arquitectura híbrida (option E)** con boundaries explícitos:

- **Ingestion delivery (Notion → BQ raw → conformed → PG)** → **mantener `notion-bq-sync` Cloud Run sibling** (option A). Razón: pipeline canonical estable, control plane retry/orchestration probado (TASK-588 + Slice 0 evidence), schema PG `greenhouse_delivery.*` y BQ `greenhouse_conformed.delivery_*` son source of truth de Greenhouse. Workers NO ofrecen ventaja para este path porque (a) carecen de acceso nativo a PG/BQ Greenhouse, (b) los `notion_ops.*` raw tables ya viven en BQ via el sibling, (c) cross-tenant ingest necesita identity reconciliation Greenhouse-side (TASK-877).
- **Identity reconciliation (Notion users → identity_profile_source_links)** → **mantener Internal Integration Token + sibling/portal path canonical** (TASK-877 complete). Razón: PATs no pueden listar users (`403 restricted_resource`), Workers no agregan valor sobre el path actual.
- **Write bridge a Notion (TASK-577 EPIC-005)** → **Cloud Run híbrido + Workers opcional para subset acotado**. Razón: writes que mezclan Notion + HubSpot + identity Greenhouse-side requieren Cloud Run (transactions, multi-store). Writes Notion-puros (e.g. publicar ICO report como Notion page via Markdown API) podrían vivir en un Worker, pero el blast radius del bridge Cloud Run principal NO se reemplaza.
- **Tools para External Agents API / Nexa-in-Notion (EPIC-005 follow-up)** → **Workers SÍ son canonical**. Razón: cuando el PM hable con Nexa desde Notion ("@Nexa dame el ICO de este proyecto"), la tool corre Notion-side via Worker que llama Greenhouse API read-only. Beneficios validados live: audit log nativo, multi-agent operability, latencia ~4s, sin servidor propio. Use case más alto-valor para Workers.
- **Tooling/sandbox developer** → **Workers OK como playground**, no production. Sandbox `greenhouse-cli-readiness-sandbox` se mantiene para iteraciones futuras.

**Cross-references actualizadas (Slice 4 entregable)**:

- TASK-577 (write bridge) → mantener Python/Cloud Run como path principal V1; agregar follow-up explícito V2 evaluating Worker para Markdown publisher (publicar ICO/sprint reports a Notion pages como tool dedicada).
- TASK-736/737 (notion-bq-sync hardening + absorption readiness) → mantener trayectoria actual; **NO migrar a Workers**.
- TASK-738 (portal Notion SDK migration) → puede correr encima del cliente canonical TASK-880 sin requerir Workers.
- TASK-739 (API modernization readiness) → absorbida por TASK-880 (mismo scope: bump version + cliente canonical).
- TASK-880 (foundation) → unblocked, ready para Slice 0; cascade auth contract validated.
- TASK-881 (Meeting Notes ingest) → **path canonical V1: reactive consumer en ops-worker Cloud Run** (no Worker). Razón: cross-workspace orchestration + cross-tenant + PG materialization + identity resolution Greenhouse-side. Worker como V2 contingente solo si emerge use case Notion-puro.
- Nuevo follow-up sugerido: **TASK-NNN — Nexa Tools as Notion Workers (EPIC-005 pillar)**. Implementar 3-5 tools read-only (project ICO, sprint health, last meeting summary) como Workers que llamen Greenhouse API platform health (TASK-672) + readers canonical. Bloqueada por: External Agents API GA (alpha al 2026-05-13), TASK-880 cliente canonical, decisión de Workers credits pricing post 11-ago-2026.

Minimum evidence to collect:

- `ntn --version` or documented inability to install/run.
- Whether `@notionhq/client` should be adopted before or after Worker evaluation.
- Whether Workers can access the needed Notion workspace/DBs with least privilege.
- Whether Worker sync can target existing Greenhouse Notion databases today, or only managed databases.
- Whether Notion webhooks/External Agents are available enough to influence EPIC-005.
- Whether Worker logs/secrets/rollback meet Greenhouse production safety expectations.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 must finish before Slice 3.
- Slice 2 can run in parallel with Slice 1.
- Slice 3 must use a sandbox/non-critical target selected after Slice 1 and Slice 2.
- Slice 4 must not update architecture as accepted until Slice 3 evidence exists, unless Slice 3 is explicitly impossible and documented.
- Slice 5 follows Slice 4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Worker pilot writes to production Notion data by accident | Notion / Delivery | medium | sandbox-only DB, dry-run first, separate token/scope, explicit grant list | Notion audit/logs, unexpected page updates |
| New topology increases confusion over source of truth | Architecture / ops | medium | decision matrix + ADR/index update before follow-up implementation | Handoff drift, conflicting task specs |
| Beta/credits/plan limits make Workers unsuitable for critical sync | Ops / cost | medium | collect plan/credit evidence; keep existing pipeline as default | Worker deploy rejected, credit warnings |
| CLI auth leaks or gets scripted incorrectly | Secrets / local ops | low | no tokens in repo, document keychain behavior, no committed `.ntn` state | secret scan / git diff |
| External Agents alpha distracts from critical hardening | Platform | medium | mark alpha as research-only; no production dependency | backlog scope creep |

### Feature flags / cutover

No production feature flag in this task. Any pilot must be isolated by workspace/database/token rather than runtime flags. If a follow-up proposes production traffic, that follow-up must introduce its own flag/cutover gate.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Remove local CLI artifacts and documentation delta if invalid | <30 min | si |
| Slice 2 | Revert docs inventory changes | <30 min | si |
| Slice 3 | Disable/delete sandbox Worker via `ntn workers` or Notion Developer Portal; revoke sandbox token/secret if created | <1h | si |
| Slice 4 | Revert task/architecture deltas before downstream execution | <30 min | si |
| Slice 5 | Move follow-up tasks back to to-do/deferred or mark superseded with rationale | <30 min | si |

### Production verification sequence

1. Run Slice 1 and Slice 2 locally only.
2. If Worker deploy is possible, deploy only to sandbox/non-critical Notion target.
3. Verify Worker logs, execution result and absence of writes to production delivery DBs.
4. Review decision matrix with architecture docs/tasks before accepting follow-up work.
5. Do not promote any Worker to production sync in this task.

### Out-of-band coordination required

- Notion workspace admin may need to authorize CLI/Worker access and create or grant a sandbox integration/database.
- If testing Workers requires Business/Enterprise beta access or waitlist enablement, coordinate with the Notion workspace owner before Slice 3.
- No GCP/Vercel production changes expected.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `ntn` and Notion Developer Platform availability are verified or explicitly blocked with evidence.
- [ ] All direct Notion API surfaces in this repo are inventoried and classified.
- [ ] The sibling `notion-bq-sync` implications are compared against Workers and Cloud Run absorption options.
- [ ] A sandbox Worker pilot is completed, or the exact blocker is documented with next action.
- [ ] `TASK-736`, `TASK-737`, `TASK-738`, `TASK-739` and `TASK-577` reflect the Developer Platform decision.
- [ ] Any architecture decision change is indexed or explicitly deferred.
- [ ] No production delivery/ICO/payroll data is mutated by the pilot.

## Verification

- `pnpm lint` if code or scripts are added
- `pnpm test` or focused tests if code or scripts are added
- `pnpm docs:context-check`
- Manual verification of `ntn` commands / Worker sandbox run
- Manual review of updated tasks and decision matrix

### Slice 1 evidence — 2026-05-14 local CLI install

- Official install paths checked: `curl -fsSL https://ntn.dev | bash` and `npm install --global ntn`; npm path selected to keep the install explicit and inspectable.
- Local prerequisites OK: `node v22.22.2`, `npm 10.9.7`, `pnpm 10.32.1`; official npm package latest observed as `ntn@0.14.0`.
- Installed globally with `npm install --global ntn`; no repo dependency or lockfile changed.
- Verified `ntn --version` -> `ntn 0.14.0`.
- Verified `ntn doctor` -> CLI version OK, config root `/Users/jreye/.config/notion`, warning expected: no default workspace for prod environment until `ntn login`.
- Verified top-level commands exposed by CLI: `api`, `datasources`, `files`, `pages`, `login`, `logout`, `completions`, `doctor`, `update`, `workers`.
- Verified `ntn api` supports public API calls, endpoint listing, reduced OpenAPI fragments via `--spec`, official endpoint docs via `--docs`, auth via keychain or `NOTION_API_TOKEN`, and `NOTION_API_VERSION` override.
- Verified `ntn workers` exposes `capabilities`, `create`, `delete`, `deploy`, `new`, `env`, `exec`, `get`, `oauth`, `list`, `runs`, `sync`, `usage`, `webhooks`, `tui`.
- Remaining Slice 1 blockers after install-only validation: authenticate, select/confirm Efeonce workspace, inspect workspace/plan access for Workers, and confirm sandbox DB permissions before any Worker pilot.

### Slice 1 evidence — 2026-05-14 CLI auth

- Ran `ntn login` interactively; browser verification code matched terminal prompt and the CLI exited successfully.
- Verified `ntn doctor`: default workspace resolved to `Efeonce` (`d1de7cb1-0325-4b73-a4d3-f266ae396f15`) and token is valid.
- Verified read-only API auth with `ntn api /v1/users/me`; response identified the CLI bot for workspace `Efeonce` and the owner user.
- Verified `ntn workers list` exits cleanly with no listed Workers.
- Resolved blocker: workspace admin approved enabling Workers. `ntn workers create` was re-run interactively and accepted the `Enable Notion Workers?` prompt.
- `ntn doctor` after enablement reports `Workers enabled: yes` and 6/6 checks passed.

### Slice 1 evidence — 2026-05-14 PAT bot identity registry (first canonical PAT)

Live `ntn api /v1/users/me` response capturó identidad completa del primer PAT registrado en Greenhouse. Documentado acá para tracking + audit + futura migración a `notion_personal_access_tokens` table (TASK-880 Slice 2):

| Campo | Valor |
|---|---|
| Bot ID | `36139c2f-efe7-815f-b210-00275c518116` |
| Bot name | `Notion CLI` |
| Bot type | `bot` (PAT, owner.type=`user`) |
| Owner user ID | `98be6859-4b84-4dee-a8f2-5546d770c44b` |
| Owner email | `jreyes@efeoncepro.com` |
| Owner name | `Julio Reyes` |
| Workspace ID | `d1de7cb1-0325-4b73-a4d3-f266ae396f15` |
| Workspace name | `Efeonce` |
| Max upload size | 5,368,709,120 bytes (5 GB) |
| Auth source | macOS keychain (default; `NOTION_KEYRING=0` para file-based) |
| Token storage path (file mode) | `~/.config/notion/auth.json` |
| Scope (verified live) | read-only PAT, scope per-resource via shares (sin shares activos al momento de registro) |
| Restrictions verificadas | NO puede `GET /v1/users` (`403 restricted_resource: Personal access tokens cannot list users`) |

Cuando TASK-880 Slice 2 cree la tabla `greenhouse_core.notion_personal_access_tokens`, este PAT debe ser la primera fila migrada con `label='Notion CLI Julio Reyes (developer sandbox)'`, `scope='read'`, `verified_at=NOW()` y `last_used_at` poblado desde el log del Slice 1.

### Slice 3 evidence — 2026-05-15 Cross-agent Worker pilot exec validated

**Pilot setup (entregado por Codex en sesión paralela 2026-05-14)**:

- Workspace admin (Julio) aceptó prompt `Enable Notion Workers?` interactivo via `ntn workers create`. Workers quedaron habilitados workspace-wide para Efeonce.
- Codex creó Worker sandbox `greenhouse-cli-readiness-sandbox` (ID `019e2937-183d-7383-9159-83c29cb685ee`) desde el template oficial `ntn workers new`, scope mínimo: 1 tool `sayHello`, sin syncs, webhooks, database links.
- Deploy via `ntn workers deploy` exitoso. `workers.json` local generado por la CLI fue eliminado para no versionar estado local del workspace en el repo (no hay artefactos sandbox checked-in).
- Codex ejecutó tool desde su sesión: input `{"name":"Greenhouse"}` → output `"Hello, Greenhouse!"`, run `019e2938-335c-72a6-afba-50a37c866396`, exitCode 0, duración ~4s (01:20:09 → 01:20:13 UTC).

**Cross-agent operability validated (Claude session 2026-05-15)**:

- `ntn doctor` desde sesión Claude reporta `Workers enabled ✔ yes` (5 passed, antes era 4 passed + 1 warning) — confirma que la habilitación es workspace-wide y todos los PATs/agents autenticados al workspace ven Workers activos.
- `ntn workers list` muestra el sandbox vivo: `019e2937-183d-7383-9159-83c29cb685ee greenhouse-cli-readiness-sandbox` creado `2026-05-15T01:18:57Z`, last activity `2026-05-15T01:19:47Z`.
- `ntn workers capabilities list 019e2937-...` retorna `tool sayHello` (1 capability registered).
- `ntn workers exec sayHello --worker-id 019e2937-183d-7383-9159-83c29cb685ee -d '{"name":"Claude"}'` → output `"Hello, Claude!"`, run `019e293d-085e-73e4-9b68-0ad99402dfc7`, exitCode 0, duración ~4s (01:25:26 → 01:25:30 UTC).
- `ntn workers runs list 019e2937-...` muestra audit completo: 3 runs (Codex tool exec + Claude tool exec + initial `fetchAndSaveCapabilities` deploy step), todos exitCode 0, timestamps + duración por run, accesibles cross-agent.
- `ntn workers usage 019e2937-...` retorna `0 0 30` — zero credits consumidos (tool sample no usa AI), 30 unit quota mostrada.

**Conclusiones validated live**:

| Capacidad | Estado | Implicancia |
|---|---|---|
| Workers habilitables por workspace admin | ✅ confirmado | Sin friction post enable; 1 prompt interactivo único per workspace |
| Cross-agent shared workers | ✅ confirmado | Codex y Claude ejecutaron el mismo Worker sin conflict ni lockout |
| Audit log nativo per run | ✅ confirmado | Notion provee runs + logs + duración + exitCode sin configurar nada (vs Sentry/PG audit custom que tendríamos que mantener) |
| Latencia tool execution remota | ~4s validado | Suficiente para uso interactivo (e.g. Nexa-in-Notion responding a comandos PM); NO suficiente para hot path API request handlers |
| Dev experience (CLI) | ✅ excelente | `ntn workers new/deploy/exec/runs/list` cubren lifecycle completo sin tocar Notion UI |
| AI credits tracking | ✅ disponible | `ntn workers usage <id>` reporta consumo per Worker; pricing transition al 11-ago-2026 sigue siendo opaco para non-AI workloads |
| Pricing post-beta | ⚠️ NO validado | Tool sample no consumió credits; pricing real para Workers con AI calls + scheduled syncs sigue requiriendo investigación |
| Rate limits / max execution time | ⚠️ NO validado | Sample fue trivial; emerge cuando intentemos un Worker con sync/webhook real |
| Acceso a PG/BQ Greenhouse desde Worker | ❌ NO disponible nativo | Confirmado por arquitectura: Workers corren en infra Notion, requeriría llamar Greenhouse API platform-health (TASK-672) o equivalentes outbound |
| Cross-tenant scoping | ❌ Workers son workspace-level | NO existe per-cliente / per-tenant Worker. Cross-tenant ops siguen requiriendo Cloud Run Greenhouse |

**Sandbox lifecycle**: el Worker `greenhouse-cli-readiness-sandbox` queda **vivo en Notion para iteraciones futuras** (e.g. probar webhook capabilities, sync con managed DB, AI tool con credits real). Para limpiar: `ntn workers delete 019e2937-183d-7383-9159-83c29cb685ee`. NO hay artefactos checked-in en el repo (workers.json eliminado).

**Acceptance criteria de Slice 3 cumplidos**:

- [x] Sandbox Worker creado + deployado + ejecutado SIN tocar production delivery / ICO / payroll / writes a Notion productivos.
- [x] Cross-agent operability verificada (2 agents distintos ejecutaron la misma tool).
- [x] Audit + logs + secrets behavior documentados (audit nativo, sin secrets management requerido para tool sample, rollback < 1 min via `ntn workers delete`).
- [x] Schedule behavior NO probado (tool simple sin schedule); pendiente para futura iteración con Worker sync.
- [x] Webhooks NO probados; pendiente para futura iteración.

### Slice 1 evidence — 2026-05-14 Markdown API capability gem (`include_transcript`)

Spec inspection reveló feature crítico para TASK-881 PII safety: el endpoint `GET /v1/pages/{page_id}/markdown` acepta query param `include_transcript: boolean` (default `false`). Cuando `true`, el response embebe el transcript completo de meeting notes. Cuando `false`, devuelve un placeholder con la URL de la meeting note original.

Implicancia operativa:

- Surfaces UI (project drawer, sprint timeline) deben llamar con `include_transcript=false` por default — solo embeben placeholder.
- Endpoint reveal `GET /api/delivery/meeting-notes/[id]/full-summary` (TASK-881 Slice 4) detrás de capability `delivery.meeting_notes.read_summary_full` debe llamar con `include_transcript=true` y persistir audit row con quién + cuándo + razón ANTES de devolver el contenido.
- Esto reemplaza la separación inicial pensada como `summary_redacted` vs `summary_full` columnas en PG — ahora podemos almacenar SOLO el placeholder + on-demand fetch del transcript completo cuando un caller autorizado lo pida. Reduce blast radius de PII at rest.

### Slice 1 evidence — 2026-05-14 CLI and Developer Platform exploration

Official docs reviewed:

- `https://developers.notion.com/llms.txt`
- `https://developers.notion.com/cli/get-started/overview`
- `https://developers.notion.com/cli/guides/data-sources`
- `https://developers.notion.com/workers/get-started/overview`
- `https://developers.notion.com/workers/guides/syncs`
- `https://developers.notion.com/workers/guides/tools`
- `https://developers.notion.com/workers/guides/webhooks`
- `https://developers.notion.com/guides/get-started/upgrade-guide-2026-03-11`
- `https://developers.notion.com/guides/data-apis/working-with-views`
- `https://developers.notion.com/reference/query-meeting-notes`

CLI surface observed:

- `ntn api ls` reports current OpenAPI endpoints for `meeting_notes`, `blocks`, `comments`, `custom_emojis`, `data_sources`, `databases`, `file_uploads`, `pages`, `search`, `users`, and `views`.
- `ntn api --spec` works as a local contract inspector; endpoint specs report `Notion-Version: 2026-03-11` as the latest supported version.
- `ntn api --docs` returns markdown docs inline from official Notion docs, useful for task execution without leaving terminal.
- `ntn datasources` supports `resolve` and `query`; docs confirm a database can contain one or more data sources and `data_source_id` is now a distinct contract from `database_id`.
- `ntn pages` supports markdown read/create/update/trash. This is relevant for future docs/manual automation, but write commands stay out of scope for this task.
- `ntn files` supports create/get/list. `files list` produced no visible uploads for the current token.
- `ntn workers` supports project scaffolding, deploy/create/delete/list/get, env var management, capability inspection, execution, runs/logs, sync state/status/trigger/pause/resume, usage and webhook URL listing.

Read-only live checks against Efeonce:

- `ntn api /v1/users/me` works and confirms the CLI bot/user context for Efeonce.
- `ntn api /v1/users page_size==5` returns `403 restricted_resource`: personal access tokens cannot list users. Greenhouse identity reconciliation must not assume PAT can replace existing user discovery; keep internal integration token/server-side path for `users.list`.
- `ntn api /v1/search -d '{"page_size":5}'` returns an empty list for the current token, suggesting no pages/data sources have been shared to this PAT yet.
- `ntn api /v1/blocks/meeting_notes/query -d '{"limit":3}'` returns an empty list, but the endpoint is reachable. This supports TASK-881 as a real candidate once the correct workspace content/access is granted.
- `ntn api /v1/custom_emojis` returns 3 workspace custom emojis; confirms read access beyond `/users/me`.
- `ntn api /v1/views -X GET` without `database_id` or `data_source_id` returns validation error; views are discoverable only when scoped to a database or data source.

Worker scaffold observed:

- `ntn workers new /tmp/greenhouse-ntn-worker-sandbox --no-install --no-git` succeeds without remote deployment and without changing this repo.
- The template is Node/TypeScript, requires Node `>=22.0.0` and npm `>=10.9.2`, and depends on `@notionhq/workers`.
- Default `src/index.ts` registers a sample `worker.tool("sayHello")` using `@notionhq/workers/schema-builder`.
- Template examples include `tool`, `sync`, `webhook`, `oauth` and `automation` patterns.
- Sync examples use managed databases, primary keys, `replace` vs `incremental` modes, schedules (`manual`, `5m`, `1h`) and `pacer` rate limiting.
- Webhook examples include signature verification with `WebhookVerificationError`; docs state Notion creates webhook URLs after deploy and logs are inspected with `ntn workers runs`.
- No `workers.json` exists before deploy; worker ID/config is expected after deploy or when passing IDs explicitly.

Platform implications for Greenhouse:

- **TASK-880** should remain the first production-safe modernization: migrate our Notion API wrapper toward `2026-03-11`, handle `archived -> in_trash`, `after -> position`, and `transcription -> meeting_notes`, and consider `@notionhq/client` latest (`5.21.0` observed) after adapter design.
- **TASK-881** is viable as a read-side consumer, but needs the right PAT/internal integration access to meeting notes. Current CLI PAT sees zero notes.
- **TASK-877 / identity reconciliation** cannot use user-scoped PAT alone for workspace-wide user listing; keep or harden the internal integration/BQ/PG reconciliation path.
- **TASK-736/737 ingestion** should not move to Workers yet. Workers are promising for managed Notion-facing syncs, but Efeonce Workers are not enabled and managed database semantics may not match our existing `notion_ops -> conformed -> ICO` ownership.
- **TASK-577 write bridge** could later use Workers for specific Notion-native tool/webhook surfaces, but current evidence favors a hybrid: Cloud Run/portal remains canonical writer/orchestrator; Workers can be piloted for sandbox tools/webhooks or non-critical managed syncs.
- **EPIC-005 agent/tool angle** is the most interesting near-term Worker use: custom Notion Agent tools that call Greenhouse read APIs, not critical data replication.

### Slice 3 evidence — 2026-05-14 Worker enablement and sandbox tool deploy

- Efeonce workspace Workers were enabled via CLI interactive admin prompt (`Enable Notion Workers? -> Enable`).
- Created sandbox Worker `greenhouse-cli-readiness-sandbox`.
- Worker ID: `019e2937-183d-7383-9159-83c29cb685ee`.
- `ntn workers list --json` returns the sandbox Worker under workspace `d1de7cb1-0325-4b73-a4d3-f266ae396f15`.
- The CLI created a local `workers.json` in the repo root during `workers create`; it contained only environment/workspace/worker IDs and was removed after testing to avoid committing workspace-local state.
- Used `/tmp/greenhouse-ntn-worker-sandbox` scaffold from `ntn workers new --no-install --no-git`.
- Installed sandbox dependencies in `/tmp`, ran `npm run check` successfully (`tsc --noEmit`).
- Deployed only the default sample tool with `ntn workers deploy --local-build`; deploy returned `is_update: true`, one tool capability `sayHello`, no `database_links`, no `webhook_urls`.
- Verified remote capability list: one tool capability `sayHello`, no sync/webhook capabilities.
- Executed remote tool with `ntn workers exec sayHello --worker-id 019e2937-183d-7383-9159-83c29cb685ee -d '{"name":"Greenhouse"}'`; response: `"Hello, Greenhouse!"`.
- Verified run history: `tool:sayHello` run completed with `exitCode: 0`; deploy capability save run also completed with `exitCode: 0`.
- No production Notion pages, data sources, delivery DBs, `notion_ops`, `greenhouse_conformed`, ICO or payroll surfaces were touched.
- Sandbox Worker intentionally remains in Notion for follow-up TASK-879 Worker tests. Delete command if cleanup is required: `ntn workers delete 019e2937-183d-7383-9159-83c29cb685ee`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-736/737/738/739/577` quedaron alineadas con el resultado
- [ ] Notion admin/sandbox artifacts creados para el piloto quedaron documentados o retirados

## Follow-ups

- **TASK-882 creada 2026-05-15** — Nexa Tools as Notion Workers (EPIC-005 pillar). Materializa el use case más alto-valor identificado en Slice 4 verdict: Workers para tools/agents read-only que expongan capabilities Greenhouse (ICO, sprint health, etc.) via External Agents API. Bloqueada por TASK-880 + External Agents API GA + decisión pricing post 11-ago-2026.
- Potencial follow-up: Worker-based Notion Markdown publisher (publicar ICO/sprint reports a Notion pages) — V2 contingente de TASK-577 write bridge.
- Potencial follow-up: SDK adapter para portal directo si `TASK-738` se mantiene separado de Workers (corre encima de TASK-880 cliente canonical).
- Potencial follow-up: upstream `notion-bq-sync` contract revision — Slice 4 verdict: NO migrar a Workers, mantener como sibling Cloud Run hardened (TASK-737 sigue su trayectoria).
- Potencial follow-up: External Agents API waitlist/partner track si Notion libera acceso usable — bundled en TASK-882.

## Delta 2026-05-14

Task creada despues de revisar el lanzamiento oficial de Notion Developer Platform del 2026-05-13 y contrastarlo con el codebase/runtime Greenhouse. La decision inicial es pilotear sin tocar production sync.

### Delta 2026-05-14 (segunda revisión) — Tasks complementarias creadas

Tras el codebase mapping completo (5,274 delivery tasks + 153 projects + 33 sprints en PG, `Notion-Version: 2022-06-28` hardcoded en 3 archivos, single-token global `NOTION_TOKEN` sin audit per-actor), se identificaron 2 oportunidades concretas Tier 1 que NO compiten con esta task de research/pilot — la complementan ejecutando primitives canonicos en paralelo:

- **TASK-880** — Notion API Modernization & PAT Foundation. Bumpea `Notion-Version` a `2026-03-11` + introduce `NotionApiClient` canonical + resolver PAT con cascade. Sin bloqueo mutuo: TASK-879 puede correr el pilot Worker con la version vieja en sandbox; TASK-880 entrega los primitives que cualquier topología futura (Cloud Run hardened / Workers / Hybrid) necesita.
- **TASK-881** — Notion Meeting Notes Ingestion → Delivery + ICO Surfaces. Primer consumer real del endpoint nuevo `POST /v1/blocks/meeting_notes/query`. Bloqueada por TASK-880 (necesita Notion-Version `2026-03-11+`). Sirve como caso de prueba real para que la decision matrix de TASK-879 (Slice 4) se evalúe sobre un consumer concreto, no solo en abstracto.

**Coordinación**: el output de TASK-879 Slice 2 (legacy surface inventory) y Slice 4 (decision memo) DEBE actualizar TASK-880 si la decision arquitectónica cambia (ej. si Workers terminan siendo el path canonical para identity reconciliation, TASK-880 debe documentarlo como follow-up V2). El output de TASK-879 Slice 3 (Worker pilot) DEBE evaluar si TASK-881 V2 puede migrar a un Worker en lugar de reactive consumer en ops-worker.

Las 3 tasks pueden cerrarse independientemente con esta secuencia recomendada: **TASK-880 Slice 0-2 (foundation cliente + PAT) → TASK-879 Slices 1-3 (research + pilot) → TASK-880 Slice 3-5 (bump + signals) → TASK-879 Slice 4-5 (decision + follow-ups) → TASK-881 (Meeting Notes consumer)**. Si emerge necesidad de paralelismo, TASK-880 y TASK-879 pueden correr concurrentemente porque tocan superficies distintas.

## Open Questions

- ¿El workspace Efeonce tiene ya habilitado Worker deploy en public beta para Business/Enterprise?
- ¿Conviene que el primer Worker viva en un repo sandbox separado o en este monorepo bajo un directorio experimental?
- ¿Notion Workers puede cubrir writes a DBs existentes con el nivel de control que necesita EPIC-005, o solo conviene para tools/webhooks por ahora?
