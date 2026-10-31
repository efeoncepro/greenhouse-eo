# Rooms — Carril de agentes: los agentes arman, las personas aprueban

- Status: **Proposed** (2026-10-31). Pedido del operador: «estas rooms realmente se armarán en el día a día con Codex
  y Claude u otro agente... el flujo principal es creado y administrado por agentes». No autoriza código, push,
  deploy, flags ni cambios en Efeonce ID, en el gateway ni en otras tasks.
- Owner: Platform (contrato y runtime `efeonce-rooms`). Identidad: EPIC-044 (Efeonce ID). Federación:
  `efeonce-mcp`. Producto: Commercial decide qué sale al cliente.
- Epic: EPIC-052. Se apoya en el [acceso interno durable](EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md)
  (TASK-2082, Accepted) y lo enmienda en un punto: §Enmiendas.
- Reversibility: two-way-but-slow.
  - Lo que se revierte con interruptores: provider del gateway en `policy-blocked`, flag de Rooms y revocación del
    consentimiento.
  - Lo que es de una vía: la forma del token delegado y las columnas de actor. Una vez emitidos tokens y escritas
    filas, ese contrato se conserva.
- Revisión adversarial: 24 hallazgos sobre el primer borrador, verificados contra el código e incorporados.

## Contexto

Rooms tiene paridad Full API: crear salas, armar bloques y escenas, publicar, invitar y presentar son comandos con
API, SDK, CLI y un MCP stdio local. El operador fijó que el trabajo diario lo harán agentes y que la interfaz sirve
para revisar y aprobar. Hoy no funciona en producción, por estas razones verificadas en el código:

1. **El agente no tiene identidad propia.** La CLI y el MCP local se autentican con `--session-file`, una cookie de
   sesión humana copiada a un archivo (`scripts/lib/rooms-cli-session.ts`). Un agente con ese archivo **es** la
   persona para el servidor. `resolvePrincipal` no lee `Authorization` (`src/server/session.ts:15-36`), y
   `ROOMS_ACCESS_TOKEN` no corresponde a nada en el servidor.
2. **Ese camino ya ejecuta lo más delicado.** Los toolsets locales de escritura exponen, con cookie:
   - `editions.publish`;
   - `access.grant` / `access.revoke`;
   - invitaciones y presentación;
   - y, con TASK-2082, `members.*` (`src/server/mcp/manifest.ts`).
3. **Efeonce ID no emite tokens para Rooms.** El access token tiene una sola audiencia, la del gateway. Otro
   `resource` se rechaza con `invalid_target`, y solo hay `authorization_code` y `refresh_token`.
   [TASK-1917](../../tasks/to-do/TASK-1917-efeonce-id-agent-run-delegation-act.md) diseña `act` para corridas **en
   segundo plano de Marketing Studio**: audiencia del gateway, autoridad releída por el canje de Greenhouse, atada a
   un work item. **No cubre agentes interactivos ni una segunda audiencia.**
4. **El emisor nativo no delega escrituras.** La autoridad interna v2 solo delega `growth.seo.observation.read`.
   Una clase nueva de escritura necesita su propia autorización, según D10 de
   [autoridad interna nativa](../EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md).
5. **No hay MCP remoto.** El MCP de Rooms es stdio local ([ADR](EFEONCE_ROOMS_LOCAL_STDIO_MCP_DECISION_V1.md)).
6. **Lo que llega al cliente se ejecuta directo.** Publicar, invitar, dar acceso, responder preguntas en ediciones
   publicadas y archivar salas corren apenas pasan capacidad, revisión e idempotencia. Publicar exige además que la
   cobertura permita publicar.
7. **No se sabe quién actuó.** `command_receipts` y `audit` guardan `principal_id` sin tipo de actor. `outbox` guarda
   solo el aggregate.
8. **Rooms no tiene step-up.** La sesión guarda `auth_time`, pero no `acr` ni `amr`
   (`migrations/1792964148932_rooms-oidc-consumer.sql`).
9. **Al agente le faltan insumos.** Los puertos de Radiografía AEO y CRM corren sin adapters (`unavailable`). Los
   bytes entran solo por CLI con cookie y el MCP los excluye.

## Decisión

**Un agente opera Rooms en producción solo a través del gateway `mcp.efeonce.org`, en nombre de una persona interna
y con los permisos de esa persona como techo. Rooms decide la autoridad.**

