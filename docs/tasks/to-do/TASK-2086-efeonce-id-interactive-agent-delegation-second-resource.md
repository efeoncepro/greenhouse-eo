# TASK-2086 — Efeonce ID: delegación interactiva de agentes para un segundo resource server

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Epic: `EPIC-044`
- Status real: `Diseno — registrada 2026-10-31 como pieza 2 del orden del ADR del carril de agentes de Rooms (EPIC-052). Sin implementación`
- Rank: `TBD`
- Domain: `identity|platform`
- Blocked by: `Retención de Efeonce ID (PR #263 main y PR #264 develop abiertas y sin merge; ningún cambio nuevo del emisor se publica hasta liberarla) · TASK-1833 (gates de seguridad del emisor que apliquen a un grant nuevo: B15/B20, incidente y señales)`
- Branch: `Greenhouse develop (services/auth-server, src/lib/auth-server, scripts/auth-server, migrations, docs); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Efeonce ID (`auth.efeonce.org`) aprende a emitir, para una **segunda audiencia** (la API de Rooms, configurable),
un token delegado corto que el gateway `mcp.efeonce.org` obtiene por **canje RFC 8693** a partir del access token
de la persona: `sub` = la persona, `act` = el cliente del agente y el gateway, scope reducido a las clases
`efeonce.mcp.rooms.*` que la persona consintió, `organizationId`, TTL ≤ 5 min y `jti` revocable. Sólo el cliente
confidencial del gateway puede pedir el canje y sólo para el emisor nativo. Es la pieza que habilita D1 del ADR del
carril de agentes de Rooms; no la cubre TASK-1917.

## Why This Task Exists

- El ADR [carril de agentes de Rooms](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md) (Accepted
  2026-10-31) decidió que en producción un agente opera Rooms sólo por el gateway, y que el gateway presenta a Rooms
  dos credenciales: su identidad de workload y un token delegado de Efeonce ID para la audiencia de Rooms (D1).
- Hoy el emisor no puede producir ese token, por tres razones verificadas en el código:
  - hay una sola audiencia: `config.mcpAudience` (`src/lib/auth-server/oauth/config.ts`), firmada en
    `src/lib/auth-server/oauth/tokens.ts`; un `resource` distinto responde `invalid_target`
    (`src/lib/auth-server/oauth/authorize.ts`);
  - el endpoint de token sólo acepta `authorization_code` y `refresh_token` (`src/lib/auth-server/oauth/token.ts`,
    `unsupported_grant_type` en cualquier otro caso) y la metadata publica sólo esos dos
    (`src/lib/auth-server/oauth/metadata.ts`);
  - la autoridad interna nativa v2 delega sólo `growth.seo.observation.read`; sumar las clases de Rooms exige su
    propia autorización según D10 de la
    [autoridad interna nativa](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md), no un flag.
- [TASK-1917](TASK-1917-efeonce-id-agent-run-delegation-act.md) diseña `act` para corridas **en segundo plano** de
  Marketing Studio: audiencia del gateway, canje en Greenhouse
  (`src/lib/sister-platforms/mcp-token-exchange.ts`) y registro de delegaciones por corrida. No cubre un agente
  **interactivo** conectado por PKCE, ni una segunda audiencia, ni un canje dentro del propio emisor.

## Goal

- El emisor reconoce una segunda audiencia de recurso (Rooms), configurable por entorno y gobernada por
  `deploy.sh`, sin cambiar la audiencia ni la forma de los tokens del gateway.
- Existe un grant `urn:ietf:params:oauth:grant-type:token-exchange` que sólo el cliente confidencial del gateway
  puede usar, y que convierte el access token vigente de la persona en un token de audiencia Rooms con `sub`,
  `act`, scope reducido, `organizationId`, TTL ≤ 5 min y `jti` revocable.
- Las clases `efeonce.mcp.rooms.read|read.client|author|release|access` quedan declaradas en paridad y autorizadas
  según D10: consentimiento fresco por clase, step-up al consentir las de escritura y `read.client` como
  consentimiento explícito y aparte.
- El cliente confidencial de Rooms puede introspectar (RFC 7662) esos tokens para cortar una revocación en < 30 s.
- Un sujeto que entra por Entra recibe un motivo explícito, nunca un token parcial.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (D1 identidad, D2 clases de scope, D7
  interruptores; «Orden», punto 2)
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` (emisor nativo, llave KMS HSM, clases de
  token)
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (§2 endpoints, §4 tokens, §5 consentimiento, §7
  tablas, §9 configuración, §10 invariantes)
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D8 actor y objetivo, D9 contrato v2, D10
  consentimiento fresco, D11 revocación y rollout)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (punto 7: un scope por clase de blast-radius;
  punto 8: identidad humana y de workload son planos distintos; §Security boundary)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` §«Auth server propio»
- `.claude/rules/auth-server.md` (auto-load por path)

Reglas obligatorias:

- **Sólo Efeonce ID emite el token delegado.** El gateway lo pide; nunca lo acuña ni reenvía el token del usuario a
  Rooms.
- **Sólo el cliente confidencial del gateway** puede invocar el canje; un cliente público (Codex, Claude Code,
  hospedados) que lo intente recibe `unauthorized_client`.
- **El token delegado nunca amplía al de la persona:** scope pedido ⊆ scopes consentidos y vigentes del subject
  token; fuera de eso, `invalid_scope` al emitir, nunca recorte silencioso.
- **`act` es atribución, no frontera:** la frontera es la autenticación del cliente confidencial del gateway más
  los scopes consentidos. Nunca se acepta un `actor_token` que el emisor no pueda verificar.
- **Sólo emisor nativo.** Un subject token de Entra u otro issuer responde con motivo explícito
  (`subject_issuer_unsupported`), nunca con un token degradado.
- **Corto y sin refresh:** TTL ≤ 300 s; el canje nunca devuelve `refresh_token`.
- **Revocable antes de 30 s:** revocar el consentimiento o la familia del subject token deja `active:false` en la
  introspección de los tokens delegados derivados.
- Deploy sólo por `services/auth-server/deploy.sh` + `.github/workflows/auth-server-deploy.yml`; flags sólo por
  variables de repositorio GitHub gobernadas (inputs del workflow). **NUNCA** `gcloud run services update
  --update-env-vars` a mano (regla 5 de `.claude/rules/auth-server.md`).
- Nunca loggear tokens, `subject_token`, `actor_token`, `jti` ni `sub` en claro; sólo hashes, audit append-only.

## Normative Docs

- `docs/operations/runbooks/auth-server.md` (§«Estado operativo y retención — 2026-10-26»: PR #263/#264)
- `docs/tasks/to-do/TASK-1917-efeonce-id-agent-run-delegation-act.md` (precedente, alcance distinto)
- `docs/tasks/in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md`
- `docs/tasks/to-do/TASK-1840-efeonce-id-multiproduct-logout-session-revocation.md`
- `.claude/skills/efeonce-auth/SKILL.md` y `.claude/skills/efeonce-mcp-platform/SKILL.md` +
  `references/capability-intake.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- Liberación de la retención de Efeonce ID (PR #263/#264). Hasta entonces el código puede quedar local o en rama,
  pero no se despliega.
- TASK-1833: gates de seguridad que el operador declare aplicables a un grant nuevo del endpoint de token.
- Emisor productivo (`services/auth-server/`, revisión vigente resuelta por readback, no por este documento):
  llave KMS HSM `auth-server-es256`, tablas `greenhouse_auth.*` de TASK-1829, autoridad interna de TASK-1836/1844.
- Rooms expone su audiencia de recurso y registra su cliente confidencial de introspección (coordinado con
  TASK-2087).

### Blocks / Impacts

- `TASK-2087` (Rooms: verificador del token delegado + identidad del gateway) queda bloqueada sólo por esta task.
- `TASK-2088` (efeonce-mcp: provider `rooms`) depende de esta task a través de TASK-2087.
- `TASK-1917`: comparte el claim `act` y el grant de canje; ver «Convergencia» en Detailed Spec.
- `TASK-1840` (logout multiproducto): cerrar las sesiones de una persona debe revocar también sus tokens delegados
  de Rooms vigentes.
- `TASK-1833`: el red-team suma este grant (escalamiento de scope, canje por un cliente público, subject token
  ajeno, reuso tras revocación).

### Files owned

- `src/lib/auth-server/oauth/token.ts` (despacho del grant nuevo)
- `src/lib/auth-server/oauth/token-exchange.ts` [nuevo]
- `src/lib/auth-server/oauth/tokens.ts` (audiencia parametrizada y claims `act`/`organizationId`)
- `src/lib/auth-server/oauth/config.ts` (audiencias de recurso adicionales)
- `src/lib/auth-server/oauth/scopes.ts` + `scopes.test.ts` (clases `efeonce.mcp.rooms.*` en paridad)
- `src/lib/auth-server/oauth/consent.ts`, `consent-step-up.test.ts` (step-up y `read.client` aparte)
- `src/lib/auth-server/oauth/revoke-introspect.ts` (introspección para el cliente de Rooms)
- `src/lib/auth-server/oauth/metadata.ts` (`grant_types_supported`)
- `src/lib/auth-server/oauth/store/{port,postgres-store,memory-store}.ts` (ledger del token delegado)
- `src/lib/auth-server/internal/grants.ts` [verificar] (autorización D10 de las clases de Rooms)
- `src/lib/auth-server/boundary-domain.test.ts` (tabla/columnas nuevas declaradas)
- `src/lib/copy/auth-server.ts` (descripción es-CL de cada clase)
- `migrations/<timestamp>_task-2086-auth-delegated-resource-tokens.sql` [nuevo]
- `services/auth-server/deploy.sh`, `.github/workflows/auth-server-deploy.yml`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`,
  `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`,
  `docs/operations/runbooks/auth-server.md`, `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- Emisor `auth.efeonce.org` en Cloud Run `us-east4` (`services/auth-server/app.ts`, `server.ts`, `deploy.sh`) con
  JWT ES256 de 15 min firmado en KMS HSM, refresh rotativo con detección de reuso, revocación RFC 7009 e
  introspección RFC 7662 para clientes confidenciales (`src/lib/auth-server/oauth/revoke-introspect.ts`).
- Ledger de `jti` en `greenhouse_auth.access_tokens` (migración `20260904130826694_task-1829-auth-oauth-tables.sql`):
  `jti`, `grant_id`, `client_id`, `subject`, `environment_id`, `scopes`, `issued_at`, `expires_at`,
  `revoked_at`, `revoke_reason`. Sin columna de audiencia ni de actor.
- Consentimiento persistido por `(subject, client, scope)` con step-up para scopes de escritura
  (`isWriteScope` en `src/lib/auth-server/oauth/scopes.ts`; `consent.ts`, `consent-step-up.test.ts`).
- Contexto interno v2 multiorganización (`src/lib/auth-server/internal/**`, TASK-1844) con reader canónico de
  objetivos sin caché positiva.
- Registro de clientes confidenciales por command (`pnpm auth-server:register-client`).
- Variables de repo `AUTH_SERVER_FIRST_PARTY_ENABLED` y `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` como inputs de
  `auth-server-deploy.yml` (patrón a seguir para el flag nuevo).

### Gap

- No hay segunda audiencia ni forma de pedirla.
- No hay grant de canje, ni `act`, ni `organizationId` firmado en el token.
- Las clases `efeonce.mcp.rooms.*` no existen en `scopes.ts` ni en el consentimiento.
- La introspección no distingue tokens de otra audiencia ni sirve a un resource server distinto del gateway.
- No hay señal de canje rechazado ni de uso tras revocación para tokens delegados.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: emisor `services/auth-server/` + dominio `src/lib/auth-server/oauth/**` y `src/lib/auth-server/internal/**` (Greenhouse); consumidores en `efeonce-mcp` (canje) y `efeonce-rooms` (verificación e introspección)
- Future candidate home: `remain-shared`
- Boundary: el emisor es la única autoridad que acuña el token delegado; el gateway sólo lo pide con su cliente confidencial y Rooms sólo lo verifica e introspecta; ningún consumidor importa código del emisor
- Server/browser split: sólo servidor; el token delegado nunca llega al navegador ni al modelo del agente
- Build impact: none (reutiliza `jose` y la firma KMS existente; sin dependencias nuevas)
- Extraction blocker: el emisor comparte el schema `greenhouse_auth` y la excepción EPIC-027 del deployable `auth-server`; el corte está gobernado por la retención de PR #263/#264

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: emisión de tokens del emisor nativo (`/oauth/token`), `greenhouse_auth.access_tokens` (ledger `jti`) y `greenhouse_auth.client_consents`
- Consumidores afectados: gateway `efeonce-mcp` (canje, TASK-2088), Rooms (verificación e introspección, TASK-2087), clientes MCP (pantalla de consentimiento)
- Runtime target: `auth-server` (Cloud Run `us-east4`, servicio único staging+prod), staging y production

### Contract surface

- Contrato existente a respetar: forma del access token del gateway (§4.1 del contrato del emisor), consentimiento por scope con step-up (§5), invariantes §10, contexto interno v2 (D8–D11)
- Contrato nuevo o modificado:
  - `POST /oauth/token` con `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`, `subject_token` (access token nativo de audiencia gateway), `subject_token_type=urn:ietf:params:oauth:token-type:access_token`, `resource` = audiencia Rooms, `scope` reducido y el objetivo `organizationId` (parámetro exacto en Slice 1)
  - respuesta RFC 8693: `access_token`, `issued_token_type=urn:ietf:params:oauth:token-type:access_token`, `token_type=Bearer`, `expires_in` ≤ 300, `scope`; sin `refresh_token`
  - token delegado: `iss`, `sub` (persona), `aud` (audiencia Rooms exacta), `azp` (cliente del gateway), `act` (gateway como actor actual y cliente del agente anidado, RFC 8693 §4.1), `scope`, `organizationId`, `gv`, `authorization_context_id`/`version`, `iat`, `exp`, `jti`
  - `POST /oauth/introspect` acepta al cliente confidencial de Rooms para tokens de su audiencia
  - metadata: `grant_types_supported` suma el grant sólo con el flag ON
- Backward compatibility: `gated` (flag OFF por defecto; los tokens y flujos existentes no cambian)
- Full API parity: el canje es un contrato OAuth estándar consumible por cualquier cliente confidencial autorizado; registrar el cliente y revocar consentimientos usan los commands existentes (`pnpm auth-server:register-client`, `POST /api/admin/auth-server/consents/revoke`)

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_auth.access_tokens` (columnas aditivas nullable: `audience`, `actor_client_id`, `agent_client_id`, `subject_jti`, `organization_id` [forma exacta en Discovery]); `greenhouse_auth.oauth_clients` (permiso de canje e introspección por cliente); `greenhouse_auth.client_consents` (filas por clase de Rooms); `greenhouse_auth.oauth_audit_events` (eventos nuevos)
- Invariantes que no se pueden romper:
  - scope del token delegado ⊆ scopes `efeonce.mcp.rooms.*` con consentimiento `active` del subject token; nunca amplía
  - sólo el cliente confidencial del gateway autenticado puede canjear; su `client_id` queda como actor
  - el subject token debe ser nativo, vigente, no revocado en el ledger `jti`, de audiencia gateway y de población `internal`
  - `aud` del token delegado es exactamente la audiencia de Rooms configurada; nunca la del gateway
  - TTL ≤ 300 s y nunca más allá del `exp` del subject token; sin refresh
  - revocar la familia del subject token o el consentimiento de la clase deja inactivos los tokens delegados derivados
  - un subject de Entra recibe `subject_issuer_unsupported`
  - la autoridad sobre Rooms la decide Rooms; el emisor sólo acredita persona, actor, clase consentida y objetivo
- Write-target allowlist: `greenhouse_auth` (dominio del emisor); declarar las columnas/tablas nuevas en `src/lib/auth-server/boundary-domain.test.ts` en el mismo PR
- Tenant/space boundary: el `organizationId` del token sale del objetivo pedido por el gateway y se valida contra el reader canónico de objetivos de la persona (D8, sin caché positiva); nunca se infiere del email ni de la primera membership
- Idempotency/concurrency: cada canje emite un `jti` nuevo; el canje no consume ni rota el subject token; la cache de tokens delegados vive en el gateway (TASK-2088) y nunca en el emisor
- Audit/outbox/history: `oauth_audit_events` append-only con `token_exchange_issued`, `token_exchange_denied` (motivo), `introspect` por cliente; sin tokens ni `sub` en claro

### Migration, backfill and rollout

- Migration posture: `additive` (columnas nullable en `access_tokens` + permisos por cliente), con `-- Up Migration` y bloque `DO` de verificación
- Default state: flag OFF (`AUTH_SERVER_ROOMS_DELEGATION_ENABLED` [nombre propuesto], default `false`); audiencia de Rooms sin configurar ⇒ el canje responde `invalid_target`
- Backfill plan: ninguno (no hay tokens delegados previos)
- Rollback path: variable de repo a `false` + deploy gobernado; revocación masiva de tokens delegados vigentes por `audience`; revert PR; la migración aditiva se conserva
- External coordination: liberación de PR #263/#264; registro de los clientes confidenciales del gateway (canje) y de Rooms (introspección); secretos de ambos en Secret Manager; autorización del operador para cada flip en producción

### Security and access

- Auth/access gate: cliente confidencial del gateway (`client_secret_basic`/`client_secret_post`, o `private_key_jwt` si Discovery lo decide) + subject token nativo con consentimiento `active` por clase + autoridad interna vigente (`gv`/contexto)
- Sensitive data posture: tokens y `sub` sólo como hash; el token delegado no contiene correo ni nombre
- Error contract: RFC 6749 §5.2 con `error` estándar (`invalid_grant`, `invalid_scope`, `invalid_target`, `unauthorized_client`) y `reason` interno sanitizado (`subject_issuer_unsupported`, `subject_revoked`, `scope_not_consented`, `target_not_authorized`); detalle sólo a `captureWithDomain('identity', component=auth-server)`
- Abuse/rate-limit posture: límite propio del grant por cliente (el gateway llama por persona y objetivo) dimensionado en Discovery sin relajar los 60/min IP y 120/min cliente vigentes para los demás grants; TTL corto

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/auth-server` con casos de canje (allow, scope ampliado, cliente público, subject Entra, subject revocado, audiencia ajena, TTL, sin refresh) y `oauth-flow.test.ts` extendido
- DB/runtime checks: `pnpm auth-server:oauth-store:smoke` contra PG real con el ledger extendido; `SELECT` de las columnas nuevas en `information_schema.columns`
- Integration checks: canje real en staging con un cliente confidencial de prueba → token verificado con el JWKS → introspección por el cliente de Rooms → revocación del consentimiento → `active:false` en < 30 s
- Reliability signals/logs: `auth.oauth.token_exchange_denied` (por motivo) y `auth.oauth.delegated_token_used_after_revoke` (steady 0) en `src/lib/reliability/queries/auth-server-signals.ts`
- Production verification sequence: ver «Rollout Plan & Risk Matrix»

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla o columna nueva queda declarada con su justificación en `src/lib/auth-server/boundary-domain.test.ts`, en el mismo PR.
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

### Slice 1 — Contrato y autorización D10

- Delta en `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`: §2 (grant de canje e introspección por resource server),
  §4 (token delegado: claims, `act` anidado, TTL, sin refresh), §9 (audiencias y flag), §10 (invariantes nuevos).
- Delta en `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` que registra las cinco clases
  `efeonce.mcp.rooms.*` como autorización nueva (D10): consentimiento fresco por clase, step-up al consentir
  `author`/`release`/`access`, `read.client` explícito y aparte; v2 sigue sin delegar otras clases.
- Fija el nombre del parámetro del objetivo (`organizationId`) y del flag.

### Slice 2 — Segunda audiencia y clases de scope

- `config.ts` acepta audiencias de recurso adicionales (Rooms) desde `deploy.sh`; la audiencia del gateway no
  cambia. `tokens.ts` firma con audiencia parametrizada.
- `scopes.ts` declara las cinco clases (`author`, `release`, `access` en el set de escritura) en paridad, sin
  publicarlas como mínimo; `src/lib/copy/auth-server.ts` agrega su descripción es-CL.
- Consentimiento: step-up para las tres de escritura; `read.client` en pantalla separada con su advertencia.

### Slice 3 — Grant de canje

- `token-exchange.ts` [nuevo] + despacho en `token.ts`, detrás del flag: autentica al cliente confidencial con
  permiso de canje, verifica el subject token (firma, issuer nativo, audiencia gateway, ledger `jti`, población
  `internal`, contexto/`gv` frescos), intersecta el scope con los consentimientos `active`, valida el objetivo con el
  reader canónico y emite el token delegado con su fila en el ledger.
- Migración aditiva de `access_tokens` + permisos por cliente, con bloque `DO`.
- Motivos explícitos para Entra, cliente público, scope no consentido y objetivo no autorizado.

### Slice 4 — Introspección y revocación en cascada

- `revoke-introspect.ts`: el cliente confidencial de Rooms introspecta tokens de su audiencia; revocar la familia
  del subject token o el consentimiento de una clase inactiva los tokens delegados derivados.
- Señales `auth.oauth.token_exchange_denied` y `auth.oauth.delegated_token_used_after_revoke`.

### Slice 5 — Deploy gobernado, canary y docs

- Flag y audiencia en `services/auth-server/deploy.sh` + inputs de `auth-server-deploy.yml` + variables de repo;
  fila en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime.
- Registro de los clientes confidenciales del gateway y de Rooms (staging primero).
- Canary staging de extremo a extremo; producción sólo con permiso del operador y tras liberar la retención.
- Runbook `auth-server.md`: revocación masiva por audiencia y rollback.

## Out of Scope

- Verificar el token en Rooms, resolver `identity_bindings` y registrar actor (TASK-2087, TASK-2084).
- Provider `rooms` del gateway, su cache de tokens delegados y sus cuotas (TASK-2088).
- Delegación por corrida en segundo plano de Marketing Studio y el canje de Greenhouse (TASK-1917).
- Habilitar el emisor para clientes externos o personas invitadas: este carril es sólo población `internal`.
- Ampliar el contexto interno v2 a otras clases o providers.
- Cambiar la audiencia, TTL o forma del access token del gateway.

## Detailed Spec

Principios fijados por el ADR del carril de agentes (no se reabren en Discovery):

| Aspecto | Decisión |
|---|---|
| Emisor | Sólo Efeonce ID (`auth.efeonce.org`), emisor nativo |
| Quién canjea | Sólo el cliente confidencial del gateway `mcp.efeonce.org` |
| Sujeto / actor | `sub` = persona; `act` = gateway (actor actual) y cliente del agente (anidado) |
| Audiencia | Rooms, configurable; distinta de `https://mcp.efeonce.org/mcp` |
| Scope | Subconjunto de `efeonce.mcp.rooms.*` consentido |
| Atadura | `organizationId` explícito |
| Vida | ≤ 5 min, sin refresh, `jti` revocable |
| Revocación | Efectiva en < 30 s vía introspección de Rooms con caché ≤ 30 s |
| Población | Sólo `internal`; Entra con motivo explícito |

Ejemplo ilustrativo del token delegado (forma final en Slice 1):

```json
{
  "iss": "https://auth.efeonce.org",
  "sub": "<sujeto opaco de la persona>",
  "aud": "<audiencia de Rooms>",
  "azp": "<client_id confidencial del gateway>",
  "act": { "sub": "<client_id del gateway>", "act": { "sub": "<client_id del agente>" } },
  "scope": "efeonce.mcp.rooms.read efeonce.mcp.rooms.author",
  "organizationId": "<org>",
  "gv": 3,
  "authorization_context_id": "<ctx>",
  "authorization_context_version": 2,
  "iat": 1761900000,
  "exp": 1761900300,
  "jti": "<random>"
}
```

**Convergencia con TASK-1917.** Ambas usan `act` y un grant de canje RFC 8693, pero hoy resuelven problemas
distintos: TASK-1917 acuña tokens de corrida en segundo plano (audiencia gateway, canje en Greenhouse, registro de
delegaciones por work item); esta task canjea, dentro del emisor, un token interactivo vigente por uno de otra
audiencia. Si TASK-1917 se toma después, debe reutilizar el parser de `act`, el ledger extendido y el grant de este
corte en vez de crear otro. La convergencia queda como follow-up, no como parte del alcance.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contrato y D10) → Slice 2 (audiencia y clases, flag OFF) → Slice 3 (canje, flag OFF) → Slice 4
  (introspección y cascada) → Slice 5 (deploy gobernado y canary).
