# ISSUE-007 — Finance fallback writes can duplicate income and expenses

## Ambiente

preview + production

## Detectado

2026-04-05, auditoría de código del módulo Finance

## Síntoma

Si el path Postgres-first fallaba después de generar el ID o en una zona gris de confirmación, los endpoints de creación de `income` y `expenses` podían caer al fallback BigQuery y persistir un segundo registro lógico con otro `incomeId` / `expenseId`.

## Causa raíz

Los endpoints recalculaban el identificador mensual en el fallback BigQuery aun cuando el path Postgres-first ya había generado uno antes del error.

Antes del fix:

- `POST /api/finance/income` generaba un ID con `buildMonthlySequenceIdFromPostgres(...)` para PostgreSQL y luego otro distinto con `buildMonthlySequenceId(...)` para BigQuery fallback.
- `POST /api/finance/expenses` repetía el mismo patrón.

Eso abría una ventana de divergencia cross-store y de duplicación lógica si el write Postgres fallaba en una zona ambigua después de haber asignado el primer ID.

## Impacto

- Riesgo de duplicar ingresos o gastos lógicos entre stores con IDs distintos.
- Retries del usuario o del caller podían dejar datos inconsistentes y difíciles de reconciliar.
- Downstream readers podían observar registros diferentes según el store disponible.

## Solución

Se corrigieron los create routes de Finance para reutilizar un ID canónico por request:

- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/expenses/route.ts`

Nuevo contrato runtime:

- si el request ya trae `incomeId` / `expenseId`, ese ID se preserva
- si el path Postgres-first alcanza a generar un ID, ese mismo ID se reutiliza en el fallback BigQuery
- solo si no existía ID previo y no se pudo generar en el carril Postgres, el fallback BigQuery puede asignar uno propio

Además se agregó regresión automatizada en:

- `src/app/api/finance/fallback-id-reuse.test.ts`

La suite valida que el fallback ya no recalcula un segundo ID cuando el write Postgres falla después de la generación del primero.

## Verificación

1. `pnpm exec vitest run src/app/api/finance/fallback-id-reuse.test.ts src/app/api/finance/identity-drift-payloads.test.ts src/app/api/finance/bigquery-write-cutover.test.ts`
2. `pnpm exec vitest run src/lib/finance/**/*.test.ts src/app/api/finance/**/*.test.ts`

Resultado local:

- suite focalizada del fix: OK
- suite completa de Finance: `23` archivos, `99` tests passing, `2` skipped

## Estado

resolved (2026-04-05)

## Relacionado

- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/fallback-id-reuse.test.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
