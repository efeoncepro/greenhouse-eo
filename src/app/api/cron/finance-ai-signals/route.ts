import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { materializeFinanceSignals } from '@/lib/finance/ai/materialize-finance-signals'
import { materializeFinanceAiLlmEnrichments } from '@/lib/finance/ai/llm-enrichment-worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const getRollingPeriods = (monthsBack: number) => {
  const periods: Array<{ year: number; month: number }> = []
  const now = new Date()

  for (let index = 0; index < monthsBack; index++) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)

    periods.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1
    })
  }

  return periods
}

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const requestedMonthsBack = Number(searchParams.get('monthsBack') || '1')
    const skipEnrich = searchParams.get('skipEnrich') === 'true'

    const monthsBack = Number.isInteger(requestedMonthsBack)
      ? Math.min(Math.max(requestedMonthsBack, 1), 3)
      : 1

    const periods = getRollingPeriods(monthsBack)
    const results: Array<Record<string, unknown>> = []

    for (const period of periods) {
      const materializeResult = await materializeFinanceSignals({
        periodYear: period.year,
        periodMonth: period.month,
        triggerType: 'cron'
      })

      const entry: Record<string, unknown> = {
        period: `${period.year}-${String(period.month).padStart(2, '0')}`,
        materialize: materializeResult
      }

      if (!skipEnrich && materializeResult.signalsWritten > 0) {
        const enrichResult = await materializeFinanceAiLlmEnrichments({
          periodYear: period.year,
          periodMonth: period.month,
          triggerType: 'cron'
        })

        entry.enrich = {
          runId: enrichResult.run.runId,
          status: enrichResult.run.status,
          signalsSeen: enrichResult.run.signalsSeen,
          succeeded: enrichResult.succeeded,
          failed: enrichResult.failed,
          skipped: enrichResult.skipped
        }
      }

      results.push(entry)
    }

    return NextResponse.json({
      monthsBack,
      skipEnrich,
      periods: periods.map(p => `${p.year}-${String(p.month).padStart(2, '0')}`),
      results
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Finance AI signals cron failed:', error)
    await alertCronFailure('finance-ai-signals', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
