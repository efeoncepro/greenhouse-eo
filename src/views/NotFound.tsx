'use client'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// MUI Imports
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme, keyframes } from '@mui/material/styles'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { SystemMode } from '@core/types'
import type { NotFoundCopy } from '@/lib/copy/types'

// Component Imports
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
  animation: `${float} 5s ease-in-out 700ms infinite`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
})

const NotFound = ({ mode, copy }: { mode: SystemMode; copy: NotFoundCopy }) => {
  // Vars
  const darkImg = '/images/pages/misc-mask-dark.png'
  const lightImg = '/images/pages/misc-mask-light.png'

  // Hooks
  const router = useRouter()
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const miscBackground = useImageVariant(mode, lightImg, darkImg)

  return (
    <main className='flex items-center justify-center min-bs-[100dvh] relative p-6 overflow-x-hidden'>
      <ContentStack>
        <div className='flex flex-col gap-2 is-[90vw] sm:is-[unset] mbe-6'>
          <Typography className='font-medium text-8xl' color='text.primary' aria-hidden='true'>
            404
          </Typography>
          <Typography variant='h4' component='h1'>
            {copy.title}
          </Typography>
          <Typography color='text.secondary'>{copy.description}</Typography>
        </div>
        <div className='flex flex-wrap items-center justify-center gap-4'>
          <Button href='/' component={Link} variant='contained'>
            {copy.cta}
          </Button>
          <Button variant='tonal' color='secondary' onClick={() => router.back()}>
            {copy.secondaryCta}
          </Button>
        </div>
        <CharacterFade>
          <CharacterImg
            alt=''
            aria-hidden='true'
            src='/images/illustrations/characters/greenhouse-404.png'
            className='object-cover bs-[400px] md:bs-[450px] lg:bs-[500px] mbs-10 md:mbs-14 lg:mbs-20'
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

export default NotFound
