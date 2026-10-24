# TASK-2045 — Formulario Growth en diálogo: motion

> Wireframe: `docs/ui/wireframes/TASK-2045-growth-form-dialog-design-fidelity.md`.
> Valores de referencia: keyframes `pmfade` y `pmrise` del canvas de Partners v14.

## Intent

El diálogo llega como una respuesta al clic, no como una interrupción: el velo aparece y la tarjeta sube un poco
desde abajo, y se va más rápido de lo que llegó. El formulario no anima sus campos: lo que se mueve es el contenedor,
y el cambio a éxito es un reemplazo suave dentro de la misma tarjeta.

## Motion Map

| Momento | Elemento | Propiedades | Duración | Curva | Desde → hasta |
|---|---|---|---|---|---|
| Abrir | velo (`::backdrop`) | opacity | 300 ms | `standard` `cubic-bezier(.4,0,.2,1)` | 0 → 1 |
| Abrir | tarjeta | opacity, transform | 450 ms | `emphasizedDecelerate` `cubic-bezier(.2,0,0,1)` | `translateY(32px) scale(.97)`, 0 → reposo, 1 |
| Abrir (teléfono) | hoja inferior | opacity, transform | 450 ms | `emphasizedDecelerate` | `translateY(48px)` → reposo |
| Cerrar | tarjeta | opacity, transform | 250 ms | `emphasizedAccelerate` `cubic-bezier(.3,0,.8,.15)` | reposo → `translateY(16px) scale(.98)`, 0 |
| Cerrar | velo | opacity | 200 ms | `standard` | 1 → 0 |
| Cargando → listo | esqueleto → campos | opacity | 150 ms | `standard` | cruce |
| Listo → éxito | contenido de la tarjeta | opacity, altura | 250 ms | `standard` | cruce; la altura se ajusta sin salto |
| Éxito | arco de la órbita | `stroke-dashoffset` | 600 ms, una vez | `emphasizedDecelerate` | arco dibujado de 0 al largo final |
| Foco de campo | borde y halo | border-color, box-shadow | 150 ms | `standard` | — |
| Hover de × | borde | border-color | 150 ms | `standard` | — |

El cierre usa `@starting-style` y `transition-behavior: allow-discrete` donde existe; donde no, el renderer espera
`transitionend` (con un tope de 300 ms) antes de llamar a `close()`.

## Tokens and Performance

- Duraciones y curvas como custom properties del renderer del CTA (`--ghcta-dialog-enter-duration`,
  `--ghcta-dialog-exit-duration`, `--ghcta-dialog-ease-enter`, `--ghcta-dialog-ease-exit`), con defaults iguales a la
  tabla y alineados con `axisMotion` (`standard`, `emphasizedDecelerate`, `emphasizedAccelerate`).
- Sólo `opacity` y `transform` se animan en la entrada y salida; el `backdrop-filter: blur(10px)` del velo se aplica
  fijo, no se anima (el blur animado es caro en teléfonos de gama media).
- La altura del cambio a éxito se resuelve con una transición de `grid-template-rows` o midiendo una vez; nunca con
  `height: auto` animado por JS en cada frame.
- Sin `will-change` permanente; se agrega al abrir y se quita al terminar.
- Presupuesto: ninguna tarea larga > 50 ms al abrir en un Moto G Power simulado (CPU ×4); el montaje del formulario
  ocurre después del primer frame de la animación.

## Reduced Motion

Con `prefers-reduced-motion: reduce`:

- Velo y tarjeta: sólo opacidad, 150 ms; sin desplazamiento ni escala.
- Arco de la órbita del éxito: aparece dibujado, sin trazo animado.
- Cambio a éxito: corte directo con un cruce de opacidad de 100 ms.
- Foco y hover: se mantienen (no son movimiento).

## GVC / Micro Evidence

- Grabación `.webm` de abrir → éxito → cerrar a 1440×900 y 390×844, con y sin movimiento reducido.
- Medición en la grabación: duración real de entrada (≈450 ms) y salida (≈250 ms) con tolerancia de 50 ms.
- Con movimiento reducido: `getComputedStyle(card).transform` = `none` en todo momento.
- Trace de Performance al abrir en teléfono simulado: sin tareas largas por encima del presupuesto.

## Design Decision Log

| Decisión | Alternativas | Por qué |
|---|---|---|
| Valores del canvas (`pmfade`, `pmrise`) como defaults | curvas del renderer actual del slide-in | son los aprobados para esta pieza y coinciden con la familia `emphasized` de AXIS |
| Salida más corta que la entrada | simétricas | la salida no debe retener al visitante que ya decidió cerrar |
| Velo con blur fijo | animar el blur | costo de pintura en móviles; la diferencia no se percibe |
| Arco de la órbita dibujado una vez | ícono estático; animación en bucle | refuerza la confirmación sin distraer; nada en bucle en la línea gráfica |
