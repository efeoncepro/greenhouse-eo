'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import {
  GreenhouseAsyncActionButton,
  GreenhouseCommandFeedback,
  GreenhouseEvidenceAttachmentDropzone,
  GreenhouseFieldProvenancePeek,
  GreenhouseInlineValidation,
  GreenhouseInlineDecisionPrompt,
  GreenhouseStepperProgressMicro,
  GreenhouseStateTransition,
  GreenhouseThinkingBeat
} from '@/components/greenhouse/primitives'
import type {
  GreenhouseAsyncActionState,
  GreenhouseCommandFeedbackTone,
  GreenhouseEvidenceAttachmentState,
  GreenhouseEvidenceAttachmentVariant,
  GreenhouseFieldProvenanceConfidence,
  GreenhouseFieldProvenanceFreshness,
  GreenhouseFieldProvenanceSource,
  GreenhouseInlineDecisionState,
  GreenhouseInlineDecisionTone,
  GreenhouseInlineDecisionVariant,
  GreenhouseInlineValidationState,
  GreenhouseInlineValidationVariant,
  GreenhouseStepperProgressStep,
  GreenhouseStepperProgressVariant,
  GreenhouseStateTransitionTone,
  GreenhouseStateTransitionVariant,
  GreenhouseThinkingBeatKind,
  GreenhouseThinkingBeatVariant
} from '@/components/greenhouse/primitives'

type ThinkingBeatExample = {
  kind: GreenhouseThinkingBeatKind
  variant: GreenhouseThinkingBeatVariant
  title: string
  description: string
  label: string
}

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

const THINKING_BEAT_EXAMPLES: ThinkingBeatExample[] = [
  {
    kind: 'nexa',
    variant: 'inline',
    title: 'Nexa inline',
    description: 'Beat decorativo dentro de una frase mientras cambia el mensaje contextual.',
    label: 'Estoy separando señal de ruido'
  },
  {
    kind: 'assistant',
    variant: 'cluster',
    title: 'Assistant cluster',
    description: 'Señal compacta para prompts, sidecars o respuestas cortas sin parecer loader pesado.',
    label: 'Preparando respuesta'
  },
  {
    kind: 'sync',
    variant: 'standalone',
    title: 'Sync standalone',
    description: 'Estado semántico para sincronizaciones cortas o handoffs donde conviene anunciar actividad.',
    label: 'Sincronizando fuente externa'
  },
  {
    kind: 'neutral',
    variant: 'cluster',
    title: 'Neutral utility',
    description: 'Uso sobrio cuando la marca no debe dominar la superficie.',
    label: 'Procesando'
  }
]

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

type InlineValidationExample = {
  state: GreenhouseInlineValidationState
  variant: GreenhouseInlineValidationVariant
  title: string
  message: string
  detail?: string
  meta?: string
  actionLabel?: string
  icon?: string
}

type ProvenanceExample = {
  source: GreenhouseFieldProvenanceSource
  confidence: GreenhouseFieldProvenanceConfidence
  freshness: GreenhouseFieldProvenanceFreshness
  variant: 'icon' | 'chip' | 'inline'
  title: string
  fieldLabel: string
  sourceLabel: string
  valueLabel?: string
  updatedAt?: string
  referenceId?: string
  notes?: string[]
  triggerLabel?: string
}

type StepperExample = {
  title: string
  description: string
  variant: GreenhouseStepperProgressVariant
  steps: GreenhouseStepperProgressStep[]
}

type EvidenceExample = {
  state: GreenhouseEvidenceAttachmentState
  variant: GreenhouseEvidenceAttachmentVariant
  title: string
  description: string
  acceptedLabel?: string
  fileName?: string
  fileMeta?: string
  progress?: number
}

