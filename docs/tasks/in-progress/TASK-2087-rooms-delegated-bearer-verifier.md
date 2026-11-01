# TASK-2087 — Rooms: verificador del token delegado + identidad del gateway

## Delta 2026-11-01 — enmienda D1-bis: bearer directo de la CLI primero

- El operador eligió «CLI primero, gateway después» (ADR del carril, § Enmienda D1-bis). Esta task se toma ahora con
  alcance ampliado y en este orden:
  1. verificador del **bearer directo** de la CLI first-party (`azp` en `ROOMS_AGENT_CLI_CLIENT_IDS`, `aud` Rooms,
     JWKS de Efeonce ID, introspección con caché ≤ 30 s por el cliente confidencial `efeonce-rooms-resource`), detrás
     de `ROOMS_AGENT_LANE_ENABLED`;
  2. `pnpm rooms login|logout|whoami` con PKCE por loopback, tokens en `~/.config/efeonce-rooms/` (0600) y refresh
     automático; el MCP stdio local reutiliza esos tokens;
  3. la forma **delegada** (`act` + identidad del gateway) queda para cuando existan TASK-2086 y TASK-2088.
- Depende de [TASK-2095](TASK-2095-efeonce-id-rooms-audience-cli-first-party-client.md) (audiencia Rooms en Efeonce
  ID), no de TASK-2086. `--session-file` se mantiene.

## Delta 2026-10-31 — base lista en TASK-2084 (local)

- El verificador fija el actor con `runWithActor({ actorKind: 'agent', agentClientId, channel: 'gateway' }, …)`
  (`src/server/agents/actor-context.ts`). Las columnas, los avisos y las cuotas ya lo consumen sin cambios.
- `resolveActorContext` rechaza hoy un encabezado `X-Rooms-Channel: gateway`: el canal `gateway` nace solo del
  verificador.
- `rooms.agent_lane_counters` ya acepta `kind = 'bearer_rejected'` para la señal del verificador.
- La clasificación D2 está en `src/domain/agent-lane-contracts.ts` (`AGENT_SCOPE_CLASSIFICATION`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `api`
- Epic: `EPIC-052`
- Status real: `Diseño. ADR del carril de agentes Accepted (4d8d6553c), D1 sin implementar. Tercer paso del orden del ADR.`
- Rank: `después de TASK-2086 y TASK-2084; antes de TASK-2088`
- Domain: `platform|identity`
- Blocked by: `TASK-2086 (delegación interactiva de Efeonce ID para la audiencia de Rooms; retenida con los PR #263/#264 de Efeonce ID) y TASK-2084 (columnas de actor y clasificación D2)`
- Branch: `efeonce-rooms: rama derivada de main, sin push a main hasta autorización; Greenhouse: docs en develop`

## Summary

Hoy `resolvePrincipal` sólo lee cookies: un agente entra a producción únicamente con la cookie copiada de una persona.
Esta task enseña a Rooms a aceptar un bearer **sólo** cuando el gateway `mcp.efeonce.org` presenta juntas su identidad
de workload (Google ID token con audiencia exacta de Rooms) y un token delegado de Efeonce ID con `act`, scopes
`efeonce.mcp.rooms.*` y la organización. Rooms introspecta el token con caché de 30 segundos como máximo, resuelve a
la persona por su binding y registra el canal `gateway` y el cliente del agente. Todo queda detrás de
`ROOMS_AGENT_LANE_ENABLED`, apagado por defecto.

## Why This Task Exists

El ADR decidió que en producción los agentes entran sólo por el gateway con un token delegado, y enmendó el contrato
de API: producción acepta sólo ese token, presentado junto con la identidad del gateway, y ningún otro bearer. Sin
este verificador el gateway (TASK-2088) no tiene a quién llamar, la revocación de Efeonce ID no corta al agente y la
atribución de canal `gateway` no existe. `scripts/rooms.ts` ya anuncia un `ROOMS_ACCESS_TOKEN` que el servidor no
entiende: hoy es una promesa vacía.

## Goal

- Rooms acepta un bearer únicamente con las dos credenciales del gateway válidas, y lo rechaza en cualquier otro caso.
- La persona resuelta es la de su binding vigente, interna y de esa organización; el agente opera con su autoridad
  exacta y sólo dentro de los scopes consentidos.
- Una revocación en Efeonce ID corta al agente en 30 segundos como máximo.
- Cada escritura por este carril queda con `channel='gateway'` y el `agent_client_id` de `act`.
- Con `ROOMS_AGENT_LANE_ENABLED` apagado, Rooms rechaza todo bearer, como hoy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (D1, D2 y D7; enmienda al contrato de API)
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md` (regla «sin bearer» que esta task reemplaza)
- `docs/architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md` (bindings, principal `internal`)
- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md`
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D10: clases nuevas con su autorización)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

