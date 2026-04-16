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

import { formatMoney, titleize } from '../shared'

type Props = {
  detail: Space360Detail
}

const stageColor = (value: string) => {
  if (value === 'active') return 'success'
  if (value === 'onboarding') return 'info'
  if (value === 'renewal_pending') return 'warning'
  if (value === 'renewed') return 'primary'

  return 'secondary'
}

const slaStatusLabel = (value?: string) => {
  if (!value) return 'Sin lectura'

  const labels: Record<string, string> = {
    healthy: 'Cumple',
    at_risk: 'En riesgo',
    breached: 'Incumplido',
    partial: 'Datos parciales',
    no_sla_defined: 'Sin SLA'
  }

  return labels[value] ?? value
}

const slaStatusColor = (value?: string): 'success' | 'warning' | 'error' | 'info' | 'secondary' => {
  if (value === 'healthy') return 'success'
  if (value === 'at_risk') return 'warning'
  if (value === 'breached') return 'error'
  if (value === 'partial') return 'info'
  if (value === 'no_sla_defined') return 'secondary'

  return 'info'
}

const ServicesTab = ({ detail }: Props) => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardHeader
          title='Servicios contratados'
          subheader='Contrato actual por servicio y estado del pipeline comercial.'
          action={
            <Button component={Link} href='/agency/services' variant='outlined' size='small'>
              Abrir servicios
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Servicios activos</Typography>
              <Typography variant='h5'>{detail.kpis.activeServices}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Costo contractual</Typography>
              <Typography variant='h5'>{formatMoney(detail.services.totalCostClp)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Mix de etapas</Typography>
              <Typography variant='body2'>
                {Object.entries(detail.services.stageMix).length === 0
                  ? '—'
                  : Object.entries(detail.services.stageMix).map(([stage, count]) => `${titleize(stage)} ${count}`).join(' · ')}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardHeader title='Detalle de servicios' subheader='Costo, lifecycle y estado actual de cada servicio contratado.' />
        <CardContent>
          {detail.services.items.length === 0 ? (
            <EmptyState
              icon='tabler-briefcase-off'
              title='Sin servicios registrados'
              description='No hay servicios activos vinculados al Space canónico actual.'
              action={<Button component={Link} href='/agency/services' variant='contained'>Ir a servicios</Button>}
            />
          ) : (
            <Stack spacing={3}>
              {detail.services.items.map(service => (
                <Card key={service.serviceId} variant='outlined'>
                  <CardContent sx={{ display: 'grid', gap: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' gap={2}>
                      <div>
                        <Typography
                          variant='h6'
                          component={Link}
                          href={`/agency/services/${service.serviceId}`}
                          sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {service.name}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {titleize(service.lineaDeServicio)} · {titleize(service.servicioEspecifico)}
                        </Typography>
                      </div>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        <CustomChip round='true' size='small' color={stageColor(service.pipelineStage)} variant='tonal' label={titleize(service.pipelineStage)} />
                        <CustomChip round='true' size='small' color='secondary' variant='tonal' label={service.billingFrequency || 'Sin frecuencia'} />
                        <CustomChip
                          round='true'
                          size='small'
                          color={slaStatusColor(service.slaOverallStatus)}
                          variant='tonal'
                          label={`SLA ${slaStatusLabel(service.slaOverallStatus)}`}
                        />
                      </Stack>
                    </Stack>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant='caption' color='text.secondary'>Costo total</Typography>
                        <Typography variant='body2'>{formatMoney(service.totalCost, service.currency)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant='caption' color='text.secondary'>Monto pagado</Typography>
                        <Typography variant='body2'>{formatMoney(service.amountPaid, service.currency)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant='caption' color='text.secondary'>Inicio</Typography>
                        <Typography variant='body2'>{service.startDate || '—'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant='caption' color='text.secondary'>Fin objetivo</Typography>
                        <Typography variant='body2'>{service.targetEndDate || '—'}</Typography>
                      </Grid>
                    </Grid>
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

export default ServicesTab
