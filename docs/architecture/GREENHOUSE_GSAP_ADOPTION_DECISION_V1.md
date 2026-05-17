# GREENHOUSE_GSAP_ADOPTION_DECISION_V1

## Architecture Decision 2026-05-17 -- GSAP como carril especializado de motion

- Status: Accepted
- Date: 2026-05-17
- Owner: UI Platform / Design Systems
- Scope: `package.json`, `src/libs/GSAP.tsx`, `src/libs/GSAPScrollTrigger.tsx`, `GREENHOUSE_MOTION_SYSTEM_V1.md`, `GREENHOUSE_UI_PLATFORM_V1.md`
- Reversibility: two-way
- Confidence: high
- Validated as of: 2026-05-17

## Context

Greenhouse ya tiene un sistema de motion basado en View Transitions API, Framer Motion, `@formkit/auto-animate`, MUI transitions y CSS transitions. Ese sistema sigue siendo correcto para microinteracciones operativas: hover, focus, pressed, page entrance, counters, list mutation, skeleton crossfade y scroll reveal liviano.

La decision de abril de 2026 rechazaba GSAP por dos razones: licencia comercial y duplicacion frente a Framer Motion. La primera razon cambio materialmente: GSAP 3.13+ y los plugins historicamente pagados quedaron disponibles sin costo para uso comercial bajo la licencia standard no-charge de GSAP/Webflow. La segunda razon sigue vigente para microinteracciones simples, pero no cubre todos los casos futuros.

El usuario pidio adoptar GSAP explicitamente. Como esto toca UI platform, la adopcion debe quedar documentada como contrato, no como import suelto.

## Decision

Greenhouse adopta GSAP como carril especializado para motion avanzado, sin reemplazar el stack declarativo existente.

Uso permitido:

- Timelines complejos multi-elemento donde Framer Motion generaria orquestacion fragil.
- Animaciones SVG/path/text avanzadas.
- `ScrollTrigger` para experiencias narrativas o dashboards ejecutivos con scroll choreography medido.
- Prototipos o mockups Greenhouse que necesiten motion expresivo antes de aterrizar primitives estables.

Uso no permitido por defecto:

- Hover/focus/pressed de componentes MUI o Vuexy.
- Counters KPI simples.
- List add/remove/reorder.
- Loading, error, warning o destructive confirmation states.
- Animaciones que no reduzcan incertidumbre, guien una decision o mejoren continuidad.

## Alternatives Considered

- Mantener prohibicion total de GSAP: rechazado porque la restriccion de licencia quedo stale y bloquea casos de motion avanzado razonables.
- Reemplazar Framer Motion por GSAP: rechazado porque el runtime existente ya usa wrappers React-friendly, `AnimatedCounter`, `AnimatePresence` y `useInView`; migrar no agrega valor y aumentaria riesgo.
- Permitir imports directos de `gsap`: rechazado porque Greenhouse centraliza librerias UI con wrappers locales para SSR, lifecycle y policy.

## Consequences

Beneficios:

- Habilita choreography avanzado con una libreria madura y ampliamente documentada.
- Evita que futuros agentes introduzcan GSAP de forma ad-hoc.
- Deja claro que Framer Motion sigue siendo el default operativo.

Costos y riesgos:

- Nueva dependencia frontend y nuevo modelo imperativo dentro de React.
- Riesgo de jank si `ScrollTrigger` se usa sin presupuesto de performance.
- Licencia no es MIT/Apache; sigue requiriendo awareness de compliance.
- Mayor necesidad de cleanup correcto via `useGSAP`, `gsap.context()` o wrappers locales.

## Runtime Contract

- Dependencias canonicas:
  - `gsap`
  - `@gsap/react`
- Imports canonicos:
  - `import { gsap, useGSAP } from '@/libs/GSAP'`
  - `import { ScrollTrigger } from '@/libs/GSAPScrollTrigger'`
- No importar desde `gsap`, `gsap/ScrollTrigger` o `@gsap/react` directamente en componentes de producto.
- Cualquier animacion GSAP nueva debe:
  - vivir en componente client (`'use client'`)
  - usar `useGSAP` o cleanup equivalente
  - respetar `useReducedMotion`
  - animar preferentemente `transform` y `opacity`
  - documentar por que no basta Framer Motion/CSS si el caso no es obviamente avanzado

## Revisit When

- GSAP cambia licencia, packaging o modelo de distribucion.
- Framer Motion deja de cubrir casos existentes o genera regresiones de performance medibles.
- Hay mas de tres consumers GSAP productivos; en ese punto crear primitives Greenhouse dedicadas bajo `src/components/greenhouse/motion/`.
- `ScrollTrigger` aparece en una vista operacional densa y causa jank medido en mobile.