Reglas obligatorias:

- **NUNCA** aceptar en producción un bearer sin `act` o sin la identidad de workload del gateway.
- **NUNCA** un principal ni grants propios para un agente: la autoridad es la de la persona del `sub`.
- **NUNCA** emitir tokens en Rooms ni aceptar el token del usuario reenviado por el gateway.
- **NUNCA** combinar en una misma petición cookie de sesión y bearer: si llegan ambos, se rechaza.
- Personas externas o invitadas nunca operan por este carril (principal `internal` obligatorio).
- `act` es atribución, no frontera: la frontera es la identidad del gateway más los scopes.

## Normative Docs

- `.claude/skills/efeonce-rooms/SKILL.md` y `references/program-ledger.md`
- `.claude/skills/efeonce-auth/SKILL.md` y su `references/program-ledger.md` (estado de Efeonce ID)
- `docs/tasks/in-progress/TASK-2084-rooms-agent-attribution-reversal-quotas.md`
- `docs/tasks/to-do/TASK-2086-efeonce-id-interactive-agent-delegation-second-resource.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- TASK-2086: Efeonce ID emite el token delegado para la audiencia de Rooms (`iss` `https://auth.efeonce.org`,
  `aud` exacto de Rooms, `act`, `organizationId`, TTL ≤ 5 min, scopes `efeonce.mcp.rooms.*` autorizados por D10) y
  expone introspección RFC 7662 para Rooms como resource server `[verificar: endpoint y credencial de Rooms los fija
  TASK-2086]`.
- TASK-2084: columnas `actor_kind`, `agent_client_id`, `channel`; `ActorContext`; clasificación D2
  `agentScopeClassification`; tabla de contadores con el `kind` reservado `bearer_rejected`.
- Tabla existente `rooms.identity_bindings (issuer, sub, organization_id)` y `rooms.principals`.

### Blocks / Impacts

- TASK-2088 (provider `rooms` en `efeonce-mcp`): llama a este verificador; su canary es el que prende el flag.
- `EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`: la regla «sin bearer nativo» pasa a «sólo el token delegado de D1».
- CLI `scripts/rooms.ts`: el mensaje sobre `ROOMS_ACCESS_TOKEN` debe decir la verdad sobre el canal.

### Files owned

- `../efeonce-rooms/src/server/agents/bearer/**` (nuevo: verificador del workload, verificador del token delegado,
  introspección con caché, resolución de principal)
- `../efeonce-rooms/src/server/session.ts` (rama de bearer en `resolvePrincipal`, detrás del flag)
- `../efeonce-rooms/src/server/cloud/runtime-config.ts` (configuración del carril: flag, audiencia, issuer, cuenta del
  gateway, credencial de introspección) `[verificar ubicación]`
