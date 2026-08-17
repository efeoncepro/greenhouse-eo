# GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1 — Policy de assignment opening→plantilla, fan-in de comunicación y snapshot inmutable del cuestionario

- **Status**: Accepted (2026-08-17 — autorización ejecutiva del CEO, misma figura que `TASK-1734`/`TASK-1736`. **Aceptar ≠ prender**: `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` nace OFF, toda policy nace `draft`+`manual`, y la expansión más allá del canary sigue bloqueada por el snapshot de D4)
- **Date**: 2026-08-17
- **Deciders**: CEO (autorización ejecutiva 2026-08-17, sesión de operador) · agente ejecutor Slice 0 `TASK-1719` (lentes `arch-architect` + `greenhouse-talent-people-operator`)
- **Tags**: hiring, ats, assessment, ops-worker, notifications, governance, fairness, privacy
- **Task owner**: [`TASK-1719`](../tasks/in-progress/TASK-1719-hiring-opening-assessment-policy-stage-triggered-assignment.md) (EPIC-011)
- **Extiende**: `TASK-1360` (assessment engine + `assignCandidateTest`) · `TASK-1383` (versión + inmutabilidad de template, dedupe por digest) · `TASK-1689` (emails transaccionales de lifecycle) · `TASK-1363` (superficie de rendición)
- **Hermano**: [`GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`](GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md) — aquel decide cómo se **puntúa** un assessment; éste decide cómo se **asigna**. Ninguno de los dos permite que un score mueva etapa.

---

## Decisión (resumen ejecutivo)

Greenhouse vincula una `HiringOpening` a una plantilla de assessment mediante una **policy versionada**, y
asigna el test por dos rutas que convergen en **un command idempotente**: confirmación humana explícita o
entrada a una etapa configurada. La automatización es **determinística** — regla etapa→plantilla, sin
inferencia — y no decide, no rankea, no rechaza y no interpreta scores.

Sobre la spec original, este ADR corrige dos supuestos falsos (D0), reescribe la coordinación del correo
como **fan-in en un solo consumer** (D1), fija la idempotencia en tres capas con el patrón ya productivo de
`createScoringRun` (D2), crea una **capability role-only** para gobernar la policy (D3), introduce el
**snapshot inmutable del cuestionario por instancia** como requisito duro antes de expandir (D4), agrega tres
protecciones propias que no esperan a `TASK-1739` (D5) y reemplaza el rollout propuesto por una secuencia que
parte donde el sistema ya fue ejercitado (D6).

### D0 — Los dos hallazgos que invalidan supuestos de la spec

Ambos se descubrieron leyendo runtime, no documentación. Cada uno invalida una premisa que la spec daba por
cierta, y ambos fallan **en silencio**.

**(a) El consumer reactivo hace coalescing por scope y conserva el ÚLTIMO payload.**
`src/lib/sync/reactive-consumer.ts:644-660` agrupa por `projection:entityType:entityId`, acumula todos los
eventos del tick pero ejecuta **un solo refresh** con el payload más reciente:

```ts
// Always keep the most recent payload as representative — tie-broken
// by occurred_at order which is already ASC.
existing.representativePayload = payload   // :652
```

El lane `notifications` corre cada **2 min** (`services/ops-worker/deploy.sh:1097-1102`, la cadencia más alta
del servicio) y es **exactamente donde viven las dos projections de correo** — `hiring_stage_changed_email` y
`hiring_assessment_submitted_internal_email` (`projections/index.ts:198-199`). Consecuencia directa: un
candidato que pasa `shortlisted → interview` dentro de esa ventana entrega **un solo refresh con
`stage: interview`**, y la etapa que debía disparar el test **desaparece sin traza**. No hay error, no hay
dead-letter, no hay señal: el test simplemente nunca se asigna.

⇒ **El trigger NUNCA se deriva de `payload.stage`.** El consumer re-lee el estado vigente en PostgreSQL con
**el mismo predicado** que usará el reader de reconciliación. El payload sirve para saber *que algo pasó* con
esa aplicación, jamás para saber *qué etapa* la tocó. La reconciliación deja de ser una red de seguridad
opcional y pasa a ser parte del contrato: es la que atrapa el trigger que el coalescing se comió.

