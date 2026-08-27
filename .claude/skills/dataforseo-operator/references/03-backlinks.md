# DataForSEO Backlinks API — Dossier completo

> **As-of:** 2026-08-06 · Verificado contra la documentación oficial (`docs.dataforseo.com/v3/backlinks-*`) y páginas comerciales de dataforseo.com vía WebFetch/WebSearch.
> **Nota de acceso:** `https://docs.dataforseo.com/v3/backlinks/` devuelve **HTTP 404** — el patrón real de URLs de la doc es con guiones: `docs.dataforseo.com/v3/backlinks-<endpoint>-live/`. Todas las URLs citadas abajo fueron fetcheadas con éxito el 2026-08-06.

---

## 1. Resumen ejecutivo

- La Backlinks API es **solo Live**: un POST devuelve resultado inmediato (sin task POST/GET separados), turnaround promedio ≤2 s. Rate limit: **2 000 calls/min, máx 30 simultáneas**. Requiere signup separado de Backlinks API (el saldo es compartido con las demás APIs de DataForSEO).
- Catálogo: **13 endpoints analíticos + 7 bulk + 2 auxiliares** (Filters, Index). Todos bajo `POST https://api.dataforseo.com/v3/backlinks/<name>/live`.
- Costo uniforme: **$0.024 por request + $0.000036 por fila** (fila = un backlink / referring domain / página). Un request lleno de 1 000 filas = **$0.06**. Filtrar y ordenar es gratis.
- Los **bulk endpoints** aceptan hasta **1 000 targets por request** — el camino barato para métricas puntuales (rank, spam score, conteos, new/lost) sobre muchas propiedades.
- Índice: **~1.88 billones (trillion) de backlinks live, 184.5 mil millones de páginas live, ~770 M dominios**; crawl continuo ("crawl the web each second nonstop"), links nuevos disponibles "almost immediately". Endpoint `index` (gratis) reporta el volumen al momento.
- Métricas propias: `rank` (PageRank-like, escala 0–1000 por defecto, conmutable a 0–100 con `rank_scale`) y `spam_score` (0–100, 18 señales; 0–30 bajo, 31–60 medio, 61–100 alto).
- Histórico: `history` y las timeseries llegan hasta **2019** (`history` desde 2019-01-01; timeseries desde 2019-01-30); los bulk new/lost solo miran **365 días** hacia atrás.

---

## 2. Catálogo de endpoints (as-of 2026-08-06)

Fuente del catálogo completo: <https://docs.dataforseo.com/v3/backlinks-overview/>

### Analíticos (target único, salvo intersecciones)

