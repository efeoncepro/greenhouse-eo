# Efeonce Auth — ledger del programa

> Estado vivo. La entrada más reciente va arriba. Cada hecho dice su fuente: `vivo` (readback),
> `doc` (lo afirma un documento) o `local` (check en el workspace).

## Corte 2026-10-25 ~22:55 UTC — Codex se queda sin uso

Fuente consolidada: [auditoría de estado](../../../../docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).

### Vivo

- **Emisor del MCP:** `mcp.efeonce.org` declara `authorization_servers: ["https://auth.efeonce.org"]` (`vivo`). Scopes publicados: `efeonce.mcp.read`, `efeonce.mcp.globe.read` y `efeonce.mcp.hiring.read`. Un solo servicio Cloud Run `auth-server` (`vivo`). En producción desde el 2026-09-04.

- **`auth-server-00166-p77`**: Ready, 100% del tráfico, `GIT_SHA=754a2a28…` (`vivo`).
  - Login V4 servido en `/login`.
  - `AUTH_SERVER_FIRST_PARTY_ENABLED=false`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED=false` y `EXTERNAL_IDENTITY_CANARY_ENABLED=false`.
  - Base ON: `AUTH_SERVER_ENABLED`, `OAUTH`, `PERSON_AUTH`, `INTERNAL_AUTH` e `INTERNAL_MULTI_ORG`.
- **Cloud aplicado** (`doc`):
  - Migraciones 1834 y 2067.
  - RP `efeonce-rp-rooms-production`, con callback `https://efeonce-rooms.vercel.app/auth/callback`.
  - Secretos HMAC OTP y client secret de Rooms en v1.
  - `email_type_config` del OTP en FALSE.
- **`ops-worker-00787-7fd`** todavía con `GROWTH_EVENT_EMAILS_ENABLED=true` (`vivo`). El `:-false` del `deploy.sh` espera un deploy del worker.

### Código

- `deae1ce15`: first-party (1834), Login V4 (2064) y OTP de invitación (2067).
- Fixes posteriores: `f3d3713c9`, `515ca529e`, `754a2a280` y `1859e90a6`. El runtime es idéntico entre 754 y 1859.

### Tasks

- **1834** (in-progress): falta la paridad ON/OFF del login Greenhouse/MCP y el gate 1833.
- **1833** (in-progress): evaluación propia hecha; cobertura ofensiva bloqueada; sin pentest completo.
- **2064** (in-progress): ya servido en `/login` (su `Status real` dice lo contrario). Falta el login real hacia Rooms y la fuente de novedades.
- **2067** (in-progress): faltan parity S2S, mailer/KMS/S2S integrados, consumo atómico en Rooms y canary.
- **2063** (to-do): convergencia Greenhouse, sin empezar.

### Secuencia pendiente

1. CI, build y smoke verdes sobre `1859e90a6` (PR #262 en draft, `UNSTABLE`).
2. Preflight con `target-branch=main`.
3. PR listo para revisión y promoción gobernada, con readback de `ops-worker` mostrando el correo de eventos OFF.
4. Secret refs y flags ON, deploy y readback.
5. `email_type_config` ON.
6. Un único canary con correo a `jreyes@efeoncepro.com`, replay, revocación y rollback (junto a Rooms, ver skill `efeonce-rooms`).

### Riesgos abiertos

- La vía de deploy en push a `develop` toca el único servicio, que es el login del MCP; el comentario del workflow dice «staging».
- `SENTRY_ENVIRONMENT=staging` y Resend con secreto `…-staging` en ese servicio.
- Login SQL con `CREATEROLE`/`CREATEDB`.
- KMS v1 lleva más de 51 días *retiring*.
- El runtime puede modificar `signing_keys`.
- Los recibos del operador siguen en el historial público.

### Lecciones

- Una ráfaga de pushes cancela el CI de los commits intermedios: `754a2a2` y `c6f145a` nunca se juzgaron. Leer el veredicto del SHA final, no el del anterior.
- Recibos de autoridad o identidad del operador: siempre fuera del árbol desde el primer día. Sacarlos después no los borra del historial.
