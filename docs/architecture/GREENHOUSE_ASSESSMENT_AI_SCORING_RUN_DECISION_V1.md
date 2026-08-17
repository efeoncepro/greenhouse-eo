# GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1 — Run asíncrono de scoring IA por assessment + revisión por excepción gobernada

- **Status**: Accepted (2026-08-17 — decisión autorizada por el CEO el 2026-08-16 e **implementada**: Slices 0–6 + workbench `TASK-1738` mergeados, migración aplicada y verificada contra PG real. **Aceptar ≠ prender**: los flags siguen OFF en todos los runtimes y el gate de promoción sigue bloqueante — hoy por VOLUMEN del gold set, 11 respuestas humanas calificadas contra un piso de 49)
- **Date**: 2026-08-16
- **Deciders**: CEO (autorización ejecutiva 2026-08-16, sesión de operador) · agente ejecutor Slice 0 `TASK-1734` (skill `arch-architect`)
- **Tags**: hiring, ats, ai, ops-worker, governance, privacy
- **Task owner**: [`TASK-1734`](../tasks/complete/TASK-1734-assessment-ai-scale-operator-exception-review.md) (EPIC-011)
- **Extiende**: `TASK-1361` (proposal ledger + propose/confirm individual) · `TASK-1360` (rollup canónico) · `TASK-1383` (dedupe por `input_digest`)

---

## Decisión (resumen ejecutivo)

Greenhouse escala el scoring IA de assessments desde propuestas individuales bajo demanda hacia un
**run asíncrono, durable e idempotente por `hiring_assessment` exacto**, con abstención/triage por
riesgo mediante policy versionada y **confirmación humana gobernada a nivel de run** con manifest
append-only. El run se ejecuta en el **`ops-worker` existente** (proyección reactiva liviana que crea
el run + drain endpoint con claim atómico y concurrencia/costo acotados) — **no se crea ningún
servicio Cloud Run nuevo**. El resultado es exclusivamente interno para operadores autorizados: el
postulante nunca ve puntaje, banda, rationale, confianza ni estado de revisión. Ningún run decide,
rankea, mueve etapa, asigna test ni envía correo: `propose → confirm → execute` permanece intacto.

Las siete sub-decisiones:

### D1 — Semántica de confirmación humana a nivel de run

Se introduce el aggregate `greenhouse_hiring.hiring_assessment_ai_scoring_run`:

- **Identidad e idempotencia**: a lo más **un run activo** por `assessmentId` + digest inmutable de
  inputs (answers + rubric + prompt version + policy version + **modelo EFECTIVO resuelto**). El
  digest usa el modelo que el runtime resolvió (`HIRING_ASSESSMENT_AI_SCORING_MODEL` env override o
  default `claude-sonnet-5` de `ai/config.ts`), **nunca el default asumido** — el override por
  runtime puede divergir (Delta 2026-08-16 punto 5). Replays/duplicados de
  `hiring.assessment.submitted` resuelven al mismo run, jamás a doble scoring.
- **State machine append-only**: estados enumerados (`created → enumerating → scoring →
  awaiting_review → confirmable → confirmed | cancelled | failed`, transiciones ilegales rechazadas
  a nivel DB con CHECK + tabla de historia append-only, patrón trio state-machine+CHECK+audit de
  `GREENHOUSE_CANONICAL_PATTERNS_V1.md`). Confirm/cancel son terminal-once bajo `FOR UPDATE`.
- **Item lineage exacto**: cada run item referencia `applicationId → assessmentId → responseId` +
  `proposalId` + `input_digest` del proposal (TASK-1383). Un item cuyo digest quedó stale (answer/
  rubric/modelo cambió post-proposal) no es confirmable por el run: exige nueva propuesta/revisión.
- **Manifest de confirmación append-only**: la confirmación del run registra como hechos
  estructurados (a) IDs de todas las propuestas cubiertas, (b) la muestra ciega de calidad revisada
  (item IDs + veredictos), (c) las excepciones `mandatory_review` resueltas (item + resolución +
  reason code), (d) actor con autoridad de score (`hiring.assessment.score`), (e) policy/model/
  prompt/input digests vigentes al confirmar, y (f) **por cada item revisado por humano, el campo
  `reviewer_saw_proposal_before_scoring` (boolean)** — el carril `mandatory_review` expone la
  propuesta antes del juicio humano y ese anclaje debe quedar como evidencia auditable mientras el
  workbench anti-anclaje llega en follow-up (Delta punto 9). Un botón "aceptar todo" sin manifest
  no es supervisión humana y no existe como camino.
