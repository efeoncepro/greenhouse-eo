# GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1 — Policy de assignment opening→plantilla, fan-in de comunicación y snapshot inmutable del cuestionario

- **Status**: Accepted (2026-08-17 — autorización ejecutiva del CEO, misma figura que `TASK-1734`/`TASK-1736`. **Aceptar ≠ prender**: `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` nace OFF, toda policy nace `draft`+`manual`, y la expansión más allá del canary sigue bloqueada por el snapshot de D4)
- **Date**: 2026-08-17
- **Deciders**: CEO (autorización ejecutiva 2026-08-17, sesión de operador) · agente ejecutor Slice 0 `TASK-1719` (lentes `arch-architect` + `greenhouse-talent-people-operator`)
- **Tags**: hiring, ats, assessment, ops-worker, notifications, governance, fairness, privacy
- **Task owner**: [`TASK-1719`](../tasks/in-progress/TASK-1719-hiring-opening-assessment-policy-stage-triggered-assignment.md) (EPIC-011)
- **Extiende**: `TASK-1360` (assessment engine + `assignCandidateTest`) · `TASK-1383` (versión + inmutabilidad de template, dedupe por digest) · `TASK-1689` (emails transaccionales de lifecycle) · `TASK-1363` (superficie de rendición)
- **Hermano**: [`GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`](GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md) — aquel decide cómo se **puntúa** un assessment; éste decide cómo se **asigna**. Ninguno de los dos permite que un score mueva etapa.

---

## Delta 2026-08-17 — auditoría adversarial de Slices 1-2

Auditoría adversarial del código entregado. Once hallazgos; los que cambian esta decisión:

**1. El alcance real de la reconciliación (corrige una promesa que el ADR no cumplía).** D0a y el
invariante 1 dicen que la reconciliación "atrapa el trigger que el coalescing se comió". Sólo es
cierto a medias, y conviene decirlo sin adornos: el predicado canónico
(`resolveApplicationsAwaitingAssignment`) filtra `app.stage = policy.trigger_stage`, así que
**recupera únicamente a quien SIGUE en la etapa trigger** — el evento perdido (coalescing, worker
caído, dead-letter) mientras la postulación no se movió. El `shortlisted → interview` dentro de la
ventana de coalescing —el caso que D0a usa como ejemplo motivador— **no lo recupera nadie**: la
etapa vigente ya no es la del trigger, el reader no lo ve y el command lo resolvería
`stale: stage_changed`.

Se evaluó extender el predicado a `greenhouse_sync.outbox_events` (buscar un
`hiring.application.stage_changed` con la etapa trigger en el payload). **Rechazado**, por tres
razones que se refuerzan: (a) haría del `payload.stage` la fuente de elegibilidad, que es
exactamente lo que el invariante 1 declara no confiable; (b) no sería un cambio de reader —
obligaría a eximir a `origin='reconciliation'` del guardia de etapa vigente en
`resolveAssignmentIntent`, aflojando el propio D0a y decidiendo de paso la Open Question 5 (qué
pasa al avanzar a `interview` con el test de `shortlisted`); (c) `outbox_events` no tiene índice
por `event_type`, `aggregate_id` ni `payload`, así que sería un seq scan de la tabla más caliente
de la plataforma sobre datos cuya retención está declarada como borrable a futuro.

**Decisión: alcance declarado + cola humana.** La reconciliación automática recupera sólo a quien
sigue en la etapa trigger. El resto se entrega como **lista operable**
(`resolveApplicationsMissedTriggerAwaitingHuman`): postulaciones del opening que ya están en una
etapa posterior a la trigger, sin decisión, sin instancia de esa plantilla y sin ninguna fila en el
ledger. Deriva todo del estado vigente, **no ejecuta nada** y sobre-incluye a propósito a quien
llegó a la etapa posterior sin pasar por la trigger: en una cola humana un falso positivo cuesta
una mirada y un falso negativo cuesta un candidato sin evaluar y sin señal. Una promesa falsa en un
ADR es peor que un alcance declarado.

**2. `outcome='intent'` (bloqueante corregido).** El ledger violaba su propio CHECK en el happy
path: se escribía `outcome='assigned'` con `assessment_id=NULL` antes de crear la instancia ⇒
`23514` en TODA asignación exitosa, error crudo, 500 y dead-letter fabricado. Se agrega el outcome
**no terminal y efímero** `intent`: el command registra el intent, crea la instancia y cierra la
fila a `assigned | already_assigned` en la misma transacción. Conserva "el intent es el hecho
durable" y conserva el CHECK, que sigue prohibiendo el ledger que miente. Una fila `intent` en
reposo es evidencia de un bug — se trata como fault, nunca como outcome comunicable.

