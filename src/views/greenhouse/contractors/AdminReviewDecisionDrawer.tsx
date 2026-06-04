'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import ContractorSupportDocumentsPanel from '@/components/greenhouse/contractors/ContractorSupportDocumentsPanel'
import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { formatCurrency } from '@/lib/format'
import type { CurrencyCode } from '@/lib/format'
import type { ContractorWorkbenchQueueRow } from '@/lib/contractor-engagements/projection-types'
import type { ContractorSupportDocumentsBundle } from '@/lib/contractor-engagements/support-documents/types'
import type { ContractorWorkSubmission } from '@/lib/contractor-engagements/work-submissions/types'

export type ReviewDecision = 'approve' | 'dispute' | 'reject'

const GREENHOUSE_COPY = getMicrocopy()

const MIN_REASON_LENGTH = 10

// Domain-specific aria-label (no shared `aria` namespace key fits this control).
const REVIEW_DECISION_ARIA_LABEL = 'Decisión de revisión'

interface AdminReviewDecisionDrawerProps {
  open: boolean
  queueRow: ContractorWorkbenchQueueRow | null
  initialDecision: ReviewDecision
  onClose: () => void
  onReviewed: () => void
}

const decisionCopy: Record<
  ReviewDecision,
  { title: string; cta: string; tone: 'success' | 'warning' | 'error'; icon: string }
> = {
  approve: { title: 'Aprobar envío', cta: 'Aprobar envío', tone: 'success', icon: 'tabler-check' },
  dispute: { title: 'Disputar envío', cta: 'Enviar observación', tone: 'warning', icon: 'tabler-message-report' },
  reject: { title: 'Rechazar envío', cta: 'Rechazar envío', tone: 'error', icon: 'tabler-x' }
}

const formatSubmissionAmount = (amount: number | null, currency: string | null) => {
  if (amount === null) return 'Sin monto'

  return formatCurrency(amount, (currency ?? 'CLP') as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')
}

const formatPeriod = (start: string | null, end: string | null) => {
  if (start && end) return `${start} — ${end}`

  return start ?? end ?? 'Sin periodo declarado'
}

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction='row' justifyContent='space-between' spacing={3}>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600, textAlign: 'right' }}>
      {value}
    </Typography>
  </Stack>
)

