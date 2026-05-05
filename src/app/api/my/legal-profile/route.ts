import { NextResponse } from 'next/server'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import {
  PersonLegalProfileError,
  declareIdentityDocument,
  declarePersonAddress,
  isPersonDocumentType,
  listAddressesForProfileMasked,
  listIdentityDocumentsForProfileMasked,
  resolveProfileIdForMember,
  assessPersonLegalReadiness
} from '@/lib/person-legal-profile'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const errorResponse = (status: number, message: string, code?: string) =>
  NextResponse.json({ error: message, code: code ?? 'error' }, { status })

const VALID_DECLARE_KIND = ['document', 'address'] as const

type DeclareKind = (typeof VALID_DECLARE_KIND)[number]

const isDeclareKind = (v: unknown): v is DeclareKind =>
  typeof v === 'string' && (VALID_DECLARE_KIND as readonly string[]).includes(v)

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/my/legal-profile
// ──────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse
  }

  try {
    const profileId =
      tenant.identityProfileId ??
      (tenant.memberId ? await resolveProfileIdForMember(tenant.memberId) : null)

    if (!profileId) {
      return errorResponse(409, 'Identity profile not linked to this user', 'profile_not_linked')
    }

    const [documents, addresses] = await Promise.all([
      listIdentityDocumentsForProfileMasked(profileId),
      listAddressesForProfileMasked(profileId)
    ])

    // Readiness para 2 use cases mas relevantes para self-service
    const [readinessPayrollChile, readinessFinalSettlement] = await Promise.all([
      assessPersonLegalReadiness({ profileId, useCase: 'payroll_chile_dependent' }),
      assessPersonLegalReadiness({ profileId, useCase: 'final_settlement_chile' })
    ])

    return NextResponse.json({
      profileId,
      documents,
      addresses,
      readiness: {
        payrollChileDependent: readinessPayrollChile,
        finalSettlementChile: readinessFinalSettlement
      }
    })
  } catch (error) {
    captureWithDomain(error, 'identity', { extra: { route: '/api/my/legal-profile', method: 'GET' } })

    return errorResponse(500, redactErrorForResponse(error), 'internal_error')
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/my/legal-profile
// Body shape:
//   { kind: 'document', countryCode, documentType, rawValue, evidenceAssetId?, ... }
//   { kind: 'address', addressType, countryCode, streetLine1, ..., evidenceAssetId? }
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'JSON body invalid', 'invalid_input')
  }

  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'JSON body invalid', 'invalid_input')
  }

  const payload = body as Record<string, unknown>

  if (!isDeclareKind(payload.kind)) {
    return errorResponse(400, 'kind must be document|address', 'invalid_input')
  }

  try {
    const profileId =
      tenant.identityProfileId ??
      (tenant.memberId ? await resolveProfileIdForMember(tenant.memberId) : null)

    if (!profileId) {
      return errorResponse(409, 'Identity profile not linked to this user', 'profile_not_linked')
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = request.headers.get('user-agent') ?? null

    if (payload.kind === 'document') {
      if (!isPersonDocumentType(payload.documentType)) {
        return errorResponse(400, 'documentType invalido', 'invalid_input')
      }

      if (typeof payload.countryCode !== 'string' || typeof payload.rawValue !== 'string') {
        return errorResponse(400, 'countryCode + rawValue requeridos', 'invalid_input')
      }

      const result = await declareIdentityDocument({
        profileId,
        countryCode: payload.countryCode,
        documentType: payload.documentType,
        rawValue: payload.rawValue,
        source: 'self_declared',
        issuingCountry: typeof payload.issuingCountry === 'string' ? payload.issuingCountry : null,
        validFrom: typeof payload.validFrom === 'string' ? payload.validFrom : null,
        validUntil: typeof payload.validUntil === 'string' ? payload.validUntil : null,
        evidenceAssetId:
          typeof payload.evidenceAssetId === 'string' ? payload.evidenceAssetId : null,
        notes: typeof payload.notes === 'string' ? payload.notes : null,
        declaredByUserId: tenant.userId ?? null,
        ipAddress,
        userAgent
      })

      return NextResponse.json(result, { status: 201 })
    }

    if (payload.kind === 'address') {
      if (
        typeof payload.addressType !== 'string' ||
        typeof payload.countryCode !== 'string' ||
        typeof payload.streetLine1 !== 'string' ||
        typeof payload.city !== 'string'
      ) {
        return errorResponse(400, 'addressType, countryCode, streetLine1, city requeridos', 'invalid_input')
      }

      const result = await declarePersonAddress({
        profileId,
        addressType: payload.addressType as 'legal' | 'residence' | 'mailing' | 'emergency',
        countryCode: payload.countryCode,
        streetLine1: payload.streetLine1,
        streetLine2: typeof payload.streetLine2 === 'string' ? payload.streetLine2 : null,
        city: payload.city,
        region: typeof payload.region === 'string' ? payload.region : null,
        postalCode: typeof payload.postalCode === 'string' ? payload.postalCode : null,
        source: 'self_declared',
        validFrom: typeof payload.validFrom === 'string' ? payload.validFrom : null,
        validUntil: typeof payload.validUntil === 'string' ? payload.validUntil : null,
        evidenceAssetId:
          typeof payload.evidenceAssetId === 'string' ? payload.evidenceAssetId : null,
        notes: typeof payload.notes === 'string' ? payload.notes : null,
        declaredByUserId: tenant.userId ?? null,
        ipAddress,
        userAgent
      })

      return NextResponse.json(result, { status: 201 })
    }

    return errorResponse(400, 'kind not handled', 'invalid_input')
  } catch (error) {
    if (error instanceof PersonLegalProfileError) {
      return errorResponse(error.statusCode, redactErrorForResponse(error), error.code)
    }

    captureWithDomain(error, 'identity', { extra: { route: '/api/my/legal-profile', method: 'POST' } })

    return errorResponse(500, redactErrorForResponse(error), 'internal_error')
  }
}
