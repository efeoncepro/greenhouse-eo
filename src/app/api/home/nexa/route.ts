import { NextResponse } from 'next/server'

import { resolveNexaModel } from '@/config/nexa-models'
import { getServerAuthSession } from '@/lib/auth'
import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'
import { canSeeFinanceStatus, getHomeFinanceStatus } from '@/lib/home/get-home-snapshot'
import type { NexaRuntimeContext } from '@/lib/nexa/nexa-contract'
import { NexaService } from '@/lib/nexa/nexa-service'
import { persistNexaConversation } from '@/lib/nexa/store'
import type { NexaMessage } from '@/types/home'

export const dynamic = 'force-dynamic'

/**
 * Handle conversational interaction with Nexa.
 * Uses a lightweight context (modules + user name) instead of the full
 * getHomeSnapshot() to avoid blocking on notifications/DB per message.
 */
export async function POST(req: Request) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session
  const body = await req.json()

  const {
    prompt,
    history = [],
    model,
    threadId
  } = body as { prompt: string; history: NexaMessage[]; model?: string | null; threadId?: string | null }

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  try {
    const firstName = (user.name || '').split(' ')[0] || 'Usuario'

    const modules = resolveCapabilityModules({
      businessLines: user.businessLines || [],
      serviceModules: user.serviceModules || []
    })

    const financeStatus = canSeeFinanceStatus({
      roleCodes: user.roleCodes || [],
      routeGroups: user.routeGroups || []
    })
      ? await getHomeFinanceStatus()
      : null

    const lightContext = {
      user: { firstName, lastName: null, role: user.role || 'user' },
      greeting: { title: '', subtitle: '' },
      modules: modules.map(m => ({ id: m.id, title: m.label, subtitle: m.description || '', icon: m.icon, route: m.route, color: 'primary' as const })),
      tasks: [],
      financeStatus,
      nexaIntro: '',
      computedAt: new Date().toISOString()
    }

    const runtimeContext: NexaRuntimeContext = {
      userId: user.userId,
      clientId: user.clientId,
      clientName: user.clientName,
      tenantType: user.tenantType,
      role: user.role || 'user',
      roleCodes: user.roleCodes || [],
      routeGroups: user.routeGroups || [],
      timezone: user.timezone || 'America/Santiago',
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      ...(user.organizationName ? { organizationName: user.organizationName } : {}),
      ...(user.memberId ? { memberId: user.memberId } : {})
    }

    const nexaResponse = await NexaService.generateResponse({
      prompt,
      history: history.slice(-10),
      context: lightContext,
      runtimeContext,
      requestedModel: resolveNexaModel({ requestedModel: model })
    })

    const persistedThreadId = await persistNexaConversation({
      userId: user.userId,
      clientId: user.clientId,
      threadId,
      prompt: {
        messageId: crypto.randomUUID(),
        content: prompt
      },
      response: {
        messageId: nexaResponse.id,
        content: nexaResponse.content,
        suggestions: nexaResponse.suggestions,
        toolInvocations: nexaResponse.toolInvocations,
        modelId: nexaResponse.modelId
      }
    })

    return NextResponse.json({
      ...nexaResponse,
      threadId: persistedThreadId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nexa API failed:', message, error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
