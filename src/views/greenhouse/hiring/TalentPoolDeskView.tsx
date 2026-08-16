'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

import NextLink from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import {
  AdaptiveSidecarLayout,
  ContextualSidecar,
  GreenhouseButton,
  GreenhouseChip,
  GreenhouseDisclosureTrigger
} from '@/components/greenhouse/primitives'
import EmptyState from '@/components/greenhouse/EmptyState'
import GreenhouseDocumentPreview from '@/components/greenhouse/documents/GreenhouseDocumentPreview'
import type { HiringDeskCopy } from '@/lib/copy'
import { formatDate } from '@/lib/format'
import type {
  SearchTalentPoolResult,
  TalentPoolEvidenceDto,
  TalentPoolProfileDto,
  TalentPoolReasonCode
} from '@/lib/hiring/talent-pool'
import type { CandidateDocumentFileRow, HiringApplicationDocumentsViewModel } from '@/lib/hiring/documents'

import HiringDeskFrame from './HiringDeskFrame'

type OpeningOption = { openingId: string; label: string; status: string }
type Filters = {
  query: string
  capability: string
  seniority: string
  language: string
  country: string
  availability: string
}

interface TalentPoolDeskViewProps {
  copy: HiringDeskCopy
  initialResult: SearchTalentPoolResult
  initialFilters: Filters
  openings: OpeningOption[]
  readEnabled: boolean
  inviteEnabled: boolean
  canInvite: boolean
  /** Synthetic, non-production fixture used only by the governed visual-evidence route. */
  previewDocuments?: Record<string, HiringApplicationDocumentsViewModel>
}

const EMPTY_FILTERS: Filters = { query: '', capability: '', seniority: '', language: '', country: '', availability: '' }

const interpolate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template)

const coverageTone = (coverage: TalentPoolProfileDto['evidenceCoverage']) =>
  coverage === 'structured'
    ? ('success' as const)
    : coverage === 'partial'
      ? ('warning' as const)
      : ('default' as const)

const freshnessTone = (freshness: TalentPoolProfileDto['evidenceFreshness']) =>
  freshness === 'current' ? ('info' as const) : freshness === 'stale' ? ('warning' as const) : ('default' as const)

const uniqueApplications = (evidence: TalentPoolEvidenceDto[]) => [
  ...new Set(evidence.map(item => item.applicationRef).filter((value): value is string => Boolean(value)))
]

const buildSearchParams = (filters: Filters, cursor?: string | null) => {
  const params = new URLSearchParams()

  if (filters.query.trim()) params.set('query', filters.query.trim())
  if (filters.capability.trim()) params.append('capability', filters.capability.trim())
  if (filters.seniority.trim()) params.set('seniority', filters.seniority.trim())
  if (filters.language.trim()) params.set('language', filters.language.trim())
  if (filters.country.trim()) params.set('country', filters.country.trim().toUpperCase())
  if (filters.availability.trim()) params.set('availability', filters.availability.trim())
  if (cursor) params.set('cursor', cursor)
  params.set('limit', '25')

  return params
}

const TalentEvidence = ({
  evidence,
  copy
}: {
  evidence: TalentPoolEvidenceDto
  copy: HiringDeskCopy['talentPool']
}) => (
  <Box component='li' sx={{ listStyle: 'none', py: 2, '& + &': { borderBlockStart: 1, borderColor: 'divider' } }}>
    <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='subtitle2' color='text.primary'>
          {evidence.capabilityKey ?? copy.source[evidence.sourceType]}
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
          {[evidence.seniority, evidence.languageCode, evidence.resultBand].filter(Boolean).join(' · ') || copy.unknown}
        </Typography>
      </Box>
      <GreenhouseChip
        size='small'
        kind='status'
        variant='label'
        tone={evidence.isStale ? 'warning' : 'info'}
        label={copy.source[evidence.sourceType]}
      />
    </Stack>
    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1.5 }}>
      {interpolate(copy.observed, { date: formatDate(evidence.observedAt) })}
      {evidence.freshUntil ? ` · ${interpolate(copy.freshUntil, { date: formatDate(evidence.freshUntil) })}` : ''}
    </Typography>
  </Box>
)

