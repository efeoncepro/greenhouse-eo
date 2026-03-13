'use client'

import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import { alpha, styled } from '@mui/material/styles'
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

import { useSettings } from '@core/hooks/useSettings'
import { GH_COLORS, GH_MESSAGES, GH_NAV } from '@/config/greenhouse-nomenclature'

const VisualPanel = styled('div')(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  minHeight: '100dvh',
  alignItems: 'center',
  overflow: 'hidden',
  padding: theme.spacing(8),
  background:
    'radial-gradient(circle at 18% 18%, rgba(3, 117, 219, 0.22), transparent 34%), linear-gradient(155deg, #022A4E 0%, #023C70 44%, #024C8F 100%)'
}))

const VisualOrb = styled('div')({
  position: 'absolute',
  borderRadius: '999px',
  filter: 'blur(0px)',
  opacity: 0.9
})

const StoryCard = styled(Paper)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 24,
  padding: theme.spacing(3),
  backdropFilter: 'blur(18px)',
  backgroundColor: alpha('#FFFFFF', 0.1),
  border: `1px solid ${alpha('#FFFFFF', 0.14)}`,
  boxShadow: '0 24px 60px rgba(1, 42, 78, 0.28)'
}))

const AccentDot = styled('span')<{ color: string }>(({ color }) => ({
  display: 'inline-block',
  inlineSize: 10,
  blockSize: 10,
  borderRadius: 999,
  backgroundColor: color
}))

const visualCards = [
  {
    eyebrow: 'Pulse',
    title: 'Control Tower',
    description: 'Actividad, onboarding y focos de riesgo visibles desde el primer acceso.',
    color: GH_COLORS.role.development.source
  },
  {
    eyebrow: 'Proyectos',
    title: 'Operacion viva',
    description: 'Status, avance y dependencias de cada frente creativo en un solo espacio.',
    color: GH_COLORS.role.media.source
  },
  {
    eyebrow: 'Mi Greenhouse',
    title: 'Acceso ordenado',
    description: 'Identidad, preferencias y contexto de cuenta sin bloques demo de Vuexy.',
    color: GH_COLORS.role.design.source
  }
]

const navHighlights = [GH_NAV.dashboard.label, GH_NAV.projects.label, GH_NAV.sprints.label, GH_NAV.settings.label]

const LoginV2 = ({ hasMicrosoftAuth }: { mode: SystemMode; hasMicrosoftAuth: boolean }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()
  const { settings } = useSettings()

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
      <VisualPanel
        className={classnames('flex-1 max-md:hidden', {
          'border-ie': settings.skin === 'bordered'
        })}
      >
        <VisualOrb
          style={{
            insetInlineStart: '-8%',
            insetBlockStart: '12%',
            inlineSize: 220,
            blockSize: 220,
            background: alpha(GH_COLORS.role.development.source, 0.3)
          }}
        />
        <VisualOrb
          style={{
            insetInlineEnd: '-4%',
            insetBlockEnd: '8%',
            inlineSize: 300,
            blockSize: 300,
            background: alpha(GH_COLORS.role.media.source, 0.18)
          }}
        />
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            width: '100%',
            maxWidth: 720,
            flexDirection: 'column',
            gap: 5,
            color: '#fff'
          }}
        >
          <Box
            component='img'
            src='/branding/logo-negative.svg'
            alt='Greenhouse'
            sx={{ width: 220, height: 'auto' }}
          />
          <Stack spacing={2.5}>
            <Typography
              variant='overline'
              sx={{ color: alpha('#fff', 0.7), letterSpacing: '0.18em', fontWeight: 700 }}
            >
              GREENHOUSE PORTAL
            </Typography>
            <Typography variant='h2' sx={{ color: '#fff', maxWidth: 560 }}>
              Visibilidad real de tu operacion creativa desde el primer acceso.
            </Typography>
            <Typography sx={{ maxWidth: 560, color: alpha('#fff', 0.82), fontSize: '1.05rem' }}>
              Greenhouse reemplaza el bloque demo de Vuexy por un punto de entrada alineado al lenguaje Efeonce:
              control de la cuenta, progreso operativo y acceso ordenado por space.
            </Typography>
          </Stack>
          <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
            {navHighlights.map(label => (
              <Chip
                key={label}
                label={label}
                sx={{
                  height: 36,
                  borderRadius: 999,
                  bgcolor: alpha('#fff', 0.12),
                  color: '#fff',
                  fontWeight: 600,
                  border: `1px solid ${alpha('#fff', 0.18)}`
                }}
              />
            ))}
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xl: 'repeat(3, minmax(0, 1fr))', md: 'repeat(2, minmax(0, 1fr))' }
            }}
          >
            {visualCards.map(card => (
              <StoryCard key={card.title} elevation={0}>
                <Stack spacing={2}>
                  <Stack direction='row' alignItems='center' spacing={1.25}>
                    <AccentDot color={card.color} />
                    <Typography sx={{ color: alpha('#fff', 0.7), fontWeight: 700, letterSpacing: '0.08em' }}>
                      {card.eyebrow}
                    </Typography>
                  </Stack>
                  <Typography variant='h5' sx={{ color: '#fff' }}>
                    {card.title}
                  </Typography>
                  <Typography sx={{ color: alpha('#fff', 0.78) }}>{card.description}</Typography>
                </Stack>
              </StoryCard>
            ))}
          </Box>
        </Box>
      </VisualPanel>
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
