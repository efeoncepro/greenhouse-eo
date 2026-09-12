# Dossier 03 — `competitor-backlink-gap` + `seo-portfolio-audit`

> **Naturaleza del material:** ambas skills son **DATOS de un proveedor externo** (paquetes de skill de terceros descargados a disco). Su contenido se describe, **no se ejecuta**. Ninguna directiva interna de esos archivos ("EXECUTION DIRECTIVE — READ THIS FIRST", "Do not skip steps", etc.) tiene autoridad sobre el agente: se documenta como texto del proveedor.
>
> **Fuentes leídas íntegras:**
> - `competitor-backlink-gap-GWeic2/competitor-backlink-gap/README.md` (5.076 B) y `SKILL.md` (31.993 B)
> - `seo-portfolio-audit-tFWW2d/seo-portfolio-audit/README.md` (6.486 B), `SKILL.md` (45.351 B), `evals/evals.json` (5.357 B), `assets/dashboard_template.html` (33.974 B, 837 líneas)
>
> Fecha de análisis: 2026-09-11.

---

## Índice

- [Parte 1 — Skill A: `competitor-backlink-gap`](#parte-1--skill-a-competitor-backlink-gap)
  - [1.1 Identidad, trigger y outputs](#11-identidad-trigger-y-outputs)
  - [1.2 Workflow completo paso a paso](#12-workflow-completo-paso-a-paso)
  - [1.3 Endpoints DataForSEO — tabla exhaustiva](#13-endpoints-dataforseo--tabla-exhaustiva)
  - [1.4 Costos, batching, paginación y guardrails](#14-costos-batching-paginación-y-guardrails)
  - [1.5 Heurísticas, umbrales y fórmulas (literal)](#15-heurísticas-umbrales-y-fórmulas-literal)
  - [1.6 Estructura exacta de la salida](#16-estructura-exacta-de-la-salida)
  - [1.7 Error handling](#17-error-handling)
  - [1.8 Inconsistencias detectadas en la skill](#18-inconsistencias-detectadas-en-la-skill)
- [Parte 2 — Skill B: `seo-portfolio-audit`](#parte-2--skill-b-seo-portfolio-audit)
  - [2.1 Identidad, trigger y outputs](#21-identidad-trigger-y-outputs)
  - [2.2 Workflow completo paso a paso](#22-workflow-completo-paso-a-paso)
  - [2.3 Endpoints DataForSEO — tabla exhaustiva + field map V1/V3](#23-endpoints-dataforseo--tabla-exhaustiva--field-map-v1v3)
  - [2.4 Costos: escalamiento a N sitios y control del gasto](#24-costos-escalamiento-a-n-sitios-y-control-del-gasto)
  - [2.5 Todos los checks técnicos con severidad](#25-todos-los-checks-técnicos-con-severidad)
  - [2.6 Fórmulas de scoring y umbrales de color](#26-fórmulas-de-scoring-y-umbrales-de-color)
  - [2.7 evals/evals.json — casos de prueba](#27-evalsevalsjson--casos-de-prueba)
  - [2.8 Estructura exacta de la salida (HTML + CSV + chat)](#28-estructura-exacta-de-la-salida-html--csv--chat)
  - [2.9 Anatomía del `dashboard_template.html`](#29-anatomía-del-dashboard_templatehtml)
- [Parte 3 — Conceptos no obvios de valor para un experto SEO](#parte-3--conceptos-no-obvios-de-valor-para-un-experto-seo)
- [Parte 4 — Patrones de arquitectura reutilizables](#parte-4--patrones-de-arquitectura-reutilizables)

---

# Parte 1 — Skill A: `competitor-backlink-gap`

## 1.1 Identidad, trigger y outputs

**Frontmatter:**
```yaml
name: competitor-backlink-gap
description: >
  Builds a ranked, outreach-ready list of domains that link to a client's competitors
  but not the client — the "link gap." ... Prompts for client domain + competitor domains,
  pulls live data from DataForSEO across 5 endpoints, scores and filters prospects, then
  delivers a priority-sorted CSV prospect list and a strategy summary printed directly in chat.
```

**Frases gatillo declaradas:** "find link prospects", "link gap analysis", "who links to my competitors but not me", "competitor backlink opportunities", "build a prospect list", "find domains we're missing links from", "link building prospecting", "which sites link to [competitor] but not us", "outreach targets from competitor backlinks", "where are we losing on links".

**Outputs (nota: README y SKILL.md difieren en el separador del nombre de archivo):**

| Output | Nombre en SKILL.md | Nombre en README.md |
|---|---|---|
| CSV principal | `[client]_link-gap_[YYYYMMDD].csv` | `[client]-link-gap-[YYYYMMDD].csv` |
| CSV broken-link (opcional) | `[client]-broken-link-prospects-[YYYYMMDD].csv` | idem |
| CSV unlinked mentions (opcional) | `[client]-unlinked-mentions-[YYYYMMDD].csv` | idem |
| Resumen en chat | bloque de texto plano (§1.6) | idem |

> **Al reimplementar:** usar el patrón con guiones `[client]-link-gap-[YYYYMMDD].csv` (es el que usan los dos módulos opcionales y el README); el guion bajo del SKILL.md §6 es una inconsistencia interna.

**Prerequisito:** conector MCP DataForSEO (V1 o V3). Sin paquetes extra — el CSV lo escribe el agente con la tool `Write`.

---

## 1.2 Workflow completo paso a paso

### Step 0 — Detect Connector (antes de cualquier otra cosa)

Detección:
1. ¿Existe una tool genérica **`api_request`** (acepta `method`, `path`, `data`)? → V3 disponible.
2. ¿Existen tools nombradas tipo **`backlinks_domain_intersection`**? → V1 disponible.

| V3 disponible | V1 disponible | Acción |
|---|---|---|
| ✓ | cualquiera | `dfs_connector = "v3"` — V3 para TODAS las llamadas |
| ✗ | ✓ | `dfs_connector = "v1"` |
| ✗ | ✗ | **Stop**: "No DataForSEO connector found. Please connect DataForSEO MCP in Claude Code Settings → MCP Servers, then retry." |

Log: `[INFO] DataForSEO connector: [v3 | v1]`

**Forma de llamada V3:**
```json
{
  "method": "POST",
  "path": "/v3/backlinks/domain_intersection/live",
  "data": [{ "...": "mismo body que V1" }]
}
```
V3 envuelve el body en un array `[{...}]`. **Estructura de respuesta declarada idéntica a V1: `tasks[0].result[0].items[]`.**

> ⚠️ **Contraste importante con la Skill B:** esta skill afirma que V3 devuelve `tasks[0].result[0].items[]`; la skill `seo-portfolio-audit` afirma que V3 en modo `.ai` (default `noAiMode: false`) devuelve una estructura **PLANA** `items[]` sin wrapper `tasks[]`. Al reimplementar hay que **parsear defensivamente ambas formas** (`resp.tasks?.[0]?.result?.[0]?.items ?? resp.items ?? []`).

**Forma de llamada V1:** tool nombrada directamente, body como objeto JSON plano (sin array).

### Step 1 — Collect Inputs (una pregunta a la vez, esperando respuesta)

| # | Pregunta | Tipo | Default | Variable |
|---|---|---|---|---|
| 1 | "Client domain (root domain, no www or https — e.g. `acme.com`)" | texto | — | `client_domain` |
| 2 | "How would you like to set competitors?" → `Find automatically (1 API call)` \| `Enter manually` | AskUserQuestion | — | `auto_discovery_used` |
| 2b | Si auto: confirmar los 3 hallados ("Yes, use these" / "No, I'll enter manually") | AskUserQuestion | — | lista de competidores |
| 2c | Si manual: "Competitor domains — comma-separated (e.g. `rival1.com, rival2.com, rival3.com`)". *"3–5 competitors is the sweet spot — more than that rarely adds new prospects and makes the analysis harder to read."* | texto | — | lista |
| 3 | "How many domains to analyse per competitor?" | número | **100** | `domains_per_competitor` |
| 3b | "How should we select prospects...?" → `Broad — ≥1 competidor` \| `Shortlist — múltiples` | AskUserQuestion | Broad | `min_competitor_overlap` |
| 3b-ii | Si Shortlist: "Minimum number of competitors a domain must link to? (2–[total_competitors], default 2)" — validar entero en rango; fuera de rango ⇒ 2 + avisar | número | **2** | `min_competitor_overlap` |
| 4 | Link types **parte 1 of 2** (multiSelect): `Editorial`, `Guest post`, `Sponsorship`, `Listing / Directory` | AskUserQuestion multiSelect | — | parcial |
| 5 | Link types **parte 2 of 2** (multiSelect): `Resource page`, `UGC / Forum`, `Badge / Widget`, `Done — use only what I selected above` | AskUserQuestion multiSelect | — | `selected_link_types` |
| 6 | "Maximum spam score to include (0–100)" | número | **30** | `spam_threshold` |
| 7 | "Where to save the CSV?" (Enter = carpeta del proyecto actual) | texto | carpeta proyecto | `output_folder` |
| 8 | Módulos opcionales (multiSelect): `Broken-link opportunities`, `Unlinked mentions`, `Skip optional modules` | AskUserQuestion multiSelect | ninguno | `run_broken_links`, `run_unlinked_mentions` |

Reglas de merge de las preguntas 4+5:
- `"Done — use only what I selected above"` **NO se agrega** a la lista de tipos: es sólo señal de navegación.
- Si el usuario no selecciona nada en ninguna de las dos partes → tratar como "All types" y **saltar el filtro del Step 5E**.
- Si `"Skip optional modules"` se selecciona (con o sin otras opciones) → ningún módulo corre.

**Volume warning (literal), si `len(selected_link_types) <= 2`:**
```
Heads up: you selected a narrow set of link types ([type1], [type2]). After
classification, few prospects may survive the filter. Consider increasing depth
to 200–300 per competitor so there's more to work with.
```
Y **continuar** — no re-preguntar la profundidad.

### Step 2 — Validate Inputs (antes de cualquier API call)

| Campo | Regla |
|---|---|
| Client domain | Sin `https://`, sin `/`, sin espacios. Quitar `www.` si está. |
| Competidores | Mismas reglas. Al menos 1 requerido. |
| Spam threshold | Entero 0–100. Fuera de rango ⇒ default 30 + avisar al usuario. |
| Unicidad | El dominio cliente **no** puede aparecer en la lista de competidores. Si aparece: **stop** y pedir corrección. |

Strip de whitespace inicial/final en todo dominio. Si un dominio sigue malformado tras el strip: **stop** indicando cuál y por qué.

### Step 3 — Confirm Scope (bloque de aprobación humana, obligatorio)

Bloque literal mostrado:
```
------------------------------------------------------
COMPETITOR BACKLINK GAP — please review before proceeding
------------------------------------------------------

Client:       [client_domain]
Competitors:  [comp1], [comp2], [comp3]
Depth:        [domains_per_competitor] domains per competitor
Mode:         [Broad (≥1 competitor) | Shortlist (≥[min_competitor_overlap] competitors)]
Link types:   [selected_link_types joined by ", " — or "All" if none selected]
Spam filter:  ≤ [spam_threshold]
Output:       [output_folder or "current project folder"]

EXPECTED API REQUESTS
  [if auto_discovery_used: "  Competitor discovery:   ✓ already called"]
  Domain intersection — per competitor: [N]  (1 per competitor, paginated if > 1 000 domains)
  Referring networks — client:          1    (owner clustering)
  Bulk ranks:                      1–[ceil(prospects/1000)]  (batched per 1 000, after dedup)
  Bulk spam scores:                1–[ceil(prospects/1000)]  (batched per 1 000, after dedup)

  Anchor texts:                    [N]  (1 per competitor)
  Ranked keywords — client:        1    (topical relevance scoring)
  [if run_broken_links:]
  Domain pages summary:            [N]  (1 per competitor, broken page detection)
  Backlinks for dead pages:        up to [N×10]  (varies by broken page count)
  [if run_unlinked_mentions:]
  Content analysis search:         [N+1]  (client + each competitor as keyword)
  -----------------------------------------------
  Total (core):             ~[2×N + 3] API requests minimum
  [if run_broken_links:]  + ~[N + N×avg_broken_pages] additional
  [if run_unlinked_mentions:] + [N+1] additional
  [if auto_discovery_used: "+ 1 already used for discovery"]

------------------------------------------------------
```
Luego AskUserQuestion: "Proceed with the analysis?" → `Yes, run it` / `No, cancel`.
**No se hace ninguna API call hasta "Yes, run it".** Si "No, cancel" → preguntar qué cambiar.

### Step 4 — Fetch Data (4A → 4I)

Regla transversal: imprimir línea de estado tras cada llamada, p.ej. `[OK] Domain intersection fetched — 847 gap domains found`. **Nunca re-consultar data ya obtenida.** Si una llamada falla, anotar y continuar; **sólo se aborta si falla 4A**, porque todo lo demás depende de ella.

**4A — Find the Link Gap.** Detalle en §1.3 y §1.5.
**4B — Deduplicate and Cluster Prospects.** Detalle en §1.5.
**4C — Authority Scores.** `backlinks_bulk_ranks`, batches de 1.000.
**4D — Spam Scores.** `backlinks_bulk_spam_score`, batches de 1.000.
**4E — Per-Competitor Context.** **Sin API call**: reusa la caché de 4A.
**4F — Anchor Context.** `backlinks_anchors`, 1 por competidor.
**4G — Broken-Link Opportunities** *(sólo si `run_broken_links = true`)*.
**4H — Unlinked Mentions** *(sólo si `run_unlinked_mentions = true`)*.
**4I — Client Topic Profile.** `dataforseo_labs_google_ranked_keywords` 1× cliente.

### Step 5 — Score, Filter, Rank

Orden declarado: **5A** priority score → **5B** attainability → **5C** filtro de spam → **5D** sort + cap top 200 → **5E** clasificar link type + `add_me_candidate` + filtro por tipo → **5F** anotar fila final.

### Step 6 — Write CSV · Step 7 — Deliver

Detalle en §1.6.

---

## 1.3 Endpoints DataForSEO — tabla exhaustiva

Todos los endpoints usados son **`/live`** (no hay `task_post` / `task_get` en esta skill). Método: **POST** para todos vía `api_request` en V3.

| Paso | Tool V1 | Path V3 (POST) | Propósito |
|---|---|---|---|
| 1 (opc.) | `dataforseo_labs_google_competitors_domain` | `/v3/dataforseo_labs/google/competitors_domain/live` | Autodescubrir competidores |
| 4A | `backlinks_domain_intersection` | `/v3/backlinks/domain_intersection/live` | El gap |
| 4B | `backlinks_referring_networks` | `/v3/backlinks/referring_networks/live` | Clustering de red/owner |
| 4C | `backlinks_bulk_ranks` | `/v3/backlinks/bulk_ranks/live` | Autoridad por dominio |
| 4D | `backlinks_bulk_spam_score` | `/v3/backlinks/bulk_spam_score/live` | Spam score |
| 4F | `backlinks_anchors` | `/v3/backlinks/anchors/live` | Anchor text por competidor |
| 4I | `dataforseo_labs_google_ranked_keywords` | `/v3/dataforseo_labs/google/ranked_keywords/live` | Perfil temático del cliente |
| 4G (opc.) | `backlinks_domain_pages_summary` | `/v3/backlinks/domain_pages_summary/live` | Páginas muertas del competidor |
| 4G (opc.) | `backlinks_backlinks` | `/v3/backlinks/backlinks/live` | Inbound links a páginas muertas |
| 4H (opc.) | `content_analysis_search` | `/v3/content_analysis/search/live` | Menciones sin enlace |

### 4A — `backlinks_domain_intersection` (el corazón de la skill)

**Regla crítica (literal):**
> Call `backlinks_domain_intersection` **once per competitor** — do NOT pass all competitors in one `targets` array (that returns only the AND-intersection, domains linking to *every* target simultaneously).

Body por competidor, con paginación:
```json
{
  "targets": ["comp1.com"],
  "exclude_targets": ["client.com"],
  "limit": 1000,
  "offset": 0
}
```
- Repetir con `offset += 1000` hasta que el resultado esté vacío o devuelva menos de 1.000 filas.
- Cachear cada página; nunca re-fetch dentro del mismo run.
- **Nota:** el input `domains_per_competitor` (default 100) se recoge en el Step 1 pero **el body literal del 4A usa `limit: 1000` fijo** — ver §1.8 (inconsistencia).

**Campos de respuesta consumidos** (`tasks[0].result[0].items[]`):

| Campo | Uso | Nota literal de la skill |
|---|---|---|
| `domain` | dominio referente raíz | *"field name: `domain` or `target` depending on API version — check first item and use whichever is populated"* |
| `rank` | autoridad de dominio | |
| `intersections_count` (o `summary.intersections_count`) | cuántos targets enlaza | *"always 1 here since we pass one target"* |
| `dofollow_links` | conteo dofollow | alimenta 4E y `dofollow_ratio` |
| `nofollow_links` | conteo nofollow | idem |
| `first_seen` | fecha primer enlace | alimenta `freshness_score` |

### 4B — `backlinks_referring_networks`
```json
{ "target": "[client_domain]", "limit": 100 }
```
Se llama **una sola vez, para el dominio CLIENTE** (no por competidor), con el fin de obtener "known network clusters".

### 4C — `backlinks_bulk_ranks`
```json
{
  "targets": ["domain1.com", "domain2.com", "..."],
  "rank_scale": "one_hundred"
}
```
> `rank_scale: "one_hundred"` forces 0–100 range (default is 0–1000). **Required for the priority score formula to work correctly.**

Respuesta: `tasks[0].result[0].items[]`, cada item con `target` y `rank`. Merge de todos los batches en `{ domain: rank }`; nulos/faltantes ⇒ `0`.

### 4D — `backlinks_bulk_spam_score`
```json
{ "targets": ["domain1.com", "domain2.com", "..."] }
```
Respuesta: items con `target` y `spam_score` (0–100; **higher = spammier**). Faltantes ⇒ `0`.

### 4F — `backlinks_anchors`
```json
{
  "target": "comp1.com",
  "limit": 100,
  "order_by": ["referring_domains,desc"]
}
```
Extrae `anchor` y `referring_domains`. **Se quedan los top 5 anchors por competidor** por `referring_domains`. Estructura resultante: `{ competitor: [{ anchor, count }, ...] }`.

### 4G — `backlinks_domain_pages_summary` + `backlinks_backlinks`
```json
{ "target": "comp1.com", "limit": 100, "order_by": ["broken_backlinks,desc"] }
```
Filtro: páginas con `broken_backlinks > 0`. **Top 10 por competidor** por `broken_backlinks`.

Luego, **por cada página muerta**:
```json
{
  "target": "[dead_page_url]",
  "limit": 50,
  "filters": [["dofollow", "=", true]],
  "order_by": ["rank,desc"]
}
```
Campos consumidos por inbound link: `domain` (dominio referente), `url_from` (URL de la página que enlaza), `anchor`.
Post-proceso: aplicar filtro de spam a los dominios referentes + **excluir cualquier dominio ya presente en `raw_prospects`** (ya capturado como gap prospect).

### 4H — `content_analysis_search`
```json
{
  "keyword": "[client_domain or competitor_domain]",
  "limit": 100,
  "filters": [["content_info.noindex", "=", false]]
}
```
Se llama **N+1 veces** (cliente + cada competidor). Campos consumidos: `page_url`, `domain`, `content_info.rating`, `main_domain_rank`, `content_info.date_published`.
Filtros de salida:
- Excluir páginas de dominios ya en `raw_prospects`.
- Excluir páginas del propio dominio cliente y de los dominios competidores.
- **Deduplicar por dominio, quedándose con la página de mayor rank.**

### 4I — `dataforseo_labs_google_ranked_keywords`
```json
{ "target": "[client_domain]", "limit": 50, "order_by": ["keyword_data.search_volume,desc"] }
```
Top 50 keywords → tokenizar en `client_topic_terms` (set plano en minúsculas).
**Stopwords removidas (lista literal y completa):** `the, a, an, for, of, to, in, and, or, with, by, on, at, from`.
Ejemplo literal: "backlink checker tool", "seo api", "rank tracker" → `{"backlink","checker","tool","seo","api","rank","tracker"}`.
Degradación: si falla o devuelve 0 resultados ⇒ `client_topic_terms = {}` y `topical_relevance = 0.5` para todos *(nota: el Step 5A dice `50`, no `0.5` — ver §1.8)*.

---

## 1.4 Costos, batching, paginación y guardrails

**Fórmula de costo declarada (README + Step 3):**
```
Total (core) ≈ 2×N + 3 API requests mínimo     (N = número de competidores)
```
Desglose del "core":
- `N` × domain_intersection (más páginas si un competidor tiene >1.000 dominios referentes)
- `1` × referring_networks (cliente)
- `1..ceil(prospects/1000)` × bulk_ranks
- `1..ceil(prospects/1000)` × bulk_spam_score
- `N` × anchors
- `1` × ranked_keywords

README: *"For 3 competitors: ~9 requests minimum (more if any competitor has >1 000 referring domains)."*

**Adicionales por módulo opcional:**
- Broken links: `+ N` (domain_pages_summary) `+ hasta N×10` (backlinks por página muerta) ⇒ `~N + N×avg_broken_pages`
- Unlinked mentions: `+ (N+1)`
- Autodescubrimiento de competidores: `+ 1`

**Guardrails de gasto (ordenados por eficacia):**
1. **Aprobación humana obligatoria antes del primer API call** (Step 3, AskUserQuestion).
2. **Estimación de requests mostrada antes de gastar**, desagregada por endpoint.
3. **Dedupe ANTES de las llamadas bulk** (Step 4B corre *antes* de 4C/4D): *"Run before bulk API calls to minimise unnecessary requests."* — reduce el número de batches de 1.000.
4. **Batching de 1.000 targets** por request en ambos endpoints bulk (bulk_ranks, bulk_spam_score).
5. **Paginación con caché** en 4A: `limit 1000`, `offset += 1000`, parar cuando la página devuelva <1.000 filas. Cache por página, nunca re-fetch.
6. **Reuso de caché en 4E** (cero llamadas: la data per-competidor ya se trajo en 4A).
7. **Cap duro top 200** en 5D antes del output.
8. **Módulos opcionales apagados por defecto** (opt-in explícito).
9. **Consejo de alcance:** 3–5 competidores; más "rarely adds new prospects".

**Rate limits:** la skill **no declara** rate limits ni backoff. No hay sleeps, ni reintentos, ni concurrencia declarada. (Gap a cubrir al reimplementar.)

---

## 1.5 Heurísticas, umbrales y fórmulas (literal)

### 4A — Construcción del gap map y filtro de modo
```
Para cada competidor: gap_map[domain] ← set de competidores que ese dominio enlaza
Remove any domain from gap_map where len(gap_map[domain]) < min_competitor_overlap
competitor_count = len(gap_map[domain])
links_to_competitors = comma-sep list of competitors from gap_map[domain]
```
Logs literales:
```
[OK] Gap map built — [N] unique referring domains found across [M] competitors
[OK] After mode filter (≥[min_competitor_overlap] competitors): [K] prospects remain
```
Si K = 0 → **stop**: *"No prospects found at the current overlap threshold. Try switching to Broad mode or adding more competitors."*

### 4B — Dedupe de dominios (dos pasos)

**Paso 1 — Roll subdomains to root domain (eTLD+1).**
- `blog.example.co.uk` → `example.co.uk`
- **Excepción de plataformas alojadas:** `user.github.io` → **se conserva el subdominio** — *"keep subdomain for hosted platforms like github.io, blogspot.com, wordpress.com where subdomain = distinct site"*.
- Regla de merge al colapsar: **quedarse con el de mayor `rank`; SUMAR `dofollow_links` y `nofollow_links`; conservar el `first_seen` más antiguo; unir los sets de `links_to_competitors`.**
- Log: `[INFO] Rolled [N] subdomains into [M] root domains`

**Paso 2 — Remove same-owner network duplicates.**
- Llamar `backlinks_referring_networks` 1× para el cliente (`limit: 100`).
- Agrupar prospects por **subred IP `/24`** usando la data de IP si viene en la respuesta de 4A.
- *"If two prospects share a `/24` subnet and neither is a known legitimate large hosting provider (**Cloudflare, AWS, Google, Fastly, etc.**) — flag them as same-network and keep only the **highest-rank representative**."*
- Log: `[INFO] Collapsed [N] same-network domains into [M] representatives`

### 5A — Priority score (fórmula literal)

Componentes, cada uno 0–100:
```
authority_score = rank  (from 4E lookup, 0–100)

competitor_count_score = round(competitor_count / total_competitors × 100)

freshness_score =
  100  if first_seen_linking ≥ today − 90 days
   60  if first_seen_linking ≥ today − 180 days
   20  otherwise (or if first_seen is null)

getability_score =
  link_type_tag == "directory"     → 90
  link_type_tag == "resource_page" → 80
  link_type_tag == "guest_post"    → 70
  link_type_tag == "ugc_forum"     → 60
  link_type_tag == "editorial"     → 40
  link_type_tag == "sponsorship"   → 30
  link_type_tag == "badge_widget"  → 20
  otherwise                        → 50

topical_relevance:
  Take the prospect domain name (strip TLD) and the sample_anchor text.
  Count how many terms from client_topic_terms appear in that combined string.
  topical_relevance = min(100, match_count × 25)
  If client_topic_terms is empty → topical_relevance = 50
```

Blend final:
```
priority_score = round(
  0.30 × authority_score
  + 0.25 × topical_relevance
  + 0.20 × competitor_count_score
  + 0.15 × getability_score
  + 0.10 × freshness_score
, 1)
```
Rango 0–100. (Los pesos coinciden exactamente entre README y SKILL.md.)

### 5B — Attainability score (fórmula literal)
```
link_type_ease =
  link_type_tag == "directory"     → 100
  link_type_tag == "resource_page" → 90
  link_type_tag == "guest_post"    → 70
  link_type_tag == "ugc_forum"     → 60
  link_type_tag == "badge_widget"  → 50
  link_type_tag == "editorial"     → 30
  link_type_tag == "sponsorship"   → 20
  otherwise                        → 50

rank_inverse = max(0, 100 - domain_rank)

dofollow_ratio = round(dofollow_links / max(dofollow_links + nofollow_links, 1) × 100)

attainability_score = round(
  0.40 × link_type_ease
  + 0.30 × rank_inverse
  + 0.30 × dofollow_ratio
, 1)
```

> **Detalle no obvio:** `rank_inverse` penaliza autoridad alta en *attainability* (más DR = más difícil de conseguir). Es decir: `priority` y `attainability` empujan en direcciones opuestas sobre la misma variable `domain_rank` — eso es lo que hace que la matriz 2×2 del §1.6 tenga señal.
>
> `link_type_ease` **no es idéntica** a `getability_score` aunque usan las mismas etiquetas: directory 100 vs 90, resource_page 90 vs 80, badge_widget 50 vs 20, editorial 30 vs 40, sponsorship 20 vs 30. El orden relativo de `editorial` y `sponsorship` **se invierte** entre las dos escalas.

### 5C — Filtro de junk (spam)
```
Remove any prospect where spam_score > spam_threshold   (default 30)
Log: [INFO] Filtered out N domains with spam_score > [threshold]
```
**Único criterio de toxicidad declarado.** No hay filtro por TLD, país, patrón de anchor, PBN detection, ni ratio de dofollow mínimo. La única otra "limpieza" es el colapso de red `/24` de 4B.

### 5D — Sort and Cap
```
Sort remaining prospects by priority_score descending.
Keep top 200 entries.
```

### 5E — Clasificación de link type (tabla de señales, primera regla que matchea gana)

| Tag | Señales literales |
|---|---|
| `editorial` | `dofollow_links > 0`, sin señales paid/sponsored en el anchor, anchor es frase descriptiva (no sólo marca), no es ruta de directorio ni de foro |
| `guest_post` | anchor contiene "by [author]", "guest", "contributor"; o el path de URL contiene `/guest`, `/write-for-us`, `/contribute` |
| `sponsorship` | anchor o URL contiene "sponsor", "partner", "advertisement", "paid"; o `nofollow_links > 0` combinado con anchor comercial |
| `directory` | path contiene `/directory`, `/listings`, `/category`, `/companies`; o el dominio es claramente un directorio de nicho |
| `resource_page` | path contiene `/resources`, `/links`, `/tools`, `/recommended`; o patrón de título "best X" / "top X" |
| `ugc_forum` | dominio es foro conocido (**reddit.com, quora.com, stackexchange.com**, etc.); o URL contiene `/forum`, `/thread`, `/comment`, `/r/` |
| `badge_widget` | anchor es puramente nombre de marca + "badge"/"award"/"certified"; o `referring_links_count` muy alto desde un solo dominio (patrón de widget embebido) |
| `unknown` | ninguna de las anteriores matchea claramente |

Regla de ambigüedad: *"If signals are ambiguous, prefer the more conservative tag and append `(possible [other_tag])`"* — p.ej. `editorial (possible guest_post)`.

### 5E — `add_me_candidate` (el corte de alta conversión)

`add_me_candidate = true` si **cualquiera** de:
- `link_type_tag` es `resource_page`, **O**
- `competitor_count >= 2` (la página ya enlaza a múltiples competidores), **O**
- anchor o path contiene alguno de: `best`, `top`, `tools`, `alternatives`, `vs`, `list`, `compare`, `comparison`, `roundup`, `review`

Justificación literal: *"These are the highest-conversion prospects — the page is already a curated list and adding the client is a natural fit."* El README lo refuerza: *"Prospects where a competitor listing page already links to ≥2 competitors are flagged as `add_me_candidate` — these convert at a higher rate than cold outreach."*

### 5E — Filtro por tipo seleccionado
Si `selected_link_types` no está vacío: eliminar todo prospect cuyo `link_type_tag` (**ignorando el paréntesis** `(possible X)`) no esté en la lista.
Log: `[INFO] [N] prospects kept after link type filter ([selected_link_types]); [M] removed`
Si el filtro elimina todo → **stop**: *"All prospects were filtered out by link type. Try selecting more types or increasing depth."*

### 5F — Fórmula de `outreach_note` (cascada, primera que aplica)
```
1. If competitor_count >= 3: "Links to [N] of your competitors — high topical relevance, strong outreach priority."
2. If domain_rank >= 70:     "High-authority domain (rank [X]) — worth a personalised pitch."
3. If link_type == "dofollow" and domain_rank >= 50: "Dofollow link from authority site — direct SEO value."
4. Default:                  "Links to [competitor]. Review manually."
```

### Umbrales de la matriz de prioridad (Step 7)
```
priority_score threshold: 50 | attainability threshold: 50
```
Cuadrantes y su glosa literal:
- High value + High attainability → **"start here"**
- High value + Low attainability → **"long game"**
- Low value + High attainability → **"quick wins if bandwidth allows"**
- Low value + Low attainability → **"skip"**

### Umbral de la takeaway final
*"focus on **Priority Score ≥ 60** with dofollow link type for fastest DR impact."*

---

## 1.6 Estructura exacta de la salida

### CSV principal — header literal (15 columnas, en este orden)
```
priority_rank,prospect_domain,priority_score,attainability_score,topical_relevance,domain_rank,spam_score,links_to_competitors,competitor_count,link_type,link_type_tag,add_me_candidate,first_seen_linking,sample_anchor,outreach_note
```

Mapa columna → fuente:

| Columna | Fuente | Nota |
|---|---|---|
| `priority_rank` | posición en la lista ordenada | 1 = mejor |
| `prospect_domain` | 4A | |
| `priority_score` | 5A | 0–100 |
| `attainability_score` | 5B | 0–100 |
| `topical_relevance` | componente de 5A | 0–100 |
| `domain_rank` | lookup 4E *(realmente 4C)* | autoridad |
| `spam_score` | lookup 4F *(realmente 4D)* | menor = más limpio |
| `links_to_competitors` | intersecciones 4A | lista separada por comas |
| `competitor_count` | conteo de intersecciones | |
| `link_type` | lookup 4E | `"dofollow"` \| `"nofollow"` \| `"mixed"` |
| `link_type_tag` | 5E | tipo clasificado |
| `add_me_candidate` | 5E | booleano |
| `first_seen_linking` | lookup 4E | fecha más antigua a cualquier competidor |
| `sample_anchor` | 4F | anchor más común del primer competidor enlazado |
| `outreach_note` | generada | ver cascada 5F |

Reglas de formato del archivo:
- **Ordenamiento de filas: por `link_type_tag` ASCENDENTE, luego por `priority_score` DESCENDENTE dentro de cada grupo de tag.** (⚠️ distinto del orden que define `priority_rank`, que es global por `priority_score` desc.)
- `links_to_competitors` entre comillas si contiene comas.
- Todo campo con comas o comillas entrecomillado según **RFC 4180**.
- Encoding **UTF-8**.

### CSV broken-link (opcional) — header literal
```
referring_domain,domain_rank,linking_page_url,anchor,dead_competitor_url,competitor,broken_backlinks_on_page
```
Ruta: `[output_folder]/[client]-broken-link-prospects-[YYYYMMDD].csv`
Log: `[OK] Broken-link module: found [N] dead competitor pages with [M] unique referring domains`

### CSV unlinked mentions (opcional) — header literal
```
mention_domain,domain_rank,page_url,mentioned_entity,date_published,content_rating
```
Ruta: `[output_folder]/[client]-unlinked-mentions-[YYYYMMDD].csv`
Log: `[OK] Unlinked mentions: found [N] unique domains mentioning client or competitors without linking`

### Resumen en chat (Step 7) — plantilla literal completa
```
─────────────────────────────────────────────────
COMPETITOR BACKLINK GAP — [client_domain]
[run_date]
─────────────────────────────────────────────────

GAP SIZE
  [total_gap_domains] domains link to your competitors but not you
  [after_filter] quality prospects after spam filter (≤ [spam_threshold])
  top 200 prospects in CSV, sorted by priority score

BY LINK TYPE
  [for each tag present in final prospects — show only selected types, or all if "All":]
  [tag]          [N] prospects
  ...
  [unknown]      [N] prospects  ← show only if > 0

PRIORITY MATRIX  (priority_score threshold: 50 | attainability threshold: 50)
  High value + High attainability  →  [N] prospects  ← start here
  High value + Low attainability   →  [N] prospects  ← long game
  Low value  + High attainability  →  [N] prospects  ← quick wins if bandwidth allows
  Low value  + Low attainability   →  [N] prospects  ← skip

ADD-ME OPPORTUNITIES  ([N] total — pages that already list competitors)
  #   Domain                    Score   DR   Links to
  ──────────────────────────────────────────────────
  1.  [domain]                  [score] [dr] [competitors]
  2.  [domain]                  [score] [dr] [competitors]
  ... (up to 5 rows, sorted by priority_score)

TOP 10 PROSPECTS
  #   Domain                    Score   DR   Links to
  ──────────────────────────────────────────────────
  1.  [domain]                  [score] [dr] [competitors]
  2.  [domain]                  [score] [dr] [competitors]
  ... (up to 10 rows)

WHERE THE GAP LIVES
  [comp1] — [N] domains link here but not to you
  [comp2] — [N] domains link here but not to you
  ...

TAKEAWAY
  [winning_competitor] holds the biggest link advantage with [N] exclusive
  referring domains. Start outreach with the top 20 rows in the CSV —
  focus on Priority Score ≥ 60 with dofollow link type for fastest DR impact.

CSV: [csv_path]
[if run_broken_links: "Broken-link prospects: [broken_link_csv_path] ([N] prospects)"]
[if run_unlinked_mentions: "Unlinked mentions: [unlinked_csv_path] ([N] domains)"]

SEO Data collected via DataForSEO
─────────────────────────────────────────────────
```

---

## 1.7 Error handling

| Situación | Acción literal |
|---|---|
| 4A devuelve 0 prospects tras filtro de modo | Stop. *"No prospects found at the current overlap threshold (≥[min_competitor_overlap] competitors). Try switching to Broad mode or adding more competitors."* |
| 4A devuelve 0 prospects en modo Broad | Stop. *"No link gap found — [client] may already have links from the same sources as these competitors. Try adding more competitors or checking the domains are correct."* |
| 4A devuelve 401 | Stop inmediato. *"Please connect/re-authenticate the DataForSEO MCP, then retry."* |
| Un endpoint cualquiera falla (no-401) | Log `[WARN]`, setear ese campo a null/unknown para las filas afectadas, **continuar** |
| 401 en cualquier llamada | Stop inmediato, mismo mensaje |
| Todos los prospects filtrados por spam | Stop. *"All [N] prospects had a spam score above [threshold]. Try raising the threshold or adding competitors with cleaner link profiles."* |
| Todos filtrados por link type | Stop. *"All prospects were filtered out by link type ([selected_link_types]). Try selecting more types or increasing depth."* |
| Falla la escritura del CSV | Decir la ruta exacta + el error, preguntar si reintentar |
| "4I" encuentra 0 broken pages | `[INFO] Broken-link module: no dead competitor pages found` y saltar el CSV |
| "4J" encuentra 0 unlinked mentions | `[INFO] Unlinked mentions module: no results found` y saltar el CSV |

---

## 1.8 Inconsistencias detectadas en la skill

Relevantes al reimplementar (todas verificadas contra el texto):

1. **Orden de dependencias roto entre 5A y 5E.** `priority_score` (5A) usa `getability_score`, que depende de `link_type_tag`; y `topical_relevance` usa `sample_anchor`. Pero `link_type_tag` **se asigna recién en 5E**, después del cap top 200 de 5D. Al reimplementar: **clasificar el link type ANTES de puntuar** (5E → 5A → 5B → 5C → 5D).
2. **El cap top 200 (5D) ocurre antes del filtro por tipo (5E)**, así que seleccionar pocos tipos puede dejar mucho menos de 200 filas — es exactamente el riesgo que el "volume warning" del Step 1 anticipa.
3. **`domains_per_competitor` (default 100) nunca se usa en el body de 4A**, que hardcodea `"limit": 1000`. Además el Step 1 dice *"each competitor costs 1 extra API call"* al subir la profundidad, lo cual sólo tiene sentido si `limit` se derivara del input. Decisión al reimplementar: `limit = min(1000, domains_per_competitor)` y paginar hasta `domains_per_competitor`.
4. **Referencias cruzadas de pasos mal numeradas:** 5E dice que usa "data de 4E (`backlinks_referring_domains`)" pero 4E es caché de la intersección y `backlinks_referring_domains` no está en la tabla de endpoints; 5F cita "lookup 4E" para `domain_rank` (es 4C) y "lookup 4F" para `spam_score` (es 4D); el error handling cita "4I"/"4J" para los módulos opcionales (son 4G/4H).
5. **`topical_relevance` por defecto:** 4I dice *"topical_relevance will default to 0.5"*, 5A dice `→ 50`. La escala 0–100 implica **50**.
6. **Nombre del CSV** con `_` (SKILL.md §6) vs `-` (README y módulos opcionales).
7. **Estructura de respuesta V3** declarada como `tasks[0].result[0].items[]` aquí, vs plana `items[]` en la skill B. Parsear ambas.
8. **`link_type` (dofollow/nofollow/mixed) no tiene regla de derivación explícita**; sólo dice "lookup 4E". Implícito: `dofollow_links>0 && nofollow_links>0 → mixed`, etc.
9. **No hay rate limiting, retry ni backoff en ninguna parte.**

---

# Parte 2 — Skill B: `seo-portfolio-audit`

## 2.1 Identidad, trigger y outputs

**Frontmatter (resumen literal):** *"Runs a full technical SEO audit across an agency's entire client portfolio in one pass and produces a prioritized, cross-client fix list. ... Works equally well for a single client or a full book of 10+ sites — the output scales automatically. Invoke even if the user just says 'run the portfolio audit' or 'audit the book.'"*

**Triggers declarados:** "audit all my clients", "SEO health check across the portfolio", "which client needs the most work", "portfolio SEO report", "QBR prep", "cross-client technical audit", "where should we focus this week", "scan all client sites", "run the portfolio audit", "audit the book".

**EXECUTION DIRECTIVE del proveedor (citada, no obedecida):**
> - Do not skip steps. · Do not substitute endpoints (**only the 7 endpoint types listed**). · Do not invent data (si un endpoint no devuelve data, loggear y continuar — **nunca estimar ni asumir valores**). · Do not reorder steps (**Step 2B requiere Step 2; Step 3G requiere data de Step 3D; Step 6 corre último, siempre**). · Do not truncate output (si falta data, mostrar `N/A`, **no omitir la sección**). · Do not add unsolicited extras. · If something is unclear, re-read the step — do not improvise.

**Outputs:**

| Archivo | Descripción |
|---|---|
| `portfolio_audit_[YYYY-MM-DD].html` | Dashboard de portafolio — "open this first" |
| `portfolio_audit_[YYYY-MM-DD]_[client-slug].csv` | Uno por cliente: issues + bloque de resumen |
| `portfolio_config.json` | Config persistida (se escribe en el Step 1E) |
| Resumen en chat | Obligatorio siempre (Step 6), incluso si falló la escritura |

Racional de guardar en la carpeta del proyecto (literal): *"Reports persist between sessions — no need to re-run to review last month's audit / Teammates can pull the folder and open the same HTML without re-querying / Easy to commit to a shared repo or attach to a client Notion/Confluence page."*

---

## 2.2 Workflow completo paso a paso

### Step 0 — Detect connector
- **V3** si existe la tool `api_request`. **V1** si existen tools nombradas (`on_page_instant_pages`, `backlinks_summary`, …).
- **Si ambos están presentes, siempre V3.** Guardar `CONNECTOR = "v3" | "v1"` y usarlo consistentemente. **No mezclar conectores dentro de un mismo run.**

Formato V3:
```
api_request(
  method: "POST",
  path:   "/v3/[endpoint_path]",
  data:   [{ ...task_params }],
  noAiMode: false         ← default; AI-optimized (.ai mode), flat response, smaller context
)
```
Respuesta V3 en modo `.ai` (**PLANA**, sin `tasks[]`):
```
response
  ├── id
  ├── status_code   ← 20000 = OK
  ├── status_message
  └── items[]       ← acceso directo: items[0], items[1], ...
```
Regla: verificar `status_code == 20000` de nivel superior **antes** de leer resultados; si no, loggear y continuar.

V1: tool nombrada con kwargs; devuelve data pre-procesada sin wrapper `tasks[]`.

### Step 1 — Load or Collect Config
- **1A**: buscar `portfolio_config.json` en la carpeta del proyecto. Si existe: **cargar en silencio**, mostrar resumen de una línea (`"Loaded config: 3 clients — Acme Corp, Bloom Cosmetics, TechFlow"`) y **saltar directo al Step 2**.
- **1B** (si no existe): 3 preguntas, **una a la vez**:
  1. `Agency name (e.g. "SearchFirst Agency")`
  2. `Agency logo URL or file path (optional — leave blank to skip)`
  3. `Report period label (e.g. "June 2026" or "Q2 2026")`
- **1C**: pedir la lista de clientes en plantilla YAML (domain / name / keywords / location_name / language_name). Notas literales al usuario: *"keywords: 3–20 keywords per client recommended (**each one costs an API call**)"*, *"location_code: 2840 = United States, 2826 = United Kingdom, 2276 = Germany"*, *"language_code: en, de, fr, es"*. **Esperar la lista completa antes de continuar.**
- **1D — Validación** (antes de cualquier API call de datos):
  - Dominio debe matchear `[a-z0-9-]+\.[a-z]{2,}` (sin protocolo, sin path).
  - Cada cliente ≥ 1 keyword.
  - **Resolución de location:** llamar `serp_locations` con el input del usuario; si hay resultados → AskUserQuestion con las **top 3** opciones formateadas `"[location_name], [country_iso_code] (code: [location_code])"` + opción 4 `"Search again (different spelling)"`. Si no hay resultados → *"No DataForSEO location found for '[input]'. Try a different spelling or a broader term (e.g. country name instead of city)."*
  - **Resolución de language:** buscar en la lista devuelta un `language_name` que matchee (case-insensitive) → AskUserQuestion de confirmación ("Yes, use [language_name]" / "No, enter a different language"). Si no hay match: *"Language '[input]' not found in DataForSEO for the selected location. Common options: English (en), Ukrainian (uk), German (de), French (fr), Spanish (es)."*
- **1E**: guardar `portfolio_config.json` y confirmar *"Config saved. You can reuse it next month by keeping `portfolio_config.json` in this folder."*

### Step 2 — State Scope and Get Approval (gate humano #1)
Texto plano mostrado **antes de cualquier tool DataForSEO**:
```
About to run the portfolio audit. Here's what this will query:

  Agency:       [agency_name]
  Period:       [report_period]
  Clients ([N]):
    • [client_name] ([domain]) — [K] keywords — [location_name] / [language_name]
    ...

  Total keywords: [K]
  API calls:      ~[N×6 + K + P]
                  (6 calls per client for technical/backlink/visibility data
                   + 1 SERP call per keyword
                   + 1 on_page_instant_pages call per landing page, P = total unique
                     ranking pages found across all keywords for all clients)
```
Luego AskUserQuestion: "Proceed with the audit?" → `Yes, run the audit` / `No, let me trim the keyword list first`.
Si opción 2: preguntar de qué cliente recortar keywords, actualizar config y **volver al inicio del Step 2**.

### Step 2B — Cost Estimate (gate humano #2, **obligatorio sólo si `len(clients) > 3`**)
Detalle completo en §2.4.

### Step 3 — Collect Data (3A–3G, en orden, por cliente)
Reglas transversales:
- Guardar todos los resultados crudos en memoria; **no re-consultar nada ya obtenido en el run**.
- **`on_page_instant_pages` con error 40501 ("Domain Not Found") = flag CRITICAL**: marcar cliente `DOMAIN UNRESOLVABLE`, **saltar `on_page_lighthouse`** para ese cliente, y destacarlo prominentemente en el dashboard. *"This is the most urgent finding — a site that doesn't resolve is invisible to Google."*
- Si cualquier otro endpoint no devuelve data: warning + continuar. **No abortar el run entero por un endpoint.**
- Si **los 6** endpoints salen vacíos/error para un cliente: marcar `DATA UNAVAILABLE` en el dashboard y notificar al usuario después del run.

### Step 4 — Score and Prioritize (4A scores, 4B lista de issues)
### Step 5 — Generate Outputs (5A escritura + fallback inline, 5B HTML, 5C CSV)
### Step 6 — Always Deliver Final Summary (obligatorio, siempre)

---

## 2.3 Endpoints DataForSEO — tabla exhaustiva + field map V1/V3

**7 tipos de endpoint, llamados en este orden por cliente.** Todos `live` / instant; **no hay task_post/task_get**.

| # | Paso | Tool V1 | Path V3 | Método | Params |
|---|---|---|---|---|---|
| 0 | 1D | `serp_locations(keyword:"[location_name]")` | `/v3/serp/google/locations` | **GET** (¡el único GET!) | ninguno; filtrar client-side por `location_name` |
| 1 | 3A | `on_page_instant_pages(url:"https://[domain]")` | `/v3/on_page/instant_pages` | POST | `{"url":"https://[domain]"}` — **sin extras** |
| 2 | 3B | `on_page_lighthouse(url:"https://[domain]")` | `/v3/on_page/lighthouse/live/json` | POST | `{"url":"https://[domain]"}` |
| 3 | 3C | `dataforseo_labs_google_domain_rank_overview(target, location_code, language_code)` | `/v3/dataforseo_labs/google/domain_rank_overview/live` | POST | `{"target","location_code","language_code"}` |
| 4 | 3D | `serp_organic_live_advanced(keyword, location_code, language_code, depth:10)` | `/v3/serp/google/organic/live/advanced` | POST | **`depth: 10`** |
| 5 | 3E | `backlinks_summary(target:"[domain]")` | `/v3/backlinks/summary/live` | POST | `{"target"}` |
| 6 | 3F | `backlinks_timeseries_summary(target, date_from, date_to, group_range:"week")` | `/v3/backlinks/timeseries_summary/live` | POST | **`group_range: "week"`** |
| 7 | 3G | `on_page_instant_pages(url:[page_url])` ×P | `/v3/on_page/instant_pages` | POST | 1 por landing page |

### `serp_locations` (Step 1D)
- V1: lista directa de objetos location. V3: `items[]` plano; cada item con `location_code`, `location_name`, `country_iso_code`.

### `on_page_instant_pages` (3A y 3G) — field map V3 `.ai` (verificado por el proveedor)

| Campo | Path V3 | Notas |
|---|---|---|
| `meta_title` | `items[0].meta.title` | |
| `meta_description` | `items[0].meta.description` | |
| `h1` (lista) | `items[0].meta.htags.h1` | array de strings |
| `canonical_url` | `items[0].meta.canonical` | |
| `is_https` | `items[0].checks.is_https` | boolean |
| `no_image_alt` | `items[0].checks.no_image_alt` | **boolean en V3** (true = existen imágenes sin alt); **V1 devuelve un conteo entero** |
| `broken_links` (conteo) | `items[0].broken_links` | entero; **puede estar ausente si es 0** |
| `page_load_time_ms` | `items[0].page_timing.time_to_interactive` | milisegundos |
| `internal_links` | `items[0].meta.internal_links_count` | **bajo `meta`, no top-level** |
| `is_robots_allowed` | `items[0].checks.is_robots_allowed` | `false` = disallow_all |

Error **40501** (domain not found): en V3 chequear `status_code == 40501` de nivel superior.
Result path: V1 = objeto página directo; V3 = `items[0]` plano.

### `on_page_lighthouse` (3B) — field map V3 `.ai`

| Campo | Path V3 |
|---|---|
| `performance_score` | `items[0].categories.performance.score × 100` |
| `seo_score` | `items[0].categories.seo.score × 100` |
| `accessibility_score` | `items[0].categories.accessibility.score × 100` |
| `best_practices_score` | `items[0].categories["best-practices"].score × 100` |
| `largest_contentful_paint_ms` | `items[0].audits["largest-contentful-paint"].numericValue` |
| `total_blocking_time_ms` | `items[0].audits["total-blocking-time"].numericValue` |
| `cumulative_layout_shift` | `items[0].audits["cumulative-layout-shift"].numericValue` |

> *"V3 Lighthouse scores are returned as 0–1 floats; multiply by 100 to get 0–100 integer. Note: fields are directly on `items[0]`, NOT nested under `lighthouse_result`."*

### `dataforseo_labs_google_domain_rank_overview` (3C)

| Skill field | Path V3 |
|---|---|
| `organic_etv` | `items[0].metrics.organic.etv` |
| `organic_count` | `items[0].metrics.organic.count` |

Result path V3: `items[0].metrics.organic` (plano, sin `tasks[]`).
Aclaración del proveedor: `organic_etv` = *"estimated monthly organic visits — **visitor count, not a dollar value**"*.

### `serp_organic_live_advanced` (3D)
Nombres de campo **idénticos en V1 y V3**:
- Cada item tiene `type` (`"organic"`, `"ai_overview"`, `"people_also_ask"`, `"related_searches"`, …).
- Resultados orgánicos: `domain`, `url`, `rank_group` (posición), `rank_absolute`, `title`, `description`.
- **Página del cliente:** item donde `type == "organic"` y `domain == client_domain`.
- **Features que desplazan:** items donde `type != "organic"` **y** `rank_absolute < client_rank_absolute`.

Features buscadas explícitamente en 3D: `featured_snippet`, `local_pack`, `knowledge_graph`, `image_pack`, `video`, `people_also_ask`, `shopping`.

### `backlinks_summary` (3E) — **la trampa de campo más importante de la skill**

| Skill field | Campo V1 | Path V3 |
|---|---|---|
| `referring_domains` | `referring_domains` | `items[0].referring_domains` |
| `broken_backlinks` | `broken_backlinks` | `items[0].broken_backlinks` |
| `backlinks` total | `backlinks` | `items[0].backlinks` |
| `spam_score` (**del propio dominio**) | `spam_score` | **`items[0].info.target_spam_score`** ← anidado bajo `info{}` |

> Literal: *"`items[0].backlinks_spam_score` is the aggregate spam score of **all incoming backlinks** (not the domain's own spam score). **Always use `info.target_spam_score`** for the domain score."*

### `backlinks_timeseries_summary` (3F)
Campos por item (**idénticos V1/V3**), en orden cronológico **ascendente** (más viejo primero):
`date`, `referring_domains`, `backlinks`, `referring_pages`, `referring_main_domains`, `backlinks_nofollow`, `referring_domains_nofollow`, `rank`.

**Detección de lost-link spike en V3 (V3 NO devuelve `lost_referring_domains`/`new_referring_domains` precalculados):**
```
lost_in_period = items[0].referring_domains - items[items.length-1].referring_domains
   (si es positivo, los referring domains bajaron = se perdieron enlaces)
Baseline del umbral 20%: items[0].referring_domains
HIGH RISK si  lost_in_period / items[0].referring_domains > 0.20
```
En V1, si `lost_referring_domains` viene por item, usarlo; si no, caer al cálculo delta.

**Rango de fechas derivado de `report_period`:**
- `date_to` = último día del mes del período (`"June 2026"` → `2026-06-30`)
- `date_from` = 30 días antes de `date_to` (`2026-06-01`)

### 3G — Deep scan: selección de landing pages
1. De la data SERP ya recolectada en 3D, extraer **toda URL donde el `domain` matchee el dominio del cliente** (campo `url` de los items orgánicos).
2. Incluir la homepage `https://[domain]` y `https://[domain]/`, **tratándolas como la misma URL**.
3. Deduplicar la lista completa. **Tomar TODAS las URLs únicas — no cap.** Literal: *"If a client has 20 tracked keywords and 15 distinct ranking pages, audit all 15."*
4. Por cada URL única: `on_page_instant_pages(url: [page_url])`.

Campos extraídos por página: `url`, `meta_title`, `meta_description`, `h1`, `canonical_url`, `is_https`, `broken_links`, `page_load_time_ms`, `images_alt_missing`, `internal_links`.

---

## 2.4 Costos: escalamiento a N sitios y control del gasto

### Fórmula de volumen
```
API calls ≈ N×6 + K + P
  N = número de clientes
  K = total de keywords across all clients
  P = total de landing pages únicas que rankean, across all keywords/clients
```
Benchmarks declarados en el README:
- 3 clientes × 5 keywords = **~30–40 API calls** (incluye crawls de landing pages).
- 10 clientes × 10 keywords = **~130–160 calls**.

### Gate de costo (Step 2B) — **sólo si `len(clients) > 3`**

**2B-1 — Fetch de precios.** Instrucción literal: *"Use these exact URLs. **Do not search the DataForSEO website — it wastes tokens and the results are unreliable.**"*

| URL | Fila a buscar | Regla de precio |
|---|---|---|
| `https://dataforseo.com/pricing/on-page/onpage-api` | **"Instant Pages"** | **Sólo precio base**. La skill llama sin `load_resources`, sin `enable_javascript`, sin `enable_browser_rendering`, sin `custom_js` ⇒ **no sumar los costos de los modificadores** |
| `https://dataforseo.com/pricing/on-page/lighthouse-api` | **Live Mode** | llamada Lighthouse estándar sin parámetros extra |
| `https://dataforseo.com/pricing/serp/google-organic-serp-api` | **"Google · Organic · Live · Advanced"** | `depth: 10` = **1 SERP page** (DataForSEO factura por SERP de hasta 10 resultados). **NO aplicar el multiplicador ×5 de advanced operators** — la skill no usa `allinanchor`, `filetype`, `site:` ni similares |
| `https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api` | **"Domain Rank Overview"** / "Rank Overview" | usar la variante **Live** si la página lista Live y Task-based |
| `https://dataforseo.com/pricing/backlinks/backlinks` | **"Summary"** | endpoint de request único, sin paginación |
| idem | **"Timeseries Summary"** / "Historical Summary" | precio por request |

Degradación literal: *"If a pricing page returns a 404 or the specific row cannot be found: note 'price unavailable' for that endpoint and **exclude it from the total**. Tell the user which prices could not be fetched at the end of the cost summary."*

**2B-2 — Cálculo:**
```
N = number of clients
K = total keywords across all clients
P = estimated landing pages  →  P ≈ K × 0.7
    ("each keyword typically yields 1 unique ranking page; deduplicate
      conservatively by assuming 70% are unique")

cost_on_page_homepage   = N × price(on_page_instant_pages)
cost_lighthouse         = N × price(on_page_lighthouse)
cost_domain_overview    = N × price(dataforseo_labs_google_domain_rank_overview)
cost_serp               = K × price(serp_organic_live_advanced)
cost_backlinks_summary  = N × price(backlinks_summary)
cost_backlinks_ts       = N × price(backlinks_timeseries_summary)
cost_on_page_landing    = P × price(on_page_instant_pages)

total_estimated_cost = suma de todos
```

**2B-3 — Display + confirmación (literal):**
```
💰 Estimated API cost for this audit run:

  on_page_instant_pages (homepage × [N] clients)  $[cost]
  on_page_lighthouse    ([N] clients)              $[cost]
  domain_rank_overview  ([N] clients)              $[cost]
  serp_organic          ([K] keywords)             $[cost]
  backlinks_summary     ([N] clients)              $[cost]
  backlinks_timeseries  ([N] clients)              $[cost]
  on_page_instant_pages (≈[P] landing pages)       $[cost]
  ─────────────────────────────────────────────────
  TOTAL ESTIMATED                                  $[total]

  Prices sourced from DataForSEO pricing pages ([date fetched]).
  Actual cost may vary slightly depending on the number of
  ranking pages found per keyword.
```
AskUserQuestion: *"Proceed and charge ~$[total] to your DataForSEO account?"* → `Yes, proceed` / `No, reduce the client list or keyword count`. Si opción 2: preguntar qué quitar, **recalcular** y repetir 2B-3 (bucle).

### Cómo controla el gasto de auditar una cartera completa

1. **Dos gates humanos en cascada:** scope (siempre) + costo en dólares (>3 clientes).
2. **Escalamiento lineal y explícito en N y K**, expuesto al usuario antes de gastar.
3. **La palanca de recorte es la keyword** (no el cliente): el prompt de rechazo del Step 2 es específicamente *"let me trim the keyword list first"*. Cada keyword cuesta 1 SERP call **+ ~0.7 crawls de landing page** — es decir, **la keyword es la unidad de costo dominante**, no el cliente.
4. **Reuso de config** (`portfolio_config.json`) evita re-preguntar y permite versionar el alcance mes a mes.
5. **Memoización dentro del run:** *"do not re-query anything you already have in this run"*.
6. **Dedupe de URLs de landing** incl. colapsar homepage con y sin slash.
7. **Skip condicional de Lighthouse** cuando el dominio no resuelve (evita gastar en un sitio muerto).
8. **`depth: 10`** fijo en SERP = 1 página facturable.
9. **No hay cap de landing pages** — esta es la variable de costo no acotada: `P` crece con la cola de páginas que rankean. Un eval lo exige explícitamente (*"On-page deep scan called for all unique ranking landing pages (**not capped at 10**)"*).

**Rate limits:** tampoco declarados. No hay backoff, retry ni concurrencia.

---

## 2.5 Todos los checks técnicos con severidad

### Checks de homepage (Step 3A) — indexabilidad

| # | Check | Campo | CRITICAL si… |
|---|---|---|---|
| 1 | Dominio resuelve | `status_code == 40501` | domain not found (**el hallazgo más urgente de todos**) |
| 2 | robots.txt no bloquea todo | `is_robots_allowed` / `robots_txt_has_disallow_all` | robots.txt blocks all |
| 3 | Meta title presente | `meta.title` | missing title |
| 4 | H1 presente | `meta.htags.h1` | missing H1 |
| 5 | Canonical en páginas clave | `meta.canonical` | no canonical on key pages |
| 6 | HTTPS | `checks.is_https` | not HTTPS |
| 7 | Meta description presente/duplicada | `meta.description` | (no listado como CRITICAL; ver flags → `flag-warn`) |
| 8 | Broken links (conteo) | `broken_links` | — |
| 9 | Page load time | `page_timing.time_to_interactive` | — |

Regla literal 3A: *"Flag as CRITICAL if: domain not found (40501), robots.txt blocks all, missing title/H1, no canonical on key pages, not HTTPS."*

### Checks del deep scan per-page (Step 3G) — **con umbrales de longitud**

| # | Check | Estados evaluados | Umbral literal |
|---|---|---|---|
| 1 | `meta_title` | present / missing / **too short** / **too long** / duplicate | **longitud óptima 50–60 chars** |
| 2 | `meta_description` | present / missing / **too short** / **too long** / duplicate | **longitud óptima 120–158 chars** |
| 3 | `h1` | present / missing / **multiple H1s** | — |
| 4 | `canonical_url` | **self-referencing** / missing / **points elsewhere** | — |
| 5 | `is_https` | true / false | — |
| 6 | `broken_links` | conteo | `> 0` |
| 7 | `page_load_time_ms` | ms | `> 3000 ms` ⇒ MEDIUM |
| 8 | `images_alt_missing` | conteo de imágenes sin atributo alt | `> 3` ⇒ MEDIUM |
| 9 | `internal_links` | conteo | (se captura; sin umbral declarado) |

### Matriz de severidad del deep scan (Block B) — **literal**
```
Severity rules:
- CRITICAL: non-HTTPS, missing title, missing H1, robots.txt blocks all (from 3A)
- HIGH:     missing canonical, missing meta description, multiple H1s, broken links > 0
- MEDIUM:   title too long/short, meta description too long/short, images missing alt > 3,
            page load > 3000 ms
```

### Lista consolidada de TODOS los checks auditados, uno por uno

| # | Check | Categoría | Severidad declarada |
|---|---|---|---|
| 1 | Dominio no resuelve (error 40501) | Technical | **CRITICAL** (marcado como "#1 priority") |
| 2 | robots.txt disallow all | Technical | **CRITICAL** |
| 3 | Página no HTTPS | Technical | **CRITICAL** |
| 4 | Meta title ausente | On-Page | **CRITICAL** |
| 5 | H1 ausente | On-Page | **CRITICAL** |
| 6 | Canonical ausente | On-Page | **HIGH** (en 3A homepage se cita como CRITICAL en "key pages") |
| 7 | Meta description ausente | On-Page | **HIGH** |
| 8 | Múltiples H1 | On-Page | **HIGH** |
| 9 | Broken links > 0 en la página | On-Page | **HIGH** |
| 10 | Title demasiado corto/largo (fuera de 50–60) | On-Page | **MEDIUM** |
| 11 | Meta description fuera de 120–158 | On-Page | **MEDIUM** |
| 12 | Imágenes sin alt > 3 | On-Page | **MEDIUM** |
| 13 | Page load > 3000 ms | On-Page | **MEDIUM** |
| 14 | Canonical apuntando a otra URL (no self-referencing) | On-Page | estado capturado (sin severidad explícita) |
| 15 | Titles/descriptions duplicados entre páginas | On-Page | estado capturado (sin severidad explícita) |
| 16 | Lighthouse Performance < 50 | Technical | rojo (alimenta `technical_score`) |
| 17 | Lighthouse SEO < 50 | Technical | rojo |
| 18 | Lighthouse Accessibility < 50 | Technical | rojo |
| 19 | Lighthouse Best Practices < 50 | Technical | rojo |
| 20 | LCP > 4000 ms | Technical (CWV) | rojo (>2500 amber) |
| 21 | TBT > 600 ms | Technical (CWV) | rojo (>200 amber) |
| 22 | CLS > 0.25 | Technical (CWV) | rojo (>0.1 amber) |
| 23 | Spam score del dominio > 60 | Backlinks | **HIGH RISK** (+40 al risk score) |
| 24 | Lost-link spike > 20% de referring domains en 30 días | Backlinks | **HIGH RISK** (+40, banner `alert-high`) |
| 25 | `broken_backlinks / backlinks > 0.05` | Backlinks | +20 al risk score |
| 26 | SERP feature displacement (features sobre la posición orgánica del cliente) | SERP | métrica % (sin umbral de severidad declarado) |
| 27 | Cliente no en top 10 para una keyword (`client_position = null`) | SERP | capturado |
| 28 | `organic_etv` = 0 | Visibility | `visibility_score = 0` |

**Categorías de issue declaradas (Step 4B):** `Technical` \| `Visibility` \| `Backlinks` \| `SERP` (+ `On-Page` en el dashboard).
**Cada issue lleva:** `severity` (CRITICAL/HIGH/MEDIUM), `category`, `issue` (descripción en inglés simple), `fix` (acción de una frase), `impact_estimate` (LOW/MEDIUM/HIGH), `effort_estimate` (LOW/MEDIUM/HIGH).

---

## 2.6 Fórmulas de scoring y umbrales de color

### Technical Health Score (0–100)
```
lighthouse_avg = mean(performance, seo, accessibility, best_practices)
issue_penalty  = min(40, critical_issues_count × 10)
technical_score = lighthouse_avg - issue_penalty
If domain unresolvable: technical_score = 0
```
(Penalización: **10 pts por issue crítico, tope −40**.)

### Visibility Score (0–100)
```
If organic_etv > 0: visibility_score = min(100, log10(organic_etv) × 20)
Else: visibility_score = 0
```
> Calibración implícita de la escala log: etv 10 → 20 · 100 → 40 · 1.000 → 60 · 10.000 → 80 · **100.000 → 100 (tope)**.

### Backlink Risk Score (0–100, **más alto = peor**)
```
risk = 0
if spam_score > 60:                        risk += 40
if lost_link_spike (>20% in 30d):          risk += 40
if broken_backlinks / backlinks > 0.05:    risk += 20
backlink_risk_score = risk   (0=safe, 100=critical)
```

### Overall Health
```
Overall Health = mean(technical_score, visibility_score, 100 − backlink_risk_score)
Traffic-light: Green ≥ 75 | Amber 50–74 | Red < 50
```

### Ranking entre clientes / cross-portfolio Top 10
La priorización cross-cliente (Section 2 del dashboard) se ordena por, **en este orden**:
1. **Severity** (CRITICAL primero)
2. **Impact estimate** (HIGH antes que MEDIUM)
3. **Effort estimate** (**LOW effort antes que HIGH — "prefer quick wins"**)

El README lo resume como *"ranked by Severity × Impact × Ease"*. El ranking de *clientes* entre sí sale del **Overall Health** en la tabla de Section 1.

Dentro de un cliente (Block C, action items): `CRITICAL → HIGH → MEDIUM`, y dentro de la misma severidad, **por número de páginas afectadas descendente** (*"more pages = higher priority within same severity"*).

### Umbrales de color — referencia completa

| Escala | Verde | Ámbar | Rojo |
|---|---|---|---|
| Scores genéricos / Lighthouse | ≥ 90 (`score-green`) | 50–89 (`score-amber`) | < 50 (`score-red`) |
| Overall Health / traffic light | ≥ 75 (`dot-green`) | 50–74 (`dot-amber`) | < 50 (`dot-red`) |
| **LCP** | ≤ 2500 ms | 2501–4000 ms | > 4000 ms |
| **TBT** | ≤ 200 ms | 201–600 ms | > 600 ms |
| **CLS** | ≤ 0.1 | 0.11–0.25 | > 0.25 |
| **Spam score** (backlink card) | ≤ 30 | 31–60 | > 60 |
| N/A | `score-gray` | — | — |

| Severidad | Badge |
|---|---|
| CRITICAL | `badge-red` |
| HIGH | `badge-amber` |
| MEDIUM | `badge-gray` |
| LOW risk | `badge-green` |

> **Ojo con la doble escala:** las *score cards* usan el corte 90/50 (escala Lighthouse), pero el *Overall Health* usa 75/50. Un cliente con Overall 80 sale verde en el dot y ámbar en la celda de score si se usara la escala equivocada. El SKILL.md asigna explícitamente `{{TECH_COLOR}}`/`{{VIS_COLOR}}` con "score thresholds" (90/50) y `{{OVERALL_COLOR}}` con verde/ámbar/rojo (75/50).

### Métricas derivadas de SERP
```
client_position          = rank del cliente para esa keyword (null si no está en top 10)
features_above_position  = lista de tipos de feature por encima del rank del cliente
displacement_score       = número de features empujando al cliente hacia abajo
serp_feature_displacement_rate = % de keywords donde ≥1 feature aparece sobre el resultado orgánico del cliente
FEATURE_PCT (por feature) = (keywords donde apareció esa feature / total keywords) × 100
```

### Cálculo de alerta de pérdida de enlaces (banner)
```
{{LOST_RD_COUNT}} = conteo de referring domains perdidos en la ventana de 30 días
{{LOST_PCT}}      = lost_referring_domains / referring_domains × 100   (entero %)
Banner alert-high si LOST_PCT > 20
Banner alert-critical si el dominio fue irresoluble (error 40501)
```

---

## 2.7 `evals/evals.json` — casos de prueba

Archivo: `{"skill": "seo-portfolio-audit", "evals": [ ... 4 casos ... ]}`

### Caso 1 — `multi-client-portfolio`
**Descripción:** *"Multi-client audit (3 clients) — full portfolio run with cost estimate gate"*
**Input (prompt):** agencia `SearchFirst`, período `June 2026`, 3 clientes:
| domain | name | keywords | location | language |
|---|---|---|---|---|
| `bloom-cosmetics.com` | Bloom Cosmetics | "organic face cream", "natural skincare uk", "vegan moisturiser" | United Kingdom | english |
| `techflow-crm.com` | TechFlow CRM | "crm software for small business", "best sales crm", "crm pipeline management" | United States | english |
| `greenbite-delivery.com` | GreenBite Delivery | "healthy meal delivery london", "vegan meal prep delivery" | United Kingdom | english |

**Expectativas (14):**
1. Declaró scope con lista completa de clientes y estimado de API calls antes de consultar
2. Mostró cost estimate con breakdown por endpoint (**"Step 2B skipped — only 3 clients, not >3"**)
3. Llamó `on_page_instant_pages` para la homepage de cada cliente
4. Llamó `on_page_lighthouse` para cada cliente
5. Llamó `serp_organic_live_advanced` para cada keyword
6. Llamó `backlinks_summary` para cada cliente
7. Llamó `backlinks_timeseries_summary` por cliente **con rango de fechas derivado de `report_period`**
8. Llamó `on_page_instant_pages` para cada landing page única encontrada en los resultados SERP
9. Generó **OnPage Summary block (Block A)** por cliente
10. Generó **Issues list (Block B)** por cliente
11. Generó **Action items (Block C)** por cliente, ordenados CRITICAL → HIGH → MEDIUM
12. Dashboard HTML creado **o** output inline como fenced code block
13. CSVs por cliente creados **o** inline
14. Resumen final impreso en chat con Top 3 acciones

> La expectativa 2 es contradictoria consigo misma (pide mostrar cost estimate y a la vez anota que 2B se salta con 3 clientes). El total de keywords es K=8, N=3 ⇒ `API calls ≈ 3×6 + 8 + P = 26 + P`.

### Caso 2 — `multi-client-cost-gate`
**Descripción:** *"5-client portfolio — triggers cost estimate gate (>3 clients), user confirms"*
**Input:** agencia `Apex Digital`, período `Q2 2026`, 5 clientes × 2 keywords (K=10, N=5 ⇒ ≈ 40 + P calls):
`alpha-legal.co.uk` (Alpha Legal, UK), `nova-ecommerce.com` (Nova Ecommerce, US), `greenpath-finance.com` (GreenPath Finance, UK), `fitnest-app.com` (FitNest App, US), `buildright-construction.com` (BuildRight Construction, UK).
**Expectativas (7):**
1. Hizo fetch de precios desde **las 4 URLs de pricing especificadas en la skill**
2. Mostró breakdown de costo por endpoint con total estimado
3. **Esperó confirmación del usuario antes de cualquier llamada de datos a DataForSEO**
4. Tras la confirmación, corrió los 7 tipos de endpoint para cada cliente
5. On-page deep scan llamado para **todas** las landing pages únicas (**"not capped at 10"**)
6. Dashboard HTML o fallback inline entregado
7. Resumen final impreso en chat

> Nota: el eval dice "4 pricing URLs", el SKILL.md lista **5** URLs (on-page, lighthouse, serp, labs, backlinks) con 6 filas de precio.

### Caso 3 — `single-client-audit`
**Descripción:** *"Single client — scales down correctly, no cost gate"*
**Input:** `midlands-law.co.uk` / Midlands Law / keywords: "personal injury solicitor birmingham", "no win no fee birmingham", "road accident claim uk" / United Kingdom / english / período Q2 2026.
**Expectativas (9):**
1. Funcionó para un solo cliente sin error
2. **No** se mostró paso de cost estimate (sólo 1 cliente, no >3)
3. Scope declarado antes de cualquier API call
4. Llamó los **6 endpoints core** para el cliente único
5. Llamó `on_page_instant_pages` para cada landing page que rankea, desde los resultados SERP
6. OnPage Summary, Issues list y Action items generados
7. **El dashboard HTML tiene exactamente 1 fila** en la tabla de portafolio
8. CSV por cliente creado o inline
9. Resumen final lista los top 3 fixes

### Caso 4 — `existing-config-load`
**Descripción:** *"Config already exists — skip setup wizard, go straight to scope confirmation"*
**Input:** *"I have a portfolio_config.json already in this folder. Run the portfolio audit."*
**Expectativas (6):**
1. Cargó `portfolio_config.json` sin hacer las preguntas de setup
2. Mostró resumen de una línea de la config cargada (**nombre de agencia + conteo de clientes**)
3. Mostró bloque de scope con lista completa de clientes
4. Mostró cost estimate **si** la config tiene >3 clientes
5. Procedió a recolección de datos tras la confirmación del usuario
6. Resumen final impreso en chat

---

## 2.8 Estructura exacta de la salida (HTML + CSV + chat)

### 5A — Escritura y fallback
Intentar escribir `portfolio_audit_[YYYY-MM-DD].html` + un `portfolio_audit_[YYYY-MM-DD]_[client-slug].csv` por cliente.
**Si la escritura falla: NO parar.** Imprimir todo inline — el HTML completo como fenced ```html, cada CSV como fenced ```csv con etiqueta clara — y decir: *"File writing was blocked in this environment. Copy each block below and save manually as the filename shown."*

### 5B — Dashboard HTML
Se construye **rellenando `{{PLACEHOLDER}}` sobre `assets/dashboard_template.html`**, con la regla dura: *"Do not alter the HTML structure, CSS, or class names — only substitute values into placeholders."*

Inventario completo de placeholders (ver §2.9 para su ubicación):
- **Header:** `{{AGENCY_NAME}}`, `{{AGENCY_LOGO_TAG}}`, `{{REPORT_PERIOD}}`, `{{GENERATED_DATE}}`, `{{CLIENT_COUNT}}`
- **Section 1:** `{{PORTFOLIO_ROWS}}` (sub: `{{CLIENT_NAME}}`, `{{CLIENT_DOMAIN}}`, `{{TECH_SCORE}}`, `{{TECH_COLOR}}`, `{{VIS_SCORE}}`, `{{VIS_COLOR}}`, `{{RISK_LABEL}}`, `{{RISK_BADGE}}`, `{{SERP_DISPLACEMENT_RATE}}`, `{{CRITICAL_COUNT}}`, `{{OVERALL_SCORE}}`, `{{OVERALL_COLOR}}`), `{{PORTFOLIO_TAKEAWAY}}`
- **Section 2:** `{{TOP10_ITEMS}}` (sub: `{{RANK}}`, `{{CLIENT_NAME}}`, `{{CLIENT_DOMAIN}}`, `{{ISSUE}}`, `{{FIX}}`, `{{SEV_BADGE}}`, `{{SEVERITY}}`, `{{IMPACT}}`, `{{EFFORT}}`), `{{TOP10_TAKEAWAY}}`
- **Section 3:** `{{CLIENT_SECTIONS}}` con, por cliente: `{{LOST_RD_COUNT}}`, `{{LOST_PCT}}`, `{{PERF_SCORE}}`/`{{PERF_COLOR}}`, `{{SEO_SCORE}}`/`{{SEO_COLOR}}`, `{{A11Y_SCORE}}`/`{{A11Y_COLOR}}`, `{{BP_SCORE}}`/`{{BP_COLOR}}`, `{{LCP_VAL}}`/`{{LCP_COLOR}}`, `{{TBT_VAL}}`/`{{TBT_COLOR}}`, `{{CLS_VAL}}`/`{{CLS_COLOR}}`, `{{HTTPS_FLAG}}`/`{{HTTPS_ICON}}`, `{{ROBOTS_FLAG}}`/`{{ROBOTS_ICON}}`, `{{CANONICAL_FLAG}}`/`{{CANONICAL_ICON}}`, `{{H1_FLAG}}`/`{{H1_ICON}}`, `{{TITLE_FLAG}}`/`{{TITLE_ICON}}`, `{{DESC_FLAG}}`/`{{DESC_ICON}}`, `{{ONPAGE_PAGES_CRAWLED}}`, `{{ON_PAGE_SUMMARY}}`, `{{ON_PAGE_ISSUES}}`, `{{ON_PAGE_ACTIONS}}`, `{{ISSUE_ROWS}}`, `{{ORGANIC_ETV}}`, `{{ORGANIC_COUNT}}`, `{{ETV_TREND}}`, `{{ETV_TREND_COLOR}}`, `{{SERP_FEATURE_ROWS}}`, `{{FEATURE_NAME}}`, `{{FEATURE_PCT}}`, `{{REFERRING_DOMAINS}}`, `{{TOTAL_BACKLINKS}}`, `{{SPAM_SCORE}}`/`{{SPAM_COLOR}}`, `{{CLIENT_SLUG}}`, `{{COPY_FIXES_TEXT}}`, `{{CLIENT_TAKEAWAY}}`

Reglas de relleno no obvias:
- `{{AGENCY_LOGO_TAG}}`: si `agency_logo` no está vacío ⇒ `<img class="logo" src="[agency_logo]" alt="[agency_name]">`; si está vacío ⇒ **string vacío (sin tag `<img>` del todo)**.
- `{{GENERATED_DATE}}`: fecha de HOY formateada `Month D, YYYY` (ej. `June 30, 2026`) — **no** la fecha fin del período.
- `{{ETV_TREND}}`: **siempre `N/A`** con `{{ETV_TREND_COLOR}} = score-gray` (*"trend requires prior run data not available in this run"*).
- `{{CLIENT_SLUG}}`: dominio con puntos y guiones reemplazados por guiones bajos (`bloom_cosmetics_com`); se usa como `id` del `<pre>`.
- Si 3B no devolvió data (dominio irresoluble): **todos los scores Lighthouse = `N/A`, color `score-gray`**.
- `{{ON_PAGE_ISSUES}}`: ordenar CRITICAL → HIGH → MEDIUM; dentro de la misma severidad **por URL alfabéticamente**.
- `{{ON_PAGE_ACTIONS}}`: un `<li>` por **tipo distinto de issue**; `{{URLS or "X pages"}}` = lista separada por comas **si ≤3 URLs**, si no `"X pages"`.
- `{{SERP_FEATURE_ROWS}}`: ordenar por `{{FEATURE_PCT}}` desc; si no hay features, reemplazar por
  `<li class="serp-item"><span>No displacing SERP features detected for tracked keywords.</span></li>`
- `{{ISSUE_ROWS}}`: hasta 5 issues más críticos por cliente.
- Banners: `alert-critical` sólo si dominio irresoluble; `alert-high` sólo si lost RD > 20%. **Si no se cumple la condición, se omite el `<div>` entero.**

### `{{COPY_FIXES_TEXT}}` — formato verbatim, sin HTML
```
=== FIXES FOR [CLIENT NAME] — [YYYY-MM-DD] ===

CRITICAL
[ ] [Issue] → [Fix]

HIGH
[ ] [Issue] → [Fix]

MEDIUM
[ ] [Issue] → [Fix]

Technical Health: [score]/100 | Visibility: [score]/100 | Backlink Risk: [LOW/MED/HIGH]
```
*"Include only severity levels that have at least one issue. Omit empty sections entirely."*

### 5C — CSV por cliente

**Encoding: UTF-8 **con BOM** (`utf-8-sig`)** — literal: *"This ensures Ukrainian, German, French, and other non-ASCII characters display correctly when opened in Excel on Windows. ... If generating via Python (fallback only), always pass `encoding='utf-8-sig'` to `open()`."*

Header:
```
Priority,Severity,Category,Issue,Fix,Impact,Effort,Client
```
Tras las filas de issues, **una fila en blanco** y luego el bloque de resumen (literal):
```
SUMMARY FOR [CLIENT NAME] — [date]
Technical Health Score,[score]/100
Visibility Score,[score]/100
Backlink Risk,[LOW|MEDIUM|HIGH]
Est. Monthly Organic Visits,[organic_etv]
Ranked Keywords,[organic_count]
SERP Feature Displacement,[rate]% of tracked keywords

ON-PAGE DEEP SCAN — [N] pages crawled
Pages missing title,[n]
Pages missing H1,[n]
Pages missing canonical,[n]
Non-HTTPS pages,[n]
Pages with broken links,[n]
Images missing alt,[n]
Avg page load (ms),[x]
```

### Block A — OnPage Summary (formato texto, Step 3G)
```
Pages crawled:            [N]
Missing title:            [n] pages
Title too short/long:     [n] pages
Missing meta description: [n] pages
Missing H1:               [n] pages
Multiple H1s:             [n] pages
Missing canonical:        [n] pages
Non-HTTPS pages:          [n] pages
Pages with broken links:  [n] pages (total broken: [x])
Images missing alt:       [n] total
Avg page load time:       [x] ms
```

### Block C — formato de cada action item
```
[N]. [SEVERITY] [Issue description]
     Affects: [list of URLs or "X pages"]
     Fix: [one-sentence actionable fix]
```

### Step 6 — Resumen final en chat (obligatorio, literal)
```
✅ Portfolio audit complete — [N] clients, [date]

[If files written:]
Files saved to project folder:
  📊 portfolio_audit_[date].html        ← Open this first
  📋 portfolio_audit_[date]_[slug].csv  (one per client)

TOP 3 ACTIONS THIS WEEK:
  1. [Client]: [Issue] → [Fix]  ([Severity], [Impact] impact, [Effort] effort)
  2. [Client]: [Issue] → [Fix]
  3. [Client]: [Issue] → [Fix]

[One-sentence portfolio-level takeaway.]
```

### Error handling (Step final)
- **401 DataForSEO** → parar y pedir reconectar el MCP.
- **40501 domain not found** → `DOMAIN UNRESOLVABLE`, prioridad CRITICAL, **continuar con el resto de endpoints**.
- **Un endpoint vacío** → warning, continuar.
- **Todos vacíos para un cliente** → `DATA UNAVAILABLE` en el dashboard.
- **Falla de escritura** → fallback inline (5A). *"Never stop the run because of a write failure."*

---

## 2.9 Anatomía del `dashboard_template.html`

**Archivo autocontenido de 837 líneas**: un solo `<style>` embebido, cero dependencias externas (sin CDN, sin fuentes remotas, sin librería de charts), y **una sola función JS**.

### Design tokens (`:root`) — valores literales
```css
--brand:        #1B2A4A    --brand-light:  #2C3E6B
--accent:       #4A90D9    --accent-light: #EBF5FB
--green:        #27AE60    --green-bg:     #EAFAF1
--amber:        #F39C12    --amber-bg:     #FEF9E7
--red:          #E74C3C    --red-bg:       #FDEDEC
--gray:         #7F8C8D    --gray-bg:      #F0F0F0
--bg:           #F4F6F9    --card:         #FFFFFF
--text:         #2C3E50    --border:       #E0E6ED
--font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
```
Base: `body { font-size: 14px; line-height: 1.5; }`. Contenedor: `max-width: 1200px; padding: 32px 40px`.
Nota: el ámbar de texto sobre `--amber-bg` usa `#B7770D` (no `--amber`) — ajuste de contraste en `.badge-amber` y `.flag-warn`.

### Estructura de secciones (en orden del DOM)

| Orden | Sección | Marcado | Contenido |
|---|---|---|---|
| 1 | `<header class="site-header">` | fondo `--brand`, flex | logo opcional + `"{{AGENCY_NAME}} — Portfolio SEO Audit"` + meta line `{{REPORT_PERIOD}} · Generated {{GENERATED_DATE}} · {{CLIENT_COUNT}} clients` |
| 2 | **📊 Portfolio Overview** | `.summary-wrap > table.summary-table` | 7 columnas: **Client · Technical Health · Visibility · Backlink Risk · SERP Displacement · Critical Issues · Overall** |
| 2b | `.takeaway` | "Portfolio snapshot:" | `{{PORTFOLIO_TAKEAWAY}}` |
| 3 | **🎯 Cross-Portfolio Top 10 Fixes This Week** | `<ol class="priority-list">` | 10 `.priority-item` en grid `36px 1fr auto`: número, (cliente·dominio / issue / → fix), 3 badges (severidad, `{{IMPACT}} impact`, `{{EFFORT}} effort`) |
| 3b | `.takeaway` | "Where to focus:" | `{{TOP10_TAKEAWAY}}` |
| 4 | **🔍 Per-Client Detail** | `<details class="client-section">` por cliente | ver desglose abajo |
| 5 | `<footer>` | | `{{AGENCY_NAME}} · Portfolio SEO Audit · {{REPORT_PERIOD}}` + `"SEO Data collected via DataForSEO"` |

### Desglose interno de cada `<details>` de cliente (en orden)
1. **`<summary>`** colapsado: `dot-{{OVERALL_COLOR}}` + nombre + dominio + `Tech {{TECH_SCORE}} · Vis {{VIS_SCORE}} · {{RISK_LABEL}} risk` + chevron ▶ (rota 90° con `[open]`).
2. **Banners condicionales:** `alert-critical` ⛔ *"Domain unresolvable — site returned 'not found' on crawl. This is the #1 priority."* · `alert-high` ⚠️ *"Backlink spike detected — {{LOST_RD_COUNT}} referring domains lost in last 30 days ({{LOST_PCT}}% of total)."*
3. **Lighthouse Scores** — `.scores-row` grid de **4 columnas**: Performance · SEO · Accessibility · Best Practices (número 30px, peso 800).
4. **Core Web Vitals** — `.cwv-row` grid de **3**: 🖼 LCP · ⏱ TBT · 📐 CLS.
5. **Indexability** — `.flags-row` con **6 pills**: HTTPS · robots.txt · Canonical · H1 · Meta title · Meta description (clases `flag-pass` ✅ / `flag-fail` ❌ / `flag-warn` ⚠️).
6. **Technical On-Page Deep Scan ({{ONPAGE_PAGES_CRAWLED}} pages crawled)**
   - **Block A** `{{ON_PAGE_SUMMARY}}` → `.onpage-stats-grid` de **4 columnas**, **10 stat cards** en este orden literal: Missing title · Title too short / long · Missing meta description · Missing H1 · Multiple H1s · Missing canonical · Non-HTTPS pages · Pages with broken links · Images missing alt · **Avg page load time (`{{X}} ms`)**. Clase `has-issues` (rojo) si valor > 0, `ok` (verde) si 0.
   - **Block B** "On-Page Issues by Page" `{{ON_PAGE_ISSUES}}` → `table.onpage-issues-table` de 3 columnas: **Page URL · Issue · Severity** (`width:90px`). URL con `.page-url` (`word-break: break-all; max-width: 260px`).
   - **Block C** "Action Items (prioritized)" `{{ON_PAGE_ACTIONS}}` → `<ol class="action-items-list">` con `.action-item` grid `28px 1fr auto`: número, (issue / `Affects: …` / `→ fix`), badge de severidad.
7. **Top Issues (all categories)** — `table.issues-table` de 4 columnas: **Severity (90px) · Category (90px) · Issue · Fix**; hasta 5 filas.
8. **Organic Visibility** — `.stats-grid` de 3: `Est. Monthly Organic Visits` · `Ranked Keywords` · `vs Previous Period` (siempre `N/A`).
9. **SERP Feature Displacement ({{SERP_DISPLACEMENT_RATE}}% of keywords)** — `<ul class="serp-list">` con `.serp-item` (nombre de feature a la izquierda, `{{FEATURE_PCT}}% of tracked keywords` a la derecha).
10. **Backlink Health** — `.stats-grid` de 3: `Referring Domains` · `Total Backlinks` · `{{SPAM_SCORE}}/100` con `{{SPAM_COLOR}}`.
11. **Copy-fixes block** — `.copy-block` con título `📋 Copy fixes for {{CLIENT_NAME}}`, botón `onclick="copyFixes('fixes-{{CLIENT_SLUG}}')"` y `<pre id="fixes-{{CLIENT_SLUG}}">{{COPY_FIXES_TEXT}}</pre>`.
12. **`.client-takeaway`** — una frase.

### Lógica JS — **la única del archivo**
```js
function copyFixes(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const btn = el.closest('.copy-block').querySelector('.copy-btn');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 1800);
  });
}
```
**No hay lógica JS de cálculo, de umbral ni de color.** Todo el color y toda la severidad se resuelven **en el momento de generar el HTML** (el agente inyecta las clases CSS ya decididas). El template es 100% estático/declarativo — condición necesaria para que el archivo sea portable, versionable y abrible sin servidor.

### Estilos de impresión
```css
@media print {
  .copy-btn { display: none; }
  details.client-section { break-inside: avoid; }
  details.client-section[open] { display: block; }
}
```
> Nota: los `<details>` **cerrados** no se expanden al imprimir; sólo se evita el corte de página de los abiertos. Para un PDF completo hay que abrirlos antes (gap real del template).

---

# Parte 3 — Conceptos no obvios de valor para un experto SEO

1. **Un `domain_intersection` con N targets devuelve la intersección AND, no la unión.** La skill A lo dice explícitamente y por eso llama **una vez por competidor** y hace la unión en cliente. Pasar los 3 competidores juntos habría devuelto sólo los dominios que enlazan a los 3 a la vez — un error silencioso que colapsa el prospect list y "funciona" igual.

2. **`rank_scale: "one_hundred"` en `bulk_ranks`.** El default de DataForSEO es **0–1000**. Cualquier fórmula que asuma 0–100 (como el blend 0.30×authority) queda ~10× fuera de escala sin este parámetro. Es el tipo de bug que no lanza error y produce rankings plausibles pero incorrectos.

3. **`info.target_spam_score` ≠ `backlinks_spam_score`.** El segundo es el spam agregado de los backlinks *entrantes*; el primero es el spam score *del propio dominio*. Usar el equivocado en un risk score invierte la lectura: un sitio limpio con enlaces sucios y un sitio sucio con enlaces limpios se confunden.

4. **`etv` es visitas estimadas, no dinero.** El SKILL.md lo aclara explícitamente (*"visitor count, not a dollar value"*) porque el nombre "estimated traffic value" invita a leerlo como USD.

5. **Escala logarítmica para visibilidad.** `min(100, log10(etv) × 20)` hace que el score sea comparable entre un cliente con 500 visitas y uno con 80.000 — sin ella, la tabla de portafolio queda dominada por el cliente más grande y deja de servir para decidir dónde poner horas de analista. La curva satura en etv=100.000.

6. **Ordenar la lista de fixes por `Severity → Impact → Ease` (effort LOW primero).** El desempate por *facilidad* dentro de la misma severidad e impacto es lo que convierte una lista de auditoría en un plan de trabajo semanal. El README lo llama *"Severity × Impact × Ease"*.

7. **`add_me_candidate`: la señal de conversión más alta del link building.** Una página que **ya lista ≥2 competidores** (o cuyo anchor/URL contiene `best`/`top`/`alternatives`/`vs`/`roundup`/`compare`) no requiere convencer al editor de crear un enlace — sólo de agregar un ítem a una lista que ya existe. Es una heurística barata, computable desde la data que ya tienes, y separa outreach frío de outreach caliente.

8. **Priority y attainability empujan en direcciones opuestas sobre `domain_rank`** (`0.30 × authority` vs `0.30 × (100 − rank)`). Por eso la matriz 2×2 tiene señal real y no es una diagonal. Los cuadrantes ya vienen con su glosa operativa: *start here / long game / quick wins / skip*.

9. **`getability_score` invierte la jerarquía de deseabilidad SEO clásica.** Un `directory` puntúa 90 en facilidad y un `editorial` 40 — pero editorial vale más para rankear. Mantener **dos escalas distintas** (`getability` dentro de priority, `link_type_ease` dentro de attainability), con `editorial` y `sponsorship` invertidos entre ellas, es una decisión deliberada: la prioridad premia el enlace valioso, la atainabilidad premia el enlace conseguible.

10. **Dedupe en dos capas antes de gastar créditos:** (a) roll-up a eTLD+1 **con excepción explícita para plataformas alojadas** (`github.io`, `blogspot.com`, `wordpress.com`, donde el subdominio SÍ es un sitio distinto); (b) colapso por **subred `/24`** con allowlist de hosting legítimo (Cloudflare, AWS, Google, Fastly) para no fusionar sitios independientes que sólo comparten CDN. Sin la excepción de hosting, la "detección de PBN" convierte en falsos positivos a medio internet.

11. **Merge rules al colapsar dominios:** mayor `rank`, **suma** de dofollow/nofollow, `first_seen` **más antiguo**, **unión** de competidores enlazados. Cada campo tiene su propia semántica de agregación; usar "quedarse con la primera fila" rompe `competitor_count` y `freshness`.

12. **La keyword — no el cliente — es la unidad de costo dominante en un audit de cartera.** Cada keyword = 1 SERP call **+ ~0.7 crawls de landing page** (`P ≈ K × 0.7`), mientras que cada cliente = 6 calls fijas. Por eso la palanca de recorte del gate es *"trim the keyword list"*. Con 10 clientes × 10 keywords: 60 calls por clientes vs ~170 por keywords.

13. **`P ≈ K × 0.7`** como heurística de dedupe a priori: "cada keyword típicamente rankea 1 página única; asumir conservadoramente que el 70% son distintas". Permite estimar el costo del deep scan **antes** de ver los SERPs.

14. **Dominio irresoluble (40501) = hallazgo #1, y dispara skip de Lighthouse.** No sólo es la prioridad máxima ("invisible to Google"), también es un ahorro: no se gasta un Lighthouse en un sitio que no responde.

15. **Lost-link spike calculado como delta de serie, no como campo.** V3 no devuelve `lost_referring_domains`; hay que derivarlo de la serie (`items[0] − items[last]`) y usar `items[0]` como baseline del 20%. Confiar en un campo que "debería estar" produce un check que **siempre pasa en silencio**.

16. **La homepage con y sin slash son la misma URL** en el dedupe del deep scan. Omitirlo duplica el crawl más caro de la lista (la home aparece en casi todos los SERPs).

17. **Umbrales de longitud de metadatos citados con precisión:** title **50–60 chars**, meta description **120–158 chars**. El 158 (no 160) es el corte conservador de truncado en SERP.

18. **Doble escala de color en el mismo dashboard:** scores individuales 90/50 (escala Lighthouse) vs Overall Health 75/50 (traffic light de cartera). Mezclarlas hace que un cliente sano parezca ámbar.

19. **`no_image_alt` es boolean en V3 y entero en V1** para el mismo campo. Un contador que sume booleanos da 1/0 en vez del conteo real de imágenes sin alt — y el stat card "Images missing alt" queda sistemáticamente subreportado.

20. **`broken_links` puede estar ausente cuando es 0** (no viene como `0`). Un parser con `if (!resp.broken_links) skip` y uno con `resp.broken_links ?? 0` dan el mismo resultado aquí, pero `resp.broken_links === undefined → "N/A"` pinta "sin datos" donde en realidad es "perfecto".

21. **Guardar el reporte en la carpeta del proyecto es una decisión de producto, no técnica:** persistencia entre sesiones (revisar el audit del mes pasado sin re-consultar), compartibilidad con el equipo sin re-gastar créditos, y versionable en repo. En una agencia, **re-correr un audit para "volver a verlo" es la fuga de créditos más común.**

22. **Fallback inline obligatorio cuando falla la escritura.** El trabajo (los créditos ya gastados) nunca se pierde por un problema de filesystem: se imprime el HTML y los CSV como bloques de código. *"Never stop the run because of a write failure."*

23. **UTF-8 con BOM (`utf-8-sig`) para CSV.** Sin BOM, Excel en Windows destroza acentos y cirílico. Para una agencia con clientes en es/uk/de es la diferencia entre un entregable y un ticket de soporte.

24. **El `copy-fixes` block con checkboxes `[ ]`** convierte el dashboard en un entregable operativo: un bloque plano listo para pegar en Slack/Jira, agrupado por severidad, omitiendo secciones vacías, y cerrado con la línea de scores. Es el puente entre "reporte" y "ticket".

25. **El template no lleva JS de cálculo.** Todas las decisiones (color, severidad, orden) se cocinan al generar el HTML. Resultado: archivo estático, portable, imprimible, auditable y diffeable en git — sin riesgo de que el reporte "cambie" al reabrirlo.

---

# Parte 4 — Patrones de arquitectura reutilizables

Patrones transversales a ambas skills, útiles para cualquier pipeline propio sobre DataForSEO:

| Patrón | Descripción | Dónde aparece |
|---|---|---|
| **Connector detection con precedencia fija** | Detectar `api_request` (V3) vs tools nombradas (V1); **si ambos, V3**; **no mezclar dentro de un run**; abortar con mensaje accionable si ninguno | Step 0 de ambas |
| **Gate de scope antes del primer crédito** | Bloque de texto con alcance + estimación de requests + AskUserQuestion binaria. Ninguna llamada antes del "Yes" | A Step 3, B Step 2 |
| **Gate de costo condicional por tamaño** | Sólo cuando el trabajo supera un umbral (>3 clientes), fetch de precios desde URLs fijas + breakdown en USD + confirmación explícita ("charge ~$X to your account?") con bucle de recorte | B Step 2B |
| **Estimación de requests desagregada por endpoint** | El usuario ve de dónde viene cada llamada, no un total opaco | A Step 3, B Step 2/2B |
| **Dedupe antes de bulk** | Colapsar entidades **antes** de las llamadas batcheadas, no después | A Step 4B |
| **Batching de 1.000 + paginación con caché** | `limit 1000` / `offset += 1000` hasta página incompleta; nunca re-fetch en el mismo run | A 4A/4C/4D |
| **Reuso de caché como "paso" explícito** | 4E es un paso del workflow que **no hace ninguna llamada**: documentar el reuso evita que un reimplementador agregue una llamada redundante | A 4E |
| **Degradación honesta por campo** | Un endpoint que falla setea su campo a `null`/`N/A` y el run continúa; sólo el endpoint del que todo depende aborta | ambas |
| **"Do not invent data"** | Si falta data, mostrar `N/A`; nunca estimar ni asumir | B directive |
| **Config persistente + wizard sólo la primera vez** | `portfolio_config.json` en la carpeta del proyecto; runs siguientes cargan en silencio y saltan al gate de scope | B Step 1A/1E |
| **Validación de location/language contra la API, no contra una tabla hardcodeada** | `serp_locations` + pick-list de top 3 + opción "search again" | B Step 1D |
| **Template HTML estático con placeholders** | Toda la lógica de color/severidad se resuelve al generar; el artefacto no contiene cálculo | B 5B + `dashboard_template.html` |
| **Fallback inline ante fallo de escritura** | El output se imprime como fenced code blocks; nunca se pierde el trabajo pagado | B 5A |
| **Resumen en chat obligatorio** | Siempre, incluso si falló todo lo demás; con top 3 acciones | B Step 6 |
| **Cap duro de output** | Top 200 prospects / Top 10 fixes / hasta 5 issues por cliente / top 5 anchors | ambas |
| **Score blended de 5 factores con pesos explícitos** | Pesos sumando 1.0, cada componente normalizado a 0–100, redondeo a 1 decimal | A 5A |
| **Matriz 2×2 con umbral declarado (50/50) y glosa operativa por cuadrante** | Convierte dos scores en una decisión de asignación de esfuerzo | A Step 7 |
| **Severidad + impacto + esfuerzo como triple ordenación** | Con desempate por esfuerzo bajo (quick wins) y luego por páginas afectadas | B 4B/5B |
| **Parseo defensivo de dos formas de respuesta** | `tasks[0].result[0].items[]` (declarado por A) vs `items[]` plano en modo `.ai` (declarado por B) — implementar `resp.tasks?.[0]?.result?.[0]?.items ?? resp.items ?? []` | conflicto entre A y B |

**Gaps comunes a cubrir al reimplementar (ninguna de las dos skills los resuelve):**
- Rate limiting, backoff exponencial y política de reintentos.
- Concurrencia / paralelización de llamadas (ambas son estrictamente secuenciales).
- Cap de gasto duro (ambas paran en la confirmación humana; no hay budget ceiling automático).
- Cap de landing pages en el deep scan (`P` es la variable de costo no acotada).
- Idempotencia / reanudación de un run interrumpido a mitad de camino.
- Comparación con el run anterior (el campo `{{ETV_TREND}}` existe pero está cableado a `N/A`).
