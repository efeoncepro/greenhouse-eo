'use client'

import { useMemo, useRef, useState } from 'react'

import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
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
import type { HiringDeskCopy } from '@/lib/copy'
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

const laneForStage = (stage: HiringApplicationStage) =>
  LANES.find((lane) => lane.stages.includes(stage))?.id ?? 'inbox'

interface PipelineDeskViewProps {
  copy: HiringDeskCopy
  initialSnapshot: HiringDeskSnapshot
  initialOpeningId?: string
  simulateStageFailure?: boolean
}

const PipelineDeskView = ({ copy, initialSnapshot, initialOpeningId, simulateStageFailure = false }: PipelineDeskViewProps) => {
  const [applications, setApplications] = useState(initialSnapshot.applications)
  const [openingId, setOpeningId] = useState(initialOpeningId ?? initialSnapshot.openings[0]?.opening.openingId ?? '')
  const [query, setQuery] = useState('')
  const [simulateFailure, setSimulateFailure] = useState(simulateStageFailure)
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
      if (simulateFailure) throw new Error('capture-stage-failure')

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
    const source = item.application.source === 'public_careers' ? 'Careers público' : item.application.source.replaceAll('_', ' ')
    const daysSinceApplied = Math.max(1, Math.round((Date.now() - new Date(item.application.createdAt).getTime()) / 86400000))

    return (
      <Paper
        data-capture='hiring-application-card'
        variant='outlined'
        component={NextLink}
        href={`/agency/hiring/applications/${item.application.applicationId}`}
        aria-label={`${item.candidateName} · ${copy.common.openApplication}`}
        sx={(theme) => ({
          minWidth: 0,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          boxShadow: 'none',
          cursor: saving ? 'progress' : 'grab',
          transition: theme.transitions.create(['box-shadow', 'transform', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': { boxShadow: theme.shadows[2], transform: 'translateY(-1px)', borderColor: theme.palette.primary.main },
          '&:active': { cursor: 'grabbing' },
          textDecoration: 'none',
          color: 'inherit',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' },
        })}
      >
        <Stack spacing={1.25} sx={{ p: 1.5 }}>
            <Stack direction='row' alignItems='flex-start' spacing={1.125}>
              <Avatar sx={{ inlineSize: 30, blockSize: 30, bgcolor: 'primary.lightOpacity', color: 'primary.dark', fontSize: 11, fontWeight: 700 }}>{item.candidateInitials}</Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant='body2' color='text.primary' fontWeight={650} sx={{ lineHeight: 1.3, overflowWrap: 'anywhere' }}>{item.candidateName}</Typography>
                <Stack direction='row' alignItems='center' spacing={0.5} sx={{ mt: 0.25, color: 'text.disabled' }}>
                  <i aria-hidden='true' className='tabler-world' style={{ fontSize: 12 }} />
                  <Typography variant='caption' color='inherit' noWrap>{source}</Typography>
                </Stack>
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

            {testTag ? <Box sx={(theme) => ({ display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', gap: 0.5, px: 0.875, py: 0.25, borderRadius: `${theme.shape.customBorderRadius.md}px`, fontSize: 12, fontWeight: 650, color: testTag === 'Test entregado' ? 'info.dark' : 'warning.dark', backgroundColor: testTag === 'Test entregado' ? 'info.lightOpacity' : 'warning.lightOpacity' })}><i aria-hidden='true' className={testTag === 'Test entregado' ? 'tabler-flag-check' : 'tabler-flag'} style={{ fontSize: 12 }} />{testTag}</Box> : null}

            <Typography variant='caption' color='text.disabled'>Postuló hace {daysSinceApplied} {daysSinceApplied === 1 ? 'día' : 'días'}</Typography>
        </Stack>
      </Paper>
    )
  }

  const content = (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Box>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', lg: 'center' }} sx={{ minWidth: 0 }}>
            <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>{copy.pipeline.openingLabel}</Typography>
            <FormControl size='small' sx={{ inlineSize: { xs: '100%', lg: 260 }, minWidth: 0, flex: '0 0 auto' }}>
            <Select inputProps={{ 'aria-label': copy.pipeline.openingLabel }} value={openingId} onChange={(event) => setOpeningId(event.target.value)} startAdornment={<i aria-hidden='true' className='tabler-briefcase mie-2 text-primary' />}>
              <MenuItem value=''>{copy.pipeline.allOpenings}</MenuItem>
              {initialSnapshot.openings.map(({ opening }) => <MenuItem key={opening.openingId} value={opening.openingId}>{opening.internalTitle}</MenuItem>)}
            </Select>
            </FormControl>
            <Typography variant='caption' color='text.disabled' sx={{ whiteSpace: 'nowrap' }}>· {filtered.length} postulantes</Typography>
          </Stack>
          <TextField
            size='small'
            sx={{ inlineSize: { xs: '100%', lg: 220 }, flex: '0 0 auto' }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.common.search}
            aria-label={copy.common.search}
            slotProps={{ input: { startAdornment: <InputAdornment position='start'><i aria-hidden='true' className='tabler-search' /></InputAdornment> } }}
          />
          <Box sx={{ flex: 1 }} />
          <Stack direction='row' spacing={0.75} alignItems='center' sx={{ whiteSpace: 'nowrap' }}>
            <Box component='button' type='button' role='switch' aria-checked={simulateFailure} aria-label={copy.pipeline.simulateFailure} onClick={() => setSimulateFailure((current) => !current)} sx={(theme) => ({ inlineSize: 38, blockSize: 22, border: 0, borderRadius: 99, p: '2px', cursor: 'pointer', backgroundColor: simulateFailure ? 'primary.main' : 'action.disabledBackground', textAlign: simulateFailure ? 'right' : 'left', transition: theme.transitions.create('background-color', { duration: theme.transitions.duration.shorter }), '& > span': { display: 'block', inlineSize: 18, blockSize: 18, borderRadius: '50%', backgroundColor: 'common.white', boxShadow: theme.shadows[1] } })}><span /></Box>
            <Typography variant='caption' color='text.secondary'>{copy.pipeline.simulateFailure}</Typography>
          </Stack>
        </Stack>
        <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mt: 1.25 }}><i aria-hidden='true' className='tabler-keyboard mie-1' />Arrastra una tarjeta o usa el menú ⋮ para mover con teclado.</Typography>
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
          pb: 1.25,
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${LANES.length}, 264px)`, gap: 1.75, minInlineSize: 1654, alignItems: 'start' }}>
          {LANES.map((lane) => {
            const items = filtered.filter((item) => lane.stages.includes(item.application.stage))

            return (
              <Paper
                key={lane.id}
                data-capture={`hiring-lane-${lane.id}`}
                variant='outlined'
                sx={(theme) => ({
                  minWidth: 0,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                  backgroundColor: theme.palette.background.default,
                  overflow: 'hidden',
                  minBlockSize: 180,
                })}
              >
                <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1} sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                  <Stack direction='row' alignItems='center' spacing={0.875}>
                    <Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ letterSpacing: '.04em', textTransform: 'uppercase' }}>{copy.pipeline.stages[lane.titleStage]}</Typography>
                  </Stack>
                  <Box sx={(theme) => ({ minInlineSize: 22, blockSize: 20, px: 0.75, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 99, color: 'text.disabled', backgroundColor: 'background.paper', fontSize: 12, fontWeight: 700, fontFamily: theme.typography.fontFamily })}>{items.length}</Box>
                </Stack>
                <Divider />
                <Box sx={{ px: 1.25, pt: 0.5, pb: 1.5 }}>
                  <GreenhouseDragList
                    items={items.map((item) => ({ ...item, id: item.application.applicationId }))}
                    group={lane.destination ? 'hiring-pipeline' : undefined}
                    ariaLabel={`${copy.pipeline.stages[lane.titleStage]}: ${items.length}`}
                    onChange={(next) => handleLaneChange(lane, next)}
                    renderItem={(item) => card(item)}
                    emptyState={(
                      <Stack alignItems='center' justifyContent='center' spacing={0.75} sx={(theme) => ({ minBlockSize: 86, px: 1.5, textAlign: 'center', color: 'text.disabled', border: '1px dashed', borderColor: 'divider', borderRadius: `${theme.shape.customBorderRadius.md}px`, backgroundColor: 'action.hover' })}>
                        <i aria-hidden='true' className='tabler-inbox' style={{ fontSize: 20 }} />
                        <Typography variant='caption' color='inherit'>{copy.pipeline.emptyLane}</Typography>
                      </Stack>
                    )}
                    sx={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: 1.25, minBlockSize: 104 }}
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
        {LANES.filter((lane) => lane.destination).map((lane) => (
          <MenuItem
            key={lane.id}
            selected={menu ? laneForStage(menu.application.application.stage) === lane.id : false}
            onClick={() => {
              if (menu && lane.destination) void persistStage(menu.application, lane.destination)
              setMenu(null)
            }}
          >
            {copy.pipeline.stages[lane.titleStage]}
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
