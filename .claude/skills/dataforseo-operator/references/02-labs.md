# DataForSEO Labs API — Dossier (as-of 2026-08-06)

> Fuente: documentación oficial `docs.dataforseo.com` + help center / pricing oficial de `dataforseo.com`.
> Todo lo afirmado abajo fue verificado contra las páginas citadas en cada sección el 2026-08-06.
> **Páginas que NO cargaron:** `https://docs.dataforseo.com/v3/dataforseo_labs/` devolvió **HTTP 404** — el índice canónico vive en `https://docs.dataforseo.com/v3/dataforseo_labs-overview/` (las URLs de doc usan guiones, no slashes anidados).

---

## 1. Resumen ejecutivo

DataForSEO Labs API es la capa **analítica pre-computada** de DataForSEO: keyword research, análisis competitivo y estimación de tráfico servidos desde bases de datos propias (in-house Google SERP database, Keyword Database de **4.8+ mil millones de keywords**, Domains/Whois database), **no** desde scraping en vivo. Sus rasgos definitorios:

- **Solo método Live**: cero task queue; un POST devuelve el resultado al instante (a diferencia de SERP API y Keywords Data API standard, que son POST task → GET result).
- **Modelo de costo dual**: se cobra el "task setup" del request **y** cada fila/ítem devuelto (mayoría: $0.012 el request + $0.00012 por ítem).
- 4 buscadores/plataformas: **Google** (cobertura completa, ~24 endpoints), **Bing** (11 endpoints, US/English only), **Amazon** (6 endpoints, US/English only), más **Google Play** y **App Store** (4 endpoints cada uno).
- Frescura: métricas de keyword (volumen/CPC/competition) se refrescan **mensualmente** siguiendo el ciclo de Google Ads; los SERPs de la base se refrescan gradualmente en ventanas de **30–90 días** (países populares más seguido).
- Rate limit: 2,000 llamadas/min, máx 30 simultáneas. Sandbox gratis para testing.

Es la API correcta para: gap analysis competitivo, ranked keywords de cualquier dominio, estimación de tráfico de competidores, keyword ideas/suggestions masivas, dificultad e intención de búsqueda a escala. NO es la API correcta cuando necesitas volumen Google Ads "del mes en curso" certificado o SERPs en tiempo real.

---

## 2. Catálogo de endpoints (lo que existe HOY)

### 2.1 Google — `/v3/dataforseo_labs/google/...`
Fuente: https://docs.dataforseo.com/v3/dataforseo_labs-google-overview/ (+ índice https://docs.dataforseo.com/v3/dataforseo_labs-overview/)

**Keyword research:**

| Endpoint | Path | Qué hace |
|---|---|---|
| Keywords For Site | `/keywords_for_site/live/` | Keywords relevantes para un dominio target |
| Related Keywords | `/related_keywords/live/` | Keywords del elemento "searches related to" del SERP |
| Keyword Suggestions | `/keyword_suggestions/live/` | Frases que contienen la seed + términos añadidos (long-tail) |
| Keyword Ideas | `/keyword_ideas/live/` | Keywords de la misma categoría que las seeds |
| Bulk Keyword Difficulty | `/bulk_keyword_difficulty/live/` | KD para posicionar top-10 orgánico (hasta 1,000 kw) |
| Search Intent | `/search_intent/live/` | Clasificación de intención para hasta 1,000 keywords |
| Keyword Overview | `/keyword_overview/live/` | CPC + competition + volumen + intent + SERP + backlinks en un solo call |
| Historical Keyword Data | `/historical_keyword_data/live/` | Serie histórica de volumen desde 2019 |

**Market analysis:**

| Endpoint | Path | Qué hace |
|---|---|---|
| Categories For Domain | `/categories_for_domain/live/` | Categorías Google Ads del dominio con rankings/tráfico |
| Categories For Keywords | `/categories_for_keywords/live/` | Categorías de producto/servicio Google por keyword (hasta 1,000 kw) — verificado en https://docs.dataforseo.com/v3/dataforseo_labs-google-categories_for_keywords-live/ |
| Keywords For Categories | `/keywords_for_categories/live/` | Keywords de una categoría con volumen y CPC |
| Domain Metrics By Categories | `/domain_metrics_by_categories/live/` | Ranking histórico, ETV y tráfico por categoría |
| Top Searches | `/top_searches/live/` | Búsquedas trending con data Google Ads + SERP |

