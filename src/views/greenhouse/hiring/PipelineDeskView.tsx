'use client'

import { useMemo, useRef, useState } from 'react'

import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import GreenhouseDragList from '@/components/greenhouse/GreenhouseDragList'
import { GreenhouseChip } from '@/components/greenhouse/primitives'
import type { HiringDeskCopy } from '@/lib/copy'
import { formatDate } from '@/lib/format'
import type {
  HiringApplicationStage,
  HiringDeskApplicationSummary,
  HiringDeskSnapshot,
} from '@/types/hiring'

import HiringDeskFrame from './HiringDeskFrame'
import { hiringRequest } from './hiring-client'

type LaneId = 'inbox' | 'screening' | 'shortlist' | 'interview' | 'decision' | 'outcome'

type LaneDefinition = {
  id: LaneId
  titleStage: HiringApplicationStage
  stages: HiringApplicationStage[]
  destination: HiringApplicationStage | null
  tone: 'primary' | 'info' | 'secondary' | 'warning' | 'success' | 'default'
  icon: string
}

const LANES: LaneDefinition[] = [
  // The approved Hiring Desk uses six canonical columns. Backend stages that
  // represent the same operational step are intentionally grouped inside the
  // visual lane (the user still sees the canonical vocabulary).
  { id: 'inbox', titleStage: 'sourced', stages: ['sourced'], destination: 'sourced', tone: 'primary', icon: 'tabler-sparkles' },
  { id: 'screening', titleStage: 'screening', stages: ['screening'], destination: 'screening', tone: 'info', icon: 'tabler-scan' },
  { id: 'shortlist', titleStage: 'shortlisted', stages: ['qualified', 'shortlisted', 'client_review'], destination: 'qualified', tone: 'secondary', icon: 'tabler-list-check' },
  { id: 'interview', titleStage: 'interview', stages: ['interview'], destination: 'interview', tone: 'warning', icon: 'tabler-messages' },
  { id: 'decision', titleStage: 'decision_pending', stages: ['decision_pending'], destination: 'decision_pending', tone: 'primary', icon: 'tabler-gavel' },
  { id: 'outcome', titleStage: 'closed', stages: ['closed', 'selected', 'backup', 'rejected', 'withdrawn', 'handoff_ready'], destination: 'closed', tone: 'success', icon: 'tabler-rosette-discount-check' },
]

const MOVABLE_STAGES: HiringApplicationStage[] = [
  'sourced', 'screening', 'qualified', 'shortlisted', 'client_review', 'interview', 'decision_pending', 'closed',
]

const laneForStage = (stage: HiringApplicationStage) =>
  LANES.find((lane) => lane.stages.includes(stage))?.id ?? 'inbox'

const toneForStage = (stage: HiringApplicationStage) => {
  if (stage === 'rejected' || stage === 'withdrawn') return 'error'
  if (stage === 'selected' || stage === 'handoff_ready') return 'success'
  if (stage === 'decision_pending' || stage === 'interview') return 'warning'
  if (stage === 'shortlisted' || stage === 'client_review') return 'secondary'

  return 'info'
}

interface PipelineDeskViewProps {
  copy: HiringDeskCopy
  initialSnapshot: HiringDeskSnapshot
  initialOpeningId?: string
  simulateStageFailure?: boolean
}

