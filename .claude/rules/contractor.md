---
paths:
  - "src/lib/contractor-engagements/**"
---

# Contractor / Payables (EPIC-013) — invariantes (auto-load por path)

Antes de tocar este dominio, cargá **`docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` → §"Invariantes operativos para agentes (TASK-790…981)"**.

Boundary duro bidireccional: el dominio contractor **NUNCA** escribe/muta `payroll_entries`/`payroll_adjustments`/`compensation_versions`/`final_settlements`; el payout **NUNCA** entra como payroll dependiente ni dispara finiquito (cierre = `contractor_closure`, NUNCA finiquito). **SIEMPRE** gate de cierre: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde.
