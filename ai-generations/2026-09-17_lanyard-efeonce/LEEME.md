# Lanyard Efeonce con yoyo (2026-09-17)

Pedido del operador: lanyard con **yoyo** (portacredencial retráctil). En la cinta, el **logo blanco repetido** y el
**eslogan**, con el acento en escala de grises sobre «Growth»; en la resina del yoyo, **fondo blanco con el isotipo
azul**.

## Artes canónicas (compuestas, no generadas)

`arte-lanyard.mjs` arma las dos piezas desde los archivos oficiales y el contrato de marca:

- **Cinta** (`ref/arte-cinta.png`): patrón que alterna logo negativo · eslogan, con el paso calculado desde el ancho
  real de cada pieza para que nunca se solapen. En el eslogan, **«Empower your» en gris CLARO `#C8CEDA`** y **«Growth» en blanco**. Es la traducción a escala de grises del lockup oficial, donde el prefijo va gris y la última palabra lleva el acento
  de color (Growth `#173b6c`, y rota a Brand, Engine o Voice según la capability). **El gris de marca `#848484` no se
  usa sobre navy en impresión:** da 2,98:1 de contraste y no resuelve en serigrafía ni sublimado; el gris claro da
  7,06:1 (blanco, 11,15:1).
- **Yoyo** (`ref/arte-yoyo.png`): disco blanco con el isotipo navy `#023c70` centrado, para ir bajo la cúpula de resina.
- **Carnet** (`ref/arte-carnet-plantilla.png`, CR80 vertical): cabecera navy con el logo blanco, retrato circular,
  nombre en navy, cargo en gris y el eslogan al pie con «Growth» en navy como acento sobre blanco. Se compone con
  `arte-carnet.mjs <foto.png> "<Nombre>" "<Cargo>" <salida.png>`; va dentro de un **portacarnet de marco rígido** transparente: sujeta la tarjeta por los bordes, se abre por un costado
  para deslizarla y deja la cara del carnet **expuesta**, con ranura superior. No es una funda de vinilo ni un estuche
  cerrado sobre el arte: eso es un **portacredencial**, que es otra pieza.

Ambas entran como referencia al modelo; el texto exacto nunca se le pide a la generación.

## Vistas (`final/`, 4 + artes)

Conjunto completo con el carnet en su portacarnet · macro de la cinta con un módulo del patrón · macro del yoyo con la
resina · macro del carnet dentro del portacarnet · puesto sobre el polo navy sin rostro. Manifiesto `efeonce-lanyard-manifiesto.json` con **cuándo usar** cada una.
Entrega: OneDrive `5. Contenidos/13- Branding/Lanyard Efeonce/v01/`.

## Producto

Cinta de poliéster plano de 20 mm en navy `#023c70`, hebilla de seguridad, gancho giratorio metálico; yoyo redondo de
32 mm en navy brillante con cúpula de resina, clip de acero y cordón de nylon.

## Correcciones de la corrida

| Observación | Corrección |
|---|---|
| El primer patrón se solapaba (logo sobre eslogan) | Calcular el paso desde el ancho real de cada pieza más un espacio, en vez de fijarlo a mano |
| La cara del yoyo salía cuadrada | Fondo transparente y círculo dibujado, no lienzo blanco |
| El gris de marca en el eslogan no resolvía sobre navy impreso (corrección del operador) | Gris claro `#C8CEDA` para el prefijo, manteniendo «Growth» en blanco; contraste medido 7,06:1 contra 2,98:1 |
| Faltaban el portacarnet y el carnet (corrección del operador) | Carnet compuesto con logo, foto, nombre y cargo |
| La primera versión mostraba un **portacredencial** (funda cerrada sobre el arte), no un portacarnet | Portacarnet de **marco rígido** abierto por un costado, con la cara del carnet expuesta; la distinción quedó escrita en el manifiesto |
| Los macros volvían como conjunto o como collage de dos paneles | Describir el encuadre por lo que **no** debe verse: «la silueta del lanyard NO aparece — sin lazo, sin gancho, sin fondo» |

El retrato de la plantilla del carnet es de una persona ficticia generada para ese fin; para un carnet real se pasa la
foto de la persona y su cargo confirmado.

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 11 generaciones con descartes.
