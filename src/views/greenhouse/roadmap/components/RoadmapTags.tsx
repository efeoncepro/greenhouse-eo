'use client'

/**
 * TASK-1153 — Micro-chips tonales del cockpit (kind, prioridad, salud).
 *
 * One-off tokenizado del cockpit (no va al registry de primitives): replica el
 * lenguaje de chips del diseño AXIS con tonos semánticos vía `toneSx`, sin HEX
 * inline. Iconos Tabler decorativos (`aria-hidden`).
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import type { RoadmapPriority } from '@/lib/roadmap/cockpit/types'
import type { WorkItemHealthLevel, WorkItemKind } from '@/lib/roadmap/work-item-index/types'

import { HEALTH_VISUAL, KIND_VISUAL, PRIORITY_TONE, toneSx, type TonePalette } from '../cockpit-tokens'

interface ToneTagProps {
  tone: TonePalette
  label: string
  icon?: string
  radius?: 'sm' | 'full'
  numeric?: boolean
}

/** Badge tonal genérico (fondo suave + ink AA). */
export const ToneTag = ({ tone, label, icon, radius = 'sm', numeric }: ToneTagProps) => (
  <Typography
    component='span'
    variant='caption'
    sx={[
      toneSx(tone),
      {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
        px: radius === 'full' ? 1.125 : 0.875,
        py: 0.375,
        borderRadius: radius === 'full' ? '9999px' : theme => `${theme.shape.customBorderRadius.sm}px`,
        fontWeight: 600,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        ...(numeric ? { fontFeatureSettings: "'tnum' 1" } : {})
      }
    ]}
  >
    {icon ? <i className={icon} aria-hidden='true' style={{ fontSize: 12, lineHeight: 0 }} /> : null}
    {label}
  </Typography>
)

export const KindTag = ({ kind }: { kind: WorkItemKind }) => {
  const visual = KIND_VISUAL[kind]

  return <ToneTag tone={visual.tone} icon={visual.icon} label={visual.label} />
}

export const PriorityTag = ({ priority, radius = 'sm' }: { priority: RoadmapPriority; radius?: 'sm' | 'full' }) => {
  if (!priority) return null

  return <ToneTag tone={PRIORITY_TONE[priority]} label={priority} radius={radius} numeric />
}

export const HealthIcon = ({ health }: { health: WorkItemHealthLevel }) => {
  const visual = HEALTH_VISUAL[health]

  return (
    <Box
      component='i'
      className={visual.icon}
      role='img'
      aria-label={visual.label}
      title={visual.label}
      sx={{ fontSize: 15, lineHeight: 0, color: `${visual.tone}.main` }}
    />
  )
}
