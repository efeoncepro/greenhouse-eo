# TASK-1315 — Growth E-E-A-T: Signal Extraction (entity + author + trust)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
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
- Blocked by: `TASK-1267`
- Branch: `task/TASK-1315-growth-eeat-signal-extraction-entity-author-trust`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra la **materia prima** que le falta a la capa E-E-A-T del 360 (§16 del doc maestro SEO). La marca ya se captura: la **entidad-marca** (Knowledge Graph / Wikidata / Reddit, eje `entity` de TASK-1267), el **JSON-LD** (`probes/structural/json-ld.ts`) y el **contenido real del sitio leído por LLM** (`brand-intelligence/`) YA existen y cubren ~70% de las señales E-E-A-T. Esta task suma solo lo que **falta**: (a) la **capa de AUTOR como sub-entidad** — extraer `Person`/`Author` schema, author pages, `sameAs`, credenciales (E-E-A-T 2026 es cada vez más author-level; hoy se modela la entidad-marca, no la entidad-autor); (b) **probes de trust explícitos** — about/contact/policies/reviews markup/HTTPS. Son **probes read-only nuevos** que reusan el fetcher SSRF-guarded (`safe-fetch`) + el parser JSON-LD (`probes/html.ts`) + el fetcher externo host-allowlisted (`entity-fetch.ts`), persistidos por el **probe store existente** (`grader_probe_results`). NO reinventa la entidad-marca — la extiende con los dos ejes de señal que aún no captura. El **assessment** de esas señales (rúbrica 4 pilares) es TASK-1316; esta task solo **extrae y persiste señales medibles**.

## Why This Task Exists

E-E-A-T (Experience · Expertise · Authoritativeness · Trustworthiness) es el "por qué" debajo de rankear (SEO) **y** de ser citado (AEO): una entidad fuerte hace ambas (§16). El grader ya tiene el 70% de la evidencia — pero le faltan dos piezas que en 2026 son load-bearing: el **autor** y el **trust explícito**. (1) Google Quality Rater Guidelines evalúan cada vez más a nivel de *autor* (quién firma el contenido, sus credenciales, su presencia verificable con `sameAs`), especialmente en YMYL; el grader hoy solo ve la marca, no la persona detrás del contenido. (2) Las señales de *trust* (¿hay página de contacto?, ¿about con identidad real?, ¿políticas?, ¿reviews con schema?, ¿HTTPS?) son la base del pilar Trustworthiness y hoy no se prueban de forma explícita. Sin estas dos capas de señal, el rater de TASK-1316 no tendría de dónde derivar Experience/Authoritativeness/Trustworthiness con evidencia medible — tendría que inventarlas (falsa precisión, justo lo que §16 prohíbe). Esta task fija la **materia prima medible** para que el assessment cualitativo se apoye en `●` (medido) y no en aire.

## Goal

- **Author probe(s)** (eje de señal autor) en `src/lib/growth/ai-visibility/probes/**`: extraer del HTML del sujeto la presencia de `Person`/`Author` schema (JSON-LD), author bylines/pages, `sameAs` (perfiles verificables), y credenciales declaradas — reusando el parser JSON-LD existente + el fetcher SSRF-guarded. Honest degradation `null ≠ 0`.
- **Trust probe(s)** (eje de señal trust): about/contact discoverability, policies (privacy/terms), `Review`/`AggregateRating` schema markup, HTTPS/canonical — probes read-only sobre superficies públicas del sujeto.
- **Persistencia** en el probe store existente (`grader_probe_results`) reusando `upsertProbeResults`/`getProbeResults`; sin tabla nueva salvo que el eje lo exija [verificar en `probes/store.ts` + migración `grader_probe_results`].
- **Gate de acceso:** reusa el gate de observación/probes existente (`growth.ai_visibility.observation.read` para reads), sin duplicar autorización.
- **Behind flag** (default OFF), aditivo sobre el probe layer; sin el flag, cero cambio en el run.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§16 (E-E-A-T — capa de entidad/calidad conectiva, fuente de verdad)**: la materia prima ya existe (~70%), el gap es autor + trust + rúbrica; la evaluación vive **cerca del grader** (extiende su eje entity + suma autor + rúbrica), el módulo SEO la **consume**; **§1.1 (boundary duro NUNCA/SIEMPRE)** — es una capa de entidad/calidad que ambos motores referencian por `org`, NO una tabla que los fusione; §15.1 (E-E-A-T como multiplicador de topical authority).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — modelo del grader + probe layer (`grader_probe_results`, ejes ortogonales al de percepción).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — probe/reader como primitive canónico consumible por el rater (TASK-1316) + report + Nexa + MCP.
- `CLAUDE.md §"AI image + LLM providers"` / §"Secret Manager Hygiene" — la API key del Knowledge Graph (y cualquier secret nuevo) se resuelve server-side vía `*_SECRET_REF`; NUNCA hardcodear.
- `CLAUDE.md §"SQL Signal Reader Schema Validation Gate"` — si el eje agrega columnas/reader SQL, validar contra PG real; `*_at`=TIMESTAMPTZ.

