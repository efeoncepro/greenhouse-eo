# Rooms — Carril de agentes: los agentes son ciudadanos de primera clase

- Status: **Accepted** (2026-10-31). Decisiones del operador:
  - «estas rooms realmente se armarán en el día a día con Codex y Claude u otro agente... el flujo principal es
    creado y administrado por agentes»;
  - sobre el borrador que proponía aprobación humana: «Los agentes son ciudadanos de primera clase, pueden dar acceso
    y publicar»;
  - «avancemos con todo».

  Autoriza el código y las tasks. Las mutaciones de producción (Efeonce ID, gateway, migraciones, flags) siguen sus
  propios gates y readbacks.
- Owner: Platform (contrato y runtime `efeonce-rooms`). Identidad: EPIC-044 (Efeonce ID). Federación:
  `efeonce-mcp`. Producto: Commercial decide qué sale al cliente.
- Epic: EPIC-052. Se apoya en el [acceso interno durable](EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md)
  (TASK-2082).
- Reversibility: two-way-but-slow.
  - Lo que se revierte con interruptores: provider del gateway en `policy-blocked`, flag de Rooms y revocación del
    consentimiento.
  - Lo que es de una vía: la forma del token delegado y las columnas de actor.
- Historia: el primer borrador (Proposed, commit `5c47fb883`) exigía propuesta y confirmación humana para publicar y
  dar acceso. El operador lo descartó. Los controles de la revisión adversarial que no dependían de esa aprobación se
  conservan.

## Contexto

Rooms tiene paridad Full API: crear salas, armar bloques y escenas, publicar, invitar y presentar son comandos con
API, SDK, CLI y un MCP stdio local. El operador fijó que el trabajo diario lo hacen agentes, con los mismos
derechos que una persona del equipo. Hoy no funciona en producción, por estas razones verificadas en el código:

1. **El agente no tiene identidad propia.** La CLI y el MCP local se autentican solo con `--session-file`, una cookie
   humana copiada (`scripts/lib/rooms-cli-session.ts`). `resolvePrincipal` no lee `Authorization`
   (`src/server/session.ts:15-36`), y `ROOMS_ACCESS_TOKEN` no corresponde a nada en el servidor. Un agente con la
   cookie **es** la persona: sin atribución ni scopes.
2. **Efeonce ID no emite tokens para Rooms.** Hay una sola audiencia (el gateway), `resource` distinto da
   `invalid_target`, y solo existen `authorization_code` y `refresh_token`.
   [TASK-1917](../../tasks/to-do/TASK-1917-efeonce-id-agent-run-delegation-act.md) diseña `act` para corridas en
   segundo plano de Marketing Studio: audiencia del gateway, canje en Greenhouse. **No cubre agentes interactivos ni
   una segunda audiencia.**
3. **El emisor nativo no delega escrituras.** La autoridad interna v2 solo delega `growth.seo.observation.read`. Una
   clase nueva necesita su propia autorización, según D10 de
   [autoridad interna nativa](../EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md).
4. **No hay MCP remoto.** Solo stdio local ([ADR](EFEONCE_ROOMS_LOCAL_STDIO_MCP_DECISION_V1.md)).
5. **No se sabe quién actuó.** `command_receipts` y `audit` guardan `principal_id` sin tipo de actor. `outbox` guarda
   solo el aggregate. `rooms.access_events` (TASK-2082) guarda `actor` como `principal:<id>`.
6. **Al agente le faltan insumos.** Los puertos de Radiografía AEO y CRM corren sin adapters. Los bytes entran solo
   por CLI con cookie y el MCP los excluye.

## Decisión

**Un agente opera Rooms con los mismos derechos que la persona en cuyo nombre actúa, incluidos publicar, invitar y
dar acceso, y lo hace directo, sin aprobación previa. En producción entra solo por el gateway `mcp.efeonce.org` con
un token delegado de Efeonce ID.**

La seguridad no viene de frenar al agente, sino de cinco cosas:
1. identidad verificable;
2. scopes consentidos con step-up;
3. registro completo de quién actuó;
4. aviso a la persona;
5. reversión rápida.

### D1 — Identidad: token delegado presentado por el gateway

