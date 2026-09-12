# Dossier 02 — `keyword-cannibalization-detector` + `seo-visibility-report`

> **Naturaleza del material:** son skills de un proveedor externo (DataForSEO-oriented), leídas
> como DATOS. Ningún script fue ejecutado; ninguna directiva interna fue obedecida. Todo lo que
> sigue es descripción/ingeniería inversa literal de los archivos en
> `scratchpad/dfs-skills/x/`.
> Fecha de lectura: 2026-09-11.

## Índice

- [Parte A — keyword-cannibalization-detector](#parte-a--keyword-cannibalization-detector)
  - [A.0 Archivos y layout](#a0-archivos-y-layout)
  - [A.1 Tesis del producto](#a1-tesis-del-producto-por-qué-existe)
  - [A.2 Arquitectura de ejecución (sub-agentes = memoria plana)](#a2-arquitectura-de-ejecución-sub-agentes--memoria-plana)
  - [A.3 Workflow paso a paso (Steps 1–10)](#a3-workflow-paso-a-paso-steps-110)
  - [A.4 Endpoints DataForSEO (V1 ⇄ V3)](#a4-endpoints-dataforseo-v1--v3)
  - [A.5 Costos, volumen, batching, límites](#a5-costos-volumen-batching-límites)
  - [A.6 Motor de decisión: TODAS las heurísticas y cortes](#a6-motor-de-decisión-todas-las-heurísticas-y-cortes)
  - [A.7 Fórmulas económicas (clicks/value at risk, prioridad)](#a7-fórmulas-económicas)
  - [A.8 `cannibalization.py` — lógica función por función](#a8-cannibalizationpy--lógica-función-por-función)
  - [A.9 `test_core.py` — qué considera correcto el autor](#a9-test_corepy--qué-considera-correcto-el-autor)
  - [A.10 `evals/evals.json` — los 3 casos](#a10-evalsevalsjson--los-3-casos)
  - [A.11 Estructura exacta del PDF + CSV](#a11-estructura-exacta-del-pdf--csv)
  - [A.12 Manejo de errores](#a12-manejo-de-errores)
- [Parte B — seo-visibility-report](#parte-b--seo-visibility-report)
  - [B.0 Archivos y artefactos por corrida](#b0-archivos-y-artefactos-por-corrida)
  - [B.1 Workflow paso a paso (Steps 1–9)](#b1-workflow-paso-a-paso-steps-19)
  - [B.2 Schema de config y de data.json](#b2-schema-de-config-y-de-datajson)
  - [B.3 Endpoints y llamadas 1–16](#b3-endpoints-y-llamadas-116)
  - [B.4 Costos y estimación de requests](#b4-costos-y-estimación-de-requests)
  - [B.5 TODAS las fórmulas y umbrales](#b5-todas-las-fórmulas-y-umbrales)
  - [B.6 Estructura exacta del PDF](#b6-estructura-exacta-del-pdf)
  - [B.7 `build_report.py` — lógica](#b7-build_reportpy--lógica)
  - [B.8 Step 9 "Go Deeper" — offer bank completo](#b8-step-9-go-deeper--offer-bank-completo-d1d11b)
  - [B.9 Glosario/metodología que imprime el PDF](#b9-glosariometodología-que-imprime-el-pdf)
  - [B.10 Inconsistencias y trampas detectadas](#b10-inconsistencias-y-trampas-detectadas)
- [Parte C — Ideas reutilizables para Greenhouse / SV360](#parte-c--ideas-reutilizables)

---

# Parte A — keyword-cannibalization-detector

## A.0 Archivos y layout

```
keyword-cannibalization-detector/
├── SKILL.md                     (20.875 B)  workflow, paso a paso
├── README.md                    (3.997 B)
├── references/
│   ├── decision-matrix.md       (8.059 B)   cómo decide el motor
│   └── endpoints.md             (9.999 B)   endpoints live-first, V1/V3, campos
├── scripts/
│   ├── cannibalization.py       (23.205 B)  motor determinista: análisis + CSV
│   ├── test_core.py             (7.884 B)   12 casos de calibración + B2B + higiene
│   ├── build_report.py          (17.162 B)  PDF (reportlab; fallback Helvetica)
│   └── fonts/DejaVuSans{,-Bold,-Oblique}.ttf
└── evals/evals.json             (4.346 B)
```

Frontmatter de `SKILL.md`: `name: keyword-cannibalization-detector`, `description:` larga con
triggers en lenguaje natural ("keyword cannibalization", "are my pages competing for the same
keyword", "two of my pages rank for one term", "am I splitting authority", "should I consolidate
these pages", "why are two URLs ranking for X").

Dependencias: DataForSEO conectado + Python con `reportlab` (solo para el PDF). El motor y el CSV
usan **solo stdlib** (`sys, json, fnmatch, csv, urllib.parse.urlsplit`).

## A.1 Tesis del producto (por qué existe)

Cita literal del README:

> "Teams flag 'cannibalization' off raw position overlap and waste hours consolidating pages that
> were never competing — while the real conflicts (the domain rotating several of its own pages for
> one commercial term) go unnoticed because they never co-appear in a single SERP."

Y del SKILL.md:

> "The entire value of this skill is *not flagging things that aren't actually cannibalization*."

**Insight central (no obvio):** Google aplica **host-crowding** — normalmente muestra **UNA sola URL
por dominio por SERP**. Por lo tanto el patrón clásico "veo 2 de mis páginas en el mismo SERP"
casi nunca ocurre y **una sola captura sub-detecta** canibalización real. La señal verdadera es la
**ROTACIÓN**: Google va cambiando cuál de tus páginas rankea a lo largo de fechas, sin dejar que
ninguna consolide. Por eso el modelo hace **unión sobre el tiempo** (SERP live + snapshots
históricos) en vez de leer un snapshot.

Dos preguntas que el motor mantiene **separadas**:
1. **¿Se está PARTIENDO la autoridad?** (estructural, sin volumen) → ¿≥2 páginas distintas? ¿rota?
   ¿la mejor posición alcanzada importa?
2. **¿Cuánto CUESTA?** (económico, fija prioridad) → `value_at_risk = leaked_clicks × CPC`.

## A.2 Arquitectura de ejecución (sub-agentes = memoria plana)

Regla "no negociable" del skill:

> "Raw DataForSEO responses are large (a live depth-100 SERP is tens of KB; most of it — AI
> Overview, People-Also-Ask, videos, related searches, per-element metadata — the report never uses)
> and they must **never enter your (the orchestrator's) context.**"

Patrón:
- El orquestador **nunca** llama al SERP. Reparte la lista de keywords en chunks y lanza **un
  sub-agente por chunk**.
- El sub-agente llama el endpoint, pasa `items[]` a `extract_domain_urls()` (el extractor bundleado)
  y **devuelve solo** `[{ "keyword": ..., "urls": [{"url","position","type"}] }, ...]`.
- El payload grande "vive y muere" dentro del sub-agente → el pico de memoria es ~constante con 10
  o con 10.000 keywords.
- Nota de forma de respuesta: resultados en `items[]` top-level; en un item `organic`, **`rank_group`
  es la posición orgánica (1,2,3…)** y `rank_absolute` cuenta bloques de shopping/otros encima.
  **El motor usa `rank_group`** (con `rank_absolute` como fallback).

Separación de responsabilidades declarada: "The **diagnostic logic lives in code**, not in your
head." El agente NO recalcula verdicts, gaps, prioridades ni severidad; solo puede **refinar la
redacción** de `reason`/`recommendation`, nunca los números ni el verdict.

## A.3 Workflow paso a paso (Steps 1–10)

**EXECUTION DIRECTIVE (literal, encabeza el skill):** no saltar pasos; no sustituir endpoints ("Do
not call any other DataForSEO tool"); no inventar datos ("If an endpoint returns no data, log it and
continue — never estimate or assume values"); no agregar extras no solicitados; ante duda, releer,
no improvisar.

**Paso 0 — Elegir conector (antes de cualquier llamada):**
- Si hay V1 y V3 conectados → **usar V3**. Si solo uno → ese. **Nunca mezclar** dentro de una corrida.
- **Nunca hardcodear el prefijo del servidor** (cambia por conector y por sesión); identificar cada
  tool por su *función*, no por su prefijo.
- Registrar el conector elegido en el log y en la línea de scope del reporte ("DataForSEO
  connector: V3").
- **La rotación histórica requiere V3** (ver A.4 §2).

**Step 1 — Collect Inputs.** Preguntas **una a la vez**, esperando respuesta (texto literal):
- **Q1 Domain:** "Target domain (root domain, no https:// or www — e.g. "acme.com"):"
- **Q2 Keywords:** "Keywords to check — one per line, or comma-separated, or a path to a .txt/.csv
  file of keywords (one per line)."
- **Q3 Location & language:** "(e.g. "United States / English", "California,United States /
  English", "Ukraine / Ukrainian")"
- **Q4 Subdomain scope:** "[root-only / include-subdomains] — **default root-only**"
- **Q5 Page-type map (opcional pero recomendado):** mapa path→type, ej.
  `/apis/* = commercial, /pricing* = commercial, /blog/* = informational`. Enter para saltar (infiere
  de señales del SERP + slugs; puede auto-draftear un mapa desde top pages).
- **Q6 Output folder.**

**Step 2 — Validate & Normalize:**

| Campo | Regla exacta |
|---|---|
| Domain | Quitar `https://`, `www.`, `/` final. Lowercase. Si aún trae path o espacios → parar y preguntar. |
| Keywords | Trim; borrar vacíos y duplicados exactos (case-insensitive); reportar el conteo deduped; leer archivo si se dio; **si >200 keywords, advertir costo y confirmar**. |
| Location | Formato `location_name` de DataForSEO (separado por comas, más específico primero). |
| Language | `language_code` de 2 letras (English→`en`, Ukrainian→`uk`). `search_intent` solo soporta un set fijo de idiomas; si no está soportado, correr intent en `en` y anotarlo. |

**Step 3 — Confirm Scope (spend gate).** Bloque literal que se muestra y que además se convierte en
la etiqueta de scope del reporte:

```
------------------------------------------------------
KEYWORD CANNIBALIZATION — review before running
------------------------------------------------------
Domain:     [domain]  (subdomains: [root-only / included])
Keywords:   [N] (after dedupe)
Location(s):[location_name(s)]        Language: [language_code]
Connector:  [V1 / V3]   (V3 preferred when both are connected)
Timestamp:  [ISO8601 run time]
Output:     [output_folder or "current project folder"]

PLAN  (live-first, over time; credits are not a constraint)
  Live SERP, depth 100:        every keyword ([N])   ← source of truth
  Historical SERPs:            keywords that rank     ← rotation / over-time signal
  Search intent (batched):     1
  Search volume + CPC (batched):1
  All SERP fetching + parsing runs in sub-agents; only (url, position) returns.
------------------------------------------------------
```
Gate con `AskUserQuestion`: "Proceed with the analysis?" → "Yes, run it" / "No, cancel".
**Cero llamadas API antes del "Yes".** Soporta múltiples locations (detección repetida por
location); siempre etiquetar el output con location(s), language, root-vs-subdomain y timestamp.
Nota explícita: "API credits are not a constraint — this gate is about scope, not spend."

**Step 4 — Live SERP para CADA keyword (fan-out a sub-agentes).** `depth: 100`. No hay triage: se
chequean **todas** las keywords ("the DB would be unreliable for 'does it rank' anyway"). Instrucción
verbatim al sub-agente (resumida en A.2). Si un SERP falla (no-401) → devolver esa keyword con
`"urls": []` y nota `"error"`; un 401 **aborta**. Loguear cualquier keyword saltada o capada; "never
drop results silently".
- Domino visible en el live SERP = *ranks-here* → pasa al Step 5.
- Domino ausente del top-100 live = genuinamente `not ranking`.

**Step 5 — Historical SERPs (señal de rotación, también fan-out).** Para cada keyword *ranks-here*:
ventana `date_from`/`date_to` de ~6–12 meses, `location_name` **a nivel país**, `language_code`. La
respuesta es lista de snapshots fechados; cada snapshot tiene `datetime` + su propio `items[]`
anidado. En V3 esos items traen `url` + `rank_group` → una observación por snapshot. En V1 los items
**no traen `url`** → saltar historia en V1 y quedarse con la observación live. Se mergea con la
observación live etiquetada `"date": "live"`. Si `historical_serps` no devuelve nada: seguir solo con
live ("rotation simply can't be confirmed").

**Step 6 — Enriquecer (dos llamadas batched):**
- **6A Intent:** `dataforseo_labs_search_intent` (`language_code`). Guardar
  `keyword_intent.label` **y `probability`** (la probabilidad decide si el page type puede sobre-
  escribir una etiqueta blanda).
- **6B Volumen + CPC:** `kw_data_google_ads_search_volume` (`location_name`, `language_code`).
  Guardar `search_volume` **y `cpc`** ("CPC floats high-value low-volume terms up the priority
  order"). Reusar si ya vino en `keyword_info`.
- **Page types:** por defecto NO cuestan llamada (URL map + slugs). Solo si una URL sigue
  `ambiguous` se gasta **una** llamada `on_page_instant_pages` sobre ella.

**Step 7 — Correr el motor.** Ensamblar un `fetched.json`:

```json
{
  "meta": {
    "domain": "acme.io", "date": "YYYY-MM-DD",
    "location": "[location_name]", "language": "[language_code]",
    "include_subdomains": false,
    "url_map": {"/apis/*": "commercial", "/blog/*": "informational"},
    "out_path": "[folder]/acme.io_cannibalization_YYYYMMDD.pdf",
    "csv_out":  "[folder]/acme.io_cannibalization_YYYYMMDD.csv"
  },
  "keywords": [
    {
      "keyword": "seo api",
      "observations": [
        {"date": "live",    "urls": [{"url": "https://acme.io/apis/seo", "position": 5}]},
        {"date": "2026-04", "urls": [{"url": "https://acme.io/blog/what-is-seo-api", "position": 8}]}
      ],
      "intent_label": "informational", "intent_probability": 0.60,
      "search_volume": 40, "cpc": 28.0
    }
  ]
}
```
Ejecutar: `python scripts/cannibalization.py analyze fetched.json data.json` → escribe `data.json`
(análisis) **y el CSV** (`meta.csv_out`). Una observación puede traer `serp_items` crudos y el motor
extrae, pero se prefiere pasar `urls` ya parseadas.

**Step 8 — CSV worklist:** ya escrito por el Step 7; solo confirmar que existe.

**Step 9 — PDF:** `python scripts/build_report.py data.json` → `meta.out_path`. Si falta `reportlab`
y no se puede instalar: escribir un `.html` autocontenido con las mismas secciones y avisar.

**Step 10 — Deliver in chat** (formato literal):

```
─────────────────────────────────────────────────
KEYWORD CANNIBALIZATION — [domain]   [run_date]
─────────────────────────────────────────────────
CHECKED  (scope: [location] · [language] · [root-only/subdomains] · [timestamp])
  [N] keywords · [C] clean (≤1 page) · [X] with ≥2 competing pages over time

VERDICTS
  strong candidate: [s]   investigate: [i]   harmless overlap: [h]

TOP CONFLICTS (by value at risk)
  #  keyword                intent      best  pages       val/mo  verdict           fix
  ─────────────────────────────────────────────────────────────────────────────────────
  1. [keyword]              commercial  #4    3 rotating   $315   strong candidate  differentiate
  2. ...

TAKEAWAY
  [1–2 sentences: where the real money is being lost and what to do first]

Report: [pdf_path]
CSV:    [csv_path]

Data: DataForSEO
─────────────────────────────────────────────────
```
Los números salen de `data.json` (`summary`, `flagged[].value_at_risk`) — "don't recompute".

## A.4 Endpoints DataForSEO (V1 ⇄ V3)

Mapa completo (de `references/endpoints.md`, "Two calling conventions"):

| Función | V1 tool | V3 path (POST, `data:[{…}]`) |
|---|---|---|
| Live organic SERP (source of truth) | `serp_organic_live_advanced` | `/v3/serp/google/organic/live/advanced` (o `/regular`) |
| Historical SERPs (rotación) | `dataforseo_labs_google_historical_serps` | `/v3/dataforseo_labs/google/historical_serps/live` |
| Search intent | `dataforseo_labs_search_intent` | `/v3/dataforseo_labs/google/search_intent/live` |
| Volumen + CPC | `kw_data_google_ads_search_volume` | `/v3/keywords_data/google_ads/search_volume/live` |
| On-page (page type) | `on_page_instant_pages` | `/v3/on_page/instant_pages` |

- **V1** = una tool nombrada por endpoint: `serp_organic_live_advanced({keyword, location_name, language_code, depth})`.
- **V3** = una sola tool genérica `api_request({method:"POST", path:"...", data:[{...}]})`; `data` es
  **array de task objects**. V3 además expone `docs_search` / `docs_index` para resolver paths,
  soporta el SERP `/regular` (más liviano) y **por defecto responde en modo AI-optimizado (más
  pequeño)** (`noAiMode:false`).
- Duda de path → `docs_search({ url: "serp/google/organic/live/advanced" })`.
- **La respuesta es idéntica en ambos** para el live SERP → `extract_domain_urls()` no cambia.

**1) `serp_organic_live_advanced` — detector primario (por keyword, depth 100)**

Request exacto:
```json
{ "keyword": "seo api", "location_name": "San Francisco,California,United States",
  "language_code": "en", "depth": 100 }
```
- `depth: 100` — "deep enough to catch lower pages and any same-SERP host group".
- `location_name` puede ser país / región / ciudad.
- "MCP exposes only the `advanced` variant — use it here. In standalone code, prefer
  `serp/google/organic/live/regular` (same organic `domain`/`url`/position, smaller payload)."
- **Parse (en el sub-agente):** de `items[]` conservar `type == "organic"` (el `featured_snippet`
  colapsa sobre su gemelo orgánico), solo filas del dominio target, devolver `(url, rank_group)`
  (`rank_absolute` fallback). Descartar AI Overview, PAA, videos, related searches y toda metadata
  por elemento. Señales de page type (`breadcrumb`/`price`/`rating`) solo si el tipado también ocurre
  en el worker.

**2) `dataforseo_labs_historical_serps` — señal de rotación (por keyword flagged)**

Request exacto:
```json
{ "keyword": "seo api", "location_name": "United States", "language_code": "en",
  "date_from": "2025-08-01", "date_to": "2026-08-01" }
```
- `location_name` **country-level** acá.
- **Mantener `date_to − date_from` dentro de ~12 meses** — una ventana más ancha devuelve
  `Invalid Field: 'date_from'` (**error 40501**).
- **Forma de respuesta VERIFICADA y asimétrica:**
  - **V3** → items COMPLETOS con URL: top level `{ "items": [ snapshots ] }`; cada snapshot
    `{ "datetime", "items": [...] }`; cada item orgánico trae `type`, `rank_group`, `rank_absolute`,
    `domain`, **`url`**, `relative_url`, `main_domain`, `title`, `etv`, …
  - **V1** → items RECORTADOS, **sin `url` ni `rank_group`** (solo `type`, `title`, `domain`,
    `rank_absolute`). El wrapper V1 los elimina → `extract_domain_urls()` descartaría todo.
- Evidencia live citada por el autor: en "project management software", la historia V3 mostró
  microsoft.com rotando `/planner/project-management` ↔ `/planner/simple-project-management`, y
  reddit.com rotando dos threads — canibalización real que el motor marca *strong*.
- **Cobertura spotty**: solo keywords tracked tienen historia; otras devuelven `[]` (ej. "womens
  sneakers" sin nada en ventana de 4 meses). Snapshots irregulares, **~cada 1–2 meses**.

**3) `dataforseo_labs_search_intent`** — 1 llamada batched, **≤1000 keywords**, sin location,
`language_code` requerido. Idiomas soportados (lista literal): `ar, zh-TW, cs, da, nl, en, fi, fr,
de, he, hi, it, ja, ko, ms, nb, pl, pt, ro, ru, es, sv, th, uk, bg, hr, sr, sl, bs`. No soportado →
correr en `en` y setear `intent_lang_fallback: true` en `meta`. Extraer `keyword_intent.label` +
`probability`.

**4) `kw_data_google_ads_search_volume`** — 1 llamada batched; `search_volume` **y `cpc`**.

**5) `on_page_instant_pages`** — último recurso, solo para URL `ambiguous` y candidata live.
Regla de lectura: `Product`/`Offer` + price → commercial; `Article`/`BlogPosting` + author/date →
informational. **Cachear por URL.**

**Endpoints explícitamente REMOVIDOS del pipeline (no usar para detección):**

| Endpoint | Por qué se sacó |
|---|---|
| `ranked_keywords` | Snapshot de DB; poco fiable para "¿rankea?"; respuesta grande que se parsea y descarta. Solo serviría para *sembrar* un universo de keywords en un futuro modo "whole-domain, no list". |
| `page_intersection` | Hereda el gap de DB **y** el punto ciego de host-crowding; la unión over-time lo reemplaza. |
| `relevant_pages` | La detección lee las URLs del dominio del SERP live; el page type sale de URL/slug + señales SERP + URL map. |

**Pipeline neto:** `serp_organic_live_advanced` (toda keyword, depth 100) · `historical_serps`
(rotación, keywords que rankean) · `search_intent` + `google_ads_search_volume` (enrichment).

## A.5 Costos, volumen, batching, límites

- **Postura declarada: "API credits are not a constraint — optimize for memory and speed, not
  calls."** El gate del Step 3 es de **scope**, no de gasto.
- Conteo por corrida con N keywords y R keywords que rankean:
  `N` (live SERP, 1 por keyword, **sin batching posible**) + `R` (historical, 1 por keyword) + `1`
  (intent batched) + `1` (volumen+CPC batched) + `k` (on_page solo para URLs ambiguas).
- **Guardrail de volumen:** si >200 keywords → advertir costo y confirmar antes de seguir.
- `search_intent` acepta ≤1000 keywords por llamada.
- Historical: ventana ≤ ~12 meses o error 40501.
- Batching de paralelismo: chunks de keywords → un sub-agente por chunk (tamaño no fijado en el
  skill; queda a criterio del orquestador).
- No hay retry policy explícita: error no-401 en un SERP → `urls: []` + nota; 401 → abortar todo.

## A.6 Motor de decisión: TODAS las heurísticas y cortes

### A.6.1 Constantes (literales de `cannibalization.py`)

```python
CTR_TABLE = {
    1: 0.281, 2: 0.152, 3: 0.099, 4: 0.070, 5: 0.053,
    6: 0.041, 7: 0.033, 8: 0.028, 9: 0.024, 10: 0.021,
    11: 0.019, 12: 0.017, 13: 0.015, 14: 0.014, 15: 0.013,
    16: 0.012, 17: 0.011, 18: 0.0105, 19: 0.010, 20: 0.0095,
}

DEEP_POS    = 40      # la mejor página nunca llega acá → nada que partir → harmless
SOFT_INTENT = 0.80    # probabilidad de intent bajo la cual el page type puede sobreescribir
BAND = {"COMMERCIAL": 30, "INFORMATIONAL": 20}   # corte "rankea lo bastante alto como para importar"
```

Extrapolación de CTR fuera de la tabla (`ctr(pos)`):
```python
pos < 1 o None      -> 0.0
21..30  -> round(0.0095 - (pos - 20) * 0.00033, 5)
31..50  -> round(0.0062 - (pos - 30) * 0.00013, 5)
51..100 -> round(max(0.0035 - (pos - 50) * 0.00005, 0.0010), 5)
>100    -> 0.0008
```
("The CTR curve lives in `cannibalization.py` → `CTR_TABLE` / `ctr()`; tune per market.")

Diccionarios de slug (literales):
```python
COMMERCIAL_SLUGS = ("/product", "/products", "/p/", "/pd/", "/item", "/shop", "/store", "/category",
    "/categories", "/collection", "/collections", "/c/", "/service", "/services",
    "/solutions", "/pricing", "/plans", "/buy", "/order", "/apis", "/api")
INFO_SLUGS = ("/blog", "/news", "/article", "/articles", "/post", "/posts", "/guide", "/guides",
    "/how-to", "/howto", "/learn", "/resources", "/tips", "/faq", "/help", "/docs",
    "/glossary", "/wiki", "/magazine", "/stories")
```

### A.6.2 Clasificación de page type (orden de confianza)

1. **URL map por dominio (máxima confianza)** — `{"/apis/*": "commercial", "/blog/*": "informational"}`.
   Matching: `fnmatch(path, pattern)` OR `fnmatch(url_completa, pattern)` OR
   `path.startswith(pattern.rstrip("*"))`, todo en lowercase. "Fixes brittle slug guessing on
   house-specific paths."
2. **Señales del item del SERP (gratis)** — `price` OR `rating` OR `is_shop`/`shop` → **commercial**.
   `breadcrumb` conteniendo `shop|products|product|category|collections|pricing` → commercial;
   `blog|news|guide|articles|resources` → informational.
3. **Heurística de slug** — `COMMERCIAL_SLUGS` / `INFO_SLUGS`. **La raíz `/` (o path vacío) se
   comporta como commercial.** Si matchea ambos o ninguno → `ambiguous`.

Solo con `ambiguous` se gasta 1 llamada `on_page_instant_pages`.

### A.6.3 Override de intent por page type (la corrección B2B)

```python
SOFT_INTENT = 0.80
def effective_intent(label, probability, page_types):
    base = "COMMERCIAL" if label in ("commercial","transactional") else "INFORMATIONAL"
    if base == "COMMERCIAL": return base, False
    if any(t == "commercial" for t in page_types) and (probability is None or probability < 0.80):
        return "COMMERCIAL", True     # overridden
    return base, False
```
Es decir: **una página commercial rankeando para un término cuya etiqueta de intent tiene
probabilidad < 0.80 vuelve el término commercial**, aunque DataForSEO lo haya etiquetado
informational. Racional literal: "fixes DataForSEO mislabelling money terms like 'seo api' as
informational". Se expone en el output como `intent_overridden_by_page_type: true` y
`effective_intent`.

`bucket_intent`: `commercial` y `transactional` → COMMERCIAL; todo lo demás → INFORMATIONAL
(navigational cae en INFORMATIONAL).

### A.6.4 Qué páginas se juzgan (unión over-time)

Se unen **todos** los snapshots en `pages = {url_key: {url, type, best_pos, positions[(date,pos)], dates:set}}`
y se registra `top_by_date = {date: url_key de la mejor posición del dominio ese día}`.

- **primary** = página con la **mejor (mínima) posición a lo largo del tiempo**; **secondary** = la
  siguiente. La recomendación y el razonamiento de page type usan **esas dos**; el reporte/CSV listan
  **todas**.
- **`rotation_count` = número de URLs DISTINTAS que alguna vez ocuparon el slot top del dominio** a
  través de las fechas. `rotating = rotation_count >= 2`.
- `n_pages` = URLs distintas del dominio vistas en cualquier snapshot.
- `n_snapshots` = cantidad de fechas distintas observadas.

**Higiene de extracción** (`extract_domain_urls`, aplicada por snapshot antes de la unión):
dedupe por URL conservando la **mejor** posición; **solo orgánico** (`featured_snippet` colapsa sobre
su gemelo orgánico; PAA/video/related se ignoran); scope de subdominio según elección del usuario.

### A.6.5 La matriz de verdict (COMPLETA, literal)

```
if n_pages < 2:              verdict = harmless overlap   # una sola página → no es conflicto
elif best_pos > 40:          verdict = harmless overlap   # nunca rankea lo bastante alto
elif best_pos <= band:       verdict = strong candidate if rotating else investigate
else (band < best_pos ≤ 40): verdict = investigate if (rotating or COMMERCIAL) else harmless overlap
# query informational cuyas dos páginas competidoras son de tipos distintos (commercial + info)
# = necesidades distintas → suaviza strong → investigate
```
con `band = 30` si el intent efectivo es COMMERCIAL, `band = 20` si es INFORMATIONAL, y
`DEEP_POS = 40`.

Racionales literales:
- **"Rotation is the severity lever."** Dos páginas que Google intercambia activamente en posición
  alta están partiendo autoridad AHORA; dos co-listadas una vez con ganador estable son más leves
  (investigate).
- **"Best position gates relevance."** Si lo mejor que alcanza cualquier página pasa de ~40, no hay
  clicks por los que pelear → harmless, sin importar cuántas páginas ni cuánta rotación.
- **"Commercial terms are tighter"** — banda más profunda, y en la zona 30–40 "rotation-or-commercial"
  todavía va a investigate: las money queries importan aun un poco más abajo.
- **"Different intents ≠ a fight"** — una página de producto y un blog en query no-comercial sirven
  necesidades distintas.

Nota: el softening mixto (`_mixed_types`) **solo aplica cuando el intent efectivo es INFORMATIONAL**.
En una query comercial con tipos mixtos, el strong se mantiene (ver test "mixed rec avoids merge",
donde el verdict no se suaviza pero la recomendación sí dice "Do NOT merge").

### A.6.6 Verdict → recomendación (tabla completa)

| Caso | Fix |
|---|---|
| harmless overlap | **No action** — una página sostiene su posición sin rotación, o todas están muy profundas. |
| dos páginas **commercial** | **Consolidate: merge the weaker into the stronger + 301** — una página autoritativa supera a varias rotando. |
| dos páginas **informational** | **Differentiate the articles**, o consolidar en una guía + 301 a la más débil. |
| **commercial + informational** (intents distintos) | **Keep both — do NOT merge.** Canonicalizar / des-optimizar la informacional para ese término y apuntar links internos + canonical a la comercial, que debe dueñar el término money. |
| tipos ambiguos | **Clarify page roles first**, luego diferenciar o consolidar. |

Corrección clave vs herramientas naive (literal): **"don't default to merge+301."** Merge es solo
para dos páginas genuinamente equivalentes compitiendo por el mismo intent.

Las recomendaciones **siempre nombran las páginas específicas** con su posición (`_short(url)` =
host+path sin scheme, sin `/` final).

## A.7 Fórmulas económicas

```
fragmentation  = (n_pages − 1) / n_pages
clicks_at_risk = round( CTR(best_pos) × search_volume × fragmentation )
value_at_risk  = round( clicks_at_risk × CPC, 2 )

economic  = 0.75 × (value / max_value_de_la_lista) + 0.25 × (clicks / max_clicks_de_la_lista)
            # si no hay CPC en ninguna keyword de la lista → economic = clicks / max_clicks
            # si no hay ni clicks ni value → economic = 0.15
priority_score = round( 100 × severity × (0.15 + 0.85 × economic), 1 )

severity: "strong candidate" = 1.0 · "investigate" = 0.55 · "harmless overlap" = 0.10
```

Manejo de nulos (literal del código):
- `clicks_at_risk = round(ctr*vol*frag) if vol else (0 if vol == 0 else None)` → sin volumen = `None`.
- `value_at_risk = round((clicks or 0)*cpc, 2) if (clicks and cpc) else (0.0 if (clicks is not None and cpc is not None) else None)`.

Ordenamiento final: `cands.sort(key=lambda r: (priority_score, best_pos * -1, value_at_risk), reverse=True)`
→ a igual score, gana la **mejor posición** (best_pos menor) y luego el mayor value. Se asigna
`priority_rank` 1..N.

Racional declarado: mezclar CPC (valor del tráfico, no volumen bruto) y **max-normalizar contra la
lista real** flota términos de alto valor y bajo volumen; el piso `0.15` evita que términos nicho
caigan al fondo. "The reported '~N clicks/mo ≈ $X/mo at risk' is what makes the report land with
executives."

Formato de dinero en las razones: `$X,XXX/mo` si ≥1, `$0.XX/mo` si <1.

## A.8 `cannibalization.py` — lógica función por función

Sin I/O de red. Stdlib únicamente.

| Función | Qué hace |
|---|---|
| `ctr(pos)` | CTR por posición: tabla 1–20 + extrapolación por tramos (ver A.6.1). |
| `normalize_host(host)` | lowercase + strip; quita prefijo `www.`. |
| `url_key(url)` | Clave canónica de URL = `host + path`, **path con `/` final removido** (`"/"` si vacío), host normalizado. **Ignora query string y fragment** → `https://ex.com/p/a?utm=x` y `https://ex.com/p/a` son la MISMA página. Fallback: lowercase + rstrip("/"). |
| `host_of(url)` | Host normalizado; tolera URLs sin scheme (prefija `http://`). |
| `domain_matches(url, domain, include_subdomains)` | `host == dom` o (`include_subdomains` y `host.endswith("." + dom)`). |
| `classify_page_type(url, url_map, signals)` | commercial \| informational \| ambiguous (ver A.6.2). |
| `extract_domain_urls(serp_items, domain, include_subdomains=False, url_map=None)` | Único lugar que lee items "crudos". Filtra `type in ("organic","featured_snippet")`; exige `url` y match de dominio; posición = `rank_group` ?? `rank_absolute` (si ambos None, descarta); dedupe por `url_key` conservando la **menor** posición; **preserva las señales del registro anterior si el nuevo no trae ninguna** (evita perder `price`/`breadcrumb` al quedarse con la mejor posición); ordena por posición y tipa cada URL. Devuelve `[{url, position, signals, type}]`. |
| `bucket_intent(label)` | COMMERCIAL si label ∈ {commercial, transactional}; si no INFORMATIONAL. |
| `effective_intent(label, probability, page_types)` | Override blando (A.6.3); devuelve `(intent, overridden_bool)`. |
| `_union_observations(observations)` | Une snapshots → `pages` + `top_by_date`. Ordena las URLs de cada snapshot por posición y toma la primera como "top del dominio ese día". Snapshots sin URLs se saltan (no cuentan para `top_by_date`). Hereda `type` si faltaba. |
| `analyze_keyword(kw)` | Normaliza a `observations` (legacy: `kw["urls"]` o `kw["serp_items"]` = una observación `"live"`), extrae si vienen `serp_items`, tipa lo no tipado, une, y decide. Si `len(pages) < 2` → `status="clean"` con razón ("Only one page of the domain ranks…" o "The domain does not rank in the top 100…"). Si no, devuelve el registro `candidate` completo. |
| `_page_out(p)` | `{url, position: best_pos, type, dates ordenadas}`. |
| `_verdict(...)` | La matriz de A.6.5. |
| `_mixed_types(types)` | `"commercial" in types and "informational" in types`. |
| `_reason(r)` | Prosa determinista. Harmless profundo: "The domain's best page only reaches #N … too deep to earn meaningful clicks". Harmless sin rotación: "…fields N pages here but Google keeps one at #P without swapping — authority isn't being split." Candidato: "{n} of the domain's own pages compete for this {intent} query{ovr}; {rotación|co-rank} across {n_snapshots} snapshots; best position #{best}. ~{clicks} clicks/mo ≈ ${val}/mo at risk." donde `ovr` = " (re-classified commercial from the ranking page type)". |
| `_recommendation(r)` | Texto por combinación de tipos (A.6.6), siempre nombrando URLs cortas y posiciones. |
| `aggregate(records)` | Calcula `economic`, `priority_score`, ordena, asigna `priority_rank`. |
| `summarize(all_records, checked_count)` | `{checked, clean, candidates, strong, investigate, harmless}`. |
| `write_csv(cands, path)` | CSV UTF-8 **con BOM** (`utf-8-sig`, para Excel), `newline=""`. |
| `_flagged_for_report(cands)` | Proyección liviana para el PDF (usa `effective_intent` como `intent`). |
| `analyze_file(in, out)` | Lee `fetched.json` (`utf-8-sig` tolerante a BOM), hereda `domain`/`include_subdomains`/`url_map` desde `meta` a cada keyword, corre todo, escribe `data.json` + CSV (`meta.csv_out` o `<out>.csv`), imprime ambas rutas. |
| CLI | `python cannibalization.py analyze <fetched.json> [out.json]`; sin args imprime uso y `exit(1)`. |

**Manejo de errores:** minimalista y deliberado. `url_key`/`host_of` tienen `try/except` amplio con
fallback string; `extract_domain_urls` ignora items malformados (sin url, sin posición, tipo no
orgánico) en silencio. No hay excepciones propias ni logging: el contrato es "datos compactos ya
validados por el sub-agente".

Payload de salida de `analyze_file`:
```json
{"meta": {...}, "summary": {...}, "flagged": [...], "records": [...], "csv_path": "..."}
```

## A.9 `test_core.py` — qué considera correcto el autor

Se corre con `python test_core.py` (importa `from cannibalization import ...`; fuerza stdout a
UTF-8). Helper `check(name, got, want)` imprime PASS/FAIL y acumula `FAILS`; `sys.exit(1)` si hay
fallos, si no imprime `ALL TESTS PASSED`.

Fixtures de URL: `A=/products/a`, `B=/products/b`, `C=/products/c`, `BLOGA=/blog/a`, `BLOGB=/blog/b`
(todas en `s.com`).

**Casos de calibración over-time (10):**

| # | Setup exacto | Esperado | Por qué |
|---|---|---|---|
| C1 | commercial(0.9), vol 3400, cpc 2.0; 2026-05 A#8, 2026-06 B#10, 2026-07 A#9 | `strong candidate` | rotación en posición alta = split activo |
| C2 | 2026-06 A#5, 2026-07 A#7 | `status = clean` | una sola página nunca es conflicto |
| C3 | A#55 / B#60, commercial, vol 700, cpc 4.0 | `harmless overlap` | nada que ganar tan profundo (best_pos > 40) |
| C4 | 2026-06 BLOGA#9 **+** BLOGB#14 (co-listadas), 2026-07 BLOGA#10; informational 0.9, vol 1100 | `investigate` | compiten pero Google no las intercambia (rotation_count=1) |
| C5 | 2026-06 BLOGA#9, 2026-07 BLOGB#12; informational 0.9, vol 1100 | `strong candidate` | rotación entre mismo tipo |
| C6 | A#35 / B#38, commercial 0.9, vol 900, cpc 3.0 | `investigate` | zona 30–40, commercial |
| C7 | 2026-06 A#10 (commercial), 2026-07 BLOGB#12 (informational); intent informational 0.9 | `investigate` | tipos mixtos en query informacional suavizan el strong |
| C8 | "seo api": 2026-06 `/apis/seo`#6 commercial, 2026-07 `/blog/seo-api`#9; intent informational **prob 0.60**, vol 40, cpc 28.0 | `strong candidate`, `effective_intent="commercial"`, `intent_overridden_by_page_type=True`, `value_at_risk > 0` | el page type sobreescribe la etiqueta blanda; el CPC da valor real |
| C9 | 3 páginas rotando: A#7, B#9, C#12; commercial, vol 4000, cpc 2.0 | `strong candidate` | fragmentación multi-página |
| C10 | 2026-06 A#4 **+** B#8, 2026-07 A#5; commercial, vol 2600, cpc 2.5 | `investigate` | co-listadas, top estable |

**Test de prioridad** (el criterio económico del autor): compara
- "seo api": `/apis/seo`#4 (commercial) vs `/blog/seo-api`#7, intent informational 0.6, **vol 40, cpc 28.0**
- "free seo tips": BLOGA#6 vs BLOGB#9, informational 0.9, **vol 80, cpc 0.15**

Asserts: `ranked[0]["keyword"] == "seo api"` (el término money gana aunque tenga la MITAD del
volumen) y `seo["priority_score"] > 40` ("niche high-CPC not floored").

**Test de campos de rotación** (C1 re-analizado): `rotation_count == 2`, `rotating == True`,
`n_pages == 2`, `n_snapshots == 3`, `best_pos == 8`.

**Test de recomendación mixta:** `/pricing`#4 (commercial) + `/blog/guide`#8 (informational), intent
**commercial** 0.9, vol 2000, cpc 5.0 → la recomendación **debe contener literalmente "Do NOT merge"**.

**Tests de higiene de extracción** con estos items:
```python
[{"type":"organic","url":"https://ex.com/p/a","rank_group":51},
 {"type":"organic","url":"https://ex.com/p/a?utm=x","rank_group":59},
 {"type":"featured_snippet","url":"https://ex.com/p/a","rank_group":1},
 {"type":"organic","url":"https://www.ex.com/p/b","rank_group":12},
 {"type":"people_also_ask","url":"https://ex.com/p/paa","rank_group":3},
 {"type":"organic","url":"https://docs.ex.com/guide","rank_group":4}]
```
- `dedupe keeps best pos` → la mínima posición resultante es **1** (el featured_snippet #1 colapsa
  sobre `/p/a` y gana sobre #51 y #59; el `?utm=x` es la misma página por `url_key`).
- `PAA excluded` → False.
- `docs excluded root-only` → False.
- `root-only count` → **2** (`/p/a` y `/p/b`; nota que `www.ex.com` cuenta como root).
- con `include_subdomains=True` aparece `docs.` → True.

**Tests de curva y clasificador:**
- `ctr(1) > ctr(5) > ctr(10) > ctr(20) > ctr(50)` → True (monotonía).
- `classify_page_type("https://s.com/apis/seo", url_map={"/apis/*": "commercial"})` → `commercial`
  (el mapa gana).
- `classify_page_type("https://s.com/x/y", signals={"price": "$29"})` → `commercial`.
- `classify_page_type("https://s.com/blog/post")` → `informational`.
- `classify_page_type("https://s.com/x/y")` → `ambiguous`.

## A.10 `evals/evals.json` — los 3 casos

`{"skill_name": "keyword-cannibalization-detector", "evals": [...]}`. Nota: los evals conservan
lenguaje de una versión anterior ("ranking proximity", "gap", "only keywords with 2+ same-domain
URLs are enriched") que ya no calza al 100% con el motor over-time actual.

**Eval 1 — allbirds.com** (`files: []`)
- Prompt: chequear canibalización con 8 keywords: `wool runners, wool sneakers, running shoes, tree
  runners, how to wash wool shoes, are wool shoes good for running, mens shoes, sustainable
  sneakers`. Location United States, English.
- Expected output: pulls each keyword's SERP (depth 100), encuentra todas las URLs de allbirds por
  keyword, clasifica intent y page types, produce PDF + CSV. Términos comerciales con dos páginas
  comerciales cercanas → `strong candidate` con fix consolidate/301; product page + blog lejanos en
  término informacional → `harmless overlap` con "no action". La prioridad ordena primero conflictos
  comerciales de alto volumen.
- Assertions (7):
  1. Llama `serp_organic_live_advanced` **una vez por keyword con depth 100** y la location/language dadas.
  2. Solo keywords con 2+ URLs del mismo dominio se enriquecen (intent/volume/page-type); las de una sola URL se marcan clean y se saltan.
  3. Los verdicts combinan proximidad de ranking **CON** intent y page type — **nunca posición sola**.
  4. Al menos un product+blog co-rankeando lejos en término no-comercial **NO** se marca como canibalización (harmless overlap / no action).
  5. Produce **PDF y CSV**; el CSV tiene una fila por keyword candidata con posiciones, page types, gap, verdict, reason y un fix específico recomendado.
  6. El orden de prioridad pone arriba los conflictos comerciales, de alto volumen y rankeados cerca.
  7. Todo caso flagged lleva una razón en inglés plano atada a sus posiciones/intent/page types reales.

**Eval 2 — shop.example.co.uk** (`files: ["keywords.txt"]`)
- Prompt: auditoría con lista de keywords en archivo, United Kingdom / English, "I mainly care about
  the commercial terms, want to know which pages to merge."
- Expected: lee keywords.txt, corre la detección completa, devuelve worklist priorizada; para
  keywords comerciales con dos páginas cercanas recomienda consolidate/merge + 301 nombrando las URLs
  débil/fuerte; **confirma scope y costo API esperado antes de llamar**.
- Assertions (5): lee y dedupea el archivo; muestra confirmación de scope/spend con conteo esperado
  de requests y **espera aprobación antes de cualquier llamada**; pares comerciales cercanos reciben
  merge+301 nombrando URL fuerte y débil; usa `location_name 'United Kingdom'` y `language_code 'en'`
  en SERP y volumen; el CSV sale ordenado por prioridad con los conflictos comerciales más costosos
  primero.

**Eval 3 — myfitnessblog.com** (`files: []`)
- Prompt: "I think two of my blog posts are fighting each other", keywords: `best protein powder,
  protein powder for weight loss, how much protein per day, creatine vs protein`. "Are they actually
  cannibalizing or am I imagining it?"
- Expected: veredicto honesto. Dos posts informacionales rankeando alto y juntos en término
  informacional → `strong candidate` con recomendación de diferenciar ángulos o fusionar en una guía
  + 301. Posts lejanos o con sub-intents distintos → decir claramente que **NO** es canibalización.
  **"Does not over-flag."**
- Assertions (4): distingue canibalización blog-vs-blog genuina (alta y apretada) de co-ranking
  inofensivo (lejano / sub-intents distintos); para un conflicto informacional real recomienda
  diferenciar o consolidar en una guía + 301 — **no un genérico "add keywords"**; da un verdict
  sí/no en inglés plano por keyword en vez de solo posiciones crudas; **no flaggea una keyword donde
  solo una URL del dominio rankea**.

**Lectura del criterio de calidad del autor:** el eje de evaluación no es cobertura ni velocidad, es
**precisión de no-falso-positivo** + **especificidad accionable del fix** (nombrar URLs) +
**gate de aprobación antes de gastar**.

## A.11 Estructura exacta del PDF + CSV

### CSV (`CSV_HEADER`, 26 columnas, en este orden)

```
priority_rank, priority_score, keyword, search_intent, effective_intent,
intent_probability, intent_overridden_by_page_type, search_volume, cpc,
clicks_at_risk, value_at_risk, verdict, n_pages, rotating, rotation_count,
n_snapshots, best_pos,
page_a_url, page_a_position, page_a_type,
page_b_url, page_b_position, page_b_type,
all_domain_urls, reason, recommended_action
```
- `page_a_*` = la página **stronger** (mejor posición), `page_b_*` = **weaker**.
- `all_domain_urls` = `" | ".join(f"{url}@{position}")` de TODAS las URLs vistas over-time.
- Encoding `utf-8-sig` (BOM para Excel).
- Solo contiene candidatos (`status == "candidate"`), ordenados por prioridad.

### PDF (`build_report.py`, reportlab, A4, margen 18 mm)

Paleta:
```
primary #1F2937 · accent #2563EB · danger #DC2626 (strong candidate)
warn #D97706 (investigate) · success #16A34A (harmless/clean)
bg #F3F4F6 · muted #6B7280 · grid #E5E7EB
```
Fuentes: DejaVu TTF bundleadas (Unicode completo para SERPs no latinos); **si fallan, registra
Helvetica bajo los mismos nombres** y avisa por stderr (no crashea).

Chrome de página: banda superior 13 mm `primary` con "KEYWORD CANNIBALIZATION" a la izquierda y el
dominio en mayúsculas a la derecha; footer con **"Data: DataForSEO"** (izq), `location · language ·
date` (centro), `Page N` (der) y una línea a 11 mm.

Secciones:
1. **Summary** — dos filas de KPI cards (`kpi_row`), cada card con barra de color a la izquierda:
   fila 1 = `Keywords checked` (accent) · `Clean (1 page)` (success) · `Had 2+ URLs` (primary);
   fila 2 = `Strong candidate` (danger) · `Investigate` (warn) · `Harmless overlap` (success).
   Si `meta.intent_lang_fallback` → nota: "search-intent data was computed in English…".
2. **Conflicts by priority** — subtítulo literal: "Costliest conflicts first — ranked by estimated
   value at risk (leaked clicks × CPC), not raw volume." Tabla de 7 columnas con ratios
   `[0.05, 0.28, 0.12, 0.09, 0.11, 0.16, 0.19]`:
   `#` · `Keyword` · `Intent` · `Vol` · `Val/mo` · `Positions` · `Verdict`.
   `Positions` muestra hasta 3 (`#8 / #12 / #19` y "…" si hay más). Verdict coloreado.
3. **PageBreak → "Flagged keywords — detail"** — **solo strong candidate + investigate**; los
   harmless quedan excluidos del detalle y solo cuentan en el summary. Cada bloque va en
   `KeepTogether`:
   - `#rank  keyword`
   - línea meta: `Intent: X (NN% prob) · Volume: V · Pages: N (rotating|co-listed, S snapshots) ·
     Best: #P · Clicks at risk: C/mo · Value: $V/mo · Priority: score`
   - tabla de **todas** las URLs del dominio: `Pos` · `Same-domain URL` (sin scheme, truncada a 58
     chars con "…") · `Page type` — ratios `[0.10, 0.68, 0.22]`, header en accent; el tipo se pinta
     accent si es commercial, muted si no.
   - caja con borde izquierdo del color del verdict: **Verdict:** (mayúsculas, coloreado) /
     **Why:** reason / **Recommended fix:** recommendation.
4. Si no hay `flagged`: "No keyword returned 2 or more URLs from this domain in the top 100 — no
   cannibalization candidates. That is a healthy sign."

Nombres de archivo: `[domain]_cannibalization_[YYYYMMDD].pdf` / `.csv` (o `meta.out_path`/`meta.csv_out`).

## A.12 Manejo de errores

| Situación | Acción |
|---|---|
| DataForSEO 401 en cualquier llamada | Parar de inmediato: "Please connect/re-authenticate DataForSEO, then retry." |
| Ninguna keyword rankea el dominio en el top-100 live | Cerrar limpio: "None of the [N] keywords rank [domain] live — no cannibalization possible. Healthy sign." Igual emitir reporte/CSV de summary limpio. |
| Un SERP live falla (no-401) | El sub-agente devuelve esa keyword con `urls: []` + nota `error`; loguear y continuar. **Nunca truncar en silencio.** |
| `historical_serps` vacío para una keyword | Seguir solo con la observación live; anotar que no se pudo confirmar rotación. |
| Ninguna keyword con ≥2 páginas over-time | Cerrar limpio; emitir reporte/CSV de summary limpio. |
| Idioma no soportado por `search_intent` | Correr en `en` y setear `intent_lang_fallback: true` en `meta`. |
| `on_page_instant_pages` falla para una URL | Conservar el mejor guess de la heurística; el core marca los tipos no resueltos como `ambiguous`. |
| `reportlab` ausente y pip bloqueado | Escribir el fallback `.html` y avisar. |


---

# Parte B — seo-visibility-report

## B.0 Archivos y artefactos por corrida

```
seo-visibility-report/
├── SKILL.md                  (48.694 B)  workflow + Appendices A/B/C
├── README.md                 (4.767 B)
├── references/endpoints.md   (13.413 B)
└── scripts/
    ├── build_report.py       (62.583 B, 1.401 líneas)  PDF generator
    └── fonts/DejaVuSans{,-Bold,-Oblique}.ttf
```
(No hay `evals/` ni tests en esta skill.)

Archivos escritos por corrida, en la carpeta del proyecto:

| Archivo | Propósito |
|---|---|
| `[domain]_config.json` | Settings del cliente — keywords, competidores, páginas, módulos, fechas |
| `[domain]_data_[YYYY-MM].json` | Data cruda de DataForSEO (**se conserva como audit trail**) |
| `[domain]_SEO_[YYYY-MM].pdf` | Reporte final client-ready |

Frontmatter: `name: seo-visibility-report`; triggers: "create/generate/produce/build an SEO report",
"visibility report", "opportunity report", "SEO assessment", "SEO audit report", "SEO PDF",
"run the report for [client]", "warm lead report for [domain]". Output declarado **neutral
(unbranded)** con secciones condicionales.

Requisito: `pip install reportlab`.

## B.1 Workflow paso a paso (Steps 1–9)

**Interaction Rules (aplican a toda pregunta):** una pregunta a la vez; **para todo set fijo de
opciones usar `AskUserQuestion`** (select/multiselect interactivo), **NO** listas numeradas en texto;
campos opcionales en texto plano con "(optional -- press Enter or type '-' to skip)" y guardar `null`
si se salta; listas abiertas (keywords, competidores, páginas) en texto plano y **nunca pre-llenar**;
sí/no vía AskUserQuestion single-select.

**Detección de conector (al inicio de cada corrida, `DFS_MODE`):** ambos → **V3**; solo uno → ese;
ninguno → parar. **Nunca mezclar modos en una corrida.** V1 se detecta listando tools (nombres
snake_case por endpoint); V3 se detecta verificando la tool `api_request`.

### Step 1 — Configurator (Q1–Q6, todas por AskUserQuestion)

| Q | Header | Opciones | Guarda en |
|---|---|---|---|
| Q1 | "Report purpose" | "Existing-client report" / "Warm-lead conversion" | `report_settings.purpose` = `existing_client` \| `warm_lead` |
| Q2 | "Primary reader" | "Business owner / exec" / "Marketing manager / in-house team" | `report_settings.reader` = `exec` \| `manager` |
| Q3 | "Geographic footprint" | "Local" / "National / international" / "Both" | `report_settings.footprint` = `local` \| `national` \| `both` |
| Q4 | "Keyword source" | "Client-provided list" / "Auto-discover from domain" / "Hybrid" | `report_settings.keyword_source` = `client_provided` \| `auto_discover` \| `hybrid` |
| Q5 | "Report modules" + "More modules" (2 multiselects) | ver abajo | `report_settings.enabled_modules[]` |
| Q6 | "Reporting period" | "Last full month" / "Last quarter" / "Current snapshot" / "Custom dates" | `report_settings.period_mode` = `month` \| `quarter` \| `snapshot` \| `custom` |

- Q3 `local`/`both` → el módulo Local SEO entra automáticamente en los defaults, y en el Step 2 se
  piden las ciudades.
- Q4 default: `client_provided` para clientes existentes; `hybrid` para warm leads.
- **Q5 defaults por purpose** (se pre-seleccionan antes de mostrar, y la descripción de cada opción
  recomendada se prefija con `"[Recommended] "` dinámicamente):
  - `existing_client`: `keyword_rankings, backlinks, tech_health, next_actions`
  - `warm_lead`: `keyword_rankings, competitor_snapshot, backlinks, tech_health, next_actions`
  - `+ local_seo` si footprint = local o both.
  - Multiselect 1: Keyword Rankings / Local / GBP / Competitor Snapshot / Backlinks.
    Multiselect 2: Technical Health / AI / LLM Visibility / Next Actions / "None -- that's all".
  - Claves de módulo: `keyword_rankings, local_seo, competitor_snapshot, backlinks, tech_health,
    ai_llm_visibility, next_actions`.
- **Q6 semántica:** (1) mes calendario previo vs el anterior, con confirmación "Periods set: [Month
  YYYY] vs [Prev Month YYYY]. Confirm?"; (2) trimestre previo vs anterior; (3) snapshot = hoy−30d a
  hoy, `date_prev_from/to = null`; (4) fechas manuales en texto (`YYYY-MM-DD to YYYY-MM-DD`, previo
  o `'-'` para saltar).

### Step 2 — Client Setup

Busca `[client-domain]_config.json`. Si existe → carga, muestra resumen de una línea ("Using saved
config: [purpose] / [reader] / [modules]."), sigue al Step 3. Si no, pregunta una a una:

1. "Client name (e.g. 'Bloom Cosmetics'):"
2. "Client domain -- root domain only, no www or https:"
3. **Location:** texto libre → llama `serp_locations` → presenta **top 3** vía AskUserQuestion
   ("Which location matches your client?", opciones `[name] / [country] -- code [code]`, + "None of
   these"). Guarda `location_code` + `location_name`.
   Si Q3 = local/both: pregunta cuántas locations, y repite el picker por cada una (i=1..N),
   acumulando `locations[] = {city_location_code, city_location_name}`.
4. **Language:** texto libre, matcheado contra `language_name` de la lista de locations, confirmado
   con AskUserQuestion. Guarda `language_code` + `language_name`.
5. **Keywords** (según Q4):
   - client_provided/hybrid: "Paste your target keywords, one per line or comma-separated
     (**recommended: up to 100** for optimal report quality and API cost; more is fine but will
     increase processing time)".
   - auto_discover/hybrid: `dataforseo_labs_google_ranked_keywords` con **limit 500**; auto_discover
     presenta **top 20 por volumen** para confirmación + total encontrado; hybrid mergea con la lista
     del cliente y dedupea.
   - **Keyword validation (C2)** — criterios de flag literales: *single characters, URLs, numbers
     only, competitor brand names not relevant to the client, very broad 1-word head terms
     (**volume > 500k**), duplicates*. Si hay flags, AskUserQuestion "Keyword cleanup" → "Remove all
     flagged terms" / "Keep all flagged terms" / "I'll decide for each one" (esta última itera
     Keep/Remove keyword por keyword). Esperar todas las respuestas antes de guardar.
6. **Competidores:** "root domains, comma-separated (**recommended: up to 5**; more is fine but each
   adds 1 extra API call) (optional…)".
7. **Páginas a auditar (Technical Health)** — antes de preguntar, **descubre en silencio**:
   - intenta `https://[domain]/sitemap.xml` (chequeando primero robots.txt por la ruta del sitemap);
     si lo encuentra, parsea `<loc>`, normaliza a paths relativos, ordena **por profundidad (más
     someras primero)** y toma **top 4** (homepage siempre primera);
   - si no hay sitemap: prueba con HEAD las rutas comunes `/`, `/about`, `/contact`, `/services`,
     `/shop`, `/blog`, `/pricing`, `/faq`, `/team`, conserva solo **HTTP 200**, toma top 4.
   Luego AskUserQuestion "Pages to audit": "Use suggested pages" / "Enter manually" (max 20) /
   "Scan full sitemap" (advertencia: "may be 50-500+ calls, slow and costly", con confirmación
   adicional) / "Homepage only".
   **Scan incremental:** si el config ya tiene `sitemap_pages_audited`, calcula `NEW = paths del
   sitemap no auditados`; si NEW está vacío reusa la lista previa; si no, ofrece "New pages only
   ([N_new])" / "Full site ([N_total] pages)" / "Enter manually" y **appendea NEW a
   `sitemap_pages_audited`**. En config nuevo, pregunta "Found [N] pages in sitemap. Audit all of
   them? (~[N] API calls, may take [N/10] min)".
8. "Report output folder -- leave blank for current project folder".

### Step 3 — Validate

| Check | Regla |
|---|---|
| Domain format | sin `https://`, sin `/` final, sin espacios |
| Dates | `date_from < date_to`; el período previo termina antes de que empiece el actual (salvo snapshot) |
| Keywords | ≥1. **Sobre 100** → "You've entered [N] keywords -- this will increase API usage and processing time. Continue?" (Yes/No) |
| Competitors | **Sobre 5** → "You've entered [N] competitors -- each adds ~1 API call. Continue?" (Yes/No) |
| reportlab | `python -c "import reportlab"`; si falla, `pip install reportlab` una vez |

Si algo falla: parar y describir exactamente qué arreglar.

### Step 4 — Confirm Before Running (gate de gasto)

Muestra el bloque `REPORT CONFIGURATION` completo (dominio, cliente, purpose, reader, footprint,
period mode, período actual y de comparación, N keywords + source, competidores, páginas, módulos)
más el desglose **EXPECTED API REQUESTS**:

```
  Executive Summary:   2
  Keyword Rankings:    [N+2] (ranked keywords + volumes + SERP live)
  Local SEO:           [2 if enabled, else -]
  Competitor Snapshot: [M+1 if enabled, else -]
  Backlinks:           4
  Technical Health:    [2xP if enabled, else -]
  AI/LLM Visibility:   [2 if enabled, else -]
  ---------------------
  Total:               ~[sum] requests
```
y las rutas de salida (PDF + data JSON). Luego AskUserQuestion "Confirm" → "Yes -- start now" /
"No -- edit config". **Ninguna llamada API antes del "Yes".**

### Step 5 — Fetch Data (módulos en orden; status line tras cada uno)

Regla de resiliencia: "If a call returns empty or errors: set that section's data to null and
continue. **Never abort the whole run for one missing section.**" Y: "For each section: extract ONLY
the fields listed below."

**Framing presets** (guardados en config como `framing`, consumidos por `build_report.py`):

| clave | existing_client | warm_lead |
|---|---|---|
| cover_title | "SEO Performance Review" | "SEO Opportunity Assessment" |
| s1_header | "Executive Summary" | "Visibility Overview" |
| s2_header | "Keyword Rankings" | "Ranking Opportunities" |
| s6_header | "What We're Doing Next" | "Gaps We'd Close" |
| s6_framing | "Progress on agreed targets + next sprint" | "Where visibility is lost and what fixing it is worth" |

Submódulos 5.1 a 5.8 → ver B.3 (endpoints) y B.5 (fórmulas).

### Steps 6–8

- **Step 6:** guardar `[client-domain]_data_[YYYY-MM].json`; el bloque `config` es el config
  **completamente mergeado** en un solo objeto (Appendix B).
- **Step 7:** `python "[skill_dir]/scripts/build_report.py" "[project_folder]/[domain]_data_[YYYY-MM].json"`.
  Errores comunes: `ModuleNotFoundError: reportlab` → `pip install reportlab`;
  `UnicodeEncodeError` → guardar el JSON con `encoding="utf-8"`.
- **Step 8 — Deliver** (formato literal):
```
Report complete.

PDF:  [output_path]
Data: [data_json_path]

Summary:
  - Estimated traffic: [etv] (modeled)
  - Visibility Index: [vi] / 100
  - [N] of [total] tracked keywords on page 1
  - Top win: "[keyword]" moved [old] -> [new]
  - [N] new referring domains, [M] lost
  - [X] technical issues ([Y] critical)
  - 5 next actions included
```

### Step 9 — Go Deeper (ver B.8)

## B.2 Schema de config y de data.json

**`[client-domain]_config.json` (Appendix A)** — campos: `client_name`, `client_domain`,
`location_code`, `location_name`, `language_code`, `language_name`,
`locations[] = {city_location_code, city_location_name}`, `tracked_keywords[]`, `competitors[]`,
`top_pages_for_tech_audit[]`, `sitemap_pages_audited[]`, `output_folder`, `date_from`, `date_to`,
`date_prev_from`, `date_prev_to`, `period_current`, `period_prev`, `report_settings{purpose, reader,
footprint, keyword_source, period_mode, enabled_modules[]}`, `framing{cover_title, s1_header,
s2_header, s6_header, s6_framing}`.

**`data.json` (Appendix B)** — `{"config": {...}, "sections": {...}}` con estas secciones:

- `s1_executive_summary`: `current_period` / `previous_period` = `{etv, keywords_count, vi, pos_1,
  pos_2_3, pos_4_10, pos_11_20, pos_21_30, pos_31_100}`; `narrative` (3–5 frases), `insight`
  (one-liner), `tldr` (array de top-3 acciones).
- `s2_keyword_rankings`: `keywords[] = {keyword, volume, intent_group, pos_current, pos_previous,
  url, serp_features[], status}`; `keyword_groups{commercial, informational, local, branded,
  navigational}`; `opportunities[] = {keyword, volume, pos_current, potential_traffic}`; `insight`.
- `s_local`: `locations[] = {location_name, city_location_code, gbp{name, rating, review_count,
  address, is_claimed}, local_pack_rankings[]{keyword, pack_position, organic_position},
  local_pack_competitors[]{name, domain, avg_pack_position, avg_rating, total_reviews,
  keywords_in_pack}}`; `insight`.
- `s3_competitor_snapshot`: `client{etv, avg_position}`; `competitors[]{domain, etv, avg_position,
  intersections}`; `insight`.
- `s4_backlinks`: `current{dr, total_backlinks, referring_domains, dofollow, nofollow}`; `previous{…}`;
  `timeline[]{date, referring_domains, new, lost}`; `new_domains[]{domain, dr, dofollow, anchor,
  first_seen}`; `lost_domains[]{domain, dr, lost_date, reason}`; `insight`.
- `s5_technical_health`: `pages[]{url, label, performance, seo_score, accessibility, lcp, cls,
  status}`; `issues[]{issue, severity, pages_affected, impact, fix}`; `insight`.
- `s_ai_llm`: `metrics{total_mentions, citations_count, avg_position, models_count}`;
  `google_mentions[]{query, mention_type}`; `chatgpt_mentions[]{…}`; `ai_overview_keywords[]`;
  `insight`.
- `s6_next_actions`: `actions[]{title, why, actions, effort, impact, owner}`.

## B.3 Endpoints y llamadas 1–16

Tabla de traducción V1 → V3 (Appendix C, completa):

| V1 tool | V3 path | Notas |
|---|---|---|
| `dataforseo_labs_google_domain_rank_overview` | `POST /v3/dataforseo_labs/google/domain_rank_overview/live` | V3 usa `count` en vez de `keywords_count` |
| `dataforseo_labs_google_historical_rank_overview` | `POST /v3/dataforseo_labs/google/historical_rank_overview/live` | |
| `dataforseo_labs_google_ranked_keywords` | `POST /v3/dataforseo_labs/google/ranked_keywords/live` | |
| `dataforseo_labs_google_keyword_ideas` | `POST /v3/dataforseo_labs/google/keyword_ideas/live` | |
| `dataforseo_labs_google_keyword_suggestions` | `POST /v3/dataforseo_labs/google/keyword_suggestions/live` | |
| `dataforseo_labs_google_historical_serps` | `POST /v3/dataforseo_labs/google/historical_serps/live` | |
| `dataforseo_labs_google_competitors_domain` | `POST /v3/dataforseo_labs/google/competitors_domain/live` | |
| `dataforseo_labs_google_serp_competitors` | `POST /v3/dataforseo_labs/google/serp_competitors/live` | |
| `dataforseo_labs_bulk_keyword_difficulty` | `POST /v3/dataforseo_labs/google/bulk_keyword_difficulty/live` | |
| `dataforseo_labs_google_relevant_pages` | `POST /v3/dataforseo_labs/google/relevant_pages/live` | |
| `dataforseo_labs_google_historical_keyword_data` | `POST /v3/dataforseo_labs/google/historical_search_volume/live` | |
| `serp_organic_live_advanced` | `POST /v3/serp/google/organic/live/advanced` | |
| `serp_locations` | `GET /v3/serp/google/locations` | **pasar `name` como query param** |
| `kw_data_google_ads_search_volume` | `POST /v3/keywords_data/google_ads/search_volume/live` | |
| `kw_data_google_trends_explore` | `POST /v3/keywords_data/google_trends/explore/live` | |
| `backlinks_summary` | `POST /v3/backlinks/summary/live` | campo `backlinks` (no `total_backlinks`); **sin** `dofollow`/`nofollow` → usar `referring_domains_nofollow` |
| `backlinks_timeseries_new_lost_summary` | `POST /v3/backlinks/timeseries_new_lost_summary/live` | |
| `backlinks_referring_domains` | `POST /v3/backlinks/referring_domains/live` | |
| `on_page_lighthouse` | `POST /v3/on_page/lighthouse/live/json` | V3 devuelve `numericValue` (ms), no `displayValue` |
| `on_page_instant_pages` | `POST /v3/on_page/instant_pages` | |
| `business_data_business_listings_search` | `POST /v3/business_data/google/my_business_info/live` | |
| `ai_opt_llm_ment_agg_metrics` | `POST /v3/ai_optimization/llm_mentions/target_metrics/live` | |
| `ai_opt_llm_ment_search` | `POST /v3/ai_optimization/llm_mentions/search_mentions/live` | |
| `ai_opt_llm_ment_top_pages` | `POST /v3/ai_optimization/llm_mentions/top_pages/live` | |
| `ai_opt_llm_ment_top_domains` | `POST /v3/ai_optimization/llm_mentions/top_domains/live` | |
| `ai_optimization_llm_response` | `POST /v3/ai_optimization/llm_mentions/response/live` | |

Sintaxis V3: `api_request(method="POST", path="/v3/backlinks/summary/live",
data=[{"target": "bloom-cosmetics.com", "include_subdomains": True}])` — `data` **siempre** array de
un task object. "The response structure from V3 is the same as V1 — extract fields identically."

### Llamadas por sección (parámetros exactos + campos consumidos)

**Call 1 — Exec, período actual:** `domain_rank_overview`
`{ "target": "[client_domain]", "location_code": [loc], "language_code": "[lang]" }`
→ de `metrics.organic`: `etv`, `keywords_count` (V1) / `count` (V3, mapear a `keywords_count`),
`pos_1, pos_2_3, pos_4_10, pos_11_20, pos_21_30`, y `pos_31_40 … pos_91_100`
(**`pos_31_100` = suma de `pos_31_40` + `pos_41_50` + `pos_51_60` + `pos_61_70` + `pos_71_80` +
`pos_81_90` + `pos_91_100`**). Calcular `vi` (ver B.5).

**Call 2 — Exec, período previo** (se salta si `period_mode = snapshot`): `historical_rank_overview`
con `date_prev_from` / `date_prev_to`; mismos campos a `s1.previous_period`.

**Call 3 — Ranked keywords:** `{ "target", "location_code", "language_code", "limit": 500 }`.
Campos: `keyword`, `keyword_data.search_volume`, `keyword_data.competition`,
`ranked_serp_element.serp_item.{rank_absolute, url, type}`.

**Call 4 — Volúmenes bulk:** `kw_data_google_ads_search_volume` con `{keywords[], location_code,
language_code}` — una sola llamada con TODAS las tracked keywords.

**Call 5 — Posiciones del período previo:** `historical_serps` **solo para las top 10 tracked por
volumen**, con `{keyword, location_code, language_code, date_from, date_to}`.

**(SERP live por keyword)** `serp_organic_live_advanced`
`{ "keyword", "location_code", "language_code", "depth": 30 }` — **1 llamada = 1 keyword, sin
batching**. De `items[]`: `type`, `rank_absolute`, `domain`, `url`, `title` + presencia de features
(`featured_snippet`, `people_also_ask`, …).

**Call 6 — GBP por location:** `business_data_business_listings_search` /
`POST /v3/business_data/google/my_business_info/live`
`{ "keyword": "[client_name]", "location_code": [city_location_code] }` (en endpoints.md el ejemplo
además lleva `language_code`). Campos: `title`, `rating.value`, `rating.votes_count`, `category`,
`address`, `is_claimed`, `work_hours.timetable`.

**Call 7 — Local pack por location:** `serp_organic_live_advanced`
`{ "keyword": "[kw]", "location_code": [city_location_code], "language_code": "[lang]", "depth": 20 }`
para **3–5 keywords city-modified** de la lista tracked. Procesamiento: buscar items con
`type == "local_pack"`; para el dominio del cliente registrar `pack_position` (1/2/3 o null) y
`organic_position`; para **cada otro negocio del pack (hasta 3 por keyword)** extraer `title`,
`domain`, `rating`, `rating_count`, `pack_position`; **deduplicar competidores entre keywords
quedándose con el que más apariciones tiene**.
(En `references/endpoints.md` el ejemplo de local pack usa `depth: 10` y `location_code` de país —
inconsistencia menor con el SKILL.md, que manda `depth: 20` y código de ciudad.)

**Call 8 — Competidores:** `domain_rank_overview`, **una llamada por dominio competidor**. Si
`config.competitors` está vacío → **saltar la sección entera** (`s3_competitor_snapshot = null`).
Campos: `etv`, `avg_position`, `intersections`. Nota explícita: "this is a light snapshot. **Do NOT
compute full SOV/VI machinery.**" Y el reporte debe decir: "For a full competitive breakdown, see the
Competitor Analysis report."

**Call 9 — `backlinks_summary`:** `{ "target", "include_subdomains": true }`.
- V1: `rank`, `total_backlinks`, `referring_domains`, `dofollow`, `nofollow`.
- V3: `rank`, `backlinks`, `referring_domains`, `referring_domains_nofollow`,
  `referring_domains_noindex`, `broken_backlinks`, `broken_pages`, `referring_ips`.
- **`rank` viene en escala 0–1000** → convertir a DR 0–100 (ver B.5). "Never show the raw rank value."

**Call 10 — `backlinks_timeseries_new_lost_summary`:**
`{ "target", "date_from": "[6 months before date_from]", "date_to": "[date_to]", "group_by": "month" }`
→ `[{date, new_backlinks, lost_backlinks, new_referring_domains, lost_referring_domains}]`.
`s4.previous` se **deriva de la entrada del mes anterior a `date_from`** ("This gives consistent MoM
comparison from API data alone — no dependency on a previous run's data file"); `referring_domains` y
`total_backlinks` del período previo se aproximan tomando los totales acumulados de
`backlinks_summary` menos/más el delta del mes más reciente. Si no hay entrada para el mes previo →
`s4.previous = null` y **las columnas de delta simplemente se omiten del PDF**.

**Call 11 — nuevos referring domains:** `backlinks_referring_domains` con
```json
{ "target": "...", "filters": [["first_seen", ">=", "2026-05-01"], ["first_seen", "<=", "2026-05-31"]],
  "order_by": [["rank", "desc"]], "limit": 100 }
```
**Call 12 — perdidos:** `{ "target": "...", "filters": [["lost_date", ">=", "2026-05-01"], ["is_lost", "=", true]] }`.
Campos por dominio: `domain`, `rank`, `backlinks`, `referring_domains`, `dofollow`, `is_lost`,
`first_seen`, `lost_date`.

**Call 13-A — Lighthouse (por URL, máx 6 páginas):** `{ "url": "https://[domain][path]",
"for_mobile": true }` → `categories.{performance, seo, accessibility, best-practices}.score` y
`audits.{largest-contentful-paint, total-blocking-time, cumulative-layout-shift}.numericValue`.
- V1: scores ya 0–100; LCP/CLS como strings formateados (`displayValue`).
- V3: scores 0–1 → **×100**; LCP/CLS crudos → **LCP = `round(ms/1000, 1)` s; CLS a 3 decimales**.
- Etiquetar como **"Lab diagnostic (Lighthouse)" — no CWV real**.

**Call 13-B — `on_page_instant_pages`:** `{ "url": "...", "load_resources": true,
"enable_javascript": true }` → `meta.title`, `meta.description`, `meta.htags.h1/h2`,
`checks.{no_image_alt, no_description, duplicate_meta_tags, has_render_blocking_resources}`,
`images[].{src, alt, size}`, `internal_links[].{url, status_code}`.
Detecta: **H1 faltante, meta description faltante, imágenes sin alt, redirects 301 internos, meta
tags duplicados, schema faltante**.

**Calls 14–16 — AI/LLM:**
- 14: `llm_mentions/target_metrics` `{ "target": [{"domain": "[client_domain]"}], "platform": "google" }`
  → `total_mentions, avg_position, citations_count, models_count`.
- 15: `llm_mentions/search_mentions` `{..., "platform": "google", "limit": 10}` → `query`,
  `mention_type` → `s_ai.google_mentions`.
- 16: idem con `"platform": "chat_gpt"` → `s_ai.chatgpt_mentions`.
- Además: marcar las tracked keywords cuyo `serp_features` incluya `"ai_overview"` →
  `s_ai.ai_overview_keywords`. Framing: "GEO (Generative Engine Optimization) readiness."

**Endpoints documentados en `references/endpoints.md` pero fuera del flujo principal:**
`dataforseo_labs_google_competitors_domain` (`limit: 10`) y `dataforseo_labs_google_serp_competitors`
con su **fórmula SOV**: `SOV% = domain_etv_on_tracked_kws / sum_etv_all_domains_on_tracked_kws * 100`
(la sección 03 del reference se llama "Share of Voice", pero el SKILL.md la degradó a "Competitor
Snapshot LIGHT" y prohíbe calcular SOV).

**Tabla de location_code de referencia:** UK 2826/en · US 2840/en · Ukraine 2804/uk · Germany 2276/de
· France 2250/fr · Australia 2036/en. Lista completa vía `serp_locations`.

**Labs vs Live (nota conceptual del autor):** `dataforseo_labs_*` = data cacheada (días/semanas),
rápida y barata, para overviews de dominio, descubrimiento de competidores y posiciones históricas;
`serp_organic_live_advanced` = SERP en tiempo real, para posiciones actuales de keywords tracked y
detección de features.

## B.4 Costos y estimación de requests

Del README (tabla oficial):

| Sección | Requests |
|---|---|
| Executive Summary | 2 (período actual + previo) |
| Keyword Rankings | N keywords (SERP live) + 1 bulk volume + **hasta 10** historical |
| Competitor Snapshot | 1 por competidor (**máx 3**) |
| Backlink Profile | 4 (summary + timeline + new domains + lost domains) |
| Technical Health | 2 por página (Lighthouse + on-page) |
| Local SEO | 1 GBP + 1 por keyword local, **por location** |

- Setup típico (15 keywords, 3 competidores, 4 páginas, 1 location): **~45–55 requests**.
- Estimación de `references/endpoints.md`: "~30–40 base calls + 1 por tracked keyword"; para 20
  keywords, 4 competidores, 5 páginas, 2 locations, 5 local keywords: **~70–85 calls**.
- Guardrails de volumen: >100 keywords → confirmar; >5 competidores → confirmar; full-sitemap scan →
  doble confirmación ("50-500+ calls"); Lighthouse **máx 6 páginas**; páginas manuales **máx 20**;
  `ranked_keywords` **limit 500**; `backlinks_referring_domains` **limit 100**; historical SERPs solo
  **top 10 por volumen**.
- Sin batching para SERP live: **1 call = 1 keyword** (nota explícita en endpoints.md).

## B.5 TODAS las fórmulas y umbrales

**Visibility Index (VI, 0–100):**
```
VI = (pos_1*1.0 + pos_2_3*0.85 + pos_4_10*0.5 + pos_11_20*0.2 + pos_21_30*0.05)
     / max(keywords_count, 1) * 100
```
(pos_31_100 pesa **0**). Lectura interpretativa que el propio PDF imprime: "A rising VI with flat
traffic indicates quality improving before clicks follow -- this is normal and expected."

**Domain Rating desde `rank` (0–1000 → 0–100):**
```python
dr = round(math.sin(rank / 636.62) * 100, 1)
```
`636.62 ≈ 2000/π`, o sea `sin(rank·π/2000)`: un mapeo **cóncavo** que satura cerca de rank 1000 →
DR 100. "The MCP has no `rank_scale` parameter; apply this formula manually." "Never show the raw
rank value."

**pos_31_100** = `pos_31_40 + pos_41_50 + pos_51_60 + pos_61_70 + pos_71_80 + pos_81_90 + pos_91_100`.

**Status de keyword (reglas literales):**
```
WIN    : mejoró >= 3 posiciones AND posición actual <= 20
RISK   : cayó >= 3 posiciones
WATCH  : cayó 1-2 posiciones
STABLE : cambio de 0-2 de mejora
NEW    : sin posición previa
LOST   : sin posición actual
```

**Intent grouping (C3) — heurísticas literales, 5 grupos:**
```
local          : contiene nombre de ciudad/región, "near me", "in [place]"
informational  : empieza con how/what/why/guide/tips/best way
commercial     : contiene buy/price/cost/cheap/best/review/vs/compare
branded        : contiene el root del client_domain o el client_name
navigational   : todo lo demás
```
(Nota: el orden de evaluación no está especificado; "best" aparece tanto en commercial como en
"best way" informacional → ambigüedad real del diseño.)

**Opportunity block (C4):** keywords donde `pos_current` es null **o > 20**;
```
potential_traffic (tráfico mensual estimado en posición 5) = volume * 0.065
```
El glosario lo justifica como "65th-percentile CTR for position 5 from industry benchmarks".

**Umbrales Lighthouse:** `performance >= 90` = green/**GOOD**; `>= 50` = amber/**NEEDS WORK**;
`< 50` = red/**POOR**.

**Severidad de issues:** orden `CRITICAL -> HIGH -> MEDIUM -> LOW`. Si `reader = "exec"`: solo
CRITICAL y HIGH en el cuerpo (MEDIUM/LOW a apéndice u omitidos, con nota "Exec view: CRITICAL and
HIGH issues only. N MEDIUM/LOW issues not shown."). Si `reader = "manager"`: todos los niveles.

**Buckets de distribución de posición (en el PDF):** `Top 3` (≤3), `4-10`, `11-20`, `21-30`,
`31-100` (>30).

**Umbral de rating de competidor local:** `avg_rating >= 4.5` se pinta en verde/negrita.
**Pack position:** `<= 3` se pinta verde/negrita; si no hay, "Not in pack".

**Keyword flag de head term:** volumen **> 500k** = "very broad 1-word head term".

## B.6 Estructura exacta del PDF

A4, márgenes 18 mm laterales, top 16 mm, bottom 14 mm. Misma paleta que la skill A
(`primary #1F2937`, `accent #2563EB`, `success #16A34A`, `danger #DC2626`, `warn #D97706`,
`bg #F3F4F6`, `muted #6B7280`, `grid #E5E7EB`). Fuentes DejaVu registradas **sin fallback** (si
faltan, revienta — a diferencia de la skill A).

Orden del `story` (todo condicional a `enabled_modules`, salvo TL;DR/S1/glosario):

1. **Portada** (`draw_cover`, dibujada como `onFirstPage`): banda superior 14 mm con dominio en
   mayúsculas (izq) y `period_current` (der); barra vertical accent de 5 mm al borde izquierdo;
   `cover_title` del framing en 28 pt a 62% de altura; subrayado accent de 55 mm; período en 12 pt;
   línea divisoria a 49%; "ANALYSED DOMAIN" + `client_name` en 20 pt + `client_domain`.
2. **AT A GLANCE (TL;DR, `build_tldr`)** — banner accent + **4 KPI cards de 44×30 mm**:
   `Visibility Index (VI)` (sub "0-100 quality-weighted score", delta en pts), `Est. Organic Traffic`
   (sub "modeled estimate"), `Ranked Keywords` (delta "+N MoM"), `Top-3 Rankings` (= `pos_1 +
   pos_2_3`). Luego caja "THE STORY" con `insight` en itálica, y "TOP 3 ACTIONS" (máximo 3 filas
   numeradas desde `s1.tldr`). Termina en PageBreak.
3. **Sección 1 — Executive Summary** (header del framing) — **5 KPI cards de 37×28 mm**: VI, Est.
   Organic Traffic (sub "not analytics data"), Ranked Keywords, Top-3, `4-10 Rankings`. Debajo, el
   párrafo explicativo de la fórmula VI. Luego "Performance Narrative" (`narrative`) y, si hay
   período previo, la tabla **"Month-on-Month Summary"** de 4 columnas
   (`Metric | período actual | período previo | Change`, ratios `[0.45, 0.18, 0.18, 0.19]`) con 8
   filas: Visibility Index, Est. Organic Traffic (modeled), Keywords Top 3, 4-10, 11-20, 21-30,
   31-100, Total Ranked Keywords. Cierra con `insight_box` ("Takeaway: …", fondo `#EFF6FF`, borde
   derecho accent).
4. **Sección 2 — Keyword Rankings** (`keyword_rankings`):
   - **2A Position Distribution** — tabla de buckets; con período previo: `Bucket | actual | previo |
     Delta` (`[0.40,0.20,0.20,0.20]`); sin previo: `Bucket | Keywords` (`[0.60,0.40]`).
   - **2B Opportunities** — título "2B - Opportunities (N target keywords not ranking or stuck on
     page 2+)"; **top 10 ordenadas por volumen desc**; columnas `Opportunity Keyword | Vol/mo |
     Current Position | Est. Traffic if Ranked #5` (`[0.38,0.16,0.22,0.24]`, header accent);
     posición vacía = "Not ranking"; tráfico como "~N/mo".
   - **2C Rankings by Intent Group** — un sub-bloque por grupo **en este orden fijo**: Commercial,
     Informational, Local, Branded, Navigational, con "(N keywords)" en el título.
     Si no hay `keyword_groups`: para `reader=exec` muestra "Top Movers This Period" (primeros 15 con
     status WIN/RISK/LOST) + "Full keyword table in Appendix."; para `manager`, la tabla completa.
   - Tabla de keywords **con forma variable** (`_keyword_table` decide por número de columnas):
     4 cols `Keyword|Vol|Now|Status`; 5 sin previo `Keyword|Vol|Now|SERP Features|Status`;
     5 con previo `Keyword|Vol|Now|Prev|Delta`; 6 `…|Status`; 7 `…|SERP Features|Status`.
     El delta se calcula como `prev - now` (positivo = mejora) y "NEW" si no hay previo.
     **`SERP Features` solo se incluye si `reader == "manager"`.**
5. **Local SEO** (`local_seo`, número de sección `"L"`) — si hay 1 location, un bloque; si hay
   varias, un header accent por ciudad. Cada bloque: **3 KPI cards de 56×24 mm** (Google Rating
   "X.X / 5.0", Total Reviews, GBP Status "Claimed"/"UNCLAIMED"), tabla "Local Pack Rankings"
   (`Keyword | Local Pack Position | Organic Position`, `[0.52,0.24,0.24]`) y tabla "Local Pack
   Competitors" (`Business | Domain | Avg Pack Pos. | Rating | Reviews | Keywords in Pack`,
   `[0.22,0.22,0.13,0.10,0.13,0.20]`). Si no hay GBP: "No Google Business Profile listing found for
   this location." Compatibilidad hacia atrás con el formato viejo de una sola location.
6. **Sección 3 — Competitor Snapshot** — nota "Light overview… For a full competitive breakdown,
   commission a dedicated Competitor Analysis report." Tabla `Domain | Est. Organic Traffic (modeled)
   | Shared Keywords | Avg. Position` (`[0.38,0.22,0.22,0.18]`) con **la fila del cliente arriba,
   resaltada** (`"[domain]  (you)"`, fondo `#EFF6FF`, línea accent debajo, "—" en Shared Keywords) y
   los competidores ordenados por `etv` desc.
7. **Sección 4 — Backlink Profile** — **4A** con 5 KPI cards: `Domain Rating (0-100)`,
   `Referring Domains`, `Total Backlinks`, `New Ref. Domains`, `Lost Ref. Domains` (esta última se
   pinta "positiva" solo si `lost_n == 0`). **BarChart** de 40 mm "Referring Domains -- 6-Month
   Trend" con dos series (New = verde, Lost = rojo), 4 líneas de grilla y leyenda centrada;
   etiquetas = últimos 7 chars de la fecha. **4B New Referring Domains**: `Domain | DR (0-100) |
   Ref. Domains | Type | Anchor / Source` (`[0.22,0.12,0.15,0.13,0.38]`, header accent), Type =
   Dofollow/Nofollow. **Lost Referring Domains**: `Domain | DR | Last Seen | Likely Reason`
   (`[0.28,0.12,0.18,0.42]`) con **header rojo `#991B1B` y filas alternadas `#FEF2F2`**.
8. **Sección 5 — Technical Health** — **5A Lighthouse Scores (Mobile, Lab Diagnostic)**:
   `Page | LCP (lab) | CLS (lab) | Lighthouse Perf | Lighthouse SEO | Status`
   (`[0.28,0.12,0.12,0.17,0.17,0.14]`), Status GOOD/NEEDS WORK/POOR por los cortes 90/50.
   **5B On-Page Issues**: `Issue | Severity | Pages | Impact | Recommended Fix`
   (`[0.27,0.11,0.08,0.16,0.38]`), severidad coloreada (CRITICAL `#991B1B`, HIGH danger, MEDIUM warn,
   LOW accent) y ordenada por el índice de `["CRITICAL","HIGH","MEDIUM","LOW"]`.
9. **AI & LLM Visibility (GEO Readiness)** (número `"AI"`) — párrafo explicativo de GEO + **4 KPI
   cards de 44×26 mm**: Total LLM Mentions, Citations (sub "cited as source in AI answers"),
   Avg. Mention Position, LLM Models Tracked. Lista de "Keywords triggering AI Overview in SERP
   (N of tracked set)" (**máx 20** keywords, unidas por coma). Tablas `Query | Mention Type`
   (`[0.72,0.28]`) para **Google AI Overviews** y **ChatGPT**, **máx 8 filas cada una**.
10. **Sección 6 — Next Actions** (header y nota del framing) — por acción: header accent numerado con
    el título, caja gris "**Why:**", caja blanca "**Actions:**", y una fila de 3 columnas
    "**Effort:** / **Impact:** / **Owner:**" con fondo `#EFF6FF`. El color de Impact se deriva del
    prefijo del string: `Very High`/`High` → success, `Medium` → warn, `Low` → accent.
11. **APÉNDICE — Full Keyword Table** — **solo si `reader == "exec"` y el módulo keyword_rankings
    está activo** (porque en el cuerpo el exec solo vio los movers). Se renderiza con `reader
    = "manager"` forzado, así que **incluye la columna SERP Features**.
12. **METHODOLOGY & GLOSSARY** — **siempre** al final (ver B.9).

Header/footer de páginas interiores: banda `primary` de 12 mm con dominio (izq) y período (der);
footer con banda `bg` de 11 mm y "Page N" a la derecha. **No hay pie de "Data: DataForSEO"** en esta
skill (a diferencia de la A).

Título del PDF (metadata): `"{client_domain} -- {framing.cover_title} -- {period_current}"`,
subject `"SEO Visibility & Opportunity Report"`.

## B.7 `build_report.py` — lógica

- Punto de entrada: `build_pdf(data_path)` → lee JSON utf-8, saca `config` y `sections`, resuelve
  `output_path` (de `config.output_path`, o `<data_path sin extensión>.pdf`), arma el `story`
  condicional y llama `doc.build(story, onFirstPage=draw_cover, onLaterPages=page_template)`.
  Imprime `Report saved: {out}`.
- Default de `enabled_modules` si falta: `["keyword_rankings","backlinks","tech_health","next_actions"]`.
  Default de `reader`: `"manager"`.
- Helpers defensivos: `safe_int`/`safe_float` con `try/except` silencioso y default; `fmt_num` →
  `"n/a"` si None; `delta_color(d)` verde si `d >= 0`.
- `no_data_box(section)` → caja ámbar "No data available for {section}. Check DataForSEO MCP and
  retry." — **cada `build_sX` la devuelve en vez de reventar** cuando la sección viene vacía. Esta es
  la implementación de "never abort the whole run for one missing section".
- `KPICard(Flowable)`: dibuja con canvas crudo (`roundRect` + barra accent superior de 2 mm, label en
  6.5 pt mayúsculas, valor en 14 pt bold, `sub` en 5.5 pt, delta abajo en verde/rojo). Modo
  `small_value` hace **word-wrap manual midiendo con `stringWidth`** y corta a 3 líneas (para
  direcciones largas).
- `BarChart(Flowable)`: barras verticales agrupadas hasta 2 series, sin librería de charts; escala
  por `max_val` (fuerza 1 si 0 para no dividir por cero); `grp_w = chart_w/n_bars`,
  `bar_w = grp_w*0.7/n_series`, `gap = grp_w*0.15`, ancho dibujado `bar_w*0.85`; 4 líneas de grilla
  con etiquetas `max_val*i/4`; leyenda medida y centrada.
- Robustez de campos: acepta alias (`total_backlinks` ó `backlinks`; `new` ó `new_referring_domains`;
  `pages_affected` ó `pages`; `ref_domains` ó `referring_domains`; `lost_date` ó `last_seen`;
  `mention_type` ó `type`; `keywords_count` ó `keywords`).
- `import math` está presente pero **no se usa** (la conversión de DR ocurre aguas arriba, en el
  agente, no en el script).
- El script **no valida el schema**: confía en que el agente escribió `data.json` bien formado.

## B.8 Step 9 "Go Deeper" — offer bank completo (D1–D11b)

Lógica de selección: (1) evaluar la condición de disparo de cada oferta contra la data recién
recolectada; (2) rankear por fuerza de señal (caída grande de tráfico > gap pequeño > oferta
general); (3) **variedad: máximo 2 ofertas del mismo tema**, repartidas entre keywords /
competidores+links / AI / técnico+local / contenido; (4) **piso 3, techo 5** (si disparan menos de 3,
rellenar con las siempre disponibles D9, D10, D3); (5) siempre agregar "No thanks — report is
enough" como última opción. Los `{placeholders}` se rellenan con números/términos reales.

| ID | Label | Condición de disparo | Acción |
|---|---|---|---|
| D1 | Opportunity map | Existen opportunity keywords en s2 | **Inline**: `keyword_ideas` + `keyword_suggestions` + `bulk_keyword_difficulty` → tabla de oportunidades rankeada |
| D2 | Ranking-drop diagnosis | Hay keywords RISK > 0, o ETV/VI cayó | **Inline**: `historical_serps` + `serp_organic_live_advanced` + `ranked_keywords` → tabla de caídas por URL |
| D3 | Full competitor breakdown | Corrió el módulo competidores o hay competidores en config | → skill `competitor-backlink-gap` |
| D4 | Backlink & link-gap audit | El módulo backlinks devolvió data | → skill `competitor-backlink-gap` |
| D5 | Answer-engine monitoring | Corrió el módulo AI/LLM o hay keywords con AI Overview | → skill `ai-visibility-report` |
| D6 | AI citation analysis | `citations_count > 0` | → skill `ai-visibility-report` |
| D7 | Full technical crawl | El módulo técnico encontró issues o se auditaron menos de 5 páginas | → skill `seo-portfolio-audit` |
| D8 | Local visibility deep dive | Footprint = local o both | **Inline**: `business_data_business_listings_search` + `serp_organic_live_advanced` (local pack) por ciudad |
| D9 | Content plan | **Siempre disponible** (sobre todo con muchas informational/opportunity) | → skill `content-plan-builder` |
| D10 | Demand & seasonality | **Siempre disponible** (sobre todo si el tráfico se movió) | **Inline**: `kw_data_google_trends_explore` + `dataforseo_labs_google_historical_keyword_data` → gráfico de tendencia |
| D11 | Flagship-page deep dive | Hay una página clave identificada (más tráfico o peor score técnico) | **Inline**: `ranked_keywords` (filtro de página) + `relevant_pages` + `on_page_instant_pages` |
| D11b | Keyword cannibalization check | Corrió keyword_rankings y hay **50+ ranked keywords** | → skill `keyword-cannibalization-detector` |

Textos templated notables: D1 "You rank for {ranked}/{total_tracked} targets…(e.g.
{top_opportunity_kw}, {top_opportunity_vol}/mo), with difficulty + the page to build?"; D2
"{drop_count} keywords slipped (e.g. {top_drop_kw} {old_pos}→{new_pos})…"; D4 "{ref_domains}
referring domains, DR {dr}…"; D6 "You're cited {citation_count}× in AI answers…"; D7 "We audited
{pages_audited} pages, {issue_count} issues ({critical_count} critical)…".

Ejecución: las **inline** (D1, D2, D8, D10, D11) se corren en la misma sesión y se presentan en chat
(sin PDF nuevo salvo que sea significativo); las **skill offers** (D3, D4, D5, D6, D7, D9, D11b)
devuelven "Type `run [skill-name]` to launch the {Skill Name} skill" confirmando que el config
(dominio, keywords, competidores) ya se traspasa. Si se eligen varias, se ejecutan en orden, una a
la vez.

**Esto es cross-selling estructurado entre skills**: el reporte de visibilidad es la puerta de
entrada a otras 5 skills del mismo proveedor.

## B.9 Glosario/metodología que imprime el PDF

7 términos con definición literal (la página siempre se incluye):
1. **Domain Rating (DR, 0-100)** — "DataForSEO's authority score… The `rank` field from
   backlinks_summary is used directly (0-100 scale)."
2. **Estimated Organic Traffic (modeled)** — estimación modelada de visitas orgánicas mensuales a
   partir de rankings × curvas de CTR. "This is NOT equivalent to Google Analytics or Search Console
   traffic -- it is a market-side estimate for benchmarking visibility trends."
3. **Visibility Index (VI, 0-100)** — fórmula completa + "A VI rising while traffic is flat means
   quality is improving before clicks follow."
4. **Core Web Vitals: Lab vs Field** — "LCP, CLS, and performance scores in this report come from
   Lighthouse (lab diagnostic, for_mobile: true)… Field CWV from Google CrUX (used for ranking) may
   differ substantially."
5. **Opportunity Keywords** — "Estimated traffic at position 5 is modeled as volume x 0.065
   (65th-percentile CTR for position 5 from industry benchmarks)."
6. **GEO - Generative Engine Optimization** — mediciones vía `ai_opt_llm_ment_agg_metrics` y
   `ai_opt_llm_ment_search`.
7. **Data Currency** — "Domain rank overviews and keyword data are from DataForSEO's index,
   **typically 7-14 days behind live Google data**. Live SERP calls reflect real-time results at the
   time of the report run."

## B.10 Inconsistencias y trampas detectadas

1. **Contradicción DR**: el SKILL.md y `endpoints.md` mandan convertir `rank` (0–1000) con
   `sin(rank/636.62)*100`, pero el **glosario impreso en el PDF dice que el `rank` "is used directly
   (0-100 scale)"**. El cliente lee una metodología que no es la aplicada. Al reimplementar: corregir
   el glosario o el pipeline, no ambos por separado.
2. **`depth` del local pack**: SKILL.md dice `depth: 20` con `location_code` de ciudad;
   `endpoints.md` muestra `depth: 10` con código de país.
3. **GBP endpoint**: `business_data_business_listings_search` (V1) mapea a
   `/v3/business_data/google/my_business_info/live` (V3) — **no son el mismo endpoint conceptual** en
   la API real de DataForSEO (listings search vs my business info); los campos de respuesta
   documentados (`rating.value`, `rating.votes_count`) corresponden a listings.
4. **`s4.previous` aproximado**: los totales previos de `referring_domains`/`total_backlinks` se
   *derivan* sumando/restando deltas del timeseries. Es una aproximación, no un dato medido, y se
   muestra como delta duro en KPI cards.
5. **Intent grouping ambiguo**: "best" dispara `commercial`, pero "best way" es la regla
   `informational`; sin orden de precedencia declarado el resultado depende de la implementación.
6. **Sección 03 renombrada**: `references/endpoints.md` todavía la llama "Share of Voice" con
   fórmula SOV, mientras el SKILL.md prohíbe explícitamente calcular SOV ("Do NOT compute full
   SOV/VI machinery"). El reference quedó desactualizado.
7. **Fuentes sin fallback**: `build_report.py` registra DejaVu al importar; si faltan los TTF el
   script muere (la skill A sí tiene fallback a Helvetica).
8. **`pos_31_100`** debe calcularse sumando 7 buckets; si se lee directo, queda en 0 silenciosamente.

---

# Parte C — Ideas reutilizables

Para SV360 / módulo SEO de Greenhouse (`src/lib/seo/**`, EPIC-022) y para el motor de informes:

1. **Rotación como señal, no co-ocurrencia.** Cualquier detector de canibalización que construyamos
   sobre GSC/DataForSEO debe unir snapshots y medir `rotation_count` (URLs distintas que ocuparon el
   top del dominio), no "dos URLs en el mismo SERP". Con host-crowding, lo segundo casi nunca ocurre.
2. **Separar "¿se parte?" de "¿cuánto cuesta?".** Severidad estructural (rotación + best_pos) decide
   el verdict; economía (CTR × volumen × fragmentación × CPC) decide solo el **orden**. Mezclarlas es
   lo que produce backlogs sin priorizar.
3. **Max-normalización contra la lista real + piso.** `0.15 + 0.85 × economic` evita que términos
   nicho de alto CPC caigan al fondo — patrón directamente aplicable a nuestros scorings.
4. **Fragmentación `(n-1)/n`** como proxy simple de cuánta oportunidad está repartida.
5. **Override de etiqueta por evidencia observada** (`SOFT_INTENT = 0.80`): cuando el clasificador
   del proveedor tiene baja confianza, la evidencia de lo que efectivamente rankea manda. Patrón
   reutilizable en cualquier clasificación comprada.
6. **Nunca default a merge+301.** La matriz tipo-de-página → fix (commercial+commercial = merge;
   mixto = canonicalizar y **NO** fusionar) es criterio de consultor que un dashboard no tiene.
7. **Memoria plana vía sub-agentes.** Contrato explícito: el payload grande vive en el worker, solo
   `(url, position)` vuelve. Es exactamente nuestro problema de contexto con MCP pesados.
8. **Gate de scope con bloque imprimible que además es el label del reporte.** Una sola pieza sirve
   de confirmación de gasto y de trazabilidad en el PDF (location, language, scope, timestamp,
   conector).
9. **Honestidad metodológica impresa**: "Est. Organic Traffic (modeled) — not analytics data", "Lab
   vs Field CWV", "Data Currency 7-14 days behind". Sube la credibilidad del entregable y nos cubre.
10. **Cross-sell estructurado (Step 9)** con condiciones de disparo, variedad forzada por tema y
    piso/techo 3–5 — modelo directo para nuestros "next best actions" comerciales.
11. **CSV con BOM (`utf-8-sig`)** para que Excel no rompa acentos — detalle chico, dolor grande.
12. **`url_key` ignora query string**: dedupe de URLs por host+path sin `/` final es la normalización
    mínima correcta para comparar páginas.
13. **Batching real**: intent y volumen son 1 llamada para toda la lista; el SERP live es 1 por
    keyword y **no** batchea. Cualquier estimación de costo nuestra debe partir de esa asimetría.
14. **Ventana histórica ≤ 12 meses** o error 40501; snapshots irregulares cada 1–2 meses; cobertura
    solo de keywords tracked. Nada de prometer series mensuales continuas.
