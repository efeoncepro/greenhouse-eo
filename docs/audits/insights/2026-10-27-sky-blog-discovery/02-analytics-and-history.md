# Discovery SKY blog-only · Analítica, lectores e histórico

Fecha de validación: 2026-10-27. Autoría: subagente `analytics_readers`. Estado: **discovery**, sin implementación.
Este anexo desarrolla datos, semántica y pruebas; el anexo de contrato URL decide la representación persistida.

**Corrección explícita del operador incorporada:** el primer informe aceptable exige **GA4 + GSC + corridas AEO
reales del motor propio**. Una entrega sólo GSC o GA4 opcional queda fuera del encargo. Las visitas desde asistentes
medidas por GA4 son evidencia adicional de tráfico: nunca sustituyen una corrida AEO del motor. Esta regla
reemplaza la propuesta anterior de empezar con GSC-only.

## 1. Conclusión y niveles de necesidad

El recorte de SKY debe resolver un host, no una carpeta: `blog.skyairline.com`. Hay evidencia del blog en GSC y
GA4, pero los readers de Insights no comparten todavía un selector capaz de exigir ese host. Ampliar el filtro
sin revisar la semántica de las sesiones podría aislar las páginas correctas y aun así afirmar una adquisición
que no se midió. Además, la historia GSC de SKY **no está poblada en BigQuery** en el rango comprobado.

Estas tres capas deben seguir siendo independientes:

| Capa | Necesario para | Salida y condición |
| --- | --- | --- |
| A. Host obligatorio, preservado y sellado | Cualquier informe que se llame «Blog SKY» | Ninguna fuente aplicable puede medir toda la propiedad por fallback. No depende de tener meses históricos. |
| B. Fuentes obligatorias y calidad de cada cifra | GA4, GSC y corrida AEO nativa desde el primer informe | Las tres tienen receipt válido; los límites de métricas concretas no permiten omitir la fuente. Ningún total se fabrica sumando desgloses. |
| C. Historia y controles de cobertura | Informe mensual completo, deltas, recuperación y estacionalidad | Poblar el período y conectar lectores; si falta, emitir sólo una ventana acotada con sus límites mediante el flujo autorizado de Insights. |

La primera salida aceptable incluye las tres fuentes requeridas, con identidad, alcance y temporalidad
verificables. Puede usar un período acotado si las tres lo soportan y no se presenta como un mes completo. Una vista
previa con una fuente ausente sirve para diagnóstico, pero no satisface la aceptación del encargo ni se convierte
en informe completo mediante `allowPartial`. Las limitaciones de métricas concretas se declaran sin eliminar la
fuente requerida. No se exige crear una exportación GA4 a BigQuery si Data API permite acreditar las métricas
necesarias; sí se exige resolver su semántica y controles antes de aceptar el primer informe.

## 2. Evidencia observada y sus límites

### 2.1 Estado comprobado previamente en esta misma sesión

El recibo `.captures/insights-sky-scope-2026-10-27/readback.json`, fechado `2026-10-27T14:08:26.104Z`, contiene
lecturas SELECT canónicas: alcance SKY `null`; GSC activo `https://blog.skyairline.com/`; GA4 activo en DB
`354430952`; target `seot-sky-blog-cl` con `root_domain=skyairline.com` y mercado Chile/español.

La tabla operativa GSC contiene 149.831 filas, 1.511 páginas y 15 fechas del **11 al 25 de octubre**. Todas las URL
observadas en ese corte pertenecen al blog. Septiembre no tiene filas PG. Esto acredita aislamiento de las filas
observadas; no acredita completitud del dato de Google ni cobertura de un mes entero.

Las consultas previas encontraron seis ediciones, todas sólo `ico`, y ningún schedule de SKY. El histórico de
rankings PG está vacío para sus targets. La cola acumulada reúne 2.400 ítems con URL del blog y 2.291 sin URL;
son ítems de **todos** sus snapshots, no el backlog vigente. La cola se lee por snapshot vigente, no sumándolos.

### 2.2 Nueva comprobación de BigQuery, sólo lectura

Se utilizó `getBigQueryClient` de `src/lib/bigquery.ts:18` y metadata de tabla, seguido de un dry-run y una consulta
con `maximumBytesBilled=52428800` (50 MiB), proyecto obtenido del resolver canónico, ubicación `US` y parámetros
DATE tipados. No se ejecutó backfill ni MERGE ni snapshot.

| Control | Resultado |
| --- | --- |
| Tabla | `greenhouse_growth_analytics.seo_gsc_history` existe. |
| Metadata global | 7.437.364 filas, 1.444.642.570 bytes; son todas las organizaciones. |
| Partición | Diaria sobre `capture_date`. |
| Clustering | `organization_id`, `query`. |
| Organización | SKY, `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`. |
| Rango consultado | `[2025-06-27, 2026-10-27)`. |
| Dry-run | `totalBytesProcessed=0`, por debajo del techo. |
| Resultado | `first_day=null`, `last_day=null`, `days=0`. |

Consulta agregada, sin extraer contenido sensible:

```sql
SELECT MIN(capture_date) AS first_day,
       MAX(capture_date) AS last_day,
       COUNT(DISTINCT capture_date) AS days
FROM `<proyecto-canónico>.greenhouse_growth_analytics.seo_gsc_history`
WHERE organization_id = @org
  AND capture_date >= @from
  AND capture_date < @to
```

Recibo y fuente reproducible: `.captures/insights-sky-scope-2026-10-27/bq-discovery.json` y `bq-discovery.ts`.
El resultado prueba ausencia en esa tabla/rango/organización; no prueba ausencia de datos en Google, exportaciones
locales, otras tablas o sistemas. Tampoco diagnostica por qué no se ha espejado allí la serie operativa de SKY.

