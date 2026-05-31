import 'server-only'

/**
 * TASK-960 Slice 2 — Contractor Remittance Advice server resolver.
 *
 * Gathers every input the PURE presenter needs from the ContractorPayable SSOT +
 * the Operating Entity issuer + beneficiary identity + the contractor's locale +
 * the allocated `EO-RA-NNNNNN` number, then calls `buildRemittanceAdvice`. Money is
 * read VERBATIM from the payable — never recomputed (TASK-793/794 own the amounts).
 *
 * A document is only emitted for a `paid` payable. The number is allocated lazily
 * here (idempotent) the first time the document is emitted.
 *
 * IDOR is the endpoint's responsibility — this resolver surfaces `engagementProfileId`
 * so a `/my/*` route can assert it matches the subject before serving.
 *
 * V1 note — the informational FX line is intentionally omitted: the payable carries
 * `fxPolicyCode` (a policy, not the rate actually applied at payment), so showing
 * "tipo de cambio aplicado" would mislabel. Honest degrade per spec ("no inventa FX").
 * Follow-up: populate `fx` once the applied rate is captured on the payable.
 */

import { query } from '@/lib/db'
import { getOrganizationIssuerIdentityById } from '@/lib/account-360/organization-identity'
import { resolveEmailLocale } from '@/lib/email/locale-resolver'
import { resolveProfileDisplayName } from '@/lib/identity/profile-display-names'
import { captureWithDomain } from '@/lib/observability/capture'
import { listIdentityDocumentsForProfileMasked } from '@/lib/person-legal-profile/readers'

import { getContractorEngagementById } from '../store'
import type { ContractorEngagement } from '../types'
import { getContractorPayableById } from '../payables/store'
import type { ContractorPayable } from '../payables/types'

import { buildRemittanceAdvice } from './remittance-presenter'
import { allocateRemittanceAdviceNumber } from './remittance-number-allocator'
import type {
  RemittanceAdviceInput,
  RemittanceLocale,
  RemittancePresentation,
  RemittanceProviderDocKind,
  RemittanceRegime
} from './types'

const ISSUER_LOGO_SRC = '/branding/logo-full.svg'

const PROVIDER_OWNED_TAX_OWNERS = new Set(['provider_owned', 'country_engine_owned'])

export type RemittanceAdviceResolution =
  | {
      ok: true
      presentation: RemittancePresentation
      payable: ContractorPayable
      engagementProfileId: string
      remittanceNumber: string
      locale: RemittanceLocale
    }
  | { ok: false; reason: 'not_found' | 'not_paid' | 'engagement_missing' | 'issuer_unresolved' }

const deriveRegime = (
  engagement: ContractorEngagement,
  payable: ContractorPayable
): RemittanceRegime => {
  if (engagement.relationshipSubtype === 'honorarios_cl') return 'honorarios_cl'

  const paymentCurrency = payable.paymentCurrency ?? engagement.paymentCurrency

  if (paymentCurrency && paymentCurrency !== payable.currency) return 'cross_currency'

  if (payable.withholdingAmount > 0) return 'international_withholding'

  return 'provider_managed'
}

const resolveProviderDocument = (
  engagement: ContractorEngagement,
  payable: ContractorPayable
): RemittanceAdviceInput['providerDocument'] => {
  const kind: RemittanceProviderDocKind =
    engagement.relationshipSubtype === 'honorarios_cl' ? 'bhe' : 'invoice'

  return { kind, value: payable.contractorInvoiceId }
}

const resolveBeneficiaryTaxMask = async (profileId: string): Promise<string | null> => {
  try {
    const docs = await listIdentityDocumentsForProfileMasked(profileId)

    if (docs.length === 0) return null

    const verified = docs.find(d => d.verificationStatus === 'verified')

    return (verified ?? docs[0]).displayMask ?? null
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'remittance_resolver', stage: 'beneficiary_tax_mask' },
      extra: { profileId }
    })

    return null
  }
}

const resolveContractorLocale = async (
  profileId: string,
  override?: RemittanceLocale
): Promise<RemittanceLocale> => {
  if (override) return override

  try {
    const rows = await query<{ preferred_locale: string | null }>(
      `SELECT preferred_locale FROM greenhouse_core.identity_profiles WHERE profile_id = $1`,
      [profileId]
    )

    return resolveEmailLocale(rows[0]?.preferred_locale) as RemittanceLocale
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'remittance_resolver', stage: 'resolve_locale' },
      extra: { profileId }
    })

    return 'es-CL'
  }
}

export interface ResolveRemittanceAdviceOptions {
  /** Admin viewer locale toggle (es/en). The contractor's own locale wins when absent. */
  localeOverride?: RemittanceLocale
}

export const resolveRemittanceAdvice = async (
  payableId: string,
  options: ResolveRemittanceAdviceOptions = {}
): Promise<RemittanceAdviceResolution> => {
  const payable = await getContractorPayableById(payableId)

  if (!payable) return { ok: false, reason: 'not_found' }
  if (payable.status !== 'paid') return { ok: false, reason: 'not_paid' }

  const engagement = await getContractorEngagementById(payable.contractorEngagementId)

  if (!engagement) return { ok: false, reason: 'engagement_missing' }

  const issuer = await getOrganizationIssuerIdentityById(engagement.legalEntityOrganizationId)

  if (!issuer) return { ok: false, reason: 'issuer_unresolved' }

  const [{ remittanceNumber }, beneficiaryName, beneficiaryTaxId, locale] = await Promise.all([
    allocateRemittanceAdviceNumber({
      issuerOrganizationId: engagement.legalEntityOrganizationId,
      contractorPayableId: payable.contractorPayableId
    }),
    resolveProfileDisplayName(engagement.profileId).then(name => name ?? 'Contractor'),
    resolveBeneficiaryTaxMask(engagement.profileId),
    resolveContractorLocale(engagement.profileId, options.localeOverride)
  ])

  const regime = deriveRegime(engagement, payable)

  const withholdingManagedByProvider =
    payable.withholdingAmount === 0 && PROVIDER_OWNED_TAX_OWNERS.has(engagement.taxComplianceOwner)

  const input: RemittanceAdviceInput = {
    regime,
    number: remittanceNumber,
    issuer: {
      legalName: issuer.legalName,
      taxId: issuer.taxId,
      address: issuer.legalAddress ?? issuer.country,
      logoSrc: ISSUER_LOGO_SRC
    },
    beneficiary: {
      name: beneficiaryName,
      taxId: beneficiaryTaxId,
      country: engagement.countryCode
    },
    providerDocument: resolveProviderDocument(engagement, payable),
    gross: payable.grossAmount,
    withholding: payable.withholdingAmount > 0 ? payable.withholdingAmount : null,
    net: payable.netPayable,
    currency: payable.currency,
    withholdingManagedByProvider,
    withholdingRate: engagement.taxWithholdingRateSnapshot,
    // V1: FX informational line omitted (no applied-rate source on the payable).
    fx: null,
    payment: {
      // Paid payables carry their settlement timestamp in updatedAt; the obligation/
      // payment-order own the exact paid date downstream — V1 uses the payable's
      // last-updated date as the payment date.
      dateIso: (payable.updatedAt ?? payable.createdAt).slice(0, 10),
      reference: payable.paymentOrderId ?? payable.financeObligationId
    }
  }

  return {
    ok: true,
    presentation: buildRemittanceAdvice(input, locale),
    payable,
    engagementProfileId: engagement.profileId,
    remittanceNumber,
    locale
  }
}
