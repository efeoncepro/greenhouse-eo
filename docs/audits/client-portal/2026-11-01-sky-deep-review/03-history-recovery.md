# SKY — historia, periodos y recuperación (objetivo 3/6)

Fecha: 2026-11-01. Base leída: `985f84d3c3e4cc6730daced533085d431b8cf61f`; checkout compartido con cambios ajenos.
Revisión local de código y migraciones; sin ejecutar SQL, crons, CLI de materialización, APIs externas ni producción.
Las referencias `ruta:líneas` corresponden al checkout leído; una migración demuestra contrato versionado, no despliegue.

## Dictamen

La protección de la historia de Diseño **no queda demostrada** por conservar su Organization, facturas o Space.
Hay protecciones reales, pero son distintas: snapshot ICO `locked` reutilizable; transacción de reemplazo de atribución;
snapshot Insights sellado con trigger de inmutabilidad. Ninguna de ellas garantiza simultáneamente
identidad histórica, métricas, clasificación, visibilidad por departamento y recuperación de una corrida parcial.

La decisión necesaria antes de crear el Space SEO es **el contrato temporal de propiedad y cierre**:
los hechos previos al corte conservan su Space/Service original en la vista publicada; la clasificación retrospectiva,
si se necesita, crea una versión separada; la autoridad de lectura se evalúa con permisos actuales sobre ese alcance
histórico, nunca deduciendo que pertenecer hoy a SKY concede ambas cuentas. Debe acompañarse de un mecanismo verificable
que impida que la creación, el cierre de un servicio o un backfill sobrescriban la vista original.
Esto es necesario tanto para A′ como para B. La elección de puente no sustituye esa decisión.

## Evidencia y matriz temporal

| Objeto | Semántica implementada | Protección real | Lo que aún no demuestra |
|---|---|---|---|
| Proyección de proyecto Notion | Última asignación: el upsert por `notion_project_id` reemplaza `space_id`, `client_id`, `module_id` | Identidad estable del proyecto | No guarda intervalos de propiedad en ese upsert; cambiar el routing puede cambiar una reconstrucción posterior |
| Service | Estado actual con fechas de inicio/fin y `service_history` | Auditoría de cambios de campos del writer; baja registra historia | La atribución no reconstruye estado as-of usando esa historia |
| Snapshot mensual de tareas ICO | Copia población enriquecida del periodo, incluido Space/client | Corrida ordinaria reutiliza un periodo si encuentra cualquier fila `locked` | `freeze` fuerza reemplazo; no hay revisión histórica seleccionable en esa función |
| Métricas mensuales ICO | Tabla derivada del periodo, agrupada por Space | Si el input locked sobrevive, se reutiliza su clasificación | Siempre borra/reinserta el mes; `engine_version` identifica código, no conserva versiones de resultados |
| Performance Report mensual de agencia | Derivado recalculable por mes | Puede reconstruirse del input preservado | No es una edición Insights sellada; DELETE/INSERT separado |
| `service_attribution_facts` y `unresolved` | Resultado actual del cálculo para un mes, con Services hoy activos y bridges actuales | Reemplazo atómico de ambas tablas dentro de transacción PG | No hay versión as-of, cierre o guard de invariancia histórica en el materializador inspeccionado |
| Snapshot de evidencia Insights | Copia de facts/sources/rejections de una edición, sellada por hash | Upsert rechaza sellado; trigger impide UPDATE y DELETE | No preserva por sí solo los hechos upstream ni limita acceso entre dos cuentas de la misma org |
| Lectura de ICO agregado de Organization | Selecciona Spaces actualmente activos para cualquier periodo consultado | Read de Space filtra ID y periodo | Desactivar un Space puede ocultar su contribución histórica sin borrar ninguna fila |
| Acceso Insights | Organization actual + capability + audiencia + módulo vigente | Deniega org ajena/audiencia interna a cliente | El grant inspeccionado no contiene Space/Service; sello del contenido no es aislamiento entre departamentos |

Referencias por fila:

