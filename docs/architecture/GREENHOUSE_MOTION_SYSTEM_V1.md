# GREENHOUSE_MOTION_SYSTEM_V1

> **Tipo de documento:** Spec de arquitectura canónica
> **Versión:** 1.0
> **Creado:** 2026-04-26 por Claude (TASK-642)
> **Última actualización:** 2026-04-26
> **Documentación funcional:** `docs/documentation/plataforma/sistema-animaciones-microinteracciones.md`
> **Status:** Vigente — los componentes referenciados se materializan a lo largo del programa TASK-642 (slices 1-5)

---

## 1. Propósito

Definir el sistema canónico de animaciones y microinteracciones del portal Greenhouse: **qué libs usamos, qué tokens existen, qué wrappers reutilizables, qué dimensiones de motion están cubiertas, y cómo extender el sistema a nuevas vistas sin romper coherencia**.

Este documento es la fuente de verdad técnica. Cualquier componente, view o feature que introduzca animaciones debe consumir los tokens y wrappers definidos aquí — no inventar timing/easing inline ni introducir libs nuevas sin actualizar este doc.

## 2. Principios de diseño

| Principio | Implicación práctica |
| --- | --- |
| **Motion sirve al contenido, no al revés** | Las animaciones nunca son fin en sí mismas. Cada animación responde a una intención de UX (continuidad, feedback, jerarquía, atención). Si una animación no tiene intención clara, no va. |
| **Coherencia sobre creatividad** | Toda la superficie del portal usa los mismos tokens (timing, easing, scale). Un hover en `/finance/quotes` debe sentirse igual que un hover en `/people`. |
| **Performance > impresión visual** | Ninguna animación debe causar jank en mobile (LATAM, 3G/4G). Si una animación degrada FPS bajo carga, se simplifica antes de shippearse. |
| **`prefers-reduced-motion` es ley** | Cada animación debe tener fallback explícito para usuarios con reduced motion. El fallback NUNCA es "menos rápido" — es "render directo" (opacity-only fade o nada). |
| **No theatrical** | Sin overshoot bouncing, sin parallax exagerado, sin easter eggs animados, sin elementos que aparecen desde direcciones distintas. Greenhouse es una plataforma operativa enterprise, no un portfolio de diseñador. |
| **Extensible por composición** | Los wrappers (`<GhPageEntrance>`, `<AnimatedCounter>`, etc.) son composicionales. No hay "componentes animados" especiales — se envuelve lo que ya existe. |

## 3. Stack canónico

### 3.1 Libs

| Lib | Versión | Cobertura | Cuándo |
| --- | --- | --- | --- |
| **View Transitions API** (browser nativo) | n/a — Chrome 111+, Safari 18+, Firefox en progreso | Cross-page navigation morphs (list ↔ detail, page ↔ edit) | Todo cambio de ruta con identidad compartida |
| **Framer Motion** | `^12.38` | Page entrance, KPI counters, scroll reveal, stagger, AnimatePresence | Cualquier animación stateful o orchestrada en cliente |
| **`@formkit/auto-animate`** | adopción en TASK-526 | List mutations (add/remove/reorder zero-config) | Listas mutables — drop-in `useAutoAnimate()` ref |
| **MUI v5 transitions** | embedded | Defaults de Button/Card/Link/Modal | Cuando el componente MUI ya provee la transición correcta — no sobrescribir sin razón |
| **CSS transitions/keyframes** | n/a — nativo | Microinteractions tokens (`hoverScale`, `pressDepress`) | Cuando una `sx` prop con transition simple basta — no traer Framer Motion para algo que CSS resuelve |

### 3.2 Lo que NO usamos (decisiones explícitas)

