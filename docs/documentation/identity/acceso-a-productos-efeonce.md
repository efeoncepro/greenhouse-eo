# Acceso a productos con Efeonce ID

Estado al 1 de noviembre: Efeonce ID en `main` (release `935583f88db0`), con acceso propio de Rooms (first-party) y código de invitación encendidos desde el 31 de octubre. Rooms es el primer consumidor. Greenhouse mantiene su acceso actual hasta TASK-2063.

## Cuenta e invitación

Una persona con cuenta autorizada entra desde Rooms y se autentica en Efeonce ID. La pantalla compartida usa el login V4 renovado y muestra «Entra a Rooms» cuando el servidor reconoce el producto. La identidad no concede permisos por sí sola: Rooms resuelve el vínculo y los accesos vigentes a organizaciones y salas.

Sin organización autorizada se deniega el acceso; con una se continúa a ella; con varias se elige contexto. Los permisos de distintas organizaciones no se suman. Cerrar sesión en Rooms termina su sesión local, sin prometer cierre de todos los productos.

La invitación a una sala es otro recorrido: un único correo contiene enlace y código temporal. La persona abre el enlace y escribe el código en Rooms; abrirlo no genera un segundo correo. La sesión resultante sólo permite la sala invitada. No crea una cuenta global, permiso MCP ni segundo factor de autenticación. Este recorrido pasó en el canary único del 26 de octubre y está encendido en producción desde el 31 de octubre; ningún cliente real entra sin una autorización nueva.

## El botón «Continuar con Efeonce ID»

Definido el 2 de noviembre; **todavía no está en ningún producto**. Es la forma única con la que Rooms, Studio,
Greenhouse o cualquier otra aplicación ofrecen entrar con Efeonce ID, como un «Pagar con…»: el texto «Continuar con»
seguido del logo «Efeonce | ID». Sólo la esfera va en verde.

- **Cómo se ve:** sello oscuro con texto blanco sobre fondos claros; botón blanco con texto azul oscuro y borde sobre
  fondos oscuros o fotos. Tamaño normal de 52 px; también grande (56 px), compacto (40 px, sólo el logo, que el lector
  de pantalla anuncia como «Continuar con Efeonce ID»), de ancho completo y sólo el símbolo.
- **Qué le pasa al tocarlo:** al pasar el cursor se ilumina en verde azulado; con el teclado muestra un anillo de foco.
  Mientras conecta, la órbita gira y dice «Conectando…» (quieta si la persona pidió menos movimiento). Al conectar, la
  esfera completa la vuelta. Si falla, vuelve a su estado normal con el aviso «No pudimos conectar. Inténtalo de
  nuevo.». También puede verse deshabilitado.
- **Cuándo va:** donde una aplicación ya le ofrece a la persona una acción para entrar con Efeonce ID.
- **Cuándo no va:** nunca como pantalla intermedia antes de mandar a Efeonce ID cuando la persona entra a una ruta
  protegida: ahí la aplicación redirige directo, sin botón ([entrada de las aplicaciones](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md),
  D2 y D9). Tampoco como una opción más en una lista de proveedores.
- **Lo que no se hace con la marca:** poner el monograma antes del texto (se leería «ID Continuar con Efeonce ID»),
  meterla en una teja o usar la órbita sola como símbolo (a ese tamaño parece el ícono de recargar).

Falta construirlo como componente compartido de AXIS y adoptarlo en cada producto. Detalle: [ADR de la marca de
Efeonce ID](../../architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md#el-botón-continuar-con-efeonce-id-aprobado-2026-11-02).

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
