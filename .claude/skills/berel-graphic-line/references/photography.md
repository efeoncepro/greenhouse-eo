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

## 5 bis. Tomas y lecho del logo (piloto 2026-11-02, candidato)

El **registro** es el estrato; la **toma** es el tipo de foto. Se eligen por separado:
`prompt-plate.mjs --registro medio-alto --toma diagnostico [--espacio …] [--lecho …]`.

| Toma | Para qué | Muro de color | Lecho por defecto (familia) |
|---|---|---|---|
| `espacio` (defecto) | Inspiración de color | Sí | Según espacio: brazo de butaca, pie de cama, esquina de mesa, toalla del lavabo… (mueble/textil) |
| `antes` | Par antes/después; misma cámara y mismo lecho que el después | No (muro viejo) | Igual que su `espacio` |
| `diagnostico` | Humedad, salitre, grietas | No | Marco de la puerta desde donde se ve (arquitectura) |
| `exterior` | Fachadas | Sí | Follaje en sombra (follaje) — **no** bugambilia: sus flores caen bajo el logo |
| `azotea` | Impermeabilizantes | No | Pretil mojado (arquitectura) |
| `cenital` | Paletas, muestrarios | Sí (carta mayor) | **Excepción**: tela oscura sobre la mesa, sin desenfoque; solo se juzga el contraste |
| `proceso` | Tutoriales, manos | Sí | Escalera junto a quien pinta (herramienta) |
| `taller` | Madera | No | Banco de trabajo (herramienta) |
| `herreria` | Esmaltes | Sí (reja) | Maceta con follaje (follaje) |
| `personas` | Cierres, vida en casa | Sí | Respaldo de butaca (mueble) |
| `nocturna` | Noche, luz cálida | Sí | Sofá en silueta (mueble) |
| `muestra` | Elegir color: prueba en el muro | Sí (hoja grande) | Banco de madera (mueble) |

**El lecho** (idea del operador, adaptada de la firma fotográfica de Efeonce): un primer plano oscuro y
desenfocado, **planeado en el prompt** (bloque `FOREGROUND`), que pertenece a la escena y dice desde dónde se tomó la
foto; ahí va el logo blanco. Nunca se agrega después ni se oscurece en edición: si no pasa, se regenera.

Medición (gratis, apenas sale el plate): `node brands/berel/scripts/medir-lecho.mjs <plate.png> [--focal post=u,v]
[--toma cenital] [--vista <dir>]`; el compositor deja lo mismo en `qa.logoBed` y avisa si falla. Umbrales del
contrato: logo blanco ≥ 4,5:1 contra el 1 % más claro de la caja; nitidez p99 ≤ 25 (calibrado con el piloto: lechos
5–12; esquinas sin lecho 63–630).

Piloto (`ai-generations/2026-11-02_berel-lecho-logo/`, 14 generaciones ≈ USD 1,7): las 13 tomas leen el logo a
10–19:1 (antes, 35 de 38 piezas bajo 4,5:1) y se ven fotográficas. **Pendiente, no producir aún:** el operador
observó que el lecho ocupa demasiado para el tamaño del logo. Medido: mediana 9 % del cuadro (17× el logo, que ocupa
0,5–0,7 %), y en post y Pinterest cruza 46–100 % del ancho. Causa: el prompt pide el 45 % izquierdo y un cuarto del
alto para cubrir tres recortes cuyo logo cae en puntos distintos del plate. Además, 9 de 13 lechos tienen la misma
forma (masa oscura redondeada): la auditoría de Efeonce advierte que se cuenta la forma, no el objeto.

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

## 6 bis. Producto en escena (prueba 2026-11-02, Insignia 4L en la terraza)

Pedido del operador: «Importante que la etiqueta se vea realista y no se alteren los textos, tu tendencia va a ser
irte a la vía determinística, esa vía sirve pero el acabado debe darlo el modelo porque maneja mejor la física, luces».

Lo que se midió (fidelidad = correlación del detalle de la etiqueta contra el render oficial, 1 = idéntico):

| Vía | Resultado | Fidelidad |
|---|---|---|
| Solo colocación determinista | Etiqueta exacta, pero se ve pegada: luz de estudio, sin sombra | 1,00 |
| Edición completa con GPT Image 2.5 Sunburst | Luz cálida, reflejos en la tapa, sombra real; **reescribe los textos pequeños** | 0,16–0,23 |
| Inpainting con máscara | **Inventa otro producto** (lata blanca falsa). Descartado | — |
| **Híbrido** | El modelo pone la física; la etiqueta conserva el arte oficial | **0,98** |

