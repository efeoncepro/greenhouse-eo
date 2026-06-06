export { default as ContextChip } from './ContextChip'
export type { ContextChipProps, ContextChipStatus, ContextChipProminence } from './ContextChip'
export { default as ContextChipStrip } from './ContextChipStrip'
export type { ContextChipStripProps } from './ContextChipStrip'
export { default as FieldsProgressChip } from './FieldsProgressChip'
export type { FieldsProgressChipProps } from './FieldsProgressChip'
export { default as SaveStateIndicator } from './SaveStateIndicator'
export type { SaveStateIndicatorProps, SaveStateKind } from './SaveStateIndicator'
export { default as GreenhouseAsyncActionButton } from './GreenhouseAsyncActionButton'
export type {
  GreenhouseAsyncActionButtonProps,
  GreenhouseAsyncActionState
} from './GreenhouseAsyncActionButton'
export { default as GreenhouseCommandFeedback } from './GreenhouseCommandFeedback'
export type {
  GreenhouseCommandFeedbackProps,
  GreenhouseCommandFeedbackTone
} from './GreenhouseCommandFeedback'
export { default as GreenhouseStateTransition } from './GreenhouseStateTransition'
export type {
  GreenhouseStateTransitionProps,
  GreenhouseStateTransitionTone,
  GreenhouseStateTransitionVariant
} from './GreenhouseStateTransition'
export { default as MarginHealthChip } from './MarginHealthChip'
export type {
  MarginClassification,
  MarginHealthChipProps,
  MarginTierRange
} from './MarginHealthChip'
export { default as TotalsLadder } from './TotalsLadder'
export type {
  TotalsLadderAddonsSegment,
  TotalsLadderCurrency,
  TotalsLadderProps
} from './TotalsLadder'
export { default as InlineNumericEditor } from './InlineNumericEditor'
export type { InlineNumericEditorProps, InlineNumericEditorCurrency } from './InlineNumericEditor'

// TASK-498 — Sprint 3 primitives extraction (Quote Builder generalization)
export { default as EntitySummaryDock } from './EntitySummaryDock'
export type {
  EntitySummaryDockProps,
  EntitySummaryDockCta,
  EntitySummaryDockSaveState
} from './EntitySummaryDock'
export { default as CardHeaderWithBadge } from './CardHeaderWithBadge'
export type {
  CardHeaderWithBadgeProps,
  CardHeaderBadgeColor,
  CardHeaderBadgeVariant
} from './CardHeaderWithBadge'
export { default as FormSectionAccordion } from './FormSectionAccordion'
export type { FormSectionAccordionProps } from './FormSectionAccordion'
export { default as OperationalPanel } from './OperationalPanel'
export type { OperationalPanelProps } from './OperationalPanel'
export { default as OperationalStatusBadge } from './OperationalStatusBadge'
export type { OperationalStatusBadgeProps, OperationalStatusTone } from './OperationalStatusBadge'
export { default as MetricSummaryCard } from './MetricSummaryCard'
export type { MetricSummaryCardProps } from './MetricSummaryCard'
export { default as OperationalSignalList } from './OperationalSignalList'
export type {
  OperationalSignalItem,
  OperationalSignalListProps,
  OperationalSignalTone
} from './OperationalSignalList'
export { default as AdaptiveSidecarLayout } from './AdaptiveSidecarLayout'
export type { AdaptiveSidecarLayoutProps } from './AdaptiveSidecarLayout'
export { default as ContextualSidecar } from './ContextualSidecar'
export type {
  ContextualSidecarChrome,
  ContextualSidecarProps,
  ContextualSidecarState,
  ContextualSidecarVariant
} from './ContextualSidecar'
export {
  ContextualSidecarComparisonRows,
  ContextualSidecarMetricStrip,
  ContextualSidecarProgress,
  ContextualSidecarRunbookSteps,
  ContextualSidecarSection,
  ContextualSidecarSignal,
  ContextualSidecarTimeline
} from './ContextualSidecarBlocks'
export type {
  ContextualSidecarComparisonRow,
  ContextualSidecarMetric,
  ContextualSidecarRunbookStep,
  ContextualSidecarSignalProps,
  ContextualSidecarTimelineItem
} from './ContextualSidecarBlocks'
export { AdaptiveSidecarShellProvider, useAdaptiveSidecarShell } from './adaptive-sidecar-shell-context'
export type {
  AdaptiveSidecarShellReflowTarget,
  AdaptiveSidecarShellReservation
} from './adaptive-sidecar-shell-context'
export { default as ShellFloatingActionDock } from './ShellFloatingActionDock'
export type { ShellFloatingActionDockProps } from './ShellFloatingActionDock'
export { default as GreenhouseLoadingSurface } from './GreenhouseLoadingSurface'
export {
  GreenhouseCheckpointRailLoader,
  GreenhouseDocumentPipelineLoader,
  GreenhouseExternalHandoffLoader,
  GreenhouseInlineActionLoader,
  GreenhouseNexaReasoningLoader,
  GreenhousePageSkeletonLoader,
  GreenhousePanelSkeletonLoader,
  GreenhouseReconciliationMatchingLoader,
  GreenhouseSecureActionLoader,
  GreenhouseTableSkeletonLoader,
  GreenhouseUploadVerificationLoader,
  GreenhouseWorkspaceBootLoader
} from './GreenhouseLoadingSurface'
export type {
  GreenhouseNamedLoadingSurfaceProps,
  GreenhouseLoadingStep,
  GreenhouseLoadingSurfaceKind,
  GreenhouseLoadingSurfaceProps,
  GreenhouseLoadingSurfaceVariant
} from './GreenhouseLoadingSurface'
export {
  buildSidecarSearchParams,
  canReplaceAdaptiveSidecar,
  createAdaptiveSidecarEvent,
  removeSidecarSearchParams,
  reduceAdaptiveSidecarState,
  resolveAdaptiveSidecarVariant,
  resolveAdaptiveSidecarMode
} from './adaptive-sidecar-controller'
export type {
  AdaptiveSidecarControllerAction,
  AdaptiveSidecarControllerLastAction,
  AdaptiveSidecarControllerState,
  AdaptiveSidecarKind,
  AdaptiveSidecarPreferredMode,
  AdaptiveSidecarResolvedMode,
  AdaptiveSidecarSearchParamsInput,
  AdaptiveSidecarSide,
  AdaptiveSidecarTelemetryEvent,
  AdaptiveSidecarTelemetryEventName,
  AdaptiveSidecarVariant
} from './adaptive-sidecar-controller'

// Reusable KPI trend card — interactive month-over-month area chart (Recharts):
// hover tooltip + crosshair, zone-tone semaphore, edge-to-edge line with inset
// aligned dots/labels, draw-in + hover-lift microinteractions, a11y table.
export { default as MetricTrendCard } from './MetricTrendCard'
export type { MetricTrendCardProps, MetricTrendPoint, MetricTrendTone } from './MetricTrendCard'
