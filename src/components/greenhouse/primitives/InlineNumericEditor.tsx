'use client'

// TASK-743 — Canonical inline numeric editor for operational data tables.
// Replaces ad-hoc input+slider primitives (BonusInput, etc.). Renders adapt
// to the effective table density resolved by <DataTableShell>.
//
// Spec: docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md

import { useCallback, useId, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import { useTableDensity } from '../data-table/useTableDensity'

export type InlineNumericEditorCurrency = 'CLP' | 'USD'

export interface InlineNumericEditorProps {
  value: number
  min: number
  max: number
  step?: number
  currency: InlineNumericEditorCurrency
  qualifies?: boolean
  disabled?: boolean
  label: string
  onChange: (value: number) => void
  onBlur?: () => void
  formatDisplay?: (value: number, currency: InlineNumericEditorCurrency) => string
}

const defaultFormatDisplay = (value: number, currency: InlineNumericEditorCurrency): string => {
  if (currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min

  return Math.min(Math.max(value, min), max)
}

const InlineNumericEditor = ({
  value,
  min,
  max,
  step,
  currency,
  qualifies = true,
  disabled = false,
  label,
  onChange,
  onBlur,
  formatDisplay
}: InlineNumericEditorProps) => {
  const { tokens, density } = useTableDensity()
  const [localValue, setLocalValue] = useState<number>(value)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const popoverId = useId()
  const resolvedStep = step ?? (currency === 'CLP' ? 1000 : 10)
  const formatter = formatDisplay ?? defaultFormatDisplay

  const isDisabled = disabled || !qualifies || max === 0
  const supportsRange = max > min

  const commitValue = useCallback(
    (next: number) => {
      const safe = clamp(next, min, max)

      setLocalValue(safe)

      if (safe !== value) {
        onChange(safe)
      }
    },
    [min, max, onChange, value]
  )

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value)

      if (Number.isNaN(raw)) return

      commitValue(raw)
    },
    [commitValue]
  )

  const handleSliderChange = useCallback(
    (_event: Event, next: number | number[]) => {
      const v = Array.isArray(next) ? next[0] : next

      commitValue(v)
    },
    [commitValue]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!supportsRange) return

      if (event.shiftKey && event.key === 'ArrowUp') {
        event.preventDefault()
        commitValue(localValue + resolvedStep * 5)

        return
      }

      if (event.shiftKey && event.key === 'ArrowDown') {
        event.preventDefault()
        commitValue(localValue - resolvedStep * 5)
      }
    },
    [supportsRange, commitValue, localValue, resolvedStep]
  )

  if (isDisabled) {
    return (
      <Typography
        variant='body2'
        color='text.disabled'
        sx={{ fontFamily: 'monospace', fontSize: tokens.fontSize }}
      >
        {formatter(0, currency)}
      </Typography>
    )
  }

  const renderInput = () => (
    <CustomTextField
      size='small'
      type='number'
      label={density === 'expanded' ? label : undefined}
      aria-label={label}
      value={localValue}
      onChange={handleInputChange}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      inputProps={{
        min,
        max,
        step: resolvedStep,
        'aria-valuemin': min,
        'aria-valuemax': max,
        'aria-valuenow': localValue
      }}
      sx={{
        width: tokens.inlineEditorMinWidth,
        '& input': {
          fontFamily: 'monospace',
          textAlign: 'right',
          fontSize: tokens.fontSize
        }
      }}
    />
  )

  // expanded — slider + min/max captions inline (legacy BonusInput layout)
  if (density === 'expanded' && supportsRange) {
    return (
      <Stack spacing={1} sx={{ minWidth: tokens.inlineEditorMinWidth }}>
        {renderInput()}
        <Box sx={{ px: 0.5 }}>
          <Slider
            size='small'
            value={localValue}
            min={min}
            max={max}
            step={resolvedStep}
            onChange={handleSliderChange}
            valueLabelDisplay='auto'
            valueLabelFormat={v => formatter(v, currency)}
            aria-label={`${label} slider`}
          />
          {tokens.showMinMaxCaption && (
            <Stack direction='row' justifyContent='space-between'>
              <Typography variant='caption' color='text.disabled'>
                {formatter(min, currency)}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                {formatter(max, currency)}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
    )
  }

  // comfortable + compact — input + popover-on-demand for slider when supportsRange.
  // compact density also gets keyboard shift+arrow shortcuts.
  return (
    <ClickAwayListener onClickAway={() => setPopoverOpen(false)}>
      <Box ref={anchorRef} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        {renderInput()}
        {supportsRange && density !== 'compact' && (
          <IconButton
            size='small'
            aria-label={`Ajustar ${label}`}
            aria-haspopup='dialog'
            aria-expanded={popoverOpen}
            aria-controls={popoverOpen ? popoverId : undefined}
            onClick={() => setPopoverOpen(prev => !prev)}
            sx={{ p: 0.25 }}
          >
            <i className='tabler-chevron-down' style={{ fontSize: 14 }} />
          </IconButton>
        )}
        <Popper
          id={popoverId}
          open={popoverOpen && supportsRange}
          anchorEl={anchorRef.current}
          placement='bottom-end'
          modifiers={[{ name: 'offset', options: { offset: [0, 6] } }]}
          sx={{ zIndex: theme => theme.zIndex.modal }}
        >
          <Paper
            elevation={6}
            role='dialog'
            aria-label={`Ajustar ${label}`}
            sx={{ p: 2, width: 240 }}
          >
            <Stack spacing={1.25}>
              <Typography variant='caption' color='text.secondary'>
                {label}
              </Typography>
              <Slider
                size='small'
                value={localValue}
                min={min}
                max={max}
                step={resolvedStep}
                onChange={handleSliderChange}
                valueLabelDisplay='auto'
                valueLabelFormat={v => formatter(v, currency)}
                aria-label={`${label} slider`}
              />
              <Stack direction='row' justifyContent='space-between'>
                <Typography variant='caption' color='text.disabled'>
                  {formatter(min, currency)}
                </Typography>
                <Typography variant='caption' color='text.disabled'>
                  {formatter(max, currency)}
                </Typography>
              </Stack>
              <Stack direction='row' spacing={1} justifyContent='flex-end'>
                <Button size='small' onClick={() => commitValue(min)}>
                  Min
                </Button>
                <Button size='small' onClick={() => commitValue(max)}>
                  Max
                </Button>
                <Button size='small' variant='tonal' onClick={() => setPopoverOpen(false)}>
                  Listo
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}

export default InlineNumericEditor
