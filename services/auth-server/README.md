# Efeonce Auth Server (`auth.efeonce.org`)

> **Tipo de documento:** README del deployable (TASK-1828 + TASK-1829, EPIC-044)
> **Versión:** 1.3
> **Creado:** 2026-09-04 por Claude (sesión `/implement-task 1828`)
> **Última actualización:** 2026-09-08 por Codex (TASK-1844, multiorganización interna desplegada y certificada para cohorte exacta)
> **Documentación técnica:** [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) · contrato OAuth [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](../../docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md)

Authorization server propio de Efeonce. Cloud Run Service en `us-east4`, publicado como **segundo host del
front door del gateway MCP** (mismo global LB, misma IP `34.111.78.237`, misma policy Cloud Armor). Emite
tokens ES256 firmados con una llave asimétrica en **Cloud KMS con protección HSM**; la privada nunca sale del
hardware.

**Baseline histórico de la primera publicación:** en **producción desde 2026-09-04** por el release `9100bbd2765d` (job `deploy-auth-server` del
orquestador; revisión `auth-server-00005-pk8`, `GIT_SHA f6db4255a`; `/readyz` 200, JWKS con 2 `kid`,
`/.well-known/oauth-authorization-server` 404 con el flag OAuth OFF). Environment del emisor `efeonce-auth`
registrado en `draft` (`pnpm auth-server:register-issuer-environment`). `AUTH_SERVER_JWKS_URL` declarada en Vercel
Production + staging.

**Estado posterior a TASK-1844 (2026-09-08):** emisor OAuth/personas/interno productivo, v2 ON para una identidad; expand/contract aplicadas y clientes/rollback certificados. [Readback fechado](../../docs/audits/mcp/TASK-1844_FINAL_RUNTIME_2026-09-08.json) y [manual interno](../../docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md). Antes de operar, releer revisión, tráfico y flags; el baseline anterior no prescribe el estado actual.

## Qué hace hoy

