# TASK-1311 — Growth SEO: AEO Citation Attribution URL-level + Grounded Queries

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
- Blocked by: `TASK-1299`
- Branch: `task/TASK-1311-growth-seo-aeo-citation-attribution-url-grounded-queries`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Expone `readUrlCitationAttribution({ organizationId, domain, url?, range })`: la **capa de atribución/lectura** que responde, a nivel **URL específica** y en el tiempo, *"¿qué grounded queries (prompts) citaron ESTA página, en qué motores, y con qué citation share?"*. **Punto load-bearing que un agente NO puede malentender: la CAPTURA de citas con URL YA EXISTE en el grader AEO — esta task NO captura nada nuevo.** El grader ya persiste cada cita (`url`, `domain`, `title`, `sourceType`) en `greenhouse_growth.provider_observations.citations` (JSONB, append-only), normalizada por `buildCitations`/`buildCitation`/`extractCitationDomain` (`observation.ts`) y parseada de `references`/`links`/`sources` de DataForSEO por `collectCitationCandidates` (`providers/google-ai-overview-adapter.ts`). Cada observación es **por prompt → el prompt ES el grounded query**. Esta task agrega solo dos cosas encima de esa evidencia ya existente: **(a)** confirmar/asegurar que las citas sean **queryable históricamente** (decisión Discovery: seguir sobre el JSONB de `provider_observations` con un reader de agregación, o proyectar a una tabla normalizada `grader_citation_observations` si el shape del JSONB no soporta bien el `GROUP BY url/query/engine/time`); **(b)** el reader `readUrlCitationAttribution` que filtra las citas cuyo `domain` = el dominio propio de la org → las mapea a la **URL específica** → las agrupa por **grounded query (prompt) + engine + `capture time`** → calcula **citation share**. Con **degradación honesta** si la org no tiene runs reportables. Vive del lado **AEO/grader** (§1.1); el cruce SEO↔AEO por URL lo hace TASK-1313, no esta task.

## Why This Task Exists

El AEO Grader dice *si* la IA cita a la marca; §15 del doc maestro sube la resolución de **marca → página/cluster**: para una landing concreta el sistema debe responder, en el tiempo, *qué grounded queries la citan y en qué motores* — el diferenciador más fuerte del producto (Semrush = solo SEO, Profound = solo IA; ninguno da cita-por-URL cruzada). La evidencia para responder eso **ya está capturada** (cada `provider_observations` trae sus `citations` con `url`), pero **hoy nadie la lee atribuida a la URL propia ni agregada por grounded query**: el motor AEO la consume a nivel run/dominio (score, dimensions), no a nivel URL. Sin esta capa de atribución, `readPageVisibility360` (TASK-1313) no tiene de dónde leer el eje AEO por-página, y el valor comercial del "360 granular" (§15) queda inaccesible aunque el dato exista. Esta task convierte evidencia ya persistida en un **reader gobernado de atribución URL-level**, sin re-capturar ni tocar el scoring.

## Goal

- `readUrlCitationAttribution({ organizationId, domain, url?, range })` en `src/lib/growth/ai-visibility/**` [verificar módulo exacto en Discovery]: reader que atribuye las citas ya capturadas al dominio propio → URL → agrupa por grounded query (prompt) + engine + tiempo + citation share.
- Confirmar/asegurar persistencia **queryable**: decidir en Discovery entre reader de agregación sobre `provider_observations.citations` (JSONB) vs proyección normalizada `grader_citation_observations` si el JSONB no soporta bien el rollup; documentar la decisión.
- Degradación honesta: org sin grader run reportable → `{ ok: false, errorCode: 'no_aeo_data', status }`, NUNCA citas fabricadas ni ceros fantasma.
- Reuso del gate existente `growth.ai_visibility.observation.read` (touch-it), sin duplicar autorización ni tocar el scoring.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§15 (Granularidad URL / Topic Cluster — la fuente de verdad de esta extensión; declara explícito "la CAPTURA ya existe", esto es reader/rollup)**, **§1.1 (boundary duro NUNCA/SIEMPRE — esta task vive del lado AEO, el cruce SEO↔AEO es TASK-1313)**, §2 (complementariedad + las 4 señales que se cruzan).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — modelo del motor AEO: `grader_profiles → grader_runs (reportable) → provider_observations`, evidencia append-only, degradación honesta.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — reader como primitive canónico consumible por UI + Nexa + MCP (un primitive, muchos consumers).
- `CLAUDE.md §"SQL Signal Reader Schema Validation Gate"` — validar cualquier SQL de agregación (incluido JSONB `jsonb_array_elements`) contra PG real antes de mergear; `created_at`=TIMESTAMPTZ.

