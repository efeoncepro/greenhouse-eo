# Hechos verificados — segunda ronda SKY BLACK (2026-11-04/05)

Complementa `hechos-sesion.md` (primera ronda: DS, canvas, CyberSky Perú 66 piezas, 12 KV, GIF, popup/story).
Mediciones exactas: `inventario-entregables.txt` (cada archivo entregado con tamaño/fps/frames/duración/bytes) y
`inventario-kit.txt` (kit del cliente en OneDrive, sólo lectura, con viewBox/dimensiones). Scripts en `kvhm-canvas/`.

## Pedido
Daniela (diseño, Efeonce) pidió por Teams más piezas. Fuente: chat de Teams (imágenes vistas en Teams web).

## Logo BLACK corregido (pedido de SKY vía Adriana) — `logofix.cjs`
- Fecha: ES «DEL 25 DE NOVIEMBRE AL 2 DE DICIEMBRE» (25.5 px), PT «DE 25 DE NOVEMBRO A 2 DE DEZEMBRO» (27 px),
  EN «FROM NOVEMBER 25 TO DECEMBER 2» (28.9 px). Centrada, al máximo ancho del marco.
- El trazo del marco se regenera con un hueco = ancho del texto + 10 px.
- Resplandor: blur ×0.5, opacidad ×0.6 (se veía borroso).
- KV vectoriales: reescritura DOM del `<text>` de fecha. SVG con capa raster exportada de AI: se detecta la capa del
  logo (la más verde BLACK en el tercio superior), se oculta con `display="none"` en su `<image>` y se anida el logo
  vectorial corregido (ids con prefijo `lf-`).
- Idioma: se detecta SOLO por el texto de los `<tspan>`, nunca por el SVG crudo (base64 da falsos positivos de PT).
- Escribe en `kvhm-canvas/src2/<ruta relativa igual a OneDrive>`: 12 KV, `LOGO BLACK/*`, FORMATO HPH,
  PMAX PRECIO+DCTO, BANNER TIKTOK y DAT. Todos los scripts leen `src2/`; OneDrive nunca se toca.

## Grilla por mercado (12 mensajes) — `banderas.cjs`, `variantes.cjs`
| Mercado | Mensajes |
|---|---|
| CL | Vuela por Chile (DOM), Vuela internacional (INTER), Encuentra destinos (HM_CL_KV_ENCUENTRA, hecho desde INTER_CLUSTER) |
| PE | Vuela por Perú (HM_PE_KV_DOM_REGIONES: 2 columnas NORTE / CENTRO Y SUR con pines verdes, sin fotos), Vuela internacional con banderas (HM_PE_KV_INTER_BANDERAS), Encuentra destinos (HM_PE_KV_ENCUENTRA, desde PE_INTER_BANDERAS) |
| AR | «VOLÁ A Santiago» (HM_AR_KV_SANTIAGO), «VOLÁ A Lima» (HM_AR_KV_LIMA), banderas (HM_AR_KV_BANDERAS) |
| UY | Volá internacional con banderas (HM_UY_KV_BANDERAS: fila de 4 banderas reemplaza la píldora de origen) |
| BR | Voe a Santiago + logo Chile Travel (HM_BR_KV_SANTIAGO), «VOE PARA Peru» + PromPerú otros HM (HM_BR_KV_PERU), banderas (HM_BR_KV_BANDERAS) |
| US | Fly international con banderas (HM_US_KV_BANDERAS) |
- Banderas: círculo 67 px con borde blanco, texto Metric Medium 33. Listas según 5 referencias que mandó Daniela.
  Mapa: AR usa `BANDERA CL (CIRCULO)_1.svg` (el kit tiene bandera CL que en realidad es AR); PUJ = `BANDERA PUJ (CIRCULO).svg`.
  PNG circulares en `kvhm-canvas/flags-circ/<k>.png`.
- Cada mensaje tiene: KV 1080×1350, popup 1080×1080, GIF, story 1080×1920 y story en video.

## Capas y animación (parts/layers)
- `layers.cjs` separa cada KV en capa base + capas animables (badge [785,755,1020,995], precio [400,870,1055,1230],
  destino [40,920,530,1180], lista según KV; regiones = cajas que un elemento debe caber completo).
- KV nuevos: lista [40,320,720,890]. ALIANZA region [740,0,1080,330] para BR_SANTIAGO, BR_PERU y rutas.
- `patches.cjs`: arreglos de render en memoria (CL_ENCUENTRA reutiliza el de INTER_CLUSTER).
- `compose.cjs` arma popup y story desde las partes: lista se ajusta entre y 336 y 664 en popup; logo alianza en
  popup a escala 1; en story a escala 1.1, borde derecho 1032, tope y 500 (bajo el avión, antes se montaba).
