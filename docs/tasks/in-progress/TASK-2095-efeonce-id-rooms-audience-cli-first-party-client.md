# TASK-2095 — Efeonce ID: audiencia Rooms y cliente first-party de la CLI de agentes

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
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `En producción desde 2026-11-01: hotfix acotado PR #267 (squash 69b0ba9), release 69b0ba90832c released, orquestador 41372622852 success, auth-server-00172-zcn al 100 % con AUTH_SERVER_ROOMS_AUDIENCE=https://efeonce-rooms.vercel.app/api/v1 (readback 2026-11-02). Clientes efeonce-rooms-cli y efeonce-rooms-resource registrados en producción; secreto de introspección en Secret Manager (rooms-production-agent-introspection-client-secret:1). Aceptado 2026-11-02: login real del operador, la sala Volta publicada por la CLI, logout y segundo login verificados. rooms-audience.test.ts: 11 pruebas. Pendiente para el cierre: descripciones del consentimiento (75b40772d, sólo en develop) con el próximo release completo de Greenhouse y gates completos`
- Rank: `TBD`
- Domain: `identity|platform`
- Blocked by: `none; el cierre formal espera que el copy del consentimiento (75b40772d) salga en el próximo release completo de Greenhouse`
- Branch: `Greenhouse develop (src/lib/auth-server, services/auth-server, scripts/auth-server, .github/workflows/auth-server-deploy.yml, docs); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Efeonce ID (`auth.efeonce.org`) suma una **segunda audiencia** (la API de Rooms) y un **cliente público first-party**
(`efeonce-rooms-cli`) para que `pnpm rooms login` obtenga, una vez por equipo, un refresh token de una persona
interna con scopes `efeonce.mcp.rooms.*`. Rooms introspecta esos tokens con un cliente confidencial propio
(`efeonce-rooms-resource`). No agrega grants: reutiliza authorization code + PKCE, refresh rotativo con detección de
reuso, revocación e introspección que ya existen. Es la mitad Efeonce ID de la enmienda D1-bis; la mitad Rooms es
TASK-2087.

## Why This Task Exists

- El operador no acepta entrar con MFA y copiar cookies cada vez que un agente opera Rooms en producción
  (`--session-file`). Pidió una vía como `gh`, `gcloud` o `vercel`: login una vez y renovación sola.
- El ADR del carril de agentes exigía el gateway (D1). La enmienda D1-bis (2026-11-01) agrega el carril CLI directo
  como primer entregable; el gateway (TASK-2086/2088) queda para clientes remotos.
- Hoy el emisor tiene una sola audiencia (`config.mcpAudience`), un `resource` distinto responde `invalid_target`
  (`src/lib/auth-server/oauth/authorize.ts`) y el contexto interno v2 solo admite el scope base
  (`areInternalContextScopesAllowed` en `src/lib/auth-server/oauth/scopes.ts`).

## Goal

- Con `AUTH_SERVER_ROOMS_AUDIENCE` definida, el emisor acepta `resource` = audiencia Rooms y firma tokens con ese
  `aud`; sin la variable, todo queda como hoy.
- Las clases `efeonce.mcp.rooms.*` existen, viven solo en la audiencia Rooms y son **restringidas**: solo las recibe
  un cliente que las liste explícitamente.
- Solo personas internas (contexto de autorización interno) obtienen tokens Rooms.
- El access token de Rooms dura 5 min; el refresh rota en cada uso y su reuso quema la familia.
- El cliente confidencial de Rooms introspecta solo tokens de su audiencia.
- Los dos clientes se registran por command con paridad CLI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (§ Enmienda D1-bis, D2 clases, D7 interruptores)
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (§2 endpoints, §4 tokens, §5 consentimiento, §9
  configuración, §10 invariantes)
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D10: una clase nueva necesita su propia
  autorización; esta task la registra para la audiencia Rooms)
- `.claude/rules/auth-server.md` (auto-load por path)

Reglas obligatorias:

- **Solo Efeonce ID emite.** Rooms verifica e introspecta; nunca acuña.
- **Un token, una audiencia.** El `aud` se deriva de las clases pedidas y se contrasta con `resource`; mezclar clases
  de dos audiencias es `invalid_scope`.
- **Clases Rooms restringidas** a clientes que las listan en `allowed_scopes`; `allowed_scopes` abierto (CIMD/DCR)
  nunca las concede.
- **Solo población interna.** Sin contexto de autorización interno no sale un token Rooms.
- La audiencia y forma del token del gateway no cambian.
- Deploy solo por `services/auth-server/deploy.sh` + `.github/workflows/auth-server-deploy.yml` desde `main`;
  configuración solo por variable de repo GitHub. **NUNCA** `--update-env-vars` manual.
- Nunca loggear tokens ni `sub` en claro.

## Normative Docs

- `docs/operations/runbooks/auth-server.md`
- `.claude/skills/efeonce-auth/SKILL.md` + `references/program-ledger.md`
- `docs/tasks/in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- Emisor productivo en `main` (release `935583f88db0` y hotfix `60872da`): code + PKCE, refresh rotativo,
  revoke/introspect y contexto interno nativo.
