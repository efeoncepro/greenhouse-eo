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
| **Publicar long-form/blog** | `efeonce-public-site-wordpress` | el post que el social distribuye |

## Metricool MCP — endpoints canónicos

- `getBrandSettings` — resuelve la marca/cuenta conectada antes de nada.
- `getBestTimeToPostByNetwork` — mejor hora por red (úsalo antes de proponer horario).
- `createScheduledPost` — **programa** un post. ⚠️ Solo tras confirmación humana.
- `getScheduledPosts` / `updateScheduledPost` — revisar/editar la cola.
- `getAnalyticsAvailableMetrics` + `getAnalyticsDataByMetrics` — analítica para reportes.

Flujo típico: `getBrandSettings` → (produce asset) → `getBestTimeToPostByNetwork` → propone
calendario en `templates/content-calendar-30d.md` → **el operador aprueba** → `createScheduledPost`.

## Higgsfield MCP — producción

- `generate_image` / `generate_video` / `generate_audio` — núcleo de producción.
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

Producir con IA (Higgsfield, image gen) **cuesta créditos/API**. Antes de generar en volumen,
dimensiona el gasto y confírmalo. Prefiere `virality_predictor`/iteración barata antes de
producir 20 variantes. No generes assets especulativos sin brief aprobado.

## Autenticidad + gobernanza IA

- Gana lo humano/imperfecto/serializado. La IA **acelera**, no reemplaza el juicio de marca.
- Contenido IA que un espectador razonable confundiría con real **debe etiquetarse** ("ante la
  duda, revela"). ~1/3 de consumidores es menos propenso a marcas con ads de IA (as-of 2026-07).
- Brand safety: cura todo output de IA contra marca Efeonce antes de que salga.
