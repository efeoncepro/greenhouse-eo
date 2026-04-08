'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import RegisterCashOutDrawer from '@views/greenhouse/finance/drawers/RegisterCashOutDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CashOutItem {
  paymentId: string
  expenseId: string
  paymentDate: string
  amount: number
  currency: string
  expenseType: string
  expenseDescription: string
  beneficiary: string | null
  supplierName: string | null
  memberName: string | null
  reference: string | null
  isReconciled: boolean
  paymentAccountName: string | null
  paymentProviderSlug: string | null
  paymentInstrumentCategory: string | null
}

interface CashOutApiItem {
  paymentId: string
  expenseId: string
  paymentDate: string
  amount: number
  currency: string
  expenseType: string
  expenseDescription: string
  supplierName: string | null
  memberName: string | null
  reference: string | null
  isReconciled: boolean
  paymentAccountName: string | null
  paymentProviderSlug: string | null
  paymentInstrumentCategory: string | null
}

interface CashOutSummary {
  totalPaidClp: number
  totalPayments: number
  unreconciledCount: number
  supplierTotalClp: number
  payrollTotalClp: number
  fiscalTotalClp: number
}

interface CashOutResponse {
  items: CashOutApiItem[]
  total: number
  page: number
  pageSize: number
  summary: CashOutSummary
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, { label: string; color: 'primary' | 'info' | 'warning' | 'error' | 'secondary' }> = {
  supplier: { label: 'Proveedor', color: 'primary' },
  payroll: { label: 'Nomina', color: 'info' },
  social_security: { label: 'Prevision', color: 'warning' },
  tax: { label: 'Impuesto', color: 'error' },
  bank_fee: { label: 'Bancario', color: 'secondary' },
  gateway_fee: { label: 'Gateway', color: 'secondary' },
  financial_cost: { label: 'Financiero', color: 'secondary' },
  miscellaneous: { label: 'Varios', color: 'secondary' }
}

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'payroll', label: 'Nomina' },
  { value: 'social_security', label: 'Prevision' },
  { value: 'tax', label: 'Impuesto' },
  { value: 'bank_fee', label: 'Bancario' },
  { value: 'miscellaneous', label: 'Otro' }
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatAmount = (amount: number, currency: string): string =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(amount)

