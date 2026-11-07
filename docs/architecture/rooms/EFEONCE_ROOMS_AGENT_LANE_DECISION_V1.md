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
- **Enmienda D1-bis (2026-11-01, decisión del operador: «CLI primero»):** antes del gateway, un carril directo por
  CLI con un cliente público first-party de Efeonce ID y audiencia Rooms. Ver [§ Enmienda D1-bis](#enmienda-d1-bis--carril-cli-directo-2026-11-01).
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

## Implementación (TASK-2084, local 2026-10-31)

- **Canales:** `browser | cli | gateway | system`. `system` corresponde a los workers de medios y la limpieza.
- **Atribución:**
  - el contexto del actor (`AsyncLocalStorage`) se copia a settings locales de cada transacción, y las columnas toman
    su default de ahí;
  - encabezados locales `X-Rooms-Channel: cli` y `X-Rooms-Agent`;
  - el MCP stdio siempre se atribuye como agente, con el nombre del handshake.
- **Avisos y cuotas:**
  - triggers sobre `rooms.audit` y `rooms.access_events`;
  - tablas `rooms.agent_action_notices` y `rooms.agent_lane_counters`;
  - topes por persona y hora: publicar 10, invitar 30, dar acceso 10;
  - error `agent_quota_exceeded` (429).
- **Reversa de publicar:** comando nuevo `editions.republish`, que vuelve a publicar la edición anterior como edición
  nueva.
- **Reader:** `agents.activity`, con `scope=self` u `organization` (este último exige `members.manage`).
- **Señales:** `rooms.agent.release_actions` y `rooms.agent.quota_hit`, en `pnpm access:health`.

## Enmienda D1-bis — carril CLI directo (2026-11-01)

**Decisión del operador:** «CLI primero, gateway después». Hoy un agente opera producción con una cookie humana
copiada (`--session-file`), lo que obliga al operador a entrar con MFA y copiar cookies cada vez. Se suma un segundo
camino a D1, que **no reemplaza** al gateway: queda para clientes remotos (TASK-2088).

### Qué se decide

1. **Cliente público first-party `efeonce-rooms-cli`** en Efeonce ID, pre-registrado (sin DCR ni CIMD):
   - grants `authorization_code` (PKCE S256 obligatorio) y `refresh_token`; autenticación `none`;
   - redirect solo loopback (`http://127.0.0.1/callback`, puerto libre en tiempo de login, RFC 8252 §7.3);
   - `allowed_scopes` = `efeonce.mcp.rooms.read`, `.author`, `.release` y `.access`. **`read.client` no**: sigue
     esperando su revisión de gobierno de datos IA.
2. **Audiencia Rooms** (`AUTH_SERVER_ROOMS_AUDIENCE`, sin valor = apagada, `invalid_target` como hoy). Es el segundo
   resource server del emisor:
   - las clases `efeonce.mcp.rooms.*` viven **solo** en la audiencia Rooms; un token nunca mezcla audiencias y el
     `aud` se deriva de las clases pedidas, contrastado con el `resource` (RFC 8707);
   - las clases Rooms son **restringidas**: solo las recibe un cliente que las liste explícitamente. Un cliente con
     `allowed_scopes` abierto (CIMD, DCR) nunca las obtiene;
   - solo para personas **internas** (contexto de autorización interno con sesión corporativa Entra + MFA). Una
     persona externa o invitada recibe un rechazo explícito.
3. **Tokens:**
   - access token JWT ES256 de **5 min** para la audiencia Rooms (15 min sigue siendo el de MCP);
   - refresh opaco con **rotación en cada uso y detección de reuso** (un refresh repetido revoca la familia entera),
     deslizante 30 días con tope absoluto de 90. Ya existía en el emisor y se reutiliza tal cual.
4. **Consentimiento con step-up** para `author`, `release` y `access`, como cualquier clase de escritura.
5. **Revocación por equipo en menos de 30 s:**
   - `pnpm rooms logout` revoca la familia (RFC 7009) y borra el archivo local;
   - Rooms introspecta (RFC 7662) con caché ≤ 30 s mediante un cliente confidencial propio
     (`efeonce-rooms-resource`), que solo ve como activos los tokens de su audiencia;
   - revocar el consentimiento, perder el binding o la membresía también corta por introspección.
6. **Rooms acepta dos formas de bearer, ambas detrás de `ROOMS_AGENT_LANE_ENABLED`:**

   | Forma | Quién la presenta | Qué exige Rooms |
   | --- | --- | --- |
   | Directa (este carril) | CLI y MCP stdio local en el equipo de la persona | `azp` en la lista de clientes CLI, `aud` Rooms, firma, `exp`, introspección activa, binding interno vigente |
   | Delegada (D1 original) | Gateway `mcp.efeonce.org` | Lo anterior más `act` e identidad de workload del gateway (TASK-2086/2088) |

   Un bearer con `act` sin identidad del gateway se sigue rechazando: la forma directa no lleva `act`.
7. **Atribución, no autoridad.** El agente se declara con `X-Rooms-Agent` y el canal es `cli`, como hoy con la
   cookie. Rooms mapea `sub` → `rooms.identity_bindings(issuer, subject)` con principal `internal` y aplica la
   autoridad exacta de esa persona; el scope del token recorta por clase (D2) y nunca agrega. Sin principal propio
   del agente.

### Costo de seguridad aceptado y mitigaciones

El refresh token vive en el equipo, como `gcloud`, `gh` o `vercel`. Quien lo copie actúa como la persona hasta que
se revoque.

| Riesgo | Mitigación |
| --- | --- |
| Robo del archivo local | Modo 0600 en `~/.config/efeonce-rooms/`; directorio 0700; nunca en el repo ni en logs |
| Refresh copiado y usado en otro equipo | Rotación con detección de reuso: el primer uso doble quema la familia en ambos lados |
| Token filtrado en un log o prompt | Access de 5 min; la CLI nunca imprime tokens; el MCP stdio no los expone al modelo |
| Equipo perdido | `logout` remoto: revocar el consentimiento del cliente en Efeonce ID corta en < 30 s por introspección |
| Persona que deja Efeonce | Binding o membresía revocada ⇒ introspección inactiva; refresh deja de emitir |
| Agente en bucle | Cuotas por persona y hora de D7, que ya aplican al canal `cli` |
| Otro cliente pide clases Rooms | Clases restringidas a clientes que las listan; audiencia Rooms apagada sin la variable |

### Interruptores

- `AUTH_SERVER_ROOMS_AUDIENCE` (Efeonce ID): sin valor, la audiencia no existe. Se fija por variable de repo y deploy
  gobernado, nunca con `--update-env-vars`.
- `ROOMS_AGENT_LANE_ENABLED` (Rooms): sin él, Rooms rechaza todo bearer y la cookie sigue igual.
- Estado del cliente `efeonce-rooms-cli` (`active | suspended`): suspenderlo corta toda la flota de CLIs.

### Estado de implementación (2026-11-02): en producción, encendida y aceptada

La enmienda no cambia: lo que sigue es el estado del runtime. La decisión de arriba sigue siendo la fuente.

| Parte | Estado | Recibo |
| --- | --- | --- |
| Efeonce ID — audiencia Rooms y clientes (TASK-2095) | Audiencia `https://efeonce-rooms.vercel.app/api/v1` y clientes `efeonce-rooms-cli` (público, PKCE) y `efeonce-rooms-resource` (confidencial, solo introspección) en producción. Hotfix acotado PR #267, release `69b0ba90832c-5e4bdd3f-386a-4827-8e45-0b4b2ef5dd1d`, revisión `auth-server-00172-zcn` al 100 % | [Ledger de Auth](../../../.claude/skills/efeonce-auth/references/program-ledger.md) (entrada 2026-11-01 TASK-2095); [contrato OAuth](../EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md) |
| Rooms — verificador del bearer y CLI (TASK-2087) | PR #22 (`main@9a4340a`, desplegado con el carril OFF) y luego `ROOMS_AGENT_LANE_ENABLED=true` con audiencia y ref del secreto; redeploy `efeonce-rooms-15djjyfz2` con alias. PR #23 (`3434ea8`) agrega las páginas de fin del login | [Ledger de Rooms](../../../.claude/skills/efeonce-rooms/references/program-ledger.md) (entradas 2026-11-02); [flags](../../operations/FEATURE_FLAG_STATE_LEDGER.md) `AUTH_SERVER_ROOMS_AUDIENCE` y `ROOMS_AGENT_LANE_ENABLED` |
| Aceptación del operador | Un solo `pnpm rooms login`. Sin pedir nada más, el agente creó la sala sintética `demo-volta` en el espacio «Efeonce», subió 5 imágenes, revisó «Ver como» comprador y publicó. 17 acciones atribuidas a `cli/claude-code`, con aviso y reversa, sin invitaciones. `logout` (`revoked: true`) y un segundo `login` verificados | Ledger de Rooms, entrada «aceptación del carril CLI en producción» |

Diferencias con el texto de la decisión, todas dentro de su alcance: el access token de la audiencia Rooms dura
300 s; la caché de introspección es de 30 s como máximo; el espacio se elige con el header `X-Rooms-Organization`.
El contrato vigente del bearer está en el [contrato de API y acceso](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md#bearer-de-agentes-carril-cli-d1-bis).

Pendiente: la copy del consentimiento de Efeonce ID (commit `75b40772d`) solo está en `develop` y llega con el
próximo release completo de Greenhouse; falta ver la sala en el navegador con sesión humana; TASK-2087 y TASK-2095
siguen `in-progress` hasta su cierre formal. El gateway (TASK-2086 canje, TASK-2088 provider) no cambia.

### Fin del login en el navegador (2026-11-02)

Vigente en producción desde efeonce-rooms PR #23 (merge `3434ea8`, feature `ecf9a32`). El listener loopback de
`pnpm rooms login` (`scripts/lib/rooms-cli-auth.ts`) ya no pinta una respuesta propia: solo rebota el navegador.

- **Retiene el callback hasta que el login se resuelve.** Valida `state`, `iss` (RFC 9207) y `error`/`code`; si
  pasa, canjea el código y escribe la credencial. Solo después responde `303` a
  `roomsCliLandingUrl(origin, outcome)`, con `Cache-Control: no-store` y `Referrer-Policy: no-referrer`.
- **Outcomes cerrados:** `connected | state | issuer | denied | failed`. `connected` va a `/cli/conectado` y solo se
  emite tras escribir la credencial; el resto va a `/cli/error?motivo=<outcome>`. Un canje fallido o una escritura
  fallida aterrizan en `failed`. Si expiran los 5 min, el listener se cierra sin aterrizaje y la CLI falla.
- **Nada secreto en la URL.** Ni el code ni tokens viajan al origen de Rooms: la dirección solo lleva el outcome.
- **`motivo` de vocabulario cerrado.** `/cli/error` solo lee claves conocidas de `access.cli.failed.reasons`
  (`src/lib/copy/invitations.ts`); cualquier otro valor se trata como `failed`. Nunca se renderiza texto libre.
- **Páginas públicas, sin sesión.** El flujo de la CLI no tiene cookie de Rooms. Ambas páginas son `noindex` y
  `no-referrer`, y viven en la familia de la órbita en reposo (`OrbitWordStage`, palabras «Listo» y «Casi»), con la
  fila «Acceso con» y el lockup oficial de Efeonce ID (`/brand/efeonce-id-lockup-negative.svg`, sincronizado por
  `scripts/sync-brand.mjs` desde `@efeoncepro/axis-brand-assets` 0.4.32), nunca el nombre en texto.
- **Test:** `tests/agent-cli-login.test.ts` afirma que el loopback responde `303` a `/cli/conectado` después de
  guardar la credencial, y que la CLI nunca imprime tokens.

### Qué no cambia

- `--session-file` sigue funcionando para desarrollo y operación local.
- El gateway (D1 original) y el canje RFC 8693 siguen siendo el camino para clientes remotos (TASK-2086, TASK-2088).
- TASK-1833 no se cierra con esto: el cambio no agrega un grant nuevo (code + PKCE y refresh ya existen), sino una
  audiencia y un cliente. Sus gates aplican igual antes de un cliente real.

### Puntuación de la enmienda

| Pilar | Evaluación |
| --- | --- |
| Seguridad | Autoridad = persona interna; PKCE + loopback; clases restringidas por cliente; step-up en escritura; refresh rotado con reuso; introspección ≤ 30 s. Residual aceptado: token en el equipo, como las CLIs de nube |
| Robustez | Reutiliza code, refresh, revoke e introspect existentes; `aud` derivado y verificado en ambos extremos; sin migración de tokens |
| Resiliencia | Tres interruptores; si Efeonce ID cae, la cookie sigue; introspección con fallo cerrado |
| Escalabilidad | Una audiencia más por variable; caché de introspección por token; N equipos = N familias de refresh |

## Enmiendas a decisiones vigentes

- **[Contrato de API y acceso](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).** Producción acepta **solo** dos
  bearers de Efeonce ID con audiencia Rooms: el delegado de D1 con la identidad del gateway, o el directo de la CLI
  first-party (D1-bis). Ningún otro.
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
- D1 (gateway) depende de TASK-2086 (canje RFC 8693) y TASK-2088 (provider `rooms`). La retención de Efeonce ID
  (PR #263/#264) se levantó el 2026-11-01 y la audiencia Rooms ya existe (TASK-2095).

## Puntuación

| Pilar | Evaluación |
| --- | --- |
| Seguridad | Autoridad = persona (sin poder paralelo), identidad del gateway + token delegado con introspección, scopes con step-up, `read.client` aparte, nada de bytes ni URLs en el modelo, aviso por cada acción hacia el cliente. Residual aceptado: errores del agente visibles para el cliente, contenidos por eval, cuotas y reversa |
| Robustez | Mismos comandos canónicos, con idempotencia, lock y cobertura; clasificación generada con guard de paridad |
| Resiliencia | Tres interruptores, revocación antes de 30 s, reversa por comando, señales de volumen y rechazo, auditoría append-only con actor |
| Escalabilidad | Una scope por clase; cuotas por persona y hora; introspección con caché; 10× más agentes no cambia el modelo |

## Reglas duras

- **NUNCA** un principal ni grants propios para un agente: actúa con la autoridad exacta de una persona interna.
- **NUNCA** aceptar en producción un bearer que no sea el delegado de D1 (con `act` e identidad del gateway) o el directo de la CLI first-party de D1-bis (`azp` en la lista, sin `act`).
- **NUNCA** dar las clases `efeonce.mcp.rooms.*` a un cliente que no las liste explícitamente, ni a una persona externa.
- **NUNCA** imprimir, loguear ni pasar al modelo un access o refresh token de la CLI.
- **NUNCA** poner el code, un token o texto libre en la URL a la que el loopback de `pnpm rooms login` manda el navegador: solo `roomsCliLandingUrl(origin, outcome)` con el vocabulario cerrado, y `connected` solo después de escribir la credencial.
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
2. **EPIC-044:** audiencia Rooms y cliente CLI first-party (D1-bis, TASK-2095, en producción desde 2026-11-01);
   después, el canje para el gateway (TASK-2086).
3. **Rooms:** verificador del bearer directo y `pnpm rooms login` (TASK-2087, en producción y aceptado el
   2026-11-02); la forma delegada se suma con TASK-2088.
4. **`efeonce-mcp`:** provider `rooms` con todas las clases y canary real.
5. **D5:** fuentes y medios, cada uno con su canary.
6. **D6:** skill de oficio y eval, antes del primer cliente real.
