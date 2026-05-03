'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'

import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { DataTableShell } from '@/components/greenhouse/data-table'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import RegisterCashInDrawer from '@views/greenhouse/finance/drawers/RegisterCashInDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CashInItem {
  cashInId: string
  incomeId: string | null
  paymentDate: string
  amount: number
  currency: string
  invoiceNumber: string | null
  clientName: string | null
  reference: string | null
  paymentMethod: string | null
  paymentSource: string | null
  reconciled: boolean
  paymentAccountName: string | null
  paymentProviderSlug: string | null
  paymentInstrumentCategory: string | null
}

interface CashInApiItem {
  paymentId: string
  incomeId: string | null
  paymentDate: string
  amount: number
  currency: string
  invoiceNumber: string | null
  clientName: string | null
  reference: string | null
  paymentMethod: string | null
  paymentSource: string | null
  isReconciled: boolean
  paymentAccountName: string | null
  paymentProviderSlug: string | null
  paymentInstrumentCategory: string | null
}

interface CashInSummary {
  totalCollectedClp: number
  totalPayments: number
  unreconciledCount: number
}

interface CashInResponse {
  items: CashInApiItem[]
  total: number
  page: number
  pageSize: number
  summary: CashInSummary
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number, currency: string = 'CLP'): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 }).format(amount)

const formatDate = (date: string | null): string => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

const getDefaultFromDate = (): string => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

const getDefaultToDate = (): string => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CashInListView = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<CashInItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [summary, setSummary] = useState<CashInSummary>({ totalCollectedClp: 0, totalPayments: 0, unreconciledCount: 0 })

  // Filter state
  const [fromDate, setFromDate] = useState(getDefaultFromDate())
  const [toDate, setToDate] = useState(getDefaultToDate())

  // Applied filters (only update on "Filtrar" click)
  const [appliedFrom, setAppliedFrom] = useState(fromDate)
  const [appliedTo, setAppliedTo] = useState(toDate)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchCashIn = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      params.set('fromDate', appliedFrom)
      params.set('toDate', appliedTo)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await fetch(`/api/finance/cash-in?${params.toString()}`)

      if (res.ok) {
        const data: CashInResponse = await res.json()

        setItems(
          (data.items ?? []).map(item => ({
            cashInId: item.paymentId,
            incomeId: item.incomeId,
            paymentDate: item.paymentDate,
            amount: item.amount,
            currency: item.currency,
            invoiceNumber: item.invoiceNumber,
            clientName: item.clientName,
            reference: item.reference,
            paymentMethod: item.paymentMethod,
            paymentSource: item.paymentSource ?? null,
            reconciled: item.isReconciled,
            paymentAccountName: item.paymentAccountName,
            paymentProviderSlug: item.paymentProviderSlug,
            paymentInstrumentCategory: item.paymentInstrumentCategory
          }))
        )
        setTotal(data.total ?? 0)
        setSummary(data.summary ?? { totalCollectedClp: 0, totalPayments: 0, unreconciledCount: 0 })
      } else {
        setError('Error al cargar los cobros')
      }
    } catch {
      setError('Error de conexión al cargar cobros')
    } finally {
      setLoading(false)
    }
  }, [appliedFrom, appliedTo, page, pageSize])

  useEffect(() => {
    fetchCashIn()
  }, [fetchCashIn])

  const handleFilter = () => {
    setPage(1)
    setAppliedFrom(fromDate)
    setAppliedTo(toDate)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 600, mb: 1 }}>
            Cobros
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Pagos recibidos y conciliación de ingresos
          </Typography>
        </Box>
        <Grid container spacing={6}>
          {[0, 1, 2].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={400} />
      </Box>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 600, mb: 1 }}>
            Cobros
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Pagos recibidos y conciliación de ingresos
          </Typography>
        </Box>
        <Button variant='contained' color='success' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
          Registrar cobro
        </Button>
      </Box>

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <HorizontalWithSubtitle
            title='Total cobrado'
            stats={formatCurrency(summary.totalCollectedClp, 'CLP')}
            subtitle='Monto total recaudado en CLP'
            avatarIcon='tabler-cash'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <HorizontalWithSubtitle
            title='Pagos recibidos'
            stats={String(summary.totalPayments)}
            subtitle='Total de pagos en el período'
            avatarIcon='tabler-receipt-2'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <HorizontalWithSubtitle
            title='Sin conciliar'
            stats={String(summary.unreconciledCount)}
            subtitle='Requieren conciliación'
            avatarIcon='tabler-alert-triangle'
            avatarColor='warning'
          />
        </Grid>
      </Grid>

      {/* Error alert */}
      {error && (
        <Alert severity='error' variant='outlined'>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registro de cobros'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
              <i className='tabler-cash' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
            </Avatar>
          }
        />
        <Divider />

        {/* Filters */}
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <CustomTextField
            type='date'
            size='small'
            label='Desde'
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <CustomTextField
            type='date'
            size='small'
            label='Hasta'
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <Button variant='contained' size='small' onClick={handleFilter} startIcon={<i className='tabler-filter' />}>
            Filtrar
          </Button>
        </CardContent>
        <Divider />

        {/* Table content */}
        <DataTableShell identifier='cash-in-list' ariaLabel='Lista de pagos recibidos (cash-in)'>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell align='right'>Monto</TableCell>
                <TableCell>Factura</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Instrumento</TableCell>
                <TableCell>Referencia</TableCell>
                <TableCell>Método</TableCell>
                <TableCell>Conciliación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 8 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Sin cobros registrados en este período
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <TableRow key={item.cashInId} hover>
                    <TableCell>
                      <Typography variant='body2'>{formatDate(item.paymentDate)}</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight={600}>
                        {formatCurrency(item.amount, item.currency || 'CLP')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.incomeId ? (
                        <Link href={`/finance/income/${item.incomeId}`} passHref style={{ textDecoration: 'none' }}>
                          <Typography variant='body2' color='primary.main' sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                            {item.invoiceNumber || item.incomeId}
                          </Typography>
                        </Link>
                      ) : (
                        <Typography variant='body2' color='text.secondary'>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{item.clientName || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      {item.paymentAccountName ? (
                        <PaymentInstrumentChip
                          providerSlug={item.paymentProviderSlug}
                          instrumentName={item.paymentAccountName}
                          size='sm'
                        />
                      ) : (
                        <Typography variant='body2' color='text.secondary'>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>{item.reference || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{item.paymentMethod || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CustomChip round='true' size='small' color='success' label='Cobrado' />
                        {item.paymentSource === 'factoring_proceeds' && (
                          <CustomChip
                            round='true'
                            size='small'
                            color='warning'
                            variant='tonal'
                            label='Vía factoring'
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <CustomChip
                        round='true'
                        size='small'
                        color={item.reconciled ? 'success' : 'warning'}
                        label={item.reconciled ? 'Conciliado' : 'Por conciliar'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableShell>

        {/* Pagination */}
        {total > 0 && (
          <>
            <Divider />
            <CardContent>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Typography variant='body2' color='text.secondary'>
                  Página {page} de {totalPages} — {total} cobro{total !== 1 ? 's' : ''}
                </Typography>
                <Stack direction='row' spacing={2}>
                  <Button
                    size='small'
                    variant='outlined'
                    disabled={page <= 1}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    startIcon={<i className='tabler-chevron-left' />}
                  >
                    Anterior
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    disabled={page >= totalPages}
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    endIcon={<i className='tabler-chevron-right' />}
                  >
                    Siguiente
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </>
        )}
      </Card>

      <RegisterCashInDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); fetchCashIn() }}
      />
    </Box>
  )
}

export default CashInListView
