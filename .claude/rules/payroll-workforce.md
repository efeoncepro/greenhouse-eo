---
paths:
  - "src/lib/payroll/**"
  - "src/lib/workforce/**"
---

# Payroll / Workforce — invariantes (auto-load por path)

Antes de tocar payroll/finiquito/KPI ICO, **invocá la skill MANDATORIA `greenhouse-payroll-auditor`** y cargá **`docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`** + `PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md` (recibos/finiquito) + `GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`.

Reglas duras: **NUNCA** filtrar inclusión payroll inline en SQL (usar `resolveExitEligibilityForMembers`/`isMemberInPayrollScope`); **NUNCA** rescale monetary fields post-`buildPayrollEntry` (escalar la compensación ANTES); **NUNCA** ramificar el render del recibo por `entry.payRegime==='chile'` solo (usar `resolveReceiptRegime`/`buildReceiptPresentation`).
