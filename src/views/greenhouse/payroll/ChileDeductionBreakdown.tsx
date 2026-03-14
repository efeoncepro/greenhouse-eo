'use client'

import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { PayrollEntry } from '@/types/payroll'
import { formatCurrency } from './helpers'

type Props = {
  entry: PayrollEntry
}

type LineItemProps = {
  label: string
  amount: number | null
  isDeduction?: boolean
  isBold?: boolean
}

const LineItem = ({ label, amount, isDeduction = false, isBold = false }: LineItemProps) => (
  <Stack direction='row' justifyContent='space-between' sx={{ py: 0.25 }}>
    <Typography variant='body2' fontWeight={isBold ? 600 : 400}>
      {label}
    </Typography>
    <Typography
      variant='body2'
      fontWeight={isBold ? 600 : 400}
      sx={{ fontFamily: 'monospace' }}
      color={isDeduction ? 'error.main' : isBold ? 'success.main' : 'text.primary'}
    >
      {isDeduction && amount ? '- ' : isBold ? '' : ''}
      {formatCurrency(amount, 'CLP')}
    </Typography>
  </Stack>
)

const ChileDeductionBreakdown = ({ entry }: Props) => {
  const rentaImponible = entry.baseSalary + entry.bonusOtdAmount + entry.bonusRpaAmount + entry.bonusOtherAmount

  return (
    <Stack spacing={0.5} sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderRadius: 1, minWidth: 320 }}>
      <LineItem label='Renta imponible' amount={rentaImponible} />
      <Divider sx={{ my: 0.5 }} />
      <LineItem
        label={`AFP ${entry.chileAfpName || ''} (${((entry.chileAfpRate ?? 0) * 100).toFixed(2)}%)`}
        amount={entry.chileAfpAmount}
        isDeduction
      />
      <LineItem
        label={entry.chileHealthSystem === 'isapre' ? `Isapre (${entry.chileUfValue ? `UF ${entry.chileUfValue}` : ''})` : 'Fonasa (7%)'}
        amount={entry.chileHealthAmount}
        isDeduction
      />
      <LineItem
        label={`Seg. cesantía (${((entry.chileUnemploymentRate ?? 0) * 100).toFixed(1)}%)`}
        amount={entry.chileUnemploymentAmount}
        isDeduction
      />
      {(entry.chileApvAmount ?? 0) > 0 && (
        <LineItem label='APV' amount={entry.chileApvAmount} isDeduction />
      )}
      <LineItem label='Impuesto único' amount={entry.chileTaxAmount} isDeduction />
      <Divider sx={{ my: 0.5 }} />
      <LineItem label='Total descuentos' amount={entry.chileTotalDeductions} isDeduction isBold />
      {entry.remoteAllowance > 0 && (
        <Stack direction='row' justifyContent='space-between' sx={{ py: 0.25 }}>
          <Typography variant='body2'>Asig. teletrabajo</Typography>
          <Typography variant='body2' sx={{ fontFamily: 'monospace' }} color='success.main'>
            + {formatCurrency(entry.remoteAllowance, 'CLP')}
          </Typography>
        </Stack>
      )}
      <Divider sx={{ my: 0.5 }} />
      <LineItem label='Neto a pagar' amount={entry.netTotal} isBold />
    </Stack>
  )
}

export default ChileDeductionBreakdown
