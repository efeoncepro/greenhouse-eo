# TASK-1770 — Proponer horarios de entrevista: disponibilidad real del entrevistador, no adivinanza

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-011`
- Status real: `Diseno — cero codigo de disponibilidad en el repo (grep de getSchedule/freeBusy/findMeetingTimes/scheduleInformation sobre src, services y scripts: cero coincidencias, 2026-08-22). El cliente de Graph existe y se reusa; el calendario operativo existe pero es de granularidad DIA, sin banda horaria. El permiso de calendario en la app de Entra sigue sin confirmar`
- ADR: `docs/architecture/GREENHOUSE_HIRING_INTERVIEW_SCHEDULING_DECISION_V1.md` (lo crea TASK-1769 Slice 1; esta task le agrega la seccion de disponibilidad, no abre ADR propio)
- Rank: `TBD`
- Domain: `hr|identity`
- Blocked by: `TASK-1769`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`TASK-1769` deja a Greenhouse capaz de **materializar** una entrevista: crea el evento en el calendario real
y devuelve el enlace de Teams. Pero la hora se la sigue inventando el operador. Esta task instala el motor
que **lee la disponibilidad real** del o los entrevistadores (`POST /users/{id}/calendar/getSchedule` de
Microsoft Graph), la cruza con el calendario operativo de Greenhouse (dia habil, feriado chileno) y una banda
horaria declarada, y **propone bloques concretos** que el operador confirma. El resultado es un reader
canonico: cero escritura, cero tabla nueva, cero evento de outbox.

## Why This Task Exists

Agendar hoy es un ping-pong: alguien propone tres horas por correo, el entrevistador dice que dos no le
sirven, se repite. `TASK-1769` no lo arregla — automatiza el ultimo paso (crear el evento) y deja intacto el
primero (adivinar la hora). La consecuencia no es solo friccion:

1. **La propuesta se hace a ciegas.** Quien agenda no ve la agenda del entrevistador, asi que propone sobre
   una suposicion. Cada choque cuesta un ciclo de correo con una persona candidata que esta evaluando a
   Efeonce mientras espera.
2. **El error de horario es asimetrico.** Una vacante remota de Efeonce es elegible en **20 paises** —
   AR BO BR CL CO CR DO EC SV GT HN MX NI PA PY PE UY VE + US + ES, aprobados por el CEO el 2026-08-17
   (`docs/tasks/complete/TASK-1740-public-vacancy-jobposting-foundation.md:56`). Eso abarca de UTC-6 a UTC+2:
   un bloque a las 09:00 de Santiago es de madrugada en Mexico y ya de tarde en Espana. La zona horaria no es
   un detalle de formato, es parte de la propuesta.
3. **El feriado es el error obvio y nadie lo esta chequeando.** Greenhouse ya sabe que el 18 de septiembre no
   es dia habil (`src/lib/calendar/operational-calendar.ts` + `nager-date-holidays.ts`), pero ese
   conocimiento no llega a ninguna superficie de agendamiento porque no existe ninguna.
4. **`TASK-1769` declaro esto explicitamente fuera de su v1** (`## Out of Scope`, y como primer follow-up).
   Sale de ahi por decision del operador del 2026-08-22: proponer horarios es util y necesario, y merece ID
   propio en vez de engordar una task que ya es de esfuerzo alto.

## Goal

- Que Greenhouse pueda responder «estos bloques sirven» con **disponibilidad real** del entrevistador, no con
  una suposicion del operador.
- Que la propuesta respete el calendario operativo canonico: dia habil, feriado chileno, banda horaria
  declarada — y que **falle en voz alta** en vez de proponer una entrevista un 18 de septiembre.
- Que cada bloque propuesto viaje con **instante absoluto y zona IANA explicita**, para que ningun consumer
  tenga que adivinar la hora local de una persona que puede estar en cualquiera de 20 paises.
- Que la disponibilidad de personas del equipo se lea como **libre/ocupado agregado y nada mas**: el asunto y
  el lugar de las reuniones ajenas nunca entran al dominio, ni a un log, ni a un payload.
- Que la capability nazca con contrato programatico gobernado (Full API Parity): un reader canonico que la
  UI, Nexa y MCP consuman por construccion, sin logica duplicada por consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Acceso al test del candidato — la disciplina
  de lo que puede y no puede salir hacia afuera; §Elegibilidad remota por pais)
- `docs/architecture/GREENHOUSE_HIRING_INTERVIEW_SCHEDULING_DECISION_V1.md` (ADR que crea `TASK-1769`; esta
  task le agrega la seccion de disponibilidad)
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` (apps de Entra y su tabla de permisos)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md` (anti silent-catch en readers canonicos)

Reglas obligatorias:

- **NUNCA** instanciar un cliente HTTP o SDK de Graph nuevo dentro del dominio hiring. El token de aplicacion
  se resuelve donde ya se resuelve (`src/lib/entra/graph-client.ts:53-95`); el dominio consume el **puerto**
  que `TASK-1769` define en `src/lib/hiring/interview/calendar-port.ts`, no `fetch` contra
  `graph.microsoft.com`.
- **NUNCA** dejar que `scheduleItems` de la respuesta de Graph cruce el borde del adapter. Ese arreglo trae
  `subject` y `location` de las reuniones de personas del equipo. Lo unico que entra al dominio es
  `availabilityView` (libre/ocupado por intervalo) y, si se usa, `workingHours`.
- **NUNCA** exponer un endpoint que lea el calendario de un `memberId` arbitrario. La lectura va **atada a
  una postulacion** y a las personas declaradas como entrevistadoras de esa postulacion. Un reader de
  disponibilidad sin binding es un mirador de agendas del tenant con otro nombre.
- **NUNCA** derivar la zona horaria de una persona desde su pais. `candidate_facet.residence_country_code` es
  autodeclarado, admite `NULL` y un pais no es una zona horaria: Chile mismo tiene `America/Santiago`,
  `America/Punta_Arenas` y `Pacific/Easter`; Brasil, Mexico y Estados Unidos tienen varias.
- **NUNCA** derivar la zona horaria del proceso Node. La zona canonica sale del calendario operativo
  (`DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE`, `src/lib/calendar/operational-calendar.ts:1`).
- **NUNCA** devolver «sin bloques» cuando lo que paso es que el proveedor fallo. Son dos estados distintos y
  el DTO los distingue; prohibido `.catch(() => [])` en el reader canonico.
- **NUNCA** proponer un bloque sin haber podido verificar los feriados. `loadNagerDateHolidayDateSet`
  **lanza** cuando Nager.Date no responde (`src/lib/calendar/nager-date-holidays.ts:115-124`): la degradacion
  correcta es no proponer y decir por que, no proponer igual.
- **SIEMPRE** que se declare un flag `*_ENABLED`, agregar su fila a
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR, con el runtime donde se LEE.
- **SIEMPRE** que se agregue una capability, granteearla a >=1 rol real de `src/config/role-codes.ts` en el
  MISMO PR, con `capability-grant-coverage.test.ts` verde.

## Normative Docs

- `docs/tasks/to-do/TASK-1769-hiring-interview-scheduling-graph.md` (task madre; esta task consume su puerto,
  su ADR y su modelo de permisos, y no duplica su contenido)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `.claude/skills/greenhouse-talent-people-operator/SKILL.md` (candidate experience: el tiempo de espera entre
  «te vamos a entrevistar» y «esta agendada» es parte de la experiencia, no ruido administrativo)
