import 'server-only'

import { query } from '@/lib/db'
import {
  listIdentityDocumentsForProfileMasked,
  resolveProfileIdForMember
} from '@/lib/person-legal-profile'

/**
 * TASK-753 — Regime resolver for self-service payment profile dialog.
 *
 * El colaborador NO elige proveedor ni medio de pago. Esos los decide
 * finance al aprobar. El colaborador SOLO declara identidad bancaria,
 * y los campos del form son data-driven por su REGIMEN (Chile dependiente,
 * honorarios Chile, internacional, o unset).
 *
 * Inputs derivan de: members.pay_regime + members.location_country +
 * identity_profiles + greenhouse_core.person_identity_documents (TASK-784).
 *
 * Frontera: este resolver NO escribe; es read-only. Si emerge un nuevo
 * régimen (e.g. EOR, contractor V3 TASK-790), se extiende el switch sin
 * branchear inline en consumers.
 */

export type SelfServiceRegime =
  | 'chile_dependent'
  | 'honorarios_chile'
  | 'international'
  | 'unset'

export interface SelfServiceContextDto {
  regime: SelfServiceRegime
  /** Two-letter ISO code derived from member.location_country. Null cuando no hay. */
  countryCode: string | null
  /** Display name del país para UI (ej. "Chile", "Colombia"). Null cuando no hay. */
  countryName: string | null
  /** Currency canonica del régimen (CLP para CL, USD para internacional). Null cuando unset. */
  currency: 'CLP' | 'USD' | null
  /** Nombre legal completo del titular (pre-fill del input "Nombre del titular"). */
  legalFullName: string | null
  /** Documento legal masked (display label) si existe TASK-784 row verified/pending_review. */
  legalDocumentMasked: string | null
  /** Tipo de documento legal (CL_RUT / CO_CC / etc) para mostrar contexto. */
  legalDocumentType: string | null
  /** Verification status del documento legal: 'verified' | 'pending_review' | null. */
  legalDocumentVerificationStatus: string | null
  /** Razon textual cuando regime='unset' — para guiar al colaborador qué falta. */
  unsetReason: string | null
}

interface MemberRow {
  member_id: string
  pay_regime: string | null
  location_country: string | null
  legal_name: string | null
  display_name: string | null
  contract_type: string | null
  identity_profile_id: string | null
  [key: string]: unknown
}

const COUNTRY_NAMES: Record<string, string> = {
  CL: 'Chile',
  CO: 'Colombia',
  AR: 'Argentina',
  PE: 'Perú',
  MX: 'México',
  EC: 'Ecuador',
  UY: 'Uruguay',
  BR: 'Brasil',
  US: 'Estados Unidos',
  ES: 'España',
  VE: 'Venezuela',
  BO: 'Bolivia',
  PY: 'Paraguay',
  CR: 'Costa Rica',
  GT: 'Guatemala',
  HN: 'Honduras',
  NI: 'Nicaragua',
  PA: 'Panamá',
  DO: 'República Dominicana',
  SV: 'El Salvador',
  CU: 'Cuba',
  PR: 'Puerto Rico'
}

/**
 * Deriva el régimen self-service desde members.pay_regime + country.
 * Conservative: cualquier ambigüedad cae a `unset` para fail-closed.
 */
const inferRegime = (
  payRegime: string | null,
  countryCode: string | null
): SelfServiceRegime => {
  const country = countryCode?.toUpperCase() ?? null
  const regime = payRegime?.toLowerCase() ?? null

  // International: cualquier país NO Chile, o pay_regime explícitamente internacional
  if (regime === 'international' || regime === 'deel' || (country && country !== 'CL')) {
    return 'international'
  }

  // Chile honorarios — pay_regime puede venir como 'honorarios' o 'honorarios_chile'
  if (regime === 'honorarios' || regime === 'honorarios_chile') {
    return 'honorarios_chile'
  }

  // Chile dependent (DEFAULT cuando country=CL y regime conocido o nulo)
  if (regime === 'chile' || regime === 'chile_dependent' || (country === 'CL' && regime !== null)) {
    return 'chile_dependent'
  }

  // Sin pay_regime y sin country → unset
  return 'unset'
}

const buildUnsetReason = (
  payRegime: string | null,
  countryCode: string | null
): string => {
  const missing: string[] = []

  if (!payRegime) missing.push('régimen laboral')
  if (!countryCode) missing.push('país')

  if (missing.length === 0) {
    return 'No pudimos determinar tu régimen. Contacta a finance.'
  }

  return `Falta en tu perfil: ${missing.join(' + ')}. Finance debe completarlo antes.`
}

export const resolveSelfServicePaymentProfileContext = async (
  memberId: string
): Promise<SelfServiceContextDto> => {
  const rows = await query<MemberRow>(
    `SELECT m.member_id,
            m.pay_regime,
            m.location_country,
            m.legal_name,
            m.display_name,
            m.contract_type,
            m.identity_profile_id
       FROM greenhouse_core.members m
      WHERE m.member_id = $1
      LIMIT 1`,
    [memberId]
  )

  const member = rows[0]

  if (!member) {
    return {
      regime: 'unset',
      countryCode: null,
      countryName: null,
      currency: null,
      legalFullName: null,
      legalDocumentMasked: null,
      legalDocumentType: null,
      legalDocumentVerificationStatus: null,
      unsetReason: 'Tu identidad como colaborador no está registrada. Contacta a finance.'
    }
  }

  const countryCode = member.location_country?.toUpperCase() ?? null
  const regime = inferRegime(member.pay_regime, countryCode)

  const currency: 'CLP' | 'USD' | null =
    regime === 'chile_dependent' || regime === 'honorarios_chile'
      ? 'CLP'
      : regime === 'international'
        ? 'USD'
        : null

  let legalDocumentMasked: string | null = null
  let legalDocumentType: string | null = null
  let legalDocumentVerificationStatus: string | null = null

  if (regime !== 'unset') {
    try {
      const profileId = await resolveProfileIdForMember(memberId)

      if (profileId) {
        const docs = await listIdentityDocumentsForProfileMasked(profileId)

        // Prefer verified > pending_review. Within same status, most recent declared.
        const sorted = docs
          .filter(d => d.verificationStatus === 'verified' || d.verificationStatus === 'pending_review')
          .sort((a, b) => {
            if (a.verificationStatus !== b.verificationStatus) {
              return a.verificationStatus === 'verified' ? -1 : 1
            }

            return b.declaredAt.localeCompare(a.declaredAt)
          })

        const preferred = sorted[0] ?? null

        if (preferred) {
          legalDocumentMasked = preferred.displayMask
          legalDocumentType = preferred.documentType
          legalDocumentVerificationStatus = preferred.verificationStatus
        }
      }
    } catch {
      // Identity document lookup failure is non-fatal — UI will simply
      // not pre-fill the identity card; colaborador can still submit.
      legalDocumentMasked = null
    }
  }

  return {
    regime,
    countryCode,
    countryName: countryCode ? (COUNTRY_NAMES[countryCode] ?? countryCode) : null,
    currency,
    legalFullName: member.legal_name ?? member.display_name ?? null,
    legalDocumentMasked,
    legalDocumentType,
    legalDocumentVerificationStatus,
    unsetReason: regime === 'unset' ? buildUnsetReason(member.pay_regime, countryCode) : null
  }
}
