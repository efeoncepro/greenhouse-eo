# TASK-1313 — Growth SEO: Unified Page/Cluster Visibility 360 Read

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
- Blocked by: `TASK-1311, TASK-1312, TASK-1303`
- Branch: `task/TASK-1313-growth-seo-unified-page-cluster-visibility-360-read`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Expone `readPageVisibility360({ organizationId, url, range })` y `readClusterVisibility360({ organizationId, clusterId, range })`: los **derived reads cross-módulo a nivel página/cluster** que, para una landing específica (o un cluster temático completo), devuelven **unificado en el tiempo** lo que el SEO sabe (keywords que rankea, avg position, clicks — vía `readRankEvolution`/`seo_gsc_daily` filtrado por URL) × lo que el AEO sabe (qué grounded queries citan esa URL, citation share, motores — vía `readUrlCitationAttribution` de TASK-1311) + el **quadrant 360 a ESE nivel** (rankeo × citabilidad por página/cluster). Es la **evolución de `readSeoAeoGap`** (TASK-1305) de nivel marca → nivel página/cluster: el mismo principio, un join más rico (`org + url/cluster + keyword`). Y por eso es la task donde el **boundary duro SEO↔AEO** (§1.1 del doc maestro) sigue siendo la regla load-bearing: el cruce se resuelve por `organization_id + url` (o cluster), son **DOS reads separados unidos en memoria**, CERO JOIN/VIEW/FK cross-motor, CERO promedio de las dos métricas, cero merge de tablas. Con degradación honesta por lado (`no_seo_data`/`no_aeo_data`), NUNCA ceros fantasma.

## Why This Task Exists

El 360 no vive solo a nivel marca (§15 del doc maestro): su expresión más potente es **a nivel página y topic cluster**. Para una landing, la pregunta comercial que ninguna herramienta suelta contesta —Semrush ve solo SEO, Profound ve solo IA— es: *"para ESTA URL, ¿qué keywords rankeo y con qué clicks reales, y a la vez qué grounded queries me citan las IA, en qué motores, con qué citation share — y cómo se cruza todo eso en el tiempo?"*. `readSeoAeoGap` (TASK-1305) ya cruza SEO×AEO por `organization_id` a nivel marca; esta task lo **granulariza** a página/cluster reusando el mismo boundary. El riesgo de modelar esto mal es idéntico al de la task hermana pero amplificado por la granularidad: la tentación de unir `seo_rank_snapshots`/`seo_gsc_daily` con la atribución de citas AEO por `url` mediante un JOIN SQL, o de materializar una VIEW `page_visibility_360`, **corrompe las dos verdades** (distintos providers, distinta cadencia, distinta unidad). Esta task fija el cruce granular como **derived read gobernado por el boundary** — un join más rico, no un merge — para que la futura UI de análisis granular por landing/cluster consuma un contrato honesto en vez de re-inventar el join y romper el aislamiento entre motores.

## Goal

- `readPageVisibility360({ organizationId, url, range })` y `readClusterVisibility360({ organizationId, clusterId, range })` en `src/lib/growth/seo/**`: derived reads que unen, en el tiempo, el lado SEO (rank/GSC por URL) × el lado AEO (citation attribution por URL) **por `organization_id + url` (o cluster)**, NUNCA FK/merge.
- Payload unificado por página/cluster: `{ keywords[], avgPosition, clicks, groundedQueries[] (que citan la URL/cluster), citationShare, engines[], quadrant360 }` sobre el rango pedido.
- **Quadrant 360 granular** por página/cluster: `{ quadrant: 'dominante'|'riesgo'|'oportunidad'|'invisible', ... }` (rankeo × citabilidad a ESE nivel), reusando el clasificador ortogonal de `readSeoAeoGap` (TASK-1305), NUNCA un promedio.
- Degradación honesta por lado: URL/cluster sin rank/GSC → `no_seo_data`; sin atribución de citas AEO → `no_aeo_data`; NUNCA ceros fantasma ni promedios.
- Gate de acceso: `growth.seo.observation.read` (touch-it) + reuso del gate existente de lectura AEO (citations/`grader_scores`), sin duplicar lógica de autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§15 (Granularidad URL / Topic Cluster — la fuente de verdad de esta extensión: qué ya existe, qué falta, y "boundary intacto: join más rico, sin merge de tablas")**, **§1.1 (boundary duro NUNCA/SIEMPRE — la regla load-bearing)**, §2 (complementariedad SEO↔AEO + matriz mental 360 + las 4 señales), §7 (readers como derived read cross-módulo, result shape `{ ok }`).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — modelo del AEO: `grader_profiles → grader_runs (reportable) → grader_scores`, y las citas por observación (`GrowthAiVisibilityCitation`, prompt = grounded query) que TASK-1311 atribuye por URL.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — reader como primitive canónico consumible por UI + Nexa + MCP.
- `CLAUDE.md §"SQL Signal Reader Schema Validation Gate"` — validar cualquier SQL propio contra PG real; `capture_date`=DATE, `*_at`=TIMESTAMPTZ.

