# TASK-1314 — Growth SEO: Pillar-Cluster Health / Topical Authority

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|data`
- Blocked by: `TASK-1312, TASK-1313, TASK-1304`
- Branch: `task/TASK-1314-growth-seo-pillar-cluster-health-topical-authority`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Expone `readPillarClusterHealth({ organizationId, clusterId, range })`: el **reader analítico de topical authority** que, para un topic cluster completo, responde si el cluster **tiene autoridad temática real** — no solo si tiene tráfico. Es la capa que junta las cuatro señales que hacen a un cluster autoritativo y las emite como diagnóstico accionable: **Cobertura** (¿el cluster tiene pillar + suficientes supporting, o hay huecos temáticos vs el keyword gap de DataForSEO Labs?), **Estructura** (¿las supporting pages enlazan de vuelta a la pillar? — grafo de enlaces internos del OnPage audit, `TASK-1304`), **Rendimiento** (¿la pillar rankea el head term y las supporting el long-tail? — rank evolution `TASK-1303` / `readClusterVisibility360` `TASK-1313`), y el **twist AEO** (el diferenciador): ¿es la **pillar** la fuente que la IA cita para el tema, o la IA cita a un competidor / a una supporting suelta? — citation attribution URL-level de `TASK-1311`. La regla load-bearing es **"compone, no captura"**: esta task **no agrega ni una tabla ni un provider call** — es puro derived read que **une en memoria** dos+ readers existentes por `organization_id + cluster/url`, emitiendo un **topical authority score** por cluster + los **huecos accionables** con evolución temporal. El boundary §1.1 aplica igual que en la task hermana `TASK-1313`, amplificado: CERO JOIN/VIEW/FK cross-motor, CERO merge de tablas, y **CERO promedio ciego** — el score compone señales nombradas (cobertura · estructura · rendimiento · autoridad-AEO), NO fusiona SEO+AEO en un número opaco. Degradación honesta por señal faltante (`no_pillar`/`no_audit`/`no_rank`/`no_aeo_data`), NUNCA ceros.

## Why This Task Exists

§15.1 del doc maestro sube la resolución del 360 de "página/cluster" a **topical authority**: un topic cluster no es una lista plana de URLs — tiene estructura **pillar + supporting**, y la **pillar es el punto donde SEO clásico y AEO convergen** (el activo que debe rankear el head term *y* el que la IA debería elegir citar como autoridad del tema). Es la unidad real de autoridad temática. La pregunta comercial que ninguna herramienta suelta contesta —Semrush ve solo SEO, Profound ve solo IA, y ninguna cruza estructura de cluster × citación IA— es: *"¿mi cluster de este tema tiene autoridad real, o tiene huecos: le falta pillar, le faltan supporting, la pillar no rankea el head, las supporting no enlazan al pillar, o la IA no me cita a mí sino a un competidor?"*. `readClusterVisibility360` (TASK-1313) ya une SEO×AEO por cluster, pero responde *"qué visibilidad tiene el cluster"*, no *"qué tan autoritativo es su diseño pillar/supporting"*. `TASK-1312` ya modela el `role` `pillar`/`supporting` en el member del cluster; esta task **explota esa estructura** para diagnosticar salud topical. El riesgo de modelar esto mal es el de siempre pero amplificado: la tentación de "resolver" la salud del cluster con un **JOIN** entre `seo_*`, el grafo de enlaces internos del audit y la atribución de citas AEO, o de **materializar** un `pillar_cluster_health` con un score promedio que colapse las cuatro señales, **corrompe las verdades** (distintos providers, distinta cadencia, distinta unidad) y produce un número que nadie puede accionar. Esta task fija la salud topical como **composición gobernada de readers** — señales nombradas, no fusión — para que la futura UI de topical authority consuma un diagnóstico honesto en vez de re-inventar el cruce y romper el aislamiento entre motores.

## Goal

- `readPillarClusterHealth({ organizationId, clusterId, range })` en `src/lib/growth/seo/**`: reader analítico que **compone** los primitives existentes (NO captura nueva) y emite un diagnóstico de topical authority por cluster, uniendo en memoria por `organization_id + cluster/url` las cuatro señales.
- Las 4 señales nombradas (NUNCA fusionadas en un número opaco):
  - **Cobertura:** ¿pillar presente + supporting suficientes, o huecos temáticos? (rollup de cluster `TASK-1312` + keyword gap DataForSEO Labs vía `TASK-1304`).
  - **Estructura:** ¿las supporting enlazan a la pillar? (grafo de enlaces internos del OnPage audit — `readSiteAuditReport` `TASK-1304`).
  - **Rendimiento:** ¿la pillar rankea el head term y las supporting el long-tail? (`readRankEvolution` `TASK-1303` / `readClusterVisibility360` `TASK-1313`).
  - **Autoridad-AEO (twist):** ¿es la pillar la fuente citada por la IA para el tema, o la IA cita a un competidor / a una supporting suelta? (`readUrlCitationAttribution` `TASK-1311`).
- **Topical authority score** por cluster **compuesto de señales nombradas** (cada eje visible + su contribución), NUNCA un promedio ciego de SEO+AEO; + los **huecos accionables** (`falta pillar` / `faltan supporting` / `pillar no rankea head` / `supporting no enlazan al pillar` / `pillar no es la citada`), con evolución temporal.
- Degradación honesta por señal faltante: sin pillar activo → `no_pillar`; sin site audit → `no_audit`; sin rank/GSC → `no_rank`; sin atribución de citas AEO → `no_aeo_data`; NUNCA ceros fantasma ni un score fabricado.
- Gate de acceso: `growth.seo.observation.read` (touch-it) + reuso del gate existente de lectura AEO (citations/`grader_scores`), sin duplicar lógica de autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§15.1 (Pillar page + topical authority — la fuente de verdad de esta task: `role` pillar/supporting, la pillar como punto de convergencia SEO↔AEO, las 4 señales cobertura/estructura/rendimiento/autoridad-AEO, "topical authority score + huecos accionables", "compone readers, no fusiona")**, **§1.1 (boundary duro NUNCA/SIEMPRE — la regla load-bearing)**, §2 (complementariedad SEO↔AEO + matriz mental 360 + las señales que se cruzan), §3 (mapa de capacidades: topical authority/cluster gaps = Labs `keyword_gap`; internal linking = OnPage), §5 (métricas derivadas — visibility, top-3/top-10), §7 (readers como derived read cross-módulo, result shape `{ ok }`).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — modelo del AEO: `grader_profiles → grader_runs (reportable) → grader_scores`, y las citas por observación (`GrowthAiVisibilityCitation`, prompt = grounded query) que `TASK-1311` atribuye por URL.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — reader como primitive canónico consumible por UI + Nexa + MCP.
- `CLAUDE.md §"SQL Signal Reader Schema Validation Gate"` — validar cualquier SQL propio contra PG real; `capture_date`/`effective_from`/`effective_to`=DATE, `*_at`=TIMESTAMPTZ.

Reglas obligatorias (§1.1 + §15.1 — **boundary duro, load-bearing**):

- **NUNCA capturar nada nuevo.** Esta task es un reader que **compone** primitives existentes; CERO tabla nueva, CERO provider call (no gasta cuota DataForSEO ni LLM), CERO cron, CERO materialización. Si un agente siente que "necesita capturar X", la señal viene de una dependencia (TASK-1311/1312/1313/1304/1303), no de esta task.
- **NUNCA computar citabilidad AEO desde rank SEO ni viceversa.** Son verdades independientes de providers distintos, aun a nivel pillar/cluster.
- **NUNCA mergear tablas `grader_*`/atribución-de-citas con `seo_*` (`seo_rank_snapshots`/`seo_gsc_daily`/`seo_site_audit_findings`/`seo_topic_cluster_members`).** Cero FK cross-motor. El cruce es una **operación en memoria** sobre dos+ reads separados, unidos por `organization_id + cluster/url`.
- **NUNCA promediar ciegamente las señales** en un número único opaco. El topical authority score **compone señales nombradas** (cobertura · estructura · rendimiento · autoridad-AEO, cada una visible con su contribución); jamás colapsa SEO+AEO en un score que oculte de dónde sale.
- **NUNCA reconciliar** "la pillar rankea #1 y la IA cita a un competidor" como un bug. Es exactamente el **hueco accionable** que el producto reporta.
- **SIEMPRE** exponer la salud del cluster como **derived read (report layer)** — composición en memoria de readers, NUNCA una VIEW/tabla `pillar_cluster_health` materializada ni un `topical_authority_score_snapshots`.
- **SIEMPRE** degradar honesto si falta una señal (`no_pillar`/`no_audit`/`no_rank`/`no_aeo_data`), NUNCA rellenar con `0` ni fabricar un score.

## Normative Docs

- `docs/tasks/to-do/TASK-1313-growth-seo-unified-page-cluster-visibility-360-read.md` — **task hermana directa**: `readClusterVisibility360`. Esta task copia su estructura y su patrón de "dos+ reads separados unidos en memoria por `org + cluster/url`" + boundary §1.1; se apoya en su cruce SEO×AEO por cluster para las señales de rendimiento y autoridad-AEO, y agrega la capa de estructura pillar/supporting + cobertura + el score compuesto. [verificar el shape final de `readClusterVisibility360` al tomar la task].
- `docs/tasks/to-do/TASK-1312-growth-seo-topic-cluster-entity-rollup.md` — provee `seo_topic_clusters` + `seo_topic_cluster_members` con `role` (`pillar`/`supporting`, un solo pillar activo por cluster) + `readTopicClusterRollup(clusterId)`. Resuelve `clusterId → { pillarUrl, supportingUrls[], keywordSets }` — es el **input de estructura** (quién es la pillar, quiénes las supporting) de esta task. [verificar shape del rollup + del `role`].
- `docs/tasks/to-do/TASK-1304-growth-seo-site-audit-backlink-snapshot.md` — provee `readSiteAuditReport(targetId, auditRunId?)` sobre `seo_site_audit_runs` + `seo_site_audit_findings` (OnPage audit). Es la fuente del **grafo de enlaces internos** (¿las supporting enlazan a la pillar?) y del **keyword gap / huecos** de cobertura. [verificar que el OnPage audit exponga el grafo de enlaces internos / internal linking por-URL en el reader; si no, declarar el gap].
- `docs/tasks/to-do/TASK-1303-growth-seo-rank-capture-evolution-reader.md` — provee `readRankEvolution(targetId, {keywords?, range, engine, device})` sobre `seo_rank_snapshots` (con `url`) + mirror BQ. Fuente del **rendimiento** (¿la pillar rankea el head term, las supporting el long-tail?). [verificar filtro por URL].
- `docs/tasks/to-do/TASK-1311-growth-seo-aeo-citation-attribution-url-grounded-queries.md` — provee `readUrlCitationAttribution` (citas atribuidas por URL + grounded queries + engine + citation share). Fuente de la **autoridad-AEO** (¿la IA cita a la pillar, a una supporting, o a un competidor?). [verificar shape final del reader].
- `docs/tasks/to-do/TASK-1305-growth-seo-aeo-gap-derived-read.md` — `readSeoAeoGap` (nivel marca) + su clasificador quadrant ortogonal. Patrón de referencia de "dos ejes ortogonales, cero promedio"; el score compuesto de esta task hereda esa disciplina (nombrar los ejes, no fusionarlos). [verificar dónde vive el clasificador].
- `src/lib/growth/search-console/contracts.ts` — patrón result shape `{ ok: true, ... } | { ok: false, errorCode }` a espejar (`SearchConsoleAnalyticsResult`).
- `src/lib/growth/ai-visibility/store.ts` (`listOperatorCrossOrgAeoScores`) — patrón canónico de degradación honesta AEO (`null`, NUNCA `0`) reusado por la señal de autoridad-AEO.

## Dependencies & Impact

### Depends on

- `TASK-1312` — `seo_topic_clusters` + `seo_topic_cluster_members` con `role` `pillar`/`supporting` (un solo pillar activo por cluster) + `readTopicClusterRollup`. **Bloqueador duro** (sin la estructura pillar/supporting no hay topical authority que diagnosticar; el `role` ES el eje de esta task).
- `TASK-1313` — `readClusterVisibility360(clusterId)` (cruce SEO×AEO por cluster). **Bloqueador duro** (esta task se apoya en su cruce para las señales de rendimiento y autoridad-AEO por cluster/URL, y agrega la lente pillar/supporting encima).
- `TASK-1304` — `readSiteAuditReport` (site audit / grafo de enlaces internos + keyword gap). **Bloqueador duro** (sin el internal linking no hay señal de estructura; sin el audit no hay señal de cobertura de huecos).
- `TASK-1303` — `readRankEvolution` (rank por URL). Implícito vía TASK-1313, o directo para separar head-term (pillar) vs long-tail (supporting) [verificar granularidad de keyword necesaria].
- `TASK-1311` — `readUrlCitationAttribution` (citas por URL + grounded queries + citation share). Implícito vía TASK-1313 para la señal de autoridad-AEO [verificar si se consume directo o vía TASK-1313].
- `TASK-1301` — capability `growth.seo.observation.read` + entitlement per-org (gate del lado SEO). Implícito (lo consume el reader) [verificar seed].
- Motor AEO existente (`grader_*` + citations) — reusado por `organization_id`, ya en producción.

### Blocks / Impacts

- Habilita la **UI de topical authority / pillar health por cluster** (follow-up ui-ux posterior, §15.1 del doc maestro) — consume `readPillarClusterHealth`.
- Es el contrato que hace real la capa más diferenciada del producto (§15.1): la salud topical pillar/supporting cruzada con citación IA que ninguna herramienta suelta (Semrush/Profound) da.
- Complementa `readClusterVisibility360` (TASK-1313, "qué visibilidad tiene el cluster") con "qué tan autoritativo es su diseño pillar/supporting"; ambos coexisten sin fusionarse.

### Files owned

- `src/lib/growth/seo/topical-authority/read-pillar-cluster-health.ts` [nuevo — `readPillarClusterHealth`] [verificar carpeta `topical-authority/` en Discovery]
- `src/lib/growth/seo/topical-authority/topical-authority-score.ts` [nuevo — función pura de composición del score por señales nombradas + detección de huecos] [verificar carpeta]
- `src/lib/growth/seo/contracts.ts` [extendido — `PillarClusterHealthResult`, tipos de las 4 señales + score compuesto + huecos accionables] [verificar path]
- `src/lib/growth/seo/topical-authority/__tests__/read-pillar-cluster-health.test.ts` [nuevo]
- `src/lib/growth/seo/topical-authority/__tests__/topical-authority-score.test.ts` [nuevo]

## Current Repo State

### Already exists

- **Estructura pillar/supporting** (post TASK-1312): `seo_topic_cluster_members.role` (`pillar`/`supporting`, un solo pillar activo por cluster) + `readTopicClusterRollup` que resuelve el set del cluster. La entidad y su estructura = cubierto por la dependencia.
- **Cruce SEO×AEO por cluster** (post TASK-1313): `readClusterVisibility360` une rank/GSC por URL × atribución de citas por URL por `org + cluster/url`, con quadrant 360 granular + degradación honesta. Rendimiento + autoridad-AEO por cluster/URL = cubierto por la dependencia.
- **Site audit / internal linking** (post TASK-1304): `readSiteAuditReport` sobre `seo_site_audit_findings` (OnPage). El grafo de enlaces internos + keyword gap viven acá. [verificar que el reader exponga internal linking por-URL].
- **Rank por URL** (post TASK-1303): `readRankEvolution` filtra por URL — separa head-term (pillar) de long-tail (supporting).
- **AEO cita-por-URL** (post TASK-1311): `readUrlCitationAttribution` (grounded queries + engine + citation share por URL).
- **Patrón hermano** (TASK-1313/1305): "dos+ reads separados unidos en memoria" + clasificador ortogonal + degradación honesta. Esta task reusa ese patrón, agregando la lente pillar/supporting + el score compuesto.
- Patrón de result shape `{ ok }` (Search Console reader) y de reader gobernado por capability + org.

### Gap

- No existe ningún reader de **topical authority / pillar-cluster health**. `readClusterVisibility360` (TASK-1313) responde "qué visibilidad tiene el cluster", pero nadie explota la estructura `pillar`/`supporting` (TASK-1312) para diagnosticar si el cluster **tiene autoridad temática real** — nadie compone cobertura + estructura (enlaces internos supporting→pillar) + rendimiento (pillar rankea head, supporting long-tail) + el twist AEO (¿la IA cita a mi pillar o a un competidor?) en un score de señales nombradas + huecos accionables. La futura UI de topical authority no tiene contrato del cual leer.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (derived read cross-módulo compositivo, read-only, sin persistencia nueva, sin provider call)
- Source of truth afectado: NINGUNO nuevo. Compone `readTopicClusterRollup` + `readClusterVisibility360` (o sus fuentes `readRankEvolution` + `readUrlCitationAttribution`) + `readSiteAuditReport`; el diagnóstico es efímero (en memoria), NO se materializa.
- Consumidores afectados: futura UI de topical authority por cluster (§15.1), Nexa/MCP.
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: boundary SEO↔AEO (§1.1 + §15.1), rollup de cluster + `role` pillar/supporting (`readTopicClusterRollup` TASK-1312), cruce SEO×AEO por cluster (`readClusterVisibility360` TASK-1313), site audit / internal linking (`readSiteAuditReport` TASK-1304), rank por URL (`readRankEvolution` TASK-1303), atribución de citas (`readUrlCitationAttribution` TASK-1311), disciplina de ejes ortogonales del clasificador (`readSeoAeoGap` TASK-1305), result shape `{ ok }`, gate `growth.seo.observation.read` + gate existente de lectura AEO.
- Contrato nuevo o modificado: `readPillarClusterHealth({ organizationId, clusterId, range })` → `{ ok: true, clusterId, range, coverage, structure, performance, aeoAuthority, topicalAuthorityScore, gaps } | { ok: false, errorCode: 'no_pillar'|'no_audit'|'no_rank'|'no_aeo_data'|'unknown_cluster'|'disabled'|'forbidden'|'query_failed', status }`. Sin nuevo endpoint/tabla obligatorio en esta task (el reader lo consume la UI follow-up).
- Backward compatibility: `compatible` (reader additive, read-only, cero cambio en schema/consumers existentes; gated por `GROWTH_SEO_ENABLED`).
- Full API parity: reader canónico en `src/lib/growth/seo/**`, un primitive de topical authority, muchos consumers (UI + Nexa + MCP). Ver `## Capability Definition of Done` (touch-it de capability existente).

### Data model and invariants

- Entidades/tablas/views afectadas (SOLO lectura indirecta vía readers, sin escritura): `greenhouse_growth.seo_topic_clusters` + `seo_topic_cluster_members` (`role`, vía `readTopicClusterRollup`), `seo_rank_snapshots` + `seo_gsc_daily` (vía readers SEO / `readClusterVisibility360`), la atribución de citas AEO (vía `readUrlCitationAttribution` / `readClusterVisibility360`), `seo_site_audit_findings` (internal linking + keyword gap, vía `readSiteAuditReport`), `greenhouse_growth.grader_*` (indirecto, vía el reader AEO), `greenhouse_core.organizations` (ancla del cruce).
- Invariantes que no se pueden romper (**boundary, load-bearing**):
  - **Compone, no captura:** esta task NO agrega tabla, provider call, cron ni materialización. Es puro derived read compositivo. Cualquier necesidad de "capturar" pertenece a una dependencia.
  - El cruce se resuelve por `organization_id + cluster/url` — el `clusterId → { pillarUrl, supportingUrls[] }` (rollup TASK-1312) ancla las señales, unidas **en memoria** sobre readers separados. Cero JOIN SQL entre `seo_*`, el grafo de enlaces internos y la atribución de citas AEO; cero VIEW/tabla que mergee motores.
  - Cero FK cross-motor. Las señales de estructura (audit), rendimiento (rank) y autoridad-AEO (citas) se resuelven cada una por su reader y se unen por las URLs del cluster en memoria.
  - **Cero promedio ciego:** el `topicalAuthorityScore` compone señales nombradas (cada eje visible con su contribución); NUNCA fusiona SEO+AEO en un número opaco. Las señales cobertura/estructura/rendimiento/autoridad-AEO se mantienen individualmente inspeccionables en el payload.
  - Derived read efímero: NO se materializa (no hay `pillar_cluster_health_snapshots` ni `topical_authority_score_snapshots`); es report layer, se computa on-read.
  - Degradación honesta por señal: sin pillar activo → `no_pillar`; sin audit → `no_audit`; sin rank/GSC → `no_rank`; sin atribución de citas AEO → `no_aeo_data`; NUNCA `0` ni score fabricado. Una señal faltante degrada esa señal (o el reader entero según diseño), no rellena con cero.
  - Cero escritura, cero payroll/finance.
- Tenant/space boundary: `clusterId` se valida perteneciente a `organizationId` server-side (vía `clusterId → seo_target_id → organization_id`, heredado del rollup TASK-1312). El lado AEO se lee con ESE `organization_id` (no con otro). Ambos gates de acceso (SEO + AEO) se validan; un caller con acceso SEO pero sin acceso a las citas AEO de esa org degrada honesto (`no_aeo_data`), no expone datos AEO ajenos.
- Idempotency/concurrency: N/A (read-only puro, sin write, sin lock).
- Audit/outbox/history: N/A (read-only; sin outbox). La observabilidad es logging + `captureWithDomain` en el catch.

### Migration, backfill and rollout

- Migration posture: `none` (reader puro compositivo; sin schema, sin migración, sin backfill — las tablas y readers los crean las deps).
- Default state: `flag OFF` (`GROWTH_SEO_ENABLED`); el reader existe pero ningún consumer lo llama hasta la UI de topical authority follow-up.
- Backfill plan: N/A.
- Rollback path: revert PR (read-only, sin efecto persistente).
- External coordination: ninguna (sin provider, sin secret, sin cron, sin cutover — no gasta cuota DataForSEO ni LLM porque compone snapshots ya materializados).

### Security and access

- Auth/access gate: `growth.seo.observation.read` (lado SEO) + el gate existente de lectura AEO (citations/`grader_scores`, lado AEO) — reusar, NO duplicar autorización. Ambos por-org (`module_assignments`), no por rol. Se apoya en los gates que las deps ya aplican (el reader compone readers ya gateados) + valida el suyo propio en el entrypoint.
- Sensitive data posture: sin PII, sin secretos, sin finance. Config SEO (cluster/URLs) + métricas SEO + citas/scores AEO de la propia org.
- Error contract: `{ ok: false, errorCode, status }` canónico (es-CL en la UI); errores capturados con `captureWithDomain(err, 'growth'|'ai', ...)`, NUNCA raw error al cliente ni `Sentry.captureException` directo.
- Abuse/rate-limit posture: N/A adicional (read-only sobre snapshots ya materializados; sin call a provider externo — no gasta cuota DataForSEO ni LLM).

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit tests de la composición de las 4 señales (payload con cobertura · estructura · rendimiento · autoridad-AEO correctos), del score compuesto (señales nombradas, verificando que NUNCA es un promedio ciego que oculte los ejes), de la detección de cada hueco accionable (falta pillar / faltan supporting / pillar no rankea head / supporting no enlazan / pillar no es la citada), de la degradación honesta por señal (`no_pillar`/`no_audit`/`no_rank`/`no_aeo_data`), y del boundary (cero SQL que una `seo_*` con audit-links / atribución de citas — la composición es en memoria).
- DB/runtime checks: esta task idealmente NO lleva SQL propio (compone readers). Si emerge SQL directo, validarlo contra PG real (gate TASK-893, cuidado DATE vs TIMESTAMPTZ). Ejercer el reader en staging contra un cluster con las 4 señales completas y contra clusters a los que les falta cada señal.
- Integration checks: N/A (sin provider externo).
- Reliability signals/logs: sin signal nueva (read-only); log del path de degradación por señal.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **toca capabilities existentes** (`growth.seo.observation.read` del lado SEO + el gate de lectura AEO de citations/`grader_scores` del lado AEO). Aplica el gate con regla *touch-it/fix-it*:

- [ ] **Lógica en el primitive, no en la UI.** La composición de las 4 señales, el score de topical authority y la detección de huecos viven en `readPillarClusterHealth` + su función pura de score (`src/lib/growth/seo/**`), NUNCA en el componente de la vista de topical authority (follow-up). La UI solo pinta el resultado.
- [ ] **Modelada como reader canónico**, no como fetch acoplado a la pantalla de topical authority.
- [ ] **Read** expuesto como reader canónico con shape + latencia estables (`{ ok }`); sin write (esta task no muta nada), así que el sub-check de command semantics es N/A por diseño.
- [ ] **Capability + grant:** reusa `growth.seo.observation.read` (grant lo seedea TASK-1301) + el gate existente de lectura AEO; verificar que ambos gates aplican y que el coverage test de `growth.seo.observation.read` sigue verde. NO introduce capability nueva.
- [ ] **Camino programático declarado:** reader consumible por la UI de topical authority (follow-up) + Nexa + MCP; la vista es un consumer, no el SoT del diagnóstico.
- [ ] **`propose → confirm → execute`:** N/A (read-only; sin write gobernado).
- [ ] **Un primitive, muchos consumers:** UI, Nexa, MCP leen el mismo reader; cero re-implementación de la composición en la UI.
- [ ] **Parity check = SÍ:** la salud topical / topical authority tiene contrato gobernado (reader por-org, ambos gates) → todos los consumers lo operan por construcción, sin romper el boundary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract + composición boundary-safe de las 4 señales

- `PillarClusterHealthResult` + tipos de las 4 señales en `src/lib/growth/seo/contracts.ts`: `{ ok: true, clusterId, range, coverage: { hasPillar, supportingCount, keywordGaps[] }, structure: { supportingLinkingToPillar, orphanSupporting[] }, performance: { pillarRanksHead, supportingLongTail[] }, aeoAuthority: { pillarIsCited, citedCompetitors[], citedSupporting[] }, topicalAuthorityScore, gaps: [...] } | { ok: false, errorCode, status }`.
- `readPillarClusterHealth({ organizationId, clusterId, range })` en `src/lib/growth/seo/topical-authority/read-pillar-cluster-health.ts`:
  1. Validar `clusterId` pertenece a `organizationId` server-side (vía `readTopicClusterRollup` TASK-1312 → `seo_target_id → organization_id`) + validar `growth.seo.observation.read`. Cluster desconocido → `{ ok: false, errorCode: 'unknown_cluster' }`.
  2. Resolver estructura del cluster vía `readTopicClusterRollup`: `{ pillarUrl, supportingUrls[], keywordSets }`. Sin pillar activo → `{ ok: false, errorCode: 'no_pillar' }` (un cluster sin pillar no tiene topical authority que evaluar).
  3. **Cobertura:** pillar presente + supporting suficientes + huecos temáticos vs keyword gap (`readSiteAuditReport` / rollup). 
  4. **Estructura:** internal linking supporting→pillar vía `readSiteAuditReport` (grafo de enlaces internos del OnPage audit). Sin audit → señal degradada `no_audit` (o reader `no_audit` según diseño).
  5. **Rendimiento:** pillar rankea head-term, supporting rankean long-tail vía `readRankEvolution` / `readClusterVisibility360`. Sin rank → `no_rank`.
  6. **Autoridad-AEO:** ¿la IA cita la pillar, una supporting o un competidor? vía `readUrlCitationAttribution` / `readClusterVisibility360` con ESE `organization_id` + su gate. Sin atribución → `no_aeo_data`.
  7. **Composición en memoria por `organization_id + cluster/url`** — dos+ reads separados, cero JOIN SQL entre `seo_*`, audit-links y la atribución de citas AEO.
- Tests: composición correcta de cada señal, boundary (cero SQL que una las tablas), degradación honesta por señal faltante, gate aplicado, tenant boundary (cluster de otra org rechazado).

### Slice 2 — Topical authority score (señales nombradas, no promedio ciego) + huecos accionables

- Función pura `topical-authority-score.ts`: `(coverage, structure, performance, aeoAuthority) → { score, contributions: { coverage, structure, performance, aeoAuthority }, gaps }`. El score **compone señales nombradas con contribuciones visibles**, NUNCA colapsa SEO+AEO en un número opaco (hereda la disciplina de ejes del clasificador de TASK-1305 — nombrar, no fusionar).
- Detección de huecos accionables desde las señales: `falta pillar` (cubierto por `no_pillar` upstream), `faltan supporting` (cobertura baja), `pillar no rankea head` (rendimiento), `supporting no enlazan al pillar` (estructura / orphan supporting), `pillar no es la citada` (autoridad-AEO: la IA cita competidor/supporting suelta, no la pillar).
- Umbrales documentados (supporting mínimos, head-term rank objetivo, citation share objetivo de la pillar) — parametrizables, NO promediando los ejes.
- Tests: cada hueco desde combinaciones controladas de las 4 señales; verificación de que el score expone las contribuciones por señal (falla si el output es solo un número sin ejes); verificación de que dos verdades (SEO+AEO) nunca colapsan a un score opaco.

### Slice 3 — Evolución temporal del score + huecos

- Extender `readPillarClusterHealth` para servir la **evolución temporal** del topical authority score + los huecos sobre el `range` pedido (la película, no la foto), reusando la dimensión temporal que `readClusterVisibility360` (TASK-1313) / `readRankEvolution` (TASK-1303) ya exponen. Cero materialización — se computa on-read agregando por período.
- Tests: serie temporal correcta del score/huecos sobre el rango; degradación honesta si un período no tiene una señal (no fabricar puntos con `0`).

## Out of Scope

- UI de topical authority / pillar health por cluster (follow-up ui-ux posterior, §15.1).
- Cualquier **captura nueva**: entidad cluster + `role` (TASK-1312), site audit / internal linking (TASK-1304), rank (TASK-1303), atribución de citas (TASK-1311), cruce por cluster (TASK-1313) — son dependencias, NO scope. Esta task **compone**, no captura.
- Materializar la salud del cluster (NO se crea `pillar_cluster_health_snapshots` ni `topical_authority_score_snapshots`; es derived read efímero por diseño).
- Cualquier escritura, cron, provider externo o migración.
- `readClusterVisibility360` (TASK-1313) / `readSeoAeoGap` (TASK-1305) — son hermanos/deps, no se tocan (coexisten).
- Cambios en el motor AEO, en el site audit o en su gate (se reusan tal cual).
- Recomendaciones/CTAs automáticos por hueco (posible recommendation layer follow-up).

## Detailed Spec

Ver el contrato en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` **§15.1** (pillar page + topical authority — la fuente de verdad de esta task), §1.1 (boundary), §2 (matriz mental 360 + señales que se cruzan), §3 (topical authority/cluster gaps = Labs; internal linking = OnPage) y §7 (readers). Puntos load-bearing:

- **"Compone, no captura" ES la task.** El error más caro que un agente puede cometer acá es sentir que necesita "capturar" algo — un nuevo provider call para el keyword gap, una tabla para el internal linking, un materializer para el score. TODO eso ya existe (o pertenece a una dependencia): el keyword gap y el grafo de enlaces internos vienen de `readSiteAuditReport` (TASK-1304, OnPage), el rank de `readRankEvolution` (TASK-1303), las citas de `readUrlCitationAttribution` (TASK-1311), la estructura pillar/supporting de `readTopicClusterRollup` (TASK-1312), y el cruce SEO×AEO por cluster de `readClusterVisibility360` (TASK-1313). Esta task es **puro derived read compositivo**: une esos readers en memoria por `organization_id + cluster/url` y emite el diagnóstico. Cero tabla, cero provider call, cero cron, cero materialización.
- **El boundary §1.1 aplica igual que en TASK-1313, amplificado.** El segundo error más caro es "optimizar" la composición con un `JOIN` SQL entre `seo_rank_snapshots`/`seo_gsc_daily`, `seo_site_audit_findings` (internal linking) y la atribución de citas AEO, o materializar una VIEW `pillar_cluster_health`. Ambos violan §1.1 y acoplan motores que deben permanecer aislados (distintos providers, distinta cadencia, breakers separados). La composición canónica son **readers independientes** (cada uno con su gate/breaker) **unidos en memoria por `organization_id + cluster/url`** (el rollup de TASK-1312 resuelve las URLs pillar/supporting). Como dice §15.1: *"Boundary §1.1 intacto (compone readers, no fusiona)"*. Unir por `url`/`cluster` **NO viola nada**: es un join más rico, no un merge.
- **Cuatro señales nombradas, un score que NO las fusiona.** El twist AEO (¿la pillar es la citada, o la IA cita a un competidor / a una supporting suelta?) es el diferenciador — pero el `topicalAuthorityScore` **compone** cobertura · estructura · rendimiento · autoridad-AEO con contribuciones **visibles**, jamás un promedio ciego que colapse SEO+AEO en un número opaco. "La pillar rankea #1 y la IA cita a un competidor" es un **hueco accionable** (`pillar no es la citada`), no un dato a promediar. El operador debe poder ver *por qué* el cluster tiene la salud que tiene, señal por señal.
- **Degradación honesta por señal.** Un cluster puede tener pillar+supporting con rank pero sin site audit (→ `no_audit` en estructura), o con estructura sin atribución de citas (→ `no_aeo_data` en autoridad-AEO). El reader degrada la señal (o retorna `ok:false` con el errorCode de la señal faltante según diseño), y la UI (follow-up) muestra un empty state accionable por señal, NUNCA un score con ceros que mentiría sobre la autoridad del cluster. Sin pillar activo → `no_pillar` (un cluster sin pillar no tiene topical authority que evaluar).
- **Reuso, no re-implementación.** La estructura reusa `readTopicClusterRollup` (TASK-1312); el rendimiento y la autoridad-AEO reusan `readClusterVisibility360` (TASK-1313) o sus fuentes (`readRankEvolution` TASK-1303 / `readUrlCitationAttribution` TASK-1311); la estructura (internal linking) y la cobertura (keyword gap) reusan `readSiteAuditReport` (TASK-1304). Esta task es principalmente **composición gobernada + una función pura de score**, no SQL nuevo — y si emerge SQL, se valida contra PG real (gate TASK-893).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract + composición boundary-safe de las 4 señales) → Slice 2 (score de señales nombradas + huecos) → Slice 3 (evolución temporal). Slice 2 depende de que las 4 señales de Slice 1 estén disponibles; Slice 3 depende del score de Slice 2. Los tres slices son read-only y aditivos; el orden es de composición, no de riesgo runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente "captura" en vez de componer (nuevo provider call / tabla / materializer para keyword gap, internal linking o score) | growth | medium | regla dura "compone, no captura" documentada + review; toda fuente sale de un reader existente (deps); cero tabla/provider/cron en Files owned | code review |
| Un agente une `seo_*` × audit-links × atribución-citas-AEO con JOIN/VIEW → viola boundary §1.1 | growth | medium | regla dura documentada + test que verifica cero SQL cross-tabla (composición en memoria por `org + cluster/url`) + review | code review + test de boundary |
| Promediar ciegamente las 4 señales en un score opaco → oculta de dónde sale la autoridad | growth | medium | score compone señales nombradas con `contributions` visibles; test que falla si el output es solo un número sin ejes inspeccionables | test + review |
| Ceros fantasma cuando falta una señal (audit/rank/AEO) | data | medium | degradación honesta por señal (`no_pillar`/`no_audit`/`no_rank`/`no_aeo_data`) con `ok:false` o señal degradada; NUNCA `0` | test dedicado |
| Exponer citas/scores AEO de una org ajena por mal binding de `clusterId → organization_id` | growth | low | `clusterId → seo_target_id → organization_id` validado server-side (heredado del rollup) + ambos gates por-org; el lado AEO usa ESE org | test de tenant boundary |
| El internal linking no está en el reader de audit (TASK-1304) → señal de estructura sin fuente | data | medium | `[verificar]` en Discovery que `readSiteAuditReport` expone el grafo de enlaces internos por-URL; si no, la señal de estructura degrada `no_audit` + follow-up al reader de audit | Discovery gate |
| SQL nuevo con `EXTRACT(EPOCH FROM DATE-DATE)` si un reader queryea directo | data | low | preferir reuso de readers (idealmente cero SQL propio); si hay SQL, `capture_date`/`effective_from/to`=DATE / `*_at`=TIMESTAMPTZ validado contra PG real | Sentry + lint rule |

### Feature flags / cutover

- Behind `GROWTH_SEO_ENABLED` (default OFF, ya en el ledger por las tasks previas). Reader read-only sin cutover propio; se habilita cuando el módulo SEO se activa. Ningún consumer lo llama hasta la UI de topical authority follow-up.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (reader read-only, sin efecto persistente) | <5 min | si |
| Slice 2 | revert PR (función pura de score) | <5 min | si |
| Slice 3 | revert PR (reader read-only) | <5 min | si |

### Production verification sequence

1. En staging con `GROWTH_SEO_ENABLED=true`: `readPillarClusterHealth` sobre un cluster de una org con **las 4 señales completas** (pillar + supporting + rank + audit/internal-linking + atribución de citas) → verificar payload con cobertura · estructura · rendimiento · autoridad-AEO + topical authority score con contribuciones por señal + huecos accionables + cero SQL cross-tabla (revisar código / query plan).
2. `readPillarClusterHealth` sobre un cluster **sin pillar activo** → `{ ok: false, errorCode: 'no_pillar' }`, NUNCA score fabricado.
3. Cluster **sin site audit** → señal de estructura `no_audit` (o `ok:false` según diseño), NUNCA "0 supporting enlazan".
4. Cluster **sin rank** → `no_rank`; cluster **sin atribución de citas AEO** → `no_aeo_data` en la señal de autoridad-AEO.
5. Verificar el twist AEO con datos reales: un cluster donde la pillar rankea el head pero la IA cita a un competidor → hueco `pillar no es la citada` presente, score con la contribución de autoridad-AEO baja pero **visible** (no fusionada).
6. Verificar que el binding `clusterId → organization_id` es server-side y que un caller sin gate AEO no ve citas ajenas (degrada honesto `no_aeo_data`).
7. `readPillarClusterHealth` con `range` largo → evolución temporal del score/huecos correcta, sin puntos fabricados con `0`.
8. Prod vía release control plane cuando EPIC-022 se secuencie (read-only, additive).

### Out-of-band coordination required

- Ninguna (read-only; sin provider, sin secret, sin cron, sin migración, sin consent — no gasta cuota DataForSEO ni LLM). Solo confirmar que `growth.seo.observation.read` (TASK-1301), los readers de deps (TASK-1312/1313/1304/1303/1311) y el gate de lectura AEO están vigentes, y **verificar en Discovery que `readSiteAuditReport` expone el grafo de enlaces internos por-URL** (señal de estructura).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `readPillarClusterHealth({ organizationId, clusterId, range })` existe en `src/lib/growth/seo/**`, gateado por `growth.seo.observation.read` + el gate existente de lectura AEO, con shape `{ ok: true, clusterId, range, coverage, structure, performance, aeoAuthority, topicalAuthorityScore, gaps } | { ok: false, errorCode, status }`.
- [ ] **"Compone, no captura" verificado:** cero tabla nueva, cero provider call, cero cron, cero materialización; toda fuente sale de un reader existente (`readTopicClusterRollup` TASK-1312, `readClusterVisibility360` TASK-1313 o sus fuentes, `readSiteAuditReport` TASK-1304, `readRankEvolution` TASK-1303, `readUrlCitationAttribution` TASK-1311).
- [ ] **Boundary duro verificado:** la composición es por `organization_id + cluster/url` con **readers separados unidos en memoria**; CERO JOIN SQL / VIEW / FK entre `seo_*`, el grafo de enlaces internos y la atribución de citas AEO (verificado por test + review).
- [ ] **Cero promedio ciego:** el `topicalAuthorityScore` compone señales nombradas (cobertura · estructura · rendimiento · autoridad-AEO) con contribuciones **visibles** en el payload; NUNCA un número opaco que fusione SEO+AEO.
- [ ] Las 4 señales presentes y correctas: cobertura (pillar + supporting + huecos vs keyword gap), estructura (supporting→pillar internal linking), rendimiento (pillar head-term / supporting long-tail), autoridad-AEO (¿la IA cita la pillar, una supporting o un competidor?), sobre el rango pedido.
- [ ] Huecos accionables detectados: `falta pillar` / `faltan supporting` / `pillar no rankea head` / `supporting no enlazan al pillar` / `pillar no es la citada`.
- [ ] Evolución temporal del score/huecos sobre el `range` (on-read, sin materialización).
- [ ] Degradación honesta por señal: sin pillar → `no_pillar`; sin audit → `no_audit`; sin rank → `no_rank`; sin atribución de citas AEO → `no_aeo_data`; NUNCA `0` ni score fabricado.
- [ ] Reusa `readTopicClusterRollup` (TASK-1312), `readClusterVisibility360` (TASK-1313), `readSiteAuditReport` (TASK-1304), `readRankEvolution` (TASK-1303) y `readUrlCitationAttribution` (TASK-1311); no re-implementa ni duplica autorización.
- [ ] Tenant boundary: `clusterId → seo_target_id → organization_id` server-side; sin fuga de citas/scores AEO de orgs ajenas.
- [ ] Read-only puro: sin escritura, sin migración, sin materialización de la salud del cluster.
- [ ] `GROWTH_SEO_ENABLED` respetado (default OFF).
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes; si hay SQL propio, validado contra PG real (gate TASK-893).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Ejercer `readPillarClusterHealth` en staging contra un cluster con las 4 señales completas, y contra clusters a los que les falta cada señal (sin pillar → `no_pillar`; sin audit → `no_audit`; sin rank → `no_rank`; sin citas AEO → `no_aeo_data`); verificar boundary (cero cross-tabla SQL), score de señales nombradas (contribuciones visibles), huecos accionables, twist AEO y evolución temporal.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (la UI de topical authority follow-up consume este reader; `readClusterVisibility360`/TASK-1313 y `readSeoAeoGap`/TASK-1305 coexisten)
- [ ] documentación técnica del reader de topical authority + del boundary "compone, no captura" (arquitectura del dominio SEO §7 + §15.1)

## Follow-ups

- UI de topical authority / pillar health por cluster (ui-ux) — consume `readPillarClusterHealth` (§15.1 del doc maestro).
- Recommendation layer: convertir los huecos accionables en CTAs cruzados (p. ej. "crea supporting para X" / "enlaza supporting Y a la pillar" / "añade answer capsule para que la IA cite la pillar") — posible task derivada.
- Evaluar exponer el reader como recurso `api/platform/app` explícito para Nexa/MCP si el consumo lo justifica.
- Si el internal linking no está en `readSiteAuditReport` (TASK-1304), follow-up para exponer el grafo de enlaces internos por-URL en el reader de audit.

## Open Questions

1. ¿`readSiteAuditReport` (TASK-1304) expone el **grafo de enlaces internos por-URL** (para la señal de estructura supporting→pillar) o solo findings agregados? Si no lo expone, degradar la señal como `no_audit` + abrir follow-up al reader de audit. Resolver en Discovery.
2. ¿El twist AEO (autoridad-AEO) y el rendimiento se consumen vía `readClusterVisibility360` (TASK-1313) directo, o esta task llama `readUrlCitationAttribution` (TASK-1311) / `readRankEvolution` (TASK-1303) directo para separar pillar (head-term) de supporting (long-tail)? Propuesta: reusar TASK-1313 para el cruce y bajar a las fuentes solo si hace falta la separación head/long-tail. Resolver contra los readers reales en Discovery.
3. ¿La "cobertura" (huecos temáticos vs keyword gap) sale de DataForSEO Labs `keyword_gap` (§3) vía `readSiteAuditReport`/otro reader, o requiere un reader de keyword gap propio? Confirmar la fuente en Discovery; si no existe reader, degradar la señal + follow-up (NO capturar acá).
4. ¿Los umbrales de topical authority (supporting mínimos por cluster, head-term rank objetivo de la pillar, citation share objetivo de la pillar) son fijos documentados o configurables por-org? Propuesta: fijos documentados por defecto para no fragmentar la semántica; revisar con datos reales.
5. ¿Una señal faltante degrada solo esa señal (payload parcial con `ok:true` + señal `unavailable`) o retorna `ok:false` con el errorCode de la señal? Propuesta: `no_pillar` es `ok:false` (sin pillar no hay qué evaluar); audit/rank/AEO faltantes degradan la señal individual manteniendo `ok:true`. Resolver al tomar la task.