**Competitor research:**

| Endpoint | Path | Qué hace |
|---|---|---|
| Ranked Keywords | `/ranked_keywords/live/` | Todas las keywords por las que ranquea un dominio/URL |
| SERP Competitors | `/serp_competitors/live/` | Competidores que ranquean para un set de keywords |
| Competitors Domain | `/competitors_domain/live/` | Overview completo de ranking + tráfico de competidores |
| Domain Intersection | `/domain_intersection/live/` | Keywords donde ranquean dos dominios a la vez (gap) |
| Page Intersection | `/page_intersection/live/` | Keywords donde ranquean páginas específicas juntas |
| Subdomains | `/subdomains/live/` | Subdominios con distribución de rankings |
| Relevant Pages | `/relevant_pages/live/` | Páginas del dominio con rankings y tráfico |
| Domain Rank Overview | `/domain_rank_overview/live/` | Data orgánica + paga combinada del dominio |
| Historical SERPs | `/historical_serps/live/` | Snippets y SERP features por rango de fechas |
| Historical Rank Overview | `/historical_rank_overview/live/` | Rankings + tráfico del dominio en el tiempo |
| Bulk Traffic Estimation | `/bulk_traffic_estimation/live/` | Tráfico mensual estimado para hasta 1,000 dominios |
| Historical Bulk Traffic Estimation | `/historical_bulk_traffic_estimation/live/` | Versión histórica del anterior (listado en el índice general; pricing propio, ver §5) |

### 2.2 Bing — `/v3/dataforseo_labs/bing/...`
Fuente: https://docs.dataforseo.com/v3/dataforseo_labs-bing-overview/ — **US/English only**.

`related_keywords`, `ranked_keywords`, `domain_rank_overview`, `serp_competitors`, `domain_intersection`, `page_intersection`, `relevant_pages`, `competitors_domain`, `subdomains`, `bulk_keyword_difficulty`, `bulk_traffic_estimation` (todos `/live/`). No hay keyword_ideas/suggestions/search_intent para Bing.

### 2.3 Amazon — `/v3/dataforseo_labs/amazon/...`
Fuente: https://docs.dataforseo.com/v3/dataforseo_labs-amazon-overview/ — **US/English only**.

| Endpoint | Qué hace |
|---|---|
| `bulk_search_volume/live/` | Volumen Amazon para hasta 1,000 keywords |
| `related_keywords/live/` | Del box "Related Searches" de Amazon |
| `ranked_keywords/live/` | Keywords por las que ranquea un producto (ASIN) |
| `product_rank_overview/live/` | Cambios de ranking de un producto |
| `product_competitors/live/` | Competidores de un listing |
| `product_keyword_intersections/live/` | Keywords donde productos target intersectan en el SERP de Amazon |

### 2.4 Google Play y App Store
Fuente: índice https://docs.dataforseo.com/v3/dataforseo_labs-overview/ — cada uno con 4 endpoints: `bulk_app_metrics`, `keywords_for_app`, `app_competitors`, `app_intersection` (todos `/live/`).

### 2.5 Utilitarios (gratis)

| Endpoint | Qué devuelve | Costo |
|---|---|---|
| `/v3/dataforseo_labs/status` | `date_update` por fuente (google/bing/amazon) — última fecha de refresh de la base. Fuente: https://docs.dataforseo.com/v3/dataforseo_labs-status/ | Gratis |
| `/v3/dataforseo_labs/locations_and_languages` | 90 países, idiomas por location, campo `available_sources` por combinación location+language. Fuente: https://docs.dataforseo.com/v3/dataforseo_labs_locations_and_languages/ | Gratis |
| Filters / Available Filters | Sintaxis y campos filtrables por endpoint. Fuente: https://docs.dataforseo.com/v3/dataforseo_labs/filters/ | Gratis |
| Categories list, Available History, id_list, errors | Listados auxiliares (índice general) | Gratis/nominal |

