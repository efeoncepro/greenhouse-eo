# Motion — TASK-1340 Growth CTA Portable Renderer (embedded/banner)

## Meta

- Task: `TASK-1340`
- Epic: `EPIC-023`
- Scope motion: entrada/salida del CTA embedded/banner + microinteracciones de CTA/dismiss. El motion del interruptivo (`popup_modal`/`slide_in`) es task siguiente.
- Constraint raíz (arch §15): motion corto, placement-aware, sin coreografía teatral; GSAP NO se usa para microinteracciones ordinarias de CTA; anti-CLS es requisito duro.

## Motion Brief

El CTA debe aparecer sin castigar Core Web Vitals ni interrumpir. La entrada es un fade/opacity + leve translate dentro de un espacio ya reservado (skeleton anti-CLS) — NUNCA un layout shift que empuje el contenido del host. El motion es señal de "algo nuevo, no urgente", no un reclamo agresivo. En superficie pública compartida con SEO/AEO, la estabilidad de layout pesa más que el show.

## Motion Inventory

- Entrada del card: fade-in + translateY corto (dentro del alto reservado).
- Salida (dismiss): fade-out + colapso de altura sin dejar hueco brusco.
- CTA primario: hover/focus/press (elevación/opacidad token).
- Dismiss: hover/focus.
- Apertura del form (`open_growth_form`): transición corta al montar `<greenhouse-form>` (o su propio motion si abre modal — contrato del form).

## Microinteraction States

- CTA hover/focus/press: CSS Tier 1 / tokens (`--gh-motion-*`), sin JS.
- Dismiss hover/focus: mismo tier.
- Loading: skeleton estático (sin shimmer agresivo); no compite con el contenido del host.

## Transition Specs

- Entrada: `opacity 0→1` + `translateY(4–8px→0)`, duración corta (token ~150–200ms), easing token (standard/ease-out). Dentro del alto reservado (CLS = 0).
- Salida/dismiss: `opacity 1→0` + colapso de alto, duración corta; el hueco se cierra sin salto.
- Hover/press CTA: transición de color/elevación ~100–150ms token.
- No stagger, no scroll-reveal, no layout morph teatral.

## Primitive & Token Mapping

- Motion primitive: `CSS` (transitions/keyframes cortas con tokens `--gh-cta-motion-*` derivados del layer de tokens del renderer). NO `useGreenhouseGSAP`, NO framer, NO Lottie.
- Tokens: duración + easing del layer público del renderer (compilado de los motion tokens Greenhouse, arch §15) — el renderer NO hardcodea ms/curvas.
- Consistencia con el precedente `src/growth-forms-renderer/styles.ts` (motion + reduced-motion + skeleton anti-CLS).

## Reduced Motion Contract

- `@media (prefers-reduced-motion: reduce)`: sin transform/opacity animada; el card aparece en estado final directo; el dismiss colapsa sin animación de alto. El significado y el estado final se preservan (arch §15).
- El skeleton anti-CLS se mantiene (la reserva de altura no es "motion", es estabilidad).

## Accessibility & Feedback

- Ningún estado depende solo de la animación para comunicar (aparición/cierre también son perceptibles por estructura/foco).
- Focus-visible en CTA/dismiss no depende de motion.
- El feedback de "form abriendo" es perceptible sin animación (aparece el form / cambia el foco).

## Performance Guardrails

- Solo `opacity`/`transform` (compositor-friendly); NO animar `height`/`top`/`width` que causen reflow salvo el colapso de dismiss (contenido corto, aceptable).
- CLS = 0: la entrada ocurre dentro del alto reservado; el card nunca empuja el contenido del host (crítico en WP con temas de terceros).
- Sin animación en el critical render path que retrase LCP del host.

## GVC / Micro Evidence

- Scenario file: `scripts/frontend/scenarios/task-1340-growth-cta-renderer.scenario.ts` (compartido).
- Captures: `cta-default` (post-entrada), `cta-dismissed` (post-salida), `cta-reduced-motion` (con `prefers-reduced-motion`).
- Viewports: 1440 · 390.
- Evidence: entrada sin CLS (comparar layout host antes/después de hidratar); reduced-motion sin transform; focus-visible en CTA/dismiss.

## Design Decision Log

- Decision: motion CSS corto placement-aware, anti-CLS, sin GSAP.
- Alternatives considered: (A) entrada con slide/scale llamativo — rechazado (agresivo, riesgo CLS, roza dark-pattern de atención); (B) GSAP timeline — rechazado (arch §15: GSAP no para microinteracciones ordinarias de CTA).
- Why this pattern: el CTA debe invitar, no interrumpir; en superficie pública SEO-sensible la estabilidad de layout es prioridad.
- Open risks: temas WP de terceros con CSS agresivo — mitigado con `@layer` + tokens propios + reserva de altura.

## Acceptance Checklist

- [ ] Entrada/salida solo `opacity`/`transform`, duración/easing por token, dentro del alto reservado (CLS = 0).
- [ ] `prefers-reduced-motion` elimina transform/animación y preserva estado final.
- [ ] Sin GSAP/framer/Lottie en el renderer de CTA.
- [ ] Hover/focus/press de CTA y dismiss con motion token, focus-visible independiente de motion.
- [ ] Evidencia GVC de entrada sin CLS + reduced-motion capturada y mirada.
