'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import { CompositionShell, type CompositionShellComposition } from '@/components/greenhouse/primitives'
import { startViewTransition } from '@/lib/motion/view-transition'

/**
 * Lab interno del CompositionShell (TASK-1114 Slice 3). INTERNAL ONLY — los clientes nunca lo ven.
 * Specimen vivo: recorre las 4 composiciones (single / leadPlusContext / split / focused) con contenido
 * mock por región y dispara el morph in-place (View Transitions) al cambiar de composición. Verifica el
 * substrato (regiones singleton + reflow + a11y) desktop+mobile vía GVC.
 */

const COMPOSITIONS: { value: CompositionShellComposition; label: string }[] = [
  { value: 'single', label: 'single' },
  { value: 'leadPlusContext', label: 'leadPlusContext' },
  { value: 'split', label: 'split' },
  { value: 'focused', label: 'focused' }
]

const MockCard = ({ title, body }: { title: string; body: string }) => (
  <Card variant='outlined'>
    <CardContent>
      <Typography variant='subtitle2'>{title}</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
        {body}
      </Typography>
    </CardContent>
  </Card>
)

const MockPrimary = () => (
  <Box
    sx={{
      display: 'grid',
      gap: 4,
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'
    }}
  >
    <MockCard title='RpA Global' body='1.27 — benchmark adaptado' />
    <MockCard title='Assets activos' body='688 en movimiento' />
    <MockCard title='OTD% Global' body='87.4% — dato confiable' />
    <MockCard title='Feedback pendiente' body='1 requiere atención' />
  </Box>
)

const MockLead = () => {
  const theme = useTheme()

  return (
    <Box
      component='section'
      sx={{
        p: 5,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.action.hover
      }}
    >
      <Typography variant='subtitle1'>Respuesta de Nexa</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
        El bloque protagonista lidera arriba (modelo AI Overviews); el contenido del host persiste y condensa
        debajo, nunca desaparece.
      </Typography>
    </Box>
  )
}

const MockAside = () => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        p: 5,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        height: '100%'
      }}
    >
      <Typography variant='subtitle2'>Inspector</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
        Panel companion in-flow (`aside`): reserva espacio y el contenido principal reflowea — no lo tapa.
      </Typography>
    </Box>
  )
}

const MockDock = () => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper
      }}
    >
      <Typography variant='body2' color='text.secondary'>
        Composer / action dock (`dock`) — aditivo a cualquier composición.
      </Typography>
    </Box>
  )
}

const CompositionShellLabView = () => {
  const [composition, setComposition] = useState<CompositionShellComposition>('single')

  const changeComposition = (next: CompositionShellComposition) => {
    // El host dispara el morph: startViewTransition envuelve el setState → las regiones que persisten
    // (mismo view-transition-name) interpolan pos+size. Degrada honesto sin soporte / reduced-motion.
    void startViewTransition(() => setComposition(next))
  }

  return (
    <Stack spacing={6} sx={{ p: { xs: 4, md: 6 } }} data-capture='composition-shell-lab'>
      <Box>
        <Typography variant='h4'>Composition Shell</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
          Substrato de coreografía de layout (TASK-1114). Cambiá de composición para ver el morph in-place
          (View Transitions). Las regiones son singleton + query containers; el contenido es mock.
        </Typography>
      </Box>

      <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
        {COMPOSITIONS.map(c => (
          <Button
            key={c.value}
            variant={composition === c.value ? 'contained' : 'tonal'}
            onClick={() => changeComposition(c.value)}
            data-capture={`composition-shell-control-${c.value}`}
          >
            {c.label}
          </Button>
        ))}
      </Stack>

      <CompositionShell
        composition={composition}
        regions={{
          lead: <MockLead />,
          primary: <MockPrimary />,
          aside: <MockAside />,
          dock: <MockDock />
        }}
      />
    </Stack>
  )
}

export default CompositionShellLabView
