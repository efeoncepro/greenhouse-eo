# TASK-2092 — Rooms: el comprador suma a su comité (acceso de colegas)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-052`
- Status real: `Diseño. Reglas de negocio aprobadas por el operador el 2026-11-01; sin código.`
- Rank: `antes de TASK-2093 (interfaz)`
- Domain: `platform|identity`
- Blocked by: `none`
- Branch: `efeonce-rooms: rama propia y PR (main = producción, alias manual tras deploy); Greenhouse: docs en develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

En B2B no compra una persona: compra un comité. Hoy una invitación a una sala sirve para un solo correo, y si el
comprador quiere sumar al gerente que aprueba el presupuesto tiene que pedirle a Efeonce otra invitación. Esta task
crea el contrato para que un invitado proponga a un colega: se aprueba solo si el colega es del mismo dominio
corporativo, queda pendiente de aprobación del equipo si es de otro dominio, y nunca hay más de 10 colegas activos
por sala.

## Why This Task Exists

- La invitación de Rooms es por destinatario (`rooms.invitations`, TASK-2066) y su gestión mínima (TASK-2068) la
  opera sólo el equipo interno. Ambas dejan fuera de alcance, de forma explícita, «crear personas por email libre»,
  «invitaciones masivas» y «nuevos grants».
- El ADR de producto (`EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md`) ya dice que la sala es «del comprador y
  su comité», y el ADR de experiencia (`EFEONCE_ROOMS_EXPERIENCE_V1.md` §6) diseña para el *champion*. Falta el
  camino por el que el champion lleva la propuesta a su comité sin que se reenvíe el enlace: un enlace reenviado no
  abre la sala, porque el código llega sólo al correo del destinatario original.
- Decisión del operador (2026-11-01): aprobación automática cuando el colega es del mismo dominio, tope de 10 por
  sala y correos de otro dominio con aprobación del equipo.

## Goal

- Un invitado con el permiso nuevo propone un colega desde su sesión; la regla de dominio decide entre invitación
  inmediata y solicitud pendiente.
- El equipo con `access.manage` aprueba o rechaza las solicitudes pendientes, y ve quién propuso a quién.
- Todo por command y reader canónicos (API, SDK, CLI, MCP), con recibo idempotente, auditoría y topes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md` (invitaciones, vigencias del 2026-11-01)
- `docs/architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md` (sala del comprador y su comité)
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_V1.md` §6 (el champion)
- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (clases de acción; invitar = aprobación humana)
- `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md` (un correo con enlace y código; topes de envío)

Reglas obligatorias:

- La invitación del colega es una invitación normal de `rooms.invitations`: su propio token, su propio código al
  correo del colega y la misma verificación por Efeonce ID. Nunca se comparte el enlace ni la sesión del proponente.
- El colega nunca recibe más permisos ni más vigencia que el invitado que lo propuso.
- La aprobación automática sólo aplica a dominios corporativos: un dominio de correo gratuito o público nunca se
  aprueba solo.
- La decisión sobre una solicitud pendiente es una acción de acceso: un agente puede proponerla, pero la ejecuta una
  persona (clase `access`, ADR del carril de agentes).

## Normative Docs

- `docs/tasks/in-progress/TASK-2066-rooms-tokenized-invitations-email-code.md` (dueña de la invitación tokenizada)
- `docs/tasks/in-progress/TASK-2068-rooms-invitation-and-guest-experience.md` (entrada guest y gestión mínima)
- `src/lib/growth/forms/email-verification/comprehensive-free-domains.ts` en greenhouse-eo (lista generada de
  4.462 dominios gratuitos desde `willwhite/freemail`, MIT; fuente para la lista de Rooms)

## Dependencies & Impact

### Depends on

- `rooms.invitations`, `rooms.invitation_sessions` y el servicio `src/server/invitations/service.ts` de `efeonce-rooms`.
- Vigencias de invitación del 2026-11-01 (PR #12 de `efeonce-rooms`: 30/90 días, sesión de 8 horas).
- Flujo OTP de TASK-2067 en Efeonce ID, sin cambios: el correo al colega sale por el mismo `prepare`.

### Blocks / Impacts

- `TASK-2093` (interfaz del invitado y bandeja de aprobación) consume este contrato.
- `TASK-2068`: la gestión de invitaciones muestra el origen «propuesto por» y las solicitudes pendientes.
- `TASK-2085`: la actividad de la casa puede listar solicitudes pendientes (lo decide TASK-2093).

### Files owned

- `efeonce-rooms/src/domain/invitation-contracts.ts` (capability y schemas nuevos)
- `efeonce-rooms/src/server/invitations/referrals.ts` [nuevo]
- `efeonce-rooms/src/server/invitations/free-email-domains.ts` [nuevo, generado]
- `efeonce-rooms/migrations/<timestamp>_rooms-invitation-referrals.sql` [nuevo]
- `efeonce-rooms/tests/invitation-referrals.test.ts` [nuevo]
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md` (sección de colegas)

