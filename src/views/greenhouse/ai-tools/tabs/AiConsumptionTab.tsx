'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import type { TextFieldProps } from '@mui/material/TextField'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

import type { AiCreditLedgerEntry, AiCreditLedgerResponse, AiToolingAdminMetadata } from '@/types/ai-tools'
import { ledgerEntryTypeConfig, formatTimestamp, formatCost } from '../helpers'
import AiConsumptionFilters from './AiConsumptionFilters'

import tableStyles from '@core/styles/table.module.css'

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => { setValue(initialValue) }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => { onChange(value) }, debounce)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <CustomTextField {...props} value={value} onChange={e => setValue(e.target.value)} />
}

const columnHelper = createColumnHelper<AiCreditLedgerEntry>()

type Props = {
  meta: AiToolingAdminMetadata | null
}

const AiConsumptionTab = ({ meta }: Props) => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AiCreditLedgerResponse | null>(null)
  const [filterWallet, setFilterWallet] = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [consumeOpen, setConsumeOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')

  // Consume form
  const [formWallet, setFormWallet] = useState('')
  const [formAmount, setFormAmount] = useState<number | ''>(1)
  const [formMember, setFormMember] = useState('')
  const [formAsset, setFormAsset] = useState('')
  const [formProject, setFormProject] = useState('')
  const [formTaskId, setFormTaskId] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const fetchLedger = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams()
    if (filterWallet) params.set('walletId', filterWallet)
    if (filterMember) params.set('memberId', filterMember)
    params.set('limit', '100')

    const res = await fetch(`/api/ai-credits/ledger?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [filterWallet, filterMember])

  useEffect(() => { fetchLedger() }, [fetchLedger])

  const handleConsume = async () => {
    setSaving(true)

    try {
      const requestId = `consume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const res = await fetch('/api/ai-credits/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          walletId: formWallet,
          creditAmount: formAmount === '' ? 0 : formAmount,
          consumedByMemberId: formMember,
          assetDescription: formAsset,
          projectName: formProject || null,
          notionTaskId: formTaskId || null,
          notes: formNotes || null
        })
      })

      if (res.ok) {
        setConsumeOpen(false)
        fetchLedger()
      }
    } finally {
      setSaving(false)
    }
  }

  const openConsume = () => {
    setFormWallet('')
    setFormAmount(1)
    setFormMember('')
    setFormAsset('')
    setFormProject('')
    setFormTaskId('')
    setFormNotes('')
    setConsumeOpen(true)
  }

  const entries = data?.entries ?? []

  const columns = useMemo<ColumnDef<AiCreditLedgerEntry, any>[]>(
    () => [
      columnHelper.accessor('createdAt', {
        header: 'Fecha',
        cell: ({ getValue }) => (
          <Typography sx={{ whiteSpace: 'nowrap' }}>
            {formatTimestamp(getValue())}
          </Typography>
        )
      }),
      columnHelper.accessor('entryType', {
        header: 'Tipo',
        cell: ({ row }) => {
          const et = row.original.entryType
          const conf = ledgerEntryTypeConfig[et]

          return (
            <CustomChip
              round='true' size='small' variant='tonal'
              icon={<i className={conf?.icon ?? 'tabler-circle'} />}
              label={conf?.label ?? et}
              color={conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'}
            />
          )
        }
      }),
      columnHelper.accessor('creditAmount', {
        header: 'Créditos',
        cell: ({ row }) => {
          const isDebit = row.original.entryType === 'debit'

          return (
            <Typography
              sx={{ fontFamily: 'monospace', fontWeight: 600, color: isDebit ? 'error.main' : 'success.main' }}
            >
              {isDebit ? '-' : '+'}{row.original.creditAmount}
            </Typography>
          )
        }
      }),
      columnHelper.accessor('balanceAfter', {
        header: 'Balance',
        cell: ({ getValue }) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {getValue()}
          </Typography>
        )
      }),
      columnHelper.accessor('consumedByName', {
        header: 'Miembro',
        cell: ({ getValue }) => (
          <Typography>{getValue() ?? '—'}</Typography>
        )
      }),
      columnHelper.display({
        id: 'asset',
        header: 'Descripción',
        cell: ({ row }) => (
          <Typography noWrap sx={{ maxWidth: 200 }}>
            {row.original.assetDescription ?? row.original.reloadReason ?? '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('projectName', {
        header: 'Proyecto',
        cell: ({ getValue }) => (
          <Typography>{getValue() ?? '—'}</Typography>
        )
      }),
      columnHelper.display({
        id: 'cost',
        header: 'Costo',
        cell: ({ row }) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {formatCost(row.original.totalCost, row.original.costCurrency)}
          </Typography>
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: entries,
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { globalFilter },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } }
  })

  if (loading) {
    return (
      <Card>
        <CardHeader title='Registro de consumo' />
        <Stack spacing={1} sx={{ p: 6 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant='rounded' height={44} />
          ))}
        </Stack>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader title='Filters' className='pbe-4' />
        <AiConsumptionFilters
          meta={meta}
          filterMember={filterMember}
          filterWallet={filterWallet}
          setFilterMember={setFilterMember}
          setFilterWallet={setFilterWallet}
        />
        <div className='flex justify-between flex-col items-start md:flex-row md:items-center p-6 border-bs gap-4'>
          <CustomTextField
            select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className='max-sm:is-full sm:is-[70px]'
          >
            <MenuItem value='10'>10</MenuItem>
            <MenuItem value='25'>25</MenuItem>
            <MenuItem value='50'>50</MenuItem>
          </CustomTextField>
          <div className='flex flex-col sm:flex-row max-sm:is-full items-start sm:items-center gap-4'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Buscar movimiento'
              className='max-sm:is-full sm:is-[250px]'
            />
            <Button
              variant='contained'
              startIcon={<i className='tabler-plus' />}
              onClick={openConsume}
              className='max-sm:is-full'
            >
              Registrar consumo
            </Button>
          </div>
        </div>
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <>
                          <div
                            className={classnames({
                              'flex items-center': header.column.getIsSorted(),
                              'cursor-pointer select-none': header.column.getCanSort()
                            })}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <i className='tabler-chevron-up text-xl' />,
                              desc: <i className='tabler-chevron-down text-xl' />
                            }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                          </div>
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {table.getFilteredRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    <Typography color='text.secondary' sx={{ py: 4 }}>
                      No se encontraron movimientos
                    </Typography>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table
                  .getRowModel()
                  .rows.slice(0, table.getState().pagination.pageSize)
                  .map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            )}
          </table>
        </div>
        <TablePagination
          component={() => <TablePaginationComponent table={table} />}
          count={table.getFilteredRowModel().rows.length}
          rowsPerPage={table.getState().pagination.pageSize}
          page={table.getState().pagination.pageIndex}
          onPageChange={(_, page) => table.setPageIndex(page)}
        />
      </Card>

      {/* Consume Dialog */}
      <Dialog open={consumeOpen} onClose={() => !saving && setConsumeOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar variant='rounded' skin='light' color='warning' size={36}>
              <i className='tabler-receipt' style={{ fontSize: 20 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>Registrar consumo</Typography>
              <Typography variant='caption' color='text.secondary'>Debita créditos de un wallet</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              fullWidth size='small' label='Wallet ID'
              value={formWallet} onChange={e => setFormWallet(e.target.value)}
              required helperText='ID del wallet a debitar'
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth size='small' label='Créditos' type='number'
                  value={formAmount} onChange={e => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <CustomTextField
                  select fullWidth size='small' label='Consumido por'
                  value={formMember} onChange={e => setFormMember(e.target.value)}
                  required
                >
                  {(meta?.activeMembers ?? []).length === 0 && <MenuItem disabled value=''>Sin miembros disponibles</MenuItem>}
                  {(meta?.activeMembers ?? []).map(m => (
                    <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            </Grid>
            <CustomTextField
              fullWidth size='small' label='Descripción del asset'
              value={formAsset} onChange={e => setFormAsset(e.target.value)}
              required helperText='Qué se generó con estos créditos'
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Nombre del proyecto'
                  value={formProject} onChange={e => setFormProject(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Notion Task ID'
                  value={formTaskId} onChange={e => setFormTaskId(e.target.value)}
                  helperText='Para trazabilidad con Notion'
                />
              </Grid>
            </Grid>
            <CustomTextField
              fullWidth size='small' label='Notas'
              value={formNotes} onChange={e => setFormNotes(e.target.value)}
              multiline rows={2}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 4, py: 2.5 }}>
          <Button variant='tonal' color='secondary' onClick={() => setConsumeOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant='contained' onClick={handleConsume} disabled={saving || !formWallet || !formMember || !formAsset || !formAmount}>
            {saving ? 'Registrando...' : 'Registrar consumo'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AiConsumptionTab