| Endpoint | Path (`POST /v3/backlinks/...`) | Qué devuelve | URL doc |
|---|---|---|---|
| Summary | `summary/live` | Perfil completo del target: rank, backlinks, backlinks_spam_score, referring domains/pages/IPs, breakdowns por TLD/tipo/atributo/plataforma/país, broken links/pages | <https://docs.dataforseo.com/v3/backlinks-summary-live/> |
| History | `history/live` | Serie histórica mensual del perfil (solo **dominio**, sin subdominio/URL) desde **2019-01-01**: rank, backlinks, new/lost backlinks y referring domains por fecha | <https://docs.dataforseo.com/v3/backlinks-history-live/> |
| Backlinks | `backlinks/live` | Lista detallada de backlinks (fila = backlink único; duplicados de la misma página se agregan en `links_count`) | <https://docs.dataforseo.com/v3/backlinks-backlinks-live/> |
| Anchors | `anchors/live` | Anchors agregados: por anchor → backlinks, referring_domains, rank, spam score promedio, breakdowns | <https://docs.dataforseo.com/v3/backlinks-anchors-live/> |
| Domain Pages | `domain_pages/live` | Páginas del dominio con data on-page (`meta`: title, canonical, H1–H3, spam score) + `page_summary` de backlinks por página | <https://docs.dataforseo.com/v3/backlinks-domain_pages-live/> |
| Domain Pages Summary | `domain_pages_summary/live` | Métricas summary de backlinks **por página** del target (rank, backlinks, referring_domains, spam score, breakdowns) — sin la data on-page de domain_pages | <https://docs.dataforseo.com/v3/backlinks-domain_pages_summary-live/> |
| Referring Domains | `referring_domains/live` | Dominios referentes con rank, backlinks al target, spam score promedio, IPs/subnets, breakdowns | <https://docs.dataforseo.com/v3/backlinks-referring_domains-live/> |
| Referring Networks | `referring_networks/live` | Redes referentes por **IP o subnet** (`network_address_type: ip|subnet`, default `ip`) — detección de granjas de links en la misma red | <https://docs.dataforseo.com/v3/backlinks-referring_networks-live/> |
| Competitors | `competitors/live` | Dominios que comparten perfil de backlinks con el target: `intersections` (backlinks compartidos) + `rank` de cada competidor; `exclude_large_domains` (default true) omite google.com/amazon.com etc. | <https://docs.dataforseo.com/v3/backlinks-competitors-live/> |
| Domain Intersection | `domain_intersection/live` | **Link gap por dominios**: referring domains que apuntan a los `targets` (hasta 20, objeto con keys "1".."20") y NO a `exclude_targets` (hasta 10); `intersection_mode: all|partial` | <https://docs.dataforseo.com/v3/backlinks-domain_intersection-live/> |
| Page Intersection | `page_intersection/live` | **Link gap por páginas**: referring pages que apuntan a los targets (hasta 20) y no a los excluidos (hasta 10); incluye contexto del link (`anchor`, `text_pre`, `text_post`) | <https://docs.dataforseo.com/v3/backlinks-page_intersection-live/> |
| Timeseries Summary | `timeseries_summary/live` | Serie temporal de stock: rank, backlinks, referring domains/pages/IPs/subnets por `group_range: day|week|month|year` (default `month`), desde **2019-01-30** | <https://docs.dataforseo.com/v3/backlinks-timeseries_summary-live/> |
| Timeseries New & Lost Summary | `timeseries_new_lost_summary/live` | Serie temporal de flujo: new/lost backlinks y new/lost referring (main) domains por período, desde **2019-01-30** | <https://docs.dataforseo.com/v3/backlinks-timeseries_new_lost_summary-live/> |

### Bulk (hasta 1 000 targets por request)

| Endpoint | Path | Devuelve por target | URL doc |
|---|---|---|---|
| Bulk Ranks | `bulk_ranks/live` | `rank` (PageRank-like, real-time a la fecha del request) | <https://docs.dataforseo.com/v3/backlinks-bulk_ranks-live/> |
| Bulk Backlinks | `bulk_backlinks/live` | `backlinks` (conteo de backlinks live) | <https://docs.dataforseo.com/v3/backlinks-bulk_backlinks-live/> |
| Bulk Spam Score | `bulk_spam_score/live` | `spam_score` 0–100 | <https://docs.dataforseo.com/v3/backlinks-bulk_spam_score-live/> |
| Bulk Referring Domains | `bulk_referring_domains/live` | `referring_domains`, `referring_domains_nofollow`, `referring_main_domains`, `referring_main_domains_nofollow` | <https://docs.dataforseo.com/v3/backlinks-bulk_referring_domains-live/> |
| Bulk New & Lost Backlinks | `bulk_new_lost_backlinks/live` | `new_backlinks`, `lost_backlinks` desde `date_from` (default: hoy−30d; mínimo: hoy−365d) | <https://docs.dataforseo.com/v3/backlinks-bulk_new_lost_backlinks-live/> |
| Bulk New & Lost Referring Domains | `bulk_new_lost_referring_domains/live` | `new/lost_referring_domains` + `new/lost_referring_main_domains` (misma ventana 365d) | <https://docs.dataforseo.com/v3/backlinks-bulk_new_lost_referring_domains-live/> |
| Bulk Pages Summary | `bulk_pages_summary/live` | Mini-summary por target: rank, **main_domain_rank**, backlinks, spam score, first_seen/lost, referring domains/pages/IPs/subnets + breakdowns. **Gotcha: las URLs no pueden pertenecer a más de 100 dominios distintos** | <https://docs.dataforseo.com/v3/backlinks-bulk_pages_summary-live/> |

### Auxiliares

