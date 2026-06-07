# GREENHOUSE_MOTION_PRIMITIVE_V1

> **Tipo:** ADR / spec de primitiva UI
> **Estado:** Accepted — V1.0 (2026-06-07, TASK-1045)
> **Owner:** Platform UI
> **Relacionados:** `GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`, `GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md` (precedente de boundary + lint rule), `GREENHOUSE_DESIGN_TOKENS_V1.md` §9 (motion tokens), `DESIGN.md` §Motion.

## Decisión

La animación del tier **cinemático / orquestado / scroll** de Greenhouse corre sobre **GSAP** detrás de una **primitiva canónica gobernada** en 3 anillos. Las superficies de producto **NUNCA** importan `gsap` directo — consumen `<Motion>` (declarativo) o `useGreenhouseGSAP` (escape hatch imperativo). El boundary lo enforce el lint rule `greenhouse/no-direct-gsap-in-views` (modo `error`), espejo del patrón de Floating Surface (TASK-1033).

GSAP **no reemplaza CSS**: hover, tap, toggles y focus simples siguen en CSS Tier 1 (el theme). Tampoco reemplaza el reduced-motion existente: las microinteracciones que ya usan `useReducedMotion` de framer-motion + el blanket CSS de `globals.css` quedan intactas — GSAP es una **tercera capa aditiva** con su propio contrato de reduced-motion.

### Alternativas descartadas

- **GSAP suelto en cada surface** — inmantenible, sin tokens, sin reduced-motion, sin cleanup, sin parity CSS↔GSAP. Es el anti-patrón que parió esta task (2 libs huérfanos `src/libs/GSAP*.tsx` que nadie importaba).
- **Solo un hook** — el 90% de los casos (entrance, stagger, reveal) no debería escribir GSAP imperativo. El componente declarativo los cubre; el hook queda como escape hatch.
- **Estandarizar todo en framer-motion / Motion** — framer-motion gana en React/gestures/layout, pero GSAP gana en timelines cinemáticos (5+ elementos), SVG, split-text y ScrollTrigger. Coexisten por diseño (ver §Follow-ups).

## Arquitectura — 3 anillos

```
Anillo 0  src/components/greenhouse/motion/core/   PORTABLE (cero deps Greenhouse)
          · tokens.ts        SoT de valores (durations + eases); seg + CSS DERIVADOS
          · register.ts      ensureMotionRegistered() idempotente (useGSAP + CustomEase)
          · reduced-motion.ts  contrato prefers-reduced-motion (conditions + helper)
          · use-greenhouse-gsap.ts  hook canónico sobre @gsap/react useGSAP
          → este anillo se copia a otras apps; le pasás (u override) sus tokens
Anillo 1  src/components/theme/motion-tokens.ts     binding design-system (re-export)
Anillo 2  src/components/greenhouse/motion/Motion.tsx  <Motion variant kind> declarativo
```

**`useGreenhouseGSAP(build, { scope, dependencies })`** da, gratis: SSR-safe + StrictMode-safe, cleanup automático (`gsap.context().revert()`), y **reduced-motion horneado** vía `gsap.matchMedia` — el callback recibe `ctx.reduced` y DEBE ramificar. No es opt-in: ninguna surface puede saltárselo.

## Primitive + Variants + Kinds

| Capa | Qué es | Valores V1 |
|---|---|---|
| **Primitive** | `<Motion>` — owns scope, a11y, reduced-motion, cleanup, tokens | una sola |
| **Variants** (modos funcionales, solo lo que GSAP justifica) | `entrance` · `stagger` · `scrollReveal` · `timeline` | 4 |
| **Kinds** (semántico → resuelve a variant) | `heroIntro→timeline` · `listMount→stagger` · `sectionReveal→scrollReveal` · `kpiCountUp→timeline` · `panelEnter→entrance` · `cardReveal→scrollReveal` | mapeo |

Shape canónico: `<Motion variant='stagger' kind='listMount'>…</Motion>`. El `timeline` acepta un `build(ctx, tl)` como escape hatch declarativo.

## Tokens (SoT)

