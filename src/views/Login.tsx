'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import LoadingButton from '@mui/lab/LoadingButton'

import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'

import type { SystemMode } from '@core/types'

import Link from '@components/Link'
import CustomTextField from '@core/components/mui/TextField'

import { GH_COLORS, GH_MESSAGES } from '@/config/greenhouse-nomenclature'
import { email as emailRule, required } from '@/lib/forms/greenhouse-form-patterns'
import GreenhouseBrandPanel from '@/views/login/GreenhouseBrandPanel'
import { BRAND_PANEL_BREAKPOINT } from '@/views/login/login-constants'

type LoginFormValues = {
  email: string
  password: string
}

// ── Error mapping ──

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

// ── Component ──

const LoginV2 = ({
  hasMicrosoftAuth,
  hasGoogleAuth
}: {
  mode: SystemMode
  hasMicrosoftAuth: boolean
  hasGoogleAuth: boolean
}) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [error, setError] = useState('')
  const [ssoLoading, setSsoLoading] = useState<'microsoft' | 'google' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [providerReadiness, setProviderReadiness] = useState<{
    microsoft: 'ready' | 'degraded' | 'unconfigured' | 'unknown'
    google: 'ready' | 'degraded' | 'unconfigured' | 'unknown'
    microsoftReason?: string
    googleReason?: string
  }>({
    microsoft: 'unknown',
    google: 'unknown'
  })

  const router = useRouter()

  // TASK-742 Capa 2 — Live provider readiness probe (cached 30s server-side).
  // Hides/disables provider buttons when their underlying secret/discovery
  // probe failed, so a user never gets the opaque `error=Callback` redirect.
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

        setProviderReadiness({
          microsoft: azure?.status ?? 'unknown',
          google: google?.status ?? 'unknown',
          microsoftReason: azure?.reason,
          googleReason: google?.reason
        })
      } catch {
        // Health endpoint failure is non-blocking — buttons fall back to env
        // flags. Capa 3 captures the upstream failure separately.
      }
    }

    fetchHealth()

    return () => {
      cancelled = true
    }
  }, [])

  const isMicrosoftDegraded = providerReadiness.microsoft === 'degraded'
  const isGoogleDegraded = providerReadiness.google === 'degraded'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const isAnyLoading = isSubmitting || ssoLoading !== null

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit = handleSubmit(async values => {
    setError('')

    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: '/auth/landing'
      })

      if (result?.error) {
        setError(mapAuthError(result.error))

        return
      }

      setIsTransitioning(true)
      router.replace('/auth/landing')
      router.refresh()
    } catch {
      setError(GH_MESSAGES.login_error_network)
    }
  })

  const handleMicrosoftSignIn = async () => {
    setError('')
    setSsoLoading('microsoft')

    try {
      await signIn('azure-ad', { callbackUrl: '/auth/landing' })
    } catch {
      setSsoLoading(null)
      setError(GH_MESSAGES.login_error_provider_unavailable)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setSsoLoading('google')

    try {
      await signIn('google', { callbackUrl: '/auth/landing' })
    } catch {
      setSsoLoading(null)
      setError(GH_MESSAGES.login_error_provider_unavailable)
    }
  }

  const bpUp = `@media (min-width: ${BRAND_PANEL_BREAKPOINT}px)`

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Visually hidden h1 for screen readers */}
      <Typography
        component='h1'
        sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      >
        Greenhouse Portal - Inicio de sesi&oacute;n
      </Typography>

      {/* Left panel — brand moment (hidden below 1024px) */}
      <Box
        sx={{
          display: 'none',
          [bpUp]: { display: 'flex' },
          width: '60%',
          flexShrink: 0
        }}
      >
        <GreenhouseBrandPanel />
      </Box>

      {/* Right panel — auth form */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          [bpUp]: { width: '40%' },
          bgcolor: 'background.paper',
          p: { xs: 3, sm: 4, md: 6 }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400, position: 'relative' }}>
          {/* LinearProgress — global loading indicator */}
          {(isAnyLoading || isTransitioning) && (
            <LinearProgress
              sx={{
                position: 'absolute',
                top: -24,
                left: -16,
                right: -16,
                height: 3,
                borderRadius: 1
              }}
            />
          )}

          {/* Post-auth transition screen */}
          {isTransitioning ? (
            <Stack spacing={3} alignItems='center' sx={{ py: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '6px',
                    bgcolor: GH_COLORS.brand.greenhouseGreen,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Box
                    component='img'
                    src='/images/greenhouse/SVG/negative-isotipo.svg'
                    alt='Greenhouse'
                    sx={{ width: 20, height: 20 }}
                  />
                </Box>
                <Box
                  component='img'
                  src='/images/greenhouse/SVG/greenhouse-full.svg'
                  alt='Greenhouse logotipo'
                  sx={{ height: 18 }}
                />
              </Box>
              <CircularProgress size={32} />
              <Typography variant='body1' color='text.secondary'>
                {GH_MESSAGES.login_preparing_workspace}
              </Typography>
            </Stack>
          ) : (
            <>
              {/* Mobile logo — visible only below breakpoint */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 4,
                  [bpUp]: { display: 'none' }
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '6px',
                    bgcolor: GH_COLORS.brand.greenhouseGreen,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Box
                    component='img'
                    src='/images/greenhouse/SVG/negative-isotipo.svg'
                    alt='Greenhouse'
                    sx={{ width: 20, height: 20 }}
                  />
                </Box>
                <Box
                  component='img'
                  src='/images/greenhouse/SVG/greenhouse-full.svg'
                  alt='Greenhouse logotipo'
                  sx={{ height: 18, ml: 1 }}
                />
              </Box>

              {/* Auth header */}
              <Typography variant='h5' sx={{ fontWeight: 500, mb: 0.5 }}>
                {GH_MESSAGES.login_title}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
                {GH_MESSAGES.login_subtitle}
              </Typography>

              <Stack spacing={2}>
                {error ? (
                  <Alert severity={getErrorSeverity(error)} onClose={() => setError('')}>
                    {error}
                  </Alert>
                ) : null}

                {/* Microsoft SSO — primary */}
                <Button
                  fullWidth
                  variant='contained'
                  size='large'
                  onClick={handleMicrosoftSignIn}
                  disabled={!hasMicrosoftAuth || isMicrosoftDegraded || isAnyLoading}
                  startIcon={
                    ssoLoading === 'microsoft' ? (
                      <CircularProgress size={20} color='inherit' />
                    ) : (
                      <Box
                        component='img'
                        src='/images/greenhouse/SVG/icon-microsoft.svg'
                        alt=''
                        sx={{ width: 20, height: 20 }}
                      />
                    )
                  }
                  sx={{
                    py: 1.8,
                    bgcolor: GH_COLORS.brand.midnightNavy,
                    color: '#fff',
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    '&:hover': { bgcolor: '#03345e' },
                    '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                  }}
                >
                  {ssoLoading === 'microsoft'
                    ? GH_MESSAGES.login_redirecting_microsoft
                    : GH_MESSAGES.login_with_microsoft}
                </Button>
                {!hasMicrosoftAuth ? (
                  <Alert severity='info'>{GH_MESSAGES.login_microsoft_unavailable}</Alert>
                ) : isMicrosoftDegraded ? (
                  <Alert severity='warning'>
                    Microsoft SSO temporalmente no disponible. Usa email y contraseña, o pide un acceso
                    por link mágico abajo.
                  </Alert>
                ) : null}

                {/* Google SSO — secondary */}
                <Button
                  fullWidth
                  variant='outlined'
                  size='large'
                  onClick={handleGoogleSignIn}
                  disabled={!hasGoogleAuth || isGoogleDegraded || isAnyLoading}
                  startIcon={
                    ssoLoading === 'google' ? (
                      <CircularProgress size={20} color='inherit' />
                    ) : (
                      <Box
                        component='img'
                        src='/images/greenhouse/SVG/icon-google.svg'
                        alt=''
                        sx={{ width: 20, height: 20 }}
                      />
                    )
                  }
                  sx={{
                    py: 1.8,
                    borderRadius: '8px',
                    borderColor: 'divider',
                    color: 'text.primary',
                    textTransform: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    '&.Mui-disabled': { borderColor: 'divider', color: 'text.disabled' }
                  }}
                >
                  {ssoLoading === 'google'
                    ? GH_MESSAGES.login_redirecting_google
                    : GH_MESSAGES.login_with_google}
                </Button>
                {!hasGoogleAuth ? (
                  <Alert severity='info'>{GH_MESSAGES.login_google_unavailable}</Alert>
                ) : isGoogleDegraded ? (
                  <Alert severity='warning'>
                    Google SSO temporalmente no disponible. Usa email y contraseña, o pide un link mágico.
                  </Alert>
                ) : null}

                {/* Separator */}
                <Divider sx={{ my: 1, '&::before, &::after': { borderColor: 'divider' } }}>o</Divider>

                {/* Credentials form */}
                <form noValidate autoComplete='off' onSubmit={onSubmit}>
                  <Stack spacing={2.5}>
                    <CustomTextField
                      autoFocus
                      fullWidth
                      disabled={isAnyLoading}
                      label={GH_MESSAGES.login_email_placeholder}
                      placeholder={GH_MESSAGES.login_email_placeholder}
                      error={Boolean(errors.email)}
                      helperText={errors.email?.message}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      {...register('email', {
                        validate: {
                          required: required('Email'),
                          email: emailRule
                        }
                      })}
                    />
                    <CustomTextField
                      fullWidth
                      disabled={isAnyLoading}
                      label={GH_MESSAGES.login_password_placeholder}
                      placeholder={GH_MESSAGES.login_password_placeholder}
                      id='outlined-adornment-password'
                      type={isPasswordShown ? 'text' : 'password'}
                      error={Boolean(errors.password)}
                      helperText={errors.password?.message}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      {...register('password', {
                        validate: {
                          required: required('Password')
                        }
                      })}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton
                                edge='end'
                                onClick={handleClickShowPassword}
                                onMouseDown={e => e.preventDefault()}
                                aria-label={isPasswordShown ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                disabled={isAnyLoading}
                              >
                                <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Link
                        href='/auth/forgot-password'
                        style={{ textDecoration: 'none', ...(isAnyLoading ? { pointerEvents: 'none', opacity: 0.5 } : {}) }}
                        tabIndex={isAnyLoading ? -1 : undefined}
                      >
                        <Typography variant='body2' sx={{ color: GH_COLORS.brand.coreBlue }}>
                          {GH_MESSAGES.login_forgot_password}
                        </Typography>
                      </Link>
                    </Box>
                    <LoadingButton
                      fullWidth
                      variant='outlined'
                      type='submit'
                      loading={isSubmitting}
                      disabled={isAnyLoading && !isSubmitting}
                      color='secondary'
                      sx={{ borderRadius: '8px', py: 1.5, textTransform: 'none', fontSize: 14, fontWeight: 500 }}
                    >
                      {isSubmitting ? GH_MESSAGES.login_validating : GH_MESSAGES.login_button}
                    </LoadingButton>
                  </Stack>
                </form>

                {/* Access note */}
                <Typography
                  variant='caption'
                  sx={{ display: 'block', color: 'text.disabled', textAlign: 'center', mt: 1 }}
                >
                  {GH_MESSAGES.login_access_note}
                </Typography>
              </Stack>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default LoginV2
