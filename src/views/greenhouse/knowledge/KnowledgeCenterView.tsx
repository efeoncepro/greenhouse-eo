'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import EmptyState from '@/components/greenhouse/EmptyState'
import {
  GreenhouseBreadcrumbs,
  GreenhouseButton,
  GreenhouseChip,
  GreenhouseStatusDot,
  NexaEvidencePanel,
  NexaComposer,
  NexaComposerActionButton,
  NexaComposerInput
} from '@/components/greenhouse/primitives'
import { GH_KNOWLEDGE_COPY } from '@/lib/copy/knowledge'
import { formatDate } from '@/lib/format'
import useReducedMotion from '@/hooks/useReducedMotion'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import { NexaContextScope } from '@/lib/nexa/nexa-page-context'
import { knowledgePacketToConversationalEvidence } from '@/lib/nexa/conversational-evidence'
import { NEXA_FLOATING_OPEN_EVENT } from '@/lib/nexa/floating-events'

import type { KnowledgeFeedbackKind, KnowledgeFreshness } from '@/lib/knowledge/types'
import type { KnowledgeRetrievalChunk, KnowledgeRetrievalPacket } from '@/lib/knowledge/search'
import type { ConversationalEvidencePacket } from '@/lib/nexa/conversational-evidence'

type ApiEnvelope<T> = {
  data?: T
  error?: { message?: string; code?: string }
}

type KnowledgeDocumentSummary = {
  documentId: string
  publicId: string
  slug: string
  title: string
  documentType: string
  ownerDomain: string
  audience: string
  sensitivity: string
  publicationStatus: string
  agenticPolicy: string
  humanUrl: string | null
  lastReviewedAt: string | null
  docLayer: string | null
}

type KnowledgeDocumentSection = {
  chunkId: string
  chunkIndex: number
  headingPath: string[]
  citationAnchor: string
  bodyText: string
}

type KnowledgeDocumentsPayload = {
  items: KnowledgeDocumentSummary[]
  total: number
}

type KnowledgeDocumentDetailPayload = {
  document: KnowledgeDocumentSummary
  sections: KnowledgeDocumentSection[]
}

type WorkbenchResult = {
  document: KnowledgeDocumentSummary
  chunk: KnowledgeRetrievalChunk | null
  score: number | null
}

type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

const MotionBox = motion(Box)

const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? 'Knowledge request failed')
  }

  return payload.data
}

const formatReviewDate = (value: string | null) =>
  formatDate(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    fallback: 'Sin revisión'
  })

const sentence = (value: string | null | undefined) =>
  value
    ? value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
    : 'Sin dato'

const freshnessTone = (freshness: KnowledgeFreshness | string | null | undefined) => {
  if (freshness === 'current' || freshness === 'fresh') return 'success'
  if (freshness === 'stale') return 'warning'
  if (freshness === 'deprecated') return 'error'

  return 'default'
}

const publicationTone = (status: string) => {
  if (status === 'published') return 'success'
  if (status === 'stale') return 'warning'
  if (status === 'deprecated') return 'error'

  return 'default'
}

const firstHeading = (section: KnowledgeDocumentSection | null) =>
  section?.headingPath?.length ? section.headingPath.join(' > ') : 'Resumen publicado'

const documentStatusToFreshness = (status: string): KnowledgeFreshness => {
  if (status === 'stale') return 'stale'
  if (status === 'deprecated') return 'deprecated'

  return 'current'
}

