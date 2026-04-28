# TASK-397 — Management Accounting Financial Costs Integration: Factoring, FX, Fees & Treasury

## Delta 2026-04-28 — Subordinada al programa Member Loaded Cost Model

Esta task **agrega el `cost_dimension='financial'` al modelo dimensional** definido en `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` §2 (Provider × Tool × Member × Client × Period × Expense). Factoring fees, FX gain/loss, bank fees y treasury costs se modelan como facts paralelos a los operating costs, compartiendo las mismas dimensiones (period, legal_entity, client_id) pero excluidos del bucket member-loaded (no son cost-per-member). Mantiene su scope técnico completo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno estructural`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-392`
- Branch: `task/TASK-397-management-accounting-financial-costs-integration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Management Accounting necesita incorporar los costos financieros que hoy quedan fuera o solo parcialmente visibles: factoring, comisiones bancarias, FX, costos de liquidez y tesoreria. Esta task integra esos costos al modelo de economics para que el margen no siga leyendose como si el financiamiento y el cash management fueran neutrales.

## Why This Task Exists

Greenhouse ya opera con cuentas, transferencias internas, balances y factoring, pero esos hechos todavia no viven como parte sistematica del P&L gerencial. Eso deja margenes "operativos" que ignoran costos reales de financiamiento y cobro. Para un modulo robusto, esos costos deben aparecer con semantica clara: operativos, financieros, asignables, no asignables y explicables.

## Goal

- Integrar costos financieros y de tesoreria al modulo de Management Accounting
- Amarrar `TASK-391` al modelo de margen y economics
- Definir la taxonomia y asignacion de costos financieros por scope

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Reglas obligatorias:

- El modulo debe distinguir costo operativo versus costo financiero sin ocultar ninguno
- Factoring, FX y fees deben poder asignarse por scope cuando exista trazabilidad; si no, deben quedar visibles como no asignados y explicados
- Ningun costo financiero se agrega por "ajuste manual invisible"; debe tener contrato de origen y categoria

## Normative Docs

- `docs/tasks/to-do/TASK-391-finance-factoring-operations.md`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/internal-transfers.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`

## Dependencies & Impact

### Depends on

- `TASK-392`
- `TASK-391`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/internal-transfers.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`

### Blocks / Impacts

- `TASK-398`
- margen gerencial por cliente / BU / entidad
- dashboards de finance intelligence y client economics

### Files owned

- `docs/tasks/to-do/TASK-391-finance-factoring-operations.md`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/internal-transfers.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/views/greenhouse/finance/FinanceIntelligenceView.tsx`
- `docs/tasks/to-do/TASK-397-management-accounting-financial-costs-integration-factoring-fx-fees-treasury.md`

## Current Repo State

### Already exists

- Base de tesoreria / account balances
- Transferencias internas y settlement orchestration
- Task especifica de factoring en progreso de backlog

### Gap

- Los costos financieros no estan integrados sistematicamente al modelo de economics
- No hay taxonomia formal para fees, FX, costo de liquidez y asignacion
- El margen gerencial puede verse artificialmente alto

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Taxonomia y origenes de costo financiero

- Definir categorias: factoring, bank fees, FX, treasury carry, transfer fees, otros financial costs
- Formalizar origen, evidencia y reglas de asignacion por scope

### Slice 2 — Integracion al modelo de economics

- Extender el P&L gerencial para incorporar financial costs con lectura separada y total economics
- Decidir visibilidad: below-operating-margin, adjusted margin, contribution margin u otra jerarquia documentada

### Slice 3 — Superficies y trazabilidad

- Exponer estos costos en Finance Intelligence / Client Economics
- Hacer visible cuando un costo financiero se asigna a cliente, BU, entidad o queda shared / unallocated

## Out of Scope

- Trading, hedge accounting o tesoreria compleja de mercado
- Integracion bancaria externa full-auto si no existe hoy
- Contabilidad legal de instrumentos financieros

## Detailed Spec

La salida minima debe incluir:

- taxonomia canonica de costos financieros
- criterio de asignacion y no-asignacion
- posicion clara en el P&L gerencial
- integracion de factoring como primer caso concreto, no como excepcion aislada

## Acceptance Criteria

- [ ] Existe taxonomia canonica de financial costs para Management Accounting
- [ ] `TASK-391` queda integrada al modelo gerencial, no solo a una UI operativa
- [ ] El P&L gerencial distingue costos operativos y financieros
- [ ] Las vistas muestran costos asignados y no asignados con explicacion
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

- `pnpm build`
- `pnpm test`
- Validacion manual del impacto de factoring / fees en economics

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedo documentada la posicion de los costos financieros en el P&L gerencial

## Follow-ups

- `TASK-398`