Reglas obligatorias (§15 + §1.1 — load-bearing):

- **NUNCA re-capturar citas.** La captura ES un hecho ya persistido en `provider_observations.citations`. Esta task NO llama providers, NO parsea DataForSEO, NO toca `collectCitationCandidates`, NO ejecuta grader runs. Si un agente empieza a escribir un adapter o un fetch a un provider, está fuera de scope y violando el contrato de §15.
- **NUNCA mutar `provider_observations`.** Es evidence ledger append-only (trigger en DB). Esta task solo LEE. Si se decide la tabla normalizada, se materializa desde la evidencia existente (reactive/backfill), nunca reescribiendo la fuente.
- **NUNCA tocar el scoring/normalizer** (`grader_scores`, `dimensions`, `normalization/*`). La atribución URL-level es ortogonal al score de citabilidad; no lo recomputa ni lo modifica.
- **NUNCA cruzar con `seo_*` en esta task.** El eje SEO por-URL y el cruce quadrant granular son TASK-1313. Esta task se queda enteramente del lado AEO (lee solo `grader_*`/`provider_observations`).
- **NUNCA fabricar citas ni citation share.** Falta de run reportable → `no_aeo_data`; una URL sin citas en el rango → lista vacía honesta, NUNCA un share inventado.
- **SIEMPRE** resolver el dominio propio de la org server-side (no confiar en un `domain` client-provided sin validar contra la org) y filtrar las citas por `domain` == dominio propio; las citas a terceros NO se atribuyen a la org.
- **SIEMPRE** exponer esto como **reader gobernado** (report/attribution layer), no como fetch acoplado a una pantalla.

## Normative Docs

- `src/lib/growth/ai-visibility/contracts.ts` — `GrowthAiVisibilityCitation` (`url`, `domain`, `title?`, `sourceType?`) + `GrowthAiVisibilityProviderObservation` (`citations`, `promptId`, `provider`, `createdAt`). El shape de cita YA existe; esta task lo consume, no lo redefine.
- `src/lib/growth/ai-visibility/observation.ts` — `buildCitations` / `buildCitation` / `extractCitationDomain` / `normalizeDomain`: la normalización de dominio de cita ya resuelta (host sin `www`, desambiguación Gemini redirect vs title). El reader reusa `extractCitationDomain`/`normalizeDomain` para el matching del dominio propio, no re-implementa parsing de URL.
- `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts` — `collectCitationCandidates` (parsea `references`/`links`/`sources` de DataForSEO AI Overview). **Referencia de dónde nacen las citas — NO se modifica en esta task** (prueba de que la captura ya existe upstream).
- `src/lib/growth/ai-visibility/store.ts` — `getGraderProfileForOrganization` (~L247), `getLatestClientGraderRun` (~L376), `getRunObservations` (~L559): el path canónico org → profile → último run reportable → observaciones (con `citations`). El reader reusa este path, NO re-implementa el join org→run. El INSERT append-only (~L527) + `serializeProviderObservation` prueban que las citas ya se persisten queryables.
- `src/lib/growth/search-console/contracts.ts` — patrón result shape `{ ok: true, ... } | { ok: false, errorCode }` a espejar.
- `src/lib/entitlements/runtime.ts` (~L194) — grant de `growth.ai_visibility.observation.read` (gate a reusar, touch-it).
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15 — semántica de "grounded query", "citation share" y el nivel URL.

