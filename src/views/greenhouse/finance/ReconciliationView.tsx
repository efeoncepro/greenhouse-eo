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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReconciliationPeriod {
  periodId: string
  accountId: string
  year: number
  month: number
  openingBalance: number
  closingBalanceBank: number
  closingBalanceSystem: number
  difference: number
  status: string
  statementImported: boolean
  statementRowCount: number
  reconciledBy: string | null
  reconciledAt: string | null
  notes: string | null
}

interface Account {
  accountId: string
  accountName: string
}

interface IncomeMovement {
  incomeId: string
  clientName: string
  invoiceDate: string | null
  totalAmountClp: number
  isReconciled: boolean
}

interface ExpenseMovement {
  expenseId: string
  description: string
  supplierName: string | null
  memberName: string | null
  paymentDate: string | null
  documentDate: string | null
  totalAmountClp: number
  isReconciled: boolean
}

interface PendingMovement {
  id: string
  type: 'income' | 'expense'
  description: string
  partyName: string | null
  date: string | null
  amount: number
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'primary' }> = {
  open: { label: 'Abierto', color: 'info' },
  in_progress: { label: 'En proceso', color: 'warning' },
  reconciled: { label: 'Conciliado', color: 'success' },
  closed: { label: 'Cerrado', color: 'secondary' }
}

