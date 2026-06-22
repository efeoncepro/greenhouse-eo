import 'server-only'

import { NextResponse } from 'next/server'

import {
  PUBLIC_SITE_GITHUB_COMMAND_CONTRACT_VERSION,
  formatPublicSiteGithubCommandError,
  parsePublicSiteGithubCommandRequest,
  runPublicSiteGithubCommand
} from '@/lib/public-site/astro/github-control-plane/commands'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    const body = parsePublicSiteGithubCommandRequest(rawBody)

    commandName = body.commandName

    const result = await runPublicSiteGithubCommand({ request, body, tenant })

    return NextResponse.json(result.data, {
      status: result.status ?? 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Greenhouse-Contract': PUBLIC_SITE_GITHUB_COMMAND_CONTRACT_VERSION,
        ...(result.headers ?? {})
      }
    })
  } catch (error) {
    const formatted = formatPublicSiteGithubCommandError(error)

    if (formatted.status >= 500) {
      captureWithDomain(error, 'cloud', {
        tags: {
          source: 'api_admin_public_site_github_commands',
          stage: 'dispatch_command',
          command_name: commandName ?? 'unknown'
        }
      })
    }

    return NextResponse.json(formatted.body, {
      status: formatted.status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Greenhouse-Contract': PUBLIC_SITE_GITHUB_COMMAND_CONTRACT_VERSION
      }
    })
  }
}
