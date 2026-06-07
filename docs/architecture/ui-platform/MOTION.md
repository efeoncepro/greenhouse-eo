# Greenhouse UI Platform — Motion

> Parte de **Greenhouse UI Platform**. Índice: [README.md](./README.md). Historial: [HISTORIAL.md](./HISTORIAL.md).

El sistema de movimiento de Greenhouse es **tres capas aditivas**; este doc es solo el mapa de entrada — los contratos canónicos viven en sus ADR/spec dedicadas:

| Capa | Qué cubre | Fuente canónica |
|---|---|---|
| **Tier 1 — CSS** | hover/tap/toggle/focus = el theme | tokens en `motion/core/tokens.ts` + `DESIGN.md` §Motion |
| **framer-motion** | microinteracciones existentes (rows, cards, panels, feedback) | [GREENHOUSE_MOTION_SYSTEM_V1.md](../GREENHOUSE_MOTION_SYSTEM_V1.md) + microinteraction primitives (HISTORIAL: Deltas 2026-06-06e) |
| **GSAP (Motion Primitive)** | tier cinemático/orquestado/scroll (hero, list mounts, section reveals, timelines, count-ups) | [GREENHOUSE_MOTION_PRIMITIVE_V1.md](../GREENHOUSE_MOTION_PRIMITIVE_V1.md) |

Reglas duras canónicas (resumen — el detalle vive en las specs de arriba + CLAUDE.md §Motion Primitive):

- Los **views de producto NO importan `gsap`/`@gsap/react` ni `@floating-ui/react` directo** — lint rules `greenhouse/no-direct-gsap-in-views` + `greenhouse/no-direct-floating-ui-in-views` (modo `error`).
- `prefers-reduced-motion` horneado/no-bypassable; degradación honesta (el contenido queda visible si el JS falla).
- GSAP **no reemplaza** CSS Tier 1 ni framer-motion — es una tercera capa aditiva.
- Tokens SoT (`instant 75 · short 150 · standard 200 · medium 300 · long 400 · extended 600` ms + eases) en `motion/core/tokens.ts`.

---

## Legacy — Animation Architecture (TASK-230)

> Contenido histórico relocalizado desde el monolito. Vigente solo donde no esté superado por `GREENHOUSE_MOTION_SYSTEM_V1.md` / `GREENHOUSE_MOTION_PRIMITIVE_V1.md`.


### Stack

| Librería | Wrapper | Uso principal |
|----------|---------|---------------|
| `lottie-react` | `src/libs/Lottie.tsx` | Ilustraciones animadas (empty states, loading, onboarding) |
| `framer-motion` | `src/libs/FramerMotion.tsx` | Micro-interacciones (counters, transitions, layout animations) |
| `gsap` + `@gsap/react` | `src/libs/GSAP.tsx`, `src/libs/GSAPScrollTrigger.tsx` | Motion avanzado: timelines complejos, SVG/path/text, ScrollTrigger medido |

Las librerías de motion se consumen via dynamic import o wrappers `'use client'` para evitar problemas SSR.

### Accesibilidad — prefers-reduced-motion (obligatorio)

Toda animación nueva DEBE respetar `prefers-reduced-motion: reduce`. El hook canónico:

```tsx
import useReducedMotion from '@/hooks/useReducedMotion'
const prefersReduced = useReducedMotion()
// Si true → renderizar estado final sin animación
```

Cuando `prefersReduced` es `true`:
- `EmptyState` muestra el icono estático (fallback `icon`)
- `AnimatedCounter` renderiza el valor final instantáneamente
- Componentes futuros deben seguir el mismo contrato

### Componentes

#### AnimatedCounter

Transición numérica para KPIs. Anima al entrar en viewport (una vez).

```tsx
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'

<AnimatedCounter value={42} format='integer' />           // "42"
<AnimatedCounter value={1250000} format='currency' />      // "$1.250.000"
<AnimatedCounter value={94.5} format='percentage' />       // "94,5%"
<AnimatedCounter value={42} format='integer' duration={1.2} />  // duración custom
```

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `value` | `number` | (requerido) | Valor numérico final |
| `format` | `'currency' \| 'percentage' \| 'integer'` | `'integer'` | Formato de salida |
| `currency` | `string` | `'CLP'` | Código ISO para formato currency |
| `duration` | `number` | `0.8` | Duración en segundos |
| `locale` | `string` | `'es-CL'` | Locale para Intl.NumberFormat |

Para usar dentro de `HorizontalWithSubtitle` (el prop `stats` acepta `string | ReactNode`):

```tsx
<HorizontalWithSubtitle
  title='DSO'
  stats={<><AnimatedCounter value={42} format='integer' /> días</>}
  subtitle='Days Sales Outstanding'
  avatarIcon='tabler-clock-dollar'
  avatarColor='success'
/>
```

#### EmptyState — prop animatedIcon

```tsx
<EmptyState
  icon='tabler-calendar-off'                    // fallback estático (siempre requerido)
  animatedIcon='/animations/empty-inbox.json'   // Lottie JSON path (opcional)
  title='No hay períodos'
  description='Cambia el filtro para ver otros meses.'
/>
```

- Si `animatedIcon` se pasa y carga correctamente → muestra animación Lottie (64×64px, loop)
- Si falla la carga → fallback silencioso al `icon` estático
- Si `prefers-reduced-motion` → siempre muestra `icon` estático

### Assets Lottie

Directorio: `public/animations/`

| Archivo | Uso |
|---------|-----|
| `empty-inbox.json` | Empty states genéricos (sin datos, sin períodos) |
| `empty-chart.json` | Empty states de charts/visualizaciones |

Para agregar assets nuevos:
1. Descargar JSON desde [LottieFiles](https://lottiefiles.com) (formato Bodymovin JSON, no dotLottie)
2. Guardar en `public/animations/` con nombre descriptivo kebab-case
3. Usar colores neutros o de la paleta Greenhouse (los assets se renderizan tal cual)
4. Tamaño recomendado del canvas: 120×120px

### Reglas de adopción

- **Reutilizar `AnimatedCounter`** antes de crear otro componente de transición numérica
- **Reutilizar `useReducedMotion`** para cualquier animación condicional
- **No importar `framer-motion` directo** — usar `src/libs/FramerMotion.tsx` para re-exports centralizados
- **No importar `lottie-react` directo** — usar `src/libs/Lottie.tsx` (dynamic import SSR-safe)
- **No importar `gsap`, `gsap/ScrollTrigger` ni `@gsap/react` directo** — usar `src/libs/GSAP.tsx` y `src/libs/GSAPScrollTrigger.tsx`
- **Lottie JSON < 50KB** recomendado para cada asset individual
- **No usar GSAP ni Three.js para micro-interacciones comunes** — GSAP queda reservado para choreography avanzado por `GREENHOUSE_GSAP_ADOPTION_DECISION_V1.md`; Three.js se reserva para TASK-233/logo/3D explícito
- **El prop `animatedIcon` es opt-in** — no reemplazar empty states masivamente sin validación visual

### Pilotos activos

| Vista | Componente | Instancias |
|-------|-----------|------------|
| Finance Dashboard | `AnimatedCounter` | 3 (DSO, DPO, Ratio nómina/ingresos) |
| Finance Period Closure | `EmptyState` + `animatedIcon` | 2 (períodos vacíos, snapshots vacíos) |

