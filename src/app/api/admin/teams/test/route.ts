import { NextResponse } from 'next/server'

import {
  buildOpsAlertCard,
  listActiveTeamsChannels,
  postTeamsCard
} from '@/lib/integrations/teams'
import { resolveGreenhouseDeepLink } from '@/lib/navigation/deep-links'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const buildTestCard = (channelCode: string, actor: string) =>
  buildOpsAlertCard({
    actionUrl: resolveGreenhouseDeepLink(
      { kind: 'ops_health', audience: 'teams' },
      { env: process.env }
    ).absoluteUrl,
    title: 'Prueba de canal Teams',
    message: `Mensaje de prueba enviado por ${actor} desde Greenhouse para validar el canal '${channelCode}'.`,
    severity: 'info',
    source: 'admin/teams/test',
    occurredAt: new Date(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    facts: [{ title: 'Canal', value: channelCode }],
    actionLabel: 'Ver Ops Health'
  })

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channels = await listActiveTeamsChannels()

  return NextResponse.json({
    channels: channels.map(channel => ({
      channelCode: channel.channel_code,
      channelKind: channel.channel_kind,
      displayName: channel.display_name,
      description: channel.description,
      secretRef: channel.secret_ref,
      logicAppResourceId: channel.logic_app_resource_id
    }))
  })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { channelCode?: unknown }

  try {
    body = (await request.json()) as { channelCode?: unknown }
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  const channelCode = typeof body.channelCode === 'string' ? body.channelCode.trim() : ''

  if (!channelCode) {
    return NextResponse.json({ error: 'channelCode es requerido' }, { status: 400 })
  }

  const actor = tenant.userId || 'admin'
  const card = buildTestCard(channelCode, actor)

  const outcome = await postTeamsCard(channelCode, card, {
    correlationId: `admin-test-${Date.now()}`,
    triggeredBy: `admin:${actor}`,
    syncMode: 'manual'
  })

  if (outcome.ok) {
    return NextResponse.json(outcome)
  }

  return NextResponse.json(outcome, { status: 502 })
}