const formatDate = (date: string | null): string => {
  if (!date) return '\u2014'

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

const getBeneficiary = (item: CashOutItem): string => {
  if (item.expenseType === 'supplier' && item.supplierName) return item.supplierName
  if (item.expenseType === 'payroll' && item.memberName) return item.memberName

  return item.beneficiary || '\u2014'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CashOutListView = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CashOutItem[]>([])

  const [summary, setSummary] = useState<CashOutSummary>({
    totalPaidClp: 0,
    totalPayments: 0,
    unreconciledCount: 0,
    supplierTotalClp: 0,
    payrollTotalClp: 0,
    fiscalTotalClp: 0
  })

  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filters
  const [fromDate, setFromDate] = useState(getDefaultFromDate)
  const [toDate, setToDate] = useState(getDefaultToDate)
  const [expenseType, setExpenseType] = useState('')

  const fetchCashOut = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      params.set('fromDate', fromDate)
      params.set('toDate', toDate)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      if (expenseType) params.set('expenseType', expenseType)

      const res = await fetch(`/api/finance/cash-out?${params.toString()}`)

      if (res.ok) {
        const data: CashOutResponse = await res.json()

        setItems(
          (data.items ?? []).map(item => ({
            paymentId: item.paymentId,
            expenseId: item.expenseId,
            paymentDate: item.paymentDate,
            amount: item.amount,
            currency: item.currency,
            expenseType: item.expenseType,
            expenseDescription: item.expenseDescription,
            beneficiary: item.supplierName || item.memberName || null,
            supplierName: item.supplierName,
            memberName: item.memberName,
            reference: item.reference,
            isReconciled: item.isReconciled,
            paymentAccountName: item.paymentAccountName,
            paymentProviderSlug: item.paymentProviderSlug,
            paymentInstrumentCategory: item.paymentInstrumentCategory
          }))
        )
        setTotal(data.total ?? 0)
        setSummary(data.summary ?? {
          totalPaidClp: 0,
          totalPayments: 0,
          unreconciledCount: 0,
          supplierTotalClp: 0,
          payrollTotalClp: 0,
          fiscalTotalClp: 0
        })
        setFetchError(null)
      } else {
        const data = await res.json().catch(() => ({}))

        setFetchError(data.error || `Error ${res.status}`)
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Error de conexion')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, expenseType, page, pageSize])

  useEffect(() => {
    fetchCashOut()
  }, [fetchCashOut])

  const handleFilter = () => {
    setPage(1)
    fetchCashOut()
  }

  const totalPages = Math.ceil(total / pageSize)

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
              Pagos
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Pagos ejecutados y salidas de caja
            </Typography>
          </Box>
        </Box>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
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
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Pagos
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Pagos ejecutados y salidas de caja
          </Typography>
        </Box>
        <Button variant='contained' color='success' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
          Registrar pago
        </Button>
      </Box>

      {fetchError && <Alert severity='error'>{fetchError}</Alert>}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total pagado'
            stats={formatCLP(summary.totalPaidClp)}
            subtitle={`${summary.totalPayments} pagos en el periodo`}
            avatarIcon='tabler-credit-card-pay'
            avatarColor='error'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Proveedores'
            stats={formatCLP(summary.supplierTotalClp)}
            subtitle='Pagos a proveedores'
            avatarIcon='tabler-building-store'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Nomina'
            stats={formatCLP(summary.payrollTotalClp)}
            subtitle='Sueldos y remuneraciones'
            avatarIcon='tabler-users'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Fiscal'
            stats={formatCLP(summary.fiscalTotalClp)}
            subtitle='Impuestos y prevision'
            avatarIcon='tabler-receipt-tax'
            avatarColor='warning'
          />
        </Grid>
      </Grid>

      {/* Table Card */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registro de pagos'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'error.lightOpacity' }}>
              <i className='tabler-credit-card-pay' style={{ fontSize: 22, color: 'var(--mui-palette-error-main)' }} />
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
          <CustomTextField
            select
            size='small'
            value={expenseType}
            onChange={e => setExpenseType(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {TYPE_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
          <Button variant='contained' size='small' onClick={handleFilter} startIcon={<i className='tabler-filter' />}>
            Filtrar
          </Button>
        </CardContent>
        <Divider />

        {/* Data Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell align='right'>Monto</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Descripcion</TableCell>
                <TableCell>Beneficiario</TableCell>
                <TableCell>Instrumento</TableCell>
                <TableCell>Referencia</TableCell>
                <TableCell>Conciliación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Sin pagos registrados en este periodo
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => {
                  const typeConf = TYPE_CONFIG[item.expenseType] ?? TYPE_CONFIG.miscellaneous

                  return (
                    <TableRow key={item.paymentId} hover>
                      <TableCell>
                        <Typography variant='body2'>{formatDate(item.paymentDate)}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' fontWeight={600} color='error.main'>
                          {formatAmount(item.amount, item.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip round='true' size='small' color={typeConf.color} label={typeConf.label} />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {item.expenseDescription || '\u2014'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{getBeneficiary(item)}</Typography>
                      </TableCell>
                      <TableCell>
                        {item.paymentAccountName ? (
                          <PaymentInstrumentChip
                            providerSlug={item.paymentProviderSlug}
                            instrumentName={item.paymentAccountName}
                            size='sm'
                          />
                        ) : (
                          <Typography variant='body2' color='text.secondary'>{'\u2014'}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {item.reference || '\u2014'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.isReconciled ? (
                          <CustomChip round='true' size='small' color='success' label='Conciliado' />
                        ) : (
                          <CustomChip round='true' size='small' color='warning' label='Por conciliar' />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 4, py: 2 }}>
              <Typography variant='body2' color='text.secondary'>
                Pagina {page} de {totalPages} ({total} registros)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  size='small'
                  variant='outlined'
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  startIcon={<i className='tabler-chevron-left' />}
                >
                  Anterior
                </Button>
                <Button
                  size='small'
                  variant='outlined'
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  endIcon={<i className='tabler-chevron-right' />}
                >
                  Siguiente
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Card>

      <RegisterCashOutDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); fetchCashOut() }}
      />
    </Box>
  )
}

export default CashOutListView
