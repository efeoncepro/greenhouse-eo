# DataForSEO AI Optimization API — deep-dive operativo

> **As-of:** 2026-08-06. Todo lo afirmado abajo fue verificado contra páginas reales de `docs.dataforseo.com` / `dataforseo.com` cargadas hoy (URLs exactas en §Fuentes). Lo NO verificable se declara explícitamente.
> **Nota de slugs:** los índices "bonitos" (`/v3/ai_optimization/`) no son las URLs de doc; los slugs canónicos usan guiones (`/v3/ai_optimization-overview/`, `/v3/ai_optimization-llm_mentions-target_metrics-live/`). Los paths de API sí usan slashes (`/v3/ai_optimization/chat_gpt/llm_responses/live`).
> **Revisión 2026-09-11:** el documento fue ampliado con una segunda pasada sobre la doc del proveedor (62 páginas de `docs.dataforseo.com` bajo `/v3/ai_optimization/**`, pricing, Help Center y páginas de producto). Lo que trae esa pasada va marcado **(delta 2026-09-11)** o con la nota `verificado 2026-09-11`; lo anterior sigue siendo lo verificado el 2026-08-06. Donde las dos pasadas dicen cosas distintas, **ambas quedan en el texto con su fecha** y se explica la discrepancia.
> **Corrección a la nota de slugs (verificado 2026-09-11):** los paths con **slashes también resuelven** en la doc — los 62 slugs de la segunda pasada cargaron con esa forma (p.ej. `https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/overview/`). Las dos formas funcionan; lo que NO se sostiene hoy es que la forma con slashes dé 404. En particular `…/ai_optimization/chat_gpt/llm_scraper/task_post/` carga sin problema: el 404 de agosto fue del slug con guiones.
> **Versiones de API observadas en los ejemplos (2026-09-11):** `0.1.20250526` (AI Keyword Data), `0.1.20251208` (LLM Mentions).

---

## Resumen ejecutivo

La sección `/v3/ai_optimization/` tiene **4 productos**:

| Producto | Qué es | Método | Plataformas |
|---|---|---|---|
| **LLM Responses** | Llamar LLMs reales (73 modelos) vía una API unificada, con web search y citas | Live + task-based (parcial) | ChatGPT, Claude, Gemini, Perplexity |
| **LLM Scraper** | Scrape de la **superficie de chat real** (respuesta renderizada + fuentes + productos/local/ads) | Live + task-based | ChatGPT, Gemini (solo esos dos) |
| **AI Keyword Data** | "AI search volume" conversacional por keyword (+12 meses de histórico) | Live only | métrica agregada (derivada de PAA) |
| **LLM Mentions** | **Base de datos longitudinal de menciones/citas** de marcas y dominios en respuestas AI, con timeseries, new/lost y tops | Live only | ChatGPT + Google AI Overview |

Claves económicas: LLM Responses live cuesta **$0.0006 + el costo del LLM**; standard **$0.0002 + $0.01 de prepago** (se reembolsa la diferencia). Scraper: **$0.0012–$0.004 por página** según cola. AI Keyword Data: **$0.01/task + $0.0001/keyword** (~$110 por 1M). Mentions: **$0.1/request + $0.001/fila** (desde ~$1.1 por 1.000 filas; el compromiso mensual de $100 fue **eliminado**).

Claves de alcance: la base de Mentions **solo cubre ChatGPT y Google AI Overview**, con dato ChatGPT **limitado a United States/English**, e **histórico desde 2025-08-01**. AI Keyword Data cubre **94 locations multi-idioma**.

---

## 0. Inventario de rutas, endpoints gratuitos y límites transversales

> **(Sección nueva, delta 2026-09-11.)** La pasada de agosto describía los 4 productos pero no enumeraba la superficie completa ni separaba lo gratuito de lo facturable.

**54 rutas documentadas = 52 endpoints vigentes + 2 alias legacy**: LLM Mentions 17 (+2 legacy) · AI Keyword Data 2 · LLM Responses 17 · LLM Scraper 16.

### 0.1 LLM Mentions — 17 vigentes + 2 legacy

Los 15 endpoints de datos son todos `POST …/llm_mentions/<nombre>/live` (§4.1 los lista con su semántica). Se suman dos GET **gratuitos**:

| Ruta | Método | Nota |
|---|---|---|
| `…/llm_mentions/locations_and_languages` | GET gratis | devuelve `responses_count` por location×language (§4.7) |
| `…/llm_mentions/available_filters` | GET gratis | catálogo de campos filtrables **por endpoint**. También descargable como JSON: `https://cdn.dataforseo.com/v3/available_filters.php?api=ai_optimization/llm_mentions` |

**Alias legacy** (funcionan, pero no para integraciones nuevas):

| Legacy | Reemplazado por |
|---|---|
| `…/llm_mentions/search/live` | `…/llm_mentions/search_mentions/live` |
| `…/llm_mentions/aggregated_metrics/live` | `…/llm_mentions/target_metrics/live` |

Ambas páginas dicen textual *"This endpoint has been replaced by …"* y *"The current path … will continue to be supported for the foreseeable future (no deprecation date is set), but all new integrations must use the new path."* No hay fecha de corte publicada. ⚠️ La pasada de agosto anotaba `search/live` como si fuera un índice alterno del mismo endpoint; **no lo es: es el alias legacy** (verificado 2026-09-11). Si aparece código apuntando a cualquiera de los dos, funciona, pero hay que migrarlo.

### 0.2 LLM Responses — 5 rutas por plataforma (Perplexity, 2)

| Ruta | Método | chat_gpt | claude | gemini | perplexity |
|---|---|---|---|---|---|
| `…/{plataforma}/llm_responses/live` | POST | ✓ | ✓ | ✓ | ✓ |
| `…/{plataforma}/llm_responses/task_post` | POST | ✓ | ✓ | ✓ | ✗ (404) |
| `…/{plataforma}/llm_responses/tasks_ready` | GET gratis | ✓ | ✓ | ✓ | ✗ |
| `…/{plataforma}/llm_responses/task_get/$id` | GET gratis | ✓ | ✓ | ✓ | ✗ |
| `…/{plataforma}/llm_responses/models` | GET gratis | ✓ | ✓ | ✓ | ✓ |

**Perplexity solo tiene `live` + `models`**: el probe a `…/perplexity/llm_responses/task_post/` devuelve **404** (verificado 2026-09-11) y el overview lo dice textual — *"ChatGPT, Gemini, and Claude support both methods. Perplexity supports only Live retrieval."*

### 0.3 LLM Scraper — 8 rutas por plataforma (`chat_gpt`, `gemini`)

`task_post` (POST) · `tasks_ready` (GET gratis) · `task_get/advanced/$id` (GET gratis) · `task_get/html/$id` (GET gratis) · `live/advanced` (POST) · `live/html` (POST) · `locations` (GET gratis; en ChatGPT además `locations/$country`) · `languages` (GET gratis).

⚠️ **No existe `task_get/regular`** en LLM Scraper — el probe devuelve 404 (verificado 2026-09-11). Solo hay `advanced` y `html`. Es un error fácil de cometer por analogía con SERP API.

### 0.4 AI Keyword Data — 2 rutas

`keywords_search_volume/live` (POST) + `locations_and_languages` (GET gratis).

### 0.5 Qué es gratis

El proveedor dice literal *"Your account will not be charged"* en: los `models` de las 4 plataformas · `tasks_ready` (Responses y Scraper) · `locations` y `languages` del Scraper · `locations_and_languages` de Mentions y de AI Keyword Data · `available_filters` de Mentions.

`task_get` no cobra aparte: *"Your account will be charged only for posting a task. You can get the results of the task within the next 30 days for free."*

⚠️ **Regla operativa:** todo preflight — catálogo de modelos vivo, cobertura y densidad por mercado, campos filtrables — se hace con GETs gratuitos **antes** de gastar. Eso exige transporte GET, que hoy `postDataForSeoTask` no cubre (ver §7, Encaje Greenhouse).

### 0.6 Límites transversales que no estaban por sub-API

Los rate limits por producto ya están en §1.4, §2 y §3. Estos aplican a toda la familia:

| Límite | Valor |
|---|---|
| `tasks_ready` | 20 llamadas/min · 1.000 tareas por llamada · solo tareas completadas en los **3 días previos**; lo no recogido en 3 días se pierde |
| Retención de resultados | `task_get` disponible **30 días**, sin cargo adicional |
| Timeout de pingback/postback | **10 s**; si tu servidor no responde, la tarea vuelve a `tasks_ready` |
| Balance negativo | *"if your account balance is negative, you will not receive the results even if the task is completed successfully"* — la tarea se ejecuta, se cobra y el resultado se pierde |
| Retraso de `tasks_ready` | *"the queue of completed tasks is updated with a small delay, which can be an issue for high-volume users"* → sobre ~1.000 tareas/min, usar pingback/postback |
| Auth | HTTP Basic (`login:password` en base64) |
| Encoding | POST en JSON UTF-8 |
| Geo prohibido | Rusia y Bielorrusia no soportadas en toda la plataforma |
| Sandbox | `https://sandbox.dataforseo.com/v3/` — gratis, estructura idéntica, **datos dummy**. Las páginas de AI Optimization dicen que se puede testear ahí; ⚠️ el appendix de Sandbox **no** enumera AI Optimization entre las APIs cubiertas — verificar antes de apoyarse en él |

---

## 1. LLM Responses

Paths por proveedor: `/v3/ai_optimization/{chat_gpt|claude|gemini|perplexity}/llm_responses/{models|task_post|tasks_ready|task_get|live}`.

### 1.1 Catálogo de modelos (endpoint `GET .../llm_responses/models` por proveedor)

Cada modelo trae 3 flags: `reasoning`, `web_search_supported`, `task_post_supported`.

**ChatGPT — 33 modelos** (as-of hoy; familias):
- Reasoning o-series: `o4-mini`, `o4-mini-2025-04-16`, `o3-mini`, `o3-mini-2025-01-31`, `o1`, `o1-2024-12-17`
- GPT-5: `gpt-5`, `gpt-5-2025-08-07`, `gpt-5-mini`, `gpt-5-mini-2025-08-07`, `gpt-5-nano`, `gpt-5-nano-2025-08-07`
- GPT-4o: `gpt-4o` (variantes 2024-05-13 / 2024-08-06 / 2024-11-20), `gpt-4o-mini` (2024-07-18), `gpt-4.1-nano`
- Legacy: `gpt-3.5-turbo-1106`
- Los 4o priorizan web search; o-series/gpt-5 priorizan reasoning.

**Claude — 14 modelos** (todos con `task_post_supported=✓`):
`claude-sonnet-4-0`, `claude-sonnet-4-20250514`, `claude-opus-4-0`, `claude-opus-4-20250514` (reasoning+web search); `claude-3-7-sonnet-latest`/`-20250219` (reasoning+web search); `claude-3-5-sonnet-latest`/`-20241022` (web search, sin reasoning), `claude-3-5-sonnet-20240620` (ni uno ni otro); `claude-3-5-haiku-latest`/`-20241022` (web search); `claude-3-opus-latest`/`-20240229`, `claude-3-haiku-20240307` (sin web search).

**Gemini — 23 modelos** (⚠️ **NINGUNO soporta task_post** — Gemini es live-only):
- 2.5 (reasoning + web search): `gemini-2.5-pro` (+3 previews), `gemini-2.5-flash` (+preview), `gemini-2.5-flash-lite` (+preview)
- 2.0: `gemini-2.0-flash`/`-001` (web search); `gemini-2.0-flash-lite` y variantes (sin web search)
- 1.5 (web search): `gemini-1.5-pro`/`-002`/`-latest`, `gemini-1.5-flash`/`-002`/`-latest`, `gemini-1.5-flash-8b`/`-001`/`-latest`

**Perplexity — 3 modelos** (⚠️ live-only, todos con web search):
`sonar`, `sonar-pro`, `sonar-reasoning-pro` (único con reasoning).

**Delta 2026-09-11 — el catálogo rota y el número de ChatGPT no cuadra entre pasadas.** El 2026-09-11 el ejemplo del endpoint `models` de ChatGPT trae **20 identificadores**, no 33: mismas familias (o4-mini ×2, o3-mini ×2, o1 ×2, gpt-5/mini/nano ×6, gpt-4o ×4, gpt-4o-mini ×2, gpt-4.1-nano, gpt-3.5-turbo-1106) pero sin varias variantes fechadas que sí aparecían el 2026-08-06. **Las dos lecturas quedan porque ninguna es contractual**: lo que la doc publica es un *ejemplo de respuesta*, y el catálogo real rota. ⚠️ **SIEMPRE** llamar `GET …/llm_responses/models` (gratis, §0.5) antes de fijar un `model_name` en código o en un plan de medición; **NUNCA** hardcodear la lista desde este documento. Claude (14), Gemini (23) y Perplexity (3) coinciden en ambas pasadas. Detalle menor: la doc de `live` usa `gpt-4.1` → `gpt-4.1-2025-04-14` como ejemplo de resolución de versión, aunque `gpt-4.1` no figura en el listado de ejemplo.

⚠️ **Contradicción abierta sobre Gemini + `task_post` (verificado 2026-09-11).** La pasada de agosto concluyó "Gemini es live-only" desde el flag `task_post_supported: false` de sus 23 modelos. La pasada de septiembre confirma ese flag **y a la vez** confirma que Gemini tiene páginas propias de `task_post`, `tasks_ready` y `task_get` (§0.2) y que el overview de LLM Responses dice textual *"ChatGPT, Gemini, and Claude support both methods"*. Es una **inconsistencia del proveedor**, no una lectura ambigua: ambas afirmaciones quedan. Antes de construir un pipeline Standard sobre Gemini hay que leer el flag en el `models` en vivo y, si sale `false`, probar un `task_post` real; si falla, la única ruta es `live`. Perplexity sí es live-only sin ambigüedad (§0.2: su `task_post` da 404).

### 1.2 Parámetros (Live: `POST /v3/ai_optimization/{provider}/llm_responses/live`)

| Param | Tipo | Req | Default | Notas |
|---|---|---|---|---|
| `user_prompt` | string | ✓ | — | **máx 500 chars** |
| `model_name` | string | ✓ | — | nombre base usa la última versión |
| `max_output_tokens` | int | — | 2048 | 16–4096 (reasoning: 1024–4096) |
| `temperature` | float | — | 0.94 | 0–2; **incompatible con `top_p`**; no soportado en reasoning models |
| `top_p` | float | — | 0.92 | 0–1 |
| `web_search` | bool | — | false | habilita acceso a web actual |
| `force_web_search` | bool | — | false | fuerza la búsqueda (requiere `web_search`) |
| `web_search_country_iso_code` | string | — | — | geo del search (requiere `web_search`) |
| `web_search_city` | string | — | — | ciudad (requiere `web_search`) |
| `system_message` | string | — | — | máx 500 chars |
| `message_chain` | array | — | — | historial, máx 10 mensajes |
| `tag` | string | — | — | máx 255 chars |

Task POST (`.../task_post`): mismos params + `postback_url`/`pingback_url`; **≤100 tasks por POST** (error `40006` si excede); turnaround **hasta 72 h** — si no completa, se reembolsa el prepago.

**Delta 2026-09-11 — los rangos y defaults NO son iguales entre plataformas.** La tabla de arriba refleja los valores de **ChatGPT**. Los reales por proveedor:

| Parámetro | ChatGPT | Claude | Gemini | Perplexity |
|---|---|---|---|---|
| `max_output_tokens` mínimo | 16 (1024 si reasoning) | 1 (**1025** con `use_reasoning`) | 1 (**1024** con `use_reasoning`) | 1 |
| `temperature` rango / default | 0–2 / **0.94**; no soportado en reasoning | 0–1 / **0.7** | 0–2 / **1.3** | 0–1.9 / **0.77** |
| `top_p` default | 0.92 | **null** | 0.9 | 0.9 |
| `web_search` | ✓ (default false) | ✓ (default false) | ✓ (default false) | ✗ — *"Perplexity uses web_search in all sonar-family models by default, but it's not guaranteed to work with every request"* |
| `force_web_search` | ✓ (no en reasoning) | ✓ | ✗ | ✗ |
| `web_search_country_iso_code` | ✓ (no en `o3-mini`, `o1-pro`, `o1`) | ✓ — **lista cerrada de 36 ISO, incluye `CL`** | ✗ | ✓ (solo modelos Sonar) |
| `web_search_city` | ✓ (mismas exclusiones) | ✓ | ✗ | ✗ |
| `use_reasoning` | ✗ (implícito en el modelo) | ✓ default false; con `true`, `force_web_search` debe ser `false` y **no** se admiten `temperature`/`top_p` | ✓ default false; **en modelos Gemini Pro se fuerza a `true`** | ✗ |
| `message_chain` | libre | libre | libre | **debe alternar estrictamente `user` → `ai`** |

`message_chain` en todas: hasta 10 objetos `{role: "user"\|"ai", message}`, cada `message` ≤500 chars.

