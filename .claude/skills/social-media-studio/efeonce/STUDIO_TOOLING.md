# STUDIO_TOOLING — el pipeline real de ejecución

> Lo que vuelve a `social-media-studio` un **estudio** y no un PDF: cablea las herramientas
> conectadas en el loop **idear → producir → programar → medir → iterar**. Reverifica
> capacidades de cada tool (los MCP cambian de endpoints/features — trimestral).

## El loop y qué herramienta corre cada paso

| Paso | Herramienta / skill | Qué hace |
|---|---|---|
| **Idear** | esta skill (`../modules/`) + `templates/` | pilar, formato, hook, calendario |
| **Producir video/audio/UGC** | `higgsfield-*` MCP + skills `higgsfield-generate` / `higgsfield-product-photoshoot` / `higgsfield-soul-id` | generar/animar video, imagen, audio, avatares, product shots |
| **Producir estáticos/carruseles** | `greenhouse-ai-image-generator`, `greenhouse-digital-brand-asset-designer`, Figma/Adobe Express (MCP) | imágenes de marca, slides de carrusel, plantillas |
| **Copy fino** | `copywriting` | pulir caption/hook/guion (esta skill da la estructura) |
| **Programar** | **Metricool** MCP | mejor hora, crear post programado, ver calendario |
| **Medir** | **Metricool** MCP + `../modules/09` | analítica nativa por red |
| **Capturar lead** | `growth-marketing-cro` + `greenhouse-growth-forms` | grader/newsletter como destino |
| **Publicar nodo owned (long-form/blog/landing)** | `efeonce-public-site-wordpress` | la pieza owned relacionada; social puede distribuirla o aportar un nodo platform-native autónomo |

## Metricool MCP — endpoints canónicos

- `getBrandSettings` — resuelve la marca/cuenta conectada antes de nada.
- `getBestTimeToPostByNetwork` — mejor hora por red (úsalo antes de proponer horario).
- `createScheduledPost` — **programa** un post. ⚠️ Solo tras confirmación humana.
- `getScheduledPosts` / `updateScheduledPost` — revisar/editar la cola.
- `getAnalyticsAvailableMetrics` + `getAnalyticsDataByMetrics` — analítica para reportes.

Flujo típico: `getBrandSettings` → (produce asset) → `getBestTimeToPostByNetwork` → `getScheduledPosts`
(colisiones en la cola) → propone calendario en `templates/content-calendar-30d.md` → **el operador aprueba** →
`createScheduledPost` → `getScheduledPosts` (id y estado) → después de la hora, confirma la publicación.

### Verificado en vivo (as-of 2026-07-05)

Smoke test de lectura OK contra la cuenta real. Notas operativas:

- **Descubre siempre la marca primero.** `getBrandSettings` devuelve la lista con `id`
  (= `brandId`), `label`, `timezone` y `networksData` (los handles conectados por red).
  Úsalo para resolver el `brandId` correcto y **no cruzar contenido entre marcas** — hay
  marcas propias (Efeonce Group) y de clientes (SKY / Sky Perú / Sky Colombia). Nunca
  asumas un `brandId`; resuélvelo por `label`.
- **`getBestTimeToPostByNetwork` requiere** `brandId`, `socialNetwork` (`instagram|facebook|
  twitter|linkedin|youtube|tiktok`), `timezone` (IANA, sale del brand — ej. `America/Santiago`)
  y ventana `fromDate`/`toDate` en **ISO 8601 con offset** (ej. `2026-07-06T00:00:00-04:00`;
  Chile en invierno = `-04:00`).
- **Gotcha `dayOfWeek`**: el retorno usa **1 = lunes … 7 = domingo** (el array llega con el 7
  primero). No lo confundas con el estándar JS (0 = domingo). Interpreta el `value` como
  intensidad relativa: a mayor valor, mejor hora.
- **Cliente correcto = `getBrandSettings` primero, siempre** (repite la regla de
  `CLIENT_DELIVERY.md`): antes de programar en una marca de cliente, confirma el `brandId`.

### Programar con imagen en LinkedIn (verificado 2026-09-11)

