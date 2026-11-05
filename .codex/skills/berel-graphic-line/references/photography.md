# Fotografía Berel — registros por estrato, plate y recorte

> Solo Berel. Nada de esto aplica a Efeonce (su fotografía es `efeonce-graphic-line` + brand-photography),
> a SKY ni a otro cliente.
> Fuente de verdad de los valores: `creative-workbench/brands/berel/contracts/berel-photo-registers.json`
> (schema `berel.photo-registers.v1`, estado **candidato**). Lo de abajo es un **snapshot del 2026-11-02**:
> si el contrato cambió, manda el contrato.

## 1. Cómo se fotografía Berel

Berel vende a estrato medio, medio-alto y alto, pero **se fotografía aspiracional**. El operador lo dijo así
(2026-11-02): «las fotos de berel son como de gente más de dinero». La regla del contrato: incluso el
registro accesible se ve como un hogar bien diseñado de estrato medio-alto.

Lo observado en las piezas entregadas jun–nov 2026 (libro `brands/berel/system/BEREL_VISUAL_SYSTEM_V1.md` §7;
el manual de Berel no tiene sección de fotografía, estas reglas salen de las piezas):

- **El muro pintado es el protagonista.** La foto vende un color de pintura; si el muro no se lee, la foto no sirve.
- **Luz cálida**: ventana lateral, sol bajo con sombras de follaje o de marcos (en las 64 medidas del libro,
  ninguna imagen es fría). La sombra no cubre más de un tercio del muro.
- **Contemporáneo cálido** con objetos mexicanos puntuales (barro, talavera, agave), nunca recargado.
- **Ya pasó y no se repite**: la misma «sala plantilla» con otro color, un trípode de estudio dentro de una
  casa, casas de suburbio estadounidense, retratos de difuntos inventados en Día de Muertos.
- **Producto, Don Bere y Frida Kahlo**: nunca se generan. El producto es el render oficial compuesto después;
  Don Bere, los renders 3D oficiales; Frida Kahlo tiene licencia de Frida Kahlo Corp. y nunca se genera ni se
  insinúa su rostro ni su arte.

## 2. Los tres registros

El registro lo fija **el producto y el tema del artículo**, no el gusto del día. Elígelo antes de escribir
el prompt.

| Registro | Cuándo (campo `use`) | Lente | Cómo se ve | Criterio para elegirlo |
|---|---|---|---|---|
| `medio` | Tutoriales, problemas (humedad, salitre, grietas), líneas de entrada, impermeabilizantes | 24 mm | Departamento o casa bien diseñados en colonia consolidada (Narvarte, Del Valle, Chapultepec en Guadalajara); piso de madera o porcelanato de formato grande; ventanas negras o de madera; buena carpintería; decoración simple y curada; luz de día brillante, neutra a cálida | El artículo resuelve un problema o vende una línea de entrada. Sigue siendo **medio-alto accesible**, nunca fraccionamiento |
| `medio-alto` | Inspiración de color, paletas, Color del Año, tendencias | 28 mm | Interior de revista en colonias como Coyoacán, Roma, Del Valle, Providencia o San Pedro; madera sólida, lino, tapete tejido, uno o dos objetos de artesanía mexicana discretos (barro negro, talavera chica, cesto de palma); luz lateral de tarde, cálida; sombras de manguetes u hojas en menos de un tercio del muro | El artículo inspira con color. Es el registro por defecto del blog de inspiración |
| `alto` | Líneas premium, acabados especiales, lanzamientos | 28 mm | Arquitectura mexicana contemporánea (sin copiar una casa ni un arquitecto reales): cantera, concreto aparente **solo como elemento terminado**, parota o tzalam, celosía de barro o patio interior; proporciones generosas, mobiliario contenido; luz de patio, tragaluz o ventana alta, calma y direccional. Lujo silencioso: sin oro, sin candiles, sin exceso de mármol | El producto es premium o es un lanzamiento. Su señal (celosía, patio) suele vivir en un costado: afecta el recorte social (§6) |

Por qué la lente cambia: el `medio` usa 24 mm porque sus espacios son de proporción estándar y hay que
meter el cuarto completo; `medio-alto` y `alto` usan 28 mm, más editorial y con menos deformación.

**Rechazo que fijó el piso (2026-11-01/02):** la primera versión de `medio` salió de estrato bajo
(fachada de fraccionamiento, ventanas de aluminio blanco). El operador la rechazó y el registro se
recalibró a medio-alto accesible. Ver [lessons.md](lessons.md).