**3. `missing_email` es `blocked`, no `held`.** `held` queda reservado al hold **humano**.
Degradarlo a `held` mezclaba "una persona lo detuvo" con "el dato está incompleto" y además
silenciaba la señal: sólo la rama `blocked` publica `hiring.assessment.auto_assignment_blocked`,
que es la que la risk matrix usa para ese riesgo exacto.

**4. Cap de volumen serializado.** El conteo corría sin bloquear la policy: dos assigns concurrentes
con cap=3 y count=2 pasaban los dos, y un `disable` concurrente no detenía la asignación en vuelo.
Ahora el command toma `FOR UPDATE` sobre la fila de policy (grano exacto del cap) antes de decidir.
Además el conteo **deja de filtrar `superseded_at`**: el cap limita correos salidos, no filas
vigentes — supersedear no des-envía el correo que el candidato ya recibió.

**5. `attempt_seq` baja a la DB.** El guardia de autoridad (ADR D2 capa 3) vivía sólo en TS y
`recordAssignment` está exportado. Ahora es `CHECK (origin = 'manual' OR attempt_seq = 1)`.

**6. Digest de contenido, no de IDs.** `template_content_digest` hasheaba sólo
`(module, competency, question)` — ciego a editar el `prompt`, las alternativas, el tipo o el nivel
de una pregunta existente, que es justamente el riesgo D4. Ahora el hash incluye el contenido.

**7. La policy no puede nacer `on_stage_entry`.** Que `state` empezara en `draft` no alcanzaba:
nacer ya en automático deja la automatización a un solo flip de distancia. Pasar a automático es un
acto deliberado y separado (reconfigurar, que re-audita y devuelve a `draft`).

**8. Correcciones de precisión.** (a) `superseded_at` existe y el índice único parcial lo honra,
pero **ningún write path lo escribe** — el comentario de la migración del ledger afirmaba que "la
reconciliación supersede y reintenta"; el supersede es Slice 4 y así queda escrito en la DB. Hasta
entonces un outcome terminal congela ese `(application, policy, versión, etapa, intento)` y la
recuperación es un command humano. (b) El nombre del evento del outbox
(`hiring.assessment.auto_assignment_blocked`, notación por puntos del catálogo) y la clave del
reliability signal de la risk matrix (`hiring.assessment_auto_assignment_blocked`, notación
`dominio.snake_case`) difieren por convención de cada registro, no por drift: son la misma
condición en dos superficies.

**Gate de SQL vivo.** Ninguna query nueva se había ejercido contra PostgreSQL real (ISSUE-071 /
TASK-893): los tests mockean `client.query` con regex sobre el texto del SQL. Se agrega
`assign.live.test.ts` (assigned → replay → `blocked: volume_cap` + el CHECK de `attempt_seq`).
Corrido contra PG real **antes** del fix, falla con el `23514` del hallazgo 2 — que es la prueba de
que el gate sirve.

---

## Delta 2026-08-17 (2) — auditoría adversarial de Slices 3-5

Segunda auditoría, sobre cancelación, propose/confirm, fan-in y señales. Lo que cambia la decisión:

**1. Cancelar libera DOS llaves, no una (bloqueante).** El ADR y el código trataban la recuperación
como *estructural*: `cancelled` queda fuera del predicado de instancia abierta, así que el índice
`hiring_assessment_open_instance_unique_idx` se libera solo. Cierto — pero es **la mitad**. El ledger
tiene su propia llave de idempotencia `(application, policy, versión, etapa, intento) WHERE
superseded_at IS NULL`, y ésa **no se libera sola**. `cancelCandidateTest` nunca tocaba el ledger, así
que la fila seguía vigente diciendo `outcome='assigned'` y apuntando a la instancia muerta.

Consecuencia observable: reclutador asigna → cancela → vuelve a asignar por el command gobernado ⇒
`recordAssignment` choca la misma llave ⇒ `created=false` ⇒ **`already_assigned` con el
`assessment_id` CANCELADO**. HTTP 200, sin instancia nueva, sin correo. En el carril automático es
peor: `decide.ts` lee ese `assigned` y **calla**, dejando al candidato movido de etapa sin ninguna
comunicación. Los outcomes `cancelled`/`held` del ledger eran, además, código muerto: nadie escribía
`superseded_at`.

