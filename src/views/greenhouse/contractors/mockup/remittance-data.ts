// TASK-960 mockup — Contractor Remittance Advice ("Comprobante de Pago").
// Typed mock data + a buildRemittancePresentation() that mirrors the real
// buildRemittanceAdvice(payable, issuer, locale): a single presentation struct
// consumed by the MUI viewer (and, in implementation, by react-pdf) → zero drift.
//
// Bilingual: the document follows the CONTRACTOR's locale (mirror of
// src/lib/email/locale-resolver.ts). Here a toggle drives es-CL / en-US.

export type RemittanceRegime = 'honorarios_cl' | 'international_withholding' | 'provider_managed' | 'cross_currency'
export type RemittanceLocale = 'es-CL' | 'en-US'

export type RemittanceRowKind = 'gross' | 'withholding' | 'net'

export interface RemittanceBreakdownRow {
  id: string
  label: string
  amount: number
  currency: string
  kind: RemittanceRowKind
  negative?: boolean
  emphasis?: boolean
}

export interface RemittancePresentation {
  regime: RemittanceRegime
  locale: RemittanceLocale
  number: string
  issuer: {
    legalName: string
    taxIdLabel: string
    taxId: string
    address: string
    logoSrc: string
  }
  beneficiary: {
    name: string
    taxIdLabel: string
    taxId: string
    countryLabel: string
    country: string
  }
  providerDocument: {
    label: string
    value: string
  }
  breakdown: RemittanceBreakdownRow[]
  fx?: {
    label: string
    value: string
  }
  payment: {
    dateLabel: string
    dateValue: string
    methodLabel: string
    methodValue: string
    referenceLabel: string
    referenceValue: string
  }
  disclaimer: string
  labels: {
    title: string
    numberLabel: string
    issuerSection: string
    beneficiarySection: string
    providerDocSection: string
    breakdownSection: string
    paymentSection: string
    footerNote: string
    regimeLabel: string
  }
}

// ── Locale-independent base data per regime (amounts, refs) ──────────────────

interface RegimeBase {
  number: string
  paymentDate: string // ISO
  beneficiary: { name: string; taxId: string; country: 'CL' | 'US' | 'NI' }
  providerDoc: { kind: 'bhe' | 'invoice'; value: string }
  gross: number
  withholding: number | null // null = managed by provider (no row)
  net: number
  currency: string
  fx?: { rate: number; equivalent: number; equivalentCurrency: string }
}

const REGIME_BASE: Record<RemittanceRegime, RegimeBase> = {
  honorarios_cl: {
    number: 'EO-RA-000142',
    paymentDate: '2026-04-30',
    beneficiary: { name: 'Camila Soto Reyes', taxId: '18.452.901-3', country: 'CL' },
    providerDoc: { kind: 'bhe', value: 'N° 1042' },
    gross: 1_000_000,
    withholding: 152_500,
    net: 847_500,
    currency: 'CLP'
  },
  international_withholding: {
    number: 'EO-RA-000143',
    paymentDate: '2026-04-30',
    beneficiary: { name: 'John Carter', taxId: 'SSN ••• 4821', country: 'US' },
    providerDoc: { kind: 'invoice', value: 'INV-0099' },
    gross: 2_000,
    withholding: 200,
    net: 1_800,
    currency: 'USD'
  },
  provider_managed: {
    number: 'EO-RA-000144',
    paymentDate: '2026-04-30',
    beneficiary: { name: 'Northbound Studio LLC', taxId: 'EIN ••• 2207', country: 'US' },
    providerDoc: { kind: 'invoice', value: 'INV-1201' },
    gross: 1_500,
    withholding: null,
    net: 1_500,
    currency: 'USD'
  },
  cross_currency: {
    number: 'EO-RA-000145',
    paymentDate: '2026-04-30',
    beneficiary: { name: 'Melkin Hernández', taxId: 'ID ••• 7741', country: 'NI' },
    providerDoc: { kind: 'invoice', value: 'INV-2048' },
    gross: 1_800,
    withholding: null,
    net: 1_800,
    currency: 'USD',
    fx: { rate: 942.5, equivalent: 1_696_500, equivalentCurrency: 'CLP' }
  }
}

