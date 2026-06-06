'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// MUI Imports
import useMediaQuery from '@mui/material/useMediaQuery'
import Box from '@mui/material/Box'
import { alpha, styled, useTheme, keyframes } from '@mui/material/styles'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { SystemMode } from '@core/types'
import type { NotAuthorizedCopy } from '@/lib/copy/types'

// Component Imports
import CustomChip from '@core/components/mui/Chip'
import MiscPageEfeonceFooter from '@/components/greenhouse/brand/MiscPageEfeonceFooter'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

// Motion — lowest tier (CSS keyframes), reduced-motion safe (modern-ui)
const fadeRise = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`

// Styled Components
const MaskImg = styled('img')({
  blockSize: 'auto',
  maxBlockSize: 355,
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
  maxInlineSize: 760,
  animation: `${fadeRise} 450ms ${theme.transitions.easing.easeOut} both`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
}))

const CharacterFade = styled('div')(({ theme }) => ({
  animation: `${fadeRise} 600ms ${theme.transitions.easing.easeOut} 120ms both`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
}))

const CharacterImg = styled('img')({
  display: 'block',
  objectFit: 'contain',
  animation: `${float} 5s ease-in-out 700ms infinite`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
})

const NotAuthorized = ({ mode, copy }: { mode: SystemMode; copy: NotAuthorizedCopy }) => {
  // Vars
  const darkImg = '/images/pages/misc-mask-dark.png'
  const lightImg = '/images/pages/misc-mask-light.png'

  // Hooks
  const router = useRouter()
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const miscBackground = useImageVariant(mode, lightImg, darkImg)

  const messages = useMemo(
    () =>
      copy.messages.length > 0
        ? copy.messages
        : [{ title: copy.title, status: '', detail: copy.description, recovery: '' }],
    [copy.description, copy.messages, copy.title]
  )

  const [activeMessageIndex, setActiveMessageIndex] = useState(0)
  const activeMessage = messages[activeMessageIndex % messages.length]

  useEffect(() => {
    if (messages.length < 2) return

    const randomValues = new Uint32Array(1)

    window.crypto.getRandomValues(randomValues)
    setActiveMessageIndex((randomValues[0] ?? 0) % messages.length)
  }, [messages.length])

  return (
    <main className='flex items-center justify-center min-bs-[100dvh] relative p-6 overflow-x-hidden'>
      <ContentStack>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            inlineSize: { xs: '90vw', sm: '100%' },
            mb: { xs: 5, md: 4 }
          }}
        >
          <CustomChip
            label={copy.eyebrow}
            size='small'
            variant='tonal'
            color='primary'
            round='true'
            sx={{
              mb: { xs: 2.5, md: 2.5 },
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              '& .MuiChip-label': { fontSize: { xs: '0.75rem', sm: '0.8125rem' } }
            }}
          />
          <Typography
            component='p'
            color='text.primary'
            aria-hidden='true'
            sx={{
              fontFamily: theme => theme.typography.h1.fontFamily,
              fontWeight: 800,
              lineHeight: 0.88,
              letterSpacing: 0,
              fontSize: { xs: '4.5rem', sm: '7rem', md: '8rem' },
              mb: { xs: 2.5, md: 2 },
              textShadow: theme => `0 12px 30px ${alpha(theme.palette.text.primary, 0.08)}`
            }}
          >
            401
          </Typography>

          <Box
            key={activeMessageIndex}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              minBlockSize: { xs: 120, sm: 96, md: 92 },
              animation: theme =>
                prefersReducedMotion ? 'none' : `${fadeRise} 320ms ${theme.transitions.easing.easeOut} both`
            }}
          >
            <Typography
              variant='h4'
              component='h1'
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: 0,
                textWrap: 'balance',
                fontSize: { xs: '1.375rem', sm: '1.5rem' },
                mb: { xs: 1.5, md: 2 }
              }}
            >
              {activeMessage.title}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                justifyItems: 'center',
                gap: { xs: 0.75, md: 1 },
                maxInlineSize: 680
              }}
            >
              {activeMessage.status ? (
                <Typography
                  color='text.primary'
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.45,
                    textWrap: 'balance',
                    fontSize: { xs: '0.9375rem', sm: '1rem' }
                  }}
                >
                  {activeMessage.status}
                </Typography>
              ) : null}
              <Typography
                color='text.secondary'
                sx={{
                  lineHeight: { xs: 1.5, md: 1.55 },
                  textWrap: 'balance',
                  fontSize: { xs: '0.9375rem', sm: '1rem' }
                }}
              >
                {activeMessage.detail}
              </Typography>
              {activeMessage.recovery ? (
                <Typography
                  color='text.secondary'
                  sx={{
                    lineHeight: 1.5,
                    textWrap: 'balance',
                    fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                    opacity: 0.82
                  }}
                >
                  {activeMessage.recovery}
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 2, sm: 3 },
            inlineSize: { xs: '100%', sm: 'auto' }
          }}
        >
          <Button
            href='/'
            component={Link}
            variant='contained'
            size='large'
            startIcon={<i className='tabler-home' />}
            sx={{
              inlineSize: { xs: '100%', sm: 'auto' },
              maxInlineSize: { xs: 292, sm: 'none' },
              px: { xs: 5, sm: 6 },
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.9375rem', sm: '1rem' }
            }}
          >
            {copy.cta}
          </Button>
          <Button
            type='button'
            variant='outlined'
            color='secondary'
            size='large'
            startIcon={<i className='tabler-arrow-left' />}
            onClick={() => router.back()}
            sx={{
              inlineSize: { xs: '100%', sm: 'auto' },
              maxInlineSize: { xs: 292, sm: 'none' },
              px: { xs: 5, sm: 6 },
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.9375rem', sm: '1rem' },
              backgroundColor: theme => alpha(theme.palette.background.paper, 0.72),
              borderColor: theme => alpha(theme.palette.secondary.main, 0.24),
              '&:hover': {
                backgroundColor: theme => alpha(theme.palette.secondary.main, 0.06),
                borderColor: theme => alpha(theme.palette.secondary.main, 0.42)
              }
            }}
          >
            {copy.secondaryCta}
          </Button>
        </Box>

        <CharacterFade>
          <CharacterImg
            alt=''
            aria-hidden='true'
            src='/images/illustrations/characters/greenhouse-401.png'
            className='bs-[200px] md:bs-[360px] lg:bs-[392px] mbs-6 md:mbs-9 lg:mbs-10'
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

export default NotAuthorized
