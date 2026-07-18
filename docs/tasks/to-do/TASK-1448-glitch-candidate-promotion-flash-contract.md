# TASK-1448 — Glitch Candidate Promotion and Flash Publication Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-1442, TASK-1443`
- Branch: `task/TASK-1448-glitch-candidate-promotion-flash-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formaliza el único puente permitido desde una candidata interna Daily/Flash hacia una publicación destacada de noticia única: `glitchFlash`, mediante `propose -> confirm -> execute`, evidencia completa e idempotencia.

## Why This Task Exists

Daily y Flash existen para detectar y enriquecer candidatas, no para publicar. Sin un contrato separado, un score alto o una instrucción de prompt podría abrir WordPress accidentalmente, confundir una alerta interna con autorización editorial o consumir un número Weekly.

## Goal

- Definir lifecycle y command gobernado de promoción candidata -> `glitchFlash`.
- Impedir mecánicamente que Daily/Flash invoquen WordPress sin confirmación.
- Entregar un DTO confirmado consumible por Content Factory y Glitch Desk.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- Candidate origin (`daily|flash`) no equivale a publishable content kind.
- Sólo una promoción confirmada produce `glitchFlash`; nunca consume número Weekly.
- Execute produce autorización para draft privado, no autorización de publish público.

## Normative Docs

- `docs/operations/glitch/GLITCH_AGENTIC_OPERATING_MODEL_V1.md`
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1442` para candidate/run/edition primitives.
- `TASK-1443` para promotion proposal output y evals.

### Blocks / Impacts

- `TASK-1444` adapters y `TASK-1447` Glitch Desk.

### Files owned

- `src/lib/content/glitch/`
- `src/types/glitch.ts`
- `docs/operations/glitch/GLITCH_FLASH_PROMOTION_RUNBOOK_V1.md`

## Current Repo State

### Already exists

- Separación conceptual Daily/Flash/Weekly y patrones propose-confirm-execute en Greenhouse.

### Gap

- No existe un estado/command que convierta una candidata en Glitch Flash sin abrir un bypass de publicación.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/content/glitch/ dentro del monolito vigente`
- Future candidate home: `domain-package`
- Boundary: `promotion proposal/confirm/execute command y DTO confirmado; adapters son consumers`
- Server/browser split: `policy, state y execute server-side; browser sólo consume preview/commands`
- Build impact: `tests de dominio y capability; sin SDK externo`
- Extraction blocker: `transacción Postgres, capability/audit y candidate aggregate de TASK-1442`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `candidate/promotion state del dominio Glitch TASK-1442`
- Consumidores afectados: `skill runner, API, Glitch Desk, Content Factory adapter, CLI y futuro Nexa`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `commands/readers Glitch de TASK-1442 + governed action pattern`
- Contrato nuevo o modificado: `proposeGlitchFlashPromotion`, `confirmGlitchFlashPromotion`, `executeGlitchFlashPromotion` o nombres equivalentes congelados en plan
- Backward compatibility: `compatible`
- Full API parity: `UI/CLI/agentes invocan el mismo command; ningún consumer fabrica el DTO confirmado`

### Data model and invariants

- Entidades/tablas/views afectadas: `candidate/promotion/history definidos aditivamente sobre TASK-1442`
- Invariantes que no se pueden romper:
  - Daily/Flash candidate no crea mapping WordPress sin promoción `confirmed`.
  - Una promoción pertenece a una candidata, no consume número y produce como máximo un `glitchFlash` privado.
  - Confirmación exige evidencia, motivo editorial, vigencia y actor humano.
- Tenant/space boundary: `scope Efeonce explícito, preservando boundary extraction-ready de TASK-1442`
- Idempotency/concurrency: `promotion id + candidate id + evidence version; confirm/execute transaccionales; re-run devuelve mismo resultado`
- Audit/outbox/history: `proposal, decision, actor, evidence checksum, reason y execution outcome append-only`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flag OFF`
- Backfill plan: `ninguno; posts tácticos históricos no se reclasifican automáticamente`
- Rollback path: `flag off; promociones pendientes quedan legibles y no ejecutables; drafts existentes permanecen private`
- External coordination: `ninguna hasta TASK-1444; esta task no escribe Notion/WordPress`