// ── Locale copy ──────────────────────────────────────────────────────────────

interface RemittanceCopy {
  title: string
  numberLabel: string
  issuerSection: string
  beneficiarySection: string
  providerDocSection: string
  breakdownSection: string
  paymentSection: string
  footerNote: string
  issuerTaxIdLabel: string
  beneficiaryTaxIdLabel: string
  countryLabel: string
  paymentDateLabel: string
  methodLabel: string
  methodValue: string
  referenceLabel: string
  grossLabel: string
  withholdingSiiLabel: string
  withholdingGenericLabel: string
  withholdingManagedNote: string
  netLabel: string
  fxLabel: (rate: number, equivalent: string) => string
  disclaimer: string
  regimeLabels: Record<RemittanceRegime, string>
  providerDocKind: Record<'bhe' | 'invoice', string>
  countryNames: Record<'CL' | 'US' | 'NI', string>
}

const COPY: Record<RemittanceLocale, RemittanceCopy> = {
  'es-CL': {
    title: 'Comprobante de Pago',
    numberLabel: 'N°',
    issuerSection: 'Emisor',
    beneficiarySection: 'Beneficiario',
    providerDocSection: 'Documento del prestador',
    breakdownSection: 'Detalle del pago',
    paymentSection: 'Datos del pago',
    footerNote: 'Documento generado por Greenhouse. No es un documento tributario; el documento tributario es el emitido por el prestador.',
    issuerTaxIdLabel: 'RUT',
    beneficiaryTaxIdLabel: 'Identificación',
    countryLabel: 'País',
    paymentDateLabel: 'Fecha de pago',
    methodLabel: 'Medio de pago',
    methodValue: 'Transferencia bancaria',
    referenceLabel: 'Referencia',
    grossLabel: 'Monto bruto (servicios)',
    withholdingSiiLabel: 'Retención SII (15,25%)',
    withholdingGenericLabel: 'Retención',
    withholdingManagedNote: 'Retención gestionada por el proveedor / país de residencia',
    netLabel: 'Neto pagado',
    fxLabel: (rate, equivalent) => `Tipo de cambio aplicado: 1 USD = ${rate.toLocaleString('es-CL')} CLP · Equivalente: ${equivalent}`,
    disclaimer:
      'Pago por prestación de servicios profesionales. No constituye remuneración ni vínculo de subordinación o dependencia.',
    regimeLabels: {
      honorarios_cl: 'Honorarios Chile',
      international_withholding: 'Internacional',
      provider_managed: 'Vía proveedor',
      cross_currency: 'Internacional (FX)'
    },
    providerDocKind: { bhe: 'Boleta de Honorarios', invoice: 'Invoice' },
    countryNames: { CL: 'Chile', US: 'Estados Unidos', NI: 'Nicaragua' }
  },
  'en-US': {
    title: 'Remittance Advice',
    numberLabel: 'No.',
    issuerSection: 'Issuer',
    beneficiarySection: 'Payee',
    providerDocSection: 'Provider document',
    breakdownSection: 'Payment breakdown',
    paymentSection: 'Payment details',
    footerNote: 'Document generated by Greenhouse. This is not a tax document; the tax document is the one issued by the provider.',
    issuerTaxIdLabel: 'Tax ID',
    beneficiaryTaxIdLabel: 'Tax ID',
    countryLabel: 'Country',
    paymentDateLabel: 'Payment date',
    methodLabel: 'Payment method',
    methodValue: 'Bank transfer',
    referenceLabel: 'Reference',
    grossLabel: 'Gross amount (services)',
    withholdingSiiLabel: 'SII withholding (15.25%)',
    withholdingGenericLabel: 'Withholding',
    withholdingManagedNote: 'Withholding managed by the provider / country of residence',
    netLabel: 'Net paid',
    fxLabel: (rate, equivalent) => `Exchange rate applied: 1 USD = ${rate.toLocaleString('en-US')} CLP · Equivalent: ${equivalent}`,
    disclaimer:
      'Payment for professional services rendered. This is not remuneration and does not constitute an employment or subordination relationship.',
    regimeLabels: {
      honorarios_cl: 'Chile professional services',
      international_withholding: 'International',
      provider_managed: 'Provider-managed',
      cross_currency: 'International (FX)'
    },
    providerDocKind: { bhe: 'Professional services receipt (BHE)', invoice: 'Invoice' },
    countryNames: { CL: 'Chile', US: 'United States', NI: 'Nicaragua' }
  }
}

