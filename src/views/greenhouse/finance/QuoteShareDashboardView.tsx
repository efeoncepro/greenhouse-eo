'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography
} from '@mui/material'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { formatDate as formatGreenhouseDate, formatNumber as formatGreenhouseNumber } from '@/lib/format'

interface DashboardItem {
  shortCode: string
  shortUrl: string
  quotationId: string
  quotationNumber: string
  versionNumber: number
  clientName: string | null
  total: number
  currency: string
  validUntil: string | null
  acceptedAt: string | null
  acceptedByName: string | null
  createdAt: string
  expiresAt: string | null
  lastAccessedAt: string | null
  accessCount: number
  viewCount: number
}

interface DashboardData {
  items: DashboardItem[]
  totals: {
    total: number
    accepted: number
    viewed: number
    pending: number
    notViewed: number
  }
}

const formatCurrency = (value: number, currency: string): string => {
  if (currency === 'CLP') return `$${formatGreenhouseNumber(Math.round(value), 'es-CL')}`
  if (currency === 'USD') return `US$${formatGreenhouseNumber(value, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}, 'es-CL')}`

  return `${currency} ${formatGreenhouseNumber(value, {
  minimumFractionDigits: 2
}, 'es-CL')}`
}

const formatRelative = (iso: string | null): string => {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)

  if (minutes < 1) return 'segundos'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)

  if (days < 30) return `${days} d`

  return `${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'

  return formatGreenhouseDate(new Date(iso), {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}, 'es-CL')
}

/**
 * TASK-631 Fase 3 — Cross-quote share analytics dashboard.
 *
 * Surfaces all active short links the sales rep has access to with view +
 * acceptance stats. Tabs filter by status (todas / vistas / pendientes /
 * aceptadas / no abiertas).
 */
export const QuoteShareDashboardView = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'all' | 'accepted' | 'pending' | 'not_viewed'>('all')

  useEffect(() => {
    let aborted = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/finance/quotes/share/dashboard?limit=200', { cache: 'no-store' })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as DashboardData

        if (!aborted) setData(json)
      } catch (err) {
        if (!aborted) setError(err instanceof Error ? err.message : 'Error cargando dashboard')
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    void load()

    return () => {
      aborted = true
    }
  }, [])

  const filteredItems = useMemo(() => {
    if (!data) return []

    switch (tab) {
      case 'accepted':
        return data.items.filter(i => i.acceptedAt)
      case 'pending':
        return data.items.filter(i => !i.acceptedAt && i.viewCount > 0)
      case 'not_viewed':
        return data.items.filter(i => i.viewCount === 0)
      default:
        return data.items
    }
  }, [data, tab])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !data) {
    return (
      <Alert severity='error' sx={{ mt: 4 }}>
        {error ?? 'No se pudo cargar el dashboard'}
      </Alert>
    )
  }

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4' sx={{ fontWeight: 600, mb: 1 }}>
          Dashboard de cotizaciones compartidas
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Estado de los links compartidos: aperturas, aceptaciones y links pendientes de seguimiento.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 4 }}>
        <HorizontalWithSubtitle
          title='Compartidas'
          stats={String(data.totals.total)}
          subtitle='links activos'
          avatarIcon='tabler-link'
          avatarColor='primary'
          trend='positive'
          trendNumber={data.totals.total > 0 ? '100%' : '0%'}
        />
        <HorizontalWithSubtitle
          title='Vistas'
          stats={String(data.totals.viewed)}
          subtitle='abiertas por el cliente'
          avatarIcon='tabler-eye'
          avatarColor='info'
          trend='positive'
          trendNumber={data.totals.total > 0 ? `${Math.round((data.totals.viewed / data.totals.total) * 100)}%` : '0%'}
        />
        <HorizontalWithSubtitle
          title='Aceptadas'
          stats={String(data.totals.accepted)}
          subtitle='cerradas por el cliente'
          avatarIcon='tabler-check'
          avatarColor='success'
          trend='positive'
          trendNumber={data.totals.viewed > 0 ? `${Math.round((data.totals.accepted / data.totals.viewed) * 100)}%` : '0%'}
        />
        <HorizontalWithSubtitle
          title='Pendientes'
          stats={String(data.totals.pending)}
          subtitle='vistas sin aceptar'
          avatarIcon='tabler-clock'
          avatarColor='warning'
          trend='negative'
          trendNumber={data.totals.viewed > 0 ? `${Math.round((data.totals.pending / data.totals.viewed) * 100)}%` : '0%'}
        />
        <HorizontalWithSubtitle
          title='No abiertas'
          stats={String(data.totals.notViewed)}
          subtitle='sin actividad'
          avatarIcon='tabler-mail-x'
          avatarColor='secondary'
          trend='negative'
          trendNumber={data.totals.total > 0 ? `${Math.round((data.totals.notViewed / data.totals.total) * 100)}%` : '0%'}
        />
      </Box>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}`, px: 4 }}
        >
          <Tab value='all' label={`Todas (${data.totals.total})`} />
          <Tab value='accepted' label={`Aceptadas (${data.totals.accepted})`} />
          <Tab value='pending' label={`Pendientes (${data.totals.pending})`} />
          <Tab value='not_viewed' label={`No abiertas (${data.totals.notViewed})`} />
        </Tabs>
        <CardContent sx={{ p: 0 }}>
          {filteredItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant='body2' color='text.secondary'>
                No hay cotizaciones en este filtro.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cotización</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell align='right'>Total</TableCell>
                    <TableCell align='center'>Aperturas</TableCell>
                    <TableCell>Última apertura</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Vence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.shortCode} hover>
                      <TableCell>
                        <Link href={`/finance/quotes/${item.quotationId}`} style={{ textDecoration: 'none' }}>
                          <Typography variant='body2' sx={{ fontWeight: 500, color: 'primary.main' }}>
                            {item.quotationNumber} v{item.versionNumber}
                          </Typography>
                        </Link>
                        <Typography variant='caption' color='text.secondary'>
                          /q/{item.shortCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {item.clientName ?? <em>sin cliente</em>}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                          {formatCurrency(item.total, item.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {item.viewCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption'>
                          {formatRelative(item.lastAccessedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.acceptedAt ? (
                          <Stack spacing={0.5}>
                            <CustomChip round='true' size='small' variant='tonal' color='success' label='Aceptada' />
                            <Typography variant='caption' color='text.secondary'>
                              Por {item.acceptedByName ?? 'cliente'}
                            </Typography>
                          </Stack>
                        ) : item.viewCount > 0 ? (
                          <CustomChip round='true' size='small' variant='tonal' color='warning' label='Pendiente' />
                        ) : (
                          <CustomChip round='true' size='small' variant='tonal' color='secondary' label='No abierta' />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption'>{formatDate(item.expiresAt)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
