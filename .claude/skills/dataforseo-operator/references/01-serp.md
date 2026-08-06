# DataForSEO SERP API — Dossier de investigación (doc oficial)

> **As-of:** 2026-08-06 · Fuente: documentación oficial `docs.dataforseo.com/v3/*` vía WebFetch/WebSearch.
> **Nota de acceso:** las URLs "bonitas" tipo `/v3/serp/` y `/v3/serp-google-locations/` devolvieron **404**; la doc vive bajo slugs con guiones (`/v3/serp-overview/`, `/v3/serp-se-locations/`, etc.). Algunas rutas anidadas (`/v3/serp/google/organic/live/advanced/`) sí resuelven. Cada sección cita la URL exacta que sí cargó.

---

## 1. Resumen ejecutivo

- La SERP API v3 cubre **7 motores**: Google (con ~18 verticales), Bing, YouTube (4 endpoints), Yahoo, Baidu, Naver y Seznam.
- Tres funciones de respuesta: **regular** (orgánico+paid básico), **advanced** (todos los elementos del SERP, soportada en todos los motores) y **html** (página cruda).
- Dos métodos de entrega: **Live** (tiempo real, tier más caro) y **Standard task-based** (`task_post` → `tasks_ready`/pingback → `task_get`), con prioridad normal (1) o alta (2, con recargo).
- **AI Mode** es un vertical propio de Google con endpoints Live/Task (advanced + html) que devuelve el answer completo en **markdown** + `references` (source/domain/url/title/text) — el insumo directo para AEO/monitoreo de citabilidad.
- En **organic**, `ai_overview` es un item type más; el flag `load_async_ai_overview` fuerza la carga del AI Overview asíncrono (con recargo).
- Existe además una sección hermana **AI Optimization API** (`/v3/ai_optimization/*`): LLM Responses (ChatGPT/Claude/Gemini/Perplexity), LLM Scraper, AI Keyword Data y LLM Mentions.
- El costo escala con `depth` (default 10, máx 200, facturado por incrementos), y se **multiplica ×5** si el keyword lleva operadores (`site:`, `filetype:`…) y **×2** con `calculate_rectangles` o `load_async_ai_overview`.
- Endpoints auxiliares: **SERP Screenshot** ($0.004/request, sobre `task_id` previo) y **SERP AI Summary** ($0.01/request, con `prompt` custom) — ambos post-hoc sobre tareas existentes.

---

## 2. Catálogo de motores y verticales

