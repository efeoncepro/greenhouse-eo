import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

const InternalControlTowerLoading = () => {
  return (
    <Stack spacing={6}>
      <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
        <Stack spacing={1.5} sx={{ flex: 1 }}>
          <Skeleton variant='text' width='28%' height={44} />
          <Skeleton variant='text' width='62%' height={26} />
          <div className='flex gap-2'>
            <Skeleton variant='rounded' width={180} height={36} />
            <Skeleton variant='rounded' width={160} height={36} />
          </div>
        </Stack>
        <div className='flex gap-3'>
          <Skeleton variant='rounded' width={140} height={40} />
          <Skeleton variant='rounded' width={120} height={40} />
        </div>
      </div>

      <Grid container spacing={6}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, md: 6, xl: 4 }}>
            <Card>
              <CardContent>
                <Stack spacing={1.5}>
                  <Skeleton variant='text' width='40%' height={22} />
                  <Skeleton variant='text' width='55%' height={42} />
                  <Skeleton variant='text' width='90%' height={18} />
                  <Skeleton variant='rounded' width='70%' height={24} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <Stack spacing={1}>
                <Skeleton variant='text' width={180} height={34} />
                <Skeleton variant='text' width={440} height={20} />
              </Stack>
              <div className='flex gap-3'>
                <Skeleton variant='rounded' width={260} height={40} />
                <Skeleton variant='rounded' width={180} height={40} />
              </div>
            </div>
            <div className='flex gap-2'>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} variant='rounded' width={132} height={34} />
              ))}
            </div>
            <Skeleton variant='rounded' height={520} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default InternalControlTowerLoading
