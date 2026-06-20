'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  AdaptiveSidecarLayout,
  CompositionShell,
  ContextualSidecar,
  GreenhouseButton,
  GreenhouseChip
} from '@/components/greenhouse/primitives'
import {
  DESIGN_HANDOFF_COPY,
  DESIGN_HANDOFF_EVIDENCE_TYPE_LABELS,
  DESIGN_HANDOFF_KIND_LABELS,
  DESIGN_HANDOFF_LINK_TYPE_LABELS,
  DESIGN_HANDOFF_NODE_STATUS_LABELS,
  DESIGN_HANDOFF_PRIORITY_LABELS,
  DESIGN_HANDOFF_STATUS_LABELS
} from '@/lib/copy/design-handoff'
import { parseFigmaUrl } from '@/lib/design-system/figma-nodes/parse-figma-url'
import type {
  DesignHandoffAllowedFile,
  DesignHandoffEntry,
  DesignHandoffEvidenceType,
  DesignHandoffKind,
  DesignHandoffLinkType,
  DesignHandoffNodeSnapshotStatus,
  DesignHandoffPriority,
  DesignHandoffStatus
} from '@/lib/design-system/handoff/types'
import { formatDate as formatCanonicalDate, formatDateTime as formatCanonicalDateTime } from '@/lib/format'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

type ApiState = 'idle' | 'loading' | 'ready' | 'error'
type PreviewState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'blocked'
type HandoffTab = 'ledger' | 'intake' | 'allowlist' | 'drift'
type CommandKey =
  | 'reload'
  | 'create'
  | 'planning'
  | 'owners'
  | 'evidence'
  | 'link'
  | 'verify'
  | 'transition'
  | 'allowlist'
  | 'drift'

interface HandoffResponse {
  entries: DesignHandoffEntry[]
  allowedFiles: DesignHandoffAllowedFile[]
}

interface DriftResponse {
  signals: ReliabilitySignal[]
}

const STATUS_TONES: Record<DesignHandoffStatus, 'default' | 'info' | 'success' | 'warning'> = {
  proposed: 'warning',
  in_implementation: 'info',
  in_review: 'info',
  implemented: 'success',
  archived: 'default'
}

const PRIORITY_TONES: Record<DesignHandoffPriority, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  normal: 'info',
  high: 'warning',
  urgent: 'error'
}

const SNAPSHOT_TONES: Record<DesignHandoffNodeSnapshotStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  reachable: 'success',
  renamed: 'warning',
  deleted: 'error',
  stale: 'warning',
  unavailable: 'error',
  unknown: 'default'
}

const SIGNAL_TONES: Record<ReliabilitySeverity, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  ok: 'success',
  warning: 'warning',
  error: 'error',
  unknown: 'default',
  not_configured: 'warning',
  awaiting_data: 'info'
}

const STATUS_ORDER: Record<DesignHandoffStatus, number> = {
  proposed: 1,
  in_implementation: 2,
  in_review: 3,
  implemented: 4,
  archived: 5
}

const PRIORITY_ORDER: Record<DesignHandoffPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3
}

const LINK_TYPES: DesignHandoffLinkType[] = [
  'task',
  'pull_request',
  'commit',
  'deployment',
  'route',
  'figma_comment',
  'external'
]

const EVIDENCE_TYPES: DesignHandoffEvidenceType[] = [
  'gvc_capture',
  'runtime_route',
  'visual_review',
  'accessibility_review',
  'manual_exception'
]

const PRIORITIES: DesignHandoffPriority[] = ['low', 'normal', 'high', 'urgent']

const parseErrorPayload = async (res: Response, fallback: string) => {
  const payload = (await res.json().catch(() => null)) as { error?: string; message?: string } | null

  return payload?.message ?? payload?.error ?? fallback
}

const sortEntries = (entries: DesignHandoffEntry[]) =>
  [...entries].sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.updatedAt.localeCompare(a.updatedAt)
  )

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Sin fecha'

  return formatCanonicalDate(value, { month: 'short', fallback: 'Sin fecha' }, 'es-CL')
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Sin registro'

  return formatCanonicalDateTime(value, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', fallback: 'Sin registro' }, 'es-CL')
}

const hasImplementationEvidence = (entry: DesignHandoffEntry | null) =>
  Boolean(
    entry?.evidence?.some(evidence =>
      ['gvc_capture', 'runtime_route', 'manual_exception'].includes(evidence.evidenceType)
    )
  )

const getSnapshotStatus = (entry: DesignHandoffEntry): DesignHandoffNodeSnapshotStatus =>
  entry.latestNodeSnapshot?.nodeStatus ?? 'unknown'

const getReadiness = (entry: DesignHandoffEntry | null) => {
  if (!entry) return []

  const snapshotStatus = getSnapshotStatus(entry)

  return [
    {
      label: 'Nodo Figma verificado',
      done: snapshotStatus === 'reachable',
      helper: DESIGN_HANDOFF_NODE_STATUS_LABELS[snapshotStatus]
    },
    {
      label: 'Owner DEV asignado',
      done: Boolean(entry.devOwnerMemberId),
      helper: entry.devOwnerMemberId ?? 'Sin owner'
    },
    {
      label: 'Ruta target definida',
      done: Boolean(entry.targetSurfaceKey ?? entry.implementedSurfaceKey),
      helper: entry.targetSurfaceKey ?? entry.implementedSurfaceKey ?? 'Sin ruta'
    },
    {
      label: 'Evidencia runtime/GVC',
      done: hasImplementationEvidence(entry),
      helper: hasImplementationEvidence(entry) ? 'Lista para cierre' : 'Requerida antes de implementar'
    }
  ]
}

