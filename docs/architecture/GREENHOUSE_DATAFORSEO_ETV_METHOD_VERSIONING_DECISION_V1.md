# ADR — Versionado metodológico de ETV en Growth SEO

> **Status:** Accepted — implementation, provider spend and cutover gated  
> **Date:** 2026-09-01 · **Owner:** Growth SEO / EPIC-022  
> **Scope:** Growth / SEO / DataForSEO Labs / PostgreSQL / API Platform / MCP / ops-worker  
> **Reversibility:** two-way-until-provider-cutoff; freeze-only-after-cutoff · **Confidence:** high
> **Validated as of:** 2026-09-02 (repo vigente + respuesta contractual directa de DataForSEO)
> **Epic:** `EPIC-022` · **Execution owners:** `TASK-1805` foundation · `TASK-1806` evaluation/cutover  
> **Evidence:** [impact audit](../audits/seo/2026-09-01-dataforseo-improved-etv-impact.md) ·
> [provider questions](../audits/communications/2026-09-01-dataforseo-improved-etv-provider-questions.md)

## Contexto

DataForSEO anunció una fórmula mejorada para el campo existente `etv`. La respuesta conserva el mismo shape,
pero cambia la estimación mediante CTR sensible al layout/intención y normalización clickstream. El aviso indica
acceso temprano mediante `use_improved_etv: true` y un cambio de default el 2026-11-01.

Greenhouse consume ETV en siete workflows Labs. De las 14 familias ETV-capable confirmadas, nueve tienen caller:
seis familias/siete caminos consumen ETV, tres lo ignoran y cinco no están habilitadas. Los caminos consumidores
persisten números sin versión metodológica y construyen series, rankings top-N, costos estimados y diagnósticos
comerciales. Las claves actuales tampoco permiten conservar dos
fórmulas para el mismo sujeto, mercado y fecha. Depender del default del proveedor convertiría una revisión de
modelo en una aparente variación de performance SEO sin que readers, API, MCP ni operadores puedan distinguirla.

DataForSEO confirmó que el flag cubre 14 familias Labs de Google y Bing y todos los campos ETV, que no cambia el
precio y que el corte global ocurre el **2026-11-01T00:00:00Z**. Desde ese instante `false` se ignora y no existe
fallback legacy. La respuesta tampoco expone una versión de fórmula. Por eso esta decisión fija la forma interna,
la evidencia derivable y la secuencia segura, pero no autoriza implementación, gasto, migración, deploy ni cutover.

## Decisión

### 1. La metodología es una dimensión del hecho

Toda cifra ETV capturada o derivada deberá llevar una identidad metodológica cerrada:

- `legacy_static_v1`: fórmula legacy explícitamente solicitada y confirmada por el proveedor.
- `improved_layout_clickstream_v2`: fórmula improved explícitamente solicitada y confirmada por el proveedor.
- `unknown_methodology`: estado de lectura/degradación para evidencia que no puede atribuirse con certeza; no es
  una opción válida para nuevas escrituras una vez desplegado el contrato.

La metodología se acompaña de `historicalCalculationBasis`: `fully_recomputed` desde julio de 2026 o
`calibrated_approximation` antes, cuando improved histórico se deriva del ratio de julio por dominio.

Los nombres internos son estables aunque DataForSEO cambie el nombre comercial. No se inferirá la fórmula por
fecha de captura. Las filas preexistentes sólo se marcarán legacy cuando la evidencia contractual permita
demostrarlo; las filas ambiguas permanecerán explícitamente desconocidas.

### 2. La policy vive sobre el transporte, no dentro de él

`src/lib/ai/dataforseo.ts` seguirá siendo transporte genérico. Una policy pura y central del dominio SEO:

- resuelve el método configurado;
- mantiene una allowlist cerrada de endpoints Labs compatibles;
- clasifica cada familia como `etv_consumed`, `etv_ignored` o `provider_supported_not_enabled`;
- construye el parámetro exacto sólo cuando el contrato oficial lo confirma;
- falla cerrado ante método o endpoint desconocido;
- devuelve la metodología configurada, solicitada y efectiva derivada para persistencia, logs y señales.

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

