# TASK-1483 — Globe Credits Operations Workbench

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1483-globe-credits-operations-workbench.md`
- Flow: `docs/ui/flows/TASK-1483-globe-credits-operations-workbench-flow.md`
- Motion: `docs/ui/motion/TASK-1483-globe-credits-operations-workbench-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Dirección y contrato UI definidos; implementación pendiente`
- Rank: `TBD`
- Domain: `finance|creative|ui|operations`
- Blocked by: `TASK-1481, TASK-1466, TASK-1468, TASK-1482, TASK-1485`
- Branch: `task/TASK-1483-globe-credits-operations-workbench`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear `/studio/credits` como control plane visual internal-first para runway, pools, grants, sub-budgets,
alerts, ledger y reconciliación, consumiendo exclusivamente commands/readers canónicos.

## Why This Task Exists

El workbench creativo de `TASK-1474` necesita contexto de gasto por run, pero mezclar allí administración
financiera degradaría el flujo creativo y los controles de acceso.

## Goal

Dar a Credit Operators, budget owners, Finance Ops, leads y auditors una experiencia premium, auditable y
recuperable sin representar Studio Credits como dinero/token ni calcular business logic en browser.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1481` trusted context/parity, `TASK-1466` responsibility, `TASK-1468` ledger, `TASK-1482` admin y
  `TASK-1485` pattern registry/foundation propio de Globe.

### Blocks / Impacts

- Evidencia necesaria para `TASK-1480` si el go incluye client-operated/budget manager externo.
- No depende de `TASK-1474`; comparten identidad/shell Globe, no ownership de dominio.

### Files owned

- `../efeonce-globe/apps/studio-web/` exclusivamente para la surface/copy/fixtures de credits.
- Scenario GVC y reviews de `TASK-1483` en Greenhouse.

Contracts/SDK permanecen bajo `TASK-1468`, `TASK-1482`, `TASK-1473` y `TASK-1481`.

## Current Repo State

### Already exists

- Globe tiene shell branded HTML/CSS/TS server-rendered y construirá su propia biblioteca incremental de
  patterns; compartir un color de marca no implica heredar el sistema UI Greenhouse.

### Gap

