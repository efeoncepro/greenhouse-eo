# Decision framework — Formula property vs Writeback canonical — STUB

> **Status**: STUB
> **Next review trigger**: Cualquier task que evalúe agregar métrica nueva (TASK-902 OTD, TASK-903 FTR, TASK-904 Cumplimiento, etc.)
> **Last verified**: 2026-05-17

## Context

Decision canonical Greenhouse post ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1` (2026-05-17):
- **NUNCA** crear formula property en Notion para métrica crítica ICO
- **SIEMPRE** compute en Greenhouse code + writeback property `[GH] <metric>`

Razones:
1. Formulas Notion son editables sin git, sin tests, sin code review
2. Bug class TASK-877: 3,168 Sky tasks con `rpa = null` 10 meses sin que nadie se enterara
3. Sin observability (no Sentry domain tag, no reliability signal)
4. Sin versioning de formula evolution
5. Sin auditabilidad (quién cambió la formula cuándo)
6. Drift cross-tenant silente

Decision tree:

```
¿Métrica es crítica (input a bonus payroll, KPI cliente, narrative reporting)?
    └── SÍ → Writeback canonical (NUNCA formula)

¿Métrica es operacional pura (display only, no downstream consumer)?
    └── SÍ → Formula Notion OK (simplicidad gana)

¿Métrica es trivial (cálculo single-property aritmético)?
    └── SÍ + sin downstream → Formula Notion OK
    └── SÍ + tiene downstream consumer → Writeback (futuro-proof)

¿Migration de formula existente a writeback?
    └── SÍ + es crítica → TASK derivada con pattern TASK-901 (strangler progressive)
    └── SÍ + non-critical → Defer, keep formula
```

Cuando TASK-902/903/904+ emergen, poblar con:
- Per-metric decision documented
- Cost-benefit analysis writeback vs formula
- Migration timeline estimate

## Cross-refs hoy

- ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1` — boundary canonical
- `anti-patterns-catalog.md` AP-13 — "Crear formula property crítica"
- TASK-901 (Greenhouse) — first writeback canonical pattern
