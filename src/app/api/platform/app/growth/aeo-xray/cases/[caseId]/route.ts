import { runXrayAppRoute } from '@/lib/api-platform/resources/app-aeo-xray-route'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params

  return runXrayAppRoute(request, 'get', caseId)
}