const PipelineDeskView = ({ copy, initialSnapshot, initialOpeningId, simulateStageFailure = false }: PipelineDeskViewProps) => {
  const [applications, setApplications] = useState(initialSnapshot.applications)
  const [openingId, setOpeningId] = useState(initialOpeningId ?? '')
  const [query, setQuery] = useState('')
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; application: HiringDeskApplicationSummary } | null>(null)
  const liveRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-CL')

    return applications.filter((item) => {
      if (openingId && item.application.openingId !== openingId) return false
      if (!normalized) return true

      return [item.candidateName, item.openingTitle, item.application.publicId]
        .some((value) => value.toLocaleLowerCase('es-CL').includes(normalized))
    })
  }, [applications, openingId, query])

  const persistStage = async (item: HiringDeskApplicationSummary, stage: HiringApplicationStage) => {
    const previous = item.application.stage

    if (previous === stage || savingIds.has(item.application.applicationId)) return

    setApplications((current) => current.map((candidate) => (
      candidate.application.applicationId === item.application.applicationId
        ? { ...candidate, application: { ...candidate.application, stage } }
        : candidate
    )))
    setSavingIds((current) => new Set(current).add(item.application.applicationId))
    if (liveRef.current) liveRef.current.textContent = copy.pipeline.saving

    try {
      if (simulateStageFailure) throw new Error('capture-stage-failure')

      await hiringRequest(`/api/hiring/applications/${item.application.applicationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      })
      setToast({ message: copy.pipeline.saved, severity: 'success' })
      if (liveRef.current) liveRef.current.textContent = `${item.candidateName}: ${copy.pipeline.saved}`
    } catch {
      setApplications((current) => current.map((candidate) => (
        candidate.application.applicationId === item.application.applicationId
          ? { ...candidate, application: { ...candidate.application, stage: previous } }
          : candidate
      )))
      setToast({ message: copy.pipeline.rollback, severity: 'error' })
      if (liveRef.current) liveRef.current.textContent = `${item.candidateName}: ${copy.pipeline.rollback}`
    } finally {
      setSavingIds((current) => {
        const next = new Set(current)

        next.delete(item.application.applicationId)

        return next
      })
    }
  }

  const handleLaneChange = (lane: LaneDefinition, next: HiringDeskApplicationSummary[]) => {
    if (!lane.destination) return

    const transferred = next.find((item) => laneForStage(item.application.stage) !== lane.id)

    if (transferred) void persistStage(transferred, lane.destination)
  }

  const card = (item: HiringDeskApplicationSummary) => {
    const saving = savingIds.has(item.application.applicationId)
    const assessment = item.application.explainability?.assessment
    const testTag = assessment ? (item.application.score != null ? 'Test entregado' : 'Test asignado') : null

    return (
      <Card
        data-capture='hiring-application-card'
        variant='outlined'
        component={NextLink}
        href={`/agency/hiring/applications/${item.application.applicationId}`}
        aria-label={`${item.candidateName} · ${copy.common.openApplication}`}
        sx={(theme) => ({
          minWidth: 0,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          boxShadow: theme.shadows[1],
          cursor: saving ? 'progress' : 'grab',
          transition: theme.transitions.create(['box-shadow', 'transform', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': { boxShadow: theme.shadows[4], transform: 'translateY(-2px)', borderColor: theme.palette.primary.light },
          '&:active': { cursor: 'grabbing' },
          textDecoration: 'none',
          color: 'inherit',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' },
        })}
      >
        <CardContent>
          <Stack spacing={2}>
            <Stack direction='row' alignItems='flex-start' spacing={1.5}>
              <Avatar sx={{ bgcolor: 'primary.dark', color: 'common.white', fontWeight: 700 }}>{item.candidateInitials}</Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant='subtitle1' color='text.primary' fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{item.candidateName}</Typography>
                <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>{item.openingTitle}</Typography>
              </Box>
              <Tooltip title={copy.pipeline.keyboardHint}>
                <IconButton
                  size='small'
                  aria-label={`${copy.pipeline.moveTo}: ${item.candidateName}`}
                  aria-haspopup='menu'
                  data-capture='hiring-card-stage-menu'
                  onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenu({ anchor: event.currentTarget, application: item }) }}
                >
                  <i aria-hidden='true' className='tabler-dots-vertical' />
                </IconButton>
              </Tooltip>
            </Stack>

            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <GreenhouseChip size='small' kind='status' variant='label' tone={toneForStage(item.application.stage)} label={copy.pipeline.stages[item.application.stage]} />
              {item.area ? <GreenhouseChip size='small' kind='attribute' variant='outlined' label={item.area} /> : null}
              {testTag ? <GreenhouseChip size='small' kind='status' variant='label' tone={testTag === 'Test entregado' ? 'info' : 'warning'} label={testTag} /> : null}
            </Stack>

            {item.application.score != null || item.application.matchScore != null ? (
              <>
                <Divider />
                <Stack direction='row' justifyContent='space-between' spacing={2}>
                  <Box><Typography variant='caption' color='text.secondary'>{copy.application.score}</Typography><Typography variant='subtitle2' fontWeight={700}>{item.application.score ?? '—'}</Typography></Box>
                  <Box sx={{ textAlign: 'right' }}><Typography variant='caption' color='text.secondary'>{copy.application.match}</Typography><Typography variant='subtitle2' fontWeight={700}>{item.application.matchScore != null ? `${item.application.matchScore}%` : '—'}</Typography></Box>
                </Stack>
              </>
            ) : null}

            <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
              <Typography variant='caption' color='text.secondary'>Aplicada {formatDate(item.application.createdAt, { dateStyle: 'medium' }, 'es-CL')}</Typography>
              <Typography variant='caption' color='primary.main' fontWeight={700}>{copy.common.openApplication} <i aria-hidden='true' className='tabler-arrow-up-right' /></Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const content = (
    <Stack spacing={4} sx={{ minWidth: 0 }}>
      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <FormControl sx={{ minInlineSize: { xs: '100%', md: 280 } }}>
            <InputLabel id='hiring-opening-filter-label'>{copy.pipeline.openingLabel}</InputLabel>
            <Select labelId='hiring-opening-filter-label' label={copy.pipeline.openingLabel} value={openingId} onChange={(event) => setOpeningId(event.target.value)}>
              <MenuItem value=''>{copy.pipeline.allOpenings}</MenuItem>
              {initialSnapshot.openings.map(({ opening }) => <MenuItem key={opening.openingId} value={opening.openingId}>{opening.internalTitle}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.common.search}
            aria-label={copy.common.search}
            slotProps={{ input: { startAdornment: <InputAdornment position='start'><i aria-hidden='true' className='tabler-search' /></InputAdornment> } }}
          />
          <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>{filtered.length} postulantes</Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}><i aria-hidden='true' className='tabler-arrows-move mie-1' />Arrastra una tarjeta o usa el menú ⋮ para mover con teclado.</Typography>
      </Box>

      <Box ref={liveRef} aria-live='polite' sx={{ position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }} />

      <Box
        data-capture='hiring-pipeline-board'
        role='region'
        aria-label={copy.pipeline.title}
        tabIndex={0}
        sx={{
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'auto',
          overscrollBehaviorInline: 'contain',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${LANES.length}, minmax(288px, 1fr))`, gap: 2.5, minInlineSize: 1840, alignItems: 'start' }}>
          {LANES.map((lane) => {
            const items = filtered.filter((item) => lane.stages.includes(item.application.stage))

            return (
              <Paper
                key={lane.id}
                data-capture={`hiring-lane-${lane.id}`}
                variant='outlined'
                sx={(theme) => ({
                  minWidth: 0,
                  borderRadius: `${theme.shape.customBorderRadius.xl}px`,
                  backgroundColor: theme.palette.background.default,
                  overflow: 'hidden',
                })}
              >
                <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} sx={{ p: 2.5 }}>
                  <Stack direction='row' alignItems='center' spacing={1.25}>
                    <Box sx={{ display: 'grid', placeItems: 'center', inlineSize: 32, blockSize: 32, borderRadius: 2, color: lane.tone === 'default' ? 'text.secondary' : `${lane.tone}.main`, backgroundColor: 'action.hover' }}>
                      <i aria-hidden='true' className={lane.icon} />
                    </Box>
                    <Typography variant='overline' color='text.primary'>{copy.pipeline.stages[lane.titleStage]}</Typography>
                  </Stack>
                  <GreenhouseChip size='small' kind='metric' tone={lane.tone} variant='label' label={String(items.length)} />
                </Stack>
                <Divider />
                <Box sx={{ p: 2 }}>
                  <GreenhouseDragList
                    items={items.map((item) => ({ ...item, id: item.application.applicationId }))}
                    group={lane.destination ? 'hiring-pipeline' : undefined}
                    ariaLabel={`${copy.pipeline.stages[lane.titleStage]}: ${items.length}`}
                    onChange={(next) => handleLaneChange(lane, next)}
                    renderItem={(item) => card(item)}
                    emptyState={(
                      <Stack alignItems='center' justifyContent='center' spacing={1} sx={(theme) => ({ minBlockSize: 88, px: 2, textAlign: 'center', color: 'text.primary', border: '1px dashed', borderColor: 'divider', borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
                        <i aria-hidden='true' className='tabler-arrow-down' />
                        <Typography variant='caption' color='text.primary'>{copy.pipeline.emptyLane}</Typography>
                      </Stack>
                    )}
                    sx={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: 1.5, minBlockSize: 104 }}
                  />
                </Box>
              </Paper>
            )
          })}
        </Box>
      </Box>

      {filtered.length === 0 ? <Alert severity='info'>{copy.common.noResults}</Alert> : null}
    </Stack>
  )

  return (
    <>
      <HiringDeskFrame surface='pipeline' copy={copy} primary={content} />

      <Menu
        anchorEl={menu?.anchor}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        MenuListProps={{ 'aria-label': copy.pipeline.moveTo }}
      >
        <MenuItem disabled><Typography variant='caption' color='text.secondary'>{copy.pipeline.moveTo}</Typography></MenuItem>
        {MOVABLE_STAGES.map((stage) => (
          <MenuItem
            key={stage}
            selected={menu?.application.application.stage === stage}
            onClick={() => {
              if (menu) void persistStage(menu.application, stage)
              setMenu(null)
            }}
          >
            {copy.pipeline.stages[stage]}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem component={NextLink} href={menu ? `/agency/hiring/applications/${menu.application.application.applicationId}` : '/agency/hiring/pipeline'}>
          <i aria-hidden='true' className='tabler-user-search mie-2' /> {copy.common.openApplication}
        </MenuItem>
      </Menu>

      <Snackbar open={Boolean(toast)} autoHideDuration={4500} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'success'} variant='filled' onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </>
  )
}

export default PipelineDeskView