- Proyectos: `scripts/sync-source-runtime-projections.ts:1376–1395`.
- Service: `src/lib/services/service-store.ts:425–500,513–534`; atribución: `src/lib/service-attribution/materialize.ts:651–672`.
- Tareas: `src/lib/ico-engine/materialize.ts:81–103,105–176,498–509`.
- Métricas: `src/lib/ico-engine/materialize.ts:213–224,268–284`.
- Performance Report: `src/lib/ico-engine/materialize.ts:740–753`.
- Atribución: `src/lib/service-attribution/materialize.ts:840–856,1353–1364,1461–1467`.
- Insights: `src/lib/efeonce-insights/stores/snapshot-store.ts:50–115`; `migrations/20260915100154428_task-1845-insights-foundation.sql:438–464`.
- Reader agregado: `src/lib/account-360/organization-economics.ts:287–300`; reader individual: `src/lib/ico-engine/read-metrics.ts:313–332`.
- Acceso: `src/lib/efeonce-insights/authz.ts:73–108,120–147`; edition read: `src/lib/efeonce-insights/stores/edition-store.ts:181–194`.

## Rutas alcanzables y contraejemplos

### 1. ICO ordinario tiene una protección útil, pero no un cierre irreversible

El cron exige autenticación y procesa por defecto **solo el mes actual**. El override `monthsBack` permite hasta seis.
Esto reduce backfills accidentales; no equivale a bloqueo de meses cerrados
(`src/app/api/cron/ico-materialize/route.ts:27–51`).
Al recalcular, `materializeDeliveryTaskMonthlySnapshot` retorna sin borrar si existe alguna fila locked del periodo.
Después, `metric_snapshots_monthly` sí se reemplaza, utilizando el origen preferido del periodo.
Por tanto, mover un proyecto NO implica automáticamente alterar el task snapshot locked en un cron ordinario.

El contraejemplo concreto es el CLI `freeze-delivery-performance-period.ts:33–50`, o
`reconcile-delivery-performance-history.ts:39–44` → `historical-reconciliation.ts:346–356`:
ambos terminan en `freezeDeliveryTaskMonthlySnapshot`, que envía `force:true`.
Vuelve a capturar `v_tasks_enriched`, aunque el mes ya tuviera snapshot locked. No se encontró guard de cierre o
versionado en esa cadena; no es necesario inventar un writer SQL externo para llegar a la sustitución.
No se ejecutaron esos comandos, que cargan entorno real y perfil migrator.

La preferencia locked es **global al periodo**, no por Space: `shared.ts:191–229` usa un único COUNTIF.
Si una futura carga parcial mezcla Diseño locked y SEO working, solo se devuelve locked; no hay fallback por Space.
El writer actual crea el periodo completo, por lo que esa mezcla no se presenta como incidente existente:
es un caso obligatorio para cualquier implementación de freeze por cuenta.

### 2. Una baja actual de Service cambia el universo de un cálculo pasado

`deactivateService` registra `active=FALSE` y emite `service.deactivated` con `{serviceId}`
(`service-store.ts:513–534`). La proyección escucha ese evento; sin fecha explícita elige el mes actual
(`src/lib/sync/projections/service-attribution.ts:55–89,104–106,150–154`).
**No afirmar** que esa baja recalcula automáticamente todos los meses históricos: esa ruta no lo hace.
Sí deja preparado el contraejemplo: cualquier rerun posterior de un mes antiguo carga solo `s.active=TRUE`,
aunque las fechas del Service incluyeran ese mes. El historial de cambios no participa en `loadPeriodContext`.

Los eventos de ingreso/expense con `invoiceDate`/`documentDate` y otros payloads con periodo explícito pueden
dirigir la misma proyección a un mes pasado (`service-attribution.ts:55–70,92–103`).
La función `materializeAllAvailableServiceAttributionPeriods` itera todos los periodos encontrados
(`materialize.ts:1471–1496`); la búsqueda de callsites locales no encontró un consumidor externo a su definición.
Se registra como capacidad exportada, no como cron actualmente activo.

