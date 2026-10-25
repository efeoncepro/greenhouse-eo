# TASK-2069 — plan propuesto de cloud runtime y piloto Rooms

Fecha: 2026-10-25. Estado: plan de implementación autorizado por goal humano y confirmación de infraestructura/piloto
verificada en peer Auth. ADR aceptado para adapter y validación; gates de provisioning/activación pendientes. Raíz posee índices,
registro de tasks, Handoff y coordinación de release. Este plan no es un recibo cloud.

## Baseline y decisión

[Task](../in-progress/TASK-2069-rooms-cloud-runtime-controlled-pilot.md) y
[ADR propuesto](../../architecture/rooms/EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md).
Runtime Rooms acepta sólo DB local; pool6/isolate, Functions gru1, config auth/invitations síncrona por env.
Precedente Greenhouse permite WIF/Connector, pero no transferir sus permisos ni inferir capacidad libre.
Raíz aportó readback cloud: RUNNABLE POSTGRES_16/us-east4/db-custom-1-3840/ZONAL, backup/PITR activos,
authorizedNetworks0, ENCRYPTED_ONLY y connectorEnforcement NOT_REQUIRED. Monitoring24h num_backends:
288 puntos, suma de máximos por serie/5min conservadora, pico42 y último36 a
2026-10-25T22:05:04.256081Z, sin paginación. SQL READ ONLY posterior confirma100máximas/3superuser reservadas/0reservadas/10actuales,
PostgreSQL16.14;97utilizables confirmadas. Propuesta de canary: CONNECTION LIMIT8 runtime/1 migrator; pool2/isolate.
RP coordinado `efeonce-rp-rooms-production`; origin inicial `https://efeonce-rooms.vercel.app`.

## Fase 1 — decisión y presupuesto, owner Platform

ADR aceptado para implementación. WIF poolrooms-vercel/providerproduction aislado, condición subject+project_id+owner_id+environment exactos; no ampliar providerGreenhouse.

- Readback redactado de engine/tier/región, conexiones actuales/picos y consumidores, backup/PITR,
  mantenimiento y coste. No tratar inventario histórico como medición actual.
- Elegir instancia candidata existente o reabrir decisión dedicada si no pasa capacidad/aislamiento.
- Medir ruta de Functions propuesta iad1 y comparar con gru1; registrar región elegida.
- Comprobar límites SQL actuales y reserva operativa antes de aplicar CONNECTION LIMIT8 runtime/1 migrator;
  no cambiar límites globales ni roles vecinos. Definir alertas y validar presupuesto durante canary.
  Pool2/isolate no es límite global: multiplicar por concurrencia real y probar rechazo seguro.
- Aceptar ADR antes del cambio irreversible; registrar autorización efectiva para recursos y coste.

## Fase 2 — adapter y validación aislada, owner Rooms

- Perfil cloud explícito con Connector/WIF server-only; conservar perfil local sin fallback cruzado.
- Secret refs de los seis nombres del ADR, versiones explícitas, resolución efectiva/cache acotada;
  rechazar configuración incompleta antes de construir servicios. No imports del runtime Greenhouse.
- Production no usa .local, ADC humano o SA JSON. Separar runtime/migrator; excluir secretos/tooling del bundle.
- Pool máximo2, timeouts y session idle del servidor; cierre/reset de conexiones stale sin retry de negocio
  después de BEGIN/callback ejecutado o COMMIT incierto.
- Validar migraciones/transacciones/readers en PostgreSQL16 si readback confirma ese target; local18 no basta.
- Negativas: origin/realm incorrectos, refs ausentes, WIF ajeno/preview, DB equivocada, rol amplio y fallo de red.

## Fase 3 — recursos y recuperación, owner Platform con QA independiente

- Crear únicamente DB/schema/roles autorizados. Runtime y migrator sin privilegios de administración
  global ni memberships Greenhouse; owner sólo migrator. Revocar PUBLIC en nuevos recursos.
- SA runtime dedicada, WIF sujeto Rooms/Production y accesos por secreto; sin SA key. Migración vía
  carril administrativo/Connector o Auth Proxy autorizado, nunca credencial migrator en Vercel.
- Aplicar migraciones existentes sobre DB nueva con flags OFF, readback ACL/constraints/triggers y
  negativa de DDL runtime/acceso a datos vecinos. Revisar CONNECT/PUBLIC sin afectar otros productos.
- Snapshot/restore en clon desechable, comparar19 tablas/hashes y semántica; rollback de migraciones sólo
  clon. Verificar recuperación de claves cifrado y datos sin exponer valores. Registrar RPO/RTO medidos
  y objetivos aceptados, sin prometerlos antes de medir.

## Fase 4 — integración gobernada, owners Auth y Rooms

- Auth registra RP confidencial y capabilityOTP; redirect exacto al callback del origin acordado.
- Resolver authority fijo del ADR, audience exacta y token dedicado compartido únicamente con issuer;
  comprobar permiso y consumo, no sólo existencia del secreto. Sin cookies/Origin/redirects en S2S.
- Bootstrap mínimo autorizado de principal/membership/grants/binding; no importar fixtures sintéticas
  como usuarios reales ni provisionar por email-match. Guardar IDs técnicos y procedencia de autorización.
- Mantener auth/invitations OFF durante preparación. Verificar desplegado sin secretos y observabilidad.
- Aplicar perímetro según [owner WAF](../../operations/ROOMS_VERCEL_INVITATION_PERIMETER_V1.md),
  readback de reglas propias/429/recuperación y S2S sin challenge. No desactivar firewall global al revertir.

## Fase 5 — canary y activación, owners de release y operador

- Confirmar deployment SHA/ID, origin, versión de configuración, cohorte/destinatario y alcance autorizados.
- Habilitación temporal de flags necesaria para probar el canary; no afirmar que un flujo OFF prueba login.
- OIDC: 0/1/N contextos, binding explícito, logout/revoke, issuer outage y acceso cruzado denegado.
- Invitación: correo único enlace+código, GET sin envío, OTP correcto, límites/replay/version/expiry/revoke,
  lectura publicada de una sola sala, no workspace ni otra autoridad por coexistencia de cookies.
- Separar aceptación de proveedor, recepción del correo y acceso real. Ninguna de esas evidencias
  autoriza nuevos destinatarios. Verificar sender/tracking y limpieza de fragmento bajo TASK-2068/2067.
- Probar OFF y recuperación; registrar estado final y límites. Activación estable sólo tras gates PASS.

## Rollback y evidencia

Ante fallo: volver flags OFF, revocar únicamente sesiones/invitaciones/bindings del canary, conservar
auditoría y datos, restaurar deployment/config acordados. No down en DB viva, no retirar claves mientras
haya ciphertext dependiente, no rollback de issuer/MCP ajeno. Recovery de datos sólo mediante runbook
aprobado y restore probado; infraestructura nueva no se borra incidentalmente.

Guardar evidencia sanitizada en `docs/audits/rooms/`: configuración sin valores, IDs de recursos y
deployment, grants/denegaciones, métricas/coste, hashes del restore, casos allow/deny/fault y pendientes.
No logs de Authorization/Cookie, OTP, proof, URL/token ni cuerpos sensibles. Cerrar task sólo cuando
Status real y todos los criterios acreditados coincidan con el runtime; lo restante queda abierto con owner.
