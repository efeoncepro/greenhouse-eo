---
paths:
  - "src/lib/payroll/**"
  - "src/lib/workforce/**"
---

# Payroll / Workforce — invariantes (auto-load por path)

Antes de tocar payroll/finiquito/KPI ICO, **invoca la skill MANDATORIA `greenhouse-payroll-auditor`** y carga **`docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`** + `PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md` (recibos/finiquito) + `GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`.

Reglas duras: **NUNCA** filtrar inclusión payroll inline en SQL (usar `resolveExitEligibilityForMembers`/`isMemberInPayrollScope`); **NUNCA** rescale monetary fields post-`buildPayrollEntry` (escalar la compensación ANTES); **NUNCA** ramificar el render del recibo por `entry.payRegime==='chile'` solo (usar `resolveReceiptRegime`/`buildReceiptPresentation`).

Salida de colaborador / revisión temporal de nómina (TASK-1349, LIVE en producción 2026-09-03): `PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` → `### Offboarding review, temporal eligibility and lifecycle writeback invariants (TASK-1349, desde 2026-09-03)`.

Live tests de este dominio (`*.live.test.ts` que crean members): `LIVE_TESTS_AGENT_INVARIANTS.md` §3 — nunca dejar compensación/relación abierta en un sujeto sintético (incidente «fantasmas» 2026-09-03); recovery sobre personas reales sujeto por sujeto con readback previo (`docs/operations/runbooks/offboarding-recovery.md`).
