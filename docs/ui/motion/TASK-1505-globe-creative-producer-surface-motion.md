# TASK-1505 — Globe Creative Producer Surface Motion Contract

> Motion del Creative Producer (superficie prompt-first Imagen/Video/Audio). **Reuse del sistema de
> motion de Globe** (mismo que `TASK-1474`); esta task **no crea primitives de motion nuevas**, solo
> especifica las microinteracciones de la consola. Todo timing/easing sale de **tokens de motion de
> Globe** — nunca valores literales (ms/curvas crudas). Bajo `prefers-reduced-motion` todo degrada a
> fade/estático y el progreso mantiene una señal textual (nunca la animación como única señal).

## Principio

El **momento visual dominante es el candidato** (su entrada al feed y su apertura en el viewer). La
motion sirve a la producción: confirma que algo se está generando, presenta el resultado, y transiciona
entre modalidades sin saltar el foco. **Ninguna** animación compite con el candidato (nada de hero
animado tipo landing, parallax, confetti ni easing juguetón).

## Microinteracciones (inventario)

| # | Interacción | Enter / comportamiento | Exit | Token (Globe) | Reduced-motion |
|---|---|---|---|---|---|
| 1 | **Candidato entra al feed** | fade + scale suave desde su placeholder "en curso" a la tarjeta lista | — | `enter` estándar (corto) | fade simple, sin scale |
| 2 | **Stagger de la grilla** (carga inicial del feed) | stagger acotado entre tarjetas (no cascada larga) | — | `stagger` acotado | off — todas aparecen a la vez |
| 3 | **Progreso de generación** | indicador por *attempt* honesto (no porcentaje inventado); pulso/indeterminado contenido en la tarjeta placeholder | resuelve a #1 o a estado error | `progress` (loop suave) | estático + **live region** textual ("Generando…") |
| 4 | **Morph entre modalidades** (Imagen↔Video↔Audio) | la región Composer morfa modo + Output-Shape Tray **preservando la barra de prompt**; sin reflow que salte el foco | — | `layout-morph` contenido | crossfade instantáneo, sin morph |
| 5 | **Apertura del Candidate Viewer** (Floating Surface) | transición contenida (scale/fade) del candidato al overlay; devuelve foco al disparador al cerrar | reverse contenido | `overlay-enter` | fade, sin scale |
| 6 | **Reveal de la Asset Action Bar** (hover **y** focus de la tarjeta) | fade-in de las acciones sobre la card | fade-out | `hover-reveal` (muy corto) | aparición instantánea en focus |
| 7 | **Recompute del `✨N`** al cambiar shape/ruta | transición numérica sutil o cambio directo con debounce; nunca "spinner de página" | — | `value-change` (mínimo) | cambio directo, sin transición |
| 8 | **CTA Generar → pending** | estado pending inmediato (sin latencia percibida antes del feedback) | vuelve a idle o a #3 | `press`/`pending` | cambio de estado directo |

## Reglas duras

- **Tokens, no literales.** Todo timing/easing = tokens de motion de Globe (`theme.axis.*`/sistema de
  motion). Ningún `ms`, `cubic-bezier` ni curva cruda en el componente.
- **El progreso nunca es la única señal.** #3 acompaña siempre una live region moderada + texto de
  estado; un usuario con reduced-motion o lector de pantalla percibe el avance sin la animación.
- **Foco estable.** #4 (morph de modalidad) y #5 (viewer) **no** pueden saltar ni perder el foco; el
  viewer devuelve foco al disparador al cerrar.
- **Sin competir con el candidato.** Prohibido: hero animado, parallax, confetti, stagger largo en
  cascada, cualquier motion que reste protagonismo al resultado.
- **`prefers-reduced-motion` es contrato, no adorno.** Cada fila degrada según la última columna; se
  captura evidencia GVC del modo reducido (ver `TASK-1505` GVC scenario plan).

## Verificación

- GVC captura #1 (entrada de candidato), #3 (generating), #4 (morph de modalidad) y #5 (viewer) en
  Desktop 1440×1000 y Mobile 390×844, más una pasada con `prefers-reduced-motion` (fade/estático).
- El progreso muestra señal textual bajo reduced-motion; el foco no salta en el morph ni en el viewer.
- Sin scroll horizontal de página en ambos viewports (el feed puede tener su propio scroll etiquetado).

## Relación con el sistema

Este contrato **consume** el sistema de motion de Globe (compartido con el Workbench `TASK-1474`); si
una microinteracción exige una primitive de motion nueva, se registra en el sistema de Globe con su
anatomy/tokens/reduced-motion **antes** de usarla aquí — no se inventa ad hoc en la consola. Fuente de
las microinteracciones: el wireframe y el flow de esta task
(`docs/ui/wireframes/TASK-1505-globe-creative-producer-surface.md`,
`docs/ui/flows/TASK-1505-globe-creative-producer-surface-flow.md`).
