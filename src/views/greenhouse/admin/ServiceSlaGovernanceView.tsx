'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CardActionArea from '@mui/material/CardActionArea'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
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

import CustomChip from '@core/components/mui/Chip'

import EmptyState from '@/components/greenhouse/EmptyState'
import type {
  ServiceSlaComplianceItem,
  ServiceSlaComplianceReport,
  ServiceSlaComparisonMode,
  ServiceSlaDefinition,
  ServiceSlaIndicatorCode,
  ServiceSlaOverallStatus,
  ServiceSlaUnit
} from '@/types/service-sla'
import type { ServiceListItem } from '@/lib/services/service-store'

type Props = {
  services: ServiceListItem[]
}

type ServiceSlaFormState = {
  definitionId: string | null
  indicatorCode: ServiceSlaIndicatorCode | ''
  indicatorFormula: string
  measurementSource: string
  comparisonMode: ServiceSlaComparisonMode | ''
  unit: ServiceSlaUnit | ''
  sliLabel: string
  sloTargetValue: string
  slaTargetValue: string
  breachThreshold: string
  warningThreshold: string
  displayOrder: string
  active: boolean
}

const INDICATOR_LABELS: Record<ServiceSlaIndicatorCode, string> = {
  otd_pct: 'OTD',
  rpa_avg: 'RpA',
  ftr_pct: 'FTR',
  revision_rounds: 'Rondas de revisión',
  ttm_days: 'Time to market'
}

const COMPARISON_LABELS: Record<ServiceSlaComparisonMode, string> = {
  at_least: 'Mínimo',
  at_most: 'Máximo'
}

const UNIT_LABELS: Record<ServiceSlaUnit, string> = {
  percent: '%',
  ratio: 'Ratio',
  rounds: 'Rondas',
  days: 'Días'
}

const SLA_STATUS_LABELS: Record<ServiceSlaOverallStatus, string> = {
  healthy: 'Cumple',
  at_risk: 'En riesgo',
  breached: 'Incumplido',
  partial: 'Datos parciales',
  no_sla_defined: 'Sin SLA'
}

const SLA_STATUS_COLORS: Record<ServiceSlaOverallStatus, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  healthy: 'success',
  at_risk: 'warning',
  breached: 'error',
  partial: 'info',
  no_sla_defined: 'secondary'
}

const SLA_ITEM_STATUS_LABELS: Record<ServiceSlaComplianceItem['complianceStatus'], string> = {
  met: 'Cumple',
  at_risk: 'En riesgo',
  breached: 'Incumplido',
  source_unavailable: 'Sin fuente',
  no_sla_defined: 'Sin SLA'
}

const SLA_ITEM_STATUS_COLORS: Record<ServiceSlaComplianceItem['complianceStatus'], 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  met: 'success',
  at_risk: 'warning',
  breached: 'error',
  source_unavailable: 'info',
  no_sla_defined: 'secondary'
}

const SLA_TREND_LABELS: Record<ServiceSlaComplianceItem['trendStatus'], string> = {
  improving: 'Mejorando',
  stable: 'Estable',
  degrading: 'Degradando',
  unknown: 'Sin tendencia'
}