### Security and access

- Auth/access gate: `read capability para proponer; capability mutante separada para confirmar/ejecutar con actor humano`
- Sensitive data posture: `contenido público y audit operativo; secretos ausentes`
- Error contract: `candidate_not_found/evidence_incomplete/stale_candidate/already_promoted/confirmation_required/invalid_transition`
- Abuse/rate-limit posture: `one active promotion per candidate; expiry; quotas y replay guard`

### Runtime evidence

- Local checks: `state machine, capability, concurrency y contract tests`
- DB/runtime checks: `migration/readback y constraint probes`
- Integration checks: `fixture candidata -> propose -> confirm -> confirmed DTO; sin provider write`
- Reliability signals/logs: `promotion_stale/rejected/conflict/execute_failed`
- Production verification sequence: `migrate staging -> commands flag OFF -> capability smoke -> fixture confirm -> prod flag OFF -> read-only verify`

### Acceptance criteria additions

- [ ] Source of truth, consumers, actor boundary, idempotencia, audit y rollback quedan explícitos.
- [ ] La capability demuestra Full API Parity y no expone secrets/raw errors.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Se completa al tomar la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Promotion state and policy

- Definir lifecycle `proposed|confirmed|rejected|executed|expired` o equivalente aceptado.
- Implementar policy de elegibilidad, evidencia, expiración, dedupe y actor humano.

### Slice 2 — Commands, DTO and audit

- Implementar propose/confirm/execute y reader/DTO confirmado.
- Agregar capability, audit/outbox, signals y fixtures/evals de bypass.

## Out of Scope

- Render Gutenberg, write WordPress/Notion, UI Glitch Desk, publicación pública y reclasificación histórica.

## Detailed Spec

El DTO ejecutable declara `contentKind=glitchFlash`, candidate/evidence version, headline/POV, single-story body contract, sources, media/SEO requirements y promotion audit reference. No incluye número Weekly ni credenciales/provider commands.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1442 foundation -> policy/state -> capabilities -> propose/confirm -> execute DTO -> audit/signals -> adapter consumer TASK-1444.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Daily/Flash abre draft sin humano | content/public-site | medium | confirmation invariant + adapter rejects raw candidate | confirmation_required |
| Misma candidata genera dos Flash | DB | medium | unique active/executed promotion | promotion conflict |
| Noticia caduca tras confirmación | editorial | medium | evidence version + expiry | promotion stale |

### Feature flags / cutover

Flag de promotion execute default OFF; propose/read puede habilitarse en shadow antes de confirm/execute.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| State/commands | flag off + revert code; conservar audit aditivo | <30 min | sí |
| Capability | retirar grants/flag sin borrar historial | <15 min | sí |

### Production verification sequence

Staging fixture y concurrencia, prod flag OFF/read-only, shadow proposals, sign-off de policy; execute sólo se activa junto a TASK-1444.

### Out-of-band coordination required

Confirmación del operador sobre quién puede aprobar promoción y su expiry; no requiere cambios externos en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Daily/Flash candidate no puede alcanzar Content Factory sin promotion `confirmed`.
- [ ] `glitchFlash` es una sola noticia, sin número Weekly y con evidencia/versionado completo.
- [ ] Propose/confirm/execute son idempotentes, capability-gated y auditables.
- [ ] Replays, confirmaciones concurrentes, candidate stale y already-promoted tienen tests.
- [ ] El DTO confirmado es consumible por TASK-1444 y Glitch Desk sin lógica duplicada.

## Verification

- `pnpm task:lint --task TASK-1448`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests focales de state/capability/concurrency + migration dry-run.
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] Lifecycle/carpeta/README, ADR, runbook, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- `TASK-1444`, `TASK-1447`.

