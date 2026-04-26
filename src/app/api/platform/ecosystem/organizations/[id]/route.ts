import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemOrganizationDetail } from '@/lib/api-platform/resources/organizations'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.organizations.detail',
    handler: async context =>
      getEcosystemOrganizationDetail({
        context,
        request,
        identifier: id
      })
  })
}
