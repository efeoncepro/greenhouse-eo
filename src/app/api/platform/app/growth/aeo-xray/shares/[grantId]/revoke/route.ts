import { runXrayAppRoute } from '@/lib/api-platform/resources/app-aeo-xray-route'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ grantId: string }> }) {
  const { grantId } = await params

  return runXrayAppRoute(request, 'revoke', grantId)
}
