# TASK-1340 — Growth CTA Portable Renderer + WordPress/Think surfaces

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1340-growth-cta-portable-renderer.md`
- Flow: `docs/ui/flows/TASK-1340-growth-cta-portable-renderer-flow.md`
- Motion: `docs/ui/motion/TASK-1340-growth-cta-portable-renderer-motion.md`
- Backend impact: `none`
- Epic: `EPIC-023`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui|growth|public-site`
- Blocked by: `TASK-1339`
- Branch: `task/TASK-1340-growth-cta-portable-renderer-surfaces`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el **renderer portable host-DOM** del motor de CTA (`<greenhouse-cta>`, vanilla TS, hermano del Growth Forms renderer) y lo despliega en **dos surfaces co-iguales**: el sitio público WordPress y Think. Un solo Web Component rinde el **mismo render contract publicado** por TASK-1339, probando la tesis de portabilidad. Placement de esta task: `embedded`/`inline_banner` con la acción `open_growth_form`. El primer CTA real es el follow-up del reporte AI Visibility.

## Why This Task Exists

La portabilidad es la tesis del motor de CTA (rechaza Alternative B / snippets por página — arch §18, Design Decision Log del wireframe). TASK-1339 publica un render contract gobernado, pero sin renderer no hay valor de usuario ni prueba de que el mismo contrato rinde cross-surface. Esta task materializa el renderer y lo prueba en WordPress (sitio público vivo) + Think a la vez, calcando el precedente shipeado de Growth Forms (TASK-1231: WordPress first host + Astro/Think parity). Rinde un CTA real (follow-up del reporte AI Visibility) end-to-end con `open_growth_form`, cerrando la primera rebanada vertical de EPIC-023.

## Goal