**Subir de registro, no parchar muebles (2026-11-04).** Sobre la N4 de Umbral Vivo (sala-comedor, `medio-alto`) el
operador comentó: «Necesitamos que esta foto sea distinta, que se vea de mayor poder adquisitivo». La salida fue
regenerar con `prompt-plate.mjs --registro alto`: residencia, plafón generoso, ventanal de piso a techo, piso de piedra,
parota o tzalam, sillas de lino y herrajes discretos de bronce oscuro, sin oro ni candiles (el «lujo silencioso» del
registro alto). Se conservaron composición y colores y cada color se volvió a corregir. Regla: si el cliente dice que una
escena «se ve de menor poder adquisitivo», se regenera en `alto`; no se cambian muebles sueltos sobre el mismo plate.

## 3. El bloque común, regla por regla

El bloque `common` del contrato entra en **todo** prompt. Cada regla existe por una razón de
composición o de estrato; no la quites para «dar libertad» al modelo. Desde el 2026-11-02 (schema v1) la cámara y
las reservas del muro viven en la **toma** (`takes.espacio.camera`, que también usan `personas` y `nocturna`) y el
bloque común conserva solo realismo, sin texto, sin fraccionamiento y remates; la tabla las mantiene juntas porque
la toma `espacio` es la de siempre.

| Regla (resumida) | Por qué |
|---|---|
| Foto arquitectónica editorial de un hogar real en México, para la revista de inspiración de una marca de pintura | Fija el género: casa real y vivida, no catálogo de muebles ni render |
| (toma `espacio`) Cámara full frame, lente del registro, altura 1,2 m, verticales corregidas, **enfocada en el muro a f/5,6** | Verticales rectas = muro limpio y frontal; altura 1,2 m es la mirada de revista de interiores. Antes decía «profundidad de campo amplia» y el modelo dejaba nítida también la esquina del logo; ahora lo único fuera de foco es el lecho planeado (§5 bis) |
| Color fiel, rango dinámico realista con detalle en sombras, grano de película muy sutil; materiales reales con imperfecciones honestas | Evita el aspecto de IA y de render; el grano sutil es el que la grilla borra al medir (desenfoque σ=1) |
| Muro protagonista: superficie mate, lisa, pareja, **40–55 % del cuadro**, frontal; su color debe leerse | El producto es el color. Un muro pequeño o en escorzo no deja leer el color ni da celda al marcador |
| **Tercio superior del muro libre** de cuadros, repisas, lámparas, espejos u objetos | Ahí va el marcador de color de los banners de blog (objetivo de la grilla en el tercio superior) |
| **Cuadrante superior izquierdo del cuadro = muro liso** | Ahí va el titular social (post y story). El compositor mide los bordes bajo el titular y avisa sobre 6 |
| Mucho muro sobre los muebles | Da aire al marcador: el operador pidió «jugar con el aire con elegancia» |
| **Primer plano desenfocado planeado en la esquina inferior izquierda** (bloque `FOREGROUND`, §5 bis) | Ahí va el logo blanco de Berel. «Esquina tranquila» no bastaba: en 35 de las 38 piezas compuestas el logo quedaba bajo 4,5:1 |
| Fuera del lecho, nada importante a menos de 12 % de los bordes izquierdo y derecho | Los recortes verticales (post, story, Pinterest) comen los costados de un plate 4:3 |
| Sin texto, letras, números, señalética, logos, marcas, latas ni títulos de libros | El texto y la marca se componen después con los archivos oficiales; una lata generada falsea el producto |
| Sin personas ni mascotas, salvo en las tomas que las piden (`personas`; `proceso` solo manos) | El plate de espacio es para rotular un color; las personas tienen su toma |
| No render, no CGI, no imagen de IA: sin superficies plásticas, simetría perfecta, pisos demasiado brillantes, interiores de suburbio estadounidense, ni el **cliché** de sofá bouclé + mesa de centro redonda + olivo + cuadros de arcos | Es la «sala plantilla» que ya se repitió; el cliché delata la IA y baja la credibilidad |
| **Nunca fraccionamiento**: sin ventanas de aluminio blanco, mueble laminado barato, sanitarios de plástico ni desorden | Baja el estrato; es exactamente lo que el operador rechazó |
| **Remates terminados**: el muro pintado se encuentra con plafón, vigas, piso y vanos en líneas rectas y limpias con sombra de remate o moldura; nunca pintura terminando irregular contra concreto o piedra, ni frizo, cornisa o borde de plafón sin terminar | Un encuentro mal terminado se lee como obra barata y no se puede aprobar «por el estrato» (caso terraza, 2026-11-02) |