- **Marcas con LinkedIn** (referencia; igual resuelve por `label`): `Julio Reyes` = `5105024` → perfil personal
  (`urn:li:person:vj64TIaUfj`); `Efeonce Group` = `3961547` → página de empresa (`urn:li:organization:20503593`).
  Ambas en `America/Santiago`. Son canales distintos con voz distinta (`EFEONCE_OVERLAY.md`).
- **`media` exige una URL pública.** Metricool la re-aloja en `static.metricool.com/planner/...` y la adjunta como
  **imagen nativa** del post, no como link. Aloja el asset en
  `gs://efeonce-group-greenhouse-public-media-prod/campaigns/<campaña>/` (`gcloud storage cp --content-type=image/png`)
  y verifica HTTP 200 y `content-type` antes de programar.
- **`mediaAltText`**: array con el texto alternativo de cada imagen. No lo omitas.
- **`linkedinData: {type: post, previewIncluded: false, publishImagesAsPDF: false}`**: con `previewIncluded: false`
  los links del texto no generan tarjeta de preview y la imagen queda como la pieza visual.
- **Fecha**: `publicationDate {dateTime: 'YYYY-MM-DDTHH:mm:ss', timezone: <IANA>}` (hora local sin offset + zona),
  a diferencia de `getBestTimeToPostByNetwork`, que pide ISO con offset.
- **`autoPublish: true` + `draft: false` deja el post en `PENDING`**, que significa programado, no publicado. Confirma
  el id y el estado con `getScheduledPosts` en cada marca, y la publicación efectiva después de la hora.
- Receta completa para vacantes: `linkedin-vacancy-distribution.md`.

## Higgsfield MCP — producción

- `generate_image` / `generate_video` / `generate_audio` — núcleo de producción.
- Si la sesión del CLI `higgsfield` está vencida, el conector MCP funciona igual (verificado 2026-09-11). En
  `gpt_image_2` no hay `aspect_ratio` 4:5: genera `3:4` y recorta (receta de pieza social con sello de logo en
  `greenhouse-ai-image-generator/SKILL.md`).
- `models_explore(action:'recommend')` — cuando no sepas qué modelo calza, pídele recomendación.
- Edición dedicada: `upscale_*`, `outpaint_image`, `reframe` (cambiar aspect ratio de video),
  `remove_background`, `motion_control`.
- `virality_predictor` — estima performance/hook/retención de un video antes de publicar.
- UGC/avatares: workflows de talking-head/UGC (pide `get_workflow_instructions` primero).

> Para input de media local del operador en clientes con UI, Higgsfield pide
> `media_upload_widget`. No pidas adjuntar en el chat.

## Regla dura: propose → confirm → execute

El estudio **propone y produce**, pero **programar o publicar en vivo pasa SIEMPRE por
confirmación humana explícita**. Nunca dispares `createScheduledPost`, un DM masivo ni una
publicación sin que el operador diga que sí. Es la misma doctrina Full API Parity del portal.

## Gasto gobernado

El saldo/precio de Higgsfield u otro provider es **costo interno**, no Studio Credits. Dentro de Creative
Studio, los créditos miden operaciones generativas gobernadas y provider-neutral. Antes de producir:

1. clasifica las operaciones de imagen/video/audio requeridas;
2. ejecuta `estimate → reservation → approval` con rate version vigente;
3. registra attempts y cierra `settlement | release | refund adjustment` según outcome;
4. no cobres dos veces un retry técnico ni traduzcas precio vendor→crédito.

Copy, layout de carrusel, edición, subtítulos, export, programación, QA y medición devengan **0 Studio Credits**,
aunque consuman capacidad/gobierno. Derechos de creator, whitelisting, música, voz, likeness y paid usage se
autorizan/cotizan aparte. Canon:
`docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`.

## Autenticidad + gobernanza IA

- Gana lo humano/imperfecto/serializado. La IA **acelera**, no reemplaza el juicio de marca.
- Contenido IA que un espectador razonable confundiría con real **debe etiquetarse** ("ante la
  duda, revela"). ~1/3 de consumidores es menos propenso a marcas con ads de IA (as-of 2026-07).
- Brand safety: cura todo output de IA contra marca Efeonce antes de que salga.
