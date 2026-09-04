# Efeonce Auth Server — OAuth Protocol Contract V1

> **Tipo:** contrato técnico (endpoints, claims, tablas, invariantes) del authorization server propio
> `https://auth.efeonce.org` — **TASK-1829** (EPIC-044 U02).
> **Estado:** `code complete, rollout pendiente` (2026-09-04): flag `AUTH_SERVER_OAUTH_ENABLED=false` en
> `services/auth-server/deploy.sh`; migrations aplicadas en Cloud SQL; runtime en staging sirve sólo
> `/readyz` + JWKS hasta prender el flag. ADR gobernante:
> [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md).
> Contrato de federación: [`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md).
> Código: `src/lib/auth-server/oauth/**` (dominio, server-only) · `services/auth-server/app.ts` (handler) ·
> `services/auth-server/server.ts` (cableado Cloud Run).

## 1. Decisión en una línea

Efeonce **emite** los tokens que el gateway MCP verifica: metadata RFC 8414/OIDC con `issuer`
idéntico al origen, **CIMD** como registro primario de clientes, DCR sólo como compatibilidad, PKCE
S256 obligatorio, access tokens **JWT ES256 de 15 min firmados en Cloud KMS HSM**, refresh opacos
rotativos con detección de reuso, revocación RFC 7009, introspección RFC 7662 y consentimiento
persistido por `(subject, client, scope)`. El broker sister-platform del portal sigue vivo para
Globe/Kortex; sus primitives puras viven ahora en el dominio del emisor.

## 2. Endpoints

| Ruta | Método | Auth | Notas |
|---|---|---|---|
| `/.well-known/oauth-authorization-server` | GET | — | RFC 8414. `issuer` = `AUTH_SERVER_ISSUER` (idéntico al origen). `max-age=300`. |
| `/.well-known/openid-configuration` | GET | — | Mismo documento + `id_token_signing_alg_values_supported: ["ES256"]`, `claims_supported`. |
| `/.well-known/jwks.json` | GET | — | TASK-1828: llaves `active` + `retiring`. |
| `/oauth/register` | POST JSON | — (rate limit 10/min por IP) | DCR RFC 7591. Sólo clientes **públicos** (`token_endpoint_auth_method: none`). 201 con `client_id` `dcr-…`. |
| `/oauth/authorize` | GET | sesión de persona (`SubjectSessionPort`, TASK-1830) | code + PKCE S256. Consentimiento por scope; step-up para scopes de escritura. |
| `/oauth/consent` | POST form | sesión + same-origin | Materializa `allow`/`deny` de la pantalla de consentimiento. |
| `/oauth/token` | POST form | cliente (`none` / `client_secret_basic` / `client_secret_post`); rate limit 60/min IP · 120/min cliente | `authorization_code` y `refresh_token`. |
| `/oauth/revoke` | POST form | cliente | RFC 7009. 200 siempre salvo `invalid_client`. Revoca la **familia**. |
| `/oauth/introspect` | POST form | cliente **confidencial** | RFC 7662. `active:false` para revocado/expirado/ajeno. |

Con `AUTH_SERVER_OAUTH_ENABLED=false` toda la tabla salvo el JWKS responde `404 {"error":"not_found"}`.
Errores: cuerpo `{ error, error_description? }` (RFC 6749 §5.2); `invalid_client` lleva
`WWW-Authenticate: Basic realm="oauth"`; nunca detalle interno (va a `captureWithDomain('identity')`).

### 2.1 Metadata publicada

```json
{
  "issuer": "https://auth.efeonce.org",
  "authorization_endpoint": "https://auth.efeonce.org/oauth/authorize",
  "token_endpoint": "https://auth.efeonce.org/oauth/token",
  "jwks_uri": "https://auth.efeonce.org/.well-known/jwks.json",
  "registration_endpoint": "https://auth.efeonce.org/oauth/register",
  "revocation_endpoint": "https://auth.efeonce.org/oauth/revoke",
  "introspection_endpoint": "https://auth.efeonce.org/oauth/introspect",
  "scopes_supported": ["efeonce.mcp.read", "efeonce.mcp.globe.read", "efeonce.mcp.hiring.read"],
  "response_types_supported": ["code"],
  "response_modes_supported": ["query"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none", "client_secret_basic", "client_secret_post"],
  "revocation_endpoint_auth_methods_supported": ["none", "client_secret_basic", "client_secret_post"],
  "introspection_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
  "subject_types_supported": ["public"],
  "client_id_metadata_document_supported": true,
  "authorization_response_iss_parameter_supported": true
}
```

`scopes_supported` publica el **mínimo** (lecturas). Los scopes de escritura
(`efeonce.mcp.globe.credits.funding.ensure`, `efeonce.mcp.seo.write`) existen, exigen consentimiento
explícito + step-up y llegan por el `403 insufficient_scope` del recurso, nunca por el mínimo publicado
(mcp-craft §security). La lista es un espejo de `../efeonce-mcp/src/config.ts` con test de paridad
(`src/lib/auth-server/oauth/scopes.test.ts`).

## 3. Clientes

| Tipo de registro | `client_id` | Tipo | Redirects aceptados |
|---|---|---|---|
| **CIMD** (primario) | la URL `https://…/path` del documento | público | los del documento, validados |
| **DCR** (compat) | `dcr-<random>` | público | los del request, validados |
| **Pre-registrado** (command / CLI / Admin) | `efeonce-client-<hex>` o explícito | confidencial (`client_secret_basic` \| `client_secret_post`) | HTTPS exacto |

Política de `redirect_uri` (decisión 2026-09-04, `AuthServerOAuthConfig.allowLocalhostAlias = true`):

- **público**: loopback `http://127.0.0.1:<any>/path`, `http://[::1]:<any>/path` y el alias
  `http://localhost:<any>/path` (RFC 8252 §7.3; Claude Code lo usa) — **puerto libre, path y query
  exactos** — o HTTPS exacto para públicos hospedados (`https://claude.ai/api/mcp/auth_callback`);
- **confidencial**: HTTPS exacto; `localhost` por nombre **rechazado** (`invalid_redirect_uri`,
  reason `localhost_by_name`);
- nunca wildcards; `client_id` y `redirect_uri` se validan **antes** de cualquier redirect (RFC 6749 §4.1.2.1).

CIMD (`cimd.ts`): `client_id` https con path, sin fragmento/userinfo, host con nombre (no IP literal,
no `localhost`/`.local`), `href` normalizado; el documento debe traer `client_id` igual a la URL,
`redirect_uris` válidas, `token_endpoint_auth_method: none`, `grant_types ⊆ {authorization_code,
refresh_token}` con `authorization_code`, `response_types ∋ code`. Anti-SSRF: DNS resuelto antes del
socket y rechazado si alguna dirección cae en rangos privados/loopback/link-local/CGNAT/metadata; sin
redirects; timeout 3 s; 64 KB máx. Cache `greenhouse_auth.cimd_cache` con TTL 24 h (`≤ 24 h` por
CHECK) + `etag` (`If-None-Match` → 304 renueva); un rechazo se cachea 15 min. Todo rechazo produce
audit `cimd_fetch rejected` → señal `auth.oauth.cimd_rejected`.

## 4. Tokens

### 4.1 Access token (JWT ES256, 15 min)

Header `{ "alg": "ES256", "kid": "<RFC 7638 thumbprint>", "typ": "JWT" }` — firmado por
`signWithActiveKey` (KMS HSM, verificación local obligatoria antes de devolver el JWS).

```json
{
  "iss": "https://auth.efeonce.org",
  "sub": "<sujeto opaco y estable por persona dentro de este issuer>",
  "aud": "https://mcp.efeonce.org/mcp",
  "azp": "<client_id>",
  "client_id": "<client_id>",
  "scope": "efeonce.mcp.read efeonce.mcp.globe.read",
  "gv": 3,
  "iat": 1757000000,
  "exp": 1757000900,
  "jti": "<random>",
  "auth_time": 1756999940
}
```

- `gv` = `max(grantsVersion)` de las memberships **`bound`** del sujeto en
  `external_organization_bindings` (vía `resolveExternalAccess({ environmentId: AUTH_SERVER_ENVIRONMENT_ID, subject })`);
  sin membership `bound` → `access_denied` / `invalid_grant` (fail-closed). Se re-resuelve en cada
  emisión (code y refresh). El gateway (TASK-1831) compara por igualdad estricta con el reader de
  bindings; cualquier revoke bumpea la versión.
- El `jti` se registra en `greenhouse_auth.access_tokens` (revocación + introspección). El gateway
  verifica con el JWKS **sin** llamar a introspección (recomendación del ADR).

### 4.2 Refresh token

Opaco `efr_<base64url(32 bytes)>`; se persiste sólo `sha256`; familia = `grant_id`; TTL deslizante
30 d con tope absoluto 90 d desde el primer token del grant; **rotación en cada uso** bajo
`SELECT … FOR UPDATE`. Reuso (token ya rotado o revocado, o presentado por otro cliente) ⇒ se revoca
**toda la familia** (refresh + access vigentes) + audit `refresh_reuse` (RFC 6819 §5.2.2.3). Un
`scope` en el refresh sólo puede **estrechar** el original (`invalid_scope` si excede).

### 4.3 Authorization code

Opaco `efc_<base64url(32 bytes)>`, sólo hash persistido, TTL 5 min, **un solo uso** bajo
`SELECT … FOR UPDATE`; el segundo intento revoca la familia que abrió el primero + audit
`code_reuse`. El intercambio exige `redirect_uri` idéntica, PKCE S256 válido, cliente idéntico,
consentimiento activo para **cada** scope y binding `bound`.

### 4.4 Respuestas

`token`: `{ access_token, token_type: "Bearer", expires_in: 900, refresh_token, scope }`.
`authorize` OK: `302 <redirect_uri>?code=…&state=…&iss=https://auth.efeonce.org` (RFC 9207).
`introspect`: `{ active, token_type, scope, client_id, sub, exp, iat, jti, aud, iss, gv }` o `{ active: false }`.

## 5. Consentimiento

`greenhouse_auth.client_consents` — una fila **activa** por `(environment_id, subject, client_id, scope)`
(índice único parcial). `authorize` compara los scopes pedidos con los activos: falta alguno ⇒ pantalla
de consentimiento (`prompt=none` ⇒ `consent_required` al cliente). Scopes de escritura exigen además
`authLevel = step_up` del `SubjectSessionPort` (TASK-1830) ⇒ si no, `interaction_required`.

Commands canónicos (`consent.ts`): `grantClientConsent` (idempotente) y `revokeClientConsent`
(revoca consents + **todas** las familias de tokens de `(subject, client)`; exige `reason`). Consumers
del mismo primitive: `POST /oauth/consent` (pantalla), `POST /api/admin/auth-server/consents/revoke`
(capability `identity.auth_consent.revoke`), CLI y Nexa. Registro de clientes confidenciales:
`registerConfidentialClient` ← `POST /api/admin/auth-server/oauth-clients` (capability
`identity.auth_client.register`) y `pnpm auth-server:register-client`. Ambas capabilities: módulo
`organization`, grant `EFEONCE_ADMIN`.

### 5.1 Contrato para la pantalla de consentimiento (task ui-ux)

`GET /oauth/authorize` renderiza hoy una página mínima (server-side, sin JS, CSP estricta, isotipo
Efeonce del SSOT `public/branding/SVG/isotipo-full-efeonce.svg` bundleado como constante generada,
copy en `src/lib/copy/auth-server.ts`) con un `<form method="post" action="/oauth/consent">` y los
campos `client_id`, `scope` (space-delimited), `return_to` (path+query del authorize original) y
`decision` (`allow` | `deny`). La task ui-ux reemplaza la vista; el contrato de campos y rutas se
mantiene. `deny` redirige al cliente con `error=access_denied&state&iss`.

## 6. Persona autenticada (`SubjectSessionPort`)

```ts
type AuthenticatedSubject = { subject: string; environmentId: string; authLevel: 'primary' | 'step_up'; authTime: Date }
interface SubjectSessionPort { resolve(request): Promise<AuthenticatedSubject | null> }
```

Hasta TASK-1830 el runtime inyecta `unauthenticatedSubjectPort` y `authorize` responde
`login_required` (página 401; `prompt=none` ⇒ redirect con `error=login_required`): **ningún code se
emite para una persona que este emisor no autenticó**. TASK-1830 provee la sesión propia
(`greenhouse_auth.sessions`, cookie `__Host-efeonce_auth`, passkeys/magic link/TOTP) y el step-up.

## 7. Tablas (`greenhouse_auth`, migration `20260904130826694_task-1829-auth-oauth-tables.sql`)

| Tabla | Clave | Qué guarda | Invariante DDL |
|---|---|---|---|
| `oauth_clients` | `client_id` | registro (`registration_kind` cimd/dcr/preregistered, `client_type`, redirects, grant/response types, `token_endpoint_auth_method`, `client_secret_hash`, `allowed_scopes`, status) | público ⇔ `none` sin secret; confidencial ⇔ método ≠ `none` con hash; CIMD ⇒ `client_id LIKE 'https://%'`; sin wildcards |
| `cimd_cache` | `client_id_url` | documento validado / rechazo con razón, `etag`, TTL | `expires_at ≤ fetched_at + 24h`; valid ⇒ documento |
| `authorization_codes` | `code_hash` | cliente, sujeto, `grant_id`, redirect, scopes, PKCE, `auth_time`, `grants_version`, `consumed_at` | `code_challenge_method = 'S256'`; `grants_version ≥ 1` |
| `refresh_tokens` | `token_hash` | familia `grant_id`, status active/rotated/revoked, `rotated_to_hash`, TTLs | lifecycle CHECK por status |
| `access_tokens` | `jti` | familia, sujeto, scopes, `issued_at`/`expires_at`, `revoked_at` | `expires_at > issued_at` |
| `client_consents` | `consent_id` | `(environment_id, subject, client_id, scope)`, status, `granted_via/by`, `revoked_*` | único parcial activo; revoked ⇒ `revoked_by` |
| `oauth_audit_events` | `event_id` | `event_type` (12 valores), outcome, `client_id`, `subject_hash`, `grant_id`, `error_code`, `ip_hash`, `user_agent_hash`, `correlation_id`, `details` | **append-only** (trigger) |

Grants: `greenhouse_app` (Cloud Run) y `greenhouse_runtime` (portal) = SIU en registro/cache/consents,
SIUD en codes/tokens (limpieza), SI en audit. Write-target allowlist del dominio:
`src/lib/auth-server/boundary-domain.test.ts`.

## 8. Audit, rate limit y señales

Cada evento del protocolo escribe `oauth_audit_events` (`authorize | token | refresh | revoke |
introspect | register | cimd_fetch | consent_granted | consent_revoked | code_reuse | refresh_reuse |
rate_limited`) con IP/UA/sujeto **hasheados** y `correlation_id` (`x-correlation-id` válido o UUID).
El rate limit (ventana fija 60 s) **cuenta sobre ese audit** — patrón `party-endpoint-rate-limit.ts`,
sin tabla extra: `token` 60/IP y 120/cliente, `register` 10/IP; excedido ⇒ `429 slow_down`.
Cloud Armor del front door es la primera capa.

Señales (`src/lib/reliability/queries/auth-server-signals.ts`, módulo `identity`, kind `incident`,
ventana 24 h, steady 0): `auth.oauth.code_reuse_detected` (error), `auth.oauth.refresh_reuse_detected`
(error), `auth.oauth.cimd_rejected` (warning). Se suman a `auth.issuer.jwks_unreachable` y
`auth.signing_keys.lifecycle` (TASK-1828) en `getAuthServerSignals()`.

## 9. Configuración (SoT `services/auth-server/deploy.sh`)

| Env | Default | Efecto |
|---|---|---|
| `AUTH_SERVER_OAUTH_ENABLED` | `false` | OFF ⇒ metadata y `/oauth/*` 404 |
| `AUTH_SERVER_ISSUER` | `https://auth.efeonce.org` | `issuer` publicado (origen https sin query/fragment) |
| `AUTH_SERVER_ENVIRONMENT_ID` | `efeonce-auth` | `environment_id` del emisor en `external_identity_environments` (debe existir `active` para que haya `bound`) |
| `AUTH_SERVER_MCP_AUDIENCE` | `https://mcp.efeonce.org/mcp` | `aud` de los access tokens y `resource` aceptado |

TTLs y límites: `AUTH_SERVER_OAUTH_DEFAULTS` (`config.ts`) — code 300 s, access 900 s, refresh 30 d /
90 d, CIMD 24 h, rate limits arriba.

## 10. Invariantes duros

- **NUNCA** publicar un `issuer` distinto del origen del well-known ni espejar un issuer ajeno.
- **NUNCA** aceptar `code_challenge_method` distinto de `S256`; no existe camino para `plain`.
- **NUNCA** redirigir con un `client_id` o `redirect_uri` no validados; `localhost` por nombre sólo
  como alias de loopback de clientes **públicos**, nunca para hospedados/confidenciales.
- **NUNCA** emitir un access token sin fila `active` en `client_consents` para **cada** scope ni sin
  membership `bound` (gv fresco); un scope de escritura exige además `step_up`.
- **NUNCA** consumir un code ni rotar un refresh fuera del `SELECT … FOR UPDATE` del store; el reuso
  revoca la familia completa y emite señal.
- **NUNCA** persistir ni loggear tokens, codes, `code_verifier`, secrets, IP, UA o `sub` en claro
  (sólo hashes); el audit es append-only.
- **NUNCA** hacer que el gateway dependa de `introspect` para autorizar: JWT + JWKS + recheck de `gv`.
- **NUNCA** resolver un cliente CIMD sin el guard anti-SSRF ni cachear un documento más de 24 h.
- **SIEMPRE** que se agregue un scope al gateway, agregarlo a `scopes.ts` (test de paridad) y a la
  descripción es-CL de `src/lib/copy/auth-server.ts`.

## 11. Verificación

- `pnpm vitest run src/lib/auth-server` — 68 tests, incluido el flujo completo in-process
  (`oauth-flow.test.ts`: metadata → DCR/CIMD → consent → code → JWT verificado con el JWKS → refresh →
  reuso → revoke → introspect `active:false`, rate limit, step-up, unbound).
- `pnpm auth-server:oauth-store:smoke` — store PostgreSQL contra PG real (single-use, rotación/reuso,
  revoke de familia, consent idempotente, trigger append-only).
- Staging (flag ON, pendiente): `curl https://auth.efeonce.org/.well-known/oauth-authorization-server`
  con `issuer` idéntico; `POST /oauth/register` 201; `POST /oauth/token` con code inválido ⇒
  `invalid_grant`; flujo con persona real cuando TASK-1830 esté en staging.

## 12. Fuera de alcance / follow-ups

- `private_key_jwt` para confidenciales; ID tokens OIDC (`openid` no se emite como id_token).
- Migración de los sister-platform consumers internos al nuevo emisor (task propia).
- Limpieza programada de codes/tokens expirados (command `oauth-gc` + Cloud Scheduler) — hoy las filas
  expiradas no se sirven pero no se borran.
- Decisión `TASK-659`: ver el cierre de TASK-1829.
