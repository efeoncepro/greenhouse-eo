'use client'

import { useState, type KeyboardEvent, type ReactNode } from 'react'

import NextLink from 'next/link'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { HiringDeskCopy } from '@/lib/copy'

export type HiringDeskSurface = 'demand' | 'pipeline' | 'publication' | 'application'

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
] as const

const HiringDeskFrame = ({ surface, copy, primary, lead, aside, action }: HiringDeskFrameProps) => {
  const [transitioningTo, setTransitioningTo] = useState<string | null>(null)
  const isApplication = surface === 'application'
  const activeSurface = (isApplication ? 'pipeline' : surface) as keyof typeof copy.navigation
  const activeTabId = `hiring-tab-${activeSurface}`

  const handleTabKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'))
    const currentIndex = tabs.indexOf(document.activeElement as HTMLElement)

    if (currentIndex < 0) return

    event.preventDefault()

    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length

    tabs[nextIndex]?.focus()
    tabs[nextIndex]?.click()
  }

  return (
    <Box
      sx={{
        minWidth: 0,
        overflowX: 'clip',
        '@keyframes ghHiringFade': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        '@keyframes ghHiringUp': {
          from: { opacity: 0, transform: 'translateY(7px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes ghHiringLaneIn': {
          from: { opacity: 0, transform: 'translateY(7px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes ghHiringCardIn': {
          from: { opacity: 0, transform: 'translateY(6px) scale(.985)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes ghHiringPop': {
          from: { opacity: 0, transform: 'translateY(6px) scale(.98)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes ghHiringMoved': {
          from: { boxShadow: '0 0 0 2px var(--mui-palette-primary-main)', transform: 'translateY(-5px)' },
          to: { boxShadow: 'none', transform: 'none' },
        },
        '@keyframes ghHiringDrawer': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'none' },
        },
        '@keyframes ghHiringToast': {
          from: { opacity: 0, transform: 'translateY(8px) scale(.98)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes ghHiringDropPulse': {
          '0%': { boxShadow: '0 0 0 0 color-mix(in srgb, var(--mui-palette-primary-main) 26%, transparent)' },
          '100%': { boxShadow: '0 0 0 8px transparent' },
        },
        '@keyframes ghHiringShim': {
          from: { backgroundPosition: '-340px 0' },
          to: { backgroundPosition: '340px 0' },
        },
        '@keyframes ghHiringPanel': {
          from: { opacity: 0, transform: 'translateY(10px) scale(.996)', filter: 'blur(3px)' },
          to: { opacity: 1, transform: 'none', filter: 'blur(0)' },
        },
        '@keyframes ghHiringPanelOut': {
          from: { opacity: 1, transform: 'none', filter: 'blur(0)' },
          to: { opacity: 0, transform: 'translateY(-6px) scale(.998)', filter: 'blur(2px)' },
        },
        '@keyframes ghHiringTabGlow': {
          from: { boxShadow: '0 0 0 0 color-mix(in srgb, var(--mui-palette-primary-main) 0%, transparent)' },
          to: { boxShadow: '0 8px 22px -18px var(--mui-palette-primary-main)' },
        },
        '@keyframes ghHiringSpinner': {
          to: { transform: 'rotate(360deg)' },
        },
        animation: 'ghHiringFade 240ms cubic-bezier(.2,0,0,1)',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          '& *, & *::before, & *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      }}
      data-capture={`hiring-${surface}`}
    >
      <Box sx={(theme) => ({ borderBlockEnd: `1px solid ${theme.palette.divider}`, mb: 3 })}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'flex-end' }}
          justifyContent='space-between'
          spacing={2}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction='row' alignItems='center' spacing={1.75} sx={{ color: 'text.secondary', mb: 1.25 }}>
              <Typography variant='caption' color='inherit'>Greenhouse</Typography>
              <i aria-hidden='true' className='tabler-chevron-right' style={{ fontSize: 13 }} />
              <Typography variant='caption' color='inherit'>{copy.common.agency}</Typography>
              <i aria-hidden='true' className='tabler-chevron-right' style={{ fontSize: 13 }} />
              <Typography variant='caption' color='text.primary'>Hiring</Typography>
            </Stack>
            <Typography
              variant='h2'
              component='h1'
              sx={{ fontWeight: 700, lineHeight: 1.12, textWrap: 'balance' }}
            >
              {copy.title}
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 0.75, mb: 2.75, maxInlineSize: 720 }}>
              {copy.subtitle}
            </Typography>
            <Box
              role='tablist'
              aria-label={copy.title}
              onKeyDown={handleTabKeyDown}
              data-capture='hiring-tabs'
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                inlineSize: '100%',
                maxInlineSize: '100%',
                minBlockSize: 42,
                overflowX: { xs: 'clip', sm: 'visible' },
                overflowY: 'hidden',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = item.key === surface || (isApplication && item.key === 'pipeline')

                return (
                  <ButtonBase
                    key={item.key}
                    id={`hiring-tab-${item.key}`}
                    component={NextLink}
                    href={item.href}
                    role='tab'
                    data-tab={item.key}
                    aria-selected={active}
                    aria-controls='hiring-desk-panel'
                    tabIndex={active ? 0 : -1}
                    onClick={(event) => {
                      if (active) {
                        event.preventDefault()

                        return
                      }

                      setTransitioningTo(item.href)
                    }}
                    sx={(theme) => ({
                      display: 'inline-flex',
                      alignItems: 'center',
                      minBlockSize: 38,
                      px: 2.75,
                      borderRadius: 0,
                      color: active ? theme.palette.primary.dark : theme.palette.text.secondary,
                      backgroundColor: 'transparent',
                      borderBlockEnd: `2px solid ${active ? theme.palette.primary.dark : 'transparent'}`,
                      marginBlockEnd: '-1px',
                      boxShadow: active ? `0 8px 22px -18px ${theme.palette.primary.main}` : 'none',
                      fontWeight: 650,
                      whiteSpace: 'nowrap',
                      transition: theme.transitions.create(['background-color', 'border-color', 'color', 'transform'], {
                        duration: theme.transitions.duration.shorter,
                        easing: theme.transitions.easing.easeOut,
                      }),
                      transform: active ? 'translateY(0)' : 'translateY(1px)',
                      animation: active ? 'ghHiringTabGlow 220ms cubic-bezier(.2,0,0,1)' : 'none',
                      '&:hover': { backgroundColor: active ? 'transparent' : theme.palette.action.hover, color: active ? theme.palette.primary.dark : theme.palette.text.primary },
                      '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                    })}
                  >
                    {copy.navigation[item.key]}
                  </ButtonBase>
                )
              })}
            </Box>
          </Box>
          {action}
        </Stack>
      </Box>

      {lead ? <Box sx={{ mb: 3.5 }}>{lead}</Box> : null}
      <Box
        id='hiring-desk-panel'
        role='tabpanel'
        aria-labelledby={activeTabId}
        aria-label={copy.navigation[activeSurface]}
        sx={{
          minWidth: 0,
          viewTransitionName: 'hiring-desk-panel',
          willChange: transitioningTo ? 'opacity, transform, filter' : 'auto',
          animation: 'ghHiringPanel 360ms cubic-bezier(.2,0,0,1)',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', willChange: 'auto' },
        }}
      >
        {primary}
      </Box>
      {aside ? <Box sx={{ mt: 3.5 }}>{aside}</Box> : null}
    </Box>
  )
}

export default HiringDeskFrame
