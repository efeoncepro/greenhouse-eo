# Evaluar la transición a DataForSEO Improved ETV

## Estado y alcance

Este runbook describe una evaluación futura. **No autoriza ni ejecuta llamadas a DataForSEO, migraciones, flags,
deploys o cutover.** La foundation pertenece a `TASK-1805`; la evaluación pagada, decisión histórica y activación
pertenecen a `TASK-1806`. Ambas deben respetar
`GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`.

## Objetivo

Determinar si `improved_layout_clickstream_v2` mejora la utilidad y calibración de ETV para Greenhouse sin romper
series históricas, cambiar silenciosamente el conjunto top-N ni exceder el gasto aprobado.

## Preconditions obligatorias

No iniciar una prueba con proveedor hasta que todas estén satisfechas:

1. DataForSEO confirmó endpoints, campos, `true`/`false`/omisión, pricing, históricos y ventana legacy.
2. `TASK-1805` está completa y verificada; `TASK-1806` fue tomada mediante el operating loop y su plan fue aprobado.
3. Policy y allowlist fallan cerrado; el transporte genérico sigue neutral.
4. El expand de schema permite coexistir ambas metodologías y fue verificado antes de cualquier writer improved.
5. Readers productivos siguen fijados a legacy y rechazan series mixtas.
6. Vercel y ops-worker reportan la misma configuración; dry-run muestra método y llamadas previstas.
7. Existe un presupuesto máximo en USD aprobado por el operador. Sin monto aprobado, sólo fixtures/replay.
8. Se definieron ventana, propiedades GSC, países, dispositivos y tratamiento de datos faltantes antes de mirar
   resultados.

## Nivel 0 — validación sin gasto

Usar fixtures oficiales o respuestas sintéticas versionadas para probar:

- payload exacto para cada endpoint compatible;
- rechazo de endpoint/método inválido;
- convivencia legacy/improved para mismo sujeto/mercado/fecha;
- freshness e idempotencia por método;
- lectura de una sola metodología y error ante mezcla;
- propagación hacia API, MCP, provenance, traffic cost y diagnóstico de prospecto;
- cambio de membresía en relevant pages/subdomains;
- dry-run con `providerCalls=0`.

Resultado permitido: **compatibilidad técnica**, nunca “improved es más exacto”.

## Nivel 1 — diseño de cohorte

La cohorte mínima propuesta combina datos propios observables y presión competitiva:

| Celda | Mercado | Sujeto | Propósito |
|---|---|---|---|
| Efeonce propio | CL / es | dominio y URLs clave | comparar con GSC first-party |
| Efeonce competidor | CL / es | un dominio comparable aprobado | sensibilidad competitiva |
| Berel propio | MX / es | dominio y URLs clave | comparar con GSC a otra escala |
| Berel competidor | MX / es | un dominio comparable aprobado | top-N y concentración |

La muestra debe contener dominios grandes y pequeños, intención informational/commercial/local y SERPs con/sin
AIO cuando el proveedor permita clasificar esas features. No agregar clientes, marcas ni mercados sin aprobación
del owner y revisión del presupuesto.

Para cada celda se congela antes de ejecutar:

- endpoint, sujeto normalizado, location/language, dispositivo y fecha;
- límites, orden y filtros exactos;
- método solicitado;
- costo cotizado y tope acumulado;
- propiedad/ventana GSC comparable, cuando existe;
- hipótesis y criterio de decisión.

## Nivel 2 — modos de ejecución

### Canary sin gasto incremental

Sustituye una captura ordinaria interna por improved; no agrega una llamada. Producción sigue leyendo legacy.

Ventaja: controla costo. Limitación: no produce legacy e improved simultáneos y confunde fórmula con cambio
temporal. Debe registrarse como `temporal_canary`, no como A/B.

### A/B exacto con gasto autorizado

