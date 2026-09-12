# Dossier 04 — DataForSEO **AI Optimization API** (v3)

> **Tipo:** dossier de investigación de proveedor (implementation-ready)
> **Fecha de captura:** 2026-09-11
> **Fuente:** documentación pública de DataForSEO (`docs.dataforseo.com/v3/ai_optimization/**`), páginas de pricing (`dataforseo.com/pricing/ai-optimization/**`), Help Center y páginas de producto. Todas las URLs consultadas están al final.
> **Versión de API observada en los ejemplos de la doc:** `0.1.20250526` (AI Keyword Data) y `0.1.20251208` (LLM Mentions).
> **Convención de marcado:**
> - **[V]** = verificado literalmente en la documentación pública (indico dónde).
> - **[I]** = inferencia mía a partir de lo verificado. NO es afirmación del proveedor.
> - **[?]** = el proveedor NO publica el dato; queda explícitamente como desconocido.

---

## 0. Índice de endpoints documentados

**Total: 54 rutas documentadas** = **52 endpoints vigentes** + **2 alias legacy**, repartidos en 4 sub-APIs.

> Desglose: LLM Mentions 17 (+2 legacy) · AI Keyword Data 2 · LLM Responses 17 (ChatGPT 5, Claude 5, Gemini 5, Perplexity 2) · LLM Scraper 16 (2 plataformas × 8).

### A. LLM Mentions API (base de datos propietaria · sólo Live)
| # | Endpoint | Método HTTP |
|---|---|---|
| A1 | `/v3/ai_optimization/llm_mentions/search_mentions/live` | POST |
| A2 | `/v3/ai_optimization/llm_mentions/target_metrics/live` | POST |
| A3 | `/v3/ai_optimization/llm_mentions/target_metrics_lite/live` | POST |
| A4 | `/v3/ai_optimization/llm_mentions/multi_target_metrics/live` | POST |
| A5 | `/v3/ai_optimization/llm_mentions/top_mentioned_domains/live` | POST |
| A6 | `/v3/ai_optimization/llm_mentions/top_mentioned_domains_lite/live` | POST |
| A7 | `/v3/ai_optimization/llm_mentions/top_mentioned_pages/live` | POST |
| A8 | `/v3/ai_optimization/llm_mentions/top_mentioned_pages_lite/live` | POST |
| A9 | `/v3/ai_optimization/llm_mentions/top_mentioned_brands/live` | POST |
| A10 | `/v3/ai_optimization/llm_mentions/top_mentioned_brands_lite/live` | POST |
| A11 | `/v3/ai_optimization/llm_mentions/top_mentioned_brand_categories/live` | POST |
| A12 | `/v3/ai_optimization/llm_mentions/top_mentioned_brand_categories_lite/live` | POST |
| A13 | `/v3/ai_optimization/llm_mentions/historical/live` | POST |
| A14 | `/v3/ai_optimization/llm_mentions/timeseries_delta/live` | POST |
| A15 | `/v3/ai_optimization/llm_mentions/timeseries_new_lost/live` | POST |
| A16 | `/v3/ai_optimization/llm_mentions/locations_and_languages` | GET (gratis) |
| A17 | `/v3/ai_optimization/llm_mentions/available_filters` | GET (gratis) |
| L1 | `/v3/ai_optimization/llm_mentions/search/live` | POST — **LEGACY**, reemplazado por A1 |
| L2 | `/v3/ai_optimization/llm_mentions/aggregated_metrics/live` | POST — **LEGACY**, reemplazado por A2 |

### B. AI Keyword Data API (sólo Live)
| # | Endpoint | Método HTTP |
|---|---|---|
| B1 | `/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live` | POST |
| B2 | `/v3/ai_optimization/ai_keyword_data/locations_and_languages` | GET (gratis) |

### C. LLM Responses API (llama modelos reales vía API oficial del proveedor)
Namespace por plataforma: `chat_gpt`, `claude`, `gemini`, `perplexity`.

| # | Endpoint | Método | chat_gpt | claude | gemini | perplexity |
|---|---|---|---|---|---|---|
| C1 | `…/{platform}/llm_responses/live` | POST | ✅ | ✅ | ✅ | ✅ |
| C2 | `…/{platform}/llm_responses/task_post` | POST | ✅ | ✅ | ✅ | ❌ (404) |
| C3 | `…/{platform}/llm_responses/tasks_ready` | GET (gratis) | ✅ | ✅ | ✅ | ❌ |
| C4 | `…/{platform}/llm_responses/task_get/$id` | GET (gratis) | ✅ | ✅ | ✅ | ❌ |
| C5 | `…/{platform}/llm_responses/models` | GET (gratis) | ✅ | ✅ | ✅ | ✅ |

→ 4 plataformas × 5 = 17 endpoints reales (Perplexity sólo aporta C1 + C5).

### D. LLM Scraper API (raspa la UI real de ChatGPT Search y Gemini)
Namespace por plataforma: `chat_gpt`, `gemini`.

| # | Endpoint | Método |
|---|---|---|
| D1 | `…/{platform}/llm_scraper/task_post` | POST |
| D2 | `…/{platform}/llm_scraper/tasks_ready` | GET (gratis) |
| D3 | `…/{platform}/llm_scraper/task_get/advanced/$id` | GET (gratis) |
| D4 | `…/{platform}/llm_scraper/task_get/html/$id` | GET (gratis) |
| D5 | `…/{platform}/llm_scraper/live/advanced` | POST |
| D6 | `…/{platform}/llm_scraper/live/html` | POST |
| D7 | `…/{platform}/llm_scraper/locations` (+ `/locations/$country` en chat_gpt) | GET (gratis) |
| D8 | `…/{platform}/llm_scraper/languages` | GET (gratis) |

→ 2 plataformas × 8 = 16 endpoints.

**No existe** `task_get/regular` en LLM Scraper (verificado: 404). **[V]**

---

## 1. Modelo mental: qué mide cada sub-API

Esta es la distinción más importante del dossier. Las cuatro sub-APIs se llaman parecido pero miden cosas **estructuralmente distintas**.

| Sub-API | Qué es la unidad de dato | De dónde sale | ¿Consulta un LLM en vivo? |
|---|---|---|---|
| **LLM Mentions** | Una **respuesta de LLM ya capturada y almacenada** por DataForSEO en su base propietaria, en la que aparece tu target | Base de datos histórica propia de prompts+respuestas (ChatGPT + Google AI Overview) | ❌ No. Consulta un índice. |
| **AI Keyword Data** | Un **keyword** con una estimación mensual de "AI search volume" | Derivado estadísticamente de las preguntas del bloque **People Also Ask** del índice SERP de DataForSEO | ❌ No. |
| **LLM Responses** | Una **respuesta generada ahora** por un modelo, vía la API oficial del proveedor | OpenAI / Anthropic / Google / Perplexity API, con DataForSEO como broker | ✅ Sí, API oficial. |
| **LLM Scraper** | Una **página de resultados raspada de la interfaz de usuario real** de ChatGPT Search / Gemini | Scraping de la UI pública, parseado a `items[]` tipo SERP | ✅ Sí, la UI real (no la API). |

### 1.1 `mention` vs `source` (cita) vs `search_result`

**[V]** Definiciones textuales del Help Center y de los schemas:

- **`search_results`** = *"all web search outputs the model retrieved when looking up information, including duplicates and unused entries"* → es el **pool crudo** que el modelo consultó. Sólo disponible para `chat_gpt`. No es una cita.
- **`sources`** = *"the sources the model actually cited or relied on in its final answer"* → **esto sí es la cita/citation**. El Help Center es explícito: *"in our case, the citation data includes the results from the `sources` data fields of the API responses"* y *"not all of the results can be considered citations"*.
- **`mentions`** (métrica entera) = *"the number of times the target keyword or domain were mentioned in relation to this specific grouping key"*. Es un **conteo de respuestas del índice** en las que tu target aparece bajo el `search_scope` que pediste.

**Consecuencia operativa [I]:** una "mención" NO es una cita. Si quieres **citation count** puro, debes pedir `{"domain": "...", "search_scope": ["sources"]}` en el `target`; el `total.mentions` que vuelve es entonces el conteo de citas. Si dejas `search_scope: "any"` (default) estás mezclando citas, apariciones en `search_results` y menciones textuales. Confundir esos dos números es el error #1 posible en esta API.

### 1.2 `ai_search_volume` — qué es exactamente

