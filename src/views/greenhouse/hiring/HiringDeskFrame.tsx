'use client'

import type { ReactNode } from 'react'

import NextLink from 'next/link'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  CompositionShell,
  GreenhouseBreadcrumbs,
} from '@/components/greenhouse/primitives'
import type { HiringDeskCopy } from '@/lib/copy'

export type HiringDeskSurface = 'demand' | 'pipeline' | 'publication' | 'application'

interface HiringDeskFrameProps {
  surface: HiringDeskSurface
  copy: HiringDeskCopy
  primary: ReactNode
  lead?: ReactNode
  aside?: ReactNode
  action?: ReactNode
  currentLabel?: string
}

const NAV_ITEMS = [
  { key: 'demand', href: '/agency/hiring', icon: 'tabler-briefcase-2' },
  { key: 'pipeline', href: '/agency/hiring/pipeline', icon: 'tabler-layout-kanban' },
  { key: 'publication', href: '/agency/hiring/publication', icon: 'tabler-world-upload' },
] as const

const HiringDeskFrame = ({ surface, copy, primary, lead, aside, action, currentLabel }: HiringDeskFrameProps) => {
  const composition = surface === 'application' ? 'leadPlusContext' : 'single'

  return (
    <Stack spacing={4} sx={{ minWidth: 0, overflowX: 'clip' }} data-capture={`hiring-${surface}`}>
      <GreenhouseBreadcrumbs
        kind='pageHierarchy'
        items={[
          { label: copy.common.agency, href: '/agency', iconClassName: 'tabler-building' },
          { label: copy.title, ...(surface === 'application' ? { href: '/agency/hiring' } : {}) },
          ...(surface === 'application' && currentLabel ? [{ label: currentLabel }] : []),
        ]}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'flex-end' }}
        justifyContent='space-between'
        spacing={3}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h2' component='h1' sx={{ textWrap: 'balance' }}>
            {copy.title}
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1, maxInlineSize: 720 }}>
            {copy.subtitle}
          </Typography>
        </Box>
        {action}
      </Stack>

      <Box
        component='nav'
        aria-label={copy.title}
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          inlineSize: '100%',
          overflowX: 'auto',
          borderBlockEnd: `1px solid ${theme.palette.divider}`,
        })}
      >
        {NAV_ITEMS.map((item) => {
          const active = item.key === surface || (surface === 'application' && item.key === 'pipeline')

          return (
            <ButtonBase
              key={item.key}
              component={NextLink}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              sx={(theme) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                minBlockSize: 44,
                px: 2,
                borderRadius: 0,
                color: active ? theme.palette.primary.dark : theme.palette.text.secondary,
                backgroundColor: 'transparent',
                borderBlockEnd: `2px solid ${active ? theme.palette.primary.dark : 'transparent'}`,
                marginBlockEnd: '-1px',
                fontWeight: 650,
                whiteSpace: 'nowrap',
                transition: theme.transitions.create(['background-color', 'color', 'transform'], {
                  duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  color: active ? theme.palette.primary.dark : theme.palette.text.primary,
                },
                '&:active': { transform: 'translateY(1px)' },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' },
              })}
            >
              {copy.navigation[item.key]}
            </ButtonBase>
          )
        })}
      </Box>

      <CompositionShell
        instanceId={`hiring-${surface}`}
        composition={composition}
        fluidity='rich'
        leadLabel={surface === 'application' ? currentLabel ?? copy.application.candidate : undefined}
        asideLabel={surface === 'application' ? copy.application.candidate : undefined}
        regions={{ primary, ...(lead ? { lead } : {}), ...(aside ? { aside } : {}) }}
      />
    </Stack>
  )
}

export default HiringDeskFrame
