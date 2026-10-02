import 'server-only'

import { resolveGrowthMarket } from '@/lib/growth/markets'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

const labels = {
  market_primary_missing: 'Marcas AEO sin mercado principal',
  market_unresolved: 'Mercados AEO sin resolución explícita',
  run_batch_partial: 'Lotes AEO con cobertura parcial'
} as const

export const getGrowthAiVisibilityMarketSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  const signal = (key: keyof typeof labels, value: number | null): ReliabilitySignal => ({
    signalId: `growth.ai_visibility.${key}`,
    moduleKey: 'growth',
    kind: 'data_quality',
    source: 'getGrowthAiVisibilityMarketSignals',
    label: labels[key],
    observedAt,
    severity: value === null ? 'unknown' : value === 0 ? 'ok' : 'warning',
    summary:
      value === null
        ? 'Sin lectura verificada; revisa el rollout de TASK-1863.'
        : `${value} casos pendientes de revisión.`,
    evidence: value === null ? [] : [{ kind: 'metric', label: 'count', value: String(value) }]
  })

  try {
    const installed = await runGreenhousePostgresQuery<{ installed: boolean }>(
      "SELECT to_regclass('greenhouse_growth.grader_profile_markets') IS NOT NULL AS installed"
    )

    if (!installed[0]?.installed) return Object.keys(labels).map(key => signal(key as keyof typeof labels, null))

    const profiles = await runGreenhousePostgresQuery<{
      market: string
      locale: string
      primary_count: number
    }>(`SELECT p.market,p.locale,
      (SELECT count(*)::int FROM greenhouse_growth.grader_profile_markets m WHERE m.profile_id=p.profile_id AND m.is_primary AND m.status='active') primary_count
      FROM greenhouse_growth.grader_profiles p WHERE p.status='active'`)

    let unresolved = 0

    for (const profile of profiles) {
      try {
        resolveGrowthMarket(profile.market, profile.locale)
      } catch {
        unresolved++
      }
    }

    const recent = await runGreenhousePostgresQuery<{ defaults: number; partial: number }>(`SELECT
      (SELECT count(*)::int FROM greenhouse_growth.grader_runs WHERE created_at>now()-interval '7 days' AND matching_snapshot->>'marketSource'='form_default') defaults,
      (SELECT count(*)::int FROM greenhouse_growth.grader_run_batches b WHERE b.created_at>now()-interval '7 days'
        AND NOT EXISTS(SELECT 1 FROM greenhouse_growth.grader_runs r WHERE r.batch_id=b.batch_id AND r.status IN ('pending','running'))
        AND EXISTS(SELECT 1 FROM greenhouse_growth.grader_runs r WHERE r.batch_id=b.batch_id AND r.status IN ('succeeded','partial'))
        AND EXISTS(SELECT 1 FROM greenhouse_growth.grader_runs r WHERE r.batch_id=b.batch_id AND r.status<>'succeeded')) partial`)

    return [
      signal('market_primary_missing', profiles.filter(p => Number(p.primary_count) !== 1).length),
      signal('market_unresolved', unresolved + Number(recent[0]?.defaults ?? 0)),
      signal('run_batch_partial', Number(recent[0]?.partial ?? 0))
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'aeo_market_signals' } })

    return Object.keys(labels).map(key => signal(key as keyof typeof labels, null))
  }
}