type DecisionExample = {
  tone: GreenhouseInlineDecisionTone
  state: GreenhouseInlineDecisionState
  variant: GreenhouseInlineDecisionVariant
  title: string
  description: string
  meta?: string
  primaryLabel: string
  secondaryLabel?: string
  tertiaryLabel?: string
  impactItems?: string[]
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

const INLINE_VALIDATION_EXAMPLES: InlineValidationExample[] = [
  {
    state: 'checking',
    variant: 'field',
    title: 'Field check',
    message: 'Validando RUT contra fuente canonica',
    detail: 'Evita guardar un perfil legal con identificador incompleto.',
    meta: 'campo person.legal_id'
  },
  {
    state: 'valid',
    variant: 'field',
    title: 'Positive field',
    message: 'Cuenta bancaria verificada',
    detail: 'La combinacion banco + cuenta ya paso el check operacional.',
    meta: 'hace 12s'
  },
  {
    state: 'warning',
    variant: 'section',
    title: 'Section warning',
    message: 'Falta evidencia por asociar',
    detail: 'El formulario puede guardarse, pero no deberia cerrarse sin respaldo.',
    actionLabel: 'Ver evidencia',
    icon: 'tabler-files'
  },
  {
    state: 'blocked',
    variant: 'section',
    title: 'Blocking issue',
    message: 'No se puede continuar',
    detail: 'El contrato requiere revision legal antes de generar el documento final.',
    actionLabel: 'Abrir revision',
    icon: 'tabler-scale'
  },
  {
    state: 'checking',
    variant: 'asyncCheck',
    title: 'Async policy check',
    message: 'Consultando policy de payroll',
    detail: 'El check corre sin bloquear la lectura del formulario.',
    meta: 'intento 1 de 2'
  },
  {
    state: 'error',
    variant: 'asyncCheck',
    title: 'Recoverable async error',
    message: 'No se pudo validar el proveedor',
    detail: 'Puedes reintentar sin perder los campos ingresados.',
    actionLabel: 'Reintentar',
    icon: 'tabler-refresh'
  },
  {
    state: 'valid',
    variant: 'summary',
    title: 'Form summary',
    message: 'Formulario listo para enviar',
    detail: 'Los checks requeridos pasaron y no quedan bloqueos abiertos.',
    meta: '8 de 8 checks'
  },
  {
    state: 'idle',
    variant: 'summary',
    title: 'Idle summary',
    message: 'Validacion pendiente',
    detail: 'El resumen aparece sobrio mientras el usuario completa datos.',
    meta: 'sin checks ejecutados'
  }
]

const PROVENANCE_EXAMPLES: ProvenanceExample[] = [
  {
    source: 'integration',
    confidence: 'verified',
    freshness: 'recent',
    variant: 'chip',
    title: 'HubSpot source',
    fieldLabel: 'Revenue owner · Organización',
    sourceLabel: 'HubSpot CRM · company.properties.owner',
    valueLabel: 'María Figueroa',
    updatedAt: 'sync hace 18m',
    referenceId: 'HS-20481',
    notes: ['La propiedad fue sincronizada desde el source of truth externo.', 'Sin override manual activo.'],
    triggerLabel: 'HubSpot'
  },
  {
    source: 'override',
    confidence: 'medium',
    freshness: 'partial',
    variant: 'inline',
    title: 'Manual override',
    fieldLabel: 'Cuenta bancaria · Payment profile',
    sourceLabel: 'Override operacional aprobado por Finanzas',
    valueLabel: 'Cuenta terminada en 8821',
    updatedAt: 'aprobado hace 2d',
    referenceId: 'OVR-7782',
    notes: ['El dato no debe asumirse como verdad bancaria externa.', 'Requiere revalidacion si cambia el beneficiario.'],
    triggerLabel: 'Override'
  },
  {
    source: 'calculated',
    confidence: 'high',
    freshness: 'live',
    variant: 'icon',
    title: 'Calculated value',
    fieldLabel: 'Gross margin · Payment order',
    sourceLabel: 'Motor financiero Greenhouse',
    valueLabel: '32.8%',
    updatedAt: 'calculado ahora',
    referenceId: 'CALC-PO-319',
    notes: ['Calculado desde obligaciones, fees y costos asociados al lote.']
  }
]

const STEPPER_EXAMPLES: StepperExample[] = [
  {
    title: 'Pipeline documental',
    description: 'Validar datos, renderizar PDF, empaquetar evidencia y enviar a firma.',
    variant: 'horizontal',
    steps: [
      { id: 'validate', label: 'Validar', description: 'Reglas legales y datos requeridos.', state: 'complete', meta: '8/8' },
      { id: 'render', label: 'Renderizar', description: 'PDF institucional Efeonce.', state: 'active', meta: 'en curso' },
      { id: 'pack', label: 'Empaquetar', description: 'Adjuntos y referencias.', state: 'pending' },
      { id: 'send', label: 'Enviar', description: 'Handoff a proveedor.', state: 'pending' }
    ]
  },
  {
    title: 'Payroll readiness',
    description: 'Compacto para panels densos con warnings operacionales.',
    variant: 'compact',
    steps: [
      { id: 'roster', label: 'Roster', state: 'complete' },
      { id: 'contracts', label: 'Contratos', state: 'warning', meta: '2 pendientes' },
      { id: 'calendar', label: 'Calendario', state: 'pending' }
    ]
  },
  {
    title: 'External handoff',
    description: 'Vertical para callbacks o procesos que necesitan conservar contexto.',
    variant: 'vertical',
    steps: [
      { id: 'queued', label: 'En cola', description: 'Comando aceptado por Greenhouse.', state: 'complete', meta: 'CMD-842' },
      { id: 'provider', label: 'Proveedor', description: 'Esperando respuesta externa.', state: 'active', meta: 'intento 1' },
      { id: 'reconcile', label: 'Conciliar', description: 'Aplicar callback al aggregate.', state: 'pending' }
    ]
  }
]

const EVIDENCE_EXAMPLES: EvidenceExample[] = [
  {
    state: 'idle',
    variant: 'panel',
    title: 'Adjuntar respaldo legal',
    description: 'Arrastra un PDF o imagen. La evidencia queda asociada al caso antes de cerrar.',
    acceptedLabel: 'PDF, PNG, JPG · máximo 10 MB'
  },
  {
    state: 'uploading',
    variant: 'panel',
    title: 'Subiendo comprobante',
    description: 'El archivo se está guardando en el vault privado.',
    acceptedLabel: 'No cierres este panel hasta completar la carga.',
    fileName: 'comprobante-transferencia.pdf',
    fileMeta: '2.4 MB · payment-order PO-319',
    progress: 62
  },
  {
    state: 'scanning',
    variant: 'compact',
    title: 'Inspeccionando evidencia',
    description: 'Validando tipo, tamaño, malware y asociación operacional.',
    fileName: 'contrato-firmado.pdf',
    fileMeta: 'ZapSign · firmado hace 4m',
    progress: 38
  },
  {
    state: 'verified',
    variant: 'compact',
    title: 'Evidencia verificada',
    description: 'El archivo pasó validación y quedó vinculado al expediente.',
    fileName: 'anexo-honorarios.pdf',
    fileMeta: 'asset ASSET-8842 · hace 12s'
  },
  {
    state: 'rejected',
    variant: 'compact',
    title: 'Archivo rechazado',
    description: 'El tipo de archivo no coincide con las reglas de este flujo.',
    acceptedLabel: 'Usa PDF firmado o imagen legible.',
    fileName: 'captura.zip',
    fileMeta: 'ZIP no permitido'
  }
]

const DECISION_EXAMPLES: DecisionExample[] = [
  {
    tone: 'warning',
    state: 'reviewing',
    variant: 'impact',
    title: 'Propagar cambio de cuenta bancaria',
    description: 'Este ajuste afecta pagos pendientes del mismo beneficiario.',
    meta: '4 órdenes abiertas · 1 lote en revisión',
    primaryLabel: 'Propagar cambio',
    secondaryLabel: 'Solo este perfil',
    tertiaryLabel: 'Cancelar',
    impactItems: ['Actualiza payment orders en estado draft.', 'No modifica lotes aprobados ni pagos ejecutados.', 'Registra audit trail y motivo operacional.']
  },
  {
    tone: 'info',
    state: 'idle',
    variant: 'choice',
    title: 'Resolver inconsistencia de fuente',
    description: 'El valor local difiere del último sync externo. Elige la fuente que debe prevalecer.',
    meta: 'HubSpot sync hace 18m',
    primaryLabel: 'Usar fuente externa',
    secondaryLabel: 'Mantener override'
  },
  {
    tone: 'error',
    state: 'blocked',
    variant: 'confirmation',
    title: 'No se puede cerrar el caso',
    description: 'Falta evidencia obligatoria para dejar trazabilidad suficiente.',
    meta: '2 checks bloqueantes',
    primaryLabel: 'Aplicar',
    secondaryLabel: 'Ver requisitos'
  },
  {
    tone: 'success',
    state: 'confirmed',
    variant: 'confirmation',
    title: 'Decision aplicada',
    description: 'La propagacion quedo registrada y el flujo puede continuar.',
    meta: 'AUD-3104',
    primaryLabel: 'Continuar'
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
        <Typography variant='h6'>
          {example.title}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {example.description}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
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

const ThinkingBeatCard = ({ example }: { example: ThinkingBeatExample }) => (
  <Card
    variant='outlined'
    sx={theme => ({
      backgroundColor: alpha(theme.palette.background.paper, 0.94)
    })}
  >
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Stack spacing={0.75}>
        <Typography variant='h6'>
          {example.title}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {example.description}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          kind={example.kind} · variant={example.variant}
        </Typography>
      </Stack>
      <Stack
        direction='row'
        spacing={1}
        alignItems='center'
        sx={theme => ({
          minHeight: 44,
          p: 1.5,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          backgroundColor: alpha(theme.palette.text.primary, 0.018)
        })}
      >
        <Typography variant='body2' color='text.secondary'>
          {example.label}
        </Typography>
        <GreenhouseThinkingBeat
          kind={example.kind}
          variant={example.variant}
          decorative={example.variant === 'inline'}
          dataCapture={`thinking-beat-${example.kind}-${example.variant}`}
        />
      </Stack>
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

const InlineValidationCard = ({ example }: { example: InlineValidationExample }) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant='h6'>
          {example.title}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          state={example.state} · variant={example.variant}
        </Typography>
      </Stack>
      <GreenhouseInlineValidation
        state={example.state}
        variant={example.variant}
        message={example.message}
        detail={example.detail}
        meta={example.meta}
        actionLabel={example.actionLabel}
        actionIcon={example.icon ? <i className={example.icon} /> : undefined}
        dataCapture={`inline-validation-${example.variant}-${example.state}`}
      />
    </CardContent>
  </Card>
)

const ProvenanceCard = ({ example }: { example: ProvenanceExample }) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant='h6'>
          {example.title}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          source={example.source}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          confidence={example.confidence} · freshness={example.freshness}
        </Typography>
      </Stack>
      <Box
        sx={theme => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          p: 1.5,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          backgroundColor: alpha(theme.palette.text.primary, 0.018)
        })}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant='caption' color='text.secondary'>
            {example.fieldLabel}
          </Typography>
          <Typography variant='h6' noWrap>
            {example.valueLabel ?? example.sourceLabel}
          </Typography>
        </Stack>
        <GreenhouseFieldProvenancePeek
          source={example.source}
          confidence={example.confidence}
          freshness={example.freshness}
          variant={example.variant}
          fieldLabel={example.fieldLabel}
          sourceLabel={example.sourceLabel}
          valueLabel={example.valueLabel}
          updatedAt={example.updatedAt}
          referenceId={example.referenceId}
          notes={example.notes}
          triggerLabel={example.triggerLabel}
          dataCapture={`field-provenance-${example.source}-${example.variant}`}
        />
      </Box>
    </CardContent>
  </Card>
)

