'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import CustomAvatar from '@core/components/mui/Avatar'

import { DataTableShell } from '@/components/greenhouse/data-table'
import type { PaymentObligation, PaymentObligationKind } from '@/types/payment-obligations'

interface ObligationsTabProps {
  obligations: PaymentObligation[]
  loading: boolean
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onClearSelection: () => void
  onCreateOrder: () => void
  onOpenObligation: (obligationId: string) => void
}

type StatusFilter = 'all' | 'to_schedule' | 'overdue' | 'usd_only'

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

const obligationKindMeta: Record<
  PaymentObligationKind,
  { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary'; variant: 'tonal' | 'outlined' }
> = {
  employee_net_pay: { label: 'Pago neto', color: 'primary', variant: 'tonal' },
  employer_social_security: { label: 'Cargas previsionales', color: 'info', variant: 'tonal' },
  employee_withheld_component: { label: 'Retención SII', color: 'warning', variant: 'tonal' },
  provider_payroll: { label: 'Provider Deel', color: 'info', variant: 'outlined' },
  processor_fee: { label: 'Fee processor', color: 'secondary', variant: 'outlined' },
  fx_component: { label: 'Componente FX', color: 'secondary', variant: 'outlined' },
  manual: { label: 'Manual', color: 'secondary', variant: 'outlined' }
}

const beneficiaryMetaLabel = (o: PaymentObligation): string => {
  const payrollVia = (o.metadataJson?.payrollVia as string | null) ?? null
  const contractType = (o.metadataJson?.contractTypeSnapshot as string | null) ?? null

  switch (o.beneficiaryType) {
    case 'member': {
      const parts: string[] = ['member']

      if (payrollVia === 'deel') parts.push('Deel')
      else if (contractType === 'honorarios') parts.push('Honorarios')
      else if (contractType === 'plana') parts.push('Plana')
      else if (payrollVia) parts.push(payrollVia)

      return parts.join(' · ')
    }

    case 'supplier':
      return `supplier · ${o.beneficiaryId.slice(0, 24)}`

    case 'tax_authority':
      return `tax_authority · ${o.beneficiaryId}`

    case 'processor':
      return `processor · ${o.beneficiaryId}`

    default:
      return o.beneficiaryId
  }
}

const beneficiaryAvatarColor = (
  type: PaymentObligation['beneficiaryType']
): 'primary' | 'info' | 'warning' | 'secondary' => {
  switch (type) {
    case 'member':
      return 'primary'
    case 'supplier':
      return 'info'
    case 'tax_authority':
      return 'warning'
    default:
      return 'secondary'
  }
}

const initialsForBeneficiary = (o: PaymentObligation): string => {
  if (o.beneficiaryType === 'tax_authority' && o.beneficiaryId === 'cl_sii') return 'SII'

  const name = o.beneficiaryName ?? o.beneficiaryId

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p.charAt(0).toUpperCase())
    .join('') || '·'
}

const dueDateLabel = (dueDate: string | null) => {
  if (!dueDate) {
    return <Typography variant='body2' color='text.disabled'>Sin fecha</Typography>
  }

  const today = new Date()

  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = due.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })

  if (diffDays < 0) {
    return (
      <Stack spacing={0.25}>
        <Typography variant='body2' color='error.main' fontWeight={500}>
          {formatted}
        </Typography>
        <Typography variant='caption' color='error.main'>
          {Math.abs(diffDays)}d vencida
        </Typography>
      </Stack>
    )
  }

  if (diffDays === 0) {
    return (
      <Stack spacing={0.25}>
        <Typography variant='body2' fontWeight={500}>{formatted}</Typography>
        <Typography variant='caption' color='warning.main'>Hoy</Typography>
      </Stack>
    )
  }

  if (diffDays <= 14) {
    return (
      <Stack spacing={0.25}>
        <Typography variant='body2' fontWeight={500}>{formatted}</Typography>
        <Typography variant='caption' color='warning.main'>en {diffDays} días</Typography>
      </Stack>
    )
  }

  return <Typography variant='body2'>{formatted}</Typography>
}

const statusPill = (status: PaymentObligation['status']) => {
  const map: Record<PaymentObligation['status'], { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
    generated: { label: '● Generada', color: 'primary' },
    scheduled: { label: '● Programada', color: 'info' },
    partially_paid: { label: '● Parcial', color: 'warning' },
    paid: { label: '● Pagada', color: 'success' },
    reconciled: { label: '● Conciliada', color: 'info' },
    closed: { label: '● Cerrada', color: 'secondary' },
    cancelled: { label: '● Anulada', color: 'secondary' },
    superseded: { label: '● Reemplazada', color: 'warning' }
  }

  const meta = map[status]

  return <Chip size='small' variant='tonal' color={meta.color} label={meta.label} sx={{ fontWeight: 600 }} />
}

