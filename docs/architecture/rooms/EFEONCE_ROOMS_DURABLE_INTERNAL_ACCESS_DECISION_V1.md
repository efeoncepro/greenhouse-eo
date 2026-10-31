# Rooms — Acceso interno durable y gobernado

- Status: **Accepted** (2026-10-31, operador: «Aprobar ADR»). Autoriza el código local de TASK-2082 en `efeonce-rooms`.
  No autoriza push, deploy, migración de producción ni flags: eso sigue el gate de release de Rooms. La parte B
  (página de error del callback) se implementa en TASK-2083.
- Owner: Platform (contrato y runtime `efeonce-rooms`); el operador decide quién administra Rooms.
- Epic: EPIC-052. Tasks: TASK-2082 (acceso interno, backend-data) y TASK-2083 (página de error, ui-ux).
- Reversibility: two-way-but-slow. Tablas y comandos nuevos son aditivos; el modelo de principals,
  memberships, bindings y grants no cambia de forma.

## Contexto

El 2026-10-31 Rooms quedó en producción con los flags ON y Efeonce ID con login first-party y OTP. El
primer login real del dueño terminó en `identity_unbound`: su acceso del canary del 26-10 duraba 2 horas y
había vencido. Se restauró con SQL administrativo autorizado (principal `rooms-pilot-julio-20261025`, grant
`rooms-owner-julio-20261031`, hasta 2027-10-31; recibo
[`2026-10-31-production-activation.md`](../../audits/rooms/2026-10-31-production-activation.md)).

El operador lo calificó de absurdo: **el dueño nunca debe quedar afuera**. El incidente expone tres huecos:

1. **No hay comando para dar acceso interno.** `eligibleContexts` (`src/server/auth/store.ts`) exige
   `identity_bindings` + `principals` (kind `internal`) + `memberships` + `grants` vigentes, y la única forma
   de crearlos en producción es `scripts/bootstrap-production-pilot.ts`, que da 2 horas y sólo a sus actores
   sintéticos. `access.grant`/`access.revoke` existen, pero sólo delegan capacidades **por sala** a un
   principal que ya es miembro: no crean miembros ni bindings.
2. **Nadie se entera del vencimiento.** El acceso vence en silencio; el primer aviso es el login fallido.
3. **El error es JSON crudo.** `/auth/callback` responde `{ error: { code, message } }` a una persona.

## Decisión

**Opción (a): Rooms conserva su autoridad local y gana comandos gobernados para el acceso interno, un
bootstrap de primer administrador y guardas anti-bloqueo. Efeonce ID sigue siendo sólo identidad.**

### D1 — Efeonce ID prueba quién eres; Rooms decide qué puedes hacer

Se mantiene el contrato Accepted de
[Efeonce Auth: Rooms primero y login V4](../EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md): el ID token
omite email, roles, organización y capabilities, y Rooms liga `(issuer, sub)` a un principal autorizado
previamente. Ningún rol de Greenhouse o de Efeonce ID se traduce a un rol de Rooms.

### D2 — Capacidad nueva `members.manage`, de organización

`access.manage` es de **sala** (`resource.kind === 'room'`) y gobierna invitaciones. Ampliarla a organización
mezclaría «compartir una sala» con «decidir quién trabaja en Rooms». Se crea `members.manage`:

- sólo con alcance `organization`;
- sólo el rol `administrator` la tiene en su techo (`roleCapabilities`);
- no se delega con `access.grant` (que rechaza alcance de organización);
- migración: amplía el CHECK de `rooms.grants.capabilities` y su cardinalidad.

### D3 — Tres comandos y un reader, con paridad completa

Los cuatro nacen en el executor canónico (idempotencia por `command_receipts`, lock de organización, errores
saneados) y se exponen por API, SDK, CLI `scripts/rooms.ts` y el adapter MCP stdio local (toolset `write`):

| Operación | Qué hace |
|---|---|
| `members.grantInternal` | Crea o renueva, en una transacción: principal `internal` con rol `operator` o `administrator`, membership, identity binding `(issuer, sub)` y grant de organización con las capacidades pedidas (dentro del techo del rol y de las del actor). Idempotente: repetirlo con el mismo payload devuelve el mismo recibo; con otra vigencia, la extiende. |
| `members.revokeInternal` | Revoca binding, membership, principal y sus grants; revoca las sesiones abiertas de ese sujeto en la organización. |
| `members.renewInternal` | Extiende la vigencia de un miembro existente sin tocar sus capacidades. |
| `members.list` (reader) | Miembros internos con rol, vigencia y última sesión; sin `sub` completo (se muestra un sufijo). |

