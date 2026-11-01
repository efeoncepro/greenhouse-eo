# Invitaciones Rooms: código y enlace en un solo correo

Estado al 26 de octubre: un canary cloud real con un correo recibido PASS y cerrado; first-party/OTP OFF. Canon: [decisión](../../architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md). Dueños: TASK-2067 Auth y TASK-2066 Rooms.

## Límite operativo vigente

El canary único ya comprobó Microsoft/MFA en el carril corporativo, OIDC y el recorrido invitado con PNG
privado; el OTP por correo no se convierte por ello en MFA. Invitación revocada, sala archivada y sesiones
cerradas. Auth `00168-vzb` al 100%, misma imagen, flags false, HMAC/authority ausentes, tipo de correo OFF;
Resend production v1 y Sentry production. **No repetir el envío ni activar este recorrido.**
PR #263/#264 de deploy siguen abiertas y retenidas. El YAML remoto aún conserva el riesgo develop/staging;
[runbook y corte de CI](../../operations/runbooks/auth-server.md#estado-operativo-y-retención--2026-10-26).
El recorrido siguiente describe el contrato para una futura activación autorizada, no una operación disponible hoy.

## Recorrido

1. Un operador autorizado crea la invitación en Rooms. Rooms conserva sala, destinatario, versión, vigencia y permiso.
2. El servidor de Rooms llama a `POST /auth/invitations/email-otp/prepare` con Basic del RP confidencial y referencias opacas. Auth consulta la autoridad canónica de Rooms por servicio autenticado.
3. Auth genera un código de seis dígitos y envía **un único correo** con enlace y código mediante Resend gobernado. No entrega el código a Rooms ni lo persiste en claro.
4. La persona abre `{RoomsOrigin}/invite#token=<opaque43>`. Rooms lee el fragmento en memoria, limpia la barra mediante history.replaceState y hace POST start con el token. La persona introduce el código **en Rooms**; abrir el enlace no envía otro correo. El bearer no viaja en path/query HTTP ni en Referrer y el código nunca va en la URL.
5. Rooms llama a `/auth/invitations/email-otp/verify` y consume el proof firmado una sola vez junto con la invitación vigente. La sesión guest queda limitada a esa sala. Este flujo no crea SSO global ni equivale a MFA.

El código vence a los diez minutos; los intentos y reenvíos tienen límites agregados. Un fallo o resultado desconocido del proveedor no permite repetir automáticamente un correo con secreto. `accepted` significa aceptación del despacho, no entrega o lectura.

## Configuración de runtime

| Variable | Propósito |
| --- | --- |
| `AUTH_SERVER_FIRST_PARTY_ENABLED` | Gate de fundamento, OFF por defecto |
| `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` | Gate independiente OTP, OFF por defecto |
| `AUTH_SERVER_INVITATION_EMAIL_OTP_CLIENT_ID` | Único RP Rooms autorizado |
| `AUTH_SERVER_INVITATION_EMAIL_OTP_ROOMS_ORIGIN` | Origen HTTPS exacto, configurado por servidor |
| `AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET` | Secreto dedicado de al menos 32 bytes; montar desde Secret Manager |
| `ROOMS_INVITATION_AUTHORITY_TOKEN` | Token dedicado base64url de servicio; separado del secret del RP |
| `RESEND_API_KEY` | Montaje existente de la key, no sólo referencia asíncrona |

Deploy recibe `AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET_REF` y `ROOMS_INVITATION_AUTHORITY_TOKEN_SECRET_REF` y monta sus valores. No imprimirlos ni ponerlos en Git. El bypass HTTP local exige flag local y entorno distinto de producción. El tipo `auth_server_rooms_invitation_otp` también requiere activación explícita del registro de correo después de verificar remitente y canary.

## Contrato con la autoridad

Auth llama exclusivamente a `POST {RoomsOrigin}/api/internal/auth/invitation-authority/resolve`, Bearer de servicio y `X-Efeonce-Audience: {RoomsOrigin}`. Cuerpo: `clientId`, `invitationId`, `invitationVersion`, `recipientReference`. Rooms verifica token, audiencia y path, y devuelve esas referencias más `active`, `email`, `invitationUrl`, `roomLabel`, `expiresAt` en milisegundos Unix. Sin caché positiva ni redirecciones; timeout tres segundos y máximo 8 KiB. Auth exige binding exacto y vigencia. El validador compartido de core/authority sólo acepta `{RoomsOrigin}/invite#token=<opaque43>`: origen exacto, pathname `/invite`, sin search ni userinfo, fragmento `^#token=[A-Za-z0-9_-]{43}$`. Rechaza queries incluso vacías, rutas alternas, parámetros adicionales, escapes y equivalentes normalizados. No acepta URLs libres aportadas por el browser.

Las rutas OTP admiten JSON únicamente desde el RP autenticado, sin cookies/Origin. `prepare` agrega `requestId` y `requesterKey` opacos; `verify` agrega `challengeId`, `code`, `nonce`, `requesterKey`. Nunca usar email o IP en claro como requesterKey.

## Verificación y rollback

Usar `bash scripts/auth-server/email-otp-local-smoke.sh`: cluster efímero, correo simulado y cleanup al terminar. La plantilla puede revisarse con `scripts/auth-server/email-otp-preview.tsx`, sin envío. El canary productivo ya completado no debe repetirse para validar otra versión local.

Para detener este carril: gate OTP OFF y tipo de correo deshabilitado; Rooms debe denegar nuevas sesiones y respetar revocación de invitaciones. Los demás métodos de Auth y el consentimiento MCP mantienen sus contratos. No borrar filas de identidad global para revocar una invitación.

## Integración entre runtimes sin correo externo

El harness separado de producción admite OTP con el mismo core, rutas, PostgreSQL y firma ES256 del contrato, sustituyendo únicamente la entrega por un buzón en memoria. Usar sólo destinatarios sintéticos `.test` o `.invalid`.

```sh
python3 scripts/qa/verify-auth-first-party-local-pg.py --otp-smoke
python3 scripts/qa/verify-auth-first-party-local-pg.py --serve --otp --port 19336 --redirect-uri http://127.0.0.1:19335/auth/callback
```

El primer comando verifica Auth contra una autoridad HTTP de prueba y termina limpiando el cluster. El segundo conserva el issuer en `127.0.0.1:19336` y consulta la autoridad real del servidor Rooms local en `127.0.0.1:19335`; no toca el harness OIDC de 19334.

La configuración temporal con permisos 0600 contiene el secreto del RP, `authorityToken` y `fixtureControlKey`; no copiar su contenido a logs, capturas ni documentación. El HMAC del código vive sólo en memoria. Configurar Rooms desde este archivo y conservar los mismos bindings y audiencias.

Para comprobar el correo simulado, usar POST a `fixtureDeliveriesEndpoint`, con Bearer `fixtureControlKey` y JSON `{}` o `{ "deliveryId": "<challengeId>" }`. Devuelve como máximo veinte entregas; POST a `fixtureClearDeliveriesEndpoint` limpia el buzón. Estos controles rechazan cookies y Origin; sólo existen en el script local, nunca en el servicio desplegable. Preparar o verificar desde las rutas normales no revela el código.

Detener el runner al terminar la integración: su bloque de limpieza detiene PostgreSQL y elimina configuración y datos temporales. No demuestra entrega Resend ni sustituye el canary autorizado del enlace recibido.

## Remitente del OTP y tracking

El tipo `auth_server_rooms_invitation_otp` usa exclusivamente `Efeonce <acceso@mail.efeoncepro.com>` en la
policy central `src/lib/email/delivery.ts`. No modifica `AGENCY_FROM_ADDRESS`, el remitente de otros tipos ni
las campañas. Readback GET Resend del 2026-10-25: dominio `mail.efeoncepro.com`, ID
`59ea58b3-cc1e-41e0-920e-85cbd53bd5c7`, verified/sending enabled, click_tracking=false, open_tracking=false,
tracking_subdomain=null. El dominio raíz `efeoncepro.com` conservaba ambos tracking=true; no se cambió.

Revalidar por GET el dominio exacto antes de cualquier futura entrega autorizada y confirmar el href recibido, conservando sólo resultado
sanitizado. La referencia oficial aplica tracking a todos los emails del dominio; la API Send Email y el SDK
local no exponen override por email. No añadir campos/headers inventados para simularlo. Fuentes:
[tracking](https://resend.com/docs/dashboard/domains/tracking) y
[Send Email](https://resend.com/docs/api-reference/emails/send-email), consultadas 2026-10-25.
