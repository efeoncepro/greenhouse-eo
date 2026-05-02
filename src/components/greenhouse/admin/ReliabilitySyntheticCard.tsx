'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell } from '@/components/greenhouse'
import type { SyntheticRouteSnapshot } from '@/types/reliability-synthetic'

interface SweepInfo {
  startedAt: string
  finishedAt: string | null
  status: string
  notes: string | null
}

interface Props {
  snapshots: SyntheticRouteSnapshot[]
  sweep: SweepInfo | null
}

const statusChipColor = (
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  if (status === 'succeeded') return 'success'
  if (status === 'partial') return 'warning'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'info'
  if (status === 'cancelled') return 'default'

  return 'default'
}

const formatTimestamp = (iso: string | null): string => {
  if (!iso) return 'sin dato'

  return iso.slice(0, 16).replace('T', ' ')
}

const formatAge = (iso: string | null): string => {
  if (!iso) return ''

  const elapsed = Date.now() - Date.parse(iso)

  if (!Number.isFinite(elapsed) || elapsed < 0) return ''

  const minutes = Math.round(elapsed / 60_000)

  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.round(minutes / 60)

  if (hours < 24) return `hace ${hours} h`

  const days = Math.round(hours / 24)

  return `hace ${days} día${days === 1 ? '' : 's'}`
}

const probeChipColor = (
  ok: boolean,
  httpStatus: number
): 'success' | 'warning' | 'error' | 'default' => {
  if (ok) return 'success'

  if (httpStatus === 0) return 'error'
  if (httpStatus >= 500) return 'error'
  if (httpStatus >= 400) return 'warning'

  return 'warning'
}

const ReliabilitySyntheticCard = ({ snapshots, sweep }: Props) => {
  const failingProbes = snapshots.filter(snapshot => !snapshot.lastProbe.ok)
  const okCount = snapshots.length - failingProbes.length
  const sweepStatus = sweep?.status ?? 'awaiting'

  return (
    <ExecutiveCardShell
      title='Synthetic monitor de rutas críticas'
      subtitle='Cron cada 30 min ejecuta GET autenticado contra cada ruta declarada en el registry. Detecta regresiones silenciosas entre runs de Playwright.'
      action={
        sweep ? (
          <Chip
            size='small'
            color={statusChipColor(sweepStatus)}
            label={
              sweepStatus === 'succeeded'
                ? 'Última corrida sana'
                : sweepStatus === 'partial'
                  ? 'Última corrida parcial'
                  : sweepStatus === 'failed'
                    ? 'Última corrida con fallas'
                    : sweepStatus === 'cancelled'
                      ? 'Sweep cancelado'
                      : sweepStatus === 'running'
                        ? 'Sweep en curso'
                        : 'Sin estado'
            }
          />
        ) : (
          <Chip size='small' color='info' variant='outlined' label='Esperando primera corrida' />
        )
      }
    >
      {snapshots.length === 0 ? (
        <Card variant='outlined'>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography variant='subtitle2'>Aún no hay corridas persistidas.</Typography>
              <Typography variant='body2' color='text.secondary'>
                {sweep?.notes ?? 'El cron disparará en el próximo ciclo programado (cada 30 min).'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Para correr una vez ahora: <code>POST /api/cron/reliability-synthetic</code> con{' '}
                <code>Authorization: Bearer $CRON_SECRET</code>.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent='space-between'
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <Chip size='small' color='success' variant='tonal' label={`${okCount} ok`} />
              <Chip
                size='small'
                color='error'
                variant='tonal'
                label={`${failingProbes.length} con falla`}
              />
              <Chip size='small' variant='outlined' label={`${snapshots.length} rutas monitoreadas`} />
            </Stack>
            {sweep && (
              <Typography variant='caption' color='text.secondary'>
                Última corrida: {formatTimestamp(sweep.finishedAt ?? sweep.startedAt)}
                {sweep.finishedAt ? ` (${formatAge(sweep.finishedAt)})` : ' (en curso)'}
              </Typography>
            )}
          </Stack>

          {failingProbes.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant='overline' color='text.secondary'>
                Rutas en error
              </Typography>
              <Stack spacing={1}>
                {failingProbes.map(snapshot => (
                  <Card
                    key={`${snapshot.moduleKey}::${snapshot.routePath}`}
                    variant='outlined'
                    sx={{ borderLeft: '4px solid', borderLeftColor: 'error.main' }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent='space-between'
                      >
                        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                          <Stack direction='row' spacing={1} alignItems='center'>
                            <Chip
                              size='small'
                              color={probeChipColor(snapshot.lastProbe.ok, snapshot.lastProbe.httpStatus)}
                              label={
                                snapshot.lastProbe.httpStatus === 0
                                  ? 'network'
                                  : `HTTP ${snapshot.lastProbe.httpStatus}`
                              }
                            />
                            <Typography variant='caption' color='text.secondary'>
                              {snapshot.moduleKey}
                            </Typography>
                          </Stack>
                          <Typography variant='body2' noWrap>
                            {snapshot.routePath}
                          </Typography>
                          {snapshot.lastProbe.errorMessage && (
                            <Typography variant='caption' color='text.secondary'>
                              {snapshot.lastProbe.errorMessage}
                            </Typography>
                          )}
                        </Stack>
                        <Typography variant='caption' color='text.secondary'>
                          {snapshot.lastProbe.latencyMs} ms · {formatAge(snapshot.lastProbe.finishedAt)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Stack>
          )}

          {failingProbes.length === 0 && (
            <Typography variant='body2' color='text.secondary'>
              Todas las rutas críticas respondieron en la última corrida.
            </Typography>
          )}
        </Stack>
      )}
    </ExecutiveCardShell>
  )
}

export default ReliabilitySyntheticCard
