# Pattern canonical — Rate limit handling detallado — STUB

> **Status**: STUB
> **Next review trigger**: TASK-901 Slice 5 (Cloud Tasks queue setup) implementation start
> **Last verified**: 2026-05-17

## Context

`api-reference/rate-limits.md` cubre límites + pattern canonical Cloud Tasks. Este archivo poblará detail adicional cuando TASK-901 S5 inicie implementación:
- Backoff math exacto (exponencial base, jitter formula)
- Distributed rate limiting cross-services (si múltiples consumers concurrent)
- Per-tenant rate budget (Efeonce + Sky + Demo comparten 3 req/sec global)
- Cloud Tasks queue tuning observado en producción
- Reliability signal `notion_api_429_count` threshold tuning

## Cross-refs hoy

- `api-reference/rate-limits.md` — pattern canonical actual
- `patterns-canonical/bulk-patch-batching.md` — Cloud Tasks setup
- `api-reference/error-handling.md` — 429 specific