Después del bloque común, el builder agrega el registro, el espacio y la frase del muro:
«The wall facing the camera is painted Berel "{name}" {code}, exact paint color hex {hex}». El HEX sale del
catálogo oficial, nunca lo escribes tú. **Pedirlo no basta**: el modelo no clava el color, por eso existe el
corrector ([color-pipeline.md](color-pipeline.md)).

> **Nota sobre personas.** El libro (§7) describe personas en piezas existentes (manos sin rostro, adulto de
> perfil en diagnóstico, familias al fondo y desenfocadas; nunca retratos de frente). Desde el 2026-11-02 eso
> tiene toma propia: `personas` (familia sin mirar a cámara) y `proceso` (solo manos y antebrazos).

## 4. Espacios disponibles

Claves del contrato (`spaces`), snapshot 2026-11-02. Cada una dice dónde está el muro pintado:

| Clave | Muro pintado | Reserva propia |
|---|---|---|
| `recamara` | Detrás de la cama | Muro sobre la cabecera completamente libre |
| `sala` | Detrás del sofá | Muro sobre el sofá libre |
| `cocina` | Muro del fondo (cocina con antecomedor) | Máximo una repisa baja; parte alta libre |
| `comedor` | Detrás de la mesa | Parte alta libre |
| `fachada` | Muro principal de la fachada, desde la banqueta a la altura de los ojos, perspectiva de dos puntos | — |
| `infantil` | Detrás de la cama | Tercio superior libre; solo peluches o una repisa chica abajo |
| `bano` | Detrás del lavabo y el inodoro (nunca el muro de la regadera) | Azulejo solo como zoclo bajo; arriba solo un espejo simple |
| `estudio` | Detrás del escritorio | Parte alta libre; sin libreros llenos |
| `terraza` | Muro exterior principal de una terraza cubierta o patio | — |

Un espacio que no está en la lista falla cerrado en el builder. Madera, herrería, diagnóstico, exterior, azotea,
cenital, proceso, nocturna y muestra ya no son espacios sino **tomas** (§5 bis). Si el brief pide otra cosa, primero
se agrega al contrato en el Workbench, con su prueba; no lo improvises con `--extra`.

## 5. Armar el prompt: siempre con `prompt-plate.mjs`

**Nunca concatenes bloques a mano.** El builder lee el contrato vigente, valida el par nombre+código contra el
catálogo oficial y saca el HEX de ahí. Concatenar a mano ya produjo prompts con el bloque común viejo (sin
fraccionamiento ni remates).

Desde la raíz del Workbench (`/Users/jreye/Documents/creative-workbench`):

```bash
node brands/berel/scripts/prompt-plate.mjs \
  --registro medio-alto --espacio comedor \
  --color "Ciudadela" --codigo 4-1105D \
  --extra "Variant: dining room with a solid wood table for six, woven chairs, a natural-fiber pendant lamp hanging over the RIGHT side of the table, a low sideboard with a clay pot and fruit bowl. The upper-left half of the painted wall is blank."
```

- Sin `--json` imprime el prompt. Con `--json <batch.json>` agrega `{ filename, prompt }` a un lote para
  `pnpm ai:image --batch`.
- `--extra` es la variante de la escena: muebles, materiales, dónde caen la lámpara o el espejo. Úsalo para
  **empujar los objetos a la derecha** y repetir «the upper-left half of the painted wall is blank»: así lo
  hizo la ronda que funcionó (`ai-generations/2026-11-01_berel-espacios/ronda-2/v2/specs.tsv`).
- `--extra` nunca contradice el bloque común. La primera fachada pedía «fraccionamiento … white aluminum
  windows» en el `--extra` y por eso salió de estrato bajo; ese prompt sigue en `ronda-2/specs.tsv` (raíz)
  como evidencia del rechazo: **no lo reutilices**, el vigente está en `ronda-2/v2/specs.tsv`.
- Al prompt del builder se le agrega, en la corrida, el párrafo del chip de color (ver
  [workflow.md](workflow.md) §4 y `ronda-2/run.sh`).

## 5 bis. Tomas fotográficas y banda del titular (2026-11-02, candidato)

El **registro** es el estrato; la **toma** es el tipo de foto. Se eligen por separado:
`prompt-plate.mjs --registro medio-alto --toma diagnostico [--espacio …]`. Salen de la exploración del OneDrive de
Berel (registros que ya usa el squad y no estaban codificados).

