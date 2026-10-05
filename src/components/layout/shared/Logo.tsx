'use client'

// Third-party Imports
import styled from '@emotion/styled'
import { useColorScheme } from '@mui/material/styles'

// Type Imports
import type { VerticalNavContextProps } from '@menu/contexts/verticalNavContext'

// Config Imports
import { getBrandDisplayLabel, resolveBrandAssets } from '@/components/greenhouse/brand-assets'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

type WordmarkSlotProps = {
  isHovered?: VerticalNavContextProps['isHovered']
  isCollapsed?: VerticalNavContextProps['isCollapsed']
  transitionDuration?: VerticalNavContextProps['transitionDuration']
  isBreakpointReached?: VerticalNavContextProps['isBreakpointReached']
  variant?: 'default' | 'sidebar'
}

const BrandMark = styled('img')<{ variant: 'default' | 'sidebar' }>`
  display: block;
  flex-shrink: 0;
  inline-size: ${({ variant }) => (variant === 'sidebar' ? '2rem' : '2.25rem')};
  block-size: ${({ variant }) => (variant === 'sidebar' ? '2rem' : '2.25rem')};
  object-fit: contain;
`

const WordmarkSlot = styled.span<WordmarkSlotProps>`
  display: flex;
  overflow: hidden;
  flex-shrink: 1;
  transition: ${({ transitionDuration }) =>
    `margin-inline-start ${transitionDuration}ms ease-in-out, max-inline-size ${transitionDuration}ms ease-in-out, opacity ${transitionDuration}ms ease-in-out`};

  ${({ isHovered, isCollapsed, isBreakpointReached, variant }) =>
    variant === 'sidebar' && !isBreakpointReached && isCollapsed && !isHovered
      ? 'opacity: 0; margin-inline-start: 0; max-inline-size: 0;'
      : `opacity: 1; margin-inline-start: ${variant === 'sidebar' ? '12px' : '0'}; max-inline-size: ${variant === 'sidebar' ? '9rem' : '11rem'};`}
`

const Wordmark = styled('img')<{ variant: 'default' | 'sidebar' }>`
  display: block;
  inline-size: auto;
  block-size: ${({ variant }) => (variant === 'sidebar' ? '1.75rem' : '2rem')};
  max-inline-size: ${({ variant }) => (variant === 'sidebar' ? '9rem' : '11rem')};
  object-fit: contain;
`

const Logo = ({ variant = 'default' }: { variant?: 'default' | 'sidebar' }) => {
  // Hooks
  const { isHovered, transitionDuration, isBreakpointReached } = useVerticalNav()
  const { settings } = useSettings()
  const { mode, systemMode } = useColorScheme()

  // Vars
  const { layout } = settings
  const currentMode = mode === 'system' ? systemMode : mode
  const useNegativeWordmark = variant === 'sidebar' || (variant === 'default' && (settings.semiDark || currentMode === 'dark'))

  // Efeonce owns the navigation identity; Greenhouse identifies the platform in the footer.
  const efeonceAssets = resolveBrandAssets('efeonce')
  const brandLabel = getBrandDisplayLabel('efeonce')

  const wordmarkSrc = useNegativeWordmark
    ? efeonceAssets?.negativeWordmarkSrc
    : efeonceAssets?.wordmarkSrc

  const markSrc = useNegativeWordmark
    ? efeonceAssets?.negativeMarkSrc
    : efeonceAssets?.markSrc

  const showCollapsedMarkOnly = variant === 'sidebar' && layout === 'collapsed' && !isHovered && !isBreakpointReached

  return (
    <div className='flex items-center min-bs-8' data-capture='portal-navigation-brand'>
      {showCollapsedMarkOnly ? (
        <BrandMark src={markSrc} alt={brandLabel} variant={variant} />
      ) : (
        <WordmarkSlot
          isHovered={isHovered}
          isCollapsed={false}
          transitionDuration={transitionDuration}
          isBreakpointReached={isBreakpointReached}
          variant={variant}
        >
          <Wordmark src={wordmarkSrc} alt={brandLabel} variant={variant} />
        </WordmarkSlot>
      )}
    </div>
  )
}

export default Logo
