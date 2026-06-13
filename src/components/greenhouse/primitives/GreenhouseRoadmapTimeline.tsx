'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import { buildStatusMap } from '@/lib/copy'
import { typographyScale } from '@/components/theme/typography-tokens'

export type GreenhouseRoadmapTimelineStatus = 'complete' | 'active' | 'pending' | 'blocked'
export type GreenhouseRoadmapTimelineStatusAlias = 'done' | 'in-progress' | 'upcoming'
export type GreenhouseRoadmapTimelineVariant = 'horizontal' | 'stacked' | 'compact'
export type GreenhouseRoadmapTimelineKind =
  | 'productRoadmap'
  | 'releasePlan'
  | 'implementationPlan'
  | 'clientOnboarding'
  | 'custom'

export type GreenhouseRoadmapTimelineItem = {
  id: string
  period: ReactNode
  title: ReactNode
  description?: ReactNode
  status?: GreenhouseRoadmapTimelineStatus | GreenhouseRoadmapTimelineStatusAlias
  meta?: ReactNode
}

export type GreenhouseRoadmapTimelineProps = {
  items: GreenhouseRoadmapTimelineItem[]
  title?: ReactNode
  description?: ReactNode
  variant?: GreenhouseRoadmapTimelineVariant
  kind?: GreenhouseRoadmapTimelineKind
  ariaLabel?: string
  dataCapture?: string
}

type StatusMeta = {
  label: string
}

const STATUS_ALIAS: Record<GreenhouseRoadmapTimelineStatusAlias, GreenhouseRoadmapTimelineStatus> = {
  done: 'complete',
  'in-progress': 'active',
  upcoming: 'pending'
}

const KIND_VARIANT: Record<GreenhouseRoadmapTimelineKind, GreenhouseRoadmapTimelineVariant> = {
  productRoadmap: 'horizontal',
  releasePlan: 'horizontal',
  implementationPlan: 'stacked',
  clientOnboarding: 'stacked',
  custom: 'horizontal'
}

const STATUS_META: Record<GreenhouseRoadmapTimelineStatus, StatusMeta> = buildStatusMap({
  complete: {
    copyKey: 'completed'
  },
  active: {
    copyKey: 'inProgress'
  },
  pending: {
    copyKey: 'upcoming'
  },
  blocked: {
    copyKey: 'blocked'
  }
})

const ROADMAP_TIMELINE_TOKENS = {
  motion: {
    duration: 0.4,
    delayStep: 0.15,
    easing: [0.2, 0, 0, 1]
  },
  dot: {
    size: 16,
    inner: 6
  },
  opacity: {
    border: 0.12,
    rail: 0.14,
    surface: 0.98,
    shadow: 0.1,
    hoverShadow: 0.12,
    mutedDot: 0.1,
    mutedBadge: 0.06
  }
} as const

export const normalizeGreenhouseRoadmapTimelineStatus = (
  status: GreenhouseRoadmapTimelineItem['status'] = 'pending'
): GreenhouseRoadmapTimelineStatus =>
  status === 'done' || status === 'in-progress' || status === 'upcoming' ? STATUS_ALIAS[status] : status

export const resolveGreenhouseRoadmapTimelineVariant = ({
  kind = 'productRoadmap',
  variant
}: {
  kind?: GreenhouseRoadmapTimelineKind
  variant?: GreenhouseRoadmapTimelineVariant
}): GreenhouseRoadmapTimelineVariant => variant ?? KIND_VARIANT[kind]

const getStatusMain = (theme: Theme, status: GreenhouseRoadmapTimelineStatus) => {
  if (status === 'complete' || status === 'active') return theme.palette.primary.main
  if (status === 'blocked') return theme.palette.warning.main

  return theme.palette.text.secondary
}

const shouldEmphasizeStatus = (status: GreenhouseRoadmapTimelineStatus) =>
  status === 'complete' || status === 'active'

const TimelineDot = ({ status }: { status: GreenhouseRoadmapTimelineStatus }) => {
  return (
    <Box
      aria-hidden='true'
      data-roadmap-dot='true'
      sx={theme => {
        const main = getStatusMain(theme, status)
        const emphasized = shouldEmphasizeStatus(status)

        return {
          width: ROADMAP_TIMELINE_TOKENS.dot.size,
          height: ROADMAP_TIMELINE_TOKENS.dot.size,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          backgroundColor: emphasized ? main : alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.mutedDot),
          transition: theme.transitions.create(['background-color', 'transform'], {
            duration: theme.transitions.duration.shortest
          }),
          '&::after': {
            content: '""',
            width: ROADMAP_TIMELINE_TOKENS.dot.inner,
            height: ROADMAP_TIMELINE_TOKENS.dot.inner,
            borderRadius: '50%',
            backgroundColor: theme.palette.background.paper
          }
        }
      }}
    />
  )
}

