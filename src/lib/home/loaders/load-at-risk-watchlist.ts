import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { AtRiskItem, HomeAtRiskWatchlistData } from '../contract'
import type { HomeLoaderContext } from '../registry'

/**
 * At-Risk Watchlist loader — role-aware Top 5.
 *
 * The composer already gated the block by capability (`home.atrisk.spaces`,
 * `home.atrisk.invoices`, `home.atrisk.members`, `home.atrisk.projects`).
 * This loader picks the right query based on audience.
 *
 * CEO / admin → Spaces at risk (composite score)
 * Finance     → Invoices with overdue AR
 * HR          → Members with capacity overload
 * Delivery    → Projects with sprint slippage
 *
 * Every query is bounded LIMIT 5, every error path returns empty array
 * (the block hides itself when items.length === 0).
 */

const bandFromScore = (score: number): AtRiskItem['riskBand'] => {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'attention'

  return 'monitor'
}

interface SpaceAtRiskRow {
  space_id: string
  space_name: string | null
  ico_health: number | string | null
  ftr_pct_delta: number | string | null
  days_since_activity: number | string | null
  composite_score: number | string
}

const readSpacesAtRisk = async (): Promise<AtRiskItem[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<SpaceAtRiskRow & Record<string, unknown>>(
      `WITH space_signals AS (
         SELECT
           s.space_id,
           s.name AS space_name,
           COALESCE(ico.composite_health_score, 70) AS ico_health,
           COALESCE(ftr.delta_pct, 0) AS ftr_pct_delta,
           COALESCE(EXTRACT(DAY FROM NOW() - act.last_activity_at)::numeric, 30) AS days_since_activity
         FROM greenhouse_core.spaces s
         LEFT JOIN greenhouse_serving.ico_engine_space_intelligence_runtime ico
           ON ico.space_id = s.space_id
         LEFT JOIN greenhouse_serving.delivery_performance_serving ftr
           ON ftr.space_id = s.space_id
         LEFT JOIN (
           SELECT space_id, MAX(updated_at) AS last_activity_at
             FROM greenhouse_delivery.tasks
            GROUP BY space_id
         ) act ON act.space_id = s.space_id
         WHERE s.is_active = TRUE
       )
       SELECT
         space_id,
         space_name,
         ico_health,
         ftr_pct_delta,
         days_since_activity,
         (
           GREATEST(0, 70 - ico_health::numeric) * 0.4 +
           GREATEST(0, -ftr_pct_delta::numeric) * 0.3 +
           GREATEST(0, days_since_activity::numeric - 14) * 0.5
         ) AS composite_score
       FROM space_signals
       ORDER BY composite_score DESC
       LIMIT 5`
    )

    return rows
      .filter(row => Number(row.composite_score) > 0)
      .map(row => {
        const score = Math.round(Number(row.composite_score))
        const drivers: string[] = []
        const ico = row.ico_health == null ? null : Number(row.ico_health)
        const ftrDelta = row.ftr_pct_delta == null ? null : Number(row.ftr_pct_delta)
        const days = row.days_since_activity == null ? null : Number(row.days_since_activity)

        if (ico != null && ico < 70) drivers.push(`ICO ${ico.toFixed(0)}`)
        if (ftrDelta != null && ftrDelta < -10) drivers.push(`FTR ${ftrDelta.toFixed(1)}%`)
        if (days != null && days > 14) drivers.push(`Sin actividad ${Math.round(days)}d`)

        return {
          itemId: `space-${row.space_id}`,
          kind: 'space' as const,
          title: row.space_name ?? row.space_id.slice(0, 8),
          subtitle: drivers.join(' · ') || 'Sin señales claras',
          riskScore: Math.min(100, score),
          riskBand: bandFromScore(score),
          drivers,
          href: `/agency/spaces/${row.space_id}`,
          metric: ico != null ? { label: 'ICO Health', value: `${ico.toFixed(0)}%` } : null
        }
      })
  } catch {
    return []
  }
}

interface InvoiceAtRiskRow {
  income_id: string
  client_name: string | null
  amount_clp: number | string | null
  days_overdue: number | string | null
}

const readInvoicesAtRisk = async (): Promise<AtRiskItem[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<InvoiceAtRiskRow & Record<string, unknown>>(
      `SELECT
         i.income_id,
         o.legal_name AS client_name,
         i.total_clp AS amount_clp,
         EXTRACT(DAY FROM NOW() - i.due_date)::int AS days_overdue
       FROM greenhouse_finance.income i
       LEFT JOIN greenhouse_core.organizations o ON o.organization_id = i.organization_id
       WHERE i.due_date < CURRENT_DATE
         AND COALESCE(i.amount_paid, 0) < COALESCE(i.total_clp, 0)
         AND i.status IN ('pending','partial','overdue')
       ORDER BY days_overdue DESC, amount_clp DESC NULLS LAST
       LIMIT 5`
    )

    return rows.map(row => {
      const days = Number(row.days_overdue ?? 0)
      const score = Math.min(100, days * 1.5 + 30)
      const amount = row.amount_clp == null ? 0 : Number(row.amount_clp)
      const drivers = [`${days}d vencido`]

      if (amount > 5_000_000) drivers.push('Monto alto')

      return {
        itemId: `invoice-${row.income_id}`,
        kind: 'invoice' as const,
        title: row.client_name ?? 'Cliente sin nombre',
        subtitle: drivers.join(' · '),
        riskScore: Math.round(score),
        riskBand: bandFromScore(score),
        drivers,
        href: `/finance/income/${row.income_id}`,
        metric: { label: 'Monto', value: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount) }
      }
    })
  } catch {
    return []
  }
}

