# ISSUE-176 — La proyección PG de `ai_signals` pierde el 90 % de las señales y eso filtra en silencio lo que el digest semanal muestra a liderazgo

## Ambiente

production (instancia Cloud SQL compartida + BigQuery `efeonce-group.ico_engine`)

## Detectado

2026-09-21, durante la auditoría del correo "Resumen semanal — Nexa Insights" recibido a las 07:00 America/Santiago. El operador reportó que los insights no le servían para decidir; la reproducción del filtro del digest contra la base destapó el drift.

## Síntoma

El correo del 2026-09-21 mostró 5 insights en 2 espacios. Para el espacio Efeonce en el período 2026-09, los dos insights presentados eran los de **menor** contribución al problema (8,33 % y 16,67 %), mientras que el hecho principal y sus causas mayores no aparecieron en ninguna parte.

Conteo BigQuery (`ai_signals_current`) contra PostgreSQL (`greenhouse_serving.ico_ai_signals`):

| período | BigQuery | PostgreSQL | perdidas |
|---|---|---|---|
| 2026-07 | 21 | **0** | 21 |
| 2026-08 | 24 | **4** | 20 |
| 2026-09 | 18 | **2** | 16 |

Total: **6 de 63 señales proyectadas (9,5 %)**.

Para `space_id = spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad` (Efeonce), período 2026-09, BigQuery tiene 10 señales y PostgreSQL 2. Las 8 ausentes incluyen:

- `EO-AIS-CE678BB43BE7` — la **anomalía madre** (`otd_pct`, current 20,0 vs expected 55,63): el hecho que origina todo lo demás.
- `EO-AIS-58B665B0E09F` — causa raíz con **75 % de contribución** (proyecto "Product Design - Q3 - 2026").
- `EO-AIS-B4F9AB7B3759` y `EO-AIS-40FDC129B9AE` — causas por persona y por fase, ambas con 100 % de contribución en su dimensión.
- `EO-AIS-8BB43BE7-REC` — la recomendación asociada.
- Dos predicciones (`otd_pct`, `ftr_pct`).

Las dos que sí sobrevivieron (`EO-AIS-0B2CE34893B0`, `EO-AIS-40D84422C6A8`) son causas raíz huérfanas: su `parentSignalId` apunta a una señal que no existe en PostgreSQL.

## Causa raíz

Dos condiciones que se combinan:

1. **La proyección `ico_ai_signals` hace `DELETE` de todo el período y luego `UPSERT` fila por fila, sin transacción envolvente.** `src/lib/sync/projections/ico-ai-signals.ts:113-131` borra por `(period_year, period_month[, space_id])`; `upsertServingRow` (`:134-245`) inserta una a una y devuelve `false` en silencio cuando la fila no pasa la validación de campos obligatorios (`:144`). Si la corrida se interrumpe a mitad, o si un subconjunto de filas falla la validación, el serving queda con menos filas que el origen y **nada lo declara**. La proyección no verifica que el conteo final coincida con el de BigQuery.

2. **El digest usa esa tabla como filtro de existencia.** `selectPresentableEnrichments` en `src/lib/ico-engine/ai/narrative-presentation.ts:540-542` hace `INNER JOIN greenhouse_serving.ico_ai_signals sig ON sig.signal_id = e.signal_id` cuando `requireSignalExists` está activo (el digest lo pasa en `true`, `src/lib/nexa/digest/build-weekly-digest.ts:212`). El join fue diseñado para descartar enrichments huérfanos; con el drift, descarta **contenido legítimo**. El texto de los insights está completo en PostgreSQL (9 849 filas en `ico_ai_signal_enrichment_history`); lo que falta es la señal, y el join la exige.

El efecto neto es que **un fallo de integridad de datos se comporta como un criterio editorial**: el correo a liderazgo no muestra lo más grave, muestra lo que sobrevivió.

