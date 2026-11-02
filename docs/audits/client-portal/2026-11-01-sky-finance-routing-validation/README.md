# SKY — comparación local de Finance, routing e historia

## Resultado y recomendación

**Recomendar B como arquitectura objetivo:** una Organization y un cliente comercial/financiero SKY,
con Spaces distintos para Diseño y Blog SEO/AEO. El Space/Service explícito gobierna la operación y los
permisos. No crear un segundo cliente financiero ni mover la historia de Diseño.

La recomendación técnica queda sustentada; la aceptación del ADR y la apertura real siguen pendientes.
B **no está implementado como solución integral**. No se afirma que el runtime actual pueda habilitar dos
departamentos con seguridad. El [ADR](../../../architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md)
continúa Proposed. La siguiente etapa es implementar los contratos, no repetir el discovery general.

**204/204 pruebas PASS**, 7 archivos: 167 anteriores + 37 nuevas. Las nuevas son 20 Finance/historia PG
(10 por variante), 14 writer Notion PG (7 por variante) y 3 de orden de llamadas ICO con puerto SQL simulado.
Recibo por caso y hashes: [results.json](results.json). Ver [QA](QA.md).

## Por qué B

| Evidencia ejecutada | A′: cliente operativo distinto | B: mismo cliente, Space explícito |
| --- | --- | --- |
| Asignar gasto del owner comercial al servicio SEO | El trigger real rechaza la diferencia entre expense.client y Space.client | Crea, aprueba y materializa 120 CLP sintéticos en SEO |
| Mantener ingresos/costos bajo el owner | P&L consolidado correcto, pero la asignación explícita SEO anterior falla | P&L y asignación explícita compatibles |
| Cambiar el gasto al cliente SEO para evitar el rechazo | Divide P&L: owner margen 1320, SEO margen -120 | Un P&L, margen 1200 |
| Repartir 100 de costo laboral con ingresos Diseño 1000 / SEO 500 | El costo del owner queda 100 en Diseño, 0 en SEO | 66,67 Diseño / 33,33 SEO según regla vigente de proporción de ingresos |
| Permisos/contexto, incremento anterior | Separar client_id no aísla el listado org de Insights | Exige el mismo contrato de principal/grant/contexto |
| Writer Notion y reconstrucción histórica | Los riesgos de reasignación/replay persisten | Los riesgos de reasignación/replay persisten |

A′ **podría** resolver los casos financieros si se implementa normalización canónica en todos los lugares
que comparan, agrupan o ponderan por client. Esa normalización no existe en los componentes ejercitados.
La comparación mide A′ sobre los componentes actuales, no una implementación completa de esa normalización.
No se concluye que A′ sea imposible. Se recomienda B porque conserva la identidad comercial que ya existe
y evita añadir esa traducción sin obtener una ventaja equivalente de permisos.

El reparto laboral observado es una **estimación por ingresos**, no horas verificadas de cada departamento.
Elegir B no certifica por sí solo rentabilidad departamental: Finance debe conservar método/confianza y
exigir asignación explícita cuando el indicador prometa costo real por servicio.

## Qué se ejecutó realmente

### Finance y PostgreSQL

- `createExpenseServiceAllocation` y `approveExpenseServiceAllocation`, con el trigger y tabla de la
  migración TASK-815 copiados literalmente al cluster privado. Se comprueba también que un client explícito
  no salta el dueño del gasto y que se rechaza asignación a otra organización sin cambiar la fila original.
- `computeClientEconomicsSnapshots`: readiness, consultas, agregación, reader real de costos comerciales y
  persistencia. Los costos laborales son **no cero**; el caso falla si console.error delata un fallback
  silencioso. Las tablas de dependencias son fixtures mínimas, no una réplica del schema completo.
- `materializeServiceAttributionForPeriod`: selección por deals, costos, reparto laboral, consultas reales,
  transacción y escritura en las tablas originales de TASK-452. No se sustituye la lógica de atribución.

Fixture común: dos Spaces SKY y un cliente/control externo. Ingresos de noviembre 1500; gastos directos
200; costo laboral 100; margen comercial 1200, en CLP ficticios. Octubre contiene historia sintética
Diseño y control. SEO tiene fecha inicial 01-11; no se atribuye operación SEO a octubre.

### Historia y recuperación

1. Materializar noviembre deja **todos los campos persistidos de octubre** iguales, incluidos IDs y fechas.
2. Repetir el mismo input conserva hechos semánticos y no duplica fuentes. IDs/fechas de materialización
   del período recalculado se regeneran; no se confunde idempotencia semántica con inmutabilidad física.
3. Fallar el INSERT tras el DELETE mediante un trigger exclusivo del laboratorio revierte ambas purgas
   (facts y unresolved). Se comparan todas las filas/columnas anteriores; desactivar el fallo permite retry.
