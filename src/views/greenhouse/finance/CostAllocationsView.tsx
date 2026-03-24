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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

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
          allocationPercent: Number(formPercent),
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
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Expense ID</TableCell>
                    <TableCell align='center'>Método</TableCell>
                    <TableCell align='right'>%</TableCell>
                    <TableCell align='right'>Monto CLP</TableCell>
                    <TableCell>Notas</TableCell>
                    <TableCell align='center'>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocations.map(a => (
                    <TableRow key={a.allocationId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>{a.clientName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {a.expenseId.slice(0, 12)}…
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color='info'
                          label={METHOD_LABELS[a.allocationMethod] || a.allocationMethod}
                        />
                      </TableCell>
                      <TableCell align='right'>{a.allocationPercent}%</TableCell>
                      <TableCell align='right'>{formatClp(a.allocatedAmountClp)}</TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {a.notes || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Button
                          size='small'
                          color='error'
                          onClick={() => handleDelete(a.allocationId)}
                        >
                          <i className='tabler-trash' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
