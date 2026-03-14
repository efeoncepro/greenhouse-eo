'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomIconButton from '@core/components/mui/IconButton'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'

type Props = {
  space: AgencySpaceHealth
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SERVICE_LINE_LABELS: Record<string, string> = {
  globe: 'Globe',
  efeonce_digital: 'Digital',
  reach: 'Reach',
  wave: 'Wave',
  crm_solutions: 'CRM'
}

const getServiceColor = (lines: string[]) => {
  const key = lines[0] as keyof typeof GH_COLORS.service

  return GH_COLORS.service[key] ?? {
    source: GH_COLORS.chart.primary,
    bg: '#eaf3fc',
    text: GH_COLORS.chart.primary
  }
}

const getRpaSemaphore = (v: number | null) => {
  if (v === null) return { color: 'secondary' as const, muiColor: GH_COLORS.neutral.border, pct: 0 }
  if (v <= 1.5) return { color: 'success' as const, muiColor: GH_COLORS.semaphore.green.source, pct: Math.min(100, (v / 4) * 100) }
  if (v <= 2.5) return { color: 'warning' as const, muiColor: GH_COLORS.semaphore.yellow.source, pct: Math.min(100, (v / 4) * 100) }

  return { color: 'error' as const, muiColor: GH_COLORS.semaphore.red.source, pct: Math.min(100, (v / 4) * 100) }
}

const getOtdSemaphore = (v: number | null) => {
  if (v === null) return { color: 'secondary' as const, muiColor: GH_COLORS.neutral.border, pct: 0 }
  if (v >= 90) return { color: 'success' as const, muiColor: GH_COLORS.semaphore.green.source, pct: v }
  if (v >= 70) return { color: 'warning' as const, muiColor: GH_COLORS.semaphore.yellow.source, pct: v }

  return { color: 'error' as const, muiColor: GH_COLORS.semaphore.red.source, pct: v }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SpaceCard = ({ space }: Props) => {
  const router = useRouter()
  const color = getServiceColor(space.businessLines)
  const rpa = getRpaSemaphore(space.rpaAvg)
  const otd = getOtdSemaphore(space.otdPct)

  return (
    <Card
      onClick={() => router.push(`/dashboard?space=${space.clientId}`)}
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
      {/* ── Header ───────────────────────────────────────────── */}
      <Stack direction='row' alignItems='flex-start' spacing={1.5} sx={{ p: 2.5, pb: 2 }}>
        <CustomAvatar
          color={color.text === GH_COLORS.chart.primary ? 'primary' : 'secondary'}
          skin='light'
          variant='rounded'
          size={38}
          sx={{ bgcolor: color.bg, color: color.text }}
        >
          {space.clientName.charAt(0).toUpperCase()}
        </CustomAvatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction='row' spacing={0.75} alignItems='center' flexWrap='wrap' useFlexGap>
            <Typography
              sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.95rem', color: GH_COLORS.neutral.textPrimary }}
              noWrap
            >
              {space.clientName}
            </Typography>
            {space.isInternal && (
              <CustomChip round='true' size='small' color='secondary' variant='tonal' label='Interno' sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Stack>
          <Stack direction='row' spacing={0.5} sx={{ mt: 0.5 }} flexWrap='wrap' useFlexGap>
            {space.businessLines.length > 0 ? (
              space.businessLines.map(line => (
                <CustomChip
                  key={line}
                  round='true'
                  size='small'
                  label={SERVICE_LINE_LABELS[line] ?? line.replace(/_/g, ' ')}
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    bgcolor: alpha(color.text, 0.08),
                    color: color.text,
                    border: 'none'
                  }}
                />
              ))
            ) : (
              <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                Sin línea asignada
              </Typography>
            )}
          </Stack>
        </Box>

        <Tooltip title={`Ir a ${space.clientName}`}>
          <span>
            <CustomIconButton
              size='small'
              variant='tonal'
              color='secondary'
              onClick={e => { e.stopPropagation(); router.push(`/dashboard?space=${space.clientId}`) }}
            >
              <i className='tabler-arrow-right' style={{ fontSize: '1rem' }} />
            </CustomIconButton>
          </span>
        </Tooltip>
      </Stack>

      <Divider />

      {/* ── Metrics: RpA + OTD with progress bars ────────────── */}
      <Box sx={{ px: 2.5, py: 2 }}>
        {/* RpA */}
        <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mb: 1.5 }}>
          <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary, minWidth: 30 }}>RpA</Typography>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant='determinate'
              value={rpa.pct}
              color={rpa.color}
              sx={{ height: 6, borderRadius: 3, bgcolor: alpha(rpa.muiColor, 0.12) }}
            />
          </Box>
          <Typography sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.85rem', color: rpa.muiColor, minWidth: 30, textAlign: 'right' }}>
            {space.rpaAvg !== null ? space.rpaAvg.toFixed(1) : '—'}
          </Typography>
        </Stack>

        {/* OTD */}
        <Stack direction='row' alignItems='center' spacing={1.5}>
          <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary, minWidth: 30 }}>OTD</Typography>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant='determinate'
              value={otd.pct}
              color={otd.color}
              sx={{ height: 6, borderRadius: 3, bgcolor: alpha(otd.muiColor, 0.12) }}
            />
          </Box>
          <Typography sx={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '0.85rem', color: otd.muiColor, minWidth: 30, textAlign: 'right' }}>
            {space.otdPct !== null ? `${Math.round(space.otdPct)}%` : '—'}
          </Typography>
        </Stack>
      </Box>

      <Divider />

      {/* ── Support metrics as chips ─────────────────────────── */}
      <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap' sx={{ px: 2.5, py: 1.5 }}>
        <Tooltip title='Proyectos activos'>
          <span>
            <CustomChip
              round='true'
              size='small'
              color='success'
              variant='tonal'
              icon={<i className='tabler-folders' style={{ fontSize: '0.8rem' }} />}
              label={String(space.projectCount)}
              sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
            />
          </span>
        </Tooltip>
        <Tooltip title='Miembros asignados'>
          <span>
            <CustomChip
              round='true'
              size='small'
              color='info'
              variant='tonal'
              icon={<i className='tabler-users' style={{ fontSize: '0.8rem' }} />}
              label={String(space.assignedMembers)}
              sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
            />
          </span>
        </Tooltip>
        <Tooltip title='FTE asignados'>
          <span>
            <CustomChip
              round='true'
              size='small'
              color='primary'
              variant='tonal'
              icon={<i className='tabler-clock-hour-4' style={{ fontSize: '0.8rem' }} />}
              label={space.allocatedFte.toFixed(1)}
              sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
            />
          </span>
        </Tooltip>
        {space.totalUsers > 0 && (
          <Tooltip title={`${space.activeUsers} activos de ${space.totalUsers} usuarios`}>
            <span>
              <CustomChip
                round='true'
                size='small'
                color='secondary'
                variant='tonal'
                icon={<i className='tabler-user-check' style={{ fontSize: '0.8rem' }} />}
                label={`${space.activeUsers}/${space.totalUsers}`}
                sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
              />
            </span>
          </Tooltip>
        )}
        <Tooltip title='Assets activos'>
          <span>
            <CustomChip
              round='true'
              size='small'
              color='warning'
              variant='tonal'
              icon={<i className='tabler-subtask' style={{ fontSize: '0.8rem' }} />}
              label={String(space.assetsActivos)}
              sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
            />
          </span>
        </Tooltip>
      </Stack>

      {/* ── Feedback alert ───────────────────────────────────── */}
      {space.feedbackPendiente > 0 && (
        <Box sx={{ px: 2.5, pb: 1.5 }}>
          <CustomChip
            round='true'
            size='small'
            color='warning'
            variant='tonal'
            icon={<i className='tabler-alert-triangle' style={{ fontSize: '0.8rem' }} />}
            label={`${space.feedbackPendiente} feedback pendiente`}
            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 500 }}
          />
        </Box>
      )}
    </Card>
  )
}

export default SpaceCard
