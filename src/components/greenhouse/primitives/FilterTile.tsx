'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

/**
 * FilterTile — KPI clickable que actúa como filtro segmentado.
 *
 * Reemplaza el patrón "KPI card arriba + Tabs MUI abajo" con un solo
 * elemento que comunica el conteo + permite seleccionar el filtro.
 *
 * Microinteractions canónicas (motion-design-greenhouse-overlay):
 * - whileTap scale 0.97 con spring (tactile feedback)
 * - whileHover y -1 (lift sutil)
 * - active border bar 3px con `layoutId` que se desliza entre tiles cuando
 *   cambia el filtro (consume Framer Motion shared layout)
 * - AnimatedCounter en el valor cuando `animateCounter` está habilitado
 * - hover bg-tint + box-shadow inset 1px del tono
 * - focus-visible con outline 2px del tono
 *
 * A11y:
 * - role='tab' + aria-selected + aria-controls
 * - keyboard: Enter/Space activa la selección
 * - prefers-reduced-motion: skip whileTap / whileHover / layout transition
 *
 * Composición canónica en consumers:
 * ```
 * <Box role='tablist'>
 *   <FilterTile {...kpi1} isActive={filter === 'all'} onSelect={...} />
 *   <FilterTile {...kpi2} isActive={filter === 'attention'} onSelect={...} />
 * </Box>
 * ```
 */
export interface FilterTileProps {
  /** Visual tone — drives bg-tint, hover-tint, border-bar, focus-ring */
  tone: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'

  /** Tabler icon class — e.g. 'tabler-alert-triangle'. Decorative (aria-hidden) */
  icon: string

  /** Title shown above description. fontWeight 700 when active, 600 when inactive */
  title: string

  /** Optional description below title. Line-clamp 2 (no truncation with ellipsis) */
  description?: string

  /** Numeric value rendered tabular-nums on the right side */
  value: number

  /** Whether to use AnimatedCounter (Framer Motion spring) for the value */
  animateCounter?: boolean

  /** Active state — applies tone bg-tint + slide-in border bar */
  isActive: boolean

  /** Click / keyboard activate handler */
  onSelect: () => void

  /** Optional aria-controls target id for the panel this tile filters */
  ariaControls?: string

  /** Shared layoutId for the active border bar — must match across siblings.
   * Default: 'filter-tile-active-bar'. Provide unique id when multiple tile
   * groups coexist on the same page. */
  activeBarLayoutId?: string

  /** Optional position-based borders (used inside a grid container) */
  borders?: {
    top?: string | false
    left?: string | false
  }

  /** Custom right slot if value should be replaced (e.g. icon + count combo) */
  rightSlot?: ReactNode
}

const FilterTile = ({
  tone,
  icon,
  title,
  description,
  value,
  animateCounter = true,
  isActive,
  onSelect,
  ariaControls,
  activeBarLayoutId = 'filter-tile-active-bar',
  borders,
  rightSlot
}: FilterTileProps) => {
  const theme = useTheme()
  const prefersReducedMotion = useReducedMotion()

  return (
    <Box
      component={motion.div}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.97, transition: { type: 'spring', stiffness: 700, damping: 24 } }}
      whileHover={prefersReducedMotion ? undefined : { y: -1 }}
      role='tab'
      tabIndex={0}
      aria-selected={isActive}
      aria-controls={ariaControls}
      aria-label={`${title}: ${value}`}
      onClick={onSelect}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      sx={{
        p: 3,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 150ms cubic-bezier(0.2, 0, 0, 1), box-shadow 150ms cubic-bezier(0.2, 0, 0, 1)',
        borderTop: borders?.top || undefined,
        borderLeft: borders?.left || undefined,
        backgroundColor: isActive
          ? alpha(theme.palette[tone].main, 0.12)
          : 'background.paper',
        '&:hover': {
          backgroundColor: isActive
            ? alpha(theme.palette[tone].main, 0.16)
            : alpha(theme.palette[tone].main, 0.06),
          boxShadow: !isActive ? `inset 0 0 0 1px ${alpha(theme.palette[tone].main, 0.18)}` : 'none'
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette[tone].main}`,
          outlineOffset: -2
        }
      }}
    >
      {isActive && (
        <Box
          component={motion.div}
          layoutId={activeBarLayoutId}
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '3px',
            backgroundColor: theme.palette[tone].main,
            pointerEvents: 'none',
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2
          }}
        />
      )}
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={3}>
        <Stack direction='row' alignItems='center' spacing={2} sx={{ minWidth: 0 }}>
          <Box
            aria-hidden='true'
            sx={{
              width: 36,
              height: 36,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              display: { xs: 'none', md: 'grid' },
              placeItems: 'center',
              color: `${tone}.main`,
              backgroundColor: alpha(theme.palette[tone].main, 0.1),
              flexShrink: 0
            }}
          >
            <i className={icon} />
          </Box>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant='subtitle2' color='text.primary' noWrap sx={{ fontWeight: isActive ? 700 : 600 }}>
              {title}
            </Typography>
            {description ? (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.35
                }}
              >
                {description}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
        {rightSlot ?? (
          <Typography
            variant='h5'
            component='div'
            sx={{
              fontVariantNumeric: 'tabular-nums',
              color: isActive ? `${tone}.main` : 'text.primary',
              fontWeight: 700,
              minWidth: '2ch',
              textAlign: 'right'
            }}
          >
            {animateCounter ? <AnimatedCounter value={value} format='integer' duration={0.6} /> : value}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

export default FilterTile