const formatSlaValue = (value: number | null, unit: ServiceSlaUnit | null) => {
  if (value == null) return '—'

  if (unit === 'percent') return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)}%`
  if (unit === 'days' || unit === 'rounds') return String(Math.round(value))

  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value)
}

const formatSlaThreshold = (mode: ServiceSlaComparisonMode, value: number | null, unit: ServiceSlaUnit | null) => {
  if (value == null || !unit) return '—'

  const operator = mode === 'at_least' ? '≥' : '≤'

  return `${operator} ${formatSlaValue(value, unit)}`
}

const buildEmptyForm = (): ServiceSlaFormState => ({
  definitionId: null,
  indicatorCode: '',
  indicatorFormula: '',
  measurementSource: '',
  comparisonMode: '',
  unit: '',
  sliLabel: '',
  sloTargetValue: '',
  slaTargetValue: '',
  breachThreshold: '',
  warningThreshold: '',
  displayOrder: '0',
  active: true
})

const serviceStageLabel: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Activo',
  renewal_pending: 'En renovación',
  renewed: 'Renovado',
  closed: 'Cerrado',
  paused: 'Pausado'
}

const serviceStageColor: Record<string, 'success' | 'warning' | 'error' | 'primary' | 'info' | 'secondary'> = {
  onboarding: 'info',
  active: 'success',
  renewal_pending: 'warning',
  renewed: 'primary',
  closed: 'secondary',
  paused: 'error'
}

const ServiceSlaGovernanceView = ({ services }: Props) => {
  const [search, setSearch] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.serviceId ?? '')
  const [report, setReport] = useState<ServiceSlaComplianceReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ServiceSlaFormState>(buildEmptyForm())

  const selectedService = useMemo(
    () => services.find(service => service.serviceId === selectedServiceId) ?? null,
    [selectedServiceId, services]
  )

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return services

    return services.filter(service =>
      [
        service.name,
        service.publicId ?? '',
        service.spaceName ?? '',
        service.organizationName ?? '',
        service.lineaDeServicio,
        service.servicioEspecifico
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [search, services])

  const loadReport = useCallback(async (service: ServiceListItem, refresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ spaceId: service.spaceId })

      if (!refresh) params.set('refresh', '0')

      const res = await fetch(`/api/agency/services/${service.serviceId}/sla?${params.toString()}`)

      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as Record<string, unknown>))

        setError(typeof payload.error === 'string' ? payload.error : 'No pudimos cargar el contrato SLA.')
        setReport(null)

        return
      }

      setReport((await res.json()) as ServiceSlaComplianceReport)
    } catch {
      setError('No pudimos cargar el contrato SLA. Verifica tu conexión e intenta de nuevo.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedService) {
      setReport(null)
      
return
    }

    loadReport(selectedService, false)
  }, [loadReport, selectedService])

  const openCreateDialog = () => {
    setForm(buildEmptyForm())
    setDialogOpen(true)
  }

  const openEditDialog = (definition: ServiceSlaDefinition) => {
    setForm({
      definitionId: definition.definitionId,
      indicatorCode: definition.indicatorCode,
      indicatorFormula: definition.indicatorFormula,
      measurementSource: definition.measurementSource,
      comparisonMode: definition.comparisonMode,
      unit: definition.unit,
      sliLabel: definition.sliLabel ?? '',
      sloTargetValue: String(definition.sloTargetValue),
      slaTargetValue: String(definition.slaTargetValue),
      breachThreshold: definition.breachThreshold == null ? '' : String(definition.breachThreshold),
      warningThreshold: definition.warningThreshold == null ? '' : String(definition.warningThreshold),
      displayOrder: String(definition.displayOrder),
      active: definition.active
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setSaving(false)
    setForm(buildEmptyForm())
  }

  const saveDefinition = async () => {
    if (!selectedService) return

    if (!form.indicatorCode || !form.comparisonMode || !form.unit) {
      setError('Completa el indicador, la comparación y la unidad antes de guardar.')

      return
    }

    if (!form.indicatorFormula.trim() || !form.measurementSource.trim()) {
      setError('Completa la fórmula del indicador y su fuente antes de guardar.')

      return
    }

    const sloTargetValue = Number(form.sloTargetValue)
    const slaTargetValue = Number(form.slaTargetValue)
    const breachThreshold = form.breachThreshold.trim() ? Number(form.breachThreshold) : null
    const warningThreshold = form.warningThreshold.trim() ? Number(form.warningThreshold) : undefined
    const displayOrder = Number(form.displayOrder || '0')

    if (!Number.isFinite(sloTargetValue) || !Number.isFinite(slaTargetValue)) {
      setError('Los objetivos SLO y SLA deben ser numéricos.')
      
return
    }

    if (form.breachThreshold.trim() && !Number.isFinite(breachThreshold ?? NaN)) {
      setError('El umbral de breach debe ser numérico.')
      
return
    }

    if (form.warningThreshold.trim() && !Number.isFinite(warningThreshold ?? NaN)) {
      setError('El umbral de advertencia debe ser numérico.')
      
return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/agency/services/${selectedService.serviceId}/sla`, {
        method: form.definitionId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: selectedService.spaceId,
          ...(form.definitionId ? { definitionId: form.definitionId } : {}),
          indicatorCode: form.indicatorCode,
          indicatorFormula: form.indicatorFormula.trim(),
          measurementSource: form.measurementSource.trim(),
          comparisonMode: form.comparisonMode,
          unit: form.unit,
          sliLabel: form.sliLabel.trim() || null,
          sloTargetValue,
          slaTargetValue,
          breachThreshold,
          warningThreshold,
          displayOrder,
          active: form.active
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as Record<string, unknown>))

        setError(typeof payload.error === 'string' ? payload.error : 'No pudimos guardar la definición SLA.')
        