const MONTH_NAMES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (date: string | null): string => {
  if (!date) {
    return '—'
  }

  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReconciliationView = () => {
  const [loading, setLoading] = useState(true)
  const [periods, setPeriods] = useState<ReconciliationPeriod[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [pendingMovements, setPendingMovements] = useState<PendingMovement[]>([])
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fetchErrors, setFetchErrors] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const errors: string[] = []

    try {
      const params = new URLSearchParams()

      if (accountFilter) params.set('accountId', accountFilter)
      if (statusFilter) params.set('status', statusFilter)

      const [periodsRes, accountsRes, incomeRes, expenseRes] = await Promise.all([
        fetch(`/api/finance/reconciliation?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/finance/accounts', { cache: 'no-store' }),
        fetch('/api/finance/income?pageSize=20', { cache: 'no-store' }),
        fetch('/api/finance/expenses?pageSize=20', { cache: 'no-store' })
      ])

      if (periodsRes.ok) {
        const data = await periodsRes.json()

        setPeriods(data.items ?? [])
      } else {
        errors.push(`Períodos: ${periodsRes.status}`)
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json()

        setAccounts(data.items?.map((a: { accountId: string; accountName: string }) => ({
          accountId: a.accountId,
          accountName: a.accountName
        })) ?? [])
      } else {
        errors.push(`Cuentas: ${accountsRes.status}`)
      }

      if (incomeRes.ok && expenseRes.ok) {
        const incomeData = await incomeRes.json()
        const expenseData = await expenseRes.json()

        const incomes: PendingMovement[] = (incomeData.items ?? [])
          .filter((item: IncomeMovement) => !item.isReconciled)
          .map((item: IncomeMovement) => ({
            id: item.incomeId,
            type: 'income',
            description: item.clientName || item.incomeId,
            partyName: item.clientName || null,
            date: item.invoiceDate,
            amount: item.totalAmountClp
          }))

        const expenses: PendingMovement[] = (expenseData.items ?? [])
          .filter((item: ExpenseMovement) => !item.isReconciled)
          .map((item: ExpenseMovement) => ({
            id: item.expenseId,
            type: 'expense',
            description: item.description,
            partyName: item.supplierName || item.memberName || null,
            date: item.paymentDate || item.documentDate,
            amount: -item.totalAmountClp
          }))

        setPendingMovements(
          [...incomes, ...expenses]
            .sort((left, right) => (right.date || '').localeCompare(left.date || ''))
            .slice(0, 10)
        )
      } else {
        if (!incomeRes.ok) {
          errors.push(`Ingresos: ${incomeRes.status}`)
        }

        if (!expenseRes.ok) {
          errors.push(`Egresos: ${expenseRes.status}`)
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'No pudimos cargar la conciliación.')
    } finally {
      setFetchErrors(errors)
      setLoading(false)
    }
  }, [accountFilter, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derived KPIs
  const totalPeriods = periods.length
  const reconciledCount = periods.filter(p => p.status === 'reconciled').length
  const inProgressCount = periods.filter(p => p.status === 'in_progress').length
  const pendingMovementCount = pendingMovements.length

  const totalDifference = periods
    .filter(p => p.status !== 'reconciled')
    .reduce((sum, p) => sum + Math.abs(p.difference), 0)

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && periods.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Conciliación
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Conciliación bancaria y matching de transacciones
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
            Conciliación
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Conciliación bancaria y matching de transacciones
          </Typography>
        </Box>
        <Button variant='contained' color='primary' startIcon={<i className='tabler-plus' />}>
          Nuevo período
        </Button>
      </Box>

      {fetchErrors.length > 0 && (
        <Alert severity='warning' sx={{ whiteSpace: 'pre-line' }}>
          {`Error cargando conciliación:\n${fetchErrors.join('\n')}`}
        </Alert>
      )}

      {accounts.length === 0 && pendingMovementCount > 0 && (
        <Alert severity='info'>
          Hay movimientos financieros pendientes, pero todavía no existen cuentas activas en `Finance`. Mientras no se registren cuentas, no podrás abrir períodos de conciliación ni cargar extractos bancarios.
        </Alert>
      )}

      {accounts.length > 0 && periods.length === 0 && pendingMovementCount > 0 && (
        <Alert severity='info'>
          Ya existen movimientos por conciliar, pero aún no hay períodos abiertos. Crea un período para el mes y cuenta correspondiente para empezar el matching bancario.
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Períodos'
            stats={String(totalPeriods)}
            subtitle='Períodos registrados'
            avatarIcon='tabler-calendar'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Conciliados'
            stats={String(reconciledCount)}
            subtitle='Períodos cerrados'
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='En proceso'
            stats={String(inProgressCount)}
            subtitle='Pendientes de cierre'
            avatarIcon='tabler-clock'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Por conciliar'
            stats={String(pendingMovementCount)}
            subtitle={pendingMovementCount === 1 ? 'Movimiento pendiente' : 'Movimientos pendientes'}
            avatarIcon='tabler-alert-triangle'
            avatarColor={pendingMovementCount > 0 ? 'error' : 'success'}
          />
        </Grid>
      </Grid>

      {periods.length > 0 && (
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <HorizontalWithSubtitle
              title='Diferencia total abierta'
              stats={formatCLP(totalDifference)}
              subtitle='Descuadre acumulado de períodos no conciliados'
              avatarIcon='tabler-scale'
              avatarColor={totalDifference > 0 ? 'warning' : 'success'}
            />
          </Grid>
        </Grid>
      )}

      {/* Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Períodos de conciliación'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-arrows-exchange' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            select
            size='small'
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value=''>Todas las cuentas</MenuItem>
            {accounts.map(acc => (
              <MenuItem key={acc.accountId} value={acc.accountId}>{acc.accountName}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>Todos los estados</MenuItem>
            <MenuItem value='open'>Abierto</MenuItem>
            <MenuItem value='in_progress'>En proceso</MenuItem>
            <MenuItem value='reconciled'>Conciliado</MenuItem>
            <MenuItem value='closed'>Cerrado</MenuItem>
          </CustomTextField>
        </CardContent>
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Período</TableCell>
                <TableCell>Cuenta</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Saldo apertura</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Saldo banco</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Saldo sistema</TableCell>
                <TableCell sx={{ width: 120 }} align='right'>Diferencia</TableCell>
                <TableCell sx={{ width: 80 }} align='center'>Filas</TableCell>
                <TableCell sx={{ width: 100 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      {accounts.length === 0
                        ? 'No hay períodos de conciliación porque aún no existen cuentas activas registradas.'
                        : 'No hay períodos de conciliación registrados aún'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                periods.map(period => {
                  const statusConf = STATUS_CONFIG[period.status] || STATUS_CONFIG.open
                  const accountName = accounts.find(a => a.accountId === period.accountId)?.accountName || period.accountId
                  const hasDifference = period.difference !== 0 && period.status !== 'reconciled'

                  return (
                    <TableRow key={period.periodId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>
                          {MONTH_NAMES[period.month]} {period.year}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{accountName}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{formatCLP(period.openingBalance)}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {period.closingBalanceBank ? formatCLP(period.closingBalanceBank) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {period.closingBalanceSystem ? formatCLP(period.closingBalanceSystem) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography
                          variant='body2'
                          fontWeight={600}
                          color={hasDifference ? 'error.main' : 'success.main'}
                        >
                          {period.difference !== 0 ? formatCLP(period.difference) : '$0'}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2'>
                          {period.statementRowCount || 0}
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

      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Movimientos por conciliar'
          subheader={pendingMovementCount > 0 ? `${pendingMovementCount} movimientos financieros sin match bancario` : 'Sin movimientos pendientes'}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
              <i className='tabler-list-search' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>Tipo</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell sx={{ width: 160 }}>Entidad</TableCell>
                <TableCell sx={{ width: 110 }}>Fecha</TableCell>
                <TableCell sx={{ width: 140 }} align='right'>Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      No hay movimientos pendientes por conciliar.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pendingMovements.map(movement => (
                  <TableRow key={movement.id} hover>
                    <TableCell>
                      <CustomChip
                        round='true'
                        size='small'
                        color={movement.type === 'income' ? 'success' : 'error'}
                        label={movement.type === 'income' ? 'Ingreso' : 'Egreso'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {movement.description}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {movement.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{movement.partyName || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{formatDate(movement.date)}</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography
                        variant='body2'
                        fontWeight={600}
                        color={movement.amount >= 0 ? 'success.main' : 'error.main'}
                      >
                        {formatCLP(movement.amount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}

export default ReconciliationView