⚠️ **Para monitoreo con geo Chile, el único proveedor con lista publicada que incluye `CL` es Claude:** `AR, AT, AU, BE, BR, CA, CH, CL, CN, DE, DK, ES, FI, FR, GB, HK, ID, IN, IT, JP, KR, MX, MY, NL, NO, NZ, PH, PL, PT, RU, SA, SE, TR, TW, US, ZA`. Esa lista incluye `RU` pese a que la plataforma declara Rusia no soportada (§0.6) — contradicción documental, no asumir que funciona.

**Task POST (delta):** `postback_url` acepta las variables `$id` y `$tag` y entrega los resultados **gzip por POST**; `pingback_url` es una notificación GET. **No hay `priority`** en LLM Responses (sí en el Scraper, §2).

### 1.3 Respuesta

`result`: `model_name`, `input_tokens`, `output_tokens`, `reasoning_tokens` (solo reasoning models), `web_search` (bool: si usó búsqueda), **`money_spent`** (USD del call — clave para el spend ledger), `datetime`, `fan_out_queries`, `items[]`:
- `reasoning` (secciones de pensamiento, solo reasoning models)
- `message.sections` (texto)
- `message.annotations[]` = **citas**: `title`, `url`, `start_index`, `end_index`, `text`

**Delta 2026-09-11 — caveats de `annotations` y forma por plataforma:**

- `annotations` es **`null` si `web_search` no es `true`**, y puede volver **vacío aun con `web_search: true`**: *"the AI will attempt to retrieve web information but may not find relevant results"*. Cero citas **no** prueba ausencia de citabilidad; puede ser que el modelo no haya buscado.
- 🔴 **Gemini: `annotations[].url` es un redirect de Vertex AI** — *"redirect URL to the quoted source — contains a Vertex AI redirect that leads to the original source"*. **NUNCA** agrupar citas de Gemini por dominio sin resolver el redirect: el resultado pone `vertexaisearch.cloud.google.com` como fuente dominante, que es **basura analítica**. Resolver el redirect es un paso obligatorio del pipeline y hay que presupuestarlo (latencia + reintentos + caché de destino).
- El bloque `reasoning` **no está garantizado** aun en modelos reasoning (*"is not guaranteed to be returned"*) y **no existe en Perplexity**.
- En Perplexity `items[]` es más plano: no hay envoltorio `reasoning`/`message`, `type` y `sections` van al mismo nivel. Un parser único para las 4 plataformas tiene que contemplarlo.
- `max_output_tokens` **puede excederse** cuando `web_search: true` o el modelo es reasoning.
- Contabilidad: `result.money_spent` es *"the price charged by the third-party AI model provider"* (solo tokens del tercero); **`tasks[].cost` "includes the base task price plus the money_spent value"**. Para el spend ledger el número correcto es **`tasks[].cost`**, no `money_spent`.

### 1.4 Costos y límites

- **Live: $0.0006 + precio cobrado por el LLM** (turnaround ≤120 s).
- **Standard: $0.0002 + $0.01** — "$0.01 is an automatic prepayment required to execute the task. The final price depends on the price charged by the corresponding LLM's API – if it's less than $0.01, the difference is refunded to the account balance." Turnaround ≤72 h.
- Límites: **30 tasks live simultáneas por cuenta por plataforma**, 2.000 calls/min, ejecución ≤120 s.
- ⚠️ Task-based (el barato) solo aplica donde `task_post_supported=✓`: **todo Claude, la mayoría de ChatGPT; Gemini y Perplexity NO** (live-only).

---

## 2. LLM Scraper

Scrapea la **superficie de producto** (lo que un usuario ve en ChatGPT search / Gemini), no el API del modelo. Solo **ChatGPT y Gemini** hoy.

Paths (por superficie `chat_gpt` | `gemini`): `/v3/ai_optimization/{surface}/llm_scraper/{task_post|tasks_ready|task_get/advanced|task_get/html|live/advanced|live/html|locations|languages}`.

### Params (Live Advanced)

- `keyword` (✓, hasta **2.000 chars** — cabe un prompt largo)
- `location_name` | `location_code` (✓; Gemini acepta además `location_coordinate`)
- `language_name` | `language_code` (✓)
- `force_web_search` (bool, ChatGPT): "the AI model is forced to access and cite current web information"
- `tag`

**Delta 2026-09-11 — parámetros que faltaban:**

| Param | Notas |
|---|---|
| `keyword` | ≤2.000 chars; `%##` se decodifica (`+` → espacio); usar `%25` para `%` y `%2B` para `+` |
| `priority` | **1** = normal (default), **2** = alta (cobra más). ⚠️ Solo en `task_post`: los `live/*` **no aceptan** `priority`, `postback_*` ni `pingback_*` |
| `location_coordinate` | solo Gemini; `"lat,lng,radius"`, máx 7 decimales, radio **199–199999 (mm)** |
| `expand_citations` | default `false`; en ChatGPT **requiere `force_web_search: true`**; *"the HTML endpoint will return data from the expanded citation bar"*. ⚠️ El `live/advanced` de Gemini **no** lo acepta |
| `postback_data` | **obligatorio si hay `postback_url`**: `advanced` \| `html` |

`force_web_search` en el Scraper tiene su propio caveat: *"even if the parameter is set to true, there is no guarantee web sources will be cited"*. Batch: `task_post` hasta 100 tareas por POST; Live, 1 por llamada. Los endpoints `/html` (`live/html`, `task_get/html`) devuelven la página cruda al mismo precio por results page — útiles para auditar el parseo o capturar elementos que `advanced` todavía no tipifica.

### Respuesta (lo diferencial vs LLM Responses)

- ChatGPT item types: `chat_gpt_text` (markdown + `sources`), `chat_gpt_table`, `chat_gpt_images`, **`chat_gpt_products`** (precio, rating, merchants, ids de Google Shopping), **`chat_gpt_local_businesses`** (dirección, teléfono, rating), `chat_gpt_navigation_list`, **`chat_gpt_ad`** (título, snippet, advertiser).
- Gemini item types: `gemini_text`, `gemini_table`, `gemini_images` (Gemini usa la variante "Fast"; sin designación "AI Mode" separada).
- `sources[]` por item: `title`, `url`, `domain`, `snippet`, `source_name`, `publication_date`, thumbnail — "the sources the model actually cited or relied on in its final answer".
- Extras top-level: `markdown` (respuesta completa), `search_results` (todo lo que el modelo recuperó de la web), **`brand_entities`** (marcas mencionadas + categoría + URLs), `fan_out_queries`.

### Costos (por "results page")

| Cola | Precio | Turnaround |
|---|---|---|
| Standard | **$0.0012** | ≤45 min |
| Priority | **$0.0024** | ≤5 min |
| Live | **$0.004** | ≤90 s |

Mismo precio para ChatGPT y Gemini. Límites: 2.000 calls/min, 1 task por call live, ejecución ≤120 s.

**Delta 2026-09-11 — Gemini NO es simétrico con ChatGPT en la respuesta.** El `live/advanced` de Gemini **no devuelve** `check_url`, **ni** `search_results[]` de alto nivel, **ni** `brand_entities[]`, **ni** `fan_out_queries[]`; sus `sources[]` usan `type: 'gemini_source'` y sus items agregan `original_text` (*"unformatted text content of the element"*), que ChatGPT no tiene. Los extras top-level listados arriba son, en la práctica, **de ChatGPT**. 🔴 Consecuencia comercial: **la extracción de brand entities —probablemente lo más vendible del Scraper— existe solo para ChatGPT**; para Gemini hay que extraer marcas por cuenta propia desde `markdown`/`original_text`.

Otros deltas de la respuesta de ChatGPT:

- `model` es **read-only** (*"indicates the model version"*): el Scraper **no acepta `model_name`** — obtienes el modelo que el producto sirvió, no el que elijas.
- `check_url` = *"direct URL to search engine results, you can use it to make sure that we provided exact results"* → evidencia auditable para un informe de cliente.
- Cada item trae `rank_group` y `rank_absolute`, es decir **posición**, que LLM Responses no entrega en ninguna forma.
- `chat_gpt_images` expone `image_url` que puede apuntar al **storage de DataForSEO** cuando el original no está disponible.
- `chat_gpt_local_businesses` trae `rating.rating_type` (`Max5` \| `Percents` \| `CustomMax`) — no asumir escala 1–5.

**Cobertura (verificado 2026-09-11):** ChatGPT **215 locations** y **43 languages** (CSV *"last updated 2026-09-01"*); Gemini **213 locations**, **43 languages**. El filtro `locations/$country` (por ISO de país) solo está documentado en ChatGPT. ⚠️ Esta es la **única** superficie de la familia que entrega dato de ChatGPT con location Chile (ver §4.2 y §7.2).

