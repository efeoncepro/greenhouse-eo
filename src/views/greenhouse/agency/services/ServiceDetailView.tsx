'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
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

import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

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

import tableStyles from '@core/styles/table.module.css'
import { formatCurrency as formatGreenhouseCurrency, formatDate as formatGreenhouseDate, formatNumber as formatGreenhouseNumber } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

// ── Types ──────────────────────────────────────────────────────────────

interface ServiceHistoryEntry {
  historyId: string
  fieldChanged: string
  oldValue: string | null
  newValue: string | null
  changedBy: string | null
  changedAt: string
}

interface ServiceDetail {
  serviceId: string
  publicId: string | null
  name: string
  spaceId: string
  spaceName: string | null
  organizationId: string | null
  organizationName: string | null
  pipelineStage: string
  lineaDeServicio: string
  servicioEspecifico: string
  modalidad: string | null
  billingFrequency: string | null
  country: string | null
  totalCost: number | null
  amountPaid: number | null
  currency: string
  startDate: string | null
  targetEndDate: string | null
  hubspotServiceId: string | null
  hubspotCompanyId: string | null
  hubspotDealId: string | null
  notionProjectId: string | null
  hubspotLastSyncedAt: string | null
  hubspotSyncStatus: string | null
  createdBy: string | null
  updatedBy: string | null
  active: boolean
  status: string
  createdAt: string
  updatedAt: string
  history: ServiceHistoryEntry[]
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

// ── Helpers ────────────────────────────────────────────────────────────

const STAGE_COLOR: Record<string, 'success' | 'warning' | 'error' | 'primary' | 'info' | 'secondary'> = {
  onboarding: 'info',
  active: 'success',
  renewal_pending: 'warning',
  renewed: 'primary',
  closed: 'secondary',
  paused: 'error'
}

const STAGE_LABEL: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Activo',
  renewal_pending: 'En renovación',
  renewed: 'Renovado',
  closed: 'Cerrado',
  paused: 'Pausado'
}

const LINEA_LABEL: Record<string, string> = {
  globe: 'Globe',
  efeonce_digital: 'Efeonce Digital',
  reach: 'Reach',
  wave: 'Wave',
  crm_solutions: 'CRM Solutions'
}

const formatCurrency = (amount: number | null, currency: string) => {
  if (amount == null) return '—'

  return formatGreenhouseCurrency(amount, currency || 'CLP', {
  maximumFractionDigits: 0
}, 'es-CL')
}

const formatDate = (date: string | null) => {
  if (!date) return '—'

  return formatGreenhouseDate(new Date(date + 'T00:00:00'), {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}, 'es-CL')
}

const formatTimestamp = (ts: string | null) => {
  if (!ts) return '—'

  return formatGreenhouseDate(new Date(ts), {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}, 'es-CL')
}

