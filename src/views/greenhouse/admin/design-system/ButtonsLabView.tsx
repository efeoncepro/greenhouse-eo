'use client'

import type { ReactNode } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import {
  GREENHOUSE_BUTTON_SIZE_TOKENS,
  GREENHOUSE_BUTTON_SIZES,
  GreenhouseButton,
  type GreenhouseButtonSize,
  type GreenhouseButtonTone,
  type GreenhouseButtonVariant
} from '@/components/greenhouse/primitives'
import { axisNeutral, axisRamp } from '@core/theme/axis-tokens'
import { axisSemanticHex, axisSemanticPalette } from '@core/theme/axis-semantic'

const DESIGN_SYSTEM_ROUTE = '/admin/design-system'

type PreviewMode = 'light' | 'dark'
type ButtonState = 'default' | 'hover' | 'active' | 'focus' | 'disabled'

const tones: { label: string; value: GreenhouseButtonTone }[] = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'Error', value: 'error' },
  { label: 'Warning', value: 'warning' },
  { label: 'Info', value: 'info' },
  { label: 'Success', value: 'success' }
]

const toneToken = {
  primary: axisRamp.primary[500],
  secondary: axisRamp.secondary[700],
  error: axisSemanticHex.error,
  warning: axisSemanticHex.warning,
  info: axisSemanticHex.info,
  success: axisSemanticHex.success
} as const satisfies Record<GreenhouseButtonTone, string>

const contrastToken = {
  primary: axisNeutral.light.bgWhite,
  secondary: axisNeutral.light.bgWhite,
  error: axisSemanticPalette.error.contrastText,
  warning: axisSemanticPalette.warning.contrastText,
  info: axisSemanticPalette.info.contrastText,
  success: axisSemanticPalette.success.contrastText
} as const satisfies Record<GreenhouseButtonTone, string>

const variants: { label: string; value: GreenhouseButtonVariant }[] = [
  { label: 'Default', value: 'solid' },
  { label: 'Label', value: 'label' },
  { label: 'Outline', value: 'outlined' },
  { label: 'Text', value: 'text' }
]

const states: { label: string; value: ButtonState }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Hover', value: 'hover' },
  { label: 'Active', value: 'active' },
  { label: 'Focus', value: 'focus' },
  { label: 'Disabled', value: 'disabled' }
]

const alphaHex = (hex: string, opacity: number) => {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)

  return `rgb(${r} ${g} ${b} / ${opacity})`
}

const textColor = (mode: PreviewMode, opacity: 0.9 | 0.7 | 0.56 = 0.9) =>
  alphaHex(mode === 'dark' ? axisNeutral.dark.textPrimary : axisNeutral.light.textPrimary, opacity)

const surfaceColor = (mode: PreviewMode) => axisNeutral[mode].paper
const panelStroke = (mode: PreviewMode) => axisNeutral[mode].divider

const getPreviewButtonSx = ({
  mode,
  state,
  tone,
  variant
}: {
  mode: PreviewMode
  state: ButtonState
  tone: GreenhouseButtonTone
  variant: GreenhouseButtonVariant
}): SxProps<Theme> => {
  const main = toneToken[tone]
  const ink = contrastToken[tone]
  const paper = surfaceColor(mode)
  const hoverFill = state === 'hover' || state === 'focus' ? 0.24 : 0.16
  const disabled = state === 'disabled'

  const base =
    variant === 'solid'
      ? {
          backgroundColor: disabled ? alphaHex(main, mode === 'dark' ? 0.28 : 0.38) : main,
          borderColor: disabled ? alphaHex(main, 0.2) : main,
          color: disabled ? alphaHex(ink, 0.54) : ink
        }
      : variant === 'label'
        ? {
            backgroundColor: disabled ? alphaHex(main, 0.08) : alphaHex(main, hoverFill),
            borderColor: 'transparent',
            color: disabled ? alphaHex(main, 0.42) : main
          }
        : variant === 'outlined'
          ? {
              backgroundColor: state === 'hover' || state === 'focus' ? alphaHex(main, 0.08) : paper,
              borderColor: disabled ? alphaHex(main, 0.28) : main,
              color: disabled ? alphaHex(main, 0.42) : main
            }
          : {
              backgroundColor: state === 'hover' || state === 'focus' ? alphaHex(main, 0.08) : 'transparent',
              borderColor: 'transparent',
              color: disabled ? alphaHex(main, 0.42) : main
            }

  return {
    ...base,
    boxShadow:
      state === 'focus'
        ? `0 0 0 3px ${alphaHex(main, 0.22)}`
        : variant === 'solid' && !disabled
          ? `0 6px 14px ${alphaHex(main, mode === 'dark' ? 0.2 : 0.16)}`
          : 'none',
    transform: state === 'active' ? 'scale(0.98)' : 'none',

    '&:hover': {
      ...base,
      boxShadow:
        state === 'focus'
          ? `0 0 0 3px ${alphaHex(main, 0.22)}`
          : variant === 'solid' && !disabled
            ? `0 6px 14px ${alphaHex(main, mode === 'dark' ? 0.2 : 0.16)}`
            : 'none'
    }
  }
}