- Todo lo que el cliente puede ver o que cambia autoridad, el agente lo deja como **propuesta**. Una persona la
  confirma con una verificación de presencia ligada a esa propuesta.
- El camino de la cookie copiada deja de poder ejecutar esas acciones.

### D0 — Cerrar el camino actual primero (antes de cualquier otra parte)

- Rooms marca las sesiones exportadas para CLI o MCP local como canal `cli`, distinto de la sesión de navegador.
- Una sesión `cli` nunca ejecuta operaciones de clase `release` o `access` (D2) y nunca confirma propuestas: solo
  puede crearlas con `proposals.create`.
- Los toolsets locales cambian sus herramientas de esas clases por `proposals.create`.
- Las revocaciones protectoras siguen directas (D2).

### D1 — Identidad: Rooms acepta un token delegado solo si lo presenta el gateway

- **Cómo llega.** El agente se conecta al gateway con el flujo vigente: PKCE, consentimiento por scope y step-up
  para escribir. Para llamar a Rooms, el gateway presenta **dos credenciales juntas**:
  - su propia identidad de workload: Google ID token con audiencia exacta de Rooms, igual que con Globe;
  - un **token delegado de Efeonce ID** para la audiencia de Rooms, con:
    - `sub` = la persona;
    - `act` = el agente (atribución) y el gateway;
    - scope reducido a las clases `efeonce.mcp.rooms.*` consentidas;
    - `organizationId` de la llamada;
    - TTL ≤ 5 min.

  El gateway no emite tokens ni reenvía el token del usuario: el delegado es otro token, para otra audiencia.
- **Qué verifica Rooms.**
  - Exige las dos credenciales y rechaza un bearer sin `act` o sin la identidad del gateway. **Un bearer siempre
    significa agente.**
  - Comprueba firma (JWKS de `auth.efeonce.org`), `iss`, `aud` exacto, `exp` y `scope`.
  - Introspecta el token (RFC 7662) como cliente confidencial, con caché ≤ 30 s. Así la revocación corta antes de
    30 s, igual que hoy la sesión humana revalida con el emisor.
  - Resuelve el principal por `rooms.identity_bindings (issuer, sub, organization_id)` con la organización de la
    llamada, binding vigente y principal `internal`. Las personas externas o invitadas nunca operan por este carril.
- **No hay principal de agente.** El agente nunca tiene más autoridad que la persona. `act` es atribución, no
  frontera de seguridad: Codex y Claude Code son clientes públicos y cualquier proceso local puede repetir su
  `client_id`. La frontera la ponen tres cosas:
  - la identidad del gateway;
  - los scopes;
  - las propuestas.
- **Dependencia en EPIC-044.** Hace falta una task nueva: delegación interactiva para un segundo resource server.
  Cubre el canje en el emisor, la audiencia de Rooms, el `act` del cliente y la autorización D10 de las clases
  `efeonce.mcp.rooms.*`. TASK-1917 no cubre este caso. Enmendarla para incluirlo requiere la aprobación del
  operador.
- **Solo emisor nativo.** El carril es exclusivo del emisor nativo. Quien entre al gateway con Entra recibe un
  motivo explícito, no una falla silenciosa.

### D2 — Clases de scope, derivadas del catálogo de operaciones

La clasificación se **genera desde el catálogo canónico** (`canonicalMcpOperations`) con un guard de paridad.
Toda operación tiene clase o exclusión con motivo, y una operación nueva sin clasificar rompe el build.

| Clase | Regla | Ejemplos actuales | Ejecución por agente |
| --- | --- | --- | --- |
| `efeonce.mcp.rooms.read` | Lectura sin contenido escrito por el cliente ni datos personales | salas, borradores, ediciones, cobertura, «Ver como», estado de medios, catálogo | Directa |
| `efeonce.mcp.rooms.author` | Cambios que el cliente nunca ve | `rooms.create`, `rooms.updateDraft`, `content.upsertBlock`, `content.arrange`, `content.importManifest`, `content.linkEvidence`, `editions.reopen`, subidas e importaciones a borrador | Directa. Es una excepción de nivel 1 al invariante del gateway; se registra en un delta del gateway |
| `efeonce.mcp.rooms.release` | Todo lo que el cliente puede ver | `editions.publish`, `rooms.archive`, `invitations.create/reissue/retryDelivery`, `questions.answer/resolve`, `steps.*`, `tours.upsert`, inicio de presentación, `integrations.requestHandoff` | Solo propuesta |
| `efeonce.mcp.rooms.access` | Dar autoridad | `access.grant`, `members.grantInternal/renewInternal` | Solo propuesta. Confirmar exige presencia fresca |
| Revocación protectora | Quitar acceso | `invitations.revoke`, `access.revoke`, `members.revokeInternal` | Directa con auditoría: no espera aprobación en un incidente |
| `efeonce.mcp.rooms.read.client` | Preguntas y textos del cliente, nombres de invitados, correos, señales por persona | `questions.list`, `invitations.list`, gestión de invitaciones, `activity`, `signals` | **Apagada** hasta una decisión de gobierno de datos para IA |
| Excluidas | Bytes, URLs firmadas, OTP, presencia, progreso, perfil, tiempo real | `uploads.getTransfer`, `media.authorizeDelivery`, `invitations.resend`, `progress.mark`, `live.*`, `profile.update`, `presentation.control/ack` | Nunca |