**Decisión: el supersede es parte de la cancelación, en su misma transacción.**
`supersedeAssignmentsForAssessment` marca `superseded_at = NOW()`, `outcome = 'cancelled'` y
`outcome_reason = 'operator_cancelled'` sobre la(s) fila(s) vigentes de esa instancia. Cero filas
afectadas es un **no-op legítimo** (las instancias del camino legacy `assignCandidateTest` no tienen
ledger), no un error. Efecto de segundo orden que se corrige junto: el cap de volumen contaba sólo
`outcome='assigned'`, así que reescribir a `cancelled` habría liberado presupuesto retroactivamente —
exactamente lo que el invariante 14 prohíbe. El cap ahora cuenta `assigned` **más**
`cancelled/operator_cancelled`.

**2. El digest era ciego a `state` y `mode` de la policy.** `markPolicyEnabled`/`markPolicyDisabled`
**no incrementan `policy_version`**, y `findActivePolicyForOpening` devuelve `state <> 'disabled'`
(o sea incluye `draft`). Escenario completo: se propone con la policy en `draft` — el preview dice
`blockingReasonCode: 'policy_disabled'`, que el operador lee como "no va a pasar nada" —, alguien
habilita la policy, el operador confirma, el digest coincide **y sale un correo real a un candidato
real**. `policyState` y `policyMode` entran al material del digest.

**3. Dos correos por un movimiento (assign manual + cambio de etapa en la misma ventana).** El assign
manual publica `hiring.assessment.assigned` ⇒ sale el correo del test; el `stage_changed` posterior
encuentra la instancia abierta ⇒ `already_assigned / existing_open_instance` ⇒ degradaba al genérico.
El dedupe no los ve (distinto `sourceEventId`, distinto `emailType`). Antes de degradar se consulta
ahora el **ledger de entregas** por entidad (`wasEmailDeliveredForEntity(assessmentId,
'hiring_assessment_assigned')`): si el correo del test ya salió, callar.

**4. Tres definiciones de "instancia abierta", y `scored` era la discrepancia peligrosa.** El preview
incluía `scored` en su predicado y lo marcaba `existing_open_instance` (bloqueante), pero el command
usa `OPEN_ASSESSMENT_INSTANCE_STATUSES` (sin `scored`): el operador confirmaba sobre un "bloqueo" que
el command no honra y **se le mandaba una segunda prueba a alguien ya evaluado**. Se separan en dos
señales: `existingOpenAssessment` (predicado EXACTO del command ⇒ bloqueante) y
`existingScoredAssessment` (informativo, no bloqueante — el retake es legítimo, pero tiene que ser una
decisión, no una sorpresa). `readers.ts` conserva `scored` a propósito: responde otra pregunta.

**5. Honestidad sobre "cero correos".** El fan-in suprime el genérico confiando en que la projection
del correo del test entregue, pero ésa tiene cuatro salidas silenciosas (sin email resoluble, token no
rotable, kill-switch por tipo, dead-letter tras 3 reintentos). El invariante 2 se cumple **sobre el
ledger, no sobre la entrega**. No se cierra el hueco: se hace visible con la métrica
`assigned_without_email_24h` (severidad `warning`, con 15 min de gracia por la latencia del lane).

**6. Menores con consecuencia real.** (a) `findActiveAssignmentProposal` no filtraba `expires_at`, así
que pasados los 30 min de TTL `propose` devolvía una propuesta muerta y el confirm fallaba **siempre**
en el primer intento; ahora la cierra como `expired` y emite una nueva. (b) La guarda de expiry del
confirm era `Number.isFinite(x) && x <= now` — **fail-abierto**: un `expires_at` imparseable la
saltaba entera. Invertida a fail-closed. (c) El predicado `awaiting_terminal` de la señal no coincidía
con el del reader canónico (sin scope por policy/versión/etapa, sin excluir instancias abiertas): al
reconfigurar una policy la cola se llenaba y la señal seguía en `ok`.

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
del servicio) y es donde viven las projections de correo de hiring/talent-pool — entre ellas
`hiring_stage_changed_email` y `hiring_assessment_submitted_internal_email` (`projections/index.ts:196-201`;
son **seis** en ese domain, no dos). Consecuencia directa: un candidato que pasa `shortlisted → interview`
dentro de esa ventana entrega **un solo refresh con `stage: interview`**, y la etapa que debía disparar el
test **se pierde del payload**. No hay error ni dead-letter: el test simplemente nunca se asigna.