| Lib | Por qué NO |
| --- | --- |
| **GSAP** | Comercial para uso comercial; Framer Motion cubre todo lo que necesitamos |
| **react-spring** | Framer Motion ya cubre spring physics; no duplicar APIs |
| **Lottie** | Bundle pesado; Rive evaluado en TASK-527 si emerge necesidad de illustrations |
| **react-transition-group** | Legacy 2018; Framer Motion `AnimatePresence` lo reemplaza |
| **Anime.js / Mo.js / Velocity** | Imperativos, fight against React; no compatibles con concurrent rendering |

## 4. Tokens canónicos (`src/lib/motion/tokens.ts`)

### 4.1 Duration

| Token | Valor | Uso canónico |
| --- | --- | --- |
| `motionDuration.instant` | 80 ms | Touch ripples, press feedback |
| `motionDuration.fast` | 150 ms | Hover, focus, link underlines |
| `motionDuration.base` | 200 ms | List mutations, micro state changes, skeleton crossfade |
| `motionDuration.medium` | 300 ms | Page entrance, modal open, drawer slide |
| `motionDuration.slow` | 500 ms | Hero entrances, attention-grabbers (uso muy puntual) |
| `motionDuration.counter` | 800-1200 ms | KPI counter rolling |

### 4.2 Easing

| Token | Curva | Uso canónico |
| --- | --- | --- |
| `motionEasing.enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances — start slow, end fast (premium feel) |
| `motionEasing.exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exits — start fast, end slow |
| `motionEasing.spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Hover/press con sutil spring (sin overshoot mayor) |
| `motionEasing.linear` | `linear` | Counters numéricos, progress bars |

### 4.3 Scale

| Token | Valor | Uso canónico |
| --- | --- | --- |
| `motionScale.hoverSubtle` | `1.02` | Hover en cards, rows |
| `motionScale.hoverEmphasis` | `1.04` | Hover en CTAs primarios |
| `motionScale.pressDepress` | `0.97` | Active state en buttons |
| `motionScale.focusOutline` | `inset 0 0 0 2px var(--mui-palette-primary-main)` | Keyboard focus visible |

### 4.4 Reglas de uso

- **Duración**: para una microinteracción nunca pasar 300ms. Para un counter o hero, máximo 1200ms.
- **Easing**: `enter` por default; `exit` solo cuando algo desaparece; `spring` solo en hover/press; `linear` solo en counters/progress.
- **Scale**: nunca pasar 1.05 en hover (theatrical). Press depress nunca menor a 0.95.

## 5. Wrappers canónicos (`src/components/greenhouse/motion/`, `src/lib/motion/`, `src/hooks/`)

### 5.1 Microinteractions (`src/lib/motion/microinteractions.ts`) — TASK-643

Utilidades `sx` reutilizables:

```ts
import { hoverScale, pressDepress, focusGlow, linkUnderline } from '@/lib/motion/microinteractions'

<Button sx={{ ...hoverScale, ...pressDepress, ...focusGlow }}>Guardar</Button>
<Link sx={linkUnderline}>Ver detalle</Link>
```

Aplicadas globalmente vía MUI theme overrides (`src/@core/theme/overrides/`) para que TODO Button/Card/Link/TableRow las herede sin código por componente.

### 5.2 Page entrance (`<GhPageEntrance>`) — TASK-644

```tsx
'use client'

import { GhPageEntrance } from '@/components/greenhouse/motion/GhPageEntrance'

export default function FinanceQuotesPage() {
  return (
    <GhPageEntrance>
      <QuotesListView />
    </GhPageEntrance>
  )
}
```

Fade + slide-up 8px en 300ms al montar. Respeta `prefers-reduced-motion` (fade puro 100ms).

### 5.3 Skeleton crossfade (`<SkeletonCrossfade>`) — TASK-644

```tsx
<SkeletonCrossfade
  loading={isLoading}
  skeleton={<QuotesTableSkeleton />}
>
  <QuotesTable rows={data} />
</SkeletonCrossfade>
```

Cross-fade 200ms entre skeleton y contenido real. Sin swap brusco.

### 5.4 List mutations (`useAutoAnimate()`) — TASK-526

```tsx
'use client'

