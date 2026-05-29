import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import {
  getLatestClientEconomicsPeriod,
  materializeFinanceSignals
} from '@/lib/finance/ai/materialize-finance-signals'
import { materializeFinanceAiLlmEnrichments } from '@/lib/finance/ai/llm-enrichment-worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// TASK-941 Slice 7 — anclar en el último período CON client_economics, no en
// `now`. `client_economics` es reactiva (materializa al cerrar el payroll del
// mes); correr sobre el mes corriente abierto producía 0 señales + run
// `succeeded` engañoso (ISSUE-082, root cause Finance). Anclar en el período con
// data es honesto y self-healing.
const getRollingPeriods = (anchor: { year: number; month: number }, monthsBack: number) => {
  const periods: Array<{ year: number; month: number }> = []

  for (let index = 0; index < monthsBack; index++) {
    const date = new Date(anchor.year, anchor.month - 1 - index, 1)

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

    // Anclar en el último período con economics (no en el mes corriente abierto).
    const anchor = await getLatestClientEconomicsPeriod()

    if (!anchor) {
      // Honest degradation: sin economics materializados, no hay nada elegible.
      // NO es un fake-success ni un error — es un skip explícito.
      return NextResponse.json({
        monthsBack,
        skipEnrich,
        status: 'skipped_no_eligible_data',
        reason: 'No hay client_economics materializado para ningún período.',
        periods: [],
        results: []
      })
    }

    const periods = getRollingPeriods(anchor, monthsBack)
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

      // Período sin snapshots elegibles (open/no materializado) → skip honesto,
      // no enrichment, no fake-success.
      if (materializeResult.snapshotsEvaluated === 0) {
        entry.status = 'skipped_no_eligible_data'
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
