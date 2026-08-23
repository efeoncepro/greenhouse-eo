# TASK-1769 — Agendar la entrevista: evento de calendario con enlace de Teams, sin quedarse con el calendario

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-011`
- Status real: `Diseno — cero codigo de calendario en el repo (grep de getSchedule/isOnlineMeeting/onlineMeeting/POST events sobre src y services: cero coincidencias, 2026-08-22). El cliente de Graph y las suscripciones con renovacion SI existen y se reusan. La fuente de verdad quedo DECIDIDA el 2026-08-22 por el operador: el calendario manda y Greenhouse solo referencia. Sigue abierto quien organiza (OQ-2) y sin confirmar el permiso Calendars.ReadWrite`
- ADR: `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (contexto del pipeline; NO decide el agendamiento — este dominio necesita ADR propio, Slice 1)
- Rank: `TBD`
- Domain: `hr|identity|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse hoy **no agenda entrevistas**: la columna «Entrevista» del pipeline registra que la persona
esta en conversacion con el equipo, pero la cita vive fuera del portal y el enlace de Teams se pega a mano
en un correo o un WhatsApp. Esta task instala la capacidad de **crear la cita desde Greenhouse** con una
sola llamada a Microsoft Graph (`POST /users/{organizerId}/events` con `isOnlineMeeting: true`), guardar una
**referencia** durable a ese evento (id, `joinUrl`, cuando, quien organiza) y mantenerla sincronizada cuando
alguien reagenda o cancela desde Outlook. **El operador decidio el 2026-08-22 que el calendario manda y
Greenhouse solo referencia**: si alguien reagenda o cancela desde Outlook, Greenhouse actualiza su
referencia, nunca al reves. Lo que sigue abierto es quien organiza la reunion (OQ-2) y el permiso de
calendario, que aun no esta otorgado.

## Why This Task Exists

El proceso de seleccion tiene una etapa entera —«Entrevista»— que el sistema nombra pero no opera. Las
consecuencias no son estéticas:

1. **La cita no es un dato del proceso.** No hay forma programatica de saber cuando es la entrevista, quien
   la conduce ni si ya ocurrio. Cualquier metrica de velocidad del pipeline (tiempo en etapa, time-to-hire)
   se calcula sobre movimientos manuales de tarjeta, no sobre hechos.
2. **El enlace de Teams se manipula a mano**, fuera de todo control. Es el mismo patron que el dominio ya
   corrigio para el acceso al test del candidato (`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` §Invariantes
   operativos para agentes — Acceso al test del candidato): una credencial de acceso que el operador copia
   y pega termina en logs, capturas y mensajes.
3. **`TASK-1768` va a hacer visible el progreso de la etapa Entrevista** y se encuentra con que el unico eje
   que existe ahi es el `interviewer_scorecard`, que llega **despues** de la entrevista. El agendamiento es
   el eje que falta antes.

La duda que frenaba esto era tecnologica y **ya esta resuelta** — no hay que evaluar tecnologia nueva:

- El enlace de Teams **no tiene API propia**. Sale de una sola llamada a Graph:
  `POST https://graph.microsoft.com/v1.0/users/{organizerId}/events` con `isOnlineMeeting: true` y
  `onlineMeetingProvider: "teamsForBusiness"`; la respuesta trae `onlineMeeting.joinUrl`. Permiso
  `Calendars.ReadWrite`.
- El repo **ya tiene** cliente de Graph con client-credentials (`src/lib/entra/graph-client.ts:53-95`) y
  **suscripciones de change notifications con renovacion automatica y estado persistido**
  (`src/lib/entra/webhook-subscription.ts`) — la parte dificil de mantener sincronizado ya esta construida
  para otro uso.
- La disponibilidad libre/ocupado (`POST /users/{id}/calendar/getSchedule`) existe y **es de `TASK-1770`**,
  que consume este agendamiento. Aca no se implementa.

## Goal

- Que un operador con la capability correspondiente pueda **agendar la entrevista desde Greenhouse** y que
  el evento aparezca en el calendario real del entrevistador con enlace de Teams valido.
- Que Greenhouse conserve una **referencia** durable y auditable de esa cita (id del evento, `joinUrl`,
  inicio/fin con zona horaria explicita, organizador, asistentes) enlazada a la `hiring_application`.
- Que un cambio hecho en Outlook (reagenda, cancelacion) **actualice la referencia** por change
  notification, y que una referencia que quedo obsoleta sea **detectable por señal**, no por reclamo.
- Que la capability nazca con contrato programatico gobernado (Full API Parity): un command canonico que la
  UI, Nexa y MCP consuman por construccion, con `propose → confirm → execute` para la escritura.
- Que la decision de **quien es dueño del calendario** —ya tomada: el calendario manda— quede **escrita** en
  un ADR antes de la primera escritura, con la alternativa descartada y su consecuencia, y no se infiera del
  codigo despues.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-22 — El operador decide la fuente de verdad, y proponer horarios sale a task propia

**1. OQ-1 queda RESUELTA. Opcion A confirmada: el calendario manda.**

Greenhouse agenda, crea el evento y guarda una referencia (`event_id`, `joinUrl`, cuando, organizador), pero
**NO es dueño del calendario**. Si alguien reagenda o cancela desde Outlook, Greenhouse se entera por change
notification y actualiza su referencia; **nunca al reves**.

- Decisor: operador. Fecha: 2026-08-22.
- Razon: coherencia con la regla ya escrita del repo —Outlook/Microsoft 365 es la fuente de verdad del correo
  y el calendario laboral de Efeonce y sus clientes, y Greenhouse no los sustituye— y evitar la
  sincronizacion bidireccional con resolucion de conflictos que exige la alternativa.
- **La Opcion B (Greenhouse como fuente de verdad) queda descartada** y sigue documentada en
  `Detailed Spec §2` con su consecuencia completa, para que nadie la reabra por instinto.
- **Desbloquea el Slice 4**, que ya no depende de OQ-1.
- **NO relaja la regla de orden critica, la endurece:** la reconciliacion inbound (Slice 5) debe estar en
  produccion **ANTES** de encender el flag de escritura. Al aceptar que el calendario manda, enterarse del
  cambio es la unica forma que tiene Greenhouse de no afirmar con confianza una hora falsa. Esa regla **no**
  la resuelve la decision de hoy.

**2. Proponer horarios sale del `Out of Scope` y pasa a `TASK-1770`.**

Declarado «super util y necesario» por el operador. `getSchedule` y la propuesta de horarios los posee
`TASK-1770` (`docs/tasks/to-do/TASK-1770-hiring-interview-availability-proposal.md`, escrita por otro agente,
no se toca desde aca). `TASK-1770` **consume** el agendamiento de esta task, asi que **esta va primero**.

**3. Lo que NO cambia, y sigue con la misma fuerza:**

- **`Calendars.ReadWrite` no esta otorgado.** La unica tabla de permisos del repo declara solo `User.Read.All`
  de aplicacion (`docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md:419`). Sigue siendo precondicion
  dura verificable (Slice 2), con su comando de auditoria.
- **No hay token delegado.** El cliente es client-credentials puro y el login pide solo
  `openid profile email` (`src/lib/auth.ts:253-262`), asi que «el entrevistador organiza con su identidad»
  implica consent, almacenamiento y refresco de tokens por persona. **OQ-2 sigue abierta y sigue bloqueando
  el Slice 4.**
- **`createOrRenewSubscription` sigue asumiendo una sola suscripcion:** filtra `resource === '/users'` y lee
  una fila unica, asi que una segunda suscripcion pisaria la existente. Generalizarla a clave de registry por
  suscripcion es trabajo real del Slice 5.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Candidate document capture, §Acceso al test
  del candidato — la disciplina del enlace y de la comunicacion ciega)
- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (etapa vs desenlace;
  la cita es un eje de **progreso**, nunca un sub-valor de la etapa)
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` (apps de Entra, permisos declarados)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- **El correo y el calendario laboral de Efeonce y sus clientes viven en Outlook/Microsoft 365.** Greenhouse
  no los sustituye ni se convierte en su fuente de verdad por la puerta de atras (CLAUDE.md §Quick Reference).
- **NUNCA** instanciar un cliente HTTP/SDK de Graph nuevo dentro del dominio hiring. El token de aplicacion
  se resuelve donde ya se resuelve (`src/lib/entra/graph-client.ts`); el dominio consume un **puerto**, no
  `fetch` contra `graph.microsoft.com`.
- **NUNCA** loggear, devolver en un payload generico, ni renderizar fuera de su superficie el `joinUrl`.
  Es la misma disciplina del enlace de assessment: no es una credencial en sentido estricto, pero con
  ingreso anonimo habilitado se comporta como una.
- **NUNCA** ejecutar la escritura a Graph inline dentro de un route handler de Vercel sin control de
  idempotencia. Un retry que crea dos eventos manda **dos invitaciones a la misma persona candidata**.
- **NUNCA** decidir la fuente de verdad en el codigo. Si la referencia y el calendario divergen, el
  comportamiento tiene que estar escrito en el ADR de Slice 1 antes de la primera escritura.
- **NUNCA** crear una tabla nueva del dominio sin declararla en `ALLOWED_WRITE_TARGETS` de
  `src/lib/hiring/boundary-domain.test.ts` en el MISMO PR, con comentario que justifique el destino.
- **NUNCA** derivar la zona horaria del proceso Node. La zona canonica es `America/Santiago` via el
  calendario operativo (`src/lib/calendar/operational-calendar.ts`), y `start.timeZone`/`end.timeZone` van
  explicitos en el payload de Graph.
- **SIEMPRE** que se declare un flag `*_ENABLED`, agregar su fila a
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR, con el runtime donde se LEE.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `.claude/skills/greenhouse-talent-people-operator/SKILL.md` (entrevista estructurada; la cita es el
  vehiculo, el instrumento sigue siendo el scorecard por competencias)
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` (crons, ops-worker, flags
  multi-runtime)

## Dependencies & Impact

### Depends on

- `src/lib/entra/graph-client.ts` — flujo de token client-credentials ya construido y cacheado.
- `src/lib/entra/webhook-subscription.ts` — crear/renovar suscripcion de change notifications, persistencia
  de estado en `greenhouse_sync.integration_registry` y señal de salud.
- `src/lib/cron-orchestrators/index.ts:93-110` (`runEntraWebhookRenew`) + Cloud Scheduler
  `ops-entra-webhook-renew` (`services/ops-worker/deploy.sh:1445-1449`, `0 6 */2 * *`).
- `greenhouse_hiring.hiring_application` — la cita cuelga de la postulacion, no de la persona.
- `greenhouse.team_members.azure_oid` (`src/types/db.d.ts:2957`) — es el puente member ↔ buzon M365 del
  entrevistador. Sin `azure_oid` no hay organizador resoluble.
- **Precondicion externa, no resuelta en el repo:** el permiso `Calendars.ReadWrite` de aplicacion en la app
  de Entra. Ver `## Current Repo State → Gap`.

### Blocks / Impacts

- `TASK-1770` (`to-do`, propuesta de horarios con libre/ocupado) — **consume** el agendamiento que esta task
  construye: sin cita materializable, proponer horarios no tiene donde aterrizar. **Esta task va primero.**
  `TASK-1770` posee `getSchedule` y la seleccion de horario; esta posee el evento, la referencia y su
  sincronizacion. No se toca desde aca.
- `TASK-1768` (`to-do`) — hace visible el progreso de la etapa Entrevista. Hoy solo puede pintar el
  `interviewer_scorecard`, que es evidencia **posterior** a la entrevista. Cuando esta task cierre, esa
  tarjeta puede consumir la referencia de la cita como eje de progreso previo. **No la bloquea**: `TASK-1768`
  debe poder shipear sin agendamiento y degradar limpio cuando no hay cita.
- `TASK-1761` (`to-do`, bridge Hiring → Entra) — comparte la app de Entra y el modelo de permisos. Si esa
  task ya agrega permisos de aplicacion, el consent de `Calendars.ReadWrite` se coordina con ella para no
  pedir consentimiento de admin dos veces.
- `TASK-1754` y sus hijas (vocabulario de etapa/desenlace) — la cita **no** agrega valores al enum de etapas
  ni de desenlaces. Es un eje aparte, como el `source` o el estado del assessment.
- `src/lib/hiring/boundary-domain.test.ts` — el allowlist de destinos de escritura del dominio crece.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — dos flags nuevos.

### Files owned

- `src/lib/hiring/interview/scheduling-types.ts` (nuevo, browser-safe)
- `src/lib/hiring/interview/scheduling-contract.ts` (nuevo)
- `src/lib/hiring/interview/scheduling-reader.ts` (nuevo)
- `src/lib/hiring/interview/scheduling-command.ts` (nuevo)
- `src/lib/hiring/interview/scheduling-store.ts` (nuevo)
- `src/lib/hiring/interview/scheduling-events.ts` (nuevo)
- `src/lib/hiring/interview/calendar-port.ts` (nuevo — puerto provider-neutral)
- `src/lib/entra/calendar-events.ts` (nuevo — adapter Graph: crear/actualizar/cancelar evento)
- `src/lib/entra/webhook-subscription.ts` (modificado — generalizar a N suscripciones por clave de registry)
- `src/app/api/hiring/applications/[id]/interview/route.ts` (nuevo)
- `src/app/api/webhooks/entra-calendar-change/route.ts` (nuevo)
- `src/lib/reliability/queries/hiring-interview-schedule-signals.ts` (nuevo)
- `src/lib/hiring/boundary-domain.test.ts` (modificado — allowlist)
- `migrations/*-task-1769-hiring-interview-schedule.sql` (nuevo)
- `docs/architecture/GREENHOUSE_HIRING_INTERVIEW_SCHEDULING_DECISION_V1.md` (nuevo — ADR de Slice 1)
- `docs/documentation/hr/agendamiento-entrevistas.md` (nuevo)
- `docs/manual-de-uso/hr/agendar-una-entrevista.md` (nuevo)

## Current Repo State

### Already exists

- **Cliente de Microsoft Graph, modo aplicacion.** `src/lib/entra/graph-client.ts:53-95` obtiene el token
  con `client_credentials` contra `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`, scope
  `https://graph.microsoft.com/.default`, tenant por defecto `a80bf6c1-7c45-4d70-b043-51389622a0e4`,
  `AZURE_AD_CLIENT_ID` + `AZURE_AD_CLIENT_SECRET` resuelto por `resolveSecret`. El token se cachea en modulo
  con margen de 60s. **Es `server-only`.** Hoy solo hace lecturas de usuarios, manager y foto
  (`fetchEntraUsers`, `fetchEntraUserManager`, `fetchEntraUserPhoto`).
- **Suscripciones de change notifications con renovacion.** `src/lib/entra/webhook-subscription.ts`:
  `createOrRenewSubscription()` crea o renueva contra `/subscriptions`, con
  `expirationDateTime` a 3 dias menos 60s, `clientState` derivado de los primeros 16 caracteres del
  `SCIM_BEARER_TOKEN`, y persiste `{subscriptionId, expirationDateTime, notificationUrl, lastRenewedAt}` en
  `greenhouse_sync.integration_registry` bajo `integration_key='entra-graph-webhook'`.
  `resolveNotificationUrl()` resuelve la URL publica por environment con orden explicito y documenta que el
  custom domain de staging **no sirve** porque tiene SSO y Graph no manda el header de bypass.
- **Endpoint receptor con handshake.** `src/app/api/webhooks/entra-user-change/route.ts` responde el
  `validationToken` en texto plano (GET y POST) y valida `clientState` antes de procesar.
