'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'

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
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import ViewTransitionLink from '@/components/greenhouse/motion/ViewTransitionLink'
import useViewTransitionRouter from '@/hooks/useViewTransitionRouter'
import type { HiringDeskCopy } from '@/lib/copy'
import type {
  HiringApplicationStage,
  HiringDeskApplicationSummary,
  HiringDeskOpeningSummary,
  HiringDeskSnapshot,
} from '@/types/hiring'

import HiringDeskFrame from './HiringDeskFrame'
import { hiringRequest } from './hiring-client'
import { buildHiringPipelineHref, hiringApplicationViewTransitionStyle } from './hiring-navigation'

type LaneId = 'inbox' | 'screening' | 'shortlist' | 'interview' | 'decision' | 'outcome'

type LaneDefinition = {
  id: LaneId
  /**
   * TASK-1754 — UNA etapa por carril: la que le da nombre Y la que se escribe al soltar.
   *
   * Antes eran tres campos —`titleStage`, `stages`, `destination`— y esa tercera coordenada
   * era el defecto, no un detalle de implementación: el carril «Evaluación» se titulaba desde
   * `shortlisted` y guardaba en `qualified`. Ambas se traducen a «Evaluación» en pantalla, así
   * que nadie lo vio durante seis semanas mientras quince políticas configuradas en
   * `shortlisted` no disparaban. Con un solo campo, el error deja de poder escribirse.
   */
  stage: HiringApplicationStage
  /**
   * Literales que este carril todavía AGRUPA sin poder escribirlos: filas históricas de etapas
   * que el dominio va a retirar. No es lo mismo que la etapa del carril y por eso tiene nombre
   * propio — mezclarlos en una sola lista fue lo que permitió que el destino fuera uno de ellos.
   *
   * Vacía cuando el contract (Slice F) retire los literales. Hasta entonces es obligatoria:
   * producción todavía escribe `qualified` al arrastrar a «Evaluación», y una etapa que ningún
   * carril agrupa manda la tarjeta a la primera columna en silencio.
   */
  absorbs?: readonly HiringApplicationStage[]
  tone: 'primary' | 'info' | 'secondary' | 'warning' | 'success' | 'default'
  icon: string
}

/** Todas las etapas que un carril muestra: la suya más las históricas que absorbe. */
export const stagesOfLane = (lane: LaneDefinition): readonly HiringApplicationStage[] => [lane.stage, ...(lane.absorbs ?? [])]

/**
 * TASK-1754 — exportado para que los invariantes del tablero se puedan fijar en una prueba.
 *
 * Cada carril declara UNA etapa: la que lo titula y la que se escribe al soltar una tarjeta.
 * La divergencia entre ambas era estructuralmente posible y produjo el incidente del
 * 2026-08-19 — la columna se titulaba desde `shortlisted` y guardaba en `qualified`, dos
 * literales que el diccionario traduce igual, así que en pantalla no se veía nada raro.
 * Ahora es un solo campo y esa clase de error dejó de existir.
 *
 * `absorbs` es otra cosa y por eso tiene otro nombre: literales que el carril MUESTRA porque
 * quedan filas históricas, sin poder escribirlos. Se vacía en el contract (Slice F), cuando
 * esos literales salgan del enum y del `CHECK`.
 */
export const LANES: LaneDefinition[] = [
  { id: 'inbox', stage: 'sourced', tone: 'primary', icon: 'tabler-sparkles' },
  { id: 'screening', stage: 'screening', tone: 'info', icon: 'tabler-scan' },
  // Slice F — `qualified` y `client_review` ya no se absorben porque ya no existen: el contract las
  // retiró del `CHECK` y ninguna fila puede volver a tenerlas. El `absorbs` desaparece con ellas.
  { id: 'shortlist', stage: 'shortlisted', tone: 'secondary', icon: 'tabler-list-check' },
  { id: 'interview', stage: 'interview', tone: 'warning', icon: 'tabler-messages' },
  { id: 'decision', stage: 'decision_pending', tone: 'primary', icon: 'tabler-gavel' },
  // Slice F — los cuatro espejos terminales y `handoff_ready` salieron del enum y del `CHECK`. El
  // carril queda con UNA etapa, que era la condición de retiro de `pipeline-lane-contract.test.ts`.
  { id: 'outcome', stage: 'closed', tone: 'success', icon: 'tabler-rosette-discount-check' },
]

