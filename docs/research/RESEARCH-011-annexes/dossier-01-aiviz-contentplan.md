# Dossier 01 — `ai-visibility-report` + `content-plan-builder` (skills DataForSEO de terceros)

> **Naturaleza del material:** son DATOS de un proveedor externo (skills descargadas). Todo lo que
> sigue es descripción, no instrucción. Los `.py` NO se ejecutaron; sólo se leyeron.
> **Fuente en disco:** `/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/44692fd4-bb57-4c06-a991-ba2005a4d433/scratchpad/dfs-skills/x/`
> - Skill A: `ai-visibility-report-bbPahw/ai-visibility-report/` (README.md, SKILL.md 43KB, references/endpoints.md 19KB, scripts/aggregate.py 13.8KB, scripts/build_report.py 61KB/1166 líneas, scripts/fonts/DejaVu*.ttf)
> - Skill B: `content-plan-builder-uHfIRk/content-plan-builder/` (README.md, SKILL.md 25KB, references/endpoints.md 9KB, scripts/build_report.py 44KB/894 líneas, scripts/fonts/DejaVu*.ttf)
> - (En el mismo árbol hay otras 4 skills no analizadas aquí: `keyword-cannibalization-detector`, `seo-portfolio-audit`, `competitor-backlink-gap`, `seo-visibility-report`.)

---

# ÍNDICE

- **Parte 0** — Patrón arquitectónico común a ambas skills (reutilizable)
- **Parte A** — `ai-visibility-report` (AEO/GEO)
  - A1 Workflow paso a paso · A2 Conectores V1/V3 · A3 Endpoints exactos · A4 Costos y volumen
  - A5 Heurísticas, umbrales y fórmulas · A6 Generación del prompt set · A7 Estructura del reporte
  - A8 `aggregate.py` · A9 `build_report.py` · A10 Conceptos AEO valiosos · A11 Esquemas JSON
- **Parte B** — `content-plan-builder` (SEO/contenidos)
  - B1 Workflow paso a paso · B2 Conectores v1/v3 · B3 Endpoints exactos · B4 Costos/batching
  - B5 Clustering, priorización, roadmap (fórmulas) · B6 Estructura del reporte + XLSX
  - B7 `build_report.py` · B8 Conceptos SEO valiosos · B9 Esquemas JSON
- **Parte C** — Diferencias, tensiones y lo directamente portable a Greenhouse

---

# Parte 0 — Patrón arquitectónico común (lo que hace valiosas a ambas)

Ambas skills comparten un contrato idéntico, que es el activo reutilizable más grande:

1. **Determinismo por constantes en el script, no en los datos.** Títulos de sección, encabezados
   de columna y vocabularios cerrados viven como constantes Python (`SECTION_TITLES`, `COLUMNS`,
   `PROMINENCE_ORDER`, `PROMPT_TYPES` / `TIER_ORDER`, `INTENT_ORDER`, `ROLE_ORDER`). El LLM sólo
   aporta **valores** y **prosa**. Cita textual (ambos scripts):
   > "Every section title and every table column header in this report is a literal constant …
   > They are NOT read from the data JSON. The model that produces the data JSON supplies ONLY
   > data values … It cannot rename a section or a column."
2. **Separación operador vs mantenedor.** Skill A lo dice explícito: la prohibición de editar
   `build_report.py` aplica "**to the operator at runtime**"; el mantenedor puede y debe editarlo.
3. **El LLM no hace aritmética.** Skill A empuja TODO el cálculo a `aggregate.py`
   ("keeps … all share/rate/matrix arithmetic off the operator's token budget, and makes every
   number reproducible"). Skill B todavía deja el cálculo en el LLM (Step 7) — es su debilidad
   relativa.
4. **Checkpoint compacto + resume.** Skill A: un registro por celda `(prompt, model)`, se descarta
   el texto largo del modelo; al reiniciar se saltan pares ya presentes; el checkpoint se borra
   sólo cuando el PDF sale bien.
5. **White-label reutilizable** en `_agency_whitelabel.json` (agency-level, cross-cliente),
   separado del config per-cliente. "No DataForSEO branding anywhere".
6. **Interaction Rules estrictas:** una pregunta por turno, `AskUserQuestion` con exactamente UN
   objeto pregunta por llamada ("The tool technically accepts up to four; you must never pass more
   than one"), nunca listas "1)… 2)… 3)…".
7. **Gate de confirmación humana antes de gastar créditos** (Step 4 en ambas): caja RUN CONFIG con
   estimación de llamadas + `AskUserQuestion` "Yes — start now" / "No — edit …". "Make NO API calls
   until Option 1."
8. **Fuentes DejaVu bundled** (Unicode) bajo `scripts/fonts/`, con override de TTF de agencia.
9. **JSON de datos como companion** → re-render sin gastar API de nuevo.

---

# PARTE A — `ai-visibility-report` (AI Visibility & GEO)

## A1. Workflow completo (SKILL.md)

**Frontmatter** `name: ai-visibility-report`, con triggers: "AI visibility report", "GEO report",
"AI search visibility audit", "are we visible in AI search", "brand mentions in ChatGPT/Gemini/
Perplexity", "AI mention share", "citation share", "LLM visibility for [brand]", "generative engine
optimization report", "run the AI visibility report for [brand]".

**EXECUTION DIRECTIVE (literal):** "Do not skip steps · Do not substitute endpoints · Do not invent
data (If an endpoint returns no data, log it and continue — never estimate or assume values) ·
Do not add unsolicited extras · If something is unclear, re-read the relevant step. Do not improvise."

### Step 1 — White-label config (7 preguntas, una por turno)
Busca `_agency_whitelabel.json`; si existe: "Using saved white-label: [agency_name]."
Si no: (1) Agency name, (2) Report title (default `AI Visibility Report`), (3) Footer text
(default `[agency_name]  •  Confidential`), (4) logo PNG path (opcional), (5) primary color hex
(ej. `#0F2A43`), (6) accent color hex (ej. `#E4572E`), (7) TTF path + si lo dan, "Font family name".
**Marca y competidores NO son white-label** — son inputs de cliente (Step 2).