const RoadmapBadge = ({ children, status }: { children: ReactNode; status: GreenhouseRoadmapTimelineStatus }) => {
  const emphasized = shouldEmphasizeStatus(status)

  return (
    <Box
      component='span'
      sx={theme => {
        const main = getStatusMain(theme, status)

        return {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100%',
          minHeight: 24,
          px: 2.5,
          py: 0.5,
          borderRadius: '999px',
          border: `1px solid ${emphasized ? 'transparent' : alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.border)}`,
          color: emphasized ? theme.palette.primary.contrastText : theme.palette.text.primary,
          backgroundColor: emphasized
            ? main
            : alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.mutedBadge),
          ...typographyScale.labelSm,
          lineHeight: 1.2,
          whiteSpace: 'nowrap'
        }
      }}
    >
      {children}
    </Box>
  )
}

const ScreenReaderOnly = ({ children }: { children: ReactNode }) => (
  <Box
    component='span'
    sx={{
      position: 'absolute',
      width: 1,
      height: 1,
      p: 0,
      m: -1,
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      whiteSpace: 'nowrap',
      border: 0
    }}
  >
    {children}
  </Box>
)

const getListItemAriaLabel = (item: GreenhouseRoadmapTimelineItem, statusLabel: string) => {
  const parts = [item.period, item.title, statusLabel].filter(part => typeof part === 'string')

  return parts.length > 0 ? parts.join(' · ') : undefined
}

const getHorizontalItemTextAlign = (isHorizontal: boolean) => (isHorizontal ? { xs: 'left', md: 'center' } : 'left')

const getHorizontalItemAlign = (isHorizontal: boolean) => (isHorizontal ? { xs: 'flex-start', md: 'center' } : 'flex-start')

const getHorizontalItemDirection = (isHorizontal: boolean) => (isHorizontal ? { xs: 'row', md: 'column' } : 'row')

const getHorizontalItemPaddingTop = (isHorizontal: boolean, isCompact: boolean) =>
  isCompact ? 1 : isHorizontal ? { xs: 0, md: 5.5 } : 0

const getRoadmapItemGap = (isHorizontal: boolean, isCompact: boolean) => {
  if (isCompact) return 1.5

  return isHorizontal ? { xs: 1.5, md: 0 } : 2
}

const getMobileConnectorSx = (theme: Theme, isHorizontal: boolean, isLast: boolean) =>
  isHorizontal
    ? {
        display: { xs: isLast ? 'none' : 'block', md: 'none' },
        position: 'absolute',
        top: 21,
        bottom: -18,
        left: ROADMAP_TIMELINE_TOKENS.dot.size / 2,
        width: '1px',
        backgroundColor: alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.rail)
      }
    : {}

const getStackedConnectorSx = (theme: Theme, isHorizontal: boolean, isLast: boolean) =>
  !isHorizontal
    ? {
        display: isLast ? 'none' : 'block',
        position: 'absolute',
        top: ROADMAP_TIMELINE_TOKENS.dot.size + 6,
        bottom: -18,
        left: ROADMAP_TIMELINE_TOKENS.dot.size / 2,
        width: '1px',
        backgroundColor: alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.rail)
      }
    : {}

const TimelineConnector = ({
  isHorizontal,
  isLast
}: {
  isHorizontal: boolean
  isLast: boolean
}) => (
  <Box
    aria-hidden='true'
    sx={theme => ({
      ...getMobileConnectorSx(theme, isHorizontal, isLast),
      ...getStackedConnectorSx(theme, isHorizontal, isLast)
    })}
  />
)

const DotAnchor = ({
  isHorizontal,
  isLast,
  status
}: {
  isHorizontal: boolean
  isLast: boolean
  status: GreenhouseRoadmapTimelineStatus
}) => (
  <Box
    sx={{
      position: isHorizontal ? { xs: 'relative', md: 'absolute' } : 'relative',
      top: isHorizontal ? { md: 0 } : undefined,
      left: isHorizontal ? { md: '50%' } : undefined,
      transform: isHorizontal ? { md: 'translateX(-50%)' } : undefined,
      display: 'flex',
      justifyContent: getHorizontalItemAlign(isHorizontal),
      flexShrink: 0,
      width: ROADMAP_TIMELINE_TOKENS.dot.size
    }}
  >
    <TimelineConnector isHorizontal={isHorizontal} isLast={isLast} />
    <TimelineDot status={status} />
  </Box>
)

