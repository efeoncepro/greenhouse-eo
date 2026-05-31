'use client'

// TASK-968 Slice 3 — Agreed-amount guardrail panel (Finance surface C).
//
// Surfaces payables blocked by `payment_exceeds_agreed_amount` for the selected
// engagement and lets a Finance admin authorize a governed override (maker-checker,
// SoD vs the HR capability that SETS the amount). Promoted from the approved mockup
// surface C. The server enforces the capability + the gate regardless of this UI.

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import { OperationalPanel } from '@/components/greenhouse/primitives'
import { GH_CONTRACTOR_COMPENSATION as CC } from '@/lib/copy/contractor-compensation'
import { formatCurrency, type CurrencyCode } from '@/lib/format'
import { getMicrocopy } from '@/lib/copy'
import type { ContractorWorkbenchQueueRow } from '@/lib/contractor-engagements/projection-types'

const aria = getMicrocopy('es-CL').aria

interface BlockedPayable {
  contractorPayableId: string
  grossAmount: number
  currency: string
  readiness: { blockers?: { code: string; message: string }[] }
}

const EXCEEDS_CODE = 'payment_exceeds_agreed_amount'

const ContractorGuardrailPanel = ({
  row,
  onResolved
}: {
  row: ContractorWorkbenchQueueRow
  onResolved: () => void
}) => {
  const [loading, setLoading] = useState(true)
  const [breached, setBreached] = useState<BlockedPayable[]>([])
  const [dialogFor, setDialogFor] = useState<BlockedPayable | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const money = (n: number, currency: string) =>
    formatCurrency(n, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(
        `/api/finance/contractor-payables?engagementId=${encodeURIComponent(row.contractorEngagementId)}&status=blocked`,
        { cache: 'no-store' }
      )

      if (!res.ok) {
        setBreached([])

        return
      }

      const body = (await res.json().catch(() => null)) as { items?: BlockedPayable[] } | null

      const items = (body?.items ?? []).filter(p =>
        (p.readiness?.blockers ?? []).some(b => b.code === EXCEEDS_CODE)
      )

      setBreached(items)
    } finally {
      setLoading(false)
    }
  }, [row.contractorEngagementId])

  useEffect(() => {
    void load()
  }, [load])

  const confirmOverride = async () => {
    if (!dialogFor || reason.trim().length < 10) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/finance/contractor-payables/${encodeURIComponent(dialogFor.contractorPayableId)}/override-agreed-amount`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() })
        }
      )

      if (!res.ok) {
        setError(CC.guardrail.overrideError)

        return
      }

      setDialogFor(null)
      setReason('')
      await load()
      onResolved()
    } catch {
      setError(CC.guardrail.overrideError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <OperationalPanel
        title={CC.guardrail.panelTitle}
        subheader={CC.guardrail.panelSubheader}
        icon='tabler-shield-dollar'
        iconColor={breached.length > 0 ? 'error' : 'success'}
      >
        {loading ? (
          <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 1 }}>
            <CircularProgress size={18} />
          </Stack>
        ) : breached.length === 0 ? (
          <Alert severity='success' icon={<i className='tabler-circle-check' />}>
            {CC.guardrail.okDescription}
          </Alert>
        ) : (
          <Stack spacing={3}>
            {breached.map(p => {
              const agreed = row.agreedRate.rateAmount

              return (
                <Stack
                  key={p.contractorPayableId}
                  spacing={2}
                  sx={{
                    p: 4,
                    borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                    border: theme => `1px solid ${theme.palette.error.main}66`,
                    bgcolor: theme => `${theme.palette.error.main}0a`
                  }}
                >
                  <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      {CC.guardrail.breachTitle}
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      {`Pago ${money(p.grossAmount, p.currency)}`}
                      {agreed !== null ? ` · Acordado ${money(agreed, row.agreedRate.currency)}` : ''}
                    </Typography>
                  </Box>
                  <Box>
                    <Button
                      variant='tonal'
                      color='error'
                      startIcon={<i className='tabler-lock-open' />}
                      onClick={() => {
                        setDialogFor(p)
                        setReason('')
                        setError(null)
                      }}
                    >
                      {CC.guardrail.authorizeCta}
                    </Button>
                  </Box>
                </Stack>
              )
            })}
          </Stack>
        )}
      </OperationalPanel>

      <Dialog
        open={dialogFor !== null}
        onClose={() => setDialogFor(null)}
        maxWidth='xs'
        fullWidth
        aria-labelledby='guardrail-override-title'
      >
        <DialogTitle id='guardrail-override-title' sx={{ fontWeight: 600 }}>
          {CC.guardrail.overrideTitle}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {CC.guardrail.overrideIntro}
            </Typography>
            <CustomTextField
              label={CC.guardrail.reasonLabel}
              placeholder={CC.guardrail.reasonPlaceholder}
              value={reason}
              onChange={e => setReason(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              helperText={CC.guardrail.reasonHelper}
            />
            {error ? <Alert severity='error'>{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 5 }}>
          <Button
            variant='tonal'
            color='secondary'
            onClick={() => setDialogFor(null)}
            aria-label={aria.closeDrawer}
          >
            {CC.guardrail.cancel}
          </Button>
          <Button
            variant='contained'
            color='error'
            disabled={reason.trim().length < 10 || submitting}
            onClick={() => void confirmOverride()}
          >
            {submitting ? CC.guardrail.confirming : CC.guardrail.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ContractorGuardrailPanel
