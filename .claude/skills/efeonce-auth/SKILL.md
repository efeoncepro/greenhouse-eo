---
name: efeonce-auth
description: Operate and extend Efeonce Auth / Efeonce ID — the native OAuth/OIDC authorization server (`auth.efeonce.org`, Cloud Run `auth-server`, EPIC-044) in production since 2026-09-04 and ALREADY the sign-in issuer of the MCP gateway `mcp.efeonce.org` (scopes `efeonce.mcp.*`); Rooms is its first first-party relying party and the Greenhouse portal login converges later (TASK-2063). Use when touching `services/auth-server/**`, `src/lib/auth-server/**`, `scripts/auth-server/**`, first-party login (TASK-1834), Login V4 screens and product context `/login/rooms` (TASK-2064), invitation email OTP (TASK-2067), Greenhouse login convergence (TASK-2063), security review TASK-1833, RP registration, signing keys/KMS rotation, Auth flags (`AUTH_SERVER_FIRST_PARTY_ENABLED`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED`), the PR 262 release, or the Rooms+Auth canary. Living skill: read references/program-ledger.md first and update it at every Auth task closure.
---

# Efeonce Auth / Efeonce ID (skill viva)

Efeonce ID es el **autorizador propio** de Efeonce: OAuth 2.1/OIDC servido por Cloud Run `auth-server`
en `auth.efeonce.org`. Se decidió el 2026-09-03 en lugar de WorkOS ([ADR nativo](../../../docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md))
y está **en producción desde el 2026-09-04** (release `9100bbd2765d`).

- **Ya es el login del MCP:** `https://mcp.efeonce.org/.well-known/oauth-protected-resource` declara
  `authorization_servers: ["https://auth.efeonce.org"]`. El emisor publica `efeonce.mcp.read`,
  `efeonce.mcp.globe.read` y `efeonce.mcp.hiring.read` (readback 2026-10-25).
- **Rooms es su primer relying party first-party** (login propio + OTP de invitación).
- **El login del portal Greenhouse converge después** (TASK-2063).
- **No tiene repo propio:** el código vive en `greenhouse-eo`. El host `auth.efeonce.org` es el segundo host
  del load balancer del gateway MCP (Terraform en `efeonce-mcp/infra/terraform/`).

Esta skill es el conocimiento operativo acumulado, no una copia de los ADR. Los ADR dicen qué ES Auth;
esta skill dice qué hay que saber para trabajar sin repetir lo que ya costó un día.

## Orden de lectura

1. Este archivo: reglas y ruteo.
2. [`references/program-ledger.md`](references/program-ledger.md): estado vivo por task, qué está
   desplegado, qué está OFF y la secuencia pendiente. **Empezar aquí.**
3. Auditorías de rollout (la verdad operativa más reciente):
   - [`docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md`](../../../docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md): corte consolidado.
   - [`docs/audits/identity/2026-10-25-auth-rooms-controlled-rollout.md`](../../../docs/audits/identity/2026-10-25-auth-rooms-controlled-rollout.md): bitácora del rollout controlado.
4. ADR y contratos, sólo cuando haga falta el contrato completo:
   - `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md`
   - `EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md`
   - `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
   - `EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
   - `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`
5. Manuales:
   - `docs/manual-de-uso/identity/operar-invitacion-rooms-email-otp.md`
   - `operar-pantallas-efeonce-id.md`
   - `efeonce-id-interno.md`
   - `administrar-novedades-del-login.md`

## Mapa del código

| Pieza | Dónde |
|---|---|
| Servicio Cloud Run (entrypoint, Dockerfile, `deploy.sh`) | `services/auth-server/` |
| Dominio | `src/lib/auth-server/{oauth,persons,internal,first-party,email-otp,keys,maintenance}` |
| Scripts operativos | `scripts/auth-server/*`: registro de clientes/RP/issuer, rotación de llave, canaries, smoke, drift de config Rooms (`rooms-config-drift.py`) |
| Deploy | `.github/workflows/auth-server-deploy.yml` (push a `develop` con paths de Auth) + `production-release.yml` vía `workflow_call` |

Comandos útiles:
- `pnpm auth-server:dev-ui`: arnés visual con renderers reales y DTOs ficticios, sin auth ni comandos. Puerto por defecto 19036; se cambia con `AUTH_SERVER_DEV_UI_PORT`. Rutas: `/login`, `/login/rooms`, `/login/external`, `/magic-link/*`, `/invitation/*`, `/session/*`, `/error/*` y `/consent/multi-org-v2`.
- `pnpm auth-server:verify-contrast`, `pnpm auth-server:verify-passkey`.
- `pnpm auth-server:register-first-party-client`, `pnpm auth-server:rotate-key`, `pnpm auth-server:person-auth:canary`.

## Reglas duras

- **Hay UN solo servicio Cloud Run `auth-server`** y es el que atiende el login del MCP. Un deploy o
  flag roto deja sin login a todo cliente MCP, no sólo a Rooms. Probar siempre `/.well-known/*`, JWKS y
  `readyz` después de cada revisión.
- **Prender un flag de Auth es una mutación de PRODUCCIÓN.** Los flags viven en variables GitHub a nivel de repo y `deploy.sh` las lee.
  - Según el audit del rollout, el único servicio que sirve `auth.efeonce.org` se despliega en push a `develop`. Encenderlas y pushear a `develop` activa el flujo en el host real **sin pasar por la promoción**.
  - Hacerlo sólo deliberadamente, con autorización explícita, y conciliar antes qué host sirve cada revisión.
- **El HMAC del OTP y el token de autoridad de Rooms sólo se montan con el flag ON** (`deploy.sh`). Un flag OFF con secreto ausente es el estado correcto, no un bug.
- **El correo real tiene un único destinatario autorizado** (`jreyes@efeoncepro.com`) y se manda una sola vez, como canary.
  - Leer el ledger y reconciliar entregas antes de enviarlo: un canary ya recibido no autoriza repetir el correo en otro despliegue.
  - Ningún cliente.
  - Ninguna ampliación sin una nueva autorización del operador.
  - `email_type_config.auth_server_rooms_invitation_otp` nace en FALSE.
- **El preflight de promoción se corre contra `target-branch=main`.** Contra `develop` devuelve «batch unknown» y no aprueba nada.
- **Readback de la revisión ACTIVA** (`gcloud run services describe auth-server`) después de cada deploy: `GIT_SHA`, flags y RP/origen. «Deploy verde» no es lo mismo que «flag aplicado».
- **Un preparativo no prueba una integración.** RP registrado, secretos v1 o health/JWKS en 200 no acreditan firma nueva, sesión ni entrega de correo.
- **El repo `greenhouse-eo` es PÚBLICO.** Los recibos con identificadores del operador viven fuera de git (`.auth/…`), nunca en `docs/`. Lo que ya se commiteó sigue en el historial.
- **Seguridad (TASK-1833):** hay evaluación propia y revisión entre agentes, **sin pentest completo**; la cobertura ofensiva quedó bloqueada. No declarar «pentest hecho».
- Paridad Full API: toda pantalla de Auth es cliente de un command o reader de `src/lib/auth-server/**`. Copy en `src/lib/copy/*`, tuteo es-CL.

## Contrato de mantenimiento de la skill

Cada task de Auth (EPIC-044 / 1833 / 1834 / 2063 / 2064 / 2067 y siguientes) **actualiza
`references/program-ledger.md` al cerrar o al detenerse**: qué quedó vivo, qué está OFF, qué falta y la
evidencia (revisión, SHA, run). Esta skill es byte-identical entre `.claude/skills/efeonce-auth` y
`.codex/skills/efeonce-auth`: editar una, copiar a la otra y correr `pnpm skills:mirrors`.
