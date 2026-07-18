# TASK-1429 — Growth CTA interruptive placement

## Delta 2026-07-18 (implementación) — Slices 1-3 CODE-COMPLETE; GVC mirado; rollout en curso

- **Implementado en develop local** (2 commits feat): `SlideInController` no modal (waiting sin DOM
  focusable → trigger gobernado del bundle dwell 8s O scroll 35% → apertura pasiva sin focus steal
  → Escape/focus return → dismiss persistido ANTES de la salida `@starting-style`+`allow-discrete`)
  · density `full|condensed|peek` por container query del propio shell keyed por
  `data-ghc-placement='slide_in'` (paridad overlay↔preview por construcción) · identidad pseudónima
  consent-aware (`visitor.ts`: session siempre, visitor durable solo `consent-state="granted"`;
  headers al render + ingest — cierra el loop con TASK-1428) + guard local de dismiss por sesión ·
  `viewed` visibility-gated (IO ≥50% + dwell 300ms; corte registrado en TRACKING-PLAN §CTAs) +
  ingest Tier B · tokens 2026 (`light-dark()`/`color-mix(in oklch)`/`linear()` con fallbacks
  `@supports`; `--gh-cta-*` intactos; P3 omitido deliberadamente — el accent es token del host) ·
  morph card→form con View Transition (fallback + reduced-motion bypass) · `engineState killed` ⇒
  cero mount · preview `/growth/ctas` con matriz de density + demo vivo + fixtures pairwise.
- **GVC mirado** (scenario `task-1429-growth-cta-interruptive-placement`, 1440+390): density matrix
  correcta (peek=eyebrow+headline+acción; condensed=+body; full=2 columnas), overlay bottom-right
  wide / bottom+safe-area mobile, Escape retira el overlay, spotlight/minimal/unknown-fallback,
  long copy sin clipping. El loop cazó 2 bugs reales pre-merge: destroy cross-instance bajo
  StrictMode (fix: cada instancia remueve SOLO su card) y density rules ancladas a la clase del
  overlay (fix: keyed por placement attr). Frames: `.captures/2026-07-18T14-57-05_task-1429-*`.
- **Tests**: 90 verdes dominio+renderer (nuevos: `slide-in.test.ts` — waiting/no-focus-steal/
  Escape+focus-return/guard/dwell; `visitor.test.ts` — consent gating/opacidad/estabilidad).
- **Pendiente de esta sesión** (orden del operador): push → staging (bundle + regresión embedded +
  E2E interruptivo vía API) → enforcement ON → paso a producción vía release control plane. El
  primer CTA slide_in REAL (surface/copy/trigger) queda como decisión de campaña del operador.

## Delta 2026-07-18

- El contrato de TASK-1428 que esta task consume quedó **code-complete (shadow, sin push)** — cerrado por
  trabajo en TASK-1428. Disponible: decisión server-side `eligible|suppressed|capped|killed` (el renderer
  NO reconstruye ventanas), respuesta pública aditiva `engineState: 'ok'|'killed'`, headers de visitor
  context (`x-greenhouse-cta-visitor/-session/-consent/-consent-source`) que **esta task debe hacer que el
  renderer envíe** (hoy nadie los manda → interruptivos caen al fallback `consent_or_identity_limited`),
  claim atómico interruptivo, y kill switch admin (`/api/admin/growth/ctas/kill-switch`). Gate de rollout
  intacto: el placement interruptivo NO sale a producción con `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED`
  en shadow (ver ledger §Pendientes + arch §24).

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1429-growth-cta-interruptive-placement.md`
- Flow: `docs/ui/flows/TASK-1429-growth-cta-interruptive-placement-flow.md`
- Motion: `docs/ui/motion/TASK-1429-growth-cta-interruptive-placement-motion.md`
- Backend impact: `none`
- Epic: `EPIC-023`
- Status real: `Definida`
- Rank: `3`
- Domain: `ui|growth|public-site`
- Blocked by: `TASK-1428`
- Branch: `task/TASK-1429-growth-cta-interruptive-placement`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende el renderer existente con el primer placement interruptivo oficial, `slide_in`, y formaliza el CTA Experience System portable: separación estricta entre placement, experience kind, appearance, density y experiment variant; anatomía contextual; profundidad visual tokenizada; densidad `full|condensed|peek`; estados ricos; motion placement-aware; y paridad preview↔Think↔WordPress. Cubre foco, Escape/cierre, focus return, reduced motion, safe areas, anti-CLS y recovery sin crear un renderer paralelo.

## Why This Task Exists

El contrato/arbiter ya distingue `slide_in` y `popup_modal`, pero `<greenhouse-cta>` solo monta placements no interruptivos. EPIC-023 exige al menos uno interruptivo; debe nacer después de suppression/frequency cap para no convertirse en un patrón invasivo.

## Goal

- Un `slide_in` reusable, accesible, contextual y gobernado por datos.
- Un contrato explícito de presentación que enriquece el renderer sin convertir campañas en forks visuales.
- Mismo contrato en preview, Think y WordPress; cero política en browser.
- Evidencia GVC desktop/mobile/keyboard/reduced-motion/anti-CLS, densidad, long content, asset failure y estados suppression/action.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `docs/architecture/ui-platform/MOTION.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Reglas obligatorias:

- Reusar `CtaPlacement` y el contrato actual; no crear renderer paralelo.
- `placement` gobierna geometría/interrupción; `styleVariant` gobierna solo appearance; `variantId` sigue reservado para experimentación futura; density se deriva por container query. Nunca intercambiar esos ejes.
- Sin mobile interstitial intrusivo, confirmshaming, countdown falso ni cierre oculto.
- Semántica/foco correcta por placement, Escape y focus return son parte del comportamiento, no polish; focus trap solo existe para un modal real, nunca para `slide_in`.
- El `slide_in` es no modal y usa `role='complementary'`/label apropiado; no declara `aria-modal` ni roba un trap modal. Si el flujo monta un Growth Form que sí tiene contrato modal, ese subflujo conserva su propia semántica.
- Suppression/kill switch de TASK-1428 bloquea el rollout productivo.

## Normative Docs

- `src/growth-cta-renderer/**`
- `src/lib/growth/ctas/contracts.ts`
- `docs/ui/wireframes/TASK-1429-growth-cta-interruptive-placement.md`
- `docs/ui/flows/TASK-1429-growth-cta-interruptive-placement-flow.md`
- `docs/ui/motion/TASK-1429-growth-cta-interruptive-placement-motion.md`

## Dependencies & Impact

### Depends on

- TASK-1428 suppression/frequency/kill switches.
- TASK-1340 renderer y TASK-1427 surfaces productivas.

### Blocks / Impacts

- Cumple el criterio V1 de placement interruptivo.
- Cambia renderer, preview/scenarios y host QA; no cambia API/schema.

### Files owned

- `src/growth-cta-renderer/**`
- preview existente en `src/views/greenhouse/growth/ctas/GrowthCtasGovernanceView.tsx`
- `scripts/frontend/scenarios/task-1429-growth-cta-interruptive-placement.scenario.ts`
- docs UI de esta task

## Current Repo State

### Already exists

- Contract enum, interruptive arbitration, telemetría, content/action, tokens y variants.

### Gap

