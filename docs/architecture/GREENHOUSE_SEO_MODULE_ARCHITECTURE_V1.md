# Greenhouse SEO Module Architecture V1 — "Search Visibility 360"

> **Status:** Accepted (design) · 2026-07-01
> **ADR:** [GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md](GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md)
> **Epic:** `EPIC-022` · **Dominio:** `growth.seo` (hermano de `growth.ai_visibility`)
> **Autoría:** planificación con 4 lentes (arquitectura, SEO/AEO, product design, comercial).

Documento maestro del módulo SEO. Contrato técnico + de negocio del que derivan las tasks `TASK-1299…1310`. Complementa (no reemplaza) `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (el motor hermano).

---

## Delta 2026-08-14 — el dato de mercado por keyword está VIVO (TASK-1661 `complete`, release `3754a17d3b1d`)

El módulo dejó de ser ciego a la demanda que no mide Search Console. `greenhouse_growth.seo_keyword_market_data`
(§4.2) es el SSOT del hecho de mercado, **multi-productor y desacoplado del target**; los primitives
(`captureKeywordMarketData` · `previewKeywordMarketDataCapture` · `readKeywordMarketData` · `deriveLinkBarrier`)
viven en `src/lib/growth/seo/keyword-market-data.ts` (§7); el scheduler mensual `ops-seo-keyword-market-data`
está **ACTIVO** y `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` **ON** en el ops-worker (§8).

Tres correcciones que este delta hace al texto anterior del documento, porque hoy son falsas:

1. **`readKeywordOpportunities` ya NO cablea `market: 'unavailable'`** — pasa a `'available'` cuando hay captura,
   y cada oportunidad viaja con `linkBarrier` derivada server-side (§7, §10.4).
2. **La barrera de enlaces NO sale de `keyword_difficulty`.** Ese índice colapsa a `0` en SERPs es-LATAM
   (`pintura`, 135.000 búsquedas/mes en MX, daba KD 0). La derivación canónica es `deriveLinkBarrier` sobre el
   perfil de enlaces del top-10, ponderando **diversidad de dominios referentes + page rank, nunca el conteo**.
   `classifyLinkBarrier` fue eliminada (§7).
3. **El mercado (país) es dimensión EXPLÍCITA** en toda resolución de target (ISSUE-153, §7) y **corregirlo es
   crear un target nuevo, nunca un `UPDATE` de `location_code`** (ISSUE-152, §4.1).

---

## Delta 2026-08-08 — catálogo cliente TASK-1310: `seo_v2` pendiente de aplicar

`seo_v1` se creó con `view_codes=[]`. TASK-1310 necesita exponer dashboard e informe en el menú
compuesto del portal, pero `greenhouse_client_portal.modules` prohíbe mutar esos campos in-place.
La migración `20260808131441444_task-1310-seo-client-view-codes.sql` crea **`seo_v2`**, conserva
status/tier/metadata de cada assignment vigente, cierra `seo_v1` y registra
`cliente.growth_seo_dashboard` + `cliente.growth_seo_report` con denials explícitos por rol. El
acceso sigue siendo per-org (`module_assignment` + capability), nunca role-wide.

**Estado (actualizado 2026-08-09):** migración aplicada y código en producción. `seo_v2` existe con
sus dos viewCodes y las dos organizaciones asignadas, y desde el release `49f86c98cda6` el runtime
**lee y escribe sólo `seo_v2`** (`TASK-1677` — ver §10.7). **El cutover está CERRADO desde el
2026-08-09**: código y datos. Los assignments `seo_v1` quedaron superseded por `effective_to`
(migración `20260809163352129`), y la fila `seo_v1` sigue en el catálogo como historia append-only.
Sobre la navegación cliente: `TASK-1675` cableó el menú module-driven y se verificó con sesión de
Grupo Berel contra producción el 2026-08-09 — el ítem `SEO` aparece compuesto desde
`module_assignments` y la ruta abre con datos medidos.

---

## Delta 2026-08-07 — `get_seo_overview_kpis` verificada end-to-end (TASK-1306)

La tool y su lane (`/api/platform/ecosystem/growth/seo/overview-kpis`) quedaron **ejercitados
contra staging con datos reales**, no sólo cableados y cubiertos por tests:

- Berel → `200` con 2.596 clics, 136.146 impresiones, posición ponderada 5.783, CTR 1.91%,
  `previous: null` y 5 puntos de serie. **Coincide exactamente con lo que muestra la UI**,
  que es la prueba de parity: un solo cálculo, dos consumidores.
- Org sin `module_assignment` → `404 not_found` (anti-oracle: no revela si la org existe).
- Sin token → `401`. `rangeDays=99999` → clampeado a `365` server-side.

⚠️ **El lane ecosystem NO se puede probar en `localhost`**: devuelve `500` por un `ENOENT` de
`@opentelemetry/instrumentation` en `node_modules`, y falla igual para endpoints sanos en
producción (verificado contra `rank-evolution`). Un 500 local no dice nada del endpoint —
la verificación válida es contra el deployment de staging. Receta con `curl`:
`docs/manual-de-uso/plataforma/operar-provider-greenhouse-seo-mcp.md`.

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

> **Delta 2026-08-07 (TASK-1655) — el carril GSC ahora TAMBIÉN tiene su mirror + camino de historial.** El módulo nació forward-only (medido en vivo: 5 días de GSC / 2 de rank teniendo 16 meses en la API) y el carril GSC no tenía espejo BQ — 5 días de `seo_gsc_daily` ya pesaban 27 MB en Cloud SQL, así que el histórico en OLTP no escalaba. Lo vigente:
>
> - **`greenhouse_growth_analytics.seo_gsc_history`** (particionada por `capture_date`, clustered por `organization_id, query`) es el SoT del histórico GSC. MERGE idempotente por `(org, capture_date, query, page)` — la misma clave del UPSERT de PG — con UPDATE en match (GSC consolida ~48h tarde y ambos stores deben corregirse igual). Mirror: `src/lib/growth/seo/gsc-history-bq-mirror.ts`.
> - **El batch diario espeja cada día materializado** (paso del batch, no outbox: el fetch y el espejo comparten el ciclo de vida del día; `bqMirror: 'mirror_failed'` se REPORTA en el outcome y el día se re-espeja al siguiente run — nunca divergencia silenciosa).
> - **Backfill del pasado por API → BQ directo** (`gsc-backfill.ts` + runner `scripts/growth/backfill-gsc-history.ts`): resumible (salta días ya presentes), honest degradation por día, NUNCA escribe a PG — meter el pasado en la tabla caliente recrearía el problema. Runbook: `docs/manual-de-uso/growth/backfill-historico-gsc.md`.
> - **Split de lectura por COBERTURA, no por rango fijo** (`readSeoPerformance`): si el primer día de PG llega después del inicio de la ventana pedida, la lectura completa va a BQ; con BQ vacío (pre-backfill) cae a PG. Un corte por N días fijos mentiría en ambas direcciones.
> - **Export nativo GSC→BQ por propiedad** = destino de largo plazo del continuo (gratis, sin muestreo; ya corre para `efeoncepro.com` en `efeonce-group.searchconsole.*` desde 2025-12-10, forward-only desde su activación). Su `sum_position` se promedia como `SUM(sum_position)/SUM(impressions)` — nunca un AVG plano. Activarlo por cliente requiere permiso Owner en la propiedad (out-of-band).
> - Retención PG declarada: ventana caliente ~180d; el purge físico es follow-up de TASK-1655.

### 4.1 Configuración (mutable current + membership versionada)

- `seo_targets` — qué trackea una org. `organization_id` FK, `root_domain`, `location_code`+`language_code`, `status`, `created_by`. UNIQUE(org, root_domain, location, language). 🔴 **Corregir el mercado de un target es crear uno nuevo y pausar el viejo, NUNCA un `UPDATE` de `location_code` in-place** (ISSUE-152, 2026-08-13: el target de Berel medía Chile siendo marca mexicana y acumuló 238 snapshots de un año contra el SERP equivocado; se corrigió con `seot-berel-mx` en `location_code` 2484 + pausa del CL). Razón dura: los snapshots son append-only y cuelgan del `seo_target_id`, así que mutar el país dejaría un año de mediciones chilenas colgando de una fila que **afirma** ser México — dos mercados mezclados en la misma serie, sin marcador que los separe y sin forma de deshacerlo.
- `seo_keyword_sets` — bundle nombrado por target.
- `seo_keyword_set_members` — keyword + tags[] + `effective_from`/`effective_to` (membership append-only; NUNCA DELETE de una keyword) + **procedencia `created_by` / `source`** (TASK-1308, migración `20260807173706557`). La tabla nació escrita sólo por scripts de seed, así que no registraba quién agregó cada keyword; con `trackKeywords` gobernado y tres consumers (UI operador, Nexa, MCP) sobre un efecto diferido caro, *"¿por qué estamos pagando por esta keyword?"* necesita respuesta auditable — que es justo la pregunta que llega cuando el gasto sube. Ambas columnas son **nullable y sin backfill**: las filas de seed conservan `NULL` honesto (no se sabe quién) en vez de un valor inventado. `source` lleva **CHECK de vocabulario cerrado** (`operator_ui | nexa | mcp | seed | backfill`) — si el motor sólo entiende N valores, que el schema los enumere: un `source` nuevo debe romper el INSERT, no colarse invisible en toda lectura que agrupe por procedencia. 🔴 `source` y `tags` son dimensiones **ortogonales** y por eso son dos columnas: `tags` es clasificación de dominio que elige el operador; `source` es procedencia técnica del write. Meterla dentro de `tags` rompería cualquier filtro de dominio que lea ese arreglo.
- `seo_competitors` — dominios competidores por target (append-only con effective_from/to).

### 4.2 Serie temporal (append-only, inmutable — el corazón)

- `seo_rank_snapshots` — 1 fila por (keyword, engine, device, capture_date): `position`, `url`, `serp_features` JSONB, `estimated_traffic`, `provider_cost`, `source_run_id`, `captured_at`. UNIQUE(target, keyword, engine, device, capture_date). Anti-mutation trigger.
- `seo_site_audit_runs` — 1 fila por crawl (semanal): `status` CHECK(`running|succeeded|degraded|failed`), `health_score`, `crawled_pages`, `provider_task_id`.
- `seo_site_audit_findings` — issues por crawl (append-only): `url`, `issue_type`, `severity` CHECK(`critical|warning|notice`), `detail` JSONB.
- `seo_backlink_snapshots` — snapshot de perfil (semanal): `referring_domains`, `backlinks_total`, `domain_rank`, `toxic_share`, `new_lost_delta` JSONB. UNIQUE(target, capture_date). Anti-mutation trigger.
- `seo_gsc_daily` — materialización diaria de GSC (query×page) por `capture_date` (TASK-1302; convierte el read-through en serie propia > 16 meses). UNIQUE(organization_id, capture_date, query, page). **Anclada a `organization_id`, NO a `seo_target_id`** — es la única tabla de la serie que se ancla a la org, y es deliberado: (a) GSC entrega por *propiedad verificada*, que vive en `search_console_connections` con `organization_id` UNIQUE, mientras `seo_targets` tiene grano **más fino** (`location_code` + `language_code`, dimensiones que GSC no particiona) — FKear al target obligaría a asignar cada fila arbitrariamente a uno de varios targets posibles; (b) separa medición permanente e irreemplazable de configuración mutable y archivable. Trigger **no-delete** (no anti-UPDATE, a diferencia de las demás): GSC consolida con ~48h de retraso, así que el re-run del mismo día debe poder corregir el valor.

- `seo_keyword_market_data` — el hecho de mercado por keyword (TASK-1661, migración `20260813171143226`; append-only con trigger anti UPDATE/DELETE). `normalized_keyword`, `keyword` crudo del proveedor, `location_code`, `language_code`, `capture_date`, `search_volume`, `keyword_difficulty`, `competition`, `cpc`, intención + el perfil de enlaces del top-10 (`avg_page_rank`, `avg_main_domain_rank`, `avg_backlinks`, `avg_referring_domains`; columnas NULLABLE agregadas por la migración follow-up `20260814125029477`). **Idempotencia por `UNIQUE (normalized_keyword, location_code, language_code, capture_date)`**. Tres decisiones que la separan del resto de la serie:
  - 🔴 **NO cuelga de `seo_targets` ni de `seo_keyword_set_members`.** El volumen es un hecho de `(keyword, país, idioma, as-of)` con frescura **mensual**, no una propiedad de una keyword seguida: "pintura industrial" tiene el mismo volumen en Chile para toda la cartera. Por eso la tabla nace **MULTI-PRODUCTOR** — TASK-1661 la llena desde `keyword_overview`; `TASK-1664` escribirá el `keyword_info` que ya viene **inline y pagado** en las respuestas de discovery y `TASK-1662` lo mismo desde `domain_intersection`. Una keyword candidata **todavía no es de nadie**: colgarla de un target la volvería inexpresable.
  - 🔴 **`organization_id` NO está en la clave única**: viaja como `captured_by_organization_id`, que es **atribución** de quién pagó la captura, no aislamiento de tenant — este dato no es del cliente, y dejarlo fuera de la clave permite que lo que pagó una org sirva a otra sin volver a gastar (es lo que abarata el top-up de 1664/1662 a escala de cartera). La dirección elegida es la **reversible**: la clave sin org es **más estricta** que la que la incluye, así que relajarla después es seguro (toda fila existente satisface la laxa); al revés habría que **borrar** duplicados y la tabla es append-only. 🔴 `captured_by_organization_id` **NUNCA** viaja en un DTO client-facing: expuesto, dejaría inferir por frescura qué keywords sigue otra organización.
  - **`location_code` es `TEXT`, no `INTEGER`** — espeja `seo_targets.location_code` (verificado contra PG real: es `text`, con valores como `'2152'`). La conversión a número ocurre **sólo en la frontera del proveedor**.

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

> **Delta 2026-08-07 (TASK-1307) — el AI Overview viaja DENTRO de la serie de rank, y sólo dentro de la ◑.**
>
> `RankEvolutionPoint` y `SeoPerformancePoint` (`contracts.ts`) ganaron un campo **aditivo** `aiOverview?: boolean`. Origen: `(serp_features ? 'ai_overview')` en PG y `'ai_overview' IN UNNEST(IFNULL(JSON_VALUE_ARRAY(serp_features), []))` en BigQuery (`rank-evolution-reader.ts`) — es decir, un atributo del **propio snapshot SEO** ya capturado con `load_async_ai_overview: true` (§8), no un dato nuevo ni un cruce.
>
> 🔴 **El campo sólo viaja cuando es `true`.** `...(row.ai_overview === true ? { aiOverview: true } : {})`: los consumers legacy comparan puntos por igualdad estructural, y emitir `aiOverview: false` en cada punto les cambiaría el shape sin cambiar el significado. La ausencia del campo es "no hubo AIO **o** esta fuente no lo reporta" — y ambas cosas se leen igual: no se marca.
>
> 🔴 **Sólo existe en la serie ◑ (DataForSEO). Search Console NO reporta features del SERP**, así que una serie ● jamás lleva marcadores. Esa ausencia es **honestidad, no un hueco del lector**: marcar AIO sobre una serie GSC sería afirmar una observación que nadie hizo.
>
> **Por qué está acá y no en el AEO.** Es el puente SEO↔AEO de la pantalla ancla: una **caída de CTR con posición estable** casi siempre se explica en la SERP, no en el sitio (señal 4 de §2, ahora medible en la misma serie). ⚠️ **NO cruza el boundary §1.1**: no hay JOIN, VIEW ni FK entre `seo_*` y `grader_*` — es una columna del snapshot SEO leída por el mismo reader que ya la capturaba.

---

## 6. DataForSEO governance

**Implementado por TASK-1300** (`src/lib/ai/dataforseo-families.ts` + `dataforseo-breaker.ts` + `src/lib/growth/seo/provider-spend.ts`). `normalizeEndpoint(endpoint, family)` es table-driven contra un **registry declarativo de familias** (allowlist cerrado):

```
serp      /v3/serp/              (AEO usa esto hoy — no romper)
labs      /v3/dataforseo_labs/   keyword research, ranked keywords, competitors, historical rank
backlinks /v3/backlinks/         perfil de enlaces
onpage    /v3/on_page/           site audit (task-based async → ops-worker, no route handler)
domain    /v3/domain_analytics/  domain metrics
```

- **Un cliente, familias como config** (no un cliente por familia): transporte compartido `postDataForSeoTask({ family, endpoint, tasks, organizationId })` + gate de familia + instrumentación por familia. `postDataForSeoSerpLiveAdvanced` delega en él con `family: 'serp'` sin cambiar su contrato — el AEO no se toca.
- **Cost tracking — `seo_provider_spend_daily` es la FUENTE ÚNICA de presupuesto.** El contador lo escribe el **transporte** en cada llamada cobrada (UPSERT atómico por `organization_id × family × spend_date`), así que una captura nueva no puede gastar sin quedar contabilizada por haber olvidado el registro; cubre además las llamadas que no dejan fila (tarea `on_page` async, consulta con cero resultados). `enforceSeoRunEntitlement` lee **sólo** este ledger: sumarlo además con el `provider_cost` de las tablas snapshot contaría el mismo gasto dos veces y agotaría los presupuestos a la mitad, en silencio. Ese `provider_cost` queda como procedencia por fila.
- **Atribución obligatoria por tipo.** Las 4 familias SEO exigen `organizationId` (el tipo lo impone y el runtime lo revalida) y el transporte **lanza** si el runtime no registró el contador — gastar sin contabilizar se descubre en la factura; un throw se descubre en desarrollo. ⚠️ `serp` lo deja opcional por una limitación actual, NO porque su gasto sea inatribuible: `grader_profiles.organization_id` existe y es nullable (TASK-1243), pero `ProviderAdapterContext` no transporta la organización, así que **el gasto AEO de perfiles ligados a un cliente no entra en su presupuesto** (follow-up con dueño en EPIC-020).
- **Circuit breaker por familia:** un Backlinks roto no hunde el cron de rank tracking; aísla SERP-AI (AEO) de Labs/OnPage/Backlinks (SEO) aunque compartan credenciales. `breakerOpen` en el resultado distingue "no se intentó" de "se intentó y falló".
- **Honest degradation:** un audit que crawlea y devuelve 0 findings (`succeeded`) ≠ uno que falló el crawl (`failed`). Nunca fabricar snapshot.
- **OnPage es task-based (async):** POST crea task, se poll-ea → ops-worker (queue+poll), no Vercel route handler.

**Costos DataForSEO (verificado 2026-06):** Labs desde ~$0.0001/item + ~$0.01/task; OnPage crawl **$0.000125/pág**, JS render **$0.00125/pág**, **Lighthouse $0.00425/pág**; Backlinks **$0.02/req + $0.00003/fila**. Audits programados (no on-demand), cache, presupuesto por-org.

---

## 7. Primitives canónicos (Full API Parity)

Cada capacidad = primitive gobernado `src/lib/growth/seo/**`, reusable por UI + Nexa + MCP. Reads directos; writes vía `propose → confirm → execute`.

**Exposición MCP/ecosystem — IMPLEMENTADA (TASK-1645, 2026-08-05).** Lane machine-authed
`/api/platform/ecosystem/growth/seo/{keyword-opportunities,visibility-360,entitlement}` (vía
`runEcosystemReadRoute`; resource builder `src/lib/api-platform/resources/ecosystem-growth-seo.ts`:
org por binding — org-scoped manda con mismatch 404 anti-oracle, internal exige `organizationId` —,
entitlement per-org `seo_v2` → 404 anti-oracle, `target_not_configured` honesto, payloads passthrough
de los readers) + **3 MCP tools read-only** en `src/mcp/greenhouse/**`: `get_seo_keyword_opportunities`,
`get_seo_visibility_360` (nace con el cruce AEO real de TASK-1305) y `get_seo_entitlement` (el
chokepoint como lectura, SIN anti-oracle por diseño — visibilidad operativa). Regla vigente
(mandato del operador): **todo reader SEO/E-E-A-T futuro expone su MCP tool en el MISMO PR**
(criterio de aceptación en TASK-1303/1304/1311/1312/1313/1314/1317). La federación al gateway
`mcp.efeonce.org` es `TASK-1647` (adapter delgado del provider; canaries antes de discovery).

**Delta 2026-08-07 (TASK-1308) — el lane SEO deja de ser sólo lectura.** `keywords/track` y
`keywords/untrack` son sus **dos primeros commands**: van por `runEcosystemCommandRoute`, no por el
helper de lectura, porque un write necesita idempotencia por `Idempotency-Key` + auditoría de
ejecución — un reintento del gateway sobre un timeout de red no puede volver a comprometer gasto. El
actor que llega al command es `mcp:<consumer.publicId>`: en este lane el sujeto es la MÁQUINA, no una
persona. 🔴 **Sólo bindings de scope `internal`** (`403 scope_not_allowed`): un binding cliente lee sus
oportunidades pero **no hace crecer su propia factura**; y el mismo boundary aplica a la baja, aunque
bajar el gasto suene inofensivo — quien no decide qué se mide tampoco decide qué se deja de medir. En
el MCP interno son `track_seo_keywords` / `untrack_seo_keywords` (`src/mcp/greenhouse/server.ts`),
federadas al gateway bajo `efeonce.mcp.seo.write`. ⚠️ **Fail-closed hasta que exista un cliente con
grant controlable**: el scope está creado en Entra pero deliberadamente NO cableado al cliente PKCE
público compartido — en esta cadena es la única puerta que depende de QUIÉN es la persona, y abrirla a
todo el tenant daría poder de comprometer gasto DataForSEO recurrente a cualquiera que se autentique
(razonamiento completo en `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` §"El scope de escritura NO se
cablea al cliente público compartido"; el camino correcto es `TASK-1631`).

**Commands (write, capability-gated, audited, outbox):**
- `configureSeoTarget(orgId, { rootDomain, market }, actor)`
- `trackKeywords(seoTargetId, keywords[], actor)` — **IMPLEMENTADO (TASK-1308, 2026-08-07)** en `src/lib/growth/seo/track-keywords.ts`. 🔴 **No es un INSERT: es un COMPROMISO DE GASTO DIFERIDO.** El write no cuesta nada; el rank capture diario (TASK-1303) le paga al proveedor por cada keyword vigente del set, en cada ciclo, hasta que alguien la deje de seguir. Por eso lleva **techo gobernado por target** (`GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`, default 200 → outcome `capacity_exceeded` explícito, nunca silencio ni excepción), **entitlement per-org** (`seo_v2` vigente; NO consume allowance de site-audit — seguir no gasta hoy, gasta mañana), **outcome POR keyword** (`tracked|already_tracked|capacity_exceeded|invalid`, nunca un booleano), normalización + dedupe, idempotencia (`ON CONFLICT DO NOTHING` sobre el índice único parcial) y `FOR UPDATE OF` contra dos "Seguir" concurrentes. Append-only: sólo inserta — dejar de seguir es cerrar `effective_to` y es OTRO command, `untrackKeywords`, entregado en la misma task (abajo). App-lane `POST /api/admin/growth/seo/keywords/track` (capability `growth.seo.target.configure`) + lane ecosystem `POST /api/platform/ecosystem/growth/seo/keywords/track` (**sólo bindings de scope `internal`**: un binding cliente lee sus oportunidades pero no hace crecer su propia factura) + MCP tool `track_seo_keywords`, federada al gateway con el **scope de escritura del dominio** `efeonce.mcp.seo.write` — del DOMINIO y no de la capability: un scope por capability convertiría la lista de scopes de Entra en un espejo del `capabilities_registry`, editado a mano, que diverge; y el gateway NUNCA es autoridad de autorización. La regla es **un scope por clase de blast-radius** (`globe.credits.funding.ensure` tiene el suyo porque mueve dinero, no porque sea una capability). Lo fino ya se enforcea abajo: binding `internal` + entitlement per-ORG + techo. Evento `growth.seo.keyword_set.updated` emitido dentro de la transacción.
- `untrackKeywords(seoTargetId, keywords[], actor)` — **IMPLEMENTADO (TASK-1308)**, el reverso que hace REVERSIBLE el compromiso de gasto: sin él, seguir una keyword la dejaba en el ciclo de facturación del proveedor para siempre y el techo del set era un callejón sin salida. **NO borra**: cierra `effective_to` (append-only, trigger anti-DELETE de TASK-1299), así que el histórico sigue explicando facturas pasadas y el índice único parcial permite volver a seguirla después. 🔴 Usa `clock_timestamp()` y NO `NOW()`: `NOW()` devuelve el inicio de la transacción y cerrar una membresía creada en ella produce `effective_to = effective_from`, que revienta el CHECK `effective_to > effective_from` (23514) — lo encontró el sanity contra PG real, los mocks lo daban por bueno. A diferencia del alta **NO exige target activo**: si el target se pausó con el set lleno, bloquear la salida congelaría el gasto. App-lane `POST /api/admin/growth/seo/keywords/untrack` + lane ecosystem (sólo bindings `internal`) + MCP tool `untrack_seo_keywords` federada, compartiendo el scope del alta — quien puede subir la factura puede bajarla.
- `queueSiteAudit(targetId, actor)` (async OnPage task)
- `createGroundedQueryDraft(input)` / `readGroundedQueryDraft(input)` — **IMPLEMENTADOS (TASK-1666, 2026-08-14)** en `src/lib/growth/seo/grounded-query-{bridge,reader}.ts`: el puente gobernado candidatos de discovery → **DRAFT** de grounded queries AEO. Contratos duros: el bridge es un ADAPTER (lee candidatos SOLO por `readKeywordDiscovery` con el filtro `candidateIds`; cero SQL/JOIN/FK cross-motor — boundary §1.1); el brand context es el AUTORIZADO server-side (`grader_profiles` + brand intelligence, jamás del caller); doble capability (`growth.seo.observation.read` + `growth.ai_visibility.prompt_set.manage`); ≤20 candidates, sin duplicados, estados permitidos (`new`/`selected_for_grounded_query` — `dismissed` exige re-selección); `contextRef` = SHA-256 del JSON canónico exacto de la spec; refs OPACAS en `grounding_sources_json` (`seo.discovery.{run,candidate,context}:…`, jamás la keyword); **honestidad del grounding**: `grounded_llm` sólo si la autoría usó el contexto (cerebro versionado aparte `aeo-author.seo-grounded.v2` — v2 2026-08-14 post-auditoría AEO: cobertura obligatoria por seed verificada determinísticamente (`computeSeoSeedCoverage` → `seedCoverage`/`coverageNotice` en el resultado), sanitizer normaliza competidor literal a `{{competitor}}` y una marca literal fuerza `namesBrand=true`, pisos de distribución grounded (≥50% discovery + 4 fanOutTypes, degenerado → fallback honesto); `aeo-author.v1` queda byte-a-byte intacto sin contexto), fallback = `baseline_fallback` + aviso obligatorio + `groundingRef='baseline_not_candidate_specific'`; idempotencia por contexto + modo esperado con `pg_advisory_xact_lock` en conexión fijada (un baseline previo NO bloquea re-generar grounded); **el bridge SÓLO crea draft** — `approveGraderPromptSet` (AEO) sigue siendo la única vía a `active` y jamás se dispara un run. Parity en el mismo PR: route admin `POST/GET /api/admin/growth/seo/grounded-queries`, lane ecosystem `grounded-queries` (GET/POST, **sólo bindings `internal`**), MCP `get_seo_grounded_query_draft` + `prepare_seo_grounded_queries` (write bajo `efeonce.mcp.seo.write`; con la identidad máquina compartida el write queda **`aeo_forbidden` fail-closed hasta TASK-1631** — la capability humana de prompt sets no se fabrica para la máquina). Sanity live: `scripts/growth/_sanity-task-1666-grounded-query-bridge.ts` (16/16 con autoría real; eval humana de naturalidad incluida).
- `queueKeywordDiscovery(input)` / `previewKeywordDiscovery(input)` / `recordKeywordDiscoveryAction(input)` — **IMPLEMENTADOS (TASK-1664, 2026-08-14)** en `src/lib/growth/seo/keyword-discovery/queue.ts`, con el reader `readKeywordDiscovery(input)` en `keyword-discovery/reader.ts` y el runner async (`runKeywordDiscovery`/`drainKeywordDiscoveryRuns`) en `keyword-discovery/runner.ts`. La corrida separa la SOLICITUD (run `pending` + outbox en una tx, seeds resueltas server-side desde `manual | gsc_queries | tracked_keywords | target_domain | mixed`, máx 10) de sus RESULTADOS (candidatos con SOLO procedencia — la métrica va al store de 1661) y de las DECISIONES (`seo_keyword_discovery_actions`, append-only, jamás trackea por sí sola). Preview con **fórmula** de costo, no sólo un número; `methods: []` es una corrida GSC-only válida con costo CERO (valida el pipeline sin gastar). El reader compone en memoria mercado ◑ (vía `readKeywordMarketData`, nunca SQL directo) + GSC ● (`measuredGsc`, lente SEPARADA) + `alreadyTracked` + última acción, con el orden por defecto de 7 llaves (acción pendiente → match de seed → core_keyword → volumen desc → dificultad asc → captured_at desc → id). Full API Parity en el mismo PR: route admin `POST/GET /api/admin/growth/seo/keyword-discovery` (capabilities `growth.seo.target.configure` para escribir / `observation.read` para leer), lane ecosystem `GET/POST /api/platform/ecosystem/growth/seo/keyword-discovery` (+`/actions`; write sólo bindings `internal`), MCP tools `get_seo_keyword_discovery` + `discover_seo_keywords` (write bajo `efeonce.mcp.seo.write`; su description exige preview + confirmación humana ANTES de encolar) y parity test `keyword-discovery-parity.test.ts`. Sanity PG real: `scripts/growth/_sanity-task-1664-keyword-discovery.ts` (27 checks, transacción abortada + smoke `--spend`).
- `setBacklinkTracking(targetId, competitors[], actor)`

**Readers (shape + latency, muchos consumers):**
- `readRankEvolution(targetId, { keywords?, rangeDays?, engine?, device? })` → `{ series: [{ keyword, points: [{date, position, url}] }] }` — **IMPLEMENTADO (TASK-1303, 2026-08-06)** en `src/lib/growth/seo/rank-evolution-reader.ts`: rango ≤180d desde PG (índice `(seo_target_id, keyword, capture_date DESC)`), rango mayor desde BQ `seo_rank_history`; filtros keywords (máx 100)/engine/device; `no_data` honesto en serie vacía; NUNCA mezcla con la serie GSC. Expuesto en el mismo PR como lane `/api/platform/ecosystem/growth/seo/rank-evolution` + MCP tool `get_seo_rank_evolution` (mandato parity+MCP; patrón TASK-1645).
- ~~`readRankSnapshotLatest(targetId)` → standings + WoW delta.~~ **NO EXISTE — corrección 2026-08-07 (TASK-1306).** Este reader se citaba acá, en el master UI flow §1 y en las specs de `TASK-1306`/`1307` como si `TASK-1303` lo hubiera entregado; esa task sólo dejó `readRankEvolution`. Los **movers WoW** (el consumidor real del contrato) se **derivan de la serie de evolución**: se toma el último punto medido de cada keyword y el punto más cercano a 7 días atrás (`readSeoOverviewSidebar`, umbral ≥5 posiciones), en vez de abrir una segunda puerta a los datos de rank. **NUNCA** volver a citarlo como existente; si algún día hace falta un reader de standings, se autora con su propia task y su MCP tool en el mismo PR.
- `readSiteAuditReport(targetId, auditRunId?)` → health + findings por severidad — **IMPLEMENTADO (TASK-1304, 2026-08-06)** en `src/lib/growth/seo/site-audit/reader.ts`: último run del target (un `running` se reporta como "audit en curso", hecho no error) o run puntual tenant-safe (`run_not_found`); findings agrupados critical/warning/notice con `issue_type` = check OnPage estable (allowlist curado `findings-map.ts`, solo checks true=problema); `no_data` honesto sin runs. Expuesto en el mismo PR como lane `/api/platform/ecosystem/growth/seo/site-audit-report` + MCP tool `get_seo_site_audit_report` (mandato parity+MCP).
- `readBacklinkProfile(targetId, { range })` — **IMPLEMENTADO (TASK-1304, 2026-08-06)** en `src/lib/growth/seo/backlinks/reader.ts`: serie semanal desde PG (`referring_domains`, `backlinks_total`, `domain_rank` 0–100, `toxic_share` = spam score del perfil entrante / 100 como proxy documentado, `new_lost_delta` ventana 30d); `no_data` honesto. Lane `/api/platform/ecosystem/growth/seo/backlink-profile` + MCP tool `get_seo_backlink_profile` en el mismo PR.
- `readKeywordOpportunities(targetId)` → **striking-distance** sobre la serie GSC (TASK-1302, implementado). Método fijado con la skill `seo-aeo`:
  - **Posición 8–20** ponderada por impresiones: `SUM(position × impressions) / SUM(impressions)` sobre una ventana de **28 días** (4 ciclos semanales completos). `AVG(position)` entre días es incorrecto — GSC ya entrega su `position` ponderada dentro del período, así que promediar días planos daría el mismo peso a un día de 2 impresiones que a uno de 500.
  - **"Alta impresión" es un percentil de la propia organización** (default P75), no un número absoluto: un sitio de 100 impresiones/día y uno de 1M no comparten umbral. Con piso estadístico (bajo ~10 impresiones la posición media no es interpretable).
  - **Score = clics incrementales estimados**: `impresiones × max(0, CTR_objetivo − CTR_actual)`. Las impresiones de GSC **ya son demanda medida** — y de la propia SERP, mejor que un volumen estimado por un tercero. La curva de CTR por posición se **deriva de los datos de la propia org**, de modo que absorbe sola el efecto de los AI Overviews en ese sitio; hay una curva pública de fallback sólo para posiciones sin datos propios.
  - **Canibalización se marca, no se descarta** (`cannibalized` + `competingPages`): una query con >1 página es una oportunidad de **consolidación**, no de optimización.
  - Volumen/dificultad de DataForSEO Labs es **enriquecimiento**, no el corazón. **IMPLEMENTADO (TASK-1661, en producción desde el release `3754a17d3b1d`, 2026-08-14):** `market` **ya no está cableado a `'unavailable'`** — pasa a `'available'` cuando hay al menos una captura para las keywords de esa lectura, y cada `KeywordOpportunity` viaja además con `linkBarrier` (`low | medium | high | unknown`) **ya derivada server-side**, para que ninguna vista invente su propio umbral. El striking-distance sigue siendo demanda **medida** de GSC y no depende del enriquecimiento: con `market: 'unavailable'` el reader entrega igual la lista completa, con `linkBarrier: 'unknown'` por fila.
- `readKeywordMarketData({ keywords, locationCode, languageCode })` → **IMPLEMENTADO (TASK-1661, en producción desde el release `3754a17d3b1d`, 2026-08-14)** en `src/lib/growth/seo/keyword-market-data.ts`. Reader canónico del dato de mercado (lente ◑ **estimada**, ciclo de refresh **mensual** del proveedor). Consumers: `readKeywordOpportunities`, lane `/api/platform/ecosystem/growth/seo/keyword-market-data`, MCP tool `get_seo_keyword_market_data` **federada al gateway `mcp.efeonce.org`** y —a futuro— `TASK-1664`/`TASK-1662`. Los otros tres primitives del mismo archivo cierran el ciclo y **ninguno es sustituible por SQL ad-hoc**: `captureKeywordMarketData(targetId, actor)` (el único que **gasta**), `previewKeywordMarketDataCapture(...)` (**dry-run obligatorio antes de gastar**: reporta fórmula, keywords elegibles y costo estimado sin llamar al proveedor) y `deriveLinkBarrier({ avgReferringDomains, avgPageRank })` (derivación **pura**, probable sin base de datos porque es una regla de producto, no una consulta). Contratos duros:
  - 🔴 **La métrica de mercado es UN solo hecho de `(keyword, país, idioma, as-of)`, con SSOT en `greenhouse_growth.seo_keyword_market_data`.** No cuelga de `seo_targets` ni de `seo_keyword_set_members`: no depende de si la keyword se sigue ni de quién la descubrió. La tabla nace **multi-productor** — 1661 escribe desde `keyword_overview`, y `TASK-1664`/`TASK-1662` escribirán el `keyword_info` que ya viene **inline y pagado** en sus respuestas de discovery/gap. **NUNCA** crear una segunda tabla de volumen/dificultad ni un segundo adapter de `keyword_overview`.
  - **El mercado se deriva del target, jamás del caller** (`readKeywordMarketDataForTarget`): el volumen de una keyword no es global, y dejar que el consumer elija el país produce cifras distintas para lo mismo en dos superficies.
  - **Selección explícita y acotada de keywords.** No existe el modo "todas las keywords de la org": este reader es un lookup, y abrirlo convertiría una lectura en un barrido del corpus de un tenant.
  - 🔴 **Tres estados, no dos** (lección del smoke real 2026-08-13): **fila ausente** = nunca preguntamos · **fila con `NULL`** = preguntamos y el proveedor no tiene el dato · **`0`** = el proveedor declara demanda cero. Colapsar los dos primeros produjo una **fuga de costo**: sin fila, el pre-check de frescura nunca veía esas keywords y las **re-compraba en cada corrida, para siempre**. **NUNCA** proyectar la ausencia como `0`.
  - `competition` es competencia **PAGA** (Google Ads) y `keyword_difficulty` es dificultad **orgánica**. **NUNCA** renombrar una por la otra.
  - 🔴 **La barrera de enlaces NO se deriva de `keyword_difficulty`** (follow-up de TASK-1661, migración `20260814125029477`). Esa KD es una métrica pura de backlinks con **piso duro**: bajo el umbral colapsa a `0` exacto, y en SERPs es-LATAM —donde el top-10 son categorías/productos casi sin enlaces a nivel URL— una porción enorme de keywords cae ahí. Medido en MX el 2026-08-13: `pintura` (**135.000 búsquedas/mes**) y `pintura para piso` daban **ambas KD 0** con perfiles opuestos. No es dato faltante: es un `0` **afirmado** que se lee como "trivial" y es falso. El reemplazo no inventa fórmula — persiste la evidencia cruda del `avg_backlinks_info` que el proveedor **ya entrega en la misma respuesta que ya pagamos** y que antes se descartaba, y la derivación canónica es `deriveLinkBarrier`.
  - 🔴 **`deriveLinkBarrier` pondera DIVERSIDAD de dominios referentes + page rank del top-10, NUNCA el conteo de enlaces.** El oficio lo dice (`seo-aeo` §05: un enlace editorial relevante pesa más que cien de directorios) y los datos medidos en MX lo confirman de forma contraintuitiva: `berel` tiene **5.125 backlinks contra los 232 de `pintura`, pero MENOS dominios referentes** (30,4 vs 52,6) — ordenar por conteo **invierte** el ranking y declara "lo más difícil" a un perfil que sólo está concentrado. `avg_backlinks` se persiste **sólo para auditoría** y no participa del cálculo. Verificado contra el proveedor: separa `pintura` `high` de `pintura para piso` `low`, que es justo lo que la KD no lograba. Los umbrales son constantes exportadas y **se recalibran en un solo lugar**; `classifyLinkBarrier` (la derivación vieja sobre KD) fue **ELIMINADA**, no deprecada.
  - 🔴 **`unknown` es estado propio, no un cuarto nivel de dificultad**: significa "no capturado" y la UI lo pinta **"Sin dato"**, jamás "Baja". Es la misma regla de los tres estados de arriba aplicada a la barrera.
  - **Contrato de gasto (patrón TASK-1303):** pre-check de **FRESCURA** —no de existencia— antes de tocar el proveedor (refresca una vez al mes ⇒ no se re-compra dentro de 30 días; una corrida repetida en el mismo ciclo cuesta **USD 0**) + `enforceSeoRunEntitlement` + spend fence + `ON CONFLICT DO NOTHING` + el ledger lo escribe el **TRANSPORTE**. 🔴 El costo del batch se atribuye a **UNA sola fila** y las demás quedan en `0`: el proveedor cobra por llamada, no por keyword, así que copiar el costo en cada fila haría que sumar `provider_cost` **multiplicara** el gasto real.
- `readSeoAeoGap(targetId)` → **derived read cross-módulo — IMPLEMENTADO (TASK-1305, 2026-08-05)** en `src/lib/growth/seo/gap/read-seo-aeo-gap.ts`. V1: lente SEO = `seo_gsc_daily` (posición medida ponderada por impresiones, ventana 28d) × lente AEO = `grader_scores` del último run reportable del org (granularidad `domain`; TASK-1311 la refina a URL). Cruce EN MEMORIA por `organization_id` (boundary §1.1: cero JOIN/VIEW/FK cross-motor, verificado por test dedicado); clasificador puro `classifyQuadrant` (página 1 × score ≥ 50, umbrales overridables, jamás promediados); degradación honesta `no_seo_data`/`no_aeo_data`. Cuando TASK-1303 aterrice, `seo_rank_snapshots` se suma como lente de mercado sin cambiar el contrato. Primer resultado live: Berel #1.75 orgánico × AEO 44.5 → `riesgo` (autoridad sin citabilidad — el CTA cruzado al AEO funcionando).

**Readers de la pantalla ancla (TASK-1307, 2026-08-06/07)** — `src/lib/growth/seo/performance/`. Lane `/api/platform/ecosystem/growth/seo/{performance,performance-catalog}` + MCP tools `get_seo_performance` / `get_seo_performance_catalog` en el mismo PR (mandato parity+MCP).

- `readSeoPerformance(orgId, { mode, metric, items, rangeDays, device })` → `{ series, standings, summary, source, itemsWithoutData }`. **Una pregunta, una lectura**: el chart y la tabla salen del MISMO llamado, porque partirlo habría duplicado ventana, ancla y derivación del Δ — y abierto la puerta a que chart y tabla discrepen sobre el mismo dato. La **fuente se deriva de (modo × métrica)** por la función pura y exportada `resolveSeoPerformanceSource` — es la regla de honestidad del módulo y tiene que poder probarse sin base de datos — y se declara en `source` (`gsc_measured` | `dataforseo_estimated`): no hay celda mixta, una serie completa pertenece a una sola fuente. `items` vacío da `no_items`, que es un **estado inicial legítimo, no un error**. `value: null` es hueco de primera clase (§10.3). Techo de 25 ítems por lectura (guard de recurso del reader, distinto del límite de legibilidad de la UI). Split PG/BQ **por cobertura** (mismo criterio que §4): si el primer día de PG llega después del inicio de la ventana, la lectura completa va a BQ; con BQ vacío cae a PG y sirve lo que hay.
- `readSeoPerformanceCatalog(orgId, { mode, windowDays, limit })` → `{ items, sets? }`. `items` es la **unión** de dos universos que no coinciden (keywords con volumen medido en `seo_gsc_daily` + keywords trackeadas en `seo_rank_snapshots`), con `tracked` para que la UI distinga ●/◑ e `impressions: 0` que significa "todavía sin impresiones", nunca una medición de cero.
  - **Delta 2026-08-07 — presets de comparación DATA-DRIVEN (`sets`).** Devuelve además los `seo_keyword_sets` **nombrados** del target **activo**, con sus miembros **vigentes** (`effective_to IS NULL` — la tabla es append-only, el "borrado" es cierre de vigencia, §4.1). Sólo en **modo keyword**: en modo URL el eje de páginas sólo existe en Search Console y no hay set configurable que agrupar. Contrato en `SeoPerformanceCatalogSet` / `SeoPerformanceCatalogResult`; el campo es **opcional y sólo viaja cuando hay sets**, así que ningún consumer previo cambia. 🎯 **Por qué data-driven y no una lista de grupos en el código**: la agrupación que le importa al operador ("Marca", "Categoría") ya la declaró al configurar el target — inventar agrupaciones propias en la UI crearía una segunda taxonomía que diverge de la que gobierna el gasto de rank capture. La description de `get_seo_performance_catalog` documenta `data.sets` y le pide al agente **preferir estos grupos curados antes que inventar comparaciones**.
- `deriveSeoPerformanceInsight(summary)` (`performance/derive-insight.ts`) — **no es un reader: es una derivación PURA** sobre el mismo `SeoPerformanceSummary` que alimenta la banda de KPIs. No re-consulta nada. Existe porque la pantalla muestra 4 KPIs pero el **diagnóstico vive en la relación entre ellos**: ¿cayeron los clics por posición, por demanda, o porque el SERP se queda con el clic? Cuatro patrones con umbrales explícitos — `demand_drop` (clics e impresiones caen juntos con posición estable), `ctr_erosion` (posición e impresiones estables + CTR cae: el patrón compatible con AI Overviews, que se lee junto a los marcadores `aiOverview` de §5), `rank_gain`, `rank_loss`. Umbrales: posición estable `|Δ| < 0.3`; movimiento de volumen relevante `|Δ%| ≥ 15`; movimiento de CTR relevante `|Δ| ≥ 0.5` puntos porcentuales. 🔴 **Devuelve `null` sin ventana previa comparable o con señales mezcladas, y la UI entonces no dice nada**: un insight ambiguo es peor que ninguno — un diagnóstico equivocado se repite en una reunión con el cliente y cuesta más que el silencio. Orden de evaluación deliberado: primero los patrones que **excluyen** al sitio como causa (demanda, SERP), después los atribuibles a posición; el primero inequívoco gana. Tests: `performance/__tests__/derive-insight.test.ts`.

**Readers de superficie del cockpit Overview (TASK-1306, 2026-08-06)** — `src/lib/growth/seo/overview/`. Son plumbing de SUPERFICIE, no contratos de negocio nuevos: proyectan lo ya materializado para el nodo S1 y **los cuatro respetan `isSeoModuleEnabled`** (con el módulo apagado un reader no puede devolver datos aunque la page fallara en 404-ear).

- `listSeoEligibleSpaces()` → Spaces del Space picker. Aplica el **mismo predicado de vigencia** que `listEligibleTargets`/`resolveSeoEntitlement` (`module_key = ANY(SEO_MODULE_KEYS_READ) AND effective_to IS NULL AND status IN ('active','pilot')` — hoy el array es `['seo_v2']`) — un assignment cerrado NUNCA ofrece el Space. A diferencia del batch, NO exige `seo_target` creado: un Space recién asignado debe poder abrirse para ver su estado honesto. ⚠️ `greenhouse_core.organizations` no tiene columna `name`, es `organization_name`.
- `readSeoOverviewConnection(orgId)` → `connected | not_connected | no_snapshots` + `dataAsOf`. **Tres condiciones que la UI no puede colapsar**, porque llevan a acciones distintas (conectar OAuth vs esperar al scheduler vs rendir). La frescura sale de `seo_gsc_daily` (lo materializado), NO de un read-through a Google: preguntarle a Google daría una fecha más nueva que la que el panel puede graficar.
- `readSeoOverviewKpis(orgId, rangeDays)` → totales + ventana previa + serie diaria. **Posición media = `SUM(position × impressions)/SUM(impressions)`** y **CTR = `SUM(clicks)/SUM(impressions)`** del período — un `AVG(position)` plano o un promedio de CTR diarios dan un número que no corresponde a ninguna realidad medible y se ve "razonable" en pantalla, que es lo que lo hace peligroso. Ancla en `MAX(capture_date)`, **nunca en `CURRENT_DATE`** (la captura corre con lag: anclar en hoy pintaría una caída de tráfico que no ocurrió). Sin impresiones → `position`/`ctr` en `null` (→ "Pendiente"), nunca `0`; ventana previa sin volumen → `previous: null`, nunca un `+100%` contra cero.
- `readSeoOverviewSidebar(orgId)` → tres regiones (salud del sitio · movers WoW · cruce AEO) que **degradan de forma INDEPENDIENTE** (`Promise.allSettled` + `{ ok } | { ok:false, reason }` por región): que no exista auditoría no puede tumbar los movers ni el cruce. Compone `readSiteAuditReport` + `readRankEvolution` + `readSeoAeoGap`; no consulta las tablas por su cuenta.

Exposición parity del mismo PR (mandato del dominio): lane `/api/platform/ecosystem/growth/seo/overview-kpis` + MCP tool `get_seo_overview_kpis`.

**Resolución de target por organización — el mercado es EXPLÍCITO (ISSUE-153, 2026-08-13).**
`resolveSeoTargetForMarket` / `resolveUnambiguousSeoTarget` (`src/lib/growth/seo/resolve-target.ts`)
son el ÚNICO camino para resolver el target de una org. **NUNCA** volver a un
`ORDER BY created_at DESC LIMIT 1` inline: con dos mercados activos servía un país al azar sin
declararlo (había 4 copias del patrón). Contrato: 1 activo → `resolved` (la respuesta **declara** el
mercado servido en `meta.servedMarket`); N activos + `?market=` (ISO-2 o `location_code`) →
`resolved`; N sin selector → **409 `multiple_markets`** con la lista, jamás elección silenciosa;
selector sin match → 409 `market_not_found`. Las posiciones de mercados distintos **NUNCA se
promedian** (son SERPs distintos). Las 9 MCP tools de lectura aceptan `market` opcional. Superficies
sin selector de mercado degradan a su empty state honesto con el conflicto observable (warning
Sentry); el picker de mercado en la UI admin es follow-up de producto para cuando una org
multi-mercado se materialice (Efeonce CL/MX/CO/PE es el caso).

Todo reader retorna `{ ok: true, ... } | { ok: false, errorCode, status }` (espejo `SearchConsoleAnalyticsResult`).

---

## 8. Materialización & scheduling (no live-per-view)

Cloud Scheduler + ops-worker (async-critical), nunca Vercel cron.

- **Rank diario (TASK-1303, LIVE desde 2026-08-06 — scheduler ACTIVO `0 5 * * *`):** Cloud Scheduler `ops-seo-rank-capture` (`0 5 * * *` CLT; despausado 2026-08-06 tras verificar el gate de costo con smoke E2E real de Berel + release `fcee5ab9f7ce` en prod) → `POST /seo/rank/capture-batch` en ops-worker → `runRankCaptureBatch` (targets activos con assignment `seo_v2` vigente, per-target resilience) → `captureRankSnapshot(targetId, actor)` por target → outbox `growth.seo.rank_snapshot.captured` → consumer reactivo `seo_rank_history_bq_sync` (lane `ops-reactive-growth`) → MERGE a BQ `greenhouse_growth_analytics.seo_rank_history` (dataset creado 2026-08-06; partition por `capture_date`, cluster `seo_target_id, keyword`).
  - 🔴 **La idempotencia diaria NO es `ON CONFLICT DO UPDATE`.** El anti-mutation trigger de TASK-1299 bloquea UPDATE **incondicionalmente** sobre `seo_rank_snapshots` (y el runtime no tiene GRANT UPDATE): el contrato real es **pre-check de combos ya capturados ANTES de pegar el provider** (el re-run del mismo día no gasta) + `INSERT … ON CONFLICT DO NOTHING` como guardia de carrera. Medición inmutable, a diferencia deliberada de `seo_gsc_daily` (que sí corrige por consolidación tardía).
  - **Gate de costo + spend fence:** `enforceSeoRunEntitlement(orgId, { estimatedCostUsd: batch completo, consumesAuditAllowance: false })` ANTES de la primera llamada + re-consulta cada 10 llamadas cobradas (cierra la deuda declarada por TASK-1300: el gate una-vez sobregiró 3× un budget trial). `consumesAuditAllowance: false` existe porque el rank capture no crea `seo_site_audit_runs` — su único freno es presupuesto/expiración, nunca el cupo de audits.
  - **Parámetros de captura (oficio `dataforseo-operator`):** familia `serp`, `organic/live/advanced`, **1 task por call** (el `cost` del provider es por batch — 1/call es la única atribución exacta de `provider_cost` por fila), `depth: 20` (el striking distance 8–20 y la historia "de 8 a 3" viven ahí; default 10 = ciego), `load_async_ai_overview: true` (sin él, "AI Overview presente/no" tiene falso negativo silencioso; duplica el costo — ~USD 0.008/call, estimador del gate 0.01). Follow-up de escala: SERP task-based standard (~3.3× más barato) exige ampliar el transporte POST-only.
  - **El ledger de gasto lo escribe el TRANSPORTE** (TASK-1300): el command pasa `organizationId` y el entrypoint del worker importa `@/lib/growth/seo/register-provider-spend` (sin el import, la primera llamada cobrada LANZA). `provider_cost` del snapshot = procedencia por fila, jamás se suma al presupuesto.
  - **Honest degradation tri-estado:** elegibles > 0 con 0 capturados = `degraded`, nunca `succeeded`; breaker abierto corta el resto del batch declarándolo (`breaker_open` ≠ `provider_error`); `position: null` es medición válida ("no rankea en el depth consultado"), no error.
- **Site audit semanal (2 fases, OnPage async — TASK-1304, LIVE 2026-08-06, schedulers ACTIVOS):** Cloud Scheduler `ops-seo-audit-enqueue` (`0 6 * * 1` CLT) → `POST /seo/audit/enqueue-batch` → `runSiteAuditEnqueueBatch` → `queueSiteAudit(targetId, actor)` por target (gate de costo `consumesAuditAllowance: true`, guard anti doble-encolado sin gasto, `task_post` con `max_crawl_pages: 100` + `validate_micromarkup`, run `running` + `provider_task_id`). Cloud Scheduler `ops-seo-audit-collect` (`*/30 * * * *`) → `POST /seo/audit/collect` → `collectSiteAuditRuns`: claim por run `FOR UPDATE SKIP LOCKED` + poll `summary` (POST; `task_get` GET-por-path NO existe en el transporte) → si terminó, `pages` → findings (allowlist curado) + UPDATE run + INSERT findings + outbox `growth.seo.site_audit.completed` **en la misma transacción** (exactly-once por construcción) → mirror reactivo BQ `seo_site_audit_history` (rollup por severidad; los findings detallados viven en PG). Mapeo honesto: crawl OK + N≥0 findings = `succeeded`; `extended_crawl_status` con error = `degraded`; 0 páginas = `failed`; task colgada >24h = `failed` (gave_up — la signal alerta a las 6h, el collect da el veredicto a las 24h). ⚠️ NUNCA habilitar `collect` antes de que `enqueue` haya persistido `provider_task_id`.
- **Backlinks semanal (TASK-1304, LIVE 2026-08-06, scheduler ACTIVO):** Cloud Scheduler `ops-seo-backlink-capture` (`0 7 * * 1` CLT) → `POST /seo/backlinks/capture-batch` → `captureBacklinkSnapshot` por target: `summary/live` (`rank_scale: one_hundred`) + `bulk_new_lost_backlinks/live`; pre-check de idempotencia por `(target, capture_date)` ANTES del provider + `ON CONFLICT DO NOTHING` (el trigger de 1299 prohíbe DO UPDATE); summary fallido = NUNCA snapshot; delta fallido = snapshot `partial` con delta vacío; outbox `growth.seo.backlink_snapshot.captured` → mirror BQ `seo_backlink_history`.
- **GSC snapshot diario (TASK-1302, LIVE desde 2026-08-05):** Cloud Scheduler `ops-seo-gsc-snapshot` (`0 9 * * *` CLT, **ACTIVO**) → `POST /seo/gsc/snapshot-batch` en ops-worker → `materializeGscDailySnapshot` por org → `seo_gsc_daily`. Reusa `readSearchConsoleAnalytics` de TASK-1282: cero cliente GSC nuevo.
  - 🔴 **Materializa una VENTANA MÓVIL (5 días), no "ayer".** Medido en vivo: **GSC no publica D-1** — responde `ok` con cero filas y recién D-2 trae datos. Un job que apunte sólo a ayer escribe un día vacío en cada corrida y **nunca vuelve por él**: serie permanentemente vacía con el batch reportando éxito. La ventana absorbe el lag de publicación (que Google no garantiza y varía) y de paso corrige el consolidado tardío (~48h). Es seguro por construcción: el UPSERT es idempotente por `(org, capture_date, query, page)`, así que esa idempotencia **es el mecanismo de convergencia de la serie**, no sólo una defensa contra re-runs. `captureDate` explícito fuerza un día puntual.
  - ⚠️ **El ops-worker es un servicio Cloud Run ÚNICO compartido staging+prod**, desplegado desde `develop`. No existe un flip "sólo staging" para este dominio, y la capacidad queda viva sin promoción a `main`. Su entorno necesita **su propia** config de Search Console (`GROWTH_SEARCH_CONSOLE_ENABLED` + `GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID` + secret ref del client secret, declarativos en `deploy.sh`): tenerlas en Vercel no sirve de nada acá.
  - **Paginación real:** el primitive compartido ganó `startRow` opcional (aditivo). Sin él, `querySearchAnalytics` cortaba en 100 filas **sin señal** — sobre una serie histórica eso es pérdida permanente. Si se alcanza el techo de páginas se reporta `truncated` y el handler emite un warning; nunca se trunca en silencio.
  - **Honest degradation:** si el reader degrada, **no se escribe ninguna fila** — un día sin conexión jamás puede parecerse a un día con cero tráfico. Un día en que GSC respondió sin filas es `ok` con `rowsWritten: 0`, que es un hecho distinto de un fallo.
  - **Resiliencia per-org:** una org que falla se registra y el batch continúa; un token revocado de un cliente no puede impedir capturar la serie de los demás.
  - Gate: `GROWTH_SEO_ENABLED`. ⚠️ **Lo leen DOS runtimes y el flip es de TRES pasos**: (1) el ops-worker (`deploy.sh`) para el batch diario; (2) **Vercel**, que gatea el lane ecosystem/MCP (TASK-1645) y el reader del cruce SEO↔AEO (TASK-1305); (3) despausar el scheduler, cuyo estado de pausa se declara en el 5.º argumento de `upsert_scheduler_job` y se re-aplica en cada deploy. **Apagarlo sólo en el worker NO apaga el módulo**: el lane de Vercel sigue sirviendo, así que un rollback que sólo toque `deploy.sh` queda incompleto y parece exitoso.

- **Datos de mercado por keyword (TASK-1661, LIVE desde 2026-08-14 — scheduler ACTIVO + flag ON, release `3754a17d3b1d`):** Cloud Scheduler `ops-seo-keyword-market-data` (`0 8 15 * *` CLT) → `POST /seo/keyword-market-data/capture-batch` en ops-worker → `runKeywordMarketDataBatch` → `captureKeywordMarketData(targetId)` por target.
  - ⚠️ **MENSUAL y a mitad de mes, no diario.** El proveedor refresca las métricas de keyword una vez al mes siguiendo el ciclo de Google Ads: un cron diario pagaría 30 veces por el mismo número, y el día 1 traería el ciclo viejo al mismo precio.
  - **Dos frenos independientes, ambos ya liberados:** el scheduler nació PAUSADO **y** `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` nació `false`; desde el 2026-08-14 el job está **ACTIVO** y el flag **ON**. Despausar sin prender el flag no gasta (el command devuelve `disabled`); prenderlo sin despausar tampoco. El flag es **subordinado** a `GROWTH_SEO_ENABLED` y vive **sólo en el runtime del ops-worker** — 🔴 en Vercel es **inerte**, así que prenderlo o apagarlo ahí no cambia nada y da una falsa sensación de control.
  - **Gate de costo:** pre-check de **frescura** (no de existencia) ANTES del proveedor + `enforceSeoRunEntitlement` con el estimado del batch + spend fence cada 10 llamadas + `previewKeywordMarketDataCapture` como **dry-run obligatorio** que reporta fórmula y costo sin gastar. El ledger lo escribe el **transporte**, y el costo del batch se atribuye a **una** fila (§7).
  - **Costo medido (2026-08-13):** 31 keywords de Berel = 1 llamada = **USD 0.0157**; una segunda corrida dentro del mismo ciclo mensual cuesta **USD 0**.

- **Keyword discovery (TASK-1664, LIVE desde 2026-08-14 — flag ON en ambos runtimes + scheduler ACTIVO, autorización del operador tras smoke live):** Cloud Scheduler `ops-seo-keyword-discovery-drain` (`*/10 * * * *`, declarativo en `deploy.sh`, **ACTIVO**) → `POST /seo/keyword-discovery/drain` en ops-worker → `drainKeywordDiscoveryRuns` → claim atómico `pending → running` por corrida (UPDATE condicional: el segundo worker matchea cero filas y responde `busy` sin gasto). **Sin enqueue automático**: el drain con cola vacía es no-op y el gasto sólo ocurre cuando un operador/agente encola una corrida que ya pasó preview + gate.
  - 🔴 **El outbox NO es cola de trabajo en este dominio.** `growth.seo.keyword_discovery.requested` (emitido en la MISMA transacción del enqueue) y `...completed` son trazabilidad/mirror; el despacho real es SIEMPRE Cloud Scheduler → drain, igual que el resto de los batches SEO.
  - **El enqueue vive en Vercel** (`queueKeywordDiscovery`: resuelve seeds server-side, calcula costo conservador con fórmula, consulta `enforceSeoRunEntitlement` y deja run `pending` + outbox en una transacción — NUNCA llama al proveedor); **la ejecución vive en el worker** (`runKeywordDiscovery`: gate de nuevo antes de la primera llamada, fence cada 10 llamadas cobradas, hasta 30 llamadas por corrida). Las llamadas Live corren FUERA de transacción; el cierre (candidatos + estado + outbox) es UNA transacción.
  - 🔴 **El candidato guarda SOLO procedencia** (run, seed, endpoint, `source_rank`, `captured_at`); la métrica de mercado es el hecho de TASK-1661 y el `keyword_info` inline **ya pagado** de las respuestas de discovery se persiste en `seo_keyword_market_data` vía el writer canónico `persistKeywordMarketData` (único writer del store, compartido por 1661/1664 y el futuro 1662). `keyword_overview` es **top-up** sólo del faltante/vencido (pre-check `loadFreshMarketKeywords`, hasta 200 keywords en ≤2 llamadas de 100). Medido en el smoke: los 10 candidatos del run quedaron frescos por el inline y el top-up costó **cero llamadas**.
  - **Descubrir no es seguir:** ninguna pieza de discovery escribe `seo_keyword_set_members`; la promoción usa `trackKeywords` (command explícito posterior) y `recordKeywordDiscoveryAction` sólo deja el log append-only de la decisión.
  - **Flag `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED`** (subordinado a `GROWTH_SEO_ENABLED`): lo leen **DOS runtimes** — Vercel (enqueue + lanes) y ops-worker (drain). Nació OFF con scheduler pausado (dos frenos, patrón TASK-1661); **ON desde 2026-08-14** en `deploy.sh` (`:-true`) + Vercel `Production`/`staging`, con el scheduler despausado, tras el smoke live + autorización del operador.
  - **Costo medido (smoke 2026-08-14, Berel MX):** 1 seed × `keyword_suggestions` × limit 10 = 1 llamada = **USD 0.0132** (estimado conservador 0.0612); mismo intent re-encolado = **USD 0** (idempotencia por `(organization_id, idempotency_key)` con hash del intent completo).

**Reliability signals** (`/admin/operations`, subsistema Growth Health): `seo.rank.capture_lag` (steady=0), `seo.audit.stuck_tasks`, `seo.provider.cost_over_budget`, `seo.market_data.freshness` (TASK-1661; umbral tomado de la MISMA constante que el pre-check de gasto, para que señal y gasto no puedan divergir — sin dato es `warning`, no `error`: la ausencia de captura es un hecho esperable entre ciclos mensuales, no una falla del batch), `seo.keyword_discovery.stuck_runs` (TASK-1664; running >15 min o pending >2h con el drain activo = warning, steady=0) y `seo.keyword_discovery.provider_errors` (TASK-1664; runs failed/partial por proveedor en 24h, steady=0 — `no_results` es hecho y `budget_blocked` es el freno operando, no fallas).

---

## 9. Entitlements (`growth.seo.*`, per-org)

**Implementado (TASK-1301, 2026-08-05).** Capabilities (grain espejo de `growth.ai_visibility.*`), seedeadas en `capabilities_registry` en el mismo PR que `entitlements-catalog.ts` + grants en `runtime.ts` (capability-grant coverage verde):

```
growth.seo.target.configure     (execute, tenant)  autor de targets/keywords/competitors — set operador
growth.seo.audit.run            (execute, tenant)  disparar site audit — set operador
growth.seo.observation.read     (read, tenant)     rank/backlink/audit reads — set interno base
growth.seo.report.read_client   (read, own)        gate del report cliente (client_* scope own)
growth.seo.entitlement.manage   (execute, tenant)  SOLO EFEONCE_ADMIN + EFEONCE_ACCOUNT (espejo AEO)
```

**Acceso per-org vía `module_assignments`** (no por rol — lección TASK-1248), con `module_key='seo_v2'` seedeado en `greenhouse_client_portal.modules` (la FK del catálogo lo exige; tier=addon, `data_sources=['growth.seo']` con parity al union `ClientPortalDataSource`; con los dos `view_codes` de cliente desde TASK-1310 — la fila `seo_v1` original nació con `view_codes=[]` y sigue en el catálogo como historia append-only, ver §10.7). El tier vive en `metadata_json.seo_tier` (`contracted|trial|pilot`; override de cupo pilot vía `metadata_json.seo_audit_runs_per_month`). Las **4 puertas**: operador (`entitlement.manage`, interno, todas las orgs), contratado (assignment activo → observación + report), trial/PLG (assignment con quota cap + expiry), público (quick-check rate-limited de 1 dominio, diferida — reusa el patrón `public-submission` + `grader_leads`).

**Chokepoint único `enforceSeoRunEntitlement`** (`src/lib/growth/seo/entitlement.ts`) con **quota cap por-org** (gate de costo DataForSEO): entitlement → expiración (`expired` explícito) → allowance (site-audits/mes por tier) → budget (USD/mes por tier; gasto = `SUM(provider_cost)` mensual de los snapshots TASK-1299 — **hook TASK-1300**: al existir `seo_provider_spend_daily`, el resolver cambia de fuente). Acepta `estimatedCostUsd` y no deja pasar un run que exceda el budget restante. Consumer-agnóstico por diseño (mandato parity+MCP 2026-08-05): el plano fino de capability (`can()`) vive en el consumer; el MISMO gate sirve UI, Nexa, lane `app` y lane `ecosystem`/MCP. Knobs por env con default: `GROWTH_SEO_{CONTRACTED|TRIAL|PILOT}_{AUDIT_RUNS_PER_MONTH|MONTHLY_BUDGET_USD}`. Sanity live: `scripts/growth/_sanity-seo-entitlement.ts`.

---

## 10. Superficies y product design

### 10.1 Arquitectura de información

`Growth` sigue siendo dominio raíz. Dentro, sección local **"Search Visibility"** que agrupa dos motores hermanos: **SEO** (nuevo) + **AEO Grader** (existente, intacto).

Rutas operador (`internal`): `/admin/growth/seo` (Overview — **IMPLEMENTADA**, TASK-1306), `/admin/growth/seo/performance` (★ evolución URLs — **IMPLEMENTADA**, TASK-1307), `/admin/growth/seo/keywords` (**IMPLEMENTADA**, TASK-1308), `/admin/growth/seo/audit` (+ `/[issueGroup]`).
Rutas cliente (`client`): `/growth/seo`, `/growth/seo/performance`, `/growth/seo/report`.
Toda `page.tsx` nueva → `route-reachability-manifest.ts` + key en `GH_INTERNAL_NAV`.

**Contrato de la sección local, vigente desde TASK-1306 (2026-08-06).** Las 4 rutas operador comparten **un solo viewCode**, `administracion.growth_seo` (sembrado por `20260806223132770`, presente en `view-access-catalog.ts`, grants a `efeonce_admin` + `ai_tooling_admin`), y **un solo ítem de menú** (`/admin/growth/seo` en `VerticalMenu`, key `GH_INTERNAL_NAV.growthSeo`). Las tres hermanas son **child routes**: NO siembran viewCode nuevo, NO suman ítem de nav, pero **SÍ** se declaran en `route-reachability-manifest.ts` con `parent: '/admin/growth/seo'` + `via: 'tab'` + `reason`.

**Delta 2026-08-07 (`67c2d1218`) — UN header canónico para las tres pestañas.** Resumen · Rendimiento · Keywords montan el **mismo shell**: `SurfaceRecipe kind='analyticsReport'` con la región `header` = `WorkbenchHeader kind='report'`, y el **mismo reparto de regiones** en las tres: `secondaryActions` = el alcance que el operador cambia (Space, período, device); `meta` = frescura del dato; `supporting` = los tabs hermanos bajo su divisor. La causa raíz que corrige: ninguna usaba la región `header` de la recipe — el chrome vivía dentro de `primary`, así que título, selects, chip de frescura y tabs quedaban flotando sobre el lienzo sin superficie que los contuviera, y **cada pantalla lo había resuelto distinto**. 🎯 **Regla para la pestaña que falte** (`/audit`, TASK-1309): entra por este shell, no inventa su propio chrome — tres soluciones distintas al mismo problema es exactamente lo que produjo el defecto. Corolario del reparto: **lo que aplica a toda la pantalla va al header; lo que describe un artefacto va con el artefacto** (por eso la leyenda ●/◑ bajó a la card del chart, §10.3).

El conmutador es `SeoSearchVisibilityTabs`: cada tab es una **ruta propia** navegada con `next/link` (no un `TabPanel` en memoria), para que deep-link, back/forward y enlace compartible funcionen solos. Las hermanas aún inexistentes se declaran `available: false` con el motivo visible — **un tab que navega a un 404 es peor que un tab deshabilitado**. Activar una hermana = quitar esa línea. El contenedor declara `role='navigation'`, NO `tablist`: son links a rutas, y con el rol por defecto axe exigiría un `aria-controls` apuntando a un panel real que acá no existe.

**Guard canónico de toda ruta operador del módulo (3 puertas + 2 defensas), tal como quedó en la page de S1** — cada puerta responde una pregunta distinta y ninguna sustituye a otra: (1) viewCode `administracion.growth_seo` → ¿la surface le es visible al rol?; (2) capability `growth.seo.observation.read` → ¿tiene autoridad fina de lectura?; (3) `module_assignment` per-org → ¿el Space contrató el módulo?, resuelta por la lista de Spaces elegibles (pasar el gate y no tener NINGÚN Space no es error: es el estado honesto "sin Spaces con SEO"). Defensas: `notFound()` con el módulo apagado por flag (un 404 es más honesto que una pantalla vacía que sugiere "no hay datos") y redirect si `tenantType === 'client'` (el acceso cliente va por `growth.seo.report.read_client` y su propia surface, nunca por el cockpit). ⚠️ El `?space=`/`?range=` son **compartibles pero NO autoridad**: un `space` sin assignment vigente cae al primer Space elegible y un `range` fuera de la allowlist cae al default — confiar en el query param dejaría que un enlace pegado saltee el chokepoint.

### 10.2 Superficies por rol

- **Operador Efeonce:** cockpit denso, multi-Space, datos crudos, acciones. **Overview (S1) IMPLEMENTADO** (TASK-1306, code complete en `develop`): Space picker + selector de período (`?range=` con allowlist server-side) + 4 KPIs norte + curva de visibilidad + sidebar salud/movers/cruce AEO. **Pantalla ancla (S2) IMPLEMENTADA** (TASK-1307, `complete`): set comparable con presets data-driven, chart ECharts de evolución con procedencia propia, granularidad diario/semanal, marcadores AI Overview, bandas de updates de Google y tabla de standings con Δ30d (§10.3). **Site audit (S4) IMPLEMENTADO** (TASK-1309): salud + freshness explícito + issues como lista priorizada + drill `?issueGroup=` + enqueue gobernado (§10.6). Con S4 el conmutador de "Search Visibility" queda **completo: las 4 tabs navegan**.
- **Cliente:** dashboard self-service de SU Space, curado, honesto, mono-Space.
- **Report Artifact:** snapshot narrativo imprimible/PDF (3.er render adapter del mismo model, mirror del AEO report artifact).
- **Público (diferido):** "SEO quick check" de 1 dominio sobre el chokepoint gobernado.

### 10.3 Pantalla ancla — Rank & URL performance over time

Line chart multi-serie (**eje Y de posición invertido**, 1=arriba=mejor), 1 línea por URL/keyword con line-style+marker distintos (colorblind-safe), target line "top-3", band highlight de eventos de algoritmo, `dataZoom` temporal, tabla debajo con Δ30d + sparkline por fila (sobre `DataTableShell`, obligatorio por columnas + orden + sparkline embebido). Set seleccionable (multi-select + chips) persistido en `?urls=`/`?keywords=`.

> **Delta 2026-08-07 (TASK-1307) — lo que la pantalla ancla ganó, y los contratos que eso fija.** Todo en `src/views/greenhouse/admin/growth/seo/performance/` + la page `/admin/growth/seo/performance`.
>
> 1. **Presets de comparación como chips**, alimentados por `catalog.sets` (§7). El operador compara "Marca" de un click en vez de tipear keywords una por una. La UI ofrece **exactamente** los sets configurados en el target; si no hay ninguno, no hay chips — nunca un grupo inventado.
> 2. **Lectura cruzada de los 4 KPIs** como callout (`deriveSeoPerformanceInsight`, §7). Aparece **sólo** cuando el patrón es inequívoco.
> 3. **Carril de AI Overview**: un rombo por fecha con AIO (`aiOverview`, §5), anclado al borde inferior del lienzo y **sólo en la métrica de posición**. Es un carril de **contexto, no una serie de datos** — `silent`, sin énfasis, y el tooltip lo narra **sin número** (un rombo no tiene "valor"). Junto al patrón `ctr_erosion` es la conversación completa: "no perdiste posición, el SERP se quedó con el clic".
> 4. **Rango de 365 días** (`ALLOWED_RANGE_DAYS = {28, 90, 180, 365}` en la page). Un valor fuera de la allowlist cae al default: el `?range=` es **compartible pero no autoridad** (§10.1). A 365 días la ventana pedida excede la ventana caliente de PG, así que el split por cobertura de `readSeoPerformance` sirve la lectura desde BigQuery (`seo_gsc_history`) — y si BQ aún está vacío (pre-backfill), cae a PG y sirve lo que hay, declarándolo como serie rala en vez de fingir 12 meses.
> 5. **Granularidad Diario / Semanal** en el hero (`toWeekly`), con default **semanal sobre 120 días medidos**: en rangos largos el punto-por-día es una nube de marcadores que esconde la forma. 🔴 **Las reglas de agregación son las del módulo, no promedios ingenuos**: clics e impresiones se **suman**; posición y CTR **promedian sólo sobre los días MEDIDOS** de la semana (un `null` no diluye, porque **un hueco no es un cero**); una semana **sin ninguna** medición da `null` y se dibuja como hueco; `aiOverview` semanal es "hubo AI Overview en **algún** día de la semana". Un `AVG` plano sobre los 7 días metería ceros fantasma justo donde no hubo medición.
> 6. **Bandas de updates confirmados de Google** (`events`, §"Registro de updates" abajo), recortadas a las fechas que existen como categoría del eje: si ninguna cae dentro, **la banda no se dibuja** — nunca se inventa una categoría para poder pintarla.
> 7. **La procedencia ●/◑ vive DENTRO de la card del chart** (`source: SeoPerformanceSource`), no en la cabecera de la pantalla (movida en `67c2d1218`). Razón de contrato, no cosmética: **un gráfico que carga su propia procedencia sigue siendo honesto cuando alguien lo recorta y lo pega en una presentación**. La cabecera conserva sólo la frescura del dato, que sí aplica a toda la pantalla.
>
> **Invariantes de la pantalla ancla (NUNCA — son lo que protege la honestidad de la lectura):**
>
> - **NUNCA promediar la serie ● (medida, GSC) con la ◑ (estimada, DataForSEO).** El fallback por cobertura elige **UNA** y la declara en `source`; "si no vienen de una, vienen de la otra", jamás mezcladas (contrato §5 + §1.1).
> - **NUNCA renderizar un hueco como `0`** — ni en la serie diaria ni en la agregación semanal. Posición 0 no existe, y 0 clics afirma "apareciste y nadie hizo clic" cuando la verdad es "no se midió". El `null` viaja hasta el chart y `connectNulls: false` corta la línea; omitir el punto haría que ECharts uniera los extremos e **interpolara una medición que nunca existió**.
> - **NUNCA marcar AI Overview sobre una serie GSC**: el dato no existe ahí. La ausencia de marcadores en una serie ● es honestidad, no un hueco del componente.
> - **NUNCA agregar una banda de update al registro sin verificación web y confirmación de Google.**
> - **El insight cruzado se CALLA ante señales mezcladas**; jamás especula ni rellena con la explicación más plausible.
>
> **Registro curado de updates de Google** (`src/lib/growth/seo/algorithm-updates.ts`: `CONFIRMED_ALGORITHM_UPDATES` + `algorithmUpdatesInRange(from, to)`). Existe porque una caída **colectiva** de posiciones dentro de una ventana de update tiene una explicación distinta a una caída propia del sitio, y esa distinción **es** la conversación con el cliente. Reglas del registro:
>
> - **SÓLO updates confirmados por Google** (Search Status Dashboard / anuncios oficiales). Jamás "algo se movió" de terceros: 🔴 **pintar un rumor como banda en el gráfico de un cliente es fabricar contexto** — y el cliente lo va a citar como si fuera un hecho de Google.
> - **Mantenimiento MANUAL y deliberado**, con verificación web en cada tanda y su as-of. Automatizarlo contra un feed de terceros es **follow-up declarado** en TASK-1307, no un TODO implícito: un feed automatizado es exactamente el vector por el que entraría un rumor sin que nadie lo revise.
> - **Sólo updates de búsqueda ORGÁNICA** (core/spam). Los específicos de Discover no entran: este chart mide rank orgánico, y una banda que no puede explicar la serie sólo agrega ruido con apariencia de causa.
> - Entradas vigentes, **verificadas 2026-08-07**: spam update mar 2026 (24–25 mar), core update mar 2026 (27 mar–8 abr), core update may 2026 (21 may–2 jun).

### 10.4 Dataviz (política ECharts para alto impacto)

Evolución posición = line multi-serie (Y invertido); clicks/impresiones = area (Y desde 0, NO dual-axis — charts apilados); oportunidad keywords = scatter (X dificultad, Y volumen, size clicks, color intención, zona quick-win sombreada); salud sitio = radialBar (ApexCharts); SEO vs AEO = quadrant scatter 2×2; SoV vs competidores = stacked bar horizontal o small multiples. A11y: `role="img"` + aria-label con el insight, toggle "Ver tabla de datos", posición invertida documentada (↓ = bueno → flecha abajo verde).

> **Delta 2026-08-07 (TASK-1306) — la decisión ECharts vs Apex SIGUE ABIERTA, y tres hallazgos que la condicionan.** El Overview (S1) se entregó **sin instalar ninguna librería nueva**: usó ApexCharts + Recharts, ya presentes. **No resolvió ni prejuzgó** el Slice 0 de `TASK-1307`, que conserva la propiedad de esa decisión para el stack de alto impacto del módulo. Lo que sí dejó, y aplica a cualquiera que termine usando Apex:
>
> 1. 🔴 **ApexCharts revienta con el theme del repo.** Con `cssVariables: true`, `theme.palette.*` devuelve `var(--mui-palette-*)`; Apex parsea colores con su propia clase `Color` (regex sobre hex/rgb) y lanza `Cannot read properties of null (reading '1')` — 8 excepciones por corrida, **invisibles en pantalla** (el chart simplemente no termina de pintar). Helper obligatorio `resolveApexColor(value, fallback)` en `src/libs/styles/`, que delega la resolución al navegador en vez de parsear a mano (MUI emite varias formas, incluida la var anidada dentro de `rgba(...)`). **Es un bug latente para los ~32 consumidores Apex del repo**, no de esta surface. Recharts no lo sufre: pinta SVG y el navegador resuelve la var por él.
> 2. **El `radialBar` de Apex no dibuja en contenedor fluido** (mide 0 al montar). El gauge de salud del sitio pasó a un arco SVG determinista. Relevante para `TASK-1309`, cuyo Design Decision Log especifica radialBar Apex para el gauge de salud.
> 3. **Series con huecos: formato `{x, y}`, nunca array plano.** Con el array plano, un `null` revienta Apex; con `{x, y}` el `y: null` es un hueco de primera clase — que es justo lo que se necesita: un día sin medición se dibuja como hueco, **NUNCA interpolado**. Y con puntos `{x, y}` **NO** se declara `xaxis.categories`: darle a Apex dos definiciones del eje X en conflicto es la otra mitad de esos 8 pageerrors.
>
> El **dual-axis sigue prohibido**: la curva de visibilidad de S1 son **dos charts apilados** que comparten eje X (clics de 0 a miles vs posición 1–20 invertida). Y el fallback tabular ("Ver tabla de datos") no es opcional: un chart nunca puede ser la única forma de leer la serie.

> **Delta 2026-08-07 (TASK-1308) — el scatter de oportunidad NO usa los ejes que este §10.4 describía, y no debe usarlos.**
>
> ⚠️ **Nota de estado 2026-08-14 (TASK-1661):** el diagnóstico de este delta era correcto **cuando se escribió** y el encoding canónico que fija **sigue vigente**, pero su premisa ya no: el dato de mercado **existe** (`greenhouse_growth.seo_keyword_market_data`, §4.2) y `readKeywordOpportunities` devuelve `searchVolume`/`difficulty` reales + `market: 'available'` + `linkBarrier` cuando hay captura. Lo que **no cambia** es la conclusión: el mercado entra como **columna y filtro**, jamás como eje — y la barrera accionable de la tabla es `linkBarrier`, no `difficulty`, por el colapso de la KD documentado en §7.
>
> El texto de arriba especifica *"X dificultad, Y volumen, size clicks, color intención"*. **Ninguna de las tres fuentes existía al momento de este delta**: `readKeywordOpportunities` devolvía `searchVolume: null`, `difficulty: null` y `market: 'unavailable'` cableados — ⚠️ **no porque faltara `TASK-1300`, que está `complete`**: esa task entregó el registry de familias (la `labs` es llamable, y `rank-history-seed.ts` ya la usa), pero es *infra de cliente, no capability*. Falta el fetch de volumen/dificultad por keyword Y las columnas donde guardarlo — el schema SEO no tiene `search_volume` ni `keyword_difficulty`, y el contrato **no tiene campo de intención**. Implementarlo literal habría dado un lienzo vacío o, peor, datos fabricados.
>
> La skill `seo-aeo` (§02, método verificado contra la API real de GSC) lista *"priorizar por volumen estimado de un tercero teniendo el GSC propio, donde la demanda ya está medida"* como un **error de método**. Las impresiones de Search Console son demanda medida de la SERP propia del cliente — con su país, su dispositivo y su mezcla real de queries — y son mejor insumo que un volumen promedio de mercado.
>
> **Encoding canónico vigente:** X = **posición ponderada** (rango fijo 8→20, izquierda = más cerca de la primera plana) · Y = **impresiones** (log; la distribución es long-tail y en lineal el 90% se apila contra el eje) · tamaño = **clics incrementales estimados** (área ∝ ganancia, no radio) · color **+ forma** = **acción recomendada**. Zona sombreada = primera plana (posición ≤ 10).
>
> 🎯 **Y el dato de mercado NO es un eje: es una COLUMNA y un FILTRO.** (Escrito como predicción; **cumplido** por TASK-1661 sin tocar el componente, que es la prueba de que el contrato estaba bien puesto.) Los ejes medidos son metodológicamente correctos con o sin él — `searchVolume`/`difficulty` ya eran `number | null` y la tabla los pintaba honestos ("Sin dato de mercado", nunca `0` ni un guion ambiguo) antes de que existiera el dato. `linkBarrier` entra por el mismo camino: columna, con `unknown` → "Sin dato".
>
> ⚠️ **Canibalización es una ACCIÓN, no una variante visual de "oportunidad".** Una query con más de una página no se optimiza: se **consolida** (unificar, 301, canonical o diferenciar intención). Tiene serie propia, forma propia y verbo propio en toda la superficie, y su clasificador vive en un módulo compartido para que mapa, filtros y tabla no puedan derivar entre sí.

### Delta 2026-08-07 — el módulo responde TRES preguntas, y sólo una tenía superficie

Cuestionando el encoding del scatter apareció que el módulo tiene **tres preguntas distintas**, con
fuentes distintas, y que hasta ahora sólo la primera existía como producto:

| Pregunta | Fuente | Estado |
|---|---|---|
| ¿Qué empujo de lo que ya tengo? | GSC **medido** | construida (`TASK-1308`) |
| ¿Dónde quiere estar el cliente? | **declarado por un humano** | `TASK-1659` (modelo) + `TASK-1660` (superficie) |
| ¿Qué me pierdo entero? | competencia + Labs | `TASK-1661` (mercado) **`complete`, en producción 2026-08-14** + `TASK-1662` (gap) + `TASK-1664` (discovery) |

🔴 **Search Console es estructuralmente ciego a las dos últimas.** Si el cliente no está en el top
~100 no hay impresiones, así que esa búsqueda **no existe** en sus datos. No es una limitación del
reader: es una propiedad de la fuente. Por lo tanto ninguna superficie construida sobre GSC podrá
nunca contestar «¿qué me estoy perdiendo?».

**Consecuencia sobre el dato de mercado, que corrige lo dicho más arriba.** Para una keyword donde
el cliente **sí** rankea, el volumen de mercado es enriquecimiento y los ejes medidos siguen siendo
lo correcto. Pero para una keyword donde **no** rankea, GSC no entrega nada, y volumen y dificultad
pasan a ser la **única** forma de contestar *¿vale la pena?* y *¿cuánto cuesta?*. Ahí dejan de ser
opcionales: son **dependencia dura** del carril aspiracional, y sin ellos se aceptan objetivos a
ciegas.

**Lo que ya existía sin que nadie lo notara.** `trackKeywords` **acepta strings arbitrarios** — no
valida contra la lista de oportunidades (verificado 2026-08-07). O sea que seguir una keyword que el
cliente no rankea **ya funciona por contrato** desde `TASK-1308`: el rank capture la mide igual. Lo
que falta es la superficie. Es Full API Parity **al revés** — el pecado habitual es "la UI lo hace y
no hay contrato"; acá el contrato existe y no hay botón, así que la capacidad sólo es alcanzable por
MCP o `curl`, justo donde no hay confirmación visual del cupo ni del gasto comprometido.

**Y lo que falta modelar.** El set monitoreado no sabe **por qué** una keyword está ahí: `source`
(`TASK-1308`) es procedencia —quién la metió—, no intención. Sin esa distinción, "estoy en la 12 y
quiero la 5" y "el cliente quiere rankear acá y estoy en la 60" son la misma fila, no hay avance
contra objetivo, y un objetivo lejano contamina cualquier KPI agregado leyéndose como fracaso
permanente.

> **RESUELTO 2026-08-06/07 (TASK-1307 Slice 0) — ECharts entró, y el chart ancla es su primer consumer.** `echarts` + `echarts-for-react` están instalados y el seam canónico es **`src/libs/styles/AppECharts.tsx`** (`dynamic(ssr: false)`, wrapper obligatorio). Se eligió por dos razones que la alternativa Apex no cubría: (a) los seis requisitos del chart ancla — eje Y invertido, `dataZoom`, tooltip de eje multi-serie, target line, band highlight de updates y last-value labels — son **primitivas de primera clase** en ECharts (`yAxis.inverse`, `dataZoom`, `tooltip.trigger:'axis'`, `markLine`, `markArea`, `endLabel`), mientras en Apex serían annotations manuales + un segundo chart de brush para el zoom; (b) **robustez**: ECharts pinta a canvas y recibe colores **ya resueltos** (`resolveChartColor`), así que no puede repetir el hallazgo 🔴 de TASK-1306 (Apex parsea CSS vars de MUI y lanza 8 excepciones invisibles por corrida). El `ssr: false` **no es cosmético**: ECharts mide su contenedor al montar, y renderizarlo en servidor daría un chart de tamaño cero + mismatch de hidratación. El lazy-load por ruta mantiene los ~250-400 KB fuera del bundle compartido — sólo los paga quien abre la ruta. Los hallazgos 1–3 del delta TASK-1306 **siguen vigentes para los ~32 consumidores Apex del repo**; lo que cierra este Slice 0 es la elección del stack de alto impacto del módulo, no la deuda de Apex.
>
> **Nota de estado (2026-07-01, superada por el párrafo anterior — se conserva por trazabilidad):** ECharts aún NO está instalado (el repo corre ApexCharts 3.49 + Recharts). Instalar `echarts` + `echarts-for-react` (lazy por ruta) es Slice 0 de la pantalla ancla `TASK-1307` — Greenhouse sería el primer consumer del stack ECharts (alineado con la deprecación oportunista de ApexCharts, TASK-518). La alternativa B (line multi-serie Y-invertido sobre ApexCharts con `yaxis.reversed` + annotations) queda documentada en TASK-1307 por si Discovery la prefiere. `CustomChip`/`CustomAutocomplete` no existen como tal → usar `GreenhouseChip` + `@core/components/mui/Autocomplete`.

### 10.5 Estados y honestidad (state-design)

Sin conexión GSC → `EmptyState` accionable + CTA OAuth (nunca ceros fantasma). Medido (●, GSC) vs estimado (◑, DataForSEO) con leyenda persistente. Latencia explícita ("GSC: datos hasta hace 2 días"). Cuota agotada → banner honesto + degrada a GSC medido. Fallo parcial → mostrar lo que llegó, marcar el resto "Pendiente" con razón (`observeAndDegrade`).

### 10.6 Site audit (S4) — superficie operador

Ruta `/admin/growth/seo/audit` (TASK-1309), child del viewCode `administracion.growth_seo` con el
guard de 3 puertas de §10.1. Cliente PURO de `readSiteAuditReport` + `queueSiteAudit`: no deriva
salud, no fabrica snapshots y no toca DataForSEO en el render.

> **Delta 2026-08-08 (TASK-1309) — contratos que fija esta superficie.**
>
> 1. 🔴 **El gauge de salud es un arco SVG determinista, NO un radialBar de ApexCharts** — pese a lo
>    que §10.4 especificaba. Un radialBar mide su contenedor al montar y dentro de una columna fluida
>    mide 0: no dibuja, sin error visible (hallazgo de TASK-1306 en GVC). El arco vive en
>    `src/views/greenhouse/admin/growth/seo/shared/SeoHealthGauge.tsx` y lo comparten el sidebar del
>    Overview y esta pantalla: es la MISMA métrica, y duplicar el dibujo dejaría que los umbrales
>    diverjan y el mismo sitio se viera "sano" en una pantalla y "en riesgo" en la otra.
> 2. **`healthScore === null` NO es 0** y el componente no lo renderiza: null (no calculado) y 0
>    (sitio pésimo) llevan a conclusiones opuestas. El consumer dice "Pendiente" con palabras.
> 3. **Los issues van como LISTA priorizada, no como tabla ordenable.** El orden ES la respuesta a
>    "qué ataco primero"; una tabla la esconde detrás de un control que hay que descubrir. El
>    `DataTableShell` aparece UNA vez, en el drill, donde sí hay una lista homogénea (las URLs).
> 4. **El orden es severidad ▸ (alcance × valor de búsqueda ÷ esfuerzo), con la severidad como corte
>    absoluto.** Un score único dejaría que 400 imágenes sin `alt` enterraran un 5xx. Fijado en
>    `views/.../audit/group-audit-issues.ts` con test dedicado. El tercer eje (`value`) se agregó el
>    mismo día por la auditoría `seo-aeo`; el detalle de por qué NO es redundante con la severidad
>    está en el delta al pie de esta sección.
> 5. **El `issueType` del reader es un id de máquina** (`is_broken`), así que la superficie necesita
>    ficha es-CL. `GH_GROWTH_SEO_AUDIT_ISSUES` (`src/lib/copy/growth.ts`) cubre los 34 checks del
>    allowlist de `findings-map.ts` con label + **tier de esfuerzo curado** (juicio editorial de
>    Efeonce, declarado como estimación en la UI — DataForSEO no reporta costo de arreglo). **Un check
>    nuevo en el allowlist obliga a escribir su ficha**: hay test de drift en ambos sentidos, y
>    mientras no la tenga la UI NOMBRA el id crudo en vez de esconder el issue.
> 6. **El drill vive en la misma ruta vía `?issueGroup=`**, no en un segmento dinámico paralelo: back
>    y enlace compartible salen gratis y hay un solo page guard. Su tabla lleva **scroll interno
>    acotado** — un grupo real trae 91 URLs y sin techo el drill mide ~5000px, expulsando de pantalla
>    la lista que el operador venía recorriendo (hallazgo del GVC). El contenedor es focusable
>    (`tabIndex=0` + `role=region`): una zona con scroll inalcanzable por teclado deja su contenido
>    fuera del alcance de quien no usa mouse.
> 7. **`POST /api/admin/growth/seo/audit/run`** — transporte puro sobre `queueSiteAudit`, gateado por
>    **`growth.seo.audit.run`** (execute), distinta de `observation.read`: diagnosticar y gastarle al
>    proveedor son permisos distintos. Responde **202**, no 200 — el crawl quedó encolado, no listo.
>    6 códigos canónicos nuevos con `actionable` deliberado: `seo_audit_already_running` y
>    `seo_audit_already_captured_today` van **`actionable: false`** porque son el guard de
>    idempotencia haciendo su trabajo (reintentar es justo lo que NO corresponde); `seo_quota_exhausted`
>    y `seo_budget_exhausted` son techos del mes; sólo `seo_provider_unavailable` (breaker abierto o
>    falla del proveedor) es transitorio de verdad y ofrece reintento.
> 8. **`resolveActiveSeoTargetId` se amplió a `resolveActiveSeoTarget`** (id + `rootDomain`): toda
>    superficie que nombra el sitio necesita ambos, y resolverlos por separado invita a que cada
>    consumer escriba su propio `SELECT` — que es lo que ya pasó en la ruta de keywords.
>
> **Delta 2026-08-08 (auditoría `seo-aeo` sobre la superficie).** El orden de la lista tiene TRES
> ejes, no dos: severidad (corte absoluto) ▸ **alcance × valor de búsqueda ÷ esfuerzo**. El eje
> `value` existe porque **la severidad NO encodea valor SEO**: dentro de `notice` conviven higiene
> cosmética y señales reales, y con sólo alcance÷esfuerzo un favicon ausente en 91 páginas encabezaba
> su tier por encima de imágenes sin `alt` en 50. `value: 'low'` pesa 0.5 y no 0 — la higiene se
> hunde pero se sigue listando; esconderla sería la otra forma de mentir sobre el diagnóstico.
> **Y los 4 checks de performance declaran su procedencia de LABORATORIO** (`findings-map.ts` ya lo
> sabía; la capa de presentación lo había perdido): Google rankea con datos de campo (CrUX), así que
> una ficha que prometa ranking sobre el número del crawl promete sobre la métrica equivocada.
>
> **Delta 2026-08-08 (revisión de producto sobre los frames reales).** Cuatro contratos más, tres de
> ellos de la MISMA clase: dos cifras verdaderas puestas juntas sin decir qué mide cada una producen
> una conclusión falsa. La superficie ya había cerrado ese hueco en `healthScore === null` y en la
> performance de laboratorio; estas son la tercera y la cuarta instancia.
>
> 9. 🔴 **"Páginas revisadas" declara cuándo es el TECHO DEL CRAWL y no el sitio.**
>    `SITE_AUDIT_MAX_CRAWL_PAGES` es 100 y Berel devolvió exactamente 100: ese número redondo es el
>    crawl chocando su límite, no el tamaño del sitio. Sin declararlo, un sitio de 3.000 páginas se
>    diagnosticaba al 3% y se titulaba "Salud del sitio: 95". Cuando el conteo iguala el techo, la
>    cifra lo dice y la card explica que la salud describe **esa muestra**, no el sitio entero.
> 10. 🔴 **El puntaje declara su alcance, porque no mide lo mismo que el conteo de issues.** "95 de
>    salud" junto a "519 issues" se lee como contradicción — el operador lo preguntó apenas lo vio.
>    No son la misma medición: el puntaje es el `onpage_score` **del proveedor** (su ponderación,
>    sus ~65 checks) y el conteo sale de **nuestro catálogo curado de 34**. Es consistente —sin
>    críticos, el score del proveedor se mantiene alto porque pesa sobre lo que rompe indexación—
>    pero reconciliarlo es obligación de la superficie, no del lector. El texto cambia según haya
>    críticos o no.
> 11. **Los conteos por severidad SON el filtro** (`?severity=`, compartible y con back), en una
>    banda cuyo ancho es el reparto — longitud, no texto suelto, para una relación parte-todo. Dos
>    guardas: una severidad con 0 issues **no ofrece filtro** (prometería una lista vacía), y filtrar
>    acota lo que se **lista**, nunca lo que se **cuenta** — si acotara ambos, filtrar parecería que
>    el sitio mejoró. El drill se resuelve contra todos los grupos, así que un `?issueGroup=` de otra
>    severidad abre igual en vez de morir en silencio.
> 12. **La comparación contra el crawl anterior vive DENTRO de `readSiteAuditReport`**, no en un
>    reader aparte: el lane `ecosystem` y la tool MCP son passthrough, así que el delta le llega a
>    todos los consumers por construcción (Full API Parity) sin contrato paralelo. Sólo compara
>    contra runs **terminados** (`succeeded`/`degraded`) — contra uno fallido o en vuelo el delta
>    sería inventado — y sin crawl anterior **lo dice**: el hueco vacío sería ambiguo entre "no
>    cambió" y "no hay con qué comparar". El módulo entero se vende como serie de tiempo y ésta era
>    la única superficie que mostraba un punto.
>
> Además: el drill exporta el grupo completo como TSV (el site audit es material de conversación de
> SOW y hasta acá terminaba en copiar 91 URLs a mano) — copia **todas** las URLs del grupo, no sólo
> las que la tabla alcanza a renderizar, porque el techo del render es de lectura y no del dato; el
> fallo del portapapeles se dice, porque fallar en silencio deja al operador creyendo que copió. La
> card de salud adopta densidad adaptativa (`useContainerDensity`): a 390px el arco a tamaño completo
> empujaba la lista —la parte accionable— bajo el fold. Y el wrapper de scroll del drill conserva
> `tabIndex=0` pero **cede el nombre** a la región de `DataTableShell`: llevaba `role='region'` con la
> misma etiqueta y el árbol exponía dos landmarks anidados homónimos.
>
> 🔴 **Cobertura declarada que el audit NO tiene** (es del allowlist y del proveedor, no de la
> superficie): no revisa **acceso de crawlers de IA** en `robots.txt`
> (`OAI-SearchBot`/`PerplexityBot`/`ClaudeBot`), **ausencia** de JSON-LD (sólo detecta errores en
> marcado existente, y a propósito: la regla del módulo prohíbe invertir checks positivos del
> proveedor por passthrough), conflicto `noindex` + bloqueo robots, ni salud de sitemap. Para un
> módulo que se vende como Search Visibility 360 —SEO **y** AEO— el primero es el punto ciego más
> caro: bloquear retrieval saca al cliente de las respuestas de IA (−23,1% de tráfico medido,
> Rutgers/Wharton dic-2025) y hoy esta pantalla lo declararía sano con 95/100. **Dueño: `TASK-1670`**
> (`to-do`, `backend-data`), que expone los tres probes ya probados del grader AEO como superficie
> pública aditiva y los consume como hallazgos **de sitio** detrás de flag. El flag existe porque un
> hallazgo de sitio en esta lista mostraría "1 página afectada", que es falso: la UI necesita
> tratamiento propio (`TASK-1671`, por crear). Y el entregable descargable de la auditoría **no debe
> nacer sin esta cobertura** — un artefacto con nuestro nombre que declara sano un sitio invisible
> para la IA es peor que no tener artefacto.

### 10.7 Cutover `seo_v1 → seo_v2` — expand/contract (TASK-1310 · contract: TASK-1677)

> **Estado al 2026-08-09: CERRADO.** Código y datos contrajeron. El código dejó de leer `seo_v1` en
> el release `49f86c98cda6` y la migración `20260809163352129_task-1677-seo-module-cutover-contract`
> superseded los assignments vigentes, con su bloque `DO` verificando que ninguna organización quedara
> sin cobertura. Verificado con el canary del provider contra producción antes y después: la superficie
> de Grupo Berel abre con datos medidos, sin estado de "sin entitlement" y sin `console.error`.
>
> **El orden fue código primero, datos después, en releases separados**, y conviene no perderlo: el
> check `postgres_migrations` del preflight es estricto, así que una migración commiteada y sin aplicar
> bloquea el release — y aplicarla antes del deploy es lo que el ordering prohíbe. Un cutover
> expand/contract no cabe en un solo release por construcción.

`TASK-1310` renombra la clave del módulo porque `modules.*` es append-only y `seo_v1` nació con
`view_codes=[]`: no se puede editar in-place, hay que superseder. La migración crea `seo_v2`,
supersede los assignments vigentes preservando status/tier/expiración/metadata, y deja la cadena en
`source_ref_json`.

🔴 **Renombrar la clave en el código y en la base a la vez es breaking, y los DOS órdenes de
despliegue dejan ventana de oscuridad** — no es un problema de secuenciar, es de forma:

| Orden | Qué pasa en la ventana |
|---|---|
| Migración primero (el orden canónico del repo) | El código vivo sigue pidiendo `seo_v1`, ya superseded → 0 orgs |
| Código primero | Pide `seo_v2`, que la base todavía no tiene → 0 orgs |

Y "0 orgs" no es sólo una pantalla vacía: el mismo predicado gatea `enforceSeoRunEntitlement`, o sea
**los tres batches que le pagan al proveedor** (rank capture, site audit, backlinks). En la ventana
saltarían con `no_entitlement` **en silencio**, que es justo lo que §6 prohíbe.

**Forma canónica aplicada** (doctrina `arch-architect` → `data/schema-evolution.md`: *"rename in
place is forbidden"*):

1. **Expand** — `SEO_MODULE_KEY` queda como la clave de **escritura** (`seo_v2`) y las **lecturas**
   pasan a `SEO_MODULE_KEYS_READ = ['seo_v2', 'seo_v1']` con `module_key = ANY($n::text[])` en los
   **5** consumidores (`entitlement`, `list-seo-spaces`, `rank-capture-batch`,
   `site-audit/enqueue-batch`, `backlinks/capture`). Se despliega ESTO primero.
2. **Migrate** — se aplica la migración. Sin ventana: las lecturas aceptan ambas.
3. **Contract** — se deja sólo `seo_v2`. Es un cambio posterior y deliberado, con **dueño propio
   (`TASK-1677`**, separada de `TASK-1310` porque es `backend-data` de bajo riesgo y no debe quedar
   atada a un ciclo de diseño abierto). El contract **también tiene dos fases, y no viajan en el
   mismo release**: primero el código deja de leer `seo_v1`, se despliega y se verifica; recién
   después la migración supersede los assignments. Delta 2026-08-09 abajo.
   La condición que autoriza contraer el código **no** es "que no queden assignments `seo_v1`", sino
   la más débil y verificable: que **toda organización con `seo_v1` vigente tenga su `seo_v2` hermano
   vigente**. Si eso se cumple, dejar de leer la clave vieja no le quita el módulo a nadie.

El contenido de `SEO_MODULE_KEYS_READ` está fijado por test para que la contracción sea una decisión
explícita y no un descuido que apague el módulo. Verificado contra PG real con la base todavía en
`seo_v1`: ambas orgs resuelven `hasModule=true`, `tier=contracted`, sin bloqueo.

#### 🔴 Delta 2026-08-08 — la migración colapsó las tres fases en una (ISSUE-143)

El diseño de arriba es correcto y **aun así producción se cayó**, porque la migración
`20260808131441444_task-1310-seo-client-view-codes` metió el **contract dentro del paso 2**: crea
`seo_v2`, le asigna las orgs y en el mismo statement supersede los assignments `seo_v1`. Con eso el
dual-read del paso 1 deja de servir para nada — su valor entero era que hubiera un período con las
dos claves vigentes, y la migración lo borró en el mismo commit en que lo creaba.

Medido contra `https://greenhouse.efeoncepro.com` con el canary del provider: Grupo Berel pasó de
`domainQuadrant=riesgo keywords=50` a `hasModule=false` + `greenhouse_seo_lane_404` en los cinco
lanes. Vercel producción corre `main`, que pide `seo_v1` literal. El **ops-worker no se vio afectado**
porque su deploy ya tenía el dual-read, así que los tres batches que le pagan al proveedor siguieron
sanos — el daño fue de lectura, no de gasto.

