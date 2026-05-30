# TASK-794 — Chile Honorarios Compliance + SII Retention

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Shipped`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-790, TASK-793`
- Branch: `develop` (operador pidió mantenerse en develop)
- Legacy ID: `none`
- GitHub Issue: `none`

## SII Rate Verification (pre-execution, required by spec)

La tasa SII de retención de honorarios sigue el schedule gradual de la **Ley 21.133** (incorporación obligatoria de trabajadores independientes a seguridad social, retención de boletas para cotizaciones previsionales):

| Año emisión | Tasa | Fuente |
|---|---|---|
| 2024 | 13.75% | Ley 21.133 schedule |
| 2025 | 14.5% | Ley 21.133 schedule |
| **2026** | **15.25%** | **Ley 21.133, vigente desde 2026-01-01** |
| 2027 | 16% | Ley 21.133 schedule |
| 2028 | 17% | Ley 21.133 schedule |

Verificado contra `SII_RETENTION_RATES` (`src/types/hr-contracts.ts:75-83`) + watchlist `greenhouse-payroll-auditor` ("official SII rate is 15.25 percent from January 1, 2026"). **El valor existente es correcto — NO se modificó.** Esta task NO toca `SII_RETENTION_RATES` ni `calculate-honorarios.ts`.

## Resolución de Decisiones (pre-execution)

- **Sin migración**: el schema existente (`contractor_payables.readiness_json` / `source_snapshot_json`, `contractor_engagements.classification_risk_status` + `tax_withholding_*`) soporta el alcance completo. Menor blast radius. Verificado con arch-architect (reversibilidad alta).
- **Reuso > crear**: `resolveHonorariosWithholdingPolicy` (TASK-790) + `computeContractorWithholding` (TASK-793) + `assessPersonLegalReadiness` honorarios_closure (TASK-784) + `isClassificationRiskBlocking` (TASK-790). El módulo nuevo `chile-honorarios/` agrega solo los invariantes honorarios.
- **RUT = blocker fail-closed** (arch L490). Dirección fuera (honorarios_closure no la requiere).
- **Folio boleta** en `source_snapshot_json.honorariosPolicy` (where present), NO columna nueva — ContractorInvoice aggregate completo = TASK-796+.

## Summary

Converger Chile honorarios hacia Contractor Engagements + Payables: boleta/invoice, retencion SII versionada, readiness tributario y exclusion explicita de deducciones dependientes.

## Why This Task Exists

Honorarios hoy puede parecer payroll Chile por vivir cerca de payroll. Eso es peligroso: no aplica AFP, salud, AFC, SIS, mutual ni IUSC dependiente. Debe usar retencion SII por anno de emision y generar payable contractor, no payroll adjustment.

## Goal

- Implementar policy Chile honorarios sobre contractor invoice/payable.
- Versionar retencion SII y snapshots.
- Mantener compatibilidad con payroll legacy mientras se migra el pago flexible.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `src/lib/payroll/calculate-honorarios.ts`
- `src/types/hr-contracts.ts`

Reglas obligatorias:

