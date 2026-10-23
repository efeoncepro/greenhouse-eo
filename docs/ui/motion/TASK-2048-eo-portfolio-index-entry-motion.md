# TASK-2048 — EO Portfolio: motion de la portada y la entrada

> Contrato de movimiento de `/portafolio/` y `/portafolio/<slug>/`. Los valores salen de `axisMotion` y de
> `efeonceGraphicLine.motion` en AXIS (versión fija del vendor del plugin), nunca del canvas. Lenguaje de movimiento de
> La órbita: lento → rápido → lento, un protagonista a la vez, llegar con golpe.

## Intent

El movimiento muestra el trabajo, no la interfaz. Lo que se mueve son las piezas (los videos de los clientes) y, una
sola vez por sección, la órbita: la lente al llegar a la portada y la esfera de la medida al llegar a «Lo que pasó.». El
resto de la página se queda quieto para que el video sea el protagonista.

## Motion Map

| Momento | Propiedades | Duración | Curva |
|---|---|---|---|
| Lente al cargar la portada | el anillo aparece (`opacity`), el arco crece (`stroke-dashoffset`), la esfera llega a la punta; la ventana a color se abre (`clip-path` del círculo de 0 al radio) | anillo 0–500 ms, arco 400–1400 ms, esfera 1400–1700 ms (tiempos del cierre de marca sin logo) | `ease-emphasized` |
| Abrir una fila | `grid-template-rows` 0fr → 1fr y `opacity` 0 → 1 del panel; el cliente pasa de peso 420 a 760 y de tinta 72 % a 100 % | `duration-long` (400 ms) | `ease-standard` |
| Piezas del panel abierto | `opacity` y `translate` 0 12px → 0, una tras otra | `duration-medium` (300 ms), 60 ms entre piezas | `ease-emphasized` |
| Cerrar una fila | inverso de abrir | `duration-medium` (300 ms) | `ease-emphasizedAccelerate` |
| Llegada de la medida | la esfera viaja desde las 12 hasta `valor × 360°` con su estela; el camino recorrido queda estático debajo | `duration-extended` × 2 (1200 ms) [verificar contra `efeonceGraphicLine.motion`] | `ease-emphasized` |
| Video ambiente | play al entrar en pantalla, pausa al salir | sin animación propia | — |
| Hover del siguiente proyecto | `transform: scale(1.04)` de la imagen | 600 ms | `ease-emphasized` |
| Hover de una fila | `background-color` tenue | `duration-medium` (300 ms) | `ease-standard` |

## Tokens and Performance

- Sólo animan `opacity`, `transform`, `clip-path` y `stroke-dashoffset`; nada de `width`, `height` ni `top` salvo el
  `grid-template-rows` del panel.
- La lente y la medida se animan una sola vez, cuando entran en pantalla (IntersectionObserver), y no se repiten al
  volver a hacer scroll.
- Ningún tiempo queda escrito a mano en el CSS: salen de variables generadas desde los tokens del vendor.
- La lente no usa una segunda decodificación de video bajo 760 px.

## Reduced Motion

Con `prefers-reduced-motion: reduce`:

- La lente y la órbita de medida aparecen ya en su estado final, sin trazo ni viaje de la esfera.
- Las filas se abren y cierran sin transición de altura (cambio inmediato); el peso del cliente cambia sin animación.
- Ningún video arranca solo: queda el póster con «Reproducir video».
- El hover del siguiente proyecto no escala.

Color, foco y estados se conservan.

## GVC / Micro Evidence

- Captura de la lente a mitad de su entrada y en reposo, a 1440 (marcador `eo-portfolio-hero`).
- Captura de una fila a mitad de apertura y abierta (marcador `eo-portfolio-row-open`), a 1440 y 390.
- Captura de la órbita de medida en reposo con 88 % (esfera a 316,8°) (marcador `eo-portfolio-results`).
- Escenario con `prefers-reduced-motion: reduce`: lente y medida en estado final, videos en póster.
- Medición: ningún video en reproducción fuera del viewport (consulta de `paused` en el escenario).

## Design Decision Log

- La lente y la medida usan los tiempos del cierre de marca sin logo: es el mismo gesto de la línea, no uno inventado.
- La medida nunca se anima como una barra que se llena: la esfera viaja y el camino recorrido es estático (La órbita).
- Las piezas entran una tras otra con 60 ms de diferencia: se leen como una serie sin retrasar la lectura.
- Sin parallax ni carruseles automáticos: el video ya aporta todo el movimiento de la página.