Reglas obligatorias (§1.1 + §15 — **boundary duro, load-bearing**):

- **NUNCA computar citabilidad AEO desde rank SEO ni viceversa.** Son verdades independientes de providers distintos, aun a nivel URL.
- **NUNCA mergear tablas `grader_*`/atribución-de-citas con `seo_*` (`seo_rank_snapshots`/`seo_gsc_daily`).** Cero FK cross-motor. El cruce granular es una **operación en memoria** sobre dos reads separados, unidos por `organization_id + url` (o cluster).
- **NUNCA promediar las dos métricas** en un número único. El quadrant granular mantiene los dos ejes ortogonales (rankeo por URL en un eje, citabilidad por URL en el otro); jamás los colapsa.
- **NUNCA reconciliar** "esta URL rankea #1 y 0 IA la cita" como un bug. Es una **señal** granular del producto, se reporta como tal.
- **SIEMPRE** exponer el cruce como **derived read (report layer)** — un join más rico (`org + url/cluster + keyword`), NUNCA una VIEW/tabla `page_visibility_360` materializada.
- **SIEMPRE** degradar honesto si falta una fuente por URL/cluster (`no_seo_data`/`no_aeo_data`), NUNCA rellenar con `0`.

## Normative Docs

- `docs/tasks/to-do/TASK-1305-growth-seo-aeo-gap-derived-read.md` — **task hermana directa**: `readSeoAeoGap` (nivel marca). Esta task copia su estructura y reusa su clasificador quadrant ortogonal + su patrón de "dos reads separados unidos en memoria"; solo cambia la granularidad de `organization_id` → `organization_id + url` (o cluster).
- `docs/tasks/to-do/TASK-1311-growth-seo-aeo-citation-attribution-url-grounded-queries.md` — provee `readUrlCitationAttribution` (citas atribuidas a la URL + grounded queries + engine + citation share). Es el **lado AEO** del cruce granular. [verificar shape final del reader al tomar la task].
- `docs/tasks/to-do/TASK-1312-growth-seo-topic-cluster-entity-rollup.md` — provee `seo_topic_clusters` (URLs + keyword sets por tema) + rollup reader. Resuelve `clusterId → { urls[], keywordSets }` para `readClusterVisibility360`. [verificar shape del rollup reader].
- `docs/tasks/to-do/TASK-1303-growth-seo-rank-capture-evolution-reader.md` — provee `readRankEvolution(targetId, {keywords, range, engine, device})` sobre `seo_rank_snapshots` (con `url`) + el mirror BQ. Es el **lado SEO** del cruce granular (rank por URL). [verificar filtro por URL].
- `docs/tasks/to-do/TASK-1302-growth-seo-gsc-daily-snapshot-materializer.md` — provee `seo_gsc_daily` (`query × page`, append-only por `capture_date`), fuente de clicks/impresiones/posición por URL. [verificar campo `page`/`url`].
- `src/lib/growth/search-console/contracts.ts` — patrón result shape `{ ok: true, ... } | { ok: false, errorCode }` a espejar. [verificar path exacto].
- `src/lib/growth/ai-visibility/store.ts` (`listOperatorCrossOrgAeoScores`) — patrón canónico de degradación honesta AEO (`null`, NUNCA `0`) reusado por el lado AEO.

## Dependencies & Impact

### Depends on

