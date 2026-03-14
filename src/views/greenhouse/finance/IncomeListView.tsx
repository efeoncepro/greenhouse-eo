'use client'

import { useCallback, useEffect, useState } from 'react'

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
import CreateIncomeDrawer from '@views/greenhouse/finance/drawers/CreateIncomeDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Income {
  incomeId: string
  clientName: string
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  currency: string
  totalAmount: number
  totalAmountClp: number
  paymentStatus: string
  amountPaid: number
  amountPending: number
  serviceLine: string | null
  description: string | null
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'secondary' }> = {
  paid: { label: 'Pagado', color: 'success' },
  partial: { label: 'Parcial', color: 'warning' },
  pending: { label: 'Pendiente', color: 'info' },
  overdue: { label: 'Vencido', color: 'error' },
  written_off: { label: 'Castigado', color: 'secondary' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'partial', label: 'Parcial' },
  { value: 'paid', label: 'Pagado' },
  { value: 'overdue', label: 'Vencido' }
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

const IncomeListView = () => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Income[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchIncome = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/finance/income?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchIncome()
  }, [fetchIncome])

  // Derived KPIs
  const totalIncome = items.reduce((sum, i) => sum + i.totalAmountClp, 0)
  const totalPending = items.filter(i => i.paymentStatus === 'pending' || i.paymentStatus === 'partial')
    .reduce((sum, i) => sum + i.amountPending, 0)
  const paidCount = items.filter(i => i.paymentStatus === 'paid').length
  const overdueCount = items.filter(i => i.paymentStatus === 'overdue').length

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Ingresos
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Facturación, cobros y cuentas por cobrar
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
            Ingresos
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Facturación, cobros y cuentas por cobrar
          </Typography>
        </Box>
        <Button variant='contained' color='success' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
          Registrar ingreso
        </Button>
      </Box>

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total facturado'
            stats={formatCLP(totalIncome)}
            subtitle={`${total} facturas`}
            avatarIcon='tabler-file-invoice'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Por cobrar'
            stats={formatCLP(totalPending)}
            subtitle='Pendiente + parcial'
            avatarIcon='tabler-clock'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Cobrados'
            stats={String(paidCount)}
            subtitle='Facturas pagadas'
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Vencidos'
            stats={String(overdueCount)}
            subtitle='Requieren atención'
            avatarIcon='tabler-alert-triangle'
            avatarColor='error'
          />
        </Grid>
      </Grid>

      {/* Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registro de ingresos'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
              <i className='tabler-cash' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
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
                <TableCell>Factura</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell sx={{ width: 100 }}>Fecha</TableCell>
                <TableCell sx={{ width: 100 }}>Vencimiento</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Monto</TableCell>
                <TableCell sx={{ width: 100 }}>Estado</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Pendiente</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      No hay ingresos registrados aún
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => {
                  const statusConf = STATUS_CONFIG[item.paymentStatus] || STATUS_CONFIG.pending

                  return (
                    <TableRow key={item.incomeId} hover>
                      <TableCell>
                        <Box>
                          <Typography variant='body2' fontWeight={600}>
                            {item.invoiceNumber || item.incomeId}
                          </Typography>
                          {item.description ? (
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description}
                            </Typography>
                          ) : null}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{item.clientName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{formatDate(item.invoiceDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{formatDate(item.dueDate)}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' fontWeight={600}>
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
                      <TableCell align='right'>
                        <Typography
                          variant='body2'
                          fontWeight={500}
                          color={item.amountPending > 0 ? 'error.main' : 'success.main'}
                        >
                          {item.amountPending > 0 ? formatAmount(item.amountPending, item.currency) : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <CreateIncomeDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchIncome() }} />
    </Box>
  )
}

export default IncomeListView