import { useAutoAnimate } from '@formkit/auto-animate/react'

const [parent] = useAutoAnimate({ duration: 200, easing: 'ease-out' })

return (
  <tbody ref={parent}>
    {items.map(item => <Row key={item.id} {...item} />)}
  </tbody>
)
```

Animación automática de add/remove/reorder. Zero-config. Respeta reduced motion nativo.

### 5.5 KPI counter (`<AnimatedCounter>`) — TASK-645

```tsx
import { AnimatedCounter } from '@/components/greenhouse/motion/AnimatedCounter'
import { formatCurrencyCLP } from '@/lib/locale-formatters'

<AnimatedCounter value={45230000} format={formatCurrencyCLP} />
```

Spring physics rolling desde 0 (o desde valor anterior si cambia mid-animation) hasta valor final. Sin overshoot. Reduced motion → render directo.

### 5.6 Scroll reveal (`<ScrollReveal>`, `useScrollReveal()`) — TASK-646

```tsx
import { ScrollReveal } from '@/components/greenhouse/motion/ScrollReveal'

<ScrollReveal>
  <MrrEvolutionChart data={data} />
</ScrollReveal>
```

Chart aparece con fade+slide-up cuando entra al viewport. `IntersectionObserver` nativo (no scroll listener). `once: true` — no re-anima al volver.

### 5.7 Stagger (`<StaggeredList>`) — TASK-646

```tsx
<StaggeredList staggerDelay={30} maxStagger={600}>
  {items.map(item => <Row key={item.id} {...item} />)}
</StaggeredList>
```

Items entran uno a uno con delay incremental. Capped a 600ms total para listas largas.

### 5.8 View Transitions (existente — TASK-525)

```tsx
import { ViewTransitionLink } from '@/components/greenhouse/motion/ViewTransitionLink'

<ViewTransitionLink href={`/finance/quotes/${id}`}>
  <QuoteRow {...quote} />
