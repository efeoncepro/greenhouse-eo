# TASK-557.1 — Legacy Quotes Cleanup & Limbo State Audit

## Delta 2026-05-06

- **TASK-813** (HubSpot p_services 0-162 sync + phantom seed cleanup) clona el patrón "audit + 3 categorías" introducido aquí — script idempotente con dry-run, categorización (recuperable / excluible / histórica), reporte counts pre/post. Reusar la misma forma de output + flags CLI para consistencia operacional.
- Sibling pattern: ambas tasks atacan limbos legacy en distintos dominios (quotes vs services). Coordinar formato de reportes para que el operador comercial vea un mismo shape.

## Delta 2026-05-07 — cierre Codex

- La spec original trataba `finance_quote_id IS NULL` como limbo, pero runtime real post-TASK-486 permite quotes canónicas nuevas sin mirror finance legacy. El script reporta ese dato, pero **no excluye** una quote solo por `finance_quote_id IS NULL`.
- `current_version` es `NOT NULL DEFAULT 1`; el audit valida existencia real de `quotation_versions` y `quotation_line_items` para la versión vigente.
- `legacy_excluded` se agrega como flag operativo para `historical`/`excludable`; las rows `recoverable` quedan sin mutar y ocultas del pipeline por `legacy_status IS NULL` hasta normalización humana.
- Runtime auditado: 44 candidatos, 19 `recoverable`, 14 `excludable`, 11 `historical`; apply marcó 25 rows `legacy_excluded=true`; rerun idempotente actualizó 0.

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo` (~1 dia)
- Type: `operational`
- Epic: `EPIC-002`
- Status real: `Cerrada 2026-05-07`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-555`
- Branch: `develop` (override explícito del usuario; no crear task branch)

## Summary

Audit + cleanup script de quotes legacy en estado limbo para que las nuevas surfaces post-EPIC-002 (sidebar Comercial + pipeline lane + picker) las ignoren limpiamente sin romper vistas legacy de Finanzas.

## Why This Task Exists

EPIC-002 introduce surfaces nuevas (`Comercial > Cotizaciones`, pipeline lane, picker unificado). Si una quote legacy con `legacy_status='draft_pre_canonical'` aparece en esas vistas pero no tiene canonical record, rompe la vista. Necesitamos categorizarlas explicitamente.

## Goal

- Script audit que identifica quotes legacy/limbo
- Tres categorias: (a) recuperable -> normalizar a canonical, (b) excluible -> flag `legacy_excluded=true`, (c) historica intacta -> mantener visible solo en path `/finance/...`
- Reporte con counts pre/post cleanup
- Re-ejecutable idempotente

## Architecture Alignment

- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- TASK-555 (commercial routeGroup foundation)

### Blocks / Impacts

- TASK-556 (framing adoption) — necesita quotes limpias para no mostrar limbos
- TASK-557 (pipeline lane) — necesita data clean

### Files owned

- `scripts/audit-legacy-quotes.ts` (nuevo)
- `migrations/YYYYMMDD_task-557.1-add-legacy-excluded-flag.sql` (nuevo)

## Scope

### Slice 1 — Migracion flag (0.1 dia)

```sql
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN legacy_excluded boolean NOT NULL DEFAULT false,
  ADD COLUMN legacy_excluded_reason text,
  ADD COLUMN legacy_excluded_at timestamptz;

CREATE INDEX idx_quotations_legacy_excluded
  ON greenhouse_commercial.quotations (legacy_excluded) WHERE legacy_excluded = true;
```

### Slice 2 — Audit script (0.5 dia)

`scripts/audit-legacy-quotes.ts`:

- Detecta quotes con `legacy_status NOT NULL`, falta de `organization_id` o falta de versión materializada. `finance_quote_id IS NULL` queda como dato reportado, no como causal única.
- Categoriza por heuristica: recuperable / excluible / historica
- Output: CSV report + acciones sugeridas

### Slice 3 — Cleanup ejecucion (0.4 dia)

- Dry-run en dev
- Aplicar manualmente (no automatico) tras review
- Marcar excluibles con `legacy_excluded=true` + reason
- Audit log

## Out of Scope

- Migracion de quotes "recuperables" al canonical model (requiere humano)
- Borrado de quotes legacy (solo flag)

## Acceptance Criteria

- [x] migracion aplicada
- [x] script ejecutado en dev/staging con report CSV local bajo `artifacts/` y auditoría versionada
- [x] queries de surfaces nuevas filtran `COALESCE(legacy_excluded, FALSE) = FALSE` y conservan `legacy_status IS NULL`
- [x] vistas legacy `/finance/...` siguen mostrando quotes excluidas (sin breaking change)

## Verification

- `pnpm pg:connect:migrate` OK; tipos regenerados
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/audit-legacy-quotes.ts --output artifacts/task-557.1-legacy-quotes-audit-dry-run.csv` OK
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/audit-legacy-quotes.ts --apply --output artifacts/task-557.1-legacy-quotes-audit-apply.csv` OK: 25 rows actualizadas
- rerun `--apply` OK: 0 rows actualizadas
- `pnpm test src/lib/commercial/legacy-quotes-audit.test.ts src/lib/commercial-intelligence/__tests__/revenue-pipeline-reader.test.ts` OK
- `pnpm exec tsc --noEmit --pretty false` OK

## Closing Protocol

- [x] Lifecycle sincronizado
- [x] README actualizado
- [x] Handoff con counts por env
