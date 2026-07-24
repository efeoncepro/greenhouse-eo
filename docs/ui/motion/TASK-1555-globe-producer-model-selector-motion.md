# Motion contract — Globe Producer Model Selector (TASK-1555)

> Contrato de motion de la galería de modelos. **Reusa el comportamiento de estado existente de Globe Producer**
> (tokens de duración/easing vigentes); NO introduce un core de motion nuevo. Especifica la microinteracción real
> de selección/estado para que el implementador no la re-decida.
>
> Wireframe: [`docs/ui/wireframes/TASK-1555-globe-producer-model-selector.md`](../wireframes/TASK-1555-globe-producer-model-selector.md).

## Principio

La flota es un **momento de decisión creativa**, no un dropdown técnico. La motion sólo confirma la elección y la
jerarquía (recomendado, disponible, no disponible) — nunca decora ni retrasa el control. Reduced-motion conserva
todo el significado por estado/texto.

## Microinteracciones (todas reusan tokens Globe existentes; sin easing/duración nuevos)

| Interacción | Comportamiento | Token |
|---|---|---|
| Hover/focus de tarjeta `available` | realce sutil del borde/elevación de la tarjeta | estado existente de Globe (hover) |
| Selección de una tarjeta | transición de estado a `aria-checked` (borde/acento de selección); la anterior se deselecciona sin morph espacial | token de cambio de estado existente |
| Énfasis del recomendado (✦) | estático (marca persistente); sin pulso ni loop | ninguno (estado, no animación) |
| `gated`/`blocked` | tratamiento disabled estable (atenuado); sin animación de "shake"/negación | estado disabled existente |
| Tooltip de razón (`ⓘ`) | aparición del patrón de tooltip accesible existente de Globe | patrón tooltip existente |
| Carga (skeleton) | shimmer/estado de carga existente; sin spinner inventado | skeleton existente |

## Reduced motion (WCAG 2.3.3 / a11y)

- `prefers-reduced-motion`: todo cambio de estado es **inmediato** (sin transición espacial); la selección, el
  recomendado y los estados no disponibles se comunican por color/estado/texto y `aria-*`, no por movimiento.

## No-goals

- Parallax, loops, confetti, pulsos del recomendado, animación de negación en `gated`/`blocked`, progreso ficticio,
  o cualquier animación que retrase la selección o el CTA de generar.
