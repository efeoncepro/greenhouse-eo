# TASK-239 — Nexa Advisory: Prompt Enrichment con Glosario de Métricas y Cadena Causal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-239-nexa-advisory-prompt-enrichment`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Enriquecer el prompt del LLM de Nexa Advisory con el glosario de métricas ICO, la cadena causal y la instrucción de doble capa narrativa (técnica + bajada operativa), para que Gemini genere insights con nombres reales de métricas en inglés, conecte impacto entre métricas, y traduzca a lenguaje operativo comprensible. También agregar `shortName` al metric registry para que la UI muestre nombres operativos (`RpA`, `OTD%`, `FTR%`) en vez de códigos técnicos.

## Why This Task Exists

TASK-232 implementó la lane LLM del ICO Engine y TASK-235 la conectó a la UI como Nexa Advisory. Pero el prompt actual le pasa la señal raw al LLM con `metricName: "ftr_pct"` y Gemini repite ese código técnico en las narrativas. El resultado:

- Las explicaciones dicen "ftr_pct cayó a 69%" en vez de "FTR% cayó a 69%"
- No hay conexión causal — el LLM no sabe que FTR% ↓ presiona RpA ↑ → Cycle Time ↑ → Throughput ↓
- No hay bajada operativa — un operador que no conoce las métricas no entiende qué significa la señal
- La UI muestra `ftr_pct` en los chips de métrica en vez de `FTR%`

Todo el conocimiento necesario ya existe en el repo: el contrato de métricas (`Contrato_Metricas_ICO_v1.md`), el metric registry (`metric-registry.ts`), y los signal types (`ai/types.ts`). Solo falta inyectarlo al prompt y exponer `shortName` en el registry.

## Goal

- El prompt del LLM incluye un glosario dinámico generado desde `ICO_METRIC_REGISTRY` con nombre operativo, descripción, unidad y dirección deseada
- El prompt incluye la cadena causal formal (BCS → FTR → RpA → CT → TTM → RE) para que Gemini conecte impacto entre métricas
- El prompt instruye doble capa narrativa: (1) impacto técnico entre métricas, (2) bajada operativa para no-expertos
- Los nombres de métricas en las narrativas usan inglés operativo (`RpA`, `OTD%`, `FTR%`, `Cycle Time`) — las explicaciones van en español con spanglish natural
- El metric registry expone `shortName` y la UI (`NexaInsightsBlock`) lo usa para los chips de métrica
- Los enrichments existentes se re-materializan con el prompt nuevo para que las narrativas reflejen los cambios

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Contrato_Metricas_ICO_v1.md` — fuente de verdad para nombres, categorías, cadena causal y niveles de métricas
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — contrato del engine, lane LLM, advisory-only semantics
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` — consumers downstream del advisory

Reglas obligatorias:

- El glosario en el prompt se genera dinámicamente desde `ICO_METRIC_REGISTRY` — nunca se hardcodea un map paralelo de nombres
- La cadena causal se define como constante derivada del contrato de métricas, no como texto libre en el prompt
- El prompt sigue siendo `advisory-only` e `internal-only` — no cambia la semántica del enrichment, solo la calidad narrativa
- `shortName` es el nombre operativo corto de la métrica en inglés tal como se usa en el equipo (`RpA`, `OTD%`, `FTR%`)
- El `label` actual del registry (español) se mantiene intacto para tooltips y otros contextos
- Los signal types (`anomaly`, `root_cause`, etc.) y dimensiones (`member`, `project`, `phase`) también se traducen en el glosario del prompt usando labels de `GH_NEXA`

## Normative Docs

