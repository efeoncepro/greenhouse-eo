# TASK-1045 — Greenhouse Motion Primitive (GSAP engine base)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Implementación — Slice 0`
- Rank: `TBD`
- Domain: `ui|platform|design-system|motion`
- Blocked by: `none`
- Branch: `develop (local-first, sin push hasta autorización del operador)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Promueve el plumbing GSAP huérfano (`src/libs/GSAP.tsx` + `GSAPScrollTrigger.tsx`, hoy importados por nadie) a una **primitiva de motion canónica y gobernada**, consumible desde el design system y portable a otras apps. La primitiva tiene 3 anillos: un **núcleo portable** (registro idempotente de plugins, tokens en segundos + `CustomEase` desde los cubic-bézier canónicos, `prefers-reduced-motion` horneado, hook `useGreenhouseGSAP` sobre `@gsap/react`), un **binding Greenhouse** (lee los motion tokens del SoT del theme) y un **componente declarativo `<Motion variant kind>`** que cubre el 90% de las surfaces sin GSAP imperativo. Un **lint rule** prohíbe importar `gsap` fuera del módulo (espeja `no-direct-floating-ui-in-views`). Cierra con una página viva en `/admin/design-system/motion`.

## Why This Task Exists

GSAP (`gsap@3.15` + `@gsap/react@2.1`) está instalado pero **no hay primitiva**: los dos archivos en `src/libs/` solo re-exportan `gsap`/`ScrollTrigger` con cero tokens, cero `prefers-reduced-motion`, cero garantía de cleanup, cero variantes y **cero boundary** — y nadie los importa. Si empezamos a animar surfaces así, cada vista importaría `gsap` directo, sin reduced-motion, sin parity de tokens CSS↔GSAP, replicando el anti-patrón de "librería de animación suelta en cada componente". El operador quiere una base **primigenia** (robusta, replicable, escalable) que sirva como fundación para esta app y para otras. La decisión arquitectónica es **no crear un sistema paralelo**: promover el plumbing existente a primitiva canónica que consume los motion tokens que el design system ya define (escala fija `{75,150,200,300,400,600}ms` + easing emphasized `cubic-bezier(0.2,0,0,1)`).

## Goal

- Núcleo portable de motion (anillo 0) con reduced-motion no-bypassable, SSR-safe y cleanup garantizado, reusable en otras apps pasándoles sus tokens.
- Primitiva `<Motion>` con variants oficiales `entrance·stagger·scrollReveal·timeline` y resolver `kind→variant`; hook `useGreenhouseGSAP` como escape hatch imperativo.
- Boundary enforced por lint rule `greenhouse/no-direct-gsap-in-views`: solo el módulo motion puede `import gsap`.
- Motion tokens como SoT gobernado (3 capas: DESIGN.md §Motion + V1 + runtime) con drift-guard, parity CSS↔GSAP.
- Página viva `/admin/design-system/motion` (interna, gated) que documenta variants + tokens + toggle reduced-motion, verificada con loop GVC.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` (metodología Primitive + Variants + Kinds)
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md` (precedente de boundary + lint rule `no-direct-floating-ui-in-views`)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` + `DESIGN.md` (motion tokens; parity de 3 capas)
- `src/components/theme/typography-tokens.ts` (precedente del SoT con drift-guard)

Reglas obligatorias:

- **Primitive + Variants + Kinds**: una primitiva (`<Motion>`) que owns layout-neutral wrapper, a11y, responsive, reduced-motion, cleanup, GVC hooks; variants = modos funcionales (no skins); kinds = semánticos de dominio que resuelven a una variant.
- **GSAP NO reemplaza CSS**: hover/tap/toggle/focus = CSS Tier 1 (ya en el theme). GSAP es para el tier cinemático/orquestado/scroll. No GSAP-ear un hover.
- **3-layer parity de tokens**: cualquier token nuevo se mueve en DESIGN.md + V1 + runtime juntos (CI `pnpm design:lint`).
- **reduced-motion horneado, no opt-in**: vive dentro del `gsap.matchMedia` del núcleo; ninguna surface puede saltárselo.
- **Solo props de compositor** (`transform`/`opacity`/`filter`/`clip-path`). Nunca `width/height/top/left/margin/padding`.
- **Degradación honesta**: contenido visible por CSS por defecto; `from()` anima la entrada; si el JS falla, el contenido queda visible (nunca el trap `opacity:0`-para-siempre).
- **VIEW interna**: la página del design system es INTERNA (gated por viewCode `administracion.design_system`), nunca client-facing. Agregar viewCode a `VIEW_REGISTRY` requiere migración seed en el mismo PR (TASK-827) y ruta `(dashboard)` alcanzable por nav (TASK-982).

## Normative Docs

- `CLAUDE.md` — secciones "Metodologia UI canonica — Primitive + Variants + Kinds", "Patron canonico Floating Surface" (modelo del boundary), "Typography System — SoT + drift-guard".
- `AGENTS.md` — hook UI obligatorio (skills product design + GVC en loop).

