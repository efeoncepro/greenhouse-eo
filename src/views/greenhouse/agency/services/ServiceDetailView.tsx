'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Typography from '@mui/material/Typography'

import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

import EmptyState from '@/components/greenhouse/EmptyState'

import tableStyles from '@core/styles/table.module.css'

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

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (date: string | null) => {
  if (!date) return '—'

  return new Date(date + 'T00:00:00').toLocaleDateString('es-CL', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

const formatTimestamp = (ts: string | null) => {
  if (!ts) return '—'

  return new Date(ts).toLocaleDateString('es-CL', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
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

const historyColumnHelper = createColumnHelper<ServiceHistoryEntry>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const historyTable = useReactTable({
    data: detail?.history ?? [],
    columns: historyColumns,
    state: { sorting: historySorting },
    onSortingChange: setHistorySorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

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
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{detail.notionProjectId}</Typography>
                    </Grid>
                  )}
                  {detail.createdBy && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Creado por</Typography>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{detail.createdBy}</Typography>
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
                    <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{detail.hubspotServiceId ?? '—'}</Typography>
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
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{detail.hubspotCompanyId}</Typography>
                    </Grid>
                  )}
                  {detail.hubspotDealId && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>HubSpot Deal ID</Typography>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{detail.hubspotDealId}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </TabPanel>
        </TabContext>
      </Grid>
    </Grid>
  )
}

// ── Info Row helper ────────────────────────────────────────────────────

const InfoRow = ({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography
      variant='body2'
      fontWeight={500}
      sx={mono ? { fontFamily: 'monospace', fontSize: '0.8rem' } : undefined}
    >
      {value ?? '—'}
    </Typography>
  </Box>
)

export default ServiceDetailView