API Platform, MCP, resúmenes operativos y provenance transportan la misma identidad. DataForSEO no devuelve una
versión observada: `providerEffectiveMethod` se deriva de `requestedMethod`, `requestedAt`, la fecha de corte y la
versión de policy. Desde el corte, una solicitud legacy es drift/fallo, no evidencia de legacy servido.
`methodologyVersion` es
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

- **rebaseline versionado**, usando improved recomputado completamente desde julio de 2026 y etiquetando los meses
  anteriores como `calibrated_approximation`, porque el proveedor los convierte con el ratio de julio por dominio; o
- **breakpoint visible**, conservando legacy antes de una fecha y improved después, sin calcular variaciones a
  través del quiebre.

Los históricos no se reetiquetan por fecha de consulta y una recompra no sobreescribe filas append-only. Ninguna
comparación interanual puede tratar los meses anteriores a julio de 2026 como recomputación keyword por keyword.

### 8. Configuración cross-runtime y rollback

La selección vive en una configuración canónica con el mismo valor en Vercel y ops-worker. El runtime reporta
`configured_method`, `requested_method`, `provider_effective_method`, `requested_at` y `policy_version`; cualquier
divergencia abre señal y safe mode. `provider_effective_method` es una derivación contractual, no un campo leído
de la respuesta. El cutover se hace explícito antes del cambio obligatorio del proveedor.

Antes del 2026-11-01T00:00:00Z, rollback puede volver el selector de lectura y los writers a `legacy_static_v1`.
Después del corte, `false` se ignora: rollback significa congelar nuevas capturas ETV, servir la última serie
comparable etiquetada y escalar. Nunca se presenta una solicitud `false` como rollback efectivo post-corte.

## Secuencia vinculante de entrega futura

1. Incorporar la matriz contractual confirmada y verificar Sandbox cuando la documentación esté disponible.
2. Implementar policy pura/allowlist/config con default legacy explícito y tests, sin activarla.
3. Aplicar expand aditivo, atribución segura de filas existentes y tipos regenerados.
4. Propagar metodología por writers, freshness, parsers y hechos derivados.
5. Hacer formula-aware los readers y bloquear series mixtas.
6. Propagar el contrato por API/MCP/provenance y señales cross-runtime.
7. Validar fixtures/replay; luego ejecutar canary o A/B sólo con gasto aprobado.
8. Registrar la decisión histórica, hacer cutover controlado y observar.
9. Conservar el baseline legacy como evidencia; no existe captura legacy nueva después del corte del proveedor.

`TASK-1805` posee los pasos 1–6 y entrega el evaluador seguro todavía en legacy. `TASK-1806` depende de su cierre y
posee los pasos 7–9: shadow autorizado, decisión histórica, cutover y rollback pre-corte/safe mode post-corte. Ambas pueden refinar slices y
nombres de símbolos durante Plan Mode, pero no invertir este orden ni trasladar gasto a la foundation.

## Invariantes verificables

- Cambiar el default de DataForSEO antes del corte no cambia el método efectivo de Greenhouse.
- Dos métodos pueden coexistir para el mismo sujeto/mercado/fecha sin colisión ni overwrite.
- Una lectura devuelve una metodología o falla/degrada con etiqueta; nunca mezcla.
- Freshness de legacy no satisface una solicitud improved ni viceversa.
- Relevant pages/subdomains se comparan por valor y membresía dentro de cada método.
- Un hecho de tráfico estimado de prospecto no se escribe sin metodología.
- El costo pagado estimado comparte método con su ETV.
- Dry-run y logs declaran el método y el número de llamadas previstas.
- Ningún flag, deploy o documento se considera evidencia suficiente: antes del corte se verifica el request
  explícito; después se deriva el método efectivo con el contrato temporal y se rechaza configuración legacy.

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
- La transición sólo es reversible hasta el corte fijo del proveedor; después la degradación segura es congelar,
  no fingir continuidad ni un rollback que el proveedor ignora.
- Este ADR por sí solo no autoriza código, migraciones, llamadas al proveedor, flags, deploys ni cambios de runtime.

## Estado del contrato externo

La respuesta directa de DataForSEO resolvió endpoints/campos, booleano, precio, clickstream, históricos, corte y
rollback. Sandbox y las URLs finales de OpenAPI/changelog siguen pendientes, pero no bloquean la foundation basada
en fixtures. Una llamada real continúa requiriendo autorización y presupuesto.

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
