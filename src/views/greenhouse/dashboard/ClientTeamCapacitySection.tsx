'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { EmptyState, ExecutiveCardShell } from '@/components/greenhouse'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import { formatFte, formatHours, formatTeamMemberInitials } from '@views/greenhouse/dashboard/helpers'

type ClientTeamCapacitySectionProps = {
  data: GreenhouseDashboardData
  onRequest: (intent: string) => void
}

const ClientTeamCapacitySection = ({ data, onRequest }: ClientTeamCapacitySectionProps) => {
  const theme = useTheme()
  const teamMembers = data.accountTeam.members
  const hasTeam = teamMembers.length > 0
  const totalMonthlyHours = data.accountTeam.totalMonthlyHours
  const hasCapacity = totalMonthlyHours > 0
  const utilizationPct = Math.max(0, Math.min(100, data.accountTeam.averageAllocationPct ?? 0))
  const utilizedHours = Math.round((totalMonthlyHours * utilizationPct) / 100)
  const capacityTone = utilizationPct > 95 ? 'error' : utilizationPct >= 80 ? 'warning' : 'success'

  if (!hasTeam) {
    return (
      <ExecutiveCardShell title='Tu equipo' subtitle='Las personas asignadas a tu cuenta'>
        <EmptyState
          icon='tabler-users-group'
          title='Tu equipo está en configuración'
          description='Pronto verás aquí a las personas asignadas a tu cuenta.'
          minHeight={260}
        />
      </ExecutiveCardShell>
    )
  }

  return (
    <ExecutiveCardShell title='Tu equipo' subtitle='Las personas asignadas a tu cuenta'>
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
          {teamMembers.map(member => (
            <Box
              key={member.id}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Avatar src={member.avatarPath || undefined} sx={{ width: 46, height: 46 }}>
                {formatTeamMemberInitials(member.name)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='h6'>{member.name}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {member.role}
                </Typography>
              </Box>
            </Box>
          ))}

          <ButtonBase
            onClick={() => onRequest('ampliar equipo')}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px dashed ${alpha(theme.palette.text.secondary, 0.4)}`,
              justifyContent: 'flex-start',
              transition: 'border-color 150ms ease, transform 150ms ease',
              '&:hover': {
                borderColor: alpha(theme.palette.text.secondary, 0.7)
              },
              '&:hover .ghost-slot-icon': {
                transform: 'scale(1.1)'
              }
            }}
            aria-label='Ampliar equipo'
          >
            <Stack direction='row' spacing={2} alignItems='center'>
              <Box
                className='ghost-slot-icon'
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  border: `1px dashed ${alpha(theme.palette.text.secondary, 0.5)}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                  transition: 'transform 150ms ease'
                }}
              >
                <i className='tabler-plus text-xl' />
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant='subtitle1' color='text.secondary'>
                  Ampliar equipo
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Agrega capacidad creativa, de medios o tecnología.
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
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.background.default, 0.42),
              display: 'grid',
              gap: 2.5,
              alignContent: 'start'
            }}
          >
            <Box>
              <Typography variant='h6'>Capacidad contratada</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {formatFte(utilizedHours)} de {formatFte(totalMonthlyHours)} contratados
              </Typography>
            </Box>

            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                <Typography variant='body2' color='text.secondary'>
                  Capacidad utilizada este mes
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
              Lectura visible del servicio según la capacidad configurada para la cuenta.
            </Typography>
          </Box>
        ) : null}
      </Box>
    </ExecutiveCardShell>
  )
}

export default ClientTeamCapacitySection
