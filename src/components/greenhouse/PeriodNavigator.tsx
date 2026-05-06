'use client'

import { useCallback, useMemo } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { SxProps, Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()

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

const MONTHS_SELECT = GREENHOUSE_COPY.months.long

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

// ── FullCalendar-style button (replicates .fc-button theme) ──

const fcButton: SxProps<Theme> = {
  bgcolor: 'background.paper',
  borderColor: 'divider',
  color: 'text.primary',
  textTransform: 'none',
  boxShadow: 'none',
  minWidth: 36,
  height: 36,
  px: 1,
  fontSize: '0.875rem',
  fontWeight: 500,
  borderRadius: 0,
  border: '1px solid',
  borderRightWidth: 0,
  '&:hover': { bgcolor: 'action.hover', borderColor: 'divider', boxShadow: 'none' },
  '&:focus-visible': { zIndex: 1 },
  '&.Mui-disabled': { bgcolor: 'background.paper', borderColor: 'divider', color: 'text.disabled' }
}

const fcFirst: SxProps<Theme> = { borderRadius: '6px 0 0 6px' }
const fcLast: SxProps<Theme> = { borderRadius: '0 6px 6px 0', borderRightWidth: 1 }

// ── Dot indicator ──

const PulseDot = () => (
  <Box
    component='span'
    sx={{
      display: 'inline-block',
      width: 6,
      height: 6,
      borderRadius: '50%',
      bgcolor: 'warning.main',
      mr: 0.75,
      '@keyframes periodDotPulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.4 }
      },
      animation: 'periodDotPulse 2s ease-in-out infinite',
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
    }}
  />
)

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

  const periodLabel = isMobile ? formatShort(month, year) : formatLong(month, year)

  // ── Variant: dropdowns ──

  if (variant === 'dropdowns') {
    return (
      <Box component='nav' aria-label='Navegación de período' sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CustomTextField
          select
          size='small'
          value={year}
          onChange={e => handleYearChange(Number(e.target.value))}
          disabled={disabled}
          sx={{ minWidth: 85 }}
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
          sx={{ minWidth: 115 }}
        >
          {MONTHS_SELECT.map((label, i) => (
            <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
          ))}
        </CustomTextField>
        {showToday && !isCurrentPeriod && (
          <Button
            size='small'
            variant='outlined'
            color='secondary'
            onClick={goToToday}
            disabled={disabled}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
          >
            <PulseDot />
            {todayLabel}
          </Button>
        )}
      </Box>
    )
  }

  // ── Variant: compact ──

  if (variant === 'compact') {
    return (
      <Box component='nav' aria-label='Navegación de período' sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'inline-flex' }}>
          <Button
            onClick={goToPrev}
            disabled={disabled}
            aria-label={`Mes anterior: ${formatShort(prevPeriod.month, prevPeriod.year)}`}
            sx={{ ...fcButton, ...fcFirst, minWidth: 28, height: 28, px: 0.5 }}
          >
            <i className='tabler-chevron-left' style={{ fontSize: 14 }} />
          </Button>
          <Button
            onClick={goToNext}
            disabled={disabled}
            aria-label={`Mes siguiente: ${formatShort(nextPeriod.month, nextPeriod.year)}`}
            sx={{ ...fcButton, ...fcLast, minWidth: 28, height: 28, px: 0.5 }}
          >
            <i className='tabler-chevron-right' style={{ fontSize: 14 }} />
          </Button>
        </Box>
        <Typography variant='caption' fontWeight={600} role='status' aria-live='polite'>
          {formatShort(month, year)}
        </Typography>
      </Box>
    )
  }

  // ── Variant: arrows (default — FullCalendar toolbar style) ──

  return (
    <Box component='nav' aria-label='Navegación de período' sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Navigation group: ‹ › Hoy — mimics fc-button-group */}
      <Box sx={{ display: 'inline-flex' }}>
        <Tooltip title={`Mes anterior: ${formatLong(prevPeriod.month, prevPeriod.year)}`}>
          <Button
            onClick={goToPrev}
            disabled={disabled}
            aria-label={`Mes anterior: ${formatLong(prevPeriod.month, prevPeriod.year)}`}
            sx={{ ...fcButton, ...fcFirst }}
          >
            <i className='tabler-chevron-left' style={{ fontSize: 18 }} />
          </Button>
        </Tooltip>
        <Tooltip title={`Mes siguiente: ${formatLong(nextPeriod.month, nextPeriod.year)}`}>
          <Button
            onClick={goToNext}
            disabled={disabled}
            aria-label={`Mes siguiente: ${formatLong(nextPeriod.month, nextPeriod.year)}`}
            sx={{ ...fcButton, ...(showToday ? {} : fcLast) }}
          >
            <i className='tabler-chevron-right' style={{ fontSize: 18 }} />
          </Button>
        </Tooltip>
        {showToday && (
          <Tooltip title={isCurrentPeriod ? 'Período actual' : `Ir a ${formatLong(today.month, today.year)}`}>
            <span>
              <Button
                onClick={goToToday}
                disabled={disabled || isCurrentPeriod}
                aria-label={isCurrentPeriod ? 'Período actual' : `Ir a ${formatLong(today.month, today.year)}`}
                aria-current={isCurrentPeriod ? 'date' : undefined}
                sx={{
                  ...fcButton,
                  ...fcLast,
                  px: 1.5,
                  fontWeight: 600,
                  ...(isCurrentPeriod
                    ? {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        borderColor: 'primary.main',
                        '&.Mui-disabled': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          borderColor: 'primary.main',
                          opacity: 1
                        }
                      }
                    : {}
                  )
                }}
              >
                {!isCurrentPeriod && <PulseDot />}
                {todayLabel}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* Period label — separate heading, like fc-toolbar-title */}
      <Typography
        variant='h6'
        fontWeight={600}
        role='status'
        aria-live='polite'
        aria-atomic='true'
        sx={{ fontSize: isMobile ? '0.875rem' : '1.125rem', userSelect: 'none', color: isCurrentPeriod ? 'text.primary' : 'text.secondary' }}
      >
        {periodLabel}
      </Typography>
    </Box>
  )
}

export default PeriodNavigator
