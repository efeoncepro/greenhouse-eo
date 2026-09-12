# STUDIO_TOOLING — el pipeline real de ejecución

> Lo que vuelve a `social-media-studio` un **estudio** y no un PDF: cablea las herramientas
> conectadas en el loop **idear → producir → programar → medir → iterar**. Reverifica
> capacidades de cada tool (los MCP cambian de endpoints/features — trimestral).

## Entrada de solicitudes creativas

Para seasonality, trendjacking o una pieza social integral, cargar primero
[el módulo 11](../modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md), luego
[el protocolo de producción](../modules/10_AI_AND_PRODUCTION_STUDIO.md) y
[los contratos de conectores](../references/social-production-connectors.md).
Clasificación, concepto y papel de marca preceden a selección de modelo. Una festividad es seasonality salvo
que exista un detonante emergente documentado. No finalizar con un prompt si se pidió una pieza.

La siguiente tabla enruta funciones, no promete tools instalados. Verificar nombres/schema actuales. El uso
de varias herramientas no es un criterio de calidad; cada pase debe resolver un defecto identificado.

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
  Chile en invierno = `-04:00`). **No acepta `threads`** (verificado 2026-09-11): en Threads la hora
  se decide por criterio, no por dato.
- **Gotcha `dayOfWeek`**: el retorno usa **1 = lunes … 7 = domingo** (el array llega con el 7
  primero). No lo confundas con el estándar JS (0 = domingo). Interpreta el `value` como
  intensidad relativa: a mayor valor, mejor hora.
- **Cliente correcto = `getBrandSettings` primero, siempre** (repite la regla de
  `CLIENT_DELIVERY.md`): antes de programar en una marca de cliente, confirma el `brandId`.

### Programar por red (verificado 2026-09-11)

- **Marcas y redes conectadas** (referencia; igual resuelve por `label` con `getBrandSettings`), ambas en
  `America/Santiago` y con voz distinta por canal (`EFEONCE_OVERLAY.md`):
  - `Julio Reyes` = `5105024` → LinkedIn perfil personal (`urn:li:person:vj64TIaUfj`).
  - `Efeonce Group` = `3961547` → Instagram `efeoncepro`, Threads `efeoncecl`, LinkedIn página
    (`urn:li:organization:20503593`), YouTube (`UCSChYlj2eOqmemSFgevmVKg`), Facebook `107387610876292`.
- **Un `createScheduledPost` por red** cuando cada red lleva copy u horario distinto, que es lo normal. El post
  multi-provider solo sirve si texto, media y hora son idénticos.
- **`media` exige una URL pública.** Metricool la re-aloja en `static.metricool.com/planner/...` y la adjunta como
  **media nativa** del post, no como link. Aloja el asset en
  `gs://efeonce-group-greenhouse-public-media-prod/campaigns/<campaña>/` (`gcloud storage cp --content-type=...`)
  y verifica HTTP 200 y `content-type` antes de programar. **Si reemplazas un asset, súbelo con nombre nuevo
  (`-v2`)**: la URL pública de GCS cachea y sigue sirviendo la versión anterior (pasó con un plate roto).
- **`mediaAltText`**: array con el texto alternativo de cada imagen. No lo omitas.
- **Fecha**: `publicationDate {dateTime: 'YYYY-MM-DDTHH:mm:ss', timezone: <IANA>}` (hora local sin offset + zona),
  a diferencia de `getBestTimeToPostByNetwork`, que pide ISO con offset.
- **`autoPublish: true` + `draft: false` deja el post en `PENDING`**, que significa programado, no publicado. Confirma
  el id y el estado con `getScheduledPosts` en cada marca, y la publicación efectiva después de la hora.

| Red | Payload que funcionó | Ojo |
|---|---|---|
| **LinkedIn** | `linkedinData: {type: post, previewIncluded: false, publishImagesAsPDF: false}` | con `previewIncluded: false` los links del texto no generan tarjeta y la imagen queda como pieza visual |
| **Instagram** | `instagramData: {type: "POST", isAiGenerated: true}` | exige imagen o video; `isAiGenerated` declara IA fotorrealista |
| **Threads** | `threadsData: {}` + imagen + texto | vuelve con `replyControl: EVERYONE`; sin dato de mejor hora |
| **YouTube** | `youtubeData: {title, type: "short", privacy: "public", tags: [...], category: "SCIENCE_TECHNOLOGY", madeForKids: false, isAiGeneratedContent: true}` + `media: [URL pública .mp4]` + `text` = descripción | **solo video** (`type` = `video` \| `short`); el conector no expone posts de Comunidad, así que una pieza estática exige producir un Short 9:16. Metricool re-aloja el `.mp4` |

