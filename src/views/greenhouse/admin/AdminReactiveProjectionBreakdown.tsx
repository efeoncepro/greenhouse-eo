'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'
import type { ReactiveProjectionBreakdown } from '@/lib/operations/get-reactive-projection-breakdown'

const TASK407_ARIA_DETALLE_DE_PROYECCIONES_REACTIVAS_POR_HANDLER = "Detalle de proyecciones reactivas por handler"


type Props = {
  breakdown: ReactiveProjectionBreakdown | null
}

type CircuitChipTone = 'success' | 'warning' | 'error'

const circuitStateLabel: Record<'closed' | 'half_open' | 'open', string> = {
  closed: 'Cerrado',
  half_open: 'En prueba',
  open: 'Abierto'
}

const circuitStateTone: Record<'closed' | 'half_open' | 'open', CircuitChipTone> = {
  closed: 'success',
  half_open: 'warning',
  open: 'error'
}

const formatPercentage = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0%'

  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin registro'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago'
  }).format(new Date(value))
}

const AdminReactiveProjectionBreakdown = ({ breakdown }: Props) => {
  const theme = useTheme()

  if (!breakdown) {
    return (
      <ExecutiveCardShell
        title='Proyecciones reactivas por handler'
        subtitle='No pudimos leer el desglose por proyeccion en esta consulta. Revisa la conexion a Postgres y vuelve a intentarlo.'
      >
        <Typography variant='body2' color='text.secondary'>
          Sin datos disponibles actualmente.
        </Typography>
      </ExecutiveCardShell>
    )
  }

  const { projections, circuitSummary } = breakdown
  const totalProjections = projections.length
  const projectionsWithErrors = projections.filter(row => row.errorRate > 0).length
  const quarantined = circuitSummary.open + circuitSummary.halfOpen

  return (
    <ExecutiveCardShell
      title='Proyecciones reactivas por handler'
      subtitle='Detalle por proyeccion: eventos coaleados, tasa de error y estado del circuit breaker. Ultimas 24 horas.'
    >
      <Stack spacing={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
          }}
        >
          <ExecutiveMiniStatCard
            eyebrow='Registro'
            tone='info'
            title='Proyecciones registradas'
            value={String(totalProjections)}
            detail='Handlers activos en el registry del consumer V2.'
            icon='tabler-target'
          />
          <ExecutiveMiniStatCard
            eyebrow='Breaker'
            tone={circuitSummary.open > 0 ? 'error' : circuitSummary.halfOpen > 0 ? 'warning' : 'success'}
            title='En cuarentena'
            value={String(quarantined)}
            detail={
              quarantined > 0
                ? `${circuitSummary.open} abiertas y ${circuitSummary.halfOpen} en prueba.`
                : 'Sin proyecciones en cuarentena.'
            }
            icon='tabler-shield-lock'
          />
          <ExecutiveMiniStatCard
            eyebrow='Errores'
            tone={projectionsWithErrors > 0 ? 'warning' : 'success'}
            title='Con errores recientes'
            value={String(projectionsWithErrors)}
            detail={
              projectionsWithErrors > 0
                ? 'Hay proyecciones con tasa de error > 0% en las ultimas 24 horas.'
                : 'Ninguna proyeccion registro errores recientes.'
            }
            icon='tabler-alert-triangle'
          />
          <ExecutiveMiniStatCard
            eyebrow='Cerradas'
            tone='success'
            title='Circuit cerrado'
            value={String(circuitSummary.closed)}
            detail='Proyecciones procesando normalmente sin bloqueo.'
            icon='tabler-check'
          />
        </Box>

        <Card variant='outlined'>
          <CardContent>
            <TableContainer>
              <Table size='small' aria-label={TASK407_ARIA_DETALLE_DE_PROYECCIONES_REACTIVAS_POR_HANDLER}>
                <TableHead>
                  <TableRow>
                    <TableCell scope='col'>Proyeccion</TableCell>
                    <TableCell scope='col'>Dominio</TableCell>
                    <TableCell scope='col' align='right'>
                      Eventos coaleados
                    </TableCell>
                    <TableCell scope='col' align='right'>
                      Refrescos exitosos
                    </TableCell>
                    <TableCell scope='col' align='right'>
                      Refrescos fallidos
                    </TableCell>
                    <TableCell scope='col' align='right'>
                      Tasa de error
                    </TableCell>
                    <TableCell scope='col'>Estado breaker</TableCell>
                    <TableCell scope='col'>Ultimo refresco</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align='center'>
                        <Typography variant='body2' color='text.secondary'>
                          Aun no hay proyecciones registradas en el consumer reactivo.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    projections.map(row => {
                      const tone = circuitStateTone[row.circuitState]
                      const palette = theme.palette[tone]

                      return (
                        <TableRow key={row.name} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                {row.name}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {row.description}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip size='small' variant='outlined' label={row.domain} />
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {row.scopesCoalescedLast24h}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography
                              variant='body2'
                              sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.main' }}
                            >
                              {row.successful}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography
                              variant='body2'
                              sx={{
                                fontVariantNumeric: 'tabular-nums',
                                color: row.failures > 0 ? 'error.main' : 'text.primary'
                              }}
                            >
                              {row.failures}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography
                              variant='body2'
                              sx={{
                                fontVariantNumeric: 'tabular-nums',
                                color: row.errorRate > 0 ? 'warning.main' : 'text.secondary'
                              }}
                            >
                              {formatPercentage(row.errorRate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              variant='tonal'
                              color={tone}
                              icon={
                                <Box
                                  aria-hidden='true'
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: palette.main,
                                    marginLeft: 1
                                  }}
                                />
                              }
                              label={circuitStateLabel[row.circuitState]}
                              aria-label={`Estado del circuit breaker: ${circuitStateLabel[row.circuitState]}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='caption' color='text.secondary'>
                              {formatDateTime(row.lastReactedAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Stack>
    </ExecutiveCardShell>
  )
}

export default AdminReactiveProjectionBreakdown
