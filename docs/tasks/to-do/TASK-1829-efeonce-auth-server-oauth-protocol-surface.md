# TASK-1829 — Efeonce Auth Server OAuth Protocol Surface (metadata, CIMD, tokens, consent)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-044`
- Status real: `Especificación; broker sister-platform vivo dentro del portal, sin extracción`
- Rank: `TBD`
- Domain: `platform|identity|integration`
- Blocked by: `TASK-1828 (runtime, llave KMS y schema greenhouse_auth)`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extraer el broker OAuth de `src/lib/sister-platforms/oauth-broker.ts` al runtime `auth.efeonce.org` y
completar la superficie de authorization server que exige el MCP: metadata RFC 8414 con `issuer` idéntico
al origen, CIMD como registro primario de clientes, DCR RFC 7591 en compatibilidad, PKCE obligatorio,
access tokens JWT ES256 de 15 minutos firmados por KMS, refresh tokens opacos rotativos, revocación RFC 7009,
introspección RFC 7662 y consentimiento por cliente y scope persistido. Sin pantallas: la UI de
consentimiento y login es la task `ui-ux` dependiente; aquí se entregan endpoints, primitives y contratos.

## Why This Task Exists

El broker actual implementa code + PKCE, allowlists, tokens opacos y revocación, pero está acoplado a la
sesión NextAuth del portal, sólo conoce redirects loopback para clientes públicos, no publica metadata ni
CIMD/DCR y emite tokens opacos que el gateway no puede verificar con JWKS. La auditoría del 2026-09-02 fijó
que CIMD y el `issuer` conforme sólo existen si Efeonce emite los tokens. Esta task convierte el broker en
ese emisor.

## Goal

- `/.well-known/oauth-authorization-server` y `/.well-known/openid-configuration` conformes, con
  `client_id_metadata_document_supported: true`, `code_challenge_methods_supported: ["S256"]`,
  `subject_types_supported: ["public"]`, endpoints de `authorize`, `token`, `register`, `revoke`,
  `introspect`, `jwks_uri`.
- Registro de clientes: CIMD (fetch, validación de esquema, cache con TTL, pin por `client_id` URL), DCR
  compat con política de redirect, clientes confidenciales pre-registrados por command.
- Tokens: access JWT ES256 (`iss`, `sub`, `aud`, `azp`, `scope`, `gv`, `exp`, `iat`, `jti`), refresh opaco
  rotativo con detección de reuso, revocación de token y de familia, introspección para consumidores que no
  verifican JWT.
- Consentimiento: tabla `greenhouse_auth.client_consents` por `(subject, client_id, scope)`, requerido para
  cada cliente nuevo; commands `grantClientConsent`/`revokeClientConsent` idempotentes y auditados.
- El broker legacy en el portal queda como consumidor interno hasta su retiro (feature flag).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (§gateway authorization-context contract)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (§Delta 2026-09-02)
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- `issuer` publicado idéntico al origen del well-known; NUNCA espejar un issuer ajeno.
- PKCE S256 obligatorio para todo cliente; `plain` rechazado.
- Loopback: `http://127.0.0.1:<any>` y `http://[::1]:<any>` sólo para clientes públicos; `localhost` por
  nombre rechazado; HTTPS exacto para clientes hospedados.
- Un scope de escritura NUNCA se concede sin consentimiento explícito por cliente y step-up (`TASK-1830`).
- Códigos de autorización de un solo uso bajo `SELECT FOR UPDATE`; reuso de refresh revoca la familia.
- NUNCA loggear tokens, códigos, `code_verifier` ni cuerpos crudos.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`
- `.claude/skills/mcp-craft/protocol-radar.md` (verificar contra la spec, nunca de memoria)
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1828`: runtime, `signAccessToken` vía KMS, JWKS, schema `greenhouse_auth`.
- `src/lib/sister-platforms/oauth-broker.ts`, `oauth-policy.ts`, `oauth-workspace-bindings.ts`, `types.ts`.
- Tablas actuales del broker (`sister_platform_oauth_*`) `[verificar nombres exactos en migrations/]`.

