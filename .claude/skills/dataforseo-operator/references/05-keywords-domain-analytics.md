# DataForSEO — Keywords Data API + Domain Analytics API (dossier)

> **As-of: 2026-08-06.** Investigación contra la documentación oficial (`docs.dataforseo.com/v3/...`) y páginas de pricing oficiales (`dataforseo.com/pricing/...`) vía WebFetch/WebSearch. Solo se afirma lo verificado; cada sección lista su URL fuente. Páginas caídas declaradas al final.

---

## 1. Resumen ejecutivo

- **Keywords Data API** agrupa 5 familias de fuentes vigentes hoy: **Google Ads** (search_volume, keywords_for_site, keywords_for_keywords, ad_traffic_by_keywords), **Bing** (7 endpoints, incl. keyword_performance y audience_estimation), **Google Trends** (explore), **DataForSEO Trends** (explore, subregion_interests, demography, merged_data) y **Clickstream Data** (global_search_volume, dataforseo_search_volume, bulk_clickstream_search_volume).
- El volumen de **Google Ads** es barato por mil keywords ($0.06–0.09 por task de hasta 1.000 kws) pero viene **redondeado a ~80 buckets logarítmicos y agrupado por near-variants**; el volumen **clickstream/DataForSEO Search Volume** desagrega variantes con precisión mayor a costo mayor por task.
- **Domain Analytics API** tiene 2 módulos, ambos **Live-only**: **Technologies** (7 endpoints; detección de stack por dominio y prospección inversa `domains_by_technology` / `domains_by_html_terms`) y **Whois** (overview con filtros ricos: fechas de registro/expiración, registrar, TLD, métricas orgánicas/paid y backlinks).
- Modelo de costo: Keywords Data Google Ads/Bing/Google Trends soportan **task (Standard queue, barato) y Live (caro, instantáneo)**; Trends propios, Clickstream y todo Domain Analytics son **Live-only** con precios por task + por item.
- Oportunidades de mayor palanca: planificación editorial estacional con `monthly_searches` (48 meses de histórico Google Ads) + DataForSEO Trends ($0.0012/task); **lead-gen por stack tecnológico** con `domains_by_technology` filtrado por país; inteligencia de dominios con Whois (expiraciones + tracción SEO).

---

## 2. Keywords Data API — catálogo y semántica

### 2.1 Google Ads (fuente: Google Ads API)

Fuente: https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-live/ · https://docs.dataforseo.com/v3/keywords_data-google_ads-keywords_for_site-live/ · https://docs.dataforseo.com/v3/keywords_data-google_ads-keywords_for_keywords-live/ (as-of 2026-08-06)

| Endpoint | Qué devuelve | Límite clave |
|---|---|---|
| `search_volume` | `search_volume` (promedio mensual), `monthly_searches` (histórico mensual), `competition` (LOW/MEDIUM/HIGH) + `competition_index` (0–100), `cpc`, `low/high_top_of_page_bid`, `spell` | **1.000 keywords/request**; histórico **4 años** (`date_from` default: últimos 12 meses) |
| `keywords_for_site` | Hasta **2.000 sugerencias** de keywords relevantes para un dominio (`target_type: site`) o una página (`target_type: page`, default), con métricas completas | 1 target por request; cobra por request aunque devuelva poco |
| `keywords_for_keywords` | Ideas de keywords desde seeds; hasta **20.000 sugerencias**/request con volumen, competition, bids, tendencia mensual y concept groups | **Máx. 20 seed keywords**/request |
| `ad_traffic_by_keywords` | Estimación de impresiones, clicks, CPC, costo — **desde jun-2025 (cambio de Google Ads API) devuelve datos agregados de campaña completa**, ya no por keyword individual | Hasta 1.000 keywords; misma estructura de response pero cumulativa |

- Modos: `task_post` / `tasks_ready` / `task_get` (Standard queue) y `live`. Fuente task_get: https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-task_get/
- Rate limit específico: **máx. 12 requests/min por cuenta en endpoints Live de Google Ads** (el límite general de la plataforma es 2.000 API calls/min).
- Cambio de `ad_traffic_by_keywords` documentado en: https://dataforseo.com/update/changes-google-ad-traffic-by-keywords ("Starting from June 1, Google Ads API no longer supports keyword forecasts… now returns data for the entire campaign").

### 2.2 Bing (fuente: Bing Ads API)

