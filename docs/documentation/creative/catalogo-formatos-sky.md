# Catálogo de formatos SKY — Qué pieza es cada una, su tamaño y cómo se nombra

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-11-05 por Claude
> **Ultima actualizacion:** 2026-11-05 por Claude (fotos de destino en las rutas, orden de carpetas «BLACK SKY 2026»)
> **Documentacion tecnica:** [Taxonomía técnica de formatos SKY](../../../.claude/skills/efeonce-creative-workbench/references/sky-format-catalog.md) ·
> [Scripts del despliegue BLACK](../../../.claude/skills/efeonce-creative-workbench/references/sky-black-pipeline.md) ·
> [Canvas de SKY en Claude Design](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md)
> **Manual de uso:** [Adaptar un KV de SKY en Claude Design](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md)
> **Documentacion relacionada:** [Adaptaciones SKY en Claude Design](./adaptaciones-sky-en-claude-design.md)

## Para qué sirve este catálogo

SKY Airline (servicio Performance, creativo) pide cada campaña en muchos formatos a la vez: la imagen madre, versiones
cuadradas y verticales, animaciones, banners para buscadores y medios, piezas por mercado y por ruta. Este documento
reúne **todos los formatos que se produjeron en noviembre de 2026** (campañas CyberSky Perú y BLACK) y explica, sin
jerga, qué es cada uno, para qué sirve, qué tamaño tiene, cuántos se hicieron, dónde están y cómo leer su nombre.

Es el mapa para quien recibe la entrega (diseño, medios, cuentas) y para quien prepara la próxima campaña.

> Detalle técnico: [taxonomía técnica de formatos](../../../.claude/skills/efeonce-creative-workbench/references/sky-format-catalog.md)

## Siglas: lo que sabemos y lo que no

Varias siglas vienen del cliente o del medio. Sólo se explican las que tienen un significado registrado; el resto se
usa tal como la usa SKY, sin inventarle uno.

| Sigla | Qué significa | Cómo la usamos |
|---|---|---|
| **KV** | Key Visual: la pieza madre de la campaña | La imagen 1080×1350 de la que salen todas las demás |
| **PMAX** | Google Performance Max (campañas de Google) | Paquete de 4 imágenes por KV |
| **DOM / INTER** | Vuelos nacionales / internacionales | Parte del nombre del KV («Vuela por Chile» es DOM) |
| **DCTO / DTO** | Descuento, tal como lo escribe cada mercado | Badge del KV y variante del banner TikTok |
| **HPH** | No consta su significado | Juego de 4 banners (1200×1200, 300×600, 300×250, 728×90) |
| **DAT** | No consta su significado | Pieza cuadrada 1080×1080 de Chile; en el canvas se anotó como «portadas del buscador» |
| **HM** | No consta su significado | Prefijo de todos los nombres de archivo del kit (`HM_CL_KV_DOM`, etc.) |
| **Brandlift** | No consta una definición del cliente | Nombre que Daniela usa para el tercer momento del story en video (tarjeta blanca con una frase) |

Si alguien necesita la definición de HPH, DAT o HM, hay que pedírsela a SKY o a Daniela; no está en el kit.

## Los formatos de un vistazo

| Formato | Tamaño (px) | Qué es | Para qué sirve | Campaña |
|---|---|---|---|---|
| **KV** | 1080×1350 | La pieza madre, vertical 4:5 | Feed de redes y base de todo lo demás | BLACK |
| **Post** | 1080×1350 | El mismo tamaño del KV, armado desde plantilla | Feed de redes | CyberSky Perú |
| **Popup** | 1080×1080 | Versión cuadrada del KV | Ventana emergente y formatos cuadrados | Ambas |
| **Story** | 1080×1920 | Versión vertical completa, estática | Historias de Instagram y similares | Ambas |
| **GIF** | 1080×1350 | El KV animado, en bucle y sin sonido | Donde el medio pide GIF | BLACK |
| **MP4** | 1080×1350 | La misma animación en video, sin sonido | Donde el medio prefiere video | BLACK |
| **MP4 con audio** | 1080×1350 | La animación con la pista de audio del kit | Redes con sonido | BLACK |
| **Story en video** | 1080×1920 | Video de 15,7 s en 5 partes, con música | Historias en video | BLACK |
| **PMAX** | 1080×1080, 1080×1350, 1080×1920 y 1200×628 | 4 imágenes por KV | Google Performance Max | BLACK |
| **HPH** | 1200×1200, 300×600, 300×250 y 728×90 | 4 banners con lista de destinos, sin precio | Banners de display | BLACK |
| **Banner TikTok** | 1920×1080 | Banner horizontal en 3 variantes (precio, descuento, precio + descuento) | TikTok | BLACK (sólo Chile) |
| **DAT** | 1080×1080 | Pieza cuadrada nacional e internacional | Ver la nota de siglas | BLACK (sólo Chile) |
| **Ruta foco** | KV 1080×1350, popup y story | Una pieza por ciudad de Perú, con PromPerú | Promocionar rutas puntuales | BLACK (sólo Perú) |

