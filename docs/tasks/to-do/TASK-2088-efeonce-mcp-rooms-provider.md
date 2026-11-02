# TASK-2088 — efeonce-mcp: provider `rooms`

## Delta 2026-11-02 — carril CLI directo en producción; el verificador de Rooms se reutiliza

- Enmienda D1-bis del ADR del carril (decisión del operador: «CLI primero, gateway después»): un agente local ya opera
  Rooms en producción por `pnpm rooms login` con el bearer de Efeonce ID de una persona interna
  ([TASK-2095](../in-progress/TASK-2095-efeonce-id-rooms-audience-cli-first-party-client.md) +
  [TASK-2087](../in-progress/TASK-2087-rooms-delegated-bearer-verifier.md)). Aceptado el 2026-11-02 con la sala Volta
  publicada por la CLI. Esta task sigue siendo el camino para clientes remotos y no cambia de alcance.
- **Reutilizar, no recrear:** el verificador de Rooms (`src/server/agents/bearer.ts` en `efeonce-rooms`) ya hace JWKS,
  introspección con caché ≤ 30 s por el cliente `efeonce-rooms-resource`, clases por ruta y por operación
  (`assertBearerOperation`) y resolución del `sub` a la persona interna (`internalPrincipalFor`). El provider `rooms`
  suma la identidad del gateway y la forma delegada con `act` (que hoy el verificador rechaza), no un verificador nuevo.