- `TASK-1311` — `readUrlCitationAttribution` (citas atribuidas por URL + grounded queries + citation share + engines). Bloqueador duro (sin atribución por URL no hay eje AEO granular).
- `TASK-1312` — `seo_topic_clusters` + rollup reader que resuelve `clusterId → { urls[], keywordSets }`. Bloqueador duro de `readClusterVisibility360` (sin la entidad cluster no hay agregación por cluster).
- `TASK-1303` — `readRankEvolution` (rank por URL sobre `seo_rank_snapshots`) + mirror BQ. Bloqueador duro (sin rank por URL no hay eje SEO granular).
- `TASK-1302` — `seo_gsc_daily` (`query × page`) para clicks/impresiones/posición por URL. Implícito (lo consume el reader) [verificar reader de lectura de `seo_gsc_daily`].
- `TASK-1301` — capability `growth.seo.observation.read` + entitlement per-org (gate del lado SEO). Implícito (lo consume el reader) [verificar seed].
- Motor AEO existente (`grader_*` + citations) — reusado por `organization_id`, ya en producción.

### Blocks / Impacts

- Habilita la **UI de análisis granular por landing/cluster** (follow-up ui-ux posterior, §15 del doc maestro) — consume `readPageVisibility360`/`readClusterVisibility360`.
- Es el contrato que hace real el diferenciador más fuerte del producto (§15): el 360 a nivel página/cluster que ninguna herramienta suelta (Semrush/Profound) da.
- Complementa `readSeoAeoGap` (TASK-1305, nivel marca): mismo boundary, granularidad distinta; ambos coexisten sin fusionarse.

### Files owned

- `src/lib/growth/seo/visibility-360/read-page-visibility-360.ts` [nuevo — `readPageVisibility360`]
- `src/lib/growth/seo/visibility-360/read-cluster-visibility-360.ts` [nuevo — `readClusterVisibility360`]
- `src/lib/growth/seo/contracts.ts` [extendido — `PageVisibility360Result`, `ClusterVisibility360Result`, tipos del payload granular] [verificar path]
- `src/lib/growth/seo/visibility-360/__tests__/read-page-visibility-360.test.ts` [nuevo]
- `src/lib/growth/seo/visibility-360/__tests__/read-cluster-visibility-360.test.ts` [nuevo]

## Current Repo State

### Already exists

- **SEO por URL** (post TASK-1302/1303): `seo_rank_snapshots` (`position` + `url`), `seo_gsc_daily` (`query × page`), `readRankEvolution` (ya filtra por URL). Keywords/avg-position/clicks por landing = cubierto por readers existentes. [verificar tras cierre de deps].
- **AEO cita-por-URL** (post TASK-1311): `readUrlCitationAttribution` filtra citas al dominio propio, mapea a la URL específica, agrupa por grounded query (prompt) + engine + tiempo + citation share. La captura ya existe hoy (`GrowthAiVisibilityCitation` + `buildCitations`/`extractCitationDomain` + adapter AI-mode); TASK-1311 la expone como reader.
- **Cluster** (post TASK-1312): `seo_topic_clusters` (URLs + keyword sets por tema) + rollup reader.
- **Patrón hermano** (TASK-1305): `readSeoAeoGap` — el cruce SEO×AEO por `organization_id` con dos reads separados + clasificador quadrant ortogonal + degradación honesta. Este reader reusa ese patrón, cambiando el ancla del cruce a `org + url/cluster`.
- Patrón de result shape `{ ok }` (Search Console reader) y de reader gobernado por capability + org.

### Gap

- No existe ningún cruce SEO↔AEO **a nivel página/cluster**. `readSeoAeoGap` (TASK-1305) resuelve el 360 a nivel marca, pero nadie une rank/GSC por URL × atribución de citas por URL en un payload unificado en el tiempo, ni produce el quadrant 360 granular. La futura UI de análisis por landing/cluster no tiene contrato del cual leer.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (derived read cross-módulo granular, read-only, sin persistencia nueva)
- Source of truth afectado: NINGUNO nuevo. Lee `seo_rank_snapshots` + `seo_gsc_daily` (SoT SEO, vía readers) + la atribución de citas AEO (SoT AEO, vía `readUrlCitationAttribution`) + `seo_topic_clusters` (para cluster); el cruce es efímero (en memoria), NO se materializa.
- Consumidores afectados: futura UI de análisis granular por landing/cluster (§15), Nexa/MCP.
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: boundary SEO↔AEO (§1.1 + §15), readers SEO (`readRankEvolution` TASK-1303, lectura de `seo_gsc_daily` TASK-1302), reader AEO (`readUrlCitationAttribution` TASK-1311), rollup de cluster (TASK-1312), clasificador quadrant ortogonal (`readSeoAeoGap` TASK-1305), result shape `{ ok }`, gate `growth.seo.observation.read` + gate existente de lectura AEO.
- Contrato nuevo o modificado: `readPageVisibility360({ organizationId, url, range })` y `readClusterVisibility360({ organizationId, clusterId, range })` → `{ ok: true, keywords, avgPosition, clicks, groundedQueries, citationShare, engines, quadrant360, seoLens, aeoLens } | { ok: false, errorCode: 'no_seo_data'|'no_aeo_data'|'unknown_target'|'unknown_cluster'|'disabled'|'forbidden'|'query_failed', status }`. Sin nuevo endpoint/tabla obligatorio en esta task (los readers los consume la UI follow-up).
- Backward compatibility: `compatible` (readers additive, read-only, cero cambio en schema/consumers existentes; gated por `GROWTH_SEO_ENABLED`).
- Full API parity: readers canónicos en `src/lib/growth/seo/**`, un primitive por granularidad, muchos consumers (UI + Nexa + MCP). Ver `## Capability Definition of Done` (touch-it de capability existente).

