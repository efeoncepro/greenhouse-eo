'use client'

import type { CSSProperties, ReactNode } from 'react'

import NextLink from 'next/link'

import MuiBreadcrumbs from '@mui/material/Breadcrumbs'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import useReducedMotion from '@/hooks/useReducedMotion'
import { getMicrocopy } from '@/lib/copy'
import { motion } from '@/libs/FramerMotion'
import { MOTION_DURATION_S, MOTION_EASE } from '@/components/greenhouse/motion/core/tokens'

import GreenhouseFloatingSurface, { type GreenhouseFloatingSurfaceAnchorProps } from './GreenhouseFloatingSurface'
import {
  GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG,
  resolveGreenhouseBreadcrumbsSeparator,
  resolveGreenhouseBreadcrumbsVariant,
  type GreenhouseBreadcrumbsHitArea,
  type GreenhouseBreadcrumbsKind,
  type GreenhouseBreadcrumbsMotion,
  type GreenhouseBreadcrumbsSeparator,
  type GreenhouseBreadcrumbsVariant
} from './greenhouse-breadcrumbs-controller'

export interface GreenhouseBreadcrumbOverflowItem {
  label: string
  href?: string
  icon?: ReactNode
  iconClassName?: string
  ariaLabel?: string
}

export interface GreenhouseBreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
  iconClassName?: string
  ariaLabel?: string
  labelVisuallyHidden?: boolean
  overflowItems?: GreenhouseBreadcrumbOverflowItem[]
}

export interface GreenhouseBreadcrumbsProps {
  items: GreenhouseBreadcrumbItem[]
  variant?: GreenhouseBreadcrumbsVariant
  kind?: GreenhouseBreadcrumbsKind
  separator?: GreenhouseBreadcrumbsSeparator
  motion?: GreenhouseBreadcrumbsMotion
  hitArea?: GreenhouseBreadcrumbsHitArea
  showIcons?: boolean
  ariaLabel?: string
  dataCapture?: string
  sx?: SxProps<Theme>
}

const BREADCRUMB_SUBTLE_EASE = [...MOTION_EASE.emphasized.cubicBezier] as [number, number, number, number]

const getBreadcrumbItemKey = (item: GreenhouseBreadcrumbItem, index: number) =>
  item.href ? `${item.label}-${item.href}` : `${item.label}-${index}`

const iconNode = (item: GreenhouseBreadcrumbItem, iconSize: number) => {
  const icon = item.icon ?? (item.iconClassName ? <i aria-hidden='true' className={item.iconClassName} /> : undefined)

  if (!icon) return null

  return (
    <span
      aria-hidden='true'
      className='GreenhouseBreadcrumbs-icon'
      style={{
        '--gh-breadcrumb-icon-size': `${iconSize}px`
      } as CSSProperties}
    >
      {icon}
    </span>
  )
}

const separatorNode = (separator: GreenhouseBreadcrumbsSeparator) =>
  separator === 'chevrons' ? (
    <i aria-hidden='true' className='tabler-chevrons-right' />
  ) : separator === 'chevron' ? (
    <i aria-hidden='true' className='tabler-chevron-right' />
  ) : (
    <Typography aria-hidden='true' component='span' variant='body1'>
      /
    </Typography>
  )

