# DataForSEO AI Optimization API — deep-dive operativo

> **As-of:** 2026-08-06. Todo lo afirmado abajo fue verificado contra páginas reales de `docs.dataforseo.com` / `dataforseo.com` cargadas hoy (URLs exactas en §Fuentes). Lo NO verificable se declara explícitamente.
> **Nota de slugs:** los índices "bonitos" (`/v3/ai_optimization/`) no son las URLs de doc; los slugs canónicos usan guiones (`/v3/ai_optimization-overview/`, `/v3/ai_optimization-llm_mentions-target_metrics-live/`). Los paths de API sí usan slashes (`/v3/ai_optimization/chat_gpt/llm_responses/live`).

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

### 1.3 Respuesta

`result`: `model_name`, `input_tokens`, `output_tokens`, `reasoning_tokens` (solo reasoning models), `web_search` (bool: si usó búsqueda), **`money_spent`** (USD del call — clave para el spend ledger), `datetime`, `fan_out_queries`, `items[]`:
- `reasoning` (secciones de pensamiento, solo reasoning models)
- `message.sections` (texto)
- `message.annotations[]` = **citas**: `title`, `url`, `start_index`, `end_index`, `text`

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

---

## 3. AI Keyword Data

Un solo endpoint de datos: `POST /v3/ai_optimization/ai_keyword_data/keywords_search_volume/live` (**Live only**) + `GET .../ai_keyword_data/locations_and_languages`.

- Input: `keywords[]` (**≤1.000 por request**, ≤250 chars c/u, se convierten a lowercase, UTF-8), `location_name|location_code` (✓), `language_name|language_code` (✓), `tag`.
- Output por keyword: **`ai_search_volume`** (tasa actual estimada de uso en herramientas AI) + **`ai_monthly_searches[]`** (year/month/ai_search_volume, últimos 12 meses).
- ⚠️ Metodología declarada: "AI Search Volume values are calculated using statistical data from questions in the 'People Also Ask' SERP element" — es un **proxy estadístico**, no logs reales de chats.
- Cobertura: **94 locations**, multi-idioma (p.ej. Venezuela/español, Argelia/francés+árabe); Rusia y Bielorrusia excluidas.
- Costo: **$0.01 por task + $0.0001 por item** → "$110 for 1M keywords". Turnaround ~2 s. Límites: 2.000 calls/min, 30 requests simultáneos, 1 task por call.

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

### 4.2 Targeting (común a los endpoints)

- `target[]`: **hasta 10 entidades**, cada una `domain` (≤63 chars, sin `https://` ni `www.`) **o** `keyword` (≤250 chars).
- Por entidad: `search_filter` (`include`/`exclude`), `search_scope` — para domain: `any`/`sources`/`search_results`; para keyword: `any`/`question`/`answer`/`brand_entities`/`fan_out_queries` — y `match_type` (`word_match`/`partial_match`). Domains soportan opción de subdominios.
- `platform`: `chat_gpt` o `google` (si se omite, ambas). En respuesta, Google aparece como `model_name: "google_ai_overview"`.
- `location_code|name` (default 2840 = United States), `language_code|name` (default `en`). ⚠️ "ChatGPT data is available for `United States` and `English` only."
- `filters` (hasta 8; operadores `=`, `<>`, `in`, `not_in`, `>`, `<`, `like`, `match`…), `initial_dataset_filters` (pre-agregación), `order_by` (hasta 3, p.ej. `"ai_search_volume,desc"`), `limit` 1–1000 (default 100), `offset` (≤1.000.000; más allá, `search_after_token`), `internal_list_limit` (1–10), `include_domains`/`exclude_domains` (en tops), `tag`.

### 4.3 Métricas y campos por endpoint

**Search Mentions** (fila = una respuesta AI que matchea): `platform`, `model_name`, `question`, `answer` (markdown), `sources[]` (`domain`, `url`, `title`, `rank`, `publication_date`), `search_results`, `ai_search_volume`, `monthly_searches[]`, `first_response_at`/`last_response_at` (UTC), `brand_entities`, `fan_out_queries`, `is_web_search_based`.

**Target Metrics**: agregados por location/language/platform/sources/search_results/brand_entities; métricas primarias **`mentions`** y **`ai_search_volume`** + total. Params extra: `initial_dataset_filters`, `internal_list_limit` (1–10, default 10).

**Top Mentioned Domains** (por dominio): `domain` + counts segmentados por `location`/`language`/`platform`, `sources_domain` ("domains that are cited as sources in LLM responses"), `search_results_domain`, `brand_entities_title`/`brand_entities_category`, `total` (mentions + ai_search_volume) + bloque `aggregated_metrics` global.

**Historical**: `date_from`/`date_to` (yyyy-mm-dd); ítems mensuales `year`/`month` + `metrics.mentions` + `metrics.ai_search_volume`. **"Historical data is available from 2025-08-01."**

**Timeseries New & Lost**: `date_from` (mínimo **2025-08-01**), `date_to`, `group_range` ∈ `day|week|month|year` (✓); por período: `new_mentions` ("LLM responses that contain the target at date_to, did not contain it at date_from"), `lost_mentions` (inverso), `new_ai_search_volume`, `lost_ai_search_volume`.

**Lite vs full** (help center + docs): las Lite devuelven "the same core data – mention counts and AI search volume … but trimmed to the essentials, skipping the heavier breakdowns" — pensadas para dashboards, comparaciones rápidas y monitoreo de alto volumen. Target Metrics Lite retorna `metrics.mentions` + `metrics.ai_search_volume` por location/language/platform. No encontré precio diferenciado publicado para Lite (ver §6).

### 4.4 Frescura y ventana

- Ventana histórica: **desde 2025-08-01** (≈12 meses al día de hoy).
- Frecuencia de actualización de la base: **no declarada explícitamente** en las páginas cargadas; los timeseries soportan granularidad `day`, lo que implica refresco al menos diario, pero eso es inferencia — no afirmación de la doc.
- Cobertura de plataformas de la base: **solo `chat_gpt` y `google` (AI Overview)**. No hay Claude/Perplexity/Gemini en Mentions (esos solo existen en LLM Responses).

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
