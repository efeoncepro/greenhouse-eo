# TASK-213 - ICO Metrics Hardening Program & Trust Model

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `Umbrella`
- Domain: `delivery / ico / agency`

## Summary

Crear la lane paraguas para robustecer `ICO Engine` como sistema de métricas confiables y como columna vertebral del marco `drivers operativos -> velocidad competitiva -> Revenue Enabled` definido en `Contrato_Metricas_ICO_v1`. Esta task coordina semántica canónica, calidad de insumo, benchmark policy, confidence metadata, métricas puente y propagación segura hacia `Agency` y otros consumers.

## Why This Task Exists

Hoy Greenhouse ya documentó:

- qué métricas tiene y calcula `ICO Engine`
- qué pregunta responde cada una
- qué benchmarks externos o análogos existen para `OTD`, `FTR`, `RpA` y otras métricas
- cuál es la doctrina norte del sistema en `Contrato_Metricas_ICO_v1` (`Revenue Enabled`, `TTM`, `Iteration Velocity`, `BCS`, `CVR`, tiers)

Pero el runtime todavía no institucionaliza de forma completa:

- cuándo un KPI es suficientemente confiable para mostrarse
- qué métricas tienen benchmark externo vs benchmark adaptado vs policy interna
- cómo separar valor calculado de calidad del dato y de interpretación de negocio
- cómo pasar del paquete actual de KPIs operativos a las métricas puente y a `Revenue Enabled`

## Goal

- Coordinar la ola de hardening de métricas `ICO` bajo un solo backlog institucional.
- Evitar que `Agency`, `Payroll`, `People` u otros consumers vuelvan a reinterpretar KPIs de forma local.
- Alinear child tasks ejecutables para semántica, `RpA`, trust model, métricas puente, `Revenue Enabled` y propagation.

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

- `docs/tasks/to-do/TASK-213-ico-metrics-hardening-trust-model.md`
- `docs/tasks/to-do/TASK-214-ico-completion-semantics-bucket-normalization.md`
- `docs/tasks/to-do/TASK-215-ico-rpa-reliability-source-policy-fallbacks.md`
- `docs/tasks/to-do/TASK-216-ico-metric-trust-model-benchmark-quality-gates.md`
- `docs/tasks/to-do/TASK-217-agency-kpi-trust-propagation-serving-semantics.md`
- `docs/tasks/to-do/TASK-218-ico-time-to-market-activation-evidence-contract.md`
- `docs/tasks/to-do/TASK-219-ico-iteration-velocity-experimentation-signal-contract.md`
- `docs/tasks/to-do/TASK-220-ico-brief-clarity-score-intake-governance.md`
- `docs/tasks/to-do/TASK-221-revenue-enabled-measurement-model-attribution-policy.md`
- `docs/tasks/to-do/TASK-222-creative-velocity-review-tiered-metric-surfacing.md`
- `docs/tasks/to-do/TASK-223-ico-methodological-accelerators-instrumentation.md`

## Current Repo State

### Ya existe

- inventario canónico de métricas y señales en `A.5.4`
- benchmarks externos y estándar recomendado en `A.5.5`
- endurecimiento base de completitud terminal
- live compute del mes en curso en `Agency > Delivery`
- existe doctrina estratégica fuerte de `Revenue Enabled`, `TTM`, `Iteration Velocity`, `BCS` y `CVR` en `Contrato_Metricas_ICO_v1`

### Gap actual

- no existe una lane institucional única para cerrar trust y serving semantics end-to-end
- no existe metadata runtime estándar para benchmark/confianza
- `RpA` sigue siendo la métrica más débil del paquete
- `TTM`, `Iteration Velocity`, `BCS` y `Revenue Enabled` aún no existen como carriles maduros equivalentes

## Scope

### Slice 1 - Program framing

- definir el paquete oficial de child tasks
- fijar dependencias y orden sugerido de ejecución

### Slice 2 - Cross-task alignment

- mantener alineadas arquitectura, tasks y criterios de cierre
- evitar solapes entre semántica, calidad de dato, trust model y UI propagation

### Slice 3 - North-star alignment

- asegurar que el backlog nuevo no se quede solo en hardening de `OTD/FTR/RpA`
- conectar explícitamente el roadmap con `TTM`, `Iteration Velocity`, `BCS`, `Revenue Enabled`, `CVR` y tiers de exposición

## Out of Scope

- recalibrar directamente todas las fórmulas del engine dentro de esta task paraguas
- implementar UI, serving o SQL productivo sin child task dedicada

## Acceptance Criteria

- [ ] La ola de hardening queda separada en child tasks ejecutables con un objetivo principal cada una
- [ ] El orden recomendado de ejecución queda documentado explícitamente
- [ ] Las dependencias entre semántica, calidad de dato, trust model y serving quedan claras
- [ ] La task paraguas deja explícito que benchmark/confianza no deben resolverse ad hoc en consumers
- [ ] La task paraguas deja explícito el camino hacia `Revenue Enabled`, no solo hacia KPIs operativos confiables

## Verification

- revisión manual de consistencia entre:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
