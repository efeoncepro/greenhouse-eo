'use client'

import type { ReactElement } from 'react'

import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip'
import type { SxProps, Theme } from '@mui/material/styles'

import { motionCss } from '@/components/greenhouse/motion/core/tokens'
import { typographyScale } from '@/components/theme/typography-tokens'

export type GreenhouseChipVariant = 'solid' | 'label' | 'outlined' | 'spotlight' | 'signal'
export type GreenhouseChipTone = 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
export type GreenhouseChipSize = 'medium' | 'small'
export type GreenhouseChipKind =
  | 'status'
  | 'attribute'
  | 'input'
  | 'action'
  | 'identity'
  | 'filter'
  | 'metric'
  | 'custom'

export interface GreenhouseChipProps
  extends Omit<ChipProps, 'avatar' | 'color' | 'deleteIcon' | 'icon' | 'size' | 'variant'> {
  variant?: GreenhouseChipVariant
  tone?: GreenhouseChipTone
  size?: GreenhouseChipSize
  kind?: GreenhouseChipKind
  avatarSrc?: string
  avatarAlt?: string
  avatarInitials?: string
  avatarNode?: ReactElement
  iconClassName?: string
  closable?: boolean
  closeLabel?: string
  dataCapture?: string
}

const semanticTones = ['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const

const isSemanticTone = (tone: GreenhouseChipTone): tone is Exclude<GreenhouseChipTone, 'default'> =>
  semanticTones.includes(tone as Exclude<GreenhouseChipTone, 'default'>)

// TASK-1053 Fase B: the four feedback roles that carry curated tonal sub-values
// in `theme.greenhouseSemantic` (info/success/warning/error). primary/secondary
// keep the legacy opacity wash (no curated ink — and they are brand, not feedback).
const feedbackTones = ['info', 'success', 'warning', 'error'] as const

const isFeedbackTone = (tone: GreenhouseChipTone): tone is (typeof feedbackTones)[number] =>
  (feedbackTones as readonly string[]).includes(tone)

const toneMain = (tone: Exclude<GreenhouseChipTone, 'default'>) => `var(--mui-palette-${tone}-main)`
const toneContrast = (tone: Exclude<GreenhouseChipTone, 'default'>) => `var(--mui-palette-${tone}-contrastText)`
const toneSoft = (tone: Exclude<GreenhouseChipTone, 'default'>) => `var(--mui-palette-${tone}-lightOpacity)`

// Animated chip motion is ambient status, not a notification burst.
const CHIP_SPOTLIGHT_DURATION = `calc(${motionCss.duration.extended} * 6.5)`
const CHIP_SPOTLIGHT_DELAY = `calc(${motionCss.duration.extended} * 1.5)`
const CHIP_SIGNAL_DURATION = `calc(${motionCss.duration.extended} * 4.75)`

const GREENHOUSE_CHIP_SIZE_TOKENS = {
  medium: {
    blockSize: 32,
    avatarSize: '20px',
    deleteSize: '18px',
    iconSize: '15px',
    labelTypography: typographyScale.labelMd
  },
  small: {
    blockSize: 24,
    avatarSize: '16px',
    deleteSize: '16px',
    iconSize: '13px',
    labelTypography: typographyScale.labelSm
  }
} as const satisfies Record<
  GreenhouseChipSize,
  {
    blockSize: number
    avatarSize: string
    deleteSize: string
    iconSize: string
    labelTypography: typeof typographyScale.labelMd | typeof typographyScale.labelSm
  }
>

const getChipSurface = (variant: GreenhouseChipVariant, tone: GreenhouseChipTone) => {
  if (variant === 'spotlight') {
    return getChipSurface('label', tone)
  }

  if (variant === 'signal') {
    if (tone === 'default') {
      return {
        backgroundColor: 'var(--mui-palette-background-paper)',
        borderColor: 'var(--mui-palette-divider)',
        color: 'var(--mui-palette-text-primary)'
      }
    }

    return {
      backgroundColor: 'var(--mui-palette-background-paper)',
      borderColor: toneSoft(tone),
      color: toneMain(tone)
    }
  }

  if (tone === 'default') {
    if (variant === 'outlined') {
      return {
        backgroundColor: 'var(--mui-palette-background-paper)',
        borderColor: 'var(--mui-palette-divider)',
        color: 'var(--mui-palette-text-primary)'
      }
    }

    return {
      backgroundColor: variant === 'solid' ? 'var(--mui-palette-action-selected)' : 'var(--mui-palette-action-hover)',
      borderColor: 'transparent',
      color: 'var(--mui-palette-text-primary)'
    }
  }

  if (variant === 'solid') {
    return {
      backgroundColor: toneMain(tone),
      borderColor: toneMain(tone),
      color: toneContrast(tone)
    }
  }

  if (variant === 'label') {
    return {
      backgroundColor: toneSoft(tone),
      borderColor: 'transparent',
      color: toneMain(tone)
    }
  }

  return {
    backgroundColor: 'var(--mui-palette-background-paper)',
    borderColor: toneMain(tone),
    color: toneMain(tone)
  }
}

const getHoverSurface = (variant: GreenhouseChipVariant, tone: GreenhouseChipTone) => {
  if (variant === 'spotlight') {
    return getHoverSurface('label', tone)
  }

  if (variant === 'signal') {
    if (tone === 'default') {
      return {
        backgroundColor: 'var(--mui-palette-action-hover)',
        color: 'var(--mui-palette-text-primary)'
      }
    }

    return {
      backgroundColor: toneSoft(tone),
      color: toneMain(tone)
    }
  }

  if (tone === 'default') {
    return {
      backgroundColor: variant === 'outlined' ? 'var(--mui-palette-action-hover)' : 'var(--mui-palette-action-focus)',
      color: 'var(--mui-palette-text-primary)'
    }
  }

  if (variant === 'solid') {
    return {
      backgroundColor: `rgb(var(--mui-palette-${tone}-darkChannel) / 0.96)`,
      color: toneContrast(tone)
    }
  }

  return {
    backgroundColor: toneMain(tone),
    color: toneContrast(tone)
  }
}

const getChipSx = (
  variant: GreenhouseChipVariant,
  tone: GreenhouseChipTone,
  size: GreenhouseChipSize
): SxProps<Theme> => {
  const surface = getChipSurface(variant, tone)
  const hoverSurface = getHoverSurface(variant, tone)
  const isSmall = size === 'small'
  const isSpotlight = variant === 'spotlight'
  const isSignal = variant === 'signal'
  const sizeTokens = GREENHOUSE_CHIP_SIZE_TOKENS[size]
  const { labelTypography } = sizeTokens
  // TASK-1053 Fase B: tonal (label) feedback chips consume the curated tonal
  // triple (tint surface + AA ink text + soft border) from `theme.greenhouseSemantic`
  // instead of the opacity wash + `main`-as-text — which fails AA for warning
  // (amber #ffb703 as text is unreadable). Resolved inside the theme callback so it
  // is mode-correct (theme rebuilds per currentMode).
  const tonalFeedback = (variant === 'label' || variant === 'spotlight') && isFeedbackTone(tone)

  return theme => {
    const sem = tonalFeedback ? theme.greenhouseSemantic[tone] : null

    const resolvedSurface = sem
      ? { backgroundColor: sem.tonalSurface, borderColor: sem.tonalBorder, color: sem.tonalText }
      : surface

    const resolvedHover = sem
      ? {
          backgroundColor: `color-mix(in oklch, ${sem.tonalSurface}, ${sem.tonalText} 10%)`,
          color: sem.tonalText
        }
      : hoverSurface

    return {
      ...labelTypography,
      '--gh-chip-avatar-size': sizeTokens.avatarSize,
      '--gh-chip-delete-size': sizeTokens.deleteSize,
      '--gh-chip-icon-size': sizeTokens.iconSize,
      blockSize: sizeTokens.blockSize,
      minInlineSize: 0,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: isSpotlight || isSignal ? '999px' : 1,
      border: '1px solid',
      borderColor: resolvedSurface.borderColor,
      backgroundColor: resolvedSurface.backgroundColor,
      color: resolvedSurface.color,
      transform: 'translateY(0)',
      transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'color', 'transform'], {
        duration: theme.transitions.duration.shortest
      }),

      '& .MuiChip-label': {
        px: isSmall ? 2.5 : 3,
        py: 0,
        display: 'inline-flex',
        position: 'relative',
        zIndex: 1,
        minInlineSize: 0,
        alignItems: 'center',
        lineHeight: labelTypography.lineHeight,
        whiteSpace: 'nowrap'
      },

      '& .MuiChip-avatar, & .MuiChip-icon': {
        inlineSize: 'var(--gh-chip-avatar-size)',
        blockSize: 'var(--gh-chip-avatar-size)',
        position: 'relative',
        zIndex: 1,
        marginInlineStart: isSmall ? theme.spacing(1) : theme.spacing(1.5),
        marginInlineEnd: isSmall ? theme.spacing(-1.5) : theme.spacing(-2),
        color: 'currentColor',
        fontSize: 'var(--gh-chip-icon-size)'
      },

      '& .MuiChip-deleteIcon': {
        inlineSize: 'var(--gh-chip-delete-size)',
        blockSize: 'var(--gh-chip-delete-size)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginInlineStart: theme.spacing(-2),
        marginInlineEnd: isSmall ? theme.spacing(1) : theme.spacing(1.5),
        color:
          isSemanticTone(tone) && variant !== 'solid'
            ? `rgb(var(--mui-palette-${tone}-mainChannel) / 0.7)`
            : 'currentColor',
        opacity: variant === 'solid' ? 0.82 : 1,
        transform: 'scale(1)',
        transition: theme.transitions.create(['color', 'opacity', 'transform'], {
          duration: theme.transitions.duration.shortest
        }),

        '&:hover': {
          color: 'currentColor',
          opacity: 1,
          transform: 'scale(1.08)'
        }
      },

      ...(isSpotlight
        ? {
            '&::before': {
              content: '""',
              position: 'absolute',
              insetBlock: 0,
              insetInlineStart: '-46%',
              inlineSize: '44%',
              blockSize: '100%',
              borderRadius: 'inherit',
              pointerEvents: 'none',
              background:
                'radial-gradient(ellipse 60% 90% at 50% 50%, color-mix(in srgb, currentColor 24%, transparent) 0%, color-mix(in srgb, currentColor 12%, transparent) 42%, transparent 74%)',
              opacity: 0,
              transform: 'translate3d(0, 0, 0) skewX(-16deg) scaleX(0.7)',
              willChange: 'transform, opacity',
              animationName: 'gh-chip-spotlight-glint',
              animationDuration: CHIP_SPOTLIGHT_DURATION,
              animationDelay: CHIP_SPOTLIGHT_DELAY,
              animationIterationCount: 'infinite',
              animationTimingFunction: motionCss.ease.emphasized
            },

            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 1,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg, color-mix(in srgb, currentColor 10%, transparent) 0%, transparent 48%)',
              opacity: 0.12,
              animationName: 'gh-chip-spotlight-surface',
              animationDuration: CHIP_SPOTLIGHT_DURATION,
              animationDelay: CHIP_SPOTLIGHT_DELAY,
              animationIterationCount: 'infinite',
              animationTimingFunction: motionCss.ease.standard
            },

            '@keyframes gh-chip-spotlight-glint': {
              '0%, 44%': { opacity: 0, transform: 'translate3d(0, 0, 0) skewX(-16deg) scaleX(0.7)' },
              '56%': { opacity: 0.58, transform: 'translate3d(145%, 0, 0) skewX(-16deg) scaleX(0.92)' },
              '72%': { opacity: 0.2, transform: 'translate3d(330%, 0, 0) skewX(-16deg) scaleX(1.04)' },
              '100%': { opacity: 0, transform: 'translate3d(330%, 0, 0) skewX(-16deg) scaleX(0.88)' }
            },

            '@keyframes gh-chip-spotlight-surface': {
              '0%, 42%, 100%': { opacity: 0.1 },
              '60%': { opacity: 0.22 },
              '78%': { opacity: 0.14 }
            }
          }
        : null),

      ...(isSignal
        ? {
            '& .gh-chip-signal-dot': {
              inlineSize: isSmall ? 6 : 7,
              blockSize: isSmall ? 6 : 7,
              borderRadius: '50%',
              position: 'relative',
              zIndex: 1,
              flexShrink: 0,
              backgroundColor: tone === 'default' ? 'var(--mui-palette-text-secondary)' : toneMain(tone),
              backgroundImage:
                tone === 'default'
                  ? 'radial-gradient(circle at 35% 30%, var(--mui-palette-background-paper) 0%, transparent 38%)'
                  : `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${toneContrast(tone)} 78%, transparent) 0%, transparent 40%)`,
              boxShadow:
                tone === 'default'
                  ? '0 0 0 3px var(--mui-palette-action-hover)'
                  : `0 0 0 3px var(--mui-palette-${tone}-lightOpacity)`,
              animationName: 'gh-chip-signal-dot-breathe',
              animationDuration: CHIP_SIGNAL_DURATION,
              animationIterationCount: 'infinite',
              animationTimingFunction: motionCss.ease.standard
            },

            '& .gh-chip-signal-dot::after': {
              content: '""',
              position: 'absolute',
              inset: -4,
              borderRadius: 'inherit',
              border: '1px solid currentColor',
              opacity: 0.2,
              transform: 'scale(0.8)',
              animationName: 'gh-chip-signal-ring',
              animationDuration: CHIP_SIGNAL_DURATION,
              animationIterationCount: 'infinite',
              animationTimingFunction: motionCss.ease.standard
            },

            '@keyframes gh-chip-signal-dot-breathe': {
              '0%, 100%': { opacity: 0.78, transform: 'scale(0.96)' },
              '46%': { opacity: 1, transform: 'scale(1.04)' },
              '64%': { opacity: 0.9, transform: 'scale(1)' }
            },

            '@keyframes gh-chip-signal-ring': {
              '0%, 36%': { opacity: 0, transform: 'scale(0.88)' },
              '56%': { opacity: 0.2, transform: 'scale(1.12)' },
              '82%, 100%': { opacity: 0, transform: 'scale(1.65)' }
            }
          }
        : null),

      '&.MuiChip-clickable': {
        cursor: 'pointer'
      },

      '&.MuiChip-clickable:hover, &:has(.MuiChip-deleteIcon):hover': {
        ...resolvedHover,
        borderColor:
          variant === 'outlined' && tone !== 'default'
            ? toneMain(tone)
            : sem
              ? sem.tonalBorder
              : resolvedHover.backgroundColor,
        boxShadow: '0 8px 18px rgb(var(--mui-mainColorChannels-light) / 0.10)',
        transform: 'translateY(-1px)'
      },

      '&.MuiChip-clickable:active': {
        boxShadow: 'none',
        transform: 'translateY(0)'
      },

      '&.Mui-focusVisible': {
        boxShadow: `0 0 0 3px ${
          tone === 'default' ? 'var(--mui-palette-action-focus)' : `var(--mui-palette-${tone}-lightOpacity)`
        }`
      },

      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        transform: 'none',

        '& .MuiChip-deleteIcon': {
          transition: 'none',
          transform: 'none'
        },

        '&::before, & .gh-chip-signal-dot, & .gh-chip-signal-dot::after': {
          animation: 'none',
          transform: 'none'
        },

        '&.MuiChip-clickable:hover, &:has(.MuiChip-deleteIcon):hover, &.MuiChip-clickable:active': {
          transform: 'none'
        }
      },

      '&.Mui-disabled': {
        opacity: 0.45
      }
    }
  }
}