- La confirmación aplica las propuestas cubiertas **atómica e idempotentemente a través del command
  canónico de TASK-1361/1360** (`confirmAiProposal` → `recordHumanScore`); el run no re-implementa
  aplicación de score. El confirm individual por-respuesta existente sigue disponible siempre.

### D2 — Abstención, mandatory review y quality sample (policy versionada)

Una **policy de risk-routing versionada** (fila persistida + digest en el run) clasifica cada
propuesta en `mandatory_review` | `quality_sample` | `batch_eligible`. Señales mínimas obligatorias
(spec §Risk-routing minimum signals):

1. confianza baja o no calibrada para la pregunta/template/versión exacta;
2. respuesta vacía, demasiado corta, off-topic, multilingüe/out-of-distribution o malformada;
3. prompt injection, PII embebida/dato protegido o claim externo no soportado;
4. rubric faltante/incompleta, criterio sin evidencia exacta citada o criterios contradictorios;
5. competencia de alto peso o score dentro de la banda near-decision definida por policy;
6. versión de modelo/prompt/rubric sin eval vigente, degradación de provider/schema o drift alert;
7. muestra ciega aleatoria y cualquier contestación de candidato/operador.

**La confianza self-report del modelo puede almacenarse como señal pero NUNCA decide elegibilidad
sola**; la elegibilidad `batch_eligible` exige confianza calibrada contra outcomes humanos por
pregunta/template/versión (Slice 3). Toda abstención o fallo vuelve a corrección humana
(fail-closed manual): ningún item desaparece de la cola.

### D3 — Provenance, contestabilidad, retención y reconciliación del backlog huérfano

- **Propuestas inmutables**: una proposal nunca se edita in-place; los cambios de estado son
  transiciones auditadas y la reconstrucción (qué modelo/prompt/policy/input produjo qué score, quién
  confirmó y cuándo) es posible desde datos append-only. Logs/eventos llevan solo hashes/códigos/
  métricas aprobados, nunca texto de respuesta ni PII.
- **Contestabilidad**: una contestación (candidato vía canal externo u operador) enruta el item a
  `mandatory_review` (señal 7) y queda registrada; el score humano posterior supersede sin borrar.
- **Retención**: proposals, runs, manifests e historia son evidencia de supervisión — retención
  alineada al expediente de hiring; cualquier import de dataset de eval es anonimizado, con
  propósito aprobado y contrato de borrado (spec §Backfill).
- **Reconciliación del backlog huérfano pre-existente** (Delta punto 3): hoy, cuando un score se
  aplica por el carril manual directo (`recordHumanScore` + `finalizeAssessment` sin confirm — caso
  real EO-ASM-0050), las proposals `proposed` quedan huérfanas para siempre y el confirm posterior
  falla 409 sin transicionarlas. El run aggregate incluye un **comando de reconciliación idempotente**
  que transiciona esas huérfanas a un estado terminal explícito (`superseded_by_manual`, con reason
  code y referencia al score humano aplicado), tanto para el flujo nuevo como para el backlog
  histórico. Señal de reliability de huérfanas con steady=0.

### D4 — Workload placement: `ops-worker` (no servicio nuevo, no Vercel inline)

**Decisión: el fan-out de scoring vive en el `ops-worker` existente**, en dos piezas:

1. **Proyección reactiva liviana** (`hiring-assessment-ai-scoring.ts`, registrada en
   `projections/index.ts`): consume `hiring.assessment.submitted`, crea/actualiza el run y encola
   items. Trabajo transaccional de milisegundos — **cero llamadas a provider inline en la
   proyección** (no bloquea el lane reactivo ni el publisher del outbox).
2. **Drain endpoint dedicado** en el ops-worker (patrón claim atómico `FOR UPDATE SKIP LOCKED` ya
   productivo en el servicio — mismo patrón del drain TASK-1664), disparado por Cloud Scheduler:
   reclama items pendientes con **bounded concurrency, cost cap por run, timeout, retry budget y
   circuit breaker**, ejecuta el `proposeScoreForResponse` canónico y persiste resultado/abstención.

Criterios que validan la recomendación preliminar del operador:

- **Duración**: el fan-out es acotado (≤~12 respuestas abiertas por assessment; una cohorte entrega
  assessments individualmente, no en batch). Cada llamada structured-output es de segundos; un run
  completo cabe en el budget de un drain tick. No es un job de minutos tipo render.