⚠️ **Turnaround contradictorio dentro de la propia página de pricing:** el texto narrativo dice *"the Standard method … includes two priorities: normal (up to 5 minutes) and high (up to 1 minute)"*, mientras las tarjetas de esa misma página dicen Standard ≤45 min / Priority ≤5 min. **Las tarjetas son las buenas** — coinciden con la doc técnica y con los precios; el párrafo narrativo está desactualizado. A eso se suma que la doc técnica declara ejecución ≤120 s donde el pricing dice ≤90 s para Live.

---

## 3. AI Keyword Data

Un solo endpoint de datos: `POST /v3/ai_optimization/ai_keyword_data/keywords_search_volume/live` (**Live only**) + `GET .../ai_keyword_data/locations_and_languages`.

- Input: `keywords[]` (**≤1.000 por request**, ≤250 chars c/u, se convierten a lowercase, UTF-8), `location_name|location_code` (✓), `language_name|language_code` (✓), `tag`.
- Output por keyword: **`ai_search_volume`** (tasa actual estimada de uso en herramientas AI) + **`ai_monthly_searches[]`** (year/month/ai_search_volume, últimos 12 meses).
- ⚠️ Metodología declarada: "AI Search Volume values are calculated using statistical data from questions in the 'People Also Ask' SERP element" — es un **proxy estadístico**, no logs reales de chats.
- Cobertura: **94 locations**, multi-idioma (p.ej. Venezuela/español, Argelia/francés+árabe); Rusia y Bielorrusia excluidas.
- Costo: **$0.01 por task + $0.0001 por item** → "$110 for 1M keywords". Turnaround ~2 s. Límites: 2.000 calls/min, 30 requests simultáneos, 1 task por call.

**Delta 2026-09-11:**

- ⚠️ Acá `location_*` y `language_*` son **obligatorios** (a diferencia de LLM Mentions, donde tienen default `2840`/`en`). No hay `filters`, `order_by`, `limit` ni `offset`.
- 🔴 **La serie trae ceros al inicio y rompen cualquier YoY.** Ejemplo real del doc: `iphone` → `ai_search_volume: 407838`, con meses previos 413611 / 641232 / 634043 / 650448 / 420931… y **`0` en jun–ago 2024**. Esos ceros no son "cero demanda": indican que la serie no tiene cobertura antes de ~sep-2024. Un YoY que no los excluya produce "crecimiento infinito" espurio.
- **Economía del batch:** con tope de 1.000 keywords y cobro `$0.01/task + $0.0001/keyword`, mandar 10 keywords cuesta $0.011 (**$0.0011 por keyword**) y mandar 1.000 cuesta $0.11 (**$0.00011 por keyword**) — **10x más barato por keyword**. Llenar siempre el batch.
- El histórico se llama `ai_monthly_searches[]` acá, pero en LLM Mentions el equivalente por ítem es `monthly_searches[]` con `search_volume`. Nombres distintos: no mapear a ciegas.
- El `locations_and_languages` de esta sub-API **no** trae `responses_count` (el de Mentions sí — §4.7).
- Metodología: ver **§4.5**, porque `ai_search_volume` **no se calcula igual** acá que dentro de LLM Mentions.

---

## 4. LLM Mentions (el producto más rico para AEO)

Base de datos **longitudinal** del proveedor sobre respuestas de AI: qué prompts se responden, qué marcas/dominios aparecen y quién es citado. **Live only** (turnaround ~2 s promedio; ejecución máx 120 s).

### 4.1 Endpoints (paths de API)

| Endpoint | Path (`/v3/ai_optimization/llm_mentions/…`) | Devuelve |
|---|---|---|
| Search Mentions | `search_mentions/live` (doc también indexa `search/live`) | filas de menciones individuales: prompt + respuesta + fuentes |
| Target Metrics | `target_metrics/live` | métricas agregadas de un set de targets |
| Multi-Target Metrics | `multi_target_metrics/live` | métricas para múltiples targets a la vez |
| Top Mentioned Pages | `top_mentioned_pages/live` | páginas más citadas |
| Top Mentioned Domains | `top_mentioned_domains/live` | dominios más mencionados/citados |
| Top Mentioned Brands | `top_mentioned_brands/live` | ranking de marcas |
| Top Mentioned Brand Categories | `top_mentioned_brand_categories/live` | categorías de marca |
| Historical | `historical/live` | serie mensual de mentions + AI SV |
| Timeseries Delta | `timeseries_delta/live` | cambio entre períodos |
| Timeseries New & Lost | `timeseries_new_lost/live` | menciones ganadas/perdidas |
| **Lite** ×5 | `target_metrics_lite/live`, `top_mentioned_{pages,domains,brands,brand_categories}_lite/live` | mismas métricas core sin breakdowns pesados |

Los dos GET gratuitos de la sub-API (`locations_and_languages`, `available_filters`) y los dos alias legacy (`search/live`, `aggregated_metrics/live`) están en **§0.1**.

### 4.2 Targeting (común a los endpoints)

- `target[]`: **hasta 10 entidades**, cada una `domain` (≤63 chars, sin `https://` ni `www.`) **o** `keyword` (≤250 chars).
- Por entidad: `search_filter` (`include`/`exclude`), `search_scope` — para domain: `any`/`sources`/`search_results`; para keyword: `any`/`question`/`answer`/`brand_entities`/`fan_out_queries` — y `match_type` (`word_match`/`partial_match`). Domains soportan opción de subdominios.
- `platform`: `chat_gpt` o `google` (si se omite, ambas). En respuesta, Google aparece como `model_name: "google_ai_overview"`.
- `location_code|name` (default 2840 = United States), `language_code|name` (default `en`). ⚠️ "ChatGPT data is available for `United States` and `English` only."
- `filters` (hasta 8; operadores `=`, `<>`, `in`, `not_in`, `>`, `<`, `like`, `match`…), `initial_dataset_filters` (pre-agregación), `order_by` (hasta 3, p.ej. `"ai_search_volume,desc"`), `limit` 1–1000 (default 100), `offset` (≤1.000.000; más allá, `search_after_token`), `internal_list_limit` (1–10), `include_domains`/`exclude_domains` (en tops), `tag`.

**Delta 2026-09-11 — precisiones del bloque `target[]` y de la paginación:**

- El array **debe incluir al menos una entidad con `"search_filter": "include"`**; el default de `search_filter` es `include`.
- El flag exacto de subdominios es `include_subdomains` (default `false`).
- `match_type`: `word_match` (default) es full-text con palabras alrededor — "light" matchea "light bulb"; `partial_match` es substring **incluso dentro de una palabra** — "light" matchea "highlight". Para marcas cortas, `partial_match` contamina el conteo.
- `search_scope: "search_results"` (domain) y `brand_entities` (keyword) **solo existen para `chat_gpt`**.
- `search_after_token`: si se envía, **todos los demás parámetros deben ser idénticos** al request anterior. Cambiar un filtro entre páginas invalida la paginación **en silencio**.
- `initial_dataset_filters` y `filters` son **mutuamente excluyentes** donde ambos existen. Los primeros se aplican al dataset crudo **antes** de agregar (*"define which source records should be included in the metric calculation"*); los segundos, al resultado.
- `order_by`: **no se puede ordenar por campos `array.str` / `array.num`**.
- Operadores del catálogo `available_filters` (§0.1): numéricos → `<, <=, >, >=, =, <>, in, not_in`; string → `match, not_match, like, not_like, ilike, not_ilike, in, not_in, =, <>, regex, not_regex`; tiempo → `<, <=, >, >=` con formato `yyyy-mm-dd hh-mm-ss +00:00`. `in`/`not_in` exigen array como valor. `regex` usa sintaxis **RE2**, máx 1.000 chars.

🔴 **`platform` NO tiene default — omitirlo devuelve ambas plataformas y eso mezcla escalas incomparables.** Como el `ai_search_volume` de `chat_gpt` y el de `google` se calculan con métodos distintos y difieren en ~200x (§4.5), un `total.ai_search_volume` sin `platform` fijado **suma peras con manzanas** sin lanzar ningún error. **SIEMPRE** fijar `platform` explícitamente en producción y reportar **por plataforma**, nunca agregado.

### 4.3 Métricas y campos por endpoint

**Search Mentions** (fila = una respuesta AI que matchea): `platform`, `model_name`, `question`, `answer` (markdown), `sources[]` (`domain`, `url`, `title`, `rank`, `publication_date`), `search_results`, `ai_search_volume`, `monthly_searches[]`, `first_response_at`/`last_response_at` (UTC), `brand_entities`, `fan_out_queries`, `is_web_search_based`.