| Toma | Para qué | Muro de color | Qué cuida su cámara |
|---|---|---|---|
| `espacio` (defecto) | Inspiración de color | Sí | Muro protagonista 40–55 %, tercio superior libre |
| `antes` | Par antes/después; misma cámara que el después | No (muro viejo) | Mismos muebles que el después |
| `diagnostico` | Humedad, salitre, grietas | No | Problema legible sin exagerar; luz fría y suave |
| `exterior` | Fachadas | Sí | La fachada llena la banda alta; árbol, plantas y puerta abajo o a la derecha |
| `azotea` | Impermeabilizantes | No | Cielo nublado parejo (sin nubes dramáticas arriba); tinacos bajos en el horizonte |
| `cenital` | Paletas, muestrarios | Sí (carta mayor) | Madera lisa; cartas y objetos en los dos tercios inferiores y la mitad derecha |
| `proceso` | Tutoriales, manos | Sí | Rodillo y manos en la mitad inferior; arriba muro |
| `taller` | Madera | No | Silla baja en el cuadro, muro arriba |
| `herreria` | Esmaltes | Sí (reja) | Reja baja (≈ 1,2 m) frente a un muro liso que llena la mitad superior |
| `personas` | Cierres, vida en casa | Sí | Familia ficticia, sin mirar a cámara |
| `nocturna` | Noche, luz cálida | Sí | El muro se sigue leyendo con la luz de lámpara |
| `muestra` | Elegir color: prueba en el muro | Sí (hoja grande) | Hojas a media altura y a la derecha; sin cuadros en ese muro |

**Banda del titular (todas las tomas).** Post y story componen el titular arriba, casi a todo el ancho del
recorte (post 13–30 % del alto, story 15–29 %). Sobre el plate 4:3 eso es la banda de 10 a 35 % del alto en el
70 % central, más el cuadrante superior izquierdo. El builder agrega siempre el bloque `TEXT SPACE`: superficie
calma y pareja, sin objetos, cuadros, lámparas colgantes o de muro, ventanas, plantas, vigas, repisas ni sombras
duras. **Se mide antes de corregir color o componer**, gratis:

```bash
node brands/berel/scripts/medir-plate.mjs <plate.png> [--focal post=u,v] [--focal story=u,v] [--vista <dir>]
```

Densidad de bordes en la caja del titular de 3 líneas, como el compositor: ≤ 6 limpio (muro limpio 1,5–4,4;
ventana, lámpara u objetos 8,6–14). Usa el mismo `focal` que pondrás en el job. Si falla, cambia el foco o
regenera; nunca tapes con un velo. En el piloto de 13 tomas pasaron los interiores con muro y fallaron las tomas
cuya cámara metía textura arriba (cielo de tormenta, sombras de hojas, reja alta, rodillo, árbol, lámpara
colgante): de ahí salen las reglas de la columna derecha.

**Lecho del logo: opcional y apagado** (decisión del operador, 2026-11-02: «si no funciona no te compliques con
el lecho… hasta el momento lo hemos hecho sin él y sin problema»). El contrato conserva el catálogo (`beds`,
`foreground`) por si se pide: `--lecho <id|auto>` en el builder, `"lecho": true` en el job (ancla los recortes con
logo abajo a la izquierda) y `--lecho` en `medir-plate.mjs`. Lo que se aprendió en tres rondas: el logo pasa de
1–2,5:1 a 10–19:1, pero el lecho tiende a crecer (mediana 9 % del cuadro, 17× el logo), se repite como forma, y en
exterior soleado o con un marco delgado no se sostiene.

## 6. Recorte social según el registro (`photo.focal`)

Un plate 4:3 (2048×1536) alimenta los cuatro formatos. El compositor recorta con `coverCrop` alrededor de
`photo.focal` (`[u, v]` de 0 a 1 sobre la foto; por defecto `[0.5, 0.5]`). `focal` solo mueve el recorte;
nunca es una coordenada del marcador.

- El titular social (post y story) va a la izquierda. Si la señal del registro está en un costado (en `alto`,
  la celosía o el patio), **post y story centran el recorte** para que el titular caiga sobre muro, y
  **Pinterest, que no lleva titular, la muestra**. Caso real (`projects/berel/espacios-gpt-image/jobs/`):
  recámara alta con `focal [0.55, 0.5]` en post y story, `[0.36, 0.5]` en Pinterest.
