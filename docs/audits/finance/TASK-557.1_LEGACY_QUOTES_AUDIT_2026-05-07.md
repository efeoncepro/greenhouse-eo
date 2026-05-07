# TASK-557.1 Legacy Quotes Audit — 2026-05-07

## Scope

Audit operacional de `greenhouse_commercial.quotations` para evitar que quotes legacy/limbo contaminen `Comercial > Pipeline`.

## Runtime Evidence

- Entorno: Cloud SQL dev/staging compartido via `pnpm pg:connect:migrate` / scripts canonicos.
- Total inicial observado antes de la migracion: 53 quotations.
- `legacy_status IS NOT NULL`: 32.
- `finance_quote_id IS NULL`: 21, pero no se trata como limbo por si solo porque el write path canonico actual puede no crear mirror finance legacy.
- `current_version IS NULL`: 0; la columna es `NOT NULL DEFAULT 1`.
- `quotation_pipeline_snapshots` unidos a quotes con `legacy_status`: 22 antes del filtro dual.

## Classification

Dry-run del script:

| Categoria | Accion | Count |
| --- | --- | ---: |
| recoverable | review_normalize | 19 |
| excludable | mark_legacy_excluded | 14 |
| historical | mark_legacy_excluded | 11 |

## Cleanup Applied

- Script: `scripts/audit-legacy-quotes.ts`
- Dry-run report: `artifacts/task-557.1-legacy-quotes-audit-dry-run.csv` (local, no versionado)
- Apply report: `artifacts/task-557.1-legacy-quotes-audit-apply.csv` (local, no versionado)
- Rows actualizadas en apply: 25.
- Idempotency rerun: 0 actualizadas.
- Post-cleanup `legacy_excluded=true`: 25.
- Recoverables no excluidas: 19; quedan ocultas por `legacy_status IS NULL` hasta normalización humana.

## Design Decision

Las nuevas surfaces comerciales deben filtrar:

```sql
COALESCE(q.legacy_excluded, FALSE) = FALSE
AND q.legacy_status IS NULL
```

`legacy_excluded` cubre históricos/limbos finance-only. `legacy_status IS NULL` sigue cubriendo recoverables hasta que un operador normalice su estado canónico.

## Verification

- `pnpm pg:doctor` OK.
- `pnpm pg:connect:migrate` OK.
- Audit dry-run/apply/idempotency OK.
- `pnpm test src/lib/commercial/legacy-quotes-audit.test.ts src/lib/commercial-intelligence/__tests__/revenue-pipeline-reader.test.ts` OK.
- `pnpm exec tsc --noEmit --pretty false` OK.