**Dos precisiones que la auditoría adversarial 2026-08-17 impone sobre este argumento:**

- **NO "desaparece sin traza".** En el éxito, todo evento contribuyente recibe fila propia en
  `outbox_reactive_log` con `result = coalesced:<descripción>` (`reactive-consumer.ts:729-745`) — verificado
  con datos reales. Lo que se pierde es el **payload**, no el registro. La reconciliación puede apoyarse en
  ese log.
- **El escenario NUNCA le ocurrió a un candidato real.** De los 23 `stage_changed` históricos, los movimientos
  masivos fueron sobre postulaciones **distintas** (scope distinto ⇒ cero coalescing), y el único caso de dos
  eventos de la misma postulación dentro de la ventana es `happ-aa9857b4`, una aplicación QA sintética. La
  regla defensiva de abajo es correcta **por diseño**, no por patología observada: se sostiene sola sin
  necesidad de un incidente que no existió.

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
no se resuelve reintentando nunca. La cadena completa (predicado de 3 estados vs índice de 4, rethrow crudo de
la transacción, branch genérico) está verificada en el código pre-refactor; lo que **no** hay es evidencia de
que un operador real la haya disparado en producción: es un bug latente, no un incidente ocurrido.

El dead-letter en el carril reactivo es **proyección sobre un carril que todavía no existe** — hoy ningún
consumer reactivo llama `assignCandidateTest`. Es la razón por la que este ADR lo cierra **antes** de crear
ese carril, no la constatación de un daño ya causado. Alinear el predicado y adoptar `ON CONFLICT` cierra la
salida vigente (el 500) y desactiva la futura de una vez.

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
| Plantilla | Módulos | Preguntas que resuelve | Instancias | Rendidos |
|---|---|---|---|---|
| `atpl-account-manager-l2` — Account Manager L2 (v1, active) | 9 | 12 | 6 | **1 real** + 1 sintético |
| `atpl-2c7dd874…` — Content Creator L2 Integral v2 (v1, active) | 8 | 11 | 9 | **0** |
| `atpl-c0d996fd…` — Content Creator L2 Editorial SEO/AEO | 5 | **6 (1 módulo ciego, 25% del peso)** | 0 | 0 |
| `atpl-dae66420…` — Content Creator L2 Integral | 8 | **5 (4 módulos ciegos, 45% del peso)** | 0 | 0 |

Content Creator **sí tiene plantilla activa y ya en uso** (9 asignaciones vivas): el argumento "habría que
construirle plantilla" es falso.

**Corrección de la evidencia (auditoría adversarial 2026-08-17 — la versión anterior de este ADR afirmaba
como verificado lo que sólo era plausible):**

- **Account Manager tiene UN ciclo cerrado real, no dos.** El segundo "rendido" es `asmt-45f9ff2e`, de
  *"Camila Seed (QA sintético TASK-1738)"* (`qa.seed.task1738@efeonce.test`), creado 10 h antes de este ADR
  y en estado `submitted`, nunca `scored`. El canary se apoya en **n=1**. Sigue siendo el único instrumento
  con ciclo cerrado, pero la muestra es la mitad de lo que decía.
- **"9 asignados y CERO completados" NO es una señal: es una cohorte de 36 horas.** Content Creator se asignó
  el 2026-08-15 21:54 y Account Manager el 2026-08-16 01:19 — **3 h 25 min de diferencia**, ambas con token a
  14 días. Además, de esos 9: uno es sintético (*"Prueba TASK-1689 NO CONTACTAR"*) y **otro nunca recibió el
  correo** (`outbox_reactive_log` registra `skip: flag OFF` para `EO-APP-0058`, 2026-08-11). Quedan **7
  candidatos reales con correo entregado hace ~1,5 días y 12,5 días de plazo por delante**.
- **Cae, por lo tanto, "automatizar más envíos multiplica un problema de completado".** Derivaba de una
  patología que no existe. No es argumento para diferir Content Creator.

Lo que sí queda en pie como consecuencia registrada:

- **Hallazgo: había TRES plantillas activas de Content Creator y sólo una en uso.** Quien asignaba elegía a
  mano entre tres sin contrato que dijera cuál corresponde a la vacante — **exactamente la ambigüedad que la
  policy elimina**.
- **Hallazgo NUEVO y más grave: dos de esas tres eran irrenderizables.** Ejercitando el resolvedor real
  plantilla por plantilla, `atpl-dae66420` devuelve **5 preguntas para 8 módulos** y `atpl-c0d996fd` **6 para
  5**. Un módulo sin preguntas activas **no desaparece**: el resolvedor conserva la fila con `question_id
  NULL`, el candidato **ve la sección vacía**, y `submitPublicAssessment` no exige nada de ella — el examen
  encogido **se envía sin error** y se puntúa sobre una fracción del peso. Ambas se archivaron
  (`migrations/20260817103353922_archive-questionless-module-templates.sql`) y la clase quedó cubierta por la
  señal `hiring.assessment.template_module_without_questions` (steady=0). El precursor sigue vivo: **6
  competencias sin preguntas activas**.

Secuencia canónica:

0. **Alguien de Talent RINDE el test completo, cronometrado.** Verificar que 45 min alcanzan de verdad. Nadie
   debería enviar una prueba que el equipo no rindió.
