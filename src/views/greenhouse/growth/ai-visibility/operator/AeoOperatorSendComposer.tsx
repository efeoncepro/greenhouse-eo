'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import { CanonicalApiError, throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'

/**
 * TASK-1276 Slice 6 — Composer "Enviar informe + abrir oportunidad" (nodo S11, EPIC-020).
 *
 * Diseño aprobado: mockup Claude Design "AEO Operator View" (panel lateral compose → confirm →
 * sending → resultado). Cliente del command gobernado `sendAeoReportAndCreateLead` (TASK-1279) vía
 * `POST /api/admin/growth/ai-visibility/runs/[runId]/send-lead` — el loop es propose→confirm→execute:
 * el paso CONFIRM es la confirmación humana; el LLM/UI no muta nada fuera del endpoint.
 *
 * Contrato real que manda sobre el mockup: `leadType` y `legalBasis` se DERIVAN server-side (cliente →
 * expansión/relación de servicio; prospecto → new business/interés legítimo) — acá solo se MUESTRAN en
 * la confirmación. Prospecto exige `consentRef` (NUNCA cold send; el server 422 sin él). El envío real
 * es asíncrono (202 queued → email + Lead vía reactive consumer): el estado final honesto es "en
 * proceso", no "Lead creado" (no hay link al Lead en este punto).
 */

const S = GH_GROWTH_AEO_OPERATOR.send

export type AeoSendMotion = 'expansion' | 'new_business'

export interface AeoOperatorSendComposerProps {
  open: boolean
  onClose: () => void
  organizationId: string
  organizationName: string
  /** Run interno del informe a enviar; null = sin run (el CTA no debería abrir el composer). */
  runId: string | null
  motion: AeoSendMotion
  /** El run tiene snapshot público publicado (gate del server; acá solo informa la UI). */
  reportPublished: boolean
}

type Step =
  | { kind: 'compose' }
  | { kind: 'confirm' }
  | { kind: 'submitting' }
  | { kind: 'accepted'; idempotentHit: boolean }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const codeToMessage: Record<string, string> = {
  aeo_send_consent_required: S.errorConsent,
  aeo_send_report_unavailable: S.errorReportUnavailable,
  aeo_send_disabled: S.errorDisabled,
  aeo_send_invalid_input: S.errorInvalid
}

