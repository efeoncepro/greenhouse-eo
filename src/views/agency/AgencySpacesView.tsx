'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import SpaceCard from '@/components/agency/SpaceCard'
import SpaceFilters from '@/components/agency/SpaceFilters'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'

type Props = {
  spaces: AgencySpaceHealth[]
}

const getRpaSemaphore = (v: number | null): { color: 'success' | 'warning' | 'error'; label: string } => {
  if (v === null) return { color: 'success', label: 'Sin datos' }
  if (v <= 1.5) return { color: 'success', label: 'Óptimo' }
  if (v <= 2.5) return { color: 'warning', label: 'Atención' }

  return { color: 'error', label: 'Crítico' }
}

const getOtdSemaphore = (v: number | null): { color: 'success' | 'warning' | 'error'; label: string } => {
  if (v === null) return { color: 'success', label: 'Sin datos' }
  if (v >= 90) return { color: 'success', label: 'Óptimo' }
  if (v >= 70) return { color: 'warning', label: 'Atención' }

  return { color: 'error', label: 'Crítico' }
}

const AgencySpacesView = ({ spaces }: Props) => {
  const [filtered, setFiltered] = useState<AgencySpaceHealth[]>(spaces)

  // Aggregated KPIs from all spaces (not filtered)
  const kpis = useMemo(() => {
    const totalSpaces = spaces.length
    const rpaValues = spaces.map(s => s.rpaAvg).filter((v): v is number => v !== null)
    const rpaAvg = rpaValues.length > 0 ? rpaValues.reduce((a, b) => a + b, 0) / rpaValues.length : null
    const otdValues = spaces.map(s => s.otdPct).filter((v): v is number => v !== null)
    const otdAvg = otdValues.length > 0 ? otdValues.reduce((a, b) => a + b, 0) / otdValues.length : null
    const assetsTotal = spaces.reduce((sum, s) => sum + s.assetsActivos, 0)
    const feedbackTotal = spaces.reduce((sum, s) => sum + s.feedbackPendiente, 0)

    return { totalSpaces, rpaAvg, otdAvg, assetsTotal, feedbackTotal }
  }, [spaces])

  const rpaSemaphore = getRpaSemaphore(kpis.rpaAvg)
  const otdSemaphore = getOtdSemaphore(kpis.otdAvg)

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Card
        elevation={0}
        sx={{ p: 3, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Typography variant='h5' sx={{ fontFamily: 'Poppins', fontWeight: 700, color: GH_COLORS.neutral.textPrimary, mb: 0.5 }}>
          {GH_AGENCY.spaces_title}
        </Typography>
        <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
          {GH_AGENCY.spaces_subtitle}
        </Typography>
      </Card>

      {/* KPI Row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total Spaces'
            stats={String(kpis.totalSpaces)}
            subtitle='Clientes activos'
            avatarIcon='tabler-building-community'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='RpA Promedio'
            stats={kpis.rpaAvg !== null ? kpis.rpaAvg.toFixed(1) : '—'}
            subtitle='Revisiones por asset'
            avatarIcon='tabler-chart-dots-2'
            avatarColor={rpaSemaphore.color}
            statusLabel={rpaSemaphore.label}
            statusColor={rpaSemaphore.color}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='OTD Promedio'
            stats={kpis.otdAvg !== null ? `${Math.round(kpis.otdAvg)}%` : '—'}
            subtitle='On-time delivery'
            avatarIcon='tabler-clock-check'
            avatarColor={otdSemaphore.color}
            statusLabel={otdSemaphore.label}
            statusColor={otdSemaphore.color}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Assets Activos'
            stats={String(kpis.assetsTotal)}
            subtitle='En producción'
            avatarIcon='tabler-subtask'
            avatarColor='info'
            {...(kpis.feedbackTotal > 0 ? {
              statusLabel: `${kpis.feedbackTotal} feedback pendiente`,
              statusColor: 'warning' as const,
              statusIcon: 'tabler-alert-triangle'
            } : {})}
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <SectionErrorBoundary sectionName='agency-spaces-filters' description='No pudimos cargar los filtros.'>
        <SpaceFilters spaces={spaces} onChange={setFiltered} filteredCount={filtered.length} />
      </SectionErrorBoundary>

      {/* Spaces Grid */}
      <SectionErrorBoundary sectionName='agency-spaces-grid' description='No pudimos cargar los Spaces.'>
        {filtered.length === 0 ? (
          <Card elevation={0} sx={{ border: `1px solid ${GH_COLORS.neutral.border}`, textAlign: 'center', py: 8 }}>
            <i className='tabler-search' style={{ fontSize: '2.5rem', color: GH_COLORS.neutral.border }} />
            <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary, mt: 2 }}>
              {GH_AGENCY.empty_spaces}
            </Typography>
          </Card>
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
              <SpaceCard key={space.clientId} space={space} />
            ))}
          </Box>
        )}
      </SectionErrorBoundary>
    </Stack>
  )
}

export default AgencySpacesView
