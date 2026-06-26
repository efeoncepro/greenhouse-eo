# TASK-1232 — Growth Forms Admin Cockpit + First Migration

## Delta 2026-06-26 — continuación (Claude, operador-dirigido) — cierre de los 4 gates abiertos

El operador me pasó a terminar los gates abiertos. La maquinaria ya existía (Codex construyó el cockpit); faltaba **producir evidencia**. Verificado con skills `arch-architect` + `a11y-architect` + `forms-ux` + `greenhouse-ux` y **GVC en loop** sobre la UI tocada. Resultado por gate:

- **#4 (Authoring UI forms-ux + axe): a11y ESTRUCTURAL arreglado + axe verde + GVC.** axe encontró 3 clases serias: `nested-interactive` + `no-focusable-content` (la fila era `<TableRow role='button'>` envolviendo un `<IconButton>`) y `color-contrast`. **Fix cockpit-local:** la fila deja de ser `role=button`; el **nombre del form pasa a ser el control de selección** (`ButtonBase` + `aria-pressed` + aria-label + foco), el IconButton queda como acción secundaria → nested-interactive/no-focusable-content **resueltos**; el form-name recibió `color='text.primary'` explícito (contraste OK). Spec `tests/e2e/smoke/growth-forms-admin-cockpit-a11y.spec.ts` (shell + composer) **verde**. GVC `growth-forms-admin-cockpit` (desktop+mobile) mirado: fila intacta, nombres legibles. **El `color-contrast` residual (12) es 100% de primitives COMPARTIDAS** (`GreenhouseButton`/`GreenhouseBreadcrumbs` usando `primary` ~#0375db como texto → 3.69–4.13:1) = problema de PALETA portal-wide (TASK-1053), **no del cockpit** → **ISSUE-108** (el spec lo `disableRules` con referencia).
- **#2 (renderer `gh_form_*` → dataLayer): YA cubierto.** El renderer emite los 7 eventos en su ciclo (viewed/started/submitted/accepted/rejected/…) + `src/growth-forms-renderer/__tests__/telemetry.test.ts` (3 tests verdes) prueba el push sanitizado a `window.dataLayer` (sin PII/raw). La pata "página WordPress viva" → **TASK-1258**.
- **#3 (rollback del primer form): PROBADO staged.** `archiveFormDefinition` (soft-delete) → el form deja de servir el render contract (`status='active'` filtra); reactivable (no DELETE) → reversible. Verificado live contra PG.
- **#1 (public host → Greenhouse → destination):** la pata **public→Greenhouse** la probó **TASK-1261** live (submit → ledger + normalización). La pata **→destination** (HubSpot): adapter `hubspot_forms_secure_submit` **unit-tested (9) + live-smoke-verde (TASK-1230)**; la entrega full-loop live = **cutover de TASK-1261** (`delivery_mode='direct'` + verificar contacto HubSpot, con cleanup de CRM) — NO se hace acá para no ensuciar el CRM. La pata "submit desde el embed en la página viva" → **TASK-1258**.

**Estado:** code/estructural complete. Pendiente de rollout/cutover (no de código): entrega HubSpot live (cutover 1261) + smoke en la página WordPress viva (TASK-1258) + el contraste de paleta (ISSUE-108).

## Delta 2026-06-25 — impacto de TASK-1251 (primera migración real de un form)

TASK-1251 ejecutó **de facto la primera migración de un form real al motor**: el AI Visibility Grader quedó sembrado como form gobernado (`fdef-ai-visibility-grader`) con su submission/consent/outbox + un reactive consumer post-submit (`growth_grader_run_from_submission`, projection domain `growth`). Patrón establecido a reusar (no inventar otro): **fachada estable** sobre el endpoint legacy + **submission del motor** + **reactive consumer idempotente** para el efecto post-submit + **flag default-OFF (converge-before-launch)** + **binding additive** al ledger legacy. Como el grader NO se renderiza por el GET genérico del motor (tiene su página propia, TASK-1241), su `form_version` es un FK anchor (no pasó por el compiler de publicación). El admin cockpit de 1232 debería poder listar/observar este form como cualquier otro.