Restaurado reabriendo la ventana (`effective_to = NULL` en los assignments `seo_v1`), hecho durable
por `20260808184512073_task-1310-reopen-seo-module-cutover-window`, que además hornea el invariante:
**mientras el cutover esté abierto, ambas claves cubren exactamente las mismas organizaciones**; una
ventana asimétrica aborta la migración. No hay doble conteo de cuota ni presupuesto porque el
resolver hace `ORDER BY created_at DESC LIMIT 1` sobre el `ANY(...)`.

**Reglas duras que salen de esto:**

- **NUNCA** una sola migración contiene el **expand** y el **contract** del mismo cutover. Son dos
  archivos, y el segundo se escribe cuando el primero ya está desplegado **en todos los runtimes**.
  El repo tiene cinco runtimes con despliegues independientes (Vercel producción, Vercel staging y
  tres Cloud Run); "desplegué a develop" no es "desplegué".
- **NUNCA** superseder una clave que el código vigente todavía lee. Antes de escribir un supersede,
  `grep` la clave en `src/` y `services/`: si aparece en un array de lectura, el contract **no toca
  todavía**.
- **NUNCA** dar por buena una migración de cutover porque la base quedó como el SQL decía. La base es
  la mitad del contrato; la otra mitad es qué versión de código la está leyendo en cada runtime.
  **SIEMPRE** verificar con el consumidor real (para este módulo, el canary del provider contra el
  host de producción), no con un `SELECT`.
