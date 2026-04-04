'use client'

import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import EmptyState from '@/components/greenhouse/EmptyState'
import TeamAvatar from '@/components/greenhouse/TeamAvatar'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'

// ── Types matching /api/team/capacity-breakdown response ──

interface CapacityBreakdown {
  contractedHoursMonth: number
  assignedHoursMonth: number
  usedHoursMonth: number | null
  availableHoursMonth: number
  commercialAvailabilityHours?: number
  operationalAvailabilityHours?: number | null
  overcommitted: boolean
}

interface CapacityMember {
  memberId: string
  displayName: string
  roleTitle: string | null
  fteAllocation: number
  usagePercent: number | null
  capacityHealth: string
  capacity: CapacityBreakdown
  assignments?: Array<{
    clientName: string | null
    fteAllocation: number
    hoursPerMonth: number
  }>
}

export interface CapacityBreakdownData {
  team: CapacityBreakdown & {
    usageKind?: string
    usagePercent?: number | null
  }
  members: CapacityMember[]
  memberCount: number
  hasOperationalMetrics: boolean
  overcommittedCount: number
}

type Props = {
  capacity: CapacityBreakdownData | null
}

// ── Helpers ──

const HEALTH_COLORS: Record<string, 'secondary' | 'success' | 'warning' | 'error'> = {
  idle: 'secondary',
  balanced: 'success',
  high: 'warning',
  overloaded: 'error'
}

const HEALTH_LABELS: Record<string, string> = {
  idle: 'Disponible',
  balanced: 'Balanceado',
  high: 'Dedicación completa',
  overloaded: 'Sobrecomprometido'
}

const getUtilColor = (pct: number) =>
  pct >= 90 ? GH_COLORS.semaphore.red.source : pct >= 71 ? GH_COLORS.semaphore.yellow.source : GH_COLORS.semaphore.green.source

const getUtilTone = (pct: number): 'success' | 'warning' | 'error' =>
  pct >= 90 ? 'error' : pct >= 71 ? 'warning' : 'success'

// ── Component ──

const CapacityOverview = ({ capacity }: Props) => {
  if (!capacity || capacity.members.length === 0) {
    return (
      <EmptyState
        icon='tabler-users-group'
        animatedIcon='/animations/empty-inbox.json'
        title='Capacidad no disponible'
        description={GH_AGENCY.capacity_empty}
        minHeight={260}
      />
    )
  }

  const { team, members, overcommittedCount } = capacity

  const utilizationPct = team.contractedHoursMonth > 0
    ? Math.round((team.assignedHoursMonth / team.contractedHoursMonth) * 100)
    : 0

  const totalFte = Number((team.contractedHoursMonth / 160).toFixed(1))

  const utilColor = getUtilColor(utilizationPct)

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
          stats={totalFte.toFixed(1)}
          avatarIcon='tabler-briefcase'
          avatarColor='primary'
          subtitle={`${members.length} personas activas`}
          titleTooltip='FTE total basado en horas contratadas del equipo'
        />
        <HorizontalWithSubtitle
          title={GH_AGENCY.kpi_utilization}
          stats={`${utilizationPct}%`}
          avatarIcon='tabler-activity'
          avatarColor={getUtilTone(utilizationPct)}
          subtitle={utilizationPct >= 90 ? 'Capacidad al límite' : utilizationPct >= 71 ? 'Carga alta' : 'Capacidad óptima'}
          titleTooltip='Horas asignadas como porcentaje de horas contratadas'
        />
        <HorizontalWithSubtitle
          title={GH_AGENCY.kpi_hours}
          stats={`${team.contractedHoursMonth}h`}
          avatarIcon='tabler-clock'
          avatarColor='info'
          subtitle={`${team.assignedHoursMonth}h asignadas · ${Math.max(0, team.availableHoursMonth)}h disponibles`}
          titleTooltip='Horas contratadas mensuales del equipo'
        />
      </Box>

      {/* Utilization bar */}
      <Box>
        <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
          <Typography variant='body2' sx={{ fontWeight: 600, color: GH_COLORS.neutral.textPrimary }}>
            Utilización global
          </Typography>
          <Stack direction='row' spacing={1} alignItems='center'>
            {overcommittedCount > 0 && (
              <CustomChip
                size='small'
                round='true'
                variant='tonal'
                color='error'
                label={`${overcommittedCount} sobrecomprometido${overcommittedCount > 1 ? 's' : ''}`}
              />
            )}
            <Typography variant='body2' sx={{ color: utilColor, fontWeight: 600 }}>
              {utilizationPct}%
            </Typography>
          </Stack>
        </Stack>
        <LinearProgress
          variant='determinate'
          value={Math.min(utilizationPct, 100)}
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

        {members.map((member, idx) => {
          const memberFte = member.capacity.contractedHoursMonth / 160

          const memberAssignedPct = member.capacity.contractedHoursMonth > 0
            ? Math.round((member.capacity.assignedHoursMonth / member.capacity.contractedHoursMonth) * 100)
            : 0

          const healthColor = HEALTH_COLORS[member.capacityHealth] ?? 'secondary'
          const healthLabel = HEALTH_LABELS[member.capacityHealth] ?? member.capacityHealth

          return (
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
              <TeamAvatar name={member.displayName} avatarUrl={null} roleCategory='unknown' size={36} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='subtitle2' noWrap sx={{ color: GH_COLORS.neutral.textPrimary }}>
                  {member.displayName}
                </Typography>
                <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                  {member.roleTitle ?? 'Sin rol definido'}
                </Typography>
              </Box>
              <Tooltip title={`Contratado: ${member.capacity.contractedHoursMonth}h · Asignado: ${member.capacity.assignedHoursMonth}h · ${healthLabel}`}>
                <Box>
                  <CustomChip size='small' round='true' variant='tonal' color={healthColor} label={healthLabel} />
                </Box>
              </Tooltip>
              <Box sx={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                <Typography variant='body2' sx={{ fontWeight: 600, color: GH_COLORS.neutral.textPrimary }}>
                  {memberFte.toFixed(1)} FTE
                </Typography>
                <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                  {memberAssignedPct}% asignado
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Stack>
  )
}

export default CapacityOverview
