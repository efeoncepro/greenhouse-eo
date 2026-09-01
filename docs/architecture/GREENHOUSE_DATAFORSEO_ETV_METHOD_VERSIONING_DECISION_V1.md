# ADR — Versionado metodológico de ETV en Growth SEO

> **Status:** Accepted — implementation, provider spend and cutover gated  
> **Date:** 2026-09-01 · **Owner:** Growth SEO / EPIC-022  
> **Scope:** Growth / SEO / DataForSEO Labs / PostgreSQL / API Platform / MCP / ops-worker  
> **Reversibility:** two-way-but-slow · **Confidence:** medium  
> **Validated as of:** 2026-09-01 (repo vigente + aviso de cuenta; contrato público del flag todavía incompleto)  
> **Epic:** `EPIC-022` · **Execution owners:** `TASK-1805` foundation · `TASK-1806` evaluation/cutover  
> **Evidence:** [impact audit](../audits/seo/2026-09-01-dataforseo-improved-etv-impact.md) ·
> [provider questions](../audits/communications/2026-09-01-dataforseo-improved-etv-provider-questions.md)

## Contexto

DataForSEO anunció una fórmula mejorada para el campo existente `etv`. La respuesta conserva el mismo shape,
pero cambia la estimación mediante CTR sensible al layout/intención y normalización clickstream. El aviso indica
acceso temprano mediante `use_improved_etv: true` y un cambio de default el 2026-11-01.

Greenhouse consume ETV en siete workflows Labs, persiste los números sin versión metodológica y construye series,
rankings top-N, costos estimados y diagnósticos comerciales. Las claves actuales tampoco permiten conservar dos
fórmulas para el mismo sujeto, mercado y fecha. Depender del default del proveedor convertiría una revisión de
modelo en una aparente variación de performance SEO sin que readers, API, MCP ni operadores puedan distinguirla.

La documentación pública revisada todavía no describe `use_improved_etv`. Cobertura por endpoint, semántica de
`false` frente a omisión, pricing, retroactividad histórica y disponibilidad del legado después del corte siguen
siendo preguntas contractuales. Por eso esta decisión fija la forma interna y la secuencia segura, pero no
autoriza implementación, gasto, migración, deploy ni cutover.

## Decisión

### 1. La metodología es una dimensión del hecho

Toda cifra ETV capturada o derivada deberá llevar una identidad metodológica cerrada:

- `legacy_static_v1`: fórmula legacy explícitamente solicitada y confirmada por el proveedor.
- `improved_layout_clickstream_v2`: fórmula improved explícitamente solicitada y confirmada por el proveedor.
- `unknown_methodology`: estado de lectura/degradación para evidencia que no puede atribuirse con certeza; no es
  una opción válida para nuevas escrituras una vez desplegado el contrato.

Los nombres internos son estables aunque DataForSEO cambie el nombre comercial. No se inferirá la fórmula por
fecha de captura. Las filas preexistentes sólo se marcarán legacy cuando la evidencia contractual permita
demostrarlo; las filas ambiguas permanecerán explícitamente desconocidas.

### 2. La policy vive sobre el transporte, no dentro de él

`src/lib/ai/dataforseo.ts` seguirá siendo transporte genérico. Una policy pura y central del dominio SEO:

- resuelve el método configurado;
- mantiene una allowlist cerrada de endpoints Labs compatibles;
- construye el parámetro exacto sólo cuando el contrato oficial lo confirma;
- falla cerrado ante método o endpoint desconocido;
- devuelve la metodología solicitada y la observada para persistencia, logs y señales.

Está prohibido inyectar `use_improved_etv` globalmente o copiar la decisión en siete callsites. Omitir el campo no
será una tercera policy silenciosa: sólo podrá usarse en una prueba controlada que mida el default del proveedor.

### 3. Persistencia expand-first y coexistencia real

La implementación futura será aditiva antes de cambiar writers:

- snapshots de dominio y visibilidad ganan una columna metodológica con `CHECK` cerrado;
- sus constraints de unicidad, freshness e idempotencia incluyen la metodología;
- los `top_keywords` heredan la versión del snapshot padre;
- el hecho de prospecto `estimated_monthly_traffic` exige metodología y declara truncamiento/cobertura de muestra;
- `estimated_paid_traffic_cost` hereda la misma metodología del ETV del que se deriva;
- tipos de DB se regeneran desde PostgreSQL; no se editan a mano.

