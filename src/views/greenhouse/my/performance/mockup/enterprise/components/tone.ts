// TASK-1075 — shared tone → palette resolver for the performance brief modules.
import type { Theme } from '@mui/material/styles'

import type { BriefTone } from '../data'

export const toneColor = (theme: Theme, tone: BriefTone): string =>
  tone === 'neutral' ? theme.palette.text.disabled : theme.palette[tone].main

export const deltaColor = (theme: Theme, good: boolean | null): string =>
  good === null ? theme.palette.text.disabled : good ? theme.palette.success.main : theme.palette.error.main
