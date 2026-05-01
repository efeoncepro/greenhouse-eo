'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { DataTableShell } from '@/components/greenhouse/data-table'
import type { PaymentObligation } from '@/types/payment-obligations'

interface ObligationsTabProps {
  obligations: PaymentObligation[]
  loading: boolean
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onClearSelection: () => void
  onCreateOrder: () => void
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

const obligationKindLabel = (kind: string): string => {
  const labels: Record<string, string> = {
    employee_net_pay: 'Neto colaborador',
    employer_social_security: 'Cotizaciones empleador',
    employee_withheld_component: 'Retencion empleado',
    provider_payroll: 'Honorarios EOR',
    processor_fee: 'Fee processor',
    fx_component: 'Componente FX',
    manual: 'Manual'
  }

  return labels[kind] ?? kind
}

const beneficiaryTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    member: 'Colaborador',
    supplier: 'Proveedor',
    tax_authority: 'Autoridad tributaria',
    processor: 'Processor',
    other: 'Otro'
  }

  return labels[type] ?? type
}

const dueDateChip = (dueDate: string | null) => {
  if (!dueDate) return <Chip size='small' variant='outlined' label='Sin fecha' />

  const today = new Date()

  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <Chip size='small' color='error' variant='tonal' label={`Vencida ${Math.abs(diffDays)}d`} />
  }

  if (diffDays === 0) {
    return <Chip size='small' color='warning' variant='tonal' label='Hoy' />
  }

  if (diffDays <= 7) {
    return <Chip size='small' color='warning' variant='tonal' label={`En ${diffDays}d`} />
  }

  return (
    <Chip
      size='small'
      variant='outlined'
      label={new Date(dueDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
    />
  )
}

const ObligationsTab = ({
  obligations,
  loading,
  selectedIds,
  onToggle,
  onClearSelection,
  onCreateOrder
}: ObligationsTabProps) => {
  const allSelected =
    obligations.length > 0 && obligations.every(o => selectedIds.has(o.obligationId))

  const toggleAll = () => {
    if (allSelected) {
      onClearSelection()
    } else {
      obligations.forEach(o => {
        if (!selectedIds.has(o.obligationId)) onToggle(o.obligationId)
      })
    }
  }

  const totalSelectedClp = obligations
    .filter(o => selectedIds.has(o.obligationId) && o.currency === 'CLP')
    .reduce((sum, o) => sum + o.amount, 0)

  const totalSelectedUsd = obligations
    .filter(o => selectedIds.has(o.obligationId) && o.currency === 'USD')
    .reduce((sum, o) => sum + o.amount, 0)

  return (
    <Stack spacing={4}>
      {selectedIds.size > 0 ? (
        <Box
          role='status'
          aria-live='polite'
          sx={theme => ({
            p: 3,
            borderRadius: 2,
            border: `1px solid ${theme.palette.primary.main}`,
            backgroundColor: `${theme.palette.primary.main}11`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            alignItems: 'center',
            justifyContent: 'space-between'
          })}
        >
          <Stack direction='row' spacing={3} alignItems='center' flexWrap='wrap'>
            <Typography variant='subtitle2' color='primary.main'>
              {selectedIds.size} obligaci{selectedIds.size === 1 ? 'on' : 'ones'} seleccionada
              {selectedIds.size === 1 ? '' : 's'}
            </Typography>
            {totalSelectedClp > 0 ? (
              <Chip variant='tonal' color='primary' label={`Total CLP ${formatAmount(totalSelectedClp, 'CLP')}`} />
            ) : null}
            {totalSelectedUsd > 0 ? (
              <Chip variant='tonal' color='primary' label={`Total USD ${formatAmount(totalSelectedUsd, 'USD')}`} />
            ) : null}
          </Stack>
          <Stack direction='row' spacing={2}>
            <Button variant='outlined' size='small' onClick={onClearSelection}>
              Limpiar
            </Button>
            <Button variant='contained' size='small' onClick={onCreateOrder}>
              Crear orden de pago
            </Button>
          </Stack>
        </Box>
      ) : null}

      {loading ? <LinearProgress /> : null}

      <DataTableShell identifier='payment-obligations-table' ariaLabel='Tabla de obligaciones por programar' stickyFirstColumn>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell padding='checkbox'>
                <Checkbox checked={allSelected} indeterminate={!allSelected && selectedIds.size > 0} onChange={toggleAll} />
              </TableCell>
              <TableCell>Beneficiario</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell align='right'>Monto</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell>Origen</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {obligations.map(o => (
              <TableRow
                key={o.obligationId}
                hover
                selected={selectedIds.has(o.obligationId)}
                onClick={() => onToggle(o.obligationId)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding='checkbox'>
                  <Checkbox checked={selectedIds.has(o.obligationId)} onChange={() => onToggle(o.obligationId)} onClick={e => e.stopPropagation()} />
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant='body2' fontWeight={500}>
                      {o.beneficiaryName ?? o.beneficiaryId}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {o.beneficiaryId}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip size='small' variant='outlined' label={beneficiaryTypeLabel(o.beneficiaryType)} />
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{obligationKindLabel(o.obligationKind)}</Typography>
                </TableCell>
                <TableCell align='right'>
                  <Typography variant='body2' fontWeight={500} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatAmount(o.amount, o.currency)}
                  </Typography>
                </TableCell>
                <TableCell>{dueDateChip(o.dueDate)}</TableCell>
                <TableCell>
                  <Typography variant='caption' color='text.secondary'>
                    {o.sourceKind} · {o.sourceRef}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size='small' variant='tonal' color={o.status === 'generated' ? 'warning' : 'info'} label={o.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </Stack>
  )
}

export default ObligationsTab
