'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { HrOnboardingInstance } from '@/types/hr-onboarding'

type InstancesResponse = { instances: HrOnboardingInstance[] }

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Listo',
  skipped: 'Omitido',
  blocked: 'Bloqueado'
}

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

      if (!res.ok) throw new Error('No se pudieron cargar tus tareas.')

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

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Mi onboarding</Typography>
        <Typography color='text.secondary'>Tareas asignadas a ti en checklists activos.</Typography>
      </Box>

      {error ? <Alert severity='error'>{error}</Alert> : null}

      {loading ? (
        <Skeleton height={180} />
      ) : instances.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color='text.secondary'>No tienes tareas activas.</Typography>
          </CardContent>
        </Card>
      ) : instances.map(instance => (
        <Card key={instance.instanceId}>
          <CardHeader
            title={instance.templateName || instance.type}
            subheader={`${instance.progress.completed}/${instance.progress.total} tareas listas`}
            action={<CustomChip round='true' size='small' variant='tonal' color='primary' label={`${instance.progress.percent}%`} />}
          />
          <CardContent>
            <Stack spacing={4}>
              <LinearProgress variant='determinate' value={instance.progress.percent} />
              {instance.items
                .filter(item => item.assignedRole === 'collaborator')
                .map(item => (
                  <Stack key={item.instanceItemId} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
                    <Box>
                      <Typography fontWeight={600}>{item.title}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {statusLabel[item.status] || item.status}{item.dueDate ? ` · vence ${item.dueDate}` : ''}
                      </Typography>
                    </Box>
                    {item.status !== 'done' && item.status !== 'skipped' ? (
                      <Button variant='outlined' size='small' disabled={saving} onClick={() => completeItem(instance.instanceId, item.instanceItemId)}>
                        Marcar listo
                      </Button>
                    ) : (
                      <CustomChip round='true' size='small' variant='tonal' color='success' label='Listo' />
                    )}
                  </Stack>
                ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

export default MyOnboardingView
