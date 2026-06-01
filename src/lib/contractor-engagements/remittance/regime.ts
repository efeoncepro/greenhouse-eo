import type { ContractorEngagement } from '../types'
import type { ContractorPayable } from '../payables/types'

import type { RemittanceRegime } from './types'

/**
 * TASK-960 / TASK-980 — clasificador canónico de régimen del contractor.
 *
 * Single source of truth para "¿este pago es honorarios CL con retención SII, o
 * internacional?". Lo consumen el comprobante individual (`resolveRemittanceAdvice`,
 * TASK-960) y el reporte de período "Nómina de Contractors" (TASK-980). NUNCA
 * recomputar el régimen inline en un consumer — pasar por acá.
 *
 * Pure (sin IO). Acepta los campos mínimos vía `Pick<>` para bajo acoplamiento.
 */
export const deriveContractorRemittanceRegime = (
  engagement: Pick<ContractorEngagement, 'relationshipSubtype' | 'paymentCurrency'>,
  payable: Pick<ContractorPayable, 'paymentCurrency' | 'currency' | 'withholdingAmount'>
): RemittanceRegime => {
  if (engagement.relationshipSubtype === 'honorarios_cl') return 'honorarios_cl'

  const paymentCurrency = payable.paymentCurrency ?? engagement.paymentCurrency

  if (paymentCurrency && paymentCurrency !== payable.currency) return 'cross_currency'

  if (payable.withholdingAmount > 0) return 'international_withholding'

  return 'provider_managed'
}

/**
 * El reporte de período agrupa los 4 régimenes en 2 grupos contables mutuamente
 * excluyentes: **Honorarios CL** (con retención SII → reconcilia F29) vs
 * **Internacional** (sin retención CL → el neto = bruto, o el proveedor retiene).
 * Los subtotales NUNCA mezclan estos grupos (regla dura TASK-782/980).
 */
export type ContractorReportRegimeGroup = 'honorarios_cl' | 'international'

export const CONTRACTOR_REPORT_REGIME_GROUP_ORDER: readonly ContractorReportRegimeGroup[] = [
  'honorarios_cl',
  'international'
]

export const toContractorReportRegimeGroup = (
  regime: RemittanceRegime
): ContractorReportRegimeGroup => (regime === 'honorarios_cl' ? 'honorarios_cl' : 'international')
