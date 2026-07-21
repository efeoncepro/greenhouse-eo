# Pattern canonical — Property writeback `[GH] <metric>` — STUB

> **Status**: STUB
> **Next review trigger**: TASK-901 Slice 6 (writeback flag flip a producción) implementation
> **Last verified**: 2026-05-17

## Context

Pattern canonical para escribir métricas computadas Greenhouse de vuelta a Notion. Cubre:
- Single-page PATCH wrapping (con Notion-Version + Authorization + retry)
- Property value shape per type (number, rich_text, select, etc.)
- Read-only convention (operator NO debe editar `[GH] *` properties)
- Audit log persistence pre + post PATCH
- Outbox event emission post-success
- Diff detection (skip si valor igual al last)
- Error categorization (4xx → no retry, 5xx + 429 → retry, mistype → dead-letter)

Cuando TASK-901 S6 inicie, poblar con:
- Code skeleton completo (mirror output-templates/webhook-handler-template.md pero focused en writeback)
- Per-metric value type mapping (RpA = number, OTD = percent, etc.)
- Notion property permissions setup canonical (UI configuration)
- Reliability signal wire-up
- Operator runbook si writeback queda stuck (recovery procedure)

## Cross-refs hoy

- `use-cases-greenhouse/writeback-gh-metrics.md` — pipeline end-to-end
- `greenhouse-runtime/property-allowlist.md` — `[GH] <metric>` convention
- `patterns-canonical/bulk-patch-batching.md` — Cloud Tasks throttling
- `output-templates/writeback-projection-template.md` (también stub) — projection code skeleton
