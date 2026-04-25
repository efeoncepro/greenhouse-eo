import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runReliabilitySyntheticSweep } from '@/lib/reliability/synthetic/runner'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const handler = async (request: Request) => {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const { summary, probes } = await runReliabilitySyntheticSweep({ triggeredBy: 'cron' })

    return NextResponse.json({
      ok: summary.skippedReason === null,
      summary,
      probes: probes.map(probe => ({
        moduleKey: probe.moduleKey,
        routePath: probe.routePath,
        httpStatus: probe.httpStatus,
        ok: probe.ok,
        latencyMs: probe.latencyMs,
        errorMessage: probe.errorMessage
      }))
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await alertCronFailure('reliability-synthetic', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function GET(request: Request) {
  return handler(request)
}

export async function POST(request: Request) {
  return handler(request)
}
