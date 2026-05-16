import 'server-only'

/**
 * Feature flag canonical: `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED`.
 *
 * TASK-890 (Workforce Exit Payroll Eligibility Window). Default `false`
 * en V1.0 hasta staging shadow compare ≥7d con Maria-fixture verde.
 *
 * Helper expuesto canonicalmente desde este módulo para que callers downstream
 * (notablemente TASK-893 Payroll Participation Window) puedan enforce la
 * flag dependency canónica (TASK-893=ON requires TASK-890=ON in same env).
 *
 * NOTA hygiene 2026-05-16: `postgres-store.ts:851` mantiene un helper privado
 * duplicado por razones de bootstrap de TASK-890. Ambos leen el mismo
 * `process.env.PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` — sin drift posible
 * (single source = env var). Cleanup canonical opcional V1.1.
 */
export const isPayrollExitEligibilityWindowEnabled = (): boolean =>
  process.env.PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED === 'true'
