import type { ReactNode } from 'react'

import type { SxProps, Theme } from '@mui/material/styles'

export type NexaPromptDockVariant = 'compactDock' | 'inlinePanel' | 'floatingPrompt'

export type NexaPromptDockKind = 'quickAsk' | 'knowledgeAsk' | 'surfaceFollowUp' | 'contextualAction' | 'custom'

export type NexaPromptDockSubmitState = 'idle' | 'submitting' | 'success'

export interface NexaPromptDockCopy {
  collapsedLabel: string
  expandedLabel: string
  placeholder: string
  submitLabel: string
  closeLabel: string
  successLabel: string
  shortcutLabel: string
}

export interface NexaPromptDockProps {
  variant?: NexaPromptDockVariant
  kind?: NexaPromptDockKind
  copy?: Partial<NexaPromptDockCopy>
  helperText?: ReactNode
  value?: string
  defaultValue?: string
  open?: boolean
  defaultOpen?: boolean
  disabled?: boolean
  autoFocusOnOpen?: boolean
  successDurationMs?: number
  onOpenChange?: (open: boolean) => void
  onDraftChange?: (value: string) => void
  onSubmit?: (value: string) => void | Promise<void>
  dataCapture?: string
  sx?: SxProps<Theme>
}
