'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import StuckAssetsDrawer from '@/components/agency/StuckAssetsDrawer'

import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { SpaceMetricSnapshot, MetricValue } from '@/lib/ico-engine/read-metrics'
import { THRESHOLD_ZONE_COLOR, type ThresholdZone } from '@/lib/ico-engine/metric-registry'

type Props = {
  spaces: SpaceMetricSnapshot[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getMetric = (snapshot: SpaceMetricSnapshot, id: string): MetricValue | undefined =>
  snapshot.metrics.find(m => m.metricId === id)

const formatMetric = (m: MetricValue | undefined, unit: 'number' | 'pct' | 'days'): string => {
  if (!m || m.value === null) return '—'

  if (unit === 'pct') return `${Math.round(m.value)}%`
  if (unit === 'days') return `${m.value.toFixed(1)}d`

  return m.value % 1 === 0 ? String(m.value) : m.value.toFixed(2)
}

const zoneColor = (zone: ThresholdZone | null) =>
  zone ? THRESHOLD_ZONE_COLOR[zone] : ('secondary' as const)

const ZONE_LABEL: Record<ThresholdZone, string> = {
  optimal: 'Óptimo',
  attention: 'Atención',
  critical: 'Crítico'
}

const ZONE_ORDER: Record<ThresholdZone, number> = {
  critical: 0,
  attention: 1,
  optimal: 2
}

const getOverallZone = (snapshot: SpaceMetricSnapshot): ThresholdZone => {
  const zones = snapshot.metrics
    .map(m => m.zone)
    .filter((z): z is ThresholdZone => z !== null)

  if (zones.includes('critical')) return 'critical'
  if (zones.includes('attention')) return 'attention'

  return 'optimal'
}

// ─── Component ──────────────────────────────────────────────────────────────

const SpaceIcoScorecard = ({ spaces }: Props) => {
  const [drawerSpaceId, setDrawerSpaceId] = useState<string | null>(null)

  const sorted = useMemo(() =>
    [...spaces].sort((a, b) => {
      const za = ZONE_ORDER[getOverallZone(a)]
      const zb = ZONE_ORDER[getOverallZone(b)]

      if (za !== zb) return za - zb

      return a.spaceId.localeCompare(b.spaceId)
    }),
    [spaces]
  )

  if (sorted.length === 0) return null

  const COL = {
    color: GH_COLORS.neutral.textSecondary,
    fontSize: '0.7rem',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em'
  }

  const GRID = '1.5fr 65px 65px 65px 80px 70px 70px 80px'

  return (
    <>
      <ExecutiveCardShell title='Scorecard por Space' subtitle='Métricas ICO por Space, ordenadas por estado de salud'>
        <Box sx={{ overflow: 'auto' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID,
              px: 2,
              py: 1.25,
              bgcolor: GH_COLORS.neutral.bgSurface,
              borderRadius: '8px 8px 0 0',
              minWidth: 680
            }}
          >
            {[
              GH_AGENCY.ico_col_space,
              GH_AGENCY.ico_col_rpa,
              GH_AGENCY.ico_col_otd,
              GH_AGENCY.ico_col_ftr,
              GH_AGENCY.ico_col_throughput,
              GH_AGENCY.ico_col_cycle,
              GH_AGENCY.ico_col_stuck,
              GH_AGENCY.ico_col_zone
            ].map((label, i) => (
              <Typography key={i} sx={COL}>{label}</Typography>
            ))}
          </Box>

          <Divider />

          {/* Rows */}
          {sorted.map((snapshot, idx) => {
            const rpa = getMetric(snapshot, 'rpa')
            const otd = getMetric(snapshot, 'otd_pct')
            const ftr = getMetric(snapshot, 'ftr_pct')
            const throughput = getMetric(snapshot, 'throughput')
            const cycle = getMetric(snapshot, 'cycle_time')
            const stuck = getMetric(snapshot, 'stuck_assets')
            const overall = getOverallZone(snapshot)
            const stuckCount = stuck?.value ?? 0

            return (
              <Box key={snapshot.spaceId}>
                {idx > 0 && <Divider />}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: GRID,
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    minWidth: 680,
                    '&:hover': { bgcolor: GH_COLORS.neutral.bgSurface }
                  }}
                >
                  {/* Space */}
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography variant='body2' noWrap sx={{ fontWeight: 600, color: GH_COLORS.neutral.textPrimary }}>
                      {snapshot.spaceId}
                    </Typography>
                    <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                      {snapshot.context.totalTasks} tareas · {snapshot.context.activeTasks} activas
                    </Typography>
                  </Stack>

                  {/* RpA */}
                  <MetricCell value={formatMetric(rpa, 'number')} zone={rpa?.zone ?? null} />

                  {/* OTD */}
                  <MetricCell value={formatMetric(otd, 'pct')} zone={otd?.zone ?? null} />

                  {/* FTR */}
                  <MetricCell value={formatMetric(ftr, 'pct')} zone={ftr?.zone ?? null} />

                  {/* Throughput */}
                  <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textPrimary, fontWeight: 500 }}>
                    {formatMetric(throughput, 'number')}
                  </Typography>

                  {/* Cycle */}
                  <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textPrimary, fontWeight: 500 }}>
                    {formatMetric(cycle, 'days')}
                  </Typography>

                  {/* Stuck — clickable when > 0 */}
                  {stuckCount > 0 ? (
                    <Box
                      component='button'
                      onClick={() => setDrawerSpaceId(snapshot.spaceId)}
                      aria-label={`Ver ${stuckCount} activos estancados de ${snapshot.spaceId}`}
                      sx={{
                        all: 'unset',
                        cursor: 'pointer',
                        '&:hover .stuck-text': { textDecoration: 'underline' }
                      }}
                    >
                      <MetricCell value={formatMetric(stuck, 'number')} zone={stuck?.zone ?? null} className='stuck-text' />
                    </Box>
                  ) : (
                    <MetricCell value={formatMetric(stuck, 'number')} zone={stuck?.zone ?? null} />
                  )}

                  {/* Overall */}
                  <CustomChip
                    round='true'
                    size='small'
                    color={zoneColor(overall)}
                    variant='tonal'
                    label={ZONE_LABEL[overall]}
                    sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
                  />
                </Box>
              </Box>
            )
          })}
        </Box>
      </ExecutiveCardShell>

      {/* Stuck Assets Drawer */}
      <StuckAssetsDrawer
        open={drawerSpaceId !== null}
        spaceId={drawerSpaceId ?? ''}
        onClose={() => setDrawerSpaceId(null)}
      />
    </>
  )
}

// ─── Metric Cell with zone indicator ────────────────────────────────────────

const MetricCell = ({ value, zone, className }: { value: string; zone: ThresholdZone | null; className?: string }) => (
  <Stack direction='row' spacing={0.5} alignItems='center'>
    {zone && (
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: zone === 'optimal'
            ? GH_COLORS.semaphore.green.source
            : zone === 'attention'
              ? GH_COLORS.semaphore.yellow.source
              : GH_COLORS.semaphore.red.source,
          flexShrink: 0
        }}
      />
    )}
    <Typography variant='body2' className={className} sx={{ color: GH_COLORS.neutral.textPrimary, fontWeight: 500 }}>
      {value}
    </Typography>
  </Stack>
)

export default SpaceIcoScorecard