## Delta 2026-06-25 — desbloqueada por TASK-1231 (renderer + host surfaces)

- TASK-1231 (renderer portable + host surfaces) está **code-complete** — cerrada la última dependencia bloqueante (1229 ✅, 1230 ✅, **1231 ✅**). El cockpit ya tiene contra qué previsualizar/publicar.
- Lo que esta task hereda listo: Web Component `<greenhouse-form>` + bundle pineado (`pnpm renderer:build` → `public/growth-forms/renderer-<channel>.js`), preview interno `/design-system/growth-forms-renderer`, widget Elementor WordPress (`greenhouse_growth_form` en `efeonce-public-site-runtime`) y wrapper Astro (`efeonce-web`). El "first migration" puede apuntar a un host surface real ya existente.
- **Convergencia recomendada:** el primer form real a migrar = el lead magnet del grader (TASK-1241), hoy hand-built → re-renderizar vía este renderer (ver Delta de TASK-1241).

## Delta 2026-06-25 — ownership Codex/Product Design

- Codex toma la task en `develop` local-first por pedido del operador, con Product Design como gate visual.
- Drift corregido: `Blocked by` se actualiza a `none` porque `TASK-1229`, `TASK-1230` y `TASK-1231` están en `complete/` y `Handoff.md` confirma que la task quedó desbloqueada.
- Visual target confirmado: **Growth Forms Command Center** como implementación primaria, enriquecido con pipeline/evidence de Migration Control Tower y composer/readiness de Authoring & Evidence Studio.

## Approved visual direction 2026-06-25 — Product Design

Visual direction approved by operator: use **Growth Forms Command Center** as the primary implementation target, incorporating the pipeline/evidence discipline from **Migration Control Tower** and the publish-readiness/composer discipline from **Authoring & Evidence Studio**.

Reference assets:

- `docs/assets/product-design/task-1232-growth-forms-admin-cockpit-first-migration/growth-forms-command-center.png` — primary cockpit direction.
- `docs/assets/product-design/task-1232-growth-forms-admin-cockpit-first-migration/migration-control-tower.png` — migration pipeline, smoke evidence, GTM/dataLayer and rollback reference.
- `docs/assets/product-design/task-1232-growth-forms-admin-cockpit-first-migration/authoring-evidence-studio.png` — author → review → publish composer, renderer preview and publish-readiness reference.

Implementation guidance:

- Treat the cockpit as an internal **operations command center**, not a marketing page and not a free-form visual builder.
- Start from `CompositionShell` with `split` or `leadPlusContext`; keep one dense primary work surface plus an `AdaptiveSidecarLayout` inspector/evidence lane.
- Preserve the Command Center hierarchy: forms list/table, lifecycle/status chips, destination health, submission evidence, selected form inspector and controlled actions.
- Pull from Migration Control Tower for the first migration slice: public host → Greenhouse ledger → consent snapshot → destination/HubSpot delivery, GTM/dataLayer events, smoke-test evidence and rollback controls.
- Pull from Authoring & Evidence Studio for publish workflows: stepper/composer, version review, renderer preview, validation summary, browser-safe contract and publish readiness.
- Do not introduce a drag-and-drop builder, nested-card layout, decorative hero, or non-canonical components for breadcrumbs, buttons, chips, sidecars, tables or form inputs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Code-complete cockpit enterprise; public WordPress/dataLayer smoke pending`
- Rank: `TBD`
- Domain: `growth|public-site|hubspot|ui|api`
- Blocked by: `none`
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
- `TASK-1241` (lead magnet del grader) = candidato concreto a **primer form real**: migrar su form hand-built al motor (evita el choque con el intake a-medida de TASK-1240). Ver Delta de TASK-1241 2026-06-25.

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

- Surface: `/admin/growth/forms` or route selected during discovery. **Ruta interna** → viewCode en routeGroup `internal`, **NUNCA sembrado a `client_*`**.
- Composition Shell: `aplica` — declarar composición explícita `leadPlusContext` (lista primary + inspector aside) o `split`; regiones singleton (`primary`/`aside`), `fluidity='rich'`. NO inventar grid/morph ad-hoc (lint `greenhouse/no-ad-hoc-layout-morph`).
- Primitive decision: `reuse` — `CompositionShell`, `GreenhouseBreadcrumbs`, tablas/cards/chips/buttons como primitives existentes; new primitive solo si emerge necesidad de plataforma repetida.
- Adaptive density / The Seam: `aplica` — usar el contrato `card-density` (`useContainerDensity` + `resolveCardDensity` → `full`/`condensed`/`peek`) en form cards/rows y summaries; **condensación honesta, NUNCA clip/overflow/`—`** (el valor clave nunca desaparece).
- Floating/Sidecar/Dialog decision: usar `AdaptiveSidecarLayout`/`adaptive-sidecar-controller` (NO drawer/modal custom; desktop = lane in-flow full-height, no boxed overlay), mapeando a variantes oficiales: **detalle de form/submission/destination → `inspector`**, **authoring de form/version → `composer`**, **evidencia de destination attempt → `evidence`**. Dialog solo para confirmación destructiva (deprecate/archive).
- Copy source: `src/lib/copy/growth-forms.ts` para labels/states reusables (invocar `greenhouse-ux-writing`, es-CL tuteo, lint `greenhouse/no-untokenized-copy`); one-off local solo para copy de fixture.
- Access impact: `entitlements`/capabilities `growth.forms.*` — **granteadas a ≥1 ROLE_CODE real (interno) + coverage test el mismo PR** (no existe rol `growth_*`; candidatos `efeonce_admin`/`efeonce_account`/`efeonce_operations`). Nuevo viewCode → seed migration en `VIEW_REGISTRY` el mismo PR (TASK-827) + ruta alcanzable por nav + `route-reachability-manifest.ts` (TASK-982).

### State inventory

- Default: forms list + selected detail.
- Loading: readers pending.
- Empty: no forms yet with CTA/create guidance.
- Error: canonical error display.
- Degraded / partial: destination unavailable, stale renderer, HubSpot failed, public host measurement degraded/missing.
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
- Reliability signals/logs: destination failures, unauthorized surface, renderer stale, dead letter, client analytics missing/degraded measurement.
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

The cockpit should be operational and dense, not marketing-like: list/detail/sidecar, lifecycle states, destination health and submission evidence.

**UI de authoring = disciplina `forms-ux` (no es un visual builder).** El authoring de definition/version es en sí un formulario complejo: usar un stepper/`composer` (author → review → publish) con validación por paso, label-above, `CustomAutocomplete` (NUNCA `Popover > Select`; ≤2 clicks), preservar datos en error, y el piso de 17 puntos para los inputs del cockpit. NO drag-and-drop builder en V1.

**Honest degradation del delivery health (skill `state-design`):** la salud de entrega (HubSpot/destination) NUNCA pinta verde ni blank cuando la señal es desconocida — `SourceResult<T>`: `ok` muestra el valor, `empty` muestra "Sin intentos", `degraded` muestra "Pendiente" + razón. El cockpit no puede mentir salud cuando el signal no resolvió.

**Primer form — de-risk + colisión con TASK-1240:** preferir un lead magnet de bajo riesgo para la PRIMERA migración. Si se elige el **AI Visibility intake**, NO doble-construir: ese intake ya existe a-medida (`grader_leads`/`grader_intake_events`, TASK-1240) — migrarlo al motor ES la convergencia grader↔forms (ver Open Question de TASK-1229), requiere coordinar con el dueño de TASK-1240 y NO es trivial. Por eso el primer form debería ser un lead magnet nuevo, dejando la convergencia del grader como migración posterior dedicada.

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

- [x] Admin cockpit consumes only canonical Product APIs/commands/readers.
- [x] Operator can author/review/publish/deprecate/archive and inspect submissions/delivery attempts.
- [x] First form is observable through the engine (`AI Visibility Grader` / `fdef-ai-visibility-grader`) with host surface and consent evidence inherited from TASK-1251; generic renderer publish smoke remains a rollout follow-up.
- [~] public host -> Greenhouse -> destination path works. **public→Greenhouse: probado live (TASK-1261).** →destination (HubSpot): adapter unit-tested + live-smoke-verde (TASK-1230); full-loop live = cutover 1261 (`delivery_mode='direct'`). Smoke en la **página WordPress viva** → TASK-1258.
- [x] parent-page GTM/dataLayer-compatible `gh_form_*` events fire (view/start/submit/accepted/rejected, sin raw field values): **renderer emite los 7 + `telemetry.test.ts` verde (sanitizado).** Disparo en la página padre viva → TASK-1258.
- [x] GVC desktop/mobile evidence exists for cockpit states, verificada **en loop** (capturar → mirar frame → ajustar → recapturar). Final evidence: `.captures/2026-06-25T13-56-54_growth-forms-admin-cockpit`.
- [x] Rollback path for first form is documented and tested/staged. **`archiveFormDefinition` (soft-delete) → deja de servir; reactivable → reversible. Probado live contra PG.**
- [x] Sidecar usa `AdaptiveSidecarLayout` con variantes oficiales (inspector/composer/evidence), NO drawer/modal custom; Composition Shell con composición declarada.
- [x] Ruta `(dashboard)` alcanzable por nav + `route-reachability-gate`; viewCode nuevo con seed migration en `VIEW_REGISTRY` + grants internos aplicados.
- [x] Authoring UI pasa el piso `forms-ux` + **gate axe ESTRUCTURAL verde** (TextField select no Popover>Select, labels, validación, preserva datos; fila seleccionable sin nested-interactive). Spec `growth-forms-admin-cockpit-a11y.spec.ts` verde + GVC. `color-contrast` residual = **ISSUE-108** (paleta `primary` portal-wide, no del cockpit).
- [x] Delivery health usa degradación honesta (nunca verde/blank cuando el signal es desconocido).

## Completion Evidence — 2026-06-25 Codex/Product Design

- Implemented `/admin/growth/forms` as the internal Growth Forms command center and added vertical menu **Growth** → **Forms**.
- Reuse/extend decision: reused existing platform primitives (`CompositionShell`, `AdaptiveSidecarLayout`, `GreenhouseBreadcrumbs`, `GreenhouseButton`, `GreenhouseChip`, `Motion`, `AnimatedCounter`); no new primitive created for this task-specific composition.
- Typography/accessibility iteration: page and drawer identity use canonical `surfaceHeroTitle`; operational copy uses canonical Typography variants and `text.primary` for readable data; rows support keyboard selection/focus; mutation feedback uses a polite live region.
- GVC final evidence: `.captures/2026-06-25T13-56-54_growth-forms-admin-cockpit` (desktop + mobile, inspector + composer).
- Runtime evidence: Playwright local auth `/admin/growth/forms`, desktop 1440 and mobile 390 both `scrollWidth == clientWidth`, `consoleErrorCount=0`, `pageErrorCount=0`.
- Migration evidence: `pnpm pg:connect:status` shows no pending migrations after applying `20260625184500000_task-1232-growth-forms-admin-cockpit-view`.
- Gates: `pnpm task:lint --task TASK-1232`, `pnpm ops:lint --changed`, `pnpm lint`, `pnpm typecheck`, `pnpm design:lint`, `pnpm route-reachability-gate`.
- Build note: `pnpm build` reached `✓ Compiled successfully` then stayed idle in post-TypeScript; command was interrupted after confirming 0% CPU and restoring generated `tsconfig.json` churn. Do not count build as final PASS until rerun completes.
- Not closed as complete because public WordPress/dataLayer smoke and tested rollback path are still pending rollout evidence.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1232`
- `pnpm ops:lint --changed`
- `pnpm fe:capture growth-forms-admin-cockpit --env=local|staging`
- WordPress public-host smoke.
- WordPress parent-page `dataLayer`/DOM event smoke.
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

- First real form choice: AI Visibility intake vs lead magnet. **Recomendación:** lead magnet de bajo riesgo (el AI Visibility intake colisiona con TASK-1240 y arrastra la convergencia grader↔forms — migración dedicada posterior, no esta task).
- Whether production cutover belongs in this task or a tiny release follow-up after staging smoke. **Recomendación:** cerrar 1232 en cockpit + first-form publish + WordPress **staging** smoke; mover el **production cutover** (Slice 4) a un follow-up gateado por release/operator sign-off — reduce blast radius y alinea con el release control plane.
