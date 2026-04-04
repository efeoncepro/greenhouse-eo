# TASK-213 - ICO Metrics Hardening Program & Trust Model

## Delta 2026-04-04 — Umbrella cerrada sobre runtime real

- `TASK-213` deja de operar como backlog aspiracional y queda cerrada como umbrella de rebaseline y convergencia.
- La task ya refleja que `TASK-214` a `TASK-223` quedaron cerradas y que la foundation trust del engine ya existe en código, serving y consumers.
- Cierre residual implementado en esta entrega:
  - `Creative Hub` ya no pierde la metadata trust de `throughput` al componer `Revenue Enabled`
  - `People > Person Intelligence` ya muestra estado de confianza y soporte de KPIs delivery usando el reader ICO trust-aware existente
  - `Agency > ICO Engine` ya hace visible una lectura compacta del `metricTrust` del `Performance Report` mensual
- El residual no cerrado dentro de esta umbrella queda explícitamente reducido a follow-ons especializados, no a foundations faltantes.

## Delta 2026-04-04

- La ola north-star cambió de estado real:
  - `TASK-218`, `TASK-219`, `TASK-220`, `TASK-221`, `TASK-222` y `TASK-223` ya están cerradas.
- Impacto para esta task:
  - la base doctrinal ya no es solo documental; existe runtime para `TTM`, `Iteration Velocity`, `BCS`, `Revenue Enabled`, `CVR` y aceleradores metodológicos.
  - cualquier hardening residual debe asumir esos contratos existentes y no volver a tratarlos como backlog aspiracional.
  - el foco real pasa a ser convergencia, cierre paraguas y eliminación de drift entre docs, engine, serving y consumers.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `Umbrella`
- Domain: `delivery / ico / agency`

## Summary

Mantener y cerrar la lane paraguas que endurece `ICO Engine` como sistema de métricas confiables y como columna vertebral del marco `drivers operativos -> velocidad competitiva -> Revenue Enabled` definido en `Contrato_Metricas_ICO_v1`. A esta altura la task ya no crea la primera foundation; rebaselina el programa sobre el runtime existente, fija el residual real y evita drift entre engine, serving, consumers y documentación viva.

## Why This Task Exists

Hoy Greenhouse ya no está en cero. El repo ya tiene:

- qué métricas tiene y calcula `ICO Engine`
- qué pregunta responde cada una
- qué benchmarks externos o análogos existen para `OTD`, `FTR`, `RpA` y otras métricas
- cuál es la doctrina norte del sistema en `Contrato_Metricas_ICO_v1` (`Revenue Enabled`, `TTM`, `Iteration Velocity`, `BCS`, `CVR`, tiers)
- trust metadata genérica en runtime
- propagation a serving y consumers visibles
- contratos runtime iniciales para las métricas north-star y para aceleradores metodológicos

El problema cambió. Ahora la necesidad de esta task es:

- dejar explícito qué parte de la ola ya quedó cerrada
- corregir la task paraguas para que no siga describiendo backlog que ya fue implementado
- identificar el residual real de convergencia y hardening sin reabrir workstreams ya cerrados
- evitar que consumers nuevos vuelvan a reinterpretar localmente confianza, benchmark o evidencia

## Goal