## Dependencies & Impact

### Depends on

- `TASK-1299` — schema/foundation SEO (`greenhouse_growth` extendido). Bloqueador declarado del contrato §15 (aunque esta task lee del lado AEO, se secuencia detrás de la fundación del módulo para nacer con el dominio SEO ya sembrado; confirmar en Discovery si el desbloqueo real es solo de convención de dominio o de una tabla concreta). [verificar acoplamiento exacto]
- Motor AEO en producción: `provider_observations.citations` (JSONB append-only), `grader_profiles`/`grader_runs`/`getRunObservations` — **ya existe**, reusado por `organization_id`.
- Capability `growth.ai_visibility.observation.read` — ya seedeada (`runtime.ts` ~L194); se reusa, no se crea.

### Blocks / Impacts

- Bloquea `TASK-1313` (`readPageVisibility360`/`readClusterVisibility360`) — consume el eje AEO por-URL que produce este reader.
- Es la mitad AEO del "360 granular" (§15): sin la atribución URL-level, el cruce por-página no tiene lente de citabilidad.

### Files owned

- `src/lib/growth/ai-visibility/attribution/read-url-citation-attribution.ts` [nuevo — `readUrlCitationAttribution`] [verificar carpeta `attribution/` vs `citations/` en Discovery]
- `src/lib/growth/ai-visibility/contracts.ts` [extendido — `UrlCitationAttributionResult`, `GroundedQueryCitationGroup`]
- `src/lib/growth/ai-visibility/attribution/__tests__/read-url-citation-attribution.test.ts` [nuevo]
- `migrations/<ts>_task-1311-grader-citation-observations.sql` [condicional — SOLO si Discovery decide la proyección normalizada `grader_citation_observations`; ver Slice 1]

## Current Repo State

### Already exists

- **Captura de citas con URL (el hecho central de §15):** `greenhouse_growth.provider_observations.citations JSONB NOT NULL DEFAULT '[]'` (append-only, trigger-protected), poblada por el grader vía `store.ts` INSERT (~L527, `JSON.stringify(observation.citations)`) y leída por `getRunObservations` (~L559). Cada cita trae `url`/`domain`/`title`/`sourceType`.
- Normalización de dominio de cita: `buildCitations`/`buildCitation`/`extractCitationDomain`/`normalizeDomain` (`observation.ts`).
- Parsing upstream de citas AI Overview: `collectCitationCandidates` (`google-ai-overview-adapter.ts`).
- Path org → run reportable → observaciones: `getGraderProfileForOrganization` / `getLatestClientGraderRun` / `getRunObservations` (`store.ts`), con degradación honesta (`null`, nunca `0`), probado por `listOperatorCrossOrgAeoScores`.
- Gate `growth.ai_visibility.observation.read` (`runtime.ts` ~L194). Patrón result shape `{ ok }` (Search Console).

### Gap