Reglas obligatorias (§16 + probe layer invariants):

- **NUNCA reinventar la entidad-marca.** KG/Wikidata/Reddit (TASK-1267) + JSON-LD (json-ld.ts) + brand-intelligence YA existen. Esta task suma **autor** + **trust**, NO re-implementa el backbone de marca.
- **NUNCA `score: 0` cuando no se probó** (honest degradation `null ≠ 0`, invariante del probe layer `probes/contracts.ts`): señal no medible (red/timeout/no HTML) → `status='skipped'|'failed'`, `score: null` + `reason`, excluida del promedio. Ausencia MEDIDA (HTML OK sin author schema) → `score: 0` (gap real).
- **NUNCA mutar el sitio del sujeto ni tocar endpoints privados.** Read-only sobre superficies públicas; el fetcher del sujeto mantiene el SSRF guard; el fetcher externo mantiene la allowlist de hosts.
- **NUNCA loggear PII ni secretos** en `evidence` (public-safe: conteos, presencia de schema, status codes). Una credencial/nombre de autor NO es secreto, pero el detalle sensible va a observabilidad, no al cliente.
- **SIEMPRE** exponer las señales como probes/readers canónicos (report layer), consumibles por el rater (TASK-1316) — un primitive, muchos consumers.
- **SIEMPRE** degradar honesto si una fuente falta; el rater decide `insufficient_data`, esta task solo entrega la evidencia con su estado.

## Normative Docs

- `src/lib/growth/ai-visibility/probes/contracts.ts` — contrato del probe (`Probe`, `ProbeContext`, `ProbeOutcome`, `PROBE_KINDS`, `PROBE_AXES`, honest degradation `null ≠ 0`, `NO_ENTITY_CONTEXT_OUTCOME`). Los probes nuevos implementan `Probe` (kind + axis + `run`) igual que los existentes.
- `src/lib/growth/ai-visibility/probes/structural/json-ld.ts` — patrón canónico de probe que parsea JSON-LD del HTML (reusa `extractJsonLdBlocks`/`flattenJsonLdNodes`/`jsonLdTypes` de `probes/html.ts`). El author probe reusa este parser para detectar `Person`/`Author`/`sameAs`.
- `src/lib/growth/ai-visibility/probes/entity/{knowledge-graph,wikidata,reddit-ugc}.ts` — patrón de probe de entidad (fetcher externo host-allowlisted, honest degradation, evidencia public-safe). Referencia para el estilo; el eje autor puede necesitar señales externas (`sameAs` verificable) o quedarse en el HTML del sujeto [verificar en Discovery].
- `src/lib/growth/ai-visibility/probes/entity-fetch.ts` — `createEntityApiFetcher` + `ENTITY_API_ALLOWED_HOSTS` (allowlist). Si el trust/author probe verifica `sameAs` contra hosts externos, EXTENDER esta allowlist, NUNCA fetch arbitrario.
- `src/lib/growth/ai-visibility/probes/safe-fetch.ts` — `createProbeFetcher` + `resolveSubjectSite` (SSRF-guarded, read-only al host del sujeto). Los probes de trust/author sobre el sitio propio reusan este fetcher [verificar path exacto].
- `src/lib/growth/ai-visibility/probes/store.ts` — `upsertProbeResults`/`getProbeResults` (idempotente por `(run_id, probe_kind)`). La persistencia de los probes nuevos pasa por acá; `probe_kind` es TEXT libre (sin CHECK) → los kinds nuevos NO requieren cambio de schema; `axis` tiene CHECK (structural/agentic/entity) → un eje nuevo requiere migración additive del CHECK [verificar].
- `src/lib/growth/ai-visibility/probes/registry.ts` — `createProbeRegistry(axes)` ensambla los probes por eje habilitado por flag. Los probes nuevos se registran acá bajo su eje + su flag.
- `src/lib/growth/ai-visibility/flags.ts` — patrón canónico de flags default-OFF del grader (`isEntityProbesEnabled` aditivo sobre `isProbesEnabled`). El flag del eje autor/trust espeja este patrón.
- `src/lib/growth/ai-visibility/brand-intelligence/fetch-site-content.ts` — ya lee prosa del sitio (home + about) read-only; el author/trust probe puede reusar `htmlToReadableText`/`resolveSubjectSite` para detectar author bylines / about, sin re-fetchear ciegamente.

