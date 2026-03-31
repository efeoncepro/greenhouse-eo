'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import ExecutiveMiniStatCard from '@/components/greenhouse/ExecutiveMiniStatCard'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import SpaceCard from '@/components/agency/SpaceCard'
import SpaceFilters from '@/components/agency/SpaceFilters'
import SpaceHealthTable from '@/components/agency/SpaceHealthTable'
import SpacesCharts from '@/components/agency/SpacesCharts'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'
import type { SpaceFinanceMetrics } from '@/lib/agency/agency-finance-metrics'

type Props = {
  spaces: AgencySpaceHealth[]
}

type ViewMode = 'table' | 'cards'

// ─── Semaphore Tone Helpers ─────────────────────────────────────────────────

const getRpaTone = (v: number | null) =>
  v === null ? 'info' as const : v <= 1.5 ? 'success' as const : v <= 2.5 ? 'warning' as const : 'error' as const

const getOtdTone = (v: number | null) =>
  v === null ? 'info' as const : v >= 90 ? 'success' as const : v >= 70 ? 'warning' as const : 'error' as const

// ─── Component ──────────────────────────────────────────────────────────────

const AgencySpacesView = ({ spaces }: Props) => {
  const [filtered, setFiltered] = useState<AgencySpaceHealth[]>(spaces)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [financeMetrics, setFinanceMetrics] = useState<Map<string, SpaceFinanceMetrics>>(new Map())
  const financeFetched = useRef(false)

  useEffect(() => {
    if (financeFetched.current) return
    financeFetched.current = true

    fetch('/api/agency/finance-metrics', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          const map = new Map<string, SpaceFinanceMetrics>()

          for (const item of data) {
            if (item.clientId) map.set(item.clientId, item)
          }

          setFinanceMetrics(map)
        }
      })
      .catch(() => {})
  }, [])

  // KPIs computed from filtered data (respond to filter changes)
  const kpis = useMemo(() => {
    const totalSpaces = filtered.length
    const rpaValues = filtered.map(s => s.rpaAvg).filter((v): v is number => v !== null)
    const rpaAvg = rpaValues.length > 0 ? rpaValues.reduce((a, b) => a + b, 0) / rpaValues.length : null
    const otdValues = filtered.map(s => s.otdPct).filter((v): v is number => v !== null)
    const otdAvg = otdValues.length > 0 ? otdValues.reduce((a, b) => a + b, 0) / otdValues.length : null
    const totalMembers = filtered.reduce((sum, s) => sum + s.assignedMembers, 0)
    const totalFte = filtered.reduce((sum, s) => sum + s.allocatedFte, 0)

    // Sparkline data for mini charts
    const rpaSparkline = filtered
      .filter(s => s.rpaAvg !== null)
      .sort((a, b) => (a.rpaAvg ?? 0) - (b.rpaAvg ?? 0))
      .map(s => Number((s.rpaAvg ?? 0).toFixed(1)))

    const otdSparkline = filtered
      .filter(s => s.otdPct !== null)
      .sort((a, b) => (a.otdPct ?? 0) - (b.otdPct ?? 0))
      .map(s => Math.round(s.otdPct ?? 0))

    return { totalSpaces, rpaAvg, otdAvg, totalMembers, totalFte, rpaSparkline, otdSparkline }
  }, [filtered])

  return (
    <Stack spacing={6}>
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <Card
        elevation={0}
        sx={{ p: 3, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap gap={1}>
          <Box>
            <Typography variant='h5' sx={{ fontFamily: 'Poppins', fontWeight: 700, color: GH_COLORS.neutral.textPrimary, mb: 0.5 }}>
              {GH_AGENCY.spaces_title}
            </Typography>
            <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
              {GH_AGENCY.spaces_subtitle}
            </Typography>
          </Box>
          <CustomChip
            round='true'
            size='small'
            color='secondary'
            variant='tonal'
            label={GH_AGENCY.meta_spaces(spaces.length)}
            sx={{ fontWeight: 500 }}
          />
        </Stack>
      </Card>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <SectionErrorBoundary sectionName='spaces-kpis' description='No pudimos calcular los KPIs.'>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
            <ExecutiveMiniStatCard
              title={GH_AGENCY.spaces_kpi_total}
              value={String(kpis.totalSpaces)}
              detail={GH_AGENCY.spaces_kpi_total_detail(kpis.totalSpaces)}
              tone='info'
              icon='tabler-building-community'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
            <ExecutiveMiniStatCard
              title={GH_AGENCY.spaces_kpi_rpa}
              value={kpis.rpaAvg !== null ? kpis.rpaAvg.toFixed(1) : '—'}
              detail={GH_AGENCY.spaces_kpi_rpa_detail(kpis.rpaAvg)}
              tone={getRpaTone(kpis.rpaAvg)}
              icon='tabler-chart-dots-2'
              miniChart={kpis.rpaSparkline.length >= 3 ? { variant: 'bars', data: kpis.rpaSparkline } : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
            <ExecutiveMiniStatCard
              title={GH_AGENCY.spaces_kpi_otd}
              value={kpis.otdAvg !== null ? `${Math.round(kpis.otdAvg)}%` : '—'}
              detail={GH_AGENCY.spaces_kpi_otd_detail(kpis.otdAvg)}
              tone={getOtdTone(kpis.otdAvg)}
              icon='tabler-clock-check'
              miniChart={kpis.otdSparkline.length >= 3 ? { variant: 'area', data: kpis.otdSparkline } : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
            <ExecutiveMiniStatCard
              title={GH_AGENCY.spaces_kpi_team}
              value={String(kpis.totalMembers)}
              detail={GH_AGENCY.spaces_kpi_team_detail(kpis.totalMembers, kpis.totalFte)}
              tone='info'
              icon='tabler-users'
            />
          </Grid>
        </Grid>
      </SectionErrorBoundary>

      {/* ── Charts Row ───────────────────────────────────────────────────────── */}
      <SectionErrorBoundary sectionName='spaces-charts' description='No pudimos cargar los gráficos.'>
        <SpacesCharts spaces={filtered} />
      </SectionErrorBoundary>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <SectionErrorBoundary sectionName='agency-spaces-filters' description='No pudimos cargar los filtros.'>
        <SpaceFilters
          spaces={spaces}
          onChange={setFiltered}
          filteredCount={filtered.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </SectionErrorBoundary>

      {/* ── Data View ────────────────────────────────────────────────────────── */}
      <SectionErrorBoundary sectionName='agency-spaces-data' description='No pudimos cargar los Spaces.'>
        {filtered.length === 0 ? (
          <Card elevation={0} sx={{ border: `1px solid ${GH_COLORS.neutral.border}`, textAlign: 'center', py: 8 }}>
            <i className='tabler-search' style={{ fontSize: '2.5rem', color: GH_COLORS.neutral.border }} />
            <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary, mt: 2 }}>
              {GH_AGENCY.empty_spaces}
            </Typography>
          </Card>
        ) : viewMode === 'table' ? (
          <SpaceHealthTable spaces={filtered} />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))'
              }
            }}
          >
            {filtered.map(space => (
              <SpaceCard key={space.clientId} space={space} financeMetrics={financeMetrics.get(space.clientId) ?? null} />
            ))}
          </Box>
        )}
      </SectionErrorBoundary>
    </Stack>
  )
}

export default AgencySpacesView
