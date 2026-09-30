import { runXrayAppRoute } from '@/lib/api-platform/resources/app-aeo-xray-route'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params

  return runXrayAppRoute(request, 'withdraw', editionId)
}