**(b) El cuestionario NO está congelado por el template — la premisa vieja era falsa, y el problema real es peor.**
La spec asumía que el template no tenía versión. Es **falso**: `TASK-1383` le dio versión e inmutabilidad
(`migrations/20260710202351833_task-1383-assessment-hardening.sql:60-115`), con triggers que abortan cualquier
mutación de un template que ya tenga instancias.

El problema real es que **esa inmutabilidad cubre el template y sus MÓDULOS, no las PREGUNTAS**:
`hiring_question` no está protegida por ningún trigger. Y `src/lib/hiring/assessment/public-taking.ts:241-285`
**resuelve el set en vivo** en cada carga (`:356`, `:483`, `:509`) — un `ROW_NUMBER()` por módulo, ordenado por
match de nivel, tipo de pregunta y `q.created_at DESC NULLS LAST`, filtrando `q.status = 'active'`, con
`LIMIT 12` global y top-N por módulo. Agregar o archivar una pregunta cambia el examen del siguiente candidato
**con el mismo `template_id` y la misma versión**. Peor: dentro de una misma instancia, abrir el lunes y
terminar el jueves puede rendir preguntas distintas.

⇒ Versionar el template no arregla nada, porque el template ya está versionado. Lo que falta es congelar
**la resolución** (D4). Sin eso, el comentario "`template_id` = contenido congelado" no se sostiene, comparar
dos candidatos "del mismo test" es comparar dos exámenes distintos, y ninguna defensa de validez se sostiene.

### D1 — Fan-in de comunicación: un solo consumer decide, y decide ANTES de enviar

`hiring.application.stage_changed` deja de tener dos consumers compitiendo. Se crea **un consumer único**,
`hiring_stage_changed_candidate_comms` (domain `notifications`), que **absorbe** a
`hiringStageChangedEmailProjection` — projection key `hiring_stage_changed_email`
(`src/lib/sync/projections/hiring-lifecycle-emails.ts:82-86`, registrada en `projections/index.ts:199`).
Ese consumer:

1. Deriva la etapa del estado vigente (D0a), resuelve la policy y decide
   `commsIntent ∈ { assessment_assignment | stage_advanced | none:<reason> }`.
2. **Persiste el intent ANTES de enviar.** El intent es el hecho durable; el envío es su consecuencia.
3. Distingue outcome de fault:
   - **Outcome terminal-tipado** (`held | blocked | stale`) ⇒ degrada al correo genérico de avance **en la
     misma ejecución**. El candidato nunca recibe cero comunicación por un bloqueo del assignment.
   - **Fault** (throw) ⇒ retry del dispatcher **sin comunicar nada**. Un error transitorio no debe producir
     un correo que después haya que desmentir.

**Rechazado: "el sender consulta la policy y hace skip".** Decide sobre una predicción. Si el email corre
primero y la policy termina `held`, el resultado es **silencio total** — peor que dos correos, porque dos
correos se ven y el silencio no.

**Copy.** El email del test **absorbe** el avance: `Avanzaste a {stage} — este es tu siguiente paso`. La razón
es literal, no estética: `src/emails/HiringStageAdvancedEmail.tsx:43` dice *"Nuestro equipo te contactará por
correo con los detalles de este paso. **Por ahora no necesitas hacer nada más.**"*, lo que contradice de frente
pedirle una prueba. Cuando el assignment queda bloqueado, se envía el genérico **sin modificar**. Todo el copy
nuevo vive en dictionaries (es-CL + en-US), **NUNCA inline**.

Ambos correos incluyen la línea de accommodations — *"Si necesitas más tiempo o algún ajuste, respóndenos este
correo"*. El fundamento es un hallazgo concreto: `accommodations_json` está cableado **end-to-end en lectura y
render** (columna en `migrations/20260708113233408_task-1360-assessment-engine.sql:81`, derivación de tiempo
extra en `public-taking.ts:171-186`, banner al candidato en `AssessmentTakingClient.tsx:353-358`) y
`assignCandidateTest` acepta y persiste el campo (`instances.ts:233`, `:289`) — pero **el único caller
productivo no lo pasa** (`src/app/api/hiring/assessments/route.ts:93`). Hoy la accesibilidad es **código muerto
en producción**, alcanzable sólo por SQL manual: el banner existe, el camino para pedirlo no. La línea de copy
es la puerta mínima mientras no exista write path.

