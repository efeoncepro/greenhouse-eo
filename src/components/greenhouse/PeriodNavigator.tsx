'use client'

import { useCallback, useMemo } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
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

// ── Dot indicator for non-current period ──

const PulseDot = () => (
  <Box
    sx={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      bgcolor: 'warning.main',
      flexShrink: 0,
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

  const h = size === 'small' ? 36 : 40

  // ── Variant: dropdowns ──

  if (variant === 'dropdowns') {
    return (
      <Paper
        variant='outlined'
        component='nav'
        aria-label='Navegación de período'
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 2,
          overflow: 'hidden',
          height: h,
          px: 1,
          gap: 1,
          bgcolor: 'action.hover',
          borderColor: 'divider'
        }}
      >
        <CustomTextField
          select
          size='small'
          value={year}
          onChange={e => handleYearChange(Number(e.target.value))}
          disabled={disabled}
          slotProps={{ input: { sx: { fontSize: '0.8125rem' } } }}
          sx={{ minWidth: 80, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
        >
          {years.map(y => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </CustomTextField>
        <Divider orientation='vertical' flexItem />
        <CustomTextField
          select
          size='small'
          value={month}
          onChange={e => handleMonthChange(Number(e.target.value))}
          disabled={disabled}
          slotProps={{ input: { sx: { fontSize: '0.8125rem' } } }}
          sx={{ minWidth: 100, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
        >
          {MONTHS_SELECT.map((label, i) => (
            <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
          ))}
        </CustomTextField>
        {showToday && !isCurrentPeriod && (
          <>
            <Divider orientation='vertical' flexItem />
            <Button
              size='small'
              color='secondary'
              onClick={goToToday}
              disabled={disabled}
              startIcon={<PulseDot />}
              sx={{ minWidth: 'auto', px: 1.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'none', borderRadius: 0, height: '100%' }}
            >
              {todayLabel}
            </Button>
          </>
        )}
      </Paper>
    )
  }

  // ── Variant: compact ──

  if (variant === 'compact') {
    return (
      <Paper
        variant='outlined'
        component='nav'
        aria-label='Navegación de período'
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 2,
          overflow: 'hidden',
          height: 28,
          bgcolor: 'action.hover',
          borderColor: 'divider'
        }}
      >
        <IconButton
          size='small'
          onClick={goToPrev}
          disabled={disabled}
          aria-label={`Mes anterior: ${formatShort(prevPeriod.month, prevPeriod.year)}`}
          sx={{ borderRadius: 0, px: 0.5, height: '100%' }}
        >
          <i className='tabler-chevron-left' style={{ fontSize: 14 }} />
        </IconButton>
        <Typography
          variant='caption'
          fontWeight={600}
          role='status'
          aria-live='polite'
          aria-atomic='true'
          sx={{
            px: 1,
            minWidth: 65,
            textAlign: 'center',
            color: isCurrentPeriod ? 'text.primary' : 'text.secondary',
            userSelect: 'none'
          }}
        >
          {formatShort(month, year)}
        </Typography>
        <IconButton
          size='small'
          onClick={goToNext}
          disabled={disabled}
          aria-label={`Mes siguiente: ${formatShort(nextPeriod.month, nextPeriod.year)}`}
          sx={{ borderRadius: 0, px: 0.5, height: '100%' }}
        >
          <i className='tabler-chevron-right' style={{ fontSize: 14 }} />
        </IconButton>
      </Paper>
    )
  }

  // ── Variant: arrows (default) ──

  const periodLabel = isMobile ? formatShort(month, year) : formatLong(month, year)

  return (
    <Paper
      variant='outlined'
      component='nav'
      aria-label='Navegación de período'
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 2,
        overflow: 'hidden',
        height: h,
        bgcolor: 'action.hover',
        borderColor: 'divider'
      }}
    >
      {/* Prev arrow */}
      <Tooltip title={`Mes anterior: ${formatLong(prevPeriod.month, prevPeriod.year)}`}>
        <IconButton
          size='small'
          onClick={goToPrev}
          disabled={disabled}
          aria-label={`Mes anterior: ${formatLong(prevPeriod.month, prevPeriod.year)}`}
          sx={{ borderRadius: 0, px: 1, height: '100%', '&:hover': { bgcolor: 'action.hover' } }}
        >
          <i className='tabler-chevron-left' style={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Divider orientation='vertical' flexItem />

      {/* Today button */}
      {showToday && (
        <>
          <Tooltip title={isCurrentPeriod ? 'Período actual' : `Ir a ${formatLong(today.month, today.year)}`}>
            <span>
              <Button
                size='small'
                variant={isCurrentPeriod ? 'contained' : 'text'}
                color={isCurrentPeriod ? 'primary' : 'secondary'}
                onClick={goToToday}
                disabled={disabled || isCurrentPeriod}
                startIcon={!isCurrentPeriod ? <PulseDot /> : undefined}
                aria-label={isCurrentPeriod ? `Período actual: ${formatLong(month, year)}` : `Ir a ${formatLong(today.month, today.year)}`}
                aria-current={isCurrentPeriod ? 'date' : undefined}
                sx={{
                  borderRadius: 0,
                  px: 1.5,
                  height: '100%',
                  minWidth: 'auto',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                {todayLabel}
              </Button>
            </span>
          </Tooltip>
          <Divider orientation='vertical' flexItem />
        </>
      )}

      {/* Period label */}
      <Fade in key={`${year}-${month}`} timeout={150}>
        <Typography
          variant='subtitle2'
          fontWeight={600}
          role='status'
          aria-live='polite'
          aria-atomic='true'
          sx={{
            px: 2,
            minWidth: isMobile ? 80 : 140,
            textAlign: 'center',
            color: isCurrentPeriod ? 'text.primary' : 'text.secondary',
            userSelect: 'none'
          }}
        >
          {periodLabel}
        </Typography>
      </Fade>

      <Divider orientation='vertical' flexItem />

      {/* Next arrow */}
      <Tooltip title={`Mes siguiente: ${formatLong(nextPeriod.month, nextPeriod.year)}`}>
        <IconButton
          size='small'
          onClick={goToNext}
          disabled={disabled}
          aria-label={`Mes siguiente: ${formatLong(nextPeriod.month, nextPeriod.year)}`}
          sx={{ borderRadius: 0, px: 1, height: '100%', '&:hover': { bgcolor: 'action.hover' } }}
        >
          <i className='tabler-chevron-right' style={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Paper>
  )
}

export default PeriodNavigator