const TalentApplicationDocuments = ({
  applicationId,
  candidateName,
  documentCopy,
  profileId,
  closeLabel,
  previewDocument
}: {
  applicationId: string
  candidateName: string
  documentCopy: HiringDeskCopy['application']['documentsPanel']
  profileId: string
  closeLabel: string
  previewDocument?: HiringApplicationDocumentsViewModel
}) => {
  const [documents, setDocuments] = useState<HiringApplicationDocumentsViewModel | null>(previewDocument ?? null)
  const [loading, setLoading] = useState(!previewDocument)
  const [failed, setFailed] = useState(false)
  const [viewer, setViewer] = useState<CandidateDocumentFileRow | null>(null)

  useEffect(() => {
    if (previewDocument) {
      setDocuments(previewDocument)
      setLoading(false)
      setFailed(false)

      return
    }

    let active = true

    setLoading(true)
    setFailed(false)
    void fetch(
      `/api/hiring/talent-pool/${encodeURIComponent(profileId)}/applications/${encodeURIComponent(applicationId)}/documents`,
      { cache: 'no-store' }
    )
      .then(async response => {
        if (!response.ok) throw new Error('talent_pool_documents_unavailable')

        return (await response.json()) as HiringApplicationDocumentsViewModel
      })
      .then(result => {
        if (active) setDocuments(result)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [applicationId, previewDocument, profileId])

  const cv = documents?.files.find(file => file.kind === 'cv') ?? null

  const detail =
    cv?.status === 'quarantined'
      ? documentCopy.quarantinedBody
      : cv?.status === 'pending'
        ? documentCopy.pendingBody
        : cv?.status === 'legacy_unscanned'
          ? documentCopy.legacyBody
          : cv?.status === 'missing'
            ? documentCopy.noCv
            : (cv?.fileName ?? documentCopy.noCv)

  return (
    <Paper variant='outlined' data-capture='talent-pool-application-document' sx={{ p: 2, borderRadius: 2 }}>
      {loading ? (
        <Stack direction='row' spacing={1.5} alignItems='center' role='status' aria-live='polite'>
          <CircularProgress size={18} aria-label={documentCopy.viewerLoading} />
          <Typography variant='body2' color='text.secondary'>
            {documentCopy.viewerLoading}
          </Typography>
        </Stack>
      ) : failed ? (
        <Alert severity='error'>{documentCopy.loadError}</Alert>
      ) : (
        <Stack spacing={1.5}>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' gap={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='subtitle2' color='text.primary'>
                {documentCopy.cvLabel}
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
                {detail}
              </Typography>
            </Box>
            {cv?.openHref ? (
              <GreenhouseButton
                kind='secondaryAction'
                size='small'
                leadingIconClassName='tabler-eye'
                onClick={() => setViewer(cv)}
              >
                {documentCopy.view}
              </GreenhouseButton>
            ) : null}
          </Stack>
        </Stack>
      )}

      <Dialog
        open={Boolean(viewer)}
        onClose={() => setViewer(null)}
        maxWidth='lg'
        fullWidth
        aria-labelledby={`talent-pool-document-${applicationId}`}
        PaperProps={{ 'data-capture': 'talent-pool-document-viewer', sx: { blockSize: '90vh' } }}
      >
        <DialogTitle id={`talent-pool-document-${applicationId}`}>
          {documentCopy.viewerTitle.replace('{document}', documentCopy.cvLabel).replace('{name}', candidateName)}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', justifyContent: 'center', backgroundColor: 'action.hover' }}>
          {viewer?.openHref ? (
            <GreenhouseDocumentPreview
              url={viewer.openHref}
              mimeType={viewer.mimeType ?? 'application/octet-stream'}
              fileName={viewer.fileName ?? ''}
              renderEscapeHatch={false}
              copy={{
                loading: documentCopy.viewerLoading,
                loadError: documentCopy.viewerLoadError,
                unsupported: documentCopy.viewerUnsupported,
                noEmbed: documentCopy.viewerNoEmbed,
                openInNewTab: documentCopy.viewerOpenInNewTab,
                frameTitle: documentCopy.viewerFrameTitle
              }}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          {viewer?.openHref ? (
            <Button
              component='a'
              href={viewer.openHref}
              target='_blank'
              rel='noopener noreferrer'
              startIcon={<i className='tabler-external-link' />}
            >
              {documentCopy.viewerOpenInNewTab}
            </Button>
          ) : null}
          {viewer?.downloadHref ? (
            <Button
              component='a'
              href={viewer.downloadHref}
              variant='outlined'
              startIcon={<i className='tabler-download' />}
            >
              {documentCopy.download}
            </Button>
          ) : null}
          <Button onClick={() => setViewer(null)}>{closeLabel}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

const TalentProfilePanel = ({
  profile,
  copy,
  onClose,
  onInvite,
  canInvite,
  documentCopy,
  commonClose,
  previewDocuments
}: {
  profile: TalentPoolProfileDto
  copy: HiringDeskCopy['talentPool']
  onClose: () => void
  onInvite: () => void
  canInvite: boolean
  documentCopy: HiringDeskCopy['application']['documentsPanel']
  commonClose: string
  previewDocuments?: Record<string, HiringApplicationDocumentsViewModel>
}) => {
  const applications = uniqueApplications(profile.evidence)

  return (
    <ContextualSidecar
      title={profile.displayName}
      subtitle={
        [profile.seniority, profile.countryCode, profile.availability].filter(Boolean).join(' · ') || copy.unknown
      }
      eyebrow={copy.profileTitle}
      icon='tabler-user-search'
      kind='inspector'
      variant='evidence'
      onClose={onClose}
      closeLabel={copy.closeDetail}
      dataCapture='talent-pool-profile'
      footer={
        profile.access.allowedActions.includes('invite') && canInvite ? (
          <GreenhouseButton kind='primaryAction' fullWidth onClick={onInvite} leadingIconClassName='tabler-user-plus'>
            {copy.actionInvite}
          </GreenhouseButton>
        ) : (
          <Alert severity='warning' sx={{ color: 'text.primary', '& .MuiAlert-icon': { color: 'warning.dark' } }}>
            {copy.inviteDisabled}
          </Alert>
        )
      }
    >
      <Stack direction='row' gap={1} flexWrap='wrap'>
        <GreenhouseChip
          kind='status'
          variant='label'
          tone={profile.access.contactable ? 'success' : 'warning'}
          label={copy.lifecycle[profile.lifecycleStatus]}
        />
        <GreenhouseChip
          kind='status'
          variant='label'
          tone={coverageTone(profile.evidenceCoverage)}
          label={copy.coverage[profile.evidenceCoverage]}
        />
        <GreenhouseChip
          kind='status'
          variant='label'
          tone={freshnessTone(profile.evidenceFreshness)}
          label={copy.freshness[profile.evidenceFreshness]}
        />
      </Stack>

      <Divider sx={{ my: 3 }} />
      <Typography variant='h6'>{copy.why}</Typography>
      <Stack component='ul' spacing={1.5} sx={{ p: 0, m: 0, mt: 1.5 }}>
        {profile.access.reasonCodes.map(reason => (
          <Stack component='li' direction='row' spacing={1.5} key={reason} sx={{ listStyle: 'none' }}>
            <i className='tabler-info-circle' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              {copy.reason[reason as TalentPoolReasonCode]}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Divider sx={{ my: 3 }} />
      <Typography variant='h6'>{copy.evidence}</Typography>
      {profile.evidence.length ? (
        <Box component='ul' data-capture='talent-pool-evidence' sx={{ p: 0, m: 0, mt: 1 }}>
          {profile.evidence.map((evidence, index) => (
            <TalentEvidence key={`${evidence.sourceRef}-${index}`} evidence={evidence} copy={copy} />
          ))}
        </Box>
      ) : (
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}>
          {copy.coverage.none}
        </Typography>
      )}

      {applications.length ? (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant='h6'>{copy.applications}</Typography>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {applications.map(applicationId => (
              <Stack key={applicationId} spacing={1}>
                <TalentApplicationDocuments
                  applicationId={applicationId}
                  candidateName={profile.displayName}
                  documentCopy={documentCopy}
                  profileId={profile.talentProfileId}
                  closeLabel={commonClose}
                  previewDocument={previewDocuments?.[applicationId]}
                />
                <GreenhouseButton
                  component={NextLink}
                  href={`/agency/hiring/applications/${encodeURIComponent(applicationId)}?tab=documents`}
                  kind='inlineAction'
                  size='small'
                  leadingIconClassName='tabler-external-link'
                >
                  {copy.openApplication}
                </GreenhouseButton>
              </Stack>
            ))}
          </Stack>
        </>
      ) : null}
    </ContextualSidecar>
  )
}

const TalentPoolDeskView = ({
  copy,
  initialResult,
  initialFilters,
  openings,
  readEnabled,
  inviteEnabled,
  canInvite,
  previewDocuments
}: TalentPoolDeskViewProps) => {
  const t = copy.talentPool
  const router = useRouter()
  const [filters, setFilters] = useState(initialFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [result, setResult] = useState(initialResult)
  const [selected, setSelected] = useState<TalentPoolProfileDto | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [openingId, setOpeningId] = useState('')
  const [proposalRef, setProposalRef] = useState<string | null>(null)
  const [invitePending, setInvitePending] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [liveMessage, setLiveMessage] = useState('')

  const selectedOpening = openings.find(opening => opening.openingId === openingId)
  const hasFilters = Object.values(filters).some(value => value.trim())
  const activeFilterCount = Object.values(filters).filter(value => value.trim()).length

  const asOf = useMemo(
    () =>
      result.items.reduce<string | null>(
        (latest, item) => (!latest || item.updatedAt > latest ? item.updatedAt : latest),
        null
      ),
    [result.items]
  )

  const load = (nextFilters: Filters, cursor?: string | null, append = false) => {
    if (!readEnabled) return
    startTransition(async () => {
      setLoadError(null)

      try {
        const params = buildSearchParams(nextFilters, cursor)
        const response = await fetch(`/api/hiring/talent-pool?${params.toString()}`, { cache: 'no-store' })
        const body = (await response.json()) as SearchTalentPoolResult & { error?: string }

        if (!response.ok) throw new Error(body.error || t.errorTitle)
        setResult(current =>
          append ? { items: [...current.items, ...body.items], nextCursor: body.nextCursor } : body
        )

        if (!append) {
          const visibleParams = buildSearchParams(nextFilters)

          visibleParams.delete('limit')
          router.replace(`/agency/hiring/talent-pool${visibleParams.size ? `?${visibleParams.toString()}` : ''}`, {
            scroll: false
          })
          setSelected(null)
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : t.errorTitle)
      }
    })
  }

  const selectProfile = async (profile: TalentPoolProfileDto, trigger: HTMLElement) => {
    restoreFocusRef.current = trigger
    setSelected(profile)

    if (previewDocuments) return

    try {
      const response = await fetch(`/api/hiring/talent-pool/${encodeURIComponent(profile.talentProfileId)}`, {
        cache: 'no-store'
      })

      if (response.ok) setSelected((await response.json()) as TalentPoolProfileDto)
    } catch {
      // The allowlisted search DTO is already safe and complete enough for a degraded inspector.
    }
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    load(EMPTY_FILTERS)
  }

  const openInvite = () => {
    setOpeningId('')
    setProposalRef(null)
    setInviteError(null)
    setInviteOpen(true)
  }

  const proposeInvite = async () => {
    if (!selected || !openingId) return
    setInvitePending(true)
    setInviteError(null)

    try {
      const idempotencyKey = `talent-propose:${selected.talentProfileId}:${openingId}`

      const response = await fetch(
        `/api/hiring/talent-pool/${encodeURIComponent(selected.talentProfileId)}/invite/propose`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
          body: JSON.stringify({ openingId, idempotencyKey })
        }
      )

      const body = (await response.json()) as { proposalRef?: string; error?: string; code?: string }

      if (!response.ok || !body.proposalRef)
        throw new Error(body.code?.includes('consent') ? t.inviteConflict : body.error || t.inviteError)
      setProposalRef(body.proposalRef)
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : t.inviteError)
    } finally {
      setInvitePending(false)
    }
  }

  const confirmInvite = async () => {
    if (!selected || !openingId || !proposalRef) return
    setInvitePending(true)
    setInviteError(null)

    try {
      const idempotencyKey = `talent-confirm:${proposalRef}`

      const response = await fetch(`/api/hiring/talent-pool/${encodeURIComponent(selected.talentProfileId)}/invite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
        body: JSON.stringify({ openingId, proposalRef, idempotencyKey })
      })

      const body = (await response.json()) as { applicationId?: string | null; error?: string; code?: string }

      if (!response.ok || !body.applicationId)
        throw new Error(body.code?.includes('consent') ? t.inviteConflict : body.error || t.inviteError)
      const message = interpolate(t.inviteReceipt, { applicationId: body.applicationId })

      setReceipt(message)
      setLiveMessage(message)
      setInviteOpen(false)
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : t.inviteError)
    } finally {
      setInvitePending(false)
    }
  }

  const resultsPlane = (
    <Paper variant='outlined' data-capture='talent-pool-results' sx={{ overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent='space-between'
        gap={1}
        sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBlockEnd: 1, borderColor: 'divider' }}
      >
        <Typography variant='subtitle1' color='text.primary'>
          {interpolate(t.results, { count: result.items.length })}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          {interpolate(t.updated, { date: asOf ? formatDate(asOf) : t.unknown })}
        </Typography>
      </Stack>

      {pending ? (
        <Stack spacing={1} sx={{ p: 3 }} aria-label={t.loading}>
          {[0, 1, 2, 3].map(item => (
            <Skeleton key={item} variant='rounded' height={56} />
          ))}
        </Stack>
      ) : loadError ? (
        <Stack alignItems='flex-start' spacing={2} sx={{ p: 4 }}>
          <Alert severity='error'>{loadError}</Alert>
          <GreenhouseButton kind='secondaryAction' onClick={() => load(filters)}>
            {t.retry}
          </GreenhouseButton>
        </Stack>
      ) : result.items.length === 0 ? (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <EmptyState
            icon='tabler-user-search'
            title={t.emptyTitle}
            description={t.emptyBody}
            action={
              hasFilters ? (
                <GreenhouseButton kind='secondaryAction' onClick={clearFilters}>
                  {t.clearFilters}
                </GreenhouseButton>
              ) : undefined
            }
          />
        </Box>
      ) : (
        <>
          <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
            <Table aria-label={t.results}>
              <TableHead>
                <TableRow>
                  <TableCell>{t.personLabel}</TableCell>
                  <TableCell>{t.evidence}</TableCell>
                  <TableCell>{t.availabilityLabel}</TableCell>
                  <TableCell>{t.allowedActionLabel}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map(item => (
                  <TableRow
                    key={item.talentProfileId}
                    hover
                    selected={selected?.talentProfileId === item.talentProfileId}
                    onClick={event => void selectProfile(item, event.currentTarget)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <ButtonBase
                        data-capture='talent-pool-result-trigger'
                        onClick={event => {
                          event.stopPropagation()
                          void selectProfile(item, event.currentTarget)
                        }}
                        sx={{
                          display: 'block',
                          textAlign: 'start',
                          borderRadius: 0,
                          '&:focus-visible': {
                            outline: '2px solid var(--mui-palette-primary-main)',
                            outlineOffset: 2
                          }
                        }}
                      >
                        <Typography variant='subtitle2' color='text.primary'>
                          {item.displayName}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {[item.seniority, item.countryCode].filter(Boolean).join(' · ') || t.unknown}
                        </Typography>
                      </ButtonBase>
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        <GreenhouseChip
                          size='small'
                          kind='status'
                          variant='label'
                          tone={coverageTone(item.evidenceCoverage)}
                          label={t.coverage[item.evidenceCoverage]}
                        />
                        <GreenhouseChip
                          size='small'
                          kind='status'
                          variant='outlined'
                          tone={freshnessTone(item.evidenceFreshness)}
                          label={t.freshness[item.evidenceFreshness]}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>{item.availability || t.unknown}</TableCell>
                    <TableCell>
                      <GreenhouseChip
                        size='small'
                        kind='status'
                        variant='label'
                        tone={item.access.contactable ? 'success' : 'warning'}
                        label={item.access.allowedActions.includes('invite') ? t.actionInvite : t.actionNoContact}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack sx={{ display: { xs: 'flex', md: 'none' } }} divider={<Divider flexItem />}>
            {result.items.map(item => (
              <Box
                component='button'
                type='button'
                key={item.talentProfileId}
                data-capture='talent-pool-result-trigger'
                onClick={event => void selectProfile(item, event.currentTarget)}
                sx={{
                  appearance: 'none',
                  border: 0,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  textAlign: 'start',
                  p: 2,
                  cursor: 'pointer',
                  '&:focus-visible': {
                    outline: '2px solid var(--mui-palette-primary-main)',
                    outlineOffset: -2
                  }
                }}
              >
                <Stack direction='row' justifyContent='space-between' gap={2}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant='subtitle2' color='text.primary'>
                      {item.displayName}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {[item.seniority, item.countryCode, item.availability].filter(Boolean).join(' · ') || t.unknown}
                    </Typography>
                  </Box>
                  <i className='tabler-chevron-right' aria-hidden='true' />
                </Stack>
                <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1.5 }}>
                  <GreenhouseChip
                    size='small'
                    kind='status'
                    variant='label'
                    tone={coverageTone(item.evidenceCoverage)}
                    label={t.coverage[item.evidenceCoverage]}
                  />
                  <GreenhouseChip
                    size='small'
                    kind='status'
                    variant='label'
                    tone={item.access.contactable ? 'success' : 'warning'}
                    label={item.access.allowedActions.includes('invite') ? t.actionInvite : t.actionNoContact}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </>
      )}

      {result.nextCursor && !pending ? (
        <Box sx={{ p: 2, borderBlockStart: 1, borderColor: 'divider', textAlign: 'center' }}>
          <GreenhouseButton kind='secondaryAction' onClick={() => load(filters, result.nextCursor, true)}>
            {t.loadMore}
          </GreenhouseButton>
        </Box>
      ) : null}
    </Paper>
  )

  return (
    <HiringDeskFrame
      surface='talentPool'
      copy={copy}
      primary={
        <Stack spacing={3} data-surface-recipe='operationalWorkbench'>
          <Box data-capture='talent-pool-header'>
            <Typography variant='overline' color='primary.dark'>
              {t.eyebrow}
            </Typography>
            <Typography component='h2' variant='h4' sx={{ mt: 0.5 }}>
              {t.title}
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 1, maxInlineSize: '74ch' }}>
              {t.subtitle}
            </Typography>
          </Box>

          {!readEnabled ? (
            <Alert severity='info'>{t.errorTitle}</Alert>
          ) : (
            <>
              <Paper
                component='form'
                variant='outlined'
                data-capture='talent-pool-filters'
                onSubmit={event => {
                  event.preventDefault()
                  load(filters)
                }}
                sx={{ p: { xs: 2, md: 3 } }}
              >
                <Stack
                  direction='row'
                  alignItems='center'
                  justifyContent='space-between'
                  sx={{ display: { xs: 'flex', md: 'none' }, mb: filtersOpen ? 2 : 0 }}
                >
                  <Box>
                    <Typography variant='subtitle2' color='text.primary'>
                      {t.filtersLabel}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {interpolate(t.activeFilters, { count: activeFilterCount })}
                    </Typography>
                  </Box>
                  <GreenhouseDisclosureTrigger
                    kind='showFilters'
                    open={filtersOpen}
                    onClick={() => setFiltersOpen(open => !open)}
                    ariaLabel={filtersOpen ? t.filtersHide : t.filtersShow}
                    dataCapture='talent-pool-filter-disclosure'
                  />
                </Stack>
                <Box
                  sx={{
                    display: { xs: filtersOpen ? 'grid' : 'none', md: 'grid' },
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(4, minmax(0, 1fr))'
                    },
                    gap: 2
                  }}
                >
                  <CustomTextField
                    size='small'
                    label={t.searchLabel}
                    placeholder={t.searchPlaceholder}
                    value={filters.query}
                    sx={{ gridColumn: { lg: 'span 2' } }}
                    onChange={event => setFilters(current => ({ ...current, query: event.target.value }))}
                    inputProps={{ maxLength: 80 }}
                  />
                  <CustomTextField
                    size='small'
                    label={t.capabilityLabel}
                    placeholder={t.capabilityPlaceholder}
                    value={filters.capability}
                    sx={{ gridColumn: { lg: 'span 2' } }}
                    onChange={event => setFilters(current => ({ ...current, capability: event.target.value }))}
                    inputProps={{ maxLength: 80 }}
                  />
                  <CustomTextField
                    size='small'
                    label={t.seniorityLabel}
                    value={filters.seniority}
                    onChange={event => setFilters(current => ({ ...current, seniority: event.target.value }))}
                    inputProps={{ maxLength: 40 }}
                  />
                  <CustomTextField
                    size='small'
                    label={t.languageLabel}
                    value={filters.language}
                    onChange={event => setFilters(current => ({ ...current, language: event.target.value }))}
                    inputProps={{ maxLength: 16 }}
                  />
                  <CustomTextField
                    size='small'
                    label={t.countryLabel}
                    value={filters.country}
                    onChange={event => setFilters(current => ({ ...current, country: event.target.value }))}
                    inputProps={{ maxLength: 2 }}
                  />
                  <CustomTextField
                    size='small'
                    label={t.availabilityLabel}
                    value={filters.availability}
                    onChange={event => setFilters(current => ({ ...current, availability: event.target.value }))}
                    inputProps={{ maxLength: 40 }}
                  />
                </Box>
                <Stack
                  direction='row'
                  justifyContent='flex-end'
                  gap={1.5}
                  sx={{ display: { xs: filtersOpen ? 'flex' : 'none', md: 'flex' }, mt: 2 }}
                >
                  {hasFilters ? (
                    <GreenhouseButton type='button' kind='inlineAction' onClick={clearFilters}>
                      {t.clearFilters}
                    </GreenhouseButton>
                  ) : null}
                  <GreenhouseButton
                    type='submit'
                    kind='primaryAction'
                    disabled={pending}
                    leadingIconClassName='tabler-search'
                  >
                    {pending ? t.loading : t.searchLabel}
                  </GreenhouseButton>
                </Stack>
              </Paper>

              {receipt ? (
                <Alert severity='success' role='status'>
                  {receipt}
                </Alert>
              ) : null}

              <AdaptiveSidecarLayout
                open={Boolean(selected)}
                onOpenChange={open => {
                  if (!open) setSelected(null)
                }}
                restoreFocusRef={restoreFocusRef}
                kind='inspector'
                preferredMode='push'
                mainMinWidth={640}
                temporaryBreakpoint='md'
                panelEntrance='slide'
                dataCapture='talent-pool-workbench'
                source='hiring-talent-pool-desk'
                sidecar={
                  selected ? (
                    <TalentProfilePanel
                      profile={selected}
                      copy={t}
                      onClose={() => setSelected(null)}
                      onInvite={openInvite}
                      canInvite={canInvite && inviteEnabled}
                      documentCopy={copy.application.documentsPanel}
                      commonClose={copy.common.close}
                      previewDocuments={previewDocuments}
                    />
                  ) : null
                }
              >
                {resultsPlane}
              </AdaptiveSidecarLayout>
            </>
          )}

          <Dialog
            open={inviteOpen}
            onClose={() => {
              if (!invitePending) setInviteOpen(false)
            }}
            fullWidth
            maxWidth='sm'
            aria-describedby='talent-pool-invite-description'
            data-capture='talent-pool-invite-dialog'
          >
            <DialogTitle>{proposalRef ? t.confirmTitle : t.inviteTitle}</DialogTitle>
            <DialogContent>
              <Typography id='talent-pool-invite-description' color='text.secondary' sx={{ mb: 3 }}>
                {proposalRef && selectedOpening
                  ? interpolate(t.confirmBody, { opening: selectedOpening.label })
                  : t.inviteBody}
              </Typography>
              {!proposalRef ? (
                <FormControl fullWidth>
                  <InputLabel id='talent-pool-opening-label'>{t.openingLabel}</InputLabel>
                  <Select
                    labelId='talent-pool-opening-label'
                    label={t.openingLabel}
                    value={openingId}
                    onChange={event => setOpeningId(event.target.value)}
                  >
                    <MenuItem value='' disabled>
                      {t.openingPlaceholder}
                    </MenuItem>
                    {openings.map(opening => (
                      <MenuItem key={opening.openingId} value={opening.openingId}>
                        {opening.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
              {inviteError ? (
                <Alert severity='error' sx={{ mt: 2 }}>
                  {inviteError}
                </Alert>
              ) : null}
            </DialogContent>
            <DialogActions>
              <GreenhouseButton kind='secondaryAction' onClick={() => setInviteOpen(false)} disabled={invitePending}>
                {t.cancel}
              </GreenhouseButton>
              <GreenhouseButton
                kind='primaryAction'
                onClick={() => void (proposalRef ? confirmInvite() : proposeInvite())}
                disabled={invitePending || !openingId}
              >
                {invitePending ? (proposalRef ? t.confirming : t.proposing) : proposalRef ? t.confirm : t.propose}
              </GreenhouseButton>
            </DialogActions>
          </Dialog>

          <Box
            aria-live='polite'
            aria-atomic='true'
            sx={{
              position: 'fixed',
              inlineSize: 1,
              blockSize: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap'
            }}
          >
            {liveMessage}
          </Box>
        </Stack>
      }
    />
  )
}

export default TalentPoolDeskView