### D2 — Idempotencia en tres capas, con el patrón que ya es productivo

**Capa 1 — ledger propio.** UNIQUE parcial
`(application_id, policy_id, policy_version, trigger_stage, attempt_seq) WHERE superseded_at IS NULL`.

**Capa 2 — patrón exacto de `createScoringRun`** (`ai/scoring-run/store.ts:216-252`):
`ON CONFLICT … DO NOTHING RETURNING` + re-lectura del ganador (`findActiveScoringRun`), **sin excepción de por
medio**. La carrera no es un error: es un resultado tipado. El patrón correcto ya existe en el mismo dominio.

**Capa 3 — límite de autoridad.** **La automatización SOLO escribe `attempt_seq = 1`.** Retake y
re-asignación post-cancelación son **commands humanos** con capability y razón. Un bug de la policy no puede
generar la segunda prueba de nadie.

**Refactor de `assignCandidateTest`** (`instances.ts:237-303`): se extrae `insertCandidateTest(client, …)` con
`ON CONFLICT` sobre el índice parcial **ya existente** `hiring_assessment_open_instance_unique_idx`
(`migrations/20260710223640237_audit-hiring-structural-uniqueness.sql:12-14`). El route legacy traduce
`created:false` → **409** (el contrato POST queda intacto); el command nuevo devuelve `already_assigned`
tipado. **La rama `created:false` NO devuelve token.**

Esto corrige un **bug latente ya presente en producción**, más grave de lo que la spec suponía. Hoy el command
hace **check-then-insert**: un `SELECT` previo que filtra `status IN ('assigned','sent','in_progress')`
(`:259-265`) seguido de un `INSERT` (`:280-284`). Pero el índice parcial cubre **cuatro** estados — incluye
`submitted`. Hay entonces **dos vías de escape**:

1. **Mismatch de predicado** (no es una carrera, es determinista): con una instancia `submitted`, el `SELECT`
   no la ve, el `INSERT` viola el índice y sale un `23505` crudo.
2. **Carrera** entre el `SELECT` y el `INSERT` con dos assigns concurrentes.

En ambos casos el error **no** es `HiringValidationError`, así que `error-response.ts:41-52` cae al branch
genérico: **HTTP 500 `hiring_internal_error` con `actionable: true`** — la UI ofrece "Reintentar" para algo que
no se resuelve reintentando nunca. En el carril reactivo el mismo `23505` se comporta como fault y produce
**dead-letter fabricado**. Alinear el predicado y adoptar `ON CONFLICT` cierra las dos salidas de una vez.

### D3 — Capability nueva role-only para gobernar la policy

Se crea `hiring.assessment.policy.govern` (action `execute`, scope `tenant`), granteada a
`EFEONCE_ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS`, **sin routeGroup `internal`** — precedente literal del
audit 2026-07-10 (`src/lib/entitlements/runtime.ts:588-598`), que ya gobierna así los cuatro verbos
consecuentes del dominio (`hiring.opening.publish`, `hiring.application.decide`, `hiring.assessment.score`,
`hiring.handoff.approve`). El motivo registrado ahí aplica idénticamente: **todo tenant interno porta
`internal` incondicionalmente**, así que incluirlo abriría el tier a `collaborator`/`designer`/`people_viewer`.
Gobierna **configurar la policy** y **habilitar `on_stage_entry`**.

**Rechazado: endurecer `hiring.assessment.author`.** Sería una regresión sobre los consumers de `TASK-1360`/
`TASK-1363` y mezcla dos verbos ortogonales: **autorar contenido ≠ decidir que el sistema escriba a una
cohorte**. El assign manual puntual se queda en `author`; lo que cambia de naturaleza al automatizarse es la
policy, no el acto de asignar.

