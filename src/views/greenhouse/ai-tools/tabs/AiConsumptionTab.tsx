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

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

import type { AiCreditLedgerEntry, AiCreditLedgerResponse, AiToolingAdminMetadata } from '@/types/ai-tools'
import { ledgerEntryTypeConfig, formatTimestamp, formatCost } from '../helpers'
import AiConsumptionFilters from './AiConsumptionFilters'

import tableStyles from '@core/styles/table.module.css'

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
  const [sorting, setSorting] = useState<SortingState>([])

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
  const summary = data?.summary

  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        header: 'Fecha',
        cell: ({ getValue }) => (
          <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>
            {formatTimestamp(getValue())}
          </Typography>
        )
      }),
      columnHelper.accessor('entryType', {
        header: 'Tipo',
        cell: ({ getValue }) => {
          const conf = ledgerEntryTypeConfig[getValue()]

          return (
            <CustomChip
              round='true' size='small' variant='tonal'
              icon={<i className={conf?.icon ?? 'tabler-circle'} />}
              label={conf?.label ?? getValue()}
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
              variant='body2'
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
          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }} color='text.secondary'>
            {getValue()}
          </Typography>
        )
      }),
      columnHelper.accessor('consumedByName', {
        header: 'Miembro',
        cell: ({ getValue }) => (
          <Typography variant='body2'>{getValue() ?? '—'}</Typography>
        )
      }),
      columnHelper.display({
        id: 'asset',
        header: 'Asset / Descripción',
        cell: ({ row }) => (
          <Typography variant='body2' noWrap sx={{ maxWidth: 200 }}>
            {row.original.assetDescription ?? row.original.reloadReason ?? '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('projectName', {
        header: 'Proyecto',
        cell: ({ getValue }) => (
          <Typography variant='body2' color='text.secondary'>
            {getValue() ?? '—'}
          </Typography>
        )
      }),
      columnHelper.display({
        id: 'cost',
        header: 'Costo',
        cell: ({ row }) => (
          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }} color='text.secondary'>
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } }
  })

  return (
    <>
      <Card>
        <CardHeader
          title='Registro de consumo'
          subheader={summary ? `${summary.totalEntries} movimientos · ${summary.totalDebits} débitos · ${summary.totalCredits} créditos` : undefined}
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openConsume}>
              Registrar consumo
            </Button>
          }
        />
        <AiConsumptionFilters
          meta={meta}
          filterMember={filterMember}
          filterWallet={filterWallet}
          setFilterMember={setFilterMember}
          setFilterWallet={setFilterWallet}
        />
        {loading ? (
          <Stack spacing={1} sx={{ px: 4, pb: 4 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <Skeleton key={i} variant='rounded' height={44} />
            ))}
          </Stack>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id}>
                          {header.isPlaceholder ? null : (
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
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className='text-center'>
                        <Stack alignItems='center' spacing={2} sx={{ py: 6 }}>
                          <CustomAvatar variant='rounded' skin='light' color='warning' size={56}>
                            <i className='tabler-receipt' style={{ fontSize: 28 }} />
                          </CustomAvatar>
                          <Typography variant='h6' color='text.secondary'>Sin movimientos</Typography>
                          <Typography variant='body2' color='text.disabled' sx={{ maxWidth: 360, textAlign: 'center' }}>
                            Los consumos y recargas de créditos aparecerán aquí al registrar operaciones.
                          </Typography>
                          <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openConsume}>
                            Registrar primer consumo
                          </Button>
                        </Stack>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              component={() => <TablePaginationComponent table={table} />}
              count={table.getFilteredRowModel().rows.length}
              rowsPerPage={table.getState().pagination.pageSize}
              page={table.getState().pagination.pageIndex}
              onPageChange={(_, page) => table.setPageIndex(page)}
            />
          </>
        )}
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