const MetricTile = ({
  label,
  value,
  helper,
  tone = 'info',
  icon
}: {
  label: string
  value: string | number
  helper: string
  tone?: 'info' | 'success' | 'warning' | 'error'
  icon: string
}) => (
  <Box
    sx={theme => ({
      display: 'grid',
      minInlineSize: 0,
      gap: 1,
      p: 3,
      bgcolor: 'background.paper',
      border: `1px solid ${alpha(theme.palette[tone].main, 0.22)}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      boxShadow: `0 16px 44px ${alpha(theme.palette.common.black, 0.04)}`
    })}
  >
    <Stack direction='row' spacing={1.25} alignItems='center' justifyContent='space-between'>
      <Typography variant='caption' color='text.secondary' sx={typographyScale.labelSm}>
        {label}
      </Typography>
      <Box
        component='i'
        className={icon}
        aria-hidden='true'
        sx={theme => ({
          display: 'grid',
          inlineSize: 28,
          blockSize: 28,
          placeItems: 'center',
          color: `${tone}.main`,
          bgcolor: alpha(theme.palette[tone].main, 0.1),
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          fontSize: 17
        })}
      />
    </Stack>
    <Typography variant='h3' sx={{ lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography variant='body2' color='text.secondary'>
      {helper}
    </Typography>
  </Box>
)

const PreviewPane = ({
  imageUrl,
  state,
  nodeId
}: {
  imageUrl: string | null
  state: PreviewState
  nodeId: string | null
}) => (
  <Box
    data-capture='design-system-handoff-preview'
    sx={theme => ({
      display: 'grid',
      minBlockSize: 210,
      placeItems: 'center',
      overflow: 'hidden',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: alpha(theme.palette.primary.main, 0.035)
    })}
  >
    {state === 'loading' ? (
      <Stack spacing={2} sx={{ inlineSize: '100%', p: 4 }}>
        <LinearProgress />
        <Typography variant='body2' color='text.secondary' align='center'>
          Renderizando preview desde Figma
        </Typography>
      </Stack>
    ) : imageUrl ? (
      <Box
        component='img'
        alt='Preview del nodo Figma seleccionado'
        src={imageUrl}
        sx={{ display: 'block', maxInlineSize: '100%', maxBlockSize: 300, objectFit: 'contain' }}
      />
    ) : (
      <Stack spacing={1.5} alignItems='center' sx={{ p: 4, textAlign: 'center' }}>
        <AxisWordmark variant='isotype' height={44} />
        <Typography variant='subtitle2'>{DESIGN_HANDOFF_COPY.helper.previewUnavailable}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {state === 'blocked'
            ? DESIGN_HANDOFF_COPY.helper.previewBlocked
            : nodeId
              ? `Nodo ${nodeId}`
              : DESIGN_HANDOFF_COPY.helper.previewEmpty}
        </Typography>
      </Stack>
    )}
  </Box>
)

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <Box
    data-capture='design-system-handoff-empty'
    sx={theme => ({
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
      border: `1px dashed ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      textAlign: 'center',
      bgcolor: 'background.paper'
    })}
  >
    <Typography variant='h6'>{title}</Typography>
    <Typography variant='body2' color='text.secondary'>
      {body}
    </Typography>
  </Box>
)