- Nadie **atribuye** las citas ya capturadas a la **URL propia** ni las **agrupa por grounded query (prompt) + engine + tiempo** ni calcula **citation share** por URL. La evidencia existe pero se consume a nivel run/dominio (score), no a nivel URL. `readPageVisibility360` (TASK-1313) no tiene contrato AEO por-página del cual leer.
- Posible gap de queryabilidad: el rollup por URL/query/engine/time sobre un array JSONB puede no ser eficiente/indexable — Discovery decide si basta el reader sobre JSONB o si se proyecta a `grader_citation_observations` normalizada.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (capa de atribución/lectura sobre evidencia ya capturada; posible proyección normalizada aditiva si Discovery la justifica).
- Source of truth afectado: NINGUNO nuevo como fuente. Lee `greenhouse_growth.provider_observations` (SoT de evidencia AEO, append-only, ya existente). Si se materializa `grader_citation_observations`, es una **proyección derivada** de esa evidencia (no un nuevo SoT), poblada por backfill/reactive desde `provider_observations`.
- Consumidores afectados: `readPageVisibility360`/`readClusterVisibility360` (TASK-1313), Nexa/MCP, y (indirecto) la UI granular por landing (follow-up ui-ux).
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: `GrowthAiVisibilityCitation` + `GrowthAiVisibilityProviderObservation` (shape de cita/observación, NO redefinir), path org→run (`store.ts`), boundary §1.1 (solo lado AEO), append-only de `provider_observations`, gate `growth.ai_visibility.observation.read`, result shape `{ ok }`.
- Contrato nuevo o modificado: `readUrlCitationAttribution({ organizationId, domain, url?, range })` → `{ ok: true, groundedQueries: GroundedQueryCitationGroup[], byUrl, byEngine, window } | { ok: false, errorCode: 'no_aeo_data'|'disabled'|'forbidden'|'query_failed', status }`. Sin endpoint nuevo obligatorio en esta task (lo consume TASK-1313). Proyección `grader_citation_observations` = aditiva y condicional.
- Backward compatibility: `compatible` (reader additive read-only; cero cambio en scoring/consumers existentes; si hay proyección, es tabla nueva aditiva). Gated por el flag del módulo AEO/grader vigente [verificar flag exacto — `GROWTH_AI_VISIBILITY_ENABLED` o equivalente].
- Full API parity: reader canónico en `src/lib/growth/ai-visibility/**` (un primitive, muchos consumers: TASK-1313 + Nexa + MCP). Ver `## Capability Definition of Done` (touch-it del gate existente).

### Data model and invariants

- Entidades/tablas/views afectadas (LECTURA): `greenhouse_growth.provider_observations` (citations JSONB), `grader_runs`, `grader_profiles`, `greenhouse_core.organizations` (ancla). Condicional (ESCRITURA aditiva, solo si Discovery lo decide): `greenhouse_growth.grader_citation_observations` (proyección normalizada: `observation_id` FK, `run_id`, `prompt_id`/grounded query, `provider`/engine, `citation_url`, `citation_domain`, `captured_at`).
- Invariantes que no se pueden romper:
  - **Cero re-captura:** el reader no llama providers ni parsea DataForSEO; lee evidencia ya persistida.
  - **`provider_observations` append-only intacta:** cero UPDATE/DELETE. Una eventual `grader_citation_observations` se puebla DESDE ella (backfill/reactive), nunca la reescribe, y es ella misma append-only.
  - **Atribución solo al dominio propio:** una cita se atribuye a la org solo si su `domain` == dominio propio de la org (resuelto server-side); citas a terceros NO se atribuyen.
  - **Grounded query = prompt:** la agrupación por "grounded query" usa `prompt_id` de la observación; NO se inventa una taxonomía de query nueva.
  - **Citation share honesto:** share = citas de la URL / total de citas propias en el mismo grounded query+engine+ventana; nunca un promedio cross-motor ni un número fabricado. Sin denominador → sin share (no `0` mentiroso).
  - **Read-only sobre el scoring:** cero escritura a `grader_scores`/`dimensions`.
  - Cero FK a `seo_*` (el cruce es TASK-1313), cero payroll/finance.
- Tenant/space boundary: `organizationId` resuelve el dominio propio server-side; el reader lee las observaciones de las orgs cuyos `grader_profiles` pertenecen a ESA org (path `getGraderProfileForOrganization`). Un caller sin el gate no ve citas de orgs ajenas.
- Idempotency/concurrency: N/A para el reader (read-only). Si hay backfill de la proyección, es idempotente por `observation_id + citation_url` (UNIQUE) — re-run no duplica.
- Audit/outbox/history: N/A (read-only; la evidencia append-only ES el historial). Si hay reactive materializer de la proyección, sigue el patrón outbox→consumer del dominio growth. Observabilidad = `captureWithDomain('growth'|'ai', ...)` en el catch.

### Migration, backfill and rollout