</ViewTransitionLink>
```

Cross-page morph nativo del browser. Helpers en `src/lib/motion/view-transition.ts` y `src/hooks/useViewTransitionRouter.ts`. CSS scoped por `view-transition-name`.

## 6. Matriz de cobertura — qué dimensión usa qué wrapper

| Dimensión de motion | Wrapper canónico | Lib backing | Task |
| --- | --- | --- | --- |
| Cross-page navigation morph | `ViewTransitionLink`, `useViewTransitionRouter` | View Transitions API | TASK-525 (cerrada) |
| Hover, focus, press | utilidades `sx` (`hoverScale`, `focusGlow`, `pressDepress`) | CSS transitions vía MUI theme | TASK-643 |
| List add/remove/reorder | `useAutoAnimate()` | `@formkit/auto-animate` | TASK-526 |
| Page entrance | `<GhPageEntrance>` | Framer Motion | TASK-644 |
| Skeleton swap | `<SkeletonCrossfade>` | Framer Motion `AnimatePresence` | TASK-644 |
| KPI numbers rolling | `<AnimatedCounter>` | Framer Motion `useSpring` | TASK-645 |
| Chart entrance al scroll | `<ScrollReveal>`, `useScrollReveal()` | Framer Motion `useInView` | TASK-646 |
| List rows staggered | `<StaggeredList>` | Framer Motion variants | TASK-646 |

## 7. Reduced motion — contrato canónico

Toda animación del sistema debe respetar `prefers-reduced-motion: reduce`. La regla:

| Tipo de animación | Comportamiento bajo reduced motion |
| --- | --- |
| Hover scale, press depress | `transform: none` — sin animación |
| Focus glow | Sigue funcionando (es señal de accesibilidad, no decoración) |
| Page entrance | Opacity-only fade en 100ms (sin slide-up) |
| Skeleton crossfade | Opacity simple, sin spring |
| KPI counter | Render directo del valor final |
| Scroll reveal | Render directo, sin esperar viewport |
| Stagger | Render todos a la vez |
| List mutations (auto-animate) | Native handling — auto-animate ya lo respeta |
| View Transitions | Native handling — browser ya lo respeta |

Validación: DevTools → Rendering panel → "Emulate CSS media feature" → `prefers-reduced-motion: reduce`. Recorrer las vistas y verificar.

## 8. Performance — guardrails

- **No animar layout properties** (`width`, `height`, `top`, `left`, `margin`, `padding`). Solo `transform`, `opacity`, `filter`, `clip-path`.
- **`will-change` solo donde se necesite** y solo durante la animación. Nunca permanente.
- **`contain: layout`** en wrappers que animan para aislar reflow.
- **`IntersectionObserver` para scroll reveal**, NUNCA scroll listener directo.
- **Stagger capped** (`maxStagger`) para listas largas — no animar 200 items en cascada.
- **Counter spring damping alto** para evitar oscilación visible que cuesta CPU.
- **Validación**: DevTools Performance tab + mobile throttling. Si una animación causa frames > 16ms en mid-tier mobile, simplificar.

## 9. Estructura de archivos canónica

```
src/
  lib/
    motion/
      tokens.ts                  # duration, easing, scale (TASK-643)
      microinteractions.ts       # hoverScale, pressDepress, etc. (TASK-643)
      view-transition.ts         # helper View Transitions (TASK-525)
  hooks/
    useViewTransitionRouter.ts   # navigation con view transition (TASK-525)
    useScrollReveal.ts           # IntersectionObserver wrapper (TASK-646)
    useListAnimation.ts          # opcional, wrapper de auto-animate con tokens (TASK-526)
  components/
    greenhouse/
      motion/
        ViewTransitionLink.tsx   # drop-in Link con morph (TASK-525)
        GhPageEntrance.tsx       # page entrance wrapper (TASK-644)
        SkeletonCrossfade.tsx    # loading→loaded crossfade (TASK-644)
        AnimatedCounter.tsx      # KPI counter (TASK-645)
        ScrollReveal.tsx         # scroll reveal wrapper (TASK-646)
        StaggeredList.tsx        # list stagger wrapper (TASK-646)
  libs/
    FramerMotion.tsx             # re-export canónico de framer-motion
  @core/theme/
    overrides/
      Button.ts                  # tokens aplicados globalmente (TASK-643)
      Card.ts
      Link.ts
      TableRow.ts
```

## 10. Cómo extender el sistema (guía para devs y agentes)

### 10.1 ¿Necesitás animar algo?

1. **Buscá si ya hay un wrapper canónico** (sección 5). Si lo hay, usalo.
2. **Si tu caso encaja en una dimensión existente** pero ningún wrapper la cubre exactamente, considerá si vale la pena extender el wrapper existente o crear uno nuevo en `src/components/greenhouse/motion/`.
3. **Si tu caso es nuevo** (dimensión no cubierta), escribí RFC en `docs/rfcs/` o abrí TASK con propuesta. NO inventes timing inline.

### 10.2 ¿Necesitás un timing distinto al token?

- Validá si tu caso justifica un nuevo token. Si sí, agregá el token a `tokens.ts` y documentá en sección 4.
- Si es one-off legítimo, documentá inline el porqué con comentario `// motion: <razón>`.

### 10.3 ¿Necesitás una lib nueva?

Triggers válidos para introducir una lib nueva de motion:

- Necesidad de SVG path animations complejas (caso edge — Rive en TASK-527).
- Necesidad de 3D (Three.js — TASK-233 evaluación).
- Performance issue medido que ninguna lib actual resuelve.

Triggers inválidos:

- "Lottie es popular" — no, lo evaluamos.
- "Quiero usar GSAP" — no, Framer Motion cubre todo.

### 10.4 ¿Tu vista nueva debe usar el sistema?

Sí. Toda vista nueva del portal debe consumir el sistema. Convención mínima:

1. Envolver el contenido principal en `<GhPageEntrance>`.
2. KPIs en cards usan `<AnimatedCounter>`.
3. Charts en `<ScrollReveal>`.
4. Listas mutables con `useAutoAnimate()`.
5. Listas largas con `<StaggeredList>`.
6. Hovers/focus/press heredados automáticamente vía MUI theme overrides.

## 11. Sinergia con otras capas del portal

| Capa | Sinergia |
| --- | --- |
| **Charts (ECharts/Apex)** | TASK-641 (ECharts adoption) integra con TASK-646 (scroll reveal). Charts nuevos heredan reveal sin código extra. |
| **Identity / Tenant Context** | View transitions (TASK-525) pasan por canónico, no afectado por tenant scoping. |
| **Reactive projections** | Cuando una projection actualiza un valor en cliente (vía SWR/react-query), `<AnimatedCounter>` interpola del valor anterior al nuevo — no resetea a 0. |
| **i18n (es-CL)** | Formatters de números/fechas se inyectan vía prop `format` de `<AnimatedCounter>`. Reutilizan helpers de `src/lib/locale-formatters.ts`. |
| **Skeleton system** | Skeleton existente se envuelve en `<SkeletonCrossfade>` sin cambiar la estructura. |
| **A11y** | Focus rings (`focusGlow`) NO se desactivan bajo reduced motion — son señal de navegación. |

## 12. Versionamiento del sistema

- **V1 (actual)**: tokens + 7 wrappers canónicos. Foundation.
- **V2 (futuro)**: si emerge necesidad de motion choreography compleja (ej. multi-element morphs orquestados), se evaluará abrir librería interna `GhMotionPrimitives`. NO se planifica todavía.
- **V3 (especulativo)**: si Greenhouse adopta Storybook, los wrappers se documentan ahí con stories de cada estado.

## 13. Decisiones cerradas

- **2026-04-26**: View Transitions API es default para cross-page (TASK-525 cerrada).
- **2026-04-26**: Framer Motion `^12.38` es la lib de animaciones declarativas (instalada, sin uso real hasta TASK-642).
- **2026-04-26**: `@formkit/auto-animate` se adopta para list mutations (TASK-526 dentro del programa TASK-642).
- **2026-04-26**: ApexCharts y ECharts coexisten como tier 2 y tier 1 respectivamente (TASK-641); el motion system es agnóstico al chart lib.
- **2026-04-26**: NO se adopta GSAP, Lottie, Anime.js, react-spring ni react-transition-group.

## 14. Riesgos vigentes

| Riesgo | Mitigación |
| --- | --- |
| Devs nuevos hardcodean timings en lugar de usar tokens | Skill `greenhouse-microinteractions-auditor` revisa en code review; este doc es la referencia autoritativa |
| Reduced motion se rompe al introducir animaciones nuevas | Cada PR de UI debe validar `prefers-reduced-motion: reduce` en DevTools antes de merge |
| Performance jank en mobile bajo carga | Validación manual en preview Vercel con DevTools throttling; futuro Lighthouse CI capturaría regressions |
| Coexistencia de wrappers nuevos con wrappers Vuexy starter | Vuexy starter componentes en `src/@menu`, `src/@core` no se tocan; el motion system se aplica a `src/components/greenhouse/*` y `src/views/greenhouse/*` |

## 15. Referencias

- TASK-525 — View Transitions API rollout (cerrada).
- TASK-642 — Motion Polish Program 2026 (umbrella).
- TASK-526, TASK-643, TASK-644, TASK-645, TASK-646 — sub-tasks que materializan este sistema.
- `GREENHOUSE_UI_PLATFORM_V1.md` — stack UI canónico.
- `GREENHOUSE_DESIGN_TOKENS_V1.md` — tokens de color, tipografía, spacing.
- Skill `greenhouse-microinteractions-auditor` — invocable para auditar interacciones en code review.
