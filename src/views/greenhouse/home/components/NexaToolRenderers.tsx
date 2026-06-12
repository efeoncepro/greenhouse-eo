'use client'

import { useMemo, useState } from 'react'

import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { useAssistantToolUI } from '@assistant-ui/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import type { NexaToolResult } from '@/lib/nexa/nexa-contract'
import type { KnowledgeRetrievalChunk, KnowledgeRetrievalPacket } from '@/lib/knowledge/search'

import { GreenhouseButton, GreenhouseChip, GreenhouseStatusDot } from '@/components/greenhouse/primitives'
import { GH_KNOWLEDGE_COPY } from '@/lib/copy/knowledge'

type KnowledgeFeedbackKind = 'useful' | 'not_useful' | 'wrong_source'

interface KnowledgeTraceSummary {
  maxScore: number | null
  citedDocumentCount: number
  traceSteps: Array<{
    id: string
    label: string
    description: string
    metadata: string
    state: 'complete' | 'active' | 'pending'
  }>
  primaryTarget: Pick<KnowledgeRetrievalChunk, 'chunkId' | 'documentId'> | null
}

const toneToColor = (tone?: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (tone) {
    case 'success':
    case 'warning':
    case 'error':
    case 'info':
      return tone
    default:
      return 'default'
  }
}

const freshnessLabel = (freshness: KnowledgeRetrievalPacket['freshness']) => {
  switch (freshness) {
    case 'current':
      return 'Actual'
    case 'stale':
      return 'Revisión pendiente'
    case 'deprecated':
      return 'Deprecada'
    default:
      return 'Sin vigencia'
  }
}

