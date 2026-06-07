'use client'

import type { ReactNode } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

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

const figmaTone = {
  default: '#2F2B3D',
  primary: '#28C76F',
  secondary: '#168CFA',
  error: '#FF4C51',
  warning: '#FFB703',
  info: '#00BAD1',
  success: '#28C76F'
} as const satisfies Record<PreviewTone, string>

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

const getFigmaChipSx = (variant: GreenhouseChipVariant, tone: PreviewTone, mode: PreviewMode): SxProps<Theme> => {
  const main = figmaTone[tone]
  const isDefault = tone === 'default'
  const solidText = tone === 'warning' || tone === 'info' || tone === 'success' ? '#2F2B3D' : '#FFFFFF'
  const defaultFill = mode === 'dark' ? '#3A3F57' : '#EEEDF0'
  const defaultLabel = mode === 'dark' ? '#34384F' : '#EEEDF0'
  const defaultText = mode === 'dark' ? '#E1DEF5' : '#2F2B3D'

  const fill =
    variant === 'solid'
      ? isDefault
        ? defaultFill
        : main
      : variant === 'label'
        ? isDefault
          ? defaultLabel
          : alphaHex(main, mode === 'dark' ? 0.16 : 0.18)
        : mode === 'dark'
          ? '#FFFFFF'
          : '#FFFFFF'

  const color =
    variant === 'solid'
      ? isDefault
        ? defaultText
        : solidText
      : isDefault
        ? defaultText
        : main

  const border = variant === 'outlined' ? (isDefault ? (mode === 'dark' ? '#E1DEF51F' : '#2F2B3D1F') : main) : fill

  return {
    backgroundColor: fill,
    borderColor: border,
    color,
    boxShadow: 'none',

    '& .MuiChip-avatar': {
      backgroundColor: alphaHex('#FFFFFF', variant === 'solid' ? 0.78 : 0.72),
      color: isDefault ? defaultText : main,
      fontSize: 10,
      fontWeight: 800
    },

    '& .MuiChip-deleteIcon': {
      color: variant === 'solid' ? alphaHex('#FFFFFF', 0.82) : alphaHex(main, 0.62)
    },

    '&.MuiChip-clickable:hover, &:has(.MuiChip-deleteIcon):hover': {
      backgroundColor: fill,
      borderColor: border,
      color
    }
  }
}

const getTextColor = (mode: PreviewMode, opacity: 0.9 | 0.7 = 0.9) =>
  mode === 'dark' ? alphaHex('#E1DEF5', opacity) : alphaHex('#2F2B3D', opacity)

const labType = {
  componentTitle: {
    fontSize: 38,
    fontWeight: 600,
    lineHeight: '52px'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: '24px'
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
    textAlign: 'center'
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: 500,
    lineHeight: '20px'
  }
} as const

const BoardHeader = ({ mode }: { mode: PreviewMode }) => (
  <Box
    sx={{
      px: { xs: 3, sm: 5 },
      py: 5,
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
      gap: 3,
      alignItems: 'start',
      backgroundColor: mode === 'dark' ? '#E1DEF50F' : '#2F2B3D0F'
    }}
  >
    <Stack spacing={1}>
      <Stack direction='row' alignItems='center' flexWrap='wrap' gap={2}>
        <Typography
          variant='h4'
          sx={{
            color: getTextColor(mode),
            ...labType.componentTitle
          }}
        >
          Chip
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            backgroundColor: alphaHex('#28C76F', mode === 'dark' ? 0.22 : 0.16),
            color: '#28C76F',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1
          }}
        >
          <i className='tabler-circle-check' />
          Auto Layout
        </Box>
      </Stack>
      <Typography sx={{ color: getTextColor(mode, 0.7), fontSize: 18, lineHeight: '24px', maxWidth: 340 }}>
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
    sx={getFigmaChipSx(variant, tone, mode)}
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
      <Typography key={variant.value} sx={{ color: getTextColor(mode, 0.7), ...labType.columnLabel }}>
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
    <Typography sx={{ color: getTextColor(mode, 0.7), ...labType.rowLabel }}>
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
    <Typography sx={{ color: getTextColor(mode), ...labType.sectionTitle }}>
      {title}
    </Typography>
    <Box
      sx={{
        border: '1px dashed',
        borderColor: mode === 'dark' ? '#E1DEF51F' : '#2F2B3D1F',
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
      backgroundColor: mode === 'dark' ? '#25293C' : '#F8F7FA',
      border: '1px solid',
      borderColor: mode === 'dark' ? '#E1DEF51F' : '#2F2B3D14',
      boxShadow: mode === 'dark' ? 'none' : '0 18px 52px rgb(47 43 61 / 0.08)'
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
