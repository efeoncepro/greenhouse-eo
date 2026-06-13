'use client'

import { useCallback, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { NexaStreamingText } from '@/components/greenhouse/primitives'
import GreenhouseButton from '@/components/greenhouse/primitives/GreenhouseButton'

const DEMO_BODY =
  'La lectura útil está en la relación entre señales; Impacto abre la base solo si hay evidencia de resultado y trazabilidad de la contribución, no por volumen de actividad.'

const STREAM_BODY = 'Impacto mide el efecto observable sobre el resultado del cliente o del equipo. Una puntuación alta exige evidencia y trazabilidad.'

// Generador async fake del shape del NexaChatProvider (TASK-1091): emite el texto por palabras.
// Rápido (auto-asienta antes de la primera marca GVC) → la captura por defecto es determinística.
async function* fakeChunkStream(text: string, chunkMs = 45): AsyncGenerator<string> {
  const parts = text.split(/(\s+)/)

  for (const part of parts) {
    await new Promise(resolve => setTimeout(resolve, chunkMs))
    yield part
  }
}

const SpecimenCard = ({ title, subtitle, tint, children }: { title: string; subtitle: string; tint?: boolean; children: React.ReactNode }) => (
  <Card variant='outlined'>
    <CardContent>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant='h6'>{title}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {subtitle}
          </Typography>
        </Stack>
        <Box
          sx={theme => ({
            p: 4,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            backgroundColor: tint ? alpha(theme.palette.primary.main, 0.02) : theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            minInlineSize: 0
          })}
        >
          {children}
        </Box>
      </Stack>
    </CardContent>
  </Card>
)

const StreamSpecimen = () => {
  // `runId` reinicia el generador (la primitive es keyed) → "Reproducir" re-streamea.
  const [runId, setRunId] = useState(0)
  const replay = useCallback(() => setRunId(id => id + 1), [])

  return (
    <Stack spacing={2.5} data-capture='nexa-streaming-text-stream-specimen'>
      <NexaStreamingText key={runId} mode='stream' stream={fakeChunkStream(STREAM_BODY)} />
      <GreenhouseButton
        variant='outlined'
        tone='secondary'
        size='small'
        leadingIconClassName='tabler-refresh'
        dataCapture='nexa-streaming-text-replay'
        onClick={replay}
      >
        Reproducir stream
      </GreenhouseButton>
    </Stack>
  )
}

const NexaStreamingTextLabView = () => (
  <Stack spacing={5} data-capture='nexa-streaming-text-lab'>
    <Stack spacing={1.5}>
      <CustomChip size='small' variant='tonal' color='primary' label='Primitive · NexaStreamingText' />
      <Typography variant='surfaceHeroTitle'>Nexa Streaming Text</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 820 }}>
        El revelado progresivo de la respuesta de Nexa (el &quot;feel&quot; del asistente que escribe). Transversal: lo consume
        cualquier surface conversacional. 2 modos — <strong>value</strong> (contenido completo, revela una fracción con caret;
        es la depiction del canvas) y <strong>stream</strong> (consume chunks reales del provider, abort-safe). El caret está
        tokenizado; <strong>never-hidden</strong> y <strong>reduced-motion</strong> horneados: bajo{' '}
        <code>prefers-reduced-motion</code> el contenido se asienta completo sin caret, el texto NUNCA queda atrapado invisible.
      </Typography>
    </Stack>

    <SpecimenCard
      title='Mode · value (revelando 60%)'
      tint
      subtitle='Recibe el texto completo y revela revealedFraction (default 0.6, mín 24 chars) + caret. Misma fórmula que el mockup del canvas (migración byte-idéntica).'
    >
      <NexaStreamingText value={DEMO_BODY} />
    </SpecimenCard>

    <SpecimenCard
      title='Mode · value (asentado, sin caret)'
      subtitle='revealedFraction=1 → estado asentado: texto completo, sin caret. Es a lo que colapsa bajo reduced-motion.'
    >
      <NexaStreamingText value={DEMO_BODY} revealedFraction={1} />
    </SpecimenCard>

    <SpecimenCard
      title='Mode · stream (chunks reales)'
      subtitle='Consume un AsyncIterable<string> (shape del NexaChatProvider) y acumula chunks con caret mientras llegan. Abort-safe: si se corta, asienta lo recibido. Reproducí para verlo llegar.'
    >
      <StreamSpecimen />
    </SpecimenCard>

    <SpecimenCard
      title='Modos → comportamiento'
      subtitle='Los modos son el eje funcional (no hay kinds de dominio: el revelado es un mecanismo puro, transversal).'
    >
      <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
        <CustomChip size='small' variant='tonal' color='primary' label='value → revela fracción (mockup)' />
        <CustomChip size='small' variant='tonal' color='info' label='stream → acumula chunks (runtime)' />
      </Stack>
    </SpecimenCard>
  </Stack>
)

export default NexaStreamingTextLabView
