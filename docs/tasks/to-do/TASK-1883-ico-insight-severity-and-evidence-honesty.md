# TASK-1883 — Severidad, evidencia y recurrencia honestas en los insights ICO

## Delta 2026-09-25

- **Supuesto invalidado: «las bandas autoritativas son las del Contrato de Métricas».** El operador decidió el
  2026-09-25 que el semáforo de OTD%, FTR% y RpA lo manda `ICO_METRIC_REGISTRY` (OTD 90/70, FTR 80/60, RpA 1,5/2,5).
  El §7.1 del Contrato quedó marcado como benchmark externo, no semáforo, y el glosario §C se alineó al registro.
  La severidad por umbral de negocio de esta task debe leer `getThresholdZone` del registro, nunca bandas del
  Contrato ni literales. El bono conserva umbrales propios en `payroll_bonus_config` y sigue fuera de alcance.
  Detalle: `ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` § «Umbrales ICO — una sola fuente por propósito»; los semáforos
  del portal escritos a mano migran en `TASK-1900` — cerrado por la reconciliación de umbrales (commit `9172cf5df`; antes del rewrite de historia del 2026-09-25, `f1a41cda0`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-048`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hace que un insight ICO diga la verdad sobre sí mismo: severidad derivada del umbral de negocio y no sólo de la desviación estadística, tamaño de muestra y confianza visibles, período del hecho explícito, marca de recurrencia, y orden por impacto en vez de por un número que el modelo inventa. Incluye la remediación de `ISSUE-176`, el drift de proyección que hoy decide en silencio qué insight llega a liderazgo.

## Why This Task Exists

Cinco defectos verificados en producción el 2026-09-21, todos en el mismo camino que produce el correo semanal.

**1. El número más visible del insight no significa nada, y además ordena.** El `qualityScore` lo produce el LLM. La única instrucción que lo define, en `src/lib/ico-engine/ai/llm-provider.ts:122`, es literalmente *"Devuelve un qualityScore entre 0 y 100"* — sin decir qué mide. Resultado sobre 9 849 enrichments:

| quality_score | filas | % |
|---|---|---|
| **85,00** | **8 398** | **86,3 %** |
| 95,00 | 480 | 4,9 % |
| 75,00 | 480 | 4,9 % |
| 90,00 | 361 | 3,7 % |

Los 5 insights del correo del 2026-09-21: todos 85,00. Ese campo es el criterio de orden en `src/lib/ico-engine/ai/narrative-presentation.ts:587,604` (`quality_score DESC NULLS LAST`), tanto en el ranking por espacio como en el global. Con todo empatado, el desempate real es `processed_at`, es decir azar. Y `src/lib/nexa/digest/build-weekly-digest.ts:154-160` lo imprime en el titular como `OTD% · score 85`, junto al nombre de la métrica, donde se lee como si el OTD fuera 85. El OTD real de ese espacio era 20.

**2. La severidad ignora el umbral de negocio.** `src/lib/ico-engine/ai/anomaly-detector.ts:99-105` asigna `critical` con `|z| >= 3` y `warning` con `|z| >= 2`. El registry ya define zonas absolutas (`getThresholdZone`, `src/lib/ico-engine/metric-registry.ts:592-606`; para `otd_pct`: óptimo 90-100, atención 70-90, **crítico 0-70**). Nadie las consulta en el camino del insight. Consecuencia medida: el espacio Efeonce con OTD **20,0 %** — zona crítica absoluta — salió en el correo como "seguimiento", porque su z-score fue −2,50 y el corte de crítico es −3. Y el reverso: `anomaly-detector.ts:93-95` hace `continue` cuando la desviación estándar es menor a 0,0001, así que **un espacio estancado en zona crítica pero estable no genera ninguna señal jamás**.

**3. El insight no declara sobre cuántos datos se sostiene, y el modelo atribuye mal las cifras.** El OTD de 20 % de Efeonce sale de 5 tareas en el denominador (1 `on_time` + 3 `late_drop` + 1 `overdue`) sobre 4 tareas completadas en todo el mes, contra 112 en julio. La anomalía de RpA de Sky Airline se calculó sobre 30 tareas elegibles de 328 completadas (9 % de cobertura) y su propio payload declara `qualityGateStatus: "degraded"` — el detector sólo descarta `broken`, así que pasó. `src/lib/ico-engine/metric-trust-policy.ts:247-257` ya calcula `qualityGateStatus`, `confidenceLevel` y las razones (`limited_sample_size`, `no_completed_tasks`) para nueve métricas; el camino del insight lo descarta.

Peor: el modelo confunde el valor del espacio con el de la dimensión. El enrichment `EO-AIS-0B2CE34893B0` afirma *"El OTD% para el proyecto Content - Q4 ha caído a 20 %, muy por debajo del valor esperado de 55,63 %"*. El `20` es el OTD del **espacio**; el valor real del proyecto está en el payload como `dimensionMetricValue: 0`. El `55,63` es la media histórica del **espacio** (40-120 tareas/mes) comparada contra un proyecto. Y *"ha caído"* no se sostiene: no existe serie histórica por proyecto en ningún punto del pipeline. Ese proyecto tenía 12 tareas en el período y 1 completada; su peso en el cálculo de contribución es `1`.

**4. Un hecho de agosto se presenta como novedad de la semana, cinco semanas seguidas.** La señal `EO-AIS-46A08F2D9C91` (RpA de Sky, período **2026-08**) acumula **42 re-procesamientos en 5 semanas consecutivas** desde el 2026-08-20. Tres de los cinco insights del correo del 2026-09-21 eran de agosto, bajo un encabezado que decía "14 SEPT - 21 SEPT". La causa: la ventana del digest filtra por `processed_at` (`narrative-presentation.ts:567-568`), que es cuándo el LLM volvió a escribir el texto, no cuándo ocurrió el hecho; y el cron `ico-materialize-daily` corre con `monthsBack: 3` (`services/ico-batch/deploy.sh:255`), así que cada día se re-materializan y re-enriquecen julio, agosto y septiembre. Septiembre 2026: 990 llamadas al LLM para 63 señales distintas (15,7 veces cada una); junio llegó a 51,7. La capa de ciclo de vida existe (`NexaSignalObservation` / `NexaSignalLifecycleStatus` en `src/lib/ico-engine/ai/llm-types.ts`, TASK-945) y el digest no la consulta.

**5. La confianza declarada no está calibrada contra nada.** Sobre 566 predicciones ya contrastadas con la realidad en `ai_prediction_log_current`:

| métrica | confianza declarada | error medio real | error máximo |
|---|---|---|---|
| `otd_pct` | 0,87 | **31,5 %** | 101,6 % |
| `rpa_avg` | 0,65 | 22,9 % | 154,6 % |
| `ftr_pct` | 0,86 | 7,3 % | 48,6 % |

La fórmula es sintética: `0,5 + n/24 + progreso_del_mes * 0,3` (`src/lib/ico-engine/ai/predictor.ts:119`). El `error_pct` se calcula, se guarda y **nadie lo realimenta**.

Y por debajo de todo esto, `ISSUE-176`: la proyección PostgreSQL de `ai_signals` tiene 6 de 63 señales (9,5 %), y el `INNER JOIN` del digest convierte ese fallo en un filtro editorial silencioso. Arreglar la severidad sin cerrar el drift sería pulir un contenido que igual llega incompleto.

## Goal

- La severidad de un insight refleja el umbral de negocio del registry, no sólo la desviación respecto de sí mismo.
- Ningún insight se presenta sin declarar su denominador, su confianza y el período del hecho.
- Un hecho repetido se marca como repetido; el lector distingue "nuevo" de "lo mismo hace cinco semanas".
- El orden de los insights refleja impacto, no un número constante.
- `ISSUE-176` cerrado: paridad BigQuery↔PostgreSQL verificada y vigilada por un signal.
- Un insight sobre muestra insuficiente se suprime o se degrada explícitamente, nunca se presenta como hecho.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md` §7 (bandas de salud) y §D (OTD vs CT SLO)

Reglas obligatorias:

- **No se cambia ninguna fórmula de métrica ICO.** Esta task cambia cómo se **clasifica, ordena y presenta** una señal, nunca cómo se calcula `otd_pct`, `ftr_pct` o `rpa_avg`. El insumo del bono no se toca: el cutover de OTD a atraso imputable es exclusivamente `TASK-1170` y está frenado por decisión del CEO.
- **`ai_signals` y `ai_prediction_log` son append-only.** `TASK-943` lo canonizó. Prohibido `DELETE` sobre esas tablas en BigQuery; los consumers leen la VIEW `*_current`. La única mutación legítima sigue siendo `hydratePredictionActuals`.
- **La severidad se compone, no se reemplaza.** El z-score se conserva como evidencia; lo que cambia es que deja de ser el único insumo de la severidad presentada. Un cambio que borre el z-score rompe la continuidad de las señales existentes.
- ~~**Las bandas autoritativas son las del Contrato de Métricas.**~~ *(Reemplazado 2026-09-25: manda `ICO_METRIC_REGISTRY`; ver Delta.)* `docs/context/06_glosario-metricas.md:116-123` publica umbrales distintos y más laxos; ese documento se declara subordinado al Contrato en su propia línea 3. Si se detecta drift entre ambos, se usa el Contrato y se deja constancia — no se elige el más conveniente.
- **Degradación honesta antes que silencio.** `unavailable` / `low_confidence` explícitos, nunca `0` ni `100` inventados (`TASK-156:13`, `Contrato:606`).
- **Errores canónicos.** Toda respuesta de error usa `canonicalErrorResponse`; nada de prosa en inglés al cliente.

## Normative Docs

- `docs/issues/open/ISSUE-176-ai-signals-pg-projection-drift-filters-digest.md` — el incidente que el Slice 1 remedia. **Leerlo completo antes de tocar la proyección.**
- `docs/architecture/Contrato_Metricas_ICO_v1.md:741-745` — bandas de salud autoritativas: OTD% crítico `<90`, FTR% crítico `<60`, RpA crítico `>4,0`. Nótese que **difieren** de las del registry TypeScript (`otd_pct` crítico `0-70`). Resolver esa contradicción es parte del Slice 2 y debe quedar documentada, no silenciada.
- `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md` — el atraso imputable ya distingue lo que es del equipo de lo que es del cliente; está computado en shadow y sin superficie. Esta task **no lo expone** (eso es `TASK-1217`), pero no debe contradecir su modelo cuando describa severidad de OTD.
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/metric-registry.ts` — `getThresholdZone`, `ICO_METRIC_REGISTRY`, `STUCK_THRESHOLD_HOURS`
- `src/lib/ico-engine/metric-trust-policy.ts` — `buildMetricTrustMapFromRow` (ya calcula `qualityGateStatus` y `confidenceLevel`)
- `src/lib/ico-engine/ai/llm-types.ts` — `NexaSignalObservation`, `NexaSignalLifecycleStatus` (TASK-945)
- `greenhouse_serving.ico_ai_signals`, `greenhouse_serving.ico_ai_signal_enrichment_history`, `efeonce-group.ico_engine.ai_signals_current`

### Blocks / Impacts

- `TASK-1884` — el digest consume el DTO enriquecido que esta task produce. **Debe cerrar antes.**
- `/nexa/insights` lista y detalle (`nexa-insight-list-reader.ts`, `nexa-insight-drill-reader.ts`) — consumen el mismo campo de severidad; el cambio los alcanza.
- `NexaInsightsBlock` (`src/components/greenhouse/NexaInsightsBlock.tsx`) y sus 7 consumers — si el DTO gana campos, el componente debe poder ignorarlos sin romperse; el cambio es aditivo.
- `TASK-152` — el registry declarativo de anomalías podrá reusar el clasificador de severidad en vez de definir el suyo.
- `TASK-1074` — microcopy honesto de RpA suprimido; comparte el criterio de "dato insuficiente". Coordinar el vocabulario.

### Files owned

- `src/lib/ico-engine/ai/signal-severity.ts` (nuevo)
- `src/lib/ico-engine/ai/signal-severity.test.ts` (nuevo)
- `src/lib/ico-engine/ai/signal-evidence.ts` (nuevo — denominador, confianza, período, recurrencia)
- `src/lib/ico-engine/ai/anomaly-detector.ts` (modificado)
- `src/lib/ico-engine/ai/llm-provider.ts` (modificado — prompt y validación de salida)
- `src/lib/ico-engine/ai/llm-types.ts` (modificado — prompt template)
- `src/lib/ico-engine/ai/narrative-presentation.ts` (modificado — orden y filtros)
- `src/lib/sync/projections/ico-ai-signals.ts` (modificado — ISSUE-176)
- `src/lib/reliability/queries/ai-signals-projection-parity.ts` (nuevo)
- `src/lib/reliability/queries/nexa-insights-freshness.ts` (modificado — que mire la tabla correcta)

## Current Repo State

### Already exists

- `getThresholdZone` con las tres zonas por métrica (`metric-registry.ts:592-606`), sin ningún consumer en el camino del insight.
- `buildMetricTrustMapFromRow` con `qualityGateStatus`, `confidenceLevel` y razones por métrica (`metric-trust-policy.ts:247-257`).
- Tipos de ciclo de vida de señal `NexaSignalObservation` / `NexaSignalLifecycleStatus` (TASK-945), con `lifecycleStatus` ya presente en `AgencyAiLlmSummaryItem`.
- `ai_signals` como event log append-only con VIEW `ai_signals_current` (TASK-943) — la historia intra-período **sí** está en BigQuery, que es lo que permite calcular recurrencia.
- `ai_prediction_log_current` con `actual_value` y `error_pct` ya hidratados para 566 predicciones: el material de calibración existe.
- `payloadJson.direction` (`deterioration` / `improvement`) en las señales de anomalía, y `dimensionMetricValue` en las de causa raíz — el dato correcto ya viaja, sólo no se usa.

### Gap

- Ningún punto del camino del insight consulta `getThresholdZone` ni el trust map.
- El prompt no recibe el valor de la dimensión de forma inequívoca, y nada valida que el número que el modelo escribe exista en el payload.
- El DTO del insight no tiene campos para denominador, confianza, período del hecho ni recurrencia.
- El orden es por un campo constante.
- La proyección PostgreSQL pierde el 90 % de las señales sin declararlo (ISSUE-176) y el detector de frescura mira la tabla equivocada.
- `contributionPct` se normaliza sobre los tres elegidos (`root-cause-analyzer.ts:87`), así que siempre suma 100 % entre tres aunque juntos expliquen una fracción; y como todas las dimensiones del caso observado tenían métrica 0, el impacto quedó proporcional sólo al volumen de tareas.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/ico-engine/ai/` + `src/lib/sync/projections/`
- Future candidate home: `remain-shared`
- Boundary: el clasificador es candidato a `domain-package` junto al registry de métricas; hoy permanece compartido. `resolveSignalSeverity` y `buildSignalEvidence` son los únicos productores de severidad y evidencia presentada. Consumers: digest, readers de `/nexa/insights`, `NexaInsightsBlock`, TASK-152.
- Server/browser split: `server-only`. El cliente recibe severidad y evidencia ya resueltas; ningún componente recalcula zona de umbral.
- Build impact: `none`
- Extraction blocker: la severidad depende del registry de métricas y del trust policy; los tres se mueven juntos o ninguno.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_serving.ico_ai_signals` (paridad), `ico_engine.ai_signals_current` (origen), registry de métricas (umbrales)
- Consumidores afectados: digest semanal, `/nexa/insights`, `NexaInsightsBlock` y sus 7 superficies, reliability
- Runtime target: `production` (Vercel + ops-worker + ico-batch)

### Contract surface

- Contrato existente a respetar: `AgencyAiLlmSummaryItem` y `OrganizationAiLlmEnrichmentItem` en `src/lib/ico-engine/ai/llm-types.ts`; `PresentableEnrichment` en `narrative-presentation.ts`
- Contrato nuevo o modificado: campos **aditivos** `presentedSeverity`, `severityBasis`, `thresholdZone`, `sampleSize`, `sampleBasis`, `trustState`, `factPeriod`, `recurrence` en el DTO del insight
- Backward compatibility: `compatible` — todos los campos nuevos son opcionales; los 7 consumers de `NexaInsightsBlock` siguen funcionando sin cambios
- Full API parity: la severidad y la evidencia se resuelven server-side en un primitive único; UI, Nexa y MCP consumen el mismo resultado. Ningún consumer clasifica zonas por su cuenta.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_serving.ico_ai_signals` (write, remediación), `ico_engine.ai_signals_current` (read), `ico_ai_signal_enrichment_history` (read)
- Invariantes que no se pueden romper:
  - **Append-only en BigQuery**: cero `DELETE` sobre `ai_signals` / `ai_prediction_log`.
  - El `z_score` original se conserva siempre en la señal; la severidad presentada es un campo **derivado adicional**, no un reemplazo.
  - `presentedSeverity` nunca es más benigna que la que corresponde a la zona absoluta del registry. Si la zona dice crítico, el insight no puede presentarse como informativo por tener z bajo.
  - Un insight cuyo `trustState` sea `insufficient` no puede ordenarse por encima de uno con evidencia suficiente, sea cual sea su severidad.
  - `factPeriod` siempre refleja `period_year`/`period_month` de la señal, nunca la ventana del consumidor.
  - La recurrencia se deriva de `ai_signals_current` en BigQuery (historia de `generated_at` por `signal_id`), no de `processed_at` del enrichment: lo primero es cuándo el hecho siguió vigente, lo segundo cuándo se volvió a redactar.
- Write-target allowlist: la remediación escribe sólo en `greenhouse_serving.ico_ai_signals`, que ya es destino legítimo de esa proyección. Sin destinos nuevos.
- Tenant/space boundary: sin cambios; la proyección ya opera por `(period, space_id)`.
- Idempotency/concurrency: la proyección pasa a ser idempotente con verificación de paridad posterior. Dos corridas del mismo período convergen al mismo conteo.
- Audit/outbox/history: sin eventos nuevos. El signal de paridad es el registro observable.

### Migration, backfill and rollout

- Migration posture: `none` — no hay cambio de schema. Los campos nuevos viven en el DTO en memoria, derivados al leer.
- Default state: la severidad compuesta nace detrás de `ICO_INSIGHT_SEVERITY_V2_ENABLED` (default `false`) para poder comparar en shadow contra la actual antes del cutover.
- Backfill plan: re-proyección de 2026-07, 2026-08 y 2026-09 para cerrar ISSUE-176. Es re-lectura desde BigQuery, no mutación de origen. Dry-run que reporte el delta esperado antes del apply.
- Rollback path: flag a `false` → la severidad vuelve a la actual; la paridad de proyección no se revierte (es una corrección, no un cambio de comportamiento).
- External coordination: alta de `ICO_INSIGHT_SEVERITY_V2_ENABLED` en los runtimes que lo leen — **mapear con `grep -rn` antes**; el enrichment corre en `ico-batch` y el digest en `ops-worker`, así que muy probablemente sean tres runtimes y no uno. Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.

### Security and access

- Auth/access gate: sin cambios; se respetan los gates existentes de `/nexa/insights` (capability `nexa.insights.read`) y del digest.
- Sensitive data posture: sin PII nueva. **Atención**: la evidencia de recurrencia y de causa raíz nombra personas (`dimensionLabel` con slugs como `melkin-hernandez`). Esta task debe resolver el slug a nombre legible o suprimirlo, nunca exponer el identificador técnico en un texto que va a liderazgo.
- Error contract: `canonicalErrorResponse`; fallos de proyección a `captureWithDomain(err, 'delivery', ...)`.
- Abuse/rate-limit posture: la re-proyección de tres períodos se ejecuta secuencialmente por período, nunca en ráfaga concurrente contra la instancia compartida (precedente ISSUE-174).

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/ico-engine/ai/`
- DB/runtime checks: query de paridad BigQuery↔PostgreSQL por período devolviendo 0; verificación de que `EO-AIS-CE678BB43BE7` existe en el serving
- Integration checks: corrida de enrichment en staging con el flag encendido y comparación shadow contra la severidad actual
- Reliability signals/logs: `delivery.ai_signals.projection_parity`, `nexa.insights.freshness` (corregido)
- Production verification sequence: ver sección correspondiente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cerrar ISSUE-176: paridad de proyección

- Envolver `DELETE` + `UPSERT` de `src/lib/sync/projections/ico-ai-signals.ts` en una transacción, o sustituir por upsert masivo sin ventana de vacío.
- Registrar cada fila rechazada por la validación de `upsertServingRow` con `signal_id` y campo faltante; hoy se pierde en silencio devolviendo `false`.
- Verificación de conteo post-proyección contra el origen; discrepancia = fallo de la corrida con `captureWithDomain`, no degradación silenciosa.
- Signal `delivery.ai_signals.projection_parity` (steady state: diferencia 0 por período).
- Corregir `src/lib/reliability/queries/nexa-insights-freshness.ts:103-105` para que compare contra `greenhouse_serving.ico_ai_signals` (la tabla que el digest usa como filtro) y no sólo contra enrichments, y que alerte por **diferencia**, no sólo por cero absoluto.
- Re-proyectar 2026-07, 2026-08 y 2026-09; verificar paridad exacta.

### Slice 2 — Severidad compuesta

- `src/lib/ico-engine/ai/signal-severity.ts` con `resolveSignalSeverity({ metricName, currentValue, zScore, trust })`.
- Combina tres insumos: zona absoluta del registry (`getThresholdZone`), desviación (z-score), y dirección (`payloadJson.direction`). Regla dura: **la severidad presentada nunca es más benigna que la zona absoluta**.
- Resolver y documentar la contradicción de umbrales entre `Contrato_Metricas_ICO_v1.md:741-745` (OTD crítico `<90`) y el registry TypeScript (`otd_pct` crítico `0-70`). Elegir el Contrato como autoritativo o justificar por escrito lo contrario; dejar un solo umbral vivo.
- Emitir señal cuando la zona absoluta es crítica aunque el valor sea **estable** — hoy `anomaly-detector.ts:93-95` hace `continue` con desviación casi nula y por eso lo malo-pero-estable es invisible. Nace como tipo de señal distinguible para no contaminar la serie de anomalías.
- Campo `severityBasis` que declara qué insumo dominó (`threshold` / `deviation` / `both`).

### Slice 3 — Evidencia: denominador, confianza y período

- `src/lib/ico-engine/ai/signal-evidence.ts` con `buildSignalEvidence(signal, trustMap)`.
- Campos `sampleSize`, `sampleBasis` (reusando `MetricTrustSampleBasis` del registry), `trustState` (`sufficient` / `limited` / `insufficient`), `factPeriod` (año-mes del hecho) y `dataQualityGate` (propagando el `qualityGateStatus` que hoy se descarta).
- Regla de supresión: si `trustState` es `insufficient`, el insight no se presenta como hecho. Se degrada a "dato insuficiente" con el conteo visible, o se suprime del ranking. El caso de referencia es el OTD de 20 % sobre 5 tareas.
- El `qualityGateStatus: degraded` deja de ser invisible: se presenta junto al insight.

### Slice 4 — Que el modelo no invente cifras

- En `buildSignalPrompt` (`llm-provider.ts:113-130`), pasar el valor de la dimensión de forma inequívoca y etiquetada, distinguiéndolo del valor del espacio. Hoy ambos viajan en el mismo JSON y el modelo los confunde.
- Añadir al prompt la prohibición explícita de afirmar una evolución temporal (*"ha caído"*, *"viene bajando"*) cuando no se entrega serie histórica de esa entidad.
- Validación post-generación: extraer los números citados en la narrativa y verificar que existan en el payload de entrada. Un número que no aparece en la evidencia invalida el enrichment (estado `failed` con razón), en vez de publicarse.
- Retirar `qualityScore` del contrato de salida del modelo **o** redefinirlo con una semántica verificable. Si se conserva por compatibilidad, deja de participar en cualquier orden o filtro.
- Resolver `dimensionLabel` a nombre humano antes de que el texto llegue a un correo; nunca publicar un slug técnico.

### Slice 5 — Recurrencia

- Derivar `recurrence` desde la historia de `ai_signals_current` en BigQuery: primera aparición del `signal_id`, número de períodos/semanas consecutivas en que siguió vigente, y si desapareció y volvió.
- Estados: `new` / `recurring` (con `sinceDate` y conteo) / `resolved` / `reappeared`.
- Reusar los tipos de ciclo de vida de TASK-945 en vez de crear un vocabulario paralelo.
- Caso de referencia para el test: `EO-AIS-46A08F2D9C91` debe resolver `recurring` con primera aparición 2026-08-20.

### Slice 6 — Orden por impacto

- Reemplazar el orden `quality_score DESC` de `narrative-presentation.ts:587,604` por un orden compuesto y documentado: severidad presentada → trustState (evidencia suficiente primero) → magnitud de la desviación respecto del umbral → recencia del hecho.
- `quality_score` sale del `ORDER BY` y del titular (el titular es asunto de TASK-1884; aquí se retira del contrato de orden).
- Test que congele el orden con un set de señales conocido, para que un cambio futuro de criterio sea deliberado.

### Slice 7 — Calibración observable

- Reader que exponga la brecha entre confianza declarada y error real de `ai_prediction_log_current`, por métrica.
- Signal `delivery.ai_predictions.confidence_calibration_gap` con umbral de alerta declarado.
- **No** se cambia la fórmula de confianza en esta task: primero se hace visible la brecha. Cambiarla sin antes observarla sería repetir el error de origen.

### Slice 8 — Documentación

- Funcional: `docs/documentation/delivery/como-se-clasifica-un-insight.md`.
- Manual: delta en `docs/manual-de-uso/plataforma/` sobre cómo leer severidad, confianza y recurrencia.
- Técnica: delta en `ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` con el invariante de severidad compuesta; mover `ISSUE-176` a `resolved/` con su verificación.

## Out of Scope

- **No se cambia ninguna fórmula de métrica.** OTD, FTR, RpA y cycle time quedan idénticos. El cutover del bono es `TASK-1170` y está frenado por el CEO.
- No se corrige `contributionPct` para que se normalice sobre el total de la dimensión en vez de sobre los tres elegidos. Es un defecto real (`root-cause-analyzer.ts:87`) pero cambia el significado de un campo que ya está persistido; merece su propia task con backfill declarado. Queda en Follow-ups.
- No se toca el email ni ninguna UI. Eso es TASK-1884 y las superficies de `/nexa/insights`.
- No se implementa entrega por Teams/in-app (TASK-695, 436, 439) ni CTA accionable (TASK-435, 1184).
- No se reduce la frecuencia de re-enriquecimiento ni se cambia `monthsBack: 3`. Es desperdicio real (15,7 llamadas por señal al mes) pero tocar la ventana del materializador afecta la serie de todos los consumers; queda en Follow-ups con su propia evaluación.
- No se expone el atraso imputable (`TASK-1217`).

## Detailed Spec

### Composición de la severidad

```
zonaAbsoluta   = getThresholdZone(metric, currentValue)   // optimal | attention | critical
desviacion     = |zScore| >= 3 ? 'critical' : |zScore| >= 2 ? 'warning' : 'none'
direccion      = payloadJson.direction                     // deterioration | improvement

presentedSeverity = max(zonaAbsoluta, desviacion)          // nunca más benigna que la zona
severityBasis     = cuál de los dos dominó
```

Con `direction: 'improvement'`, la desviación no eleva la severidad: mejorar rápido no es una alarma. Pero si la zona absoluta sigue siendo crítica, la severidad sigue siendo crítica — mejorar desde un valor malo no vuelve bueno el valor.

Caso de referencia verificado: Efeonce `otd_pct = 20,0`, `z = −2,50`. Hoy: `warning`. Con esta regla: zona crítica → `critical`, `severityBasis: 'threshold'`. Y Sky `rpa_avg = 1,33` con `z = 2,02` en zona óptima (RpA óptimo 0-1,5): hoy `warning`; con esta regla sigue siendo `warning` por desviación pero con `severityBasis: 'deviation'` y `trustState` que declara los 30 elegibles de 328 — el lector puede juzgar.

### Señal de "malo pero estable"

`anomaly-detector.ts:93-95` descarta cuando `stddev < 0.0001`. Esa guarda es correcta para el z-score (dividir por cero) pero produce el punto ciego. La señal nueva no es una anomalía: es un **estado sostenido fuera de banda**. Debe nacer con `signalType` propio para no contaminar la serie histórica de anomalías ni los consumers que filtran por `signal_type = 'anomaly'`.

### Validación de números citados

El enrichment de referencia (`EO-AIS-0B2CE34893B0`) escribió *"ha caído a 20 %"* cuando el valor de esa dimensión en el payload era `0`. Una validación de extracción numérica sobre la narrativa, contrastada contra el conjunto de valores del payload, habría rechazado ese texto. No hace falta que el validador entienda la frase: basta con que todo número con formato de porcentaje o de métrica citado exista en la evidencia entregada al modelo.

Umbral de tolerancia y formato de números (redondeos, separadores es-CL) a definir en el plan; el criterio es estricto por defecto y la excepción se documenta.

### Recurrencia contra `processed_at`

La distinción es load-bearing. `processed_at` sube cada vez que el LLM re-escribe (42 veces en 5 semanas para la misma señal). `generated_at` en `ai_signals` sube cada vez que el materializador confirma que el hecho **sigue vigente**. La recurrencia se deriva de lo segundo. Un hecho que apareció el 2026-08-20 y sigue vigente hoy es `recurring` desde hace 32 días, y así debe presentarse.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 va primero, sin excepción.** Cambiar severidad y orden sobre un universo incompleto es pulir un contenido que llega filtrado por un fallo. Ningún otro slice se mergea antes de que la paridad esté verde.
- Slice 2 (severidad) → Slice 3 (evidencia) → Slice 6 (orden). El orden depende de los dos primeros.
- Slice 4 (prompt + validación) puede correr en paralelo con Slice 2-3; no depende de ellos.
- Slice 5 (recurrencia) requiere Slice 1 (necesita la historia completa proyectada).
- Slice 7 (calibración) es independiente; puede ir último.
- Slice 8 (docs) al cierre, con `ISSUE-176` movido a `resolved/` sólo cuando su verificación esté hecha.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La severidad nueva sube masivamente el volumen de críticos y genera fatiga de alerta | operación / confianza en el sistema | **high** | Shadow obligatorio con el flag apagado: computar ambas severidades y comparar N días antes del cutover; si el volumen de críticos se multiplica, recalibrar antes de encender | comparación shadow registrada en logs |
| Alguien interpreta la severidad nueva como cambio de métrica y la conecta al bono | payroll | low | Invariante explícito; la severidad es un campo de presentación y no entra en ningún cálculo de compensación; `grep` de `presentedSeverity` en `src/lib/payroll/**` debe dar cero | revisión humana en PR |
| La transacción en la proyección introduce lock contention en la instancia compartida | PostgreSQL | medium | Transacción acotada por período; nunca todos los períodos en una sola; ejecutar secuencial (precedente ISSUE-174) | conexiones idle en Cloud SQL |
| La validación numérica rechaza enrichments legítimos por formato (redondeo, separadores) | pipeline LLM | medium | Tolerancia definida y testeada con los casos es-CL reales; el rechazo registra el número no encontrado para poder auditarlo | tasa de `failed` en `ico_ai_enrichment_runs` |
| Resolver la contradicción de umbrales cambia la lectura histórica de un espacio | interpretación | medium | La decisión queda documentada con fecha; los valores históricos no se reescriben, sólo cambia la clasificación en adelante | revisión humana |
| Los 7 consumers de `NexaInsightsBlock` rompen por campos nuevos | UI | low | Todos los campos son opcionales y aditivos; `pnpm build` + suite completa como gate | build/CI |

### Feature flags / cutover

- `ICO_INSIGHT_SEVERITY_V2_ENABLED` (default `false`). Con el flag apagado se computan **ambas** severidades y se registra la diferencia; con el flag encendido, la nueva es la presentada. Esto permite medir el impacto antes de cambiar lo que liderazgo ve.
- La remediación del Slice 1 **no lleva flag**: es una corrección de integridad, no un cambio de comportamiento.
- Mapear los runtimes con `grep -rn "ICO_INSIGHT_SEVERITY_V2_ENABLED" src/ services/` y aplicar en todos (el enrichment corre en `ico-batch`, el digest en `ops-worker`, las superficies en Vercel). Declarar en `services/*/deploy.sh` **y** aplicar en vivo. Fila en el ledger de flags en el mismo PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; la re-proyección ya aplicada no requiere rollback (es una corrección) | <10 min | sí |
| Slice 2 | flag a `false` | <5 min | sí |
| Slice 3 | flag a `false` | <5 min | sí |
| Slice 4 | revert PR del prompt; los enrichments ya generados quedan como están (append-only) | <10 min | sí |
| Slice 5 | revert PR; el campo es aditivo y opcional | <5 min | sí |
| Slice 6 | revert PR del `ORDER BY` | <5 min | sí |
| Slice 7 | quitar el signal del registro | <5 min | sí |
| Slice 8 | revert de docs; `ISSUE-176` vuelve a `open/` si su verificación no se sostuvo | <5 min | sí |

### Production verification sequence

1. Ejecutar la query de paridad por período (BigQuery vs PostgreSQL) **antes** del fix y guardar el resultado como línea base: 21/0, 24/4, 18/2.
2. Merge del Slice 1. Re-proyectar 2026-07 secuencialmente; verificar paridad 21/21. Repetir para 2026-08 y 2026-09.
3. Verificar que `EO-AIS-CE678BB43BE7` existe en el serving y que ninguna `root_cause` tiene padre irresoluble.
4. Interrumpir a propósito una corrida de proyección en staging y verificar que el signal de paridad queda en `error` y no en `ok`.
5. Deploy de Slices 2-6 con `ICO_INSIGHT_SEVERITY_V2_ENABLED=false` en staging. Dejar correr ≥7 días. Extraer el comparativo: cuántos insights cambian de severidad, en qué dirección, y cuántos quedan suprimidos por `trustState: insufficient`.
6. Revisión humana del comparativo antes de encender. Si el volumen de críticos se dispara, recalibrar — no encender igual.
7. Encender en staging, observar un ciclo semanal completo, luego producción con 24 h de separación.
8. `TASK-1884` no consume el DTO nuevo hasta que este paso 7 esté cerrado.

### Out-of-band coordination required

- Alta de `ICO_INSIGHT_SEVERITY_V2_ENABLED` en los tres runtimes + fila en `FEATURE_FLAG_STATE_LEDGER.md`.
- **Decisión humana sobre la contradicción de umbrales** (Contrato vs registry TypeScript): requiere que el operador confirme cuál es autoritativo antes de cerrar el Slice 2. No es una decisión de implementación.
- Aviso a los owners de las superficies que consumen `NexaInsightsBlock` antes del cutover, porque la severidad visible cambia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La query de paridad BigQuery↔PostgreSQL devuelve diferencia `0` para 2026-07, 2026-08 y 2026-09, y la evidencia está pegada en el PR.
- [ ] `EO-AIS-CE678BB43BE7` (la anomalía madre del caso de referencia) existe en `greenhouse_serving.ico_ai_signals`.
- [ ] Una corrida de proyección interrumpida a propósito en staging deja `delivery.ai_signals.projection_parity` en `error`; hay evidencia del ensayo.
- [ ] `nexa-insights-freshness` compara contra `greenhouse_serving.ico_ai_signals` y alerta por diferencia, no sólo por cero absoluto.
- [ ] Cada fila rechazada por la validación de la proyección queda registrada con `signal_id` y campo faltante.
- [ ] `resolveSignalSeverity` existe y es el único productor de severidad presentada; ningún consumer clasifica zonas por su cuenta.
- [ ] Un valor en zona crítica absoluta nunca se presenta con severidad más benigna; hay un test con `otd_pct = 20` y `z = −2,50` que resuelve `critical`.
- [ ] Un valor malo y estable (desviación ~0 en zona crítica) genera señal; hay un test.
- [ ] Un valor con `direction: 'improvement'` no eleva la severidad por desviación; hay un test.
- [ ] La contradicción de umbrales Contrato vs registry quedó resuelta con decisión documentada y un solo umbral vivo.
- [ ] Todo insight presentado declara `sampleSize`, `sampleBasis` y `trustState`; hay un test con el caso de 5 tareas que resuelve `insufficient`.
- [ ] Un insight con `qualityGateStatus: degraded` lo declara visiblemente en vez de presentarse como hecho limpio.
- [ ] `factPeriod` refleja el período de la señal; hay un test con una señal de agosto leída en septiembre.
- [ ] El prompt distingue el valor de la dimensión del valor del espacio, y prohíbe afirmar evolución temporal sin serie.
- [ ] La validación numérica rechaza una narrativa que cite un número ausente del payload; hay un test con el texto real de `EO-AIS-0B2CE34893B0`.
- [ ] Ningún texto publicado contiene un slug técnico de persona o proyecto.
- [ ] `recurrence` resuelve `recurring` con `sinceDate` 2026-08-20 para `EO-AIS-46A08F2D9C91`; hay un test.
- [ ] `quality_score` no aparece en ningún `ORDER BY` ni filtro del camino de presentación; `grep` lo confirma.
- [ ] El orden compuesto está congelado por un test con un set conocido de señales.
- [ ] El signal de calibración expone la brecha entre confianza declarada y error real por métrica.
- [ ] El comparativo shadow de ≥7 días fue extraído y revisado por un humano antes de encender el flag; la evidencia está en el PR o en `Handoff.md`.
- [ ] `ICO_INSIGHT_SEVERITY_V2_ENABLED` tiene fila en el ledger con sus runtimes declarados.
- [ ] `ISSUE-176` movido a `resolved/` con su verificación completa, y el tracker actualizado en el mismo lote.
- [ ] Las tres capas documentales quedaron creadas o actualizadas.

## Verification

- `pnpm vitest run src/lib/ico-engine/ai/`
- `pnpm local:check`
- `pnpm test` (suite completa) + `pnpm build` como gate de cierre
- Query de paridad por período contra BigQuery y PostgreSQL real
- Corrida de enrichment en staging con el flag apagado + extracción del comparativo shadow
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `ISSUE-176` cerrado y movido, con el tracker `docs/issues/README.md` actualizado
- [ ] `EPIC-048` actualizado con el estado real de esta hija
- [ ] Los criterios tildados corresponden a evidencia real; lo no verificado queda sin tildar con su razón escrita

## Follow-ups

- `contributionPct` se normaliza sobre los tres elegidos (`root-cause-analyzer.ts:87`), no sobre el total de la dimensión: siempre suma 100 % entre tres aunque expliquen una fracción. Task propia con backfill declarado.
- El cron re-materializa y re-enriquece tres meses cada día (`monthsBack: 3`), produciendo 15,7 re-narraciones por señal al mes (51,7 en junio). Evaluar acotar la ventana o saltar señales ya enriquecidas sin cambio de estado.
- La fórmula de confianza del predictor es sintética y no realimentada. Una vez observada la brecha (Slice 7), corregirla con evidencia.
- El denominador del OTD no ve la deuda arrastrada. Conversación de métrica con spec propia.
- `TASK-1074` (microcopy honesto de RpA suprimido) comparte vocabulario con `trustState`; alinear.

## Open Questions

- ¿Cuál es el umbral autoritativo de OTD crítico: `<90` del Contrato de Métricas o `0-70` del registry TypeScript? **Requiere decisión del operador antes de cerrar el Slice 2.** Afecta cuántos espacios quedan en rojo desde el día uno.
- ¿Un insight con `trustState: insufficient` se suprime del todo o se presenta en una sección aparte de "dato insuficiente"? Suprimir es más limpio; mostrar es más honesto sobre por qué no hay lectura. Decisión de producto.
- ¿La señal de "malo pero estable" debe emitirse una vez y quedarse, o re-emitirse por período mientras siga fuera de banda? Afecta directamente el volumen de alertas.
