import 'server-only'

/**
 * TASK-893 Slice 4 BL-1 / BL-2 — Canonical helper to prorate the compensation
 * inputs BEFORE `buildPayrollEntry`.
 *
 * **Why this lives in its own module** (extracted from `project-payroll.ts`
 * during Slice 4 BL-2 to avoid duplication): both `projectPayrollForPeriod`
 * (proyected dashboard) and `calculatePayroll` (official write path) need
 * the EXACT SAME compensation-prorate semantic. A duplicate copy in two
 * files would be the canonical "drift between projection and official"
 * anti-pattern that the ADR explicitly rejects.
 *
 * **Why scale inputs (not outputs)**: post-hoc `prorateEntry` of the
 * `buildPayrollEntry` output rescales monetary fields linearly. That breaks
 * for fields with non-linear semantics:
 *
 * - `chileGratificacionLegalAmount` has a MONTHLY cap (4.75 × IMM ÷ 12 Art 50
 *   CT, ≈ $213,354 in 2026). Post-hoc rescale of an entry already at the cap
 *   double-prorrates (e.g. $213,354 × 0.59 = $126,099) — illegal underpayment.
 * - `chileTotalDeductions` is an aggregate over contribution bases — not a
 *   linear function of the gross.
 * - `siiRetentionAmount` linear math works mathematically but loses
 *   auditability — the boleta honorarios should be issued for the prorated
 *   gross, and the retention should be computed from that gross by the
 *   canonical calculator, not from a separately-scaled output.
 *
 * **Canonical fix** (payroll auditor 2026-05-16): scale the *inputs* to
 * `buildPayrollEntry`; let the canonical calculator recompute deductions,
 * gratificación legal cap, and retención SII from the prorated bases. The
 * cap correctly clamps because the calculator sees the prorated gross with
 * the same monthly cap available.
 *
 * **What scales** (proportional to time worked / devengado lineal):
 * - `baseSalary`, `remoteAllowance`, `fixedBonusAmount`
 * - `bonusOtdMin/Max`, `bonusRpaMin/Max` (KPI bonus caps proportional)
 * - `apvAmount` (voluntary contribution proportional to imponible base)
 *
 * **What does NOT scale** (asignaciones no imponibles fijas — Chilean
 * jurisprudence does NOT auto-prorate by days not worked at contract entry;
 * the decision is contractual, not automatic):
 * - `colacionAmount`, `movilizacionAmount`
 *
 * **Identity preserved** (non-monetary or rate-based — pass through):
 * - `afpName`, `afpRate`, `healthSystem`, `unemploymentRate`, `contractType`,
 *   `payRegime`, `payrollVia`, `gratificacionLegalMode`, all flags, IDs, etc.
 *
 * **HR Open Question Q-2** (gratificación legal in entry month): jurisprudencia
 * chilena Opción A (canonical per payroll auditor 2026-05-16): the cap is
 * MONTHLY and is NOT prorated. Dictamen DT 2937/050 (2002) discusses partial
 * months. When grátificacionLegalMode is active (e.g. `tope_legal`), the
 * canonical `calculateChileDeductions` clamps at the full monthly cap
 * against the prorated base. This is implemented correctly via this
 * helper's "scale inputs, recompute via calculator" pattern.
 *
 * Pure function. Used only on the flag-ON path; flag OFF preserves legacy
 * bit-for-bit (callers MUST gate this with
 * `isPayrollParticipationWindowEnabled()` upstream).
 *
 * Generic over T — accepts any object with the canonical monetary fields.
 * `ApplicableCompensationVersionRow` is the production caller type.
 */
export const prorateCompensationForParticipationWindow = <T extends {
  baseSalary: number
  remoteAllowance: number
  fixedBonusAmount: number
  bonusOtdMin: number
  bonusOtdMax: number
  bonusRpaMin: number
  bonusRpaMax: number
  apvAmount: number
}>(
  compensation: T,
  factor: number
): T => {
  /*
   * Factor at or above 1 → no scaling needed. Equivalent to identity for
   * full_period policy (factor=1). Guards against propagating > 1 factors
   * by accident — those would inflate, which is never desired.
   */
  if (factor >= 1) return compensation

  /*
   * Factor at 0 → exclude. The caller should have filtered the member out
   * upstream (policy='exclude'). Defensive: if it slips through, produce
   * all-zero monetary fields rather than negative values from rounding.
   *
   * For the official write path (calculatePayroll), the caller MUST skip the
   * member entirely when factor=0 — do NOT persist a zero-value
   * payroll_entries row. The skip-and-return semantic is the caller's
   * responsibility; this helper is defensive only.
   */
  if (factor <= 0) {
    return {
      ...compensation,
      baseSalary: 0,
      remoteAllowance: 0,
      fixedBonusAmount: 0,
      bonusOtdMin: 0,
      bonusOtdMax: 0,
      bonusRpaMin: 0,
      bonusRpaMax: 0,
      apvAmount: 0
    }
  }

  const s = (v: number) => Math.round(v * factor * 100) / 100

  return {
    ...compensation,
    baseSalary: s(compensation.baseSalary),
    remoteAllowance: s(compensation.remoteAllowance),
    fixedBonusAmount: s(compensation.fixedBonusAmount),
    bonusOtdMin: s(compensation.bonusOtdMin),
    bonusOtdMax: s(compensation.bonusOtdMax),
    bonusRpaMin: s(compensation.bonusRpaMin),
    bonusRpaMax: s(compensation.bonusRpaMax),
    apvAmount: s(compensation.apvAmount)
    /*
     * colacionAmount + movilizacionAmount intentionally preserved (legacy
     * preserved). See JSDoc above for rationale.
     */
  }
}