Grant en el **mismo PR** que la registra (guard de capability-grant-coverage).

### D4 — Snapshot inmutable del cuestionario por instancia (NO versionar el template)

En la transacción del assignment se **materializa la lista exacta** de competencias + preguntas resueltas
(JSONB append-only) + un `content_digest`. `public-taking` lee **del snapshot**, con fallback legacy para las
instancias que nacieron antes.

Es lo único que garantiza **comparabilidad real** entre candidatos, y es simultáneamente la documentación
técnica que una defensa AI-Act/laboral exige: *qué examen exacto rindió esta persona*. La policy además guarda
el `content_digest` **observado al habilitarse**, lo que detecta drift del banco de preguntas de forma barata.

**El conteo real de preguntas convierte esto de riesgo teórico en riesgo activo.** Hay competencias con **una
sola pregunta activa** — `communication`, `content_analytics`, `research_synthesis`, `tool_fluency`. Como
`public-taking` toma top-N por módulo sobre `status='active'` (D0b), **archivar esa única pregunta deja el
módulo completamente vacío para el siguiente candidato, sin ruido, sin error y sin señal**: la prueba encoge y
nadie se entera. No hace falta un cambio malicioso ni masivo; basta que alguien archive una pregunta que cree
obsoleta.

**Secuencia**: el digest entra en Slice 1. **El snapshot es requisito duro antes de expandir la automatización
más allá del canary** — no un follow-up opcional.

### D5 — Tres protecciones propias, sin esperar a `TASK-1739`

1. **Nacimiento seguro.** Toda policy nace `draft` + `manual`. Pasar a `enabled` + `on_stage_entry` exige la
   capability de D3 **+ opening `published` + audit**. Configurar no es habilitar.
2. **Cap de volumen por opening/ventana.** Si una policy dispara más de N asignaciones en una ventana,
   **auto-detención** + evento `hiring.assessment_auto_assignment_blocked` con reason `volume_cap`. Un error de
   configuración se paga con N correos, no con la cohorte entera.
3. **Recipient readiness fail-closed** con denylist de dominios no entregables (`.test`, `.invalid`, `.local`)
   ⇒ `blocked: unverified_recipient`. Es una **capa desechable**: se retira cuando `TASK-1739` aterrice
   `data_origin`, y así queda declarada para que nadie la trate como permanente.

### D6 — Rollout corregido: no existe "probar en staging", y el canary es el instrumento con ciclo cerrado

**No existe "probar en staging"** para este flujo: el `ops-worker` es **un único Cloud Run compartido por
staging y producción** — misma DB, mismos scheduler jobs, misma revisión. No es un atajo temporal, es la
topología canónica declarada en `services/ops-worker/deploy.sh:23-30`, donde `ENV` sólo selecciona qué secret
refs se montan. Cualquier plan que diga "lo probamos en staging primero" está describiendo producción.

**Estado real de las plantillas (verificado contra la DB, 2026-08-17):**

| Plantilla | Módulos | Instancias | Rendidos |
|---|---|---|---|
| `atpl-account-manager-l2` — Account Manager L2 (v1, active) | 9 | 6 | **2** |
| `atpl-2c7dd874…` — Content Creator L2 Integral v2 (v1, active) | 8 | 9 | **0** |
| `atpl-c0d996fd…` — Content Creator L2 Editorial SEO/AEO (active) | 5 | 0 | 0 |
| `atpl-dae66420…` — Content Creator L2 Integral (active) | 8 | 0 | 0 |

Esto **corrige el fundamento**, no sólo la conclusión. Content Creator **sí tiene plantilla activa y ya en
uso** (9 asignaciones vivas): el argumento "habría que construirle plantilla" es falso. El diferenciador real
es otro y más importante: **Account Manager es la única vacante con el ciclo completo cerrado** — 2 tests
rendidos y corregidos de punta a punta. **Content Creator tiene 9 asignados y CERO completados**: su
instrumento nunca se ejercitó entero.

Dos consecuencias que este ADR registra:

- **Hallazgo: hay TRES plantillas activas de Content Creator y sólo una en uso.** Hoy quien asigna elige a mano
  entre tres sin ningún contrato que diga cuál corresponde a la vacante. Eso es **exactamente la ambigüedad
  que la policy elimina** — refuerza la justificación de la feature y es, simultáneamente, un **riesgo
  operativo vigente** mientras la policy no exista.
- **Señal a investigar ANTES de automatizar ahí**: 9 asignados sin ningún completado. Si nadie completa, la
  causa es del instrumento, del correo o de la experiencia — y **automatizar más envíos multiplica un problema
  de completado en vez de resolverlo**.

Secuencia canónica:

0. **Alguien de Talent RINDE el test completo, cronometrado.** Verificar que 45 min alcanzan de verdad. Nadie
   debería enviar una prueba que el equipo no rindió.
1. Opening + postulación **sintética** con el correo de un reclutador. Leer el correo **en el teléfono**.
2. Verificar que el aviso interno `hiring_assessment_submitted_internal_email` **entrega de verdad** — nunca se
   ejercitó con un test real.
3. **Manual-first sobre Account Manager** (15 aplicaciones; `atpl-account-manager-l2` sembrada en
   `migrations/20260708113740064_task-1360-seed-account-manager-template.sql:9` y **con ciclo cerrado
   verificado**), 2-3 candidatos.
4. **Auto sobre Account Manager en lotes ≤3.** **Prohibido mover etapas en bulk** mientras el auto esté ON.
5. **Content Creator sólo tras un ciclo completo de Account Manager**, y sólo después de (a) declarar por
   policy cuál de las tres plantillas corresponde a la vacante y (b) entender por qué sus 9 asignados no
   rindieron.

**Comunicación al equipo ANTES del paso 4** — no después: *"la columna de etapa dejó de ser una nota interna y
pasó a ser un botón de enviar"*. Además: re-asignar rompe el link vigente; el kill switch es dejar la policy
`disabled` (no tocar el flag primero).

**Señales que el reclutador vigila las primeras 48 h**: silencio donde debía haber test · dos correos a una
misma persona · respuestas de candidatos confundidos · **tasa de apertura** (no de completado — el completado
tarda días y no sirve como señal temprana) · el reloj de **14 días** del token.

### D7 — Por qué esto es más justo, y por qué NO es IA de alto riesgo

**Justificación de negocio (Talent).** Una policy que dispara **para todos los que entran a la etapa** es más
justa y más defendible que un reclutador eligiendo a quién testear. Eso es **estructura**, y la estructura es
la palanca #1 de validez en selección — la misma que baja *adverse impact*. La automatización no está aquí para
ahorrar clics: está aquí para eliminar la discrecionalidad silenciosa sobre **a quién se le pide la prueba**.

**Precisión regulatoria.** Esta automatización **NO es IA de alto riesgo**: es una regla determinística
etapa→plantilla, sin inferencia, sin modelo, sin puntaje. El invariante que la mantiene ahí es exactamente uno:
**el trigger es la etapa, NUNCA un score, match o atributo inferido.** El día que alguien proponga disparar por
"fit" o por ranking, esta decisión deja de aplicar y hace falta otra.

---

## Alternativas rechazadas