### D3 — Propuestas: aggregate propio de Rooms, con confirmación humana ligada a lo revisado

- **Crear.**
  - Comando explícito `proposals.create {operation, input}`, con su propia idempotencia: la clave del agente
    corresponde a una propuesta.
  - Llamar directo a una operación `release` o `access` con un bearer o una sesión `cli` responde
    `403 proposal_required`. Los contratos tipados existentes no cambian de forma.
  - Solo puede proponer quien **tiene** la capacidad destino; se vuelve a verificar al confirmar. Un operador sin
    `editions.publish` no puede hacer que su agente proponga una publicación para que la apruebe un administrador.
  - Tope de propuestas pendientes por persona y por sala.
- **Qué se guarda.** Tabla `rooms.action_proposals`, con eventos append-only en `rooms.action_proposal_events`.
  - Estados `pending → executing → confirmed | failed`, más `rejected | expired | stale`, con transiciones validadas
    por `CHECK`.
  - Cada propuesta guarda:
    - la operación y la entrada validada;
    - el **hash del contenido objetivo**: el manifiesto de la edición, la entrada de la invitación o la versión del
      estado del miembro;
    - la revisión de la sala;
    - el proponente (persona + `act`);
    - el vencimiento;
    - el id del receipt al ejecutar.
- **Resumen y diff.** El **servidor** genera el resumen y el diff a partir de la entrada validada. La nota del agente
  se muestra aparte y marcada como texto no verificado, porque es un canal de inyección hacia quien aprueba.
- **Confirmar.** `proposals.confirm` acepta **solo** una sesión de navegador same-origin.
  - Rechaza cualquier petición con `Authorization`, una sesión `cli` o una cookie junto con un bearer.
  - Exige una **verificación de presencia ligada a la propuesta**: reautenticación en Efeonce ID con `max_age=0`, o
    passkey con verificación de usuario, sobre el id de la propuesta y el hash que la persona vio. La confirmación
    lleva ese hash y, si no coincide con el objetivo actual, queda `stale`.
  - Rooms guarda `acr`/`amr` en la sesión para comprobarlo.
  - Todo ocurre en una transacción: `SELECT … FOR UPDATE` de la propuesta, lock de organización, validación de
    vencimiento y hash en el servidor, ejecución del comando canónico con la **idempotencia = id de la propuesta**
    (sea quien sea el que confirma) y registro del receipt.
  - Si el comando falla (cobertura, entrega de correo), queda `failed` con el motivo.
- **Cascada.** Si el proponente pierde su binding, su membresía o el consentimiento, sus propuestas pendientes pasan
  a `expired` con motivo.
- **Quién confirma.** Cualquier persona con la capacidad en esa sala, no solo la que delegó.
- **Riesgo residual.** Un agente que maneja el navegador real de la persona (Claude in Chrome, Playwright) produce una
  sesión genuina. La presencia fresca por propuesta (`max_age=0` o passkey con gesto físico) es lo que lo frena, por
  eso es obligatoria en `release` y `access`.

### D4 — Registro de actor

- Migración aditiva con `actor_kind` (`person|agent`), `agent_client_id`, `channel` (`browser|cli|gateway`) y
  `proposal_id` en:
  - `command_receipts`, `audit` (de ahí la hereda `outbox`, por FK);
  - `collaboration_events`, `crm_handoffs`, `source_imports`;
  - los eventos de acceso de TASK-2082.
- `principal_id` sigue siendo la persona. Lo confirmado se registra como hecho por quien confirmó, enlazado a la
  propuesta.

### D5 — Insumos gobernados