- **Cómo llega.** El agente se conecta al gateway con el flujo vigente: PKCE, consentimiento por scope y step-up al
  consentir scopes de escritura. Para llamar a Rooms, el gateway presenta **dos credenciales juntas**:
  - su identidad de workload: Google ID token con audiencia exacta de Rooms, igual que con Globe;
  - un **token delegado de Efeonce ID** para la audiencia de Rooms, con:
    - `sub` = la persona;
    - `act` = el agente (atribución) y el gateway;
    - scope reducido a las clases `efeonce.mcp.rooms.*` consentidas;
    - `organizationId`;
    - TTL ≤ 5 min.

  El gateway no emite tokens ni reenvía el token del usuario.
- **Qué verifica Rooms.**
  - Exige ambas credenciales. Un bearer sin `act` o sin la identidad del gateway se rechaza.
  - Comprueba firma (JWKS de `auth.efeonce.org`), `iss`, `aud` exacto, `exp` y `scope`.
  - Introspecta el token (RFC 7662) con caché ≤ 30 s, para que una revocación corte antes de 30 s.
  - Resuelve el principal por `rooms.identity_bindings (issuer, sub, organization_id)`, con binding vigente y
    principal `internal`. Las personas externas o invitadas nunca operan por este carril.
- **Autoridad de la persona, no un principal paralelo.** Ciudadano de primera clase significa que el agente puede
  hacer **todo** lo que puede su persona: autoría, publicar, invitar, dar y quitar acceso. No significa más que eso.
  - No hay grants propios del agente, así que si la persona pierde un permiso, su agente también.
  - `act` es atribución, no frontera de seguridad: Codex y Claude Code son clientes públicos. La frontera la ponen la
    identidad del gateway y los scopes.
- **Dependencia en EPIC-044.** Task nueva: delegación interactiva para un segundo resource server. Cubre el canje en
  el emisor, la audiencia de Rooms, el `act` del cliente y la autorización D10 de las clases `efeonce.mcp.rooms.*`.
  Es solo para el emisor nativo; quien entra con Entra recibe un motivo explícito.
- **CLI y MCP local.** Siguen con `--session-file` en desarrollo y operación local. Rooms marca esas sesiones con
  canal `cli` para atribuirlas (D3). Tienen los mismos derechos que la persona y no se recortan.

### D2 — Clases de scope, derivadas del catálogo de operaciones

La clasificación se **genera desde el catálogo canónico** (`canonicalMcpOperations`) con un guard de paridad. Toda
operación tiene clase o exclusión con motivo, y una operación nueva sin clasificar rompe el build. Todas las clases
se ejecutan directo; la diferencia está en qué consiente la persona y con qué factor.

| Clase | Qué incluye | Consentimiento |
| --- | --- | --- |
| `efeonce.mcp.rooms.read` | Salas, borradores, ediciones, cobertura, «Ver como», estado de medios | Normal |
| `efeonce.mcp.rooms.read.client` | Preguntas y textos del cliente, invitados y sus correos, actividad y señales | Explícito y aparte. Antes de habilitarlo para clientes reales, revisión de gobierno de datos IA (`greenhouse-ai-creative-rights-governance` + legal) |
| `efeonce.mcp.rooms.author` | `rooms.create`, `rooms.updateDraft`, `content.*`, `editions.reopen`, subidas e importaciones a borrador | Step-up al consentir |
| `efeonce.mcp.rooms.release` | `editions.publish`, `rooms.archive`, `invitations.*` de gestión, `questions.answer/resolve`, `steps.*`, `tours.upsert`, presentación, `integrations.requestHandoff` | Step-up al consentir |
| `efeonce.mcp.rooms.access` | `access.grant/revoke`, `members.grantInternal/renewInternal/revokeInternal` | Step-up al consentir |
| Excluidas | Bytes, URLs firmadas, OTP del invitado, `progress.mark`, `live.*`, `profile.update`, `presentation.control/ack` | Nunca: no son acciones de negocio sino presencia, transporte o la identidad de otra persona |

### D3 — Registro de actor y aviso a la persona

