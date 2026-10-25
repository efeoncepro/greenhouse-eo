# Incidentes de Efeonce Auth y piloto Rooms

Dueño: Platform / Identity. TASK-1833. Procedimiento preparado2026-10-25; **simulacro masivo aún pendiente**.
No describe una incidencia real ni autoriza revocar a usuarios ajenos al alcance aprobado.
Contrato base: [auth-server](auth-server.md), [autoridad interna](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md),
[invitaciones Rooms](../../manual-de-uso/identity/operar-invitacion-rooms-email-otp.md).

## Identificar y contener

1. Registrar hora UTC, revisión/SHA servido, flags efectivos, alcance afectado y señal. Conservar sólo
   IDs opacos o agregados necesarios; nunca cookies, Authorization, OTP, fragmento de invitación ni cuerpos de correo.
2. Consultar `/healthz`, `/readyz`, metadata y JWKS públicos. Un200 no demuestra identidad o permisos.
   Leer el registry SQL y los eventos redactados del control plane antes de interpretar una ausencia.
3. Contener el carril afectado desde su configuración durable y release gobernado. Para invitaciones,
   desactivar OTP y su consumer en coordinación con Rooms; para first-party, coordinar el gate y las
   sesiones del RP. No apagar el maestro Auth para un incidente exclusivo de Rooms: también sirve MCP.
4. GateOFF impide nuevas operaciones pero **no revoca por sí solo todas las sesiones existentes**.
   Ejecutar la revocación canónica que corresponda y verificarla con una sesión previamente válida.

## Revocación por autoridad y sesión

| Alcance | Command y superficie verificada en código | Comprobación posterior |
|---|---|---|
| Invitación/guest Rooms | Commands de revocar invitación/grant en Rooms, dueño TASK-2066/2068 | Sesión guest previa deja de leer la sala; otra invitación válida conserva acceso; proof viejo no reabre acceso |
| Acceso externo de organización/persona/grant | `revokeExternalAccess`, `POST /api/admin/identity/external-access/revoke`; capability `identity.external_access.revoke`; scope binding/member/grant/invitation | Autoridad vigente rechazada con token aún no expirado; una organización no afectada sigue autorizada |
| Identidad corporativa | `revokeInternalNativeIdentity`, `POST /api/admin/identity/internal-access`, action revoke; capability `identity.internal_access.revoke`; dryRun disponible | Enrollment/source link/grants afectados revocados; un actor autorizado distinto sigue funcionando |
| Credenciales y sesiones de persona externa | `revokePersonAuthState`, `POST /api/admin/auth-server/persons/revoke`; capability `identity.auth_person.revoke` | Sesión/passkey/TOTP anteriores rechazados; **no sustituye revocar el binding/grant** para impedir nuevo ingreso |
| Consentimiento OAuth | `revokeClientConsent`, `POST /api/admin/auth-server/consents/revoke`; capability `identity.auth_consent.revoke` | Familia/consentimiento afectados revocados; otro cliente no afectado sigue funcionando |

No existe una prueba de cierre de revocación masiva global en este expediente. El ensayo pendiente usa
un inventario sintético acotado en PostgreSQL aislado, agrupa por autoridad, ejecuta los mismos commands,
repite cada operación para probar idempotencia y registra counts antes/después. No hacer UPDATE/DELETE
ad hoc ni inferir que una sola llamada revoca todos los productos. Logout multiproducto tiene dueño TASK-1840.

## JWKS o KMS no disponible

- JWKS: comparar los kids publicados con active/retiring del registry, condición Cloud Run, certificado y
  front door. No relajar verificación de firma ni aceptar llaves aportadas por el cliente.
- KMS: comprobar IAM y estado de la versión sin acceder a material privado. Fallos de firma no deben emitir
  tokens. No recrear una llave ante un error de permisos ni ampliar IAM globalmente.
- Un incidente de audit/SQL puede impedir registrar su propio evento. Contrastar señales SQL con HTTP5xx,
  readiness y logs redactados; ausencia de eventos no equivale a ausencia de fallo.
- Recuperar el componente y repetir un flujo con prueba positiva y negativa; conservar evidencia del fallo
  y recuperación. El rollback se hace con el release y su configuración completa, sin override local parcial.

## Llave o emisor comprometido

Coordinar revocación de autoridades/familias afectadas y rotación por el [runbook de llaves](auth-server-key-rotation.md).
La rotación ordinaria conserva la llave previa durante el solapamiento y **no es una revocación inmediata**.
Retirar antes del plazo, apagar el emisor o revocar todas las autoridades tiene alcance distinto al piloto;
requiere una decisión explícita de incidente con actores/sistemas afectados, no una prueba destructiva en producción.

## Cierre

Se cierra con causa, fix, reproducción y retest, revisión/SHA, configuración durable, pruebas positivas/negativas,
revocación observada, salud del carril no afectado y seguimiento. No declarar steady7d antes de siete días reales.
Los incidentes y su evidencia alimentan TASK-1833; la evaluación propia no es certificación de tercero.
