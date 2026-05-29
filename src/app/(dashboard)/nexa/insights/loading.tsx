// TASK-950 — List page loading state canonical (TASK-946 framework #2).
//
// Skeleton dimensionado al contenido final para prevenir CLS:
// - Back link + caption (1 row).
// - Title row + chip count (2 rows).
// - Grid 1/2/3 col de N card skeletons.

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

import { GH_NEXA } from '@/config/greenhouse-nomenclature'

const SKELETON_CARDS = 6

const Loading = () => (
  <Stack
    spacing={6}
    sx={{ py: 4 }}
    component='main'
    role='status'
    aria-busy='true'
    aria-live='polite'
    aria-label={GH_NEXA.list_loading_aria}
  >
    {/* Back link */}
    <Box>
      <Skeleton variant='text' width={140} height={20} />
    </Box>

    {/* Title row + count chip */}
    <Stack spacing={2}>
      <Skeleton variant='text' width='40%' height={40} />
      <Stack direction='row' spacing={1.5}>
        <Skeleton variant='rounded' width={140} height={24} />
        <Skeleton variant='rounded' width={100} height={24} />
      </Stack>
    </Stack>

    {/* Grid de cards skeleton */}
    <Grid container spacing={4}>
      {Array.from({ length: SKELETON_CARDS }).map((_, idx) => (
        <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            elevation={0}
            sx={theme => ({
              border: `1px solid ${theme.palette.divider}`,
              borderLeft: `4px solid ${theme.palette.divider}`,
              height: '100%'
            })}
          >
            <CardContent>
              <Stack spacing={2}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Skeleton variant='rounded' width={32} height={32} />
                  <Skeleton variant='rounded' width={80} height={22} />
                </Stack>
                <Skeleton variant='text' width='90%' />
                <Skeleton variant='text' width='75%' />
                <Skeleton variant='text' width={120} height={24} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Stack>
)

export default Loading