const confidenceLabel = (confidence: KnowledgeRetrievalPacket['confidence']) => {
  switch (confidence) {
    case 'high':
      return 'Alta'
    case 'medium':
      return 'Media'
    case 'low':
      return 'Baja'
    default:
      return 'Sin fuente'
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export const extractKnowledgePacket = (result: NexaToolResult): KnowledgeRetrievalPacket | null => {
  const raw = asRecord(result.raw)
  const packet = asRecord(raw?.packet)

  if (!packet || packet.contractVersion !== 'knowledge-search.v1' || !Array.isArray(packet.chunks)) {
    return null
  }

  return packet as unknown as KnowledgeRetrievalPacket
}

export const deriveKnowledgeTraceSummary = (packet: KnowledgeRetrievalPacket): KnowledgeTraceSummary => {
  const scores = packet.chunks.map(chunk => chunk.score).filter(score => Number.isFinite(score))
  const maxScore = scores.length > 0 ? Math.max(...scores) : null
  const citedDocumentCount = new Set(packet.chunks.map(chunk => chunk.documentId)).size
  const primaryTarget = packet.chunks[0] ? { chunkId: packet.chunks[0].chunkId, documentId: packet.chunks[0].documentId } : null
  const maxScoreText = maxScore == null ? 'sin puntaje' : `puntaje máx. ${maxScore.toFixed(2)}`

  return {
    maxScore,
    citedDocumentCount,
    primaryTarget,
    traceSteps: [
      {
        id: 'intent',
        label: 'Intento detectado',
        description: 'Consulta de conocimiento',
        metadata: `Query: ${packet.query}`,
        state: 'complete'
      },
      {
        id: 'retrieval',
        label: `Búsqueda: ${packet.chunks.length} fragmentos incluidos`,
        description: `Confianza de búsqueda: ${confidenceLabel(packet.confidence)}`,
        metadata: `${maxScoreText} · filtrados por política: ${packet.deniedOrFilteredCount}`,
        state: packet.chunks.length > 0 ? 'complete' : 'active'
      },
      {
        id: 'answer',
        label: 'Respuesta con citas',
        description: `${citedDocumentCount} fuente${citedDocumentCount === 1 ? '' : 's'} citada${citedDocumentCount === 1 ? '' : 's'}`,
        metadata: `Vigencia: ${freshnessLabel(packet.freshness)}`,
        state: packet.chunks.length > 0 ? 'active' : 'pending'
      },
      {
        id: 'feedback',
        label: 'Feedback y mejora',
        description: 'Tu señal mejora el corpus',
        metadata: primaryTarget ? 'Disponible para esta respuesta' : 'Sin fuente objetivo',
        state: 'pending'
      }
    ]
  }
}

const ToolCard = ({ toolName, result }: { toolName: string; result: NexaToolResult }) => (
  <Box
    sx={{
      mt: 1.25,
      border: 1,
      borderColor: 'divider',
      borderRadius: 3,
      bgcolor: 'action.hover',
      px: 2,
      py: 1.5
    }}
  >
    <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
      <Chip
        size='small'
        label={toolName}
        color={result.available ? 'primary' : 'default'}
        variant={result.available ? 'filled' : 'outlined'}
      />
      <Typography variant='caption' color='text.secondary'>
        {result.scopeLabel}
      </Typography>
    </Stack>

    {!result.available && (
      <Alert severity='warning' sx={{ mb: 1.25 }}>
        {result.summary}
      </Alert>
    )}

    {result.available && (
      <>
        <Typography variant='body2' sx={{ color: 'text.primary', mb: result.metrics.length > 0 ? 1.25 : 0 }}>
          {result.summary}
        </Typography>

        {result.metrics.length > 0 && (
          <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
            {result.metrics.map(metric => (
              <Chip
                key={`${toolName}-${metric.label}`}
                size='small'
                variant='outlined'
                color={toneToColor(metric.tone)}
                label={`${metric.label}: ${metric.value}`}
              />
            ))}
          </Stack>
        )}
      </>
    )}
  </Box>
)

const KnowledgeTraceStep = ({
  step,
  index
}: {
  step: KnowledgeTraceSummary['traceSteps'][number]
  index: number
}) => {
  const theme = useTheme()
  const active = step.state === 'active'
  const complete = step.state === 'complete'

  return (
    <Stack direction='row' spacing={2.5} alignItems='flex-start' sx={{ py: 2.5 }}>
      <Box
        sx={{
          inlineSize: 26,
          blockSize: 26,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          flex: '0 0 auto',
          color: complete || active ? theme.palette.primary.contrastText : theme.palette.text.secondary,
          backgroundColor: complete ? theme.palette.success.main : active ? theme.palette.primary.main : theme.palette.action.selected
        }}
      >
        <Typography variant='caption' sx={{ color: 'inherit', fontWeight: 700 }}>
          {index + 1}
        </Typography>
      </Box>
      <Stack spacing={0.75} sx={{ minInlineSize: 0 }}>
        <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
          <Typography variant='subtitle2'>{step.label}</Typography>
          {complete ? <GreenhouseStatusDot tone='success' ariaLabel={GH_KNOWLEDGE_COPY.aria.completedStep} /> : null}
          {active ? <GreenhouseChip size='small' variant='label' tone='primary' label='Activo' /> : null}
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          {step.description}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
          {step.metadata}
        </Typography>
      </Stack>
    </Stack>
  )
}

const KnowledgeSourceCard = ({ chunk }: { chunk: KnowledgeRetrievalChunk }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        backgroundColor: theme.palette.background.paper,
        p: 3
      }}
    >
      <Stack spacing={2}>
        <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
          <Box
            sx={{
              inlineSize: 28,
              blockSize: 28,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              display: 'grid',
              placeItems: 'center',
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.08)
            }}
          >
            <i className='tabler-file-text' aria-hidden='true' />
          </Box>
          <Typography variant='subtitle2' sx={{ minInlineSize: 0, overflowWrap: 'anywhere' }}>
            {chunk.citationLabel}
          </Typography>
          <GreenhouseChip size='small' variant='label' tone='primary' label={`Puntaje ${chunk.score.toFixed(2)}`} />
          <GreenhouseChip size='small' variant='label' tone={chunk.freshness === 'current' ? 'success' : 'warning'} label={freshnessLabel(chunk.freshness)} />
        </Stack>
        <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
          Ruta: {chunk.headingPath.join(' > ') || chunk.title}
        </Typography>
        <Box
          sx={{
            borderInlineStart: `3px solid ${theme.palette.primary.main}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            px: 3,
            py: 2
          }}
        >
          <Typography variant='body2' color='text.secondary'>
            {chunk.text.length > 220 ? `${chunk.text.slice(0, 220)}…` : chunk.text}
          </Typography>
        </Box>
        <GreenhouseButton
          component='a'
          href={chunk.humanUrl}
          size='small'
          variant='outlined'
          tone='primary'
          leadingIconClassName='tabler-external-link'
          sx={{ alignSelf: 'flex-start' }}
        >
          Abrir fuente
        </GreenhouseButton>
      </Stack>
    </Box>
  )
}

const KnowledgeFeedbackButtons = ({ target }: { target: KnowledgeTraceSummary['primaryTarget'] }) => {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [selected, setSelected] = useState<KnowledgeFeedbackKind | null>(null)

  if (!target) {
    return null
  }

  const submit = async (feedbackKind: KnowledgeFeedbackKind) => {
    if (state === 'sending') return

    setSelected(feedbackKind)
    setState('sending')

    try {
      const response = await fetch('/api/platform/app/knowledge/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: target.documentId,
          chunkId: target.chunkId,
          feedbackKind
        })
      })

      setState(response.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
        <GreenhouseButton size='small' variant={selected === 'useful' ? 'solid' : 'outlined'} tone='primary' disabled={state === 'sending'} onClick={() => void submit('useful')} leadingIconClassName='tabler-thumb-up'>
          {GH_KNOWLEDGE_COPY.feedbackUseful}
        </GreenhouseButton>
        <GreenhouseButton size='small' variant={selected === 'not_useful' ? 'solid' : 'outlined'} tone='secondary' disabled={state === 'sending'} onClick={() => void submit('not_useful')} leadingIconClassName='tabler-thumb-down'>
          {GH_KNOWLEDGE_COPY.feedbackNotUseful}
        </GreenhouseButton>
        <GreenhouseButton size='small' variant={selected === 'wrong_source' ? 'solid' : 'outlined'} tone='warning' disabled={state === 'sending'} onClick={() => void submit('wrong_source')} leadingIconClassName='tabler-flag'>
          {GH_KNOWLEDGE_COPY.feedbackIncorrect}
        </GreenhouseButton>
      </Stack>
      {state === 'sent' ? (
        <Typography variant='caption' color='success.main' role='status'>
          {GH_KNOWLEDGE_COPY.feedbackRegisteredShort}
        </Typography>
      ) : null}
      {state === 'error' ? (
        <Typography variant='caption' color='error.main' role='status'>
          No pude registrar el feedback de Knowledge. Intenta de nuevo.
        </Typography>
      ) : null}
    </Stack>
  )
}

export const NexaKnowledgeToolTraceCard = ({
  result,
  feedbackEnabled = true
}: {
  result: NexaToolResult
  feedbackEnabled?: boolean
}) => {
  const theme = useTheme()
  const packet = extractKnowledgePacket(result)
  const summary = useMemo(() => (packet ? deriveKnowledgeTraceSummary(packet) : null), [packet])

  if (!packet || !summary) {
    return <ToolCard toolName='search_knowledge' result={result} />
  }

  return (
    <Box
      data-capture='nexa-knowledge-tool-trace'
      sx={{
        mt: 2.5,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: `0 12px 30px ${alpha(theme.palette.common.black, 0.05)}`,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ px: 3, py: 2.5 }}>
        <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
          <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
            <Typography variant='subtitle2'>Prueba y trazabilidad</Typography>
            <Typography variant='caption' color='text.secondary'>
              Contrato knowledge-search.v1 usado por Nexa en esta respuesta.
            </Typography>
          </Stack>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <GreenhouseChip size='small' variant='label' tone={packet.confidence === 'none' ? 'warning' : 'primary'} label={`Confianza: ${confidenceLabel(packet.confidence)}`} />
            <GreenhouseChip size='small' variant='label' tone={packet.freshness === 'current' ? 'success' : 'warning'} label={freshnessLabel(packet.freshness)} />
            <GreenhouseChip size='small' variant='label' tone='default' label={`${packet.chunks.length} fragmentos`} />
          </Stack>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ px: 3, py: 1 }}>
        {summary.traceSteps.map((step, index) => (
          <KnowledgeTraceStep key={step.id} step={step} index={index} />
        ))}
      </Box>
      {packet.chunks.length > 0 ? (
        <>
          <Divider />
          <Stack spacing={2.5} sx={{ px: 3, py: 3 }}>
            <Typography variant='subtitle2'>
              {GH_KNOWLEDGE_COPY.sourcesLabel} ({summary.citedDocumentCount})
            </Typography>
            <Stack spacing={2}>
              {packet.chunks.slice(0, 3).map(chunk => (
                <KnowledgeSourceCard key={chunk.chunkId} chunk={chunk} />
              ))}
            </Stack>
            {packet.chunks.length > 3 ? (
              <Typography variant='caption' color='text.secondary'>
                +{packet.chunks.length - 3} fragmento{packet.chunks.length - 3 === 1 ? '' : 's'} adicional{packet.chunks.length - 3 === 1 ? '' : 'es'} en el packet.
              </Typography>
            ) : null}
            {feedbackEnabled ? <KnowledgeFeedbackButtons target={summary.primaryTarget} /> : null}
          </Stack>
        </>
      ) : (
        <>
          <Divider />
          <Alert severity='warning' sx={{ m: 3 }}>
            No encontré una guía publicada para esta pregunta. Nexa debe responder con gap honesto, sin inventar.
          </Alert>
        </>
      )}
    </Box>
  )
}

const createRenderer = (toolName: string) => {
  const Renderer = ({ result }: ToolCallMessagePartProps<Record<string, unknown>, NexaToolResult>) => {
    if (!result) {
      return (
        <Alert severity='info' sx={{ mt: 1.25 }}>
          Ejecutando {toolName}...
        </Alert>
      )
    }

    return <ToolCard toolName={toolName} result={result} />
  }

  Renderer.displayName = `NexaToolRenderer(${toolName})`

  return Renderer
}

const NexaToolRenderers = () => {
  useAssistantToolUI({
    toolName: 'check_payroll',
    render: createRenderer('check_payroll')
  })
  useAssistantToolUI({
    toolName: 'get_otd',
    render: createRenderer('get_otd')
  })
  useAssistantToolUI({
    toolName: 'check_emails',
    render: createRenderer('check_emails')
  })
  useAssistantToolUI({
    toolName: 'get_capacity',
    render: createRenderer('get_capacity')
  })
  useAssistantToolUI({
    toolName: 'pending_invoices',
    render: createRenderer('pending_invoices')
  })
  useAssistantToolUI({
    toolName: 'search_knowledge',
    render: ({ result }: ToolCallMessagePartProps<Record<string, unknown>, NexaToolResult>) => {
      if (!result) {
        return (
          <Alert severity='info' sx={{ mt: 1.25 }}>
            Consultando Knowledge...
          </Alert>
        )
      }

      return <NexaKnowledgeToolTraceCard result={result} />
    }
  })

  return null
}

export default NexaToolRenderers