const StepperCard = ({ example }: { example: StepperExample }) => (
  <GreenhouseStepperProgressMicro
    title={example.title}
    description={example.description}
    variant={example.variant}
    steps={example.steps}
    dataCapture={`stepper-progress-${example.variant}`}
  />
)

const EvidenceCard = ({ example }: { example: EvidenceExample }) => (
  <GreenhouseEvidenceAttachmentDropzone
    state={example.state}
    variant={example.variant}
    title={example.title}
    description={example.description}
    acceptedLabel={example.acceptedLabel}
    fileName={example.fileName}
    fileMeta={example.fileMeta}
    progress={example.progress}
    dataCapture={`evidence-dropzone-${example.state}-${example.variant}`}
  />
)

const DecisionCard = ({ example }: { example: DecisionExample }) => (
  <GreenhouseInlineDecisionPrompt
    tone={example.tone}
    state={example.state}
    variant={example.variant}
    title={example.title}
    description={example.description}
    meta={example.meta}
    primaryLabel={example.primaryLabel}
    secondaryLabel={example.secondaryLabel}
    tertiaryLabel={example.tertiaryLabel}
    impactItems={example.impactItems}
    primaryIcon={<i className='tabler-check' />}
    secondaryIcon={example.secondaryLabel ? <i className='tabler-arrows-exchange' /> : undefined}
    tertiaryIcon={example.tertiaryLabel ? <i className='tabler-x' /> : undefined}
    dataCapture={`inline-decision-${example.variant}-${example.state}`}
  />
)

