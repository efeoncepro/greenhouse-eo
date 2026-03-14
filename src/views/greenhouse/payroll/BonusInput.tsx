'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import type { PayrollCurrency } from '@/types/payroll'
import { formatCurrency } from './helpers'

type BonusInputProps = {
  value: number
  min: number
  max: number
  currency: PayrollCurrency
  qualifies: boolean
  disabled?: boolean
  label: string
  onChange: (value: number) => void
}

const BonusInput = ({ value, min, max, currency, qualifies, disabled = false, label, onChange }: BonusInputProps) => {
  const [localValue, setLocalValue] = useState(value)

  const isDisabled = disabled || !qualifies || max === 0

  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    const v = newValue as number

    setLocalValue(v)
    onChange(v)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value)

    if (isNaN(raw)) return

    const clamped = Math.min(Math.max(raw, min), max)

    setLocalValue(clamped)
    onChange(clamped)
  }

  if (isDisabled) {
    return (
      <Typography variant='body2' color='text.disabled' sx={{ fontFamily: 'monospace' }}>
        {formatCurrency(0, currency)}
      </Typography>
    )
  }

  return (
    <Stack spacing={1} sx={{ minWidth: 160 }}>
      <CustomTextField
        size='small'
        type='number'
        label={label}
        value={localValue}
        onChange={handleInputChange}
        inputProps={{ min, max, step: currency === 'CLP' ? 1000 : 10 }}
        sx={{ '& input': { fontFamily: 'monospace', textAlign: 'right' } }}
      />
      {max > min && (
        <Box sx={{ px: 0.5 }}>
          <Slider
            size='small'
            value={localValue}
            min={min}
            max={max}
            step={currency === 'CLP' ? 1000 : 10}
            onChange={handleSliderChange}
            valueLabelDisplay='auto'
            valueLabelFormat={v => formatCurrency(v, currency)}
          />
          <Stack direction='row' justifyContent='space-between'>
            <Typography variant='caption' color='text.disabled'>
              {formatCurrency(min, currency)}
            </Typography>
            <Typography variant='caption' color='text.disabled'>
              {formatCurrency(max, currency)}
            </Typography>
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

export default BonusInput
