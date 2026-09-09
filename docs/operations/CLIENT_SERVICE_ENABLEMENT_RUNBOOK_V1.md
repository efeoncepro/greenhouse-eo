# Habilitación de servicios por organización

Dueño: Client Experience / Platform. TASK-1852, EPIC-046.

## Contrato y límites

La unidad es una organización canónica, una lista explícita de pares servicio/módulo y personas de
esa cuenta. La misma implementación sirve otras organizaciones; los nombres de Berel y Sky no forman
parte de sus reglas. Servicios y términos comerciales permanecen en sus dominios; los módulos y sus
transiciones conservan el catálogo, commands, auditoría y outbox del portal.

`preview` lee un snapshot PostgreSQL consistente, sin escrituras de negocio ni llamadas a proveedores.
`canApply` significa que las precondiciones de configuración pasan. **No certifica apertura operativa**:
login humano, rutas autenticadas, cobertura del productor y entrega/cadencia permanecen en `readiness`.
Los datos de preferencias ausentes no son consentimiento. Un canal configurado no demuestra entrega.

## Preparar y revisar

1. Resuelve IDs canónicos; no selecciones cuentas por coincidencia de nombre. Usa el manifiesto de la
   [primera cohorte](client-service-enablement/berel-sky.v1.json) como entrada de inventario, nunca como contrato.
2. Envía `organizationId`, `targets: [{serviceId, moduleKey}]` y `personIds` a
   `POST /api/platform/app/client-services/enablement/preview`. Para un servicio todavía ausente,
   `serviceId: null` permite documentar el bloqueo; no permite asignar.
3. Revisa `inventory`, `changes`, `people`, `routes`, `blockers` y `readiness`. Confirma el servicio vigente,
   un único término vigente que incluya el módulo, catálogo vigente, pertenencia y vetos por persona.
4. Conserva el JSON completo y su `fingerprint`. Un nuevo snapshot no sustituye la aprobación del anterior.
5. Antes de rollout, prueba las rutas con la persona autorizada, fuente/objeto y canal concretos. La
   convergencia de identidad consume TASK-1834; los destinos del catálogo consumen sus dueños (TASK-1687).

## CLI y API

La CLI usa HTTP y valida el mismo esquema; necesita una sesión app autenticada en la variable indicada,
sin tokens en argumentos, archivos de evidencia ni logs. `preview` es la operación predeterminada:

```sh
pnpm exec tsx scripts/client-portal/service-enablement.ts \
  --base-url https://greenhouse.efeoncepro.com --input preview-request.json \
  --output preview-result.json --token-env GREENHOUSE_APP_ACCESS_TOKEN
```

Para el lane ecosystem usa `--lane ecosystem`, token de consumer y ambos
`--external-scope-type` / `--external-scope-id`. Sólo el binding `internal` puede leer este inventario
administrativo. Una organización/space cliente no obtiene datos administrativos.

## Aplicar y compensar

El rollout requiere instrucción explícita del operador y verificación de las precondiciones de cada cuenta. El 2026-09-09 el operador autorizó el rollout de TASK-1852 y confirmó el alcance de la cohorte; esto no sustituye términos, pertenencia, login ni readiness.

`CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED` es `false` por defecto. La administración app revalida usuario
activo, estado activo, tenant interno, route group admin y capability de lectura; apply exige
`client_portal.module.enable:create`, rollback `client_portal.module.pause:update`. Sesiones `authMode=agent` no pueden aprobar writes en App/Nexa. El rol EFEONCE_ADMIN incluye compensación conforme al contrato canónico del portal; no se conceden nuevos roles a personas.
**La presencia de la capability en catálogo no garantiza su concesión**: certifícala para el operador
de alta y compensación antes de activar. TASK-1852 corrige la omisión de `module.pause:update` en el default de EFEONCE_ADMIN y prueba alta/compensación con el mismo rol. El rollout debe verificarlo en la sesión vigente.

- Apply: `POST .../apply` con `{proposal: <request revisado>, fingerprint, idempotencyKey}`.
- Compensación: `POST .../rollback` con `{organizationId, operationId, idempotencyKey}`.
- La CLI selecciona esas operaciones mediante `--operation apply|rollback`, con el mismo body en `--input`.
- Usa la misma clave y el mismo payload al reintentar tras una respuesta perdida. Un payload diferente
  con la misma clave produce conflicto; un preview desactualizado exige nueva lectura y revisión.
