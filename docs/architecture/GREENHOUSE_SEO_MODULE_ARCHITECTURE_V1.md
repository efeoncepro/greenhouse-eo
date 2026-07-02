# Greenhouse SEO Module Architecture V1 — "Search Visibility 360"

> **Status:** Accepted (design) · 2026-07-01
> **ADR:** [GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md](GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md)
> **Epic:** `EPIC-022` · **Dominio:** `growth.seo` (hermano de `growth.ai_visibility`)
> **Autoría:** planificación con 4 lentes (arquitectura, SEO/AEO, product design, comercial).

Documento maestro del módulo SEO. Contrato técnico + de negocio del que derivan las tasks `TASK-1299…1310`. Complementa (no reemplaza) `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (el motor hermano).

---

## 1. Tesis y bounded context

El **AEO Grader** (`growth.ai_visibility`) responde *"¿los motores generativos citan a esta marca?"* — es **episódico** (un `grader_run` = veredicto puntual). El **SEO Module** (`growth.seo`) responde *"¿dónde rankea este dominio en búsqueda orgánica clásica, cómo está técnicamente, y quién lo enlaza?"* — es **serie temporal continua** (el valor es la tendencia entre snapshots diarios/semanales).

Se envuelven en una sola narrativa de producto: **Search Visibility 360** = los dos internets de búsqueda (Google orgánico + motores de IA) en un panel, con la misma identidad de org.

### 1.1 Boundary duro (NUNCA / SIEMPRE)

- **NUNCA** computar citabilidad AEO desde rank SEO ni viceversa. Distintos providers, distinta verdad. Rankear #1 y ser citado 0× por las IA es una **señal**, no un bug a reconciliar.
- **NUNCA** mergear tablas `grader_*` con `seo_*`. Se cruzan por `organization_id` en un derived read (`readSeoAeoGap`), nunca por FK cross-motor.
- **NUNCA** hacer reads SEO live-per-view contra DataForSEO en el render de un dashboard (costo + latencia + cuota). Los reads pegan a snapshots materializados en PG.
- **NUNCA** escribir/referenciar payroll, finance o compensación desde este dominio.
- **SIEMPRE** tratar GSC como **verdad de primera parte** (los clicks/impresiones/posición reales del propio dominio) y DataForSEO como **estimado de mercado** (visibilidad de competidores, SERP features, backlinks que Google no da). Son lentes complementarias, nunca promediadas.
- **SIEMPRE** exponer el cruce SEO↔AEO como derived read (report layer), no como tabla compartida.

### 1.2 Lo que comparten (reusar, nunca forkear)

- El cliente DataForSEO `src/lib/ai/dataforseo.ts` (Basic auth, `resolveSecret`, cost tracking) — ampliado, no duplicado.
- El schema `greenhouse_growth` + sus convenciones (`organization_id` FK a `Cliente`, append-only + anti-mutation triggers, sequence-based public IDs).
- Entitlement per-org vía `module_assignments` (modelo AEO, no por rol) + las 4 puertas.
- El reader Search Console per-org `readSearchConsoleAnalytics(orgId, params)` (TASK-1282) — el SEO es su consumer principal.
- El patrón report artifact (TASK-1252) para el entregable cliente.

---

## 2. Complementariedad SEO ↔ AEO

|  | AEO Grader (existe) | SEO Module (nuevo) |
|---|---|---|
| Pregunta | ¿La IA me menciona/cita? | ¿Rankeo y gano el click? |
| Motor | ChatGPT · Perplexity · Gemini · AI Overviews | Google orgánico clásico (10 azules + SERP features) |
| Métrica norte | Share of Voice IA, citation share | Visibility score orgánico, top-3/top-10, tráfico, CTR |
| Fuente | Providers LLM (server-side, sampled) | GSC (medido) + DataForSEO (mercado, estimado) |
| Cadencia | Prompt packs versionados (episódico) | Series diarias/semanales (continuo) |

**Señales que se cruzan (el valor está aquí):**
1. Rankeas #1 pero la IA no te cita → autoridad orgánica sin citabilidad (falta answer capsule/schema/frescura). CTA cruzado al AEO.
2. Te citan en AI Overview pero no rankeas → la IA te reconoce como entidad pero pierdes el click clásico; oportunidad bottom-funnel.
3. Competidor domina ambos → prioridad máxima; el 360 cuantifica la brecha en las dos capas.
4. Query con AI Overview + caída de CTR en GSC → canibalización IA medible: el AEO explica el *por qué*, el SEO lo *cuantifica* con el delta de CTR real.

**Matriz mental 360:** rankeo alto + citación IA = dominante · rankeo alto + IA baja = riesgo · rankeo bajo + IA alta = oportunidad rara · ambos bajos = invisible.

---

## 3. Mapa de capacidades por capa (fuente que la alimenta)

| Capa | Capacidad | Fuente |
|---|---|---|
| **1 · Fundamentos técnicos** | Site audit (crawl, indexabilidad, redirects, duplicados, thin) | DataForSEO **OnPage** (`instant_pages` + crawl `task_post`) |
| | CWV/INP de **campo** (ranking factor real) | **GSC** CrUX |
| | CWV **lab** / Lighthouse por-URL (diagnóstico) | DataForSEO OnPage `lighthouse/live` |
| | JSON-LD / structured data + internal linking | DataForSEO OnPage |
| | Estado de indexación real | **GSC** (Pages/Coverage) |
| **2 · Contenido-autoridad** | Keyword research + volumen + dificultad + gaps | DataForSEO **Labs** (`keyword_ideas`, `keyword_difficulty`, `search_volume`) |
| | Ranked keywords del dominio | DataForSEO Labs (`ranked_keywords`) + cruce GSC |
| | Content decay / canibalización | **GSC** (query×page real) + cálculo propio |
| | Topical authority / cluster gaps | DataForSEO Labs (`competitors_domain`, `keyword_gap`) + cálculo |
| | Backlink profile + digital-PR gaps | DataForSEO **Backlinks** (`backlinks`, `referring_domains`) |
| **3 · Medición** | Rank tracking + evolución temporal | **GSC** (real-user) + DataForSEO Labs/SERP (scraped) — §5 |
| | Visibility score / SoV orgánico | cálculo propio sobre Labs + GSC |
| | Movers / oportunidades / dashboard | cálculo propio (snapshots PG/BQ) |

> **Regla:** GSC es la verdad del propio dominio (medido, gratis). DataForSEO es la verdad del mercado + competidores + auditoría (estimado/scraped). Gastar DataForSEO en medir tu propio clicks/CTR = quemar cuota por dato que GSC ya tiene.

---

## 4. Modelo de datos (`greenhouse_growth`)

**SoT split:** PG es SoT de configuración + los últimos N snapshots (ventana caliente ~180d). BQ es SoT de la historia larga (tendencia analítica). El reactive consumer espeja cada snapshot a BQ (`greenhouse_growth_analytics.*`).

### 4.1 Configuración (mutable current + membership versionada)

- `seo_targets` — qué trackea una org. `organization_id` FK, `root_domain`, `location_code`+`language_code`, `status`, `created_by`. UNIQUE(org, root_domain, location, language).
- `seo_keyword_sets` — bundle nombrado por target.
- `seo_keyword_set_members` — keyword + tags[] + `effective_from`/`effective_to` (membership append-only; NUNCA DELETE de una keyword).
- `seo_competitors` — dominios competidores por target (append-only con effective_from/to).

### 4.2 Serie temporal (append-only, inmutable — el corazón)

- `seo_rank_snapshots` — 1 fila por (keyword, engine, device, capture_date): `position`, `url`, `serp_features` JSONB, `estimated_traffic`, `provider_cost`, `source_run_id`, `captured_at`. UNIQUE(target, keyword, engine, device, capture_date). Anti-mutation trigger.
- `seo_site_audit_runs` — 1 fila por crawl (semanal): `status` CHECK(`running|succeeded|degraded|failed`), `health_score`, `crawled_pages`, `provider_task_id`.
- `seo_site_audit_findings` — issues por crawl (append-only): `url`, `issue_type`, `severity` CHECK(`critical|warning|notice`), `detail` JSONB.
- `seo_backlink_snapshots` — snapshot de perfil (semanal): `referring_domains`, `backlinks_total`, `domain_rank`, `toxic_share`, `new_lost_delta` JSONB. UNIQUE(target, capture_date). Anti-mutation trigger.
- `seo_gsc_daily` — materialización diaria de GSC (query×page) append-only por `capture_date` (TASK-1302; convierte el read-through en serie propia > 16 meses).

**Decisión temporal:** snapshots = event rows append-only keyed por `capture_date` (mediciones, no supersede). Config = membership append-only con `effective_from/to` (términos). Reads temporales: `ORDER BY capture_date DESC` sobre la ventana caliente; índice compuesto `(seo_target_id, keyword, capture_date DESC)`.

---

## 5. Rank tracking + evolución temporal (feature ancla)

**Dos fuentes, un contrato de honestidad:**
- **GSC** (real-user, gratis, tu dominio): posición **promediada** por query×page×país×device×día. Verdad de tu tráfico. Serie base de tus URLs.
- **DataForSEO SERP/Labs** (scraped, cuesta, cualquier dominio): posición **exacta** en una SERP concreta, incluye competidores + SERP feature (AI Overview presente/no) + histórico de dominios ajenos (`historical_rank_overview`).

**Métricas derivadas:**
- **Visibility score** = Σ(peso_posición × search_volume) sobre el set tracked.
- **SoV orgánico** = visibility_propio / (propio + Σcompetidores) — espejo del SoV IA del AEO.
- **Movers** = Δposición vs snapshot anterior (umbral ≥3), ponderado por volumen.
- **Cannibalization** = misma query con >1 URL propia rotando entre snapshots (solo detectable con la serie GSC real).

---

## 6. DataForSEO governance

`normalizeEndpoint()` hoy hard-codea `/v3/serp/`. Se parametriza a un **registry declarativo de familias** (allowlist cerrado):

```
serp      /v3/serp/              (AEO usa esto hoy — no romper)
labs      /v3/dataforseo_labs/   keyword research, ranked keywords, competitors, historical rank
backlinks /v3/backlinks/         perfil de enlaces
onpage    /v3/on_page/           site audit (task-based async → ops-worker, no route handler)
domain    /v3/domain_analytics/  domain metrics
```

- **Un cliente, familias como config** (no un cliente por familia): transporte compartido + gate de familia + instrumentación por familia.
- **Cost tracking:** cada call persiste `provider_cost` en el snapshot + incrementa un contador `seo_provider_spend_daily` per-org (event-sourced) para el quota enforcement.
- **Circuit breaker por familia:** un Backlinks roto no hunde el cron de rank tracking; aísla SERP-AI (AEO) de Labs/OnPage/Backlinks (SEO) aunque compartan credenciales.
- **Honest degradation:** un audit que crawlea y devuelve 0 findings (`succeeded`) ≠ uno que falló el crawl (`failed`). Nunca fabricar snapshot.
- **OnPage es task-based (async):** POST crea task, se poll-ea → ops-worker (queue+poll), no Vercel route handler.

**Costos DataForSEO (verificado 2026-06):** Labs desde ~$0.0001/item + ~$0.01/task; OnPage crawl **$0.000125/pág**, JS render **$0.00125/pág**, **Lighthouse $0.00425/pág**; Backlinks **$0.02/req + $0.00003/fila**. Audits programados (no on-demand), cache, presupuesto por-org.

---

## 7. Primitives canónicos (Full API Parity)

Cada capacidad = primitive gobernado `src/lib/growth/seo/**`, reusable por UI + Nexa + MCP. Reads directos; writes vía `propose → confirm → execute`.

**Commands (write, capability-gated, audited, outbox):**
- `configureSeoTarget(orgId, { rootDomain, market }, actor)`
- `trackKeywords(keywordSetId, keywords[], actor)`
- `queueSiteAudit(targetId, actor)` (async OnPage task)
- `setBacklinkTracking(targetId, competitors[], actor)`

**Readers (shape + latency, muchos consumers):**
- `readRankEvolution(targetId, { keywords?, range, engine, device })` → `{ series: [{ keyword, points: [{date, position, url}] }] }` (PG hot window, BQ fallback).
- `readRankSnapshotLatest(targetId)` → standings + WoW delta.
- `readSiteAuditReport(targetId, auditRunId?)` → health + findings por severidad.
- `readBacklinkProfile(targetId, { range })`.
- `readKeywordOpportunities(targetId)` → **join SEO↔GSC** (striking-distance pos 8–20 alta impresión × volumen/dificultad DataForSEO).
- `readSeoAeoGap(targetId)` → **derived read cross-módulo** (`seo_rank_snapshots` × `grader_scores` por keyword/domain).

Todo reader retorna `{ ok: true, ... } | { ok: false, errorCode, status }` (espejo `SearchConsoleAnalyticsResult`).

---

## 8. Materialización & scheduling (no live-per-view)

Cloud Scheduler + ops-worker (async-critical), nunca Vercel cron.

- **Rank diario:** `seo-rank-capture` (~05:00 CLT) → `POST /seo/rank/capture-batch` → por target×keyword call DataForSEO, UPSERT `seo_rank_snapshots` (idempotente por capture_date), outbox → reactive BQ mirror.
- **Site audit semanal (2 fases, OnPage async):** `seo-audit-enqueue` (semanal, encola) + `seo-audit-collect` (cada 30min, poll idempotente por `provider_task_id`).
- **Backlinks semanal:** `seo-backlink-capture`.
- **GSC snapshot diario:** `seo-gsc-snapshot` → `readSearchConsoleAnalytics(orgId, {ayer, ['query','page']})` → `seo_gsc_daily` (arregla el read-through + sobrevive los 16 meses de GSC).

**Reliability signals** (`/admin/operations`, subsistema Growth Health): `seo.rank.capture_lag` (steady=0), `seo.audit.stuck_tasks`, `seo.provider.cost_over_budget`.

---

## 9. Entitlements (`growth.seo.*`, per-org)

Capabilities (grain espejo de `growth.ai_visibility.*`), seedeadas en la misma migración que `entitlements-catalog.ts` (capability-grant coverage rule):

```
growth.seo.target.configure     (execute, tenant)  autor de targets/keywords/competitors
growth.seo.audit.run            (execute, tenant)  disparar site audit
growth.seo.observation.read     (read, tenant)     rank/backlink/audit reads (contratado/operador)
growth.seo.report.read_client   (read, tenant)     gate del report cliente
growth.seo.entitlement.manage   (execute, tenant)  operador grantea acceso per-org
```

**Acceso per-org vía `module_assignments`** (no por rol — lección TASK-1248). Las **4 puertas**: operador (`entitlement.manage`, interno, todas las orgs), contratado (assignment activo → observación + report), trial/PLG (assignment con quota cap + expiry), público (quick-check rate-limited de 1 dominio, sin persistencia más allá de lead capture — reusa el patrón `public-submission` + `grader_leads`). Chokepoint único `enforceSeoRunEntitlement` con **quota cap por-org** (gate de costo DataForSEO).

---

## 10. Superficies y product design

### 10.1 Arquitectura de información

`Growth` sigue siendo dominio raíz. Dentro, sección local **"Search Visibility"** que agrupa dos motores hermanos: **SEO** (nuevo) + **AEO Grader** (existente, intacto).

Rutas operador (`internal`): `/admin/growth/seo` (Overview), `/admin/growth/seo/performance` (★ evolución URLs), `/admin/growth/seo/keywords`, `/admin/growth/seo/audit` (+ `/[issueGroup]`).
Rutas cliente (`client`): `/growth/seo`, `/growth/seo/performance`, `/growth/seo/report`.
Toda `page.tsx` nueva → `route-reachability-manifest.ts` + key en `GH_INTERNAL_NAV`.

### 10.2 Superficies por rol

- **Operador Efeonce:** cockpit denso, multi-Space, datos crudos, acciones.
- **Cliente:** dashboard self-service de SU Space, curado, honesto, mono-Space.
- **Report Artifact:** snapshot narrativo imprimible/PDF (3.er render adapter del mismo model, mirror del AEO report artifact).
- **Público (diferido):** "SEO quick check" de 1 dominio sobre el chokepoint gobernado.

### 10.3 Pantalla ancla — Rank & URL performance over time

Line chart multi-serie (**eje Y de posición invertido**, 1=arriba=mejor), 1 línea por URL/keyword con line-style+marker distintos (colorblind-safe), target line "top-3", band highlight de eventos de algoritmo, `dataZoom` temporal, tabla TanStack debajo con Δ30d + sparkline por fila. Set seleccionable (multi-select + chips) persistido en `?urls=`/`?keywords=`.

### 10.4 Dataviz (política ECharts para alto impacto)

Evolución posición = line multi-serie (Y invertido); clicks/impresiones = area (Y desde 0, NO dual-axis — charts apilados); oportunidad keywords = scatter (X dificultad, Y volumen, size clicks, color intención, zona quick-win sombreada); salud sitio = radialBar (ApexCharts); SEO vs AEO = quadrant scatter 2×2; SoV vs competidores = stacked bar horizontal o small multiples. A11y: `role="img"` + aria-label con el insight, toggle "Ver tabla de datos", posición invertida documentada (↓ = bueno → flecha abajo verde).

> **Nota de estado (2026-07-01):** ECharts aún NO está instalado (el repo corre ApexCharts 3.49 + Recharts). Instalar `echarts` + `echarts-for-react` (lazy por ruta) es Slice 0 de la pantalla ancla `TASK-1307` — Greenhouse sería el primer consumer del stack ECharts (alineado con la deprecación oportunista de ApexCharts, TASK-518). La alternativa B (line multi-serie Y-invertido sobre ApexCharts con `yaxis.reversed` + annotations) queda documentada en TASK-1307 por si Discovery la prefiere. `CustomChip`/`CustomAutocomplete` no existen como tal → usar `GreenhouseChip` + `@core/components/mui/Autocomplete`.

### 10.5 Estados y honestidad (state-design)

Sin conexión GSC → `EmptyState` accionable + CTA OAuth (nunca ceros fantasma). Medido (●, GSC) vs estimado (◑, DataForSEO) con leyenda persistente. Latencia explícita ("GSC: datos hasta hace 2 días"). Cuota agotada → banner honesto + degrada a GSC medido. Fallo parcial → mostrar lo que llegó, marcar el resto "Pendiente" con razón (`observeAndDegrade`).

---

## 11. Estrategia comercial

- **Narrativa:** "Search Visibility 360" — los dos internets de búsqueda en un panel + servicio que actúa. No compite en amplitud de features (Semrush) sino en **convergencia + ejecución**. Ataca el Pain 1 del ICP Globe (fragmentación de datos).
- **Packaging:** (a) capacidad interna que sube margen del retainer (reemplaza licencias Semrush) + (b) puerta contratada client-facing. NUNCA standalone. El tracking histórico vive SOLO detrás de la puerta contratada; el lead magnet público es siempre una **foto** puntual.
- **Pricing:** tiers por (nº keywords × dominios × frecuencia) — que es justo lo que escala el costo DataForSEO. Crédito absorbido, no passthrough crudo. Rango estimado: ~US$150-300/mes base, ~US$500-900 pro (validar contra loaded cost + escalator anual 3-7%).
- **Caso Berel:** evolución temporal de URLs de producto/categoría vs competidores (Sherwin/Sipa/Tricolor) + keyword gaps → pipeline de contenido + site audit del ecommerce. El gráfico de URLs 8→3 mientras estuvo con Efeonce = la conversación de renovación.
- **Cross-sell / NRR:** land con AEO lead magnet → operador corre SEO snapshot como insight outbound (Challenger) → expand a Search Visibility 360 en Active Accounts. Alimenta `is_at_risk`/ICO (visibilidad cayendo = riesgo churn + candidato expansión defensiva).
- **GTM interno-first:** Fase 0 Berel 60-90d (evidencia + margen unitario) → Fase 1 case study en portal Berel → Fase 2 client-facing a la cartera → Fase 3 lead magnet público.
- **Top-3 features de pull comercial:** (1) rank tracking temporal de URLs (la película, justifica recurrencia), (2) keyword research → gap accionable (motor de expansión/SOWs, sube NRR), (3) Search Visibility 360 unified view (el diferenciador de categoría). Site audit y backlinks son soporte, no lideran el pitch.

---

## 12. Programa de tasks (EPIC-022)

| Task | Perfil | Qué | Depende |
|---|---|---|---|
| TASK-1299 | backend-data | Schema `growth.seo` (config + snapshots append-only + triggers) | — |
| TASK-1300 | backend-data | DataForSEO family registry (allowlist + breaker + cost por familia) | — |
| TASK-1301 | backend-data | Capabilities `growth.seo.*` + `module_assignments` per-org + `enforceSeoRunEntitlement` | — |
| TASK-1302 | backend-data | GSC daily snapshot materializer + `readKeywordOpportunities` (quick win) | 1299 |
| TASK-1303 | backend-data | Rank capture command + `readRankEvolution` + Cloud Scheduler + reactive BQ mirror + signal | 1299,1300,1301 |
| TASK-1304 | backend-data | Site audit (queue+poll OnPage) + backlink snapshot | 1299,1300,1303 |
| TASK-1305 | backend-data | `readSeoAeoGap` derived read cross-módulo | 1303 |
| TASK-1306 | ui-ux | SEO Overview operador `/admin/growth/seo` | 1302 |
| TASK-1307 | ui-ux | ★ Rank & URL performance over time | 1306,1303 |
| TASK-1308 | ui-ux | Keyword opportunities | 1306,1302 |
| TASK-1309 | ui-ux | Site audit | 1306,1304 |
| TASK-1310 | ui-ux | Cliente + Report Artifact + quadrant 360 | 1305,1307 |

Todo gateado por `GROWTH_SEO_ENABLED` (default OFF) + fila en `FEATURE_FLAG_STATE_LEDGER.md`. Camino min-costo/max-valor: `1302 → 1306 → 1307`.

---

## 13. Riesgos / tradeoffs

1. **Costo DataForSEO (riesgo #1, $ + escalabilidad).** O(orgs × keywords × devices × días). Mitigación: quota cap por-org en `enforceSeoRunEntitlement`, batched Labs, GSC-first, signal `seo.provider.cost_over_budget`.
2. **Cuota + latencia (resiliencia).** OnPage async stalls; GSC 2-3d lag + cuota. Mitigación: poll idempotente por `provider_task_id`, breaker por familia, honest `degraded`, idempotencia por `capture_date`.
3. **Ampliar el candado (seguridad).** Mitigación: allowlist cerrado de 5 familias nombradas, nunca prefijos del caller.
4. **Secreto compartido con AEO (seguridad).** Mitigación: breakers + budgets por familia aíslan SERP-AI de Labs/Backlinks/OnPage.
5. **Reversibilidad.** Config/capabilities reversibles; la historia append-only es dura de revertir por diseño. Mitigación: `GROWTH_SEO_ENABLED` OFF + assignment per-org; rollback = revocar assignment.

---

## 15. Granularidad URL / Topic Cluster — "Search Visibility 360 granular" (extensión, 2026-07-02)

El 360 no vive solo a nivel marca: su expresión más potente es **a nivel página y topic cluster**. Para una landing específica (o un cluster temático completo) el sistema debe responder, en el tiempo: **keywords que rankea · avg position · clicks (GSC) · qué grounded queries la cita la IA · en qué motores · citation share** — y el cuadrante 360 a ESE nivel. Ninguna herramienta suelta (Semrush = solo SEO, Profound = solo IA) da esto; es el diferenciador más fuerte del producto.

**Qué ya existe (no hay que construirlo):**
- **SEO por URL:** `seo_rank_snapshots` guarda `position` + `url`; `seo_gsc_daily` es `query × page`; `readRankEvolution` ya filtra por URL. Keywords/avg-position/clicks por landing = cubierto.
- **AEO cita-por-URL:** el grader **ya captura las citas con URL**. `GrowthAiVisibilityCitation` (`src/lib/growth/ai-visibility/contracts.ts`) + `buildCitations`/`extractCitationDomain` (`observation.ts`) normalizan citas con `url`/`domain`/`title`; el adapter AI-mode (`providers/google-ai-overview-adapter.ts` → `collectCitationCandidates`) parsea `references`/`links`/`sources` de DataForSEO. Cada observación es por prompt → el prompt ES el **grounded query**.

**Qué falta (la extensión, 3 tasks):**
- **`TASK-1311` — AEO citation attribution (URL-level + grounded queries):** capa de lectura/atribución que filtra las citas al dominio propio, las mapea a la **URL específica**, y las agrupa por **grounded query (prompt) + engine + tiempo** (+ citation share). Confirmar que las citas persistan queryable (JSONB en `provider_observations` o tabla normalizada) — la CAPTURA ya existe, esto es reader/rollup.
- **`TASK-1312` — Topic Cluster como entidad de primera clase:** `seo_topic_clusters` (agrupa URLs + keyword sets por tema, per target, membership append-only) + rollup reader. Hoy el primitive más cercano es `seo_keyword_sets` + `tags[]`; el cluster lo formaliza y hace roll-up SEO+AEO.
- **`TASK-1313` — Unified Page/Cluster Visibility 360 read:** `readPageVisibility360(url)` + `readClusterVisibility360(clusterId)` — derived read que une SEO (rank/gsc por url) × AEO (citation attribution por url) por `org + url/cluster`, en el tiempo. Es la evolución de `readSeoAeoGap` de nivel marca → nivel página/cluster.

**Boundary intacto:** sigue siendo un **derived read** con join más rico (`org + url + keyword/cluster`), sin merge de tablas ni fusión de scoring — el boundary §1.1 aplica igual. El consumer UI (vista de análisis granular por landing/cluster) es follow-up ui-ux posterior; estas 3 tasks son la fundación backend-data.

### 15.1 Pillar page + topical authority (`TASK-1312` delta + `TASK-1314`)

Un topic cluster no es una lista plana de URLs: tiene estructura **pillar + supporting**. La **pillar page** es el hub del tema (cubre el término cabeza, amplio); las **supporting pages** cubren long-tail y enlazan de vuelta al pillar. La pillar es el punto donde **SEO clásico y AEO convergen**: es a la vez el activo que debe rankear el head term *y* el que la IA debería elegir citar como autoridad del tema. Es la unidad real de **topical authority**.

- **Modelo (delta a `TASK-1312`):** los miembros del cluster llevan un `role` (`pillar` | `supporting`, default `supporting`), con un **único pillar activo por cluster** (índice único parcial `WHERE role='pillar' AND effective_to IS NULL`). No es entidad nueva — es un campo del member.
- **Capacidad (`TASK-1314` — pillar-cluster health / topical authority):** reader analítico que **compone** los primitives existentes (no captura nueva): cobertura (¿hay pillar + suficientes supporting, o huecos vs keyword gap Labs?), estructura (¿las supporting enlazan al pillar? — internal linking del OnPage audit `TASK-1304`), rendimiento (¿la pillar rankea el head term y las supporting el long-tail? — `TASK-1303`), y el twist AEO: **¿es la pillar la fuente citada por la IA para el tema, o la IA cita a un competidor / a una supporting suelta?** (`TASK-1311`). Emite un **topical authority score** por cluster + los huecos accionables, con evolución temporal. Boundary §1.1 intacto (compone readers, no fusiona).

## 16. E-E-A-T — capa de entidad/calidad conectiva (extensión, 2026-07-02)

E-E-A-T (Experience · Expertise · Authoritativeness · Trustworthiness) es el "por qué" debajo de rankear (SEO) **y** de ser citado (AEO): una entidad fuerte hace ambas. Es la capa conectiva más profunda del 360 y el multiplicador del topical authority (§15.1). **YMYL** (finanzas/salud/legal) sube el listón.

**Materia prima ya existe (~70%, en el probe layer del grader):** eje `entity` (TASK-1267) — `probes/entity/knowledge-graph.ts` (¿entidad reconocida por Google KG?), `wikidata.ts` (entrada estructurada + sitio oficial), `reddit-ugc.ts` (reputación/menciones, fuente top de citas ChatGPT); eje `structural` — `probes/structural/json-ld.ts` (schema.org en el HTML); `brand-intelligence/` — LLM que **lee y analiza el contenido real del sitio** (`fetch-site-content.ts` + providers + prompt + store); + backlinks/referring domains (TASK-1304).

**Gap (la extensión):** (1) **capa de AUTOR** — E-E-A-T 2026 es cada vez más author-level (`Person`/`Author` schema, author pages, `sameAs`, credenciales); hoy se modela la entidad-marca, no la entidad-autor. (2) **rúbrica/rater E-E-A-T** que mapea las señales a los 4 pilares con una rúbrica derivada de las Quality Rater Guidelines de Google, YMYL-aware. (3) **señales de trust explícitas** (about/contact/policies/reviews/HTTPS).

**Dónde vive:** la evaluación E-E-A-T vive **cerca del grader** (extiende su eje entity + suma autor + rúbrica); el **módulo SEO la CONSUME** como señal en topical authority (1314) + recomendaciones. Un primitive, dos consumers. Boundary §1.1 intacto: es una capa de entidad/calidad que ambos motores referencian por `org`, no una tabla que los fusione.

**Honestidad obligatoria (regla dura):** E-E-A-T **NO es un dial de ranking que se lee** — es un *assessment*. Señales duras = **medibles** (●); pilares cualitativos = **juicio de rater LLM** (◑), que necesita **calibración + confianza honesta**. El rater NO puede repetir el falso-0 del grader (corregido en EPIC-021): marcar medido vs evaluado, reusar `evals/`+`accuracy/`, nunca falsa precisión; YMYL exige rúbrica más estricta.

**Tasks:** `TASK-1315` (signal extraction entity+author+trust), `TASK-1316` (rater rúbrica 4 pilares YMYL-aware + calibración golden-set), `TASK-1317` (`readEeatScorecard` + integración a topical authority/360). Consumer UI = follow-up ui-ux.

## 14. Documentación relacionada

- ADR: `GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`
- Motor hermano: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- Search Console: TASK-1282 + `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- Data platform: `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- Entitlements: `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- Full API Parity: `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- Funcional + manual: pendientes (exit criteria EPIC-022 — documentación triple).
