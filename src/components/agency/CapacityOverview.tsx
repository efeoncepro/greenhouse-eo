'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencyCapacityOverview } from '@/lib/agency/agency-queries'

type Props = {
  capacity: AgencyCapacityOverview | null
}

const getUtilTone = (pct: number): 'success' | 'warning' | 'error' =>
  pct >= 90 ? 'error' : pct >= 71 ? 'warning' : 'success'

const getUtilColor = (pct: number) =>
  pct >= 90 ? GH_COLORS.semaphore.red.source : pct >= 71 ? GH_COLORS.semaphore.yellow.source : GH_COLORS.semaphore.green.source

const CapacityOverview = ({ capacity }: Props) => {
  if (!capacity || capacity.members.length === 0) {
    return (
      <EmptyState
        icon='tabler-users-group'
        title='Capacidad no disponible'
        description={GH_AGENCY.capacity_empty}
        minHeight={260}
      />
    )
  }

  const utilColor = getUtilColor(capacity.utilizationPct)

  return (
    <Stack spacing={4}>
      {/* KPI Row */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }
        }}
      >
        <HorizontalWithSubtitle
          title={GH_AGENCY.kpi_fte}
          stats={capacity.totalFte.toFixed(1)}
          avatarIcon='tabler-briefcase'
          avatarColor='primary'
          subtitle={`${capacity.members.length} personas activas`}
        />
        <HorizontalWithSubtitle
          title={GH_AGENCY.kpi_utilization}
          stats={`${capacity.utilizationPct}%`}
          avatarIcon='tabler-activity'
          avatarColor={getUtilTone(capacity.utilizationPct)}
          subtitle={capacity.utilizationPct >= 90 ? 'Capacidad al límite' : capacity.utilizationPct >= 71 ? 'Carga alta' : 'Capacidad óptima'}
        />
        <HorizontalWithSubtitle
          title={GH_AGENCY.kpi_hours}
          stats={`${capacity.monthlyHours}h`}
          avatarIcon='tabler-clock'
          avatarColor='info'
          subtitle='Horas mensuales asignadas'
        />
      </Box>

      {/* Utilization bar */}
      <Box>
        <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
          <Typography variant='body2' sx={{ fontWeight: 600, color: GH_COLORS.neutral.textPrimary }}>
            Utilización global
          </Typography>
          <Typography variant='body2' sx={{ color: utilColor, fontWeight: 600 }}>
            {capacity.utilizationPct}%
          </Typography>
        </Stack>
        <LinearProgress
          variant='determinate'
          value={Math.min(capacity.utilizationPct, 100)}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(utilColor, 0.15),
            '& .MuiLinearProgress-bar': { bgcolor: utilColor, borderRadius: 4 }
          }}
        />
      </Box>

      {/* Member list */}
      <Box
        sx={{
          border: `1px solid ${GH_COLORS.neutral.border}`,
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: GH_COLORS.neutral.bgSurface }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: GH_COLORS.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Distribución por persona
          </Typography>
        </Box>

        {capacity.members.map((member, idx) => (
          <Box
            key={member.memberId}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2.5,
              py: 1.5,
              borderTop: idx > 0 ? `1px solid ${alpha(GH_COLORS.neutral.border, 0.6)}` : 'none',
              '&:hover': { bgcolor: GH_COLORS.neutral.bgSurface }
            }}
          >
            <Avatar
              sx={{ width: 36, height: 36, bgcolor: GH_COLORS.role.account.bg, color: GH_COLORS.role.account.text, fontSize: '0.8rem', fontFamily: 'Poppins', fontWeight: 500 }}
            >
              {member.displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant='subtitle2' noWrap sx={{ color: GH_COLORS.neutral.textPrimary }}>
                {member.displayName}
              </Typography>
              <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                {member.roleTitle}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant='body2' sx={{ fontWeight: 600, color: GH_COLORS.neutral.textPrimary }}>
                {member.fteAllocation.toFixed(1)} FTE
              </Typography>
              <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                {Math.round(member.fteAllocation * 160)}h/mes
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Stack>
  )
}

export default CapacityOverview