| Endpoint | Notas | URL doc |
|---|---|---|
| Index | Volumen del índice al momento + serie mensual desde 2021-10-01. **Gratis** ("Your account will not be charged"). Ejemplo capturado en la doc: ~800.6 B backlinks / 80.8 B páginas / 770.7 M dominios (snapshot de la doc, no del índice live actual) | <https://docs.dataforseo.com/v3/backlinks-index/> |
| Filters / available_filters | `GET /v3/backlinks/available_filters` — campos filtrables por endpoint | <https://docs.dataforseo.com/v3/backlinks-filters/> |

Nota del brief: el brief mencionaba "bulk_new_lost" genérico — hoy son DOS endpoints (`bulk_new_lost_backlinks` y `bulk_new_lost_referring_domains`), y existe además `bulk_pages_summary` que el brief no listaba.

---

## 3. Métricas propias

### `rank` (y familia: `page_from_rank`, `domain_from_rank`, `main_domain_rank`)
- Algoritmo tipo **PageRank** ("the method for node ranking in a linked database"), calculado sobre toda la base de DataForSEO. Fuente: <https://docs.dataforseo.com/v3/backlinks-bulk_ranks-live/>.
- Escala: **0–1000 por defecto** (`rank_scale: one_thousand`); conmutable a **0–100** con `rank_scale: one_hundred`. 0 = sin backlinks. El parámetro `rank_scale` existe en casi todos los endpoints (no en los bulk de conteos puros).
- Variantes en `backlinks/live`: `rank` (del backlink individual), `page_from_rank` (página referente), `domain_from_rank` (dominio referente). En `bulk_pages_summary/live` aparece además `main_domain_rank` (rank del dominio principal al que pertenece la página target). Fuentes: <https://docs.dataforseo.com/v3/backlinks-backlinks-live/>, <https://docs.dataforseo.com/v3/backlinks-bulk_pages_summary-live/>.
- Es "real-time data for the date of the request" (bulk_ranks) — no un snapshot mensual.

### `spam_score` y `backlinks_spam_score`
- **`spam_score`**: métrica propietaria 0–100 del nivel de spam de una página/grupo/dominio. Calculada con **18 señales** (largo del nombre de dominio, ratio external/internal links, HTTP vs HTTPS, etc.). Bandas oficiales: **0–30 bajo, 31–60 medio, 61–100 alto**. Fuente: <https://dataforseo.com/help-center/what-is-spam-score-and-how-is-it-calculated> + <https://docs.dataforseo.com/v3/backlinks-bulk_spam_score-live/>.
- Para dominios/grupos: se calcula el spam score de cada página y se **promedia**.
- **`backlinks_spam_score`** (en summary, anchors, referring_domains, domain_pages_summary, etc.): spam score **promedio agregado de los backlinks** que apuntan al target — mide la toxicidad del perfil entrante, no la del target mismo. Fuente: <https://docs.dataforseo.com/v3/backlinks-summary-live/>.
- Referencias de calibración de la propia doc (bulk_spam_score): Stack Overflow 3, Apple 5, CNN 19, Forbes 20, BBC 31, IBM 33.

---

## 4. Params clave

### `target` — formato y efecto
- **Dominio**: sin `https://` y sin `www.` (`example.com`) → perfil del dominio completo; con `include_subdomains: true` (default) suma subdominios.
- **Subdominio**: sin protocolo (`blog.example.com`) → solo ese subdominio (más lo que diga `include_subdomains` hacia abajo).
- **URL/página**: **con protocolo completo** (`https://www.apple.com/iphone/`) → backlinks de esa página exacta.
- **Gotcha central**: pasar `https://example.com` donde se espera dominio lo trata como página (o falla el match); pasar `example.com/path` sin protocolo no es una URL válida para modo página. `history/live`, `timeseries_summary` y `timeseries_new_lost_summary` aceptan **solo dominio**.
- Fuentes: cada página de endpoint, p. ej. <https://docs.dataforseo.com/v3/backlinks-summary-live/>, <https://docs.dataforseo.com/v3/backlinks-history-live/>.

### `mode` (solo `backlinks/live`)
- `as_is` (default): todos los backlinks.
- `one_per_domain`: un backlink por dominio referente (vista deduplicada de dominios).
- `one_per_anchor`: un backlink por anchor.
- `custom_mode`: objeto `{field, value}` para agrupar por otro campo. Fuente: <https://docs.dataforseo.com/v3/backlinks-backlinks-live/>.

