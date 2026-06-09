import type { ButtonProps } from '@mui/material/Button'

import { controlText } from '@/components/theme/typography-tokens'

export type GreenhouseButtonVariant = 'solid' | 'label' | 'outlined' | 'text'
export type GreenhouseButtonTone = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
export type GreenhouseButtonSize = 'small' | 'medium' | 'large'
export type GreenhouseButtonKind =
  | 'primaryAction'
  | 'secondaryAction'
  | 'destructiveAction'
  | 'inlineAction'
  | 'navigation'
  | 'filter'
  | 'custom'

export const GREENHOUSE_BUTTON_VARIANTS = ['solid', 'label', 'outlined', 'text'] as const
export const GREENHOUSE_BUTTON_TONES = ['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const
export const GREENHOUSE_BUTTON_SIZES = ['large', 'medium', 'small'] as const

export const GREENHOUSE_BUTTON_VARIANT_CONFIG = {
  solid: {
    muiVariant: 'contained',
    emphasis: 'high',
    description: 'Primary command or strongest action in a local action set.'
  },
  label: {
    muiVariant: 'tonal',
    emphasis: 'medium',
    description: 'Supportive command with a filled tonal surface.'
  },
  outlined: {
    muiVariant: 'outlined',
    emphasis: 'medium',
    description: 'Alternative command that needs shape without dominant fill.'
  },
  text: {
    muiVariant: 'text',
    emphasis: 'low',
    description: 'Inline or low-emphasis action near related content.'
  }
} as const satisfies Record<
  GreenhouseButtonVariant,
  {
    muiVariant: NonNullable<ButtonProps['variant']>
    emphasis: 'high' | 'medium' | 'low'
    description: string
  }
>

export const GREENHOUSE_BUTTON_KIND_DEFAULT_VARIANT = {
  primaryAction: 'solid',
  secondaryAction: 'label',
  destructiveAction: 'solid',
  inlineAction: 'text',
  navigation: 'label',
  filter: 'outlined',
  custom: 'label'
} as const satisfies Record<GreenhouseButtonKind, GreenhouseButtonVariant>

export const GREENHOUSE_BUTTON_KIND_DEFAULT_TONE = {
  primaryAction: 'primary',
  secondaryAction: 'secondary',
  destructiveAction: 'error',
  inlineAction: 'primary',
  navigation: 'primary',
  filter: 'primary',
  custom: 'primary'
} as const satisfies Record<GreenhouseButtonKind, GreenhouseButtonTone>

export const GREENHOUSE_BUTTON_SIZE_TOKENS = {
  large: {
    minBlockSize: 48,
    iconSize: 20,
    labelFontSize: controlText.lg,
    labelToken: 'controlText.lg'
  },
  medium: {
    minBlockSize: 38,
    iconSize: 16,
    labelFontSize: controlText.md,
    labelToken: 'controlText.md'
  },
  small: {
    minBlockSize: 30,
    iconSize: 14,
    labelFontSize: controlText.sm,
    labelToken: 'controlText.sm'
  }
} as const satisfies Record<
  GreenhouseButtonSize,
  {
    minBlockSize: number
    iconSize: number
    labelFontSize: (typeof controlText)[keyof typeof controlText]
    labelToken: 'controlText.lg' | 'controlText.md' | 'controlText.sm'
  }
>

export const resolveGreenhouseButtonVariant = ({
  kind,
  variant
}: {
  kind?: GreenhouseButtonKind
  variant?: GreenhouseButtonVariant
}): GreenhouseButtonVariant => variant ?? GREENHOUSE_BUTTON_KIND_DEFAULT_VARIANT[kind ?? 'custom']

export const resolveGreenhouseButtonTone = ({
  kind,
  tone
}: {
  kind?: GreenhouseButtonKind
  tone?: GreenhouseButtonTone
}): GreenhouseButtonTone => tone ?? GREENHOUSE_BUTTON_KIND_DEFAULT_TONE[kind ?? 'custom']
