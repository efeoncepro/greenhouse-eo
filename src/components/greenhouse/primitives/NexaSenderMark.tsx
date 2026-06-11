'use client'

import Box from '@mui/material/Box'
import { alpha, useTheme } from '@mui/material/styles'

import { GREENHOUSE_NEXA_BRAND_COLORS } from './greenhouse-nexa-brand-controller'

/**
 * NexaSenderMark — primitive canónica del avatar POR-MENSAJE de Nexa en el thread: el Nexa
 * Mark dentro de un disco navy circular con anillo teal. Minimalista (un disco con el mark)
 * + presencia (contraste navy/teal). Distinto de `NexaFace` (la foto/cara real, hero/header).
 *
 * El glyph va **inline** a propósito para controlar sus colores en el contexto navy: la
 * sonrisa va teal y el sparkle va **BLANCO** (sobre navy el sparkle azul se perdía). NO se
 * sustituye por `tabler-sparkles` suelto (regla de marca: la unidad mínima de Nexa es
 * arco + sparkle).
 *
 * Default 28px (el del chat). `size` escala disco + anillo + glyph proporcionalmente.
 */
export interface NexaSenderMarkProps {
  /** Diámetro del disco en px. Default 28 (el del thread). */
  size?: number
}

const BASE = 28

const NexaSenderMark = ({ size = BASE }: NexaSenderMarkProps) => {
  const theme = useTheme()
  const ratio = size / BASE

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy,
        boxShadow: `0 0 0 ${1.5 * ratio}px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.35)}`
      }}
    >
      <Box component='svg' viewBox='0 0 48 48' sx={{ width: 19 * ratio, height: 19 * ratio, display: 'block' }}>
        <path d='M9 27 Q19 39 29 27' fill='none' stroke={GREENHOUSE_NEXA_BRAND_COLORS.electricTeal} strokeWidth={4} strokeLinecap='round' />
        <path d='M34 9 C35 12.5 36.5 14 40 15 C36.5 16 35 17.5 34 21 C33 17.5 31.5 16 28 15 C31.5 14 33 12.5 34 9 Z' fill={theme.palette.common.white} />
      </Box>
    </Box>
  )
}

export default NexaSenderMark
