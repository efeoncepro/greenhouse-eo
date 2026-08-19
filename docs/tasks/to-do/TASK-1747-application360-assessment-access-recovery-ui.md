# TASK-1747 — Application 360: asignación y recuperación de acceso al test

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1747-application360-assessment-access-recovery.md`
- Flow: `docs/ui/flows/TASK-1747-application360-assessment-access-recovery-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseño listo — foundation API code-complete localmente; rollout y consumer JSX pendientes`
- Rank: `TBD`
- Domain: `hr|ui|delivery`
- Blocked by: `TASK-1745`, `TASK-1746`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-160`

## Summary

Convertir la card de evaluación de Application 360 en un operador honesto: asigna por la policy canónica, muestra el estado real de delivery y permite recuperar acceso por email o enlace temporal sin duplicar tests ni esconder errores.

## Why This Task Exists

La ficha mantiene un botón legacy que intenta asignar un test incluso cuando ya existe una instancia abierta, y el link histórico desaparece al recargar. La UI no consume la policy de TASK-1719 ni la capacidad de recovery; por eso el operador recibe conflictos y no puede ayudar a una candidata que no recibió correo.

## Goal

- Reemplazar la affordance legacy por consumidores de los contracts de TASK-1719 y TASK-1746.
- Hacer comprensible la diferencia entre despacho aceptado, entrega confirmada y fallo/demora.
- Dejar un flujo explícito, accesible y auditable para recuperar acceso sin revelar un enlace salvo que el operador lo elija.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Reglas obligatorias:

- UI is a consumer of policy/recovery commands; it does not construct tokens, infer delivery, or call stores.
- Existing open assessment replaces assignment CTA with recovery actions; no duplicate assignment attempt.
- The secure-link reveal is intentional, one-time and never re-rendered from browser persistence.

## Normative Docs

- `docs/ui/visual-directions/TASK-1747-application360-assessment-access-recovery.md`
- `docs/ui/wireframes/TASK-1747-application360-assessment-access-recovery.md`
- `docs/ui/flows/TASK-1747-application360-assessment-access-recovery-flow.md`
- `docs/tasks/TASK-1719-hiring-opening-assessment-policy-stage-triggered-assignment.md`

## Dependencies & Impact

### Depends on

- TASK-1745 delivery lifecycle DTO and status semantics.
- TASK-1746 recovery command/Product API/capability (code-complete localmente; runtime OFF/unapplied).
- TASK-1719 policy proposal/confirmation endpoint.

### Blocks / Impacts

- Removes the operator dependence on the legacy `/api/hiring/assessments` assignment route.
- Alters the Evaluation tab of `Application360View` only; no new navigation destination or candidate-facing route.

### Files owned

- `src/views/greenhouse/hiring/Application360View.tsx`
- `src/lib/copy/dictionaries/es-CL/hiringDesk.ts` and locale peer
- focused assessment-card components under `src/views/greenhouse/hiring/**` if extracted
- GVC scenario, review scorecard and manuals listed below

## Current Repo State

### Already exists

- Application 360 shows assessment status and uses the legacy direct assignment endpoint.
- TASK-1719 expone policy proposal/confirmation; TASK-1746 ya implementa localmente recovery/availability y su
  Product API, pero schema, grants, flags y smokes siguen pendientes.
- Assessment card, `GreenhouseButton`, `GreenhouseChip`, `Alert`, `Dialog` and `Snackbar` primitives exist.

### Gap

