'use client'

// TASK-968 mockup — Surface A: Engagement Compensation Editor (admin drawer).
// Where HR sets the agreed amount. Single-column form (forms-ux), one accent
// (primary on Save), tokens only, animated derived preview, save state machine.
// Microinteractions respect prefers-reduced-motion.

import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { getMicrocopy } from '@/lib/copy'
import { formatNumber } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import {
  CADENCE_OPTIONS,
  CURRENCY_OPTIONS,
  RATE_TYPE_OPTIONS,
  cadenceUnitLabel,
  type CompensationFormValue,
  type CompensationMock
} from './compensation-data'

const aria = getMicrocopy('es-CL').aria

const COPY = {
  save: 'Guardar compensación',
  saving: 'Guardando…',
  saved: 'Guardado',
  cancel: 'Cancelar'
}

type SaveState = 'idle' | 'saving' | 'saved'

const parseAmount = (raw: string): number | null => {
  const digits = raw.replace(/[^\d]/g, '')

  return digits ? Number(digits) : null
}

const groupThousands = (n: number | null): string => (n === null ? '' : formatNumber(n))

interface Props {
  open: boolean
  mock: CompensationMock
  onClose: () => void
  onSaved?: (value: CompensationFormValue) => void
}

const ContractorCompensationDrawer = ({ open, mock, onClose, onSaved }: Props) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  const [value, setValue] = useState<CompensationFormValue>(mock.compensation)
  const [amountText, setAmountText] = useState<string>(groupThousands(mock.compensation.rateAmount))
  const [touched, setTouched] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // Sync the form to the current engagement each time the drawer opens.
  useEffect(() => {
    if (!open) return

    setValue(mock.compensation)
    setAmountText(groupThousands(mock.compensation.rateAmount))
    setTouched(false)
    setSaveState('idle')
  }, [open, mock.compensation])

  const amountError = touched && (value.rateAmount === null || value.rateAmount <= 0)

  const expectedPerPayment = useMemo(() => {
    if (value.rateAmount === null) return null
    if (value.rateType === 'hourly' || value.rateType === 'daily') return null // depends on quantity

    return value.rateAmount
  }, [value.rateAmount, value.rateType])

  const handleSave = () => {
    setTouched(true)

    if (value.rateAmount === null || value.rateAmount <= 0) return

    setSaveState('saving')
    window.setTimeout(() => {
      setSaveState('saved')
      onSaved?.(value)
      window.setTimeout(() => {
        setSaveState('idle')
        onClose()
      }, 750)
    }, 900)
  }

  const fieldset = (
    <Stack spacing={5}>
      <CustomTextField
        select
        fullWidth
        label='Tipo de tarifa'
        value={value.rateType}
        onChange={e => setValue(v => ({ ...v, rateType: e.target.value as CompensationFormValue['rateType'] }))}
      >
        {RATE_TYPE_OPTIONS.map(o => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </CustomTextField>

      <Grid container spacing={4}>
        <Grid size={{ xs: 7 }}>
          <CustomTextField
            fullWidth
            label='Monto acordado'
            placeholder='600.000'
            value={amountText}
            error={amountError}
            helperText={amountError ? 'Ingresa un monto mayor a 0.' : 'Monto bruto antes de retención.'}
            onChange={e => {
              const parsed = parseAmount(e.target.value)

              setAmountText(groupThousands(parsed))
              setValue(v => ({ ...v, rateAmount: parsed }))
            }}
            onBlur={() => setTouched(true)}
            slotProps={{
              input: {
                inputMode: 'decimal',
                'aria-invalid': amountError,
                startAdornment: <InputAdornment position='start'>$</InputAdornment>
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 5 }}>
          <CustomTextField
            select
            fullWidth
            label='Moneda'
            value={value.currency}
            onChange={e => setValue(v => ({ ...v, currency: e.target.value }))}
          >
            {CURRENCY_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>
                {o.value}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
      </Grid>

      <CustomTextField
        select
        fullWidth
        label='Cadencia'
        value={value.paymentCadence}
        onChange={e => setValue(v => ({ ...v, paymentCadence: e.target.value as CompensationFormValue['paymentCadence'] }))}
      >
        {CADENCE_OPTIONS.map(o => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </CustomTextField>

      {/* Derived preview — animated, read-only */}
      <Box
        sx={{
          p: 4,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`
        }}
      >
        <Stack direction='row' spacing={2} alignItems='center'>
          <i className='tabler-calculator' style={{ fontSize: 20, color: theme.palette.primary.main }} aria-hidden />
          <Box>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              Monto esperado por pago
            </Typography>
            <Typography variant='h5' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {expectedPerPayment !== null ? (
                <AnimatedCounter
                  value={expectedPerPayment}
                  format='currency'
                  currency={value.currency}
                  duration={prefersReduced ? 0 : 0.5}
                />
              ) : (
                'Según cantidad declarada'
              )}{' '}
              <Typography component='span' variant='body2' sx={{ color: 'text.secondary', fontWeight: 400 }}>
                / {cadenceUnitLabel(value.paymentCadence)}
              </Typography>
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Typography variant='caption' sx={{ color: 'text.disabled', display: 'flex', gap: 1, alignItems: 'center' }}>
        <i className='tabler-history' style={{ fontSize: 16 }} aria-hidden />
        Cada cambio queda registrado (quién y cuándo).
      </Typography>
    </Stack>
  )

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 520 } } } }}
    >
      <Box role='dialog' aria-labelledby='comp-drawer-title' sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: { xs: 5, sm: 6 }, pb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
            <Stack spacing={1}>
              <Typography id='comp-drawer-title' variant='h5' sx={{ fontWeight: 700 }}>
                Compensación del engagement
              </Typography>
              <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                <CustomChip round='true' size='small' variant='tonal' color='secondary' label={mock.engagementPublicId} />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {mock.contractorName} · {mock.relationshipSubtype}
                </Typography>
              </Stack>
            </Stack>
            <IconButton onClick={onClose} aria-label={aria.closeDrawer}>
              <i className='tabler-x' />
            </IconButton>
          </Stack>
        </Box>

        <Divider />

        {/* Body */}
        <Box sx={{ p: { xs: 5, sm: 6 }, flex: 1, overflowY: 'auto' }}>{fieldset}</Box>

        <Divider />

        {/* Footer */}
        <Box sx={{ p: { xs: 5, sm: 6 }, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saveState !== 'idle'}>
            {COPY.cancel}
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={saveState !== 'idle'}
            startIcon={
              <AnimatePresence mode='wait' initial={false}>
                {saveState === 'saving' ? (
                  <motion.span
                    key='spin'
                    style={{ display: 'inline-flex' }}
                    initial={prefersReduced ? false : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={prefersReduced ? undefined : { opacity: 0, scale: 0.6 }}
                  >
                    <CircularProgress size={16} color='inherit' />
                  </motion.span>
                ) : saveState === 'saved' ? (
                  <motion.span
                    key='check'
                    style={{ display: 'inline-flex' }}
                    initial={prefersReduced ? false : { opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <i className='tabler-check' />
                  </motion.span>
                ) : (
                  <motion.span key='idle' style={{ display: 'inline-flex' }}>
                    <i className='tabler-device-floppy' />
                  </motion.span>
                )}
              </AnimatePresence>
            }
          >
            {saveState === 'saving' ? COPY.saving : saveState === 'saved' ? COPY.saved : COPY.save}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default ContractorCompensationDrawer