**Target Metrics**: agregados por location/language/platform/sources/search_results/brand_entities; métricas primarias **`mentions`** y **`ai_search_volume`** + total. Params extra: `initial_dataset_filters`, `internal_list_limit` (1–10, default 10).

**Top Mentioned Domains** (por dominio): `domain` + counts segmentados por `location`/`language`/`platform`, `sources_domain` ("domains that are cited as sources in LLM responses"), `search_results_domain`, `brand_entities_title`/`brand_entities_category`, `total` (mentions + ai_search_volume) + bloque `aggregated_metrics` global.

**Historical**: `date_from`/`date_to` (yyyy-mm-dd); ítems mensuales `year`/`month` + `metrics.mentions` + `metrics.ai_search_volume`. **"Historical data is available from 2025-08-01."**

**Timeseries New & Lost**: `date_from` (mínimo **2025-08-01**), `date_to`, `group_range` ∈ `day|week|month|year` (✓); por período: `new_mentions` ("LLM responses that contain the target at date_to, did not contain it at date_from"), `lost_mentions` (inverso), `new_ai_search_volume`, `lost_ai_search_volume`.

**Lite vs full** (help center + docs): las Lite devuelven "the same core data – mention counts and AI search volume … but trimmed to the essentials, skipping the heavier breakdowns" — pensadas para dashboards, comparaciones rápidas y monitoreo de alto volumen. Target Metrics Lite retorna `metrics.mentions` + `metrics.ai_search_volume` por location/language/platform. No encontré precio diferenciado publicado para Lite (ver §6).

**Delta 2026-09-11 — forma de respuesta por endpoint (lo que muerde al parsear):**

- **`target_metrics/live`**: 🔴 `total_count`, `offset` e `items_count` **siempre valen 0** y `items` **siempre es `null`**. Todo el dato vive en `aggregated_metrics`, con una dimensión por array de `{key, mentions, ai_search_volume}`: `location[]`, `language[]`, `platform[]`, `sources_domain[]`, `search_results_domain[]` *(solo chat_gpt)*, `brand_entities_title[]` *(solo chat_gpt)*, `brand_entities_category[]` *(solo chat_gpt)* y `total{}`. Un parser que itere `items[]` obtiene cero filas **y no falla** — falla en silencio.
- **`target_metrics_lite/live`**: al revés, **sí devuelve `items[]`**, plano: `{location, language, platform, metrics:{mentions, ai_search_volume}}`. **No** acepta `filters` ni `internal_list_limit` (sí `initial_dataset_filters`, `limit`, `order_by`, `offset`) y **no** devuelve `sources_domain`, `search_results_domain` ni `brand_entities_*`. Es decir: Lite no es "lo mismo más barato", es **una pivot table plana en vez de una estructura anidada por dimensión**. Lite es lo que quieres para cargar a SQL; la completa, para un informe de competidores en una sola llamada.
- **`multi_target_metrics/live`**: cambia la forma del request — en vez de `target` usa **`targets[]`**, con **mínimo 2 y máximo 10** conjuntos, cada uno con su `key` (≤250 chars) y su propio `target[]` de hasta 10 entidades. `internal_list_limit` default **5** acá (10 en `target_metrics`). Devuelve un objeto por `key`; filtros: `key`, `total.mentions`, `total.ai_search_volume`. **Es el endpoint de share of voice**: una llamada, N marcas, mismas condiciones → comparable. N llamadas a `target_metrics` sale más caro y más frágil.
- **Familia `top_mentioned_*`**: `limit` 1–1000 (default 100), `internal_list_limit` 1–10 (default **5**), `order_by` ≤3, `offset` ≤1.000.000, más `include_*`/`exclude_*` propios de cada clave (`domains`, `pages`, `brands`, `brand_categories`). **`links_scope`** (`sources` \| `search_results`, default **`sources`**) existe **solo** en `top_mentioned_domains` y `top_mentioned_pages` — y su valor `search_results` solo aplica a `chat_gpt`.
- **`timeseries_delta/live`**: `date_from`, `date_to` y `group_range` son **obligatorios**; devuelve `{date, delta_mentions, delta_ai_search_volume}`.
- **`historical/live`**: **no** acepta `filters`, `limit`, `offset` ni `order_by`. Solo `target`, fechas y contexto.

🔴 **Brand entities = ChatGPT = US/EN ⇒ los 4 `top_mentioned_brands*` y `top_mentioned_brand_categories*` son, en la práctica, US-only.** El proveedor lo dice textual: *"data specific to brand entities is available for ChatGPT (`platform: chat_gpt`) only"*; y ChatGPT dentro de Mentions solo tiene datos de United States/English (§4.2). Lo mismo alcanza a `brand_entities_title[]` / `brand_entities_category[]` dentro de `target_metrics` y de los `top_mentioned_*`. **NUNCA** vender "ranking de marcas en IA" para Chile apoyado en estos endpoints.

**`is_web_search_based` es el campo más subestimado de toda la API.** Separa dos cosas que la práctica AEO suele tratar como una sola: *"me citan porque mi contenido es indexable y recuperable"* (`true` — el modelo buscó en vivo) vs *"me mencionan porque estoy en los pesos del modelo"* (`false` — salió del conocimiento interno). **Son dos estrategias distintas**: la primera se ataca con crawlabilidad, chunking, frescura y digital PR; la segunda solo con presencia acumulada y notoriedad de entidad, y no se mueve en un trimestre. Además **es filtrable**, así que el split se puede reportar. Un informe AEO que no separe estos dos números está promediando dos fenómenos sin relación causal.

### 4.4 Frescura y ventana

- Ventana histórica: **desde 2025-08-01** (≈12 meses al día de hoy).
- Frecuencia de actualización de la base: **no declarada explícitamente** en las páginas cargadas; los timeseries soportan granularidad `day`, lo que implica refresco al menos diario, pero eso es inferencia — no afirmación de la doc.
- Cobertura de plataformas de la base: **solo `chat_gpt` y `google` (AI Overview)**. No hay Claude/Perplexity/Gemini en Mentions (esos solo existen en LLM Responses).

**Delta 2026-09-11:**

- Al 2026-09 la ventana histórica son **~13 meses** (desde 2025-08-01), no 12.
- La frecuencia de refresco **sigue sin publicarse**. Pero hay una forma correcta de acotar frescura sin inventarla: `first_response_at` / `last_response_at` son **filtrables** (operadores de tiempo, formato `yyyy-mm-dd hh-mm-ss +00:00`). **Filtrar por `last_response_at`** en vez de asumir que todo el índice está fresco.
- Cobertura del lado `google`: **92 locations** con sus idiomas (§4.7).

### 4.5 `ai_search_volume` no es una métrica, son cuatro

⚠️ **(Delta 2026-09-11 — corrige por incompletitud lo dicho en §3 y en el gotcha 9.)** La pasada de agosto dejó `ai_search_volume` como "proxy estadístico derivado de People Also Ask". Es correcto para AI Keyword Data, pero **la metodología publicada cambia según el contexto**:

| Contexto | Cómo se calcula (textual del proveedor) |
|---|---|
| AI Keyword Data (`keywords_search_volume`) | *"calculated using statistical data from questions in the 'People Also Ask' SERP element"* |
| LLM Mentions, plataforma `chat_gpt` | *"collect all People Also Ask questions that include the target keyword and count them"* |
| LLM Mentions, plataforma **`google`** | 🔴 *"the `ai_search_volume` values are derived directly from the **Google Search Volume**. That's because the mentions data is captured for AI Overview features, which appear as features in Google SERPs"* |
| Agregados (`target_metrics`, `top_mentioned_*`) | *"The total search volume is calculated as the sum of the AI search volumes for all LLM mentions found for a specific target"* |

**El caso `google` es el que rompe todo:** ahí `ai_search_volume` **es el volumen de búsqueda de Google**, no una estimación de uso conversacional. Por eso los valores **no son comparables entre plataformas**. Ejemplo del propio proveedor con "renault": Google AI Overviews = **12.621.380**; ChatGPT = **63.850**. Textual: *"The `ai_search_volume` for Google and ChatGPT differs because this metric reflects query popularity on each platform independently."* Son **~200x de diferencia por origen de la métrica, no por demanda real**. Un gráfico que ponga las dos plataformas en el mismo eje es una mentira visual.

Limitaciones declaradas además: *"Our algorithm treats different grammatical forms of the same word as one word"* ("tie" y "ties" reciben el mismo score) y, en frases, *"our algorithm will only consider data on AI questions that contain all the specified words"*.

Regla de comunicación (●/◑): presentarlo **siempre** como estimación y, para `google`, decir explícitamente que **es volumen de búsqueda de Google sobre queries con AI Overview** — nunca como "búsquedas en ChatGPT". Nadie fuera de OpenAI tiene esa telemetría.