## Dependencies & Impact

### Depends on

- `TASK-1267` — eje `entity` (KG/Wikidata/Reddit) + `EntityProbeContext` + `entity-fetch` allowlist + migración del CHECK `axis` a 3 valores. **Bloqueador duro**: la capa autor/trust extiende la fundación de entidad de TASK-1267 (fetcher externo, honest degradation, contexto de marca). Sin ella no hay substrate donde colgar los probes nuevos.
- Probe layer TASK-1266 (`grader_probe_results` + gatherer + `Probe` contract + registry + safe-fetch + html parser) — ya en producción (behind flag), reusado tal cual.
- `brand-intelligence/` (TASK-1288) — lectura de contenido del sitio; reusada para detectar autor/about sin re-fetch redundante (opcional).

### Blocks / Impacts

- Bloquea `TASK-1316` (E-E-A-T Rater — rúbrica 4 pilares) — el rater mapea ESTAS señales (autor + trust) + las de marca (entity + JSON-LD + brand-intelligence) a los pilares. Sin la materia prima medible, el rater no tiene evidencia `●`.
- Alimenta `TASK-1317` (`readEeatScorecard` + integración a topical authority §15.1 / 360) vía TASK-1316.
- Es la extensión de señal que hace real la capa E-E-A-T del pitch "Search Visibility 360" (§16 del doc maestro).

### Files owned

- `src/lib/growth/ai-visibility/probes/entity/author.ts` [nuevo — probe(s) de autor: Person/Author schema, bylines, sameAs, credenciales] [verificar eje: `entity` vs eje nuevo `authority`]
- `src/lib/growth/ai-visibility/probes/structural/trust-signals.ts` [nuevo — probe(s) de trust: about/contact/policies/reviews/HTTPS]
- `src/lib/growth/ai-visibility/probes/entity/index.ts` / `probes/structural/index.ts` [extendidos — registrar los probes nuevos]
- `src/lib/growth/ai-visibility/probes/registry.ts` [extendido — ensamblar el eje nuevo por flag]
- `src/lib/growth/ai-visibility/probes/contracts.ts` [extendido — agregar los `PROBE_KINDS` nuevos + (si aplica) el eje al `PROBE_AXES`]
- `src/lib/growth/ai-visibility/flags.ts` [extendido — flag del eje autor/trust, default OFF]
- `src/lib/growth/ai-visibility/probes/entity-fetch.ts` [extendido SOLO SI el trust/author probe verifica `sameAs` contra hosts externos — ampliar allowlist]
- `migrations/*_task-1315-*.sql` [nuevo SOLO SI se agrega un eje nuevo al CHECK `axis` de `grader_probe_results`; los `probe_kind` nuevos NO requieren migración]
- `src/lib/growth/ai-visibility/probes/**/__tests__/*.test.ts` [nuevos]

## Current Repo State

### Already exists

- **Entidad-marca (eje `entity`, TASK-1267):** `probes/entity/knowledge-graph.ts` (¿entidad KG?), `wikidata.ts` (entrada estructurada + sitio oficial P856), `reddit-ugc.ts` (reputación/menciones UGC) — con `EntityProbeContext`, fetcher host-allowlisted (`entity-fetch.ts`), honest degradation.
- **Structural (eje `structural`, TASK-1266):** `probes/structural/json-ld.ts` (schema.org en HTML, con parser `probes/html.ts`), robots-txt, llms-txt, sitemap, core-web-vitals.
- **Contenido del sitio leído por LLM:** `brand-intelligence/` (`fetch-site-content.ts` + providers + prompt + store + router) — lee y analiza prosa real del sitio (home + about), 1×/marca/versión, cacheado.
- **Probe substrate:** `grader_probe_results` (tabla, `probe_kind` TEXT libre + `axis` CHECK structural/agentic/entity), `store.ts` (upsert idempotente), `registry.ts` (ensamble por eje/flag), `contracts.ts` (`Probe`/`ProbeContext`/honest degradation), `safe-fetch.ts` (SSRF), `entity-fetch.ts` (allowlist externa).
- **Backlinks/referring domains** (TASK-1304) — señal de authoritativeness ya cubierta por el módulo SEO (fuera de esta task, la referencia el rater).

