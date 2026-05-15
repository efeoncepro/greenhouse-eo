'use client'

import { useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Container from '@mui/material/Container'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import { GH_PERSON_RELATIONSHIP_DRIFT_RECONCILE } from '@/lib/copy/identity'

/**
 * TASK-891 Slice 4 — Form admin auditado para reconciliar drift Person 360.
 *
 * Surface: `/admin/identity/drift-reconciliation`. Operador EFEONCE_ADMIN llega
 * via deep link desde el reliability signal `identity.relationship.member_contract_drift`.
 *
 * Form fields (orden canonical UX):
 * 1. memberId (pre-llenado disabled si query param presente)
 * 2. contractorSubtype (Select: contractor | honorarios)
 * 3. reason (multiline minRows=4, >= 20 chars enforced)
 * 4. externalCloseDate (date, opcional)
 *
 * Submit POSTs a `/api/admin/person/relationships/[memberId]/reconcile-drift`.
 *
 * Spec: docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md §6
 */

const COPY = GH_PERSON_RELATIONSHIP_DRIFT_RECONCILE

const MIN_REASON_CHARS = 20

type ContractorSubtype = 'contractor' | 'honorarios'

type ReconcileSuccessPayload = {
  closedRelationshipId: string
  openedRelationshipId: string
  before: { relationshipType: string; status: string }
  after: { relationshipType: string; status: string; sourceOfTruth: string }
}

type ReconcileError = {
  code: keyof typeof COPY.errorMessages | string
  message: string
}

interface DriftReconciliationViewProps {
  prefilledMemberId: string
}

const DriftReconciliationView = ({ prefilledMemberId }: DriftReconciliationViewProps) => {
  const isPrefilled = prefilledMemberId.length > 0

  const [memberId, setMemberId] = useState(prefilledMemberId)
  const [contractorSubtype, setContractorSubtype] = useState<ContractorSubtype>('contractor')
  const [reason, setReason] = useState('')
  const [externalCloseDate, setExternalCloseDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<ReconcileSuccessPayload | null>(null)
  const [error, setError] = useState<ReconcileError | null>(null)

  const trimmedReason = reason.trim()
  const trimmedMemberId = memberId.trim()
  const canSubmit = trimmedMemberId.length > 0 && trimmedReason.length >= MIN_REASON_CHARS && !submitting

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `/api/admin/person/relationships/${encodeURIComponent(trimmedMemberId)}/reconcile-drift`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractorSubtype,
            reason: trimmedReason,
            externalCloseDate: externalCloseDate.trim() || null
          })
        }
      )

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

      if (!response.ok) {
        const code = typeof payload.code === 'string' ? payload.code : 'reconciliation_failed'

        const fallbackMessage =
          (code in COPY.errorMessages
            ? COPY.errorMessages[code as keyof typeof COPY.errorMessages]
            : typeof payload.error === 'string'
              ? payload.error
              : COPY.errorMessages.reconciliation_failed) ?? COPY.errorMessages.reconciliation_failed

        setError({ code, message: fallbackMessage })

        return
      }

      setSuccess(payload as unknown as ReconcileSuccessPayload)

      // Reset form post-success (keep memberId visible for context).
      setReason('')
      setExternalCloseDate('')
    } catch {
      setError({
        code: 'reconciliation_failed',
        message: COPY.errorMessages.reconciliation_failed
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth='md' sx={{ py: 6 }}>
      <Stack spacing={4}>
        {/* Breadcrumbs */}
        <Typography variant='body2' color='text.secondary'>
          {COPY.page.breadcrumbAdmin} · {COPY.page.breadcrumbOperations} · {COPY.page.breadcrumbCurrent}
        </Typography>

        {/* Warning banner up-front (honest UX) */}
        <Alert severity='warning' variant='outlined' role='alert'>
          <AlertTitle>{COPY.warningBanner.title}</AlertTitle>
          {COPY.warningBanner.body}
        </Alert>

        {/* Form card */}
        <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
          <CardHeader
            avatar={
              <CustomAvatar variant='rounded' skin='light' color='warning' size={42}>
                <i className={COPY.card.avatarIcon} aria-hidden />
              </CustomAvatar>
            }
            title={
              <Typography variant='h5' id='reconcile-title'>
                {COPY.card.title}
              </Typography>
            }
            subheader={
              <Typography variant='body2' color='text.secondary'>
                {COPY.card.subtitle}
              </Typography>
            }
          />
          <CardContent>
            <form aria-labelledby='reconcile-title' onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label={COPY.form.memberIdLabel}
                  placeholder={COPY.form.memberIdPlaceholder}
                  helperText={isPrefilled ? COPY.form.memberIdPrefilledHelper : COPY.form.memberIdHelper}
                  value={memberId}
                  onChange={event => setMemberId(event.target.value)}
                  disabled={isPrefilled || submitting}
                  required
                  fullWidth
                  slotProps={{ htmlInput: { 'aria-required': true } }}
                />

                <TextField
                  select
                  label={COPY.form.contractorSubtypeLabel}
                  helperText={COPY.form.contractorSubtypeHelper}
                  value={contractorSubtype}
                  onChange={event => setContractorSubtype(event.target.value as ContractorSubtype)}
                  disabled={submitting}
                  required
                  fullWidth
                >
                  <MenuItem value='contractor'>{COPY.form.contractorSubtypeOptions.contractor}</MenuItem>
                  <MenuItem value='honorarios'>{COPY.form.contractorSubtypeOptions.honorarios}</MenuItem>
                </TextField>

                <TextField
                  label={COPY.form.reasonLabel}
                  placeholder={COPY.form.reasonPlaceholder}
                  helperText={
                    reason.length > 0 && trimmedReason.length < MIN_REASON_CHARS
                      ? COPY.form.reasonError
                      : COPY.form.reasonHelper
                  }
                  error={reason.length > 0 && trimmedReason.length < MIN_REASON_CHARS}
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  disabled={submitting}
                  multiline
                  minRows={4}
                  required
                  fullWidth
                  slotProps={{ htmlInput: { 'aria-required': true } }}
                />

                <TextField
                  label={COPY.form.externalCloseDateLabel}
                  helperText={COPY.form.externalCloseDateHelper}
                  type='date'
                  value={externalCloseDate}
                  onChange={event => setExternalCloseDate(event.target.value)}
                  disabled={submitting}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                {error && (
                  <Alert severity='error' role='alert' variant='outlined'>
                    <AlertTitle>{COPY.result.errorTitleGeneric}</AlertTitle>
                    {error.message}
                  </Alert>
                )}

                {success && (
                  <Alert severity='success' role='alert' variant='outlined'>
                    <AlertTitle>{COPY.result.successTitle}</AlertTitle>
                    {COPY.result.successBody(success.closedRelationshipId, success.openedRelationshipId)}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    component={Link}
                    href={COPY.form.cancelHref}
                    variant='tonal'
                    color='secondary'
                    disabled={submitting}
                  >
                    {COPY.form.cancelButton}
                  </Button>
                  <Button type='submit' variant='contained' color='primary' disabled={!canSubmit}>
                    {submitting ? COPY.form.confirmSaving : COPY.form.confirmButton}
                  </Button>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}

export default DriftReconciliationView