- **Resolver el assignment inline en el PATCH de etapa**: mezcla la transacción del pipeline con entrega externa y falla para cualquier otro productor del evento. Rechazada.
- **`templateId` como input del command**: convierte al caller (UI, agente, MCP) en dueño de la decisión de qué prueba rinde una persona. Rechazada — Greenhouse resuelve server-side.
- **"El sender consulta la policy y hace skip"**: decide sobre una predicción; si el email corre primero y la policy termina `held`, el candidato recibe silencio total (D1). Rechazada.
- **Dos consumers coordinándose por orden de ejecución**: at-least-once sin orden garantizado; la coordinación debe ser durable, no temporal. Rechazada.
- **Derivar el trigger de `payload.stage`**: el coalescing del lane reactivo se come la etapa intermedia en silencio (D0a). Rechazada.
- **Versionar el template para congelar el cuestionario**: el template YA está versionado; lo que varía es la resolución en vivo de preguntas (D0b). Rechazada por atacar el síntoma equivocado.
- **Endurecer `hiring.assessment.author` para gobernar la policy**: regresión sobre consumers de TASK-1360/1363 y mezcla autorar contenido con decidir escrituras a una cohorte. Rechazada.
- **RouteGroup `internal` para la capability nueva**: contradice el precedente del audit 2026-07-10; el gobierno de una policy no es una superficie de navegación. Rechazada.
- **Permitir que la automatización escriba `attempt_seq > 1`**: un bug de policy podría generar la segunda prueba de una persona sin intervención humana. Rechazada.
- **Canary en Content Creator**: no por falta de plantilla — tiene una activa con 9 asignaciones vivas — sino porque **cero de esas 9 se completó**: sería estrenar la automatización sobre el único instrumento que nunca cerró su ciclo, y sobre la cohorte mayor. Rechazada en favor de Account Manager manual-first (2 tests rendidos y corregidos).
- **"Probar en staging" como carril aislado**: el ops-worker es un único Cloud Run compartido por staging y producción (misma DB, mismos jobs, misma revisión); ese carril no existe (D6). Rechazada.
- **Dejar que quien asigna elija la plantilla a mano**: hoy conviven **tres plantillas activas de Content Creator** y sólo una en uso, sin contrato que diga cuál corresponde a la vacante. Rechazada — es la ambigüedad que la policy existe para cerrar.
- **No hacer nada (statu quo)**: la vacante no declara su prueba, el operador elige `templateId` a mano y un cambio de etapa sólo produce el correo genérico — con discrecionalidad sobre a quién se testea y sin trazabilidad del examen rendido. Rechazada.

---

## 4-Pillar Score

### Safety

- **What can go wrong**: una policy mal configurada escribe a una cohorte entera; un candidato recibe dos correos contradictorios o ninguno; una prueba llega a un destinatario no entregable; dos candidatos rinden exámenes distintos y se comparan como si fueran el mismo.
- **Gates**: policy nace `draft`+`manual` y su habilitación exige capability role-only + opening `published` + audit (D3/D5.1); cap de volumen con auto-detención (D5.2); readiness fail-closed con denylist (D5.3); fan-in con intent persistido antes de enviar (D1); snapshot inmutable como requisito de expansión (D4); flag `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` default-OFF sólo en ops-worker.
- **Blast radius if wrong**: acotado por opening y por ventana (cap de volumen). El peor caso sin cap sería la cohorte completa de una vacante; con cap, N correos y detención automática.
- **Verified by**: tests de capability/grant coverage, tests de fan-in (terminal ⇒ genérico en la misma ejecución; fault ⇒ sin correo), probes de readiness, y el paso 0 del rollout (un humano rinde el test).
- **Residual risk**: mientras el snapshot de D4 no exista, el banco de preguntas puede derivar entre candidatos — y con cuatro competencias de **una sola pregunta activa**, archivar una deja un módulo vacío en silencio. Mitigado por el `content_digest` observado en la policy y por el límite duro de no expandir más allá del canary. Riesgo abierto adicional: la accesibilidad (`accommodations_json`) no tiene write path, así que un ajuste sólo puede pedirse por correo y aplicarse a mano.

### Robustness

- **Idempotency**: UNIQUE parcial por `(application, policy, version, trigger_stage, attempt_seq)` + `ON CONFLICT DO NOTHING RETURNING` con re-lectura del ganador (patrón `createScoringRun`).
- **Atomicity**: assignment + snapshot + audit en una transacción; el intent de comunicación se persiste antes del envío.
- **Race protection**: índice parcial `hiring_assessment_open_instance_unique_idx` reutilizado; dos stage events concurrentes producen **una** instancia y **un** correo; el replay devuelve `already_assigned` tipado.
- **Constraint coverage**: CHECK de state machine de policy y de cancelación; unicidad de policy `enabled` por `opening + trigger_stage`; append-only en snapshot y audit.
- **Verified by**: tests de concurrencia/replay contra PG real (invariante de live-testing SQL, ISSUE-071) y la traducción `created:false` → 409 que elimina el `23505` crudo.