- `anim-css-gen.cjs` genera `anim-css-<KV>.html` (animación CSS de las capas). GIF/MP4 se renderizan desde ese HTML
  (`frames.cjs` con archivo temporal único `_frames-<file>.html`; `render-gif.sh`), NUNCA desde los artboards del canvas
  (salían MP4 negros). Renders en paralelo compartían `_frames.html` (ENOENT, frames mezclados) → temp único y
  re-render secuencial de los 24.
- GIF/MP4: 1080×1350, 25 fps, 99 frames, 3,96 s. `_audio.mp4` con «AUDIO FINAL PARA LOS GIF» (aac), 3,936 s.

## Story en video de 5 slides — `story-video.cjs`
- 12 MP4 1080×1920, 30 fps, 15,7 s (15,709), xfade 0,3 s.
- Slides: intro 2,8 s · story (precios) 4,8 s · tarjeta brandlift 3,3 s · «Completa tu viaje» sobre STORY AVION 3,3 s · tapa 2,7 s.
- Música: SONIC BRAND a −3 dB, fade 12,4–13,3 s; el audio de la tapa entra en 13 s. Loudness −12 LUFS, pico −0,5 dBFS.
- Tapa vertical ES: no viene en el kit; se recorta de la horizontal (`crop=1080:1080:380:0,pad=1080:1920:0:420:white`).
- Tarjeta brandlift top 1180; gráfico ctv top 1080.
- Frases por idioma y tipo: DOM viene de la referencia; INTER, AR, PT y EN son propuestas propias (por confirmar).

## Rutas foco Perú — `rutas.cjs`
- HM_PE_RUTA_<CIUDAD> × 13 desde HM_PE_KV_DOM-RUTA. Título ajustado ≤ 430 px. PromPerú (SOLO HM PERU png) arriba a
  la derecha. Texto `[Ubicación de la foto]` con pin verde vectorial (placeholder). Pucallpa venía duplicada → una sola.
- Entregables: popup 1080×1080 y story 1080×1920 por ruta (26).

## Chile «KV listo» — `chile-refs.cjs`
- 9 referencias desde los editables del kit con logo nuevo → `chile/CL_*` en 1x y _2x:
  BANNER TIKTOK 1920×1080 ×3 (PRECIO, DCTO, PRECIO+DCTO), DAT 1080×1080 ×2 (DOM, INTER), PMAX ×4
  (1080×1080, 1080×1350, 1080×1920, 1200×628). Precios y descuentos siguen placeholder.

## HPH por mercado — `hph/market.cjs`
- Desde los 4 genéricos del kit (FORMATO HPH: 1200×1200, 300×250, 300×600, 728×90; referencias renderizadas
  `hph/ref-HPH_*_GENERICO.png`). Primero se hizo genérico y el usuario reclamó que el 728×90 quedó mal sin usar la
  referencia → se rehízo desde los SVG de referencia.
- LISTA por mercado con `listaHTML()`: pitch = caja/6, bandera 0,73, texto 0,36. 728 y UY con fila de banderas.
  Se quitó el bloque de recentrado 2b.

## PMAX
- 4 formatos por KV (1080×1080, 1080×1350, 1080×1920, 1200×628) y `_2x` (p. ej. 2400×1256). 60 archivos en `pmax/`.

## Canvas (Claude Design) — versión 28
- 10 páginas; nuevas: «KV Black · Grilla por mercado», «Rutas foco Perú», «Chile KV listo».
- Videos deben subirse como asset (`/_blob/<id>`); imágenes funcionan como archivo relativo del proyecto.
  Ids en `kvhm-canvas/vid-blobs.json` (24 `__gif` y 12 `__story-video`).
- Máximo 512 archivos por versión: el publish dio 422 → se borraron 49 `anim/*` con `null` en `files`.
- `sync-canvas.cjs` copia jpg/png a `canvas/project/{kv,formatos,banners,chile}`; `new-pages.cjs` arma las páginas.
- Artboards rayados a zoom bajo = carga perezosa, no error. Vista de reproducción `#play-<id>`.

## Pendientes de confirmar con Daniela
BR «Voe para Peru» (alianza o KV) · «Vuela por Perú» sin fotos · CL «Encuentra destinos» desde inter cluster (su nota
decía «cluster inter de Perú») · frases INTER del brandlift y traducciones · traducciones de flecha/botón HPH ·
ubicación de foto en rutas · tapa vertical ES recortada. Pregunta de Daniela «¿ese espacio es colaborativo?»: el canvas es
privado; se comparte desde «Compartir» y se puede comentar.

## Entrega
OneDrive `Despliegue Base/ENTREGABLES BLACK (Efeonce 2026-11-05)/` — 321 archivos, 626 MB, verificados (ya documentado
en commit b0eeefb35).