const AeoOperatorSendComposer = ({
  open,
  onClose,
  organizationId,
  organizationName,
  runId,
  motion,
  reportPublished
}: AeoOperatorSendComposerProps) => {
  const [step, setStep] = useState<Step>({ kind: 'compose' })
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [emailError, setEmailError] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentRef, setConsentRef] = useState('')
  const [consentMissing, setConsentMissing] = useState(false)
  const [error, setError] = useState<{ message: string; actionable: boolean } | null>(null)

  const isProspect = motion === 'new_business'

  const handleClose = () => {
    setStep({ kind: 'compose' })
    setError(null)
    setEmailError(false)
    setConsentMissing(false)
    onClose()
  }

  const handleContinue = () => {
    const emailOk = EMAIL_RE.test(email.trim())

    setEmailError(!emailOk)

    const consentOk = !isProspect || (consentChecked && consentRef.trim().length > 0)

    setConsentMissing(!consentOk)

    if (!emailOk || !consentOk) return

    setError(null)
    setStep({ kind: 'confirm' })
  }

  const handleConfirm = async () => {
    if (!runId) return

    setStep({ kind: 'submitting' })
    setError(null)

    try {
      const res = await fetch(`/api/admin/growth/ai-visibility/runs/${runId}/send-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          recipient: {
            email: email.trim(),
            ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
            ...(lastName.trim() ? { lastName: lastName.trim() } : {})
          },
          ...(isProspect && consentRef.trim() ? { consentRef: consentRef.trim() } : {})
        })
      })

      await throwIfNotOk(res, S.errorGeneric)

      const payload = (await res.json()) as { idempotentHit?: boolean }

      setStep({ kind: 'accepted', idempotentHit: payload.idempotentHit === true })
    } catch (err) {
      const message =
        err instanceof CanonicalApiError
          ? (err.code && codeToMessage[err.code]) || err.message || S.errorGeneric
          : S.errorGeneric

      const actionable = err instanceof CanonicalApiError ? err.actionable : true

      setError({ message, actionable })
      setStep({ kind: 'compose' })
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={handleClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 484 } } } }}>
      <Stack sx={{ height: '100%' }} role='dialog' aria-label={S.title}>
        <Stack
          direction='row'
          spacing={3}
          alignItems='flex-start'
          justifyContent='space-between'
          sx={theme => ({ p: 5, borderBottom: `1px solid ${theme.palette.divider}` })}
        >
          <Stack spacing={0.5}>
            <Typography variant='h5' component='h2'>
              {S.title}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {organizationName} · {S.motionLabel[motion]}
            </Typography>
          </Stack>
          <IconButton size='small' onClick={handleClose} aria-label={S.closeAria}>
            <i className='tabler-x' />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 5 }}>
          {step.kind === 'compose' ? (
            <Stack spacing={4}>
              <Chip
                variant='tonal'
                color={reportPublished ? 'success' : 'warning'}
                icon={<i className={reportPublished ? 'tabler-file-check' : 'tabler-file-alert'} />}
                label={reportPublished ? S.publishedBanner : S.notPublishedHint}
                sx={{ alignSelf: 'flex-start' }}
              />

              <CustomTextField
                fullWidth
                required
                type='email'
                label={S.emailLabel}
                placeholder={S.emailPlaceholder}
                value={email}
                error={emailError}
                helperText={emailError ? S.emailInvalid : undefined}
                onChange={e => {
                  setEmail(e.target.value)
                  if (emailError && EMAIL_RE.test(e.target.value.trim())) setEmailError(false)
                }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <CustomTextField
                  fullWidth
                  label={S.firstNameLabel}
                  placeholder={S.namePlaceholder}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
                <CustomTextField
                  fullWidth
                  label={S.lastNameLabel}
                  placeholder={S.namePlaceholder}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </Stack>

              {isProspect ? (
                <Box
                  sx={theme => ({
                    p: 4,
                    borderRadius: `${theme.shape.customBorderRadius.md}px`,
                    border: `1px solid ${consentMissing ? theme.palette.warning.main : theme.palette.divider}`,
                    backgroundColor: theme.palette.action.hover
                  })}
                >
                  <Stack spacing={2}>
                    <Stack direction='row' spacing={2} alignItems='flex-start'>
                      <i className='tabler-shield-check' aria-hidden='true' />
                      <Stack spacing={0.5}>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {S.consentTitle}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {S.consentBody}
                        </Typography>
                      </Stack>
                    </Stack>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={consentChecked}
                          onChange={e => setConsentChecked(e.target.checked)}
                        />
                      }
                      label={<Typography variant='body2'>{S.consentCheckbox}</Typography>}
                    />
                    {consentChecked ? (
                      <CustomTextField
                        fullWidth
                        required
                        label={S.consentRefLabel}
                        placeholder={S.consentRefPlaceholder}
                        value={consentRef}
                        onChange={e => {
                          setConsentRef(e.target.value)
                          if (consentMissing && e.target.value.trim()) setConsentMissing(false)
                        }}
                      />
                    ) : null}
                    {consentMissing ? (
                      <Typography variant='caption' color='warning.main' role='alert'>
                        {S.consentMissing}
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              ) : null}

              {error ? (
                <Typography variant='caption' color='error.main' role='alert'>
                  {error.message}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {step.kind === 'confirm' ? (
            <Stack spacing={4}>
              <Typography variant='h6' component='h3'>
                {S.confirmTitle}
              </Typography>
              <Box
                sx={theme => ({
                  p: 4,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  backgroundColor: theme.palette.action.hover
                })}
              >
                <Stack spacing={3}>
                  <Stack direction='row' spacing={2} alignItems='flex-start'>
                    <i className='tabler-mail' aria-hidden='true' />
                    <Typography variant='body2'>{S.confirmSend(organizationName, email.trim())}</Typography>
                  </Stack>
                  <Stack direction='row' spacing={2} alignItems='flex-start'>
                    <i className='tabler-briefcase' aria-hidden='true' />
                    <Typography variant='body2'>{S.confirmLead[motion]}</Typography>
                  </Stack>
                  <Stack direction='row' spacing={2} alignItems='flex-start'>
                    <i className='tabler-scale' aria-hidden='true' />
                    <Typography variant='body2'>{S.confirmLegal[motion]}</Typography>
                  </Stack>
                </Stack>
              </Box>
              <Typography variant='caption' color='text.secondary'>
                {S.confirmNote}
              </Typography>
            </Stack>
          ) : null}

          {step.kind === 'submitting' ? (
            <Stack spacing={4} alignItems='center' sx={{ py: 12 }} aria-live='polite'>
              <CircularProgress size={34} />
              <Typography variant='body2' color='text.secondary'>
                {S.sending}
              </Typography>
            </Stack>
          ) : null}

          {step.kind === 'accepted' ? (
            <Stack spacing={4} alignItems='center' sx={{ py: 8, textAlign: 'center' }} aria-live='polite'>
              <CustomAvatar skin='light' color='success' size={60}>
                <i className='tabler-circle-check' style={{ fontSize: 30 }} />
              </CustomAvatar>
              <Typography variant='h6' component='h3'>
                {S.acceptedTitle}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: '42ch' }}>
                {S.acceptedBody(email.trim())}
              </Typography>
              {step.idempotentHit ? (
                <Typography variant='caption' color='text.secondary'>
                  {S.idempotentHint}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </Box>

        <Stack
          direction='row'
          spacing={3}
          justifyContent='flex-end'
          sx={theme => ({ p: 4, borderTop: `1px solid ${theme.palette.divider}` })}
        >
          {step.kind === 'compose' ? (
            <>
              <Button variant='outlined' color='secondary' onClick={handleClose}>
                {S.cancelCta}
              </Button>
              <Button variant='contained' endIcon={<i className='tabler-arrow-right' />} onClick={handleContinue}>
                {S.continueCta}
              </Button>
            </>
          ) : null}
          {step.kind === 'confirm' ? (
            <>
              <Button variant='outlined' color='secondary' onClick={() => setStep({ kind: 'compose' })}>
                {S.backCta}
              </Button>
              <Button variant='contained' startIcon={<i className='tabler-send' />} onClick={handleConfirm}>
                {S.confirmCta}
              </Button>
            </>
          ) : null}
          {step.kind === 'accepted' ? (
            <Button variant='contained' onClick={handleClose}>
              {S.closeCta}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default AeoOperatorSendComposer