- **SIEMPRE** que una ventana expand esté abierta, tratar la **simetría de cobertura** como
  invariante verificable, no como consecuencia esperada.

#### Delta 2026-08-09 — el contract arrancó por el código; los datos siguen abiertos (TASK-1677)

**Estado intermedio, con dueño y secuencia.** Lo que cambió y lo que no:

| Lado | Estado al 2026-08-09 |
|---|---|
| **Código** | **CONTRAÍDO y en producción.** `SEO_MODULE_KEYS_READ = ['seo_v2']` en los 5 consumidores, desplegado con el release `49f86c98cda6`. Lectura y escritura vuelven a ser la misma clave. |
| **Datos** | **Ventana todavía abierta.** Los 2 assignments `seo_v1` siguen vigentes (`effective_to IS NULL`). La migración que los supersede está **redactada y verificada, sin aplicar** — vive en el §Delta de ejecución de `TASK-1677`, con un bloque `DO` que aborta si alguna organización quedara sin cobertura. |

**Precondición verificada contra PG antes de tocar el código** (medida, no asumida): las dos
organizaciones con SEO —Efeonce y Grupo Berel— tienen **ambas** claves vigentes en estado `active`.
Ninguna depende sólo de `seo_v1`, así que dejar de leerla no le quita el módulo a nadie. Es
exactamente la condición del paso 3 de arriba.