const isOverdue = (o: PaymentObligation): boolean => {
  if (!o.dueDate) return false
  const today = new Date()

  today.setHours(0, 0, 0, 0)
  const due = new Date(o.dueDate + 'T00:00:00')

  return due.getTime() < today.getTime() && o.status !== 'paid' && o.status !== 'reconciled' && o.status !== 'closed'
}

const ObligationsTab = ({
  obligations,
  loading,
  selectedIds,
  onToggle,
  onClearSelection,
  onCreateOrder,
  onOpenObligation
}: ObligationsTabProps) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<string | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<string | 'all'>('all')

  // ── Periods + sources discovery ──────────────────────────────
  const periodOptions = useMemo(() => {
    const set = new Set<string>()

    obligations.forEach(o => {
      if (o.periodId) set.add(o.periodId)
    })

    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [obligations])

  const sourceOptions = useMemo(() => {
    const set = new Set<string>()

    obligations.forEach(o => set.add(o.sourceKind))

    return Array.from(set).sort()
  }, [obligations])

  // ── Filtering pipeline ───────────────────────────────────────
  const filtered = useMemo(() => {
    let list = obligations

    if (statusFilter === 'to_schedule') {
      list = list.filter(o => o.status === 'generated' || o.status === 'partially_paid')
    } else if (statusFilter === 'overdue') {
      list = list.filter(isOverdue)
    } else if (statusFilter === 'usd_only') {
      list = list.filter(o => o.currency === 'USD')
    }

    if (periodFilter !== 'all') {
      list = list.filter(o => o.periodId === periodFilter)
    }

    if (sourceFilter !== 'all') {
      list = list.filter(o => o.sourceKind === sourceFilter)
    }

    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase()

      list = list.filter(o =>
        (o.beneficiaryName ?? '').toLowerCase().includes(q) ||
        o.beneficiaryId.toLowerCase().includes(q) ||
        o.obligationId.toLowerCase().includes(q) ||
        (o.sourceRef ?? '').toLowerCase().includes(q)
      )
    }

    return list
  }, [obligations, statusFilter, periodFilter, sourceFilter, search])

  // ── Counters per filter chip (computed over full obligations to keep counts stable) ──
  const counters = useMemo(() => {
    const total = obligations.length
    const toSchedule = obligations.filter(o => o.status === 'generated' || o.status === 'partially_paid').length
    const overdue = obligations.filter(isOverdue).length
    const usdOnly = obligations.filter(o => o.currency === 'USD').length

    return { total, toSchedule, overdue, usdOnly }
  }, [obligations])

  // ── Selection on filtered set only ───────────────────────────
  const selectedFiltered = filtered.filter(o => selectedIds.has(o.obligationId))
  const allFilteredSelected = filtered.length > 0 && selectedFiltered.length === filtered.length

  const toggleAll = () => {
    if (allFilteredSelected) {
      onClearSelection()

      return
    }

    filtered.forEach(o => {
      if (!selectedIds.has(o.obligationId)) onToggle(o.obligationId)
    })
  }

  // ── Bulk bar advice (mockup §"BULK BAR") ─────────────────────
  const selectedAll = useMemo(() => obligations.filter(o => selectedIds.has(o.obligationId)), [obligations, selectedIds])

  const totalSelectedClp = selectedAll.filter(o => o.currency === 'CLP').reduce((s, o) => s + o.amount, 0)
  const totalSelectedUsd = selectedAll.filter(o => o.currency === 'USD').reduce((s, o) => s + o.amount, 0)

  const bulkAdvice = (() => {
    if (selectedAll.length === 0) return ''
    const currencies = new Set(selectedAll.map(o => o.currency))

    if (currencies.size > 1) {
      return 'monedas mixtas · cada moneda crea una orden separada'
    }

    const beneficiaryTypes = new Set(selectedAll.map(o => o.beneficiaryType))

    if (beneficiaryTypes.size > 1) {
      return 'beneficiarios mixtos · listo para 1 sola orden'
    }

    return `todas en ${[...currencies][0]} · listo para 1 sola orden`
  })()

  const clearFilters = () => {
    setStatusFilter('all')
    setPeriodFilter('all')
    setSourceFilter('all')
    setSearch('')
  }

  return (
    <Stack spacing={4}>
      {/* ── BULK BAR ───────────────────────────────────────────── */}
      {selectedIds.size > 0 ? (
        <Box
          role='status'
          aria-live='polite'
          sx={theme => ({
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            px: 4,
            py: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            boxShadow: theme.shadows[3]
          })}
        >
          <Stack direction='row' spacing={3} alignItems='center' flexWrap='wrap' useFlexGap>
            <Chip
              size='small'
              label={`${selectedIds.size} seleccionada${selectedIds.size === 1 ? '' : 's'}`}
              sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'inherit', fontWeight: 600 }}
            />
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              {totalSelectedClp > 0 ? (
                <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(totalSelectedClp, 'CLP')}
                </Typography>
              ) : null}
              {totalSelectedClp > 0 && totalSelectedUsd > 0 ? (
                <Typography variant='body2' sx={{ opacity: 0.6 }}>·</Typography>
              ) : null}
              {totalSelectedUsd > 0 ? (
                <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(totalSelectedUsd, 'USD')}
                </Typography>
              ) : null}
              <Typography variant='caption' sx={{ opacity: 0.85 }}>
                {bulkAdvice}
              </Typography>
            </Stack>
          </Stack>
          <Stack direction='row' spacing={1.5}>
            <Button size='small' onClick={onClearSelection} sx={{ color: 'rgba(255,255,255,0.85)' }}>
              Limpiar selección
            </Button>
            <Button
              size='small'
              variant='contained'
              onClick={onCreateOrder}
              sx={{ backgroundColor: 'background.paper', color: 'primary.main', '&:hover': { backgroundColor: 'background.default' } }}
              endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
            >
              Crear orden de pago
            </Button>
          </Stack>
        </Box>
      ) : null}

      {/* ── FILTERS ────────────────────────────────────────────── */}
      <Stack
        direction='row'
        spacing={1.5}
        alignItems='center'
        flexWrap='wrap'
        role='toolbar'
        aria-label='Filtros de obligaciones'
        useFlexGap
      >
        <TextField
          size='small'
          type='search'
          placeholder='Buscar beneficiario, ID u origen…'
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 240, flex: '1 1 240px', maxWidth: 320 }}
          slotProps={{
            input: {
              startAdornment: <i className='tabler-search' style={{ fontSize: 16, marginRight: 6, opacity: 0.6 }} aria-hidden='true' />
            }
          }}
        />
        <Chip
          size='small'
          variant={statusFilter === 'all' ? 'tonal' : 'outlined'}
          color={statusFilter === 'all' ? 'primary' : 'default'}
          label={`Todas (${counters.total})`}
          onClick={() => setStatusFilter('all')}
          aria-pressed={statusFilter === 'all'}
        />
        <Chip
          size='small'
          variant={statusFilter === 'to_schedule' ? 'tonal' : 'outlined'}
          color={statusFilter === 'to_schedule' ? 'primary' : 'default'}
          label={`Por programar (${counters.toSchedule})`}
          onClick={() => setStatusFilter('to_schedule')}
          aria-pressed={statusFilter === 'to_schedule'}
        />
        <Chip
          size='small'
          variant={statusFilter === 'overdue' ? 'tonal' : 'outlined'}
          color={statusFilter === 'overdue' ? 'error' : 'default'}
          label={`Vencidas (${counters.overdue})`}
          onClick={() => setStatusFilter('overdue')}
          aria-pressed={statusFilter === 'overdue'}
          disabled={counters.overdue === 0}
        />
        <Chip
          size='small'
          variant={statusFilter === 'usd_only' ? 'tonal' : 'outlined'}
          color={statusFilter === 'usd_only' ? 'info' : 'default'}
          label={`Solo USD (${counters.usdOnly})`}
          onClick={() => setStatusFilter('usd_only')}
          aria-pressed={statusFilter === 'usd_only'}
          disabled={counters.usdOnly === 0}
        />
        {periodOptions.length > 1
          ? periodOptions.map(p => (
              <Chip
                key={p}
                size='small'
                variant={periodFilter === p ? 'tonal' : 'outlined'}
                color={periodFilter === p ? 'primary' : 'default'}
                label={`Periodo ${p}`}
                onClick={() => setPeriodFilter(prev => (prev === p ? 'all' : p))}
                aria-pressed={periodFilter === p}
              />
            ))
          : null}
        {sourceOptions.length > 1
          ? sourceOptions.map(s => (
              <Chip
                key={s}
                size='small'
                variant={sourceFilter === s ? 'tonal' : 'outlined'}
                color={sourceFilter === s ? 'primary' : 'default'}
                label={`Source: ${s}`}
                onClick={() => setSourceFilter(prev => (prev === s ? 'all' : s))}
                aria-pressed={sourceFilter === s}
              />
            ))
          : null}
        {(statusFilter !== 'all' || periodFilter !== 'all' || sourceFilter !== 'all' || search.length > 0) ? (
          <Button size='small' variant='text' onClick={clearFilters} sx={{ ml: 'auto' }}>
            Limpiar filtros
          </Button>
        ) : null}
      </Stack>

      {loading ? <LinearProgress /> : null}

      {/* ── TABLE ──────────────────────────────────────────────── */}
      <DataTableShell
        identifier='payment-obligations-table'
        ariaLabel='Tabla de obligaciones de pago'
        stickyFirstColumn
      >
        <Table size='small' aria-rowcount={filtered.length}>
          <TableHead>
            <TableRow>
              <TableCell padding='checkbox'>
                <Checkbox
                  checked={allFilteredSelected}
                  indeterminate={!allFilteredSelected && selectedFiltered.length > 0}
                  onChange={toggleAll}
                  inputProps={{ 'aria-label': 'Seleccionar todas las visibles' }}
                />
              </TableCell>
              <TableCell>Beneficiario</TableCell>
              <TableCell>Tipo de obligación</TableCell>
              <TableCell>Periodo</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell align='right'>Monto</TableCell>
              <TableCell align='center'>Estado</TableCell>
              <TableCell align='right'>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align='center' sx={{ py: 8 }}>
                  <Typography variant='body2' color='text.secondary'>
                    No hay obligaciones que coincidan con los filtros actuales.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {filtered.map(o => {
              const kindMeta = obligationKindMeta[o.obligationKind]
              const isReconciled = o.status === 'reconciled' || o.status === 'closed'
              const isCancelled = o.status === 'cancelled' || o.status === 'superseded'
              const canSelect = !isReconciled && !isCancelled
              const ajusteMonto = (o.metadataJson?.adjustmentAmount as number | undefined) ?? null

              return (
                <TableRow
                  key={o.obligationId}
                  hover
                  selected={selectedIds.has(o.obligationId)}
                  sx={{ cursor: canSelect ? 'pointer' : 'default' }}
                  onClick={() => canSelect && onToggle(o.obligationId)}
                >
                  <TableCell padding='checkbox' onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(o.obligationId)}
                      onChange={() => onToggle(o.obligationId)}
                      disabled={!canSelect}
                      inputProps={{ 'aria-label': `Seleccionar ${o.beneficiaryName ?? o.beneficiaryId}` }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={1.5} alignItems='center'>
                      <CustomAvatar
                        skin='light'
                        color={beneficiaryAvatarColor(o.beneficiaryType)}
                        size={32}
                        sx={{ fontSize: 12, fontWeight: 600 }}
                      >
                        {initialsForBeneficiary(o)}
                      </CustomAvatar>
                      <Stack spacing={0.25}>
                        <Typography variant='body2' fontWeight={500}>
                          {o.beneficiaryName ?? o.beneficiaryId}
                        </Typography>
                        <Typography variant='caption' color='text.disabled' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {beneficiaryMetaLabel(o)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={0.75} alignItems='center' flexWrap='wrap' useFlexGap>
                      <Chip size='small' variant={kindMeta.variant} color={kindMeta.color} label={kindMeta.label} />
                      {ajusteMonto !== null && ajusteMonto !== 0 ? (
                        <Chip
                          size='small'
                          variant='tonal'
                          color='warning'
                          label={`Ajuste ${formatAmount(Math.abs(ajusteMonto), o.currency)}`}
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{o.periodId ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>{dueDateLabel(o.dueDate)}</TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' fontWeight={500} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatAmount(o.amount, o.currency)}
                    </Typography>
                  </TableCell>
                  <TableCell align='center'>{statusPill(o.status)}</TableCell>
                  <TableCell align='right' onClick={e => e.stopPropagation()}>
                    <Stack direction='row' spacing={0.5} justifyContent='flex-end'>
                      <Tooltip title='Ver detalle'>
                        <IconButton size='small' onClick={() => onOpenObligation(o.obligationId)} aria-label={`Ver detalle de ${o.beneficiaryName ?? o.beneficiaryId}`}>
                          <i className='tabler-info-circle' style={{ fontSize: 18 }} aria-hidden='true' />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </DataTableShell>
    </Stack>
  )
}

export default ObligationsTab
