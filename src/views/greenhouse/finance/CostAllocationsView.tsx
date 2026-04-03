'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'

interface Allocation {
  allocationId: string
  expenseId: string
  clientId: string
  clientName: string
  allocationPercent: number
  allocatedAmountClp: number
  periodYear: number
  periodMonth: number
  allocationMethod: string
  notes: string | null
  createdAt: string | null
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const METHOD_LABELS: Record<string, string> = {
  manual: 'Manual',
  fte_proportional: 'Proporcional FTE',
  revenue_proportional: 'Proporcional Revenue',
  equal_split: 'División equitativa'
}

const formatClp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

const CostAllocationsView = () => {
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allocSorting, setAllocSorting] = useState<SortingState>([])

  // Form state
  const [formExpenseId, setFormExpenseId] = useState('')
  const [formClientId, setFormClientId] = useState('')
  const [formClientName, setFormClientName] = useState('')
  const [formPercent, setFormPercent] = useState('100')
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState('manual')
  const [formNotes, setFormNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/finance/intelligence/allocations?year=${year}&month=${month}`)

      if (res.ok) {
        const data = await res.json()

        setAllocations(data.items || [])
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/finance/intelligence/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: formExpenseId,
          clientId: formClientId,
          clientName: formClientName,
          allocationPercent: Number(formPercent) / 100,
          allocatedAmountClp: Number(formAmount),
          periodYear: year,
          periodMonth: month,
          allocationMethod: formMethod,
          notes: formNotes || null
        })
      })

      if (res.ok) {
        setDialogOpen(false)
        resetForm()
        void load()
      }
    } catch {
      // Non-blocking
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (allocationId: string) => {
    try {
      await fetch(`/api/finance/intelligence/allocations?allocationId=${allocationId}`, { method: 'DELETE' })
      void load()
    } catch {
      // Non-blocking
    }
  }

  const allocColumnHelper = createColumnHelper<Allocation>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allocColumns: ColumnDef<Allocation, any>[] = [
    allocColumnHelper.accessor('clientName', { header: 'Cliente', cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography> }),
    allocColumnHelper.accessor('expenseId', { header: 'Expense ID', cell: ({ getValue }) => <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{getValue().slice(0, 12)}…</Typography> }),
    allocColumnHelper.accessor('allocationMethod', { header: 'Método', cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color='info' label={METHOD_LABELS[getValue()] || getValue()} />, meta: { align: 'center' } }),
    allocColumnHelper.accessor('allocationPercent', { header: '%', cell: ({ getValue }) => `${(getValue() * 100).toFixed(1)}%`, meta: { align: 'right' } }),
    allocColumnHelper.accessor('allocatedAmountClp', { header: 'Monto CLP', cell: ({ getValue }) => formatClp(getValue()), meta: { align: 'right' } }),
    allocColumnHelper.accessor('notes', { header: 'Notas', cell: ({ getValue }) => <Typography variant='caption' color='text.secondary'>{getValue() || '—'}</Typography> }),
    { id: 'actions', header: 'Acciones', cell: ({ row }: { row: { original: Allocation } }) => <Button size='small' color='error' onClick={() => handleDelete(row.original.allocationId)}><i className='tabler-trash' /></Button>, enableSorting: false, meta: { align: 'center' } }
  ]

  const allocTable = useReactTable({
    data: allocations,
    columns: allocColumns,
    state: { sorting: allocSorting },
    onSortingChange: setAllocSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const resetForm = () => {
    setFormExpenseId('')
    setFormClientId('')
    setFormClientName('')
    setFormPercent('100')
    setFormAmount('')
    setFormMethod('manual')
    setFormNotes('')
  }

  const totalAllocated = allocations.reduce((s, a) => s + a.allocatedAmountClp, 0)

  return (
    <Grid container spacing={6}>
      {/* Period selectors */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Asignaciones de costos'
            subheader='Distribución de gastos entre clientes/organizaciones'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-arrows-split-2' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <CustomTextField
                  select
                  size='small'
                  label='Año'
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  sx={{ minWidth: 100 }}
                >
                  {[2024, 2025, 2026].map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  size='small'
                  label='Mes'
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  sx={{ minWidth: 140 }}
                >
                  {MONTHS.map((m, i) => (
                    <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
                  ))}
                </CustomTextField>
                <Button variant='contained' size='small' onClick={() => setDialogOpen(true)}>
                  <i className='tabler-plus' style={{ marginRight: 4 }} /> Nueva
                </Button>
              </Box>
            }
          />
        </Card>
      </Grid>

      {/* Summary */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, textAlign: 'center', py: 3 }}>
          <Typography variant='h4'>{allocations.length}</Typography>
          <Typography variant='body2' color='text.secondary'>Asignaciones activas</Typography>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, textAlign: 'center', py: 3 }}>
          <Typography variant='h4'>{formatClp(totalAllocated)}</Typography>
          <Typography variant='body2' color='text.secondary'>Total asignado</Typography>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, textAlign: 'center', py: 3 }}>
          <Typography variant='h4'>
            {new Set(allocations.map(a => a.clientId)).size}
          </Typography>
          <Typography variant='body2' color='text.secondary'>Clientes con asignaciones</Typography>
        </Card>
      </Grid>

      {/* Table */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : allocations.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='h6' sx={{ mb: 1 }}>Sin asignaciones para este período</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Crea una asignación para distribuir gastos entre clientes.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {allocTable.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {allocTable.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Grid>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Nueva asignación de costo</DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
          <CustomTextField
            label='Expense ID'
            value={formExpenseId}
            onChange={e => setFormExpenseId(e.target.value)}
            placeholder='EXP-...'
            required
          />
          <CustomTextField
            label='Client ID'
            value={formClientId}
            onChange={e => setFormClientId(e.target.value)}
            placeholder='CLT-...'
            required
          />
          <CustomTextField
            label='Nombre del cliente'
            value={formClientName}
            onChange={e => setFormClientName(e.target.value)}
            required
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <CustomTextField
              label='Porcentaje (%)'
              type='number'
              value={formPercent}
              onChange={e => setFormPercent(e.target.value)}
              sx={{ flex: 1 }}
            />
            <CustomTextField
              label='Monto CLP'
              type='number'
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Box>
          <CustomTextField
            select
            label='Método de asignación'
            value={formMethod}
            onChange={e => setFormMethod(e.target.value)}
          >
            <MenuItem value='manual'>Manual</MenuItem>
            <MenuItem value='fte_proportional'>Proporcional FTE</MenuItem>
            <MenuItem value='revenue_proportional'>Proporcional Revenue</MenuItem>
            <MenuItem value='equal_split'>División equitativa</MenuItem>
          </CustomTextField>
          <CustomTextField
            label='Notas (opcional)'
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={saving || !formExpenseId || !formClientId || !formClientName || !formAmount}
          >
            {saving ? 'Guardando…' : 'Crear asignación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default CostAllocationsView
