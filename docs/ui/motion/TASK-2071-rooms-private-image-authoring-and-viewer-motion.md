# TASK-2071 — Motion de la mesa de autoría y de «Qué cambió»

Contrato reescrito el 2026-10-31 desde el canvas aprobado (`Autoria`, `Ediciones`) y el código de `efeonce-rooms`
`claude/rooms-approved-ui` (`src/styles/authoring.css`, `src/styles/editions.css`). La mesa es una herramienta: se
mueve poco y rápido; el movimiento expresivo pertenece a la escena del cliente que se ve en el escenario, cuyo contrato
está en [TASK-2059](TASK-2059-rooms-first-experience-motion.md). Base de la línea en
[TASK-2079](TASK-2079-rooms-orbit-foundation-motion.md).

Valores: `--room-ease-arrive` (`axisMotion.ease.emphasized`, `cubic-bezier(0.2, 0, 0, 1)`), `--room-ease-transform`
(`axisMotion.ease.standard`, `cubic-bezier(0.4, 0, 0.2, 1)`) y `--room-duration` (200 ms) desde `src/styles/theme.ts`;
las escenas embebidas usan `SERVICE_TIMING` de `src/components/orbit/motion.ts`.

## Inventario

| Movimiento | Disparo | Duración | Curva | Qué se mueve | Movimiento reducido |
|---|---|---|---|---|---|
| Escena en el escenario | Cambiar de pieza, capítulo o rol | 520 ms | `arrive` | La escena del cliente sube 12 px y crece de 0,98 a 1 mientras aparece | Cambio directo |
| Propiedades | Cambiar de selección | 420 ms | `arrive` | El panel de propiedades sube y aparece | Directo |
| Tinta de «Ver como» | Cambiar de rol | 380 ms | `arrive` | La píldora navy se desliza al rol elegido (`translateX` por índice) | Salta al rol |
| Barra de cobertura | Cambia la cobertura tras un write | 600 ms | `transform` | Los tres tramos cambian de proporción (`flex-grow`) | Directo |
| Interruptor «Incluir» | Clic | Fondo 200 ms; círculo 260 ms | Fondo `transform`; círculo `arrive` | El círculo se desplaza y cambia el fondo | Directo |
| Ítem del inventario | Hover o selección | 150 ms (`--room-duration-short`) | `transform` | Fondo y borde del ítem | Directo |
| Fijador de la lente | Tocar la imagen o escribir la posición | 150 ms | `arrive` | El punto se mueve a la nueva posición en % | Salta a la posición |
| Procesando | Imagen subiéndose o procesándose | 1400 ms en bucle | `transform` | El punto late entre opacidad 0,35 y 1 | Punto fijo; el texto «Procesando…» informa |
| Diálogo de publicar | Abrir | 420 ms | `arrive` | El diálogo sube y aparece; cerrar es corte | Aparece sin transición |
| Tostada | Tras publicar | 520 ms | `arrive` | La tostada sube 24 px y aparece abajo al centro | Aparece sin transición |
| Escena de servicio embebida | Seleccionar una escena o editarla | La de cada escena (`SERVICE_TIMING`) | Según TASK-2059 | El escenario es la escena real escalada: morph, lente, gotas y órbitas se ven igual que para el comprador | Las escenas leen `useReducedMotion` y cortan directo |
| Detalle de «Qué cambió» | Elegir otro cambio | 520 ms | `arrive` | El detalle sube 12 px y aparece | Directo |
| Comparador | Arrastrar o flechas | Sin animación | — | `--wipe` sigue al valor del `range` al instante | Igual |
| Cambio en la lista | Hover o selección | 200 ms | `transform` | Fondo tenue; el elegido toma fondo `--room-ground` y borde halo | Sin transición |

## Reglas

- La mesa nunca anima el resultado de un write: el estado de guardado cambia de texto y el modelo nuevo se pinta con la
  entrada de 520 ms del escenario como cualquier cambio de selección.
- El escenario es inerte: su movimiento interno (escenas de servicio) no compite por el foco ni recibe teclado.
- El foco no espera: cerrar el diálogo es inmediato y el foco vuelve al botón «Publicar edición N».
- Sin curvas propias: todo sale de los tokens de `theme.ts` o de `SERVICE_TIMING`.
- `prefers-reduced-motion: reduce` desactiva todas las transiciones y entradas listadas (`authoring.css` y
  `editions.css`), incluido el punto que late.

## GVC / Micro Evidence

- `.webm` de `/demo/autoria` en 1440×900: cambiar de pieza, comprador → champion → audiencia con flechas, excluir una
  pieza (cobertura que se reacomoda), abrir y cancelar publicar, seleccionar una escena y cambiar un lugar en su editor
  (el morph se ve en el escenario).
- `.webm` de `/demo/ediciones`: elegir otro cambio y arrastrar el comparador.
- Repetir con movimiento reducido y comprobar que el estado final es idéntico.
- Dossier: `docs/ui/reviews/TASK-2071-rooms-private-image-authoring-and-viewer/`.

## Design Decision Log

- 2026-10-31 — Entradas cortas (150–600 ms) en la mesa: es una herramienta de trabajo y la escena del cliente es la
  protagonista.
- 2026-10-31 — El escenario muestra la escena con su movimiento real para que el autor juzgue lo mismo que verá el
  comprador; descartado congelar la escena en la mesa.
- 2026-10-31 — El comparador no anima: la posición del corte es exactamente la del control.
