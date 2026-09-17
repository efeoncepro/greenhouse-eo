# Lanyard Efeonce con yoyo (2026-09-17)

Pedido del operador: lanyard con **yoyo** (portacredencial retráctil). En la cinta, el **logo blanco repetido** y el
**eslogan**, con el acento en escala de grises sobre «Growth»; en la resina del yoyo, **fondo blanco con el isotipo
azul**.

## Artes canónicas (compuestas, no generadas)

`arte-lanyard.mjs` arma las dos piezas desde los archivos oficiales y el contrato de marca:

- **Cinta** (`ref/arte-cinta.png`): patrón que alterna logo negativo · eslogan, con el paso calculado desde el ancho
  real de cada pieza para que nunca se solapen. En el eslogan, **«Empower your» en gris `#848484`** y **«Growth» en
  blanco**. Es la traducción a escala de grises del lockup oficial, donde el prefijo va gris y la última palabra lleva
  el acento de color (Growth `#173b6c`, y rota a Brand, Engine o Voice según la capability).
- **Yoyo** (`ref/arte-yoyo.png`): disco blanco con el isotipo navy `#023c70` centrado, para ir bajo la cúpula de resina.

Ambas entran como referencia al modelo; el texto exacto nunca se le pide a la generación.

## Vistas (`final/`, 4 + artes)

Conjunto completo con credencial · macro de la cinta con un módulo del patrón · macro del yoyo con la resina · puesto
sobre el polo navy sin rostro. Manifiesto `efeonce-lanyard-manifiesto.json` con **cuándo usar** cada una.
Entrega: OneDrive `5. Contenidos/13- Branding/Lanyard Efeonce/v01/`.

## Producto

Cinta de poliéster plano de 20 mm en navy `#023c70`, hebilla de seguridad, gancho giratorio metálico; yoyo redondo de
32 mm en navy brillante con cúpula de resina, clip de acero y cordón de nylon.

## Correcciones de la corrida

| Observación | Corrección |
|---|---|
| El primer patrón se solapaba (logo sobre eslogan) | Calcular el paso desde el ancho real de cada pieza más un espacio, en vez de fijarlo a mano |
| La cara del yoyo salía cuadrada | Fondo transparente y círculo dibujado, no lienzo blanco |
| Los macros volvían como conjunto o como collage de dos paneles | Describir el encuadre por lo que **no** debe verse: «la silueta del lanyard NO aparece — sin lazo, sin gancho, sin fondo» |

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 6 generaciones.