const BoardHeader = ({ mode }: { mode: PreviewMode }) => (
  <Box
    sx={{
      px: { xs: 3, sm: 5 },
      py: 5,
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
      gap: 3,
      alignItems: 'start',
      backgroundColor: axisNeutral[mode].actionHover
    }}
  >
    <Stack spacing={1}>
      <Stack direction='row' alignItems='center' flexWrap='wrap' gap={2}>
        <Typography
          variant='h1'
          sx={{
            color: textColor(mode)
          }}
        >
          Buttons
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
      <Typography variant='body1' sx={{ color: textColor(mode, 0.7), maxWidth: 560 }}>
        Buttons allow users to take actions and make choices with a single tap.
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

const SectionFrame = ({
  children,
  mode,
  title
}: {
  children: ReactNode
  mode: PreviewMode
  title: string
}) => (
  <Stack spacing={1.75}>
    <Typography variant='h5' sx={{ color: textColor(mode) }}>
      {title}
    </Typography>
    <Box
      sx={{
        border: '1px dashed',
        borderColor: panelStroke(mode),
        borderRadius: 1,
        overflowX: 'auto',
        p: { xs: 3, sm: 5 },
        backgroundColor: axisNeutral[mode].paper
      }}
    >
      {children}
    </Box>
  </Stack>
)

const ColumnLabel = ({ children, mode }: { children: ReactNode; mode: PreviewMode }) => (
  <Typography variant='button' sx={{ color: textColor(mode, 0.7), textAlign: 'center' }}>
    {children}
  </Typography>
)

const RowLabel = ({ children, mode }: { children: ReactNode; mode: PreviewMode }) => (
  <Typography variant='button' sx={{ color: textColor(mode, 0.7) }}>
    {children}
  </Typography>
)

const PreviewButton = ({
  children = 'Button',
  leadingIconClassName,
  mode,
  size = 'medium',
  state = 'default',
  tone = 'primary',
  trailingIconClassName,
  variant
}: {
  children?: ReactNode
  leadingIconClassName?: string
  mode: PreviewMode
  size?: GreenhouseButtonSize
  state?: ButtonState
  tone?: GreenhouseButtonTone
  trailingIconClassName?: string
  variant: GreenhouseButtonVariant
}) => (
  <GreenhouseButton
    variant={variant}
    tone={tone}
    size={size}
    kind={variant === 'text' ? 'inlineAction' : variant === 'solid' ? 'primaryAction' : 'secondaryAction'}
    disabled={state === 'disabled'}
    reserveInlineSize={size === 'large' ? 104 : size === 'small' ? 66 : 86}
    leadingIconClassName={leadingIconClassName}
    trailingIconClassName={trailingIconClassName}
    dataCapture={`button-${variant}-${tone}-${size}-${state}`}
    sx={getPreviewButtonSx({ mode, state, tone, variant })}
  >
    {children}
  </GreenhouseButton>
)

const VariantsMatrix = ({ mode }: { mode: PreviewMode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '90px repeat(4, 96px)', gap: 2, alignItems: 'center', minInlineSize: 506 }}>
    <Box />
    {variants.map(variant => (
      <ColumnLabel key={variant.value} mode={mode}>
        {variant.label}
      </ColumnLabel>
    ))}
    <RowLabel mode={mode}>Variants</RowLabel>
    {variants.map(variant => (
      <PreviewButton key={variant.value} mode={mode} variant={variant.value} />
    ))}
  </Box>
)

const IconsMatrix = ({ mode }: { mode: PreviewMode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '90px repeat(4, 128px)', gap: 2, alignItems: 'center', minInlineSize: 602 }}>
    <Box />
    {['Default', 'Left Icon', 'Right Icon', 'Both Icon'].map(label => (
      <ColumnLabel key={label} mode={mode}>
        {label}
      </ColumnLabel>
    ))}
    {variants.map(variant => (
      <Box key={variant.value} sx={{ display: 'contents' }}>
        <RowLabel mode={mode}>{variant.label}</RowLabel>
        <PreviewButton mode={mode} variant={variant.value} />
        <PreviewButton mode={mode} variant={variant.value} leadingIconClassName='tabler-arrow-left' />
        <PreviewButton mode={mode} variant={variant.value} trailingIconClassName='tabler-arrow-right' />
        <PreviewButton
          mode={mode}
          variant={variant.value}
          leadingIconClassName='tabler-arrow-left'
          trailingIconClassName='tabler-arrow-right'
        >
          Medium
        </PreviewButton>
      </Box>
    ))}
  </Box>
)

