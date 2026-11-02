# Biblia de personajes Motogas

> Cómo es cada personaje, de dónde salen sus referencias y la receta exacta para generar una pose nueva que sea
> el mismo personaje. Todo lo que dice aquí se probó en las hojas del 2026-11-02. Cuando una pose nueva enseñe
> algo, se suma a la sección de lecciones del personaje.

Raíz OneDrive (abreviada `PERS`):
`/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/1. Recursos Graficos/Personajes`

Motor para los tres: `pnpm ai:image --openai-key personal --model gpt-image-2.5-sunburst` en modo edición
(`--image`), 1600×1600. Recorte: `pnpm ai:image:rmbg <in> <out>`. Los scripts citados están en `../scripts/`.

---

## 1. El Rey del Gas (El Rey del Gas · Lo Prado y Cerro Navia)

### Identidad
- Cilindro de gas rojo antropomorfo con **corona amarilla ladeada**. Sin nombre propio («el Rey»). Existe desde 2019.
- **Sigue en 2D** (decisión del operador, 2026-11-02). Un 3D se probó en oct-2025 y se abandonó. El 2D lo separa
  de Gasfield, que es 3D: no convertirlo.
- Obra del equipo, sin material de stock.

### Invariantes (medidos en el vector de 2019)
- **Solo 4 colores planos:** rojo `#FF0000`, amarillo corona `#FFC214`, blanco `#FFFFFF`, negro `#000000`.
  Sin degradados, sombras, brillos ni texturas.
- Reparto en la silueta del canon: negro 34,7 % · rojo 33,8 % · blanco 23,2 % · amarillo 8,3 %. El negro es la
  huella del contorno grueso. En una pose nueva debe quedar entre 34 % y 40 % (más si lleva líneas de velocidad).
- Contorno negro grueso y variable, más pesado abajo y a la derecha, con un trazo negro separado bajo los zapatos.
- Cilindro rojo levemente cónico, ≈ 2,3 anchos de alto con corona y zapatos; asa roja arriba (hace de cuello);
  banda negra horizontal abajo.
- Corona de 5 puntas redondeadas en dos filas, con una línea negra, **siempre ladeada** sobre el asa (≈ 1/5 del alto).
- Ojos blancos grandes unidos en «8» con pupilas negras ovaladas; sonrisa en «D» con dientes blancos y lengua roja.
  Sin nariz, orejas ni cejas.
- Brazos y piernas de fideo negros; guantes blancos de 4 dedos estilo años 30; zapatos blancos grandes.
- Temporada: la corona **solo** se cambia por gorro de Santa (Navidad) o chupalla (Fiestas Patrias). Lo demás se
  cuenta con objetos alrededor.

### Referencias (`PERS/_Referencias para generar/Rey del Gas/`)
| Archivo | Uso |
|---|---|
| `01-canon-2019.png` | Canon de forma (PNG con transparencia, 1367×1775) |
| `02-referencia-edicion-gris-1600.png` | **La que se pasa al modelo:** la base vectorizada sobre gris `#808080`, 1600² |
| `03-vector-original-2019.ai` | Vector original (compatible con PDF; `pdftocairo -svg` lo abre) |
| `04-base-vectorizada.svg` | La base en SVG por capas |

### Receta de una pose nueva
1. Brief = [`../briefs/rdg-estilo.txt`](../briefs/rdg-estilo.txt) completo + un bloque `NEW POSE — "<nombre>":` que
   describa la pose, la mirada y la utilería (la utilería, en los mismos 4 colores).
2. `pnpm ai:image --openai-key personal --model gpt-image-2.5-sunburst --quality high --size 1600x1600 --image <02-referencia-edicion-gris-1600.png> --prompt-file <brief> --out <pose.png>`
3. Vectorizar: `NODE_PATH=$PWD/node_modules node <skill>/scripts/vectorize.cjs <pose.png> <salida-sin-ext> --fondo 128,128,128 --escala 2`
   → SVG por capas (`silueta`, `rojo`, `amarillo`, `blanco`) + PNG. Imprime el reparto de colores.
4. Recortar el SVG al personaje (viewBox con 3 % de aire) y renderizar el PNG transparente.
5. QA: reparto dentro de rango, mirar la cara al 100 % (ojos en «8», boca, corona de 5 puntas ladeada, guantes de 4
   dedos) y revisar las hojas sobre blanco, rojo `#DF1500` y gris tela `#E6E7E8`.

### Por qué así
- El fondo de la generación es **gris**, no blanco: guantes, zapatos y ojos son blancos y se perderían.
- La vectorización lleva cada píxel al color de paleta más cercano: el rojo y el amarillo quedan **exactos** aunque
  el modelo los haya corrido. La silueta negra va abajo y los colores encima, así el negro visible es el contorno y
  no hay costuras.