- **Medios.** `media.importFromSource`: Rooms trae los bytes desde fuentes en lista blanca, con guard anti-SSRF:
  - piezas aprobadas en buckets de Efeonce;
  - `@efeoncepro/axis-brand-assets`;
  - una subida hecha por una persona.

  Nunca una URL que dicte el modelo. El agente no ve URLs firmadas ni bytes.
- **Fuentes.** Adapters reales para los puertos de Radiografía AEO y CRM, con flags `ROOMS_XRAY_SOURCE_ENABLED` y
  `ROOMS_CRM_REFERENCE_ENABLED`, OFF hasta su canary.
  - Cada llamada a Greenhouse lleva **la autoridad delegada de la persona**, y Greenhouse vuelve a correr
    `can(persona, …)`.
  - Rooms nunca usa una identidad de servicio para leer Greenhouse, porque un agente podría traer datos que la
    persona no ve (confused deputy).
  - Nunca HubSpot directo. Rooms recibe un snapshot y no sincroniza.

### D6 — Oficio y evaluación

- Skill de oficio separada de la skill operativa `efeonce-rooms`: del deal o del brief a la sala.
- Antes de usarla con clientes, un **eval de referencia**: dos briefs sintéticos con su sala esperada. Se mide:
  - cobertura;
  - cero marcadores en salas reales;
  - afirmaciones con fuente;
  - cero llamadas directas a `release` o `access`.

  Cada cambio de la skill vuelve a correr el eval.

### D7 — La interfaz del equipo es una bandeja de revisión

- La pantalla principal del equipo es **«Para revisar»**: propuestas con el diff que generó el servidor, salas
  armadas por agentes, «Ver como cliente», y confirmar o rechazar con la verificación de presencia.
- La autoría manual sigue disponible.
- Paridad: `proposals.list`, `proposals.reject` y `proposals.confirm`. Este último existe por API, pero solo para
  sesión de navegador.

### D8 — Interruptores y cuotas

- **Tres interruptores independientes:**
  - provider `rooms` en el gateway: `enabled | policy-blocked`;
  - `ROOMS_AGENT_LANE_ENABLED`: sin él, Rooms rechaza todo bearer;
  - revocación en Efeonce ID, efectiva antes de 30 s por la introspección.
- **Cuotas:** las del gateway por clase, los topes de propuestas pendientes y un caché del token delegado nunca
  mayor a su TTL.

## Enmiendas a decisiones vigentes (efectivas solo si este ADR se acepta)

- **[Contrato de API y acceso](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).** Hoy dice que producción no acepta un
  bearer nativo y que los operadores nunca usan tokens MCP. Pasa a decir: la autoridad de producción acepta **solo**
  el token delegado de D1, presentado junto con la identidad del gateway. Ningún otro bearer, ni de CLI ni directo.
  El gateway sigue siendo adaptador y la política la decide Rooms.
- **[Acceso interno durable](EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md) / TASK-2082.**
  - El modelo de principal no cambia: el agente se resuelve a la persona.
  - Cambia la exposición. `members.grantInternal/renewInternal` no se ejecutan por MCP local ni por CLI: se
    proponen.
  - `members.revokeInternal` sigue directo, como revocación protectora.
  - Sus eventos de acceso suman las columnas de D4.
- **[MCP stdio local](EFEONCE_ROOMS_LOCAL_STDIO_MCP_DECISION_V1.md).** Sus toolsets de escritura pierden las
  herramientas `release` y `access` y ganan `proposals.create` (D0).

## Alternativas descartadas

- **Seguir con `--session-file`.** El agente usa la cookie de la persona: sin atribución, sin scopes, con riesgo de
  robo y con poder total sobre publicar y dar acceso.
- **Principal o cuenta de servicio para agentes.** Es una identidad paralela con poder sin dueño. Contradice el ADR
  de acceso.
- **Que el gateway reenvíe el token del usuario.** Rompe la invariante del gateway y confunde audiencias.
- **Autoridad de Rooms en Greenhouse, por su canje.** Greenhouse no es la autoridad de Rooms. Por eso TASK-1917
  sirve para Studio y no para Rooms. Greenhouse sí relee la autoridad cuando Rooms lee sus datos (D5).
- **Aceptar bearer con `act` presentado por cualquiera.** `act` no se puede proteger en clientes públicos, así que
  sin la identidad del gateway no hay frontera.
- **Publicar o invitar con step-up de sesión.** El step-up es una ventana de tiempo: autoriza muchas acciones y no
  prueba que alguien revisó esta.
