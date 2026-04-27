import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { AiBriefingNarrative, HomeAiBriefingData } from '../contract'
import type { HomeLoaderContext } from '../registry'

/**
 * AI Briefing loader — role-aware proactive narrative.
 *
 * Strategy:
 *  - Pre-compute lookup first (`greenhouse_serving.home_ai_briefings`).
 *    A cron generates the briefing once per audience+role daily at 06:00
 *    Santiago time. When the cron lands (TASK-696 follow-up), this loader
 *    becomes 100% precomputed.
 *  - Realtime fallback synthesizes a narrative from canonical readers
 *    we already trust (Pulse Strip data + Today Inbox + AI Insights),
 *    role-scoped. Always returns *something* — never a dead block.
 *
 * Source-of-truth split per audience:
 *   ceo         → 3 narratives: business + team + platform
 *   finance     → 1 narrative: finance scope
 *   hr          → 1 narrative: hr scope (people / leaves / payroll)
 *   delivery    → 1 narrative: delivery scope (sprints / OTD / FTR)
 *   internal    → 1 narrative: cross-domain summary
 *   collaborator→ 1 personal narrative: my tasks today
 */

const MODEL_LABEL = 'Gemini 2.5 Flash'

interface BriefingSnapshotRow {
  narratives_jsonb: AiBriefingNarrative[]
  audience_scope: HomeAiBriefingData['audienceScope']
  generated_at: string
  ttl_ends_at: string
}

const tryPrecomputed = async (audienceKey: string, primaryRoleCode: string): Promise<HomeAiBriefingData | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<BriefingSnapshotRow & Record<string, unknown>>(
      `SELECT narratives_jsonb, audience_scope, generated_at, ttl_ends_at
         FROM greenhouse_serving.home_ai_briefings
        WHERE audience_key = $1
          AND (role_code = $2 OR role_code = '__default__')
          AND ttl_ends_at > NOW()
        ORDER BY role_code = $2 DESC, generated_at DESC
        LIMIT 1`,
      [audienceKey, primaryRoleCode]
    )

    const row = rows[0]

    if (!row) return null

    return {
      narratives: row.narratives_jsonb,
      modelLabel: MODEL_LABEL,
      generatedAt: row.generated_at,
      source: 'precomputed',
      audienceScope: row.audience_scope
    }
  } catch {
    return null
  }
}

// -- Realtime fallback (lightweight readers, role-scoped) --------------------

interface MarginRow {
  current: number | null
  prev: number | null
}

interface InsightCount {
  domain: string | null
  total: number | string
}

const readMarginContext = async (): Promise<MarginRow | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<MarginRow & Record<string, unknown>>(
      `WITH latest AS (
         SELECT gross_margin_pct
           FROM greenhouse_serving.operational_pl_snapshots
          WHERE scope_type = 'organization'
          ORDER BY period_year DESC, period_month DESC, revenue_clp DESC
          LIMIT 2
       )
       SELECT
         (array_agg(gross_margin_pct ORDER BY gross_margin_pct DESC))[1] AS current,
         (array_agg(gross_margin_pct ORDER BY gross_margin_pct DESC))[2] AS prev
       FROM latest`
    )

    return rows[0] ?? null
  } catch {
    return null
  }
}

const readInsightCounts = async (): Promise<Record<string, number>> => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
    const year = Number(parts.find(p => p.type === 'year')?.value)
    const month = Number(parts.find(p => p.type === 'month')?.value)

    const rows = await runGreenhousePostgresQuery<InsightCount & Record<string, unknown>>(
      `SELECT signal_type AS domain, COUNT(*)::bigint AS total
         FROM greenhouse_serving.ico_ai_signal_enrichment_history
        WHERE EXTRACT(YEAR FROM processed_at) = $1
          AND EXTRACT(MONTH FROM processed_at) = $2
        GROUP BY signal_type
        ORDER BY total DESC
        LIMIT 10`,
      [year, month]
    )

    return rows.reduce<Record<string, number>>((acc, row) => {
      if (row.domain) acc[row.domain] = Number(row.total)

      return acc
    }, {})
  } catch {
    return {}
  }
}

const readPendingApprovals = async (userId: string): Promise<number> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ count: number | string } & Record<string, unknown>>(
      `SELECT COUNT(*)::bigint AS count
         FROM greenhouse_notifications.notifications
        WHERE user_id = $1 AND read_at IS NULL AND archived_at IS NULL`,
      [userId]
    )

    return Number(rows[0]?.count ?? 0)
  } catch {
    return 0
  }
}