### `backlinks_status_type`
- `live` (default) | `lost` | `all`. Presente en summary, backlinks, anchors, referring_domains, domain_pages(_summary), referring_networks. Cambiarlo a `all` es la base de auditorías históricas; `lost` alimenta recuperación de links caídos.

### Filtros y orden
- `filters`: hasta **8 condiciones** combinables con `and`/`or`; operadores por tipo (string: `=`,`<>`,`like`,`ilike`,`match`,`regex`,`in`…; numéricos: `<`,`<=`,`>`,`>=`…; boolean: `=`,`<>`; arrays: `has`/`has_not`; fechas ISO 8601). **Sin costo extra**. `order_by`: máx 3 reglas.
- Filtros típicos: `["dofollow","=",true]`, `["anchor","like","%brand%"]`, `["tld_from","=","cl"]`, `["backlink_spam_score",">",60]`, `["first_seen",">","2026-01-01 00:00:00 +00:00"]`.
- Intersecciones usan notación `$key` (número del target) y TLD breakdowns usan `referring_links_tld.$tld`.
- Fuente: <https://docs.dataforseo.com/v3/backlinks-filters/>.

### Otros scope params (defaults en `true` salvo indicación)
- `include_subdomains` — incluir subdominios del target.
- `include_indirect_links` — incluir links a redirects/canonicals del target.
- `exclude_internal_backlinks` — excluir links entre subdominios del mismo target.
- `internal_list_limit` (default 10, máx 1000) — tamaño de los arrays internos (breakdowns).
- `backlinks_filters` — pre-filtra el dataset de backlinks ANTES de agregar (p. ej. summary solo-dofollow).
- Paginación en `backlinks/live`: `limit` 1–1000 (default 100), `offset` máx **20 000**, más allá → `search_after_token`.
- Competitors: `main_domain` (default true) y `exclude_large_domains` (default true).

---

## 5. Modelo de costo (Live) y camino bulk

Fuente: <https://dataforseo.com/pricing/backlinks/backlinks> + <https://dataforseo.com/apis/backlinks-api>

- **$0.024 por request (task) + $0.000036 por fila** devuelta; 1 000 filas = $0.036 en filas → request lleno = **$0.06**. Equivalente: **$0.06 por 1 000 filas** todo incluido.
- Una fila = un objeto de datos (un backlink, un referring domain, una página, un punto de la serie temporal…). **El costo escala con `limit`**: pedir `limit: 1000` "por si acaso" multiplica el costo de filas ×10 vs `limit: 100`.
- Filtrado y sorting **gratis** — filtra server-side en vez de traer todo y filtrar en tu código.
- La página de pricing no diferencia por endpoint (estructura uniforme). Costos reales observados en ejemplos de la doc: history $0.02012, referring_networks $0.02015, timeseries_new_lost $0.02009, bulk_referring_domains $0.0203 (targets pocos ⇒ domina el fee de task).
- **Bulk = el camino barato para flotas de targets**: un solo request de `bulk_ranks`/`bulk_spam_score`/`bulk_referring_domains`/`bulk_new_lost_*`/`bulk_pages_summary` cubre **hasta 1 000 targets** (≈ una fila por target) — órdenes de magnitud más barato que 1 000 requests de summary. Patrón recomendado: bulk para el barrido amplio → endpoints analíticos solo para los targets que ameritan drill-down.
- El endpoint `index` es **gratis**.

---

## 6. Índice y frescura

