# SKY BLACK: pipeline de producción local, script por script

Estado al 2026-11-05. Este documento es el **cómo**: qué script produce cada pieza de la campaña BLACK
(kit «Despliegue Base»), qué lee, qué escribe, con qué parámetros y en qué orden. El **qué** (taxonomía,
tamaños, nombres y fichas de cada formato) está en [sky-format-catalog.md](sky-format-catalog.md). El
resumen operativo, las decisiones del operador y las lecciones de Claude Design están en
[sky-design-canvas.md](sky-design-canvas.md); los casos de error, en [lessons.md](lessons.md). Si este
documento y el código difieren, **manda el código**: los valores de abajo se copiaron de los scripts.

Frontera (igual que en [sky-design-canvas.md](sky-design-canvas.md)): son bocetos y adaptaciones para
revisión, no corridas de Creative Workbench ni piezas aprobadas por el cliente. El kit en OneDrive se lee
en solo lectura; toda corrección vive en copias locales (`src2/`) o en memoria. La única escritura en
OneDrive es la carpeta de entrega nueva (§14).

## 0. Convenciones, dependencias y patrón de render

| Alias | Ruta en la sesión original (2026-11-04) |
| --- | --- |
| `S` | `/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad` |
| `K` | `$S/kvhm-canvas` (directorio de trabajo de todos los scripts) |
| `P` | `$S/canvas/project` (copia local del proyecto del canvas de Claude Design) |
| `SRC` | `~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base/` |
| `OUT` | `/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif` (no versionado) |
| `S2` | `$K/src2/` (copia corregida de las fuentes; ver §3) |

**Dependencias:**

- Node (v24.17.0 al medir) y los paquetes del checkout de Greenhouse, cargados por **ruta absoluta**:
  `require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright')` (Chromium headless) y
  `.../node_modules/sharp`. No hay `package.json` propio.
- ffmpeg 8.1.1 con `libx264`, `aac`, `palettegen`/`paletteuse`, `xfade`, `amix` y `alimiter`; ffprobe para
  medir.
- Fuentes: `$K/Metric-{Regular,Medium,Semibold,Bold,Black}.otf` (copiadas de
  `SKY Campañas/00_Assets/00_Brand-Assets/2. Tipografias/Metric_family/`) y
  `$K/hph/SourceSans3-Regular.otf` (descargada con autorización del operador del repo oficial de Adobe,
  licencia OFL; sólo la usan los HPH y su botón).

**Registro de fuentes.** Los SVG de Illustrator piden `font-family="Metric-Black, Metric"` con
`font-weight` numérico, así que cada peso se registra dos veces: como familia `Metric-<Peso>` y como
`Metric` con su peso (Regular 400, Medium 500, Semibold 600, Bold 700, **Black 800**). Todos los scripts
arman la misma cadena `@font-face` (`W8`/`W` en el código) apuntando a `file://$K/Metric-*.otf`.

**Patrón de render (todos los scripts Playwright):**

1. Quitar el prólogo `<?xml …?>` del SVG y forzar `width`/`height` en px al tamaño del viewBox.
2. Escribir un HTML temporal en disco (`tmp.html`, `_lf.html`, `_bd.html`, `_v.html`, `_ru.html`,
   `_cr.html`, `_banner.html`, `hph/tmp-m.html`…) y abrirlo con `page.goto('file://…')`. `setContent`
   **no** carga imágenes `file://`; por eso siempre se escribe a disco.
3. `await page.evaluate(() => document.fonts.ready)` y una espera de 150–300 ms.
4. `page.screenshot()`; con `omitBackground: true` cuando la capa debe quedar transparente.

Cada script tiene **un temporal propio**: dos scripts distintos no chocan, pero **dos ejecuciones del
mismo script en paralelo sí** (ver §16). Ante la duda, ejecutar en secuencia.

## 1. Mapa del pipeline

```text
OneDrive (kit, sólo lectura)
   │
   ├─ logofix.cjs ──────────► src2/  (KV X HM/*.svg, LOGO BLACK, FORMATO HPH, PMAX, TIKTOK, DAT)
   │                            │
   │      banderas.cjs ─────────┤  + HM_*_KV_BANDERAS.svg
   │      variantes.cjs ────────┤  + SANTIAGO / LIMA / PERU / ENCUENTRA / DOM_REGIONES
   │      rutas.cjs ────────────┘  + HM_PE_RUTA_<CIUDAD>.svg (13)
   │                            │
   │      render.cjs (+patches) ─► png/<KV>.png                   KV fijo 1080×1350
   │      parts.cjs (+patches) ──► parts/<KV>__<capa>.png (+ bbox.json, ad hoc)
   │      layers.cjs (+patches) ─► layers/<KV>__<capa>.png
   │      recrop.cjs ────────────► anim/<KV>__*.png|jpg + anim/manifest.json
   │                            │
   │      compose.cjs ───────────► formatos/<KV>__popup.png, __story.png
   │      anim-css-gen.cjs ──────► anim-css-<KV>.html
   │      render-gif.sh ─────────► frames.cjs ► fr-<kv>/ ► ffmpeg ► OUT/<KV>.gif|.mp4|_audio.mp4
   │      story-video.cjs ───────► OUT/story-video/<KV>__story-video.mp4
   │      banners.cjs ───────────► banners/<KV>__pmax-1200x628.png (+@2x)
   │      hph/generic.cjs ───────► hph/out/HPH_<fmt>_GENERICO.png (+@2x)
   │      hph/market.cjs ────────► hph/out-mercados/<KV>__hph-<fmt>.png (+_2x)
   │      chile-refs.cjs ────────► chile/CL_*.png (+_2x)
   │                            │
   │      sync-canvas.cjs ───────► P/{kv,formatos,banners,chile}/*.jpg|png
   │      *-page.cjs, new-pages ─► P/*.dc.html + P/canvas.json + *-files.json
   │      Artifact publish ──────► canvas QTy12G38oQYB1xrnZmkpee (assets de video: /_blob/<id>)
   │
   └─ entrega: copia OUT/* ──► Despliegue Base/ENTREGABLES BLACK (Efeonce 2026-11-05)/
```

| # | Paso | Lee | Escribe | Invocación |
| --- | --- | --- | --- | --- |
| 1 | `logofix.cjs` | `SRC` (KV, logos, HPH, PMAX, TikTok, DAT) | `src2/<misma ruta relativa>` | `node logofix.cjs [rutas relativas…]` (sin args: todo) |
| 2 | `banderas.cjs` | `src2/KV X HM/HM_{AR,PE_INTER,BR,US,UY}_KV.svg`, `SRC/GRAFICOS/BANDERAS/` | `src2/KV X HM/HM_*_BANDERAS.svg`, `flags-circ/<k>.png` | `node banderas.cjs` |
| 3 | `variantes.cjs` | `src2/KV X HM/` (incluye salidas de 2), `SRC/ALIANZAS/` | 7 SVG de variantes en `src2/KV X HM/` | `node variantes.cjs` |
| 4 | `rutas.cjs` | `src2/KV X HM/HM_PE_KV_DOM-RUTA.svg`, PNG PromPerú | `src2/KV X HM/HM_PE_RUTA_*.svg` (13) | `node rutas.cjs` |
| 5 | `render.cjs` | `src2/KV X HM/*.svg`, `patches.cjs` | `png/<KV>.png` | `node render.cjs [archivo.svg…]` |
| 6 | `parts.cjs` | idem | `parts/<KV>__<capa>.png`, `parts/report.json` | `node parts.cjs [archivo.svg…]` |
| 7 | `layers.cjs` | idem | `layers/<KV>__<capa>.png`, `layers/report.json` | `node layers.cjs [archivo.svg…]` |
| 8 | `recrop.cjs` | `layers/` | `anim/` + `anim/manifest.json` | `node recrop.cjs HM_AR_KV [HM_…]` (nombres, no rutas) |
| 9 | `compose.cjs` | `parts/`, `foto-fuente.png` | `formatos/<KV>__popup.png`, `__story.png` | `node compose.cjs [HM_…]` (sin args: todos) |
| 10 | `anim-css-gen.cjs` | `anim/manifest.json` | `anim-css-<KV>.html` | `node anim-css-gen.cjs HM_AR_KV [HM_…]` |
| 11 | `render-gif.sh` | `anim-css-<KV>.html`, audio | `OUT/<KV>.mp4`, `_audio.mp4`, `.gif` | `./render-gif.sh [HM_…]` (sin args: todas) |
| 12 | `story-video.cjs` | `parts/`, `formatos/`, `SRC/FORMATO STORY/`, `SRC/GRAFICOS/` | `OUT/story-video/` | `node story-video.cjs [HM_…]` |
| 13 | `banners.cjs` | `parts/`, `parts/bbox.json`, `foto-fuente.png` | `banners/` | `node banners.cjs pmax-1200x628` (filtro por subcadena) |
| 14 | `hph/generic.cjs` | `src2/FORMATO HPH/` | `hph/out/` | `node hph/generic.cjs` |
| 15 | `hph/market.cjs` | `src2/FORMATO HPH/`, `parts/`, `parts/bbox.json`, `flags-circ/` | `hph/out-mercados/` | `node hph/market.cjs` |
| 16 | `chile-refs.cjs` | `src2/` (TikTok, DAT, PMAX) | `chile/` | `node chile-refs.cjs` |
| 17 | `sync-canvas.cjs` | `png/`, `formatos/`, `banners/`, `hph/out*`, `chile/` | `P/{kv,formatos,banners,chile}/` | `node sync-canvas.cjs` |
| 18 | páginas | `P/canvas.json`, `vid-blobs.json`, `anim/manifest.json` | `P/*.dc.html`, `P/canvas.json`, `*-files.json` | `node <script>.cjs $P` |