### Step 2 — Brand & Scope (7 ítems, uno por turno)
1. Brand name. 2. Brand domain (root, sin www/https). 3. Competidores (CSV, opcional, "recomendado
hasta 5") + display name por cada uno. **Si hay competidores**, pregunta aparte "Competitor basis":
   - Opción 1 (**default**): "Live prompt set — like-for-like (recommended)" → `competitor_live_probing = true`
     ("0 extra API calls … same sample as the headline").
   - Opción 2: "Aggregated dataset — broader population" (Track A, ~4-7 calls, "ChatGPT-only and
     often empty for niche brands. Directional.") → `false`.
   Sin competidores → `competitor_live_probing = false` y se salta.
4. Keywords/topics CSV, "Recommended 3-8 — each is expanded into several prompts".
5. **Location + language**, cada sub-pregunta en su turno:
   - (a) Location: buscar en **AMBAS** listas `ai_opt_llm_ment_loc_and_lang` (Track A) y
     `ai_opt_kw_data_loc_and_lang` (search volume) — "they are different lists". Mostrar 2-3
     candidatos + "None of these"; **cap de 2 reintentos**, luego abortar con mensaje claro; nunca
     improvisar un código.
     → **Platform detection:** `track_a_platform = "chat_gpt"` sólo si United States/English; en
     cualquier otro locale `"google"`.
     → Heads-up de cobertura si el locale está en una lista y no en la otra.
   - (b) Language: nunca escribir el código a mano; matchear contra las listas, 2-3 candidatos,
     mismo cap de 2 reintentos → `language_code` + `language_name`.
   - Si `track_a_platform = "google"`, warning: las secciones dataset (Citation Landscape,
     Competitor Comparison) reflejan la superficie Google; live (Secciones 1-3) no se afecta.
6. **Prompt depth** (`prompts_per_keyword`): "3 — lean" / "4 — standard (recommended)" / "2 —
   minimal / cheapest"; "Other" acepta custom entero ≥1; **si > 6, advertir que multiplica llamadas
   y confirmar**; rechazar 0/negativos.
7. **Reporting period:** si no hay JSON previo, NO ofrecer comparación ("this run becomes the
   baseline"). Si hay: "Current snapshot (recommended)" vs "Compare to previous run" (carga el
   bloque `summary` del archivo más reciente en `previous`).
   **Regla dura:** "the period is a label, not a query filter. It is NEVER sent to any DataForSEO
   endpoint." Y prohíbe explícitamente usar filtros `first_response_at`/`last_response_at` porque
   scopearía Track A a una ventana mientras Track B sigue siendo "ahora".

### Step 2b — Model set (sin input del usuario, determinista)
Motivo textual: "two runs on the same day must pick the same models, or the trend table shows fake
movement". Para cada `llm_type` (`chat_gpt`, `gemini`, `claude`, `perplexity` + cualquier nuevo):
1. **Pin explícito gana** (`llm_model_overrides` en el white-label).
2. Si no, regla determinista sobre modelos con `web_search_supported: true`:
   a. tier por nombre: `pro` / `opus` / `ultra` / `sonar-pro` (top) **por encima de**
      `flash` / `mini` / `nano` / `lite` / `haiku`;
   b. versión parseada descendente (5.2 > 5.1 > 5);
   c. `reasoning: true` antes que false;
   d. `model_name` ascendente como desempate total.
3. Fallback si ningún modelo tiene web search: aplicar la misma regla sobre todos y **anotar en la
   narrativa que ese proveedor tiene fidelidad de citación reducida**.
→ `llms_covered = [{llm_type, model_name, label}]`, label tipo "ChatGPT (GPT-5.2)".
**Trend integrity:** al comparar con run previo, si `llms_covered` difiere, agregar caveat
("model lineup changed since last run; some trend movement may reflect that, not real visibility").

### Step 3 — Prompt set (ver A6)
### Step 4 — Confirmación con caja RUN CONFIG + estimación (ver A4)
### Step 5 — Validate (tabla de checks, ver A5.7)
### Step 6 — Fetch (6.1 checkpoint live · 6.2 Track A residual · 6.3 lo que calcula el script · 6.4 oportunidades)
### Step 7 — `aggregate.py` (config + cells + prose → data JSON)
### Step 8 — `build_report.py` (data JSON → PDF); borrar checkpoint; relayar warnings de stderr
### Step 9 — Deliver (bloque de headline fijo, ver A7.9)

## A2. Conectores V1 / V3 (transport swap)
- Si ambos están presentes → **usar V3**.
- **V3 convención:** `api_request({ method: "POST", path: "<v3 path>", data: [ { …task… } ] })`.
  - `data` = array con **exactamente un** objeto task (convención POST de DataForSEO).
  - **NO** setear `noAiMode` por default. En AI mode V3 elimina el envelope `tasks` y expone el array
    de resultado arriba como **`items`**: "read `items` on V3 wherever you read `tasks[0].result` on V1".
    Equivalencias: V1 `tasks[0].result[0].X` ≡ V3 `items[0].X`; V1 `tasks[0].result[]` ≡ V3 `items[]`.
  - Sólo si a UNA llamada le falta un campo (ej. el texto completo o `annotations`), reintentar **esa
    llamada** con `noAiMode: true`.
  - Dos diferencias de parámetros: (1) **el llm_type y el endpoint van en el PATH, no en el body**
    (no hay campo `llm_type`); (2) el campo de filtro de mentions es **`initial_dataset_filters`**
    (V1 a veces lo llama `filters`).
  - Endpoints GET (models, loc/lang, filters, scraper locations) no llevan `data`.

## A3. Endpoints DataForSEO — mapa exacto V1 ⇄ V3

| Propósito | V1 tool | V3 path | Método |
|---|---|---|---|
| Model list (per LLM) | `ai_optimization_llm_models` | `/v3/ai_optimization/{llm}/llm_responses/models` | GET |
| Live LLM response | `ai_optimization_llm_response` | `/v3/ai_optimization/{llm}/llm_responses/live` | POST |
| ChatGPT scraper | `ai_optimization_chat_gpt_scraper` | `/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced` | POST |
| Scraper locations | `ai_optimization_chat_gpt_scraper_locations` | `/v3/ai_optimization/chat_gpt/llm_scraper/locations` | GET |
| AI search volume | `ai_optimization_keyword_data_search_volume` | `/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live` | POST |
| Mentions filters | `ai_optimization_llm_mentions_filters` | `/v3/ai_optimization/llm_mentions/filters` | GET |
| Target metrics (agg) | `ai_opt_llm_ment_agg_metrics` | `/v3/ai_optimization/llm_mentions/target_metrics/live` | POST |
| Multi-target (cross) | `ai_opt_llm_ment_cross_agg_metrics` | `/v3/ai_optimization/llm_mentions/multi_target_metrics/live` | POST |
| Search mentions | `ai_opt_llm_ment_search` | `/v3/ai_optimization/llm_mentions/search_mentions/live` | POST |
| Top mentioned domains | `ai_opt_llm_ment_top_domains` | `/v3/ai_optimization/llm_mentions/top_mentioned_domains/live` | POST |
| Top mentioned pages | `ai_opt_llm_ment_top_pages` | `/v3/ai_optimization/llm_mentions/top_mentioned_pages/live` | POST |
| Mentions loc/lang | `ai_opt_llm_ment_loc_and_lang` | `/v3/ai_optimization/llm_mentions/locations_and_languages` | GET |
| KW-data loc/lang | `ai_opt_kw_data_loc_and_lang` | `/v3/ai_optimization/ai_keyword_data/locations_and_languages` | GET |

`{llm}` ∈ `chat_gpt` / `gemini` / `claude` / `perplexity`. **Todo es `live`; no hay task_post/task_get
en esta skill.**

### Payloads exactos (literales del reference)

**`ai_optimization_llm_models`** → request `{ "llm_type": "chat_gpt" }`; respuesta: array de
`{ model_name, reasoning, web_search_supported, task_post_supported }` (un flag "is present only
when true").

**`ai_optimization_llm_response`** (Track B, el caro):
```json
{ "llm_type": "chat_gpt", "model_name": "gpt-5.2",
  "user_prompt": "What is the best SERP API for developers?", "web_search": true }
```
Respuesta consumida: `R[0].items[]` → el elemento con `type == "message"` tiene el texto en
`sections[]` (concatenar `section.text` donde `type == "text"`) y las fuentes en `annotations[]`
(cada una `{ title, url, start_index, end_index, text }`). Los elementos `reasoning` se ignoran.
`R[0].web_search` indica si corrió búsqueda. **Los endpoints live NO toman location/language.**

**`ai_opt_llm_ment_agg_metrics`** (Track A, headline dataset):
```json
{ "target": [{ "domain": "serpfox.com" }], "platform": "<track_a_platform>",
  "location_name": "United States", "language_code": "en" }
```
Campos: `R[0].aggregated_metrics.total.mentions`; dominios citados en
`R[0].aggregated_metrics.sources_domain[]` (`{ key: domain, mentions }`).
Variante cross-check por modelo: `"filters": [["model_name", "=", "gpt-5.2"]]` (sólo significativo
para `chat_gpt`).

**`ai_opt_llm_ment_cross_agg_metrics`** (competidores, modo dataset):
```json
{ "targets": [
    { "aggregation_key": "serpfox.com",    "target": [{ "domain": "serpfox.com" }] },
    { "aggregation_key": "dataforseo.com", "target": [{ "domain": "dataforseo.com" }] },
    { "aggregation_key": "serpapi.com",    "target": [{ "domain": "serpapi.com" }] } ],
  "platform": "<track_a_platform>", "location_name": "United States", "language_code": "en" }
```
Devuelve un elemento `R` por `aggregation_key`. **"The response returns raw COUNTS, not
percentages."**

**`ai_opt_llm_ment_top_domains`**:
```json
{ "target": [{ "keyword": "serp api" }], "platform": "<track_a_platform>",
  "links_scope": "sources", "items_list_limit": 10, "internal_list_limit": 5 }
```
"Run **one call with the full keyword set** (not looped per keyword)". `ai_opt_llm_ment_top_pages`
igual pero agrupado por página.

**`ai_opt_llm_ment_search`** (contexto de tópico, opcional):
```json
{ "target": [{ "keyword": "serp api", "match_type": "word_match" }],
  "platform": "<track_a_platform>", "limit": 20 }
```

**`ai_optimization_keyword_data_search_volume`**:
```json
{ "keywords": ["serp api", "rank tracker"], "language_code": "en", "location_name": "United States" }
```
→ `R[0].items[]` → `{ keyword, ai_search_volume }`. La tabla del reporte es **sólo demanda AI**;
la columna de volumen web se eliminó "it was always empty".

**`ai_optimization_chat_gpt_scraper`** (opcional):
`{ "keyword": "best serp api", "language_code": "en", "location_name": "United States" }`

**`ai_optimization_llm_mentions_filters`** devuelve los campos filtrables: `platform`,
`location_code`, `language_code`, `ai_search_volume`, `first_response_at`, `last_response_at`,
`model_name`.

### Tabla resumen de llamadas por sección (literal del reference)

| # | Sección | Tool | Track | Calls |
|---|---|---|---|---|
| 0 | Setup | `ai_optimization_llm_models` | util | 1 por llm_type |
| 0 | Setup | `ai_opt_llm_ment_loc_and_lang`, `ai_opt_kw_data_loc_and_lang` | util | 1 c/u |
| 0 | Setup | `ai_optimization_llm_mentions_filters` | util | 1 |
| 1 | Summary | `ai_opt_llm_ment_agg_metrics` | A | 1 |
| 1 | Summary | `ai_optimization_llm_response` | B | prompts × models |
| 2 | By-LLM | `ai_optimization_llm_response` (reagrupado) | B | reusa S1 |
| 2 | By-LLM | `ai_opt_llm_ment_agg_metrics` + filtro `model_name` | A | 0-N opcional |
| 2 | By-LLM | `ai_optimization_chat_gpt_scraper` | B | 0-1 opcional |
| 3 | By prompt | `ai_optimization_llm_response` (reagrupado) | B | reusa S1 |
| 3 | By prompt | `ai_opt_llm_ment_search` | A | 0-1 por kw opcional |
| 4 | Citations | `ai_opt_llm_ment_top_domains` | A | 1 (keyword set completo) |
| 4 | Citations | `ai_opt_llm_ment_top_pages` | A | 1 |
| 4 | Citations | reuso de `cited_sources` live | B | 0 (fallback si dataset vacío) |
| 5 | Competidores (live, default) | reuso de respuestas 6.1 | B | **0 extra** |
| 5 | Competidores (dataset) | `ai_opt_llm_ment_cross_agg_metrics` | A | 1 (+1 por modelo, by_model sólo ChatGPT) |
| 6 | AI demand | `ai_optimization_keyword_data_search_volume` | A | 1 |

## A4. Costos, guardrails y volumen (Skill A)

- **Fórmula de estimación:** `live calls = nº prompts × nº modelos` (Track B) + **~6 llamadas
  dataset** (Track A) + **~5 setup/util**.
- **Total típico literal:** "brand + 2 competitors, 5 keywords × 4 prompts, 4 models: ~5 setup/util
  + ~6 dataset + (20 prompts × 4 models = 80 brand live) ≈ **~91 calls**".
- **Rango recomendado declarado normal:** "6-8 keywords × 4 prompts × 4 models = **96-128**".
- **Umbral para nombrar las palancas de costo:** "if the count is large (roughly **> 100 live
  calls**)". Palancas: (1) menos keywords, (2) menos prompts-por-keyword, (3) dejar el live probing
  de competidores apagado. **El nº de modelos es fijo; no hay pantalla de configuración.**
  "Treat this as an informational cost note, not a hard block."
- **Tiempo estimado mostrado al usuario:** "Expect roughly `ceil(total_live / 20)` - `ceil(total_live
  / 10)` minutes" (es decir, 10-20 llamadas por minuto). "Live prompts run **sequentially** (one
  prompt × one model per call; **no batch endpoint**)."
- **Competidores nunca multiplican llamadas live:** "There is no configuration under which
  competitors multiply the live-call count."
- Warning de prompts custom: si `prompts_per_keyword > 6` → confirmar.
- **Reintentos:** backoff hasta **3×** por celda fallida.

## A5. Heurísticas, umbrales y fórmulas (Skill A) — TEXTUALES

### A5.1 Score
- `ai_visibility_score = 0.6 × mention_share + 0.4 × citation_share`
  (config `score_weights: { "mention": 0.6, "citation": 0.4 }`; el glosario del PDF imprime los pesos
  dinámicamente desde el config).
- `D` (denominador) `= (unbranded prompts × models) − not_measured cells`
- `mention_share = unbranded_mentions / D × 100`
- `citation_share = unbranded_citations / D × 100`
- **El headline se calcula SÓLO sobre prompts unbranded y celdas efectivamente medidas.**

### A5.2 Clasificación por celda (Track B)
- `mention` = nombre de marca (o variante obvia) en el texto, **word-boundary, case-insensitive**.
  "String match."
- `citation` = dominio de marca en el cuerpo o en los links de fuente. Match del **dominio
  registrable**, ignorando `www.`/subdominio/path. **Resolver redirects primero**: Gemini devuelve
  `vertexaisearch…/grounding-api-redirect/…`, "so a naive match under-counts its citations". Si no
  se puede resolver: anotar en `insight` que la tasa de Gemini está sub-medida — "do not silently
  score it 0".
- `prominence` — "**This is the only judgment call**" (sólo para la marca):
  - `Named first` = única recomendación líder
  - `Shortlist` = una de varias opciones nombradas
  - `Passing mention` = nombrada pero no recomendada
  - `Absent` = no presente
  Orden canónico: `PROMINENCE_ORDER = ["Named first", "Shortlist", "Passing mention", "Absent"]`.
- **Celda fallida ≠ Absent:** tras 3 reintentos → `status: "not_measured"`, excluida del
  denominador. "NEVER record it as a measured 'Absent'."
- Las reglas se aplican **idénticas a marca y competidores** ("Keep the variant rule consistent").

### A5.3 Divergencia live vs dataset
- "**Live track is authoritative; dataset is a directional cross-check.** When the two disagree by
  more than **~20 percentage points** on the same metric, trust the live (Track B) figure for the
  headline and note the gap in the narrative."

### A5.4 Confiabilidad del run
- ">**20% of live cells failed** → Flag the run low-confidence in the narrative; advise re-running."

### A5.5 Significancia de deltas (trend) — en `build_report.py`
```python
eps = max(3.0, 100.0 / max(denom, 1))
```
"one response's worth of weight, min 3 points". Deltas `abs(d) < eps` se pintan **neutros** (muted),
ni verde ni rojo, en KPI cards y en la tabla de trend. Pie de tabla: "Changes smaller than ~{eps}
points are shown neutral (within snapshot noise)."

### A5.6 Umbrales de color en la tabla By-LLM
- `mention_rate`: **≥ 50** verde · **≥ 20** ámbar · **< 20** rojo.
- `citation_rate`: **≥ 30** verde · **≥ 10** ámbar · **< 10** rojo.

### A5.7 "Effectively invisible" (call-out automático)
Dispara si `mention_share ≤ 5` **y** `citation_share ≤ 5` (y ambos no-None: "Only fire on REAL
measured near-zeros"). Renderiza caja ámbar: "**The brand is effectively invisible in AI answers for
this topic set.** … This is a common starting point, not an error."

### A5.8 Prompt invisible
`invisible_prompts` = prompts con **cero menciones Y cero citas** en todos los modelos.
El PDF lista hasta 12 (`invisible[:12]` + "…").

### A5.9 Guard anti-porcentaje falso
`fmt_pct()`: "a share must be 0-100. Raw counts leaking through print as 'n/a', never as a bogus
percentage (e.g. a count of 64 must not render '64%')" → si `f < 0 or f > 100` retorna `"n/a"`.

### A5.10 Checks de Step 5 (Validate)
| Check | Regla |
|---|---|
| Domain format | sin `https://`, sin `www`, sin slash final |
| Keywords | al menos 1 |
| Locale | confirmado contra **ambas** listas; `track_a_platform` seteado |
| Language | derivado de match confirmado, no tipeado libre |
| Models | ≥1 en `llms_covered`, cada uno con `model_name` válido |
| White-label colors | `^#?[0-9A-Fa-f]{6}$` |
| White-label logo | archivo existe y es legible |
| White-label font | existe, carga y **cubre los glifos `•—–…`** |
| reportlab | `python -c "import reportlab"`; si falla `pip install reportlab` una vez |

## A6. Generación del prompt set (Step 3 — sin API)

- **Conteo exacto:** por CADA keyword exactamente `prompts_per_keyword` prompts. Total =
  `len(keywords) × prompts_per_keyword`.
- **Idioma y región:** escribir cada prompt en `language_name`; geo-calificar donde suene natural
  ("…in the United Kingdom"), sin romper la regla de "reads like a real user question".
- **Taxonomía fija de 4 tipos** (`PROMPT_TYPES` en el script), con plantillas ejemplo textuales:
  - **Informational**: "What is [keyword] and how does it work?" / "How do I choose a [keyword]?"
  - **Comparative**: "What is the best [keyword]?" / "Compare the top [keyword] providers"
  - **Recommendation**: "Recommend a [keyword] for developers" / "Which [keyword] should I use for [use case]?"
  - **Branded**: "Is [brand] a good [keyword]?" / "How does [brand] compare for [keyword]?"
- **Asignación determinista por `k`:**
  - `k = 1`: Comparative
  - `k = 2`: Comparative + Recommendation
  - `k = 3`: Comparative + Recommendation + Informational (se cae Branded, salvo que la keyword sea
    brand-related)
  - `k = 4`: uno de cada tipo
  - `k > 4`: uno de cada uno de los 4, luego ciclar los **unbranded** en orden fijo —
    **Comparative → Recommendation → Informational** — con wordings distintos cada vez.
- **Invariantes para todo `k`:** exactamente `k` por keyword · **al menos un prompt unbranded por
  keyword** (para aislar la visibilidad de descubrimiento) · **a lo más un Branded por keyword** ·
  prompts que lean como preguntas reales, sin duplicados dentro de la keyword.
- Persistencia: `{id, keyword, text, type, branded}` en `config.prompts`; **el set completo se
  imprime verbatim en la página de Scope del PDF** (transparencia de método).

## A7. Estructura EXACTA del reporte (PDF A4, reportlab)

`SECTION_TITLES` (constantes):
```python
{"summary":"AI Visibility Summary", "by_llm":"By-LLM Breakdown", "by_prompt":"By Prompt & Topic",
 "citations":"Citation Landscape", "competitors":"Competitor Comparison",
 "volume":"AI Search Demand", "actions":"Opportunities & Next Actions",
 "glossary":"Methodology & Glossary"}
```
`COLUMNS` (constantes, literal):
```python
"by_llm":  ["LLM Model","Prompts Tested","Mentions","Mention Rate","Citations","Citation Rate","Typical Prominence"]
"by_prompt":["Prompt","Type","Models Mentioning","Prominence","Cited"]
"top_domains":["Cited Domain","Citations","Citation Share","Owner"]
"top_pages":["Cited Page","Domain","Citations","Owner"]
"competitors_live":   ["Brand / Competitor","Mention SoV","Citation SoV","Visibility (SoV)"]
"competitors_dataset":["Brand / Competitor","Dataset Mention SoV","Dataset Citation SoV","Dataset Visibility (SoV)"]
"volume":  ["Keyword / Topic","AI Search Demand"]
"prompt_set":["#","Prompt","Type","Keyword"]
```

**Orden del story** (`build_pdf`): Cover (página 1, dibujada en canvas) → **Scope & Prompt Set**
(numerada con la letra fija "S") → Summary → By-LLM → By Prompt → Citations → *(Competitors sólo si
`cfg.competitors`)* → *(AI Search Demand sólo si `sections.search_volume`)* → Opportunities →
Glossary. **Numeración contigua:** un contador `nxt()` que sólo avanza cuando la sección se añade,
"so omitting an optional section never leaves a gap".

Detalle por sección:
- **Cover:** banda primary arriba (14mm), barra accent vertical izquierda (5mm), logo o nombre de
  agencia en mayúsculas, período arriba-derecha, título 27pt, "BRAND ANALYSED" + brand name 20pt +
  dominio, línea "Market: X • Language: Y", "Models covered: …", footer centrado.
- **Scope:** párrafo que define mention vs citation, nota de scope (los modelos live no toman
  location), tabla clave/valor (Keywords, Models covered, Competitors, "Prompts generated: N (k per
  keyword)") y la **tabla del prompt set completo** con ratios `[0.06, 0.56, 0.20, 0.18]`.
- **Sección 1 Summary:** `ScoreDial` (donut 42mm, arco proporcional; si `score=None` dibuja "n/a",
  nunca 0) + párrafo explicativo con los pesos, + 4 `KPICard` (44×28mm): "Mention Share"
  (sub "answers naming the brand"), "Citation Share" (sub "answers citing brand domain"),
  "Prompts w/ Mention" (`x/N`), "Models Covered". Deltas `+/-N pts` con color por signo salvo
  neutral si `< eps`. Caja **Confidence** si hubo celdas fallidas. Tabla Trend
  (`Metric | período actual | período previo | Change`). Caja "effectively invisible" si aplica.
  Prosa "What this means" + `Takeaway:` box.
- **Sección 2 By-LLM:** tabla de 7 columnas, ratios `[0.24,0.13,0.11,0.13,0.11,0.13,0.15]`.
- **Sección 3 By Prompt:** ratios `[0.36,0.14,0.26,0.14,0.10]`. Prompt en rojo si no visible.
  Colores de prominencia: `Named first`→success, `Shortlist`→accent, `Passing mention`→warn,
  `Absent`→danger. Distinción explicada en el intro: "**A red row with Cited: Yes is a citation-only
  gap** — the brand's domain was used as a source but the assistant never wrote the brand's name."
  Caja ámbar con los invisible prompts.
- **Sección 4 Citation Landscape:** "Most-cited domains" `[0.44,0.18,0.20,0.18]` y "Most-cited pages"
  `[0.42,0.28,0.14,0.16]`, columna Owner = "Brand" / "Third-party". Si hay páginas de marca citadas
  → caja info; si no → caja ámbar: "**No brand-owned page is currently cited** … the core GEO gap."
  Guard: si las 3 listas están vacías, imprime `no_data_box` en vez de un intro que promete tablas.
- **Sección 5 Competitors:** tabla con `ShareBar` horizontal normalizada a `max_ment` (no a 100),
  fila de marca tintada (`soft` + línea accent) y etiqueta "(you)". Nota de base de medición fija,
  dos strings según `live_basis`. Matriz opcional `by_model` — encabezados `["LLM Model","You", …]`,
  **lookup por clave de dominio, nunca posicional** ("fix #9"), y si es dataset añade "(ChatGPT only
  — dataset basis)".
