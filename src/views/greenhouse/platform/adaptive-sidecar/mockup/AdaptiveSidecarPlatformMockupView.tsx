'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import GlobalStyles from '@mui/material/GlobalStyles'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import {
  AdaptiveSidecarLayout,
  ContextualSidecar,
  ContextualSidecarComparisonRows,
  ContextualSidecarMetricStrip,
  ContextualSidecarProgress,
  ContextualSidecarRunbookSteps,
  ContextualSidecarSection,
  ContextualSidecarSignal,
  ContextualSidecarTimeline,
  resolveAdaptiveSidecarVariant
} from '@/components/greenhouse/primitives'
import type {
  AdaptiveSidecarKind,
  AdaptiveSidecarPreferredMode,
  ContextualSidecarMetric,
  ContextualSidecarRunbookStep,
  ContextualSidecarTimelineItem,
  ContextualSidecarVariant
} from '@/components/greenhouse/primitives'
import useReducedMotion from '@/hooks/useReducedMotion'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import { getMicrocopy } from '@/lib/copy'

type MockCaseStatus = 'risk' | 'review' | 'ready'

interface MockCase {
  id: string
  client: string
  owner: string
  status: MockCaseStatus
  title: string
  signal: string
  score: number
  due: string
}

const CASES: MockCase[] = [
  {
    id: 'GH-1842',
    client: 'Efeonce Growth',
    owner: 'People Ops',
    status: 'risk',
    title: 'Aprobación contractual con cambios pendientes',
    signal: '2 cláusulas requieren confirmación antes de enviar',
    score: 68,
    due: 'Hoy 17:00'
  },
  {
    id: 'GH-1879',
    client: 'Studio Norte',
    owner: 'Finance Ops',
    status: 'review',
    title: 'Conciliación de pago con evidencia incompleta',
    signal: 'Falta comprobante firmado por contraparte',
    score: 82,
    due: 'Mañana'
  },
  {
    id: 'GH-1904',
    client: 'Ops Partner',
    owner: 'Service Desk',
    status: 'ready',
    title: 'Cierre operacional listo para auditoría',
    signal: 'Todos los campos críticos fueron validados',
    score: 96,
    due: 'Viernes'
  }
]

const KIND_LABELS: Record<AdaptiveSidecarKind, string> = {
  inspector: 'Inspector',
  composer: 'Composer',
  form: 'Formulario',
  review: 'Revisión',
  assistant: 'Asistente',
  preview: 'Preview',
  evidence: 'Evidence',
  reconciler: 'Reconciler',
  runbook: 'Runbook'
}

const KIND_CONTROL_LABELS: Record<AdaptiveSidecarKind, string> = {
  inspector: 'Insp.',
  composer: 'Comp.',
  form: 'Form.',
  review: 'Review',
  assistant: 'AI',
  preview: 'Preview',
  evidence: 'Evid.',
  reconciler: 'Recon.',
  runbook: 'Run.'
}

const OFFICIAL_VARIANTS: Array<{ kind: AdaptiveSidecarKind; variant: ContextualSidecarVariant }> = [
  { kind: 'inspector', variant: 'inspector' },
  { kind: 'composer', variant: 'composer' },
  { kind: 'assistant', variant: 'assistant' },
  { kind: 'reconciler', variant: 'reconciler' },
  { kind: 'evidence', variant: 'evidence' },
  { kind: 'runbook', variant: 'runbook' }
]

const MODE_LABELS: Record<AdaptiveSidecarPreferredMode, string> = {
  push: 'Push',
  inline: 'Inline',
  overlay: 'Overlay',
  temporary: 'Drawer'
}

const GREENHOUSE_COPY = getMicrocopy()

const MOCKUP_ARIA = {
  modeSelector: 'Modo del sidecar',
  kindSelector: 'Tipo de panel contextual'
}

const STATUS_META: Record<MockCaseStatus, { label: string; color: 'error' | 'warning' | 'success'; icon: string }> = {
  risk: { label: 'Riesgo', color: 'error', icon: 'tabler-alert-triangle' },
  review: { label: GREENHOUSE_COPY.states.inReview, color: 'warning', icon: 'tabler-progress-check' },
  ready: { label: GREENHOUSE_COPY.states.completed, color: 'success', icon: 'tabler-circle-check' }
}

