# TASK-2040 — Navegación global del sitio: motion

> Contrato de motion del mecanismo `efeonce.site-nav`. Lo usan `TASK-2040` (AXIS) y `TASK-2042` (WordPress).
>
> - Fuente: nota «Movimiento (curvas y tiempos de axisMotion)» del canvas
>   [claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj](https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj) (versión 67) y los
>   valores implementados en sus tableros `Completo`, `Main`, `Recursos`, `Nosotros`, `Onepage` y `Movil`.

## Intent

El menú se siente físico y rápido:

- los paneles caen desde su botón;
- el onepage nace de la hamburguesa;
- el contenido llega en cascada corta;
- nunca hay dos cosas compitiendo por atención («un protagonista a la vez»).

El motion explica de dónde viene cada cosa; no decora.

## Motion Map

### Curvas y tiempos

| Token | Valor | Uso |
|---|---|---|
| `emphasized` | `cubic-bezier(0.2,0,0,1)` | Entradas |
| `emphasizedAccelerate` | `cubic-bezier(0.3,0,0.8,0.15)` | Salidas |
| `standard` | `cubic-bezier(0.4,0,0.2,1)` | Estados de hover y color |

### Cabecera

| Momento | Movimiento | Duración y curva |
|---|---|---|
| Bajando | Sale hacia arriba | 300 ms `emphasizedAccelerate` (decidido en el Lab, `TASK-2040`) |
| Subiendo | Entra la isla de vidrio desde arriba | 400 ms `emphasized` (decidido en el Lab, `TASK-2040`) |

### Mega menú y desplegable

| Momento | Movimiento | Duración y curva |
|---|---|---|
| Intención para abrir desde cerrado | Espera | 150 ms |
| Abrir el panel | Opacidad 200 ms, `translateY(-8→0)` y `scale(.98→1)` 400 ms, `clip-path inset` de abajo 100 %→0 en 450 a 550 ms | `emphasized` |
| Cascada dentro del panel | Líneas cada 40 ms desde 120 ms; luego texto, foto (revelado de arriba abajo), respuesta, caso y la franja al final | Cada ítem 300 ms opacidad + 400 ms `translateY(6→0)`, `emphasized` |
| Cerrar | 300 ms después de salir. Opacidad 150 ms con retardo de 60 ms, transform 200 ms, clip 250 ms | `emphasizedAccelerate` |
| Cambio de línea | Lo anterior se apaga en 150 ms; lo nuevo sube con servicios cada 40 ms; foto, respuesta y caso relevan en ese orden | `emphasized` |
| Foco de servicio | Anillo de acento alrededor del ícono, nombre +4 px y el resto al 55 % | 90 ms de intención; 200 ms `standard` |
| Fondo atenuado | `rgba(0,10,22,.62)` a opacidad 0,6 | 300 ms `emphasized` |
| Flecha del disparador | Gira 180° | 400 ms `emphasized` |
| Desplegable Nosotros | Igual que el mega, con la cortina más corta | 450 ms |

### Onepage

| Momento | Movimiento | Duración y curva |
|---|---|---|
| Abrir | `clip-path: circle(0 → R at <centro de la hamburguesa>)`, con R = distancia del centro a la esquina más lejana de la ventana (calculada al abrir y al redimensionar; 1618 px a 1440×900, 2124 px a 1920×1080; sin JS, `150vmax`). Antes decía 1720 px fijos, medidos en el tablero de 1440: pasado ~1500 px de ancho dejaba una esquina sin cubrir (corregido en AXIS primitives 0.7.10, 2026-10-23); la página detrás retrocede a 97 % | 800 ms `emphasized` (750 ms en teléfono) |
| Cascada | Logo y botón a los 260 ms; ítems cada 60 ms; líneas cada 45 ms; foto revelada de derecha a izquierda; respuesta al final (680 ms) | `emphasized` |
| Cerrar | El contenido sale junto en 150 ms; el círculo vuelve a **0 px** | 550 ms `emphasizedAccelerate` con retardo de 120 ms |
| Foto nueva | Entra en 600 ms y se acerca 4 % en 9 s. Nunca se aleja | `emphasized` / lineal |
| Intención dentro de listas | Cruzar en diagonal no cambia la línea | 90 ms |

### Botones

| Pieza | Movimiento | Duración y curva |
|---|---|---|
| Hamburguesa | Al pasar el mouse los trazos intercambian largo (20↔12 px). Al abrir se cruzan en X (±45°). Sobre la X, el mouse la gira 90°. El botón no se mueve | 350 a 450 ms `emphasized` |
| Hamburguesa, presionar | Baja a 94 % | 200 ms |
| Botón del agendador en vidrio | Al pasar el mouse se ilumina el vidrio, se intensifica el canto y sube 1 px. Al presionar, 98 % | 250 ms `standard` / 200 ms `emphasized` |
| Botón del agendador en la isla | Oscura: blanco que pasa a `#cfe4fa`; clara: navy que pasa a `#023c70`. Sube 1 px | 250 ms `standard` |
| Cambio de tono de la isla | Fondo, borde, sombra, texto, logo y botón cruzan de tono al cambiar la sección bajo la isla | 300 ms `emphasized` |

## Tokens and Performance

- Los tiempos y curvas salen de `axisSiteNav.motion` (curvas de `axisMotion`) en `axis-tokens`. El CSS del sitio no
  repite valores a mano; el JS los lee de las variables CSS, en `ms` o `s`.
- Sólo se animan `opacity`, `transform` y `clip-path`. Nada de `top`, `height` ni `filter` en bucle.
- `will-change` sólo durante la transición, en el panel y en el círculo del onepage.
- El acercamiento de 9 s de la foto se detiene cuando el onepage se cierra o la pestaña pasa a segundo plano.
- Fotos: se precargan al abrir. La animación de una foto no arranca hasta que cargó.

## Reduced Motion

Con `prefers-reduced-motion: reduce`:

- todas las transiciones van a 0 ms y se quitan los desplazamientos (`translate`, `scale` y el círculo);
- los paneles y el onepage aparecen y desaparecen al instante;
- la cabecera aparece y desaparece sin deslizarse;
- se mantienen los cambios de color de hover y el foco visible;
- se quita el acercamiento de la foto.

## GVC / Micro Evidence

- Video corto del Lab (`TASK-2040`) y de la página piloto (`TASK-2042`):
  1. abrir Soluciones;
  2. cambiar de línea y poner foco en un servicio;
  3. abrir y cerrar el onepage;
  4. hacer scroll abajo y arriba.
- Misma secuencia con movimiento reducido activado, que debe mostrar cambios instantáneos.
- Verificar que al cerrar el onepage no queda ningún disco detrás de la hamburguesa.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Círculo cerrado a 0 px | A 24 px el panel navy quedaba como disco detrás del vidrio de la hamburguesa (comentario del operador, 2026-10-18). |
| Cortina en vez de fade solo | El panel tiene que leerse como algo que sale del botón; el fade solo no dice de dónde viene. |
| Intención de 150 ms y 90 ms | Evita aperturas accidentales y cambios de línea al cruzar en diagonal. |
| Foto que sólo se acerca | Alejar se lee como pérdida de foco. |
| Hover del agendador con elevación de 1 px | Pedido del operador (2026-10-18). La elevación mínima marca acción sin competir con la cápsula. |
