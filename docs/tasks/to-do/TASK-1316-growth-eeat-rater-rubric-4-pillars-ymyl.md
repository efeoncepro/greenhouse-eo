# TASK-1316 — Growth E-E-A-T: Rater (rúbrica 4 pilares, YMYL-aware)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|data`
- Blocked by: `TASK-1315`
- Branch: `task/TASK-1316-growth-eeat-rater-rubric-4-pillars-ymyl`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El **rater E-E-A-T**: un assessment LLM que mapea las señales medidas (autor + trust de TASK-1315, entidad-marca de TASK-1267, JSON-LD, `brand-intelligence`, backlinks) a los **4 pilares** — Experience · Expertise · Authoritativeness · Trustworthiness — con una **rúbrica derivada de las Google Quality Rater Guidelines**, **YMYL-aware** (rúbrica más estricta para finanzas/salud/legal). Reusa la infra `brand-intelligence/` (fetch-site-content + providers LLM provider-agnostic + prompt + store) + `evals/` + `accuracy/`. **Regla dura load-bearing (§16): E-E-A-T es un ASSESSMENT, NO un dial de ranking que se lee.** Las señales duras son **medidas** (`●`); los pilares cualitativos son **juicio del rater LLM** (`◑`) que exige **confianza calibrada + golden-set anti falso-0** — el grader ya tuvo un falso-0 a marcas de consumo (SKY salió 0), corregido en EPIC-021; el rater NO puede repetirlo. Nunca falsa precisión: marcar medido vs evaluado, degradar honesto (`insufficient_data` en vez de un pilar inventado), YMYL sube el listón. El command persiste el assessment versionado; `readEeatScorecard` + integración a topical authority/360 es TASK-1317.

## Why This Task Exists

E-E-A-T es la capa conectiva más profunda del 360 (§16): el "por qué" debajo de rankear (SEO) y de ser citado (AEO), y el multiplicador del topical authority (§15.1). Pero E-E-A-T **no es un número que Google exponga** — es un *marco de evaluación* que sus raters humanos aplican con las Quality Rater Guidelines. Trasladarlo a Greenhouse tiene un riesgo específico y caro: tratar los 4 pilares como si fueran métricas duras leíbles produciría **falsa precisión** — un "Trustworthiness: 42" que suena medido pero es un juicio disfrazado de dato. Peor: el grader ya cometió el error análogo (falso-0 a SKY, una marca de consumo, por estar calibrado solo para el ICP agencia B2B — ISSUE-110, corregido en EPIC-021 con un golden-set brand-aware). Un rater E-E-A-T mal calibrado repetiría exactamente ese patrón contra los pilares. Esta task existe para hacer el assessment **honesto por construcción**: señal dura medida (`●`) separada del juicio del rater (`◑`), confianza calibrada, golden-set que ancla la salida a casos reales conocidos (anti falso-0), degradación explícita cuando falta evidencia, y una rúbrica YMYL-aware porque en finanzas/salud/legal el listón de trust es materialmente más alto. El operador pidió **nailear la rúbrica** — el diseño de qué evidencia sube/baja cada pilar, cómo se detecta YMYL y cómo se calibra vive en el Detailed Spec.

## Goal

- **Command `assessEeat`** (assessment gobernado) en `src/lib/growth/ai-visibility/eeat/**`: dado un perfil/run, compone las señales medidas (TASK-1315 autor+trust vía `getProbeResults`, entidad-marca TASK-1267, JSON-LD, `brand-intelligence`, backlinks TASK-1304) y produce un assessment de los **4 pilares** (E·E·A·T) con score por pilar + confianza + provenance (qué señal alimentó qué pilar) + estado (`assessed`/`insufficient_data`/`review_required`).
- **Rúbrica derivada de las Quality Rater Guidelines**, declarada como contrato versionado: qué evidencia sube/baja cada pilar, cómo se detecta **YMYL** (finanzas/salud/legal → rúbrica más estricta), cómo se marca **medido (`●`) vs evaluado (`◑`)**.
- **Calibración honesta:** confianza calibrada por pilar + **golden-set anti falso-0** (reusar `evals/` + `accuracy/`); el LLM NUNCA asigna un pilar sin evidencia (degrada a `insufficient_data`); YMYL escala a `review_required` conservador.
- **Capability NUEVA** `growth.ai_visibility.eeat.assess` (execute) + grant a ≥1 rol real (set operador del grader) + coverage test, MISMO PR.
- **Behind flag** (default OFF); provider-agnostic reusando el router LLM de `brand-intelligence/`; el secret se resuelve server-side.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§16 (E-E-A-T, fuente de verdad)**: la evaluación vive **cerca del grader** (extiende su eje entity + suma autor + rúbrica), el SEO la **consume** — un primitive, dos consumers; la **honestidad obligatoria** (E-E-A-T NO es un dial que se lee; señal dura `●` vs juicio de rater `◑`; calibración + confianza honesta; nunca repetir el falso-0 de EPIC-021; YMYL más estricto); §15.1 (E-E-A-T como multiplicador de topical authority); **§1.1 (boundary duro)** — capa de entidad/calidad referenciada por `org`, NO tabla que fusione motores.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — modelo del grader: `grader_profiles → grader_runs → grader_scores`; el LLM NUNCA asigna el score final (el scoring es determinista sobre findings normalizados); patrón de estados `completed`/`insufficient_data`/`review_required`.
- `docs/context/00_INDEX.md` + `docs/context/07_ico.md` — YMYL: finanzas/salud/legal en el contexto de negocio de Efeonce/Globe clients (para el detector YMYL).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — command gobernado como primitive canónico; el LLM propone, el humano confirma writes gobernados.
- `CLAUDE.md §"AI image + LLM providers"` — NO instanciar un SDK LLM paralelo (reusar el router `brand-intelligence/` / los clientes canónicos de `src/lib/ai/`); secret server-side vía `*_SECRET_REF`.
- `MEMORY.md → project_aeo_grader_icp_only_epic021` — el falso-0 (SKY) por calibración ICP-only; el rater debe ser brand-aware (consumo ≠ agencia B2B), no repetirlo.

