# ISSUE-103 — Documentos con IVA sincronizados desde Nubox no tienen período fiscal → excluidos del F29

## Ambiente

production + staging (misma Cloud SQL `greenhouse-pg-dev`)

## Detectado

2026-06-20, por el signal `finance.vat.eligible_without_period` (TASK-1185 Slice 4) + investigación read-only del hallazgo de la auditoría de TASK-725.

## Síntoma

El signal `finance.vat.eligible_without_period` reporta **165 documentos con IVA sin período fiscal** (`period_year`/`period_month` NULL): **112 expenses + 53 income**. Estos documentos **nunca entran a ninguna posición F29** (el materializador `materializeVatLedgerForPeriod` / `materializeAllAvailableVatPeriods` solo procesa documentos con período poblado) y son invisibles a `finance.vat.position_drift`.

La posición de IVA materializada (TASK-725) solo ve **13 de 125** gastos con IVA recuperable — el 90% del crédito fiscal de compras está fuera del F29.

## Causa raíz

Los documentos afectados son `EXP-NB-*` / `INC-NB-*` → provienen del **sync de Nubox** (`src/lib/nubox/sync-nubox-to-postgres.ts` `[verificar]`). El pipeline importa con `document_date`/`invoice_date` poblados pero **no estampa el período fiscal** (`period_year`, `period_month`, ni `tax_period` — los tres vacíos en los 112 expenses verificados). El materializador del IVA filtra por `period_year`/`period_month`, así que los documentos sin período quedan fuera.

El período **es derivable**: todos tienen `document_date` (rango 2023-06-26 → 2026-03-11). El fix es estampar el período (mes del documento, calendario operativo `America/Santiago`) en el sync + backfill de los existentes.

### Evidencia (BD viva, 2026-06-20)

```
expenses con IVA recuperable:  con_periodo=13  sin_periodo=112   (90% sin período)
income con IVA (vat_output):   sin_periodo=53  (52 de origen Nubox INC-NB-*)
expenses sin período:          112/112 con document_date, 0/112 con tax_period
```

## Impacto

- **Fiscal (material):** el F29 sub-declara el crédito fiscal de compras → Efeonce **paga IVA de más**. Conecta con el "$2.56M crédito excluido" del audit original de ISSUE-101 — la mayor parte era esto (período NULL), no el space gate (que ISSUE-101/TASK-725 ya cerró para los 13 con período).
- **Para quién:** equipo Finanzas de Efeonce (F29 mensual).
- **Severidad:** alta — afecta la completitud de la posición fiscal mensual y representa dinero (crédito no reclamado).

## Solución

Remediación planificada en **TASK-1191**:

1. Estampar el período fiscal en el sync de Nubox (derivar de `document_date`/`invoice_date` con el calendario operativo canónico `America/Santiago`), para que los documentos nuevos nazcan con período.
2. Backfill idempotente (dry-run → apply) de los 165 documentos existentes, derivando el período de la fecha del documento.
3. Re-materializar el IVA tras el backfill → el crédito fiscal completo entra al F29.

## Verificación

- `finance.vat.eligible_without_period` → 0 post-remediación.
- Documentos nuevos de Nubox nacen con `period_year`/`period_month`.
- La posición de IVA incluye el crédito fiscal de los documentos backfilleados (validación de la cifra vs F29 real con contador).

## Estado

open

## Relacionado

- **TASK-1191** — remediación (sync fix + backfill + re-materialización).
- **TASK-1185** — el signal `finance.vat.eligible_without_period` que lo detectó.
- **TASK-725 / ISSUE-101** — re-scope del IVA a entidad legal (cerró el space gate; este ISSUE cierra el otro tramo de exclusión: período NULL).
- Código: `src/lib/nubox/sync-nubox-to-postgres.ts` `[verificar]`, `src/lib/finance/vat-ledger.ts`, `src/lib/calendar/operational-calendar.ts`.
