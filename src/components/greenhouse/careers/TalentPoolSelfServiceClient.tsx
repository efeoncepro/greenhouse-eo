'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Paper from '@mui/material/Paper'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import { EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import type { CareersCopy, Locale } from '@/lib/copy'
import { formatDate } from '@/lib/format'
import type { TalentPoolLifecycle } from '@/lib/hiring/talent-pool/contracts'

export type TalentPoolPublicProfile = {
  talentProfileId: string
  lifecycleStatus: TalentPoolLifecycle
  futureConsentExpiresAt: string | null
  availability: string | null
  aggregateVersion: number
  access: {
    discoverable: boolean
    contactable: boolean
    allowedActions: string[]
    reasonCodes: string[]
  }
  receipts: Array<{
    receiptId: string | null
    purpose: string
    action: string
    occurredAt: string
    expiresAt: string | null
  }>
}

type ApiResponse = {
  ok: boolean
  code?: string
  message?: string
  receiptId?: string | null
  profile?: TalentPoolPublicProfile
}

interface TalentPoolSelfServiceClientProps {
  token: string
  copy: CareersCopy
  locale: Locale
  previewProfile?: TalentPoolPublicProfile
}

const statusPresentation = (profile: TalentPoolPublicProfile, copy: CareersCopy) => {
  const status = copy.talentPoolSelfService.status

  switch (profile.lifecycleStatus) {
    case 'pool_eligible':
      return { label: status.active, tone: 'success' as const, icon: 'tabler-circle-check' }
    case 'active_process':
      return { label: status.processOnly, tone: 'info' as const, icon: 'tabler-file-check' }
    case 'needs_reconsent':
      return { label: status.needsReconsent, tone: 'warning' as const, icon: 'tabler-mail-check' }
    case 'withdrawn':
      return { label: status.withdrawn, tone: 'default' as const, icon: 'tabler-user-off' }
    case 'expired':
      return { label: status.expired, tone: 'warning' as const, icon: 'tabler-clock-exclamation' }
    case 'paused':
      return { label: status.paused, tone: 'info' as const, icon: 'tabler-player-pause' }
  }
}

const messageForCode = (code: string | undefined, copy: CareersCopy) => {
  if (code === 'rate_limited') return copy.talentPoolSelfService.rateLimited
  if (code === 'talent_pool_conflict') return copy.talentPoolSelfService.conflict

  return copy.talentPoolSelfService.error
}

