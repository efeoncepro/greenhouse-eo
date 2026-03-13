'use client'

import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

import classnames from 'classnames'
import { signIn } from 'next-auth/react'

import type { SystemMode } from '@core/types'

import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

import { useImageVariant } from '@core/hooks/useImageVariant'
import { useSettings } from '@core/hooks/useSettings'
import { GH_COLORS, GH_MESSAGES } from '@/config/greenhouse-nomenclature'

const LoginIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 680,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: {
    maxBlockSize: 550
  },
  [theme.breakpoints.down('lg')]: {
    maxBlockSize: 450
  }
}))

const MaskImg = styled('img')({
  blockSize: 'auto',
  maxBlockSize: 355,
  inlineSize: '100%',
  position: 'absolute',
  insetBlockEnd: 0,
  zIndex: -1
})

const LoginV2 = ({ mode, hasMicrosoftAuth }: { mode: SystemMode; hasMicrosoftAuth: boolean }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const darkImg = '/images/pages/auth-mask-dark.png'
  const lightImg = '/images/pages/auth-mask-light.png'
  const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
  const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
  const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
  const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'

  const router = useRouter()
  const { settings } = useSettings()
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const authBackground = useImageVariant(mode, lightImg, darkImg)

  const characterIllustration = useImageVariant(
    mode,
    lightIllustration,
    darkIllustration,
    borderedLightIllustration,
    borderedDarkIllustration
  )

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/auth/landing'
    })

    if (result?.error) {
      setError(GH_MESSAGES.login_error_credentials)
      setIsSubmitting(false)

      return
    }

    router.replace('/auth/landing')
    router.refresh()
  }

  const handleMicrosoftSignIn = async () => {
    setError('')

    await signIn('azure-ad', {
      callbackUrl: '/auth/landing'
    })
  }

  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          {
            'border-ie': settings.skin === 'bordered'
          }
        )}
      >
        <LoginIllustration src={characterIllustration} alt='portal-illustration' />
        {!hidden && (
          <MaskImg
            alt='mask'
            src={authBackground}
            className={classnames({ 'scale-x-[-1]': theme.direction === 'rtl' })}
          />
        )}
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <Link className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'>
          <Logo />
        </Link>
        <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-11 sm:mbs-14 md:mbs-0'>
          <div className='flex flex-col gap-1'>
            <Typography variant='h4'>{GH_MESSAGES.login_title}</Typography>
            <Typography>{GH_MESSAGES.login_subtitle}</Typography>
          </div>
          <Stack spacing={4}>
            {error ? <Alert severity='error'>{error}</Alert> : null}
            <Button
              fullWidth
              variant='contained'
              size='large'
              onClick={handleMicrosoftSignIn}
              disabled={!hasMicrosoftAuth}
              startIcon={<i className='tabler-brand-windows' />}
              sx={{
                py: 2.2,
                bgcolor: GH_COLORS.semantic.info.source,
                color: '#fff',
                boxShadow: `0 14px 32px ${GH_COLORS.semantic.info.bg}`,
                '&:hover': {
                  bgcolor: GH_COLORS.role.development.textDark
                },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'text.disabled'
                }
              }}
            >
              {GH_MESSAGES.login_with_microsoft}
            </Button>
            {!hasMicrosoftAuth ? <Alert severity='info'>{GH_MESSAGES.login_microsoft_unavailable}</Alert> : null}
            <Divider sx={{ '&::before, &::after': { borderColor: 'divider' } }}>o</Divider>
            <form noValidate autoComplete='off' onSubmit={handleSubmit} className='flex flex-col gap-5'>
              <CustomTextField
                autoFocus
                fullWidth
                label='Email'
                placeholder={GH_MESSAGES.login_email_placeholder}
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              />
              <CustomTextField
                fullWidth
                label='Password'
                placeholder={GH_MESSAGES.login_password_placeholder}
                id='outlined-adornment-password'
                type={isPasswordShown ? 'text' : 'password'}
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton edge='end' onClick={handleClickShowPassword} onMouseDown={e => e.preventDefault()}>
                          <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <Button fullWidth variant='outlined' type='submit' disabled={isSubmitting} color='secondary'>
                {isSubmitting ? 'Validando acceso...' : GH_MESSAGES.login_with_email}
              </Button>
            </form>
            <Typography variant='body2' color='text.secondary'>
              {GH_MESSAGES.login_access_note}
            </Typography>
          </Stack>
        </div>
      </div>
    </div>
  )
}

export default LoginV2