Reglas obligatorias (§16 — honestidad, **load-bearing**):

- **NUNCA tratar E-E-A-T como un dial de ranking que se lee.** Es un *assessment*: señal dura = medida (`●`), pilar cualitativo = juicio del rater LLM (`◑`). El output SIEMPRE marca cuál es cuál; jamás presenta un juicio como métrica dura.
- **NUNCA el LLM asigna un pilar sin evidencia.** Sin señal suficiente para un pilar → `insufficient_data` para ese pilar (degradación honesta), NUNCA un número fabricado. Repetir el falso-0 de EPIC-021 (un `0` que en realidad era "no medible/mal calibrado") está prohibido.
- **NUNCA falsa precisión.** La confianza por pilar es calibrada (no un `0.87` inventado); el golden-set ancla la salida a casos reales conocidos (anti falso-0). Si la confianza es baja, el estado lo refleja.
- **SIEMPRE YMYL más estricto.** Detectar YMYL (finanzas/salud/legal) desde `brand-intelligence` (categoría/business_model) + señales; con YMYL, la rúbrica de Trust/Authoritativeness sube el listón y la duda escala a `review_required` (conservador, como el detector de `accuracy/`), NUNCA a una afirmación auto-publicada.
- **SIEMPRE reusar la infra del grader** (`brand-intelligence/` router+prompt+store, `evals/`, `accuracy/`); NO crear un pipeline LLM paralelo ni un SDK nuevo.
- **SIEMPRE** exponer el assessment como command/reader gobernado (boundary §1.1 intacto: capa de calidad por `org`, no fusión de motores).

## Normative Docs

- `src/lib/growth/ai-visibility/brand-intelligence/router.ts` — router LLM provider-agnostic (gemini→openai→anthropic cheap-first, `isConfigured`, honest degradation `fields=null`, `captureWithDomain('growth')`, NUNCA throw al caller, secret server-side). El rater reusa ESTE patrón/infra de provider, NO instancia un SDK nuevo.
- `src/lib/growth/ai-visibility/brand-intelligence/{contracts,prompt,store,fetch-site-content}.ts` — contrato PURO validado/sanitizado + prompt anti-injection (contenido del sitio como DATA) + store versionado (supersede atómico, un `active` por perfil) + lectura de contenido del sitio. El rater espeja este shape: input DATA, output validado, snapshot versionado.
- `src/lib/growth/ai-visibility/accuracy/{contracts,detector,index}.ts` — patrón canónico: **el LLM NUNCA asigna el score; el detector es determinista sobre findings normalizados** (la extracción LLM aporta evidencia, no veredicto); conservador YMYL (`review_required`, nunca auto-publicar "la IA miente"); sin verdad declarada suficiente → no se fabrica (degradación honesta). El rater E-E-A-T aplica el MISMO principio a los pilares.
- `src/lib/growth/ai-visibility/evals/{eval-runner,golden-set.v1.json,brand-fixtures}.ts` — harness de eval + golden-set (`runGoldenEval`). El golden-set anti falso-0 del rater se autora acá (casos consumo + B2B + YMYL con pilares esperados).
- `src/lib/growth/ai-visibility/probes/store.ts` (`getProbeResults`) — lectura de las señales autor+trust (TASK-1315) + entidad (TASK-1267) por `run_id`. El rater las compone; NO re-extrae.
- `src/lib/growth/ai-visibility/scoring/config.ts` — patrón de dimensiones + estados (`completed`/`insufficient_data`/`review_required`) + `SCORE_TOTAL_WEIGHT`. El rater espeja el patrón de estados y la separación "el LLM no asigna el número final".
- `src/lib/entitlements/runtime.ts` (~L275-308, set operador AEO) — patrón de grant de capability del grader al set operador (route_group internal ∪ EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT ∪ EFEONCE_OPERATIONS ∪ AI_TOOLING_ADMIN). El grant de `growth.ai_visibility.eeat.assess` espeja este bloque.
- `src/lib/entitlements/capability-grant-coverage.test.ts` — guard que rompe el build si una capability `can()`-checked no tiene grant. La capability nueva DEBE quedar cubierta en el mismo PR.

## Dependencies & Impact

### Depends on

- `TASK-1315` — signal extraction (autor + trust). **Bloqueador duro**: el rater mapea ESTAS señales a los pilares Experience/Expertise/Authoritativeness/Trustworthiness. Sin la materia prima medible, el rater no tiene evidencia `●` y solo podría inventar (prohibido).
- `TASK-1267` — eje `entity` (KG/Wikidata/Reddit) — señal de Authoritativeness de marca; ya en producción.
- `brand-intelligence/` (TASK-1288) — categoría/business_model + contenido del sitio (para el detector YMYL + Experience/Expertise); ya en producción.
- `TASK-1304` — backlinks/referring domains (señal de Authoritativeness); el rater la referencia (fuera de scope construirla).
- `evals/` + `accuracy/` (grader) — harness + patrón determinista/conservador; reusados.