El updater ordinario de Service inspeccionado NO admite `spaceId` en su field map
(`service-store.ts:425–450`): no se atribuye a ese endpoint un movimiento que no implementa.
El riesgo de un futuro cambio de Space del Service proviene de que el materializador lee el bridge actual,
independientemente de cuál sea el writer autorizado que lo implemente.

### 3. Atomicidad, cola y conservación histórica son garantías diferentes

PG atribución: DELETE facts + DELETE unresolved + INSERT de todas las filas están en una transacción.
Si falla un INSERT y la transacción revierte, se conserva el set anterior completo. No existe ventana committed
de mes vacío por un fallo intermedio de esa transacción.
El alcance es **todo el mes, todas las organizaciones**, sin predicado SKY/Space. Un retry vuelve a cargar
contexto actual antes de transaccionar; no reproduce necesariamente el mismo resultado del intento previo.
La carga usa `Promise.all` antes de `db.transaction`, sin snapshot transaccional común entre inputs
(`materialize.ts:651–656,840–856,1351–1364`). No confundir atomicidad de salida con consistencia temporal de entradas.

La cola coalescea por `(projection_name,entity_type,entity_id)` y reclama con `FOR UPDATE SKIP LOCKED`
(`src/lib/sync/refresh-queue.ts:77–98,120–139`). Para la atribución, entity es `finance_period`.
Esto evita doble claim normal de la misma fila pendiente. No constituye un bloqueo dentro de la función
exportada frente a otro caller, ni congela la versión de los bridges entre lectura y escritura.
Una reproducción de concurrencia debe admitir que el resultado observable puede ser conflicto/rollback
o prevalencia de una corrida; no se declara un orden determinista sin probar el aislamiento/constraints locales.

ICO: DELETE e INSERT son llamadas independientes a `bigQuery.query`
(`materialize.ts:99–106,217–224,745–753`; `shared.ts:454–465`).
Un error entre ambas deja ausencia del periodo en la tabla afectada; la siguiente corrida reconstruye usando
el origen disponible entonces. Después de perder el task snapshot locked, puede ser el live actual.
Los guards de freshness y tracking del orquestador protegen otros rollups y auditan ejecuciones
(`materialize-orchestrator.ts:82–102,169–215`); no envuelven estos DELETE/INSERT iniciales ni versionan su historia.

### 4. El contenido sellado sí tiene una defensa más fuerte

Insights bloquea UPDATE después de sellar y DELETE por trigger en la migración; el store usa `FOR UPDATE`
al sellar y el command sella dentro de transacción (`snapshot-store.ts:87–115`; `commands/generation.ts:81–93`).
La corrección exigida por el trigger es otra edición. Esta protección merece conservarse y probarse localmente.
Sus `as_of_min/max` describen fechas de evidencia; no reconstruyen automáticamente relaciones históricas.
Reclasificar upstream no debe modificar una edición sellada existente ni concederla a los nuevos stakeholders SEO.

## Pruebas de integración local requeridas (no ejecutadas en esta auditoría)

Fixtures mínimas: una Organization SKY, Space D y sus proyectos/Service, mes P previo al corte;
un segundo cliente control C en P; Space S nuevo; actores Diseño-only, SEO-only e interno autorizado.
Usar PG efímero sin credenciales externas. Para BQ, harness aislado del adaptador con secuencia real SQL y fallos
inyectados; llamarlo prueba de contrato/integración del adaptador, no prueba del motor BigQuery.

