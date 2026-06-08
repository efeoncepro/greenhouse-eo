'use client'

import type { ReactNode } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import { axisNeutral, axisRamp } from '@core/theme/axis-tokens'
import { axisSemanticHex, axisSemanticPalette, axisSemanticSubValues } from '@core/theme/axis-semantic'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { GreenhouseChip, type GreenhouseChipVariant } from '@/components/greenhouse/primitives'

const DESIGN_SYSTEM_ROUTE = '/admin/design-system'
const FIGMA_AVATAR_SRC = '/images/greenhouse/design-system/axis-avatar-greenhouse.png'

type PreviewMode = 'light' | 'dark'
type PreviewTone = 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'

const variants: { label: string; value: GreenhouseChipVariant }[] = [
  { label: 'Solid', value: 'solid' },
  { label: 'Label', value: 'label' },
  { label: 'Outline', value: 'outlined' }
]

const tones: { label: string; value: PreviewTone }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'Error', value: 'error' },
  { label: 'Warning', value: 'warning' },
  { label: 'Info', value: 'info' },
  { label: 'Success', value: 'success' }
]

const axisPreviewTone = {
  default: axisNeutral.light.snackbar,
  primary: axisSemanticHex.success,
  secondary: axisRamp.primary[500],
  error: axisSemanticHex.error,
  warning: axisSemanticHex.warning,
  info: axisSemanticHex.info,
  success: axisSemanticHex.success
} as const satisfies Record<PreviewTone, string>

const axisPreviewContrastText = {
  primary: axisSemanticPalette.success.contrastText,
  secondary: axisNeutral.light.bgWhite,
  error: axisSemanticPalette.error.contrastText,
  warning: axisSemanticPalette.warning.contrastText,
  info: axisSemanticPalette.info.contrastText,
  success: axisSemanticPalette.success.contrastText
} as const satisfies Record<Exclude<PreviewTone, 'default'>, string>

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '')

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  }
}

const alphaHex = (hex: string, opacity: number) => {
  const { r, g, b } = hexToRgb(hex)

  return `rgb(${r} ${g} ${b} / ${opacity})`
}

// TASK-1053 Fase B: feedback roles that carry curated tonal sub-values. For the
// `label` (tonal) variant these read the SoT triple (tint/ink/border per mode) so
// the lab is a FAITHFUL render of GreenhouseChip — NOT `main`-as-text (the AA bug:
// warning amber on an amber wash). primary/secondary keep the legacy opacity wash.
const FEEDBACK_PREVIEW_TONES = ['error', 'warning', 'info', 'success'] as const

const isFeedbackPreviewTone = (tone: PreviewTone): tone is (typeof FEEDBACK_PREVIEW_TONES)[number] =>
  (FEEDBACK_PREVIEW_TONES as readonly string[]).includes(tone)