Append-only continúa siendo vinculante. El expand debe desplegarse y verificarse antes de que cualquier writer
pueda producir improved. No se escribe un shadow en las tablas actuales sin la dimensión y las constraints nuevas.

### 4. Un reader sirve una sola metodología

Freshness, pre-checks y readers filtran por metodología antes de deduplicar, ordenar o agrupar. Ninguna trayectoria
puede mezclar meses legacy e improved. La salida devuelve `etvMethodologyVersion`, fecha de breakpoint cuando
aplique y comparabilidad explícita.

Si el método solicitado no existe, el reader elige una de estas respuestas gobernadas, nunca un fallback oculto:

1. `not_available_for_method`;
2. fallback legacy etiquetado, sólo durante el período de transición;
3. dos series separadas para comparación autorizada.

API Platform, MCP, resúmenes operativos y provenance transportan la misma identidad. `methodologyVersion` es
provenance de una métrica; no es una `lens` ni una nueva fuente de verdad.

### 5. GSC es benchmark first-party, no fórmula a combinar

Search Console se usa como benchmark observado del dominio propio con propiedad, país, dispositivo, ventana y
cobertura comparables. No se promedia con ETV y no se presenta como ground truth de competidores. La evaluación
compara calibración, dirección, estabilidad y error por celdas comparables; no inventa causalidad ni convierte una
mejora agregada en promesa para cada query.

### 6. Shadow: dos niveles de evidencia

- **Cero gasto proveedor:** fixtures/replay prueban policy, payload, persistencia, readers, API/MCP y rechazo de
  series mixtas. No prueban exactitud de la fórmula.
- **Sin gasto incremental, pero no A/B exacto:** un canary interno puede sustituir una captura ordinaria por
  improved mientras producción sigue leyendo legacy. Permite comparación temporal contra GSC, pero deja la serie
  legacy del canary sin captura equivalente y debe declararse como evidencia confundida por tiempo.
- **A/B exacto:** requiere que el proveedor devuelva ambas fórmulas en una respuesta o dos llamadas pagadas. Sólo
  se ejecuta con matriz oficial de endpoints/precio y tope USD aprobado por el operador.

El plan nunca describe una comparación temporal como paridad simultánea.

### 7. Historia: rebaseline o breakpoint, nunca continuidad ficticia

Después de la evaluación se elige una opción por serie:

- **rebaseline versionado**, sólo si DataForSEO confirma retroactividad, el costo queda aprobado y el histórico
  puede recomprarse sin mezclar metodologías; o
- **breakpoint visible**, conservando legacy antes de una fecha y improved después, sin calcular variaciones a
  través del quiebre.

Los históricos no se reetiquetan por fecha de consulta y una recompra no sobreescribe filas append-only.

### 8. Configuración cross-runtime y rollback

La selección vive en una configuración canónica con el mismo valor en Vercel y ops-worker. El runtime reporta
`configured_method`, `requested_method` y `served_method`; cualquier divergencia abre señal y safe mode. El
cutover se hace explícito antes del cambio de default del proveedor.

Rollback significa volver el selector de lectura y los writers a `legacy_static_v1` mientras el proveedor lo
soporte. No borra ni reescribe evidencia improved. Si DataForSEO retira legacy, rollback significa congelar nuevas
capturas ETV, servir la última serie comparable etiquetada y escalar; nunca aceptar el nuevo default en silencio.

## Secuencia vinculante de entrega futura

1. Obtener matriz oficial de endpoints, semántica, pricing e históricos; verificar Sandbox si está disponible.
2. Implementar policy pura/allowlist/config con default legacy explícito y tests, sin activarla.
3. Aplicar expand aditivo, atribución segura de filas existentes y tipos regenerados.
4. Propagar metodología por writers, freshness, parsers y hechos derivados.
5. Hacer formula-aware los readers y bloquear series mixtas.
6. Propagar el contrato por API/MCP/provenance y señales cross-runtime.
7. Validar fixtures/replay; luego ejecutar canary o A/B sólo con gasto aprobado.
8. Registrar la decisión histórica, hacer cutover controlado y observar.
9. Retirar legacy sólo cuando el período de rollback y la evidencia lo permitan.

