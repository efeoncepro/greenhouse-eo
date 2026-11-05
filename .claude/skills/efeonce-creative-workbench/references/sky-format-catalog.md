# SKY Performance: catálogo de formatos y taxonomía (campaña BLACK y CyberSky Perú)

Estado al 2026-11-05. Este documento es el **qué**: cada formato que se produjo para SKY Airline (servicio
Performance) en la sesión de Claude Design del 2026-11-04/05, con su tamaño, nombre, origen en el kit,
zonas, reglas, variantes, carpetas, cantidades y pesos medidos. El **cómo** (scripts, parámetros de render,
ffmpeg, logofix, capas) está en [sky-black-pipeline.md](sky-black-pipeline.md). El flujo del canvas, la
lectura del kit y las correcciones de render están en [sky-design-canvas.md](sky-design-canvas.md); este
catálogo no los repite, los enlaza.

Frontera: todo lo de aquí son **adaptaciones para revisión**, hechas fuera de una corrida gobernada de
Creative Workbench, sin aprobación del cliente registrada. Precios, descuentos, orígenes y fechas de vuelo
siguen como placeholder (`000.000`, `00%`, `[ORIGEN]`, `[día]`). Nada se publicó fuera de los artifacts
privados del operador ni se modificó en el kit de OneDrive.

Marcas de evidencia: lo que no lleva marca está verificado (archivo medido, script leído o render mirado).
**Inferido** = deducción razonable sin confirmación. **No verificado** = no hay fuente en la sesión.

## 1. Taxonomía de nombres

### 1.1 Siglas

| Sigla | Significado | Evidencia |
| --- | --- | --- |
| HM | *Home market*: mercado de origen de la pauta (CL, PE, AR, UY, BR, US) | Usado así en la sesión; el kit no lo define. **Inferido**, sin confirmar con SKY |
| KV | Key Visual: pieza madre 1080×1350 de cada mercado | Verificado (kit `KV X HM/`) |
| DOM | Doméstico / nacional | Verificado: los títulos del canvas dicen «Perú · Nacional», «Chile · Nacional» |
| INTER | Internacional | Verificado (idem) |
| RUTA (`-RUTA`) | KV con ruta concreta: el legal nombra el tramo («Final tramo [destino]-[origen]», «Final ruta [origen]-[destino]-[retorno]») | Verificado en el render; canvas: «Perú · Nacional con ruta» |
| CLUSTER (`_CLUSTER`) | KV con lista de destinos agrupados (regiones en DOM, banderas en INTER) | Verificado |
| PMAX | Google Performance Max (paquete 1080×1080, 1080×1350, 1080×1920, 1200×628) | Interpretación estándar usada en la sesión. **Inferido**, SKY no lo define |
| HPH | Familia de banners 1200×1200, 300×600, 300×250, 728×90 | **No verificado**: el kit sólo trae `FORMATO HPH/` sin explicar la sigla |
| DAT | Formato 1080×1080 (DOM e INTER) | **No verificado**. La nota del canvas lo rotula «DAT (portadas del buscador)»: es una interpretación de la sesión, no del cliente |
| Popup | Pieza cuadrada 1080×1080 | Nombre usado por Daniela; el destino de pauta (pop-up web, feed) **no verificado** |
| Story | Vertical 1080×1920 (estática o video) | Verificado |
| GIF | KV animado en bucle 1080×1350 | Verificado |
| DCTO / DTO | Descuento (DTO es la forma de Perú) | Verificado (`DCTO_CL.svg`, `DTO_PERU.svg`, badges) |
| TC | Tipo de cambio («TC: 3.40» en Perú) | **Inferido** por contexto |
| TyC | Términos y condiciones (legal corto de HPH: «Aplican TyC en …») | Verificado |
| PUJ | Punta Cana (código IATA), bandera de República Dominicana | Verificado en el kit (`BANDERA PUJ (CIRCULO).svg`) |
| CTV | «Completa tu viaje» (gráfico del kit) | Abreviatura interna de los scripts |

### 1.2 Mercados

| Código | País | Idioma de las piezas | Verbo de destino (copy del cliente) | Moneda (placeholder) |
| --- | --- | --- | --- | --- |
| CL | Chile | Español (tuteo) | «VUELA A» / «VUELA» / «VUELA POR» | `$ 000.000` |
| PE | Perú | Español (tuteo) | «VUELA A» / «VUELA POR» | `US$000 o S/ 0,000` |
| AR | Argentina | Español rioplatense del cliente | «VOLÁ» / «VOLÁ A» | `USD 000` |
| UY | Uruguay | Español rioplatense del cliente | «VOLÁ» | `USD 000` |
| BR | Brasil | Portugués | «VOE A» / «VOE PARA» | `R$ 0.000` |
| US | Estados Unidos | Inglés | «FLY» | `USD 000` |

«VOLÁ» se cita como copy literal del cliente; no es el registro de este documento.

### 1.3 Patrón del KV: `HM_<MERCADO>_KV[_<TIPO>]`

| Nombre | Origen | Mensaje | Regla de nombre |
| --- | --- | --- | --- |
| `HM_AR_KV`, `HM_UY_KV`, `HM_BR_KV`, `HM_US_KV` | Kit | Internacional (único mensaje del mercado) | Sin tipo: el mercado sólo vende internacional |
| `HM_CL_KV_DOM`, `HM_CL_KV_INTER` | Kit | Nacional / internacional | `_DOM`, `_INTER` |
| `HM_PE_KV_DOM`, `HM_PE_KV_INTER` | Kit | Nacional / internacional | Idem |
| `HM_PE_KV_DOM-RUTA`, `HM_PE_KV_INTER-RUTA` | Kit | Con ruta | **Guion** antes de `RUTA` (nombre del cliente) |
| `HM_CL_KV_DOM_CLUSTER`, `HM_CL_KV_INTER_CLUSTER` | Kit (llegaron después) | Lista de regiones / banderas | **Guion bajo** antes de `CLUSTER` |
| `HM_CL_KV_ENCUENTRA`, `HM_PE_KV_ENCUENTRA` | Efeonce | «ENCUENTRA Destinos» | `_ENCUENTRA` |
| `HM_PE_KV_DOM_REGIONES` | Efeonce | «VUELA POR Perú» con rutas foco en 2 columnas | `_DOM_REGIONES` |
| `HM_PE_KV_INTER_BANDERAS`, `HM_AR_KV_BANDERAS`, `HM_BR_KV_BANDERAS`, `HM_US_KV_BANDERAS`, `HM_UY_KV_BANDERAS` | Efeonce | Internacional con lista o fila de banderas | `_BANDERAS` (PE agrega `_INTER`) |
| `HM_AR_KV_SANTIAGO`, `HM_AR_KV_LIMA`, `HM_BR_KV_SANTIAGO`, `HM_BR_KV_PERU` | Efeonce | Destino nombrado | `_<DESTINO>` en mayúsculas sin tildes |

