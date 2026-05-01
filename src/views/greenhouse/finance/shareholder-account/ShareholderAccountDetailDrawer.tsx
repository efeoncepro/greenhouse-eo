'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import PaymentProfilesPanel from '@views/greenhouse/finance/payment-profiles/PaymentProfilesPanel'

import type { ShareholderAccountBalance, ShareholderAccountMovement, ShareholderAccountSummary } from './types'
import {
  formatDate,
  formatMoney,
  formatPercent,
  getAccountStatusMeta,
  getBalanceMeta,
  getDirectionMeta,
  getMovementTypeLabel,
  getShareholderMovementSourceStatusMeta,
  getShareholderMovementSourceTypeMeta,
  isRecord,
  normalizeShareholderBalance,
  normalizeShareholderMovement
} from './utils'

type Props = {
  open: boolean
  account: ShareholderAccountSummary | null
  onClose: () => void
  onRegisterMovement: (account: ShareholderAccountSummary) => void
  onSuccess: () => void
}

type MovementResponse = {
  items?: unknown[]
  total?: number
}

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'expense_paid_by_shareholder', label: 'Gasto pagado por el accionista' },
  { value: 'personal_withdrawal', label: 'Retiro personal' },
  { value: 'reimbursement', label: 'Reembolso de la empresa' },
  { value: 'return_to_company', label: 'Devolución a la empresa' },
  { value: 'salary_advance', label: 'Adelanto de sueldo' },
  { value: 'capital_contribution', label: 'Aporte de capital' },
  { value: 'other', label: 'Otro' }
]

const DIRECTION_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' }
]

const getToday = () => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const getMonthStart = () => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

