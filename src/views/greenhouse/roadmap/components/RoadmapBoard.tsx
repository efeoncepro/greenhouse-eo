'use client'

/**
 * TASK-1153 — Tablero del backlog: 7 lanes con scroll horizontal INTERNO (la
 * página nunca desborda) + cards diferenciadas por kind. Lectura, no edición.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/system'

import { GH_ROADMAP } from '@/lib/copy/roadmap'
import type { RoadmapLaneId, RoadmapWorkItemVM } from '@/lib/roadmap/cockpit/types'
import { MOTION_DURATION_MS, MOTION_EASE, cssCubicBezier } from '@/components/greenhouse/motion/core/tokens'

import { KIND_VISUAL, LANE_VISUAL, metaIcon, toneAccent } from '../cockpit-tokens'
import { HealthIcon, KindTag, PriorityTag } from './RoadmapTags'

export interface RoadmapLane {
  id: RoadmapLaneId
  /** Cards visibles (recortadas a un máximo). */
  items: RoadmapWorkItemVM[]
  /** Total real de la lane (puede ser mayor que `items.length`). */
  totalCount: number
}

const cardEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`

/** Step de stagger entre cards (no es una duración de animación). */
const STAGGER_STEP_MS = 32
const STAGGER_MAX_STEPS = 12

const RoadmapCard = ({
  item,
  selected,
  onSelect,
  index
}: {
  item: RoadmapWorkItemVM
  selected: boolean
  onSelect: (id: string) => void
  index: number
}) => (
  <Box
    component='button'
    type='button'
    aria-pressed={selected}
    onClick={() => onSelect(item.id)}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: selected ? 'primary.main' : 'divider',
      borderLeft: `3px solid ${toneAccent(KIND_VISUAL[item.kind].tone)}`,
      borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
      p: theme => `${theme.spacing(3.25)} ${theme.spacing(3.5)}`,
      boxShadow: selected ? theme => `0 0 0 2px ${theme.palette.primary.main}` : 'none',
      transition: theme => theme.transitions.create(['box-shadow', 'border-color']),
      animation: `${cardEnter} ${MOTION_DURATION_MS.medium}ms ${cssCubicBezier(MOTION_EASE.emphasized.cubicBezier)} both`,
      animationDelay: `${Math.min(index, STAGGER_MAX_STEPS) * STAGGER_STEP_MS}ms`,
      '&:hover': { borderColor: 'primary.main' },
      '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <KindTag kind={item.kind} />
      <Box sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
        <PriorityTag priority={item.priority} />
        <HealthIcon health={item.healthLevel} />
      </Box>
    </Box>
    <Typography component='span' variant='body2' sx={{ fontWeight: 600, lineHeight: 1.35, color: 'text.primary' }}>
      {item.title}
    </Typography>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontSize: '0.75rem',
        color: 'text.secondary',
        minWidth: 0
      }}
    >
      <Box component='span' sx={{ fontWeight: 600, fontFeatureSettings: "'tnum' 1", color: 'text.primary' }}>
        {item.id}
      </Box>
      <Box component='span' sx={{ color: 'text.disabled' }}>
        ·
      </Box>
      <Box
        component='span'
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, overflow: 'hidden', minWidth: 0 }}
      >
        <i className={metaIcon(item.lane, item.kind)} aria-hidden='true' style={{ fontSize: 13, lineHeight: 0, flex: '0 0 auto' }} />
        <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.meta}
        </Box>
      </Box>
    </Box>
  </Box>
)

const RoadmapBoard = ({
  lanes,
  selectedId,
  onSelect
}: {
  lanes: RoadmapLane[]
  selectedId: string | null
  onSelect: (id: string) => void
}) => {
  let cardIndex = 0

  return (
    <Box
      data-capture='roadmap-board'
      role='list'
      aria-label={GH_ROADMAP.boardAria}
      sx={{
        display: 'flex',
        gap: 3.5,
        overflowX: 'auto',
        pb: 3,
        alignItems: 'flex-start',
        minWidth: 0,
        // Scroll-container accesible (la página no desborda; el board sí scrollea).
        scrollbarWidth: 'thin'
      }}
    >
      {lanes.map(lane => {
        const visual = LANE_VISUAL[lane.id]

        return (
          <Box
            key={lane.id}
            role='listitem'
            sx={{ flex: '0 0 286px', width: 286, display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 0.5,
                py: 0.5
              }}
            >
              <Box component='i' className={visual.icon} aria-hidden='true' sx={{ fontSize: 16, lineHeight: 0, color: visual.tone === 'neutral' ? 'text.disabled' : `${visual.tone}.main` }} />
              <Box component='span' sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>
                {visual.title}
              </Box>
              <Box
                component='span'
                sx={{
                  ml: 'auto',
                  fontFeatureSettings: "'tnum' 1",
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 20,
                  height: 20,
                  px: 0.75,
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'action.hover',
                  color: 'text.secondary'
                }}
              >
                {lane.totalCount}
              </Box>
            </Box>

            {lane.items.map(item => (
              <RoadmapCard
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onSelect={onSelect}
                index={cardIndex++}
              />
            ))}

            {lane.totalCount > lane.items.length ? (
              <Box
                sx={{
                  px: 1,
                  py: 1.5,
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary'
                }}
              >
                {GH_ROADMAP.laneMore(lane.totalCount - lane.items.length)}
              </Box>
            ) : null}

            {lane.totalCount === 0 ? (
              <Box
                sx={{
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                  p: 3.5,
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: 'text.disabled'
                }}
              >
                {GH_ROADMAP.laneEmpty}
              </Box>
            ) : null}
          </Box>
        )
      })}
    </Box>
  )
}

export default RoadmapBoard