- **Nunca pongas el titular sobre concreto o vidrio claro**: no se lee y ensucia el muro.
- **Viñeta completa en cada recorte vertical** (regla `grids.framing` del contrato de recetas, 2026-11-02): ningún
  mueble principal cortado a la mitad por el borde. Una escena simétrica (dos sillones) recortada al centro parte
  los dos; elige `focal` por formato para encuadrar uno entero. Si el recorte deja el titular sobre un objeto
  (columna, ventana), el aviso «titular sobre fondo cargado» lo delata: usa la otra viñeta. Caso terraza: post
  `[0.27, 0.5]` (sillón izquierdo y agave, titular sobre muro), story `[0.64, 0.5]` y Pinterest `[0.72, 0.5]`
  (sillón derecho y cantera). Cita del operador: «lo que se ve en estos formatos más verticales es como mal encuadrado».
- Si la grilla avisa «sin celda de primer nivel», mover `focal` es una de las tres salidas (las otras:
  acortar el titular o aceptar el aviso tras mirar la pieza). Ver [marker-grid.md](marker-grid.md).
- **Fachada en recorte vertical (2026-11-04, Color a la Mexicana N1, Sueño Mexicano 3-2005D).** En una fachada ancha
  de dos pisos el post 4:5 dejó el titular sobre cielo, ramas y ventanas con **todo** foco de 0.15 a 0.85, aun con
  titulares más cortos (aviso «titular sobre fondo cargado», bordes 9–17 > 6). La story 9:16 pasó con foco 0.3 y
  Pinterest (sin titular) con 0.5. El prompt de fachada había pisado la reserva del espacio del titular.
  - **En el plate:** si una fachada va a alimentar piezas sociales, pide en `--extra` que el cuadrante superior
    izquierdo quede como muro o cielo calmo, sin ramas, y mídelo con `medir-plate.mjs --focal post=…` antes de corregir
    color.
  - **Salida permitida en la pieza:** la receta `social.post` admite «la escena de portada o su versión después»; si
    ningún foco da banda limpia, el post puede salir de **otra escena del mismo artículo** con muro alto limpio (aquí,
    la sala N4 en Cempasúchil 2-1305D). Es una desviación consciente: se **declara en el handoff**, con el aviso que la
    motivó.
- **La story tiene que funcionar como story (2026-11-05, Rayados).** Una puerta lisa que llena el cuadro se rechazó:
  «no funciona como story». La story pide una escena con profundidad y un objeto focal claro, el titular sobre muro
  calmo y aire abajo para los stickers de la agencia. Si el recorte 9:16 del plate no lo da, se elige otra escena del
  artículo o se amplía el muro (siguiente punto); nunca un acercamiento a una superficie plana.
- **Título del artículo en todas las piezas sociales (2026-11-05).** Cita: «En el título debería ir en todas el título
  del artículo». En 9:16 el título de Rayados ocupó 3 líneas y la tercera pisaba la tele. Salida aplicada en la story
  fija: **ampliar el muro hacia arriba**, no acortar el título: se recortó la franja del plafón, se armó un lienzo más
  alto con el borde superior reflejado como relleno, se pintó la banda nueva con GPT Image 2.5 Flare y máscara, se
  reparó la banda de la unión y se igualó el muro sobre la unión **fila por fila en Lab** (media de cada fila contra la
  del muro original, dentro de la máscara del corrector). Una ganancia solo de luminancia subió la saturación y se
  descartó. Fal.ai Flux Fill no estaba disponible (saldo agotado). En el reel se resolvió distinto: [video.md](video.md)
  §5 ter.

## 6 bis. Producto en escena (método guiado, 2026-11-02, candidato)

Fuente de verdad: `productInScene` en `berel-photo-registers.json`; código `compose/product.mjs` +
`scripts/producto-en-escena.mjs`. Valores de abajo: snapshot del 2026-11-02.

Pedido del operador: «la etiqueta se vea realista y no se alteren los textos… el acabado debe darlo el modelo porque
maneja mejor la física, luces», y después: «un buen montaje se conoce por NO parecer un montaje».

### Flujo vigente

1. **Render oficial.** De `02_Recursos/03_Producto PNG` del OneDrive de Berel, **empaque vigente** (nunca las carpetas
   «Vieja_…»), admitido en `clients/berel/.resources-local/products/` (nunca en Git). Nunca una lata generada.
   Antes de colocarlo, comprueba que su forma corresponde al contenido (§ renders maqueta).