**Por qué la migración NO puede viajar en el mismo release que el código** — dos razones
independientes, y basta cualquiera de las dos:

1. **El ordering lo exige.** Entre el código y los datos hay que **desplegar y verificar**. Aplicar la
   migración contra un runtime que todavía corre el array viejo funcionaría —acepta ambas claves—,
   pero es justo el checkpoint intermedio lo que convierte esto en un cutover y no en una apuesta:
   sin él, si algo sale mal no se sabe cuál de los dos cambios lo causó, y es la causa de método del
   incidente de ISSUE-143 (verificar con un `SELECT` en vez del consumidor real).
2. **El preflight lo bloquea.** El check `postgres_migrations` es estricto: una migración commiteada y
   no aplicada es `pending` ⇒ error ⇒ release bloqueado. Y aplicarla **antes** del deploy es lo que la
   razón 1 prohíbe. Las dos juntas no dejan alternativa: **la migración va en un release posterior.**

**Qué se rompe mientras dure el estado intermedio** (la asimetría real es código-vs-datos, no
cobertura: a nivel de datos ambas claves siguen cubriendo las mismas orgs, así que el invariante de
simetría horneado por `20260808184512073` sigue intacto):

- **NUNCA** crear un assignment nuevo bajo `seo_v1`. El código ya no lee esa clave: la organización
  quedaría con el módulo en la base y sin módulo en runtime — `hasModule=false` y 404 anti-oracle,
  **en silencio**. Toda alta se escribe con `SEO_MODULE_KEY` (`seo_v2`).