### Resilience

- **Retry policy**: fault ⇒ retry del dispatcher existente **sin comunicar**; outcome terminal ⇒ degradación al genérico en la misma ejecución, nunca reintento infinito de una condición estable.
- **Dead letter**: se conserva el lane existente, pero deja de fabricarse por duplicados benignos (D2).
- **Reliability signals**: `hiring.assessment_auto_assignment_blocked` (incluye `volume_cap` y `unverified_recipient`), `hiring.assessment_auto_assignment_failed`, `hiring.assessment_assignment_stale`, `sync.outbox.dead_letter`. Todas PII-free.
- **Audit trail**: policy versions append/supersede; intent de comunicación, outcome de assignment y cancelación auditados con actor, source, reason code y timestamps.
- **Recovery procedure**: reader de reconciliación detecta trigger alcanzado sin outcome terminal — **es el mecanismo que atrapa lo que el coalescing perdió** (D0a), no un extra. Retry gobernado con `attempt_seq` humano.

### Scalability

- **Hot path Big-O**: O(1) por evento de etapa; la resolución de policy es una lectura indexada por `opening + trigger_stage`.
- **Index coverage**: índice por `(opening_id, trigger_stage) WHERE status='enabled'`, y el índice parcial existente de instancia abierta.
- **Async paths**: todo el assignment y el envío corren en el `ops-worker` vía outbox; Vercel sólo expone commands/readers.
- **Cost at 10x**: lineal en aplicaciones que cruzan la etapa; el cap de volumen es el freno explícito antes de que el costo sea el freno implícito.
- **Pagination**: readers de policy/audit/proposals paginados por cursor, scoped a la opening exacta.

---

## Consecuencias

### Positivas

- La decisión de **a quién se le pide una prueba** deja de ser discrecional y pasa a ser estructura auditable.
- El candidato recibe **exactamente una** comunicación por transición, con la línea de accommodations que hoy no existe en ningún correo.
- Un bug latente de producción (`23505` crudo ⇒ dead-letter fabricado) se cierra como efecto colateral del refactor.
- El `content_digest` + snapshot convierten "rindió el test X" en un hecho reconstruible.

### Negativas

- Más superficie de estado: policy versionada + ledger de assignment + snapshot + audit de intent.
- El fan-in concentra dos responsabilidades de comunicación en un consumer: gana coherencia, pierde separación.
- El snapshot duplica contenido de preguntas por instancia (costo de almacenamiento a cambio de comparabilidad).

### Neutrales / estructurales

- La UI para configurar policy/hold queda deliberadamente fuera (follow-up `ui-ux`); el Product API es el camino canónico y `TASK-1720` consume los mismos commands sin reimplementar policy.
- `TASK-1603` pasa a consumir esta policy como binding canónico y conserva ownership de completeness/override.
- La denylist de dominios (D5.3) es explícitamente temporal y se retira con `TASK-1739`.

---

## Invariantes operativos para agentes

