'use client'

import { useMemo } from 'react'

import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'
import { getSpaceHealth, HEALTH_ZONE_LABEL, HEALTH_ZONE_COLOR, HEALTH_ZONE_ORDER } from './space-health'

type Props = {
  spaces: AgencySpaceHealth[]
}

const getServiceColor = (lines: string[]) => {
  const key = lines[0] as keyof typeof GH_COLORS.service

  return GH_COLORS.service[key] ?? {
    source: GH_COLORS.chart.primary,
    bg: '#eaf3fc',
    text: GH_COLORS.chart.primary
  }
}

const SemaphoreDot = ({ value, type }: { value: number | null; type: 'rpa' | 'otd' }) => {
  const isOptimal = type === 'rpa' ? (value !== null && value <= 1.5) : (value !== null && value >= 90)
  const isWarning = type === 'rpa' ? (value !== null && value > 1.5 && value <= 2.5) : (value !== null && value >= 70 && value < 90)

  const color = value === null
    ? GH_COLORS.neutral.border
    : isOptimal
      ? GH_COLORS.semaphore.green.source
      : isWarning
        ? GH_COLORS.semaphore.yellow.source
        : GH_COLORS.semaphore.red.source

  return <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
}

const SpaceHealthTable = ({ spaces }: Props) => {
  const router = useRouter()

  // Sort by health (critical first), then by name
  const sorted = useMemo(() =>
    [...spaces].sort((a, b) => {
      const ha = HEALTH_ZONE_ORDER[getSpaceHealth(a)]
      const hb = HEALTH_ZONE_ORDER[getSpaceHealth(b)]

      if (ha !== hb) return ha - hb

      return a.clientName.localeCompare(b.clientName)
    }),
    [spaces]
  )

  if (sorted.length === 0) {
    return (
      <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary, p: 3 }}>
        No hay Spaces activos.
      </Typography>
    )
  }

  const COL = { color: GH_COLORS.neutral.textSecondary, fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }

  const GRID = '2fr 1fr 70px 70px 80px 90px 80px 36px'

  return (
    <Box
      sx={{
        border: `1px solid ${GH_COLORS.neutral.border}`,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: GRID,
          px: 2.5,
          py: 1.25,
          bgcolor: GH_COLORS.neutral.bgSurface
        }}
      >
        {[
          GH_AGENCY.col_space,
          GH_AGENCY.col_service_line,
          GH_AGENCY.col_rpa,
          GH_AGENCY.col_otd,
          GH_AGENCY.spaces_col_projects,
          GH_AGENCY.spaces_col_team,
          GH_AGENCY.spaces_col_health,
          ''
        ].map((label, i) => (
          <Typography key={i} sx={COL}>{label}</Typography>
        ))}
      </Box>

      <Divider />

      {sorted.map((space, idx) => {
        const color = getServiceColor(space.businessLines)
        const healthZone = getSpaceHealth(space)

        return (
          <Box key={space.clientId}>
            {idx > 0 && <Divider sx={{ borderColor: alpha(GH_COLORS.neutral.border, 0.6) }} />}
            <Box
              onClick={() => router.push(`/agency/spaces/${space.clientId}`)}
              sx={{
                display: 'grid',
                gridTemplateColumns: GRID,
                alignItems: 'center',
                px: 2.5,
                py: 1.5,
                cursor: 'pointer',
                transition: 'background 0.15s',
                '&:hover': { bgcolor: GH_COLORS.neutral.bgSurface }
              }}
            >
              {/* Space name + avatar */}
              <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    bgcolor: color.bg,
                    color: color.text,
                    fontSize: '0.75rem',
                    fontFamily: 'Poppins',
                    fontWeight: 500
                  }}
                >
                  {space.clientName.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction='row' spacing={0.75} alignItems='center'>
                    <Typography
                      variant='body2'
                      noWrap
                      sx={{ fontWeight: 600, color: GH_COLORS.neutral.textPrimary }}
                    >
                      {space.clientName}
                    </Typography>
                    {space.isInternal && (
                      <Chip
                        label='Interno'
                        size='small'
                        sx={{
                          height: 16,
                          fontSize: '0.65rem',
                          fontWeight: 500,
                          bgcolor: GH_COLORS.neutral.bgSurface,
                          color: GH_COLORS.neutral.textSecondary,
                          border: `1px solid ${GH_COLORS.neutral.border}`
                        }}
                      />
                    )}
                  </Stack>
                  <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                    {`${space.assignedMembers} persona${space.assignedMembers !== 1 ? 's' : ''} · ${space.allocatedFte.toFixed(1)} FTE`}
                  </Typography>
                </Box>
              </Stack>

              {/* Service line */}
              <Box>
                {space.businessLines.length > 0 ? (
                  <Chip
                    label={space.businessLines[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    size='small'
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 500, bgcolor: color.bg, color: color.text, border: 'none' }}
                  />
                ) : (
                  <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>—</Typography>
                )}
              </Box>

              {/* RpA */}
              <Stack direction='row' spacing={0.75} alignItems='center'>
                <SemaphoreDot value={space.rpaAvg} type='rpa' />
                <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textPrimary, fontWeight: 500 }}>
                  {space.rpaAvg !== null ? space.rpaAvg.toFixed(1) : '—'}
                </Typography>
              </Stack>

              {/* OTD */}
              <Stack direction='row' spacing={0.75} alignItems='center'>
                <SemaphoreDot value={space.otdPct} type='otd' />
                <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textPrimary, fontWeight: 500 }}>
                  {space.otdPct !== null ? `${Math.round(space.otdPct)}%` : '—'}
                </Typography>
              </Stack>

              {/* Projects */}
              <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textPrimary }}>
                {space.projectCount}
              </Typography>

              {/* Team */}
              <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textPrimary }}>
                {space.assignedMembers} · {space.allocatedFte.toFixed(1)}
              </Typography>

              {/* Health */}
              <CustomChip
                round='true'
                size='small'
                color={HEALTH_ZONE_COLOR[healthZone]}
                variant='tonal'
                label={HEALTH_ZONE_LABEL[healthZone]}
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
              />

              {/* Nav arrow */}
              <Tooltip title={`Ir a ${space.clientName}`}>
                <IconButton
                  size='small'
                  onClick={e => { e.stopPropagation(); router.push(`/agency/spaces/${space.clientId}`) }}
                  sx={{ color: GH_COLORS.neutral.textSecondary }}
                >
                  <i className='tabler-arrow-right' style={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export default SpaceHealthTable
