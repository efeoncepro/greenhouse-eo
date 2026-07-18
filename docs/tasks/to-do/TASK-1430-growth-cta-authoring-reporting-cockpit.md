# TASK-1430 — Growth CTA authoring and reporting cockpit

## Delta 2026-07-18 (3)

- TASK-1431 quedó code-complete (local): el blocker de metadata YA existe. El cockpit consume
  `CTA_ACTION_KIND_METADATA` + enums (`CTA_ACTION_KINDS`, `CTA_NAVIGATE_ACTION_KINDS`, failure
  reasons) desde `src/lib/growth/ctas/contracts.ts` (browser-safe, sin server-only) — cero enum
  paralelo. Policies por kind: `ctaLinkUrlPolicySchema`/`ctaOpenThinkToolPolicySchema`/
  `ctaBookMeetingPolicySchema` (mismo archivo); la validación/resolución server sigue en
  `action-registry.ts` vía `resolveCtaAction`. El preview ya soporta las 4 acciones con
  `inertNavigation: true` (fixtures `linkUrlInternal`/`linkUrlExternalNewTab`/`thinkTool`/
  `bookMeeting`). Bloqueo restante de TASK-1431: solo su rollout (bundle 1.2.0 en hosts), no el
  contrato de authoring.

## Delta 2026-07-18 (2)

- TASK-1429 quedó code-complete — assets nuevos que este cockpit reutiliza (no re-crear): matriz de
  density del preview (`SlideInDensityMatrix` en `GrowthCtasGovernanceView`, mismo core del
  renderer a 3 anchos) + demo vivo del overlay (`SlideInController` con `triggerMode: 'immediate'`)
  + fixtures pairwise `slideIn*` en `src/growth-cta-renderer/fixtures.ts`. El authoring de
  `placement: 'slide_in'` ya es válido end-to-end (enum + arbiter + renderer); el gate de review
  para interruptivos (cap/dismiss/kill-switch posture) sigue siendo responsabilidad de esta task.

## Delta 2026-07-18