const buildAvatar = ({
  avatarAlt,
  avatarInitials,
  avatarNode,
  avatarSrc
}: Pick<GreenhouseChipProps, 'avatarAlt' | 'avatarInitials' | 'avatarNode' | 'avatarSrc'>) => {
  if (avatarNode) return avatarNode
  if (!avatarSrc && !avatarInitials) return undefined

  return (
    <Avatar alt={avatarAlt ?? avatarInitials ?? ''} src={avatarSrc}>
      {avatarInitials}
    </Avatar>
  )
}

const GreenhouseChip = ({
  avatarAlt,
  avatarInitials,
  avatarNode,
  avatarSrc,
  closable = false,
  closeLabel = 'Quitar chip',
  dataCapture,
  disabled,
  iconClassName,
  kind = 'attribute',
  onDelete,
  size = 'medium',
  sx,
  tone = 'default',
  variant = 'label',
  ...props
}: GreenhouseChipProps) => {
  const avatar = buildAvatar({ avatarAlt, avatarInitials, avatarNode, avatarSrc })
  const deleteHandler = closable ? (onDelete ?? (() => undefined)) : undefined

  const icon =
    iconClassName || variant !== 'signal' ? (
      iconClassName ? (
        <i className={iconClassName} />
      ) : undefined
    ) : (
      <span aria-hidden='true' className='gh-chip-signal-dot' />
    )

  return (
    <Chip
      {...props}
      avatar={avatar}
      color='default'
      data-capture={dataCapture}
      data-kind={kind}
      data-tone={tone}
      data-variant={variant}
      deleteIcon={closable ? <i aria-label={closeLabel} className='tabler-circle-x-filled' /> : undefined}
      disabled={disabled}
      icon={icon}
      onDelete={deleteHandler}
      size={size}
      variant='filled'
      sx={[getChipSx(variant, tone, size), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  )
}

export default GreenhouseChip
