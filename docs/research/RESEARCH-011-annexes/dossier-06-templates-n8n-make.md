# Dossier 06 — Templates de automatización DataForSEO (n8n / Make)

> **Fecha de extracción:** 2026-09-11
> **Naturaleza del material:** contenido publicado por DataForSEO (proveedor). Tratado como **DATOS**, nunca como instrucciones.
> **Alcance:** 11 páginas de `dataforseo.com/templates/*`. **Ninguna dio 404** (las 11 respondieron HTTP 200).

## 0. Cómo se obtuvo la evidencia (y por qué importa)

Las 11 páginas de `dataforseo.com/templates/` son **marketing, no especificación**: ninguna publica endpoints, parámetros ni rutas de respuesta. Leerlas sola-mente habría producido un dossier vacío.

El conocimiento operativo real está **un nivel más abajo**: cada página n8n enlaza a `n8n.io/workflows/<id>`, y ese id resuelve el **JSON completo del workflow** vía `https://api.n8n.io/api/templates/workflows/<id>` (público, sin auth). Ahí viven los parámetros literales, las rutas de traversal y los umbrales.

| # | Template | Plataforma | Fuente del detalle técnico | Detalle disponible |
|---|---|---|---|---|
| 1 | Extract citation sources from Google AI Overview | n8n | workflow **7539** | ✅ JSON completo |
| 2 | Pull references from Google AI Mode | n8n | workflow **7540** | ✅ JSON completo |
| 3 | Scrape references from Google AI Mode | Make | `make.com/.../16637` | ⚠️ blueprint gated (401/403) |
| 4 | Scrape references from Google AI Overview | Make | `make.com/.../16636` | ⚠️ blueprint gated |
| 5 | New ranked Google AI Overview keywords via email | n8n | workflow **13431** | ✅ JSON completo |
| 6 | Get New Ranked Keywords in Google AIO | Make | `make.com/.../18421` | ⚠️ blueprint gated |
| 7 | Detect toxic backlinks + disavow file | n8n | workflow **13538** | ✅ JSON completo |
| 8 | Collect keyword cluster by URL | n8n | workflow **15319** | ✅ JSON completo |
| 9 | Find competitor keyword gaps → Notion | n8n | workflow **13508** | ✅ JSON completo |
| 10 | Find low-competition keyword opportunities | n8n | workflow **11216** | ✅ JSON completo |
| 11 | Check bulk domain spam scores | Make | `make.com/.../18979` | ⚠️ blueprint gated |

