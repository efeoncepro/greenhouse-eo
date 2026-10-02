'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'

import type { SystemMode } from '@core/types'

import Link from '@components/Link'
import CustomTextField from '@core/components/mui/TextField'

import OrbitLoader from '@/components/greenhouse/motion/OrbitLoader'
import { ORBIT_TOKENS } from '@/components/greenhouse/motion/orbit-geometry'
import { GH_MESSAGES } from '@/lib/copy/client-portal'
import { email as emailRule, required } from '@/lib/forms/greenhouse-form-patterns'
import { startViewTransition } from '@/lib/motion/view-transition'
import type { LoginAnnouncementDto, LoginAnnouncementLens } from '@/lib/login-announcements/types'
import LoginAccessTransition, { LOGIN_ACCESS_TRANSITION_MS } from '@/views/login/LoginAccessTransition'
import LoginStage from '@/views/login/LoginStage'
import { LOGIN_STAGE_BREAKPOINT, LOGIN_STAGE_FALLBACK } from '@/views/login/login-constants'

/**
 * TASK-1964 — Login V4 premium («La órbita»), aprobado por el operador el 2026-10-02.
 *
 * Formulario sobre papel con Efeonce como marca principal y Greenhouse como sello al pie; escenario fotográfico con la
 * Lente y las novedades de TASK-1963. Conserva toda la lógica de acceso anterior: SSO Microsoft/Google con sondeo de
 * salud (TASK-742), credenciales, link mágico, olvido de contraseña y `redirectTo` seguro.
 */

type LoginFormValues = {
  email: string
  password: string
}

const mapAuthError = (error: string): string => {
  if (error === 'CredentialsSignin') return GH_MESSAGES.login_error_credentials
  if (error === 'AccessDenied') return GH_MESSAGES.login_error_account_disabled
  if (error === 'SessionRequired') return GH_MESSAGES.login_error_session_expired
  if (error.includes('fetch') || error.includes('network') || error.includes('ECONNREFUSED'))
    return GH_MESSAGES.login_error_network

  return GH_MESSAGES.login_error_credentials
}

const getErrorSeverity = (error: string): 'error' | 'warning' => {
  if (error === GH_MESSAGES.login_error_network) return 'warning'
  if (error === GH_MESSAGES.login_error_provider_unavailable) return 'warning'

  return 'error'
}

type ProviderStatus = 'ready' | 'degraded' | 'unconfigured' | 'unknown'

const { color } = ORBIT_TOKENS

const ssoButtonSx = {
  height: 50,
  borderRadius: (theme: Theme) => `${theme.shape.customBorderRadius.xl}px`,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: color.navy,
  typography: 'body2',
  fontWeight: 500,
  textTransform: 'none',
  gap: 1.5,
  '&:hover': { bgcolor: 'background.paper', borderColor: alpha(color.navy, 0.35) },
  '&.Mui-disabled': {
    bgcolor: 'background.paper',
    borderColor: 'divider',
    color: 'text.disabled',
    '& img': { opacity: 0.45, filter: 'grayscale(1)' }
  }
} as const

const fieldSx = (theme: Theme) => ({
  '& .MuiInputLabel-root': { color: color.navy, fontWeight: 500 },
  '& .MuiOutlinedInput-root': {
    borderRadius: `${theme.shape.customBorderRadius.xl}px`,
    bgcolor: 'background.paper',
    minHeight: 50
  }
})

const year = new Date().getFullYear()

/**
 * Aviso discreto bajo un proveedor (no configurado o degradado). El texto va en `text.secondary` (≥ 4.5:1 sobre
 * papel); el color de severidad sólo pinta el ícono, que es gráfico (`Alert` estándar del theme pinta el texto de
 * advertencia con `warning.main`, 1.5:1 sobre el papel del login).
 */
const ProviderNotice = ({ severity, children }: { severity: 'info' | 'warning'; children: string }) => (
  <Stack direction='row' spacing={1} role='status' sx={{ px: 0.5, alignItems: 'flex-start' }}>
    <Box
      component='i'
      aria-hidden='true'
      className={severity === 'warning' ? 'tabler-alert-triangle' : 'tabler-info-circle'}
      sx={{ flexShrink: 0, mt: 0.25, fontSize: '1rem', color: severity === 'warning' ? 'warning.dark' : 'info.main' }}
    />
    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
      {children}
    </Typography>
  </Stack>
)

