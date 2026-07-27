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

## GVC / Micro Evidence

Evidencia del comportamiento de motion, capturada por el canary de Globe — **no** por `fe:capture`, que es de
Greenhouse.

| Qué | Dónde | Estado |
|---|---|---|
| Escenario | `../efeonce-globe/apps/studio-client/scripts/producer-composer-{canary,browser-canary}.mjs` | registrado en el script `test` del paquete |
| Apertura del menú, 1440 | `.captures/task-1552-composer/model-selector-1440.png` | ✅ |
| Apertura del menú, 390 | `.captures/task-1552-composer/model-selector-390.png` | ✅ |
| Apertura del menú, 320 | `.captures/task-1552-composer/model-selector-320.png` | ✅ |
| **Pasada con `prefers-reduced-motion: reduce`** | `.captures/task-1552-composer/model-selector-390-reduce.png` | ✅ |
| Apertura **por teclado** (Enter sobre el trigger) | aserto del canary | ✅ |
| Anillo de foco visible en la opción enfocada | aserto del canary | ✅ |
| Sin overflow con el menú abierto | aserto del canary, los tres anchos | ✅ |

⚠️ **Lo que esta evidencia NO prueba:** que la transición de apertura *se vea bien*. Una captura es un frame
fijo; el motion se juzga mirando. El scorecard (`PASS`, 4.54) es ese juicio humano, y la pasada de
reduced-motion prueba lo que sí es verificable mecánicamente — que el significado sobrevive sin animación.

## Design Decision Log

**Decisión: el motion de esta región es mínimo y no porta significado.**

- **Alternativas consideradas:** (1) transición de altura del menú al abrir; (2) stagger de las opciones al
  entrar; (3) sólo el fade/scale del popover que ya existe en la hoja (`budget-popover-in`).
- **Se eligió (3).** El selector se abre y se cierra muchas veces por sesión: un stagger que se disfruta la
  primera vez estorba la décima. Y animar la **altura** del menú fuerza layout en cada frame, justo sobre un
  panel que ya tiene scroll propio.
- **Por qué ningún estado se comunica por movimiento:** `available` / `gated` / `blocked` se leen en **texto**.
  Con `prefers-reduced-motion` activo la superficie tiene que seguir diciendo lo mismo, y un estado que sólo
  existiera como transición desaparecería para quien apagó el motion — que además es quien más depende del
  texto.
- **Riesgo aceptado:** la apertura se siente sobria, casi seca. Es deliberado: el momento visual dominante del
  composer es el prompt, no elegir modelo. Premium por restricción.
- **Cero milisegundos literales:** toda duración y easing sale del SSOT de tokens; desde ADR-016 el gate lo
  rechaza también escrito como utilidad (`duration-[220ms]`, `duration-200`). La forma válida referencia el
  token: `duration-(--duration-overlay)`.
