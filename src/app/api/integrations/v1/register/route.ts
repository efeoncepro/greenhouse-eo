import { NextResponse } from 'next/server'

import { requireIntegrationRequest } from '@/lib/integrations/integration-auth'
import { registerIntegration } from '@/lib/integrations/registry'
import type { IntegrationType } from '@/types/integrations'

export const dynamic = 'force-dynamic'

const VALID_TYPES: IntegrationType[] = ['system_upstream', 'event_provider', 'batch_file', 'api_connector', 'hybrid']

interface RegisterBody {
  integrationKey: string
  displayName: string
  integrationType: IntegrationType
  sourceSystem: string
  consumerDomains: string[]
  description?: string
  owner?: string
  authMode?: string
  syncCadence?: string
  syncEndpoint?: string
}

export async function POST(request: Request) {
  const { authorized, errorResponse } = requireIntegrationRequest(request)

  if (!authorized) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: RegisterBody

  try {
    body = await request.json() as RegisterBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.integrationKey || !body.displayName || !body.integrationType || !body.sourceSystem) {
    return NextResponse.json(
      { error: 'Missing required fields: integrationKey, displayName, integrationType, sourceSystem' },
      { status: 400 }
    )
  }

  if (!VALID_TYPES.includes(body.integrationType)) {
    return NextResponse.json(
      { error: `Invalid integrationType. Must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  if (!Array.isArray(body.consumerDomains)) {
    return NextResponse.json({ error: 'consumerDomains must be an array of strings' }, { status: 400 })
  }

  try {
    const entry = await registerIntegration({
      integrationKey: body.integrationKey,
      displayName: body.displayName,
      integrationType: body.integrationType,
      sourceSystem: body.sourceSystem,
      consumerDomains: body.consumerDomains,
      description: body.description,
      owner: body.owner,
      authMode: body.authMode,
      syncCadence: body.syncCadence,
      syncEndpoint: body.syncEndpoint
    })

    return NextResponse.json({ integration: entry }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return NextResponse.json({ error: `Integration '${body.integrationKey}' already exists` }, { status: 409 })
    }

    return NextResponse.json({ error: `Registration failed: ${message}` }, { status: 500 })
  }
}
