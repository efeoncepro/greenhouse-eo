# EPIC-022 — Growth SEO Module (Search Visibility 360)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-022-growth-seo-search-visibility-360-module`
- GitHub Issue: `none`

## Summary

Construye el **módulo SEO de Greenhouse** dentro del dominio `growth`, hermano y complementario del **AEO Grader** (`growth.ai_visibility`). Es el lado clásico de la búsqueda — Google orgánico: rank tracking, keyword research, site audit técnico y backlinks — apalancando **DataForSEO** (ya integrado) y **Google Search Console per-org** (ya conectado, TASK-1282). Los dos motores se envuelven en una sola narrativa: **"Search Visibility 360"** — el único panel donde un cliente ve los dos internets de búsqueda (Google orgánico + motores de IA) con la misma identidad de org, el mismo evidence ledger gobernado y el mismo modelo de entitlement. La feature ancla es el **seguimiento de rendimiento y evolución de URLs/keywords en el tiempo**.

## Why This Epic Exists

Hoy Greenhouse mide si las IA te citan (AEO grader) pero **no** mide si rankeas en Google clásico ni cómo evoluciona esa visibilidad. Es media película: el CMO cliente pregunta "¿estamos ganando o perdiendo visibilidad en búsqueda?" y solo respondemos la mitad IA. El SEO no cabe en una sola task porque cruza schema nuevo (serie temporal), gobernanza de un provider pago (DataForSEO por-request), materialización recurrente (crons + reactive), entitlements per-org, readers/commands canónicos, y múltiples superficies (operador, cliente, report artifact). Es un programa multi-task con boundary duro contra el AEO y contra Payroll/Finance. La coordinación (orden de dependencias, gate de costo, boundary SEO↔AEO, secuencia backend-data → ui-ux) vive a nivel epic; la implementación real vive en las tasks hijas.

## Outcome

- Un dominio `growth.seo` con serie temporal append-only (rank/audit/backlinks) que responde "¿cómo rinde este set de URLs/keywords y cómo evoluciona?" — incluyendo la materialización que hoy le falta a GSC.
- DataForSEO ampliado de forma gobernada (allowlist cerrado de familias serp/labs/onpage/backlinks/domain) con cost-tracking y circuit breaker por familia, sin debilitar el candado actual.
- Entitlements `growth.seo.*` per-org (vía `module_assignments`, no por rol) con las 4 puertas (público/contratado/trial/operador), consistente con el modelo AEO.
- Superficies operador + cliente + report artifact que reusan el mismo primitive (Full API Parity), más el cross-link "Search Visibility 360" (SEO ↔ AEO).
- Un camino comercial: interno-first en Grupo Berel → puerta contratada → lead magnet foto.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — el motor hermano (AEO); boundary + patrones de dominio `growth`.
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — integración per-cliente (el token ES el scope) + outbox/reactive.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — read/write como primitive gobernado.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability + grant + module_assignments per-org.
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — PostgreSQL first (ventana caliente) + BigQuery (historia).
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — reliability signals de los paths async.

## Child Tasks

- `TASK-1299` — schema `growth.seo` (targets, keyword_sets, competitors, snapshots append-only) — bloqueador fundacional.
- `TASK-1300` — DataForSEO family registry (ampliar allowlist + breaker + cost por familia) — bloquea todo lo provider-facing.
- `TASK-1301` — capabilities `growth.seo.*` + entitlement per-org + chokepoint `enforceSeoRunEntitlement`.
- `TASK-1302` — [planificada] GSC daily snapshot materializer + `readKeywordOpportunities` (quick win, reusa TASK-1282).
- `TASK-1303` — [planificada] rank capture command + `readRankEvolution` + Cloud Scheduler + reactive BQ mirror.
- `TASK-1304` — [planificada] site audit (queue+poll OnPage) + backlink snapshot.
- `TASK-1305` — [planificada] `readSeoAeoGap` derived read cross-módulo (report layer).
- `TASK-1306` — [planificada, ui-ux] SEO Overview operador `/admin/growth/seo`.
- `TASK-1307` — [planificada, ui-ux] ★ Rank & URL performance over time `/admin/growth/seo/performance`.
- `TASK-1308` — [planificada, ui-ux] Keyword opportunities `/admin/growth/seo/keywords`.
- `TASK-1309` — [planificada, ui-ux] Site audit `/admin/growth/seo/audit`.
- `TASK-1310` — [planificada, ui-ux] Cliente + Report Artifact `/growth/seo` + quadrant 360.
- `TASK-1311` — [planificada, backend-data] AEO citation attribution URL-level + grounded queries (reader/rollup sobre las citas que el grader YA captura).
- `TASK-1312` — [planificada, backend-data] Topic Cluster como entidad de primera clase (`seo_topic_clusters`) + rollup SEO+AEO.
- `TASK-1313` — [planificada, backend-data] Unified Page/Cluster Visibility 360 read (`readPageVisibility360`/`readClusterVisibility360`).
- `TASK-1314` — [planificada, backend-data] Pillar-cluster health / topical authority (score + huecos; compone rank/audit/citation, no captura nueva).
- `TASK-1315` — [planificada, backend-data] E-E-A-T signal extraction (entity + author + trust) — capa de autor + probes de trust, reusando entity probes (KG/Wikidata/Reddit) + json-ld.
- `TASK-1316` — [planificada, backend-data] E-E-A-T rater (rúbrica 4 pilares, YMYL-aware) — assessment LLM reusando brand-intelligence + evals/accuracy, con confianza calibrada (anti falso-0).
- `TASK-1317` — [planificada, backend-data] E-E-A-T scorecard reader + integración (`readEeatScorecard`; alimenta topical authority 1314 + el 360; medido vs evaluado).