- **Concurrencia**: el claim atómico + lease por run ya existen como patrón en el servicio; no se
  necesita infraestructura de jobs nueva.
- **Build inputs**: el provider SDK (Anthropic vía `generateStructuredAnthropic`) ya es dependencia
  runtime del ops-worker; cero dependencia pesada nueva, cero input de filesystem. Debe pasar
  `pnpm worker:build-contract-gate` + `pnpm worker:runtime-deps-gate`.
- **Anti-catch-all**: el ops-worker es el runtime canónico de proyecciones reactivas + drains
  livianos del dominio (ya corre los consumers hiring de lifecycle emails, handoff, candidate
  review). Esto ES su perfil; lo que lo convertiría en catch-all es trabajo largo/pesado (Chromium,
  render, jobs de minutos), que ya está prohibido ahí (ADR Tender Deck Composer: el render vive en
  `artifact-worker`, NUNCA en ops-worker porque bloquearía el publisher del outbox).
- **Cláusula de escape medida**: si la evidencia de staging shadow muestra que la duración real de
  un run excede el budget del drain tick del ops-worker (p95 de run > el intervalo del scheduler o
  starvation observable de otros drains), el fan-out migra al **`artifact-worker`** (jobs largos por
  enqueue, idempotencia por hash ya probada) **sin cambiar el aggregate ni los commands** — solo el
  ejecutor del drain. Esa migración es un follow-up con task propia.
- **NO se crea ningún servicio Cloud Run nuevo** sin task formal bajo EPIC-026; esta decisión no lo
  autoriza. Tampoco se ejecuta ningún fan-out LLM inline en un route handler Vercel.

### D5 — Matriz de sign-offs: resuelta por autorización ejecutiva

La matriz Talent/Legal/Privacy/Security/Identity/AI Platform quedó **resuelta por autorización
explícita del CEO el 2026-08-16** (sesión de operador; Delta punto 1 de la task). Este ADR la
registra como **autorización otorgada** — ninguna firma adicional bloquea el avance. Sin rebaja:

- Los **gates técnicos NO se rebajan**: promotion-grade eval con doble rating humano independiente +
  adjudicación, staging shadow, canary sintético → canary allowlisted con owner nombrado, suite
  anti-leak candidate/public/email, flags default-OFF.
- Las **actividades operativas** de esas áreas siguen siendo trabajo real de la task (ya autorizado):
  rubric owners, rater training, provider terms/DPA, threat model, capabilities, quotas, rollback
  rehearsal.
- El **aviso de transparencia al candidato** sobre uso de IA sigue vigente como **obligación
  regulatoria** (no interna): Legal/Privacy define el copy por jurisdicción; el aviso jamás revela
  score ni evaluación individualizada.

### D6 — Flags (default-OFF, independientes, multi-runtime)

| Flag | Gatea | Runtime owner | Default |
|---|---|---|---|
| `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED` | creación de runs + fan-out de scoring (proyección + drain) | **ops-worker** (`services/ops-worker/deploy.sh` como SoT + `--update-env-vars` en vivo) | OFF |
| `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` | elegibilidad `batch_eligible` por policy (OFF ⇒ todo item es `mandatory_review`) | **ops-worker** (evaluación de policy en el drain) + Vercel (readers reflejan la clase) | OFF |
| `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` | command de confirmación de run (batch) | **Vercel** (App API `/api/hiring/assessments/ai/**`) | OFF |

Notas duras:

- El master `HIRING_ASSESSMENT_AI_ENABLED` **YA está ON en Vercel Production desde 2026-07-16**
  (Delta punto 2; las filas per-flag del ledger están stale y se corrigen al ejecutar): el
  shadow-first de estos flags nuevos es aún más crítico partiendo de un master abierto. Verificar
  live (`vercel env pull` + revisión activa de Cloud Run), no confiar en docs.
- El master **NO gatea confirm/reject** por diseño (`ai/config.ts`): el rollback opera por los flags
  nuevos y los commands de run (confirm OFF → enqueue OFF → drain/cancel/reconcile → cola manual),
  nunca "apagando el master" (Delta punto 4).
- Los tres flags se registran en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime
  ownership en el mismo PR que los declara. La visibilidad de resultados al candidato NO tiene flag:
  está prohibida por contrato en todo estado.

### D7 — Frontera con TASK-1735 (Evaluation Dossier)