El orden importa: `variantes` necesita `HM_PE_KV_INTER_BANDERAS.svg` (sale de `banderas`) y
`HM_CL_KV_INTER_CLUSTER.svg` corregido (sale de `logofix`); `compose` y `story-video` necesitan `parts/`;
`story-video` además necesita `formatos/<KV>__story.png`; `banners` y `hph/market` necesitan
`parts/bbox.json`. Un cambio en la fuente se propaga **en cascada desde el paso 1**, nunca pieza por pieza.

## 2. Fuentes del kit que leen los scripts

Todas relativas a `SRC`. Volver a listar la carpeta antes de trabajar: el kit crece durante la campaña.

| Fuente | Script que la lee | Nota |
| --- | --- | --- |
| `KV X HM/*.svg` | `logofix` | 12 KV 1080×1350, incluidos los dos clústeres |
| `KV X HM/LOGO BLACK/SKY_LOGO_BLACK_ESP.svg`, `SKY-13.svg` (es el BR), `SKY_LOGO_BLACK_USA.svg` | `logofix` | Logos por idioma; se corrigen y se reusan para las fuentes raster |
| `FORMATO HPH/`, `FORMATO PMAX PRECIO+DCTO/`, `FORMATOS BANNER TIKTOK/`, `FORMATO DAT/` | `logofix` | Referencias editables exportadas por capas (logo raster) |
| `GRAFICOS/BANDERAS/BANDERA * (CIRCULO).svg` | `banderas` | `BANDERA CL (CIRCULO)_1.svg` **es Argentina**; `BANDERA PUJ` es República Dominicana |
| `ALIANZAS/SERNATURE/CHILE TRAVEL (FUERA DE CHILE).svg` | `variantes` | Logo de alianza BR Santiago |
| `ALIANZAS/PROMPERU/OTROS HM FUERA DE PERU/LOGO_PROMPE_OTROS-HM_BLANCO.svg` | `variantes` | Logo de alianza BR Perú |
| `ALIANZAS/PROMPERU/PROMPERU (SOLO HM PERU)@72x.png` | `rutas` | PNG 1928×724; no hay SVG de esta versión |
| `FORMATO GIF/AUDIO PARA GIF/AUDIO FINAL PARA LOS GIF.mp3` | `render-gif.sh` (vía copia) | Copiado byte a byte a `P/ref/audio-gif.mp3` |
| `FORMATO GIF/REFERENCIA ANIMACION/REF_KV{1-1,1-2,2_1,2_2,3_1,3_2}.mp4` | medición manual | Plantilla de movimiento (§8) |
| `FORMATO STORY/AUDIO PARA VIDEO/SONIC BRAND-3-STORY_1.mp3` | `story-video` | Música de los slides 1–4 |
| `FORMATO STORY/VIDEO PARA STORY/STORY AVION.mp4` | `story-video` | Fondo del slide 4 |
| `FORMATO STORY/TAPAS DE CIERRE/{ESPAÑOL,BRASIL,INGLES}/*.mov` | `story-video` | ES sólo trae `13oct_cierreSKY_horizontal.mov` (1920×1080) |
| `GRAFICOS/COMPLETA TU VIAJE GRAFICO/Completa-tu-viaje_{ESP,AR,BR,USA}.svg` | `story-video` | Gráfico del slide 4 |

`$K/foto-fuente.png` (1672×941, RGBA) es la foto embebida en los KV estándar, extraída una vez a disco.
En el KV está **espejada** a escala 1,81; todos los scripts que reencuadran la usan con `flop()` (sharp) o
`transform:scaleX(-1)` (HTML).

## 3. Logo BLACK corregido: `logofix.cjs`

Pedido de SKY vía Adriana (2026-11-04): fecha nueva, más grande; marco que se retrae lo justo; menos
resplandor. Salida en `src2/` con la **misma ruta relativa** que en OneDrive; desde entonces todos los
scripts leen `src2/`.

Constantes: `FECHA.es = 'DEL 25 DE NOVIEMBRE AL 2 DE DICIEMBRE'`, `FECHA.pt = 'DE 25 DE NOVEMBRO A 2 DE
DEZEMBRO'`, `FECHA.en = 'FROM NOVEMBER 25 TO DECEMBER 2'`; `GLOW = { blur: 0.5, opacity: 0.6 }`.

**Orden de ejecución dentro del script:** primero corrige los 3 logos de `LOGO BLACK/` (y mide su caja
alfa *antes* de corregir, para usarla de referencia de escala), luego recorre los archivos: todos los SVG
de `KV X HM/` y de las 4 carpetas de formatos, o las rutas relativas pasadas como argumento.

### 3.1 Camino vectorial (`patchVector`, corre dentro de la página)

1. **Marco:** el `<path>` cuyo `d` casa con
   `^M[\d.]+,[\d.]+[hH]-?[\d.]+c-10\.21,0-18\.49-8\.28-18\.49-18\.49v-[\d.]+c0-10\.21` (rectángulo de
   esquinas de radio 18,49). Si no hay, el archivo no es vectorial (`{ vector: false }`). Se toma su
   `getBBox()` → `L, T, R, B`; `r = 18.49`.
2. **Fecha:** el `<text>` cuyo texto sin espacios contiene `NOV` **y** cuya `y` del `transform`
   `translate(x y)` es mayor que `T + 0,6 × alto del marco`. Se lee la `y` del `translate`, no de
   `getBBox` (ver §16).
3. **Idioma** (vectorial): por el texto de esa fecha: `NOVEMBRO` → pt, `NOVEMBER` → en, si no es.
4. Se vacía el `<text>`, se escribe la fecha nueva, `text-anchor="middle"`, sin `letter-spacing`, centrada
   en `cx = (L+R)/2`.
5. **Tamaño:** ancho máximo `maxW = (R − r − 8) − (L + r + 8) − 2 × 10` (deja ≥ 8 px de tramo recto en
   cada esquina y 10 px de aire a cada lado del texto). Se mide el ancho a 30 px y
   `size = min(32, 30 × maxW / w30)`. Resultado: **ES 25,5 · PT 27 · EN 28,9 px** (la fecha vieja era 29 px
   pero más corta).
6. **Línea base:** `y = B + capH/2` con `capH = 0,7 × size`: la línea del marco pasa por la mitad de las
   mayúsculas.
7. **Marco regenerado:** hueco `gL = cx − tw/2 − 10`, `gR = cx + tw/2 + 10`; nuevo `d` que arranca en `gL`
   sobre el borde inferior, recorre izquierda → arriba → derecha con arcos `A18.49` y termina en `gR`.
8. **Brillo de la esquina inferior derecha:** el `<path>` que casa con
   `^M([\d.]+),[\d.]+v[\d.]+c0,10\.21-8\.28,18\.49-18\.49,18\.49h-([\d.]+)$` y arranca en `R` (±1 px): si su
   extremo invade el hueco, el `h-…` final se reemplaza por `H<gR>`.
9. **Resplandor:** en cada `filter[id^="outer-glow"]`, `stdDeviation × 0,5` (`feGaussianBlur`) y
   `flood-opacity × 0,6` (`feFlood`).
10. Se serializa con `XMLSerializer`, quitando `width`/`height`, y se antepone el prólogo XML.

### 3.2 Camino raster por capas (clústeres, HPH, PMAX, TikTok, DAT)

Esos SVG vienen exportados de Illustrator con cada capa como `<image id="…_Imagen…">` PNG en base64 del
tamaño del lienzo; el logo es una de esas imágenes.

