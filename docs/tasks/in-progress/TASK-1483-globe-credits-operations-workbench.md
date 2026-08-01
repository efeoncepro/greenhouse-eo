# TASK-1483 — Globe Credits Operations Workbench

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
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
- Status real: `Happy path y recovery desplegados; fondeo live completado, QA visual final todavía en curso`
- Rank: `next.5`
- Domain: `finance|creative|ui|operations`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
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
- Los contratos locales requeridos para implementar y probar el first fold ya están disponibles. La aceptación
  runtime sigue condicionada a aplicar migraciones, seed OAuth y deploy de esas tasks; no bloquea fixtures ni JSX.

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

### Checkpoint 2026-08-01 — first fold local

- Implementada la ruta canónica `/admin/globe/credits` sobre `SurfaceRecipe operationalWorkbench` con
  `WorkbenchHeader`, `SignalStrip` y `OperationalSection`.
- La página aplica `administracion.globe_credits` + `platform.globe_credit_funding.read`, resuelve el workspace
  autorizado y consume `CreditCapacityStatusV1` y `CreditFundingOperationV1` server-side.
- El browser sólo formatea y presenta valores autoritativos: no deriva saldo, cap, funding, policy ni forecast.
  Un fallo parcial conserva `unknown/degraded`; nunca normaliza ausencia a cero.
- El inventario de operaciones y el detail canvas preservan `operationId`, plan, pool, receipt y vencimiento.
- El CTA se renderiza deshabilitado: el first fold no finge una mutación hasta conectar un carril one-shot de
  navegador con identidad y readback terminal. API/CLI/agente permanecen bajo TASK-1629.
- Verificación local pasada: ESLint focal, `pnpm typecheck` y `git diff --check`.
- Pendiente en ese corte inicial: evidencia responsive, teclado/reduced motion, revisión visual, drawer y
  ejecución/recuperación gobernadas. El checkpoint siguiente actualiza la evidencia ya completada.

### Checkpoint 2026-08-01 — ACCEPT FIRST FOLD

- Fixture y scenario premium implementados. La captura local se ejecutó con la sesión Chrome anclada a
  `jreyes@efeonce.cl`, sin exportar cookies/storage state: `.captures/2026-08-01_globe-credits-operations-workbench-chrome/`.
- Desktop solicitado 1440×1000: `clientWidth=1425`, `scrollWidth=1425`. Mobile solicitado 390×844 con menú
  normalizado: `clientWidth=375`, `scrollWidth=375`.
- La primera captura mobile fue `REVISE` por drawer lateral persistido abierto. El scenario ahora envía `Escape`
  antes de medir; el resultado usa el drawer temporal canónico de `CompositionShell masterDetail`.
- Selección mobile verificada: `op-jul-readback-002` dejó `aria-pressed=true` y el drawer mostró grant `0` +
  receipt `no_effect`, sin crear estado económico local.
- Veredicto y evidencia: `docs/ui/reviews/TASK-1483-globe-credits-operations-workbench-first-fold-review-2026-08-01.md`.
- `UI ready` permanece `no`: falta cablear la mutación/recovery y ejecutar los gates premium finales.

### Checkpoint 2026-08-01 — fondeo humano one-shot conectado

- El CTA `Asegurar capacidad` se habilita únicamente con proyección confiable y ambos entitlements:
  `platform.globe_credit_funding.authority.issue` + `platform.globe_credit_funding.ensure`.
- El drawer autoriza límites exactos de objetivo, grant y cap para el período devuelto por Globe. El browser no
  calcula el plan económico: sólo entrega techos y el primitive server-side vuelve a leer, propone, confirma y
  obtiene el receipt canónico.
- La ruta `POST /api/admin/globe/credits/funding/ensure` exige sesión humana real, payload cerrado, workspace
  binding e idempotency key; liga issuer=executor al mismo usuario, canal `browser`, client `greenhouse-portal`
  y attestation exacta. No fabrica un token OAuth ni crea otro ledger.
- La clave de operación permanece estable ante timeout/reintento del mismo intento. `completed|no_effect` son los
  únicos éxitos; `outcome_unknown` conserva la operación para readback/reconcile y nunca induce un fondeo nuevo.
- La respuesta al navegador omite la referencia interna de attestation y expone sólo autoridad resumida +
  resultado. Pasan typecheck, ESLint focal y 38 tests de route/authority/executor/API parity.
- Recovery explícito conectado: una operación `outcome_unknown` ofrece `Verificar y reconciliar`, llama al command
  canónico con idempotency key estable y refresca la proyección; nunca repite el fondeo.
- Validación manual con Chrome autenticado a 390×844: diálogo visible, tres spinbuttons y confirmación accesibles,
  `target > maxCap` deshabilita el submit, `clientWidth=scrollWidth=390`; `op-jul-recovery-001` queda seleccionado
  con `aria-pressed=true` y el detalle expone recovery habilitado. Cero errores de consola. No se ejecutó una
  mutación real desde el fixture.
- Pendiente: suite premium automatizada desktop/mobile/teclado/reduced-motion, scorecard y smoke staging posterior
  a migración/deploy.

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