const getAxisChipSx = (variant: GreenhouseChipVariant, tone: PreviewTone, mode: PreviewMode): SxProps<Theme> => {
  const neutral = axisNeutral[mode]
  const main = axisPreviewTone[tone]
  const isDefault = tone === 'default'
  const solidText = isDefault ? neutral.textPrimary : axisPreviewContrastText[tone]
  const defaultFill = alphaHex(neutral.textPrimary, mode === 'dark' ? 0.12 : 0.08)
  const defaultLabel = alphaHex(neutral.textPrimary, mode === 'dark' ? 0.1 : 0.08)
  const defaultText = neutral.textPrimary

  // Tonal (label) feedback: curated SoT triple, resolved per mode (mirror of the
  // greenhouseSemanticTokens factory — the lab renders both modes under one theme).
  const tonalFeedback = variant === 'label' && isFeedbackPreviewTone(tone)
  const sub = tonalFeedback ? axisSemanticSubValues[tone] : null
  const tonalSurface = sub ? (mode === 'dark' ? `color-mix(in oklch, ${sub.darkFg} 16%, ${neutral.paper})` : sub.tint) : null
  const tonalText = sub ? (mode === 'dark' ? sub.darkFg : sub.ink) : null
  const tonalBorder = sub ? (mode === 'dark' ? `color-mix(in oklch, ${sub.darkFg} 36%, transparent)` : sub.border) : null

  const fill =
    variant === 'solid'
      ? isDefault
        ? defaultFill
        : main
      : variant === 'label'
        ? isDefault
          ? defaultLabel
          : tonalSurface ?? alphaHex(main, mode === 'dark' ? 0.16 : 0.18)
        : neutral.paper

  const color =
    variant === 'solid'
      ? isDefault
        ? defaultText
        : solidText
      : isDefault
        ? defaultText
        : tonalText ?? main

  const border =
    variant === 'outlined' ? (isDefault ? neutral.divider : main) : tonalBorder ?? fill

  return {
    backgroundColor: fill,
    borderColor: border,
    color,
    boxShadow: 'none',

    '& .MuiChip-avatar': {
      backgroundColor: alphaHex(axisNeutral.light.bgWhite, variant === 'solid' ? 0.78 : 0.72),
      color: isDefault ? defaultText : main
    },

    '& .MuiChip-deleteIcon': {
      color: variant === 'solid' ? alphaHex(axisNeutral.light.bgWhite, 0.82) : alphaHex(main, 0.62)
    },

    '&.MuiChip-clickable:hover, &:has(.MuiChip-deleteIcon):hover': {
      backgroundColor: fill,
      borderColor: border,
      color
    }
  }
}

const getTextColor = (mode: PreviewMode, opacity: 0.9 | 0.7 = 0.9) =>
  alphaHex(axisNeutral[mode].textPrimary, opacity)

const BoardHeader = ({ mode }: { mode: PreviewMode }) => (
  <Box
    sx={{
      px: { xs: 3, sm: 5 },
      py: 5,
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
      gap: 3,
      alignItems: 'start',
      backgroundColor: alphaHex(axisNeutral[mode].textPrimary, 0.06)
    }}
  >
    <Stack spacing={1}>
      <Stack direction='row' alignItems='center' flexWrap='wrap' gap={2}>
        <Typography
          variant='h4'
          sx={{
            color: getTextColor(mode)
          }}
        >
          Chip
        </Typography>
        <Typography
          variant='button'
          component='span'
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            backgroundColor: alphaHex(axisSemanticHex.success, mode === 'dark' ? 0.22 : 0.16),
            color: axisSemanticHex.success
          }}
        >
          <i aria-hidden='true' className='tabler-circle-check' />
          Auto Layout
        </Typography>
      </Stack>
      <Typography variant='body1' sx={{ color: getTextColor(mode, 0.7), maxWidth: 340 }}>
        Chips are compact elements that represent an input, attribute, or action.
      </Typography>
    </Stack>
    <AxisWordmark
      variant={mode === 'dark' ? 'negative' : 'full'}
      height={34}
      sx={{
        justifySelf: { xs: 'start', sm: 'end' },
        mt: 0.75
      }}
    />
  </Box>
)

const PreviewChip = ({
  avatar = false,
  closable = false,
  mode,
  size = 'medium',
  tone,
  variant
}: {
  avatar?: boolean
  closable?: boolean
  mode: PreviewMode
  size?: 'medium' | 'small'
  tone: PreviewTone
  variant: GreenhouseChipVariant
}) => (
  <GreenhouseChip
    label='Chip'
    variant={variant}
    tone={tone === 'default' ? 'default' : tone === 'secondary' ? 'primary' : tone === 'primary' ? 'success' : tone}
    size={size}
    kind={closable ? 'input' : avatar ? 'identity' : 'attribute'}
    avatarSrc={avatar ? FIGMA_AVATAR_SRC : undefined}
    avatarAlt={avatar ? 'Greenhouse' : undefined}
    closable={closable}
    closeLabel='Quitar chip'
    onDelete={closable ? () => undefined : undefined}
    sx={getAxisChipSx(variant, tone, mode)}
  />
)

