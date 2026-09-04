# Efeonce Auth Server (`auth.efeonce.org`)

> **Tipo de documento:** README del deployable (TASK-1828 + TASK-1829, EPIC-044)
> **Versión:** 1.1
> **Creado:** 2026-09-04 por Claude (sesión `/implement-task 1828`)
> **Última actualización:** 2026-09-04 por Claude (TASK-1829: superficie OAuth)
> **Documentación técnica:** [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) · contrato OAuth [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](../../docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md)

Authorization server propio de Efeonce. Cloud Run Service en `us-east4`, publicado como **segundo host del
front door del gateway MCP** (mismo global LB, misma IP `34.111.78.237`, misma policy Cloud Armor). Emite
tokens ES256 firmados con una llave asimétrica en **Cloud KMS con protección HSM**; la privada nunca sale del
hardware.

## Qué hace hoy

| Ruta | Flag | Comportamiento |
| --- | --- | --- |
| `GET /healthz` | — | Liveness. 200 siempre; no toca KMS ni PG. Body incluye `enabled` y `oauth` (estado de ambos flags). |
| `GET /readyz` | `AUTH_SERVER_ENABLED` | 503 `disabled` si el flag está en `false`; con `true`, 200 sólo si PG responde, hay llave `active` y KMS devuelve su pública. Body incluye `oauth`. |
| `GET /.well-known/jwks.json` | `AUTH_SERVER_ENABLED` | JWKS con las llaves `active` + `retiring` (`kid` = thumbprint RFC 7638). 404 con el flag OFF. `Cache-Control: max-age=300`. |
| `GET /.well-known/oauth-authorization-server` · `GET /.well-known/openid-configuration` | `AUTH_SERVER_OAUTH_ENABLED` | Metadata RFC 8414 / OIDC; `issuer` idéntico al origen. `max-age=300`. |
| `POST /oauth/register` | `AUTH_SERVER_OAUTH_ENABLED` | DCR (RFC 7591) sólo clientes públicos (`token_endpoint_auth_method: none`); 10/min por IP. |
| `GET /oauth/authorize` · `POST /oauth/consent` | `AUTH_SERVER_OAUTH_ENABLED` | Authorization code + PKCE `S256`; pantalla de consentimiento mínima server-side. Hasta TASK-1830 responde `login_required` (sin sesión de persona). |
| `POST /oauth/token` | `AUTH_SERVER_OAUTH_ENABLED` | `authorization_code` + `refresh_token`; auth `none` / `client_secret_basic` / `client_secret_post`; 60/min por IP · 120/min por cliente. Access JWT ES256 15 min con claim `gv`; refresh opaco rotativo. |
| `POST /oauth/revoke` · `POST /oauth/introspect` | `AUTH_SERVER_OAUTH_ENABLED` | RFC 7009 (revoca la familia) · RFC 7662 (sólo clientes confidenciales). |

Con `AUTH_SERVER_OAUTH_ENABLED=false` (default) toda la superficie OAuth responde `404 {"error":"not_found"}`;
`/healthz`, `/readyz` y el JWKS no cambian. Estado TASK-1829 (2026-09-04): **code complete, rollout pendiente**.
Clientes: **CIMD** primario (`client_id` = URL https del documento, anti-SSRF, cache 24 h), DCR como compatibilidad
(sólo públicos), confidenciales pre-registrados con `pnpm auth-server:register-client -- --name … --redirect https://…`
o `POST /api/admin/auth-server/oauth-clients` (capability `identity.auth_client.register`). Consentimientos se
revocan con `POST /api/admin/auth-server/consents/revoke` (`identity.auth_consent.revoke`). Tablas en
`greenhouse_auth` (migration `20260904130826694_task-1829-auth-oauth-tables.sql`): `oauth_clients`, `cimd_cache`,
`authorization_codes`, `refresh_tokens`, `access_tokens`, `client_consents`, `oauth_audit_events` (append-only).
La autenticación de personas (passkeys, magic link, TOTP) la entrega `TASK-1830`; el gateway multi-issuer, `TASK-1831`.

## Runtime

- `services/auth-server/server.ts` (`node:http`, esbuild bundle, Node 22-slim) cablea PG, KMS y ports; el handler
  testeable vive en `services/auth-server/app.ts`; el dominio OAuth en `src/lib/auth-server/oauth/**` (primitives
  extraídas de `src/lib/sister-platforms/oauth-broker.ts` sin cambio de contrato). Reusa `src/lib/**`.