---

## 3. Métricas y su semántica

Fuente principal: https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_overview-live/ y https://docs.dataforseo.com/v3/dataforseo_labs-google-ranked_keywords-live/

### `keyword_info` (datasource: DataForSEO Keyword Database, basado en Google Ads API, update mensual)
- **`search_volume`** — "average monthly search volume rate": promedio mensual aproximado de búsquedas en Google. Origen Google Ads, NO en vivo (snapshot mensual de la base).
- **`cpc`** — costo por clic histórico en USD (pago).
- **`competition`** — float 0–1: competencia relativa en búsqueda PAGA (no orgánica).
- **`competition_level`** — categórico LOW / MEDIUM / HIGH.
- **`monthly_searches`** — desglose de los últimos 12 meses.
- **`search_volume_trend`** — % de cambio vs mes / trimestre / año anterior.

### `keyword_properties`
- **`keyword_difficulty`** — 0–100 (escala logarítmica): dificultad de entrar al top-10 orgánico. Métrica propia de DataForSEO (calculada de su base SERP + backlinks), no de Google.
- **`core_keyword`** — keyword principal del clúster de sinónimos (Google agrupa variantes; esto identifica la canónica).
- **`detected_language`**.

### `search_intent_info`
- `main_intent` ∈ {informational, navigational, commercial, transactional} + probabilidad 0–1, más `secondary_keyword_intents` con sus probabilidades. Modelo entrenado por DataForSEO sobre keyword data + resultados de búsqueda. 34 idiomas soportados. Fuente: https://docs.dataforseo.com/v3/dataforseo_labs-google-search_intent-live/

### `avg_backlinks_info` (inline, sin llamar a Backlinks API)
Promedios de los **top-10 orgánicos** para esa keyword: backlinks, dofollow, referring pages, referring domains, rank scores. Es el proxy barato para calibrar dificultad real.

### `serp_info` (con `include_serp_info: true`)
Conteo de resultados, tipos de elementos del SERP (organic, paid, featured_snippet, local_pack, ai_overview_reference…), `last_updated_time` del SERP en la base.

### Métricas de dominio/tráfico (ranked_keywords, bulk_traffic_estimation, etc.)
- **`etv` (estimated traffic volume)** — "calculated as the product of CTR (click-through-rate) and search volume values of all keywords" por las que ranquea el dominio/página. Tráfico orgánico mensual estimado; es la métrica reina del análisis competitivo.
- **`impressions_etv` / impressions** — variante basada en datos de impresiones (modelo Google Ads) — expuesta en los bloques `metrics` de ranked/competitors.
- **`estimated_paid_traffic_cost`** — "estimated monthly cost of running ads for all keywords that a domain or webpage ranks for": lo que costaría comprar ese tráfico en Ads (USD). Proxy del valor monetario del ranking orgánico.
- **Flags de movimiento** — `is_new`, `is_up`, `is_down`, `is_lost` por elemento ranqueado (vs snapshot anterior de la base).
- **`clickstream_data`** (con `include_clickstream_data: true`, costo ×2) — volumen normalizado con clickstream + demografía por género y grupos etarios.

---

## 4. Filtros y ordenamiento

Fuente: https://docs.dataforseo.com/v3/dataforseo_labs/filters/ (+ ejemplos por endpoint)

- **Estructura**: `["$campo", "$operador", $valor]`, máximo **8 filtros** por request, combinables con `"and"` / `"or"`:
  ```json
  [["keyword_data.keyword_info.search_volume", "<>", 0],
   "and",
   ["ranked_serp_element.serp_item.type", "<>", "paid"]]
  ```
- **Operadores por tipo**:
  - boolean: `=`, `<>`
  - numérico: `<`, `<=`, `>`, `>=`, `=`, `<>`, `in`, `not_in`
  - string: `match`, `not_match`, `like`, `not_like`, `ilike`, `not_in`, `=`, `<>`, `regex`, `not_regex` (RE2, máx **1,000 caracteres** en el patrón)
  - arrays: `has`, `has_not`
  - time: `<`, `>`
  - `like` exige comodines `%`: `["keyword_data.keyword", "like", "%seo%"]`
