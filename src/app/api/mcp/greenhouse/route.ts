import { handleGreenhouseMcpRemoteRequest } from '@/mcp/greenhouse/remote'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  return handleGreenhouseMcpRemoteRequest(request)
}

export async function POST(request: Request) {
  return handleGreenhouseMcpRemoteRequest(request)
}

export async function DELETE(request: Request) {
  return handleGreenhouseMcpRemoteRequest(request)
}
