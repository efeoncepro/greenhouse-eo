---
name: dataforseo-operator
description: Operador experto de la API DataForSEO v3 para Greenhouse — oficio del proveedor + contrato interno gobernado. Invocar al diseñar o implementar CUALQUIER llamada a DataForSEO (SERP, Labs, Backlinks, OnPage, Domain Analytics, AI Optimization), al elegir endpoint/método (live vs task-based) o estimar/optimizar costos, al ampliar el allowlist de familias, al trabajar rank tracking, keyword research, site audit, link audit, o CUALQUIER capacidad de visibilidad AI (AI Mode, AI Overviews, LLM Mentions, LLM Responses, share of voice en LLMs, AEO), y al tocar src/lib/ai/dataforseo*.ts o consumers en src/lib/growth/**.
---

# DataForSEO Operator — oficio del proveedor + contrato Greenhouse

Skill de dos capas, inseparables:

1. **Oficio de la API** — qué ofrece DataForSEO v3 hoy (as-of 2026-08-06, verificado contra doc oficial con URLs citadas en `references/`), cómo llamarla bien y cómo pagar lo mínimo por el máximo dato.
2. **Contrato Greenhouse** — cómo se llama DataForSEO DENTRO de este repo: cliente canónico único, allowlist de familias, breaker, spend ledger y entitlement chokepoint. La capa 1 nunca autoriza saltarse la capa 2.

Esta skill existe en `.claude/skills/` y `.codex/skills/` con el mismo cuerpo. **Las `references/` canónicas viven SOLO en `.claude/skills/dataforseo-operator/references/`** — ambos agentes las leen de ahí; no duplicarlas (anti-drift).

---

## Regla cero — contrato Greenhouse (NO negociable)

- **NUNCA** hacer `fetch` a `api.dataforseo.com` directo ni crear un cliente/SDK paralelo. TODO pasa por `postDataForSeoTask` de `src/lib/ai/dataforseo.ts` (transporte canónico: Basic auth + timeout + breaker + registro de costo). El cliente se **amplía, nunca se duplica** (arch SEO §1.2).
- **Allowlist CERRADO de 5 familias** (`src/lib/ai/dataforseo-families.ts`): `serp` · `labs` · `backlinks` · `onpage` · `domain`. `normalizeEndpoint` lanza si el endpoint no calza con el prefijo de la familia. Ampliar familia = proceso gobernado (ver §Ampliar el allowlist), nunca aflojar el candado (ADR EPIC-022 decisión #4, riesgo §13.3).
- **Toda familia salvo `serp` exige `organizationId`** (el tipo `DataForSeoTaskInput` lo fuerza) y el transporte **lanza** si hay org sin spend recorder registrado. El runtime que llame familias SEO debe importar `@/lib/growth/seo/register-provider-spend` en su entrypoint. Estado as-of 2026-08-07: lo importa el **ops-worker** (`services/ops-worker/server.ts`, entrypoint del rank capture y del site audit); **Vercel no** — un route handler que llame una familia SEO lanza en la primera llamada.
- **Todo write provider-facing pasa por `enforceSeoRunEntitlement`** (`src/lib/growth/seo/entitlement.ts`) — chokepoint ÚNICO de entitlement + quota + budget. Limitación conocida: el gate se consulta UNA vez y el gasto se acumula después; para batches grandes pasar `estimatedCostUsd` del batch completo y re-consultar cada K llamadas (`entitlement.ts:288-307`).
- 🔴 **El gate protege la corrida que gasta, NO la decisión que la agranda.** `trackKeywords`/`untrackKeywords` (`src/lib/growth/seo/track-keywords.ts`, TASK-1308) no llaman al proveedor ni escriben el ledger, pero **seguir una keyword es un compromiso de gasto diferido**: el rank capture diario paga por cada keyword vigente del set, en cada ciclo, hasta que alguien la deje de seguir. Por eso ese command lleva techo gobernado por target (`GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`, default 200) con outcome **por keyword** (`tracked|already_tracked|intent_changed|capacity_exceeded|invalid`, nunca silencio ni excepción), entitlement per-ORG `seo_v2` (clave canónica desde `TASK-1677`; `seo_v1` ya no se lee) sin consumir allowance, idempotencia y **su reverso append-only** (`effective_to`, jamás DELETE). Al auditar costo, míralo: no aparece en ningún grep de `postDataForSeoTask`. Y desde `TASK-1659` una membresía puede declarar **por qué** existe (`intent`: `target|opportunity`): **sin default** —quien no declara escribe `NULL`, y asumir `opportunity` inventa una clasificación que nadie hizo—, **ortogonal a `source`**, y cambiarla **NO es un `UPDATE`** sino cerrar la membresía vigente y abrir otra, sin consumir cupo del techo. Detalle: `references/07-contrato-greenhouse.md` §5b.
- **NUNCA reads live-per-view contra DataForSEO en el render de un dashboard** — los reads pegan a snapshots PG; la captura corre async vía Cloud Scheduler + ops-worker, nunca Vercel cron (arch SEO §1.1/§8).
- **GSC = verdad de primera parte (●), DataForSEO = estimado de mercado (◑)** — lentes complementarias, nunca promediadas. Degradación honesta: audit con 0 findings ≠ crawl fallido; nunca fabricar snapshot ni `$0` fantasma.
- **Breaker por familia** (5 fallos → open, 60 s cooldown, half-open de sonda única): `429/402/403/5xx` cuentan; `400/404` de caller NO. Un poll fallando apaga también la creación de esa familia — diseñar consumers con eso en mente.
- **Boundary SEO↔AEO** (§1.1): nunca JOIN/VIEW/FK entre tablas `seo_*` y `grader_*`; cruce en memoria por `organization_id`.
- Secretos: `DATAFORSEO_API_LOGIN` (env) + `DATAFORSEO_API_PASSWORD_SECRET_REF` → GCP `greenhouse-dataforseo-api-password`. El grader async corre en **ops-worker**: las creds deben existir AHÍ, no solo en Vercel (TASK-1341).

Detalle completo con firmas y líneas: `references/07-contrato-greenhouse.md`.

---

## Mapa de decisión por trabajo

| Quiero… | Familia | Endpoint(s) clave | Método | Costo aprox | Reference |
|---|---|---|---|---|---|
| Posición orgánica de keywords (batch diario) | `serp` | `/v3/serp/google/organic/task_post` + poll | task-based standard | $0.0006/SERP (3.3× más barato que live) | 01 |
| SERP completo con features (SoV ponderado) | `serp` | `organic/live/advanced` o task advanced | según urgencia | live $0.002; ×2 si `load_async_ai_overview` | 01 |
| Respuesta de Google AI Mode + citas (AEO) | `serp` | `ai_mode/live/advanced` (default del cliente) | live | $0.004/request | 01 |
| Volumen + dificultad + intent en una fila | `labs` | `keyword_overview` | live (Labs es 100% live) | $0.012/req + $0.00012/fila | 02 |
| Keyword gap vs competidores | `labs` | `domain_intersection` / `page_intersection` | live | 1 request | 02 |
| Keywords que un dominio ranquea + momentum | `labs` | `ranked_keywords` (flags is_new/up/down/lost) | live | por filas | 02 |
| Tráfico estimado de N dominios | `labs` | `bulk_traffic_estimation` | live | ~$0.13/1.000 dominios | 02 |
| Perfil de enlaces / toxicidad | `backlinks` | embudo: `bulk_*` → `summary` → drill-down | live only | $0.024/req + $0.000036/fila | 03 |
| Link gap de enlaces | `backlinks` | `domain_intersection` (20 targets) | live | 1 request | 03 |
| Auditoría técnica de sitio completo | `onpage` | `task_post` → poll `summary` → reads (gratis 30d) | task-based | $0.00015/pág (JS ×9, browser ×33) | 04 |
| Auditar UNA URL ya (agéntico) | `onpage` | `instant_pages` + `content_parsing/live` + `lighthouse/live` | live | ~$0.01 las 4 llamadas | 04 |
| Validar JSON-LD/microdata (Radiografía AEO) | `onpage` | `validate_micromarkup` / `microdata` | en el crawl | incluido | 04 |
| Volumen Google Ads real / forecast paid | — (fuera del allowlist; usar `labs` salvo caso Ads real) | `keywords_data` Google Ads | task-based | $0.06/1.000 kws | 05 |
| Estacionalidad / demanda relativa | — (evaluar) | DataForSEO Trends | live | $0.0012–0.006/task | 05 |
| Stack tecnológico de dominios (lead-gen) | `domain` | `domains_by_technology`, `domain_technologies` | live | ~$1.21/1.000 dominios | 05 |
| Whois enriquecido con métricas orgánicas | `domain` | `whois/overview` | live | $0.12/task + $0.0012/dominio | 05 |
| **Share of voice de marca en LLMs** | — (candidata #1 allowlist) | AI Optimization: `llm_mentions` (+timeseries, top domains/pages/brands) | live only | ver reference 08 | 08 |
| **Benchmark multi-modelo de citabilidad** | — (candidata #1) | AI Optimization: `llm_responses` (ChatGPT/Claude/Gemini/Perplexity) | live $0.0006+LLM; standard $0.0002+$0.01 | 08 |
| Menciones web + sentiment (brand monitoring) | — (candidata #2) | Content Analysis: search/trends/rating | live | ~$0.06/1.000 filas | 06 |
| Reviews multi-fuente / listings Maps | — (candidata #3, acotada) | Business Data | mixto | ver reference | 06 |

**Regla de lectura de la tabla:** si la familia está en el allowlist, implementa vía `postDataForSeoTask`. Si dice "candidata/evaluar", NO existe camino runtime hoy — proponer ampliación gobernada primero (§Ampliar el allowlist). Para análisis ad-hoc de operador (sin runtime), el sandbox y la doc siguen disponibles, pero cualquier llamada real pagada desde el repo pasa igual por el cliente canónico.

---

## Carril AI — visibilidad en motores de respuesta (prioridad Efeonce)

Lo AI-relevante de DataForSEO hoy, en orden de madurez para Greenhouse:

1. **Google AI Mode** (`serp`, EN allowlist, YA productivo): vertical propio que devuelve el answer en **markdown + `references[]`** (source/domain/url/title/text). Es la fuente del provider `google_ai_overview` del AI Visibility Grader (adapter `google-ai-overview-adapter.ts`). AI Mode es English-only → `language_code='en'` obligatorio. HTTP 200 sin bloque AI = `skipped:no_ai_overview_block`, nunca `succeeded` vacío.
2. **AI Overview en organic** (`serp`, EN allowlist): `ai_overview` es un item type más del SERP orgánico, pero el AI Overview asíncrono **NO aparece sin `load_async_ai_overview: true`** (falso negativo silencioso de monitoreo; duplica el costo del request). Para medir "¿mi keyword dispara AIO y quién es citado?" este flag es obligatorio.
3. **Labs para AEO** (`labs`, EN allowlist): `ranked_keywords` con `item_types: ai_overview_reference` mide en qué keywords un dominio es **citado por AI Overviews** — presencia AEO longitudinal sin scraping.
4. **SERP AI Summary** (`serp`, post-hoc): $0.01/request con prompt custom sobre un `task_id` existente (ventana 30d) — resumen LLM del SERP ya pagado.
5. **AI Optimization API** (`/v3/ai_optimization/`, FUERA del allowlist — candidata #1 a ampliación). Deep-dive completo: `references/08-ai-optimization.md`. Datos duros as-of 2026-08-06:
   - **LLM Mentions** (unlock #1): base longitudinal del proveedor (desde 2025-08-01) de menciones/citas con timeseries new/lost + top domains/pages/brands + variantes Lite; $0.1/request + $0.001/fila (~$1.1 por 1.000 filas, sin mínimo mensual). **Gotcha crítico de cobertura: solo ChatGPT (US/English) + Google AI Overview** — para es-CL solo aplica el lado `google`; Claude/Perplexity/Gemini exigen observación propia vía LLM Responses.
   - **LLM Responses**: **73 modelos unificados** (33 ChatGPT incl. gpt-5, 14 Claude incl. sonnet-4, 23 Gemini, 3 Perplexity sonar) con `web_search`, `annotations[]` (citas con URL) y `money_spent` por call. Ruta barata task-based ($0.0002 + $0.01 prepago reembolsable) sirve para ChatGPT y Claude; **Gemini y Perplexity son live-only** ($0.0006 + costo LLM) — presupuestar asimétrico.
   - **LLM Scraper** ($0.0012–0.004/página): superficie real de ChatGPT search incl. `chat_gpt_products`, `local_businesses` y `ads` — dimensión comercial que el grader hoy no ve.
   - **AI Keyword Data** ($0.0001/kw, 94 locations multi-idioma): prioriza qué prompts monitorear, pero es proxy estadístico de People Also Ask — reportar SIEMPRE como ◑ estimado, nunca ●.
   - `fan_out_queries` y `brand_entities` vienen **gratis** en las tres superficies — input directo al entity work de `seo-aeo`.
   - Frecuencia de refresh de la base Mentions NO publicada — verificar empíricamente antes de prometer cadencia diaria a un cliente.

**Relación con el grader (no confundir carriles):** el grader tiene providers LLM propios (`src/lib/ai/` Gemini/Anthropic/OpenAI) para *generar* observaciones, y usa DataForSEO para *observar superficies de Google*. AI Optimization API agregaría una tercera lente: *lo que los LLMs de terceros responden y citan*, con base longitudinal del proveedor — LLM Responses podría además reemplazar el mantenimiento de 4 integraciones LLM propias con una sola. Son lentes complementarias — la honestidad ●/◑ del módulo SEO aplica igual acá. Integrar exige familia nueva + migración CHECK + entitlement; casi todos los endpoints son POST-body, compatibles con el transporte canónico.

---

## Modelo operativo de la API (lo que siempre se olvida)

- **HTTP 200 ≠ éxito**: cada task del batch trae su propio `status_code` (`20000` ok, `20100` created, `40602` en cola). Validar POR TASK y registrar el campo `cost` real de cada respuesta.
- **Task-based vs live**: standard queue ~5 min y 3.3× más barato — default para batch/cron. Live solo para UX interactiva o agentes en vivo. Priority queue = punto medio (×2).
- **Delivery a escala**: `postback_url` (resultado completo gzip, timeout 10 s) con fallback a `tasks_ready` (ventana 3 días, 20 calls/min, no escala >1.000 tasks/min); `webhook_resend` reenvía hasta 100 ids gratis.
- **Los resultados expiran**: 30 días task-based (HTML 7); después `40403` y pagas de nuevo. Reconciliación gratis: `$path/id_list` (6 meses) + `$path/errors` (7 días) + `/v3/appendix/user_data` (balance, límites y tarifas de TU cuenta).
- **Límites**: 2.000 calls/min, 100 tasks/POST, 30 simultáneas en familias live. Duplicate-task guards horario/diario (`40205`/`40206`) — usar `tag`, no re-postear.
- **Sandbox** (`sandbox.dataforseo.com/v3/`): gratis, estructura de respuesta idéntica (data dummy), soporta pingback/postback — validar contrato de parsing y webhooks ANTES de gastar.
- **Filtros transversales** (Labs/Backlinks/etc.): máx 8, `and`/`or` explícito, `regex` RE2 ≤1.000 chars; `order_by` máx 3; paginación `offset` (≤10–20k) → `offset_token`/`search_after_token` (que ignoran todo excepto `limit` en páginas siguientes).
- **URLs de la doc**: los índices "bonitos" (`/v3/serp/`, `/v3/backlinks/`) dan **404**; los slugs canónicos usan guiones (`/v3/serp-overview/`, `/v3/backlinks-summary-live/`). No hardcodear URLs de doc sin verificarlas.

## Palancas de costo (multiplican en silencio)

| Palanca | Efecto |
|---|---|
| Operadores de búsqueda en keyword (`site:`, `filetype:`) | ×5 el SERP |
| `calculate_rectangles` / `load_async_ai_overview` | ×2 |
| `depth` (default 10, máx 200) | proporcional, por incrementos |
| `enable_javascript` (OnPage) | ×9 ($0.0015/pág) |
| `enable_browser_rendering` (OnPage; desbloquea CWV) | ×33 ($0.0051/pág) |
| `include_clickstream_data` (Labs) | ×2 |
| Históricos Labs | ×10 ($0.12/req + $0.0012/fila) |
| `limit` alto en Labs/Backlinks | costo por fila devuelta |
| 4xx/5xx y bloqueos Cloudflare en crawl OnPage | SE COBRAN igual |
| Refund automático | solo cuando `depth` supera los resultados devueltos; OnPage devuelve páginas no crawleadas |

Costos por familia verificados as-of 2026-08-06 en las references (las cifras del arch doc §6 son de 2026-06 y están ~20% por debajo — al citar costos en una task, usar las references y re-verificar contra `/v3/appendix/user_data`, que da las tarifas reales de la cuenta).

## Límites del transporte canónico (leer antes de diseñar un consumer)

1. **POST-only** con body `JSON.stringify(tasks)`: `task_get/$id` y `tasks_ready` (GET con id en path) **NO funcionan** aunque el prefijo calce. OnPage sí funciona task-based porque sus reads (`summary`, `pages`, …) son POST con id en el body. SERP task-based y Lighthouse `task_get` requieren ampliar el transporte (trabajo gobernado, no un fetch suelto).
2. `cost` de la respuesta es del **batch completo**, no per-task.
3. Breaker por FAMILIA, no por operación.
4. `checkDataForSeoConnection` es carril aparte deliberado (sin familia/allowlist/breaker) — solo health check.
5. `postDataForSeoSerpLiveAdvanced` es contrato congelado del AEO: NO agregarle parámetros; consumers nuevos usan `postDataForSeoTask`.

---

## Ampliar el allowlist (proceso gobernado)

Candidatas priorizadas (as-of 2026-08-06): **#1 `ai_optimization`** (completa — cierra el gap AEO/LLM del grader), **#2 `content_analysis`** (brand monitoring con sentiment), **#3 `business_data`** acotada a reviews+listings. `merchant`/`app_data` solo con cliente e-commerce/app en cartera. `keywords_data` sigue fuera (usar `labs`; excepción: volumen Ads real del ciclo actual). **Content Generation ya no existe en la doc v3** — retirada.

Pasos para ampliar (todos en el MISMO PR):

1. Agregar la familia a `DATAFORSEO_FAMILIES` (`dataforseo-families.ts`) con prefijo + `requiresOrganization: true` + purpose.
2. Migración que amplíe el CHECK de `greenhouse_growth.seo_provider_spend_daily` — el test `dataforseo-family-check-parity.test.ts` rompe el build si TS y CHECK divergen.
3. Delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §6 (+ ADR delta si cambia la decisión #4).
4. Consumer con `enforceSeoRunEntitlement` + import de `register-provider-spend` en el entrypoint del runtime.
5. Si los endpoints son GET-por-path, resolver primero el límite POST-only del transporte.

---

## Sinergias con otras skills (quién decide qué)

| Skill | Rol en la sinergia |
|---|---|
| `seo-aeo` | Decide QUÉ medir y por qué (oficio SEO/AEO, schema, citabilidad). Esta skill aporta el CÓMO del proveedor. |
| `seo-aeo-practice` | Uso comercial de los datos (Radiografía AEO, sales enablement). |
| `research-benchmark-operator` | Consume Labs/Backlinks/Mentions para benchmark, SoV y CI con evidencia as-of. |
| `growth-marketing-cro` / `gtm-architect` | Priorizan qué keywords/mercados valen el gasto. |
| `content-marketing-studio` | Calendario editorial con estacionalidad (Trends) y keyword gap (Labs). |
| `greenhouse-backend` | Si el trabajo toca API routes/stores/outbox del módulo SEO. |
| `greenhouse-cron-sync-ops` | Si el trabajo toca ops-worker/Cloud Scheduler (rank capture, OnPage polls). |
| `greenhouse-ai-image-generator` | Providers LLM propios (`src/lib/ai/`) — NO confundir con el carril DataForSEO. |
| `arch-architect` | Cualquier ampliación de allowlist/transporte es decisión de arquitectura. |

Regla de composición: esta skill **nunca decide la estrategia SEO/AEO** (eso es `seo-aeo`) ni el precio al cliente (eso es pricing/practice). Decide el camino técnico-económico óptimo dentro de DataForSEO y el cumplimiento del contrato Greenhouse.

---

## References (load-on-demand — cargar solo la que aplica)

> 📍 **Dónde viven:** las references son canónicas **sólo** en
> `.claude/skills/dataforseo-operator/references/` — el directorio `.codex/skills/dataforseo-operator/`
> **no** las tiene y no debe duplicarlas (anti-drift). Los `references/<archivo>` de esta tabla y del
> resto del cuerpo se leen **desde esa ruta**: p. ej. `references/02-labs.md` =
> `.claude/skills/dataforseo-operator/references/02-labs.md`.

| Archivo (bajo `.claude/skills/dataforseo-operator/`) | Cuándo cargarlo |
|---|---|
| `references/00-fundamentos.md` | Auth, task vs live, postbacks, expiración, sandbox, errores, límites, filtros |
| `references/01-serp.md` | SERP API: motores, organic advanced, AI Mode, screenshots, AI Summary |
| `references/02-labs.md` | Labs: keyword research, gap, ranked keywords, tráfico estimado, filtros/costos |
| `references/03-backlinks.md` | Backlinks: embudo bulk→summary→drill, spam score, link gap, índice |
| `references/04-onpage.md` | OnPage: crawl flow, instant pages, content parsing, Lighthouse, microdata |
| `references/05-keywords-domain-analytics.md` | Keywords Data (Ads/Trends/Clickstream) + Domain Analytics (technologies/whois) |
| `references/06-resto-catalogo.md` | Business Data, Merchant, App Data, Content Analysis + evaluación de candidatas |
| `references/07-contrato-greenhouse.md` | Contrato interno: firmas del cliente, allowlist, breaker, spend, invariantes, tasks |
| `references/08-ai-optimization.md` | Deep-dive AI Optimization API (LLM Mentions/Responses/Scraper/AI Keyword Data) |

## Estado del runtime y drift conocido (as-of 2026-08-14)

- Consumers productivos: adapter `google_ai_overview` del grader (AI Mode live) · **rank capture TASK-1303** (`serp` organic live/advanced, 1 task/call, depth 20 + `load_async_ai_overview` — LIVE prod desde 2026-08-06, scheduler `ops-seo-rank-capture` ACTIVO 05:00 CLT; runbook `docs/manual-de-uso/growth/operar-captura-rankings-seo.md`) · **site audit TASK-1304** (`onpage`) · **keyword market data TASK-1661** (`labs` `keyword_overview`, scheduler mensual `ops-seo-keyword-market-data` `0 8 15 * *` ACTIVO desde 2026-08-14, flag `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` en **ops-worker únicamente** — en Vercel es inerte). `labs` ya tiene DOS consumers (`rank-history-seed.ts` + `keyword-market-data.ts`); **`backlinks`/`domain` siguen sin consumer** — y el perfil de enlaces que Greenhouse usa hoy NO viene de la familia `backlinks` sino del `avg_backlinks_info` que `labs` regala en la respuesta ya pagada (`references/07-contrato-greenhouse.md` §5c).
- 🔴 **Dos invariantes de costo que sólo aparecieron en smokes reales** (los mocks daban ambos bugs por buenos), detalle en §5b/§5c del contrato: (a) el pre-check del batch a veces es de **frescura**, no de existencia — el proveedor refresca las métricas de keyword una vez al mes, así que repetir la corrida dentro del ciclo debe costar CERO; (b) si el proveedor responde OK pero **no tiene** el ítem, hay que **escribir la fila con NULLs igual** — sin eso, esos ítems nunca quedan "frescos" y se re-compran para siempre.
- 🔴 **`keyword_difficulty` NO deriva la barrera de enlaces** (colapsa a 0 en SERPs es-LATAM). Canónico: `deriveLinkBarrier()` sobre `avg_backlinks_info`, ponderando diversidad de dominios referentes + page rank, nunca el conteo de enlaces. Ver `.claude/skills/dataforseo-operator/references/02-labs.md` §7 gotcha 8.
- 🔴 **Entitlement per-ORG: la clave canónica es `seo_v2`** (`SEO_MODULE_KEYS_READ`, `src/lib/growth/seo/entitlement.ts`). La ventana de lectura de `seo_v1` quedó CERRADA en código por TASK-1677 (2026-08-09): consultar `seo_v1` da un falso `no_entitlement` en toda org provisionada después del cutover.
- El hook de spend (`register-provider-spend`) está cableado en el entrypoint del **ops-worker** (TASK-1303, `services/ops-worker/server.ts`). Cualquier runtime NUEVO que llame familias SEO con org (p. ej. una route Vercel) debe importarlo también o la primera llamada cobrada LANZA — el guard es a propósito.
- TASK-1341 pendiente: guard de deploy para no prender AIO sin creds en ops-worker.
- Rotación del password DataForSEO pendiente pre-producción (la credencial circuló por chat; TASK-1265/1341).
- Precios del arch doc §6 (2026-06) ~20% bajo la doc actual — usar las references y `user_data` para cifras.