- `docs/tasks/complete/TASK-1740-public-vacancy-jobposting-foundation.md` (los 20 paises elegibles aprobados y
  la via contractual, 2026-08-17)

## Dependencies & Impact

### Depends on

- **`TASK-1769` (`to-do`) — bloqueante duro.** De ella salen tres cosas que esta task consume y no reimplementa:
  el puerto `src/lib/hiring/interview/calendar-port.ts`, el ADR de agendamiento (donde vive la seccion de
  disponibilidad) y la precondicion de permisos de calendario en la app de Entra. Sin ese puerto esta task
  tendria que inventar un segundo camino a Graph, que es exactamente lo que la regla prohibe.
- `src/lib/entra/graph-client.ts:53-95` — token de aplicacion con client-credentials, cacheado, `server-only`.
- `src/lib/calendar/operational-calendar.ts` — zona canonica `America/Santiago`, dia habil, feriados.
- `src/lib/calendar/nager-date-holidays.ts:115-124` — hidratacion de feriados publicos por ano y pais.
- `greenhouse.team_members.azure_oid` (`src/types/db.d.ts:2957`) — unico puente member ↔ buzon M365. Sin
  `azure_oid` no hay calendario que consultar.
- `greenhouse_hiring.hiring_application` (`opening_id`, `owner_user_id`) y `greenhouse_hiring.hiring_opening`
  (`owner_user_id`) — de ahi sale el default de quien entrevista.
- **Precondicion externa, no resuelta en el repo:** el permiso de aplicacion de calendario en la app de Entra.
  Ver `## Current Repo State → Gap`.

### Blocks / Impacts

- **Ninguna task queda bloqueada por esta.** Es un motor advisory: si no existe, `TASK-1769` sigue agendando
  con la hora que el operador escriba a mano.
- `TASK-1769` — le agrega valor sin cambiarle el contrato: el command de agendamiento sigue recibiendo una
  hora; lo unico que cambia es de donde salio esa hora. Si `TASK-1769` cambia la firma del puerto, esta task
  se adapta, nunca al reves.
- `TASK-1768` (`to-do`) — hace visible el progreso de la etapa Entrevista. No consume este reader: lo que esa
  tarjeta muestra es la cita ya agendada (reader de `TASK-1769`), no la propuesta.
- `docs/architecture/GREENHOUSE_HIRING_INTERVIEW_SCHEDULING_DECISION_V1.md` — crece con una seccion.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — un flag nuevo.
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` — la tabla de permisos de la app queda
  actualizada con el estado real (hoy declara un solo permiso de aplicacion).

### Files owned

- `src/lib/hiring/interview/availability-types.ts` (nuevo, browser-safe)
- `src/lib/hiring/interview/availability-contract.ts` (nuevo)
- `src/lib/hiring/interview/availability-engine.ts` (nuevo, puro y sin entrada/salida)
- `src/lib/hiring/interview/availability-reader.ts` (nuevo)
- `src/lib/hiring/interview/calendar-port.ts` (modificado — `TASK-1769` lo crea; esta task le agrega la
  operacion de lectura de disponibilidad)
- `src/lib/entra/calendar-availability.ts` (nuevo — adapter de Graph, descarta el detalle de eventos)
- `src/app/api/hiring/applications/[id]/interview/availability/route.ts` (nuevo)
- `src/lib/entitlements/entitlements-catalog.ts` (modificado — capability nueva)
- `src/lib/entitlements/runtime.ts` (modificado — grant a >=1 rol real)
- `scripts/hiring/probe-calendar-availability.ts` (nuevo, read-only, scope explicito)
- `docs/architecture/GREENHOUSE_HIRING_INTERVIEW_SCHEDULING_DECISION_V1.md` (modificado — seccion de
  disponibilidad)
- `docs/documentation/hr/agendamiento-entrevistas.md` (modificado)
- `docs/manual-de-uso/hr/agendar-una-entrevista.md` (modificado)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (modificado)

## Current Repo State

### Already exists

- **Cliente de Microsoft Graph, modo aplicacion.** `src/lib/entra/graph-client.ts:53-95`: token
  `client_credentials`, scope `https://graph.microsoft.com/.default`, tenant por defecto
  `a80bf6c1-7c45-4d70-b043-51389622a0e4`, secreto por `resolveSecret`, cache en modulo con margen de 60s.
  `import 'server-only'` en la linea 1. Hoy solo lee usuarios, manager y foto.
- **Calendario operativo canonico.** `src/lib/calendar/operational-calendar.ts`:
  `DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE = 'America/Santiago'` (linea 1),
  `DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE = 'CL'` (linea 2), `resolveOperationalCalendarContext`,
  `countBusinessDays`, `addBusinessDays`, `getOperationalDateKey`, deteccion de fin de semana y merge de
  feriados desde varias fuentes.
- **Hidratacion publica de feriados.** `src/lib/calendar/nager-date-holidays.ts`:
  `fetchNagerDatePublicHolidays(year, countryCode)` y `loadNagerDateHolidayDateSet(year, countryCode)`. Ya la
  consumen `src/lib/hr-core/leave-domain.ts:180` y `src/lib/cost-intelligence/check-period-readiness.ts:151`.
- **Zona horaria de negocio como constante compartida.** `src/lib/calendar/business-time.ts:1`
  (`GREENHOUSE_BUSINESS_TIMEZONE = 'America/Santiago'`) con helpers de partes de fecha por zona.
- **Pais de residencia autodeclarado del candidato.** `greenhouse_hiring.candidate_facet.residence_country_code`
  (ISO 3166-1 alpha-2, nullable, sin backfill; el comentario de la columna dice explicitamente que no es
  direccion, nacionalidad ni elegibilidad laboral).
- **Elegibilidad remota por pais de la vacante.** `hiring_opening.public_remote_eligible_countries` (TEXT[]
  alpha-2 con CHECK), leida por `src/lib/hiring/publication.ts` y expuesta en el payload publico.
- **Boundary de escritura del dominio.** `src/lib/hiring/boundary-domain.test.ts:30` con
  `ALLOWED_WRITE_TARGETS`. Esta task no lo toca porque no escribe nada.
- **Contrato de error canonico y observabilidad por dominio.** `src/lib/api/canonical-error-response.ts` y
  `captureWithDomain`.

### Gap

- **Cero codigo de disponibilidad.** `grep -rn "getSchedule\|freeBusy\|findMeetingTimes\|scheduleInformation"`
  sobre `src/`, `services/` y `scripts/` no devuelve **ninguna** coincidencia (2026-08-22). No hay adapter, ni
  tipo, ni reader, ni endpoint, ni probe.
- **El calendario operativo es de granularidad DIA, no de hora.** `grep -n "hour"` sobre
  `operational-calendar.ts` (531 lineas) devuelve **cero coincidencias**. Sirve para responder «este dia es
  habil» y «este dia es feriado», y **no tiene ningun concepto de jornada** (hora de inicio, hora de termino,
  colacion). La banda horaria de la entrevista **no existe en el repo** y hay que declararla: es la decision
  de diseno 3, no un detalle de implementacion.