- **NUNCA** aplicar la migración del contract sin haber verificado antes el release del código con el
  **canary del provider contra el host de producción**. Un `SELECT` va a decir exactamente lo que el
  SQL prometía, aunque producción esté caída.
- La secuencia que falta: aplicar la migración → canary de nuevo → `TASK-1677` Slice 3 (cerrar
  `ISSUE-143` y marcar este cutover como terminado acá).

El guardrail que escanea migraciones nuevas —el que impide superseder una clave que el código todavía
lee— **se auto-habilitó con este cambio**: mientras `seo_v1` estuvo en el array de lectura, bloqueaba
la migración del contract; recién ahora la deja pasar. La secuencia no depende de que alguien se
acuerde.

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

**Extensión del carril de mercado / aspiracional** (nace del delta "el módulo responde TRES preguntas", §10.4):

| Task | Perfil | Qué | Estado |
|---|---|---|---|
| TASK-1659 / 1660 | backend-data / ui-ux | Objetivo declarado por el cliente (modelo + superficie) — la pregunta "¿dónde quiere estar?" | pendiente |
| TASK-1661 | backend-data | `seo_keyword_market_data` + capture/preview/reader + `deriveLinkBarrier` + lane + MCP + scheduler mensual | **`complete`, en producción 2026-08-14** (release `3754a17d3b1d`) |
| TASK-1662 | backend-data | Keyword gap vs competidores (`domain_intersection`) — segundo productor de la tabla de mercado | pendiente |
| TASK-1664 | backend-data | Keyword discovery / seed expansion — tercer productor (aprovecha el `keyword_info` inline ya pagado) | en progreso |