**[V]** Es una **estimación**, no una medición. Textual: *"AI Search Volume (`ai_search_volume`) is the estimated frequency with which a specific keyword is used in questions that people may ask AI tools."*

Metodología publicada, que **difiere según el contexto**:

| Contexto | Cómo se calcula (textual del proveedor) |
|---|---|
| **AI Keyword Data** (`keywords_search_volume`) | *"calculated using statistical data from questions in the 'People Also Ask' SERP element"*; *"considers multiple signals, including data on the PAA section of Google search results from our extensive SERP index"* |
| **LLM Mentions, plataforma `google`** | *"the `ai_search_volume` values are derived directly from the Google Search Volume. That's because the mentions data is captured for AI Overview features, which appear as features in Google SERPs"* |
| **LLM Mentions, plataforma `chat_gpt`** | *"collect all People Also Ask questions that include the target keyword and count them"* |
| **Agregados** (target_metrics, top_mentioned_*) | *"The total search volume is calculated as the sum of the AI search volumes for all LLM mentions found for a specific target"* |

**⚠️ Caveat crítico [V]:** para un mismo keyword el valor **no es comparable entre plataformas**. Ejemplo del propio proveedor con "renault": Google AI Overviews = **12.621.380**; ChatGPT = **63.850**. Textual: *"The `ai_search_volume` for Google and ChatGPT differs because this metric reflects query popularity on each platform independently."* Son ~200x de diferencia porque son métricas de origen distinto (volumen de búsqueda de Google vs conteo de preguntas PAA), NO porque la demanda sea 200x.

**Limitaciones declaradas [V]:**
1. *"Our algorithm treats different grammatical forms of the same word as one word"* → "tie" y "ties" reciben el mismo score.
2. *"For keyword phrases that consist of multiple words, our algorithm will only consider data on AI questions that contain all the specified words."*

**[I]** Dado que la base es PAA de Google, `ai_search_volume` es un **proxy de demanda conversacional inferida desde Google**, no telemetría de uso de ChatGPT. Nadie fuera de OpenAI tiene esa telemetría. Presentarlo a un cliente como "búsquedas en ChatGPT" sería incorrecto.

### 1.3 LLM Scraper vs llamar directo a la API del modelo

**[V]** El Scraper *"allows you to retrieve results from ChatGPT **Search mode**"*, devuelve `check_url` (*"direct URL to search engine results, you can use it to make sure that we provided exact results"*), `item_types` estilo SERP (`chat_gpt_text`, `chat_gpt_table`, `chat_gpt_navigation_list`, `chat_gpt_images`, `chat_gpt_local_businesses`, `chat_gpt_products`), `rank_group`/`rank_absolute`, `brand_entities[]`, y un endpoint `/html` con el HTML crudo de la página.

**[I] Las diferencias que importan:**
- La **API oficial de un modelo ≠ el producto de consumo**. Lo que ve un usuario real en chatgpt.com (con su router de modelos, su capa de búsqueda, sus tarjetas de producto y negocios locales) no es lo que devuelve `POST /v1/responses`. El Scraper mide el **producto**; LLM Responses mide el **modelo**.
- El Scraper entrega **posición** (`rank_absolute`) y **entidades de marca tipificadas**; la API oficial no da nada de eso.
- El Scraper **no acepta `model_name`** — devuelve un campo `model` de sólo lectura ("indicates the model version"), es decir, no eliges el modelo: obtienes el que el producto sirvió.
- El Scraper **sí acepta `location_name`/`language_name`** con cobertura ~215 locations; LLM Responses sólo permite localizar la *búsqueda web* del modelo (`web_search_country_iso_code`/`web_search_city`).
- Riesgo [I]: el scraping de UI es estructuralmente más frágil que una API oficial (cambios de layout, anti-bot). El proveedor no publica SLA de fidelidad.

---

## 2. Precios confirmados

Todos los importes son **[V]**, tomados de las páginas de pricing oficiales, en USD.

### 2.1 Tabla maestra

| Sub-API / modo | Turnaround declarado | Precio | Modelo de cobro |
|---|---|---|---|
| **LLM Mentions** — Live (único modo) | hasta **2 s** en promedio | **$0.1 por request** + **$0.001 por fila** | Se cobra por setear la tarea **y** por recuperar resultados. *"one row is the object containing data on a related mention"* |
| **AI Keyword Data** — Live (único modo) | hasta **2 s** en promedio | **$0.01 por tarea** + **$0.0001 por item (keyword)** | Se cobra setting + retrieval. Ejemplo oficial: **$110 por 1.000.000 de keywords** = `1.000 × $0.01 + 1.000.000 × $0.0001` |
| **LLM Responses** — Live | hasta **120 s** | **$0.0006 por tarea + lo que cobre el LLM** | El coste de tokens del proveedor tercero se pasa a costo |
| **LLM Responses** — Standard (task_post) | hasta **72 h** | **$0.0002 por tarea + $0.01 de prepago** | El $0.01 es **anticipo automático**; si el LLM cobra menos, la diferencia se reembolsa al balance |
| **LLM Scraper** — Standard Queue | hasta **45 min** | **$0.0012 por results page** | Por página de resultados |
| **LLM Scraper** — Priority Queue (`priority: 2`) | hasta **5 min** | **$0.0024 por results page** | Por página de resultados |
| **LLM Scraper** — Live | hasta **90 s** | **$0.004 por results page** | Por página de resultados |

### 2.2 Endpoints **gratuitos** (el proveedor dice literal *"Your account will not be charged"*) **[V]**
`…/llm_responses/models` (las 4 plataformas) · `…/llm_responses/tasks_ready` · `…/llm_scraper/tasks_ready` · `…/llm_scraper/locations` · `…/llm_scraper/languages` · `…/llm_mentions/locations_and_languages` · `…/llm_mentions/available_filters` · `…/ai_keyword_data/locations_and_languages`.

**`task_get`:** *"Your account will be charged only for posting a task. You can get the results of the task within the next 30 days for free."* **[V]**

### 2.3 Fórmula de LLM Responses (Help Center) **[V]**
- **Live:** `precio total = $0.0006 + coste de tokens del LLM (input + output) + coste del web search si `web_search: true``.
- **Standard:** `precio total = $0.0002 + $0.01 (anticipo)`.
- En la respuesta: `result.money_spent` = *"cost of AI tokens, USD — the price charged by the third-party AI model provider"*; `tasks[].cost` = *"includes the base task price plus the money_spent value"*.
- El proveedor advierte: *"the web search cost depends on the AI model used, and some AI models don't have the web search feature."*

### 2.4 Precios NO publicados — no inventar
- **[?]** DataForSEO **no publica** una tabla de coste por modelo LLM (ni `gpt-5` vs `gpt-4o-mini` vs `claude-opus-4-0`). Remite a la página de pricing de cada proveedor. El coste real sólo se conoce *a posteriori* leyendo `money_spent`.
- **[?]** No hay precio diferenciado publicado para los endpoints `_lite` de LLM Mentions ni entre `search_mentions` y los agregados: la página de pricing de LLM Mentions muestra **una sola tarifa** para todos.
- **[?]** No hay descuentos por volumen publicados para AI Optimization.
- **[?]** No se publica cuántas "rows" cuenta un endpoint agregado (¿el `items[]` devuelto, o las filas del dataset subyacente que se agregaron?). **Esto es un riesgo de costo real** — ver §7.

### 2.5 Inconsistencias detectadas en las páginas de pricing (reportar, no silenciar)
1. **LLM Mentions:** la calculadora en HTML muestra **"$0.05"** como total para 1.000 filas, pero la fórmula publicada en la misma página da `$0.1 + 1.000 × $0.001 = $1.10`. **[I]** El `$0.05` parece ser un valor estático obsoleto en el markup (no encontré JS de cálculo con constantes distintas). **La fórmula es la que hay que presupuestar.**
2. **LLM Scraper:** el texto narrativo dice *"the Standard method … includes two priorities: normal (up to 5 minutes) and high (up to 1 minute)"*, mientras las tarjetas de la misma página dicen **Standard Queue up to 45 minutes / Priority Queue up to 5 minutes**. **[I]** Las tarjetas coinciden con la doc técnica y con los precios; el párrafo narrativo está desactualizado.
3. **Contexto general de cuenta [V]:** top-up mínimo **$50**, **$1 de prueba gratis**, créditos sin expiración (página de producto AI Optimization).

---

## 3. Límites operativos (transversales)

