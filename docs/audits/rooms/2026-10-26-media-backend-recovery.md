# Rooms — ensayo local de recuperación de media privada

Fecha: 2026-10-26. Dueño: backend QA de TASK-2070. Runtime:
`/Users/jreye/Documents/efeonce-rooms`, rama `task/2070-2071-private-media`, HEAD `7ca5fd3` más WIP local compartido. No se afirma un checkout limpio byte-exacto: el
worker se estaba implementando en paralelo; el delta cloud todavía no estaba integrado en estos resultados.
El diseño de Claude Design y la aceptación de UI conservan su carril separado.

## Alcance y método

Ejecutable: `scripts/media-recovery.ts` en el runtime (`pnpm media:recovery` una vez registrado por raíz).
No requiere ni abre navegador. Reutiliza HTTP/commands/media services/persistencia/storage reales,
con resolución de identidad sintética inyectada en un servidor HTTP loopback efímero. La CLI real
`scripts/rooms.ts` opera ese servidor por procesos hijos. Este seam prueba transporte y autoridad
persistida; no acredita OIDC, cookies reales, middleware Next, email ni canary cloud.
**El primer corte de CLI sólo usaba Bearer `ROOMS_ACCESS_TOKEN`, mientras `resolvePrincipal` productivo
resuelve cookie y no valida ese Bearer.** El delta de backend añadió `--session-file` con una sesión
cookie ya existente, privada y del origen exacto; eso no acredita obtenerla vía OIDC. Este ensayo
conserva tokens opacos sólo en el seam local, mediante un mapa de principales ya persistidos. Prueba
contrato/transporte de la CLI, no autenticación real ni obtención de sesión productiva. No se añade
OAuth ni aceptación de Bearer al runtime para hacer pasar el ensayo.

La fuente es la PG18 dedicada del runtime, `127.0.0.1:55432/rooms_local`, verificada por versión,
base y rol. Se lee con `pg_dump` sin reiniciarla ni ejecutar SQL de escritura en ella. El ensayo
restaura esa copia en un clúster PG18 efímero distinto, aplica las migraciones pendientes sólo allí,
con puerto dinámico y la misma identidad de
base `rooms_local`, conservando el guard de conexión del runtime. Los jobs pendientes copiados se
cancelan **sólo en el clon**, antes de producir fixtures propias; el worker no puede reclamar trabajos
de la base del operador. Nuevas organizaciones y marcas son sintéticas: Lumbre y Bruma.

Toda contraseña/tokens vive en memoria o archivo temporal `0600`; carpeta raíz `0700`. Los comandos
PG no incluyen contraseñas en argv. No se imprimen URLs de conexión, tokens, paths privados, bodies,
keys ni errores originales de PG/CLI. Al terminar se cierra HTTP/pools, se detiene el clúster y se
eliminan dump, storage, credenciales y entradas temporales. No hubo cloud, producción, correo,
activación de flags, push ni deploy.

## Baseline ejecutado

Comando: `node --conditions=react-server --import tsx scripts/media-recovery.ts`.

PASS con HEAD `7ca5fd3` y el nuevo ejecutable de QA, antes de introducir la negativa de corrupción y
antes del delta de storage cloud. El WIP del worker compartido impide atribuir el resultado exclusivamente
a los bytes del commit; el checkout completo debe pasar otra vez al conciliar los deltas:

- Dos organizaciones, dos marcas y seis salas: PNG, JPEG con EXIF y WebP estático por organización.
- `uploads.initiate → PUT → complete → worker → ready → attach → publish` por CLI/HTTP y servicio real.
- GET/HEAD/Range HTTP y descarga CLI de derivados; SHA/bytes exactos e output CLI privado.
- Assets ajenos y acceso cruzado de organizaciones rechazados en HTTP y CLI; original devuelve 404
  sin ETag; DTO de lector no contiene storage keys, generaciones, SHA ni paths.
- Dump/restauración de **25 tablas**: conteos y hashes de cada fila completos idénticos, no sólo conteos.
  Definiciones de constraints y ACL de tablas/secuencias idénticas.
- **18 objetos** propios (6 originales y 12 derivados): tamaño, SHA256 y modo `0600` conservados.
- **12 bindings** `edition_assets` conservan org/sala/edición/asset/rendition/generation/SHA exactos.
- Mutación de versión ready, rendition y edición publicada, y borrado de bindings: SQLSTATE `23514`.
  Insertar binding con edición de la otra organización: SQLSTATE `23503`.
- ACL efectiva del rol runtime restaurado: SELECT rendition permitido; UPDATE rendition y DELETE
  edition_assets denegados. El ensayo conserva las ACL copiadas; no inventa una configuración nueva.
- Down sobre el clon con V3 rechaza con `V3 data must be retained`, conservando fingerprint completo.
- Segundo clon con cinco migraciones base y ediciones V1/V2: aplicar media, down y re-up conserva
  contenido y hashes legacy; el ciclo up/down conserva el fingerprint completo de tablas previas.
- Se cambia el nombre de base activa y se reemplaza el storage **sólo dentro del clúster efímero**
  por las copias restauradas. Las seis salas vuelven a entregar bytes exactos por HTTP.
- Revocar el grant de cada sala impide nuevas peticiones condicionales/Range, sin ETag.