### Data model and invariants

- Entidades/tablas/views afectadas (SOLO lectura, sin escritura): `greenhouse_growth.seo_rank_snapshots` + `greenhouse_growth.seo_gsc_daily` (vía readers SEO), la atribución de citas AEO (vía `readUrlCitationAttribution` — JSONB `provider_observations` o tabla normalizada según TASK-1311), `greenhouse_growth.seo_topic_clusters` (vía rollup TASK-1312), `greenhouse_growth.grader_*` (indirecto, vía el reader AEO), `greenhouse_core.organizations` (ancla del cruce).
- Invariantes que no se pueden romper (**boundary, load-bearing**):
  - El cruce se resuelve por `organization_id + url` (o cluster) — el `organizationId` + la `url` (o el `clusterId → urls[]`) anclan **dos reads separados unidos en memoria**. Cero JOIN SQL entre `seo_*` y la atribución de citas AEO; cero VIEW/tabla que mergee ambos motores.
  - Cero FK cross-motor. `readClusterVisibility360` resuelve `clusterId → { urls[], keywordSets }` vía el rollup de cluster (TASK-1312) y luego agrega los dos lados por esas URLs en memoria; no cruza tablas por SQL.
  - Cero promedio/número único: los dos ejes (rankeo por URL, citabilidad por URL) se mantienen ortogonales en el quadrant granular.
  - Derived read efímero: NO se materializa el resultado (no hay `page_visibility_360_snapshots`); es report layer, se computa on-read.
  - Degradación honesta granular: URL/cluster sin rank/GSC → `no_seo_data`; sin atribución de citas AEO → `no_aeo_data`; NUNCA `0` ni payload fabricado.
  - Cero escritura, cero payroll/finance.
- Tenant/space boundary: `url`/`clusterId` se validan pertenecientes a `organizationId` server-side (la URL debe caer bajo un `seo_target` de esa org; el cluster debe pertenecer a un target de esa org). El lado AEO se lee con ESE `organization_id` (no con otro). Ambos gates de acceso (SEO + AEO) se validan; un caller con acceso SEO pero sin acceso a las citas AEO de esa org degrada honesto, no expone datos AEO ajenos.
- Idempotency/concurrency: N/A (read-only puro, sin write, sin lock).
- Audit/outbox/history: N/A (read-only; sin outbox). La observabilidad es logging + `captureWithDomain` en el catch.

### Migration, backfill and rollout

- Migration posture: `none` (readers puros; sin schema, sin migración, sin backfill — las tablas las crean las deps).
- Default state: `flag OFF` (`GROWTH_SEO_ENABLED`); los readers existen pero ningún consumer los llama hasta la UI granular follow-up.
- Backfill plan: N/A.
- Rollback path: revert PR (read-only, sin efecto persistente).
- External coordination: ninguna (sin provider, sin secret, sin cron, sin cutover).

### Security and access

