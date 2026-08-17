# TASK-1719 — Hiring Opening Assessment Policy and Stage-Triggered Candidate Test Assignment

## Delta 2026-08-17 (2) — auditoría adversarial de Slices 1-2 y su corrección

Auditoría adversarial del código de Slices 1-2. Detalle completo y fundamento en el
**`## Delta 2026-08-17` del ADR**; resumen de lo que cambió en el runtime:

- **Bloqueante cerrado:** el ledger violaba su propio CHECK en el happy path (`outcome='assigned'`
  con `assessment_id=NULL` antes de crear la instancia ⇒ `23514` en TODA asignación exitosa, 500 y
  dead-letter fabricado). Se agrega el outcome no terminal **`intent`**; el cierre a
  `assigned | already_assigned` lo hace `attachAssignmentInstance` en la misma transacción.
  Migración forward-fix `20260817102245965` (las de Slices 1-2 ya estaban aplicadas y **no** se
  editan).
- **Alcance de la reconciliación declarado, no inflado:** recupera **sólo** a quien sigue en la
  etapa trigger. Quien cruzó la etapa y ya avanzó va a la cola humana
  `resolveApplicationsMissedTriggerAwaitingHuman` (deriva del estado vigente, no ejecuta nada). Se
  rechazó extender el predicado a `outbox_events` — haría del `payload.stage` la fuente de
  elegibilidad (contra el invariante 1), obligaría a aflojar el guardia D0a para
  `origin='reconciliation'` y sería un seq scan de la tabla más caliente de la plataforma.
- `missing_email` pasa de `held` a **`blocked`** (`held` es el hold humano; sólo `blocked` emite la
  señal de auto-detención que la risk matrix usa para ese riesgo).
- **Cap de volumen serializado** con `FOR UPDATE` sobre la policy, y el conteo deja de filtrar
  `superseded_at` (mide correos salidos, no filas vigentes).
- `attempt_seq` baja a la DB: `CHECK (origin = 'manual' OR attempt_seq = 1)`.
- `template_content_digest` ahora hashea el **contenido** (`prompt`/`options_json`/`type`/`level`),
  no sólo IDs — antes era ciego a editar una pregunta existente, que es el riesgo D4.
- Una policy **no puede nacer `on_stage_entry`**; pasar a automático es un acto aparte.
- Guardia de 0 filas en `attachAssignmentInstance`; corregido el comentario de la migración del
  ledger que afirmaba un supersede que **nada escribe** (es Slice 4).
- **Gate de SQL vivo (ISSUE-071 / TASK-893):** `assign.live.test.ts` — ciclo `assigned` → replay
  `already_assigned` → `blocked: volume_cap` + el CHECK de `attempt_seq`, contra PG real. Corrido
  **antes** del fix, falla con el `23514` del bloqueante.

## Delta 2026-08-17 — Slice 0 cerrado: ADR aceptado y correcciones a supuestos de esta spec

ADR canónico: [`GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`](../../architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md)
(`Accepted`, autorización ejecutiva del CEO 2026-08-17). Las lentes de arquitectura y talent verificaron el
runtime real y **corrigieron seis puntos de esta spec**. Donde la spec y el ADR difieran, manda el ADR.

1. **Supuesto falso (a) — el trigger no puede salir del payload.** `src/lib/sync/reactive-consumer.ts:644-660`
   hace coalescing por scope y conserva **el último payload**; el lane `notifications` corre cada 2 min
   (`services/ops-worker/deploy.sh:1097-1102`) y es donde viven ambas projections de correo. Un candidato que
   pasa `shortlisted → interview` en esa ventana entrega un solo refresh con `stage: interview` y **la etapa
   trigger se pierde en silencio**. El Slice 4 debe derivar la etapa del **estado vigente en PG** con el mismo
   predicado del reader de reconciliación, **nunca** de `payload.stage`. La reconciliación deja de ser red de
   seguridad y pasa a ser parte del contrato.
2. **Supuesto falso (b) — el cuestionario NO está congelado, y el template SÍ tiene versión.** La premisa
   "el template no tiene versión" es **falsa**: `TASK-1383` le dio versión + inmutabilidad
   (`migrations/20260710202351833_task-1383-assessment-hardening.sql:60-115`). El problema real es peor: esa
   inmutabilidad **no cubre `hiring_question`**, y `public-taking.ts:241-285` resuelve el set **en vivo**
   (`status='active'`, `ROW_NUMBER()` por módulo, `LIMIT 12`). Agregar/archivar una pregunta cambia el examen
   del siguiente candidato con el mismo `template_id` y versión. Hay competencias con **una sola pregunta
   activa** (`communication`, `content_analytics`, `research_synthesis`, `tool_fluency`): archivarla deja el
   módulo **vacío** sin ruido. ⇒ **Snapshot inmutable del cuestionario por instancia** (D4), requisito duro
   antes de expandir auto más allá del canary; `content_digest` en Slice 1.