- **`loadNagerDateHolidayDateSet` lanza; no degrada.** Si Nager.Date no responde, la funcion propaga la
  excepcion (`nager-date-holidays.ts:78-124`). Cada consumer decide: `leave-domain.ts` y
  `check-period-readiness.ts` la envuelven. Esta task tiene que decidir explicitamente, y la decision correcta
  es fallar cerrado.
- **No existe tabla de equipo de la vacante.** El schema `greenhouse_hiring` tiene 45 tablas y ninguna modela
  panel, entrevistadores ni hiring team (`src/types/db.d.ts:12781-12825`). Lo unico resoluble hoy es
  `hiring_application.owner_user_id` y `hiring_opening.owner_user_id`. La decision de diseno 2 no tiene un
  dato al que apoyarse: hay que declararlo.
- **El permiso de calendario NO esta confirmado.** La unica tabla de permisos escrita en el repo declara para
  la app `Greenhouse` **un solo** permiso de aplicacion, `User.Read.All`
  (`docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md:419`). Ni `Calendars.Read` ni
  `Calendars.ReadWrite` estan confirmados. `[verificar]` con `az ad app permission list --id $AZURE_AD_CLIENT_ID`
  y el consent efectivo del service principal. **Es precondicion dura**, igual que en `TASK-1769`.
