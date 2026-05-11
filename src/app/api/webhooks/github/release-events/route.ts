import { NextResponse } from 'next/server'

import { handleGithubReleaseWebhookRequest } from '@/lib/release/github-webhook-ingestion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const result = await handleGithubReleaseWebhookRequest(request)

  return NextResponse.json(result.body, { status: result.status })
}
