'use client'

import { usePathname } from 'next/navigation'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ChildrenType } from '@core/types'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

// Styled Component Imports
import StyledMain from '@layouts/styles/shared/StyledMain'

const DESIGN_SYSTEM_BRAND_LOGOS_ROUTE = '/design-system/brand-logos'

const LayoutContent = ({ children }: ChildrenType) => {
  // Hooks
  const { settings } = useSettings()
  const pathname = usePathname()

  // Vars
  const routeUsesWideCanvas = pathname.startsWith(DESIGN_SYSTEM_BRAND_LOGOS_ROUTE)
  const contentCompact = settings.contentWidth === 'compact' && !routeUsesWideCanvas
  const contentWide = settings.contentWidth === 'wide' || routeUsesWideCanvas

  return (
    <StyledMain
      isContentCompact={contentCompact}
      className={classnames(verticalLayoutClasses.content, 'flex-auto', {
        [`${verticalLayoutClasses.contentCompact} is-full`]: contentCompact,
        [verticalLayoutClasses.contentWide]: contentWide
      })}
    >
      {children}
    </StyledMain>
  )
}

export default LayoutContent