**Consecuencia:** conectar el lector histórico no traerá por sí solo septiembre o el año anterior; SKY necesita
captura histórica autorizada **y** consumo del histórico. La propiedad actual del blog y la antigua propiedad
`www` siguen siendo identidades distintas; no cambiar la conexión actual para simular acceso al pasado.

## 3. GA4: recorrido real y defectos relevantes

| Tramo | Evidencia en código | Efecto |
| --- | --- | --- |
| Reader GA4 | `analytics-ga4/reader.ts:11–30` | Sólo declara rutas de entrada; no tiene hostname, pagePath ni selector de semántica. |
| Construcción del filtro | `reader.ts:41–56`, `94–108` | Un OR de reglas de landing; si no hay reglas, consulta sin recorte. |
| Helper Insights | `adapters/ga4-site-facts.ts:86–93` | Consulta canal+fuente/medio; recibe sólo reglas de landing. |
| Organic Search | `ga4-site-facts.ts:134–158` | Suma sesiones e interacción del desglose por canal/fuente. |
| Asistentes IA | `ga4-site-facts.ts:166–203`; `aeo-adapter.ts:221–223` | El adapter AEO llama al helper sin alcance, aun cuando SEO tuviera uno. |
| Metadata de respuesta | `growth/ga4/api-client.ts:106–118`; `reader.ts:111–130` | Los tipos/resultados públicos sólo transportan filas y rowCount; no conservan metadata ni total de control. |
| Calidad declarada | `ga4-site-facts.ts:111–131` | Siempre declara coverage `complete`, sin evaluar sampling, thresholding u otras limitaciones. |
| Efecto lateral del reader | `reader.ts:85–87`, `134–135` | Puede marcar la conexión revoked al fallar. No se usó para este discovery. |

Rutas del cuadro relativas a `src/lib/`; no son cambios realizados. La prueba GA4 del 15-10 ya confirmó sesiones
con actividad en el host, pero esa lectura histórica no reemplaza una prueba actual de la nueva consulta.

### 3.1 Las poblaciones que el contrato debe distinguir

1. **Actividad en el blog:** sesiones que registraron actividad en páginas del host, aunque la entrada de la sesión
   haya sido en otra parte de SKY.
2. **Entrada en el blog:** sesiones cuyo primer pageview de la sesión fue una URL del host permitido.
3. **Consumo por página:** vistas o sesiones con actividad en una página concreta; las sesiones de varias páginas
   no son aditivas.
4. **Adquisición orgánica:** subpoblación de la entrada anterior cuyo canal de sesión es Organic Search. Incluye
   buscadores que no son Google, por lo que no equivale a clics GSC.
5. **Tráfico desde asistentes:** subpoblación identificada por el canal/fuente de GA4, con el mismo alcance de host;
   tampoco equivale a presencia de marca en respuestas IA.

La sesión es una unidad que puede atravesar varios hosts. Un filtro `host_activity` selecciona sesiones que
tocaron el blog; no promete que toda su actividad ocurrió allí. Del mismo modo, `engagedSessions` es una
clasificación de la sesión y no demuestra interacción exclusivamente dentro del blog. Si se conserva esa métrica,
nombrarla «sesiones con actividad en el blog clasificadas con interacción por GA4», o una redacción equivalente
que no localice una interacción que no se aisló. Para la primera salida puede omitirse el engagement; no hace
falta crear una métrica nueva de duración local para cumplir el recorte URL.

