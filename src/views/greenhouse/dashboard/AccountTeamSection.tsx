'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { MetricList, SectionHeading } from '@/components/greenhouse'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

type AccountTeamSectionProps = {
  data: GreenhouseDashboardData
}

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')

const AccountTeamSection = ({ data }: AccountTeamSectionProps) => {
  const assignedPeopleCount = data.accountTeam.members.length

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.2fr 1fr' } }}>
      <Card>
        <CardContent sx={{ height: '100%' }}>
          <Stack spacing={3}>
            <SectionHeading
              title='Capacity y equipo asignado'
              description='La cuenta mezcla senales derivadas desde Notion con overrides controlados para allocation y horas mensuales.'
            />
            <Stack spacing={2}>
              {data.accountTeam.members.map(member => (
                <Box
                  key={member.id}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    flexDirection: { xs: 'column', md: 'row' }
                  }}
                >
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <Avatar>{getInitials(member.name)}</Avatar>
                    <Stack spacing={0.5}>
                      <Typography variant='h6'>{member.name}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {member.role}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Stack direction='row' flexWrap='wrap' gap={1.5}>
                    <Chip
                      variant='tonal'
                      color={member.allocationPct !== null && member.allocationPct >= 100 ? 'success' : 'info'}
                      label={member.allocationPct !== null ? `${member.allocationPct}% asignacion` : 'Asignacion pendiente'}
                    />
                    <Chip
                      variant='tonal'
                      color='primary'
                      label={member.monthlyHours !== null ? `${member.monthlyHours} h/mes` : 'Horas pendientes'}
                    />
                    <Chip
                      variant='outlined'
                      color={member.source === 'override' ? 'warning' : 'info'}
                      label={member.source === 'override' ? 'Override controlado' : 'Detectado desde Notion'}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ height: '100%' }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            <SectionHeading
              title='Lectura de capacity'
              description='Es una capa inicial reusable para clientes con staff asignado por cuenta o modulo.'
            />
            <MetricList
              items={[
                {
                  label: 'Personas asignadas',
                  value: String(assignedPeopleCount),
                  detail: 'Cuenta de miembros visibles para la cuenta en el dashboard.'
                },
                {
                  label: 'Horas mensuales',
                  value: String(data.accountTeam.totalMonthlyHours),
                  detail: 'Suma de capacidad mensual visible sobre la cuenta.'
                },
                {
                  label: 'Asignacion promedio',
                  value:
                    data.accountTeam.averageAllocationPct !== null
                      ? `${data.accountTeam.averageAllocationPct}%`
                      : 'Pendiente',
                  detail: 'Promedio simple de allocation para la cuenta visible.'
                }
              ]}
            />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AccountTeamSection
