'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GreenhouseLoadingSurface } from '@/components/greenhouse/primitives'
import type { GreenhouseLoadingSurfaceVariant } from '@/components/greenhouse/primitives'

type LoadingLabItem = {
  variant: GreenhouseLoadingSurfaceVariant
  title: string
  description: string
  job: string
  capture: string
}

const LAB_ITEMS: LoadingLabItem[] = [
  {
    variant: 'brandSplash',
    title: 'Workspace boot',
    description: 'Transicion premium cuando la sesion entra al portal.',
    job: 'Auth redirect, startup policy, workspace handoff.',
    capture: 'loading-lab-brand-splash'
  },
  {
    variant: 'aiThinking',
    title: 'Nexa reasoning',
    description: 'IA analizando senales sin caer en un spinner generico.',
    job: 'Drafting, insights, summaries and advisory states.',
    capture: 'loading-lab-ai-thinking'
  },
  {
    variant: 'pageSkeleton',
    title: 'Data weave page',
    description: 'Skeleton con estructura viva para dashboards y workbenches.',
    job: 'Route-level loading with CLS prevention.',
    capture: 'loading-lab-page-skeleton'
  },
  {
    variant: 'tableSkeleton',
    title: 'Governance table',
    description: 'Carga de filas, filtros y comparacion sin tabla fantasma plana.',
    job: 'Admin lists, finance ledgers, approval queues.',
    capture: 'loading-lab-table-skeleton'
  },
  {
    variant: 'panelSkeleton',
    title: 'Context panel',
    description: 'Carga compacta para drawers, sidecars, facets y cards densas.',
    job: 'Contextual surfaces that should not block the whole route.',
    capture: 'loading-lab-panel-skeleton'
  },
  {
    variant: 'progressRail',
    title: 'Checkpoint rail',
    description: 'Proceso por etapas, con progreso verificable y no magico.',
    job: 'Runbooks, generation pipelines, sync and recovery flows.',
    capture: 'loading-lab-progress-rail'
  }
]

const LAB_STEPS = [
  { label: 'Resolver contexto', status: 'done' as const },
  { label: 'Componer evidencia', status: 'active' as const },
  { label: 'Entregar resultado', status: 'pending' as const }
]

const LabCard = ({ item }: { item: LoadingLabItem }) => (
  <Card
    variant='outlined'
    sx={theme => ({
      height: '100%',
      backgroundColor: alpha(theme.palette.background.paper, 0.94)
    })}
  >
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%' }}>
      <Stack spacing={0.75}>
        <Typography variant='h6' sx={{ fontWeight: 800 }}>
          {item.title}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {item.description}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
          {item.job}
        </Typography>
      </Stack>
      <Box sx={{ mt: 'auto' }}>
        <GreenhouseLoadingSurface
          variant={item.variant}
          kind={item.capture}
          title={item.title}
          description={item.description}
          compact
          rows={5}
          steps={LAB_STEPS}
          dataCapture={item.capture}
        />
      </Box>
    </CardContent>
  </Card>
)

const InlineActionDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack spacing={0.75}>
        <Typography variant='h6' sx={{ fontWeight: 800 }}>
          Inline action
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Acciones chicas que no merecen bloquear la pantalla completa.
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
          Save, send, reconcile, refresh, inline command.
        </Typography>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <GreenhouseLoadingSurface
          variant='inlineAction'
          kind='inlineSave'
          title='Guardando cambios'
          description='Persistiendo una accion local.'
          dataCapture='loading-lab-inline-action'
        />
        <Typography variant='caption' color='text.secondary'>
          Sustituye el spinner suelto por una senal compacta con texto y ritmo.
        </Typography>
      </Stack>
    </CardContent>
  </Card>
)

const LoadingLabSection = () => (
  <Card variant='outlined' data-capture='loading-lab'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
          Loading Lab
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          Carga moderna para Greenhouse
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Este laboratorio no canoniza spinners existentes. Explora loaders como experiencias de producto: estructura, brand,
          razonamiento IA, procesos y acciones inline. La primitive reutiliza el stack Greenhouse, pero sube el nivel visual antes de
          migrar consumidores productivos.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
        }}
      >
        {LAB_ITEMS.map(item => (
          <LabCard key={item.variant} item={item} />
        ))}
      </Box>

      <InlineActionDemo />
    </CardContent>
  </Card>
)

export default LoadingLabSection
