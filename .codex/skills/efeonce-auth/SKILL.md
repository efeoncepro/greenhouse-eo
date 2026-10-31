---
name: efeonce-auth
description: Operate and extend Efeonce Auth / Efeonce ID — the native OAuth/OIDC authorization server (`auth.efeonce.org`, Cloud Run `auth-server`, EPIC-044) in production since 2026-09-04 and ALREADY the sign-in issuer of the MCP gateway `mcp.efeonce.org` (scopes `efeonce.mcp.*`); Rooms is its first first-party relying party and the Greenhouse portal login converges later (TASK-2063). Use when touching `services/auth-server/**`, `src/lib/auth-server/**`, `scripts/auth-server/**`, first-party login (TASK-1834), Login V4 screens and product context `/login/rooms` (TASK-2064), invitation email OTP (TASK-2067), Greenhouse login convergence (TASK-2063), security review TASK-1833, RP registration, signing keys/KMS rotation, Auth flags (`AUTH_SERVER_FIRST_PARTY_ENABLED`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED`), the PR 262 release, or the Rooms+Auth canary. Living skill: read references/program-ledger.md first and update it at every Auth task closure.
---

# Efeonce Auth / Efeonce ID (skill viva)

**Corte vigente 2026-10-31:** first-party y OTP de invitación están **ON en producción** (`vivo`):
`auth-server-00169-4pq` al 100 % del tráfico (misma imagen que la 00168), con
`AUTH_SERVER_FIRST_PARTY_ENABLED=true`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED=true` y los secretos
`auth-server-rooms-invitation-otp-hmac:1` y `rooms-production-invitation-authority-token:1` montados;
`/healthz`, `/readyz` y discovery en 200. **Rollback:** tráfico a `auth-server-00168-vzb` (flags OFF, sin esos
secretos). La fuente durable son las variables de repo GitHub de ambos flags, en `true`. Se liberaron sólo para la
activación de Rooms, por decisión del operador: las PR #263/#264 siguen abiertas y sin merge, y TASK-1833 sigue
abierta. Ningún cliente real sin una autorización nueva. Recibo:
[activación Rooms + Efeonce ID](../../../docs/audits/rooms/2026-10-31-production-activation.md).
Pendiente nuevo de EPIC-044: delegación interactiva para un **segundo resource server** (audiencia Rooms), distinta
de TASK-1917. Antecedentes: [mapa Auth+Rooms del 29-10](../../../docs/audits/rooms/2026-10-29-auth-rooms-program-consolidation.md)
(Login V4, guards de deploy y Job de rotación OFF/dry-run en `codex/auth-pr-develop-stack`, aún no en producción)
y canary del 26-10, cerrado y no se repite.

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
3. Estado y auditorías (cada recibo conserva su alcance local o cloud):
   - [`docs/audits/rooms/2026-10-31-production-activation.md`](../../../docs/audits/rooms/2026-10-31-production-activation.md): activación Rooms + Efeonce ID (00169, flags ON, variables durables); vigente.
   - [`docs/audits/rooms/2026-10-29-backend-local-completion.md`](../../../docs/audits/rooms/2026-10-29-backend-local-completion.md): backend consumer construido; no release Auth ni prueba del servidor completo.
   - [`docs/audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md`](../../../docs/audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md): 35 checks con issuer QA y dos adapters del mismo consumer, con límites explícitos.
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
- **Cambiar un flag de Auth es una mutación de PRODUCCIÓN.** Los flags viven en variables GitHub a nivel de repo (inputs de `auth-server-deploy.yml`; el environment `production` no las sobreescribe) y `deploy.sh` las lee. **Esas variables son la fuente durable:** hoy `AUTH_SERVER_FIRST_PARTY_ENABLED` y `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` están en `true`, así que el próximo deploy gobernado conserva el estado.
  - **Regla rota, ya conciliada:** la 00169 se creó con `gcloud run services update` manual, fuera del deploy gobernado. La configuración gobernada ya coincide con ese estado. No repetirlo: cambiar la variable de repo y desplegar por el workflow; si una emergencia obliga al update manual, conciliar la variable en el mismo paso y dejarlo en el ledger.
  - **El tráfico está fijado por revisión.** Una revisión nueva no recibe tráfico sola; moverlo (o hacer rollback a `auth-server-00168-vzb`) exige `gcloud run services update-traffic` explícito y readback.
  - El YAML remoto de `main`/`develop` aún es el anterior: el push de `develop` puede tocar el host real **sin pasar por promoción**. El guard visible en el workspace no lo protege hasta integrar las PR.
  - **Retención humana vigente:** PR #263 `main` HEAD `5e1fc2554` y PR #264 `develop` HEAD `aabd6d78d` siguen abiertas; sin merge, release #262 ni disable/enable de workflows. Liberar first-party y OTP para Rooms no levantó esa retención. Antes de una eventual integración de PR #264, evaluar los filtros gruesos `src/lib/**` de artifact/commercial/ico/ops; no se aplicó protección temporal.
  - Hacerlo sólo deliberadamente, con autorización explícita, y conciliar antes qué host sirve cada revisión.
- **El HMAC del OTP y el token de autoridad de Rooms sólo se requieren con el flag ON.** Hoy ambos flags están ON y los dos secretos montados en la 00169. `scripts/auth-server/rooms-config-drift.py` buscaba `ROOMS_INVITATION_AUTHORITY_TOKEN_REF` en lugar de `..._SECRET_REF` y con OTP ON siempre reportaba drift; el fix `51d9f3203` lo hace leer `SECRET_REFS` y agrega un test contra el workflow (contra la 00169 da `true`). El retiro declarativo en `deploy.sh` está corregido en PR; no asumir que el remoto ya lo incorpora.
- **Correo real de invitación:** el canary del 26-10 ya se recibió y no se repite por otro despliegue.
  - `email_type_config.auth_server_rooms_invitation_otp` está en `enabled=true` desde la activación del 2026-10-31.
  - Ningún cliente real sin una autorización nueva del operador y sin cerrar TASK-1833.
- **Segundo resource server = trabajo nuevo de EPIC-044.** El emisor tiene una sola audiencia y no hace canje. El carril de agentes de Rooms (ADR Accepted) necesita delegación interactiva para la audiencia Rooms (canje RFC 8693, claim `act`, autorización clase D10). TASK-1917 no la cubre: hace falta una task nueva, bloqueada por la retención de Efeonce ID.
- **El preflight de promoción se corre contra `target-branch=main`.** Contra `develop` devuelve «batch unknown» y no aprueba nada.
- **Readback de la revisión ACTIVA** (`gcloud run services describe auth-server`) después de cada deploy: `GIT_SHA`, flags y RP/origen. «Deploy verde» no es lo mismo que «flag aplicado».
- **Un preparativo no prueba una integración.** RP registrado, secretos v1 o health/JWKS en 200 no acreditan firma nueva, sesión ni entrega de correo. El canary Rooms del 26 de octubre sí acreditó Microsoft/MFA, OIDC, PNG privado y un correo recibido; ya se cerró, no se repite ni amplía por inferencia.
- **Issuer, consumer y derechos locales son autoridades separadas.** Los derechos guest adicionales de
  Rooms se conceden expresamente para su edición inicial; sus receipts/notas/sesiones/ACK no crean un
  principal interno, sesión issuer ni SSO. MCP stdio usa una sesión HTTP existente de Rooms y no inicia
  OAuth ni concede consentimiento MCP remoto. Un arnés con protocolo/store Auth reales no certifica
  `services/auth-server/server.ts` completo, dos productos RP, HTTPS, Microsoft/MFA o dispatch gateway.
- **Nueva UI en entorno aislado sigue autorizada.** La retención de las PR no bloquea diseño/desarrollo local. No autoriza publicación, activación ni aceptación visual de la nueva dirección.
- **El repo `greenhouse-eo` es PÚBLICO.** Los recibos con identificadores del operador viven fuera de git (`.auth/…`), nunca en `docs/`. Lo que ya se commiteó sigue en el historial.
- **Seguridad (TASK-1833):** hay evaluación propia y revisión entre agentes, **sin pentest completo**; la cobertura ofensiva quedó bloqueada. No declarar «pentest hecho».
- Paridad Full API: toda pantalla de Auth es cliente de un command o reader de `src/lib/auth-server/**`. Copy en `src/lib/copy/*`, tuteo es-CL.

## Contrato de mantenimiento de la skill

Cada task de Auth (EPIC-044 / 1833 / 1834 / 2063 / 2064 / 2067 y siguientes) **actualiza
`references/program-ledger.md` al cerrar o al detenerse**: qué quedó vivo, qué está OFF, qué falta y la
evidencia (revisión, SHA, run). Esta skill es byte-identical entre `.claude/skills/efeonce-auth` y
`.codex/skills/efeonce-auth`: editar una, copiar a la otra y correr `pnpm skills:mirrors`.