### Hoja v01 (10 poses)
`PERS/Rey del Gas 2D (hoja de modelo)/v01/`: 00 base · 01 megáfono · 02 corriendo · 03 señalando · 04 apoyado
(codo sobre el cilindro Lipigas, que se compone aparte) · 05 celular (pantalla en blanco) · 06 saludando ·
07 pensando · 08 celebrando · 09 guiño. Corrida: `ai-generations/2026-11-02_motogas-rdg-poses-2d/`.

### Lecciones
- Las 9 poses salieron a la primera con el brief completo: no hace falta iterar si el brief va entero.
- Para una pose con el megáfono, el modelo lo puso junto a la mejilla y dejó la boca libre (se pidió así): la sonrisa
  es el sello. Si se quiere en la boca, pedirlo explícito.

---

Su corte (paje, escudero, guardia, gigante, heraldo), el villano El Frío y los objetos 3D de su reino viven en
[`mundo-rey-del-gas.md`](mundo-rey-del-gas.md).

## 2. Gasfield (Gas Don Julio · Pudahuel y Quinta Normal)

### Identidad
- Cilindro de gas rojo con aro y válvula arriba. Se llamó «Gasfield» por concurso en junio de 2023. **No es «Don Julio».**
- **3D tipo juguete con acabado satinado** (decisión del operador, 2026-11-02: mate como el 3D ya publicado, no brillante).
- El 2D original sale de un **pack de stock de Freepik** (2023): confirmar la licencia antes de usarlo fuera de las cuentas.
- Es el único personaje que **se disfraza por temporada** (traje de baño, gorro de Santa, chupalla, bufanda, etc.).

### Invariantes
- Cuerpo de barril o farol, ≈ 1,1 veces más alto que ancho, hombros redondeados, costados algo abombados.
  **Nunca** esfera, cápsula ni botella alta.
- Soldadura horizontal a ≈ 55 % del alto, bajo la boca.
- Arriba: válvula corta y aro protector sobre 4 postes; diámetro del aro ≈ ½ del ancho.
- Abajo: collar cilíndrico corto (≈ 40 % del ancho, ≈ 8 % del alto); las piernas salen a sus costados.
- Rojo `#E31917`, sombra `#CF1317`, luz `#EB5F46`. Satinado: brillos anchos y difusos, sin reflejos duros.
- Exactamente 2 ojos ovalados negros con brillo, cejas en arco fino, 1 boca abierta con dientes y lengua.
- Brazos y piernas de fideo negros mate, manos de mitón con pulgar, zapatos ovalados negros.
- Sin texto, logo, nariz ni orejas en el modelo. El logo «GAS Don Julio» en la panza es variante de pieza.

### Referencias (`PERS/_Referencias para generar/Gasfield/`)
| Archivo | Uso |
|---|---|
| `01-frente-satinado.png`, `02-tres-cuartos-satinado.png` | **Las que se pasan al modelo** (forma + acabado aprobados) |
| `03-oficial-2d.png` | 2D oficial: canon de forma, como tercera imagen |
| `04-material-3d.png` | Material del 3D vigente (solo si hay que recuperar el acabado) |
| `05-guia-perfil-blender.png`, `06-guia-blender.blend` | Guía geométrica para cualquier vista de perfil |
| `07-espalda-satinado.png` | Vista de espalda aprobada (guía de silueta para giros) |

### Receta de una pose nueva
1. Brief = [`../briefs/gasfield-personaje.txt`](../briefs/gasfield-personaje.txt) + `Expression: …` + `POSE AND CAMERA: …`
   + [`../briefs/gasfield-render.txt`](../briefs/gasfield-render.txt). Vestuario de temporada: describirlo en la pose y
   decir que no tapa la cara, el aro ni la soldadura.
2. `pnpm ai:image … --quality xhigh --size 1600x1600 --image 01-frente-satinado.png --image 02-tres-cuartos-satinado.png --image 03-oficial-2d.png --prompt-file <brief> --out <pose.png>`
3. Si saliera brillante: editar la pose con [`../briefs/gasfield-satinado.txt`](../briefs/gasfield-satinado.txt)
   (imagen 1 = la pose, imagen 2 = `01-frente-satinado.png`). Nunca regenerar para cambiar el material.
4. Recorte con `pnpm ai:image:rmbg`. Si la pose lleva algo blanco (papel, pantalla), primero editar el fondo a gris
   con [`../briefs/fondo-gris.txt`](../briefs/fondo-gris.txt) y recortar desde esa versión.
5. QA sobre navy: halos, bordes mordidos, interior del aro transparente.

### Perfil (cuerpo redondo)
El perfil de un cuerpo redondo sale **angosto** (el modelo lo dibuja como cápsula). Solución probada: renderizar la
guía de Blender del ángulo pedido (cuerpo por revolución del contorno medido) y pasarla como imagen guía. Con eso
el perfil midió 97 % del ancho de frente (sin guía, 78 %). Y ojo con la geometría del brief: «lado izquierdo con la
cara a la derecha» es imposible.