Todo gateado por `GROWTH_SEO_ENABLED` (default OFF) + fila en `FEATURE_FLAG_STATE_LEDGER.md`; el carril de mercado suma su propio flag subordinado `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` (ops-worker, ON desde 2026-08-14). Camino min-costo/max-valor: `1302 → 1306 → 1307`.

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

## 17. Placement y camino de extracción a Wave (`wave.efeonce.org`) — vigente 2026-08-05

**Decisión del operador (2026-08-05):** Search Visibility 360 **nace en greenhouse-eo** (la plataforma que existe
hoy) y **eventualmente se habilita como producto en `wave.efeonce.org`** — consistente con `EPIC-037`, que declara
a Wave como casa de la capa de producto de Search Visibility 360 y a Greenhouse como administrador (orgs, acceso,
entitlements administrativos, handoffs comerciales, proyecciones), NUNCA como runtime ni source of truth del
producto a largo plazo. Mientras `EPIC-027` esté activo, ninguna task de EPIC-022 crea deployables ni paquetes por
anticipado: el módulo nace **extraction-ready dentro del monolito** y la extracción física es un programa posterior
(Wave, con sus propias tasks).

### 17.1 Inventario del seam de extracción (qué se levanta como unidad)

| Pieza | Home actual | Destino en extracción |
|---|---|---|
| Datos | `greenhouse_growth.seo_*` (8 tablas TASK-1299 + `seo_gsc_daily` TASK-1302 + `seo_keyword_market_data` TASK-1661) | DB de Wave; el schema es una unidad autocontenida (IDs TEXT prefijados, cero FK a otros dominios). `seo_keyword_market_data` viaja **entera y sin recortar por org**: su clave no lleva `organization_id` a propósito (§4.2), así que es un activo de cartera, no data de un tenant |
| Dominio | `src/lib/growth/seo/**` (readers/commands/chokepoint) | `domain-package` → runtime Wave |
| Lanes | `app` (UI/Nexa) + `ecosystem` (`/api/platform/ecosystem/growth/seo/*`, TASK-1645) | El lane ecosystem ES el contrato sister-platform: Greenhouse lo consume desde Wave tras el cutover |
| Entitlements | `module_assignments` per-org + capabilities `growth.seo.*` | Enforcement local de Wave + administración federada desde Greenhouse (modelo EPIC-037) |
| Historia | BQ mirror (TASK-1303) | Viaja con el producto; dataset separado del resto de Greenhouse |

