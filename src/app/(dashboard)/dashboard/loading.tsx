import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'

export default function Loading() {
  return (
    <Stack spacing={6}>
      <Skeleton variant='rounded' height={240} animation='wave' />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))'
          }
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent>
              <Stack spacing={1.5}>
                <Skeleton variant='text' width='40%' height={20} />
                <Skeleton variant='text' width='60%' height={44} />
                <Skeleton variant='text' width='90%' height={18} />
                <Skeleton variant='text' width='70%' height={18} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            xl: 'repeat(2, minmax(0, 1fr))'
          }
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant='rounded' height={360} animation='wave' />
        ))}
      </Box>

      <Skeleton variant='rounded' height={320} animation='wave' />
      <Skeleton variant='rounded' height={280} animation='wave' />
      <Skeleton variant='rounded' height={96} animation='wave' />
      <Skeleton variant='rounded' height={96} animation='wave' />
    </Stack>
  )
}