**Un solo hábitat por tipo de contenido**: el manifest/audit del run registra **hechos
estructurados** (IDs, digests, reason codes, clases de riesgo, actor, timestamps). La **narrativa
libre del revisor** (por qué discrepó, matices cualitativos) vive como nota `kind=assessment_review`
del expediente de TASK-1735, con `context_json = {runId, proposalId}` para el cruce. El run nunca
almacena narrativa duplicada; el dossier nunca almacena los hechos del manifest.

---

## Alternativas rechazadas

- **Fan-out inline en Vercel al recibir el submit**: acopla latencia/costo LLM al request path
  público y viola la topología async canónica (outbox → worker). Rechazada.
- **Servicio Cloud Run nuevo (`assessment-scoring-worker`)**: deployable nuevo durante EPIC-027 sin
  evidencia de que el volumen lo justifique; prohibido sin task EPIC-026. Rechazada.
- **`artifact-worker` como primer hogar**: es el lane de jobs largos por enqueue (render Chromium);
  un fan-out de segundos con ≤~12 items no amerita su overhead de job-queue — queda como escape
  medido si la duración real supera el budget del drain (ver D4). Rechazada como default.
- **`ico-batch`**: runtime de batch analítico de métricas; meter scoring de hiring ahí sí sería el
  catch-all que la Open Question teme. Rechazada.
- **Confirmación "accept all" sin manifest**: un click sin evidencia de muestra ciega + excepciones
  cerradas no es supervisión humana (riesgo rubber-stamp de la matriz). Rechazada.
- **Auto-aplicar scores `batch_eligible` sin confirmación humana**: convierte IA en decisión de
  contratación y rompe `propose → confirm → execute`. Rechazada.
- **Confianza self-report del modelo como criterio de elegibilidad**: no está calibrada; solo señal
  almacenable, jamás decisora (D2). Rechazada.
- **Un segundo scorer/policy engine dentro del run**: TASK-1361 es dueña del proposal ledger,
  provider adapter y confirm; duplicarlo crea drift de contratos. Rechazada.
- **No hacer nada (statu quo)**: 700 correcciones manuales por cohorte, proposals huérfanas sin
  reconciliación y anclaje sin evidencia; no escala y ya degrada la operación real. Rechazada.

---

## 4-Pillar Score

### Safety

- **What can go wrong**: un score IA no confirmado entra al rollup, un resultado se filtra al
  candidato, o texto de candidato con injection/PII llega crudo al provider o a logs.
- **Gates**: capabilities finas (`hiring.assessment.ai_assist` para propose; `hiring.assessment.score`
  para aplicar; capability run/confirm más estrecha si la implementación confirma separación — nunca
  `internal` amplio ni `client_*`); confirmación humana terminal-once con manifest; packet provider
  allowlisted/minimizado; denylist candidate/public/email con tests negativos (Slice 5 parte de
  cobertura CERO sobre `PublicAssessmentView` y `/api/public/assessment/[token]` — Delta punto 6);
  tres flags default-OFF independientes.
- **Blast radius if wrong**: un assessment/aplicación (lineage exacto); el anti-leak es el único
  riesgo cross-candidato y tiene suite propia pre-canary.
- **Verified by**: tests de contrato/estado, probes negativos candidate/public/email, tests IDOR/
  cross-application/revoked, adversarial corpus injection/PII.
- **Residual risk**: anclaje humano en `mandatory_review` (la propuesta se ve antes del juicio) —
  mitigado solo con evidencia (`reviewer_saw_proposal_before_scoring`) hasta el workbench follow-up;
  y el aviso de transparencia por jurisdicción sigue abierto (Legal/Privacy).

### Robustness

- **Idempotency**: run único por `assessmentId + digest` (unique); dedupe de proposals por
  `input_digest` (TASK-1383); replay del evento resuelve al mismo run.
- **Atomicity**: creación de run + items en una tx; confirm aplica proposals vía el command canónico
  dentro de tx con `FOR UPDATE`; reconciliación idempotente.
- **Race protection**: claim `FOR UPDATE SKIP LOCKED` por item, lease por run, terminal-once
  confirm/cancel, unique parcial de run activo.
- **Constraint coverage**: CHECK de state machine, unique de run activo por digest, FKs de lineage
  exacto, trigger anti-UPDATE/DELETE en historia/manifest.
- **Verified by**: tests de concurrencia/replay/stale contra PG real (invariante SQL live-testing
  ISSUE-071), smoke sintético submitted → run → items → confirm → rollup.

