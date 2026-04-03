import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function AuthLandingLoading() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <Stack spacing={3} alignItems='center'>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              bgcolor: '#2d6a4f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Box
              component='img'
              src='/images/greenhouse/SVG/negative-isotipo.svg'
              alt='Greenhouse'
              sx={{ width: 20, height: 20 }}
            />
          </Box>
          <Box
            component='img'
            src='/images/greenhouse/SVG/greenhouse-full.svg'
            alt='Greenhouse logotipo'
            sx={{ height: 18 }}
          />
        </Box>
        <CircularProgress size={32} />
        <Typography variant='body2' color='text.secondary'>
          Preparando tu espacio de trabajo...
        </Typography>
      </Stack>
    </Box>
  )
}
