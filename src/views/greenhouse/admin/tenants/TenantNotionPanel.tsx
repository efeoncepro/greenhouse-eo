'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import type {
  IntegrationDataQualityCheckResult,
  IntegrationDataQualityRunResult
} from '@/types/integration-data-quality'
import type { NotionGovernanceSummary } from '@/types/notion-governance'
import type {
  NotionSyncOrchestrationRunRecord,
  TenantNotionSyncOrchestrationDetail
} from '@/types/notion-sync-orchestration'

const GREENHOUSE_COPY = getMicrocopy()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpaceInfo {
  spaceId: string
  spaceName: string
  organizationId: string | null
  spaceType: string
  status: string
  active: boolean
}

interface NotionMapping {
  sourceId: string
  spaceId: string
  databases: {
    proyectos: string | null
    tareas: string | null
    sprints: string | null
    revisiones: string | null
  }
  syncEnabled: boolean
  syncFrequency: string
  lastSyncedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
}

interface NotionStatusResponse {
  space: SpaceInfo | null
  notionMapping: NotionMapping | null
  message?: string
}

interface TenantNotionDataQualityResponse {
  clientId: string
  space: {
    spaceId: string
    spaceName: string
  }
  latestRun: IntegrationDataQualityRunResult | null
  latestChecks: IntegrationDataQualityCheckResult[]
  recentRuns: IntegrationDataQualityRunResult[]
  orchestration: TenantNotionSyncOrchestrationDetail | null
}

interface DiscoveryDatabase {
  databaseId: string
  title: string
  classification: string | null
  parentType: string
  parentId: string
  parentName: string | null
  url: string
  createdTime: string
  lastEditedTime: string
}

interface DiscoveryGroup {
  parentKey: string
  groupLabel: string
  databases: DiscoveryDatabase[]
  hasCoreDatabases: boolean
  classificationsFound: string[]
}

interface DiscoveryResponse {
  totalDatabases: number
  groups: DiscoveryGroup[]
  filter: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_LABELS: Record<string, { label: string; icon: string; required: boolean }> = {
  proyectos: { label: 'Proyectos', icon: 'tabler-folder', required: true },
  tareas: { label: 'Tareas', icon: 'tabler-checkbox', required: true },
  sprints: { label: 'Sprints / Ciclos', icon: 'tabler-timeline', required: false },
  revisiones: { label: 'Revisiones', icon: 'tabler-eye-check', required: false }
}

const WIZARD_STEPS = ['Descubrir', 'Seleccionar', 'Registrar']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatShortDbId = (id: string | null) => {
  if (!id) return '—'

  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

const formatDatetime = (iso: string | null) => {
  if (!iso) return '—'

  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Santiago'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const getReadinessChipColor = (status: string | null | undefined): 'success' | 'warning' | 'error' | 'secondary' => {
  if (status === 'ready') return 'success'
  if (status === 'warning') return 'warning'
  if (status === 'blocked') return 'error'

  return 'secondary'
}

const getDataQualityChipColor = (status: string | null | undefined): 'success' | 'warning' | 'error' | 'secondary' => {
  if (status === 'healthy') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'broken') return 'error'

  return 'secondary'
}

const getDataQualityAlertSeverity = (status: string | null | undefined): 'success' | 'warning' | 'error' | 'info' => {
  if (status === 'healthy') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'broken') return 'error'

  return 'info'
}

const getOrchestrationChipColor = (
  status: NotionSyncOrchestrationRunRecord['orchestrationStatus'] | null | undefined
): 'success' | 'warning' | 'error' | 'secondary' | 'info' => {
  if (status === 'sync_completed') return 'success'
  if (status === 'waiting_for_raw' || status === 'retry_scheduled') return 'warning'
  if (status === 'retry_running') return 'info'
  if (status === 'sync_failed' || status === 'cancelled') return 'error'

  return 'secondary'
}

const getOrchestrationAlertSeverity = (
  status: NotionSyncOrchestrationRunRecord['orchestrationStatus'] | null | undefined
): 'success' | 'warning' | 'error' | 'info' => {
  if (status === 'sync_completed') return 'success'
  if (status === 'waiting_for_raw' || status === 'retry_scheduled') return 'warning'
  if (status === 'retry_running') return 'info'
  if (status === 'sync_failed' || status === 'cancelled') return 'error'

  return 'info'
}

