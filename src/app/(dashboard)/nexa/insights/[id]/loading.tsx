// TASK-947 — Loading state canonical (TASK-946 framework #2 + skeleton sized).
//
// Skeleton dimensionado al contenido final para prevenir CLS:
// - Back link + caption (1 row).
// - Title row + chips (2 rows).
// - 3 section cards (anomaly / root cause / action).
// - Metadata accordion (collapsed by default — solo header skeleton).

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

import { GH_NEXA } from '@/config/greenhouse-nomenclature'

const Loading = () => (
  <Stack
    spacing={6}
    sx={{ py: 4 }}
    component='main'
    role='status'
    aria-busy='true'
    aria-live='polite'
    aria-label={GH_NEXA.detail_loading_aria}
  >
    {/* Back link + last-updated caption */}
    <Box>
      <Skeleton variant='text' width={120} height={20} />
      <Skeleton variant='text' width={180} height={16} sx={{ mt: 1 }} />
    </Box>

    {/* Title row + chips */}
    <Stack spacing={2}>
      <Skeleton variant='text' width='70%' height={40} />
      <Stack direction='row' spacing={1.5}>
        <Skeleton variant='rounded' width={80} height={24} />
        <Skeleton variant='rounded' width={120} height={24} />
      </Stack>
    </Stack>

    {/* 3 section cards */}
    {[0, 1, 2].map(idx => (
      <Card
        key={idx}
        elevation={0}
        sx={theme => ({
          border: `1px solid ${theme.palette.divider}`,
          borderLeft: `4px solid ${theme.palette.divider}`
        })}
      >
        <CardHeader
          avatar={<Skeleton variant='rounded' width={40} height={40} />}
          title={<Skeleton variant='text' width={180} height={28} />}
        />
        <CardContent>
          <Stack spacing={1}>
            <Skeleton variant='text' width='95%' />
            <Skeleton variant='text' width='90%' />
            <Skeleton variant='text' width='60%' />
          </Stack>
        </CardContent>
      </Card>
    ))}

    {/* Metadata accordion */}
    <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant='rounded' width={40} height={40} />
        <Skeleton variant='text' width={160} height={24} />
      </Box>
    </Card>
  </Stack>
)

export default Loading
