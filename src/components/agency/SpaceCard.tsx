'use client'

import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'

type Props = {
  space: AgencySpaceHealth
}

const getServiceColor = (lines: string[]) => {
  const key = lines[0] as keyof typeof GH_COLORS.service

  return GH_COLORS.service[key] ?? {
    source: GH_COLORS.chart.primary,
    bg: '#eaf3fc',
    text: GH_COLORS.chart.primary
  }
}

const MetricCol = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <Box sx={{ flex: 1, textAlign: 'center' }}>
    <Stack direction='row' spacing={0.5} alignItems='center' justifyContent='center'>
      {tone && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: tone, flexShrink: 0 }} />}
      <Typography sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '1.1rem', color: GH_COLORS.neutral.textPrimary }}>
        {value}
      </Typography>
    </Stack>
    <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
      {label}
    </Typography>
  </Box>
)

const getRpaTone = (v: number | null) =>
  v === null ? GH_COLORS.neutral.border : v <= 1.5 ? GH_COLORS.semaphore.green.source : v <= 2.5 ? GH_COLORS.semaphore.yellow.source : GH_COLORS.semaphore.red.source

const getOtdTone = (v: number | null) =>
  v === null ? GH_COLORS.neutral.border : v >= 90 ? GH_COLORS.semaphore.green.source : v >= 70 ? GH_COLORS.semaphore.yellow.source : GH_COLORS.semaphore.red.source

const SpaceCard = ({ space }: Props) => {
  const router = useRouter()
  const color = getServiceColor(space.businessLines)

  return (
    <Card
      onClick={() => router.push(`/agency/spaces/${space.clientId}`)}
      elevation={0}
      sx={{
        border: `1px solid ${GH_COLORS.neutral.border}`,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: 2,
          borderColor: alpha(GH_COLORS.neutral.textSecondary, 0.25)
        }
      }}
    >
      {/* Header */}
      <Stack direction='row' alignItems='flex-start' spacing={1.5} sx={{ p: 2.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: color.bg,
            color: color.text,
            fontSize: '0.8rem',
            fontFamily: 'Poppins',
            fontWeight: 500,
            flexShrink: 0
          }}
        >
          {space.clientName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction='row' spacing={0.75} alignItems='center' flexWrap='wrap' useFlexGap>
            <Typography
              sx={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '0.95rem', color: GH_COLORS.neutral.textPrimary }}
              noWrap
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
            {space.businessLines.length > 0
              ? space.businessLines.map(l => l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' · ')
              : 'Sin línea asignada'}
          </Typography>
        </Box>
        <Tooltip title={`Ir a ${space.clientName}`}>
          <IconButton
            size='small'
            onClick={e => { e.stopPropagation(); router.push(`/agency/spaces/${space.clientId}`) }}
            sx={{ color: GH_COLORS.neutral.textSecondary, flexShrink: 0 }}
          >
            <i className='tabler-arrow-right' style={{ fontSize: '1rem' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ borderColor: GH_COLORS.neutral.border }} />

      {/* Metrics */}
      <Stack direction='row' sx={{ px: 2, py: 1.75 }} divider={<Divider orientation='vertical' flexItem />}>
        <MetricCol
          label='RpA'
          value={space.rpaAvg !== null ? space.rpaAvg.toFixed(1) : '—'}
          tone={getRpaTone(space.rpaAvg)}
        />
        <MetricCol
          label='OTD%'
          value={space.otdPct !== null ? `${Math.round(space.otdPct)}%` : '—'}
          tone={getOtdTone(space.otdPct)}
        />
        <MetricCol label='Assets' value={String(space.assetsActivos)} />
      </Stack>

      {/* Feedback alert */}
      {space.feedbackPendiente > 0 && (
        <Box sx={{ px: 2.5, pb: 1.5 }}>
          <Typography variant='caption' sx={{ color: GH_COLORS.semaphore.yellow.source, fontWeight: 500 }}>
            <i className='tabler-alert-triangle' style={{ marginRight: 4, fontSize: '0.75rem' }} />
            Feedback pendiente: {space.feedbackPendiente}
          </Typography>
        </Box>
      )}
    </Card>
  )
}

export default SpaceCard
