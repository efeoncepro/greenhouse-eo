/**
 * TASK-960 — Contractor Remittance Advice presentation contract.
 *
 * `RemittancePresentation` is the SINGLE struct consumed by BOTH renderers — the
 * MUI in-app viewer and the react-pdf download — so content can never drift
 * (pattern TASK-758). The shape is identical to the APPROVED mockup struct
 * (`mockup/remittance-data.ts`): the mockup keeps its own copy as the frozen design
 * reference + GVC scenarios; THIS is the runtime SSOT of the shape.
 *
 * Pure types (NOT server-only) — shared by the pure presenter, the server resolver,
 * the client viewer and tests.
 */

import type { RemittanceLocale, RemittanceProviderDocKind, RemittanceRegime } from '@/lib/copy/remittance'

export type { RemittanceLocale, RemittanceProviderDocKind, RemittanceRegime } from '@/lib/copy/remittance'

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

/**
 * Fully-resolved data bag for the PURE presenter. The server resolver fills this
 * from the `ContractorPayable` (SSOT — amounts read verbatim, NEVER recomputed) +
 * the Operating Entity issuer + beneficiary identity + locale + allocated number.
 * Keeping the presenter pure (no IO) makes the 4-regime breakdown fully testable.
 */
export interface RemittanceAdviceInput {
  regime: RemittanceRegime
  /** Allocated correlative `EO-RA-NNNNNN`. */
  number: string
  issuer: {
    legalName: string
    /** Raw value; the label is resolved by locale copy. */
    taxId: string
    address: string
    /** Logo path for the MUI viewer; the PDF resolves its own PNG. */
    logoSrc: string
  }
  beneficiary: {
    name: string
    /** Masked id (e.g. `18.452.901-3`); null when unavailable → honest degrade. */
    taxId: string | null
    /** Display country (already localized name or ISO code). */
    country: string
  }
  /** The contractor's own tax document. Null when not yet linked → section degrades. */
  providerDocument: {
    kind: RemittanceProviderDocKind
    value: string | null
  } | null
  /** Read verbatim from the payable — NEVER recomputed. */
  gross: number
  /** Withholding amount, or null when no withholding row applies (provider/country-managed). */
  withholding: number | null
  net: number
  /** Obligation currency of the amounts above. */
  currency: string
  /** True when withholding is null because a provider/country owns it (drives the managed note). */
  withholdingManagedByProvider: boolean
  /** Honorarios SII rate snapshot (fraction, e.g. 0.1525) — drives the "(15,25%)" label. */
  withholdingRate: number | null
  /** Informational FX line; omitted when not cross-currency or no rate resolvable. */
  fx: {
    rate: number
    equivalent: number
    equivalentCurrency: string
  } | null
  payment: {
    /** ISO date of the payment. */
    dateIso: string
    /** Payment reference (TRX id), or null. */
    reference: string | null
  }
}
