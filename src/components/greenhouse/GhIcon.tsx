'use client'

import type { CSSProperties } from 'react'

import { resolveGhIcon } from './gh-icon-registry'
import type { GhIconName } from './gh-icon-registry'

export type GhIconProps = {
  icon: GhIconName
  size?: number | string
  color?: string
  className?: string
  style?: CSSProperties
  decorative?: boolean
  label?: string
}

const normalizeSize = (size: number | string | undefined) => {
  if (typeof size === 'number') {
    return `${size}px`
  }

  return size
}

const GhIcon = ({
  icon,
  size = 18,
  color,
  className,
  style,
  decorative = true,
  label
}: GhIconProps) => {
  const resolved = resolveGhIcon(icon)
  const mergedClassName = [resolved.className, className].filter(Boolean).join(' ')

  return (
    <i
      className={mergedClassName}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : label || resolved.label}
      role={decorative ? undefined : 'img'}
      style={{
        fontSize: normalizeSize(size),
        lineHeight: 1,
        color,
        display: 'inline-flex',
        ...style
      }}
    />
  )
}

export default GhIcon