### Gap

- **No hay capa de AUTOR.** Nadie extrae `Person`/`Author` schema, author pages/bylines, `sameAs` ni credenciales. E-E-A-T 2026 es author-level y el grader solo ve la marca.
- **No hay probes de trust EXPLÍCITOS.** El JSON-LD probe ve `Organization`, pero nadie prueba about/contact discoverability, policies (privacy/terms), `Review`/`AggregateRating` markup ni HTTPS/canonical como señales de Trustworthiness dedicadas.
- Sin estas dos capas de señal medible, el rater E-E-A-T (TASK-1316) no tiene evidencia `●` de dónde derivar Experience/Authoritativeness/Trustworthiness.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (probes read-only nuevos + persistencia via el store existente; sin write mutante de negocio)
- Source of truth afectado: NINGUNO nuevo de negocio. Escribe evidencia recomputable en `greenhouse_growth.grader_probe_results` (derivación idempotente por `(run_id, probe_kind)`, ya existente). No crea SoT paralelo.
- Consumidores afectados: TASK-1316 (rater E-E-A-T), report builder, Nexa/MCP (vía el reader de probes).
- Runtime target: `staging|production` (behind flag; el gatherer corre en el run-engine, inline o worker según `isAsyncExecutionEnabled`).

### Contract surface

