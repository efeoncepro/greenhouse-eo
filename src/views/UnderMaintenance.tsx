'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

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
import type { UnderMaintenanceCopy } from '@/lib/copy/types'

// Component Imports
import CustomChip from '@core/components/mui/Chip'
import MiscPageEfeonceFooter from '@/components/greenhouse/brand/MiscPageEfeonceFooter'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

// Motion — lowest tier (CSS keyframes), reduced-motion safe (modern-ui).
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

const UnderMaintenance = ({ mode, copy }: { mode: SystemMode; copy: UnderMaintenanceCopy }) => {
  // Vars
  const darkImg = '/images/pages/misc-mask-dark.png'
  const lightImg = '/images/pages/misc-mask-light.png'

  // Hooks
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const miscBackground = useImageVariant(mode, lightImg, darkImg)

  const messages = useMemo(
    () => (copy.messages.length > 0 ? copy.messages : [{ title: copy.title, description: copy.description }]),
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

  // "Reintentar" reloads the document so the user can check whether the
  // maintenance window has ended — a full reload is the honest recovery here.
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <main className='flex items-center justify-center min-bs-[100dvh] relative p-6 overflow-x-hidden'>
      <ContentStack>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            inlineSize: { xs: '90vw', sm: '100%' },
            mb: { xs: 4.25, md: 3.25 }
          }}
        >
          <CustomChip
            label={copy.eyebrow}
            size='small'
            variant='tonal'
            color='primary'
            round='true'
            sx={{
              mb: { xs: 1.75, md: 1.5 },
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
              px: 0.5,
              '& .MuiChip-label': { fontSize: { xs: '0.6875rem', sm: '0.75rem' } }
            }}
          />
          <Box
            key={activeMessageIndex}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              minBlockSize: { xs: 96, sm: 84, md: 80 },
              animation: theme => `${fadeRise} 320ms ${theme.transitions.easing.easeOut} both`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none'
              }
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
                fontSize: { xs: '1.5rem', sm: '1.875rem', md: '2.125rem' },
                mb: { xs: 1.25, md: 1.5 }
              }}
            >
              {activeMessage.title}
            </Typography>
            <Typography
              color='text.secondary'
              sx={{
                maxInlineSize: 600,
                lineHeight: { xs: 1.5, md: 1.55 },
                textWrap: 'balance',
                fontSize: { xs: '0.875rem', sm: '0.9375rem' }
              }}
            >
              {activeMessage.description}
            </Typography>
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
              maxInlineSize: { xs: 276, sm: 'none' },
              px: { xs: 4.5, sm: 5.5 },
              py: { xs: 1.25, sm: 1.5 },
              fontSize: { xs: '0.875rem', sm: '0.9375rem' }
            }}
          >
            {copy.cta}
          </Button>
          <Button
            type='button'
            variant='outlined'
            color='secondary'
            size='large'
            startIcon={<i className='tabler-refresh' />}
            onClick={handleRetry}
            sx={{
              inlineSize: { xs: '100%', sm: 'auto' },
              maxInlineSize: { xs: 276, sm: 'none' },
              px: { xs: 4.5, sm: 5.5 },
              py: { xs: 1.25, sm: 1.5 },
              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
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
            src='/images/illustrations/characters/greenhouse-maintenance.png'
            className='bs-[260px] md:bs-[360px] lg:bs-[400px] mbs-5 md:mbs-8 lg:mbs-8'
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

export default UnderMaintenance
