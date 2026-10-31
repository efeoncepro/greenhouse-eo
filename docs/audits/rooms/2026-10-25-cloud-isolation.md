# TASK-2069 — lectura independiente de aislamiento cloud

Fecha de observación SQL: **2026-10-25T22:26:58.167Z**. Estado: lectura de metadatos completada;
aislamiento de datos confirmado dentro del alcance inspeccionado, **sin aislamiento total entre bases**.

## Alcance y método

Instancia `efeonce-group:us-east4:greenhouse-pg-dev`, PostgreSQL16. Se utilizó ADC del operador únicamente
para Secret Manager y Cloud SQL Connector; todas las conexiones SQL utilizaron `rooms_runtime` y el
password de su versión1, mantenido en memoria. No se imprimieron ni escribieron secretos.

La sesión se identificó como `rooms_runtime` en `rooms_production`. Se consultaron `pg_database`,
`pg_namespace`, `pg_class` y `pg_proc`, junto con `has_database_privilege`, `has_schema_privilege`,
`has_table_privilege` y `has_function_privilege`, dentro de transacciones `READ ONLY`.

Se comprobó además una conexión real a `greenhouse_app`; dentro de ella se inspeccionaron únicamente
catálogos. **Cero filas de negocio consultadas, cero escrituras y ningún cambio de permisos vecinos.**
No hubo prueba de carga ni creación de tablas temporales.

## Resultado observado

| Base                       | CONNECT efectivo | CREATE schema | TEMP efectivo |
| -------------------------- | ---------------- | ------------- | ------------- |
| `rooms_production`         | Sí               | No            | No            |
| `greenhouse_app`           | Sí               | No            | Sí            |
| `postgres`                 | Sí               | No            | Sí            |
| `cloudsqladmin`            | Sí               | No            | Sí            |
| `marketing_studio`         | No               | No            | No            |
| `marketing_studio_staging` | No               | No            | No            |

La evaluación de CONNECT para `postgres` y `cloudsqladmin` procede de catálogo: no se abrió una sesión
en esas bases. No se inspeccionaron tablas de Studio.

| Schema dentro de `greenhouse_app` | USAGE | CREATE | Relaciones inspeccionadas | SELECT / INSERT / UPDATE / DELETE / TRUNCATE |
| --------------------------------- | ----- | ------ | ------------------------- | -------------------------------------------- |
| `greenhouse_auth`                 | No    | No     | 26                        | 0 / 0 / 0 / 0 / 0                            |
| `greenhouse_core`                 | No    | No     | 124                       | 0 / 0 / 0 / 0 / 0                            |
| `public`                          | Sí    | No     | No se enumeraron tablas   | No evaluado                                  |

Funciones `SECURITY DEFINER` invocables por el rol, intersectando USAGE del schema y EXECUTE de la
función: **0** en cada uno de `public`, `greenhouse_auth` y `greenhouse_core`.

Estos resultados prueban ausencia de los permisos de tabla enumerados en esos dos schemas al instante
observado. No constituyen una revisión exhaustiva de todos los schemas, privilegios de columna,
extensiones, objetos ni rutas de la instancia.

## Riesgo residual CONNECT / TEMP y PUBLIC

La separación de datos no elimina el acceso de conexión ni el permiso para crear objetos temporales en
bases vecinas. Estos permisos efectivos son compatibles con las ACL `PUBLIC` preexistentes de la
instancia; esta corrida midió el permiso efectivo y **no enumeró los grantors de `datacl`**. La atribución
exacta por ACL debe distinguirse del resultado efectivo confirmado.

PostgreSQL no aplica un DENY específico al rol: mientras un permiso esté concedido a `PUBLIC`, hacer
`REVOKE CONNECT` o `REVOKE TEMP` únicamente a `rooms_runtime` no lo elimina. Corregir la exposición
requiere revisar ACL de las bases vecinas con sus dueños y dependencias, o evaluar una instancia
dedicada. Ninguna de esas acciones se ejecutó ni queda autorizada por esta auditoría.

El límite de ocho conexiones del rol, verificado por el bootstrap de infraestructura, acota conexiones
concurrentes del rol; no elimina el permiso TEMP ni reserva CPU, memoria o disco para cada producto.
Una instancia compartida conserva riesgo de consumo de recursos y recuperación común. Esta evidencia
no certifica aislamiento operativo total, ausencia de impacto en vecinos, WIF desde Vercel ni el canary
OIDC/OTP. Esos gates continúan separados en el
[ADR del piloto](../../architecture/rooms/EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md).

## Reproducción controlada

Auditor persistido: [audit-cloud-isolation.ts](../../../scripts/rooms/audit-cloud-isolation.ts).
Desde la raíz de `greenhouse-eo`, cuando corresponda una nueva verificación autorizada:

```sh
GOOGLE_APPLICATION_CREDENTIALS_JSON='' \
GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64='' \
GCP_AUTH_PREFERENCE=ambient_adc \
node --conditions=react-server --import tsx scripts/rooms/audit-cloud-isolation.ts
```

Las variables vacías sólo afectan ese proceso. Son necesarias porque el helper compartido puede
seleccionar la credencial JSON heredada aun con preferencia `ambient_adc`; los intentos anteriores
fallaron con403 al acceder al secreto, antes de conectar a SQL. No se cambiaron IAM, credenciales
globales ni archivos de entorno para resolverlo. El auditor exige explícitamente esta configuración.

El comando no acepta target, SQL ni rol arbitrarios: fija la instancia, el secreto versionado y las dos
bases a las que puede abrir conexión. La salida sólo contiene metadatos y booleanos; los errores se
reducen a una fase sin payload del proveedor. CONNECT se enumera para las bases no-template que
aceptan conexiones, pero sólo `rooms_production` y `greenhouse_app` pueden recibir una sesión SQL.

La observación anterior procede del runner temporal `/tmp/rooms-crossdb-metadata-audit.mts`. El auditor
persistido conserva esas consultas, añade tipos, imports relativos y preflight ADC explícito. **No se
repitió una consulta cloud para documentar o tipar el runner.** El estado observado conserva su fecha;
una modificación de ACL posterior requiere nueva evidencia.

## Referencias

- [TASK-2069](../../tasks/in-progress/TASK-2069-rooms-cloud-runtime-controlled-pilot.md).
- [ADR cloud Rooms](../../architecture/rooms/EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md).
- [Modelo de acceso PostgreSQL](../../architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md).
- [Bootstrap de base y roles](../../../scripts/rooms/provision-cloud-database.ts): evidencia de ACL y negativos propios, distinta de esta lectura cross-DB.
