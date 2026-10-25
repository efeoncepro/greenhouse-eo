# Efeonce Auth — código por correo para invitaciones de Rooms

> Status: Accepted — flujo autorizado por Julio y coordinado entre Auth y Rooms, 2026-10-25.
> Owner: TASK-2067 (issuer); TASK-2066 (invitación, correo contextual y sesión guest Rooms).
> Runtime: contrato de implementación; sin envíos ni rollout productivo acreditados.

## Decisión y frontera

La invitación inicial envía **un solo correo**: enlace a Rooms y código temporal de seis dígitos. La persona
abre Rooms e introduce allí el código. Abrir el enlace no dispara otro correo. Los dos elementos usan el mismo
canal; no se presenta como MFA. El token identifica una invitación, no una identidad global ni un grant MCP.

Auth genera, protege, entrega y verifica el código. Rooms posee invitación, destinatario autorizado, versión,
sala, caducidad, revocación y sesión guest limitada. TASK-2065 conserva OIDC para identidades previamente
ligadas; este método no crea sesión SSO, profile, source-link, membership ni rol. El callback OIDC no aprovisiona.

## Puertos y contrato S2S congelado

Todos los endpoints son POST JSON, autenticados por cliente confidencial first-party activo, permitidos
explícitamente para esta capability. No basta un client_id enviado en el cuerpo. El adapter de autenticación
reusa el registro de TASK-1834 y resuelve el cliente; el core recibe su identidad confiable. Rate limits y
canonical authority fallan cerrado. No existe endpoint público que reciba un email libre.

1. **prepare** recibe `invitationId`, `invitationVersion`, `recipientReference`, `requestId` y `requesterKey`
   (hash estable derivado por backend Rooms del actor/IP; nunca del browser sin normalizar). El cliente se
   deriva de autenticación. El issuer consulta `InvitationAuthority.resolve` con esos identificadores. El
   resultado debe estar activo, vigente y ser propiedad de ese RP; devuelve email y enlace Rooms canónicos,
   sólo para entrega. El enlace tiene exactamente la forma `{RoomsOrigin}/invite#token=<opaque43>`:
   origen configurado exacto, pathname `/invite`, search vacío, sin userinfo y fragmento que cumple
   `^#token=[A-Za-z0-9_-]{43}$`. Se rechazan query, rutas alternativas, campos adicionales, escapes y
   equivalentes normalizados. Core y authority HTTP comparten `email-otp/invitation-url.ts`.
   Rooms toma el token del fragmento en memoria, limpia la URL con history.replaceState y lo entrega al
   servidor mediante POST start. Así el bearer no entra en path/query de requests ni en Referrer; el código
   OTP nunca forma parte de la URL. El frontend Rooms es dueño de ese consumo y debe probarlo.
   Ningún cuerpo HTTP puede aportar URL, email, asunto o HTML arbitrarios.
2. Auth genera código aleatorio uniforme de seis dígitos, challenge ID y HMAC SHA-256 con secreto de servidor
   de al menos 32 bytes. El MAC liga challenge, cliente, invitación, versión y destinatario. Guarda sólo MAC;
   el código vive en memoria hasta el envío. El límite inicial es 10 minutos, acotado por expiry invitación.
3. `InvitationOtpMailer.send` recibe **sólo en proceso** `{ email, invitationUrl, roomLabel, code,
   expiresInMinutes, deliveryId }`. Su adapter usa `sendEmail`, Resend y template gobernado Rooms con
   `persistence.mode=token_sensitive`; `safeContext` sólo locale y tiempo. Código y URL/token jamás se guardan
   en ledger, retry payload, logs, audit, errores o artifacts. El resultado es `{status:'accepted'|'failed'}`;
   accepted significa aceptación del proveedor, no entrega ni lectura. El core retorna únicamente receipt
   sanitizado con challenge ID, expiry y status. Fallo/resultado incierto invalida el challenge; no se reenvía
   automáticamente un secreto ya usado ni se afirma entrega. Tests usan outbox falso en memoria.
4. **verify** recibe los mismos identificadores, `challengeId`, `code`, `nonce` aleatorio de transacción Rooms
   y `requesterKey`. Auth revalida estado/versión/expiry/destinatario mediante canonical authority antes de
   consumir. El compare y el incremento de intentos/consumo son atómicos. Un segundo request nunca recibe
   prueba del mismo código. Revalida autoridad nuevamente antes de firmar; cambios o fallos niegan emisión.
