import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-784 — Readiness gates por caso de uso.
 *
 * Cada gate evalua "esta persona/member tiene los datos legales que el
 * caso de uso requiere". El return shape es estable:
 *
 *   { ready: boolean, blockers: ReadinessBlocker[], warnings: ReadinessWarning[] }
 *
 * `blockers` impide la accion. `warnings` la permite pero recomienda
 * resolver (ej. doc en `pending_review` se permite con warning, pero
 * `verified` se exige para finiquito laboral Chile).
 *
 * NUNCA inventar validaciones inline en consumers (TASK-783, document
 * generators, payroll engine). Siempre usar estos gates.
 */

export type ReadinessUseCase =
  | 'payroll_chile_dependent'
  | 'final_settlement_chile'
  | 'honorarios_closure'
  | 'document_render_payroll_receipt'
  | 'document_render_onboarding_contract'

export type ReadinessBlocker =
  | 'profile_missing'
  | 'cl_rut_missing'
  | 'cl_rut_pending_review'
  | 'cl_rut_rejected'
  | 'cl_rut_archived_or_expired'
  | 'document_missing'
  | 'document_pending_review'
  | 'address_missing_legal'
  | 'address_missing_residence'

export type ReadinessWarning =
  | 'cl_rut_pending_review_advisory'
  | 'address_pending_review_advisory'
  | 'evidence_missing'

export interface ReadinessResult {
  ready: boolean
  useCase: ReadinessUseCase
  blockers: ReadinessBlocker[]
  warnings: ReadinessWarning[]
}

interface DocumentSnapshot {
  document_type: string
  country_code: string
  verification_status: string
  evidence_asset_id: string | null
  [key: string]: unknown
}

interface AddressSnapshot {
  address_type: string
  country_code: string
  verification_status: string
  evidence_asset_id: string | null
  [key: string]: unknown
}

interface ProfileLegalSummary {
  profileId: string
  documents: DocumentSnapshot[]
  addresses: AddressSnapshot[]
}

const loadLegalSummary = async (profileId: string): Promise<ProfileLegalSummary | null> => {
  const documents = await query<DocumentSnapshot>(
    `
      SELECT document_type, country_code, verification_status, evidence_asset_id
      FROM greenhouse_core.person_identity_documents
      WHERE profile_id = $1
        AND verification_status NOT IN ('archived', 'expired')
    `,
    [profileId]
  )

  const addresses = await query<AddressSnapshot>(
    `
      SELECT address_type, country_code, verification_status, evidence_asset_id
      FROM greenhouse_core.person_addresses
      WHERE profile_id = $1
        AND verification_status NOT IN ('archived', 'expired')
    `,
    [profileId]
  )

  return {
    profileId,
    documents: documents,
    addresses: addresses
  }
}

const findDocument = (
  summary: ProfileLegalSummary,
  documentType: string,
  countryCode: string
): DocumentSnapshot | null =>
  summary.documents.find(
    d => d.document_type === documentType && d.country_code === countryCode
  ) ?? null

const findAddress = (
  summary: ProfileLegalSummary,
  addressType: string
): AddressSnapshot | null =>
  summary.addresses.find(a => a.address_type === addressType) ?? null

// ──────────────────────────────────────────────────────────────────────────────
// Public gate
// ──────────────────────────────────────────────────────────────────────────────

export interface AssessReadinessOptions {
  /** Profile id de la persona. Si se pasa member_id, resolver previamente. */
  profileId: string
  useCase: ReadinessUseCase
}

export const assessPersonLegalReadiness = async (
  opts: AssessReadinessOptions
): Promise<ReadinessResult> => {
  const blockers: ReadinessBlocker[] = []
  const warnings: ReadinessWarning[] = []

  const summary = await loadLegalSummary(opts.profileId)

  if (!summary) {
    return {
      ready: false,
      useCase: opts.useCase,
      blockers: ['profile_missing'],
      warnings: []
    }
  }

  const requireClRut = (treatPendingAsBlocker: boolean) => {
    const doc = findDocument(summary, 'CL_RUT', 'CL')

    if (!doc) {
      blockers.push('cl_rut_missing')

      return
    }

    if (doc.verification_status === 'verified') {
      // OK
      return
    }

    if (doc.verification_status === 'pending_review') {
      if (treatPendingAsBlocker) blockers.push('cl_rut_pending_review')
      else warnings.push('cl_rut_pending_review_advisory')

      return
    }

    if (doc.verification_status === 'rejected') {
      blockers.push('cl_rut_rejected')

      return
    }

    blockers.push('cl_rut_archived_or_expired')
  }

  const requireAddress = (
    addressType: 'legal' | 'residence',
    blocker: ReadinessBlocker,
    treatPendingAsBlocker: boolean
  ) => {
    const addr = findAddress(summary, addressType)

    if (!addr) {
      blockers.push(blocker)

      return
    }

    if (addr.verification_status === 'verified') {
      return
    }

    if (addr.verification_status === 'pending_review') {
      if (treatPendingAsBlocker) blockers.push(blocker)
      else warnings.push('address_pending_review_advisory')
    }
  }

  switch (opts.useCase) {
    case 'payroll_chile_dependent':
      requireClRut(true)
      // address: requerido formalmente solo para finiquito; payroll mensual
      // tolera pending por ahora (warning).
      requireAddress('legal', 'address_missing_legal', false)
      break

    case 'final_settlement_chile':
      requireClRut(true)
      requireAddress('legal', 'address_missing_legal', true)
      break

    case 'honorarios_closure':
      requireClRut(true)
      // Direccion no requerida para boleta de honorarios.
      break

    case 'document_render_payroll_receipt':
      requireClRut(false)
      requireAddress('legal', 'address_missing_legal', false)
      break

    case 'document_render_onboarding_contract':
      requireClRut(true)
      requireAddress('residence', 'address_missing_residence', true)
      break
  }

  return {
    ready: blockers.length === 0,
    useCase: opts.useCase,
    blockers,
    warnings
  }
}