### 17.2 El único acople deliberado: la FK a la org canónica

`seo_targets.organization_id` → `greenhouse_core.organizations` (FK dura, ON DELETE RESTRICT). **Se mantiene**
mientras el módulo viva en el monolito (integridad hoy > pureza especulativa; regla canónica 360: extender objetos
canónicos, nunca identidades paralelas). En la extracción, la FK se reemplaza por integridad app-level + identidad
federada (los `organization_id` son TEXT opacos y viajan tal cual). Este intercambio es el paso 1 conocido del
runbook de extracción, no deuda oculta.

### 17.3 Reglas duras para TODO el trabajo de EPIC-022 (nacer extraction-ready)

- **NUNCA** agregar una FK nueva desde `seo_*` hacia ningún schema de Greenhouse distinto del ancla org ya
  declarada (ni `grader_*`, ni core adicional, ni delivery/finance/payroll). Cruces = por `organization_id` en
  derived reads.
- **NUNCA** importar desde `src/lib/growth/seo/**` módulos de otros dominios de Greenhouse, salvo primitives
  transversales canónicas (postgres client, entitlements runtime, copy, observabilidad). El grafo de imports del
  dominio debe poder cortarse con el seam.
- **SIEMPRE** que un consumer nuevo necesite datos SEO (UI, Nexa, MCP, sister platform), entrar por los readers
  canónicos o el lane ecosystem — nunca SQL directo cross-dominio. El lane ecosystem es el contrato que sobrevive
  la extracción.
- **SIEMPRE** declarar en el `Modular Placement Contract` de cada child task: `Future candidate home:
  domain-package` + nota Wave. La extracción física NO se autoriza desde una task de feature.

Fuente: directiva del operador 2026-08-05 + `EPIC-037` + `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
