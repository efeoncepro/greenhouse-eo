import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getHomeSnapshot } from '@/lib/home/get-home-snapshot'
import { NexaService } from '@/lib/nexa/nexa-service'
import type { NexaMessage } from '@/types/home'

/**
 * Handle conversational interaction with Nexa.
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
    // 1. Fetch current context (snapshot) to ground the AI
    const context = await getHomeSnapshot({
      userId: user.userId,
      firstName: (user.name || '').split(' ')[0] || 'Usuario',
      lastName: (user.name || '').split(' ').slice(1).join(' ') || null,
      roleName: user.role || 'client_executive',
      businessLines: user.businessLines || [],
      serviceModules: user.serviceModules || [],
      organizationId: user.organizationId
    })

    // 2. Generate AI response
    const nexaResponse = await NexaService.generateResponse({
      prompt,
      history,
      context
    })

    return NextResponse.json(nexaResponse)
  } catch (error) {
    console.error('Nexa API failed:', error)

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