const HeaderRow = ({ mode }: { mode: PreviewMode }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '86px repeat(3, 72px)',
      gap: 2,
      minInlineSize: 350,
      alignItems: 'center'
    }}
  >
    <Box />
    {variants.map(variant => (
      <Typography key={variant.value} variant='button' sx={{ color: getTextColor(mode, 0.7), textAlign: 'center' }}>
        {variant.label}
      </Typography>
    ))}
  </Box>
)

const MatrixRow = ({
  avatar = false,
  closable = false,
  label,
  mode,
  size = 'medium',
  tone = 'primary'
}: {
  avatar?: boolean
  closable?: boolean
  label: string
  mode: PreviewMode
  size?: 'medium' | 'small'
  tone?: PreviewTone
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '86px repeat(3, 72px)',
      gap: 2,
      minInlineSize: 350,
      alignItems: 'center'
    }}
  >
    <Typography variant='body2' sx={{ color: getTextColor(mode, 0.7) }}>
      {label}
    </Typography>
    {variants.map(variant => (
      <Box key={variant.value} sx={{ display: 'flex', justifyContent: 'center', minInlineSize: 0 }}>
        <PreviewChip variant={variant.value} tone={tone} mode={mode} size={size} avatar={avatar} closable={closable} />
      </Box>
    ))}
  </Box>
)

const MatrixSection = ({
  children,
  mode,
  title
}: {
  children: ReactNode
  mode: PreviewMode
  title: string
}) => (
  <Stack spacing={1.75}>
    <Typography variant='h5' sx={{ color: getTextColor(mode) }}>
      {title}
    </Typography>
    <Box
      sx={{
        border: '1px dashed',
        borderColor: axisNeutral[mode].divider,
        borderRadius: 2,
        px: 3,
        py: 3,
        overflowX: 'auto'
      }}
    >
      <Stack spacing={2.5} sx={{ inlineSize: 'max-content', minInlineSize: '100%' }}>
        {children}
      </Stack>
    </Box>
  </Stack>
)

const ChipBoard = ({ mode }: { mode: PreviewMode }) => (
  <Box
    data-capture={`chips-lab-${mode}`}
    sx={{
      minInlineSize: 0,
      backgroundColor: axisNeutral[mode].bodyBg,
      border: '1px solid',
      borderColor: axisNeutral[mode].divider,
      boxShadow: mode === 'dark' ? 'none' : `0 18px 52px ${alphaHex(axisNeutral.light.snackbar, 0.08)}`
    }}
  >
    <BoardHeader mode={mode} />
    <Stack spacing={4.75} sx={{ px: { xs: 3, sm: 5 }, py: { xs: 5, sm: 7 } }}>
      <MatrixSection title='Variants' mode={mode}>
        <HeaderRow mode={mode} />
        <MatrixRow label='Variants' mode={mode} />
        <MatrixRow label='Avatar' mode={mode} avatar />
        <MatrixRow label='Closable' mode={mode} closable />
      </MatrixSection>

      <MatrixSection title='Sizes' mode={mode}>
        <HeaderRow mode={mode} />
        <MatrixRow label='Default' mode={mode} />
        <MatrixRow label='Small' mode={mode} size='small' />
      </MatrixSection>

      <MatrixSection title='Colors' mode={mode}>
        <HeaderRow mode={mode} />
        {tones.map(tone => (
          <MatrixRow key={tone.value} label={tone.label} mode={mode} tone={tone.value} avatar={tone.value !== 'default'} />
        ))}
      </MatrixSection>
    </Stack>
  </Box>
)

const ChipsLabView = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 1360, mx: 'auto' }}>
    <Button
      component={Link}
      href={DESIGN_SYSTEM_ROUTE}
      variant='text'
      color='secondary'
      size='small'
      startIcon={<i className='tabler-arrow-left' />}
      sx={{ alignSelf: 'flex-start', px: 0 }}
    >
      Design System
    </Button>

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
        gap: 0,
        overflow: 'hidden',
        borderRadius: 2
      }}
    >
      <ChipBoard mode='light' />
      <ChipBoard mode='dark' />
    </Box>
  </Box>
)

export default ChipsLabView
