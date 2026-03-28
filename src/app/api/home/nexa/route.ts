import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'
import { NexaService } from '@/lib/nexa/nexa-service'
import type { NexaMessage } from '@/types/home'

/**
 * Handle conversational interaction with Nexa.
 * Uses a lightweight context (modules + user name) instead of the full
 * getHomeSnapshot() to avoid blocking on notifications/DB per message.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session
  const body = await req.json()
  const { prompt, history = [] } = body as { prompt: string; history: NexaMessage[] }

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  try {
    const firstName = (user.name || '').split(' ')[0] || 'Usuario'

    const modules = resolveCapabilityModules({
      businessLines: user.businessLines || [],
      serviceModules: user.serviceModules || []
    })

    const lightContext = {
      user: { firstName, lastName: null, role: user.role || 'user' },
      greeting: { title: '', subtitle: '' },
      modules: modules.map(m => ({ id: m.id, title: m.label, subtitle: m.description || '', icon: m.icon, route: m.route, color: 'primary' as const })),
      tasks: [],
      nexaIntro: '',
      computedAt: new Date().toISOString()
    }

    const nexaResponse = await NexaService.generateResponse({
      prompt,
      history: history.slice(-10),
      context: lightContext
    })

    return NextResponse.json(nexaResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Nexa API failed:', message, error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