const HandoffLedgerRow = ({
  entry,
  active,
  onSelect
}: {
  entry: DesignHandoffEntry
  active: boolean
  onSelect: (entry: DesignHandoffEntry) => void
}) => {
  const snapshotStatus = getSnapshotStatus(entry)
  const evidenceCount = entry.evidence?.length ?? 0
  const linkCount = entry.links?.length ?? 0

  return (
    <Box
      component='button'
      type='button'
      onClick={() => onSelect(entry)}
      data-capture='design-system-handoff-card'
      sx={theme => ({
        display: 'grid',
        inlineSize: '100%',
        minInlineSize: 0,
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.25fr) minmax(160px, 0.45fr) minmax(180px, 0.5fr)' },
        gap: 2.5,
        alignItems: 'center',
        p: 3,
        textAlign: 'start',
        cursor: 'pointer',
        color: 'text.primary',
        bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : 'background.paper',
        border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        boxShadow: active ? `0 18px 50px ${alpha(theme.palette.primary.main, 0.12)}` : 'none',
        transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow', 'transform']),
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 18px 46px ${alpha(theme.palette.common.black, 0.06)}`,
          transform: 'translateY(-1px)'
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' }
        }
      })}
    >
      <Stack spacing={1.25} sx={{ minInlineSize: 0 }}>
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
          <GreenhouseChip
            size='small'
            kind='status'
            variant='label'
            label={DESIGN_HANDOFF_STATUS_LABELS[entry.status]}
            tone={STATUS_TONES[entry.status]}
          />
          <GreenhouseChip
            size='small'
            kind='attribute'
            variant='outlined'
            label={DESIGN_HANDOFF_PRIORITY_LABELS[entry.priority]}
            tone={PRIORITY_TONES[entry.priority]}
          />
          <GreenhouseChip
            size='small'
            kind='attribute'
            variant='label'
            label={DESIGN_HANDOFF_KIND_LABELS[entry.kind]}
            tone='default'
          />
        </Stack>
        <Typography variant='h6' sx={{ wordBreak: 'break-word' }}>
          {entry.title}
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ wordBreak: 'break-word' }}>
          {entry.fileLabel ?? entry.fileKey} · {entry.nodeName ?? entry.nodeId}
        </Typography>
      </Stack>

      <Stack spacing={1} sx={{ minInlineSize: 0 }}>
        <Typography variant='caption' color='text.secondary' sx={typographyScale.labelSm}>
          Surface
        </Typography>
        <Typography variant='body2' sx={{ wordBreak: 'break-word' }}>
          {entry.targetSurfaceKey ?? entry.implementedSurfaceKey ?? 'Sin ruta'}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          Due: {formatDate(entry.dueAt)}
        </Typography>
      </Stack>

      <Stack direction='row' spacing={1} alignItems='center' justifyContent={{ xs: 'flex-start', lg: 'flex-end' }} flexWrap='wrap' useFlexGap>
        <GreenhouseChip
          size='small'
          kind='metric'
          variant='label'
          label={`${evidenceCount} evidencias`}
          tone={hasImplementationEvidence(entry) ? 'success' : 'warning'}
          iconClassName='tabler-shield-check'
        />
        <GreenhouseChip
          size='small'
          kind='metric'
          variant='label'
          label={`${linkCount} links`}
          tone={linkCount > 0 ? 'info' : 'default'}
          iconClassName='tabler-link'
        />
        <GreenhouseChip
          size='small'
          kind='status'
          variant='outlined'
          label={DESIGN_HANDOFF_NODE_STATUS_LABELS[snapshotStatus]}
          tone={SNAPSHOT_TONES[snapshotStatus]}
          iconClassName='tabler-brand-figma'
        />
      </Stack>
    </Box>
  )
}

const SectionHeader = ({ title, helper, count }: { title: string; helper: string; count: number }) => (
  <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' sx={{ minInlineSize: 0 }}>
    <Box sx={{ minInlineSize: 0 }}>
      <Typography variant='h6'>{title}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {helper}
      </Typography>
    </Box>
    <GreenhouseChip size='small' kind='metric' variant='label' tone='default' label={String(count)} />
  </Stack>
)

const DesignHandoffLaneView = () => {
  const [apiState, setApiState] = useState<ApiState>('loading')
  const [entries, setEntries] = useState<DesignHandoffEntry[]>([])
  const [allowedFiles, setAllowedFiles] = useState<DesignHandoffAllowedFile[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<HandoffTab>('ledger')
  const [message, setMessage] = useState<{ severity: 'success' | 'warning' | 'error' | 'info'; text: string } | null>(null)
  const [command, setCommand] = useState<CommandKey | null>(null)

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<DesignHandoffKind>('page')
  const [previewState, setPreviewState] = useState<PreviewState>('idle')
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [previewNodeName, setPreviewNodeName] = useState<string | null>(null)

  const [implementedSurfaceKey, setImplementedSurfaceKey] = useState('')
  const [planningPriority, setPlanningPriority] = useState<DesignHandoffPriority>('normal')
  const [planningTargetSurfaceKey, setPlanningTargetSurfaceKey] = useState('')
  const [planningDueAt, setPlanningDueAt] = useState('')
  const [planningBlockedReason, setPlanningBlockedReason] = useState('')
  const [designerOwner, setDesignerOwner] = useState('')
  const [devOwner, setDevOwner] = useState('')
  const [evidenceType, setEvidenceType] = useState<DesignHandoffEvidenceType>('gvc_capture')
  const [evidenceRef, setEvidenceRef] = useState('')
  const [evidenceLabel, setEvidenceLabel] = useState('')
  const [linkType, setLinkType] = useState<DesignHandoffLinkType>('task')
  const [linkRef, setLinkRef] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  const [allowlistFileKey, setAllowlistFileKey] = useState('')
  const [allowlistFileLabel, setAllowlistFileLabel] = useState('')
  const [driftSignals, setDriftSignals] = useState<ReliabilitySignal[]>([])

  const parsed = useMemo(() => parseFigmaUrl(url), [url])
  const sortedEntries = useMemo(() => sortEntries(entries), [entries])

  const selectedEntry = useMemo(
    () =>
      entries.find(entry => entry.entryId === selectedId) ??
      entries.find(entry => entry.status !== 'archived') ??
      entries[0] ??
      null,
    [entries, selectedId]
  )

  const activeEntries = useMemo(() => entries.filter(entry => entry.status !== 'archived'), [entries])

  const actionRequired = useMemo(
    () =>
      sortedEntries.filter(
        entry =>
          entry.status === 'proposed' ||
          Boolean(entry.blockedReason) ||
          entry.priority === 'urgent' ||
          getSnapshotStatus(entry) !== 'reachable'
      ),
    [sortedEntries]
  )

  const readyForReview = useMemo(
    () => sortedEntries.filter(entry => entry.status === 'in_implementation' || entry.status === 'in_review'),
    [sortedEntries]
  )

  const recentImplemented = useMemo(
    () => sortedEntries.filter(entry => entry.status === 'implemented').slice(0, 8),
    [sortedEntries]
  )

  const visibleLedgerGroups = useMemo(
    () => [
      {
        key: 'action',
        title: DESIGN_HANDOFF_COPY.sections.actionRequired,
        helper: 'Bloqueos, prioridad alta o nodos sin verificación reciente.',
        entries: actionRequired
      },
      {
        key: 'review',
        title: DESIGN_HANDOFF_COPY.sections.readyForReview,
        helper: 'Trabajo en implementación o review con comandos de cierre.',
        entries: readyForReview
      },
      {
        key: 'implemented',
        title: DESIGN_HANDOFF_COPY.sections.recentImplemented,
        helper: 'Cierres recientes con surface y evidencia trazable.',
        entries: recentImplemented
      }
    ],
    [actionRequired, readyForReview, recentImplemented]
  )

  const metrics = useMemo(() => {
    const missingEvidence = entries.filter(entry => entry.status === 'implemented' && !hasImplementationEvidence(entry)).length
    const nodeDrift = activeEntries.filter(entry => getSnapshotStatus(entry) !== 'reachable').length
    const blocked = activeEntries.filter(entry => entry.blockedReason).length

    return { missingEvidence, nodeDrift, blocked }
  }, [activeEntries, entries])

  const reload = useCallback(async (showMessage = false) => {
    setApiState('loading')
    if (!showMessage) setMessage(null)

    try {
      const res = await fetch('/api/design-system/handoff', { cache: 'no-store' })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo cargar el registro.'))

      const payload = (await res.json()) as HandoffResponse

      setEntries(payload.entries)
      setAllowedFiles(payload.allowedFiles)
      setApiState('ready')
      if (showMessage) setMessage({ severity: 'success', text: DESIGN_HANDOFF_COPY.messages.loaded })
    } catch (error) {
      setApiState('error')
      setMessage({
        severity: 'error',
        text: error instanceof Error ? error.message : 'No se pudo cargar el registro.'
      })
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!selectedEntry) return

    setImplementedSurfaceKey(selectedEntry.implementedSurfaceKey ?? selectedEntry.targetSurfaceKey ?? '')
    setPlanningPriority(selectedEntry.priority)
    setPlanningTargetSurfaceKey(selectedEntry.targetSurfaceKey ?? selectedEntry.implementedSurfaceKey ?? '')
    setPlanningDueAt(selectedEntry.dueAt ? selectedEntry.dueAt.slice(0, 10) : '')
    setPlanningBlockedReason(selectedEntry.blockedReason ?? '')
    setDesignerOwner(selectedEntry.designerOwnerMemberId ?? '')
    setDevOwner(selectedEntry.devOwnerMemberId ?? '')
  }, [selectedEntry])

  useEffect(() => {
    let cancelled = false

    const loadPreview = async () => {
      setPreviewImageUrl(null)
      setPreviewNodeName(null)

      if (!parsed) {
        setPreviewState(url.trim() ? 'unavailable' : 'idle')

        return
      }

      if (!allowedFiles.some(file => file.fileKey === parsed.fileKey && !file.supersededAt)) {
        setPreviewState('blocked')

        return
      }

      setPreviewState('loading')

      try {
        const res = await fetch(
          `/api/design-system/handoff/preview?fileKey=${encodeURIComponent(parsed.fileKey)}&nodeId=${encodeURIComponent(parsed.nodeId)}`
        )

        if (!res.ok) {
          setPreviewState('blocked')

          return
        }

        const payload = (await res.json()) as {
          imageUrl: string | null
          nodeName: string | null
          status: 'ready' | 'unavailable'
        }

        if (cancelled) return
        setPreviewImageUrl(payload.imageUrl)
        setPreviewNodeName(payload.nodeName)
        setPreviewState(payload.status === 'ready' ? 'ready' : 'unavailable')
      } catch {
        if (!cancelled) setPreviewState('unavailable')
      }
    }

    const timer = window.setTimeout(() => {
      void loadPreview()
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [allowedFiles, parsed, url])

  const runCommand = async (key: CommandKey, action: () => Promise<string>) => {
    setCommand(key)
    setMessage(null)

    try {
      const text = await action()

      setMessage({ severity: 'success', text })
    } catch (error) {
      setMessage({
        severity: 'error',
        text: error instanceof Error ? error.message : DESIGN_HANDOFF_COPY.helper.commandFailure
      })
    } finally {
      setCommand(null)
    }
  }

  const handleCreate = () =>
    runCommand('create', async () => {
      const res = await fetch('/api/design-system/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, kind, url, nodeName: previewNodeName })
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo registrar el handoff.'))

      setUrl('')
      setTitle('')
      setKind('page')
      await reload()
      setActiveTab('ledger')

      return DESIGN_HANDOFF_COPY.messages.created
    })

  const transition = (toStatus: DesignHandoffStatus) =>
    runCommand('transition', async () => {
      if (!selectedEntry) return DESIGN_HANDOFF_COPY.messages.stateChanged

      const res = await fetch(`/api/design-system/handoff/${encodeURIComponent(selectedEntry.entryId)}/transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus, implementedSurfaceKey })
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo cambiar el estado.'))

      await reload()

      return DESIGN_HANDOFF_COPY.messages.stateChanged
    })

  const savePlanning = () =>
    runCommand('planning', async () => {
      if (!selectedEntry) return DESIGN_HANDOFF_COPY.messages.planningSaved

      const res = await fetch(`/api/design-system/handoff/${encodeURIComponent(selectedEntry.entryId)}/planning`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: planningPriority,
          targetSurfaceKey: planningTargetSurfaceKey,
          dueAt: planningDueAt,
          blockedReason: planningBlockedReason
        })
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo guardar la planificación.'))

      await reload()

      return DESIGN_HANDOFF_COPY.messages.planningSaved
    })

  const saveOwners = () =>
    runCommand('owners', async () => {
      if (!selectedEntry) return DESIGN_HANDOFF_COPY.messages.ownersSaved

      const entryId = encodeURIComponent(selectedEntry.entryId)

      const designerRes = await fetch(`/api/design-system/handoff/${entryId}/owners`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerKind: 'designer', memberId: designerOwner })
      })

      if (!designerRes.ok) throw new Error(await parseErrorPayload(designerRes, 'No se pudo asignar designer.'))

      const devRes = await fetch(`/api/design-system/handoff/${entryId}/owners`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerKind: 'dev', memberId: devOwner })
      })

      if (!devRes.ok) throw new Error(await parseErrorPayload(devRes, 'No se pudo asignar DEV.'))

      await reload()

      return DESIGN_HANDOFF_COPY.messages.ownersSaved
    })

  const attachEvidence = () =>
    runCommand('evidence', async () => {
      if (!selectedEntry) return DESIGN_HANDOFF_COPY.messages.evidenceAttached

      const res = await fetch(`/api/design-system/handoff/${encodeURIComponent(selectedEntry.entryId)}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceType, ref: evidenceRef, label: evidenceLabel })
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo adjuntar evidencia.'))

      setEvidenceRef('')
      setEvidenceLabel('')
      await reload()

      return DESIGN_HANDOFF_COPY.messages.evidenceAttached
    })

  const linkWorkItem = () =>
    runCommand('link', async () => {
      if (!selectedEntry) return DESIGN_HANDOFF_COPY.messages.linkAttached

      const res = await fetch(`/api/design-system/handoff/${encodeURIComponent(selectedEntry.entryId)}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkType, ref: linkRef, label: linkLabel })
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo vincular el work item.'))

      setLinkRef('')
      setLinkLabel('')
      await reload()

      return DESIGN_HANDOFF_COPY.messages.linkAttached
    })

  const verifyNode = () =>
    runCommand('verify', async () => {
      if (!selectedEntry) return DESIGN_HANDOFF_COPY.messages.nodeVerified

      const res = await fetch(`/api/design-system/handoff/${encodeURIComponent(selectedEntry.entryId)}/verify-node`, {
        method: 'POST'
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo verificar el nodo Figma.'))

      await reload()

      return DESIGN_HANDOFF_COPY.messages.nodeVerified
    })

  const upsertAllowlist = () =>
    runCommand('allowlist', async () => {
      const res = await fetch('/api/design-system/handoff/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey: allowlistFileKey, fileLabel: allowlistFileLabel })
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo aprobar el archivo.'))

      setAllowlistFileKey('')
      setAllowlistFileLabel('')
      await reload()

      return DESIGN_HANDOFF_COPY.messages.allowlistSaved
    })

  const deprecateAllowlist = (fileKey: string) =>
    runCommand('allowlist', async () => {
      const res = await fetch(`/api/design-system/handoff/allowlist/${encodeURIComponent(fileKey)}/deprecate`, {
        method: 'PATCH'
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo deprecar el archivo.'))

      await reload()

      return DESIGN_HANDOFF_COPY.messages.allowlistDeprecated
    })

  const loadDrift = () =>
    runCommand('drift', async () => {
      const res = await fetch('/api/design-system/handoff/drift', { cache: 'no-store' })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudieron cargar los signals.'))

      const payload = (await res.json()) as DriftResponse

      setDriftSignals(payload.signals)

      return DESIGN_HANDOFF_COPY.messages.driftLoaded
    })

  const renderLedger = () => (
    <Stack spacing={3} data-capture='design-system-handoff-lanes'>
      {apiState === 'loading' ? <LinearProgress /> : null}
      {apiState === 'error' ? <Alert severity='error'>{message?.text ?? 'No se pudo cargar el registro.'}</Alert> : null}
      {apiState === 'ready' && sortedEntries.length === 0 ? (
        <EmptyState title={DESIGN_HANDOFF_COPY.helper.emptyLedger} body={DESIGN_HANDOFF_COPY.helper.emptyLedgerBody} />
      ) : null}
      {visibleLedgerGroups.map(group =>
        group.entries.length > 0 ? (
          <Stack key={group.key} spacing={1.5}>
            <SectionHeader title={group.title} helper={group.helper} count={group.entries.length} />
            <Stack spacing={1.5}>
              {group.entries.map(entry => (
                <HandoffLedgerRow
                  key={entry.entryId}
                  entry={entry}
                  active={entry.entryId === selectedEntry?.entryId}
                  onSelect={entry => setSelectedId(entry.entryId)}
                />
              ))}
            </Stack>
          </Stack>
        ) : null
      )}
    </Stack>
  )

  const renderIntake = () => (
    <Box
      data-capture='design-system-handoff-create'
      sx={theme => ({
        p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`
      })}
    >
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant='h5'>{DESIGN_HANDOFF_COPY.sections.intake}</Typography>
          <Typography variant='body2' color='text.secondary'>
            El archivo debe estar en allowlist; el backend valida file_key, nodo y ownership de forma fail-closed.
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label='URL del nodo Figma'
            value={url}
            onChange={event => setUrl(event.target.value)}
            fullWidth
            placeholder={DESIGN_HANDOFF_COPY.helper.figmaUrlPlaceholder}
          />
          <FormControl sx={{ minInlineSize: { xs: '100%', md: 180 } }}>
            <InputLabel id='design-handoff-kind-label'>Tipo</InputLabel>
            <Select
              labelId='design-handoff-kind-label'
              label='Tipo'
              value={kind}
              onChange={event => setKind(event.target.value as DesignHandoffKind)}
            >
              <MenuItem value='page'>{DESIGN_HANDOFF_KIND_LABELS.page}</MenuItem>
              <MenuItem value='component'>{DESIGN_HANDOFF_KIND_LABELS.component}</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <TextField
          label='Título interno'
          value={title}
          onChange={event => setTitle(event.target.value)}
          fullWidth
          helperText='Opcional. Si queda vacío, usamos el nombre del nodo o del archivo.'
        />
        <PreviewPane imageUrl={previewImageUrl} state={previewState} nodeId={parsed?.nodeId ?? null} />
        <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
          <Typography variant='caption' color='text.secondary' sx={typographyScale.labelSm}>
            {parsed ? `File ${parsed.fileKey} · Node ${parsed.nodeId}` : 'Pega una URL de selección Figma para validar.'}
          </Typography>
          <GreenhouseButton
            kind='primaryAction'
            leadingIconClassName={command === 'create' ? 'tabler-loader-2' : 'tabler-plus'}
            disabled={!parsed || previewState === 'blocked' || command === 'create'}
            onClick={handleCreate}
          >
            {DESIGN_HANDOFF_COPY.actions.register}
          </GreenhouseButton>
        </Stack>
      </Stack>
    </Box>
  )

  const renderAllowlist = () => (
    <Stack spacing={3} data-capture='design-system-handoff-allowlist'>
      <Box
        sx={theme => ({
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`
        })}
      >
        <Stack spacing={2}>
          <Typography variant='h5'>{DESIGN_HANDOFF_COPY.sections.allowlist}</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr) max-content' },
              gap: 2,
              alignItems: 'center',
              '& > *': { minInlineSize: 0 }
            }}
          >
            <TextField
              label='File key'
              value={allowlistFileKey}
              onChange={event => setAllowlistFileKey(event.target.value)}
              fullWidth
            />
            <TextField
              label='Label del archivo'
              value={allowlistFileLabel}
              onChange={event => setAllowlistFileLabel(event.target.value)}
              fullWidth
            />
            <GreenhouseButton
              kind='primaryAction'
              leadingIconClassName={command === 'allowlist' ? 'tabler-loader-2' : 'tabler-shield-plus'}
              disabled={!allowlistFileKey.trim() || !allowlistFileLabel.trim() || command === 'allowlist'}
              onClick={upsertAllowlist}
              reserveInlineSize={210}
              sx={{ alignSelf: 'center', inlineSize: { xs: '100%', md: 'auto' } }}
            >
              {DESIGN_HANDOFF_COPY.actions.upsertAllowlist}
            </GreenhouseButton>
          </Box>
        </Stack>
      </Box>

      {allowedFiles.length === 0 ? (
        <Alert severity='warning' data-capture='design-system-handoff-empty-allowlist'>
          {DESIGN_HANDOFF_COPY.helper.emptyAllowlist}
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {allowedFiles.map(file => (
            <Box
              key={file.fileKey}
              sx={theme => ({
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
                gap: 2,
                alignItems: 'center',
                p: 2.5,
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.md}px`
              })}
            >
              <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
                <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                  <Typography variant='subtitle2' sx={{ wordBreak: 'break-word' }}>
                    {file.fileLabel}
                  </Typography>
                  <GreenhouseChip
                    size='small'
                    variant='label'
                    tone={file.supersededAt ? 'warning' : 'success'}
                    label={file.supersededAt ? 'Deprecado' : 'Activo'}
                  />
                </Stack>
                <Typography variant='body2' color='text.secondary' sx={{ wordBreak: 'break-word' }}>
                  {file.fileKey} · aprobado {formatDateTime(file.addedAt)}
                </Typography>
              </Stack>
              <GreenhouseButton
                kind='secondaryAction'
                variant='outlined'
                tone='warning'
                size='small'
                disabled={Boolean(file.supersededAt) || command === 'allowlist'}
                onClick={() => deprecateAllowlist(file.fileKey)}
              >
                {DESIGN_HANDOFF_COPY.actions.deprecateAllowlist}
              </GreenhouseButton>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  )

  const renderDrift = () => (
    <Stack spacing={3}>
      <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
        <Box>
          <Typography variant='h5'>{DESIGN_HANDOFF_COPY.sections.drift}</Typography>
          <Typography variant='body2' color='text.secondary'>
            Señales conservadoras sobre evidencia faltante, node drift y surfaces huérfanas.
          </Typography>
        </Box>
        <GreenhouseButton
          kind='secondaryAction'
          leadingIconClassName={command === 'drift' ? 'tabler-loader-2' : 'tabler-activity-heartbeat'}
          disabled={command === 'drift'}
          onClick={loadDrift}
        >
          {DESIGN_HANDOFF_COPY.actions.loadDrift}
        </GreenhouseButton>
      </Stack>

      {driftSignals.length === 0 ? <Alert severity='info'>{DESIGN_HANDOFF_COPY.helper.driftUnavailable}</Alert> : null}

      <Stack spacing={1.5}>
        {driftSignals.map(signal => (
          <Box
            key={signal.signalId}
            sx={theme => ({
              p: 3,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`
            })}
          >
            <Stack spacing={1.5}>
              <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                <GreenhouseChip
                  size='small'
                  kind='status'
                  variant='label'
                  tone={SIGNAL_TONES[signal.severity]}
                  label={signal.severity}
                />
                <Typography variant='subtitle1'>{signal.label}</Typography>
              </Stack>
              <Typography variant='body2' color='text.secondary'>
                {signal.summary}
              </Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {signal.evidence.slice(0, 6).map(item => (
                  <GreenhouseChip
                    key={`${signal.signalId}-${item.label}`}
                    size='small'
                    kind='attribute'
                    variant='outlined'
                    tone='default'
                    label={`${item.label}: ${item.value}`}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  )

  const renderMain = () => (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'flex-start' }}>
        <Stack spacing={1} sx={{ maxInlineSize: 780 }}>
          <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
            <GreenhouseChip
              size='small'
              variant='label'
              tone='primary'
              iconClassName='tabler-layout-kanban'
              label={DESIGN_HANDOFF_COPY.overline}
            />
            <GreenhouseChip
              size='small'
              variant='outlined'
              tone='success'
              iconClassName='tabler-api'
              label='Full API parity'
            />
          </Stack>
          <Typography variant='h3'>{DESIGN_HANDOFF_COPY.pageTitle}</Typography>
          <Typography variant='body1' color='text.secondary'>
            {DESIGN_HANDOFF_COPY.pageDescription}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          <GreenhouseButton
            kind='secondaryAction'
            leadingIconClassName={command === 'reload' ? 'tabler-loader-2' : 'tabler-refresh'}
            disabled={command === 'reload'}
            onClick={() => runCommand('reload', async () => {
              await reload(true)

              return DESIGN_HANDOFF_COPY.messages.loaded
            })}
          >
            {DESIGN_HANDOFF_COPY.actions.refresh}
          </GreenhouseButton>
          <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-plus' onClick={() => setActiveTab('intake')}>
            {DESIGN_HANDOFF_COPY.tabs.intake}
          </GreenhouseButton>
        </Stack>
      </Stack>

      {message ? <Alert severity={message.severity}>{message.text}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 2
        }}
      >
        <MetricTile label='Activos' value={activeEntries.length} helper='No archivados en el ledger' tone='info' icon='tabler-stack-2' />
        <MetricTile label='Bloqueos' value={metrics.blocked} helper='Con razón de bloqueo' tone={metrics.blocked ? 'warning' : 'success'} icon='tabler-lock' />
        <MetricTile label='Node drift' value={metrics.nodeDrift} helper='Snapshot no reachable' tone={metrics.nodeDrift ? 'warning' : 'success'} icon='tabler-brand-figma' />
        <MetricTile label='Missing evidence' value={metrics.missingEvidence} helper='Implementados sin GVC/runtime' tone={metrics.missingEvidence ? 'error' : 'success'} icon='tabler-shield-x' />
      </Box>

      <Box
        sx={theme => ({
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          overflow: 'hidden'
        })}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value: HandoffTab) => setActiveTab(value)}
          variant='scrollable'
          scrollButtons='auto'
          sx={theme => ({
            px: 2,
            borderBlockEnd: `1px solid ${theme.palette.divider}`,
            '& .MuiTab-root': { minBlockSize: 52 }
          })}
        >
          <Tab
            value='ledger'
            label={DESIGN_HANDOFF_COPY.tabs.ledger}
            icon={<i className='tabler-list-details' />}
            iconPosition='start'
            data-capture='design-system-handoff-tab-ledger'
          />
          <Tab
            value='intake'
            label={DESIGN_HANDOFF_COPY.tabs.intake}
            icon={<i className='tabler-circle-plus' />}
            iconPosition='start'
            data-capture='design-system-handoff-tab-intake'
          />
          <Tab
            value='allowlist'
            label={DESIGN_HANDOFF_COPY.tabs.allowlist}
            icon={<i className='tabler-shield-check' />}
            iconPosition='start'
            data-capture='design-system-handoff-tab-allowlist'
          />
          <Tab
            value='drift'
            label={DESIGN_HANDOFF_COPY.tabs.drift}
            icon={<i className='tabler-activity-heartbeat' />}
            iconPosition='start'
            data-capture='design-system-handoff-tab-drift'
          />
        </Tabs>
        <Box sx={{ p: { xs: 2, md: 3 }, minInlineSize: 0 }}>
          {activeTab === 'ledger' ? renderLedger() : null}
          {activeTab === 'intake' ? renderIntake() : null}
          {activeTab === 'allowlist' ? renderAllowlist() : null}
          {activeTab === 'drift' ? renderDrift() : null}
        </Box>
      </Box>
    </Stack>
  )

  const readiness = getReadiness(selectedEntry)

  const inspector = (
    <ContextualSidecar
      title={selectedEntry?.title ?? 'Sin handoff seleccionado'}
      subtitle={
        selectedEntry
          ? `${selectedEntry.fileLabel ?? selectedEntry.fileKey} · ${selectedEntry.nodeId}`
          : DESIGN_HANDOFF_COPY.helper.noSelection
      }
      eyebrow={DESIGN_HANDOFF_COPY.sections.commandCenter}
      icon='tabler-layout-sidebar-right'
      kind='inspector'
      variant='inspector'
      onClose={() => setSelectedId(null)}
      dataCapture='design-system-handoff-inspector'
    >
      {selectedEntry ? (
        <Stack spacing={3}>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <GreenhouseChip
              size='small'
              kind='status'
              variant='label'
              label={DESIGN_HANDOFF_STATUS_LABELS[selectedEntry.status]}
              tone={STATUS_TONES[selectedEntry.status]}
            />
            <GreenhouseChip
              size='small'
              kind='attribute'
              variant='outlined'
              label={DESIGN_HANDOFF_PRIORITY_LABELS[selectedEntry.priority]}
              tone={PRIORITY_TONES[selectedEntry.priority]}
            />
            <GreenhouseChip size='small' kind='attribute' label={DESIGN_HANDOFF_KIND_LABELS[selectedEntry.kind]} tone='default' />
          </Stack>

          <Box
            sx={theme => ({
              p: 2.5,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              bgcolor: alpha(theme.palette.primary.main, 0.035)
            })}
          >
            <Stack spacing={1.25}>
              <Typography variant='caption' color='text.secondary' sx={typographyScale.labelSm}>
                Figma node
              </Typography>
              <Typography variant='body2' sx={{ wordBreak: 'break-word' }}>
                {selectedEntry.fileKey} · {selectedEntry.nodeId}
              </Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                <GreenhouseChip
                  size='small'
                  variant='label'
                  tone={SNAPSHOT_TONES[getSnapshotStatus(selectedEntry)]}
                  label={DESIGN_HANDOFF_NODE_STATUS_LABELS[getSnapshotStatus(selectedEntry)]}
                />
                <Tooltip title={selectedEntry.latestNodeSnapshot?.providerCheckedAt ?? 'Sin snapshot'}>
                  <span>
                    <GreenhouseButton
                      kind='secondaryAction'
                      variant='outlined'
                      size='small'
                      leadingIconClassName={command === 'verify' ? 'tabler-loader-2' : 'tabler-refresh-dot'}
                      disabled={command === 'verify'}
                      onClick={verifyNode}
                    >
                      {DESIGN_HANDOFF_COPY.actions.verifyNode}
                    </GreenhouseButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>

          <Stack spacing={1.5} data-capture='design-system-handoff-evidence'>
            <Typography variant='subtitle2'>{DESIGN_HANDOFF_COPY.sections.implementationReadiness}</Typography>
            {readiness.map(item => (
              <Stack key={item.label} direction='row' spacing={1.25} alignItems='flex-start'>
                <Box
                  component='i'
                  className={item.done ? 'tabler-circle-check' : 'tabler-circle-dashed'}
                  aria-hidden='true'
                  sx={{ color: item.done ? 'success.main' : 'text.disabled', fontSize: 18, mt: 0.25 }}
                />
                <Box sx={{ minInlineSize: 0 }}>
                  <Typography variant='body2'>{item.label}</Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ wordBreak: 'break-word' }}>
                    {item.helper}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant='subtitle2'>Planificación</Typography>
            <FormControl fullWidth>
              <InputLabel id='design-handoff-priority-label'>Prioridad</InputLabel>
              <Select
                labelId='design-handoff-priority-label'
                label='Prioridad'
                value={planningPriority}
                onChange={event => setPlanningPriority(event.target.value as DesignHandoffPriority)}
              >
                {PRIORITIES.map(priority => (
                  <MenuItem key={priority} value={priority}>
                    {DESIGN_HANDOFF_PRIORITY_LABELS[priority]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='Target surface'
              value={planningTargetSurfaceKey}
              onChange={event => setPlanningTargetSurfaceKey(event.target.value)}
              placeholder='/design-system/handoff'
              fullWidth
            />
            <TextField
              label='Due date'
              type='date'
              value={planningDueAt}
              onChange={event => setPlanningDueAt(event.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='Bloqueo'
              value={planningBlockedReason}
              onChange={event => setPlanningBlockedReason(event.target.value)}
              placeholder='Sin bloqueo'
              fullWidth
              multiline
              minRows={2}
            />
            <GreenhouseButton
              kind='secondaryAction'
              leadingIconClassName={command === 'planning' ? 'tabler-loader-2' : 'tabler-device-floppy'}
              disabled={command === 'planning'}
              onClick={savePlanning}
            >
              {DESIGN_HANDOFF_COPY.actions.savePlanning}
            </GreenhouseButton>
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant='subtitle2'>Owners</Typography>
            <TextField
              label='Designer owner member_id'
              value={designerOwner}
              onChange={event => setDesignerOwner(event.target.value)}
              fullWidth
            />
            <TextField
              label='DEV owner member_id'
              value={devOwner}
              onChange={event => setDevOwner(event.target.value)}
              fullWidth
            />
            <GreenhouseButton
              kind='secondaryAction'
              leadingIconClassName={command === 'owners' ? 'tabler-loader-2' : 'tabler-users'}
              disabled={command === 'owners'}
              onClick={saveOwners}
            >
              {DESIGN_HANDOFF_COPY.actions.assignOwners}
            </GreenhouseButton>
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant='subtitle2'>{DESIGN_HANDOFF_COPY.sections.evidence}</Typography>
            <FormControl fullWidth>
              <InputLabel id='design-handoff-evidence-label'>Tipo</InputLabel>
              <Select
                labelId='design-handoff-evidence-label'
                label='Tipo'
                value={evidenceType}
                onChange={event => setEvidenceType(event.target.value as DesignHandoffEvidenceType)}
              >
                {EVIDENCE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {DESIGN_HANDOFF_EVIDENCE_TYPE_LABELS[type]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label='Ref' value={evidenceRef} onChange={event => setEvidenceRef(event.target.value)} fullWidth />
            <TextField
              label='Label'
              value={evidenceLabel}
              onChange={event => setEvidenceLabel(event.target.value)}
              fullWidth
            />
            <GreenhouseButton
              kind='primaryAction'
              leadingIconClassName={command === 'evidence' ? 'tabler-loader-2' : 'tabler-shield-plus'}
              disabled={!evidenceRef.trim() || command === 'evidence'}
              onClick={attachEvidence}
            >
              {DESIGN_HANDOFF_COPY.actions.attachEvidence}
            </GreenhouseButton>
            <Stack spacing={1}>
              {(selectedEntry.evidence ?? []).slice(0, 5).map(evidence => (
                <GreenhouseChip
                  key={evidence.evidenceId}
                  size='small'
                  kind='attribute'
                  variant='outlined'
                  tone={evidence.evidenceType === 'manual_exception' ? 'warning' : 'success'}
                  label={`${DESIGN_HANDOFF_EVIDENCE_TYPE_LABELS[evidence.evidenceType]} · ${evidence.label ?? evidence.ref}`}
                />
              ))}
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant='subtitle2'>{DESIGN_HANDOFF_COPY.sections.workItems}</Typography>
            <FormControl fullWidth>
              <InputLabel id='design-handoff-link-label'>Tipo</InputLabel>
              <Select
                labelId='design-handoff-link-label'
                label='Tipo'
                value={linkType}
                onChange={event => setLinkType(event.target.value as DesignHandoffLinkType)}
              >
                {LINK_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {DESIGN_HANDOFF_LINK_TYPE_LABELS[type]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label='Ref' value={linkRef} onChange={event => setLinkRef(event.target.value)} fullWidth />
            <TextField label='Label' value={linkLabel} onChange={event => setLinkLabel(event.target.value)} fullWidth />
            <GreenhouseButton
              kind='secondaryAction'
              leadingIconClassName={command === 'link' ? 'tabler-loader-2' : 'tabler-link-plus'}
              disabled={!linkRef.trim() || command === 'link'}
              onClick={linkWorkItem}
            >
              {DESIGN_HANDOFF_COPY.actions.linkWorkItem}
            </GreenhouseButton>
            <Stack spacing={1}>
              {(selectedEntry.links ?? []).slice(0, 5).map(link => (
                <GreenhouseChip
                  key={link.linkId}
                  size='small'
                  kind='attribute'
                  variant='outlined'
                  tone='info'
                  label={`${DESIGN_HANDOFF_LINK_TYPE_LABELS[link.linkType]} · ${link.label ?? link.ref}`}
                />
              ))}
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <TextField
              label='Ruta implementada'
              value={implementedSurfaceKey}
              onChange={event => setImplementedSurfaceKey(event.target.value)}
              placeholder='/agency/example'
              fullWidth
              helperText={DESIGN_HANDOFF_COPY.helper.implementedSurface}
            />
            <GreenhouseButton
              kind='secondaryAction'
              leadingIconClassName='tabler-player-play'
              disabled={selectedEntry.status !== 'proposed' || command === 'transition'}
              onClick={() => transition('in_implementation')}
            >
              {DESIGN_HANDOFF_COPY.actions.startImplementation}
            </GreenhouseButton>
            <GreenhouseButton
              kind='secondaryAction'
              leadingIconClassName='tabler-send'
              disabled={selectedEntry.status !== 'in_implementation' || command === 'transition'}
              onClick={() => transition('in_review')}
            >
              {DESIGN_HANDOFF_COPY.actions.sendReview}
            </GreenhouseButton>
            <GreenhouseButton
              kind='primaryAction'
              leadingIconClassName='tabler-check'
              disabled={selectedEntry.status !== 'in_review' || !implementedSurfaceKey.trim() || command === 'transition'}
              onClick={() => transition('implemented')}
            >
              {DESIGN_HANDOFF_COPY.actions.markImplemented}
            </GreenhouseButton>
            <GreenhouseButton
              kind='secondaryAction'
              variant='text'
              tone='warning'
              leadingIconClassName='tabler-archive'
              disabled={selectedEntry.status === 'archived' || command === 'transition'}
              onClick={() => transition('archived')}
            >
              {DESIGN_HANDOFF_COPY.actions.archive}
            </GreenhouseButton>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2} alignItems='center' sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
          <Typography variant='body2' color='text.secondary'>
            {DESIGN_HANDOFF_COPY.helper.noSelection}
          </Typography>
        </Stack>
      )}
    </ContextualSidecar>
  )

  return (
    <Box
      data-capture='design-system-handoff-page'
      sx={{ inlineSize: '100%', maxInlineSize: 1440, mx: 'auto', minWidth: 0, overflowX: 'clip' }}
    >
      <CompositionShell
        composition='single'
        instanceId='design-handoff'
        regions={{
          primary: (
            <AdaptiveSidecarLayout
              open={Boolean(selectedEntry)}
              onOpenChange={open => {
                if (!open) setSelectedId(null)
              }}
              sidecar={inspector}
              kind='inspector'
              preferredMode='push'
              sidecarWidth={460}
              sidecarMaxWidth={560}
              minHeight={760}
              mainMinWidth={0}
              dataCapture='design-system-handoff-workbench'
            >
              {renderMain()}
            </AdaptiveSidecarLayout>
          )
        }}
      />
    </Box>
  )
}

export default DesignHandoffLaneView
