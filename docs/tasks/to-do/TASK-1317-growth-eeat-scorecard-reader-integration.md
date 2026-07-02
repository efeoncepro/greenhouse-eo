# TASK-1317 — Growth SEO/AEO: E-E-A-T Scorecard Reader + Integración

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
- Blocked by: `TASK-1315, TASK-1316`
- Branch: `task/TASK-1317-growth-eeat-scorecard-reader-integration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Expone `readEeatScorecard({ organizationId, entity|url|author, range })`: el **reader que compone** las señales E-E-A-T **medidas** (extracción de entity + author + trust, `TASK-1315`) con el **juicio del rater** (rúbrica 4 pilares YMYL-aware, `TASK-1316`) en un **scorecard** por entidad/página/autor — la **cara consumible** de E-E-A-T (§16 del doc maestro). El scorecard emite los 4 pilares (Experience · Expertise · Authoritativeness · Trustworthiness) con **evidencia nombrada** por pilar, cada señal marcada **medido (●) vs evaluado (◑)**, los **huecos accionables + recomendaciones**, y la **evolución temporal**. Es la capa conectiva más profunda del 360 porque **conecta SEO y AEO por la entidad**: el mismo scorecard alimenta el **topical authority score de `TASK-1314`** (SEO) *y* la claridad de entidad del grader (AEO) — **un primitive, dos consumers** (§16: "un primitive, dos consumers"). Y por eso es una task donde el **boundary duro §1.1** es la regla load-bearing: el scorecard **compone reads, no fusiona** — cero JOIN/VIEW/FK cross-motor, cero merge de tablas, cero promedio ciego. La regla de honestidad de §16 es **sagrada** aquí: **medido (●) vs evaluado (◑)** nunca se colapsan; los pilares cualitativos son juicio de rater LLM con confianza calibrada, jamás falsa precisión ni el falso-0 del grader (lección EPIC-021). Con degradación honesta por señal faltante (`no_signals`/`no_rater`/`insufficient_data`), NUNCA ceros.

## Why This Task Exists

§16 del doc maestro pone E-E-A-T como el "por qué" debajo de rankear (SEO) **y** de ser citado (AEO): una entidad fuerte hace ambas cosas. `TASK-1315` **mide** las señales duras (entity KG/Wikidata/Reddit, author schema/`sameAs`/credenciales, trust about/contact/policies/reviews/HTTPS) y `TASK-1316` **evalúa** (rater LLM que mapea esas señales a los 4 pilares con rúbrica de las Quality Rater Guidelines, YMYL-aware). Pero ninguno de los dos es todavía la **cara consumible**: `TASK-1315` es materia prima, `TASK-1316` es un veredicto por pilar. El **scorecard** es lo que un consumer (el topical authority de `TASK-1314`, la claridad de entidad del grader, y la futura UI) realmente lee: los 4 pilares con **evidencia nombrada**, el marcador **medido-vs-evaluado** por señal, los huecos priorizados con recomendaciones, y la película en el tiempo. Modelar esto mal es intrínsecamente peligroso de dos formas: (1) la tentación de **fusionar** las señales medidas con el juicio del rater en un número único opaco — que **borra la distinción medido-vs-evaluado** que §16 declara sagrada y **repite el falso-0** que EPIC-021 corrigió; y (2) la tentación de **materializar** el scorecard como una tabla que mergee `seo_*` con `grader_*`/E-E-A-T — que rompe el aislamiento entre motores (§1.1). Esta task fija el scorecard como **derived read gobernado por el boundary**: compone dos reads (señales + rater) por `organization_id` (+ entity/url/author), preserva medido-vs-evaluado por construcción, y expone un primitive que SEO y AEO consumen sin re-inventar la composición ni romper el aislamiento.

## Goal

- `readEeatScorecard({ organizationId, entity|url|author, range })` en `src/lib/growth/ai-visibility/**` (la evaluación E-E-A-T vive **cerca del grader**, §16): reader que **compone** las señales medidas (`TASK-1315`) + el juicio del rater (`TASK-1316`) en un scorecard, uniéndolos **en memoria** por `organization_id` (+ el sujeto entity/url/author), NUNCA por merge de tablas.
- Los **4 pilares** (Experience · Expertise · Authoritativeness · Trustworthiness) con **evidencia nombrada** por pilar (qué señal concreta lo sostiene — KG/Wikidata/Reddit/author-schema/trust/etc.), y por cada señal el marcador **medido (●) vs evaluado (◑)** explícito en el payload.
- **Huecos accionables + recomendaciones** derivados de los pilares/señales (p. ej. `sin author schema`, `sin about/contact (trust)`, `entidad no reconocida por KG`, `expertise sin credenciales`), + **evolución temporal** del scorecard sobre el `range`.
- **Integración explícita (un primitive, dos consumers):** el scorecard es consumido por el **módulo SEO** (alimenta el `topicalAuthorityScore` de `TASK-1314` como señal de autoridad/calidad + sus recomendaciones) **Y** por el **AEO** (entity clarity del grader). Declarar el contrato de ambos consumers; ninguno forkea la composición.
- Degradación honesta por señal/lado faltante: sin extracción de señales → `no_signals`; sin veredicto de rater → `no_rater`; datos insuficientes para un pilar (confianza bajo umbral) → `insufficient_data`; NUNCA ceros fantasma ni falsa precisión.
- Gate de acceso: `growth.ai_visibility.observation.read` (touch-it) — reusar el gate de lectura de observaciones/scores del grader que las deps ya aplican, sin duplicar autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§16 (E-E-A-T — la fuente de verdad de esta task: los 4 pilares, "materia prima ya existe ~70% en el probe layer", "un primitive, dos consumers", `readEeatScorecard` + integración a topical authority/360, y la regla de honestidad medido-vs-evaluado / anti falso-0 / YMYL más estricta)**, **§1.1 (boundary duro NUNCA/SIEMPRE — la regla load-bearing)**, §15.1 (topical authority — el consumer SEO al que esta task alimenta como señal), §7 (readers como derived read cross-módulo, result shape `{ ok }`).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — modelo del AEO/grader: eje `entity` (KG/Wikidata/Reddit, `TASK-1267`), eje `structural` (`json-ld`), `brand-intelligence/` (LLM que lee el contenido real del sitio), `evals/` + `accuracy/` (golden-set anti falso-0), y el ancla `organization_id`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — reader como primitive canónico consumible por UI + Nexa + MCP (y, aquí, por dos motores).
- `CLAUDE.md §"SQL Signal Reader Schema Validation Gate"` — validar cualquier SQL propio contra PG real; `capture_date`/`effective_from`/`effective_to`=DATE, `*_at`=TIMESTAMPTZ.

Reglas obligatorias (§1.1 + §16 — **boundary duro + honestidad, load-bearing**):

- **NUNCA fusionar las señales medidas (`TASK-1315`) con el juicio del rater (`TASK-1316`) en un número único opaco.** El scorecard compone dos reads separados; medido y evaluado se mantienen **distinguibles por construcción** en el payload.
- **NUNCA mergear tablas E-E-A-T/`grader_*` con `seo_*`.** Cero FK cross-motor. El scorecard es una **operación en memoria** sobre reads separados, unidos por `organization_id` (+ entity/url/author). Es una capa de entidad/calidad que ambos motores **referencian por `org`**, no una tabla que los fusione (§16).
- **NUNCA colapsar medido (●) y evaluado (◑) en una sola marca ni promediar los 4 pilares en un score ciego** que oculte de qué señal sale y si es dura o de juicio. Cada pilar expone su evidencia nombrada + el marcador por señal.
- **NUNCA repetir el falso-0 del grader (corregido en EPIC-021):** una señal ausente o un pilar con confianza baja degrada honesto (`insufficient_data`), NUNCA `0` ni falsa precisión. YMYL (finanzas/salud/legal) exige el listón más estricto que ya aplica el rater (`TASK-1316`); esta task **preserva** ese posture, no lo relaja.
- **SIEMPRE** exponer el scorecard como **derived read (report layer)**, no como tabla compartida ni materialización.
- **SIEMPRE** degradar honesto si falta un lado (sin señales → `no_signals`; sin rater → `no_rater`; datos insuficientes → `insufficient_data`), NUNCA rellenar con `0`.

## Normative Docs

- `docs/tasks/to-do/TASK-1305-growth-seo-aeo-gap-derived-read.md` — **task hermana estructural**: `readSeoAeoGap`. Esta task copia su estructura EXACTA y su patrón de "dos reads separados unidos en memoria por `organization_id`" + boundary §1.1 martillado en cada zona; hereda la disciplina de **ejes ortogonales que no se fusionan** (allá rankeo×citabilidad; acá medido×evaluado + los 4 pilares nombrados).
- `docs/tasks/to-do/TASK-1315-growth-eeat-signal-extraction-entity-author-trust.md` — **dep dura**: provee la **extracción de señales** E-E-A-T medidas (entity KG/Wikidata/Reddit reusando el eje `entity` de `TASK-1267`, author `Person`/`Author` schema + `sameAs` + credenciales, trust about/contact/policies/reviews/HTTPS + `structural/json-ld`). Es el lado **medido (●)** del scorecard. [verificar shape final del reader/extractor de señales + del marcador de "medido" al tomar la task; el archivo puede no existir aún en `to-do/`].
- `docs/tasks/to-do/TASK-1316-growth-eeat-rater-rubric-4-pillars-ymyl.md` — **dep dura**: provee el **rater** (assessment LLM que mapea señales → 4 pilares con rúbrica de las Quality Rater Guidelines, YMYL-aware, confianza calibrada + golden-set anti falso-0, reusando `brand-intelligence/` + `evals/` + `accuracy/`). Es el lado **evaluado (◑)** del scorecard. [verificar shape del veredicto por pilar + del campo de confianza; el archivo puede no existir aún en `to-do/`].
- `docs/tasks/to-do/TASK-1314-growth-seo-pillar-cluster-health-topical-authority.md` — **consumer SEO** del scorecard: `readPillarClusterHealth` compone las señales de topical authority; esta task le entrega el scorecard E-E-A-T como **señal de autoridad/calidad** (§16: "el módulo SEO la CONSUME como señal en topical authority (1314) + recomendaciones"). Ver cómo compone readers para espejar la disciplina de señales nombradas. [verificar el shape final de `readPillarClusterHealth` al integrar].
- `src/lib/growth/ai-visibility/store.ts` (`listOperatorCrossOrgAeoScores`, ~L427) — patrón canónico de degradación honesta AEO (`null`, NUNCA `0`) sobre el join `module_assignments → organizations → grader_profiles → grader_runs → grader_scores`. El scorecard reusa esa disciplina de "sin dato → `null`/errorCode, jamás `0`".
- `src/lib/growth/ai-visibility/scoring/store.ts` (`getGraderScore`, ~L195) — shape de `grader_scores` (`overall_score`, `dimensions` JSONB, `confidence`); referencia de cómo el AEO ya modela confianza, a espejar en medido-vs-evaluado.
- `src/lib/growth/ai-visibility/brand-intelligence/read-brand-intelligence.ts` (`readBrandIntelligenceForProfile`, ~L63) — reader del análisis LLM del contenido real del sitio; parte de la materia prima del lado evaluado.
- `src/lib/growth/search-console/contracts.ts` — patrón result shape `{ ok: true, ... } | { ok: false, errorCode }` a espejar (`SearchConsoleAnalyticsResult`).

## Dependencies & Impact

### Depends on

- `TASK-1315` — extracción de señales E-E-A-T (entity + author + trust), lado **medido (●)** del scorecard. **Bloqueador duro** (sin señales medidas no hay evidencia nombrada que componer).
- `TASK-1316` — rater rúbrica 4 pilares YMYL-aware + calibración golden-set, lado **evaluado (◑)** del scorecard. **Bloqueador duro** (sin el juicio del rater no hay pilares que exponer).
- `TASK-1267` — probe layer eje `entity` (KG/Wikidata/Reddit) — materia prima ya en producción, reusada por `TASK-1315` (dep transitiva).
- Motor AEO/grader existente (`grader_*` + `evals/` + `accuracy/` + `brand-intelligence/`) — reusado por `organization_id`, ya en producción.
- `growth.ai_visibility.observation.read` — capability de lectura de observaciones/scores del grader (`src/lib/entitlements/runtime.ts:194`), gate reusado. Implícito (lo consume el reader) [verificar que el gate cubre la lectura de señales E-E-A-T + rater].

### Blocks / Impacts

- **Alimenta `TASK-1314`** (topical authority / pillar-cluster health): el scorecard E-E-A-T entra como **señal de autoridad/calidad** al `topicalAuthorityScore` + a sus recomendaciones (§16 + §15.1). Consumer SEO.
- **Alimenta el AEO** (entity clarity del grader): el mismo scorecard nutre la claridad de entidad del motor de citabilidad. Consumer AEO.
- Habilita el **scorecard E-E-A-T por entidad/página/autor** en la UI (follow-up ui-ux, §16: "Consumer UI = follow-up ui-ux") — consume `readEeatScorecard`.
- Es el contrato que hace real la **capa conectiva más profunda del 360** (§16): E-E-A-T como el multiplicador del topical authority que conecta SEO+AEO por la entidad, sin fusionar.

### Files owned

- `src/lib/growth/ai-visibility/eeat/read-eeat-scorecard.ts` [nuevo — `readEeatScorecard`] [verificar carpeta `eeat/` en Discovery]
- `src/lib/growth/ai-visibility/eeat/scorecard-compose.ts` [nuevo — función pura de composición señales+rater → 4 pilares con evidencia nombrada + medido-vs-evaluado + huecos] [verificar carpeta]
- `src/lib/growth/ai-visibility/eeat/contracts.ts` [nuevo o extendido — `EeatScorecardResult`, tipos de pilar/evidencia/marcador medido-vs-evaluado/hueco] [verificar path; puede consolidarse con contracts de TASK-1315/1316]
- `src/lib/growth/ai-visibility/eeat/__tests__/read-eeat-scorecard.test.ts` [nuevo]
- `src/lib/growth/ai-visibility/eeat/__tests__/scorecard-compose.test.ts` [nuevo]

## Current Repo State

### Already exists

- **Materia prima E-E-A-T (~70%, §16):** eje `entity` del grader — `src/lib/growth/ai-visibility/probes/entity/{knowledge-graph,wikidata,reddit-ugc}.ts` (`TASK-1267`); eje `structural` — `probes/structural/json-ld.ts`; `brand-intelligence/` (LLM que lee el contenido real del sitio: `fetch-site-content.ts` + providers + `prompt.ts` + `store.ts` + `read-brand-intelligence.ts`); `evals/` (`golden-set.v1.json`, `eval-runner.ts`) + `accuracy/` (calibración anti falso-0).
- **Lado medido (post TASK-1315):** extractor de señales entity + author + trust (author schema/`sameAs`/credenciales + about/contact/policies/reviews/HTTPS), reusando el probe layer.
- **Lado evaluado (post TASK-1316):** rater LLM → 4 pilares con rúbrica QRG YMYL-aware + confianza calibrada + golden-set.
- **Consumer SEO (post TASK-1314):** `readPillarClusterHealth` — compone señales de topical authority; recibe el scorecard como señal de autoridad/calidad.
- Patrón de degradación honesta AEO (`null`, NUNCA `0`) probado (`listOperatorCrossOrgAeoScores`) + shape `grader_scores` con `confidence` (`getGraderScore`).
- Patrón de result shape `{ ok }` (Search Console reader) y de reader gobernado por capability + org.

### Gap

- No existe ningún **scorecard E-E-A-T**. `TASK-1315` mide señales y `TASK-1316` emite un veredicto por pilar, pero nadie los **compone** en la cara consumible: los 4 pilares con evidencia nombrada, el marcador **medido-vs-evaluado** por señal, los huecos accionables + recomendaciones, y la evolución. Ni `TASK-1314` (SEO) ni el grader (AEO) tienen un contrato del cual leer el scorecard como señal — hoy E-E-A-T no está conectado como capa que ambos motores referencien.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (derived read compositivo cross-módulo, read-only, sin persistencia nueva, sin provider call propio)
- Source of truth afectado: NINGUNO nuevo. Compone el extractor de señales (`TASK-1315`, lado medido) + el rater (`TASK-1316`, lado evaluado); el scorecard es efímero (en memoria), NO se materializa.
- Consumidores afectados: `TASK-1314` (topical authority, SEO) + el grader/AEO (entity clarity) + futura UI del scorecard E-E-A-T + Nexa/MCP.
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: boundary SEO↔AEO (§1.1), honestidad E-E-A-T medido-vs-evaluado + anti falso-0 + YMYL (§16), extractor de señales (`TASK-1315`), rater (`TASK-1316`), patrón de degradación honesta de `store.ts` (`null`, NUNCA `0`) + confianza de `grader_scores`, result shape `{ ok }`, gate `growth.ai_visibility.observation.read`.
- Contrato nuevo o modificado: `readEeatScorecard({ organizationId, entity|url|author, range })` → `{ ok: true, subject, range, pillars: { experience, expertise, authoritativeness, trustworthiness }, evidence, measuredVsEvaluated, gaps, recommendations, evolution } | { ok: false, errorCode: 'no_signals'|'no_rater'|'insufficient_data'|'unknown_subject'|'disabled'|'forbidden'|'query_failed', status }`. Sin nuevo endpoint/tabla obligatorio en esta task (el reader lo consumen `TASK-1314`, el grader y la UI follow-up).
- Backward compatibility: `compatible` (reader additive, read-only, cero cambio en schema/consumers existentes; gated por el flag del grader / E-E-A-T de las deps).
- Full API parity: reader canónico en `src/lib/growth/ai-visibility/**`, **un primitive, dos consumers** (SEO `TASK-1314` + AEO), más UI + Nexa + MCP. Ver `## Capability Definition of Done` (touch-it de capability existente).

### Data model and invariants

- Entidades/tablas/views afectadas (SOLO lectura indirecta vía readers/extractores, sin escritura): las señales E-E-A-T de `TASK-1315` (entity/author/trust — vía el probe layer / su store), el veredicto del rater de `TASK-1316` (4 pilares + confianza — vía su store/reader), `greenhouse_growth.grader_*` (indirecto, ancla del sujeto vía `organization_id`), `greenhouse_core.organizations` (ancla del cruce). Sin escritura.
- Invariantes que no se pueden romper (**boundary + honestidad, load-bearing**):
  - El scorecard se resuelve por `organization_id` (+ el sujeto `entity|url|author`) — el input resuelve su `organization_id`, y con ESE org se leen ambos lados (señales + rater). Cero JOIN SQL entre E-E-A-T/`grader_*` y `seo_*`; son **dos reads separados unidos en memoria**.
  - Cero FK cross-motor, cero VIEW/tabla que mergee E-E-A-T con `seo_*`. E-E-A-T es una capa de entidad/calidad que ambos motores **referencian por `org`** (§16), no una tabla que los fusione.
  - **Medido (●) vs evaluado (◑) es sagrado:** cada señal en el payload lleva su marcador; las señales duras (medibles) NUNCA se colapsan con los pilares cualitativos (juicio de rater). El score NUNCA es un número opaco que oculte de qué señal sale ni si es dura o de juicio.
  - Cero promedio ciego: los 4 pilares + su evidencia nombrada se mantienen individualmente inspeccionables; jamás un único número que fusione medido+evaluado.
  - Anti falso-0 (lección EPIC-021): señal ausente / pilar con confianza baja → `insufficient_data`, NUNCA `0` ni falsa precisión. Posture YMYL más estricto preservado del rater (`TASK-1316`).
  - Derived read efímero: NO se materializa el scorecard (no hay `eeat_scorecard_snapshots`); es report layer, se computa on-read.
  - Degradación honesta: falta extracción → `no_signals`; falta rater → `no_rater`; datos insuficientes → `insufficient_data`; NUNCA `0` ni scorecard fabricado.
  - Cero escritura, cero payroll/finance.
- Tenant/space boundary: el sujeto (`entity|url|author`) se ancla a `organizationId` server-side; ambos lados (señales + rater) se leen con ESE `organization_id` (no con otro). El gate `growth.ai_visibility.observation.read` se valida; un caller sin acceso a las observaciones/scores de esa org degrada honesto, no expone datos E-E-A-T ajenos.
- Idempotency/concurrency: N/A (read-only puro, sin write, sin lock).
- Audit/outbox/history: N/A (read-only; sin outbox). La observabilidad es logging + `captureWithDomain` en el catch.

### Migration, backfill and rollout

- Migration posture: `none` (reader puro compositivo; sin schema, sin migración, sin backfill — las tablas/extractores/rater los crean las deps).
- Default state: `flag OFF` (el flag del grader / E-E-A-T que gobiernan las deps `TASK-1315/1316`); el reader existe pero ningún consumer lo llama hasta integrarse en `TASK-1314` / grader / UI follow-up. [verificar nombre exacto del flag en Discovery — registrar en `FEATURE_FLAG_STATE_LEDGER.md` si aplica].
- Backfill plan: N/A.
- Rollback path: revert PR (read-only, sin efecto persistente).
- External coordination: ninguna (sin provider, sin secret, sin cron, sin cutover — no gasta cuota LLM porque compone reads/veredictos ya calculados por las deps).

### Security and access

- Auth/access gate: `growth.ai_visibility.observation.read` (gate de lectura de observaciones/scores del grader) — reusar, NO duplicar autorización. Por-org (`module_assignments`), no por rol. Se apoya en los gates que las deps ya aplican (el reader compone reads ya gateados) + valida el suyo propio en el entrypoint. [verificar que este gate cubre la lectura de señales E-E-A-T + veredicto del rater].
- Sensitive data posture: sin PII de colaboradores, sin secretos, sin finance. Señales de entidad/autor/trust del sitio de la propia org + scores E-E-A-T. **Nota author-level:** los datos de autor son públicos (author page / `sameAs` / credenciales publicadas), no PII interna; aun así, no exponer datos de autor de orgs ajenas (tenant boundary).
- Error contract: `{ ok: false, errorCode, status }` canónico (es-CL en la UI); errores capturados con `captureWithDomain(err, 'growth'|'ai', ...)`, NUNCA raw error al cliente ni `Sentry.captureException` directo.
- Abuse/rate-limit posture: N/A adicional (read-only sobre señales/veredictos ya calculados; sin call a provider externo — no gasta cuota LLM ni DataForSEO).

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit tests de la composición (4 pilares con evidencia nombrada correcta), del marcador **medido-vs-evaluado** por señal (test que falla si medido y evaluado se colapsan), de la **ausencia de falso-0** (señal faltante / confianza baja → `insufficient_data`, NUNCA `0`), de los huecos + recomendaciones por combinación de pilares, de la degradación honesta por lado (`no_signals`/`no_rater`), y del boundary (cero SQL que una E-E-A-T/`grader_*` con `seo_*` — la composición es en memoria).
- DB/runtime checks: esta task idealmente NO lleva SQL propio (compone reads de las deps). Si emerge SQL directo, validarlo contra PG real (gate TASK-893, cuidado DATE vs TIMESTAMPTZ). Ejercer `readEeatScorecard` en staging contra una org con ambos lados (señales + rater) y contra orgs a las que les falta cada lado.
- Integration checks: N/A (sin provider externo directo — el LLM del rater lo llama `TASK-1316`, no esta task).
- Reliability signals/logs: sin signal nueva (read-only); log del path de degradación por lado.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **toca una capability existente** (`growth.ai_visibility.observation.read` — el gate de lectura de observaciones/scores del grader, reusado para leer las señales E-E-A-T + el veredicto del rater). Aplica el gate con regla *touch-it/fix-it*:

- [ ] **Lógica en el primitive, no en la UI.** La composición señales+rater, el mapeo a los 4 pilares con evidencia nombrada, el marcador medido-vs-evaluado, los huecos y las recomendaciones viven en `readEeatScorecard` + su función pura de composición (`src/lib/growth/ai-visibility/**`), NUNCA en el componente del scorecard (UI follow-up) ni en el consumer SEO/AEO. La UI y los dos consumers solo leen el resultado.
- [ ] **Modelada como reader canónico**, no como fetch acoplado a la pantalla del scorecard ni a `readPillarClusterHealth`.
- [ ] **Read** expuesto como reader canónico con shape + latencia estables (`{ ok }`); sin write (esta task no muta nada), así que el sub-check de command semantics es N/A por diseño.
- [ ] **Capability + grant:** reusa `growth.ai_visibility.observation.read` (ya seedeada + con grant, `runtime.ts:194`); verificar que el gate aplica a la lectura E-E-A-T y que su coverage test sigue verde. NO introduce capability nueva.
- [ ] **Camino programático declarado:** reader consumible por **dos consumers** (`TASK-1314` SEO + el grader/AEO) + UI follow-up + Nexa + MCP; ninguno es el SoT del scorecard — todos leen el mismo primitive.
- [ ] **`propose → confirm → execute`:** N/A (read-only; sin write gobernado).
- [ ] **Un primitive, muchos consumers:** SEO (`TASK-1314`), AEO (grader), UI, Nexa, MCP leen el mismo `readEeatScorecard`; cero re-implementación de la composición señales+rater en ningún consumer.
- [ ] **Parity check = SÍ:** el scorecard E-E-A-T tiene contrato gobernado (reader por-org, gate reusado) → todos los consumers lo operan por construcción, sin romper el boundary ni la honestidad medido-vs-evaluado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract + composición boundary-safe (señales + rater)

- `EeatScorecardResult` + tipos de pilar/evidencia/marcador/hueco en `src/lib/growth/ai-visibility/eeat/contracts.ts`: `{ ok: true, subject, range, pillars: { experience, expertise, authoritativeness, trustworthiness }, evidence: [{ pillar, signal, marker: 'measured'|'evaluated', detail }], measuredVsEvaluated, gaps: [...], recommendations: [...], evolution } | { ok: false, errorCode, status }`.
- `readEeatScorecard({ organizationId, entity|url|author, range })` en `src/lib/growth/ai-visibility/eeat/read-eeat-scorecard.ts`:
  1. Resolver el sujeto (`entity|url|author`) → `organization_id` server-side + validar `growth.ai_visibility.observation.read`. Sujeto desconocido → `{ ok: false, errorCode: 'unknown_subject' }`.
  2. **Lado medido (●):** leer las señales E-E-A-T (entity + author + trust) vía el extractor de `TASK-1315`. Sin señales → `{ ok: false, errorCode: 'no_signals' }`.
  3. **Lado evaluado (◑):** con ESE `organization_id` + sujeto, leer el veredicto del rater (4 pilares + confianza) vía `TASK-1316` + su gate. Sin veredicto → `{ ok: false, errorCode: 'no_rater' }`.
  4. **Composición en memoria por `organization_id` (+ sujeto)** — dos reads separados, cero JOIN SQL entre E-E-A-T/`grader_*` y `seo_*`.
- Tests: boundary (cero SQL que una las tablas), degradación honesta por lado faltante (`no_signals`/`no_rater`), gate aplicado, tenant boundary (sujeto de otra org rechazado).

### Slice 2 — Scorecard por pilar: evidencia nombrada + medido-vs-evaluado + huecos/recomendaciones

- Función pura `scorecard-compose.ts`: `(signals, raterVerdict) → { pillars, evidence, measuredVsEvaluated, gaps, recommendations }`. Cada pilar (Experience · Expertise · Authoritativeness · Trustworthiness) lleva **evidencia nombrada** (qué señal concreta lo sostiene) y cada señal su marcador **medido (●) vs evaluado (◑)**; el resultado NUNCA colapsa medido y evaluado ni promedia los pilares en un número opaco (hereda la disciplina de ejes de `TASK-1305`).
- Detección de huecos accionables + recomendaciones desde pilares/señales: p. ej. `sin author schema` (author-level), `sin about/contact/policies` (trust), `entidad no reconocida por KG` (authoritativeness), `expertise sin credenciales`, `sin reviews/HTTPS`. YMYL sube el listón (recomendaciones más estrictas cuando el sujeto es finanzas/salud/legal).
- Anti falso-0: pilar con confianza bajo umbral → marcado `insufficient_data` explícito, NUNCA `0`.
- Tests: cada pilar con su evidencia nombrada desde combinaciones controladas; verificación de que medido y evaluado NUNCA se colapsan (falla si el output pierde el marcador); verificación de que un pilar de baja confianza sale `insufficient_data`, no `0`; verificación YMYL (listón más estricto).

### Slice 3 — Evolución temporal del scorecard + integración a los dos consumers

- Extender `readEeatScorecard` para servir la **evolución temporal** del scorecard (pilares/huecos) sobre el `range` pedido (la película, no la foto), reusando la dimensión temporal que el rater/las señales exponen. Cero materialización — se computa on-read.
- **Integración consumer SEO (`TASK-1314`):** exponer el scorecard en el shape que `readPillarClusterHealth` consume como **señal de autoridad/calidad** para el `topicalAuthorityScore` + recomendaciones — el scorecard entra como una señal nombrada más, sin fusionarse con las otras 4 de topical authority. [coordinar el shape con `TASK-1314` en Discovery].
- **Integración consumer AEO (grader):** declarar el punto de consumo del grader para **entity clarity** (el mismo reader, sin fork). [verificar el consumer AEO exacto en Discovery].
- Tests: serie temporal correcta del scorecard sobre el rango (sin puntos fabricados con `0`); test de que ambos consumers leen el mismo reader (cero re-implementación); test de integración con el shape que `TASK-1314` espera.

## Out of Scope

- UI del scorecard E-E-A-T por entidad/página/autor (follow-up ui-ux, §16 — "Consumer UI = follow-up ui-ux"). NO en scope.
- Cualquier **captura/extracción nueva** de señales (`TASK-1315`) o **evaluación** del rater (`TASK-1316`) — son dependencias, NO scope. Esta task **compone**, no mide ni evalúa.
- Materializar el scorecard (NO se crea `eeat_scorecard_snapshots`; es derived read efímero por diseño).
- Cualquier escritura, cron, provider externo o migración (el LLM del rater lo llama `TASK-1316`).
- Cambios en el motor AEO/grader, en el probe layer, en `evals/`/`accuracy/` o en su gate (se reusan tal cual).
- Cambios en `readPillarClusterHealth` (`TASK-1314`) más allá de coordinar el shape de la señal que se le entrega — su composición es scope de esa task.
- Recomendaciones/CTAs con acción automática (esta task emite recomendaciones textuales por hueco; ejecutarlas es otra capa).

## Detailed Spec

Ver el contrato en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` **§16** (E-E-A-T — la fuente de verdad de esta task), §1.1 (boundary), §15.1 (topical authority — el consumer SEO) y §7 (readers). Puntos load-bearing:

- **El boundary + la honestidad SON la task.** El error más caro que un agente puede cometer acá es "optimizar" el scorecard fusionando las señales medidas (`TASK-1315`) con el veredicto del rater (`TASK-1316`) en un número único — o materializar una VIEW/tabla `eeat_scorecard` que mergee E-E-A-T con `seo_*`/`grader_*`. Lo primero **borra la distinción medido-vs-evaluado** que §16 declara sagrada y **repite el falso-0** del grader (corregido en EPIC-021); lo segundo viola §1.1 y acopla motores que deben permanecer aislados. El scorecard canónico son **dos reads independientes** (señales + rater, cada uno con su gate) **unidos en memoria por `organization_id` (+ sujeto)**. Nada de FK, nada de merge, nada de promedio que oculte de dónde sale.
- **Medido (●) vs evaluado (◑), sagrado.** Las señales duras (¿entidad en KG? ¿author schema presente? ¿HTTPS/about/contact?) son **medibles** y se marcan ●; los pilares cualitativos (¿cuánta Experience/Expertise transmite el contenido?) son **juicio de rater LLM** y se marcan ◑, con confianza calibrada. El payload los mantiene **distinguibles por construcción** — nunca una marca única. "Este sitio tiene author schema (●) pero el rater no ve expertise real en el contenido (◑, confianza media)" es exactamente el tipo de fila que el scorecard debe poder mostrar.
- **Anti falso-0 (lección EPIC-021).** Una señal ausente o un pilar con confianza baja NO es un `0`: es `insufficient_data`. El rater (`TASK-1316`) ya trae confianza calibrada + golden-set; esta task **preserva** ese posture — NUNCA fabrica un pilar ni fuerza un score. YMYL (finanzas/salud/legal) exige el listón más estricto que el rater ya aplica; el scorecard no lo relaja.
- **Un primitive, dos consumers (§16).** El mismo `readEeatScorecard` alimenta el `topicalAuthorityScore` de `TASK-1314` (SEO — como señal de autoridad/calidad, sin fusionarse con las 4 señales de topical authority) **y** la entity clarity del grader (AEO). Ningún consumer re-implementa la composición; ambos leen el reader. Es la capa conectiva que junta SEO+AEO **por la entidad**, no por merge de tablas.
- **Reuso, no re-implementación.** El lado medido reusa el extractor de `TASK-1315` (que a su vez reusa el probe layer eje `entity` de `TASK-1267` + structural + brand-intelligence); el lado evaluado reusa el rater de `TASK-1316` (que reusa `brand-intelligence/` + `evals/` + `accuracy/`); la disciplina de "sin dato → `null`/errorCode, jamás `0`" reusa el patrón de `store.ts`. Esta task es principalmente **composición gobernada + una función pura de scorecard**, no SQL nuevo — y si emerge SQL, se valida contra PG real (gate TASK-893).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract + composición boundary-safe señales+rater) → Slice 2 (scorecard por pilar: evidencia nombrada + medido-vs-evaluado + huecos) → Slice 3 (evolución temporal + integración a los dos consumers). Slice 2 consume los dos lados que Slice 1 arma; Slice 3 consume el scorecard de Slice 2. Los tres slices son read-only y aditivos; el orden es de composición, no de riesgo runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente fusiona señales medidas × veredicto del rater en un número opaco → borra medido-vs-evaluado + repite falso-0 | growth | medium | regla dura §16 documentada + test que falla si el marcador `measured`/`evaluated` se pierde + review | test + code review |
| Un agente une E-E-A-T/`grader_*` × `seo_*` con JOIN/VIEW → viola boundary §1.1 | growth | medium | regla dura documentada + test que verifica cero SQL cross-tabla (composición en memoria por `org` + sujeto) + review | code review + test de boundary |
| Ceros fantasma / falsa precisión cuando falta una señal o el pilar tiene baja confianza (repetir falso-0 EPIC-021) | data | medium | degradación honesta `no_signals`/`no_rater`/`insufficient_data`; NUNCA `0`; posture YMYL del rater preservado | test dedicado |
| Un consumer (SEO `TASK-1314` o AEO) re-implementa la composición señales+rater en vez de leer el reader | growth | medium | "un primitive, dos consumers" documentado + test de que ambos consumers leen `readEeatScorecard`; shape de la señal coordinado con TASK-1314 | code review |
| Exponer señales/scores E-E-A-T (incl. datos de autor) de una org ajena por mal binding del sujeto | growth | low | sujeto `entity|url|author → organization_id` server-side + gate `growth.ai_visibility.observation.read` por-org; ambos lados usan ESE org | test de tenant boundary |
| SQL nuevo con `EXTRACT(EPOCH FROM DATE-DATE)` si un reader queryea directo | data | low | preferir reuso de reads (idealmente cero SQL propio); si hay SQL, `capture_date`/`effective_from/to`=DATE / `*_at`=TIMESTAMPTZ validado contra PG real | Sentry + lint rule |

### Feature flags / cutover

- Behind el flag del grader / E-E-A-T que gobiernan las deps `TASK-1315/1316` (default OFF). Reader read-only sin cutover propio; se habilita cuando E-E-A-T se integra en `TASK-1314` / el grader / la UI follow-up. Ningún consumer lo llama hasta esa integración. [verificar el nombre exacto del flag en Discovery + registrar en `FEATURE_FLAG_STATE_LEDGER.md` si es un `*_ENABLED` nuevo].

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (reader read-only, sin efecto persistente) | <5 min | si |
| Slice 2 | revert PR (función pura de composición) | <5 min | si |
| Slice 3 | revert PR (reader read-only + integración additive) | <5 min | si |

### Production verification sequence

1. En staging con el flag E-E-A-T ON: `readEeatScorecard` sobre una org con **ambos lados** (señales extraídas + veredicto del rater) → verificar los 4 pilares con evidencia nombrada + el marcador **medido (●) vs evaluado (◑)** por señal + huecos + recomendaciones + cero SQL cross-tabla (revisar código / query plan).
2. `readEeatScorecard` sobre una org **sin señales extraídas** → `{ ok: false, errorCode: 'no_signals' }`, NUNCA ceros.
3. `readEeatScorecard` sobre una org **con señales pero sin veredicto de rater** → `{ ok: false, errorCode: 'no_rater' }`.
4. Verificar anti falso-0: un pilar con confianza bajo umbral sale `insufficient_data`, NUNCA `0` ni un score fabricado; verificar que un sujeto YMYL aplica el listón más estricto del rater.
5. Verificar la honestidad medido-vs-evaluado con datos reales: una señal dura (author schema presente, ●) y un pilar de juicio (expertise, ◑) coexisten **distinguibles** en el payload, no colapsados.
6. Verificar el binding sujeto → `organization_id` server-side y que un caller sin gate no ve señales/scores E-E-A-T (incl. datos de autor) de orgs ajenas (degrada honesto).
7. Verificar la **integración a los dos consumers**: `readPillarClusterHealth` (`TASK-1314`) recibe el scorecard como señal nombrada de autoridad/calidad (sin fusionarla) y el grader/AEO lo consume para entity clarity — ambos leyendo el mismo reader.
8. `readEeatScorecard` con `range` largo → evolución temporal del scorecard correcta, sin puntos fabricados con `0`.
9. Prod vía release control plane cuando EPIC-022 se secuencie (read-only, additive).

### Out-of-band coordination required

- Ninguna runtime (read-only; sin provider, sin secret, sin cron, sin migración, sin consent — no gasta cuota LLM porque compone reads/veredictos ya calculados). Solo confirmar en Discovery que: (a) `growth.ai_visibility.observation.read` cubre la lectura E-E-A-T; (b) los readers de `TASK-1315` (señales) y `TASK-1316` (rater) exponen el shape esperado (incl. el campo de confianza + el marcador de "medido"); (c) el shape de la señal que consume `readPillarClusterHealth` (`TASK-1314`) está acordado; (d) el punto de consumo AEO (entity clarity del grader) está identificado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `readEeatScorecard({ organizationId, entity|url|author, range })` existe en `src/lib/growth/ai-visibility/**`, gateado por `growth.ai_visibility.observation.read`, con shape `{ ok: true, subject, range, pillars, evidence, measuredVsEvaluated, gaps, recommendations, evolution } | { ok: false, errorCode, status }`.
- [ ] **Boundary duro verificado:** la composición es por `organization_id` (+ sujeto) con **dos reads separados unidos en memoria** (señales `TASK-1315` + rater `TASK-1316`); CERO JOIN SQL / VIEW / FK entre E-E-A-T/`grader_*` y `seo_*` (verificado por test + review).
- [ ] **Medido (●) vs evaluado (◑) sagrado:** cada señal en el payload lleva su marcador; las señales duras NUNCA se colapsan con los pilares de juicio; NUNCA un número opaco que oculte de qué señal sale ni si es dura o de juicio.
- [ ] **Anti falso-0:** señal ausente o pilar con confianza baja → `insufficient_data`, NUNCA `0` ni falsa precisión; posture YMYL más estricto del rater preservado.
- [ ] Los 4 pilares (Experience · Expertise · Authoritativeness · Trustworthiness) con **evidencia nombrada** por pilar + huecos accionables + recomendaciones, sobre el rango pedido.
- [ ] Evolución temporal del scorecard sobre el `range` (on-read, sin materialización).
- [ ] **Un primitive, dos consumers verificado:** el mismo `readEeatScorecard` alimenta el `topicalAuthorityScore` de `TASK-1314` (SEO, como señal nombrada sin fusionarse) **Y** la entity clarity del grader (AEO); cero re-implementación de la composición en ningún consumer.
- [ ] Degradación honesta: sin señales → `no_signals`; sin rater → `no_rater`; datos insuficientes → `insufficient_data`; NUNCA `0` ni scorecard fabricado.
- [ ] Reusa el extractor de señales (`TASK-1315`), el rater (`TASK-1316`) y el patrón de degradación de `store.ts`; no re-implementa ni duplica autorización.
- [ ] Tenant boundary: sujeto `entity|url|author → organization_id` server-side; sin fuga de señales/scores E-E-A-T (incl. datos de autor) de orgs ajenas.
- [ ] Read-only puro: sin escritura, sin migración, sin materialización del scorecard.
- [ ] Flag E-E-A-T respetado (default OFF).
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes; si hay SQL propio, validado contra PG real (gate TASK-893).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Ejercer `readEeatScorecard` en staging contra una org con ambos lados (señales + rater), una sin señales (`no_signals`), una sin rater (`no_rater`) y un pilar de baja confianza (`insufficient_data`); verificar boundary (cero cross-tabla SQL), medido-vs-evaluado distinguible, anti falso-0, evidencia nombrada por pilar, la integración a los dos consumers y la evolución temporal.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (`TASK-1314` consume este reader como señal de topical authority; el grader/AEO lo consume para entity clarity; la UI del scorecard es follow-up)
- [ ] documentación técnica del scorecard E-E-A-T + del boundary "compone, no fusiona" + de la honestidad medido-vs-evaluado (arquitectura del dominio SEO §16 + §7)

## Follow-ups

- Consumer UI del scorecard E-E-A-T por entidad/página/autor (ui-ux) — consume `readEeatScorecard` (§16: "Consumer UI = follow-up ui-ux"). **En Follow-ups, NO en scope.**
- Recommendation layer: convertir los huecos accionables en CTAs cruzados (p. ej. "añade `Person`/`Author` schema", "publica about/contact/policies", "consigue entrada en Wikidata") — posible task derivada.
- Evaluar exponer `readEeatScorecard` como recurso `api/platform/app` explícito para Nexa/MCP si el consumo lo justifica.
- Si el consumer AEO (entity clarity del grader) requiere un shape distinto al del consumer SEO, evaluar un adapter fino sobre el mismo reader (sin forkear la composición).

## Open Questions

1. ¿El eje del scorecard es la **entidad-marca**, la **página (url)** o el **autor (author)** — o los tres en un mismo reader con `subject` discriminado? Propuesta: un reader con `subject: { kind: 'entity'|'url'|'author', ref }`; resolver el shape del sujeto contra los readers reales de `TASK-1315/1316` en Discovery.
2. ¿El gate del lado E-E-A-T es exactamente `growth.ai_visibility.observation.read` o las deps introdujeron una capability E-E-A-T específica? Confirmar contra el gate que aplican `TASK-1315/1316` en Discovery (evitar duplicar autorización).
3. ¿La **evidencia nombrada** por pilar la provee ya el rater (`TASK-1316` mapea señal→pilar con su evidencia) o esta task la re-mapea desde las señales crudas de `TASK-1315`? Propuesta: reusar el mapeo del rater y solo componer/presentar; resolver contra el shape del veredicto.
4. ¿El scorecard entra al `topicalAuthorityScore` de `TASK-1314` como **una** señal nombrada más (5.ª señal junto a cobertura/estructura/rendimiento/autoridad-AEO) o como un **modificador** de las existentes? Propuesta: 5.ª señal nombrada (preserva "sin fusionar"); coordinar con `TASK-1314` al integrar.
5. ¿El nombre exacto del flag E-E-A-T (default OFF) y si es un `*_ENABLED` nuevo que debe ir al `FEATURE_FLAG_STATE_LEDGER.md`? Confirmar en Discovery (heredado de `TASK-1315/1316`).
