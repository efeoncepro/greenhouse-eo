# Efeonce Auth Server — OAuth Protocol Contract V1

> **Tipo:** contrato técnico (endpoints, claims, tablas, invariantes) del authorization server propio
> `https://auth.efeonce.org` — **TASK-1829** (EPIC-044 U02).
> **Estado:** OAuth y personas activos; emisión/refresh/revocación internos verificados por TASK-1836 y
> consumo multi-issuer por TASK-1831. El environment `efeonce-auth` está activo para la cohorte controlada.
> Las matrices externas/multicontexto siguen abiertas. [Mapa de evidencia](../audits/2026-09-06-task-1836-1831-consolidated-evidence.md).
> ADR gobernante:
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
(`efeonce.mcp.globe.credits.funding.ensure`, `efeonce.mcp.seo.write`, `efeonce.mcp.identity.write`) existen,
exigen consentimiento explícito + step-up y llegan por el `403 insufficient_scope` del recurso, nunca por el
mínimo publicado (mcp-craft §security). La lista es un espejo de `../efeonce-mcp/src/config.ts` con test de
paridad (`src/lib/auth-server/oauth/scopes.test.ts`).

`efeonce.mcp.identity.write` (TASK-1837, 2026-09-06; `EFEONCE_MCP_WRITE_SCOPES` en
`src/lib/auth-server/oauth/scopes.ts`) es la clase «administrar a las personas de mi organización»: invitar,
reenviar y revocar por la lane delegada `/api/platform/ecosystem/identity/invitations`. Es clase de escritura
(step-up), se emite sólo por el issuer nativo a población externa y su copy de consentimiento es
`'Invitar y administrar a las personas de tu organización en Efeonce'` (`src/lib/copy/auth-server.ts`). El scope
responde si ESTE cliente puede pedir esa clase de acción; la autoridad real la decide Greenhouse por la
membership `designatedAdmin` del binding. Lo consume la tool `identity.invitation.create` del gateway
(`efeonce-mcp`), federada y desplegada desde el 2026-09-06. **Vigente en producción** desde el release
`b3e324cb5c8d-3cfce865-236f-4e4e-b128-8e144de193cf`: el scope está en `main`, en `EFEONCE_MCP_WRITE_SCOPES` y,
como toda clase de escritura, **no** aparece en el `scopes_supported` que publica ESTE emisor
(`auth.efeonce.org/.well-known/oauth-authorization-server` sólo anuncia las lecturas, por
`PUBLISHED_SCOPES_SUPPORTED`). ⚠️ No confundir con el documento del RECURSO que publica el gateway
(`mcp.efeonce.org/.well-known/oauth-protected-resource`), donde sí aparece: son dos discovery
distintos, y medirlos como si fueran uno lleva a diagnosticar un hueco que no existe.

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

- El resolver de grants revalida autoridad en cada emisión (code y refresh). Para el carril externo legacy
  sin contexto se conserva la resolución de memberships `bound`. Para internos, `gv` es exactamente la
  versión del binding seleccionado por el contexto, nunca el máximo entre organizaciones.
- Los access tokens internos incluyen `authorization_context_id` y `authorization_context_version=1`
  firmados. El contexto liga sujeto/perfil, cliente, audiencia, organización, binding, environment y sesión
  corporativa. Ausencia, versión no soportada o dimensiones ajenas deniegan; no hay fallback por issuer/email.
- El `jti` se registra en `greenhouse_auth.access_tokens`. TASK-1831 verifica JWT/JWKS y el reader interno
  revalida también ese ledger antes del dispatch: mismo sujeto, cliente, entorno y contexto, sin revocar ni
  expirar. Revocar la familia retira tokens aún vigentes dentro de la cota local de 60 s; no usa introspección.
- La población persistida `external | internal` es independiente de `issuer_class`. Contrato completo:
  [autoridad interna nativa](EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md).

### 4.2 Refresh token

Opaco `efr_<base64url(32 bytes)>`; se persiste sólo `sha256`; familia = `grant_id`; TTL deslizante
30 d con tope absoluto 90 d desde el primer token del grant; **rotación en cada uso** bajo
`SELECT … FOR UPDATE`. Reuso (token ya rotado o revocado, o presentado por otro cliente) ⇒ se revoca
**toda la familia** (refresh + access vigentes) + audit `refresh_reuse` (RFC 6819 §5.2.2.3). Un
`scope` en el refresh sólo puede **estrechar** el original (`invalid_scope` si excede).
El contexto, la procedencia de sesión y `auth_time` se preservan: la rotación no rejuvenece autenticación
ni amplía organización, cliente o permisos. El gate interno OFF deniega también refresh.

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

