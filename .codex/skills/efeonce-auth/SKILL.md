---
name: efeonce-auth
description: Operate and extend Efeonce Auth / Efeonce ID — the native OAuth/OIDC authorization server (`auth.efeonce.org`, Cloud Run `auth-server`, EPIC-044) in production since 2026-09-04 and ALREADY the sign-in issuer of the MCP gateway `mcp.efeonce.org` (scopes `efeonce.mcp.*`); Rooms is its first first-party relying party and the Greenhouse portal login converges later (TASK-2063). Use when touching `services/auth-server/**`, `src/lib/auth-server/**`, `scripts/auth-server/**`, first-party login (TASK-1834), Login V4 screens and product context `/login/rooms` (TASK-2064), invitation email OTP (TASK-2067), Greenhouse login convergence (TASK-2063), security review TASK-1833, RP registration, signing keys/KMS rotation, Auth flags (`AUTH_SERVER_FIRST_PARTY_ENABLED`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED`), the PR 262 release, or the Rooms+Auth canary. Living skill: read references/program-ledger.md first and update it at every Auth task closure.
---

# Efeonce Auth / Efeonce ID (skill viva)

**Corte 2026-10-29:** leer el [mapa Auth+Rooms](../../../docs/audits/rooms/2026-10-29-auth-rooms-program-consolidation.md)
antes de operar. El canary del 26-10 cerró OFF y no se repite. Login V4,
guards de deploy y Job aislado de rotación tienen avances en el candidato
`codex/auth-pr-develop-stack`; ese HEAD no está en las PR remotas ni en
producción. El Job nace OFF/dry-run y no tiene Scheduler; recuperación y
retirement de llaves requieren supervisión. Release Auth permanece retenido.

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
   - [`docs/audits/rooms/2026-10-26-auth-rooms-real-image-canary.md`](../../../docs/audits/rooms/2026-10-26-auth-rooms-real-image-canary.md): canary único real PASS, cerrado y flags OFF; no repetir correo.
   - [`docs/audits/rooms/2026-10-26-auth-deploy-control.md`](../../../docs/audits/rooms/2026-10-26-auth-deploy-control.md): control preparado en PR y retención humana; consultar ledger para el corte de CI.
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
| Deploy | `.github/workflows/auth-server-deploy.yml`: remoto aún permite push `develop`; corrección production/main sólo local + PR #263/#264 abiertas, retenidas. `production-release.yml` conserva su `workflow_call` |

Comandos útiles:
- `pnpm auth-server:dev-ui`: arnés visual con renderers reales y DTOs ficticios, sin auth ni comandos. Puerto por defecto 19036; se cambia con `AUTH_SERVER_DEV_UI_PORT`. Rutas: `/login`, `/login/rooms`, `/login/external`, `/magic-link/*`, `/invitation/*`, `/session/*`, `/error/*` y `/consent/multi-org-v2`.
- `pnpm auth-server:verify-contrast`, `pnpm auth-server:verify-passkey`.
- `pnpm auth-server:register-first-party-client`, `pnpm auth-server:rotate-key`, `pnpm auth-server:person-auth:canary`.

## Reglas duras

- **Hay UN solo servicio Cloud Run `auth-server`** y es el que atiende el login del MCP. Un deploy o
  flag roto deja sin login a todo cliente MCP, no sólo a Rooms. Probar siempre `/.well-known/*`, JWKS y
  `readyz` después de cada revisión.
- **Prender un flag de Auth es una mutación de PRODUCCIÓN.** Los flags viven en variables GitHub a nivel de repo y `deploy.sh` las lee.
  - El YAML remoto de `main`/`develop` aún es el anterior: el push de `develop` puede tocar el host real **sin pasar por promoción**. El guard visible en el workspace no lo protege hasta integrar las PR.
  - **Retención humana vigente:** PR #263 `main` HEAD `5e1fc2554` y PR #264 `develop` HEAD `aabd6d78d` abiertas; sin merge, deploy ni disable/enable de workflows. Antes de una eventual integración de PR #264, evaluar los filtros gruesos `src/lib/**` de artifact/commercial/ico/ops; no se aplicó protección temporal ahora.
  - Hacerlo sólo deliberadamente, con autorización explícita, y conciliar antes qué host sirve cada revisión.
- **El HMAC del OTP y el token de autoridad de Rooms sólo se requieren con el flag ON.** En el readback final ambos flags están OFF y esos montajes ausentes. El retiro declarativo en `deploy.sh` está corregido localmente y en PR; no asumir que el remoto ya lo incorpora.
- **El correo real tiene un único destinatario autorizado** (`jreyes@efeoncepro.com`) y se manda una sola vez, como canary.
  - Leer el ledger y reconciliar entregas antes de enviarlo: un canary ya recibido no autoriza repetir el correo en otro despliegue.
  - Ningún cliente.
  - Ninguna ampliación sin una nueva autorización del operador.
  - `email_type_config.auth_server_rooms_invitation_otp` nace en FALSE.
- **El preflight de promoción se corre contra `target-branch=main`.** Contra `develop` devuelve «batch unknown» y no aprueba nada.
- **Readback de la revisión ACTIVA** (`gcloud run services describe auth-server`) después de cada deploy: `GIT_SHA`, flags y RP/origen. «Deploy verde» no es lo mismo que «flag aplicado».
- **Un preparativo no prueba una integración.** RP registrado, secretos v1 o health/JWKS en 200 no acreditan firma nueva, sesión ni entrega de correo. El canary Rooms del 26 de octubre sí acreditó Microsoft/MFA, OIDC, PNG privado y un correo recibido; ya se cerró, no se repite ni amplía por inferencia.
- **Nueva UI en entorno aislado sigue autorizada.** La retención de las PR y el acceso productivo OFF no bloquean diseño/desarrollo local. No autoriza publicación, activación ni aceptación visual de la nueva dirección.
- **El repo `greenhouse-eo` es PÚBLICO.** Los recibos con identificadores del operador viven fuera de git (`.auth/…`), nunca en `docs/`. Lo que ya se commiteó sigue en el historial.
- **Seguridad (TASK-1833):** hay evaluación propia y revisión entre agentes, **sin pentest completo**; la cobertura ofensiva quedó bloqueada. No declarar «pentest hecho».
- Paridad Full API: toda pantalla de Auth es cliente de un command o reader de `src/lib/auth-server/**`. Copy en `src/lib/copy/*`, tuteo es-CL.

## Contrato de mantenimiento de la skill

Cada task de Auth (EPIC-044 / 1833 / 1834 / 2063 / 2064 / 2067 y siguientes) **actualiza
`references/program-ledger.md` al cerrar o al detenerse**: qué quedó vivo, qué está OFF, qué falta y la
evidencia (revisión, SHA, run). Esta skill es byte-identical entre `.claude/skills/efeonce-auth` y
`.codex/skills/efeonce-auth`: editar una, copiar a la otra y correr `pnpm skills:mirrors`.
