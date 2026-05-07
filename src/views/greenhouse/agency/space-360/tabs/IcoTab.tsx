'use client'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { Space360Detail } from '@/lib/agency/space-360'
import { EmptyState } from '@/components/greenhouse'

import { formatPct, formatRatio } from '../shared'
import { formatDateTime as formatGreenhouseDateTime } from '@/lib/format'

type Props = {
  detail: Space360Detail
}

const IcoTab = ({ detail }: Props) => {
  const snapshot = detail.delivery.snapshot

  if (!snapshot) {
    return (
      <EmptyState
        icon='tabler-cpu-off'
        animatedIcon='/animations/empty-chart.json'
        title='Sin detalle ICO'
        description='La capa ICO todavía no tiene snapshot reciente para este Space.'
        action={<Button component={Link} href='/agency?tab=ico' variant='contained'>Abrir ICO Engine</Button>}
      />
    )
  }

  const metric = (metricId: string) => snapshot.metrics.find(item => item.metricId === metricId)?.value ?? null

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardHeader
            title='ICO snapshot'
            subheader={`Fuente ${snapshot.source} · ${snapshot.periodYear}-${String(snapshot.periodMonth).padStart(2, '0')}`}
            action={
              <Button component={Link} href='/agency?tab=ico' variant='outlined' size='small'>
                Abrir ICO Engine
              </Button>
            }
          />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>RpA</Typography>
                <Typography variant='h5'>{formatRatio(metric('rpa'))}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>OTD</Typography>
                <Typography variant='h5'>{formatPct(metric('otd_pct'))}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>FTR</Typography>
                <Typography variant='h5'>{formatPct(metric('ftr_pct'))}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Throughput</Typography>
                <Typography variant='h5'>{metric('throughput') != null ? Math.round(metric('throughput') || 0) : '—'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant='outlined'>
          <CardHeader title='Pipeline CSC' subheader='Distribución activa del trabajo observada por el engine.' />
          <CardContent sx={{ display: 'grid', gap: 2 }}>
            {snapshot.cscDistribution.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>Sin distribución CSC disponible.</Typography>
            ) : (
              snapshot.cscDistribution.map(item => (
                <Typography key={item.phase} variant='body2'>
                  <strong>{item.label}:</strong> {item.count} · {item.pct}%
                </Typography>
              ))
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant='outlined'>
          <CardHeader title='Contexto' subheader='Tareas observadas por la materialización actual.' />
          <CardContent sx={{ display: 'grid', gap: 2 }}>
            <Typography variant='body2'><strong>Total:</strong> {snapshot.context.totalTasks}</Typography>
            <Typography variant='body2'><strong>Completadas:</strong> {snapshot.context.completedTasks}</Typography>
            <Typography variant='body2'><strong>Activas:</strong> {snapshot.context.activeTasks}</Typography>
            <Typography variant='body2'><strong>On-Time:</strong> {snapshot.context.onTimeTasks}</Typography>
            <Typography variant='body2'><strong>Late Drops:</strong> {snapshot.context.lateDropTasks}</Typography>
            <Typography variant='body2'><strong>Overdue:</strong> {snapshot.context.overdueTasks}</Typography>
            <Typography variant='body2'><strong>Carry-Over:</strong> {snapshot.context.carryOverTasks}</Typography>
            <Typography variant='body2'><strong>Overdue Carried Forward:</strong> {snapshot.context.overdueCarriedForwardTasks}</Typography>
            <Typography variant='caption' color='text.secondary'>
              Engine {snapshot.engineVersion} · calculado {snapshot.computedAt ? formatGreenhouseDateTime(snapshot.computedAt, 'es-CL') : 'sin fecha'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default IcoTab