3. **Coordinación del correo: fan-in, no skip.** El Slice 5 cambia de forma. Un consumer único
   `hiring_stage_changed_candidate_comms` **absorbe** `hiring_stage_changed_email`
   (`projections/hiring-lifecycle-emails.ts:82-86`), decide `commsIntent` y **lo persiste antes de enviar**.
   Outcome terminal (`held|blocked|stale`) ⇒ degrada al genérico **en la misma ejecución**; fault ⇒ retry sin
   comunicar. Rechazado el patrón "el sender consulta la policy y hace skip" (decide sobre una predicción; si
   el email corre primero y la policy termina `held`, el candidato recibe **silencio total**).
4. **Bug vivo que el refactor de Slice 2 debe cerrar.** `assignCandidateTest` (`instances.ts:237-303`) hace
   check-then-insert: el `SELECT` filtra 3 estados (`assigned|sent|in_progress`) pero el índice parcial
   `hiring_assessment_open_instance_unique_idx` cubre **4** (incluye `submitted`). Una instancia `submitted`
   produce un `23505` crudo → `error-response.ts:41-52` cae al branch genérico → **HTTP 500
   `hiring_internal_error` con `actionable:true`** (la UI ofrece "Reintentar" para algo irreparable), y en el
   carril reactivo se comporta como fault → dead-letter fabricado. Adoptar `ON CONFLICT DO NOTHING RETURNING`
   + re-lectura del ganador, patrón `createScoringRun` (`ai/scoring-run/store.ts:216-252`). **La automatización
   SOLO escribe `attempt_seq=1`**; retake/re-asignación son commands humanos.
5. **Capability nueva role-only.** `hiring.assessment.policy.govern` (`execute`/`tenant`), grant
   `EFEONCE_ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS`, **sin routeGroup `internal`** — precedente literal del
   audit 2026-07-10 (`entitlements/runtime.ts:588-598`). Rechazado endurecer `hiring.assessment.author`
   (regresión sobre TASK-1360/1363 + mezcla autorar contenido con decidir escrituras a una cohorte). Grant en
   el mismo PR.
6. **Rollout reescrito (la spec elegía Content Creator = error).** **No existe "probar en staging"**: el
   ops-worker es un único Cloud Run compartido por staging y producción (`deploy.sh:23-30`). Estado real
   verificado en DB: `atpl-account-manager-l2` = 6 instancias / **2 rendidos** (único ciclo cerrado);
   Content Creator L2 Integral v2 = 9 instancias / **0 completados**; y hay **3 plantillas activas de Content
   Creator**, sólo una en uso — ambigüedad que la policy existe para cerrar, y riesgo operativo hoy.
   Secuencia: (0) alguien de Talent **rinde** el test cronometrado (¿alcanzan 45 min?); (1) opening+postulación
   sintética, leer el correo en el teléfono; (2) verificar que `hiring_assessment_submitted_internal_email`
   entrega de verdad; (3) manual-first en **Account Manager**, 2-3 candidatos; (4) auto en lotes ≤3,
   **prohibido mover etapas en bulk**; (5) Content Creator sólo tras un ciclo completo de AM y tras entender
   por qué sus 9 asignados no rindieron. Avisar al equipo **antes**: *"la columna de etapa dejó de ser una nota
   interna y pasó a ser un botón de enviar"*. Kill switch = policy `disabled`.

**Protecciones propias sin esperar `TASK-1739`**: policy nace `draft`+`manual` (flip exige capability +
opening `published` + audit); **cap de volumen** por opening/ventana con auto-detención
(`hiring.assessment_auto_assignment_blocked`, reason `volume_cap`); **recipient readiness fail-closed** con
denylist (`.test`/`.invalid`/`.local`) ⇒ `blocked: unverified_recipient` — capa **desechable** cuando 1739
aterrice `data_origin`.

**Hallazgo adicional registrado**: `accommodations_json` está cableado end-to-end en lectura y render
(`public-taking.ts:171-186`, `AssessmentTakingClient.tsx:353-358`) y `assignCandidateTest` lo persiste, pero
**ningún caller productivo lo pasa** (`api/hiring/assessments/route.ts:93`): la accesibilidad es código muerto
salvo SQL manual. Mitigación mínima en este alcance: la línea de accommodations en el copy de ambos correos.

**Justificación de negocio (va en el ADR)**: una policy que dispara para **todos** los que entran a la etapa es
más justa y defendible que un reclutador eligiendo a quién testear — es estructura, la palanca #1 de validez y
la que baja adverse impact. **No es IA de alto riesgo** (regla determinística etapa→plantilla, sin inferencia);
el invariante que lo sostiene: **el trigger es la etapa, NUNCA un score/match/atributo inferido**.

