'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

interface LegalProfileSectionProps {
  title: string
  hint?: string
  children: ReactNode
}

/**
 * TASK-784 flat redesign — Section header inline.
 *
 * NO Card. Es un overline + counter alineados a la izquierda/derecha,
 * con border-top como divider de seccion. Items hijos se renderizan
 * directamente en el flow del container raiz.
 */
const LegalProfileSection = ({ title, hint, children }: LegalProfileSectionProps) => {
  const theme = useTheme()

  return (
    <Box component='section'>
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{
          px: 6,
          py: 3,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography
          variant='caption'
          sx={{
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            fontSize: 11
          }}
        >
          {title}
        </Typography>
        {hint ? (
          <Typography variant='caption' color='text.secondary' sx={{ fontSize: 12 }}>
            {hint}
          </Typography>
        ) : null}
      </Stack>
      {children}
    </Box>
  )
}

export default LegalProfileSection