- Falta una surface operativa y su evidencia multi-role/state; el backend canónico vive en tasks previas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Globe UI; Greenhouse task/GVC evidence`
- Future candidate home: `remain-shared`
- Boundary: `credits administration thin client`
- Server/browser split: `browser sólo renderiza DTOs y envía commands; policy/forecast/impact server-side`
- Build impact: `Globe UI + GVC Greenhouse`
- Extraction blocker: `ninguno`

## UI/UX Contract

- Visual direction: `docs/ui/visual-directions/TASK-1483-globe-credits-operations-workbench-direction.md`
- Wireframe: `docs/ui/wireframes/TASK-1483-globe-credits-operations-workbench.md`
- Flow: `docs/ui/flows/TASK-1483-globe-credits-operations-workbench-flow.md`
- Motion: `docs/ui/motion/TASK-1483-globe-credits-operations-workbench-motion.md`
- Selected direction: `Runway Control Plane`.
- Surface architecture: `Runway Control Plane compuesto sólo con patterns Globe: runway plane, risk rail,
  pool navigator, ledger list-detail y governed command panel`.
- Primitive decision: `reuse | extend | new sobre el registry Globe; cada pattern nueva documenta anatomy,
  states, accessibility, responsive behavior y evidence antes de promoción`.
- Full API parity: `thin client de DTOs/commands 1468/1482; cero balance/rate/forecast/auth/margin local`.
- Copy/access: `copy centralizada; estados honestos por audience/capability; external client policy-blocked`.
- Accessibility: `WCAG AA, keyboard, focus restore, text alternative del runway, reduced motion, 390 px sin overflow`.
- Visual evidence: scenario `globe-credits-operations-workbench`, desktop 1440×1000 y mobile 390×844;
  baseline `globe.credits-operations-workbench` sólo tras first-fold acceptance.

## Backend/Data Contract

No aplica: `TASK-1483` no crea schema, migrations, commands ni readers. Consume browser-safe DTOs ya owned por
`TASK-1468`/`TASK-1482` a través del SDK/private HTTP certificado; cualquier brecha backend vuelve a la task
owner y no se resuelve con endpoint o cálculo ad hoc en UI.

### Role contract

- Credit Operator: lectura, proposal y pause/resume dentro de policy; sin vendor cost/margin.
- Budget owner/approver: runway/holds y confirmación de grants/limits; sin rates/adjustments contables.
- Finance Ops: grants/correcciones/reconciliation y proyección interna restringida.
- Creative/project lead: usage/forecast/deep links read-only.
- Auditor: ledger/audit/evidence read-only.
- Client budget manager/viewer futuro: proyección redactada, `policy-blocked` hasta gate externo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Shell, runway and states

- Implementar header con workspace/período/freshness/audience y plano dominante
  available/reserved/consumed/runway.
- Implementar empty, healthy, low/exhausted, paused, expiring, stale/partial, denied/redacted y error.

### Slice 2 — Pools, ledger and governed actions

- Navegador de pools/sub-budgets, risk rail, ledger filtrable y detail sidecar.
- Drawers propose->confirm->execute para allocate/grant/limit/pause/resume/adjust según capability.
- Mostrar impact/preconditions/fingerprint server-side, refrescar readers y enlazar ledger/run/audit.

### Slice 3 — Reliability and visual acceptance

- Anomaly/reconciliation evidence con recovery sólo cuando exista command gobernado.
- GVC desktop/mobile, keyboard, reduced motion, redaction, focus restore y premium scorecard.

## Out of Scope

- Brief/candidates/review/release (`TASK-1474`).
- Cálculo de balance, rates, forecast, auth, expiry o adjustment impact en browser.
- UI pública, checkout, pricing, payment o habilitación externa.
- Imports de layouts, components, recipes o primitives de Greenhouse; la identidad/pattern library es Globe.

## Detailed Spec

La ejecución comienza con `pnpm codex:task-hook TASK-1483 --develop` tras goal aprobado. Antes de código,
se valida first fold contra visual direction y fixtures; `UI ready` permanece `no` hasta los gates.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Signal |
|---|---|---|
| UI deriva saldo/policy | DTO-only + parity conformance | browser/domain math detectado |
| audiencia ve costo/margen | fixtures multi-role + redaction server-side | dato confidencial en capture |
| wallet metaphor falsa | Runway Control Plane + copy ledger | money/token wording |
| mutation engañosa | proposal/preconditions + canonical refresh | UI success sin ledger entry |

- Feature flags: internal-only; client budget manager OFF.
- Rollback: desactivar route/actions, preservar readers/audit.
- Verification: first fold -> states -> mutations -> GVC/a11y -> internal canary.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] UI consume los mismos result/error/audit contracts que SDK/MCP y no contiene business logic de credits.
- [ ] Runway, pools, ledger y forecast declaran freshness/coverage; null/partial nunca se convierte en cero.
- [ ] Commands de alto riesgo usan proposal, confirmación explícita, reason/evidence y focus restore.
- [ ] Roles/audiences reciben actions y redaction correctas; operating mode no concede capabilities.
- [ ] Estado success enlaza ledger entry; undo sólo existe si hay command compensatorio.
- [ ] Desktop/mobile/reduced-motion/keyboard pasan GVC y no hay page overflow a 390 px.
- [ ] External client, public pricing y checkout permanecen policy-blocked.

## Verification

- `pnpm task:lint --task TASK-1483`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- GVC scenario/review/scorecard definidos en los artefactos UI.

## Closing Protocol

- [ ] `UI ready: yes` sólo tras contrato, implementation mapping, GVC, a11y y scorecard aceptados.
- [ ] Registry, README, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- Checkout o pricing externo no entra aquí; `TASK-1484` implementa el backend comercial tras approval.