### 4.6 `mention` ≠ `source` (cita) ≠ `search_result`

**(Delta 2026-09-11.)** Tres cosas distintas que la API nombra parecido, con definición textual del proveedor:

- **`search_results`** = *"all web search outputs the model retrieved when looking up information, including duplicates and unused entries"* → el **pool crudo** que el modelo consultó. Solo `chat_gpt`. **No es una cita.**
- **`sources`** = *"the sources the model actually cited or relied on in its final answer"* → **esto sí es la cita**. El Help Center es explícito: *"in our case, the citation data includes the results from the `sources` data fields of the API responses"* y *"not all of the results can be considered citations"*.
- **`mentions`** (la métrica entera) = *"the number of times the target keyword or domain were mentioned in relation to this specific grouping key"* → **conteo de respuestas del índice** donde el target aparece bajo el `search_scope` pedido.

🔴 **Consecuencia operativa:** una "mención" **no** es una cita. Para un *citation count* puro hay que pedir `{"domain": "...", "search_scope": ["sources"]}`; recién ahí `total.mentions` es conteo de citas. Con `search_scope: "any"` (el default) se están mezclando citas, apariciones en `search_results` y menciones textuales. **NUNCA** rotular un número de Mentions como "citas" sin haber fijado el scope.

### 4.7 `responses_count` — el único indicador público de densidad por mercado

**(Delta 2026-09-11.)** `GET …/llm_mentions/locations_and_languages` (gratis) devuelve, por cada location×language, un `responses_count` = *"the number of LLM responses available in the database for the certain location and language parameters"*, más `available_platforms[]` (*"only `google` and `chat_gpt` are currently available"*).

Es el único proxy público de **si un mercado tiene muestra suficiente**. Ejemplos reales del doc: Albania/albanés = **172** respuestas; Argelia/árabe = **196.053**. ⚠️ **Antes de comprometer un informe AEO para un país, consultar este endpoint —es gratis— y declarar el `responses_count` del mercado dentro del propio informe.** Un informe construido sobre 172 respuestas no es representativo, y eso se dice.

---

## 5. Tabla de precios (verificada en dataforseo.com/pricing/ai-optimization/*)

| Producto / endpoint | Precio | Unidad / condiciones |
|---|---|---|
| LLM Responses — Live | **$0.0006 + precio del LLM** | por request; ≤120 s |
| LLM Responses — Standard | **$0.0002 + $0.01 prepago** | por task; prepago reembolsable en la diferencia; ≤72 h |
| LLM Scraper — Standard | **$0.0012** | por results page; ≤45 min |
| LLM Scraper — Priority | **$0.0024** | por results page; ≤5 min |
| LLM Scraper — Live | **$0.004** | por results page; ≤90 s |
| AI Keyword Data | **$0.01/task + $0.0001/item** | "$110 for 1M keywords"; live ~2 s |
| LLM Mentions (todos los endpoints) | **$0.1/request + $0.001/fila** | "cost starts from just $1.1 per 1,000 data rows"; sin mínimo mensual (el compromiso de $100/mes fue **removido**) |

Notas: la página de pricing de Mentions no desglosa por endpoint ni por variante Lite — el modelo publicado es request+row plano. En LLM Responses, el costo del modelo subyacente se cobra encima del fee (visible por call en `money_spent`).

### 5.1 Fórmula oficial de LLM Responses (Help Center — delta 2026-09-11)

- **Live:** `$0.0006 + coste de tokens del LLM (input + output) + coste del web search si web_search: true`.
- **Standard:** `$0.0002 + $0.01 (anticipo)`.
- Advertencia del proveedor: *"the web search cost depends on the AI model used, and some AI models don't have the web search feature."*
- Lectura del gasto: `result.money_spent` cubre **solo** los tokens del tercero; **`tasks[].cost` "includes the base task price plus the money_spent value"**. Para el ledger de spend, el número es `tasks[].cost`.

### 5.2 Lo que el proveedor NO publica (delta 2026-09-11 — no inventar)

- **Coste por modelo LLM concreto.** No hay tabla `gpt-5` vs `gpt-4o-mini` vs `claude-opus-4-0`; remite al pricing de cada proveedor. El coste real solo se conoce *a posteriori* leyendo `money_spent`. → **LLM Responses es la única sub-API con presupuesto no acotable antes de llamar.**
- **Descuentos por volumen** en AI Optimization.
- 🔴 **Qué cuenta exactamente como "row" facturable en los endpoints agregados de Mentions** — riesgo de costo real, ver gotcha 14.
- **SLA / uptime** de la familia: hay Status Page, pero sin compromiso publicado.
- **Cuánto vive un dato de mención** en el índice antes de contarse como "lost".

### 5.3 Inconsistencias dentro de las páginas de pricing (delta 2026-09-11 — reportar, no silenciar)

1. **LLM Mentions:** la calculadora en HTML muestra **"$0.05"** como total para 1.000 filas, pero la fórmula publicada en **esa misma página** da `$0.1 + 1.000 × $0.001 = $1.10`. El `$0.05` parece un valor estático obsoleto en el markup. **Presupuestar con la fórmula, nunca con la calculadora.**
2. **LLM Scraper:** narrativa vs tarjetas contradictorias en turnaround — detalle en §2.
3. **Contexto de cuenta:** top-up mínimo **$50**, **$1 de prueba gratis**, créditos **sin expiración**.

---

## 6. Gotchas (lo que muerde)

1. **Mentions ≠ multi-LLM**: la base cubre **solo ChatGPT y Google AI Overview**. Para Claude/Perplexity/Gemini el único camino es generar observaciones propias vía LLM Responses (pagando el LLM).
2. **ChatGPT en Mentions = US/English only** — para mercados es-CL/LatAm, el lado ChatGPT de Mentions no aplica hoy; el lado `google` sí acepta `location_code`/`language_code`.
3. **Histórico corto**: la base arranca **2025-08-01**. Cualquier baseline pre-agosto-2025 no existe.
4. **Frecuencia de refresh de Mentions no publicada** — no prometer "daily" a un cliente sin verificar empíricamente.
5. **Gemini y Perplexity LLM Responses son live-only** (`task_post_supported=false` en todos sus modelos) → no hay ruta barata $0.0002 para esos proveedores; presupuestar live.
6. **`temperature` default 0.94** — para monitoreo reproducible fijar `temperature` baja explícita (y recordar que reasoning models no la soportan, y que `temperature` y `top_p` son excluyentes).
7. **`user_prompt` ≤500 chars** en LLM Responses (el Scraper acepta `keyword` ≤2.000).
8. **30 tasks live simultáneas por plataforma** — un benchmark de 4 proveedores × N prompts debe throttlear por proveedor.
9. **AI Search Volume es un proxy** derivado estadísticamente de People Also Ask, no telemetría real de chats — venderlo como "estimado", nunca como dato de primera parte (regla ●/◑).
10. **El prepago de $0.01 del standard** se reembolsa parcialmente, pero el cash-flow del batch se reserva a $0.01/task — 10k tasks bloquean $100 hasta liquidar.
11. **Slugs de doc con guiones** — los índices con slashes dan 404 (p.ej. `/v3/ai_optimization/chat_gpt/llm_scraper/task_post/` documentado como link, pero la página real es `…-llm_scraper-task_post/`; una variante que probé dio 404 directo).
12. **Lite no publica descuento** — su valor declarado es velocidad/simplicidad, no precio. Verificar el costo real en `/v3/appendix/user_data` antes de asumir ahorro.
13. `location_coordinate` existe en el Scraper de Gemini pero no aparece en el de ChatGPT — no asumir simetría de params entre superficies.

> **Delta 2026-09-11 sobre el gotcha 11:** la forma con slashes **sí** resuelve en la doc (ver la corrección de la cabecera). El 404 de agosto era del slug con guiones de esa página puntual, no de la familia completa. Las dos formas conviven.

