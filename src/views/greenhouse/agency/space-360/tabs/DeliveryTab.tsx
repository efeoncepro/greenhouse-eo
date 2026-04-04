'use client'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { Space360Detail } from '@/lib/agency/space-360'
import { EmptyState } from '@/components/greenhouse'

import { formatPct, formatRatio } from '../shared'

type Props = {
  detail: Space360Detail
}

const DeliveryTab = ({ detail }: Props) => {
  const rpa = detail.delivery.snapshot?.metrics.find(metric => metric.metricId === 'rpa')?.value ?? null
  const otd = detail.delivery.snapshot?.metrics.find(metric => metric.metricId === 'otd_pct')?.value ?? null
  const throughput = detail.delivery.snapshot?.metrics.find(metric => metric.metricId === 'throughput')?.value ?? null

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardHeader
            title='Delivery e ICO'
            subheader='Métricas operativas, proyectos observados y activos atascados.'
            action={
              <Button component={Link} href='/agency/delivery' variant='outlined' size='small'>
                Abrir delivery
              </Button>
            }
          />
          <CardContent>
            {detail.delivery.snapshot ? (
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography variant='caption' color='text.secondary'>RpA</Typography>
                  <Typography variant='h5'>{formatRatio(rpa)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography variant='caption' color='text.secondary'>OTD</Typography>
                  <Typography variant='h5'>{formatPct(otd)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography variant='caption' color='text.secondary'>Throughput</Typography>
                  <Typography variant='h5'>{throughput != null ? Math.round(throughput) : '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography variant='caption' color='text.secondary'>Periodo</Typography>
                  <Typography variant='h5'>{`${detail.delivery.snapshot.periodYear}-${String(detail.delivery.snapshot.periodMonth).padStart(2, '0')}`}</Typography>
                </Grid>
              </Grid>
            ) : (
              <EmptyState
                icon='tabler-cpu-off'
                animatedIcon='/animations/empty-chart.json'
                title='Sin snapshot ICO'
                description='Todavía no existe una materialización reciente del engine para este Space.'
                action={<Button component={Link} href='/agency/delivery' variant='contained'>Ir a delivery</Button>}
                minHeight={180}
              />
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card variant='outlined'>
          <CardHeader title='Tendencia RpA' subheader='Últimos períodos observados en `rpa_trend`.' />
          <CardContent>
            {detail.delivery.trends.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>Sin tendencia histórica materializada.</Typography>
            ) : (
              <Stack spacing={2}>
                {detail.delivery.trends.map(item => (
                  <Stack key={item.periodId} direction='row' alignItems='center' justifyContent='space-between'>
                    <Typography variant='body2'>{item.periodId}</Typography>
                    <Typography variant='body2'>{formatRatio(item.rpaAvg)} · {item.tasksCompleted} tareas</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card variant='outlined'>
          <CardHeader title='Stuck assets' subheader='Activos que requieren atención inmediata.' />
          <CardContent>
            {detail.delivery.stuckAssets.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>Sin stuck assets abiertos.</Typography>
            ) : (
              <Stack spacing={2}>
                {detail.delivery.stuckAssets.map(asset => (
                  <Card key={asset.taskSourceId} variant='outlined'>
                    <CardContent sx={{ display: 'grid', gap: 1 }}>
                      <Typography variant='body2' fontWeight={600}>{asset.taskName}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {asset.faseCsc || 'Sin fase'} · {asset.daysSinceUpdate} días sin update · {asset.severity}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardHeader title='Proyectos del período' subheader='Lectura resumida desde `metrics_by_project`.' />
          <CardContent>
            {detail.delivery.projectMetrics.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>No encontramos proyectos materializados para el período activo.</Typography>
            ) : (
              <Stack spacing={2}>
                {detail.delivery.projectMetrics.map(project => (
                  <Stack key={project.projectSourceId} direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' gap={2}>
                    <Typography variant='body2' fontWeight={600}>{project.projectSourceId}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {project.context.completedTasks}/{project.context.totalTasks} tareas completadas · RpA {formatRatio(project.metrics.find(metric => metric.metricId === 'rpa')?.value ?? null)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default DeliveryTab