2. **`colocar`.** El código pone el render a su escala **calculada por el diámetro** del envase (`sizes`, su ancho
   visible en el render frontal), cruzada con una referencia medida con regla a resolución completa, y la multiplica
   por la **presencia publicitaria** (`defaultPresence` 1,4; `--presencia` 1–1,5, queda en `colocacion.json`).
   ```bash
   node brands/berel/scripts/producto-en-escena.mjs colocar --foto <plate> \
     --producto clients/berel/.resources-local/products/INSIGNIA_4L.png --x 0.55 --base 0.80 \
     (--referencia <metros>:<px> | --suelo <horizonte>:<altura de cámara en m>) --nombre "Insignia 4L" \
     --superficie "the wooden sideboard" --textos "Berel|Insignia|CONT. NET. 4L" \
     --out projects/berel/<pieza>/salidas/producto/<slug>
   ```
   `--alto` ya no existe (un tamaño a ojo es justo lo que confunde). Falla si el render no tiene diámetro en `sizes`
   o si el producto queda bajo 60 px de ancho (`minWidthPx`). Escribe `compuesto.png`, `producto.png`,
   `referencia.png` (render aplanado sobre blanco), `prompt.txt` y `colocacion.json`, e imprime el comando siguiente.
3. **El modelo redibuja** (desde Greenhouse, una intención ≈ USD 0,12):
   `pnpm ai:image --image <out>/compuesto.png --image <out>/referencia.png --prompt-file <out>/prompt.txt
   --model gpt-image-2.5-sunburst --quality xhigh --size <ancho>x<alto> --format png --out <out>/integrada.png`.
   Dos imágenes: el compuesto fija tamaño y posición; la referencia, el empaque. El prompt prohíbe agrandar, mover o
   inclinar el producto y cita los textos de la etiqueta.
4. **`verificar --dir <out>`** (salida 1 si falla): alto 0,88–1,12× el colocado, corrimiento ≤ 30 px, escena fuera
   del producto ≤ 8/255. Corre OCR local de los textos clave (Swift + Vision en modo `.fast`; `.accurate` falla con
   `e5rtError`): es **aviso**, no lee el logotipo «Berel» ni algunas palabras estilizadas. Si pasa, copia la foto a
   `producto-en-escena.png` y deja `qa.json` con `approval: pending-human-and-pixel-review`. Mira la etiqueta al 100 %.
5. **`restituir`** es **respaldo**, solo si un texto clave quedó mal: alinea la lata del modelo (±24 px) y multiplica
   el render original por la luz de baja frecuencia del modelo; exige fidelidad ≥ 0,95 (`--min`), desplazamiento
   ≤ 8 px y alineación clara. Deja la etiqueta con aspecto montado: por eso no es el camino principal.

### Palancas (`levers`)

- **Contexto:** el envase va donde se usa (impermeabilizante en la azotea, sellador frente al muro dañado, galón en el
  piso del espacio, laca junto al mueble de madera, aerosol frente a la herrería).
- **Escala ≠ presencia.** A 4 m de la cámara un galón real se ve chico aunque esté a escala (operador: «un galón de
  4 L jamás se verá así»). Un producto protagonista necesita una **superficie de producto planeada en el plate**
  desde la toma: bloque `PRODUCT SURFACE` en el `--extra` (aparador o banco en primer plano a ≈ 1,5 m). Con la
  cámara a 1,2 m de altura el piso cercano queda fuera del cuadro: no se puede acercar después. Nunca se agranda en
  su lugar.
- **Envases chicos** (aerosoles, litros, ½ L): solo en la toma `detalle` (cámara a la altura de la superficie). En
  una toma de espacio a escala real miden 35–40 px y no se leen.
- **Posición:** dentro de los recortes verticales con foco centrado (u 0,32–0,68); nunca en la banda del titular ni
  en la esquina del logo.
- **Recortes con producto cercano** (base > 0,82, `storySafeBaseV`): el blog se ancla abajo (`focal [x, 1]`; su recorte
  1408×768 corta el 14 % inferior del plate) y la story lo deja fuera con su focal (la story es del titular; sus
  340 px inferiores son interfaz). Producto lejano (base ≤ 0,82): aparece en los cuatro formatos. Producto en un
  costado: post, story y Pinterest corren su focal hacia él midiendo la banda del titular. **Nunca toca el logo del
  post:** se mueve el producto, no se corta la viñeta.
- **Dos logos permitidos** (operador: «sí, que salga dos veces el logo»): la pieza conserva la firma compuesta (logo
  blanco abajo a la izquierda) aunque la etiqueta ya muestre el logo Berel. La etiqueta es producto, no firma; la
  regla de un solo logo aplica a los logos compuestos (`never` en `berel-recipes.json`).

### Renders maqueta (`excludedRenders`)

