import { NextResponse } from 'next/server'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireScimAuth } from '@/lib/scim/auth'
import { evaluateInternalCollaboratorEligibility } from '@/lib/scim/eligibility'
import { listActiveOverridesForTenantMapping } from '@/lib/scim/eligibility-overrides-store'
import { toScimUser, toScimError, toScimListResponse } from '@/lib/scim/formatters'
import {
  getUserByExternalId,
  getUserByEmail,
  queryUsersByFilter,
  listUsers,
  createUser,
  getTenantMappingByDomain,
  getTenantMappingByTenantId,
  getUserById,
  logScimOperation
} from '@/lib/scim/provisioning'
import {
  MemberIdentityDriftError,
  provisionInternalCollaboratorFromScim
} from '@/lib/scim/provisioning-internal-collaborator'

import type { ScimCreateUserRequest } from '@/types/scim'

const isInternalCollaboratorPrimitiveEnabled = () =>
  process.env.SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED === 'true'

export const dynamic = 'force-dynamic'

const MICROSOFT_OBJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── GET /api/scim/v2/Users — List or filter users ──

export async function GET(request: Request) {
  const auth = await requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const url = new URL(request.url)
    const filter = url.searchParams.get('filter')
    const startIndex = Math.max(1, parseInt(url.searchParams.get('startIndex') || '1', 10))
    const count = Math.min(100, Math.max(1, parseInt(url.searchParams.get('count') || '100', 10)))

    if (filter) {
      // Parse basic SCIM filter: 'fieldName eq "value"'
      const match = filter.match(/(\w+)\s+eq\s+"([^"]+)"/)

      if (!match) {
        return NextResponse.json(toScimError('Invalid filter syntax', 400), { status: 400 })
      }

      const [, field, value] = match
      const rows = await queryUsersByFilter(field, value)

      await logScimOperation({
        operation: 'LIST',
        requestSummary: { filter },
        responseStatus: 200
      })

      return NextResponse.json(
        toScimListResponse(rows.map(toScimUser), startIndex, count, rows.length)
      )
    }

    const { rows, total } = await listUsers(startIndex, count)

    await logScimOperation({
      operation: 'LIST',
      requestSummary: { startIndex, count },
      responseStatus: 200
    })

    return NextResponse.json(
      toScimListResponse(rows.map(toScimUser), startIndex, count, total)
    )
  } catch (error) {
    console.error('[scim] GET /Users error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}

// ── POST /api/scim/v2/Users — Create user ──

export async function POST(request: Request) {
  const auth = await requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const body = (await request.json().catch(() => null)) as ScimCreateUserRequest | null

    if (!body) {
      return NextResponse.json(toScimError('Invalid JSON body', 400), { status: 400 })
    }

    const userName = body.userName
    const displayName = body.displayName || `${body.name?.givenName || ''} ${body.name?.familyName || ''}`.trim()
    const email = body.emails?.find((e) => e.primary)?.value || body.emails?.[0]?.value || userName
    const externalId = body.externalId
    const active = body.active !== false

    if (!userName || !email) {
      return NextResponse.json(toScimError('userName and email are required', 400), { status: 400 })
    }

    if (!externalId || !MICROSOFT_OBJECT_ID_PATTERN.test(externalId)) {
      await logScimOperation({
        operation: 'CREATE',
        externalId,
        email,
        responseStatus: 400,
        errorMessage: 'SCIM externalId must be the Microsoft Entra objectId'
      })

      return NextResponse.json(
        toScimError('externalId must be the Microsoft Entra objectId', 400),
        { status: 400 }
      )
    }

    // Check if user already exists by externalId or email
    const existing = await getUserByExternalId(externalId)

    if (existing) {
      await logScimOperation({
        operation: 'CREATE',
        scimId: existing.scim_id,
        externalId,
        email,
        responseStatus: 409,
        errorMessage: 'User already exists by externalId'
      })

      return NextResponse.json(toScimError('User already exists', 409), { status: 409 })
    }

    const existingByEmail = await getUserByEmail(email)

    if (existingByEmail) {
      await logScimOperation({
        operation: 'CREATE',
        scimId: existingByEmail.scim_id,
        externalId,
        email,
        responseStatus: 409,
        errorMessage: 'User already exists by email'
      })

      return NextResponse.json(toScimError('User already exists', 409), { status: 409 })
    }

    // Resolve tenant mapping
    const emailDomain = email.split('@')[1]?.toLowerCase()

    // Try tenant ID first (from externalId context), then domain
    let mapping = externalId
      ? await getTenantMappingByTenantId(externalId).catch(() => null)
      : null

    if (!mapping && emailDomain) {
      mapping = await getTenantMappingByDomain(emailDomain)
    }

    if (!mapping || !mapping.auto_provision) {
      await logScimOperation({
        operation: 'CREATE',
        externalId,
        email,
        responseStatus: 400,
        errorMessage: `No tenant mapping for domain ${emailDomain} or auto-provisioning disabled`
      })

      return NextResponse.json(
        toScimError(
          `No tenant mapping found for domain ${emailDomain}, or auto-provisioning is disabled`,
          400
        ),
        { status: 400 }
      )
    }

    const isInternalTenant = mapping.client_id === null

    // TASK-872 Slice 3 — Branch: internal eligible vs legacy createUser path.
    // Flag SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=true gatea el nuevo primitive.
    // Cuando false (default prod) o tenant_type='client' (externo) → path legacy.
    if (isInternalTenant && isInternalCollaboratorPrimitiveEnabled()) {
      // Evaluate eligibility (4-layer policy)
      const overrides = await listActiveOverridesForTenantMapping(mapping.scim_tenant_mapping_id)

      const verdict = evaluateInternalCollaboratorEligibility({
        upn: userName,
        email,
        externalId,
        displayName: body.name?.givenName || body.name?.familyName ? displayName : displayName || null,
        givenName: body.name?.givenName ?? null,
        familyName: body.name?.familyName ?? null,
        allowedDomains: mapping.allowed_email_domains,
        overrides
      })

      // Hard reject: no client_user, no member
      if (!verdict.eligible && verdict.outcome === 'reject') {
        await logScimOperation({
          operation: 'CREATE',
          externalId,
          email,
          microsoftTenantId: mapping.microsoft_tenant_id,
          responseStatus: 400,
          errorMessage: `Eligibility reject: ${verdict.reason}`
        })

        return NextResponse.json(
          toScimError(`SCIM user ineligible (${verdict.reason})`, 400),
          { status: 400 }
        )
      }

      // client_user_only: fallback al legacy path (sin crear member)
      if (!verdict.eligible && verdict.outcome === 'client_user_only') {
        const newUser = await createUser({
          email,
          displayName: displayName || email,
          microsoftOid: externalId,
          microsoftTenantId: mapping.microsoft_tenant_id,
          microsoftEmail: email,
          clientId: mapping.client_id,
          tenantType: 'efeonce_internal',
          defaultRoleCode: mapping.default_role_code,
          active
        })

        await logScimOperation({
          operation: 'CREATE',
          scimId: newUser.scim_id,
          externalId,
          email,
          microsoftTenantId: mapping.microsoft_tenant_id,
          responseStatus: 201,
          errorMessage: `client_user_only: ${verdict.reason}`
        })

        return NextResponse.json(toScimUser(newUser), { status: 201 })
      }

      // Eligible (verdict.eligible === true): full primitive
      try {
        const result = await provisionInternalCollaboratorFromScim({
          email,
          externalId,
          displayName: displayName || email,
          microsoftTenantId: mapping.microsoft_tenant_id,
          microsoftEmail: email,
          tenantMappingId: mapping.scim_tenant_mapping_id,
          defaultRoleCode: mapping.default_role_code,
          active,
          entraJobTitle: null, // SCIM standard doesn't include jobTitle; cron enrichment posterior
          eligibilityVerdict: verdict
        })

        await logScimOperation({
          operation: 'CREATE',
          scimId: result.scimId,
          externalId,
          email,
          microsoftTenantId: mapping.microsoft_tenant_id,
          responseStatus: 201,
          errorMessage: result.idempotent ? 'idempotent' : null
        })

        // Re-fetch row for SCIM-shaped response
        const userRow = await getUserById(result.userId)

        if (!userRow) {
          return NextResponse.json(toScimError('Internal error: user disappeared post-provision', 500), { status: 500 })
        }

        return NextResponse.json(toScimUser(userRow), { status: 201 })
      } catch (error) {
        if (error instanceof MemberIdentityDriftError) {
          captureWithDomain(error, 'identity', {
            tags: { source: 'scim_provisioning', stage: 'cascade_d2_drift', kind: error.kind },
            extra: { memberId: error.memberId, details: error.details, externalId, email }
          })

          await logScimOperation({
            operation: 'CREATE',
            externalId,
            email,
            microsoftTenantId: mapping.microsoft_tenant_id,
            responseStatus: 500,
            errorMessage: `member_identity_drift: ${error.kind}`
          })

          return NextResponse.json(toScimError('Member identity drift detected — human resolution required', 500), { status: 500 })
        }

        throw error
      }
    }

    // Legacy path (tenant_type='client' externo, OR flag disabled)
    const newUser = await createUser({
      email,
      displayName: displayName || email,
      microsoftOid: externalId || '',
      microsoftTenantId: mapping.microsoft_tenant_id,
      microsoftEmail: email,
      clientId: mapping.client_id,
      tenantType: isInternalTenant ? 'efeonce_internal' : 'client',
      defaultRoleCode: mapping.default_role_code,
      active
    })

    await logScimOperation({
      operation: 'CREATE',
      scimId: newUser.scim_id,
      externalId,
      email,
      microsoftTenantId: mapping.microsoft_tenant_id,
      responseStatus: 201
    })

    return NextResponse.json(toScimUser(newUser), { status: 201 })
  } catch (error) {
    captureWithDomain(error instanceof Error ? error : new Error(String(error)), 'identity', {
      tags: { source: 'scim_provisioning', stage: 'unknown' }
    })

    await logScimOperation({
      operation: 'CREATE',
      responseStatus: 500,
      errorMessage: redactErrorForResponse(error)
    }).catch(() => {})

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}
