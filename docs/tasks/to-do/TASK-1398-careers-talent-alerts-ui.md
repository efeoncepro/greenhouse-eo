# TASK-1398 — Careers Talent Alerts UI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1398-careers-talent-alerts.md`
- Flow: `docs/ui/flows/TASK-1398-careers-talent-alerts-flow.md`
- Motion: `docs/ui/motion/TASK-1398-careers-talent-alerts-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency|hr|growth|ui`
- Blocked by: `TASK-1397`
- Branch: `task/TASK-1398-careers-talent-alerts-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa la banda N4 de Careers para **Career Alerts**, utilizando la instancia publicada de Growth Forms creada por TASK-1397. Permite que una persona que hoy no ve una vacante adecuada se suscriba de manera consentida a alertas reales, sin convertirse en candidato ni postulación.

La UI es un host delgado de `<greenhouse-form>`: no guarda PII localmente ni crea inputs, endpoint o flujo de email propio.

## Why This Task Exists

La UI prototipo de Careers ya muestra el concepto de “Banco de talento”, pero hoy no existe una superficie implementada ni conectada a un contrato real. Sin un consumer de UI, TASK-1397 tendría delivery listo pero no un punto público gobernado donde una persona pueda suscribirse.

## Goal

- Ofrecer Career Alerts como una banda clara y accesible al final de Careers y como siguiente paso de la empty state de vacantes.
- Renderizar la misma instancia de Growth Form publicada, con sus estados reales de validación, pending, éxito, error y consentimiento.
- Mantener el flujo público responsive, tokenizado, bilingüe y sin duplicar el formulario ni exponer información de suscripción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/tasks/to-do/TASK-1397-careers-talent-alerts-foundation.md`

Reglas obligatorias:

- Reusar el renderer `<greenhouse-form>` y el `formKey` publicado por TASK-1397; no custom form, submit, local PII store ni endpoint Careers.
- La banda promete alertas, no revisión de candidatura, matching, entrevistas ni respuesta de reclutamiento.
- Todo copy visible nace/queda en la capa canónica de microcopy; tono es-CL/en-US respetuoso. El copy coloquial obsoleto del prototipo no se reutiliza.
- Tokens, wrappers y componentes existentes primero; no valores Figma/HEX/spacing hardcodeados ni primitive paralela.
- El host evita overflow de página; se mide `scrollWidth === clientWidth` a 1440 y 390px.
- `UI ready` permanece `no` hasta que TASK-1397 entregue forma/flag reales, el mapping se verifique y los gates de UI pasen sin findings.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/ui/wireframes/TASK-1398-careers-talent-alerts.md`
- `docs/ui/flows/TASK-1398-careers-talent-alerts-flow.md`
- `docs/ui/motion/TASK-1398-careers-talent-alerts-motion.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`

## Dependencies & Impact

### Depends on

- TASK-1397 published Career Alerts form contract, public surface, consent policy and availability flag.
- Public Careers route/components under `src/app/public/careers/**`.
- Existing Growth Forms renderer and public client integration.

### Blocks / Impacts

- Completes the visible N4 Career Alerts node in the EPIC-011 Careers flow.
- Affects the public Careers page and its no-vacancies state only.
- Does not alter the existing application form or internal Hiring Desk.

### Files owned

- `src/app/public/careers/**`
- `src/components/greenhouse/hiring/**` only for a small, page-scoped host if reuse from the route is not appropriate.
- `src/lib/copy/**` for canonical Careers alert host copy.
- `scripts/frontend/scenarios/careers-talent-alerts.scenario.ts`
- `docs/ui/wireframes/TASK-1398-careers-talent-alerts.md`
- `docs/ui/flows/TASK-1398-careers-talent-alerts-flow.md`
- `docs/ui/motion/TASK-1398-careers-talent-alerts-motion.md`

## Current Repo State

### Already exists

- Public Careers routes and the existing vacancy/application journey.
- Portable Growth Forms renderer with owned validation, anti-abuse and submit states.
- Local prototype in the Careers reference folder, including the intended N4 hierarchy.
- Canonical UI platform primitives and the GVC capture workflow.

### Gap

- The Careers page has no real Career Alerts host or no-vacancies conversion next step.
- No scenario/documented behavior connects visible availability with the TASK-1397 form/flag contract.
- The prototype has visual intent only and must not become a local client-side form.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/app/public/careers/**` consuming the portable Growth Form renderer.
- Future candidate home: `remain-shared`
- Boundary: the Careers section consumes the published Growth Form render/submit contract and owns only page placement and availability presentation.
- Server/browser split: server resolves page/form availability; browser mounts the approved generic renderer and owns no PII persistence.
- Build impact: `none`
- Extraction blocker: public Careers and renderer share the current Next.js surface; no new deployable/package is authorized.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante público, potencial talento que no ve una vacante adecuada hoy.
- Momento del flujo: final de la exploración de Careers o empty state de vacantes.
- Resultado perceptible esperado: entender qué recibirá, consentir con confianza y recibir una confirmación que no revela datos previos.
- Fricción que debe reducir: salir de Careers sin una siguiente acción real cuando no hay una vacante adecuada.
- No-goals UX: transformar al visitante en candidato, hacer matching o prometer contacto de recruiting.

### Surface & system decision

- Surface: banda N4 integrada en Careers; alternativa de presentación única desde la empty state de vacantes.
- Composition Shell: evaluado y no aplica: es un bloque embebido de una página pública, sin regiones persistentes. No se crea un layout paralelo.
- Primitive decision: `reuse` — `<greenhouse-form>` y componentes/tokens de página existentes.
- Adaptive density / The Seam: aplica al host/contenedor; campos y CTA obedecen el renderer y se apilan honradamente en compact.
- Floating/Sidecar/Dialog decision: ninguno; no introducir overlay para consentimiento o submit.
- Copy source: microcopy canónica Careers/Growth; la nomenclatura no vive en JSX.
- Access impact: pública, sin autenticación; las restricciones de forma/origen son las del contrato de TASK-1397.

### State inventory

- Default: promesa de alertas, formulario publicado y nota visible de desuscripción.
- Loading: placeholder no interactivo mientras se resuelve el contrato/form.
- Validation: renderer marca campo, texto y foco accesibles.
- Submitting: CTA con pending state canónico; no duplicar submits.
- Accepted: resultado genérico que no confirma ni niega una suscripción previa.
- Error: mensaje recuperable, sin detalles del proveedor ni PII.
- Flag off / unavailable: la banda no muestra CTA muerto; el visitante sigue explorando Careers.
- Empty vacancies: una sola instancia de la banda como siguiente paso; nunca dos formularios iguales en la misma vista.
- Mobile / compact: campos/consentimiento/CTA apilados, sin overflow a 390px.
- Keyboard / focus: labels, orden de tab, primer error y estados anunciados por el renderer.
- Reduced motion: estado inmediato y comprensible; motion no requerida para entender submit/resultado.

### Interaction contract

- Primary interaction: leer promesa -> completar formulario publicado -> consentir -> submit -> confirmation/recovery.
- Pending / disabled: el renderer previene doble submit; el host no agrega otro bloqueo ni lógica de negocio.
- Escape / click-away: no aplica (sin overlay).
- Focus restore: renderer conserva/dirige foco por validation/success; host no roba foco en scroll/reveal.
- Latency feedback: pending visible y una sola acción primaria.
- Toast / alert behavior: renderer canonical; no toast Careers duplicado.

### Motion & microinteractions

- Motion primitive: renderer/CSS tokenizado existente; no introducir una primitive de motion nueva.
- Enter / exit: reveal de página solo si ya existe el patrón; éxito/error puede cambiar con transición corta no bloqueante.
- Reduced-motion fallback: cambio instantáneo.
- Non-goal motion: sin confetti, urgencia, contadores ni loaders decorativos.

### Implementation mapping

- Route / surface: `src/app/public/careers/**`.
- Primitive / variant / kind: `<greenhouse-form>` con la instancia `subscribe` de TASK-1397.
- Component candidates: una sección/page-scoped `CareersTalentAlerts` solo si el route actual no puede expresar el host con claridad; no registry primitive.
- Copy source: `src/lib/copy/**` según el dictionary existente/extendido durante Discovery.
- Data reader / command: render and public submit contract from Growth Forms; no new UI-owned reader/command.
- API parity: no UI-only write; submit delegates to the public governed form endpoint from TASK-1397.
- Access / capability: surface pública, governed by form origin/anti-abuse/consent contract.
- States to implement: los del State inventory y los del renderer sin fork visual.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/careers-talent-alerts.scenario.ts`.
- Route: final public Careers route confirmed in Discovery.
- Viewports: 1440 and 390.
- Required steps: loaded band -> keyboard field/consent -> validation -> pending -> generic accepted -> empty-vacancies placement -> unavailable flag/form.
- Required captures: default, validation, accepted, empty/alert next-step, unavailable and reduced-motion.
- Required `data-capture` markers: `careers-talent-alerts`, `careers-empty-alerts`.
- Assertions: `scrollWidth==clientWidth`, no console errors, focus/label semantics, no duplicate form and generic accepted wording.
- Reduced-motion / focus evidence: capture both and record in review dossier.

### Design decision log

- Decision: use one governed renderer host instead of a Careers-native form.
- Alternatives considered: a local “talent pool” form (rejected: breaks consent/anti-abuse/API parity); an application form fallback (rejected: changes the visitor’s intent).
- Why this pattern: one public PII ingress and one subscription/delivery contract, while preserving the visual hierarchy from the approved prototype.
- Reuse / extend / new primitive: reuse Growth Form renderer; extend Careers only with a page-scoped host section; no new primitive.
- Open risks: final form key/field configuration and availability state are hard dependencies of TASK-1397; keep UI ready `no` until verified.

### Visual verification

- GVC desktop and mobile in loop until the page is enterprise-ready; inspect frames, console, focus, reduced motion and page scroll width.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Copy and governed host

- Confirm TASK-1397 form contract and create/register canonical host copy.
- Add the N4 band to the public Careers composition with renderer reuse and no local form semantics.

### Slice 2 — Empty state and responsive behavior

- Present the same single host from the vacancy-list empty state without a duplicate mount.
- Implement loading/unavailable behavior, responsive stacking, keyboard and overflow controls.

### Slice 3 — Visual verification

- Add the declarative GVC scenario and capture default, validation, success, unavailable, empty and reduced-motion evidence at 1440/390.

## Out of Scope

- Form definition, consent persistence, subscription mutation, email delivery, unsubscribe, event consumer or feature flag design (TASK-1397).
- Careers application migration (TASK-1372/TASK-1373).
- Internal searchable Talent Pool, matching, recruiter workflows or candidate creation.
- New generic form/card/layout primitive.

## Detailed Spec

The external Careers UI is a visual reference, not a functional implementation. The outcome is a small, trustworthy public band with a genuine `<greenhouse-form>` as its sole data capture mechanism. It may only render after TASK-1397 has a published, availability-governed form contract; it must never simulate success or persist an email client-side.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1397 contract and flag verification -> Slice 1 -> Slice 2 -> Slice 3.
- The UI must not be released with a fake form, a stale form key or a host that remains visible when the underlying capability is disabled.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Visible form cannot submit | public UI/Growth Forms | medium | Consume published form contract; test accepted and unavailable states | GVC/runtime submit evidence |
| Duplicate PII capture/form | public UI | low | One renderer instance and no local inputs/endpoints | GVC marker/count assertion |
| Mobile horizontal overflow | UI | medium | Container-safe host, 390px measurement | `scrollWidth==clientWidth` capture assertion |
| Misleading subscription outcome | privacy/UX | low | Generic canonical accepted wording | copy and accessibility review |

### Feature flags / cutover

- TASK-1398 consumes `CAREERS_TALENT_ALERTS_ENABLED` and published-form availability from TASK-1397; it introduces no independent UI flag.
- Cutover: render only after staging form contract is verified; validate public Careers desktop/mobile; enable underlying capability according to TASK-1397 rollout.
- Revert: flag/form unavailability removes the host safely; no client data migration or UI-specific rollback is needed.

### Rollback plan per slice

- Slice 1: revert only the Careers host section; form/subscription data remains under TASK-1397.
- Slice 2: restore the prior empty state while retaining the existing Careers browsing path.
- Slice 3: scenario/docs rollback is not runtime-affecting.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Careers contains one accessible Career Alerts band backed by the published TASK-1397 Growth Form.
- [ ] Vacancy-list empty state directs to the same band without mounting a second form.
- [ ] Validation, pending, generic accepted, error and unavailable states are visible and accessible.
- [ ] No PII is persisted or submitted by Careers UI code outside the generic renderer.
- [ ] Public page has no horizontal overflow at 1440 and 390px and reduced motion remains understandable.
- [ ] GVC evidence covers all required states, keyboard/focus and console cleanliness.

## Verification

- [ ] `pnpm task:lint --task TASK-1398`
- [ ] `pnpm ui:wireframe-check --task TASK-1398`
- [ ] `pnpm ui:flow-check --task TASK-1398`
- [ ] `pnpm ui:motion-check --task TASK-1398`
- [ ] `pnpm ui:readiness-check --task TASK-1398`
- [ ] `pnpm fe:capture careers-talent-alerts --env=staging` with required GVC evidence at implementation time.
- [ ] `pnpm ops:lint --changed`

## Closing Protocol

- [ ] Lifecycle and folder reflect the actual state; retain `code complete, rollout pending` if the public foundation flag remains OFF.
- [ ] Task index, handoff, changelog and UI docs record the delivered form key/surface and GVC evidence.
- [ ] GVC review dossier confirms normal/reduced-motion, keyboard/focus and desktop/390px scroll-width results.
- [ ] Run `pnpm qa:gates --changed --agent codex` and `pnpm docs:closure-check` before final closure.

## Definition of Done

- [ ] The renderer host is complete, verified and documented; all visible reusable copy is canonical.
- [ ] GVC dossier is reviewed and records normal/reduced motion, focus and 390px no-overflow evidence.
- [ ] Task remains `code complete, rollout pending` if TASK-1397’s public flag or production form is not yet enabled.
- [ ] Lifecycle, docs, handoff and task indexes are synchronized at closure.

## Follow-ups

- Talent matching/search/segmentation or recruiter-owned pools need their own People/Hiring design and policy task.
