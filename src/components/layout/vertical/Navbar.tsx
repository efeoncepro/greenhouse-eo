'use client'

// Component Imports
import LayoutNavbar from '@layouts/components/vertical/Navbar'
import NavbarContent from './NavbarContent'
import themeConfig from '@configs/themeConfig'

import { useAdaptiveSidecarShell } from '@/components/greenhouse/primitives'

const toCssSize = (value: number | string) => (typeof value === 'number' ? `${value}px` : value)

const Navbar = () => {
  const shell = useAdaptiveSidecarShell()
  const reservation = shell?.reservation
  const reservedWidth = reservation ? reservation.width + (reservation.resizeHandleWidth ?? 0) : 0
  const reservedGap = reservation?.gap ?? 24
  const reservedWidthSize = `${reservedWidth}px`
  const reservedGapSize = toCssSize(reservedGap)
  const reservationMediaQuery = reservation?.breakpoint ? `@media (min-width: ${reservation.breakpoint}px)` : undefined

  const navbarSelector =
    '&.ts-vertical-layout-header-content-compact.ts-vertical-layout-header-floating .ts-vertical-layout-navbar, &.ts-vertical-layout-header-content-compact.ts-vertical-layout-header-fixed.ts-vertical-layout-header-detached .ts-vertical-layout-navbar, &.ts-vertical-layout-header-content-compact.ts-vertical-layout-header-attached .ts-vertical-layout-navbar, &.ts-vertical-layout-header-floating .ts-vertical-layout-navbar, &.ts-vertical-layout-header-fixed.ts-vertical-layout-header-detached .ts-vertical-layout-navbar, &.ts-vertical-layout-header-attached .ts-vertical-layout-navbar'

  const navbarMotionStyles = {
    transition:
      'inline-size 320ms cubic-bezier(0.22, 1, 0.36, 1), max-inline-size 320ms cubic-bezier(0.22, 1, 0.36, 1), margin-inline-start 320ms cubic-bezier(0.22, 1, 0.36, 1), margin-inline-end 320ms cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: reservation && reservedWidth > 0 ? 'inline-size, max-inline-size, margin-inline-start, margin-inline-end' : undefined,
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none'
    }
  }

  const shellReflowStyles = {
    [navbarSelector]: {
      ...navbarMotionStyles,
      ...(reservation && reservedWidth > 0
        ? {
            inlineSize: `calc(100% - ${themeConfig.layoutPadding * 2}px - ${reservedWidthSize})`,
            maxInlineSize: `calc(${themeConfig.compactContentWidth}px - ${themeConfig.layoutPadding * 2}px - ${reservedWidthSize})`,
            marginInlineStart:
              reservation.side === 'left'
                ? `calc(${reservedWidthSize} + ${reservedGapSize})`
                : `${themeConfig.layoutPadding}px`,
            marginInlineEnd:
              reservation.side === 'right'
                ? `calc(${reservedWidthSize} + ${reservedGapSize})`
                : `${themeConfig.layoutPadding}px`
          }
        : {})
    },
    ...(reservation && reservedWidth > 0
      ? {
          '& .ts-vertical-layout-navbar-content': {
            minInlineSize: 0,
            overflow: 'hidden'
          },
          '& .ts-vertical-layout-navbar-content > :first-of-type': {
            flex: '1 1 auto',
            minInlineSize: 0,
            overflow: 'hidden'
          },
          '& .ts-vertical-layout-navbar-content > :first-of-type .whitespace-nowrap': {
            display: 'none'
          },
          '& .ts-vertical-layout-navbar-content > :last-of-type': {
            flex: '0 0 auto',
            minInlineSize: 'max-content'
          }
        }
      : {})
  }

  const overrideStyles = reservationMediaQuery && shellReflowStyles ? { [reservationMediaQuery]: shellReflowStyles } : shellReflowStyles

  return (
    <LayoutNavbar overrideStyles={overrideStyles}>
      <NavbarContent />
    </LayoutNavbar>
  )
}

export default Navbar