- `docs/tasks/complete/TASK-232-ico-llm-quality-scoring-explanation-pipeline.md` — lane LLM original
- `docs/tasks/complete/TASK-235-agency-ico-llm-insights-ui.md` — surfacing UI + pipeline fixes
- `docs/architecture/Contrato_Metricas_ICO_v1.md` §4 (Drivers operativos), §5 (Cadena causal), §12 (Glosario)

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/metric-registry.ts` — fuente de definiciones de métricas (ya existe, se extiende)
- `src/lib/ico-engine/ai/llm-provider.ts` — builder del prompt (ya existe, se modifica)
- `src/lib/ico-engine/ai/llm-types.ts` — prompt template y hash (ya existe, se modifica)
- `src/components/greenhouse/NexaInsightsBlock.tsx` — UI que muestra insights (ya existe, se actualiza)
- `src/config/greenhouse-nomenclature.ts` — `GH_NEXA` namespace con signal types y labels (ya existe)

### Blocks / Impacts

- Todos los consumers de Nexa Advisory se benefician automáticamente (Agency ICO, future Space 360, Organization)
- El prompt hash cambia → los enrichments futuros tienen un prompt version distinto (auditable)
- Los enrichments históricos no cambian — solo los nuevos runs generan narrativas mejoradas

### Files owned

- `src/lib/ico-engine/metric-registry.ts` — agregar `shortName` a `MetricDefinition` y a cada métrica
- `src/lib/ico-engine/ai/llm-provider.ts` — enriquecer `buildSignalPrompt()` con glosario + cadena causal + instrucciones
- `src/lib/ico-engine/ai/llm-types.ts` — actualizar prompt template (cambia prompt hash)
- `src/components/greenhouse/NexaInsightsBlock.tsx` — usar `shortName` para chip de métrica

## Current Repo State

### Already exists

- `ICO_METRIC_REGISTRY` con 11 métricas definidas con `id`, `code`, `label`, `description`, `unit`, `thresholds`, `higherIsBetter` — `src/lib/ico-engine/metric-registry.ts`
- `getMetricById(id)` helper — `src/lib/ico-engine/metric-registry.ts:466`
- `buildSignalPrompt(signal)` que serializa la señal como JSON y la envía a Gemini — `src/lib/ico-engine/ai/llm-provider.ts:53`
- `ICO_LLM_PROMPT_TEMPLATE` con instrucciones base del prompt — `src/lib/ico-engine/ai/llm-types.ts:122`
- `toSerializableSignalSnapshot(signal)` que convierte la señal a JSON serializable — `src/lib/ico-engine/ai/llm-types.ts:137`
- `GH_NEXA.signal_type` con labels de tipos de señal — `src/config/greenhouse-nomenclature.ts`
- `NexaInsightsBlock` con `getMetricDisplayName()` que hoy usa `getMetricById(id).label` (español) — `src/components/greenhouse/NexaInsightsBlock.tsx`
- Contrato de métricas con categorización formal (drivers, puente, RE), cadena causal, glosario — `docs/architecture/Contrato_Metricas_ICO_v1.md`
- 14 enrichments succeeded en PostgreSQL serving con narrativas que usan `ftr_pct` en vez de `FTR%`

### Gap

- `MetricDefinition` no tiene campo `shortName` — no hay forma de obtener el nombre operativo corto
- El prompt no incluye glosario de métricas — Gemini no sabe que `ftr_pct` es "FTR% (First Time Right)"
- El prompt no incluye cadena causal — Gemini no conecta que FTR% ↓ → RpA ↑ → CT ↑ → Throughput ↓
- El prompt no instruye doble capa narrativa — no hay bajada operativa para no-expertos
- La señal viaja con `metricName: "ftr_pct"` sin `metricDisplayName` — Gemini repite el código
- La UI muestra "Primera entrega correcta" (label en español) en vez de "FTR%" en los chips
- Mismatch de keys: las señales AI usan `rpa_avg` pero el registry usa `rpa` como id

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

### Slice 1 — shortName en metric registry + UI update

- Agregar `shortName: string` a `MetricDefinition` interface en `metric-registry.ts`
- Agregar `shortName` a cada una de las 11 métricas del `ICO_METRIC_REGISTRY`:
  - `rpa` → `'RpA'`
  - `otd_pct` → `'OTD%'`
  - `ftr_pct` → `'FTR%'`
  - `cycle_time` → `'Cycle Time'`
  - `cycle_time_variance` → `'Cycle Time Variance'`
  - `throughput` → `'Throughput'`
  - `pipeline_velocity` → `'Pipeline Velocity'`
  - `csc_distribution` → `'CSC Distribution'`
  - `stuck_assets` → `'Stuck Assets'`
  - `stuck_asset_pct` → `'Stuck %'`
  - `overdue_carried_forward` → `'OCF'`
- Actualizar `getMetricDisplayName()` en `NexaInsightsBlock.tsx` para usar `shortName` en vez de `label`
- Mantener fallback robusto: `shortName ?? label ?? id` y manejar mismatch `rpa_avg` → `rpa`

### Slice 2 — Prompt enrichment con glosario, cadena causal e instrucciones

- Definir constante `ICO_METRIC_GLOSSARY_LINES` generada dinámicamente desde `ICO_METRIC_REGISTRY.map(m => ...)` con formato: `código / alias → shortName (description) [unit, dirección deseada]`
- Incluir alias conocidos en el glosario (ej: `rpa_avg` también mapea a `RpA`)
- Definir constante `ICO_CAUSAL_CHAIN_LINES` con la cadena causal formal del contrato §5:
  - `BCS ↑ → FTR% ↑ → RpA ↓ → Cycle Time ↓ → TTM ↓ → Revenue Enabled ↑`
  - Incluir conexiones directas: `FTR% ↑ → Throughput ↑`, `OTD% ↑ → TTM ↓`
- Agregar instrucciones al prompt:
  - "Usa siempre el nombre operativo de la métrica en inglés (ej: FTR%, RpA, OTD%), nunca el código técnico (ej: ftr_pct, rpa_avg)"
  - "Explica primero el impacto técnico: qué métrica se desvió, cuánto, y qué otras métricas presiona según la cadena causal"
  - "Luego traduce a lenguaje operativo: qué significa esto para alguien que no conoce las métricas (ej: 'más piezas requieren correcciones, consumiendo capacidad del equipo')"
  - "Escribe en español con los nombres de métricas en inglés (spanglish natural del equipo)"
- Enriquecer el JSON de la señal con `metricDisplayName` derivado de `getMetricById(signal.metricName)?.shortName`
- Actualizar `ICO_LLM_PROMPT_TEMPLATE` para incluir el glosario y la cadena causal
- El prompt hash cambia automáticamente al cambiar el template (ya funciona así via `buildIcoLlmPromptHash()`)

### Slice 3 — Re-materialización de enrichments

- Correr el pipeline LLM para los períodos con señales (Feb, Mar, Abr 2026) para regenerar narrativas con el prompt nuevo
- Verificar que las nuevas narrativas usan nombres operativos y doble capa
- Verificar en staging que la UI muestra los insights mejorados

## Out of Scope

- Cambiar la lógica de detección de señales AI (anomalías, predicciones, root causes)
- Modificar el modelo LLM o el provider policy (`Gemini 2.5 Flash`)
- Agregar nuevas métricas al registry (solo se agrega `shortName` a las existentes)
- Cambiar la estructura de la tabla `ico_ai_signal_enrichments` o `ico_ai_enrichment_runs`
- Modificar el contrato de métricas `Contrato_Metricas_ICO_v1.md` (se consume, no se cambia)
- Surfacing de cadena causal en la UI (eso sería una task futura — el LLM la usa internamente)
- Modificar `label` existente en el registry (se mantiene en español para tooltips)

## Detailed Spec

### Glosario dinámico (generado en runtime)

```typescript
// En llm-provider.ts o llm-types.ts
const buildMetricGlossary = (): string => {
  const lines = ICO_METRIC_REGISTRY.map(m =>
    `- ${m.code} → ${m.shortName} — ${m.description} [${m.unit}, ${m.higherIsBetter ? '↑ mejor' : '↓ mejor'}]`
  )
  // Agregar aliases conocidos
  lines.push('- rpa_avg → RpA (alias de rpa)')
  return lines.join('\n')
}
```

### Cadena causal (constante)

```typescript
const ICO_CAUSAL_CHAIN = [
  'BCS ↑ → FTR% ↑ → RpA ↓ → Cycle Time ↓ → TTM ↓ → Revenue Enabled ↑',
  'FTR% ↑ → Throughput ↑ → Throughput Expandido (RE)',
  'OTD% ↑ → TTM ↓ → Early Launch Advantage (RE)',
  'RpA ↓ → menor costo de producción → Throughput ↑'
].join('\n')
```

### Instrucciones al LLM (se agregan al prompt template)

```
Glosario de métricas ICO (usa siempre el nombre operativo, nunca el código):
${buildMetricGlossary()}