**Los 4 templates Make** requieren sesión iniciada para descargar el blueprint (`{"code":"IM015","message":"User is not logged in."}`). Tres de ellos son **portes 1:1 de un gemelo n8n** (3↔2, 4↔1, 6↔5 — el #6 incluso enlaza la *misma* planilla de ejemplo que el #5), así que sus parámetros se marcan **INFERIDOS del gemelo**. El #11 (bulk spam score) no tiene gemelo n8n; solo se documenta lo que declara su página.

---

## 1. Tabla endpoint → parámetros → para qué sirve

| Endpoint (POST) | Parámetros observados (valores literales) | Para qué sirve | Template | Verificación |
|---|---|---|---|---|
| `/v3/serp/google/organic/live/advanced` | `keyword:"why sky is blue"`, `language_name:"english"`, `location_name:"united states"`, **`load_async_ai_overview: true`**, `people_also_ask_click_depth:{}` (sin setear), `max_crawl_pages:{}`, `browser_screen_width/height/resolution_ratio:{}` | Capturar el bloque **AI Overview** y sus citas desde el SERP orgánico | 1, 4 | op n8n `get-live-google-organic-serp-advanced`; ruta REST **inferida** (confirmada contra docs y contra nuestro propio código) |
| `/v3/serp/google/ai_mode/live/advanced` | `keyword`, `language_name`, `location_name`, `browser_screen_*:{}`. **No** lleva `load_async_ai_overview` | Capturar la respuesta de **AI Mode** y sus referencias | 2, 3 | ruta **verificada en docs**; op n8n `get-google-ai-mode-serp` |
| `/v3/dataforseo_labs/google/ranked_keywords/live` | `target_any`, `language_name`, `location_name`, `limit:1000`, `offset:{{ $runIndex * 1000 }}`, **`item_types: ["ai_overview_reference"]`** | Keywords donde el dominio **ya aparece citado en AI Overview** | 5, 6 | params verificados en JSON; ruta REST inferida |
| `/v3/dataforseo_labs/google/ranked_keywords/live` | `target_any` (URL), `limit: Limit \|\| 100`, `language_name \|\| 'English'`, `location_name \|\| 'United States'` | Top-100 keywords orgánicas **por URL**, snapshot histórico | 8 | verificado |
| `/v3/dataforseo_labs/google/ranked_keywords/live` | `target_any` (mío y competidor), `offset:"=0"`, sin `limit` (→ default 100) | Keyword gap mío vs competidor | 9 | verificado |
| `/v3/dataforseo_labs/google/keywords_for_site/live` | `[{ target, location_name, language_name, limit }]` (todo desde Sheets) | Universo de keywords del dominio | 10 | **URL literal en el JSON** |
| `/v3/dataforseo_labs/google/bulk_keyword_difficulty/live` | `[{ keywords: items.map(i => i.keyword), location_name, language_name }]` | Enriquecer con KD 0–100 en lote | 10 | **URL literal en el JSON** |
| `/v3/backlinks/backlinks/live` | `target`, `limit:1000`, `offset:{{ $runIndex*1000 }}`, **`filters: ["backlink_spam_score", ">", 50]`**, `include_indirect_links:false` | Backlinks tóxicos → disavow | 7 | filtro verbatim; ruta REST inferida |
| `/v3/backlinks/bulk_spam_score/live` | hasta **1000** dominios/subdominios/páginas por request | Screening masivo de spam score | 11 | límite y escala 0–100 verificados en la página; ruta **inferida** |

### Costos y límites declarados (verificado en `docs.dataforseo.com`)

| Parámetro | Costo / límite | Nota de reembolso |
|---|---|---|
| `load_async_ai_overview: true` | **+USD 0.002** por request | "if the element is absent or contains `"asynchronous_ai_overview": false`, all extra charges will be returned to your account balance" |
| `people_also_ask_click_depth` | rango **1–4**, **+USD 0.00015 por clic** | se reembolsa si se hacen menos clics de los pedidos |
| `calculate_rectangles: true` | **×2** el costo de la task | — |
| Rate limit | **2000 llamadas/minuto** | cada llamada Live SERP = **una sola task** |
| AI Mode | "check Google Search Help for the list of countries where AI Mode is currently available" | disponibilidad por país |
| `keyword` | máx **700 caracteres** | — |

**Default crítico:** `load_async_ai_overview` es **`false` por defecto**, y en ese modo *"you'll only obtain `ai_overview` items from cache"*. Sin ese flag en `true`, una medición de AI Overview mide **la caché del proveedor**, no el SERP de hoy — y falla en silencio (devuelve 200 con menos ítems).

---

## 2. Cómo extraen las CITAS de AI Overview y AI Mode

### 2.1 El patrón que usan los dos templates (verificado, idéntico en 7539 y 7540)

Dos `splitOut` encadenados, sin código:

```
Split Out (items)      → fieldToSplitOut: "tasks[0].result[0].items"
Split Out (references) → fieldToSplitOut: "references"
```

Y el mapeo a Sheets, verbatim:

```
Source = {{ $json.source }}
Domain = {{ $json.domain }}
URL    = {{ $json.url }}
Title  = {{ $json.title }}
Text   = {{ $json.text }}
```

O sea: **el campo que contiene las fuentes se llama `references`**, cuelga del ítem de AI Overview / AI Mode dentro de `tasks[0].result[0].items`, y cada entrada trae `type: "ai_overview_reference"` + `source`, `domain`, `url`, `title`, `text`. Según docs, `text` es *"text snippet from the page that was used to generate the `ai_overview_element`"* — es decir, el **fragmento atribuido**, no un resumen: sirve como evidencia de *qué* de esa página fue citado.

**Estructura idéntica entre AI Overview y AI Mode.** Cambia el endpoint, no el shape. Un solo parser sirve para ambas superficies.

### 2.2 El caveat grande que los templates NO manejan

Docs de AI Mode, verbatim: *"References appear at multiple nesting levels"* — dentro de `ai_overview_element`, `ai_overview_table_element`, `ai_overview_expanded_element` y `ai_overview_shopping`.

Los templates hacen `splitOut` **solo del `references` de primer nivel**. Toda cita que viva dentro de un elemento expandido, una tabla o el bloque shopping **se pierde silenciosamente**. Un `splitOut` sobre un ítem sin campo `references` no lanza error: simplemente no emite filas. El resultado es un **sub-conteo de citas que parece un éxito**.

Tampoco filtran por `item_type === 'ai_overview'`: recorren *todos* los ítems del SERP y confían en que solo el de AI Overview traiga `references`.

### 2.3 Los dos caminos distintos para medir AI Overview (esto es lo fino)

DataForSEO ofrece **dos lentes que no son intercambiables**, y los templates usan una cada uno:

| Lente | Endpoint | Pregunta que responde | Template |
|---|---|---|---|
| **SERP-first** | `serp/google/organic/live/advanced` + `load_async_ai_overview` | "Para *esta keyword*, ¿a quién cita Google hoy?" → **todo el set de citas**, incluidos competidores y dominios de autoridad | 1, 4 |
| **Target-first** | `dataforseo_labs/.../ranked_keywords/live` + `item_types:["ai_overview_reference"]` | "Para *mi dominio*, ¿en qué keywords ya estoy citado?" → **inventario propio**, barato y paginable | 5, 6 |

El segundo es el hallazgo más reutilizable: `item_types: ["ai_overview_reference"]` convierte un endpoint de rank tracking en un **inventario de presencia en AI Overview a escala de dominio**, sin pagar un SERP por keyword.

---

## 3. Umbrales y criterios numéricos

### 3.1 Backlink tóxico (template 7 — verificado)

- **Corte exacto:** `filters: ["backlink_spam_score", ">", 50]` — spam score **estrictamente mayor a 50** en escala 0–100. La descripción lo llama *"default: >50"*, o sea es un default editable, no una verdad del proveedor.
- `include_indirect_links: false` — solo enlaces directos.
- **Guardas de Google implementadas como nodos `if`:**
  - `total_count < 100000` → si no, email "You have too many disavow links".
  - `Buffer.byteLength(text,'utf8') < 2000000` (**2 MB**) → si no, email "The file size is more than 2MB".
- Paginación: `offset = $runIndex * 1000`, bucle mientras `$runIndex < total_count / 1000 - 1`.

### 3.2 "Baja competencia" (template 10 — discrepancia verificada)

- El sticky del canvas afirma: *"Filters for low-competition keywords (**KD < 30**)"*.
- **No existe ningún nodo de filtro en el workflow.** La lista de nodos es: Read Seeds → Get Keywords → Get Keyword Difficulty → Merge → Format Data → Aggregate → Flatten → Write to Sheet. La descripción oficial, más honesta, solo dice *"analyzes their difficulty"*.
- **Conclusión: KD < 30 es la heurística declarada, no implementada.** El template enriquece con KD 0–100 y deja el filtrado al humano en la planilla.
- Métricas que sí captura por keyword: `search_volume`, `search_volume_trend.{monthly,quarterly,yearly}`, `keyword_difficulty`, `search_intent_info.main_intent` + `foreign_intent`, `avg_backlinks_info.backlinks`, `keyword_info.last_updated_time`, `se_type`.

### 3.3 Spam score bulk (template 11 — verificado en página)

> "evaluate up to **1000** domains, subdomains, or pages in a single request" · "Spam Score is DataForSEO's proprietary metric that evaluates how likely a domain is to be associated with spam signals on a scale from **0 to 100**".

### 3.4 Clustering (template 8 — el nombre miente)

**No hay algoritmo de clustering.** El template llamado *"Collect keyword cluster by URL"* hace `ranked_keywords` con `target_any = <URL>` y `limit = 100`: el "cluster" es, por definición, **el conjunto de keywords por las que esa URL ya rankea**. Agrupación por URL, no semántica.

Lo que sí aporta es el **modelo de almacenamiento**: una pestaña por URL, append-only, con `Run Date` por corrida, de modo que cada ejecución es un snapshot histórico que nunca pisa al anterior. Campos: `rank_group`, `rank_absolute`, `search_volume`, `keyword_properties.keyword_difficulty`, `cpc`, `competition_level`, `search_intent_info.main_intent`, `serp_item.type`, `etv`, `se_type`, y un literal `Data Source: "dataforseo_labs_google_ranked_keywords_live"` (procedencia estampada en la fila — buena práctica).

Cadencia: quincenal, lunes 9:00. Filtro de entrada: solo filas con `Status == "Active"`.

### 3.5 Detección de "keyword nueva" (template 5 — verificado)

```js
let oldKeywords = new Set(...)   // de la planilla, filtrando por Target
let newKeywords = items.map(item => item.keyword_data.keyword)
let diff
if (oldKeywords.size > 0) { diff = newKeywords.filter(x => !oldKeywords.has(x)) }
else { diff = [] }              // ← primera corrida NO reporta nada
```

Diff por **conjunto de strings sobre la corrida anterior completa**, con `Clear sheet (keepFirstRow: true)` + append del snapshot nuevo. El `else { diff = [] }` es deliberado: evita que el primer run mande un email con el catálogo entero. Cadencia: lunes 9:00. Email solo si `diff` no está vacío (nodo `Filter (has new AIO keywords)`).

---

## 4. Bugs y fragilidades verificadas en el código publicado

Esto no es crítica gratuita: son las trampas que heredaría cualquiera que copie estos patrones.

1. **Template 7 — typo que rompe la paginación.** Nodo *"Merge items with DFS response"*: `...$json.tasks[0].result[0].items.map(item => imtem.url_from)` — **`imtem`**, no `item`. El nodo gemelo del último page sí dice `item.url_from`. Consecuencia: el disavow funciona con ≤1000 backlinks y **revienta apenas hay una segunda página**.
2. **Template 7 — el disavow no cumple el formato de Google.** Genera `items.map(url_from).join("\n")`: URLs crudas, **sin prefijo `domain:`**, sin deduplicar. Google acepta URLs sueltas, pero un audit real desautoriza a nivel dominio; y sin dedupe el archivo infla contra el tope de 2 MB con repetidos.
3. **Template 10 — `https://api.ipify.org?format=jso`** (`jso`, no `json`) en el helper de IP; y `documentId` con placeholder literal `'XX'`.
4. **Template 8 — JSON malformado** en *"Prepare columns data for GS"*: falta la coma tras `"Keyword": ""`.
5. **Template 9 — el gap es estructuralmente optimista.** Compara el **top-100 del competidor** contra el **top-100 mío** (sin paginar, `offset:"=0"`), con un `notContains` en memoria. Toda keyword en la que yo rankeo en posición >100 aparece como "gap" falso. El template promete oportunidades; entrega diferencias entre dos ventanas truncadas.
6. **Transversal:** ningún workflow valida `tasks[0].status_code` de DataForSEO antes de navegar a `result[0].items`. Una task degradada del proveedor se manifiesta como "cero filas", indistinguible de "no hay citas".

---

## 5. Qué debería ROBAR un equipo que ya tiene su propio motor SEO/AEO

Contrastado contra nuestro runtime (`src/lib/growth/seo/**`, `src/lib/growth/ai-visibility/**`, `src/lib/ai/dataforseo*.ts`).

### Ya lo tenemos — no hay nada que robar

- `load_async_ai_overview: true` → ya está en `src/lib/growth/seo/rank-capture.ts:244`, con el costo documentado en el comentario (`depth 20 = ×2 → ~USD 0.008/call`).
- `item_types: ['organic', 'ai_overview_reference']` en ranked_keywords → ya en `prospect/collect.ts:163` y `etv-methodology/shadow-runner.ts:676`.
- **Recorrido recursivo de citas** → `google-ai-overview-adapter.ts:153` ya barre `['references','links','sources']`, es decir **ya resolvimos el caveat de anidamiento que los templates ignoran**. Nuestro parser es estrictamente superior al del proveedor.
- `keywords_for_site`, `bulk_keyword_difficulty`, `backlink_spam_score` per-link → ya integrados.

### Vale la pena robar

1. **`/v3/backlinks/bulk_spam_score/live` — 1000 targets por request.** Tenemos `backlink_spam_score` **por backlink** (`backlinks/detail-capture.ts`), pero **no el endpoint bulk**. Es la diferencia entre auditar el perfil de un dominio y **screenear 1000 dominios candidatos en una llamada** — exactamente el caso de link prospecting y de due-diligence de un prospecto nuevo. Grep: `bulk_spam_score` no aparece en `src/lib/`.
2. **Disavow como entregable, no como dato.** No tenemos nada de `disavow` en el repo. El valor no es el filtro `>50` (trivial): es el **contrato de salida** — archivo válido, con las dos guardas duras de Google (**<100.000 líneas**, **<2 MB**) chequeadas *antes* de entregar, y degradación explícita con mensaje accionable cuando no se cumplen. Eso es un artefacto que un cliente firma; hoy nosotros entregamos la tabla y el cliente arma el archivo. Si lo tomamos: arreglar los dos defectos del original (prefijo `domain:` y dedupe).
3. **Paginación dirigida por `total_count`.** El patrón `offset = runIndex * 1000` + `while runIndex < total_count/1000 - 1` aparece en dos workflows distintos (5 y 7) — es *su* idiom canónico. Nosotros leemos `total_count` pero **para reportar el universo**, no para paginarlo (`url-visibility/capture.ts:201` lo guarda como `totalRankedKeywords`; el `offset` de `keyword-discovery/reader.ts` es paginación **nuestra, en memoria**, no del proveedor). Para dominios con >1000 ranked keywords estamos leyendo una ventana y llamándola inventario. Ojo: esto cruza directo con el bug class ya registrado de **paginación que saltea filas en silencio** — si lo adoptamos, el orden tiene que ser por BYTES y la comparación del cursor expandida, y se valida paginando una corrida real de punta a punta contra lo persistido.
4. **Las dos lentes de AI Overview como decisión explícita de producto** (§2.3). SERP-first responde "¿a quién cita Google?" (incluye competidores y autoridades que ni sabíamos que existían); target-first responde "¿dónde estoy citado yo?" y es órdenes de magnitud más barato. Tenemos ambas piezas cableadas pero conviene que la elección esté **nombrada en el contrato de la capability**, no implícita en qué reader llamó cada superficie.
5. **Procedencia estampada en la fila.** El template 8 escribe `Data Source: "dataforseo_labs_google_ranked_keywords_live"` **en cada fila**, junto con `Run Date`, `Location` y `Language` leídos de `tasks[0].data` (el *echo* de la request, no de nuestra intención). Barato, y convierte cualquier tabla histórica en auditable sin cruzar contra logs.
6. **El snapshot append-only por sujeto** (template 8): una superficie por URL, una columna por fecha de corrida, jamás se pisa. Es el mismo principio que ya aplicamos en otros dominios; verificar que el histórico de ranked keywords por URL lo cumpla.
7. **El `else { diff = [] }` del primer run** (template 5). Detalle chico de UX operativa: la primera corrida de cualquier detector de "novedades" tiene el catálogo entero como novedad. Silenciarla explícitamente es más honesto que mandar 800 keywords "nuevas".

### Lo que NO hay que robar

- **El "cluster" del template 8** — no clusteriza nada (§3.4). Si prometemos clustering, es nuestro motor el que tiene que agrupar.
- **El "KD < 30"** como si fuera un umbral del proveedor: es una frase de marketing que el propio workflow no implementa (§3.2). Nuestro criterio de "baja competencia" tiene que ser nuestro, medido y defendible.
- **El gap del template 9** — comparar dos top-100 truncados y llamarlo oportunidad (§4.5).
- **El parser de citas de primer nivel** — el nuestro ya es mejor (§2.2).

---

## 6. Frontera verificado / inferido

**Verificado** (leído literal en el JSON del workflow, en la página, o en `docs.dataforseo.com`): todos los parámetros con valor literal de la §1; las rutas `keywords_for_site` y `bulk_keyword_difficulty` (URLs completas en el JSON); la ruta de AI Mode (docs); `load_async_ai_overview: true`; el filtro `["backlink_spam_score", ">", 50]`; `item_types:["ai_overview_reference"]`; las guardas 100.000 / 2 MB; el traversal `tasks[0].result[0].items` → `references` y los 5 campos; los costos +$0.002 / +$0.00015 y el rate limit 2000/min; el anidamiento multinivel de referencias; los bugs de la §4 (citados verbatim); la ausencia de filtro KD<30; los límites de la §3.3.

**Inferido** (marcado como tal): las rutas REST de `ranked_keywords`, `backlinks/backlinks` y `bulk_spam_score` a partir del nombre de operación del nodo n8n — coherentes con las docs y con las rutas que ya usa nuestro propio código, pero no impresas en las páginas; y los parámetros de los templates Make 3, 4 y 6, derivados de sus gemelos n8n verificados (2, 1 y 5 respectivamente).

**No obtenible:** los blueprints de los 4 templates Make (login-gated, `IM015`). Para el #11 (bulk spam score) solo hay la descripción de la página — su cuerpo de request exacto queda sin verificar.