5. Devuelve `proof` firmado ES256 con `typ=rooms-invitation-proof+jwt`, `iss`, `aud=RP client_id`, `iat`,
   `exp` no mayor a 120 segundos ni expiry invitación, `jti` aleatorio, `invitationId`, `invitationVersion`,
   `recipientReference`, `nonce`, `amr=['email_otp']`. No incluye email, profile, roles, organización ni `gv`.
   El signer reutiliza el puerto KMS; no se introduce clave RSA/ES local de producción. Sólo respuesta S2S,
   jamás GET, query ni localStorage. No es un ID token OIDC ni access token de APIs.
6. Rooms valida firma/JWKS, typ, issuer, audience, tiempos, nonce y bindings exactos. En una transacción consume
   `jti` con UNIQUE, revalida/consume invitación/version y crea la sesión guest de esa sala. Relee vigencia de
   invitación y autoridad en cada uso según su canon. Revocar invitación bloquea la sesión. Nunca amplía permisos.

## Concurrencia, abuso y ciclo de vida

- Cooldown entre envíos: 60 segundos. Presupuesto inicial por hora: 3 envíos/invitación, 10/destinatario,
  50/requester, 500/RP. Presupuesto de verificación: 5 intentos/invitación por hora, compartido entre reenvíos
  y versiones; límites adicionales requester/RP. Los presupuestos no desaparecen al rotar challenge.
- `requestId` repetido para el mismo binding/generación devuelve el receipt existente y no vuelve a enviar.
  Tras rotación se rechaza el request anterior durante al menos 24 horas; después requiere una solicitud nueva. Una nueva
  solicitud autorizada rota código y challenge e invalida el anterior. Cambio de versión viene del command
  canónico de Rooms, no de la UI. Un recipient cambiado exige versión nueva.
- Estado `pending_delivery` no puede verificarse; sólo aceptación de mailer habilita `ready`. La actualización
  compara challenge ID, por lo que un envío tardío no reactiva una generación reemplazada o revocada.
- OTP consumido permanece consumido si falla firma o creación de sesión; la recuperación pide nueva emisión
  bajo los mismos límites. No se persiste proof/rawOTP para recuperación. Rooms maneja nonce y jti de un uso.
- Secreto ausente/corto: servicio no construye core. Rotación del secreto invalida challenges pendientes;
  el despliegue coordina una ventana de recuperación. No fallback al hash simple para espacio de seis dígitos.
- Stores serializan por invitación y buckets con orden estable. Persistencia propia en `greenhouse_auth`;
  no escribe tablas de Rooms ni identity. GC de estado efímero preserva retención auditada independiente.
- Auditoría usa reason codes, IDs técnicos y resultados; no código, mail, link, token o proof. Errores externos
  sanitizados: invalid_request, invalid_invitation, invalid_code, rate_limited, delivery_failed, unavailable.

## Implementación y gates

TASK-2067 entrega `src/lib/auth-server/email-otp/**`, stores memoria/PostgreSQL, migración aditiva y pruebas.
Auth root integra router, autenticación cliente, authority reader y signer; email adapter/template gobernados.
TASK-2066 implementa canonical resolver confiable y consumo de proof/sesión. Un mock no prueba esa integración.
La feature queda deshabilitada hasta adapters completos. No se aplica DB cloud ni se envían correos reales.

Tests exigibles: correo único/idempotencia; wrong code; replay/concurrencia; expiry; revocación/recipient/version;
cruce RP; nonce; rate-limit agregado; resend invalida anterior; delivery fallo; firma falla tras consume;
secreto fail-closed; formato exacto `/invite#token=<opaque43>`, query/path/fragment malformado y origen ajeno; SQL local aislado y consumo Rooms transaccional (dueño2066).

Alternativas rechazadas: magic link renombrado (no verifica código); cookie Auth desde Rooms (frontera host);
identidad global por email (aprovisionamiento implícito); OTP en HTTP prepare (exposición innecesaria);
JWT sin consumo jti en Rooms (replay); segundo correo al abrir (contradice flujo aprobado).
