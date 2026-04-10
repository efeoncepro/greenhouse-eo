'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
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

import CreateShareholderAccountDrawer from './CreateShareholderAccountDrawer'
import RegisterShareholderMovementDrawer from './RegisterShareholderMovementDrawer'
import ShareholderAccountDetailDrawer from './ShareholderAccountDetailDrawer'
import type { ShareholderAccountSummary, ShareholderMovementSourceType } from './types'
import {
  formatDate,
  formatMoney,
  formatPercent,
  getAccountStatusMeta,
  getBalanceMeta,
  isRecord,
  normalizeShareholderAccount,
  normalizeShareholderMovementSourceType
} from './utils'

type AccountsResponse = {
  items?: unknown[]
  summary?: unknown
  total?: number
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activas' },
  { value: 'frozen', label: 'Bloqueadas' },
  { value: 'closed', label: 'Cerradas' }
]

const ShareholderAccountView = () => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<ShareholderAccountSummary[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'closed'>('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ShareholderAccountSummary | null>(null)
  const [movementAccount, setMovementAccount] = useState<ShareholderAccountSummary | null>(null)
  const [movementSourceType, setMovementSourceType] = useState<ShareholderMovementSourceType | null>(null)
  const [movementSourceId, setMovementSourceId] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/shareholder-account', { cache: 'no-store' })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos cargar las cuentas corrientes accionistas.')

        return
      }

      const data: AccountsResponse = await res.json()

      setAccounts((data.items ?? []).filter(isRecord).map(normalizeShareholderAccount))
    } catch {
      setError('No pudimos conectar con Finance. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAccounts()
  }, [fetchAccounts])

  const searchParamsString = searchParams.toString()

  const movementQueryContext = useMemo(() => {
    const params = new URLSearchParams(searchParamsString)
    const sourceType = normalizeShareholderMovementSourceType(params.get('sourceType'))
    const sourceId = params.get('sourceId')?.trim() || null

    return {
      sourceType,
      sourceId,
      hasContext: params.has('sourceType')
    }
  }, [searchParamsString])

  useEffect(() => {
    if (!movementQueryContext.hasContext) {
      return
    }

    setMovementAccount(null)
    setMovementSourceType(movementQueryContext.sourceType)
    setMovementSourceId(movementQueryContext.sourceType === 'manual' ? null : movementQueryContext.sourceId)
    setMovementOpen(true)
  }, [movementQueryContext.hasContext, movementQueryContext.sourceId, movementQueryContext.sourceType])

  const clearMovementQueryContext = useCallback(() => {
    if (!movementQueryContext.hasContext) {
      return
    }

    router.replace(pathname, { scroll: false })
  }, [movementQueryContext.hasContext, pathname, router])

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return accounts.filter(account => {
      if (statusFilter !== 'all' && account.status !== statusFilter) {
        return false
      }

      if (!query) {
        return true
      }

      return [
        account.accountName,
        account.shareholderName,
        account.profileId,
        account.memberId,
        account.notes
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    })
  }, [accounts, search, statusFilter])

  const summary = useMemo(() => {
    const netBalance = filteredAccounts.reduce((total, account) => total + account.balanceClp, 0)
    const companyOwesClp = filteredAccounts.reduce((total, account) => total + Math.max(account.balanceClp, 0), 0)
    const shareholderOwesClp = filteredAccounts.reduce((total, account) => total + Math.abs(Math.min(account.balanceClp, 0)), 0)
    const movementCount = filteredAccounts.reduce((total, account) => total + account.movementCount, 0)
    const activeCount = filteredAccounts.filter(account => account.status === 'active').length
    const frozenCount = filteredAccounts.filter(account => account.status === 'frozen').length
    const closedCount = filteredAccounts.filter(account => account.status === 'closed').length
    const zeroBalanceCount = filteredAccounts.filter(account => account.balanceClp === 0).length

    return {
      netBalance,
      companyOwesClp,
      shareholderOwesClp,
      movementCount,
      activeCount,
      frozenCount,
      closedCount,
      zeroBalanceCount
    }
  }, [filteredAccounts])

  const listTable = useReactTable({
    data: filteredAccounts,
    columns: useMemo(() => {
      const helper = createColumnHelper<ShareholderAccountSummary>()

      return [
        helper.accessor('accountName', {
          header: 'Cuenta',
          cell: ({ row }) => (
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant='body2' fontWeight={600} noWrap>
                {row.original.accountName}
              </Typography>
              <Typography variant='caption' color='text.secondary' noWrap>
                {row.original.shareholderName}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                profile_id: {row.original.profileId || '—'}
                {row.original.memberId ? ` · member_id: ${row.original.memberId}` : ''}
              </Typography>
            </Stack>
          )
        }),
        helper.accessor('status', {
          header: 'Estado',
          cell: ({ getValue }) => {
            const meta = getAccountStatusMeta(getValue())

            return <CustomChip round='true' size='small' color={meta.color} label={meta.label} />
          }
        }),
        helper.accessor('ownershipPercentage', {
          header: 'Participación',
          cell: ({ getValue }) => <Typography variant='body2'>{formatPercent(getValue())}</Typography>
        }),
        helper.accessor('balanceClp', {
          header: 'Saldo',
          cell: ({ row }) => {
            const meta = getBalanceMeta(row.original.balanceClp)

            return (
              <Stack spacing={0.25}>
                <Typography
                  variant='body2'
                  fontWeight={700}
                  color={meta.color === 'success' ? 'success.main' : meta.color === 'warning' ? 'warning.main' : 'text.primary'}
                >
                  {formatMoney(row.original.balanceClp, row.original.currency)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {meta.label}
                </Typography>
              </Stack>
            )
          }
        }),
        helper.accessor('movementCount', {
          header: 'Movimientos',
          cell: ({ row }) => (
            <Stack spacing={0.25}>
              <Typography variant='body2' fontWeight={600}>
                {row.original.movementCount}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {row.original.lastMovementAt ? `Último: ${formatDate(row.original.lastMovementAt)}` : 'Sin movimientos'}
              </Typography>
            </Stack>
          )
        }),
        helper.display({
          id: 'actions',
          header: 'Acciones',
          cell: ({ row }) => (
            <Stack direction='row' spacing={1} justifyContent='flex-end'>
              <Button variant='tonal' size='small' onClick={() => {
                setSelectedAccount(row.original)
                setDetailOpen(true)
              }}>
                Ver detalle
              </Button>
              <Button variant='text' size='small' onClick={() => {
                setMovementAccount(row.original)
                setMovementOpen(true)
              }}>
                Movimiento
              </Button>
            </Stack>
          )
        })
      ]
    }, []),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10
      }
    }
  })

  const handleRefresh = () => void fetchAccounts()

  if (loading && accounts.length === 0) {
    return (
      <Stack spacing={6}>
        <Box>
          <Typography variant='h4' sx={{ mb: 1 }}>
            Cuenta corriente accionista
          </Typography>
          <Typography color='text.secondary'>
            Control bilateral entre la empresa y los accionistas.
          </Typography>
        </Box>
        <Grid container spacing={6}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card>
                <CardContent>
                  <Skeleton variant='text' width='55%' height={24} />
                  <Skeleton variant='text' width='40%' height={40} sx={{ mt: 1 }} />
                  <Skeleton variant='text' width='70%' height={18} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={360} />
      </Stack>
    )
  }

  return (
    <>
      <Stack spacing={6}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} justifyContent='space-between' alignItems={{ xs: 'flex-start', lg: 'center' }}>
              <Box>
                <Typography variant='h4' sx={{ mb: 1 }}>
                  Cuenta corriente accionista
                </Typography>
                <Typography color='text.secondary' sx={{ maxWidth: 760 }}>
                  Lee el saldo bilateral entre empresa y accionistas. Positivo significa que la empresa debe; negativo significa
                  que el accionista debe. Aquí puedes crear cuentas, registrar movimientos y revisar la trazabilidad.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant='tonal'
                  color='secondary'
                  onClick={() => {
                    clearMovementQueryContext()
                    setMovementAccount(null)
                    setMovementSourceType(null)
                    setMovementSourceId(null)
                    setMovementOpen(true)
                  }}
                >
                  Registrar movimiento
                </Button>
                <Button variant='contained' onClick={() => setCreateOpen(true)}>
                  Nueva cuenta
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {error ? (
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={handleRefresh}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <HorizontalWithSubtitle
              title='Cuentas activas'
              stats={<AnimatedCounter value={summary.activeCount} format='integer' />}
              avatarIcon='tabler-license'
              avatarColor='success'
              subtitle='Cuentas disponibles para operar'
              footer={`${summary.frozenCount} bloqueadas · ${summary.closedCount} cerradas`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <HorizontalWithSubtitle
              title='Empresa debe'
              stats={<AnimatedCounter value={summary.companyOwesClp} format='currency' currency='CLP' />}
              avatarIcon='tabler-arrow-down-right-circle'
              avatarColor='success'
              subtitle='Saldo positivo agregado'
              footer='La empresa debe al accionista'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <HorizontalWithSubtitle
              title='Accionista debe'
              stats={<AnimatedCounter value={summary.shareholderOwesClp} format='currency' currency='CLP' />}
              avatarIcon='tabler-arrow-up-right-circle'
              avatarColor='warning'
              subtitle='Saldo negativo agregado'
              footer='El accionista debe a la empresa'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <HorizontalWithSubtitle
              title='Movimientos'
              stats={<AnimatedCounter value={summary.movementCount} format='integer' />}
              avatarIcon='tabler-repeat'
              avatarColor='info'
              subtitle='Registros visibles en el listado'
              footer={`${summary.zeroBalanceCount} cuentas saldadas`}
            />
          </Grid>
        </Grid>

        <Card>
          <CardHeader
            title='Listado de cuentas'
            subheader='Usa el estado y la búsqueda para encontrar rápido la cuenta que necesitas.'
            action={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <CustomTextField
                  size='small'
                  label='Buscar'
                  placeholder='Cuenta, accionista, profile_id'
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
                <CustomTextField
                  select
                  size='small'
                  label='Estado'
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as 'all' | 'active' | 'frozen' | 'closed')}
                  sx={{ minWidth: 180 }}
                >
                  {STATUS_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Stack>
            }
          />
          <Divider />
          <TableContainer>
            <Table>
              <TableHead>
                {listTable.getHeaderGroups().map(headerGroup => (
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
                {listTable.getRowModel().rows.length ? (
                  listTable.getRowModel().rows.map(row => (
                    <TableRow key={row.id} hover>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={listTable.getAllColumns().length}>
                      <Alert severity='info'>
                        No hay cuentas que coincidan con el filtro actual. Crea la primera cuenta para empezar.
                      </Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePaginationComponent table={listTable} />
        </Card>
      </Stack>

      <CreateShareholderAccountDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleRefresh}
      />

      <RegisterShareholderMovementDrawer
        open={movementOpen}
        accounts={accounts}
        account={movementAccount}
        initialSourceType={movementSourceType}
        initialSourceId={movementSourceId}
        onClose={() => {
          setMovementOpen(false)
          setMovementAccount(null)
          setMovementSourceType(null)
          setMovementSourceId(null)
          clearMovementQueryContext()
        }}
        onSuccess={handleRefresh}
      />

      <ShareholderAccountDetailDrawer
        open={detailOpen}
        account={selectedAccount}
        onClose={() => {
          setDetailOpen(false)
          setSelectedAccount(null)
        }}
        onRegisterMovement={account => {
          clearMovementQueryContext()
          setDetailOpen(false)
          setMovementAccount(account)
          setMovementSourceType(null)
          setMovementSourceId(null)
          setMovementOpen(true)
        }}
        onSuccess={handleRefresh}
      />
    </>
  )
}

export default ShareholderAccountView