- **`order_by`**: hasta **3 reglas**, formato `"campo,dirección"`, ej. `["relevance,desc","keyword_info.search_volume,desc"]`. Restricción documentada: no se puede ordenar por campos `array.str` / `array.num`. En keyword_ideas, `relevance` es ordenable pero NO filtrable.
- **Paginación**:
  - `limit`: default 100 (keyword_ideas: default 700), **máx 1,000** por request.
  - `offset`: entero clásico — recomendado solo hasta ~10,000 resultados.
  - **`offset_token`** (keyword_ideas y endpoints de alto volumen): token opaco devuelto en cada response; se re-envía para obtener la página siguiente sin timeout en sets >10k. Ojo: con `offset_token`, "all other parameters except `limit` will not be taken into account" (los filtros viajan en el primer request).
- Ejemplo real de ranked_keywords: `["ranked_serp_element.serp_item.rank_group","<=",10]`; `order_by: ["keyword_data.keyword_info.competition,desc"]`.

---

## 5. Modelo de costo (verificado)

Fuente: https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api

- **Confirmado: TODOS los endpoints de Labs son Live** — sin task queue ("supports only the Live method of data retrieval"). Fuente: https://docs.dataforseo.com/v3/dataforseo_labs-overview/
- **Modelo dual**: "your account will be billed for both setting a task and retrieving its results" → precio por request + precio por ítem devuelto:

| Grupo | Task setup | Por ítem | Ejemplo doc |
|---|---|---|---|
| Mayoría (keyword_ideas, ranked_keywords, keyword_overview, bulk_kd, top_searches…) | $0.012 | $0.00012 | 1M keywords/domains = $132 |
| Search Intent | $0.012 | $0.00012/kw | 1M keywords = $132 |
| Historical Rank Overview | $0.12 | $0.0012 | 1,000 dominios × 6 meses = $127.20 |
| Historical SERPs | — | $0.00012/SERP | 1,000 SERPs × 10 meses = $1.20 |
| Historical Bulk Traffic Est. / Domain Metrics | $0.12 | $0.0012/dominio | 1M dominios = $1,320 |
| `include_clickstream_data: true` | costo del request **×2** | | |
| status / locations_and_languages / filters | **gratis** | | |

- Implicación práctica: **`limit` ES una palanca de costo** — cada fila devuelta cuesta; filtrar server-side (§4) es ahorro directo. Ejemplo real de la doc: search_intent con 4 keywords = $0.0014; categories_for_keywords ejemplo = $0.00103.
- Rate limits: 2,000 calls/min, 30 simultáneas. Sandbox gratuito para desarrollo.

---

## 6. Labs vs Keywords Data API (Google Ads)

Fuente: https://docs.dataforseo.com/v3/keywords-data-overview/

| Dimensión | **DataForSEO Labs** | **Keywords Data API** |
|---|---|---|
| Fuente | Bases propias (Keyword DB 4.8B + SERP DB + Domains DB), snapshot mensual | "the latest version of the Google Ads API" — data corriente de Google Ads (+ Bing Ads, Google Trends, Clickstream, DataForSEO Trends) |
| Modelo | Solo Live | Standard (POST task → GET, más barato) o Live (instantáneo, más caro) |
| Fortaleza | Análisis orgánico/competitivo: rankings, ETV, gap, KD, intent, histórico desde 2019 | Métricas publicitarias certificadas al ciclo actual: search volume oficial, ad traffic forecast (`ad_traffic_by_keywords`) |
| Cuándo basta Labs | Keyword research, priorización, análisis competitivo, tracking de visibilidad, dashboards — el snapshot mensual es suficiente y sale con métricas enriquecidas (KD, intent, backlinks, ETV) que Google Ads no da | — |
| Cuándo NO basta | Necesitas volumen Ads "de este ciclo" para planificar campañas pagas, forecasts de tráfico de ads, o Google Trends / clickstream puros → Keywords Data API | — |

Regla práctica: **Labs para orgánico y análisis; Keywords Data para presupuestar paid**. Los volúmenes NO van a coincidir exactamente entre ambas (ver §7).