| Ruta                                                                                    | Flag                        | Comportamiento                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /healthz`                                                                          | —                           | Liveness. 200 siempre; no toca KMS ni PG. Body incluye `enabled` y `oauth` (estado de ambos flags).                                                                                                      |
| `GET /readyz`                                                                           | `AUTH_SERVER_ENABLED`       | 503 `disabled` si el flag está en `false`; con `true`, 200 sólo si PG responde, hay llave `active` y KMS devuelve su pública. Body incluye `oauth`.                                                      |
| `GET /.well-known/jwks.json`                                                            | `AUTH_SERVER_ENABLED`       | JWKS con las llaves `active` + `retiring` (`kid` = thumbprint RFC 7638). 404 con el flag OFF. `Cache-Control: max-age=300`.                                                                              |
| `GET /.well-known/oauth-authorization-server` · `GET /.well-known/openid-configuration` | `AUTH_SERVER_OAUTH_ENABLED` | Metadata RFC 8414 / OIDC; `issuer` idéntico al origen. `max-age=300`.                                                                                                                                    |
| `POST /oauth/register`                                                                  | `AUTH_SERVER_OAUTH_ENABLED` | DCR (RFC 7591) sólo clientes públicos (`token_endpoint_auth_method: none`); 10/min por IP.                                                                                                               |
| `GET /oauth/authorize` · `POST /oauth/consent`                                          | `AUTH_SERVER_OAUTH_ENABLED` | Authorization code + PKCE `S256`; pantalla de consentimiento mínima server-side. Requiere sesión elegible de su población; TASK-1830/1836 resuelven personas y TASK-1844 conserva consentimiento interno v1/v2 separado.                                                      |
| `POST /oauth/token`                                                                     | `AUTH_SERVER_OAUTH_ENABLED` | `authorization_code` + `refresh_token`; auth `none` / `client_secret_basic` / `client_secret_post`; 60/min por IP · 120/min por cliente. Access JWT ES256 15 min con claim `gv`; refresh opaco rotativo. |
| `POST /oauth/revoke` · `POST /oauth/introspect`                                         | `AUTH_SERVER_OAUTH_ENABLED` | RFC 7009 (revoca la familia) · RFC 7662 (sólo clientes confidenciales).                                                                                                                                  |

Con `AUTH_SERVER_OAUTH_ENABLED=false` toda la superficie OAuth responde `404 {"error":"not_found"}`;
`/healthz`, `/readyz` y el JWKS no cambian. El deploy script usa default `true`; verificar la configuración efectiva y no confundirla con defaults de tests o con el primer rollout de TASK-1829.
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

| Variable                           | Valor                                                                                         | Nota                                                                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SERVER_ENABLED`              | `true` por defecto desde 2026-09-04 (Slice 2)                                                 | Flag maestro para readiness/JWKS; OAuth y autenticación conservan gates adicionales. Ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.                                                                                                                               |
| `AUTH_SERVER_ISSUER`               | `https://auth.efeonce.org`                                                                    | Debe ser idéntico al origen del well-known.                                                                                                                                                                                                 |
| `AUTH_SERVER_ALLOWED_HOSTS`        | `auth.efeonce.org`                                                                            | Lista separada por comas.                                                                                                                                                                                                                   |
| `AUTH_SERVER_KMS_KEY`              | `projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256` | Nombre completo del recurso.                                                                                                                                                                                                                |
| `AUTH_SERVER_OAUTH_ENABLED`        | `true` en deploy.sh; comprobar valor servido                                                               | Publica la metadata y `/oauth/*`. Prender sólo con la fila del environment `efeonce-auth` en `greenhouse_core.external_identity_environments` y metadata validada (runbook §`OAuth`). Ledger: `FEATURE_FLAG_STATE_LEDGER.md`.               |
| `EXTERNAL_IDENTITY_CANARY_ENABLED` | `false` por defecto (TASK-1832)                                                               | Gate adicional para población externa `binding_purpose=canary`. OFF impide consentimiento/emisión/refresh mediante el resolver aunque OAuth general esté ON. Se enciende sólo junto al registro exacto y al gate independiente del gateway. |
| `AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED` | `false` por defecto (TASK-1844) | Emisión/refresh v2 sólo con cohorte; contexto v1 nunca se promueve. |
| `AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS` | vacío por defecto | CSV de IDs exactos, sin wildcard. deploy.sh preserva comas con delimitador `::`; change-gate detecta drift aun con igual SHA. |
| `AUTH_SERVER_ENVIRONMENT_ID`       | `efeonce-auth`                                                                                | `environment_id` del emisor en `external_identity_environments`; con él se resuelve `bound` y el claim `gv`. La fila se creó en draft el 2026-09-04 y fue activada durante el rollout nativo; releer estado antes de operar, no repetir el bootstrap.                   |
| `AUTH_SERVER_MCP_AUDIENCE`         | `https://mcp.efeonce.org/mcp`                                                                 | `aud` de los access tokens y `resource` aceptado.                                                                                                                                                                                           |
| `GREENHOUSE_POSTGRES_*`            | Cloud SQL Connector                                                                           | Igual que los workers; usuario `greenhouse_app`.                                                                                                                                                                                            |
| `SENTRY_DSN`                       | secreto `greenhouse-sentry-dsn`                                                               | Opcional; degrada honesto.                                                                                                                                                                                                                  |

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

## Scripts (`scripts/auth-server/`)

| Comando                                        | Script                           | Qué hace                                                                                                                                                                                                                                                                                                             | Requiere                                                     |
| ---------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `pnpm auth-server:rotate-key`                  | `rotate-signing-key.ts`          | Rota/registra/retira versiones de la llave KMS (`--status`, `--register <version>`, `--retire <kid> [--force]`)                                                                                                                                                                                                      | `.env.local` + proxy PG + `AUTH_SERVER_KMS_KEY` + ADC propia |
| `pnpm auth-server:register-client`             | `register-oauth-client.ts`       | Registra un cliente OAuth **confidencial** (`--name`, `--redirect`, `--auth-method`, `--scopes`, `--client-id`); secreto mostrado una sola vez                                                                                                                                                                       | `.env.local` + proxy PG                                      |
| `pnpm auth-server:oauth-store:smoke`           | `oauth-store-smoke.ts`           | Smoke del store OAuth contra PostgreSQL real (single-use, rotación/reuso, revoke de familia, consent idempotente, trigger append-only)                                                                                                                                                                               | `.env.local` + proxy PG                                      |
| `pnpm auth-server:register-issuer-environment` | `register-issuer-environment.ts` | Registra/actualiza la fila `efeonce-auth` de `greenhouse_core.external_identity_environments` por el command canónico de TASK-1631 (`upsertExternalIdentityEnvironment`: tx + audit + outbox; nunca SQL). `--status draft\|active`, `--environment-id`. Registrada en `draft` el 2026-09-04; `issuerClass` inmutable | `.env.local` + proxy PG (perfil ops, `127.0.0.1:15432`)      |
| `node scripts/mcp/external-client-canary.mjs`  | `external-client-canary.mjs`     | DCR público + PKCE S256 + consentimiento + JWT/JWKS + organización exacta + `get_seo_entitlement` + negativas/refresh/revoke, sin persistir ni imprimir tokens                                                                                                                                                       | fixture TASK-1832 aprobado + `run-id`/`organization-id` exactos + gates/readbacks |
| `pnpm identity:external-canary:readback`       | `external-canary-readback.ts`    | Conteo agregado y redactado de registry, bindings, drift de purpose y exposición `smoke_test` en Person 360                                                                                                                                                                                                          | proxy PG; perfil ops de sólo lectura                         |
| `pnpm identity:external-canary:cleanup`        | `external-canary-cleanup.ts`     | Dry-run por defecto; apply sólo con perfil migrator, confirmación exacta y readback cero                                                                                                                                                                                                                             | proxy PG; aprobación separada para apply                     |
| `pnpm auth-server:brand-assets:generate`       | `generate-brand-assets.ts`       | Regenera `src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts` desde el SSOT de marca                                                                                                                                                                                                                       | —                                                            |