- Slice 3 no se habilita en ningún entorno sin Slice 4: un token delegado sin revocación en cascada viola la
  promesa de < 30 s.
- Ningún deploy del emisor antes de liberar la retención de PR #263/#264.
- Producción sólo después de que TASK-2087 esté lista para verificar (un token emitido sin verificador no sirve y
  amplía superficie).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un cliente público obtiene un token delegado | identity | low | grant restringido a clientes confidenciales con permiso explícito; test negativo | `auth.oauth.token_exchange_denied` (motivo `unauthorized_client`) |
| Token delegado con más scope que el consentido | identity | low | intersección con `client_consents` `active`; `invalid_scope` sin recorte silencioso | `auth.oauth.token_exchange_denied` (motivo `scope_not_consented`) |
| Revocación que no corta a tiempo | identity | medium | cascada por familia y consentimiento + introspección con caché ≤ 30 s en Rooms | `auth.oauth.delegated_token_used_after_revoke` |
| Confusión de audiencias (token de Rooms aceptado por el gateway o al revés) | identity | low | `aud` exacto por tipo; tests cruzados | rechazos de `aud` en gateway y Rooms |
| Romper el login o los tokens vigentes de Rooms/gateway por un deploy del servicio compartido | identity / release | medium | flag OFF por defecto; deploy sólo gobernado; readback de revisión, flags y `/readyz` | `auth.issuer.jwks_unreachable`, `/readyz` |
| Saturar el rate limit del endpoint de token con canjes del gateway | identity | medium | límite propio del grant; cache del token delegado en el gateway (TASK-2088) | 429 en `oauth_audit_events` |
| Subject de Entra sin camino claro | identity / UX agente | medium | motivo `subject_issuer_unsupported` propagado por el gateway | conteo por motivo |

