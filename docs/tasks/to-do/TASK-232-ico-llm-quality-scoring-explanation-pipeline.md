# TASK-232 — ICO LLM Quality Scoring & Explanation Pipeline

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ico-engine / ai`
- Blocked by: `none`
- Branch: `task/TASK-232-ico-llm-quality-scoring-explanation-pipeline`
- GitHub Issue: `[pending]`

## Summary

Activar la lane LLM async del `ICO Engine` para que opere la capa de inteligencia embebida sin convertirse en chat. Debe consumir señales y artefactos ya materializados, ejecutar scoring y explicación auditable fuera del request path, y persistir resultados reutilizables por `Agency`, `Ops Health` y `Nexa` sin bloquear el materializer crítico.

## Why This Task Exists

`TASK-118` ya dejó lista la foundation determinística: `ai_signals`, `ai_prediction_log`, proyección BQ -> PG y consumers base. Lo que sigue faltando es el carril generativo que haga reasoning sobre esa base de forma segura:

- hoy no existe worker async para explicaciones o scoring LLM post-materialización
- `Nexa` ya usa Gemini, pero su contrato es conversacional y síncrono; no sirve como backbone del AI Core operativo
- `ai_metric_scores` existe como carril auditable, pero no hay una policy runtime clara para usarlo como enrichment de esta capa
- sin persistencia de `model_id`, `prompt_version`, `confidence`, `tokens` y fallbacks, la capa LLM sería opaca y riesgosa para consumers downstream

## Goal

- Crear un pipeline async auditable para enrichment LLM del `ICO Engine`
- Activar `ai_metric_scores` y/o un carril equivalente de explicaciones persistidas sin recalcular métricas inline
- Dejar una provider/model policy explícita para esta lane, alineada con `Vertex AI` y el baseline `Gemini` ya operativo en el repo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- La lane LLM es `advisory-only`, `internal-only` y nunca reemplaza el cálculo base del `ICO Engine`.
- El worker corre fuera de `materializeMonthlySnapshots()`; si falla, el materializer principal sigue sano.
- Toda lectura sigue el backbone `materialized-first`; nunca recalcular KPIs inline ni saltarse `space_id`.
- Reutilizar `Vertex AI` + credenciales GCP existentes del repo salvo que la task documente formalmente un provider policy diferente.
- Persistir metadata auditable mínima por generación: `model_id`, `prompt_version`, `prompt_hash`, `confidence`, `tokens`, `latency`, `status`.
- No usar `NexaService` ni `/api/home/nexa` como orquestador del pipeline async.

## Normative Docs

- `docs/tasks/in-progress/TASK-118-ico-ai-core-embedded-intelligence.md`
- `docs/tasks/complete/TASK-220-ico-brief-clarity-score-intake-governance.md`
- `docs/tasks/complete/TASK-223-ico-methodological-accelerators-instrumentation.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/in-progress/TASK-118-ico-ai-core-embedded-intelligence.md`
- `src/lib/ico-engine/ai/materialize-ai-signals.ts`
- `src/lib/ico-engine/ai/read-signals.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/sync/projections/ico-ai-signals.ts`
- `src/lib/sync/event-catalog.ts`
- `src/config/nexa-models.ts`
- `src/lib/nexa/nexa-service.ts`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-150-space-health-score.md`
- `docs/tasks/to-do/TASK-151-space-risk-score.md`
- `docs/tasks/to-do/TASK-152-anomaly-detection-engine.md`
- `docs/tasks/to-do/TASK-154-revenue-pipeline-intelligence.md`
- `docs/tasks/to-do/TASK-155-scope-intelligence.md`
- `docs/tasks/to-do/TASK-159-nexa-agency-tools.md`

### Files owned

- `src/lib/ico-engine/ai/`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/`
- `[verificar] src/lib/ico-engine/ai/llm-quality-scoring.ts`
- `[verificar] src/lib/ico-engine/ai/llm-explanation-worker.ts`
- `[verificar] src/lib/ico-engine/ai/llm-provider.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Already exists