Vigencia máxima: 12 meses por operación. Durable no significa eterno: se renueva.

### D4 — El sujeto llega por una solicitud de acceso, no por email

Para dar acceso hace falta el `sub` de Efeonce ID. Rooms no lo adivina ni lo deriva del email (D1):

- Cuando un callback termina en `identity_unbound`, Rooms guarda una **solicitud de acceso**
  (`rooms.access_requests`: issuer, subject, código corto, creada, vence a los 7 días; sin email ni nombre).
- La página de error (TASK-2083) muestra ese código: «Pide acceso y comparte este código».
- `members.grantInternal` acepta `accessRequestCode` o, para tooling, `issuer` + `subject` explícitos.
- Cuota: una solicitud vigente por sujeto y un tope global por hora; el código no revela el `sub`.

Hasta que exista esta tabla, la página muestra el `correlationId` de la respuesta como referencia de soporte.

### D5 — Bootstrap del primer administrador

`pnpm access:bootstrap-owner` (dry-run por defecto, `--apply` para escribir):

- corre con la credencial administrativa de la base, fuera de la app: la autoridad es tener esa credencial y
  una referencia de autorización humana (`--authorization "…"`, ≥10 caracteres, se guarda en el evento);
- sólo aplica si la organización tiene **cero** titulares vigentes de `members.manage`;
- escribe con el mismo módulo que `members.grantInternal`, con actor `system:bootstrap`;
- si ya hay un titular, termina con éxito sin escribir y lo informa (no es un atajo para dar acceso);
- adopta el estado restaurado a mano el 2026-10-31 sin reescribirlo: registra un evento `adopted`.

`scripts/bootstrap-production-pilot.ts` queda sólo para la sala sintética; deja de ser la vía de acceso humano.

### D6 — El último administrador no se puede ir

Defensa en capas contra el bloqueo:

1. **Guarda de comando:** revocar, degradar o acortar la vigencia del último titular vigente de
   `members.manage` falla con `last_administrator`.
2. **Guarda en base:** un trigger diferido rechaza el commit que deje la organización sin titulares vigentes
   si antes tenía alguno (protege contra SQL manual y bugs).
3. **Aviso previo:** `members.list` marca `expiring` a 30 días; la superficie interna lo muestra a los
   administradores; `pnpm access:health` lo reporta para operación.
4. **Señal:** `rooms.access.owner_expiring` (warning ≤30 días, error ≤7) y `rooms.access.no_owner` (error).
5. **Bootstrap** (D5) como salida de emergencia documentada.

### D7 — Auditoría propia

`rooms.audit` exige `room_id` y revisión, así que el acceso de organización usa una tabla append-only nueva,
`rooms.access_events` (actor, operación, sujeto con sufijo, vigencia, referencia de autorización, correlación),
con el trigger `reject_mutation` existente. Nunca se borra ni se edita.

## Alternativas descartadas

- **(b) Derivar administradores de la autoridad interna de Efeonce ID.** Obliga a emitir roles u organización
  en el token o a una consulta servidor a servidor, lo que contradice el contrato Accepted (D1) y exige una
  autorización nueva del lado de Auth (clase D10 de la autoridad interna). Además acopla un permiso de Rooms a
  roles que no son de Rooms: ser administrador de Greenhouse no significa poder publicar salas, y quitar a
  alguien de Greenhouse no revocaría su sesión de Rooms a tiempo. Tampoco resuelve el vencimiento silencioso.
  Se puede revisar si Efeonce ID publica un contrato de pertenencia gobernado (ver «Revisar cuando»).
- **Acceso sin vencimiento para el dueño.** Rompe el invariante de que todo acceso vence y se revisa; el
  aviso previo y la renovación resuelven el problema real sin crear una cuenta eterna.
- **Seguir con SQL manual autorizado.** Funcionó una vez, pero no deja auditoría de dominio, no es repetible
  por API ni por un agente y no evita la próxima expiración.
- **Ampliar `access.manage` a organización.** Ver D2.

## Consecuencias

- Rooms gana su primera administración de miembros; la UI llega después, como cliente del mismo contrato.
- Una migración (CHECK de capacidades, `access_requests`, `access_events`, trigger anti-bloqueo).
- El manual de operación de Rooms cambia: dar acceso a una persona es un comando, no un script de canary.

## Contrato de runtime

- Toda escritura de `identity_bindings`, `principals` internos, `memberships` o grants de organización pasa
  por `src/server/access/**`. Ni scripts ni SQL ad hoc.
- El login no cambia: `eligibleContexts` sigue leyendo las mismas tablas.
- Error nuevo del contrato: `last_administrator` (409). Un código de solicitud vencido, consumido o inexistente
  responde `not_found`, igual que cualquier recurso que no se puede ver; no hace falta un código propio.

