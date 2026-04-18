'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { TabContext, TabPanel } from '@mui/lab'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

type SemanticColor = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'

type PipelineStage = 'draft' | 'in_review' | 'sent' | 'approved' | 'converted' | 'rejected' | 'expired'

interface PipelineItem {
  quotationId: string
  clientId: string | null
  status: string
  pipelineStage: PipelineStage
  probabilityPct: number
  totalAmountClp: number | null
  quotedMarginPct: number | null
  businessLineCode: string | null
  quoteDate: string | null
  expiryDate: string | null
  daysInStage: number | null
  daysUntilExpiry: number | null
  isRenewalDue: boolean
  isExpired: boolean
  authorizedAmountClp: number | null
  invoicedAmountClp: number | null
}

interface PipelineTotals {
  openPipelineClp: number
  weightedPipelineClp: number
  wonClp: number
  lostClp: number
  byStage: Record<PipelineStage, { count: number; totalClp: number; weightedClp: number }>
}

interface ProfitabilityItem {
  quotationId: string
  periodYear: number
  periodMonth: number
  clientId: string | null
  quotedTotalClp: number | null
  quotedMarginPct: number | null
  authorizedTotalClp: number | null
  invoicedTotalClp: number | null
  realizedRevenueClp: number | null
  attributedCostClp: number | null
  effectiveMarginPct: number | null
  marginDriftPct: number | null
  driftSeverity: 'aligned' | 'warning' | 'critical'
}

interface RenewalItem {
  quotationId: string
  totalAmountClp: number | null
  expiryDate: string | null
  expiredAt?: string | null
  daysUntilExpiry?: number | null
  clientId: string | null
  businessLineCode: string | null
}

const STAGE_META: Record<PipelineStage, { label: string; color: SemanticColor }> = {
  draft: { label: 'Borrador', color: 'secondary' },
  in_review: { label: 'En revisión', color: 'info' },
  sent: { label: 'Enviada', color: 'info' },
  approved: { label: 'Aprobada', color: 'success' },
  converted: { label: 'Convertida', color: 'success' },
  rejected: { label: 'Rechazada', color: 'error' },
  expired: { label: 'Vencida', color: 'warning' }
}

const DRIFT_META: Record<'aligned' | 'warning' | 'critical', { label: string; color: SemanticColor }> = {
  aligned: { label: 'Alineado', color: 'success' },
  warning: { label: 'Atención', color: 'warning' },
  critical: { label: 'Crítico', color: 'error' }
}

const formatCLP = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'

  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatPct = (value: number | null | undefined, digits = 1): string => {
  if (value === null || value === undefined) return '—'

  return `${value.toFixed(digits)}%`
}

