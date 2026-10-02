import { runXrayAppRoute } from '@/lib/api-platform/resources/app-aeo-xray-route'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runXrayAppRoute(request, 'list')
}

export async function POST(request: Request) {
  return runXrayAppRoute(request, 'create')
}