1. Opening + postulación **sintética** con el correo de un reclutador. Leer el correo **en el teléfono**.
2. Confirmar que el aviso interno `hiring_assessment_submitted_internal_email` **llega a la bandeja**. Ya se
   ejercitó con un test real — `outbox_reactive_log` registra `sent` para `asmt-0ff5613e` (Valentina Villa,
   2026-08-16 15:21); lo que falta verificar es la entrega, no la ejecución. (El ledger de flags decía "espera
   su primera entrega real": está desactualizado, la fuente es `outbox_reactive_log`.)
3. **Registrar el consumer nuevo con el flag OFF y drenar su backlog ANTES de encenderlo.** La Phase A del
   consumer reactivo **no tiene ventana temporal** (`reactive-consumer.ts:506-527`): trae todo evento
   `published` sin fila de log para su `handler` key. Un consumer nuevo barre en su primera corrida **los 23
   `stage_changed` desde 2026-07-09**, y como D0a manda re-leer la etapa vigente, un evento de julio se
   evaluaría contra el estado de hoy (**6 postulaciones en `shortlisted`**). Orden obligatorio: registrar con
   flag OFF → confirmar backlog drenado → recién flip.
4. **Manual-first sobre Account Manager** (15 aplicaciones; `atpl-account-manager-l2` sembrada en
   `migrations/20260708113740064_task-1360-seed-account-manager-template.sql:9`, **único instrumento con
   ciclo cerrado verificado — n=1 real**), 2-3 candidatos.
5. **Auto sobre Account Manager en lotes ≤3.** **Prohibido mover etapas en bulk** mientras el auto esté ON.
6. **Content Creator tras un ciclo completo de Account Manager**, declarando por policy qué plantilla
   corresponde a la vacante. Ya **no** aplica el prerrequisito "entender por qué sus 9 asignados no rindieron":
   esa cohorte tenía 36 h de vida y 12,5 días de plazo restante, y dos de sus casos tienen causa conocida
   (sintético · correo nunca enviado por flag OFF). Si al vencer el plazo la tasa sigue en cero, **ahí** es una
   señal.

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
- **Canary en Content Creator**: no por falta de plantilla — tiene una activa con 9 asignaciones vivas — sino porque su instrumento aún no cerró un ciclo y su cohorte es la mayor. Rechazada en favor de Account Manager manual-first, el único con un rendido-y-corregido real (**n=1**; el segundo "rendido" que citaba la versión anterior de este ADR era un seed sintético). El argumento **no** es que "cero de 9 se completó" — esa cohorte tenía 36 h de vida: ver la corrección de evidencia más arriba.
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

1. **NUNCA derivar la etapa trigger desde `payload.stage`** — el consumer reactivo hace coalescing por scope y conserva el último payload, así que la etapa intermedia se pierde en silencio. **SIEMPRE** re-leer el estado vigente en PostgreSQL con **el mismo predicado** que usa el reader de reconciliación. **NUNCA** ampliar ese predicado consultando `outbox_events` para "recuperar" a quien ya avanzó (Delta 2026-08-17): la reconciliación automática cubre **sólo** a quien sigue en la etapa trigger, y el resto va a la cola humana `resolveApplicationsMissedTriggerAwaitingHuman`, que no ejecuta nada.
2. **NUNCA dejar que el candidato reciba cero comunicación ni dos.** Un solo consumer (`hiring_stage_changed_candidate_comms`) decide `commsIntent` y lo **persiste ANTES de enviar**. Outcome terminal (`held|blocked|stale`) ⇒ degrada al genérico **en la misma ejecución**; fault (throw) ⇒ retry **sin comunicar**. **NUNCA** prometer un test que no existe.

   **La persistencia previa NO necesita tabla nueva** (implementación 2026-08-17): el ledger de assignment se commitea dentro de la transacción del command, y el correo del test lo manda DESPUÉS otro consumer al procesar `hiring.assessment.assigned`. El hecho durable precede al envío por construcción.

   ⚠️ **`already_assigned` es ambiguo y la ambigüedad manda cero o dos correos.** Cubre dos casos que exigen ramas OPUESTAS, y el deduplicador de emails **no** los cubre (el correo del test y el de etapa viajan con `sourceEventId` distintos, así que mandar ambos no se detecta como duplicado):
   - fila del ledger `outcome='assigned'` ⇒ replay de nuestra propia asignación, el correo del test ya salió por esa llave ⇒ **callar**;
   - `outcomeReason='existing_open_instance'` ⇒ el command NO emitió evento nuevo (para no mandar un link viejo), o sea **no habrá correo de test** ⇒ **degradar al genérico**, o el avance es silencioso.
   La distinción se lee del **ledger**, no del resultado en memoria: sobrevive a un reintento en otro proceso.

   ⚠️ **El ledger de assignment no basta para la rama `existing_open_instance`** (Delta 2026-08-17 (2)): la instancia preexistente pudo nacer por el camino manual, que **no deja fila propia** en el ledger pero **sí manda el correo del test**. Antes de degradar al genérico hay que preguntarle al ledger de ENTREGAS (`wasEmailDeliveredForEntity(assessmentId, 'hiring_assessment_assigned')`); si ya salió, callar. Sin eso, "asignar a mano y mover de etapa en el mismo minuto" —la secuencia más natural que existe— manda dos correos. **NUNCA** callar cuando el `assessmentId` no es resoluble: ahí se degrada (un correo de más molesta, cero deja al candidato colgado).

   ⚠️ **El invariante se cumple sobre el LEDGER, no sobre la ENTREGA.** La projection del correo del test tiene cuatro salidas silenciosas (sin email resoluble, token no rotable, kill-switch por tipo, dead-letter tras 3 reintentos), así que "cero correos" sigue siendo posible por debajo. La métrica `assigned_without_email_24h` de `hiring.assessment.assignment_health` es lo único que lo delata: **NUNCA** tratarla como ruido.
3. **NUNCA la automatización escribe `attempt_seq > 1`.** Retake y re-asignación post-cancelación son commands humanos con capability y razón. El guardia vive en TS **y** en la DB (`CHECK (origin = 'manual' OR attempt_seq = 1)`): `recordAssignment` está exportado, así que un guardia sólo-TS lo salta cualquier caller nuevo.
4. **NUNCA dejar escapar un `23505` crudo del assignment** (fabrica dead-letters): **SIEMPRE** `ON CONFLICT DO NOTHING RETURNING` + re-lectura del ganador sobre el índice parcial existente, patrón `createScoringRun`. **NUNCA** devolver token en la rama `created:false`.
5. **NUNCA gobernar la policy con `hiring.assessment.author` ni con routeGroup `internal`.** La capability es `hiring.assessment.policy.govern` (role-only, `execute`/`tenant`), granteada en el **mismo PR** que la registra. El assign manual puntual se queda en `author`.
6. **NUNCA expandir la automatización más allá del canary sin el snapshot inmutable del cuestionario por instancia.** `public-taking` resuelve preguntas en vivo; sin snapshot, dos candidatos "del mismo test" rindieron exámenes distintos. **NUNCA** versionar el template como sustituto: ya está versionado, el problema es la resolución.
7. **NUNCA una policy nace `enabled`+`on_stage_entry`** (nace `draft`+`manual`; el flip exige capability + opening `published` + audit). **SIEMPRE** cap de volumen por opening/ventana con auto-detención y readiness fail-closed. **NUNCA** planear "probar en staging" como carril aislado: el `ops-worker` es único y compartido. **NUNCA** mover etapas en bulk con el auto encendido.
8. **NUNCA disparar un assessment desde un score, match o atributo inferido — el trigger es la etapa.** Ese invariante es lo que mantiene esta automatización fuera de "IA de alto riesgo"; romperlo exige una decisión nueva, no una excepción.
9. **NUNCA comunicar hacia afuera por un evento rancio.** Un `stage_changed` de más de `STAGE_CHANGE_ACTIONABLE_WINDOW_HOURS` (24 h) no comunica ni asigna: va a la cola humana. Es regla de dominio —avisarle a alguien "avanzaste" por un movimiento de la semana pasada es peor que callar— y de paso hace segura la primera corrida de un consumer nuevo. La guarda depende de `_occurredAt`, que el consumer reactivo inyecta en el payload (`parsePayload`): **si esa inyección se pierde, la ventana se vuelve código muerto que nunca dispara, sin romper build ni tests** — por eso está cubierta por test propio.
10. **NUNCA registrar un consumer reactivo nuevo y encender su flag en el mismo paso.** La Phase A **no tiene ventana temporal** (`reactive-consumer.ts:506-527`): un `handler` key nuevo barre TODO evento `published` sin fila de log, o sea el histórico completo del event type. Combinado con la regla 1 (re-leer el estado vigente), un evento de hace meses se evalúa contra la etapa de hoy. Orden obligatorio: **registrar con flag OFF → confirmar backlog drenado → recién flip**. El cap de volumen es el último freno, no el primero.
11. **NUNCA declarar un instrumento sano por contar sus módulos.** Un módulo cuya competencia no tiene preguntas activas **no desaparece** del examen: se renderiza como sección vacía y el submit lo acepta, así que el candidato rinde una fracción del peso sin que nada falle. **SIEMPRE** verificar ejercitando `PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL` contra la plantilla real, y vigilar `hiring.assessment.template_module_without_questions` (steady=0).
12. **NUNCA escribir `outcome='assigned'` en el ledger sin su `assessment_id`** (viola `hiring_assessment_assignment_assigned_instance_ck` y sería un ledger que miente): el intent se registra como `intent` —no terminal, efímero, sólo dentro de la transacción— y se cierra con `attachAssignmentInstance`. **NUNCA** devolver una fila `intent` como outcome al fan-in de comunicación: es un fault, no una condición estable.
13. **NUNCA degradar un fallo de readiness a `held`.** `held` es el hold **humano**; todo fallo de dato (`missing_email`, `unverified_recipient`) es `blocked`, que es la única rama que emite `hiring.assessment.auto_assignment_blocked`.
14. **NUNCA contar el cap de volumen sin bloquear antes la fila de policy (`FOR UPDATE`)** ni filtrando `superseded_at`: el cap mide **correos salidos**, no filas vigentes, y sin el lock dos assigns concurrentes leen el mismo total y pasan los dos. Por la misma razón el predicado cuenta `outcome='assigned'` **más** `('cancelled','operator_cancelled')` desde que la cancelación reescribe el outcome (Delta 2026-08-17 (2)): cancelar **no des-envía** el correo que el candidato ya recibió, así que no puede devolver presupuesto.
15. **NUNCA hashear el `template_content_digest` sólo por IDs.** Debe incluir `prompt`, `options_json`, `type` y `level`: un digest ciego al contenido no detecta el drift D4, que es editar una pregunta existente sin cambiar su ID.
16. **NUNCA cancelar una instancia sin superseder su fila del ledger EN LA MISMA TRANSACCIÓN.** Son DOS llaves de unicidad distintas: la de la instancia se libera sola (`cancelled` está fuera de su predicado), la del ledger `(application, policy, versión, etapa, intento) WHERE superseded_at IS NULL` **exige el write explícito** `supersedeAssignmentsForAssessment` (`superseded_at=NOW()`, `outcome='cancelled'`, `outcome_reason='operator_cancelled'`). Sin él, re-asignar devuelve `already_assigned` con el `assessment_id` cancelado y el carril automático calla. **Cero filas afectadas NO es error**: las instancias del camino legacy (`assignCandidateTest`) no tienen ledger. **NUNCA** "recuperar" borrando filas: la reversa es superseder.
17. **NUNCA armar el material del digest sólo con `policy_version`.** `markPolicyEnabled`/`markPolicyDisabled` cambian `state` **sin** incrementar la versión, y `findActivePolicyForOpening` incluye `draft`: `policyState` y `policyMode` van en el digest o el confirm ejecuta un efecto distinto del aprobado (proponer en `draft` con preview "no va a pasar nada" → habilitar → confirmar → correo real). **SIEMPRE** que se agregue un campo al material, asumir que invalida toda propuesta abierta (`superseded`) — es el comportamiento correcto, pero hay que saberlo.
18. **NUNCA mezclar "instancia abierta" con "instancia corregida" en el preview.** `existingOpenAssessment` usa EXACTAMENTE `OPEN_ASSESSMENT_INSTANCE_STATUSES` (el predicado del índice parcial y del command) y **es** bloqueante; `existingScoredAssessment` es informativo y **NO** bloquea, porque el command sí crearía una instancia nueva. Declarar un bloqueo que el command no honra es peor que no declarar nada: el operador confirma igual y le llega una segunda prueba a alguien ya evaluado. `resolveApplicationsAwaitingAssignment` (readers.ts) mantiene `scored` como "ya evaluado" **a propósito**: responde otra pregunta. **NUNCA** unificarlos "por consistencia".
19. **NUNCA escribir un predicado de reliability signal distinto del reader canónico que describe.** `awaiting_terminal` debe ser el espejo exacto de `resolveApplicationsAwaitingAssignment` (scope por `policy_id`/`policy_version`/`trigger_stage` + `superseded_at IS NULL` + exclusión de instancia abierta de ESA plantilla). Con un predicado más laxo, un bump de versión de policy llena la cola de reconciliación mientras la señal sigue en `ok`.
20. **NUNCA una guarda de vencimiento fail-abierta.** `Number.isFinite(x) && x <= now` deja pasar el `NaN`: la forma correcta es `!Number.isFinite(x) || x <= now`. Y el filtro de expiry va **en las dos mitades**: si `propose` devuelve una propuesta vencida que `confirm` rechaza siempre, el primer intento de asignar falla sistemáticamente. El índice parcial no sabe de vencimiento, así que `createAssignmentProposal` cierra la vencida como `expired` y reintenta el INSERT.

---

## Open Questions (deliberadamente no decidido)

1. **TTL del proposal y SLA de reconciliación**: los números exactos se fijan con la evidencia del canary de Account Manager, no se inventan aquí.
2. **Snapshot: ¿slice de `TASK-1719` o task hija?** Su necesidad y su condición de bloqueo (pre-expansión) están decididas; su empaquetado no.
3. **Recordatorios del test**: hoy `Out of Scope`, y el riesgo queda declarado — **14 días sin recordatorio es un cementerio silencioso**. Mitigación mínima mientras no exista: el correo dice la **FECHA límite**, no la duración.
4. **Qué significa `expired` operativamente**: el estado existe y hoy **nadie lo mira**. Falta definir si es cola de reclutador, señal, o ambas.
5. **Qué pasa si se avanza a `interview` con el test de `shortlisted` abierto**: hoy no hay respuesta. ¿Se cancela, se conserva, se comunica?
6. **Aviso en la vacante pública de que el proceso incluye evaluación**: hueco de defensibilidad — hoy la prueba llega **sin anuncio previo**. Copy y ubicación pendientes.
7. **Write path de accommodations**: la lectura y el render existen; falta decidir si el ajuste se pide en el formulario de postulación, se concede desde el drawer del reclutador, o ambos. Hasta entonces, la línea de copy de D1 es la única puerta.
8. **Tasa de completado de Content Creator al vencer el plazo** (tokens expiran 2026-08-29/30). Hoy no hay señal: la cohorte tenía 36 h y dos de sus 9 casos tienen causa conocida (sintético · correo nunca enviado por flag OFF). Si al vencimiento la tasa real sigue en cero sobre los 7 candidatos con correo entregado, **ahí** hay que investigar instrumento/correo/experiencia. Medirlo antes es leer ruido.
9. **Las 6 competencias sin preguntas activas**: completar el banco o retirarlas del catálogo. Mientras existan, cualquier plantilla nueva que las use nace con un módulo ciego que el candidato ve vacío y el submit acepta igual. La señal `hiring.assessment.template_module_without_questions` lo reporta como `warning` (precursor) y como `error` en cuanto una plantilla activa las use.

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