### Resilience

- **Retry policy**: retry budget acotado + backoff por item; circuit breaker de provider; fallo
  agotado ⇒ item vuelve a cola manual con reason code (fail-closed, nunca item perdido).
- **Dead letter**: items agotados quedan en estado explícito visible al operador; el run no confirma
  con items sin resolver.
- **Reliability signals**: backlog/stuck de runs, fallas provider/schema, tasa de abstención,
  override/sample disagreement, drift por pregunta/template, huérfanas de reconciliación,
  costo/latencia — todas PII-free, steady definido por señal.
- **Audit trail**: run lifecycle, routing de items, decisiones humanas de muestra/excepción y
  manifest, todo append-only.
- **Recovery procedure**: secuencia documentada confirm OFF → enqueue OFF → drain/cancel/reconcile →
  readback de cola manual; probada con sintéticos antes de canary (Slice 6).

### Scalability

- **Hot path Big-O**: O(items del assessment) por run (≤~12); reader de revisión exact-assessment
  scoped e indexado (reemplaza el reader global LIMIT 50 con filtro client-side — Delta punto 7).
- **Index coverage**: índices por `(assessment_id, status)` en run/items y por digest; paginación por
  cursor en readers de items si crecen.
- **Async paths**: todo el fan-out LLM fuera del request path (proyección + drain scheduler); Vercel
  solo commands/readers.
- **Cost at 10x**: lineal por respuesta con cost cap por run + quota provider; 10x cohortes = más
  ticks de drain, sin rediseño; si la duración real excede el budget, migración medida a
  artifact-worker sin cambiar el contrato (D4).
- **Pagination**: readers de items/proposals paginados por cursor, scoped al assessment exacto.

---

## Consecuencias

### Positivas

- 700 correcciones manuales por cohorte colapsan a excepciones + muestra ciega + una confirmación
  gobernada con evidencia real de supervisión.
- El backlog huérfano pre-existente gana camino de reconciliación auditable.
- Full API Parity desde el nacimiento: UI futura, Nexa y MCP (si se aprueba adapter) consumen los
  mismos commands/readers.

### Negativas

- Más superficie de estado (run + items + manifest + policy) que mantener consistente con el ledger
  de TASK-1361.
- El ops-worker suma un drain más; exige vigilar el budget del tick (cláusula de escape D4).
- La evidencia de promoción (Slice 3) es cara: dataset estratificado + doble rating humano.

### Neutrales / estructurales

- La UI operador (workbench anti-anclaje) queda deliberadamente fuera: follow-up `ui-ux` sobre el
  reader del run.
- MCP/B2B fuera de alcance salvo task nueva con identidad delegada y canary propio.

---

## Hard rules

- **NUNCA** un score IA entra al rollup canónico sin confirmación humana (individual o de run) vía el
  command gobernado; **NUNCA** un run rankea, decide, mueve stage, asigna test, envía correo ni
  escribe payroll/ICO.
- **NUNCA** el postulante, un payload público/cliente o un email recibe score, banda, rationale,
  confianza, clase de riesgo, proposal ni estado de revisión; esta prohibición no tiene flag.
- **NUNCA** ejecutar fan-out LLM inline en un route handler Vercel ni dentro del cuerpo de la
  proyección reactiva; el scoring corre solo en el drain del worker con claim atómico.
- **NUNCA** crear un servicio Cloud Run nuevo para este dominio sin task formal bajo EPIC-026; el
  placement por defecto es el `ops-worker` y la única migración prevista es al `artifact-worker` con
  evidencia de duración medida.
- **NUNCA** computar el digest del run con el modelo default: **SIEMPRE** con el modelo EFECTIVO
  resuelto del runtime (`HIRING_ASSESSMENT_AI_SCORING_MODEL` override incluido).
- **NUNCA** confirmar un run con items `mandatory_review` sin resolver, muestra ciega incompleta o
  digests stale; **SIEMPRE** manifest append-only con propuestas cubiertas, muestra, excepciones,
  actor y `reviewer_saw_proposal_before_scoring` por item humano.
- **NUNCA** usar la confianza self-report del modelo como criterio único de elegibilidad
  `batch_eligible`; **SIEMPRE** confianza calibrada contra outcomes humanos por pregunta/template/
  versión con eval vigente.
- **NUNCA** planear rollback "apagando el master flag" (`HIRING_ASSESSMENT_AI_ENABLED` no gatea
  confirm/reject y ya está ON en prod): **SIEMPRE** por los flags nuevos + commands de run
  (confirm OFF → enqueue OFF → drain/cancel/reconcile → cola manual).