- **Sección 6 AI Search Demand:** 2 columnas `[0.70, 0.30]`.
- **Sección 7 Opportunities:** por acción: banda accent numerada + título, caja "Why:", caja
  "GEO actions:", pie con `Effort | Impact | Priority` (colores High=success, Medium=warn,
  Low=accent).
- **Glosario** (10 términos definidos textualmente): Mention Share · Citation Share · AI Visibility
  Score (0-100) · **Share of Voice (competitor section)** · Prominence · Prompt types · **GEO —
  Generative Engine Optimization** · Measurement method · Snapshot & run-to-run variance.

**Archivos de salida:** `[brand-domain]_ai_visibility_[YYYY-MM].pdf` + `.json` (companion
mes-a-mes). El trend es **file-based**: el run nuevo lee el bloque `summary` del JSON previo del
mismo brand-domain y lo mete en `previous`.

**Step 9 — bloque Deliver literal:**
```
Headline:
  - AI Visibility Score: [score]/100  (unbranded prompts, [D] measured responses)
  - Mention share: [x]%   Citation share: [y]%   (kept separate)
  - [n]/[N] prompts mention the brand across [m] models
  - [k] invisible prompts flagged (no mention AND no citation)
  - Top competitor: [domain] at [x]% mention share
Note: figures are a point-in-time snapshot; LLM answers vary run to run…
```