const MicrointeractionsLabSection = () => (
  <Card variant='outlined' data-capture='microinteractions-lab'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary'>
          Microinteractions Lab
        </Typography>
        <Typography variant='h5'>
          Microinteracciones reutilizables
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Base para feedback localizado, a11y y reduced-motion en comandos, asistencia contextual, validaciones, procedencia,
          evidencia y decisiones inline.
        </Typography>
      </Stack>
      <Box data-capture='thinking-beat-lab' sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Stack spacing={1}>
          <Typography variant='overline' color='primary'>
            Thinking beat
          </Typography>
          <Typography variant='h5'>
            Señal viva para asistencia contextual
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
            Microinteraccion breve para comunicar que un asistente, sync o contexto esta preparando el siguiente mensaje. No reemplaza
            loaders de procesos largos; acompaña transiciones cortas sin mover el layout.
          </Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
          }}
        >
          {THINKING_BEAT_EXAMPLES.map(example => (
            <ThinkingBeatCard key={`${example.kind}-${example.variant}`} example={example} />
          ))}
        </Box>
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary'>
          Async action button
        </Typography>
        <Typography variant='h5'>
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
        <Typography variant='overline' color='primary'>
          Command feedback
        </Typography>
        <Typography variant='h5'>
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
          gridTemplateColumns: '1fr'
        }}
      >
        {FEEDBACK_EXAMPLES.map(example => (
          <CommandFeedbackCard key={`${example.title}-${example.tone}`} example={example} />
        ))}
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary'>
          State transitions
        </Typography>
        <Typography variant='h5'>
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
          gridTemplateColumns: '1fr'
        }}
      >
        {STATE_TRANSITION_EXAMPLES.map(example => (
          <StateTransitionCard key={`${example.title}-${example.tone}`} example={example} />
        ))}
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary'>
          Inline validation
        </Typography>
        <Typography variant='h5'>
          Validacion y recuperacion local
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Feedback cercano a campos, secciones y summaries cuando una regla local o async cambia de estado. La primitive comunica
          checking, valid, warning, error y blocked sin depender solo del color ni de mensajes globales.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: '1fr'
        }}
      >
        {INLINE_VALIDATION_EXAMPLES.map(example => (
          <InlineValidationCard key={`${example.title}-${example.state}-${example.variant}`} example={example} />
        ))}
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary'>
          Field provenance
        </Typography>
        <Typography variant='h5'>
          Procedencia y confianza del dato
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Microinteraccion para explicar de donde viene un campo, que tan confiable es y si esta fresco, parcial, manual u
          overriden. Evita que el usuario tenga que adivinar si un valor viene de sync, calculo, seed o decision operacional.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
        }}
      >
        {PROVENANCE_EXAMPLES.map(example => (
          <ProvenanceCard key={`${example.source}-${example.variant}`} example={example} />
        ))}
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary'>
          Stepper progress micro
        </Typography>
        <Typography variant='h5'>
          Progreso operativo compacto
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Senal compacta para procesos cortos de 3 a 5 pasos: documentos, payroll readiness, handoffs externos y pipelines con
          callbacks. No reemplaza wizards largos; mantiene contexto y estado actual sin inflar la vista.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: '1fr'
        }}
      >
        {STEPPER_EXAMPLES.map(example => (
          <StepperCard key={`${example.title}-${example.variant}`} example={example} />
        ))}
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary'>
          Evidence attachment
        </Typography>
        <Typography variant='h5'>
          Carga y verificacion de evidencia
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Dropzone enterprise para adjuntos operativos con estados de carga, inspeccion, verificacion y rechazo. Esta primitive es
          UI/state; los adapters de dominio conectan endpoints, vault, malware scan y audit trail.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: '1fr'
        }}
      >
        {EVIDENCE_EXAMPLES.map(example => (
          <EvidenceCard key={`${example.title}-${example.state}-${example.variant}`} example={example} />
        ))}
      </Box>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary'>
          Inline decision prompt
        </Typography>
        <Typography variant='h5'>
          Decisiones sin romper contexto
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Prompt inline para decisiones no destructivas o de riesgo controlado: elegir fuente, propagar cambios, revisar impacto o
          continuar despues de una confirmacion. No reemplaza Dialog para destructivo, legal, financiero irreversible o maker-checker.
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: '1fr'
        }}
      >
        {DECISION_EXAMPLES.map(example => (
          <DecisionCard key={`${example.title}-${example.state}-${example.variant}`} example={example} />
        ))}
      </Box>
    </CardContent>
  </Card>
)

export default MicrointeractionsLabSection