- Migration posture: `none` en el camino base (reader puro sobre JSONB). `additive` SOLO si Discovery decide la proyección `grader_citation_observations` (tabla nueva + backfill desde `provider_observations`).
- Default state: `read-only`; ningún consumer llama el reader hasta TASK-1313. Gated por el flag del módulo grader vigente [verificar].
- Backfill plan: N/A en el camino base. Si hay proyección: backfill idempotente desde `provider_observations` (dry-run → apply, batch por `run_id`), reversible por `DROP TABLE` (proyección derivada, reconstruible).
- Rollback path: revert PR (reader read-only). Si hay proyección: reverse migration (`DROP` de la tabla derivada, sin pérdida — es reconstruible desde la evidencia) + revert PR.
- External coordination: ninguna (sin provider, sin secret, sin cron nuevo en el camino base; la proyección, si existe, reusa el reactive del dominio growth).

### Security and access

- Auth/access gate: `growth.ai_visibility.observation.read` (existente), por-org vía `module_assignments` (no por rol). Reusar, NO duplicar autorización.
- Sensitive data posture: sin PII (las citas son URLs/dominios públicos de respuestas de motores), sin secretos, sin finance. El `answerExcerpt`/`rawEvidencePointer` NO se exponen en el resultado de atribución (solo url/domain/query/engine/time/share).
- Error contract: `{ ok: false, errorCode, status }` canónico (es-CL en la UI aguas abajo); errores con `captureWithDomain(err, 'growth'|'ai', ...)`, NUNCA raw error al cliente ni `Sentry.captureException` directo.
- Abuse/rate-limit posture: N/A adicional (read-only sobre evidencia ya materializada; sin call a provider externo — no gasta cuota DataForSEO ni LLM).

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit tests de la atribución (cita al dominio propio → URL → grounded query+engine+time), del citation share (denominador correcto, sin fabricar), de la degradación honesta (`no_aeo_data` sin run reportable; URL sin citas → grupo vacío honesto), y de que **cero call a provider** ocurre (el reader es puro sobre datos ya persistidos).
- DB/runtime checks: si el reader lleva SQL propio (agregación sobre JSONB con `jsonb_array_elements` o sobre la proyección), validarlo contra PG real (gate TASK-893; `created_at`=TIMESTAMPTZ). Ejercer `readUrlCitationAttribution` en staging contra una org con runs reportables y citas a su propio dominio, y contra una org sin runs.
- Integration checks: N/A (sin provider externo — es el punto: no re-captura).
- Reliability signals/logs: sin signal nueva en el camino base (read-only); log del path de degradación. Si hay proyección reactiva, reusar los signals del dominio growth.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **toca una capability existente** (`growth.ai_visibility.observation.read`). Aplica el gate con regla *touch-it/fix-it*:

- [ ] **Lógica en el primitive, no en la UI.** La atribución URL-level, la agrupación por grounded query+engine+time y el citation share viven en `readUrlCitationAttribution` (`src/lib/growth/ai-visibility/**`), NUNCA en un componente. La UI (follow-up) solo pinta el resultado.
- [ ] **Modelada como reader canónico**, no como fetch acoplado a una pantalla granular.
- [ ] **Read** expuesto como reader canónico con shape + latencia estables (`{ ok }`); sin write en el camino base. Si Discovery decide la proyección normalizada, su materializer sigue command/reactive semantics del dominio growth (idempotente, append-only), pero eso NO es una capability nueva.
- [ ] **Capability + grant:** reusa `growth.ai_visibility.observation.read`; verificar que el gate aplica y que su coverage test sigue verde. NO introduce capability nueva.
- [ ] **Camino programático declarado:** reader consumible por TASK-1313 + Nexa + MCP; la UI granular es un consumer, no el SoT de la atribución.
- [ ] **`propose → confirm → execute`:** N/A (read-only; sin write gobernado de negocio).
- [ ] **Un primitive, muchos consumers:** TASK-1313, Nexa, MCP leen el mismo `readUrlCitationAttribution`; cero re-implementación del rollup de citas en cada consumer.
- [ ] **Parity check = SÍ:** la atribución de citas URL-level tiene contrato gobernado (reader por-org, gate existente) → todos los consumers la operan por construcción, sin re-capturar ni romper el boundary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Queryability decision + contract