## A8. `scripts/aggregate.py` — lógica notable

Librerías: sólo stdlib (`sys, json, os`, `collections.Counter/defaultdict`). CLI:
`python aggregate.py <config.json> <cells.json> [<prose.json>] -o <data.json>`.
Helpers: `_num(v,d=0)` (float con fallback), `_round(v,n=1)`, `load(path)` (utf-8).
Constante espejo: `PROMINENCE_ORDER` idéntica a la del build.

`build_sections(config, cells, prose)`:
- Normaliza `brand_domain` con `.lower().lstrip("www.")` *(nota: `lstrip` de un set de caracteres —
  bug latente si el dominio empieza con w/a/./; reimplementar con `removeprefix("www.")`)*.
- Indexa celdas por `(prompt_id, model)`; las `not_measured` sólo incrementan `n_failed`.
- **summary:** `ub_cells` = celdas medidas de prompts unbranded; `D = len(ub_cells)`;
  `mention_share`, `citation_share`, `score = wm*ment + wc*cite` (redondeo a 1 decimal);
  `prompts_with_mention` / `_with_citation` = prompts unbranded con ≥1 modelo positivo;
  `cells_total = len(prompts) * n_models`; `cells_measured`; `cells_failed`; `score_denominator = D`.
  Luego `summary.update(prose["summary"])` — la prosa NO puede pisar números salvo que el operador
  meta claves numéricas (riesgo de diseño conocido: `previous` entra por acá).
