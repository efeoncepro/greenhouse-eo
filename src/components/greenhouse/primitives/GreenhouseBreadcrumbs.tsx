'use client'

import type { CSSProperties, ReactNode } from 'react'

import NextLink from 'next/link'

import MuiBreadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'

import {
  GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG,
  resolveGreenhouseBreadcrumbsSeparator,
  resolveGreenhouseBreadcrumbsVariant,
  type GreenhouseBreadcrumbsKind,
  type GreenhouseBreadcrumbsSeparator,
  type GreenhouseBreadcrumbsVariant
} from './greenhouse-breadcrumbs-controller'

export interface GreenhouseBreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
  iconClassName?: string
  ariaLabel?: string
}

export interface GreenhouseBreadcrumbsProps {
  items: GreenhouseBreadcrumbItem[]
  variant?: GreenhouseBreadcrumbsVariant
  kind?: GreenhouseBreadcrumbsKind
  separator?: GreenhouseBreadcrumbsSeparator
  showIcons?: boolean
  ariaLabel?: string
  dataCapture?: string
  sx?: SxProps<Theme>
}

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
  separator === 'chevron' ? (
    <i aria-hidden='true' className='tabler-chevron-right' />
  ) : (
    <Typography aria-hidden='true' component='span' variant='body1'>
      /
    </Typography>
  )

const getItemSx = (isCurrent: boolean): SxProps<Theme> => theme => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  minInlineSize: 0,
  color: isCurrent ? theme.palette.text.primary : theme.palette.primary.main,
  textDecoration: 'none',
  borderRadius: `${theme.shape.customBorderRadius.xs}px`,
  outlineOffset: 2,
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
  }
})

const GreenhouseBreadcrumbs = ({
  ariaLabel,
  dataCapture,
  items,
  kind = 'custom',
  separator,
  showIcons = true,
  sx,
  variant
}: GreenhouseBreadcrumbsProps) => {
  const t = getMicrocopy()
  const resolvedVariant = resolveGreenhouseBreadcrumbsVariant({ kind, variant })
  const resolvedSeparator = resolveGreenhouseBreadcrumbsSeparator({ kind, separator })
  const config = GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG[resolvedVariant]

  if (items.length === 0) return null

  return (
    <MuiBreadcrumbs
      aria-label={ariaLabel ?? t.aria.breadcrumb}
      data-capture={dataCapture}
      data-kind={kind}
      data-separator={resolvedSeparator}
      data-variant={resolvedVariant}
      maxItems={config.maxItems}
      separator={separatorNode(resolvedSeparator)}
      sx={[
        theme => ({
          '& .MuiBreadcrumbs-ol': {
            alignItems: 'center',
            rowGap: 0.75
          },
          '& .MuiBreadcrumbs-separator': {
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

        const content = (
          <>
            {showIcons ? iconNode(item, config.iconSize) : null}
            <span>{item.label}</span>
          </>
        )

        if (isCurrent) {
          return (
            <Typography
              key={`${item.label}-${index}`}
              aria-current={index === items.length - 1 ? 'page' : undefined}
              component='span'
              variant={config.labelVariant}
              sx={getItemSx(true)}
            >
              {content}
            </Typography>
          )
        }

        return (
          <Link
            key={`${item.label}-${index}`}
            aria-label={item.ariaLabel}
            component={NextLink}
            href={href}
            variant={config.labelVariant}
            sx={getItemSx(false)}
          >
            {content}
          </Link>
        )
      })}
    </MuiBreadcrumbs>
  )
}

export default GreenhouseBreadcrumbs