Un render cuya forma no corresponde a su contenido es una maqueta, no el empaque. Todos los renders de Mancha (y
algunos diluyentes) de 1 L tienen forma de aerosol con boquilla y «CONT. NET. 1L»; no existe un aerosol de 1 L
(operador: «así no se ve un aerosol»). Para madera se usa la lata redonda real: Laca de Nitrocelulosa 1L (Ø 10,5 cm).
A Berel hay que pedirle el empaque real de las Manchas.

Renders con diámetro admitido (`sizes`, snapshot 2026-11-02): INSIGNIA_4L 0,17 m · KOVER_PRO_19L 0,30 m ·
SELLADOR_ANTISALITRE_530_19L 0,30 m · LACA_NITRO_MEDIANA_DILUCION_SEMIMATE_1L 0,105 m · AEROSOL_BRILLANTE_VERDE_CHILE
0,065 m. Uno nuevo se agrega con su fuente antes de colocarlo.

### Cómo se llegó aquí (resumen; el detalle está en `pilot` y `pilotGuided` del contrato)

| Vía o ronda | Resultado |
|---|---|
| Solo colocación determinista | Etiqueta exacta (fidelidad 1,00), pero se ve pegada: luz de estudio, sin sombra |
| Edición completa con Sunburst, sin referencia | Luz y sombra reales; **reescribe los textos pequeños** (0,05–0,48) |
| Inpainting con máscara | **Inventa otro producto**. Descartado |
| Híbrido (modelo + etiqueta del render) | Fidelidad 0,96–0,99, pero la etiqueta se ve montada → hoy es respaldo |
| Escala a ojo | Entre 25 % chico y casi el doble |
| Escala por el alto | 15–40 % chica: los renders son más altos que el envase real respecto de su ancho |
| Escala por diámetro (física) | Correcta, pero se leía chica |
| Solo modelo con referencia | Etiquetas correctas, tamaño 1,35–1,6× sin control |
| **Guiado 1,4×** (vigente) | Insignia en aparador 360 px (alto 1,10×, escena 4,1/255), Laca 1L 207 px (1,00×), aerosol 630 px (0,97×), Kover 19L 294 px (0,92×): todos ok en `verificar` |

Sin probar (`notTested`): producto abierto o en uso, en mano, familia de tamaños en una escena y toma cenital (los
renders son frontales).

Trampa de implementación (corregida): en sharp, dos `extractChannel` en el mismo pipeline no se encadenan; el último
reemplaza al primero. El alfa del render se materializa antes de extenderlo, o la «máscara» es el canal rojo.

## 6 ter. Co-branding con una marca de terceros (2026-11-05, Rayados)

Caso fuente: artículo N52 «Colores de Rayados: la historia del azul y blanco» (patrocinio Berel × Club de Futbol
Monterrey). El operador pidió que la escena dijera «Rayados» sin inventar marcas. Lección fechada:
[lessons.md](lessons.md) (entrada 2026-11-05, co-branding).

| Elemento | Permitido | Cómo se produce |
|---|---|---|
| Partido en la tele | Sí: balón hacia la pantalla, jugador de espaldas con camiseta a rayas, tribuna | Se edita **solo la pantalla** con `pnpm ai:inpaint image` (GPT Image 2.5 Sunburst); la zona protegida queda idéntica bit a bit. **Sin** escudo, patrocinadores, marcador ni gráficos de la televisora; ningún jugador reconocible |
| Escudo del club | Sí, solo el oficial | SVG descargado del sitio del club (`storage.rayados.com/games_teams/11_rayados-cuadrado.svg`), guardado en `clients/berel/.resources-local/logos/rayados-escudo-oficial.svg` con su `LEEME` (fuente y fecha). **Nunca se genera** ni lo redibuja el modelo desde cero |
| Camiseta enmarcada (vitrina) | Sí, sin Puma ni patrocinadores | Escudo en el pecho izquierdo de quien la viste (Puma iría en el derecho y no va). Autógrafo **genérico e ilegible**, nunca la firma de un jugador real |
| Escudos en piezas históricas | No, si la fuente no lo respalda | Ver [lessons.md](lessons.md) (infografía reemplazada) |

**Componer y después terminar.** Cita: «si lo pones después debes pedirle al modelo que le dé el acabado porque si no se
ve "puesto"». Receta usada con el escudo sobre la camiseta:

1. Componer el SVG oficial a escala en el pecho de la camiseta (la vitrina va centrada sobre la cama).
2. Recortar la zona (512 px) y ampliarla a 1024; editarla con `gpt-image-2.5-sunburst` calidad `high` pidiendo solo
   materia y luz (tela, relieve, brillo del vidrio).
3. Devolver al plate **solo la silueta del escudo**, con un ajuste de color medio medido en un anillo alrededor para que
   empate con la tela; verificar **0 píxeles distintos fuera de la silueta**.

