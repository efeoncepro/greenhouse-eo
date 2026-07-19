# TASK-1481 — Globe API Contract Spine and Cross-Surface Harness

## Delta 2026-07-19 — pre-execution review (arch-architect + state-design + info-architecture + creative-practice)

- `TASK-1456` está `complete`: la dependencia de `Depends on` quedó satisfecha y esta task está desbloqueada.
- Hallazgos verificados contra el runtime real de Globe que precisan el `### Gap`: el SDK ya envía
  `X-Globe-Workspace-Id` caller-provided (`packages/sdk/src/index.ts`) y la shell deriva
  `AuthenticatedPrincipalV1.capabilities` hardcodeadas a `[globe.studio.access]` en vez de leerlas del binding
  del broker (`apps/studio-web/src/app.ts`).
- Precisión semántica obligatoria: workspace **selection** (input no confiable que declara sobre qué workspace
  se quiere operar) es válida por header/payload; workspace **authority** NUNCA — el trusted context valida la
  selección contra los bindings del principal server-side y deniega con audit si no corresponde. Prohibido tanto
  eliminar la selección (rompe multi-workspace) como promoverla a autoridad (spoofing).
- Test del segundo consumidor: la conformance matrix y sus asserts se derivan de los capability
  descriptors/coverage machine-readable, no se hardcodean al fixture. `TASK-1457` extiende declarando
  descriptor + fixture con cero edición del harness; un harness que se edita por capability sólo prueba que el
  primer fixture sigue igual.
- El vocabulario de error canónico debe distinguir capability/surface `policy-blocked` de
  `access_denied`/`not_found` con código estable, para que toda surface (UI/MCP/agente) renderice el estado
  honesto "bloqueado por política" sin adivinar y sin retry inútil.
- El harness prueba la derivación de trusted context para ambos planos de auth (`greenhouse-session` humano y
  `google-id-token` workload) o declara explícito cuál queda diferido y a qué task.
- Estas precisiones se reflejan en `### Gap`, `### Data model and invariants` y `## Acceptance Criteria`.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Diseño aprobado; primera task ejecutable antes de provider integration`
- Rank: `1`
- Domain: `platform|api|agentic`
- Blocked by: `TASK-1456`
- Branch: `task/TASK-1481-globe-api-contract-spine-cross-surface-harness`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el spine mínimo de Full API Parity de Globe: schemas versionados, trusted command context, commands/readers
transport-neutral, private HTTP/SDK adapters, capability coverage machine-readable y un conformance harness que
pruebe que todas las surfaces habilitadas alcanzan el mismo primitive y audit.

## Why This Task Exists

La ADR de Globe ya exige UI y MCP sobre el mismo command/read model, pero el bootstrap actual sólo expone
`health` en el SDK y `CommandEnvelope` aún incluye actor/workspace como datos caller-provided. Sin una foundation
temprana, el Model Lab podría crear scripts directos al provider y dejar API parity para TASK-1473, reproduciendo
exactamente el patrón UI/integration-first que la arquitectura rechaza.

## Goal

Hacer que el primer provider canary de TASK-1457 nazca sobre el mismo contrato que consumirán UI, SDK, MCP,
CLI, workers, sister platforms y E2E, aunque varias surfaces permanezcan `policy-blocked`.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `../efeonce-globe/docs/architecture/PLATFORM_FOUNDATION_V1.md`
- `../efeonce-globe/docs/architecture/GREENHOUSE_CONNECTIVITY_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1456` complete.

### Blocks / Impacts

- Bloquea el primer provider call de `TASK-1457` y el schema executable de `TASK-1458`.
- Es normative foundation para toda task que cree una business capability en `TASK-1457…1480`.
- No bloquea `TASK-1464`: IaC puede avanzar en paralelo porque no es una product capability.

### Files owned

- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/sdk/`
- `../efeonce-globe/apps/studio-web/` sólo para private HTTP adapter/discovery y conformance fixtures.
- `../efeonce-globe/docs/architecture/` sólo para el contrato implementado/evidencia.

### Cross-task ownership boundary

- No integra providers, no crea Model Lab policy y no ejecuta inferencia; eso pertenece a `TASK-1457`.
- No crea tenancy DB ni lifecycle productivo completo; pertenecen a `TASK-1465` y `TASK-1469`.
- No publica un catálogo final de MCP tools; `TASK-1473` empaqueta transports y certifica parity acumulada.
- No crea UI visible; `TASK-1474` es un thin client sobre contracts ya existentes.

## Current Repo State

### Already exists