---

## 7. Gotchas

1. **Frescura ≠ tiempo real.** Métricas de keywords: update **mensual** siguiendo el ciclo Google Ads — "in the middle of the month, you can get fresh data for the previous month". SERPs de la base: refresh gradual de **30–90 días** completo (países/queries populares más seguido). Fuente: https://dataforseo.com/help-center/how-often-are-dataforseo-databases-updated y https://dataforseo.com/help-center/dataforseo-labs-api-update-time
2. **Verifica la fecha antes de reportar**: `/v3/dataforseo_labs/status` (gratis) devuelve el `date_update` por fuente; cada keyword y SERP element trae además `last_updated_time` en el response. Automatizar ese check evita vender data vieja como fresca.
3. **Locations**: 90 países para Google; **Bing y Amazon: solo US/English**; Rusia y Bielorrusia ya no soportadas. El campo `available_sources` por location+language dice qué fuentes aplican (ej. US soporta google+bing+amazon en inglés pero solo google en español). Fuente: https://docs.dataforseo.com/v3/dataforseo_labs_locations_and_languages/
4. **Discrepancias de volumen vs Google Ads**: Google agrupa variantes/sinónimos en un solo volumen (broad groupings) y redondea a buckets. DataForSEO ofrece el volumen Ads crudo (keyword_info) y alternativas normalizadas: clickstream (`include_clickstream_data`, ×2 costo, todas las locations) o el "DataForSEO Search Volume" refinado con Bing Ads/clickstream (en Keywords Data API, parámetro `use_clickstream`). No mezclar series de fuentes distintas en un mismo dashboard sin declararlo. Fuentes: https://dataforseo.com/blog/dataforseo-search-volume-precision-in-our-apis · https://dataforseo.com/help-center/how-to-get-precise-search-volume-for-keywords-with-the-dataforseo-search-volume-endpoint
5. **`offset_token` ignora todo excepto `limit`** en requests subsecuentes — los filtros deben ir en el primer request de la serie.
6. **`competition` es de paid, no de orgánico** — para dificultad orgánica usar `keyword_difficulty` (0–100, logarítmica) o `avg_backlinks_info`.
7. **Cada fila cuesta**: un request sin filtros con `limit: 1000` cuesta ~10× más que uno bien filtrado de 100 filas. El costo escala con lo que devuelves, no con lo que pides.
8. **`keyword_difficulty` es una métrica PURA de enlaces — preséntala como "barrera de enlaces" en niveles, NUNCA como "dificultad" cruda.** Fórmula oficial (verificada 2026-08-13 reproduciendo los valores del API con `avg_backlinks_info`): por cada top-10, `(domain_rank×0.1 + page_rank×0.9)/500`; KD = `(max(mediana, promedio) − 0.2)/0.8 × 100`, **clampeada a 0**. El 90% del peso es el backlink rank de la URL específica, y en SERPs es-LATAM el top-10 casi no tiene backlinks a nivel URL → una porción enorme de keywords da **0 exacto** (`pintura` MX: KD 0 con 135.000 búsquedas/mes). Hay DOS escuelas de KD y no son comparables: la link-based (DataForSEO, Ahrefs) y la blended (Semrush, que mezcla más factores). Contraste medido (mismas keywords, MX, 2026-08-13): `pintura` DataForSEO **0** / Semrush **50** · `comex` **18** / **67** · `berel` **8** / **34**. El 0 link-based es un dato REAL — significa *"la entrada no está bloqueada por enlaces: se compite con contenido y autoridad de dominio"*, una **oportunidad** para un dominio fuerte — pero mostrado como "Dificultad: 0" se lee "trivial", que es falso. Es country-specific (doc oficial; `berel` da `null` en CL y `8` en MX): siempre con el mercado correcto. **En Greenhouse: `classifyLinkBarrier()` (`src/lib/growth/seo/contracts.ts`) lo presenta como Baja (0–14) / Media (15–49) / Alta (50+), jamás el número crudo.** `avg_backlinks_info` (gratis en la misma respuesta) es la señal cruda subyacente. Fuente: https://dataforseo.com/help-center/what-is-keyword-difficulty-and-how-is-it-calculated
9. **Keywords normalizadas**: se convierten a lowercase; límites por endpoint (keyword_overview: 700 kw, 80 chars, 10 palabras; search_intent/bulk: 1,000 kw; keyword_ideas: 200 seeds).

