'use client'

import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'

/**
 * AXIS brand mark — AXIS is the name of Efeonce's Design System (see DESIGN.md
 * `designSystem: AXIS`). This is the system's own brand, distinct from the
 * Greenhouse app logo (in-app chrome) and the Efeonce institutional logo (PDFs,
 * receipts, contracts). Use AXIS only on design-system surfaces (palette/token
 * references, DS docs, theme previews).
 *
 * Assets (operator-uploaded, vector): `public/branding/axis-*.svg`.
 *   - `full`     → axis-full-color.svg       (lockup, navy + orange — on light)
 *   - `isotype`  → axis-isotipo-full-color.svg (mark only)
 *   - `negative` → axis-color-negative.svg   (white + orange — on dark surfaces)
 */

export type AxisWordmarkVariant = 'full' | 'isotype' | 'negative'

const AXIS_SRC: Record<AxisWordmarkVariant, string> = {
  full: '/branding/axis-full-color.svg',
  isotype: '/branding/axis-isotipo-full-color.svg',
  negative: '/branding/axis-color-negative.svg'
}

export type AxisWordmarkProps = {
  variant?: AxisWordmarkVariant
  /** Rendered height in px (width scales to preserve aspect ratio). */
  height?: number
} & Omit<BoxProps<'img'>, 'component' | 'src' | 'height'>

const AxisWordmark = ({ variant = 'full', height = 28, alt = 'AXIS', sx, ...rest }: AxisWordmarkProps) => (
  <Box
    component='img'
    src={AXIS_SRC[variant]}
    alt={alt}
    sx={{ height, width: 'auto', display: 'block', ...sx }}
    {...rest}
  />
)

export default AxisWordmark