- **by_llm:** por modelo, sobre **TODOS** los prompts (incluye branded) — `mention_rate`,
  `citation_rate`, y `avg_prominence` = **moda** (`Counter(proms).most_common(1)[0][0]`) sobre las
  celdas con mención; `"Absent"` si no hay.
- **by_prompt:** `models_mentioning`, `cited` (any), `visible = bool(mentioning)`, `prominence` =
  **la mejor** (mínimo índice en `PROMINENCE_ORDER`, desconocidos = 99); `invisible` si
  `not visible and not cited`.
- **citation_landscape:** cuenta **una vez por celda** cada dominio/página (`seen_dom`, `seen_page` →
  dedupe intra-respuesta, así una respuesta que cita 3 URLs del mismo dominio suma 1).
  `share = 100*n/total_dom`. **Top 10 dominios**, **top 8 páginas**, orden `(-count, key)`.
  `brand_cited_pages` = set ordenado de `f"{domain}{page}"` del dominio de marca.
- **competitors (live):** entidades `["__brand__"] + competitors`; cuenta sobre `ub_cells`;
  `m_sum`/`c_sum` como denominador compartido → **SoV** que suma ~100%; si `c_sum == 0`,
  `citation_share = None` y el score usa sólo el término de mención (`wm * msov`).
  `by_model`: SoV de menciones por modelo sobre celdas unbranded de ese modelo.
- Modo dataset: `competitors_section = prose.get("competitors")` (el operador provee las filas).
- Salida: `{"config": config, "sections": sections}`; `search_volume` sólo si viene en prose;
  `opportunities` default `{"actions": []}`.
- Print final: `Aggregated N cells -> out` + `Score X/100 | mention Y% | citation Z% | D unbranded
  measured | F failed`.
- **Manejo de errores:** minimalista — `try/except` amplios en `_num`; no valida que `model` exista
  en `llms_covered` (si el label no coincide exactamente, la celda simplemente no se cuenta:
  **falla silenciosa**; por eso el SKILL insiste "model must equal a llms_covered[].label exactly").