| Límite | Valor | Alcance | Marca |
|---|---|---|---|
| Rate limit global | **2.000 API calls / minuto** | Toda la familia AI Optimization. *"Contact us if you would like to raise the limit"* | [V] |
| Concurrencia | **30 requests simultáneos** | LLM Mentions, AI Keyword Data, LLM Responses (*"30 per account for each platform"*) | [V] |
| Tareas por POST — métodos **Live** | **1 tarea por llamada** | Todos los Live | [V] |
| Tareas por POST — métodos **Standard** | **100 tareas por llamada**; el excedente devuelve error **40006** | task_post de LLM Responses y LLM Scraper | [V] |
| Vida de la tarea Standard | **72 h**; si no completa se marca failed y **se reembolsa el anticipo de $0.01** | LLM Responses | [V] |
| Balance negativo | *"if your account balance is negative, you will not receive the results even if the task is completed successfully"* | Standard | [V] |
| `tasks_ready` | **20 API calls/min**, **1.000 tareas por llamada**, completadas en los **3 días previos**; lo no recogido en 3 días se pierde | Standard | [V] |
| Retención de resultados | `task_get` disponible **30 días**, gratis | Standard | [V] |
| Timeout de pingback/postback | **10 s**; si tu servidor no responde, la tarea pasa a `tasks_ready` | Standard | [V] |
| Latencia Live | LLM Mentions ≈ **2 s** (pricing) / **hasta 120 s** (doc técnica) · AI Keyword Data ≈ **2 s** · LLM Responses **hasta 120 s** · LLM Scraper **hasta 90 s** (pricing) / **hasta 120 s** (doc técnica) | — | [V] |
| Prohibición geográfica | *"All locations in Russia and Belarus are not supported across all DataForSEO services due to the invasion of Ukraine"* | Toda la plataforma | [V] |
| Encoding | Todo el POST en **JSON UTF-8** | Toda la plataforma | [V] |
| Auth | **HTTP Basic** (`login:password` en base64), credenciales de `app.dataforseo.com/api-access` | Toda la plataforma | [V] |
| Sandbox | `https://sandbox.dataforseo.com/v3/` — gratis, estructura idéntica, **datos dummy**. Las páginas de AI Optimization dicen *"You can test … for free using DataForSEO Sandbox"* | — | [V]; **[?]** el appendix de Sandbox no lista explícitamente AI Optimization entre las APIs cubiertas |

### 3.1 Profundidad histórica y frescura
- **LLM Mentions histórico:** *"Historical data is available from **2025-08-01**"* — es el valor mínimo aceptado en `date_from` de `historical`, `timeseries_delta` y `timeseries_new_lost`. **[V]** → al 2026-09 son ~13 meses de historia. Antes de esa fecha **no hay nada**.
- **AI Keyword Data:** devuelve el mes corriente + **12 meses** de tendencia (`ai_monthly_searches`). **[V]**
- **Frescura de la base de menciones:** **[?]** DataForSEO **no publica** la frecuencia de refresco del índice de menciones. Los campos `first_response_at` / `last_response_at` por ítem son el único proxy de recencia disponible, y son filtrables (`first_response_at`, `last_response_at` con operadores de tiempo). **[I]** Ésa es la forma correcta de acotar frescura: filtrar por `last_response_at`, no asumir que todo el índice está fresco.

### 3.2 Cobertura geográfica/idioma

| Sub-API | Cobertura | Marca |
|---|---|---|
| **LLM Mentions — `google` (AI Overviews)** | **92 locations** con sus idiomas (result_count del ejemplo oficial); cada combinación location×language expone `responses_count` = cuántas respuestas hay en la base para ese mercado | [V] |
| **LLM Mentions — `chat_gpt`** | **SÓLO Estados Unidos (`location_code: 2840`) e inglés (`en`)**. Repetido como Nota en cada endpoint | [V] |
| **AI Keyword Data** | **94 locations** con idiomas (el ejemplo incluye Venezuela/es) | [V] |
| **LLM Scraper ChatGPT** | **215 locations**, **43 languages**; CSV descargable *"last updated 2026-09-01"* | [V] |
| **LLM Scraper Gemini** | **213 locations**, **43 languages** | [V] |
| **LLM Responses** | No hay lista de locations; se localiza la búsqueda web con `web_search_country_iso_code` (+ `web_search_city` en ChatGPT/Claude). Claude enumera 36 ISO codes (incluye **CL**) | [V] |

**Implicación dura [I] para un cliente LATAM/Chile:** toda la inteligencia de **ChatGPT** dentro de LLM Mentions (menciones, marcas, brand categories, search_results, fan-out) está **restringida a US/EN**. Para Chile sólo hay datos de **Google AI Overviews**. Cualquier informe de "visibilidad en ChatGPT para Chile" construido sobre LLM Mentions sería una extrapolación desde el mercado estadounidense — y hay que decirlo explícitamente. La alternativa para Chile es **LLM Scraper** (que sí acepta location Chile) o **LLM Responses** con `web_search_country_iso_code: "CL"`, pero eso son muestras que tú generas, no un índice histórico.

---

## 4. LLM Mentions API — detalle por endpoint

### 4.0 El bloque `target[]` (común a A1–A15)

Es el corazón de la API. **[V]**

| Campo | Tipo | Oblig. | Valores / límites |
|---|---|---|---|
| `target` | array | **sí** | hasta **10** entidades (objetos). Cada entidad es **o** un `domain` **o** un `keyword`. **Debe incluir al menos una entidad con `"search_filter": "include"`** |

**`domain_entity`:**
| Campo | Tipo | Oblig. | Valores / default |
|---|---|---|---|
| `domain` | string | sí (si no hay `keyword`) | máx **63** chars; **sin** `https://` ni `www.` |
| `search_filter` | string | no | `include` \| `exclude` — default **`include`** |
| `search_scope` | array | no | `any` \| `sources` \| `search_results` — default **`any`**. `search_results` **sólo `chat_gpt`** |
| `include_subdomains` | boolean | no | default **`false`** |

**`keyword_entity`:**
| Campo | Tipo | Oblig. | Valores / default |
|---|---|---|---|
| `keyword` | string | sí (si no hay `domain`) | máx **250** chars |
| `search_filter` | string | no | `include` \| `exclude` — default **`include`** |
| `search_scope` | array | no | `any` \| `question` \| `answer` \| `brand_entities` \| `fan_out_queries` — default **`any`** |
| `match_type` | string | no | `word_match` (full-text con palabras adicionales alrededor: "light" → "light bulb") \| `partial_match` (substring, incluso dentro de una palabra: "light" → "highlight") — default **`word_match`** |

**Parámetros de contexto comunes:**
| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `location_name` / `location_code` | string / integer | **`2840`** (US) | `chat_gpt` sólo admite 2840 |
| `language_name` / `language_code` | string / string | **`en`** | `chat_gpt` sólo admite `en` |
| `platform` | string | *(ninguno)* | `chat_gpt` \| `google`. **Si se omite, devuelve datos de ambas plataformas** |
| `tag` | string | — | máx 255 chars, eco en `data` |

**⚠️ [I]** El default de `platform` (ambas) combinado con la diferencia de escala de `ai_search_volume` entre plataformas (§1.2) significa que un `total.ai_search_volume` sin `platform` fijado **suma peras con manzanas**. En producción hay que **fijar `platform` siempre**.

---

### A1 · `search_mentions/live` — menciones individuales (granular)
**POST** `https://api.dataforseo.com/v3/ai_optimization/llm_mentions/search_mentions/live`
Un solo task por llamada. Ejecución hasta 120 s.

**Parámetros adicionales al bloque común:**
| Campo | Tipo | Oblig. | Valores / límites |
|---|---|---|---|
| `filters` | array | no | máx **8** filtros, con operadores lógicos `and`/`or`. Operadores soportados: `=`, `<>`, `in`, `not_in`, `like`, `not_like`, `ilike`, `not_ilike`, `match`, `not_match` (+ `regex`/`not_regex` con RE2, máx 1000 chars, según la página de Filters). Campos filtrables: `platform`, `location_code`, `language_code`, `ai_search_volume`, `first_response_at`, `last_response_at`, `model_name`, `is_web_search_based` |
| `order_by` | array | no | máx **3** reglas; formato `["ai_search_volume,desc"]`. **No se puede ordenar por campos `array.str` / `array.num`** |
| `offset` | integer | no | default `0`, **máx 1.000.000**; más allá, usar `search_after_token` |
| `search_after_token` | string | no | token de la respuesta previa. **Si se envía, todos los demás parámetros deben ser idénticos al request anterior** |
| `limit` | integer | no | default **100**, **máx 1000** |