- `src/lib/ico-engine/ai/materialize-ai-signals.ts` ya materializa anomalías, predicciones, root cause y recomendaciones determinísticas
- `src/lib/ico-engine/ai/read-signals.ts` ya entrega señales recientes para consumers downstream
- `src/lib/sync/projections/ico-ai-signals.ts` ya proyecta `ai_signals` hacia `greenhouse_serving`
- `src/lib/sync/event-catalog.ts` ya define `ico.ai_signals.materialized`
- `src/config/nexa-models.ts` y `src/lib/nexa/nexa-service.ts` ya prueban baseline operativo con modelos `google/gemini-*`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` ya reserva `ai_metric_scores` como carril auditable y explicita un Slice 6 de `Quality Scoring` con LLM

### Gap

- No existe un worker async del `ICO Engine` para consumir `ai_signals` y producir scoring o explicación generativa auditable
- No existe contrato runtime para versionar prompts, provider policy, costos y fallback de esta lane
- No existe persistencia operativa clara para explanations/recommendations LLM desacopladas del chat
- Los consumers downstream siguen limitados a señales determinísticas o surfaces conversacionales, sin una capa generativa materialized-first propia del engine

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

### Slice 1 — Execution contract + audit trail

- Definir el trigger async que nace desde `ico.ai_signals.materialized` o desde un carril batch equivalente sin bloquear `materialize.ts`
- Formalizar el contrato de ejecución: idempotencia, retries, dead-letter/manual retry, status de run y metadata auditable por generación
- Elegir durante Discovery si el output vive solo en `ico_engine.ai_metric_scores` o si requiere una tabla auditada complementaria bajo `ico_engine`

### Slice 2 — Provider/model policy

- Implementar una capa provider-aware para esta lane reutilizando `Vertex AI` y el baseline `Gemini` ya existente en el repo
- Versionar prompts y definir guardrails de costo, timeout y fallback no bloqueante
- Dejar explícito que `NexaService` es consumidor opcional posterior, no el runtime de esta pipeline

### Slice 3 — Quality scoring + explanations

- Generar outputs estructurados sobre inputs ya materializados del engine: scoring LLM, explicaciones resumidas, root-cause narrative y recomendación accionable
- Persistir cada output con vínculo a `space_id`, `signal_id` o entidad equivalente, junto con `confidence`, `model_id`, `prompt_version` y `processed_at`
- Reutilizar `ai_metric_scores` cuando el deliverable sea score por métrica; solo abrir storage nuevo si el payload explicativo no cabe en el contrato existente

### Slice 4 — Downstream readers and serving policy

- Exponer readers o helpers backend reutilizables para `Agency`, `Ops Health` y `Nexa` sin duplicar queries ni recalcular resultados
- Definir si hace falta proyección BQ -> PG adicional para serving o si basta con lectura directa materialized-first
- Mantener tenant isolation estricta por `space_id` en cada query, projection y reader

### Slice 5 — Observability, calibration and docs

- Instrumentar métricas de throughput, error rate, token/cost budget y freshness del worker
- Documentar provider policy, contratos de persistencia y reglas de consumo en `Greenhouse_ICO_Engine_v1.md`
- Actualizar tasks impactadas (`TASK-150` a `TASK-159`) con delta si el cierre de esta lane cambia sus supuestos

## Out of Scope

- Convertir esta lane en chat, assistant UI o extensión de `/api/home/nexa`
- Reescribir `TASK-118` o mover el materializer crítico a un proveedor LLM
- Introducir cálculo inline de KPIs o bypass del `ICO Engine`
- Abrir surfaces client-facing con narrativa generativa en esta fase

## Detailed Spec

- Inputs candidatos ya existentes:
  - `ico_engine.ai_signals`
  - `ico_engine.ai_prediction_log`
  - `ico_engine.metric_snapshots_monthly`
  - `ico_engine.ai_metric_scores`
- Provider baseline recomendado:
  - `Vertex AI` con modelos `google/gemini-*` ya soportados en el repo
  - la Discovery debe decidir si la policy queda fija a `Gemini 2.5 Flash` o si se define una matriz por métrica
- Metadata mínima por run:
  - `space_id`
  - `signal_id` o entidad equivalente
  - `model_id`
  - `prompt_version`
  - `prompt_hash`
  - `confidence`
  - `tokens_in`
  - `tokens_out`
  - `latency_ms`
  - `status`
  - `processed_at`
- Policy de consumo:
  - `Agency`, `Ops Health` y `Nexa` consumen salida persistida
  - ninguna surface puede depender de una llamada LLM síncrona para renderizar su dato base

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un trigger async documentado e implementado para la lane LLM del `ICO Engine`
- [ ] La ejecución LLM no bloquea `materializeMonthlySnapshots()` ni rompe `TASK-118`
- [ ] Cada output persistido incluye metadata auditable de modelo, prompt, confidence y costo/latencia
- [ ] `ai_metric_scores` y/o el storage elegido queda integrado al runtime con tenant isolation por `space_id`
- [ ] `Agency`, `Ops Health` o `Nexa` pueden consumir esta salida sin usar `NexaService` como backend del pipeline
- [ ] La arquitectura `Greenhouse_ICO_Engine_v1.md` queda actualizada con provider policy, storage y fallback rules

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- Validación manual del flujo `materialize -> trigger async -> persistencia -> reader`

## Closing Protocol

- [ ] Actualizar `docs/tasks/to-do/TASK-150-space-health-score.md` a `docs/tasks/to-do/TASK-159-nexa-agency-tools.md` si alguno de sus supuestos cambia con esta lane
- [ ] Documentar en `Handoff.md` qué provider/model policy quedó activa para el AI Core async

## Follow-ups

- Conectar esta lane con scoring compuesto en `TASK-150` y `TASK-151` cuando exista calibración suficiente
- Evaluar si las explicaciones LLM requieren una projection PG dedicada o si basta con lectura directa desde BigQuery
- Evaluar provider-per-metric solo después de tener baseline y costos reales con `Gemini`
