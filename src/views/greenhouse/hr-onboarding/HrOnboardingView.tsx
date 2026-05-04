'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import type { OffboardingCase } from '@/lib/workforce/offboarding'
import type { HrMemberOption } from '@/types/hr-core'
import type {
  HrOnboardingAssignedRole,
  HrOnboardingInstance,
  HrOnboardingTemplate,
  HrOnboardingTemplateItem,
  HrOnboardingTemplateType
} from '@/types/hr-onboarding'

type ViewMode = 'overview' | 'templates'

type TemplatesResponse = { templates: HrOnboardingTemplate[] }
type InstancesResponse = { instances: HrOnboardingInstance[] }
type MembersResponse = { members: HrMemberOption[] }
type CasesResponse = { cases: OffboardingCase[] }

const cardBorderSx = { border: (theme: Theme) => `1px solid ${theme.palette.divider}` }

const typeLabel: Record<string, string> = {
  onboarding: 'Onboarding',
  offboarding: 'Offboarding'
}

const roleLabel: Record<string, string> = {
  hr: 'RRHH',
  it: 'IT',
  supervisor: 'Supervisor',
  collaborator: 'Colaborador',
  payroll: 'Payroll',
  delivery: 'Delivery'
}

const itemStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Listo',
  skipped: 'Omitido',
  blocked: 'Bloqueado'
}

const offboardingStatusLabel: Record<string, string> = {
  draft: 'Borrador',
  needs_review: 'Requiere revisión',
  approved: 'Aprobado',
  scheduled: 'Programado',
  blocked: 'Bloqueado',
  executed: 'Ejecutado',
  cancelled: 'Cancelado'
}

const laneLabel: Record<string, string> = {
  internal_payroll: 'Payroll interno',
  external_payroll: 'Payroll externo',
  non_payroll: 'Sin payroll',
  identity_only: 'Solo acceso',
  relationship_transition: 'Transición',
  unknown: 'Por revisar'
}

const assignedRoles: HrOnboardingAssignedRole[] = ['hr', 'it', 'supervisor', 'collaborator', 'payroll', 'delivery']

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
}

const isItemClosed = (status: string) => status === 'done' || status === 'skipped'

