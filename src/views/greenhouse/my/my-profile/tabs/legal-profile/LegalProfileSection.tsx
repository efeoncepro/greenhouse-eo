'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface LegalProfileSectionProps {
  title: string
  hint?: string
  children: ReactNode
}

const LegalProfileSection = ({ title, hint, children }: LegalProfileSectionProps) => (
  <Box component='section' sx={{ mb: 8 }}>
    <Stack
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      sx={{ mb: 3, px: 1 }}
    >
      <Typography
        variant='overline'
        color='text.secondary'
        sx={{ fontWeight: 600, letterSpacing: '0.1em' }}
      >
        {title}
      </Typography>
      {hint ? (
        <Typography variant='caption' color='text.secondary'>
          {hint}
        </Typography>
      ) : null}
    </Stack>
    <Stack spacing={3}>{children}</Stack>
  </Box>
)

export default LegalProfileSection