## Deploy

La vía normal es el [release control plane](../../docs/operations/runbooks/production-release.md): candidato aprobado, preflight y `production-release.yml` con su SHA exacto. El workflow transporta las variables durables de gates/cohorte. No ejecutar el script directamente con sólo `ENV=staging` o `ENV=production`: sus defaults pueden apagar v2 y vaciar la cohorte en el servicio compartido. Una invocación directa exige autorización break-glass y preservar explícitamente todos los gates/cohorte del snapshot verificado; luego reconciliar configuración durable y servida.

Un solo servicio Cloud Run (`auth-server`) compartido por staging y production, como `ops-worker`; `ENV`
selecciona el mínimo de instancias (production 1, staging 0). Workflow: `.github/workflows/auth-server-deploy.yml`
(Slice 2; staging en push a `develop`, producción sólo por `production-release.yml` job `deploy-auth-server`, deploy
change-gated por rutas). Primer release de producción: `9100bbd2765d` (2026-09-04). El host `auth.efeonce.org` se
enruta desde `efeonce-mcp/infra/terraform/front_door.tf` (`enable_auth_host`).

## Gates

- `pnpm worker:build-contract-gate` · `pnpm worker:runtime-deps-gate` · `pnpm worker:deploy-path-gate`
- `pnpm vitest run src/lib/auth-server` (incluye el flujo OAuth in-process; registrar passed/skipped de la ejecución, no reutilizar un conteo histórico)
- `pnpm auth-server:oauth-store:smoke` (store OAuth contra PostgreSQL real: single-use, rotación/reuso, revoke de familia, consent idempotente, trigger append-only)
- `pnpm auth-server:brand-assets:generate` regenera `src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts` desde el SSOT de marca (test de drift en `brand-assets.test.ts`; nunca a mano)
- `pnpm migration-marker-gate`

## Runbook

`docs/operations/runbooks/auth-server.md`.

## TASK-1844 — Autoridad interna multiorganización

Writer compatible y consentimiento/contexto v2 desplegados; gates durables y servidos ON para el perfil exacto autorizado. Expand `20260908184942851` y contract `20260908194829159` aplicadas: CHECK 1/2, índice único versionado y trigger inmutable; historia conservada. Después de contract sólo es seguro volver a un writer compatible, nunca recrear el índice anterior ni fabricar consentimiento.

La conexión conserva un actor; cada objetivo se autoriza mediante el reader Greenhouse. Nuevas organizaciones elegibles no requieren otro OAuth. V1 no se eleva por refresh, y el scope inicial sigue `efeonce.mcp.read`/capability `growth.seo.observation.read`. Codex, Claude Code y Claude hospedado/Desktop tienen evidencia de renovación/revocación y recuperación. Claude Code requirió login tras rollback OFF.

CIMD filtra grants adicionales a la intersección soportada (`authorization_code`, `refresh_token`), sin habilitar JWT bearer; los identificadores vacíos o con whitespace se rechazan. [Runbook y evidencia](../../docs/operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md) · [funcional](../../docs/documentation/identity/acceso-mcp-interno-multiorganizacion.md).
