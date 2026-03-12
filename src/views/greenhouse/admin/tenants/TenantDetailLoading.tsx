import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

const TenantDetailLoading = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, xl: 8 }}>
                <Stack direction='row' spacing={3} alignItems='center'>
                  <Skeleton variant='rounded' width={88} height={88} />
                  <Stack spacing={1.25} sx={{ flexGrow: 1 }}>
                    <Skeleton variant='text' width='30%' height={28} />
                    <Skeleton variant='text' width='55%' height={40} />
                    <Skeleton variant='text' width='85%' height={22} />
                    <Skeleton variant='rounded' width='70%' height={18} />
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, xl: 4 }}>
                <Grid container spacing={2}>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Grid key={index} size={{ xs: 6 }}>
                      <Skeleton variant='rounded' height={92} />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Skeleton variant='rounded' height={48} />
      </Grid>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Skeleton variant='text' width='25%' height={34} />
              <Grid container spacing={3}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Grid key={index} size={{ xs: 12, md: 4 }}>
                    <Skeleton variant='rounded' height={116} />
                  </Grid>
                ))}
              </Grid>
              <Skeleton variant='rounded' height={360} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Skeleton variant='text' width='40%' height={30} />
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} variant='rounded' height={56} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default TenantDetailLoading