**Open items que el ADR deja declarados y NO decididos**: TTL del proposal y SLA de reconciliación; si el
snapshot es slice de esta task o task hija; recordatorios del test (hoy Out of Scope — 14 días sin recordatorio
es un cementerio silencioso; mínimo, decir la **fecha** y no la duración); qué significa `expired`
operativamente; qué pasa si se avanza a `interview` con el test de `shortlisted` abierto; el aviso en la
vacante pública de que el proceso incluye evaluación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command|sync`
- Epic: `EPIC-011`
- Status real: `Diseño; command base y correo existen, falta policy vacante-test y automatización`
- Rank: `TBD`
- Domain: `hr|data|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la política canónica que vincula una `HiringOpening` con un assessment template versionado y permite
asignar el test a una postulación de dos maneras convergentes: confirmación humana explícita o entrada a una
etapa configurada. Ambas rutas ejecutan el mismo command idempotente, emiten el evento existente
`hiring.assessment.assigned` y reutilizan el correo transaccional live de `TASK-1689`.

La automatización es determinística y no toma decisiones de selección. No auto-rechaza, no auto-contrata, no
interpreta scores y no entrega tokens crudos a consumers nuevos.

## Why This Task Exists

El assessment engine ya puede crear una instancia `candidate_test` para una aplicación concreta mediante
`assignCandidateTest`, y el ops-worker ya envía el enlace al candidato cuando consume
`hiring.assessment.assigned`. Sin embargo, la vacante no declara qué plantilla le corresponde ni en qué etapa
debe asignarse. Por eso un operador o agente debe elegir `templateId` manualmente y un cambio de etapa sólo
genera el correo genérico de avance.

Resolverlo dentro del PATCH de etapa duplicaría reglas, mezclaría transacción de pipeline con entrega externa y
fallaría para cualquier otro productor del evento. Resolverlo dentro del gateway MCP convertiría al adapter en
dueño de lógica Hiring. Esta task crea una política de dominio versionada, un command canónico y un consumer
reactivo con retry/reconciliation.

`TASK-1603` necesita el mismo binding opening→template para su quality gate, pero pertenece a Talent Assurance y
está bloqueada por `TASK-1602`. Esta task extrae la fundación operacional a EPIC-011; `TASK-1603` la consume para
completitud/evidencia sin crear una segunda tabla ni impedir que Hiring asigne tests hoy.

## Goal

- Versionar una política por opening que resuelva plantilla, modalidad manual/automática, etapa trigger, tiempo
  límite y estado de habilitación.
- Exponer propose→confirm para asignación manual y un command idempotente común que nunca confíe en un
  `templateId` entregado por el consumer.
- Asignar automáticamente al entrar a la etapa configurada mediante outbox/ops-worker, con resultados tipados,
  retry, audit, hold por aplicación y reconciliación.
- Reutilizar el email existente como único delivery del enlace en las rutas nuevas, evitando doble correo de
  etapa+test y sin publicar el token en outbox, logs o API.
- Incorporar cancelación gobernada de tests no iniciados como reversa operacional.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- La acción ejecutable siempre es asignar un template a una `hiring_application`, creando una instancia
  `hiring_assessment`. Una opening sólo contiene policy; nunca contiene token, respuestas ni score.
- Un consumer proporciona `applicationId` y propósito. Greenhouse resuelve opening, policy y template
  server-side; `templateId` no es input de la asignación gobernada.
- Sólo templates `active`, versionados e inmutables una vez usados son asignables. Cambiar template crea una
  nueva versión de policy; no reescribe assessments existentes.
- El score sigue siendo advisory y nunca causa avance, rechazo, contratación, handoff ni correo de decisión.
- La entrada a etapa no ejecuta side effects inline: `updateHiringApplicationStage` persiste + outbox; el
  ops-worker re-lee estado/policy y ejecuta el command idempotente.
- Un retry, replay, doble click o reentrada a la misma etapa no crea otro test ni envía otro email.
- Las rutas nuevas usan delivery `candidate_email`: no devuelven token ni link. El email consumer rota el token
  justo antes del envío y el token nunca entra al outbox.
- Cuando una etapa dispara test, el correo de asignación reemplaza el correo genérico de avance para esa
  transición. El candidato recibe una comunicación, no dos mensajes con orden incierto.
- Un hold/accommodation por aplicación detiene la automatización y exige revisión humana. La policy automática
  no infiere ni fabrica accommodations.
- Cancelar sólo es válido antes de que el test comience (`assigned|sent`), con razón y actor. Un test
  `in_progress|submitted|scored` requiere resolución humana fuera del command automático.
- Errores y señales no contienen nombre, email, token, respuestas, score ni texto libre del candidato.

## Normative Docs