const toInteger = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }

  return 0
}

const formatDatabaseKind = (databaseKind: string) =>
  DB_LABELS[databaseKind]?.label || databaseKind

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  clientId: string
  clientName: string
}

const TenantNotionPanel = ({ clientId, clientName }: Props) => {
  // State — status
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<NotionStatusResponse | null>(null)
  const [governanceLoading, setGovernanceLoading] = useState(false)
  const [governanceRefreshing, setGovernanceRefreshing] = useState(false)
  const [governance, setGovernance] = useState<NotionGovernanceSummary | null>(null)
  const [dataQualityLoading, setDataQualityLoading] = useState(false)
  const [dataQuality, setDataQuality] = useState<TenantNotionDataQualityResponse | null>(null)

  // State — wizard
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [discovering, setDiscovering] = useState(false)
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<DiscoveryGroup | null>(null)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  // State — space creation
  const [creatingSpace, setCreatingSpace] = useState(false)
  const spaceNameRef = useRef(clientName)

  // ---------------------------------------------------------------------------
  // Fetch current status
  // ---------------------------------------------------------------------------

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${clientId}/notion-status`)

      if (res.ok) {
        const data: NotionStatusResponse = await res.json()

        setStatus(data)
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const fetchGovernance = useCallback(async () => {
    setGovernanceLoading(true)

    try {
      const res = await fetch(`/api/admin/tenants/${clientId}/notion-governance`)

      if (!res.ok) return

      const data = await res.json() as { governance: NotionGovernanceSummary | null }

      setGovernance(data.governance)
    } catch {
      // Non-blocking
    } finally {
      setGovernanceLoading(false)
    }
  }, [clientId])

  const fetchDataQuality = useCallback(async () => {
    setDataQualityLoading(true)

    try {
      const res = await fetch(`/api/admin/tenants/${clientId}/notion-data-quality?limit=6`)

      if (!res.ok) {
        if (res.status === 404) {
          setDataQuality(null)
        }

        return
      }

      const data = await res.json() as TenantNotionDataQualityResponse

      setDataQuality(data)
    } catch {
      // Non-blocking
    } finally {
      setDataQualityLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (!status?.space?.spaceId) {
      setGovernance(null)
      setDataQuality(null)

      return
    }

    void fetchGovernance()
    void fetchDataQuality()
  }, [fetchDataQuality, fetchGovernance, status?.space?.spaceId])

  // ---------------------------------------------------------------------------
  // Space creation
  // ---------------------------------------------------------------------------

  const handleCreateSpace = async () => {
    const spaceName = spaceNameRef.current.trim()

    if (!spaceName) {
      setError('El nombre del Space es requerido.')

      return
    }

    setCreatingSpace(true)
    setError('')

    try {
      const res = await fetch('/api/admin/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceName,
          clientId
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || `Error ${res.status}`)

        return
      }

      toast.success(`Space "${spaceName}" creado. Ahora conecta las bases de Notion.`)

      // Refresh status — now the Space exists, wizard will be available
      setLoading(true)
      await fetchStatus()

      // Auto-open the wizard after Space creation
      setWizardOpen(true)
      setWizardStep(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setCreatingSpace(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------------

  const handleDiscover = async () => {
    setDiscovering(true)
    setError('')
    setDiscovery(null)
    setSelectedGroup(null)

    try {
      const res = await fetch('/api/integrations/notion/discover')

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || `Error ${res.status}`)

        return
      }

      const data: DiscoveryResponse = await res.json()

      setDiscovery(data)
      setWizardStep(1)

      // Auto-select if only one group with core databases
      const coreGroups = data.groups.filter(g => g.hasCoreDatabases)

      if (coreGroups.length === 1) {
        setSelectedGroup(coreGroups[0])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setDiscovering(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  const handleRegister = async () => {
    if (!selectedGroup || !status?.space) return

    const proyectos = selectedGroup.databases.find(d => d.classification === 'proyectos')
    const tareas = selectedGroup.databases.find(d => d.classification === 'tareas')
    const sprints = selectedGroup.databases.find(d => d.classification === 'sprints')
    const revisiones = selectedGroup.databases.find(d => d.classification === 'revisiones')

    if (!proyectos || !tareas) {
      setError('El grupo seleccionado no contiene bases de datos de Proyectos y Tareas.')

      return
    }

    setRegistering(true)
    setError('')

    try {
      const res = await fetch('/api/integrations/notion/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: status.space.spaceId,
          notionDbProyectos: proyectos.databaseId,
          notionDbTareas: tareas.databaseId,
          notionDbSprints: sprints?.databaseId || null,
          notionDbRevisiones: revisiones?.databaseId || null,
          verify: true
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'No se pudo registrar el mapeo.')

        return
      }

      toast.success(`Notion conectado para ${clientName}. El sync diario comenzará automáticamente.`)
      setWizardOpen(false)
      setWizardStep(0)
      setDiscovery(null)
      setSelectedGroup(null)

      // Refresh status
      setLoading(true)
      await fetchStatus()
      await fetchGovernance()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setRegistering(false)
    }
  }

  const handleRefreshGovernance = async () => {
    setGovernanceRefreshing(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/tenants/${clientId}/notion-governance/refresh`, {
        method: 'POST'
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'No se pudo refrescar la gobernanza de Notion.')

        return
      }

      setGovernance(data.governance as NotionGovernanceSummary)
      toast.success('Schema governance de Notion actualizado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setGovernanceRefreshing(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent>
          <Skeleton variant='rounded' height={80} />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // No space for this client
  // ---------------------------------------------------------------------------

  if (!status?.space) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Integración Notion'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
              <i className='tabler-brand-notion' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <Box sx={{ py: 2 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Crear Space operativo</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              Este tenant no tiene un Space registrado. Crea uno para habilitar la integración con Notion y el pipeline de datos.
            </Typography>

            <Stack spacing={2.5} sx={{ maxWidth: 420 }}>
              <TextField
                label='Nombre del Space'
                defaultValue={clientName}
                size='small'
                fullWidth
                helperText='La Organización se resuelve automáticamente desde HubSpot.'
                onChange={e => { spaceNameRef.current = e.target.value }}
              />

              {error && (
                <Alert severity='error' onClose={() => setError('')}>{error}</Alert>
              )}

              <Box>
                <Button
                  variant='contained'
                  onClick={handleCreateSpace}
                  disabled={creatingSpace}
                  startIcon={creatingSpace ? <CircularProgress size={16} /> : <i className='tabler-plus' />}
                >
                  {creatingSpace ? 'Creando…' : 'Crear Space'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    )
  }

  const mapping = status.notionMapping

  // ---------------------------------------------------------------------------
  // Connected state
  // ---------------------------------------------------------------------------

  if (mapping && !wizardOpen) {
    const dbEntries = Object.entries(mapping.databases) as Array<[string, string | null]>
    const readiness = governance?.readiness
    const driftEvents = governance?.driftEvents ?? []
    const snapshots = governance?.snapshots ?? []
    const latestDataQualityRun = dataQuality?.latestRun
    const latestDataQualityChecks = (dataQuality?.latestChecks ?? []).filter(check => check.severity !== 'ok')
    const recentDataQualityRuns = dataQuality?.recentRuns ?? []
    const latestDiffCount = toInteger(latestDataQualityRun?.summary.diffCount)
    const orchestration = dataQuality?.orchestration
    const latestOrchestrationRun = orchestration?.latestRun ?? null
    const openOrchestrationRun = orchestration?.openRun ?? null
    const recentOrchestrationRuns = orchestration?.recentRuns ?? []

    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Integración Notion'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
              <i className='tabler-brand-notion' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
            </Avatar>
          }
          action={
            <Stack direction='row' spacing={1} alignItems='center'>
              <CustomChip
                round='true'
                size='small'
                color='success'
                variant='tonal'
                icon={<i className='tabler-check' />}
                label='Conectado'
              />
              <Button
                size='small'
                variant='tonal'
                color='secondary'
                startIcon={<i className='tabler-refresh' />}
                onClick={() => { setWizardOpen(true); setWizardStep(0) }}
              >
                Reconfigurar
              </Button>
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={4}>
            {/* Space info */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1}>
                <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Space
                </Typography>
                <Typography variant='body2' fontWeight={600}>{status.space.spaceName}</Typography>
                <Typography variant='caption' sx={{ fontSize: '0.75rem' }} color='text.disabled'>
                  {status.space.spaceId}
                </Typography>
              </Stack>
            </Grid>
            {/* Sync info */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1}>
                <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Sync
                </Typography>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <CustomChip
                    round='true'
                    size='small'
                    color={mapping.syncEnabled ? 'success' : 'secondary'}
                    variant='tonal'
                    label={mapping.syncEnabled ? 'Activo' : 'Inactivo'}
                  />
                  <Typography variant='body2' color='text.secondary'>{mapping.syncFrequency}</Typography>
                </Stack>
                <Typography variant='caption' color='text.disabled'>
                  Último sync: {formatDatetime(mapping.lastSyncedAt)}
                </Typography>
              </Stack>
            </Grid>
            {/* Source ID */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1}>
                <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Registrado
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {formatDatetime(mapping.createdAt)}
                </Typography>
                <Typography variant='caption' sx={{ fontSize: '0.75rem' }} color='text.disabled'>
                  {mapping.sourceId}
                </Typography>
              </Stack>
            </Grid>

            {/* Database mappings */}
            <Grid size={{ xs: 12 }}>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell component='th' scope='col'>Base de datos</TableCell>
                      <TableCell component='th' scope='col'>ID Notion</TableCell>
                      <TableCell component='th' scope='col'>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dbEntries.map(([key, dbId]) => {
                      const meta = DB_LABELS[key]

                      if (!meta) return null

                      return (
                        <TableRow key={key} hover>
                          <TableCell>
                            <Stack direction='row' spacing={1} alignItems='center'>
                              <i className={meta.icon} style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
                              <Typography variant='body2'>{meta.label}</Typography>
                              {meta.required && (
                                <CustomChip round='true' size='small' color='primary' variant='tonal' label='Requerido' />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                              {dbId || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {dbId ? (
                              <CustomChip round='true' size='small' color='success' variant='tonal' icon={<i className='tabler-check' />} label='Mapeado' />
                            ) : (
                              <CustomChip round='true' size='small' color='secondary' variant='tonal' label='No configurado' />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Stack spacing={1.5}>
                <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                  <Typography variant='subtitle1'>Orquestación de sync</Typography>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    {openOrchestrationRun ? (
                      <CustomChip
                        round='true'
                        size='small'
                        color={getOrchestrationChipColor(openOrchestrationRun.orchestrationStatus)}
                        variant='tonal'
                        label={openOrchestrationRun.orchestrationStatus}
                      />
                    ) : latestOrchestrationRun ? (
                      <CustomChip
                        round='true'
                        size='small'
                        color={getOrchestrationChipColor(latestOrchestrationRun.orchestrationStatus)}
                        variant='tonal'
                        label={latestOrchestrationRun.orchestrationStatus}
                      />
                    ) : null}
                  </Stack>
                </Stack>

                {!latestOrchestrationRun ? (
                  <Alert severity='info'>
                    Todavía no hay señal persistida de orquestación para este Space. La primera ejecución bloqueada o el primer retry dejarán evidencia aquí.
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    <Alert severity={getOrchestrationAlertSeverity((openOrchestrationRun ?? latestOrchestrationRun).orchestrationStatus)}>
                      {openOrchestrationRun
                        ? openOrchestrationRun.orchestrationStatus === 'waiting_for_raw'
                          ? 'El writer canónico quedó esperando que el raw termine de refrescar. Aún no conviene leer este pipeline como cerrado.'
                          : openOrchestrationRun.orchestrationStatus === 'retry_scheduled'
                            ? 'El retry ya quedó programado dentro de la ventana diaria. Puedes revisar la próxima ejecución sin forzar reruns manuales todavía.'
                            : 'Hay un retry ejecutándose para cerrar el desfase raw -> conformed. Espera esta corrida antes de evaluar data quality como final.'
                        : latestOrchestrationRun.orchestrationStatus === 'sync_completed'
                          ? 'La última ventana de orquestación convergió y dejó el writer canónico alineado para este Space.'
                          : 'La última ventana de orquestación cerró con error o cancelación. Revisa la razón antes de confiar en downstream.'}
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Última señal</Typography>
                          <Typography variant='body2'>{formatDatetime(latestOrchestrationRun.updatedAt)}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Retry actual</Typography>
                          <Typography variant='h6'>{openOrchestrationRun?.retryAttempt ?? latestOrchestrationRun.retryAttempt}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Próxima ventana</Typography>
                          <Typography variant='body2'>{formatDatetime(openOrchestrationRun?.nextRetryAt ?? latestOrchestrationRun.nextRetryAt)}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Trigger</Typography>
                          <Typography variant='body2'>{openOrchestrationRun?.triggerSource ?? latestOrchestrationRun.triggerSource}</Typography>
                        </Stack>
                      </Grid>
                    </Grid>

                    <Alert severity='info' variant='outlined'>
                      {openOrchestrationRun?.waitingReason ?? latestOrchestrationRun.waitingReason ?? 'Sin razón adicional registrada para este Space.'}
                    </Alert>

                    {recentOrchestrationRuns.length > 1 && (
                      <TableContainer>
                        <Table size='small'>
                          <TableHead>
                            <TableRow>
                              <TableCell component='th' scope='col'>Señal</TableCell>
                              <TableCell component='th' scope='col'>Estado</TableCell>
                              <TableCell align='right'>Retry</TableCell>
                              <TableCell component='th' scope='col'>Próxima ventana</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {recentOrchestrationRuns.slice(0, 5).map(run => (
                              <TableRow key={run.orchestrationRunId} hover>
                                <TableCell>
                                  <Stack spacing={0.25}>
                                    <Typography variant='body2'>{formatDatetime(run.updatedAt)}</Typography>
                                    <Typography variant='caption' color='text.disabled'>
                                      {run.orchestrationRunId}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    color={getOrchestrationChipColor(run.orchestrationStatus)}
                                    variant='tonal'
                                    label={run.orchestrationStatus}
                                  />
                                </TableCell>
                                <TableCell align='right'>
                                  <Typography variant='body2'>{run.retryAttempt}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant='caption' color='text.secondary'>
                                    {formatDatetime(run.nextRetryAt)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Stack>
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Stack spacing={1.5}>
                  <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                    <Typography variant='subtitle1'>Calidad de datos del pipeline</Typography>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      {latestDataQualityRun ? (
                        <CustomChip
                          round='true'
                          size='small'
                          color={getDataQualityChipColor(latestDataQualityRun.qualityStatus)}
                          variant='tonal'
                          label={latestDataQualityRun.qualityStatus}
                        />
                      ) : null}
                      <Button
                        size='small'
                        variant='tonal'
                        color='secondary'
                        startIcon={dataQualityLoading ? <CircularProgress size={16} /> : <i className='tabler-refresh' />}
                        onClick={() => void fetchDataQuality()}
                        disabled={dataQualityLoading}
                      >
                        {dataQualityLoading ? 'Actualizando…' : 'Actualizar monitor'}
                      </Button>
                    </Stack>
                  </Stack>

                {dataQualityLoading ? (
                  <Skeleton variant='rounded' height={120} />
                ) : !latestDataQualityRun ? (
                  <Alert severity='info'>
                    El monitor todavía no tiene corridas persistidas para este Space. El cron corre después de `sync-conformed` y el post-sync hook deja la primera señal apenas materializa.
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    <Alert severity={getDataQualityAlertSeverity(latestDataQualityRun.qualityStatus)}>
                      {latestDataQualityRun.qualityStatus === 'healthy'
                        ? 'La última corrida no detectó drift duro entre Notion, raw y conformed.'
                        : latestDataQualityRun.qualityStatus === 'degraded'
                          ? 'La última corrida detectó mismatches blandos. Revisa warnings y confirma si el drift es esperado o si requiere corrección.'
                          : 'La última corrida detectó una ruptura del contrato. Revisa findings y ejecuta una intervención operativa antes de confiar en los readers downstream.'}
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Última corrida</Typography>
                          <Typography variant='body2'>{formatDatetime(latestDataQualityRun.checkedAt)}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Warnings</Typography>
                          <Typography variant='h6'>{latestDataQualityRun.warningChecks}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Errores</Typography>
                          <Typography variant='h6'>{latestDataQualityRun.errorChecks}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Diff</Typography>
                          <Typography variant='h6'>{latestDiffCount}</Typography>
                        </Stack>
                      </Grid>
                    </Grid>

                    {latestDataQualityChecks.length > 0 ? (
                      <TableContainer>
                        <Table size='small'>
                          <TableHead>
                            <TableRow>
                              <TableCell component='th' scope='col'>Finding</TableCell>
                              <TableCell component='th' scope='col'>Severidad</TableCell>
                              <TableCell component='th' scope='col'>Detalle</TableCell>
                              <TableCell component='th' scope='col'>Valor</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {latestDataQualityChecks.map(check => (
                              <TableRow key={check.dataQualityCheckId} hover>
                                <TableCell>
                                  <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                                    {check.checkKey}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    color={check.severity === 'error' ? 'error' : 'warning'}
                                    variant='tonal'
                                    label={check.severity}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant='body2' color='text.secondary'>
                                    {check.summary}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant='caption' color='text.secondary'>
                                    {check.observedValue ?? '—'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity='success'>
                        La última corrida no dejó findings activos. El contrato entre origen, raw y conformed quedó sano para este corte.
                      </Alert>
                    )}

                    {recentDataQualityRuns.length > 1 && (
                      <TableContainer>
                        <Table size='small'>
                          <TableHead>
                            <TableRow>
                              <TableCell component='th' scope='col'>Corrida</TableCell>
                              <TableCell component='th' scope='col'>Estado</TableCell>
                              <TableCell component='th' scope='col'>Periodo</TableCell>
                              <TableCell align='right'>Warnings</TableCell>
                              <TableCell align='right'>Errores</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {recentDataQualityRuns.slice(0, 5).map(run => (
                              <TableRow key={run.dataQualityRunId} hover>
                                <TableCell>
                                  <Stack spacing={0.25}>
                                    <Typography variant='body2'>{formatDatetime(run.checkedAt)}</Typography>
                                    <Typography variant='caption' color='text.disabled'>
                                      {run.dataQualityRunId}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    color={getDataQualityChipColor(run.qualityStatus)}
                                    variant='tonal'
                                    label={run.qualityStatus}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant='caption' color='text.secondary'>
                                    {run.periodField} · {run.periodYear}-{String(run.periodMonth).padStart(2, '0')}
                                  </Typography>
                                </TableCell>
                                <TableCell align='right'>
                                  <Typography variant='body2'>{run.warningChecks}</Typography>
                                </TableCell>
                                <TableCell align='right'>
                                  <Typography
                                    variant='body2'
                                    color={run.errorChecks > 0 ? 'error.main' : 'text.secondary'}
                                  >
                                    {run.errorChecks}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Stack>
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5}>
                <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                  <Typography variant='subtitle1'>Gobernanza de schema</Typography>
                  <Button
                    size='small'
                    variant='tonal'
                    color='secondary'
                    startIcon={governanceRefreshing ? <CircularProgress size={16} /> : <i className='tabler-refresh' />}
                    onClick={handleRefreshGovernance}
                    disabled={governanceRefreshing || governanceLoading || !governance?.canRefreshSchema}
                  >
                    {governanceRefreshing ? 'Actualizando…' : 'Refrescar schema'}
                  </Button>
                </Stack>

                {governanceLoading ? (
                  <Skeleton variant='rounded' height={88} />
                ) : !governance ? (
                  <Alert severity='info'>
                    Aún no hay governance materializada para este Space.
                  </Alert>
                ) : !governance.canRefreshSchema ? (
                  <Alert severity='warning'>
                    `NOTION_TOKEN` no está disponible en este entorno. El refresh administrativo de schema está deshabilitado.
                  </Alert>
                ) : null}

                {readiness ? (
                  <Stack spacing={1.5}>
                    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                      <Typography variant='body2' color='text.secondary'>KPI readiness</Typography>
                      <CustomChip
                        round='true'
                        size='small'
                        color={getReadinessChipColor(readiness.readinessStatus)}
                        variant='tonal'
                        label={readiness.readinessStatus}
                      />
                      <Typography variant='caption' color='text.disabled'>
                        Evaluado: {formatDatetime(readiness.evaluatedAt)}
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Mappings persistidos</Typography>
                          <Typography variant='h6'>{readiness.mappingSummary.persistedMappings}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Core mapped</Typography>
                          <Typography variant='h6'>{readiness.mappingSummary.mappedCoreFields}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Core sugerido</Typography>
                          <Typography variant='h6'>{readiness.mappingSummary.suggestedCoreFields}</Typography>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Stack spacing={0.5}>
                          <Typography variant='caption' color='text.secondary'>Core missing</Typography>
                          <Typography variant='h6'>{readiness.mappingSummary.missingCoreFields}</Typography>
                        </Stack>
                      </Grid>
                    </Grid>

                    {readiness.blockingIssues.length > 0 && (
                      <Alert severity='error'>
                        {readiness.blockingIssues.map(issue => issue.message).join(' ')}
                      </Alert>
                    )}

                    {readiness.warnings.length > 0 && (
                      <Alert severity='warning'>
                        {readiness.warnings.slice(0, 3).map(issue => issue.message).join(' ')}
                      </Alert>
                    )}
                  </Stack>
                ) : null}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5}>
                <Typography variant='subtitle1'>Snapshots por base</Typography>

                {governanceLoading ? (
                  <Skeleton variant='rounded' height={160} />
                ) : snapshots.length === 0 ? (
                  <Alert severity='info'>
                    No hay snapshots activos todavía. Refresca el schema para generar la primera versión.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell component='th' scope='col'>Base</TableCell>
                          <TableCell component='th' scope='col'>Snapshot</TableCell>
                          <TableCell component='th' scope='col'>Drift</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {snapshots.map(snapshot => {
                          const driftEvent = driftEvents.find(event => event.databaseKind === snapshot.databaseKind)

                          return (
                            <TableRow key={snapshot.snapshotId} hover>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant='body2'>{formatDatabaseKind(snapshot.databaseKind)}</Typography>
                                  <Typography variant='caption' color='text.disabled'>
                                    {snapshot.databaseTitle}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant='body2'>v{snapshot.schemaVersion}</Typography>
                                  <Typography variant='caption' color='text.disabled'>
                                    {snapshot.propertyCount} props · {formatDatetime(snapshot.discoveredAt)}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                {driftEvent ? (
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    color={getReadinessChipColor(driftEvent.driftStatus)}
                                    variant='tonal'
                                    label={driftEvent.driftStatus}
                                  />
                                ) : (
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    color='success'
                                    variant='tonal'
                                    label='Sin drift'
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Discovery wizard (no mapping or reconfiguring)
  // ---------------------------------------------------------------------------

  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      <CardHeader
        title='Integración Notion'
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
            <i className='tabler-brand-notion' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
          </Avatar>
        }
        action={
          mapping ? (
            <Button size='small' variant='tonal' color='secondary' onClick={() => { setWizardOpen(false); setWizardStep(0) }}>{GREENHOUSE_COPY.actions.cancel}</Button>
          ) : null
        }
      />
      <Divider />
      <CardContent>
        {/* Stepper */}
        <Stepper activeStep={wizardStep} alternativeLabel sx={{ mb: 4 }}>
          {WIZARD_STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error */}
        {error && (
          <Alert severity='error' onClose={() => setError('')} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Step 0: Discover */}
        {wizardStep === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>
              {mapping ? 'Reconfigurar conexión Notion' : 'Conectar Notion'}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
              {mapping
                ? 'Buscaremos las bases de datos en el workspace de Notion para reconfigurar el mapeo.'
                : 'Descubriremos automáticamente las bases de datos de Proyectos, Tareas, Sprints y Revisiones en el workspace de Notion.'}
            </Typography>
            <Button
              variant='contained'
              startIcon={discovering ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-search' />}
              onClick={handleDiscover}
              disabled={discovering}
            >
              {discovering ? 'Descubriendo…' : 'Descubrir bases de datos'}
            </Button>
          </Box>
        )}

        {/* Step 1: Select group */}
        {wizardStep === 1 && discovery && (() => {
          // Only show groups that have at least one classified database (filter noise)
          const relevantGroups = discovery.groups.filter(
            g => g.classificationsFound.length > 0
          )

          const coreCount = relevantGroups.filter(g => g.hasCoreDatabases).length

          return (
            <Box>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Se encontraron {discovery.totalDatabases} bases de datos en {relevantGroups.length} grupos relevantes.
                {coreCount > 0
                  ? ' Selecciona el grupo que corresponde a este Space.'
                  : ' Ningún grupo tiene las bases de datos requeridas (Proyectos + Tareas).'}
              </Typography>
              <Stack spacing={2}>
                {relevantGroups.map(group => {
                  const isSelected = selectedGroup?.parentKey === group.parentKey
                  const hasCore = group.hasCoreDatabases
                  const classifiedDbs = group.databases.filter(d => d.classification)

                  // Build display label: prefer groupLabel, fallback to parentKey
                  const displayLabel = group.groupLabel || group.parentKey

                  return (
                    <Card
                      key={group.parentKey}
                      elevation={0}
                      onClick={() => { if (hasCore) setSelectedGroup(group) }}
                      sx={{
                        border: t => `${isSelected ? 2 : 1}px solid ${isSelected ? t.palette.primary.main : t.palette.divider}`,
                        cursor: hasCore ? 'pointer' : 'default',
                        opacity: hasCore ? 1 : 0.5,
                        transition: 'border-color 0.15s',
                        '&:hover': hasCore ? { borderColor: 'primary.main' } : {}
                      }}
                    >
                      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
                          <Stack direction='row' spacing={1} alignItems='center'>
                            <i className={hasCore ? 'tabler-folder-check' : 'tabler-folder'} style={{ fontSize: 18, color: hasCore ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-secondary)' }} />
                            <Typography variant='subtitle2'>{displayLabel}</Typography>
                            <Typography variant='caption' color='text.disabled'>
                              {classifiedDbs.length} base{classifiedDbs.length !== 1 ? 's' : ''}
                            </Typography>
                          </Stack>
                          <Stack direction='row' spacing={0.5}>
                            {hasCore && (
                              <CustomChip round='true' size='small' color='success' variant='tonal' label='Compatible' />
                            )}
                            {isSelected && (
                              <CustomChip round='true' size='small' color='primary' label='Seleccionado' />
                            )}
                          </Stack>
                        </Stack>
                        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                          {classifiedDbs.map(db => (
                            <CustomChip
                              key={db.databaseId}
                              round='true'
                              size='small'
                              variant='tonal'
                              color='info'
                              label={`${db.title} (${db.classification})`}
                            />
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>
              <Stack direction='row' justifyContent='space-between' sx={{ mt: 3 }}>
                <Button variant='tonal' color='secondary' onClick={() => setWizardStep(0)}>
                  Atrás
                </Button>
                <Button
                  variant='contained'
                  disabled={!selectedGroup}
                  onClick={() => setWizardStep(2)}
                >{GREENHOUSE_COPY.actions.continue}</Button>
              </Stack>
            </Box>
          )
        })()}

        {/* Step 2: Confirm and register */}
        {wizardStep === 2 && selectedGroup && (
          <Box>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              Confirma el mapeo de bases de datos para <strong>{clientName}</strong> (Space: {status.space.spaceName}).
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell component='th' scope='col'>Tipo</TableCell>
                    <TableCell component='th' scope='col'>Base de datos</TableCell>
                    <TableCell component='th' scope='col'>ID</TableCell>
                    <TableCell component='th' scope='col'>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(DB_LABELS).map(([key, meta]) => {
                    const db = selectedGroup.databases.find(d => d.classification === key)

                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Stack direction='row' spacing={1} alignItems='center'>
                            <i className={meta.icon} style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
                            <Typography variant='body2'>{meta.label}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' fontWeight={db ? 500 : 400} color={db ? 'text.primary' : 'text.disabled'}>
                            {db?.title || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                            {db ? formatShortDbId(db.databaseId) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {db ? (
                            <CustomChip round='true' size='small' color='success' variant='tonal' icon={<i className='tabler-check' />} label='Encontrado' />
                          ) : meta.required ? (
                            <CustomChip round='true' size='small' color='error' variant='tonal' icon={<i className='tabler-x' />} label='Faltante' />
                          ) : (
                            <CustomChip round='true' size='small' color='secondary' variant='tonal' label='Opcional' />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Validation check */}
            <Collapse in={!selectedGroup.databases.find(d => d.classification === 'proyectos') || !selectedGroup.databases.find(d => d.classification === 'tareas')}>
              <Alert severity='error' sx={{ mt: 2 }}>
                El grupo seleccionado no contiene las bases de datos requeridas (Proyectos y Tareas).
              </Alert>
            </Collapse>

            <Stack direction='row' justifyContent='space-between' sx={{ mt: 3 }}>
              <Button variant='tonal' color='secondary' onClick={() => setWizardStep(1)}>
                Atrás
              </Button>
              <Button
                variant='contained'
                color='success'
                startIcon={registering ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-plug-connected' />}
                onClick={handleRegister}
                disabled={
                  registering
                  || !selectedGroup.databases.find(d => d.classification === 'proyectos')
                  || !selectedGroup.databases.find(d => d.classification === 'tareas')
                }
              >
                {registering ? 'Registrando…' : 'Conectar y verificar'}
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default TenantNotionPanel