**Campos de respuesta — `result[0]`:**
`total_count` (total relevante), `current_offset`, `search_after_token`, `items_count`, `items[]`.

**`items[]` (una mención = una respuesta de LLM):**
| Campo | Tipo | Significado |
|---|---|---|
| `platform` | string | `chat_gpt` \| `google` |
| `model_name` | string | *"for the google platform type, the value is always `google_ai_overview`"* |
| `location_code`, `language_code` | int / string | contexto |
| `question` | string | **el prompt/pregunta real** que produjo la respuesta |
| `answer` | string | **la respuesta del LLM, en markdown** |
| `sources[]` | array | **las citas reales**: `rank`, `title`, `domain`, `url`, `snippet`, `source_name`, `thumbnail`, `markdown`, `publication_date` |
| `search_results[]` | array | pool crudo consultado. `description`, `breadcrumb`, `rank`, `title`, `domain`, `url`, `publication_date`. **Sólo `chat_gpt`** |
| `ai_search_volume` | integer | volumen estimado del keyword (ver §1.2) |
| `monthly_searches[]` | array | `{year, month, search_volume}` |
| `first_response_at` / `last_response_at` | string UTC | primera captura / última actualización de esa respuesta |
| `brand_entities[]` | array | `rank`, `title` (marca), `category`. **Sólo `chat_gpt`** |
| `fan_out_queries[]` | array | consultas derivadas del prompt principal. **Sólo `chat_gpt`** |
| `is_web_search_based` | boolean | `true` = el modelo usó búsqueda web en vivo; `false` = salió del conocimiento interno del modelo |

**[I] `is_web_search_based` es el campo más subestimado de toda la API:** separa "me citan porque mi contenido es indexable y recuperable" de "me mencionan porque estoy en los pesos del modelo". Son dos estrategias AEO completamente distintas y esta bandera las distingue. Además es filtrable.

---

### A2 · `target_metrics/live` — métricas agregadas de un target
**POST** `…/llm_mentions/target_metrics/live`

**Parámetros adicionales:**
| Campo | Tipo | Valores / default |
|---|---|---|
| `initial_dataset_filters` | array | máx 8, misma sintaxis que `filters`. **Se aplican al dataset crudo ANTES de agregar** (*"define which source records should be included in the metric calculation"*). **No se pueden usar `initial_dataset_filters` y `filters` a la vez** |
| `internal_list_limit` | integer | min 1, máx 10, **default 10** — limita `sources_domain` y `search_results_domain` |

**Respuesta — importante:** `total_count`, `offset`, `items_count` **siempre valen 0** y `items` **siempre es `null`**. Todo el dato está en `aggregated_metrics`. **[V]**

**`aggregated_metrics`** — cada dimensión es un array de `{key, mentions, ai_search_volume}`:
`location[]` (key=location_code) · `language[]` · `platform[]` · `sources_domain[]` (dominios citados) · `search_results_domain[]` *(sólo chat_gpt)* · `brand_entities_title[]` *(sólo chat_gpt)* · `brand_entities_category[]` *(sólo chat_gpt)* · `total{mentions, ai_search_volume}`.

**Filtros disponibles:** `platform`, `location_code`, `language_code`, `ai_search_volume`, `first_response_at`, `last_response_at`, `model_name`, `is_web_search_based`.

---

### A3 · `target_metrics_lite/live` — versión simplificada
**POST** `…/llm_mentions/target_metrics_lite/live`

Diferencias vs A2 **[V]**:
- Parámetros: **no** acepta `filters` ni `internal_list_limit`; sí `initial_dataset_filters`, `limit`, `order_by`, `offset`.
- Respuesta: **sí devuelve `items[]`** (a diferencia de A2), con forma plana: `{location, language, platform, metrics:{mentions, ai_search_volume}}`.
- **No devuelve** `sources_domain`, `search_results_domain`, `brand_entities_*`.
- Filtros disponibles: `platform`, `location`, `language`, `metrics.mentions`, `metrics.ai_search_volume`.

**[I]** "Lite" = pivot table plana en vez de estructura anidada por dimensión. Es lo que quieres si vas a cargar a una tabla SQL; la versión completa es lo que quieres si vas a hacer un informe de competidores en una sola llamada. **[?]** El proveedor no publica diferencia de precio entre lite y completa.

---

### A4 · `multi_target_metrics/live` — comparación multi-marca
**POST** `…/llm_mentions/multi_target_metrics/live`

Cambia la forma del request: en vez de `target` usa **`targets[]`**:
| Campo | Tipo | Oblig. | Límites |
|---|---|---|---|
| `targets` | array | **sí** | **mínimo 2, máximo 10** conjuntos, cada uno con su `key` |
| `targets[].key` | string | sí | etiqueta de agrupación, máx **250** chars |
| `targets[].target` | array | sí | hasta **10** entidades domain/keyword por conjunto (misma estructura de §4.0) |

Otros: `limit` (default 100, máx 1000), `offset` (máx 1.000.000, luego `search_after_token`), `internal_list_limit` (1–10, **default 5**).

**Respuesta:** `items[]` con un objeto **por `key`**, cada uno con `location[]`, `language[]`, `platform[]`, `sources_domain[]`, `search_results_domain[]`, `total{}`.
**Filtros:** `key`, `total.mentions`, `total.ai_search_volume`.

**[I]** Éste es el endpoint de *share of voice*: una llamada, N marcas, mismas condiciones → comparable. Hacer N llamadas a `target_metrics` sería más caro y más frágil.

---

### A5–A12 · Familia `top_mentioned_*`

Todas comparten forma. **POST** `…/llm_mentions/top_mentioned_{domains|pages|brands|brand_categories}[_lite]/live`

**Parámetros comunes:** bloque §4.0 + `filters` (8 máx) + `initial_dataset_filters` (8 máx) + `limit` (min 1, máx **1000**, default **100**) + `internal_list_limit` (1–10, default **5**) + `order_by` (máx 3) + `offset` (máx 1.000.000) + `tag`.

**Parámetros específicos:**
| Endpoint | Exclusivos | `links_scope` |
|---|---|---|
| `top_mentioned_domains` | `include_domains[]`, `exclude_domains[]` | ✅ `sources` \| `search_results` — default **`sources`**; `search_results` sólo `chat_gpt` |
| `top_mentioned_pages` | `include_pages[]`, `exclude_pages[]` | ✅ igual |
| `top_mentioned_brands` | `include_brands[]`, `exclude_brands[]` | ❌ |
| `top_mentioned_brand_categories` | `include_brand_categories[]`, `exclude_brand_categories[]` | ❌ |

**⚠️ Nota del proveedor [V]:** *"data specific to brand entities is available for ChatGPT (`platform: chat_gpt`) only"* → A9–A12 **sólo funcionan con ChatGPT**, y ChatGPT sólo tiene datos **US/EN**. Es decir: **top brands y brand categories son US-only.**

**Respuesta:** `total_count`, `offset`, `items_count`, `aggregated_metrics{…}` (idéntico a A2) + `items[]`, donde cada item lleva su clave (`domain` \| `page` \| `brand` \| `brand_category`) y luego sus propios `location[]`, `language[]`, `platform[]`, `sources_domain[]`, `search_results_domain[]`.

**Variantes `_lite`:** mismos parámetros de entrada (incluido `links_scope` en domains/pages) pero `items[]` plano: `{domain|page|brand|brand_category, location, language, platform, metrics:{mentions, ai_search_volume}}`.
**Filtros (no-lite):** `domain`/`page`/`brand`/`brand_category`, `total.mentions`, `total.ai_search_volume`.
**Filtros (lite):** + `platform`, `location`, `language`, `metrics.mentions`, `metrics.ai_search_volume`.

---

### A13 · `historical/live` — serie mensual
**POST** `…/llm_mentions/historical/live`

| Campo | Tipo | Oblig. | Límites |
|---|---|---|---|
| `target` | array | sí | §4.0 |
| `date_from` | string | no | **mínimo `2025-08-01`**, formato `yyyy-mm-dd` |
| `date_to` | string | no | `date_from` ≤ `date_to` |
| `location_*`, `language_*`, `platform`, `tag` | — | no | §4.0 |

**Respuesta:** `items_count`, `items[]` = un objeto **por mes calendario**: `{year, month, metrics:{mentions, ai_search_volume}}`.
**[V]** No acepta `filters`, `limit`, `offset` ni `order_by`.

---