const getItemSx = (isCurrent: boolean, hitArea: GreenhouseBreadcrumbsHitArea): SxProps<Theme> => theme => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  minInlineSize: 0,
  maxInlineSize: '100%',
  minBlockSize: hitArea === 'comfortable' ? 40 : undefined,
  px: hitArea === 'comfortable' ? 1.5 : undefined,
  py: hitArea === 'comfortable' ? 1 : undefined,
  color: isCurrent ? theme.palette.text.primary : theme.palette.primary.main,
  textDecoration: 'none',
  borderRadius: `${hitArea === 'comfortable'
    ? (theme.shape.customBorderRadius?.md ?? theme.shape.borderRadius)
    : (theme.shape.customBorderRadius?.xs ?? theme.shape.customBorderRadius?.sm ?? theme.shape.borderRadius)
  }px`,
  fontWeight: hitArea === 'comfortable' ? 500 : undefined,
  outlineOffset: 2,
  touchAction: hitArea === 'comfortable' ? 'manipulation' : undefined,
  whiteSpace: 'normal',
  transition: theme.transitions.create(['color', 'text-decoration-color'], {
    duration: theme.transitions.duration.shortest
  }),

  '&:hover': {
    color: isCurrent ? theme.palette.text.primary : theme.palette.primary.dark,
    textDecoration: isCurrent ? 'none' : 'underline'
  },

  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`
  },

  '& .GreenhouseBreadcrumbs-icon': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    inlineSize: 'var(--gh-breadcrumb-icon-size)',
    blockSize: 'var(--gh-breadcrumb-icon-size)',
    color: 'currentColor'
  },

  '& .GreenhouseBreadcrumbs-icon > i': {
    fontSize: 'var(--gh-breadcrumb-icon-size)'
  },

  '& .GreenhouseBreadcrumbs-label': {
    minInlineSize: 0,
    overflowWrap: 'anywhere'
  }
})

const getOverflowTriggerSx = (hitArea: GreenhouseBreadcrumbsHitArea): SxProps<Theme> => theme => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
  minInlineSize: hitArea === 'comfortable' ? 40 : 28,
  minBlockSize: hitArea === 'comfortable' ? 40 : 28,
  p: 0,
  border: 0,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  color: theme.palette.primary.main,
  backgroundColor: 'transparent',
  cursor: 'pointer',
  outlineOffset: 2,
  touchAction: hitArea === 'comfortable' ? 'manipulation' : undefined,
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.shortest
  }),

  '&:hover, &[data-state="open"]': {
    color: theme.palette.primary.dark,
    backgroundColor: theme.palette.action.hover
  },

  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`
  },

  '& i': {
    fontSize: hitArea === 'comfortable' ? 22 : 20
  }
})

const overflowMenuListSx: SxProps<Theme> = theme => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
  m: 0,
  p: 0,
  listStyle: 'none',

  '& [role="menuitem"]': {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    minBlockSize: 36,
    px: 1,
    py: 0.75,
    border: 0,
    borderRadius: `${theme.shape.customBorderRadius.sm}px`,
    color: theme.palette.text.primary,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'start',
    textDecoration: 'none',
    outlineOffset: 2,
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: theme.transitions.duration.shortest
    })
  },

  '& [role="menuitem"]:hover, & [role="menuitem"]:focus-visible': {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
    textDecoration: 'none'
  },

  '& [role="menuitem"]:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`
  },

  '& .GreenhouseBreadcrumbs-overflowIcon': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    inlineSize: 18,
    blockSize: 18,
    color: 'currentColor'
  },

  '& .GreenhouseBreadcrumbs-overflowIcon > i': {
    fontSize: 18
  }
})

const overflowIconNode = (item: GreenhouseBreadcrumbOverflowItem) => {
  const icon = item.icon ?? (item.iconClassName ? <i aria-hidden='true' className={item.iconClassName} /> : undefined)

  if (!icon) return null

  return (
    <span aria-hidden='true' className='GreenhouseBreadcrumbs-overflowIcon'>
      {icon}
    </span>
  )
}

