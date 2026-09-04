# Efeonce Auth Server (`auth.efeonce.org`)

> **Tipo de documento:** README del deployable (TASK-1828, EPIC-044)
> **Versión:** 1.0
> **Creado:** 2026-09-04 por Claude (sesión `/implement-task 1828`)
> **Documentación técnica:** [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)

Authorization server propio de Efeonce. Cloud Run Service en `us-east4`, publicado como **segundo host del
front door del gateway MCP** (mismo global LB, misma IP `34.111.78.237`, misma policy Cloud Armor). Emite
tokens ES256 firmados con una llave asimétrica en **Cloud KMS con protección HSM**; la privada nunca sale del
hardware.

## Qué hace hoy (Slice 1)

| Ruta | Comportamiento |
| --- | --- |
| `GET /healthz` | Liveness. 200 siempre; no toca KMS ni PG. |
| `GET /readyz` | 503 `disabled` si `AUTH_SERVER_ENABLED=false`; con `true`, 200 sólo si PG responde, hay llave `active` y KMS devuelve su pública. |
| `GET /.well-known/jwks.json` | JWKS con las llaves `active` + `retiring` (`kid` = thumbprint RFC 7638). 404 con el flag OFF. `Cache-Control: max-age=300`. |

Los endpoints OAuth (`/.well-known/oauth-authorization-server`, `/oauth/*`) los entrega `TASK-1829`; la
autenticación de personas (passkeys, magic link, TOTP) `TASK-1830`.

## Runtime

- `services/auth-server/server.ts` (`node:http`, esbuild bundle, Node 22-slim), reusa `src/lib/**`.
- Service account dedicado `auth-server@efeonce-group` con `roles/cloudkms.signerVerifier` **sólo sobre la
  llave** `auth-server-es256` y `roles/cloudsql.client`. Sin permisos de export/destroy.
- Ingreso `internal-and-cloud-load-balancing` + `allow-unauthenticated`: sólo el LB lo alcanza; la app valida
  `Host` contra `AUTH_SERVER_ALLOWED_HOSTS` (421 si no coincide).
- Cookie/sesión/secretos propios. **Nunca** `NEXTAUTH_SECRET` ni la cookie del portal.

### Variables (SoT: `deploy.sh`, `--set-env-vars` destructivo)

| Variable | Valor | Nota |
| --- | --- | --- |
| `AUTH_SERVER_ENABLED` | `false` por defecto | Flag maestro. Ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. |
| `AUTH_SERVER_ISSUER` | `https://auth.efeonce.org` | Debe ser idéntico al origen del well-known. |
| `AUTH_SERVER_ALLOWED_HOSTS` | `auth.efeonce.org` | Lista separada por comas. |
| `AUTH_SERVER_KMS_KEY` | `projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256` | Nombre completo del recurso. |
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
- `pnpm vitest run src/lib/auth-server`
- `pnpm migration-marker-gate`

## Runbook

`docs/operations/runbooks/auth-server.md` (Slice 3).
