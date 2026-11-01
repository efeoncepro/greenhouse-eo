---
name: efeonce-auth
description: Operate and extend Efeonce Auth / Efeonce ID — the native OAuth/OIDC authorization server (`auth.efeonce.org`, Cloud Run `auth-server`, EPIC-044) in production since 2026-09-04 and ALREADY the sign-in issuer of the MCP gateway `mcp.efeonce.org` (scopes `efeonce.mcp.*`); Rooms is its first first-party relying party and the Greenhouse portal login converges later (TASK-2063). Use when touching `services/auth-server/**`, `src/lib/auth-server/**`, `scripts/auth-server/**`, first-party login (TASK-1834), Login V4 screens and product context `/login/rooms` (TASK-2064), invitation email OTP (TASK-2067), Greenhouse login convergence (TASK-2063), security review TASK-1833, RP registration, signing keys/KMS rotation, Auth flags (`AUTH_SERVER_FIRST_PARTY_ENABLED`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED`), the PR 262 release, or the Rooms+Auth canary. Living skill: read references/program-ledger.md first and update it at every Auth task closure.
---

# Efeonce Auth / Efeonce ID (skill viva)

**Corte vigente 2026-11-01:** la retención humana sobre Efeonce ID se levantó y Auth llegó a `main` con el
release `935583f88db0-544b3943-a041-4fe6-9e62-03aca45c6c8f` (`released`, orquestador run `41284120477`, squash PR #262).
Estado `vivo`:

- **Revisión:** `auth-server-00171-xdd` al 100 %, `GIT_SHA` `60872da` (hotfix PR #266 de ISSUE-190, release
  `60872da089ed-6925b98e…` `released`); antes `auth-server-00170-qlx` (`935583f88`).
- **Flags:** `AUTH_SERVER_FIRST_PARTY_ENABLED` y `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` ON. Su fuente durable son las
  variables de repo GitHub.
- **Login V4 con carrusel de novedades** en `/login` y en la entrada desde Rooms («Entra a Rooms»). El carrusel lee el feed
  público de Greenhouse (TASK-2064).
- **El tráfico va a la última revisión** desde el `update-traffic --to-latest` del 2026-11-01.
- **Rollback:** `gcloud run services update-traffic auth-server --region us-east4 --project efeonce-group
  --to-revisions=auth-server-00170-qlx=100`, con readback (deja el tráfico fijado: volver a `--to-latest` después).
- **PR #263/#264** (guard original de Codex) se cerraron el 2026-11-01, superadas por el release; las ramas se conservan.
- **Sin verificar:** errores de Sentry del release y un login humano completo hacia Rooms.
- **En `develop`, sin release a `main` (commit `e09d72d70`, 2026-11-01):** el trabajo de TASK-1833 que estaba varado en la rama
  local de Codex. Incluye revocación atómica de consentimiento y tokens, recuperación atómica, 413, OTP con fallo cerrado, Job
  aislado de rotación (migración sin aplicar; gate `AUTH_KEY_MAINTENANCE_PROVISIONED` ausente), retiro del trigger `push:main`
  y verificación post-deploy de la revisión activa. Nada de esto corre en producción hasta el próximo release.

Incidentes del release, ya resueltos: [ISSUE-184](../../../docs/issues/resolved/ISSUE-184-auth-deploy-guard-rejected-squash-releases.md)
(guard vs squash), [ISSUE-185](../../../docs/issues/resolved/ISSUE-185-auth-governed-deploy-revision-without-traffic.md)
(revisión sin tráfico) e [ISSUE-186](../../../docs/issues/resolved/ISSUE-186-growth-seo-tests-broke-at-etv-cutover.md)
(tests atados al corte ETV, bloqueo de CI). Historia anterior en el ledger, incluida la
[activación Rooms + Efeonce ID del 31-10](../../../docs/audits/rooms/2026-10-31-production-activation.md).
Pendiente de EPIC-044, TASK-2086 (`to-do`): delegación interactiva para un **segundo resource server** (audiencia Rooms, canje
RFC 8693), distinta de TASK-1917.

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
   - Release del 2026-11-01 (00170, carrusel, tráfico a la última revisión): ledger + ISSUE-184/185/186 en `docs/issues/resolved/`.
   - [`docs/audits/rooms/2026-10-31-production-activation.md`](../../../docs/audits/rooms/2026-10-31-production-activation.md): activación Rooms + Efeonce ID (00169, flags ON, variables durables); antecedente del corte vigente.
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
| Deploy | `.github/workflows/auth-server-deploy.yml`: sólo despliega SHAs publicados en `main` (push a `main`, `workflow_call` desde `production-release.yml` o dispatch productivo); exige una única revisión con 100 % del tráfico y que el commit servido sea ancestro del objetivo o, en un release por squash, de la coincidencia de árbol más antigua en `origin/develop`. Tests del guard: `scripts/auth-server/test_deploy_contract.py` |

Comandos útiles:
- `pnpm auth-server:dev-ui`: arnés visual con renderers reales y DTOs ficticios, sin auth ni comandos. Puerto por defecto 19036; se cambia con `AUTH_SERVER_DEV_UI_PORT`. Rutas: `/login`, `/login/rooms`, `/login/external`, `/magic-link/*`, `/invitation/*`, `/session/*`, `/error/*` y `/consent/multi-org-v2`.
- `pnpm auth-server:verify-contrast`, `pnpm auth-server:verify-passkey`.
- `pnpm auth-server:register-first-party-client`, `pnpm auth-server:rotate-key`, `pnpm auth-server:person-auth:canary`.

## Reglas duras

- **Hay UN solo servicio Cloud Run `auth-server`** y es el que atiende el login del MCP. Un deploy o
  flag roto deja sin login a todo cliente MCP, no sólo a Rooms. Probar siempre `/.well-known/*`, JWKS y
  `readyz` después de cada revisión.
- **Cambiar un flag de Auth es una mutación de PRODUCCIÓN.** Los flags viven en variables GitHub a nivel de repo (inputs de `auth-server-deploy.yml`; el environment `production` no las sobreescribe) y `deploy.sh` las lee. **Esas variables son la fuente durable:** hoy `AUTH_SERVER_FIRST_PARTY_ENABLED` y `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` están en `true`, así que el próximo deploy gobernado conserva el estado.
  - **Regla rota, ya conciliada:** la 00169 se creó el 2026-10-31 con `gcloud run services update` manual, fuera del deploy gobernado. No repetirlo: cambiar la variable de repo y desplegar por el workflow. Si una emergencia obliga al update manual, conciliar la variable en el mismo paso y dejarlo en el ledger.
  - **El tráfico enruta a la última revisión** desde el 2026-11-01. **Antes de cada dispatch**, leer `gcloud run services describe auth-server --region us-east4 --project efeonce-group --format='value(status.traffic)'`: si alguien lo fijó a una revisión (`--to-revisions` en un rollback o una activación manual), el deploy gobernado crea la revisión nueva con 0 % y el orquestador aborta ([ISSUE-185](../../../docs/issues/resolved/ISSUE-185-auth-governed-deploy-revision-without-traffic.md)). Tras un rollback deliberado, volver a `--to-latest` antes del próximo release, con readback.
  - **El guard de `auth-server-deploy.yml` ya está en `main`** y entiende los releases por squash ([ISSUE-184](../../../docs/issues/resolved/ISSUE-184-auth-deploy-guard-rejected-squash-releases.md)): acepta el commit servido si es ancestro del objetivo o de la coincidencia de árbol más antigua en `origin/develop`; rechaza un runtime servido más nuevo y el caso revert (árbol repetido). Un push a `develop` ya no despliega Auth.
  - Cambiar flags o mover tráfico sólo con autorización explícita, conciliando antes qué SHA sirve cada revisión.
- **El HMAC del OTP y el token de autoridad de Rooms sólo se requieren con el flag ON.** Hoy ambos flags están ON y los dos secretos montados (00170, igual que la 00169). `scripts/auth-server/rooms-config-drift.py` buscaba `ROOMS_INVITATION_AUTHORITY_TOKEN_REF` en lugar de `..._SECRET_REF` y con OTP ON siempre reportaba drift; el fix `51d9f3203` lo hace leer `SECRET_REFS` y agrega un test contra el workflow (contra la 00169 da `true`). El retiro declarativo de esos montajes con el flag OFF ya está en `main` con el release del 2026-11-01.
- **Correo real de invitación:** el canary del 26-10 ya se recibió y no se repite por otro despliegue.
  - `email_type_config.auth_server_rooms_invitation_otp` está en `enabled=true` desde la activación del 2026-10-31.
  - Ningún cliente real sin una autorización nueva del operador y sin cerrar TASK-1833.
- **Segundo resource server = trabajo nuevo de EPIC-044.** El emisor tiene una sola audiencia y no hace canje. El carril de agentes de Rooms (ADR Accepted) necesita delegación interactiva para la audiencia Rooms (canje RFC 8693, claim `act`, autorización clase D10). TASK-1917 no la cubre: hace falta una task nueva (aún sin crear; la retención que la bloqueaba se levantó el 2026-11-01).
- **El preflight de promoción se corre contra `target-branch=main`.** Contra `develop` devuelve «batch unknown» y no aprueba nada.
- **Readback de la revisión ACTIVA** (`gcloud run services describe auth-server`) después de cada deploy: `GIT_SHA`, flags y RP/origen. «Deploy verde» no es lo mismo que «flag aplicado».
- **Un preparativo no prueba una integración.** RP registrado, secretos v1 o health/JWKS en 200 no acreditan firma nueva, sesión ni entrega de correo. El canary Rooms del 26 de octubre sí acreditó Microsoft/MFA, OIDC, PNG privado y un correo recibido; ya se cerró, no se repite ni amplía por inferencia.
- **Issuer, consumer y derechos locales son autoridades separadas.** Los derechos guest adicionales de
  Rooms se conceden expresamente para su edición inicial; sus receipts/notas/sesiones/ACK no crean un
  principal interno, sesión issuer ni SSO. MCP stdio usa una sesión HTTP existente de Rooms y no inicia
  OAuth ni concede consentimiento MCP remoto. Un arnés con protocolo/store Auth reales no certifica
  `services/auth-server/server.ts` completo, dos productos RP, HTTPS, Microsoft/MFA o dispatch gateway.
- **Marca de Efeonce ID (aprobada 2026-11-01):** en la pantalla de entrada sólo van el favicon (`efeonce-id-isotype-small-*`) y la marca dentro del formulario (lockup `efeonce-id-lockup-*`, botón «Continuar con Efeonce ID»). Nunca el isotipo grande en el panel lateral: es del carrusel de novedades, que se conserva. Archivos sólo desde `@efeoncepro/axis-brand-assets` (≥ 0.4.31), nunca copias a mano. [ADR](../../../docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md). El favicon ya está en código (teja de `scripts/auth-server/efeonce-id-favicon.ts`, regenerar con `pnpm auth-server:brand-assets:generate`); lockup del formulario y botón, pendientes.
- **Una UI nueva se itera en el arnés local** (`pnpm auth-server:dev-ui`; `/login/public-feed-preview` dibuja el carrusel con el feed real de producción). Llegar a `auth.efeonce.org` exige release gobernado: no hay deploy de Auth fuera de `main`.
- **El repo `greenhouse-eo` es PÚBLICO.** Los recibos con identificadores del operador viven fuera de git (`.auth/…`), nunca en `docs/`. Lo que ya se commiteó sigue en el historial.
- **Seguridad (TASK-1833):** hay evaluación propia y revisión entre agentes, **sin pentest completo**; la cobertura ofensiva quedó bloqueada. No declarar «pentest hecho».
- Paridad Full API: toda pantalla de Auth es cliente de un command o reader de `src/lib/auth-server/**`. Copy en `src/lib/copy/*`, tuteo es-CL.

## Contrato de mantenimiento de la skill

Cada task de Auth (EPIC-044 / 1833 / 1834 / 2063 / 2064 / 2067 y siguientes) **actualiza
`references/program-ledger.md` al cerrar o al detenerse**: qué quedó vivo, qué está OFF, qué falta y la
evidencia (revisión, SHA, run). Esta skill es byte-identical entre `.claude/skills/efeonce-auth` y
`.codex/skills/efeonce-auth`: editar una, copiar a la otra y correr `pnpm skills:mirrors`.