| Caso | Entrada/acción | Esperado y evidencia |
|---|---|---|
| H1 | Capturar P locked de D; modificar routing live del proyecto a S; rerun ICO ordinario P | Input locked mantiene IDs/propiedad y resultados de D; comparar hashes de columnas históricas excluyendo timestamps de recomputación |
| H2 | Mismo setup; invocar freeze/reconcile por funciones reales | Caracterizar sustitución actual; implementación candidata debe rechazar re-freeze o crear revisión, nunca cambiar la versión original |
| H3 | Fallar INSERT después del DELETE del task snapshot y, por separado, de metric snapshot | Exhibir ausencia actual; recovery candidato vuelve al input/version anterior sin fallback live silencioso |
| H4 | Service D activo en P, baja después; rerun atribución P con control C | Caracterizar cambio actual; candidato conserva atribución as-recorded de D y filas C idénticas, incluso en retry |
| H5 | Inyectar fallo a mitad de INSERT facts/unresolved tras DELETE dentro de transacción | Rollback conserva ambas tablas completas; retry no duplica IDs; comparar D, S, C y sumas por source |
| H6 | Dos corridas del mismo mes; A lee bridge viejo, B nuevo; pausar A antes del commit | Detectar conflicto/resultado real; candidato serializa por periodo/versión y rechaza publicación obsoleta, con log de revisión |
| H7 | Crear mezcla locked D + working S en P; leer origen periodo | Caracterizar omisión de working actual; candidato prohíbe mezcla o selecciona versiones explícitas completas |
| H8 | Desactivar Space D después de P; consultar métricas individuales y Organization P | Exhibir divergencia del reader activo actual; candidato mantiene contribución histórica, sin revivir permisos de usuarios revocados |
| H9 | Sellar edición D; cambiar routing y otorgar SEO-only; intentar reescritura/read | UPDATE/DELETE rechazan por trigger; edición/hash/render originales intactos; acceso SEO-only denegado sin depender solo de org |
| H10 | `service.deactivated` sin fecha, luego evento con invoiceDate P; procesar cola | Primer evento apunta mes actual, segundo P; dedupe por periodo no pierde invalidación ni convierte retry en backfill indiscriminado |

## Rollback: prueba exigible por etapa

| Etapa | Recuperación preparada | Prueba para declarar recuperable |
|---|---|---|
| Antes del alta | Manifest local de IDs, routing, versiones, conteos, hashes e inventario de lectores | Comparar baseline D/C por objeto, no hash de un array inerte del prototipo |
| Schema/contratos aditivos | Mantener readers compatibles; deshabilitar writers nuevos sin borrar identidad | Revert de código lee estado previo y nuevas columnas sin cambiar hashes históricos |
| Space S creado, sin actividad | Detener onboarding/writers de S; preservar IDs y quitar exposición | No jobs pendientes que reescriban P; Design y permisos originales iguales; no usar baja de D como rollback |
| S ya tiene hechos | Pausar nueva ingestión; conservar S y sus hechos; reparar routing por versión | Cada source aparece una vez; hechos de S no se reasignan a D para hacer desaparecer la cuenta |
| Rebuild histórico iniciado | PG: rollback automático ante error; BQ: recuperar snapshot/version exportada antes de reintentar | Fallo inyectado a cada frontera demuestra qué tablas vuelven juntas; comparar también cliente control C |
| Edición ya sellada/emitida | Conservar original; retirada/corrección por edición nueva si procede | Hash y artefacto originales iguales; nueva edición referenciable; permisos actuales siguen validados |

Revertir Git no restaura las tablas reemplazadas. Una transacción de atribución tampoco restaura ICO ni Notion:
se necesitan barreras y manifiestos por etapa, no una promesa de rollback global inexistente.

## Alcance y decisión de continuación

No se verificaron snapshots existentes de SKY, triggers desplegados, permisos efectivos, flags de MERGE,
calendario real del cron ni configuración de aislamiento PG: no hay evidencia para declarar daño en producción.
Los casos anteriores son rutas de código concretas y pruebas propuestas, no una suite ya pasada.
Se aplicó la rúbrica Audit/Assurance de `software-architect-2026` y las invariantes Organization/Client Portal;
se contrastaron discovery 03 y revisión crítica del 01-11 con implementación actual.

El siguiente incremento debe probar H1–H10 sobre implementaciones reales con fixtures aislados, definir corte
y propiedad temporal, y demostrar que permisos actuales se intersectan con scope histórico. Hasta entonces,
ni A′ ni B justifican crear el segundo Space real afirmando que la historia de Diseño está protegida.
