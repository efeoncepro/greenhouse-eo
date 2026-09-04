---
paths:
  - "services/auth-server/**"
  - "src/lib/auth-server/**"
  - "scripts/auth-server/**"
---

# Auth server propio de Efeonce (TASK-1828 / EPIC-044) — invariantes (auto-load por path)

Carga **`docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`** (ADR nativo, Accepted 2026-09-03) + runbook **`docs/operations/runbooks/auth-server.md`** + **`docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` → §"Auth server propio"**. Contexto: el emisor `auth.efeonce.org` YA existe como runtime (`services/auth-server`, `node:http`, Cloud Run `us-east4`, single service staging+prod, revisión activa `auth-server-00003-jtf`) y es el único emisor de tokens de Efeonce (la emisión OAuth/CIMD llega con TASK-1829). Hoy sirve `/healthz`, `/readyz` (503 con `AUTH_SERVER_ENABLED=false`) y `/.well-known/jwks.json` (llaves `active` + `retiring`, `max-age 300`); cualquier `Host` fuera del allowlist → 421; errores sanitizados; `captureWithDomain('identity', component=auth-server)`. La llave de firma `auth-server-es256` (EC P-256) vive en Cloud KMS HSM `us-east4/auth-server`; PostgreSQL (`greenhouse_auth.signing_keys` con ≤1 `active` por índice parcial + `signing_key_events` append-only) guarda sólo el JWK PÚBLICO (sin `d`) y el ciclo de vida. Front door: segundo host del LB del gateway MCP (`efeonce-mcp/infra/terraform`, `enable_auth_host`), misma policy Cloud Armor. Fuera de alcance acá: OAuth/CIMD/tokens (TASK-1829), login sin contraseña (1830), gateway multi-issuer (1831), canaries (1832), pentest/rotación programada (1833), convergencia del login del portal (1834).

Reglas duras:

1. **NUNCA** exportar, copiar ni loggear la llave privada: no sale de KMS (el adapter firma vía API con CRC32C, DER→JOSE, `kid` RFC 7638 y verificación local obligatoria de cada firma). **NUNCA** material privado en PG, env vars ni Secret Manager.
2. **NUNCA** firmar con una llave que no esté `active`. `retiring` sólo se publica en el JWKS para que los tokens en vuelo sigan verificando.
3. **SIEMPRE** registrar una versión KMS nueva con `pnpm auth-server:rotate-key` (`--status | --register <version> | --retire <kid> [--force]`), NUNCA con `INSERT` a mano. Requiere proxy PG (`GREENHOUSE_POSTGRES_HOST=127.0.0.1`, `GREENHOUSE_POSTGRES_PORT=15432`, `GREENHOUSE_POSTGRES_SSL=false`, `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=""`) + `AUTH_SERVER_KMS_KEY`.
4. **SIEMPRE** retirar la versión anterior tras la ventana de solapamiento (≥1 h): `--retire <kid>` + `gcloud kms keys versions disable`. Un `retiring` eterno es superficie extra, no seguridad (hoy: v2 `active`, v1 `retiring` con retiro pendiente).
5. **NUNCA** `gcloud run services update --update-env-vars` a mano en `auth-server`: el SoT es `services/auth-server/deploy.sh` (`--set-env-vars` destructivo: `AUTH_SERVER_ENABLED` —default `true` desde 2026-09-04—, `AUTH_SERVER_ISSUER`, `AUTH_SERVER_ALLOWED_HOSTS`, `AUTH_SERVER_KMS_KEY`); deploy sólo por `auth-server-deploy.yml` (`RELEASE_DEPLOY_WORKFLOWS`).
6. **NUNCA** editar `managed.domains` del cert del gateway para agregar el host (es ForceNew: re-provisiona `mcp.efeonce.org`). `auth.efeonce.org` tiene host rule + backend `efeonce-auth-server-backend` + cert `efeonce-auth-server-cert` propios.
7. **NUNCA** compartir `NEXTAUTH_SECRET` ni cookies del portal con el emisor: el login de Greenhouse NO cambia. IAM mínimo: runtime `auth-server@efeonce-group` = `cloudkms.signerVerifier` sólo sobre la llave + `cloudsql.client`; deployer `github-actions-deployer@` = `iam.serviceAccountUser` sobre `auth-server@` + `cloudkms.viewer` sobre la llave. Nada a nivel proyecto.
8. `/readyz` 503 con el flag OFF no es fallo. Señales (`src/lib/reliability/queries/auth-server-signals.ts`): `auth.issuer.jwks_unreachable` (runtime; `not_configured` hasta `AUTH_SERVER_JWKS_URL` en Vercel) y `auth.signing_keys.lifecycle` (data_quality).