- **Renovacion agendada.** Cloud Scheduler `ops-entra-webhook-renew` → ops-worker `/entra/webhook-renew`
  (`services/ops-worker/server.ts:2352-2354`), cada 2 dias a las 06:00.
- **Señal de salud de la suscripcion.** `identity.entra.webhook_subscription_health`
  (`src/lib/reliability/queries/entra-webhook-subscription-health.ts`), que lee el `expirationDateTime`
  persistido y escala con la proximidad del vencimiento.
- **Puente member ↔ M365.** `greenhouse.team_members.azure_oid`.
- **Disciplina de enlace ya establecida en el dominio.** El acceso al test del candidato prohibe componer,
  renderizar o loggear la URL con credencial fuera de su superficie, con gate de fuente
  (`src/views/greenhouse/hiring/assessment-credential-source-gate.test.ts`).
- **Correo transaccional del dominio** con `EmailType` gobernado (`src/lib/email/types.ts:26-35`),
  kill-switch por tipo y dedupe por `source_event_id + source_entity + recipient_email`.

### Gap

- **Cero codigo de calendario.** `grep -rn "getSchedule\|/events\|isOnlineMeeting\|onlineMeeting" src/ services/`
  no devuelve ninguna coincidencia de calendario (las que aparecen son eventos de outbox/webhook de otros
  dominios). No existe adapter, ni tipo, ni tabla, ni endpoint.
- **El permiso `Calendars.ReadWrite` NO esta confirmado.** La unica tabla de permisos escrita en el repo
  declara para la app `Greenhouse` un solo permiso de aplicacion: `User.Read.All`
  (`docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md:419`). No pude confirmar contra el tenant si
  hay mas permisos concedidos. `[verificar]` con
  `az ad app permission list --id $AZURE_AD_CLIENT_ID` y el consent efectivo del service principal antes de
  asumir nada. **Es precondicion dura de Slice 4**, no un detalle de implementacion.
- **El proveedor de login NO pide scopes de Graph ni guarda token de acceso.** `src/lib/auth.ts:253-262`
  configura `AzureADProvider` con `tenantId: 'common'` y `scope: 'openid profile email'`. Es decir: **hoy no
  existe token delegado del entrevistador**, y la opcion «que organice el entrevistador con su propia
  identidad» implica consent nuevo, almacenamiento y refresco de tokens por persona. Esto pesa en la
  pregunta de diseño 1 y no es una linea de codigo.
- **La suscripcion existente esta modelada como una sola.** `findExistingSubscription` busca
  `resource === '/users' && changeType === 'updated'` y `getPersistedSubscriptionId` lee una unica fila
  (`integration_key='entra-graph-webhook'`). Reusar `createOrRenewSubscription` verbatim para una segunda
  suscripcion **la pisaria**. Hay que generalizar el helper a clave de registry por suscripcion antes de
  agregar la de calendario.
- **Staging no puede recibir notificaciones de Graph** por el SSO del custom domain, segun documenta el
  propio `resolveNotificationUrl`. La reconciliacion inbound necesita un plan explicito para staging.
