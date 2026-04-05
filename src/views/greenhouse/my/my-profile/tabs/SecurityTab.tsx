'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

const SecurityTab = () => {
  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
        <CustomAvatar variant='rounded' color='secondary' skin='light' size={56}>
          <i className='tabler-lock' style={{ fontSize: 28 }} />
        </CustomAvatar>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant='h6' sx={{ mb: 0.5 }}>Seguridad</Typography>
          <Typography variant='body2' color='text.secondary'>
            Historial de sesiones y configuracion de seguridad estaran disponibles proximamente.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default SecurityTab