### Blocks / Impacts

- `TASK-1831` (gateway): necesita un token ES256 real en staging.
- `TASK-1830`: la sesión de persona autenticada es la que `authorize` consume.
- `TASK-1832`: los canaries usan CIMD/DCR de esta task.
- `TASK-659`: cubierta en diseño; decisión de cierre al terminar esta task.
- Rutas legacy `src/app/api/integrations/v1/sister-platforms/oauth/**` y `src/app/api/auth/sister-platforms/authorize`: quedan detrás de flag hasta el retiro.

### Files owned

- `src/lib/auth-server/oauth/**` (nuevo: metadata, clients, cimd, dcr, authorize, token, refresh, revoke, introspect, consent)
- `services/auth-server/routes/**` (nuevo)
- `migrations/<timestamp>_task-1829-auth-oauth-tables.sql` (nuevo: `oauth_clients`, `authorization_codes`, `refresh_tokens`, `client_consents`, `cimd_cache`)
- `src/lib/sister-platforms/oauth-broker.ts` (extraer lógica compartida a `src/lib/auth-server/oauth/**`; conservar API pública)
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (nuevo, contrato de endpoints y claims)

## Current Repo State

### Already exists

- Broker con `validateSisterPlatformAuthorizeRequest`, `issueSisterPlatformAuthorizationCode`,
  `consumeSisterPlatformAuthorizationCode`, `authenticateSisterPlatformOAuthClient`,
  `revokeSisterPlatformOAuthAccessTokens`, TTLs, allowlists y audit (`oauth-broker.ts`, 2.100+ líneas).
- `mcp-token-exchange.ts` con el token exchange hacia el gateway.
- `jose` para JWT; `auth-tokens.ts` con hashing de tokens por tipo.

### Gap

