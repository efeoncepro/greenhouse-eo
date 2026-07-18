# Use case — Backfill histórico — STUB

> **Status**: STUB
> **Next review trigger**: TASK-901 Slice 8 implementation (3,200 Sky tasks desde Aug 2025)
> **Last verified**: 2026-05-17

## Context

One-shot operation para computar + writeback métrica para tareas pre-deployment de TASK-901. Caso canonical: Sky Airline tiene 3,200 tareas con `rpa = null` desde Aug 2025 (bug class TASK-877 follow-up — el sync legacy perdía el value).

Pattern canonical (TASK-901 S8):
```
1. Pre-condición: S6 verde 14+ días + signals steady + HR/Finance approval
2. Query BQ: SELECT page_id FROM Sky Tasks WHERE status IN ('Listo', 'Done', etc.) AND completed_at >= '2025-08-01'
3. For each batch de 100 → enqueue Cloud Tasks → bulk writeback (Cloud Tasks throttles a 2.5 req/sec)
4. Idempotente — hash dedupe skip si ya escribimos ese hash
5. Audit log per row con triggered_by='backfill'
6. Wall time estimate: ~30 sec total (con throttling)
7. Comunicar al equipo pre-ejecución (audit log Notion va a mostrar 3,200+ edits en pocos minutos)
```

Cuando TASK-901 S8 inicie, poblar este archivo con:
- Script canonical `scripts/notion-metrics/backfill-sky-historical.ts`
- Pre-flight checklist exact
- Reliability signal `notion-metrics-backfill-completion-percentage`
- Rollback procedure si emerge problema mid-backfill
- Communication template para equipo

## Cross-refs hoy

- TASK-901 S8 (Greenhouse) — backfill spec
- `patterns-canonical/bulk-patch-batching.md` — Cloud Tasks throttling
- `use-cases-greenhouse/writeback-gh-metrics.md` — same pipeline writeback
- `api-reference/rate-limits.md` — throughput estimation