const ISSUER = {
  legalName: 'Efeonce Group SpA',
  taxId: '77.357.182-1',
  address: 'Santiago, Chile',
  logoSrc: '/branding/logo-full.svg'
}

const formatDate = (iso: string, locale: RemittanceLocale) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })

export const REMITTANCE_REGIMES: RemittanceRegime[] = [
  'honorarios_cl',
  'international_withholding',
  'provider_managed',
  'cross_currency'
]

export const buildRemittancePresentation = (
  regime: RemittanceRegime,
  locale: RemittanceLocale
): RemittancePresentation => {
  const base = REGIME_BASE[regime]
  const copy = COPY[locale]

  const breakdown: RemittanceBreakdownRow[] = [
    { id: 'gross', label: copy.grossLabel, amount: base.gross, currency: base.currency, kind: 'gross' }
  ]

  if (base.withholding !== null) {
    breakdown.push({
      id: 'withholding',
      label: regime === 'honorarios_cl' ? copy.withholdingSiiLabel : copy.withholdingGenericLabel,
      amount: base.withholding,
      currency: base.currency,
      kind: 'withholding',
      negative: true
    })
  }

  breakdown.push({
    id: 'net',
    label: copy.netLabel,
    amount: base.net,
    currency: base.currency,
    kind: 'net',
    emphasis: true
  })

  const equivalentFormatted =
    base.fx != null
      ? base.fx.equivalent.toLocaleString(locale, { style: 'currency', currency: base.fx.equivalentCurrency, maximumFractionDigits: 0 })
      : ''

  return {
    regime,
    locale,
    number: base.number,
    issuer: {
      legalName: ISSUER.legalName,
      taxIdLabel: copy.issuerTaxIdLabel,
      taxId: ISSUER.taxId,
      address: ISSUER.address,
      logoSrc: ISSUER.logoSrc
    },
    beneficiary: {
      name: base.beneficiary.name,
      taxIdLabel: copy.beneficiaryTaxIdLabel,
      taxId: base.beneficiary.taxId,
      countryLabel: copy.countryLabel,
      country: copy.countryNames[base.beneficiary.country]
    },
    providerDocument: {
      label: copy.providerDocKind[base.providerDoc.kind],
      value: base.providerDoc.value
    },
    breakdown,
    fx: base.fx != null ? { label: 'FX', value: copy.fxLabel(base.fx.rate, equivalentFormatted) } : undefined,
    payment: {
      dateLabel: copy.paymentDateLabel,
      dateValue: formatDate(base.paymentDate, locale),
      methodLabel: copy.methodLabel,
      methodValue: copy.methodValue,
      referenceLabel: copy.referenceLabel,
      referenceValue: 'TRX-88231'
    },
    disclaimer: regime === 'provider_managed' ? `${copy.withholdingManagedNote}. ${copy.disclaimer}` : copy.disclaimer,
    labels: {
      title: copy.title,
      numberLabel: copy.numberLabel,
      issuerSection: copy.issuerSection,
      beneficiarySection: copy.beneficiarySection,
      providerDocSection: copy.providerDocSection,
      breakdownSection: copy.breakdownSection,
      paymentSection: copy.paymentSection,
      footerNote: copy.footerNote,
      regimeLabel: copy.regimeLabels[regime]
    }
  }
}
