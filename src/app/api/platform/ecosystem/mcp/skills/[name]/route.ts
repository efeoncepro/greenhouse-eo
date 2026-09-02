import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemMcpSkillPayload } from '@/lib/api-platform/resources/ecosystem-mcp-skills'

export const dynamic = 'force-dynamic'

/**
 * TASK-1804 — Un manual de uso completo (markdown verbatim con frontmatter), por nombre.
 *
 * `404` anti-oráculo cuando el manual no existe O el binding no puede verlo: los dos casos son
 * indistinguibles a propósito. Nunca `403`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params

  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.mcp.skill',
    handler: async context => getEcosystemMcpSkillPayload({ context, request, name })
  })
}
