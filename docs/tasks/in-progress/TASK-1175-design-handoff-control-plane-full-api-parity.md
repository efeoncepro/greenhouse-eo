# TASK-1175 — Design Handoff Control Plane Full API Parity

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Code complete local; rollout pendiente`
- Rank: `TBD`
- Domain: `ui|platform|design-system|api|nexa`
- Blocked by: `none`
- Branch: `task/TASK-1175-design-handoff-control-plane-full-api-parity`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurece el Design Handoff Registry de TASK-1120 hasta convertirlo en un **control plane operable por API**: allowlist administrable, owners, prioridad, target surface, links a `TASK-###`/PR/deploy, evidencia GVC, validacion de nodo Figma, drift/orphans y commands/readers gobernados aptos para UI, Nexa, MCP/API Platform y futuros consumers. La UI no se construye aqui: TASK-1176 sera el cliente visual.

## Why This Task Exists

TASK-1120 dejo una foundation correcta: aggregate, lifecycle, allowlist fail-closed, APIs, capabilities y UI inicial. Pero sigue siendo V1: la allowlist no es operable por command, el registro no sabe quien disena/implementa, no se vincula a tasks/PR/deploy/evidencia, el cierre no exige evidencia runtime y Nexa/agentes no tienen una superficie command/read completa.

Eso cumple Full API Parity solo parcialmente: la accion core existe por API, pero el workflow enterprise todavia depende de convenciones humanas fuera del contrato. Esta task convierte ese workflow en capabilities server-side gobernadas.

## Goal

