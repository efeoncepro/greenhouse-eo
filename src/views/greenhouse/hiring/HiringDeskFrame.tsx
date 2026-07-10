'use client'

import type { ReactNode } from 'react'

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
  const isApplication = surface === 'application'

  return (
    <Box sx={{ minWidth: 0, overflowX: 'clip' }} data-capture={`hiring-${surface}`}>
      <Box sx={(theme) => ({ borderBlockEnd: `1px solid ${theme.palette.divider}`, mb: 5.5 })}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'flex-end' }}
          justifyContent='space-between'
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
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
              sx={{ fontWeight: 700, lineHeight: 1.15, textWrap: 'balance' }}
            >
              {copy.title}
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 1, mb: 3.5, maxInlineSize: 720 }}>
              {copy.subtitle}
            </Typography>
            <Box
              component='nav'
              aria-label={copy.title}
              sx={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}
            >
              {NAV_ITEMS.map((item) => {
                const active = item.key === surface || (isApplication && item.key === 'pipeline')

                return (
                  <ButtonBase
                    key={item.key}
                    component={NextLink}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    sx={(theme) => ({
                      display: 'inline-flex',
                      alignItems: 'center',
                      minBlockSize: 40,
                      px: 3.5,
                      borderRadius: 0,
                      color: active ? theme.palette.primary.dark : theme.palette.text.secondary,
                      backgroundColor: 'transparent',
                      borderBlockEnd: `2px solid ${active ? theme.palette.primary.dark : 'transparent'}`,
                      marginBlockEnd: '-1px',
                      fontWeight: 650,
                      whiteSpace: 'nowrap',
                      transition: theme.transitions.create(['background-color', 'color'], { duration: theme.transitions.duration.shorter }),
                      '&:hover': { backgroundColor: theme.palette.action.hover, color: active ? theme.palette.primary.dark : theme.palette.text.primary },
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

      {lead ? <Box sx={{ mb: 5 }}>{lead}</Box> : null}
      {primary}
      {aside ? <Box sx={{ mt: 5 }}>{aside}</Box> : null}
    </Box>
  )
}

export default HiringDeskFrame