- Auth/access gate: `growth.seo.observation.read` (lado SEO) + el gate existente de lectura AEO (citations/`grader_scores`, lado AEO) — reusar, NO duplicar autorización. Ambos por-org (`module_assignments`), no por rol.
- Sensitive data posture: sin PII, sin secretos, sin finance. Métricas SEO + citas/scores AEO de la propia org.
- Error contract: `{ ok: false, errorCode, status }` canónico (es-CL en la UI); errores capturados con `captureWithDomain(err, 'growth'|'ai', ...)`, NUNCA raw error al cliente ni `Sentry.captureException` directo.
- Abuse/rate-limit posture: N/A adicional (read-only sobre snapshots ya materializados; sin call a provider externo — no gasta cuota DataForSEO ni LLM).

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit tests del cruce granular (payload unificado por URL/cluster correcto), del quadrant granular por combinación rank×cita, de la degradación honesta (falta SEO → `no_seo_data`; falta AEO → `no_aeo_data`), y de que el resultado NUNCA promedia ni fabrica `0`. Test de boundary (cero SQL que una `seo_*` con la atribución de citas).
- DB/runtime checks: si algún reader lleva SQL propio (más allá de reusar readers de deps), validarlo contra PG real (gate TASK-893, cuidado DATE vs TIMESTAMPTZ). Ejercer ambos readers en staging contra una org con ambos lados y contra una org con solo uno.
- Integration checks: N/A (sin provider externo).
- Reliability signals/logs: sin signal nueva (read-only); log del path de degradación.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **toca capabilities existentes** (`growth.seo.observation.read` del lado SEO + el gate de lectura AEO de citations/`grader_scores` del lado AEO). Aplica el gate con regla *touch-it/fix-it*:

- [ ] **Lógica en el primitive, no en la UI.** El cruce granular y la clasificación quadrant viven en `readPageVisibility360`/`readClusterVisibility360` (`src/lib/growth/seo/**`), NUNCA en el componente de la vista granular (follow-up). La UI solo pinta el resultado.
- [ ] **Modelada como reader canónico**, no como fetch acoplado a la pantalla granular.
- [ ] **Read** expuesto como reader canónico con shape + latencia estables (`{ ok }`); sin write (esta task no muta nada), así que el sub-check de command semantics es N/A por diseño.
- [ ] **Capability + grant:** reusa `growth.seo.observation.read` (grant lo seedea TASK-1301) + el gate existente de lectura AEO; verificar que ambos gates aplican y que el coverage test de `growth.seo.observation.read` sigue verde. NO introduce capability nueva.
- [ ] **Camino programático declarado:** readers consumibles por la UI granular (follow-up) + Nexa + MCP; la vista granular es un consumer, no el SoT del cruce.
- [ ] **`propose → confirm → execute`:** N/A (read-only; sin write gobernado).
- [ ] **Un primitive, muchos consumers:** UI, Nexa, MCP leen los mismos readers; cero re-implementación del join en la UI.
- [ ] **Parity check = SÍ:** el cruce SEO↔AEO granular tiene contrato gobernado (readers por-org, ambos gates) → todos los consumers lo operan por construcción, sin romper el boundary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Page-level contract + boundary-safe cross read

- `PageVisibility360Result` + tipos del payload granular en `src/lib/growth/seo/contracts.ts`: `{ ok: true, url, range, keywords: [{ keyword, avgPosition, clicks }], avgPosition, clicks, groundedQueries: [{ query, engines, citationShare }], citationShare, engines, quadrant360, seoLens, aeoLens } | { ok: false, errorCode, status }`.
- `readPageVisibility360({ organizationId, url, range })` en `src/lib/growth/seo/visibility-360/read-page-visibility-360.ts`:
  1. Validar `url` pertenece a un `seo_target` de `organizationId` server-side + validar `growth.seo.observation.read`.
  2. **Lado SEO:** rank por URL vía `readRankEvolution` (TASK-1303, filtrado por URL) + clicks/impresiones/posición por URL vía lectura de `seo_gsc_daily` (TASK-1302). Si vacío → `{ ok: false, errorCode: 'no_seo_data' }`.
  3. **Lado AEO:** con ESE `organization_id`, atribución de citas para esa URL vía `readUrlCitationAttribution` (TASK-1311, grounded queries + engines + citation share) + su gate. Si sin atribución → `{ ok: false, errorCode: 'no_aeo_data' }`.
  4. **Cruce en memoria por `organization_id + url`** — dos reads separados, cero JOIN SQL entre `seo_*` y la atribución de citas AEO.
- Tests: boundary (cero SQL que una las tablas), degradación honesta por lado faltante, gate aplicado, tenant boundary (URL de otra org rechazada).

### Slice 2 — Quadrant 360 granular (reuso del clasificador de TASK-1305)