- Completar Full API Parity del handoff: todo lo que la UI pueda hacer tambien existe como reader/command server-side gobernado.
- Administrar la allowlist de archivos Figma producto por command, con audit/outbox y capability fina.
- Enriquecer `design_handoff_entries` con ownership, prioridad, target surface, bloqueos, links y evidencia.
- Agregar validacion de nodo Figma y drift/orphan readers: nodo eliminado/renombrado/stale, handoffs stale y surfaces implementadas sin diseno.
- Exponer commands aptos para `propose -> confirm -> execute`, sin construir integraciones Nexa-especificas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/ui-platform/README.md`
- `docs/tasks/in-progress/TASK-1120-design-handoff-registry.md`
- `docs/tasks/to-do/TASK-1172-full-api-parity-gap-audit-existing-portal.md`

Reglas obligatorias:

- No tocar ni reusar `greenhouse_core.design_system_figma_nodes` para paginas de producto; AXIS-only sigue separado.
- No exponer tablas directas ni endpoints ad hoc por boton. Cada accion nace como command/reader reusable.
- No construir UI visible en esta task; TASK-1176 consume estos contratos.
- No asumir que el `file_key` producto existe: V1 sigue fail-closed hasta command/seed autorizado.
- Cualquier cierre `implemented` debe quedar preparado para exigir evidencia runtime/GVC, no solo texto humano.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1120 code merged in `develop`: `src/lib/design-system/handoff/**`, `/api/design-system/handoff*`, migration `20260619220313904_task-1120-design-handoff-registry.sql`.
- TASK-1120 runtime rollout for staging/prod smoke: the TASK-1120 migration must be applied before this task's migration can be verified in a real DB target.

### Blocks / Impacts

- Blocks TASK-1176 (Design Handoff Operations Cockpit UI).
- Feeds TASK-1172 with a concrete parity-complete capability family.
- Enables future Nexa governed actions through API Platform/Nexa action runtime (without adding Nexa-specific code here).

### Files owned

- `migrations/**`
- `src/lib/design-system/handoff/**`
- `src/app/api/design-system/handoff/**`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/api/canonical-error-response.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/reliability/queries/**`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/manual-de-uso/plataforma/operar-ui-platform-design-system.md`

## Current Repo State

### Already exists

- Aggregate V1: `greenhouse_core.design_handoff_allowed_files`, `design_handoff_entries`, `design_handoff_entry_events`.
- Store/state machine: `src/lib/design-system/handoff/store.ts`, `state-machine.ts`, `allowlist.ts`.
- APIs V1: `/api/design-system/handoff`, `/api/design-system/handoff/[entryId]`, `/transition`, `/preview`.
- Capabilities V1: `design_system.handoff.read`, `create`, `transition`.
- Reliability signal V1: `design_system.handoff.stale_entries`.

### Gap

- Allowlist no es administrable por command/API gobernado.
- No hay owners, priority, due date, target surface, blocked reason ni `in_review`.
- No hay tabla/contrato para links (`TASK-###`, PR, commit, deploy, route) ni evidencia (`GVC capture`, runtime route, visual review).
- No hay snapshot/verificacion durable del nodo Figma (deleted/renamed/stale/render hash).
- No hay reader de orphans inversos: rutas/surfaces implementadas sin diseno asociado o sin excepcion explicita.
- No hay command adapter / API Platform path para que agentes operen el workflow sin UI.

## UI/UX Contract

N/A — esta task no implementa UI visible. Menciona la UI solo como consumer contractual para proteger Full API Parity. La superficie visible, lanes, inspector, allowlist management UI, copy, estados y GVC viven en TASK-1176 y dependen de los commands/readers que esta task entregue.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_core.design_handoff_*` + command/readers en `src/lib/design-system/handoff/**`
- Consumidores afectados: UI `/design-system/handoff`, API Platform/Nexa future consumers, reliability, docs/manuales.
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: TASK-1120 store/API/state-machine/event catalog.
- Contrato nuevo o modificado:
  - schema additive para owners/priority/target/evidence/links/node snapshots;
  - commands: allowlist upsert/deprecate, assign owner, set priority/target, link work item, attach evidence, verify Figma node, transition with evidence;
  - readers: enriched list/detail, drift/orphan summary, stale node summary;
  - API routes under `/api/design-system/handoff/**` or API Platform command adapter.
- Backward compatibility: `compatible` / additive. Existing V1 APIs must keep working.
- Full API parity: every business action in TASK-1176 must call these commands/readers; no UI-only lifecycle, allowlist, owner, link or evidence logic.

### Data model and invariants

- Entidades/tablas/views afectadas:
  - `greenhouse_core.design_handoff_allowed_files`
  - `greenhouse_core.design_handoff_entries`
  - `greenhouse_core.design_handoff_entry_events`
  - new additive tables such as `design_handoff_entry_links`, `design_handoff_entry_evidence`, `design_handoff_node_snapshots` (names to confirm in Discovery).
- Invariantes que no se pueden romper:
  - AXIS master file remains blocked for product handoff.
  - `implemented` requires `implemented_surface_key` and runtime evidence, or an explicit governed exception.
  - Append-only event history cannot be updated/deleted.
  - External refs (`TASK-###`, PR URLs, capture dirs) must be typed and sanitized.
  - Commands re-check capability server-side.
- Tenant/space boundary: internal platform resource; never grant to `client_*`; subject from session tenant/context and role/capability.
- Idempotency/concurrency: commands use deterministic idempotency keys where reattemptable; entry mutations use transaction + row lock; allowlist upsert is idempotent by `file_key`.
- Audit/outbox/history: event row + outbox event for each mutating command; events include actor and typed metadata.

### Migration, backfill and rollout

- Migration posture: `additive` + seed capabilities. No destructive migration.
- Default state: fail-closed; new commands disabled by absence of grants until capability seed/grants exist.
- Backfill plan: optional backfill for existing V1 entries to priority `normal`, owners null, no links/evidence; no mutation of status unless explicit.
- Rollback path: revert PR + down migration for new tables/capabilities if not used; if used, disable capabilities first and preserve history.
- External coordination: Figma token scope/access, approved product `file_key`, staging/prod migration order after TASK-1120.

### Security and access

- Auth/access gate: internal tenant + capabilities:
  - existing: `design_system.handoff.read|create|transition`;
  - new: `design_system.handoff.allowlist.manage`, `design_system.handoff.owner.assign`, `design_system.handoff.planning.update`, `design_system.handoff.link`, `design_system.handoff.evidence.attach`, `design_system.handoff.verify`, `design_system.handoff.drift.read`.
- Sensitive data posture: no secrets; Figma token stays server-only via existing secret resolution; no raw Figma token/client errors.
- Error contract: canonical errors for not allowed, invalid ref, missing evidence, stale/deleted node, invalid link, forbidden.
- Abuse/rate-limit posture: Figma node verification is rate-limited/cached; no client-driven arbitrary Figma file crawling.

### Runtime evidence

- Local checks: unit tests for state machine, commands, links/evidence validation and allowlist commands.
- DB/runtime checks: migration up/down in local/dev DB; read-only query verifies tables/capabilities/events.
- Integration checks: Figma preview/verify smoke against one approved product file when operator provides `file_key`.
- Reliability signals/logs:
  - existing `design_system.handoff.stale_entries`;
  - new proposed `design_system.handoff.node_drift`, `design_system.handoff.orphan_surfaces`, `design_system.handoff.missing_evidence`.
- Production verification sequence: staging migration -> seed one product file -> create entry -> link task -> attach GVC evidence -> transition to implemented -> verify events/outbox/signals -> production after sign-off.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive, no en la UI. La regla de negocio vive en `src/lib/design-system/handoff/**`.
- [ ] Modelada como aggregate/recurso/command, no como click-handler acoplado a la pantalla.
- [ ] Read expuesto como reader/recurso canonico; write como command con authorization fina, idempotencia, audit/outbox, errores canonicos y observabilidad.
- [ ] Capability + grant en el mismo PR para cada capability nueva + coverage test.
- [ ] Camino programatico declarado: Product API/API Platform command adapter/future Nexa action runtime.
- [ ] Write apto para `propose -> confirm -> execute`.
- [ ] Un primitive, muchos consumers: UI, Nexa/MCP/API Platform futuros, scripts y tests consumen el mismo store/commands.
- [ ] Parity check = SI: ninguna accion del cockpit UI queda UI-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema and state-machine V2

- Add additive migration for owners, priority, target surface, due date, blocked reason and `in_review` state.
- Add tables/columns for typed links, evidence and Figma node snapshots.
- Extend state machine: `proposed -> in_implementation -> in_review -> implemented`, plus `archived`.
- Require evidence/route for implemented transition, with a governed exception path if needed.

### Slice 2 — Commands and readers

- Implement server-side commands for allowlist manage, owner assignment, priority/target updates, link work item, attach evidence, verify Figma node and transition-with-evidence.
- Implement enriched readers for list/detail/drift/orphans.
- Keep existing V1 APIs compatible.

### Slice 3 — Capabilities, API Platform and canonical errors

- Add fine-grained capabilities/grants and coverage tests.
- Add canonical error codes for invalid links/evidence/stale node/missing implemented evidence.
- Expose programmatic routes/command adapter surface for non-UI consumers.

### Slice 4 — Reliability and Figma verification

- Add node drift/orphan/missing evidence signals.
- Add Figma verification path that detects deleted/renamed/stale nodes without exposing token/client raw errors.
- Cache/rate-limit provider checks.

### Slice 5 — Runtime rollout and docs

- Apply/verify migration locally and in staging.
- Seed one approved product `file_key` only after operator approval.
- Smoke create -> link -> evidence -> transition -> implemented.
- Update architecture/manual/changelog/handoff and unblock TASK-1176.

## Out of Scope

- Building the visible Kanban/cockpit UI (TASK-1176).
- Changing AXIS primitive linking (`design_system_figma_nodes`).
- Automatically creating TASK docs or GitHub PRs from a handoff.
- Full Nexa action UX; this task only makes the capability operable by command/readers.

## Detailed Spec

Recommended contract names (verify during Discovery):

- Commands:
  - `upsertDesignHandoffAllowedFile`
  - `deprecateDesignHandoffAllowedFile`
  - `assignDesignHandoffOwner`
  - `setDesignHandoffPlanningFields`
  - `linkDesignHandoffWorkItem`
  - `attachDesignHandoffEvidence`
  - `verifyDesignHandoffFigmaNode`
  - `transitionDesignHandoffEntry`
- Links:
  - `task`, `pull_request`, `commit`, `deployment`, `route`, `figma_comment`, `external`
- Evidence:
  - `gvc_capture`, `runtime_route`, `visual_review`, `accessibility_review`, `manual_exception`

`implemented` requires:

1. non-empty `implemented_surface_key`;
2. route-shaped target;
3. at least one evidence item of type `gvc_capture` or `runtime_route`, unless `manual_exception` is present and capability-gated.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema/state) -> Slice 2 (commands/readers) -> Slice 3 (capabilities/API errors) -> Slice 4 (signals/Figma verify) -> Slice 5 (runtime/docs).
- TASK-1120 migration must exist in target DB before Slice 1 migration is applied.
- TASK-1176 cannot start implementation until Slice 2 + Slice 3 are code complete.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Allowlist command permits arbitrary Figma files | integration/security | medium | AXIS block + explicit allowlist manage capability + audit events | `design_system.handoff.node_drift` |
| Implemented transition without real evidence | UI/platform | medium | DB/store check for evidence before implemented | `design_system.handoff.missing_evidence` |
| Figma verification over-calls provider | integration | medium | cache/rate-limit + no arbitrary crawl | provider error rate logs |
| Migration order wrong vs TASK-1120 | migration | low | explicit preflight check for V1 tables | migration failure |
| Commands become UI-specific | API/platform | medium | API Platform/command contract review + tests call commands directly | code review |

### Feature flags / cutover

- No broad feature flag required; change is additive and capability-gated.
- New commands default unusable until capabilities/grants exist.
- Figma verification may use a kill switch if provider rate/availability is uncertain: proposed `DESIGN_HANDOFF_FIGMA_VERIFY_ENABLED=false` default until staging smoke.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | disable capabilities + down migration before production use; otherwise preserve history and revert code | <30 min | parcial after use |
| Slice 2 | revert code; existing V1 APIs remain compatible | <10 min | si |
| Slice 3 | deprecate capabilities in registry + revert code | <15 min | si |
| Slice 4 | disable Figma verify flag / revert signal code | <10 min | si |
| Slice 5 | docs revert; runtime rollout stop if smoke fails | <10 min | si |

### Production verification sequence

1. Local/dev: migration up + unit/integration tests.
2. Staging: apply TASK-1120 migration if missing, then TASK-1175 migration.
3. Seed one approved product `file_key`.
4. Create handoff via API/command; link `TASK-###`; attach GVC evidence; transition to `in_review` and `implemented`.
5. Verify event rows, outbox payloads, reliability signals and API reader response.
6. Production only after staging evidence is attached to the task/handoff.

### Out-of-band coordination required

- Operator approval for the first product Figma `file_key`.
- Confirm Figma token has read access to that file.
- If using GitHub PR lookup, use `gh`/GitHub API only after deciding whether links are passive refs or verified refs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Additive migration creates/extends handoff ownership, planning, links, evidence and node snapshot model.
- [x] State machine includes `in_review` and prevents `implemented` without implemented surface + evidence or governed exception.
- [x] Allowlist manage, owner assignment, planning fields, work item link, evidence attach and node verification are server-side commands.
- [x] Enriched readers expose list/detail/drift/orphans without UI-only logic.
- [x] New capabilities/grants + coverage tests exist for all new commands.
- [x] Canonical errors cover invalid file, invalid link, missing evidence, stale/deleted node and forbidden actions.
- [x] Reliability signals cover stale entries, node drift, orphan surfaces and missing evidence.
- [ ] Staging smoke proves create -> link -> evidence -> implemented with a real approved product Figma node.
- [ ] TASK-1176 is updated/unblocked with the final contract paths.

## Verification

- `pnpm vitest run src/lib/design-system/handoff`
- `pnpm vitest run src/lib/design-system/handoff/state-machine.test.ts src/lib/reliability/queries/design-handoff-control-plane-signals.test.ts src/lib/tenant/designer-role.test.ts`
- `pnpm exec eslint src/lib/design-system/handoff src/app/api/design-system/handoff src/lib/reliability/queries/design-handoff-*.ts src/lib/reliability/get-reliability-overview.ts src/lib/tenant/designer-role.test.ts src/config/entitlements-catalog.ts src/lib/entitlements/runtime.ts src/lib/sync/event-catalog.ts`
- `gtimeout 240s pnpm exec tsc --noEmit --pretty false`
- `gtimeout 600s env NODE_OPTIONS=--max-old-space-size=8192 pnpm build`
- `pnpm task:lint --task TASK-1175`
- `pnpm design:lint`
- `pnpm route-reachability-gate` if API route manifest changes
- `pnpm migration-marker-gate`
- `pnpm qa:gates --changed --agent codex --task TASK-1175 --runtime --auth --data --docs`
- `pnpm docs:closure-check`
- `pnpm fe:capture --route=/design-system/handoff --env=local --hold=3000` (compatibilidad del consumer V1; capture `.captures/2026-06-20T00-56-59_inline-design-system-handoff`)
- DB smoke: migration up/down or migration verify in local/dev.
- Staging API smoke with real product Figma file (after operator approval).

## Closing Protocol

- [x] `Lifecycle` synchronized with folder.
- [x] `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md` synchronized.
- [x] `Handoff.md`, `project_context.md`, `changelog.md` updated.
- [x] Architecture/manual docs updated.
- [x] Runtime rollout state documented: `complete`, `code complete rollout pendiente`, or `operativamente bloqueado`.
