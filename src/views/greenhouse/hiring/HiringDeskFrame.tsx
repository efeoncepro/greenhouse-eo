'use client'

import type { ReactNode } from 'react'

import NextLink from 'next/link'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'

import {
  GreenhouseBreadcrumbs,
  SurfaceRecipe,
  WorkbenchHeader,
} from '@/components/greenhouse/primitives'

import type { HiringDeskCopy } from '@/lib/copy'

export type HiringDeskSurface = 'demand' | 'pipeline' | 'publication' | 'talentPool' | 'application'

interface HiringDeskFrameProps {
  surface: HiringDeskSurface
  copy: HiringDeskCopy
  primary: ReactNode
  lead?: ReactNode
  aside?: ReactNode
  action?: ReactNode
}

const NAV_ITEMS = [
  { key: 'demand', href: '/agency/hiring', icon: 'tabler-briefcase-2' },
  { key: 'pipeline', href: '/agency/hiring/pipeline', icon: 'tabler-layout-kanban' },
  { key: 'publication', href: '/agency/hiring/publication', icon: 'tabler-world-upload' },
  { key: 'talentPool', href: '/agency/hiring/talent-pool', icon: 'tabler-user-search' }
] as const

const HiringDeskFrame = ({ surface, copy, primary, lead, aside, action }: HiringDeskFrameProps) => {
  const isApplication = surface === 'application'
  const activeSurface = (isApplication ? 'pipeline' : surface) as keyof typeof copy.navigation

  const navigation = (
    <Box
      component='nav'
      aria-label={copy.title}
      data-capture='hiring-tabs'
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

        return (
          <ButtonBase
            key={item.key}
            component={NextLink}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            data-tab={item.key}
            sx={theme => ({
              display: 'inline-flex',
              alignItems: 'center',
              flex: '0 0 auto',
              minBlockSize: 40,
              px: 2,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              color: active ? theme.palette.primary.dark : theme.palette.text.secondary,
              backgroundColor: active ? theme.palette.primary.lightOpacity : 'transparent',
              fontWeight: active ? theme.typography.fontWeightBold : theme.typography.fontWeightMedium,
              whiteSpace: 'nowrap',
              transition: theme.transitions.create(['background-color', 'color'], {
                duration: theme.transitions.duration.shorter,
              }),
              '&:hover': {
                backgroundColor: active ? theme.palette.primary.lightOpacity : theme.palette.action.hover,
                color: active ? theme.palette.primary.dark : theme.palette.text.primary,
              },
              '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
            })}
          >
            {copy.navigation[item.key]}
          </ButtonBase>
        )
      })}
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
        primaryAction={action}
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