## Current Repo State

### Already exists

- Invitación versionada y revocable con correo cifrado (`email_ciphertext`), referencia de destinatario y
  capacidades acotadas por quien invita (`src/server/invitations/authority.ts`).
- Commands `invitations.create|reissue|retryDelivery|revoke` con recibo idempotente y clasificación del carril de
  agentes (`src/domain/agent-lane-contracts.ts`: `release`, cuota `invitations` 30/hora).
- Sesión guest por sala, principal externo `client`, revocación releída en cada uso.
- Reenvío de código por autoservicio y topes de envío de Auth (3 por invitación/hora, 10 por destinatario/hora).

### Gap

- No existe un command que un **invitado** pueda ejecutar para proponer a otra persona.
- No hay regla de dominio, ni lista de dominios gratuitos en Rooms, ni tope por sala para invitaciones derivadas.
- No hay estado de solicitud pendiente ni decisión del equipo; no se registra quién propuso a quién.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-rooms` (`src/server/invitations`, `src/domain`), runtime Next.js de Rooms en Vercel con `rooms_production`
- Future candidate home: `remain-shared`
- Boundary: command `invitations.requestColleague` (guest) y `invitations.decideColleague` (equipo con `access.manage`), reader `invitations.colleagueRequests`; la UI y los agentes consumen sólo esos contratos
- Server/browser split: toda la regla (dominio, topes, herencia de permisos) vive en el servidor; el navegador sólo envía correo y motivo, y recibe un DTO sin correos ajenos completos
- Build impact: un módulo generado con la lista de dominios gratuitos (~4.5k entradas, server-only)
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `rooms.invitations` + tabla nueva `rooms.invitation_colleague_requests`
- Consumidores afectados: UI del invitado y gestión de invitaciones (TASK-2093), SDK `src/client`, CLI, MCP de Rooms
- Runtime target: `production` (Vercel Rooms + `rooms_production`)

### Contract surface

- Contrato existente a respetar: `invitationCommandSchemas` y `InvitationManagement` en `src/domain/invitation-contracts.ts`; flujo OTP del ADR de correo único
- Contrato nuevo o modificado: commands `invitations.requestColleague` y `invitations.decideColleague`; reader `invitations.colleagueRequests`; `InvitationManagement` gana `colleagueRequests` y el origen de cada invitación; capability de invitación `colleagues.request`
- Backward compatibility: `compatible` — las invitaciones existentes no reciben la capability nueva
- Full API parity: un solo servicio de dominio; UI, SDK, CLI y MCP llaman los mismos commands por `POST /api/v1/commands` y el mismo reader

### Data model and invariants

- Entidades/tablas/views afectadas: `rooms.invitation_colleague_requests` (nueva); `rooms.invitations` (sólo lectura del origen; la invitación derivada se crea por el camino normal)
- Invariantes que no se pueden romper:
  - El colega hereda a lo sumo las capacidades de la invitación proponente, sin `colleagues.request` salvo que el equipo la conceda; su vigencia es la que le quede a la invitación proponente.
  - Mismo dominio = dominio exacto del correo, sin distinguir mayúsculas; un subdominio distinto o un dominio de la lista de gratuitos pasa a pendiente.
  - Máximo 10 invitaciones activas de colegas por sala (estado `active` y no vencidas); la solicitud 11 se rechaza con un error canónico, sin crear filas.
  - El correo propuesto no puede ser el del proponente ni el de una invitación activa de la misma sala.
  - Una solicitud pendiente vence con la invitación proponente; revocar la proponente rechaza sus pendientes.
- Write-target allowlist: declarar `rooms.invitation_colleague_requests` donde Rooms tenga boundary test de escritura [verificar].
- Tenant/space boundary: `organization_id` y `room_id` salen de la sesión guest verificada, nunca del cuerpo de la petición.
- Idempotency/concurrency: recibo idempotente por clave como los demás commands; el conteo del tope y la creación ocurren en la misma transacción con lock por sala.
- Audit/outbox/history: cada solicitud y decisión deja recibo append-only con actor (guest o persona del equipo) y queda visible en la gestión de invitaciones.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla nueva; sin backfill)
- Default state: capability `colleagues.request` incluida por defecto en invitaciones **nuevas**; el equipo puede quitarla por invitación
- Backfill plan: sin backfill; las invitaciones existentes siguen sin la capability
- Rollback path: revert del PR y redeploy; la tabla queda vacía o con historia, sin efecto en invitaciones vigentes
- External coordination: aplicar la migración en `rooms_production` antes del merge, con el respaldo de `pnpm db:migrate-production --apply`

### Security and access

- Auth/access gate: proponer exige sesión guest vigente con `colleagues.request`; decidir exige `access.manage` en la sala; agentes: `requestColleague` no aplica (sólo guest) y `decideColleague` es clase `access`
- Sensitive data posture: correo del colega cifrado como `email_ciphertext`; el DTO del invitado nunca devuelve correos de otros invitados; el motivo libre se limita a 200 caracteres y no se registra en logs
- Error contract: errores canónicos `RoomsError` (`forbidden`, `conflict`, `invalid_input`, `quota_exceeded` para el tope), sin texto crudo del servidor
- Abuse/rate-limit posture: tope de 10 activos por sala, máximo 5 solicitudes por invitación proponente por día y los topes de envío existentes de Auth

### Runtime evidence

- Local checks: pruebas del servicio (dominio igual, gratuito, otro dominio, tope 10/11, herencia de permisos y vigencia, revocación en cascada de pendientes, idempotencia, aislamiento entre salas y organizaciones)
- DB/runtime checks: migración ensayada con `pnpm db:rehearse-production` y aplicada con respaldo y readback
- Integration checks: invitación derivada recibe su correo con código por el flujo OTP existente, en el entorno local con issuer fixture
- Reliability signals/logs: conteo de solicitudes pendientes por sala y de topes alcanzados en `pnpm access:health`
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Modelo y regla de dominio

- Migración aditiva de `rooms.invitation_colleague_requests` (id, organización, sala, invitación proponente, correo
  cifrado, referencia de dominio, motivo, estado `pending|auto_approved|approved|rejected|expired`, decisión con actor
  y fecha, invitación resultante), con guard anti pre-up-marker e inclusión en `REVIEWED_MIGRATIONS`.
- Lista generada de dominios gratuitos en Rooms (desde la misma fuente que Greenhouse) y función pura de decisión:
  `auto` si el dominio coincide y no es gratuito; `pending` en cualquier otro caso.
- Capability `colleagues.request` en `invitationCapabilitySchema`, incluida por defecto al crear invitaciones nuevas.

### Slice 2 — Commands y reader

- `invitations.requestColleague`: valida sesión guest y capability, tope y duplicados; en `auto` crea la invitación
  del colega por el camino normal (mismo envío OTP) y en `pending` deja la solicitud.
- `invitations.decideColleague`: aprobar crea la invitación; rechazar cierra la solicitud. Exige `access.manage`.
- `invitations.colleagueRequests` y extensión de `InvitationManagement` con pendientes y origen «propuesto por».
- Registro en runtime de la API, SDK `src/client`, CLI y MCP; clasificación en el catálogo del carril de agentes.

### Slice 3 — Cascada, salud y documentación

- Revocar la invitación proponente rechaza sus pendientes; el diálogo de revocación puede elegir revocar también a sus
  colegas (el command de revocación recibe la opción).
- `pnpm access:health` muestra pendientes y topes alcanzados por sala.
- Delta en el contrato de API y acceso de Rooms; manual de operación de solicitudes de colegas.

## Out of Scope

- Interfaz del invitado y bandeja de aprobación (TASK-2093).
- Correo al equipo cuando hay una solicitud pendiente: Rooms no tiene mailer propio; se decide en un follow-up.
- Contactos de HubSpot asociados al deal desde el comité (follow-up cuando la sala esté vinculada a un deal).
- Cambiar el correo de invitación de Efeonce ID para nombrar al colega proponente (exige release de Greenhouse).
- Aprobación automática por subdominios o por listas de dominios por cliente.

## Detailed Spec

Decisión de dominio (pura, probada sin base):

```text
dominio(correo) = parte después de la última «@», en minúsculas
auto      ⇔ dominio(colega) == dominio(proponente) ∧ dominio(colega) ∉ GRATUITOS
pending   ⇔ en cualquier otro caso
```

Herencia: `capacidades(colega) ⊆ capacidades(proponente) \ {colleagues.request}` y
`vence(colega) = vence(proponente)`. Una aprobación posterior usa la vigencia que le quede a la proponente en ese
momento; si ya venció, la aprobación falla con `conflict`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tabla, regla y capability) → Slice 2 (commands y reader) → Slice 3 (cascada, salud, docs).
- La migración se aplica en `rooms_production` antes de mergear el código que la usa.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un dominio gratuito se aprueba solo y cualquiera suma a cualquiera | identity | medium | lista generada de 4.462 dominios + pruebas con gmail/outlook/hotmail | conteo de aprobaciones automáticas por dominio en `access:health` |
| La propuesta circula fuera del comité | identity | low | tope de 10 por sala, 5 solicitudes/día por invitación, revocación en cascada | topes alcanzados en `access:health` |
| El colega recibe más permisos que el proponente | identity | low | herencia calculada en servidor y probada | prueba de herencia en CI |
| Spam de correos de código | email | low | topes de envío de Auth existentes | rechazos por tope en Auth |

### Feature flags / cutover

- Sin flag nuevo: la capability `colleagues.request` es el interruptor. Sólo las invitaciones nuevas la reciben, y
  el equipo puede quitarla por invitación; sin la capability, el command responde `forbidden`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR; la tabla aditiva queda sin uso | < 15 min | sí |
| Slice 2 | revert del PR y redeploy con alias manual | < 15 min | sí |
| Slice 3 | revert del PR | < 15 min | sí |

### Production verification sequence

1. `pnpm db:rehearse-production` en PASS y corrida en seco con 1 pendiente.
2. `ROOMS_EXPECT_PENDING=1 pnpm db:migrate-production --apply` con respaldo y readback.
3. Merge, deploy y `vercel alias set`; smoke de rutas.
4. Invitación sintética interna: proponer un colega del mismo dominio corporativo (aprobación automática) y uno de
   Gmail (pendiente); aprobar el pendiente y revocar la proponente para ver la cascada.

### Out-of-band coordination required

- Autorización del operador para la migración en `rooms_production` y para el deploy de Rooms.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un colega del mismo dominio corporativo recibe su invitación sin intervención del equipo, con su propio correo y código.
- [ ] Un colega de Gmail, Outlook u otro dominio gratuito, o de un dominio distinto, queda como solicitud pendiente.
- [ ] La solicitud 11 de colegas activos en una sala falla con error canónico y no crea filas ni correos.
- [ ] El colega nunca recibe más capacidades ni más vigencia que el proponente (prueba).
- [ ] Sólo una persona con `access.manage` puede aprobar o rechazar; un agente queda en clase `access`.
- [ ] Revocar la invitación proponente rechaza sus solicitudes pendientes.
- [ ] El DTO del invitado no expone correos completos de otros invitados.
- [ ] Commands y reader disponibles por API, SDK, CLI y MCP, con recibo idempotente.
- [ ] Migración ensayada, aplicada con respaldo antes del merge e incluida en `REVIEWED_MIGRATIONS`.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Verification

- `pnpm lint`, `pnpm typecheck` y `pnpm test` en `efeonce-rooms`
- `pnpm db:rehearse-production` y corrida en seco contra producción
- Recorrido sintético del Production verification sequence

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] ledger de `efeonce-rooms` y contrato de API y acceso actualizados con el estado real

## Follow-ups

- Correo al equipo cuando entra una solicitud pendiente.
- Comité de compra como contactos asociados al deal de HubSpot vinculado a la sala.
- Plazo de retención de solicitudes y correos de colegas en la revisión de privacidad V2.

## Open Questions

- Ninguna bloqueante. Las tres reglas de negocio las decidió el operador el 2026-11-01.
