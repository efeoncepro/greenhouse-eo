# TASK-1580 — Globe Creative Project, Session and Reusable Element Contract

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-028`
- Status real: `Discovery requerido; no existe aún una autoridad visible para Project, Session y Element`
- Rank: `TBD`
- Domain: `creative|data|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`

## Summary

Define la autoridad gobernada para Project, Session y Element que falta para que el Producer conserve contexto antes de generar y reutilización después de aprobar. No crea un segundo experiment store, library, lineage, rights store ni ledger.

## Why This Task Exists

El benchmark de suites maduras muestra que el destino de una generación, la sesión de exploración y el asset reusable son conceptos distintos. Globe tiene piezas de tenancy, experiment, library, asset y lineage, pero no una proyección contractual que los una para la experiencia del Producer.

## Goal

- Definir schemas versionados y readers/commands para Project, Session y Element.
- Mantener workspace, rights, provenance, lineage y credits en sus autoridades existentes.
- Exponer un contexto seguro para UI, API, SDK y MCP con idempotencia, audit y errores canónicos.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

Rules: Project/Session/Element are context projections, not permission boundaries; workspace trusted context is authoritative; an Element cannot bypass rights or lineage; creating a Session never spends credits.

## Dependencies & Impact

### Depends on

- `TASK-1511` workspace/members/grants
- `TASK-1498` candidate exploration and lineage
- `TASK-1503` governed asset retrieval/actions
- `TASK-1520` library/collections/bulk
- `TASK-1578` model onboarding only for compatibility metadata, not as a runtime dependency

### Blocks / Impacts

- `TASK-1581`, `TASK-1582`, `TASK-1583`
- `TASK-1552` and `TASK-1531` may consume Session context after the contract is available

### Files owned

- `../efeonce-globe/packages/contracts/**` (new versioned contract)
- `../efeonce-globe/packages/domain/**` (commands/readers)
- `../efeonce-globe/packages/database/**` (additive persistence if required)
- Greenhouse task/spec documentation

## Current Repo State

### Already exists

- Workspace tenancy and grants.
- Durable experiments/runs, candidate outputs, asset retrieval, collections and lineage readers.
- Project-aware credit policy fields in the backend.

### Gap

- No single governed projection explains the active creative project, session context or reusable Element.
- UI would otherwise invent folders, infer lineage or treat every candidate as reusable.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `efeonce-globe/packages/contracts|domain|database`
- Future candidate home: `domain-package`
- Boundary: Project/Session/Element context commands/readers; consume existing experiment, asset, lineage and rights ports
- Server/browser split: all authority, rights and membership validation server-side; browser receives allowlisted projections only
- Build impact: additive contract and migration if required
- Extraction blocker: workspace scope, rights and lineage transaction boundaries

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Source of truth affected: new context aggregates and Element membership projection
- Consumers: Producer UI/BFF, SDK, MCP, review and future Workbench
- Runtime target: Globe API/database

### Contract surface

- Readers: project list/get, session get/list, element list/get, context bundle.
- Commands: create/update Project, create/update/close Session, create/update/archive Element.
- Full API parity: same primitives through HTTP/SDK/MCP; no UI-only context state.

### Invariants

- Every row and query is workspace-scoped.
- Session creation is idempotent and never reserves/spends credits.
- Element creation requires an eligible asset, rights posture and source lineage.
- Element reuse revalidates workspace, rights, compatibility and source hash.
- Project/Session references do not duplicate experiment or asset ownership.
- Audit records capture create, rename, close, approve, supersede and archive.

### Rollout and recovery

- Additive schema behind read-only projection first.
- Backfill existing retained assets into an explicit `Unsorted`/`Legacy session` projection without fabricating authored context.
- Enable writes only after isolation, idempotency and rights tests pass.
- Disable new context writes without deleting existing experiments/assets; preserve additive data for rollback.

### Acceptance Criteria

- [ ] Versioned Project, Session and Element schemas exist with canonical errors.
- [ ] Readers and commands enforce trusted workspace scope and capabilities.
- [ ] Session create/replay never reserves or spends credits.
- [ ] Element creation/reuse rejects missing rights, cross-workspace source or absent lineage.
- [ ] Existing experiment, asset, collection, lineage and ledger authorities remain unchanged.
- [ ] API, SDK and MCP coverage/conformance exists for every executable primitive.
- [ ] Migration/backfill and rollback are tested with no fabricated authored context.
- [ ] Audit and operational signals identify each mutation and source aggregate.

## Scope

### Slice 1 — Contract and read projection

- schemas, readers, context bundle and capability matrix;
- projection from existing project/experiment/library/lineage authorities.

### Slice 2 — Durable session and Element writes

- idempotent session lifecycle;
- eligible Element creation, supersede and archive;
- audit/outbox and rights checks.

### Slice 3 — Coverage and rollout

- API/SDK/MCP conformance;
- migration/backfill rehearsal;
- internal-only canary and rollback evidence.

## Out of Scope

- Producer layout or UI;
- a new credit engine;
- provider SDKs or model routing;
- public community feed;
- automatic conversion of every candidate into an Element;
- free-form folders that bypass Library/Collections.

## Verification

- Contract, isolation, idempotency, rights and replay tests.
- Database migration/readback and rollback rehearsal.
- API/SDK/MCP positive and negative coverage.
- Internal runtime smoke with real retained asset and no spend on Session creation.