`TASK-1805` posee los pasos 1–6 y entrega el evaluador seguro todavía en legacy. `TASK-1806` depende de su cierre y
posee los pasos 7–9: shadow autorizado, decisión histórica, cutover y rollback. Ambas pueden refinar slices y
nombres de símbolos durante Plan Mode, pero no invertir este orden ni trasladar gasto a la foundation.

## Invariantes verificables

- Cambiar el default de DataForSEO no cambia el método servido por Greenhouse.
- Dos métodos pueden coexistir para el mismo sujeto/mercado/fecha sin colisión ni overwrite.
- Una lectura devuelve una metodología o falla/degrada con etiqueta; nunca mezcla.
- Freshness de legacy no satisface una solicitud improved ni viceversa.
- Relevant pages/subdomains se comparan por valor y membresía dentro de cada método.
- Un hecho de tráfico estimado de prospecto no se escribe sin metodología.
- El costo pagado estimado comparte método con su ETV.
- Dry-run y logs declaran el método y el número de llamadas previstas.
- Ningún flag, deploy o documento se considera evidencia de la fórmula servida: el readback debe observarla.

## Alternativas rechazadas

- **Esperar el cutover y aceptar el default:** rompe continuidad sin señal.
- **Agregar sólo `use_improved_etv: true`:** cambia el número sin resolver provenance, claves ni readers.
- **Inferir legacy/improved por fecha:** falsifica filas ante rollout gradual, reintentos o retroactividad.
- **Guardar sólo en JSON libre:** impide constraints, uniqueness y consultas formula-aware.
- **Versionar cada keyword hija:** duplica metadata que pertenece al snapshot, sin evidencia de métodos mixtos
  dentro de una sola respuesta.
- **Promediar legacy e improved:** crea una tercera métrica sin significado.
- **Reconstruir improved desde rank × volumen:** no contiene layout, intención ni normalización clickstream.
- **Reabrir `TASK-1775`, `TASK-1776` o `TASK-1709`:** esas capacidades están cerradas; este cambio transversal
  necesita ownership y rollout propios.

## Consecuencias

- El modelo y los DTO ganan una dimensión, y algunas claves/queries deben cambiar.
- La comparabilidad pasa a ser explícita; ciertos gráficos podrán mostrar un breakpoint en vez de una variación.
- La evaluación exacta puede tener costo adicional y requiere aprobación humana separada.
- La transición es reversible mientras el proveedor conserve legacy; si no, la degradación segura es congelar,
  no fingir continuidad.
- Este ADR por sí solo no autoriza código, migraciones, llamadas al proveedor, flags, deploys ni cambios de runtime.

## Preguntas que bloquean la implementación

1. Endpoints y campos exactos que aceptan `use_improved_etv`.
2. Semántica de `false`, omisión y default antes/después del 2026-11-01.
3. Precio y convivencia con `include_clickstream_data`.
4. Comportamiento de históricos, retroactividad y versión observada en respuesta.
5. Hora/zona de corte y ventana garantizada de rollback legacy.

Fuentes oficiales consultadas:

- https://dataforseo.com/help-center/how-is-etv-calculated
- https://dataforseo.com/help-center/whats-clickstream-estimated-traffic-volume-and-how-is-it-calculated
- https://dataforseo.com/help-center/how-is-traffic-cost-calculated
- https://docs.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live/
- https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_rank_overview/live/

## Runtime Contract

Cuando `TASK-1805` se implemente y cierre, la fuente de verdad será la policy tipada del dominio
`src/lib/growth/seo/**`, las columnas/constraints de `greenhouse_growth`, sus readers canónicos y la proyección
aditiva servida por API/MCP, todavía seleccionando legacy. `TASK-1806` sólo puede activar improved después de
medir y aprobar la transición. Hasta entonces, **el runtime vigente no implementa esta decisión** y continúa sin
una dimensión metodológica; el audit enlazado es la evidencia del riesgo, no prueba de rollout.

## Revisit When

- DataForSEO publique un identificador de fórmula en cada respuesta o entregue ambos métodos en una sola llamada.
- El proveedor retire legacy o cambie pricing/retroactividad.
- Greenhouse adopte otra fuente de estimación de tráfico o una metodología propia calibrada.
- La evaluación muestre que la identidad necesaria es más granular que una versión por snapshot.