**Pendiente:** derechos de uso del escudo en el blog, a confirmar con Berel. Hasta entonces la pieza es candidata.

## 6 quater. Objeto sobre un muro con patrón (franjas, azulejo, papel tapiz)

Cuando el modelo agrega un objeto dentro de una máscara, también repinta el fondo de la máscara: en Rayados la franja
vertical del muro perdió continuidad detrás de la vitrina (lo vio el operador). Regla:

1. **Medir la caja del objeto** en la edición con perfiles de píxeles oscuros por columna y por fila, nunca con una sola
   línea de barrido: la esquina iluminada por la ventana engañó la primera medición y cortó el marco izquierdo.
2. **Conservar de la edición solo esa caja**, devolver el muro original alrededor y agregar una sombra de contacto
   sintética y suave.
3. **Verificar 0 píxeles distintos** fuera de objeto + sombra.

Modelos en ese caso: el marco vacío salió con GPT Image 2.6 Flare con máscara (el operador sugirió 2.6 con boceto o
marcado); la camiseta, con GPT Image 2.5 Flare con máscara, porque Sunburst sin máscara reencuadró la escena 63 px.
Detalle y cita: [lessons.md](lessons.md) (entrada 2026-11-05, «Una edición por zona repinta el fondo»).

## 7. Rechazos que no se repiten

| Fecha | Rechazo | Razón | Qué cambió |
|---|---|---|---|
| 2026-11-01/02 | Registro `medio` de la ronda 2 (se regeneraron fachada, infantil, baño y comedor) | Se veía de estrato bajo: fachada de fraccionamiento, aluminio blanco | `medio` recalibrado a medio-alto accesible; «nunca fraccionamiento» en el bloque común; plates regenerados (`ronda-2/v2/`) |
| 2026-11-02 | Terraza `alto` con viga de concreto aparente | «Esto es un frizo mal terminado? si es así no se puede aprobar para Berel por el estrato»: la viga terminaba irregular contra el muro pintado y en los recortes verticales la píldora caía encima | Regla de remates en el bloque común; «concreto aparente solo como elemento terminado» en `alto`; plate regenerado con plafón liso y sombra de remate (`ronda-2/v3/`); caso en `lessons` del contrato |
| 2026-11-04 | Sala-comedor N4 de Umbral Vivo en `medio-alto` | «Necesitamos que esta foto sea distinta, que se vea de mayor poder adquisitivo» | Regenerada con `--registro alto`, misma composición y colores, cada color corregido de nuevo (§2); caso en `lessons` del contrato |
| 2026-11-04 | Post 4:5 de la fachada N1 de Color a la Mexicana | Titular sobre cielo, ramas y ventanas en todo foco 0.15–0.85 (bordes 9–17) | Post desde otra escena del artículo (N4), declarado en el handoff; reserva del cuadrante superior izquierdo en fachadas que irán a social (§6) |
| 2026-11-05 | Vitrina agregada sobre el muro a franjas de Rayados | La franja perdió continuidad dentro de la máscara | Solo la caja medida del objeto + muro original + sombra sintética (§6 quater) |
| 2026-11-05 | Story de Rayados con una puerta lisa llenando el cuadro | «no funciona como story» | Escena con profundidad y objeto focal; muro ampliado hacia arriba para el título de 3 líneas (§6) |
| 2026-11-05 | Unión del muro ampliado igualada con ganancia de luminancia | Subió la saturación del muro | Igualado fila por fila en Lab con la máscara del corrector (§6) |
| 2026-11-01/02 (antes de la grilla) | Marcadores sobre la lámpara (estudio) y sobre objetos | «Necesitamos reglas para que esto no se ponga sobre objetos así porque pierde limpieza y no se lee bien el texto» | Lo resuelve la grilla, pero empieza en el plate: tercio superior del muro libre y objetos a la derecha. Ver [marker-grid.md](marker-grid.md) |

Detalle fechado de cada caso, con su cita completa: [lessons.md](lessons.md).

## 8. Pendiente (no verificado con Berel)

- Registro fotográfico definitivo: hora dorada actual vs. luz de día del lenguaje histórico (libro §9.2).
- Derechos de uso del escudo de Rayados en el blog de Berel (§6 ter), sin confirmar al 2026-11-05.
- Los registros son **candidatos**: los aprueban Daniela, Andrés o Melkin, y luego Berel. Berel sigue `gated`
  en `clients/brands.json` (TASK-1945); ningún plate sale al cliente sin esa revisión.