- Rebaselinar la ola de hardening de métricas `ICO` bajo un solo backlog institucional.
- Evitar que `Agency`, `Payroll`, `People`, `Performance Report` y consumers client-facing vuelvan a reinterpretar KPIs de forma local.
- Dejar explícito qué child tasks ya quedaron cerradas y cuál es el residual real de convergencia.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`

Reglas obligatorias:

- `shared.ts` sigue siendo la fuente canónica de fórmulas ejecutables del engine.
- `Agency` y otros consumers no deben duplicar lógica de cálculo de KPIs.
- `benchmark_type`, `confidence_level` y `quality_gate_status` deben modelarse como metadata de serving, no como fórmulas paralelas en UI.

## Dependencies & Impact

### Depends on

- `TASK-160` — `Agency Enterprise Hardening`
- `TASK-186` — Delivery metrics trust baseline
- `TASK-200` — metric semantic contract
- `TASK-205` — origin parity audit
- `TASK-207` — sync pipeline hardening
- `TASK-208` — data quality monitoring
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.4` y `A.5.5`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`

### Impacts to

- `Agency > Delivery`
- `Agency > Pulse`
- `People` / `ICO profile`
- `Payroll` KPI consumers
- `Performance Report`
- follow-ons futuros de `TASK-118`, `TASK-150`, `TASK-151`, `TASK-152`, `TASK-160`

### Files owned

- `docs/tasks/complete/TASK-213-ico-metrics-hardening-trust-model.md`
- `docs/tasks/complete/TASK-214-ico-completion-semantics-bucket-normalization.md`
- `docs/tasks/complete/TASK-215-ico-rpa-reliability-source-policy-fallbacks.md`
- `docs/tasks/complete/TASK-216-ico-metric-trust-model-benchmark-quality-gates.md`
- `docs/tasks/complete/TASK-217-agency-kpi-trust-propagation-serving-semantics.md`
- `docs/tasks/complete/TASK-218-ico-time-to-market-activation-evidence-contract.md`
- `docs/tasks/complete/TASK-219-ico-iteration-velocity-experimentation-signal-contract.md`
- `docs/tasks/complete/TASK-220-ico-brief-clarity-score-intake-governance.md`
- `docs/tasks/complete/TASK-221-revenue-enabled-measurement-model-attribution-policy.md`
- `docs/tasks/complete/TASK-222-creative-velocity-review-tiered-metric-surfacing.md`
- `docs/tasks/complete/TASK-223-ico-methodological-accelerators-instrumentation.md`

## Current Repo State

### Ya existe

- inventario canónico de métricas y señales en `A.5.4`
- benchmarks externos y estándar recomendado en `A.5.5`
- endurecimiento base de completitud terminal
- live compute del mes en curso en `Agency > Delivery`
- existe doctrina estratégica fuerte de `Revenue Enabled`, `TTM`, `Iteration Velocity`, `BCS` y `CVR` en `Contrato_Metricas_ICO_v1`
- existe trust registry runtime con `benchmarkType`, `qualityGateStatus`, `confidenceLevel` y evidencia reusable
- `greenhouse_serving.ico_member_metrics` y `greenhouse_serving.agency_performance_reports` ya persisten `metric_trust_json`
- `Agency`, `People`, `Payroll`, campañas y `Creative Hub` ya consumen parte sustantiva de la foundation o de sus lanes derivadas

### Gap actual

- resuelto en esta entrega:
  - rebaseline de la task paraguas contra el runtime real
  - cierre del drift de lifecycle y paths para `TASK-218` a `TASK-223`
  - surfacing visible adicional de trust semantics en `People`, `Agency` y `Creative Hub`
- residual futuro:
  - `Payroll` sigue siendo carril trust-aware principalmente para `RpA`; ampliar esa persistencia merece follow-on propio y no reabre esta umbrella

## Scope

### Slice ejecutado

- rebaseline programático de la umbrella contra el runtime real
- alineación cruzada entre task, índice, handoff y arquitectura viva
- convergencia visible adicional en `People`, `Agency` y `Creative Hub`

## Out of Scope

- reabrir workstreams ya cerrados solo para reproducir lo que el repo ya hace
- recalibrar directamente todas las fórmulas del engine dentro de esta task paraguas
- inventar una lane paralela de trust para north-star metrics sin justificar por qué el carril actual no sirve

## Acceptance Criteria

- [x] La task paraguas queda corregida contra el runtime real del repo
- [x] El estado de `TASK-214` a `TASK-223` queda reflejado correctamente
- [x] Las dependencias entre semántica, calidad de dato, trust model, serving y north-star lanes quedan claras
- [x] La task paraguas deja explícito que benchmark/confianza/evidencia no deben resolverse ad hoc en consumers
- [x] El residual real de convergencia queda documentado sin volver a tratar métricas ya implementadas como backlog aspiracional

## Verification

- revisión manual de consistencia entre:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- `pnpm exec vitest run src/views/greenhouse/people/tabs/PersonIntelligenceTab.test.tsx src/lib/capability-queries/creative-cvr.test.ts src/lib/ico-engine/creative-velocity-review.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src`
