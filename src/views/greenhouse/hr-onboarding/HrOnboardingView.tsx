'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { HrMemberOption } from '@/types/hr-core'
import type { HrOnboardingInstance, HrOnboardingTemplate, HrOnboardingTemplateType } from '@/types/hr-onboarding'

type TemplatesResponse = { templates: HrOnboardingTemplate[] }
type InstancesResponse = { instances: HrOnboardingInstance[] }
type MembersResponse = { members: HrMemberOption[] }

const typeLabel: Record<string, string> = {
  onboarding: 'Entrada',
  offboarding: 'Salida'
}

const roleLabel: Record<string, string> = {
  hr: 'HR',
  it: 'IT',
  supervisor: 'Supervisor',
  collaborator: 'Colaborador',
  payroll: 'Payroll',
  delivery: 'Delivery'
}

const statusColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'primary',
  completed: 'success',
  cancelled: 'default'
}

const itemStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Listo',
  skipped: 'Omitido',
  blocked: 'Bloqueado'
}

const HrOnboardingView = () => {
  const [templates, setTemplates] = useState<HrOnboardingTemplate[]>([])
  const [instances, setInstances] = useState<HrOnboardingInstance[]>([])
  const [members, setMembers] = useState<HrMemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberId, setMemberId] = useState('')
  const [type, setType] = useState<HrOnboardingTemplateType>('onboarding')

  const activeTemplates = useMemo(() => templates.filter(template => template.active), [templates])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [templatesRes, instancesRes, membersRes] = await Promise.all([
        fetch('/api/hr/onboarding/templates?active=true'),
        fetch('/api/hr/onboarding/instances?status=active'),
        fetch('/api/hr/core/members/options')
      ])

      if (!templatesRes.ok) throw new Error('No se pudieron cargar las plantillas.')
      if (!instancesRes.ok) throw new Error('No se pudieron cargar los checklists.')
      if (!membersRes.ok) throw new Error('No se pudo cargar el listado de colaboradores.')

      const templatesPayload = await templatesRes.json() as TemplatesResponse
      const instancesPayload = await instancesRes.json() as InstancesResponse
      const membersPayload = await membersRes.json() as MembersResponse

      setTemplates(templatesPayload.templates)
      setInstances(instancesPayload.instances)
      setMembers(membersPayload.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando onboarding.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const createInstance = async () => {
    if (!memberId) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/hr/onboarding/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, type })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo crear el checklist.')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando checklist.')
    } finally {
      setSaving(false)
    }
  }

  const completeItem = async (instance: HrOnboardingInstance, itemId: string) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/onboarding/instances/${instance.instanceId}/items/${itemId}`, {
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
        <Typography variant='h4'>Onboarding</Typography>
        <Typography color='text.secondary'>Checklists operativos para entradas y salidas; Offboarding formal sigue en su flujo canónico.</Typography>
      </Box>

      {error ? <Alert severity='error'>{error}</Alert> : null}

      <Box sx={{ display: 'grid', gap: 6, gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 0.45fr) 1fr' } }}>
        <Box>
          <Card>
            <CardHeader title='Nuevo checklist' />
            <CardContent>
              <Stack spacing={4}>
                <FormControl fullWidth size='small'>
                  <InputLabel id='onboarding-member-label'>Colaborador</InputLabel>
                  <Select labelId='onboarding-member-label' label='Colaborador' value={memberId} onChange={event => setMemberId(event.target.value)}>
                    {members.map(member => (
                      <MenuItem key={member.memberId} value={member.memberId}>{member.displayName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size='small'>
                  <InputLabel id='onboarding-type-label'>Tipo</InputLabel>
                  <Select labelId='onboarding-type-label' label='Tipo' value={type} onChange={event => setType(event.target.value as HrOnboardingTemplateType)}>
                    <MenuItem value='onboarding'>Entrada</MenuItem>
                    <MenuItem value='offboarding'>Salida operativa</MenuItem>
                  </Select>
                </FormControl>
                <Button variant='contained' disabled={!memberId || saving} onClick={createInstance}>
                  Crear
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardHeader title='Plantillas activas' />
            <CardContent>
              {loading ? <Skeleton height={120} /> : (
                <Stack spacing={3}>
                  {activeTemplates.map(template => (
                    <Box key={template.templateId} sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 3 }}>
                      <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='center'>
                        <Box>
                          <Typography fontWeight={600}>{template.name}</Typography>
                          <Typography variant='body2' color='text.secondary'>{template.items.length} tareas</Typography>
                        </Box>
                        <CustomChip round='true' size='small' variant='tonal' color='info' label={typeLabel[template.type]} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Card>
        <CardHeader title='Checklists activos' />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Colaborador</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Progreso</TableCell>
                <TableCell>Tareas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4}><Skeleton height={80} /></TableCell></TableRow>
              ) : instances.map(instance => (
                <TableRow key={instance.instanceId} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{instance.memberName || instance.memberId}</Typography>
                    <Typography variant='body2' color='text.secondary'>{instance.templateName}</Typography>
                    {instance.offboardingCaseId ? <Typography variant='caption'>Caso: {instance.offboardingCaseId}</Typography> : null}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1} alignItems='flex-start'>
                      <CustomChip round='true' size='small' variant='tonal' color={statusColor[instance.status] || 'default'} label={typeLabel[instance.type]} />
                      <Typography variant='caption' color='text.secondary'>{instance.status}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Stack spacing={1}>
                      <LinearProgress variant='determinate' value={instance.progress.percent} />
                      <Typography variant='caption'>{instance.progress.completed}/{instance.progress.total} listas</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={2}>
                      {instance.items.slice(0, 4).map(item => (
                        <Stack key={item.instanceItemId} direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
                          <Box>
                            <Typography variant='body2'>{item.title}</Typography>
                            <Typography variant='caption' color='text.secondary'>{roleLabel[item.assignedRole]} · {itemStatusLabel[item.status]}</Typography>
                          </Box>
                          {item.status !== 'done' && item.status !== 'skipped' ? (
                            <Button size='small' disabled={saving} onClick={() => completeItem(instance, item.instanceItemId)}>Listo</Button>
                          ) : null}
                        </Stack>
                      ))}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  )
}

export default HrOnboardingView
