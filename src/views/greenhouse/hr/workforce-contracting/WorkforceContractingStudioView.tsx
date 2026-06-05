'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import EmptyState from '@/components/greenhouse/EmptyState'
import { formatDate, formatDateTime } from '@/lib/format'
import { OperationalPanel, type OperationalStatusTone } from '@/components/greenhouse/primitives'
import { GH_WORKFORCE_CONTRACTING as C } from '@/lib/copy/workforce-contracting'
import type { ContractingCaseDetail, ContractingCaseListItem } from '@/lib/workforce/contracting/readers'

import BilingualReviewDesk from './BilingualReviewDesk'
import CreateContractingCaseForm from './CreateContractingCaseForm'

type StudioMode = 'command' | 'builder' | 'review'
type QueueFilter = 'all' | 'offers' | 'contracts' | 'chile' | 'international' | 'risk'
type DetailState = 'idle' | 'loading' | 'ready' | 'error'

interface Props {
  items: ContractingCaseListItem[]
  canManage: boolean
  canApprove: boolean
  canSendSignature: boolean
  operatingEntityOrganizationId: string | null
}

// ── Tone + label mappers (projection → es-CL, honest) ──────────────────────────
const statusTone = (status: string): OperationalStatusTone => {
  if (['validation_blocked', 'rejected', 'voided', 'signature_failed', 'expired', 'withdrawn'].includes(status)) return 'error'
  if (['approved', 'accepted', 'active', 'fully_signed', 'registered_external', 'internal_approved', 'converted_to_contract'].includes(status)) return 'success'
  if (['ai_drafted', 'sent_for_signature', 'partially_signed', 'ready_for_signature', 'ready_for_pdf', 'sent', 'viewed', 'needs_amendment'].includes(status)) return 'warning'
  if (['pending_internal_review', 'pending_review', 'legal_review'].includes(status)) return 'info'

  return 'secondary'
}

const riskTone = (level: 'low' | 'medium' | 'high'): OperationalStatusTone =>
  level === 'high' ? 'error' : level === 'medium' ? 'warning' : 'success'

const parityTone = (parity: string): OperationalStatusTone => {
  if (parity === 'pass') return 'success'
  if (parity === 'fail') return 'error'

  return 'secondary'
}

const statusLabel = (status: string) =>
  (C.statusLabels as Record<string, string>)[status] ?? status

const packLabel = (code: string) => C.packLabels[code] ?? code

const parityLabel = (parity: string) =>
  (C.parityLabels as Record<string, string>)[parity] ?? C.parityLabels.unknown

const nextActionLabel = (code: string) =>
  (C.nextActionLabels as Record<string, string>)[code] ?? C.nextActionLabels.none

const initialsOf = (name: string | null): string =>
  (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || '?'

const isOffer = (item: ContractingCaseListItem) => item.caseKind === 'offer_letter'

const formatStart = (value: string | null) =>
  formatDate(value, { day: '2-digit', month: 'short', year: 'numeric', fallback: C.detail.notAvailable }, 'es-CL')

// ── Pill (themed, mirror del mockup aprobado) ──────────────────────────────────
const StatusPill = ({ label, tone = 'secondary', icon }: { label: string; tone?: OperationalStatusTone; icon?: string }) => {
  const theme = useTheme()
  const palette = theme.palette[tone]
  const borderColor = tone === 'secondary' ? theme.palette.divider : alpha(palette.main, 0.32)
  const backgroundColor = tone === 'secondary' ? alpha(theme.palette.text.primary, 0.055) : alpha(palette.main, 0.105)

  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        width: 'fit-content',
        maxWidth: '100%',
        borderRadius: 999,
        border: `1px solid ${borderColor}`,
        bgcolor: backgroundColor,
        color: 'text.primary',
        px: 1.35,
        py: 0.35,
        fontSize: '0.8125rem',
        fontWeight: 700,
        lineHeight: 1.35,
        whiteSpace: 'nowrap'
      }}
    >
      {icon ? <i className={icon} aria-hidden='true' /> : null}
      <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Box>
    </Box>
  )
}

const MODE_LABELS: Record<StudioMode, { label: string; icon: string; capture: string }> = {
  command: { label: C.commandCenter, icon: 'tabler-layout-dashboard', capture: 'mode-command' },
  builder: { label: C.guidedBuilder, icon: 'tabler-route', capture: 'mode-builder' },
  review: { label: C.bilingualReview, icon: 'tabler-columns-3', capture: 'mode-review' }
}

