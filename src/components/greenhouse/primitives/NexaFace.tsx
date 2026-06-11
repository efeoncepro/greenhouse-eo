'use client'

import Avatar from '@mui/material/Avatar'
import { alpha } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'

import { GREENHOUSE_NEXA_BRAND_COLORS } from './greenhouse-nexa-brand-controller'

/**
 * NexaFace — primitive canónica del avatar "cara real" de Nexa (la persona IA de Efeonce).
 * Single source del asset (`NEXA_FACE_SRC`) + tamaños semánticos. Reemplaza el `<Avatar src=…>`
 * repetido en el hero y en el header del chat.
 *
 * Variants por contexto de uso (Primitive + Variants + Kinds):
 *  - `hero` (76px, sombra raised) — empty-state / presentación.
 *  - `header` (44px, anillo teal) — barra del chat.
 *  - `message` (32px) — avatar de mensaje en el thread.
 */
export const NEXA_FACE_SRC = '/images/avatar-nexa/nexa-face.webp'

export type NexaFaceVariant = 'hero' | 'header' | 'message'

export interface NexaFaceProps {
  variant?: NexaFaceVariant
  /** Override del tamaño en px (si se necesita uno puntual fuera de las variants). */
  size?: number
  sx?: SxProps<Theme>
}

const VARIANT_SIZE: Record<NexaFaceVariant, number> = { hero: 76, header: 44, message: 32 }

const NexaFace = ({ variant = 'hero', size, sx }: NexaFaceProps) => {
  const px = size ?? VARIANT_SIZE[variant]

  return (
    <Avatar
      src={NEXA_FACE_SRC}
      alt='Nexa'
      sx={[
        { width: px, height: px },
        variant === 'hero' && ((theme: Theme) => ({ boxShadow: theme.greenhouseElevation.raised.boxShadow })),
        variant === 'header' && { border: '2px solid', borderColor: alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.55) },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ].filter(Boolean) as SxProps<Theme>}
    />
  )
}

export default NexaFace
