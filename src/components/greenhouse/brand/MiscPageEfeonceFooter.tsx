'use client'

// MUI Imports
import { keyframes, styled } from '@mui/material/styles'

// Type Imports
import type { SystemMode } from '@core/types'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'

/**
 * Bottom-centered Efeonce institutional wordmark for the branded misc pages
 * (404 / 401 / Coming Soon). Efeonce is the umbrella/institutional brand —
 * signing these standalone surfaces with it is the canonical institutional
 * placement (DESIGN.md → "Brand assets — Efeonce"). Mode-aware (positive on
 * light, negative on dark). Absolutely anchored to the bottom so it never
 * disturbs the centered hero content; sits above the decorative mask.
 */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

const Footer = styled('footer')(({ theme }) => ({
  position: 'absolute',
  insetBlockEnd: 0,
  insetInline: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  paddingBlockEnd: theme.spacing(8),
  pointerEvents: 'none',
  zIndex: 1,
  animation: `${fadeIn} 600ms ${theme.transitions.easing.easeOut} 320ms both`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none'
  }
}))

const Wordmark = styled('img')({
  blockSize: 22,
  inlineSize: 'auto',
  objectFit: 'contain',
  opacity: 0.72
})

const MiscPageEfeonceFooter = ({ mode }: { mode: SystemMode }) => {
  const wordmark = useImageVariant(mode, '/branding/logo-full.svg', '/branding/logo-negative.svg')

  return (
    <Footer>
      <Wordmark src={wordmark} alt='Efeonce' />
    </Footer>
  )
}

export default MiscPageEfeonceFooter
