# TASK-557.1 — Legacy Quotes Cleanup & Limbo State Audit

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo` (~1 dia)
- Type: `operational`
- Epic: `EPIC-002`
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-555`
- Branch: `task/TASK-557.1-legacy-quotes-cleanup-audit`

## Summary

Audit + cleanup script de quotes legacy en estado limbo (con `legacy_status` set, sin `current_version`, sin canonical record) para que las nuevas surfaces post-EPIC-002 (sidebar Comercial + pipeline lane + picker) las ignoren limpiamente sin romperlas.

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

- Detecta quotes con `legacy_status NOT NULL OR current_version IS NULL OR finance_quote_id IS NULL`
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

- [ ] migracion aplicada
- [ ] script ejecutado en dev/staging/prod con report
- [ ] queries de surfaces nuevas filtran `WHERE legacy_excluded = false`
- [ ] vistas legacy `/finance/...` siguen mostrando quotes excluidas (sin breaking change)

## Verification

- `pnpm migrate:up`, audit dry-run, manual review, aplicar
- Verificar que pipeline lane (TASK-557) no muestra limbos

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] README actualizado
- [ ] Handoff con counts por env
