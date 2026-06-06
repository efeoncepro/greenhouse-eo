'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GreenhouseAsyncActionButton, GreenhouseCommandFeedback, GreenhouseStateTransition } from '@/components/greenhouse/primitives'
import type {
  GreenhouseAsyncActionState,
  GreenhouseCommandFeedbackTone,
  GreenhouseStateTransitionTone,
  GreenhouseStateTransitionVariant
} from '@/components/greenhouse/primitives'

type AsyncActionExample = {
  state: GreenhouseAsyncActionState
  title: string
  description: string
  label: string
  loadingLabel?: string
  successLabel?: string
  errorLabel?: string
  icon?: string
  variant?: 'contained' | 'tonal' | 'outlined'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
}

type CommandFeedbackExample = {
  tone: GreenhouseCommandFeedbackTone
  title: string
  description: string
  actionLabel?: string
  icon?: string
  timestamp?: string
  referenceId?: string
  compact?: boolean
}

type StateTransitionExample = {
  tone: GreenhouseStateTransitionTone
  title: string
  description: string
  fromLabel: string
  toLabel: string
  timestamp?: string
  referenceId?: string
  variant?: GreenhouseStateTransitionVariant
  active?: boolean
}

const ACTION_EXAMPLES: AsyncActionExample[] = [
  {
    state: 'idle',
    title: 'Ready command',
    description: 'Accion disponible, sin feedback falso antes del click.',
    label: 'Generar PDF',
    loadingLabel: 'Generando',
    icon: 'tabler-file-type-pdf'
  },
  {
    state: 'loading',
    title: 'In-flight command',
    description: 'Bloquea doble submit y comunica progreso localizado.',
    label: 'Enviar',
    loadingLabel: 'Enviando',
    icon: 'tabler-send'
  },
  {
    state: 'success',
    title: 'Completed command',
    description: 'Confirma resultado sin depender solo de toast efimero.',
    label: 'Guardar',
    successLabel: 'Guardado',
    icon: 'tabler-device-floppy',
    color: 'success'
  },
  {
    state: 'error',
    title: 'Recoverable command',
    description: 'Mantiene la accion visible y orientada a retry.',
    label: 'Enviar',
    errorLabel: 'Reintentar envio',
    icon: 'tabler-send',
    color: 'error'
  },
  {
    state: 'loading',
    title: 'Secondary tonal',
    description: 'Feedback sobrio para acciones no primarias.',
    label: 'Validar policy',
    loadingLabel: 'Validando',
    icon: 'tabler-shield-check',
    variant: 'tonal',
    color: 'secondary'
  },
  {
    state: 'success',
    title: 'Audit-safe action',
    description: 'Accion sensible completada con señal textual + icono.',
    label: 'Aprobar',
    successLabel: 'Aprobado',
    icon: 'tabler-check',
    variant: 'outlined',
    color: 'success'
  }
]

const FEEDBACK_EXAMPLES: CommandFeedbackExample[] = [
  {
    tone: 'success',
    title: 'PDF generado',
    description: 'El documento quedo listo para revisar o adjuntar al envio.',
    actionLabel: 'Abrir documento',
    icon: 'tabler-file-type-pdf',
    timestamp: 'hace 1m',
    referenceId: 'DOC-2481'
  },
  {
    tone: 'error',
    title: 'No se pudo enviar',
    description: 'La solicitud fallo antes de salir al proveedor. Puedes reintentar sin duplicar el comando.',
    actionLabel: 'Reintentar',
    icon: 'tabler-refresh',
    timestamp: 'hace 12s',
    referenceId: 'CMD-917'
  },
  {
    tone: 'retrying',
    title: 'Reintentando sync',
    description: 'Greenhouse esta recuperando el callback pendiente sin bloquear tu trabajo.',
    timestamp: 'intento 2 de 3',
    referenceId: 'SYNC-044'
  },
  {
    tone: 'warning',
    title: 'Guardado con advertencia',
    description: 'La accion fue registrada, pero queda evidencia por asociar antes de cerrar.',
    actionLabel: 'Ver pendientes',
    icon: 'tabler-list-check',
    timestamp: 'hace 3m'
  },
  {
    tone: 'info',
    title: 'Accion programada',
    description: 'El comando quedo en cola y se ejecutara cuando el proveedor este disponible.',
    timestamp: 'proximo intento 09:30',
    compact: true
  }
]

