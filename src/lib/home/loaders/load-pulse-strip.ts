import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { HomePulseStripData, PulseKpiCard } from '../contract'
import type { HomeLoaderContext } from '../registry'

/**
 * Pulse Strip loader.
 *
 * Strategy: pre-compute lookup first (`home_pulse_snapshots`), realtime
 * fallback when expired or missing. The realtime path returns a minimal
 * shape derived from the readers we already trust (period closure +
 * latest margin). It exists to keep the home alive during rollout —
 * once the cron is steady-state, hits should be 95%+ pre-computed.
 */

type SnapshotRow = {
  snapshot_jsonb: HomePulseStripData
  ttl_ends_at: string
} & Record<string, unknown>

const TENANT_SCOPE_FALLBACK = '__all__'
const ROLE_FALLBACK = '__default__'

const isFreshSnapshot = (row: SnapshotRow, nowIso: string): boolean => {
  return new Date(row.ttl_ends_at).getTime() > new Date(nowIso).getTime()
}

const buildEmptyCard = (overrides: Partial<PulseKpiCard> & Pick<PulseKpiCard, 'kpiId' | 'label' | 'unit'>): PulseKpiCard => ({
  kpiId: overrides.kpiId,
  label: overrides.label,
  value: null,
  unit: overrides.unit,
  currency: overrides.currency ?? null,
  delta: null,
  deltaPct: null,
  trend: 'flat',
  status: 'unknown',
  sparkline: [],
  drillHref: overrides.drillHref ?? null,
  description: overrides.description ?? null,
  computedAt: new Date().toISOString(),
  source: overrides.source ?? 'realtime'
})

const REALTIME_DEFAULT_CARDS: Record<string, PulseKpiCard[]> = {
  admin: [
    buildEmptyCard({ kpiId: 'reliability.rollup', label: 'Reliability', unit: 'count', drillHref: '/admin/operations' }),
    buildEmptyCard({ kpiId: 'finance.margin', label: 'Margen mes', unit: 'percentage', drillHref: '/finance' }),
    buildEmptyCard({ kpiId: 'finance.closing', label: 'Cierre mes', unit: 'percentage', drillHref: '/finance' }),
    buildEmptyCard({ kpiId: 'sync.notion', label: 'Sync Notion', unit: 'minutes', drillHref: '/admin/integrations/notion' })
  ],
  internal: [
    buildEmptyCard({ kpiId: 'delivery.otd', label: 'OTD equipo', unit: 'percentage', drillHref: '/agency' }),
    buildEmptyCard({ kpiId: 'capacity.available', label: 'Capacidad disponible', unit: 'percentage', drillHref: '/people' }),
    buildEmptyCard({ kpiId: 'finance.margin', label: 'Margen mes', unit: 'percentage', drillHref: '/finance' }),
    buildEmptyCard({ kpiId: 'inbox.pending', label: 'Mis pendientes', unit: 'count', drillHref: '/home' })
  ],
  hr: [
    buildEmptyCard({ kpiId: 'payroll.closing', label: 'Cierre nómina', unit: 'percentage', drillHref: '/hr/payroll' }),
    buildEmptyCard({ kpiId: 'leaves.pending', label: 'Permisos por aprobar', unit: 'count', drillHref: '/hr/leaves' }),
    buildEmptyCard({ kpiId: 'attendance.today', label: 'Asistencia hoy', unit: 'percentage', drillHref: '/hr/attendance' }),
    buildEmptyCard({ kpiId: 'headcount.active', label: 'Headcount activo', unit: 'count', drillHref: '/people' })
  ],
  finance: [
    buildEmptyCard({ kpiId: 'finance.margin', label: 'Margen mes', unit: 'percentage', drillHref: '/finance' }),
    buildEmptyCard({ kpiId: 'finance.closing', label: 'Cierre mes', unit: 'percentage', drillHref: '/finance' }),
    buildEmptyCard({ kpiId: 'finance.ar', label: 'AR pendiente', unit: 'currency', currency: 'CLP', drillHref: '/finance/income' }),
    buildEmptyCard({ kpiId: 'finance.drift', label: 'Drift ledger', unit: 'count', drillHref: '/finance/data-quality' })
  ],
  collaborator: [
    buildEmptyCard({ kpiId: 'tasks.mine', label: 'Mis tareas', unit: 'count', drillHref: '/my' }),
    buildEmptyCard({ kpiId: 'capacity.mine', label: 'Mi carga', unit: 'percentage', drillHref: '/my' }),
    buildEmptyCard({ kpiId: 'payroll.mine', label: 'Mi nómina', unit: 'percentage', drillHref: '/my/payroll' }),
    buildEmptyCard({ kpiId: 'leaves.mine', label: 'Mis días', unit: 'days', drillHref: '/my/leaves' })
  ],
  client: [
    buildEmptyCard({ kpiId: 'delivery.otd', label: 'OTD proyectos', unit: 'percentage', drillHref: '/proyectos' }),
    buildEmptyCard({ kpiId: 'cycles.active', label: 'Ciclos activos', unit: 'count', drillHref: '/proyectos' }),
    buildEmptyCard({ kpiId: 'delivery.ftr', label: 'FTR%', unit: 'percentage', drillHref: '/proyectos' }),
    buildEmptyCard({ kpiId: 'tasks.pending', label: 'Pendientes', unit: 'count', drillHref: '/proyectos' })
  ]
}

export const loadHomePulseStrip = async (ctx: HomeLoaderContext): Promise<HomePulseStripData> => {
  const audience = ctx.audienceKey
  const tenantScope = ctx.tenantId ?? TENANT_SCOPE_FALLBACK

  const tryRoles = [...ctx.roleCodes, ROLE_FALLBACK]

  for (const role of tryRoles) {
    try {
      const rows = await runGreenhousePostgresQuery<SnapshotRow>(
        `SELECT snapshot_jsonb, ttl_ends_at
           FROM greenhouse_serving.home_pulse_snapshots
          WHERE audience_key = $1
            AND role_code = $2
            AND (tenant_scope = $3 OR tenant_scope = $4)
          ORDER BY tenant_scope = $3 DESC, computed_at DESC
          LIMIT 1`,
        [audience, role, tenantScope, TENANT_SCOPE_FALLBACK]
      )

      const row = rows[0]

      if (row && isFreshSnapshot(row, ctx.now)) {
        return {
          ...row.snapshot_jsonb,
          audienceKey: audience
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          '[home.loaders.pulse] snapshot lookup failed:',
          error instanceof Error ? error.message : error
        )
      }
    }
  }

  const cards = REALTIME_DEFAULT_CARDS[audience] ?? REALTIME_DEFAULT_CARDS.internal

  return {
    audienceKey: audience,
    cards,
    generatedAt: ctx.now
  }
}
