'use client'

// TASK-975 — Contractor Engagement Terms Drawer (runtime).
// Promoted from the APPROVED mockup (DetailMockupView → TermsDrawer).
// Differences vs mock:
//   · data comes from the real engagement (props); pre-filled on open
//   · Save → PATCH /api/hr/contractors/[id] (action='update') with only the
//     changed fields + onSaved. NOTE: rate / cadence are NOT edited here — that
//     is the compensation drawer's job (deliberate separation of concerns).

import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import { CONTRACTOR_BONUS_POLICIES, CONTRACTOR_PAYMENT_MODELS } from '@/lib/contractor-engagements'
import type {
  ContractorBonusPolicy,
  ContractorEngagement,
  ContractorPaymentModel
} from '@/lib/contractor-engagements/types'
import { bonusPolicyLabel, paymentModelLabel } from '@/lib/contractor-engagements/engagement-display'

const aria = getMicrocopy('es-CL').aria

type SaveState = 'idle' | 'saving' | 'saved'

interface Props {
  engagement: ContractorEngagement | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const ContractorEngagementTermsDrawer = ({ engagement, open, onClose, onSaved }: Props) => {
  const prefersReduced = useReducedMotion()

  const [paymentModel, setPaymentModel] = useState<ContractorPaymentModel>('fixed_recurring')
  const [fxPolicyCode, setFxPolicyCode] = useState('')
  const [providerContractId, setProviderContractId] = useState('')
  const [providerWorkerId, setProviderWorkerId] = useState('')
  const [requiresInvoice, setRequiresInvoice] = useState(false)
  const [requiresWorkApproval, setRequiresWorkApproval] = useState(false)
  const [bonusPolicy, setBonusPolicy] = useState<ContractorBonusPolicy>('none')
  const [endDate, setEndDate] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !engagement) return

    setPaymentModel(engagement.paymentModel)
    setFxPolicyCode(engagement.fxPolicyCode ?? '')
    setProviderContractId(engagement.providerContractId ?? '')
    setProviderWorkerId(engagement.providerWorkerId ?? '')
    setRequiresInvoice(engagement.requiresInvoice)
    setRequiresWorkApproval(engagement.requiresWorkApproval)
    setBonusPolicy(engagement.bonusPolicy)
    setEndDate(engagement.endDate ?? '')
    setSaveState('idle')
    setError(null)
  }, [open, engagement])

  // Compute only the fields that actually changed vs the engagement.
  const changedFields = useMemo(() => {
    if (!engagement) return {}

    const patch: Record<string, unknown> = {}

    if (paymentModel !== engagement.paymentModel) patch.paymentModel = paymentModel
    if (bonusPolicy !== engagement.bonusPolicy) patch.bonusPolicy = bonusPolicy
    if (requiresInvoice !== engagement.requiresInvoice) patch.requiresInvoice = requiresInvoice
    if (requiresWorkApproval !== engagement.requiresWorkApproval) patch.requiresWorkApproval = requiresWorkApproval
    if (fxPolicyCode !== (engagement.fxPolicyCode ?? '')) patch.fxPolicyCode = fxPolicyCode
    if (providerContractId !== (engagement.providerContractId ?? '')) patch.providerContractId = providerContractId
    if (providerWorkerId !== (engagement.providerWorkerId ?? '')) patch.providerWorkerId = providerWorkerId
    if (endDate !== (engagement.endDate ?? '')) patch.endDate = endDate

    return patch
  }, [
    engagement,
    paymentModel,
    bonusPolicy,
    requiresInvoice,
    requiresWorkApproval,
    fxPolicyCode,
    providerContractId,
    providerWorkerId,
    endDate
  ])

  const hasChanges = Object.keys(changedFields).length > 0

  const handleSave = async () => {
    if (!engagement || !hasChanges) {
      onClose()

      return
    }

    setSaveState('saving')
    setError(null)

    try {
      const response = await fetch(`/api/hr/contractors/${engagement.contractorEngagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...changedFields })
      })

      await throwIfNotOk(response, C.terms.saveError)

      setSaveState('saved')
      onSaved()
      window.setTimeout(() => {
        setSaveState('idle')
        onClose()
      }, 700)
    } catch (saveError) {
      setSaveState('idle')
      setError(saveError instanceof Error ? saveError.message : C.terms.saveError)
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 520 } } } }}>
      <Box role='dialog' aria-labelledby='terms-drawer-title' sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: { xs: 5, sm: 6 }, pb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
            <Stack spacing={1}>
              <Typography id='terms-drawer-title' variant='h5' sx={{ fontWeight: 700 }}>
                {C.terms.drawerTitle}
              </Typography>
              {engagement ? (
                <CustomChip round='true' size='small' variant='tonal' color='secondary' label={engagement.publicId} />
              ) : null}
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
              label={C.terms.paymentModelLabel}
              value={paymentModel}
              onChange={e => setPaymentModel(e.target.value as ContractorPaymentModel)}
            >
              {CONTRACTOR_PAYMENT_MODELS.map(o => (
                <MenuItem key={o} value={o}>
                  {paymentModelLabel(o)}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              select
              fullWidth
              label={C.terms.bonusPolicyLabel}
              value={bonusPolicy}
              onChange={e => setBonusPolicy(e.target.value as ContractorBonusPolicy)}
            >
              {CONTRACTOR_BONUS_POLICIES.map(o => (
                <MenuItem key={o} value={o}>
                  {bonusPolicyLabel(o)}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              fullWidth
              label={C.terms.fxPolicyLabel}
              placeholder={C.terms.fxPolicyPlaceholder}
              value={fxPolicyCode}
              onChange={e => setFxPolicyCode(e.target.value)}
            />

            <CustomTextField
              fullWidth
              label={C.terms.providerContractLabel}
              placeholder={C.terms.providerContractPlaceholder}
              value={providerContractId}
              onChange={e => setProviderContractId(e.target.value)}
            />

            <CustomTextField
              fullWidth
              label={C.terms.providerWorkerLabel}
              placeholder={C.terms.providerWorkerPlaceholder}
              value={providerWorkerId}
              onChange={e => setProviderWorkerId(e.target.value)}
            />

            <CustomTextField
              fullWidth
              type='date'
              label={C.terms.endDateLabel}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Stack spacing={1}>
              <FormControlLabel
                control={<Switch checked={requiresInvoice} onChange={() => setRequiresInvoice(v => !v)} />}
                label={C.terms.requiresInvoiceLabel}
              />
              <FormControlLabel
                control={<Switch checked={requiresWorkApproval} onChange={() => setRequiresWorkApproval(v => !v)} />}
                label={C.terms.requiresWorkApprovalLabel}
              />
            </Stack>

            {error ? (
              <Typography variant='caption' role='alert' sx={{ color: 'error.main', display: 'flex', gap: 1, alignItems: 'center' }}>
                <i className='tabler-alert-triangle' style={{ fontSize: 16 }} aria-hidden />
                {error}
              </Typography>
            ) : null}
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saveState !== 'idle'}>
            {C.terms.cancel}
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
            {saveState === 'saving' ? C.terms.saving : saveState === 'saved' ? C.terms.saved : C.terms.save}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default ContractorEngagementTermsDrawer
