# Acceso a productos con Efeonce ID

Estado: implementación local verificada; activación productiva pendiente. Rooms es el primer consumidor. Greenhouse mantiene su acceso actual hasta TASK-2063.

## Cuenta e invitación

Una persona con cuenta autorizada entra desde Rooms y se autentica en Efeonce ID. La pantalla compartida usa el login V4 renovado y muestra «Entra a Rooms» cuando el servidor reconoce el producto. La identidad no concede permisos por sí sola: Rooms resuelve el vínculo y los accesos vigentes a organizaciones y salas.

Sin organización autorizada se deniega el acceso; con una se continúa a ella; con varias se elige contexto. Los permisos de distintas organizaciones no se suman. Cerrar sesión en Rooms termina su sesión local, sin prometer cierre de todos los productos.

La invitación a una sala es otro recorrido: un único correo contiene enlace y código temporal. La persona abre el enlace y escribe el código en Rooms; abrirlo no genera un segundo correo. La sesión resultante sólo permite la sala invitada. No crea una cuenta global, permiso MCP ni segundo factor de autenticación. Este recorrido todavía requiere integración final TASK-2066 y canary antes de habilitarse.

## Límites actuales

Se verificaron localmente login OIDC, selección de contexto, separación de permisos, logout y revocación con ambas bases reales. No se desplegó este cambio ni se enviaron invitaciones reales. La pantalla usa la fotografía oficial de fallback; el feed de novedades sigue pendiente. No cambia el acceso actual de Greenhouse ni el consentimiento MCP.

## Referencias

- [Decisión y contrato](../../architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md).
- [Registrar un producto](../../manual-de-uso/identity/registrar-producto-first-party.md).
- [Operar invitaciones](../../manual-de-uso/identity/operar-invitacion-rooms-email-otp.md).
- [Evidencia y rollout](../../audits/identity/2026-10-25-auth-rooms-first-local.md).