const PipelineTab = ({
  loading,
  error,
  items,
  totals
}: {
  loading: boolean
  error: string | null
  items: PipelineItem[]
  totals: PipelineTotals | null
}) => {
  if (loading) {
    return (
      <Stack spacing={3}>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant='rounded' height={96} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={280} />
      </Stack>
    )
  }

  if (error) {
    return <Alert severity='error' role='alert'>{error}</Alert>
  }

  if (items.length === 0) {
    return (
      <Alert severity='info' role='status' icon={<i className='tabler-info-circle' aria-hidden='true' />}>
        Aún no hay cotizaciones en el pipeline. Cuando se creen o sincronicen, aparecerán aquí.
      </Alert>
    )
  }

  return (
    <Stack spacing={4}>
      <Alert severity='info' role='status' icon={<i className='tabler-info-circle' aria-hidden='true' />}>
        Esta vista sigue cotizaciones en curso. No incluye deals sin cotización emitida ni reemplaza el pipeline comercial unificado que llegará en la próxima iteración.
      </Alert>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pipeline abierto'
            stats={formatCLP(totals?.openPipelineClp ?? 0)}
            subtitle={`${(totals?.byStage.draft.count ?? 0) + (totals?.byStage.in_review.count ?? 0) + (totals?.byStage.sent.count ?? 0) + (totals?.byStage.approved.count ?? 0)} cotizaciones activas`}
            titleTooltip='Suma de montos cotizados en borrador, revisión, enviadas y aprobadas. No incluye deals sin cotización emitida.'
            avatarIcon='tabler-stack-2'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pipeline ponderado'
            stats={formatCLP(totals?.weightedPipelineClp ?? 0)}
            subtitle='Monto ajustado por probabilidad'
            titleTooltip='Suma de montos cotizados ajustada por la probabilidad documental de cada cotización activa. No reemplaza el forecast comercial por deal.'
            avatarIcon='tabler-target'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Cerrado ganado'
            stats={formatCLP(totals?.wonClp ?? 0)}
            subtitle={`${totals?.byStage.converted.count ?? 0} convertidas`}
            avatarIcon='tabler-trophy'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Cerrado perdido'
            stats={formatCLP(totals?.lostClp ?? 0)}
            subtitle={`${(totals?.byStage.rejected.count ?? 0) + (totals?.byStage.expired.count ?? 0)} rechazadas o vencidas`}
            avatarIcon='tabler-mood-sad'
            avatarColor='error'
          />
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Cotizaciones en curso'
          subheader='Seguimiento por estado documental y probabilidad'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-list' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} aria-hidden='true' />
            </Avatar>
          }
        />
        <Divider />
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Cotización</TableCell>
                <TableCell>Etapa</TableCell>
                <TableCell align='right'>Monto</TableCell>
                <TableCell align='right'>Probabilidad</TableCell>
                <TableCell align='right'>Margen</TableCell>
                <TableCell>Vence</TableCell>
                <TableCell>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => {
                const meta = STAGE_META[item.pipelineStage]

                return (
                  <TableRow key={item.quotationId} hover>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {item.quotationId}
                      </Typography>
                      {item.businessLineCode && (
                        <Typography variant='caption' color='text.secondary'>
                          {item.businessLineCode}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <CustomChip round='true' size='small' variant='tonal' color={meta.color} label={meta.label} />
                        {item.isRenewalDue && (
                          <CustomChip round='true' size='small' variant='tonal' color='warning' label='Renovación' />
                        )}
                        {item.isExpired && (
                          <CustomChip round='true' size='small' variant='tonal' color='error' label='Vencida' />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCLP(item.totalAmountClp)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2'>{item.probabilityPct.toFixed(0)}%</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2'>{formatPct(item.quotedMarginPct)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{formatDate(item.expiryDate)}</Typography>
                      {item.daysUntilExpiry !== null && (
                        <Typography variant='caption' color={item.daysUntilExpiry < 0 ? 'error.main' : 'text.secondary'}>
                          {item.daysUntilExpiry < 0
                            ? `Hace ${Math.abs(item.daysUntilExpiry)} días`
                            : `En ${item.daysUntilExpiry} días`}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/finance/quotes/${item.quotationId}`}
                        style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}
                        aria-label={`Ver cotización ${item.quotationId}`}
                      >
                        Ver
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  )
}

const ProfitabilityTab = ({
  loading,
  error,
  items
}: {
  loading: boolean
  error: string | null
  items: ProfitabilityItem[]
}) => {
  if (loading) return <Skeleton variant='rounded' height={280} />

  if (error) return <Alert severity='error' role='alert'>{error}</Alert>

  if (items.length === 0) {
    return (
      <Alert severity='info' role='status' icon={<i className='tabler-info-circle' aria-hidden='true' />}>
        Aún no hay cotizaciones con ejecución medible. Una vez que se aprueben y facturen, verás la comparación cotizado vs ejecutado.
      </Alert>
    )
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title='Rentabilidad cotizado vs ejecutado'
        subheader='Drift de margen por cotización y período'
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
            <i className='tabler-scale' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} aria-hidden='true' />
          </Avatar>
        }
      />
      <Divider />
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Cotización</TableCell>
              <TableCell>Período</TableCell>
              <TableCell align='right'>Cotizado</TableCell>
              <TableCell align='right'>Facturado</TableCell>
              <TableCell align='right'>Costo atribuido</TableCell>
              <TableCell align='right'>Margen cotizado</TableCell>
              <TableCell align='right'>Margen efectivo</TableCell>
              <TableCell>Drift</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(row => {
              const meta = DRIFT_META[row.driftSeverity]

              const driftLabel =
                row.marginDriftPct === null
                  ? meta.label
                  : `${meta.label} · ${row.marginDriftPct >= 0 ? '+' : ''}${row.marginDriftPct.toFixed(1)}pp`

              return (
                <TableRow key={`${row.quotationId}-${row.periodYear}-${row.periodMonth}`} hover>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {row.quotationId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {row.periodYear}-{String(row.periodMonth).padStart(2, '0')}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                      {formatCLP(row.quotedTotalClp)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                      {formatCLP(row.invoicedTotalClp)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                      {formatCLP(row.attributedCostClp)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>{formatPct(row.quotedMarginPct)}</TableCell>
                  <TableCell align='right'>{formatPct(row.effectiveMarginPct)}</TableCell>
                  <TableCell>
                    <CustomChip round='true' size='small' variant='tonal' color={meta.color} label={driftLabel} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}

const RenewalsTab = ({
  loading,
  error,
  renewals,
  expired
}: {
  loading: boolean
  error: string | null
  renewals: RenewalItem[]
  expired: RenewalItem[]
}) => {
  if (loading) return <Skeleton variant='rounded' height={280} />

  if (error) return <Alert severity='error' role='alert'>{error}</Alert>

  if (renewals.length === 0 && expired.length === 0) {
    return (
      <Alert severity='success' role='status' icon={<i className='tabler-check' aria-hidden='true' />}>
        Sin cotizaciones por renovar ni vencidas. Al día.
      </Alert>
    )
  }

  return (
    <Stack spacing={4}>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={`Próximas a vencer (${renewals.length})`}
          subheader='Dentro de los próximos 60 días'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
              <i className='tabler-clock-exclamation' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} aria-hidden='true' />
            </Avatar>
          }
        />
        <Divider />
        {renewals.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography variant='body2' color='text.secondary'>Sin cotizaciones por renovar.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Cotización</TableCell>
                  <TableCell align='right'>Monto</TableCell>
                  <TableCell>Vence</TableCell>
                  <TableCell>Días restantes</TableCell>
                  <TableCell>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {renewals.map(item => (
                  <TableRow key={item.quotationId} hover>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {item.quotationId}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(item.totalAmountClp)}</Typography>
                    </TableCell>
                    <TableCell>{formatDate(item.expiryDate)}</TableCell>
                    <TableCell>
                      {item.daysUntilExpiry !== null && item.daysUntilExpiry !== undefined
                        ? `${item.daysUntilExpiry} días`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/finance/quotes/${item.quotationId}`}
                        style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}
                        aria-label={`Revisar cotización ${item.quotationId}`}
                      >
                        Revisar
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={`Vencidas (${expired.length})`}
          subheader='Sin renovación registrada'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'error.lightOpacity' }}>
              <i className='tabler-alert-triangle' style={{ fontSize: 22, color: 'var(--mui-palette-error-main)' }} aria-hidden='true' />
            </Avatar>
          }
        />
        <Divider />
        {expired.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography variant='body2' color='text.secondary'>Sin cotizaciones vencidas.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Cotización</TableCell>
                  <TableCell align='right'>Monto</TableCell>
                  <TableCell>Fecha venc.</TableCell>
                  <TableCell>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expired.map(item => (
                  <TableRow key={item.quotationId} hover>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {item.quotationId}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(item.totalAmountClp)}</Typography>
                    </TableCell>
                    <TableCell>{formatDate(item.expiryDate)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/finance/quotes/${item.quotationId}`}
                        style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}
                        aria-label={`Revisar cotización ${item.quotationId}`}
                      >
                        Revisar
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Stack>
  )
}

const CommercialIntelligenceView = () => {
  const [tab, setTab] = useState<'pipeline' | 'profitability' | 'renewals'>('pipeline')

  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([])
  const [pipelineTotals, setPipelineTotals] = useState<PipelineTotals | null>(null)

  const [profitabilityLoading, setProfitabilityLoading] = useState(false)
  const [profitabilityError, setProfitabilityError] = useState<string | null>(null)
  const [profitabilityItems, setProfitabilityItems] = useState<ProfitabilityItem[]>([])

  const [renewalsLoading, setRenewalsLoading] = useState(false)
  const [renewalsError, setRenewalsError] = useState<string | null>(null)
  const [renewals, setRenewals] = useState<RenewalItem[]>([])
  const [expired, setExpired] = useState<RenewalItem[]>([])

  const fetchPipeline = useCallback(async () => {
    setPipelineLoading(true)
    setPipelineError(null)

    try {
      const res = await fetch('/api/finance/commercial-intelligence/pipeline')

      if (!res.ok) {
        setPipelineError('No pudimos cargar el pipeline. Intenta actualizar la página.')

        return
      }

      const data = (await res.json()) as { items?: PipelineItem[]; totals?: PipelineTotals }

      setPipelineItems(data.items ?? [])
      setPipelineTotals(data.totals ?? null)
    } catch {
      setPipelineError('Error de conexión. Intenta de nuevo.')
    } finally {
      setPipelineLoading(false)
    }
  }, [])

  const fetchProfitability = useCallback(async () => {
    setProfitabilityLoading(true)
    setProfitabilityError(null)

    try {
      const res = await fetch('/api/finance/commercial-intelligence/profitability')

      if (!res.ok) {
        setProfitabilityError('No pudimos cargar la rentabilidad.')

        return
      }

      const data = (await res.json()) as { items?: ProfitabilityItem[] }

      setProfitabilityItems(data.items ?? [])
    } catch {
      setProfitabilityError('Error de conexión. Intenta de nuevo.')
    } finally {
      setProfitabilityLoading(false)
    }
  }, [])

  const fetchRenewals = useCallback(async () => {
    setRenewalsLoading(true)
    setRenewalsError(null)

    try {
      const res = await fetch('/api/finance/commercial-intelligence/renewals?include=all')

      if (!res.ok) {
        setRenewalsError('No pudimos cargar las renovaciones.')

        return
      }

      const data = (await res.json()) as { renewals?: RenewalItem[]; expired?: RenewalItem[] }

      setRenewals(data.renewals ?? [])
      setExpired(data.expired ?? [])
    } catch {
      setRenewalsError('Error de conexión. Intenta de nuevo.')
    } finally {
      setRenewalsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  useEffect(() => {
    if (tab === 'profitability' && profitabilityItems.length === 0 && !profitabilityLoading) {
      fetchProfitability()
    }

    if (tab === 'renewals' && renewals.length === 0 && expired.length === 0 && !renewalsLoading) {
      fetchRenewals()
    }
  }, [tab, fetchProfitability, fetchRenewals, profitabilityItems.length, renewals.length, expired.length, profitabilityLoading, renewalsLoading])

  const renewalBadge = useMemo(() => renewals.length + expired.length, [renewals.length, expired.length])

  return (
    <Card variant='outlined'>
      <TabContext value={tab}>
        <CustomTabList onChange={(_e, v) => setTab(v as typeof tab)} variant='scrollable'>
          <Tab value='pipeline' label='Cotizaciones en curso' icon={<i className='tabler-stack-2' />} iconPosition='start' />
          <Tab value='profitability' label='Rentabilidad' icon={<i className='tabler-scale' />} iconPosition='start' />
          <Tab
            value='renewals'
            label={renewalBadge > 0 ? `Renovaciones (${renewalBadge})` : 'Renovaciones'}
            icon={<i className='tabler-clock-exclamation' />}
            iconPosition='start'
          />
        </CustomTabList>

        <TabPanel value='pipeline' sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <PipelineTab loading={pipelineLoading} error={pipelineError} items={pipelineItems} totals={pipelineTotals} />
        </TabPanel>

        <TabPanel value='profitability' sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <ProfitabilityTab loading={profitabilityLoading} error={profitabilityError} items={profitabilityItems} />
        </TabPanel>

        <TabPanel value='renewals' sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <RenewalsTab loading={renewalsLoading} error={renewalsError} renewals={renewals} expired={expired} />
        </TabPanel>
      </TabContext>
    </Card>
  )
}

export default CommercialIntelligenceView