1. **NUNCA derivar la etapa trigger desde `payload.stage`** — el consumer reactivo hace coalescing por scope y conserva el último payload, así que la etapa intermedia se pierde en silencio. **SIEMPRE** re-leer el estado vigente en PostgreSQL con **el mismo predicado** que usa el reader de reconciliación.
2. **NUNCA dejar que el candidato reciba cero comunicación ni dos.** Un solo consumer (`hiring_stage_changed_candidate_comms`) decide `commsIntent` y lo **persiste ANTES de enviar**. Outcome terminal (`held|blocked|stale`) ⇒ degrada al genérico **en la misma ejecución**; fault (throw) ⇒ retry **sin comunicar**. **NUNCA** prometer un test que no existe.
3. **NUNCA la automatización escribe `attempt_seq > 1`.** Retake y re-asignación post-cancelación son commands humanos con capability y razón.
4. **NUNCA dejar escapar un `23505` crudo del assignment** (fabrica dead-letters): **SIEMPRE** `ON CONFLICT DO NOTHING RETURNING` + re-lectura del ganador sobre el índice parcial existente, patrón `createScoringRun`. **NUNCA** devolver token en la rama `created:false`.
5. **NUNCA gobernar la policy con `hiring.assessment.author` ni con routeGroup `internal`.** La capability es `hiring.assessment.policy.govern` (role-only, `execute`/`tenant`), granteada en el **mismo PR** que la registra. El assign manual puntual se queda en `author`.
6. **NUNCA expandir la automatización más allá del canary sin el snapshot inmutable del cuestionario por instancia.** `public-taking` resuelve preguntas en vivo; sin snapshot, dos candidatos "del mismo test" rindieron exámenes distintos. **NUNCA** versionar el template como sustituto: ya está versionado, el problema es la resolución.
7. **NUNCA una policy nace `enabled`+`on_stage_entry`** (nace `draft`+`manual`; el flip exige capability + opening `published` + audit). **SIEMPRE** cap de volumen por opening/ventana con auto-detención y readiness fail-closed. **NUNCA** planear "probar en staging" como carril aislado: el `ops-worker` es único y compartido. **NUNCA** mover etapas en bulk con el auto encendido.
8. **NUNCA disparar un assessment desde un score, match o atributo inferido — el trigger es la etapa.** Ese invariante es lo que mantiene esta automatización fuera de "IA de alto riesgo"; romperlo exige una decisión nueva, no una excepción.

---

## Open Questions (deliberadamente no decidido)

1. **TTL del proposal y SLA de reconciliación**: los números exactos se fijan con la evidencia del canary de Account Manager, no se inventan aquí.
2. **Snapshot: ¿slice de `TASK-1719` o task hija?** Su necesidad y su condición de bloqueo (pre-expansión) están decididas; su empaquetado no.
3. **Recordatorios del test**: hoy `Out of Scope`, y el riesgo queda declarado — **14 días sin recordatorio es un cementerio silencioso**. Mitigación mínima mientras no exista: el correo dice la **FECHA límite**, no la duración.
4. **Qué significa `expired` operativamente**: el estado existe y hoy **nadie lo mira**. Falta definir si es cola de reclutador, señal, o ambas.
5. **Qué pasa si se avanza a `interview` con el test de `shortlisted` abierto**: hoy no hay respuesta. ¿Se cancela, se conserva, se comunica?
6. **Aviso en la vacante pública de que el proceso incluye evaluación**: hueco de defensibilidad — hoy la prueba llega **sin anuncio previo**. Copy y ubicación pendientes.
7. **Write path de accommodations**: la lectura y el render existen; falta decidir si el ajuste se pide en el formulario de postulación, se concede desde el drawer del reclutador, o ambos. Hasta entonces, la línea de copy de D1 es la única puerta.
8. **Por qué 9 asignados de Content Creator no rindieron**: instrumento, correo, plazo o experiencia. Es una investigación previa a automatizar ahí, no un efecto que la automatización vaya a corregir.

---

## Referencias

- [`TASK-1719`](../tasks/in-progress/TASK-1719-hiring-opening-assessment-policy-stage-triggered-assignment.md) — spec + `## Delta 2026-08-17`
- [`GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`](GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md) — decisión hermana (scoring); patrón `createScoringRun` reutilizado en D2
- [`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`](GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
- [`GREENHOUSE_EVENT_CATALOG_V1.md`](GREENHOUSE_EVENT_CATALOG_V1.md) — `hiring.application.stage_changed`, `hiring.assessment.assigned`
- [`GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`](GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md)
- [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
- [`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`](GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md) · [`GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`](GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md)
- [`GREENHOUSE_CANONICAL_PATTERNS_V1.md`](GREENHOUSE_CANONICAL_PATTERNS_V1.md) — trio state-machine+CHECK+audit · outbox+reactive+dead-letter · flag default-OFF+shadow+flip
- [`agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`](agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md)
- `docs/tasks/complete/TASK-1360-assessment-engine-foundation.md` · `TASK-1363` · `TASK-1383` · `TASK-1689` · `docs/tasks/to-do/TASK-1603` · `TASK-1720` · `TASK-1739`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