- No coherent state/action model separates no-test, open-test, delivery lifecycle and terminal-test states.
- Current one-time link lives only in local React state and conflicts with server-side token rotation.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/hiring/Application360View.tsx`.
- Future candidate home: `portal`
- Boundary: browser-safe assessment delivery/recovery DTO plus Product API adapters from TASK-1745/1746.
- Server/browser split: React consumes DTOs and actions only; token creation, email, DB and secrets remain server-only.
- Build impact: `none` — reuse existing MUI/Greenhouse primitives.
- Extraction blocker: Application 360 is currently portal-local and session/capability-aware.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Hiring con capability de assignment/recovery.
- Momento del flujo: revisión de la card `Evaluación` de una candidatura existente.
- Resultado perceptible esperado: el operador entiende estado real, sabe cuál acción está disponible y puede recuperar acceso sin crear duplicidad.
- Friccion que debe reducir: conflicto opaco de "Asignar test" y ausencia de una vía para ayudar a la candidata.
- No-goals UX: integrar WhatsApp, alterar el test público, mostrar score o construir una nueva página.

### Surface & system decision

- Surface: card `Evaluación` dentro de Application 360.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — consumer localizado dentro de una card existente.
- Primitive decision: `extend` — assessment card existente con cluster de lifecycle/recovery y `Dialog` de confirmación.
- Adaptive density / The Seam: `aplica` — acciones pasan de inline a apiladas a 390px.
- Floating/Sidecar/Dialog decision: `Dialog` only for deliberate secure-link reveal; no sidecar.
- Copy source: `src/lib/copy/dictionaries/es-CL/hiringDesk.ts`.
- Access impact: `entitlements` — actions render only from server-authorized DTO/capability.

### State inventory

- Default: no test configured / policy assignment available.
- Loading: assessment/lifecycle reader or command pending.
- Empty: policy absent with explicit next action, not fabricated template choice.
- Error: sanitized command/lifecycle failure with retry when actionable.
- Degraded / partial: accepted-for-dispatch or delivery unknown, visibly distinct from delivered.
- Permission denied: read-only card and no recovery controls.
- Long content: provider reason is summarized; technical detail stays out of card.
- Mobile / compact: full-width primary action and non-clipped status/copy at 390px.
- Keyboard / focus: dialog trap, one-time link copy and focus restoration.
- Movimiento: no se agrega comportamiento visual personalizado.

### Interaction contract

- Primary interaction: propose/confirm policy assignment only with no open test; recover access with explicit channel when one is open.
- Hover / focus / active: native button states and visible focus.
- Pending / disabled: one in-flight command, disabled CTA with visible reason.
- Escape / click-away: closes recovery dialog only when no request is pending.
- Focus restore: returns to the initiating recovery button.
- Latency feedback: inline progress plus `aria-live` result.
- Toast / alert behavior: success toast never contains raw URL; actionable error alert remains in card.

### Behavior boundaries

- El diálogo usa el comportamiento nativo del primitive; no se agregan efectos visuales decorativos.
- No hay cambios de layout deliberados ni contadores animados alrededor del despacho del test.

### Implementation mapping

- Route / surface: `Application360View.tsx`, Evaluation tab.
- Primitive / variant / kind: existing assessment card, `GreenhouseChip`, `GreenhouseButton`, `Alert`, `Dialog`, `Snackbar`.
- Component candidates: extract a local `AssessmentAccessRecoveryActions` only if card density requires it.
- Copy source: `hiringDesk` dictionaries.
- Data reader / command: TASK-1719 policy proposal/confirm, TASK-1745 lifecycle reader, TASK-1746 recovery command.
- API parity: Product APIs are thin adapters; no business logic in component.
- Access / capability: server-derived action availability; dedicated recovery capability from TASK-1746.
- States to implement: listed State inventory including status unknown and one-time reveal.

### GVC scenario plan

- Scenario file: `[verificar]` create `assessment-access-recovery` capture scenario during implementation.
- Route: `/agency/hiring/applications/[applicationId]?tab=assessment` using synthetic fixture only.
- Viewports: 1440px and 390px.
- Quality profile: `premium`.
- Required steps: no test, delivery unknown, delivered, recovery email pending/success, secure-link one-time reveal, permission denied and terminal test.
- Required captures: first fold + dialog open + error/degraded states on both viewports.
- Required `data-capture` markers: assessment lifecycle and recovery action cluster.
- Assertions: no raw link after dialog close/reload; correct disabled state; no horizontal overflow.
- Scroll-width checks: `scrollWidth === clientWidth` at both viewports.
- Focus evidence: dialog focus/restore and no custom visual behavior.
- Review dossier: capture directory plus `docs/ui/reviews/TASK-1747-application360-assessment-access-recovery.scorecard.json`.
- Baseline decision / surface ID: selected direction in visual-direction doc.

### Design decision log

- Decision: extend the existing assessment card with a compact lifecycle strip and deliberate recovery actions.
- Alternatives considered: persistent inline link (rejected: unsafe/stale); separate recovery page (rejected: breaks application context); silent resend (rejected: lacks operator intent).
- Why this pattern: keeps the candidate, test state and recovery evidence in one operational surface without a card-within-card layer.
- Reuse / extend / new primitive: extend local card composition; no new global primitive.
- Open risks: validar el DTO real durante integración y no exponer acciones mientras availability/capabilities
  estén OFF; TTL secure-link de 24h ya está aprobada en el ADR.

### Visual verification

- GVC scenario: `assessment-access-recovery`.
- Viewports: 1440px and 390px.
- Required captures: default, degraded, dialog and error.
- Required `data-capture` markers: lifecycle and action cluster.
- Scroll-width check: required both viewports.
- Accessibility/focus checks: required for dialog and disabled explanation.
- Before/after evidence: comparison against current conflict-only card.
- Known visual debt: none accepted; no UI starts until DTO contract is stable.
- Visual scorecard: `docs/ui/reviews/TASK-1747-application360-assessment-access-recovery.scorecard.json`.
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`.

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