const WorkforceContractingStudioView = ({ items, canManage, canApprove, canSendSignature, operatingEntityOrganizationId }: Props) => {
  const theme = useTheme()
  const router = useRouter()
  const [mode, setMode] = useState<StudioMode>('command')
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ContractingCaseDetail | null>(null)
  const [detailState, setDetailState] = useState<DetailState>('idle')

  const filtered = useMemo(() => {
    switch (filter) {
      case 'offers':
        return items.filter(isOffer)
      case 'contracts':
        return items.filter(item => !isOffer(item))
      case 'chile':
        return items.filter(item => item.jurisdictionPackCode.startsWith('CL_'))
      case 'international':
        return items.filter(item => item.jurisdictionPackCode.startsWith('INTERNATIONAL_'))
      case 'risk':
        return items.filter(item => item.projection.riskLevel === 'high')
      default:
        return items
    }
  }, [items, filter])

  const kpis = useMemo(() => {
    const pendingReview = items.filter(i => ['ai_drafted', 'pending_internal_review', 'pending_review', 'legal_review'].includes(i.status)).length
    const blocked = items.filter(i => i.status === 'validation_blocked' || i.projection.missingFactsSummary > 0).length
    const readySign = items.filter(i => ['ready_for_pdf', 'ready_for_signature', 'pending_signature'].includes(i.projection.signatureReadinessStatus)).length
    const highRisk = items.filter(i => i.projection.riskLevel === 'high').length

    return [
      { label: 'Casos totales', value: items.length, icon: 'tabler-files', tone: 'primary' as OperationalStatusTone },
      { label: 'Por revisar', value: pendingReview, icon: 'tabler-file-pencil', tone: 'warning' as OperationalStatusTone },
      { label: 'Bloqueados por datos', value: blocked, icon: 'tabler-alert-triangle', tone: 'error' as OperationalStatusTone },
      { label: 'Listos para firma', value: readySign, icon: 'tabler-writing-sign', tone: 'success' as OperationalStatusTone },
      { label: 'Riesgo alto', value: highRisk, icon: 'tabler-shield-exclamation', tone: 'error' as OperationalStatusTone }
    ]
  }, [items])

  const loadDetail = useCallback(async (caseId: string) => {
    setDetailState('loading')

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(caseId)}`)

      if (!res.ok) throw new Error('detail_failed')

      const data = (await res.json()) as ContractingCaseDetail

      setDetail(data)
      setDetailState('ready')
    } catch {
      setDetail(null)
      setDetailState('error')
    }
  }, [])

  const handleSelect = useCallback(
    (caseId: string) => {
      setSelectedId(caseId)
      void loadDetail(caseId)
    },
    [loadDetail]
  )

  // Keep selection valid when the filter narrows the queue.
  useEffect(() => {
    if (selectedId && !filtered.some(i => i.caseId === selectedId)) {
      setSelectedId(null)
      setDetail(null)
      setDetailState('idle')
    }
  }, [filtered, selectedId])

  const handleCreated = useCallback(
    (newCaseId: string) => {
      setSelectedId(newCaseId)
      setMode('command')
      router.refresh()
      void loadDetail(newCaseId)
    },
    [router, loadDetail]
  )

  const handleReview = useCallback((caseId: string) => {
    setSelectedId(caseId)
    setMode('review')
  }, [])

  return (
    <Stack spacing={{ xs: 3, md: 5 }} data-capture='workforce-contracting-studio'>
      <Header mode={mode} onModeChange={setMode} canManage={canManage} />

      <MetricStrip kpis={kpis} />

      {mode === 'command' ? (
        <CommandCenter
          items={items}
          filtered={filtered}
          filter={filter}
          onFilter={setFilter}
          selectedId={selectedId}
          onSelect={handleSelect}
          onReview={handleReview}
          detail={detail}
          detailState={detailState}
          onRetryDetail={() => selectedId && loadDetail(selectedId)}
          theme={theme}
        />
      ) : null}

      {mode === 'builder' ? (
        canManage ? (
          <CreateContractingCaseForm operatingEntityOrganizationId={operatingEntityOrganizationId} onCreated={handleCreated} />
        ) : (
          <LockedMode title={C.locked.builderTitle} body={C.locked.builderBody} icon='tabler-route' />
        )
      ) : null}

      {mode === 'review' ? (
        <BilingualReviewDesk caseId={selectedId} canApprove={canApprove} canManage={canManage} canSendSignature={canSendSignature} onChanged={() => router.refresh()} />
      ) : null}
    </Stack>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────────
const Header = ({ mode, onModeChange, canManage }: { mode: StudioMode; onModeChange: (m: StudioMode) => void; canManage: boolean }) => (
  <Card
    sx={theme => ({
      borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
      borderTop: `3px solid ${theme.palette.primary.main}`,
      boxShadow: 'none'
    })}
  >
    <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' gap={3}>
          <Stack spacing={1.5} sx={{ minWidth: 0, maxWidth: 780 }}>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <StatusPill label={C.requiredLanguages} tone='success' icon='tabler-language' />
              <StatusPill label={C.authoritativeSpanish} tone='primary' icon='tabler-gavel' />
              <StatusPill label={C.aiGuardrail} tone='info' icon='tabler-sparkles' />
            </Stack>
            <Box>
              <Typography variant='h4' sx={{ lineHeight: 1.1 }}>
                {C.studioName}
              </Typography>
              <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 720 }}>
                {C.runtimeSubtitle}
              </Typography>
            </Box>
          </Stack>

          <Stack alignItems={{ xs: 'stretch', lg: 'flex-end' }} spacing={1}>
            <Button
              variant='contained'
              disabled={!canManage}
              onClick={() => onModeChange('builder')}
              startIcon={<i className='tabler-file-plus' aria-hidden='true' />}
            >
              {C.createDocument}
            </Button>
          </Stack>
        </Stack>

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_e, next: StudioMode | null) => next && onModeChange(next)}
          aria-label={C.aria.prototypeMode}
          sx={{
            alignSelf: 'flex-start',
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiToggleButtonGroup-grouped': {
              borderRadius: 1,
              border: theme => `1px solid ${theme.palette.divider} !important`,
              mx: 0
            }
          }}
        >
          {(Object.keys(MODE_LABELS) as StudioMode[]).map(item => (
            <ToggleButton key={item} value={item} aria-label={MODE_LABELS[item].label} data-capture={MODE_LABELS[item].capture}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <i className={MODE_LABELS[item].icon} aria-hidden='true' />
                <span>{MODE_LABELS[item].label}</span>
              </Stack>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
    </CardContent>
  </Card>
)

// ── KPI strip ──────────────────────────────────────────────────────────────────
const MetricStrip = ({ kpis }: { kpis: Array<{ label: string; value: number; icon: string; tone: OperationalStatusTone }> }) => (
  <Box
    data-capture='workforce-contracting-kpis'
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
      gap: 2
    }}
  >
    {kpis.map(metric => (
      <Card key={metric.label} sx={{ boxShadow: 'none', border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='h4' sx={{ lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCounter value={metric.value} />
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {metric.label}
              </Typography>
            </Box>
            <CustomAvatar skin='light' color={metric.tone} variant='rounded'>
              <i className={metric.icon} aria-hidden='true' />
            </CustomAvatar>
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Box>
)

// ── Command Center (queue + detail rail) ───────────────────────────────────────
const FILTER_ORDER: QueueFilter[] = ['all', 'offers', 'contracts', 'chile', 'international', 'risk']

const CommandCenter = ({
  items,
  filtered,
  filter,
  onFilter,
  selectedId,
  onSelect,
  onReview,
  detail,
  detailState,
  onRetryDetail,
  theme
}: {
  items: ContractingCaseListItem[]
  filtered: ContractingCaseListItem[]
  filter: QueueFilter
  onFilter: (f: QueueFilter) => void
  selectedId: string | null
  onSelect: (id: string) => void
  onReview: (id: string) => void
  detail: ContractingCaseDetail | null
  detailState: DetailState
  onRetryDetail: () => void
  theme: Theme
}) => {
  // Empty zero-state — no cases exist at all.
  if (items.length === 0) {
    return (
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <EmptyState icon='tabler-file-certificate' title={C.states.emptyTitle} description={C.states.emptyBody} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Box
      data-capture='workforce-contracting-command-center'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px', xl: 'minmax(0, 1fr) 400px' },
        gap: 3,
        alignItems: 'start'
      }}
    >
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ p: 3 }}>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              {FILTER_ORDER.map(key => (
                <Box key={key} component='button' onClick={() => onFilter(key)} sx={{ border: 'none', background: 'none', p: 0, cursor: 'pointer' }} aria-pressed={filter === key}>
                  <StatusPill label={(C.filters as Record<string, string>)[key]} tone={filter === key ? 'primary' : 'secondary'} />
                </Box>
              ))}
            </Stack>
          </Stack>
          <Divider />

          {filtered.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState
                icon='tabler-filter-off'
                title={C.states.emptyFilteredTitle}
                description={C.states.emptyFilteredBody}
                action={
                  <Button variant='outlined' size='small' onClick={() => onFilter('all')}>
                    {C.states.clearFilters}
                  </Button>
                }
              />
            </Box>
          ) : (
            <Box tabIndex={0} aria-label={C.aria.commandQueueTable}>
              <Table>
                <caption className='sr-only'>{C.aria.commandQueueTable}</caption>
                <TableHead>
                  <TableRow>
                    <TableCell scope='col'>{C.columns.person}</TableCell>
                    <TableCell scope='col'>{C.columns.document}</TableCell>
                    <TableCell scope='col'>{C.columns.status}</TableCell>
                    <TableCell scope='col' align='right'>{C.columns.risk}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(item => {
                    const selected = item.caseId === selectedId

                    return (
                      <TableRow
                        key={item.caseId}
                        hover
                        selected={selected}
                        tabIndex={0}
                        onClick={() => onSelect(item.caseId)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onSelect(item.caseId)
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`
                          }
                        }}
                      >
                        <TableCell>
                          <Stack direction='row' spacing={1.5} alignItems='center'>
                            <CustomAvatar skin='filled' color='primary' size={34}>
                              {initialsOf(item.subjectName)}
                            </CustomAvatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant='subtitle2'>{item.subjectName ?? C.detail.notAvailable}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {item.caseId}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant='body2'>{(C.kindLabels as Record<string, string>)[item.caseKind]}</Typography>
                            <Typography variant='caption' color='text.secondary'>{packLabel(item.jurisdictionPackCode)}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <StatusPill label={statusLabel(item.status)} tone={statusTone(item.status)} />
                        </TableCell>
                        <TableCell align='right'>
                          <StatusPill label={(C.riskLabels as Record<string, string>)[item.projection.riskLevel]} tone={riskTone(item.projection.riskLevel)} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <CaseRail selectedId={selectedId} detail={detail} detailState={detailState} onRetry={onRetryDetail} onReview={onReview} theme={theme} />
    </Box>
  )
}

