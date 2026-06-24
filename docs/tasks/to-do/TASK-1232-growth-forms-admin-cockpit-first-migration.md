# TASK-1232 — Growth Forms Admin Cockpit + First Migration

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|hubspot|ui|api`
- Blocked by: `TASK-1229, TASK-1230, TASK-1231`
- Branch: `task/TASK-1232-growth-forms-admin-cockpit-first-migration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el primer Growth Forms admin cockpit que consume solo Product APIs/commands/readers y migrar el primer formulario real (AI Visibility intake o un lead magnet) hacia el motor, con WordPress como host surface inicial y evidencia de atribucion/delivery. Esta task valida el loop completo sin crear un builder visual completo.

## Why This Task Exists

La foundation, HubSpot adapter y renderer no prueban valor por si solos. Se necesita una superficie operativa para author/review/publish/submissions/destinations/surfaces y un primer form real que cierre el loop Growth -> public host -> Greenhouse submit -> HubSpot/ledger. Al compactar en una task, se acepta una task hibrida controlada porque todo backend reusable debe venir de TASK-1229/1230 y esta UI actua como cliente.

## Goal

- Crear admin cockpit minimo para operar forms sin SQL/manual portal work.
- Consumir solo Product APIs/commands/readers de TASK-1229/1230.
- Publicar/migrar un primer form real en WordPress usando renderer de TASK-1231.
- Verificar submission, consent snapshot, destination attempt, HubSpot/test delivery and attribution.
- Documentar rollout, rollback and Astro parity posture.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`

Reglas obligatorias:

- Admin cockpit es cliente de Product APIs; no escribe DB directo.
- Nexa/MCP/CLI path plan queda preservado por commands/readers; UI no crea logica paralela.
- No hay visual builder completo en V1.
- Primer migration debe tener rollback claro: desactivar embed/surface/destination y volver al form anterior si aplica.
- Si el primer form es AI Visibility, no debe disparar reportes o provider runs fuera de policy aprobada.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `.codex/skills/greenhouse-product-ui-architect/SKILL.md`
- `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1229` backend/API parity foundation.
- `TASK-1230` HubSpot secure-submit adapter.
- `TASK-1231` portable renderer + WordPress host surface.
- Selection of first real form: AI Visibility intake or one lead magnet.

### Blocks / Impacts

- Real public-form rollout program.
- Astro migration parity for future public site.
- Nexa/MCP operation of Growth forms.

### Files owned

- `src/app/(dashboard)/admin/growth/forms/**` or actual admin route path selected during discovery
- `src/views/greenhouse/growth/forms/**`
- `src/lib/copy/growth-forms.ts` if copy is reusable
- public-site WordPress runtime wrapper/config `[verificar]`
- `scripts/frontend/scenarios/**`
- `docs/tasks/to-do/TASK-1232-growth-forms-admin-cockpit-first-migration.md`

## Current Repo State

### Already exists

- Architecture docs and planned foundations from TASK-1229/1230/1231.
- Greenhouse UI primitives and Composition Shell patterns.
- Public-site WordPress runtime exists as current live host.

### Gap

- No operator cockpit exists for Growth Forms.
- No real public form has been migrated to the engine.
- No end-to-end evidence exists from public host -> Greenhouse ledger -> HubSpot destination.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: Growth/Marketing Operations operator, platform admin, future Nexa operator.
- Momento del flujo: author/review/publish a form, inspect submissions/destination attempts, migrate first public form.
- Resultado perceptible esperado: compact cockpit for forms with clear lifecycle, surfaces, destinations and delivery health.
- Friccion que debe reducir: no portal hopping, no SQL/manual config, no HubSpot embed styling constraints.
- No-goals UX: drag-and-drop builder, advanced analytics dashboard, full automation of quote/deal creation.

### Surface & system decision

- Surface: `/admin/growth/forms` or route selected during discovery.
- Composition Shell: `aplica` — cockpit with primary list/detail and contextual inspector.
- Primitive decision: `reuse` — CompositionShell, GreenhouseBreadcrumbs, tables/cards/chips/buttons/sidecar as existing primitives; new primitive only if repeated platform need emerges.
- Adaptive density / The Seam: `aplica` for form cards/rows and submission/destination summaries.
- Floating/Sidecar/Dialog decision: sidecar for form/submission/destination detail; dialog only for destructive/deprecate confirmation.
- Copy source: `src/lib/copy/*` for reusable labels/states; local one-off only for fixture form copy.
- Access impact: `entitlements`/capabilities `growth.forms.*`.

### State inventory

- Default: forms list + selected detail.
- Loading: readers pending.
- Empty: no forms yet with CTA/create guidance.
- Error: canonical error display.
- Degraded / partial: destination unavailable, stale renderer, HubSpot failed.
- Permission denied: no growth forms capability.
- Long content: field schema, submissions and attempts.
- Mobile / compact: usable read/admin view; complex authoring may degrade to review-only if justified.
- Keyboard / focus: table/list, sidecar, forms controls.
- Reduced motion: no blocking animation.

### Interaction contract

- Primary interaction: create/review/publish/deprecate form; inspect submissions; retry/dead-letter attempts; launch first migration smoke.
- Hover / focus / active: tokenized.
- Pending / disabled: publish/retry/submit pending states.
- Escape / click-away: sidecar/dialog behavior per primitive.
- Focus restore: from sidecar/dialog back to originating row/action.
- Latency feedback: skeletons/pending buttons/inline delivery state.
- Toast / alert behavior: success/failure via canonical alert/toast pattern.

### Motion & microinteractions

- Motion primitive: `framer layout|CSS` via primitives.
- Enter / exit: sidecar/list transitions.
- Layout morph: Composition Shell rich default.
- Stagger: minimal if existing primitive provides it.
- Timing / easing token: Greenhouse motion tokens.
- Reduced-motion fallback: built-in primitive fallback.
- Non-goal motion: decorative animations.

### Visual verification

- GVC scenario: `growth-forms-admin-cockpit`.
- Viewports: desktop and mobile 390px.
- Required captures: empty, list/detail, publish review, submission detail, destination failure/retry, first migration success.
- Required `data-capture` markers: cockpit root, forms list, detail, destination attempts, first migration panel.
- Scroll-width check: desktop and mobile 390px.
- Accessibility/focus checks: keyboard list/detail/dialog/retry flow.
- Before/after evidence: first public form before/after capture if replacing an existing live form.
- Known visual debt: V1 cockpit is operational, not visual builder.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: existing Growth Forms primitives from TASK-1229/1230
- Consumidores afectados: Admin UI, WordPress public site, HubSpot destination, ops/retry
- Runtime target: `staging|production|external`

### Contract surface

- Contrato existente a respetar: TASK-1229/1230 commands/readers/Product APIs.
- Contrato nuevo o modificado: ideally none; UI may add thin Product API gaps only if discovered and documented.
- Backward compatibility: `compatible`
- Full API parity: cockpit consumes commands/readers; no UI-only business logic.

### Data model and invariants

- Entidades/tablas/views afectadas: Growth Forms tables from TASK-1229.
- Invariantes que no se pueden romper:
  - UI cannot mutate DB directly.
  - Publishing uses lifecycle command.
  - Retry/dead-letter uses delivery command.
  - First migration can be rolled back by disabling surface/embed/destination.
- Tenant/space boundary: internal admin capabilities + public surface registry.
- Idempotency/concurrency: publish/retry commands idempotent or guarded by version/state.
- Audit/outbox/history: inherited commands audit every publish/destination/retry.

### Migration, backfill and rollout

- Migration posture: `none|configuration` for first form; no destructive migration.
- Default state: form draft/review until smoke passes.
- Backfill plan: none.
- Rollback path: disable published form/surface/destination and restore prior embed if replacing.
- External coordination: WordPress page edit/deploy, HubSpot test/real form, operator sign-off.

### Security and access

- Auth/access gate: admin session + `growth.forms.*`; public embed via surface registry.
- Sensitive data posture: PII/contact/free text; admin view should redact where policy requires.
- Error contract: canonical errors; no raw HubSpot errors.
- Abuse/rate-limit posture: inherited public submit controls; operator retries bounded.

### Runtime evidence

- Local checks: UI tests/focal tests where applicable.
- DB/runtime checks: first form draft/publish/submission/destination attempt query.
- Integration checks: WordPress smoke + HubSpot/test delivery.
- Reliability signals/logs: destination failures, unauthorized surface, renderer stale, dead letter.
- Production verification sequence: staging first; production only with explicit operator approval.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Cockpit logic lives in commands/readers from TASK-1229/1230, not components.
- [ ] Form lifecycle/destination/surface/retry actions are commands with capabilities.
- [ ] Nexa/MCP/CLI can consume the same primitives or have explicit planned path.
- [ ] UI is one consumer; no separate implementation of author/publish/retry.

## Hybrid Execution Justification

- Why not split: Backend reusable foundation, HubSpot adapter and renderer are already split into TASK-1229/1230/1231. This task intentionally validates the first operational vertical by consuming those contracts.
- Primary execution profile: `ui-ux`
- Contract boundary: no new source-of-truth or business logic should be born in UI; any backend gap must be a thin Product API over existing primitive or moved back to TASK-1229/1230 follow-up.
- Risk controls: staging-first, explicit first-form selection, rollback by disabling embed/surface/destination, GVC loop, no production public cutover without operator sign-off.

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

### Slice 1 — Admin cockpit MVP

- Build forms list/detail cockpit with lifecycle, surfaces, destinations and recent health.
- Add create/edit draft/review/publish/deprecate/archive flows using Product APIs.
- Add submissions/destination attempts inspect/retry UI.

### Slice 2 — First form configuration

- Select first form: AI Visibility intake or one lead magnet.
- Author form definition/version, destination policy, host surface and success behavior.
- Review/publish through commands, not manual DB writes.

### Slice 3 — WordPress public migration smoke

- Embed first form in WordPress host surface using TASK-1231 wrapper.
- Submit staging/test lead and verify ledger, consent, destination attempt and HubSpot/test outcome.
- Capture before/after or baseline evidence.

### Slice 4 — Production-ready closure

- Prepare rollback/runbook.
- Optional production cutover only with operator sign-off.
- Document Astro parity path and any deferred UI builder needs.

## Out of Scope

- Full visual form builder.
- Creating quotes/deals/commercial records from submissions.
- Migrating all public forms.
- Provider AI diagnostic run unless first form policy explicitly permits and separate Growth AI tasks are ready.

## Detailed Spec

The cockpit should be operational and dense, not marketing-like: list/detail/sidecar, lifecycle states, destination health and submission evidence. For first migration, prefer a low-risk lead magnet unless AI Visibility intake dependencies are ready.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Production public cutover requires staging smoke + operator sign-off.
- If first form needs backend capability not in TASK-1229/1230, stop and create/fix backend task; do not add business logic in UI.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI bypasses commands | API parity | medium | Code review + tests against Product APIs | task/parity checks |
| First form loses attribution or consent | HubSpot/Growth | medium | staging smoke + consent snapshot review | `growth.forms.consent_missing_rate` |
| Public cutover breaks existing lead flow | Public site | medium | low-risk first form, rollback embed, before/after evidence | submit/conversion monitoring |
| Admin cockpit over-scopes into builder | UI/product | medium | MVP constraints, no drag/drop builder | review checkpoint |

### Feature flags / cutover

- First form remains draft/review until staging smoke passes.
- Public cutover controlled by form `published` status, surface allowlist and destination enabled state.
- Optional production flag/surface status can pause submissions quickly.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Hide route/revert UI; commands remain | <30 min | si |
| Slice 2 | Deprecate/archive draft/published test form | <15 min | si |
| Slice 3 | Remove WordPress embed or disable surface/destination | <15 min | si |
| Slice 4 | Revert cutover or pause surface | <15 min | si |

### Production verification sequence

1. Local/staging admin cockpit smoke.
2. Staging first form publish with test surface/destination.
3. WordPress staging/test page submission.
4. Verify Greenhouse ledger/consent/destination attempt.
5. Verify HubSpot/test destination.
6. Optional production embed cutover after explicit sign-off.

### Out-of-band coordination required

- Operator selection of first real form.
- WordPress page/staging access and production cutover approval.
- HubSpot test/real destination approval.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Admin cockpit consumes only canonical Product APIs/commands/readers.
- [ ] Operator can author/review/publish/deprecate/archive and inspect submissions/delivery attempts.
- [ ] First form is configured through the engine with host surface, consent, destination and success behavior.
- [ ] WordPress smoke proves public host -> Greenhouse -> destination path works.
- [ ] GVC desktop/mobile evidence exists for cockpit and public form states.
- [ ] Rollback path for first form is documented and tested/staged.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1232`
- `pnpm ops:lint --changed`
- `pnpm fe:capture growth-forms-admin-cockpit --env=local|staging`
- WordPress public-host smoke.
- HubSpot/test destination smoke.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] First-form migration and rollback evidence linked in task/handoff.

## Follow-ups

- Astro production migration of additional forms.
- Advanced form builder only after repeated patterns justify it.
- Additional destinations such as CRM Contacts upsert, internal notification or Commercial handoff candidate.

## Open Questions

- First real form choice: AI Visibility intake vs lead magnet.
- Whether production cutover belongs in this task or a tiny release follow-up after staging smoke.