**Horario con datos, no con costumbre.** Cruza `getBestTimeToPostByNetwork` con la cola de `getScheduledPosts`: en el
caso fuente, Instagram tenía su pico el viernes 19:00; LinkedIn viernes 11:00 ya estaba ocupado por otro post de la
misma página, así que se movió al sábado 11:00 (2.º mejor valor) para no competir en el mismo feed; Threads fue a las
12:30 por ser el canal reactivo. Ids de esa corrida: Threads `374436590`, Instagram `374436637`, LinkedIn `374436668`,
YouTube `374447961` (caso: [`2026-09-11-iphone-duo-trendjack.md`](../../../../docs/operations/social/2026-09-11-iphone-duo-trendjack.md)).

Receta completa para vacantes: `linkedin-vacancy-distribution.md`.

## Higgsfield MCP — producción

Contrato y secuencia verificados por superficie:
[`social-production-connectors.md`](../references/social-production-connectors.md).
Descubrir herramientas actuales; `models_recommend` → `models_get` → estimate cuando aplique → input
confirmado → generación → `jobs_wait` → resultado visible. No asumir que `models_explore` o
`media_upload_widget` siguen expuestos ni que todos los modelos tienen los mismos ratios.

La sesión de CLI y MCP son independientes; verificar la ruta elegida. Un predictor, si está disponible,
es una hipótesis y nunca evidencia de performance. Cargar la skill específica de producto/UGC/preset
cuando el encargo la requiera.

## Magnific, motor nativo y composición exacta

Usar Magnific para el delta de detalle/resolución que realmente falte, no para sustituir dirección de arte.
Su herramienta `images_upscale` y el catálogo TTI son superficies diferentes; leer el schema antes de pasar
controles de creatividad que sólo estén en la web/API. El motor nativo disponible puede generar/editar el
plate directamente. Después del último pase generativo, componer tipografía y firmas editoriales desde archivos
oficiales. La marca física se resuelve antes como material del objeto, con referencia oficial y revisión propia.
Recetas y límites en la [referencia de conectores](../references/social-production-connectors.md).

## Regla dura: propose → confirm → execute

El estudio **propone y produce**, pero **programar o publicar en vivo pasa SIEMPRE por
confirmación humana explícita**. Nunca dispares `createScheduledPost`, un DM masivo ni una
publicación sin que el operador diga que sí. Es la misma doctrina Full API Parity del portal.

## Gasto gobernado

El saldo/precio de Higgsfield u otro provider es **costo interno**, no Studio Credits. Dentro de Creative
Studio, los créditos miden operaciones generativas gobernadas y provider-neutral. Para operaciones que realmente pasan por ese runtime gobernado, antes de producir:

1. clasifica las operaciones de imagen/video/audio requeridas;
2. ejecuta `estimate → reservation → approval` con rate version vigente;
3. registra attempts y cierra `settlement | release | refund adjustment` según outcome;
4. no cobres dos veces un retry técnico ni traduzcas precio vendor→crédito.

Fuera de ese runtime, respetar el presupuesto y autorización del encargo; no crear reservas ni aprobaciones
ficticias. Una petición de producción autoriza sus pasos reversibles, no una compra o ampliación de gasto.

Copy, layout de carrusel, edición, subtítulos, export, programación, QA y medición devengan **0 Studio Credits**,
aunque consuman capacidad/gobierno. Derechos de creator, whitelisting, música, voz, likeness y paid usage se
autorizan/cotizan aparte. Canon:
`docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`.

## Autenticidad + gobernanza IA

- El grado de pulido responde al concepto y al formato; no existe ganador universal. La IA **acelera**, no reemplaza el juicio de marca.
- Contenido IA que un espectador razonable confundiría con real **debe etiquetarse** ("ante la
  duda, revela"): manos, objetos o personas fotorrealistas generados con IA van con el flag de la red
  (Instagram `isAiGenerated`, YouTube `isAiGeneratedContent`; ver tabla de §Programar por red).
- Brand safety: cura todo output de IA contra marca Efeonce antes de que salga.

### Marca física frente a firma editorial

La composición posterior de logos aplica a firmas gráficas. Para marca en una libreta, envase o prenda,
seguir [brand-in-scene.md](../references/brand-in-scene.md): puede requerir pasar el arte oficial al modelo
para materializar profundidad, textura y luz antes de incorporar el titular exacto.