### A14 · `timeseries_delta/live` — variación entre fechas
**POST** `…/llm_mentions/timeseries_delta/live`

| Campo | Tipo | Oblig. | Valores |
|---|---|---|---|
| `target` | array | sí | §4.0 |
| `date_from` | string | **sí** | mínimo `2025-08-01` |
| `date_to` | string | **sí** | ≥ `date_from` |
| `group_range` | string | **sí** | `day` \| `week` \| `month` \| `year` |

**Respuesta `items[]`:** `{date, delta_mentions, delta_ai_search_volume}` — *"the difference … between the current timestamp and the previous one"*.

---

### A15 · `timeseries_new_lost/live` — ganadas vs perdidas
**POST** `…/llm_mentions/timeseries_new_lost/live`

Mismos parámetros que A14 (`date_from`, `date_to`, `group_range` obligatorios).

**Semántica textual [V]:** *"The **lost** values indicate the LLM responses that previously contained the specified target, do not contain it anymore. Accordingly, **new** values indicate the LLM responses that contain the target at the `date_to` timestamp, did not contain it at the `date_from` timestamp."*
**Respuesta `items[]`:** `{date, new_mentions, lost_mentions, new_ai_search_volume, lost_ai_search_volume}`.

**[I]** Es el endpoint de alerta: "perdimos 40 citas este mes" es una señal accionable que ningún agregado estático entrega. Debería ser la base de cualquier monitoreo continuo de AEO.

---

### A16 · `locations_and_languages` (GET, gratis)
**GET** `…/llm_mentions/locations_and_languages`
Respuesta: `result[]` con `location_code`, `location_name`, `available_languages[]` = `{available_platforms[], language_name, language_code, responses_count}`.
`available_platforms` **[V]:** *"only `google` and `chat_gpt` are currently available"*.
`responses_count` **[V]:** *"the number of LLM responses available in the database for the certain location and language parameters"*.

**[I]** `responses_count` es el único indicador público de **densidad de datos por mercado**. Antes de vender un informe AEO para un país, hay que consultar este endpoint (es gratis) y comprobar si ese mercado tiene una muestra suficiente. Ejemplo real del doc: Albania/albanés = **172** respuestas; Argelia/árabe = **196.053**. Un informe sobre una base de 172 respuestas no es representativo.

### A17 · `available_filters` (GET, gratis)
**GET** `…/llm_mentions/available_filters` (la página de docs se llama `/filters/`).
También descargable: `https://cdn.dataforseo.com/v3/available_filters.php?api=ai_optimization/llm_mentions`.

Lista completa verificada al 2026-09-11 **[V]**:

| Endpoint | Campos filtrables (tipo) |
|---|---|
| `search` *(legacy)* | `platform`(str), `location_code`(num), `language_code`(str), `ai_search_volume`(num), `first_response_at`(time), `last_response_at`(time), `model_name`(str) |
| `search_mentions` | los anteriores + `is_web_search_based`(bool) |
| `target_metrics` | idem `search_mentions` |
| `multi_target_metrics` | `key`(str), `total.mentions`(num), `total.ai_search_volume`(num) |
| `top_mentioned_domains` | `domain`(str), `total.mentions`, `total.ai_search_volume` |
| `top_mentioned_pages` | `page`(str), `total.mentions`, `total.ai_search_volume` |
| `top_mentioned_brands` | `brand`(str), `total.mentions`, `total.ai_search_volume` |
| `top_mentioned_brand_categories` | `brand_category`(str), `total.mentions`, `total.ai_search_volume` |
| `target_metrics_lite` | `platform`, `location`(num), `language`, `metrics.mentions`, `metrics.ai_search_volume` |
| `top_mentioned_{domains,pages,brands,brand_categories}_lite` | `platform`, la clave propia, `location`, `language`, `metrics.mentions`, `metrics.ai_search_volume` |

Operadores **[V]**: num → `<, <=, >, >=, =, <>, in, not_in`; str → `match, not_match, like, not_like, ilike, not_ilike, in, not_in, =, <>, regex, not_regex`; time → `<, <=, >, >=` (formato `yyyy-mm-dd hh-mm-ss +00:00`). `in`/`not_in` requieren array como valor. `regex` usa sintaxis **RE2**, máx 1000 chars.

### L1 / L2 · Alias legacy
**[V] Textual del aviso en cada página:**
- `search/live` → *"This endpoint has been replaced by `…/search_mentions/live/`"*
- `aggregated_metrics/live` → *"This endpoint has been replaced by `…/target_metrics/live/`"*
- Ambos: *"The current path … will continue to be supported for the foreseeable future (no deprecation date is set), but all new integrations must use the new path."*

**[I]** Si encuentras código existente apuntando a `search/live` o `aggregated_metrics/live`, funciona, pero hay que migrarlo. No hay fecha de corte publicada.

---

## 5. AI Keyword Data API

### B1 · `keywords_search_volume/live`
**POST** `https://api.dataforseo.com/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live`
Un task por llamada; turnaround ~2 s.

| Campo | Tipo | Oblig. | Valores / límites |
|---|---|---|---|
| `keywords` | array | **sí** | **máx 1000 keywords** por request; **máx 250 chars** por keyword; **se convierten a minúsculas**; UTF-8 |
| `location_name` | string | sí si no hay `location_code` | ej. `United Kingdom` |
| `location_code` | integer | sí si no hay `location_name` | ej. `2840` |
| `language_name` | string | sí si no hay `language_code` | ej. `English` |
| `language_code` | string | sí si no hay `language_name` | ej. `en` |
| `tag` | string | no | máx 255 chars |

**Ojo [V]:** aquí `location_*` y `language_*` **son obligatorios** (a diferencia de LLM Mentions, donde tienen default). No hay `filters`, `order_by`, `limit` ni `offset`.

**Respuesta — `result[0]`:** `location_code`, `language_code`, `items_count`, `items[]`:
| Campo | Tipo | Significado |
|---|---|---|
| `keyword` | string | keyword especificado (en minúsculas) |
| `ai_search_volume` | integer | tasa actual (último mes) |
| `ai_monthly_searches[]` | array | `{year, month, ai_search_volume}` — **12 meses** |

**Ejemplo real del doc [V]:** `iphone` → `ai_search_volume: 407838`, con meses previos 413611 / 641232 / 634043 / 650448 / 420931 … y **`0` en jun–ago 2024**.
**[I] Los ceros importan:** indican que la serie no tiene cobertura antes de ~sep-2024. Cualquier cálculo de crecimiento YoY que no excluya los ceros producirá "crecimiento infinito" espurio.

**Coste [V]:** `$0.01/tarea + $0.0001/keyword`. Con el tope de 1000 keywords por request, el óptimo es **llenar siempre los 1000** (si mandas 10 keywords pagas $0.011 → $0.0011 por keyword; si mandas 1000 pagas $0.11 → $0.00011 por keyword: **10x más barato por keyword**). **[I]**

### B2 · `locations_and_languages` (GET, gratis)
**94 locations** con `available_languages[]` = `{language_name, language_code}`. Sin `responses_count` (a diferencia de LLM Mentions). **[V]**

---

## 6. LLM Responses API

### 6.1 Estructura
4 plataformas: `chat_gpt`, `claude`, `gemini`, `perplexity`. Cada una con `live`, `models` y — salvo Perplexity — `task_post`/`tasks_ready`/`task_get`.

**[V]** *"ChatGPT, Gemini, and Claude support both methods. Perplexity supports only Live retrieval."* Confirmado por probe: `…/perplexity/llm_responses/task_post/` devuelve **404**.

### 6.2 · C1 `…/{platform}/llm_responses/live` — parámetros

**Comunes a las 4 plataformas:**
| Campo | Tipo | Oblig. | Límites / default |
|---|---|---|---|
| `user_prompt` | string | **sí** | **máx 500 caracteres** |
| `model_name` | string | **sí** | si das el nombre base, se resuelve a la última versión (ej. `gpt-4.1` → `gpt-4.1-2025-04-14`) |
| `max_output_tokens` | integer | no | **máx 4096**, default **2048** (mínimos varían, ver tabla) |
| `temperature` | float | no | rango y default varían por plataforma |
| `top_p` | float | no | **no combinable con `temperature`** en el mismo request |
| `system_message` | string | no | **máx 500 caracteres** |
| `message_chain` | array | no | **máx 10 objetos**, cada uno `{role: "user"\|"ai", message: <máx 500 chars>}` |
| `tag` | string | no | máx 255 chars |

**Diferencias por plataforma [V]:**