Fuente: https://docs.dataforseo.com/v3/keywords_data-bing-overview/ (as-of 2026-08-06)

7 endpoints, todos con Task POST / Tasks Ready / Task GET / Live:

1. **Search Volume** — volumen de búsqueda por keyword.
2. **Search Volume History** — tendencias históricas.
3. **Keywords For Site** — sugerencias para un dominio.
4. **Keywords For Keywords** — keywords relacionadas desde seeds.
5. **Keyword Performance** — métricas de rendimiento por keyword.
6. **Keyword Suggestions For URL** — recomendaciones para una URL.
7. **Audience Estimation** — tamaño de audiencia y demografía (requiere config de Job Functions e Industries; herencia LinkedIn de Microsoft Ads).

Notas verificadas: keywords restringidas (armas, tabaco, drogas, violencia) no devuelven resultados; los datos del mes anterior pueden demorar **hasta 72 h** en estar disponibles. Ventaja semántica (ver §2.4): Bing entrega volúmenes **separados por dispositivo** y **sin agrupar near-variants**, con precisión a decenas.

### 2.3 Diferencia de semántica: volumen Google Ads (keywords_data) vs Labs / DataForSEO Search Volume

Fuente: https://dataforseo.com/help-center/what-is-search-volume · https://dataforseo.com/update/dataforseo-search-volume-api (as-of 2026-08-06)

