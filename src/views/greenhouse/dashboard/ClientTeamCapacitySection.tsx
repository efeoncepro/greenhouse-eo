'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import { EmptyState, ExecutiveCardShell } from '@/components/greenhouse'
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

const ClientTeamCapacitySection = ({ data, onRequest }: ClientTeamCapacitySectionProps) => {
  const teamMembers = data.accountTeam.members
  const hasTeam = teamMembers.length > 0
  const totalMonthlyHours = data.accountTeam.totalMonthlyHours
  const hasCapacity = totalMonthlyHours > 0
  const utilizationPct = Math.max(0, Math.min(100, data.accountTeam.averageAllocationPct ?? 0))
  const utilizedHours = Math.round((totalMonthlyHours * utilizationPct) / 100)
  const capacityTone = utilizationPct > 95 ? 'error' : utilizationPct >= 80 ? 'warning' : 'success'

  if (!hasTeam) {
    return (
      <ExecutiveCardShell title={GH_TEAM.section_title} subtitle={GH_TEAM.section_subtitle}>
        <EmptyState icon='tabler-users-group' title={GH_TEAM.section_title} description={GH_MESSAGES.empty_team} minHeight={260} />
      </ExecutiveCardShell>
    )
  }

  return (
    <ExecutiveCardShell title={GH_TEAM.section_title} subtitle={GH_TEAM.section_subtitle}>
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
          {teamMembers.map(member => {
            const roleTone = GH_COLORS.role[getRoleTone(member.role)]

            return (
              <Box
                key={member.id}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: `1px solid ${GH_COLORS.neutral.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
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
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='h6'>{member.name}</Typography>
                  <Typography variant='body2' sx={{ color: roleTone.text }}>
                    {member.role}
                  </Typography>
                </Box>
              </Box>
            )
          })}

          <ButtonBase
            onClick={() => onRequest('ampliar equipo')}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px dashed ${GH_COLORS.semantic.warning.text}`,
              justifyContent: 'flex-start',
              transition: 'border-color 150ms ease, transform 150ms ease, background-color 150ms ease',
              '&:hover': {
                borderColor: GH_COLORS.semantic.warning.source,
                backgroundColor: GH_COLORS.semantic.warning.bg
              },
              '&:hover .ghost-slot-icon': {
                transform: 'scale(1.1)'
              }
            }}
            aria-label={GH_TEAM.expand_title}
          >
            <Stack direction='row' spacing={2} alignItems='center'>
              <Box
                className='ghost-slot-icon'
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  border: `1px dashed ${GH_COLORS.semantic.warning.text}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: GH_COLORS.semantic.warning.text,
                  transition: 'transform 150ms ease'
                }}
              >
                <i className='tabler-plus text-xl' />
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant='subtitle1' sx={{ color: GH_COLORS.semantic.warning.text }}>
                  {GH_TEAM.expand_title}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {GH_TEAM.expand_subtitle}
                </Typography>
              </Box>
            </Stack>
          </ButtonBase>
        </Stack>

        {hasCapacity ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${GH_COLORS.neutral.border}`,
              backgroundColor: GH_COLORS.neutral.bgSurface,
              display: 'grid',
              gap: 2.5,
              alignContent: 'start'
            }}
          >
            <Box>
              <Typography variant='h6'>{GH_TEAM.capacity_title}</Typography>
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

            <Typography variant='body2' color='text.secondary'>
              {formatHours(utilizedHours)} de {formatHours(totalMonthlyHours)} mensuales utilizadas.
            </Typography>

            <Typography variant='caption' color='text.secondary'>
              {GH_MESSAGES.tooltip_utilization}
            </Typography>

            {utilizationPct >= 85 ? (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: GH_COLORS.semantic.warning.bg,
                  border: `1px solid ${alpha(GH_COLORS.semantic.warning.source, 0.24)}`
                }}
              >
                <Typography variant='subtitle2' sx={{ color: GH_COLORS.role.media.textDark }}>
                  {GH_TEAM.cta_title.replace('{percent}', String(utilizationPct))}
                </Typography>
                <Typography variant='body2' sx={{ mt: 0.75, color: GH_COLORS.semantic.warning.text }}>
                  {GH_TEAM.cta_subtitle}
                </Typography>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </ExecutiveCardShell>
  )
}

export default ClientTeamCapacitySection
