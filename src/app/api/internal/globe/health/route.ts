import { NextResponse } from 'next/server'

import {
  createGreenhouseGlobeClient,
  GreenhouseGlobeConfigurationError,
  GlobeSdkError
} from '@/lib/globe/client'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant || tenant.tenantType !== 'efeonce_internal') {
    return errorResponse ?? NextResponse.json({ error: 'access_denied' }, { status: 403 })
  }

  const requestedCorrelationId = request.headers.get('x-correlation-id')?.trim()

  const correlationId =
    requestedCorrelationId && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(requestedCorrelationId)
      ? requestedCorrelationId
      : crypto.randomUUID()

  try {
    const { client, config } = createGreenhouseGlobeClient()
    const health = await client.health({ correlationId })

    return NextResponse.json(
      {
        ok: true,
        health,
        auth: {
          source: config.credentialSource,
          audience: config.audience
        },
        correlationId
      },
      {
        headers: {
          'cache-control': 'no-store',
          'x-correlation-id': correlationId
        }
      }
    )
  } catch (error) {
    const status = error instanceof GlobeSdkError ? error.status ?? 502 : 503

    const code =
      error instanceof GlobeSdkError
        ? error.code
        : error instanceof GreenhouseGlobeConfigurationError
          ? error.code
          : 'globe_bridge_unavailable'

    return NextResponse.json(
      {
        ok: false,
        error: code,
        retryable: error instanceof GlobeSdkError ? error.retryable : false,
        correlationId
      },
      {
        status,
        headers: {
          'cache-control': 'no-store',
          'x-correlation-id': correlationId
        }
      }
    )
  }
}
