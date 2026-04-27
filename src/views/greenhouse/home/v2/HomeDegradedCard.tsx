'use client'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'

import type { HomeBlockEnvelope } from '@/lib/home/contract'

interface HomeDegradedCardProps {
  envelope: HomeBlockEnvelope
}

const labelByBlockId: Record<string, string> = {
  'hero-ai': 'Asistente Nexa',
  'pulse-strip': 'Tu pulso',
  'today-inbox': 'Tu día',
  'closing-countdown': 'Cierre del período',
  'ai-insights-bento': 'Nexa Insights',
  'recents-rail': 'Continúa con',
  'reliability-ribbon': 'Estado de plataforma'
}

export const HomeDegradedCard = ({ envelope }: HomeDegradedCardProps) => {
  const label = labelByBlockId[envelope.blockId] ?? envelope.blockId

  return (
    <Card variant='outlined'>
      <CardContent sx={{ p: 0 }}>
        <Alert severity={envelope.outcome === 'error' ? 'warning' : 'info'} variant='outlined' sx={{ border: 0 }}>
          <AlertTitle>{label} no disponible</AlertTitle>
          {envelope.outcome === 'degraded'
            ? 'Estamos esperando datos. Reintenta en unos segundos.'
            : 'Esta sección tuvo un error. Tu equipo de plataforma ya fue notificado.'}
        </Alert>
      </CardContent>
    </Card>
  )
}

export default HomeDegradedCard