const LaneCard = ({
  title,
  subtitle,
  value,
  tone,
  icon
}: {
  title: string
  subtitle: string
  value: string
  tone: 'primary' | 'success' | 'warning' | 'error' | 'info'
  icon: string
}) => (
  <Card elevation={0} sx={cardBorderSx}>
    <CardContent>
      <Stack direction='row' spacing={3} alignItems='center'>
        <Box
          sx={{
            inlineSize: 44,
            blockSize: 44,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${tone}.lightOpacity`,
            color: `${tone}.main`
          }}
        >
          <i className={icon} style={{ fontSize: 24 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h5'>{value}</Typography>
          <Typography fontWeight={600}>{title}</Typography>
          <Typography variant='body2' color='text.secondary'>{subtitle}</Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
)

const InstanceProgress = ({ instance }: { instance: HrOnboardingInstance }) => (
  <Stack spacing={1}>
    <LinearProgress
      variant='determinate'
      value={instance.progress.percent}
      color={instance.progress.overdue > 0 ? 'warning' : instance.progress.percent === 100 ? 'success' : 'primary'}
      sx={{ blockSize: 8, borderRadius: 99 }}
    />
    <Typography variant='caption' color='text.secondary'>
      {instance.progress.completed}/{instance.progress.total} tareas listas
      {instance.progress.overdue > 0 ? ` · ${instance.progress.overdue} vencida${instance.progress.overdue === 1 ? '' : 's'}` : ''}
    </Typography>
  </Stack>
)

const HrOnboardingView = ({ mode = 'overview' }: { mode?: ViewMode }) => {
  const [templates, setTemplates] = useState<HrOnboardingTemplate[]>([])
  const [instances, setInstances] = useState<HrOnboardingInstance[]>([])
  const [offboardingCases, setOffboardingCases] = useState<OffboardingCase[]>([])
  const [members, setMembers] = useState<HrMemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberId, setMemberId] = useState('')
  const [type, setType] = useState<HrOnboardingTemplateType>('onboarding')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateType, setNewTemplateType] = useState<HrOnboardingTemplateType>('onboarding')
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemRole, setNewItemRole] = useState<HrOnboardingAssignedRole>('hr')
  const [newItemDueOffset, setNewItemDueOffset] = useState(0)
  const [newItemRequired, setNewItemRequired] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [templatesRes, instancesRes, membersRes, casesRes] = await Promise.all([
        fetch('/api/hr/onboarding/templates'),
        fetch('/api/hr/onboarding/instances?status=active&limit=100'),
        fetch('/api/hr/core/members/options'),
        fetch('/api/hr/offboarding/cases?status=active&limit=100')
      ])

      if (!templatesRes.ok) throw new Error('No se pudieron cargar las plantillas de lifecycle.')
      if (!instancesRes.ok) throw new Error('No se pudieron cargar los checklists activos.')
      if (!membersRes.ok) throw new Error('No se pudo cargar el listado de colaboradores.')
      if (!casesRes.ok) throw new Error('No se pudieron cargar los casos canónicos de offboarding.')

      const templatesPayload = await templatesRes.json() as TemplatesResponse
      const instancesPayload = await instancesRes.json() as InstancesResponse
      const membersPayload = await membersRes.json() as MembersResponse
      const casesPayload = await casesRes.json() as CasesResponse

      setTemplates(templatesPayload.templates)
      setInstances(instancesPayload.instances)
      setMembers(membersPayload.members)
      setOffboardingCases(casesPayload.cases)
      setSelectedTemplateId(current => current ?? templatesPayload.templates[0]?.templateId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando Lifecycle.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedTemplate = useMemo(
    () => templates.find(template => template.templateId === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates]
  )

  const onboardingInstances = useMemo(() => instances.filter(instance => instance.type === 'onboarding'), [instances])
  const offboardingInstances = useMemo(() => instances.filter(instance => instance.type === 'offboarding'), [instances])
  const overdueInstances = useMemo(() => instances.filter(instance => instance.progress.overdue > 0), [instances])
  const blockedItems = useMemo(() => instances.flatMap(instance => instance.items.filter(item => item.status === 'blocked').map(item => ({ instance, item }))), [instances])
  const onTimeCount = instances.filter(instance => instance.progress.overdue === 0 && instance.progress.percent < 100).length
  const activeTemplateCount = templates.filter(template => template.active).length

  const createInstance = async (input?: { selectedMemberId?: string; selectedType?: HrOnboardingTemplateType; offboardingCaseId?: string | null }) => {
    const targetMemberId = input?.selectedMemberId ?? memberId
    const targetType = input?.selectedType ?? type

    if (!targetMemberId) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/hr/onboarding/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: targetMemberId,
          type: targetType,
          offboardingCaseId: input?.offboardingCaseId ?? null
        })
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

  const createTemplate = async () => {
    if (!newTemplateName.trim()) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/hr/onboarding/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          type: newTemplateType,
          description: newTemplateType === 'offboarding'
            ? 'Checklist operativo hijo del caso canónico de salida.'
            : 'Checklist operativo de ingreso y habilitación.'
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo crear la plantilla.')
      }

      const payload = await res.json() as { template: HrOnboardingTemplate }

      setNewTemplateName('')
      setSelectedTemplateId(payload.template.templateId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando plantilla.')
    } finally {
      setSaving(false)
    }
  }

  const addItem = async () => {
    if (!selectedTemplate || !newItemTitle.trim()) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/onboarding/templates/${selectedTemplate.templateId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newItemTitle,
          assignedRole: newItemRole,
          dueDaysOffset: newItemDueOffset,
          required: newItemRequired,
          displayOrder: selectedTemplate.items.length + 1
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo agregar la tarea.')
      }

      setNewItemTitle('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error agregando tarea.')
    } finally {
      setSaving(false)
    }
  }

  const patchItem = async (item: HrOnboardingTemplateItem, input: Partial<{ required: boolean }>) => {
    if (!selectedTemplate) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/onboarding/templates/${selectedTemplate.templateId}/items/${item.itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
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

  const reorderItem = async (item: HrOnboardingTemplateItem, direction: 'up' | 'down') => {
    if (!selectedTemplate) return

    const index = selectedTemplate.items.findIndex(candidate => candidate.itemId === item.itemId)
    const nextIndex = direction === 'up' ? index - 1 : index + 1

    if (index < 0 || nextIndex < 0 || nextIndex >= selectedTemplate.items.length) return

    const itemIds = selectedTemplate.items.map(candidate => candidate.itemId)
    const current = itemIds[index]

    itemIds[index] = itemIds[nextIndex]
    itemIds[nextIndex] = current

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/onboarding/templates/${selectedTemplate.templateId}/items/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo reordenar la plantilla.')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reordenando plantilla.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={180} />
        <Grid container spacing={4}>
          {[0, 1, 2, 3].map(item => (
            <Grid key={item} size={{ xs: 12, md: 3 }}>
              <Skeleton variant='rounded' height={112} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={360} />
      </Stack>
    )
  }

  if (mode === 'templates') {
    return (
      <Stack spacing={6}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={4}>
          <Box>
            <Typography variant='h4'>Plantillas Lifecycle</Typography>
            <Typography variant='body2' color='text.secondary'>
              Edita tareas operativas de onboarding y offboarding sin cambiar el caso formal de salida ni el motor de finiquitos.
            </Typography>
          </Box>
          <Button component={Link} href='/hr/onboarding' variant='tonal' startIcon={<i className='tabler-layout-dashboard' />}>
            Volver al overview
          </Button>
        </Stack>

        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={4}>
              <Card elevation={0} sx={cardBorderSx}>
                <CardHeader title='Nueva plantilla' subheader='Crea una base reusable para nuevos colaboradores o salidas.' />
                <Divider />
                <CardContent>
                  <Stack spacing={3}>
                    <TextField label='Nombre' size='small' value={newTemplateName} onChange={event => setNewTemplateName(event.target.value)} />
                    <FormControl size='small'>
                      <InputLabel id='new-template-type'>Carril</InputLabel>
                      <Select labelId='new-template-type' label='Carril' value={newTemplateType} onChange={event => setNewTemplateType(event.target.value as HrOnboardingTemplateType)}>
                        <MenuItem value='onboarding'>Onboarding</MenuItem>
                        <MenuItem value='offboarding'>Offboarding operativo</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant='contained' disabled={saving || !newTemplateName.trim()} onClick={createTemplate}>
                      Crear plantilla
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              <Card elevation={0} sx={cardBorderSx}>
                <CardHeader title='Biblioteca' subheader={`${templates.length} plantilla${templates.length === 1 ? '' : 's'} configurada${templates.length === 1 ? '' : 's'}`} />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    {templates.map(template => (
                      <Box
                        key={template.templateId}
                        component='button'
                        onClick={() => setSelectedTemplateId(template.templateId)}
                        sx={{
                          width: '100%',
                          textAlign: 'left',
                          border: theme => `1px solid ${selectedTemplate?.templateId === template.templateId ? theme.palette.primary.main : theme.palette.divider}`,
                          borderRadius: 1,
                          bgcolor: selectedTemplate?.templateId === template.templateId ? 'primary.lightOpacity' : 'background.paper',
                          p: 3,
                          cursor: 'pointer'
                        }}
                      >
                        <Stack direction='row' justifyContent='space-between' spacing={2}>
                          <Box>
                            <Typography fontWeight={600}>{template.name}</Typography>
                            <Typography variant='caption' color='text.secondary'>{template.items.length} tareas · {template.active ? 'Activa' : 'Inactiva'}</Typography>
                          </Box>
                          <CustomChip round='true' size='small' variant='tonal' color={template.type === 'offboarding' ? 'warning' : 'primary'} label={typeLabel[template.type]} />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            {selectedTemplate ? (
              <Card elevation={0} sx={cardBorderSx}>
                <CardHeader
                  title={selectedTemplate.name}
                  subheader={selectedTemplate.type === 'offboarding'
                    ? 'Checklist operativo hijo: no aprueba, ejecuta ni liquida la salida laboral.'
                    : 'Checklist de ingreso para habilitación interna y primeras tareas.'}
                  action={<CustomChip round='true' variant='tonal' color={selectedTemplate.active ? 'success' : 'default'} label={selectedTemplate.active ? 'Activa' : 'Inactiva'} />}
                />
                <Divider />
                <CardContent>
                  <Stack spacing={5}>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant='caption' color='text.secondary'>Carril</Typography>
                        <Typography fontWeight={600}>{typeLabel[selectedTemplate.type]}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant='caption' color='text.secondary'>Contratos aplicables</Typography>
                        <Typography fontWeight={600}>{selectedTemplate.applicableContractTypes.length ? selectedTemplate.applicableContractTypes.join(', ') : 'Todos'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant='caption' color='text.secondary'>Tareas requeridas</Typography>
                        <Typography fontWeight={600}>{selectedTemplate.items.filter(item => item.required).length}/{selectedTemplate.items.length}</Typography>
                      </Grid>
                    </Grid>

                    <Divider />

                    <Stack spacing={3}>
                      {selectedTemplate.items.map((item, index) => (
                        <Box key={item.itemId} sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 3 }}>
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between'>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={600}>{index + 1}. {item.title}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                Owner {roleLabel[item.assignedRole]} · vence {item.dueDaysOffset >= 0 ? `+${item.dueDaysOffset}` : item.dueDaysOffset} días desde el inicio
                              </Typography>
                              {item.description && <Typography variant='caption' color='text.secondary'>{item.description}</Typography>}
                            </Box>
                            <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                              <CustomChip round='true' size='small' variant='tonal' color={item.required ? 'warning' : 'default'} label={item.required ? 'Obligatoria' : 'Opcional'} />
                              <Switch size='small' checked={item.required} disabled={saving} onChange={event => patchItem(item, { required: event.target.checked })} />
                              <Button size='small' variant='text' disabled={saving || index === 0} onClick={() => reorderItem(item, 'up')}>Subir</Button>
                              <Button size='small' variant='text' disabled={saving || index === selectedTemplate.items.length - 1} onClick={() => reorderItem(item, 'down')}>Bajar</Button>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>

                    <Box sx={{ border: theme => `1px dashed ${theme.palette.divider}`, borderRadius: 1, p: 4 }}>
                      <Stack spacing={3}>
                        <Typography fontWeight={600}>Agregar tarea</Typography>
                        <Grid container spacing={3}>
                          <Grid size={{ xs: 12, md: 5 }}>
                            <TextField fullWidth size='small' label='Tarea' value={newItemTitle} onChange={event => setNewItemTitle(event.target.value)} />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size='small'>
                              <InputLabel id='new-item-role'>Owner</InputLabel>
                              <Select labelId='new-item-role' label='Owner' value={newItemRole} onChange={event => setNewItemRole(event.target.value as HrOnboardingAssignedRole)}>
                                {assignedRoles.map(role => <MenuItem key={role} value={role}>{roleLabel[role]}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <TextField fullWidth size='small' type='number' label='Días' value={newItemDueOffset} onChange={event => setNewItemDueOffset(Number(event.target.value))} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 2 }}>
                            <Button fullWidth variant='contained' disabled={saving || !newItemTitle.trim()} onClick={addItem}>
                              Agregar
                            </Button>
                          </Grid>
                        </Grid>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <Switch size='small' checked={newItemRequired} onChange={event => setNewItemRequired(event.target.checked)} />
                          <Typography variant='body2'>Marcar como obligatoria</Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Alert severity='info'>Crea una plantilla para empezar a configurar el módulo Lifecycle.</Alert>
            )}
          </Grid>
        </Grid>
      </Stack>
    )
  }

  return (
    <Stack spacing={6}>
      <Card elevation={0} sx={{ ...cardBorderSx, bgcolor: 'background.paper' }}>
        <CardContent>
          <Grid container spacing={5} alignItems='center'>
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant='overline' color='primary.main'>Lifecycle / Onboarding & Offboarding</Typography>
                  <Typography variant='h3' sx={{ mt: 1 }}>Entradas y salidas con carriles separados</Typography>
                  <Typography color='text.secondary' sx={{ mt: 2, maxWidth: 720 }}>
                    Gestiona checklists operativos de ingreso y salida sin confundirlos con el caso formal de offboarding, payroll o finiquito.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button component={Link} href='/hr/onboarding/templates' variant='contained' startIcon={<i className='tabler-template' />}>
                    Editar plantillas
                  </Button>
                  <Button component={Link} href='/hr/offboarding' variant='tonal' color='warning' startIcon={<i className='tabler-door-exit' />}>
                    Operar offboarding formal
                  </Button>
                  <Button component={Link} href='/my/onboarding' variant='text' startIcon={<i className='tabler-user-check' />}>
                    Ver My Onboarding
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, bgcolor: 'action.hover' }}>
                <CardContent>
                  <Stack spacing={3}>
                    <Stack direction='row' justifyContent='space-between' spacing={3}>
                      <Box>
                        <Typography variant='caption' color='text.secondary'>Carril onboarding</Typography>
                        <Typography variant='h4'>{onboardingInstances.length}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant='caption' color='text.secondary'>Carril offboarding</Typography>
                        <Typography variant='h4'>{offboardingCases.length}</Typography>
                      </Box>
                    </Stack>
                    <Divider />
                    <Typography variant='body2' color='text.secondary'>
                      El checklist de salida es una herramienta hija. La salida laboral vive en el caso canónico y sus lanes de acceso, handoff, payroll y documento.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <LaneCard title='Checklists activos' subtitle='Onboarding y salida operativa' value={String(instances.length)} tone='primary' icon='tabler-list-check' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <LaneCard title='En tiempo' subtitle='Sin tareas vencidas' value={String(onTimeCount)} tone='success' icon='tabler-clock-check' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <LaneCard title='Vencidos' subtitle='Requieren seguimiento' value={String(overdueInstances.length)} tone={overdueInstances.length > 0 ? 'warning' : 'success'} icon='tabler-alert-triangle' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <LaneCard title='Plantillas activas' subtitle='Bases reutilizables' value={String(activeTemplateCount)} tone='info' icon='tabler-template' />
        </Grid>
      </Grid>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card elevation={0} sx={cardBorderSx}>
            <CardHeader
              title='Roster operativo'
              subheader='Tareas activas, owners y progreso por colaborador.'
              action={<CustomChip round='true' variant='tonal' color={blockedItems.length > 0 ? 'error' : 'success'} label={`${blockedItems.length} bloqueo${blockedItems.length === 1 ? '' : 's'}`} />}
            />
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Colaborador</TableCell>
                    <TableCell>Carril</TableCell>
                    <TableCell>Progreso</TableCell>
                    <TableCell>Próxima acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {instances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <Typography color='text.secondary'>No hay checklists activos. Crea uno manualmente o espera eventos de ingreso/salida.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : instances.map(instance => {
                    const nextItem = instance.items.find(item => !isItemClosed(item.status))

                    return (
                      <TableRow key={instance.instanceId} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{instance.memberName || instance.memberId}</Typography>
                          <Typography variant='body2' color='text.secondary'>{instance.templateName}</Typography>
                          {instance.offboardingCaseId && <Typography variant='caption' color='text.secondary'>Caso: {instance.offboardingCaseId}</Typography>}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1} alignItems='flex-start'>
                            <CustomChip round='true' size='small' variant='tonal' color={instance.type === 'offboarding' ? 'warning' : 'primary'} label={typeLabel[instance.type]} />
                            <Typography variant='caption' color='text.secondary'>{instance.source}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ minWidth: 190 }}>
                          <InstanceProgress instance={instance} />
                        </TableCell>
                        <TableCell>
                          {nextItem ? (
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
                              <Box>
                                <Typography variant='body2' fontWeight={600}>{nextItem.title}</Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {roleLabel[nextItem.assignedRole]} · {itemStatusLabel[nextItem.status]} · {nextItem.dueDate ? formatDate(nextItem.dueDate) : 'sin vencimiento'}
                                </Typography>
                              </Box>
                              <Button size='small' variant='tonal' disabled={saving} onClick={() => completeItem(instance, nextItem.instanceItemId)}>
                                Marcar lista
                              </Button>
                            </Stack>
                          ) : (
                            <CustomChip round='true' size='small' color='success' label='Sin tareas pendientes' />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={6}>
            <Card elevation={0} sx={cardBorderSx}>
              <CardHeader title='Crear checklist' subheader='Operativo; no reemplaza el caso formal de salida.' />
              <Divider />
              <CardContent>
                <Stack spacing={3}>
                  <FormControl fullWidth size='small'>
                    <InputLabel id='onboarding-member-label'>Colaborador</InputLabel>
                    <Select labelId='onboarding-member-label' label='Colaborador' value={memberId} onChange={event => setMemberId(event.target.value)}>
                      {members.map(member => (
                        <MenuItem key={member.memberId} value={member.memberId}>{member.displayName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size='small'>
                    <InputLabel id='onboarding-type-label'>Carril</InputLabel>
                    <Select labelId='onboarding-type-label' label='Carril' value={type} onChange={event => setType(event.target.value as HrOnboardingTemplateType)}>
                      <MenuItem value='onboarding'>Onboarding</MenuItem>
                      <MenuItem value='offboarding'>Offboarding operativo</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant='contained' disabled={!memberId || saving} onClick={() => createInstance()}>
                    Crear checklist
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={0} sx={cardBorderSx}>
              <CardHeader title='Lane de offboarding' subheader='Casos formales activos y su checklist operativo.' />
              <Divider />
              <CardContent>
                <Stack spacing={3}>
                  {offboardingCases.length === 0 ? (
                    <Alert severity='success'>No hay salidas laborales activas.</Alert>
                  ) : offboardingCases.slice(0, 5).map(item => {
                    const checklist = offboardingInstances.find(instance => instance.offboardingCaseId === item.offboardingCaseId || instance.memberId === item.memberId)

                    return (
                      <Box key={item.offboardingCaseId} sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 3 }}>
                        <Stack spacing={2}>
                          <Stack direction='row' justifyContent='space-between' spacing={2}>
                            <Box>
                              <Typography fontWeight={600}>{item.publicId}</Typography>
                              <Typography variant='caption' color='text.secondary'>{members.find(member => member.memberId === item.memberId)?.displayName ?? item.memberId}</Typography>
                            </Box>
                            <CustomChip round='true' size='small' variant='tonal' color={item.status === 'blocked' ? 'error' : 'warning'} label={offboardingStatusLabel[item.status] ?? item.status} />
                          </Stack>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant='caption' color='text.secondary'>Salida efectiva</Typography>
                              <Typography variant='body2' fontWeight={600}>{formatDate(item.effectiveDate)}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant='caption' color='text.secondary'>Último día</Typography>
                              <Typography variant='body2' fontWeight={600}>{formatDate(item.lastWorkingDay)}</Typography>
                            </Grid>
                          </Grid>
                          <Typography variant='body2' color='text.secondary'>
                            Lane {laneLabel[item.ruleLane] ?? item.ruleLane}. Access, handoff y payroll/documento se operan desde Offboarding formal.
                          </Typography>
                          {checklist ? (
                            <InstanceProgress instance={checklist} />
                          ) : (
                            <Button
                              size='small'
                              variant='tonal'
                              color='warning'
                              disabled={saving || !item.memberId}
                              onClick={() => createInstance({ selectedMemberId: item.memberId ?? '', selectedType: 'offboarding', offboardingCaseId: item.offboardingCaseId })}
                            >
                              Crear checklist operativo
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default HrOnboardingView