Valores (ms, escala fija del design system): `instant 75 · short 150 · standard 200 · medium 300 · long 400 · extended 600`. Eases: `emphasized cubic-bezier(0.2,0,0,1)` (default) · `standard (0.4,0,0.2,1)` · `emphasizedAccelerate (0.3,0,0.8,0.15)` (exits) · `linear`. Los segundos (GSAP) y los strings CSS se **derivan** del SoT en ms (single source — no pueden driftear); las eases se registran como `CustomEase` con paridad exacta vs su `cubic-bezier` CSS. Drift-guard: `motion/core/tokens.test.ts`.

> **Reconciliación de nombres (V1.0):** el `GREENHOUSE_DESIGN_TOKENS_V1.md` §9.1 listaba estos valores con nombres prosa nunca codificados (`micro/longer/page/hero` + `instant=0`). El SoT codificado + drift-guarded es ahora la fuente única; V1 §9 y DESIGN.md §Motion convergen a los nombres del SoT. El antiguo `instant=0` (reduced fallback) es ahora el `reducedDuration` (snap ~75 ms) que aplica el propio primitive.

## Contrato reduced-motion (por variant)

- `entrance` → cross-fade snap, sin desplazamiento.
- `stagger` → aparecen juntos, solo opacidad (stagger 0).
- `scrollReveal` → queda visible, sin animación.
- `timeline` → duraciones colapsadas vía defaults del timeline (el build debería además ramificar en `ctx.reduced`).

**Degradación honesta:** todos los builders usan `gsap.from()` → el estado natural (final) del elemento es el **visible**. Si el JS no corre, el contenido queda visible (nunca el trap `opacity:0`-para-siempre).

## 4 pilares

- **Safety** — reduced-motion no-bypassable (en el núcleo) + lint boundary + SSR-safe + nunca info esencial solo por motion (WCAG 1.4.13).
- **Robustness** — `useGSAP` resuelve cleanup + StrictMode; solo props de compositor (`transform`/`opacity`); degradación honesta.
- **Resilience** — ScrollTrigger se registra lazy solo en `scrollReveal`; un fallo de plugin degrada al estado final.
- **Scalability** — tokens centralizados (cambiás una vez); variants cubren N surfaces sin GSAP per-surface; núcleo portable a otras apps; `quickTo` disponible para alta frecuencia.

## Hard rules (anti-regresión)

- **NUNCA** importar `gsap` / `@gsap/react` / `gsap/*` fuera de `src/components/greenhouse/motion/**`. Lint rule `greenhouse/no-direct-gsap-in-views` (error) lo bloquea. Las surfaces consumen `<Motion>` o `useGreenhouseGSAP`.
- **NUNCA** usar GSAP para hover/tap/toggle/focus simples — eso es CSS Tier 1 (el theme).
- **NUNCA** declarar segundos o strings CSS de duración en paralelo: se derivan del SoT en ms (`motion/core/tokens.ts`).
- **NUNCA** registrar plugins ni escribir cleanup de GSAP en una surface — el núcleo lo hace.
- **NUNCA** dejar contenido oculto por CSS esperando que GSAP lo revele. Contenido visible por defecto + `from()` anima la entrada.
- **NUNCA** animar `width/height/top/left/margin/padding`. Solo `transform`/`opacity`/`filter`/`clip-path`.
- **SIEMPRE** que un cambio de tokens de motion ocurra, mover juntos `motion/core/tokens.ts` + V1 §9 + DESIGN.md §Motion (parity 3 capas) + el drift-guard.
- **SIEMPRE** que emerja una variant nueva, agregarla al registry `VARIANT_BUILDERS` + resolver de kinds + tests (reduced-motion por variant).

## Follow-ups (no en V1)

- **Consolidación framer-motion ↔ GSAP**: hoy coexisten (framer-motion en microinteracciones existentes; GSAP en el tier cinemático). Evaluar unificación es una task derivada — NO parte de V1.
- **Variants V1.1**: `counter`, `splitText`, `parallax`, `pointer` (quickTo).
- **Lazy real de plugins por dynamic import** (hoy ScrollTrigger se importa estático en el módulo de variants).
- **Extracción a paquete** `@efeonce/motion` desde el núcleo portable.
- **Inyección de CSS custom properties** de motion tokens para consumo CSS-only.

## Superficie interna

Museo vivo: `/admin/design-system/motion` (`MotionLabView`), gateado por viewCode `administracion.design_system` (INTERNO, nunca client-facing). Scenario GVC: `design-system-motion`.