Total: **24 KV** = 12 del kit + 12 creados por Efeonce (10 de la grilla de Daniela + `HM_AR_KV_BANDERAS` y
`HM_BR_KV_BANDERAS`, que el canvas muestra como «Extra» y sirven de referencia para los HPH por mercado).

### 1.4 Rutas de Perú: `HM_PE_RUTA_<CIUDAD>`

13 KV con el destino en el título: `HM_PE_RUTA_TUMBES`, `JAUJA`, `CUSCO`, `TACNA`, `PUCALLPA`, `CHICLAYO`,
`PIURA`, `TRUJILLO`, `IQUITOS`, `CAJAMARCA`, `AREQUIPA`, `TARAPOTO`, `JULIACA`. No llevan `KV` en el nombre.
`<CIUDAD>` en mayúsculas, sin tildes (normalización NFD). Pucallpa venía repetida en el pedido: va una vez.

### 1.5 Sufijos de salida

| Sufijo | Pieza | Ejemplo |
| --- | --- | --- |
| *(ninguno)* `.png` | KV fijo 1080×1350 | `HM_CL_KV_DOM.png` |
| *(ninguno)* `.gif` / `.mp4` | KV animado en bucle, sin sonido | `HM_CL_KV_DOM.gif`, `HM_CL_KV_DOM.mp4` |
| `_audio.mp4` | KV animado con «AUDIO FINAL PARA LOS GIF» | `HM_CL_KV_DOM_audio.mp4` |
| `__popup.png` | Popup 1080×1080 | `HM_BR_KV_PERU__popup.png` |
| `__story.png` | Story estática 1080×1920 | `HM_PE_RUTA_CUSCO__story.png` |
| `__story-video.mp4` | Story en video de 5 slides | `HM_US_KV_BANDERAS__story-video.mp4` |
| `__pmax-<W>x<H>.png` | PMAX por formato | `HM_UY_KV__pmax-1200x628.png` |
| `__hph-<W>x<H>.png` | HPH por mercado | `HM_BR_KV__hph-728x90.png` |
| `_2x` | Misma pieza al doble de resolución | `HM_BR_KV__hph-728x90_2x.png` (1456×180) |

- Doble guion bajo `__` separa el KV del formato; guion bajo simple `_` cuelga variantes de entrega
  (`_audio`, `_2x`). Los scripts escriben `@2x`; en la entrega y el canvas se usa `_2x` porque un archivo
  con «@» no carga en un artboard de Claude Design.
- **Chile «KV listo»** usa prefijo `CL_` y conserva el nombre del editable del kit, con `+` cambiado a `-`
  y sin el prefijo `KV BLACK-45-`: `CL_BANNER-TIKTOK_PRECIO-DCTO_1920x1080.png`, `CL_DAT_DOM.png`,
  `CL_PMAX_1200x628_2x.png`.
- **HPH genérico** conserva el nombre del kit: `HPH_<W>x<H>_GENERICO.png` y `…_GENERICO_2x.png`.
- Un HPH por mercado se nombra con el KV del mercado (`HM_PE_KV_INTER__hph-…`) aunque **no** se compone
  desde ese KV: parte del SVG genérico de referencia y no lleva precio (ver 3.8).
- En el canvas las imágenes se publican como JPG (`kv/<KV>.jpg`, `formatos/<KV>__popup.jpg`,
  `banners/…`, `chile/…`); los entregables son PNG.
- Archivos internos, no se entregan: partes `<KV>__<logo|destino|precio|badge|pie|lista|alianza|base>.png`
  y capas de animación `layers/<KV>__<capa>.png` (detalle en el pipeline).

## 2. Matriz mercado × mensaje (24 KV)

Copy leído en el render de cada KV. Antetítulo y título del bloque de destino; etiqueta del precio; badge.
Columnas de piezas: **B** = KV fijo + popup + story estática + GIF + MP4 + MP4 con audio (las 6 básicas);
**PMAX** = 4 formatos + `1200x628_2x`; **HPH** = 4 tamaños × 1x/2x; **SV** = story en video.

