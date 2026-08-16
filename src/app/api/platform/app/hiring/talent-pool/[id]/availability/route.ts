import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { updateAppTalentAvailability } from '@/lib/api-platform/resources/app-hiring-talent-pool-commands'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>

  return runAppCommandRoute({
    request,
    routeKey: 'platform.app.hiring.talent_pool.availability.update',
    body,
    handler: async context => ({
      data: await updateAppTalentAvailability({ context, request, talentProfileId: (await params).id, body })
    })
  })
}
