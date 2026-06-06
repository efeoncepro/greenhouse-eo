'use client'

// React Imports
import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputBase from '@mui/material/InputBase'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, keyframes, styled, useTheme } from '@mui/material/styles'

// Third-party Imports
import classnames from 'classnames'
import { toast } from 'sonner'

// Type Imports
import type { SystemMode } from '@core/types'
import type { ComingSoonCopy } from '@/lib/copy/types'

// Component Imports
import CustomChip from '@core/components/mui/Chip'
import MiscPageEfeonceFooter from '@/components/greenhouse/brand/MiscPageEfeonceFooter'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

// Motion — lowest tier (CSS keyframes), reduced-motion safe (modern-ui).
const fadeRise = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`

const MaskImg = styled('img')({
  blockSize: 'auto',
  maxBlockSize: 320,
  inlineSize: '100%',
  position: 'absolute',
  insetBlockEnd: 0,
  zIndex: -1
})

const ContentStack = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'column',
  textAlign: 'center',
  inlineSize: '100%',
  maxInlineSize: 720,
  animation: `${fadeRise} 500ms ${theme.transitions.easing.easeOut} both`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
}))

const CharacterFade = styled('div')(({ theme }) => ({
  animation: `${fadeRise} 600ms ${theme.transitions.easing.easeOut} 140ms both`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
}))

const CharacterImg = styled('img')({
  display: 'block',
  animation: `${float} 6s ease-in-out 800ms infinite`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
})

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const pad2 = (n: number) => n.toString().padStart(2, '0')

interface Remaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  done: boolean
}

const computeRemaining = (launchMs: number): Remaining => {
  const diff = launchMs - Date.now()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  }

  const totalSeconds = Math.floor(diff / 1000)

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: false
  }
}

type SubmitState = 'idle' | 'submitting' | 'subscribed'

interface ComingSoonProps {
  mode: SystemMode
  copy: ComingSoonCopy
  locale: string
  launchAtIso: string
  redirectPath: string
  isPlaceholderLaunch: boolean
  viewerEmail: string | null
}

const ComingSoon = ({
  mode,
  copy,
  locale,
  launchAtIso,
  redirectPath,
  isPlaceholderLaunch,
  viewerEmail
}: ComingSoonProps) => {
  // Vars
  const darkImg = '/images/pages/misc-mask-dark.png'
  const lightImg = '/images/pages/misc-mask-light.png'
  const isAuthenticated = Boolean(viewerEmail)
  const inputId = useId()

  // Hooks
  const router = useRouter()
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const miscBackground = useImageVariant(mode, lightImg, darkImg)
  const launchMs = useMemo(() => new Date(launchAtIso).getTime(), [launchAtIso])

  // Countdown — mount-gated to avoid SSR/CSR hydration mismatch.
  const [mounted, setMounted] = useState(false)
  const [remaining, setRemaining] = useState<Remaining>(() => computeRemaining(launchMs))
  const [launched, setLaunched] = useState(false)

  useEffect(() => {
    if (isPlaceholderLaunch && process.env.NODE_ENV !== 'production') {
      console.warn('[coming-soon] Using placeholder launch date — set COMING_SOON_LAUNCH_AT in the env.')
    }

    setMounted(true)
    setRemaining(computeRemaining(launchMs))

    const id = window.setInterval(() => {
      const next = computeRemaining(launchMs)

      setRemaining(next)

      if (next.done) {
        window.clearInterval(id)
        setLaunched(true)
        router.replace(redirectPath)
      }
    }, 1000)

    return () => window.clearInterval(id)
  }, [launchMs, redirectPath, router, isPlaceholderLaunch])

  // Form. Authenticated users get a one-click "Notify me" (subscribes their
  // Greenhouse email — nothing to type, nothing redundant shown). The email
  // field is an edge case revealed on demand via `useAltEmail` ("prefer a
  // different email?"). Anonymous users always see the field (no account email).
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [useAltEmail, setUseAltEmail] = useState(false)
  const showEmailField = !isAuthenticated || useAltEmail

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const trimmed = email.trim()

      if (!isAuthenticated && !trimmed) {
        setEmailError(copy.invalidEmail)

        return
      }

      if (trimmed && !EMAIL_REGEX.test(trimmed)) {
        setEmailError(copy.invalidEmail)

        return
      }

      setEmailError(null)
      setSubmitState('submitting')

      try {
        const response = await fetch('/api/coming-soon/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed || undefined, locale })
        })

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; status?: string; code?: string }
          | null

        if (response.ok && payload?.ok) {
          setSubmitState('subscribed')
          toast.success(payload.status === 'already_subscribed' ? copy.alreadySubscribedToast : copy.successToast)

          return
        }

        if (payload?.code === 'invalid_email') {
          setEmailError(copy.invalidEmail)
          setSubmitState('idle')

          return
        }

        toast.error(copy.errorToast)
        setSubmitState('idle')
      } catch {
        toast.error(copy.errorToast)
        setSubmitState('idle')
      }
    },
    [email, isAuthenticated, locale, copy]
  )

  const countdownUnits = [
    { value: remaining.days, label: copy.countdownDays },
    { value: remaining.hours, label: copy.countdownHours },
    { value: remaining.minutes, label: copy.countdownMinutes },
    { value: remaining.seconds, label: copy.countdownSeconds }
  ]

  const countdownAriaLabel = mounted
    ? countdownUnits.map(unit => `${unit.value} ${unit.label}`).join(', ')
    : undefined

  const subscribed = submitState === 'subscribed'
  const hasError = Boolean(emailError)

  return (
    <main className='flex items-center justify-center min-bs-[100dvh] relative p-6 overflow-x-hidden'>
      <ContentStack>
        {/* Eyebrow */}
        <CustomChip
          label={copy.eyebrow}
          size='small'
          variant='tonal'
          color='primary'
          round='true'
          sx={{ mb: 3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
        />

        {/* Hero headline (Poppins via h-variant) */}
        <Typography
          variant='h2'
          component='h1'
          sx={{
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            textWrap: 'balance',
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            mb: 2
          }}
        >
          {copy.title}
        </Typography>
        <Typography
          variant='body1'
          color='text.secondary'
          sx={{ maxInlineSize: 600, lineHeight: 1.7, textWrap: 'balance', mb: 4 }}
        >
          {copy.description}
        </Typography>

        {/* Countdown */}
        <Box
          role='timer'
          aria-label={countdownAriaLabel}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, auto)' },
            gap: { xs: 3, sm: 3 },
            mb: 4,
            justifyContent: 'center',
            maxInlineSize: { xs: 320, sm: 'none' },
            marginInline: 'auto'
          }}
        >
          {countdownUnits.map(unit => (
            <Box
              key={unit.label}
              sx={{
                minInlineSize: { xs: 76, sm: 108 },
                px: { xs: 3, sm: 5 },
                py: { xs: 4, sm: 5 },
                borderRadius: theme => `${theme.shape.customBorderRadius.xl}px`,
                border: theme => `1px solid ${theme.palette.divider}`,
                backgroundColor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Typography
                component='span'
                aria-hidden={!mounted}
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 500,
                  lineHeight: 1,
                  fontSize: { xs: '2rem', sm: '2.75rem' },
                  color: 'text.primary'
                }}
              >
                {mounted ? pad2(unit.value) : '--'}
              </Typography>
              <Typography variant='overline' color='text.secondary' sx={{ lineHeight: 1.2 }}>
                {unit.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Capture / subscribed / launching */}
        <Box sx={{ inlineSize: '100%', maxInlineSize: 460, minBlockSize: 88 }}>
          {launched ? (
            <Typography color='text.secondary' role='status'>
              {copy.launching}
            </Typography>
          ) : subscribed ? (
            <Box role='status' sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <i
                className='tabler-circle-check-filled'
                style={{ fontSize: 24, color: theme.palette.success.main }}
                aria-hidden='true'
              />
              <Typography color='text.primary' sx={{ fontWeight: 500 }}>
                {copy.successToast}
              </Typography>
            </Box>
          ) : (
            <Box component='form' onSubmit={handleSubmit} noValidate>
              {showEmailField ? (
                <>
                  <Box
                    component='label'
                    htmlFor={inputId}
                    sx={{
                      position: 'absolute',
                      inlineSize: 1,
                      blockSize: 1,
                      padding: 0,
                      margin: -1,
                      overflow: 'hidden',
                      clip: 'rect(0 0 0 0)',
                      whiteSpace: 'nowrap',
                      border: 0
                    }}
                  >
                    {copy.emailLabel}
                  </Box>

                  {/* Cohesive pill: input + button share one rounded container */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      paddingInlineStart: 4,
                      paddingInlineEnd: 1,
                      py: 1,
                      backgroundColor: 'background.paper',
                      border: theme => `1px solid ${hasError ? theme.palette.error.main : theme.palette.divider}`,
                      borderRadius: 9999,
                      transition: theme => theme.transitions.create(['border-color', 'box-shadow'], { duration: 150 }),
                      '&:focus-within': {
                        borderColor: theme => (hasError ? theme.palette.error.main : theme.palette.primary.main),
                        boxShadow: theme =>
                          `0 0 0 3px ${alpha(hasError ? theme.palette.error.main : theme.palette.primary.main, 0.16)}`
                      }
                    }}
                  >
                    <InputBase
                      id={inputId}
                      type='email'
                      value={email}
                      autoFocus={useAltEmail}
                      onChange={event => {
                        setEmail(event.target.value)

                        if (emailError) {
                          setEmailError(null)
                        }
                      }}
                      disabled={submitState !== 'idle'}
                      placeholder={copy.emailPlaceholder}
                      inputProps={{
                        'aria-invalid': hasError,
                        'aria-describedby': hasError ? `${inputId}-error` : undefined,
                        autoComplete: 'email',
                        inputMode: 'email'
                      }}
                      sx={{ flex: 1, fontSize: '0.9375rem' }}
                    />
                    <Button
                      type='submit'
                      variant='contained'
                      disabled={submitState === 'submitting'}
                      sx={{ whiteSpace: 'nowrap', borderRadius: 9999, paddingInline: 5 }}
                    >
                      {submitState === 'submitting' ? copy.notifyCtaLoading : copy.notifyCta}
                    </Button>
                  </Box>

                  {hasError && (
                    <Typography
                      id={`${inputId}-error`}
                      role='alert'
                      variant='caption'
                      color='error.main'
                      sx={{ display: 'block', mt: 2, textAlign: 'start', paddingInlineStart: 4 }}
                    >
                      {emailError}
                    </Typography>
                  )}
                </>
              ) : (
                // Authenticated default: one-click notify (uses the session
                // Greenhouse email) + low-emphasis escape hatch for a different one.
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <Button
                    type='submit'
                    variant='contained'
                    size='large'
                    disabled={submitState === 'submitting'}
                    sx={{ borderRadius: 9999, paddingInline: 8, paddingBlock: 2.5 }}
                  >
                    {submitState === 'submitting' ? copy.notifyCtaLoading : copy.notifyCta}
                  </Button>
                  <Button
                    type='button'
                    variant='text'
                    color='secondary'
                    size='small'
                    onClick={() => setUseAltEmail(true)}
                    sx={{ textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >
                    {copy.useAnotherEmail}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Brand illustration (proprietary Efeonce character) */}
        <CharacterFade>
          <CharacterImg
            alt=''
            aria-hidden='true'
            src='/images/illustrations/characters/greenhouse-coming-soon.png'
            className='object-contain bs-[300px] md:bs-[380px] lg:bs-[440px] mbs-2 md:mbs-4'
          />
        </CharacterFade>
      </ContentStack>

      {!hidden && (
        <MaskImg
          alt=''
          aria-hidden='true'
          src={miscBackground}
          className={classnames({ 'scale-x-[-1]': theme.direction === 'rtl' })}
        />
      )}

      <MiscPageEfeonceFooter mode={mode} />
    </main>
  )
}

export default ComingSoon