- Apply es atómico por organización. No hay atomicidad entre cuentas. No reanuda pausas existentes,
  cambia overrides ni toca identidades, contratos, preferencias, proveedores o mensajes.
- El recibo enumera altas propias y asignaciones conservadas. Queda en el command store y, cuando hay
  altas, en el audit inmutable de asignaciones, para sobrevivir la retención del transporte.
- Compensación sólo pausa altas propias que conserven su revisión. Si otra persona modificó una, rechaza
  todo el lote. No usa churn/expire para un rollback técnico ni cierra una fecha el mismo día.
- Después de compensar, relee estado/audit/outbox antes de apagar el flag. Apagarlo bloquea ambos writes.

## API/MCP/Nexa y autoridad

MCP interno: `preview_client_service_enablement`, `apply_client_service_enablement`,
`rollback_client_service_enablement`. El preview comparte semántica con API app y CLI.
Los comandos ecosystem/MCP devuelven `403 invalid_delegated_context`: su consumer acredita una máquina,
no la aprobación humana que exige `approved_by_user_id`. No se ha federado ninguna tool nueva.
La paridad de escritura delegada queda bloqueada hasta que exista autoridad atribuible, sin actor en el body.

Nexa registra las acciones de alta y compensación detrás del runtime existente y del flag de writes.
La propuesta prepara el input en servidor y lo valida antes de mostrarse; confirmación lo vuelve a validar
y reautoriza antes de replay. Se reutiliza la tarjeta existente; no cambia layout, tokens ni navegación.

## Verificación

Tests de dominio/autoridad/adapters y protocolo MCP están junto al código. La suite
`local-postgres.test.ts` exige `TASK1852_LOCAL_PG_SOCKET` terminado en `/.captures/task-1852/pg-socket`,
puerto 55452, database `task_1852_test` y conexión UNIX local. Usa el cliente DB canónico, fixtures
sintéticos y nunca carga `.env.local`. Prueba FK, aislamiento, concurrencia, atomicidad y compensación.
Primera preparación local (requiere PostgreSQL instalado, sin usar el servicio de Cloud SQL):

```sh
TASK1852_PG_BIN="$(brew --prefix postgresql@18)/bin"
mkdir -p .captures/task-1852/pg-socket
"$TASK1852_PG_BIN/initdb" -D .captures/task-1852/pg-data --auth=trust
"$TASK1852_PG_BIN/pg_ctl" -D .captures/task-1852/pg-data \
  -l .captures/task-1852/pg-server.log \
  -o "-k $PWD/.captures/task-1852/pg-socket -p 55452 -h ''" start
"$TASK1852_PG_BIN/createdb" -h "$PWD/.captures/task-1852/pg-socket" -p 55452 task_1852_test
TASK1852_LOCAL_PG_SOCKET="$PWD/.captures/task-1852/pg-socket" pnpm exec vitest run --project unit \
  src/lib/client-portal/enablement/local-postgres.test.ts
"$TASK1852_PG_BIN/pg_ctl" -D .captures/task-1852/pg-data stop
```

`initdb`/`createdb` se ejecutan una sola vez. Reusar únicamente este cluster técnico; la suite trunca
sus fixtures y exige socket privado, nombre de base exacto y `inet_server_addr() IS NULL`.
Sin esa variable queda omitida: **omisión no es evidencia de aprobación**. Para verificaciones contra el
PostgreSQL compartido usa el runner de sólo lectura o `pnpm test:live`, sin exportar toda `.env.local`.

Consulta la [auditoría de discovery](../audits/client-portal/TASK-1852_SERVICE_ENABLEMENT_DISCOVERY_2026-09-09.md)
y el registro de implementación de TASK-1852 para resultados y blockers fechados. Los códigos 409 separan `service_enablement_preview_stale`, `service_enablement_blocked`,
`service_enablement_compensation_conflict`, `service_enablement_concurrent_change` e `idempotency_conflict`: nuevo preview, resolver datos, revisar cambios posteriores, retry con la misma clave y corregir el reuse, respectivamente.

Código local no demuestra
deploy, asignación o entrega a un cliente.
