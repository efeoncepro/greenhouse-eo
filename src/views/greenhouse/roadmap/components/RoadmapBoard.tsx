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
import { isCardDensityAtLeast, useContainerDensity } from '@/components/greenhouse/primitives'

import { HEALTH_VISUAL, KIND_VISUAL, LANE_VISUAL, metaIcon, toneAccent, toneSx } from '../cockpit-tokens'
import { PriorityTag, ToneTag } from './RoadmapTags'

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
}) => {
  const { ref: densityRef, density, containerType } = useContainerDensity('auto')
  const kindVisual = KIND_VISUAL[item.kind]
  const healthVisual = HEALTH_VISUAL[item.healthLevel]
  const isCondensed = isCardDensityAtLeast(density, 'condensed')
  const isPeek = isCardDensityAtLeast(density, 'peek')
  const primaryDomain = item.domains[0] ?? null
  const extraDomainCount = Math.max(0, item.domains.length - 1)
  const showDomain = Boolean(primaryDomain) && item.kind !== 'epic'

  return (
    <Box ref={densityRef} data-card-density={density} data-work-item-id={item.id} sx={{ containerType }}>
      <Box
        component='button'
        type='button'
        aria-pressed={selected}
        aria-label={GH_ROADMAP.card.openAria(item.id)}
        onClick={() => onSelect(item.id)}
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          width: '100%',
          minWidth: 0,
          textAlign: 'left',
          cursor: 'pointer',
          backgroundColor: selected ? 'primary.lightOpacity' : 'background.paper',
          border: '1px solid',
          borderColor: selected ? 'primary.main' : 'divider',
          borderLeft: `3px solid ${toneAccent(kindVisual.tone)}`,
          borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
          p: theme => `${theme.spacing(isCondensed ? 2.5 : 2.875)} ${theme.spacing(isCondensed ? 2.75 : 3.125)}`,
          boxShadow: selected ? theme => `0 0 0 2px ${theme.palette.primary.main}` : '0 1px 2px rgb(var(--mui-mainColorChannels-light) / 0.05)',
          transition: theme => theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'transform']),
          animation: `${cardEnter} ${MOTION_DURATION_MS.medium}ms ${cssCubicBezier(MOTION_EASE.emphasized.cubicBezier)} both`,
          animationDelay: `${Math.min(index, STAGGER_MAX_STEPS) * STAGGER_STEP_MS}ms`,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: selected ? 'primary.lightOpacity' : 'background.paper',
            boxShadow: '0 10px 24px rgb(var(--mui-mainColorChannels-light) / 0.10)',
            transform: 'translateY(-1px)',
            '& .gh-roadmap-card-action': { opacity: 1, transform: 'translateX(0)' }
          },
          '&:focus-visible': {
            outline: theme => `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
            '& .gh-roadmap-card-action': { opacity: 1, transform: 'translateX(0)' }
          },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            transform: 'none',
            '&:hover': { transform: 'none' }
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Box
            component='span'
            aria-hidden='true'
            sx={[
              toneSx(kindVisual.tone),
              {
                width: 22,
                height: 22,
                borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto'
              }
            ]}
          >
            <i className={kindVisual.icon} style={{ fontSize: 13, lineHeight: 0 }} />
          </Box>
          <Typography component='span' variant='monoId' sx={{ color: 'text.primary', minWidth: 0 }}>
            {item.id}
          </Typography>
          {!isCondensed ? <ToneTag tone={kindVisual.tone} label={kindVisual.label} /> : null}
          <Box sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 0.75, flex: '0 0 auto' }}>
            <PriorityTag priority={item.priority} radius='full' />
            <Box
              component='span'
              role='img'
              aria-label={healthVisual.label}
              title={healthVisual.label}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: `${healthVisual.tone}.main`,
                typography: 'caption',
                fontWeight: 600
              }}
            >
              <i className={healthVisual.icon} aria-hidden='true' style={{ fontSize: 14, lineHeight: 0 }} />
              {!isCondensed ? healthVisual.label : null}
            </Box>
          </Box>
        </Box>

        <Typography
          component='span'
          variant='body2'
          sx={{
            display: '-webkit-box',
            minHeight: isPeek ? 'auto' : '2.7em',
            overflow: 'hidden',
            color: 'text.primary',
            fontWeight: 600,
            lineHeight: 1.35,
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: isPeek ? 1 : 2
          }}
        >
          {item.title}
        </Typography>

        {!isPeek ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, pt: 0.25 }}>
            <Box
              component='span'
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0, color: 'text.secondary' }}
            >
              <i className={metaIcon(item.lane, item.kind)} aria-hidden='true' style={{ fontSize: 13, lineHeight: 0, flex: '0 0 auto' }} />
              <Typography component='span' variant='caption' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.meta}
              </Typography>
            </Box>
            {showDomain ? (
              <>
                <Typography component='span' variant='caption' sx={{ color: 'text.disabled', flex: '0 0 auto' }}>
                  ·
                </Typography>
                <Typography
                  component='span'
                  variant='caption'
                  sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                >
                  {primaryDomain}
                  {extraDomainCount > 0 ? ` ${GH_ROADMAP.card.extraDomains(extraDomainCount)}` : ''}
                </Typography>
              </>
            ) : null}
            <Typography
              component='span'
              variant='caption'
              className='gh-roadmap-card-action'
              sx={{
                ml: 'auto',
                display: { xs: 'none', md: 'inline-flex' },
                alignItems: 'center',
                gap: 0.25,
                color: selected ? 'primary.main' : 'text.secondary',
                fontWeight: 600,
                opacity: selected ? 1 : 0,
                transform: selected ? 'translateX(0)' : 'translateX(-4px)',
                transition: theme => theme.transitions.create(['opacity', 'transform', 'color'])
              }}
            >
              {GH_ROADMAP.card.open}
              <i className='tabler-arrow-right' aria-hidden='true' style={{ fontSize: 13, lineHeight: 0 }} />
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

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
        gap: 2.5,
        // El board scrollea horizontal (lanes) DENTRO de su contenedor; la altura
        // está acotada y cada lane scrollea vertical — la página no se hace
        // kilométrica con backlogs de cientos de items (kanban).
        overflowX: 'auto',
        overflowY: 'hidden',
        alignItems: 'stretch',
        maxHeight: { xs: '72vh', md: 'calc(100vh - 19rem)' },
        minHeight: 360,
        pb: 1,
        minWidth: 0,
        scrollbarWidth: 'thin'
      }}
    >
      {lanes.map(lane => {
        const visual = LANE_VISUAL[lane.id]

        return (
          <Box
            key={lane.id}
            role='listitem'
            sx={{ flex: '0 0 292px', width: 292, display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: '100%' }}
          >
            <Box
              sx={{
                flexShrink: 0,
                backgroundColor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 0.5,
                py: 0.5,
                mb: 1.25
              }}
            >
              <Box component='i' className={visual.icon} aria-hidden='true' sx={{ fontSize: 16, lineHeight: 0, color: visual.tone === 'neutral' ? 'text.disabled' : `${visual.tone}.main` }} />
              <Typography component='span' variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                {visual.title}
              </Typography>
              <Typography
                component='span'
                variant='caption'
                sx={{
                  ml: 'auto',
                  fontFeatureSettings: "'tnum' 1",
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
              </Typography>
            </Box>

            {/* Área de cards con scroll vertical interno (la lane no estira la página). */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.75,
                pr: 0.5,
                scrollbarWidth: 'thin'
              }}
            >
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
              <Typography
                component='span'
                variant='caption'
                sx={{
                  px: 1,
                  py: 1.5,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: 'text.secondary'
                }}
              >
                {GH_ROADMAP.laneMore(lane.totalCount - lane.items.length)}
              </Typography>
            ) : null}

            {lane.totalCount === 0 ? (
              <Typography
                component='span'
                variant='caption'
                sx={{
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                  p: 3.5,
                  textAlign: 'center',
                  color: 'text.disabled'
                }}
              >
                {GH_ROADMAP.laneEmpty}
              </Typography>
            ) : null}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export default RoadmapBoard