- Sin metadata, CIMD, DCR, refresh rotativo, introspección ni consentimiento persistido.
- Access tokens opacos hasheados, no JWT verificables por JWKS.
- `authorize` depende de la sesión NextAuth del portal.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/auth-server/oauth/**` (server-only) consumido por `services/auth-server/**`
- Future candidate home: `worker`
- Boundary: commands/readers de `src/lib/auth-server/oauth/**`; el portal legacy y el servicio son sus dos consumidores; el gateway consume sólo JWKS/introspección por HTTP
- Server/browser split: 100% server
- Build impact: ninguna dependencia nueva de peso (`jose` ya está); `cimd` usa `fetch` nativo
- Extraction blocker: none — depende de Cloud SQL y KMS, ambos ya externos al portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_auth.oauth_clients`, `authorization_codes`, `refresh_tokens`, `client_consents`, `cimd_cache`
- Consumidores afectados: gateway `efeonce-mcp`, clientes MCP (Claude, Codex, ChatGPT), portal (legacy sister-platforms), `TASK-1830`
- Runtime target: `worker` (staging y production)

### Contract surface

- Contrato existente a respetar: API pública de `oauth-broker.ts` para consumidores internos; `AuthContext` del ADR de federación
- Contrato nuevo o modificado: endpoints `/.well-known/*`, `/oauth/authorize`, `/oauth/token`, `/oauth/register`, `/oauth/revoke`, `/oauth/introspect`; claims del access token documentados en `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- Backward compatibility: `gated` (flag `AUTH_SERVER_OAUTH_ENABLED`; el broker legacy sigue sirviendo sister-platforms internas)
- Full API parity: consentimiento y registro de clientes confidenciales son commands canónicos con capability (`auth.client.register`, `auth.consent.revoke`) consumibles por Admin Center, CLI y Nexa

### Data model and invariants

- Entidades/tablas/views afectadas: las cinco tablas nuevas de `greenhouse_auth`
- Invariantes que no se pueden romper:
  - `Un authorization code se consume exactamente una vez; el segundo intento revoca los tokens emitidos por el primero.`
  - `Un refresh token reutilizado revoca toda su familia (RFC 6819 §5.2.2.3).`
  - `Ningún access token se emite para (subject, client_id, scope) sin fila active en client_consents.`
  - `client_id de CIMD es la URL del documento y el documento cacheado tiene TTL ≤ 24 h y re-validación en cada authorize.`
- Write-target allowlist: `N/A — el dominio auth-server nace con esta task; declarar boundary test en src/lib/auth-server/boundary-domain.test.ts con estas cinco tablas`
- Tenant/space boundary: subject → `identity_profile` vía `(environment, subject)` (`TASK-1631`); scopes calificados por organización en el gateway
- Idempotency/concurrency: `SELECT FOR UPDATE` en codes y refresh; `jti` único; commands con idempotency key
- Audit/outbox/history: audit por evento (`authorize`, `token`, `refresh`, `revoke`, `consent_granted`, `consent_revoked`) reutilizando `recordSisterPlatformOAuthAuditEvent`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `AUTH_SERVER_OAUTH_ENABLED=false`; metadata responde 404 con flag `false`
- Backfill plan: none (clientes nuevos; los sister-platform existentes no migran en esta task)
- Rollback path: flag `false` + revisión anterior; tablas se conservan
- External coordination: ninguna adicional a `TASK-1828`

### Security and access

- Auth/access gate: `authorize` exige sesión de persona de `TASK-1830`; `token` autentica cliente (none + PKCE para públicos, `client_secret_basic`/`private_key_jwt` para confidenciales)
- Sensitive data posture: tokens y códigos sólo hasheados; sin PII en claims salvo `sub` opaco
- Error contract: errores OAuth estándar (`invalid_grant`, `invalid_client`, …) sin detalle interno; `captureWithDomain`
- Abuse/rate-limit posture: por IP y por `client_id` en `token` y `register` (Postgres, patrón `party-endpoint-rate-limit.ts`) + Cloud Armor

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/auth-server src/lib/sister-platforms`
- DB/runtime checks: consultas sobre las cinco tablas tras un flujo completo en staging
- Integration checks: flujo completo con un cliente de prueba CIMD y otro DCR; verificación del JWT con JWKS; introspección de token revocado devuelve `active: false`
- Reliability signals/logs: `auth.oauth.code_reuse_detected`, `auth.oauth.refresh_reuse_detected` steady = 0
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio, en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: lo produce el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extracción del núcleo del broker

- Mover la lógica de validación, códigos, PKCE, allowlists y audit a `src/lib/auth-server/oauth/**` sin cambiar el comportamiento de sister-platforms (tests existentes verdes).
- Boundary test del dominio con las tablas nuevas.

### Slice 2 — Metadata y registro de clientes

- `/.well-known/oauth-authorization-server` y `openid-configuration`; CIMD con cache; DCR compat; command de clientes confidenciales.

### Slice 3 — Tokens

- Access JWT ES256 vía `signAccessToken` (KMS); refresh rotativo; `revoke`; `introspect`; `gv` desde `TASK-1631`.

### Slice 4 — Consentimiento

- `client_consents` + commands + capability + check en `authorize`; contrato para la pantalla de consentimiento (task ui-ux).

## Out of Scope

- Autenticación de personas (`TASK-1830`) y pantallas (task ui-ux).
- Cambios en el gateway (`TASK-1831`).
- Migrar los sister-platform consumers existentes al nuevo emisor.
- SAML/SCIM/federación enterprise.

## Detailed Spec

- Access token: `{ iss: "https://auth.efeonce.org", sub: <opaque>, aud: "https://mcp.efeonce.org/mcp", azp: <client_id>, scope: "efeonce.mcp.read …", gv: <int>, iat, exp: iat+900, jti }`, header `{ alg: "ES256", kid }`.
- Refresh: 32 bytes aleatorios; se persiste `sha256`; familia por `grant_id`; TTL 30 días deslizante con
  tope absoluto 90 días; rotación en cada uso.
- CIMD: `client_id` debe ser `https://` con path; el documento se valida (`client_id` igual a la URL,
  `redirect_uris`, `token_endpoint_auth_method: none`, `grant_types`); cache por URL con `etag`/TTL.
- Scopes: mismos strings que `efeonce-mcp/src/config.ts`; el servidor no interpreta capability, sólo consentimiento.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (extracción sin cambio de comportamiento) → Slice 2 (metadata/registro) → Slice 3 (tokens) → Slice 4 (consent).
- Slice 3 no emite un token para persona real sin Slice 4 activo y sin `TASK-1830` en staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Extracción rompe sister-platforms internas (Globe OAuth) | identity / Globe | medium | Slice 1 sin cambio de contrato; suite `src/lib/sister-platforms` verde; flag para el path nuevo | tests + canary Globe Producer |
| CIMD spoof (documento hostil o SSRF vía `client_id`) | auth | medium | sólo `https`, sin IP privadas, timeout 3 s, tamaño máximo, validación estricta | `auth.oauth.cimd_rejected` |
| Reuso de refresh no detectado | auth | low | familia por `grant_id` + revocación completa; test de concurrencia | `auth.oauth.refresh_reuse_detected` |
| Token emitido sin consentimiento | auth / MCP | low | CHECK aplicativo + test negativo obligatorio | audit `token` sin `consent_id` |
| Desalineación de scopes con el gateway | MCP | medium | lista de scopes importada del manifest del gateway, test de paridad | test de paridad rojo |

### Feature flags / cutover

- `AUTH_SERVER_OAUTH_ENABLED` (default `false`) en `services/auth-server/deploy.sh`; ledger actualizado.
- El path legacy del portal no cambia de flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (extracción pura) | < 15 min | sí |
| Slice 2 | flag `false` → metadata 404; revisión anterior | < 5 min | sí |
| Slice 3 | flag `false`; revocar familia de refresh emitida en staging por command | < 10 min | sí |
| Slice 4 | flag `false`; consents se conservan | < 5 min | sí |

### Production verification sequence

1. Staging con flag `false`: sister-platforms internas intactas (suite + canary Globe).
2. Staging con flag `true`: metadata conforme validada con `oauth4webapi` o `curl` + schema; CIMD y DCR registran un cliente de prueba.
3. Flujo completo con persona de prueba (`TASK-1830`): code → token → refresh → revoke → introspect `active:false`.
4. Producción: repetir 1–3 con cooldown 24 h; sin clientes reales hasta `TASK-1832`.

### Out-of-band coordination required

- Coordinación con la sesión dueña de `TASK-1626`/`TASK-1813` para no chocar en scopes del gateway.
- Sin coordinación externa adicional: DNS, llave KMS y front door ya quedan resueltos por `TASK-1828`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La metadata publica `issuer` idéntico al origen, `client_id_metadata_document_supported: true`, S256 y `subject_types_supported: ["public"]`.
- [ ] Un cliente CIMD y un cliente DCR completan code + PKCE y reciben un JWT ES256 verificable con el JWKS.
- [ ] `code_challenge_method=plain`, redirect `http://localhost` por nombre y redirect HTTPS no exacto son rechazados.
- [ ] Reuso de código y reuso de refresh revocan los tokens/familia y emiten señal.
- [ ] `revoke` e `introspect` funcionan; un token revocado introspecta `active: false`.
- [ ] Ningún token se emite sin fila `client_consents` active; el test negativo existe.
- [ ] La suite de `src/lib/sister-platforms` sigue verde y el canary de Globe OAuth no cambia.
- [ ] Contrato `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` publicado con claims y endpoints.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/auth-server src/lib/sister-platforms`
- flujo manual en staging con cliente de prueba y verificación del JWT con `jose`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [ ] chequeo de impacto cruzado sobre `TASK-1831`, `TASK-1832`, `TASK-659`
- [ ] decisión sobre `TASK-659` registrada (supersesión o re-alcance)

## Follow-ups

- Migración de los sister-platform consumers internos al nuevo emisor (task propia cuando el portal converja).
- `private_key_jwt` para clientes confidenciales de hosts que lo exijan.

## Open Questions

- Si `introspect` se expone al gateway o el gateway sólo verifica JWT + `gv` (recomendación del ADR: JWT + recheck de grants).