Cadena causal entre métricas (usa para conectar impacto):
${ICO_CAUSAL_CHAIN}

Reglas de narrativa:
- Usa el nombre operativo de la métrica en inglés (FTR%, RpA, OTD%). Nunca el código técnico (ftr_pct, rpa_avg).
- Estructura la explicación en dos partes:
  1. Impacto técnico: qué métrica se desvió, cuánto, y qué otras métricas presiona según la cadena causal.
  2. Bajada operativa: qué significa esto para alguien que no conoce las métricas — en términos de equipo, entregas y capacidad.
- Escribe en español con nombres de métricas en inglés (spanglish natural).
```

### Señal enriquecida en el JSON

```typescript
// En buildSignalPrompt(), agregar al JSON serializado:
const metricDef = getMetricById(signal.metricName) ?? getMetricById(signal.metricName.replace('_avg', ''))
const enrichedSignal = {
  ...signal,
  metricDisplayName: metricDef?.shortName ?? signal.metricName,
  metricDescription: metricDef?.description ?? null,
  metricUnit: metricDef?.unit ?? null,
  metricDirection: metricDef ? (metricDef.higherIsBetter ? 'higher is better' : 'lower is better') : null
}
```

### Ejemplo de output esperado del LLM (después del cambio)

```json
{
  "qualityScore": 85,
  "explanationSummary": "El FTR% cayó a 69.6% en marzo, significativamente por debajo del 98.2% esperado. Esto presiona RpA al alza porque más piezas requieren rondas adicionales de corrección, y puede impactar el Cycle Time y Throughput del período. En términos operativos, el equipo está dedicando más tiempo a correcciones que a producción nueva, lo que reduce la cantidad de iniciativas que pueden entregarse este mes.",
  "rootCauseNarrative": "La caída del FTR% se concentra en el proyecto '31239c2f' donde el porcentaje bajó de 98% a 69.6%. El miembro 'andres-carlosama' contribuye significativamente con un 53.4% de la desviación. Esto indica un problema localizado de alineación con el brief o de complejidad del entregable, no una degradación sistémica.",
  "recommendedAction": "Revisar los briefs y criterios de aprobación del proyecto afectado. Evaluar si la carga de andres-carlosama permite calidad en primera entrega o si requiere redistribución.",
  "confidence": 0.85
}
```

### Impacto en tokens

| Concepto | Sin glosario | Con glosario | Delta |
|----------|-------------|-------------|-------|
| Tokens input/señal | ~480 | ~850 | +370 |
| 14 señales/run | ~6,700 | ~11,900 | +5,200 |
| Costo extra/run (Flash) | — | — | ~$0.0008 |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `MetricDefinition` tiene campo `shortName` y las 11 métricas del registry lo tienen asignado
- [ ] El prompt del LLM incluye glosario dinámico generado desde `ICO_METRIC_REGISTRY`
- [ ] El prompt incluye la cadena causal formal del contrato de métricas
- [ ] El prompt instruye doble capa narrativa (técnica + bajada operativa)
- [ ] La señal enviada al LLM incluye `metricDisplayName` derivado del registry
- [ ] Los enrichments regenerados usan nombres operativos (`FTR%`, `RpA`, `OTD%`) en vez de códigos (`ftr_pct`, `rpa_avg`)
- [ ] Los enrichments regenerados incluyen conexión causal y bajada operativa
- [ ] La UI (`NexaInsightsBlock`) muestra `shortName` en el chip de métrica
- [ ] `pnpm build` y `pnpm lint` sin errores
- [ ] Ningún `label` existente del registry se modifica (se mantienen en español)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- Validación manual: correr el pipeline LLM para 1 señal y verificar que la narrativa usa nombres operativos, cadena causal y doble capa
- Validación visual en staging: `/agency?tab=ico` → Nexa Advisory → chips de métrica muestran `FTR%` no `ftr_pct`

## Closing Protocol

- [ ] Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` — agregar delta documentando el enriquecimiento del prompt con glosario y cadena causal
- [ ] Actualizar `docs/changelog/CLIENT_CHANGELOG.md` si las narrativas mejoradas son visibles en staging

## Follow-ups

- Evaluar surfacing visual de la cadena causal en la UI (ej: tooltip que muestre `FTR% ↓ → RpA ↑ → CT ↑`)
- Evaluar si el glosario debería incluir métricas de velocidad competitiva (TTM, Creative Throughput, Iteration Velocity) cuando el engine las materialice
- Evaluar prompt tuning basado en feedback de operadores sobre la calidad de la doble capa narrativa

## Open Questions

- ¿Los nombres operativos propuestos (`RpA`, `OTD%`, `FTR%`, `Cycle Time`, `Throughput`, `Pipeline Velocity`, `Stuck Assets`, `Stuck %`, `OCF`, `CSC Distribution`) son correctos o el equipo usa variantes distintas?