- Retencion SII 2026 es `15.25%` desde `2026-01-01`; verificar contra SII antes de cerrar.
- No aplicar deducciones dependientes.
- Classification risk blocks if relationship looks employee-like.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-793`
- `TASK-784`

### Blocks / Impacts

- Impacts Payroll compatibility readers, Finance obligations and contractor self-service.

### Files owned

- `src/lib/contractor-engagements/chile-honorarios/**`
- `src/lib/payroll/calculate-honorarios.ts`
- `src/types/hr-contracts.ts`
- `migrations/**`

## Current Repo State

### Already exists

- Payroll honorarios calculation helper.
- Person legal profile readiness for `honorarios_closure`.

### Gap

- Honorarios is not yet sourced from ContractorEngagement/Invoice/Payable.
- SII retention snapshot is not part of contractor payable readiness.

## Scope

### Slice 1 — Chile honorarios policy

- Add policy resolver for `honorarios_cl`.
- Snapshot retention rate, emission year and SII folio where present.

### Slice 2 — Payable calculation

- Calculate gross, withholding and net for contractor payable.
- Ensure no dependent deductions can enter.

### Slice 3 — Compatibility and migration guard

- Keep payroll legacy consumers safe.
- Document cutover from honorarios payroll legacy to contractor payables.

## Payroll Non-Regression Guardrails (hard rules)

⚠️ Máximo riesgo del programa: esta task **edita archivos del motor de nómina** (`src/lib/payroll/calculate-honorarios.ts`, `src/types/hr-contracts.ts`). Cualquier cambio a `SII_RETENTION_RATES` o al helper honorarios impacta el payroll honorarios legacy en producción. Auditado con `greenhouse-payroll-auditor`.

- **NUNCA** romper el cálculo honorarios legacy de payroll al converger hacia contractor payable. Los consumers payroll existentes de `calculate-honorarios.ts` deben seguir verde bit-for-bit, salvo cambio de tasa SII explícito y versionado.
- **NUNCA** aplicar AFP, Fonasa/Isapre, AFC, SIS, mutual ni IUSC dependiente a honorarios — ni en el path payroll legacy ni en el contractor payable. Solo retención SII.
- **NUNCA** hardcodear la tasa SII inline. Versionar en `tax_withholding_policy_code` + snapshot. Tasa 2026 = 15.25% desde 2026-01-01; verificar contra SII oficial ANTES de cerrar y documentarlo en el audit de la task.
- **NUNCA** migrar masivamente honorarios payroll legacy a contractor payables en esta task. Convergencia gradual; los pagos legacy no se rompen.
- **NUNCA** crear `final_settlements` para honorarios (su cierre es `contractor_closure`, TASK-797).
- **SIEMPRE** correr la suite completa `pnpm vitest run src/lib/payroll` como gate de cierre obligatorio; cero deltas inesperados en honorarios ni en regímenes dependientes.

## Out of Scope

- F29 filing automation.
- Global tax engine.
- Provider-owned payroll.

## Acceptance Criteria

- [x] Chile honorarios payable computes retention from versioned SII policy. → `computeChileHonorariosPayout` + `resolveChileHonorariosPolicy` (reusa TASK-790 policy code `cl_honorarios_<year>_<rate>` + snapshot persistido en `source_snapshot_json.honorariosPolicy`).
- [x] AFP/salud/AFC/IUSC dependent deductions cannot appear. → guard `assertNoDependentDeductions` + `DEPENDENT_DEDUCTION_KINDS` + gate readiness `honorarios_withholding_mismatch` (recompute SII-only bloquea cualquier deducción extra).
- [x] Missing verified RUT or required boleta data blocks readiness as configured. → gate `rut_unverified` (CL_RUT verificado vía person-legal-profile `honorarios_closure`, fail-closed) + gate existente `invoice_asset_missing` (boleta cuando `requires_invoice`).
- [x] Classification risk can block payable approval. → gate `classification_risk_blocking` (universal) en `assessPayableReadiness` (`isClassificationRiskBlocking`).
- [x] Payroll honorarios legacy parity probado: `calculate-honorarios.ts` y `SII_RETENTION_RATES` sin cambios (git diff vacío); suite `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` verde (602 passed, 6 skipped).

## Verification

- `pnpm vitest run src/lib/payroll src/lib/contractor-engagements`
- `pnpm exec tsc --noEmit --pretty false`
- Official SII rate verification documented in task audit before implementation.

## Closing Protocol

- [x] Lifecycle and folder synchronized (`complete`, moved to `complete/`).
- [x] `docs/tasks/README.md` synchronized.
- [x] `Handoff.md` updated.
- [x] `changelog.md` entry added.
- [x] Arch doc Delta 2026-05-30 (cutover legacy → contractor payables).
- [x] CLAUDE.md invariants section (Chile Honorarios Compliance TASK-794).

## Slices Entregados

- **Slice 1** — Módulo `src/lib/contractor-engagements/chile-honorarios/` (policy + readiness + errors + barrel + 12 tests).
- **Slice 2** — 3 gates fail-closed en `evaluatePayableReadiness` + `assessPayableReadiness` (RUT, classification, withholding-mismatch) + snapshot `honorariosPolicy` en ambos create paths. 33 tests focales.
- **Slice 2b** — Reliability signal `hr.contractor_payable.honorarios_rut_unverified` (validado contra PG live, count=0).
- **Slice 3** — Gate de paridad payroll legacy (suite verde, cero cambios al engine) + cutover docs.
