'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

import type { HomeBlockId } from '@/lib/home/contract'

/**
 * Layout-matching skeletons per block. The skeleton shape is the layout
 * shape — same Grid + same Card heights — so the swap is visually
 * coherent (no jump). Vuexy `Skeleton` underneath, no spinner.
 */

const PulseStripSkeleton = () => (
  <Grid container spacing={6}>
    {Array.from({ length: 4 }).map((_, idx) => (
      <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Skeleton variant='rounded' width={40} height={40} sx={{ mb: 2 }} />
            <Skeleton variant='text' width='60%' height={36} />
            <Skeleton variant='text' width='40%' height={20} sx={{ mt: 1 }} />
          </CardContent>
          <Skeleton variant='rectangular' height={100} />
        </Card>
      </Grid>
    ))}
  </Grid>
)

const HeroSkeleton = () => (
  <Card>
    <CardContent>
      <Stack spacing={3} alignItems='center'>
        <Skeleton variant='rounded' width={56} height={56} />
        <Skeleton variant='text' width='40%' height={32} />
        <Skeleton variant='text' width='25%' height={16} />
        <Skeleton variant='rounded' width='100%' height={56} sx={{ maxWidth: 720 }} />
        <Stack direction='row' spacing={1.5} flexWrap='wrap' justifyContent='center'>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} variant='rounded' width={140} height={32} />
          ))}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const SectionSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <Card>
    <CardContent>
      <Skeleton variant='text' width='30%' height={24} sx={{ mb: 2 }} />
      <Stack spacing={1.5}>
        {Array.from({ length: rows }).map((_, idx) => (
          <Stack key={idx} direction='row' spacing={2} alignItems='center'>
            <Skeleton variant='circular' width={32} height={32} />
            <Stack flex={1} spacing={0.5}>
              <Skeleton variant='text' width='80%' height={18} />
              <Skeleton variant='text' width='40%' height={14} />
            </Stack>
          </Stack>
        ))}
      </Stack>
    </CardContent>
  </Card>
)

const BentoSkeleton = () => (
  <Grid container spacing={4}>
    {Array.from({ length: 4 }).map((_, idx) => (
      <Grid key={idx} size={{ xs: 12, md: 6 }}>
        <Card sx={{ minHeight: 140 }}>
          <CardContent>
            <Skeleton variant='text' width='60%' height={20} />
            <Skeleton variant='text' width='80%' height={32} sx={{ mt: 2 }} />
            <Skeleton variant='text' width='40%' height={16} sx={{ mt: 1 }} />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
)

const RailSkeleton = () => (
  <Stack spacing={2}>
    <Skeleton variant='text' width='40%' height={20} />
    {Array.from({ length: 5 }).map((_, idx) => (
      <Skeleton key={idx} variant='rounded' height={56} />
    ))}
  </Stack>
)

const RibbonSkeleton = () => (
  <Card>
    <CardContent>
      <Stack spacing={1.5}>
        <Skeleton variant='text' width='60%' height={16} />
        <Stack direction='row' spacing={1.5} flexWrap='wrap'>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} variant='rounded' width={92} height={28} />
          ))}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

export const HomeBlockSkeleton = ({ blockId }: { blockId: HomeBlockId }) => {
  switch (blockId) {
    case 'hero-ai':
      return <HeroSkeleton />
    case 'pulse-strip':
      return <PulseStripSkeleton />
    case 'today-inbox':
    case 'closing-countdown':
      return <SectionSkeleton rows={4} />
    case 'ai-insights-bento':
      return <BentoSkeleton />
    case 'recents-rail':
      return <RailSkeleton />
    case 'reliability-ribbon':
      return <RibbonSkeleton />
    default:
      return <SectionSkeleton />
  }
}

export default HomeBlockSkeleton