- **El candidato no tiene zona horaria en ningun lado.** Ni `hiring_application` ni `candidate_facet` guardan
  timezone. Lo mas cercano es `residence_country_code`, que es autodeclarado, nullable y no determina zona.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/hiring/interview/availability-*.ts como primitive de dominio, src/lib/entra/calendar-availability.ts como adapter de Microsoft Graph, y src/app/api/hiring/applications/:id/interview/availability como adaptador HTTP en el runtime Next.js de Vercel`
- Future candidate home: `domain-package`
- Boundary: `el reader de src/lib/hiring/interview/availability-reader.ts es el unico primitive; el acceso a Graph pasa por la operacion de lectura del puerto src/lib/hiring/interview/calendar-port.ts implementada en src/lib/entra/**; consumers autorizados son la ruta HTTP del portal, Nexa y MCP, y ninguno de ellos llama a Graph directo`
- Server/browser split: `availability-types.ts es browser-safe (DTO de bloque propuesto y enum de causas, sin imports server-only); contract, engine, reader, adapter y secretos quedan server-only y jamas cruzan al bundle del navegador`
- Build impact: `sin dependencia nueva: se usa fetch nativo contra Graph igual que el cliente de Entra vigente; sin input de filesystem ni entrypoint global`
- Extraction blocker: `none — la capacidad es de solo lectura, sin transaccion PostgreSQL ni escritura de estado; el unico acoplamiento real es la resolucion del token de aplicacion de Entra, que ya vive detras de un modulo propio`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` — no escribe nada, pero el permiso de aplicacion que lo habilita alcanza
  buzones reales del tenant y el dato leido es la agenda de personas del equipo.
- Impacto principal: `integration`
- Source of truth afectado: `el calendario de Microsoft 365 es la unica fuente de la disponibilidad; Greenhouse
  no la persiste en v1. El calendario operativo (src/lib/calendar/operational-calendar.ts) es la fuente de dia
  habil y feriado. La banda horaria de entrevista es dato nuevo y esta task declara donde vive`
- Consumidores afectados: `ruta HTTP interna del portal, Nexa via Full API Parity, MCP downstream, y el
  operador que confirma la hora en el command de TASK-1769`
- Runtime target: `local, staging, production, external (Microsoft Graph, Nager.Date)`

### Contract surface

- Contrato existente a respetar: `src/lib/entra/graph-client.ts` (token de aplicacion),
  `src/lib/hiring/interview/calendar-port.ts` (puerto que crea `TASK-1769`),
  `src/lib/calendar/operational-calendar.ts` + `src/lib/calendar/nager-date-holidays.ts` (dia habil y feriado),
  `src/lib/api/canonical-error-response.ts` (contrato de error).
- Contrato nuevo o modificado: reader `readInterviewAvailability({ applicationId, interviewerMemberIds,
  window, durationMinutes })`, DTO `ProposedInterviewSlot`, enum de causas de degradacion, operacion de
  lectura de disponibilidad agregada al puerto, y ruta
  `GET /api/hiring/applications/[id]/interview/availability`.
- Backward compatibility: `gated` — todo detras de flag OFF; sin flag la ruta responde el estado
  `feature_disabled` y ningun otro comportamiento del dominio cambia.
- Full API parity: la regla de negocio (que ventana, que banda, que feriados, como se intersectan N agendas,
  cuando se degrada) vive en `availability-engine.ts` y `availability-reader.ts`. La ruta HTTP valida
  transporte y delega. Nexa y MCP consumen el MISMO reader. Es una capability de **lectura**: no hay
  `propose → confirm → execute` porque no muta nada; la mutacion asociada es el command de agendamiento de
  `TASK-1769`, que si lleva ese loop.

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna**. La v1 es un reader sin persistencia: no crea tabla, no
  escribe fila, no emite evento de outbox.
- Invariantes que no se pueden romper:
  - `El adapter descarta scheduleItems en el borde. El asunto y el lugar de las reuniones de personas del equipo NUNCA entran al dominio, ni a un DTO, ni a un log, ni a una respuesta HTTP.`
  - `La lectura esta atada a una postulacion y a las personas declaradas como entrevistadoras de esa postulacion. NUNCA se acepta un memberId libre.`
  - `Cada bloque propuesto lleva instante absoluto en UTC y zona IANA explicita. Prohibido devolver una hora sin zona, y prohibido derivar la zona de la persona candidata desde su pais.`
  - `Sin feriados verificados no hay propuesta. La degradacion es explicita con causa, no una lista vacia.`
  - `«No hay bloques libres» y «no pude leer la disponibilidad» son estados distintos del DTO y jamas colapsan al mismo valor.`
  - `La propuesta es advisory: NUNCA reserva, bloquea ni sostiene el horario. La autoridad sigue siendo el calendario en el momento de crear el evento.`
  - `Consultar disponibilidad NO cambia la etapa de la postulacion, no escribe desenlace y no deja rastro en el calendario de nadie.`
- Write-target allowlist: `N/A — la v1 no escribe ninguna tabla, asi que ALLOWED_WRITE_TARGETS de src/lib/hiring/boundary-domain.test.ts no cambia. Si el follow-up de cache introduce una tabla, se declara ahi en el MISMO PR con su justificacion.`
- Tenant/space boundary: `la postulacion deriva opening → space/organizacion; la autorizacion es capability-based sobre la postulacion (hiring.interview.availability_read) con binding explicito a applicationId. Cada member consultado debe tener azure_oid resoluble y estar declarado como entrevistador de esa postulacion.`
- Idempotency/concurrency: `es una lectura pura y repetible; dos llamadas seguidas pueden devolver resultados distintos porque el calendario cambio, y eso es correcto. No hay idempotency key porque no hay efecto. El limite de concurrencia lo pone el throttling de Graph, con backoff en el adapter.`
- Audit/outbox/history: `sin outbox y sin historia append-only, porque no hay transicion de estado que registrar. Lo que si se registra es el acceso: quien consulto la disponibilidad de quien y para que postulacion, con la misma disciplina de los audits de lectura sensible que el dominio ya tiene (por ejemplo greenhouse_hiring.candidate_review_access_audit).` `[verificar]` en Plan Mode si ese audit se reusa o si basta con telemetria.

### Migration, backfill and rollout

- Migration posture: `none` — la v1 no crea ni altera tablas.
- Default state: `flag OFF en todos los environments; sin flag no se llama a Graph.`
- Backfill plan: `sin backfill — no hay dato historico que importar. La disponibilidad es del momento en que se pregunta.`
- Rollback path: `flag off (revert inmediato) + revert PR. No hay estado que revertir: la capacidad no deja rastro en PostgreSQL ni en el calendario de nadie. Es el rollback mas limpio de todo el programa de agendamiento.`
- External coordination: `permiso de aplicacion de calendario en la app de Entra con consent de admin, coordinado con TASK-1769 y TASK-1761 para no pedir consent tres veces; Application Access Policy de Exchange Online que acote a que buzones puede leer la app; decision del operador sobre banda horaria y sobre quien elige el horario.`

### Security and access

- Auth/access gate: `session + capability nueva hiring.interview.availability_read (registry + grant a >=1 rol real en el MISMO PR, con coverage test), con binding duro a la postulacion. Sin binding, este endpoint seria un lector de agendas del tenant.`
- Sensitive data posture: `PII de personas del equipo — su patron de ocupacion es dato personal aunque no se vea el detalle. Lo que se lee es libre/ocupado agregado; el detalle de eventos (subject, location) se descarta en el adapter y no existe camino por el que pueda salir.`
- Error contract: `canonicalErrorResponse con codigos nuevos del enum cerrado (por ejemplo interview_availability_provider_unavailable, interview_organizer_not_linked, interview_availability_calendar_unverified); NUNCA prosa en ingles ni el error crudo de Graph al cliente. Observabilidad por captureWithDomain(err, 'hr'|'identity', ...).`
- Abuse/rate-limit posture: `ventana maxima acotada y tope duro de entrevistadores por consulta; backoff exponencial y circuit breaker en el adapter ante 429/503 de Graph; la degradacion es honesta y no reintenta a ciegas.`

### Runtime evidence

- Local checks: `vitest focal del engine puro (dia habil, feriado del 18 de septiembre, cambio de horario de verano de Santiago, interseccion de N agendas, ventana sin bloques, duracion mayor que cualquier hueco); test anti-fuga con respuesta envenenada de Graph que trae scheduleItems con subject y location centinela y verifica que no aparecen en NINGUN output; test de contrato que rechaza un memberId no declarado como entrevistador; capability-grant-coverage.test.ts.`
- DB/runtime checks: `sin migracion. Verificar contra PostgreSQL real via proxy la resolucion member → azure_oid y el default de entrevistador desde hiring_application.owner_user_id / hiring_opening.owner_user_id (los mocks ejercitan el TS, no el SQL).`
- Integration checks: `probe read-only contra Graph con ventana corta sobre un buzon de prueba antes de exponer la ruta; comparar el resultado contra lo que ese calendario muestra en Outlook.`
- Reliability signals/logs: `hiring.interview.availability_provider_failure_rate y hiring.interview.availability_unresolved_organizer (entrevistador declarado sin azure_oid resoluble).`
- Production verification sequence: `ver ## Rollout Plan & Risk Matrix → Production verification sequence.`

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers estan nombrados con paths reales.
- [ ] Invariantes de datos, limite de tenant/acceso y postura de concurrencia estan explicitos.
- [ ] La ausencia de tabla nueva esta declarada y justificada; si el follow-up de cache la introduce, entra al
      allowlist del dominio en su propio PR.
- [ ] La postura de migracion/backfill/rollback es explicita y proporcional al riesgo.
- [ ] Hay evidencia de runtime para todo cambio que no sea documentacion.
- [ ] El dominio sensible tiene errores canonicos, senales y cero fuga de datos crudos.

## Capability Definition of Done — Full API Parity gate

- [ ] **Logica en el primitive, no en la UI.** La regla de propuesta vive en `availability-engine.ts` y
      `availability-reader.ts`.
- [ ] **Modelada como reader canonico**, no como helper de pantalla: la disponibilidad es un recurso
      consultable de la postulacion.
- [ ] **Read** expuesto como reader canonico con autorizacion fina por capability y binding a la postulacion.
      **No hay write**, y eso se declara explicitamente en vez de inventar un command vacio.
- [ ] **Capability + grant en el MISMO PR:** `hiring.interview.availability_read` en el registry + grant a >=1
      rol real en `src/lib/entitlements/runtime.ts` + coverage test verde.
- [ ] **Camino programatico declarado:** ruta interna del portal ahora; exposicion MCP/ecosystem declarada
      como follow-up explicito si no entra en esta task.
- [ ] **La mutacion asociada mantiene `propose → confirm → execute`**: la ejecuta el command de `TASK-1769`,
      que recibe la hora elegida. El LLM puede leer disponibilidad y sugerir; nunca crea el evento.
- [ ] **Un primitive, muchos consumers**: cero logica duplicada entre la ruta HTTP, Nexa y MCP.
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

### Slice 1 — Decisiones escritas y contrato del motor (sin runtime)

- Ampliar `docs/architecture/GREENHOUSE_HIRING_INTERVIEW_SCHEDULING_DECISION_V1.md` con la seccion de
  disponibilidad: resuelve **OQ-1** (quien elige el horario), **OQ-2** (de quien se consulta el calendario) y
  **OQ-3** (banda horaria y zona) con la consecuencia de cada opcion.
- `availability-types.ts` browser-safe: `ProposedInterviewSlot` (instante UTC + zona IANA + duracion),
  `AvailabilityOutcome` con estados mutuamente excluyentes (`proposed`, `no_slots`, `provider_unavailable`,
  `calendar_unverified`, `organizer_unresolved`, `feature_disabled`) y enum de causas.
- Agregar al puerto `calendar-port.ts` de `TASK-1769` la operacion de lectura de disponibilidad, con firma
  provider-neutral (sin ninguna mencion a Graph).
- **Sin llamada externa, sin migracion, sin ruta.**

### Slice 2 — Precondicion de permisos, verificada y acotada (read-only)

- Auditar el estado real de la app de Entra: `az ad app permission list --id $AZURE_AD_CLIENT_ID` + consent
  efectivo del service principal. Registrar el resultado en el ADR y en la tabla de permisos de
  `GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`.
- Confirmar que la Application Access Policy de Exchange Online que `TASK-1769` exige tambien acota la
  **lectura**. Sin ella, un permiso de aplicacion de calendario alcanza **todos** los buzones del tenant.
- `scripts/hiring/probe-calendar-availability.ts`: probe read-only con ventana corta contra un buzon de
  prueba, que imprime unicamente el resumen de ocupacion y **nunca** el detalle de eventos.
- Documentar el resultado como precondicion cumplida o como bloqueo.

### Slice 3 — Motor de bloques puro (sin red)

- `availability-engine.ts`: funcion pura que recibe intervalos de ocupacion por persona, el contexto del
  calendario operativo (zona, feriados, dia habil), la banda horaria declarada, la duracion y la ventana, y
  devuelve la lista de bloques que sirven para **todas** las personas consultadas.
- Sin entrada/salida: cero `fetch`, cero PostgreSQL, cero `Date.now()` implicito (el instante de referencia
  entra por parametro). Es la pieza que se puede probar exhaustivamente.
- Casos obligatorios en el test: feriado chileno, fin de semana, borde de banda horaria, cambio de horario de
  verano de `America/Santiago`, interseccion de dos y de tres agendas, duracion mayor que cualquier hueco,
  ventana completamente ocupada.

### Slice 4 — Adapter de Graph, reader canonico y ruta (BLOQUEADO por Slice 2)

- `src/lib/entra/calendar-availability.ts`: implementacion de la operacion del puerto con
  `POST /users/{id}/calendar/getSchedule`, reusando el token de `graph-client.ts`. **Descarta `scheduleItems`
  en el borde**; solo propaga la ocupacion por intervalo.
- `availability-reader.ts`: resuelve entrevistadores y sus `azure_oid`, hidrata feriados, llama al puerto,
  invoca el engine y devuelve el `AvailabilityOutcome`. Degradacion honesta y explicita en cada rama.
- Ruta `GET /api/hiring/applications/[id]/interview/availability` como adaptador delgado.
- Capability `hiring.interview.availability_read` + grant + coverage test.
- Flag `HIRING_INTERVIEW_AVAILABILITY_ENABLED`, default OFF, con fila en el ledger.

### Slice 5 — Senales, parity y documentacion

- Senales `hiring.interview.availability_provider_failure_rate` y
  `hiring.interview.availability_unresolved_organizer`.
- Declarar la exposicion MCP/ecosystem del reader o registrarla como follow-up con owner.
- Documentacion triple: tecnica (seccion del ADR), funcional (`docs/documentation/hr/`) y manual de uso
  (`docs/manual-de-uso/hr/`), en los mismos archivos que `TASK-1769` crea, como delta y no como documento
  paralelo.

## Out of Scope

- **El agendamiento en si.** Crear el evento, obtener el enlace de Teams, mantener la referencia y reconciliar
  con Outlook es `TASK-1769`. Esta task no escribe en ningun calendario.
- **La superficie publica tokenizada para que la persona candidata elija su horario.** Es la evolucion natural
  del motor y es **task propia con ID nuevo**, no un slice de esta. Requiere superficie publica para una
  persona externa, propuesta durable con expiracion y un solo uso, guardas de abuso y degradacion honesta
  cuando el enlace murio — toda la disciplina que el dominio ya construyo en
  `src/lib/hiring/assessment/public-session/**` y `src/lib/hiring/assessment/access-recovery/**`. Se abre
  **solo si el operador la pide**, y no se empieza dentro de esta.
- **El scorecard y la visibilidad del progreso en la tarjeta del pipeline.** Son de `TASK-1768`.
- **`findMeetingTimes` de Graph.** El motor de sugerencias del propio Graph existe, pero aplica su idea de
  jornada y no conoce el feriado chileno ni la banda que Efeonce declare. Se evalua como alternativa en el ADR
  y la v1 usa `getSchedule` + motor propio, para que la regla de negocio sea nuestra y testeable.
- **Reservar, bloquear o sostener el horario propuesto.** La propuesta no compromete el calendario.
- **Calendarios que no sean Microsoft 365.** El puerto es provider-neutral por disciplina, no porque haya un
  segundo proveedor previsto.
- **Persistir la propuesta.** La v1 es un reader sin estado. La propuesta durable aparece cuando la elige la
  persona candidata, y eso es la task nueva.
- **Cambiar el enum de etapas o de desenlaces.** Consultar disponibilidad no mueve la postulacion.

## Detailed Spec

### 1. La llamada, exactamente

```http
POST https://graph.microsoft.com/v1.0/users/{userId}/calendar/getSchedule
Authorization: Bearer {token de aplicacion}
Content-Type: application/json

{
  "schedules": ["persona.uno@efeonce.com", "persona.dos@efeonce.com"],
  "startTime": { "dateTime": "2026-09-01T09:00:00", "timeZone": "America/Santiago" },
  "endTime":   { "dateTime": "2026-09-05T18:00:00", "timeZone": "America/Santiago" },
  "availabilityViewInterval": 30
}
```

La respuesta trae, por cada entrada de `schedules`:

- **`availabilityView`** — una cadena de digitos, uno por intervalo: `0` libre, `1` tentativo, `2` ocupado,
  `3` fuera de oficina, `4` trabajando en otro lugar. **Esto es lo unico que necesitamos.**
- **`scheduleItems`** — el detalle de cada bloque ocupado, **incluyendo `subject` y `location`**. Es decir:
  el asunto de las reuniones de las personas del equipo. **El adapter lo descarta en el borde.**
- **`workingHours`** — la jornada configurada en el buzon. Util para la decision 3, opcional.

`[verificar]` en Slice 2 contra el tenant: el maximo de entradas por request, el rango valido de
`availabilityViewInterval` y si `1` (tentativo) debe tratarse como libre u ocupado.

**Permiso.** Esta task necesita **lectura**, no escritura: el permiso de aplicacion de lectura de calendario
alcanza, y es estrictamente mas angosto que el de escritura que `TASK-1769` requiere. Como el de escritura
subsume al de lectura y `TASK-1769` es bloqueante, el costo incremental de permisos aca es **cero** — pero
queda escrito para que, si alguna vez se quiere el motor sin el agendamiento, se pida el permiso minimo y no
el grande por inercia. `[verificar]` el nombre exacto del permiso y su consent en Slice 2; hoy el repo declara
un solo permiso de aplicacion para la app `Greenhouse` (`GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md:419`).

### 2. Las preguntas de diseno, con su consecuencia

**P1 — ¿Quien elige el horario, el reclutador o la persona candidata?** (OQ-1)

| Opcion | Que exige | Consecuencia |
|---|---|---|
| **El reclutador elige** entre los bloques que el motor propone (**recomendada para v1**) | Nada nuevo: el reader devuelve bloques, el operador confirma dentro del portal | *Buena:* entrega el valor completo —dejar de adivinar— **sin abrir ninguna superficie publica nueva**. Todo pasa detras de sesion y capability. *Buena:* el rollback es un flag; no hay enlace vivo en manos de nadie. *Mala:* sigue habiendo un ida y vuelta con la persona candidata para confirmar que la hora le sirve. |
| **La persona candidata elige** entre los bloques | Una superficie **publica tokenizada para una persona externa**: propuesta durable con expiracion, un solo uso, guardas de abuso por IP y por credencial, degradacion honesta cuando el enlace murio, y la prohibicion de que el token entre a logs o a payloads genericos | *Buena:* elimina el ida y vuelta completo; es la experiencia que la persona candidata reconoce de cualquier proceso moderno. *Mala:* **no es un slice, es una task propia.** El dominio ya pago ese aprendizaje dos veces (`src/lib/hiring/assessment/public-session/**` con su `abuse-guard.ts` y sus digests con separacion de dominio, y `src/lib/hiring/assessment/access-recovery/**`), y meterlo aca lo repetiria a medias. *Mala:* obliga a persistir la propuesta —la candidata necesita ver el mismo conjunto de opciones un rato despues— con su reloj de retencion y su purga. |

**Recomendacion: la primera para el v1.** Entrega el valor —el sistema deja de adivinar— sin abrir una
superficie publica nueva, y deja la segunda como **evolucion natural una vez que el motor exista**: cuando
haya bloques confiables, ponerlos detras de un enlace es un problema acotado y bien conocido en este dominio.
Si el operador quiere la segunda, **se abre con ID nuevo**; esta task no la incluye.

**P2 — ¿De quien se consulta el calendario?** (OQ-2)

| Opcion | Consecuencia en permisos | Consecuencia en la ventana |
|---|---|---|
| **Un entrevistador** | La mas angosta: se lee un buzon, atado a la postulacion | La interseccion es trivial; casi siempre hay bloques |
| **Varios (panel)** | Cada persona consultada debe estar declarada como entrevistadora de ESA postulacion; el endpoint no acepta una lista libre de members | La interseccion se vacia rapido: 3 agendas llenas pueden no tener ningun hueco comun, lo que obliga a ventanas mas largas y a mas llamadas a Graph |
| **El equipo de la vacante** | No se puede: **no existe tabla de equipo/panel** en `greenhouse_hiring` (45 tablas, ninguna lo modela). Habria que inventarla, y eso es otra task | Sin dato, no hay ventana que calcular |

**Recomendacion:** lista explicita de 1..N `memberId` que el caller pasa, con **default resolvible** desde
`hiring_application.owner_user_id` y, si falta, `hiring_opening.owner_user_id`; tope duro pequeno por consulta.
Cada persona de la lista debe (a) tener `azure_oid` resoluble y (b) estar declarada como entrevistadora de esa
postulacion. **Sin esa segunda condicion el endpoint es un mirador de agendas del tenant con nombre de
hiring.**

Borde con la task madre: el motor puede intersectar N agendas casi gratis, pero **`TASK-1769` modela un
organizador y la persona candidata, y declaro el panel fuera de alcance**. Proponer bloques para tres personas
que el agendamiento no puede convocar es prometer algo que el sistema no cumple. La v1 expone N en el
contrato y **acota a lo que el agendamiento pueda materializar** hasta que el panel exista de verdad.

**P3 — Horario laboral, feriados y zona horaria** (OQ-3)

Lo que el repo **si** tiene, verificado:

- Zona canonica `America/Santiago` y pais `CL` (`operational-calendar.ts:1-2`, `business-time.ts:1`).
- Dia habil, fin de semana y merge de feriados (`operational-calendar.ts`).
- Hidratacion de feriados publicos por ano y pais (`nager-date-holidays.ts:115`), ya usada por
  `leave-domain.ts:180` y `check-period-readiness.ts:151`.

Lo que el repo **no** tiene, y por eso es decision y no detalle:

- **Banda horaria.** `operational-calendar.ts` tiene 531 lineas y **cero** ocurrencias de `hour`. Sabe que
  dias son habiles; no sabe que un dia laboral empieza a las 09:00. Tres caminos: constante del dominio,
  configuracion por vacante, o la `workingHours` que Graph devuelve por buzon.
- **Degradacion de feriados.** `loadNagerDateHolidayDateSet` **lanza** si Nager no responde.

**Recomendacion v1:** (a) **reusar el calendario operativo** para dia habil y feriado —proponer una entrevista
un 18 de septiembre es exactamente el error que este motor existe para evitar—; (b) declarar la **banda
horaria como una constante del dominio en un solo lugar** (por ejemplo 09:00 a 18:00 en `America/Santiago`),
porque hoy no hay dato que la sostenga y esconderla en varios archivos la vuelve irreproducible; (c) usar
`workingHours` de Graph como **restriccion adicional** cuando venga, nunca como sustituto del feriado chileno,
que Graph no conoce; (d) **fallar cerrado** si los feriados no se pudieron verificar: estado
`calendar_unverified` con causa, no una lista de bloques que puede caer en feriado.

**La zona horaria de la persona candidata no es un detalle.** Las vacantes remotas son elegibles en 20 paises
(AR BO BR CL CO CR DO EC SV GT HN MX NI PA PY PE UY VE US ES), de UTC-6 a UTC+2. Consecuencias duras:

- El DTO lleva **instante absoluto en UTC + zona IANA explicita del bloque**. Ningun consumer recibe una hora
  suelta.
- **Prohibido derivar la zona desde el pais.** `candidate_facet.residence_country_code` es autodeclarado,
  admite `NULL` y no determina zona: Chile tiene `America/Santiago`, `America/Punta_Arenas` y `Pacific/Easter`;
  Brasil, Mexico y Estados Unidos tienen varias.
- Si la zona de la persona candidata no esta declarada, el bloque se propone igual **en zona de Efeonce** y el
  aviso es responsabilidad del operador. Inventar una zona es peor que no tenerla.

**P4 — Privacidad de la agenda del equipo**

`getSchedule` devuelve libre/ocupado **y tambien** `scheduleItems` con `subject` y `location` de las reuniones
de esas personas. Reglas, sin excepcion:

- El adapter **descarta `scheduleItems` en el borde**. No entra al dominio, ni a un DTO, ni a un log, ni a una
  respuesta HTTP, ni a una captura. Se prueba con una respuesta envenenada que trae un `subject` centinela y
  se verifica que no aparece en **ningun** output.
- Lo unico que circula es **disponibilidad agregada**: este bloque sirve o no sirve. Nunca por que.
- **No sale del perimetro interno.** En la v1 la propuesta la ve un operador con sesion y capability. El dia
  que viaje a la persona candidata (la task nueva de la decision 1), viaja como bloques **anonimos** —«martes
  15:00 a 15:45»— sin nombre del entrevistador y sin motivo del bloqueo.
- Ocupado no es lo mismo que no disponible, y libre no es lo mismo que disponible: alguien que no usa su
  calendario aparece libre siempre. Por eso el resultado se llama **propuesta** y el operador confirma.

### 3. Por que el motor no promete el horario

Entre proponer y crear, el calendario cambia. La propuesta **no reserva nada**: el command de `TASK-1769`
re-consulta al confirmar y puede fallar con un conflicto legible. Sostener el bloque exigiria escribir un
evento tentativo en el calendario del entrevistador —es decir, escribir— y eso es precisamente lo que esta
task no hace. Es una decision, no una limitacion: un hold silencioso ensucia agendas ajenas con reuniones
fantasma que nadie borra.

### 4. Costo, throttling y degradacion

Es una lectura, asi que no hay idempotencia que resolver ni outbox que alimentar. Lo que si hay es costo:
ventana larga por N entrevistadores multiplica el trabajo del proveedor. Contencion: ventana maxima acotada,
tope de entrevistadores por consulta, backoff exponencial y circuit breaker ante 429/503, y **degradacion
honesta**: `provider_unavailable` con causa, nunca una lista vacia que el operador lea como «no hay horarios».

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1769 Slice 1 (ADR + puerto) → Slice 1 (decisiones + contrato) → Slice 2 (permisos) → Slice 3 (engine puro) → Slice 4 (adapter + reader + ruta) → Slice 5 (senales + docs)`
- **Esta task no empieza antes de que `TASK-1769` haya creado el puerto `calendar-port.ts` y el ADR.** Empezar
  antes obliga a inventar un segundo camino a Graph, que es justo lo que la regla del dominio prohibe.
- **Slice 4 NO se ejecuta** mientras Slice 2 no haya verificado el permiso **y** confirmado que la Application
  Access Policy acota tambien la lectura. Leer la agenda de personas reales con un modelo de permisos no
  verificado es un incidente de privacidad aunque nadie mire el resultado.
- Slice 3 puede correr en paralelo con Slice 2 (uno es logica pura, el otro es Azure), pero ambos cierran
  antes de Slice 4.
- Slice 5 depende de Slice 4: no se puede senalizar lo que todavia no llama a nadie.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El permiso de aplicacion de calendario permite **leer todos los buzones del tenant** | identity | high | Application Access Policy de Exchange Online acotando a un grupo autorizado, aplicada ANTES del primer read; pedir el permiso de **lectura**, no el de escritura, si se pide por separado; capability propia; flag OFF por defecto | auditoria `az ad app permission list` al cierre y en cada rotacion; `pnpm auth:audit-azure-app` como auditor de drift de la app |
| El endpoint degenera en un **mirador de agendas**: alguien consulta el calendario de cualquier member | identity | high | Binding duro a `applicationId` + validacion de que cada member consultado esta declarado como entrevistador de esa postulacion; el contrato NO acepta una lista libre de members; test que rechaza un member no declarado | audit de acceso de lectura + revision del contrato en code review |
| **`scheduleItems` se filtra** al dominio, a un log o a una respuesta: el asunto de reuniones ajenas queda expuesto | identity | medium | El adapter descarta `scheduleItems` en el borde; test anti-fuga con respuesta envenenada (`subject` y `location` centinela) que falla si aparecen en cualquier output | test anti-fuga en CI; revision de payloads del reader |
| Se propone un bloque **en feriado o fuera de horario** (Nager caido, banda no declarada, feriado regional) | hr | medium | Fail-closed: sin feriados verificados se devuelve `calendar_unverified` con causa y cero bloques; filtro de dia habil desde el calendario operativo canonico; test con el 18 de septiembre y con fin de semana | ausencia de bloques con causa explicita en el DTO; reclamo humano si un bloque invalido llega a produccion |
| **Zona horaria**: el bloque se entiende en la zona equivocada (20 paises elegibles, hasta 8 horas de diferencia) | hr | high | Instante absoluto UTC + zona IANA explicita en cada bloque; prohibido derivar zona desde `residence_country_code`; test de contrato sobre el DTO; el cambio de horario de verano de Santiago es caso de test obligatorio | test de contrato en CI; sin senal automatica en produccion, es control de contrato |
| El bloque propuesto **ya no esta libre** al momento de crear el evento | integration | medium | La propuesta es advisory por diseno: no reserva ni sostiene; el command de `TASK-1769` re-consulta al confirmar y falla con conflicto legible | fallo de creacion en `TASK-1769` con causa `conflict`, no un evento duplicado |
| **Throttling de Graph** (ventana larga por varios entrevistadores, o varias postulaciones seguidas) | integration | medium | Ventana maxima acotada + tope de entrevistadores por consulta + backoff exponencial + circuit breaker; degradacion honesta sin reintento ciego | `hiring.interview.availability_provider_failure_rate` |
| **Falsa disponibilidad**: alguien aparece libre porque no usa su calendario | hr | medium | El resultado se llama propuesta y el operador confirma; el contrato y el copy no prometen disponibilidad, prometen ausencia de conflicto conocido | sin senal automatica: es control humano y de redaccion |
| **Silent-catch**: el reader devuelve «sin bloques» cuando en realidad Graph fallo | ops | high | Estados mutuamente excluyentes en el DTO (`no_slots` vs `provider_unavailable` vs `calendar_unverified`); prohibido `.catch(() => [])`; `captureWithDomain` en cada rama de fallo | `hiring.interview.availability_provider_failure_rate` con steady 0; ausencia de eventos en Sentry con fallos visibles en el DTO es en si un sintoma |
| **Entrevistador sin `azure_oid`** resoluble: no hay calendario que consultar | identity | medium | Estado `organizer_unresolved` con causa accionable (enlazar la identidad), nunca una lista vacia; el reader nombra a quien falta sin exponer PII adicional | `hiring.interview.availability_unresolved_organizer` |

### Feature flags / cutover

- **`HIRING_INTERVIEW_AVAILABILITY_ENABLED`** — default `false`. Gatea el adapter de Graph y la ruta. Con el
  flag apagado, la ruta responde el estado `feature_disabled` y ninguna otra superficie cambia.
  **Multi-runtime:** se lee **solo en el runtime Next.js de Vercel** — la consulta es sincrona, iniciada por
  un operador, y **no hay consumer async, ni cron, ni trabajo del `ops-worker`** en esta capacidad. Aun asi,
  antes de prenderlo hay que mapear donde se lee (`grep -rn "HIRING_INTERVIEW_AVAILABILITY_ENABLED" src/ services/`)
  y confirmar que el resultado sigue siendo solo Vercel; si alguna vez aparece en `services/**`, el SoT de
  Cloud Run es `services/<worker>/deploy.sh` (que usa `--set-env-vars` destructivo) **y ademas** hay que
  aplicarlo en vivo con `gcloud run services update ... --update-env-vars`. Fila obligatoria en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime declarado.
- Cutover: prender primero en staging con el probe read-only ya verde; en produccion, prender despues de que
  el agendamiento de `TASK-1769` este estable, para que la propuesta tenga a donde ir.
- Revert: flag a `false` + redeploy. Menos de 5 minutos en Vercel. **No queda estado que revertir.**

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (documentacion + tipos + firma del puerto) | minutos | si |
| Slice 2 | revocar el permiso concedido en la app de Entra y quitar la Application Access Policy; el probe es read-only y no deja estado | minutos | si |
| Slice 3 | revert PR; el engine es puro y no tiene consumers hasta Slice 4 | minutos | si |
| Slice 4 | `HIRING_INTERVIEW_AVAILABILITY_ENABLED=false` + redeploy. **No hay estado que deshacer**: la capacidad no escribe en PostgreSQL ni en el calendario de nadie. Es el rollback mas limpio del programa de agendamiento | menos de 5 min | si |
| Slice 5 | revert PR; las senales dejan de emitir | minutos | si |

### Production verification sequence

1. Slice 2 en Azure: confirmar el permiso de lectura de calendario y la Application Access Policy; ejecutar el
   probe read-only contra un buzon de prueba con una ventana corta y verificar `200`. **Stop si el permiso no
   esta concedido con consent de admin o si la policy no acota los buzones.**
2. Verificar que el probe imprime **solo** ocupacion agregada: si aparece un asunto de reunion en la salida,
   el adapter esta mal y se detiene aca.
3. Deploy a staging con el flag en `false` + verificar que el dominio hiring se comporta exactamente igual que
   antes y que la ruta responde `feature_disabled` sin romper.
4. Staging con `HIRING_INTERVIEW_AVAILABILITY_ENABLED=true`: consultar disponibilidad de una postulacion de
   prueba con **una persona interna del equipo** como entrevistadora. Contrastar los bloques devueltos contra
   lo que ese calendario muestra en Outlook.
5. Staging: repetir sobre una ventana que contenga un feriado chileno y verificar que **ningun** bloque cae
   ahi. Repetir sobre un fin de semana.
6. Staging: consultar con dos entrevistadores y verificar que la interseccion es correcta (un bloque libre
   para uno y ocupado para el otro no debe aparecer).
7. Staging: simular fallo del proveedor y verificar que el resultado es `provider_unavailable` con causa, y
   **no** una lista vacia.
8. Staging: consultar con un member sin `azure_oid` y verificar `organizer_unresolved` con causa accionable.
9. Repetir 3-8 en produccion con al menos 24h de enfriamiento, y solo despues de que el agendamiento de
   `TASK-1769` este estable en produccion.
10. Monitorear las dos senales durante 7 dias post-produccion.

### Out-of-band coordination required

- **Azure App Registration:** confirmar o conceder el permiso de aplicacion de **lectura** de calendario con
  consent de admin. Coordinar con `TASK-1769` (que pide el de escritura) y con `TASK-1761` (que tambien toca
  la app de Entra) para no pedir consent tres veces.
- **Exchange Online:** confirmar que la Application Access Policy acota tambien la lectura, no solo la
  escritura. Sin ella, el permiso alcanza todos los buzones del tenant. `[verificar]` el cmdlet y el grupo de
  buzones aplicable.
- **Decision del operador:** OQ-1 (quien elige el horario), OQ-2 (de quien se consulta el calendario) y OQ-3
  (banda horaria). Bloquean Slice 1.
- **People Ops:** sign-off sobre leer la disponibilidad de personas del equipo desde una herramienta de
  seleccion, y sobre el criterio de que la propuesta se hace en zona de Efeonce cuando la de la persona
  candidata no esta declarada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El ADR de agendamiento tiene su seccion de disponibilidad con OQ-1, OQ-2 y OQ-3 resueltas y sus
      consecuencias escritas.
- [ ] El estado real de los permisos de la app de Entra quedo auditado y registrado en
      `GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`; la Application Access Policy acota los buzones alcanzables.
- [ ] Un operador con `hiring.interview.availability_read` consulta la disponibilidad de una postulacion y
      recibe bloques que coinciden con el calendario real del entrevistador.
- [ ] Ningun bloque propuesto cae en feriado chileno, fin de semana ni fuera de la banda horaria declarada;
      hay test con el 18 de septiembre y con el cambio de horario de verano de `America/Santiago`.
- [ ] Cada bloque viaja con instante absoluto UTC y zona IANA explicita; ningun camino del codigo deriva la
      zona de una persona desde su pais.
- [ ] `scheduleItems` no aparece en ningun DTO, log ni respuesta: hay test anti-fuga con `subject` y
      `location` centinela.
- [ ] La ruta rechaza un `memberId` que no este declarado como entrevistador de esa postulacion.
- [ ] «Sin bloques», «proveedor caido», «feriados no verificados» y «entrevistador sin identidad enlazada» son
      cuatro estados distintos del DTO y ninguno colapsa en otro.
- [ ] La capability nueva tiene registry + grant a >=1 rol real + `capability-grant-coverage.test.ts` verde.
- [ ] El flag tiene fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su runtime declarado.
- [ ] Consultar disponibilidad no cambia la etapa de la postulacion, no escribe desenlace y no deja rastro en
      ningun calendario.
- [ ] La v1 no crea ninguna tabla: `ALLOWED_WRITE_TARGETS` de `src/lib/hiring/boundary-domain.test.ts` queda
      igual y eso esta declarado como decision, no como olvido.
- [ ] Las tres capas documentales quedaron actualizadas como delta sobre los documentos de `TASK-1769`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm vitest run src/lib/hiring` (incluye `boundary-domain.test.ts`)
- `pnpm vitest run src/lib/entitlements/capability-grant-coverage.test.ts`
- `pnpm vitest run src/lib/calendar` (el motor consume el calendario operativo; una regresion ahi mueve
  bloques a feriados)
- Ejercicio real de la resolucion member → `azure_oid` contra PostgreSQL via `pnpm pg:connect` (los mocks
  ejercitan el TS, no el SQL)
- Probe read-only contra Microsoft Graph antes de exponer la ruta
- `pnpm docs:closure-check`
- `pnpm build` solo como gate final de cierre, con autorizacion del operador

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado
- [ ] `changelog.md` quedo actualizado
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1769` quedo notificada con nota delta: la disponibilidad ya existe y su command puede recibir una
      hora propuesta en vez de una escrita a mano
- [ ] el estado de los permisos de Graph quedo escrito en
      `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`

## Follow-ups

- **Superficie publica tokenizada para que la persona candidata elija su horario.** Task nueva con ID propio,
  solo si el operador la pide. Consume este motor, agrega propuesta durable con expiracion y un solo uso, y
  hereda la disciplina de `src/lib/hiring/assessment/public-session/**`.
- Cache corta de disponibilidad por persona y ventana, si el throttling de Graph emerge como problema real.
  Introduce la primera tabla del dominio para esta capacidad y por lo tanto una fila en
  `ALLOWED_WRITE_TARGETS`.
- Politica de entrevista por vacante (duracion, banda horaria, entrevistadores) como dato en vez de constante,
  el dia que una vacante necesite algo distinto del resto.
- Panel real: entrevistadores como entidad del dominio, con su scorecard por persona. Hoy no existe tabla y
  `TASK-1769` modela un organizador.
- Evaluar `findMeetingTimes` de Graph como complemento, si aparece un caso donde su heuristica agregue algo
  sobre la interseccion propia.
- Exposicion MCP/ecosystem del reader, si no entra en el alcance de esta task.

## Open Questions

- **OQ-1 (bloqueante del Slice 1) — ¿Quien elige el horario?** La recomendacion es que **el reclutador elija**
  entre los bloques propuestos, sin superficie publica nueva. Que la persona candidata elija es la evolucion
  natural, pero exige una superficie publica tokenizada para una persona externa y por lo tanto **task
  propia**, que esta no abre.
- **OQ-2 (bloqueante del Slice 1) — ¿De quien se consulta el calendario?** La recomendacion es una lista
  explicita de 1..N entrevistadores con default desde `hiring_application.owner_user_id` y fallback a
  `hiring_opening.owner_user_id`, con tope duro y validacion de que cada persona esta declarada como
  entrevistadora de esa postulacion. No existe tabla de equipo de la vacante a la cual apoyarse.
- **OQ-3 (bloqueante del Slice 1) — ¿De donde sale la banda horaria?** El calendario operativo es de
  granularidad dia y **no tiene concepto de jornada**. La recomendacion es una constante del dominio en un
  solo lugar, con `workingHours` de Graph como restriccion adicional y nunca como sustituto del feriado
  chileno.
- **OQ-4 — ¿Se cachea la disponibilidad?** La v1 dice que no: reader sin estado, sin tabla, sin retencion. Si
  el throttling de Graph obliga, la cache entra como follow-up con su propia fila en el allowlist de escritura
  del dominio.
- **OQ-5 — ¿Que hace el motor con los intervalos marcados como tentativos?** Tratarlos como ocupados es
  conservador y propone menos; tratarlos como libres propone mas y choca mas. Decidir con evidencia del probe
  de Slice 2.
