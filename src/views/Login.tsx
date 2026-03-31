'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

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

  const router = useRouter()

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

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit = handleSubmit(async values => {
    setError('')

    const result = await signIn('credentials', {
      email: values.email,
      password: values.password,
      redirect: false,
      callbackUrl: '/auth/landing'
    })

    if (result?.error) {
      setError(GH_MESSAGES.login_error_credentials)

      return
    }

    router.replace('/auth/landing')
    router.refresh()
  })

  const handleMicrosoftSignIn = async () => {
    setError('')

    await signIn('azure-ad', {
      callbackUrl: '/auth/landing'
    })
  }

  const handleGoogleSignIn = async () => {
    setError('')

    await signIn('google', {
      callbackUrl: '/auth/landing'
    })
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
        <Box sx={{ width: '100%', maxWidth: 400 }}>
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
            {error ? <Alert severity='error'>{error}</Alert> : null}

            {/* Microsoft SSO — primary */}
            <Button
              fullWidth
              variant='contained'
              size='large'
              onClick={handleMicrosoftSignIn}
              disabled={!hasMicrosoftAuth}
              startIcon={<Box component='img' src='/images/greenhouse/SVG/icon-microsoft.svg' alt='' sx={{ width: 20, height: 20 }} />}
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
              {GH_MESSAGES.login_with_microsoft}
            </Button>
            {!hasMicrosoftAuth ? <Alert severity='info'>{GH_MESSAGES.login_microsoft_unavailable}</Alert> : null}

            {/* Google SSO — secondary */}
            <Button
              fullWidth
              variant='outlined'
              size='large'
              onClick={handleGoogleSignIn}
              disabled={!hasGoogleAuth}
              startIcon={<Box component='img' src='/images/greenhouse/SVG/icon-google.svg' alt='' sx={{ width: 20, height: 20 }} />}
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
              {GH_MESSAGES.login_with_google}
            </Button>
            {!hasGoogleAuth ? <Alert severity='info'>{GH_MESSAGES.login_google_unavailable}</Alert> : null}

            {/* Separator */}
            <Divider sx={{ my: 1, '&::before, &::after': { borderColor: 'divider' } }}>o</Divider>

            {/* Credentials form */}
            <form noValidate autoComplete='off' onSubmit={onSubmit}>
              <Stack spacing={2.5}>
                <CustomTextField
                  autoFocus
                  fullWidth
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
                            aria-label={isPasswordShown ? 'Ocultar contrase\u00f1a' : 'Mostrar contrase\u00f1a'}
                          >
                            <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Link href='/auth/forgot-password' style={{ textDecoration: 'none' }}>
                    <Typography variant='body2' sx={{ color: GH_COLORS.brand.coreBlue }}>
                      {GH_MESSAGES.login_forgot_password}
                    </Typography>
                  </Link>
                </Box>
                <Button
                  fullWidth
                  variant='outlined'
                  type='submit'
                  disabled={isSubmitting}
                  color='secondary'
                  sx={{ borderRadius: '8px', py: 1.5, textTransform: 'none', fontSize: 14, fontWeight: 500 }}
                >
                  {isSubmitting ? GH_MESSAGES.login_validating : GH_MESSAGES.login_button}
                </Button>
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
        </Box>
      </Box>
    </Box>
  )
}

export default LoginV2