- **No hay vocabulario de cita en el dominio.** El pipeline nombra la etapa `interview`
  (`GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` §3) pero no tiene ningun campo que
  diga cuando ni con quien.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/hiring/interview/** como primitive, src/lib/entra/calendar-events.ts como adapter de Graph, las rutas de src/app/api/hiring/applications/:id/interview/** y src/app/api/webhooks/entra-calendar-change/** como adaptadores HTTP en Vercel, y services/ops-worker para renovacion de suscripcion y reconciliacion async`
- Future candidate home: `domain-package`
- Boundary: `el command/reader de src/lib/hiring/interview/** es el unico primitive; el acceso a Graph pasa por el puerto calendar-port.ts implementado en src/lib/entra/**; consumers autorizados son la ruta HTTP del portal, el consumer reactivo del outbox, Nexa y MCP — ninguno llama a Graph directo`
- Server/browser split: `scheduling-types.ts es browser-safe (DTO y enums, sin imports server-only); command, reader, store, adapter y secretos quedan server-only y jamas cruzan al bundle del navegador`
- Build impact: `sin dependencia nueva: se usa fetch nativo contra Graph igual que el cliente de Entra vigente; sin input de filesystem ni entrypoint global`
- Extraction blocker: `el command escribe la referencia y el evento de outbox en la MISMA transaccion PostgreSQL, y la llamada a Graph ocurre fuera de esa transaccion con reconciliacion posterior; separar el primitive en un servicio propio partiria ese limite transaccional`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `el calendario de Microsoft 365 es la fuente de verdad de la cita (decidido por el operador el 2026-08-22). Greenhouse posee la referencia en greenhouse_hiring.hiring_interview_schedule y su historia append-only`
- Consumidores afectados: `UI del pipeline (TASK-1768), API interna del portal, Nexa via Full API Parity, MCP downstream, consumer reactivo del outbox en ops-worker, correo transaccional al candidato`
- Runtime target: `local, staging, production, worker, external (Microsoft Graph)`

### Contract surface

- Contrato existente a respetar: `src/lib/entra/graph-client.ts` (token de aplicacion),
  `src/lib/entra/webhook-subscription.ts` (suscripcion + persistencia + señal),
  `src/app/api/webhooks/entra-user-change/route.ts` (handshake + clientState),
  `src/lib/api/canonical-error-response.ts` (contrato de error),
  `src/lib/hiring/boundary-domain.test.ts` (allowlist de escritura del dominio).
- Contrato nuevo o modificado: command `scheduleInterview` / `rescheduleInterview` / `cancelInterview`
  (`propose → confirm → execute`), reader `readInterviewSchedule(applicationId)`, eventos de outbox
  `hiring.interview.scheduled` / `.rescheduled` / `.cancelled` / `.reference_drifted`, ruta
  `POST|PATCH|DELETE /api/hiring/applications/[id]/interview`, webhook
  `/api/webhooks/entra-calendar-change`, y generalizacion de `createOrRenewSubscription` a clave de
  registry por suscripcion.
- Backward compatibility: `gated` — todo detras de flag OFF; sin flag el dominio se comporta exactamente
  como hoy y el reader devuelve «sin cita».
- Full API parity: la regla de negocio (quien puede agendar, con que anticipacion, sobre que etapa, con que
  idempotencia) vive en `scheduling-command.ts`. La ruta HTTP valida transporte y delega. Nexa y MCP
  consumen el mismo command con `propose → confirm`; el LLM nunca crea un evento de calendario, solo
  propone y la mutacion ocurre en el endpoint de confirmacion humana.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_interview_schedule` (nueva, aggregate de la
  referencia), `greenhouse_hiring.hiring_interview_schedule_event` (nueva, historia append-only),
  `greenhouse_hiring.hiring_application` (solo lectura del binding), `greenhouse_sync.outbox_events`,
  `greenhouse_sync.integration_registry` (fila nueva para la suscripcion de calendario).
- Invariantes que no se pueden romper:
  - `Una postulacion tiene a lo sumo UNA cita vigente. Reagendar supersede la anterior; la historia es append-only y no se borra.`
  - `La referencia guarda id del evento, iCalUId, joinUrl, inicio/fin CON zona horaria explicita, organizador y estado de sincronizacion. NUNCA guarda el token de Graph ni deriva credencial alguna.`
  - `Un cambio hecho en Outlook actualiza la referencia; Greenhouse NUNCA reescribe el calendario para «corregirlo» hacia su propio estado. Decision del operador del 2026-08-22, ya no es una direccion tentativa.`
  - `El joinUrl no entra en logs, ni en payloads genericos, ni en eventos de outbox, ni en capturas. Misma disciplina que el enlace de assessment.`
  - `La escritura a Graph ocurre FUERA de la transaccion PostgreSQL; el estado intermedio es explicito (pending_provider) y reconciliable, nunca un silencio.`
  - `Agendar NO cambia la etapa de la postulacion ni escribe desenlace. Es un eje de progreso, no una posicion del recorrido.`
- Write-target allowlist: `las dos tablas nuevas (greenhouse_hiring.hiring_interview_schedule y greenhouse_hiring.hiring_interview_schedule_event) se declaran en ALLOWED_WRITE_TARGETS de src/lib/hiring/boundary-domain.test.ts en el MISMO PR de la migracion, con comentario que justifique por que el destino es legitimo. greenhouse_sync.integration_registry NO se agrega al allowlist del dominio hiring: esa escritura vive en src/lib/entra/**, que es su dueño.`
- Tenant/space boundary: `la postulacion deriva opening → space/organizacion; la autorizacion es capability-based sobre el aggregate (hiring.interview.schedule), con binding explicito a applicationId. El organizador debe ser un member interno con azure_oid resoluble.`
- Idempotency/concurrency: `clave de idempotencia (applicationId, intentId) con indice unico parcial sobre citas vigentes; el command es reintentable y un retry devuelve la MISMA cita, nunca crea un segundo evento. Reconciliacion por iCalUId cuando el id local se perdio. Bloqueo optimista por version en la fila de la referencia.`
- Audit/outbox/history: `historia append-only en hiring_interview_schedule_event + eventos de outbox por cada transicion. El correo al candidato es consumer reactivo del outbox en el ops-worker, nunca envio inline desde el route handler.`

### Migration, backfill and rollout

- Migration posture: `additive` — dos tablas nuevas, ningun cambio sobre tablas existentes. Marker
  `-- Up Migration` obligatorio + bloque `DO` con `RAISE EXCEPTION` que aborta si las tablas no quedaron
  creadas (anti pre-up-marker bug).
- Default state: `flag OFF en todos los environments; sin flag no se llama a Graph ni se crea suscripcion.`
- Backfill plan: `sin backfill — no hay citas historicas que importar. Las entrevistas ya acordadas por fuera se quedan por fuera; no se inventa una referencia retroactiva.`
- Rollback path: `flag off (revert inmediato) + revert PR; la migracion es additive y sus tablas quedan vacias e inertes. Si ya se crearon eventos reales en calendarios, el rollback de codigo NO borra esos eventos: la cancelacion es una accion humana explicita, no un efecto del revert.`
- External coordination: `permiso Calendars.ReadWrite de aplicacion + consent de admin en la app de Entra; Application Access Policy de Exchange Online para acotar a que buzones puede escribir la app; notification URL publica para la suscripcion de calendario; sign-off de People Ops sobre la implicancia de privacidad de meter el correo de la candidata en un evento de calendario.`

### Security and access

- Auth/access gate: `session + capability nueva hiring.interview.schedule (registry + grant a >=1 rol real en el MISMO PR, con coverage test). Lectura bajo hiring.application.read con binding a la postulacion. El webhook de calendario valida clientState igual que el de usuarios.`
- Sensitive data posture: `PII — nombre y correo de la persona candidata viajan a un evento de calendario en Exchange. El joinUrl se trata con la disciplina del enlace de assessment.`
- Error contract: `canonicalErrorResponse con codigos nuevos del enum cerrado (por ejemplo interview_organizer_not_linked, interview_calendar_provider_unavailable); NUNCA prosa en ingles ni detalle del error de Graph al cliente. Observabilidad por captureWithDomain(err, 'hr'|'integrations', ...).`
- Abuse/rate-limit posture: `idempotencia por intentId + limite de reagendas por postulacion en una ventana (evita ráfagas de invitaciones a la misma persona); backoff y circuit breaker en el adapter cuando Graph responde 429/503.`

### Runtime evidence

- Local checks: `vitest focal de scheduling-command/reader/store con adapter en doble; boundary-domain.test.ts; capability-grant-coverage.test.ts; test anti-fuga del joinUrl (payloads, logs y eventos de outbox con fila envenenada).`
- DB/runtime checks: `pnpm pg:connect:migrate + verificacion de las dos tablas contra information_schema; ejercitar la query del reader contra PostgreSQL real via proxy (los mocks ejercitan el TS, no el SQL).`
- Integration checks: `probe read-only contra Graph (GET del calendario del organizador) ANTES de cualquier escritura, para confirmar el permiso; primera escritura real contra un buzon de prueba con una direccion de asistente interna, nunca una candidata real; handshake del webhook verificado con el validationToken.`
- Reliability signals/logs: `hiring.interview.schedule_reference_stale (referencia que no refleja el calendario), hiring.interview.provider_write_failure_rate, y la señal existente identity.entra.webhook_subscription_health extendida a la suscripcion de calendario.`
- Production verification sequence: `ver ## Rollout Plan & Risk Matrix → Production verification sequence.`

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers estan nombrados con paths reales.
- [ ] Invariantes de datos, limite de tenant/acceso e idempotencia estan explicitos.
- [ ] Las dos tablas nuevas quedan declaradas con su justificacion en `ALLOWED_WRITE_TARGETS` en el mismo PR.
- [ ] La postura de migracion/backfill/rollback es explicita y proporcional al riesgo.
- [ ] Hay evidencia de runtime o DB para todo cambio que no sea documentacion.
- [ ] El dominio sensible tiene errores canonicos, señales y cero fuga de datos crudos.

## Capability Definition of Done — Full API Parity gate

- [ ] **Logica en el primitive, no en la UI.** Las reglas de agendamiento viven en
      `src/lib/hiring/interview/scheduling-command.ts`.
- [ ] **Modelada como aggregate/command**, no como click-handler: la cita es un aggregate con estados y
      transiciones, no un boton que llama a Graph.
- [ ] **Read** expuesto como reader canonico; **write** como command con semantica explicita, autorizacion
      fina por capability, idempotencia, outbox, errores canonicos y observabilidad.
- [ ] **Capability + grant en el MISMO PR:** `hiring.interview.schedule` en el registry + grant a >=1 rol
      real en `src/lib/entitlements/runtime.ts` + coverage test verde.
- [ ] **Camino programatico declarado:** ruta interna del portal ahora; exposicion MCP/ecosystem declarada
      como follow-up explicito si no entra en esta task.
- [ ] **Write apto para `propose → confirm → execute`**: el preview muestra fecha, hora, zona horaria,
      organizador y destinatarios ANTES de crear nada; el LLM nunca escribe.
- [ ] **Un primitive, muchos consumers**: cero logica duplicada entre UI, Nexa, MCP y el consumer reactivo.
- [ ] **Parity check = SI.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ADR de fuente de verdad y contrato del dominio (sin runtime)

- `docs/architecture/GREENHOUSE_HIRING_INTERVIEW_SCHEDULING_DECISION_V1.md`: **registra** la decision ya
  tomada por el operador el 2026-08-22 —el calendario manda, Greenhouse solo referencia— con la Opcion B
  documentada como descartada y su consecuencia, para que nadie la reabra por instinto; y **resuelve OQ-2**
  (quien organiza) con las consecuencias de cada opcion. Fija las reglas duras del dominio.
- `scheduling-types.ts` browser-safe: estados de la cita, DTO de la referencia, enum de causas de fallo.
- `calendar-port.ts`: puerto provider-neutral (`createEvent`, `updateEvent`, `cancelEvent`,
  `getEvent`) sin ninguna mencion a Graph en la firma.
- Entrada en `DECISIONS_INDEX.md`.
- **Sin codigo de escritura, sin migracion, sin llamada externa.**

### Slice 2 — Precondicion de permisos, verificada y acotada (read-only)

- Auditar el estado real de la app de Entra: `az ad app permission list --id $AZURE_AD_CLIENT_ID` y consent
  efectivo del service principal. Registrar el resultado en el ADR.
- Si falta `Calendars.ReadWrite` de aplicacion: solicitarlo con consent de admin **junto con** la
  Application Access Policy de Exchange Online que restringe a que buzones puede escribir la app. Sin esa
  politica, un permiso de aplicacion de calendario alcanza **todos los buzones del tenant**.
- Probe read-only contra un buzon de prueba (`GET /users/{oid}/calendar`) que confirme el permiso sin
  escribir nada. Script bajo `scripts/hiring/` con scope explicito.
- Documentar el resultado como precondicion cumplida o como bloqueo.

### Slice 3 — Aggregate durable de la cita + reader (sin Graph)

- Migracion additive: `hiring_interview_schedule` + `hiring_interview_schedule_event`, con marker
  `-- Up Migration`, bloque `DO` de verificacion post-DDL y GRANTs.
- `scheduling-store.ts` + `scheduling-reader.ts`: leer la cita vigente de una postulacion y su historia.
- Declarar las dos tablas en `ALLOWED_WRITE_TARGETS` del boundary del dominio.
- `readInterviewSchedule` degrada limpio cuando no hay cita (para que `TASK-1768` pueda consumirlo).
- Regenerar tipos (`pnpm db:generate-types`).

### Slice 4 — Command de agendamiento y adapter Graph (BLOQUEADO por OQ-2 y Slice 2)

- `src/lib/entra/calendar-events.ts`: implementacion del puerto con
  `POST /users/{organizerId}/events`, `isOnlineMeeting: true`, `onlineMeetingProvider: 'teamsForBusiness'`,
  `start`/`end` con `timeZone` explicito; lee `onlineMeeting.joinUrl`, `id` e `iCalUId` de la respuesta.
- `scheduling-command.ts`: `propose` (preview sin efectos) → `confirm` (transaccion PostgreSQL: referencia
  en `pending_provider` + evento de outbox) → llamada a Graph → transicion a `confirmed` o a
  `provider_failed` con causa. Idempotente por `(applicationId, intentId)`.
- Ruta `POST /api/hiring/applications/[id]/interview` como adaptador delgado.
- Capability `hiring.interview.schedule` + grant + coverage test.
- Flag `HIRING_INTERVIEW_SCHEDULING_ENABLED`, default OFF, con fila en el ledger.

### Slice 5 — Reconciliacion inbound: el calendario avisa, Greenhouse obedece

- Generalizar `createOrRenewSubscription` a **clave de registry por suscripcion** (hoy asume una sola y
  pisaria la de usuarios).
- Suscripcion sobre el calendario del organizador (`/users/{id}/events`), con `changeType` de actualizacion
  y borrado, renovada por el cron existente.
- `/api/webhooks/entra-calendar-change`: handshake del `validationToken`, validacion de `clientState`,
  y actualizacion de la referencia (nueva hora, cancelacion) con historia append-only.
- Señal `hiring.interview.schedule_reference_stale` + extension de
  `identity.entra.webhook_subscription_health` a la suscripcion nueva.
- Plan explicito para staging, donde Graph **no puede** alcanzar el custom domain con SSO.
- Flag `HIRING_INTERVIEW_CALENDAR_SUBSCRIPTION_ENABLED`, default OFF, con fila en el ledger.

### Slice 6 — Reagenda/cancelacion desde Greenhouse, retencion y cierre del ciclo

- `rescheduleInterview` / `cancelInterview`: superseden la cita vigente y actualizan el evento en el
  calendario, con la misma idempotencia y la misma historia.
- Comportamiento al cerrar el proceso (`stage = 'closed'`): que pasa con una cita futura y con la
  referencia. Resuelve **OQ-4**.
- Documentacion triple: tecnica (ADR y spec), funcional (`docs/documentation/hr/`) y manual de uso
  (`docs/manual-de-uso/hr/`).
- Follow-up declarado de exposicion MCP/ecosystem si no entra aca.

## Out of Scope

- **Proponer horarios con disponibilidad libre/ocupado.** `POST /users/{id}/calendar/getSchedule` y toda la
  propuesta de horarios son de **`TASK-1770`**
  (`docs/tasks/to-do/TASK-1770-hiring-interview-availability-proposal.md`). No es «no lo hacemos»: es de otra
  task, que **consume** el agendamiento que esta construye. Aca el operador elige la hora y el sistema la
  materializa.
- **Entrevistas grupales o de panel.** El v1 modela un organizador y la persona candidata. Multiples
  entrevistadores como asistentes se evalua despues; el aggregate no se diseña para excluirlo, pero el
  command no lo expone.
- **El scorecard como instrumento.** Ya existe (`method: 'interviewer_scorecard'`,
  `src/types/hiring-assessment.ts:24`, `src/lib/hiring/assessment/instances.ts:418-446`). Esta task NO lo
  toca ni redefine.
- **Hacer visible el progreso en la tarjeta del pipeline.** Es de `TASK-1768`. Aca solo se entrega el reader
  que esa task puede consumir.
- **Grabacion, transcripcion o analisis de la entrevista.** Fuera de alcance, y ademas territorio de alto
  riesgo bajo AI Act (reconocimiento de emociones en entrevistas esta prohibido).
- **Cambiar el enum de etapas o de desenlaces.** La cita es un eje de progreso, no una etapa.
- **Sincronizacion bidireccional de calendarios completos.** Solo la cita de esta postulacion.
- **Recordatorios propios de Greenhouse.** Los recordatorios los da el calendario.

## Detailed Spec

### 1. La llamada, exactamente

Una sola llamada crea la cita **y** el enlace de Teams. No hay una API de Teams aparte:

```http
POST https://graph.microsoft.com/v1.0/users/{organizerId}/events
Authorization: Bearer {token de aplicacion}
Content-Type: application/json

{
  "subject": "Entrevista — <cargo>",
  "start": { "dateTime": "2026-09-02T15:00:00", "timeZone": "America/Santiago" },
  "end":   { "dateTime": "2026-09-02T15:45:00", "timeZone": "America/Santiago" },
  "attendees": [
    { "emailAddress": { "address": "<correo candidata>", "name": "<nombre>" }, "type": "required" }
  ],
  "isOnlineMeeting": true,
  "onlineMeetingProvider": "teamsForBusiness"
}
```

La respuesta trae `id`, `iCalUId`, `webLink` y `onlineMeeting.joinUrl`. Eso es todo el enlace de Teams.

El adapter vive en `src/lib/entra/calendar-events.ts` y **reusa el token** de
`src/lib/entra/graph-client.ts` (client credentials, scope `.default`). No se crea un cliente nuevo.

### 2. Quien es dueño del calendario — DECIDIDO (2026-08-22, operador)

> **Decision vigente:** **Opcion A**. Greenhouse agenda, pero **NO es dueño del calendario**. El calendario
> manda. Decidida por el operador el 2026-08-22. Ya **no** bloquea el Slice 4.
>
> **Razon:** es coherente con la regla que el repo ya tiene escrita —el correo y el calendario laboral de
> Efeonce y sus clientes viven en Outlook/Microsoft 365 y Greenhouse no los sustituye— y evita la
> sincronizacion bidireccional con resolucion de conflictos que exige la alternativa.

Las dos opciones quedan documentadas abajo con su consecuencia: la elegida para que su costo sea explicito,
y la descartada para que nadie la reabra por instinto.

**Opcion A — Greenhouse agenda, pero NO es dueño del calendario. DECISION VIGENTE.**

Greenhouse crea el evento y guarda una **referencia**: `event_id`, `iCalUId`, `joinUrl`, inicio/fin con zona,
organizador, asistentes. **El calendario manda.** Si alguien reagenda o cancela desde Outlook, Greenhouse se
entera por change notification y actualiza su referencia — nunca al reves.

- *Consecuencia buena:* no hay sincronizacion bidireccional ni resolucion de conflictos. El estado divergente
  tiene una sola direccion valida de correccion, y eso hace que la señal de drift sea accionable en vez de
  ambigua.
- *Consecuencia buena:* es coherente con la regla que el repo ya tiene escrita — el correo y el calendario
  laboral de Efeonce viven en Outlook/Microsoft 365 y Greenhouse no los sustituye.
- *Consecuencia mala:* Greenhouse puede quedar temporalmente desactualizado (la ventana entre el cambio en
  Outlook y la llegada de la notificacion). Y si la suscripcion expira, queda desactualizado **sin avisar**
  — por eso la señal de referencia obsoleta no es opcional, es parte del diseño.
- *Consecuencia mala:* una regla de negocio que dependa de la hora exacta de la entrevista (por ejemplo, un
  SLA de scorecard a las 24h) opera sobre un dato que puede estar atrasado.

**Opcion B — Greenhouse es la fuente de verdad de la cita. DESCARTADA (2026-08-22).**

La hora canonica vive en Greenhouse y el calendario es una proyeccion. Un cambio en Outlook es un **drift**
que hay que resolver: o se reescribe el calendario para volver al estado de Greenhouse, o se acepta el
cambio y se actualiza Greenhouse.

- *Consecuencia buena:* toda regla de negocio lee un dato autoritativo y siempre coherente.
- *Consecuencia mala:* exige **sincronizacion bidireccional y resolucion de conflictos**, que es el problema
  dificil de esta clase de integracion. Dos personas moviendo la misma reunion desde Outlook y desde el
  portal necesitan una politica de ganador escrita, probada y explicable.
- *Consecuencia mala:* pisa el habito real del equipo. Reagendar desde Outlook es el gesto natural, y un
  sistema que lo revierte se percibe como roto aunque el codigo este correcto.
- *Consecuencia mala:* contradice la regla vigente del repo sobre quien es dueño del calendario laboral.

**Cierre.** El operador eligio la Opcion A el 2026-08-22. La Opcion B queda descartada y **no se reabre
salvo** que aparezca una regla de negocio que no pueda tolerar un dato atrasado; hoy no existe, y reabrirla
tendria el costo completo que su bloque describe. Lo que la decision **no** resuelve, y sigue siendo la regla
de orden critica: la reconciliacion inbound (Slice 5) debe estar en produccion **antes** de encender el flag
de escritura. Con la Opcion A, si la referencia no se actualiza sola, Greenhouse afirma con confianza una
hora falsa — la decision de hoy hace esa regla **mas** importante, no menos.

### 3. Preguntas de diseño abiertas, con su consecuencia

**P1 — ¿Quien organiza?** (OQ-2, bloquea Slice 4)

| Opcion | Como se autentica | Consecuencia |
|---|---|---|
| **El entrevistador** | Token **delegado** de esa persona | La reunion es suya: aparece en su calendario como organizador, reagendar desde Outlook funciona natural y la candidata recibe la invitacion de una persona. **Costo real:** hoy no existe token delegado — `src/lib/auth.ts:253-262` pide solo `openid profile email`. Habria que pedir consent adicional, almacenar y refrescar tokens por persona, y manejar el caso «el entrevistador no ha iniciado sesion nunca». |
| **Casilla de servicio** | Permiso de **aplicacion** (ya es el modo del cliente actual) | Funciona sin token de usuario y sin consent por persona. **Costo real:** la reunion «viene de un robot»; el entrevistador queda como asistente y no como organizador, y reagendar desde su Outlook puede no estar permitido segun la configuracion del evento. Ademas, el permiso de aplicacion alcanza **todos los buzones del tenant** salvo que se acote con Application Access Policy de Exchange Online. |

Hay una tercera forma que conviene evaluar en el Plan Mode: permiso de aplicacion **escribiendo en el
calendario del entrevistador** (organizador = el entrevistador, actor = la app). Da la experiencia de la
primera opcion con la autenticacion de la segunda, y es la que mejor calza con lo que el repo ya tiene.
`[verificar]` el comportamiento exacto de reagenda por parte del dueño del buzon en ese modo.

**P2 — La candidata es externa.** No tiene cuenta M365. Recibe la invitacion por correo y entra a Teams
**como invitada**. Consecuencias que la implementacion debe declarar:

- El `joinUrl` **viaja por email**. No es una credencial en sentido estricto, pero con ingreso anonimo
  habilitado deja entrar a cualquiera que lo tenga. Cae bajo **la misma disciplina que el enlace de
  assessment**: no se loggea, no se expone en payloads genericos, no se renderiza fuera de su superficie.
  Mitigacion adicional: configurar la sala de espera para que un enlace filtrado no de entrada sin que
  alguien admita.
- **Meter el correo de la candidata en un evento de calendario tiene implicancia de privacidad**: ese dato
  sale del perimetro de retencion de Greenhouse y queda en Exchange, donde la purga del dominio hiring
  **no llega**. Hay que declararlo en el aviso de privacidad del proceso y decidir que pasa al cerrar (OQ-4).
- El asunto y el cuerpo del evento son visibles para todos los asistentes: no pueden contener notas
  internas, scores ni el identificador interno del desenlace.

**P3 — Reprogramacion y cancelacion.** Que pasa en cada direccion:

| Origen | Comportamiento (Opcion A, decision vigente) | Que detecta el problema |
|---|---|---|
| Reagenda desde Outlook | La change notification actualiza la referencia; historia append-only con la hora anterior | Si la notificacion no llega, `hiring.interview.schedule_reference_stale` compara la referencia contra el evento real y alerta |
| Cancelacion desde Outlook | La referencia pasa a `cancelled_externally`; **no** se reescribe el calendario | Misma señal |
| Reagenda desde Greenhouse | El command actualiza el evento y supersede la cita vigente | Fallo del proveedor deja la fila en `provider_failed` con causa legible, nunca en silencio |
| Cancelacion desde Greenhouse | Cancela el evento y supersede la referencia | Igual |
| El organizador deja la empresa / su buzon se deshabilita | La referencia queda huerfana | Señal + accion humana: reasignar organizador o cancelar |

La señal de obsolescencia se calcula comparando la referencia contra el evento real (lectura periodica
acotada a citas futuras), no confiando en que la notificacion siempre llego. Es el mismo aprendizaje que ya
esta escrito para los observers async: **la frescura del output no prueba la liveness del canal**.

**P4 — Consentimiento y retencion.** (OQ-4)

- Cuanto vive la referencia despues de que el proceso cierra, y bajo que reloj de retencion del dominio.
- Que pasa con una **cita futura** cuando el proceso se cierra: cancelarla es lo humano, pero es una accion
  con efecto externo (manda un correo de cancelacion) y por lo tanto no puede ser un efecto colateral
  silencioso de cerrar una tarjeta.
- Que pasa con el evento en Exchange cuando se purga la postulacion en Greenhouse. La purga del dominio no
  alcanza Exchange: o se cancela/borra el evento explicitamente como parte del cierre, o se declara por
  escrito que el rastro queda en el calendario del organizador.
- El aviso de privacidad del proceso de seleccion debe decir que se creara una reunion con su correo.

### 4. Idempotencia — el detalle que evita mandar dos invitaciones

El command recibe un `intentId` del cliente. La fila de la referencia tiene indice unico parcial sobre
`(application_id)` para citas vigentes y unico sobre `(application_id, intent_id)`. Secuencia:

1. Transaccion PostgreSQL: inserta la referencia en `pending_provider` + evento de outbox. Commit.
2. Llamada a Graph **fuera** de la transaccion.
3. Exito: `UPDATE` a `confirmed` con `event_id`, `iCalUId`, `joinUrl`.
4. Fallo: `UPDATE` a `provider_failed` con causa del enum.
5. Un retry con el mismo `intentId` no crea nada nuevo: si la fila esta `pending_provider`, reconcilia
   buscando por `iCalUId`/`transactionId` antes de reintentar la creacion. `[verificar]` el soporte exacto de
   `transactionId` en `POST /events` como clave de deduplicacion del lado de Graph.

Un `pending_provider` que lleva mas de N minutos es exactamente lo que la señal de fallo del proveedor tiene
que ver.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `Slice 1 (ADR) → Slice 2 (permisos) → Slice 3 (aggregate) → Slice 4 (escritura) → Slice 5 (reconciliacion) → Slice 6 (reagenda/retencion)`
- **Slice 4 NO se ejecuta** mientras OQ-2 (organizador) no este confirmada por el operador **y** Slice 2 no
  haya verificado el permiso. La fuente de verdad ya **no** bloquea: quedo decidida el 2026-08-22. Escribir
  en el calendario de una persona real con un modelo de permisos no verificado es irreversible en la
  percepcion aunque el evento se borre.
- **Slice 5 debe estar en produccion ANTES de encender el flag de Slice 4 en produccion.** Sin
  reconciliacion inbound, la primera reagenda hecha en Outlook convierte a Greenhouse en un sistema que
  afirma con confianza una hora falsa. Es peor que no tener el dato. **La decision de fuente de verdad del
  2026-08-22 NO relaja esta regla: la endurece.** Al aceptar que el calendario manda, la unica forma que
  tiene Greenhouse de no mentir es enterarse del cambio, y enterarse ES el Slice 5.
- Slice 3 puede correr en paralelo con Slice 2 (uno es DB, el otro es Azure), pero ambos cierran antes de
  Slice 4.
- Slice 6 depende de Slice 5: no se puede cancelar coherentemente lo que no se sabe si sigue existiendo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `Calendars.ReadWrite` de aplicacion concede acceso de escritura a **todos** los buzones del tenant | identity | high | Application Access Policy de Exchange Online acotando a un grupo de buzones autorizados, aplicada ANTES del primer write; capability propia; flag OFF por defecto | auditoria de permisos de la app (`az ad app permission list`) al cierre y en cada rotacion; `pnpm auth:audit-azure-app` como auditor de drift de la app |
| Doble creacion del evento por retry → **dos invitaciones a la misma candidata** | integration | medium | `intentId` + indice unico parcial + reconciliacion por `iCalUId` antes de reintentar; la llamada externa nunca se reintenta a ciegas | `hiring.interview.provider_write_failure_rate` + filas en `pending_provider` con edad > 10 min |
| Invitacion enviada por error (proceso equivocado, persona equivocada, hora equivocada) | hr | medium | `propose → confirm` con preview que muestra nombre, correo, fecha, hora y zona antes de crear; sin auto-agendar por cambio de etapa; capability propia y no admin-coarse | evento de outbox `hiring.interview.cancelled` con causa `operator_error` visible en la historia append-only |
| Suscripcion de change notification expirada → referencia obsoleta **en silencio** | cron | high | Renovacion en el cron existente `ops-entra-webhook-renew` + `expirationDateTime` persistido + verificacion periodica de citas futuras contra el calendario real | `identity.entra.webhook_subscription_health` extendida + `hiring.interview.schedule_reference_stale` (steady 0) |
| Staging no puede recibir notificaciones de Graph (SSO en el custom domain) | integration | high | Declarar staging como reconciliacion por lectura periodica, o publicar una URL sin SSO para el endpoint; nunca asumir que lo verificado en staging cubre el canal inbound | ausencia de notificaciones en staging es esperada y documentada; la señal de drift diferencia environment |
| `joinUrl` filtrado en log, payload generico o captura → entrada al meeting | ui | medium | Misma disciplina del enlace de assessment: gate de fuente + tests anti-fuga con fila envenenada + sala de espera configurada | test anti-fuga en CI; revision de payloads del reader |
| El correo de la candidata sale del perimetro de retencion de Greenhouse hacia Exchange | identity | high | Declararlo en el aviso de privacidad; decidir en OQ-4 si el cierre del proceso cancela/borra el evento; documentar que la purga del dominio **no** alcanza Exchange | revision de retencion al cierre del proceso; sin señal automatica, es control documental y humano |
| Organizador se va de la empresa o su buzon se deshabilita → evento huerfano | identity | medium | Al desactivar un member con citas futuras, exigir reasignacion o cancelacion explicita | `hiring.interview.schedule_reference_stale` detecta el evento inaccesible |
| Zona horaria mal declarada → la entrevista queda a la hora equivocada | hr | medium | `timeZone` explicito `America/Santiago` desde el calendario operativo canonico en `start` y `end`; nunca la zona del proceso Node; test de contrato sobre el payload | reclamo humano; test de contrato en CI para evitar que llegue ahi |
| Graph responde 429/503 en ráfaga (cierre de cohorte, varias citas seguidas) | integration | low | Backoff exponencial + circuit breaker en el adapter; la escritura queda `pending_provider` y se reconcilia, no se pierde | `hiring.interview.provider_write_failure_rate` |

### Feature flags / cutover

- **`HIRING_INTERVIEW_SCHEDULING_ENABLED`** — default `false`. Gatea el command de escritura y el adapter de
  Graph. Sin el, el reader responde «sin cita» y el dominio se comporta como hoy.
  **Multi-runtime:** se lee en el runtime Next.js de Vercel (el operador agenda desde el portal) **y** en el
  `ops-worker` si el consumer reactivo del outbox manda el correo de la cita. Antes de prenderlo hay que
  mapear donde se lee (`grep -rn "HIRING_INTERVIEW_SCHEDULING_ENABLED" src/ services/`) y aplicarlo en
  **todos**: en Cloud Run el SoT es `services/ops-worker/deploy.sh` (que usa `--set-env-vars` destructivo)
  **y ademas** `gcloud run services update ... --update-env-vars` para efecto inmediato. Fila obligatoria en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime declarado.
- **`HIRING_INTERVIEW_CALENDAR_SUBSCRIPTION_ENABLED`** — default `false`. Gatea la creacion/renovacion de la
  suscripcion de calendario. Se lee en el `ops-worker` (es el cron quien renueva). Misma disciplina de
  ledger y de `deploy.sh`.
- Cutover: prender primero la suscripcion (Slice 5) y verificar que llegan notificaciones; recien despues
  prender la escritura (Slice 4).
- Revert: flag a `false` + redeploy del runtime correspondiente. Menos de 5 minutos en Vercel; en Cloud Run,
  el tiempo de una revision nueva.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (documentacion) | minutos | si |
| Slice 2 | revocar el permiso concedido en la app de Entra y quitar la Application Access Policy; el probe es read-only y no deja estado | minutos | si |
| Slice 3 | revert PR; la migracion es additive y las tablas quedan vacias. Down migration disponible (`DROP TABLE`) pero innecesaria si nadie escribio | minutos | si |
| Slice 4 | `HIRING_INTERVIEW_SCHEDULING_ENABLED=false` + redeploy. **Atencion: el revert de codigo NO borra los eventos ya creados en calendarios reales** — cancelarlos es una accion humana explicita y deja rastro en el calendario de los asistentes | menos de 5 min el flag; la limpieza de eventos es manual | parcial |
| Slice 5 | `HIRING_INTERVIEW_CALENDAR_SUBSCRIPTION_ENABLED=false` + borrar la suscripcion en Graph + marcar `active=false` la fila de `integration_registry`. La referencia deja de actualizarse: la señal de obsolescencia debe quedar encendida para que el estado degradado sea visible | menos de 15 min | si |
| Slice 6 | revert PR; las citas ya canceladas no se «descancelan» | minutos el codigo; los efectos externos no se revierten | parcial |

### Production verification sequence

1. Slice 2 en Azure: confirmar permiso y Application Access Policy; ejecutar el probe read-only contra un
   buzon de prueba y verificar `200`. **Stop si el permiso no esta concedido con consent de admin.**
2. `pnpm migrate:up` en staging + verificar contra `information_schema` que las dos tablas existen con sus
   indices unicos.
3. Deploy a staging con ambos flags en `false` + verificar que el pipeline se comporta exactamente igual que
   antes y que el reader devuelve «sin cita» sin romper.
4. Staging con `HIRING_INTERVIEW_SCHEDULING_ENABLED=true`: agendar una cita de prueba con **un asistente
   interno**, nunca una candidata real. Verificar en Outlook que el evento existe, que trae enlace de Teams
   y que la hora es la correcta en `America/Santiago`.
5. Staging: reintentar el mismo `intentId` y verificar que **no** se crea un segundo evento.
6. Staging: verificar el handshake del webhook (`validationToken`) y, con el plan declarado para staging,
   ejercitar la reconciliacion (por notificacion si hay URL publica, por lectura periodica si no).
7. Reagendar el evento de prueba desde Outlook y verificar que la referencia se actualiza; luego cancelarlo
   y verificar la transicion.
8. Repetir 2-7 en produccion con al menos 24h de enfriamiento, empezando por la suscripcion (Slice 5) y
   recien despues la escritura (Slice 4).
9. Primera cita real: con una persona candidata, coordinada con People Ops, y con alguien mirando el
   resultado en el calendario antes de que la invitacion sea el unico aviso que ella recibe.
10. Monitorear las tres señales durante 7 dias post-produccion.

### Out-of-band coordination required

- **Azure App Registration:** agregar el permiso de aplicacion `Calendars.ReadWrite` y obtener consent de
  admin. Coordinar con `TASK-1761`, que tambien toca la app de Entra, para no pedir consent dos veces.
- **Exchange Online:** crear la Application Access Policy que restringe a que buzones puede escribir la app.
  Sin ella, el permiso alcanza todo el tenant. `[verificar]` el cmdlet y el grupo de buzones aplicable.
- **Decision del operador:** OQ-2 (organizador). Bloquea el Slice 4. La fuente de verdad ya quedo decidida
  el 2026-08-22 y no requiere coordinacion adicional.
- **People Ops:** sign-off sobre la implicancia de privacidad de incluir el correo de la persona candidata
  en un evento de calendario, y sobre el texto del aviso de privacidad del proceso.
- **Infra/Vercel:** si se decide habilitar la reconciliacion inbound en staging, publicar una URL alcanzable
  por Graph sin SSO para el endpoint del webhook.
- **Configuracion de Teams:** politica de sala de espera para reuniones con invitados externos, para que un
  `joinUrl` filtrado no de entrada sin que alguien admita.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `docs/architecture/GREENHOUSE_HIRING_INTERVIEW_SCHEDULING_DECISION_V1.md` que **registra** la
      decision del 2026-08-22 (el calendario manda, Greenhouse referencia) con la Opcion B explicitamente
      descartada y su consecuencia, **resuelve OQ-2**, y tiene entrada en `DECISIONS_INDEX.md`.
- [ ] El estado real de los permisos de la app de Entra quedo auditado y registrado; si falta
      `Calendars.ReadWrite`, quedo concedido con consent de admin **y** acotado por Application Access Policy.
- [ ] Un operador con `hiring.interview.schedule` agenda una entrevista desde el contrato canonico y el
      evento aparece en el calendario real con enlace de Teams valido.
- [ ] La referencia guarda `event_id`, `iCalUId`, `joinUrl`, inicio/fin con zona horaria explicita,
      organizador y estado; la historia es append-only.
- [ ] Reintentar el mismo `intentId` **no** crea un segundo evento ni manda una segunda invitacion.
- [ ] Reagendar o cancelar desde Outlook actualiza la referencia; Greenhouse no reescribe el calendario.
- [ ] Una referencia obsoleta enciende `hiring.interview.schedule_reference_stale`.
- [ ] El `joinUrl` no aparece en logs, ni en payloads genericos, ni en eventos de outbox: hay test anti-fuga
      con fila envenenada.
- [ ] Las dos tablas nuevas estan en `ALLOWED_WRITE_TARGETS` de `src/lib/hiring/boundary-domain.test.ts`.
- [ ] La capability nueva tiene registry + grant a >=1 rol real + `capability-grant-coverage.test.ts` verde.
- [ ] Los dos flags tienen fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su runtime declarado.
- [ ] Agendar **no** cambia la etapa ni escribe desenlace de la postulacion.
- [ ] Las tres capas documentales existen: tecnica, funcional y manual de uso.
- [ ] `TASK-1768` puede consumir el reader y degradar limpio cuando no hay cita.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm vitest run src/lib/hiring` (incluye `boundary-domain.test.ts`)
- `pnpm vitest run src/lib/entitlements/capability-grant-coverage.test.ts`
- `pnpm migrate:status` + verificacion contra `information_schema` de las dos tablas nuevas
- Ejercicio real del reader contra PostgreSQL via `pnpm pg:connect` (los mocks no ejercitan el SQL)
- Probe read-only contra Microsoft Graph antes de cualquier escritura
- `pnpm docs:closure-check`
- `pnpm build` solo como gate final de cierre, con autorizacion del operador

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado
- [ ] `changelog.md` quedo actualizado
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1768` quedo notificada con nota delta de que el eje de agendamiento ya existe y como consumirlo
- [ ] el estado de los permisos de Graph quedo escrito en
      `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` (tabla de permisos), que hoy declara solo
      `User.Read.All`

## Follow-ups

- Disponibilidad libre/ocupado y propuesta de horarios: **ya tiene ID propio, `TASK-1770`**. No es follow-up
  difuso; es una task que espera a que esta cierre.
- Entrevistas de panel: varios entrevistadores como asistentes y un scorecard por cada uno.
- Exposicion MCP/ecosystem del command si no entra en el alcance de esta task.
- Recordatorio propio al candidato 24h antes, si se demuestra que el recordatorio del calendario no basta
  para personas externas sin cuenta M365.
- Metrica de velocidad del pipeline apoyada en la cita real en vez de en movimientos de tarjeta.

## Open Questions

- **OQ-1 — RESUELTA el 2026-08-22 por el operador. ¿Quien es dueño del calendario?** **Opcion A: el
  calendario manda.** Greenhouse agenda, crea el evento y guarda una referencia (`event_id`, `joinUrl`,
  cuando, organizador), pero **no** es dueño del calendario: si alguien reagenda o cancela desde Outlook,
  Greenhouse se entera por change notification y actualiza su referencia, **nunca al reves**. Razon:
  coherencia con la regla ya escrita del repo sobre Outlook/M365 como fuente de verdad del calendario
  laboral, y evitar la sincronizacion bidireccional con resolucion de conflictos. **La Opcion B (Greenhouse
  como fuente de verdad) queda descartada**, documentada en `Detailed Spec §2` con su consecuencia para que
  no se reabra por instinto. **Deja de bloquear el Slice 4.** No relaja la regla de orden que exige el
  Slice 5 en produccion antes del flag de escritura — la endurece.
- **OQ-2 (bloqueante del Slice 4) — ¿Quien organiza?** El entrevistador con identidad delegada (natural,
  pero hoy no hay token delegado: el login pide solo `openid profile email`) o una casilla de servicio con
  permiso de aplicacion (funciona ya, pero la reunion «viene de un robot»). Evaluar tambien la tercera forma:
  permiso de aplicacion escribiendo en el calendario del entrevistador.
- **OQ-3 — ¿La cita puede existir fuera de la etapa `interview`?** Agendar antes de mover la tarjeta es un
  gesto natural; permitirlo evita forzar un cambio de etapa artificial, pero desacopla el dato de la etapa
  que lo justifica.
- **OQ-4 — Consentimiento y retencion.** Cuanto vive la referencia despues del cierre; que pasa con una cita
  futura cuando el proceso se cierra; si el cierre cancela el evento en Exchange o se declara por escrito que
  el rastro queda fuera del alcance de la purga del dominio.
- **OQ-5 — ¿La reconciliacion inbound se habilita en staging?** Graph no alcanza el custom domain con SSO.
  O se publica una URL sin SSO, o staging se valida por lectura periodica y se declara la diferencia.