- Los readers/commands de TASK-1428 que el cockpit consume quedaron **code-complete (sin push)** — cerrado
  por trabajo en TASK-1428: `getKillSwitchState()` + `listKillSwitchAudit()` (actor/reason/timestamp,
  operador-only) + `setCtaKillSwitch()` vía `GET/POST /api/admin/growth/ctas/kill-switch`
  (capabilities `growth.cta.read`/`growth.cta.pause`, cero capabilities nuevas), y
  `summarizeCtaExposure(windowDays)` (rollup Tier B diario por reason class, con `enforced` para
  distinguir shadow de enforcement). La UI no debe crear agregaciones paralelas: estos son los canónicos.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1430-growth-cta-authoring-reporting-cockpit.md`
- Flow: `docs/ui/flows/TASK-1430-growth-cta-authoring-reporting-cockpit-flow.md`
- Motion: `docs/ui/motion/TASK-1430-growth-cta-authoring-reporting-cockpit-motion.md`
- Backend impact: `none`
- Epic: `EPIC-023`
- Status real: `Definida`
- Rank: `4`
- Domain: `ui|growth`
- Blocked by: `TASK-1428`, `TASK-1431`
- Branch: `task/TASK-1430-growth-cta-authoring-reporting-cockpit`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Completa `/growth/ctas` como cockpit operator: inventario + detalle, author/review/publish/pause, surfaces/kill switches, reporting básico y authoring/preview gobernado del CTA Experience System. Permite componer placement, experience kind, appearance, contenido/asset y action sin convertir el cockpit en un page builder; density sigue siendo automática y `variantId` no se mezcla con apariencia. Reutiliza commands/readers/APIs existentes, los deltas de TASK-1428 y metadata del Action Registry TASK-1431; la UI no crea endpoints, enums, reglas ni agregaciones paralelas.

## Why This Task Exists

La vista actual de TASK-1340 permite inventario, lifecycle mínimo y preview, pero no resuelve el flujo completo de authoring/review ni presenta detalle/versiones/conversion summary/controles de surface. El backend ya expone list, detail, author y lifecycle; crear otra foundation sería duplicación.

## Goal

- Workbench operator end-to-end sobre `/growth/ctas` y `gestion.growth_ctas`.
- Authoring/review/publish/pause con estado honesto y confirmaciones.
- Authoring guiado que hace visibles compatibilidad, anatomía, expectativa de acción, density preview y riesgos antes de review/publish.
- Reporting básico y kill switches desde readers/commands canónicos.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Reglas obligatorias:

- Composition Shell como base y primitive reuse antes de crear UI.
- UI cliente del primitive/API; cero SQL, agregación o state machine local.
- Conversión reportada distingue `browser_reported` de `server_confirmed`.
- Copy reusable en `src/lib/copy/growth.ts` y acceso fino por capability.
- La UI no ofrece controles de pixel/spacing/color libre, breakpoint manual, CSS, z-index, motion curve ni HTML; solo ejes gobernados y tokens aprobados.
- Preview usa el mismo CSS/contract renderer que producción; nunca una recreación MUI “parecida”.

## Normative Docs

- `src/views/greenhouse/growth/ctas/GrowthCtasGovernanceView.tsx`
- `src/app/(dashboard)/growth/ctas/page.tsx`
- `src/app/api/admin/growth/ctas/**`
- `src/lib/growth/ctas/readers.ts`
- `src/lib/growth/ctas/commands.ts`
- docs UI de esta task

## Dependencies & Impact

### Depends on

- TASK-1428 para kill switches/suppression status.
- TASK-1431 para action kinds, schemas y metadata de authoring; la UI no mantiene un enum paralelo.
- APIs/readers/commands TASK-1339 y preview TASK-1340.

### Blocks / Impacts

- Cumple el criterio V1 del cockpit operable; no bloquea runtime público actual.

### Files owned

- `src/views/greenhouse/growth/ctas/**`
- `src/app/(dashboard)/growth/ctas/page.tsx`
- `src/lib/copy/growth.ts`
- `scripts/frontend/scenarios/task-1430-growth-cta-cockpit.scenario.ts`
- docs UI de esta task

## Current Repo State

### Already exists

- Route/nav/viewCode, inventario, surfaces, preview y lifecycle básico.
- GET list/detail, POST author, lifecycle endpoint y conversion summary reader.

### Gap

- Sin master-detail operator, editor/review completo, version history/reporting y control visible de kill switches.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: route/view Growth CTA en `src/app` + `src/views`
- Future candidate home: `portal`
- Boundary: UI consume `CtaSummaryVm/CtaDetailVm` y commands/API `growth.cta.*`
- Server/browser split: page/route resuelven auth/data; client maneja interacción, nunca DB/secrets
- Build impact: none
- Extraction blocker: session/capability y Composition Shell del portal

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Growth/Marketing autorizado
- Momento del flujo: crear, revisar, publicar, pausar y leer resultado de CTAs
- Resultado perceptible esperado: una cola y detalle claros, más un authoring que permite anticipar exactamente cómo se verá, adaptará y actuará un CTA real sin conocer JSON interno
- Friccion que debe reducir: operar por payload/API o vista parcial sin contexto
- No-goals UX: canvas drag-and-drop, editor visual libre, CSS/spacing arbitrario, experimentación powered o analytics avanzado

### Surface & system decision

- Surface: `/growth/ctas`
- Composition Shell: `aplica` — `leadPlusContext`/`split` según mapping
- Primitive decision: `reuse` — CompositionShell, OperationalPanel, DataTableShell, ContextualSidecar/fields existentes; preview monta el renderer CTA canónico dentro de un harness, no una card paralela
- Adaptive density / The Seam: aplica en cards/resumen del detalle
- Floating/Sidecar/Dialog decision: sidecar/context region para detalle/editor; confirmación gobernada para publish/pause
- Copy source: `src/lib/copy/growth.ts`
- Access impact: `views|entitlements` existentes, sin nuevo viewCode

### State inventory

- Default: inventario + selección/detalle
- Loading: skeleton por región
- Empty: sin CTAs + CTA author si capability
- Error: retry y causa sanitizada
- Degraded / partial: engine/kill switch/surface o métricas parciales explícitas
- Permission denied: route/view/capability
- Long content: políticas/versiones con wrapping y disclosure
- Mobile / compact: lista→detalle secuencial; no tabla aplastada
- Keyboard / focus: selección, sidecar/dialog, confirmación y restore
- Reduced motion: primitives existentes
- Draft valid: matriz placement/kind/appearance/action compatible, content limits y preview parity verdes
- Draft invalid: errores por campo + resumen accionable; publish deshabilitado por razón server-confirmed
- Preview modes: host `Think|WordPress`, container `wide|narrow|compact`, appearance, asset/no-asset, long content y reduced motion

### Interaction contract

- Primary interaction: seleccionar → revisar/editar draft → submit review/publish/pause
- Hover / focus / active: filas/acciones con foco visible
- Pending / disabled: acciones bloqueadas durante mutation y por transition/capability
- Escape / click-away: no perder dirty draft; confirmación si aplica
- Focus restore: fila/acción origen
- Latency feedback: inline pending + refresh de detail
- Toast / alert behavior: toast de éxito; Alert persistente para bloqueo/error
- Authoring sequence: intent/kind → placement → appearance → content/evidence → action → targeting/suppression → preview matrix → review; no empieza por un canvas visual vacío
- Compatibility feedback: combinaciones inválidas se bloquean con razón y alternativa segura; la UI no corrige silenciosamente ni muta payload al publicar

### Motion & microinteractions

- Motion primitive: `none` nuevo; reuso de Composition Shell/Sidecar
- Enter / exit: existente en primitives
- Layout morph: Composition Shell existente
- Stagger: none nuevo
- Timing / easing token: existente
- Reduced-motion fallback: primitives
- Non-goal motion: charts/count-up o animaciones decorativas

### Implementation mapping

- Route / surface: `/growth/ctas`
- Primitive / variant / kind: CompositionShell + master/detail/sidecar primitives existentes + harness del `<greenhouse-cta>` canónico; cero `CtaPreviewCard` local
- Component candidates: refactor/extend `GrowthCtasGovernanceView`
- Copy source: `src/lib/copy/growth.ts`
- Data reader / command: list/detail/author/lifecycle + TASK-1428 kill switch + TASK-1431 action registry metadata
- API parity: APIs admin existentes; no UI-only business action
- Access / capability: `gestion.growth_ctas` + `growth.cta.read/author/publish/pause`
- States to implement: list/detail/draft-valid/draft-invalid/preview-host/preview-density/review/published/paused/degraded/error/permission/compact/dirty

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task-1430-growth-cta-cockpit.scenario.ts`
- Route: `/growth/ctas`
- Viewports: 1440 y 390
- Required steps: list/select/detail; author por secuencia; cambiar kind/placement/appearance/action; preview wide/narrow/compact y Think/WP; asset failure/long copy; invalid compatibility; review confirmation; report; kill-switch state
- Required captures: empty/populated/detail/editor cada sección, preview matrix, invalid/review checklist, confirm, degraded y mobile
- Required `data-capture` markers: shell/list/detail/editor/report/surface
- Assertions: auth, no error, keyboard, state labels, capability denials
- Scroll-width checks: obligatorio
- Reduced-motion / focus evidence: sidecar/dialog focus restore

### Design decision log

- Decision: extender la surface existente; no crear `/admin/growth/ctas` paralela
- Alternatives considered: nueva route admin; editor visual drag-drop; API-only
- Why this pattern: conserva nav/viewCode y backend ya shippeado
- Reuse / extend / new primitive: reuse/extend consumer, cero primitive nueva prevista
- Open risks: densidad del detail, combinatoria de preview y edición de JSON/policies; resolver con fields gobernados, pairwise preview + casos frontera y nunca textarea crudo

### Visual verification

- GVC scenario: `task-1430-growth-cta-cockpit`
- Viewports: 1440/390
- Required captures: definidos arriba
- Required `data-capture` markers: shell/list/detail/editor/report/surface
- Scroll-width check: 0
- Accessibility/focus checks: tab order, labels, confirmación, restore
- Before/after evidence: vista TASK-1340 vs cockpit completo
- Known visual debt: analytics avanzado fuera de scope

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Detailed Spec

Construir una sola ruta master-detail sobre los readers/commands existentes, sumar únicamente los contratos de TASK-1428 que falten, consumir la metadata TASK-1431 para actions y mantener todas las mutaciones server-confirmed. Composition Shell gobierna regiones; el sidecar/dialog canónico gobierna authoring y confirmaciones; reporting degradado nunca bloquea lifecycle.

### Governed authoring model

El editor no es WYSIWYG libre. Expone un recorrido con ejes explícitos y validación progresiva:

1. **Intent / experience kind:** `report_followup|lead_magnet|tool_continuation|meeting` como semántica de authoring. Define checklist de expectativa/evidencia, no copy automática.
2. **Placement:** solo placements soportados por el renderer channel/surface. Explica nivel de interrupción y requisitos de suppression.
3. **Appearance:** `default|spotlight|minimal`, con descripción de énfasis y contraste; no ofrece color picker ni CSS.
4. **Content anatomy:** eyebrow opcional, headline obligatorio, body, CTA label, dismiss label, footnote y visual asset ref, con límites y guidance contextual.
5. **Action:** options y required fields vienen de TASK-1431 registry metadata; muestra destination expectation y valida integridad label↔action.
6. **Targeting/suppression:** consume contratos canónicos; placement interruptivo no avanza a review sin cap/dismiss/kill-switch posture válido.
7. **Preview matrix:** mismo renderer bajo harnesses de host/container/state; no guarda density porque es derivada.
8. **Review checklist:** contrato, surface, accessibility, copy/action expectation, suppression, measurement y rollback antes de `submit review`/`publish`.

### Preview matrix

La UI evita una explosión combinatoria mediante cobertura pairwise más casos frontera obligatorios:

| Dimension | Values |
|---|---|
| Host context | Think, WordPress token harness |
| Container | wide/full, narrow/condensed, compact/peek cuando placement lo admite |
| Appearance | default, selected appearance; all appearances en review de platform change |
| Content | nominal, long localized, no optional body/footnote |
| Asset | present, missing/error fallback |
| State | ready, focus, pending, form-open/error cuando action aplica, dismissed/suppressed/killed read-only evidence |
| Preference | normal, reduced motion; light/dark/forced-colors cuando host/harness lo soporta |

El preview muestra badges fuera del canvas para `surface`, `placement`, `appearance`, `derived density`,
`action kind`, renderer channel y contract version. Esos badges son diagnóstico del cockpit, no contenido que llega
al visitante.

### Review blockers

No puede enviarse a review/publicarse cuando:

- action no registrada, destino inválido o label promete un resultado distinto;
- placement interruptivo no tiene dismiss/suppression/frequency/kill-switch posture válido;
- headline/action/dismiss desaparecen en alguna density requerida;
- visual contiene texto esencial o su fallback rompe la anatomía;
- preview y public contract difieren;
- copy excede límites, contraste/foco falla o existe overflow/CLS conocido;
- surface/renderer channel no soporta placement/action/contract version.

## Scope

### Slice 1 — Workbench structure

- Migrar la vista actual a Composition Shell master/detail responsive.
- Cablear list/detail/version/conversion summary sin agregación cliente.

### Slice 2 — Governed authoring, preview and lifecycle

- Form secuencial gobernado para kind/placement/appearance/content/action/targeting-suppression, sin raw JSON/CSS.
- Preview harness canónico con matriz pairwise/casos frontera y review blockers server-confirmed.
- Harness rico de contexto (mismo core del renderer, cero red): toggle light/dark del preview (los hosts públicos tienen ambos esquemas), **scrubber de ancho de contenedor** para ver el morph de density `full→condensed→peek` en vivo, y presets de fondo de host (superficie clara tipo WordPress / navy tipo bookend Think) para juzgar contraste real de cada appearance — el preview enseña el sistema, no una sola instancia.
- Draft/review/publish/pause con capability/state guards, confirmaciones, dirty-state, errores y refresh del detalle.

### Slice 3 — Surfaces, kill switches and evidence

- Mostrar bindings/estado/suppression/kill switch de TASK-1428 y reporting básico.
- GVC desktop/mobile/keyboard/reduced-motion y access matrix.

## Out of Scope

- Nuevos endpoints/schema, editor WYSIWYG, experimentación, cohorts o BI avanzado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1428 → estructura/read-only → author/lifecycle → kill switches/report → GVC/staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| UI permite transición inválida | lifecycle | medium | server result + state guard + tests | canonical error |
| Report mezcla browser/server truth | reporting | medium | DTO labels explícitos | QA/data test |
| Mobile aplasta workbench | UI | medium | Composition Shell compact + GVC 390 | scrollWidth |

### Feature flags / cutover

- Reusa `GROWTH_CTA_ENGINE_ENABLED`; route conserva acceso/flag actuales.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Workbench | revert view/page | <10 min | si |
| Mutations | UI rollback; APIs permanecen | <10 min | si |

### Production verification sequence

1. Tests component/access y GVC local.
2. Staging con datos reales y roles read/author/publish/pause.
3. Smoke lifecycle controlado con revert/restore.
4. GVC staging 1440/390 y rollout portal.

### Out-of-band coordination required

- Operador Growth valida terminology, fields de authoring y reporte mínimo.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `/growth/ctas` usa Composition Shell y conserva route/viewCode existentes.
- [ ] Inventario/detalle/versiones/reporting consumen readers/APIs canónicos sin derivar business truth en UI.
- [ ] Author/review/publish/pause y kill switches respetan capabilities, transitions y confirmación.
- [ ] Authoring separa kind, placement, appearance, action, density derivada y `variantId`; no ofrece controles visuales arbitrarios.
- [ ] Action fields/expectations vienen del registry TASK-1431 y suppression/kill-switch posture de TASK-1428; no hay enum/reglas espejo.
- [ ] Preview monta el renderer canónico y cubre host/container/state/preferences con pairwise + casos frontera; no existe preview card paralela.
- [ ] Review bloquea mismatch copy↔action, interruptivo sin defensas, fallback de asset roto, overflow/CLS, incompatibilidad de renderer y parity drift.
- [ ] `browser_reported` y `server_confirmed` se distinguen visual y semánticamente.
- [ ] Estados empty/loading/error/degraded/permission/compact/dirty quedan cubiertos.
- [ ] GVC 1440/390, keyboard/focus/reduced-motion y overflow 0 pasan.
- [ ] No nace primitive ni endpoint paralelo.
- [ ] `pnpm task:lint --task TASK-1430` y gates UI pasan.

## Verification

- `pnpm exec vitest run src/views/greenhouse/growth/ctas src/lib/growth/ctas`
- `pnpm task:lint --task TASK-1430`
- `pnpm ui:wireframe-check --task TASK-1430`
- `pnpm ui:flow-check --task TASK-1430`
- `pnpm ui:readiness-check --task TASK-1430`
- `pnpm fe:capture task-1430-growth-cta-cockpit --env=staging`
- `pnpm design:lint`

## Closing Protocol

- [ ] Lifecycle/carpeta/README/registry/EPIC-023 sincronizados.
- [ ] Functional/manual/Handoff/changelog actualizados según docs governor.
- [ ] QA Release Auditor + enterprise UI review sin blockers.
- [ ] Chequeo de impacto cruzado completado.
- [ ] Skill `greenhouse-growth-ctas` actualizada en el MISMO change set (Skill Maintenance Contract: estado de rollout, contratos, hard rules que cambien).

## Follow-ups

- Experimentación/advanced analytics permanecen deferred post-V1.