Fuente: [serp/overview](https://docs.dataforseo.com/v3/serp-overview/) + [serp/google (índice)](https://docs.dataforseo.com/v3/serp/google/) + [serp/endpoints](https://docs.dataforseo.com/v3/serp-endpoints/) (as-of 2026-08-06).

### Google (verticales enumerados en la doc)

| Vertical | Notas |
|---|---|
| **Organic** | Advanced, Regular y HTML; Live + Task-based |
| **AI Mode** | Advanced y HTML; Live + Task-based (ver §4) |
| **Maps** | Resultados de mapas/negocios |
| **Local Finder** | Overview, Task POST, Tasks Ready, Task GET y Live |
| **News** | Solo desktop (ver Gotchas) |
| **Events** | Solo desktop |
| **Images** | Solo desktop |
| **Search By Image** | Búsqueda inversa por imagen; solo desktop |
| **Jobs** | Solo desktop |
| **Autocomplete** | Sugerencias/predictivo |
| **Dataset Search** | Datasets científicos |
| **Dataset Info** | Detalle de un dataset |
| **Ads Advertisers** | Perfiles de anunciantes |
| **Ads Search** | Anuncios/transparencia de ads |
| **Finance Explore / Markets / Quote / Ticker Search** | 4 endpoints financieros |

### Otros motores

| Motor | Verticales documentados |
|---|---|
| **Bing** | Organic (Regular/Advanced/HTML; Live + Task-based) — fuente: [serp/bing/overview](https://docs.dataforseo.com/v3/serp-bing-overview/) |
| **YouTube** | Organic · Video Info · Video Subtitles · Video Comments — fuente: [serp/youtube/overview](https://docs.dataforseo.com/v3/serp-youtube-overview/). Video Info y Subtitles se cobran a **3× el precio SERP**; Comments se factura por unidad de 20 resultados |
| **Yahoo** | Organic (per índice de motores en serp/overview) |
| **Baidu** | Organic |
| **Naver** | Organic — existe [serp/naver/overview](https://docs.dataforseo.com/v3/serp-naver-overview/) (no fetched en profundidad) |
| **Seznam** | Organic |

### Funciones de respuesta (cross-engine)

- **Regular**: "organic and paid search results" — solo para tipos Organic; sin featured snippets ni elementos extra.
- **Advanced**: soportada en **todos** los motores de la SERP API; overview completo del SERP.
- **HTML**: HTML crudo de la página de resultados.
Fuente: [serp/overview](https://docs.dataforseo.com/v3/serp-overview/).

---

## 3. Google Organic en detalle

Fuentes: [organic/overview](https://docs.dataforseo.com/v3/serp-google-organic-overview/) · [organic live advanced](https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/) (as-of 2026-08-06).

### 3.1 Parámetros de request (live advanced)

**Núcleo:**
- `keyword` — hasta 700 chars; operadores de búsqueda (`site:`, `filetype:`, `allinanchor:`…) **multiplican el cargo ×5**.
- Localización (una de): `location_code` (int) · `location_name` (string completo, ej. `"London,England,United Kingdom"`) · `location_coordinate` (`"lat,long,radius"`, radio 199–199,999 m).
- Idioma: `language_code` (ISO, ej. `en`) o `language_name`.
- `device`: `desktop` (default) | `mobile`.
- `os`: desktop → `windows` (default) | `macos`; mobile → `android` (default) | `ios`.

**Profundidad/paginación:**
- `depth`: default 10, **máx 200**; se factura por incremento de 10 resultados.
- `max_crawl_pages`: hasta 100 páginas; cada página se cobra por separado.

**Parsing avanzado:**
- `calculate_rectangles` (bool): coordenadas pixel de cada elemento; recargo (~$0.002 / duplica costo según overview).
- `browser_screen_width/height/resolution_ratio`: viewport custom (defaults 1920×1080 desktop, 360×640 Android, 375×812 iOS).
- `load_async_ai_overview` (bool): fuerza el fetch del AI Overview asíncrono; recargo (~$0.002 / ×2 según overview).
- `people_also_ask_click_depth` (1–4): expande PAA con clicks; $0.00015 por click.

**Targeting/control de crawl:**
- `target`: dominio/URL para filtrar resultados, con wildcard `*`.
- `stop_crawl_on_match` (hasta 10 objetos `match_type`: `domain` | `with_subdomains` | `wildcard`).
- `target_search_mode`: `all` | `any` (default).
- `find_targets_in` / `ignore_targets_in`: acotar en qué elementos buscar el target.

**Otros:** `search_param` (operadores de URL de Google; `lr`, `cr`, `as_qdr` no soportados) · `se_domain` (ej. `google.co.uk`) · `group_organic_results` (default true) · `remove_from_url` · `tag` (≤255 chars) · `url` (search URL directa, método menos recomendado).

### 3.2 Item types en la respuesta (advanced)

Orgánico: `organic`, `featured_snippet`, `related_result` · Paid: `paid`, `shopping`, `commercial_units` · Conocimiento: `knowledge_graph`, `answer_box`, `people_also_ask`, `people_also_search`, `related_searches` · Media: `images`, `carousel`, `multi_carousel`, `video`, `top_stories`, `short_videos` · Local: `local_pack`, `local_service`, `map`, `hotels_pack` · Especializados: `jobs`, `events`, `google_flights`, `recipes`, `stocks_box`, `currency_box`, `scholarly_articles`, `twitter`, `third_party_reviews`, `google_reviews`, `questions_and_answers`, `perspectives`, `discussions_and_forums`, **`ai_overview`** · Otros: `find_results_on`, `top_sights`, `popular_products`, `product_considerations`, `refine_products`, `compare_sites`, `app`.

Cada resultado trae `rank_group`, `rank_absolute`, `page`, `position` (left/right), `domain`, `title`, `url`, `description`, `breadcrumb`, `rating`, `price`, `links` (sitelinks), `images`, `highlighted`, `rectangle` (si aplica) y un array `checks` (`is_featured_snippet`, `is_malicious`, `is_web_story`, `amp_version`, `is_highly_cited`…).

### 3.3 Regular vs Advanced vs HTML

- **Regular**: paid + organic; SIN featured snippets ni elementos extra → suficiente para rank tracking básico, más barato.
- **Advanced**: SERP completo con todos los item types de arriba → necesario para SoV, AI Overview y análisis de features.
- **HTML**: página cruda para parsing propio o archivo/evidencia.

---

## 4. AI Mode y AI Overview (AEO)

### 4.1 Google AI Mode (vertical propio)

Fuentes: [ai_mode/overview](https://docs.dataforseo.com/v3/serp-google-ai_mode-overview/) · [ai_mode live advanced](https://docs.dataforseo.com/v3/serp-google-ai_mode-live-advanced/) (as-of 2026-08-06).

- Endpoints: **Live Advanced**, **Live HTML**, y Standard (Task POST / Task GET advanced·html / Tasks Ready).
- Request: `keyword` (≤700 chars), `location_*`, `language_*`, `device`/`os`, `calculate_rectangles` (duplica costo), viewport custom, `tag`.
- Precio citado en la doc del live advanced: **$0.004 por request** (sin rectangles).
- Respuesta (`result`): `keyword`, `type: ai_mode`, `se_domain`, `check_url`, `datetime`, `spell`, `refinement_chips`, `item_types: ["ai_overview"]`, `items`.
- **Item `ai_overview`**: campo **`markdown`** con el answer completo + `items` anidados:
  - `ai_overview_element` (title, text, markdown, links, images, **references**)
  - `ai_overview_video_element`, `ai_overview_table_element` (markdown + tabla headers/rows + references), `ai_overview_expanded_element`, `ai_overview_shopping`, `ai_overview_paid`.
- **`references[]`**: `type: ai_overview_reference`, **`source`, `domain`, `url`, `title`, `text`** → la unidad atómica para medir citabilidad/menciones de marca.
- `links[]`: `link_element` con title/description/url/domain · `images[]`: `images_element` con alt/url/image_url.
- Gotcha declarado por la doc: se ignora personalización/historial; verificar contra incógnito.

### 4.2 AI Overview dentro de Organic

- `ai_overview` es un item type del organic advanced; cuando Google lo carga asíncrono, hay que pasar **`load_async_ai_overview: true`** (recargo) o no aparecerá.
- Diferencia práctica: organic te da el AI Overview *en contexto de SERP completo* (posición, qué features lo rodean); AI Mode te da la *experiencia conversacional completa* con refinement chips.

### 4.3 Sección hermana: AI Optimization API (`/v3/ai_optimization/*`)

Fuente: [ai_optimization/overview](https://docs.dataforseo.com/v3/ai_optimization-overview/) (as-of 2026-08-06). Es OTRA sección de la doc (no SERP), pero clave para AEO:

1. **LLM Responses API** — respuestas estructuradas en tiempo real de **ChatGPT, Claude, Gemini** (Standard+Live) y **Perplexity** (solo Live); endpoints de modelos disponibles por proveedor.
2. **LLM Scraper API** — resultados scrapeados de búsquedas en ChatGPT y Gemini (Task POST/GET, Live, HTML).
3. **AI Keyword Data API** — estimaciones de volumen e intención de keywords en herramientas de IA (solo Live).
4. **LLM Mentions API** — tracking de menciones de keyword/marca/sitio en LLMs: AI search volume, impresiones, top mentioned domains/pages/brands, histórico y timeseries (+ versiones lite).

---

## 5. Live vs Task-based · costos y colas

Fuentes: [serp/overview](https://docs.dataforseo.com/v3/serp-overview/) · [organic/overview](https://docs.dataforseo.com/v3/serp-google-organic-overview/) · [task_post](https://docs.dataforseo.com/v3/serp-google-type-task_post/) (as-of 2026-08-06).

- **Live**: resultado inmediato en la misma llamada; **tier de precio más alto**.
- **Standard**: `task_post` → (`tasks_ready` | `pingback_url`/`postback_url`) → `task_get`. Más barato; dos colas:
  - `priority: 1` (normal, default) — más lento, más barato.
  - `priority: 2` (high) — "You will be additionally charged for the tasks with high execution priority".
- Cargo al **setear** la tarea ("charged only for setting a task"); la página de task_post cita ~$0.0015 por tarea estándar (verificar contra la pricing page para números vigentes).
- **Fórmula de costo** (organic overview): `cost = B × C × K × (D/default)` donde B = precio base método/prioridad; **C = ×2** si `calculate_rectangles` o `load_async_ai_overview`; **K = ×5** si el keyword lleva operadores; **D = depth** redondeado hacia arriba.
- Rate limits: **2,000 llamadas API/min** en total; **máx 100 tareas por POST** (error `40006` si excede).
- Pingback = GET de notificación; Postback = POST con resultados gzip; si tu server no responde en 10 s, timeout. Soportan variables `$id`, `$tag`.
- Precios exactos por método/prioridad viven en `dataforseo.com/pricing` (no en la doc técnica).

---

## 6. Locations y Languages (apéndice)

Fuente: [serp/locations](https://docs.dataforseo.com/v3/serp-se-locations/) (as-of 2026-08-06).

- `GET /v3/serp/{se_name}/locations` — lista completa por motor.
- `GET /v3/serp/{se_name}/locations/{country}` — filtrado por país.
- Campos: `location_code`, `location_name`, `location_code_parent` (jerarquía), `country_iso_code`, `location_type` (Country, State, City, Airport…).
- `GET /v3/serp/{se_name}/languages` — idiomas soportados por motor (`language_name`, `language_code`).
- CSVs descargables para Google, Bing, Yahoo y YouTube (last updated 2026-07-20 según la doc).
- Llamar estos endpoints de apéndice **no se cobra** ("Your account will not be charged for using this API call", per serp/endpoints).
- Alternativa a locations: `location_coordinate` con lat/long/radius directamente en el task (§3.1).

---

## 7. Gotchas

1. **SERPs volátiles**: los resultados corresponden al momento de ejecución de la tarea, sin personalización; la propia doc recomienda verificar contra modo incógnito. Dos corridas pueden diferir — para tracking histórico, fijar location/language/device y guardar snapshots.
2. **Depth encarece silenciosamente**: default 10; subir depth multiplica el costo por incremento (D/default en la fórmula). `max_crawl_pages` también cobra por página.
3. **Operadores = ×5**: un keyword con `site:` o `filetype:` quintuplica el cargo.
4. **AI Overview asíncrono**: sin `load_async_ai_overview: true` puedes recibir SERPs "sin" AI Overview que sí lo tienen — falso negativo para monitoreo AEO. El flag duplica el costo.
5. **Device defaults**: `desktop`/`windows` por defecto; los SERPs mobile difieren materialmente. Google News/Events/Images/Search By Image/Jobs están **solo en desktop** (per serp/overview).
6. **`depth` en advanced cuenta ítems, no solo orgánicos** (facturación por bloques de 10/20 según vertical — YouTube Comments por 20; verificar por endpoint).
7. **Screenshot y AI Summary son post-hoc**: requieren `task_id` de una tarea previa (screenshot: ventana de 7 días y la imagen guardada expira en 1 día; ai_summary: task_id válido 30 días).
8. **Regular ≠ Advanced**: si mides share of voice o features, regular no basta (no trae snippets/elementos extra).
9. **URLs de doc**: los slugs canónicos usan guiones (`serp-google-ai_mode-overview`); varias URLs "de carpeta" devuelven 404.
10. **Postback timeout**: 10 s para responder o se aborta la conexión; diseñar el receptor como ack-rápido + proceso async (patrón outbox).

---

## 8. Oportunidades de máximo provecho

1. **Rank tracking histórico barato**: Standard queue prioridad normal + `depth` mínimo viable + regular para posiciones puras; advanced solo donde se necesita el desglose de features. `tag` + postback para correlacionar con el pipeline propio.
2. **Share of Voice real**: advanced con `item_types` completos permite SoV ponderado por feature (organic + local_pack + PAA + shopping + ai_overview), no solo blue links. `rank_absolute` + `rectangle` (pixel data) habilita SoV "above the fold".
3. **Monitoreo AEO de AI Overviews**: organic advanced + `load_async_ai_overview` para presencia/ausencia del AI Overview por keyword, y **AI Mode advanced** para extraer `references[]` (domain/url/title) → medir cuándo citan al cliente vs competidores. El `markdown` del answer permite diff temporal del contenido.
4. **Stack AEO completo**: combinar SERP AI Mode con la **AI Optimization API** (LLM Mentions para menciones de marca en ChatGPT/Gemini/etc.; AI Keyword Data para volumen en herramientas IA) — cubre Google + LLMs de terceros desde un solo proveedor.
5. **Evidencia visual**: SERP Screenshot ($0.004) sobre el mismo `task_id` = captura auditable del SERP para reporting a cliente (descargar dentro de 1 día).
6. **`target` + `stop_crawl_on_match`**: para rank tracking de un dominio, cortar el crawl al encontrarlo → paga menos depth en promedio.
7. **PAA mining**: `people_also_ask_click_depth` (1–4) expande el árbol de preguntas a $0.00015/click — insumo barato para clusters de contenido/FAQ schema.
8. **AI Summary como capa de análisis**: `prompt` custom sobre un SERP ya pagado ($0.01) para clasificación de intención o resumen competitivo sin egress del HTML.

---

## 9. Fuentes (URLs verificadas, as-of 2026-08-06)

| Sección | URL | Estado |
|---|---|---|
| SERP overview (motores, métodos, colas) | https://docs.dataforseo.com/v3/serp-overview/ | OK |
| Índice Google (verticales) | https://docs.dataforseo.com/v3/serp/google/ | OK |
| Lista de endpoints | https://docs.dataforseo.com/v3/serp-endpoints/ | OK |
| Google organic overview (fórmula de costo) | https://docs.dataforseo.com/v3/serp-google-organic-overview/ | OK |
| Google organic live advanced (params + item types) | https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/ | OK |
| AI Mode overview | https://docs.dataforseo.com/v3/serp-google-ai_mode-overview/ | OK |
| AI Mode live advanced (markdown + references) | https://docs.dataforseo.com/v3/serp-google-ai_mode-live-advanced/ | OK |
| AI Optimization overview (LLM Responses/Scraper/Keyword Data/Mentions) | https://docs.dataforseo.com/v3/ai_optimization-overview/ | OK |
| Bing overview | https://docs.dataforseo.com/v3/serp-bing-overview/ | OK |
| YouTube overview | https://docs.dataforseo.com/v3/serp-youtube-overview/ | OK |
| Naver overview (existencia) | https://docs.dataforseo.com/v3/serp-naver-overview/ | Visto en búsqueda, no fetched |
| Task POST (priority, límites, pingback/postback) | https://docs.dataforseo.com/v3/serp-google-type-task_post/ | OK |
| Locations apéndice | https://docs.dataforseo.com/v3/serp-se-locations/ | OK |
| SERP Screenshot | https://docs.dataforseo.com/v3/serp_screenshot/ | OK |
| SERP AI Summary | https://docs.dataforseo.com/v3/serp-ai_summary/ | OK |
| `/v3/serp/` · `/v3/serp-google-locations/` | — | **404** (slugs con guiones son los canónicos) |

**Caveat de fidelidad**: las páginas se leyeron vía WebFetch (resumen asistido sobre el HTML real). Los números de precio citados ($0.004 AI Mode live advanced, $0.0015 task estándar, $0.002 recargos, $0.00015 PAA click, $0.004 screenshot, $0.01 ai_summary) aparecen en las páginas citadas as-of 2026-08-06, pero la fuente vigente de pricing es `dataforseo.com/pricing` — reconfirmar antes de modelar unit economics.
