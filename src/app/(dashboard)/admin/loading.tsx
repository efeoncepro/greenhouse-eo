import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

const KpiSkeleton = () => (
  <Card>
    <CardContent sx={{ p: 3.25 }}>
      <Stack spacing={2}>
        <Skeleton variant='text' width={80} height={14} />
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
          <Stack spacing={0.75}>
            <Skeleton variant='text' width={120} height={22} />
            <Skeleton variant='text' width={180} height={16} />
          </Stack>
        </Stack>
        <Skeleton variant='rounded' width={42} height={42} sx={{ borderRadius: 2.5 }} />
        <Skeleton variant='text' width={60} height={32} />
      </Stack>
    </CardContent>
  </Card>
)

const TableRowSkeleton = () => (
  <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 1.5 }}>
    <Skeleton variant='circular' width={38} height={38} />
    <Stack spacing={0.5} sx={{ flex: 1 }}>
      <Skeleton variant='text' width='40%' height={16} />
      <Skeleton variant='text' width='25%' height={14} />
    </Stack>
    <Skeleton variant='rounded' width={80} height={24} sx={{ borderRadius: 999 }} />
    <Skeleton variant='text' width={50} height={16} />
    <Skeleton variant='text' width={40} height={16} />
    <Skeleton variant='text' width={70} height={16} />
  </Stack>
)

const DomainCardSkeleton = () => (
  <Card variant='outlined'>
    <CardContent sx={{ p: 4 }}>
      <Stack spacing={3}>
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Skeleton variant='rounded' width={40} height={40} />
          <Skeleton variant='text' width={140} height={24} />
        </Stack>
        <Skeleton variant='text' width='90%' height={16} />
        <Stack spacing={1}>
          <Skeleton variant='text' width='80%' height={14} />
          <Skeleton variant='text' width='70%' height={14} />
          <Skeleton variant='text' width='75%' height={14} />
        </Stack>
        <Stack spacing={1.5} sx={{ mt: 'auto' }}>
          <Skeleton variant='text' width={100} height={12} />
          <Stack direction='row' gap={1}>
            <Skeleton variant='rounded' width={90} height={24} sx={{ borderRadius: 999 }} />
            <Skeleton variant='rounded' width={70} height={24} sx={{ borderRadius: 999 }} />
          </Stack>
          <Skeleton variant='rounded' width={120} height={36} sx={{ borderRadius: 1 }} />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

export default function Loading() {
  return (
    <Stack spacing={6}>
      {/* Hero skeleton */}
      <Card>
        <CardContent sx={{ p: { xs: 4, md: 6 } }}>
          <Stack spacing={2.5}>
            <Skeleton variant='rounded' width={110} height={28} sx={{ borderRadius: 999 }} />
            <Skeleton variant='text' width={380} height={36} />
            <Skeleton variant='text' width='70%' height={18} />
            <Stack direction='row' spacing={2}>
              <Skeleton variant='rounded' width={130} height={38} sx={{ borderRadius: 1 }} />
              <Skeleton variant='rounded' width={170} height={38} sx={{ borderRadius: 1 }} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 4 KPI skeletons */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </Box>

      {/* Table skeleton */}
      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack spacing={0.75}>
              <Skeleton variant='text' width={160} height={24} />
              <Skeleton variant='text' width={320} height={16} />
            </Stack>
            <Stack direction='row' spacing={1}>
              {[80, 70, 90, 110, 70].map((w, i) => (
                <Skeleton key={i} variant='rounded' width={w} height={32} sx={{ borderRadius: 999 }} />
              ))}
            </Stack>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Domain cards skeleton */}
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={0.75}>
              <Skeleton variant='text' width={180} height={24} />
              <Skeleton variant='text' width={380} height={16} />
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }
              }}
            >
              <DomainCardSkeleton />
              <DomainCardSkeleton />
              <DomainCardSkeleton />
              <DomainCardSkeleton />
              <DomainCardSkeleton />
              <DomainCardSkeleton />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