- **Decisión de persistencia queryable (Discovery-gated):** medir si el rollup por URL/grounded-query/engine/time se resuelve bien con un reader de agregación sobre `provider_observations.citations` (JSONB, vía `jsonb_array_elements`) o si el volumen/índices justifican proyectar a `grader_citation_observations` normalizada. Documentar la decisión en la task + el arch doc (§15). **La captura NO cambia en ninguno de los dos caminos** — solo se decide cómo se LEE.
- `UrlCitationAttributionResult` + `GroundedQueryCitationGroup` en `contracts.ts`: `{ ok: true, groundedQueries: [{ promptId, groundedQuery, engine, capturedAt, urlCitations: [{ url, domain, title? }], citationShare }], byUrl, byEngine, window } | { ok: false, errorCode, status }`.
- Si (y solo si) se elige la proyección: `migrations/<ts>_task-1311-grader-citation-observations.sql` (marker `-- Up Migration` + DO-block + GRANTs + anti-mutation trigger; poblada por backfill idempotente desde `provider_observations`; Down solo DROP). Regenerar `db.d.ts`.

### Slice 2 — `readUrlCitationAttribution` reader

- `readUrlCitationAttribution({ organizationId, domain, url?, range })`:
  1. Validar `growth.ai_visibility.observation.read` + resolver el **dominio propio** de la org server-side (`domain` client-provided se valida contra la org, no se confía crudo).
  2. Reusar el path org → grader profile → runs reportables en la ventana → `getRunObservations` (`store.ts`) para traer observaciones **con sus citas ya capturadas**. Sin run reportable → `{ ok: false, errorCode: 'no_aeo_data' }`.
  3. Filtrar las citas cuyo `domain` == dominio propio (reusando `extractCitationDomain`/`normalizeDomain`), opcionalmente acotadas a `url`.
  4. Agrupar por **grounded query (`promptId`) + engine (`provider`) + tiempo (`createdAt`/`capture bucket`)**; calcular **citation share** por URL dentro de cada grupo (URL propia citada / total citas propias del grupo).
- Tests: atribución correcta, cero re-captura (mock de provider NUNCA invocado), citation share honesto, degradación (`no_aeo_data`, URL sin citas), gate aplicado, tenant boundary (no fuga de citas de orgs ajenas).

## Out of Scope

- **Cualquier re-captura de citas** (providers, DataForSEO parsing, `collectCitationCandidates`, grader runs). La captura ya existe — este es el punto de §15.
- Cambios al scoring/normalizer (`grader_scores`, `dimensions`, `normalization/*`).
- El cruce SEO↔AEO por URL / quadrant granular / `readPageVisibility360` (TASK-1313).
- El lado SEO (rank/gsc por URL) — es de otro motor (TASK-1303/1302).
- Topic clusters (TASK-1312).
- UI granular por landing/cluster (follow-up ui-ux posterior).

## Detailed Spec

Ver el contrato en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15 (granularidad URL — "la CAPTURA ya existe, esto es reader/rollup") + §1.1 (boundary). Puntos load-bearing:

- **La captura ya existe — esta task es atribución/lectura, no captura.** El error más caro que un agente puede cometer acá es "construir la captura de citas por URL": ya está hecha. Cada `provider_observations` trae sus `citations` con `url`/`domain`, normalizadas por `buildCitations`, parseadas upstream por `collectCitationCandidates`. El prompt de cada observación ES el grounded query. Esta task **solo** filtra al dominio propio, mapea a la URL, agrupa por query+engine+time y calcula share. Cero providers, cero DataForSEO, cero grader runs.
- **Queryability primero, forma después.** Antes de escribir el reader, decidir si el JSONB soporta el rollup o si se proyecta a tabla normalizada. Si se proyecta, la tabla es una **derivada append-only** de la evidencia (backfill idempotente), nunca un nuevo SoT ni una reescritura de `provider_observations`. Cualquier SQL (JSONB o normalizado) se valida contra PG real (gate TASK-893).
- **Grounded query = prompt.** La agrupación usa `prompt_id`; no se inventa taxonomía de query. "En qué motores" = `provider`. "En el tiempo" = `created_at` bucketizado por la ventana `range`.
- **Citation share honesto y ortogonal.** Share = URL propia citada / total citas propias en el mismo grounded-query+engine+ventana. Nunca cross-motor, nunca fabricado; sin denominador → sin share.
- **Boundary AEO intacto.** Esta task lee solo `grader_*`/`provider_observations`. El cruce con `seo_*` es TASK-1313 (derived read por `org + url`), no acá. Cero FK cross-motor.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (queryability decision + contract; y la migración condicional si se elige proyección) → Slice 2 (reader). El reader depende del shape decidido en Slice 1. Ambos read-only/aditivos; el orden es de contrato, no de riesgo runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente "construye la captura" de citas por URL (ya existe) → scope creep + duplicación | growth | medium | regla dura documentada (§15 dice "la captura ya existe") + test que verifica cero call a provider en el reader | code review + test |
| Rollup sobre JSONB `citations` ineficiente/no indexable a escala | data | medium | decisión de queryability en Slice 1 (JSONB vs proyección normalizada) medida antes de shippear | latencia del reader en staging |
| Atribuir a la org una cita a un dominio de tercero | growth | medium | filtro estricto `domain == dominio propio` resuelto server-side; test dedicado | test de atribución |
| Citation share fabricado / cross-motor | data | medium | share por grounded-query+engine+ventana; test que falla si el denominador cruza motores o se inventa | test |
| Mutar `provider_observations` (append-only) al "normalizar" | data | low | reader read-only; si hay proyección, se puebla DESDE la evidencia, nunca la reescribe; trigger DB protege | verificación `pg_trigger` + review |
| SQL con `EXTRACT(EPOCH FROM DATE-DATE)` o cast erróneo en el bucket temporal | data | low | `created_at`=TIMESTAMPTZ; validar SQL contra PG real (gate TASK-893) | Sentry + lint rule |

### Feature flags / cutover

- Behind el flag del módulo AEO/grader vigente [verificar — `GROWTH_AI_VISIBILITY_ENABLED` o equivalente en el ledger]. Reader read-only sin cutover propio; ningún consumer lo llama hasta TASK-1313. Si se agrega la proyección normalizada, su materializer nace disabled/shadow hasta backfill verificado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (contract; migración condicional) | revert PR; si hubo proyección, reverse migration (`DROP` — derivada reconstruible) | <5 min | si |
| Slice 2 (reader) | revert PR (reader read-only, sin efecto persistente) | <5 min | si |

### Production verification sequence

1. En staging con el flag del grader ON: `readUrlCitationAttribution({ organizationId, domain })` sobre una org con runs reportables cuyas observaciones citen su propio dominio → verificar grounded queries agrupados por prompt+engine+time, URLs correctas, citation share honesto.
2. Con `url` acotada → verificar que solo devuelve las citas de ESA URL.
3. `readUrlCitationAttribution` sobre una org **sin** grader run reportable → `{ ok: false, errorCode: 'no_aeo_data' }`, NUNCA citas fabricadas.
4. Verificar (código/query plan + test) que el reader NO llama ningún provider ni parsea DataForSEO — es puro sobre datos persistidos.
5. Verificar tenant boundary: un caller sin el gate de `observation.read` no ve citas de orgs ajenas.
6. Si hay proyección `grader_citation_observations`: verificar backfill idempotente (re-run no duplica) + anti-mutation trigger (UPDATE rechazado).
7. Prod vía release control plane cuando EPIC-022 se secuencie (read-only/additive).

### Out-of-band coordination required