const VARIANT_PRESENTATION: Record<
  ContextualSidecarVariant,
  { icon: string; color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'; subtitle: string }
> = {
  inspector: {
    icon: 'tabler-eye-check',
    color: 'primary',
    subtitle: 'Inspección contextual con decisión rápida'
  },
  composer: {
    icon: 'tabler-edit',
    color: 'warning',
    subtitle: 'Edición contextual protegida por dirty-state'
  },
  assistant: {
    icon: 'tabler-sparkles',
    color: 'info',
    subtitle: 'Asistencia advisory-only con trazabilidad'
  },
  evidence: {
    icon: 'tabler-shield-check',
    color: 'success',
    subtitle: 'Provenance, fuentes y confianza verificable'
  },
  reconciler: {
    icon: 'tabler-git-compare',
    color: 'error',
    subtitle: 'Comparación y resolución de diferencias'
  },
  runbook: {
    icon: 'tabler-list-check',
    color: 'primary',
    subtitle: 'Ejecución operacional guiada y auditable'
  }
}

const sidecarItemMotion = (index: number, prefersReducedMotion: boolean) => ({
  initial: prefersReducedMotion ? false : { opacity: 0, y: 8 },
  animate: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
  transition: prefersReducedMotion ? undefined : { duration: 0.18, delay: index * 0.045, ease: [0.2, 0, 0, 1] as const }
})

const RECONCILER_METRICS: ContextualSidecarMetric[] = [
  { label: 'Diferencias', value: 3, helper: 'Oferta vs contrato', color: 'error', icon: 'tabler-delta' },
  { label: 'Bloqueante', value: 1, helper: 'Requiere decisión', color: 'warning', icon: 'tabler-lock-exclamation' },
  { label: 'Confianza', value: '62%', helper: 'Match documental', color: 'primary', icon: 'tabler-chart-dots-3' }
]

const EVIDENCE_TIMELINE_ITEMS: ContextualSidecarTimelineItem[] = [
  {
    id: 'notion',
    title: 'Notion Employee DB sincronizado',
    meta: '08:55',
    description: 'Evento ID: 3f4c9b12...',
    icon: 'tabler-database',
    color: 'success'
  },
  {
    id: 'hubspot',
    title: 'Datos del contacto en HubSpot',
    meta: '08:42',
    description: 'Actor: hubspot.integration',
    icon: 'tabler-plug-connected',
    color: 'warning'
  },
  {
    id: 'workspace',
    title: 'Perfil verificado en Google Workspace',
    meta: '08:30',
    description: 'Actor: system.integration',
    icon: 'tabler-check',
    color: 'success'
  }
]

const RUNBOOK_METRICS: ContextualSidecarMetric[] = [
  { label: 'Estado', value: 'Activo', helper: 'Operación pausada', color: 'primary', icon: 'tabler-player-pause' },
  { label: 'Tiempo', value: '03:24', helper: 'transcurrido', color: 'info', icon: 'tabler-clock' },
  { label: 'Riesgo', value: 'Medio', helper: 'rollback disponible', color: 'warning', icon: 'tabler-shield-half' }
]

const RUNBOOK_STEPS: ContextualSidecarRunbookStep[] = [
  {
    id: 'preflight',
    index: 1,
    title: 'Preflight',
    description: 'Validaciones previas obligatorias',
    status: 'Completado',
    color: 'success',
    meta: '8 / 8 checks pasaron · duración 02:01'
  },
  {
    id: 'approval',
    index: 2,
    title: 'Aprobación del operador',
    description: 'Confirmar para continuar',
    status: 'En espera',
    color: 'primary',
    active: true,
    meta: 'Requiere aprobación con rol Owner'
  },
  {
    id: 'workers',
    index: 3,
    title: 'Despliegue de workers',
    description: 'Actualizar servicios en Cloud Run',
    status: 'Pendiente',
    disabled: true
  },
  {
    id: 'health',
    index: 4,
    title: 'Post-release health',
    description: 'Validaciones finales y confirmación',
    status: 'Pendiente',
    disabled: true
  }
]

const SidecarBody = ({
  selectedCase,
  kind,
  variant,
  dirty,
  setDirty,
  prefersReducedMotion
}: {
  selectedCase: MockCase
  kind: AdaptiveSidecarKind
  variant: ContextualSidecarVariant
  dirty: boolean
  setDirty: (dirty: boolean) => void
  prefersReducedMotion: boolean
}) => {
  if (variant === 'assistant') {
    return (
      <Stack spacing={4}>
        <Alert severity='info'>
          La recomendación usa solo datos autorizados del caso y mantiene trazabilidad por evento.
        </Alert>
        <Stack spacing={3}>
          {[
            'Confirmar owner de decisión antes de enviar.',
            'Pedir evidencia faltante en el canal operacional.',
            'Registrar excepción si el vencimiento se mueve.'
          ].map((item, index) => (
            <motion.div key={item} {...sidecarItemMotion(index, prefersReducedMotion)}>
              <Stack direction='row' spacing={2} alignItems='flex-start'>
                <i className='tabler-sparkles' aria-hidden='true' />
                <Typography variant='body2'>{item}</Typography>
              </Stack>
            </motion.div>
          ))}
        </Stack>
      </Stack>
    )
  }

  if (variant === 'composer') {
    return (
      <Stack spacing={4}>
        {dirty ? <Alert severity='warning'>Hay cambios locales pendientes de guardar.</Alert> : null}
        <Stack spacing={1}>
          <Typography variant='body2' color='text.secondary'>
            Edición contextual
          </Typography>
          <Typography variant='body1'>
            Ajusta la decisión sin salir de la cola. El cierre queda protegido por dirty-state.
          </Typography>
        </Stack>
        <CustomTextField
          label='Owner operativo'
          defaultValue={selectedCase.owner}
          size='small'
          onChange={() => setDirty(true)}
        />
        <CustomTextField
          select
          label='Estado de resolución'
          defaultValue={selectedCase.status}
          size='small'
          onChange={() => setDirty(true)}
        >
          <MenuItem value='risk'>Riesgo</MenuItem>
          <MenuItem value='review'>En revisión</MenuItem>
          <MenuItem value='ready'>Listo</MenuItem>
        </CustomTextField>
        <CustomTextField
          label='Nota interna'
          multiline
          minRows={4}
          size='small'
          defaultValue='Validar evidencia y confirmar próximo hito con el owner.'
          onChange={() => setDirty(true)}
        />
      </Stack>
    )
  }

  if (variant === 'reconciler') {
    return (
      <Stack spacing={4}>
        <ContextualSidecarSignal
          icon='tabler-alert-hexagon'
          color='error'
          title='Diferencia bloqueante detectada'
          description='El monto del contrato no coincide con la oferta aprobada. Resolverlo evita enviar un documento con obligación de pago incorrecta.'
          meta='-$100.000'
          secondaryMeta='impacto mensual'
        />
        <ContextualSidecarMetricStrip items={RECONCILER_METRICS} />
        <ContextualSidecarSection title='Comparación normalizada' subtitle='Cada fila conserva fuente, estado y foco de resolución'>
          <ContextualSidecarComparisonRows
            sourceALabel='Oferta'
            sourceBLabel='Contrato'
            rows={[
              {
                id: 'role',
                field: 'Cargo',
                sourceA: 'Analista Financiero',
                sourceB: 'Analista Financiero',
                status: 'Match',
                tone: 'success'
              },
              {
                id: 'fee',
                field: 'Monto mensual',
                sourceA: '$1.350.000 CLP',
                sourceB: '$1.250.000 CLP',
                status: 'Bloqueante',
                tone: 'error',
                selected: true
              },
              {
                id: 'payment-days',
                field: 'Días de pago',
                sourceA: '30',
                sourceB: '15',
                status: 'Diferencia',
                tone: 'warning'
              },
              {
                id: 'bank',
                field: 'Cuenta bancaria',
                sourceA: '—',
                sourceB: 'Banco de Chile · 8921',
                status: 'Faltante',
                tone: 'info'
              }
            ]}
          />
        </ContextualSidecarSection>
        <ContextualSidecarSection title='Decisión sugerida'>
          <Alert severity='warning'>
            Actualiza el contrato al monto aprobado de la oferta y conserva la diferencia como evento auditable.
          </Alert>
        </ContextualSidecarSection>
        <ContextualSidecarSection title='Impacto y auditoría'>
          <Stack spacing={2}>
            {[
              ['Registros que se actualizarán', '1 contrato'],
              ['Implicancias', 'Finanzas, Nómina'],
              ['Log de auditoría', 'Se generará 1 entrada']
            ].map(([label, value]) => (
              <Stack key={label} direction='row' justifyContent='space-between' gap={3}>
                <Typography variant='caption' color='text.secondary'>
                  {label}
                </Typography>
                <Typography variant='caption' fontWeight={700} textAlign='right'>
                  {value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </ContextualSidecarSection>
      </Stack>
    )
  }

  if (variant === 'evidence') {
    return (
      <Stack spacing={4}>
        <ContextualSidecarSignal
          icon='tabler-shield-check'
          color='success'
          title='Evidencia suficiente para aceptar'
          description='Las fuentes críticas están sincronizadas y el rastro de procedencia conserva actor, hora y evento de origen.'
          meta='84%'
          secondaryMeta='confianza'
        />
        <ContextualSidecarProgress label='Confianza general' value={84} helper='5 fuentes verificadas · 1 fuente requiere revisión manual' />
        <ContextualSidecarSection title='Fuentes verificadas' subtitle='Ordenadas por frescura, confiabilidad y trazabilidad'>
          <Stack spacing={2}>
            {[
              ['Notion · Employee DB', 'Sincronizado hoy 08:55', 'Alta', 'success'],
              ['HubSpot · Contacto', 'Sincronizado hoy 08:42', 'Media', 'warning'],
              ['Google Workspace', 'Verificado hoy 08:30', 'Alta', 'success'],
              ['Comprobante de identidad', 'Subido por María Torres', 'Media', 'warning']
            ].map(([title, meta, label, color]) => (
              <Box
                key={title}
                sx={theme => ({
                  border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                  p: 3,
                  bgcolor: 'background.paper',
                  boxShadow: `0 8px 22px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.2 : 0.035)}`,
                  transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
                    duration: theme.transitions.duration.shorter,
                    easing: 'cubic-bezier(0.2, 0, 0, 1)'
                  }),
                  '&:hover': {
                    borderColor: alpha(theme.palette[color as 'success' | 'warning'].main, 0.38),
                    boxShadow: `0 12px 30px ${alpha(theme.palette[color as 'success' | 'warning'].main, theme.palette.mode === 'dark' ? 0.14 : 0.075)}`,
                    transform: 'translateY(-1px)'
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': {
                      transform: 'none'
                    }
                  }
                })}
              >
                <Stack direction='row' spacing={3} alignItems='center'>
                  <CustomAvatar skin='light' color={color as 'success' | 'warning'} variant='rounded'>
                    <i className={title.startsWith('Notion') ? 'tabler-brand-notion' : 'tabler-file-check'} aria-hidden='true' />
                  </CustomAvatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant='body2' fontWeight={700}>
                      {title}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {meta}
                    </Typography>
                  </Box>
                  <CustomChip round='true' size='small' variant='tonal' color={color as 'success' | 'warning'} label={label} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </ContextualSidecarSection>
        <ContextualSidecarSection title='Línea de procedencia'>
          <ContextualSidecarTimeline items={EVIDENCE_TIMELINE_ITEMS} />
        </ContextualSidecarSection>
      </Stack>
    )
  }

  if (variant === 'runbook') {
    return (
      <Stack spacing={4}>
        <ContextualSidecarSignal
          icon='tabler-player-play'
          color='primary'
          title='Punto de control listo para avanzar'
          description='El preflight terminó sin errores. La siguiente acción requiere aprobación del Owner y mantiene rollback disponible.'
          meta='2/4'
          secondaryMeta='paso activo'
        />
        <ContextualSidecarMetricStrip items={RUNBOOK_METRICS} />
        <ContextualSidecarRunbookSteps steps={RUNBOOK_STEPS} />
        <Alert severity='warning'>Rollback disponible: volver a la versión estable anterior si falla salud post-release.</Alert>
      </Stack>
    )
  }

  if (kind === 'review') {
    return (
      <Stack spacing={4}>
        {['Identidad del solicitante', 'Evidencia adjunta', 'Decisión autorizada', 'Mensaje final'].map((item, index) => (
          <motion.div key={item} {...sidecarItemMotion(index, prefersReducedMotion)}>
            <Stack direction='row' spacing={3} alignItems='center'>
              <CustomAvatar skin='light' color={index < 2 ? 'success' : 'warning'} variant='rounded'>
                <i className={index < 2 ? 'tabler-check' : 'tabler-clock'} aria-hidden='true' />
              </CustomAvatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='body2' fontWeight={600}>
                  {item}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {index < 2 ? 'Validado' : 'Pendiente de confirmación'}
                </Typography>
              </Box>
            </Stack>
          </motion.div>
        ))}
      </Stack>
    )
  }

  if (kind === 'preview') {
    return (
      <Box
        sx={theme => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          p: 4,
          bgcolor: 'background.paper'
        })}
      >
        <Stack spacing={3}>
          <Typography variant='overline' color='text.secondary'>
            Documento operacional
          </Typography>
          <Typography variant='h6'>{selectedCase.title}</Typography>
          <Divider />
          <Typography variant='body2'>
            El caso {selectedCase.id} queda preparado para revisión con score {selectedCase.score} y vencimiento{' '}
            {selectedCase.due}.
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {selectedCase.signal}
          </Typography>
        </Stack>
      </Box>
    )
  }

  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <Typography variant='body2' color='text.secondary'>
          Señal principal
        </Typography>
        <Typography variant='body1'>{selectedCase.signal}</Typography>
      </Stack>
      <Divider />
      <Box>
        <Stack direction='row' justifyContent='space-between' sx={{ mb: 2 }}>
          <Typography variant='body2' color='text.secondary'>
            Salud del caso
          </Typography>
          <Typography variant='body2' fontWeight={700}>
            {selectedCase.score}%
          </Typography>
        </Stack>
        <LinearProgress
          variant='determinate'
          value={selectedCase.score}
          sx={{ height: 8, borderRadius: 1 }}
          aria-label={`Salud del caso ${selectedCase.score}%`}
        />
      </Box>
      <Divider />
      <Stack spacing={2}>
        <Typography variant='body2' color='text.secondary'>
          Próximo hito
        </Typography>
        <CustomChip label={selectedCase.due} size='small' icon={<i className='tabler-calendar-event' aria-hidden='true' />} />
      </Stack>
    </Stack>
  )
}

const AdaptiveSidecarPlatformMockupView = () => {
  const [open, setOpen] = useState(true)
  const [kind, setKind] = useState<AdaptiveSidecarKind>('reconciler')
  const [mode, setMode] = useState<AdaptiveSidecarPreferredMode>('push')
  const [selectedCaseId, setSelectedCaseId] = useState(CASES[0].id)
  const [dirty, setDirty] = useState(false)
  const [dirtyWarning, setDirtyWarning] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState(false)
  const [assistantBusy, setAssistantBusy] = useState(false)
  const launchButtonRef = useRef<HTMLButtonElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const selectedCase = useMemo(
    () => CASES.find(item => item.id === selectedCaseId) ?? CASES[0],
    [selectedCaseId]
  )

  const selectedVariant = resolveAdaptiveSidecarVariant(kind)
  const variantPresentation = VARIANT_PRESENTATION[selectedVariant]

  useEffect(() => {
    if (selectedVariant !== 'assistant') {
      setAssistantBusy(false)

      return undefined
    }

    setAssistantBusy(true)

    const timeout = window.setTimeout(() => setAssistantBusy(false), 620)

    return () => window.clearTimeout(timeout)
  }, [selectedCase.id, selectedVariant])

  useEffect(() => {
    if (!saveFeedback) {
      return undefined
    }

    const timeout = window.setTimeout(() => setSaveFeedback(false), 1400)

    return () => window.clearTimeout(timeout)
  }, [saveFeedback])

  const handleOpenCase = (caseId: string, nextKind: AdaptiveSidecarKind = kind) => {
    const replacingDirtyComposer = dirty && selectedVariant === 'composer' && caseId !== selectedCaseId

    if (replacingDirtyComposer) {
      setDirtyWarning(true)

      return
    }

    setSelectedCaseId(caseId)
    setKind(nextKind)
    setOpen(true)
    setDirtyWarning(false)
    setSaveFeedback(false)
  }

  const handleKindChange = (_event: unknown, nextKind: AdaptiveSidecarKind | null) => {
    if (!nextKind) {
      return
    }

    const nextVariant = resolveAdaptiveSidecarVariant(nextKind)

    if (dirty && selectedVariant === 'composer' && nextVariant !== selectedVariant) {
      setDirtyWarning(true)

      return
    }

    setKind(nextKind)
    setOpen(true)
    setDirtyWarning(false)
    setSaveFeedback(false)
  }

  const handleModeChange = (_event: unknown, nextMode: AdaptiveSidecarPreferredMode | null) => {
    if (nextMode) {
      setMode(nextMode)
    }
  }

  const sidecarFooter = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent='space-between'
    >
      <AnimatePresence mode='popLayout' initial={false}>
        {saveFeedback ? (
          <Box
            key='saved'
            component={motion.div}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 8, scale: 0.98 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, x: 8, scale: 0.98 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            <CustomChip
              color='success'
              size='small'
              label={GREENHOUSE_COPY.feedback.saved}
              icon={<i className='tabler-check' aria-hidden='true' />}
            />
          </Box>
        ) : null}
        {selectedVariant === 'composer' && dirty ? (
          <Stack
            key='dirty-context'
            direction='row'
            spacing={2}
            alignItems='center'
            component={motion.div}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.16, ease: [0.2, 0, 0, 1] }}
            sx={{ minWidth: 0 }}
          >
            <i className='tabler-edit-circle' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              Cambios sin guardar
            </Typography>
          </Stack>
        ) : null}
        {selectedVariant === 'inspector' && !saveFeedback ? (
          <Stack key='inspector-context' direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
            <i className='tabler-eye-check' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              Decisión rápida con contexto visible
            </Typography>
          </Stack>
        ) : null}
        {selectedVariant === 'assistant' && !saveFeedback ? (
          <Stack key='assistant-context' direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
            <i className='tabler-sparkles' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              Sugerencias advisory-only
            </Typography>
          </Stack>
        ) : null}
        {selectedVariant === 'reconciler' && !saveFeedback ? (
          <Stack key='reconciler-context' direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
            <i className='tabler-git-compare' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              Corrige monto y registra auditoría
            </Typography>
          </Stack>
        ) : null}
        {selectedVariant === 'evidence' && !saveFeedback ? (
          <Stack key='evidence-context' direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
            <i className='tabler-shield-check' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              Acepta evidencia con rastro completo
            </Typography>
          </Stack>
        ) : null}
        {selectedVariant === 'runbook' && !saveFeedback ? (
          <Stack key='runbook-context' direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
            <i className='tabler-player-pause' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              Avanza solo desde checkpoint seguro
            </Typography>
          </Stack>
        ) : null}
      </AnimatePresence>
      <Stack direction='row' spacing={2} justifyContent='flex-end'>
        {selectedVariant === 'composer' && dirty ? (
          <Button size='small' onClick={() => setDirty(false)}>
            Descartar
          </Button>
        ) : null}
        {selectedVariant === 'assistant' ? (
          <Button size='small' variant='tonal' startIcon={<i className='tabler-notes' aria-hidden='true' />}>
            Crear tarea
          </Button>
        ) : null}
        {selectedVariant === 'reconciler' ? (
          <Button size='small' variant='tonal' startIcon={<i className='tabler-flag' aria-hidden='true' />}>
            Crear excepción
          </Button>
        ) : null}
        {selectedVariant === 'evidence' ? (
          <Button size='small' variant='tonal' startIcon={<i className='tabler-copy' aria-hidden='true' />}>
            Copiar
          </Button>
        ) : null}
        {selectedVariant === 'runbook' ? (
          <Button size='small' variant='tonal' startIcon={<i className='tabler-terminal-2' aria-hidden='true' />}>
            Rollback
          </Button>
        ) : null}
        <Button
          size='small'
          variant='contained'
          onClick={() => {
            setDirty(false)
            setDirtyWarning(false)
            setSaveFeedback(true)
          }}
          startIcon={
            <i
              className={
                selectedVariant === 'inspector'
                  ? 'tabler-check'
                  : selectedVariant === 'assistant'
                    ? 'tabler-copy-check'
                    : selectedVariant === 'composer'
                      ? 'tabler-device-floppy'
                      : selectedVariant === 'evidence'
                        ? 'tabler-shield-check'
                        : selectedVariant === 'reconciler'
                          ? 'tabler-git-merge'
                          : 'tabler-arrow-right'
              }
              aria-hidden='true'
            />
          }
        >
          {selectedVariant === 'inspector'
            ? 'Resolver'
            : selectedVariant === 'assistant'
              ? 'Usar resumen'
              : selectedVariant === 'composer'
                ? GREENHOUSE_COPY.actions.save
                : selectedVariant === 'evidence'
                  ? 'Aceptar evidencia'
                  : selectedVariant === 'reconciler'
                    ? 'Aplicar corrección'
                    : 'Autorizar paso'}
        </Button>
      </Stack>
    </Stack>
  )

  return (
    <Box
      data-capture='adaptive-sidecar-platform'
      sx={theme => ({
        p: { xs: 4, md: 4 },
        minWidth: 0,
        background: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f7f7f8'
      })}
    >
      <GlobalStyles styles={{ '[data-nexa-floating-trigger="true"]': { display: 'none !important' } }} />
      <AdaptiveSidecarLayout
        open={open}
        onOpenChange={setOpen}
        preferredMode={mode}
        kind={kind}
        dirty={dirty}
        onDirtyCloseAttempt={() => setDirtyWarning(true)}
        restoreFocusRef={launchButtonRef}
        dataCapture='adaptive-sidecar-layout'
        sidecarWidth={500}
        sidecarMinWidth={380}
        sidecarMaxWidth={640}
        sidecarExtent='viewport'
        viewportOffsetTop={0}
        viewportShellReflow='greenhouse-vertical-navbar'
        minHeight='calc(100dvh - 264px)'
        mainMinWidth={620}
        temporaryPlacement='bottom'
        source='platform-mockup'
        sidecar={
          <ContextualSidecar
            kind={kind}
            variant={selectedVariant}
            title={`${KIND_LABELS[kind]} · ${selectedCase.id}`}
            subtitle={variantPresentation.subtitle}
            eyebrow={selectedCase.client}
            icon={variantPresentation.icon}
            iconColor={variantPresentation.color}
            state={selectedVariant === 'assistant' && assistantBusy ? 'loading' : 'idle'}
            onClose={() => {
              if (dirty) {
                setDirtyWarning(true)

                return
              }

              setOpen(false)
            }}
            footer={sidecarFooter}
            motionKey={`${selectedCase.id}-${kind}`}
            dataCapture='adaptive-sidecar-contextual-panel'
          >
            <SidecarBody
              selectedCase={selectedCase}
              kind={kind}
              variant={selectedVariant}
              dirty={dirty}
              setDirty={setDirty}
              prefersReducedMotion={prefersReducedMotion}
            />
          </ContextualSidecar>
        }
      >
        <Stack spacing={4} data-capture='adaptive-sidecar-main-workbench' sx={{ minHeight: '100%' }}>
          <Stack
            data-capture='adaptive-sidecar-header'
            direction={{ xs: 'column', xl: 'row' }}
            spacing={4}
            alignItems={{ xs: 'stretch', xl: 'center' }}
            justifyContent='space-between'
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='h4' sx={{ mb: 1 }}>
                Mesa operacional
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Casos activos con panel contextual adaptable para inspección, edición, revisión y asistencia.
              </Typography>
            </Box>
            <Stack direction='row' spacing={2} flexWrap='wrap' sx={{ maxWidth: '100%' }}>
              <ToggleButtonGroup
                exclusive
                size='small'
                value={mode}
                onChange={handleModeChange}
                aria-label={MOCKUP_ARIA.modeSelector}
              >
                {(Object.keys(MODE_LABELS) as AdaptiveSidecarPreferredMode[]).map(item => (
                  <ToggleButton key={item} value={item} aria-label={MODE_LABELS[item]}>
                    {MODE_LABELS[item]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Button
                ref={launchButtonRef}
                variant='contained'
                startIcon={<i className='tabler-layout-sidebar-right' aria-hidden='true' />}
                onClick={() => setOpen(true)}
              >
                Abrir panel
              </Button>
            </Stack>
          </Stack>

          {dirtyWarning ? (
            <Alert severity='warning' data-capture='adaptive-sidecar-dirty-warning'>
              Guarda o descarta los cambios del composer antes de cerrar el panel.
            </Alert>
          ) : null}

          <Box
            sx={theme => ({
              minWidth: 0,
              bgcolor: 'background.paper',
              border: `1px solid ${alpha(theme.palette.divider, 0.82)}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              overflow: 'hidden',
              boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.24 : 0.045)}`
            })}
          >
            <Box
              sx={theme => ({
                p: 4,
                borderBlockEnd: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
                background:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.94)
                    : `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.grey[50], 0.78)} 100%)`
              })}
            >
                <Stack
                  direction={{ xs: 'column', xl: 'row' }}
                  spacing={4}
                  alignItems={{ xs: 'stretch', xl: 'center' }}
                  justifyContent='space-between'
                >
                  <Stack direction='row' spacing={3} alignItems='center' sx={{ minWidth: 0 }}>
                    <CustomAvatar skin='light' color='info' variant='rounded'>
                      <i className='tabler-list-details' aria-hidden='true' />
                    </CustomAvatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='h6'>Cola de casos</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Superficie no-Nexa usando el mismo sidecar de plataforma
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ overflowX: 'auto', pb: 1 }}>
                    <ToggleButtonGroup
                      exclusive
                      size='small'
                      value={kind}
                      onChange={handleKindChange}
                      aria-label={MOCKUP_ARIA.kindSelector}
                      sx={{ minWidth: 'max-content' }}
                    >
                      {OFFICIAL_VARIANTS.map(({ kind: item }) => (
                        <ToggleButton key={item} value={item} aria-label={KIND_LABELS[item]}>
                          {KIND_CONTROL_LABELS[item]}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                </Stack>
              </Box>
              <Stack spacing={2} sx={{ px: { xs: 3, md: 4 }, py: 3 }}>
                {CASES.map(item => {
                  const itemStatus = STATUS_META[item.status]
                  const selected = item.id === selectedCase.id

                  return (
                    <Box
                      component={motion.div}
                      key={item.id}
                      data-capture={`adaptive-sidecar-case-${item.id}`}
                      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.995 }}
                      transition={prefersReducedMotion ? undefined : { duration: 0.16, ease: 'easeOut' }}
                      sx={theme => ({
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
                        gap: 3,
                        alignItems: 'center',
                        border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.34) : alpha(theme.palette.divider, 0.74)}`,
                        borderInlineStart: `3px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
                        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                        p: 3,
                        bgcolor: selected ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.026) : 'background.paper',
                        boxShadow: selected
                          ? `0 8px 20px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.075)}`
                          : `0 1px 0 ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.2 : 0.03)}`,
                        cursor: 'default',
                        transition: theme.transitions.create(['background-color', 'box-shadow', 'border-color', 'transform'], {
                          duration: theme.transitions.duration.shorter,
                          easing: 'cubic-bezier(0.2, 0, 0, 1)'
                        }),
                        '@media (prefers-reduced-motion: reduce)': {
                          transition: 'none'
                        }
                      })}
                    >
                      <Stack direction='row' spacing={3} alignItems='flex-start' sx={{ minWidth: 0 }}>
                        <CustomAvatar skin='light' color={itemStatus.color} variant='rounded'>
                          <i className={itemStatus.icon} aria-hidden='true' />
                        </CustomAvatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' sx={{ mb: 1 }}>
                            <Typography variant='subtitle1'>{item.id}</Typography>
                            <CustomChip size='small' color={itemStatus.color} label={itemStatus.label} />
                            <CustomChip size='small' variant='outlined' label={item.owner} />
                          </Stack>
                          <Typography variant='body1' sx={{ mb: 1 }}>
                            {item.title}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {item.signal}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction='row' spacing={2} alignItems='center' justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                        <CustomChip
                          size='small'
                          label={item.due}
                          icon={<i className='tabler-clock-hour-4' aria-hidden='true' />}
                        />
                        <Button
                          size='small'
                          variant={selected ? 'contained' : 'tonal'}
                          onClick={() => handleOpenCase(item.id)}
                        >
                          Abrir
                        </Button>
                      </Stack>
                    </Box>
                  )
                })}
              </Stack>
          </Box>

            <Box
              data-capture='adaptive-sidecar-platform-telemetry'
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 4
              }}
            >
              {[
                { label: 'Modo actual', value: MODE_LABELS[mode], icon: 'tabler-layout-board' },
                { label: 'Tipo de panel', value: KIND_LABELS[kind], icon: 'tabler-stack-2' },
                { label: 'Caso activo', value: selectedCase.id, icon: 'tabler-target-arrow' }
              ].map(item => (
                <Box
                  key={item.label}
                  sx={theme => ({
                    border: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
                    borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                    p: 3,
                    bgcolor: 'background.paper',
                    boxShadow: `0 8px 26px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.05)}`
                  })}
                >
                  <Stack direction='row' spacing={3} alignItems='center'>
                    <CustomAvatar skin='light' color='secondary' variant='rounded'>
                      <i className={item.icon} aria-hidden='true' />
                    </CustomAvatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='caption' color='text.secondary'>
                        {item.label}
                      </Typography>
                      <Typography variant='h6'>{item.value}</Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>
      </AdaptiveSidecarLayout>
    </Box>
  )
}

export default AdaptiveSidecarPlatformMockupView