### Blocks / Impacts

- Bloquea `TASK-1317` (`readEeatScorecard` + integración a topical authority §15.1 / 360) — consume el assessment persistido por este command.
- Alimenta las recomendaciones cruzadas E-E-A-T (§16) y el pitch "Search Visibility 360" como la capa conectiva más profunda.
- Consumer UI (report artifact E-E-A-T) = follow-up ui-ux posterior (vía TASK-1317).

### Files owned

- `src/lib/growth/ai-visibility/eeat/contracts.ts` [nuevo — PURO: `EeatPillar` (E·E·A·T), `EeatAssessment`, `EeatPillarVerdict` con `measured (●) | evaluated (◑)`, confianza, provenance, estado; rúbrica versionada]
- `src/lib/growth/ai-visibility/eeat/rubric.ts` [nuevo — rúbrica derivada de Quality Rater Guidelines: qué evidencia sube/baja cada pilar; detector YMYL; umbrales/pesos declarados]
- `src/lib/growth/ai-visibility/eeat/assess-eeat.ts` [nuevo — command `assessEeat`: compone señales + corre el rater LLM + valida/sanitiza + calibra + persiste versionado]
- `src/lib/growth/ai-visibility/eeat/rater-prompt.ts` [nuevo — prompt anti-injection (señales como DATA); provider-agnostic vía el router reusado]
- `src/lib/growth/ai-visibility/eeat/store.ts` [nuevo — persistencia versionada del assessment (supersede atómico, un `active` por perfil), espejo de `brand-intelligence/store.ts`]
- `src/lib/growth/ai-visibility/eeat/flags.ts` (o extensión de `flags.ts`) [flag env-var default OFF]
- `src/lib/growth/ai-visibility/evals/eeat-rubric-eval.*` [nuevo — golden-set anti falso-0 del rater + runner]
- `src/lib/entitlements/runtime.ts` [extendido — grant `growth.ai_visibility.eeat.assess` al set operador]
- `src/lib/entitlements/capability-grant-coverage.test.ts` / `runtime.test.ts` [extendidos — cobertura de la capability nueva]
- `migrations/*_task-1316-*.sql` [nuevo — tabla `greenhouse_growth.grader_eeat_assessments` versionada, si se persiste el assessment; espejo de `grader_brand_intelligence`]
- `src/lib/growth/ai-visibility/eeat/__tests__/*.test.ts` [nuevos]

## Current Repo State

### Already exists

- **Infra LLM provider-agnostic:** `brand-intelligence/router.ts` (gemini→openai→anthropic, honest degradation, secret server-side, NUNCA throw) + providers + `prompt.ts` + `store.ts` (versionado supersede-atómico) + `fetch-site-content.ts`.
- **Patrón "el LLM no asigna el veredicto":** `accuracy/detector.ts` (determinista sobre findings; LLM aporta evidencia, no score; conservador YMYL → `review_required`).
- **Harness de eval + golden-set:** `evals/eval-runner.ts` (`runGoldenEval`) + `golden-set.v1.json` + fixtures (consumo + B2B) — el mecanismo anti falso-0 de EPIC-021 vive acá.
- **Señales medidas:** autor+trust (TASK-1315, `getProbeResults`), entidad-marca (TASK-1267), JSON-LD (structural), `brand-intelligence` (categoría/business_model/prosa), backlinks (TASK-1304).
- **Patrón de capability + grant + coverage test** del grader (`runtime.ts` set operador + `capability-grant-coverage.test.ts`).
- **Patrón de estados** `completed`/`insufficient_data`/`review_required` (`scoring/config.ts`).

### Gap

- **No hay rater E-E-A-T.** Nadie mapea las señales a los 4 pilares con una rúbrica; nadie detecta YMYL para subir el listón; nadie marca `medido (●)` vs `evaluado (◑)`; nadie calibra la confianza por pilar ni corre un golden-set anti falso-0 sobre los pilares.
- Sin este assessment, TASK-1317 (`readEeatScorecard`) no tiene qué leer, y el 360 no tiene su capa conectiva E-E-A-T.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (assessment LLM con capability nueva + calibración anti falso-0 + persistencia versionada + provider externo; el riesgo de falsa precisión / falso-0 es alto y de cara al cliente vía TASK-1317).
- Impacto principal: `command` (assessment gobernado; compone readers + corre LLM + persiste versionado).
- Source of truth afectado: `greenhouse_growth.grader_eeat_assessments` (nuevo, versionado, un `active` por perfil) — el assessment ES un artefacto derivado versionado, NO un dato de negocio primario. Compone `grader_probe_results` + `grader_brand_intelligence` (SoT de señal, read-only).
- Consumidores afectados: TASK-1317 (`readEeatScorecard` → topical authority/360), report artifact E-E-A-T (follow-up), Nexa/MCP.
- Runtime target: `staging|production` (behind flag; el LLM corre server-side, 1×/marca/versión al autorar el assessment, NUNCA por run — igual que `brand-intelligence`).

### Contract surface

