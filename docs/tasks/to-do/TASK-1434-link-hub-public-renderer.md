# TASK-1434 — Link Hub public renderer

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1434-link-hub-public-renderer.md`
- Flow: `docs/ui/flows/TASK-1434-link-hub-public-renderer-flow.md`
- Motion: `docs/ui/motion/TASK-1434-link-hub-public-renderer-motion.md`
- Backend impact: `none`
- Epic: `EPIC-030`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|ui`
- Blocked by: `TASK-1433`
- Branch: `task/TASK-1434-link-hub-public-renderer`
- Legacy ID: `none`
- GitHub Issue: `n/a`

## Summary

Construye el renderer público mobile-first que sirve la proyección publicada de `growth.link_hub` en `links.efeoncepro.com/<slug>` y custom hosts. Debe sentirse enteramente de la marca, cargar rápido dentro de Instagram/TikTok, preservar accesibilidad y emitir intents/event hooks sin importar lógica de dominio ni dependencias del portal autenticado.

## Why This Task Exists

El renderer es el producto que verá la audiencia social, pero no puede convertirse en otro CMS. Debe ser un consumer tonto del projection contract, con estados honestos, sanitización ya resuelta server-side y brand pack como dato. Un render MUI/Vuexy o un fork por cliente dañaría performance, white-label y extracción futura.

## Goal

