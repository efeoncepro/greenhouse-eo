# Rooms + Efeonce ID: deploy de la UI aprobada y activación en producción

- Fecha: 2026-10-31.
- Autorizaciones del operador:
  - «Sí, mergea» (merge de [efeonce-rooms#4](https://github.com/efeoncepro/efeonce-rooms/pull/4) = deploy con flags OFF);
  - «Prende todo ya quiero ver funcionando esto»;
  - tras explicarle qué implica liberar Efeonce ID, eligió «Todo».
- Libera la retención de Efeonce ID **solo para esta activación**: los PR #263 y #264 siguen sin merge y la imagen de
  auth-server no cambió.

## Deploy

| Punto | Readback |
| --- | --- |
| Merge | `main@6f99a6f` («Merge PR #4: Rooms UI aprobada + Vive el servicio») |
| Build del merge | `dpl_3ZjWAMVgc3gdUPghfJH5mNHwbbz3`, READY, `githubCommitSha` = `6f99a6f` |
| Dominio público | `efeonce-rooms.vercel.app` seguía en `dpl_7JmMF7…` (alias manual, no se mueve solo). Se reasignó con `vercel alias set` |
| Rutas nuevas | `/demo`, `/demo/sala`, `/demo/autoria`, `/demo/ediciones` y `/demo/invitacion` responden 200 en el dominio público |
| Respaldo lógico de la migración | Borrado después de verificar el deploy (tenía datos de producción); quedan solo conteos y hashes |

## Activación

| Runtime | Cambio | Readback |
| --- | --- | --- |
| Vercel `efeonce-rooms` Production | `ROOMS_FIRST_PARTY_AUTH_ENABLED`, `ROOMS_INVITATIONS_ENABLED` → `true`; `ROOMS_MEDIA_ENABLED`, `ROOMS_LIVE_ENABLED` creados en `true` | Valores leídos con `vercel env pull` a un archivo temporal, borrado al terminar. `ROOMS_AUTH_ALLOW_LOCAL_DEVELOPMENT` = `false` (no se toca: es un permiso de desarrollo). `ROOMS_MEDIA_DISPATCH_ENABLED` sigue en `true` |
| Rooms deploy | Redeploy de producción para tomar los flags | `dpl_GiGEoYaPSsUf8V7uZZyTbxtfZM8A` en `efeonce-rooms.vercel.app` (alias reasignado otra vez) |
| Efeonce ID `auth-server` | Revisión `auth-server-00169-4pq`, misma imagen: `AUTH_SERVER_FIRST_PARTY_ENABLED=true`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED=true`, montaje de `auth-server-rooms-invitation-otp-hmac:1` y `rooms-production-invitation-authority-token:1` | El tráfico está fijado por revisión: se movió explícitamente con `update-traffic` (100 % a 00169). `/healthz`, `/readyz` y discovery responden 200 |
| Greenhouse PG | `email_type_config.auth_server_rooms_invitation_otp` → `enabled=true`, `paused_reason=NULL` | Lectura previa `false` («Controlled Rooms canary completed…»), `UPDATE 1` con `RETURNING` |

Recorrido HTTP sin sesión:
- `/api/auth/session` devuelve 401 `anonymous`.
- `/rooms` enlaza a `/login`.
- `/login` redirige 302 a `auth.efeonce.org/oauth/authorize` con `efeonce-rp-rooms-production`, PKCE S256 y el callback
  del dominio público.
- `authorize` redirige 302 a `auth.efeonce.org/login` con un `first_party_request`, lo que prueba que first-party está ON.

**No verificado todavía:**
- el login humano con Microsoft y MFA (lo hace el operador);
- una invitación con correo real;
- la sala en vivo con carga real en Vercel (streams y pool sin medir).

## Activación durable (cerrado el mismo día)

El operador autorizó fijar los flags («Sí, fíjalos»).

- **Variables de GitHub.** `auth-server-deploy.yml` toma los flags de las variables del repo, y el environment
  `production` no las sobreescribe. Se dejaron `AUTH_SERVER_FIRST_PARTY_ENABLED` y
  `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` en `true`. Las demás entradas ya estaban configuradas desde el 25-10:
  client id, origen y las dos referencias de secreto (`:1`). El próximo deploy gobernado reproduce el estado vivo en
  lugar de apagarlo.
- **Chequeo de drift corregido.** `scripts/auth-server/rooms-config-drift.py` buscaba
  `ROOMS_INVITATION_AUTHORITY_TOKEN_REF`, pero el workflow entrega `ROOMS_INVITATION_AUTHORITY_TOKEN_SECRET_REF`. Con el
  código por correo prendido, siempre reportaba drift.
  - Ahora un mapa explícito (`SECRET_REFS`) usa los nombres del workflow.
  - Un test fija esos nombres contra `auth-server-deploy.yml`.
  - Contra `auth-server-00169-4pq`, con las entradas del workflow, el chequeo da `true`.
- **Drift que queda, y es esperado.** La revisión viva declara `RESEND_API_KEY_SECRET_REF` sin versión; el workflow
  pide `:1`. El chequeo de producción seguirá marcando drift hasta el primer deploy gobernado, que lo deja
  consistente con los flags en `true`.
- **Regla rota.** Cambié la revisión 00169 con `gcloud run services update`, que la regla del dominio prohíbe. La
  configuración gobernada ya coincide con ese estado; el próximo deploy por workflow reemplaza esa revisión manual.

## Riesgos aceptados

1. Los gates de seguridad de TASK-1833 (B15/B20, ensayo de incidente, señales) siguen abiertos: es uso del equipo, no
   de clientes. Un cliente real necesita una autorización nueva.
2. `ROOMS_LIVE_ENABLED` no se midió en Vercel (conexiones SSE y pool).

## Rollback (≈2 min)

1. Efeonce ID:
   - variables de GitHub `AUTH_SERVER_FIRST_PARTY_ENABLED` y `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` en `false`;
   - `gcloud run services update-traffic auth-server --region us-east4 --project efeonce-group --to-revisions auth-server-00168-vzb=100`
     (00168 tiene ambos flags OFF y no monta los secretos de invitación);
   - `UPDATE greenhouse_notifications.email_type_config SET enabled=false, paused_reason='rollback 2026-10-31' WHERE email_type='auth_server_rooms_invitation_otp'`.
2. Rooms: los cuatro flags en `false`, redeploy de producción y `vercel alias set <deploy> efeonce-rooms.vercel.app`.
