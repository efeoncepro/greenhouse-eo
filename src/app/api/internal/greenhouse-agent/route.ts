import { NextResponse } from 'next/server'

import {
  isGreenhouseAgentMode,
  runGreenhouseAgent,
  type GreenhouseAgentInput
} from '@/lib/ai/greenhouse-agent'
import { getGreenhouseAgentRuntimeConfig } from '@/lib/ai/google-genai'
import { hasRouteGroup, requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const normalizeStringList = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const canUseGreenhouseAgent = (routeGroups: string[]) => {
  return routeGroups.includes('internal') || routeGroups.includes('admin')
}

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canUseGreenhouseAgent(tenant.routeGroups)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const config = getGreenhouseAgentRuntimeConfig()

    return NextResponse.json({
      scope: {
        userId: tenant.userId,
        routeGroups: tenant.routeGroups,
        clientId: tenant.clientId
      },
      runtime: {
        provider: 'google-vertex-ai',
        model: config.model,
        location: config.location,
        projectId: config.projectId
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Greenhouse Agent runtime is not configured'
      },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasRouteGroup(tenant, 'internal') && !hasRouteGroup(tenant, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const prompt = normalizeString(body.prompt)

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  const requestedMode = normalizeString(body.mode)
  const mode: GreenhouseAgentInput['mode'] = isGreenhouseAgentMode(requestedMode) ? requestedMode : 'plan'

  try {
    const result = await runGreenhouseAgent(
      {
        mode,
        prompt,
        surface: normalizeString(body.surface) || undefined,
        routePath: normalizeString(body.routePath) || undefined,
        existingFiles: normalizeStringList(body.existingFiles),
        notes: normalizeStringList(body.notes)
      },
      tenant
    )

    return NextResponse.json({
      mode,
      model: result.model,
      reply: result.text
    })
  } catch (error) {
    console.error('Greenhouse Agent request failed.', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Greenhouse Agent request failed'
      },
      { status: 500 }
    )
  }
}