export const TalentPoolSelfServiceClient = ({
  token,
  copy,
  locale,
  previewProfile
}: TalentPoolSelfServiceClientProps) => {
  const t = copy.talentPoolSelfService
  const [profile, setProfile] = useState<TalentPoolPublicProfile | null>(previewProfile ?? null)
  const [loading, setLoading] = useState(!previewProfile)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'confirm' | 'availability' | 'withdraw' | null>(null)
  const [availability, setAvailability] = useState('')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [receipt, setReceipt] = useState<string | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/public/hiring/talent-profile/${encodeURIComponent(token)}`, {
        cache: 'no-store'
      })

      const body = (await response.json()) as ApiResponse

      if (!response.ok || !body.profile) {
        if (response.status === 404) setUnavailable(true)
        else setError(messageForCode(body.code, copy))

        return
      }

      setProfile(body.profile)
      setAvailability(body.profile.availability ?? '')
      setUnavailable(false)
    } catch {
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [copy, t.error, token])

  useEffect(() => {
    if (previewProfile) return
    void load()
  }, [load, previewProfile])

  const mutate = async (action: 'confirm' | 'availability' | 'withdraw') => {
    setPending(action)
    setError(null)

    try {
      const response = await fetch(`/api/public/hiring/talent-profile/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          availability: action === 'availability' ? availability : undefined,
          idempotencyKey: crypto.randomUUID()
        })
      })

      const body = (await response.json()) as ApiResponse

      if (!response.ok || !body.profile) {
        setError(messageForCode(body.code, copy))

        return
      }

      setProfile(body.profile)
      setAvailability(body.profile.availability ?? '')
      setReceipt(body.receiptId ?? null)
      setWithdrawOpen(false)
      requestAnimationFrame(() => receiptRef.current?.focus())
    } catch {
      setError(t.error)
    } finally {
      setPending(null)
    }
  }

  const formatExpiry = (value: string | null) =>
    value ? formatDate(value, { dateStyle: 'long', timeZone: 'UTC' }, locale) : t.noExpiry

  const latestReceipt = receipt
  const active = profile?.lifecycleStatus === 'pool_eligible'
  const canWithdraw = active || profile?.lifecycleStatus === 'paused'
  const status = profile ? statusPresentation(profile, copy) : null

  return (
    <Box sx={{ width: 'min(100% - 32px, 960px)', mx: 'auto', py: { xs: 6, md: 10 } }}>
      <Paper
        component='article'
        data-capture='talent-pool-status'
        data-surface-recipe='candidate-consent-self-service'
        data-ui-surface='contained'
        elevation={0}
        sx={theme => ({
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: `${theme.shape.customBorderRadius.display}px`,
          boxShadow: theme.greenhouseElevation.raised,
          backgroundColor: 'background.paper'
        })}
      >
        {loading ? (
          <Stack aria-label={t.loading} data-capture='talent-pool-loading' spacing={4} sx={{ p: { xs: 4, md: 7 } }}>
            <Skeleton variant='text' width='34%' />
            <Skeleton variant='text' width='78%' />
            <Skeleton variant='rounded' height={160} />
            <Skeleton variant='rounded' height={120} />
          </Stack>
        ) : unavailable ? (
          <Stack data-capture='talent-pool-unavailable' spacing={4} sx={{ p: { xs: 4, md: 7 }, maxWidth: '66ch' }}>
            <Box
              component='i'
              className='tabler-link-off'
              aria-hidden='true'
              sx={{ color: 'text.secondary', fontSize: 32 }}
            />
            <Typography component='h1' variant='h1'>
              {t.unavailableTitle}
            </Typography>
            <Typography variant='body1' color='text.secondary'>
              {t.unavailableBody}
            </Typography>
            <GreenhouseButton
              kind='navigation'
              component='a'
              href='/public/careers'
              leadingIconClassName='tabler-arrow-left'
            >
              {copy.header.backToJobs}
            </GreenhouseButton>
          </Stack>
        ) : profile && status ? (
          <>
            <Box
              sx={{
                p: { xs: 4, md: 7 },
                backgroundColor: 'action.hover',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Stack spacing={3} sx={{ maxWidth: '72ch' }}>
                <Typography variant='overline' color='text.secondary'>
                  {t.eyebrow}
                </Typography>
                <Typography component='h1' variant='h1'>
                  {t.title}
                </Typography>
                <Typography variant='body1' color='text.secondary'>
                  {t.intro}
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <GreenhouseChip
                    kind='status'
                    variant='label'
                    tone={status.tone}
                    iconClassName={status.icon}
                    label={status.label}
                  />
                  <Typography variant='caption' color='text.secondary'>
                    {t.expiryLabel}: {formatExpiry(profile.futureConsentExpiresAt)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            <Stack spacing={0}>
              <Box data-capture='talent-pool-purpose' sx={{ p: { xs: 4, md: 7 } }}>
                <Stack spacing={2} sx={{ maxWidth: '68ch' }}>
                  <Typography component='h2' variant='h5'>
                    {t.purposeTitle}
                  </Typography>
                  <Typography variant='body1' color='text.secondary'>
                    {t.purposeBody}
                  </Typography>
                </Stack>
                <Box component='ul' sx={{ listStyle: 'none', p: 0, m: 0, mt: 5 }}>
                  {t.ledger.map((item, index) => (
                    <Box
                      component='li'
                      key={item.title}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'auto minmax(0, 1fr)',
                        gap: 3,
                        py: 3,
                        borderTop: index === 0 ? '1px solid' : undefined,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box
                        component='i'
                        className={item.icon}
                        aria-hidden='true'
                        sx={{ color: 'primary.main', fontSize: 22, mt: 0.5 }}
                      />
                      <Box>
                        <Typography variant='h6'>{item.title}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {item.body}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Divider />

              <Box sx={{ p: { xs: 4, md: 7 } }}>
                <FormControl component='fieldset' fullWidth disabled={!active || pending !== null}>
                  <FormLabel component='legend'>
                    <Typography component='span' variant='h5'>
                      {t.availabilityTitle}
                    </Typography>
                  </FormLabel>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 3 }}>
                    {t.availabilityBody}
                  </Typography>
                  <RadioGroup value={availability} onChange={event => setAvailability(event.target.value)}>
                    {t.availabilityOptions.map(option => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio />}
                        sx={{ alignItems: 'flex-start', mx: 0, py: 1 }}
                        label={
                          <Box>
                            <Typography variant='body1'>{option.label}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {option.description}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>

              <Divider />

              <Box data-capture='talent-pool-primary-action' sx={{ p: { xs: 4, md: 7 } }}>
                {error ? (
                  <Alert severity='error' role='alert' sx={{ mb: 4 }}>
                    {error}
                  </Alert>
                ) : null}
                {latestReceipt ? (
                  <Alert ref={receiptRef} tabIndex={-1} severity='success' role='status' sx={{ mb: 4 }}>
                    {t.receiptPrefix}:{' '}
                    <Typography component='span' variant='monoId'>
                      {latestReceipt}
                    </Typography>
                  </Alert>
                ) : null}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  {active ? (
                    <GreenhouseButton
                      kind='primaryAction'
                      size='large'
                      disabled={!availability || pending !== null}
                      onClick={() => void mutate('availability')}
                      leadingIconClassName='tabler-device-floppy'
                    >
                      {pending === 'availability' ? t.updating : t.update}
                    </GreenhouseButton>
                  ) : profile.lifecycleStatus !== 'withdrawn' ? (
                    <GreenhouseButton
                      kind='primaryAction'
                      size='large'
                      disabled={pending !== null}
                      onClick={() => void mutate('confirm')}
                      leadingIconClassName='tabler-shield-check'
                    >
                      {pending === 'confirm' ? t.updating : t.confirm}
                    </GreenhouseButton>
                  ) : null}
                  {canWithdraw ? (
                    <GreenhouseButton
                      kind='inlineAction'
                      tone='error'
                      disabled={pending !== null}
                      onClick={() => setWithdrawOpen(true)}
                      leadingIconClassName='tabler-user-off'
                    >
                      {t.withdraw}
                    </GreenhouseButton>
                  ) : null}
                </Stack>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 4, maxWidth: '66ch' }}>
                  {t.privacy}{' '}
                  <Box
                    component='a'
                    href={`${EFEONCE_URL_HTTPS}/politica-de-privacidad/`}
                    target='_blank'
                    rel='noreferrer'
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: 24,
                      color: 'primary.main',
                      textDecoration: 'underline',
                      textUnderlineOffset: '0.2em'
                    }}
                  >
                    {copy.apply.consent.link}
                  </Box>
                </Typography>
              </Box>
            </Stack>
          </>
        ) : null}
      </Paper>

      <Box
        aria-live='polite'
        aria-atomic='true'
        role='status'
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          p: 0,
          m: '-1px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          border: 0,
          clip: 'rect(0, 0, 0, 0)',
          clipPath: 'inset(50%)'
        }}
      >
        {receipt ? `${t.receiptPrefix}: ${receipt}` : ''}
      </Box>

      <Dialog
        open={withdrawOpen}
        onClose={() => (pending ? undefined : setWithdrawOpen(false))}
        aria-labelledby='talent-pool-withdraw-title'
        aria-describedby='talent-pool-withdraw-description'
      >
        <DialogTitle id='talent-pool-withdraw-title'>{t.withdrawTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText id='talent-pool-withdraw-description'>{t.withdrawBody}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: 'stretch' }}>
          <GreenhouseButton kind='secondaryAction' disabled={pending !== null} onClick={() => setWithdrawOpen(false)}>
            {t.cancel}
          </GreenhouseButton>
          <GreenhouseButton
            kind='destructiveAction'
            disabled={pending !== null}
            onClick={() => void mutate('withdraw')}
          >
            {pending === 'withdraw' ? t.updating : t.withdrawConfirm}
          </GreenhouseButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
