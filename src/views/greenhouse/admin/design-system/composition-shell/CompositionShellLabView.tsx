'use client'

import { useCallback, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import {
  CompositionShell,
  type CompositionShellComposition,
  type CompositionShellTelemetryEvent
} from '@/components/greenhouse/primitives'
import { startViewTransition } from '@/lib/motion/view-transition'

/**
 * Lab interno del CompositionShell (TASK-1114 Slice 3 + TASK-1117/1119). INTERNAL ONLY — los clientes
 * nunca lo ven. Specimen vivo: recorre las 4 composiciones con el morph in-place (View Transitions) +
 * demuestra el enriquecimiento de fluidez (TASK-1117): entrada con stagger (`fluidity='rich'`), morph
 * interrumpible (`morphStrategy='interruptible'`), promoción shared-element (card → lead) y telemetry
 * opt-in. Verifica el substrato desktop+mobile vía GVC.
 */

const COMPOSITIONS: { value: CompositionShellComposition; label: string }[] = [
  { value: 'single', label: 'single' },
  { value: 'leadPlusContext', label: 'leadPlusContext' },
  { value: 'split', label: 'split' },
  { value: 'focused', label: 'focused' }
]

// Shared-element promotion (TASK-1117 Slice 2): la card protagonista y el bloque lead comparten un
// `view-transition-name` propio del Lab (NO el namespace reservado gh-region-*) — pero solo UNO lo lleva
// por snapshot (la card en `single`, el lead en `leadPlusContext`) → ≤1 elemento por nombre (constraint
// VT singleton) → el browser morfea la card CRECIENDO hacia el lead. Continuidad del objeto.
const SHARED_PROMOTE_NAME = 'lab-promote-shared'

const sharedPromoteStyle = (active: boolean) => (active ? { viewTransitionName: SHARED_PROMOTE_NAME } : undefined)

const MockCard = ({ title, body, promote = false }: { title: string; body: string; promote?: boolean }) => (
  <Card variant='outlined' style={promote ? sharedPromoteStyle(true) : undefined}>
    <CardContent>
      <Typography variant='subtitle2'>{title}</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
        {body}
      </Typography>
    </CardContent>
  </Card>
)

const MockPrimary = ({ promoteActive }: { promoteActive: boolean }) => (
  <Box
    sx={{
      display: 'grid',
      gap: 4,
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'
    }}
  >
    {/* La card protagonista lleva el shared name cuando NO hay lead montado (composición single) → puede
        promoverse al lead cuando el host cambie a leadPlusContext. */}
    <Box style={sharedPromoteStyle(promoteActive)}>
      <MockCard title='RpA Global' body='1.27 — benchmark adaptado · candidata a liderar' />
    </Box>
    <MockCard title='Assets activos' body='688 en movimiento' />
    <MockCard title='OTD% Global' body='87.4% — dato confiable' />
    <MockCard title='Feedback pendiente' body='1 requiere atención' />
  </Box>
)

const MockLead = ({ promoteActive }: { promoteActive: boolean }) => {
  const theme = useTheme()

  return (
    <Box
      component='section'
      style={sharedPromoteStyle(promoteActive)}
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
        Panel companion in-flow (`aside`): reserva espacio y el contenido principal reflowea — no lo tapa. En
        compact se vuelve drawer temporal (semántica modal, focus trap).
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
  const [fluidity, setFluidity] = useState<'baseline' | 'rich'>('rich')
  const [morphStrategy, setMorphStrategy] = useState<'viewTransition' | 'interruptible'>('viewTransition')
  const [eventCount, setEventCount] = useState(0)
  const [lastEvent, setLastEvent] = useState<string>('—')

  const changeComposition = (next: CompositionShellComposition) => {
    if (!next || next === composition) return

    // Estrategia de morph: VT estructural (host dispara startViewTransition) vs interrumpible
    // (framer-motion `layout` redirige — el host NO envuelve en VT). Coexisten, nunca sobre el mismo morph.
    if (morphStrategy === 'interruptible') {
      setComposition(next)
    } else {
      void startViewTransition(() => setComposition(next))
    }
  }

  const handleTelemetry = useCallback((event: CompositionShellTelemetryEvent) => {
    setEventCount(c => c + 1)
    setLastEvent(`${event.name} → ${event.composition}`)
  }, [])

  // Promoción activa solo en el par single↔leadPlusContext (la card crece al lead).
  const promotePrimaryCard = composition === 'single'
  const promoteLead = composition === 'leadPlusContext'

  return (
    <Stack spacing={6} sx={{ p: { xs: 4, md: 6 } }} data-capture='composition-shell-lab'>
      <Box>
        <Typography variant='h4'>Composition Shell</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
          Substrato de coreografía de layout (TASK-1114) + fluidez (TASK-1117). Cambiá de composición para ver
          el morph in-place. Con <code>fluidity=rich</code> el contenido entra con stagger; con{' '}
          <code>interruptible</code> el morph es redirigible (framer-motion). single → leadPlusContext promueve
          la card protagonista al lead (shared-element).
        </Typography>
      </Box>

      <Stack direction='row' spacing={4} flexWrap='wrap' useFlexGap alignItems='center'>
        <Stack spacing={1}>
          <Typography variant='caption' color='text.secondary'>
            Composición
          </Typography>
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
        </Stack>

        <Stack spacing={1}>
          <Typography variant='caption' color='text.secondary'>
            Fluidez
          </Typography>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={fluidity}
            onChange={(_, v) => v && setFluidity(v)}
            data-capture='composition-shell-fluidity'
          >
            <ToggleButton value='baseline'>baseline</ToggleButton>
            <ToggleButton value='rich'>rich</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Stack spacing={1}>
          <Typography variant='caption' color='text.secondary'>
            Morph
          </Typography>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={morphStrategy}
            onChange={(_, v) => v && setMorphStrategy(v)}
            disabled={fluidity !== 'rich'}
            data-capture='composition-shell-morph-strategy'
          >
            <ToggleButton value='viewTransition'>viewTransition</ToggleButton>
            <ToggleButton value='interruptible'>interruptible</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Chip
          variant='tonal'
          color='primary'
          label={`telemetry: ${eventCount} · ${lastEvent}`}
          data-capture='composition-shell-telemetry-chip'
        />
      </Stack>

      <CompositionShell
        composition={composition}
        fluidity={fluidity}
        morphStrategy={morphStrategy}
        onTelemetry={handleTelemetry}
        telemetrySource='design-system-lab'
        regions={{
          lead: <MockLead promoteActive={promoteLead} />,
          primary: <MockPrimary promoteActive={promotePrimaryCard} />,
          aside: <MockAside />,
          dock: <MockDock />
        }}
      />
    </Stack>
  )
}

export default CompositionShellLabView