- `element.ts` ignora/monta solo no interruptivos; no hay shell/foco/motion/GVC interruptivo.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/growth-cta-renderer/**`
- Future candidate home: `ui-package`
- Boundary: browser-safe render contract; host y preview consumen el mismo custom element
- Server/browser split: targeting/suppression server-side; browser solo presenta resultado
- Build impact: bundle renderer existente; sin librería pesada nueva
- Extraction blocker: integración con Growth Form, telemetría y host DOM/CSP

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: visitante público elegible
- Momento del flujo: prompt contextual no inmediato, después del trigger gobernado
- Resultado perceptible esperado: una superficie editorial premium que se percibe como siguiente paso del contenido, entra con continuidad espacial, se adapta a su ancho y mantiene acción/cierre inequívocos
- Friccion que debe reducir: CTA relevante sin perder contexto de página
- No-goals UX: modal de marketing agresivo, múltiples overlays, skins por campaña, glassmorphism ornamental, motion teatral, fake urgency o editor libre de layout

### Surface & system decision

- Surface: `<greenhouse-cta>` en hosts públicos + preview Growth
- Composition Shell: `no aplica` — custom element público
- Primitive decision: `extend` — renderer TASK-1340 con placement funcional `slide_in`; `popup_modal` permanece diferido
- Adaptive density / The Seam: `aplica por principio, no por import` — contrato portable container-aware `full|condensed|peek`, sin importar primitives React/MUI
- Floating/Sidecar/Dialog decision: slide-in no modal, edge-aligned en wide y bottom/safe-area en compact, sin MUI ni drawer host-specific
- Copy source: contrato publicado
- Access impact: `none`

### State inventory

- Default: cerrado hasta trigger elegible; el host no reserva un overlay invisible interactivo
- Loading: no abrir antes de contrato listo
- Empty: no surface
- Error: fail-closed
- Degraded / partial: no abrir si action no resuelve
- Permission denied: n/a
- Long content: wrapping completo dentro del límite de alto; body/footnote nunca ocultan headline, action o dismiss; scroll interno solo si contenido válido excede el viewport y con región accesible
- Mobile / compact: density `peek|condensed`, safe-area, no full-screen engañoso, sin cubrir navegación/formulario esencial; target de cierre y acción ≥44px
- Keyboard / focus: no trap para slide-in; foco no se mueve automáticamente al abrir salvo que el trigger nazca de una acción explícita; Escape cierra y focus return es determinista
- Reduced motion: estado final inmediato o opacity mínima, sin travel ni espera por animation events
- Visual asset present: preview/evidencia explicativa, nunca texto esencial dentro de la imagen
- Visual asset missing/error: remoción del chrome visual y recomposición completa del contenido, sin placeholder roto
- Suppressed/capped/killed: no se monta una superficie focusable ni se reproduce la entrada

### Interaction contract

- Primary interaction: trigger gobernado → reveal una vez → activar una vez o dismiss → persistir estado antes de permitir reapertura
- Hover / focus / active: feedback contenido; lift/sombra solo cuando el appearance lo permite, press confirma recepción sin mover layout
- Pending / disabled: una activación; no reaparece en ventana suprimida
- Escape / click-away: Escape obligatorio; click-away no cierra por defecto para evitar cierres accidentales y métricas ambiguas
- Focus restore: elemento previo o ancla estable
- Latency feedback: no overlay vacío
- Toast / alert behavior: ninguno; error fail-closed

### Motion & microinteractions

- Motion primitive: `CSS` tokenizado en bundle
- Enter / exit: translate+opacity desde borde lógico en wide y desde abajo en compact; salida inversa breve, interrumpible por kill switch/navegación. Mecánica CSS moderna: `@starting-style` + `transition-behavior: allow-discrete` para animar desde/hacia `display:none` sin JS ni listeners de animationend (el estado NUNCA depende del fin de la animación)
- Layout morph: cambio de densidad preserva orden semántico y continuidad; CTA→Growth Form usa continuidad in-place/crossfade dentro del shell cuando el contrato existente lo permite. Enhancement progresivo: same-document **View Transition API** para el morph card→form (shared element continuity) con fallback crossfade y bypass total en reduced-motion — nunca una dependencia dura
- Stagger: máximo eyebrow→headline/body→action como secuencia perceptual sutil solo si los tokens públicos existentes lo soportan sin retrasar primer paint; `none` en reduced motion
- Timing / easing token: contrato motion adjunto; press/settle puede usar curvas `linear()` de sensación física (spring-like sin JS) como token opcional — solo en transform, jamás en opacity/color
- Reduced-motion fallback: sin desplazamiento
- Non-goal motion: bounce, auto-loop, urgencia falsa

### Implementation mapping

- Route / surface: renderer público + preview `/growth/ctas`
- Primitive / variant / kind: `<greenhouse-cta>` / placement `slide_in` / experience kind derivado de metadata gobernada / appearance `default|spotlight|minimal`; `variantId` no participa del layout
- Component candidates: `element.ts`, `render.ts`, `styles.ts`, focus controller local
- Copy source: render contract
- Data reader / command: API pública existente
- API parity: sin cambio; browser pinta resultado arbitrado
- Access / capability: surface binding existente
- States to implement: loading/eligible-waiting/open/focused/pending/form-open/success/error/dismissed/suppressed/capped/killed/reduced-motion + asset failure + long content

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task-1429-growth-cta-interruptive-placement.scenario.ts`
- Route: preview Growth y surface staging
- Viewports: 1440 y 390
- Required steps: trigger; comprobar no focus steal; keyboard primary; Escape; dismiss; intento de reopen; cap; kill switch; action; form handoff; asset failure; long copy; resize container full→condensed→peek
- Required captures: waiting/open/focus-visible/pending/form-open/error-recovered/dismissed/suppressed/capped/killed, full/condensed/peek, asset/no-asset, mobile safe-area y reduced-motion
- Required `data-capture` markers: interruptive shell, close, action
- Assertions: no console/error/login, una sola surface interruptiva, no focus steal, Escape/focus return, action/dismiss ≥44px, headline/action/dismiss nunca desaparecen, no reapertura, asset failure seguro, appearance no cambia action semantics
- Scroll-width checks: obligatorio
- Reduced-motion / focus evidence: obligatorio

### Design decision log

- Decision: `slide_in` es el único nuevo placement V1; la task además canoniza el sistema placement × kind × appearance × density sin agregar un segundo renderer
- Alternatives considered: popup modal; sticky banner; host-specific drawer; una primitive por campaña; usar `styleVariant` o `variantId` para cambiar comportamiento
- Why this pattern: menor interrupción, mejor continuidad con el contenido y un modelo extensible que evita drift semántico/analítico
- Reuse / extend / new primitive: extend
- Open risks: mobile viewport, overlays del host y timing de trigger

### Visual verification

- GVC scenario: `task-1429-growth-cta-interruptive-placement`
- Viewports: 1440/390
- Required captures: estados del scenario
- Required `data-capture` markers: shell/action/close
- Scroll-width check: 0
- Accessibility/focus checks: tab loop, Escape, focus return, labels
- Before/after evidence: embedded baseline vs interruptive
- Known visual debt: ninguna blocker

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Detailed Spec

Implementar `slide_in` como único placement interruptivo V1 y usarlo para cerrar el contrato de experiencia portable descrito en arquitectura §15. El renderer debe interpretar consistentemente placement, experience kind, appearance, density y state; consumir la decisión de elegibilidad de TASK-1428; y validar el mismo contrato en Think, WordPress y preview. El host no define triggers, suppression, foco, density, visual variants ni action routing en paralelo.

### CTA Experience System contract

#### Axes and ownership

| Axis | Owner | Allowed effect | Forbidden effect |
|---|---|---|---|
| Placement | render contract + renderer | geometry, interruption level, safe-area and focus model | campaign copy, destination selection, experiment assignment |
| Experience kind | governed authoring metadata | compatible anatomy/action guidance and preview labeling | browser-side targeting or hidden content injection |
| Appearance (`styleVariant`) | token layer | surface, contrast, emphasis and approved visual asset treatment | focus semantics, suppression, action execution or density |
| Density | renderer/container query | `full|condensed|peek` composition at own width | host breakpoint, clipping or hiding key promise/action |
| Experiment (`variantId`) | future experiment plane | attribution of a governed alternative | visual skin, placement switch or runtime randomization in V1 |

#### Required content anatomy

- Contextual eyebrow is optional and explains provenance/next-step category; never stacks multiple badges.
- Headline is mandatory, self-sufficient and describes the outcome rather than a generic “learn more”.
- Body provides evidence/expectation, remains concise and is never required to understand the action.
- Visual is optional but explanatory; a report preview, artifact or tool cue is valid, stock decoration is not.
- Exactly one primary action is visible. Dismiss remains a neutral control with its own accessible name.
- Footnote may communicate duration, delivery or privacy only when true and sourced; it cannot conceal conditions.

#### Appearance rules

- `default`: restrained layered card; border, tonal surface and subtle elevation.
- `spotlight`: highest emphasis; approved gradient/elevation only, contrast verified, never pulsing or glowing continuously.
- `minimal`: editorial continuation with reduced chrome; still preserves target size, focus, hierarchy and pending/error feedback.
- Unknown appearance fails to `default`; no campaign CSS selectors, arbitrary colors or per-host markup forks.

#### Density rules

- `full`: optional evidence/visual + eyebrow + headline + body + action + optional footnote.
- `condensed`: headline, essential support and action; visual may reduce only if non-essential.
- `peek`: contextual teaser for slide-in with headline, action and visible dismiss; never a clipped `full` card.
- Headline, primary action and dismiss never disappear. Semantic/focus order is invariant across density changes.

#### State and continuity rules

- `loading → ready/open`: no empty overlay, focus steal or CLS.
- `open → pending`: one activation, primary disabled with accessible busy feedback.
- `pending → form_open`: preserve CTA context and move focus to the governed form only after it is ready.
- `form_open → success|error`: success is explicit; error is recoverable without losing visitor context.
- `open → dismissed`: persist dismissal, finish bounded exit, restore focus; persistence does not depend on animation end.
- `suppressed|capped|killed`: no focusable DOM and no entrance replay.
- Kill switch can interrupt any pre-action visual state safely; an already accepted form submission is not rolled back visually as if it failed.

## Scope

### Slice 1 — Presentation contract and placement shell

- Fijar `slide_in` y documentar/mecanizar la separación placement/kind/appearance/density/variant.
- Extender render/styles/state con shell no modal, safe areas, z-index isolation, neutral dismiss y telemetría sin nueva API.
- Mantener `default|spotlight|minimal` como appearances; ningún appearance cambia markup semántico o executor.
- Modernizar la capa de tokens del bundle al piso 2026 SIN romper overrides de host: pares dark via `light-dark()` (reemplaza la duplicación por media query), ramps de hover derivadas con `color-mix(in oklch, …)` (uniformidad perceptual) y acento P3 opcional con fallback sRGB; `text-wrap: balance` (headline) + `text-wrap: pretty` (body). Los nombres `--gh-cta-*` NO cambian (contrato público con hosts).

### Slice 2 — Adaptive density, state richness and motion

- Implementar `full|condensed|peek` por container query, long content y asset failure sin clipping.
- Tokenizar enter/exit, density transition, press/pending, reduced motion y acción→form continuity.
- Cubrir todos los estados contractuales con focus/recovery determinista y sin animation-dependent state.
- **`viewed` visibility-gated (integridad de medición + fluidez):** `greenhouse_cta_viewed` pasa a dispararse cuando el card ES visible (IntersectionObserver ≥50% con dwell corto), no al montar; para el `embedded` below-the-fold la entrada puede ligarse a visibilidad (IO compartido; `animation-timeline: view()` solo como enhancement donde exista soporte, nunca como dependencia). Registrar el corte de semántica en TRACKING-PLAN (baseline TASK-1427) y en el SoT si cambia algún param.

### Slice 3 — Preview matrix and cross-host GVC

- Agregar fixtures que crucen placement, appearance, density, experience kind y estados sin convertirlos en combinatoria infinita: usar pairwise coverage y casos frontera explícitos.
- Probar Think/WordPress/preview, `open_growth_form`, asset/no-asset, long copy, safe-area, forced colors/reduced-motion y unknown appearance fallback.
- Medir overflow, scroll jump, anti-CLS y foco; revisar manualmente frames y dossier GVC.

## Out of Scope

- Nuevos action kinds, powered experimentation, cambios schema/API, popup modal/floating button, múltiples interruptivos simultáneos o editor visual libre.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1428 complete → shell/focus → motion/responsive → preview/GVC → staging → rollout gradual.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Bloquea navegación/foco | UI/a11y | medium | keyboard GVC + Escape/focus return | QA browser |
| Reaparece demasiado | suppression | low | TASK-1428 cap | suppression signal |
| Conflicto z-index/CSS host | public host | medium | isolation + WP/Think smoke | render error |

### Feature flags / cutover

- Reusa engine flag + kill switches/suppression TASK-1428; no flag paralelo del renderer salvo necesidad probada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Renderer | pausar versión/kill switch + revert bundle | <10 min | si |
| Host rollout | retirar binding/placement | <10 min | si |

### Production verification sequence

1. Tests/preview/GVC local.
2. Staging Think+WordPress con suppression.
3. Keyboard/reduced-motion/390px y action smoke.
4. Publicar un CTA allowlisted; monitor siete días.

### Out-of-band coordination required

- Aprobación de surface/copy/trigger para el primer CTA interruptivo.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Un placement interruptivo rinde desde el contrato existente y no desde lógica host.
- [ ] `slide_in` es no modal, no roba foco al aparecer y tiene Escape, cierre visible, teclado y focus return correctos en desktop/mobile.
- [ ] Placement, experience kind, appearance, density y experiment variant permanecen separados en contrato, código, preview y telemetría.
- [ ] `default|spotlight|minimal` actúan como appearances tokenizadas; unknown fallback es `default` y ninguna cambia semántica/action.
- [ ] Density `full|condensed|peek` depende del contenedor, no del host; headline/action/dismiss nunca desaparecen ni se simulan por clipping.
- [ ] Loading, open, focused, pending, form-open, success, error recovery, dismissed, suppressed, capped y killed están implementados/evidenciados.
- [ ] Asset explicativo se integra sin image-only text; asset missing/error degrada sin layout roto.
- [ ] Reduced motion elimina desplazamiento decorativo y conserva estado.
- [ ] Suppression/kill switch impiden reapertura indebida y permiten retiro sin deploy.
- [ ] CTA→Growth Form y telemetría funcionan sin duplicar form/schema/consent.
- [ ] GVC 1440/390 y anchos de contenedor representativos fue mirado; overflow 0, safe-area, scroll jump y anti-CLS están documentados.
- [ ] Enter/exit usan `@starting-style`/`allow-discrete` (estado nunca depende de animationend); el morph card→form con View Transition API es enhancement con fallback y reduced-motion bypass.
- [ ] `greenhouse_cta_viewed` es visibility-gated (IO ≥50%) con el corte de semántica registrado en TRACKING-PLAN; tokens modernizados (`light-dark()`, `color-mix(in oklch)`) sin renombrar `--gh-cta-*`.
- [ ] `pnpm task:lint --task TASK-1429` y wireframe/flow/motion/readiness pasan.

## Verification

- `pnpm exec vitest run src/growth-cta-renderer src/lib/growth/ctas`
- `pnpm task:lint --task TASK-1429`
- `pnpm ui:wireframe-check --task TASK-1429`
- `pnpm ui:flow-check --task TASK-1429`
- `pnpm ui:motion-check --task TASK-1429`
- `pnpm ui:readiness-check --task TASK-1429`
- `pnpm fe:capture task-1429-growth-cta-interruptive-placement --env=staging`

## Closing Protocol

- [ ] Lifecycle/carpeta/README/registry/EPIC-023 sincronizados.
- [ ] UI architecture/manual/Handoff/changelog actualizados según docs governor.
- [ ] QA Release Auditor + enterprise UI review sin blockers.
- [ ] Chequeo de impacto cruzado completado.
- [ ] Skill `greenhouse-growth-ctas` actualizada en el MISMO change set (Skill Maintenance Contract: estado de rollout, contratos, hard rules que cambien).

## Follow-ups

- Experimentación permanece deferred post-V1.
