'use client'

// TASK-968 Slice 1 — Engagement Compensation Editor (admin drawer), runtime.
// Promoted from the APPROVED mockup (mockup/ContractorCompensationDrawer.tsx):
// JSX / tokens / microinteractions preserved verbatim. Differences vs mock:
//   · data comes from the real engagement (props), not a mock builder
//   · currency is READ-ONLY (changing the rate denomination cascades to FX /
//     payable currency — a deliberate act out of V1 scope)
//   · Save calls PATCH /api/hr/contractors/[id] (action='update') + audit event
//     instead of a simulated state machine.
// The monto acordado is set ONLY here (admin) — the contractor never edits it (SoD).

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
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { formatNumber } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import {
  CADENCE_OPTIONS,
  RATE_TYPE_OPTIONS,
  cadencePaymentUnitLabel,
  type ContractorPaymentCadence,
  type ContractorRateType
} from '@/lib/contractor-engagements/compensation-display'

const aria = getMicrocopy('es-CL').aria

type SaveState = 'idle' | 'saving' | 'saved'

const parseAmount = (raw: string): number | null => {
  const digits = raw.replace(/[^\d]/g, '')

  return digits ? Number(digits) : null
}

const groupThousands = (n: number | null): string => (n === null ? '' : formatNumber(n))

export interface CompensationEditorEngagement {
  contractorEngagementId: string
  publicId: string
  contractorName: string
  relationshipSubtypeLabel: string
  rateType: ContractorRateType
  rateAmount: number | null
  paymentCadence: ContractorPaymentCadence
  currency: string
}

interface Props {
  open: boolean
  engagement: CompensationEditorEngagement
  onClose: () => void
  onSaved?: () => void
}

const ContractorEngagementCompensationDrawer = ({ open, engagement, onClose, onSaved }: Props) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  const [rateType, setRateType] = useState<ContractorRateType>(engagement.rateType)
  const [paymentCadence, setPaymentCadence] = useState<ContractorPaymentCadence>(engagement.paymentCadence)
  const [rateAmount, setRateAmount] = useState<number | null>(engagement.rateAmount)
  const [amountText, setAmountText] = useState<string>(groupThousands(engagement.rateAmount))
  const [touched, setTouched] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  // Sync the form to the engagement each time the drawer opens.
  useEffect(() => {
    if (!open) return

    setRateType(engagement.rateType)
    setPaymentCadence(engagement.paymentCadence)
    setRateAmount(engagement.rateAmount)
    setAmountText(groupThousands(engagement.rateAmount))
    setTouched(false)
    setSaveState('idle')
    setError(null)
  }, [open, engagement])

  const amountError = touched && (rateAmount === null || rateAmount <= 0)

  const expectedPerPayment = useMemo(() => {
    if (rateAmount === null) return null
    if (rateType === 'hourly' || rateType === 'daily') return null // depends on quantity

    return rateAmount
  }, [rateAmount, rateType])

  const handleSave = async () => {
    setTouched(true)

    if (rateAmount === null || rateAmount <= 0) return

    setSaveState('saving')
    setError(null)

    try {
      const response = await fetch(`/api/hr/contractors/${engagement.contractorEngagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', rateType, rateAmount, paymentCadence })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null

        throw new Error(payload?.error || C.editor.saveError)
      }

      setSaveState('saved')
      onSaved?.()
      window.setTimeout(() => {
        setSaveState('idle')
        onClose()
      }, 700)
    } catch (saveError) {
      setSaveState('idle')
      setError(saveError instanceof Error ? saveError.message : C.editor.saveError)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 520 } } } }}
    >
      <Box role='dialog' aria-labelledby='comp-drawer-title' sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: { xs: 5, sm: 6 }, pb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
            <Stack spacing={1}>
              <Typography id='comp-drawer-title' variant='h5' sx={{ fontWeight: 700 }}>
                {C.editor.drawerTitle}
              </Typography>
              <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                <CustomChip round='true' size='small' variant='tonal' color='secondary' label={engagement.publicId} />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {engagement.contractorName} · {engagement.relationshipSubtypeLabel}
                </Typography>
              </Stack>
            </Stack>
            <IconButton onClick={onClose} aria-label={aria.closeDrawer}>
              <i className='tabler-x' />
            </IconButton>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={5}>
            <CustomTextField
              select
              fullWidth
              label={C.editor.rateTypeLabel}
              value={rateType}
              onChange={e => setRateType(e.target.value as ContractorRateType)}
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
                  label={C.editor.amountLabel}
                  placeholder='600.000'
                  value={amountText}
                  error={amountError}
                  helperText={amountError ? C.editor.amountError : C.editor.amountHelper}
                  onChange={e => {
                    const parsed = parseAmount(e.target.value)

                    setAmountText(groupThousands(parsed))
                    setRateAmount(parsed)
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
                {/* Currency read-only: changing the rate denomination cascades to FX/payable (out of V1 scope). */}
                <CustomTextField fullWidth label={C.editor.currencyLabel} value={engagement.currency} disabled helperText={C.editor.currencyHelper} />
              </Grid>
            </Grid>

            <CustomTextField
              select
              fullWidth
              label={C.editor.cadenceLabel}
              value={paymentCadence}
              onChange={e => setPaymentCadence(e.target.value as ContractorPaymentCadence)}
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
                    {C.editor.expectedLabel}
                  </Typography>
                  <Typography variant='h5' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                    {expectedPerPayment !== null ? (
                      <AnimatedCounter value={expectedPerPayment} format='currency' currency={engagement.currency} duration={prefersReduced ? 0 : 0.5} />
                    ) : (
                      C.editor.expectedByQuantity
                    )}{' '}
                    <Typography component='span' variant='body2' sx={{ color: 'text.secondary', fontWeight: 400 }}>
                      / {cadencePaymentUnitLabel(paymentCadence)}
                    </Typography>
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {error ? (
              <Typography variant='caption' role='alert' sx={{ color: 'error.main', display: 'flex', gap: 1, alignItems: 'center' }}>
                <i className='tabler-alert-triangle' style={{ fontSize: 16 }} aria-hidden />
                {error}
              </Typography>
            ) : null}

            <Typography variant='caption' sx={{ color: 'text.disabled', display: 'flex', gap: 1, alignItems: 'center' }}>
              <i className='tabler-history' style={{ fontSize: 16 }} aria-hidden />
              {C.editor.auditNote}
            </Typography>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saveState !== 'idle'}>
            {C.editor.cancel}
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
                  <motion.span key='check' style={{ display: 'inline-flex' }} initial={prefersReduced ? false : { opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
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
            {saveState === 'saving' ? C.editor.saving : saveState === 'saved' ? C.editor.saved : C.editor.save}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default ContractorEngagementCompensationDrawer