El detector de confiabilidad existente no lo ve. `src/lib/reliability/queries/nexa-insights-freshness.ts:103-105` compara el conteo de BigQuery contra `greenhouse_serving.ico_ai_signal_enrichments` — la tabla de **enrichments**, no la de **signals** — y sólo marca `error` cuando el resultado es exactamente `0` (`:110`). Con 6 señales proyectadas y miles de enrichments, el signal reporta verde.

## Impacto

- El digest semanal ejecutivo (`EFEONCE_ADMIN` + `EFEONCE_OPERATIONS`, lunes 07:00) se construye sobre el 9,5 % de las señales disponibles, sin declararlo.
- La selección de qué insight llega a liderazgo queda determinada por un fallo de proyección, no por severidad ni impacto.
- `/nexa/insights` (lista y detalle) y todo consumer de `greenhouse_serving.ico_ai_signals` ven el mismo universo incompleto. `readNexaInsightDrill` puede resolver un enrichment cuya señal padre no existe.
- Las causas raíz huérfanas presentan contribuciones que no suman 100 % (8,33 + 16,67 = 25 %) sin ninguna indicación de que falten hermanas.
- Julio 2026 no tiene ninguna señal proyectada: ese período es invisible para todo consumer PostgreSQL.

## Solución

Remediación en `TASK-1883`, Slice 1. Alcance mínimo:

1. Envolver el `DELETE` + `UPSERT` de la proyección en una transacción, o reemplazar el patrón por un upsert masivo idempotente sin ventana de vacío.
2. Verificar el conteo post-proyección contra el origen y **fallar la corrida** (no degradar en silencio) cuando no coincida, emitiendo el error a `captureWithDomain(err, 'delivery', ...)`.
3. Registrar explícitamente cada fila rechazada por validación, con `signal_id` y campo faltante — hoy se pierde sin traza.
4. Reliability signal nuevo `delivery.ai_signals.projection_parity`, que compare `COUNT` de `ico_engine.ai_signals_current` contra `greenhouse_serving.ico_ai_signals` por período, con steady state `0` de diferencia.
5. Re-proyectar los períodos 2026-07, 2026-08 y 2026-09 y verificar paridad exacta.
6. Mientras el drift exista, el digest no puede tratar el `INNER JOIN` como criterio silencioso: si la paridad no está verde, debe declarar el estado degradado en vez de presentar un subconjunto como si fuera el total.

## Verificación

- Query de paridad por período devuelve diferencia `0` para 2026-07, 2026-08 y 2026-09:
  - BigQuery: `SELECT period_year, period_month, COUNT(*) FROM ico_engine.ai_signals_current WHERE period_year = 2026 AND period_month BETWEEN 7 AND 9 GROUP BY 1,2`
  - PostgreSQL: `SELECT period_year, period_month, count(*) FROM greenhouse_serving.ico_ai_signals WHERE period_year = 2026 AND period_month BETWEEN 7 AND 9 GROUP BY 1,2`
- `EO-AIS-CE678BB43BE7` (la anomalía madre) existe en `greenhouse_serving.ico_ai_signals`.
- Ninguna señal `root_cause` en el serving tiene un `parentSignalId` que no resuelva.
- El signal `delivery.ai_signals.projection_parity` reporta `ok`.
- Una corrida de proyección interrumpida a propósito en staging deja el signal en `error`, no en `ok`.

## Estado

open

## Relacionado

- `TASK-1883` — remediación + severidad honesta del insight.
- `TASK-1884` — el digest que consume el resultado.
- `TASK-943` — canonizó `ai_signals` como event log append-only en BigQuery con la VIEW `ai_signals_current`; la proyección a PostgreSQL quedó fuera de ese endurecimiento.
- `ISSUE-082` — precedente de pipeline en falso-sano en el mismo carril (`ai_signals` con `generated_at` NULL escribiendo silenciosamente).
- `src/lib/sync/projections/ico-ai-signals.ts`, `src/lib/ico-engine/ai/narrative-presentation.ts`, `src/lib/reliability/queries/nexa-insights-freshness.ts`
