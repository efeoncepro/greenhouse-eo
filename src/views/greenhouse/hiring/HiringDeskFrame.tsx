'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'

import ViewTransitionLink from '@/components/greenhouse/motion/ViewTransitionLink'
import {
  GreenhouseBreadcrumbs,
  SurfaceRecipe,
  WorkbenchHeader,
} from '@/components/greenhouse/primitives'

import type { HiringDeskCopy } from '@/lib/copy'

import { buildHiringPipelineHref } from './hiring-navigation'

export type HiringDeskSurface = 'demand' | 'pipeline' | 'publication' | 'talentPool' | 'application'

interface HiringDeskFrameProps {
  surface: HiringDeskSurface
  copy: HiringDeskCopy
  primary: ReactNode
  lead?: ReactNode
  aside?: ReactNode
  action?: ReactNode
  secondaryActions?: ReactNode
  meta?: ReactNode
  applicationContext?: {
    applicationId: string
    openingId: string
    openingTitle: string
  }
}

const NAV_ITEMS = [
  { key: 'demand', href: '/agency/hiring', icon: 'tabler-briefcase-2' },
  { key: 'pipeline', href: '/agency/hiring/pipeline', icon: 'tabler-layout-kanban' },
  { key: 'publication', href: '/agency/hiring/publication', icon: 'tabler-world-upload' },
  { key: 'talentPool', href: '/agency/hiring/talent-pool', icon: 'tabler-user-search' }
] as const