Receta híbrida, ya como script del Workbench (`brands/berel/compose/product.mjs` + `scripts/producto-en-escena.mjs`):

1. **Render oficial** desde `02_Recursos/03_Producto PNG` del OneDrive de Berel, **empaque vigente** (las carpetas
   «Vieja_…» son etiquetas anteriores), admitido en `clients/berel/.resources-local/products/` (nunca en Git).
2. **`colocar`**: lo pone a escala física plausible sobre una superficie real, fuera de las zonas del titular y del
   logo, y comprobando que entra en los recortes que lo usarán (blog con `focal` y bajo, verticales con `focal` x).
   Un 4 L a la distancia de una foto arquitectónica mide unos 120 px en un plate de 1536 px: se puede exagerar un
   poco, no inventar un primer plano imposible. Escribe el compuesto, el prompt y el comando exacto de integración.
   ```bash
   node brands/berel/scripts/producto-en-escena.mjs colocar --foto <plate> --producto clients/berel/.resources-local/products/INSIGNIA_4L.png \
     --x 0.879 --base 0.911 --alto 240 --nombre "Insignia 4L" --superficie "the cantera stone floor" \
     --textos "Berel|Insignia|CONT. NET. 4L" --out projects/berel/<pieza>/salidas/producto/<slug>
   ```
3. **Integración con el modelo** (desde Greenhouse, `pnpm ai:image --image compuesto.png --prompt-file prompt.txt
   --model gpt-image-2.5-sunburst --quality xhigh`): foto completa, sin máscara. El prompt prohíbe tocar la etiqueta
   y cita sus textos.
4. **`restituir`**: alinea la lata del modelo (búsqueda ±24 px), multiplica el render original por la luz de baja
   frecuencia del modelo (σ 5) dentro del alfa del render (la tapa, sin texto, queda del modelo) y usa la foto completa
   del modelo como base (pegar solo la zona de la lata deja costura).
5. **Controles que fallan cerrado** (`qa.json`, código de salida 1): fidelidad de la etiqueta ≥ 0,95, desplazamiento
   del modelo ≤ 8 px (si no, quedaría una lata fantasma) y mínimo de alineación claro (`match` ≥ 0,12). Además, mira
   el píxel al 100 % y comprueba que el muro no derivó (en la prueba: ΔE 1,98 → 2,02).

Trampa de implementación (corregida): en sharp, dos `extractChannel` en el mismo pipeline no se encadenan; el último
reemplaza al primero. El alfa del render se materializa antes de extenderlo, o la «máscara» es el canal rojo.

Pendiente: elegir escenas pensadas para producto (una toma arquitectónica lo deja pequeño).

## 7. Rechazos que no se repiten

| Fecha | Rechazo | Razón | Qué cambió |
|---|---|---|---|
| 2026-11-01/02 | Registro `medio` de la ronda 2 (se regeneraron fachada, infantil, baño y comedor) | Se veía de estrato bajo: fachada de fraccionamiento, aluminio blanco | `medio` recalibrado a medio-alto accesible; «nunca fraccionamiento» en el bloque común; plates regenerados (`ronda-2/v2/`) |
| 2026-11-02 | Terraza `alto` con viga de concreto aparente | «Esto es un frizo mal terminado? si es así no se puede aprobar para Berel por el estrato»: la viga terminaba irregular contra el muro pintado y en los recortes verticales la píldora caía encima | Regla de remates en el bloque común; «concreto aparente solo como elemento terminado» en `alto`; plate regenerado con plafón liso y sombra de remate (`ronda-2/v3/`); caso en `lessons` del contrato |
| 2026-11-01/02 (antes de la grilla) | Marcadores sobre la lámpara (estudio) y sobre objetos | «Necesitamos reglas para que esto no se ponga sobre objetos así porque pierde limpieza y no se lee bien el texto» | Lo resuelve la grilla, pero empieza en el plate: tercio superior del muro libre y objetos a la derecha. Ver [marker-grid.md](marker-grid.md) |

Detalle fechado de cada caso, con su cita completa: [lessons.md](lessons.md).

## 8. Pendiente (no verificado con Berel)

- Registro fotográfico definitivo: hora dorada actual vs. luz de día del lenguaje histórico (libro §9.2).
- Los registros son **candidatos**: los aprueban Daniela, Andrés o Melkin, y luego Berel. Berel sigue `gated`
  en `clients/brands.json` (TASK-1945); ningún plate sale al cliente sin esa revisión.