| Parámetro | ChatGPT | Claude | Gemini | Perplexity |
|---|---|---|---|---|
| `max_output_tokens` min | 1024 (reasoning) / 16 (no-reasoning) | 1 (**1025** si `use_reasoning`) | 1 (**1024** si `use_reasoning`) | 1 |
| `temperature` rango / default | 0–**2** / **0.94**; *no soportado en modelos reasoning* | 0–**1** / **0.7** | 0–2 / **1.3** | 0–**1.9** / **0.77** |
| `top_p` default | **0.92** | **null** | **0.9** | **0.9** |
| `web_search` | ✅ default `false` | ✅ default `false` (*"The cost of the parameter can be calculated on the Pricing page"*) | ✅ default `false` | ❌ — *"Perplexity uses web_search in all sonar-family models by default, but it's not guaranteed to work with every request"* |
| `force_web_search` | ✅ (requiere `web_search`; **no soportado en reasoning**) | ✅ | ❌ | ❌ |
| `web_search_country_iso_code` | ✅ (no soportado en `o3-mini`, `o1-pro`, `o1`) | ✅ **lista cerrada de 36**: `AR,AT,AU,BE,BR,CA,CH,CL,CN,DE,DK,ES,FI,FR,GB,HK,ID,IN,IT,JP,KR,MX,MY,NL,NO,NZ,PH,PL,PT,RU,SA,SE,TR,TW,US,ZA` | ❌ | ✅ *"available only for Perplexity Sonar models"* |
| `web_search_city` | ✅ (mismas exclusiones) | ✅ | ❌ | ❌ |
| `use_reasoning` | ❌ (implícito en el modelo) | ✅ default `false`; si `true` → `force_web_search` debe ser `false` y **no** se pueden usar `temperature`/`top_p` | ✅ default `false`; **en modelos Gemini Pro se fuerza a `true` automáticamente** | ❌ |
| `message_chain` | libre | libre | libre | **debe alternar estrictamente user → ai** |

**Nota curiosa [V]:** la lista ISO de Claude incluye `RU`, pese a que la plataforma declara que Rusia/Bielorrusia no están soportadas. **[I]** Contradicción documental; no asumir que funciona.

### 6.3 · C2 `task_post` — parámetros adicionales
Sobre los de `live`, añade **[V]**: `postback_url` (POST con resultados gzip; soporta variables `$id` y `$tag`), `pingback_url` (GET de notificación). **No** hay `priority` en LLM Responses (sí en LLM Scraper). Batch: **hasta 100 tareas por POST** (excedente → error 40006).
Aviso explícito: *"this endpoint requires making an automatic prepayment of $0.01 to execute the task. If the cost charged by the LLM is less than $0.01, the difference will be refunded to your account balance."*

### 6.4 · C5 `models` (GET, gratis) — campos y catálogos

**Campos de cada modelo [V]:** `model_name`, `reasoning` (bool), `web_search_supported` (bool), `task_post_supported` (bool — *"if true, you can use the Standard (POST-GET) data retrieval method with the AI model"*).

**⚠️ Estos catálogos son los del EJEMPLO de la documentación, no una lista contractual.** Rotan. **La lista viva se obtiene gratis llamando al endpoint `models`** — hacerlo antes de cualquier integración. **[I]**

**ChatGPT — 20 identificadores en el ejemplo [V]:**
| `model_name` | reasoning | web_search | task_post |
|---|---|---|---|
| `o4-mini` / `o4-mini-2025-04-16` | ✅ | ✅ | ✅ |
| `o3-mini` / `o3-mini-2025-01-31` | ✅ | ❌ | ✅ |
| `o1` / `o1-2024-12-17` | ✅ | ❌ | ✅ |
| `gpt-5` / `gpt-5-2025-08-07` | ✅ | ✅ | ✅ |
| `gpt-5-mini` / `gpt-5-mini-2025-08-07` | ✅ | ✅ | ✅ |
| `gpt-5-nano` / `gpt-5-nano-2025-08-07` | ✅ | ✅ | ✅ |
| `gpt-4o` / `-2024-05-13` / `-2024-08-06` / `-2024-11-20` | ❌ | ✅ | ✅ |
| `gpt-4o-mini` / `gpt-4o-mini-2024-07-18` | ❌ | ✅ | ✅ |
| `gpt-4.1-nano` | ❌ | ❌ | ✅ |
| `gpt-3.5-turbo-1106` | ❌ | ❌ | ✅ |

*(la doc de `live` además menciona `gpt-4.1` → `gpt-4.1-2025-04-14` como ejemplo de resolución de versión, aunque `gpt-4.1` no aparece en el listado de ejemplo)*

**Claude — 14 identificadores [V]:**
| `model_name` | reasoning | web_search | task_post |
|---|---|---|---|
| `claude-sonnet-4-0` / `claude-sonnet-4-20250514` | ✅ | ✅ | ✅ |
| `claude-opus-4-0` / `claude-opus-4-20250514` | ✅ | ✅ | ✅ |
| `claude-3-7-sonnet-latest` / `claude-3-7-sonnet-20250219` | ✅ | ✅ | ✅ |
| `claude-3-5-sonnet-latest` / `claude-3-5-sonnet-20241022` | ❌ | ✅ | ✅ |
| `claude-3-5-sonnet-20240620` | ❌ | ❌ | ✅ |
| `claude-3-5-haiku-latest` / `claude-3-5-haiku-20241022` | ❌ | ✅ | ✅ |
| `claude-3-opus-latest` / `claude-3-opus-20240229` | ❌ | ❌ | ✅ |
| `claude-3-haiku-20240307` | ❌ | ❌ | ✅ |

**Gemini — 23 identificadores [V]:**
`gemini-2.5-pro` (+ `-preview-03-25`, `-preview-05-06`, `-preview-06-05`) · `gemini-2.5-flash` (+ `-preview-05-20`) · `gemini-2.5-flash-lite` (+ `-preview-06-17`) → todos `reasoning: true`, `web_search: true`.
`gemini-2.0-flash` (+ `-001`) → `reasoning: false`, `web_search: true`.
`gemini-2.0-flash-lite` (+ `-001`, `-preview`, `-preview-02-05`) → `reasoning: false`, **`web_search: false`**.
`gemini-1.5-pro` (+ `-002`, `-latest`) · `gemini-1.5-flash` (+ `-002`, `-latest`) · `gemini-1.5-flash-8b` (+ `-001`, `-latest`) → `reasoning: false`, `web_search: true`.

**🔴 Inconsistencia documental importante [V]:** en el ejemplo del endpoint `models` de Gemini, **los 23 modelos traen `task_post_supported: false`**, pese a que Gemini sí tiene páginas de `task_post`/`tasks_ready`/`task_get` y a que el overview afirma que Gemini soporta ambos métodos. **[I]** Antes de construir un pipeline Standard sobre Gemini hay que verificar el flag contra el endpoint `models` en vivo; si sale `false`, el único camino es `live` (≈16x más caro por tarea base: $0.0006 vs $0.0002… aunque en la práctica el coste lo domina el LLM).

**Perplexity — 3 identificadores [V]:**
| `model_name` | reasoning | web_search | task_post |
|---|---|---|---|
| `sonar-reasoning-pro` | ✅ | ✅ | ❌ |
| `sonar-pro` | ❌ | ✅ | ❌ |
| `sonar` | ❌ | ✅ | ❌ |

### 6.5 Estructura de respuesta de LLM Responses **[V]**

`result[0]`:
| Campo | Tipo | Significado |
|---|---|---|
| `model_name` | string | modelo efectivamente usado |
| `input_tokens` / `output_tokens` | integer | conteos |
| `reasoning_tokens` | integer | tokens de razonamiento (**ausente en Perplexity**) |
| `web_search` | boolean | si se usó búsqueda web (en Perplexity: *"web search is enabled by default in Sonar models"*) |
| `money_spent` | float | **coste de tokens cobrado por el proveedor tercero** |
| `datetime` | string UTC | `yyyy-mm-dd hh-mm-ss +00:00` |
| `items[]` | array | contenido estructurado |
| `fan_out_queries[]` | array | *"related search queries derived from the main query"* |