const laneForStage = (stage: HiringApplicationStage) =>
  LANES.find((lane) => stagesOfLane(lane).includes(stage))?.id ?? 'inbox'

const formatOpeningTitle = ({ opening }: HiringDeskOpeningSummary) =>
  (opening.publicTitle ?? opening.internalTitle).trim().replace(/\s*\/\s*/g, ' · ')

const formatOpeningMeta = ({ demand, opening }: HiringDeskOpeningSummary) =>
  [opening.publicId, opening.publicArea ?? demand.businessUnit].filter(Boolean).join(' · ')

const formatAppliedAgo = (copy: HiringDeskCopy, days: number) =>
  copy.pipeline.appliedDaysAgo
    .replace('{days}', String(days))
    .replace('{unit}', days === 1 ? copy.pipeline.appliedDayUnit : copy.pipeline.appliedDaysUnit)

interface PipelineDeskViewProps {
  copy: HiringDeskCopy
  initialSnapshot: HiringDeskSnapshot
  initialOpeningId?: string
  initialFocusApplicationId?: string
  initialFocusUnavailable?: boolean
  simulateStageFailure?: boolean
}

const PipelineDeskView = ({
  copy,
  initialSnapshot,
  initialOpeningId,
  initialFocusApplicationId,
  initialFocusUnavailable = false,
  simulateStageFailure = false,
}: PipelineDeskViewProps) => {
  const router = useViewTransitionRouter()
  const [applications, setApplications] = useState(initialSnapshot.applications)
  const [openingId, setOpeningId] = useState(initialOpeningId ?? initialSnapshot.openings[0]?.opening.openingId ?? '')
  const [query, setQuery] = useState('')
  const simulateFailure = simulateStageFailure
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [lastMovedId, setLastMovedId] = useState<string | null>(null)
  const [returnedApplicationId, setReturnedApplicationId] = useState(initialFocusApplicationId ?? null)
  const [returnUnavailable, setReturnUnavailable] = useState(initialFocusUnavailable)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverLane, setDragOverLane] = useState<LaneId | null>(null)
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; application: HiringDeskApplicationSummary } | null>(null)
  const [boardEdges, setBoardEdges] = useState({ start: false, end: false })
  const liveRef = useRef<HTMLDivElement>(null)
  const movedTimerRef = useRef<number | null>(null)
  const returnTimerRef = useRef<number | null>(null)
  const returnFrameRef = useRef<number | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    if (movedTimerRef.current != null) window.clearTimeout(movedTimerRef.current)
    if (returnTimerRef.current != null) window.clearTimeout(returnTimerRef.current)
    if (returnFrameRef.current != null) window.cancelAnimationFrame(returnFrameRef.current)
  }, [])

  useEffect(() => {
    setOpeningId(initialOpeningId ?? initialSnapshot.openings[0]?.opening.openingId ?? '')
    setReturnedApplicationId(initialFocusApplicationId ?? null)
    setReturnUnavailable(initialFocusUnavailable)
  }, [initialFocusApplicationId, initialFocusUnavailable, initialOpeningId, initialSnapshot.openings])

  useEffect(() => {
    if (!initialFocusUnavailable) return

    window.history.replaceState(window.history.state, '', buildHiringPipelineHref(openingId || undefined))
  }, [initialFocusUnavailable, openingId])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-CL')

    return applications.filter((item) => {
      if (openingId && item.application.openingId !== openingId) return false
      if (!normalized) return true

      return [item.candidateName, item.openingTitle, item.application.publicId]
        .some((value) => value.toLocaleLowerCase('es-CL').includes(normalized))
    })
  }, [applications, openingId, query])

  const openingOptions = initialSnapshot.openings
  const selectedOpening = openingOptions.find(({ opening }) => opening.openingId === openingId)
  const applicantCountLabel = filtered.length === 1 ? copy.pipeline.applicantLabel : copy.pipeline.applicantsLabel
  const sparsePipeline = filtered.length > 0 && filtered.length < 3

  useEffect(() => {
    if (!returnedApplicationId) return

    returnFrameRef.current = window.requestAnimationFrame(() => {
      const card = Array.from(document.querySelectorAll<HTMLElement>('[data-application-id]'))
        .find(element => element.dataset.applicationId === returnedApplicationId)

      if (!card) {
        setReturnUnavailable(true)
        setReturnedApplicationId(null)
        window.history.replaceState(window.history.state, '', buildHiringPipelineHref(openingId || undefined))

        return
      }

      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      const target = card.querySelector<HTMLElement>('[data-capture="hiring-card-open"]')

      card.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
        inline: 'center',
      })
      target?.focus({ preventScroll: true })
      const returnedItem = filtered.find(item => item.application.applicationId === returnedApplicationId)

      if (returnedItem && liveRef.current) {
        liveRef.current.textContent = copy.pipeline.returnFocusedStatus
          .replace('{candidate}', returnedItem.candidateName)
          .replace('{stage}', copy.pipeline.stages[returnedItem.application.stage])
      }

      window.history.replaceState(window.history.state, '', buildHiringPipelineHref(openingId || undefined))

      returnTimerRef.current = window.setTimeout(() => {
        setReturnedApplicationId(current => current === returnedApplicationId ? null : current)
      }, 1400)
    })
  }, [copy.pipeline.returnFocusedStatus, copy.pipeline.stages, filtered, openingId, returnedApplicationId])

  const updateBoardEdges = useCallback(() => {
    const board = boardRef.current

    if (!board) return

    const maxScrollLeft = board.scrollWidth - board.clientWidth

    setBoardEdges({
      start: board.scrollLeft > 2,
      end: board.scrollLeft < maxScrollLeft - 2,
    })
  }, [])

  useEffect(() => {
    const board = boardRef.current

    if (!board) return

    updateBoardEdges()

    const resizeObserver = new ResizeObserver(updateBoardEdges)

    resizeObserver.observe(board)

    return () => resizeObserver.disconnect()
  }, [filtered.length, openingId, updateBoardEdges])

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
      setLastMovedId(item.application.applicationId)
      if (movedTimerRef.current != null) window.clearTimeout(movedTimerRef.current)
      movedTimerRef.current = window.setTimeout(() => setLastMovedId((current) => (
        current === item.application.applicationId ? null : current
      )), 640)
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

  const handleCardDragStart = (event: DragEvent<HTMLElement>, item: HiringDeskApplicationSummary) => {
    setDragId(item.application.applicationId)
    setMenu(null)

    try {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', item.application.applicationId)
    } catch {
      // Some browsers may reject dataTransfer writes in synthetic contexts.
    }
  }

  const handleLaneDragOver = (event: DragEvent<HTMLElement>, lane: LaneDefinition) => {
    event.preventDefault()
    if (dragOverLane !== lane.id) setDragOverLane(lane.id)

    try {
      event.dataTransfer.dropEffect = 'move'
    } catch {
      // noop
    }
  }

  const handleLaneDrop = (event: DragEvent<HTMLElement>, lane: LaneDefinition) => {
    event.preventDefault()

    const applicationId = event.dataTransfer.getData('text/plain') || dragId

    setDragId(null)
    setDragOverLane(null)

    if (!applicationId) return

    const item = applications.find((candidate) => candidate.application.applicationId === applicationId)

    if (item) void persistStage(item, lane.stage)
  }

  const card = (item: HiringDeskApplicationSummary) => {
    const saving = savingIds.has(item.application.applicationId)
    const moved = lastMovedId === item.application.applicationId
    const returned = returnedApplicationId === item.application.applicationId
    const assessment = item.application.explainability?.assessment
    const testTag = assessment ? (item.application.score != null ? copy.pipeline.tagDelivered : copy.pipeline.tagAssigned) : null
    const source = item.application.source === 'public_careers' ? copy.pipeline.sourcePublicCareers : item.application.source.replaceAll('_', ' ')
    const daysSinceApplied = Math.max(1, Math.round((Date.now() - new Date(item.application.createdAt).getTime()) / 86400000))
    const appliedLabel = formatAppliedAgo(copy, daysSinceApplied)

    return (
      <Paper
        data-capture='hiring-application-card'
        data-application-id={item.application.applicationId}
        style={hiringApplicationViewTransitionStyle(item.application.applicationId)}
        variant='outlined'
        draggable={!saving}
        onDragStart={(event) => handleCardDragStart(event, item)}
        onDragEnd={() => { setDragId(null); setDragOverLane(null) }}
        aria-busy={saving || undefined}
        sx={(theme) => ({
          position: 'relative',
          minWidth: 0,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          borderColor: moved || returned ? theme.palette.primary.main : theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          overflow: 'hidden',
          boxShadow: saving ? theme.shadows[8] : `0 10px 28px ${alpha(theme.palette.common.black, 0.055)}`,
          opacity: saving || dragId === item.application.applicationId ? 0.5 : 1,
          cursor: saving ? 'progress' : 'grab',
          animation: returned
            ? 'ghHiringReturnFocus 1400ms cubic-bezier(.2,0,0,1)'
            : moved
              ? 'ghHiringMoved 640ms cubic-bezier(.2,0,0,1)'
              : 'ghHiringCardIn 240ms cubic-bezier(.2,0,0,1)',
          transformOrigin: 'center top',
          transition: theme.transitions.create(['box-shadow', 'opacity', 'border-color', 'transform'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&::before': {
            content: '""',
            position: 'absolute',
            insetBlock: 0,
            insetInlineStart: 0,
            inlineSize: 3,
            background: `linear-gradient(180deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
            opacity: moved ? 1 : 0,
            transition: theme.transitions.create('opacity', { duration: theme.transitions.duration.shorter }),
          },
          '&:hover': {
            boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.09)}`,
            borderColor: theme.palette.primary.main,
            transform: 'translateY(-2px)',
          },
          '&:active': { cursor: 'grabbing' },
          '&:focus-within': {
            borderColor: theme.palette.primary.main,
          },
          color: 'inherit',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none', transform: 'none' },
        })}
      >
        <IconButton
          size='small'
          title={copy.pipeline.keyboardHint}
          aria-label={`${copy.pipeline.moveTo}: ${item.candidateName}`}
          aria-haspopup='menu'
          data-capture='hiring-card-stage-menu'
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setMenu({ anchor: event.currentTarget, application: item })
          }}
          sx={(theme) => ({
            position: 'absolute',
            insetBlockStart: 10,
            insetInlineEnd: 10,
            zIndex: 2,
            inlineSize: 26,
            blockSize: 26,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            color: 'text.secondary',
            transition: theme.transitions.create(['background-color', 'color'], { duration: theme.transitions.duration.shorter }),
            '&:hover': { backgroundColor: 'action.hover', color: 'text.primary' },
            '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
          })}
        >
          <i aria-hidden='true' className='tabler-dots-vertical' style={{ fontSize: 16 }} />
        </IconButton>

        <Box
          component={ViewTransitionLink}
          href={`/agency/hiring/applications/${item.application.applicationId}`}
          data-capture='hiring-card-open'
          aria-label={`${item.candidateName} · ${copy.common.openApplication}`}
          sx={(theme) => ({
            display: 'block',
            inlineSize: '100%',
            border: 0,
            m: 0,
            p: 1.75,
            color: 'inherit',
            textAlign: 'start',
            font: 'inherit',
            backgroundColor: 'transparent',
            cursor: saving ? 'progress' : 'pointer',
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: -2,
            },
          })}
        >
          <Stack spacing={1.25} sx={{ minWidth: 0, pe: 4 }}>
            <Stack direction='row' alignItems='flex-start' spacing={1.25}>
              <Avatar
                sx={(theme) => ({
                  inlineSize: 34,
                  blockSize: 34,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: 'primary.dark',
                  fontSize: 12,
                  fontWeight: 750,
                  flex: '0 0 auto',
                  boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.08)}`,
                })}
              >
                {item.candidateInitials}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant='body2'
                  color='text.primary'
                  fontWeight={650}
                  sx={{
                    display: '-webkit-box',
                    overflow: 'hidden',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    lineHeight: 1.28,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.candidateName}
                </Typography>
                <Stack direction='row' alignItems='center' spacing={0.5} sx={{ mt: 0.35, color: 'text.secondary' }}>
                  <i aria-hidden='true' className='tabler-world-www' style={{ fontSize: 12 }} />
                  <Typography variant='caption' color='inherit' noWrap>{source}</Typography>
                </Stack>
              </Box>
            </Stack>

            {testTag ? <Box sx={(theme) => ({ display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', gap: 0.5, px: 0.875, py: 0.25, borderRadius: `${theme.shape.customBorderRadius.md}px`, fontSize: 12, fontWeight: 650, color: testTag === copy.pipeline.tagDelivered ? 'info.dark' : 'warning.dark', backgroundColor: testTag === copy.pipeline.tagDelivered ? 'info.lightOpacity' : 'warning.lightOpacity' })}><i aria-hidden='true' className={testTag === copy.pipeline.tagDelivered ? 'tabler-flag-check' : 'tabler-flag'} style={{ fontSize: 12 }} />{testTag}</Box> : null}

            <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1} sx={{ minBlockSize: 16 }}>
              <Typography variant='caption' color='text.secondary'>{appliedLabel}</Typography>
              {saving ? (
                <Typography variant='caption' color='primary.dark' fontWeight={700} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <i aria-hidden='true' className='tabler-loader-2' style={{ fontSize: 12, animation: 'ghHiringSpinner 800ms linear infinite' }} />
                  {copy.pipeline.saving}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        </Box>
      </Paper>
    )
  }

  const openingScope = (
    <Stack
      spacing={0.75}
      data-capture='hiring-pipeline-opening-scope'
      sx={{
        inlineSize: { xs: '100%', md: 400, lg: 460 },
        minWidth: 0,
      }}
    >
      <Typography id='hiring-pipeline-opening-label' variant='caption' color='text.secondary' fontWeight={600}>
        {copy.pipeline.openingLabel}
      </Typography>
      <FormControl
        size='small'
        sx={{
          minWidth: 0,
          '& .MuiInputBase-root': { minBlockSize: 48 },
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            minBlockSize: 'unset',
            py: 1.25,
            whiteSpace: 'normal !important',
          },
        }}
      >
        <Select
          labelId='hiring-pipeline-opening-label'
          value={openingId}
          onChange={(event) => {
            const nextOpeningId = event.target.value

            router.replace(buildHiringPipelineHref(nextOpeningId), { scroll: false })
          }}
          renderValue={(value) => {
            if (!value) return copy.pipeline.allOpenings
            if (!selectedOpening) return value

            return (
              <Typography variant='body2' fontWeight={600} sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                {formatOpeningTitle(selectedOpening)}
              </Typography>
            )
          }}
          startAdornment={<i aria-hidden='true' className='tabler-briefcase mie-2 text-primary' />}
        >
          <MenuItem value=''>{copy.pipeline.allOpenings}</MenuItem>
          {openingOptions.map((summary) => (
            <MenuItem key={summary.opening.openingId} value={summary.opening.openingId} sx={{ py: 1.25 }}>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant='body2' sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                  {formatOpeningTitle(summary)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {formatOpeningMeta(summary)}
                </Typography>
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  )

  const pipelineMeta = (
    <Stack direction='row' alignItems='center' spacing={0.75}>
      <i aria-hidden='true' className='tabler-users' />
      <Typography variant='body2' color='text.secondary'>
        {filtered.length} {applicantCountLabel}
      </Typography>
    </Stack>
  )

  const content = (
    <Paper
      variant='outlined'
      data-capture='hiring-pipeline-workspace'
      data-ui-surface='contained'
      sx={theme => ({
        minWidth: 0,
        overflow: 'hidden',
        borderRadius: `${theme.shape.customBorderRadius.xl}px`,
        backgroundColor: 'background.paper',
        boxShadow: theme.greenhouseElevation.raised.boxShadow,
      })}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent='space-between'
        sx={{ p: { xs: 2.5, md: 3 } }}
      >
        <TextField
          size='small'
          sx={{ inlineSize: { xs: '100%', md: 320 }, flex: '0 0 auto' }}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.pipeline.searchPlaceholder}
          aria-label={copy.pipeline.searchPlaceholder}
          slotProps={{ input: { startAdornment: <InputAdornment position='start'><i aria-hidden='true' className='tabler-search' /></InputAdornment> } }}
        />
        <Stack direction='row' alignItems='center' spacing={1} sx={{ color: 'text.secondary', minWidth: 0 }}>
          <Box
            aria-hidden='true'
            sx={theme => ({
              inlineSize: 22,
              blockSize: 18,
              display: 'inline-grid',
              placeItems: 'center',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              color: 'text.secondary',
              backgroundColor: 'background.paper',
              flex: '0 0 auto',
            })}
          >
            <i className='tabler-keyboard' style={{ fontSize: 13 }} />
          </Box>
          <Typography variant='caption' color='inherit' sx={{ overflowWrap: 'anywhere' }}>{copy.pipeline.boardHint}</Typography>
        </Stack>
      </Stack>
      <Divider />

      <Box ref={liveRef} aria-live='polite' sx={{ position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }} />

      <Box sx={{ position: 'relative', minWidth: 0, p: { xs: 1.5, md: 2.5 }, backgroundColor: 'action.hover' }}>
        <Box
          ref={boardRef}
          data-capture='hiring-pipeline-board'
          role='region'
          aria-label={copy.pipeline.title}
          tabIndex={0}
          onScroll={updateBoardEdges}
          sx={(theme) => ({
            minWidth: 0,
            maxWidth: '100%',
            overflowX: 'auto',
            overscrollBehaviorInline: 'contain',
            pb: 1.25,
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.palette.action.disabled} transparent`,
            scrollSnapType: { xs: 'x proximity', md: 'none' },
            '&::-webkit-scrollbar': { blockSize: 10 },
            '&::-webkit-scrollbar-thumb': {
              border: '2px solid transparent',
              borderRadius: 99,
              backgroundClip: 'padding-box',
              backgroundColor: theme.palette.action.disabled,
            },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
            },
          })}
        >
        <Box sx={{ display: 'flex', gap: 1.75, minInlineSize: 'max-content', alignItems: 'flex-start', px: 0.125 }}>
          {LANES.map((lane, laneIndex) => {
            const items = filtered.filter((item) => stagesOfLane(lane).includes(item.application.stage))

            return (
              <Box
                key={lane.id}
                data-capture={`hiring-lane-${lane.id}`}
                sx={(theme) => ({
                  minWidth: 0,
                  inlineSize: 264,
                  flex: '0 0 264px',
                  border: '1px solid',
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                  background: dragOverLane === lane.id
                    ? `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.main, 0.035)})`
                    : alpha(theme.palette.background.paper, 0.64),
                  borderColor: dragOverLane === lane.id ? theme.palette.primary.main : theme.palette.divider,
                  overflow: 'hidden',
                  minBlockSize: sparsePipeline ? 204 : 180,
                  scrollSnapAlign: 'start',
                  animation: 'ghHiringLaneIn 260ms cubic-bezier(.2,0,0,1) both',
                  animationDelay: `${laneIndex * 36}ms`,
                  transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], { duration: theme.transitions.duration.shorter }),
                  ...(dragOverLane === lane.id ? { boxShadow: `0 0 0 1px ${theme.palette.primary.main}`, animation: 'ghHiringDropPulse 520ms cubic-bezier(.2,0,0,1)' } : null),
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none' },
                })}
                onDragOver={(event) => handleLaneDragOver(event, lane)}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverLane(null)
                }}
                onDrop={(event) => handleLaneDrop(event, lane)}
              >
                <Stack
                  direction='row'
                  alignItems='center'
                  justifyContent='space-between'
                  spacing={1}
                  sx={(theme) => ({
                    px: 1.5,
                    pt: 1.35,
                    pb: 1,
                    background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)}, ${alpha(theme.palette.background.paper, 0.72)})`,
                  })}
                >
                  <Stack direction='row' alignItems='center' spacing={0.875}>
                    <Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ letterSpacing: '.04em', textTransform: 'uppercase' }}>{copy.pipeline.stages[lane.stage]}</Typography>
                  </Stack>
                  <Typography
                    variant='caption'
                    sx={(theme) => ({
                      minInlineSize: 22,
                      blockSize: 20,
                      px: 0.75,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: `${theme.shape.customBorderRadius.xl}px`,
                      color: 'text.secondary',
                      backgroundColor: 'background.paper',
                      fontWeight: 700,
                    })}
                  >
                    {items.length}
                  </Typography>
                </Stack>
                <Divider sx={{ opacity: 0.85 }} />
                <Box sx={{ px: 1.25, pt: 1, pb: 1.5 }}>
                  <Stack
                    role='list'
                    aria-label={`${copy.pipeline.stages[lane.stage]}: ${items.length}`}
                    spacing={1.25}
                    sx={{ minBlockSize: sparsePipeline ? 128 : 104 }}
                  >
                    {items.map((item) => (
                      <Box key={item.application.applicationId} role='listitem'>
                        {card(item)}
                      </Box>
                    ))}
                    {items.length === 0 ? (
                      <Stack role='listitem' alignItems='center' justifyContent='center' spacing={0.75} sx={(theme) => ({ minBlockSize: sparsePipeline ? 104 : 86, px: 1.5, textAlign: 'center', color: 'text.secondary', border: '1px dashed', borderColor: dragOverLane === lane.id ? 'primary.main' : 'divider', borderRadius: `${theme.shape.customBorderRadius.md}px`, backgroundColor: dragOverLane === lane.id ? 'primary.lightOpacity' : alpha(theme.palette.background.paper, 0.52), transition: theme.transitions.create(['background-color', 'border-color', 'transform'], { duration: theme.transitions.duration.shorter }), ...(dragOverLane === lane.id ? { transform: 'translateY(-1px)' } : null) })}>
                        <i aria-hidden='true' className='tabler-inbox' style={{ fontSize: 20 }} />
                        <Typography variant='caption' color='inherit'>{copy.pipeline.emptyLane}</Typography>
                      </Stack>
                    ) : null}
                  </Stack>
                </Box>
              </Box>
            )
          })}
        </Box>
        </Box>
        {boardEdges.start ? (
          <Box aria-hidden='true' sx={theme => ({ position: 'absolute', insetBlock: 0, insetInlineStart: 0, inlineSize: 26, pointerEvents: 'none', background: `linear-gradient(90deg, ${theme.palette.action.hover}, transparent)` })} />
        ) : null}
        {boardEdges.end ? (
          <Box aria-hidden='true' sx={theme => ({ position: 'absolute', insetBlock: 0, insetInlineEnd: 0, inlineSize: 88, pointerEvents: 'none', background: `linear-gradient(270deg, ${theme.palette.action.hover} 12%, ${alpha(theme.palette.background.paper, 0.72)}, transparent)` })} />
        ) : null}
      </Box>

      {filtered.length === 0 ? <Box sx={{ p: { xs: 2, md: 2.5 }, pt: 0 }}><Alert severity='info'>{copy.common.noResults}</Alert></Box> : null}
    </Paper>
  )

  return (
    <>
      <HiringDeskFrame
        surface='pipeline'
        copy={copy}
        primary={(
          <Stack spacing={2}>
            {returnUnavailable ? (
              <Alert
                severity='info'
                data-capture='hiring-pipeline-return-unavailable'
                onClose={() => setReturnUnavailable(false)}
              >
                <Typography fontWeight={700}>{copy.pipeline.returnUnavailableTitle}</Typography>
                <Typography variant='body2'>{copy.pipeline.returnUnavailableBody}</Typography>
              </Alert>
            ) : null}
            {content}
          </Stack>
        )}
        secondaryActions={openingScope}
        meta={pipelineMeta}
      />

      <Menu
        anchorEl={menu?.anchor}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        MenuListProps={{ 'aria-label': copy.pipeline.moveTo }}
        slotProps={{
          paper: {
            sx: (theme) => ({
              minInlineSize: 186,
              p: 0.75,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              boxShadow: theme.shadows[8],
              animation: 'ghHiringPop 160ms cubic-bezier(.2,0,0,1)',
              transformOrigin: 'top right',
            }),
          },
        }}
      >
        <MenuItem disabled><Typography variant='caption' color='text.secondary'>{copy.pipeline.moveTo}</Typography></MenuItem>
        {LANES.map((lane) => (
          <MenuItem
            key={lane.id}
            selected={menu ? laneForStage(menu.application.application.stage) === lane.id : false}
            onClick={() => {
              if (menu) void persistStage(menu.application, lane.stage)
              setMenu(null)
            }}
          >
            {copy.pipeline.stages[lane.stage]}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem component={ViewTransitionLink} href={menu ? `/agency/hiring/applications/${menu.application.application.applicationId}` : '/agency/hiring/pipeline'}>
          <i aria-hidden='true' className='tabler-user-search mie-2' /> {copy.common.openApplication}
        </MenuItem>
      </Menu>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ '& .MuiPaper-root': { animation: 'ghHiringToast 240ms cubic-bezier(.2,0,0,1)' } }}
      >
        <Alert severity={toast?.severity ?? 'success'} variant='filled' onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </>
  )
}

export default PipelineDeskView
