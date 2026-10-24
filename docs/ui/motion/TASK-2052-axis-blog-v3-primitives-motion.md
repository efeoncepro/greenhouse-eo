# TASK-2052 — AXIS primitives del blog v3: motion

## Intent

El gesto vive en el ícono y el texto, no en rellenos ni subrayados (decisión del operador 2026-10-24: «no se ve
moderno ni premium» con líneas o rellenos). El buscador se siente vivo al escribir.

## Motion Map

| Pieza | Disparo | Movimiento | Duración y curva |
|---|---|---|---|
| Texto que rueda | hover (dispositivos con hover) y foco visible | `translateY(-50%)` de la doble línea | 450 ms `cubic-bezier(0.34,1.56,0.64,1)` |
| Flecha dibujada | hover / foco | palo `stroke-dasharray .5 2 → 1 2`; flecha `translateX(3px)` | 360 ms `cubic-bezier(0.2,0,0,1)` |
| Presionado | `:active` | `scale(.95)`, flecha 5 px; rebote al soltar | 450 ms elástica |
| Indicador del segmentado | selección | se desliza al botón elegido | 300 ms `cubic-bezier(0.2,0,0,1)` |
| Anillo del buscador | foco | conic continuo (turquesa, Engine, aguamarina) | 6,4 s lineal |
| Cometa del buscador | foco | SVG rect con `pathLength=100`, tres capas (cola 24, cuerpo 12, cabeza 5) | 3,2 s lineal, velocidad constante |
| Aura | foco | `box-shadow` que respira entre turquesa y azul | 3,2 s `ease-in-out` |
| Tecleo | cada tecla | cometa 3 → 4,5 px durante 420 ms | 220 ms |

## Tokens and Performance

- Duraciones y curvas desde `axisMotion` cuando existan; las nuevas (6,4 s, 3,2 s) se agregan como tokens.
- Sin `var()` dentro de keyframes; sin unidades de contenedor en tamaños.
- Sólo propiedades compuestas (`transform`, `opacity`, `stroke-dashoffset`, `box-shadow` en el aura).

## Reduced Motion

- Texto y flecha cambian sin transición; presionado sin escala.
- Buscador: sin cometa; anillo estático y aura fija.

## GVC / Micro Evidence

- GIF del Lab con hover/foco de cada tono y del buscador al escribir, a 1440 y 390.

## Design Decision Log

- **Decisión:** el aura es excepción aprobada al «sin glow» de La órbita, acotada al foco del buscador web.
- **Alternativa descartada:** haz por ángulo (ritmo irregular).
