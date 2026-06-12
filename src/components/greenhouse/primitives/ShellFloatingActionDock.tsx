'use client'

import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import GlobalStyles from '@mui/material/GlobalStyles'
import Stack from '@mui/material/Stack'

export interface ShellFloatingActionDockProps {
  children: ReactNode
  dataCapture?: string
}

const ShellFloatingActionDock = ({
  children,
  dataCapture = 'dashboard-floating-actions'
}: ShellFloatingActionDockProps) => {
  const pathname = usePathname()

  if (pathname === '/knowledge/mockup/answer-trace' || pathname === '/design-system/nexa-chat') return null

  return (
    <>
      <GlobalStyles
        styles={{
          ':root': {
            '--gh-floating-actions-inline-offset': 'calc(24px + env(safe-area-inset-right))',
            '--gh-floating-actions-bottom': 'calc(24px + env(safe-area-inset-bottom))',
            '--gh-floating-actions-gap': '12px',
            '--gh-floating-actions-trigger-size': '40px',
            '--gh-floating-actions-stack-size': 'calc(var(--gh-floating-actions-trigger-size) + var(--gh-floating-actions-trigger-size) + var(--gh-floating-actions-gap))',
            '--gh-floating-actions-safe-inline-size': 'calc(var(--gh-floating-actions-inline-offset) + var(--gh-floating-actions-trigger-size) + 16px)',
            '--gh-floating-actions-safe-block-size': 'calc(var(--gh-floating-actions-bottom) + var(--gh-floating-actions-stack-size) + 16px)'
          },
          '@media (max-width: 599.95px)': {
            ':root': {
              '--gh-floating-actions-inline-offset': 'calc(16px + env(safe-area-inset-right))',
              '--gh-floating-actions-bottom': 'calc(16px + env(safe-area-inset-bottom))',
              '--gh-floating-actions-gap': '10px',
              '--gh-floating-actions-safe-inline-size': 'calc(var(--gh-floating-actions-inline-offset) + var(--gh-floating-actions-trigger-size) + 12px)',
              '--gh-floating-actions-safe-block-size': 'calc(var(--gh-floating-actions-bottom) + var(--gh-floating-actions-stack-size) + 12px)'
            }
          }
        }}
      />
      <Box
        data-capture={dataCapture}
        data-gh-floating-action-dock='true'
        className='mui-fixed'
        sx={theme => ({
          position: 'fixed',
          insetInlineEnd: 'var(--gh-floating-actions-inline-offset)',
          insetBlockEnd: 'var(--gh-floating-actions-bottom)',
          zIndex: theme.zIndex.speedDial,
          pointerEvents: 'none'
        })}
      >
        <Stack
          direction='column'
          spacing='var(--gh-floating-actions-gap)'
          alignItems='center'
          sx={{
            '& > *': {
              pointerEvents: 'auto'
            }
          }}
        >
          {children}
        </Stack>
      </Box>
    </>
  )
}

export default ShellFloatingActionDock