const HiringDeskFrame = ({ surface, copy, primary, lead, aside, action, secondaryActions, meta, applicationContext }: HiringDeskFrameProps) => {
  const isApplication = surface === 'application'
  const activeSurface = (isApplication ? 'pipeline' : surface) as keyof typeof copy.navigation
  const navigationRef = useRef<HTMLElement | null>(null)
  const [navigationEdges, setNavigationEdges] = useState({ start: false, end: false })

  const updateNavigationEdges = useCallback(() => {
    const navigationElement = navigationRef.current

    if (!navigationElement) return

    const maxScrollLeft = navigationElement.scrollWidth - navigationElement.clientWidth

    setNavigationEdges({
      start: navigationElement.scrollLeft > 2,
      end: navigationElement.scrollLeft < maxScrollLeft - 2,
    })
  }, [])

  useEffect(() => {
    const navigationElement = navigationRef.current

    if (!navigationElement) return

    const activeItem = navigationElement.querySelector<HTMLElement>(`[data-tab="${activeSurface}"]`)
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    activeItem?.scrollIntoView?.({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    })
    updateNavigationEdges()

    const resizeObserver = new ResizeObserver(updateNavigationEdges)

    resizeObserver.observe(navigationElement)

    return () => resizeObserver.disconnect()
  }, [activeSurface, updateNavigationEdges])

  const navigation = (
    <Box sx={{ position: 'relative', minWidth: 0, maxInlineSize: '100%', overflow: 'hidden' }}>
      <Box
        ref={navigationRef}
        component='nav'
        aria-label={copy.title}
        data-capture='hiring-tabs'
        onScroll={updateNavigationEdges}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          inlineSize: '100%',
          maxInlineSize: '100%',
          minBlockSize: 42,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        {NAV_ITEMS.map(item => {
        const active = item.key === surface || (isApplication && item.key === 'pipeline')
        const isApplicationParent = isApplication && item.key === 'pipeline' && applicationContext

        const href = isApplicationParent
          ? buildHiringPipelineHref(applicationContext.openingId, applicationContext.applicationId)
          : item.href

        const ariaLabel = isApplicationParent
          ? copy.common.returnToOpeningPipeline.replace('{opening}', applicationContext.openingTitle)
          : undefined

        return (
          <ButtonBase
            key={item.key}
            component={ViewTransitionLink}
            href={href}
            aria-label={ariaLabel}
            aria-current={active ? (isApplicationParent ? 'location' : 'page') : undefined}
            data-tab={item.key}
            data-parent-return={isApplicationParent ? 'true' : undefined}
            sx={theme => ({
              display: 'inline-flex',
              alignItems: 'center',
              flex: '0 0 auto',
              minBlockSize: 40,
              px: 2,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              color: active ? theme.palette.primary.dark : theme.palette.text.secondary,
              backgroundColor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              fontWeight: active ? theme.typography.fontWeightBold : theme.typography.fontWeightMedium,
              whiteSpace: 'nowrap',
              transition: theme.transitions.create(['background-color', 'color'], {
                duration: theme.transitions.duration.shorter,
              }),
              '&:hover': {
                backgroundColor: isApplicationParent
                  ? alpha(theme.palette.primary.main, 0.14)
                  : active
                    ? alpha(theme.palette.primary.main, 0.08)
                    : theme.palette.action.hover,
                color: active ? theme.palette.primary.dark : theme.palette.text.primary,
              },
              '&:active': isApplicationParent ? { transform: 'translateY(1px)' } : undefined,
              '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
            })}
          >
            {isApplicationParent ? (
              <Box component='i' aria-hidden='true' className='tabler-arrow-left' sx={{ fontSize: 18, me: 0.75 }} />
            ) : null}
            {copy.navigation[item.key]}
          </ButtonBase>
        )
        })}
      </Box>
      {navigationEdges.start ? (
        <Box
          aria-hidden='true'
          sx={theme => ({
            position: 'absolute',
            insetBlock: 0,
            insetInlineStart: 0,
            inlineSize: 24,
            pointerEvents: 'none',
            background: `linear-gradient(90deg, ${theme.palette.background.paper}, transparent)`,
          })}
        />
      ) : null}
      {navigationEdges.end ? (
        <Box
          aria-hidden='true'
          sx={theme => ({
            position: 'absolute',
            insetBlock: 0,
            insetInlineEnd: 0,
            inlineSize: 40,
            pointerEvents: 'none',
            background: `linear-gradient(270deg, ${theme.palette.background.paper}, transparent)`,
          })}
        />
      ) : null}
    </Box>
  )

  const header = (
    <Stack spacing={3}>
      <GreenhouseBreadcrumbs
        kind='workbenchHierarchy'
        items={[
          { label: copy.common.agency },
          { label: copy.title },
        ]}
      />
      <WorkbenchHeader
        kind='report'
        titleComponent='h1'
        title={copy.title}
        description={copy.subtitle}
        meta={meta}
        primaryAction={action}
        secondaryActions={secondaryActions}
        supporting={navigation}
        dataCapture='hiring-workbench-header'
      />
    </Stack>
  )

  return (
    <Box
      sx={{
        minWidth: 0,
        overflowX: 'clip',
        '@keyframes ghHiringFade': {
          from: { opacity: 0 },
          to: { opacity: 1 }
        },
        '@keyframes ghHiringUp': {
          from: { opacity: 0, transform: 'translateY(7px)' },
          to: { opacity: 1, transform: 'none' }
        },
        '@keyframes ghHiringLaneIn': {
          from: { opacity: 0, transform: 'translateY(7px)' },
          to: { opacity: 1, transform: 'none' }
        },
        '@keyframes ghHiringCardIn': {
          from: { opacity: 0, transform: 'translateY(6px) scale(.985)' },
          to: { opacity: 1, transform: 'none' }
        },
        '@keyframes ghHiringPop': {
          from: { opacity: 0, transform: 'translateY(6px) scale(.98)' },
          to: { opacity: 1, transform: 'none' }
        },
        '@keyframes ghHiringMoved': {
          from: { boxShadow: '0 0 0 2px var(--mui-palette-primary-main)', transform: 'translateY(-5px)' },
          to: { boxShadow: 'none', transform: 'none' }
        },
        '@keyframes ghHiringReturnFocus': {
          from: {
            outline: '2px solid color-mix(in srgb, var(--mui-palette-primary-main) 72%, transparent)',
            outlineOffset: '2px'
          },
          to: { outline: '2px solid transparent', outlineOffset: '2px' }
        },
        '@keyframes ghHiringDrawer': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'none' }
        },
        '@keyframes ghHiringToast': {
          from: { opacity: 0, transform: 'translateY(8px) scale(.98)' },
          to: { opacity: 1, transform: 'none' }
        },
        '@keyframes ghHiringDropPulse': {
          '0%': { boxShadow: '0 0 0 0 color-mix(in srgb, var(--mui-palette-primary-main) 26%, transparent)' },
          '100%': { boxShadow: '0 0 0 8px transparent' }
        },
        '@keyframes ghHiringShim': {
          from: { backgroundPosition: '-340px 0' },
          to: { backgroundPosition: '340px 0' }
        },
        '@keyframes ghHiringPanel': {
          from: { opacity: 0, transform: 'translateY(10px) scale(.996)', filter: 'blur(3px)' },
          to: { opacity: 1, transform: 'none', filter: 'blur(0)' }
        },
        '@keyframes ghHiringPanelOut': {
          from: { opacity: 1, transform: 'none', filter: 'blur(0)' },
          to: { opacity: 0, transform: 'translateY(-6px) scale(.998)', filter: 'blur(2px)' }
        },
        '@keyframes ghHiringTabGlow': {
          from: { boxShadow: '0 0 0 0 color-mix(in srgb, var(--mui-palette-primary-main) 0%, transparent)' },
          to: { boxShadow: '0 8px 22px -18px var(--mui-palette-primary-main)' }
        },
        '@keyframes ghHiringSpinner': {
          to: { transform: 'rotate(360deg)' }
        },
        animation: 'ghHiringFade 240ms cubic-bezier(.2,0,0,1)',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          '& *, & *::before, & *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important'
          }
        }
      }}
      data-capture={`hiring-${surface}`}
    >
      <SurfaceRecipe
        kind='analyticsReport'
        instanceId={`hiring-${activeSurface}`}
        plane='none'
        header={header}
        regions={{
          primary: (
            <Stack spacing={4} sx={{ minWidth: 0 }}>
              {lead}
              <Box aria-label={copy.navigation[activeSurface]} sx={{ minWidth: 0 }}>
                {primary}
              </Box>
              {aside}
            </Stack>
          )
        }}
      />
    </Box>
  )
}

export default HiringDeskFrame