- Reusar el clasificador puro ortogonal de `readSeoAeoGap` (TASK-1305): `(rankPosition, aeoScore|citationShare) → quadrant` (`dominante`/`riesgo`/`oportunidad`/`invisible`) aplicado a ESE nivel de URL. NO re-implementar la clasificación; extraer/compartir el clasificador si TASK-1305 lo dejó feature-local. [verificar dónde vive el clasificador tras TASK-1305].
- Umbrales de "alto/bajo" reusados de TASK-1305 (rank top-N; citation share/score AEO ≥ umbral documentado), NUNCA promediando los dos ejes.
- Tests: cada uno de los 4 quadrants por URL desde combinaciones controladas; verificación de que dos métricas ortogonales nunca colapsan a un número.

### Slice 3 — Cluster-level read (fan-out por URLs del cluster + rollup)

- `ClusterVisibility360Result` en `contracts.ts` (mismo shape que page, más `clusterId` + `urls[]` agregadas).
- `readClusterVisibility360({ organizationId, clusterId, range })` en `src/lib/growth/seo/visibility-360/read-cluster-visibility-360.ts`:
  1. Resolver `clusterId → { urls[], keywordSets }` vía el rollup de cluster (TASK-1312) + validar que el cluster pertenece a un target de `organizationId` + `growth.seo.observation.read`. Cluster desconocido → `{ ok: false, errorCode: 'unknown_cluster' }`.
  2. Agregar el lado SEO y el lado AEO **sobre esas URLs**, unidos en memoria por `organization_id + url`; roll-up de keywords/avg position/clicks (SEO) + grounded queries/citation share/engines (AEO) al nivel cluster.
  3. Quadrant 360 del cluster con el mismo clasificador ortogonal.
  4. Degradación honesta: cluster sin ninguna URL con datos SEO → `no_seo_data`; sin atribución AEO en ninguna URL → `no_aeo_data`.
- Tests: rollup correcto sobre múltiples URLs; boundary (agregación en memoria, cero merge SQL cross-motor); degradación honesta a nivel cluster.

## Out of Scope

- UI de análisis granular por landing/cluster (follow-up ui-ux posterior, §15).
- Materializar el 360 granular (NO se crea `page_visibility_360_snapshots`; es derived read efímero por diseño).
- Cualquier escritura, cron o provider externo.
- Captura de rank / atribución de citas / entidad cluster — son dependencias (TASK-1303/1311/1312), no scope.
- `readSeoAeoGap` a nivel marca (TASK-1305) — es el hermano, no se toca (coexiste).
- Cambios en el motor AEO o su gate (se reusa tal cual).
- `readKeywordOpportunities` (join SEO↔GSC, TASK-1302) — es otro cruce.

## Detailed Spec