### Feature flags / cutover

- `AUTH_SERVER_ROOMS_DELEGATION_ENABLED` [nombre propuesto en Slice 1], default `false`, declarado en
  `services/auth-server/deploy.sh` e input de `auth-server-deploy.yml` desde una variable de repo GitHub. Con OFF el
  grant responde `unsupported_grant_type` y la metadata no lo publica.
- `AUTH_SERVER_ROOMS_AUDIENCE` [nombre propuesto]: sin valor, el canje responde `invalid_target`.
- Cutover: staging ON → canary → producción ON sólo con autorización del operador. Revert: variable a `false` +
  deploy gobernado (< 15 min); no se usa `--update-env-vars`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del delta documental | < 10 min | sí |
| Slice 2 | revert PR; las clases nuevas no se publican como mínimo, así que ningún cliente las porta | < 30 min | sí |
| Slice 3 | variable de repo a `false` + deploy gobernado; revocación masiva de tokens delegados vigentes por audiencia | < 15 min | sí (la migración aditiva se conserva) |
| Slice 4 | revert PR; el flag queda OFF mientras tanto | < 30 min | sí |
| Slice 5 | tráfico a la revisión anterior por `update-traffic` explícito (el tráfico está fijado por revisión) + variable a `false` | < 10 min | sí |