/** Enlaces sueltos del formulario: área táctil ≥ 24 px (WCAG 2.5.8). */
const standaloneLinkStyle = { display: 'inline-flex', alignItems: 'center', minHeight: 24 } as const

const Login = ({
  hasMicrosoftAuth,
  hasGoogleAuth,
  announcements
}: {
  mode: SystemMode
  hasMicrosoftAuth: boolean
  hasGoogleAuth: boolean
  announcements: LoginAnnouncementDto[]
}) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [error, setError] = useState('')
  const [ssoLoading, setSsoLoading] = useState<'microsoft' | 'google' | null>(null)
  const [transitionOrigin, setTransitionOrigin] = useState<{ x: number; y: number } | null>(null)
  const activeLensRef = useRef<LoginAnnouncementLens | null>(announcements[0]?.lens ?? LOGIN_STAGE_FALLBACK.lens)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const submitRef = useRef<HTMLButtonElement | null>(null)
  const errorRef = useRef<HTMLDivElement | null>(null)

  const [providerReadiness, setProviderReadiness] = useState<{ microsoft: ProviderStatus; google: ProviderStatus }>({
    microsoft: 'unknown',
    google: 'unknown'
  })

  const router = useRouter()
  const searchParams = useSearchParams()

  // TASK-742 Capa 2 — sondeo vivo de proveedores (cache 30 s en servidor): oculta/deshabilita un proveedor cuyo
  // secreto o discovery falló, para que nadie termine en el opaco `error=Callback`.
  useEffect(() => {
    let cancelled = false

    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/auth/health', { cache: 'no-store' })

        if (!response.ok || cancelled) return

        const snap = await response.json()
        const azure = snap.providers?.find((p: { provider: string }) => p.provider === 'azure-ad')
        const google = snap.providers?.find((p: { provider: string }) => p.provider === 'google')

        if (cancelled) return

        setProviderReadiness({ microsoft: azure?.status ?? 'unknown', google: google?.status ?? 'unknown' })
      } catch {
        // El sondeo no bloquea: los botones caen a los flags de entorno.
      }
    }

    fetchHealth()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const isMicrosoftDegraded = providerReadiness.microsoft === 'degraded'
  const isGoogleDegraded = providerReadiness.google === 'degraded'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({ defaultValues: { email: '', password: '' } })

  const isTransitioning = transitionOrigin !== null
  const isAnyLoading = isSubmitting || ssoLoading !== null || isTransitioning

  const resolveSafeCallbackUrl = () => {
    const redirectTo = searchParams.get('redirectTo')?.trim()

    if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) return redirectTo

    return '/auth/landing'
  }

  /** Centro de la lente activa en la ventana (desktop) o el botón Entrar (móvil): de ahí se abre el acceso. */
  const resolveTransitionOrigin = useCallback(() => {
    const stage = stageRef.current?.firstElementChild as HTMLElement | null | undefined
    const lens = activeLensRef.current

    if (stage && lens && stage.offsetParent !== null) {
      const rect = stage.getBoundingClientRect()

      return { x: rect.left + (rect.width * lens.x) / 100, y: rect.top + (rect.height * lens.y) / 100 }
    }

    const button = submitRef.current?.getBoundingClientRect()

    return button
      ? { x: button.left + button.width / 2, y: button.top + button.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }, [])

  const onSubmit = handleSubmit(async values => {
    setError('')
    const callbackUrl = resolveSafeCallbackUrl()

    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl
      })

      if (result?.error) {
        setError(mapAuthError(result.error))

        return
      }

      // «La lente te lleva adentro»: la lente se abre hacia el espacio de trabajo y después cambia la ruta.
      setTransitionOrigin(resolveTransitionOrigin())
      window.setTimeout(() => {
        void startViewTransition(() => {
          router.replace(callbackUrl)
        })
        router.refresh()
      }, LOGIN_ACCESS_TRANSITION_MS)
    } catch {
      setError(GH_MESSAGES.login_error_network)
    }
  })

  const handleProviderSignIn = async (provider: 'microsoft' | 'google') => {
    setError('')
    setSsoLoading(provider)

    try {
      await signIn(provider === 'microsoft' ? 'azure-ad' : 'google', { callbackUrl: resolveSafeCallbackUrl() })
    } catch {
      setSsoLoading(null)
      setError(GH_MESSAGES.login_error_provider_unavailable)
    }
  }

  const handleActiveLensChange = useCallback((lens: LoginAnnouncementLens | null) => {
    activeLensRef.current = lens
  }, [])

  const bpUp = `@media (min-width: ${LOGIN_STAGE_BREAKPOINT}px)`
  const linkStyle = isAnyLoading ? { ...standaloneLinkStyle, pointerEvents: 'none' as const, opacity: 0.5 } : standaloneLinkStyle

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: color.paper, color: color.navy }}>
      <Box
        component='main'
        sx={{
          flex: '1 1 440px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: { xs: 3, sm: 6, lg: 7 },
          pt: 12,
          pb: 4,
          [bpUp]: { maxWidth: 620, pt: 6 }
        }}
      >
        <Box data-capture='login-form' sx={{ width: '100%', maxWidth: 380, [bpUp]: { my: 'auto', py: 6 } }}>
          <Stack spacing={2.75} alignItems='center' sx={{ mb: 4.5, textAlign: 'center' }}>
            <Box
              component='img'
              src='/branding/logo-full.svg'
              alt='Efeonce'
              sx={{ width: 156, height: 'auto', [bpUp]: { width: 180 } }}
            />
            <Typography component='h1' variant='body1' sx={{ color: 'text.secondary' }}>
              {GH_MESSAGES.login_heading}
            </Typography>
          </Stack>

          <Stack spacing={3.5}>
            {error ? (
              <Alert
                ref={errorRef}
                tabIndex={-1}
                severity={getErrorSeverity(error)}
                onClose={() => setError('')}
                // El texto del `Alert` estándar del theme queda bajo 4.5:1 sobre el papel; la severidad la lleva el ícono.
                sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
              >
                {error}
              </Alert>
            ) : null}

            <Stack spacing={1.25}>
              <Button
                fullWidth
                variant='outlined'
                onClick={() => handleProviderSignIn('microsoft')}
                disabled={!hasMicrosoftAuth || isMicrosoftDegraded || isAnyLoading}
                startIcon={
                  ssoLoading === 'microsoft' ? (
                    <OrbitLoader size='sm' tone='light' />
                  ) : (
                    <Box component='img' src='/images/greenhouse/SVG/icon-microsoft.svg' alt='' sx={{ width: 18, height: 18 }} />
                  )
                }
                sx={ssoButtonSx}
              >
                {ssoLoading === 'microsoft' ? GH_MESSAGES.login_redirecting_microsoft : GH_MESSAGES.login_with_microsoft}
              </Button>
              {!hasMicrosoftAuth ? (
                <ProviderNotice severity='info'>{GH_MESSAGES.login_microsoft_unavailable}</ProviderNotice>
              ) : isMicrosoftDegraded ? (
                <ProviderNotice severity='warning'>{GH_MESSAGES.login_microsoft_degraded}</ProviderNotice>
              ) : null}

              <Button
                fullWidth
                variant='outlined'
                onClick={() => handleProviderSignIn('google')}
                disabled={!hasGoogleAuth || isGoogleDegraded || isAnyLoading}
                startIcon={
                  ssoLoading === 'google' ? (
                    <OrbitLoader size='sm' tone='light' />
                  ) : (
                    <Box component='img' src='/images/greenhouse/SVG/icon-google.svg' alt='' sx={{ width: 18, height: 18 }} />
                  )
                }
                sx={ssoButtonSx}
              >
                {ssoLoading === 'google' ? GH_MESSAGES.login_redirecting_google : GH_MESSAGES.login_with_google}
              </Button>
              {!hasGoogleAuth ? (
                <ProviderNotice severity='info'>{GH_MESSAGES.login_google_unavailable}</ProviderNotice>
              ) : isGoogleDegraded ? (
                <ProviderNotice severity='warning'>{GH_MESSAGES.login_google_degraded}</ProviderNotice>
              ) : null}
            </Stack>

            <Divider sx={{ typography: 'caption', color: 'text.secondary' }}>{GH_MESSAGES.login_divider_email}</Divider>

            <form noValidate autoComplete='on' onSubmit={onSubmit}>
              <Stack spacing={2}>
                <CustomTextField
                  fullWidth
                  type='email'
                  autoComplete='email'
                  disabled={isAnyLoading}
                  label={GH_MESSAGES.login_email_label}
                  placeholder={GH_MESSAGES.login_email_placeholder}
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  sx={fieldSx}
                  {...register('email', { validate: { required: required('Email'), email: emailRule } })}
                />
                <CustomTextField
                  fullWidth
                  autoComplete='current-password'
                  disabled={isAnyLoading}
                  label={GH_MESSAGES.login_password_label}
                  placeholder={GH_MESSAGES.login_password_placeholder}
                  type={isPasswordShown ? 'text' : 'password'}
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                  sx={fieldSx}
                  {...register('password', { validate: { required: required('Contraseña') } })}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            edge='end'
                            onClick={() => setIsPasswordShown(show => !show)}
                            onMouseDown={event => event.preventDefault()}
                            aria-label={isPasswordShown ? GH_MESSAGES.login_hide_password : GH_MESSAGES.login_show_password}
                            disabled={isAnyLoading}
                          >
                            <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} aria-hidden='true' />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
                <Box sx={{ textAlign: 'right', mt: -0.5 }}>
                  <Link href='/auth/forgot-password' style={linkStyle} tabIndex={isAnyLoading ? -1 : undefined}>
                    <Typography component='span' variant='body2' sx={{ color: 'text.secondary', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                      {GH_MESSAGES.login_forgot_password}
                    </Typography>
                  </Link>
                </Box>
                <Button
                  ref={submitRef}
                  fullWidth
                  type='submit'
                  variant='contained'
                  disabled={isAnyLoading && !isSubmitting && !isTransitioning}
                  aria-busy={isSubmitting || isTransitioning}
                  startIcon={isSubmitting || isTransitioning ? <OrbitLoader size='sm' tone='onAccent' /> : undefined}
                  sx={{
                    height: 52,
                    mt: 1,
                    borderRadius: (theme: Theme) => `${theme.shape.customBorderRadius.xl}px`,
                    bgcolor: color.navy,
                    color: 'common.white',
                    boxShadow: 'none',
                    typography: 'body2',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    textTransform: 'none',
                    '&:hover': { bgcolor: color.dark, boxShadow: 'none' },
                    '&:active': { transform: 'scale(0.985)' },
                    transition: theme => theme.transitions.create(['background-color', 'transform'])
                  }}
                >
                  {isSubmitting || isTransitioning ? GH_MESSAGES.login_validating : GH_MESSAGES.login_button}
                </Button>
              </Stack>
            </form>

            <Stack spacing={1.25} sx={{ textAlign: 'center' }}>
              <Link href='/auth/magic-link' style={linkStyle} tabIndex={isAnyLoading ? -1 : undefined}>
                <Typography component='span' variant='caption' sx={{ color: color.navy, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  {GH_MESSAGES.login_magic_link}
                </Typography>
              </Link>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {GH_MESSAGES.login_access_note}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 380, mt: 4.5, [bpUp]: { display: 'none' } }}>
          <LoginStage announcements={announcements} variant='card' />
        </Box>

        <Stack spacing={1.25} alignItems='center' sx={{ mt: 'auto', pt: 5, textAlign: 'center' }}>
          <Stack direction='row' spacing={1.25} alignItems='center'>
            <Box component='img' src='/images/greenhouse/SVG/greenhouse-blue.svg' alt='Greenhouse' sx={{ height: 16, width: 'auto' }} />
            <Box aria-hidden='true' sx={{ width: '1px', height: 14, bgcolor: 'divider' }} />
            <Typography variant='overline' sx={{ color: 'text.secondary' }}>
              {GH_MESSAGES.login_portal_label}
            </Typography>
          </Stack>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {GH_MESSAGES.login_platform_footer} · {year}
          </Typography>
        </Stack>
      </Box>

      <Box ref={stageRef} sx={{ display: 'none', [bpUp]: { display: 'block' }, flex: '999 1 560px', minWidth: 0, p: 1.5 }}>
        <LoginStage
          announcements={announcements}
          variant='panel'
          onActiveLensChange={handleActiveLensChange}
        />
      </Box>

      {transitionOrigin ? <LoginAccessTransition origin={transitionOrigin} /> : null}
    </Box>
  )
}

export default Login
