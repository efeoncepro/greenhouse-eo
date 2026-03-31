'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

// ── Types ──

interface Quote {
  quoteId: string
  clientName: string | null
  quoteNumber: string | null
  quoteDate: string | null
  dueDate: string | null
  totalAmount: number
  totalAmountClp: number
  currency: string
  status: string
  convertedToIncomeId: string | null
  isFromNubox: boolean
}

// ── Status config ──

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'primary' | 'secondary' }> = {
  draft: { label: 'Borrador', color: 'secondary' },
  sent: { label: 'Enviada', color: 'info' },
  accepted: { label: 'Aceptada', color: 'success' },
  rejected: { label: 'Rechazada', color: 'error' },
  expired: { label: 'Vencida', color: 'secondary' },
  converted: { label: 'Facturada', color: 'primary' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'expired', label: 'Vencidas' },
  { value: 'converted', label: 'Facturadas' }
]

// ── Helpers ──

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (date: string | null) => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

// ── Component ──

const QuotesListView = () => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Quote[]>([])
  const [statusFilter, setStatusFilter] = useState('')

  const fetchQuotes = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/finance/quotes?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setItems(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  if (loading) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={56} />
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant='h5' sx={{ fontWeight: 500 }}>Cotizaciones</Typography>
        <Typography variant='body2' color='text.secondary'>
          Cotizaciones sincronizadas desde Nubox. No se incluyen en el cálculo de ingresos.
        </Typography>
      </Box>

      <Card variant='outlined'>
        <CardHeader
          title='Registro de cotizaciones'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
              <i className='tabler-file-description' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
            </Avatar>
          }
          action={
            <CustomChip round='true' size='small' variant='tonal' color='secondary' label={`${items.length} cotizaciones`} />
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            select
            size='small'
            label='Estado'
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {STATUS_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
        </CardContent>
        <Divider />

        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }} role='status'>
            <Typography variant='h6' sx={{ mb: 1 }}>Sin cotizaciones</Typography>
            <Typography variant='body2' color='text.secondary'>
              Las cotizaciones aparecen aquí cuando se sincronizan desde Nubox (DTE 52).
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>N°</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell align='right'>Monto</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fuente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map(q => {
                  const statusConf = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft

                  return (
                    <TableRow key={q.quoteId} hover>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {q.quoteNumber ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{q.clientName ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{formatDate(q.quoteDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{formatDate(q.dueDate)}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(q.totalAmountClp)}</Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip round='true' size='small' variant='tonal' color={statusConf.color} label={statusConf.label} />
                      </TableCell>
                      <TableCell>
                        {q.isFromNubox && (
                          <CustomChip round='true' size='small' variant='tonal' color='info' label='Nubox' sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
    </Stack>
  )
}

export default QuotesListView