- Página comercial (<https://dataforseo.com/apis/backlinks-api>, as-of 2026-08-06): **1.88 T backlinks live, 184.5 B páginas live**; "the backlink index is also updated continuously in real-time. Newly discovered links are made available almost immediately after being crawled."
- Doc overview (<https://docs.dataforseo.com/v3/backlinks-overview/>): "we crawl the web each second nonstop, so the stats you get are always up to the moment".
- Endpoint `index` (<https://docs.dataforseo.com/v3/backlinks-index/>): volumen exacto del índice al momento + snapshots mensuales desde **2021-10-01**. El ejemplo estático de la doc muestra ~800.6 B backlinks / 770.7 M dominios (snapshot antiguo del ejemplo; el marketing reporta 1.88 T — usar el endpoint para el número vigente).
- Histórico consultable: `history` desde 2019-01-01 (mensual), timeseries desde 2019-01-30 (day/week/month/year), bulk new/lost solo 365 días.

---

## 7. Gotchas

1. **URL de doc "bonita" está caída**: `docs.dataforseo.com/v3/backlinks/` → 404. El patrón real es `v3/backlinks-<endpoint>-live/` (con guiones). Verificado 2026-08-06.
2. **Protocolo en `target`**: dominios/subdominios SIN `https://`/`www.`; páginas CON URL absoluta. Mezclarlos cambia silenciosamente qué perfil recibes (dominio completo vs página exacta).
3. **`history` y las dos timeseries solo aceptan dominio raíz** — no subdominios ni URLs.
4. **El costo escala con `limit`**: cada fila cuesta $0.000036; los breakdowns internos se controlan con `internal_list_limit` (default 10). No pidas 1000 si necesitas 100.
5. **`offset` máximo 20 000** en `backlinks/live`; profundidades mayores exigen `search_after_token` (paginación por token, no aleatoria).
6. **Bulk máx 1 000 targets**, y `bulk_pages_summary` además limita a **URLs de máx 100 dominios distintos** por request.
7. **Bulk new/lost: ventana máxima 365 días** y `date_from` default hoy−30d — no sirven para arqueología; para eso están history/timeseries (2019+).
8. **Defaults que sesgan**: `backlinks_status_type=live` (los lost no aparecen salvo que lo pidas), `include_subdomains=true`, `include_indirect_links=true`, `exclude_internal_backlinks=true`, `exclude_large_domains=true` en competitors. Auditorías serias deben decidir explícitamente cada uno.
9. **`rank_scale` default es 0–1000**, no 0–100 — al comparar con métricas tipo DR/DA de otras suites, o se pide `one_hundred` o se divide, pero sin mezclar escalas en un mismo dataset.
10. **Un request Live = una task** (no se pueden empaquetar varias tasks como en las APIs task-based); el paralelismo se limita a 30 simultáneas.
11. **`backlinks/live` devuelve backlinks únicos**: múltiples links desde la misma página se colapsan y se reportan vía `links_count`.

---

## 8. Oportunidades de máximo provecho

1. **Auditoría de toxicidad a escala** — `bulk_spam_score` (1 000 dominios referentes por request, sacados antes de `referring_domains/live`) + `backlinks/live` con filtro `["backlink_spam_score",">",60]` para aislar los links tóxicos concretos. Bandas oficiales 0–30/31–60/61–100 dan el semáforo directo para un reporte de disavow o de riesgo de perfil.
2. **Link gap vs competidores** — `competitors/live` descubre quiénes comparten perfil (con `intersections`); luego `domain_intersection/live` con `targets` = hasta 20 competidores y `exclude_targets` = nuestro cliente rinde la lista exacta de dominios que enlazan a la competencia y no a nosotros, ordenable por `rank` para priorizar prospección. `page_intersection/live` baja al nivel de página con contexto de anchor (`text_pre`/`text_post`) listo para outreach.
3. **Monitoreo new/lost continuo y barato** — cartera completa de clientes con UN request mensual de `bulk_new_lost_backlinks` + `bulk_new_lost_referring_domains` (hasta 1 000 targets, ~$0.06); drill-down con `timeseries_new_lost_summary` (gráfico desde 2019) y `backlinks/live` filtrado `is_new=true` / `is_lost=true` solo donde hubo movimiento.
4. **Prospección de enlaces** — `referring_domains/live` de los líderes del nicho ordenado por `rank,desc` + filtro de spam bajo (`backlinks_spam_score` < 30) = lista de prospectos de calidad; `anchors/live` revela el perfil de anchors que el nicho tolera antes de diseñar campañas.
5. **Detección de redes/PBN** — `referring_networks/live` con `network_address_type: subnet`: muchos referring domains en pocas subnets = huella de red de links artificiales.
6. **Content-level intelligence** — `domain_pages_summary/live` sobre un competidor muestra QUÉ páginas suyas atraen links (link-earning assets) → informa la estrategia de contenido linkable propia.
7. **Pipeline económico tipo embudo**: `index` (gratis, sanity) → bulk (barrido 1 000 targets) → summary (targets interesantes) → backlinks/anchors/intersections (drill-down) — minimiza filas pagadas por insight.

> **As-of 2026-08-27 (TASK-1777):** el patrón del punto 3 —monitoreo new/lost barato + drill-down sólo donde hubo movimiento— quedó **IMPLEMENTADO en Greenhouse** como paso condicional del batch semanal `ops-seo-backlink-capture` (predicado `shouldDrillDownBacklinks` sobre el `new_lost_delta` ya persistido; `referring_domains/live` + `anchors/live` + `backlinks/live` en `mode: one_per_domain` filtrado `is_new`/`is_lost`, `rank_scale: one_hundred`), con **veredicto persistido por snapshot** (`seo_backlink_drilldowns`: `drilled|skipped_no_movement|skipped_partial|failed`) y **tres estados de lectura** (`available` · `skipped_no_movement` como afirmación positiva de estabilidad · `drilldown_failed`). Code complete, rollout pendiente (flag `GROWTH_SEO_BACKLINK_DETAIL_ENABLED` OFF). Detalle del contrato en el SKILL.md (§Estado del runtime) y `.claude/rules/growth-seo.md`.

---

## 9. Fuentes (todas fetcheadas 2026-08-06)

- Overview/catálogo: <https://docs.dataforseo.com/v3/backlinks-overview/> · (404: <https://docs.dataforseo.com/v3/backlinks/>)
- Summary: <https://docs.dataforseo.com/v3/backlinks-summary-live/>
- History: <https://docs.dataforseo.com/v3/backlinks-history-live/>
- Backlinks: <https://docs.dataforseo.com/v3/backlinks-backlinks-live/>
- Anchors: <https://docs.dataforseo.com/v3/backlinks-anchors-live/>
- Domain Pages: <https://docs.dataforseo.com/v3/backlinks-domain_pages-live/>
- Domain Pages Summary: <https://docs.dataforseo.com/v3/backlinks-domain_pages_summary-live/>
- Referring Domains: <https://docs.dataforseo.com/v3/backlinks-referring_domains-live/>
- Referring Networks: <https://docs.dataforseo.com/v3/backlinks-referring_networks-live/>
- Competitors: <https://docs.dataforseo.com/v3/backlinks-competitors-live/>
- Domain Intersection: <https://docs.dataforseo.com/v3/backlinks-domain_intersection-live/>
- Page Intersection: <https://docs.dataforseo.com/v3/backlinks-page_intersection-live/>
- Timeseries Summary: <https://docs.dataforseo.com/v3/backlinks-timeseries_summary-live/>
- Timeseries New & Lost: <https://docs.dataforseo.com/v3/backlinks-timeseries_new_lost_summary-live/>
- Bulk Ranks: <https://docs.dataforseo.com/v3/backlinks-bulk_ranks-live/>
- Bulk Backlinks: <https://docs.dataforseo.com/v3/backlinks-bulk_backlinks-live/>
- Bulk Spam Score: <https://docs.dataforseo.com/v3/backlinks-bulk_spam_score-live/>
- Bulk Referring Domains: <https://docs.dataforseo.com/v3/backlinks-bulk_referring_domains-live/>
- Bulk New & Lost Backlinks: <https://docs.dataforseo.com/v3/backlinks-bulk_new_lost_backlinks-live/>
- Bulk New & Lost Referring Domains: <https://docs.dataforseo.com/v3/backlinks-bulk_new_lost_referring_domains-live/>
- Bulk Pages Summary: <https://docs.dataforseo.com/v3/backlinks-bulk_pages_summary-live/>
- Index: <https://docs.dataforseo.com/v3/backlinks-index/>
- Filters: <https://docs.dataforseo.com/v3/backlinks-filters/>
- Pricing: <https://dataforseo.com/pricing/backlinks/backlinks>
- Página comercial (índice/frescura): <https://dataforseo.com/apis/backlinks-api>
- Spam Score (help center): <https://dataforseo.com/help-center/what-is-spam-score-and-how-is-it-calculated>