1. **Detectar la capa del logo** recorriendo las `<image>` con id `*_Imagen*` y midiendo su PNG con
   `alphaBox` (umbral alfa > 40; cuenta como «verde BLACK» el píxel con G > 170, R < 120, B < 120). Se
   descarta la capa si: está vacía; su PNG mide menos del 90 % del ancho del viewBox (no es capa de lienzo
   completo); su caja visible empieza por debajo del 45 % del alto; tiene menos de 200 píxeles verdes; o
   su caja visible ocupa más del 80 % del ancho (fondo o foto). Gana la de **más píxeles verdes**. Sin
   ganadora: se copia el archivo sin cambios y se imprime `SIN LOGO DETECTADO`.
2. **Idioma:** sólo por el texto de los `<tspan>` del archivo: `NOVEMBRO|VOE|IDA E VOLTA|Ver voos` → pt;
   `FLY|ROUND TRIP|See flights` → en; si no, es. **Nunca** sobre el SVG crudo (§16).
3. **Ocultar la capa vieja:** se inserta `display="none"` en su `<image id="…">` (la imagen está en línea
   dentro de un grupo con máscara; no hay `<use>` que borrar).
4. **Montar el logo corregido** del idioma como `<svg>` anidado al final del documento, con todos los ids
   prefijados `lf-` (y sus `url(#…)` y `href="#…"`) para no chocar. Escala
   `k = ancho caja capa vieja / ancho caja del logo original`; posición
   `ox = x0capa − x0logo × k`, `oy = y0capa − y0logo × k`; `overflow="visible"`.

Comprobar en la salida de consola de cada archivo: `vector` con `lang`, `size` y `gap`, o `raster` con el
id de la capa, su caja y `k`.

## 4. KV nuevos en `src2/`

### 4.1 `banderas.cjs`: KV «Vuela internacional» con banderas por mercado

Base = KV del mercado ya corregido. Primero renderiza las 7 banderas circulares a PNG transparente de
160×160 (`preserveAspectRatio="xMidYMid slice"`) en `flags-circ/<k>.png`; claves `AR` (archivo
`BANDERA CL (CIRCULO)_1.svg`), `BR`, `CL`, `PE`, `US`, `UY`, `PUJ`.

Bandera = círculo blanco de radio 33,5 + imagen inscrita 1,5 px adentro con `clip-path="circle(50%)"` +
borde blanco de 2 px a radio 33. Lista bajo el logo, estilo del clúster internacional de Chile:

| Parámetro | Valor |
| --- | --- |
| Primera fila | `cy = 378` |
| Paso | 98 px con ≤ 4 filas; 92 px con 5 |
| Centro de la bandera | `cx = 103` |
| Texto | `x = 166.5`, Metric Medium 33, `#fefefe` |
| Una línea | `y = cy + 11` |
| Dos líneas | primera en `y = cy − 3`, segunda con `dy = 31.35` |

Listas exactas por KV: tabla de [sky-design-canvas.md](sky-design-canvas.md), «Segunda ronda», punto 2.
**Uruguay** (`fila`): se ocultan (`display="none"`) las hojas dentro de la caja del texto que contiene
`ORIGEN` ampliada −90/−30/+40/+30 px (izquierda/arriba/derecha/abajo), y en su lugar va una fila de 4
banderas (PUJ, CL, BR, US) de radio 26 en `cx = 92 + i × 66`, centrada en la altura de ese texto.

### 4.2 `variantes.cjs`: mensajes de la grilla por mercado

Reemplaza textos por **coincidencia exacta** de `textContent.trim()` (primer `<tspan>` recibe el texto
nuevo; los demás se borran) y suma elementos en un `<g id="variante">`:

| Variante | Base | Cambios de texto | Extra |
| --- | --- | --- | --- |
| `HM_AR_KV_SANTIAGO` / `_LIMA` | `HM_AR_KV` | VOLÁ → VOLÁ A; Internacional → Santiago / Lima | — |
| `HM_BR_KV_SANTIAGO` | `HM_BR_KV` | Internacional → Santiago | Chile Travel, alto 150 |
| `HM_BR_KV_PERU` | `HM_BR_KV` | VOE A → VOE PARA; Internacional → Peru | PromPerú «otros HM», alto 104 |
| `HM_CL_KV_ENCUENTRA` | `HM_CL_KV_INTER_CLUSTER` | VUELA → ENCUENTRA; Internacional → Destinos | — |
| `HM_PE_KV_ENCUENTRA` | `HM_PE_KV_INTER_BANDERAS` | VUELA A → ENCUENTRA; Calama → Destinos | — |
| `HM_PE_KV_DOM_REGIONES` | `HM_PE_KV_DOM` | VUELA A → VUELA POR; Calama → Perú | 2 columnas de regiones |

- **Alianza:** el SVG de la alianza se incrusta como `data:image/svg+xml;base64`, arriba a la derecha:
  `x = 1080 − 48 − ancho`, `y = 52`, ancho proporcional al alto indicado.
- **Regiones de Perú:** NORTE (Tumbes, Piura, Chiclayo, Trujillo, Cajamarca, Tarapoto, Iquitos) y
  CENTRO Y SUR (Pucallpa, Jauja, Cusco, Arequipa, Juliaca, Tacna); columna `x = 84 + c × 236`,
  encabezado en `y = 372` (Metric Bold 22, `letter-spacing` 1) con regla verde `#26de00` de 2 px (82 px
  de ancho en la primera columna, 150 en la segunda); filas en `y = 424 + i × 50` con pin (círculo
  `#26de00` r 7 + punto `#1f3550` r 2,6) y texto Metric Semibold 28. Sin fotos: no hay fotos de Perú.
- La consola imprime `texto → nuevo` o `texto: NO` si no encontró el texto; revisar que no haya `NO`.

### 4.3 `rutas.cjs`: rutas foco de Perú

13 rutas (Pucallpa venía repetida: una sola) desde `HM_PE_KV_DOM-RUTA`. Nombre de salida
`HM_PE_RUTA_<CIUDAD>` en mayúsculas y sin tildes.

1. El texto `Calama` se reemplaza por la ciudad. Si su `getBBox().width` pasa de **430 px**, el
   `font-size` (base 90) se escala a `90 × 430 / ancho`. El script sólo carga Metric Bold para medir.
2. PromPerú «solo HM Perú» (PNG 1928×724) a alto 68 en `x = 1080 − 48 − ancho`, `y = 56`.
3. Debajo, `[Ubicación de la foto]` (placeholder; no hay fotos por destino): Metric Bold 18, blanco,
   alineado a la derecha en `x = 1032`, `y = 158`, `letter-spacing .5`, trazo `rgba(0,0,0,.25)` de 3 px con
   `paint-order:stroke`, y un pin vectorial verde a su izquierda (no emoji).

Las rutas sólo producen KV, popup y story (no tienen animación ni story en video).

### 4.4 Tercera ronda (2026-11-05): fotos de destino, CSV de rutas y orden en «BLACK SKY 2026»

Pedido de Daniela por Teams: fotos aprobadas por ruta, legal, ubicación y crédito desde el CSV
`BANCO DE IMAGENES/DESTINOS/02_PERU/FOTOS PARA PROMPERU/RUTAS FOTO PROMPE INFO/Lote Plantilla Rutas
Prompe(Hoja1) (2).csv` (copia en `K/rutas-prompe.csv`; columnas `DESTINO NOMBRE;LEGAL PRECIO;Ubicacion;Credito`).

- **`rutas.cjs`** ahora lee el CSV: 15 rutas (se sumaron Ayacucho y Talara; la fila «Vuela por el Perú» va
  a `HM_PE_KV_DOM_REGIONES`). Por ruta: oculta el legal del kit (está trazado) dentro de la caja
  `[530,1122,965,1198]` y escribe el del CSV en Metric Regular 26 (dos líneas si supera 405 px), cambia
  «DESDE [ORIGEN]» por «DESDE LIMA» recentrado y escribe la ubicación del CSV bajo PromPerú. Sin foto
  aprobada (Chiclayo y Talara al 2026-11-05) la ubicación queda en `[Ubicación de la foto]`. El grupo
  `<g id="ruta" data-capa="alianza">` fuerza esa capa en `parts`/`layers` (ver abajo). Exporta `PAGE`
  (`legal`, `origen`, `alianza`) para reusarlo.
- **`fotos-destino.json`** asigna foto por pieza: `src` (copia en `K/fotos-destino/`), `s` = punto del sujeto
  (0-1), `cred` (crédito), `promperu` y `sombra`. Cubre las 13 rutas con foto, «Vuela por el Perú» (foto de
  Cajamarca) y AR «Volá a Santiago» (`01_CHILE/SCL/santiago-679695892-original 1.png`) y «Volá a Lima»
  (`02_PERU/LIM/Imagen de Codex 30 sept 2026, 11_48_10 a.m..png`).