- Service account dedicado `auth-server@efeonce-group` con `roles/cloudkms.signerVerifier` **sólo sobre la
  llave** `auth-server-es256` y `roles/cloudsql.client`. Sin permisos de export/destroy.
- Deployer de CI `github-actions-deployer@`: `roles/iam.serviceAccountUser` sobre `auth-server@` +
  `roles/cloudkms.viewer` sobre la llave (lo exige el preflight de `deploy.sh`).
- Ingreso `internal-and-cloud-load-balancing` + `allow-unauthenticated`: sólo el LB lo alcanza; la app valida
  `Host` contra `AUTH_SERVER_ALLOWED_HOSTS` (421 si no coincide).
- Cookie/sesión/secretos propios. **Nunca** `NEXTAUTH_SECRET` ni la cookie del portal.

### Variables (SoT: `deploy.sh`, `--set-env-vars` destructivo)

| Variable | Valor | Nota |
| --- | --- | --- |
| `AUTH_SERVER_ENABLED` | `true` por defecto desde 2026-09-04 (Slice 2) | Flag maestro. Con ON sólo expone `/readyz` y el JWKS. Ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. |
| `AUTH_SERVER_ISSUER` | `https://auth.efeonce.org` | Debe ser idéntico al origen del well-known. |
| `AUTH_SERVER_ALLOWED_HOSTS` | `auth.efeonce.org` | Lista separada por comas. |
| `AUTH_SERVER_KMS_KEY` | `projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256` | Nombre completo del recurso. |
| `AUTH_SERVER_OAUTH_ENABLED` | `false` por defecto (TASK-1829) | Publica la metadata y `/oauth/*`. Prender sólo con la fila del environment `efeonce-auth` en `greenhouse_core.external_identity_environments` y metadata validada (runbook §`OAuth`). Ledger: `FEATURE_FLAG_STATE_LEDGER.md`. |
| `AUTH_SERVER_ENVIRONMENT_ID` | `efeonce-auth` | `environment_id` del emisor en `external_identity_environments`; con él se resuelve `bound` y el claim `gv`. |
| `AUTH_SERVER_MCP_AUDIENCE` | `https://mcp.efeonce.org/mcp` | `aud` de los access tokens y `resource` aceptado. |
| `GREENHOUSE_POSTGRES_*` | Cloud SQL Connector | Igual que los workers; usuario `greenhouse_app`. |
| `SENTRY_DSN` | secreto `greenhouse-sentry-dsn` | Opcional; degrada honesto. |

## Llaves de firma

Registry en `greenhouse_auth.signing_keys` (+ audit append-only `signing_key_events`). Estados:
`active → retiring → retired`. Exactamente una `active` (índice parcial único). El JWKS publica
`active` + `retiring`.

Rotación (operador, con ADC propia — el runtime no puede crear versiones KMS):

```bash
pnpm auth-server:rotate-key            # crea versión KMS nueva, la registra y la activa; la anterior → retiring
pnpm auth-server:rotate-key --status   # lista llaves y estados
pnpm auth-server:rotate-key --retire <kid>          # retira una `retiring` (exige ≥ 1 h de solapamiento)
pnpm auth-server:rotate-key --retire <kid> --force  # sólo incidente; queda en el evento
```

Después de retirar: deshabilitar la versión KMS vieja (`gcloud kms keys versions disable`) para volver a una
sola versión facturable.

## Deploy

```bash
ENV=staging    bash services/auth-server/deploy.sh
ENV=production bash services/auth-server/deploy.sh
```

Un solo servicio Cloud Run (`auth-server`) compartido por staging y production, como `ops-worker`; `ENV`
selecciona el mínimo de instancias (production 1, staging 0). Workflow: `.github/workflows/auth-server-deploy.yml`
(Slice 2). El host `auth.efeonce.org` se enruta desde `efeonce-mcp/infra/terraform/front_door.tf`
(`enable_auth_host`).

## Gates

- `pnpm worker:build-contract-gate` · `pnpm worker:runtime-deps-gate` · `pnpm worker:deploy-path-gate`
- `pnpm vitest run src/lib/auth-server` (68 tests; incluye el flujo OAuth completo in-process, `oauth-flow.test.ts`)
- `pnpm auth-server:oauth-store:smoke` (store OAuth contra PostgreSQL real: single-use, rotación/reuso, revoke de familia, consent idempotente, trigger append-only)
- `pnpm auth-server:brand-assets:generate` regenera `src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts` desde el SSOT de marca (test de drift en `brand-assets.test.ts`; nunca a mano)
- `pnpm migration-marker-gate`

## Runbook

`docs/operations/runbooks/auth-server.md`.