interface MemberAtRiskRow {
  member_id: string
  member_name: string | null
  capacity_pct: number | string | null
  pending_leaves: number | string | null
}

const readMembersAtRisk = async (): Promise<AtRiskItem[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<MemberAtRiskRow & Record<string, unknown>>(
      `SELECT
         tm.member_id,
         tm.full_name AS member_name,
         COALESCE(cap.utilization_pct, 0) AS capacity_pct,
         COALESCE(lr_count.cnt, 0) AS pending_leaves
       FROM greenhouse_core.team_members tm
       LEFT JOIN greenhouse_serving.member_capacity_economics cap
         ON cap.member_id = tm.member_id
       LEFT JOIN (
         SELECT member_id, COUNT(*) AS cnt
           FROM greenhouse_hr.leave_requests
          WHERE status IN ('pending_jefatura','pending_hr','pending_supervisor','pending')
          GROUP BY member_id
       ) lr_count ON lr_count.member_id = tm.member_id
       WHERE tm.is_active = TRUE
         AND COALESCE(cap.utilization_pct, 0) > 95
       ORDER BY capacity_pct DESC
       LIMIT 5`
    )

    return rows.map(row => {
      const pct = row.capacity_pct == null ? 0 : Number(row.capacity_pct)
      const score = Math.min(100, pct - 50)
      const drivers = [`Carga ${pct.toFixed(0)}%`]
      const pending = Number(row.pending_leaves ?? 0)

      if (pending > 0) drivers.push(`${pending} permisos`)

      return {
        itemId: `member-${row.member_id}`,
        kind: 'member' as const,
        title: row.member_name ?? row.member_id.slice(0, 8),
        subtitle: drivers.join(' · '),
        riskScore: Math.round(score),
        riskBand: bandFromScore(score),
        drivers,
        href: `/people/${row.member_id}`,
        metric: { label: 'Carga', value: `${pct.toFixed(0)}%` }
      }
    })
  } catch {
    return []
  }
}

interface ProjectAtRiskRow {
  project_record_id: string
  project_name: string | null
  days_late: number | string | null
  completion_pct: number | string | null
}

const readProjectsAtRisk = async (): Promise<AtRiskItem[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<ProjectAtRiskRow & Record<string, unknown>>(
      `SELECT
         p.project_record_id,
         p.project_name,
         COALESCE(p.days_late, 0) AS days_late,
         COALESCE(p.completion_pct_source, 0) AS completion_pct
       FROM greenhouse_delivery.projects p
       WHERE COALESCE(p.is_deleted, FALSE) = FALSE
         AND COALESCE(p.days_late, 0) > 0
       ORDER BY days_late DESC
       LIMIT 5`
    )

    return rows.map(row => {
      const days = Number(row.days_late ?? 0)
      const completion = Number(row.completion_pct ?? 0)
      const score = Math.min(100, days * 2 + (100 - completion) * 0.3)
      const drivers = [`${days}d atrasado`]

      if (completion < 50) drivers.push(`${completion.toFixed(0)}% completo`)

      return {
        itemId: `project-${row.project_record_id}`,
        kind: 'project' as const,
        title: row.project_name ?? row.project_record_id.slice(0, 8),
        subtitle: drivers.join(' · '),
        riskScore: Math.round(score),
        riskBand: bandFromScore(score),
        drivers,
        href: `/proyectos/${row.project_record_id}`,
        metric: { label: 'Avance', value: `${completion.toFixed(0)}%` }
      }
    })
  } catch {
    return []
  }
}

export const loadHomeAtRiskWatchlist = async (ctx: HomeLoaderContext): Promise<HomeAtRiskWatchlistData> => {
  // Audience-aware payload selection. The composer's capability gate
  // already filtered by role, but multiple audiences may be eligible —
  // CEO sees Spaces (highest priority), finance sees Invoices, etc.
  // The order here is the priority cascade.
  const audience = ctx.audienceKey

  if (audience === 'admin') {
    const items = await readSpacesAtRisk()

    return { audienceScope: 'ceo', domainLabel: 'Spaces en riesgo', items, asOf: ctx.now }
  }

  if (audience === 'finance') {
    const items = await readInvoicesAtRisk()

    return { audienceScope: 'finance', domainLabel: 'Cuentas con AR vencido', items, asOf: ctx.now }
  }

  if (audience === 'hr') {
    const items = await readMembersAtRisk()

    return { audienceScope: 'hr', domainLabel: 'Colaboradores con sobrecarga', items, asOf: ctx.now }
  }

  // Internal / delivery
  const items = await readProjectsAtRisk()

  return { audienceScope: 'delivery', domainLabel: 'Proyectos atrasados', items, asOf: ctx.now }
}