- **NUNCA** editar una proposal in-place ni borrar historia/manifest (append-only); las huérfanas
  del carril manual se cierran por reconciliación con estado terminal explícito, no por DELETE.
- **SIEMPRE** registrar los tres flags en el ledger con runtime ownership en el mismo PR, aplicarlos
  en `deploy.sh` (SoT) además del update en vivo, y verificar el estado live por runtime antes de
  cualquier flip.
- **SIEMPRE** mantener la narrativa del revisor en la nota `assessment_review` del expediente
  (TASK-1735) con `context_json.{runId,proposalId}`; el manifest guarda solo hechos estructurados.

---

## Open Questions (deliberadamente no decidido)

1. **Cohorte multi-assessment**: la confirmación opera sobre **un assessment exacto por acción de
   operador** hasta que la evidencia del canary soporte un boundary más amplio; cualquier cohorte
   acotada requiere revisión de esta decisión (supersede, no edición).
2. **Aviso de transparencia por jurisdicción**: Legal/Privacy define el copy y el canal por país de
   contratación; el resultado individual permanece interno sea cual sea esa respuesta.
3. **Umbral medido de migración a `artifact-worker`**: el número exacto (p95 de duración de run vs
   intervalo del scheduler / starvation de otros drains) se fija con datos del staging shadow, no
   se inventa aquí.
4. **Separación de capability run/confirm** vs reutilizar `hiring.assessment.ai_assist` +
   `hiring.assessment.score`: la implementación de Slice 1/4 la confirma con el catálogo de
   entitlements real (coverage test en el mismo PR).

## Delta 2026-08-16 — Correcciones de auditoría doble + riesgo residual

Cierre de la auditoría doble sobre `src/lib/hiring/assessment/ai/scoring-run/**` (mismo día del ADR):

- **Muestra ciega ahora ESTRUCTURAL en el reader** (fix de auditoría 2026-08-16): `review-reader.ts`
  omite el bloque `proposal` del DTO mientras un item `quality_sample` no tenga resolución humana —
  la ceguera de D2 la garantiza el reader, no la disciplina de una UI futura (procedural). Tras la
  resolución, el proposal aparece para contraste/auditoría; `saw_proposal_before_scoring` sigue
  siendo la evidencia anti-anclaje por item. Fixes hermanos del mismo pase: el filtro terminal de
  items del reconcile (`commands.ts`) ahora se DERIVA del enum canónico (el literal hardcodeado
  omitía `rejected_to_manual` — runs que jamás cerraban) con test de paridad SQL↔TS, y el loop del
  drain ya no aborta el tick ante un run venenoso (head-of-line starvation): observa vía
  `captureWithDomain`, registra `failedRuns` en el summary y continúa.
- **Riesgo residual — flip de `EXCEPTION_POLICY` sigue procedural**: prender
  `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` depende del runbook + ledger (humano verifica la
  evidencia del promotion gate antes del flip); nada mecánico impide un flip sin evidencia.
  Follow-up declarado en `TASK-1734` para atarlo a una policy row con evidencia de eval que el
  drain verifique en runtime.
- **Replay post-terminal crea runs vacíos benignos** (documentado, no bug): un
  `hiring.assessment.submitted` re-entregado después de que el run original quedó terminal crea un
  run nuevo que enumera 0 respuestas elegibles (todas ya con score humano) y queda
  `awaiting_review` con reason `no_eligible_items` — sin doble scoring, sin gasto de provider,
  cerrable por reconcile. Es la evidencia honesta del replay, no trabajo fantasma.

## Referencias

- [`TASK-1734`](../tasks/in-progress/TASK-1734-assessment-ai-scale-operator-exception-review.md) — spec + `## Delta 2026-08-16` (runtime-verificado)
- [`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`](GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
- [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
- [`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`](GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md)
- [`GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`](GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md)
- [`agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`](agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md)
- [`GREENHOUSE_CANONICAL_PATTERNS_V1.md`](GREENHOUSE_CANONICAL_PATTERNS_V1.md) — trio state-machine+CHECK+audit, flag default-OFF+shadow+flip
- `docs/tasks/complete/TASK-1361-assessment-ai-assist.md` · `TASK-1360` · `TASK-1383` · `docs/tasks/to-do/TASK-1735-hiring-application-evaluation-dossier.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