- **Host del `redirect_uri` visible (desde TASK-1837, 2026-09-06).** La pantalla revela a la persona el destino
  de la autorización: `renderConsentPage` exige `redirectHost` (lanza si falta) y muestra "Destino de la
  autorización: `<host>`" + "El código de autorización se enviará a esta dirección." (copy
  `GH_AUTH_SERVER.consent_redirect_host_{label,hint}`, bloque `data-capture="id-redirect-host"`).
  `authorize.ts` pasa `new URL(redirectUri).host` del `redirect_uri` ya validado contra el registro del cliente.
  Es un MUST del protocolo (el usuario debe poder ver a quién autoriza), aditivo y sin flag; la vista ui-ux que
  reemplace esta página conserva la revelación. **Vigente en producción** desde el release
  `b3e324cb5c8d-3cfce865-236f-4e4e-b128-8e144de193cf` (2026-09-06): al no llevar flag, entró con el despliegue.

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
| `AUTH_SERVER_OAUTH_ENABLED` | `true` en deploy al corte `21aa12608`; verificar override del workflow | OFF ⇒ metadata y `/oauth/*` 404 |
| `AUTH_SERVER_ISSUER` | `https://auth.efeonce.org` | `issuer` publicado (origen https sin query/fragment) |
| `AUTH_SERVER_ENVIRONMENT_ID` | `efeonce-auth` | `environment_id` del emisor en `external_identity_environments` (debe existir `active` para que haya `bound`; activo para el piloto; ver abajo) |
| `AUTH_SERVER_MCP_AUDIENCE` | `https://mcp.efeonce.org/mcp` | `aud` de los access tokens y `resource` aceptado |

TTLs y límites: `AUTH_SERVER_OAUTH_DEFAULTS` (`config.ts`) — code 300 s, access 900 s, refresh 30 d /
90 d, CIMD 24 h, rate limits arriba.

### 9.1 Precondición: environment del emisor (CLI)

La fila `efeonce-auth` de `greenhouse_core.external_identity_environments` se registra **únicamente** por el
command canónico de TASK-1631 (`upsertExternalIdentityEnvironment`: tx + audit + outbox), nunca por SQL, a través
de `pnpm auth-server:register-issuer-environment` (`scripts/auth-server/register-issuer-environment.ts`; lee
`.env.local`, perfil ops, proxy `127.0.0.1:15432`; `--status draft|active`, `--environment-id`). Registrada el
2026-09-04 en `draft` y activada posteriormente para el piloto: `displayName` «Efeonce Auth», provider `efeonce_auth`, `issuerUrl`
`https://auth.efeonce.org`, `jwksUri` `https://auth.efeonce.org/.well-known/jwks.json`, `audience`
`https://mcp.efeonce.org/mcp`, `issuerClass external` (**inmutable** después), `subjectType public`. En `draft`
el resolver responde `environment_inactive` y ningún sujeto es `bound`; se pasa a `active` con `--status active`
en el mismo momento en que se prende `AUTH_SERVER_OAUTH_ENABLED` en staging (precondición registrada en
`FEATURE_FLAG_STATE_LEDGER.md`).

## 10. Invariantes duros

- **NUNCA** publicar un `issuer` distinto del origen del well-known ni espejar un issuer ajeno.
- **NUNCA** aceptar `code_challenge_method` distinto de `S256`; no existe camino para `plain`.
- **NUNCA** redirigir con un `client_id` o `redirect_uri` no validados; `localhost` por nombre sólo
  como alias de loopback de clientes **públicos**, nunca para hospedados/confidenciales.
- **NUNCA** emitir un access token sin fila `active` en `client_consents` para **cada** scope ni sin
  autoridad vigente de la población correspondiente (`gv` fresco y contexto para internos); un scope de escritura exige además `step_up`.
- **NUNCA** consumir un code ni rotar un refresh fuera del `SELECT … FOR UPDATE` del store; el reuso
  revoca la familia completa y emite señal.