| KV | Origen | Destino (antetítulo / título) | Precio | Badge | Lista / alianza | B | PMAX | HPH | SV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `HM_CL_KV_DOM` | Kit | VUELA A / Calama | DESDE · «Por tramo.» | CON 00% DCTO. | — | ✓ | ✓ | — | — |
| `HM_CL_KV_INTER` | Kit | VUELA A / Calama | IDA Y VUELTA DESDE | CON 00% DCTO. | — | ✓ | ✓ | — | — |
| `HM_CL_KV_DOM_CLUSTER` | Kit | VUELA POR / Chile | DESDE · «Por tramo.» | CON 00% DCTO. | 15 regiones con foto (Norte 6 · Sur 9) | ✓ | ✓ | — | ✓ |
| `HM_CL_KV_INTER_CLUSTER` | Kit | VUELA / Internacional | IDA Y VUELTA DESDE | CON 00% DCTO. | 6 filas con bandera (BR, PE, AR, DO, US, UY) | ✓ | ✓ | (genérico) | ✓ |
| `HM_CL_KV_ENCUENTRA` | Efeonce | ENCUENTRA / Destinos | IDA Y VUELTA DESDE | CON 00% DCTO. | Igual al clúster internacional | ✓ | — | — | ✓ |
| `HM_PE_KV_DOM` | Kit | VUELA A / Calama | DESDE · «Precio final con tasas incluidas.» | CON 00% DTO. | — | ✓ | ✓ | — | — |
| `HM_PE_KV_DOM-RUTA` | Kit | VUELA A / Calama | DESDE · «Final tramo [destino]-[origen].» | CON 00% DTO. | — | ✓ | ✓ | — | — |
| `HM_PE_KV_INTER` | Kit | VUELA A / Calama | IDA Y VUELTA DESDE | CON 00% DTO. | — | ✓ | ✓ | ✓ | — |
| `HM_PE_KV_INTER-RUTA` | Kit | VUELA A / Calama | IDA Y VUELTA DESDE · «Final ruta [origen]-[destino]-[retorno].» | CON 00% DTO. | — | ✓ | ✓ | — | — |
| `HM_PE_KV_DOM_REGIONES` | Efeonce | VUELA POR / Perú | DESDE | CON 00% DTO. | 13 rutas foco: NORTE 7 · CENTRO Y SUR 6, pines verdes, sin fotos | ✓ | — | — | ✓ |
| `HM_PE_KV_INTER_BANDERAS` | Efeonce | VUELA A / Calama (como la referencia) | IDA Y VUELTA DESDE | CON 00% DTO. | Punta Cana · Santiago y conexión con 15 destinos · Buenos Aires · Río de Janeiro y São Paulo · Miami | ✓ | — | — | ✓ |
| `HM_PE_KV_ENCUENTRA` | Efeonce | ENCUENTRA / Destinos | IDA Y VUELTA DESDE | CON 00% DTO. | Igual a `HM_PE_KV_INTER_BANDERAS` | ✓ | — | — | ✓ |
| `HM_AR_KV` | Kit | VOLÁ / Internacional | IDA Y VUELTA DESDE | CON 00% OFF | — | ✓ | ✓ | ✓ | — |
| `HM_AR_KV_SANTIAGO` | Efeonce | VOLÁ A / Santiago | IDA Y VUELTA DESDE | CON 00% OFF | — | ✓ | — | — | ✓ |
| `HM_AR_KV_LIMA` | Efeonce | VOLÁ A / Lima | IDA Y VUELTA DESDE | CON 00% OFF | — | ✓ | — | — | ✓ |
| `HM_AR_KV_BANDERAS` | Efeonce (extra) | VOLÁ / Internacional | IDA Y VUELTA DESDE | CON 00% OFF | Perú y conexión con 16 destinos · Santiago y conexión con 15 destinos · Miami · Río de Janeiro, São Paulo y Florianópolis | ✓ | — | — | — |
| `HM_UY_KV` | Kit | VOLÁ / Internacional | IDA Y VUELTA DESDE | CON 00% OFF | — | ✓ | ✓ | ✓ | — |
| `HM_UY_KV_BANDERAS` | Efeonce | VOLÁ / Internacional | IDA Y VUELTA DESDE | CON 00% OFF | Fila de 4 banderas (DO, CL, BR, US) en lugar de la píldora de origen | ✓ | — | — | ✓ |
| `HM_BR_KV` | Kit | VOE A / Internacional | A PARTIR DE | COM ATÉ 00% OFF | — | ✓ | ✓ | ✓ | — |
| `HM_BR_KV_SANTIAGO` | Efeonce | VOE A / Santiago | A PARTIR DE | COM ATÉ 00% OFF | Chile Travel arriba a la derecha | ✓ | — | — | ✓ |
| `HM_BR_KV_PERU` | Efeonce | VOE PARA / Peru | A PARTIR DE | COM ATÉ 00% OFF | PromPerú «otros HM» arriba a la derecha | ✓ | — | — | ✓ |
| `HM_BR_KV_BANDERAS` | Efeonce (extra) | VOE A / Internacional | A PARTIR DE | COM ATÉ 00% OFF | Santiago e conexões para 15 destinos · Lima e conexões para 16 destinos · Argentina · Miami · Uruguai | ✓ | — | — | — |
| `HM_US_KV` | Kit | FLY / International | ROUND TRIP FROM | WITH UP TO 00% OFF | — | ✓ | ✓ | ✓ | — |
| `HM_US_KV_BANDERAS` | Efeonce | FLY / International | ROUND TRIP FROM | WITH UP TO 00% OFF | Santiago and connect to 15 destinations · Lima and connect to 16 destinations | ✓ | — | — | ✓ |

**Grilla de Daniela** (12 mensajes, página «KV Black · Grilla por mercado»): CL Vuela por Chile
(`DOM_CLUSTER`), Vuela internacional (`INTER_CLUSTER`), Encuentra destinos · PE Vuela por Perú
(`DOM_REGIONES`), Vuela internacional (`INTER_BANDERAS`), Encuentra destinos · AR Santiago, Lima · UY
banderas · BR Santiago, Peru · US banderas. Esos 12 son exactamente los 12 con story en video.

**Rutas de Perú** (13): KV + popup + story; sin GIF, PMAX, HPH ni story en video. Todas parten de
`HM_PE_KV_DOM-RUTA`: título = ciudad, PromPerú «solo HM Perú» arriba a la derecha y texto
`[Ubicación de la foto]` con pin verde (placeholder).

**Copy común del logo:** antetítulo «VOLAR BIEN CUESTA MENOS» (ES), «VOAR BEM CUSTA MENOS» (PT), «FLYING
WELL COSTS LESS» (EN). Pie: medalla de puntualidad + «#1 EN PUNTUALIDAD REGIONAL» (y su versión por idioma)
+ legal. Píldora de origen: «DESDE [ORIGEN]», «DE [ORIGEN]» (BR), «FROM [ORIGEN]» (US).

## 3. Fichas por formato

Carpetas: **local** = `ai-generations/2026-11-04_sky-black-gif/` en el checkout de Greenhouse (fuera de
Git); **OneDrive** = `Despliegue Base/ENTREGABLES BLACK (Efeonce 2026-11-05)/`. Pesos en MB decimales,
medidos sobre los archivos entregados.

### 3.1 KV HM 1080×1350

| Campo | Valor |
| --- | --- |
| Tamaño | 1080×1350 PNG |
| Origen en el kit | `KV X HM/HM_*.svg` (12, viewBox 0 0 1080 1350); los nuevos se derivan de esos SVG con el logo corregido |
| Zonas (lienzo 1080×1350) | Logo `[40,0,720,330]` · lista `[40,320,720,890]` en los KV nuevos (`[40,290,560,870]` clúster DOM, `[40,340,560,1080]` clúster INTER, que arrastra el destino) · destino `[40,920,530,1180]` · precio `[400,870,1055,1230]` · badge `[785,755,1020,995]` · pie `[20,1232,1070,1350]` · alianza `[740,0,1080,330]` |
| Reglas | Tipografía única Metric; foto = fuente embebida 1672×941 espejada a escala 1,81; el logo lleva la fecha nueva (ver 4.1); los parches de render no tocan el SVG original ([sky-design-canvas.md](sky-design-canvas.md)) |
| Variantes | 24 KV de mercado + 13 rutas |
| Nombre | `HM_<MERCADO>_KV[_<TIPO>].png`, `HM_PE_RUTA_<CIUDAD>.png` |
| Local / OneDrive | `kv/` → `KV ESTATICOS/` |
| Cantidad | 37 |
| Peso | 0,86–1,19 MB (24 KV); 1,17 MB (rutas) |

### 3.2 Popup 1080×1080 (BLACK)

| Campo | Valor |
| --- | --- |
| Tamaño | 1080×1080 PNG |
| Origen en el kit | No hay plantilla de popup en el kit: se recompone desde las partes del KV y la foto fuente |
| Elementos | Foto re-encuadrada al 80 % del KV (escala 1,45, cabeza en y≈260) · logo al 100 % arriba a la izquierda · destino, precio y badge al 88 % con el precio terminando en y=938 · pie en y≈972 · degradado inferior marrón `#2a1608` (0 → 0,78 entre y 800 y 1080) |
| Reglas por tipo | Clúster DOM: lista reordenada en 3 columnas (Norte 6 · Sur 6 · Sur 3) al 90 %. Clúster INTER y Encuentra Chile: lista al 84 % con oscurecido izquierdo. KV con banderas o regiones: lista escalada para caber entre y 336 y 664. Alianza: escala 1, misma posición del KV |
| Variantes | 24 KV + 13 rutas |
| Nombre | `<KV>__popup.png` |
| Local / OneDrive | `estaticos/` → `POPUP Y STORY/`; rutas: `rutas-peru/` → `RUTAS FOCO PERU/` |
| Cantidad | 24 + 13 |
| Peso | 1,67–1,74 MB; rutas 1,69–1,70 MB |