- Contrato existente a respetar: `Probe`/`ProbeContext`/`ProbeOutcome` (`probes/contracts.ts`), honest degradation `null ≠ 0`, `upsertProbeResults`/`getProbeResults` idempotentes, `createProbeRegistry(axes)`, SSRF guard del sujeto + allowlist externa, gate `growth.ai_visibility.observation.read`, patrón de flags default-OFF.
- Contrato nuevo o modificado: `PROBE_KINDS` nuevos (p.ej. `author_schema`, `author_presence`, `trust_about_contact`, `trust_policies`, `trust_reviews_markup`, `https_canonical`) [nombres a fijar en Discovery]; (si aplica) un eje nuevo en `PROBE_AXES` (p.ej. `authority`/`trust`) o extensión de uso del eje `entity`; un flag env-var nuevo default OFF.
- Backward compatibility: `gated` (aditivo detrás de flag; sin el flag el run es idéntico; probes nuevos = filas nuevas en una tabla existente, cero cambio para consumers actuales).
- Full API parity: probes → reader canónico (`getProbeResults`) → consumido por el rater (TASK-1316), report y Nexa/MCP. Un primitive, muchos consumers. Ver `## Capability Definition of Done`.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_probe_results` (escribe filas de los kinds nuevos; `probe_kind` TEXT libre no requiere migración). Migración additive SOLO si se introduce un eje nuevo al CHECK `axis` (mismo patrón idempotente que la migración de TASK-1267).
- Invariantes que no se pueden romper:
  - Honest degradation `null ≠ 0`: no medible → `score: null`; ausencia medida → `score: 0`.
  - Read-only sobre superficies públicas; SSRF guard del sujeto + allowlist de hosts externos intactos; cero fetch a host arbitrario.
  - Idempotencia del store: re-ejecutar el mismo probe sobre el mismo run reemplaza (UPSERT por `(run_id, probe_kind)`).
  - `evidence` public-safe: conteos/presencia/status, NUNCA PII cruda ni secretos.
  - NO reinventa la entidad-marca (KG/Wikidata/Reddit/JSON-LD/brand-intelligence se reusan, no se duplican).
  - Cero escritura de payroll/finance; cero mutación del sitio del sujeto.
- Tenant/space boundary: el probe corre en el contexto de un `grader_run` ya autorizado (perfil → org); no expone datos cross-org. El reader de probes hereda el gate de observación del run.
- Idempotency/concurrency: UPSERT idempotente por `(run_id, probe_kind)` (ya en `store.ts`); sin lock adicional (el gatherer corre una vez por run).
- Audit/outbox/history: N/A nuevo (el probe result ES la evidencia append-recomputable; sin outbox). Observabilidad = `captureWithDomain(err, 'growth')` en el fetcher/probe.

### Migration, backfill and rollout

- Migration posture: `none` en el caso base (kinds nuevos sobre `probe_kind` TEXT libre). `additive` SOLO si se agrega un eje nuevo al CHECK `axis` (idempotente, drop+recreate del CHECK como TASK-1267).
- Default state: `flag OFF` (el eje autor/trust no corre hasta prender su flag, aditivo sobre `isProbesEnabled`). Registrar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (gate `docs:closure-check`).
- Backfill plan: N/A (los runs nuevos capturan las señales; re-grade opcional para perfiles existentes vía el path de regrade — no scope de esta task).
- Rollback path: flag OFF → los probes no corren; revert PR (probes aditivos, sin efecto persistente de negocio). Si hubo migración del CHECK `axis`, es additive y reversible.
- External coordination: si el author/trust probe verifica `sameAs` contra un provider externo con API key (p.ej. reusar el KG), resolver el secret server-side (`*_SECRET_REF`) + grant `secretAccessor` a `greenhouse-portal@`; sin key → honest degradation `not_configured`. Ninguna coordinación si todo se resuelve sobre el HTML del sujeto + allowlist ya existente.

### Security and access

- Auth/access gate: `growth.ai_visibility.observation.read` (reusar el gate del reader de probes/observación; NO duplicar). El gatherer corre dentro del run gobernado; el reader self-guarda con `can()`.
- Sensitive data posture: sin PII cruda en `evidence`, sin secretos, sin finance. Presencia de author schema / trust markup como conteos/flags public-safe.
- Error contract: probes NUNCA lanzan (resuelven a `ProbeOutcome` con status); readers con `{ ok }`/errores capturados con `captureWithDomain(err, 'growth')`, NUNCA raw error al cliente ni `Sentry.captureException` directo.
- Abuse/rate-limit posture: cortesía del fetcher (User-Agent, timeout, byte cap, redirect manual) ya provista por `safe-fetch`/`entity-fetch`. Un request acotado por probe; sin scraping agresivo.

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit tests de cada probe nuevo (author schema presente/ausente/no-medible; trust about/contact/policies/reviews/HTTPS presente/ausente/no-medible) verificando honest degradation `null ≠ 0` + evidencia public-safe.
- DB/runtime checks: si hay migración del CHECK `axis`, validarla contra PG real (proxy) + confirmar que las filas de los kinds nuevos persisten vía `getProbeResults`. Ejercer el gatherer con el flag ON contra un dominio con author schema real y otro sin él.
- Integration checks: si se verifica `sameAs` externo, smoke del fetcher host-allowlisted contra el host real; degradación honesta si el host no está en la allowlist.
- Reliability signals/logs: sin signal nueva obligatoria (probes aditivos); log del path de degradación via `captureWithDomain`.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **toca una capability existente** (`growth.ai_visibility.observation.read` — el gate del reader de probes/observación). NO introduce capability nueva (la extracción de señales es evidencia del run, no una acción de negocio gobernada). Aplica el gate con regla *touch-it/fix-it*:

- [ ] **Lógica en el primitive, no en la UI.** La extracción de señales autor/trust vive en probes (`src/lib/growth/ai-visibility/probes/**`) + su store; ningún componente UI extrae señales.
- [ ] **Modelada como probe/reader canónico**, no como fetch acoplado a una pantalla. Los probes implementan el contrato `Probe`; la lectura pasa por `getProbeResults`.
- [ ] **Read** expuesto como reader canónico (`getProbeResults`) con shape estable; **write** = UPSERT idempotente recomputable del probe result (no es un command de negocio gobernado → command semantics de negocio N/A por diseño; la idempotencia SÍ aplica y ya existe).
- [ ] **Capability + grant:** reusa `growth.ai_visibility.observation.read` (ya seedeada + grant a roles reales); verificar que el reader de probes aplica ese gate y que el coverage test (`capability-grant-coverage.test.ts`) sigue verde. NO introduce capability nueva.
- [ ] **Camino programático declarado:** probes/reader consumibles por el rater (TASK-1316) + report + Nexa + MCP; ningún consumer re-extrae las señales.
- [ ] **`propose → confirm → execute`:** N/A (no hay write de negocio gobernado; el probe es evidencia recomputable).
- [ ] **Un primitive, muchos consumers:** rater, report, Nexa, MCP leen las mismas señales vía `getProbeResults`; cero re-implementación de la extracción.
- [ ] **Parity check = SÍ:** las señales E-E-A-T (autor + trust) quedan como probes/reader gobernados por el gate de observación → todos los consumers las operan por construcción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Author probe (Person/Author schema + presence + sameAs + credenciales)

- Definir `PROBE_KINDS` nuevos del autor (p.ej. `author_schema`, `author_presence`) + su eje [decidir en Discovery: reusar `entity` o eje nuevo `authority`; si eje nuevo → migración additive del CHECK `axis` con el patrón idempotente de TASK-1267] + flag env-var default OFF (aditivo sobre `isProbesEnabled`).
- `probes/entity/author.ts`: probe(s) read-only que sobre el HTML del sujeto (reusando `resolveSubjectSite` + `createProbeFetcher` + el parser JSON-LD `extractJsonLdBlocks`/`jsonLdTypes`) detectan: `Person`/`Author` schema, author bylines/pages, `sameAs` (perfiles verificables), y credenciales declaradas (`hasCredential`/`knowsAbout`/`jobTitle`). Honest degradation `null ≠ 0`; evidencia public-safe (conteos, tipos, presencia).
- Registrar en `registry.ts` bajo su eje/flag + `probes/entity/index.ts`. Persistencia vía `upsertProbeResults` (idempotente; sin cambio de schema salvo eje nuevo).
- Tests: author schema presente (score alto) / HTML OK sin author (`score: 0` gap medido) / HTML no accesible (`score: null` no medido) / `sameAs` verificable vs solo declarado; evidencia sin PII cruda.

### Slice 2 — Trust probes (about/contact/policies/reviews markup/HTTPS)

- `probes/structural/trust-signals.ts`: probe(s) read-only sobre superficies públicas del sujeto:
  - about/contact discoverability (reusando el descubrimiento de about de `fetch-site-content.ts` + rutas de contacto).
  - policies (privacy/terms) discoverability.
  - `Review`/`AggregateRating` schema markup (reusando el parser JSON-LD).
  - HTTPS + canonical básico.
- Honest degradation `null ≠ 0` por señal; evidencia public-safe. Registrar en `registry.ts` + `probes/structural/index.ts`.
- Si alguna señal verifica un host externo (`sameAs` cross-check), EXTENDER `ENTITY_API_ALLOWED_HOSTS`, NUNCA fetch arbitrario.
- Tests: cada señal de trust presente/ausente/no-medible con el estado correcto; evidencia public-safe; boundary (cero mutación, cero endpoint privado).

## Out of Scope

- **El assessment / rúbrica 4 pilares E-E-A-T** (Experience/Expertise/Authoritativeness/Trustworthiness) — es TASK-1316. Esta task solo EXTRAE y persiste señales medibles; NO las mapea a pilares ni emite un juicio cualitativo.
- **`readEeatScorecard` + integración a topical authority/360** — TASK-1317.
- **UI / report artifact** de E-E-A-T — follow-up ui-ux posterior.
- **Re-implementar la entidad-marca** (KG/Wikidata/Reddit/JSON-LD/brand-intelligence) — se reusa tal cual.
- **Backlinks/referring domains** (TASK-1304, ya existe; el rater lo referencia).
- **Cableado del renderer headless** (CWV/WebMCP) — fuera de esta task; los probes nuevos son HTTP-static (no requieren Chromium).
- **Cualquier write de negocio, cron o cambio del scoring de percepción** del grader.

## Detailed Spec

Ver el contrato en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §16 (fuente de verdad E-E-A-T). Puntos load-bearing:

- **La marca YA se captura; el gap es autor + trust.** §16 lo dice explícito: la materia prima existe (~70%) en el eje `entity` (TASK-1267), el JSON-LD structural y `brand-intelligence`. El error más caro acá sería re-implementar la detección de entidad-marca (KG/Wikidata/JSON-LD) o re-leer el sitio con otro LLM: eso duplica lo que ya existe. Esta task suma **exactamente dos capas de señal que faltan**: (1) la **entidad-AUTOR** como sub-entidad (Person/Author schema, author pages, `sameAs`, credenciales) — E-E-A-T 2026 es author-level; (2) **trust explícito** (about/contact/policies/reviews markup/HTTPS) — la base del pilar Trustworthiness.
- **Honest degradation es el contrato del probe layer.** `null ≠ 0`: no confundir "no pudimos leer el sitio" (`score: null`, excluido del promedio) con "el sitio no tiene author schema" (`score: 0`, gap real medido). El rater (TASK-1316) depende de esta distinción para no fabricar un pilar (`insufficient_data` en vez de un `0` mentiroso). Repetir el falso-0 del grader (corregido en EPIC-021) empezaría acá si se colapsa `null`→`0`.
- **Reuso, no re-fetch ciego.** El author/trust probe reusa: `resolveSubjectSite` + `createProbeFetcher` (SSRF, sujeto), `extractJsonLdBlocks`/`jsonLdTypes` (parser JSON-LD), el descubrimiento de about de `fetch-site-content.ts`, y `createEntityApiFetcher` + allowlist si hay verificación externa. Es principalmente **composición de primitives existentes**, no infra nueva.
- **Eje: decisión de Discovery.** Autor y trust pueden colgar del eje `entity` (author = sub-entidad; trust = confianza de la entidad) o justificar un eje nuevo (`authority`/`trust`). Si eje nuevo → migración additive del CHECK `axis` de `grader_probe_results` con el patrón idempotente de TASK-1267 (drop del CHECK previo por descubrimiento + recreate con el valor nuevo). Los `probe_kind` nuevos NUNCA requieren migración (columna TEXT libre). Preferir reusar el eje `entity` salvo que la semántica del rater exija separarlos.
- **`sameAs` verificable ≠ solo declarado.** Un `sameAs` en el JSON-LD del sujeto es una AFIRMACIÓN; verificarlo (que el host exista y sea alcanzable) sube la señal. Si se verifica, va por la allowlist externa (extenderla), con honest degradation si el host no responde.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (author probe) → Slice 2 (trust probes). Ambos son aditivos, read-only, behind flag; el orden es de composición (fijar eje + kinds en Slice 1, reusar la fundación en Slice 2), no de riesgo runtime. Si Slice 1 introduce eje nuevo + migración del CHECK `axis`, esa migración va PRIMERO y validada contra PG real antes de registrar los kinds.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Colapsar `null`→`0` cuando el sitio no es medible → falso-0 (repite EPIC-021) | growth/ai | medium | honest degradation `null ≠ 0` es invariante del probe layer; test dedicado por señal (no-medible → `score: null`) | test + review |
| Re-implementar la entidad-marca (KG/Wikidata/JSON-LD) en vez de reusar | growth/ai | medium | §16 documenta que la marca ya se captura; regla dura + review; reusar parser/fetcher existentes | code review |
| Fetch a host externo arbitrario al verificar `sameAs` → SSRF/allowlist bypass | ai/infra | low | verificación externa SOLO por `ENTITY_API_ALLOWED_HOSTS` (extender explícito); el probe del sujeto mantiene SSRF guard | test de allowlist |
| Migración del CHECK `axis` rompe filas existentes | data | low | additive + idempotente (patrón TASK-1267): las filas existentes satisfacen el nuevo CHECK; validar contra PG real | migración verify |
| PII (nombre/credencial de autor) filtrada en `evidence` al cliente | ai | low | `evidence` public-safe (conteos/presencia/tipos); detalle sensible a observabilidad, no al cliente | review |
| Secret del KG (si se reusa para `sameAs`) no accesible en runtime Vercel | infra | low | `*_SECRET_REF` + grant `secretAccessor` a `greenhouse-portal@`; sin key → honest `not_configured` | `vercel logs` + honest degradation |

### Feature flags / cutover

- Behind un flag env-var nuevo default OFF (aditivo sobre `isProbesEnabled`, patrón de `isEntityProbesEnabled`). Registrar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (gate `docs:closure-check` — `feature-flags-audit --strict` rompe el cierre si falta). Sin cutover destructivo: prender el flag agrega probes al run; apagarlo los quita.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (author probe) | flag OFF + revert PR; si hubo migración del CHECK `axis`, es additive (down = restaurar CHECK previo) | <10 min | si |
| Slice 2 (trust probes) | flag OFF + revert PR (probes aditivos, sin efecto de negocio) | <5 min | si |

### Production verification sequence

1. En staging con el flag del eje autor/trust ON: correr un `grader_run` sobre un dominio con **author schema real** (`Person`/`Author` + `sameAs`) → verificar `score` medido + evidencia public-safe en `grader_probe_results`.
2. Correr sobre un dominio **sin** author schema (HTML OK) → `score: 0` (gap medido), NUNCA `null`.
3. Correr sobre un dominio **no accesible** (red/timeout) → `status='failed'`, `score: null` (no medido), NUNCA `0`.
4. Verificar los trust probes (about/contact/policies/reviews/HTTPS) contra un dominio con y sin cada señal → estado correcto por señal.
5. Confirmar que `evidence` no contiene PII cruda ni secretos; que el reader `getProbeResults` devuelve los kinds nuevos con el gate de observación aplicado.
6. Si se verifica `sameAs` externo: confirmar que solo hosts de la allowlist son alcanzables (host fuera → `blocked`, honest degradation).
7. Prod vía release control plane cuando EPIC-022 se secuencie (aditivo, behind flag).

### Out-of-band coordination required

- Ninguna en el caso base (probes sobre HTML del sujeto + allowlist ya existente). SOLO si se reusa el KG (o un provider externo) para verificar `sameAs`: confirmar el secret server-side (`*_SECRET_REF`) + grant `secretAccessor` a `greenhouse-portal@` antes de prender el flag. Registrar el flag en el ledger.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe(n) **probe(s) de autor** en `src/lib/growth/ai-visibility/probes/**` que extraen `Person`/`Author` schema, author pages/bylines, `sameAs` y credenciales del HTML del sujeto, reusando el parser JSON-LD + el fetcher SSRF-guarded existentes.
- [ ] Existe(n) **probe(s) de trust** (about/contact/policies/`Review`/`AggregateRating` markup/HTTPS) read-only sobre superficies públicas del sujeto.
- [ ] **NO se re-implementa la entidad-marca:** KG/Wikidata/Reddit/JSON-LD/brand-intelligence se reusan; los probes nuevos solo agregan autor + trust (verificado por review).
- [ ] **Honest degradation `null ≠ 0`:** no medible → `status='skipped'|'failed'`, `score: null` (excluido del promedio); ausencia medida → `score: 0`. Nunca `0` cuando no se probó (test dedicado por señal).
- [ ] Persistencia vía `upsertProbeResults`/`getProbeResults` (idempotente por `(run_id, probe_kind)`); `probe_kind` nuevos sin migración; migración del CHECK `axis` SOLO si se agrega eje nuevo (additive + idempotente + validada contra PG real).
- [ ] Read-only sobre superficies públicas; SSRF guard del sujeto + allowlist externa intactos; cero fetch a host arbitrario; cero mutación del sitio.
- [ ] `evidence` public-safe: sin PII cruda, sin secretos.
- [ ] Gate reusado `growth.ai_visibility.observation.read`; coverage test verde; sin capability nueva.
- [ ] Flag env-var nuevo default OFF, aditivo sobre `isProbesEnabled`, registrado en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes; si hay migración/SQL propio, validado contra PG real (gate TASK-893).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Correr un `grader_run` en staging con el flag ON contra dominios con y sin author schema / trust markup; verificar honest degradation, evidencia public-safe y persistencia vía `getProbeResults`.
- `pnpm docs:closure-check` (feature-flags-audit --strict) verde con el flag registrado.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado con el flag nuevo
- [ ] chequeo de impacto cruzado (TASK-1316 rater consume estas señales; TASK-1317 el scorecard)
- [ ] documentación técnica de la capa E-E-A-T (señal autor + trust) en la arquitectura del dominio (§16)

## Follow-ups

- `TASK-1316` — E-E-A-T Rater (rúbrica 4 pilares, YMYL-aware) — consume estas señales.
- `TASK-1317` — `readEeatScorecard` + integración a topical authority (§15.1) / 360.
- Evaluar cableado headless para señales de trust que requieran render (p.ej. reviews client-side) — solo si HTTP-static resulta insuficiente.
- Evaluar exponer las señales E-E-A-T como recurso `api/platform/app` explícito para Nexa/MCP si el consumo lo justifica.

## Open Questions

1. ¿El autor + trust cuelgan del eje `entity` existente o justifican un eje nuevo (`authority`/`trust`) con migración del CHECK `axis`? Propuesta: reusar `entity` salvo que el rater (TASK-1316) exija separarlos por peso/pilar. Resolver en Discovery contra el shape del rater.
2. ¿La verificación de `sameAs` va contra hosts externos (extender allowlist) o basta con detectar su presencia declarada en el JSON-LD del sujeto? Propuesta V1: presencia declarada + verificación externa opcional detrás del mismo flag. Resolver por costo/valor.
3. ¿Nombres canónicos de los `PROBE_KINDS` nuevos (`author_schema`/`author_presence`/`trust_about_contact`/`trust_policies`/`trust_reviews_markup`/`https_canonical`)? Fijar en Discovery contra el mapeo que el rater (TASK-1316) espera.
4. ¿El trust probe reusa el descubrimiento de about de `fetch-site-content.ts` o define sus propias rutas de contacto/policies? Confirmar el path real (`safe-fetch.ts` / `fetch-site-content.ts`) en Discovery.
