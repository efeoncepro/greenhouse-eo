'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
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

import { GH_PIPELINE_COMMERCIAL } from '@/config/greenhouse-nomenclature'
import type { UnifiedPipelineResult } from '@/lib/commercial-intelligence/revenue-pipeline-reader'

import PipelineBoardUnified from './workspace/PipelineBoardUnified'

type SemanticColor = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'

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
  const [pipelineData, setPipelineData] = useState<UnifiedPipelineResult | null>(null)

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
      const res = await fetch('/api/finance/commercial-intelligence/revenue-pipeline')

      if (!res.ok) {
        setPipelineError(GH_PIPELINE_COMMERCIAL.errorText)

        return
      }

      const data = (await res.json()) as UnifiedPipelineResult

      setPipelineData(data)
    } catch {
      setPipelineError(GH_PIPELINE_COMMERCIAL.errorText)
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
          <Tab
            value='pipeline'
            label={GH_PIPELINE_COMMERCIAL.subtabPipelineLabel}
            icon={<i className='tabler-stack-2' />}
            iconPosition='start'
          />
          <Tab value='profitability' label='Rentabilidad' icon={<i className='tabler-scale' />} iconPosition='start' />
          <Tab
            value='renewals'
            label={renewalBadge > 0 ? `Renovaciones (${renewalBadge})` : 'Renovaciones'}
            icon={<i className='tabler-clock-exclamation' />}
            iconPosition='start'
          />
        </CustomTabList>

        <TabPanel value='pipeline' sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <PipelineBoardUnified loading={pipelineLoading} error={pipelineError} data={pipelineData} />
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
