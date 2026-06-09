// TASK-1015 — Loading skeleton del asistente de alta de cliente.
//
// Al navegar "Nuevo cliente" → wizard, la View Transition (ViewTransitionLink,
// TASK-525) hace el crossfade y este skeleton aparece al instante mientras el
// wizard (server, force-dynamic + capability checks + vista pesada) se resuelve.
// Dimensionado al shell real (header + stepper + dos paneles) para evitar CLS.
// El shimmer respeta prefers-reduced-motion vía el blanket global de MUI/globals.

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

import { GH_CLIENT_ONBOARDING } from '@/lib/copy/client-onboarding'

const STEP_COUNT = 6

const Loading = () => (
  <Box
    role='status'
    aria-busy='true'
    aria-live='polite'
    aria-label={GH_CLIENT_ONBOARDING.onboardingCases.wizardLoadingAria}
    sx={{ pb: 6 }}
  >
    {/* Breadcrumb + título + subtítulo */}
    <Stack spacing={1} sx={{ mb: 5 }}>
      <Skeleton variant='text' width={160} height={18} />
      <Skeleton variant='text' width='32%' height={40} />
      <Skeleton variant='text' width='55%' height={22} />
    </Stack>

    {/* Stepper (6 pasos) */}
    <Stack direction='row' spacing={2} sx={{ mb: 5, overflow: 'hidden' }}>
      {Array.from({ length: STEP_COUNT }).map((_, index) => (
        <Stack key={index} direction='row' spacing={1.5} alignItems='center' sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant='circular' width={32} height={32} sx={{ flexShrink: 0 }} />
          <Skeleton variant='text' width='70%' height={18} />
        </Stack>
      ))}
    </Stack>

    {/* Dos paneles: formulario (izq) + resumen (der) */}
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Stack spacing={4}>
              <Box>
                <Skeleton variant='text' width='40%' height={28} />
                <Skeleton variant='text' width='65%' height={18} />
              </Box>
              <Grid container spacing={4}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Grid key={index} size={{ xs: 12, sm: 6 }}>
                    <Skeleton variant='text' width='45%' height={16} />
                    <Skeleton variant='rounded' width='100%' height={44} />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Stack spacing={3}>
              <Skeleton variant='text' width='50%' height={22} />
              {Array.from({ length: 5 }).map((_, index) => (
                <Stack key={index} direction='row' justifyContent='space-between' spacing={2}>
                  <Skeleton variant='text' width='40%' height={16} />
                  <Skeleton variant='text' width='30%' height={16} />
                </Stack>
              ))}
              <Skeleton variant='rounded' width='100%' height={44} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
)

export default Loading