### 3.3 Story estática 1080×1920

| Campo | Valor |
| --- | --- |
| Tamaño | 1080×1920 PNG |
| Origen en el kit | Sin plantilla estática en el kit; se recompone desde las partes |
| Elementos | Foto al 113 % del KV (escala 2,04, cubre 1920 sin inventar cielo) · zonas seguras ~270 px arriba y abajo · logo al 130 % anclado en y=270 · lista, destino, precio, badge y pie +350 px (pie termina ~1655) · degradado inferior 0 → 0,82 entre y 1360 y 1660 |
| Reglas por tipo | Clúster DOM: bloque y pie +80 px más (pie ~1735), lista al 115 % centrada entre logo y destino. Alianza: escala 1,1, borde derecho en x=1032, tope en y=500 (bajo el avión, que con el logo al 130 % llega a x≈925) |
| Variantes | 24 KV + 13 rutas |
| Nombre | `<KV>__story.png` |
| Local / OneDrive | `estaticos/` → `POPUP Y STORY/`; rutas: `rutas-peru/` → `RUTAS FOCO PERU/` |
| Cantidad | 24 + 13 |
| Peso | 2,32–2,58 MB; rutas 2,34–2,35 MB |

### 3.4 GIF en bucle 1080×1350

| Campo | Valor |
| --- | --- |
| Tamaño | 1080×1350, **25 fps, 99 cuadros, 3,96 s**, bucle infinito (`-loop 0`), sin sonido |
| Color | Paleta propia por archivo (256 colores, estadística de toda la secuencia), tramado `sierra2_4a` |
| Origen en el kit | Movimiento tomado de `FORMATO GIF/REFERENCIA ANIMACION/` (6 MP4 1080×1350, 60 fps, 3,92–3,97 s) |
| Qué se mueve | Base fija (foto, logo, pie y alianza) + 4 capas animadas: destino sube 100 px con fundido, flecha de precio entra desde −230 px por la izquierda, badge escala 0,6 → 1, lista sube 150 px. Todo queda quieto desde ~1,4 s hasta el final; no hay salida, el bucle corta. Tiempos exactos en [sky-design-canvas.md](sky-design-canvas.md#animación-gif-y-mp4) |
| Variantes | 24 KV (no hay GIF de rutas) |
| Nombre | `<KV>.gif` |
| Local / OneDrive | Raíz local → `GIF Y VIDEO KV/` |
| Cantidad | 24 |
| Peso | KV estándar 3,78–4,05 MB (14 archivos); con lista o banderas 4,07–7,69 MB (10). El más pesado es `HM_CL_KV_DOM_CLUSTER.gif` (7,69 MB, por las fotos circulares) |
| Pendiente | No se verificó contra el límite de peso de cada plataforma de pauta |

### 3.5 MP4 en bucle, sin y con audio

| Campo | Sin audio `<KV>.mp4` | Con audio `<KV>_audio.mp4` |
| --- | --- | --- |
| Video | H.264, 1080×1350, 25 fps, 99 cuadros, 3,96 s | H.264, 1080×1350, 25 fps, 98 cuadros, 3,936 s (se corta al largo del audio) |
| Audio | — | AAC, `AUDIO FINAL PARA LOS GIF.mp3` (3,944 s; golpe en 1,37 s = precio fijo), −3 dB con limitador |
| Cantidad | 24 | 24 |
| Peso | 0,45–0,50 MB estándar; hasta 0,70 MB con lista | 0,55–0,60 MB estándar; hasta 0,80 MB con lista |
| Carpeta | Raíz local → `GIF Y VIDEO KV/` | Idem |

En el canvas, el «GIF» se muestra como `<video>` MP4 en bucle (autoplay, muted) porque el canvas congela la
animación CSS.

### 3.6 Story en video, 5 slides

| Campo | Valor |
| --- | --- |
| Tamaño | H.264 1080×1920, **30 fps, 471 cuadros, 15,709 s**; AAC |
| Estructura (Daniela) | Ver tabla de slides. Fundido de 0,3 s entre slides |
| Audio | `SONIC BRAND-3-STORY_1.mp3` (15,272 s en el kit) a −3 dB bajo los slides 1–4, fundido entre 12,4 y 13,3 s; el audio propio de la tapa entra en 13,0 s. Medido: −12 LUFS, pico −0,5 dBFS |
| Variantes | Los 12 mensajes de la grilla (no hay de los KV originales ni de las rutas) |
| Nombre | `<KV>__story-video.mp4` |
| Local / OneDrive | `story-video/` → `STORY VIDEO 5 SLIDES/` |
| Cantidad | 12 |
| Peso | 7,32–7,72 MB |

| # | Slide | Duración | Contenido |
| --- | --- | --- | --- |
| 1 | Intro | 2,8 s | Foto del story con acercamiento lento; logo al 130 % entra con fundido y leve subida |
| 2 | Precios | 4,8 s | La story estática (3.3) con un alejamiento muy suave |
| 3 | Brandlift | 3,3 s | Foto más cerrada y tarjeta blanca (tope y=1180, radio 40) con frase morada `#671e75` y píldora lavanda |
| 4 | Completa tu viaje | 3,3 s | Gráfico `Completa-tu-viaje_<idioma>.svg` (ancho 940, tope y=1080) sobre `STORY AVION.mp4` |
| 5 | Tapa de cierre | 2,7 s | Tapa del kit por idioma, con su audio |

| Mensaje | Idioma (CTV + tapa) | Frase del brandlift / píldora | Estado de la frase |
| --- | --- | --- | --- |
| CL `DOM_CLUSTER`, PE `DOM_REGIONES` | ES · tapa ES | «Viaja con la aerolínea más puntual de la región» / «A DESTINOS NACIONALES» | De la referencia BLACK XL |
| CL `INTER_CLUSTER`, CL y PE `ENCUENTRA`, PE `INTER_BANDERAS` | ES · tapa ES | «Viaja a destinos internacionales» / «¡CON OFERTAS IMPERDIBLES!» | Propuesta propia, por confirmar |
| AR `SANTIAGO`, AR `LIMA`, UY `BANDERAS` | ES (CTV AR) · tapa ES | «Viajá a destinos internacionales» / «¡CON OFERTAS IMPERDIBLES!» (copy literal propuesto en registro del cliente) | Propuesta propia, por confirmar |
| BR `SANTIAGO`, BR `PERU` | PT · tapa PT vertical | «Viaje para destinos internacionais» / «COM OFERTAS IMPERDÍVEIS!» | Propuesta propia, por confirmar |
| US `BANDERAS` | EN · tapa EN vertical | «Fly to international destinations» / «WITH UNMISSABLE DEALS!» | Propuesta propia, por confirmar |

El kit no trae tapa vertical en español: se recorta el centro (1080×1080) de la horizontal y se monta sobre
blanco en 1080×1920. Pendiente de confirmar con Daniela.

### 3.7 PMAX (12 KV del kit)

| Campo | Valor |
| --- | --- |
| Tamaños | 1080×1080, 1080×1350, 1080×1920, 1200×628 (+ `1200x628_2x` = 2400×1256) |
| Origen | Los tres primeros son copia exacta del popup, del KV fijo y de la story (verificado byte a byte en 10 de los 12 KV; ver pendiente). Sólo el 1200×628 es nuevo: se compone desde las partes del KV y la foto fuente. **No** se usa el `FORMATO PMAX PRECIO+DCTO/` del kit, que sólo se usó para Chile «KV listo» (3.11) |
| 1200×628 | Mujer a la derecha (centro x=960; 980–1000 en clústeres) para que el badge no le tape la cara · logo 0,8 arriba a la izquierda · destino 0,8 · precio + badge 0,8 al centro · pie 0,8 abajo · degradado inferior desde y=400. Clúster DOM: logo 0,62, lista en 3 columnas a 0,56. Clúster INTER: logo 0,72, lista 0,47 |
| Variantes | Los 12 KV del kit; los KV nuevos y las rutas **no** tienen PMAX |
| Nombre | `<KV>__pmax-<W>x<H>.png`; sólo el 1200×628 tiene `_2x` |
| Local / OneDrive | `pmax/` → `PMAX/` |
| Cantidad | 60 (12 × 5) |
| Peso | 1080×1080 1,68–1,74 MB · 1080×1350 0,86–1,17 MB · 1080×1920 2,32–2,58 MB · 1200×628 1,07–1,16 MB · `_2x` 3,40–3,73 MB |
| **Corregido 2026-11-05** | `HM_PE_KV_DOM-RUTA` y `HM_PE_KV_INTER-RUTA` en 1080×1080, 1080×1350 y 1080×1920 (6 archivos) quedaron con la **fecha vieja** «DEL 25 AL 29 DE NOVIEMBRE» porque no se recopiaron tras el logofix. Se reemplazaron por su popup, KV y story vigentes en local y en OneDrive (`cmp` idéntico). Regla: los PMAX 1080 son copias exactas del popup, KV y story; tras rehacer una fuente, recopiarlos |

### 3.8 HPH (1200×1200, 300×600, 300×250, 728×90)

| Campo | Valor |
| --- | --- |
| Origen en el kit | `FORMATO HPH/HPH_<W>x<H>_GENERICO.svg` (4 SVG: Chile internacional con banderas, flecha «CON GRANDES DESCUENTOS», sin precio, botón «Ver vuelos» en Source Sans 3). Nota: `sky-design-canvas.md` cita esta carpeta como `KV X HM/HPH/`; la ruta medida del kit es `FORMATO HPH/` |
| Genérico Chile | Render del SVG tal cual con Metric y Source Sans 3; en el 728×90 las 6 banderas venían en blanco y se reponen desde el 1200×1200. Lista: BR, PE, AR, DO, US, UY |
| Por mercado (PE, AR, UY, BR, US) | Genérico y sin precio (decisión del operador). Se cambia la lista de Chile por la del mercado (mismos destinos que los KV con banderas), se traduce el verbo, la flecha y el botón, y se cambia la URL del legal corto. BR y US además cambian logo y sello de puntualidad por los del KV del mercado |
| Lista | 1200×1200, 300×600 y 300×250: dentro de la caja de la lista de Chile, paso = alto / 6, bandera 0,73 del paso, texto 0,36 (Metric Medium blanca), centrada si hay menos filas. 728×90 y Uruguay: fila de banderas sin texto |
| Textos por mercado | AR/UY «VOLÁ» · BR «VOE A», «COM GRANDES / DESCONTOS», «Ver voos» · US «FLY», «International», «WITH BIG / DISCOUNTS», «See flights» (traducciones de flecha y botón propias, sin confirmar) |
| Legal corto (URL) | PE `www.skyairline.com/es/peru/…` · AR `skyairline.com/es/argentina/…` (sin «www», como el kit) · UY `www.skyairline.com/es/otros/…` · BR «Veja T&C em www.skyairline.com/pt/brasil/…» · US «T&Cs at skyairline.com/en/unitedstates/…» |
| Nombre | `HPH_<W>x<H>_GENERICO[_2x].png`; `<KV del mercado>__hph-<W>x<H>[_2x].png` con `HM_PE_KV_INTER`, `HM_AR_KV`, `HM_UY_KV`, `HM_BR_KV`, `HM_US_KV` |
| Local / OneDrive | `hph/` → `HPH/` |
| Cantidad | 48 = 6 juegos (genérico + 5 mercados) × 4 tamaños × 1x/2x. Todos los mercados tienen los 4 tamaños |
| Peso | 1200×1200 2,06–2,10 MB (2x 4,97–5,04) · 300×600 0,32–0,33 MB (2x 0,88–0,91) · 300×250 0,17 MB (2x 0,49–0,50) · 728×90 0,11–0,12 MB (2x 0,31–0,33) |
| Descartado | Componer el HPH por mercado desde las partes del KV con precio (el operador lo rechazó, sobre todo el 728×90); quitar la lista y centrar el bloque (Daniela pidió las banderas del mercado) |

### 3.9 DAT 1080×1080 (sólo Chile)

| Campo | Valor |
| --- | --- |
| Origen en el kit | `FORMATO DAT/KV BLACK-45-DAT_DOM.svg` y `…_DAT_INTER.svg` (viewBox 1080×1080) |
| Contenido | DOM: «VUELA POR Chile» con lista Norte/Sur y fotos circulares, «IDA Y VUELTA DESDE $000.000», badge «CON 00% DCTO». INTER: «VUELA Internacional» con la lista de banderas del clúster |
| Producción | Render del editable con el logo corregido, a 2x y reducido a 1x; precio y descuento siguen como placeholder |
| Nombre | `CL_DAT_DOM[_2x].png`, `CL_DAT_INTER[_2x].png` |
| Local / OneDrive | `chile-kv-listo/` → `CHILE KV LISTO/` |
| Cantidad | 4 (2 × 1x/2x) |
| Peso | 1,79–1,83 MB (2x 4,34–4,56) |
| Observación | `CL_DAT_INTER` y `CL_PMAX_1080x1080` se ven iguales en la hoja de contacto (1 789 094 B y 1 788 960 B); en el kit, sus SVG pesan lo mismo pero tienen hash distinto. Confirmar con Daniela si son la misma pieza |

### 3.10 Banner TikTok 1920×1080 (sólo Chile)

| Campo | Valor |
| --- | --- |
| Origen en el kit | `FORMATOS BANNER TIKTOK/BANNER-TIKTOK_{PRECIO,DCTO,PRECIO+DCTO}_1920x1080.svg` |
| Variantes | **PRECIO**: flecha «IDA Y VUELTA DESDE $000.000», sin badge. **DCTO**: flecha con «CON HASTA 00% DCTO.» grande y sin precio. **PRECIO+DCTO**: flecha con precio y badge «CON 00% DCTO». Las tres: «VUELA Internacional», lista de banderas a la derecha de la flecha, mujer a la derecha, pie de puntualidad |
| Nombre | `CL_BANNER-TIKTOK_<PRECIO|DCTO|PRECIO-DCTO>_1920x1080[_2x].png` (2x = 3840×2160) |
| Local / OneDrive | `chile-kv-listo/` → `CHILE KV LISTO/` |
| Cantidad | 6 |
| Peso | 2,15–2,19 MB (2x 4,84–4,89) |

### 3.11 PMAX Chile «KV listo»

| Campo | Valor |
| --- | --- |
| Origen en el kit | `FORMATO PMAX PRECIO+DCTO/PMAX_{1080x1080,1080x1350,1080x1920,1200x628}.svg` |
| Contenido | Chile internacional con lista de banderas, precio y badge (placeholder) |
| Nombre | `CL_PMAX_<W>x<H>[_2x].png` |
| Cantidad | 8 (4 × 1x/2x) |
| Peso | 1080×1080 1,79 MB · 1080×1350 2,04 MB · 1080×1920 2,46 MB · 1200×628 1,14 MB; 2x 2,66–5,40 MB |

Total Chile «KV listo»: 18 archivos (TikTok 6 + DAT 4 + PMAX 8), página «KV Black · Chile KV listo».

### 3.12 CyberSky Perú (campaña anterior de la misma sesión)

| Formato | Tamaño | Notas |
| --- | --- | --- |
| Popup | 1080×1080 | `PlantillaPopup.dc.html` |
| Post | 1080×1350 | `PlantillaPost.dc.html` |
| Story | 1080×1920 | `PlantillaStory.dc.html` |

22 destinos × 3 formatos = 66 piezas. Nacionales (16): Arequipa, Ayacucho, Cajamarca, Chiclayo, Cusco, Iquitos,
Jauja, Juliaca, Piura, Pucallpa, Puerto Maldonado, Tacna, Talara, Tarapoto, Trujillo, Tumbes. Internacionales
(6): Buenos Aires, Miami, Punta Cana, Río de Janeiro, Santiago, São Paulo. Entrega: un PDF de 66 páginas
(`~/Downloads/SKY-CyberSky-Peru-adaptaciones.pdf`, 23 MB), no archivos sueltos. Insumos locales en
`ai-generations/2026-11-04_sky-cybersky-peru/` (`fotos/<destino>.png`, `jpg/`, `selfies/`, `scripts/`).
Detalle del flujo plantilla + datos en [sky-design-canvas.md](sky-design-canvas.md).

## 4. Elementos de sistema

### 4.1 Logo BLACK

- Wordmark «BLACK» verde `#26DE00` con el isotipo SKY dentro de la «A», marco verde con la fecha en su borde
  inferior, avión SKY sobre el marco y antetítulo por idioma (ver sección 2).
- Kit: `KV X HM/LOGO BLACK/SKY_LOGO_BLACK_ESP.svg`, `SKY_LOGO_BLACK_USA.svg` y `SKY-13.svg` (que es la
  versión Brasil), viewBox 619,22×257,92.
- Fecha corregida (pedido de SKY vía Adriana Contreras), centrada al máximo ancho del marco:

| Idioma | Fecha | Tamaño |
| --- | --- | --- |
| ES | «DEL 25 DE NOVIEMBRE AL 2 DE DICIEMBRE» | 25,5 px |
| PT | «DE 25 DE NOVEMBRO A 2 DE DEZEMBRO» | 27 px |
| EN | «FROM NOVEMBER 25 TO DECEMBER 2» | 28,9 px |

- Fecha original del kit: «DEL 25 AL 29 DE NOVIEMBRE» / «DE 25 A 29 DE NOVEMBRO» / «FROM NOVEMBER 25 TO
  NOVEMBER 29». El hueco del marco = ancho del texto + 10 px; resplandor reducido (desenfoque × 0,5,
  opacidad × 0,6) porque se veía borroso.
- Escala: 100 % en KV y popup; 130 % en story y story en video.

### 4.2 Banderas circulares

| Propiedad | Valor |
| --- | --- |
| Diámetro | 67 px (radio 33,5) con borde blanco de 2 px |
| Texto | Metric Medium 33, blanco `#fefefe`; segunda línea con interlínea 31,35 |
| Posición en KV | Centro x=103, texto x=166,5, primera fila y=378; paso 98 px hasta 4 filas, 92 px con 5 |
| Fila de Uruguay | 4 banderas de 52 px (radio 26), paso 66 px, desde x=92, a la altura de la píldora de origen oculta |
| Archivo de trabajo | PNG transparente 160 px en `kvhm-canvas/flags-circ/<clave>.png` |

| Clave | Archivo del kit (`GRAFICOS/BANDERAS/`) |
| --- | --- |
| AR | `BANDERA CL (CIRCULO)_1.svg` (el kit lo nombra CL pero muestra Argentina) |
| BR | `BANDERA BR (CIRCULO).svg` |
| CL | `BANDERA CL (CIRCULO).svg` |
| PE | `BANDERA PE(CIRCULO).svg` |
| US | `BANDERA USA (CIRCULO).svg` |
| UY | `BANDERA UY (CIRCULO).svg` |
| PUJ (DO) | `BANDERA PUJ (CIRCULO).svg` |

Cada SVG circular pesa ~1,78 MB porque embebe las 7 banderas raster y muestra una por `translate`.

### 4.3 Bloque comercial

| Elemento | Forma | Reglas |
| --- | --- | --- |
| Destino | Antetítulo con flecha verde («VUELA A», «VOLÁ», «VOE PARA», «FLY», «ENCUENTRA») + título grande + píldora lavanda con avión «DESDE [ORIGEN]» | En rutas, el título se ajusta a ≤ 430 px de ancho desde 90 px |
| Precio | Flecha morada `#671E75` con etiqueta en píldora oscura y monto en Metric Black (112 px en el clúster INTER) | La flecha viene en 3 piezas con una junta de 1 px que se tapa en el render |
| Badge | Sticker verde claro festoneado con el texto del descuento | Textos: CON 00% DCTO. (CL) · CON 00% DTO. (PE) · CON 00% OFF (AR, UY) · COM ATÉ 00% OFF (BR) · WITH UP TO 00% OFF (US). Kit: `GRAFICOS/DCTO GRAFICO/DCTO_{CL,AR-UY,BR,USA}.svg`, `DTO_PERU.svg` (887×479) |
| Pie | Medalla de puntualidad + «#1 EN PUNTUALIDAD REGIONAL» + legal | Kit: `GRAFICOS/LOGO PUNTUALIDAD/Puntualidad_logo_{ESP,BR,USA}_{Blanco,Color}.svg` (3,53 MB c/u) |

### 4.4 Listas

| Lista | KV | Forma |
| --- | --- | --- |
| Regiones de Chile | `HM_CL_KV_DOM_CLUSTER`, `CL_DAT_DOM` | 15 destinos con foto circular, columnas NORTE y SUR (Arica, Iquique, Calama, Antofagasta, Copiapó, La Serena · Concepción, Temuco, Valdivia, Osorno, Pto. Montt, Castro, Balmaceda, Pto. Natales, Punta Arenas). Kit: `REGIONES CHILE.svg` (2352×3080, 5,87 MB) |
| Banderas Chile INTER | `INTER_CLUSTER`, `CL_ENCUENTRA`, HPH genérico, TikTok, PMAX/DAT Chile | 6 filas: Río de Janeiro / São Paulo / Florianópolis / Salvador · Lima, Cusco y conexiones a 14 destinos · Buenos Aires / Bariloche / El Calafate / Mendoza · Punta Cana · Miami · Montevideo |
| Banderas por mercado | `*_BANDERAS`, `PE_ENCUENTRA`, HPH por mercado | Ver sección 2 |
| Regiones de Perú | `HM_PE_KV_DOM_REGIONES` | 2 columnas (x=84 y x=320): encabezado Metric Bold 22 con subrayado verde de 2 px; ciudades Metric Semibold 28, paso 50 px, con pin verde (`#26de00`, centro `#1f3550`). NORTE: Tumbes, Piura, Chiclayo, Trujillo, Cajamarca, Tarapoto, Iquitos. CENTRO Y SUR: Pucallpa, Jauja, Cusco, Arequipa, Juliaca, Tacna. Sin fotos (no hay de Perú) |

### 4.5 Alianzas

| Logo | Archivo del kit | Uso en las piezas |
| --- | --- | --- |
| PromPerú, sólo HM Perú | `ALIANZAS/PROMPERU/PROMPERU (SOLO HM PERU)@72x.png` (1928×724; no hay SVG) | Rutas de Perú: alto 68 px, arriba a la derecha (margen 48, y=56) |
| PromPerú, otros HM | `ALIANZAS/PROMPERU/OTROS HM FUERA DE PERU/LOGO_PROMPE_OTROS-HM_{BLANCO,COLOR}.svg` (236×145) | `HM_BR_KV_PERU`: versión blanca, alto 104 px, arriba a la derecha (y=52) |
| SKY + PromPerú, otros HM | `…/SKY+PROMPE_OTROS-HM_{BLANCO,COLOR}.svg` (249×54) | No se usó |
| Chile Travel (fuera de Chile) | `ALIANZAS/SERNATURE/CHILE TRAVEL (FUERA DE CHILE).svg` (146×171) | `HM_BR_KV_SANTIAGO`: alto 150 px, arriba a la derecha (y=52) |
| Chile es tuyo (sólo HM Chile) | `ALIANZAS/SERNATURE/CHILE ES TUYO (SOLO HM CHILE).svg` (145×171) | No se usó (ningún KV chileno lleva alianza) |

Ubicación de la foto en rutas: `[Ubicación de la foto]`, Metric Bold 18, blanco con contorno suave, alineado
a la derecha en x=1032, bajo PromPerú, con pin verde vectorial. Placeholder.

### 4.6 Gráficos, video y audio del kit

| Recurso | Archivo | Uso |
| --- | --- | --- |
| Completa tu viaje | `GRAFICOS/COMPLETA TU VIAJE GRAFICO/Completa-tu-viaje_{ESP,AR,BR,USA}.svg` (~2300×1280) | Slide 4 de la story en video (AR también para UY) |
| URL de SKY | `GRAFICOS/LOGO SKY/URL (PARA TODOS HM MENOS CL Y PE)/URL_LOGO-{BLANCO,COLOR}.svg` (254×22) | No se usó: ningún KV del kit trae la URL; pendiente de decidir dónde va |
| Video del avión | `FORMATO STORY/VIDEO PARA STORY/STORY AVION.mp4` (1080×1920, 30 fps, 5,57 s) | Fondo del slide 4 (primeros 3,3 s) |
| Tapas de cierre | `FORMATO STORY/TAPAS DE CIERRE/{ESPAÑOL,BRASIL,INGLES}/*.mov` (29,97 fps, 2,70 s) | Slide 5. ES sólo horizontal 1920×1080; PT y EN horizontal y vertical 1080×1920 |
| Música de story | `FORMATO STORY/AUDIO PARA VIDEO/SONIC BRAND-3-STORY_1.mp3` (15,272 s) | Bajo los slides 1–4 |
| Audio de GIF | `FORMATO GIF/AUDIO PARA GIF/AUDIO FINAL PARA LOS GIF.mp3` (3,944 s) | Sólo `_audio.mp4` |
| Referencias de story | `FORMATO STORY/REFERENCIAS DE STORYS/` (5 MP4 1080×1920, 30 fps, 13,9–20,0 s: Cyber Monday AR-UY, BLACK XL master, CyberSky destinos genéricos, STORY_INTER, YT vertical INTER) | Estructura de 5 slides y frase DOM |

## 5. Mapas de carpetas

### 5.1 Kit «Despliegue Base» (OneDrive, sólo lectura)

Ruta: `~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base/`.

| Carpeta o archivo | Contenido (medido) |
| --- | --- |
| `KV BLACK.ai` | 175,8 MB; 25 mesas: 10 KV por mercado, 3 logos BLACK, PromPerú, 5 badges, 4 «Completa tu viaje» y 2 mesas duplicadas |
| `KV X HM/` | 12 SVG `HM_*` 1080×1350 (1,56–6,20 MB; los clústeres son los livianos) + `LOGO BLACK/` (3 SVG 619×258) |
| `FORMATO HPH/` | `HPH_{1200x1200,300x600,300x250,728x90}_GENERICO.svg` (0,16–2,14 MB) |
| `FORMATO PMAX PRECIO+DCTO/` | `PMAX_{1080x1080,1080x1350,1080x1920,1200x628}.svg` |
| `FORMATO DAT/` | `KV BLACK-45-DAT_{DOM,INTER}.svg` (1080×1080) |
| `FORMATOS BANNER TIKTOK/` | `BANNER-TIKTOK_{PRECIO,DCTO,PRECIO+DCTO}_1920x1080.svg` |
| `FORMATO GIF/` | `AUDIO PARA GIF/AUDIO FINAL PARA LOS GIF.mp3` · `REFERENCIA ANIMACION/REF_KV1-1, KV1-2, KV2_1, KV2_2, KV3_1, KV3_2.mp4` (1080×1350, 60 fps) |
| `FORMATO STORY/` | `AUDIO PARA VIDEO/` · `REFERENCIAS DE STORYS/` · `TAPAS DE CIERRE/{BRASIL,ESPAÑOL,INGLES}/` · `VIDEO PARA STORY/` |
| `GRAFICOS/` | `BANDERAS/` (7 circulares + rectangulares AR, BR, CL, PE, USA, UY, Dominicana + `REGIONES CHILE.svg`) · `COMPLETA TU VIAJE GRAFICO/` (4) · `DCTO GRAFICO/` (5) · `LOGO PUNTUALIDAD/` (6) · `LOGO SKY/URL …/` (2) |
| `ALIANZAS/` | `PROMPERU/` (PNG «solo HM Perú» + 4 SVG «otros HM») · `SERNATURE/` (2 SVG) |
| `TAPAS DE CIERRE VIDEOS/` | Vacía (0 archivos al 2026-11-05); las tapas están en `FORMATO STORY/TAPAS DE CIERRE/` |
| `ENTREGABLES BLACK (Efeonce 2026-11-05)/` | Entrega de Efeonce (5.2); no es parte del kit |

Las referencias de animación se llaman KV1, KV2 y KV3; que correspondan a tres tipos de KV (estándar, con
lista, otro) es **inferido**: la sesión sólo verificó que KV2 trae lista o tarjeta que sube 150 px.

### 5.2 Entrega `ENTREGABLES BLACK (Efeonce 2026-11-05)/`

| Carpeta OneDrive | Local (`ai-generations/2026-11-04_sky-black-gif/`) | Contenido | Archivos |
| --- | --- | --- | --- |
| `GIF Y VIDEO KV` | raíz | 24 GIF + 24 MP4 + 24 `_audio.mp4` | 72 |
| `KV ESTATICOS` | `kv/` | 24 KV + 13 rutas | 37 |
| `POPUP Y STORY` | `estaticos/` | 24 popup + 24 story | 48 |
| `RUTAS FOCO PERU` | `rutas-peru/` | 13 popup + 13 story | 26 |
| `CHILE KV LISTO` | `chile-kv-listo/` | TikTok 3, DAT 2, PMAX 4, cada uno 1x y 2x | 18 |
| `STORY VIDEO 5 SLIDES` | `story-video/` | 12 story en video | 12 |
| `PMAX` | `pmax/` | 12 KV × 5 | 60 |
| `HPH` | `hph/` | 6 juegos × 4 tamaños × 2 | 48 |

Total 321 archivos, 626 MB; recontado el 2026-11-05 por carpeta. `scripts/` queda sólo en local.

### 5.3 Canvas de Claude Design (versión 28, 10 páginas)

1 Internacionales · 2 Nacionales · 3 Plantillas (CyberSky) · 4 KV Black · HM · 5 KV Black · Animación GIF ·
6 KV Black · Popup y Story · 7 KV Black · PMAX y HPH · KV Black · Grilla por mercado · KV Black · Rutas foco
Perú · KV Black · Chile KV listo. El orden de las tres últimas es **inferido** (se agregaron en ese orden
por script). URL y lecciones de la plataforma: [sky-design-canvas.md](sky-design-canvas.md).

## 6. Inconsistencias y pendientes

### 6.1 Del kit (reportar; no corregir en OneDrive)

Las ya listadas en [sky-design-canvas.md](sky-design-canvas.md#inconsistencias-del-kit-black-a-corregir-en-la-fuente)
siguen vigentes (bandera CL que es AR, `SKY-13` que es BR, «CON 00% DCTO.» vs «CON HASTA», legal CL INTER con
«tramo», PE DOM-RUTA con tramo invertido, URL AR/US sin «www», «FROM [ORIGEN]» sin traducir, legales
trazados, KV sin alianzas ni URL, flecha en 3 piezas, Content Credentials de IA en la medalla y foto «ChatGPT
Image …»). Se suman, verificadas en esta sesión:

| Pieza | Problema |
| --- | --- |
| `FORMATO DAT/…DAT_DOM` | Usa «IDA Y VUELTA DESDE» aunque es nacional; el KV `HM_CL_KV_DOM` usa «DESDE … Por tramo.» |
| Rutas de Perú | Heredan el legal de `HM_PE_KV_DOM-RUTA` con el tramo invertido («Final tramo [destino]-[origen]») |
| Nombres del kit | `-RUTA` con guion y `_CLUSTER` con guion bajo |
| `TAPAS DE CIERRE VIDEOS/` | Vacía; las tapas reales están en `FORMATO STORY/TAPAS DE CIERRE/`. Falta la tapa vertical en español |
| `REF_KV2_1.mp4` | Es la única referencia de animación sin pista de audio (medido) |
| `DOMINICANA (PUJ) CIRCULO.svg` | Tiene el viewBox rectangular de las banderas planas (178,99×114,87); que no sea un círculo es **inferido** |
| `DAT_INTER` vs `PMAX_1080x1080` | Se ven iguales; confirmar si son la misma pieza |

### 6.2 Defecto propio (corregido 2026-11-05)

`pmax/HM_PE_KV_DOM-RUTA__pmax-{1080x1080,1080x1350,1080x1920}.png` y los mismos de `HM_PE_KV_INTER-RUTA`
(6 archivos) se entregaron con la fecha vieja del logo. Se detectó al comparar cada PMAX con su popup, KV y
story; los otros 10 KV eran idénticos byte a byte. Ese mismo día se reemplazaron en local y en la carpeta de
entrega de OneDrive y quedaron verificados con `cmp`. Ningún entregable es anterior al logofix (`find ! -newermt`).

### 6.3 Por confirmar con Daniela

| Tema | Estado |
| --- | --- |
| BR «Voe para Peru» | ¿Va con piezas de alianza (PromPerú) o como KV? |
| «Vuela por Perú» | Propuesta sin fotos (no hay fotos de Perú) |
| CL «Encuentra destinos» | Se hizo desde el clúster internacional de Chile; su nota decía «cluster inter de Perú» |
| Frases del brandlift INTER y traducciones (AR, PT, EN) | Propuestas propias |
| Traducciones de flecha y botón HPH (PT, EN) | Propuestas propias |
| Ubicación de la foto en rutas | Placeholder `[Ubicación de la foto]` |
| Tapa vertical en español | Recortada de la horizontal |
| Precios, descuentos, orígenes y fechas de vuelo | Placeholder en todas las piezas |
| Derechos de la foto del KV y de la medalla | Archivos con rastro de generación por IA: validar antes de pautar |
| Pregunta de Daniela «¿ese espacio es colaborativo?» | El canvas es privado; se comparte desde «Compartir» y admite comentarios |
