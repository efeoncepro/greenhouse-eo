'use client'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { Space360Detail } from '@/lib/agency/space-360'
import { EmptyState } from '@/components/greenhouse'

type Props = {
  detail: Space360Detail
}

const capacityColor = (value: string) => {
  if (value === 'optimal') return 'success'
  if (value === 'attention') return 'warning'

  return 'error'
}

const TeamTab = ({ detail }: Props) => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardHeader
          title='Capacidad y staffing'
          subheader='Assignments activos, uso operativo y exposición Staff Aug / providers.'
          action={
            <Button component={Link} href='/agency/team' variant='outlined' size='small'>
              Abrir equipo
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Personas asignadas</Typography>
              <Typography variant='h5'>{detail.team.summary.assignedMembers}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>FTE asignado</Typography>
              <Typography variant='h5'>{detail.team.summary.allocatedFte.toFixed(1)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Uso promedio</Typography>
              <Typography variant='h5'>{detail.team.summary.avgUsagePct != null ? `${detail.team.summary.avgUsagePct}%` : '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Costo loaded</Typography>
              <Typography variant='h5'>{new Intl.NumberFormat('es-CL').format(detail.team.summary.totalLoadedCostClp)}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardHeader title='Assignments del Space' subheader='Se muestra el assignment comercial actual por persona.' />
        <CardContent>
          {detail.team.members.length === 0 ? (
            <EmptyState
              icon='tabler-users-off'
              title='Sin assignments activos'
              description='Este Space todavía no tiene personas asignadas en el runtime canónico de equipo.'
              action={<Button component={Link} href='/agency/team' variant='contained'>Ir a equipo</Button>}
            />
          ) : (
            <Stack spacing={3}>
              {detail.team.members.map(member => (
                <Card key={member.assignmentId} variant='outlined'>
                  <CardContent sx={{ display: 'grid', gap: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' gap={2}>
                      <div>
                        <Typography variant='h6'>{member.displayName}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {member.roleTitle || 'Rol no informado'} · {member.fteAllocation.toFixed(2)} FTE
                        </Typography>
                      </div>
                      <Stack direction='row' flexWrap='wrap' gap={1}>
                        <CustomChip round='true' size='small' color={capacityColor(member.capacityHealth)} variant='tonal' label={member.capacityHealth === 'optimal' ? 'Óptimo' : member.capacityHealth === 'attention' ? 'Atención' : 'Crítico'} />
                        {member.assignmentType ? (
                          <CustomChip round='true' size='small' color='secondary' variant='tonal' label={member.assignmentType.replace(/_/g, ' ')} />
                        ) : null}
                        {member.placementId ? (
                          <CustomChip round='true' size='small' color='info' variant='tonal' label={`Staff Aug · ${member.placementStatus || 'activo'}`} />
                        ) : null}
                      </Stack>
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant='caption' color='text.secondary'>Horas contratadas</Typography>
                        <Typography variant='body2'>{member.contractedHoursMonth}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant='caption' color='text.secondary'>Uso operativo</Typography>
                        <Typography variant='body2'>{member.usagePercent != null ? `${member.usagePercent}%` : '—'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant='caption' color='text.secondary'>Costo / hora</Typography>
                        <Typography variant='body2'>{member.costPerHourTarget != null ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: member.targetCurrency || 'CLP', maximumFractionDigits: 0 }).format(member.costPerHourTarget) : '—'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant='caption' color='text.secondary'>Placement / provider</Typography>
                        <Typography variant='body2'>{member.placementProviderName || 'Directo / sin provider'}</Typography>
                      </Grid>
                    </Grid>

                    {member.placementId ? (
                      <Stack direction='row' gap={2} flexWrap='wrap'>
                        <Button component={Link} href={`/agency/staff-augmentation/${member.placementId}`} size='small' variant='text'>
                          Abrir placement
                        </Button>
                        <Button component={Link} href='/hr/payroll' size='small' variant='text'>
                          Ver payroll
                        </Button>
                      </Stack>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

export default TeamTab