- **Aprobación validada en el cliente, como Nexa hoy.** Un vencimiento que no revisa el servidor no es un control.
- **Revocaciones como propuestas.** Frenan la respuesta a un incidente.

## Consecuencias

- Rooms se puede operar por agentes con la autoridad exacta de una persona, con rastro, y sin que nada llegue al
  cliente sin una persona presente.
- **D0, D3, D4 y D7 se construyen ya**, porque no dependen de Efeonce ID. Desde el primer día cierran el camino de
  la cookie.
- D1 depende de una task nueva de EPIC-044 y de su liberación (PR #263/#264 retenidos). Hasta entonces, los agentes
  solo trabajan en local, creando borradores y propuestas.
- Confirmar cuesta un gesto más: reautenticarse o tocar la passkey. Es el precio de que publicar requiera a alguien.
- El gateway suma un provider con escrituras de nivel 1, propuestas, canary real y su lugar en
  `efeonce.gateway.status`.

## Puntuación

| Pilar | Evaluación |
| --- | --- |
| Seguridad | Capas independientes antes del cliente: canal (`cli` y bearer no ejecutan `release`/`access`), identidad del gateway, scopes por clase, capacidad del proponente, propuesta y presencia fresca ligada al hash. Sin identidad paralela, bytes ni URLs en el modelo, y lecturas sensibles apagadas. Residual: una persona aprueba sin leer; lo mitigan el diff del servidor y el eval |
| Robustez | Idempotencia = id de la propuesta; transacción con `FOR UPDATE` y lock de organización; `stale` por hash; `failed` con motivo; vencimiento en el servidor; clasificación generada con guard de paridad |
| Resiliencia | Tres interruptores; revocación antes de 30 s; cascada al perder autoridad; ledger append-only; señales `rooms.agent.proposals_failed`, `rooms.agent.bearer_rejected` y `rooms.agent.proposals_expired`, con steady en la implementación |
| Escalabilidad | Una scope por clase; cuotas por clase y topes de pendientes; introspección con caché ≤ 30 s; el modelo no cambia con 10× más agentes |

## Reglas duras

- **NUNCA** un principal ni grants propios para un agente.
- **NUNCA** un agente, un bearer o una sesión `cli` ejecuta una operación `release` o `access`: crean una propuesta.
- **NUNCA** `proposals.confirm` con `Authorization`, una sesión `cli` o sin presencia fresca ligada al id y al hash.
- **NUNCA** aceptar un bearer sin `act` o sin la identidad de workload del gateway.
- **NUNCA** validar vencimiento, hash o capacidad de una propuesta solo en el cliente.
- **NUNCA** emitir tokens fuera de Efeonce ID, ni reenviar al provider el token del usuario.
- **NUNCA** URLs firmadas, bytes, URLs arbitrarias ni lecturas `read.client` en el contexto del modelo sin su
  decisión de gobierno.
- **NUNCA** leer Greenhouse con una identidad de servicio en nombre de un agente, ni HubSpot directo.
- **SIEMPRE** clasificar cada operación nueva en el catálogo o excluirla con un motivo escrito: el build falla si no.
- **SIEMPRE** registrar `actor_kind`, `agent_client_id`, `channel` y `proposal_id` en cada escritura.

## Abierto

- Vencimiento por defecto: 72 h para publicar, 24 h para invitar o dar acceso (propuesta).
- A quién se avisa de una propuesta nueva: la persona delegante o los administradores de la sala.
- Si la verificación de presencia es `max_age=0` o passkey; depende de lo que Efeonce ID soporte al implementar.
- Umbrales del eval y quién los aprueba.
- Decisión de gobierno de datos para IA antes de abrir `read.client`.

## Orden (cada parte con su task)

1. **Rooms, ya:** D0 (canal `cli` sin `release`/`access`), D3 (propuestas, confirmación y presencia), D4 (actor) y
   D7 (bandeja). Enmienda TASK-2082.
2. **EPIC-044, task nueva:** delegación interactiva para la audiencia de Rooms (canje, `act`, D10 de las clases).
   Bloqueada por la retención de Efeonce ID.
3. **Rooms:** verificador de D1 y scopes de D2 detrás de `ROOMS_AGENT_LANE_ENABLED`.
4. **`efeonce-mcp`:** provider `rooms`, con `read` y `author` primero y `proposals.create` después.
5. **D5:** fuentes y medios, cada uno con su canary.
6. **D6:** skill de oficio y eval de referencia.
