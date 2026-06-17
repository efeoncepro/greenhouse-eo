import 'server-only'

import { NextResponse } from 'next/server'

import {
  formatKortexCommandError,
  KORTEX_COMMAND_CONTRACT_VERSION,
  parseKortexCommandRequest,
  runKortexAdminCommand
} from '@/lib/kortex/commands'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parseJsonBody = async (request: Request) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let commandName: string | null = null

  try {
    const rawBody = await parseJsonBody(request)
    const body = parseKortexCommandRequest(rawBody)

    commandName = body.commandName

    const result = await runKortexAdminCommand({ request, body, tenant })

    return NextResponse.json(result.data, {
      status: result.status ?? 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Greenhouse-Contract': KORTEX_COMMAND_CONTRACT_VERSION,
        ...(result.headers ?? {})
      }
    })
  } catch (error) {
    const formatted = formatKortexCommandError(error)

    if (formatted.status >= 500) {
      captureWithDomain(error, 'integrations.kortex', {
        tags: {
          source: 'api_admin_kortex_commands',
          stage: 'dispatch_command',
          command_name: commandName ?? 'unknown'
        }
      })
    }

    return NextResponse.json(formatted.body, {
      status: formatted.status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Greenhouse-Contract': KORTEX_COMMAND_CONTRACT_VERSION
      }
    })
  }
}