- Contrato existente a respetar: router LLM provider-agnostic (`brand-intelligence/router.ts`), patrón determinista/conservador de `accuracy/`, harness `evals/`, `getProbeResults`, patrón de estados del scoring, patrón capability+grant+coverage, boundary §16/§1.1.
- Contrato nuevo o modificado: command `assessEeat(input) → EeatAssessment` (con verdicts por pilar `measured|evaluated` + confianza calibrada + provenance + estado); tabla versionada `grader_eeat_assessments`; capability `growth.ai_visibility.eeat.assess`; flag default OFF; rúbrica versionada (`EEAT_RUBRIC_VERSION`).
- Backward compatibility: `gated` (aditivo detrás de flag + capability nueva; sin el flag el command degrada disabled; cero cambio para consumers actuales).
- Full API parity: command gobernado (`assessEeat`) + reader del assessment como primitive canónico; UI/Nexa/MCP lo operan por construcción; el LLM propone, el humano confirma cualquier publicación (vía TASK-1317/review, no en este command). Ver `## Capability Definition of Done`.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_eeat_assessments` [nueva, versionada, `status active|superseded`, un `active` por perfil vía índice único parcial — espejo de `grader_brand_intelligence`]. Lee `grader_probe_results` + `grader_brand_intelligence` + señales del grader (read-only).
- Invariantes que no se pueden romper:
  - **El LLM NUNCA asigna el veredicto duro final del pilar sin evidencia.** El command valida/sanitiza la salida del LLM (patrón `sanitizeBrandIntelligenceOutput`); un pilar sin señal suficiente → `insufficient_data`, NUNCA número fabricado.
  - **`measured (●)` vs `evaluated (◑)` siempre marcado** en cada verdict de pilar; jamás un juicio presentado como métrica dura.
  - **Confianza calibrada**, no inventada; el golden-set (evals) ancla la salida; falsa precisión = prohibida.
  - **YMYL más estricto:** el detector YMYL sube el listón de Trust/Authoritativeness y escala la duda a `review_required` (conservador).
  - **Anti falso-0:** un pilar bajo debe estar respaldado por evidencia medida; "0/no-medible" degrada a `insufficient_data`, NUNCA a un `0` mentiroso (lección EPIC-021 / SKY).
  - Versionado supersede-atómico (un `active` por perfil); assessment recomputable, no primario.
  - Boundary §1.1: capa de calidad por `org`; cero fusión de tablas `seo_*` × `grader_*`.
  - Provider-agnostic vía el router reusado; NUNCA un SDK LLM paralelo; secret server-side.
- Tenant/space boundary: el assessment se ancla a `profile_id`/`organization_id` del grader; el command self-guarda con `can(subject, 'growth.ai_visibility.eeat.assess', 'execute', 'tenant')`; sin fuga cross-org.
- Idempotency/concurrency: re-assess de la misma marca/versión supersede el `active` en una transacción (patrón `persistBrandIntelligence`); el LLM corre al autorar, no por run — sin doble gasto.
- Audit/outbox/history: el snapshot versionado ES la historia (append + supersede); provenance (qué señal alimentó qué pilar + provider/model/version) persistido. Observabilidad = `captureWithDomain(err, 'growth'|'ai')`.

### Migration, backfill and rollout

- Migration posture: `additive` (nueva tabla `grader_eeat_assessments` versionada; sin tocar tablas existentes). Marker `-- Up Migration` + bloque DO anti pre-up-marker + GRANTs a runtime (patrón canónico).
- Default state: `flag OFF` (el command degrada disabled hasta sign-off de costo + eval verde). Registrar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (gate `docs:closure-check`).
- Backfill plan: N/A obligatorio (assessments se generan on-demand/al autorar); re-assess opcional de perfiles existentes vía el command (allowlist), no scope.
- Rollback path: flag OFF → command disabled; revert PR + down migration (drop tabla `grader_eeat_assessments`, additive/reversible). Capability nueva: remover grant + registry en el revert.
- External coordination: el provider LLM (Gemini/OpenAI/Anthropic) ya está configurado (reusa `brand-intelligence`); confirmar secret server-side + budget/cost ceiling del rater antes de prender. Sign-off comercial/legal del uso del assessment de cara al cliente (vía TASK-1317).

### Security and access

- Auth/access gate: capability NUEVA `growth.ai_visibility.eeat.assess` (execute, scope `tenant`) — grant al set operador del grader (route_group internal ∪ EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT ∪ EFEONCE_OPERATIONS ∪ AI_TOOLING_ADMIN); NUNCA `client_*` (assessment operador). Coverage test en el mismo PR.
- Sensitive data posture: sin PII cruda ni secretos en el assessment persistido; el detalle interno (raw LLM, provider error) va a observabilidad, NO al cliente. YMYL conservador.
- Error contract: command NUNCA throw al caller crudo (patrón router: degrada honesto + `captureWithDomain`); errores canónicos es-CL en la superficie; NUNCA `Sentry.captureException` directo.
- Abuse/rate-limit posture: el LLM corre 1×/marca/versión (cacheado/versionado), NUNCA por run; cost ceiling + budget del rater (patrón `brand-intelligence`/`prose-extraction` config). Sin gasto con flag OFF.

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit tests del command (composición de señales → 4 pilares), de la validación/sanitización del output LLM, de `measured (●)` vs `evaluated (◑)`, de `insufficient_data` cuando falta señal, del detector YMYL (finanzas/salud/legal → rúbrica estricta + `review_required`), y del **golden-set anti falso-0** (una marca de consumo NO sale falso-0; un caso B2B y un YMYL con pilares esperados dentro de tolerancia).
- DB/runtime checks: validar la migración `grader_eeat_assessments` contra PG real (proxy; `*_at`=TIMESTAMPTZ); confirmar supersede atómico (un `active` por perfil); ejercer `assessEeat` en staging con el flag ON sobre un perfil con señales completas y otro con señales parciales.
- Integration checks: smoke del provider LLM vía el router reusado (provider configurado → `ok`; sin provider → honest degradation `not_configured`).
- Reliability signals/logs: log del path de degradación + del estado `review_required`/`insufficient_data`; evaluar signal de "eeat_assessment_review_backlog" (follow-up).
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **introduce una capability NUEVA** `growth.ai_visibility.eeat.assess`. Gate COMPLETO:

- [ ] **Lógica en el primitive, no en la UI.** El assessment (composición de señales + rater LLM + rúbrica + calibración) vive en `src/lib/growth/ai-visibility/eeat/**` (command/reader). Ningún componente UI corre el rater ni asigna pilares.
- [ ] **Modelada como command/aggregate, no como click-handler.** `assessEeat` es un command gobernado sobre el aggregate del assessment versionado, no un handler acoplado a una pantalla.
- [ ] **Read + write canónicos.** Write (`assessEeat`) con: authorization fina (`can('growth.ai_visibility.eeat.assess','execute','tenant')`, NO admin-coarse), idempotencia (supersede atómico por marca/versión), provenance/observabilidad, errores sanitizados (el LLM propone, el command valida/sanitiza — NUNCA persiste output crudo). Read del assessment como reader canónico (consumido por TASK-1317).
- [ ] **Capability + grant en el MISMO PR:** `growth.ai_visibility.eeat.assess` en `entitlements-catalog.ts` (TS) + `capabilities_registry` (DB seed/migración) + grant a ≥1 rol real en `src/lib/entitlements/runtime.ts` (set operador: internal ∪ EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT ∪ EFEONCE_OPERATIONS ∪ AI_TOOLING_ADMIN; NUNCA `client_*`) + coverage test verde (`capability-grant-coverage.test.ts`). [verificar nombre canónico contra el catálogo — proponer `growth.ai_visibility.eeat.assess`].
- [ ] **Camino programático declarado:** command `assessEeat` + reader del assessment consumibles por TASK-1317 (topical authority/360), report, Nexa y MCP. Ningún consumer re-implementa el rater.
- [ ] **Write apto para `propose → confirm → execute`.** El rater LLM **propone**; la publicación de cara al cliente (report/360) queda tras confirmación humana (vía TASK-1317/review gates, patrón `report.review` del grader). El LLM NUNCA auto-publica un pilar (conservador YMYL, patrón `accuracy/`).
- [ ] **Un primitive, muchos consumers:** TASK-1317, report, Nexa, MCP leen el mismo assessment; cero lógica duplicada por consumer.
- [ ] **Parity check = SÍ:** el assessment E-E-A-T tiene contrato gobernado a nivel capability → todos los consumers (incl. Nexa) lo operan por construcción, con el boundary §1.1 intacto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Rúbrica + contratos (PURO) + detector YMYL

- `eeat/contracts.ts` (PURO, sin IO): `EeatPillar` (`experience|expertise|authoritativeness|trustworthiness`), `EeatPillarVerdict` (`{ pillar, band, evidenceMode: 'measured'|'evaluated', confidence, provenance: string[], reason }`), `EeatAssessment` (`{ pillars, overallStatus: 'assessed'|'insufficient_data'|'review_required', ymyl: boolean, rubricVersion }`), `EEAT_RUBRIC_VERSION`.
- `eeat/rubric.ts` (PURO): la **rúbrica derivada de las Quality Rater Guidelines** — para cada pilar, qué evidencia (de las señales medidas) sube/baja la banda, cuál es `measured (●)` (señal dura: author schema presente, KG confirmado, HTTPS, backlinks) vs `evaluated (◑)` (juicio del rater sobre prosa/contexto); el **detector YMYL** (finanzas/salud/legal desde `brand-intelligence` categoría/business_model + señales) que activa la rúbrica estricta; umbrales/bandas declarados como constantes documentadas (no mágicos).
- `sanitizeEeatOutput` (PURO, espejo de `sanitizeBrandIntelligenceOutput`): valida/sanitiza el output del rater; shape malformado → null (honest degradation).
- Tests: bandas por pilar desde combinaciones controladas de señal; `measured` vs `evaluated` correcto; detector YMYL (consumo NO-YMYL vs finanzas/salud/legal YMYL); output malformado → null.

### Slice 2 — Command `assessEeat` (composición + rater LLM + calibración + persistencia)

- `eeat/rater-prompt.ts`: prompt anti-injection (las señales medidas + prosa del sitio como **DATA**, no instrucción); provider-agnostic.
- `eeat/assess-eeat.ts` (command, `server-only`): self-guard `can('growth.ai_visibility.eeat.assess','execute','tenant')` → compone señales (`getProbeResults` autor+trust+entidad + `getActiveBrandIntelligence` + backlinks) → resuelve YMYL (rúbrica) → corre el rater vía el router reusado (`brand-intelligence`-style, honest degradation, NUNCA throw) → valida/sanitiza (`sanitizeEeatOutput`) → aplica la rúbrica determinista sobre la evidencia (el LLM aporta el juicio `◑`, la rúbrica ancla las bandas `●` y decide `insufficient_data`/`review_required`) → calibra confianza → persiste versionado (`eeat/store.ts`, supersede atómico).
- `eeat/store.ts` + migración `grader_eeat_assessments` (versionada, un `active` por perfil).
- Flag env-var default OFF; capability nueva + grant + coverage test (MISMO PR).
- Tests: composición completa → 4 pilares; señal parcial → `insufficient_data` por pilar; YMYL → `review_required` conservador; provider no configurado → honest degradation; persistencia supersede-atómica.

### Slice 3 — Calibración: golden-set anti falso-0 + eval

- `evals/eeat-rubric-eval.*`: golden-set con casos reales conocidos — una **marca de consumo** (anti falso-0, lección SKY/EPIC-021), un **B2B** (ICP agencia), y un **YMYL** (finanzas/salud/legal) — cada uno con las bandas de pilar esperadas + tolerancia; runner sobre `runGoldenEval`.
- Confirmar que la salida del rater cae dentro de tolerancia para los 3 arquetipos; que la marca de consumo NO sale falso-0; documentar la calibración (qué evidencia movió qué pilar) en el eval + spec.
- Tests: el eval corre verde; un caso deliberadamente mal-calibrado (consumo tratado como agencia) falla el eval (guard anti-regresión de EPIC-021).

## Out of Scope

- **`readEeatScorecard` + integración a topical authority (§15.1) / 360** — TASK-1317 (consume este assessment).
- **UI / report artifact E-E-A-T** — follow-up ui-ux posterior (vía TASK-1317).
- **La extracción de señales autor+trust** — TASK-1315 (dependencia; este command las COMPONE, no las extrae).
- **Construir backlinks/entidad-marca** — ya existen (TASK-1304/1267); el rater las referencia.
- **Un SDK LLM nuevo o un pipeline de providers paralelo** — se reusa el router de `brand-intelligence/`.
- **Publicación automática del assessment de cara al cliente** — pasa por confirmación humana (TASK-1317/review), no en este command.
- **Cross-motor merge SEO×AEO** — boundary §1.1; el assessment es capa de calidad por `org`, no fusión.

## Detailed Spec

Ver §16 (fuente de verdad E-E-A-T) + §15.1 (multiplicador de topical authority). El operador pidió **nailear la rúbrica** — el diseño vive acá.

### La regla no negociable: assessment, no dial

E-E-A-T NO es un número que Google exponga; es un marco de evaluación. El rater lo traslada **marcando honestamente qué es medido y qué es juicio**:

- `measured (●)` = señal dura verificable: author schema presente (TASK-1315), KG/Wikidata confirmado por dominio (TASK-1267), HTTPS/canonical, `Review`/`AggregateRating` markup, backlinks/referring domains (TASK-1304). Estas anclan las bandas y NO dependen del LLM.
- `evaluated (◑)` = juicio del rater LLM sobre lo que las señales duras no capturan: calidad/profundidad del contenido, evidencia de experiencia de primera mano, alineación de la narrativa con el pilar. El LLM APORTA este juicio; NUNCA asigna la banda final sin la evidencia dura debajo.
- El output SIEMPRE lleva `evidenceMode` por pilar; la UI (TASK-1317) muestra `●`/`◑` para que nadie confunda un juicio con una métrica dura.

### Rúbrica por pilar (qué evidencia sube/baja)

- **Experience** (¿experiencia de primera mano?): sube con señales de autoría con experiencia declarada (author bylines + credenciales, TASK-1315), contenido con marcadores de primera mano (reviews propias, casos), `evaluated ◑` sobre la prosa; baja sin autoría ni evidencia de uso real. En muchos B2B es intrínsecamente `◑` + baja densidad de señal dura → `insufficient_data` honesto, NO un `0`.
- **Expertise** (¿pericia demostrable?): sube con `Person`/`Author` schema + `hasCredential`/`knowsAbout`/`jobTitle` (TASK-1315), profundidad temática (`brand-intelligence` + topical authority §15.1), `evaluated ◑`; baja sin autor identificable ni profundidad.
- **Authoritativeness** (¿autoridad reconocida?): sube con KG/Wikidata confirmado por dominio (TASK-1267), backlinks/referring domains de calidad (TASK-1304), presencia UGC desambiguada (Reddit, TASK-1267) — mayormente `measured ●`; baja sin reconocimiento de entidad ni enlaces.
- **Trustworthiness** (¿confiable?): sube con trust markup explícito (about/contact/policies, `Review`/`AggregateRating`, HTTPS/canonical — TASK-1315), consistencia de identidad (`sameAs` verificable) — mayormente `measured ●`; baja sin contacto/políticas/HTTPS. **Es el pilar central de YMYL.**

### Detección YMYL + rúbrica estricta

- YMYL = finanzas / salud / legal (y afines: seguridad, decisiones civiles). Se detecta desde `brand-intelligence` (categoría/business_model + `whatTheBrandDoes`) + señales, con un clasificador conservador (ante duda razonable de YMYL → tratar como YMYL).
- Con YMYL: el listón de **Trustworthiness** y **Authoritativeness** sube (exige trust markup + autoría con credenciales verificables); la duda escala a `review_required` (patrón conservador de `accuracy/detector.ts` — NUNCA auto-publicar "es confiable/no confiable"). Un YMYL sin señal dura de trust NO recibe una banda alta "por buena prosa".

### Calibración honesta (anti falso-0)

- El grader ya tuvo un falso-0 (SKY, marca de consumo, por calibración ICP-only agencia — ISSUE-110, corregido en EPIC-021 con golden-set brand-aware). El rater E-E-A-T **NO puede repetirlo**: el golden-set (Slice 3) incluye consumo + B2B + YMYL con bandas esperadas; una marca de consumo con señales razonables NUNCA sale falso-0.
- Confianza por pilar = calibrada contra la densidad/calidad de la evidencia medida, no un número inventado por el LLM. Baja confianza → el estado lo refleja (`insufficient_data`/`review_required`), no una banda con falsa precisión.
- `insufficient_data` es una respuesta VÁLIDA y esperada por pilar (Experience en muchos B2B). Degradar honesto > inventar un pilar.

### Reuso, no pipeline nuevo

- El rater corre por el router provider-agnostic de `brand-intelligence/` (gemini→openai→anthropic, honest degradation, secret server-side, NUNCA throw). El command valida/sanitiza el output (espejo de `sanitizeBrandIntelligenceOutput`) y aplica la rúbrica determinista encima — el LLM aporta `◑`, la rúbrica ancla `●` y decide estados. Es el MISMO principio que `accuracy/detector.ts`: el LLM aporta evidencia, el código decide el veredicto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (rúbrica + contratos PUROS + detector YMYL) → Slice 2 (command + LLM + persistencia + capability) → Slice 3 (calibración + golden-set eval). La rúbrica DEBE existir y estar testeada antes del command; el golden-set DEBE correr verde antes de prender el flag en cualquier entorno. NUNCA prender el flag productivo sin el eval anti falso-0 verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Falsa precisión: pilar cualitativo presentado como métrica dura | growth/ai | high | `evidenceMode: measured (●) \| evaluated (◑)` obligatorio por pilar; rúbrica separa `●` de `◑`; test dedicado; §16 regla dura | review + test |
| Falso-0 a marca de consumo (repite EPIC-021 / SKY) | growth/ai | medium | golden-set anti falso-0 (Slice 3) con consumo + B2B + YMYL; eval verde como gate de flag; test que falla si consumo se trata como agencia | eval + guard anti-regresión |
| El LLM asigna un pilar sin evidencia (inventa) | ai | medium | el command valida/sanitiza (patrón `sanitizeBrandIntelligence`); la rúbrica decide `insufficient_data`; el LLM aporta `◑`, no el veredicto | test + review |
| YMYL tratado con listón laxo (banda alta por buena prosa) | growth/ai | medium | detector YMYL conservador → Trust/Authority exigen señal dura + `review_required` en duda (patrón `accuracy/`) | test YMYL + review |
| SDK LLM paralelo / secret hardcodeado | ai/infra | low | reusar router `brand-intelligence`; secret server-side `*_SECRET_REF`; lint `no-direct-sdk` | lint + review |
| Migración `grader_eeat_assessments` mal formada (pre-up-marker) | data | low | marker `-- Up Migration` + bloque DO anti pre-up-marker + validar contra PG real | migración verify |
| Capability nueva sin grant → build roto o over/under-exposure | identity | low | grant al set operador (roles reales) + coverage test en el MISMO PR; NUNCA `client_*` | coverage test |
| Costo LLM descontrolado (por run en vez de por marca/versión) | ai | low | corre 1×/marca/versión (versionado), NUNCA por run; cost ceiling + budget; flag OFF = cero gasto | budget + logs |

### Feature flags / cutover

- Behind un flag env-var nuevo default OFF (`GROWTH_AI_VISIBILITY_EEAT_RATER_ENABLED` [verificar nombre], gateado además por el kill switch global `isGraderEnabled`, patrón de `flags.ts`). Registrar en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (gate `docs:closure-check`). Cutover: prender SOLO tras el golden-set eval verde + sign-off de costo. Sin cutover destructivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (rúbrica/contratos PUROS) | revert PR (sin IO, sin persistencia) | <5 min | si |
| Slice 2 (command + migración + capability) | flag OFF (command disabled) + revert PR + down migration (drop `grader_eeat_assessments`) + remover grant/registry | <15 min | si |
| Slice 3 (eval/golden-set) | revert PR (harness, sin runtime productivo) | <5 min | si |

### Production verification sequence

1. Migración `grader_eeat_assessments` aplicada + validada contra PG real (proxy); supersede atómico (un `active` por perfil) confirmado.
2. Capability `growth.ai_visibility.eeat.assess` en registry + grant al set operador + `capability-grant-coverage.test.ts` verde; un `client_*` NO puede ejecutarla.
3. Golden-set eval (Slice 3) **verde** en local/CI ANTES de prender el flag: consumo NO falso-0, B2B y YMYL dentro de tolerancia.
4. En staging con el flag ON: `assessEeat` sobre un perfil con señales completas → 4 pilares con `evidenceMode` correcto (`●`/`◑`), confianza calibrada, provenance poblada.
5. `assessEeat` sobre un perfil con señales parciales → `insufficient_data` en los pilares sin evidencia; NUNCA una banda fabricada; NUNCA falso-0.
6. `assessEeat` sobre un YMYL (finanzas/salud/legal) → rúbrica estricta + `review_required` en duda; sin banda alta por sola prosa.
7. Provider LLM no configurado → honest degradation (`disabled`/`not_configured`), NUNCA crash; raw error a observabilidad, no al cliente.
8. Prod vía release control plane cuando EPIC-022 se secuencie (behind flag; publicación de cara al cliente tras confirmación humana en TASK-1317).

### Out-of-band coordination required

- Provider LLM ya configurado (reusa `brand-intelligence`); confirmar cost ceiling/budget del rater + secret server-side antes de prender. Sign-off comercial/legal del uso del assessment de cara al cliente (materializa vía TASK-1317). Registrar el flag en el ledger.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe el command `assessEeat` en `src/lib/growth/ai-visibility/eeat/**` que compone las señales medidas (autor+trust TASK-1315, entidad TASK-1267, JSON-LD, `brand-intelligence`, backlinks TASK-1304) y produce un `EeatAssessment` de los **4 pilares** (Experience/Expertise/Authoritativeness/Trustworthiness).
- [ ] **Assessment, no dial:** cada verdict de pilar marca `evidenceMode: measured (●) | evaluated (◑)`; jamás un juicio presentado como métrica dura (verificado por test + review).
- [ ] **Rúbrica derivada de las Quality Rater Guidelines** declarada y versionada (`eeat/rubric.ts`, `EEAT_RUBRIC_VERSION`): qué evidencia sube/baja cada pilar, con umbrales documentados (no mágicos).
- [ ] **YMYL-aware:** detector YMYL (finanzas/salud/legal) que sube el listón de Trust/Authoritativeness y escala la duda a `review_required` (conservador); test dedicado.
- [ ] **Anti falso-0 + calibración:** golden-set (consumo + B2B + YMYL) corre verde; una marca de consumo NUNCA sale falso-0 (guard anti-regresión EPIC-021); confianza calibrada, no inventada.
- [ ] **Degradación honesta:** pilar sin evidencia suficiente → `insufficient_data` (NUNCA número fabricado ni `0` mentiroso); provider no configurado → honest degradation, NUNCA crash.
- [ ] **El LLM NO asigna el veredicto duro:** el command valida/sanitiza el output (patrón `sanitizeBrandIntelligenceOutput`) y la rúbrica determinista decide bandas/estados (el LLM aporta el juicio `◑`).
- [ ] **Reuso de infra:** router provider-agnostic de `brand-intelligence/` + `evals/` + patrón de `accuracy/`; NUNCA un SDK LLM paralelo; secret server-side.
- [ ] **Capability nueva** `growth.ai_visibility.eeat.assess` en registry + catálogo + grant al set operador (roles reales, NUNCA `client_*`) + coverage test verde, MISMO PR.
- [ ] Persistencia versionada `grader_eeat_assessments` (supersede atómico, un `active` por perfil); migración con marker + bloque DO, validada contra PG real.
- [ ] Flag env-var default OFF (gateado por `isGraderEnabled`), registrado en `FEATURE_FLAG_STATE_LEDGER.md`; el flag productivo se prende SOLO tras el golden-set eval verde.
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm build` verdes; migración validada contra PG real (gate TASK-893).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm docs:closure-check` (feature-flags-audit --strict) verde con el flag registrado.
- Correr el golden-set eval (Slice 3) verde ANTES de prender el flag; ejercer `assessEeat` en staging sobre perfiles completos / parciales / YMYL y verificar `●/◑`, `insufficient_data`, `review_required`, anti falso-0 y honest degradation.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado con el flag nuevo
- [ ] chequeo de impacto cruzado (TASK-1317 consume el assessment; TASK-1315 aporta las señales)
- [ ] documentación técnica de la rúbrica E-E-A-T (4 pilares + YMYL + calibración) en la arquitectura del dominio (§16) + documentación funcional/manual del assessment

## Follow-ups

- `TASK-1317` — `readEeatScorecard` + integración a topical authority (§15.1) / 360 + review/publicación de cara al cliente.
- Consumer UI (report artifact E-E-A-T) — follow-up ui-ux (marca `●`/`◑`, empty states honestos).
- Evaluar signal de reliability "eeat_assessment_review_backlog" (cola de `review_required`).
- Evaluar exponer `assessEeat` + el reader como recurso `api/platform/app`/MCP explícito para Nexa cuando el consumo lo justifique.
- Re-assess recurrente de perfiles (patrón regrade TASK-1270) si el valor lo justifica.

## Open Questions

1. ¿Nombre canónico de la capability — `growth.ai_visibility.eeat.assess`? Verificar contra el catálogo (`entitlements-catalog.ts`) + convención `module.domain.action` en Discovery.
2. ¿El rater emite una **banda** por pilar (alto/medio/bajo/insufficient) o un score 0-100 por pilar? Propuesta: banda + confianza (evita la falsa precisión de un número), con el score interno solo para ordenar. Resolver con la rúbrica en Discovery.
3. ¿El detector YMYL vive en `eeat/rubric.ts` o se reusa/extiende algo de `brand-intelligence`/`accuracy` (que ya es conservador YMYL)? Preferir reusar el conservadurismo YMYL de `accuracy/`.
4. ¿La persistencia es tabla nueva `grader_eeat_assessments` o se cuelga de `grader_scores`/`grader_brand_intelligence`? Propuesta: tabla nueva versionada (espejo `grader_brand_intelligence`) para no contaminar el scoring de percepción. Confirmar en Discovery.
5. ¿El golden-set del rater reusa `golden-set.v1.json` (extendido con pilares esperados) o vive en un `eeat-golden-set.v1.json` separado? Propuesta: archivo separado para no acoplar la eval de categoría con la de E-E-A-T.
