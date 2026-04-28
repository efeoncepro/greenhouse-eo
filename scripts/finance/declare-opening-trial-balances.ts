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
    genesisDate: '2026-04-05',
    openingBalance: 8562,
    declarationReason: 'Re-anchor (TASK-703b/704) al SOD 05/04 = saldo final del 04/04 = $8,562 según screenshot empresas.global66.com/wallets/2303987 con timestamp 04/abril/2026. Bank-authoritative. La OTB anterior 28/02 con $380 era estimada con data parcial pre-período (no incluía el "Otro movimiento" $668,825 del 10/03 que la cartola muestra como debit, ni ajustes menores totalizando $8,182). Re-anclando al saldo verificado evitamos arrastrar el error desde 28/02. Movements 28/02 a 04/04 ya en PG cascade-supersede automáticamente.',
    auditStatus: 'reconciled',
    evidenceRefs: [
      { type: 'screenshot_global66', ref: 'data/bank/screenshots/global66-saldo-final-20260404.png', period: '2026-04-04', description: 'Saldo final a 04/abril/2026: $8,562 CLP. URL: empresas.global66.com/wallets/2303987.' },
      { type: 'cartola_xls', ref: 'data/bank/Global-extracto_movimientos_start=01-02-2026_end=27-04-2026.xls', period: '2026-02-01..2026-04-27' },
      { type: 'supersede_note', description: 'Reemplaza OTB obtb-global66-clp-20260228-1f51ea79 (28/02 $380) que era estimación pre-screenshot. Bank-authoritative ahora.' }
    ]
  },
  {
    accountId: 'santander-corp-clp',
    genesisDate: '2026-04-07',
    openingBalance: 268442,
    declarationReason: 'Re-anchor (TASK-703b) al SOD 07/04 = EOD cierre ciclo marzo 06/04/2026. Cupo utilizado al cierre 06/04 = $268,442 (= "MONTO TOTAL FACTURADO A PAGAR" en PDF página 1). Convención canónica Greenhouse: OTB.genesisDate representa balance al INICIO del día genesis (i.e., EOD del día anterior). Por eso anclamos en 07/04 con el cierre ciclo 06/04. El cascade-supersede automáticamente marca como superseded: (a) settlement_legs 06/03 y 12/03 (pagos marzo), (b) expense_payment 05/03 Deel REC-2026-3, (c) expense_payments 05/04 Deel REC-2026-5 y REC-2026-6 (charges marzo cycle pero dated en abril en PG), (d) settlement_leg 06/04 incoming $696,198 (pago marzo 04/04 que aterrizó al banco el 06/04). Estos están todos encapsulados en el $268,442 del PDF. Convención liability: balance positivo = cupo utilizado = "Deuda" en OfficeBanking. La OTB anterior 06/03 con +$802,905 era incorrecta (interpretó la magnitud del crédito a favor del cliente como deuda).',
    auditStatus: 'reconciled',
    evidenceRefs: [
      { type: 'cartola_tc', ref: 'data/bank/EstadoCuentaTC-XXXXXXXXXXXX2505-20260427.pdf', period: '2026-03-06..2026-04-06', description: 'Cupo total $1,700,000 — Cupo utilizado $268,442 — Cupo disponible $1,431,558 al cierre 06/04/2026 (EOD = SOD 07/04).' },
      { type: 'supersede_note', description: 'Reemplaza OTB obtb-santander-corp-clp-20260306-770dfd33 (06/03 $802,905) y OTB intermedia 06/04 (si existió) que eran anchors mal interpretados.' }
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
