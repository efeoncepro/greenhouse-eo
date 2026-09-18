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

## Vistas (`final`, 12 + 3 artes)

Doce vistas pensadas para que ningún agente ni modelo reinterprete la pieza:

| Vista | Para qué |
|---|---|
| 01 conjunto · 12 colgado | Vista general y caída natural |
| 02 macro de la cara impresa · 06 cinta estirada de extremo a extremo | Arte y ritmo del patrón; base de mockups |
| 07 macro del reverso | Declara que la cara trasera va lisa, sin impresión |
| 08 macro de herrajes | Gancho giratorio, hebilla de seguridad y regulador |
| 03 macro del yoyo · 09 reverso del yoyo | Resina por delante, clip de acero por detrás |
| 10 portacarnet vacío | La pieza sola, sin tarjeta, para que no se confunda con un portacredencial |
| 05 carnet en el portacarnet · arte del carnet plano | Diseño del carnet y cómo se ve montado |
| 13 en la mano | Escala real de tarjeta, marco y yoyo |
| 04 puesto | Referencia con persona |

Regla al usarlas: pasar siempre las **artes canónicas** junto con la vista que corresponda a lo que la pieza debe
mostrar.

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
| El reverso liso y el carnet plano volvían como conjunto: las referencias del arte empujan a mostrar el logo | El reverso se generó **sin referencias**, describiendo que no hay impresión; el carnet plano no se genera: es el arte compuesto |
| Los macros volvían como conjunto o como collage de dos paneles | Describir el encuadre por lo que **no** debe verse: «la silueta del lanyard NO aparece — sin lazo, sin gancho, sin fondo» |
| El retrato del carnet quedó pegado al borde del círculo (corrección del operador) | El recorte se hace con `retrato-carnet.mjs`, que **gana aire** estirando y difuminando la franja superior de la propia foto en vez de acercarse más |
| La chaqueta salió **lisa, sin el emblema bordado** (corrección del operador) | La corrida pasaba sólo el polo: la chaqueta se describía en palabras. Se pasa la vista `softshell 06-cierre-abierto` como referencia y se declara el emblema |
| Con la chaqueta como referencia, el emblema salió del doble de su tamaño | El tamaño se declara como **proporción anclada a un objeto del mismo cuadro** («no más ancho que un tercio del panel del pecho, apenas más ancho que el carnet que cuelga»), nunca en centímetros |

El retrato de la plantilla del carnet es de una persona ficticia generada para ese fin.

**Carnet real emitido:** `final/efeonce-carnet-julio-reyes.png` — «Julio Reyes / Managing & GTM Director», con su foto
de `Equipo/Julio Reyes/v01/`. El título de la credencial lo define la persona: en la empresa es CEO y usa ese cargo en
la tarjeta. Para emitir otro basta:

```bash
node arte-carnet.mjs <foto.png> "<Nombre Apellido>" "<Cargo>" <salida.png>
```

El texto se escapa antes de entrar al SVG: un «&» en el cargo rompía el render.

El retrato circular **no se recorta a mano**:

```bash
node retrato-carnet.mjs <foto.png> <retrato.png> [aire=0.09] [desplazamientoX=0]
```

Un retrato corporativo ya viene encuadrado corto; recortarlo cuadrado sin más deja la cara tocando el borde del
círculo. El script estira y difumina la franja superior de la misma foto para ganar aire sobre la cabeza. Con
`extendWith: 'mirror'` no funciona: si el borde ya toca el pelo, lo duplica y queda un mechón flotando.

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 11 generaciones con descartes.

## Pruebas en persona

El kit se probó en dos personas (`out/prueba-nexa.png`, `out/prueba-julio.png`, `out/prueba-julio-carnet.png`): cinta, yoyo y carnet se mantienen consistentes, con el carnet mostrando el retrato y el nombre de cada uno. Se pasan las tres artes más las referencias de la persona y, en el caso de una persona real, al menos una foto de cuerpo entero para que la proporción no se deforme.

**Toda prenda que aparezca en la toma va como referencia, no como descripción.** La primera versión de
`prueba-julio-carnet.png` pasaba sólo el polo y describía la chaqueta con palabras: el modelo la devolvió lisa, sin
el emblema bordado. El orden de referencias que funciona es artes del kit → prendas (una vista por prenda, elegida
por cómo se usa: chaqueta abierta → `06-cierre-abierto`) → persona (rostro + cuerpo entero).
