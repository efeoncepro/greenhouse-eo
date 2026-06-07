'use client'

import type { ReactElement } from 'react'

import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip'
import type { SxProps, Theme } from '@mui/material/styles'

export type GreenhouseChipVariant = 'solid' | 'label' | 'outlined'
export type GreenhouseChipTone = 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
export type GreenhouseChipSize = 'medium' | 'small'
export type GreenhouseChipKind = 'status' | 'attribute' | 'input' | 'action' | 'identity' | 'filter' | 'metric' | 'custom'

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

const toneMain = (tone: Exclude<GreenhouseChipTone, 'default'>) => `var(--mui-palette-${tone}-main)`
const toneContrast = (tone: Exclude<GreenhouseChipTone, 'default'>) => `var(--mui-palette-${tone}-contrastText)`
const toneSoft = (tone: Exclude<GreenhouseChipTone, 'default'>) => `var(--mui-palette-${tone}-lightOpacity)`

const getChipSurface = (variant: GreenhouseChipVariant, tone: GreenhouseChipTone) => {
  if (tone === 'default') {
    if (variant === 'outlined') {
      return {
        backgroundColor: 'var(--mui-palette-background-paper)',
        borderColor: 'var(--mui-palette-divider)',
        color: 'var(--mui-palette-text-primary)'
      }
    }

    return {
      backgroundColor:
        variant === 'solid' ? 'var(--mui-palette-action-selected)' : 'var(--mui-palette-action-hover)',
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
  if (tone === 'default') {
    return {
      backgroundColor:
        variant === 'outlined' ? 'var(--mui-palette-action-hover)' : 'var(--mui-palette-action-focus)',
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

  return theme => ({
    ...theme.typography.button,
    '--gh-chip-avatar-size': isSmall ? '16px' : '20px',
    '--gh-chip-delete-size': isSmall ? '16px' : '18px',
    blockSize: isSmall ? 24 : 32,
    minInlineSize: 0,
    borderRadius: 1,
    border: '1px solid',
    borderColor: surface.borderColor,
    backgroundColor: surface.backgroundColor,
    color: surface.color,
    fontWeight: 600,
    fontSize: isSmall ? theme.typography.caption.fontSize : theme.typography.button.fontSize,
    lineHeight: 1,
    transform: 'translateY(0)',
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'color', 'transform'], {
      duration: theme.transitions.duration.shortest
    }),

    '& .MuiChip-label': {
      px: isSmall ? 2.5 : 3,
      py: 0,
      display: 'inline-flex',
      minInlineSize: 0,
      alignItems: 'center',
      lineHeight: 1,
      whiteSpace: 'nowrap'
    },

    '& .MuiChip-avatar, & .MuiChip-icon': {
      inlineSize: 'var(--gh-chip-avatar-size)',
      blockSize: 'var(--gh-chip-avatar-size)',
      marginInlineStart: isSmall ? theme.spacing(1) : theme.spacing(1.5),
      marginInlineEnd: isSmall ? theme.spacing(-1.5) : theme.spacing(-2),
      color: 'currentColor',
      fontSize: isSmall ? 13 : 15
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

    '&.MuiChip-clickable': {
      cursor: 'pointer'
    },

    '&.MuiChip-clickable:hover, &:has(.MuiChip-deleteIcon):hover': {
      ...hoverSurface,
      borderColor: variant === 'outlined' && tone !== 'default' ? toneMain(tone) : hoverSurface.backgroundColor,
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

      '&.MuiChip-clickable:hover, &:has(.MuiChip-deleteIcon):hover, &.MuiChip-clickable:active': {
        transform: 'none'
      }
    },

    '&.Mui-disabled': {
      opacity: 0.45
    }
  })
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
  const deleteHandler = closable ? onDelete ?? (() => undefined) : undefined

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
      icon={iconClassName ? <i className={iconClassName} /> : undefined}
      onDelete={deleteHandler}
      size={size}
      variant='filled'
      sx={[getChipSx(variant, tone, size), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  )
}

export default GreenhouseChip
