'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { NexaActionProposal } from '@/lib/nexa/actions/types'
import { NexaActionProposalCard } from '@/views/greenhouse/home/components/NexaActionProposalCard'

// Mockup TASK-1137 — confirm-card de acción gobernada en el chat. Renderiza la tarjeta tal como la
// ve el usuario tras pedirle a Nexa una acción: el LLM PROPONE, el humano confirma. Datos mock, sin
// efecto productivo (no se confirma en el mockup). GVC de la tarjeta (desktop + mobile).

const FUTURE_ISO = new Date(Date.now() + 5 * 60 * 1000).toISOString()

const lowSensitivityProposal: NexaActionProposal = {
  contractVersion: 'nexa-action-proposal.v1',
  proposalId: 'nexa-act-demo-low',
  actionKey: 'mark_notifications_read',
  intent: 'Marcar todas tus notificaciones como leídas',
  sensitivity: 'low',
  preview: {
    title: 'Marcar notificaciones como leídas',
    summary: 'Tienes 12 notificaciones sin leer. Al confirmar, se marcarán todas como leídas.',
    metrics: [{ label: 'Sin leer', value: '12' }]
  },
  confirmation: {
    title: 'Marcar todas como leídas',
    body: 'Se marcarán todas tus notificaciones como leídas. Esta acción afecta solo a tu cuenta.',
    confirmLabel: 'Marcar como leídas',
    cancelLabel: 'Cancelar'
  },
  execution: {
    confirmEndpoint: '/api/nexa/actions/mark_notifications_read/confirm',
    idempotencyKey: 'nexa-act-idem-demo-low'
  },
  expiresAt: FUTURE_ISO
}

// Ejemplo ilustrativo de una acción de mayor sensibilidad (no es el piloto): muestra el chip de
// sensibilidad y un preview con más impacto. No hay acción registrada con esta key — es solo render.
const mediumSensitivityProposal: NexaActionProposal = {
  contractVersion: 'nexa-action-proposal.v1',
  proposalId: 'nexa-act-demo-medium',
  actionKey: 'demo_medium_action',
  intent: 'Reprogramar el recordatorio del ciclo',
  sensitivity: 'medium',
  preview: {
    title: 'Reprogramar recordatorio',
    summary: 'El recordatorio del ciclo actual se moverá del lunes 09:00 al miércoles 09:00.',
    metrics: [
      { label: 'De', value: 'Lun 09:00' },
      { label: 'A', value: 'Mié 09:00' }
    ]
  },
  confirmation: {
    title: 'Reprogramar recordatorio',
    body: 'El recordatorio se enviará el nuevo día/hora. Afecta a las personas del ciclo.',
    confirmLabel: 'Reprogramar',
    cancelLabel: 'Cancelar'
  },
  execution: {
    confirmEndpoint: '/api/nexa/actions/demo_medium_action/confirm',
    idempotencyKey: 'nexa-act-idem-demo-medium'
  },
  expiresAt: FUTURE_ISO
}

const NexaActionProposalMockupView = () => (
  <Box sx={{ p: { xs: 3, md: 6 } }} data-capture='nexa-action-proposal-mockup'>
    <Typography variant='h4' sx={{ mb: 1 }}>
      Confirmación de acción gobernada
    </Typography>
    <Typography variant='body2' color='text.secondary' sx={{ mb: 4, maxWidth: 560 }}>
      Así se ve la tarjeta en el chat cuando Nexa propone una acción. El modelo NUNCA ejecuta: el
      humano confirma y un endpoint determinístico ejecuta el command idempotente.
    </Typography>

    <Stack spacing={4} sx={{ maxWidth: 560 }}>
      <Box>
        <Typography variant='overline' color='text.secondary'>
          Piloto · sensibilidad baja
        </Typography>
        <Typography variant='body2' sx={{ mb: 0.5 }}>
          Claro, puedo marcar tus notificaciones como leídas. Confirma para hacerlo:
        </Typography>
        <NexaActionProposalCard proposal={lowSensitivityProposal} />
      </Box>

      <Box>
        <Typography variant='overline' color='text.secondary'>
          Ejemplo · sensibilidad media (chip de sensibilidad)
        </Typography>
        <NexaActionProposalCard proposal={mediumSensitivityProposal} />
      </Box>
    </Stack>
  </Box>
)

export default NexaActionProposalMockupView