- **Google Ads / Keyword Planner**: (a) usa **~80 valores de volumen logarítmicamente proporcionados** que se repiten para todas las keywords (es un bucket, no un conteo); (b) **agrupa keywords similares** ("lumps together groups of similar keywords and shows combined search volumes") — plural/singular, typos y near-variants comparten un mismo volumen combinado. Es la referencia estándar de la industria y la más barata a escala, pero no distingue variantes.
- **DataForSEO Search Volume** (endpoint del módulo Clickstream): refina el volumen con **Bing Ads y/o clickstream** para dar **valores desagregados por variante de keyword**, con granularidad superior a los buckets de Google. Recomendado cuando la decisión depende de distinguir variantes (SEO editorial fino, long-tail, naming) o de detectar volumen "real" no agrupado.
- **Regla práctica**: presupuestos PPC y benchmarks comparables con la industria → Google Ads; investigación SEO de precisión / desambiguar variantes / auditar el bucket de Google → DataForSEO Search Volume o Bulk Clickstream. (Los endpoints de **DataForSEO Labs** no son objeto de este dossier, pero muchos de sus endpoints aceptan `include_clickstream_data: true` para adjuntar el volumen clickstream junto al de Google — verificado en https://docs.dataforseo.com/v3/keywords_data-clickstream_data-overview/.)

---

## 3. Trends + Clickstream

### 3.1 Google Trends (wrapper del Google Trends real)

Fuente: https://docs.dataforseo.com/v3/keywords_data-google_trends-overview/ (as-of 2026-08-06)

- Endpoint único **`explore`** con Task POST / Task GET / Live.
- Devuelve **popularidad relativa** ("keyword popularity rate over time – relative to the highest rate for the specified time period"), en 4 item types: `google_trends_graph` (serie temporal), `google_trends_map` (distribución geográfica), `google_trends_topics_list` (topics relacionados), `google_trends_queries_list` (queries relacionadas).
- **Máx. 5 keywords comparadas** por request. Fuentes: Google Search, News, Images, Shopping, YouTube. Rangos de tiempo custom.

### 3.2 DataForSEO Trends (motor propietario, alternativa a Google Trends)

Fuente: https://docs.dataforseo.com/v3/dataforseo_trends-overview/ · pricing: https://dataforseo.com/pricing/keywords-data/dataforseo-trends-api-pricing (as-of 2026-08-06)

| Endpoint | Qué devuelve | Precio/task |
|---|---|---|
| `explore` | Gráfico de popularidad de keyword en el tiempo | $0.0012 |
| `subregion_interests` | Popularidad por ubicación; comparación entre keywords dentro de una ubicación y cross-ubicación (**subregiones**) | $0.0024 |
| `demography` | Breakdown por **edad y género** | $0.0024 |
| `merged_data` | Los tres anteriores combinados | $0.006 |

- Algoritmo propietario: asociación de keywords con páginas/noticias/shopping + "anonymous user web behavior data" (clickstream). Fuentes cubiertas hoy: Google Search, Google News, Google Shopping.
- **Máx. 5 keywords** por request. **Live-only**, turnaround ~2 s. Mucho más barato que el wrapper de Google Trends y con demografía que Google Trends no expone vía API.

### 3.3 Clickstream Data (volúmenes "reales" normalizados)

Fuente: https://docs.dataforseo.com/v3/keywords_data-clickstream_data-overview/ (as-of 2026-08-06)

| Endpoint | Qué devuelve |
|---|---|
| `global_search_volume` | Volumen clickstream para hasta 1.000 kws **con distribución geográfica** por todas las ubicaciones disponibles |
| `dataforseo_search_volume` | Volumen **normalizado con Bing o clickstream** (el "DataForSEO Search Volume" de §2.3), hasta 1.000 kws |
| `bulk_clickstream_search_volume` | Volumen clickstream para hasta 1.000 kws con **histórico mensual de hasta 12 meses** |
| `locations_and_languages` | Referencia de ubicaciones/idiomas |

- Metodología declarada: "refined clickstream data from reliable providers" + multiplicadores derivados de múltiples factores para convertir clickstream crudo en métricas accionables.
- **Live-only**, ~2 s, hasta 2.000 calls/min. El parámetro `include_clickstream_data` expone estas métricas dentro de otros endpoints (p.ej. Keyword Overview de Labs).

---

## 4. Domain Analytics API

Fuente general: https://docs.dataforseo.com/v3/domain_analytics-overview/ (as-of 2026-08-06). Ambos módulos **Live-only** (sin ciclo POST/GET), 2.000 calls/min, máx. 30 requests live simultáneos.

### 4.1 Technologies

Fuente: https://docs.dataforseo.com/v3/domain_analytics-technologies-overview/ (as-of 2026-08-06)

| Endpoint | Qué devuelve |
|---|---|
| `technologies` | Inventario completo de tecnologías detectables, organizado por **groups → categories → technologies** |
| `aggregation_technologies` | Las tecnologías más populares que co-ocurren con las que especificas (co-ocurrencia de stack) |
| `technologies_summary` | Nº de dominios por **país e idioma** que usan las tecnologías especificadas |
| `technology_stats` | **Histórico** (time-series) del nº de dominios que usan una tecnología, por país/idioma |
| `domains_by_technology` | **Dominios que usan una tecnología** (filtrable por technology name / category / group; paginación con offset) |
| `domains_by_html_terms` | Dominios cuyo homepage contiene **términos HTML** específicos |
| `domain_technologies` | **Stack tecnológico completo de un dominio** concreto |

Filtración custom disponible en los endpoints de dataset.

### 4.2 Whois

Fuente: https://docs.dataforseo.com/v3/domain_analytics-whois-overview/ · filtros: https://docs.dataforseo.com/v3/domain_analytics-whois-filters/ (as-of 2026-08-06)

- Endpoint único **`whois/overview`**: registros Whois **enriquecidos** con backlink stats + métricas orgánicas y de paid search + tráfico estimado, para dominios que matcheen los filtros.
- Filtros verificados: `domain`, `tld`, `registered` (bool), `registrar`, `created_datetime`, `changed_datetime`, `expiration_datetime`, `updated_datetime`, `epp_status_codes`, y métricas `metrics.organic.*` / `metrics.paid.*` (pos_1, pos_2_3, pos_4_10 … pos_91_100, `etv`, `count`, `estimated_paid_traffic_cost`). Operadores: `=, <>, <, <=, >, >=, in, not_in, like, not_like, regex, not_regex, has, has_not`.
- Máx. **1.000 dominios por response** (paginación por offset).

---

## 5. Modelos de costo (verificados en páginas oficiales de pricing)

> Todos los precios son del pricing oficial as-of 2026-08-06; DataForSEO los ajusta periódicamente — reverificar antes de presupuestar.

| API / endpoint | Modo | Precio | Fuente |
|---|---|---|---|
| Google Ads (search_volume et al.) | Standard queue (1–3 h) | **$0.06/task** (hasta 1.000 kws ⇒ ~$60/1M kws) | https://dataforseo.com/pricing/keywords-data/google-ads |
| Google Ads | Live (~7 s) | **$0.09/task** (~$90/1M kws) | ídem |
| Google Trends explore | Standard (≤45 min) | **$0.0027/task** (5 kws/task) | https://dataforseo.com/pricing/keywords-data/google-trends |
| Google Trends explore | Live (~32 s) | **$0.011/task** | ídem |
| DataForSEO Trends explore | Live (~2 s) | **$0.0012/task** | https://dataforseo.com/pricing/keywords-data/dataforseo-trends-api-pricing |
| DataForSEO Trends subregion / demography | Live | **$0.0024/task** | ídem |
| DataForSEO Trends merged_data | Live | **$0.006/task** | ídem |
| Clickstream bulk_clickstream_search_volume | Live | **$0.012/task + $0.00012/item** (~$132/1M kws) | https://dataforseo.com/pricing/keywords-data/clickstream-api-pricing |
| Clickstream global_search_volume | Live | **$0.18/task** (~$180/1M kws) | ídem |
| Clickstream dataforseo_search_volume | Live | **$0.18/task** (~$180/1M kws) | ídem |
| Domain Analytics Technologies | Live | **$0.012/task + $0.0012/item** (1.000 items ⇒ $1.212; `domain_technologies` devuelve 1 item/task ⇒ $0.012) | https://dataforseo.com/pricing/domain-analytics-api/domain-technologies-api |
| Domain Analytics Whois | Live | **$0.12/task + $0.0012/dominio** (1M dominios ≈ $1.320) | https://dataforseo.com/pricing/domain-analytics-api/domain-analytics-whois-api |
| Bing Keywords Data | Standard/Live | **No verificado** — la página de pricing de Bing no expone tabla extraíble; cotizar en https://dataforseo.com/pricing | — |

Principio transversal: **se cobra por task, no por keyword** (1 o 1.000 kws en el array cuestan lo mismo en Google Ads); en Whois/Technologies/Bulk Clickstream se suma un cargo por item devuelto. Live cuesta ~1.5–4× el Standard queue; usar task/Standard para todo lo batch (refresh mensual de volúmenes) y Live solo para UX interactiva.

---

## 6. Gotchas

1. **Redondeo logarítmico de Google Ads**: ~80 valores posibles de volumen; el "volumen" es un bucket, no un conteo. No comparar deltas pequeños mes a mes como señal. (https://dataforseo.com/help-center/what-is-search-volume)
2. **Agrupación de near-variants**: Google Ads combina volúmenes de keywords similares (plural/singular, typos). La doc oficial recomienda enviar términos similares en **requests separados** para obtener métricas individuales — y aun así pueden venir agrupados; la desagregación real requiere DataForSEO Search Volume/clickstream. (https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-live/)
3. **Límites duros Google Ads**: máx. 1.000 kws/request; keyword ≤80 caracteres y ≤10 palabras; se convierten a lowercase; símbolos especiales/UTF restringidos; categorías restringidas pueden devolver vacío. **12 requests/min por cuenta en Live** de Google Ads (mucho menor que el límite global de 2.000 calls/min).
4. **Sin mes corriente**: `date_to` no puede exceder el mes pasado — Google no entrega datos del mes en curso. Histórico máx. 4 años.
5. **`ad_traffic_by_keywords` ya no es por keyword**: desde jun-2025 devuelve agregado de campaña completa (cambio del Google Ads API upstream). No diseñar features que asuman forecast per-keyword. (https://dataforseo.com/update/changes-google-ad-traffic-by-keywords)
6. **Bing lag**: datos del mes anterior pueden tardar hasta 72 h; categorías restringidas (armas/tabaco/drogas/violencia) devuelven vacío.
7. **Trends = escala relativa**: tanto Google Trends como DataForSEO Trends devuelven popularidad **relativa al pico del período**, no volúmenes absolutos; máx. 5 keywords por comparación. No mezclar escalas de requests distintos.
8. **Domain Analytics es Live-only**: no hay Standard queue barato; el costo por item de Whois ($0.0012/dominio) domina en extracciones masivas. Máx. 30 live requests concurrentes.
9. **URLs de doc con slugs cambiantes**: la doc oficial usa slugs con guiones (`/v3/keywords_data-google_ads-search_volume-live/`); las rutas "bonitas" con slashes suelen dar 404 (ver §8).

## 7. Oportunidades de máximo provecho

1. **Planificación editorial estacional**: `monthly_searches` de Google Ads (4 años de histórico, $0.06 por 1.000 kws en Standard) permite construir el calendario de estacionalidad de todo un topical map por centavos; complementar con DataForSEO Trends `explore` ($0.0012/task) para tendencia fina y `demography` para ángulo de audiencia. Encaja directo con el motor de contenidos (content-marketing-studio) y los dossiers de keywords por cliente.
2. **Prospección por stack tecnológico (lead-gen)**: `domains_by_technology` filtrado por país/idioma vía `technologies_summary` → lista de dominios que usan, p.ej., WordPress+WooCommerce o un competidor de la categoría; cruzar con Whois (`metrics.organic.etv`, posiciones) para priorizar prospectos con tracción real. Costo: ~$1.21 por 1.000 dominios. `domains_by_html_terms` permite prospección por señales en el HTML del homepage (p.ej. pixels, badges, schema).
3. **Inteligencia de dominios con Whois**: filtros por `expiration_datetime` + `registrar` + métricas orgánicas ⇒ vigilancia de dominios de competidores próximos a expirar, mapeo de portafolios, o scoring de dominios candidatos (backlinks + etv incluidos en la misma respuesta, sin segunda llamada).
4. **Volumen de precisión donde importa**: usar Google Ads como baseline barato masivo y reservar `dataforseo_search_volume`/`bulk_clickstream` ($0.012–0.18/task) para los clusters donde la decisión editorial/comercial depende de desagregar variantes — patrón híbrido que minimiza costo total.
5. **`keywords_for_site` como auditoría exprés de un prospecto**: 1 request devuelve hasta 2.000 keywords que Google asocia al dominio del prospecto — insumo instantáneo para un pitch (p.ej. Radiografía AEO / baseline competitivo).

## 8. Fuentes y páginas caídas

**Fuentes usadas (todas as-of 2026-08-06):**
- https://docs.dataforseo.com/v3/domain_analytics-overview/
- https://docs.dataforseo.com/v3/domain_analytics-technologies-overview/
- https://docs.dataforseo.com/v3/domain_analytics-whois-overview/
- https://docs.dataforseo.com/v3/domain_analytics-whois-filters/
- https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-live/
- https://docs.dataforseo.com/v3/keywords_data-google_ads-keywords_for_site-live/
- https://docs.dataforseo.com/v3/keywords_data-google_ads-keywords_for_keywords-live/
- https://docs.dataforseo.com/v3/keywords_data-bing-overview/
- https://docs.dataforseo.com/v3/keywords_data-google_trends-overview/
- https://docs.dataforseo.com/v3/dataforseo_trends-overview/
- https://docs.dataforseo.com/v3/keywords_data-clickstream_data-overview/
- https://dataforseo.com/update/changes-google-ad-traffic-by-keywords
- https://dataforseo.com/help-center/what-is-search-volume
- https://dataforseo.com/update/dataforseo-search-volume-api
- Pricing: https://dataforseo.com/pricing/keywords-data/google-ads · /google-trends · /dataforseo-trends-api-pricing · /clickstream-api-pricing · https://dataforseo.com/pricing/domain-analytics-api/domain-technologies-api · /domain-analytics-whois-api

**Páginas caídas / 404 (as-of 2026-08-06):**
- `https://docs.dataforseo.com/v3/keywords_data/` y `https://docs.dataforseo.com/v3/domain_analytics/` → **404** (la doc vive en slugs con guiones, no en rutas con slash).
- `https://docs.dataforseo.com/v3/keywords_data-overview/` → 404 (no existe un overview único de Keywords Data con ese slug).
- `https://docs.dataforseo.com/v3/keywords_data-google_ads-ad_traffic_by_keywords-live/` → 404 (el slug indexado es `keywords_data-google-ads-ad_traffic_by_keywords-live`; contenido verificado vía search snippet + update post oficial).
- `https://docs.dataforseo.com/v3/keywords_data-dataforseo_trends-overview/` → 404 (slug real: `dataforseo_trends-overview`).
- `https://dataforseo.com/pricing/keywords-data/google-ads-api-pricing` y `https://dataforseo.com/pricing/domain-analytics-api/domain-analytics-technologies-api` → 404 (slugs reales: `/google-ads` y `/domain-technologies-api`).
- Pricing de **Bing Keywords Data**: la página `https://dataforseo.com/pricing/keywords-data/bing` carga pero no expone tabla de precios extraíble → **precio no verificado**.