### Slice 1 — Card state model and canonical assignment

- Replace legacy assignment interaction with the TASK-1719 policy proposal/confirmation consumer.
- Render no-test/open/terminal states and lifecycle labels from canonical DTOs.

### Slice 2 — Recovery flow

- Add email resend and deliberate secure-link dialog as TASK-1746 consumers.
- Ensure raw link exists only inside the one-time reveal lifecycle and never in toast, URL or local persistence.

### Slice 3 — Quality and operator guidance

- Centralize copy, cover accessibility/degraded/permission/mobile states and capture GVC evidence.
- Update Hiring operator manual after production behavior is verified.

## Detailed Spec

- La card deriva el estado y las acciones disponibles solo de los DTOs canónicos: policy proposal/confirm para asignación, lifecycle delivery para evidencia y recovery command para rescate.
- Sin assessment abierto, se ofrece la asignación por policy; con assessment elegible, se reemplaza el intento duplicado por `Recuperar acceso`; en estados terminales solo se muestra evidencia.
- El canal email confirma únicamente que se inició el despacho. El canal enlace temporal abre un diálogo con confirmación, copia única accesible y eliminación del valor del estado React al cerrar, cambiar de ruta o recargar.
- La UI no arma URLs, no guarda tokens en local/session storage ni llama al endpoint legacy de asignación. Todo copy, error y explicación de permiso vive en el diccionario de Hiring.
- Las acciones se deshabilitan durante una solicitud, preservan foco y expresan errores sanitizados con `aria-live`; los estados de entrega no infieren recepción en la bandeja.

## Out of Scope

- New navigation or a candidate-facing assessment screen.
- Any direct integration with WhatsApp.
- Backend commands, tokens, entitlements, provider state mapping or policy configuration.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1745 and TASK-1746 contracts MUST stabilize before JSX integration.
- Slice 1 → Slice 2 → Slice 3; the legacy UI call is removed only when canonical assignment is usable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI reveals stale raw link | UI/security | medium | one-time DTO state only + reload test | capture/test assertion |
| Operator mistakes accepted for delivered | UI/ops | medium | explicit status labels and degraded state | operator feedback/recovery rate |
| Mobile action clipping | UI | low | GVC 390px + scroll-width gate | GVC dossier |

### Feature flags / cutover

No UI-only flag. Render new actions only from server authorization and feature availability supplied by TASK-1745/1746; rollback is reverting the UI consumer while retaining the domain command.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert portal consumer after canonical assignment smoke | <5 min | sí |
| 2 | remove recovery affordance; command capability remains controlled | <5 min | sí |
| 3 | revert copy/UI-only files | <5 min | sí |

### Production verification sequence

1. Direction/wireframe/flow readiness before JSX.
2. Local and staging GVC with synthetic application only.
3. Authorized production smoke on one non-sensitive test instance.
4. Observe recovery UX and delivery state for seven days.

### Out-of-band coordination required

Hiring operator training and Privacy/Security approval already required by TASK-1746.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Assessment assignment uses the TASK-1719 policy contract; no Application 360 action calls the legacy direct assignment route.
- [ ] An open assessment exposes recovery rather than a duplicate-assignment CTA; terminal states are read-only and honest.
- [ ] Delivery labels distinguish accepted, delivered, delayed/failure/bounce and unknown; no visual claim infers inbox delivery.
- [ ] Secure-link reveal is explicit, one-time, accessible and absent after close/reload; email recovery never exposes the URL.
- [ ] `UI ready` remains `no` until mapping/GVC/decision artifacts are complete; when `yes`, focused readiness checks pass.
- [ ] Wireframe and flow contracts exist and their focused gates pass.
- [ ] Copy, loading/error/degraded/permission/mobile/focus states are covered.
- [ ] GVC premium captures desktop and 390px with zero page horizontal overflow.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- focused UI/API contract tests
- `pnpm ui:wireframe-check --task TASK-1747`
- `pnpm ui:flow-check --task TASK-1747`
- GVC desktop/mobile plus keyboard/focus checks

## Closing Protocol

- [ ] Lifecycle, registry and README are synchronized.
- [ ] Operator manual and copy dictionaries reflect actual runtime behavior.
- [ ] GVC dossier/scorecard and accessibility evidence are linked.
- [ ] Handoff/changelog and docs gates reflect deployment evidence.

## Follow-ups

- Consider authenticated candidate self-service recovery when candidate accounts are operational.
