/**
 * ISSUE-069 fix — pure helper canónico para calcular el seedDate del cron de
 * rematerialize-balances.
 *
 * **Por qué `lookbackDays + 1`**: el contrato canónico de
 * `rematerializeAccountBalanceRange`
 * (src/lib/finance/account-balances-rematerialize.ts:258) empieza el loop en
 * `seedDate + 1`, es decir, el día seed NO se materializa — se trata como
 * ancla de partida (preserva reconciliation snapshots TASK-721 + OTB anchor
 * TASK-703).
 *
 * Si usáramos `today − lookbackDays` como seed, el día `today − lookbackDays`
 * quedaría como ancla muda. Cualquier `settlement_leg` / `expense_payment` /
 * `income_payment` con `transaction_date` exactamente en ese día (típicamente
 * registros retroactivos creados horas/días después) NO sería contabilizado
 * por el cron — quedaría con `period_inflows=0, period_outflows=0` aunque
 * existieran movimientos reales.
 *
 * Compensamos restando un día adicional para que los últimos `lookbackDays`
 * días COMPLETOS se materialicen, incluyendo lo que antes era el "día ciego".
 *
 * Ver: docs/issues/open/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md
 */
export const computeRematerializeSeedDate = (today: Date, lookbackDays: number): string => {
  const seedMs = today.getTime() - (lookbackDays + 1) * 86_400_000

  return new Date(seedMs).toISOString().slice(0, 10)
}