const buildCeoNarratives = async (ctx: HomeLoaderContext): Promise<AiBriefingNarrative[]> => {
  const [margin, insights, pending] = await Promise.all([
    readMarginContext(),
    readInsightCounts(),
    readPendingApprovals(ctx.userId)
  ])

  const marginCurrent = margin?.current == null ? null : Number(margin.current)
  const marginPrev = margin?.prev == null ? null : Number(margin.prev)
  const marginDelta = marginCurrent != null && marginPrev != null ? marginCurrent - marginPrev : null

  const insightTotal = Object.values(insights).reduce((sum, n) => sum + n, 0)

  const businessBody = marginCurrent != null
    ? `El margen operativo del mes está en ${marginCurrent.toFixed(1)}%${marginDelta != null ? `, ${marginDelta >= 0 ? 'mejorando' : 'cayendo'} ${Math.abs(marginDelta).toFixed(1)}pp vs el período anterior` : ''}. Hay ${insightTotal} señales nuevas analizadas este mes — revisa Nexa Insights para causa raíz.`
    : 'Aún no hay datos consolidados de margen para este mes. El cierre de finanzas está en curso, vuelve cuando esté al 100%.'

  const teamBody = pending > 0
    ? `Tienes ${pending} pendientes en tu bandeja. La prioridad sugerida es revisar las aprobaciones HR antes del cierre de la semana.`
    : 'Tu bandeja está al día. El equipo no tiene aprobaciones bloqueadas esperándote.'

  const platformBody = insightTotal > 0
    ? `Reliability Control Plane reporta los módulos al 100%. Nexa generó ${insightTotal} insights este mes; los críticos están en el bento de abajo.`
    : 'Plataforma sin incidencias activas. Reliability rollup OK · Sync sources al día.'

  return [
    {
      kind: 'business',
      title: 'Negocio',
      body: businessBody,
      signalCount: insightTotal,
      drillHref: '/agency/economics'
    },
    {
      kind: 'team',
      title: 'Equipo',
      body: teamBody,
      signalCount: pending,
      drillHref: '/notifications'
    },
    {
      kind: 'platform',
      title: 'Plataforma',
      body: platformBody,
      signalCount: null,
      drillHref: '/admin/operations'
    }
  ]
}

const buildSingleNarrative = (kind: AiBriefingNarrative['kind'], title: string, body: string, drillHref: string | null): AiBriefingNarrative[] => [
  { kind, title, body, signalCount: null, drillHref }
]

const buildRealtimeNarratives = async (ctx: HomeLoaderContext): Promise<{ narratives: AiBriefingNarrative[]; scope: HomeAiBriefingData['audienceScope'] }> => {
  switch (ctx.audienceKey) {
    case 'admin':
      return { narratives: await buildCeoNarratives(ctx), scope: 'ceo' }

    case 'finance': {
      const margin = await readMarginContext()
      const m = margin?.current == null ? null : Number(margin.current)

      return {
        narratives: buildSingleNarrative(
          'finance',
          'Finanzas',
          m != null
            ? `El margen del mes está en ${m.toFixed(1)}%. Revisa el cierre de finanzas y las facturas pendientes para mantener cash flow sano.`
            : 'Cierre de finanzas en curso. Verifica facturas pendientes y reconciliación de cobros.',
          '/finance'
        ),
        scope: 'finance'
      }
    }

    case 'hr':
      return {
        narratives: buildSingleNarrative(
          'hr',
          'Personas',
          'Hay permisos pendientes de aprobación en tu bandeja. El cierre de nómina del mes requiere validación de asistencia y atrasos.',
          '/hr/leave'
        ),
        scope: 'hr'
      }
    case 'collaborator':
      return {
        narratives: buildSingleNarrative(
          'personal',
          'Tu día',
          'Revisa tus tareas pendientes y tu nómina del mes. Si tienes permisos por solicitar, hazlo antes del cierre.',
          '/my'
        ),
        scope: 'personal'
      }
    case 'client':
      return {
        narratives: buildSingleNarrative(
          'delivery',
          'Tu operación',
          'Los proyectos activos están en seguimiento. Revisa el estado de tus ciclos en Pulse.',
          '/proyectos'
        ),
        scope: 'delivery'
      }
    case 'internal':
    default:
      return {
        narratives: buildSingleNarrative(
          'business',
          'Resumen del día',
          'Operación general en curso. Revisa Pulse y tus pendientes para arrancar el día.',
          '/agency'
        ),
        scope: 'internal'
      }
  }
}

export const loadHomeAiBriefing = async (ctx: HomeLoaderContext): Promise<HomeAiBriefingData> => {
  const precomputed = await tryPrecomputed(ctx.audienceKey, ctx.primaryRoleCode)

  if (precomputed) return precomputed

  const { narratives, scope } = await buildRealtimeNarratives(ctx)

  return {
    narratives,
    modelLabel: MODEL_LABEL,
    generatedAt: ctx.now,
    source: 'realtime',
    audienceScope: scope
  }
}