return
      }

      const payload = (await res.json()) as { report: ServiceSlaComplianceReport }

      setReport(payload.report)
      closeDialog()
    } catch {
      setError('No pudimos guardar la definición SLA. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const deleteDefinition = async (definitionId: string) => {
    if (!selectedService) return
    if (!window.confirm('Eliminar esta definición SLA?')) return

    setSaving(true)
    setError(null)

    try {
      const params = new URLSearchParams({ spaceId: selectedService.spaceId, definitionId })

      const res = await fetch(`/api/agency/services/${selectedService.serviceId}/sla?${params.toString()}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as Record<string, unknown>))

        setError(typeof payload.error === 'string' ? payload.error : 'No pudimos eliminar la definición SLA.')
        
return
      }

      const payload = (await res.json()) as { report: ServiceSlaComplianceReport }

      setReport(payload.report)
    } catch {
      setError('No pudimos eliminar la definición SLA. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const overallStatus = report?.overallStatus ?? 'no_sla_defined'
  const definitionCount = report?.summary.totalDefinitions ?? 0

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(34,197,94,0.10) 42%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <CustomChip label='SLA Governance' size='small' color='info' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>Contrato SLA por servicio</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
              Este panel deja explícito qué SLI se mide, cuál es el SLO operativo y cuál es el compromiso contractual.
              Si no hay fuente defendible, el estado se muestra como fuente no disponible.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href='/admin' variant='outlined'>
                Volver a Admin Center
              </Button>
              <Button component={Link} href='/agency/services' variant='contained'>
                Abrir servicios
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant='outlined'>
            <CardHeader
              title='Servicios'
              subheader='Selecciona un servicio para revisar o ajustar sus definiciones.'
            />
            <CardContent sx={{ pt: 0, display: 'grid', gap: 2 }}>
              <TextField
                value={search}
                onChange={event => setSearch(event.target.value)}
                size='small'
                label='Buscar servicio'
                placeholder='Nombre, space o línea'
                fullWidth
              />
              <Box sx={{ maxHeight: 700, overflowY: 'auto', pr: 1 }}>
                <Stack spacing={1.25}>
                  {filteredServices.map(service => {
                    const selected = service.serviceId === selectedServiceId

                    return (
                      <Card
                        key={service.serviceId}
                        variant='outlined'
                        sx={{
                          borderColor: selected ? 'primary.main' : 'divider',
                          bgcolor: selected ? 'action.selected' : 'background.paper',
                          transition: theme => theme.transitions.create(['border-color', 'background-color'], {
                            duration: theme.transitions.duration.shortest
                          })
                        }}
                      >
                        <CardActionArea onClick={() => setSelectedServiceId(service.serviceId)}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack spacing={0.75}>
                              <Stack direction='row' alignItems='flex-start' justifyContent='space-between' gap={1}>
                                <Box>
                                  <Typography variant='body2' fontWeight={600}>
                                    {service.name}
                                  </Typography>
                                  <Typography variant='caption' color='text.secondary'>
                                    {service.spaceName || service.spaceId}
                                  </Typography>
                                </Box>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  color={serviceStageColor[service.pipelineStage] ?? 'secondary'}
                                  variant='tonal'
                                  label={serviceStageLabel[service.pipelineStage] ?? service.pipelineStage}
                                />
                              </Stack>
                              <Typography variant='caption' color='text.secondary'>
                                {service.lineaDeServicio} · {service.servicioEspecifico}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {service.publicId ?? service.serviceId}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    )
                  })}

                  {filteredServices.length === 0 ? (
                    <Alert severity='info' variant='outlined'>
                      No encontramos servicios con ese filtro.
                    </Alert>
                  ) : null}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 9 }}>
          <Stack spacing={4}>
            <Card variant='outlined'>
              <CardHeader
                title={selectedService?.name ?? 'Selecciona un servicio'}
                subheader={
                  selectedService
                    ? `${selectedService.spaceName || selectedService.spaceId} · ${selectedService.lineaDeServicio} · ${selectedService.servicioEspecifico}`
                    : 'No hay un servicio seleccionado.'
                }
                action={
                  selectedService ? (
                    <Stack direction='row' spacing={1}>
                      <Button variant='outlined' size='small' onClick={() => selectedService && loadReport(selectedService, true)} disabled={loading}>
                        Actualizar
                      </Button>
                      <Button variant='contained' size='small' onClick={openCreateDialog}>
                        Nueva definición
                      </Button>
                    </Stack>
                  ) : null
                }
              />
              <Divider />
              <CardContent>
                {selectedService ? (
                  <Stack spacing={2.5}>
                    <Stack direction='row' flexWrap='wrap' gap={1}>
                      <CustomChip round='true' size='small' color={SLA_STATUS_COLORS[overallStatus]} variant='tonal' label={SLA_STATUS_LABELS[overallStatus]} />
                      <CustomChip round='true' size='small' color='secondary' variant='tonal' label={`${definitionCount} definición${definitionCount === 1 ? '' : 'es'}`} />
                      <CustomChip round='true' size='small' color={report?.summary.sourceUnavailableCount ? 'warning' : 'success'} variant='tonal' label={report ? `${report.summary.sourceUnavailableCount} sin fuente` : 'Sin lectura'} />
                    </Stack>

                    {error ? (
                      <Alert severity='error' variant='outlined' onClose={() => setError(null)}>
                        {error}
                      </Alert>
                    ) : null}

                    {loading ? <LinearProgress /> : null}

                    {!loading && overallStatus === 'breached' ? (
                      <Alert severity='error' variant='outlined'>
                        <AlertTitle>Incumplimiento activo</AlertTitle>
                        Hay al menos una definición fuera del umbral contractual. Revisa la fuente y el target antes de promover cambios.
                      </Alert>
                    ) : null}

                    {!loading && overallStatus === 'at_risk' ? (
                      <Alert severity='warning' variant='outlined'>
                        <AlertTitle>Contrato en riesgo</AlertTitle>
                        Una o más definiciones se están acercando al breach. Conviene revisar la tendencia y la evidencia disponible.
                      </Alert>
                    ) : null}

                    {!loading && overallStatus === 'partial' ? (
                      <Alert severity='info' variant='outlined'>
                        <AlertTitle>Lectura parcial</AlertTitle>
                        Al menos una definición no tiene fuente defendible hoy. No la maquilles: el estado debe seguir siendo transparente.
                      </Alert>
                    ) : null}
                  </Stack>
                ) : (
                  <EmptyState
                    icon='tabler-shield-x'
                    title='Selecciona un servicio'
                    description='El panel de gobierno SLA necesita un servicio concreto para mostrar sus definiciones y su estado.'
                  />
                )}
              </CardContent>
            </Card>

            {selectedService && loading ? (
              <Card variant='outlined'>
                <CardContent sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <CircularProgress />
                  <Typography variant='body2' color='text.secondary'>
                    Cargando contrato SLA...
                  </Typography>
                </CardContent>
              </Card>
            ) : null}

            {selectedService && report && report.items.length > 0 ? (
              <Card variant='outlined'>
                <CardHeader
                  title='Definiciones y cumplimiento'
                  subheader='SLI, SLO y SLA quedan visibles juntos para que el contrato no se vuelva ambiguo.'
                />
                <Divider />
                <CardContent>
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Indicador</TableCell>
                          <TableCell>Objetivos</TableCell>
                          <TableCell>Actual</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell>Tendencia</TableCell>
                          <TableCell>Fuente</TableCell>
                          <TableCell align='right'>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {report.items.map(item => (
                          <TableRow key={item.definition.definitionId} hover>
                            <TableCell sx={{ minWidth: 260 }}>
                              <Stack spacing={0.25}>
                                <Typography variant='body2' fontWeight={600}>
                                  {item.definition.sliLabel || INDICATOR_LABELS[item.definition.indicatorCode]}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {item.definition.indicatorFormula}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {item.definition.measurementSource}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ minWidth: 180 }}>
                              <Stack spacing={0.5}>
                                <Typography variant='body2'>
                                  SLO {formatSlaThreshold(item.definition.comparisonMode, item.definition.sloTargetValue, item.definition.unit)}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  SLA {formatSlaThreshold(item.definition.comparisonMode, item.definition.slaTargetValue, item.definition.unit)}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  Breach {formatSlaThreshold(item.definition.comparisonMode, item.definition.breachThreshold, item.definition.unit)}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography variant='body2' fontWeight={600}>
                                  {formatSlaValue(item.actualValue, item.definition.unit)}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {item.sourcePeriodYear && item.sourcePeriodMonth
                                    ? `${item.sourcePeriodYear}-${String(item.sourcePeriodMonth).padStart(2, '0')}`
                                    : 'Sin período'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  color={SLA_ITEM_STATUS_COLORS[item.complianceStatus]}
                                  variant='tonal'
                                  label={SLA_ITEM_STATUS_LABELS[item.complianceStatus]}
                                />
                                <Typography variant='caption' color='text.secondary'>
                                  Confianza {item.confidenceLevel ?? 'sin dato'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography variant='body2'>
                                  {SLA_TREND_LABELS[item.trendStatus]}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  Delta {item.deltaToTarget == null ? '—' : `${item.deltaToTarget > 0 ? '+' : ''}${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(item.deltaToTarget)}`}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography variant='body2'>{item.evidence.sourceLabel}</Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {item.evidence.sourcePeriodLabel || 'Sin período de fuente'}
                                </Typography>
                                {item.evidence.reasons.length > 0 ? (
                                  <Typography variant='caption' color='text.secondary'>
                                    {item.evidence.reasons[0]}
                                  </Typography>
                                ) : null}
                              </Stack>
                            </TableCell>
                            <TableCell align='right'>
                              <Stack direction='row' spacing={1} justifyContent='flex-end'>
                                <Button size='small' variant='outlined' onClick={() => openEditDialog(item.definition)}>
                                  Editar
                                </Button>
                                <Button size='small' variant='text' color='error' onClick={() => deleteDefinition(item.definition.definitionId)} disabled={saving}>
                                  Eliminar
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            ) : null}

            {selectedService && report && report.items.length === 0 ? (
              <EmptyState
                icon='tabler-shield-x'
                title='Sin SLA definido'
                description='Este servicio todavía no tiene una definición de SLI, SLO ni SLA. Crea la primera para empezar a medir cumplimiento.'
                action={<Button variant='contained' onClick={openCreateDialog}>Crear definición</Button>}
              />
            ) : null}
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth='md' fullWidth>
        <DialogTitle>{form.definitionId ? 'Editar definición SLA' : 'Nueva definición SLA'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label='Indicador'
                value={form.indicatorCode}
                onChange={event => setForm(prev => ({ ...prev, indicatorCode: event.target.value as ServiceSlaIndicatorCode }))}
                fullWidth
                required
              >
                {Object.entries(INDICATOR_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label='Comparación'
                value={form.comparisonMode}
                onChange={event => setForm(prev => ({ ...prev, comparisonMode: event.target.value as ServiceSlaComparisonMode }))}
                fullWidth
                required
              >
                {Object.entries(COMPARISON_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label='Unidad'
                value={form.unit}
                onChange={event => setForm(prev => ({ ...prev, unit: event.target.value as ServiceSlaUnit }))}
                fullWidth
                required
              >
                {Object.entries(UNIT_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label='Etiqueta SLI'
              value={form.sliLabel}
              onChange={event => setForm(prev => ({ ...prev, sliLabel: event.target.value }))}
              fullWidth
              placeholder='OTD del servicio'
            />

            <TextField
              label='Fórmula del indicador'
              value={form.indicatorFormula}
              onChange={event => setForm(prev => ({ ...prev, indicatorFormula: event.target.value }))}
              fullWidth
              required
              helperText='Explica qué calcula el indicador y cómo se lee sin asumir fuentes inventadas.'
            />

            <TextField
              label='Fuente de medición'
              value={form.measurementSource}
              onChange={event => setForm(prev => ({ ...prev, measurementSource: event.target.value }))}
              fullWidth
              required
              helperText='Describe la fuente canónica que respalda la lectura en runtime.'
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label='Objetivo SLO'
                value={form.sloTargetValue}
                onChange={event => setForm(prev => ({ ...prev, sloTargetValue: event.target.value }))}
                fullWidth
                required
              />
              <TextField
                label='Objetivo SLA'
                value={form.slaTargetValue}
                onChange={event => setForm(prev => ({ ...prev, slaTargetValue: event.target.value }))}
                fullWidth
                required
              />
              <TextField
                label='Orden'
                value={form.displayOrder}
                onChange={event => setForm(prev => ({ ...prev, displayOrder: event.target.value }))}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label='Umbral de advertencia'
                value={form.warningThreshold}
                onChange={event => setForm(prev => ({ ...prev, warningThreshold: event.target.value }))}
                fullWidth
                helperText='Opcional. Si se omite, el sistema usa el objetivo SLA.'
              />
              <TextField
                label='Umbral de breach'
                value={form.breachThreshold}
                onChange={event => setForm(prev => ({ ...prev, breachThreshold: event.target.value }))}
                fullWidth
                helperText='Opcional. Si se omite, el sistema usa el objetivo SLA.'
              />
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={event => setForm(prev => ({ ...prev, active: event.target.checked }))}
                />
              }
              label='Definición activa'
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDialog} color='secondary' disabled={saving}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={saveDefinition} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar definición'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default ServiceSlaGovernanceView