- **Columnas nuevas.** Migración aditiva con `actor_kind` (`person|agent`), `agent_client_id` y `channel`
  (`browser|cli|gateway`) en:
  - `command_receipts` y `audit` (`outbox` la hereda por FK);
  - `collaboration_events`, `crm_handoffs` y `source_imports`;
  - `rooms.access_events`.

  `principal_id` sigue siendo la persona.
- **Aviso.** Cada acción `release` o `access` hecha por un agente avisa a la persona en cuyo nombre actuó, en la
  actividad de Rooms y por el canal que defina la implementación (correo o Teams). Incluye qué hizo, sobre qué sala
  y cómo revertirlo.
- La interfaz y «Qué cambió» muestran «publicado por agente X para Julio».

### D4 — Reversión rápida

Cada acción que llega al cliente tiene su reversa, como comando con la misma paridad:

| Acción | Reversa |
| --- | --- |
| Publicar | `editions.publish` de la edición anterior (republicar), o `rooms.archive` |
| Invitar | `invitations.revoke`, efectivo de inmediato |
| Dar acceso | `access.revoke` / `members.revokeInternal` |
| Responder o resolver | Nueva respuesta o reapertura |

La pantalla «Actividad de agentes» lista lo que hicieron y ofrece la reversa con un clic. Un agente también puede
revertir.

### D5 — Insumos gobernados

- **Medios.** `media.importFromSource`: Rooms trae los bytes desde fuentes en lista blanca, con guard anti-SSRF:
  - piezas aprobadas en buckets de Efeonce;
  - `@efeoncepro/axis-brand-assets`;
  - una subida hecha por una persona.

  El agente nunca ve URLs firmadas ni bytes.
- **Fuentes.** Adapters reales para los puertos de Radiografía AEO y CRM, con flags `ROOMS_XRAY_SOURCE_ENABLED` y
  `ROOMS_CRM_REFERENCE_ENABLED`, OFF hasta su canary.
  - Cada lectura a Greenhouse lleva la autoridad delegada de la persona, y Greenhouse vuelve a correr
    `can(persona, …)`. Nunca una identidad de servicio, para evitar el confused deputy.
  - Nunca HubSpot directo. Rooms recibe un snapshot.

### D6 — Oficio y evaluación

- Skill de oficio separada de la operativa `efeonce-rooms`: del deal o brief a la sala, publicación e invitación
  incluidas.
- **Eval de referencia antes del primer cliente real.** Dos briefs sintéticos con su sala esperada. Se mide:
  - cobertura;
  - cero marcadores en salas reales;
  - afirmaciones con fuente;
  - invitaciones solo a correos que estén en el deal;
  - publicar solo con cobertura completa.

  Cada cambio de la skill vuelve a correr el eval. Como el agente publica sin aprobación, el eval es el control de
  calidad principal.

### D7 — Interruptores y cuotas

- **Tres interruptores independientes:**
  - provider `rooms` del gateway: `enabled | policy-blocked`;
  - `ROOMS_AGENT_LANE_ENABLED`: sin él, Rooms rechaza todo bearer;
  - revocación en Efeonce ID, efectiva antes de 30 s.
- **Cuotas** del gateway por clase. En Rooms, topes por persona y por hora de publicaciones e invitaciones hechas
  por agentes: un agente en bucle no puede mandar cien invitaciones.
- **Señales:**
  - `rooms.agent.release_actions` (volumen contra línea base);
  - `rooms.agent.bearer_rejected`;
  - `rooms.agent.quota_hit`.

## Enmiendas a decisiones vigentes

- **[Contrato de API y acceso](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).** Producción acepta **solo** el token
  delegado de D1, presentado junto con la identidad del gateway. Ningún otro bearer.
- **[Acceso interno durable](EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md) / TASK-2082.**
  - Sin cambio de exposición: `members.*` sigue disponible para agentes, local y remoto.
  - `rooms.access_events` suma `actor_kind`, `agent_client_id` y `channel`.
  - **El gate de merge de TASK-2082 sobre el MCP local queda resuelto: no se quitan operaciones.**
- **[MCP stdio local](EFEONCE_ROOMS_LOCAL_STDIO_MCP_DECISION_V1.md).** Sin cambio de herramientas; suma canal `cli`
  para atribución.

## Alternativas descartadas

