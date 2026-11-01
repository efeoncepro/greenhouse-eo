# Acceso a productos con Efeonce ID

Estado al 1 de noviembre: Efeonce ID en `main` (release `935583f88db0`), con acceso propio de Rooms (first-party) y código de invitación encendidos desde el 31 de octubre. Rooms es el primer consumidor. Greenhouse mantiene su acceso actual hasta TASK-2063.

## Cuenta e invitación

Una persona con cuenta autorizada entra desde Rooms y se autentica en Efeonce ID. La pantalla compartida usa el login V4 renovado y muestra «Entra a Rooms» cuando el servidor reconoce el producto. La identidad no concede permisos por sí sola: Rooms resuelve el vínculo y los accesos vigentes a organizaciones y salas.

Sin organización autorizada se deniega el acceso; con una se continúa a ella; con varias se elige contexto. Los permisos de distintas organizaciones no se suman. Cerrar sesión en Rooms termina su sesión local, sin prometer cierre de todos los productos.

La invitación a una sala es otro recorrido: un único correo contiene enlace y código temporal. La persona abre el enlace y escribe el código en Rooms; abrirlo no genera un segundo correo. La sesión resultante sólo permite la sala invitada. No crea una cuenta global, permiso MCP ni segundo factor de autenticación. Este recorrido pasó en el canary único del 26 de octubre y está encendido en producción desde el 31 de octubre; ningún cliente real entra sin una autorización nueva.

## Límites actuales

Además de la verificación local, el canary del 26 de octubre acreditó Microsoft/MFA, login OIDC y renovación SSO,
sesión guest de una sala sintética y lectura de un PNG privado, un correo recibido, replay y revocación.
Se cerraron sesiones y se retiraron invitación/sala de prueba. Desde el 1 de noviembre la pantalla muestra el carrusel
de novedades publicadas (con la fotografía oficial si el feed falla). Falta un login humano de punta a punta hacia Rooms
con esta versión y la revisión de seguridad completa (TASK-1833).
[Estado técnico y límites](../../operations/runbooks/auth-server.md#estado-operativo--2026-11-01). No cambia el acceso actual de Greenhouse ni el consentimiento MCP.

## Referencias

- [Decisión y contrato](../../architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md).
- [Registrar un producto](../../manual-de-uso/identity/registrar-producto-first-party.md).
- [Operar invitaciones](../../manual-de-uso/identity/operar-invitacion-rooms-email-otp.md).
- [Canary real cerrado](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md).
- [Evidencia local histórica](../../audits/identity/2026-10-25-auth-rooms-first-local.md).