14. 🔴 **Riesgo de facturación en los agregados de Mentions.** `target_metrics` cobra `$0.1 + $0.001 × rows`, pero devuelve `items_count: 0` e `items: null`. El proveedor **no publica** si "row" se cuenta sobre lo devuelto o sobre las filas del dataset subyacente que se agregaron. Si es lo segundo, una consulta amplia puede costar mucho más de lo estimado. **Acción obligatoria: medir `tasks[].cost` en la PRIMERA llamada real antes de escalar**, y acotar con `initial_dataset_filters`. No proyectar el costo de un pipeline de Mentions desde la fórmula sin ese dato empírico.
15. 🔴 **`platform` sin fijar mezcla escalas incomparables** (§4.2 + §4.5). Es el error más barato de cometer y el más caro de detectar: no lanza error, solo devuelve un número mal.
16. 🔴 **`target_metrics` devuelve `items: null`** — un parser que itere `items[]` saca cero filas **sin fallar**. El dato está en `aggregated_metrics` (§4.3).
17. 🔴 **Las citas de Gemini en LLM Responses son redirects de Vertex AI.** Agrupar por dominio sin resolverlos deja `vertexaisearch.cloud.google.com` como fuente dominante — basura analítica (§1.3).
18. **"Mención" no es "cita"**: con `search_scope` en su default se mezclan tres cosas distintas (§4.6).
19. **Brand entities solo ChatGPT ⇒ `top_mentioned_brands*` es US-only** (§4.3). No aplica a ningún cliente chileno.
20. **Los catálogos de `models` documentados son EJEMPLOS y rotan** — llamar al endpoint gratis, nunca hardcodear desde un doc (§1.1).
21. **Gemini + `task_post`: contradicción abierta del proveedor** (§1.1). Verificar en vivo antes de diseñar un pipeline Standard sobre Gemini.
22. **`search_after_token` exige request idéntico** — cambiar un parámetro entre páginas rompe la paginación **en silencio**; `offset` topa en 1.000.000 (§4.2).
23. **`initial_dataset_filters` y `filters` son mutuamente excluyentes** donde ambos existen (§4.2).
24. **Ceros al inicio de `ai_monthly_searches`** rompen cualquier cálculo YoY (§3).
25. **El campo `impressions` no existe.** El overview de AI Optimization promete *"metrics like AI search volume, impressions and mentions count"*, pero `impressions` **no aparece en ningún schema de ningún endpoint** (verificado sobre las 62 páginas de doc descargadas el 2026-09-11). No planificar una métrica sobre él.
26. **Cifras de tamaño del índice inconsistentes entre páginas del propio proveedor:** la página de LLM Mentions API declara ChatGPT 27.589.737 prompts + Google AIO 331.325.307 = **358.915.044**; la página de AI Optimization API dice **"280M+ LLM prompts"**. Ninguna de las dos está en la doc técnica. Si se cita a un cliente, **fechar la cita**.
27. **Balance negativo quema tareas:** se ejecutan, se cobran y **no se entregan resultados** (§0.6).
28. **Mentions y AI Keyword Data no tienen `task_post`** → no hay pingback/postback. Cualquier job masivo sobre ellos es un bucle síncrono limitado a 30 concurrentes: presupuestar **tiempo de pared**, no solo dinero.

---

## 7. Casos de uso de máximo provecho para Efeonce (práctica AEO)

1. **Share of voice de marca en LLMs (retainer por cliente)**: `target_metrics/live` (o Lite para dashboard) con `target=[{keyword: marca}, {domain: cliente.com}]` + competidores → `mentions` + `ai_search_volume` por plataforma. Con `timeseries_delta` y `timeseries_new_lost` (group_range `week`/`month`) se arma el reporte mensual "ganaste/perdiste presencia en AI" a ~$1.1/1.000 filas — margen altísimo vs. mantener 4 integraciones LLM propias.
2. **Benchmark multi-modelo de citabilidad (Radiografía AEO viva)**: mismas preguntas ICP vía LLM Responses con `web_search=true` en ChatGPT (gpt-4o/gpt-5), Claude (sonnet-4), Gemini (2.5-flash) y Perplexity (sonar-pro); extraer `annotations[].url` y medir % de respuestas que citan al cliente vs. competidores. Claude/ChatGPT por cola standard ($0.0102 máx/task), Gemini/Perplexity live.
3. **Prospección digital PR / link-earning**: `top_mentioned_domains/live` y `top_mentioned_pages/live` con keywords de la categoría del cliente → lista priorizada de los dominios/páginas que los LLMs ya citan en ese tema = targets de PR/guest content con probabilidad real de heredar citabilidad. El campo `sources_domain` separa "citado como fuente" de "aparece en search results".
4. **Tracking longitudinal pre/post optimización de contenido**: fijar baseline con `historical/live` (mensual desde 2025-08-01) sobre el dominio del cliente; tras el rework de contenido, `timeseries_new_lost` con `group_range=week` para atribución temprana; `search_mentions/live` da el prompt exacto y el `answer` markdown donde apareció (evidencia citable en el reporte).
5. **Superficie comercial real (e-commerce/local)**: LLM Scraper de ChatGPT devuelve `chat_gpt_products`, `chat_gpt_local_businesses` y `chat_gpt_ad` — para clientes retail/local permite auditar si aparecen en el shopping/local layer de ChatGPT search, algo que LLM Responses no expone.
6. **Descubrimiento de demanda conversacional**: AI Keyword Data ($0.0001/kw) para priorizar qué prompts/temas monitorear en Mentions y qué contenido crear — barato para barrer 10k keywords del ICP y quedarse con los de mayor `ai_search_volume` (recordando que es proxy PAA).
7. **`fan_out_queries` y `brand_entities` como inteligencia gratuita**: ambos vienen en Responses, Scraper y Mentions — mapean cómo el modelo descompone la intención y qué marcas asocia a la categoría (input directo para el knowledge-graph/entity work de la skill seo-aeo).