### Production verification sequence

1. Local: `pnpm vitest run src/lib/auth-server` y `pnpm auth-server:oauth-store:smoke` contra PG real.
2. `pnpm migrate:up` + verificación de columnas en `information_schema.columns`.
3. Deploy gobernado a staging con flag OFF; readback de revisión, flags y `/readyz`; login y canje inexistente
   (`unsupported_grant_type`).
4. Flag ON en staging; registro de clientes de prueba; canje con persona interna → token verificado con JWKS →
   introspección por el cliente de Rooms → revocación → `active:false` < 30 s. Casos negativos: cliente público,
   subject Entra, scope ampliado.
5. Liberada la retención y con TASK-2087 lista, producción: deploy gobernado con flag OFF y readback; luego flag ON
   con autorización del operador; canary con una persona interna sobre una organización de prueba.
6. Observación de las dos señales durante siete días.

### Out-of-band coordination required

- Operador: liberar la retención de PR #263/#264 y autorizar cada flip en producción.
- Registro de los clientes confidenciales del gateway y de Rooms y sus secretos (Secret Manager, valor crudo).
- Coordinación con TASK-2087 (audiencia exacta de Rooms) y TASK-2088 (cliente del gateway).
- Coordinación con TASK-1840 para que el logout global revoque tokens delegados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un canje del cliente confidencial del gateway con un subject token nativo vigente devuelve un token con `aud` = audiencia de Rooms, `sub` = persona, `act` con gateway y cliente del agente, `organizationId`, `jti` registrado y `expires_in` ≤ 300.
- [ ] La respuesta del canje nunca incluye `refresh_token`.
- [ ] Pedir un scope no consentido responde `invalid_scope`; el token nunca sale recortado.
- [ ] Un cliente público que intenta el canje recibe `unauthorized_client`.
- [ ] Un subject token de Entra recibe un error con motivo `subject_issuer_unsupported`.
- [ ] Consentir `author`, `release` o `access` exige step-up; `read.client` se consiente en una pantalla aparte.
- [ ] El cliente confidencial de Rooms introspecta el token delegado y obtiene `active:false` dentro de 30 s tras revocar el consentimiento o la familia del subject token.
- [ ] El access token del gateway conserva su audiencia y forma (tests existentes verdes sin cambios de expectativa).
- [ ] Con el flag OFF el grant responde `unsupported_grant_type` y la metadata no lo publica.
- [ ] Flag y audiencia declarados en `deploy.sh`, en el workflow y en el ledger de flags; ningún cambio aplicado con `--update-env-vars`.
- [ ] Canary de staging verde de extremo a extremo; producción sólo con permiso del operador.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/auth-server`
- `pnpm auth-server:oauth-store:smoke`
- `pnpm migration-marker-gate`
- Canary de canje en staging (persona interna real)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `EPIC-044`, `EPIC-052`, `TASK-2087` y `TASK-1917` reflejan el estado de esta task.
- [ ] Skills `efeonce-auth`, `efeonce-mcp-platform` y `efeonce-rooms` actualizadas y espejadas.

## Follow-ups

- Converger con TASK-1917 en un único grant de canje y un único parser de `act` cuando se tome.
- Generalizar el registro de audiencias de recurso si aparece un tercer resource server.
- Superficie para que la persona vea y revoque los consentimientos por clase de Rooms.

## Open Questions

- Autenticación del cliente del gateway: `client_secret_basic` (como hoy) o `private_key_jwt` con la identidad de
  workload del gateway.
- Qué valida el emisor sobre el objetivo: basta con que la organización sea objetivo vigente de la persona según el
  reader canónico (D8), o además exige una capability de Greenhouse concreta para Rooms.
- Parámetro exacto para el objetivo en el canje (`organizationId` en el form o codificado en `resource`).
- Si el token delegado reusa el `grant_id` del subject token (revocación por familia gratis) o lleva uno propio con
  referencia `subject_jti`.