`hostName` identifica el host de la URL. `landingPagePlusQueryString` identifica la ruta y query del primer pageview,
pero no contiene el host. Google distingue sesiones que visitaron una ruta de sesiones que empezaron allí, y
advierte que sumar filas por página duplica sesiones. De ello se infiere que filtrar un host de eventos junto con
una ruta de landing no demuestra, por sí solo, que el host de **esa landing** sea el autorizado. Esta distinción
es especialmente relevante si una sesión navega entre web, blog y reservas.
Fuentes: [dimensiones GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema) y
[sesiones y engagement](https://developers.google.com/analytics/devguides/collection/ga4/sessions).

### 3.2 Alternativas para adquisición con host de entrada

| Alternativa | Qué permite afirmar | Ventaja | Límite y recomendación |
| --- | --- | --- | --- |
| A. `hostName EXACT blog.skyairline.com` en Core Data API | Actividad de sesión en el host | Usa la propiedad conectada y permite un primer corte acotado | Adoptable con etiqueta «sesiones con actividad en el blog»; no llamarlo entradas. |
| B. `eventName=session_start` AND host exacto, contrastado con landing | Candidato a sesiones iniciadas en el host | No necesita crear propiedad ni exportación | Requiere checkCompatibility y prueba real de instrumentación. No suponer que engagedSessions y su complemento conservan población bajo ese filtro de evento. Sigue siendo hipótesis de medición hasta validar. |
| C. Exportación GA4 de eventos a BQ | Reconstruir host de primer pageview por sesión | Permite una definición explícita con orden de eventos | No se ha verificado exportación ni permiso; datos brutos y Data API no tienen por qué coincidir exactamente. No crear el pipeline como prerrequisito del primer informe. |
| D. Nueva propiedad dedicada al blog | Informes futuros de una propiedad cuyo tráfico se restringe al blog | Simplifica el alcance futuro si la instrumentación está bien | Cambia medición, pierde continuidad de la propiedad actual y no crea historia retroactiva por sí sola. Descartada para este encargo. |
| E. Lista de slugs actuales del blog aplicada a landing path | Sólo rutas que hoy tienen inventario | Parece resolverlo sin ampliar host | Rechazada: una ruta puede existir en otros hosts y la lista envejece; omite portada, categorías y URL nuevas. |

Para B, Google documenta que `session_start` se recoge al iniciar una sesión y permite construir identificadores de
sesión con usuario + session_id. Esa definición justifica **investigar** el control, no declara automáticamente
aprobado el filtro de eventos como sustituto de landing-host. Para C, la exportación entrega eventos brutos y exige
un método propio, explícito y versionado. Fuentes: [sesiones GA4](https://support.google.com/analytics/answer/9191807)
y [exportación BQ](https://support.google.com/analytics/answer/9358801).

Recomendación: implementar el filtro host y un campo de población, y validar GA4 como **fuente obligatoria**.
La ficha de la cuenta pide adquisición: B debe evaluarse antes de aceptar una cifra con esa etiqueta. Si sólo se
acredita actividad, no se la presenta como entrada; la definición de KPI debe resolverse de forma explícita antes
de la aceptación del informe. Un resultado GA4 no disponible deja pendiente el encargo: no se sustituye por GSC.
El límite de una métrica específica (por ejemplo engagement) no implica borrar toda la fuente GA4.

### 3.3 Forma recomendada del reader GA4

Propuesta de contrato conceptual, no API implementada:

```ts
type Ga4UrlSelection = {
  hosts?: readonly string[]                 // normalizados, EXACT; no dominio padre por inferencia
  scopeRef: { id: string; version: number; digest: string }
} & (
  | { population: 'host_activity'; paths?: never }
  | { population: 'session_entry'; paths?: readonly Ga4LandingMatchRule[] }
)
```

El reader GA4 no debe importar el módulo SEO. El adapter traduce el alcance resuelto a este selector estructural;
no se expone un `dimensionFilter: Record<string,unknown>` arbitrario a consumidores externos. La forma exacta se
coordina con el contrato URL versionado. Filtrar por `hostName` no exige añadirlo como dimensión al resultado de
producción; las dimensiones diagnósticas deben ser una superficie tipada independiente.

Semántica: hosts permitidos AND rutas aplicables AND canal seleccionado, nunca OR entre host y ruta. Para un scope
sólo por host, la ausencia de reglas de ruta no elimina el predicado de host. Cuando la población solicitada no se
pueda servir con el método habilitado: resultado tipado `unsupported_population`/límite equivalente, sin degradar a
property-wide ni cambiar de población silenciosamente.

El ejemplo limita deliberadamente `host_activity` al host-only que necesita SKY: no se deben combinar rutas de
landing con host de eventos como si fueran una URL única. Una capacidad futura de actividad en rutas usaría
`pagePath` del evento, otro selector tipado y una semántica explícita; no amplía este corte.

La extensión de `readGa4ChannelWindow` debe recibir el selector completo. SEO y el tráfico IA adicional comparten
esa propagación para actual/comparación, y cada source/fact conserva scope y método. **El motor AEO propio también
es obligatorio:** su corrida debe vincularse al blog y conservar su evidencia nativa. Un score de marca global no
se vuelve del blog cambiándole el título o aplicando un filtro sólo en la presentación; si el productor no sirve
la población requerida, falta una capacidad del productor o una corrida elegible (véase §5.4).

### 3.4 Totales, desgloses y calidad

**No construir el KPI principal desde `sessionSourceMedium`.** Pedir al proveedor un total agregado independiente
con los mismos filtros de host/población/canal. El desglose por fuente sirve para distribución y diagnóstico; si
su suma difiere, se conserva la diferencia y se declara el límite. No forzar un residual negativo o recortar valores
para que sumen. La cuenta ya documentó discrepancias pequeñas en 14 rutas el 15-10.

El contrato debe conservar metadata de cada página de Data API, incluidas `timeZone`, `subjectToThresholding`,
`samplingMetadatas`, `dataLossFromOtherRow`, `emptyReason` y restricciones/truncamientos disponibles. La ausencia de
un campo no es evidencia de pérdida. `subjectToThresholding=true` indica que se aplica el mecanismo, pero no prueba
por sí solo que haya filas omitidas. `rowCount` completo acredita paginación de ese resultado, no exactitud global.
Google explica además aproximación de conteos únicos, incluyendo sesiones: no usar la igualdad exacta entre
consultas con distinta granularidad como única prueba de validez.
Fuentes: [metadata de respuesta](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData)
y [expectativas del reporting](https://developers.google.com/analytics/devguides/reporting/data/v1/reporting-data-expectations).

Para la primera salida basta pedir un total con el alcance correcto, conservar su calidad y nombrarlo honestamente.
Un rediseño completo de todas las métricas GA4 no es condición para el filtro del blog. Si siguen existiendo
estadísticas derivadas, las tasas deben usar numerador y denominador de la **misma** consulta/población; nunca
aplicar sesiones del evento session_start a interacción de una consulta sin ese filtro.

El total agregado independiente, la comprobación del filtro y la definición actividad/entrada son controles
requeridos del GA4 incluido desde L1. No se usa una edición GSC-only para saltarlos. Se pueden declarar métricas
concretas no disponibles (por ejemplo interacción local no acreditada), manteniendo hechos GA4 válidos, su recibo y
los límites visibles. Si no hay evidencia GA4 válida, el gate de fuente requerida bloquea la aceptación.

### 3.5 Matriz de queries de verificación propuesta

No ejecutada contra Data API en este discovery. Usar la propiedad existente, ventana corta cerrada de siete días,
peticiones secuenciales y consentimiento persistido. `checkCompatibility` debe usar las mismas dimensiones,
métricas y filtros que cada `runReport`; sólo comprueba compatibilidad de esquema, no el significado de negocio.
[Contrato oficial](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/checkCompatibility).

| ID | Consulta/control | Pregunta y criterio |
| --- | --- | --- |
| G01 | Sin dimensiones; host exacto; sessions/engagedSessions | Total de actividad acotada. Se conserva respuesta y metadata. |
| G02 | Host+canal Organic Search; sin desglose por fuente | KPI orgánico independiente de G03. |
| G03 | Misma población + canal/fuente | Desglose y diferencia contra G02, sin normalizar. |
| G04 | hostName+pagePath, host exacto, muestra corta | Ninguna URL de www/reservas/host parecido; control diagnóstico, no suma de sesiones. |
| G05 | Sin dimensiones; eventName=session_start AND host; sessions | Candidato de entrada. Verificar compatibilidad, recogida del evento y diferencia con G01. |
| G06 | G05 + landingPagePlusQueryString y pagePath si compatible | Contrastar correspondencia entre landing y URL del evento de arranque; investigar `not set`. |
| G07 | Fuente AI Assistant o controles de fuentes conocidas + host | El tráfico IA entra sólo con el alcance correcto; no inferir presencia de marca. |
| G08 | Host con mayúsculas normalizadas; host ajeno; sin hostname | El método usa normalización definida y no ensancha la consulta ante errores. |
| G09 | Ventana actual y comparación; mismo scope digest | Se conserva población y método; la comparación no lee el alcance más nuevo. |
| G10 | Respuesta con thresholding/sampling/other y paginación interrumpida | Se conserva calidad, se declara incompletitud, nunca complete por defecto. |

## 4. GSC: dos stores, un hecho y varias clases de cobertura

### 4.1 Recorrido existente

- `seo/overview/read-overview-kpis.ts:164–220` sólo consulta PG, con CTR agregado y posición ponderada.
- `seo/overview/read-window-movers.ts:74–117` también sólo consulta PG, usando el mismo alcance en ambas ventanas.
- `seo/gsc-history-bq-mirror.ts:137–184` relee PG y hace MERGE al histórico; `188–201` lista fechas presentes.
- `seo/gsc-backfill.ts:144–223` obtiene la historia por el reader GSC y escribe directamente a BQ.
- `seo/gsc-daily-batch.ts:114–142` trata captura y espejo como resultados separados.

Por ello hay dos gaps diferentes para SKY: faltan datos históricos BQ y falta un reader canónico de ventanas que
pueda utilizarlos. El backfill no se debe ejecutar en un discovery ni desde un adapter de Insights, y no se debe
llenar PG con 16 meses para evitar escribir el reader.

### 4.2 Cuatro coberturas distintas que no deben colapsarse

| Cobertura | Qué se necesita saber | Situación actual |
| --- | --- | --- |
| Temporal | Qué fechas fueron consultadas, vacías, fallidas o incompletas | `coveredDays` cuenta fechas con filas. No distingue cero válido de captura ausente. |
| De población | Qué propiedad, host/rutas, searchType y dataState se capturaron | `site_url` existe; host se deduce de page. El snapshot de evidencia debe sellar selector/método. |
| Del proveedor | Qué parte de los totales entra en query×page | API no garantiza todas las filas. Paginar hasta agotar no prueba total absoluto de Google. |
| De transporte/store | Todas las páginas del fetch y todos los chunks del MERGE llegaron | Los estados se devuelven al caller, pero el reader de KPIs no consulta un manifest durable por día. |

La Search Analytics API devuelve las filas principales bajo sus límites y puede omitir fechas sin datos. Por eso
no se puede equiparar una fecha con filas a un día completo ni una fecha sin filas a cero tráfico. Un control sin
query, con la misma propiedad/host/tipo/agregación, permite medir la cobertura del detalle; las consultas ocultas
no se inventan ni se reparten proporcionalmente.
Fuente: [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

**Mínimo para la primera salida:** expresar el rango servido y su naturaleza query×page, y evitar «total completo»
si no existe control suficiente. **Para series mensuales confiables:** diseñar evidencia durable por captura
con estado `complete/partial/empty/failed`, scope/property/searchType/dataState, páginas recibidas, truncamiento,
instante y versión de captura, controles y estado de espejo. El dueño es SEO, no Insights.

### 4.3 Riesgos del pipeline que el histórico nuevo debe contemplar

1. **PG puede contener un día parcialmente escrito.** El materializer hace UPSERT por páginas/chunks antes de
   conocer el resultado completo (`gsc-daily-materializer.ts:131–155`). Si falla tras alguna página, devuelve
   `truncated=true` (`117–123`); un error posterior puede dejar filas aunque el resultado sea failed (`171–177`).
2. **El batch puede espejar un día truncado.** En `gsc-daily-batch.ts:116–142`, `ok` activa mirror cuando hay filas;
   no exige `truncated=false` para copiar. El estado está en el outcome, no en la tabla usada por el KPI.
3. **Presencia se usa como completitud para reanudar.** El backfill salta cualquier fecha de `listGscHistoryDates`
   (`gsc-backfill.ts:160–182`), aunque su BQ fuera un día parcial.
4. **MERGE por chunks puede quedar incompleto.** `gsc-history-bq-mirror.ts:65–124` realiza varios MERGE; si uno falla,
   los anteriores ya están en BQ. Saltar la fecha en el retry no la completa.
5. **Empty no deja evidencia en las tablas de hechos.** Un día vacío válido y uno que jamás se consultó se parecen
   para el reader; `coveredDays` no puede resolverlo contando filas.

Son riesgos de código observados, no incidentes nuevos demostrados para SKY. No obligan a reescribir todo antes de
un informe blog-only acotado: se puede usar una ventana corta verificada con controles y declarar límites. Sí deben
quedar como trabajo dependiente del histórico si se pretende afirmar meses completos, completar días o reanudar
capturas de forma confiable.

### 4.4 Opciones de lectura histórica

| Opción | Consistencia | Costo/operación | Decisión propuesta |
| --- | --- | --- | --- |
| PG-only + rango acotado | Actual; no duplica stores | Bajo; poca historia | Válida para primer corte con límites claros. |
| BQ como fuente única por ventana histórica | Una sola población y agregado | Requiere historia completa y control del espejo | Preferida para comparación mensual una vez BQ esté poblado y validado. |
| PG y BQ unidos sin reglas | Puede duplicar días y filas o mezclar versiones parciales | Parecería fácil | Rechazada. |
| Plan determinista por día/ventana con selección de store | Puede cubrir últimos días PG + historia BQ | Mayor complejidad; necesita estado y reconciliación | Evolución sólo si el freshness real lo exige. |
| Leer GSC en vivo dentro de Insights | Evita gap materializado | Repite costo/cuota, credenciales y latencia por generación | Rechazada como bypass; la captura pertenece a SEO. |

El reader dueño debe devolver hechos y metadatos de cobertura, no abrir tablas BQ a Insights. El adapter mantiene
su dependencia de `readSeoOverviewKpisForWindow` y de los readers de movimientos. La estrategia de store se resuelve
una vez para la ventana y comparación; todos los KPIs/semanas/movers usan ese plan. Una abstracción `GscWindowReadPlan`
pertenece a SEO y permite extracción futura a Marketing Studio sin filtrar imports BQ al dominio Insights.

Los hechos de contexto requieren otra distinción: el adapter actual emite `site_total.*` con rol `reference`
después de leer la propiedad sin scope (`seo-adapter.ts:150–158`) y más tarde sella el mismo scope en todas las
sources (`586–588`). La igualdad del receipt entre sources no prueba que una referencia property-wide se haya
filtrado. Para el primer informe de SKY se puede suprimir ese contexto redundante (su propiedad GSC ya es el blog).
Para conservarlo en otros clientes, declarar su población y procedencia separadas y excluirlo del KPI y del
invariante de hechos `measure`. Nunca etiquetar el contexto del sitio completo como medición del contenido.

Si se elige lectura mixta, el plan selecciona **una versión de captura por fecha** antes de agregar. No se unen
filas faltantes de un PG parcial con BQ viejo suponiendo que son una sola captura completa. Para fallback de filas
excepcional hay que declarar orden de autoridad y versionado; `materialized_at` solo no sustituye estado de captura.

La identidad actual de PG es `(organization_id,capture_date,query,page)` (`migrations/20260805171834316_task-1302-growth-seo-gsc-daily.sql:34–35`).
BQ hace MERGE con la misma clave y puede actualizar `site_url` (`gsc-history-bq-mirror.ts:83–93`). No incluye propiedad
ni tipo de búsqueda en la clave. Por eso **no** se deben importar datos de la propiedad antigua al mismo flujo
como si fueran otra partición intercambiable. Una investigación de migración con propiedad distinta necesita un
contrato de fuente separado y deduplicación por identidad explícita; no entra en el núcleo host-only actual.

### 4.5 Query y presupuesto para la implementación

- Filtrar organización y partición de fecha antes de clasificar URL o agrupar. BQ está particionado por fecha y
  clusterizado por organización; el plan debe evitar `SELECT *` y lecturas globales.
- Query parametrizada y dialecto equivalente al matcher puro; paridad entre PostgreSQL, BQ y TS para host+ruta.
- Reutilizar clasificación por página distinta que TASK-2033 ya usa en PG; no un regex repetido por cada fila.
- `maximumBytesBilled` explícito para cada operación, dry-run previo para backfill/controles nuevos. El cliente
  `src/lib/bigquery.ts:28–33` impone un default de 1 GB cuando falta override; es un techo técnico, no un presupuesto
  aprobado de este encargo. Aquí se utilizó 50 MiB y no se amplió.
- El límite de filas top-N se aplica después del alcance, manteniendo totales de control fuera del top-N.
- Ponderar posición por impresiones y calcular CTR desde sumas; preservar numerador/denominador sin promediar ratios.
- `from` inclusivo y `toExclusive` exclusivo desde la ventana Insights; convertir a endDate inclusivo sólo en la
  frontera Data API/GSC. No reinterpretar calendario de Google/PT como zona de GA4/Santiago.

### 4.6 Matriz de pruebas para ventanas

| ID | Caso | Resultado esperado |
| --- | --- | --- |
| S01 | Sólo PG con host correcto; fecha fuera del rango | Mismos totales que reader actual dentro de scope; sin fila extra. |
| S02 | Historia sólo BQ | Resultado semánticamente equivalente; provenance declara fuente/ventana real. |
| S03 | El mismo día completo en PG y BQ | Una sola captura elegida; nunca doble clic. |
| S04 | PG parcial y BQ completo / caso inverso | No completar por unión oportunista; elegir captura acreditada o degradar. |
| S05 | Fecha empty acreditada vs missing | Cero válido frente a ausencia; cobertura distinta. |
| S06 | Consulta/página aparece sólo en la comparación | FULL OUTER de movimientos la conserva; no se pierde por universo actual. |
| S07 | Comparación mensual y año anterior cruzan stores | Misma población y método, sin cambio de alcance por runtime. |
| S08 | BQ inaccesible, timeout, techo de bytes | Límite honesto; no reemplazar histórico por cero ni comparar rangos desiguales. |
| S09 | Host parecido, mismo slug en www, query/fragmento | Match sólo por host/ruta contractual, sin ampliar por normalización. |
| S10 | Propiedad/tipo de búsqueda distintos | No mezclar ni pisar identidad; rechazo o dataset explícito diferente. |
| S11 | Resultado paginado o MERGE interrumpido | Manifest parcial y retry completa; presencia de una fila no salta el día. |
| S12 | Mismo conjunto query×page | KPIs, suma de movimientos y semanas concilian dentro de la misma población; diferencias contra control de Google se publican. |

## 5. Ranking, oportunidades y estimaciones

### 5.1 Ranking

`rankFacts` en `adapters/seo-adapter.ts:177–210` pide la serie, elige el último punto de cada keyword en la ventana
y **después** comprueba la URL. Ese orden es correcto y debe conservarse: si una keyword antes posicionó una URL
del blog pero su último punto es de www, no se puede seleccionar el punto viejo para fabricar presencia del blog.
Se sustituye el matcher de ruta por el matcher URL contractual; una URL nula queda fuera de una restricción por host.

`seo/rank-evolution-reader.ts:36–46` y `196–210` elige PG para ventana caliente de 180 días y BQ para la larga.
El resultado vacío PG de SKY no demuestra que nunca haya habido histórico BQ; no se consultó ese histórico aquí.
Tampoco la ausencia se arregla ejecutando un run de proveedor en discovery. El primer informe puede declarar
ranking no disponible. Para incorporarlo, se comprueban mercado/idioma/engine/device, histórico y población.

### 5.2 Oportunidades

`seo/work-queue/reader.ts:237–258` resuelve la organización desde el target. En `279–302` filtra por alcance antes
del límite; conservarlo evita obtener cinco ítems globales y terminar con cero del blog tras filtrar en el adapter.
Los ítems con URL nula no prueban pertenencia; no se rellenan con la home del blog ni se convierten en cero.
`opportunityFacts` sólo consume los orígenes propios admitidos y su prioridad persistida, no recalcula scores.

Para una recomendación nueva sin URL, la pertenencia puede demostrarse en el futuro por una identidad explícita de
servicio/scope del ítem. Esa ampliación es opcional; excluir esas filas en el primer corte es suficiente.

### 5.3 Tráfico estimado y valor monetario

`etvFacts` en `seo-adapter.ts:249–253` ya rechaza `organic_etv` cuando hay alcance. Debe seguir haciéndolo también
cuando el alcance sólo contiene host. El hecho representa volumen de tráfico estimado, **no USD**, y el dominio
`skyairline.com` no puede renombrarse como blog. No cambiar el target ni recomprar series sin comprobar soporte e
identidad del proveedor.

La capacidad `seo/organic-traffic-value/collect.ts:9–32` ya exige siteUrl/hostname y filtra URL exacta por host.
Consulta control agregado, páginas y query×page×country (`60–82`); el cálculo usa método
`gsc_clicks_country_cpc_v1` y exige conciliación de controles (`calculate.ts:3`, `31–48`). Esta capacidad no está
integrada en Insights. Podría adaptarse después con hechos de USD, cobertura, fecha de CPC y marca/sin marca;
no reutilizar `organic_etv`, extrapolar consultas ocultas o presentar el valor como ROI. Es opcional para blog-only.

### 5.4 AEO nativo requerido: identidad, población y tiempo

**Requisito corregido:** las corridas del motor propio son la tercera fuente obligatoria desde el primer informe.
No se descarta AEO por ser difícil de acotar, ni se da por satisfecho porque el capítulo contenga `ai_sessions`
procedente de GA4. El módulo y la fuente tienen identidades diferentes.

Recorrido real observado por lectura de código, sin ejecutar una nueva corrida:

- `adapters/aeo-adapter.ts:34–37` solicita `readClientGraderReport` para un run terminado dentro de la ventana.
- `56–67` exige además `provenance.asOfDate` dentro del período y respeta `insufficient_data/review_required`.
- `70–83` conserva método scoreVersion/promptPackVersion, cobertura de prompts/motores y evidencia del Grader.
- `201` devuelve una source `reader=readClientGraderReport`; el receipt actual no expone aquí un binding completo de
  runId + target/scope del blog + digest que certifique la población requerida de la edición.
- `221–228` agrega aparte tráfico IA de GA4. Si no existe corrida nativa, esos hechos pueden dejar el módulo AEO
  aparentemente no vacío. Por eso `modulesWithoutFacts` tampoco garantiza que exista la fuente AEO requerida.
- `growth/ai-visibility/client/command.ts:37–39,54–57` ya admite lectura por `runId` o selección por ventana. La
  evolución debe fijar el run elegible y reutilizar el reader del dueño, no reconstruir el motor en Insights.

Para el informe Blog, el run nativo necesita identidad server-side de organización, target y alcance de cada
métrica. Un perfil de dominio raíz o un panel general no invalida automáticamente todas sus observaciones: puede
contener evidencia de URLs del blog reutilizable mediante una **proyección canónica por URL**, con panel y
denominador declarados. La adecuación se evalúa por métrica, sin exigir una corrida o panel dedicado si los datos
existentes la sostienen. Si sólo hay agregados globales sin evidencia URL suficiente para una métrica concreta,
ésta no se reetiqueta como blog: se amplía la proyección dueña o se declara su límite. Los scores siguen siendo
calculados por el motor; Insights no filtra resultados y vuelve a promediar un score para llamarlo blog.

El otro frente verificó por SELECT que el run CL `EO-GRUN00074` del 03-10 contiene **12 citas a URLs del blog entre
634 citas y 60 observaciones**, aunque usa perfil raíz y un panel general de reputación/compra. Estos conteos
identifican evidencia reutilizable; no convierten el score global en score del blog ni hacen intercambiables
citas, respuestas y observaciones. El estado detallado y la proyección propuesta se documentan en el anexo 05.
La proyección debe conservar `runId`, URL canónica, pertenencia al scope y el denominador de panel de cada métrica.

Los motores pueden citar sitios externos al responder sobre el blog. Esas citas son evidencia de la prueba AEO,
no tráfico de la web principal que se haya colado en el alcance. El receipt debe distinguir **sujeto medido**
(blog/consulta/panel) de **fuentes citadas por el motor**; prohibir todo dominio citado ajeno al blog destruiría la
comparativa AEO. A la inversa, un score de presencia global de marca no se convierte en score del blog sólo porque
alguna cita incluya `blog.skyairline.com`.

Temporalidad requerida:

1. Binding inmutable de `runId` y versión/snapshot de sus resultados antes de componer la edición.
2. Fecha efectiva de la medición y finalización dentro del criterio acordado de la ventana; el selector existente
   comprueba ambos conceptos y no debe reemplazarse por «último de la organización».
3. AEO sigue siendo un snapshot puntual: no llenar los días del mes con el mismo score ni interpolar tendencia.
4. Para una comparación AEO, usar corridas elegibles de ambas ventanas con población/método comparables. Si falta
   la corrida previa, no fabricar delta: registrar `not_comparable` de esa métrica y mantener la fuente actual.
   Si el producto promete comparación completa de AEO, esa corrida previa es también gate de aceptación.
5. `review_required/insufficient_data` del productor no se saltan con `allowPartial`. Un subconjunto de métricas
   legítimamente ausentes (por ejemplo SoV sin competidores) puede declararse como límite sin sustituir el run.

Este frente no hizo esa consulta de corridas; el estado real de SKY fue comprobado por SELECT en el otro frente
y se desarrolla en el anexo 05. No se ejecutaron runs nuevos ni se autoriza consumo de proveedor para suplir un
dato ausente. Una nueva corrida sólo se considera si una métrica necesaria no puede sostenerse con la evidencia
existente y su proyección canónica; no es un prerrequisito automático por tener perfil raíz.

### 5.5 Gate por fuente requerida, adicional al gate de módulo

**Bug de aceptación a prevenir:** `commands/generation.ts:137–146` sólo comprueba que cada módulo tenga algún
hecho no reference. GA4 y GSC producen hechos del módulo `seo`; basta GSC para que el módulo pase sin GA4. En `aeo`,
los referrals de GA4 pueden producir hechos aunque `readClientGraderReport` haya rechazado la corrida. Por tanto,
ni `modules=['seo','aeo']` ni `allowPartial=false` garantizan las tres fuentes del encargo.

Propuesta: la policy versionada del informe Blog resuelta por servidor fija
`requiredSourceKinds=['ga4','gsc','aeo_run']`. No se deja al caller eliminar una de ellas ni a un cambio del flag
suprimir silenciosamente una fuente. Este conjunto y los bindings quedan congelados con la edición. La policy no
necesita implementar todo TASK-1960, pero tampoco se infiere sólo de un chip de portada.

Recibo por fuente, conceptual, a resolver en el contrato compartido:

```ts
type RequiredSourceReceipt = {
  sourceKind: 'ga4' | 'gsc' | 'aeo_run'
  organizationId: string
  scopeRef: { id: string; version: number; digest: string }
  sourceIdentity: { propertyId?: string; siteUrl?: string; runId?: string }
  requestedWindow: { start: string; endExclusive: string; timeZone: string }
  served: { from?: string; toExclusive?: string; measuredAt?: string; finishedAt?: string }
  population: string
  method: { name: string; version: string }
  collectedAt: string
  state: 'verified' | 'partial_metrics' | 'missing' | 'unusable'
  factIds: string[]
  limitations: string[]
}
```

No se trata de confiar en metadata escrita por un caller: cada receipt sale del reader/adapter autorizado y se
valida contra bindings de servidor, fuentes originales y hechos sellados. La forma final necesita un DTO
versionado/discriminado, campos obligatorios por sourceKind y digest estable. `sourceIdentity` genérico del ejemplo
no habilita un receipt GA4 sin propertyId ni AEO sin runId.

| Fuente requerida | Evidencia mínima de aceptación | Lo que no la satisface |
| --- | --- | --- |
| `ga4` | Consulta real de la propiedad correcta, host/población acreditados, ventana servida y total agregado de las métricas necesarias con metadata | Conexión active en DB; hechos GSC; total property-wide; suma de fuentes sin control; una respuesta vacía interpretada automáticamente como cero. |
| `gsc` | Propiedad y host correctos, período/serie y cobertura declarados, control acorde al total que se publique | Token conectado; CSV histórico fuera del pipeline; una fila por fecha equiparada a completitud; falta convertida en cero. |
| `aeo_run` | Corrida nativa identificada y válida, métricas adecuadas al blog por proyección canónica URL cuando corresponda, panel/denominadores y corte/gate del motor | Tráfico `AI Assistant`, último run fuera de período, score de marca global renombrado o mero estado completed sin revisar gate/evidencia. Un perfil raíz no es por sí mismo causa de rechazo. |

`partial_metrics` admite límites concretos dentro de una fuente válida, no que la fuente requerida haya desaparecido.
El gate debe exigir al menos la evidencia canónica acordada por sourceKind, no cualquier número nominal o una
referencia. Missing/unusable y scope/tenant/tiempo incompatibles bloquean la aceptación del informe, aunque el
request traiga `allowPartial=true`. Si hace falta una vista previa diagnóstica, su estado debe distinguirse del
informe aceptable, sin emitirlo como completo.

Momentos del gate: al resolver bindings, al sellar receipts/evidencia, antes de congelar el plan y de nuevo al
validar/emitir sobre lo sellado. No releer latest para sustituir la corrida ni repetir llamadas externas al emitir.
Un output renderizado no arregla una fuente ausente. Vercel, worker y todos los lanes reutilizan el mismo control.

Pruebas de aceptación adicionales:

| ID | Estímulo | Resultado exigido |
| --- | --- | --- |
| R01 | GSC válido + GA4 ausente; módulo SEO tiene hechos | Rechazo por fuente GA4 requerida; `allowPartial` no lo evita. |
| R02 | GA4 válido + GSC ausente | Rechazo por fuente GSC requerida; ningún dato de sesiones sustituye clics/impresiones. |
| R03 | Referrals IA válidos + corrida nativa ausente; módulo AEO tiene hechos | Rechazo `aeo_run`; no aceptar porque el módulo no esté vacío. |
| R04 | Run AEO de perfil raíz/panel general con citas URL del blog; o corte fuera de ventana | Aceptar métricas sustentadas por proyección URL canónica y denominador declarado; rechazar score global reetiquetado y corrida fuera de la ventana. No exigir nuevo panel por el perfil raíz. |
| R05 | Tres fuentes válidas; engagement local o SoV concreto no acreditados | Límites de esas métricas, receipts de las tres fuentes preservados y sin inventar valores. |
| R06 | Binding A cambia a B durante retry/recover | Misma propiedad/scope/run/ventana original; ninguna nueva corrida adoptada por latest. |
| R07 | Calendarización o flags omiten un adapter/fuente | Gate falla; no emitir la edición reducida como si cumpliera el informe. |
| R08 | Run AEO cita competidores o sitios externos | Se conservan como evidencia de la medición del sujeto blog; no se confunden con población web property-wide. |

## 6. Secuencia de implementación propuesta para este frente

1. Consumir el nuevo contrato URL del anexo 01 y su protocolo seguro de coexistencia. Un campo hosts que código
   viejo ignora junto con paths vacíos sería un fallback a propiedad completa: no habilitar ese estado.
2. Extender selector GA4/helper y todos los callsites relevantes; agregar metadata y total de control de las
   métricas necesarias. Validar host-only y host+paths sin romper Berel. Implementar además el binding de corrida
   AEO nativa y el gate de fuentes requeridas `ga4/gsc/aeo_run`, no sólo el gate de módulos.
3. Ejecutar controles G01–G06 por lectura estrecha; decidir actividad frente a entrada con evidencia. Una propiedad
   activa en DB no es prueba de consulta exitosa. No usar el reader mutante para ensayar errores deliberados.
4. Habilitar una vista previa integrada con GA4, GSC y AEO del motor propio sobre un rango acreditado. Excluir sólo
   métricas específicas sin población verificable, conservar los límites, y bloquear aceptación si falta una fuente
   requerida. El tráfico referido desde asistentes no satisface el recibo `aeo_run`.
5. Diseñar estado de captura/coverage mínimo, verificar mirrors y poblar la historia de SKY necesaria para el período
   acordado sólo bajo autorización concreta. Si las ventanas necesarias no existen, resolverlas antes de aceptar
   ese informe. Separar backfill de ejecución de informe.
6. Extender readers dueños para historia BQ cuando la ventana lo necesite y probar consistencia entre KPIs/movers.
   No exigir historia de 16 meses si el informe pactado no la usa. La incorporación de BQ no exige mover el dominio.
7. Incorporar opcionalmente ranking, referrals IA acotados y valor monetario cuando sus fuentes estén verificadas.
   Esta opcionalidad no alcanza a GA4, GSC ni al AEO nativo obligatorio.

## 7. Unknowns que todavía requieren evidencia

| Unknown | Cómo se resuelve | Efecto sobre la aceptación del primer informe |
| --- | --- | --- |
| Data API acepta combinación exacta de eventName/host/landing/interacción para SKY | checkCompatibility + queries cortas + controles de recogida | GA4 es obligatorio: bloquea aceptar adquisición no acreditada; no habilita informe GSC-only. |
| Qué sesiones cruzan web/blog/reservas y cómo se conserva session_id | Análisis de instrumentación y control del sitio correcto | No para actividad; sí para certificar entrada. |
| Estado y alcance de exportación GA4 BQ | Metadata/permiso de la propiedad correcta | La exportación no es obligatoria si Data API acredita la métrica; GA4 sí lo es. |
| Por qué BQ GSC de SKY no tiene datos aunque PG sí | Outcomes del cron/mirror y config del runtime por org/fecha | No obliga a usar BQ si el período está acreditado en PG; bloquea el histórico que falte para el informe elegido. |
| Completitud de los 15 días PG frente a controles Google | Reconsulta acotada/controles con misma propiedad/host/tipo | Se exige recibo GSC y cobertura del período acordado; no presentar detalle incompleto como total completo. |
| Ranking BQ para SKY | Metadata/query mínima con target y rango | No; la métrica se omite hasta comprobarla. |
| Antiguo GSC www y permisos del cliente | Acceso nominal y exportación por fuente distinta | No para el host actual; sí para análisis anterior a migración que lo necesite. |
| Proyección AEO nativa adecuada al blog y ventana | Reader dueño por runId, URL/scope por métrica, panel/denominador y gates; estado real en anexo 05 | Sí para aceptar las métricas requeridas: reutilizar evidencia existente cuando alcance; no sustituirla por referrals IA ni score global renombrado. |

## 8. Alcance de esta investigación y verificaciones

Lecturas de código y documentación local con números de línea; fuentes oficiales de Google verificadas el 27-10;
metadata y agregado BQ bajo techo explícito; uso del recibo PG producido por el agente principal en esta sesión.
No se ejecutó Data API GA4 ni GSC, no se compró información, no se alteró estado de conexiones, no se crearon
ediciones ni schedules, no hubo backfill, deploy o emisión. No se desarrollaron tests nuevos: las matrices anteriores
son criterios para implementar, no evidencias de ejecución.
