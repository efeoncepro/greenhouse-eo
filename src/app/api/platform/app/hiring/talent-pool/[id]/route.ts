import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppTalentPoolProfile } from '@/lib/api-platform/resources/app-hiring-talent-pool'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.hiring.talent_pool.profile',
    handler: async context => ({
      data: await getAppTalentPoolProfile({ context, request, talentProfileId: (await params).id })
    })
  })
}
