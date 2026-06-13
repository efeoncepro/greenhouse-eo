'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { NexaResponseToolbar } from '@/components/greenhouse/primitives'
import type { NexaResponseToolbarControl } from '@/components/greenhouse/primitives'

const DEMO_PLAIN_TEXT =
  'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo. Una puntuación alta requiere evidencia de resultado y trazabilidad de la contribución.'

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
            border: `1px solid ${theme.palette.divider}`
          })}
        >
          {children}
        </Box>
      </Stack>
    </CardContent>
  </Card>
)

const NexaResponseToolbarLabView = () => {
  const [lastControl, setLastControl] = useState<NexaResponseToolbarControl | null>(null)

  const handleControl = (control: NexaResponseToolbarControl) => setLastControl(control)

  return (
    <Stack spacing={5} data-capture='nexa-response-toolbar-lab'>
      <Stack spacing={1.5}>
        <CustomChip size='small' variant='tonal' color='primary' label='Primitive · NexaResponseToolbar' />
        <Typography variant='surfaceHeroTitle'>Nexa Response Toolbar</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 820 }}>
          Chrome de confianza canónico de una respuesta de Nexa (estilo AI Overview): feedback ¿útil? + copiar / compartir /
          regenerar. Distinto de las <strong>acciones de dominio</strong> (esas viven en la surface). 3 variants —{' '}
          <strong>embedded</strong> (en-flow del answer), <strong>floating</strong> (anclada a un mensaje, solo-ícono),{' '}
          <strong>docked</strong> (barra fija de surface). El feedback colapsa a un acuse tras votar; <code>copy</code> resuelve el
          portapapeles self-contained. Transversal: el <code>kind</code> resuelve a un variant, ningún dominio tiene chrome especial.
        </Typography>
        <Typography variant='caption' color='text.disabled'>
          Último control emitido: <strong>{lastControl ?? '—'}</strong>
        </Typography>
      </Stack>

      <SpecimenCard
        title='Variant · embedded'
        tint
        subtitle='En-flow al final del answer: prompt "¿Te sirvió?" + feedback a la izquierda, copiar/compartir/regenerar a la derecha, separados por un hairline superior. Es el default del NexaAnswersCanvas.'
      >
        <NexaResponseToolbar variant='embedded' plainText={DEMO_PLAIN_TEXT} onControl={handleControl} />
      </SpecimenCard>

      <SpecimenCard
        title='Variant · floating'
        subtitle='Anclada a un mensaje de chat: solo-ícono, alineada a la derecha, sin prompt. Para timelines densos donde el texto de cada botón sería ruido.'
      >
        <NexaResponseToolbar variant='floating' plainText={DEMO_PLAIN_TEXT} onControl={handleControl} />
      </SpecimenCard>

      <SpecimenCard
        title='Variant · docked'
        subtitle='Barra fija de surface (ancho completo, fondo paper, borde superior). Para una respuesta que ocupa toda la columna y necesita su chrome anclado al pie.'
      >
        <NexaResponseToolbar variant='docked' plainText={DEMO_PLAIN_TEXT} onControl={handleControl} />
      </SpecimenCard>

      <SpecimenCard
        title='Kinds → variant'
        subtitle='El kind semántico resuelve a un variant funcional. Ningún kind inventa chrome nuevo (transversal).'
      >
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <CustomChip size='small' variant='tonal' color='primary' label='responseSettle → embedded' />
          <CustomChip size='small' variant='tonal' color='info' label='chatMessage → floating' />
          <CustomChip size='small' variant='tonal' color='secondary' label='surfaceBar → docked' />
        </Stack>
      </SpecimenCard>
    </Stack>
  )
}

export default NexaResponseToolbarLabView
