import { NextResponse } from 'next/server'

import { hasEntitlement } from '@/lib/entitlements/runtime'
import {
  buildTenantEntitlementSubject,
  createPartyFromHubSpotCompany,
  instantiateClientForParty,
  OrganizationAlreadyHasClientError
} from '@/lib/commercial/party'
import {
  findClientIdForOrganization,
  findMaterializedPartyByHubSpotCompanyId,
  getHubSpotCandidateByCompanyId
} from '@/lib/commercial/party/hubspot-candidate-reader'
import {
  enforcePartyEndpointRateLimit,
  isPartyEndpointRateLimitError,
  recordPartyEndpointRequest
} from '@/lib/commercial/party/party-endpoint-rate-limit'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ensureClientForActiveParty = async ({
  organizationId,
  hubspotCompanyId,
  userId
}: {
  organizationId: string
  hubspotCompanyId: string
  userId: string
}) => {
  try {
    const result = await instantiateClientForParty({
      organizationId,
      triggerEntity: {
        type: 'manual',
        id: `hubspot-company:${hubspotCompanyId}`
      },
      actor: {
        userId,
        reason: 'party_adopt'
      }
    })

    return result.clientId
  } catch (error) {
    if (error instanceof OrganizationAlreadyHasClientError) {
      return findClientIdForOrganization(organizationId)
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (tenant.tenantType !== 'efeonce_internal') {
    return NextResponse.json(
      { error: 'HubSpot candidate adoption is only available to internal finance/admin actors in V1.' },
      { status: 403 }
    )
  }

  const canAdopt = hasEntitlement(
    buildTenantEntitlementSubject(tenant),
    'commercial.party.create',
    'create'
  )

  if (!canAdopt) {
    return NextResponse.json(
      { error: 'Missing capability commercial.party.create' },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 })
  }

  const hubspotCompanyId =
    typeof body.hubspotCompanyId === 'string' ? body.hubspotCompanyId.trim() : ''

  if (!hubspotCompanyId) {
    return NextResponse.json({ error: 'hubspotCompanyId is required' }, { status: 400 })
  }

  const tenantScope = `${tenant.tenantType}:${tenant.clientId || 'system'}`

  try {
    await enforcePartyEndpointRateLimit({
      endpointKey: 'adopt',
      userId: tenant.userId
    })
  } catch (error) {
    if (isPartyEndpointRateLimitError(error)) {
      await recordPartyEndpointRequest({
        endpointKey: 'adopt',
        userId: tenant.userId,
        tenantScope,
        responseStatus: 429,
        hubspotCompanyId,
        metadata: { reason: 'rate_limited' }
      })

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryAfterSeconds: error.retryAfterSeconds
        },
        {
          status: error.statusCode,
          headers: { 'Retry-After': String(error.retryAfterSeconds) }
        }
      )
    }

    throw error
  }

  const existingParty = await findMaterializedPartyByHubSpotCompanyId(hubspotCompanyId)

  if (existingParty) {
    const clientId =
      existingParty.lifecycleStage === 'active_client'
        ? await ensureClientForActiveParty({
            organizationId: existingParty.organizationId,
            hubspotCompanyId,
            userId: tenant.userId
          })
        : null

    await recordPartyEndpointRequest({
      endpointKey: 'adopt',
      userId: tenant.userId,
      tenantScope,
      responseStatus: 200,
      hubspotCompanyId,
      metadata: { existing: true, lifecycleStage: existingParty.lifecycleStage }
    })

    return NextResponse.json({
      organizationId: existingParty.organizationId,
      commercialPartyId: existingParty.commercialPartyId,
      lifecycleStage: existingParty.lifecycleStage,
      clientId
    })
  }

  const candidate = await getHubSpotCandidateByCompanyId(hubspotCompanyId)

  if (!candidate) {
    await recordPartyEndpointRequest({
      endpointKey: 'adopt',
      userId: tenant.userId,
      tenantScope,
      responseStatus: 404,
      hubspotCompanyId,
      metadata: { reason: 'candidate_not_found' }
    })

    return NextResponse.json(
      { error: 'HubSpot company candidate not found.' },
      { status: 404 }
    )
  }

  const created = await createPartyFromHubSpotCompany({
    hubspotCompanyId,
    hubspotLifecycleStage: candidate.hubspotLifecycleStage,
    defaultName: candidate.displayName,
    actor: {
      userId: tenant.userId,
      roleCodes: tenant.roleCodes,
      reason: 'party_adopt'
    }
  })

  const clientId =
    created.lifecycleStage === 'active_client'
      ? await ensureClientForActiveParty({
          organizationId: created.organizationId,
          hubspotCompanyId,
          userId: tenant.userId
        })
      : null

  await recordPartyEndpointRequest({
    endpointKey: 'adopt',
    userId: tenant.userId,
    tenantScope,
    responseStatus: 200,
    hubspotCompanyId,
    metadata: {
      created: created.created,
      lifecycleStage: created.lifecycleStage,
      clientId
    }
  })

  return NextResponse.json({
    organizationId: created.organizationId,
    commercialPartyId: created.commercialPartyId,
    lifecycleStage: created.lifecycleStage,
    clientId
  })
}
