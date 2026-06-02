/**
 * TASK-960 Slice 2 — Contractor Remittance Advice presenter (PURE).
 *
 * `buildRemittanceAdvice(input, locale)` maps a fully-resolved data bag → the
 * `RemittancePresentation` struct consumed by the MUI viewer AND the react-pdf
 * renderer (zero content drift). Pure: no IO, no recompute of money — gross /
 * withholding / net are read verbatim from the input (which the server resolver
 * fills from the ContractorPayable SSOT, TASK-793/794). Mirror of the approved
 * mockup `buildRemittancePresentation`.
 */

import { formatCurrency, type CurrencyCode } from '@/lib/format'
import { getRemittanceCopy, type RemittanceLocale } from '@/lib/copy/remittance'

import type { RemittanceAdviceInput, RemittanceBreakdownRow, RemittancePresentation } from './types'

const formatRatePct = (rate: number, locale: RemittanceLocale): string =>
  `${(rate * 100).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`

const formatPaymentDate = (iso: string, locale: RemittanceLocale): string => {
  const date = new Date(`${iso}T12:00:00`)

  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
}

export const buildRemittanceAdvice = (
  input: RemittanceAdviceInput,
  locale: RemittanceLocale
): RemittancePresentation => {
  const copy = getRemittanceCopy(locale)

  // Breakdown — amounts read verbatim from the payable. NEVER recomputed.
  const breakdown: RemittanceBreakdownRow[] = [
    { id: 'gross', label: copy.grossLabel, amount: input.gross, currency: input.currency, kind: 'gross' }
  ]

  if (input.withholding !== null) {
    const withholdingLabel =
      input.regime === 'honorarios_cl' && input.withholdingRate !== null
        ? copy.withholdingSiiLabel(formatRatePct(input.withholdingRate, locale))
        : copy.withholdingGenericLabel

    breakdown.push({
      id: 'withholding',
      label: withholdingLabel,
      amount: input.withholding,
      currency: input.currency,
      kind: 'withholding',
      negative: true
    })
  }

  breakdown.push({
    id: 'net',
    label: copy.netLabel,
    amount: input.net,
    currency: input.currency,
    kind: 'net',
    emphasis: true
  })

  // Informational FX line — only when a rate is resolvable. Never invented.
  let fx: RemittancePresentation['fx']

  if (input.fx) {
    const equivalentFormatted = formatCurrency(
      input.fx.equivalent,
      input.fx.equivalentCurrency as CurrencyCode,
      { maximumFractionDigits: 0 },
      locale
    )

    const rateFormatted = input.fx.rate.toLocaleString(locale)

    fx = { label: 'FX', value: copy.fxLabel(rateFormatted, equivalentFormatted) }
  }

  const disclaimer =
    input.withholding === null && input.withholdingManagedByProvider
      ? `${copy.withholdingManagedNote}. ${copy.disclaimer}`
      : copy.disclaimer

  const providerDocument = input.providerDocument
    ? {
        label: copy.providerDocKind[input.providerDocument.kind],
        value: input.providerDocument.value ?? copy.unavailableValue
      }
    : { label: copy.providerDocSection, value: copy.unavailableValue }

  return {
    regime: input.regime,
    locale,
    number: input.number,
    issuer: {
      legalName: input.issuer.legalName,
      taxIdLabel: copy.issuerTaxIdLabel,
      taxId: input.issuer.taxId,
      address: input.issuer.address,
      logoSrc: input.issuer.logoSrc
    },
    beneficiary: {
      name: input.beneficiary.name,
      taxIdLabel: copy.beneficiaryTaxIdLabel,
      taxId: input.beneficiary.taxId ?? copy.unavailableValue,
      countryLabel: copy.countryLabel,
      country: input.beneficiary.country
    },
    providerDocument,
    breakdown,
    fx,
    payment: {
      dateLabel: copy.paymentDateLabel,
      dateValue: formatPaymentDate(input.payment.dateIso, locale),
      methodLabel: copy.methodLabel,
      methodValue: copy.methodValue,
      referenceLabel: copy.referenceLabel,
      referenceValue: input.payment.reference ?? copy.unavailableValue
    },
    disclaimer,
    labels: {
      title: copy.title,
      numberLabel: copy.numberLabel,
      issuerSection: copy.issuerSection,
      beneficiarySection: copy.beneficiarySection,
      providerDocSection: copy.providerDocSection,
      breakdownSection: copy.breakdownSection,
      paymentSection: copy.paymentSection,
      footerNote: copy.footerNote,
      regimeLabel: copy.regimeLabels[input.regime]
    }
  }
}