4. **Riesgo reproducido:** desactivar hoy el servicio Diseño y recalcular octubre convierte su ingreso
   histórico en unresolved. El materializador usa actividad actual. También reemplaza los IDs del cliente
   control del mismo período, aunque su importe quede igual: la operación es por período, no por SKY.

Por tanto, no usar reconstrucción histórica global como parte del alta SEO. Necesita contrato temporal,
revisión explícita de correcciones y límites por dueño antes de habilitarse. No se recalculó ningún dato real.

### Routing y writer Notion

Se ejecuta `projectNotionDeliveryToPostgres` contra PG, en la rama de proyectos. Telemetría reemplazada;
no hay lectura de Notion/BQ, ni se ejercitan los upserts de tareas/sprints. La limpieza de faltantes usa
sus tablas mínimas vacías y un proyecto SEO real dentro del cluster.

- Crear/reintentar un proyecto nuevo con Space SEO explícito conserva la fila Diseño completa.
- La limpieza con target SEO marca sólo su proyecto y conserva Diseño.
- **Riesgos reproducidos:** reutilizar el ID externo de Diseño permite cambiarlo a SEO; un evento antiguo
  sobrescribe contenido más reciente; `targetSpaceIds` limita la limpieza, pero no valida los writes entrantes.
- Un batch con proyecto válido e inválido persiste el válido y reporta un fallo. No es una transacción de batch;
  el orquestador debe revisar contadores/failureSamples antes de tratar una sincronización como completa.

Esto caracteriza al writer, no demuestra que cualquier ruta pública permita invocarlo sin controles previos.
El contrato requerido es binding estable fuente/objeto→Space/Service, verificación del destino, versión
monótona, conflictos observables y retry seguro. Crear un client adicional no aporta esas garantías.
Services/HubSpot conserva además la evidencia de replay y adaptación defectuosa de las 27 pruebas anteriores.

### ICO: límite de evidencia

Las tres pruebas ejecutan las funciones reales con el puerto de consultas reemplazado. **No ejecutan
BigQuery ni certifican su SQL, transacciones, datos o un ciclo mensual completo.**

- El camino mensual normal reutiliza un snapshot de tareas locked. La prueba se detiene deliberadamente
  al comenzar el refresh de métricas; ese refresh sigue siendo una escritura.
- `freezeDeliveryTaskMonthlySnapshot` fuerza DELETE e INSERT separados aun si ya había tareas locked.
  Las llamadas filtran período, no Space. Un fallo de INSERT se propaga después del DELETE sin llamada de
  restauración. Es evidencia del orden de llamadas, no un experimento de pérdida de datos en BigQuery.

No invocar freeze/rebuild históricos para crear SEO. La certificación del motor y recuperación queda para
la unidad de historia, en entorno autorizado separado.

## Siguiente implementación, acotada

| Orden | Dueño existente | Resultado que debe entregar |
| --- | --- | --- |
| 1 | Identity/Spaces, U01 | Contexto efectivo por request, grants vigentes, renovación/revocación; selector separado de autoridad; principal dual sin mezcla |
| 2 | Services/Source Sync, U02 | Bindings estables por objeto externo y Space/Service; conflictos, eventos antiguos y batches parciales tratados explícitamente |
| 3 | Finance/Delivery/ICO, U02F/U05 | Owner único, atribución explícita, vigencia temporal y protección de períodos/ediciones históricos; ningún rebuild global en provisioning |
| 4 | Readers/Insights, U04/U06/U07 | Consultas/cache por Space/Service; GA4, GSC y motor AEO limitados al Blog con denominadores y evidencia; distribución con destinatarios revalidados |
| 5 | Provisioning/QA, U03/U08/U09 | Alta hija idempotente sólo tras foundations; ensayo integral HTTP/UI/DB, concurrencia y recuperación; aprobación separada para apertura real |

El siguiente cambio concreto debe ser **U01: integrar contexto por Space en una ruta real local y su reader**,
con Diseño, SEO y usuario dual; sin crear cuentas reales. La medición interna del Blog puede continuar en
TASK-2033/1960 conforme al contrato candidato, sin esperar al alta departamental.

## Límites y seguridad del laboratorio

Mismo runner privado: entorno saneado, PG16 por socket UNIX, rol no superuser, red IP denegada,
sin lectura de .env/credenciales, cleanup del directorio propio. No se importaron filas de SKY ni se tocó
producción, staging compartido, perfiles reales, fuentes de Diseño, snapshots, envíos o corridas pagadas.

No cubre concurrencia de allocations/refresh, atomicidad de lectura previa+write, autoridad HTTP/UI,
emisor externo, todas las tablas/migraciones, cola/outbox real, workers distribuidos, entrega o rollback
productivo. Una prueba de caracterización verde reproduce una limitación; no significa que se haya corregido.
Los recibos anteriores permanecen intactos. TASK-2094 sigue in-progress por el criterio integral pendiente,
con recomendación B explícita y sin presentar la batería de 59 escenarios del discovery como ejecutada.
