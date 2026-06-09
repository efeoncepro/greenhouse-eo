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
 *   - `auto`     → mode-aware: `full` on light, `negative` on dark (CSS toggle).
 *
 * Default is `auto` so any design-system surface gets the contrast-correct logo
 * in both themes without wiring the mode itself.
 */

export type AxisWordmarkVariant = 'full' | 'isotype' | 'negative' | 'auto'

const AXIS_SRC = {
  full: '/branding/axis-full-color.svg',
  isotype: '/branding/axis-isotipo-full-color.svg',
  negative: '/branding/axis-color-negative.svg'
} as const

export type AxisWordmarkProps = {
  variant?: AxisWordmarkVariant
  /** Rendered height in px (width scales to preserve aspect ratio). */
  height?: number
} & Omit<BoxProps<'img'>, 'component' | 'src' | 'height'>

const AxisWordmark = ({ variant = 'auto', height = 28, alt = 'AXIS', sx, ...rest }: AxisWordmarkProps) => {
  // Mode-aware: render both the positive + negative lockups and CSS-toggle by
  // theme (works with the CSS-variables theme — no mode hook, SSR-safe).
  if (variant === 'auto') {
    return (
      <>
        <Box
          component='img'
          src={AXIS_SRC.full}
          alt={alt}
          sx={[{ height, width: 'auto', display: 'block' }, theme => theme.applyStyles('dark', { display: 'none' }), ...(Array.isArray(sx) ? sx : [sx])]}
          {...rest}
        />
        <Box
          component='img'
          src={AXIS_SRC.negative}
          alt={alt}
          aria-hidden
          sx={[{ height, width: 'auto', display: 'none' }, theme => theme.applyStyles('dark', { display: 'block' }), ...(Array.isArray(sx) ? sx : [sx])]}
          {...rest}
        />
      </>
    )
  }

  return (
    <Box
      component='img'
      src={AXIS_SRC[variant]}
      alt={alt}
      sx={[{ height, width: 'auto', display: 'block' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...rest}
    />
  )
}

export default AxisWordmark
