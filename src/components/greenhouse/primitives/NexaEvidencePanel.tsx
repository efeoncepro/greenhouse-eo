'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import {
  evidenceConfidenceLabel,
  evidenceFreshnessLabel,
  type ConversationalEvidencePacket,
  type ConversationalEvidenceSource,
  type ConversationalEvidenceTraceStep
} from '@/lib/nexa/conversational-evidence'
import { GH_KNOWLEDGE_COPY } from '@/lib/copy/knowledge'

import GreenhouseButton from './GreenhouseButton'
import GreenhouseChip from './GreenhouseChip'
import GreenhouseStatusDot from './GreenhouseStatusDot'

export type NexaEvidencePanelVariant = 'traceCard' | 'proofPanel'

export interface NexaEvidencePanelProps {
  evidence: ConversationalEvidencePacket
  variant?: NexaEvidencePanelVariant
  feedbackEnabled?: boolean
  maxSources?: number
}

type KnowledgeFeedbackKind = 'useful' | 'not_useful' | 'wrong_source'

const EvidenceTraceStep = ({ step, index }: { step: ConversationalEvidenceTraceStep; index: number }) => {
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

const EvidenceSourceCard = ({ source }: { source: ConversationalEvidenceSource }) => {
  const theme = useTheme()
  const scoreLabel = Number.isFinite(source.score) ? `Puntaje ${source.score?.toFixed(2)}` : null

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        backgroundColor: theme.palette.background.paper,
        p: 3,
        minInlineSize: 0,
        maxInlineSize: '100%'
      }}
    >
      <Stack spacing={2} sx={{ minInlineSize: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          flexWrap='wrap'
          useFlexGap
          sx={{ minInlineSize: 0 }}
        >
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
          <Typography
            variant='subtitle2'
            sx={{
              flex: { sm: '1 1 220px' },
              minInlineSize: 0,
              maxInlineSize: '100%',
              overflowWrap: 'anywhere'
            }}
          >
            {source.title}
          </Typography>
          <Typography variant='caption' color='primary.main' sx={{ fontWeight: 700 }}>
            {source.citationLabel}
          </Typography>
          {scoreLabel ? <GreenhouseChip size='small' variant='label' tone='primary' label={scoreLabel} /> : null}
          <GreenhouseChip size='small' variant='label' tone={source.freshness === 'current' ? 'success' : 'warning'} label={evidenceFreshnessLabel(source.freshness)} />
        </Stack>
        <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
          Ruta: {source.headingPath.join(' > ') || source.title}
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
            {source.excerpt.length > 220 ? `${source.excerpt.slice(0, 220)}...` : source.excerpt}
          </Typography>
        </Box>
        {source.humanUrl ? (
          <GreenhouseButton
            component='a'
            href={source.humanUrl}
            size='small'
            variant='outlined'
            tone='primary'
            leadingIconClassName='tabler-external-link'
            sx={{ alignSelf: 'flex-start' }}
          >
            Abrir fuente
          </GreenhouseButton>
        ) : null}
      </Stack>
    </Box>
  )
}

const KnowledgeFeedbackButtons = ({
  target
}: {
  target: ConversationalEvidencePacket['primaryFeedbackTarget']
}) => {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [selected, setSelected] = useState<KnowledgeFeedbackKind | null>(null)

  if (!target) return null

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

const NexaEvidencePanel = ({
  evidence,
  variant = 'traceCard',
  feedbackEnabled = true,
  maxSources = 3
}: NexaEvidencePanelProps) => {
  const theme = useTheme()
  const isTraceCard = variant === 'traceCard'
  const visibleSources = evidence.sources.slice(0, maxSources)
  const hiddenSourceCount = Math.max(0, evidence.sources.length - visibleSources.length)

  return (
    <Box
      data-capture='nexa-evidence-panel'
      sx={{
        mt: isTraceCard ? 2.5 : 0,
        border: isTraceCard ? `1px solid ${theme.palette.divider}` : 0,
        borderRadius: isTraceCard ? `${theme.shape.customBorderRadius.lg}px` : 0,
        backgroundColor: theme.palette.background.paper,
        boxShadow: isTraceCard ? `0 12px 30px ${alpha(theme.palette.common.black, 0.05)}` : 'none',
        overflow: 'hidden',
        minInlineSize: 0,
        maxInlineSize: '100%'
      }}
    >
      <Box sx={{ px: isTraceCard ? 3 : 0, py: isTraceCard ? 2.5 : 0 }}>
        <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
          <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
            <Typography variant={isTraceCard ? 'subtitle2' : 'body2'} sx={{ fontWeight: 700 }}>
              Fuentes y trazabilidad
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Evidencia versionada desde {evidence.sourceContractVersion}.
            </Typography>
          </Stack>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ minInlineSize: 0, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <GreenhouseChip size='small' variant='label' tone={evidence.confidence === 'none' ? 'warning' : 'primary'} label={`Confianza: ${evidenceConfidenceLabel(evidence.confidence)}`} />
            <GreenhouseChip size='small' variant='label' tone={evidence.freshness === 'current' ? 'success' : 'warning'} label={evidenceFreshnessLabel(evidence.freshness)} />
            <GreenhouseChip size='small' variant='label' tone='default' label={`${evidence.sources.length} fragmentos`} />
          </Stack>
        </Stack>
      </Box>

      {isTraceCard ? <Divider /> : null}

      <Box sx={{ px: isTraceCard ? 3 : 0, py: isTraceCard ? 1 : 0 }}>
        {evidence.traceSteps.map((step, index) => (
          <EvidenceTraceStep key={step.id} step={step} index={index} />
        ))}
      </Box>

      {evidence.sources.length > 0 ? (
        <>
          {isTraceCard ? <Divider /> : <Box sx={{ borderBlockStart: `1px solid ${theme.palette.divider}`, mt: 2 }} />}
          <Stack spacing={2.5} sx={{ px: isTraceCard ? 3 : 0, py: isTraceCard ? 3 : 2.5 }}>
            <Typography variant='subtitle2'>
              {GH_KNOWLEDGE_COPY.sourcesLabel} ({evidence.citedDocumentCount})
            </Typography>
            <Stack spacing={2} sx={{ minInlineSize: 0 }}>
              {visibleSources.map(source => (
                <EvidenceSourceCard key={source.id} source={source} />
              ))}
            </Stack>
            {hiddenSourceCount > 0 ? (
              <Typography variant='caption' color='text.secondary'>
                +{hiddenSourceCount} fragmento{hiddenSourceCount === 1 ? '' : 's'} adicional{hiddenSourceCount === 1 ? '' : 'es'} en el packet.
              </Typography>
            ) : null}
            {feedbackEnabled ? <KnowledgeFeedbackButtons target={evidence.primaryFeedbackTarget} /> : null}
          </Stack>
        </>
      ) : (
        <>
          {isTraceCard ? <Divider /> : null}
          <Alert severity='warning' sx={{ m: isTraceCard ? 3 : 0, mt: isTraceCard ? 3 : 2 }}>
            No encontré una guía publicada para esta pregunta. Nexa debe responder con gap honesto, sin inventar.
          </Alert>
        </>
      )}
    </Box>
  )
}

export default NexaEvidencePanel