- Entregar una página usable a 390 px, keyboard/screen-reader safe y sin overflow.
- Renderizar Efeonce y clientes con el mismo component tree y distinto payload.
- Mantener draft/preview/public parity mediante un solo renderer.
- Verificar navegadores in-app y degradación sin dejar la bio en blanco.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_LINK_HUB_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Consumir `LinkHubPublishedProjection`; no DB/store/auth/provider en Client Components.
- Brand pack es input; cero AXIS/Greenhouse chrome obligatorio en páginas cliente.
- No Composition Shell: single-column public document sin regiones/morph; carve-out explícito.
- No page builder/HTML/JS arbitrario ni lógica de publish/domains en renderer.
- Motion no trivial fuera de scope; focus/hover/pending usan CSS/reduced-motion safe.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/wireframes/TASK-1434-link-hub-public-renderer.md`
- `DESIGN.md` sólo para reglas técnicas compartidas; la identidad visible viene del brand pack público.

## Dependencies & Impact

### Depends on

- `TASK-1433` projection/version contract.
- Renderer portable de Growth Forms para block `growth_form`.

### Blocks / Impacts

- Bloquea `TASK-1438` y aporta runtime a `TASK-1436/1437`.

### Files owned

- `src/components/growth/link-hub/public/**`
- ruta pública Next.js que resuelva `links.efeoncepro.com/<slug>` dentro de la topología vigente
- `scripts/frontend/scenarios/link-hub-public.scenario.ts`
- `src/lib/copy/growth.ts`

## Current Repo State

### Already exists

- Public route patterns, portable Growth Forms renderer, GVC, theme/asset helpers y Vercel deployment.

### Gap

- No hay route/component para el projection Link Hub ni QA in-app browser.

## Modular Placement Contract

- Topology impact: `public`
- Current home: public route/component dentro de `greenhouse-eo`, sin deployable nuevo.
- Future candidate home: `public`
- Boundary: `LinkHubPublishedProjection` entra; intents/events salen; no imports server-only en browser.
- Server/browser split: server resuelve host/slug y projection; browser renderiza/telemetría allowlisted.
- Build impact: `none`; no MUI/Vuexy/SDK nuevo en bundle público.
- Extraction blocker: hostname routing/cache y acceso al projection contract de Greenhouse.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante desde Instagram/TikTok.
- Momento del flujo: abre bio link y elige destino.
- Resultado perceptible esperado: reconoce marca y completa un tap sin fricción.
- Friccion que debe reducir: páginas lentas/genéricas, targets pequeños, branding ajeno y enlaces ambiguos.
- No-goals UX: feed social, navegación portal, personalización libre.

### Surface & system decision

- Surface: public route `links.efeoncepro.com/<slug>` / custom host.
- Composition Shell: `no aplica` — documento público single-column sin regiones.
- Primitive decision: `one-off` de dominio reusable por payload; no nueva primitive AXIS.
- Adaptive density / The Seam: `aplica` — blocks nuevos responden a su contenedor con full/condensed/peek honestos donde corresponda.
- Floating/Sidecar/Dialog decision: none.
- Copy source: `src/lib/copy/growth.ts` para fallbacks; contenido desde projection.
- Access impact: `none` para published; preview separado.

### State inventory

- Default: brand header + featured + links + social/contact + footer.
- Loading: skeleton mínimo si no hay server render inmediato.
- Empty: página publicada sin blocks accionables, con recuperación.
- Error: unavailable seguro; nunca raw error/login.
- Degraded / partial: block inválido omitido y señal; otros links operan.
- Permission denied: n/a pública.
- Long content: clamps/límites definidos en contract; no text clipping engañoso.
- Mobile / compact: 390 primary, safe-area e in-app viewport.
- Keyboard / focus: DOM order, focus visible, icon labels, skip link.
- Reduced motion: contenido completo sin transitions.

### Interaction contract

- Primary interaction: activar link/CTA externo.
- Hover / focus / active: estados tokenizados por brand contrast-safe.
- Pending / disabled: link no válido no se publica; form owns pending.
- Escape / click-away: n/a.
- Focus restore: Growth Form según su contract.
- Latency feedback: browser navigation native; form feedback reused.
- Toast / alert behavior: sin toast para navegación; error inline para form.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: none non-trivial.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: theme/browser defaults sólo si aplica.
- Reduced-motion fallback: no transition.
- Non-goal motion: cinematic/scroll/animated backgrounds.

### Implementation mapping

- Route / surface: public hostname/path resolver de TASK-1433.
- Primitive / variant / kind: `LinkHubRenderer` domain component + typed block kinds.
- Component candidates: paths owned.
- Copy source: `src/lib/copy/growth.ts` + projection.
- Data reader / command: public projection reader; no commands.
- API parity: renderer/preview/E2E consume mismo projection.
- Access / capability: anonymous published read; preview separate.
- States to implement: ready/loading/empty/partial/error/long/mobile.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/link-hub-public.scenario.ts`
- Route: fixture local/staging.
- Viewports: 390 + 1440.
- Required steps: load, keyboard, external fixture, form, empty/error.
- Required captures: ready, long, partial, form, empty/error.
- Required `data-capture` markers: wireframe ledger.
- Assertions: H1, labels, no overflow/login/raw error, allowlisted href.
- Scroll-width checks: `scrollWidth <= clientWidth` both viewports.
- Reduced-motion / focus evidence: keyboard path + reduced motion capture.

### Design decision log

- Decision: semantic single-column renderer, brand pack input, no portal DS bundle.
- Alternatives considered: MUI/Vuexy, page builder, per-client components.
- Why this pattern: best fit for in-app mobile job and white-label.
- Reuse / extend / new primitive: domain component; reuse Growth Forms.
- Open risks: real device in-app browser behavior.

### Visual verification

- GVC scenario: `link-hub-public`.
- Viewports: 390/1440 + real in-app smoke in pilot.
- Required captures: defined above.
- Required `data-capture` markers: wireframe ledger.
- Scroll-width check: mandatory.
- Accessibility/focus checks: axe/keyboard/zoom/contrast per brand fixture.
- Before/after evidence: n/a new surface; approved baseline promoted after review.
- Known visual debt: none accepted before pilot.

<!-- ZONE 2 intentionally empty -->

<!-- ZONE 3 -->

## Scope

### Slice 1 — Renderer core and brand contract

- Implement semantic block registry/component tree and theme variables from projection.
- Reuse Growth Forms block; add public fallback states/copy.

### Slice 2 — Route, cache and event seam

- Wire host/path projection resolution and cache/version behavior without domain provider logic.
- Emit page/click hooks defined by TASK-1437 while remaining safe if analytics is unavailable.

### Slice 3 — Visual and in-app QA

- GVC desktop/mobile, accessibility, performance, overflow and long-content suite.
- Prepare real-device Instagram/TikTok checklist for TASK-1438.

## Out of Scope

- Authoring UI, DNS/TLS provisioning, analytics storage, profile mutation, indexación SEO, custom JS/commerce.

## Detailed Spec

The renderer must render the same projection in public and cockpit preview. External links use safe `rel`/target policy by kind; icon-only controls require labels. A failed analytics call never blocks navigation.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Core -> route/event seam -> GVC/in-app QA.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| in-app viewport rompe layout | UI | medium | 390/safe-area/real-device smoke | GVC/overflow failure |
| branding cliente contamina estructura | UI | medium | token allowlist + contrast gates | visual QA |
| analytics bloquea tap | public | low | fire-and-forget/fail-open navigation | click latency/error |
| bundle pesado | public | medium | no MUI/Vuexy; budget | performance gate |

### Feature flags / cutover

- Consume `GROWTH_LINK_HUB_ENABLED`; no public page live until TASK-1438.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert component | <1 h | sí |
| 2 | flag OFF/route fallback | <15 min | sí |
| 3 | no cutover until pass | inmediato | sí |

### Production verification sequence

1. Local fixtures/GVC.
2. Staging projection + mobile/perf/a11y.
3. Production deploy flag OFF.
4. TASK-1438 opens allowlisted Efeonce page.

### Out-of-band coordination required

Real-device owners for Instagram/TikTok smoke in TASK-1438.

<!-- ZONE 4 -->

## Acceptance Criteria

- [ ] Wireframe exists and `pnpm ui:wireframe-check --task TASK-1434` passes.
- [ ] UI ready remains `no` until mapping/GVC/decision log and task lint are green.
- [ ] Same projection renders Efeonce and client fixtures with no conditional per brand.
- [ ] GVC 390/1440, no page horizontal scroll, keyboard/focus/contrast/reduced-motion pass.
- [ ] Renderer imports no server-only/store/provider/MUI/Vuexy dependency into browser bundle.
- [ ] Empty/partial/error never expose login or internals and previous published page remains available on control-plane failure.

## Verification

- `pnpm task:lint --task TASK-1434`
- `pnpm ui:wireframe-check --task TASK-1434`
- `pnpm ui:readiness-check --task TASK-1434`
- `pnpm fe:capture link-hub-public --env=staging`
- focused tests + performance/accessibility/scrollWidth checks

## Closing Protocol

- [ ] Lifecycle/carpeta/index/Handoff/changelog sincronizados.
- [ ] GVC evidence mirada y baseline decision documentada.
- [ ] `pnpm qa:gates --changed` y `pnpm docs:closure-check` ejecutados.

## Follow-ups

- `TASK-1436`, `TASK-1437`, `TASK-1438`.

## Open Questions

- Ninguna arquitectónica; safe-area/browser quirks se resuelven con evidencia en implementación.