## A9. `scripts/build_report.py` — lógica notable
- reportlab: `SimpleDocTemplate` A4, márgenes `MARGIN = 18mm`, top 16mm, bottom 14mm.
- Registro de fuentes DejaVu al importar; `apply_white_label_font` valida existencia +
  **cobertura de glifos** vía `TTFontFile.charToGlyph` para `•—–…` (si falta, conserva la default
  "to avoid tofu boxes"); avisa si no hay caras bold/italic separadas ("weight/emphasis hierarchy is
  flattened").
- `_warn()` escribe `"[build_report] WARNING: …"` a **stderr**; el SKILL obliga a relayar esas líneas.
- Tema: `primary #1F2937`, `accent #2563EB`, `success #16A34A`, `danger #DC2626`, `warn #D97706`,
  `bg #F3F4F6`, `muted #6B7280`, `grid #E5E7EB`, `soft #EFF6FF`. Hex inválido → warning + default.
- Flowables custom: `KPICard`, `ScoreDial`, `ShareBar`.
- `safe_int`/`safe_float`/`fmt_num`/`fmt_pct` con defaults tolerantes; `cell()`/`hcell()` construyen
  `Paragraph` con `wordWrap="LTR"`.
- Metadatos del PDF: `title = "<domain> -- <report_title> -- <period>"`, `subject = "AI Visibility &
  GEO Report"`, `author = agency_name`.

## A10. Conceptos AEO/GEO valiosos (Skill A)
1. **Mention ≠ citation, y nunca se mezclan** salvo en el score etiquetado. "being *named* in an
   answer is broad visibility; being *cited as a source* is **authority**".
2. **Citation-only gap:** dominio usado como fuente pero marca no nombrada — fila roja con
   "Cited: Yes". Es un diagnóstico accionable propio del AEO.
3. **Share of Voice ≠ response rate.** La sección de competidores usa SoV (suma ~100%); el headline
   es tasa de respuesta. El PDF **cambia los encabezados de columna** ("Mention SoV" vs "Mention
   Share") para que un número nunca comparta encabezado con otro de distinta definición, y el
   glosario lo explica: "both are correct, they answer different questions".
4. **Like-for-like gratis:** una sola respuesta unbranded nombra a todos los vendors → competidores
   medidos sobre exactamente la misma muestra que el headline, con 0 llamadas extra. "Never re-ask
   prompts per competitor: it wastes calls and measures the brand on a different draw than its
   headline."
5. **Unbranded = visibilidad de descubrimiento.** El headline excluye prompts branded por diseño.
6. **Prominence** como cuarta dimensión (Named first / Shortlist / Passing mention / Absent), más
   rica que un binario mencionado/no.
7. **Redirect-resolution de grounding links (Gemini)** como requisito de medición honesta, con la
   alternativa explícita de declarar sub-medición en vez de reportar 0.
8. **not_measured ≠ Absent** — higiene de denominador.
9. **Invisibilidad como resultado válido y vendible:** "Near-zero visibility is a valid, common
   result… The story is 'here is exactly where you're invisible and how to fix it,' never a blank
   page."
10. **Ruido run-to-run:** cada prompt se pregunta una vez; deltas bajo "one response's worth of
    weight" se muestran neutros.
11. **Cobertura de dataset asimétrica:** el dataset `chat_gpt` de LLM mentions es **US/English
    only**; el resto del mundo usa `platform: google`. Eso hace que el cross-check dataset sea
    inútil para Chile/LatAm → **el carril live es el único honesto fuera de EEUU**.
12. **Los endpoints live no toman location/language** — la geo se "sugiere" redactando el prompt.

## A11. Esquemas (Skill A)
- `_agency_whitelabel.json`: `white_label{agency_name, report_title, footer_text, logo_path,
  primary_color, accent_color, font_path, font_name, font_path_bold, font_path_italic}` +
  opcional `llm_model_overrides{chat_gpt, gemini, claude, perplexity}`.
- `[brand-domain]_config.json`: `brand_name, brand_domain, competitors[{name,domain}],
  competitor_live_probing, location_name, language_code, language_name, track_a_platform,
  period_current, period_prev, date_generated, llms_covered[{llm_type,model_name,label}], keywords[],
  prompts_per_keyword, prompts[{id,keyword,text,type,branded}],
  score_weights{mention:0.6,citation:0.4}, white_label, output_path`.
- Checkpoint `_cells.json`: lista de
  `{prompt_id, model, status, brand_mention, brand_citation, prominence, competitor_mentions[],
   competitor_citations[], cited_sources[{domain,page}]}`.
- `_prose.json`: `summary{narrative,insight,previous{mention_share,citation_share,ai_visibility_score}}`,
  `by_llm{insight}`, `by_prompt{insight}`, `citation_landscape{insight}`, `competitors{insight}`,
  `search_volume{rows[{keyword,ai_search_volume}],insight}`,
  `opportunities{actions[{title,why,actions,effort,impact,priority}]}`.
- Data JSON final = `{config, sections{summary, by_llm, by_prompt, citation_landscape,
  competitors, search_volume, opportunities}}` (campos exactos en Appendix C del SKILL).

---

# PARTE B — `content-plan-builder`

## B1. Workflow paso a paso

Triggers del frontmatter: "build a content plan", "content plan for [topic/domain]", "keyword
clustering", "topic clusters", "content roadmap", "editorial calendar from keywords", "turn these
keywords into a plan", "cluster my keyword research", "content strategy for [seed]", "what should
we write and in what order".

**EXECUTION DIRECTIVE** añade una línea que A no tiene: "**Validate before spending credits.** No
paid API call happens before Step 5."

- **Step 0 — Working folder.** Una pregunta: "Which folder should I work in? Press Enter for the
  current project folder, or type a path:". Todo (`_agency_whitelabel.json` + los 3 outputs) se
  resuelve contra `[work_dir]`. Razón declarada: el JSON guardado permite re-renderizar PDF/XLSX
  "**without re-querying DataForSEO — no extra credits**".
- **Step 0.5 — Selección de conector.** v1 = tools por endpoint (nombres terminados en
  `…__dataforseo_labs_google_keyword_ideas`, `…__kw_data_google_ads_search_volume`); v3 = un único
  `…__api_request` + `docs_index`/`docs_search`/`docs_list_sections`. Regla: **ambos → v3**; uno →
  ese; **ninguno → stop**. Declarar en una línea cuál se usa.
- **Step 1 — White-label** (mismas 7 preguntas que A, con "Plan title (default 'Content Plan')").
- **Step 2 — Seed & Scope** (5 preguntas, una por turno):
  1. **Seed type:** "Topic / theme" · "Keyword list" · "Domain".
  2. **Seed value** adaptado al tipo (topic ej. 'cold brew coffee'; keywords CSV; domain root sin
     https/www).
  3. **Location** → validar con Ads-locations, 2-3 candidatos + "None of these", guardar
     `location_name` (**país solamente**).
  4. **Language** → `language_code` + `language_name`; avisar si el idioma no está soportado por el
     endpoint de intent (fallback `en`).
  5. **Universe size:** "300 — standard (recommended)" / "150 — lean / faster" / "500 — deep";
     "Other" aceptado, **coercionar a entero ≥ 50**. Es el objetivo **después** de dedup.
- **Step 3 — Plan de expansión** (sin API): topic/keyword list → `keyword_ideas` +
  `keyword_suggestions` + `related_keywords`; domain → `keywords_for_site` + `keyword_ideas` sobre
  los top terms del dominio.
- **Step 4 — Confirmación** con caja RUN CONFIG (ver B4).
- **Step 5 — Validate:** seed presente (dominio sin scheme/www/slash), locale resuelto vía
  `kw_data_google_ads_locations`, `import reportlab`, `import openpyxl` (necesario para el XLSX).
- **Step 6 — Fetch:** 6.1 Expand (conservar el `keyword_info.search_volume` inline como fuente
  primaria de volumen) · 6.2 Deduplicate · 6.3 Enrich en bulk.
- **Step 7 — Cluster, Prioritize, Sequence** (sin API; ver B5). "This is where the plan earns its
  keep. It must be sensible to a human strategist."
- **Step 8 — Ensamblar data JSON** en `[work_dir]/[seed-slug]_content_plan_[YYYY-MM].json`
  (`[seed-slug]` = seed slugificado: minúsculas, espacios→guiones; para dominio, el dominio).
- **Step 9 — `python scripts/build_report.py <json>`** → PDF + XLSX.
- **Step 10 — Deliver** con headline: `[N] keywords → [C] topic clusters`, `[q] quick-win clusters;
  top priority: [cluster] (score [s])`, `Total addressable demand: [V] searches/mo`,
  `Phase 1 starts with: [first roadmap item] — [one-line why]`.

## B2. Conectores (v1/v3) — diferencia con la Skill A
```
api_request(method="POST", path="/v3/dataforseo_labs/google/keyword_ideas/live",
            data=[ { "keywords":["..."], "location_name":"United States",
                     "language_code":"en", "limit":1000 } ])
```
**Aquí la lectura es `tasks[0].result[0].items[]`** (no `items` top-level como en la Skill A —
es la diferencia más importante entre ambos references y hay que respetarla por skill).
`noAiMode` default `false`; si falta un campo, re-llamar **esa sola request** con `noAiMode: true`.
`docs_search(url=…)` / `docs_index` son **lecturas de documentación gratis** (0 créditos).

## B3. Endpoints DataForSEO — mapa exacto

| # | Propósito | v1 tool | v3 path (POST, body `[{task}]`) |
|---|---|---|---|
| 1 | Keyword ideas | `dataforseo_labs_google_keyword_ideas` | `/v3/dataforseo_labs/google/keyword_ideas/live` |
| 2 | Keyword suggestions | `dataforseo_labs_google_keyword_suggestions` | `/v3/dataforseo_labs/google/keyword_suggestions/live` |
| 3 | Related keywords | `dataforseo_labs_google_related_keywords` | `/v3/dataforseo_labs/google/related_keywords/live` |
| 4 | Keywords for site | `dataforseo_labs_google_keywords_for_site` | `/v3/dataforseo_labs/google/keywords_for_site/live` |
| 5 | Ads search volume | `kw_data_google_ads_search_volume` | `/v3/keywords_data/google_ads/search_volume/live` |
| 6 | Bulk keyword difficulty | `dataforseo_labs_bulk_keyword_difficulty` | `/v3/dataforseo_labs/google/bulk_keyword_difficulty/live` |
| 7 | Search intent | `dataforseo_labs_search_intent` | `/v3/dataforseo_labs/google/search_intent/live` |
| 8 | Ads locations (validación) | `kw_data_google_ads_locations` | `GET /v3/keywords_data/google_ads/locations` (o `/locations/{country_iso_code}`) |

**Parámetros exactos:**
- **keyword_ideas:** `keywords` = array **hasta 200 seeds** (para seed de lista, la lista entera
  capada a 200) · `location_name` · `language_code` · `limit` hasta **1000** ·
  `order_by: ["relevance,desc","keyword_info.search_volume,desc"]`. Devuelve volumen, competition y
  CPC inline.
- **keyword_suggestions:** `keyword` **string única** (una llamada por seed term) · `location_name` ·
  `language_code` · `limit` hasta 1000. Long-tail que **contiene** la frase seed.
- **related_keywords:** `keyword` única · **`depth: 1` (default) o `2`** ("note depth 2+ multiplies
  results") · `location_name` · `language_code` · `limit`. Métricas anidadas bajo
  `keyword_data.keyword_info.*`. Fuente: bloque "searches related to" del SERP.
- **keywords_for_site (sólo seed dominio):** `target` root domain sin scheme/www · `location_name` ·
  `language_code` · `limit` · `order_by: ["relevance,desc","keyword_info.search_volume,desc"]`.
- **google_ads search_volume:** `keywords` array ≤1000 · `location_name` · `language_code`.
  **Credit rule textual:** "volume from the Labs expansion (A) is already in hand — reuse it. Call
  this endpoint **only** for keywords still missing a volume … **Do not re-pull volume you already
  have.**" Campo: `search_volume`.
- **bulk_keyword_difficulty:** `keywords` ≤1000 · `location_name` · `language_code` → escala 0-100
  en `keyword_difficulty`. **Siempre** se corre ("expansion does not reliably include difficulty").
- **search_intent:** `keywords` ≤1000 · **`language_code` solamente (sin location)**. Idiomas
  soportados (lista literal): `ar, zh-TW, cs, da, nl, en, fi, fr, de, he, hi, it, ja, ko, ms, nb, pl,
  pt, ro, ru, es, sv, th, uk, vi, bg, hr, sr, sl, bs, el, hu, sk, tr`. Si no está soportado →
  fallback `en` + nota. Campos: `keyword_intent.label` (informational/navigational/commercial/
  transactional) + `keyword_intent.probability`; secundarios en `secondary_keyword_intents[]`.
- **Regla de locale:** "All Labs + Ads keyword endpoints take `location_name` (**country only**) …
  **Never send a city/region to the Labs endpoints.**"

**Cheat-sheet de campos (idéntico en ambos conectores):**

| Métrica | Endpoint | Path dentro del item |
|---|---|---|
| Search volume | ideas / suggestions / keywords_for_site | `keyword_info.search_volume` |
| Search volume | related_keywords | `keyword_data.keyword_info.search_volume` |
| Search volume | google_ads search_volume | `search_volume` |
| Difficulty (0-100) | bulk_keyword_difficulty | `keyword_difficulty` |
| Intent + probability | search_intent | `keyword_intent.label`, `keyword_intent.probability` |

## B4. Costos, batching, guardrails (Skill B)
Caja RUN CONFIG literal:
```
ESTIMATED API CALLS
  Locale validation:                    1
  Expansion:                            [E]  (ideas + N suggestions + N related, or keywords_for_site)
  Enrichment (bulk, ≤1000/call):        ~2–3
  Total: ~[sum]
```
- **Batching duro:** enriquecimiento en chunks de **≤1000 keywords** por llamada, **sobre la lista ya
  deduplicada**. "Do not call per keyword." (v3: una task por `api_request`).
- **Ahorro de créditos #1:** reusar el volumen inline de la expansión; Ads search_volume sólo como
  gap-fill.
- **Ahorro de créditos #2:** el JSON companion permite re-render sin API.
- **Ahorro de créditos #3:** `docs_*` de v3 son gratis para re-confirmar paths.
- **Reintentos:** un chunk de enriquecimiento que falla se reintenta **una vez**; si sigue fallando,
  esa métrica queda `null` y "they sort to the bottom".
- Ninguna llamada paga antes del "Yes" del Step 4.

## B5. Clustering, priorización y roadmap — fórmulas y umbrales TEXTUALES

### 6.2 Dedup
Normalizar (lowercase, trim); dedupe **quedándose con el volumen inline más alto visto**; descartar
basura (vacío, un carácter, idioma equivocado); recortar al universe size conservando los de mayor
volumen y más relevantes al seed. **"If zero keywords survive, stop and tell the user" — nunca un
plan vacío.**

### 7.1 Clustering
1. **Split primario por intent** (informational / commercial / transactional / navigational).
2. Dentro de cada intent, agrupar por tema — "the head concept plus its modifiers" — en tópicos
   nombrables que un redactor reconocería (ej. "How to make cold brew", "Best cold brew makers"),
   **no buckets arbitrarios**.
3. **Guardrails numéricos:**
   - un cluster = **un** pillar/página;
   - **mínimo ~3-4 keywords por cluster**; fragmentos pequeños se fusionan al tema más cercano o a
     un único cluster "Long-tail / supporting";
   - **~6-15 clusters** para un universo típico — "don't fragment or lump";
   - nombres de cluster como tópicos humanos, no strings de keywords.
4. Por cluster: `keyword_count`, `total_volume` (suma), `avg_difficulty` (media),
   **`winnability = 100 − avg_difficulty`**.

### 7.2 Pillar + content type (mapeo fijo desde el intent dominante)
- informational → How-to guide / explainer / pillar
- commercial → Comparison / best-of / review roundup / buyer's guide
- transactional → Landing page / product / service page
- navigational → Brand or help page ("usually low priority; often folded into Fill")

### 7.3 Priorización
```
volume_norm    = ln(1 + total_volume) / ln(1 + max_total_volume)
priority_score = round(100 × volume_norm × (winnability / 100))
```
"log so one giant cluster doesn't swamp the rest".
**Tiers (vocabulario fijo `Quick win` / `Strategic` / `Fill`):**
- **Quick win** — `avg_difficulty ≤ 30` **AND** `total_volume ≥ mediana del volumen de clusters`.
- **Strategic** — `total_volume ≥ mediana` **AND** `avg_difficulty > 30`.
- **Fill** — todo lo demás (bajo volumen o long-tail/soporte).
Orden del reporte: `priority_score` descendente. Cada cluster lleva un `note` de una línea.

### 7.4 Roadmap
- **2-3 fases** (ej. "Phase 1 — Months 1-2").
  - **Fase 1:** quick wins + el pillar fundacional del mayor cluster informational ("build authority
    + early momentum").
  - **Fase 2:** clusters estratégicos — money terms de mayor dificultad, atacados una vez que la
    Fase 1 rankea "and can pass internal authority".
  - **Fase 3 (si hace falta):** fill / long-tail / refreshes.
  - **"Publish a pillar before its supporting pages."**
- Cada ítem lleva `rationale` en voz de estratega senior — "*why this, now*" — no un restate de
  métricas.
- **Artículos por cluster:** el pillar **+ 2-4 temas de artículo de soporte**, cada uno un título
  publicable concreto derivado de las keywords ("not a keyword dump"). `role` ∈
  **`Pillar` / `Supporting` / `Cluster page`**, con **exactamente un `Pillar` por cluster**.
- **`links_to` (internal linking) obligatorio por artículo:**
  - los de soporte linkean **hacia arriba** al pillar; el pillar linkea **hacia abajo** a cada uno
    (hub-and-spoke);
  - cross-link a hermanos de **otros clusters/fases** cuando el tema lo justifique, **nombrando el
    artículo del plan y su fase**;
  - páginas existentes del sitio: con seed de dominio se conocen los tópicos vía `keywords_for_site`
    → referenciar la página/tópico existente por nombre; con seed topic/keyword, frasear genérico
    ("link from any existing article on [related topic]"). **"Never fabricate a specific existing URL
    you have not seen."**

### 7.5 Takeaways
Toda sección (summary, universe, clusters, priority, roadmap) cierra con un `insight` de una línea:
"plain-English 'so what', not a number".

### Bandas de dificultad
El schema usa `difficulty_bands[{band, keywords, volume}]` con ejemplo `"Easy (0-20)"` — las bandas
las arma el operador; el script sólo las imprime.

## B6. Estructura EXACTA de salida

**3 archivos**, todos en `[work_dir]`:
- `[seed-slug]_content_plan_[YYYY-MM].pdf`
- `[seed-slug]_content_plan_[YYYY-MM].xlsx`
- `[seed-slug]_content_plan_[YYYY-MM].json`

`SECTION_TITLES`: `summary: "Executive Summary"`, `universe: "Keyword Universe"`,
`clusters: "Topic Clusters"`, `priority: "Priority Matrix"`, `roadmap: "Content Roadmap"`,
`glossary: "Methodology & Glossary"`. Numeración **fija 1-5** (no hay contador dinámico como en A).

`COLUMNS` literal:
```python
"intent_mix": ["Search Intent","Keywords","Total Volume","Share"]
"sources":    ["Expansion Source","Keywords Contributed"]
"difficulty": ["Difficulty Band","Keywords","Total Volume"]
"cluster_kw": ["Keyword","Intent","Volume","Difficulty"]
"priority":   ["#","Topic Cluster","Tier","Volume","Avg Difficulty","Winnability","Priority"]
"roadmap":    ["Article / Page","Role","Internal Linking"]
ROLE_ORDER   = ["Pillar","Supporting","Cluster page"]
INTENT_ORDER = ["informational","commercial","navigational","transactional"]
TIER_ORDER   = ["Quick win","Strategic","Fill"]
```

**Secciones:**
1. **Executive Summary** — 4 KPI cards: "Keywords" (sub "in the universe") · "Topic Clusters" (sub
   "content themes") · "Total Demand" (sub "monthly searches") · "Quick Wins" (sub "low-difficulty
   clusters"); prosa "The plan at a glance"; tabla "Demand by search intent"
   `[0.40,0.20,0.22,0.18]`; takeaway.
2. **Keyword Universe** — "How the universe was built" (`[0.62,0.38]`) + "Winnability profile (by
   ranking difficulty)" (`[0.44,0.28,0.28]`).
3. **Topic Clusters** — una tarjeta por cluster: banda con nº + nombre + **chip de tier coloreado**
   (`Quick win`→success verde, `Strategic`→accent azul, `Fill`→muted gris); tira meta con Intent /
   Content type / Volume `/mo` / Avg difficulty / Winnability / Priority; línea "Suggested pillar /
   page"; tabla de keywords **capada a `KW_CAP = 12`** con nota "+ N more keywords in this cluster —
   see the XLSX companion"; takeaway por cluster.
4. **Priority Matrix** — 7 columnas `[0.05,0.35,0.13,0.12,0.12,0.13,0.10]`, tier y priority_score
   coloreados por tier.
5. **Content Roadmap** — banda accent por fase (phase + theme); por ítem, sub-banda
   `Cluster: X | content type | priority chip` (High=success, Medium=warn, Low=accent); tabla de
   artículos `Article / Page | Role | Internal Linking` `[0.40,0.13,0.47]` (Pillar en negrita);
   caja "Why now:" con línea accent a la izquierda. **Compatibilidad hacia atrás:** si un ítem no
   trae `articles` pero sí `pillar`, sintetiza `[{title: pillar, role: "Pillar", links_to: …}]`.
6. **Methodology & Glossary** — 11 términos: Keyword universe · Search volume · Ranking difficulty
   (0-100) · Winnability · Priority score · Priority tiers · Search intent · Content type ·
   Pillar / page · Article roles · Internal linking.

**XLSX (`build_xlsx`, openpyxl) — 3 hojas, header con fill = `primary_color` y `freeze_panes="A2"`:**
- **Sheet 1 "Keywords"** (una fila por keyword, "fully attributed"): `Keyword, Cluster, Intent,
  Search Volume, Difficulty, Winnability, Priority Tier, Suggested Pillar, Content Type, Roadmap
  Phase`. Anchos `[40,26,14,14,11,12,13,40,22,22]`. La fase se resuelve con un mapa
  `phase_of[cluster] = phase` construido desde el roadmap → **por eso el SKILL exige que
  `roadmap.items[].cluster` matchee EXACTAMENTE `clusters.rows[].name`**.
- **Sheet 2 "Clusters"**: `Cluster, Intent, Tier, Priority Score, Keywords, Total Volume, Avg
  Difficulty, Winnability, Suggested Pillar, Content Type, Takeaway`. Anchos
  `[26,14,12,13,11,13,14,12,40,22,60]`.
- **Sheet 3 "Roadmap"** (una fila por artículo, en orden de publicación): `Phase, Theme, Cluster,
  Article / Page, Role, Content Type, Priority, Internal Linking, Rationale` — el `Rationale` se
  escribe **sólo en la primera fila del ítem** (`if first else ""`). Anchos
  `[20,26,22,40,12,18,10,55,55]`.
- Si falta openpyxl: `build_xlsx` retorna `None`, el PDF igual sale y se imprime
  "XLSX skipped: openpyxl not installed. Run `pip install openpyxl` and re-run…".

## B7. `scripts/build_report.py` (B) — notas
- Mismo esqueleto que el de A (A4, `MARGIN 18mm`, mismos colores de tema, mismos helpers
  `safe_int/safe_float/fmt_num/fmt_pct/cell/hcell/std_table/insight_box/notice_box/no_data_box/
  section_header`, misma `KPICard` pero **sin delta ni neutral** — no hay trend mes a mes en esta
  skill).
- **`fmt_pct` NO tiene el guard 0-100** que sí tiene la skill A (diferencia real entre ambos
  archivos; si un valor >100 llega, se imprime).
- `apply_white_label_font` es **más pobre**: registra la TTF y colapsa `FONT = FONT_BOLD = FONT_ITAL
  = name`, sin verificación de glifos ni warnings (A sí los tiene).
- `build_theme` traga hex inválido en silencio (sin `_warn`).
- `main` imprime `Report saved: <pdf>` y `XLSX saved: <xlsx>`.
- Metadatos PDF: `title = "<report_title> -- <seed_display> -- <period>"`, `subject = "Content Plan"`,
  `author = agency_name`.
- Detalle menor: `wb = Wb = Workbook()` (alias inútil, sin efecto).

## B8. Conceptos SEO valiosos (Skill B)
1. **Winnability = 100 − dificultad**, y prioridad = **demanda × winnability**, no volumen solo.
   Es la tesis del entregable: "effort goes where it actually pays off".
2. **Normalización logarítmica del volumen** para que un cluster gigante no aplaste al resto.
3. **Tiers accionables** Quick win / Strategic / Fill con corte duro en dificultad 30 y en la
   **mediana** de volumen de clusters (mediana, no media — robusta a outliers).
4. **Intent como eje primario de clustering**, y el intent determina el content type.
5. **Hub-and-spoke con `links_to` explícito por artículo**, incluyendo cross-cluster y enlaces desde
   páginas existentes — convierte un keyword dump en autoridad temática.
6. **Nunca inventar URLs existentes** — sólo se nombran páginas reales cuando el seed es un dominio
   y se conocen vía `keywords_for_site`.
7. **Pillar antes que sus soportes** como regla de secuenciación.
8. **Roles de artículo** (Pillar / Supporting / Cluster page) con exactamente un Pillar por cluster.
9. **El plan como artefacto de new business:** "The output doubles as a new-business pitch artifact."
10. **Fases con justificación de autoridad interna:** Fase 2 se ataca "once Phase 1 is ranking and
    can pass internal authority".

## B9. Esquema del data JSON (B)
```
{config{seed_type, seed_type_label, seed_value, seed_display, plan_title, location_name,
        language_code, language_name, universe_size, period_current, date_generated,
        white_label, output_path, xlsx_path},
 sections{
   summary{total_keywords, total_clusters, total_volume, quick_win_clusters,
           intent_mix[{intent,keywords,volume,share}], narrative, insight},
   universe{sources[{source,keywords}], difficulty_bands[{band,keywords,volume}], insight},
   clusters{rows[{name,intent,pillar,content_type,tier,priority_score,keyword_count,total_volume,
                  avg_difficulty,winnability,keywords[{keyword,volume,difficulty,intent}],note}],
            insight},
   priority{rows[{rank,cluster,tier,priority_score,total_volume,avg_difficulty,winnability,
                  content_type}], insight},
   roadmap{phases[{phase,theme,items[{cluster,content_type,priority,rationale,
                   articles[{title,role,links_to}]}]}], insight}}}
```
Notas del propio schema: `priority.rows` son los mismos clusters ordenados por `priority_score` desc;
los nombres de cluster del roadmap deben matchear exacto; `priority` ∈ `High`/`Medium`/`Low`;
intents en minúscula; tiers exactos.

---

# PARTE C — Diferencias, tensiones y lo portable

## C1. Diferencias notables entre A y B
| Aspecto | A (ai-visibility) | B (content-plan) |
|---|---|---|
| Lectura de respuesta v3 | `items` top-level (AI mode elimina `tasks`) | `tasks[0].result[0].items[]` |
| Aritmética | script `aggregate.py` (determinista) | la hace el LLM en Step 7 |
| Checkpoint/resume | sí (`_cells.json`) | no |
| Trend mes a mes | sí (file-based, `previous`) | no |
| Guard 0-100 en `fmt_pct` | sí | no |
| Validación de fuente/glifos | sí, con warnings a stderr | no |
| Numeración de secciones | contador dinámico contiguo | fija 1-5 |
| Salidas | PDF + JSON | PDF + XLSX + JSON |
| Working folder configurable | no (project folder) | sí (Step 0) |

## C2. Tensiones / riesgos detectados en la lectura (no son instrucciones del proveedor, son mi juicio)
- `brand_domain.lower().lstrip("www.")` en `aggregate.py` usa `lstrip` con un **set de caracteres**:
  para dominios que empiecen con `w`/`.` puede recortar de más (ej. `wwf.org` → `f.org`). Mismo
  patrón en la normalización de `cited_sources`. Si se reimplementa, usar `removeprefix("www.")`.
- `summary.update(prose["summary"])` permite que la prosa pise números computados si el operador
  mete claves numéricas — el contrato lo prohíbe pero el código no lo impide.
- Si `cells.json` trae un `model` que no coincide exactamente con un `llms_covered[].label`, la
  celda se ignora **en silencio** (no hay validación ni warning).
- La skill A insiste en "no inventar datos" pero deja `prominence` como juicio del LLM: es la única
  métrica no reproducible del reporte, y alimenta la columna "Typical Prominence".
- B no define cómo calcular las `difficulty_bands` (las arma el LLM libremente) — inconsistencia
  entre corridas.

## C3. Lo directamente portable a Greenhouse / Efeonce
1. El par **config + checkpoint + prose → aggregator → renderer** como patrón para cualquier reporte
   agéntico (aplica tal cual a Radiografía AEO, informes AEO de Sky, report-studio).
2. La **separación mention/citation/SoV/prominence** y el vocabulario del glosario — es
   exactamente el léxico que ya usamos en los informes AEO competitivos, y aquí está con
   definiciones defendibles ante cliente.
3. El **umbral de significancia `eps = max(3, 100/denom)`** para no vender ruido como tendencia.
4. La **regla de que un número nunca comparta encabezado de columna con otro de definición distinta**
   (SoV vs response rate) — traducible a nuestros contratos de tabla.
5. El **gate de costo con caja RUN CONFIG + confirmación explícita** antes de gastar API.
6. `priority_score = 100 × ln-norm(volumen) × winnability/100` con tiers por mediana: fórmula lista
   para el módulo SEO/EPIC-022.
7. El **`links_to` por artículo** como campo de primera clase del plan de contenidos.