const GreenhouseBreadcrumbOverflowMenu = ({
  hitArea,
  item
}: {
  hitArea: GreenhouseBreadcrumbsHitArea
  item: GreenhouseBreadcrumbItem
}) => {
  const overflowItems = item.overflowItems ?? []

  if (overflowItems.length === 0) return null

  return (
    <GreenhouseFloatingSurface
      variant='actionMenu'
      placement='bottom-start'
      width={280}
      ariaLabel={item.ariaLabel ?? item.label}
      dataCapture='breadcrumbs-overflow-menu'
      anchor={(anchorProps: GreenhouseFloatingSurfaceAnchorProps) => (
        <Box
          component='button'
          type='button'
          aria-label={item.ariaLabel ?? item.label}
          data-breadcrumb-overflow-trigger='true'
          {...anchorProps}
          sx={getOverflowTriggerSx(hitArea)}
        >
          <i aria-hidden='true' className={item.iconClassName ?? 'tabler-dots'} />
        </Box>
      )}
      content={({ close }) => (
        <Box component='ul' sx={overflowMenuListSx}>
          {overflowItems.map(overflowItem => {
            const content = (
              <>
                {overflowIconNode(overflowItem)}
                <Typography component='span' variant='body2' sx={{ minInlineSize: 0, overflowWrap: 'anywhere' }}>
                  {overflowItem.label}
                </Typography>
              </>
            )

            return (
              <Box component='li' key={overflowItem.href ?? overflowItem.label}>
                {overflowItem.href ? (
                  <Link
                    aria-label={overflowItem.ariaLabel}
                    component={NextLink}
                    href={overflowItem.href}
                    role='menuitem'
                    underline='none'
                    onClick={close}
                  >
                    {content}
                  </Link>
                ) : (
                  <Box
                    component='button'
                    type='button'
                    aria-label={overflowItem.ariaLabel}
                    role='menuitem'
                    onClick={close}
                  >
                    {content}
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
      )}
    />
  )
}

const GreenhouseBreadcrumbs = ({
  ariaLabel,
  dataCapture,
  hitArea = 'standard',
  items,
  kind = 'custom',
  motion: motionMode = 'none',
  separator,
  showIcons = true,
  sx,
  variant
}: GreenhouseBreadcrumbsProps) => {
  const t = getMicrocopy()
  const prefersReducedMotion = useReducedMotion()
  const resolvedVariant = resolveGreenhouseBreadcrumbsVariant({ kind, variant })
  const resolvedSeparator = resolveGreenhouseBreadcrumbsSeparator({ kind, separator })
  const config = GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG[resolvedVariant]
  const enableSubtleMotion = motionMode === 'subtle' && !prefersReducedMotion

  if (items.length === 0) return null

  return (
    <MuiBreadcrumbs
      aria-label={ariaLabel ?? t.aria.breadcrumb}
      data-capture={dataCapture}
      data-hit-area={hitArea}
      data-kind={kind}
      data-motion={motionMode}
      data-separator={resolvedSeparator}
      data-variant={resolvedVariant}
      maxItems={config.maxItems}
      separator={separatorNode(resolvedSeparator)}
      sx={[
        theme => ({
          maxInlineSize: '100%',
          overflowX: 'clip',
          '& .MuiBreadcrumbs-ol': {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            minInlineSize: 0,
            maxInlineSize: '100%',
            rowGap: 0.75
          },
          '& .MuiBreadcrumbs-li': {
            minInlineSize: 0,
            maxInlineSize: '100%'
          },
          '& .MuiBreadcrumbs-separator': {
            flex: '0 0 auto',
            mx: resolvedVariant === 'compact' ? 0.5 : 1,
            color: theme.palette.text.secondary,

            '& i': {
              fontSize: config.iconSize,
              opacity: theme.palette.mode === 'dark' ? 0.74 : 0.62
            }
          }
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      {items.map((item, index) => {
        const href = item.href
        const isCurrent = index === items.length - 1 || !href
        const isOverflowMenu = Boolean(item.overflowItems?.length)

        const content = (
          <>
            {showIcons ? iconNode(item, config.iconSize) : null}
            <Box
              component='span'
              className='GreenhouseBreadcrumbs-label'
              data-label-visually-hidden={item.labelVisuallyHidden ? 'true' : undefined}
              sx={item.labelVisuallyHidden ? visuallyHidden : undefined}
            >
              {item.label}
            </Box>
          </>
        )

        const node = isOverflowMenu ? (
          <GreenhouseBreadcrumbOverflowMenu item={item} hitArea={hitArea} />
        ) : isCurrent ? (
          <Typography
            aria-current={index === items.length - 1 ? 'page' : undefined}
            component='span'
            variant={config.labelVariant}
            sx={getItemSx(true, hitArea)}
          >
            {content}
          </Typography>
        ) : (
          <Link
            aria-label={item.ariaLabel}
            component={NextLink}
            href={href}
            variant={config.labelVariant}
            sx={getItemSx(false, hitArea)}
          >
            {content}
          </Link>
        )

        return (
          <motion.span
            key={getBreadcrumbItemKey(item, index)}
            data-breadcrumb-motion-item={enableSubtleMotion ? 'true' : undefined}
            initial={enableSubtleMotion ? { opacity: 0, x: -6 } : false}
            animate={enableSubtleMotion ? { opacity: 1, x: 0 } : undefined}
            layout={enableSubtleMotion ? 'position' : false}
            transition={{
              duration: enableSubtleMotion ? MOTION_DURATION_S.short : 0,
              ease: BREADCRUMB_SUBTLE_EASE
            }}
            style={{ display: 'inline-flex', minInlineSize: 0, maxInlineSize: '100%' }}
          >
            {node}
          </motion.span>
        )
      })}
    </MuiBreadcrumbs>
  )
}

export default GreenhouseBreadcrumbs
