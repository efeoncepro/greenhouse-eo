# Pattern canonical — Idempotency keys + hash dedupe — STUB

> **Status**: STUB
> **Next review trigger**: TASK-901 Slice 4 (shadow mode) implementation — donde hash dedupe entra como capa 5 defense
> **Last verified**: 2026-05-17

## Context

Capa 5 del defense in depth (después de HMAC + echo-loop + allowlist + inbox dedup): **hash dedupe en writeback log**.

Cuando reactive consumer va a escribir `[GH] RpA`:
1. Compute canonical inputs hash = SHA-256(canonical_input_props_json)
2. Lookup `notion_metrics_writeback_log WHERE page_id = X AND input_hash = Y AND writeback_status = 'ok'`
3. Si hit → skip writeback (nada cambió relevante)
4. Si miss → enqueue Cloud Task

Beneficios:
- Idempotency garantizada cross-replay (re-run de outbox event = no-op)
- Reduce write pressure a Notion (sin diff = sin PATCH)
- Audit trail completo de "qué intentamos vs qué cambió"

Cuando TASK-901 S4 inicie, poblar este archivo con:
- Hash algorithm canonical exacto (SHA-256, canonical JSON serialization)
- Schema notion_metrics_writeback_log fields relevantes
- Query patterns optimal (index `(page_id, input_hash)` partial)
- Edge cases: hash collision (negligible 2^256), partial writes
- Cross-tenant key namespace (incluir tenant_id en hash?)

## Cross-refs hoy

- `patterns-canonical/echo-loop-filter.md` — capa 2
- `use-cases-greenhouse/writeback-gh-metrics.md` — pipeline donde dedupe entra
- `api-reference/webhooks-canonical.md` — capa 4 inbox dedup adjacent