- **`destinos.cjs`** (correr después de `variantes` y `rutas`): en el SVG de `src2/` reemplaza la foto del kit
  por `<image id="lf-foto-destino">` 1080×1350 (recorte que deja el sujeto en x≈0,62, y≈0,45), agrega
  `lf-cielo` (velo superior #0b1a2e 0,38), `lf-piso` (degradado inferior #2a1608 0,8 desde y=760) y, si
  corresponde, `lf-sombra` lateral y el crédito vertical en el borde derecho (Metric 13, blanco al 80 %,
  centrado en y=560). **La foto del kit es un `<use href="#image">` y en las variantes aparece varias veces
  en grupos recortados**: se reemplaza la copia cuyo recorte cubre más lienzo y se ocultan las demás que lo
  tocan. Reemplazar «la primera» dejó el KV en blanco en AR y «Vuela por el Perú». Para «Vuela por el
  Perú» también aplica legal, origen, PromPerú y ubicación con `PAGE`. Exporta `cubrir()` y `credito()`.
- **`compose.cjs`** usa `cubrir(n, W, H, t)` en vez de `foto-fuente.png` para esas piezas (popup t=[0,62;0,40],
  story t=[0,60;0,42]) y agrega velo superior, un piso más alto (popup desde 560, story 1000–1720), el
  crédito (popup y=430, story y=900) y un halo radial oscuro detrás de PromPerú y la ubicación (nubes).
- **`parts.cjs` / `layers.cjs`**: lista de rutas desde el CSV; región `ALIANZA_UBIC = [560,0,1080,330]` y capa
  forzada por `data-capa` (la ubicación larga y su pin caían en la caja del logo y en la story quedaban
  separados del texto).
- **`organizar.cjs <OUT> <BLACK SKY 2026>`**: copia (sin borrar) a
  `SKY Campañas/2026/10_Noviembre/BLACK SKY 2026/` con la estructura y la nomenclatura de Daniela
  (detalle en [sky-format-catalog.md](sky-format-catalog.md) §5.4). Falla si falta una fuente o si dos
  destinos coinciden; deja `organizar-plan.json` con las 177 rutas.

Orden de esta ronda: `variantes` → `rutas` → `destinos` → `render` → `parts` → `compose` → (`layers` →
`recrop` → `anim-css-gen` → `render-gif.sh` → `story-video` para las que tienen GIF) → `sync-canvas` →
`new-pages` (rutas desde el CSV) → subir los videos nuevos como asset y actualizar `vid-blobs.json` →
publicar → copiar a `OUT` → `organizar.cjs`.

## 5. KV fijo: `render.cjs` + `patches.cjs`

Recorre `src2/KV X HM/*.svg` (o los archivos pasados) y escribe `png/<KV>.png` a 1080×1350. Antes del
render aplica en memoria:

- **Junta de la flecha morada:** reemplazo literal
  `<rect x="537.61" y="879.81" width="381.35" height="339.95" fill="#671e75"/>` →
  `x="536.61" … width="383.35"` (1 px más por lado). Está escrito dentro de `render.cjs`, `parts.cjs` y
  `layers.cjs`, no en `patches.cjs`.
- **`patches.cjs`:** pares `[buscar, reemplazar]` por archivo. Si un `buscar` no está, el script **lanza
  error** (`<archivo> sin <texto>`): un parche que deja de aplicar no pasa en silencio.
  `HM_CL_KV_INTER_CLUSTER.svg` (y `HM_CL_KV_ENCUENTRA.svg`, que lo reutiliza): precio y nota a la base de
  `HM_CL_KV_INTER` (`translate(556.35 977.69)` → `981.83`, `translate(541.22 1148.01)` → `1152.09`,
  `tspan 000.000` a `x=32.2 y=17.58`) y oscurecido estirado con
  `<g mask="url(#mask)" transform="matrix(1 0 0 1.005952 0 -8.036)">`.

La consola imprime `ok` o `NO CARGADAS: <familias>`: una fuente que no carga se nota aquí, no a ojo.
Salida: 37 PNG (24 KV de mensaje + 13 rutas).

## 6. Descomposición en capas

### 6.1 `parts.cjs` (para componer formatos)

Mismo render que §5, con fondo transparente. Clasifica cada hoja visible (`path, rect, text, image, use,
polygon, circle, ellipse, line, polyline` fuera de `defs/clipPath/mask/symbol/pattern`; los `<tspan>` van
con su `<text>`) en la **primera** región, en orden, cuya caja la contiene completa. Lo que no cabe en
ninguna queda en `base` (la foto).

| Región | Caja `[x0, y0, x1, y1]` | Dónde |
| --- | --- | --- |
| `badge` | `[785, 755, 1020, 995]` | todas |
| `precio` | `[400, 870, 1055, 1230]` | todas |
| `lista` | `[40, 290, 560, 870]` | `HM_CL_KV_DOM_CLUSTER` |
| `lista` | `[40, 340, 560, 1080]` | `HM_CL_KV_INTER_CLUSTER`, `HM_CL_KV_ENCUENTRA` (sin `destino`) |
| `lista` | `[40, 320, 720, 890]` | `*_BANDERAS`, `HM_PE_KV_ENCUENTRA`, `HM_PE_KV_DOM_REGIONES` |
| `destino` | `[40, 920, 530, 1180]` | todas salvo clúster internacional |
| `logo` | `[40, 0, 720, 330]` | todas |
| `alianza` | `[740, 0, 1080, 330]` | `HM_BR_KV_SANTIAGO`, `HM_BR_KV_PERU`, 13 rutas |
| `pie` | `[20, 1232, 1070, 1350]` | todas |

- **Imágenes grandes** (`image`/`use` de más de 700 px): `getBoundingClientRect` devuelve la caja
  completa aunque estén recortadas por clip o máscara. Se miden aislándolas (todo lo demás
  `visibility:hidden`), capturando con fondo transparente y tomando la caja con alfa > 8.
- En `parts.cjs` una hoja con ancho **o** alto > 0 entra a una región: así la línea divisoria del pie
  (ancho 0) viaja con el pie.
- Salida por KV: `parts/<KV>__<capa>.png` a 1080×1350 (la `base` opaca, el resto transparente) y el
  conteo/caja por capa en `parts/report.json`.
- **Comprobación:** base + partes = KV dentro del ruido. **No basta**: un elemento más ancho que su región
  se queda en la base sin alterar esa suma. Comparar la base contra la foto fuente recolocada (§16).

**`parts/bbox.json`** (61 entradas, `"<KV>__<capa>": [x, y, ancho, alto]` de la caja alfa visible de cada
parte) lo leen `banners.cjs` y `hph/market.cjs`. Se generó con un comando `node -e` en línea, **no hay
script guardado**: para regenerarlo, medir la caja alfa (> 0) de cada `parts/*.png` con sharp.

### 6.2 `layers.cjs` + `recrop.cjs` (para animar)

`layers.cjs` es la misma clasificación, pero sólo con las capas **animables** (`badge`, `precio`,
`destino` y `lista` según el KV); logo, pie y alianza quedan en `base`. Exige ancho **y** alto > 0. Salida
en `layers/`.

`recrop.cjs <KV…>` (recibe **nombres**, no rutas: `node recrop.cjs "KV X HM/…"` crea entradas basura;
el `manifest.json` actual tiene dos así, `KV` y `X`, inofensivas):

- `base` → `anim/<KV>__base.jpg` (JPEG q90, croma 4:4:4).
- Cada capa → recorte a su caja alfa (> 0) más 4 px de margen, PNG nivel 9, y su posición en
  `anim/manifest.json` (`{ file, x, y, w, h }`). Ejemplo `HM_AR_KV.badge`: `x 800, y 767, w 210, h 212`.

## 7. Popup y story: `compose.cjs`

Recompone desde `parts/` y la foto fuente (no estira el KV). Helpers:

- `place(parte, s, ax, ay, bx, by)`: recorta la parte a su caja alfa, la escala por `s` (lanczos3) y la
  ubica de modo que el punto `(ax, ay)` del lienzo del KV caiga en `(bx, by)`.
- `foto(s, X0, Y0, W, H)`: fuente espejada a escala `s`; `X0` es la posición del borde derecho espejado y
  `Y0` la de la fila 0.
- `sombra(W, H)` (sólo clústeres: nombre con `CLUSTER` o `HM_CL_KV_ENCUENTRA`): degradado horizontal negro
  0,42 → 0,2 al 45 % → 0 al 75 %.
- `piso(W, H, y0, y1, a)`: degradado vertical `#2a1608` de 0 a `a` entre `y0` y `y1`.

**Popup 1080×1080:** `foto(1.45, 1782, −154 × 1.45)` (mujer al 80 % del KV, cabeza en y≈260);
`piso(800 → 1080, 0,78)`.

| Elemento | Escala | Ancla KV → popup |
| --- | --- | --- |
| Logo, alianza | 1 | `(0,0) → (0,0)` |
| Destino | 0,88 | `(62, 1220) → (62, 938)` |
| Precio y badge | 0,88 | `(1044, 1220) → (1044, 938)` |
| Pie | 1 | `(0, 1240) → (0, 972)` |
| Lista genérica (banderas/regiones) | `min(1, 328 / alto)` | centrada entre y 336 y 664 |
| Lista clúster internacional | 0,84 | `(67, 366) → (67, 338)` |
| Lista clúster nacional | 0,9 | 3 columnas desde `X 70, Y 282`, paso 202 |

Clúster nacional, recortes de la lista `[x, y, ancho, alto]` → columna: `[80, 300, 200, 388]` → 0 (Norte);
`[282, 300, 210, 388]` → 1 (Sur, Concepción…Castro); `[282, 693, 210, 168]` → 2 con 62 px de desfase
vertical (Balmaceda, Puerto Natales, Punta Arenas, alineados con la primera fila).

**Story 1080×1920:** `foto(2.04, 2198, 0)` (cubre 1920 sin inventar cielo); zonas seguras ~270 px.

| Elemento | Regla |
| --- | --- |
| Lista, precio, destino, badge, pie | escala 1, **+350 px** (`DB`) |
| Logo | 1,3, esquina superior izquierda de su caja en `(x del KV, 270)` |
| Alianza | 1,1, esquina superior **derecha** de su caja en `(1032, 500)`: bajo el avión |
| Degradado | `piso(1360 → 1660, 0,82)` |
| Clúster nacional | `DB = 430`; `piso(1440 → 1740, 0,82)`; lista 1,15 ancla `(84, 309)` centrada entre el fin del logo (`270 + alto × 1,3`) y el inicio del destino (`935 + 430`) |

Salida en `formatos/`: 74 PNG (37 × 2).

## 8. GIF y MP4: animación, captura y codificación

### 8.1 Movimiento medido en las referencias

Las 6 referencias del kit (1080×1350, 60 fps, ~3,97 s) comparten patrón. KV1 y KV3 cambian
sólo contenido; KV2 mueve además una tarjeta. El audio de REF_KV3_2 está ~8 dB más bajo (−18,9 LUFS).
Ninguna pieza tiene salida: todo queda fijo desde ~1,4 s y el bucle corta en seco.

### 8.2 `anim-css-gen.cjs`: la animación como CSS

Duración `T = 3.968` s, `animation: 3.968s linear infinite both`. Cada capa animable es un `<div class="ly
<capa>">` en `left/top/width/height` del manifiesto con un `<img>` dentro: el **div** lleva la opacidad y
la **imagen** el movimiento (`transform-origin: 50% 50%`, así el badge escala desde su centro). Cada
keyframe mantiene el valor inicial hasta `t0`, interpola hasta `t1` con la curva indicada y queda fijo:

```css
@keyframes mv-precio{0%,2.520%{transform:translateX(-230px);animation-timing-function:cubic-bezier(.33,1,.68,1)}
  35.282%,100%{transform:none}}
```

| Capa | Opacidad 0 → 1 (s) | Movimiento (s) | Desde |
| --- | --- | --- | --- |
| `lista` | 0,00 → 0,55 | 0,00 → 1,00 | `translateY(150px)` |
| `precio` | 0,05 → 1,00 | 0,10 → 1,40 | `translateX(-230px)` |
| `destino` | 0,07 → 0,90 | 0,07 → 1,20 | `translateY(100px)` |
| `badge` | 0,05 → 0,20 | 0,05 → 0,20 | `scale(.6)` |

Curvas: movimiento `cubic-bezier(.33,1,.68,1)` (ease-out cúbica); opacidad `cubic-bezier(.42,0,.58,1)`.
Orden de apilado: lista, precio, destino, badge, sobre `anim/<KV>__base.jpg`. Salida
`anim-css-<KV>.html` en `K` (las rutas `anim/…` son relativas a `K`). `anim-page.cjs` también reescribe
estos HTML para los 12 KV originales con el mismo CSS.

### 8.3 `frames.cjs`: captura cuadro a cuadro

`node frames.cjs <dir> <archivo.html> <dir salida> <fps>`. Extrae el `<style>` y el cuerpo entre
`</helmet>` y `</x-dc>` a `<dir>/_frames-<archivo>.html` (temporal **por archivo**), viewport 1080×1350,
escala 1.

1. Espera 600 ms, pausa todas las animaciones (`document.getAnimations()`) en `currentTime = 0`, espera
   300 ms y hace una captura descartable.
2. `N = round(3.968 × fps)` → **99 cuadros a 25 fps**. Para `j = 0 … N+1`: fija
   `currentTime = clamp(j/fps, 0.0005, T − 0.001) × 1000` en todas las animaciones, espera 40 ms y dos
   `requestAnimationFrame`, captura y guarda como `f<j−2>.png` si `j ≥ 2`.
3. El compositor entrega la captura con **2 cuadros de retraso**: por eso se capturan N+2 y se descartan
   los dos primeros; así `f0000` muestra t = 0. Al final borra el temporal.

¿Por qué 25 fps y no los 60 de la referencia? El GIF guarda los tiempos en centésimas: 25 fps son 4 cs
exactos por cuadro; 60 fps no se puede representar.

### 8.4 `render-gif.sh`: codificación

Para cada KV (`NAMES` = argumentos o todos los `anim-css-HM_*.html`), borra `fr-<kv>/`, captura a 25 fps y
codifica tres archivos en `OUT`:

```bash
# MP4 sin audio
ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart $OUT/$N.mp4
# MP4 con audio (AUD = P/ref/audio-gif.mp3, copia de AUDIO FINAL PARA LOS GIF.mp3)
ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png -i $AUD \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k \
  -af "volume=-3dB,alimiter=limit=0.79" -shortest -movflags +faststart $OUT/${N}_audio.mp4
# GIF: paleta propia por archivo, 256 colores, dither sierra2_4a, bucle infinito
ffmpeg -y -loglevel error -framerate 25 -i fr-$n/f%04d.png \
  -vf "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a" \
  -loop 0 $OUT/$N.gif
```

- **Audio:** la pista dura 3,944 s y su golpe en 1,37 s coincide con el precio quedando fijo. Viene a
  −10,9 LUFS con true peak +0,6 dBFS; se baja 3 dB y se limita (`limit=0.79`, ≈ −2 dBFS lineal antes de
  AAC); pico medido −0,3 dBFS. El GIF no lleva sonido.
- **Recorte por `-shortest`:** el `_audio.mp4` termina con el audio: **98 cuadros, 3,936 s**, contra 99
  cuadros y 3,96 s del MP4 mudo.

**Resultados medidos** (24 KV: 12 originales y 12 de la grilla y extras, todos 1080×1350, 25 fps):

| Archivo | Cuadros / duración | Peso |
| --- | --- | --- |
| `<KV>.gif` | 99 / 3,96 s | 3,78–7,69 MB (total 116 MB) |
| `<KV>.mp4` (H.264) | 99 / 3,96 s | 449–703 KB |
| `<KV>_audio.mp4` (H.264 + AAC) | 98 / 3,936 s | 551–804 KB |

Los GIF con lista (clústeres, banderas, regiones, «Encuentra») pesan 5,5–7,7 MB; los estándar 3,8–4,1 MB.
`render-all.sh` es la versión **obsoleta** que capturaba desde los artboards `anim-*.dc.html` del canvas:
desde que esos artboards son `<video>` con `/_blob/`, da cuadros negros. No usarla.

## 9. Story en video: `story-video.cjs`

12 MP4 1080×1920, 30 fps, **15,709 s (471 cuadros)**, H.264 + AAC 192 kb/s, 7,3–7,7 MB. Mensaje → idioma
y tipo (`MSG`): CL y PE en `es`; AR (Santiago, Lima) y UY en `ar`; BR en `pt`; US en `en`. Tipo `dom` para
`HM_CL_KV_DOM_CLUSTER` y `HM_PE_KV_DOM_REGIONES`; el resto `inter`. Temporales en `$K/story-tmp/`.

**Fondos:** `bg.png` = `foto(2.04, 2198, 0)` (el encuadre del story estático); `bg2.png` = `foto(2.3, 2420,
−60)`, más cerrado, para el brandlift. **Overlays** a 1080×1920 transparentes: logo de `parts/<KV>__logo.png`
al 130 % en `(x del KV, 270)`; tarjeta del brandlift; gráfico «Completa tu viaje» del idioma (940 px de
ancho, `left 70`, `top 1080`).

**Tarjeta brandlift:** `left/right 110`, `top 1180`, blanca, radio 40, padding 52/50/46, sombra
`0 18px 50px rgba(0,0,0,.18)`; frase Metric 700 74 px / 1,04 `#671e75`; píldora `#f1d9fb` radio 999 con
avión vectorial y texto Metric 700 27 px. Frases (`FRASE`): `es-dom` = referencia BLACK XL («Viaja con la
aerolínea más puntual de la región» / «A DESTINOS NACIONALES»); `es-inter`, `ar-inter`, `pt-inter` y
`en-inter` son propuestas propias, **sin confirmar**.

| # | Slide | Dur. | Construcción (ffmpeg) |
| --- | --- | --- | --- |
| 1 | Intro | 2,8 s | `bg` con zoom 1 → 1,07 (`scale=w='trunc(1080*(1+0.07*t/2.8)/2)*2':h=-2:eval=frame,crop=1080:1920`); logo `fade=in:st=0.35:d=0.6:alpha=1` y sube 40 px |
| 2 | Precios | 4,8 s | `formatos/<KV>__story.png` con zoom 1,05 → 1,00 |
| 3 | Brandlift | 3,3 s | `bg2` con zoom 1 → 1,05; tarjeta `fade st 0.25 d 0.5` y sube 30 px |
| 4 | Completa tu viaje | 3,3 s | `STORY AVION.mp4` `fps=30,scale=1080:1920` + gráfico `fade st 0.3 d 0.5` |
| 5 | Tapa | 2,7 s | tapa del idioma `fps=30,scale=1080:1920`, con su audio |

Cada slide se codifica aparte (`-r 30 -c:v libx264 -pix_fmt yuv420p -crf 17`, slides 1–4 sin audio). La
unión:

```text
[0][1]xfade=transition=fade:duration=0.3:offset=2.5[v1];
[v1][2]xfade=…:offset=7.0[v2]; [v2][3]xfade=…:offset=10.0[v3]; [v3][4]xfade=…:offset=13.0,format=yuv420p[v];
[5]atrim=0:13.3,volume=-3dB,afade=t=out:st=12.4:d=0.9[m];          # SONIC BRAND-3-STORY_1.mp3
[4:a]adelay=13000|13000,volume=-1dB[t];                              # audio de la tapa desde 13,0 s
[m][t]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89[a]
→ -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart
```

Duración: 2,8 + 4,8 + 3,3 + 3,3 + 2,7 − 4 × 0,3 = 15,7 s. La música se apaga entre 12,4 y 13,3 s para no
chocar con la tapa. Medido en los 12: **−12,0 LUFS, pico −0,5 dBFS**.

**Tapa vertical en español:** el kit sólo trae la horizontal (1920×1080); se arma una vez:
`crop=1080:1080:380:0,pad=1080:1920:0:420:white,fps=30,format=yuv420p`, `-crf 16`, AAC 192k →
`story-tmp/tapa-es.mp4`. El recorte arranca en x = 380 (el centro geométrico sería 420); PT y EN usan su
`*_Vertical.mov`. Pedir la vertical ES a la fuente.

## 10. PMAX: `banners.cjs` + copias

PMAX = 1080×1080, 1080×1350, 1080×1920 y 1200×628 por cada uno de los 12 KV originales (60 archivos en
`OUT/pmax/`). Los tres primeros **no se renderizan de nuevo**: son copias byte a byte del popup, del KV
fijo y de la story (mismos pesos en el inventario). Sólo el 1200×628 es nuevo.
**Si se rehace una fuente (p. ej. logofix), recopiar sus tres PMAX.** En BLACK, los de DOM-RUTA e
INTER-RUTA quedaron con la fecha vieja y así se entregaron; se corrigieron el 2026-11-05 (ver
[lessons.md](lessons.md)). Sólo el 1200×628 es nuevo:

`node banners.cjs pmax-1200x628` → `banners/<KV>__pmax-1200x628.png` y `@2x.png`. Render HTML a
`deviceScaleFactor 2`, fondo `#6a8fae`; 1x por lanczos3. Helpers: `item(KV, capa, s, x, y)` pone la caja
visible (de `bbox.json`) de la parte en `(x, y)`; `precio()` suma el badge con la misma relación que en el
KV; `foto(sf, xc, v0)` pone el centro de la mujer (columna 705 de la fuente) en `xc` y la fila `v0` arriba.

| KV | Foto | Logo | Destino | Precio + badge | Lista | Pie |
| --- | --- | --- | --- | --- | --- | --- |
| Estándar | `foto(1.0, 960, 160)` | 0,8 `(40,26)` | 0,8 `(48,300)` | 0,8 `(360,252)` | — | 0,8 `(40,566)` |
| Clúster nacional | `foto(1.05, 1000, 160)` + sombra | 0,62 `(40,22)` | 0,66 `(48,205)` | 0,66 `(380,322)` | 3 col. 0,56 `(430,34)` | 0,8 `(40,570)` |
| Clúster internacional | `foto(1.05, 980, 160)` + sombra | 0,72 `(40,22)` | — | 0,72 `(330,262)` | 0,47 `(48,212)` | 0,8 `(40,570)` |

Todos con `piso(400 → 628, 0,78)`. La sección `HPH` de `banners.cjs` (HPH compuesto con partes del KV y
precio) es el **intento rechazado** por el operador: no usarla; los HPH salen de §11. El `@2x` se renombra
a `_2x` en el canvas y en la entrega.

## 11. HPH: `hph/generic.cjs` y `hph/market.cjs`

Referencias: `src2/FORMATO HPH/HPH_{1200x1200,300x600,300x250,728x90}_GENERICO.svg` (ya con el logo de
§3). Herramientas de medición: `hph/render-ref.cjs` (render de referencia a `hph/ref-*.png`, 2x bajo 800 px
de ancho), `hph/probe.cjs` (caja alfa de cada hoja → `probe.json`) y `hph/ellipses.cjs` (cajas de los
`[id^="Ellipse"]`).

**Genérico Chile (`generic.cjs`):** render tal cual a `deviceScaleFactor 2` con Metric y Source Sans 3. El
728×90 trae sus 6 banderas en blanco (rasters enmascarados vacíos): se recortan del render del 1200×1200 en
`F1200` (63,26×64,39 px cada una, orden BR, PE, AR, DO, US, UY), se reducen a 14,55 px, se les aplica
**máscara circular** (`dest-in`) y se pegan en `F728`. Salida `hph/out/HPH_<fmt>_GENERICO.png` y `@2x.png`
(renombrado a `_2x` después). Los raster de estas referencias son 1x: el 2x no agrega detalle.

**Por mercado (`market.cjs`)**, genérico y **sin precio**, desde el SVG de referencia (no desde el KV):

1. Render a 2x. Cada hoja se mide **aislada por su alfa** (> 8) y se clasifica por caja con ±3 px de
   holgura (por el antialias del 2x) en las cajas medidas en los genéricos (`FMT`):

   | Formato | Lista | Logo | Puntualidad |
   | --- | --- | --- | --- |
   | 1200×1200 | `[90, 495, 620, 1020]` | `[100, 75, 640, 295]` | `[70, 1100, 365, 1155]` |
   | 300×600 | `[20, 175, 295, 360]` | `[24, 25, 224, 106]` | `[85, 545, 215, 575]` |
   | 300×250 | `[25, 98, 182, 216]` | `[30, 16, 142, 63]` | `[8, 226, 100, 248]` |
   | 728×90 | `[140, 55, 266, 77]` | `[12, 18, 134, 68]` | — |

2. Por mercado se restaura el HTML base y se ocultan las hojas de la lista (y en BR/US las del logo y la
   puntualidad).
3. **Textos:** por coincidencia exacta (`VUELA`, `Internacional`, `CON GRANDES`, `DESCUENTOS`,
   `Ver vuelos`) y el legal que empieza con `Aplican TyC` se cambia por el TyC del mercado. Los centrados
   (los tres últimos, o los que están a < 8 % del centro) conservan su centro moviendo `x`; los demás, si
   se salen de `W − 6`, reducen su `font-size`.
4. **Lista del mercado** (`listaHTML`) dentro de la caja de la lista de Chile: paso = alto de la caja / 6,
   bandera 0,73 del paso, texto 0,36 del paso (Metric 500 `#fefefe`, interlínea 0,34), centrada si hay
   menos de 6 filas. En el 728×90 y en Uruguay, fila de banderas sin texto (diámetro = alto de la caja en
   el 728; si no, `min(alto/6 × 0,95, 70)`), separación 0,28 del diámetro. Banderas desde `flags-circ/`.
5. **BR y US:** logo `parts/<KV>__logo.png` escalado al ancho de la caja visible del logo genérico (con la
   caja del KV de `bbox.json`); puntualidad = recorte `[45, 1244, 330, 64]` de `parts/<KV>__pie.png`
   escalado por `alto visible / 58`, subido `3 × escala`.
6. Captura a 2x → `hph/out-mercados/<KV>__hph-<fmt>_2x.png` y 1x por lanczos3.

Textos por mercado y TyC: ver `M` en el script y [sky-design-canvas.md](sky-design-canvas.md), «PMAX y
HPH». Traducciones propias sin confirmar: «COM GRANDES / DESCONTOS», «WITH BIG / DISCOUNTS», «Ver voos»,
«See flights». Total en `OUT/hph/`: (genérico + 5 mercados) × 4 formatos × (1x + `_2x`) = 48.

## 12. Chile «KV listo»: `chile-refs.cjs`

Render de las 9 referencias editables de Daniela ya corregidas por §3 (`src2/`): 3 Banner TikTok
1920×1080 (PRECIO, DCTO, PRECIO+DCTO), 2 DAT 1080×1080 (DOM, INTER) y 4 PMAX precio+dcto (1080×1080,
1080×1350, 1080×1920, 1200×628). `deviceScaleFactor 2`; `_2x.png` directo y 1x por lanczos3. Nombre:
prefijo `CL_`, sin `KV BLACK-45-`, `+` → `-` (`CL_BANNER-TIKTOK_PRECIO-DCTO_1920x1080.png`). Precios y
descuentos siguen en placeholder (`000.000`, `00%`) hasta la grilla de precios. 18 archivos.

## 13. Publicación en el canvas de Claude Design

Canvas: https://claude.ai/artifact/QTy12G38oQYB1xrnZmkpee (versión 28 al cierre; 10 páginas, 301 boards).

### 13.1 Imágenes: `sync-canvas.cjs`

Copia a `P/` como JPEG q90 4:4:4 (`flatten` sobre `#000`): `png/HM_*.png` → `kv/`, `formatos/*.png` →
`formatos/`, `banners/*__pmax-1200x628.png` → `banners/`, `chile/*.png` (sólo 1x) → `chile/`. HPH:
1200×1200 en JPG; los chicos como **PNG 2x** con sufijo `_2x` (los `@2x` de `hph/out/` se renombran:
un archivo con «@» no carga en el artboard). Las imágenes se publican como archivos relativos del
proyecto (`kv/x.jpg`), que sí cargan.

### 13.2 Artboards y páginas

Cada artboard es un `.dc.html` con la misma cáscara: `<script src="./support.js">`,
`<x-dc><helmet><style>body{margin:0}…</style></helmet> … </x-dc>` y
`<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":W,"height":H}}'>` con
`class Component extends DCLogic { renderVals() { return {}; } }`. Dentro: un `<img>` (imagen relativa) o
un `<video src="/_blob/<id>" autoplay muted loop playsinline>` (más `controls` si tiene audio; `poster` =
KV fijo en la página de animación).

`P/canvas.json` (`v`, `createdOnFiles`, `title`, `launch`, `pages[{id,name}]`,
`boards{archivo:{x,y,w,h,title,page}}`, `order[]`, `notes{id:{x,y,text,kind:'title1',maxW,page}}`,
`designSystems`). Cada script de página recibe `P` como argumento, **borra los boards y notas de su
página** y los vuelve a crear (idempotente), separando columnas cada 1160 px:

| Script | Página (id) | Contenido |
| --- | --- | --- |
| `add-page.cjs` | KV Black · HM (`kv-black`) | 12 KV; su versión usa ids `/_blob/` viejos: hoy los `kv-*.dc.html` apuntan a `kv/<KV>.jpg` |
| `anim-page.cjs` | KV Black · Animación GIF (`kv-black-anim`) | 12 `<video>` (ids de `vid-blobs.json`), 6 referencias y la previa con audio; reescribe `anim-css-*.html` |
| `formats-page.cjs` | KV Black · Popup y Story (`kv-black-formatos`) | 24 estáticos; escribe `formats-files.json` |
| `pmax-hph-page.cjs` | KV Black · PMAX y HPH (`kv-black-pmax-hph`) | 48 PMAX + 24 HPH; escribe `pmax-hph-files.json` |
| `new-pages.cjs` | Grilla por mercado, Rutas foco Perú, Chile KV listo | KV, popup, GIF, story y story video por mensaje; 26 rutas; 9 Chile; escribe `new-pages-files.json` |

### 13.3 Videos como assets y `vid-blobs.json`

Un MP4 publicado como archivo del proyecto **no carga**; video (y PDF) van como **assets**. MP3 no se
puede subir: el audio viaja como pista de un MP4.

1. Subir los MP4 con `Artifact` `publish` + `url` del canvas + `asset: true` + `file_paths` (hasta 25 por
   llamada; 36 videos = 2 llamadas o más).
2. Copiar los ids que devuelve a `K/vid-blobs.json`: objeto plano `"<KV>__gif": "<id32hex>"` (24) y
   `"<KV>__story-video": "<id32hex>"` (12). Los `__gif` apuntan al **MP4 mudo** del KV: en el canvas
   la pieza «GIF» se muestra como ese MP4 en bucle.
3. Recién entonces correr `anim-page.cjs` y `new-pages.cjs`, que leen esos ids.

Volver a subir un video genera **id nuevo**: actualizar `vid-blobs.json` y regenerar las páginas.

### 13.4 Publicar el proyecto

`Artifact` `publish` con `url` del canvas, `root = $S/canvas`, `file_path` = un archivo de `project/`
(por ejemplo `project/canvas.json`) y `files` = el mapa o la lista de rutas `project/…` (los `*-files.json`
y `$S/canvas/pub*.json` tienen la forma `{"project/<ruta>": "project/<ruta>"}`).

- **Límite: 512 archivos por versión** (`deploy 422: manifest exceeds 512 entries`). Publicar por lotes
  (imágenes primero, luego artboards con `canvas.json`) y quitar lo que sobra con `null` en `files` (caso
  real: las 49 capas `anim/*`, que ya no se usan porque las animaciones del canvas son video).
- Un aviso de «versión remota más nueva» con `canvas.json` idéntico no es conflicto; si difiere, fusionar
  sobre la versión remota.
- Verificar en la vista «play» del artboard (`#play-<id>`). Los artboards rayados a zoom bajo son carga
  perezosa, no error.

### Línea blanca en el borde (corregida 2026-11-05)

En 13 SVG del kit (HPH 1200×1200, 300×600 y 300×250; los 3 TikTok; los 2 DAT; PMAX 1080×1080 y 1200×628),
la máscara de la foto `Raster 1` no cubre el borde inferior y deja una línea clara de 1 a 4 px. `foto-base.cjs`
(`fotoBase(svg)`) inserta una copia sin máscara de la foto después de `Layer 0`; en el 300×600 la estira 2 px
porque la foto viene subida. `hph/generic.cjs`, `hph/market.cjs` y `chile-refs.cjs` la aplican al leer el SVG.
Verificado con un diff por SVG (sólo cambian píxeles a ≤ 6 px del borde) y con un escaneo de bordes de toda la entrega.

### Logo BLACK suelto en PNG grande (2026-11-05)

`node logo-export.cjs <OUT>` toma los tres logos corregidos de `src2/KV X HM/LOGO BLACK/` (`SKY_LOGO_BLACK_ESP`,
`SKY-13` = PT, `SKY_LOGO_BLACK_USA` = EN) y exporta `SKY_LOGO_BLACK_<ES|PT|EN>_<4000|2000>px.png` con fondo
transparente. Amplía el viewBox un 15 % por lado para que el avión y el resplandor no se corten, renderiza 1,3 veces
más grande, recorta a lo visible, deja un margen del 3 % y baja al ancho exacto con lanczos3. Junto a los PNG va el
SVG corregido, con los textos vivos en Metric. La punta del ala del avión viene cortada en la imagen del kit (fila
0 opaca en los tres idiomas): no es un defecto de la exportación.

## 14. Entrega

**Local (`OUT`, no versionado):** raíz = `render-gif.sh`; `story-video/` = `story-video.cjs`. El resto se
copió con comandos sueltos (sin script guardado): `kv/` ← `png/`; `estaticos/` ← `formatos/` de los 24 KV;
`rutas-peru/` ← `formatos/HM_PE_RUTA_*`; `chile-kv-listo/` ← `chile/`; `pmax/` ← popup/KV/story de los 12
KV renombrados `__pmax-<fmt>.png` + `banners/*__pmax-1200x628{,_2x}.png`; `hph/` ← `hph/out/` (`@2x` →
`_2x`) + `hph/out-mercados/`; `scripts/` ← copia de los scripts.

| Carpeta | Archivos | Contenido |
| --- | --- | --- |
| raíz | 72 | 24 × (`.gif`, `.mp4`, `_audio.mp4`) |
| `kv/` | 37 | KV 1080×1350 (24 mensajes + 13 rutas) |
| `estaticos/` | 48 | popup y story de los 24 KV |
| `rutas-peru/` | 26 | popup y story de 13 rutas |
| `chile-kv-listo/` | 18 | 9 piezas × (1x + `_2x`) |
| `story-video/` | 12 | 1080×1920, 15,7 s |
| `pmax/` | 60 | 12 KV × (4 formatos + `1200x628_2x`) |
| `hph/` | 48 | 6 variantes × 4 formatos × 2 |

**OneDrive (2026-11-05):** copia a la carpeta nueva
`Despliegue Base/ENTREGABLES BLACK (Efeonce 2026-11-05)/`, sin `scripts/` ni `.DS_Store`: 321 archivos,
626 MB, verificados con `diff -rq` y `cmp`. Antes de entregar, `find OUT -type f ! -newermt '<fecha de la última
corrección>'` debe salir vacío y cada PMAX 1080 debe dar `cmp` idéntico con su popup, KV o story.
Mapeo de carpetas y reglas en
[sky-design-canvas.md](sky-design-canvas.md), «Entregables y scripts locales».

## 15. Verificación visual: hojas de contacto

Cada lote se revisa **mirando** una hoja de contacto, no sólo con métricas:

- `sheet.cjs`: todos los `png/*.png` en una grilla de 5 columnas a 360×450, fondo `#888`, JPEG q85 →
  `K/sheet.jpg`. Hubo hojas equivalentes para partes, capas, formatos, banderas y alianzas
  (`parts-sheet.jpg`, `layers-sheet.jpg`, `formatos-sheet*.jpg`, `$S/flags-sheet.jpg`, `$S/alz-sheet.jpg`,
  `hph/mercados-check*.jpg`), armadas con el mismo patrón sharp.
- `anim-test.cjs <dir> <archivos…>`: congela cada animación en t = 0,001 · 0,15 · 0,3 · 0,5 · 0,8 · 1,1 ·
  1,5 · 3,9 s y arma una fila de 8 miniaturas 270×338 por pieza (`anim-test.jpg`). Detecta capas que no
  se mueven, que arrancan visibles o que no llegan a su posición.
- Qué mirar: textos completos en cada formato (el caso «Internacional»), legal legible sobre el degradado,
  badge sin tapar la cara, logo y alianza sin tocarse, banderas correctas por mercado, bordes de las capas
  de oscurecido, y el GIF/MP4 en el canvas con la vista «play».

## 16. Fallas conocidas y su arreglo

| Síntoma | Causa | Arreglo en el pipeline |
| --- | --- | --- |
| MP4/GIF negros | Se capturaba desde los artboards del canvas, ahora `<video src="/_blob/…">` que no carga fuera del canvas | Capturar desde `anim-css-<KV>.html` con `render-gif.sh`; `render-all.sh` queda obsoleto |
| Render paralelo falla (ENOENT) o mezcla cuadros | Dos `frames.cjs` escribían el mismo `_frames.html` | Temporal por archivo `_frames-<archivo>.html`; los 24 se rehicieron en secuencia |
| Primer cuadro no es t = 0 | La captura llega con 2 cuadros de retraso | Capturar N+2 y descartar los 2 primeros (§8.3) |
| `logofix` no encuentra el marco del logo | El logo usa `H` absoluto y el regex sólo aceptaba `h` | Regex con `[hH]` |
| `logofix` toma mal la fecha | `getBBox()` devuelve coordenadas locales, sin el `transform` | Comparar la `y` del `translate(x y)` del `<text>` |
| La capa raster del logo no se oculta | Se buscaba un `<use>` para borrar (0 casos); la imagen está en línea | `display="none"` sobre la propia `<image id>` |
| Idioma PT en un archivo en español | Se buscaba «VOE» en el SVG crudo y apareció dentro de un base64 | Detectar sólo por el texto de los `<tspan>` |
| «Internacional» desaparece en popup/story | Elemento más ancho que la región de `destino` (x1 = 420) | Región a x1 = 530; comparar la base con la foto fuente recolocada |
| Imágenes enmascaradas caen en la capa equivocada | `getBoundingClientRect` da la caja completa del raster | Medirlas aisladas por alfa (§6.1) |
| El divisor del pie queda en la base | Línea de ancho 0 | En `parts.cjs` basta ancho **o** alto > 0 |
| `market.cjs` reporta logo 0 | Antialias del 2x deja la caja 1–2 px fuera | Holgura de ±3 px en `inside()` |
| Banderas del 728×90 pegadas como cuadrados | El recorte del 1200 trae foto en las esquinas | Máscara circular `dest-in` |
| Logo de alianza sobre el avión en la story | Con el logo al 130 % el avión llega a x≈925 | Alianza 1,1 con esquina superior derecha en `(1032, 500)` |
| Imágenes `file://` vacías en Playwright | `setContent` no carga recursos `file://` | Escribir HTML a disco y `goto` |
| `x@2x.png` no carga en el artboard | El canvas no sirve nombres con «@» | Sufijo `_2x` |
| `deploy 422: manifest exceeds 512 entries` | Versión con más de 512 archivos | Lotes y `null` en `files` (49 `anim/*`) |
| Comando `node -e` con backticks rechazado | Bash 3.2 de macOS | Pasar el código a un archivo `.cjs` |
| Entradas `KV` y `X` en `anim/manifest.json` | `recrop.cjs` recibió una ruta con espacios | Pasar sólo nombres `HM_…` |
| Parche que deja de aplicar | El SVG cambió (p. ej. tras `logofix`) | `render`/`parts`/`layers` lanzan `sin <texto>`: actualizar `patches.cjs` |

## 17. Re-ejecutar en otra sesión

El scratchpad de la sesión original es temporal. Antes de correr nada:

1. **Recuperar los scripts.** El 2026-11-05 `OUT/scripts/` se resincronizó con las versiones finales del
   scratchpad. Contiene todos los `*.cjs`/`*.sh` de `K`, `hph/*.cjs` con la misma estructura, los
   `*-files.json` de las páginas, `vid-blobs.json` y `foto-fuente.png`. En `data/` están `bbox.json`
   (va a `parts/`), `anim-manifest.json` (va a `anim/manifest.json`), los dos archivos de hechos y los
   inventarios medidos del kit y de los entregables, con sus scripts `inv.sh`/`inv-kit.py`. Las fuentes
   no se copian porque tienen licencia: reponerlas desde OneDrive.
2. **Reponer insumos** en el nuevo `K`: `Metric-*.otf` (desde OneDrive `Metric_family`),
   `hph/SourceSans3-Regular.otf`, `foto-fuente.png` (extraer el `<image>` embebido de un KV estándar),
   `P/ref/audio-gif.mp3` (copia del MP3 del kit) y un `P/` con el proyecto del canvas (bajarlo con
   `Artifact` `read`/`list` `scope: files` si hace falta regenerar páginas).
3. **Ajustar rutas absolutas.** Fijas a la sesión vieja: `render.cjs`, `parts.cjs`, `layers.cjs` (`D`),
   `render-gif.sh` (`K`, `AUD`), `hph/{generic,market,render-ref,probe,ellipses}.cjs` (`K`, `H`, `SP`). A
   OneDrive: `logofix`, `banderas`, `variantes`, `rutas`, `story-video`. A `OUT`: `render-gif.sh`,
   `story-video.cjs`. A `node_modules` de Greenhouse: todos. Los demás usan `__dirname`.
   Comprobar con `grep -n "/private/tmp\|OneDrive\|ai-generations\|node_modules" *.cjs *.sh hph/*.cjs`.
4. **Volver a listar el kit** (crece) y revisar que los textos que buscan `variantes`, `rutas`,
   `market.cjs` y `patches.cjs` sigan existiendo; los scripts avisan con `NO` o lanzan error.
5. **Correr en el orden de §1**, de a uno, y mirar la hoja de contacto de cada lote (§15).
6. **Rehacer `parts/bbox.json`** si cambian las partes, antes de `banners.cjs` y `hph/market.cjs`.
7. No escribir en las carpetas del kit; entregar en una carpeta nueva fechada (§14). Gasto de IA: ninguno
   en este pipeline; sólo con autorización explícita y la clave que indique el operador.

## 18. Pendientes de confirmar (no son defectos del pipeline)

Frases INTER del brandlift y sus traducciones AR/PT/EN; traducciones de flecha y botón del HPH; BR «Voe
para Peru» (alianza o KV); «Vuela por Perú» sin fotos; CL «Encuentra destinos» hecho desde el clúster
internacional de Chile; texto de ubicación de la foto en las rutas; tapa vertical ES recortada; precios y
descuentos en placeholder. Detalle en [sky-design-canvas.md](sky-design-canvas.md) y
[state-continuity.md](state-continuity.md).
