# Rooms B18 — invitado sin sesión interna ni SSO

Prueba local ejecutada el 28 de octubre de 2026. Resultado **PASS: 51 comprobaciones**, ESLint y
TypeScript PASS. [Recibo saneado](2026-10-28-b18-guest-without-internal-sso.json).
Runtime: `codex/rooms-design-integration@3b1b7b2`; issuer real de pruebas desde el candidato Auth
`codex/auth-focused-main-candidate@31ffef1d1`. No se modificó código Auth.

## Cambio y contrato

`scripts/invitation-ui-integration.ts` comprueba antes y después del OTP que el navegador guest no
posee la cookie del issuer ni `rooms_session_local`/`__Host-rooms_session`, y que `/api/auth/session`
responde 401. La solicitud de authorize usa PKCE S256, state/nonce nuevos y `prompt=none`:
respuesta 302 al callback registrado, error `login_required`, sin `code`, fragmento ni Set-Cookie.
El request context de Playwright comparte el cookie jar del navegador que completó la UI de OTP;
se detiene el redirect para inspeccionar la respuesta real, sin fabricar una transacción de login.

Después de OTP correcto hay `rooms_guest_local` HttpOnly y lectura de la edición; el código incorrecto
muestra error y la apertura/recarga no envía otro mensaje. Hay cuatro capturas privadas saneadas
(código vacío, URL limpia), axe sin violaciones, fuentes cargadas, sin overflow ni errores CSP/hidratación
observados. No se exportan cookies, códigos, tokens, destinatarios, buzón, trace ni video.

El modo nuevo `--guest-sso-only` limita la ejecución a esta prueba y omite gestión, cooldown, reemisión
y las demás variantes del arnés. Las aserciones B18 también corren en el arnés completo. No se repitió
la suite general porque sólo cambió el script de QA; no cambian rutas, DTO, permisos ni contrato Auth.

Se reafirma la separación existente de sesiones del [ADR de entrada y consentimiento](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md)
y del [ADR OTP](../../architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md); no nueva decisión de acceso.

## Reproducción y límites

1. Issuer en el checkout Auth del recibo: `python3 scripts/qa/verify-auth-first-party-local-pg.py --otp --serve --port 19336 --redirect-uri http://127.0.0.1:3210/auth/callback`.
2. Rooms con build local existente, PG local propio en 55432 y migraciones al día. Ejecutar desde un
   entorno de proceso con allowlist de tooling, sin credenciales cloud/provider ni variables Vercel.
3. `node --conditions=react-server --import tsx scripts/invitation-ui-integration.ts --issuer-fixture <ruta-absoluta-privada-del-issuer> --guest-sso-only`.
4. Terminar el issuer temporal y detener sólo el PG de Rooms arrancado para esta prueba.

Buzón exclusivamente en memoria y PG del issuer efímero; no Resend ni correo real. PG Rooms conserva
únicamente la sala sintética nueva de QA; el binding propio queda revocado al terminar. Next3210,
issuer19336 y PG55432 detenidos al cierre, puertos libres; la DB temporal Auth fue retirada.

La nueva UI de Claude Design sigue pendiente de entrega y aceptación. Estas capturas del scaffold
existente no acreditan aceptación visual ni integración de ese diseño. No se requiere ajuste Auth.
Sin push, merge, deploy, flags productivos ni nuevo canary.
