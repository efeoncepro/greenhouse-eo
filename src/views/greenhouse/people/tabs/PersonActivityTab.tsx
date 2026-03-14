'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { PersonOperationalMetrics } from '@/types/people'

type Props = {
  metrics?: PersonOperationalMetrics | null
}

const semaphoreRpa = (rpa: number | null) => {
  if (rpa == null) return { label: 'Sin data', color: 'default' as const }
  if (rpa < 2.0) return { label: 'Óptimo', color: 'success' as const }

  return { label: 'Alto', color: 'warning' as const }
}

const semaphoreOtd = (pct: number | null) => {
  if (pct == null) return { label: 'Sin data', color: 'default' as const }
  if (pct >= 89) return { label: 'Cumple', color: 'success' as const }

  return { label: 'Bajo', color: 'warning' as const }
}

const PersonActivityTab = ({ metrics }: Props) => {
  if (!metrics) {
    return (
      <Card>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary'>
            No hay datos operativos. Verifica que el ID de Notion esté vinculado.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const rpaStatus = semaphoreRpa(metrics.rpaAvg30d)
  const otdStatus = semaphoreOtd(metrics.otdPercent30d)

  return (
    <Grid container spacing={6}>
      {/* KPI Cards */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <HorizontalWithSubtitle
          title='RpA promedio'
          stats={metrics.rpaAvg30d != null ? metrics.rpaAvg30d.toFixed(2) : '—'}
          avatarIcon='tabler-repeat'
          avatarColor={rpaStatus.color === 'success' ? 'success' : 'warning'}
          subtitle='Últimos 30 días'
          statusLabel={rpaStatus.label}
          statusColor={rpaStatus.color}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <HorizontalWithSubtitle
          title='Tasks completadas'
          stats={metrics.tasksCompleted30d.toLocaleString('es-CL')}
          avatarIcon='tabler-checkbox'
          avatarColor='primary'
          subtitle='Últimos 30 días'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <HorizontalWithSubtitle
          title='OTD%'
          stats={metrics.otdPercent30d != null ? `${metrics.otdPercent30d.toFixed(1)}%` : '—'}
          avatarIcon='tabler-clock-check'
          avatarColor={otdStatus.color === 'success' ? 'success' : 'warning'}
          subtitle='Últimos 30 días'
          statusLabel={otdStatus.label}
          statusColor={otdStatus.color}
        />
      </Grid>

      {/* Project breakdown */}
      {metrics.projectBreakdown.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title='Distribución por proyecto' subheader={`${metrics.tasksActiveNow} tareas activas`} />
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Proyecto</TableCell>
                      <TableCell align='right'>Assets</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.projectBreakdown.map((p, i) => (
                      <TableRow key={p.projectId ?? i} hover>
                        <TableCell>
                          <Typography variant='body2'>{p.projectName}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Chip size='small' label={p.assetCount} variant='tonal' color='primary' />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default PersonActivityTab
