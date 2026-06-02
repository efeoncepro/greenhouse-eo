'use client'

// TASK-975 — Contractor Classification Review Dialog (runtime).
// Promoted from the APPROVED mockup (DetailMockupView → ReviewDialog).
// Differences vs mock:
//   · initial factors / reviewed come from the real engagement (props)
//   · live preview uses the canonical computeClassificationRisk
//   · Save → PATCH /api/hr/contractors/[id] (action='review_classification')
//     + onReviewed (SoD: gated by hr.contractor_classification:approve server-side)

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import { computeClassificationRisk } from '@/lib/contractor-engagements'
import type { ContractorClassificationRiskFactors } from '@/lib/contractor-engagements/types'
import {
  CLASSIFICATION_FACTOR_KEYS,
  classificationStatusIcon,
  classificationStatusLabel,
  classificationStatusTone
} from '@/lib/contractor-engagements/engagement-display'

type SaveState = 'idle' | 'saving' | 'saved'

interface Props {
  engagementId: string
  open: boolean
  onClose: () => void
  initialFactors: ContractorClassificationRiskFactors
  initialReviewed: boolean
  onReviewed: () => void
}

const ContractorClassificationReviewDialog = ({
  engagementId,
  open,
  onClose,
  initialFactors,
  initialReviewed,
  onReviewed
}: Props) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  const [factors, setFactors] = useState<ContractorClassificationRiskFactors>({})
  const [reviewed, setReviewed] = useState(false)
  const [block, setBlock] = useState(false)
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setFactors({ ...initialFactors })
    setReviewed(initialReviewed)
    setBlock(false)
    setReason('')
    setTouched(false)
    setSaveState('idle')
    setError(null)
  }, [open, initialFactors, initialReviewed])

  const result = computeClassificationRisk({ factors, reviewed, block })
  const reasonError = touched && reason.trim().length < 10
  const resultTone = classificationStatusTone(result)

  const toggleFactor = (key: keyof ContractorClassificationRiskFactors) =>
    setFactors(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    setTouched(true)

    if (reason.trim().length < 10) return

    setSaveState('saving')
    setError(null)

    try {
      const response = await fetch(`/api/hr/contractors/${engagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review_classification',
          factors,
          reviewed,
          block,
          reason: reason.trim()
        })
      })

      await throwIfNotOk(response, C.classification.saveError)

      setSaveState('saved')
      onReviewed()
      window.setTimeout(() => {
        setSaveState('idle')
        onClose()
      }, 600)
    } catch (saveError) {
      setSaveState('idle')
      setError(saveError instanceof Error ? saveError.message : C.classification.saveError)
    }
  }

  return (
    <Dialog open={open} onClose={saveState === 'idle' ? onClose : undefined} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{C.classification.dialogTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={4} sx={{ pt: 1 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {C.classification.dialogIntro}
          </Typography>

          {/* SoD note */}
          <Stack
            direction='row'
            spacing={2}
            alignItems='flex-start'
            sx={{
              p: 3,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              bgcolor: alpha(theme.palette.info.main, 0.06),
              border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`
            }}
          >
            <i className='tabler-users-group' style={{ fontSize: 18, color: theme.palette.info.main, marginTop: 2 }} aria-hidden />
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {C.classification.sodNote}
            </Typography>
          </Stack>

          {/* Factors */}
          <Box component='fieldset' sx={{ border: 'none', p: 0, m: 0 }}>
            <Typography
              component='legend'
              variant='caption'
              sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, mb: 1 }}
            >
              {C.classification.factorsLegend}
            </Typography>
            <Stack>
              {CLASSIFICATION_FACTOR_KEYS.map(key => {
                const meta = C.classification.factors[key]

                return (
                  <FormControlLabel
                    key={key}
                    control={<Checkbox checked={Boolean(factors[key])} onChange={() => toggleFactor(key)} />}
                    sx={{ alignItems: 'flex-start', mr: 0, py: 0.5, '& .MuiFormControlLabel-label': { mt: 0.75 } }}
                    label={
                      <Box>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {meta.label}
                        </Typography>
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          {meta.description}
                        </Typography>
                      </Box>
                    }
                  />
                )
              })}
            </Stack>
          </Box>

          <Divider />

          {/* Review + block switches */}
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch checked={reviewed} onChange={() => setReviewed(v => !v)} />}
              label={
                <Box>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {C.classification.reviewedSwitch}
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {C.classification.reviewedHelper}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', mr: 0, '& .MuiFormControlLabel-label': { mt: 0.5 } }}
            />
            <FormControlLabel
              control={<Switch color='error' checked={block} onChange={() => setBlock(v => !v)} />}
              label={
                <Box>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {C.classification.blockSwitch}
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {C.classification.blockHelper}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', mr: 0, '& .MuiFormControlLabel-label': { mt: 0.5 } }}
            />
          </Stack>

          {/* Reason */}
          <CustomTextField
            label={C.classification.reasonLabel}
            value={reason}
            onChange={e => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            error={reasonError}
            helperText={reasonError ? C.classification.reasonError : C.classification.reasonHelper}
            multiline
            minRows={3}
            fullWidth
            slotProps={{ input: { 'aria-invalid': reasonError } }}
          />

          {/* Live result preview */}
          <Box
            sx={{
              p: 4,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              bgcolor: alpha(theme.palette[resultTone].main, 0.06),
              border: `1px solid ${alpha(theme.palette[resultTone].main, 0.24)}`
            }}
          >
            <Stack direction='row' spacing={2} alignItems='center'>
              <motion.span
                key={result}
                style={{ display: 'inline-flex', flexShrink: 0 }}
                initial={prefersReduced ? false : { scale: 0.8, opacity: 0 }}
                animate={prefersReduced ? { opacity: 1 } : { scale: [0.8, 1.1, 1], opacity: 1 }}
                transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              >
                <i className={classificationStatusIcon(result)} style={{ fontSize: 22, color: theme.palette[resultTone].main }} aria-hidden />
              </motion.span>
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {C.classification.resultLabel}
                </Typography>
                <Typography variant='subtitle1' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {classificationStatusLabel(result)}
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
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={saveState !== 'idle'}>
          {C.classification.cancelCta}
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
          {C.classification.saveCta}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ContractorClassificationReviewDialog
