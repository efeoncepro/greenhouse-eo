#!/usr/bin/env tsx
/**
 * Declare Opening Trial Balances for the 7 active accounts (TASK-703).
 *
 * Each declaration is anchored to a verifiable source:
 *   - santander-clp           28/02 $5,703,909   reconciled (cartola CLP saldo running 25/02 + computed)
 *   - santander-usd-usd       28/02 USD 2,591.94 reconciled (cartola USD)
 *   - global66-clp            28/02 $380          reconciled (cuadre febrero)
 *   - santander-corp-clp      06/03 $802,905      reconciled (TC PDF marzo, saldo adeudado final período anterior)
 *   - sha-cca-julio-reyes-clp 28/02 $0           estimated  (sin histórico Deel pre-período completo)
 *   - deel-clp                28/02 $0           reconciled (transit account, sin saldo)
 *   - previred-clp            28/02 $0           reconciled (transit account, sin saldo)
 *
 * Idempotent: re-running with same values is a no-op; re-running with
 * different values supersedes the existing OTB preserving audit.
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { declareOpeningTrialBalance, type OtbAuditStatus } from '@/lib/finance/account-opening-trial-balance'

interface OtbDeclaration {
  accountId: string
  genesisDate: string
  openingBalance: number
  openingBalanceClp?: number
  declarationReason: string
  auditStatus: OtbAuditStatus
  evidenceRefs?: Array<{ type: string; description?: string; ref?: string; period?: string }>
}

const DECLARATIONS: OtbDeclaration[] = [
  {
    accountId: 'santander-clp',
    genesisDate: '2026-02-28',
    openingBalance: 5703909,
    declarationReason: 'Derivado del saldo running de cartola Santander CLP al cierre del 25/02/2026 (último movimiento pre-marzo). Sin movimientos entre 26/02 y 28/02.',
    auditStatus: 'reconciled',
    evidenceRefs: [
      { type: 'cartola', ref: 'data/bank/CartolaMovimiento-000092044661-20260427.xlsx', period: '2026-02-19..2026-02-25' }
    ]
  },
  {
    accountId: 'santander-usd-usd',
    genesisDate: '2026-02-28',
    openingBalance: 2591.94,
    openingBalanceClp: 2591.94 * 950, // approximate USD/CLP rate; FX p&l reconciles
    declarationReason: 'Derivado de cartola USD: saldo posterior al ingreso del 11/02/2026 (USD 2,591.94). Sin movimientos hasta 27/04.',
    auditStatus: 'reconciled',
    evidenceRefs: [
      { type: 'cartola', ref: 'data/bank/USD-CartolaMovimiento-005103266337-20260427.xlsx', period: '2026-02-11' }
    ]
  },
  {
    accountId: 'global66-clp',
    genesisDate: '2026-02-28',
    openingBalance: 380,
    declarationReason: 'Computado del cuadre febrero Global66: inflows desde Efeonce $1,911,066 - outflows colaboradores + fees $1,910,686 = $380 residual.',
    auditStatus: 'reconciled',
    evidenceRefs: [
      { type: 'cartola', ref: 'data/bank/Global-extracto_movimientos_start=01-02-2026_end=27-04-2026.xls', period: '2026-02-02' }
    ]
  },
  {
    accountId: 'santander-corp-clp',
    genesisDate: '2026-03-06',
    openingBalance: 802905,
    declarationReason: 'Saldo adeudado final período anterior (06/02-06/03) según estado de cuenta TC Santander Corp PDF marzo. Convención liability: balance positivo = deuda con Mastercard.',
    auditStatus: 'reconciled',
    evidenceRefs: [
      { type: 'cartola_tc', ref: 'data/bank/EstadoCuentaTC-XXXXXXXXXXXX2505-20260427.pdf', period: '2026-02-06..2026-03-06' }
    ]
  },
  {
    accountId: 'sha-cca-julio-reyes-clp',
    genesisDate: '2026-02-28',
    openingBalance: 0,
    declarationReason: 'OPENING ESTIMATED. Sin histórico completo de gastos pagados con tarjeta personal *1879 pre-28/02 (Deel REC-2025-1, REC-2025-2, REC-2026-1, REC-2026-2 visibles en pantalla Deel pero pendientes de mapear con sus reembolsos correspondientes pre-19/02 que no están en cartola descargada). Se asume que todo el histórico pre-28/02 está balanceado: gastos personales = reembolsos. Pendiente de reconciliación cuando se obtenga (a) listado completo de cargos *1879 pre-28/02 y (b) cartola Santander CLP pre-19/02 con todas las Transf a Julio Reyes.',
    auditStatus: 'estimated',
    evidenceRefs: [
      { type: 'note', description: 'Datos faltantes pre-28/02 documentados en TASK-703' }
    ]
  },
  {
    accountId: 'deel-clp',
    genesisDate: '2026-02-28',
    openingBalance: 0,
    declarationReason: 'Transit account (payment_platform). Deel pasa fondos sin retener saldo. OTB inicial $0 reconciled by definition.',
    auditStatus: 'reconciled'
  },
  {
    accountId: 'previred-clp',
    genesisDate: '2026-02-28',
    openingBalance: 0,
    declarationReason: 'Transit account (payroll_processor). Previred pasa fondos sin retener saldo. OTB inicial $0 reconciled by definition.',
    auditStatus: 'reconciled'
  }
]

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  console.log(`[otb] Declaring ${DECLARATIONS.length} OTBs...`)

  for (const d of DECLARATIONS) {
    try {
      const r = await declareOpeningTrialBalance({
        accountId: d.accountId,
        genesisDate: d.genesisDate,
        openingBalance: d.openingBalance,
        openingBalanceClp: d.openingBalanceClp,
        declarationReason: d.declarationReason,
        auditStatus: d.auditStatus,
        evidenceRefs: d.evidenceRefs,
        declaredByUserId: 'task-703-bootstrap'
      })

      console.log(`  ✓ ${d.accountId}: ${d.genesisDate} = ${r.openingBalance.toFixed(2)} (${r.auditStatus})`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      console.error(`  ✗ ${d.accountId}: ${message}`)
    }
  }

  console.log('[otb] Done')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
