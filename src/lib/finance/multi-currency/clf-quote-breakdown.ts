import 'server-only'

import { DEFAULT_CHILE_IVA_RATE } from '@/lib/finance/pricing/quotation-tax-constants'
import { FinanceValidationError } from '@/lib/finance/shared'

// TASK-1210 Slice 1 (plan TASK-995 §#1.1) — derivar el desglose neto/IVA de una
// cotización CLF (UF) que solo trae el total documental.
//
// Las cotizaciones CLF sincronizadas de HubSpot (`source_system='hubspot'`)
// llegan con `subtotal`/`tax_amount` en NULL/0 y solo `total_amount` poblado: la
// API de HubSpot no entrega el desglose IVA por línea. Las cotizaciones AUTORADAS
// por el quote-builder (TASK-1211/1212) sí nacen con `tax_snapshot_json` congelado
// + desglose por línea — esas NO pasan por acá (el materializer hereda su snapshot
// congelado). Esta derivación cubre exclusivamente el caso legacy "solo total".
//
// REGLA DURA (operador 2026-06-21): NO todas las quotes llevan IVA. La decisión
// afecta-vs-exento se toma POR COTIZACIÓN leyendo su clasificación fiscal real
// (`quotation.tax_code`, misma semántica que `resolveNuboxIncomeTaxCode`), nunca
// despejando `total/1.19` a ciegas. Una quote exenta a la que se le aplique
// gross-up genera un IVA inventado (descuadre SII). Si no se puede clasificar con
// confianza → fail-closed: NO se proyecta (mejor bloquear que materializar IVA
// falso). El redondeo a CLP entero NO ocurre acá; el desglose se mantiene en UF
// (con decimales) y `buildClfIncomeProjection` aplana cada plano a CLP entero.

export interface ClfQuoteBreakdown {
  /** Neto (base afecta) en CLF. Para una quote exenta = el total documental. */
  subtotalClf: number
  /** IVA en CLF. 0 para una quote exenta. */
  taxAmountClf: number
  /** true si la cotización es exenta (IVA 19% no aplica). */
  isExempt: boolean
}

export interface DeriveClfQuoteBreakdownInput {
  /** Total documental en CLF (UF) — la única cifra que traen las quotes CLF de HubSpot. */
  totalClf: number
  /** Clasificación fiscal canónica de la cotización (`quotation.tax_code`). */
  taxCode: string | null | undefined
}

/**
 * Deriva el desglose neto/IVA en CLF (UF) desde el total documental + la
 * clasificación fiscal de la cotización. Fail-closed si no clasifica.
 *
 * - Afecta (`cl_vat_19`): `neto = total / 1.19`, `IVA = total − neto`.
 * - Exenta (`cl_vat_exempt`, p.ej. exportación electrónica DTE 110/111/112):
 *   `neto = total`, `IVA = 0`.
 * - Cualquier otro `tax_code` (incl. `cl_vat_non_billable` o NULL): lanza
 *   `FinanceValidationError` — el caller bloquea la proyección (revisión manual).
 */
export const deriveClfQuoteBreakdown = (input: DeriveClfQuoteBreakdownInput): ClfQuoteBreakdown => {
  const totalClf = Math.abs(Number(input.totalClf) || 0)

  if (!(totalClf > 0)) {
    throw new FinanceValidationError(
      'No se puede derivar el desglose de una cotización CLF sin un total documental positivo.'
    )
  }

  const { taxCode } = input

  // Afecta (IVA 19%): despeje desde el total bruto. El neto conserva decimales en
  // UF; el CLP entero se redondea aguas abajo en buildClfIncomeProjection.
  if (taxCode === 'cl_vat_19') {
    const subtotalClf = totalClf / (1 + DEFAULT_CHILE_IVA_RATE)

    return { subtotalClf, taxAmountClf: totalClf - subtotalClf, isExempt: false }
  }

  // Exenta (exportación electrónica DTE 110/111/112 u otro servicio exento): el
  // total va al plano sin IVA. NO despejar.
  if (taxCode === 'cl_vat_exempt') {
    return { subtotalClf: totalClf, taxAmountClf: 0, isExempt: true }
  }

  // REGLA DURA: sin clasificación afecta/exenta confiable NO se proyecta — no se
  // inventa IVA. Fail-closed → revisión manual del `tax_code` de la cotización.
  throw new FinanceValidationError(
    `No se puede clasificar la cotización CLF como afecta o exenta (tax_code=${taxCode ?? 'null'}); ` +
      'no se proyecta el income para no inventar IVA. Revisar la clasificación fiscal de la cotización.'
  )
}
