import { NextResponse } from 'next/server'

import { requireScimAuth } from '@/lib/scim/auth'
import { toScimUser, toScimError, toScimListResponse } from '@/lib/scim/formatters'
import {
  getUserByExternalId,
  getUserByEmail,
  queryUsersByFilter,
  listUsers,
  createUser,
  getTenantMappingByDomain,
  getTenantMappingByTenantId,
  logScimOperation
} from '@/lib/scim/provisioning'

import type { ScimCreateUserRequest } from '@/types/scim'

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
    console.error('[scim] POST /Users error:', error)

    await logScimOperation({
      operation: 'CREATE',
      responseStatus: 500,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }).catch(() => {})

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}
