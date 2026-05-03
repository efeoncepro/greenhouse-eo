import 'tsx/esm/api'
import { tsImport } from 'tsx/esm/api'

const url = new URL('../src/lib/finance/payment-obligations/materialize-payroll.ts', import.meta.url)
const { materializePayrollObligationsForExportedPeriod } = await tsImport(url.href, import.meta.url)

console.log('Materializing period 2026-04 via reconcilePaymentObligation…')
const result = await materializePayrollObligationsForExportedPeriod({ periodId: '2026-04', year: 2026, month: 4 })

console.log(JSON.stringify(result, null, 2))