## Delta de implementación — 2026-10-31 (TASK-2082, código local)

Decisiones tomadas al implementar, dentro del alcance aceptado:

- **Techo de vigencia:** 366 días **desde ahora**, no la vigencia del actor. Con el techo del actor, el último
  administrador nunca podría renovarse a sí mismo y volvería a quedar afuera.
- **Delegación:** nadie entrega una capacidad que no tenga a nivel de organización ni que supere su rol.
- **Guarda de comando:** una escritura falla con `last_administrator` si la organización tenía titular y queda sin
  ninguno, o si su cobertura baja de `min(cobertura previa, ahora + 30 días)`.
- **Guarda en base:** triggers diferidos sobre `grants`, `principals` y `memberships` con una definición única
  (`rooms.member_manager_coverage`). Salida de emergencia explícita para revocar una cuenta comprometida:
  `SET LOCAL rooms.allow_member_manager_gap = 'on'` en la misma transacción, con credencial administrativa.
- **Rol runtime:** permisos por columna (`INSERT` y `UPDATE(role,status,expires_at)` o `UPDATE(status,expires_at)`) sobre
  `principals`, `memberships` e `identity_bindings`; nada más.
- **Actores sintéticos** (demo y pruebas) nunca reciben `members.manage`: sólo se obtiene por `members.*` o por el bootstrap.
- **MCP stdio:** `members.list` está en el toolset `read`; los comandos `members.*` sólo en el toolset explícito
  `members`, nunca en `all`. El step-up cuando los invoca un agente lo decide el ADR del carril de agentes.
- **Solicitud de acceso:** código de 8 caracteres Crockford (`XXXX-XXXX`), guardado como hash, 7 días, uno abierto por
  identidad, tope de 200 por hora. La página `/auth/error` lo muestra en `identity_unbound`.
- **Herramientas:** `pnpm access:bootstrap-owner`, `pnpm access:health` (local) y `pnpm access:production <comando>`
  (proxy + credencial migrator; cada `--apply` exige autorización).

## 4 pilares

| Pilar | Cómo se cumple |
|---|---|
| Seguridad | Capacidad de organización sólo para `administrator`; techo de rol y del actor; sin derivación por email; bootstrap sólo con credencial de base y cero titulares; código de solicitud que no revela el `sub`. |
| Robustez | Una transacción con lock de organización; idempotencia por recibo; trigger diferido anti-bloqueo; vigencia acotada a 12 meses. |
| Resiliencia | Aviso a 30 días, señales `owner_expiring`/`no_owner`, bootstrap documentado y auditado como salida. |
| Escalabilidad | Decenas de miembros por organización; consultas por índice existente `(organization_id, principal_id)`; cuotas en solicitudes. |

## Reglas duras

- **NUNCA** crear o extender acceso interno con SQL manual ni con `bootstrap-production-pilot.ts`.
- **NUNCA** derivar un rol de Rooms desde un rol de Greenhouse, de Efeonce ID o desde el dominio del email.
- **NUNCA** dejar una organización sin titular vigente de `members.manage`.
- **NUNCA** mostrar el `sub` completo en UI, logs o respuestas; sí un sufijo y el código de solicitud.
- **SIEMPRE** que un acceso venza en ≤30 días, avisar antes del vencimiento.

## Abierto (decidido no decidir)

- Quiénes, además del dueño, son administradores: decisión del operador al aplicar.
- UI de miembros: task ui-ux posterior; este ADR sólo exige el contrato.
- Notificación por correo del vencimiento: depende de la política de correo de Rooms.
- Actor agente (2026-10-31, aviso de la sesión de diseño UI): el operador quiere que Rooms se arme y se administre
  sobre todo con agentes que actúan en nombre de una persona. Cómo se autentica ese agente (token de Efeonce ID,
  consentimiento, step-up para escrituras) es materia del ADR del carril de agentes, que propone esa sesión. Este ADR
  no lo decide. Frontera propuesta: aquí se define **qué autoridad tiene la persona en Rooms**; allá, **cómo un agente
  la ejerce en su nombre**. Frontera acordada entre ambas sesiones: el agente se resuelve al principal de la persona. Si
  `members.*` exige step-up humano cuando lo invoca un agente, lo decide el ADR del carril de agentes. Si ese carril
  necesitara un principal propio para el agente, se revisa este ADR antes de empezar TASK-2082.

## Revisar cuando

- Efeonce ID publique un contrato gobernado de pertenencia interna para relying parties.
- Rooms tenga más de una organización operando con equipos propios.