---

## 8. Oportunidades de máximo provecho

1. **Keyword gap real con `domain_intersection`** — `intersections: false` invertido / comparación de dos targets devuelve donde el competidor ranquea y tú no, con volumen+KD+intent en la misma fila → backlog de contenido priorizado en UN request. `page_intersection` baja el análisis a nivel de URL (ideal para pillar pages).
2. **Market share por SERP con `serp_competitors`** — para un set de keywords del negocio devuelve qué dominios dominan, con visibilidad relativa → share-of-voice orgánico del mercado sin trackear SERPs uno a uno.
3. **Perfil completo de un competidor en 3 calls**: `domain_rank_overview` (foto general orgánico+paid) → `ranked_keywords` filtrado `rank_group <= 10` (sus armas) → `relevant_pages` (qué URLs concentran su ETV). Con `historical_rank_overview` se agrega la trayectoria (¿crece o decae?).
4. **Estimación de tráfico masiva barata**: `bulk_traffic_estimation` acepta 1,000 dominios por request ($0.012 + $0.00012/dominio) → screening de un mercado entero (~$0.13 por 1,000 dominios).
5. **Priorización compuesta en un solo endpoint**: `keyword_overview` trae volumen + CPC + KD + intent + avg_backlinks + SERP features juntos → scoring de oportunidad (volumen alto, KD bajo, intent comercial, top-10 con pocos backlinks) sin joins entre APIs.
6. **Detección de momentum**: flags `is_new`/`is_up`/`is_down`/`is_lost` en ranked_keywords + `historical_serp_mode: "lost"` → alertas de keywords perdidas del competidor (huecos para atacar) o propias (defensa).
7. **AI Overviews**: `item_types` acepta `ai_overview_reference` en ranked_keywords → medir presencia en AI Overviews de Google, directamente relevante para la práctica AEO de Efeonce.
8. **Clusterización gratis con `core_keyword`** — el clúster de sinónimos ya viene resuelto; evita construir clustering propio para agrupar variantes.

---

## 9. Fuentes (todas consultadas 2026-08-06)

- Índice general: https://docs.dataforseo.com/v3/dataforseo_labs-overview/
- Google overview: https://docs.dataforseo.com/v3/dataforseo_labs-google-overview/
- Bing overview: https://docs.dataforseo.com/v3/dataforseo_labs-bing-overview/
- Amazon overview: https://docs.dataforseo.com/v3/dataforseo_labs-amazon-overview/
- Keyword Overview: https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_overview-live/
- Ranked Keywords: https://docs.dataforseo.com/v3/dataforseo_labs-google-ranked_keywords-live/
- Keyword Ideas: https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_ideas-live/
- Search Intent: https://docs.dataforseo.com/v3/dataforseo_labs-google-search_intent-live/
- Categories for Keywords: https://docs.dataforseo.com/v3/dataforseo_labs-google-categories_for_keywords-live/
- Filters: https://docs.dataforseo.com/v3/dataforseo_labs/filters/
- Status: https://docs.dataforseo.com/v3/dataforseo_labs-status/
- Locations & Languages: https://docs.dataforseo.com/v3/dataforseo_labs_locations_and_languages/
- Pricing Labs: https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api
- Keywords Data overview: https://docs.dataforseo.com/v3/keywords-data-overview/
- Frescura de bases: https://dataforseo.com/help-center/how-often-are-dataforseo-databases-updated · https://dataforseo.com/help-center/dataforseo-labs-api-update-time
- Discrepancia de volumen / DataForSEO Search Volume: https://dataforseo.com/blog/dataforseo-search-volume-precision-in-our-apis · https://dataforseo.com/help-center/how-to-get-precise-search-volume-for-keywords-with-the-dataforseo-search-volume-endpoint
- **404 declarado**: https://docs.dataforseo.com/v3/dataforseo_labs/ (usar el overview con guiones)
