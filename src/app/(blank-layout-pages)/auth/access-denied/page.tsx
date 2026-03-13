import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { BrandWordmark } from '@/components/greenhouse'
import Logo from '@components/layout/shared/Logo'

export default function AccessDeniedPage() {
  return (
    <div className='flex min-bs-[100dvh] items-center justify-center bg-[var(--mui-palette-background-default)] p-6'>
      <Card sx={{ width: '100%', maxWidth: 520, borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 5, md: 8 } }}>
          <Stack spacing={4} alignItems='flex-start'>
            <Logo />
            <Stack spacing={1.5}>
              <Typography variant='h4'>Acceso no disponible</Typography>
              <Typography color='text.secondary'>
                Tu cuenta de Microsoft no tiene acceso al portal Greenhouse. Si crees que esto es un error, contacta a
                tu account manager en{' '}
                <Box component='span' sx={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                  <BrandWordmark brand='efeonce' height={16} maxWidth={92} />
                </Box>
                .
              </Typography>
            </Stack>
            <Link href='/login' style={{ textDecoration: 'none' }}>
              <Button variant='contained'>Volver al inicio</Button>
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </div>
  )
}
