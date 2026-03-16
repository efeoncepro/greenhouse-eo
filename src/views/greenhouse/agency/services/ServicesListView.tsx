'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

// ── Types ──────────────────────────────────────────────────────────────

interface ServiceListItem {
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
  totalCost: number | null
  currency: string
  startDate: string | null
  targetEndDate: string | null
  active: boolean
  status: string
}

interface ListResponse {
  items: ServiceListItem[]
  total: number
  page: number
  pageSize: number
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

// ── Component ──────────────────────────────────────────────────────────

const ServicesListView = () => {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [lineaFilter, setLineaFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams({
      page: String(page + 1),
      pageSize: String(pageSize)
    })

    if (searchDebounced) params.set('search', searchDebounced)
    if (lineaFilter) params.set('lineaDeServicio', lineaFilter)
    if (stageFilter) params.set('pipelineStage', stageFilter)

    try {
      const res = await fetch(`/api/agency/services?${params}`)
      const json: ListResponse = await res.json()

      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchDebounced, lineaFilter, stageFilter])

  useEffect(() => { loadData() }, [loadData])

  // Compute KPIs from current data
  const items = data?.items ?? []
  const totalCount = data?.total ?? 0
  const activeCount = items.filter(s => s.pipelineStage === 'active').length
  const renewalCount = items.filter(s => s.pipelineStage === 'renewal_pending').length
  const onboardingCount = items.filter(s => s.pipelineStage === 'onboarding').length

  const kpis = [
    { title: 'Total servicios', stats: String(totalCount), avatarIcon: 'tabler-packages', avatarColor: 'primary' as const, subtitle: 'En esta vista' },
    { title: 'Activos', stats: String(activeCount), avatarIcon: 'tabler-circle-check', avatarColor: 'success' as const, subtitle: 'Pipeline activo' },
    { title: 'En renovación', stats: String(renewalCount), avatarIcon: 'tabler-refresh', avatarColor: 'warning' as const, subtitle: 'Pendientes de renovar' },
    { title: 'Onboarding', stats: String(onboardingCount), avatarIcon: 'tabler-rocket', avatarColor: 'info' as const, subtitle: 'En implementación' }
  ]

  return (
    <Grid container spacing={6}>
      {/* KPI Row */}
      {kpis.map((kpi, i) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
          <HorizontalWithSubtitle {...kpi} />
        </Grid>
      ))}

      {/* Filters + Table */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title='Servicios'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-packages' /></Avatar>}
          />
          <Divider />
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
              <CustomTextField
                placeholder='Buscar por nombre o ID...'
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
                sx={{ minWidth: 250 }}
              />
              <CustomTextField
                select
                label='Línea'
                value={lineaFilter}
                onChange={e => { setLineaFilter(e.target.value); setPage(0) }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value=''>Todas</MenuItem>
                {Object.entries(LINEA_LABEL).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label='Stage'
                value={stageFilter}
                onChange={e => { setStageFilter(e.target.value); setPage(0) }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value=''>Todos</MenuItem>
                {Object.entries(STAGE_LABEL).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : items.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>No hay servicios</Typography>
                <Typography variant='body2' color='text.secondary'>
                  No se encontraron servicios con los filtros seleccionados.
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Servicio</TableCell>
                        <TableCell>Space</TableCell>
                        <TableCell>Línea</TableCell>
                        <TableCell>Stage</TableCell>
                        <TableCell>Modalidad</TableCell>
                        <TableCell align='right'>Costo</TableCell>
                        <TableCell>Inicio</TableCell>
                        <TableCell>Fin</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map(svc => (
                        <TableRow
                          key={svc.serviceId}
                          hover
                          sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                          component={Link}
                          href={`/agency/services/${svc.serviceId}`}
                        >
                          <TableCell>
                            <Box>
                              <Typography variant='body2' fontWeight={600}>{svc.name}</Typography>
                              <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} color='text.secondary'>
                                {svc.publicId ?? svc.serviceId}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{svc.spaceName ?? '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={LINEA_LABEL[svc.lineaDeServicio] ?? svc.lineaDeServicio} size='small' variant='outlined' />
                          </TableCell>
                          <TableCell>
                            <CustomChip
                              round='true'
                              size='small'
                              color={STAGE_COLOR[svc.pipelineStage] ?? 'secondary'}
                              variant='tonal'
                              label={STAGE_LABEL[svc.pipelineStage] ?? svc.pipelineStage}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                              {svc.modalidad ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2'>{formatCurrency(svc.totalCost, svc.currency)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{svc.startDate ?? '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{svc.targetEndDate ?? '—'}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component='div'
                  count={totalCount}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
                  rowsPerPageOptions={[10, 25, 50]}
                  labelRowsPerPage='Filas por página'
                />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ServicesListView