- `docs/tasks/complete/TASK-1360-assessment-engine-foundation.md`
- `docs/tasks/complete/TASK-1363-assessment-taking-review-surface.md`
- `docs/tasks/complete/TASK-1689-hiring-lifecycle-transactional-emails.md`
- `docs/tasks/to-do/TASK-1603-hiring-quality-gate-opening-binding.md`
- `docs/tasks/to-do/TASK-1718-hiring-candidate-review-packet-delegated-mcp-reader.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- `assignCandidateTest`, `getAssessmentById` y `reissueCandidateTestTokenForEmail` en
  `src/lib/hiring/assessment/instances.ts`.
- `updateHiringApplicationStage` y readers de opening/application en `src/lib/hiring/store.ts`.
- `sendHiringAssessmentAssignedEmail` y `sendHiringStageAdvancedEmail` en
  `src/lib/hiring/notifications/send.ts`.
- Registry reactivo `src/lib/sync/projections/index.ts` y ejecución del `ops-worker`.
- Capabilities existentes `hiring.assessment.author`, `hiring.assessment.read`,
  `hiring.application.write` y `hiring.opening.write`.

### Blocks / Impacts

- `TASK-1720`: MCP write delegado consume exclusivamente los proposals/commands de esta task.
- `TASK-1603`: pasa a depender de la policy de esta task para su quality gate; conserva ownership de
  completeness, missing evidence y override de decisión.
- Application 360: el POST legacy sigue compatible; una migración visual a delivery exclusivamente por email es
  follow-up UI y no bloquea esta fundación.
- `TASK-1689`: conserva ownership de templates/email delivery; esta task sólo coordina cuándo el correo genérico
  de etapa debe hacer skip porque existe assignment email.

### Files owned

- `src/lib/hiring/assessment/assignment-policy/**` *(nuevo)*
- `src/lib/hiring/assessment/instances.ts`
- `src/lib/hiring/assessment/index.ts`
- `src/lib/hiring/notifications/stages.ts`
- `src/lib/hiring/notifications/send.ts`
- `src/lib/sync/projections/hiring-stage-assessment-assignment.ts` *(nuevo)*
- `src/lib/sync/projections/index.ts`
- `src/app/api/hiring/openings/[id]/assessment-policy/route.ts` *(nuevo)*
- `src/app/api/hiring/applications/[id]/candidate-test/proposals/route.ts` *(nuevo)*
- `src/app/api/hiring/applications/[id]/candidate-test/proposals/[proposalId]/confirm/route.ts` *(nuevo)*
- `src/app/api/hiring/assessments/[id]/cancel/route.ts` *(nuevo)*
- `migrations/*opening-assessment-policy*.sql` *(nuevo; nombre timestamp final en implementación)*
- `services/ops-worker/deploy.sh`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- arquitectura, catálogo de eventos, documentación funcional y manual de Hiring afectados

## Current Repo State

### Already exists

- `assignCandidateTest` valida aplicación, crea una instancia y publica `hiring.assessment.assigned` dentro de
  una transacción. Si existe una instancia abierta para application+template responde
  `assessment_already_open`.
- `reissueCandidateTestTokenForEmail` rota el token sólo en `assigned|sent`, marca `sent` y nunca lo envía por
  outbox.
- `sendHiringAssessmentAssignedEmail` re-lee assessment y aplicación, deduplica antes de rotar y envía el link
  público mediante la plataforma de email canónica.
- `updateHiringApplicationStage` impide estados terminales y publica `hiring.application.stage_changed`.
- El ops-worker ya ejecuta consumers reactivos con retry/dead-letter y el flag de emails Hiring está declarado.
- El evento `hiring.assessment.submitted` tiene alerta interna a People (`hiring_assessment_submitted_internal`):
  sólo para `candidate_test` submitted/scored, sin score ni decisión; fue promovido por `0fe2420ed894` y su
  migración quedó habilitada. Es una notificación reactiva, no prueba de entrega real ni reemplazo de la policy.

### Gap

- `hiring_opening` no tiene binding ni policy de assessment template/etapa.
- No existe command que resuelva la plantilla desde la opening y permita propose→confirm sin aceptar
  `templateId` arbitrario.
- No existe assignment outcome durable para diferenciar `assigned`, `already_assigned`, `held`, `stale_stage`,
  `missing_email`, `policy_disabled` o `template_inactive`.
- No existe consumer de `stage_changed` que cree el assessment.
- No existe hold/override por aplicación ni cancelación auditada del token antes de comenzar.
- El email genérico de etapa no sabe que otra proyección enviará el test, por lo que una implementación ingenua
  produciría doble comunicación.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: policy/commands en `src/lib/hiring/assessment/**`; API en Vercel; consumer reactivo en
  `src/lib/sync/projections/**` ejecutado por `ops-worker`
- Future candidate home: `domain-package`
- Boundary: `resolveOpeningAssessmentPolicy`, `proposeCandidateTestAssignment`,
  `confirmCandidateTestAssignment`, `assignCandidateTestFromOpeningPolicy` y `cancelCandidateTest` son los
  únicos primitives; UI, MCP y worker no duplican resolución de policy
- Server/browser split: DB, policy, proposals, tokens, email resolution, capabilities y audit permanecen
  server-only; browser recibe DTO sin token para rutas nuevas
- Build impact: `none` — reusa PostgreSQL, outbox, worker y email existentes; sin SDK ni filesystem nuevo
- Extraction blocker: transacción y auth viven en Greenhouse; delivery depende del ops-worker y plataforma email

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command|sync`
- Source of truth afectado: `greenhouse_hiring.hiring_opening`, `greenhouse_hiring.hiring_application`,
  `greenhouse_hiring.hiring_assessment` y nuevas policy/proposal/audit derivadas dentro de `greenhouse_hiring`
- Consumidores afectados: Hiring API/Application 360, ops-worker, email lifecycle, Nexa y MCP downstream
- Runtime target: PostgreSQL, Vercel y ops-worker en staging/production

### Contract surface

- Contrato existente a respetar: `assignCandidateTest`, `updateHiringApplicationStage`, eventos
  `hiring.application.stage_changed`/`hiring.assessment.assigned`, plataforma email y capability registry
- Contrato nuevo o modificado: opening assessment policy versionada; proposal/confirm/cancel commands; consumer
  de etapa; typed outcomes; coordinación de stage email
- Backward compatibility: `gated`; POST legacy de `/api/hiring/assessments` conserva shape durante esta task y
  las rutas nuevas no devuelven token
- Full API parity: policy y assignment/cancel son primitives server-side expuestos por Product API; UI, worker,
  Nexa y TASK-1720 consumen el mismo command

### Data model and invariants

- Entidades/tablas/views afectadas: nuevas estructuras conceptuales `opening_assessment_policy`,
  `candidate_test_assignment_proposal`, `candidate_test_assignment_audit` y hold/exception por application; los
  nombres SQL finales se fijan en ADR/Plan Mode y no duplican un ledger existente si Discovery encuentra uno
- Invariantes que no se pueden romper:
  - Máximo una policy `enabled` por `opening + trigger_stage` en V1.
  - Policy referencia opening existente y template `active`; el template usado queda snapshot/version-linked.
  - Confirm sólo ejecuta el effect digest propuesto; application/policy/template/time limit no se aceptan otra vez.
  - Auto-assignment re-lee que la aplicación sigue en la etapa del evento y no tiene decisión formal.
  - Una aplicación recibe como máximo una asignación por `policy_version`; reentrada/replay retorna outcome estable.
  - `missing_email`, hold/accommodation, template inactivo o policy apagada no crean assessment ni token.
  - El token crudo sólo existe en memoria del delivery y nunca se persiste, audita, loggea ni devuelve por rutas nuevas.
  - Cancelación preserva assessment/audit y sólo invalida el token en estados pre-inicio.
  - Assessment score nunca modifica stage/decision automáticamente.
- Tenant/space boundary: todos los commands exigen tenant interno y capacidades finas; opening/application/policy
  se resuelven en el mismo dominio, sin aceptar tenant del request
- Idempotency/concurrency: proposal digest + expiry; confirm one-shot; auto key
  `application_id + policy_version + trigger_stage`; locks/unique constraints impiden dobles instancias; consumer
  at-least-once responde typed no-op en replay
- Audit/outbox/history: policy versions append/supersede; proposal/confirm/cancel/auto outcome auditados con actor,
  source, event/proposal, reason code y timestamps; outbox sólo IDs/versiones, sin PII/token

### Migration, backfill and rollout

- Migration posture: `additive` + expand-first; CHECK/uniques/grants/indices verificados, sin alterar assessments
  históricos
- Default state: `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED=false`; policy mode `manual` y auto OFF por opening
- Backfill plan: ninguno para assignments; policy se configura explícitamente por opening. No se asignan tests por
  etapas históricas ni se reproducen eventos antiguos
- Rollback path: flag worker OFF + policy auto OFF; proposals nuevos bloqueados; assessments existentes se
  conservan. Cancelación gobernada para errores pre-inicio, nunca DELETE/reverse migration en caliente
- External coordination: Talent aprueba policy/template/stage/time limit y copy de coordinación; Operations
  despliega flag en ops-worker; ningún proveedor nuevo

### Security and access

- Auth/access gate: read `hiring.assessment.read`; policy write exige `hiring.opening.write` +
  `hiring.assessment.author`; propose/confirm/cancel exige `hiring.assessment.author`; stage command conserva
  `hiring.application.write`
- Sensitive data posture: PII de candidato sólo se re-lee en delivery existente; policy/proposal/audit no guarda
  email, nombre, token, respuesta ni score
- Error contract: `assessment_policy_not_found | assessment_policy_disabled | assessment_template_inactive |
  assessment_assignment_held | assessment_candidate_email_missing | assessment_already_assigned |
  assessment_stage_stale | assessment_proposal_expired | assessment_effect_mismatch |
  assessment_cannot_cancel`; sanitizados mediante error contract Hiring
- Abuse/rate-limit posture: proposal/confirm rate-limited por actor/application; proposal TTL; una confirmación;
  batch no incluido; consumer con retry acotado y dead-letter existente

### Runtime evidence

- Local checks: tests de policy versions, exact effect digest, capabilities, typed outcomes, idempotencia,
  concurrency, cancel state machine y no-score→stage
- DB/runtime checks: migration/grants con rol runtime real; dos stage events concurrentes producen una instancia;
  replay no crea filas/email adicionales
- Integration checks: staging opening sintética manual y auto; email recibido; etapa no-trigger no asigna; hold,
  missing email, stale event, template inactive y cancel ejercitados
- Reliability signals/logs: `hiring.assessment_auto_assignment_blocked`,
  `hiring.assessment_auto_assignment_failed`, `hiring.assessment_assignment_stale`,
  `sync.outbox.dead_letter`; sin PII
- Production verification sequence: definida en rollout; primera opening allowlisted y cooldown antes de expandir

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Policy, propose, confirm, assign and cancel viven en `src/lib/hiring/**`, no en UI, worker ni MCP.
- [ ] Opening policy, assignment proposal y assessment son recursos/aggregates, no click handlers.
- [ ] Writes aplican capability fina, idempotencia, audit/outbox, errores sanitizados y typed outcomes.
- [ ] Capabilities existentes tienen grants reales verificados; cualquier capability nueva se registra/grantea en
  el mismo PR.
- [ ] Camino programático: Product API interno; TASK-1720 agrega MCP sin reimplementar policy.
- [ ] Propose→confirm liga aprobación al effect digest exacto y expira sin side effect.
- [ ] La reversa `cancelCandidateTest` entrega paridad operacional para asignaciones erróneas pre-inicio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — ADR delta y state-machine contract

- Aceptar delta de arquitectura para policy opening→template, proposal/confirm, auto trigger y cancelación.
- Resolver nombres SQL/rutas exactos, ownership, retention de proposals/audit, TTL y stage allowlist.
- Definir state machines de policy, proposal y cancelación; quality scenarios y matriz de correo único.
- Confirmar transición de templates usados: no mutación, sólo version/supersede.
- Gate: Talent + Hiring + Platform/Identity + Ops aprueban contrato antes de migration.

### Slice 1 — Policy versionada de opening

- Migration additive, grants e índices para policy y excepciones/holds por aplicación.
- Commands/readers para create/supersede/enable/disable y resolver policy efectiva.
- Validar opening, template activo, etapa no terminal, time limit permitido y unicidad por opening+stage.
- Product API GET/PUT con readback y tests de capability/tenant.
- Actualizar `TASK-1603`/arquitectura para consumir esta policy como binding canónico.

### Slice 2 — Assignment proposal, confirm y command común

- Proposal read-only genera preview minimizado: application/opening/template label+version, trigger/mode,
  time limit, contact readiness, assessment existente, holds y efectos.
- Confirm one-shot recibe sólo `proposalId` + confirmación/idempotency; revalida policy, application, template,
  capability y effect digest al ejecutar.
- Refactor interno de `assignCandidateTest` para reutilizar transacción sin exponer token en delivery email.
- Typed outcomes y audit para manual/auto/replay; ningún consumer interpreta `409` como éxito a ciegas.

### Slice 3 — Cancelación y recovery

- Extender estado assessment con `cancelled` mediante migration compatible y transición sólo desde
  `assigned|sent`.
- `cancelCandidateTest` exige reason allowlisted/texto acotado, actor y expected version; invalida token y emite
  `hiring.assessment.cancelled`.
- Si el email ya fue `sent`, registrar necesidad de comunicación correctiva; el envío automático de corrección
  requiere template/copy aprobado en este slice o outcome `operator_followup_required`, nunca silencio.
- Reader muestra cancelled y audit; public token responde no enumerable.

### Slice 4 — Consumer stage→assignment

- Registrar projection sobre `hiring.application.stage_changed`; re-leer aplicación/policy/template/hold/contact.
- Verificar etapa actual igual al evento; stale transition es terminal no-op auditado.
- Ejecutar command común con idempotency `event + policyVersion`; retry/fault usa dispatcher existente.
- Flag sólo en ops-worker, default OFF y declarado en `deploy.sh` + ledger.
- Reconciliation reader/script detecta policy trigger alcanzado sin assignment terminal y permite retry gobernado.

### Slice 5 — Comunicación única y rollout

- `sendHiringStageAdvancedEmail` consulta la policy/outcome: si esa transición genera candidate test, hace skip
  `superseded_by_assessment_assignment`; el assignment email es la única comunicación.
- Si auto-assignment queda bloqueada antes de crear assessment, definir si stage email genérico procede según
  reason code; nunca decir que hay test si no existe.
- E2E staging manual + auto + replay + email + cancel; verificar email log/dedupe/PII.
- Canary producción en una opening Content Creator con policy versionada y monitor 7 días.

## Out of Scope

- Tools MCP y OAuth/write scope: `TASK-1720`.
- Cambiar stage mediante MCP; una futura tool consume `updateHiringApplicationStage` y la misma automatización.
- UI para configurar policy/hold o migrar Application 360 a email-only; requiere task UI separada si se solicita.
- Asignación masiva, campañas, recordatorios/nurturing o reenvío manual de links.
- Elegir template mediante IA, generar preguntas o scorear con IA.
- Avance/rechazo/contratación automática por score o completion.
- Quality-of-hire, claims Talent Assurance y completeness/override de decisión de `TASK-1603`.
- Backfill de candidatos que ya pasaron por la etapa.

## Detailed Spec

### Policy V1 conceptual

```ts
type OpeningAssessmentPolicyV1 = {
  policyId: string
  openingId: string
  templateId: string
  templateVersion: string
  mode: 'manual' | 'on_stage_entry'
  triggerStage: 'shortlisted' | 'interview'
  timeLimitMinutes: number
  status: 'draft' | 'enabled' | 'superseded' | 'disabled'
  version: number
  effectiveAt: string
  createdBy: string
}
```

V1 limita trigger a etapas candidate-facing no terminales y una policy enabled por opening+stage. Ampliar a
múltiples tests/secuencias exige otra decisión porque cambia volumen de correos, fairness y experiencia.

### Outcome V1

```ts
type CandidateTestAssignmentOutcome =
  | { status: 'assigned'; assessmentId: string; deliveryStatus: 'pending' }
  | { status: 'already_assigned'; assessmentId: string }
  | { status: 'held'; reasonCode: string }
  | { status: 'blocked'; reasonCode: 'missing_email' | 'policy_disabled' | 'template_inactive' }
  | { status: 'stale'; reasonCode: 'stage_changed' | 'application_decided' | 'effect_changed' }
```

El caller debe leer `status`; nunca inferir éxito desde HTTP 200. `deliveryStatus=pending` no significa correo
enviado: el email log/readback es la evidencia posterior.

### Ordering del correo

El stage event tiene dos consumers. La coordinación se resuelve por policy+assignment outcome durable, no por
esperar que un consumer corra primero. El stage-email consumer sólo omite el correo genérico cuando existe un
assignment creado o una intent terminal que declara que el assignment email será la comunicación. Si la
automatización queda bloqueada sin assessment, no se promete test.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 → Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Policy/commands manuales deben cerrar antes del consumer automático.
- Cancelación/recovery debe existir antes de habilitar auto-assignment en staging.
- El flag permanece OFF hasta que email ordering, replay y PII tests estén verdes.
- TASK-1720 no implementa lógica hasta que Slice 2 cierre; confirm MCP permanece bloqueada hasta cierre completo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble test por replay/concurrencia | assessment/DB | medium | unique/idempotency policyVersion + transaction/lock | `hiring.assessment_duplicate_assignment_prevented` |
| Template equivocado por input del agente | Hiring | high | server resolves policy; confirm no recibe templateId | effect mismatch audit |
| Dos correos por stage+assignment | email/brand | high | coordination durable + dedupe/E2E | email log con ambos tipos para mismo event |
| Stage cambia antes del consumer | sync | medium | re-read y stale no-op | `hiring.assessment_assignment_stale` |
| Candidato sin email o con accommodation recibe asignación inútil | candidate experience | medium | readiness+hold fail closed | `hiring.assessment_auto_assignment_blocked` |
| Error de policy asigna a cohorte equivocada | Hiring/fairness | medium | opening allowlist, shadow, canary, policy audit | volumen assignment por opening |
| Email enviado con token luego cancelado | candidate experience | low-medium | cancel audit + correction/follow-up outcome | cancelled-after-sent metric |
| Score termina moviendo etapa por acoplamiento futuro | selection governance | low | static boundary test no assessment→stage/decision | boundary test rojo |
| Flag se prende en Vercel y no en worker | ops | high | deploy.sh+ledger+live revision check | worker reporta flag OFF |

### Feature flags / cutover

- `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED=false`, leído sólo por ops-worker y registrado en deploy/ledger.
- Policy `mode=manual` y `status=draft|disabled` por defecto; habilitar auto requiere command auditado.
- Cutover: migration → manual proposal/confirm → cancel recovery → worker shadow → auto staging → una opening
  producción → expansión.
- Revert inmediato: flag OFF + policies auto disabled. No borrar assessments ni audit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | rechazar/superseder delta ADR; sin runtime | inmediato | sí |
| 1 | policies disabled + revert readers; conservar tablas/audit | <10 min | sí |
| 2 | bloquear confirm + revert routes; proposals expiran | <10 min | sí |
| 3 | deshabilitar cancel route; assessments cancelados quedan históricos | <10 min | parcial, por diseño |
| 4 | flag worker OFF + redeploy | <5 min | sí |
| 5 | policy auto OFF; volver a stage email vigente | inmediato | sí |

### Production verification sequence

1. ADR/owners aceptados y migration staging aplicada; verificar grants/uniques con rol runtime.
2. Crear policy draft sobre opening/candidato sintéticos; validar template inactivo y cross-opening deny.
3. Propose→confirm manual: una instancia, event, email recibido; replay devuelve `already_assigned` sin email extra.
4. Cancel pre-start: token anterior inválido, audit visible y follow-up de comunicación resuelto.
5. Worker deploy con flag OFF; verificar comportamiento vigente sin cambios.
6. Activar shadow y luego auto en staging; stage trigger crea una instancia y un solo correo; etapa no-trigger no crea.
7. Ejercitar hold, missing email, stale stage, decision concurrente, fault/retry y dead-letter/reconciliation.
8. Producción con flag OFF; aplicar migration/deploy y repetir smoke no-mutante.
9. Habilitar una policy Content Creator; mover candidato sintético/autorizado, verificar email real y audit.
10. Monitor 7 días: duplicados=0, dead-letter=0, blocked explicados, PII logs=0; luego expandir.

### Out-of-band coordination required

- Talent aprueba opening, template versionado, trigger stage, time limit, hold/accommodation y comunicación.
- Operations despliega/verifica flag en ops-worker y monitorea dead-letter/reconciliation.
- Owner de email valida que el skip de stage no degrade otras transiciones candidate-facing.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Opening puede tener policy versionada manual/auto con template activo, trigger y time limit.
- [ ] Greenhouse resuelve template desde opening; assignment command no acepta template arbitrario del caller.
- [ ] Proposal preview y confirm quedan ligados por effect digest, actor, expiry e idempotency.
- [ ] Rutas nuevas nunca devuelven token/link; outbox/audit/logs tampoco lo contienen.
- [ ] Manual y automático convergen en el mismo command y typed outcomes.
- [ ] Dos stage events/retries concurrentes producen una instancia y un email.
- [ ] Reentrada a etapa o assessment abierto retorna `already_assigned` sin side effects nuevos.
- [ ] Hold/accommodation, missing email, policy disabled, template inactive, stale stage y decided fallan cerrados.
- [ ] Cancelación invalida token sólo pre-inicio, preserva audit y exige razón/actor.
- [ ] Stage trigger exitoso genera sólo email de test, no email genérico adicional.
- [ ] Assignment bloqueado no comunica un test inexistente.
- [ ] Worker flag está en deploy.sh/ledger y fue apagado/encendido con evidencia staging.
- [ ] Reconciliation detecta trigger sin terminal outcome y permite retry gobernado.
- [ ] Tests prueban que score/completion no mueve stage ni decide.
- [ ] TASK-1603 consume la policy y no crea binding/table duplicada.
- [ ] Manuales, arquitectura, evento y operación de email quedan actualizados.

## Verification

- `pnpm task:lint --task TASK-1719`
- `pnpm ops:lint --changed`
- tests focales `src/lib/hiring/assessment/**`, `src/lib/hiring/notifications/**` y projection registry
- `pnpm worker:build-contract-gate`
- `pnpm worker:runtime-deps-gate`
- migration/grants smoke con rol runtime real
- E2E staging manual/auto/replay/cancel/email/reconciliation
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `EPIC-011`, `TASK-1603`, `TASK-1689` y `TASK-1720` reflejan el boundary final
- [ ] runtime se declara `code complete, rollout pendiente` hasta canary y monitor productivo cerrados

## Follow-ups

- UI para configurar policy/hold y migrar Application 360 a delivery email-only si producto lo prioriza.
- Stage transition MCP gobernada consumiendo `updateHiringApplicationStage`; no duplicar auto-assignment.
- Recordatorios de test pendientes bajo policy de frecuencia/consentimiento separada.

## Delta 2026-08-15

- Task creada como fundación EPIC-011. Extrae de TASK-1603 el binding operativo opening→template para que
  Talent Assurance consuma un primitive existente y la asignación básica no dependa de su ADR de claims.

## Open Questions

- Ninguna bloquea registrar. Slice 0 fija TTL de proposal, límites de time limit, nomenclatura SQL exacta,
  correction-email vs operator follow-up y SLA de reconciliation.
