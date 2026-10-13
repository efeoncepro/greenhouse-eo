# TASK-2008 — Feedback y movimiento de lectura

## Meta

- Status: `ready-for-implementation`
- Owner task: TASK-2008
- Related wireframe: docs/ui/wireframes/TASK-2008-growth-seo-client-evidence.md
- Related flow: docs/ui/flows/TASK-2008-growth-seo-client-evidence-flow.md
- Motion type: `primitive-default`
- Primary primitive/library: wrappers y CSS/tokens canónicos existentes.
- Copy source: GH_GROWTH_SEO_CLIENT.

## Motion Brief

Cliente reconoce tab/foco/cambio de lectura. Movimiento no afirma captura nueva o progreso de
medición. Sin counters animados, reveal decorativo, GSAP/Lottie ni nueva view transition.

## Motion Inventory

Tab: estado seleccionado y transición actual gobernada; CTA: hover/focus MUI; coverage: scroll y
foco contextual; chart: configuración existente con animación desactivada en reduced motion.
Feedback de error es textual; sin loop de loading fake.

## Microinteraction States

Botones/tab usan idle/hover/focus/pressed/selected nativos. Pending de fuente se explica desde DTO;
la interacción de lectura no fabrica estados success ni toast. Foco AA visible.

## Transition Specs

Resumen→tab: conservar tokens MOTION_DURATION_S/MOTION_EASE del sistema; sin offsets libres.
Ver cobertura: scroll smooth sólo si no reduced-motion, seguido de foco de encabezado;
reduced-motion usa auto y panel inmediato. Sin animar layout del resumen durante actualización.

## Primitive & Token Mapping

Reusar src/components/greenhouse/motion/core/tokens y useReducedMotion, MUI foco/hover.
No nuevo motor/import Framer/GSAP. Tokens semánticos, ninguna duración/easing literal.

## Reduced Motion Contract

Desactivar animación espacial/chart y scroll smooth; contenido/foco/selección conservados.

## Accessibility & Performance

No motion obligatorio para comprender dato/estado. Sin lectura duplicada por animación de cifras.
Chart/tab text fallback disponible; no global page repaint ni dependencia de viewport para datos.

## GVC / Micro Evidence

Desktop y390 con prefers-reduced-motion; tabs y CTA coverage conservan foco, sin overflow.
Markers summary/source-coverage; evidencia y review en dossier TASK-2008.

## Design Decision Log

Movimiento mínimo reutilizado; el valor visual depende de jerarquía y evidencia, no de efectos.