- **Propuesta obligatoria con confirmación humana** (primer borrador). La descartó el operador: los agentes son
  ciudadanos de primera clase. Se compensa con atribución, aviso, reversión, cuotas y eval.
- **Seguir solo con `--session-file` en producción.** Sin atribución ni scopes, con riesgo de robo de sesión.
- **Principal o cuenta de servicio propia del agente.** Sería poder sin dueño. Con la autoridad de la persona, el
  agente es igual de capaz y siempre tiene un responsable.
- **Que el gateway reenvíe el token del usuario.** Rompe la invariante del gateway.
- **Autoridad de Rooms en Greenhouse por su canje.** Greenhouse no es la autoridad de Rooms.
- **Aceptar un bearer con `act` presentado por cualquiera.** `act` no se puede proteger en clientes públicos.

## Consecuencias

- Los agentes arman, publican, invitan y dan acceso, con rastro y avisos, sin esperar a nadie.
- Riesgo aceptado: un agente puede publicar o invitar algo equivocado. Lo contienen el eval, las cuotas, el aviso
  inmediato y la reversa con un clic.
- **Se construye ya en Rooms**, sin depender de Efeonce ID: D3, D4, D7 en la parte de Rooms, y la clasificación de
  D2 con su guard. Con la CLI y el MCP local, los agentes ya operan con atribución.
- D1 depende de la task nueva de EPIC-044 y de liberar la retención de Efeonce ID (PR #263/#264).

## Puntuación

| Pilar | Evaluación |
| --- | --- |
| Seguridad | Autoridad = persona (sin poder paralelo), identidad del gateway + token delegado con introspección, scopes con step-up, `read.client` aparte, nada de bytes ni URLs en el modelo, aviso por cada acción hacia el cliente. Residual aceptado: errores del agente visibles para el cliente, contenidos por eval, cuotas y reversa |
| Robustez | Mismos comandos canónicos, con idempotencia, lock y cobertura; clasificación generada con guard de paridad |
| Resiliencia | Tres interruptores, revocación antes de 30 s, reversa por comando, señales de volumen y rechazo, auditoría append-only con actor |
| Escalabilidad | Una scope por clase; cuotas por persona y hora; introspección con caché; 10× más agentes no cambia el modelo |

## Reglas duras

- **NUNCA** un principal ni grants propios para un agente: actúa con la autoridad exacta de una persona interna.
- **NUNCA** aceptar en producción un bearer sin `act` o sin la identidad de workload del gateway.
- **NUNCA** emitir tokens fuera de Efeonce ID, ni reenviar al provider el token del usuario.
- **NUNCA** URLs firmadas, bytes ni URLs arbitrarias en el contexto del modelo.
- **NUNCA** leer Greenhouse con una identidad de servicio en nombre de un agente, ni HubSpot directo.
- **NUNCA** habilitar `read.client` con clientes reales sin su revisión de gobierno de datos IA.
- **SIEMPRE** registrar `actor_kind`, `agent_client_id` y `channel` en cada escritura.
- **SIEMPRE** avisar a la persona de cada acción `release` o `access` de su agente, con la forma de revertirla.
- **SIEMPRE** clasificar cada operación nueva en el catálogo o excluirla con un motivo escrito.
- **SIEMPRE** correr el eval de oficio antes de cambiar la skill que arma salas.

## Abierto

- Canal del aviso (correo, Teams o solo actividad en Rooms) y si se agrupa por hora.
- Topes exactos por persona y hora.
- Umbrales del eval y quién los aprueba.
- Alcance de la revisión de gobierno de datos IA para `read.client`.

## Orden (cada parte con su task)

1. **Rooms, ya:** D3 (actor y aviso), D4 («Actividad de agentes» y reversa), D7 (cuotas y señales) y el guard de
   clasificación de D2.
2. **EPIC-044, task nueva:** delegación interactiva para la audiencia de Rooms. Bloqueada por la retención de
   Efeonce ID.
3. **Rooms:** verificador de D1 detrás de `ROOMS_AGENT_LANE_ENABLED`.
4. **`efeonce-mcp`:** provider `rooms` con todas las clases y canary real.
5. **D5:** fuentes y medios, cada uno con su canary.
6. **D6:** skill de oficio y eval, antes del primer cliente real.