// ── Detail rail ────────────────────────────────────────────────────────────────
const CaseRail = ({
  selectedId,
  detail,
  detailState,
  onRetry,
  onReview,
  theme
}: {
  selectedId: string | null
  detail: ContractingCaseDetail | null
  detailState: DetailState
  onRetry: () => void
  onReview: (id: string) => void
  theme: Theme
}) => (
  <Card data-capture='workforce-contracting-case-rail' sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}`, position: { lg: 'sticky' }, top: { lg: 16 } }}>
    <CardContent sx={{ p: 3 }}>
      {!selectedId ? (
        <Stack spacing={1.5} alignItems='center' sx={{ py: 4, textAlign: 'center' }} role='status'>
          <CustomAvatar skin='light' color='secondary' variant='rounded'>
            <i className='tabler-click' aria-hidden='true' />
          </CustomAvatar>
          <Typography variant='body2' color='text.secondary'>
            {C.detail.selectHint}
          </Typography>
        </Stack>
      ) : detailState === 'loading' ? (
        <Stack spacing={2} aria-busy='true' aria-label={C.states.loadingDetail}>
          <Skeleton variant='text' width='60%' height={28} />
          <Skeleton variant='rounded' height={64} />
          <Skeleton variant='rounded' height={120} />
          <Stack direction='row' spacing={1} alignItems='center' justifyContent='center'>
            <CircularProgress size={16} />
            <Typography variant='caption' color='text.secondary'>
              {C.states.loadingDetail}
            </Typography>
          </Stack>
        </Stack>
      ) : detailState === 'error' || !detail ? (
        <Stack spacing={1.5} alignItems='center' sx={{ py: 3, textAlign: 'center' }} role='alert'>
          <CustomAvatar skin='light' color='error' variant='rounded'>
            <i className='tabler-alert-circle' aria-hidden='true' />
          </CustomAvatar>
          <Box>
            <Typography variant='subtitle2'>{C.states.errorTitle}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {C.states.errorBody}
            </Typography>
          </Box>
          <Button variant='outlined' size='small' onClick={onRetry}>
            {C.states.retry}
          </Button>
        </Stack>
      ) : (
        <CaseRailContent detail={detail} theme={theme} onReview={onReview} />
      )}
    </CardContent>
  </Card>
)

const CaseRailContent = ({ detail, theme, onReview }: { detail: ContractingCaseDetail; theme: Theme; onReview: (id: string) => void }) => {
  const projection = detail.projection
  const blockers = detail.latestValidation?.blockers ?? []

  return (
    <Stack spacing={3}>
      <Stack direction='row' justifyContent='space-between' spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h5'>{detail.subjectName ?? C.detail.notAvailable}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {(C.kindLabels as Record<string, string>)[detail.case.caseKind]} · {packLabel(detail.case.jurisdictionPackCode)}
          </Typography>
        </Box>
        <StatusPill label={statusLabel(detail.case.status)} tone={statusTone(detail.case.status)} />
      </Stack>

      <Stack spacing={1.4}>
        {[
          [C.detail.authoritative, detail.case.authoritativeLanguage],
          [C.detail.signableFormat, detail.case.signableFormat.toUpperCase()],
          [C.columns.start, formatStart(detail.case.targetStartDate)],
          [C.columns.nextAction, nextActionLabel(projection.nextActionCode)],
          [C.columns.risk, (C.riskLabels as Record<string, string>)[projection.riskLevel]],
          [C.readyForSignature, (C.signatureLabels as Record<string, string>)[projection.signatureReadinessStatus]]
        ].map(([label, value]) => (
          <Stack key={label} direction='row' justifyContent='space-between' gap={2}>
            <Typography variant='body2' color='text.secondary'>
              {label}
            </Typography>
            <Typography variant='body2' sx={{ textAlign: 'right', maxWidth: 200 }}>
              {value || C.detail.notAvailable}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Divider />

      <Stack spacing={1.5}>
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <Typography variant='subtitle2'>{C.detail.validation}</Typography>
          <StatusPill label={parityLabel(projection.languageParityStatus)} tone={parityTone(projection.languageParityStatus)} icon='tabler-language' />
        </Stack>
        {blockers.length === 0 ? (
          <Typography variant='body2' color='success.main'>
            <i className='tabler-circle-check' aria-hidden='true' /> {C.detail.noBlockers}
          </Typography>
        ) : (
          <Box>
            <Typography variant='subtitle2' color='error.main' sx={{ mb: 1 }}>
              {C.detail.blockers} ({blockers.length})
            </Typography>
            <Stack spacing={0.75}>
              {blockers.map((b, idx) => (
                <Typography key={`${b.code ?? idx}`} variant='body2' color='text.secondary'>
                  • {b.message ?? b.code ?? C.detail.notAvailable}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>

      {detail.drafts.length > 0 ? (
        <>
          <Divider />
          <Stack spacing={1.5}>
            <Typography variant='subtitle2'>{C.detail.drafts}</Typography>
            {detail.drafts.map(draft => (
              <Stack key={draft.draftId} direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                <Typography variant='body2'>
                  v{draft.draftVersion} · {draft.source}
                </Typography>
                <StatusPill label={statusLabel(draft.status)} tone={statusTone(draft.status)} />
              </Stack>
            ))}
          </Stack>
        </>
      ) : null}

      {detail.timeline.length > 0 ? (
        <>
          <Divider />
          <Stack spacing={1.5}>
            <Typography variant='subtitle2'>{C.detail.timeline}</Typography>
            {detail.timeline.slice(0, 8).map(event => (
              <Stack key={event.eventId} direction='row' spacing={1.5} alignItems='flex-start'>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    mt: 0.7,
                    boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`,
                    flex: '0 0 auto'
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='body2' fontWeight={600}>
                    {event.toStatus ? statusLabel(event.toStatus) : event.eventKind}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {formatDateTime(event.occurredAt, { dateStyle: 'medium', timeStyle: 'short' }, 'es-CL')}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </>
      ) : null}

      <Stack spacing={1}>
        <Button fullWidth variant='contained' onClick={() => onReview(detail.case.caseId)} startIcon={<i className='tabler-columns-3' aria-hidden='true' />}>
          {C.reviewBilingualDraft}
        </Button>
        {/* TASK-1023 — "Generar PDF" lives in the Bilingual Review Desk (opened by the action above),
            where the draft is reviewed, approved and rendered in one flow. */}
      </Stack>
    </Stack>
  )
}

// ── Locked mode (Builder / Review — honest "Próximamente") ─────────────────────
const LockedMode = ({ title, body, icon }: { title: string; body: string; icon: string }) => (
  <OperationalPanel title={title} subheader={C.locked.badge} icon={icon} iconColor='secondary'>
    <Stack spacing={2} alignItems='center' sx={{ py: 4, textAlign: 'center' }} role='status'>
      <CustomAvatar skin='light' color='secondary' variant='rounded' size={48}>
        <i className='tabler-tools' aria-hidden='true' />
      </CustomAvatar>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 520 }}>
        {body}
      </Typography>
    </Stack>
  </OperationalPanel>
)

export default WorkforceContractingStudioView