- **NUNCA** persistir ni loggear tokens, codes, `code_verifier`, secrets, IP, UA o `sub` en claro
  (sólo hashes); el audit es append-only.
- **NUNCA** hacer que el gateway dependa de `introspect` para autorizar: JWT + JWKS + reader de autoridad; internos incluyen contexto y ledger `jti`.
- **NUNCA** resolver un cliente CIMD sin el guard anti-SSRF ni cachear un documento más de 24 h.
- **SIEMPRE** que se agregue un scope al gateway, agregarlo a `scopes.ts` (test de paridad) y a la
  descripción es-CL de `src/lib/copy/auth-server.ts`.

## 11. Verificación

- `pnpm vitest run src/lib/auth-server` — 68 tests, incluido el flujo completo in-process
  (`oauth-flow.test.ts`: metadata → DCR/CIMD → consent → code → JWT verificado con el JWKS → refresh →
  reuso → revoke → introspect `active:false`, rate limit, step-up, unbound).
- `pnpm auth-server:oauth-store:smoke` — store PostgreSQL contra PG real (single-use, rotación/reuso,
  revoke de familia, consent idempotente, trigger append-only).
- Producción (hecho 2026-09-04, release `9100bbd2765d`, revisión `auth-server-00005-pk8`, flag OFF):
  `/healthz` `{enabled:true, oauth:false}`; `/readyz` 200 con `postgres`/`kms`/`activeKey` ok;
  `/.well-known/jwks.json` con 2 `kid`; `/.well-known/oauth-authorization-server` → 404 (esperado con el flag
  OFF). Environment `efeonce-auth` en `draft`: `GET /api/platform/ecosystem/identity/binding?environment=efeonce-auth&subject=…`
  con el token consumer del gateway → 200 `outcome: environment_inactive` (400 sin parámetros, 401 sin token).
- Procedimiento de activación/canary (la activación interna ya tiene evidencia en el mapa citado): environment a `active` (`pnpm auth-server:register-issuer-environment --status active`);
  `curl https://auth.efeonce.org/.well-known/oauth-authorization-server` con `issuer` idéntico;
  `POST /oauth/register` 201; `POST /oauth/token` con code inválido ⇒ `invalid_grant`; clientes CIMD + DCR de
  prueba (TASK-1832). El flujo corporativo con persona real ya está verificado; quedan las matrices
  de clientes externos/multicontexto, no un bloqueo general por falta de autenticación TASK-1830.

## 12. Fuera de alcance / follow-ups

- `private_key_jwt` para confidenciales; ID tokens OIDC (`openid` no se emite como id_token).
- Migración de los sister-platform consumers internos al nuevo emisor (task propia).
- La limpieza efímera ya está construida y tiene ejecución real documentada: `pnpm auth:gc`, función
  `greenhouse_auth.gc_ephemeral_state`, handler `POST /auth/ephemeral-gc` y job `ops-auth-ephemeral-gc`.
  Retención, límites, flag `AUTH_SERVER_GC_ENABLED`, readback y rollback pertenecen al
  [runbook interno](../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md). No borres auditoría ni
  tokens manualmente; la evidencia del GC no cierra las matrices de acceso pendientes.
- Decisión `TASK-659`: ver el cierre de TASK-1829.


## 13. Navegador, sesión directa y consentimiento

`/login` puede iniciar Microsoft sin un cliente OAuth pendiente: sólo la ausencia de `return_to` lleva a
`/auth/session` exacto. No emite un token ni crea un contexto OAuth. La entrada desde una app conserva el
retorno `/oauth/authorize` validado. El callback OIDC consume una transacción de un uso ligada al navegador,
con state, nonce y PKCE, y exige `auth_time` firmado/fresco aun si se modifica `prompt=login` en el navegador.

El consentimiento interno resuelve su proyección de población después de verificar autoridad; no reutiliza
el reader externo para nombres. HTML usa `Referrer-Policy: strict-origin` para conservar el Origin del POST;
JSON y redirects mantienen `no-referrer`. El guard CSRF no acepta indiscriminadamente Origin:null. La CSP
`form-action` de consentimiento añade únicamente el origen del callback ya validado por authorize contra el
registro del cliente; no sustituye la coincidencia exacta del redirect. La prueba real Chromium del handler
cubre origen, negativos cross-origin y la cadena POST→authorize→callback; WebKit omitido no cuenta como passed.
