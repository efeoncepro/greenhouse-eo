# TASK-1611 — Talent Assurance Operator Cockpit and Workflows

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1611-talent-assurance-operator-cockpit.md`
- Flow: `docs/ui/flows/TASK-1611-talent-assurance-operator-cockpit-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-038`
- Status real: `Diseño de flujo; backend pendiente`
- Rank: `EPIC-038-phase-1`
- Domain: `ui|hiring|workforce|client|delivery`
- Blocked by: `TASK-1610`
- Branch: `task/TASK-1611-talent-assurance-operator-cockpit`
- GitHub Issue: `none`

## Summary

Diseña y construye el cockpit interno para revisar gaps de evidencia, quality gates, outcomes, continuity, economics y propuestas agentic sin convertirlo en otra fuente de verdad.

## Why This Task Exists

Los operadores necesitan una vista común para decidir y corregir; hoy la evidencia está distribuida entre Hiring, Workforce, Delivery, Client Experience y Finance.

## Goal

- Mostrar estado, evidencia, freshness, riesgos, owner, siguiente acción y límites.
- Presentar propuestas agentic con evidencia y diff antes de confirmar.
- Mantener superficies separadas para cliente, colaborador y operador interno.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1610` y UI primitives existentes de Hiring/Workforce/Finance.

### Blocks / Impacts

- Operación de quality gate, continuity y agent proposals.

### Files owned

- `src/views/greenhouse/**`
- `src/app/**`
- `docs/ui/wireframes/TASK-1611-talent-assurance-operator-cockpit.md`
- `docs/ui/flows/TASK-1611-talent-assurance-operator-cockpit-flow.md`

## Current Repo State

### Already exists

- Application 360, Talent Ops Dashboard, Workforce views, Finance/CPQ and proposal surfaces.

### Gap

- No assurance cockpit composes those projections with explicit human gates and client/collaborator boundaries.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: Greenhouse portal views and existing dashboard shells
- Future candidate home: `portal`
- Boundary: consumes `TASK-1610` readers; no business logic or raw DB in UI
- Server/browser split: server loaders/API; client only typed DTOs and interaction state
- Build impact: `none`
- Extraction blocker: shared CompositionShell, capabilities and cross-domain projection contract

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: Talent, Workforce, Delivery, Finance/Commercial y operador de assurance
- Momento: revisar evidencia, bloquear/override, continuidad o propuesta agentic
- Resultado: una decisión humana informada y auditable
- Fricción: navegar múltiples dominios y no distinguir evidencia de inferencia
- No-goals: badge público, cliente editando ratings, decisión automática

### Surface & system decision

- Surface: portal interno de Talent Assurance
- Composition Shell: `aplica` — reutilizar shell y sidecars existentes
- Primitive decision: `reuse|extend` — Application 360, evidence rail, proposal review, alert/status primitives
- Copy source: `src/lib/copy/*`
- Access impact: `views|entitlements`

### State inventory

- Default, loading, empty, error, degraded, permission denied, stale evidence, long evidence, mobile/compact, keyboard/focus y reduced motion deben estar diseñados antes de implementation.

### Interaction contract

- Primary: abrir caso → revisar evidencia → ver propuesta/diff → confirmar/abstain/escalar.
- Pending, focus restore, escape/click-away y audit receipt son obligatorios.

### Implementation mapping

- Route/surface: por definir en wireframe; consume `TASK-1610` readers.
- API parity: UI no crea reglas ni escribe tablas.

### GVC scenario plan

- Scenario file: por crear bajo `scripts/frontend/scenarios/`
- Route: por definir en wireframe
- Viewports: desktop y 390px
- Quality profile: `premium`
- Assertions: scope, evidence lineage, stale state, proposal diff, keyboard, scroll-width y reduced-motion

### Design decision log

- Preferir composición de primitives existentes; separar evidence, risk y action; no usar score único como decisión.

## Scope

### Slice 1 — Information architecture and wireframe

- Crear wireframe/flow, states y access matrix; checkpoint humano.

### Slice 2 — Read-only cockpit

- Implementar casos y proyecciones sin writes.

### Slice 3 — Proposal review actions

- Consumir commands gobernados de `TASK-1608`, con confirmation/diff/audit.

## Out of Scope

- Nueva API, schema, agent runtime o UI pública.

## Acceptance Criteria

- [ ] Wireframe, flow, UI contract y GVC plan aprobados antes de JSX.
- [ ] Cockpit distingue evidence/claim/inference y muestra freshness.
- [ ] Access boundary client/collaborator/internal probado.
- [ ] Proposal confirmation muestra exact diff, policy, expiry y receipt.

## Rollout Plan & Risk Matrix

Wireframe → read-only staging → GVC desktop/mobile → internal pilot → bounded actions. Rollback: route/feature flag OFF; readers permanecen intactos.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| UI sugiere certeza falsa | portal/agents | medium | labels evidence/inference y human gate | `assurance.ui_ambiguity_review` |
| Scope leakage | identity/client | low | entitlements y negative tests | `assurance.cockpit_scope_denied` |

## Verification & Definition of Done

- [ ] `greenhouse-ai-design-studio` y UI invariants aplicados.
- [ ] GVC premium desktop/390px, keyboard, a11y y scroll-width verdes.
- [ ] `pnpm qa:gates --changed` y docs closure verdes.