- Ya existen la audiencia Rooms (`https://efeonce-rooms.vercel.app/api/v1`), las cinco clases restringidas, el
  interruptor `ROOMS_AGENT_LANE_ENABLED` (hoy `true` en producción) y la metadata RFC 9728 en
  `/.well-known/oauth-protected-resource`. El espacio se elige con `X-Rooms-Organization`; el canal del provider será
  `gateway`, distinto del `cli` actual. Sigue dependiendo del canje de TASK-2086.

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
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `Diseno — registrada 2026-10-31 como pieza 4 del orden del ADR del carril de agentes de Rooms. Epic primaria EPIC-052 (Rooms); secundaria EPIC-044 (Efeonce ID, por el token delegado de TASK-2086). Sin implementación`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `TASK-2087 (verificador del token delegado + identidad del gateway en Rooms, detrás de ROOMS_AGENT_LANE_ENABLED), que a su vez depende de TASK-2086 · TASK-2084 (guard de clasificación D2 en Rooms, fuente de las clases por operación)`
- Branch: `efeonce-mcp rama task/TASK-2088-rooms-provider + PR (runtime del gateway; deploy por dispatch manual) · Greenhouse develop sólo para docs de gobierno; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El gateway `mcp.efeonce.org` suma el provider `rooms`: federa las operaciones del catálogo canónico de Rooms con las
cinco clases `efeonce.mcp.rooms.*`, llama a Rooms con su identidad de workload más el token delegado que obtiene de
Efeonce ID (TASK-2086) y nunca reenvía el token del usuario. Tiene interruptor `enabled | policy-blocked`, cuotas
por clase, entrada en `efeonce.gateway.status`, bump de versión y un canary real por clase. Con esto un agente
(Codex, Claude Code) arma, publica, invita y da acceso en Rooms de producción con la autoridad exacta de su persona.

## Why This Task Exists

- El ADR [carril de agentes de Rooms](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md) (Accepted
  2026-10-31) fijó que en producción un agente entra a Rooms **sólo por el gateway** (D1), con clases de scope
  derivadas del catálogo de operaciones (D2) y tres interruptores, uno de ellos el provider del gateway (D7).
- Hoy los agentes operan Rooms sólo con la CLI `pnpm rooms` y el MCP stdio local con `--session-file` (una cookie
  humana copiada): sin atribución, sin scopes y sin camino remoto.
- El gateway `efeonce-mcp` (`package.json` versión `1.10.0` al 2026-10-31) no tiene provider de Rooms; sus providers
  viven en `src/providers/*.ts` (`globe.ts` como precedente de identidad de workload, `marketing-studio.ts` como
  precedente de manifiesto generado y paridad).
- La regla general del gateway (punto 10 del ADR de plataforma y gate `write/approval` de
  `capability-intake.md`) exige preview y confirmación explícita para writes. El operador decidió que en Rooms los
  agentes son ciudadanos de primera clase y ejecutan `author`, `release` y `access` directo: esa excepción tiene que
  quedar escrita como delta, no implícita en el código.

## Goal

- Provider `rooms` con catálogo de tools generado desde `canonicalMcpOperations` de Rooms y verificado por un guard
  de paridad bidireccional contra la clasificación de TASK-2084.
- Clases `efeonce.mcp.rooms.read|read.client|author|release|access` en los scopes del gateway, comunicadas por el
  challenge `403 insufficient_scope`.
- Cada llamada a Rooms lleva identidad de workload del gateway + token delegado de audiencia Rooms; el token del
  usuario nunca sale del gateway.
- Kill switch `enabled | policy-blocked`, cuotas por clase, estado en `efeonce.gateway.status`, versión nueva y
  canary real por clase en orden read → author → release/access.
- Delta de excepción documentado para writes directos de `author`/`release`/`access`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (D1, D2, D7; «Reglas duras»; «Orden», punto 4)
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md` (enmendado por el ADR: producción acepta sólo
  el token delegado + identidad del gateway)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (puntos 7, 8 y 10; §Provider contract;
  §Security boundary)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (§9 versión y superficie)
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D8 objetivo explícito por llamada)
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (token delegado, tras TASK-2086)

Reglas obligatorias:

- **El gateway transporta, no autoriza.** No calcula políticas de Rooms ni decide qué puede la persona: eso lo hace
  Rooms con el binding de la persona. El scope responde «¿esta clase?»; Rooms responde «¿esta persona, en esta
  sala?».
- **NUNCA** reenviar el token del usuario a Rooms ni emitir tokens en el gateway: el token delegado lo emite sólo
  Efeonce ID (TASK-2086).
- **Dos credenciales siempre juntas:** Google ID token del service account del gateway con audiencia exacta de Rooms
  + token delegado. Ninguna sola basta.
- **Una scope por clase**, nunca una por tool. Toda operación del catálogo tiene clase o exclusión con motivo; una
  operación nueva sin clasificar rompe el build.
- **Excluidas siempre:** bytes, URLs firmadas, OTP del invitado, `progress.mark`, `live.*`, `profile.update`,
  `presentation.control/ack` (tabla D2). El modelo nunca ve URLs firmadas ni bytes.
- **Sólo emisor nativo:** un token de Entra recibe un motivo explícito; nunca un fallback.
- **NUNCA** cablear las clases de escritura a un cliente público compartido ni publicarlas en el bootstrap; llegan
  por consentimiento con step-up en Efeonce ID.
- Versión del servidor: agregar tools = minor; `pnpm surface:baseline` después de decidir el bump.

## Normative Docs

- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `references/capability-intake.md` +
  `references/native-authority.md`
- `.claude/skills/efeonce-rooms/SKILL.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` (patrón por provider)
- `docs/tasks/in-progress/TASK-2084-rooms-agent-attribution-reversal-quotas.md`
- `docs/tasks/to-do/TASK-2086-efeonce-id-interactive-agent-delegation-second-resource.md`
- `docs/tasks/to-do/TASK-2087-rooms-delegated-bearer-verifier.md` [verificar]

## Dependencies & Impact

### Depends on

- `TASK-2086`: grant de canje en Efeonce ID y cliente confidencial del gateway registrado.
- `TASK-2087`: Rooms verifica token delegado + identidad del gateway detrás de `ROOMS_AGENT_LANE_ENABLED`.
- `TASK-2084`: clasificación D2 por operación con guard en Rooms (fuente de verdad de la clase de cada tool).
- `efeonce-rooms`: `canonicalMcpOperations` y `MCP_OPERATION_EXCLUSIONS` en `src/server/mcp/manifest.ts`.
- Gateway multi-issuer vigente (`src/auth/token-verifier.ts`, `src/auth/auth-context.ts`, TASK-1831).

### Blocks / Impacts

- `TASK-2091` (skill de oficio + eval): su eval de referencia corre por este carril.
- `TASK-2085` (pantalla «Actividad de agentes»): verá acciones con canal `gateway` sólo cuando este provider exista.
- `efeonce.gateway.status` y `surface-baseline.json`: cambian de forma visible para todo cliente MCP.
- `TASK-1833`: el red-team del emisor suma el canje del gateway como cliente confidencial.

### Files owned

- Gateway `efeonce-mcp`:
  - `src/providers/rooms.ts` [nuevo]
  - `src/providers/rooms-tool-manifest.generated.ts` [nuevo]
  - `src/providers/rooms-tool-parity.ts` [nuevo]
  - `src/providers/types.ts`
  - `src/config.ts` (scopes, flag, audiencia y URLs)
  - `src/auth/tool-policy.ts`
  - `src/mcp.ts` (registro de tools y `efeonce.gateway.status`)
  - `src/app.ts` (challenge `insufficient_scope` por clase)
  - `src/surface.ts`, `surface-baseline.json`, `package.json`
  - `scripts/sync-rooms-tool-manifest.mjs` [nuevo], `scripts/rooms-canary.mjs` [nuevo]
  - `test/rooms.test.ts` [nuevo], `test/rooms-mcp.test.ts` [nuevo], `test/tool-policy.test.ts`,
    `test/version.test.ts`, `test/deploy-secret-mounts.test.ts`
  - `.github/workflows/deploy.yml`
- Greenhouse (gobierno):
  - `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (delta de excepción)
  - `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` (§Provider Rooms)
  - `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
  - `.claude/skills/efeonce-mcp-platform/SKILL.md` (fila del provider)

## Current Repo State

### Already exists

- Gateway `efeonce-mcp` 1.10.0 con providers en `src/providers/`, estado por provider
  `enabled | policy-blocked | unavailable` (`src/mcp.ts`), tool `efeonce.gateway.status`, policy por tool
  (`src/auth/tool-policy.ts`) y medición de superficie del servidor construido (`src/surface.ts` +
  `pnpm surface:baseline` + `test/version.test.ts`).
- Precedente de identidad de workload: `src/providers/globe.ts` usa `GoogleAuth.getIdTokenClient(audience)`.
- Precedente de manifiesto generado y guard de paridad: `marketing-studio-tool-manifest.generated.ts`,
  `marketing-studio-tool-parity.ts` y `scripts/sync-marketing-studio-tool-manifest.mjs`.
- Flags del gateway como variables de repo GitHub leídas por `.github/workflows/deploy.yml` (dispatch manual).
- Rooms expone `canonicalMcpOperations` y `MCP_OPERATION_EXCLUSIONS` en `efeonce-rooms/src/server/mcp/manifest.ts`
  y un MCP stdio local (`scripts/rooms-mcp.ts`).

### Gap

- No hay provider `rooms`, ni scopes `efeonce.mcp.rooms.*` en el gateway, ni canje hacia Efeonce ID para otra
  audiencia.
- El gateway no tiene cuotas por clase de scope para un provider: hoy traduce `rate_limited` que devuelve el
  provider [verificar si existe un limitador propio por principal/provider/tool, §Security boundary del ADR].
- No existe la excepción escrita a la regla de preview y confirmación para writes directos.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: gateway `efeonce-mcp` (repo hermano, Cloud Run `efeonce-mcp-gateway`, `southamerica-west1`); gobierno documental en `greenhouse-eo/docs/**`
- Future candidate home: `remain-shared`
- Boundary: el provider sólo transporta llamadas MCP a la API canónica de Rooms con dos credenciales; la autorización vive en Rooms y la emisión en Efeonce ID; ninguna regla de negocio de Rooms entra al gateway
- Server/browser split: sólo servidor; ni el token delegado ni el ID token llegan al cliente MCP ni al modelo
- Build impact: none (reutiliza `google-auth-library` y el SDK MCP vigentes; el manifiesto generado es un archivo versionado, no una dependencia)
- Extraction blocker: none en greenhouse-eo; en el gateway, el despliegue comparte revisión con todos los providers, así que un deploy de este provider re-despliega la superficie completa

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: catálogo de operaciones de Rooms (`canonicalMcpOperations`) y su clasificación D2; superficie federada del gateway (`surface-baseline.json`)
- Consumidores afectados: clientes MCP (Codex, Claude Code, hospedados), Rooms de producción, Efeonce ID (canje), `efeonce.gateway.status`
- Runtime target: gateway Cloud Run (staging de canary y producción), Rooms production (Vercel), `auth-server`

### Contract surface

- Contrato existente a respetar: contrato de provider del gateway (§Provider contract), API de Rooms y su contrato de acceso enmendado, token delegado de TASK-2086, `efeonce.gateway.status`
- Contrato nuevo o modificado: tools `rooms.*` (nombres desde el manifiesto generado), scopes `efeonce.mcp.rooms.*`, entrada `rooms` en el estado del gateway, flag `ROOMS_PROVIDER_ENABLED` [nombre propuesto]
- Backward compatibility: `gated` (provider en `policy-blocked` por defecto; agregar tools es minor)
- Full API parity: cada tool delega en el comando o reader canónico de Rooms que ya usan la CLI, el SDK y la UI; el gateway no agrega lógica propia

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna en Greenhouse ni en el gateway (sin persistencia); en Rooms escribe a través de sus comandos, que registran `actor_kind=agent`, `agent_client_id` y `channel=gateway` (TASK-2084)
- Invariantes que no se pueden romper:
  - toda operación de `canonicalMcpOperations` está federada con su clase o excluida con motivo; el guard falla nombrando la operación
  - la clase de cada tool en el gateway coincide con la clasificación de TASK-2084; una divergencia rompe el build
  - ninguna tool excluida en D2 se registra
  - cada llamada lleva ID token del gateway + token delegado; el token del usuario nunca sale
  - `organizationId` explícito por llamada; nunca inferido
  - un token de Entra responde con motivo explícito antes del dispatch
- Write-target allowlist: N/A — el gateway no escribe en bases de datos; las escrituras ocurren en Rooms por sus comandos canónicos
- Tenant/space boundary: `organizationId` explícito por llamada viaja en el canje y en la llamada; Rooms resuelve el binding `(issuer, sub, organization_id)`
- Idempotency/concurrency: el gateway propaga la `Idempotency-Key` que exige cada comando de Rooms; cachea el token delegado por `(persona, jti del subject, clase, organizationId)` sólo hasta su `exp` menos margen, nunca entre personas
- Audit/outbox/history: logs estructurados del gateway (correlation ID, principal opaco, provider, tool, clase, outcome, duración); la auditoría de negocio vive en Rooms con actor de agente

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: provider `policy-blocked` (variable de repo OFF); `ROOMS_AGENT_LANE_ENABLED` OFF en Rooms hasta TASK-2087
- Backfill plan: ninguno
- Rollback path: variable a OFF + deploy por dispatch (provider vuelve a `policy-blocked` sin registrar tools); o tráfico a la revisión anterior; revocación de consentimientos en Efeonce ID como tercer interruptor
- External coordination: cliente confidencial del gateway en Efeonce ID y su secreto montado; audiencia de Rooms y allowlist del service account del gateway en Rooms; release del gateway por dispatch manual; autorización del operador para cada clase en producción

### Security and access

- Auth/access gate: token MCP nativo con la clase requerida (challenge `insufficient_scope` si falta) → canje por token delegado → Rooms verifica ambas credenciales y la autoridad de la persona
- Sensitive data posture: `read.client` expone preguntas, correos de invitados y actividad del cliente; queda `policy-blocked` por separado hasta la revisión de gobierno de datos IA del ADR; nunca bytes ni URLs firmadas
- Error contract: errores MCP sanitizados (`insufficient_scope`, `policy_blocked`, `rooms_requires_efeonce_id`, `rate_limited`, `provider_unavailable`); nunca errores crudos de Rooms ni del emisor
- Abuse/rate-limit posture: cuotas del gateway por persona y clase (más estrictas en `release` y `access`), además de los topes por persona y hora de Rooms (TASK-2084)

### Runtime evidence

- Local checks: `pnpm check` en `efeonce-mcp` (format, typecheck, tests, build) con guard de paridad, política por clase y `version.test.ts`
- DB/runtime checks: N/A en el gateway; en Rooms, lectura de `command_receipts`/`audit` con `actor_kind=agent` y `channel=gateway` tras cada canary
- Integration checks: `scripts/rooms-canary.mjs` por clase contra staging y luego producción, con sesión MCP humana real (PKCE interactivo)
- Reliability signals/logs: `rooms.agent.bearer_rejected`, `rooms.agent.quota_hit`, `rooms.agent.release_actions` (Rooms); logs del gateway por clase y outcome
- Production verification sequence: ver «Rollout Plan & Risk Matrix»

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist del dominio: N/A, el gateway no crea tablas.
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

### Slice 1 — Delta de excepción y contrato del provider (greenhouse-eo)

- Delta en `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`: el provider `rooms` ejecuta writes directos en las clases
  `author`, `release` y `access`, sin preview ni confirmación humana, como excepción autorizada por el operador el
  2026-10-31 («Los agentes son ciudadanos de primera clase, pueden dar acceso y publicar»). Registra sus
  compensaciones (atribución, aviso a la persona, reversa con un clic, cuotas, eval de oficio) y que no crea
  precedente para otros providers.
- Sección «Provider Rooms» en el runbook con interruptores, cuotas, canary y rollback.

### Slice 2 — Manifiesto, paridad y scopes (efeonce-mcp)

- `scripts/sync-rooms-tool-manifest.mjs` genera `rooms-tool-manifest.generated.ts` desde el catálogo de Rooms con
  clase por operación y hash verificado al cargar.
- `rooms-tool-parity.ts`: guard bidireccional contra `canonicalMcpOperations`, `MCP_OPERATION_EXCLUSIONS` y la
  clasificación de TASK-2084; tests que lo ven encenderse con una operación de mentira.
- `config.ts` y `tool-policy.ts`: las cinco clases, sólo emisor nativo, `read.client` con interruptor propio.

### Slice 3 — Provider y doble credencial

- `src/providers/rooms.ts`: ID token con audiencia exacta de Rooms + canje contra Efeonce ID con el cliente
  confidencial del gateway (TASK-2086), cache acotada del token delegado, propagación de `organizationId` e
  `Idempotency-Key`, traducción sanitizada de errores.
- Estado `enabled | policy-blocked` desde variable de repo; entrada `rooms` en `efeonce.gateway.status`.

### Slice 4 — Cuotas por clase

- Límite por persona y clase en el gateway (valores en Discovery, más bajos en `release` y `access`), con respuesta
  `rate_limited` y log por clase.

### Slice 5 — Versión, deploy y canary por clase

- Bump minor + `pnpm surface:baseline`; variables y secretos en `deploy.yml` (`--set-secrets` completo).
- Canary real en orden: `read` → `author` → `release` → `access`, cada uno con autorización del operador en
  producción y lectura del actor en Rooms; `read.client` sólo tras la revisión de gobierno de datos IA.

## Out of Scope

- Emitir el token delegado o cambiar Efeonce ID (TASK-2086).
- Verificar el bearer en Rooms, columnas de actor, avisos, reversas y topes de Rooms (TASK-2087, TASK-2084).
- Pantalla «Actividad de agentes» (TASK-2085).
- Fuentes de contenido y medios gobernados (TASK-2089, TASK-2090); bytes y URLs firmadas quedan excluidos.
- Habilitar `read.client` para clientes reales.
- Extender la excepción de writes directos a otros providers.

## Detailed Spec

| Clase | Ejemplos de operación (fuente: D2) | Consentimiento | Canary |
|---|---|---|---|
| `efeonce.mcp.rooms.read` | salas, borradores, ediciones, cobertura, «Ver como», estado de medios | normal | 1.º |
| `efeonce.mcp.rooms.read.client` | preguntas y textos del cliente, invitados, actividad y señales | explícito y aparte | tras revisión de gobierno de datos IA |
| `efeonce.mcp.rooms.author` | `rooms.create`, `rooms.updateDraft`, `content.*`, `editions.reopen` | step-up | 2.º |
| `efeonce.mcp.rooms.release` | `editions.publish`, `rooms.archive`, `invitations.*`, `questions.answer/resolve`, `steps.*`, `tours.upsert` | step-up | 3.º |
| `efeonce.mcp.rooms.access` | `access.grant/revoke`, `members.grantInternal/renewInternal/revokeInternal` | step-up | 4.º |

Cada canary de escritura se hace sobre una sala y una organización de prueba, verifica en Rooms
`actor_kind=agent`, `agent_client_id` y `channel=gateway`, ejecuta la reversa correspondiente (D4) y la deja
registrada. La tabla de clases por operación del provider **no se transcribe**: sale del manifiesto generado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (delta de excepción) antes de cualquier write directo habilitado: sin la excepción escrita, `author`,
  `release` y `access` no se encienden.
- Slice 2 → Slice 3 → Slice 4 → Slice 5. El provider no se enciende en ningún entorno sin cuotas (Slice 4).
- Slice 5 en producción sólo con TASK-2086 desplegada (flag ON) y TASK-2087 con `ROOMS_AGENT_LANE_ENABLED` ON.
- Canary estrictamente en orden read → author → release → access; un fallo detiene las clases siguientes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El gateway reenvía el token del usuario a Rooms | identity | low | sólo token delegado + ID token; test que inspecciona headers salientes | `rooms.agent.bearer_rejected` |
| Un agente en bucle publica o invita en masa | Rooms / cliente | medium | cuotas por clase en el gateway + topes por persona y hora en Rooms + aviso a la persona | `rooms.agent.quota_hit`, `rooms.agent.release_actions` |
| Operación nueva de Rooms federada sin clase o con la clase equivocada | identity | medium | manifiesto generado + guard bidireccional contra TASK-2084 | build rojo nombrando la operación |
| Exposición de datos del cliente al modelo vía `read.client` | privacidad | medium | interruptor propio OFF hasta revisión de gobierno de datos IA | conteo de llamadas `read.client` |
| Deploy del gateway rompe otros providers | release / MCP | medium | `pnpm check` + `version.test.ts` + canary de providers existentes; tráfico fijado por revisión | `efeonce.gateway.status`, smoke de front door |
| Token delegado cacheado entre personas u organizaciones | identity | low | clave de cache con persona, `jti` del subject, clase y organización; test de aislamiento | `rooms.agent.bearer_rejected` |
| Usuario con Entra sin camino | UX agente | medium | motivo `rooms_requires_efeonce_id` antes del dispatch | conteo por motivo en logs |

### Feature flags / cutover

- `ROOMS_PROVIDER_ENABLED` [nombre propuesto] como variable de repo de `efeonce-mcp`, default OFF ⇒
  `policy-blocked` y ninguna tool `rooms.*` registrada.
- Interruptor separado para `read.client` [nombre en Discovery], OFF hasta la revisión de gobierno de datos IA.
- Los otros dos interruptores del ADR (D7) viven fuera: `ROOMS_AGENT_LANE_ENABLED` en Rooms y la revocación en
  Efeonce ID.
- Revert: variable OFF + dispatch del workflow (< 15 min) o tráfico a la revisión anterior (< 5 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del delta documental | < 10 min | sí |
| Slice 2 | revert PR (sin efecto en runtime mientras el provider esté OFF) | < 30 min | sí |
| Slice 3 | variable OFF + dispatch; provider `policy-blocked` | < 15 min | sí |
| Slice 4 | revert PR con el provider OFF | < 30 min | sí |
| Slice 5 | tráfico a la revisión anterior + variable OFF; reversas D4 de lo que hizo el canary | < 15 min | sí (las acciones de negocio se revierten por comando) |

### Production verification sequence

1. `pnpm check` en `efeonce-mcp`; ver el guard de paridad y `version.test.ts` encenderse con casos de mentira.
2. Deploy por dispatch con el provider OFF; readback de revisión y `efeonce.gateway.status` (`rooms:
   policy-blocked`); smoke del front door (`/.well-known/oauth-protected-resource` 200, `/mcp` sin token 401).
3. Staging/canary: provider ON contra Rooms con `ROOMS_AGENT_LANE_ENABLED` ON; canary `read` con sesión MCP humana.
4. Producción, con autorización del operador por clase: `read` → `author` → `release` → `access`; después de cada
   uno, lectura del actor en Rooms y reversa.
5. Observación de `rooms.agent.*` durante siete días.

### Out-of-band coordination required

- Operador: autorización por clase en producción y aprobación del delta de excepción.
- Efeonce ID: cliente confidencial del gateway registrado (TASK-2086) y su secreto en Secret Manager con
  `secretAccessor` acotado al service account del gateway.
- Rooms: audiencia exacta y allowlist del service account del gateway (TASK-2087).
- Revisión de gobierno de datos IA (`greenhouse-ai-creative-rights-governance` + legal) antes de `read.client`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El delta de excepción para writes directos de `author`/`release`/`access` está en `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` con la cita del operador y sus compensaciones.
- [ ] Cada operación de `canonicalMcpOperations` está federada con su clase o excluida con motivo, y el guard de paridad falla nombrando una operación nueva sin clasificar.
- [ ] Ninguna operación de la fila «Excluidas» de D2 aparece en `tools/list`.
- [ ] Una llamada sin la clase requerida responde `403 insufficient_scope` con la clase en el challenge.
- [ ] Un test verifica que la llamada a Rooms lleva ID token del gateway + token delegado y no lleva el token del usuario.
- [ ] Un token de Entra recibe `rooms_requires_efeonce_id` sin llegar a Rooms.
- [ ] Con la variable OFF, `efeonce.gateway.status` muestra `rooms: policy-blocked` y no hay tools `rooms.*`.
- [ ] Superar la cuota de una clase responde `rate_limited` y deja log por clase.
- [ ] `package.json` sube de versión minor y `surface-baseline.json` se regeneró con `pnpm surface:baseline`.
- [ ] Canary real verde en producción para `read`, `author`, `release` y `access`, cada uno con actor de agente leído en Rooms y su reversa ejecutada.
- [ ] `read.client` permanece apagado en producción mientras no exista la revisión de gobierno de datos IA.

## Verification

- `pnpm check` en `efeonce-mcp`
- `pnpm surface:baseline` (diff revisado)
- `node scripts/rooms-canary.mjs` por clase (sesión MCP humana)
- `pnpm local:check` en greenhouse-eo para los docs de gobierno

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `EPIC-052`, `EPIC-044`, `TASK-2087` y `TASK-2091` reflejan el estado de esta task.
- [ ] Skills `efeonce-mcp-platform` y `efeonce-rooms` actualizadas y espejadas.
- [ ] Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` con runtime `efeonce-mcp`.

## Follow-ups

- Habilitar `read.client` tras la revisión de gobierno de datos IA.
- Federar `media.importFromSource` cuando TASK-2090 lo entregue.
- Revisar si la cache del token delegado y el canje deben compartirse con TASK-1917.

## Open Questions

- Valores iniciales de las cuotas por persona y clase en el gateway, y si se coordinan con los topes por hora de
  Rooms.
- Si el gateway ya tiene un limitador propio por principal, provider y tool (ADR §Security boundary) o hay que
  construirlo en este corte.
- Entorno de canary previo a producción para el gateway (revisión etiquetada sin tráfico o servicio de staging).