- `../efeonce-rooms/src/domain/agent-lane-contracts.ts` (sólo consumo de la clasificación D2; la crea TASK-2084)
- `../efeonce-rooms/scripts/rooms.ts` (mensaje de `ROOMS_ACCESS_TOKEN`)
- `../efeonce-rooms/tests/agent-bearer*.test.ts` (nuevos)
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md` (delta al cerrar)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila de `ROOMS_AGENT_LANE_ENABLED` al cerrar)

## Current Repo State

### Already exists

- `resolvePrincipal` en `src/server/session.ts`: sólo cookie interna o de invitado; nunca combina autoridades.
- Verificación de ID token OIDC con `jose` (`createLocalJWKSet`, `jwtVerify` con `issuer`, `audience`, `ES256`,
  `requiredClaims`, `clockTolerance: 0`) en `src/server/auth/protocol.ts`: patrón para el token delegado.
- Verificación de Google ID token de una identidad de workload con `OAuth2Client.verifyIdToken` y audiencia exacta en
  `src/server/media/dispatch-runtime.ts`, con `assertSchedulerIdentity` (`email`, `email_verified`, `aud`, `iss`) en
  `src/server/media/dispatch.ts`: patrón para la identidad del gateway.
- Bindings `(issuer, sub, organization_id)` en `rooms.identity_bindings`
  (`migrations/1792964148932_rooms-oidc-consumer.sql`) y principal `internal` con vigencia
  (`src/domain/contracts.ts`, `principalSchema`).
- Configuración de auth por entorno (`ROOMS_AUTH_ISSUER`, etc.) en `src/server/auth/config.ts` y flags del runtime en
  `src/server/cloud/runtime-config.ts`.
- El gateway ya llama a Globe con Google ID token en `Authorization` (`getIdTokenClient`) en
  `efeonce-mcp/src/providers/globe.ts`.
- `scripts/rooms.ts` lee `ROOMS_ACCESS_TOKEN` y lo envía, aunque el servidor no lo acepta.

### Gap

- `resolvePrincipal` no lee `Authorization`; no existe el flag `ROOMS_AGENT_LANE_ENABLED`.
- No hay verificación del token delegado, ni introspección, ni caché de introspección.
- No hay comparación entre la clase de la operación y los scopes del token.
- No hay señal `rooms.agent.bearer_rejected`.
- El contrato de API todavía dice que producción no acepta bearer.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `efeonce-rooms` (`src/server/agents/bearer/**`, rama de bearer en `src/server/session.ts`)
- Future candidate home: `remain-shared`
- Boundary: autenticación del carril de agentes de Rooms; el único consumidor autorizado es el gateway `mcp.efeonce.org` con su identidad de workload; todas las rutas API v1 lo heredan por `resolvePrincipal`
- Server/browser split: el verificador completo es `server-only`; ningún tipo del verificador se exporta al navegador; los DTO de error siguen siendo los de `RoomsError`
- Build impact: none; reutiliza `jose` y `google-auth-library`, ya dependencias de `efeonce-rooms`
- Extraction blocker: la caché de introspección vive por instancia de Vercel; la resolución de principal comparte el pool de Rooms

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (autenticación de producción y autoridad de personas a través de agentes)
- Impacto principal: `api`
- Source of truth afectado: Efeonce ID (firma, `iss`, `aud`, `exp`, `scope`, `act`, introspección) y
  `rooms.identity_bindings` + `rooms.principals` (persona)
- Consumidores afectados: gateway `efeonce-mcp` (TASK-2088), todas las rutas API v1, escritores de atribución de
  TASK-2084
- Runtime target: local y producción con el flag apagado; el encendido ocurre en el canary de TASK-2088

### Contract surface

- Contrato existente a respetar: `resolvePrincipal`, `RoomsError`, `can(persona, …)`, executor canónico, clasificación
  D2 y `ActorContext` de TASK-2084.
- Contrato nuevo o modificado:
  - Petición del gateway con dos credenciales: identidad de workload (Google ID token, audiencia exacta de Rooms) y
    token delegado de Efeonce ID. Disposición de encabezados a cerrar con TASK-2088; propuesta: Google ID token en
    `Authorization: Bearer` (igual que con Globe) y token delegado en un encabezado propio
    (`X-Efeonce-Delegated-Authorization`, nombre a decidir).
  - Validación del token delegado: firma con JWKS de `auth.efeonce.org`, `iss` exacto, `aud` exacto de Rooms, `exp`,
    TTL ≤ 5 min, `act` obligatorio, `organizationId` igual a la organización de la operación y `scope` dentro de
    `efeonce.mcp.rooms.*`.
  - Introspección RFC 7662 con caché ≤ 30 s por token (clave: hash del token; nunca el token en claro), acotada
    también por `exp`; `active=false` rechaza.
  - Autorización por clase: la operación pedida debe tener clase D2 incluida en los scopes del token; las operaciones
    excluidas nunca se ejecutan por bearer.
  - `ActorContext` = `{ actorKind: 'agent', agentClientId: <cliente de act>, channel: 'gateway' }`.
  - Señal `rooms.agent.bearer_rejected` con motivo por categoría, sin token.
- Backward compatibility: `gated` (`ROOMS_AGENT_LANE_ENABLED` apagado = comportamiento actual).
- Full API parity: el bearer entra por `resolvePrincipal`, así que API v1 y SDK lo heredan sin rutas nuevas; la CLI y
  el MCP local siguen con `--session-file`.

### Data model and invariants

- Entidades/tablas/views afectadas: lectura de `rooms.identity_bindings` y `rooms.principals`; escritura de las
  columnas de atribución de TASK-2084 y del contador `bearer_rejected`. Sin migración en esta task.
- Invariantes que no se pueden romper:
  - Sin las dos credenciales válidas, no hay principal: la petición es anónima y falla como hoy.
  - Con el flag apagado, ningún bearer produce principal.
  - El principal es la persona del binding vigente, `internal`, `active` y no vencido; nunca un externo ni un invitado.
  - El agente nunca obtiene más que la persona: `can()` evalúa a la persona y la clase D2 recorta a los scopes.
  - Una petición con cookie y bearer a la vez se rechaza.
  - Ningún token, `sub` completo ni secreto aparece en respuestas, logs, contadores ni Sentry.
- Write-target allowlist: N/A en Greenhouse; en `efeonce-rooms` el verificador no escribe tablas de dominio, sólo el
  contador `bearer_rejected` de TASK-2084.
- Tenant/space boundary: `organizationId` del token debe coincidir con el `organizationId` de la operación y con el
  binding; un token de una organización no opera otra.
- Idempotency/concurrency: lecturas puras más caché por instancia; los comandos siguen con su recibo idempotente
  (el `principal_id` del recibo es la persona).
- Audit/outbox/history: cada escritura por este carril queda `agent`/`gateway` en `audit`, `command_receipts` y
  `access_events` mediante TASK-2084; los rechazos sólo como contador por hora.

### Migration, backfill and rollout

- Migration posture: `none` (las columnas y el contador los crea TASK-2084; si Discovery decide otra forma para el
  contador, la migración vuelve a esta task y `Backend impact` pasa a `migration`).
- Default state: `flag OFF` (`ROOMS_AGENT_LANE_ENABLED` ausente o distinto de `true` en todos los entornos).
- Backfill plan: ninguno.
- Rollback path: flag apagado + redeploy + alias manual; además el provider `rooms` del gateway en `policy-blocked`
  y la revocación en Efeonce ID (tres interruptores independientes de D7).
- External coordination: variables de entorno del carril en Vercel (`efeonce-rooms`, scope `efeonce-7670142f`),
  credencial de introspección en el gestor de secretos que decida TASK-2086, cuenta de servicio del gateway
  confirmada en `efeonce-mcp`.

### Security and access

- Auth/access gate: Google ID token del gateway con `aud` exacto de Rooms, `email` de la cuenta de servicio del
  gateway en lista blanca y `email_verified`; token delegado de Efeonce ID verificado e introspectado; binding vigente;
  clase D2 dentro de los scopes; luego `can(persona, capacidad, recurso)`.
- Sensitive data posture: tokens sólo en memoria; la caché guarda hash del token, `sub`, organización, scopes, `act` y
  vencimiento; `sub` sólo con sufijo en logs.
- Error contract: rechazos como `RoomsError` canónicos sin distinguir hacia afuera cuál credencial falló (respuesta
  uniforme); el motivo detallado sólo en el contador y en logs saneados.
- Abuse/rate-limit posture: el contador de rechazos alimenta la señal; las cuotas por persona de TASK-2084 aplican
  igual; la caché evita una introspección por petición.

### Runtime evidence

- Local checks: `LC_ALL=en_US.UTF-8 pnpm verify` en `efeonce-rooms`; tests con un emisor de prueba (JWKS local) y un
  verificador de Google simulado para cada caso de rechazo y para el caso válido.
- DB/runtime checks: lectura de filas `agent`/`gateway` en `audit` y `command_receipts` tras un comando de prueba en
  local.
- Integration checks: corrida local contra el emisor real de Efeonce ID en su entorno de desarrollo, si TASK-2086 lo
  provee `[verificar]`; revocación de un token y rechazo antes de 30 s.
- Reliability signals/logs: `rooms.agent.bearer_rejected` por motivo; logs saneados en Vercel.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
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

### Slice 1 — Configuración y flag

- `ROOMS_AGENT_LANE_ENABLED` (default apagado) y la configuración del carril (audiencia de Rooms, issuer, cuenta de
  servicio del gateway, endpoint y credencial de introspección) validada al arrancar; con el flag encendido y la
  configuración incompleta, el carril queda cerrado (falla cerrado).

### Slice 2 — Verificadores

- Verificador de la identidad del gateway (Google ID token) siguiendo el patrón de `dispatch-runtime.ts`.
- Verificador del token delegado con `jose` (firma, `iss`, `aud`, `exp`, TTL, `act`, `organizationId`, `scope`).
- Introspección RFC 7662 con caché ≤ 30 s por hash de token.

### Slice 3 — Resolución de principal y atribución

- Rama de bearer en `resolvePrincipal`: rechazo si hay cookie y bearer; binding `(issuer, sub, organization_id)`
  vigente con principal `internal`; `ActorContext` `agent`/`gateway` con el cliente de `act`.
- Recorte por clase D2: la operación debe estar en una clase consentida; excluidas, nunca.

### Slice 4 — Señal, contrato y CLI

- Contador y señal `rooms.agent.bearer_rejected` por motivo.
- Delta del contrato de API (reemplaza la regla «sin bearer»); mensaje veraz de `ROOMS_ACCESS_TOKEN` en la CLI.

## Out of Scope

- Emisión del token delegado, canje RFC 8693, `act` del cliente y autorización D10 de las clases (TASK-2086).
- Provider `rooms` del gateway, cuotas por clase en el gateway y canary real (TASK-2088).
- Columnas de actor, avisos, reversas, cuotas por persona y clasificación D2 (TASK-2084).
- Encender el flag en producción: ocurre en el canary de TASK-2088.
- Bearer para la CLI o el MCP local: siguen con `--session-file`.

## Detailed Spec

Contrato completo en el ADR del carril de agentes (D1, D2, D7) y en su enmienda al contrato de API. Detalles que el
ADR deja a la implementación:

- **Orden de verificación:** flag → ausencia de cookie → identidad del gateway → firma y claims del token delegado →
  introspección (o caché) → binding y principal → clase D2 contra scopes → `can()`. Cualquier falla devuelve la misma
  respuesta pública.
- **Caché:** por instancia, clave = hash del token, vida = mínimo entre 30 s y el `exp` restante; una respuesta
  `active=false` no se guarda como positiva.
- **`read.client`:** la clase existe y se verifica, pero su habilitación con clientes reales sigue la revisión de
  gobierno de datos IA del ADR; esta task no la habilita.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-2084 en producción (columnas y clasificación) y TASK-2086 con emisor e introspección disponibles **antes** del
  Slice 3 contra un emisor real.
- Slice 1 → Slice 2 → Slice 3 → Slice 4. El flag queda apagado en todos los entornos al cerrar; sólo el canary de
  TASK-2088 lo enciende en producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un bearer sin `act` o sin identidad del gateway produce principal | identity | low | Dos credenciales obligatorias; tests de cada ausencia; flag apagado por defecto | `rooms.agent.bearer_rejected` y test negativo |
| Un token de otra audiencia u organización opera Rooms | identity | low | `aud` exacto, `organizationId` contra operación y binding | Motivo `audience`/`organization` en el contador |
| Una revocación tarda más de 30 s en cortar | identity | medium | Caché ≤ 30 s acotada por `exp`; test con reloj controlado | Prueba de revocación en el canary |
| Un invitado externo o un principal vencido opera por bearer | identity | low | Principal `internal`, `active`, binding vigente | Test negativo |
| El agente obtiene más que la persona o más que sus scopes | identity | low | `can()` sobre la persona + recorte D2 | Test por clase |
| Fuga del token o del `sub` en logs o Sentry | identity | low | Hash en caché, sufijo en logs, respuesta uniforme | Revisión de logs del canary |
| El flag se enciende con configuración incompleta y bloquea o abre de más | production | low | Falla cerrado con configuración incompleta | Arranque registra carril cerrado |
| La introspección cae y tumba operaciones de personas | production | low | Sólo el carril bearer depende de ella; cookies no cambian | Errores del carril sin errores de cookie |

### Feature flags / cutover

- `ROOMS_AGENT_LANE_ENABLED` (env var del proyecto Vercel `efeonce-rooms`, default ausente = apagado). Apagado: todo
  bearer se rechaza. Encendido sólo en el canary de TASK-2088, después de verificar en local. Revertir: valor a
  `false` + redeploy + `vercel alias set <deploy> efeonce-rooms.vercel.app --scope efeonce-7670142f`; menos de 10
  minutos. Además: provider `rooms` del gateway en `policy-blocked` y revocación en Efeonce ID.
- La fila del flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` se agrega al cerrar la task (runtime: Vercel
  `efeonce-rooms`; estado: code complete, apagado, pendiente del canary de TASK-2088).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Flag apagado o revertir commit + redeploy + alias manual | menos de 10 minutos | sí |
| Slice 2 | Revertir commit; con flag apagado no se ejecuta | minutos | sí |
| Slice 3 | Flag apagado; revertir commit si hiciera falta | menos de 10 minutos | sí |
| Slice 4 | Revertir commit (contador y mensajes) | minutos | sí |

### Production verification sequence

1. `LC_ALL=en_US.UTF-8 pnpm verify` en local con todos los casos de rechazo y el caso válido.
2. Merge a `main` con autorización; deploy con el flag apagado; alias manual; `/rooms` 200 y `/api/auth/session` 401.
3. Con el flag apagado, una petición con bearer de prueba recibe el mismo rechazo que hoy y suma
   `bearer_rejected` con motivo `lane_disabled`.
4. Fila del flag en el ledger como «code complete, apagado».
5. En el canary de TASK-2088 (fuera de esta task): flag encendido, llamada real del gateway, fila `agent`/`gateway`,
   revocación cortando antes de 30 s.

### Out-of-band coordination required

- TASK-2086 entrega emisor, audiencia de Rooms, introspección y credencial; liberación de la retención de Efeonce ID.
- Confirmar en `efeonce-mcp` la cuenta de servicio del gateway y la disposición de encabezados con TASK-2088.
- Autorización del operador para mergear a `main` y desplegar `efeonce-rooms`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con `ROOMS_AGENT_LANE_ENABLED` apagado, ningún bearer produce principal (test).
- [ ] Con el flag encendido, un bearer sin identidad del gateway, sin `act`, con `aud` distinto, con `iss` distinto,
      vencido, con TTL mayor a 5 minutos o con `organizationId` distinto se rechaza (un test por caso).
- [ ] Una petición con cookie y bearer a la vez se rechaza (test).
- [ ] Un `sub` sin binding vigente, con principal externo o vencido se rechaza (tests).
- [ ] Un token con introspección `active=false` se rechaza; tras revocar, el rechazo ocurre en 30 segundos o menos
      (test con reloj controlado).
- [ ] Una operación cuya clase D2 no está en los scopes del token se rechaza; una operación excluida nunca se ejecuta
      por bearer (tests).
- [ ] Un comando válido por bearer queda con `principal_id` de la persona, `actor_kind='agent'`, `channel='gateway'` y
      el `agent_client_id` de `act` (test con lectura de filas).
- [ ] Ninguna respuesta, log ni contador contiene el token o el `sub` completo (test).
- [ ] Todos los rechazos devuelven la misma respuesta pública y suman `rooms.agent.bearer_rejected` con su motivo.
- [ ] El contrato de API refleja la enmienda del ADR y la CLI describe el canal real.
- [ ] La fila de `ROOMS_AGENT_LANE_ENABLED` está en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` al cerrar.
- [ ] `LC_ALL=en_US.UTF-8 pnpm verify` pasa en `efeonce-rooms`.

## Verification

- `efeonce-rooms`: `LC_ALL=en_US.UTF-8 pnpm verify` y suite `tests/agent-bearer*.test.ts`.
- Producción con el flag apagado: rechazo uniforme y contador `lane_disabled`.
- `pnpm task:lint --task TASK-2087`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Fila de `ROOMS_AGENT_LANE_ENABLED` en el ledger de flags con runtime Vercel `efeonce-rooms`.
- [ ] Delta en `EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md` y en el ADR del carril con los nombres finales.
- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado y espejo `.codex` sincronizado.
- [ ] Estado declarado con honestidad: «code complete, flag apagado; encendido en el canary de TASK-2088».

## Follow-ups

- Encendido del flag y canary real en TASK-2088.
- Habilitación de `read.client` tras la revisión de gobierno de datos IA.

## Open Questions

- Disposición final de encabezados para las dos credenciales (a cerrar con TASK-2088).
- Credencial de Rooms para la introspección y dónde se guarda (la define TASK-2086).
- Si existe un entorno de desarrollo de Efeonce ID para la prueba de integración real antes del canary.
