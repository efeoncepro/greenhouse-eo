'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import type { HrOnboardingInstance, HrOnboardingInstanceItem } from '@/types/hr-onboarding'

type InstancesResponse = { instances: HrOnboardingInstance[] }

const cardBorderSx = { border: (theme: Theme) => `1px solid ${theme.palette.divider}` }

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Listo',
  skipped: 'Omitido',
  blocked: 'Bloqueado'
}

const statusColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  in_progress: 'info',
  done: 'success',
  skipped: 'default',
  blocked: 'error'
}

const laneLabel: Record<string, string> = {
  onboarding: 'Onboarding',
  offboarding: 'Offboarding operativo'
}

const today = () => new Date().toISOString().slice(0, 10)

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin vencimiento'

  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
}

const isClosed = (item: HrOnboardingInstanceItem) => item.status === 'done' || item.status === 'skipped'
const isOverdue = (item: HrOnboardingInstanceItem) => !isClosed(item) && Boolean(item.dueDate && item.dueDate < today())

const MyOnboardingView = () => {
  const [instances, setInstances] = useState<HrOnboardingInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/my/onboarding')

      if (!res.ok) throw new Error('No se pudieron cargar tus tareas de lifecycle.')

      const payload = await res.json() as InstancesResponse

      setInstances(payload.instances)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando tareas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const assignedTasks = useMemo(
    () => instances.flatMap(instance => instance.items.filter(item => item.assignedRole === 'collaborator').map(item => ({ instance, item }))),
    [instances]
  )

  const openTasks = assignedTasks.filter(({ item }) => !isClosed(item))
  const blockedTasks = assignedTasks.filter(({ item }) => item.status === 'blocked')
  const overdueTasks = assignedTasks.filter(({ item }) => isOverdue(item))
  const completedTasks = assignedTasks.filter(({ item }) => isClosed(item))
  const nextTask = openTasks.find(({ item }) => item.status !== 'blocked') ?? openTasks[0] ?? null

  const completeItem = async (instanceId: string, itemId: string) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/my/onboarding/instances/${instanceId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo actualizar la tarea.')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando tarea.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={180} />
        <Skeleton variant='rounded' height={260} />
      </Stack>
    )
  }

  return (
    <Stack spacing={6}>
      <Card elevation={0} sx={cardBorderSx}>
        <CardContent>
          <Grid container spacing={5} alignItems='center'>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant='overline' color='primary.main'>My Onboarding</Typography>
              <Typography variant='h4' sx={{ mt: 1 }}>Tus tareas de lifecycle</Typography>
              <Typography color='text.secondary' sx={{ mt: 2, maxWidth: 720 }}>
                Completa solo las tareas asignadas a ti. Si una salida aparece aquí, es una tarea operativa: el caso formal sigue en RRHH.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2}>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2' color='text.secondary'>Progreso personal</Typography>
                  <Typography variant='body2' fontWeight={700}>{completedTasks.length}/{assignedTasks.length}</Typography>
                </Stack>
                <LinearProgress
                  variant='determinate'
                  value={assignedTasks.length ? Math.round((completedTasks.length / assignedTasks.length) * 100) : 0}
                  sx={{ blockSize: 10, borderRadius: 99 }}
                />
                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                  <CustomChip round='true' size='small' variant='tonal' color={openTasks.length > 0 ? 'warning' : 'success'} label={`${openTasks.length} pendiente${openTasks.length === 1 ? '' : 's'}`} />
                  <CustomChip round='true' size='small' variant='tonal' color={blockedTasks.length > 0 ? 'error' : 'default'} label={`${blockedTasks.length} bloqueada${blockedTasks.length === 1 ? '' : 's'}`} />
                  <CustomChip round='true' size='small' variant='tonal' color={overdueTasks.length > 0 ? 'warning' : 'default'} label={`${overdueTasks.length} vencida${overdueTasks.length === 1 ? '' : 's'}`} />
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error ? <Alert severity='error' onClose={() => setError(null)}>{error}</Alert> : null}

      {instances.length === 0 ? (
        <Card elevation={0} sx={cardBorderSx}>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Stack spacing={2} alignItems='center'>
              <Box sx={{ fontSize: 44, color: 'text.disabled' }}><i className='tabler-circle-check' /></Box>
              <Typography variant='h6'>No tienes tareas activas</Typography>
              <Typography color='text.secondary' sx={{ maxWidth: 520 }}>
                Cuando RRHH active un checklist de ingreso o una tarea operativa de salida, aparecerá aquí con vencimiento y estado.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card elevation={0} sx={cardBorderSx}>
              <CardHeader title='Próxima acción' subheader='La tarea más útil para avanzar ahora.' />
              <Divider />
              <CardContent>
                {nextTask ? (
                  <Stack spacing={3}>
                    <Stack direction='row' justifyContent='space-between' spacing={3}>
                      <Box>
                        <Typography variant='h6'>{nextTask.item.title}</Typography>
                        <Typography variant='body2' color='text.secondary'>{nextTask.instance.templateName}</Typography>
                      </Box>
                      <CustomChip round='true' size='small' variant='tonal' color={nextTask.instance.type === 'offboarding' ? 'warning' : 'primary'} label={laneLabel[nextTask.instance.type]} />
                    </Stack>
                    <Alert severity={nextTask.item.status === 'blocked' ? 'error' : isOverdue(nextTask.item) ? 'warning' : 'info'}>
                      {nextTask.item.status === 'blocked'
                        ? 'Esta tarea está bloqueada. Revisa el detalle o pide ayuda a RRHH antes de marcarla lista.'
                        : isOverdue(nextTask.item)
                          ? `Venció el ${formatDate(nextTask.item.dueDate)}. Complétala o avisa a RRHH si falta información.`
                          : `Vence ${formatDate(nextTask.item.dueDate)}.`}
                    </Alert>
                    {nextTask.item.description && <Typography color='text.secondary'>{nextTask.item.description}</Typography>}
                    <Button
                      variant='contained'
                      disabled={saving || nextTask.item.status === 'blocked'}
                      onClick={() => completeItem(nextTask.instance.instanceId, nextTask.item.instanceItemId)}
                    >
                      Marcar tarea lista
                    </Button>
                  </Stack>
                ) : (
                  <Alert severity='success'>Tus tareas asignadas están completas u omitidas.</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 7 }}>
            <Stack spacing={4}>
              {instances.map(instance => {
                const collaboratorItems = instance.items.filter(item => item.assignedRole === 'collaborator')

                return (
                  <Card key={instance.instanceId} elevation={0} sx={cardBorderSx}>
                    <CardHeader
                      title={instance.templateName || laneLabel[instance.type]}
                      subheader={`${instance.progress.completed}/${instance.progress.total} tareas del checklist completo`}
                      action={<CustomChip round='true' size='small' variant='tonal' color={instance.type === 'offboarding' ? 'warning' : 'primary'} label={laneLabel[instance.type]} />}
                    />
                    <Divider />
                    <CardContent>
                      <Stack spacing={4}>
                        <LinearProgress variant='determinate' value={instance.progress.percent} sx={{ blockSize: 8, borderRadius: 99 }} />
                        {collaboratorItems.length === 0 ? (
                          <Alert severity='info'>Este checklist no tiene tareas asignadas directamente a ti.</Alert>
                        ) : collaboratorItems.map(item => (
                          <Box key={item.instanceItemId} sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 3 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
                              <Box>
                                <Typography fontWeight={600}>{item.title}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  {statusLabel[item.status] || item.status} · {formatDate(item.dueDate)}
                                </Typography>
                              </Box>
                              <Stack direction='row' spacing={1.5} alignItems='center'>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  variant='tonal'
                                  color={isOverdue(item) ? 'warning' : statusColor[item.status] || 'default'}
                                  label={isOverdue(item) ? 'Vencida' : statusLabel[item.status] || item.status}
                                />
                                {!isClosed(item) ? (
                                  <Button
                                    variant='tonal'
                                    size='small'
                                    disabled={saving || item.status === 'blocked'}
                                    onClick={() => completeItem(instance.instanceId, item.instanceItemId)}
                                  >
                                    Marcar lista
                                  </Button>
                                ) : null}
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          </Grid>
        </Grid>
      )}
    </Stack>
  )
}

export default MyOnboardingView