Ver el contrato en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` **§15** (granularidad URL/cluster — la fuente de verdad de esta extensión), §1.1 (boundary), §2 (matriz mental 360) y §7 (readers). Puntos load-bearing:

- **El boundary ES la task (igual que TASK-1305, amplificado por la granularidad).** El error más caro que un agente puede cometer acá es "optimizar" el cruce con un `JOIN` SQL entre `seo_rank_snapshots`/`seo_gsc_daily` y la atribución de citas AEO por `url`, o materializar una VIEW `page_visibility_360`. Ambos violan §1.1 y acoplan dos motores que deben permanecer aislados (distintos providers, distinta cadencia, breakers separados). El cruce canónico son **dos reads independientes** (uno por motor, cada uno con su gate) **unidos en memoria por `organization_id + url`** (o, para cluster, por el conjunto de URLs que el rollup de TASK-1312 resuelve). Como dice §15: *"sigue siendo un derived read con join más rico (`org + url + keyword/cluster`), sin merge de tablas ni fusión de scoring — el boundary §1.1 aplica igual"*. Juntar por `url` **NO viola nada**: es un join más rico, no un merge.
- **Es la evolución de `readSeoAeoGap`, no un reemplazo.** TASK-1305 responde el 360 a nivel marca (`organization_id`); esta task lo granulariza a página/cluster (`organization_id + url/cluster`). Mismo principio, misma degradación honesta, mismo clasificador ortogonal — solo cambia el ancla del cruce. Reusa el clasificador quadrant de TASK-1305; no lo re-inventa.
- **Dos verdades, dos ejes, a nivel URL.** El quadrant granular es una matriz 2×2 por página/cluster: eje X = rankeo (SEO, posición por URL), eje Y = citabilidad (AEO, citation share por URL). NUNCA se colapsan a un score combinado. "Esta URL rankea #1 y 0 IA la cita" es una celda (`riesgo`), no un dato a reconciliar.
- **Degradación honesta granular.** Una URL puede tener rank/GSC sin atribución de citas (nunca la citó una IA) o citas sin rank (entidad reconocida sin ranking clásico). El reader devuelve `no_aeo_data` / `no_seo_data` explícito con `ok: false`, y la UI (follow-up) muestra un empty state accionable, NUNCA un payload con ceros que mentiría.
- **Reuso, no re-implementación.** El lado SEO reusa `readRankEvolution` (TASK-1303) + lectura de `seo_gsc_daily` (TASK-1302); el lado AEO reusa `readUrlCitationAttribution` (TASK-1311); el cluster reusa el rollup (TASK-1312); el quadrant reusa el clasificador (TASK-1305). Esta task es principalmente **composición gobernada**, no SQL nuevo — y si emerge SQL, se valida contra PG real (gate TASK-893).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (page contract + cross read boundary-safe) → Slice 2 (quadrant granular reusando el clasificador) → Slice 3 (cluster read, fan-out por URLs). Slice 3 depende de que el fan-out por URL de Slice 1 esté probado. Los tres slices son read-only y aditivos; el orden es de composición, no de riesgo runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente une `seo_*` × atribución-citas-AEO con JOIN/VIEW por `url` → viola boundary §1.1 | growth | medium | regla dura documentada + test que verifica cero SQL cross-tabla (cruce en memoria por `organization_id + url`) + review | code review + test de boundary |
| Promediar rank+cita en un score único por URL → corrompe las dos verdades | growth | medium | quadrant 2×2 ortogonal reusado de TASK-1305; test que falla si el output es un número combinado | test + review |
| Ceros fantasma cuando falta una fuente por URL/cluster | data | medium | degradación honesta `no_seo_data`/`no_aeo_data` con `ok:false`; NUNCA `0` | test dedicado |
| Exponer citas/scores AEO de una org ajena por mal binding de `url`/`clusterId` → `organization_id` | growth | low | `url`/`clusterId → organization_id` validado server-side + ambos gates por-org; el lado AEO usa ESE org | test de tenant boundary |
| Re-implementar el clasificador quadrant en vez de reusar el de TASK-1305 → drift de umbrales | growth | medium | extraer/compartir el clasificador; test que compara la clasificación granular contra la de marca | review + test |
| SQL nuevo con `EXTRACT(EPOCH FROM DATE-DATE)` si un reader queryea directo | data | low | preferir reuso de readers; si hay SQL, `capture_date`=DATE/`*_at`=TIMESTAMPTZ validado contra PG real | Sentry + lint rule |

### Feature flags / cutover

- Behind `GROWTH_SEO_ENABLED` (default OFF, ya en el ledger por las tasks previas). Readers read-only sin cutover propio; se habilitan cuando el módulo SEO se activa. Ningún consumer los llama hasta la UI granular follow-up.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (reader read-only, sin efecto persistente) | <5 min | si |
| Slice 2 | revert PR (reuso de clasificador puro) | <5 min | si |
| Slice 3 | revert PR (reader read-only) | <5 min | si |

### Production verification sequence

1. En staging con `GROWTH_SEO_ENABLED=true`: `readPageVisibility360` sobre una URL de una org con **ambos** lados (rank/GSC + atribución de citas) → verificar payload unificado (keywords · avg position · clicks · grounded queries · citation share · engines · quadrant) + cero SQL cross-tabla (revisar código / query plan).
2. `readPageVisibility360` sobre una URL con **solo SEO** (sin citas AEO) → `{ ok: false, errorCode: 'no_aeo_data' }`, NUNCA ceros.
3. `readPageVisibility360` sobre una URL con **solo AEO** (sin rank/GSC) → `{ ok: false, errorCode: 'no_seo_data' }`.
4. `readClusterVisibility360` sobre un cluster con varias URLs → verificar roll-up correcto sobre las URLs + quadrant del cluster; cluster desconocido → `unknown_cluster`.
5. Verificar que el binding `url`/`clusterId → organization_id` es server-side y que un caller sin gate AEO no ve citas ajenas (degrada honesto).
6. Verificar los 4 quadrants granulares desde datos reales, consistentes con el clasificador de `readSeoAeoGap` (TASK-1305).
7. Prod vía release control plane cuando EPIC-022 se secuencie (read-only, additive).

### Out-of-band coordination required

- Ninguna (read-only; sin provider, sin secret, sin cron, sin migración, sin consent). Solo confirmar que `growth.seo.observation.read` (TASK-1301), los readers de deps (TASK-1303/1311/1312/1302) y el gate de lectura AEO están vigentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `readPageVisibility360({ organizationId, url, range })` y `readClusterVisibility360({ organizationId, clusterId, range })` existen en `src/lib/growth/seo/**`, gateados por `growth.seo.observation.read` + el gate existente de lectura AEO, con shape `{ ok: true, keywords, avgPosition, clicks, groundedQueries, citationShare, engines, quadrant360, seoLens, aeoLens } | { ok: false, errorCode, status }`.
- [ ] **Boundary duro verificado:** el cruce es por `organization_id + url` (o cluster) con **dos reads separados unidos en memoria**; CERO JOIN SQL / VIEW / FK entre `seo_*` y la atribución de citas AEO (verificado por test + review). Juntar por `url` es un join más rico, no un merge.
- [ ] **Cero promedio:** los dos ejes (rankeo por URL, citabilidad por URL) se mantienen ortogonales en la matriz quadrant granular; NUNCA un score combinado único.
- [ ] Payload unificado por página/cluster: keywords · avg position · clicks (SEO) × grounded queries · citation share · engines (AEO), sobre el rango pedido, en el tiempo.
- [ ] Quadrant 360 granular clasifica los 4 estados (`dominante`/`riesgo`/`oportunidad`/`invisible`) por URL/cluster **reusando el clasificador de `readSeoAeoGap` (TASK-1305)**, no re-implementándolo.
- [ ] Degradación honesta granular: URL/cluster sin rank/GSC → `no_seo_data`; sin atribución de citas AEO → `no_aeo_data`; NUNCA `0` ni payload fabricado.
- [ ] Reusa `readRankEvolution` (TASK-1303), lectura de `seo_gsc_daily` (TASK-1302), `readUrlCitationAttribution` (TASK-1311), el rollup de cluster (TASK-1312) y el clasificador (TASK-1305); no re-implementa ni duplica autorización.
- [ ] Tenant boundary: `url`/`clusterId → organization_id` server-side; sin fuga de citas/scores AEO de orgs ajenas.
- [ ] Read-only puro: sin escritura, sin migración, sin materialización del 360 granular.
- [ ] `GROWTH_SEO_ENABLED` respetado (default OFF).
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes; si hay SQL propio, validado contra PG real (gate TASK-893).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Ejercer `readPageVisibility360`/`readClusterVisibility360` en staging contra una org con ambos lados, una con solo SEO y una con solo AEO; verificar boundary (cero cross-tabla SQL), payload unificado, quadrant granular correcto y degradación honesta.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (la UI granular follow-up consume estos readers; `readSeoAeoGap`/TASK-1305 coexiste)
- [ ] documentación técnica del boundary SEO↔AEO granular + del derived read (arquitectura del dominio SEO §7 + §15)

## Follow-ups

- UI de análisis granular por landing/cluster (ui-ux) — consume `readPageVisibility360`/`readClusterVisibility360` (§15 del doc maestro).
- Evaluar exponer los readers como recurso `api/platform/app` explícito para Nexa/MCP si el consumo lo justifica.
- Definir si las señales cruzadas granulares generan recomendaciones accionables por URL (CTA cruzado AEO↔SEO) — posible task de recommendation layer.

## Open Questions

1. ¿El shape final de `readUrlCitationAttribution` (TASK-1311) expone citation share por-URL directo o requiere agregación acá? Resolver contra el reader real de TASK-1311 en Discovery.
2. ¿El rollup de cluster (TASK-1312) devuelve las URLs + keyword sets en un shape consumible directo por el fan-out, o hay que resolver membership aparte? Confirmar en Discovery.
3. ¿El clasificador quadrant de TASK-1305 quedó feature-local o compartible? Si local, extraerlo a un módulo compartido (`src/lib/growth/seo/**`) para reuso sin drift de umbrales. Resolver al tomar la task.
4. ¿Los umbrales de "rankeo alto/bajo" y "citabilidad alta/baja" a nivel URL son idénticos a los de marca (TASK-1305) o requieren calibración granular? Propuesta: idénticos por defecto para no fragmentar la semántica; revisar con datos reales.