const ShareholderAccountDetailDrawer = ({
  open,
  account,
  onClose,
  onRegisterMovement,
  onSuccess
}: Props) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<ShareholderAccountBalance | null>(null)
  const [movements, setMovements] = useState<ShareholderAccountMovement[]>([])
  const [movementTotal, setMovementTotal] = useState(0)

  const [fromDate, setFromDate] = useState(getMonthStart())
  const [toDate, setToDate] = useState(getToday())
  const [directionFilter, setDirectionFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [movementTypeFilter, setMovementTypeFilter] = useState('all')
  const [appliedFromDate, setAppliedFromDate] = useState(getMonthStart())
  const [appliedToDate, setAppliedToDate] = useState(getToday())
  const [appliedDirectionFilter, setAppliedDirectionFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [appliedMovementTypeFilter, setAppliedMovementTypeFilter] = useState('all')

  const selectedAccount = account || null

  const fetchDetail = useCallback(async () => {
    if (!open || !selectedAccount) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (appliedFromDate) params.set('fromDate', appliedFromDate)
      if (appliedToDate) params.set('toDate', appliedToDate)
      if (appliedDirectionFilter !== 'all') params.set('direction', appliedDirectionFilter)
      if (appliedMovementTypeFilter !== 'all') params.set('movementType', appliedMovementTypeFilter)

      const [balanceRes, movementsRes] = await Promise.all([
        fetch(`/api/finance/shareholder-account/${selectedAccount.accountId}/balance`, { cache: 'no-store' }),
        fetch(`/api/finance/shareholder-account/${selectedAccount.accountId}/movements?${params.toString()}`, {
          cache: 'no-store'
        })
      ])

      if (!balanceRes.ok) {
        const body = await balanceRes.json().catch(() => ({}))

        setError(body.error || 'No pudimos cargar el saldo de la cuenta.')

        return
      }

      if (!movementsRes.ok) {
        const body = await movementsRes.json().catch(() => ({}))

        setError(body.error || 'No pudimos cargar los movimientos de la cuenta.')

        return
      }

      const balanceBody = await balanceRes.json().catch(() => ({}))
      const movementsBody: MovementResponse = await movementsRes.json()

      setBalance(isRecord(balanceBody) ? normalizeShareholderBalance(balanceBody) : null)
      setMovements((movementsBody.items ?? []).filter(isRecord).map(normalizeShareholderMovement))
      setMovementTotal(movementsBody.total ?? (movementsBody.items?.length ?? 0))
    } catch {
      setError('No pudimos conectar con Finance. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [appliedDirectionFilter, appliedFromDate, appliedMovementTypeFilter, appliedToDate, open, selectedAccount])

  useEffect(() => {
    if (!open) {
      setError(null)
      setBalance(null)
      setMovements([])
      setMovementTotal(0)
      setFromDate(getMonthStart())
      setToDate(getToday())
      setDirectionFilter('all')
      setMovementTypeFilter('all')
      setAppliedFromDate(getMonthStart())
      setAppliedToDate(getToday())
      setAppliedDirectionFilter('all')
      setAppliedMovementTypeFilter('all')

      return
    }

    void fetchDetail()
  }, [fetchDetail, open])

  const movementTable = useReactTable({
    data: movements,
    columns: useMemo(() => {
      const helper = createColumnHelper<ShareholderAccountMovement>()

      return [
        helper.accessor('movementDate', {
          header: 'Fecha',
          cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography>
        }),
        helper.accessor('movementType', {
          header: 'Tipo',
          cell: ({ row }) => (
            <Stack spacing={0.5}>
              <CustomChip
                round='true'
                size='small'
                color={getDirectionMeta(row.original.direction).color}
                label={getDirectionMeta(row.original.direction).label}
              />
              <Typography variant='body2' fontWeight={600}>
                {getMovementTypeLabel(row.original.movementType)}
              </Typography>
            </Stack>
          )
        }),
        helper.accessor('amount', {
          header: 'Monto',
          cell: ({ row }) => {
            const value = row.original.amountClp ?? row.original.amount

            return (
              <Stack spacing={0.5}>
                <Typography
                  variant='body2'
                  fontWeight={700}
                  color={row.original.direction === 'debit' ? 'warning.main' : 'success.main'}
                >
                  {formatMoney(value, row.original.amountClp !== null ? 'CLP' : row.original.currency)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {row.original.currency}
                </Typography>
              </Stack>
            )
          }
        }),
        helper.accessor('description', {
          header: 'Descripción',
          cell: ({ row }) => (
            <Stack spacing={0.25}>
              <Typography variant='body2' fontWeight={500}>
                {row.original.description || 'Sin descripción'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {row.original.recordedAt ? `Registrado ${formatDate(row.original.recordedAt)}` : 'Registro operativo'}
              </Typography>
            </Stack>
          )
        }),
        helper.accessor('sourceId', {
          header: 'Origen',
          cell: ({ row }) => {
            const source = row.original.source
            const sourceTypeMeta = getShareholderMovementSourceTypeMeta(row.original.sourceType)
            const sourceStatusMeta = getShareholderMovementSourceStatusMeta(source?.status ?? null)
            const href = source?.href || null

            return (
              <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                  <CustomChip round='true' size='small' color={sourceTypeMeta.color} label={sourceTypeMeta.label} />
                  {href ? (
                    <Button
                      component={Link}
                      href={href}
                      size='small'
                      variant='text'
                      sx={{ px: 0, minWidth: 0, whiteSpace: 'nowrap' }}
                    >
                      Abrir
                    </Button>
                  ) : null}
                </Stack>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='body2' fontWeight={600} noWrap>
                    {source?.label || (row.original.sourceId ? 'Origen vinculado' : 'Movimiento manual')}
                  </Typography>
                  {source?.subtitle ? (
                    <Typography variant='caption' color='text.secondary' display='block' noWrap>
                      {source.subtitle}
                    </Typography>
                  ) : row.original.sourceId ? (
                    <Typography variant='caption' color='text.secondary' display='block' noWrap>
                      ID: {row.original.sourceId}
                    </Typography>
                  ) : null}
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                    {source?.amount !== null && source?.currency ? (
                      <Typography variant='caption' color='text.secondary'>
                        {formatMoney(source.amount, source.currency)}
                      </Typography>
                    ) : null}
                    {source?.date ? (
                      <Typography variant='caption' color='text.secondary'>
                        {formatDate(source.date)}
                      </Typography>
                    ) : null}
                    {source?.status ? (
                      <Typography variant='caption' color='text.secondary'>
                        {sourceStatusMeta.label}
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              </Stack>
            )
          }
        })
      ]
    }, []),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 8, pageIndex: 0 }
    }
  })

  const activeBalance = balance ?? (selectedAccount ? {
    balanceClp: selectedAccount.balanceClp,
    currency: selectedAccount.currency,
    status: selectedAccount.status,
    lastMovementAt: selectedAccount.lastMovementAt,
    movementCount: selectedAccount.movementCount
  } : null)

  const balanceMeta = activeBalance ? getBalanceMeta(activeBalance.balanceClp) : null
  const statusMeta = getAccountStatusMeta(activeBalance?.status ?? selectedAccount?.status ?? null)

  const hasNoMovements = !loading && movements.length === 0

  const handleFilter = () => {
    setAppliedFromDate(fromDate)
    setAppliedToDate(toDate)
    setAppliedDirectionFilter(directionFilter)
    setAppliedMovementTypeFilter(movementTypeFilter)
  }

  const handleResetFilters = () => {
    const start = getMonthStart()
    const end = getToday()

    setFromDate(start)
    setToDate(end)
    setDirectionFilter('all')
    setMovementTypeFilter('all')
    setAppliedFromDate(start)
    setAppliedToDate(end)
    setAppliedDirectionFilter('all')
    setAppliedMovementTypeFilter('all')
  }

  const handleRefresh = () => {
    void fetchDetail()
    onSuccess()
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', xl: 980 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Detalle de cuenta</Typography>
          <Typography variant='body2' color='text.secondary'>
            Saldo actual, filtros mínimos y trazabilidad de cada movimiento bilateral.
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {!selectedAccount ? (
          <Alert severity='info'>Selecciona una cuenta desde el listado para ver el detalle.</Alert>
        ) : loading && movements.length === 0 ? (
          <Stack spacing={4}>
            <Card>
              <CardContent>
                <Skeleton variant='text' width='35%' height={24} />
                <Skeleton variant='text' width='65%' height={18} sx={{ mt: 1 }} />
                <Skeleton variant='text' width='30%' height={42} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
            <Skeleton variant='rounded' height={360} />
          </Stack>
        ) : (
          <Stack spacing={4}>
            {error ? <Alert severity='error'>{error}</Alert> : null}

            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'flex-start', lg: 'flex-start' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                        <Typography variant='h5' sx={{ wordBreak: 'break-word' }}>
                          {selectedAccount.accountName}
                        </Typography>
                        <CustomChip round='true' size='small' color={statusMeta.color} label={statusMeta.label} />
                      </Stack>
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                        {selectedAccount.shareholderName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.5 }}>
                        profile_id: {selectedAccount.profileId || '—'}
                        {selectedAccount.memberId ? ` · member_id: ${selectedAccount.memberId}` : ''}
                      </Typography>
                      {selectedAccount.notes ? (
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 2, maxWidth: 620 }}>
                          {selectedAccount.notes}
                        </Typography>
                      ) : null}
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button variant='tonal' color='secondary' onClick={() => onRegisterMovement(selectedAccount)}>
                        Registrar movimiento
                      </Button>
                      <Button variant='contained' onClick={handleRefresh}>
                        Refrescar
                      </Button>
                    </Stack>
                  </Stack>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <HorizontalWithSubtitle
                        title='Saldo actual'
                        stats={
                          <AnimatedCounter
                            value={activeBalance?.balanceClp ?? 0}
                            format='currency'
                            currency='CLP'
                          />
                        }
                        avatarIcon='tabler-wallet'
                        avatarColor={balanceMeta?.color || 'primary'}
                        subtitle={balanceMeta?.hint || 'Sin saldo disponible'}
                        statusLabel={balanceMeta?.label || 'Sin datos'}
                        statusColor={balanceMeta?.color || 'secondary'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <HorizontalWithSubtitle
                        title='Movimientos'
                        stats={<AnimatedCounter value={activeBalance?.movementCount ?? movements.length} format='integer' />}
                        avatarIcon='tabler-repeat'
                        avatarColor='info'
                        subtitle='Registros visibles en la cuenta'
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <HorizontalWithSubtitle
                        title='Participación'
                        stats={formatPercent(selectedAccount.ownershipPercentage)}
                        avatarIcon='tabler-chart-donut'
                        avatarColor='warning'
                        subtitle='Participación de referencia'
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <HorizontalWithSubtitle
                        title='Último movimiento'
                        stats={selectedAccount.lastMovementAt ? formatDate(selectedAccount.lastMovementAt) : 'Sin movimientos'}
                        avatarIcon='tabler-calendar-event'
                        avatarColor='secondary'
                        subtitle='Fecha de actualización visible'
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            {/* TASK-749: Perfil de pago del accionista (fuente primaria) */}
            {selectedAccount.profileId ? (
              <Card>
                <CardContent>
                  <PaymentProfilesPanel
                    constrainedBeneficiary={{
                      beneficiaryType: 'shareholder',
                      beneficiaryId: selectedAccount.profileId,
                      beneficiaryName: selectedAccount.shareholderName
                    }}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent='space-between'>
                    <Box>
                      <Typography variant='h6'>Movimientos</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Filtra por rango, dirección y tipo para revisar la historia bilateral de la cuenta.
                      </Typography>
                    </Box>
                    <Typography variant='caption' color='text.secondary'>
                      {movementTotal} movimiento{movementTotal === 1 ? '' : 's'} en total
                    </Typography>
                  </Stack>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <CustomTextField
                        type='date'
                        size='small'
                        fullWidth
                        label='Desde'
                        value={fromDate}
                        onChange={event => setFromDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <CustomTextField
                        type='date'
                        size='small'
                        fullWidth
                        label='Hasta'
                        value={toDate}
                        onChange={event => setToDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <CustomTextField
                        select
                        size='small'
                        fullWidth
                        label='Dirección'
                        value={directionFilter}
                        onChange={event => setDirectionFilter(event.target.value as 'all' | 'credit' | 'debit')}
                      >
                        {DIRECTION_OPTIONS.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                      <CustomTextField
                        select
                        size='small'
                        fullWidth
                        label='Tipo'
                        value={movementTypeFilter}
                        onChange={event => setMovementTypeFilter(event.target.value)}
                      >
                        {MOVEMENT_TYPE_OPTIONS.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>
                  </Grid>

                  <Stack direction='row' spacing={2} justifyContent='flex-end'>
                    <Button variant='tonal' color='secondary' onClick={handleResetFilters}>
                      Limpiar
                    </Button>
                    <Button variant='contained' onClick={handleFilter}>
                      Filtrar
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    {movementTable.getHeaderGroups().map(headerGroup => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <TableCell key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableHead>
                  <TableBody>
                    {movementTable.getRowModel().rows.length ? (
                      movementTable.getRowModel().rows.map(row => (
                        <TableRow key={row.id} hover>
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : hasNoMovements ? (
                      <TableRow>
                        <TableCell colSpan={movementTable.getAllColumns().length}>
                          <Alert severity='info'>
                            No hay movimientos con estos filtros. Revisa el rango o registra el primer movimiento manual.
                          </Alert>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={movementTable.getAllColumns().length}>
                          <Alert severity='warning'>
                            Todavía no tenemos movimientos visibles para esta cuenta.
                          </Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePaginationComponent table={movementTable} />
            </Card>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}

export default ShareholderAccountDetailDrawer