## Dependencies & Impact

### Depends on

- `gsap@3.15` + `@gsap/react@2.1` (ya instalados).
- Motion tokens del design system (escala fija ya definida en governance).
- Ruta `/admin/design-system` + viewCode `administracion.design_system` (ya existen, TASK-1034).

### Blocks / Impacts

- Habilita motion cinemático/orquestado consistente en cualquier surface futura (heros, reveals, KPIs, onboarding).
- `framer-motion@12` coexiste por ahora — consolidación (¿retirar framer-motion?) queda como **follow-up explícito**, fuera de scope.
- Jubila/absorbe `src/libs/GSAP.tsx` + `src/libs/GSAPScrollTrigger.tsx` (huérfanos).

### Files owned

- `src/components/greenhouse/motion/**` (núcleo + primitiva + variants + binding)
- `src/components/theme/motion-tokens.ts` (SoT) + `motion-tokens.test.ts` (drift-guard)
- `eslint-plugins/greenhouse/rules/no-direct-gsap-in-views.mjs` (+ tests)
- `src/app/(dashboard)/admin/design-system/motion/page.tsx`
- `src/views/greenhouse/admin/design-system/MotionLabSection.tsx`
- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md` (ADR)
- `DESIGN.md` §Motion + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §Motion

### Current Repo State

#### Already exists

- `gsap@3.15`, `@gsap/react@2.1`, `framer-motion@12` en `package.json`.
- `src/libs/GSAP.tsx` (registra `useGSAP`) + `src/libs/GSAPScrollTrigger.tsx` (registra `ScrollTrigger`) — **importados por nadie**.
- `src/components/greenhouse/motion/ViewTransitionLink.tsx` (View Transitions API, no GSAP).
- `/admin/design-system` con sub-páginas (charts/chips/loaders/microinteractions/typography/...) gated por viewCode + redirect cliente; patrón `page.tsx → *Section.tsx` en `src/views/greenhouse/admin/design-system/`.
- `src/components/theme/typography-tokens.ts` (precedente del SoT + drift-guard).

#### Gap

- No hay primitiva de motion: sin tokens GSAP, sin reduced-motion, sin variants, sin boundary, sin parity CSS↔GSAP, sin página de ejemplos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Motion tokens (SoT) + núcleo portable

- `src/components/theme/motion-tokens.ts`: duraciones en **ms** (CSS) y **segundos** (GSAP) desde una sola fuente; 4 eases canónicos como `cubic-bezier`; nombres de `CustomEase` registrados. Parity con la escala fija del design system.
- `src/components/greenhouse/motion/core/`: registro idempotente de plugins (`useGSAP` + `CustomEase`), inyección de tokens, `prefers-reduced-motion` horneado vía `gsap.matchMedia`, hook `useGreenhouseGSAP(callback, scopeRef, deps)` sobre `@gsap/react` (cleanup + SSR-safe + StrictMode-safe). Cero deps de dominio Greenhouse (portable).
- `motion-tokens.test.ts` drift-guard (espejo de `typography-drift.test.ts`) + tests del núcleo (reduced-motion, registro idempotente).
- Sin UI todavía.

### Slice 1 — Primitiva `<Motion>` + variants + resolver kind→variant

- `<Motion variant kind>` (la Primitive): owns wrapper, a11y, reduced-motion, cleanup, GVC hooks.
- Variants V1: `entrance` · `stagger` · `scrollReveal` · `timeline`.
- Resolver `kind→variant` (ej. `heroIntro→timeline`, `listMount→stagger`, `sectionReveal→scrollReveal`, `kpiCountUp→timeline`).
- Lazy-load de plugins pesados (ScrollTrigger) por variant.
- Tests: reduced-motion por variant, cleanup, degradación honesta, resolver.

### Slice 2 — Boundary (lint rule) + jubilación de huérfanos

- `eslint-plugins/greenhouse/rules/no-direct-gsap-in-views.mjs` (modo `error`): solo `src/components/greenhouse/motion/**` puede `import 'gsap'` / `@gsap/react` / `gsap/*`.
- Override block en `eslint.config.mjs` exime el módulo motion + el rule + sus tests.
- Absorber/jubilar `src/libs/GSAP.tsx` + `GSAPScrollTrigger.tsx` (re-export desde el núcleo o eliminar).

### Slice 3 — Página viva `/admin/design-system/motion`

- `page.tsx` (mismo gate que las otras sub-páginas) + `MotionLabSection.tsx`.
- Cada variant en vivo + tabla de tokens (durations/eases) + toggle reduced-motion + snippet por variant.
- Entrada en nav del design system (alcanzable, TASK-982). Loop GVC (`pnpm fe:capture`) hasta verse enterprise.

### Slice 4 — Docs + governance

- DESIGN.md §Motion + V1 §Motion (parity 3 capas, `pnpm design:lint` 0/0).
- ADR `GREENHOUSE_MOTION_PRIMITIVE_V1.md`.
- Doctrina en CLAUDE.md (sección "Patrón canónico Motion Primitive", espejo de Floating Surface) + AGENTS.md.

## Out of Scope

- **Retirar `framer-motion`** — coexiste; consolidación es follow-up con su propia task.
- Variants `counter` / `splitText` / `parallax` / `pointer` (quickTo) — V1.1, no ahora.
- Migrar surfaces existentes a `<Motion>` — esta task entrega la primitiva + el museo, no un sweep de adopción.
- View Transitions (`ViewTransitionLink`) — pertenece a otro tier, no se toca.
- Extracción a paquete npm `@efeonce/motion` — el núcleo se diseña portable, pero la extracción real es follow-up.

## Detailed Spec

**Anillos**:

```
Anillo 0  motion/core/        PORTABLE (cero deps Greenhouse)
          · registerMotionPlugins() idempotente (useGSAP + CustomEase)
          · motion tokens en segundos + CustomEase desde cubic-bezier canónicos
          · withReducedMotion(): wrapper gsap.matchMedia con rama reduce → snap/duración 0
          · useGreenhouseGSAP(cb, scopeRef, deps) → @gsap/react useGSAP (cleanup/SSR/StrictMode)
Anillo 1  motion/tokens.ts    binding: lee motion-tokens del SoT del theme
Anillo 2  motion/Motion.tsx   <Motion variant kind> + resolver kind→variant
```

**Reduced-motion (contrato)**: rama `reduce` del `matchMedia` → entrances se vuelven cross-fade/snap (opacity-only, duración ~0), scroll-reveal aparece sin desplazamiento, timelines colapsan a estado final. Loaders/spinners esenciales se mantienen. No-bypassable.

**Degradación honesta**: el contenido se renderiza visible por CSS; `<Motion variant='entrance'>` usa `from()` para animar la entrada. Si el JS no corre, el contenido queda visible. No usar `opacity:0` en CSS esperando que GSAP lo revele.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (tokens + núcleo) → Slice 1 (primitiva, consume núcleo) → Slice 2 (lint rule, depende de que el módulo exista) → Slice 3 (página, consume primitiva) → Slice 4 (docs).
- Slice 2 puede correr en paralelo con Slice 3 una vez que Slice 1 cerró.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| FOUC / contenido oculto si JS falla | UI | low | Degradación honesta (contenido visible por CSS; `from()` anima) | no signal — emerge en QA/GVC |
| reduced-motion ignorado | UI / a11y | low | reduced-motion horneado en el núcleo (no opt-in) + test por variant | no signal — emerge en review a11y |
| GSAP importado fuera del módulo | UI / platform | medium | lint rule `no-direct-gsap-in-views` (error) en CI | falla de CI lint |
| Drift de tokens CSS↔GSAP↔DESIGN.md | design-system | medium | drift-guard test + `pnpm design:lint` | falla de CI |
| Bundle: plugins cargados siempre | web-perf | low | lazy-load de ScrollTrigger por variant; base solo core GSAP | no signal — emerge en bundle analysis |

### Feature flags / cutover

- Sin flag — additive. La primitiva no cambia comportamiento de surfaces existentes (nadie consume GSAP hoy). Cutover inmediato; la adopción es opt-in por surface.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | revert PR (módulo additive) | <5 min | sí |
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | bajar lint rule a `warn` o revert | <5 min | sí |
| Slice 3 | quitar sub-página + nav entry | <5 min | sí |
| Slice 4 | revert docs | <5 min | sí |

### Production verification sequence

1. `pnpm local:check` + tests focales por slice (lint + tsc + vitest del módulo motion).
2. Slice 3: `pnpm fe:capture --route=/admin/design-system/motion --env=local` + leer frame PNG (loop hasta enterprise) + reduced-motion check.
3. `pnpm test` full suite + `pnpm build` antes de declarar la task complete (gate canónico TASK-827).

### Out-of-band coordination required

- N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Núcleo portable con `useGreenhouseGSAP`, reduced-motion horneado, SSR-safe, cleanup garantizado; cero deps de dominio Greenhouse.
- [ ] `motion-tokens.ts` SoT con parity CSS↔GSAP↔DESIGN.md + drift-guard test verde.
- [ ] `<Motion>` con variants `entrance·stagger·scrollReveal·timeline` + resolver `kind→variant`; hook como escape hatch.
- [ ] Lint rule `greenhouse/no-direct-gsap-in-views` (error) bloquea import de gsap fuera del módulo; huérfanos `src/libs/GSAP*.tsx` jubilados/absorbidos.
- [ ] Página `/admin/design-system/motion` viva, gated, alcanzable por nav, GVC enterprise verde.
- [ ] DESIGN.md §Motion + V1 + ADR + CLAUDE.md/AGENTS.md sincronizados; `pnpm design:lint` 0/0.
- [ ] `pnpm test` + `pnpm build` verdes.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm design:lint`
- `pnpm build`
- GVC: `pnpm fe:capture --route=/admin/design-system/motion`
