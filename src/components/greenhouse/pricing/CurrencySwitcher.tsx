'use client'

import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

/**
 * Alias re-exported del engine v2 para que consumers del builder no tengan que
 * importar el tipo desde dos módulos distintos.
 */
export type Currency = PricingOutputCurrency

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

// Orden operativo: local + internacional primero, luego LatAm.
// Alineado con PRICING_OUTPUT_CURRENCIES del engine v2 (6 monedas).
const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
  { value: 'CLP', label: 'CLP · Peso chileno' },
  { value: 'USD', label: 'USD · Dólar estadounidense' },
  { value: 'CLF', label: 'CLF · UF' },
  { value: 'COP', label: 'COP · Peso colombiano' },
  { value: 'MXN', label: 'MXN · Peso mexicano' },
  { value: 'PEN', label: 'PEN · Sol peruano' }
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
