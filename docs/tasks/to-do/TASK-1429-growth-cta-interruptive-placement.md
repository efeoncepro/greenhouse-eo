# TASK-1429 — Growth CTA interruptive placement

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
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

Extiende el renderer existente con un primer placement interruptivo oficial —preferentemente `slide_in`, salvo evidencia de discovery a favor de `popup_modal`— usando el contrato ya soportado. Cubre foco, Escape/cierre, focus return, reduced motion, mobile, anti-CLS y paridad preview↔público.

## Why This Task Exists

El contrato/arbiter ya distingue `slide_in` y `popup_modal`, pero `<greenhouse-cta>` solo monta placements no interruptivos. EPIC-023 exige al menos uno interruptivo; debe nacer después de suppression/frequency cap para no convertirse en un patrón invasivo.

## Goal

- Un placement interruptivo reusable, accesible y gobernado por datos.
- Mismo contrato en preview, Think y WordPress; cero política en browser.
- Evidencia GVC desktop/mobile/keyboard/reduced-motion/anti-CLS.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `docs/architecture/ui-platform/MOTION.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Reglas obligatorias:

- Reusar `CtaPlacement` y el contrato actual; no crear renderer paralelo.
- Sin mobile interstitial intrusivo, confirmshaming, countdown falso ni cierre oculto.
- Focus trap/return y Escape son parte del comportamiento, no polish.
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
- Resultado perceptible esperado: superficie clara, cerrable y no invasiva
- Friccion que debe reducir: CTA relevante sin perder contexto de página
- No-goals UX: modal de marketing agresivo, múltiples overlays o rediseño embedded

### Surface & system decision

- Surface: `<greenhouse-cta>` en hosts públicos + preview Growth
- Composition Shell: `no aplica` — custom element público
- Primitive decision: `extend` — renderer TASK-1340, placement `slide_in|popup_modal`
- Adaptive density / The Seam: container queries existentes + límites compact
- Floating/Sidecar/Dialog decision: floating/dialog semantics dentro del renderer, sin MUI
- Copy source: contrato publicado
- Access impact: `none`

### State inventory

- Default: cerrado hasta trigger elegible
- Loading: no abrir antes de contrato listo
- Empty: no surface
- Error: fail-closed
- Degraded / partial: no abrir si action no resuelve
- Permission denied: n/a
- Long content: max-height/scroll interno accesible
- Mobile / compact: no full-screen engañoso; target de cierre ≥44px
- Keyboard / focus: trap, Escape, return
- Reduced motion: aparición instantánea/opacity mínima

### Interaction contract

- Primary interaction: abrir por trigger → CTA/form o cerrar
- Hover / focus / active: foco visible
- Pending / disabled: una activación; no reaparece en ventana suprimida
- Escape / click-away: Escape obligatorio; click-away según decisión de flow
- Focus restore: elemento previo o ancla estable
- Latency feedback: no overlay vacío
- Toast / alert behavior: ninguno; error fail-closed

### Motion & microinteractions

- Motion primitive: `CSS` tokenizado en bundle
- Enter / exit: transform+opacity breve para slide-in; dialog fade/scale si se elige modal
- Layout morph: none
- Stagger: none
- Timing / easing token: contrato motion adjunto
- Reduced-motion fallback: sin desplazamiento
- Non-goal motion: bounce, auto-loop, urgencia falsa

### Implementation mapping

- Route / surface: renderer público + preview `/growth/ctas`
- Primitive / variant / kind: extend `<greenhouse-cta>` placement interruptivo
- Component candidates: `element.ts`, `render.ts`, `styles.ts`, focus controller local
- Copy source: render contract
- Data reader / command: API pública existente
- API parity: sin cambio; browser pinta resultado arbitrado
- Access / capability: surface binding existente
- States to implement: closed/open/action/error/reduced-motion/mobile

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task-1429-growth-cta-interruptive-placement.scenario.ts`
- Route: preview Growth y surface staging
- Viewports: 1440 y 390
- Required steps: trigger, focus loop, Escape, reopen/suppression, action
- Required captures: closed/open/focused/mobile/reduced-motion
- Required `data-capture` markers: interruptive shell, close, action
- Assertions: no console/error/login, one surface, foco contenido/restaurado
- Scroll-width checks: obligatorio
- Reduced-motion / focus evidence: obligatorio

### Design decision log

- Decision: preferir `slide_in` como primer interruptivo salvo discovery contrario
- Alternatives considered: popup modal; sticky banner; host-specific drawer
- Why this pattern: menor interrupción y prueba el eje interruptivo
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

Hacer discovery breve y elegir un solo variant oficial —`slide_in` por defecto—, extender el placement registry/renderer existente, consumir la decisión de elegibilidad de TASK-1428 y validar el mismo contrato en Think, WordPress y preview. El host no define triggers, suppression, foco ni action routing en paralelo.

## Scope

### Slice 1 — Placement shell

- Resolver `slide_in` vs `popup_modal` con evidencia y extender render/styles/state.
- Implementar semantics, foco, cierre y telemetría sin nueva API.

### Slice 2 — Motion, responsive and host hardening

- Tokenizar enter/exit, reduced motion, z-index/containment y compact behavior.
- Probar compatibilidad Think/WordPress y action `open_growth_form`.

### Slice 3 — Preview and GVC

- Agregar fixture/preview y scenario desktop/mobile/keyboard/reduced-motion.
- Medir overflow y anti-CLS; revisar frames.

## Out of Scope

- Nuevos action kinds, experimentación, cambios schema/API o múltiples interruptivos simultáneos.

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
- [ ] Focus trap/return, Escape, cierre visible y teclado pasan desktop/mobile.
- [ ] Reduced motion elimina desplazamiento decorativo y conserva estado.
- [ ] Suppression/kill switch impiden reapertura indebida y permiten retiro sin deploy.
- [ ] CTA→Growth Form y telemetría funcionan sin duplicar form/schema/consent.
- [ ] GVC 1440/390 mirado, overflow 0 y anti-CLS documentado.
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

## Follow-ups

- Experimentación permanece deferred post-V1.