## Existing Related Work

- `growth.ai_visibility` (AEO grader, EPIC-020/EPIC-021) — motor hermano; el SEO reusa sus patrones de dominio, entitlement y report artifact (TASK-1252).
- `TASK-1282` — Search Console multi-tenant connection (per-org OAuth + reader de Search Analytics); base de las señales GSC. Live en staging (Grupo Berel conectado).
- `src/lib/ai/dataforseo.ts` — cliente DataForSEO existente (hoy candado a `/v3/serp/`), usado por el AEO AI Overview provider.

## Exit Criteria

- [ ] `growth.seo` existe como dominio con serie temporal append-only + readers/commands canónicos, boundary duro contra AEO (cross-ref por `organization_id`, cero merge de tablas) y contra Payroll/Finance (cero writes).
- [ ] DataForSEO ampliado con allowlist cerrado de familias + cost-tracking + circuit breaker por familia; el candado no quedó debilitado a prefijo libre.
- [ ] Entitlements `growth.seo.*` per-org con las 4 puertas + coverage test; ningún acceso derivado por rol.
- [ ] La pantalla estrella (evolución de URLs/keywords en el tiempo) entrega valor con datos reales de Berel, con honestidad medido (GSC) vs estimado (DataForSEO).
- [ ] Gate de costo DataForSEO per-org operativo (quota cap + signal `seo.provider.cost_over_budget`).
- [ ] Documentación triple (técnica/funcional/manual) del módulo + flag `GROWTH_SEO_ENABLED` en el Feature Flag Ledger.

## Non-goals

- Reemplazar el AEO grader ni fusionar su scoring con el SEO (son ejes complementarios; se cruzan por org, no se promedian).
- Cualquier write/mutación de Payroll, Finance, compensación o finiquito desde este dominio.
- Scraping directo de Google/SERP (toda SERP/backlink/audit sale por la API DataForSEO server-side).
- Vender Greenhouse/SEO como producto standalone (rompe la doctrina ASaaS; el SEO es capacidad del servicio + puerta contratada).
- URL Inspection API de GSC (segunda fuente, follow-up posterior).

## Delta 2026-07-01

Epic autorado desde una planificación con 4 lentes (arquitectura, SEO, product design, comercial). Se reservan las 3 tasks fundacionales backend-data (`TASK-1299/1300/1301`); las tasks 1302–1310 quedan planificadas en `## Child Tasks` y se autoran a continuación conforme se secuencia el programa. Camino de máximo valor / mínimo costo declarado: `TASK-1302 → TASK-1306 → TASK-1307` (dashboard temporal casi sin gasto DataForSEO, GSC ya conectado).

## Delta 2026-07-02 — extensión granularidad URL / Topic Cluster

Se suma el bloque **"Search Visibility 360 granular"** (nivel página + topic cluster, no solo marca): para una landing o cluster, análisis unificado de keywords · avg position · clicks · **grounded queries que la cita la IA** · citation share · cuadrante 360 a ese nivel. Hallazgo clave al aterrizar el diseño: **el grader YA captura las citas con URL** (`GrowthAiVisibilityCitation` + `buildCitations` + el adapter AI-mode parsea `references`/`links`/`sources`), así que la extensión es reader/atribución + entidad cluster + read unificado, NO nueva captura. 3 tasks nuevas: `TASK-1311` (citation attribution URL-level), `TASK-1312` (topic cluster entity), `TASK-1313` (`readPageVisibility360`/`readClusterVisibility360`). Boundary §1.1 intacto (derived read con join `org+url/cluster`, sin merge de tablas). Consumer UI granular = follow-up ui-ux posterior. Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15.

## Delta 2026-07-02 (cont.) — pillar page + topical authority

El topic cluster gana estructura **pillar + supporting**: la pillar page es el hub del tema, donde SEO clásico y AEO convergen (debe rankear el head term *y* ser la fuente que la IA cita como autoridad). Dos piezas: (1) **delta a `TASK-1312`** — `role` (`pillar`|`supporting`) en el member + único pillar activo por cluster (índice único parcial); (2) **`TASK-1314`** — pillar-cluster health / topical authority: reader que compone cobertura (keyword gap) + estructura (internal linking del audit 1304) + rendimiento (rank 1303) + el twist AEO (¿la pillar es la citada? 1311) → topical authority score + huecos. Compone readers, cero captura nueva, boundary §1.1 intacto. Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15.1.

## Delta 2026-07-02 (cont. 2) — E-E-A-T como capa de entidad/calidad conectiva

E-E-A-T (Experience · Expertise · Authoritativeness · Trustworthiness) es el "por qué" debajo de rankear (SEO) Y de ser citado (AEO), y el multiplicador del topical authority. Hallazgo al aterrizar el diseño: **~70% de la materia prima ya existe en el probe layer del grader** (eje `entity` KG/Wikidata/Reddit-UGC de TASK-1267 + `json-ld` structural + `brand-intelligence` LLM del contenido del sitio). Gap = capa de autor + rúbrica/rater 4 pilares (YMYL-aware) + señales de trust explícitas. **Vive cerca del grader** (extiende su eje entity), el módulo SEO la **consume** (un primitive, dos consumers). Regla dura: E-E-A-T es un **assessment**, no un dial — medido (●) vs evaluado (◑), calibración anti falso-0 (lección EPIC-021), reusa evals/accuracy. 3 tasks: `TASK-1315/1316/1317`. Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §16.
