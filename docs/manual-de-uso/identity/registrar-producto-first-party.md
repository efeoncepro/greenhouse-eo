# Registrar un producto en Efeonce Auth

Estado al 26 de octubre: RP Rooms productivo ya registrado y probado en un canary único cerrado; first-party OFF.
No volver a registrar ni rotar su secreto para repetir la prueba. Nuevos RPs requieren autorización propia.
Decisión: [Rooms primero](../../architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md).

## Qué registra

Un cliente confidencial first-party tiene ID `efeonce-rp-*`, producto allowlisted, redirects exactos, estado
y política de frescura de sesión. El operador requiere `identity.auth_client.register`. Registrar no concede
salas, organizaciones, roles ni grants MCP. El callback de Rooms resuelve un binding previamente autorizado.

## Estado y límite actual

El registro existente no equivale a acceso habilitado. Auth quedó `00168-vzb` al 100%, first-party/OTP OFF,
sin montajes OTP/authority; el canary Microsoft/MFA+PNG+correo recibido ya pasó y no se repite.
Las PR #263/#264 siguen abiertas, con integración retenida. Consultar [runbook](../../operations/runbooks/auth-server.md#estado-operativo-y-retención--2026-10-26)
y cliente/redirect/secreto efectivos antes de cualquier cambio autorizado; el ejemplo siguiente no es un
comando para rehacer Rooms ni declara que el dominio ilustrativo sea el callback actualmente registrado.

## Preparación

Primero revisar task, migración, runtime y autorización del entorno. Cloud SQL es compartido; no ejecutar
el registro sobre esa base por creer que un proxy localhost representa desarrollo aislado. La CLI utiliza
el perfil `ops` ya gobernado. Guardar el secreto fuera del repositorio versionado y transferirlo al destino
aprobado por el carril de secretos antes de activar el producto.

Ejemplo ilustrativo para entorno autorizado, sin ejecutarlo automáticamente:

```sh
pnpm auth-server:register-first-party-client -- \
  --client-id efeonce-rp-rooms-production \
  --product rooms \
  --redirect https://rooms.efeonce.org/auth/callback \
  --secret-out /ruta/privada/nueva/rooms-client-secret
```

El archivo debe ser nuevo; se crea con modo `0600` antes de registrar y nunca se imprime el secreto.
Un registro idéntico no rota ni vuelve a entregar el secreto. Una diferencia de policy exige revisión,
no un overwrite silencioso. `--local-development` sólo permite callbacks HTTP loopback exactos para pruebas.
`--session-max-age` configura frescura entre 60 y 86400 segundos; no cambia la vida del token de cinco minutos.

## API administrativa

`POST /api/admin/auth-server/first-party-clients` usa el mismo command y guard administrativo. El actor sale
de la sesión autorizada; JSON no puede declarar actor, scopes MCP ni branding arbitrario. El secreto se
devuelve una vez con `Cache-Control: no-store`; no guardar respuestas completas en auditorías o capturas.

## Validación y rollback

Antes de habilitar el flag: verificar migración, issuer, cliente, audiencia y redirect reales; probar sesión,
callback y revocación con una identidad autorizada. Verificar que el producto revalida introspección y permisos.
Los tokens first-party no sirven en MCP. La demo Rooms, un HTTP 200 o un registro creado no acreditan login.

Apagar el flag first-party debe negar ese carril conservando OAuth MCP. Retirar un registro o secreto exige
la operación gobernada correspondiente y evidencia de sesiones afectadas; no editar filas a mano.
El logout de un producto no cierra todas las sesiones de Efeonce ID; esa capacidad pertenece a TASK-1840.