Casi todos los PNG se entregan en **tamaño normal (1x)** y algunos también en **doble (2x)**, para pantallas de alta
densidad. Los que tienen 2x son el HPH, el PMAX 1200×628 y todas las piezas de «Chile KV listo».

> Detalle técnico: [taxonomía técnica de formatos](../../../.claude/skills/efeonce-creative-workbench/references/sky-format-catalog.md)

## Cada formato, en detalle

### KV (Key Visual)

La pieza madre: foto de la viajera, logo BLACK con la fecha, bloque de destino («VUELA A / Calama», «VOLÁ /
Internacional»), flecha morada con el precio, badge circular de descuento y el pie con el legal. En los KV de
**clúster** hay además una lista de destinos (con fotos circulares en el nacional de Chile, con banderas en el
internacional).

- **Tamaño:** 1080×1350.
- **Cuántos:** 24 KV de mercado (ver [la matriz](#mercados-y-mensajes-la-matriz-de-24-kv)) más 13 de rutas de Perú
  = 37 imágenes fijas.
- **Peso:** entre 0,9 y 1,2 MB cada una.
- **Dónde:** carpeta `KV ESTATICOS` de la entrega.

### Post (CyberSky Perú)

Mismo tamaño que el KV (1080×1350), pero armado desde una plantilla con datos por destino: cambia la ciudad, el
precio y la foto. Se hicieron 22, uno por destino (16 nacionales y 6 internacionales), y se entregaron dentro del PDF
de 66 páginas de CyberSky.

### Popup

Versión cuadrada. No es el KV recortado: se vuelve a encuadrar la foto original, se reubica el logo arriba a la
izquierda y el bloque de destino, precio y badge queda sobre el pie. Un degradado oscuro abajo evita que el legal
quede encima de la ropa de la persona.

- **Tamaño:** 1080×1080.
- **Cuántos:** 24 en BLACK (uno por KV de mercado) + 13 de rutas de Perú; 22 en CyberSky Perú.
- **Peso:** unos 1,7 MB.
- **Dónde:** `POPUP Y STORY` (BLACK), `RUTAS FOCO PERU` (rutas) y el PDF de CyberSky.

### Story estática

Versión vertical completa. La foto se vuelve a encuadrar para cubrir el alto sin inventar cielo, y el contenido
respeta unos **270 px libres arriba y abajo**, donde Instagram pone su propia interfaz (nombre, caja de respuesta).

- **Tamaño:** 1080×1920.
- **Cuántos:** 24 en BLACK + 13 de rutas de Perú; 22 en CyberSky Perú.
- **Peso:** entre 2,3 y 2,6 MB.
- **Dónde:** `POPUP Y STORY`, `RUTAS FOCO PERU` y el PDF de CyberSky.

### GIF

El KV animado. Ver [cómo es un GIF](#cómo-es-un-gif) más abajo.

- **Tamaño:** 1080×1350.
- **Cuántos:** 24, uno por KV de mercado.
- **Peso:** entre 3,8 y 7,7 MB; los KV con lista (clúster, banderas, regiones) son los más pesados.
- **Dónde:** `GIF Y VIDEO KV`.

### MP4 y MP4 con audio

La misma animación del GIF, en video. Hay dos versiones por KV:

| Versión | Sonido | Duración | Peso | Nombre |
|---|---|---|---|---|
| MP4 | Sin sonido | 3,96 s | 0,45 a 0,70 MB | `HM_<…>.mp4` |
| MP4 con audio | Pista «AUDIO FINAL PARA LOS GIF» del kit | 3,94 s | 0,55 a 0,80 MB | `HM_<…>_audio.mp4` |

Cuántos: 24 de cada uno, en `GIF Y VIDEO KV`. Esa carpeta tiene 72 archivos: 24 GIF + 24 MP4 + 24 MP4 con audio.

### Story en video

Un video vertical de 15,7 s que cuenta la oferta en cinco momentos. Ver [cómo es el story en video](#cómo-es-el-story-en-video).

- **Tamaño:** 1080×1920, 30 cuadros por segundo, con música.
- **Cuántos:** 12, uno por cada mensaje de la grilla por mercado.
- **Peso:** entre 7,3 y 7,7 MB.
- **Dónde:** `STORY VIDEO 5 SLIDES`.

### PMAX (Google Performance Max)

Cuatro imágenes por KV, en los tamaños que pide Google. Tres de ellas son piezas que ya existían; sólo la horizontal
se compone de cero:

| Tamaño | De dónde sale |
|---|---|
| 1080×1080 | Es el popup |
| 1080×1350 | Es el KV |
| 1080×1920 | Es la story estática |
| 1200×628 | Nueva: horizontal, con la persona corrida a la derecha para que el badge no le tape la cara |

- **Cuántos:** los 12 KV originales del kit × 4 tamaños, más el 1200×628 en doble (2400×1256) = 60 archivos.
- **Dónde:** `PMAX`.
- Chile además tiene su propio PMAX desde la referencia editable del kit (ver «Chile KV listo»).

### HPH (banners de display)

Juego de cuatro banners: cuadrado grande, rascacielos, rectángulo y franja.

| Tamaño | Forma | Peso aproximado (1x) |
|---|---|---|
| 1200×1200 | Cuadrado grande | 2,1 MB |
| 300×600 | Vertical alto | 0,33 MB |
| 300×250 | Rectángulo | 0,17 MB |
| 728×90 | Franja horizontal muy baja | 0,12 MB |

El kit trae un **HPH genérico de Chile** (internacional, con banderas, «CON GRANDES DESCUENTOS», **sin precio**, botón
«Ver vuelos»). Para los demás mercados se adapta ese mismo genérico: se cambia la lista de banderas de Chile por la del
mercado, se traducen los textos y la URL y, en Brasil y Estados Unidos, se cambian el logo y el sello de puntualidad.
En el 728×90 y en Uruguay no cabe una lista, así que va una fila de banderas sin texto.

- **Cuántos:** genérico de Chile + 5 mercados (Perú, Argentina, Uruguay, Brasil y Estados Unidos) × 4 tamaños × 1x y
  2x = 48 archivos.
- **Dónde:** `HPH`.

### Banner TikTok (sólo Chile)

Banner horizontal 1920×1080 en tres variantes: sólo precio, sólo descuento, y precio + descuento. Es la referencia
editable del kit con el logo corregido. 3 piezas en 1x y 2x (3840×2160) = 6 archivos, en `CHILE KV LISTO`.

### DAT (sólo Chile)

Pieza cuadrada 1080×1080 en dos versiones: nacional (DOM) e internacional (INTER). Igual que el TikTok, es la
referencia editable del kit con el logo corregido. 2 piezas en 1x y 2x = 4 archivos, en `CHILE KV LISTO`. El
significado de la sigla no consta.

### Rutas foco Perú

Una pieza por ruta, hecha desde el KV «PE DOM-RUTA»: el destino es la ciudad, arriba a la derecha va el logo PromPerú
(versión «solo HM Perú») y abajo un texto con un pin verde que dice `[Ubicación de la foto]`. Ese texto es un
**marcador**: no hay foto por ciudad, así que la ubicación queda por definir.

Las 13 rutas: Arequipa, Cajamarca, Chiclayo, Cusco, Iquitos, Jauja, Juliaca, Piura, Pucallpa, Tacna, Tarapoto, Trujillo
y Tumbes. Pucallpa venía repetida en la lista y se hizo una sola vez.

Por ruta hay KV (en `KV ESTATICOS`), popup y story (en `RUTAS FOCO PERU`, 26 archivos).

### Plantillas CyberSky (en el canvas)

No son entregables, pero conviene saber que existen: `PlantillaPopup`, `PlantillaPost` y `PlantillaStory` leen la
tabla de destinos y fotos y arman la pieza del destino que se les pide. Con ellas salieron las 66 piezas de CyberSky
Perú.

## Cómo leer los nombres de archivo

Todos los nombres siguen la misma lógica: **quién · qué · variante · formato · tamaño**.

```text
HM_ <MERCADO> _KV [_<TIPO>] [__<FORMATO>] [_audio | _2x]
```

| Parte | Valores | Ejemplo |
|---|---|---|
| `HM_` | Prefijo del kit de SKY (su significado no consta) | `HM_…` |
| Mercado | `CL` Chile · `PE` Perú · `AR` Argentina · `UY` Uruguay · `BR` Brasil · `US` Estados Unidos | `HM_BR_…` |
| `KV` | Indica que la pieza sale de un KV | `HM_BR_KV` |
| Tipo (opcional) | `DOM` nacional · `INTER` internacional · `DOM-RUTA` / `INTER-RUTA` ruta puntual · `DOM_CLUSTER` lista de regiones · `INTER_CLUSTER` lista de banderas · `BANDERAS` lista de banderas del mercado · `SANTIAGO`, `LIMA`, `PERU` destino del mensaje · `ENCUENTRA` «Encuentra destinos» · `DOM_REGIONES` regiones de Perú · `INTER_BANDERAS` internacional con banderas | `HM_PE_KV_INTER_BANDERAS` |
| Sin tipo | AR, BR, US y UY tienen un KV base sin sufijo | `HM_US_KV` |
| Formato (con **doble** guion bajo) | `__popup`, `__story`, `__story-video`, `__pmax-<ancho>x<alto>`, `__hph-<ancho>x<alto>` | `HM_UY_KV__hph-728x90` |
| `_audio` | MP4 con la pista de audio | `HM_CL_KV_DOM_audio.mp4` |
| `_2x` | Misma pieza al doble de tamaño | `HM_AR_KV__pmax-1200x628_2x.png` |

Otros nombres:

| Nombre | Qué es |
|---|---|
| `HM_PE_RUTA_<CIUDAD>` | Ruta foco de Perú (por ejemplo `HM_PE_RUTA_CUSCO__story.png`) |
| `HPH_<ancho>x<alto>_GENERICO` | HPH genérico de Chile |
| `CL_BANNER-TIKTOK_<PRECIO, DCTO o PRECIO-DCTO>_1920x1080` | Banner TikTok de Chile |
| `CL_DAT_<DOM o INTER>` | DAT de Chile |
| `CL_PMAX_<ancho>x<alto>` | PMAX de Chile desde la referencia editable |

La extensión dice el tipo: `.png` imagen fija, `.gif` animación sin sonido, `.mp4` video.

> Detalle técnico: [taxonomía técnica de formatos](../../../.claude/skills/efeonce-creative-workbench/references/sky-format-catalog.md)

## Mercados y mensajes: la matriz de 24 KV

BLACK tiene **24 KV de mercado**: los 12 que trae el kit y 12 nuevos que se hicieron en la segunda ronda, a pedido de
Daniela (diseño, Efeonce).

| Mercado | KV del kit (12) | KV nuevos (12) |
|---|---|---|
| **Chile (CL)** | `DOM`, `INTER`, `DOM_CLUSTER` (regiones), `INTER_CLUSTER` (banderas) | `ENCUENTRA` |
| **Perú (PE)** | `DOM`, `INTER`, `DOM-RUTA`, `INTER-RUTA` | `DOM_REGIONES`, `INTER_BANDERAS`, `ENCUENTRA` |
| **Argentina (AR)** | KV base | `SANTIAGO`, `LIMA`, `BANDERAS` |
| **Uruguay (UY)** | KV base | `BANDERAS` |
| **Brasil (BR)** | KV base | `SANTIAGO`, `PERU`, `BANDERAS` |
| **Estados Unidos (US)** | KV base | `BANDERAS` |

Los 24 tienen KV fijo, popup, story estática, GIF, MP4 y MP4 con audio. Aparte están las 13 rutas de Perú.

### La grilla por mercado (12 mensajes)

Daniela pidió una grilla con los mensajes de cada mercado. Cada mensaje tiene KV, popup, GIF, story estática y **story
en video**:

| Mercado | Mensaje | KV |
|---|---|---|
| Chile | Vuela por Chile (lista de regiones) | `HM_CL_KV_DOM_CLUSTER` |
| Chile | Vuela internacional (lista de banderas) | `HM_CL_KV_INTER_CLUSTER` |
| Chile | Encuentra destinos | `HM_CL_KV_ENCUENTRA` |
| Perú | Vuela por Perú (regiones en dos columnas, sin fotos: propuesta) | `HM_PE_KV_DOM_REGIONES` |
| Perú | Vuela internacional (banderas de Perú) | `HM_PE_KV_INTER_BANDERAS` |
| Perú | Encuentra destinos | `HM_PE_KV_ENCUENTRA` |
| Argentina | «VOLÁ A Santiago» | `HM_AR_KV_SANTIAGO` |
| Argentina | «VOLÁ A Lima» | `HM_AR_KV_LIMA` |
| Uruguay | Volá internacional (fila de 4 banderas) | `HM_UY_KV_BANDERAS` |
| Brasil | Voe a Santiago, con el logo Chile Travel | `HM_BR_KV_SANTIAGO` |
| Brasil | «VOE PARA Peru», con PromPerú | `HM_BR_KV_PERU` |
| Estados Unidos | Fly international (banderas) | `HM_US_KV_BANDERAS` |

«VOLÁ» es el copy del propio cliente para Argentina y Uruguay; se respeta tal cual.

`HM_AR_KV_BANDERAS` y `HM_BR_KV_BANDERAS` no son mensajes de la grilla: son KV extra con la lista de banderas del
mercado, que sirven de base para el HPH de Argentina y Brasil. Tienen KV, popup, story, GIF y MP4, pero no story en
video.

### Qué cambia por mercado

Cada mercado tiene su propia etiqueta de precio, moneda, badge y verbo (texto literal del kit):

| Mercado | Precio | Moneda | Badge | Verbo |
|---|---|---|---|---|
| Chile nacional | DESDE (+ «Por tramo.») | `$ 000.000` | CON 00% DCTO. | VUELA A |
| Chile internacional | IDA Y VUELTA DESDE | `$ 000.000` | CON 00% DCTO. | VUELA A |
| Perú | DESDE / IDA Y VUELTA DESDE | `US$000 o S/ 0,000` | CON 00% DTO. | VUELA A |
| Argentina y Uruguay | IDA Y VUELTA DESDE | `USD 000` | CON 00% OFF | VOLÁ |
| Brasil | A PARTIR DE | `R$ 0.000` | COM ATÉ 00% OFF | VOE A |
| Estados Unidos | ROUND TRIP FROM | `USD 000` | WITH UP TO 00% OFF | FLY |

Los ceros (`000.000`, `00%`) son **marcadores**: el precio y el descuento reales llegan con la grilla de precios y se
ponen antes de pautar. Perú además lleva tipo de cambio («TC: 3.40») y stock mínimo.

La fecha del logo BLACK cambió a pedido de SKY: ahora dice «DEL 25 DE NOVIEMBRE AL 2 DE DICIEMBRE» (en portugués «DE 25
DE NOVEMBRO A 2 DE DEZEMBRO» y en inglés «FROM NOVEMBER 25 TO DECEMBER 2»), más grande, con menos resplandor y con
la línea del marco acortada lo necesario. El kit original decía «DEL 25 AL 29 DE NOVIEMBRE»; las piezas se rehicieron
con la fecha nueva.

> Detalle técnico: [canvas de SKY, segunda ronda](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md#segunda-ronda-de-daniela-2026-11-04-chat-de-teams)

### Banderas y alianzas

- **Banderas:** círculo con borde blanco y el nombre del destino al lado. La lista de cada mercado sale de cinco
  referencias que mandó Daniela. Ojo con el kit: el archivo «BANDERA CL (CIRCULO)_1» muestra la bandera de
  **Argentina**, y «PUJ» es Punta Cana (República Dominicana).
- **Alianzas:** Chile Travel acompaña a Brasil «Voe a Santiago» (es la versión «fuera de Chile»); PromPerú «otros HM»
  acompaña a Brasil «Voe para Peru»; PromPerú «solo HM Perú» va en las rutas foco. El logo de alianza va arriba a la
  derecha en KV y popup, y en la story va debajo del avión para no montarse con él.

## Cómo es un GIF

El GIF muestra el KV completo y anima sólo las partes que llevan el mensaje. Se copió el movimiento de las seis
referencias de animación que trae el kit (piezas de campañas anteriores).

| Momento | Qué pasa |
|---|---|
| 0 a 1,4 s | El badge aparece creciendo, el bloque de destino sube con un fundido, la flecha con el precio entra desde la izquierda y, si el KV tiene lista, la lista sube |
| 1,4 a 3,96 s | Todo queda quieto: la pieza se lee completa |
| Al final | No hay salida: el bucle vuelve a empezar desde cero |

| Dato | Valor |
|---|---|
| Tamaño | 1080×1350 |
| Velocidad | 25 cuadros por segundo, 99 cuadros |
| Duración | 3,96 s por vuelta, en bucle infinito |
| Sonido | Ninguno (un GIF no lleva sonido) |
| Lo que **no** se mueve | La foto, el logo y el pie con el legal |

**La variante con audio** es el MP4 `_audio`: la misma animación con la pista «AUDIO FINAL PARA LOS GIF» del kit. Su
golpe cae en 1,37 s, justo cuando el precio queda fijo. La pista venía demasiado alta y se bajó de volumen para que no
sature.

> Detalle técnico: [scripts del despliegue BLACK](../../../.claude/skills/efeonce-creative-workbench/references/sky-black-pipeline.md)

## Cómo es el story en video

Un video vertical 1080×1920 de **15,7 s** en cinco partes, con la estructura que definió Daniela. Entre parte y parte
hay un fundido de 0,3 s.

| # | Parte | Duración | Qué se ve |
|---|---|---|---|
| 1 | Intro | 2,8 s | La foto con un acercamiento y el logo BLACK |
| 2 | Precios | 4,8 s | La story estática con destino, precio y badge |
| 3 | Brandlift | 3,3 s | Tarjeta blanca con una frase y una píldora |
| 4 | Completa tu viaje | 3,3 s | El gráfico «Completa tu viaje» del kit sobre el video del avión |
| 5 | Tapa de cierre | 2,7 s | La tapa de cierre de SKY con su propio sonido |

- **Música:** la pista «SONIC BRAND» del kit, más baja, que se apaga entre 12,4 y 13,3 s para no chocar con el sonido
  de la tapa, que entra en el segundo 13.
- **Tapa en español:** el kit no trae tapa vertical en español (sí en portugués e inglés). Se usó el centro de la
  horizontal sobre fondo blanco; está por confirmar.
- **Frases:** la frase de los vuelos nacionales sale de una referencia del kit; las de internacional y sus versiones
  para Argentina, Brasil y Estados Unidos son propuestas de Efeonce, por confirmar.

> Detalle técnico: [scripts del despliegue BLACK](../../../.claude/skills/efeonce-creative-workbench/references/sky-black-pipeline.md)

## Qué trae el kit del cliente

El kit «Despliegue Base» de BLACK está en OneDrive («Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue
Base»). Se lee y nunca se modifica.

| Carpeta del kit | Qué trae | Se usa para |
|---|---|---|
| `KV X HM` | Los 12 KV por mercado y los logos BLACK | KV, popup, story, GIF, PMAX |
| `KV BLACK.ai` | El archivo de Illustrator con todas las mesas | Consulta |
| `GRAFICOS/BANDERAS` | Banderas rectangulares y en círculo, y la lista de regiones de Chile | Listas de destinos |
| `GRAFICOS/` (otros) | Badges de descuento, «Completa tu viaje», logos de puntualidad y URL | Badges, story en video, HPH |
| `ALIANZAS` | PromPerú (dos versiones) y Sernatur (Chile es Tuyo / Chile Travel) | Logos de alianza |
| `FORMATO GIF` | 6 referencias de animación y el audio para los GIF | Movimiento y MP4 con audio |
| `FORMATO STORY` | Música, 5 stories de referencia, video del avión y tapas de cierre | Story en video |
| `FORMATO HPH` | Los 4 HPH genéricos | HPH |
| `FORMATO PMAX PRECIO+DCTO` | 4 PMAX editables | PMAX de Chile |
| `FORMATOS BANNER TIKTOK` | 3 banners editables | TikTok de Chile |
| `FORMATO DAT` | DAT nacional e internacional editables | DAT de Chile |

## Dónde está la entrega

Todo lo de BLACK está en OneDrive, en una carpeta nueva junto al kit: **«ENTREGABLES BLACK (Efeonce 2026-11-05)»**,
dentro de «Despliegue Base». Son 321 archivos y 626 MB.

| Carpeta | Qué trae | Archivos |
|---|---|---|
| `GIF Y VIDEO KV` | 24 GIF + 24 MP4 + 24 MP4 con audio | 72 |
| `KV ESTATICOS` | 24 KV de mercado + 13 KV de rutas | 37 |
| `POPUP Y STORY` | 24 popup + 24 story | 48 |
| `RUTAS FOCO PERU` | 13 popup + 13 story | 26 |
| `CHILE KV LISTO` | TikTok ×3, DAT ×2, PMAX ×4, en 1x y 2x | 18 |
| `STORY VIDEO 5 SLIDES` | 12 stories en video | 12 |
| `PMAX` | 12 KV × 4 tamaños + el 1200×628 en 2x | 60 |
| `HPH` | Genérico de Chile + 5 mercados, 4 tamaños, en 1x y 2x | 48 |
| `LOGO BLACK` (agregada 2026-11-05) | Logo BLACK con la fecha nueva en español, portugués e inglés: PNG transparente de 4000 y 2000 px de ancho, más el SVG corregido | 9 |

CyberSky Perú se entregó aparte, como un PDF de 66 páginas (22 destinos × popup, post y story).

> Detalle técnico: [manual, entregar en OneDrive](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md#10-entregar-en-onedrive)

### Carpeta ordenada para el equipo: «BLACK SKY 2026»

Daniela pidió un orden fijo en `SKY Campañas/2026/10_Noviembre/BLACK SKY 2026/`. Ahí quedaron 155 archivos:

- **Una carpeta por mercado:** `HM CL`, `HM PE`, `HM AR`, `HM UY`, `HM BR` y `HM USA`.
- **Dentro, una carpeta por formato:** `HPH`, `PMAX` y `GIF + POPUP`. Chile suma `BANNER TIKTOK` y `DAT`, y
  Perú suma `RUTAS FOCO`.
- **En `GIF + POPUP`, una carpeta por pieza confirmada**, por ejemplo «VUELA POR CHILE». Cada una trae el
  popup, la story, el GIF y la story en video.
- **PMAX:** si un mercado tiene más de una agrupación, cada una va en su carpeta («PMAX DOM», «PMAX INTER»…)
  con sus 4 tamaños.
- **Nombres:** `BS_` + formato o medida + pieza. Por ejemplo `BS_POPUP_DOM`, `BS_GIF_INTER`,
  `BS_1200X628_INTER` o `BS_POPUP_PIU`: los destinos y las rutas foco llevan su código de aeropuerto.

### Rutas foco con la foto de cada destino

Las rutas de Perú ya no usan la foto de la mujer del kit. Cada una lleva la foto aprobada de su destino y el
legal, la ubicación y el crédito que indica el CSV de Daniela. Son 15 rutas: se sumaron Ayacucho y Talara.
Los créditos van en pequeño, en vertical sobre el borde derecho. Para que el logo se lea, cada foto se
encuadra con el lugar a la derecha y, cuando hace falta, se baja y se completa arriba con el cielo de la misma
foto: el logo queda sobre cielo limpio, como en el KV original, sin sombras detrás. Chiclayo y Talara todavía no tienen foto
aprobada. «Vuela por el Perú» lleva la foto de Cajamarca y el logo de PromPerú. «Volá a Santiago» y «Volá a
Lima» (Argentina) llevan una foto de cada ciudad.

> Detalle técnico: [taxonomía, §5.4](../../../.claude/skills/efeonce-creative-workbench/references/sky-format-catalog.md) ·
> [scripts, §4.4](../../../.claude/skills/efeonce-creative-workbench/references/sky-black-pipeline.md)

## El canvas de Claude Design

El canvas «SKY CyberSky Perú — Adaptaciones» es la mesa de revisión: ahí se ven todas las piezas juntas y se comentan.
Es un artifact **privado** del operador (<https://claude.ai/artifact/QTy12G38oQYB1xrnZmkpee>); se comparte desde
«Compartir» y quien lo recibe puede comentar. No es la producción final: lo que se entrega se renderiza aparte.

Al cierre (versión 28) tiene 10 páginas:

| # | Página | Qué hay |
|---|---|---|
| 1 | Internacionales | CyberSky Perú: 6 destinos internacionales en popup, post y story |
| 2 | Nacionales | CyberSky Perú: 16 destinos nacionales en popup, post y story |
| 3 | Plantillas | Plantillas de popup, post y story, lockup CyberSky y pie SKY |
| 4 | KV Black · HM | Los 12 KV del kit como imagen fija |
| 5 | KV Black · Animación GIF | Los 12 KV animados, las 6 referencias del kit y una previa con audio |
| 6 | KV Black · Popup y Story | 12 popup y 12 story |
| 7 | KV Black · PMAX y HPH | PMAX de los 12 KV y HPH genérico y por mercado |
| 8 | KV Black · Grilla por mercado | Los 12 mensajes con KV, popup, GIF, story y story en video, más los KV con banderas de AR y BR |
| 9 | KV Black · Rutas foco Perú | 13 rutas con popup y story |
| 10 | KV Black · Chile KV listo | Banner TikTok, DAT y PMAX de Chile |

Las animaciones se ven como videos, porque el canvas muestra los artboards como imágenes quietas. Si a poca distancia
algunas piezas aparecen rayadas, es que todavía no cargaron; no es un error.

> Detalle técnico: [canvas de SKY en Claude Design](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md)

## Qué queda por confirmar con Daniela

Nuevos (2026-11-05): fotos de Chiclayo y Talara; en Pucallpa y Trujillo la ubicación del CSV no coincide con
la foto entregada; si el origen de las rutas es Lima («DESDE LIMA» se dedujo del legal); y si «Encuentra
destinos» de Chile debe hacerse con el clúster internacional de Perú, como dice la confirmación de Adri.

| Tema | Qué hay hoy | Qué falta |
|---|---|---|
| Brasil «Voe para Peru» | KV con PromPerú «otros HM» | Confirmar si va como pieza de alianza o como KV |
| Perú «Vuela por Perú» | Regiones en dos columnas, sin fotos | Aprobar la propuesta |
| Chile «Encuentra destinos» | Hecho desde el clúster internacional de Chile | Su nota decía «cluster inter de Perú»: confirmar la base |
| Frases del story en video | Nacional desde la referencia; internacional y traducciones propias | Aprobar frases y traducciones |
| Textos del HPH | Flecha y botón traducidos por Efeonce | Aprobar traducciones |
| Rutas foco Perú | `[Ubicación de la foto]` como marcador | Ubicación real de cada foto |
| Tapa vertical en español | Recortada de la horizontal | Tapa vertical oficial |
| Precios y descuentos | Marcadores `000.000` y `00%` | La grilla de precios |

Además siguen abiertas las inconsistencias del kit que SKY debe corregir en su fuente (nombres de archivos cambiados,
legales trazados, logos de alianza y URL ausentes, derechos de imágenes con marcas de IA). Están listadas en la
[doc de adaptaciones](./adaptaciones-sky-en-claude-design.md#el-kit-despliegue-base).

> Detalle técnico: [canvas de SKY, segunda ronda](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md#segunda-ronda-de-daniela-2026-11-04-chat-de-teams)
