'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

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
import CreateExpenseDrawer from '@views/greenhouse/finance/drawers/CreateExpenseDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Expense {
  expenseId: string
  expenseType: string
  description: string
  currency: string
  totalAmount: number
  totalAmountClp: number
  paymentDate: string | null
  paymentStatus: string
  paymentMethod: string | null
  documentNumber: string | null
  dueDate: string | null
  supplierId: string | null
  supplierName: string | null
  serviceLine: string | null
  isRecurring: boolean
  // Nubox fields
  nuboxPurchaseId: string | null
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'secondary' }> = {
  paid: { label: 'Pagado', color: 'success' },
  scheduled: { label: 'Programado', color: 'info' },
  pending: { label: 'Pendiente', color: 'warning' },
  overdue: { label: 'Vencido', color: 'error' },
  cancelled: { label: 'Cancelado', color: 'secondary' }
}

const TYPE_CONFIG: Record<string, { label: string; color: 'primary' | 'info' | 'warning' | 'error' | 'secondary' }> = {
  supplier: { label: 'Proveedor', color: 'primary' },
  payroll: { label: 'Nómina', color: 'info' },
  social_security: { label: 'Previsión', color: 'warning' },
  tax: { label: 'Impuesto', color: 'error' },
  miscellaneous: { label: 'Varios', color: 'secondary' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'scheduled', label: 'Programado' },
  { value: 'paid', label: 'Pagado' },
  { value: 'overdue', label: 'Vencido' }
]

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'payroll', label: 'Nómina' },
  { value: 'social_security', label: 'Previsión' },
  { value: 'tax', label: 'Impuesto' },
  { value: 'miscellaneous', label: 'Varios' }
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatAmount = (amount: number, currency: string): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  return formatCLP(amount)
}

const formatDate = (date: string | null): string => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExpensesListView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('expenseType', typeFilter)

      const res = await fetch(`/api/finance/expenses?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
        setFetchError(null)
      } else {
        const data = await res.json().catch(() => ({}))

        setFetchError(data.error || `Error ${res.status}`)
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Derived KPIs
  const totalExpenses = items.reduce((sum, e) => sum + e.totalAmountClp, 0)

  const pendingTotal = items.filter(e => e.paymentStatus === 'pending' || e.paymentStatus === 'scheduled')
    .reduce((sum, e) => sum + e.totalAmountClp, 0)

  const paidCount = items.filter(e => e.paymentStatus === 'paid').length
  const recurringCount = items.filter(e => e.isRecurring).length

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Egresos
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Pagos, obligaciones y cuentas por pagar
          </Typography>
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
            Egresos
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Pagos, obligaciones y cuentas por pagar
          </Typography>
        </Box>
        <Button variant='contained' color='error' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
          Registrar egreso
        </Button>
      </Box>

      {fetchError && <Alert severity='error'>{fetchError}</Alert>}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total egresos'
            stats={formatCLP(totalExpenses)}
            subtitle={`${total} registros`}
            avatarIcon='tabler-credit-card'
            avatarColor='error'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Por pagar'
            stats={formatCLP(pendingTotal)}
            subtitle='Pendiente + programado'
            avatarIcon='tabler-clock'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pagados'
            stats={String(paidCount)}
            subtitle='Egresos ejecutados'
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Recurrentes'
            stats={String(recurringCount)}
            subtitle='Pagos automáticos'
            avatarIcon='tabler-repeat'
            avatarColor='info'
          />
        </Grid>
      </Grid>

      {/* Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registro de egresos'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'error.lightOpacity' }}>
              <i className='tabler-credit-card' style={{ fontSize: 22, color: 'var(--mui-palette-error-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            select
            size='small'
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {TYPE_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {STATUS_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
        </CardContent>
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 100 }}>Tipo</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell sx={{ width: 140 }}>Proveedor</TableCell>
                <TableCell sx={{ width: 100 }}>Fecha</TableCell>
                <TableCell sx={{ width: 100 }}>Vencimiento</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Monto</TableCell>
                <TableCell sx={{ width: 100 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      No hay egresos registrados aún
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => {
                  const statusConf = STATUS_CONFIG[item.paymentStatus] || STATUS_CONFIG.pending
                  const typeConf = TYPE_CONFIG[item.expenseType] || TYPE_CONFIG.miscellaneous

                  return (
                    <TableRow key={item.expenseId} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/finance/expenses/${item.expenseId}`)}>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          color={typeConf.color}
                          label={typeConf.label}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant='body2' fontWeight={600} sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.25 }}>
                            {item.documentNumber ? (
                              <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                Doc: {item.documentNumber}
                              </Typography>
                            ) : null}
                            {item.nuboxPurchaseId ? (
                              <CustomChip round='true' size='small' color='info' variant='outlined' label='Nubox' />
                            ) : null}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {item.supplierName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{formatDate(item.paymentDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{formatDate(item.dueDate)}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' fontWeight={600} color='error.main'>
                          {formatAmount(item.totalAmount, item.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          color={statusConf.color}
                          label={statusConf.label}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <CreateExpenseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchExpenses() }} />
    </Box>
  )
}

export default ExpensesListView