const documentDetailToEvidence = (
  detail: KnowledgeDocumentDetailPayload,
  query: string
): ConversationalEvidencePacket | null => {
  const sections = detail.sections.slice(0, 3)

  if (!sections.length) return null

  const freshness = documentStatusToFreshness(detail.document.publicationStatus)
  const primary = sections[0]

  return {
    contractVersion: 'nexa-evidence.v1',
    kind: 'knowledge',
    sourceContractVersion: 'knowledge-document-detail.v1',
    query: query || detail.document.title,
    generatedAt: detail.document.lastReviewedAt ?? undefined,
    confidence: 'medium',
    freshness,
    deniedOrFilteredCount: 0,
    maxScore: null,
    citedDocumentCount: 1,
    primaryFeedbackTarget: primary ? { documentId: detail.document.documentId, chunkId: primary.chunkId } : null,
    sources: sections.map(section => ({
      id: section.chunkId,
      documentId: detail.document.documentId,
      title: detail.document.title,
      citationLabel: section.citationAnchor || `#${section.chunkIndex + 1}`,
      headingPath: section.headingPath,
      excerpt: section.bodyText,
      humanUrl: detail.document.humanUrl ?? `/knowledge/${detail.document.slug}`,
      freshness,
      updatedAt: detail.document.lastReviewedAt,
      sensitivity: detail.document.sensitivity
    })),
    traceSteps: [
      {
        id: 'document',
        label: GH_KNOWLEDGE_COPY.workbenchEvidenceDocumentStep,
        description: GH_KNOWLEDGE_COPY.workbenchEvidenceDocumentStepBody,
        metadata: detail.document.title,
        state: 'complete'
      },
      {
        id: 'sections',
        label: GH_KNOWLEDGE_COPY.workbenchEvidenceSectionStep,
        description: GH_KNOWLEDGE_COPY.workbenchEvidenceSectionStepBody,
        metadata: `${sections.length} fragmento${sections.length === 1 ? '' : 's'} visible${sections.length === 1 ? '' : 's'}`,
        state: 'complete'
      },
      {
        id: 'feedback',
        label: GH_KNOWLEDGE_COPY.workbenchEvidenceFeedbackStep,
        description: GH_KNOWLEDGE_COPY.workbenchEvidenceFeedbackStepBody,
        metadata: primary ? 'Feedback disponible para esta guía' : 'Sin fuente objetivo',
        state: 'pending'
      }
    ]
  }
}