- Ninguna (read-only; sin provider, sin secret, sin cron nuevo en el camino base). Solo confirmar que `growth.ai_visibility.observation.read` y el flag del grader están vigentes, y coordinar con TASK-1299 el desbloqueo de convención de dominio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `readUrlCitationAttribution({ organizationId, domain, url?, range })` existe en `src/lib/growth/ai-visibility/**`, gateado por `growth.ai_visibility.observation.read`, con shape `{ ok: true, groundedQueries, byUrl, byEngine, window } | { ok: false, errorCode, status }`.
- [ ] **Cero re-captura verificada:** el reader NO llama providers, NO parsea DataForSEO, NO ejecuta grader runs; lee las citas ya persistidas en `provider_observations.citations` (verificado por test — mock de provider nunca invocado — y por review).
- [ ] Atribución correcta: solo se atribuyen a la org las citas cuyo `domain` == dominio propio (server-side); se mapean a la URL específica; se agrupan por grounded query (`promptId`) + engine (`provider`) + tiempo.
- [ ] Citation share honesto: URL propia citada / total citas propias en el mismo grounded-query+engine+ventana; nunca cross-motor ni fabricado; sin denominador → sin share.
- [ ] Degradación honesta: org sin grader run reportable → `no_aeo_data`; URL sin citas en el rango → grupo/lista vacía honesta; NUNCA citas ni share fabricados.
- [ ] Reusa el path org→run→observaciones (`store.ts`) y la normalización de dominio (`observation.ts`); no re-implementa parsing de citas ni el join org→run; no duplica autorización.
- [ ] `provider_observations` intacta (append-only, read-only desde esta task). Si hay proyección `grader_citation_observations`, es aditiva, append-only, poblada DESDE la evidencia (backfill idempotente), con marker + DO-block + trigger; Down solo DROP.
- [ ] Boundary AEO: cero FK/JOIN con `seo_*`; cero cambio al scoring; cero payroll/finance.
- [ ] Tenant boundary: sin fuga de citas de orgs ajenas.
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes; si hay SQL propio (JSONB o proyección), validado contra PG real (gate TASK-893).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Ejercer `readUrlCitationAttribution` en staging contra una org con runs+citas propias y una sin runs; verificar cero re-captura (query plan/código), atribución URL-level correcta, grounded-query grouping, citation share honesto y degradación.
- Si hay proyección: `pnpm migrate:up` en staging + verificación SQL (`information_schema`/`pg_trigger`) + smoke de anti-mutation + backfill idempotente.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1313 `readPageVisibility360` consume este reader)
- [ ] documentación técnica de la capa de atribución de citas URL-level (arch doc §15 + dominio AEO)

## Follow-ups

- `TASK-1313` — Unified Page/Cluster Visibility 360 read (consume `readUrlCitationAttribution` como eje AEO por-URL).
- Evaluar exponer `readUrlCitationAttribution` como recurso `api/platform/app` explícito para Nexa/MCP si el consumo lo justifica.
- Si se difirió la proyección `grader_citation_observations` y el volumen de citas crece, promover el reader JSONB a la tabla normalizada (task derivada de performance).

## Open Questions

1. ¿Persistencia queryable = reader sobre `provider_observations.citations` (JSONB, `jsonb_array_elements`) o proyección normalizada `grader_citation_observations`? Propuesta: partir con el reader sobre JSONB (la captura ya existe queryable) y proyectar solo si el rollup por URL/query/engine/time no rinde. Resolver midiendo en Discovery.
2. ¿La ventana temporal (`range`) bucketiza por `capture_date`/día o por run? `provider_observations` tiene `created_at` (TIMESTAMPTZ) por observación, no un `capture_date` como SEO. Resolver contra el shape real en Discovery.
3. ¿El "dominio propio" de la org se resuelve desde `grader_profiles.website_url`, desde `seo_targets.root_domain` (TASK-1299), o ambos? Confirmar el SoT del dominio propio en Discovery (sin cruzar tablas SEO↔AEO — solo resolver el string dominio).
4. ¿Cuál es el flag exacto que gatea el módulo grader/AEO en el ledger (`GROWTH_AI_VISIBILITY_ENABLED`?)? Confirmar en Discovery.
5. ¿El desbloqueo real por TASK-1299 es solo de convención de dominio SEO o hay un objeto concreto que este reader necesita? Confirmar acoplamiento en Discovery.