const STATE_TRANSITION_EXAMPLES: StateTransitionExample[] = [
  {
    tone: 'success',
    title: 'Aprobacion registrada',
    description: 'La fila confirma el cambio sin depender de color ni toast.',
    fromLabel: 'Pendiente',
    toLabel: 'Aprobado',
    timestamp: 'hace 2s',
    referenceId: 'WF-1842'
  },
  {
    tone: 'info',
    title: 'Sync completado',
    description: 'El panel muestra que la fuente externa ya actualizo el dato.',
    fromLabel: 'Esperando callback',
    toLabel: 'Sincronizado',
    timestamp: 'ahora',
    referenceId: 'SYNC-210'
  },
  {
    tone: 'warning',
    title: 'Revision requerida',
    description: 'El cambio es valido, pero queda un pendiente operacional.',
    fromLabel: 'Validado',
    toLabel: 'Con advertencia',
    timestamp: 'hace 4m',
    referenceId: 'POL-078'
  },
  {
    tone: 'error',
    title: 'Bloqueo detectado',
    description: 'Comunica el nuevo estado bloqueado y conserva el contexto anterior.',
    fromLabel: 'En progreso',
    toLabel: 'Bloqueado',
    timestamp: 'hace 12s',
    referenceId: 'ERR-509'
  },
  {
    tone: 'neutral',
    title: 'Owner reasignado',
    description: 'Cambio no critico para filas densas o actividad lateral.',
    fromLabel: 'Equipo payroll',
    toLabel: 'Equipo finanzas',
    timestamp: 'hace 8m',
    variant: 'inline',
    active: false
  }
]

const AsyncActionCard = ({ example }: { example: AsyncActionExample }) => (
  <Card
    variant='outlined'
    sx={theme => ({
      backgroundColor: alpha(theme.palette.background.paper, 0.94)
    })}
  >
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Stack spacing={0.75}>
        <Typography variant='h6' sx={{ fontWeight: 800 }}>
          {example.title}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {example.description}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
          state={example.state}
        </Typography>
      </Stack>
      <Box>
        <GreenhouseAsyncActionButton
          state={example.state}
          loadingLabel={example.loadingLabel}
          successLabel={example.successLabel}
          errorLabel={example.errorLabel}
          startIcon={example.icon ? <i className={example.icon} /> : undefined}
          variant={example.variant ?? 'contained'}
          color={example.color}
          data-capture={`async-action-${example.state}-${example.title.toLowerCase().replaceAll(' ', '-')}`}
        >
          {example.label}
        </GreenhouseAsyncActionButton>
      </Box>
    </CardContent>
  </Card>
)

const CommandFeedbackCard = ({ example }: { example: CommandFeedbackExample }) => (
  <GreenhouseCommandFeedback
    tone={example.tone}
    title={example.title}
    description={example.description}
    actionLabel={example.actionLabel}
    actionIcon={example.icon ? <i className={example.icon} /> : undefined}
    timestamp={example.timestamp}
    referenceId={example.referenceId}
    compact={example.compact}
    dataCapture={`command-feedback-${example.tone}`}
  />
)

const StateTransitionCard = ({ example }: { example: StateTransitionExample }) => (
  <GreenhouseStateTransition
    tone={example.tone}
    variant={example.variant}
    active={example.active}
    title={example.title}
    description={example.description}
    fromLabel={example.fromLabel}
    toLabel={example.toLabel}
    timestamp={example.timestamp}
    referenceId={example.referenceId}
    dataCapture={`state-transition-${example.tone}`}
  />
)

const MicrointeractionsLabSection = () => (
  <Card variant='outlined' data-capture='microinteractions-lab'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
          Microinteractions Lab
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          Acciones async reutilizables
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Base para commands de producto con feedback localizado, a11y, reduced-motion y proteccion contra doble submit. El boton no
          reemplaza confirmaciones destructivas ni procesos largos; cubre acciones puntuales como guardar, enviar, aprobar, generar o
          validar.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }
        }}
      >
        {ACTION_EXAMPLES.map(example => (
          <AsyncActionCard key={`${example.title}-${example.state}`} example={example} />
        ))}
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
          Command feedback
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          Resultado persistente post-accion
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Complementa al boton async: confirma que ocurrio, muestra referencia o timing, y ofrece una salida clara cuando hay error o
          reintento. No reemplaza toasts globales ni alerts bloqueantes.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
        }}
      >
        {FEEDBACK_EXAMPLES.map(example => (
          <CommandFeedbackCard key={`${example.title}-${example.tone}`} example={example} />
        ))}
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
          State transitions
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          Cambios de estado visibles
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Feedback breve para rows, cards y panels cuando un objeto cambia de estado: muestra de donde venia, donde quedo y que
          referencia/timing acompana la transicion. No reemplaza historiales completos ni timelines de auditoria.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
        }}
      >
        {STATE_TRANSITION_EXAMPLES.map(example => (
          <StateTransitionCard key={`${example.title}-${example.tone}`} example={example} />
        ))}
      </Box>
    </CardContent>
  </Card>
)

export default MicrointeractionsLabSection