const buildResults = (
  documents: KnowledgeDocumentSummary[],
  packet: KnowledgeRetrievalPacket | null
): WorkbenchResult[] => {
  if (!packet?.chunks.length) {
    return documents.map(document => ({ document, chunk: null, score: null }))
  }

  const byDocument = new Map(documents.map(document => [document.documentId, document]))
  const bestByDocument = new Map<string, WorkbenchResult>()

  for (const chunk of packet.chunks) {
    const document = byDocument.get(chunk.documentId) ?? {
      documentId: chunk.documentId,
      publicId: chunk.documentId,
      slug: chunk.humanUrl.split('/').pop() ?? chunk.documentId,
      title: chunk.title,
      documentType: 'guide',
      ownerDomain: 'Knowledge',
      audience: 'internal',
      sensitivity: chunk.sensitivity,
      publicationStatus: chunk.freshness === 'deprecated' ? 'deprecated' : chunk.freshness === 'stale' ? 'stale' : 'published',
      agenticPolicy: 'agent_allowed',
      humanUrl: chunk.humanUrl,
      lastReviewedAt: chunk.updatedAt,
      docLayer: null
    }

    const existing = bestByDocument.get(chunk.documentId)

    if (!existing || (existing.score ?? 0) < chunk.score) {
      bestByDocument.set(chunk.documentId, { document, chunk, score: chunk.score })
    }
  }

  return Array.from(bestByDocument.values()).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

const KnowledgeCenterView = () => {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [documents, setDocuments] = useState<KnowledgeDocumentSummary[]>([])
  const [packet, setPacket] = useState<KnowledgeRetrievalPacket | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [detail, setDetail] = useState<KnowledgeDocumentDetailPayload | null>(null)
  const [browseState, setBrowseState] = useState<LoadState>('loading')
  const [searching, setSearching] = useState(false)
  const [detailState, setDetailState] = useState<LoadState>('idle')
  const [feedbackKind, setFeedbackKind] = useState<KnowledgeFeedbackKind | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackState, setFeedbackState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false

    const loadDocuments = async () => {
      setBrowseState('loading')

      try {
        const data = await requestJson<KnowledgeDocumentsPayload>('/api/platform/app/knowledge/documents?limit=80')

        if (cancelled) return

        setDocuments(data.items)
        setBrowseState(data.items.length ? 'ready' : 'empty')
        setSelectedDocumentId(current => current ?? data.items[0]?.documentId ?? null)
      } catch {
        if (cancelled) return
        setBrowseState('error')
      }
    }

    void loadDocuments()

    return () => {
      cancelled = true
    }
  }, [])

  const results = useMemo(() => buildResults(documents, packet), [documents, packet])

  const selectedResult = useMemo(
    () => results.find(result => result.document.documentId === selectedDocumentId) ?? results[0] ?? null,
    [results, selectedDocumentId]
  )

  const selectedSection = detail?.sections[0] ?? null

  const selectedEvidence = useMemo(() => {
    if (!selectedResult) return detail ? documentDetailToEvidence(detail, submittedQuery) : null

    if (!packet) return detail ? documentDetailToEvidence(detail, submittedQuery) : null

    const chunks = packet.chunks.filter(chunk => chunk.documentId === selectedResult.document.documentId)

    if (!chunks.length) return detail ? documentDetailToEvidence(detail, submittedQuery) : null

    return knowledgePacketToConversationalEvidence({ ...packet, chunks })
  }, [detail, packet, selectedResult, submittedQuery])

  useEffect(() => {
    if (!selectedResult?.document.documentId) return

    let cancelled = false

    setDetailState('loading')
    setFeedbackKind(null)
    setFeedbackComment('')
    setFeedbackState('idle')

    const loadDetail = async () => {
      try {
        const data = await requestJson<KnowledgeDocumentDetailPayload>(
          `/api/platform/app/knowledge/documents/${encodeURIComponent(selectedResult.document.documentId)}`
        )

        if (cancelled) return
        setDetail(data)
        setDetailState(data.sections.length ? 'ready' : 'empty')
      } catch {
        if (cancelled) return
        setDetail(null)
        setDetailState('error')
      }
    }

    void loadDetail()

    return () => {
      cancelled = true
    }
  }, [selectedResult?.document.documentId])

  useEffect(() => {
    if (!results.length) return

    if (!selectedDocumentId || !results.some(result => result.document.documentId === selectedDocumentId)) {
      setSelectedDocumentId(results[0]?.document.documentId ?? null)
    }
  }, [results, selectedDocumentId])

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = query.trim()

    if (!trimmed) {
      setSubmittedQuery('')
      setPacket(null)

      return
    }

    setSearching(true)
    setSubmittedQuery(trimmed)

    try {
      const data = await requestJson<KnowledgeRetrievalPacket>(
        `/api/platform/app/knowledge/search?mode=human&limit=10&q=${encodeURIComponent(trimmed)}`
      )

      setPacket(data)
      setSelectedDocumentId(data.chunks[0]?.documentId ?? documents[0]?.documentId ?? null)
    } catch {
      setPacket({
        contractVersion: 'knowledge-search.v1',
        query: trimmed,
        generatedAt: new Date().toISOString(),
        mode: 'human',
        accessScope: {
          tenantType: 'efeonce_internal',
          tenantId: null,
          userId: '',
          roleCodes: [],
          routeGroups: [],
          capabilities: []
        },
        confidence: 'none',
        freshness: 'unknown',
        chunks: [],
        deniedOrFilteredCount: 0,
        notes: [GH_KNOWLEDGE_COPY.workbenchErrorBody]
      })
    } finally {
      setSearching(false)
    }
  }

  const handleFeedback = async (kind: KnowledgeFeedbackKind) => {
    if (!selectedResult || feedbackState === 'sending') return

    setFeedbackKind(kind)
    setFeedbackState('sending')

    try {
      await requestJson<{ feedbackId: string }>('/api/platform/app/knowledge/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedResult.document.documentId,
          chunkId: selectedResult.chunk?.chunkId ?? selectedSection?.chunkId ?? null,
          feedbackKind: kind,
          comment: feedbackComment.trim() || null
        })
      })
      setFeedbackState('sent')
    } catch {
      setFeedbackState('error')
    }
  }

  const openNexaWithKnowledgeContext = () => {
    window.dispatchEvent(
      new CustomEvent(NEXA_FLOATING_OPEN_EVENT, {
        detail: {
          source: 'knowledge-workbench',
          query: submittedQuery,
          documentId: selectedResult?.document.documentId ?? null
        }
      })
    )
  }

  const learningPaths = useMemo(() => {
    const starters = documents.filter(doc => doc.docLayer === 'manual' || doc.documentType === 'guide').slice(0, 4)
    const operations = documents.filter(doc => /ops|people|payroll|performance|hr/i.test(`${doc.ownerDomain} ${doc.slug}`)).slice(0, 4)
    const agentic = documents.filter(doc => doc.agenticPolicy === 'agent_allowed').slice(0, 4)

    return [
      { label: 'Primeros pasos', helper: 'Guías base para orientarse rápido.', items: starters.length ? starters : documents.slice(0, 4) },
      { label: 'Operación Greenhouse', helper: 'Procedimientos y métricas de trabajo.', items: operations.length ? operations : documents.slice(2, 6) },
      { label: 'Nexa y agentes', helper: 'Memoria compartida con controles visibles.', items: agentic.length ? agentic : documents.slice(0, 3) }
    ]
  }, [documents])

  const panelSx = {
    border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
    borderRadius: `${theme.shape.customBorderRadius.md}px`,
    bgcolor: 'background.paper',
    boxShadow: `0 14px 42px ${alpha(theme.palette.common.black, 0.06)}`
  } as const

  const selectedFreshness = selectedResult?.chunk?.freshness ?? selectedResult?.document.publicationStatus
  const hasSearch = Boolean(submittedQuery)

  return (
    <>
      <NexaContextScope
        entityName={selectedResult?.document.title ? `Knowledge · ${selectedResult.document.title}` : 'Knowledge'}
        contextKey='general'
      />
      <Stack spacing={6} data-capture='knowledge-workbench'>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'flex-end' }} justifyContent='space-between' spacing={4}>
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <GreenhouseBreadcrumbs
            kind='pageHierarchy'
            items={[
              { label: GH_KNOWLEDGE_COPY.breadcrumbRoot, href: '/home' },
              { label: GH_KNOWLEDGE_COPY.breadcrumbCurrent }
            ]}
          />
          <Box>
            <Typography variant='h1' sx={{ mb: 1 }}>
              {GH_KNOWLEDGE_COPY.pageTitle}
            </Typography>
            <Typography variant='body1' color='text.secondary'>
              {GH_KNOWLEDGE_COPY.workbenchSubtitle}
            </Typography>
          </Box>
        </Stack>
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <GreenhouseButton kind='secondaryAction' variant='outlined' leadingIconClassName='tabler-message-report'>
            {GH_KNOWLEDGE_COPY.sendFeedback}
          </GreenhouseButton>
          <GreenhouseButton kind='secondaryAction' variant='outlined' leadingIconClassName='tabler-download'>
            {GH_KNOWLEDGE_COPY.export}
          </GreenhouseButton>
        </Stack>
      </Stack>

      <Box sx={panelSx} data-capture='knowledge-command-surface'>
        <Stack spacing={4} sx={{ p: { xs: 4, md: 5 } }}>
          <Stack component='form' onSubmit={event => void handleSearch(event)} direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems='stretch'>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <NexaComposer kind='knowledgeAsk'>
                <NexaComposerInput
                  kind='knowledgeAsk'
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={GH_KNOWLEDGE_COPY.commandPlaceholder}
                  actionAdornment={
                    <NexaComposerActionButton
                      variant='send'
                      icon='search'
                      disabled={searching}
                      aria-label={GH_KNOWLEDGE_COPY.aria.searchKnowledge}
                      onClick={() => void handleSearch()}
                    />
                  }
                />
              </NexaComposer>
            </Box>
            <Stack direction='row' spacing={1} role='tablist' aria-label={GH_KNOWLEDGE_COPY.aria.modeSelector}>
              <ModePill label={GH_KNOWLEDGE_COPY.mode.human} active />
              <ModePill label={GH_KNOWLEDGE_COPY.mode.nexa} helper={GH_KNOWLEDGE_COPY.workbenchModesSoon} />
              <ModePill label={GH_KNOWLEDGE_COPY.mode.mcp} helper={GH_KNOWLEDGE_COPY.workbenchModesSoon} />
            </Stack>
          </Stack>
          <Stack direction='row' spacing={2} alignItems='center' role='status'>
            <GreenhouseStatusDot tone={searching ? 'primary' : 'success'} ariaLabel={searching ? GH_KNOWLEDGE_COPY.workbenchSearchStatus : GH_KNOWLEDGE_COPY.workbenchSearchIdle} />
            <Typography variant='body2' color='text.secondary'>
              {searching ? GH_KNOWLEDGE_COPY.workbenchSearchStatus : GH_KNOWLEDGE_COPY.workbenchModeHelper}
            </Typography>
          </Stack>
          {searching ? <LinearProgress color='primary' sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }} /> : null}
        </Stack>
      </Box>

      {browseState === 'error' ? (
        <Alert severity='error' data-capture='knowledge-workbench-error'>
          <Typography variant='subtitle2'>{GH_KNOWLEDGE_COPY.workbenchErrorTitle}</Typography>
          <Typography variant='body2'>{GH_KNOWLEDGE_COPY.workbenchErrorBody}</Typography>
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr) 360px' },
          gap: 4,
          alignItems: 'start'
        }}
      >
        <MotionBox
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          sx={{ ...panelSx, overflow: 'hidden' }}
          data-capture='knowledge-learning-paths'
        >
          <Stack spacing={4} sx={{ p: 4 }}>
            <Stack spacing={0.5}>
              <Typography variant='h5'>{GH_KNOWLEDGE_COPY.workbenchLearningPaths}</Typography>
              <Typography variant='body2' color='text.secondary'>
                Empieza por una ruta o usa la búsqueda para saltar directo a una guía.
              </Typography>
            </Stack>
            {browseState === 'loading' ? (
              <Stack spacing={2}>
                {[0, 1, 2].map(item => <Skeleton key={item} variant='rounded' height={98} />)}
              </Stack>
            ) : (
              <Stack spacing={3}>
                {learningPaths.map((path, index) => (
                  <LearningPathBlock key={path.label} path={path} index={index} onSelect={setSelectedDocumentId} selectedId={selectedDocumentId} />
                ))}
              </Stack>
            )}
          </Stack>
        </MotionBox>

        <Box sx={{ ...panelSx, overflow: 'hidden' }} data-capture='knowledge-results-panel'>
          <Stack spacing={0}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ p: 4 }}>
              <Stack spacing={0.5}>
                <Typography variant='h5'>
                  {hasSearch ? `Resultados para "${submittedQuery}"` : 'Guías publicadas'}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {results.length} {GH_KNOWLEDGE_COPY.workbenchResults}
                  {packet?.deniedOrFilteredCount ? ` · ${packet.deniedOrFilteredCount} filtrado por política` : ''}
                </Typography>
              </Stack>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                <GreenhouseChip label='Publicadas' size='small' tone='success' variant='label' kind='status' />
                <GreenhouseChip label='Modo humano' size='small' tone='primary' variant='label' kind='attribute' />
              </Stack>
            </Stack>
            <Divider />
            <Stack spacing={0} sx={{ minHeight: 420 }}>
              {browseState === 'loading' ? (
                <Stack spacing={2} sx={{ p: 4 }}>
                  {[0, 1, 2, 3].map(item => <Skeleton key={item} variant='rounded' height={86} />)}
                </Stack>
              ) : results.length === 0 ? (
                <Box sx={{ p: 6 }} data-capture='knowledge-workbench-empty'>
                  <EmptyState
                    icon='tabler-books-off'
                    title={GH_KNOWLEDGE_COPY.workbenchSearchEmpty}
                    description={GH_KNOWLEDGE_COPY.workbenchSearchEmptyAction}
                    minHeight={280}
                  />
                </Box>
              ) : (
                <AnimatePresence mode='popLayout' initial={false}>
                  {results.map((result, index) => (
                    <ResultRow
                      key={result.document.documentId}
                      result={result}
                      index={index}
                      selected={result.document.documentId === selectedResult?.document.documentId}
                      reducedMotion={reducedMotion}
                      onSelect={() => setSelectedDocumentId(result.document.documentId)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </Stack>
            <Divider />
            <Box sx={{ p: 4, bgcolor: alpha(theme.palette.warning.main, 0.08) }} data-capture='knowledge-feedback-strip'>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box
                    sx={{
                      inlineSize: 40,
                      blockSize: 40,
                      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                      bgcolor: alpha(theme.palette.warning.main, 0.16),
                      color: 'warning.dark',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <i className='tabler-bulb' aria-hidden='true' />
                  </Box>
                  <Box>
                    <Typography variant='subtitle2'>¿Falta una guía?</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Reporta el vacío desde el documento seleccionado para que Knowledge Ops lo priorice.
                    </Typography>
                  </Box>
                </Stack>
                <GreenhouseButton kind='secondaryAction' variant='outlined' tone='warning' leadingIconClassName='tabler-flag' onClick={() => void handleFeedback('missing_doc')}>
                  {GH_KNOWLEDGE_COPY.workbenchReportMissing}
                </GreenhouseButton>
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ ...panelSx, position: { lg: 'sticky' }, top: { lg: 92 }, overflow: 'hidden' }} data-capture='knowledge-inspector-panel'>
          <AnimatePresence mode='wait' initial={false}>
            <MotionBox
              key={selectedResult?.document.documentId ?? 'empty'}
              initial={reducedMotion ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Stack spacing={4} sx={{ p: 4 }}>
                <Stack spacing={1}>
                  <Typography variant='overline' color='text.secondary'>
                    {GH_KNOWLEDGE_COPY.workbenchInspectorTitle}
                  </Typography>
                  <Typography variant='h5'>{selectedResult?.document.title ?? 'Selecciona una guía'}</Typography>
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    {selectedResult ? (
                      <>
                        <GreenhouseChip size='small' variant='label' tone={publicationTone(selectedResult.document.publicationStatus)} label={sentence(selectedResult.document.publicationStatus)} />
                        <GreenhouseChip size='small' variant='label' tone={freshnessTone(selectedFreshness)} label={sentence(String(selectedFreshness ?? 'unknown'))} />
                      </>
                    ) : null}
                  </Stack>
                </Stack>

                {detailState === 'loading' ? (
                  <Stack spacing={2}>
                    <Skeleton variant='rounded' height={78} />
                    <Skeleton variant='rounded' height={120} />
                  </Stack>
                ) : selectedResult ? (
                  <>
                    <Stack spacing={2.5}>
                      <MetadataLine icon='tabler-user-circle' label={GH_KNOWLEDGE_COPY.workbenchOwner} value={selectedResult.document.ownerDomain} />
                      <MetadataLine icon='tabler-calendar-check' label={GH_KNOWLEDGE_COPY.workbenchFreshness} value={formatReviewDate(selectedResult.document.lastReviewedAt ?? selectedResult.chunk?.updatedAt ?? null)} />
                      <MetadataLine icon='tabler-shield-check' label={GH_KNOWLEDGE_COPY.workbenchPolicy} value={sentence(selectedResult.document.agenticPolicy)} />
                      <MetadataLine icon='tabler-link' label={GH_KNOWLEDGE_COPY.workbenchSource} value={selectedResult.document.humanUrl ?? selectedResult.chunk?.humanUrl ?? 'Greenhouse Knowledge'} />
                    </Stack>

                    <Divider />

                    <Stack spacing={2}>
                      <Typography variant='subtitle2'>{GH_KNOWLEDGE_COPY.workbenchWhyAppears}</Typography>
                      <Stack spacing={1.5}>
                        <ReasonLine label={hasSearch ? 'Coincide con tu pregunta' : 'Parte del corpus publicado'} />
                        <ReasonLine label={`Sección: ${selectedResult.chunk?.headingPath.join(' > ') || firstHeading(selectedSection)}`} />
                        {selectedResult.score !== null ? <ReasonLine label={`Score de recuperación ${selectedResult.score.toFixed(2)}`} /> : null}
                      </Stack>
                    </Stack>

                    {selectedEvidence ? (
                      <Stack spacing={2} data-capture='knowledge-nexa-evidence-bridge'>
                        <Typography variant='subtitle2'>{GH_KNOWLEDGE_COPY.workbenchEvidenceBridge}</Typography>
                        <NexaEvidencePanel evidence={selectedEvidence} variant='proofPanel' feedbackEnabled={false} maxSources={2} />
                      </Stack>
                    ) : null}

                    <Box
                      sx={{
                        borderInlineStart: `3px solid ${theme.palette.primary.main}`,
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        p: 3
                      }}
                    >
                      <Typography variant='body2' color='text.secondary'>
                        {(selectedResult.chunk?.text ?? selectedSection?.bodyText ?? 'Abre la guía para leer el contenido completo.').slice(0, 260)}
                        {(selectedResult.chunk?.text ?? selectedSection?.bodyText ?? '').length > 260 ? '...' : ''}
                      </Typography>
                    </Box>

                    <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                      <GreenhouseButton kind='primaryAction' size='small' leadingIconClassName='tabler-book' href={selectedResult.document.humanUrl ?? `/knowledge/${selectedResult.document.slug}`}>
                        {GH_KNOWLEDGE_COPY.workbenchRead}
                      </GreenhouseButton>
                      <GreenhouseButton
                        kind='secondaryAction'
                        size='small'
                        variant='outlined'
                        leadingIconClassName='tabler-sparkles'
                        aria-label={GH_KNOWLEDGE_COPY.aria.openNexaFromKnowledge}
                        onClick={openNexaWithKnowledgeContext}
                      >
                        {GH_KNOWLEDGE_COPY.workbenchOpenNexa}
                      </GreenhouseButton>
                      <Tooltip title='Copia la URI humana de la guía'>
                        <span>
                          <GreenhouseButton
                            kind='secondaryAction'
                            size='small'
                            variant='outlined'
                            leadingIconClassName='tabler-copy'
                            onClick={() => void navigator.clipboard?.writeText(selectedResult.document.humanUrl ?? `/knowledge/${selectedResult.document.slug}`)}
                          >
                            {GH_KNOWLEDGE_COPY.copyUri}
                          </GreenhouseButton>
                        </span>
                      </Tooltip>
                    </Stack>

                    <FeedbackBox
                      state={feedbackState}
                      selected={feedbackKind}
                      comment={feedbackComment}
                      onComment={setFeedbackComment}
                      onSubmit={handleFeedback}
                    />
                  </>
                ) : (
                  <EmptyState
                    icon='tabler-file-search'
                    title='Selecciona una guía'
                    description='El inspector muestra metadata, trazabilidad y acciones del documento activo.'
                    minHeight={260}
                  />
                )}
              </Stack>
            </MotionBox>
          </AnimatePresence>
        </Box>
      </Box>
      </Stack>
    </>
  )
}

const ModePill = ({ label, active = false, helper }: { label: string; active?: boolean; helper?: string }) => {
  const theme = useTheme()

  return (
    <Tooltip title={helper ?? ''} disableHoverListener={!helper}>
      <Box
        role='tab'
        aria-selected={active}
        sx={{
          minInlineSize: 96,
          minBlockSize: 44,
          px: 3,
          border: `1px solid ${active ? alpha(theme.palette.primary.main, 0.22) : alpha(theme.palette.text.primary, 0.1)}`,
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'background.paper',
          color: active ? 'primary.main' : 'text.secondary',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          cursor: helper ? 'help' : 'default'
        }}
      >
        {label}
      </Box>
    </Tooltip>
  )
}

const LearningPathBlock = ({
  path,
  index,
  onSelect,
  selectedId
}: {
  path: { label: string; helper: string; items: KnowledgeDocumentSummary[] }
  index: number
  onSelect: (id: string) => void
  selectedId: string | null
}) => {
  const theme = useTheme()

  return (
    <Stack spacing={1.5}>
      <Stack direction='row' spacing={1.5} alignItems='center'>
        <Box
          sx={{
            inlineSize: 26,
            blockSize: 26,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            typography: 'caption',
            fontWeight: 700
          }}
        >
          {index + 1}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='subtitle2'>{path.label}</Typography>
          <Typography variant='caption' color='text.secondary'>{path.helper}</Typography>
        </Box>
      </Stack>
      <Stack spacing={1}>
        {path.items.map(item => (
          <ButtonBase
            key={`${path.label}-${item.documentId}`}
            onClick={() => onSelect(item.documentId)}
            sx={{
              width: '100%',
              justifyContent: 'flex-start',
              textAlign: 'left',
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              px: 2,
              py: 1.5,
              bgcolor: selectedId === item.documentId ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              color: 'text.primary',
              transition: theme.transitions.create(['background-color', 'transform'], { duration: theme.transitions.duration.shortest }),
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06), transform: 'translateX(2px)' },
              '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
            }}
          >
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ width: '100%', minWidth: 0 }}>
              <GreenhouseStatusDot tone={selectedId === item.documentId ? 'primary' : 'neutral'} ariaLabel={`Guía ${item.title}`} />
              <Typography variant='body2' noWrap>{item.title}</Typography>
            </Stack>
          </ButtonBase>
        ))}
      </Stack>
    </Stack>
  )
}

const ResultRow = ({
  result,
  index,
  selected,
  reducedMotion,
  onSelect
}: {
  result: WorkbenchResult
  index: number
  selected: boolean
  reducedMotion: boolean
  onSelect: () => void
}) => {
  const theme = useTheme()

  return (
    <MotionBox
      layout
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.18, delay: reducedMotion ? 0 : Math.min(index * 0.025, 0.12) }}
      sx={{ borderBlockEnd: `1px solid ${alpha(theme.palette.text.primary, 0.08)}` }}
    >
      <ButtonBase
        onClick={onSelect}
        sx={{
          width: '100%',
          display: 'block',
          textAlign: 'left',
          px: 4,
          py: 3,
          bgcolor: selected ? alpha(theme.palette.primary.main, 0.07) : 'background.paper',
          borderInlineStart: selected ? `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
          transition: theme.transitions.create(['background-color', 'transform', 'border-color'], { duration: theme.transitions.duration.shortest }),
          '&:hover': {
            bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.035),
            transform: reducedMotion ? 'none' : 'translateY(-1px)'
          },
          '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 }
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
          <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  inlineSize: 34,
                  blockSize: 34,
                  flexShrink: 0,
                  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                <i className='tabler-file-description' aria-hidden='true' />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='subtitle1' noWrap>{result.document.title}</Typography>
                <Typography variant='body2' color='text.secondary' noWrap>
                  {result.chunk?.headingPath.join(' > ') || sentence(result.document.documentType)}
                </Typography>
              </Box>
            </Stack>
          </Stack>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            {result.score !== null ? <GreenhouseChip label={`Score ${result.score.toFixed(2)}`} size='small' tone='primary' variant='label' kind='metric' /> : null}
            <GreenhouseChip label={sentence(result.document.ownerDomain)} size='small' tone='default' variant='label' kind='attribute' />
            <GreenhouseChip label={sentence(result.document.publicationStatus)} size='small' tone={publicationTone(result.document.publicationStatus)} variant='label' kind='status' />
            <GreenhouseChip label={sentence(result.document.agenticPolicy)} size='small' tone={result.document.agenticPolicy === 'agent_excluded' ? 'warning' : 'success'} variant='label' kind='attribute' />
          </Stack>
        </Stack>
      </ButtonBase>
    </MotionBox>
  )
}

const MetadataLine = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <Stack direction='row' spacing={2} alignItems='flex-start'>
    <Box sx={{ color: 'text.secondary', pt: 0.25 }}>
      <i className={icon} aria-hidden='true' />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant='caption' color='text.secondary'>{label}</Typography>
      <Typography variant='body2' sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
    </Box>
  </Stack>
)

const ReasonLine = ({ label }: { label: string }) => (
  <Stack direction='row' spacing={1.5} alignItems='center'>
    <GreenhouseStatusDot tone='success' ariaLabel={label} />
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
  </Stack>
)

const FeedbackBox = ({
  state,
  selected,
  comment,
  onComment,
  onSubmit
}: {
  state: 'idle' | 'sending' | 'sent' | 'error'
  selected: KnowledgeFeedbackKind | null
  comment: string
  onComment: (value: string) => void
  onSubmit: (kind: KnowledgeFeedbackKind) => Promise<void>
}) => {
  const theme = useTheme()

  const feedbackOptions: Array<{ kind: KnowledgeFeedbackKind; label: string; icon: string; tone: 'primary' | 'secondary' | 'warning' }> = [
    { kind: 'useful', label: GH_KNOWLEDGE_COPY.feedbackUseful, icon: 'tabler-thumb-up', tone: 'primary' },
    { kind: 'stale', label: 'Desactualizado', icon: 'tabler-clock-exclamation', tone: 'warning' },
    { kind: 'wrong_source', label: GH_KNOWLEDGE_COPY.feedbackIncorrect, icon: 'tabler-flag', tone: 'warning' }
  ]

  return (
    <Box
      sx={{
        border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        p: 3
      }}
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant='subtitle2'>{GH_KNOWLEDGE_COPY.feedbackQuestion}</Typography>
          <Typography variant='body2' color='text.secondary'>{GH_KNOWLEDGE_COPY.feedbackIntro}</Typography>
        </Stack>
        <Box
          component='textarea'
          aria-label={GH_KNOWLEDGE_COPY.feedbackCommentLabel}
          value={comment}
          onChange={event => onComment(event.target.value)}
          placeholder={GH_KNOWLEDGE_COPY.feedbackPlaceholder}
          rows={3}
          sx={{
            width: '100%',
            resize: 'vertical',
            border: `1px solid ${alpha(theme.palette.text.primary, 0.14)}`,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            padding: theme.spacing(2),
            typography: 'body2',
            color: theme.palette.text.primary,
            background: theme.palette.background.paper,
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2
            }
          }}
        />
        <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
          {feedbackOptions.map(option => (
            <GreenhouseButton
              key={option.kind}
              size='small'
              variant={selected === option.kind ? 'solid' : 'outlined'}
              tone={option.tone}
              disabled={state === 'sending'}
              leadingIconClassName={option.icon}
              onClick={() => void onSubmit(option.kind)}
            >
              {option.label}
            </GreenhouseButton>
          ))}
        </Stack>
        {state === 'sent' ? (
          <Typography variant='caption' color='success.main' role='status'>{GH_KNOWLEDGE_COPY.workbenchFeedbackSent}</Typography>
        ) : null}
        {state === 'error' ? (
          <Typography variant='caption' color='error.main' role='status'>{GH_KNOWLEDGE_COPY.workbenchFeedbackError}</Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

export default KnowledgeCenterView