- Existe la primitive `growth-cta-renderer` (`src/growth-cta-renderer/**`): Web Component `<greenhouse-cta>` host-DOM (sin MUI/Vuexy) que consume `greenhouse-growth-cta-popup.v1`.
- El mismo render contract publicado se pinta en el host layer WordPress (shortcode/block/plugin + bundle pineado + CSP nonce + `surface_id`/`embed_key`) y en el wrapper Think, más el admin preview interno.
- El CTA follow-up del reporte AI Visibility se muestra con placement `embedded`/`inline_banner` y acción `open_growth_form`, montando el `<greenhouse-form>` gobernado sin duplicar schema/validación/consent.
- Eventos `greenhouse_cta_*` en `dataLayer` con allowlist dura (sin PII), reconciliables con el ledger server-side; CLS = 0; a11y y reduced-motion cubiertos; parity preview↔público verde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (§10 placement/interaction, §12 action routing, §13 telemetry, §15 UI/motion/a11y/anti-CLS/preview-parity, §18 secuenciación)
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` (precedente del renderer portable + WordPress host + Astro wrapper + iframe-fallback rule)
- `docs/architecture/ui-platform/MOTION.md` + `docs/architecture/ui-platform/PRIMITIVES.md`
- `DESIGN.md` (tokens; el renderer público compila un token layer `--gh-cta-*`, NO hardcodea HEX/px/ms)

Reglas obligatorias:

- Renderer host-DOM Web Component; iframe solo fallback para hosts hostiles (marcar `measurement_degraded`).
- Sin MUI/Vuexy/Next en el renderer público; el admin preview sí usa primitives Greenhouse.
- Copy visible del render contract + `src/lib/copy/growth.ts`; NO strings hardcodeados en el renderer.
- `greenhouse_cta_*` (dataLayer) es namespace deliberadamente distinto de `growth.cta.*` (interno) — no unificar.
- Anti-CLS (skeleton reserva altura), reduced-motion preserva estado, dialog/focus solo para el form si abre modal (el card embedded no es modal).
- Parity preview↔público con render-contract parity test (calcar `src/lib/growth/forms/__tests__/renderer-contract-parity.test.ts`).

## Normative Docs

- `docs/ui/wireframes/TASK-1340-growth-cta-portable-renderer.md`
- `docs/ui/flows/TASK-1340-growth-cta-portable-renderer-flow.md`
- `docs/ui/motion/TASK-1340-growth-cta-portable-renderer-motion.md`
- `docs/tasks/complete/TASK-1231-growth-forms-portable-renderer-host-surfaces.md` (precedente de referencia)

## Dependencies & Impact

### Depends on

- **TASK-1339** — render contract publicado (`greenhouse-growth-cta-popup.v1`), API pública render/events, action `open_growth_form`. Blocker duro.
- `src/growth-forms-renderer/**` — precedente + el `<greenhouse-form>` que `open_growth_form` monta.
- WordPress host (`efeoncepro.com`) — capacidad de enqueue de bundle pineado + shortcode/block (skill `efeonce-public-site-wordpress`).
- Think wrapper (`efeonce-think`, gobernado desde Greenhouse por TASK-1326) — island que emite el custom element.

### Blocks / Impacts

- Cierra (con TASK-1339) la primera rebanada vertical de EPIC-023.
- Desbloquea el siguiente slice (placement interruptivo `popup_modal`/`slide_in`).
- Impacta la página pública WP y el reporte Think (agrega el CTA follow-up).

### Files owned

- `src/growth-cta-renderer/**` (nuevo: `contract.ts`, `render.ts`, `telemetry.ts`, `styles.ts`, `action.ts`, `element.ts`, `__tests__/**`)
- WordPress: shortcode/block/plugin que emite `<greenhouse-cta>` (repo public-site / bridge — `[verificar]` ubicación)
- `efeonce-think` wrapper island (repo externo gobernado — coordinación TASK-1326)
- `src/app/(dashboard)/admin/growth/ctas/preview/**` (admin preview — `[verificar]` ruta)
- `src/lib/copy/growth.ts` (copy estructural del CTA)
- `scripts/frontend/scenarios/task-1340-growth-cta-renderer.scenario.ts` (GVC)

## Current Repo State

### Already exists

- `src/growth-forms-renderer/**` (Web Component vanilla TS shipeado, TASK-1231) — patrón a calcar: contract mirror + drift guard, tokens `--ghf-*`, `ElementInternals`, container queries, telemetry allowlist, skeleton anti-CLS.
- Growth Forms surfaces WordPress + Think ya probadas (EPIC-020) — el host layer existe.

### Gap

- No existe `src/growth-cta-renderer/`, ni el custom element `<greenhouse-cta>`, ni el shortcode/block WP para CTA, ni el wrapper Think para CTA, ni el admin preview de CTA.
- El render contract de CTA no está publicado aún (lo hace TASK-1339).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: visitante público anónimo (lector del reporte AI Visibility en Think; visitante del sitio WP).
- Momento del flujo: post-lectura del reporte (Think) / navegación de marketing (WP) → invitación al siguiente paso.
- Resultado perceptible esperado: un CTA claro, no intrusivo, que abre el grader form sin sacarlo de la página.
- Fricción que debe reducir: llegar al siguiente paso (generar informe) sin buscar ni cambiar de página.
- No-goals UX: nada de dark patterns (false scarcity, confirmshaming, hidden close), nada de popup interruptivo en esta task, nada de CLS.

### Surface & system decision

- Surface: WordPress público + Think + admin preview.
- Composition Shell: `no aplica` (renderer host-DOM público; el admin preview puede usar shell pero es superficie de QA).
- Primitive decision: `new` — `growth-cta-renderer` (`<greenhouse-cta>`), hermana de `growth-forms-renderer`, mismo patrón.
- Adaptive density / The Seam: `aplica` — el card se dimensiona por su ancho (container query), no por viewport global.
- Floating/Sidecar/Dialog decision: no-modal para `embedded`/`inline_banner`; el form montado por `open_growth_form` sigue su propio contrato (modal/inline).
- Copy source: render contract (campaign) + `src/lib/copy/growth.ts` (estructural).
- Access impact: `none` (superficie pública; autorización server-side por surface binding + embed key en TASK-1339).

### State inventory

- Default: card visible con headline + supporting + CTA + dismiss.
- Loading: skeleton que reserva el alto final (anti-CLS), silencioso.
- Empty: n/a (si no hay contrato elegible, no se renderiza nada).
- Error: fail-closed — no card en superficie pública + `greenhouse_cta_error`.
- Degraded / partial: si falla el ingest, la UX no se rompe (fire-and-forget idempotente).
- Permission denied: n/a (público); surface/embed inválido → server no entrega contrato.
- Long content: headline/supporting truncan con gracia; el card no crece sin límite.
- Mobile / compact: stack vertical, CTA full-width ≥44px, dismiss ≥24px, sin cubrir nav/campos.
- Keyboard / focus: CTA y dismiss enfocables, focus-visible, sin robar foco al montar.
- Reduced motion: aparece en estado final sin transform/animación.

### Interaction contract

- Primary interaction: click en CTA → `open_growth_form` monta `<greenhouse-form>` in-place.
- Hover / focus / active: tokens de motion CSS Tier 1.
- Pending / disabled: mientras monta el form, feedback corto sin bloquear.
- Escape / click-away: no aplica al card embedded; aplica al form si abre modal (contrato del form).
- Focus restore: al cerrar el form (si modal), el foco vuelve al CTA.
- Latency feedback: transición corta al montar el form; sin spinner teatral.
- Toast / alert behavior: sin toasts propios; el form maneja su propio success/handoff (TASK-1336).

### Motion & microinteractions

- Motion primitive: `CSS` (tokens `--gh-cta-motion-*`); NO GSAP/framer/Lottie.
- Enter / exit: `opacity` + `translateY` corto dentro del alto reservado (CLS = 0) / fade-out + colapso en dismiss.
- Layout morph: ninguno teatral.
- Stagger: ninguno.
- Timing / easing token: duración corta (~150–200ms) + easing standard del layer de tokens.
- Reduced-motion fallback: sin transform/animación, estado final directo.
- Non-goal motion: slide/scale llamativo, GSAP timelines.

### Implementation mapping

- Route / surface: WP shortcode/block emite `<greenhouse-cta>` (+ enqueue bundle pineado + CSP nonce + `surface_id`/`embed_key`); Think island; admin preview `/admin/growth/ctas/preview` `[verificar]`.
- Primitive / variant / kind: `growth-cta-renderer`, variant `placement=embedded|inline_banner`.
- Component candidates: `<greenhouse-cta>` (light DOM + `ElementInternals`); módulos `contract`/`render`/`telemetry`/`styles`/`action`/`element`.
- Copy source: render contract + `src/lib/copy/growth.ts`.
- Data reader / command: `GET /api/public/growth/ctas/render` + `POST /api/public/growth/ctas/events` (TASK-1339).
- API parity: renderer = consumer del primitive `growth.cta`, cero política/destino en el browser.
- Access / capability: público (server-side surface binding + embed key en TASK-1339).
- States to implement: default, loading/skeleton, error (fail-closed), dismissed, reduced-motion, mobile, keyboard/focus.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task-1340-growth-cta-renderer.scenario.ts`
- Route: Think report staging + WP test page (o admin preview).
- Viewports: 1440 · 1280 · 390.
- Required steps: load → hidratación → default → click primary → form_open → dismiss.
- Required captures: `cta-default`, `cta-form-open`, `cta-dismissed`, `cta-reduced-motion`.
- Required `data-capture` markers: `cta-card`, `cta-form`.
- Assertions: sin scroll horizontal de página (1440/390); CLS = 0; no render si el contrato no resuelve.
- Scroll-width checks: 1440 + 390.
- Reduced-motion / focus evidence: captura reduced-motion + focus-visible en CTA/dismiss.

### Design decision log

- Decision: renderer portable host-DOM (Web Component), no iframe por defecto, no MUI público, `open_growth_form` monta el form gobernado.
- Alternatives considered: iframe (Alternative E, degrada medición/a11y); snippet por página (Alternative B, drift); `GreenhouseFloatingSurface` MUI en público (Alternative F, no puede depender de MUI); CTA embebe copia del form (Alternative C, viola boundary).
- Why this pattern: reusa el precedente shipeado, preserva medición host, prueba portabilidad, respeta el boundary Growth Forms.
- Reuse / extend / new primitive: **new** primitive hermana de forms-renderer.
- Open risks: paridad preview(MUI)↔público(WC) — parity test; CLS en temas WP terceros — reserva de altura + `@layer`.

### Visual verification

- GVC scenario: `task-1340-growth-cta-renderer`
- Viewports: 1440 · 1280 · 390.
- Required captures: `cta-default`, `cta-form-open`, `cta-dismissed`, `cta-reduced-motion`.
- Required `data-capture` markers: `cta-card`, `cta-form`.
- Scroll-width check: sí (1440/390).
- Accessibility/focus checks: nombre accesible + focus-visible en CTA/dismiss; foco correcto al abrir/cerrar el form.
- Before/after evidence: layout del host antes/después de hidratar (probar CLS = 0).
- Known visual debt: placement interruptivo diferido a la task siguiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Primitive core `growth-cta-renderer`

- `src/growth-cta-renderer/**`: `<greenhouse-cta>` (light DOM + `ElementInternals`), módulos `contract` (espejo browser-safe + drift guard vs `greenhouse-growth-cta-popup.v1`), `render`, `styles` (tokens `--gh-cta-*`, `@layer`, container queries, skeleton anti-CLS), `telemetry` (`greenhouse_cta_*` dataLayer + `CustomEvent`, allowlist dura sin PII), `element`.
- Placement `embedded`/`inline_banner`; estados default/loading/error(fail-closed)/dismissed/reduced-motion/mobile.
- Render-contract parity test (preview↔público).

### Slice 2 — Action `open_growth_form` + telemetry reconciliation

- Módulo `action`: `open_growth_form` monta `<greenhouse-form>` in-place (o abre su superficie) sin duplicar schema/validación/consent; guarda la relación (form key + submission join).
- Eventos `greenhouse_cta_viewed/clicked/dismissed/form_opened/form_submitted` a dataLayer + POST al ingest (TASK-1339); reconciliación con submission id.

### Slice 3 — Host surfaces (WordPress + Think) + admin preview

- WordPress host layer: shortcode/block/plugin que emite `<greenhouse-cta>`, enqueue del bundle pineado, CSP nonce, `surface_id`/`embed_key`.
- Think wrapper island (coordinación con `efeonce-think`/TASK-1326) emitiendo el mismo custom element.
- Admin preview interno + GVC desktop/mobile (enterprise) del CTA follow-up real en ambas surfaces.

## Out of Scope

- Toda la foundation server-side (schema, arbiter, ledger, API, action router) → **TASK-1339**.
- Placement interruptivo (`popup_modal`/`slide_in`) → task siguiente.
- Otras acciones (`embed_growth_form`, `download_asset`, `book_meeting`, `hubspot_handoff`).
- Tier B exposición, visitor-state store, frequency capping, kill switch global.
- Cambios al `<greenhouse-form>` o al contrato de Growth Forms (se consume tal cual).
- Admin cockpit completo (`/admin/growth/ctas` author/report) — solo el preview mínimo acá.

## Detailed Spec

Ver el wireframe/flow/motion declarados (layout, copy ledger, estados, a11y, motion tokens, failure paths) y arch §10/§12/§13/§15. Notas:

- El renderer NO decide política: recibe el contrato ya arbitrado por surface+route+context y lo pinta. Cero targeting/priority en el browser.
- El bundle público es pineado por versión (como forms); el shortcode/block WP enquala esa versión + pasa `surface_id`/`embed_key`.
- `greenhouse_cta_*` (dataLayer) ≠ `growth.cta.*` (interno): namespaces deliberados.
- Fail-closed en superficie pública: ante cualquier error el card no se muestra (nunca roto/vacío).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (core) → Slice 2 (action + telemetry) → Slice 3 (surfaces + preview).
- Bloqueada por TASK-1339: sin el render contract publicado no hay nada que pintar. No arrancar Slice 1 contra un contrato mock permanente; usar el contrato real de staging.
- El deploy del bundle a WP y el island a Think requieren coordinación externa (ver abajo).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CLS por card inyectado en tema WP de terceros | public-site / CWV | medium | Skeleton reserva alto + `@layer` + tokens propios; GVC before/after prueba CLS = 0 | GVC diff + Lighthouse/CWV |
| Drift entre preview (MUI) y público (WC) | ui / renderer | medium | Render-contract parity test; ambos consumen el mismo contrato | parity test CI |
| `dataLayer` push filtra PII/internals | privacy / telemetry | low | Allowlist dura en `telemetry` (calcar forms); test de no-leak | revisión + no-leak test |
| `open_growth_form` no resuelve el form | growth.forms boundary | low | Fail-closed + `growth.cta.form_handoff_failed`; el CTA no queda colgado | `growth.cta.form_handoff_failed` |
| Bundle WP desactualizado (no pineado) | public-site | low | Versionado + enqueue pineado como forms | GVC visual + version check |

### Feature flags / cutover

- Gate del data plane por `GROWTH_CTA_ENGINE_ENABLED` (TASK-1339). El renderer se despliega detrás de ese flag: con flag OFF el `GET /render` no entrega contrato → no card. Flip productivo = habilitar el flag + publicar el CTA + enquear el bundle WP + island Think. Revert: flag OFF (el card desaparece) + retirar shortcode/island. Sin migración propia.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (primitive nueva, sin efecto sin surfaces) | <5 min | sí |
| Slice 2 | revert PR / flag OFF (no telemetry, no action) | <5 min | sí |
| Slice 3 | retirar shortcode WP + island Think + flag OFF (card desaparece) | <15 min | sí |

### Production verification sequence

1. Slice 1–2 en staging contra el contrato real de TASK-1339 + GVC 1440/390 (default/form-open/dismiss/reduced-motion) + parity test verde.
2. WP test page en staging con el shortcode → el mismo contrato rinde → CLS = 0 + a11y OK.
3. Think staging → el mismo contrato rinde el follow-up → paridad visual con WP.
4. `open_growth_form` en staging → monta el grader form → submit (mock/staging) → `form_submitted` reconcilia con submission id.
5. Flip productivo coordinado (flag ON + CTA publicado + bundle WP + island Think) + smoke real + monitoreo de señales 7d.

### Out-of-band coordination required

- Deploy del bundle/plugin al WordPress público (Kinsta) — coordinación con la operación del sitio (skill `efeonce-public-site-wordpress`).
- Deploy del island al repo `efeonce-think` (gobernado, TASK-1326).
- CSP nonce del host WP para el script del renderer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `<greenhouse-cta>` (`src/growth-cta-renderer/**`) rinde el render contract `greenhouse-growth-cta-popup.v1` en WordPress host layer + Think wrapper + admin preview — el MISMO contrato.
- [ ] Placement `embedded`/`inline_banner` no-modal; a11y (nombre accesible, focus-visible, dismiss por teclado, sin robar foco) cubierta.
- [ ] CLS = 0 (skeleton reserva alto); sin scroll horizontal de página en 1440/390 (GVC before/after).
- [ ] `open_growth_form` monta el `<greenhouse-form>` del grader sin duplicar schema/validación/consent; guarda el join.
- [ ] Eventos `greenhouse_cta_*` en dataLayer con allowlist dura (no-leak test), reconcilian con el ledger server-side + submission id.
- [ ] Motion CSS por token, reduced-motion preserva estado final, sin GSAP; error = fail-closed (no card roto en público).
- [ ] Render-contract parity test preview↔público verde.
- [ ] `UI ready` pasa a `yes` solo cuando el wireframe + `## UI/UX Contract` tengan implementation mapping + GVC plan + decision log completos y `pnpm task:lint --task TASK-1340` quede sin findings.
- [ ] GVC desktop + mobile capturado y mirado (enterprise) en ambas surfaces.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (incl. render-contract parity test + telemetry no-leak test)
- `pnpm fe:capture task-1340-growth-cta-renderer --env=staging` (GVC 1440/1280/390) + revisión del frame
- `pnpm ui:readiness-check --task TASK-1340`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambió comportamiento/estructura
- [ ] chequeo de impacto cruzado (marcar la primera rebanada vertical de EPIC-023 como cerrada con TASK-1339)
- [ ] `pnpm test` (full) + `pnpm build` (prod) verdes en el último commit antes de cerrar
- [ ] GVC desktop + mobile mirado y enterprise en WordPress + Think

## Follow-ups

- Task siguiente — placement interruptivo (`popup_modal`/`slide_in`) con a11y modal + focus trap/return + motion + CLS.
- Task futura — acciones adicionales del renderer (`embed_growth_form`, `download_asset`, `book_meeting`).
- Master flow del programa `docs/ui/flows/EPIC-023-growth-cta-popup-UI-FLOW.md` si no existe al tomar la task.

## Open Questions

- Ubicación exacta del shortcode/block WP y del island Think (¿en el repo público / bridge / `efeonce-think`?). `[verificar]`
- ¿El admin preview vive en `/admin/growth/ctas/preview` o se difiere al admin cockpit? `[verificar]`
- ¿El CTA follow-up abre el grader form (`open_growth_form`) o linkea al hub? Alineado con TASK-1339 Open Question — se asume `open_growth_form`.
