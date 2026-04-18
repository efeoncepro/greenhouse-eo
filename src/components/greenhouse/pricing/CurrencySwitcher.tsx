'use client'

import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

export type Currency = 'CLP' | 'USD' | 'EUR' | 'GBP'

export interface CurrencySwitcherProps {
  value: Currency
  onChange: (currency: Currency) => void
  disabled?: boolean

  /**
   * Snapshot de la tasa de cambio asociada a la cotización.
   * Cuando `base !== value`, se muestra un helper text indicando que la vista interna
   * difiere de la cotización canónica enviada al cliente.
   */
  exchangeRateSnapshot?: { base: string; rate: number; asOf: string }
  size?: 'small' | 'medium'
  fullWidth?: boolean
}

const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
  { value: 'CLP', label: 'CLP · Peso chileno' },
  { value: 'USD', label: 'USD · Dólar estadounidense' },
  { value: 'EUR', label: 'EUR · Euro' },
  { value: 'GBP', label: 'GBP · Libra esterlina' }
]

const formatAsOf = (isoDate: string): string => {
  try {
    const date = new Date(isoDate)

    if (Number.isNaN(date.getTime())) return isoDate

    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(date)
  } catch {
    return isoDate
  }
}

const formatRate = (rate: number): string =>
  new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)

const CurrencySwitcher = ({
  value,
  onChange,
  disabled = false,
  exchangeRateSnapshot,
  size = 'small',
  fullWidth = false
}: CurrencySwitcherProps) => {
  const showDisclaimer = exchangeRateSnapshot !== undefined && exchangeRateSnapshot.base !== value

  const helperText = showDisclaimer
    ? `Vista interna — la cotización enviada usa ${exchangeRateSnapshot.base} (tasa ${formatRate(
        exchangeRateSnapshot.rate
      )} al ${formatAsOf(exchangeRateSnapshot.asOf)}).`
    : undefined

  return (
    <CustomTextField
      select
      size={size}
      fullWidth={fullWidth}
      label={GH_PRICING.currencyLabel}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value as Currency)}
      helperText={helperText}
      sx={{ minWidth: 180 }}
    >
      {CURRENCY_OPTIONS.map(opt => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </CustomTextField>
  )
}

export default CurrencySwitcher
