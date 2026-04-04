'use client'

import { useCallback, useMemo } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

// ── Types ──

export interface PeriodValue {
  year: number
  month: number
}

export type PeriodNavigatorVariant = 'arrows' | 'dropdowns' | 'compact'

export interface PeriodNavigatorProps {
  year: number
  month: number
  onChange: (period: PeriodValue) => void
  variant?: PeriodNavigatorVariant
  minYear?: number
  maxYear?: number
  showToday?: boolean
  todayLabel?: string
  size?: 'small' | 'medium'
  disabled?: boolean
}

// ── Constants ──

const MONTHS_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

// ── Helpers ──

const getToday = (): PeriodValue => {
  const d = new Date()

  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

const isSamePeriod = (a: PeriodValue, b: PeriodValue) => a.year === b.year && a.month === b.month

const navigateMonth = (year: number, month: number, delta: -1 | 1): PeriodValue => {
  const next = month + delta

  if (next < 1) return { year: year - 1, month: 12 }
  if (next > 12) return { year: year + 1, month: 1 }

  return { year, month: next }
}

// ── Component ──

const PeriodNavigator = ({
  year,
  month,
  onChange,
  variant = 'arrows',
  minYear = 2024,
  maxYear,
  showToday = true,
  todayLabel = 'Hoy',
  size = 'small',
  disabled = false
}: PeriodNavigatorProps) => {
  const resolvedMaxYear = maxYear ?? new Date().getFullYear() + 1
  const today = useMemo(() => getToday(), [])
  const isToday = isSamePeriod({ year, month }, today)

  const years = useMemo(() => {
    const list: number[] = []

    for (let y = resolvedMaxYear; y >= minYear; y--) list.push(y)

    return list
  }, [minYear, resolvedMaxYear])

  const goToPrev = useCallback(() => {
    if (!disabled) onChange(navigateMonth(year, month, -1))
  }, [year, month, onChange, disabled])

  const goToNext = useCallback(() => {
    if (!disabled) onChange(navigateMonth(year, month, 1))
  }, [year, month, onChange, disabled])

  const goToToday = useCallback(() => {
    if (!disabled) onChange(today)
  }, [today, onChange, disabled])

  const handleYearChange = useCallback((value: number) => {
    if (!disabled) onChange({ year: value, month })
  }, [month, onChange, disabled])

  const handleMonthChange = useCallback((value: number) => {
    if (!disabled) onChange({ year, month: value })
  }, [year, onChange, disabled])

  // ── Variant: dropdowns ──

  if (variant === 'dropdowns') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <CustomTextField
          select
          size={size}
          label='Año'
          value={year}
          onChange={e => handleYearChange(Number(e.target.value))}
          disabled={disabled}
          sx={{ minWidth: 90 }}
        >
          {years.map(y => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          select
          size={size}
          label='Mes'
          value={month}
          onChange={e => handleMonthChange(Number(e.target.value))}
          disabled={disabled}
          sx={{ minWidth: 120 }}
        >
          {MONTHS_LONG.map((label, i) => (
            <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
          ))}
        </CustomTextField>
        {showToday && !isToday && (
          <Button size={size} variant='tonal' color='secondary' onClick={goToToday} disabled={disabled}>
            {todayLabel}
          </Button>
        )}
      </Box>
    )
  }

  // ── Variant: compact (short label + arrows, no dropdowns) ──

  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title='Mes anterior'>
          <IconButton size='small' onClick={goToPrev} disabled={disabled} aria-label='Mes anterior'>
            <i className='tabler-chevron-left' style={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Typography variant='caption' fontWeight={600} sx={{ minWidth: 60, textAlign: 'center' }}>
          {MONTHS_SHORT[month - 1]} {year}
        </Typography>
        <Tooltip title='Mes siguiente'>
          <IconButton size='small' onClick={goToNext} disabled={disabled} aria-label='Mes siguiente'>
            <i className='tabler-chevron-right' style={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    )
  }

  // ── Variant: arrows (default — full label with prev/today/next) ──

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title='Mes anterior'>
        <IconButton size={size} onClick={goToPrev} disabled={disabled} aria-label='Mes anterior'>
          <i className='tabler-chevron-left' style={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      {showToday && (
        <Tooltip title={isToday ? 'Ya estás en el período actual' : `Ir a ${MONTHS_LONG[today.month - 1]} ${today.year}`}>
          <span>
            <Button
              size='small'
              variant={isToday ? 'contained' : 'outlined'}
              color='secondary'
              onClick={goToToday}
              disabled={disabled || isToday}
              sx={{ minWidth: 'auto', px: 1.5, fontSize: '0.75rem' }}
            >
              {todayLabel}
            </Button>
          </span>
        </Tooltip>
      )}
      <Typography variant='body2' fontWeight={600} sx={{ minWidth: 120, textAlign: 'center' }}>
        {MONTHS_LONG[month - 1]} {year}
      </Typography>
      <Tooltip title='Mes siguiente'>
        <IconButton size={size} onClick={goToNext} disabled={disabled} aria-label='Mes siguiente'>
          <i className='tabler-chevron-right' style={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default PeriodNavigator