El backup de storage incluye únicamente los objetos de las fixtures creadas por esta ejecución.
El dump SQL incluye toda la copia local; no afirma recuperar archivos históricos externos a ese set.
La prueba acredita POSIX/ACL SQL local y generaciones lógicas de Rooms. IAM, bucket ACL y generaciones
físicas de GCS requieren su propia prueba y readback; este PASS no los acredita.

## Defecto descubierto y regresión

La prueba negativa adicional modifica un byte del derivado conservando longitud y solicita
GET/HEAD con `If-None-Match: *`. El baseline `7ca5fd3` devuelve 304 con hash/ETag anterior, porque
el transporte sólo valida `stat.size` y el servicio devuelve el SHA persistido sin verificar bytes.
El ensayo exige 503 y ausencia de ETag antes de cualquier respuesta condicional o body.

Resultado reproducido: `{"status":"failed","stage":"same-size-corruption","kind":"assertion"}`.
La corrección se coordinó con el dueño de storage: verificar SHA exacto en la apertura del objeto,
antes de HEAD/304/bytes, conservando el descriptor local y pin de generation en el adapter cloud.
El script queda con la negativa estricta: no se omite ni se rebaja para conservar un verde aparente.

## Delta integrado — PASS local

Se repitió el comando completo después de integrar storage local con apertura SHA verificada,
HTTP mediante handle y la migración `1793022282668_rooms-media-storage-generations.sql`, aplicada
**únicamente en el clon**. Resultado: `status=passed`, scope `local-PG18-disposable-clusters-only`.
HEAD seguía `7ca5fd3` con WIP compartido; no se atribuye este PASS al commit aislado.

El delta repitió todas las comprobaciones anteriores (25 tablas, 18 objetos, 12 bindings, seis salas)
y añadió:

- ACL de la base restaurada idéntica a la del clon de trabajo: PUBLIC sin CONNECT, roles runtime y
  migrador con CONNECT explícito; las ACL de tabla/secuencia siguen idénticas.
- Nueva columna de generación física: en una versión pendiente, `NULL → '1'` permitido;
  `'1' → '2'` y `'1' → NULL` rechazados con `23514`. Las transacciones se revierten; ninguna fixture
  local queda etiquetada como objeto cloud. Esto prueba el guard SQL, no una generación física GCS.
- El down que comprueba V3 apunta al archivo de media original, evitando confundirlo con el down de
  la migración nueva. Se ejecuta en transacción única y el fingerprint completo queda idéntico.
- El clon V1/V2 aplica las cinco migraciones base, luego media original up/down y finalmente todas
  las migraciones pendientes: contenido/hashes V1/V2 permanecen idénticos.
- Cambiar un byte sin cambiar tamaño devuelve **503 sin ETag** para GET/HEAD condicionales: el bug
  de 304 queda cubierto por la regresión. Después se restaura el objeto y se verifica revocación.
- Tras cambiar la base/storage activos a los restaurados, las seis salas entregan exactamente los
  bytes esperados. Sólo entonces se corrompe/revoca sobre la copia restaurada.

ESLint del script pasó. La evidencia es el resultado JSON sanitizado del ejecutable, con assertions
que hacen fallar el proceso ante cada divergencia. No se añadió un test espejo del propio script.
Ni este ensayo ni tests verdes cierran UI, GVC, aceptación humana, canary o rollout de TASK-2070/2071.


## Engine objetivo PG16 — ejecución desde cero

El modo `node --conditions=react-server --import tsx scripts/media-recovery.ts --pg16` selecciona
`/opt/homebrew/opt/postgresql@16/bin`. No lee ni exporta la fuente PG18: crea un clúster PG16 nuevo,
roles runtime/migrador privados y base `rooms_local` en puerto loopback dinámico. Aplica las siete
migraciones y verifica por SQL el major 16 y el conteo 7. Dump, restore y down/up se ejecutan con
herramientas PG16 sobre bases PG16. El modo por defecto conserva la copia de la fuente PG18.

Al actualizar el harness al endpoint real `uploads/:id/transfer`, el ensayo detectó un defecto nuevo
de la CLI: mezclar `Content-Type` y `content-type` duplicaba el MIME y el PUT recibía 415. El dueño
corrigió la composición con `Headers.set` y separó los headers del GET de descriptor de los headers
del archivo. La allowlist HTTP conservó su 415; no se relajó para hacer pasar el ensayo.

**Resultado final PG16: PASS.** Rama `task/2072-cloud-media-backend`, HEAD `7ca5fd3` con WIP backend
conciliado; no representa el commit aislado. Scope de salida:
`local-PG16-fresh-disposable-clusters-only`; engine `{postgresMajor:16,migrations:7,mode:"fresh"}`.
Las mismas metas que PG18 pasaron: 2 tenants, 6 salas publicadas PNG/JPEG/WebP, 25 tablas con
filas/hashes/constraints/ACL idénticos, 18 objetos SHA/tamaño/modo privados y 12 bindings de
generación; lectura de las seis salas desde la DB/storage restaurados con bytes exactos, V3 down
rechazado sin cambio, V1/V2 down/up y re-up de las siete migraciones íntegros, cambios prohibidos
sobre generación física SQL rechazados, original/cross-tenant denegados, corrupción de igual tamaño
503 sin ETag y revocación efectiva. ESLint del script y typecheck global pasaron en esta ejecución.
Todos los clústeres/archivos temporales se cerraron y eliminaron. No hay cloud ni autenticación OIDC
real acreditados por este ensayo. El modo PG18 anterior sigue disponible sin `--pg16`.
