'use client'

import { useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'

import CustomTextField from '@core/components/mui/TextField'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentRegistrationCardProps {
  onSubmit: (amount: number, date: string, reference: string) => Promise<void>
  pendingBalance: number
  currency: string
  disabled?: boolean
  title?: string
  submitLabel?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const formatBalance = (value: number, cur: string) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: cur, maximumFractionDigits: cur === 'CLP' ? 0 : 2 }).format(value)

const PaymentRegistrationCard = ({
  onSubmit,
  pendingBalance,
  currency,
  disabled = false,
  title = 'Registrar pago',
  submitLabel = 'Registrar pago'
}: PaymentRegistrationCardProps) => {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const parsed = Number(amount)

    if (!parsed || parsed <= 0 || !date) return

    setSubmitting(true)

    try {
      await onSubmit(parsed, date, reference)
      setAmount('')
      setDate('')
      setReference('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      <CardHeader
        title={title}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
            <i className='tabler-coin' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
          </Avatar>
        }
      />
      <Divider />
      <CardContent>
        <Stack direction='row' spacing={2} sx={{ flexWrap: 'wrap' }}>
          <CustomTextField
            size='small'
            label={`Monto (saldo: ${formatBalance(pendingBalance, currency)})`}
            type='number'
            value={amount}
            onChange={e => setAmount(e.target.value)}
            sx={{ width: 260 }}
          />
          <CustomTextField
            size='small'
            label='Fecha'
            type='date'
            value={date}
            onChange={e => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <CustomTextField
            size='small'
            label='Referencia'
            value={reference}
            onChange={e => setReference(e.target.value)}
            sx={{ width: 200 }}
          />
          <Button
            variant='contained'
            color='success'
            onClick={handleSubmit}
            disabled={disabled || submitting}
          >
            {submitting ? 'Registrando...' : submitLabel}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default PaymentRegistrationCard