- Rooms fija la misma audiencia en su verificador (TASK-2087).

### Blocks / Impacts

- `TASK-2087` (Rooms: verificador del bearer y `pnpm rooms login`) necesita esta task en producción.
- `TASK-2086` (canje para el gateway) reutiliza la audiencia, las clases y la introspección por audiencia de esta task.
- `TASK-1833`: el red-team suma la audiencia y el cliente nuevos (clase pedida por un cliente sin permiso, persona
  externa, reuso de refresh, introspección cruzada).

### Files owned

- `src/lib/auth-server/oauth/scopes.ts` + `scopes.test.ts`
- `src/lib/auth-server/oauth/config.ts`
- `src/lib/auth-server/oauth/resources.ts` [nuevo]
- `src/lib/auth-server/oauth/authorize.ts`, `consent-endpoint.ts`, `token.ts`, `tokens.ts`, `verify.ts`,
  `revoke-introspect.ts`, `clients.ts`, `grants.ts`
- `src/lib/auth-server/internal/grants.ts`, `internal/runtime.ts`
- `src/lib/auth-server/oauth/rooms-audience.test.ts` [nuevo]
- `scripts/auth-server/register-rooms-agent-clients.ts` [nuevo]
- `services/auth-server/deploy.sh`, `.github/workflows/auth-server-deploy.yml`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`, `docs/operations/runbooks/auth-server.md`,
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- Authorization code con PKCE S256, refresh opaco rotativo con detección de reuso y revocación de familia
  (`src/lib/auth-server/oauth/token.ts`, `tokens.ts`).
- Revocación RFC 7009 e introspección RFC 7662 para clientes confidenciales (`revoke-introspect.ts`).
- Clientes públicos con redirect loopback y puerto libre (`clients.ts`, `primitives.ts`).
- Contexto interno nativo atado a `(cliente, audiencia)` (`src/lib/auth-server/internal/context.ts`).
- Step-up al consentir scopes de escritura (`consent.ts`, `consent-step-up.test.ts`).
- Command de clientes confidenciales (`registerConfidentialClient`, `pnpm auth-server:register-client`).

### Gap

- Una sola audiencia, cableada en `authorize`, `consent-endpoint`, `tokens`, `verify`, `introspect` y en los ports de
  grants internos.
- Sin clases `efeonce.mcp.rooms.*` ni noción de clase restringida.
- La introspección responde `aud` fijo y deja ver cualquier token a cualquier cliente confidencial.
- No hay command para un cliente público first-party pre-registrado ni para un cliente de introspección sin
  redirect.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: emisor `services/auth-server/` + `src/lib/auth-server/oauth/**` e `internal/**` (Greenhouse); consumidor `efeonce-rooms` (verificación e introspección)
- Future candidate home: `remain-shared`
- Boundary: el emisor es la única autoridad que acuña; Rooms solo verifica por JWKS e introspecta por HTTP; ningún consumidor importa código del emisor
- Server/browser split: solo servidor y CLI local; los tokens nunca llegan al navegador ni al modelo
- Build impact: none (sin dependencias nuevas)
- Extraction blocker: el emisor comparte el schema `greenhouse_auth` y la excepción EPIC-027 del deployable `auth-server`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: emisión de tokens del emisor nativo (`/oauth/authorize`, `/oauth/token`, `/oauth/introspect`) y `greenhouse_auth.oauth_clients`
- Consumidores afectados: Rooms (verificación e introspección, TASK-2087), CLI de Rooms, clientes MCP existentes (sin cambio)
- Runtime target: `auth-server` (Cloud Run `us-east4`, servicio único)

### Contract surface

- Contrato existente a respetar: forma del access token del gateway (§4.1), consentimiento por scope con step-up (§5), invariantes §10
- Contrato nuevo o modificado:
  - `GET /oauth/authorize` acepta `resource` = audiencia Rooms cuando está configurada
  - access token Rooms: mismos claims que el del gateway, con `aud` = audiencia Rooms y `exp` = `iat` + 300
  - `POST /oauth/introspect`: un cliente con `metadata.introspection_audience` solo ve activos los tokens de esa audiencia; la respuesta trae el `aud` real
  - clientes nuevos: `efeonce-rooms-cli` (público, `none`, loopback) y `efeonce-rooms-resource` (confidencial, sin redirect, solo introspección)
- Backward compatibility: `gated` (sin `AUTH_SERVER_ROOMS_AUDIENCE` nada cambia; tests existentes sin cambio de expectativa)
- Full API parity: registro de clientes por command (`scripts/auth-server/register-rooms-agent-clients.ts`) sobre las primitives de `clients.ts`; revocar consentimiento con el endpoint admin existente

### Data model and invariants

- Entidades/tablas/views afectadas: filas nuevas en `greenhouse_auth.oauth_clients`; sin migración (la audiencia se deriva de las clases persistidas en codes, refresh y access tokens)
- Invariantes que no se pueden romper:
  - toda clase pertenece a exactamente una audiencia; un token nunca mezcla audiencias
  - clases Rooms solo para clientes que las listan y solo para personas internas
  - el access token Rooms dura ≤ 300 s
  - la introspección de un resource server nunca activa tokens de otra audiencia
  - el token del gateway conserva `aud` y TTL
- Write-target allowlist: `greenhouse_auth` (dominio del emisor)
- Tenant/space boundary: el emisor acredita la persona y su contexto interno; la autoridad sobre Rooms la decide Rooms con sus bindings
- Idempotency/concurrency: el registro de clientes es idempotente por `client_id`; la rotación de refresh ya es atómica
- Audit/outbox/history: `oauth_audit_events` existente (token, refresh, refresh_reuse, introspect)

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `AUTH_SERVER_ROOMS_AUDIENCE` vacía ⇒ audiencia apagada
- Backfill plan: ninguno
- Rollback path: vaciar la variable de repo + deploy gobernado; suspender `efeonce-rooms-cli`; revert
- External coordination: release Greenhouse a `main`, variable de repo y registro de clientes con autorización del operador; secreto del cliente de introspección en Vercel de Rooms

### Security and access

- Auth/access gate: PKCE S256 + loopback; consentimiento por clase con step-up para `author`/`release`/`access`; contexto interno nativo vigente
- Sensitive data posture: refresh solo como hash; secreto del cliente confidencial mostrado una vez
- Error contract: RFC 6749 con `reason` interno (`resource_mismatch`, `scope_audience_mixed`, `restricted_scope`, `rooms_requires_internal`)
- Abuse/rate-limit posture: límites vigentes de `/oauth/token` (60/min IP, 120/min cliente)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/auth-server` con `rooms-audience.test.ts` (allow, audiencia apagada, clase mezclada, cliente sin permiso, persona externa, TTL 300, reuso de refresh, introspección cruzada)
- DB/runtime checks: registro idempotente de los dos clientes contra PG real
- Integration checks: login real con `pnpm rooms login` contra producción y una operación de Rooms con el bearer (TASK-2087)
- Reliability signals/logs: `oauth_audit_events` (`refresh_reuse`, `introspect`)
- Production verification sequence: ver «Rollout Plan & Risk Matrix»

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Audiencias y clases

- `resources.ts` [nuevo]: registro de audiencias (`mcp`, `rooms`) desde la config; `audienceForScopes` y validación
  de `resource`.
- `scopes.ts`: clases `efeonce.mcp.rooms.*`, restringidas; `author`/`release`/`access` exigen step-up.
- `config.ts`: `roomsAudience` (`AUTH_SERVER_ROOMS_AUDIENCE`) y TTL de 300 s para Rooms.

### Slice 2 — Emisión, verificación e introspección

- `authorize`, `consent-endpoint` y `token`: audiencia derivada, clase restringida, población interna.
- `tokens` y `verify`: `aud` y TTL por audiencia.
- `revoke-introspect`: `aud` real y filtro por `introspection_audience`.
- Ports de grants internos con la audiencia del token.

### Slice 3 — Clientes, deploy y docs

- `register-rooms-agent-clients.ts` sobre primitives nuevas de `clients.ts`.
- `deploy.sh` y workflow con la variable; fila en el ledger de flags.
- Delta del contrato OAuth y del runbook; ledger de `efeonce-auth`.

## Out of Scope

- El verificador de Rooms, `pnpm rooms login` y el MCP stdio con tokens (TASK-2087).
- El canje RFC 8693 para el gateway y el claim `act` (TASK-2086).
- `efeonce.mcp.rooms.read.client` para el cliente CLI (espera su revisión de gobierno de datos IA).
- Personas externas o invitadas.

## Detailed Spec

| Aspecto | Decisión |
|---|---|
| Audiencia | `AUTH_SERVER_ROOMS_AUDIENCE`, origen https exacto; vacía = apagada |
| Derivación de `aud` | Por clase: `efeonce.mcp.rooms.*` → Rooms; el resto → gateway; mezcla = `invalid_scope` |
| Cliente CLI | `efeonce-rooms-cli`, público, `none`, `http://127.0.0.1/callback` (puerto libre), code + refresh |
| Cliente de introspección | `efeonce-rooms-resource`, confidencial, sin redirect ni grants, `metadata.introspection_audience` |
| Access token Rooms | 300 s |
| Refresh | Rotación y reuso existentes; 30 d deslizante, 90 d absoluto |
| Población | Solo contexto interno nativo |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. La variable de producción se fija solo después de que TASK-2087 esté en Rooms detrás
  de su flag: un token sin verificador no sirve y amplía superficie.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un cliente MCP hospedado obtiene clases Rooms | identity | low | clases restringidas a clientes que las listan; test negativo | `oauth_audit_events` `invalid_scope` `restricted_scope` |
| Token Rooms aceptado por el gateway o al revés | identity | low | `aud` exacto por audiencia en ambos verificadores; test cruzado | rechazos de `aud` |
| Romper el login MCP por el deploy del servicio compartido | identity / release | medium | sin variable nada cambia; tests existentes sin cambio; readback de discovery, JWKS y `/readyz` | `/readyz`, errores de `/oauth/token` |
| Refresh robado del equipo | identity | medium | rotación con reuso; `logout`; suspender el cliente | `refresh_reuse` |
| Persona externa con token Rooms | identity | low | exige contexto interno en authorize y en token | `rooms_requires_internal` |

### Feature flags / cutover

- `AUTH_SERVER_ROOMS_AUDIENCE` (variable de repo GitHub, input del workflow, `deploy.sh`): vacía = apagada.
- Cutover: release a `main` con la variable vacía → readback → variable con la audiencia + deploy gobernado →
  registro de clientes → login real. Cada paso con autorización del operador.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | < 30 min | sí |
| Slice 2 | vaciar la variable + deploy gobernado | < 15 min | sí |
| Slice 3 | suspender `efeonce-rooms-cli` (corta todas las CLIs); tráfico a la revisión anterior | < 10 min | sí |

### Production verification sequence

1. Local: `pnpm vitest run src/lib/auth-server`, `pnpm typecheck`.
2. Release a `main` y deploy gobernado; readback de revisión, `GIT_SHA`, discovery, JWKS y `/readyz`.
3. Con la variable fijada: `authorize` con `resource` Rooms deja de responder `invalid_target`.
4. Registro de clientes; `pnpm rooms login`; una operación de Rooms con el bearer; `logout` y rechazo < 30 s.

### Out-of-band coordination required

- Operador: autorizar el release a `main`, la variable de repo y el registro de clientes en producción.
- Secreto de `efeonce-rooms-resource` en Vercel Production de Rooms (`ROOMS_AGENT_INTROSPECTION_CLIENT_SECRET`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Sin `AUTH_SERVER_ROOMS_AUDIENCE`, `resource` Rooms responde `invalid_target` y los tests existentes pasan sin cambio de expectativa.
- [x] Con la variable, `efeonce-rooms-cli` obtiene un access token con `aud` Rooms y `expires_in` 300 para una persona interna.
- [x] Un cliente sin las clases en `allowed_scopes` recibe `invalid_scope` al pedirlas.
- [x] Pedir clases de dos audiencias responde `invalid_scope`.
- [x] Una persona sin contexto interno no obtiene un token Rooms.
- [x] Reusar un refresh revoca la familia.
- [x] `efeonce-rooms-resource` ve activo un token Rooms y `active:false` un token del gateway; el `aud` de la respuesta es el real.
- [x] Los dos clientes se registran por command de forma idempotente.
- [x] Variable declarada en `deploy.sh`, en el workflow y en el ledger de flags; nada aplicado con `--update-env-vars`.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/auth-server`
- Login real de `pnpm rooms login` en producción (TASK-2087)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skills `efeonce-auth` y `efeonce-rooms` actualizadas y espejadas.

## Follow-ups

- TASK-2086 reutiliza la audiencia y la introspección por audiencia para el canje del gateway.
- Superficie para que la persona vea y revoque sus equipos con CLI.

## Open Questions

- Si el refresh de la CLI debe tener un tope absoluto menor que 90 días.
