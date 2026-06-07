'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { GreenhouseButton } from '@/components/greenhouse/primitives'

import MicrointeractionsLabSection from './MicrointeractionsLabSection'

const DESIGN_SYSTEM_ROUTE = '/admin/design-system'

const MicrointeractionsLabView = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1100, mx: 'auto' }}>
    <Stack spacing={1.5}>
      <GreenhouseButton
        component={Link}
        href={DESIGN_SYSTEM_ROUTE}
        variant='text'
        tone='secondary'
        kind='navigation'
        size='small'
        leadingIcon={<i className='tabler-arrow-left' />}
        sx={{ alignSelf: 'flex-start', px: 0 }}
      >
        Design System
      </GreenhouseButton>
      <AxisWordmark variant='auto' height={32} sx={{ mb: 0.5 }} />
      <Typography variant='overline' color='primary'>
        Microinteractions Lab
      </Typography>
      <Typography variant='h4'>
        Feedback moderno para acciones
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 780 }}>
        Laboratorio interno para primitives de feedback puntual: comandos async, estados de exito/error, retry y proteccion contra
        doble submit. Esta subseccion vive separada del canon AXIS y del Loading Lab.
      </Typography>
    </Stack>

    <MicrointeractionsLabSection />
  </Box>
)

export default MicrointeractionsLabView
