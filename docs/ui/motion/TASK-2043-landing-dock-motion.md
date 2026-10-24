# TASK-2043 — Dock inferior de las landings: motion

> Contrato de movimiento de `efeonce.landing-dock`. Los valores viven en `axisLandingDock.motion` (AXIS) y salen de
> `axisMotion` y de los tiempos del menú global ([`TASK-2040-site-nav-motion.md`](TASK-2040-site-nav-motion.md)).

## Intent

El dock acompaña sin interrumpir: sube cuando la persona ya leyó el hero y se va antes de que estorbe. El movimiento
dice «aquí está tu siguiente paso» una vez y después se queda quieto; el tono cambia sin que la barra se mueva.

## Motion Map

| Momento | Propiedades | Duración | Curva |
|---|---|---|---|
| Aparecer | `opacity` 0→1, `translate` 0 24px → 0 | 450 ms | `emphasized` |
| Retirarse | `opacity` 1→0, `translate` 0 → 0 24px; `visibility` al final | 250 ms | `emphasizedAccelerate` |
| Cambio de tono | `background-color`, `border-color`, `box-shadow`, `color` | 300 ms (`header.tone` del menú) | `standard` |
| Hover del principal | `translateY(-1px)` + sombra del botón del agendador | 200 ms (`cta.press`) / 250 ms color | `emphasized` / `standard` |
| Hover del secundario | fondo y borde del vidrio del botón | 250 ms | `standard` |
| Presión | `scale(.98)` | 200 ms | `emphasized` |

## Tokens and Performance

- Sólo `opacity`, `translate` y `transform` animan posición; el vidrio no se anima (los gradientes no interpolan).
- La visibilidad se calcula en un `requestAnimationFrame` por scroll; sin trabajo en cada píxel.
- Ningún valor de tiempo está escrito en el CSS del primitive: la prueba de fuente lo exige.

## Reduced Motion

Con `prefers-reduced-motion: reduce` el dock no se desplaza: aparece y se retira sólo con `opacity`, y los botones no
se elevan ni se encogen. Color y foco se conservan.

## GVC / Micro Evidence

- Lab: la prueba «reduced motion: it appears without moving» mide `translate` en reposo y visible.
- Sitio: captura del dock a mitad de su entrada a 1440 y 390 (marcador `landing-dock`).

## Design Decision Log

- 24 px y 450 ms: la mitad del alto del dock basta para leer que sube; más distancia compite con la lectura.
- La salida es más corta que la entrada, como en la cabecera del menú.
