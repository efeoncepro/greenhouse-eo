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
- Status real: `Dirección preservada; surface reubicada en Greenhouse y bloqueada por snapshot/read-recovery plane`
- Rank: `next.5`
- Domain: `finance|creative|ui|operations`
- Blocked by: `TASK-1468, TASK-1482, TASK-1586, TASK-1629`
- Branch: `task/TASK-1483-globe-credits-operations-workbench`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear `/admin/globe/credits` en Greenhouse como control plane visual internal-first para capacidad efectiva,
ciclos de fondeo, operaciones/recovery, pools, grants, budgets, ledger y reconciliación, consumiendo
exclusivamente status/commands canónicos.

## Why This Task Exists

ADR-015 fija Greenhouse como superficie administrativa y Globe como autoridad. La ubicación histórica
`/studio/credits` contradice esa frontera y mezclaría operación financiera con Producer/Workbench creativo.

## Goal

Dar a operadores internos una experiencia premium, auditable y recuperable sin representar Studio Credits como
dinero/token ni calcular business logic en browser. Las personas objetivo no conceden acceso por sí mismas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/README.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1468` ledger/expiry, `TASK-1482` snapshot/cycle, `TASK-1586` status/recovery y `TASK-1629`
  identity/operation adapters.

### Blocks / Impacts

- Evidencia necesaria para `TASK-1480` si el go incluye client-operated/budget manager externo.
- No depende de `TASK-1474`; Producer/Workbench creativo sólo conserva contexto/deep link read-only.

### Files owned

- `src/app/(dashboard)/admin/globe/credits/**`
- `src/views/greenhouse/admin/globe/credits/**`
- copy reutilizable bajo `src/lib/copy/**`
- scenario GVC y reviews de `TASK-1483` en Greenhouse.

El snapshot de dominio pertenece a TASK-1482; lifecycle/receipts y DTOs browser-safe
`CreditCapacityStatusV1|CreditFundingOperationV1` pertenecen a TASK-1586. TASK-1483 sólo consume esos contratos.

## Current Repo State

### Already exists

- Greenhouse ya tiene shell `/admin`, CompositionShell, WorkbenchHeader, InventoryList/SelectionRow,
  AdaptiveSidecarLayout, ContextualSidecar, OperationalSection, SignalStrip y Dialog.
- La dirección visual Runway Control Plane, wireframe, flow y motion de TASK-1483 ya existen y se preservan.

### Gap

- Falta mapear la dirección visual a primitives Greenhouse y consumir los DTOs corregidos de TASK-1586.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse portal bajo src/app/(dashboard)/admin/globe/credits/**`
- Future candidate home: `portal`
- Boundary: `thin client de CreditCapacityStatusV1 y CreditFundingOperationV1; Globe sigue como autoridad`
- Server/browser split: `browser sólo renderiza DTOs y envía commands; policy/forecast/impact server-side`
- Build impact: `none; portal y primitives existentes`
- Extraction blocker: `sesión/entitlements Greenhouse y broker cross-runtime hacia Globe`

## UI/UX Contract

- Visual direction: `docs/ui/visual-directions/TASK-1483-globe-credits-operations-workbench-direction.md`
- Wireframe: `docs/ui/wireframes/TASK-1483-globe-credits-operations-workbench.md`
- Flow: `docs/ui/flows/TASK-1483-globe-credits-operations-workbench-flow.md`
- Motion: `docs/ui/motion/TASK-1483-globe-credits-operations-workbench-motion.md`
- Selected direction: `Runway Control Plane`.
- Surface architecture: `Runway Control Plane en Greenhouse con CompositionShell operationalWorkbench,
  inventory/list-detail, risk strip y sidecar de operación/recovery`.
- Primitive decision: `reuse CompositionShell, WorkbenchHeader, SignalStrip, OperationalSection, InventoryList,
  SelectionRow, AdaptiveSidecarLayout, ContextualSidecar, ContextCommandBar y Dialog; runway es composición local`.
- Full API parity: `thin client de TASK-1586/TASK-1629; cero balance/rate/forecast/auth/margin local`.
- Copy/access: `copy centralizada; estados honestos por audience/capability; external client policy-blocked`.
- Accessibility: `WCAG AA, keyboard, focus restore, text alternative del runway, reduced motion, 390 px sin overflow`.
- Visual evidence: scenario `globe-credits-operations-workbench`, desktop 1440×1000 y mobile 390×844;
  baseline `greenhouse.admin.globe-credits-operations-workbench` sólo tras first-fold acceptance.

## Backend/Data Contract

No aplica: `TASK-1483` no crea schema, migrations, commands ni readers. Consume los DTOs browser-safe que debe
entregar TASK-1586 sobre el snapshot de TASK-1482; hoy aún son una dependencia target, no un contrato live.
Cualquier brecha backend vuelve a la task owner y no se resuelve con endpoint o cálculo ad hoc en UI.

### Access contract actual

- El runtime vigente concede `propose|confirm` únicamente a `ROLE_CODES.EFEONCE_ADMIN`; TASK-1483 no amplía roles.
- Cada control se renderiza desde capabilities/entitlements devueltos server-side. El browser no deriva autoridad
  desde un role label, persona, operating mode ni `actor_auth_mode`.
- Pause/resume, grants, limits, corrections o reconcile sólo aparecen cuando el command gobernado y el
  entitlement específico existen; esta task frontend-only no los promete ni los crea.

### Personas objetivo — no son access contracts

- Credit Operator: lectura y propuesta cuando el backend concede la capability; sin vendor cost/margin.
- Budget owner/approver: runway/holds y confirmación sólo cuando existe entitlement específico.
- CEO owner-operated: una confirmación manual o instrucción a agente puede completar la operación sin segundo
  humano cuando `requireSecondConfirmer` está OFF.
- Agente autenticado: preview/propose/confirm/readback sólo bajo instrucción/delegación server-side; no puede
  editar su propia autoridad.
- Finance Ops: proyección interna restringida y futuros commands explícitamente gateados.
- Creative/project lead: usage/forecast/deep links read-only.
- Auditor: ledger/audit/evidence read-only.
- Client budget manager/viewer futuro: proyección redactada, `policy-blocked` hasta gate externo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Shell, runway and states

- Implementar header con workspace/período/freshness/audience y plano dominante
  effective available/monthly cap-spent-held/funding/ledger histórico.
- Implementar empty, healthy, low/exhausted, paused, expiring, stale/partial, denied/redacted,
  `selection_required`, `second_actor_required` y error.

### Slice 2 — Pools, ledger and governed actions

- Navegador de pools/sub-budgets, risk rail, ledger filtrable y detail sidecar.
- Drawer `Asegurar capacidad del período` con status → preview → propose → confirm → readback; otras acciones sólo
  aparecen cuando su command y entitlement existen.
- Bandeja de operaciones para pending/confirming/confirm_failed/completed/expired/outcome_unknown/reconciled,
  fingerprint mismatch y timeout recovered/unknown, con recovery seguro.
- Mostrar impact/preconditions/fingerprint server-side, refrescar readers y enlazar ledger/run/audit.

### Slice 3 — Reliability and visual acceptance

- Anomaly/reconciliation evidence con recovery sólo cuando exista command gobernado.
- GVC desktop/mobile, keyboard, reduced motion, redaction, focus restore y premium scorecard.

## Out of Scope

- Brief/candidates/review/release (`TASK-1474`).
- Cálculo de balance, rates, forecast, auth, expiry o adjustment impact en browser.
- UI pública, checkout, pricing, payment o habilitación externa.
- Implementar administración dentro de Globe Producer o importar primitives Greenhouse en Globe.

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
- Verification: first fold -> fixtures deterministas de estados/mutaciones -> GVC/a11y -> canary live con la
  sesión Chrome autenticada indicada por el operador.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] UI consume los mismos result/error/audit contracts que API/SDK y no contiene business logic de credits;
  MCP/Nexa son adapters futuros no bloqueantes.
- [ ] Runway, pools, ledger y forecast declaran freshness/coverage; null/partial nunca se convierte en cero.
- [ ] Commands de alto riesgo usan proposal, confirmación explícita, reason/evidence y focus restore.
- [ ] Roles/audiences reciben actions y redaction correctas; operating mode no concede capabilities.
- [ ] Estado success enlaza ledger entry; undo sólo existe si hay command compensatorio.
- [ ] Desktop/mobile/reduced-motion/keyboard pasan GVC y no hay page overflow a 390 px.
- [ ] External client, public pricing y checkout permanecen policy-blocked.
- [ ] La ruta canónica es `/admin/globe/credits`; no existe CTA de fondeo dentro de Globe Producer.
- [ ] El first fold distingue `effectiveAvailable`, funding vigente, cap/spent/held y ledger histórico.
- [ ] El drawer permite confirmación humana o agente y sólo muestra éxito tras readback terminal.
- [ ] `outcome_unknown` ofrece verificar/reconciliar y nunca retry ciego.
- [ ] `selection_required`, `second_actor_required`, `confirming`, `confirm_failed`, `completed`, `reconciled`,
  fingerprint mismatch y timeout recovered/unknown tienen estados y acciones explícitos.

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

## Delta 2026-08-01 — reubicación Greenhouse por ADR-015/TASK-1630

Se preserva la dirección `Runway Control Plane`, pero se supersede su placement original. La administración vive
en Greenhouse `/admin/globe/credits` y reusa la plataforma UI Greenhouse; Globe Producer sólo conserva el
self-view de TASK-1628. TASK-1485 deja de ser dependencia de esta surface porque gobierna el payload UI de Globe,
no el portal Greenhouse.
