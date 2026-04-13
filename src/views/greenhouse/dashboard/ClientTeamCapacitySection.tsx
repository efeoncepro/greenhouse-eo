'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { EmptyState, ExecutiveCardShell } from '@/components/greenhouse'
import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import { formatFte, formatHours, formatTeamMemberInitials } from '@views/greenhouse/dashboard/helpers'

type ClientTeamCapacitySectionProps = {
  data: GreenhouseDashboardData
  onRequest: (intent: string) => void
}

type TeamRoleTone = keyof typeof GH_COLORS.role

const getRoleTone = (role: string): TeamRoleTone => {
  const normalizedRole = role.toLowerCase()

  if (normalizedRole.includes('account')) return 'account'
  if (normalizedRole.includes('operat')) return 'operations'
  if (normalizedRole.includes('strateg')) return 'strategy'
  if (normalizedRole.includes('design') || normalizedRole.includes('creative')) return 'design'
  if (normalizedRole.includes('media')) return 'media'

  return 'development'
}

const formatMemberDedication = (allocationPct: number | null, monthlyHours: number | null) => {
  if (allocationPct !== null && monthlyHours !== null) {
    return `${allocationPct}% · ${monthlyHours}h/mes`
  }

  if (allocationPct !== null) {
    return `${allocationPct}%`
  }

  if (monthlyHours !== null) {
    return `${monthlyHours}h/mes`
  }

  return GH_TEAM.dedication_pending
}

const ClientTeamCapacitySection = ({ data, onRequest }: ClientTeamCapacitySectionProps) => {
  const teamMembers = data.accountTeam.members
  const hasTeam = teamMembers.length > 0
  const totalMonthlyHours = data.accountTeam.totalMonthlyHours
  const hasCapacity = totalMonthlyHours > 0
  const utilizationPct = Math.max(0, Math.min(100, data.accountTeam.averageAllocationPct ?? 0))
  const utilizedHours = Math.round((totalMonthlyHours * utilizationPct) / 100)
  const capacityTone = utilizationPct >= 90 ? 'error' : utilizationPct >= 71 ? 'warning' : 'success'

  if (!hasTeam) {
    return (
      <ExecutiveCardShell title={GH_TEAM.capacity_title} subtitle={GH_TEAM.capacity_subtitle}>
        <EmptyState icon='tabler-users-group' title={GH_TEAM.capacity_title} description={GH_MESSAGES.empty_capacity} minHeight={260} />
      </ExecutiveCardShell>
    )
  }

  return (
    <ExecutiveCardShell title={GH_TEAM.capacity_title} subtitle={GH_TEAM.capacity_subtitle}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            xl: hasCapacity ? 'minmax(0, 1.2fr) minmax(300px, 0.8fr)' : '1fr'
          }
        }}
      >
        <Stack spacing={2}>
          <Typography variant='subtitle2'>{GH_TEAM.label_load}</Typography>

          {teamMembers.map(member => {
            const roleTone = GH_COLORS.role[getRoleTone(member.role)]
            const memberUtilization = Math.max(0, Math.min(100, member.allocationPct ?? 0))

            return (
              <Box
                key={member.id}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
                  display: 'grid',
                  gap: 1.5
                }}
              >
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Avatar
                    src={member.avatarPath || undefined}
                    sx={{
                      width: 46,
                      height: 46,
                      bgcolor: roleTone.bg,
                      color: roleTone.textDark,
                      border: `1px solid ${roleTone.bgHover}`
                    }}
                  >
                    {formatTeamMemberInitials(member.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant='h6'>{member.name}</Typography>
                    <Typography variant='body2' sx={{ color: roleTone.text }}>
                      {member.role}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant='caption' color='text.secondary'>
                      {GH_TEAM.label_fte}
                    </Typography>
                    <Typography variant='body2'>{formatMemberDedication(member.allocationPct, member.monthlyHours)}</Typography>
                  </Box>
                </Stack>

                {member.allocationPct !== null ? (
                  <Box>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                      <Typography variant='body2' color='text.secondary'>
                        {member.name}
                      </Typography>
                      <Typography variant='body2' color='text.primary'>
                        {memberUtilization}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      color={memberUtilization >= 85 ? 'warning' : 'info'}
                      variant='determinate'
                      value={memberUtilization}
                      sx={{ height: 8, borderRadius: 999 }}
                    />
                  </Box>
                ) : null}
              </Box>
            )
          })}
        </Stack>

        {hasCapacity ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
              backgroundColor: 'background.default',
              display: 'grid',
              gap: 2.5,
              alignContent: 'start'
            }}
          >
            <Box>
              <Typography variant='h6'>{GH_TEAM.label_contracted}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {formatFte(utilizedHours)} de {formatFte(totalMonthlyHours)} contratados
              </Typography>
            </Box>

            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                <Typography variant='body2' color='text.secondary'>
                  {GH_TEAM.label_utilization}
                </Typography>
                <Typography variant='body2' color='text.primary'>
                  {utilizationPct}%
                </Typography>
              </Stack>
              <LinearProgress color={capacityTone} variant='determinate' value={utilizationPct} sx={{ height: 10, borderRadius: 999 }} />
            </Box>

            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant='caption' color='text.secondary'>
                {GH_TEAM.label_hours}
              </Typography>
              <Typography variant='body2'>
                {formatHours(utilizedHours)} de {formatHours(totalMonthlyHours)} mensuales utilizadas.
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {GH_MESSAGES.tooltip_utilization}
              </Typography>
            </Box>

            {utilizationPct >= 85 ? (
              <Box
                sx={theme => ({
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: theme.palette.warning.lighterOpacity,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.24)}`,
                  display: 'grid',
                  gap: 1.5
                })}
              >
                <Typography variant='subtitle2' sx={{ color: GH_COLORS.role.media.textDark }}>
                  {GH_TEAM.cta_title.replace('{percent}', String(utilizationPct))}
                </Typography>
                <Typography variant='body2' sx={{ color: theme => theme.palette.warning.main }}>
                  {GH_TEAM.cta_subtitle}
                </Typography>
                <ButtonBase
                  onClick={() => onRequest('ampliar capacidad')}
                  sx={theme => ({
                    justifyContent: 'center',
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.warning.main}`,
                    color: theme.palette.warning.main,
                    fontWeight: 600
                  })}
                >
                  {GH_TEAM.cta_button}
                </ButtonBase>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </ExecutiveCardShell>
  )
}

export default ClientTeamCapacitySection
