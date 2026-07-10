'use client'

import type { ReactNode } from 'react'

import NextLink from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useColorScheme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'

type HiringNavItem =
  | { section: string }
  | { label: string; icon: string; href: string; badge?: string }

const isSection = (item: HiringNavItem): item is { section: string } => 'section' in item

const NAVIGATION = [
  { label: 'Dashboard', icon: 'tabler-layout-dashboard', href: '/' },
  { label: 'Proyectos', icon: 'tabler-folders', href: '/projects' },
  { label: 'Sprints', icon: 'tabler-run', href: '/sprints' },
  { section: 'Operación' },
  { label: 'People', icon: 'tabler-users', href: '/people' },
  { label: 'HR · Nómina', icon: 'tabler-cash-banknote', href: '/nomina' },
  { label: 'Finanzas', icon: 'tabler-coins', href: '/economia', badge: '3' },
  { section: 'Agencia' },
  { label: 'Espacios', icon: 'tabler-building-community', href: '/agency/spaces' },
  { label: 'Capacidad', icon: 'tabler-gauge', href: '/agency/capacity' },
  { label: 'Hiring', icon: 'tabler-briefcase', href: '/agency/hiring' },
] as const satisfies readonly HiringNavItem[]

const copy = getMicrocopy()

const HiringDeskAppShell = ({ children }: { children: ReactNode }) => {
  const { mode, setMode } = useColorScheme()
  const isDark = mode === 'dark'

  return (
    <Box sx={{ display: 'flex', blockSize: '100dvh', minBlockSize: 600, overflow: 'hidden', backgroundColor: 'background.default' }}>
      <Box
        component='aside'
        sx={(theme) => ({
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          flex: '0 0 256px',
          inlineSize: 256,
          p: '18px 14px',
          backgroundColor: 'background.paper',
          borderInlineEnd: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 2, pb: 4 }}>
          <Box component='img' src='/images/greenhouse/SVG/greenhouse-full.svg' alt='Greenhouse' sx={{ blockSize: 25, inlineSize: 'auto' }} />
        </Box>
        <Stack component='nav' spacing={0.5} sx={{ flex: 1, overflowY: 'auto' }}>
          {NAVIGATION.map((item, index) => isSection(item) ? (
            <Typography
              key={`${item.section}-${index}`}
              variant='overline'
              color='text.disabled'
              sx={{ mt: index === 0 ? 0 : 1.5, px: 3, pt: 3, pb: 1.5, fontWeight: 650, letterSpacing: '.08em', lineHeight: 1 }}
            >
              {item.section}
            </Typography>
          ) : (
            <ButtonBase
              key={item.label}
              component={NextLink}
              href={item.href}
              aria-current={item.href === '/agency/hiring' ? 'page' : undefined}
              sx={(theme) => {
                const active = item.href === '/agency/hiring'

                return {
                  justifyContent: 'flex-start',
                  gap: 3,
                  minBlockSize: 38,
                  inlineSize: '100%',
                  px: 3,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  color: active ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                  backgroundColor: active ? theme.palette.primary.main : 'transparent',
                  boxShadow: active ? theme.shadows[2] : 'none',
                  fontSize: theme.typography.body2.fontSize,
                  fontWeight: 650,
                  textAlign: 'start',
                  transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], { duration: theme.transitions.duration.shorter }),
                  '&:hover': { backgroundColor: active ? theme.palette.primary.dark : theme.palette.action.hover },
                  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                  '& i': { fontSize: 19, lineHeight: 0 },
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }
              }}
            >
              <i aria-hidden='true' className={item.icon} />
              <Box component='span' sx={{ flex: 1 }}>{item.label}</Box>
              {'badge' in item && item.badge ? (
                <Box
                  component='span'
                  sx={{
                    minInlineSize: 18,
                    blockSize: 18,
                    px: 1.25,
                    borderRadius: 99,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'error.main',
                    color: 'common.white',
                    fontSize: 11,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.badge}
                </Box>
              ) : null}
            </ButtonBase>
          ))}
        </Stack>
        <Stack direction='row' alignItems='center' spacing={2.5} sx={(theme) => ({ borderBlockStart: `1px solid ${theme.palette.divider}`, mt: 2, pt: 2.5, px: 2 })}>
          <Avatar sx={{ inlineSize: 34, blockSize: 34, bgcolor: 'secondary.main', color: 'secondary.contrastText', fontSize: 13, fontWeight: 700 }}>MP</Avatar>
          <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
            <Typography variant='caption' color='text.primary' fontWeight={650} noWrap>María José Peña</Typography>
            <Typography variant='caption' color='text.secondary' display='block' noWrap>Reclutadora líder · Agencia</Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', minInlineSize: 0, flex: 1 }}>
        <Stack
          component='header'
          direction='row'
          alignItems='center'
          spacing={3.5}
          sx={(theme) => ({
            blockSize: 60,
            flex: '0 0 60px',
            px: { xs: 4, md: 6 },
            backgroundColor: 'background.paper',
            borderBlockEnd: `1px solid ${theme.palette.divider}`,
          })}
        >
          <TextField
            size='small'
            placeholder='Buscar postulante, rol, opening…'
            aria-label={copy.aria.searchInput}
            sx={(theme) => ({
              inlineSize: { xs: '100%', md: 400 },
              maxInlineSize: 400,
              '& .MuiInputBase-root': {
                minBlockSize: 38,
                backgroundColor: 'background.default',
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
              },
            })}
            slotProps={{ input: { startAdornment: <InputAdornment position='start'><i aria-hidden='true' className='tabler-search' /></InputAdornment> } }}
          />
          <Box sx={{ flex: 1 }} />
          <Stack
            direction='row'
            role='group'
            aria-label={copy.aria.language}
            sx={(theme) => ({
              overflow: 'hidden',
              blockSize: 36,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
            })}
          >
            <ButtonBase sx={{ px: 3, color: 'primary.contrastText', backgroundColor: 'primary.main', fontSize: 12, fontWeight: 700, letterSpacing: '.02em' }}>ES</ButtonBase>
            <ButtonBase sx={{ px: 3, color: 'text.secondary', backgroundColor: 'background.paper', fontSize: 12, fontWeight: 700, letterSpacing: '.02em' }}>EN</ButtonBase>
          </Stack>
          <IconButton
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            onClick={() => setMode(isDark ? 'light' : 'dark')}
            sx={(theme) => ({ inlineSize: 38, blockSize: 38, border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.md}px`, color: 'text.secondary' })}
          >
            <i aria-hidden='true' className={isDark ? 'tabler-sun' : 'tabler-moon'} />
          </IconButton>
          <IconButton
            aria-label={copy.aria.notifications}
            sx={(theme) => ({
              position: 'relative',
              inlineSize: 38,
              blockSize: 38,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              color: 'text.secondary',
            })}
          >
            <i aria-hidden='true' className='tabler-bell' />
            <Box component='span' sx={{ position: 'absolute', insetBlockStart: 7, insetInlineEnd: 8, inlineSize: 7, blockSize: 7, borderRadius: '50%', backgroundColor: 'error.main', border: '1.5px solid', borderColor: 'background.paper' }} />
          </IconButton>
        </Stack>

        <Box component='main' sx={{ flex: 1, minInlineSize: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <Box sx={{ width: '100%', maxInlineSize: 1440, mx: 'auto', px: { xs: 4, md: 8 }, pt: 5.5, pb: 10 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default HiringDeskAppShell