`items[]` contiene dos tipos de objeto:
- **`reasoning`** (`type: 'reasoning'`) → `sections[]` de `{type:'summary_text', text}`. *"supported only in reasoning models and is not guaranteed to be returned"*. **No existe en Perplexity.**
- **`message`** (`type: 'message'`) → `sections[]` de `{type:'text', text, annotations[]}`.
  - `annotations[]` = `{title, url, start_index, end_index, text}` → **las citas**, con **offsets de carácter dentro del texto**.
  - *"equals null if the `web_search` parameter is not set to true"*.
  - *"annotations may return empty even when `web_search` is true, as the AI will attempt to retrieve web information but may not find relevant results"*.
  - **Gemini:** `url` es *"redirect URL to the quoted source — contains a Vertex AI redirect that leads to the original source"* → **hay que resolver el redirect para obtener el dominio real**. **[V]**

**[I]** En Perplexity `items[]` es más plano (sin envoltorio `reasoning`/`message`: `type` y `sections` están al mismo nivel). Un parser único para las 4 plataformas debe contemplarlo.

---

## 7. LLM Scraper API

### 7.1 · D1 `task_post` — parámetros
**POST** `…/{chat_gpt|gemini}/llm_scraper/task_post`

| Campo | Tipo | Oblig. | Valores / default | chat_gpt | gemini |
|---|---|---|---|---|---|
| `keyword` | string | **sí** | **máx 2000 chars**; `%##` se decodifica (`+` → espacio); usar `%25` para `%` y `%2B` para `+` | ✅ | ✅ |
| `priority` | integer | no | **1** = normal (default), **2** = alta (se cobra más) | ✅ | ✅ |
| `location_name` / `location_code` | string / integer | sí (uno de los dos) | de `/locations` | ✅ | ✅ |
| `location_coordinate` | string | alternativa | `"lat,lng,radius"`; máx 7 decimales; radius **199–199999 (mm)**; ej. `53.476225,-2.243572,200` | ❌ | ✅ |
| `language_name` / `language_code` | string | sí (uno de los dos) | de `/languages` | ✅ | ✅ |
| `force_web_search` | boolean | no | default `false`. *"even if the parameter is set to true, there is no guarantee web sources will be cited"* | ✅ | ❌ |
| `expand_citations` | boolean | no | default `false`; **requiere `force_web_search: true`** (en ChatGPT); *"the HTML endpoint will return data from the expanded citation bar"* | ✅ | ✅ |
| `tag` | string | no | máx 255 | ✅ | ✅ |
| `postback_url` | string | no | resultados gzip por POST; variables `$id`, `$tag` | ✅ | ✅ |
| `postback_data` | string | **sí si hay `postback_url`** | `advanced` \| `html` | ✅ | ✅ |
| `pingback_url` | string | no | notificación GET | ✅ | ✅ |

**Nota [V]:** los endpoints **Live** (`live/advanced`, `live/html`) **no aceptan `priority`, `postback_*` ni `pingback_*`**; y `live/advanced` de Gemini **no acepta `expand_citations`** (sólo `keyword`, `location_*`, `location_coordinate`, `language_*`, `tag`).
Batch: `task_post` **hasta 100 tareas por POST**; Live **1 tarea por llamada**.

### 7.2 · D5 `live/advanced` — estructura de respuesta ChatGPT **[V]**

`result[0]`: `keyword`, `location_code`, `language_code`, **`model`** (*"indicates the model version"* — read-only), **`check_url`** (*"direct URL to search engine results"*), `datetime`, `markdown`, `se_results_count`, `item_types[]`, `items_count`, `items[]`, más tres arrays de alto nivel:

| Array | Contenido |
|---|---|
| `search_results[]` | `type: 'chatgpt_search_result'`, `url`, `domain`, `title`, `description`, `breadcrumb`. *"all web search outputs the model retrieved … including duplicates and unused entries"* |
| `sources[]` | `type: 'chat_gpt_source'`, `title`, `snippet`, `domain`, `url`, `thumbnail`, `source_name`, `publication_date`, `markdown`. *"the sources the model actually cited or relied on in its final answer"* |
| `fan_out_queries[]` | consultas derivadas |
| `brand_entities[]` | `type: 'chat_gpt_brand_entity'`, `title` (marca), `category`, `markdown`, `urls[]` = `{url, domain}` |

**`item_types` posibles (ChatGPT) [V]:** `chat_gpt_text`, `chat_gpt_table`, `chat_gpt_navigation_list`, `chat_gpt_images`, `chat_gpt_local_businesses`, `chat_gpt_products`.

Cada item lleva `rank_group` (*"position within a group of elements with identical type values"*) y `rank_absolute` (*"absolute position among all the elements in SERP"*), más `markdown`.
- `chat_gpt_text`: + `sources[]`, `brand_entities[]`
- `chat_gpt_table`: + `text`, `table{table_header[], table_content[]}`, `brand_entities[]`
- `chat_gpt_navigation_list`: + `title`, `sources[]`
- `chat_gpt_images`: + `items[]` = `{type:'chat_gpt_images_element', alt, url, image_url, markdown}` (*"image_url … leading to the image on the original resource or DataForSEO storage (in case the original source is not available)"*)
- `chat_gpt_local_businesses`: + `items[]` = `{title, description, address, phone, reviews_count, url, domain, rating{rating_type: Max5|Percents|CustomMax, …}}`
- `chat_gpt_products`: documentado en la misma página (estructura de producto)

### 7.3 · Gemini `live/advanced` — diferencias **[V]**
- **No** devuelve `check_url`, **no** devuelve `search_results[]` de alto nivel, **no** devuelve `brand_entities[]`, **no** devuelve `fan_out_queries[]`.
- `sources[]` usa `type: 'gemini_source'`.
- `item_types` posibles: **sólo `gemini_text`, `gemini_table`, `gemini_images`**.
- Los items de Gemini añaden `original_text` (*"unformatted text content of the element"*), que ChatGPT no tiene.

**[I]** El *brand entity extraction* — probablemente lo más comercialmente valioso del Scraper — **existe sólo para ChatGPT**. Para Gemini hay que extraer marcas por cuenta propia desde `markdown`/`original_text`.

### 7.4 · D6 `live/html` / D4 `task_get/html`
Devuelven la página HTML cruda. Mismos parámetros de entrada que `advanced` + `expand_citations`. **[I]** Útil para auditar/depurar el parseo o para capturar elementos que el parser `advanced` todavía no tipifica. Mismo precio por results page.

### 7.5 · D7/D8 locations & languages (GET, gratis)
- ChatGPT: `…/llm_scraper/locations` y `…/llm_scraper/locations/$country` (filtro por ISO code de país, ej. `us`). **215 locations**, CSV descargable *"last updated 2026-09-01"*. **43 languages**, CSV *"last updated 2023-05-02"*.
- Gemini: `…/llm_scraper/locations` (sin filtro `$country` documentado), **213 locations**; **43 languages**.

---

## 8. Caveats, limitaciones y avisos del proveedor

### 8.1 Declarados explícitamente por DataForSEO **[V]**
1. **Metodología no divulgada.** *"we do not disclose our internal algorithms"* (página de producto de LLM Mentions). Las menciones provienen de *"various internal data sources and proprietary databases"*.
2. **`ai_search_volume` es una estimación**, no una medición: *"estimated frequency"*.
3. **Formas gramaticales colapsadas:** "tie" y "ties" obtienen el mismo valor.
4. **Frases multi-palabra:** sólo cuentan las preguntas de IA que contienen **todas** las palabras especificadas.
5. **No comparable entre plataformas:** Google AIO vs ChatGPT calculan `ai_search_volume` con métodos distintos.
6. **`annotations` puede venir vacío aunque `web_search: true`**: *"the AI will attempt to retrieve web information but may not find relevant results"*.
7. **`force_web_search: true` no garantiza citas**: *"there is no guarantee web sources will be cited in the response"*.
8. **Perplexity:** *"uses web_search in all sonar-family models by default, but it's **not guaranteed to work with every request**"*.
9. **Elemento `reasoning` no garantizado:** *"is not guaranteed to be returned"* incluso en modelos reasoning.
10. **`max_output_tokens` puede excederse** si `web_search: true` o el modelo es reasoning.
11. **`tasks_ready` tiene retraso:** *"due to the peculiarities of our architecture the queue of completed tasks is updated with a small delay, which can be an issue for high-volume users"* → sobre 1000 tareas/min, usar pingback/postback.
12. **Cobertura ChatGPT en Mentions: sólo US/EN.** Repetido en cada endpoint.
13. **Brand entities: sólo ChatGPT.**
14. **Histórico: nada antes de 2025-08-01.**
15. **Balance negativo bloquea la entrega** de resultados ya completados.

