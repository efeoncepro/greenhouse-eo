# Template canonical — Writeback projection skeleton — STUB

> **Status**: STUB
> **Next review trigger**: TASK-901 Slice 4 (reactive consumer shadow mode) implementation start
> **Last verified**: 2026-05-17

## Context

Skeleton del reactive consumer canonical (registered en `ProjectionDefinition`) que consume outbox event `notion.task.metrics_recompute_requested v1` y dispara writeback flow.

Cuando TASK-901 S4 inicie, poblar con código TS completo del pattern:

```typescript
// src/lib/sync/projections/notion-metrics-writeback.ts (skeleton TBD)
import { registerProjection } from './index'

registerProjection({
  name: 'notion-metrics-writeback-rpa',
  triggerEvents: ['notion.task.metrics_recompute_requested'],
  extractScope: (event) => ({
    pageId: event.payload.pageId,
    databaseId: event.payload.databaseId,
    metricName: event.payload.metricName
  }),
  refresh: async (scope) => {
    // 1. Re-fetch from Notion API
    // 2. Extract canonical inputs
    // 3. Call calculateRpa(inputs)
    // 4. Hash dedupe check
    // 5. If diff → enqueue Cloud Task
    // 6. Persist writeback_log
    // 7. Shadow mode: NO PATCH (just log paridad)
    // 8. Post-flag-flip: enqueue actual PATCH
  },
  maxRetries: 5
})
```

## Cross-refs hoy

- `use-cases-greenhouse/writeback-gh-metrics.md` — pipeline end-to-end
- `patterns-canonical/property-writeback.md` (también stub)
- `patterns-canonical/idempotency-keys.md` (también stub)
- `output-templates/webhook-handler-template.md` — handler skeleton (predecesor)
- CLAUDE.md § "Finance — Reactive projections" (TASK-771) — pattern fuente