### Hoja v01 (10 vistas)
`PERS/Gasfield 3D (hoja de modelo)/v01/`: 01 frente · 02 tres cuartos pulgar arriba · 03 perfil · 04 tres cuartos
de espalda · 05 espalda · 06 confundido · 07 llave · 08 celebrando · 09 celular · 10 corriendo.
Corrida: `ai-generations/2026-11-02_motogas-gasfield-modelo/`.

---

## 3. Perrito Lipigas (Lipigas Recoleta; Lipiestación)

### Identidad
- «El Perrito Lipigas», sucesor de **Spike** (perro real de los comerciales, ~2004–2016, creado por Ogilvy).
  Hoy es una **figura de peluche realista fotografiada**. Personaje publicitario más recordado de Chile (Cadem, jul-2025).
- **Es de Lipigas.** Motogas lo usa como franquiciado: las poses nuevas pasan por la aprobación de marketing de
  Lipigas antes de publicarse. Si Lipigas entrega un kit oficial de poses, ese manda.
- En Motogas aparece en Recoleta, como protagonista fijo de la pieza de Ubicación, con accesorios de temporada encima.

### Invariantes
- Peluche realista con pelo sintético largo y algo desgreñado. **No** perro vivo, dibujo ni CGI.
- Cachorro quiltro tipo terrier: café chocolate con fuego tostado en cejas, hocico, mejillas, pecho y patas;
  antifaz café en los ojos.
- Ojos de vidrio ámbar con brillo, nariz negra pequeña, boca cerrada con una línea fina. Orejas caídas.
- Almohadillas café oscuro.
- Collar de cuero **amarillo** con costura; placa **plateada cepillada con forma de cilindro**.
- **Placa con el logo Lipigas vigente** (símbolo sobre logotipo), compuesto desde `assets/lipigas/`.
  Las piezas publicadas antes de 2026-11 usan un logo anterior (corazón relleno).

### Referencias (`PERS/_Referencias para generar/Perrito Lipigas/`)
| Archivo | Uso |
|---|---|
| `01-base-placa-en-blanco.png` | **Imagen 1 al modelo:** la figura a 1600 px, con la placa en blanco |
| `02-cara-detalle.png` | **Imagen 2 al modelo:** la cara en alta, para el detalle |
| `03-recorte-original-2024.png` | El recorte oficial que existía (324×440) |
| `04-logo-placa-simbolo.png`, `05-logo-placa-logotipo.png` | Logo de la placa (igual a `assets/lipigas/`) |

### Receta de una pose nueva
1. Brief = [`../briefs/perrito-personaje.txt`](../briefs/perrito-personaje.txt) + `POSE — "<nombre>":` con la pose,
   la mirada y la utilería. La placa siempre **en blanco y de frente a la cámara**.
2. `pnpm ai:image … --quality high --size 1600x1600 --image 01-base-placa-en-blanco.png --image 02-cara-detalle.png --prompt-file <brief> --out <pose.png>`
3. Medir la caja de la placa (x,y,ancho,alto en px de 1600): superponer un rectángulo y mirarlo. La detección
   automática por gris falla en los bordes.
4. Grabar el logo: `node <skill>/scripts/placa.cjs <pose.png> <pose-placa.png> --caja x,y,w,h` (logo al 80 % del
   ancho, multiplicado sobre el metal).
5. Recorte, según la pose:
   - **Sin utilería blanca:** `pnpm ai:image:rmbg` sobre la versión con placa → `scripts/defringe.cjs` (quita el
     halo blanco del pelo).
   - **Con algo blanco** (pantalla, megáfono) o placa contra el piso: editar sólo el fondo a gris con
     [`../briefs/fondo-gris.txt`](../briefs/fondo-gris.txt) (sobre la pose sin logo), grabar la placa en esa versión,
     recortar, `defringe.cjs --fondo 124` y `reponer-placa.cjs <fuente> <recorte> <salida> x,y,w,h` (repone la placa
     opaca y el pelo de alrededor). Si aún faltan zonas, unir con el recorte del fondo blanco: `unir-recortes.cjs`.
6. QA sobre blanco, amarillo `#FFD400` y navy `#002989`: placa sólida con logo legible, pelo sin halo, sin manchas
   del piso.

### Hoja v01 (9 poses)
`PERS/Perrito Lipigas (hoja de poses)/v01/`: 00 base (saluda) · 01 cabeza ladeada · 02 pata extendida ·
03 trotando · 04 echado · 05 celular · 06 megáfono · 07 celebrando en dos patas · 08 mirando arriba (tercio
superior libre). Corrida: `ai-generations/2026-11-02_motogas-perrito-lipigas/`.

### Lecciones
- El recortador sobre fondo blanco **borra lo blanco del sujeto**: la pantalla, el cono del megáfono y la placa
  quedan transparentes. Por eso, la vía con fondo gris editado.
- El gris del fondo se parece al metal de la placa: siempre reponerla después.
- «Apuntar» con la pata se lee como «choca esos cinco»; si importa la dirección, girar el cuerpo y la mirada.