const FIELD_LABELS: Record<string, string> = {
  pipeline_stage: 'Pipeline Stage',
  name: 'Nombre',
  total_cost: 'Costo total',
  amount_paid: 'Monto pagado',
  start_date: 'Fecha inicio',
  target_end_date: 'Fecha fin',
  status: 'Estado',
  modalidad: 'Modalidad',
  billing_frequency: 'Frecuencia',
  country: 'País',
  notion_project_id: 'Notion Project',
  hubspot_sync_status: 'Sync status'
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

const INDICATOR_LABELS: Record<ServiceSlaIndicatorCode, string> = {
  otd_pct: 'OTD',
  rpa_avg: 'RpA',
  ftr_pct: 'FTR',
  revision_rounds: 'Rondas de revisión',
  ttm_days: 'Time to market'
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

  if (unit === 'percent') {
    return `${formatGreenhouseNumber(value, {
  maximumFractionDigits: 1
}, 'es-CL')}%`
  }

  if (unit === 'days' || unit === 'rounds') {
    return String(Math.round(value))
  }

  return formatGreenhouseNumber(value, {
  maximumFractionDigits: 2
}, 'es-CL')
}

const formatSlaThreshold = (mode: ServiceSlaComparisonMode, value: number | null, unit: ServiceSlaUnit | null) => {
  if (value == null || !unit) return '—'

  const operator = mode === 'at_least' ? '≥' : '≤'

  return `${operator} ${formatSlaValue(value, unit)}`
}

const buildEmptySlaForm = (): ServiceSlaFormState => ({
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

const historyColumnHelper = createColumnHelper<ServiceHistoryEntry>()

 
const historyColumns: ColumnDef<ServiceHistoryEntry, any>[] = [
  historyColumnHelper.accessor('fieldChanged', {
    header: 'Campo',
    cell: ({ getValue }) => (
      <Typography variant='body2' fontWeight={600}>
        {FIELD_LABELS[getValue()] ?? getValue()}
      </Typography>
    )
  }),
  historyColumnHelper.accessor('oldValue', {
    header: 'Valor anterior',
    cell: ({ getValue }) => <Typography variant='body2' color='text.secondary'>{getValue() ?? '—'}</Typography>
  }),
  historyColumnHelper.accessor('newValue', {
    header: 'Valor nuevo',
    cell: ({ getValue }) => <Typography variant='body2'>{getValue() ?? '—'}</Typography>
  }),
  historyColumnHelper.accessor('changedAt', {
    header: 'Fecha',
    cell: ({ getValue }) => <Typography variant='caption'>{formatTimestamp(getValue())}</Typography>
  })
]

// ── Component ──────────────────────────────────────────────────────────

interface Props {
  serviceId: string
}

const ServiceDetailView = ({ serviceId }: Props) => {
  const [detail, setDetail] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('overview')
  const [historySorting, setHistorySorting] = useState<SortingState>([{ id: 'changedAt', desc: true }])
  const [slaReport, setSlaReport] = useState<ServiceSlaComplianceReport | null>(null)
  const [slaLoading, setSlaLoading] = useState(false)
  const [slaError, setSlaError] = useState<string | null>(null)
  const [slaSaving, setSlaSaving] = useState(false)
  const [slaDialogOpen, setSlaDialogOpen] = useState(false)
  const [slaForm, setSlaForm] = useState<ServiceSlaFormState>(buildEmptySlaForm())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/agency/services/${serviceId}`)

        if (!res.ok) {
          setError('No pudimos cargar el detalle del servicio.')
          setDetail(null)

          return
        }

        const json: ServiceDetail = await res.json()

        setDetail(json)
      } catch {
        setError('No pudimos cargar el detalle. Verifica tu conexión e intenta de nuevo.')
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [serviceId])

  const loadSlaReport = useCallback(async (refresh = false) => {
    if (!detail?.spaceId) return

    setSlaLoading(true)
    setSlaError(null)

    try {
      const params = new URLSearchParams({ spaceId: detail.spaceId })

      if (!refresh) params.set('refresh', '0')

      const res = await fetch(`/api/agency/services/${serviceId}/sla?${params.toString()}`)

      if (!res.ok) {
        const json = await res.json().catch(() => ({} as Record<string, unknown>))

        setSlaError(typeof json.error === 'string' ? json.error : 'No pudimos cargar el contrato SLA del servicio.')
        setSlaReport(null)

        return
      }

      const json = (await res.json()) as ServiceSlaComplianceReport

      setSlaReport(json)
    } catch {
      setSlaError('No pudimos cargar el contrato SLA del servicio. Verifica tu conexión e intenta de nuevo.')
      setSlaReport(null)
    } finally {
      setSlaLoading(false)
    }
  }, [detail?.spaceId, serviceId])

  useEffect(() => {
    if (!detail?.spaceId) return

    loadSlaReport(false)
  }, [detail?.spaceId, loadSlaReport])

  const historyTable = useReactTable({
    data: detail?.history ?? [],
    columns: historyColumns,
    state: { sorting: historySorting },
    onSortingChange: setHistorySorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const openNewSlaDialog = useCallback(() => {
    setSlaForm(buildEmptySlaForm())
    setSlaDialogOpen(true)
  }, [])

  const openEditSlaDialog = useCallback((definition: ServiceSlaDefinition) => {
    setSlaForm({
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
    setSlaDialogOpen(true)
  }, [])

  const closeSlaDialog = useCallback(() => {
    setSlaDialogOpen(false)
    setSlaSaving(false)
    setSlaForm(buildEmptySlaForm())
  }, [])

  const submitSlaForm = useCallback(async () => {
    if (!detail?.spaceId) return

    if (!slaForm.indicatorCode || !slaForm.comparisonMode || !slaForm.unit) {
      setSlaError('Completa el indicador, la comparación y la unidad antes de guardar.')

      return
    }

    if (!slaForm.indicatorFormula.trim() || !slaForm.measurementSource.trim()) {
      setSlaError('Completa la fórmula del indicador y su fuente antes de guardar.')

      return
    }

    const sloTargetValue = Number(slaForm.sloTargetValue)
    const slaTargetValue = Number(slaForm.slaTargetValue)
    const breachThreshold = slaForm.breachThreshold.trim() ? Number(slaForm.breachThreshold) : null
    const warningThreshold = slaForm.warningThreshold.trim() ? Number(slaForm.warningThreshold) : undefined
    const displayOrder = Number(slaForm.displayOrder || '0')

    if (!Number.isFinite(sloTargetValue) || !Number.isFinite(slaTargetValue)) {
      setSlaError('Los objetivos SLO y SLA deben ser numéricos.')

      return
    }

    if (slaForm.breachThreshold.trim() && !Number.isFinite(breachThreshold ?? NaN)) {
      setSlaError('El umbral de breach debe ser numérico.')

      return
    }

    if (slaForm.warningThreshold.trim() && !Number.isFinite(warningThreshold ?? NaN)) {
      setSlaError('El umbral de advertencia debe ser numérico.')

      return
    }

    setSlaSaving(true)
    setSlaError(null)

    try {
      const payload: Record<string, unknown> = {
        spaceId: detail.spaceId,
        indicatorCode: slaForm.indicatorCode,
        indicatorFormula: slaForm.indicatorFormula.trim(),
        measurementSource: slaForm.measurementSource.trim(),
        comparisonMode: slaForm.comparisonMode,
        unit: slaForm.unit,
        sliLabel: slaForm.sliLabel.trim() || null,
        sloTargetValue,
        slaTargetValue,
        breachThreshold,
        warningThreshold,
        displayOrder,
        active: slaForm.active
      }

      const res = await fetch(`/api/agency/services/${serviceId}/sla`, {
        method: slaForm.definitionId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          ...(slaForm.definitionId ? { definitionId: slaForm.definitionId } : {})
        })
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({} as Record<string, unknown>))

        setSlaError(typeof json.error === 'string' ? json.error : 'No pudimos guardar la definición SLA.')

        return
      }

      const json = (await res.json()) as { report: ServiceSlaComplianceReport }

      setSlaReport(json.report)
      closeSlaDialog()
    } catch {
      setSlaError('No pudimos guardar la definición SLA. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setSlaSaving(false)
    }
  }, [closeSlaDialog, detail?.spaceId, serviceId, slaForm])

  const deleteDefinition = useCallback(async (definitionId: string) => {
    if (!detail?.spaceId) return

    if (!window.confirm('Eliminar esta definición SLA?')) return

    setSlaSaving(true)
    setSlaError(null)

    try {
      const params = new URLSearchParams({ spaceId: detail.spaceId, definitionId })
      const res = await fetch(`/api/agency/services/${serviceId}/sla?${params.toString()}`, { method: 'DELETE' })

      if (!res.ok) {
        const json = await res.json().catch(() => ({} as Record<string, unknown>))

        setSlaError(typeof json.error === 'string' ? json.error : 'No pudimos eliminar la definición SLA.')

        return
      }

      const json = (await res.json()) as { report: ServiceSlaComplianceReport }

      setSlaReport(json.report)
    } catch {
      setSlaError('No pudimos eliminar la definición SLA. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setSlaSaving(false)
    }
  }, [detail?.spaceId, serviceId])

  const overallSlaLabel = slaLoading
    ? 'Cargando SLA...'
    : slaReport
      ? SLA_STATUS_LABELS[slaReport.overallStatus]
      : 'Sin lectura'

  const overallSlaColor: 'success' | 'warning' | 'error' | 'info' | 'secondary' = slaLoading
    ? 'info'
    : slaReport
      ? SLA_STATUS_COLORS[slaReport.overallStatus]
      : 'secondary'

  const definitionCount = slaReport?.summary.totalDefinitions ?? 0

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 12 }}>
        <CircularProgress />
        <Typography variant='body2' color='text.secondary'>Cargando detalle del servicio...</Typography>
      </Box>
    )
  }

  if (!detail) {
    return (
      <EmptyState
        icon={error ? 'tabler-cloud-off' : 'tabler-file-off'}
        title={error ? 'No pudimos cargar el servicio' : 'Servicio no encontrado'}
        description={error || 'No encontramos un servicio con ese identificador.'}
        action={
          error
            ? <Button variant='outlined' onClick={() => window.location.reload()}>Reintentar</Button>
            : <Button component={Link} href='/agency/services' variant='outlined'>Volver a servicios</Button>
        }
      />
    )
  }

  const amountRemaining = (detail.totalCost ?? 0) - (detail.amountPaid ?? 0)

  return (
    <>
      <Grid container spacing={6}>
      {/* Left sidebar */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ pt: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar
              variant='rounded'
              sx={{ width: 64, height: 64, mb: 2, bgcolor: `${STAGE_COLOR[detail.pipelineStage] ?? 'primary'}.lightOpacity` }}
            >
              <i className='tabler-briefcase' style={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant='h5' sx={{ mb: 1, textAlign: 'center' }}>{detail.name}</Typography>
            <CustomChip
              round='true'
              size='small'
              color={STAGE_COLOR[detail.pipelineStage] ?? 'secondary'}
              variant='tonal'
              label={STAGE_LABEL[detail.pipelineStage] ?? detail.pipelineStage}
              sx={{ mb: 3 }}
            />
            <Divider sx={{ width: '100%', mb: 3 }} />

            {/* Identity */}
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <InfoRow label='ID' value={detail.publicId ?? detail.serviceId} mono />
              <InfoRow label='Línea' value={LINEA_LABEL[detail.lineaDeServicio] ?? detail.lineaDeServicio} />
              <InfoRow label='Servicio' value={detail.servicioEspecifico.replace(/_/g, ' ')} />
              <InfoRow label='Space' value={detail.spaceName} />
              <InfoRow label='Organización' value={detail.organizationName} />
              <Divider />

              {/* Financial */}
              <InfoRow label='Costo total' value={formatCurrency(detail.totalCost, detail.currency)} />
              <InfoRow label='Pagado' value={formatCurrency(detail.amountPaid, detail.currency)} />
              <InfoRow label='Pendiente' value={formatCurrency(amountRemaining, detail.currency)} />
              <InfoRow label='Moneda' value={detail.currency} />
              <Divider />

              {/* Dates */}
              <InfoRow label='Inicio' value={formatDate(detail.startDate)} />
              <InfoRow label='Fin contractual' value={formatDate(detail.targetEndDate)} />
              <InfoRow label='Modalidad' value={detail.modalidad ?? '—'} />
              <InfoRow label='Facturación' value={detail.billingFrequency ?? '—'} />
              <InfoRow label='País' value={detail.country ?? '—'} />
              <InfoRow label='SLA' value={overallSlaLabel} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Right content with tabs */}
      <Grid size={{ xs: 12, md: 8 }}>
        <TabContext value={tab}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, mb: 4 }}>
            <CustomTabList onChange={(_, v: string) => setTab(v)}>
              <Tab label='Resumen' value='overview' icon={<i className='tabler-layout-dashboard' />} iconPosition='start' />
              <Tab label='Timeline' value='timeline' icon={<i className='tabler-history' />} iconPosition='start' />
              <Tab label='SLA' value='sla' icon={<i className='tabler-shield-check' />} iconPosition='start' />
              <Tab label='Integraciones' value='integrations' icon={<i className='tabler-plug-connected' />} iconPosition='start' />
            </CustomTabList>
          </Card>

          {/* Overview tab */}
          <TabPanel value='overview' sx={{ p: 0 }}>
            <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
              <CardHeader
                title='Información del servicio'
                avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-info-circle' /></Avatar>}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Creado</Typography>
                    <Typography variant='body2'>{formatTimestamp(detail.createdAt)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actualizado</Typography>
                    <Typography variant='body2'>{formatTimestamp(detail.updatedAt)}</Typography>
                  </Grid>
                  {detail.notionProjectId && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notion Project ID</Typography>
                      <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{detail.notionProjectId}</Typography>
                    </Grid>
                  )}
                  {detail.createdBy && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Creado por</Typography>
                      <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{detail.createdBy}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Timeline tab */}
          <TabPanel value='timeline' sx={{ p: 0 }}>
            <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
              <CardHeader
                title='Historial de cambios'
                avatar={<Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}><i className='tabler-history' /></Avatar>}
              />
              <Divider />
              <CardContent>
                {detail.history.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }} role='status'>
                    <Typography variant='body2' color='text.secondary'>
                      Sin cambios registrados aún.
                    </Typography>
                  </Box>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                      <thead>
                        {historyTable.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <th
                                key={header.id}
                                onClick={header.column.getToggleSortingHandler()}
                                className={classnames({
                                  'cursor-pointer select-none': header.column.getCanSort()
                                })}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {historyTable.getRowModel().rows.map(row => (
                          <tr key={row.id}>
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          {/* SLA tab */}
          <TabPanel value='sla' sx={{ p: 0 }}>
            <Stack spacing={4}>
              <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                <CardHeader
                  title='Contrato SLA por servicio'
                  subheader='Aquí se declara qué indicador se mide, con qué fuente y contra qué umbral se evalúa.'
                  action={
                    <Stack direction='row' spacing={1}>
                      <Button variant='outlined' size='small' onClick={() => loadSlaReport(true)} disabled={slaLoading}>
                        Actualizar
                      </Button>
                      <Button variant='contained' size='small' onClick={openNewSlaDialog}>
                        Nueva definición
                      </Button>
                    </Stack>
                  }
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2.5}>
                    <Stack direction='row' flexWrap='wrap' gap={1}>
                      <CustomChip round='true' size='small' color={overallSlaColor} variant='tonal' label={overallSlaLabel} />
                      <CustomChip round='true' size='small' color='secondary' variant='tonal' label={`${definitionCount} definición${definitionCount === 1 ? '' : 'es'}`} />
                      <CustomChip
                        round='true'
                        size='small'
                        color={slaReport?.summary.sourceUnavailableCount ? 'warning' : 'success'}
                        variant='tonal'
                        label={
                          slaReport
                            ? `${slaReport.summary.sourceUnavailableCount} sin fuente`
                            : 'Sin datos de fuente'
                        }
                      />
                    </Stack>

                    {slaError ? (
                      <Alert severity='error' variant='outlined' onClose={() => setSlaError(null)}>
                        {slaError}
                      </Alert>
                    ) : null}

                    {slaLoading ? <LinearProgress /> : null}

                    {!slaLoading && slaReport?.overallStatus === 'breached' ? (
                      <Alert severity='error' variant='outlined'>
                        <AlertTitle>Incumplimiento activo</AlertTitle>
                        Hay al menos una definición fuera del umbral contractual. Revisa el indicador y la fuente antes de cambiar el target.
                      </Alert>
                    ) : null}

                    {!slaLoading && slaReport?.overallStatus === 'at_risk' ? (
                      <Alert severity='warning' variant='outlined'>
                        <AlertTitle>Contrato en riesgo</AlertTitle>
                        Al menos una definición se está acercando al breach. Conviene revisar la tendencia y la evidencia disponible.
                      </Alert>
                    ) : null}

                    {!slaLoading && slaReport?.overallStatus === 'partial' ? (
                      <Alert severity='info' variant='outlined'>
                        <AlertTitle>Lectura parcial</AlertTitle>
                        Hay definiciones sin fuente defendible o con evidencia incompleta. El estado sigue siendo honesto hasta que exista materialización canónica.
                      </Alert>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>

              {slaLoading ? (
                <Card variant='outlined'>
                  <CardContent sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CircularProgress />
                    <Typography variant='body2' color='text.secondary'>
                      Cargando contrato SLA del servicio...
                    </Typography>
                  </CardContent>
                </Card>
              ) : slaReport && slaReport.items.length > 0 ? (
                <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                  <CardHeader title='Definiciones y cumplimiento' subheader='SLI, SLO y SLA se muestran juntos para no perder la cadena operativa.' />
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
                          {slaReport.items.map(item => (
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
                                    Umbral de breach {formatSlaThreshold(item.definition.comparisonMode, item.definition.breachThreshold, item.definition.unit)}
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
                                    Delta {item.deltaToTarget == null ? '—' : `${item.deltaToTarget > 0 ? '+' : ''}${formatGreenhouseNumber(item.deltaToTarget, {
  maximumFractionDigits: 2
}, 'es-CL')}`}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant='body2' sx={{ maxWidth: 240 }}>
                                    {item.evidence.sourceLabel}
                                  </Typography>
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
                                  <Button size='small' variant='outlined' onClick={() => openEditSlaDialog(item.definition)}>{GREENHOUSE_COPY.actions.edit}</Button>
                                  <Button
                                    size='small'
                                    variant='text'
                                    color='error'
                                    onClick={() => deleteDefinition(item.definition.definitionId)}
                                    disabled={slaSaving}
                                  >{GREENHOUSE_COPY.actions.delete}</Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  icon='tabler-shield-x'
                  title='Sin SLA definido'
                  description='Este servicio todavía no tiene una definición de SLI, SLO ni SLA. Crea la primera para empezar a medir cumplimiento.'
                  action={<Button variant='contained' onClick={openNewSlaDialog}>Crear definición</Button>}
                />
              )}
            </Stack>
          </TabPanel>

          {/* Integrations tab */}
          <TabPanel value='integrations' sx={{ p: 0 }}>
            <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
              <CardHeader
                title='HubSpot'
                avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><Box component='img' src='/images/integrations/hubspot.svg' alt='HubSpot' sx={{ width: 22, height: 22 }} /></Avatar>}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>HubSpot Service ID</Typography>
                    <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{detail.hubspotServiceId ?? '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sync Status</Typography>
                    <Typography variant='body2'>{detail.hubspotSyncStatus ?? '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Última sincronización</Typography>
                    <Typography variant='body2'>{formatTimestamp(detail.hubspotLastSyncedAt)}</Typography>
                  </Grid>
                  {detail.hubspotCompanyId && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>HubSpot Company ID</Typography>
                      <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{detail.hubspotCompanyId}</Typography>
                    </Grid>
                  )}
                  {detail.hubspotDealId && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>HubSpot Deal ID</Typography>
                      <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{detail.hubspotDealId}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </TabPanel>
        </TabContext>
      </Grid>
      </Grid>

      <Dialog open={slaDialogOpen} onClose={closeSlaDialog} maxWidth='md' fullWidth>
        <DialogTitle>{slaForm.definitionId ? 'Editar definición SLA' : 'Nueva definición SLA'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label='Indicador'
              value={slaForm.indicatorCode}
              onChange={event => setSlaForm(prev => ({ ...prev, indicatorCode: event.target.value as ServiceSlaIndicatorCode }))}
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
              value={slaForm.comparisonMode}
              onChange={event => setSlaForm(prev => ({ ...prev, comparisonMode: event.target.value as ServiceSlaComparisonMode }))}
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
              value={slaForm.unit}
              onChange={event => setSlaForm(prev => ({ ...prev, unit: event.target.value as ServiceSlaUnit }))}
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
            value={slaForm.sliLabel}
            onChange={event => setSlaForm(prev => ({ ...prev, sliLabel: event.target.value }))}
            fullWidth
            placeholder='OTD del servicio'
          />

          <TextField
            label='Fórmula del indicador'
            value={slaForm.indicatorFormula}
            onChange={event => setSlaForm(prev => ({ ...prev, indicatorFormula: event.target.value }))}
            fullWidth
            required
            helperText='Explica qué calcula el indicador y cómo se lee sin asumir fuentes inventadas.'
          />

          <TextField
            label='Fuente de medición'
            value={slaForm.measurementSource}
            onChange={event => setSlaForm(prev => ({ ...prev, measurementSource: event.target.value }))}
            fullWidth
            required
            helperText='Describe la fuente canónica que respalda la lectura en runtime.'
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label='Objetivo SLO'
              value={slaForm.sloTargetValue}
              onChange={event => setSlaForm(prev => ({ ...prev, sloTargetValue: event.target.value }))}
              fullWidth
              required
            />
            <TextField
              label='Objetivo SLA'
              value={slaForm.slaTargetValue}
              onChange={event => setSlaForm(prev => ({ ...prev, slaTargetValue: event.target.value }))}
              fullWidth
              required
            />
            <TextField
              label='Orden'
              value={slaForm.displayOrder}
              onChange={event => setSlaForm(prev => ({ ...prev, displayOrder: event.target.value }))}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label='Umbral de advertencia'
              value={slaForm.warningThreshold}
              onChange={event => setSlaForm(prev => ({ ...prev, warningThreshold: event.target.value }))}
              fullWidth
              helperText='Opcional. Si se omite, el sistema usa el objetivo SLA.'
            />
            <TextField
              label='Umbral de breach'
              value={slaForm.breachThreshold}
              onChange={event => setSlaForm(prev => ({ ...prev, breachThreshold: event.target.value }))}
              fullWidth
              helperText='Opcional. Si se omite, el sistema usa el objetivo SLA.'
            />
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={slaForm.active}
                onChange={event => setSlaForm(prev => ({ ...prev, active: event.target.checked }))}
              />
            }
            label='Definición activa'
          />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeSlaDialog} color='secondary' disabled={slaSaving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={submitSlaForm} disabled={slaSaving}>
            {slaSaving ? 'Guardando...' : 'Guardar definición'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ── Info Row helper ────────────────────────────────────────────────────

const InfoRow = ({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography
      variant='body2'
      fontWeight={500}
      sx={mono ? { fontSize: '0.8rem' } : undefined}
    >
      {value ?? '—'}
    </Typography>
  </Box>
)

export default ServiceDetailView