Ejecuta el mismo request lógico para ambos métodos dentro de la misma ventana. Sólo procede si DataForSEO confirma
que ambas solicitudes son válidas y el dry-run muestra un costo total bajo el tope aprobado. Si el proveedor
entrega ambas fórmulas en una respuesta, se prefiere esa vía y se conserva la respuesta como evidencia gobernada.

Detener antes de la primera llamada si el costo no puede estimarse, el default no puede fijarse explícitamente o
el histórico no revela qué método sirvió.

## Comparación

### Contra GSC

GSC se compara sólo para dominios propios y ventanas equivalentes. Registrar por celda:

- ETV legacy, ETV improved y clicks GSC;
- diferencia absoluta y relativa;
- dirección de cambio y estabilidad entre períodos;
- cobertura de queries/URLs y cualquier truncamiento;
- país, dispositivo y propiedad.

Evaluar error de calibración, orden/correlación y consistencia direccional. No promediar GSC con ETV ni usar GSC
para certificar competidores.

### Dentro de DataForSEO

Comparar además:

- ETV orgánico/paid y `estimated_paid_traffic_cost`;
- top keywords;
- relevant pages/subdomains: intersección, entradas, salidas y cambios de posición;
- histórico del mismo período, si el provider permite ambas fórmulas;
- suma del prospecto, número de filas y señal de truncamiento.

Un cambio de membresía es un resultado de primera clase; no se reduce a porcentaje de variación del ETV.

## Pre-registro de decisión

Antes de gastar, completar una tabla con umbrales acordados. No inventar precisión sin baseline.

| Criterio | Umbral aprobado | Evidencia | Resultado |
|---|---|---|---|
| Calibración contra GSC | pendiente de aprobación | celdas propias comparables | pendiente |
| Regresión máxima por cliente ancla | pendiente de aprobación | Efeonce y Berel separados | pendiente |
| Estabilidad de ranking/membresía | pendiente de aprobación | top-N y concentración | pendiente |
| Costo total | monto USD explícito | dry-run + ledger | pendiente |
| Contrato histórico | rebaseline o breakpoint | respuesta oficial + prueba | pendiente |

Go requiere que improved cumpla todos los criterios registrados. Un promedio favorable no compensa una regresión
material no aceptada en un cliente ancla. Si la evidencia es inconclusa, el resultado es `hold`, no cutover.

## Decisión histórica

- Elegir **rebaseline** sólo con retroactividad confirmada, costo aprobado y almacenamiento separado por método.
- En otro caso, declarar **breakpoint** con fecha/hora, mantener segmentos separados y deshabilitar deltas que
  crucen el quiebre.
- Nunca reetiquetar filas por fecha ni sobrescribir evidencia append-only.

## Rollout futuro

1. Fixtures/replay verdes.
2. Expand de schema verificado en staging; readers aún legacy.
3. Deploy con selector legacy explícito y señales de drift.
4. Canary/A-B bajo presupuesto y write path separado.
5. Decisión documentada y aprobación humana.
6. Cutover de writer, luego reader, en staging; verificar método servido.
7. Repetir en producción con observación y stop conditions.

Stop conditions:

- `configured_method != requested_method != served_method`;
- filas nuevas sin metodología o una serie mixta;
- costo proyectado/real supera el tope;
- default del proveedor no verificable;
- regression no aceptada o cambio top-N inexplicable;
- Vercel y ops-worker divergen.

## Rollback

Mientras legacy exista, volver writers/readers a `legacy_static_v1`, conservar ambas series y verificar readback.
Si legacy fue retirado, detener nuevas capturas ETV y servir la última serie comparable con estado degradado. No
borrar improved, no recomputar legacy localmente y no aceptar el default nuevo sin provenance.

## Registro de evidencia

El cierre debe enlazar:

- respuesta/ticket oficial del proveedor;
- plan aprobado y monto máximo;
- matriz congelada de requests;
- dry-run con llamadas/costo;
- resultados por celda, no sólo promedio;
- decisión rebaseline/breakpoint;
- readback de staging y producción;
- rollback ejercitado o evidencia equivalente.