const RoadmapItem = ({
  index,
  isCompact,
  isHorizontal,
  isLast,
  item
}: {
  index: number
  isCompact: boolean
  isHorizontal: boolean
  isLast: boolean
  item: GreenhouseRoadmapTimelineItem
}) => {
  const reduced = useReducedMotion()
  const status = normalizeGreenhouseRoadmapTimelineStatus(item.status)
  const meta = STATUS_META[status]
  const ariaLabel = getListItemAriaLabel(item, meta.label)

  return (
    <Box
      component={motion.li}
      aria-label={ariaLabel}
      aria-current={status === 'active' ? 'step' : undefined}
      data-state={status}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{
        duration: ROADMAP_TIMELINE_TOKENS.motion.duration,
        delay: reduced ? 0 : index * ROADMAP_TIMELINE_TOKENS.motion.delayStep,
        ease: ROADMAP_TIMELINE_TOKENS.motion.easing
      }}
      sx={theme => {
        return {
          position: 'relative',
          minWidth: 0,
          display: 'flex',
          flexDirection: getHorizontalItemDirection(isHorizontal),
          alignItems: getHorizontalItemAlign(isHorizontal),
          gap: getRoadmapItemGap(isHorizontal, isCompact),
          pt: getHorizontalItemPaddingTop(isHorizontal, isCompact),
          px: isCompact ? 0 : { xs: 0, md: 1 },
          textAlign: getHorizontalItemTextAlign(isHorizontal),
          transition: reduced
            ? 'none'
            : theme.transitions.create(['transform'], {
                duration: theme.transitions.duration.shortest
              }),
          '&:hover': {
            '& [data-roadmap-dot="true"]': {
              transform: reduced ? 'none' : 'scale(1.16)'
            }
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none'
          }
        }
      }}
    >
      <DotAnchor isHorizontal={isHorizontal} isLast={isLast} status={status} />
      <Stack
        spacing={isCompact ? 0.5 : 0.75}
        sx={{
          minWidth: 0,
          alignItems: getHorizontalItemAlign(isHorizontal),
          textAlign: getHorizontalItemTextAlign(isHorizontal),
          mt: 0
        }}
      >
        <RoadmapBadge status={status}>{item.period}</RoadmapBadge>
        <Stack spacing={0.5} sx={{ minWidth: 0, alignItems: getHorizontalItemAlign(isHorizontal) }}>
          <Typography variant='body2' sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            {item.title}
          </Typography>
          <ScreenReaderOnly>{meta.label}</ScreenReaderOnly>
          {!isCompact && item.description ? (
            <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 220, overflowWrap: 'anywhere' }}>
              {item.description}
            </Typography>
          ) : null}
          {item.meta ? (
            <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
              {item.meta}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  )
}

const GreenhouseRoadmapTimeline = ({
  ariaLabel,
  dataCapture,
  description,
  items,
  kind = 'productRoadmap',
  title,
  variant
}: GreenhouseRoadmapTimelineProps) => {
  const resolvedVariant = resolveGreenhouseRoadmapTimelineVariant({ kind, variant })
  const isCompact = resolvedVariant === 'compact'
  const isHorizontal = resolvedVariant === 'horizontal'
  const regionLabel = ariaLabel ?? (typeof title === 'string' ? title : 'Roadmap timeline')

  return (
    <Stack
      component='section'
      role='region'
      aria-label={regionLabel}
      spacing={isCompact ? 1.5 : 2.5}
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      sx={theme => ({
        width: '100%',
        maxWidth: isHorizontal ? 896 : undefined,
        mx: isHorizontal ? 'auto' : undefined,
        p: isCompact ? 2 : 3,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        border: `1px solid ${alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.border)}`,
        backgroundColor: alpha(theme.palette.background.paper, ROADMAP_TIMELINE_TOKENS.opacity.surface),
        boxShadow:
          theme.palette.mode === 'dark'
            ? 'none'
            : `0 18px 42px ${alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.shadow)}`,
        transition: theme.transitions.create(['box-shadow'], { duration: theme.transitions.duration.short }),
        '&:hover': {
          boxShadow:
            theme.palette.mode === 'dark'
              ? 'none'
              : `0 12px 34px ${alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.hoverShadow)}`
        }
      })}
    >
      {title || description ? (
        <Stack spacing={0.75}>
          {title ? (
            <Typography variant={isCompact ? 'h6' : 'h5'} sx={{ overflowWrap: 'anywhere' }}>
              {title}
            </Typography>
          ) : null}
          {description ? (
            <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
              {description}
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      <Box
        sx={{
          position: 'relative',
          minWidth: 0
        }}
      >
        {isHorizontal ? (
          <Box
            aria-hidden='true'
            sx={theme => ({
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: 16,
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: alpha(theme.palette.text.primary, ROADMAP_TIMELINE_TOKENS.opacity.rail)
            })}
          />
        ) : null}
        <Box
          component='ol'
          sx={{
            position: 'relative',
            zIndex: 1,
            listStyle: 'none',
            p: 0,
            m: 0,
            display: 'grid',
            gridTemplateColumns:
              isHorizontal && !isCompact ? { xs: '1fr', md: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` } : '1fr',
            gap: isCompact ? 1 : { xs: 2, md: isHorizontal ? 1 : 2 }
          }}
        >
          {items.map((item, index) => (
            <RoadmapItem
              key={item.id}
              index={index}
              isCompact={isCompact}
              isHorizontal={isHorizontal}
              isLast={index === items.length - 1}
              item={item}
            />
          ))}
        </Box>
      </Box>
    </Stack>
  )
}

export default GreenhouseRoadmapTimeline