- `packages/contracts` define principal, capabilities, error/health y un `CommandEnvelope` inicial.
- `packages/domain` define run states y `CommandContext`.
- `packages/sdk` ofrece transporte autenticado, correlation, timeout y sólo el método `health`.
- `apps/studio-web` expone `/v1/health` y la shell internal-only.

### Gap

- No hay schema/discovery machine-readable para creative capabilities ni conformance matrix.
- SDK/MCP/CLI/worker todavía no tienen creative command/read paths.
- `CommandEnvelope` acepta `actorId` y `workspaceId` pese a que la autoridad debe derivarse server-side.
- El SDK envía `X-Globe-Workspace-Id` y `GlobeInvocationContext.workspaceId` caller-provided sin contrato que
  los declare workspace selection no confiable (`packages/sdk/src/index.ts`).
- La shell deriva `AuthenticatedPrincipalV1.capabilities` hardcodeadas a `[globe.studio.access]` en vez del
  binding del broker (`apps/studio-web/src/app.ts`).
- No existe test que demuestre que body/query/headers no pueden suplantar actor/workspace.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `packages/contracts/domain/sdk y private API de Efeonce Globe`
- Future candidate home: `remain-shared`
- Boundary: `Globe capability contract spine, trusted context and transport conformance`
- Server/browser split: `authority/auth/commands server-only; schemas/result DTOs browser-safe y sin secrets`
- Build impact: `contracts/domain preceden SDK/API; ningún provider package entra al browser bundle`
- Extraction blocker: `ninguno: Globe ya es plataforma hermana y esta task consolida su frontera interna`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: `Globe domain primitives; transports y SDK son consumidores`
- Consumidores afectados: `private HTTP API, SDK, MCP/agents, CLI/runbooks, workers/events, sister platforms, UI y E2E`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `Globe API v1, federated identity TASK-1454 y Full API Parity Decision`
- Contrato nuevo o modificado: `trusted command context, untrusted payload envelope, canonical result/error, capability coverage y API discovery`
- Backward compatibility: `gated; bootstrap internal-only sin consumer creativo externo`
- Full API parity: `esta task crea el spine; cada capability task extiende el primitive y declara coverage, no espera a TASK-1473`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna migration; tipos/ports y conformance fixtures repo-only`
- Invariantes que no se pueden romper:
  - `actor/workspace/capabilities salen de auth + binding confiables, nunca de payload/query/header caller-provided`;
  - `workspace selection caller-provided es input no confiable: se valida contra los bindings del principal y se deniega con audit si no corresponde; nunca se copia directo al trusted context`;
  - `business logic vive una vez en command/reader; transports no llaman DB, storage o providers directamente`;
  - `una surface disabled usa available|policy-blocked|not-applicable; missing bloquea closure`;
  - `command result, error y audit correlation son iguales para todo consumer`.
- Tenant/space boundary: `studio_workspace_id resuelto server-side y comparado con el resource scope`
- Idempotency/concurrency: `write envelope exige idempotency key; primitive decide replay/conflict`
- Audit/outbox/history: `actor trusted, workspace, capability, command, correlation, outcome y sanitized error`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `internal-only; creative capabilities aún policy-blocked`
- Backfill plan: `none`
- Rollback path: `revert contract/API slice antes del primer provider integration; no data mutation`
- External coordination: `ninguna; no provider call ni provisioning`

### Security and access

- Auth/access gate: `authenticated principal + binding + fine capability before command dispatch`
- Sensitive data posture: `payload schemas exclude secrets; server-only context is non-serializable to clients`
- Error contract: `typed stable codes, retryability and correlation; no raw upstream body`
- Abuse/rate-limit posture: `transport limits plus per-capability policy; no generic endpoint + arbitrary JSON`

### Runtime evidence

- Local checks: `contract, spoofing-negative, parity coverage, transport equivalence and browser-boundary tests`
- DB/runtime checks: `n/a — no schema/runtime data mutation`
- Integration checks: `private API + SDK conformance smoke over an inert fixture command/reader, no provider spend`
- Reliability signals/logs: `one correlation across HTTP/SDK/command/audit fixture; sanitized denial evidence`
- Production verification sequence: `local -> internal Cloud Run private smoke -> TASK-1457 first canary`

### Acceptance criteria additions

- [ ] El spine permite añadir una capability sin duplicar business logic por transport.
- [ ] Auth spoofing, idempotency replay, deny y canonical error paths tienen contract evidence.
- [ ] La conformance matrix y sus asserts se derivan de los capability descriptors/coverage machine-readable; añadir una capability nueva no requiere editar el harness, sólo declarar descriptor + fixture.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Trusted contract spine

- Separar payload no confiable de `TrustedCommandContext` derivado server-side.
- Versionar command/reader/result/error envelopes y capability descriptors en `packages/contracts`.
- Corregir o retirar actor/workspace caller-provided del `CommandEnvelope` bootstrap.

### Slice 2 — Private API and SDK path

- Implementar dispatch privado versionado hacia primitives de `packages/domain` sin DB/provider shortcuts.
- Publicar discovery/coverage machine-readable y el patrón typed SDK para capabilities.
- Mantener toda surface creativa `policy-blocked` hasta que su task entregue el primitive real.

### Slice 3 — Cross-surface conformance harness

- Probar HTTP y SDK sobre un inert fixture command/reader y el mismo audit/correlation.
- Agregar tests negativos de actor/workspace spoofing, missing capability, replay y raw-error redaction.
- Definir la matriz que futuras tasks deben extender para UI, SDK, MCP, CLI, worker/event, sister platform y E2E.

## Out of Scope

- Provider credentials, inference, storage, database, ledger, Model Lab policy o producción.
- API pública, cliente externo, autonomous spend o exposición MCP de creative tools.
- Business commands definitivos de experiment/run/review/release.

## Detailed Spec

La task se ejecuta desde Greenhouse con `pnpm codex:task-hook TASK-1481 --develop` después de un goal explícito.
El código vive en Globe. La implementación debe hacer irrepresentable la suplantación de authority context y
dejar un seam mínimo que TASK-1457 pueda probar con un provider real sin reescritura.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- trusted context/types -> domain dispatch -> private HTTP/SDK -> conformance negatives -> internal smoke.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Caller suplanta actor/workspace | auth/tenant | high | trusted context server-only + negative tests | body/header cambia authority |
| Spine genérico se vuelve provider proxy | API | medium | semantic capabilities; no arbitrary JSON/endpoint | provider model ID en transport policy |
| TASK-1473 concentra lógica tardía | architecture | medium | capability tasks own primitives; 1473 packaging-only | SDK/MCP requiere reescribir domain |
| Contract se filtra al browser con secretos | build/security | low | server/browser export tests | provider/auth secret in client graph |

### Feature flags / cutover

No feature flag de negocio. Private API internal-only; creative capabilities permanecen policy-blocked hasta sus
tasks. Kill switch = retirar route/SDK method fixture sin afectar la shell ni health.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| contracts/domain | revert antes de downstream adoption | <15 min | sí |
| private API/SDK | retirar adapter y conservar health | <15 min | sí |
| conformance | revert fixture/harness; no runtime data | <15 min | sí |

### Production verification sequence

No Production. Tests locales, build, private Cloud Run internal smoke y readback del coverage manifest.

### Out-of-band coordination required

Ninguna. La primera credencial/provider call pertenece al checkpoint aprobado de TASK-1457/TASK-1464.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `packages/contracts` separa untrusted payload de trusted actor/workspace/capabilities.
- [ ] Body, query y headers no pueden suplantar authority context; tests negativos pasan.
- [ ] Un fixture command/reader produce el mismo result/error/audit correlation por HTTP y SDK.
- [ ] Existe coverage machine-readable por capability/surface con `available|policy-blocked|not-applicable`.
- [ ] No existe generic `endpoint + arbitrary JSON` ni import provider/DB/storage desde transports.
- [ ] El SDK deja de ser health-only como patrón, sin inventar business capability antes de su task.
- [ ] El error canónico distingue capability/surface `policy-blocked` de `access_denied`/`not_found` con un código estable, consumible por UI/MCP/agentes para renderizar el estado honesto.
- [ ] Workspace selection caller-provided se valida contra bindings (deny + audit en mismatch) y existe test negativo de principal válido operando un workspace ajeno.
- [ ] El trusted context se deriva y prueba para ambos planos de auth (`greenhouse-session` humano y `google-id-token` workload), o el plano diferido queda declarado explícito con su task.
- [ ] TASK-1457 puede añadir el primer Model Lab command y provider canary sin cambiar el spine.
- [ ] No se habilitan Production, provider spend, cliente externo ni MCP creativo.

## Verification

- `pnpm task:lint --task TASK-1481`
- `pnpm ops:lint --changed`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- Tests focales contracts/domain/sdk/studio-web, spoofing-negative y conformance.
- `pnpm qa:gates --changed --agent codex --task TASK-1481 --auth --integration --docs`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle/carpeta, README, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] Arquitectura/ADR y coverage contract reflejan el runtime real.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- `TASK-1457` prueba el primer provider canary sobre el spine.
- `TASK-1458…1472` extienden contracts por capability.
- `TASK-1473` empaqueta/certifica SDK y MCP sin business logic nueva.