### 8.2 Silencios del proveedor — **NO publicado, no inventar** **[?]**
- **Frecuencia de actualización del índice de menciones.** No hay ninguna declaración de cadencia (diaria/semanal/mensual).
- **Metodología de muestreo:** cómo se eligen los prompts que entran a la base, si hay sesgo de selección, si son prompts reales de usuarios o generados. No se dice.
- **Representatividad:** no hay margen de error, intervalo de confianza ni comparación con ground truth.
- **Tamaño total del índice — cifras inconsistentes entre páginas del propio proveedor:**
  - Página LLM Mentions API: **ChatGPT 27.589.737 prompts + Google AIO 331.325.307 = 358.915.044 total**.
  - Página AI Optimization API: **"280M+ LLM prompts"**.
  **[I]** Ambas son afirmaciones de marketing con distinta fecha de corte; la primera es más granular y más alta. Ninguna está en la doc técnica. Si se cita a un cliente, hay que fechar la cita.
- **Precio por modelo LLM concreto.**
- **Qué cuenta exactamente como "row" facturable en los endpoints agregados de LLM Mentions.**
- **SLA / uptime de AI Optimization** (hay Status Page, pero sin compromiso publicado para esta familia).
- **Si el Sandbox cubre AI Optimization** (las páginas de producto dicen que sí; el appendix de Sandbox no lo enumera).
- **Cuánto tiempo vive un dato de mención** en el índice antes de considerarse "lost".

### 8.3 Riesgos de implementación identificados **[I]**
1. **Riesgo de facturación en agregados.** `target_metrics` cobra `$0.1 + $0.001 × rows`, pero devuelve `items_count: 0` y `items: null`. Si "row" se contara sobre el dataset agregado (no sobre lo devuelto), una consulta amplia podría costar mucho más de lo esperado. **Acción: medir `tasks[].cost` en la primera llamada real antes de escalar**, y usar `initial_dataset_filters` para acotar el dataset.
2. **`platform` sin fijar mezcla escalas.** Ver §1.2 y §4.0.
3. **Gemini `task_post_supported: false`** en el catálogo de ejemplo contradice la existencia del endpoint. Verificar en vivo.
4. **`search_after_token` exige request idéntico** — cualquier cambio de parámetro entre páginas invalida la paginación silenciosamente.
5. **`offset` tope 1.000.000**; más allá, obligatorio `search_after_token`.
6. **`initial_dataset_filters` y `filters` son mutuamente excluyentes** en los endpoints que aceptan ambos.
7. **URLs de Gemini en LLM Responses son redirects de Vertex AI** — agrupar por dominio sin resolverlos produce "vertexaisearch.cloud.google.com" como fuente dominante, que es basura analítica.
8. **El campo `impressions`** aparece prometido en el texto del overview de AI Optimization (*"metrics like AI search volume, impressions and mentions count"*) pero **no existe en ningún schema de ningún endpoint** (verificado por búsqueda en las 62 páginas descargadas). No planificar sobre él.

---

## 9. Notas de diseño para una integración (todo **[I]**)

- **Barato → caro:** `locations_and_languages` + `available_filters` + `models` son gratis; úsalos como preflight. `AI Keyword Data` es el dato más barato por unidad ($0.0001/keyword a batch lleno). `LLM Mentions` es caro por fila. `LLM Responses` tiene coste variable no acotado a priori (lo pone el LLM). `LLM Scraper` es el único con precio fijo por página y tres niveles de latencia.
- **Presupuesto acotable vs no acotable:** Mentions, Keyword Data y Scraper tienen coste calculable *antes* de llamar. LLM Responses **no** — sólo se conoce leyendo `money_spent`. Para un guard de gasto, LLM Responses necesita un tope por tarea aplicado con `max_output_tokens` y evitando `web_search` salvo cuando sea el objeto de la medición.
- **Lo que cada cosa responde bien:**
  - *"¿me citan hoy en IA y quién más?"* → LLM Mentions (`target_metrics` + `top_mentioned_domains` con `search_scope: ["sources"]`).
  - *"¿estoy ganando o perdiendo?"* → `timeseries_new_lost` + `historical`.
  - *"¿cómo me comparo con N competidores?"* → `multi_target_metrics` (una llamada).
  - *"¿qué me responde el modelo X hoy sobre este prompt?"* → LLM Responses.
  - *"¿qué ve un usuario real en ChatGPT/Gemini para esta consulta, en Chile?"* → LLM Scraper.
  - *"¿qué demanda conversacional hay por este tema?"* → AI Keyword Data.
- **Chile/LATAM:** Mentions sólo aporta Google AI Overviews. Para ChatGPT en Chile hay que **generar** la muestra (Scraper con location Chile, o Responses con `web_search_country_iso_code: "CL"`), lo que convierte la medición en un panel propio con coste recurrente y decisiones de muestreo que hay que documentar (qué prompts, con qué frecuencia, con qué modelo).
- **Todo Live, sin webhooks:** Mentions y Keyword Data no tienen `task_post`, luego no hay pingback/postback. Cualquier job masivo sobre ellos es un bucle síncrono limitado a 30 concurrentes.

---

## 10. URLs consultadas

### Documentación técnica (`docs.dataforseo.com`) — 62 páginas descargadas y parseadas
```
https://docs.dataforseo.com/v3/ai_optimization/overview/
https://docs.dataforseo.com/v3/ai_optimization/ai_keyword_data/overview/
https://docs.dataforseo.com/v3/ai_optimization/ai_keyword_data/locations_and_languages/
https://docs.dataforseo.com/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/overview/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/filters/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/locations_and_languages/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/search_mentions/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/target_metrics/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/target_metrics_lite/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/multi_target_metrics/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_pages/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_pages_lite/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_domains/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_domains_lite/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_brands/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_brands_lite/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_brand_categories/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_brand_categories_lite/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/historical/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/timeseries_delta/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/timeseries_new_lost/live/
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/search/live/            (legacy)
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/aggregated_metrics/live/ (legacy)
https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/available_filters/
https://docs.dataforseo.com/v3/ai_optimization/llm_responses/overview/
https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_responses/{overview,models,task_post,tasks_ready,task_get,live}/
https://docs.dataforseo.com/v3/ai_optimization/claude/llm_responses/{overview,models,task_post,tasks_ready,task_get,live}/
https://docs.dataforseo.com/v3/ai_optimization/gemini/llm_responses/{overview,models,task_post,tasks_ready,task_get,live}/
https://docs.dataforseo.com/v3/ai_optimization/perplexity/llm_responses/{overview,models,live}/
https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_scraper/{overview,locations,languages,task_post,tasks_ready}/
https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_scraper/task_get/{advanced,html}/
https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_scraper/live/{advanced,html}/
https://docs.dataforseo.com/v3/ai_optimization/gemini/llm_scraper/{overview,locations,languages,task_post,tasks_ready}/
https://docs.dataforseo.com/v3/ai_optimization/gemini/llm_scraper/task_get/{advanced,html}/
https://docs.dataforseo.com/v3/ai_optimization/gemini/llm_scraper/live/{advanced,html}/
https://docs.dataforseo.com/v3/appendix/sandbox/
```
**Probes que devolvieron 404** (confirman ausencia de endpoint):
`…/ai_optimization/perplexity/llm_responses/task_post/` · `…/ai_optimization/chat_gpt/llm_scraper/task_get/regular/`

### Recurso de datos
```
https://cdn.dataforseo.com/v3/available_filters.php?api=ai_optimization/llm_mentions
```

### Pricing
```
https://dataforseo.com/pricing/ai-optimization
https://dataforseo.com/pricing/ai-optimization/llm-mentions
https://dataforseo.com/pricing/ai-optimization/llm-responses
https://dataforseo.com/pricing/ai-optimization/llm-scraper
https://dataforseo.com/pricing/ai-optimization/ai-keyword-search-volume
```

### Help Center
```
https://dataforseo.com/help-center/what-is-ai-search-volume-in-dataforseo
https://dataforseo.com/help-center/how-the-ai-search-volume-metric-works-in-llm-mentions
https://dataforseo.com/help-center/how-to-get-llm-citation-data-with-llm-mentions-api
https://dataforseo.com/help-center/what-are-the-initial-dataset-filters-and-how-do-they-work
https://dataforseo.com/help-center/how-the-price-for-using-llm-responses-endpoints-is-calculated
```

### Páginas de producto
```
https://dataforseo.com/ai-optimization-api
https://dataforseo.com/apis/ai-optimization-api
https://dataforseo.com/apis/ai-optimization-api/llm-mentions-api
```