**Encaje Greenhouse** (contrato de `dataforseo-operator`): `ai_optimization` está **FUERA del allowlist** hoy (candidata #1). Integrarla exige el proceso gobernado: familia nueva en `dataforseo-families.ts` + migración del CHECK de `seo_provider_spend_daily` + delta en arch SEO §6 + consumer con `enforceSeoRunEntitlement`. Todos los endpoints de la sección son **POST con body** (incl. los `*/live`), compatibles con el transporte POST-only de `postDataForSeoTask`; solo los `models`/`locations`/`languages` (GET) y `task_get/$id` requerirían ampliar transporte — evitables en un primer slice (live-only + task via postback).

### 7.1 Qué pregunta responde bien cada sub-API (delta 2026-09-11)

| Pregunta del cliente | Endpoint correcto |
|---|---|
| "¿me citan hoy en IA y quién más?" | Mentions: `target_metrics` + `top_mentioned_domains` con `search_scope: ["sources"]` |
| "¿estoy ganando o perdiendo presencia?" | Mentions: `timeseries_new_lost` + `historical` |
| "¿cómo me comparo con N competidores?" | Mentions: `multi_target_metrics` — una sola llamada |
| "¿qué me responde el modelo X hoy sobre este prompt?" | LLM Responses |
| "¿qué ve un usuario real en ChatGPT/Gemini para esta consulta, **en Chile**?" | LLM Scraper — la única superficie con location Chile y dato de ChatGPT |
| "¿qué demanda conversacional hay por este tema?" | AI Keyword Data |

### 7.2 Notas de diseño para la integración (delta 2026-09-11)

- **Barato → caro:** `models`, `locations*`, `languages` y `available_filters` son **gratis** y son el preflight obligatorio (§0.5). AI Keyword Data es el dato más barato por unidad ($0.00011/keyword a batch lleno). Mentions es caro por fila. LLM Scraper es el **único con precio fijo por página** y tres niveles de latencia. LLM Responses es el único **no acotable a priori**.
- **Guard de gasto:** en LLM Responses el tope se aplica con `max_output_tokens` y evitando `web_search` salvo cuando la búsqueda **es** el objeto de la medición; lo que se registra en el ledger es `tasks[].cost` (§5.1). En Mentions, el guard real es `initial_dataset_filters` + la medición empírica del gotcha 14.
- **Chile/LATAM, la decisión de fondo:** Mentions solo aporta **Google AI Overviews**. Para ChatGPT en Chile hay que **generar** la muestra (Scraper con location Chile, o Responses con `web_search_country_iso_code: "CL"`). Eso convierte la medición en **un panel propio con coste recurrente**, y obliga a documentar las decisiones de muestreo —qué prompts, con qué frecuencia, con qué modelo— porque pasan a ser parte del método, no del proveedor. Un informe que mezcle índice histórico (`google`) con panel propio (ChatGPT) tiene que declarar esa costura explícitamente.
- **Preflight y transporte:** el punto de §0.5 tensiona el "primer slice POST-only" del encaje Greenhouse. Sin GET no hay catálogo de modelos vivo (gotcha 20) ni `responses_count` por mercado (§4.7) ni `available_filters`. El `available_filters` tiene salida alterna vía el JSON de `cdn.dataforseo.com` (§0.1), pero `models` y `locations_and_languages` no. Conviene decidirlo al diseñar el slice, no después.

---

## 8. Fuentes (URLs cargadas, as-of 2026-08-06)

| Sección | URL |
|---|---|
| Overview de la sección | https://docs.dataforseo.com/v3/ai_optimization-overview/ |
| ChatGPT LLM Responses — Models | https://docs.dataforseo.com/v3/ai_optimization-chat_gpt-llm_responses-models/ |
| ChatGPT LLM Responses — Live | https://docs.dataforseo.com/v3/ai_optimization-chat_gpt-llm_responses-live/ |
| ChatGPT LLM Responses — Task POST | https://docs.dataforseo.com/v3/ai_optimization-chat_gpt-llm_responses-task_post/ |
| Claude — Models | https://docs.dataforseo.com/v3/ai_optimization-claude-llm_responses-models/ |
| Gemini — Models | https://docs.dataforseo.com/v3/ai_optimization-gemini-llm_responses-models/ |
| Perplexity — Models | https://docs.dataforseo.com/v3/ai_optimization-perplexity-llm_responses-models/ |
| LLM Scraper — Overview (ChatGPT) | https://docs.dataforseo.com/v3/ai_optimization-chat_gpt-llm_scraper-overview/ |
| LLM Scraper — Live Advanced (ChatGPT) | https://docs.dataforseo.com/v3/ai_optimization-chat_gpt-llm_scraper-live-advanced/ |
| LLM Scraper — Live Advanced (Gemini) | https://docs.dataforseo.com/v3/ai_optimization-gemini-llm_scraper-live-advanced/ |
| AI Keyword Data — Search Volume Live | https://docs.dataforseo.com/v3/ai_optimization-ai_keyword_data-keywords_search_volume-live/ |
| AI Keyword Data — Locations & Languages | https://docs.dataforseo.com/v3/ai_optimization-ai_keyword_data-locations_and_languages/ |
| LLM Mentions — Overview | https://docs.dataforseo.com/v3/ai_optimization-llm_mentions-overview/ |
| LLM Mentions — Search Mentions Live | https://docs.dataforseo.com/v3/ai_optimization-llm_mentions-search_mentions-live/ |
| LLM Mentions — Target Metrics Live | https://docs.dataforseo.com/v3/ai_optimization-llm_mentions-target_metrics-live/ |
| LLM Mentions — Target Metrics Lite Live | https://docs.dataforseo.com/v3/ai_optimization-llm_mentions-target_metrics_lite-live/ |
| LLM Mentions — Top Mentioned Domains Live | https://docs.dataforseo.com/v3/ai_optimization-llm_mentions-top_mentioned_domains-live/ |
| LLM Mentions — Historical Live | https://docs.dataforseo.com/v3/ai_optimization-llm_mentions-historical-live/ |
| LLM Mentions — Timeseries New & Lost Live | https://docs.dataforseo.com/v3/ai_optimization-llm_mentions-timeseries_new_lost-live/ |
| Pricing — LLM Responses | https://dataforseo.com/pricing/ai-optimization/llm-responses |
| Pricing — LLM Scraper | https://dataforseo.com/pricing/ai-optimization/llm-scraper |
| Pricing — AI Keyword Search Volume | https://dataforseo.com/pricing/ai-optimization/ai-keyword-search-volume |
| Pricing — LLM Mentions | https://dataforseo.com/pricing/ai-optimization/llm-mentions |
| Release note — Extended LLM Mentions | https://dataforseo.com/update/extended-llm-mentions-api-release |
| Lite vs full (vía búsqueda + help center) | https://dataforseo.com/help-center/define-targets-and-analyze-data-in-llm-mentions-api (referenciada; contenido Lite resumido vía resultados de búsqueda) |

**Páginas que NO cargaron / no verificadas**: `…-chat_gpt-llm_scraper-task_post/` con slug probado `ai_optimization-chat_gpt-llm_scraper-task_post` devolvió **404** (el overview del scraper sí lista Task POST como endpoint existente — el slug real difiere o la página estaba caída); el detalle de precios diferenciados Lite no existe públicamente; la frecuencia de refresh de la base de Mentions no está declarada en ninguna página cargada.

### Fuentes agregadas en la revisión del 2026-09-11

La segunda pasada descargó y parseó **62 páginas** de `docs.dataforseo.com` bajo `/v3/ai_optimization/**` (forma con slashes), más pricing, Help Center y páginas de producto. Las que aportan algo que no estaba arriba:

| Sección | URL |
|---|---|
| LLM Mentions — Filters / `available_filters` | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/filters/ |
| LLM Mentions — catálogo de filtros (JSON descargable) | https://cdn.dataforseo.com/v3/available_filters.php?api=ai_optimization/llm_mentions |
| LLM Mentions — Locations & Languages | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/locations_and_languages/ |
| LLM Mentions — Multi Target Metrics Live | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/multi_target_metrics/live/ |
| LLM Mentions — Top Mentioned Pages Live | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_pages/live/ |
| LLM Mentions — Top Mentioned Brands Live | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_brands/live/ |
| LLM Mentions — Top Mentioned Brand Categories Live | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_brand_categories/live/ |
| LLM Mentions — variantes `_lite` (pages/domains/brands/brand_categories) | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_domains_lite/live/ (y análogas) |
| LLM Mentions — Timeseries Delta Live | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/timeseries_delta/live/ |
| LLM Mentions — alias legacy `search/live` | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/search/live/ |
| LLM Mentions — alias legacy `aggregated_metrics/live` | https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/aggregated_metrics/live/ |
| LLM Responses — Overview de la sub-API | https://docs.dataforseo.com/v3/ai_optimization/llm_responses/overview/ |
| LLM Responses — Claude / Gemini / Perplexity: `live`, `task_post`, `tasks_ready`, `task_get` | https://docs.dataforseo.com/v3/ai_optimization/{claude,gemini,perplexity}/llm_responses/ |
| LLM Scraper — `task_post`, `tasks_ready`, `task_get/{advanced,html}`, `live/html`, `locations`, `languages` (ChatGPT y Gemini) | https://docs.dataforseo.com/v3/ai_optimization/{chat_gpt,gemini}/llm_scraper/ |
| Appendix — Sandbox | https://docs.dataforseo.com/v3/appendix/sandbox/ |
| Pricing — índice AI Optimization | https://dataforseo.com/pricing/ai-optimization |
| Help Center — What is AI Search Volume | https://dataforseo.com/help-center/what-is-ai-search-volume-in-dataforseo |
| Help Center — How the AI Search Volume metric works in LLM Mentions | https://dataforseo.com/help-center/how-the-ai-search-volume-metric-works-in-llm-mentions |
| Help Center — How to get LLM citation data with LLM Mentions API | https://dataforseo.com/help-center/how-to-get-llm-citation-data-with-llm-mentions-api |
| Help Center — What are the initial dataset filters | https://dataforseo.com/help-center/what-are-the-initial-dataset-filters-and-how-do-they-work |
| Help Center — How the price for LLM Responses endpoints is calculated | https://dataforseo.com/help-center/how-the-price-for-using-llm-responses-endpoints-is-calculated |
| Producto — AI Optimization API | https://dataforseo.com/ai-optimization-api · https://dataforseo.com/apis/ai-optimization-api |
| Producto — LLM Mentions API | https://dataforseo.com/apis/ai-optimization-api/llm-mentions-api |

**Probes que devolvieron 404 (confirman ausencia de endpoint, 2026-09-11):** `…/ai_optimization/perplexity/llm_responses/task_post/` y `…/ai_optimization/chat_gpt/llm_scraper/task_get/regular/`.

**Corrección al bloque anterior "Páginas que NO cargaron":** la página de Task POST del Scraper de ChatGPT **sí existe y carga** con la forma de slashes (`…/ai_optimization/chat_gpt/llm_scraper/task_post/`) — el 404 de agosto fue del slug con guiones. Siguen sin publicarse, un mes después: el precio diferenciado de los `_lite` y la frecuencia de refresco del índice de Mentions.

**Silencios del proveedor que siguen abiertos (verificado 2026-09-11):** metodología interna (*"we do not disclose our internal algorithms"*; las menciones vienen de *"various internal data sources and proprietary databases"*), metodología de muestreo de prompts y su posible sesgo de selección, representatividad (sin margen de error, intervalo de confianza ni comparación con ground truth), qué cuenta como "row" facturable en los agregados, cuánto vive un dato de mención antes de considerarse "lost", y si el Sandbox cubre realmente AI Optimization.

---

> **Procedencia complementaria.** Parte del conocimiento de este documento se contrastó contra las **skills públicas de DataForSEO** (galería "AI Skills" del proveedor, publicadas con licencia libre de uso, copia, modificación y redistribución), revisadas el **2026-09-11**. Lo tomado de ahí se validó contra la documentación oficial antes de quedar escrito; lo que no se pudo validar, no se incorporó.
