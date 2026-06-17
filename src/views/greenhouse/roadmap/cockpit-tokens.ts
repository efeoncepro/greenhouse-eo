/**
 * TASK-1153 — Tokens visuales del cockpit de Roadmap (mapeo semántico → theme).
 *
 * Mapea kind / lane / prioridad / salud a un rol semántico (`primary`, `info`,
 * `error`, …) + un icono Tabler. La resolución a color real ocurre vía sx:
 * feedback tones consumen `theme.greenhouseSemantic.*` y brand tones consumen
 * palette tokens MUI/Vuexy. NUNCA HEX inline.
 */
import type { Theme } from '@mui/material/styles'

import { GH_ROADMAP } from '@/lib/copy/roadmap'
import type { RoadmapLaneId, RoadmapPriority } from '@/lib/roadmap/cockpit/types'
import type { WorkItemHealthLevel, WorkItemKind } from '@/lib/roadmap/work-item-index/types'

/** Rol de paleta MUI/Vuexy + `neutral` (gris) para tonos sin semántica fuerte. */
export type TonePalette = 'primary' | 'secondary' | 'info' | 'error' | 'warning' | 'success' | 'neutral'

const FEEDBACK_TONES = ['info', 'error', 'warning', 'success'] as const

const isFeedbackTone = (tone: TonePalette): tone is (typeof FEEDBACK_TONES)[number] =>
  (FEEDBACK_TONES as readonly TonePalette[]).includes(tone)

type ToneSxObject = {
  backgroundColor: string
  borderColor?: string
  color: string
}

/** sx canónico para un chip/badge tonal: fondo suave + ink AA. */
export const toneSx = (tone: TonePalette): ((theme: Theme) => ToneSxObject) => theme => {
  if (tone === 'neutral') {
    return { backgroundColor: theme.palette.action.hover, color: theme.palette.text.secondary }
  }

  if (isFeedbackTone(tone)) {
    const semantic = theme.greenhouseSemantic[tone]

    return {
      backgroundColor: semantic.tonalSurface,
      borderColor: semantic.tonalBorder,
      color: semantic.tonalText
    }
  }

  return {
    backgroundColor: theme.palette[tone].lightOpacity ?? `var(--mui-palette-${tone}-lightOpacity)`,
    color: theme.palette[tone].main
  }
}

/** Color de acento (border-left de la card, punto de lane). */
export const toneAccent = (tone: TonePalette): string =>
  tone === 'neutral' ? 'var(--mui-palette-divider)' : `var(--mui-palette-${tone}-main)`

export interface KindVisual {
  label: string
  icon: string
  tone: TonePalette
}

export const KIND_VISUAL: Record<WorkItemKind, KindVisual> = {
  epic: { label: GH_ROADMAP.kindLabels.epic, icon: 'tabler-stack-2', tone: 'primary' },
  task: { label: GH_ROADMAP.kindLabels.task, icon: 'tabler-checkbox', tone: 'info' },
  mini_task: { label: GH_ROADMAP.kindLabels.mini_task, icon: 'tabler-git-branch', tone: 'secondary' },
  issue: { label: GH_ROADMAP.kindLabels.issue, icon: 'tabler-alert-hexagon', tone: 'error' }
}

export interface LaneVisual {
  title: string
  icon: string
  tone: TonePalette
}

export const LANE_VISUAL: Record<RoadmapLaneId, LaneVisual> = {
  programs: { title: GH_ROADMAP.lanes.programs.title, icon: 'tabler-stack-2', tone: 'primary' },
  ready: { title: GH_ROADMAP.lanes.ready.title, icon: 'tabler-player-play', tone: 'success' },
  blocked: { title: GH_ROADMAP.lanes.blocked.title, icon: 'tabler-lock', tone: 'error' },
  issues: { title: GH_ROADMAP.lanes.issues.title, icon: 'tabler-alert-triangle', tone: 'warning' },
  grooming: { title: GH_ROADMAP.lanes.grooming.title, icon: 'tabler-eye-search', tone: 'warning' },
  progress: { title: GH_ROADMAP.lanes.progress.title, icon: 'tabler-progress', tone: 'info' },
  done: { title: GH_ROADMAP.lanes.done.title, icon: 'tabler-circle-check', tone: 'neutral' }
}

export const PRIORITY_TONE: Record<Exclude<RoadmapPriority, null>, TonePalette> = {
  P0: 'error',
  P1: 'warning',
  P2: 'info',
  P3: 'neutral'
}

export interface HealthVisual {
  label: string
  icon: string
  tone: TonePalette
}

export const HEALTH_VISUAL: Record<WorkItemHealthLevel, HealthVisual> = {
  ok: { label: GH_ROADMAP.healthLabels.ok, icon: 'tabler-circle-check', tone: 'success' },
  needs_grooming: { label: GH_ROADMAP.healthLabels.needs_grooming, icon: 'tabler-alert-triangle', tone: 'warning' },
  legacy: { label: GH_ROADMAP.healthLabels.legacy, icon: 'tabler-history', tone: 'warning' }
}

/** Icono del meta de la card, según su lane/kind. */
export const metaIcon = (lane: RoadmapLaneId, kind: WorkItemKind): string => {
  if (kind === 'epic') return 'tabler-subtask'
  if (kind === 'issue') return 'tabler-server-bolt'
  if (lane === 'blocked') return 'tabler-lock'
  if (lane === 'progress') return 'tabler-progress'
  if (lane === 'grooming') return 'tabler-alert-triangle'
  if (lane === 'done') return 'tabler-circle-check'

  return 'tabler-circle-check'
}

/** Las 7 tiles del summary band, en orden, con su icono + tono. */
export const SUMMARY_TILES: { key: keyof typeof GH_ROADMAP.tiles; icon: string; tone: TonePalette }[] = [
  { key: 'total', icon: 'tabler-list-details', tone: 'primary' },
  { key: 'programs', icon: 'tabler-stack-2', tone: 'primary' },
  { key: 'ready', icon: 'tabler-player-play', tone: 'success' },
  { key: 'blocked', icon: 'tabler-lock', tone: 'error' },
  { key: 'issues', icon: 'tabler-alert-triangle', tone: 'warning' },
  { key: 'grooming', icon: 'tabler-eye-search', tone: 'warning' },
  { key: 'progress', icon: 'tabler-progress', tone: 'info' }
]