const SizesMatrix = ({ mode }: { mode: PreviewMode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '90px repeat(3, 112px)', gap: 2, alignItems: 'center', minInlineSize: 442 }}>
    <Box />
    {GREENHOUSE_BUTTON_SIZES.map(size => (
      <ColumnLabel key={size} mode={mode}>
        {size[0].toUpperCase()}
        {size.slice(1)}
      </ColumnLabel>
    ))}
    {variants.map(variant => (
      <Box key={variant.value} sx={{ display: 'contents' }}>
        <RowLabel mode={mode}>{variant.label}</RowLabel>
        {GREENHOUSE_BUTTON_SIZES.map(size => (
          <PreviewButton key={size} mode={mode} variant={variant.value} size={size} />
        ))}
      </Box>
    ))}
  </Box>
)

const ColorsMatrix = ({ mode }: { mode: PreviewMode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '90px repeat(6, 110px)', gap: 2, alignItems: 'center', minInlineSize: 782 }}>
    <Box />
    {tones.map(tone => (
      <ColumnLabel key={tone.value} mode={mode}>
        {tone.label}
      </ColumnLabel>
    ))}
    {variants.map(variant => (
      <Box key={variant.value} sx={{ display: 'contents' }}>
        <RowLabel mode={mode}>{variant.label}</RowLabel>
        {tones.map(tone => (
          <PreviewButton key={tone.value} mode={mode} variant={variant.value} tone={tone.value} />
        ))}
      </Box>
    ))}
  </Box>
)

const StatesMatrix = ({ mode }: { mode: PreviewMode }) => (
  <Stack spacing={3}>
    <Box sx={{ display: 'grid', gridTemplateColumns: '90px repeat(5, 110px)', gap: 2, alignItems: 'center', minInlineSize: 640 }}>
      <Box />
      {states.map(state => (
        <ColumnLabel key={state.value} mode={mode}>
          {state.label}
        </ColumnLabel>
      ))}
      {variants.map(variant => (
        <Box key={variant.value} sx={{ display: 'contents' }}>
          <RowLabel mode={mode}>{variant.label}</RowLabel>
          {states.map(state => (
            <PreviewButton key={state.value} mode={mode} variant={variant.value} state={state.value} />
          ))}
        </Box>
      ))}
    </Box>
    <Typography variant='caption' sx={{ color: textColor(mode, 0.7), textAlign: 'center' }}>
      Active button style: transform scale(0.98). Ripple follows the global MUI ButtonBase setting.
    </Typography>
  </Stack>
)

const TokenStrip = ({ mode }: { mode: PreviewMode }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
    {GREENHOUSE_BUTTON_SIZES.map(size => (
      <Typography
        variant='monoId'
        component='span'
        key={size}
        sx={{
          px: 1.5,
          py: 1,
          border: '1px solid',
          borderColor: panelStroke(mode),
          borderRadius: 1,
          color: textColor(mode, 0.7)
        }}
      >
        {size}: {GREENHOUSE_BUTTON_SIZE_TOKENS[size].minBlockSize}px · {GREENHOUSE_BUTTON_SIZE_TOKENS[size].labelToken}
      </Typography>
    ))}
  </Box>
)

const ButtonBoard = ({ mode }: { mode: PreviewMode }) => (
  <Box
    data-capture={`buttons-board-${mode}`}
    sx={{
      minInlineSize: 0,
      backgroundColor: axisNeutral[mode].bodyBg,
      color: textColor(mode),
      overflow: 'hidden'
    }}
  >
    <BoardHeader mode={mode} />
    <Stack spacing={4.75} sx={{ px: { xs: 3, sm: 5 }, py: 5 }}>
      <TokenStrip mode={mode} />
      <SectionFrame mode={mode} title='Variants'>
        <VariantsMatrix mode={mode} />
      </SectionFrame>
      <SectionFrame mode={mode} title='Icons'>
        <IconsMatrix mode={mode} />
      </SectionFrame>
      <SectionFrame mode={mode} title='Sizes'>
        <SizesMatrix mode={mode} />
      </SectionFrame>
      <SectionFrame mode={mode} title='Colors'>
        <ColorsMatrix mode={mode} />
      </SectionFrame>
      <SectionFrame mode={mode} title='States'>
        <StatesMatrix mode={mode} />
      </SectionFrame>
    </Stack>
  </Box>
)

const ButtonsLabView = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }} data-capture='buttons-lab'>
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
      <Stack spacing={1}>
        <AxisWordmark variant='auto' height={36} />
        <Typography variant='h4'>
          Buttons — AXIS primitive contract
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760 }}>
          Lab interno basado en AXIS Figma node 324:32923. La primitive canónica mapea variants AXIS a MUI/Vuexy sin
          copiar referencias externas ni introducir otro theme.
        </Typography>
      </Stack>
      <Button
        component={Link}
        href={DESIGN_SYSTEM_ROUTE}
        variant='tonal'
        color='secondary'
        size='small'
        startIcon={<i className='tabler-arrow-left' />}
      >
        Volver al sistema
      </Button>
    </Box>

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
        gap: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'background.paper'
      }}
    >
      <ButtonBoard mode='light' />
      <ButtonBoard mode='dark' />
    </Box>
  </Box>
)

export default ButtonsLabView
