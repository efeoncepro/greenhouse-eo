'use client'

import { useCallback, useMemo } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

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
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
]

const MONTHS_SELECT = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
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

const formatLong = (month: number, year: number) => `${MONTHS_LONG[month - 1]} de ${year}`
const formatShort = (month: number, year: number) => `${MONTHS_SHORT[month - 1]} ${year}`

// ── Dot indicator ──

const PulseDot = () => (
  <Box
    sx={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      bgcolor: 'warning.main',
      flexShrink: 0,
      mr: 0.5,
      '@keyframes periodDotPulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.4 }
      },
      animation: 'periodDotPulse 2s ease-in-out infinite',
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none'
      }
    }}
  />
)

// ── Shared button styles ──

const arrowSx = { px: 1, minWidth: 36 }

const labelDisabledSx = (isCurrentPeriod: boolean) => ({
  '&.Mui-disabled': {
    borderColor: 'divider',
    color: isCurrentPeriod ? 'text.primary' : 'text.secondary'
  }
})

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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const resolvedMaxYear = maxYear ?? new Date().getFullYear() + 1
  const today = useMemo(() => getToday(), [])
  const isCurrentPeriod = isSamePeriod({ year, month }, today)
  const prevPeriod = navigateMonth(year, month, -1)
  const nextPeriod = navigateMonth(year, month, 1)

  const years = useMemo(() => {
    const list: number[] = []

    for (let y = resolvedMaxYear; y >= minYear; y--) list.push(y)

    return list
  }, [minYear, resolvedMaxYear])

  const goToPrev = useCallback(() => {
    if (!disabled) onChange(prevPeriod)
  }, [prevPeriod, onChange, disabled])

  const goToNext = useCallback(() => {
    if (!disabled) onChange(nextPeriod)
  }, [nextPeriod, onChange, disabled])

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
      <ButtonGroup variant='outlined' size={size} component='nav' aria-label='Navegación de período' sx={{ height: 38, borderColor: 'text.disabled' }}>
        <CustomTextField
          select
          size='small'
          value={year}
          onChange={e => handleYearChange(Number(e.target.value))}
          disabled={disabled}
          slotProps={{ input: { sx: { fontSize: '0.8125rem', border: 'none' } } }}
          sx={{ minWidth: 80, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
        >
          {years.map(y => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          select
          size='small'
          value={month}
          onChange={e => handleMonthChange(Number(e.target.value))}
          disabled={disabled}
          slotProps={{ input: { sx: { fontSize: '0.8125rem', border: 'none' } } }}
          sx={{ minWidth: 100, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
        >
          {MONTHS_SELECT.map((label, i) => (
            <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
          ))}
        </CustomTextField>
        {showToday && !isCurrentPeriod && (
          <Button
            color='primary'
            onClick={goToToday}
            disabled={disabled}
            sx={{ px: 1.5, minWidth: 'auto', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'none' }}
          >
            <PulseDot />
            {todayLabel}
          </Button>
        )}
      </ButtonGroup>
    )
  }

  // ── Variant: compact ──

  if (variant === 'compact') {
    return (
      <ButtonGroup variant='outlined' size='small' component='nav' aria-label='Navegación de período' sx={{ height: 28, borderColor: 'text.disabled' }}>
        <Button
          onClick={goToPrev}
          disabled={disabled}
          aria-label={`Mes anterior: ${formatShort(prevPeriod.month, prevPeriod.year)}`}
          sx={{ px: 0.5, minWidth: 28 }}
        >
          <i className='tabler-chevron-left' style={{ fontSize: 14 }} />
        </Button>
        <Button
          disabled
          sx={{
            px: 1,
            minWidth: 65,
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'none',
            ...labelDisabledSx(isCurrentPeriod)
          }}
        >
          {formatShort(month, year)}
        </Button>
        <Button
          onClick={goToNext}
          disabled={disabled}
          aria-label={`Mes siguiente: ${formatShort(nextPeriod.month, nextPeriod.year)}`}
          sx={{ px: 0.5, minWidth: 28 }}
        >
          <i className='tabler-chevron-right' style={{ fontSize: 14 }} />
        </Button>
      </ButtonGroup>
    )
  }

  // ── Variant: arrows (default) ──

  const periodLabel = isMobile ? formatShort(month, year) : formatLong(month, year)

  return (
    <ButtonGroup
      variant='outlined'
      size={size}
      component='nav'
      aria-label='Navegación de período'
      sx={{ height: 38, borderColor: 'text.disabled' }}
    >
      {/* Prev */}
      <Tooltip title={`Mes anterior: ${formatLong(prevPeriod.month, prevPeriod.year)}`}>
        <Button
          onClick={goToPrev}
          disabled={disabled}
          aria-label={`Mes anterior: ${formatLong(prevPeriod.month, prevPeriod.year)}`}
          sx={arrowSx}
        >
          <i className='tabler-chevron-left' style={{ fontSize: 18 }} />
        </Button>
      </Tooltip>

      {/* Today */}
      {showToday && (
        <Tooltip title={isCurrentPeriod ? 'Período actual' : `Ir a ${formatLong(today.month, today.year)}`}>
          <span>
            <Button
              variant={isCurrentPeriod ? 'contained' : 'outlined'}
              color={isCurrentPeriod ? 'secondary' : 'primary'}
              onClick={goToToday}
              disabled={disabled || isCurrentPeriod}
              aria-label={isCurrentPeriod ? `Período actual: ${formatLong(month, year)}` : `Ir a ${formatLong(today.month, today.year)}`}
              aria-current={isCurrentPeriod ? 'date' : undefined}
              sx={{
                px: 1.5,
                minWidth: 'auto',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' }
              }}
            >
              {!isCurrentPeriod && <PulseDot />}
              {todayLabel}
            </Button>
          </span>
        </Tooltip>
      )}

      {/* Period label (disabled button for layout participation) */}
      <Button
        disabled
        sx={{
          px: 2,
          minWidth: isMobile ? 80 : 150,
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          ...labelDisabledSx(isCurrentPeriod)
        }}
      >
        {periodLabel}
      </Button>

      {/* Screen reader period announcement */}
      <span role='status' aria-live='polite' aria-atomic='true' style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {formatLong(month, year)}
      </span>

      {/* Next */}
      <Tooltip title={`Mes siguiente: ${formatLong(nextPeriod.month, nextPeriod.year)}`}>
        <Button
          onClick={goToNext}
          disabled={disabled}
          aria-label={`Mes siguiente: ${formatLong(nextPeriod.month, nextPeriod.year)}`}
          sx={arrowSx}
        >
          <i className='tabler-chevron-right' style={{ fontSize: 18 }} />
        </Button>
      </Tooltip>
    </ButtonGroup>
  )
}

export default PeriodNavigator