const AdminReviewDecisionDrawer = ({
  open,
  queueRow,
  initialDecision,
  onClose,
  onReviewed
}: AdminReviewDecisionDrawerProps) => {
  const [decision, setDecision] = useState<ReviewDecision>(initialDecision)
  const [loading, setLoading] = useState(false)
  const [submission, setSubmission] = useState<ContractorWorkSubmission | null>(null)
  const [supportBundle, setSupportBundle] = useState<ContractorSupportDocumentsBundle | null>(null)
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportError, setSupportError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submissionRequestIdRef = useRef(0)
  const supportRequestIdRef = useRef(0)

  const copy = decisionCopy[decision]
  const requiresReason = decision !== 'approve'
  const reasonTooShort = requiresReason && reason.trim().length < MIN_REASON_LENGTH

  const loadSupportDocuments = useCallback(async (engagementId: string, submissionId?: string | null) => {
    const requestId = supportRequestIdRef.current + 1

    supportRequestIdRef.current = requestId
    setSupportLoading(true)
    setSupportError(null)
    setSupportBundle(null)

    try {
      const params = submissionId ? `?contractorWorkSubmissionId=${encodeURIComponent(submissionId)}` : ''

      const response = await fetch(`/api/hr/contractors/${encodeURIComponent(engagementId)}/support-documents${params}`, {
        cache: 'no-store'
      })

      if (!response.ok) throw new Error('load_failed')

      const payload = (await response.json().catch(() => null)) as ContractorSupportDocumentsBundle | null

      if (!payload?.contractorEngagementId) throw new Error('load_failed')

      if (supportRequestIdRef.current === requestId) {
        setSupportBundle(payload)
      }
    } catch {
      if (supportRequestIdRef.current === requestId) {
        setSupportError(C.supportDocuments.loadError)
      }
    } finally {
      if (supportRequestIdRef.current === requestId) {
        setSupportLoading(false)
      }
    }
  }, [])

  const loadSubmission = useCallback(async (engagementId: string) => {
    const requestId = submissionRequestIdRef.current + 1

    submissionRequestIdRef.current = requestId
    setLoading(true)
    setError(null)
    setSubmission(null)

    try {
      // Find the actionable work submission for this engagement. Submitted first;
      // disputed as a fallback (an already-disputed submission can still be
      // approved or rejected once the contractor responds).
      const params = `contractorEngagementId=${encodeURIComponent(engagementId)}`

      const [submittedRes, disputedRes] = await Promise.all([
        fetch(`/api/hr/contractors/work-submissions?${params}&status=submitted`, { cache: 'no-store' }),
        fetch(`/api/hr/contractors/work-submissions?${params}&status=disputed`, { cache: 'no-store' })
      ])

      const submitted = submittedRes.ok
        ? ((await submittedRes.json().catch(() => null)) as { items?: ContractorWorkSubmission[] } | null)?.items ?? []
        : []

      const disputed = disputedRes.ok
        ? ((await disputedRes.json().catch(() => null)) as { items?: ContractorWorkSubmission[] } | null)?.items ?? []
        : []

      // Most recent submitted/disputed submission by submittedAt (newest first).
      const candidates = [...submitted, ...disputed].sort((a, b) =>
        (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt)
      )

      const nextSubmission = candidates[0] ?? null

      if (submissionRequestIdRef.current === requestId) {
        setSubmission(nextSubmission)
        void loadSupportDocuments(engagementId, nextSubmission?.contractorWorkSubmissionId ?? null)
      }
    } catch {
      if (submissionRequestIdRef.current === requestId) {
        setError('No pudimos cargar el envío de este caso. Intenta de nuevo.')
      }
    } finally {
      if (submissionRequestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [loadSupportDocuments])

  useEffect(() => {
    if (!open || !queueRow) return

    setDecision(initialDecision)
    setReason('')
    setError(null)
    setSupportError(null)
    setSupportBundle(null)
    void loadSubmission(queueRow.contractorEngagementId)

    return () => {
      submissionRequestIdRef.current += 1
      supportRequestIdRef.current += 1
    }
  }, [open, queueRow, initialDecision, loadSubmission])

  const handleConfirm = async () => {
    if (!submission || reasonTooShort) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/hr/contractors/work-submissions/${submission.contractorWorkSubmissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: decision,
          reason: requiresReason ? reason.trim() : undefined
        })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null

        throw new Error(payload?.error || 'No pudimos registrar la decisión. Intenta de nuevo.')
      }

      onReviewed()
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'No pudimos registrar la decisión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 600, lg: 680 } } }}
    >
      <Stack spacing={0} sx={{ minHeight: '100%' }} data-capture='admin-review-decision-drawer'>
        <Stack spacing={2.5} sx={{ p: 6 }}>
          <Stack direction='row' justifyContent='space-between' spacing={3} alignItems='flex-start'>
            <Box>
              <Typography variant='h5'>{submission ? copy.title : 'Revisar caso'}</Typography>
              <Typography variant='body2' color='text.secondary'>
                Decide sobre la evidencia operacional. Esta acción no ejecuta el pago.
              </Typography>
            </Box>
            <Button variant='text' color='secondary' onClick={onClose} startIcon={<i className='tabler-x' />}>
              {GREENHOUSE_COPY.actions.close}
            </Button>
          </Stack>

          <Alert severity='info' icon={<i className='tabler-building-bank' />}>
            Aprobar habilita la preparación del contractor payable. Finance crea la obligación después de la preparación.
          </Alert>
        </Stack>

        <Divider />

        <Stack spacing={5} sx={{ p: 6, flex: 1, overflowY: 'auto' }}>
          {queueRow ? (
            <Stack
              spacing={2}
              sx={theme => ({
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                p: 4
              })}
            >
              <SummaryRow label='Contractor' value={queueRow.contractorName} />
              <SummaryRow label='Engagement' value={queueRow.engagementPublicId} />
              <SummaryRow
                label='Periodo'
                value={submission ? formatPeriod(submission.servicePeriodStart, submission.servicePeriodEnd) : '—'}
              />
              <SummaryRow
                label='Monto'
                value={submission ? formatSubmissionAmount(submission.grossAmount, submission.currency) : '—'}
              />
            </Stack>
          ) : null}

          {queueRow ? (
            <ContractorSupportDocumentsPanel
              bundle={supportBundle}
              loading={supportLoading}
              error={supportError}
              onRetry={() =>
                void loadSupportDocuments(queueRow.contractorEngagementId, submission?.contractorWorkSubmissionId ?? null)
              }
            />
          ) : null}

          {loading ? (
            <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 4 }} role='status'>
              <CircularProgress size={20} />
              <Typography variant='body2' color='text.secondary'>
                Cargando el envío del caso...
              </Typography>
            </Stack>
          ) : submission ? (
            <>
              <Stack spacing={2}>
                <Typography variant='subtitle1'>Decisión</Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  color='primary'
                  value={decision}
                  aria-label={REVIEW_DECISION_ARIA_LABEL}
                  onChange={(_, value: ReviewDecision | null) => {
                    if (value) {
                      setDecision(value)
                      setError(null)
                    }
                  }}
                >
                  <ToggleButton value='approve'>Aprobar</ToggleButton>
                  <ToggleButton value='dispute'>Disputar</ToggleButton>
                  <ToggleButton value='reject'>Rechazar</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Stack spacing={2}>
                <Typography variant='subtitle1'>Estado del pago</Typography>
                <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  <CustomChip round='true' size='small' variant='tonal' color='secondary' label='Pago no ejecutado' />
                  <CustomChip
                    round='true'
                    size='small'
                    variant='tonal'
                    color='info'
                    label='Finance crea la obligación'
                  />
                </Stack>
              </Stack>

              {requiresReason ? (
                <CustomTextField
                  fullWidth
                  multiline
                  minRows={4}
                  label='Motivo visible para el contractor'
                  placeholder='Explica con claridad qué falta o por qué se rechaza. El contractor verá este mensaje.'
                  helperText={
                    reasonTooShort
                      ? `Escribe al menos ${MIN_REASON_LENGTH} caracteres. El contractor leerá este motivo.`
                      : 'Este motivo es visible para el contractor.'
                  }
                  error={reason.length > 0 && reasonTooShort}
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                />
              ) : (
                <Alert severity='success' icon={<i className='tabler-check' />}>
                  El envío queda aprobado operacionalmente. El payable aún debe pasar los gates de tax, FX y cuenta de pago.
                </Alert>
              )}

              {error ? (
                <Alert severity='error' icon={<i className='tabler-alert-triangle' />} role='alert'>
                  {error}
                </Alert>
              ) : null}
            </>
          ) : (
            // V1 boundary: no actionable work submission exists for this engagement
            // (e.g. the case is blocked at the payable level, not the submission).
            // We do NOT offer approve/dispute/reject here — the blocker is resolved
            // on the Finance/payable side via /finance/contractor-payables (TASK-793).
            <Alert severity='info' icon={<i className='tabler-building-bank' />} role='status'>
              Este caso no tiene un envío de trabajo en revisión. Si está bloqueado, la preparación se resuelve en el
              payable desde Finance, no desde esta revisión.
            </Alert>
          )}
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end' sx={{ p: 6 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
            {GREENHOUSE_COPY.actions.cancel}
          </Button>
          {submission ? (
            <Button
              variant='contained'
              color={copy.tone}
              startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className={copy.icon} />}
              disabled={submitting || reasonTooShort}
              onClick={handleConfirm}
            >
              {copy.cta}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default AdminReviewDecisionDrawer
