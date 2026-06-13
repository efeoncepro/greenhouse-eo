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
export { default as GreenhouseButton } from './GreenhouseButton'
export type { GreenhouseButtonProps } from './GreenhouseButton'
export {
  default as GreenhouseFigmaNodeButton,
  buildFigmaNodeUrl,
  AXIS_FILE_KEY,
  AXIS_FILE_NAME
} from './GreenhouseFigmaNodeButton'
export type { GreenhouseFigmaNodeButtonProps } from './GreenhouseFigmaNodeButton'
export { default as GreenhouseBreadcrumbs } from './GreenhouseBreadcrumbs'
export type {
  GreenhouseBreadcrumbItem,
  GreenhouseBreadcrumbsProps
} from './GreenhouseBreadcrumbs'
export { default as GreenhouseVerificationBadge } from './GreenhouseVerificationBadge'
export type {
  GreenhouseVerificationBadgeKind,
  GreenhouseVerificationBadgeLocale,
  GreenhouseVerificationBadgeProps,
  GreenhouseVerificationBadgeSize
} from './GreenhouseVerificationBadge'
export { default as GreenhouseGradientBackground } from './gradient-background/GreenhouseGradientBackground'
export type {
  GreenhouseGradientBackgroundConfig,
  GreenhouseGradientBackgroundIntensity,
  GreenhouseGradientBackgroundKind,
  GreenhouseGradientBackgroundProps,
  GreenhouseGradientBackgroundVariant
} from './gradient-background/greenhouse-gradient-background-types'
export {
  buildGreenhouseGradientBackgroundConfig,
  buildGreenhouseGradientBackgroundCss,
  GREENHOUSE_GRADIENT_BACKGROUND_KIND_CONFIG,
  resolveGreenhouseGradientBackgroundKind,
  resolveGreenhouseGradientBackgroundVariant
} from './gradient-background/greenhouse-gradient-background-controller'
export type { GreenhouseGradientBackgroundKindConfig } from './gradient-background/greenhouse-gradient-background-controller'
export { default as GreenhouseBorderBeam } from './border-beam/GreenhouseBorderBeam'
export { default as GreenhouseSpectrumBeam } from './border-beam/GreenhouseSpectrumBeam'
export type { GreenhouseSpectrumBeamProps } from './border-beam/GreenhouseSpectrumBeam'
export { default as GreenhouseShinyBorder } from './border-beam/GreenhouseShinyBorder'
export type {
  GreenhouseShinyBorderIntensity,
  GreenhouseShinyBorderPalette,
  GreenhouseShinyBorderProps
} from './border-beam/GreenhouseShinyBorder'
export { default as GreenhouseSpotlightCard } from './border-beam/GreenhouseSpotlightCard'
export type {
  GreenhouseSpotlightCardKind,
  GreenhouseSpotlightCardProps,
  GreenhouseSpotlightCardSize
} from './border-beam/GreenhouseSpotlightCard'
export type {
  GreenhouseBorderBeamConfig,
  GreenhouseBorderBeamEffect,
  GreenhouseBorderBeamIntensity,
  GreenhouseBorderBeamKind,
  GreenhouseBorderBeamProps,
  GreenhouseBorderBeamSpectrumPalette,
  GreenhouseBorderBeamVariant
} from './border-beam/greenhouse-border-beam-types'
export {
  buildGreenhouseBorderBeamConfig,
  buildGreenhouseBorderBeamGradient,
  GREENHOUSE_BORDER_BEAM_KIND_CONFIG,
  resolveGreenhouseBorderBeamKind,
  resolveGreenhouseBorderBeamVariant
} from './border-beam/greenhouse-border-beam-controller'
export type { GreenhouseBorderBeamKindConfig } from './border-beam/greenhouse-border-beam-controller'
export { default as GreenhouseNexaBrandMark } from './GreenhouseNexaBrandMark'
export { default as GreenhouseNexaAnimatedMark } from './GreenhouseNexaAnimatedMark'
export type { GreenhouseNexaAnimatedMarkProps } from './GreenhouseNexaAnimatedMark'
export { default as NexaGlowBorder } from './NexaGlowBorder'
export type { NexaGlowBorderProps } from './NexaGlowBorder'
export { default as NexaComposer, NexaComposerInput, NexaComposerActionButton } from './NexaComposer'
export type {
  NexaComposerProps,
  NexaComposerInputProps,
  NexaComposerActionButtonProps,
  NexaComposerActionVariant
} from './NexaComposer'
export {
  NEXA_COMPOSER_KIND_CONFIG,
  NEXA_COMPOSER_VARIANT_CONFIG,
  resolveNexaComposerKind,
  resolveNexaComposerVariant
} from './nexa-composer-controller'
export type {
  NexaComposerKind,
  NexaComposerKindConfig,
  NexaComposerVariant,
  NexaComposerVariantConfig
} from './nexa-composer-controller'
export { default as NexaPromptDock } from './nexa-prompt-dock/NexaPromptDock'
export type {
  NexaPromptDockCopy,
  NexaPromptDockKind,
  NexaPromptDockProps,
  NexaPromptDockSubmitState,
  NexaPromptDockVariant
} from './nexa-prompt-dock/nexa-prompt-dock-types'
export {
  NEXA_PROMPT_DOCK_KIND_CONFIG,
  NEXA_PROMPT_DOCK_VARIANT_CONFIG,
  resolveNexaPromptDockCopy,
  resolveNexaPromptDockKind,
  resolveNexaPromptDockVariant
} from './nexa-prompt-dock/nexa-prompt-dock-controller'
export type {
  NexaPromptDockKindConfig,
  NexaPromptDockVariantConfig
} from './nexa-prompt-dock/nexa-prompt-dock-controller'
export { default as NexaFace, NEXA_FACE_SRC } from './NexaFace'
export type { NexaFaceProps, NexaFaceVariant } from './NexaFace'
export { default as NexaPresenceMark } from './NexaPresenceMark'
export type { NexaPresenceMarkProps } from './NexaPresenceMark'
export { default as NexaSenderMark } from './NexaSenderMark'
export type { NexaSenderMarkProps } from './NexaSenderMark'
export {
  default as NexaExpressiveText,
  getNexaExpressiveTextPlainText,
  hasExpressiveTextSegments
} from './nexa-expressive-text/NexaExpressiveText'
export type {
  NexaCitationSource,
  NexaExpressiveTextProps,
  NexaExpressiveTextSegment,
  NexaExpressiveTextStyle,
  NexaExpressiveTextValue
} from './nexa-expressive-text/nexa-expressive-text-types'
export { default as NexaEvidencePanel } from './NexaEvidencePanel'
export type { NexaEvidencePanelProps, NexaEvidencePanelVariant } from './NexaEvidencePanel'
export { default as NexaProvenanceTrace } from './nexa-provenance-trace/NexaProvenanceTrace'
export type {
  NexaProvenanceProofTab,
  NexaProvenanceProofTabBuiltin,
  NexaProvenanceStep,
  NexaProvenanceTone,
  NexaProvenanceTraceKind,
  NexaProvenanceTraceProps,
  NexaProvenanceTraceVariant,
  NexaProvenanceTrustCue
} from './nexa-provenance-trace/nexa-provenance-trace-types'
export {
  NEXA_PROVENANCE_TRACE_KIND_CONFIG,
  resolveNexaProvenanceTraceVariant
} from './nexa-provenance-trace/nexa-provenance-trace-controller'
export type { NexaProvenanceTraceKindConfig } from './nexa-provenance-trace/nexa-provenance-trace-controller'
export { default as NexaResponseToolbar } from './nexa-response-toolbar/NexaResponseToolbar'
export type {
  NexaResponseToolbarControl,
  NexaResponseToolbarKind,
  NexaResponseToolbarLabels,
  NexaResponseToolbarProps,
  NexaResponseToolbarVariant
} from './nexa-response-toolbar/nexa-response-toolbar-types'
export {
  NEXA_RESPONSE_TOOLBAR_KIND_CONFIG,
  resolveNexaResponseToolbarVariant
} from './nexa-response-toolbar/nexa-response-toolbar-controller'
export type { NexaResponseToolbarKindConfig } from './nexa-response-toolbar/nexa-response-toolbar-controller'
export { default as NexaStreamingText } from './nexa-streaming-text/NexaStreamingText'
export type { NexaStreamingTextMode, NexaStreamingTextProps } from './nexa-streaming-text/nexa-streaming-text-types'
export {
  computeRevealedPlainText,
  isRevealing,
  NEXA_STREAMING_TEXT_DEFAULT_FRACTION,
  NEXA_STREAMING_TEXT_DEFAULT_MIN_CHARS
} from './nexa-streaming-text/nexa-streaming-text-controller'
export { default as NexaKnowledgeAnswerSurface } from './NexaKnowledgeAnswerSurface'
export type {
  NexaKnowledgeAnswerModeOption,
  NexaKnowledgeAnswerSource,
  NexaKnowledgeAnswerSurfaceProps,
  NexaKnowledgeAnswerTraceStep,
  NexaKnowledgeAnswerTraceStepState
} from './NexaKnowledgeAnswerSurface'
export {
  NEXA_KNOWLEDGE_ANSWER_SURFACE_KIND_CONFIG,
  NEXA_KNOWLEDGE_ANSWER_SURFACE_VARIANT_CONFIG,
  resolveNexaKnowledgeAnswerSurfaceKind,
  resolveNexaKnowledgeAnswerSurfaceVariant
} from './nexa-knowledge-answer-surface-controller'
export type {
  NexaKnowledgeAnswerSurfaceKind,
  NexaKnowledgeAnswerSurfaceKindConfig,
  NexaKnowledgeAnswerSurfaceVariant,
  NexaKnowledgeAnswerSurfaceVariantConfig
} from './nexa-knowledge-answer-surface-controller'
export { default as NexaAnswerBubble, NexaCompactAnswerBubble } from './nexa-answer-bubble/NexaAnswerBubble'
export type {
  NexaAnswerAction,
  NexaAnswerActionPlanRisk,
  NexaAnswerActionPlanRiskSeverity,
  NexaAnswerActionPlanSpec,
  NexaAnswerActionPlanStep,
  NexaAnswerActionPlanTradeOff,
  NexaAnswerActionPlanTradeOffTone,
  NexaAnswerBubbleKind,
  NexaAnswerBubbleProps,
  NexaAnswerBubbleVariant,
  NexaAnswerChartCompositionPoint,
  NexaAnswerChartMode,
  NexaAnswerChartSeries,
  NexaAnswerChartSeriesPoint,
  NexaAnswerChartSpec,
  NexaAnswerChartTone,
  NexaAnswerMetricDeltaTone,
  NexaAnswerMetricSummaryItem,
  NexaAnswerMetricSummarySpec,
  NexaAnswerMetricTrendPoint,
  NexaAnswerPoint,
  NexaAnswerTrustCue,
  NexaCompactAnswerBubbleProps
} from './nexa-answer-bubble/nexa-answer-bubble-types'
export {
  NEXA_ANSWER_BUBBLE_KIND_CONFIG,
  NEXA_ANSWER_BUBBLE_VARIANT_CONFIG,
  resolveNexaAnswerBubbleVariant
} from './nexa-answer-bubble/nexa-answer-bubble-controller'
export type {
  NexaAnswerBubbleKindConfig,
  NexaAnswerBubbleVariantConfig
} from './nexa-answer-bubble/nexa-answer-bubble-controller'
export { default as NexaConversationBubble } from './nexa-conversation-bubble/NexaConversationBubble'
export type {
  NexaConversationBubbleAction,
  NexaConversationBubbleKind,
  NexaConversationBubbleProps,
  NexaConversationBubbleTone,
  NexaConversationBubbleVariant
} from './nexa-conversation-bubble/nexa-conversation-bubble-types'
export {
  NEXA_CONVERSATION_BUBBLE_KIND_CONFIG,
  NEXA_CONVERSATION_BUBBLE_VARIANT_CONFIG,
  resolveNexaConversationBubbleKind,
  resolveNexaConversationBubbleVariant
} from './nexa-conversation-bubble/nexa-conversation-bubble-controller'
export type {
  NexaConversationBubbleKindConfig,
  NexaConversationBubbleVariantConfig
} from './nexa-conversation-bubble/nexa-conversation-bubble-controller'
export { default as NexaAnswersCanvas } from './nexa-answers-canvas/NexaAnswersCanvas'
export type {
  NexaAnswersAction,
  NexaAnswersActionRiskLevel,
  NexaAnswersAutonomyTier,
  NexaAnswersBlockBase,
  NexaAnswersBubbleBlock,
  NexaAnswersCanvasCopy,
  NexaAnswersCanvasDensity,
  NexaAnswersCanvasKind,
  NexaAnswersCanvasMode,
  NexaAnswersCanvasProps,
  NexaAnswersCanvasSlots,
  NexaAnswersCanvasState,
  NexaAnswersCanvasVariant,
  NexaAnswersCompactAnswerBlock,
  NexaAnswersConversationBubbleBlock,
  NexaAnswersIntent,
  NexaAnswersProofSpec,
  NexaAnswersReasoningStep,
  NexaAnswersRenderBlock,
  NexaAnswersRendererKind,
  NexaAnswersRenderPlan,
  NexaAnswersResponseControl,
  NexaAnswersSuggestedFollowUp,
  NexaAnswersSurfaceContext
} from './nexa-answers-canvas/nexa-answers-canvas-types'
export {
  assertNexaAnswersRenderPlanAllowed,
  NEXA_ANSWERS_CANVAS_KIND_CONFIG,
  NEXA_ANSWERS_CANVAS_VARIANT_CONFIG,
  resolveNexaAnswersCanvasDensity,
  resolveNexaAnswersCanvasVariant
} from './nexa-answers-canvas/nexa-answers-canvas-controller'
export type {
  NexaAnswersCanvasKindConfig,
  NexaAnswersCanvasVariantConfig
} from './nexa-answers-canvas/nexa-answers-canvas-controller'
export {
  NEXA_ANSWERS_RENDERER_REGISTRY,
  renderNexaAnswersBlock
} from './nexa-answers-canvas/nexa-answers-canvas-renderers'
export type { NexaAnswersBlockRenderContext } from './nexa-answers-canvas/nexa-answers-canvas-renderers'
export { default as GreenhouseNexaAnimatedAskBadge } from './GreenhouseNexaAnimatedAskBadge'
export type { GreenhouseNexaAnimatedAskBadgeProps } from './GreenhouseNexaAnimatedAskBadge'
export { default as EfeonceOrbitalLogoMark } from './EfeonceOrbitalLogoMark'
export type { EfeonceOrbitalLogoMarkProps } from './EfeonceOrbitalLogoMark'
export {
  EFEONCE_ORBITAL_LOGO_COLOR,
  EFEONCE_ORBITAL_LOGO_KIND_CONFIG,
  resolveEfeonceOrbitalLogoAriaLabel,
  resolveEfeonceOrbitalLogoVariant
} from './efeonce-orbital-logo-controller'
export type {
  EfeonceOrbitalLogoKind,
  EfeonceOrbitalLogoKindConfig,
  EfeonceOrbitalLogoVariant
} from './efeonce-orbital-logo-controller'
// Claude experiment — variante de órbita completa con el hueco del anillo relleno.
export { default as ClaudeEfeonceFilledOrbitMark } from './ClaudeEfeonceFilledOrbitMark'
export type { ClaudeEfeonceFilledOrbitMarkProps } from './ClaudeEfeonceFilledOrbitMark'
export {
  GREENHOUSE_NEXA_BRAND_ASSETS,
  GREENHOUSE_NEXA_BRAND_COLORS,
  GREENHOUSE_NEXA_BRAND_KIND_CONFIG,
  GREENHOUSE_NEXA_BRAND_SIZE_CONFIG,
  resolveGreenhouseNexaBrandKind
} from './greenhouse-nexa-brand-controller'
export { default as GreenhouseThinkingBeat } from './GreenhouseThinkingBeat'
export type { GreenhouseThinkingBeatProps } from './GreenhouseThinkingBeat'
export { default as GreenhouseNexaGreeting } from './GreenhouseNexaGreeting'
export type { GreenhouseNexaGreetingProps } from './GreenhouseNexaGreeting'
export {
  GREENHOUSE_NEXA_GREETING_KIND_CONFIG,
  GREENHOUSE_NEXA_GREETING_VARIANT_CONFIG,
  resolveGreenhouseNexaGreetingKind,
  resolveGreenhouseNexaGreetingVariant
} from './greenhouse-nexa-greeting-controller'
export type {
  GreenhouseNexaGreetingKind,
  GreenhouseNexaGreetingKindConfig,
  GreenhouseNexaGreetingVariant,
  GreenhouseNexaGreetingVariantConfig
} from './greenhouse-nexa-greeting-controller'
export {
  GREENHOUSE_THINKING_BEAT_KIND_CONFIG,
  GREENHOUSE_THINKING_BEAT_MOTION,
  GREENHOUSE_THINKING_BEAT_VARIANT_CONFIG,
  resolveGreenhouseThinkingBeatKind,
  resolveGreenhouseThinkingBeatVariant
} from './greenhouse-thinking-beat-controller'
export type {
  GreenhouseThinkingBeatKind,
  GreenhouseThinkingBeatKindConfig,
  GreenhouseThinkingBeatVariant,
  GreenhouseThinkingBeatVariantConfig
} from './greenhouse-thinking-beat-controller'
export type {
  GreenhouseNexaBrandKind,
  GreenhouseNexaBrandKindConfig,
  GreenhouseNexaBrandSize
} from './greenhouse-nexa-brand-controller'
export { default as GreenhouseHealthSignalChart } from './GreenhouseHealthSignalChart'
export type {
  GreenhouseHealthSignalChartKind,
  GreenhouseHealthSignalChartProps,
  GreenhouseHealthSignalChartTone,
  GreenhouseHealthSignalChartVariant,
  GreenhouseHealthSignalSegment
} from './GreenhouseHealthSignalChart'
export { default as GreenhouseTalentProfileDossier } from './GreenhouseTalentProfileDossier'
export type {
  GreenhouseTalentDossierTone,
  GreenhouseTalentProfileDossierKind,
  GreenhouseTalentProfileDossierProps,
  GreenhouseTalentProfileDossierTalent,
  GreenhouseTalentProfileDossierVariant,
  GreenhouseTalentProfileHealth,
  GreenhouseTalentProfileMetric
} from './GreenhouseTalentProfileDossier'
export {
  GREENHOUSE_BUTTON_KIND_DEFAULT_TONE,
  GREENHOUSE_BUTTON_KIND_DEFAULT_VARIANT,
  GREENHOUSE_BUTTON_SIZE_TOKENS,
  GREENHOUSE_BUTTON_SIZES,
  GREENHOUSE_BUTTON_TONES,
  GREENHOUSE_BUTTON_VARIANT_CONFIG,
  GREENHOUSE_BUTTON_VARIANTS,
  resolveGreenhouseButtonTone,
  resolveGreenhouseButtonVariant
} from './greenhouse-button-controller'
export type {
  GreenhouseButtonKind,
  GreenhouseButtonSize,
  GreenhouseButtonTone,
  GreenhouseButtonVariant
} from './greenhouse-button-controller'
export {
  GREENHOUSE_BREADCRUMBS_KIND_DEFAULT_SEPARATOR,
  GREENHOUSE_BREADCRUMBS_KIND_DEFAULT_VARIANT,
  GREENHOUSE_BREADCRUMBS_VARIANT_CONFIG,
  GREENHOUSE_BREADCRUMBS_VARIANTS,
  resolveGreenhouseBreadcrumbsSeparator,
  resolveGreenhouseBreadcrumbsVariant
} from './greenhouse-breadcrumbs-controller'
export type {
  GreenhouseBreadcrumbsKind,
  GreenhouseBreadcrumbsSeparator,
  GreenhouseBreadcrumbsVariant
} from './greenhouse-breadcrumbs-controller'
export { default as GreenhouseChip } from './GreenhouseChip'
export type {
  GreenhouseChipKind,
  GreenhouseChipProps,
  GreenhouseChipSize,
  GreenhouseChipTone,
  GreenhouseChipVariant
} from './GreenhouseChip'
export { default as GreenhouseKpiDelta } from './GreenhouseKpiDelta'
export type {
  GreenhouseKpiDeltaDirection,
  GreenhouseKpiDeltaProps,
  GreenhouseKpiDeltaSize,
  GreenhouseKpiDeltaVariant
} from './GreenhouseKpiDelta'
export { default as GreenhouseStatusDot } from './GreenhouseStatusDot'
export type {
  GreenhouseStatusDotProps,
  GreenhouseStatusDotSize,
  GreenhouseStatusDotTone
} from './GreenhouseStatusDot'
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
export { default as GreenhouseInlineValidation } from './GreenhouseInlineValidation'
export type {
  GreenhouseInlineValidationProps,
  GreenhouseInlineValidationState,
  GreenhouseInlineValidationVariant
} from './GreenhouseInlineValidation'
export { default as GreenhouseFieldProvenancePeek } from './GreenhouseFieldProvenancePeek'
export type {
  GreenhouseFieldProvenanceConfidence,
  GreenhouseFieldProvenanceFreshness,
  GreenhouseFieldProvenancePeekProps,
  GreenhouseFieldProvenanceSource,
  GreenhouseFieldProvenanceVariant
} from './GreenhouseFieldProvenancePeek'
export { default as GreenhouseStepperProgressMicro } from './GreenhouseStepperProgressMicro'
export type {
  GreenhouseStepperProgressMicroProps,
  GreenhouseStepperProgressState,
  GreenhouseStepperProgressStep,
  GreenhouseStepperProgressVariant
} from './GreenhouseStepperProgressMicro'
export { default as GreenhouseEvidenceAttachmentDropzone } from './GreenhouseEvidenceAttachmentDropzone'
export type {
  GreenhouseEvidenceAttachmentDropzoneProps,
  GreenhouseEvidenceAttachmentState,
  GreenhouseEvidenceAttachmentVariant
} from './GreenhouseEvidenceAttachmentDropzone'
export { default as GreenhouseInlineDecisionPrompt } from './GreenhouseInlineDecisionPrompt'
export type {
  GreenhouseInlineDecisionPromptProps,
  GreenhouseInlineDecisionState,
  GreenhouseInlineDecisionTone,
  GreenhouseInlineDecisionVariant
} from './GreenhouseInlineDecisionPrompt'
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

// TASK-1033 — Greenhouse Floating Surface primitive (anchored contextual UI over
// @floating-ui/react). Product views consume this instead of importing the
// positioning engine directly. ADR: GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md
export { default as GreenhouseFloatingSurface } from './GreenhouseFloatingSurface'
export type {
  GreenhouseFloatingSurfaceAnchorProps,
  GreenhouseFloatingSurfaceContentProps,
  GreenhouseFloatingSurfaceProps
} from './GreenhouseFloatingSurface'
export {
  DEFAULT_FLOATING_SURFACE_VARIANT,
  FLOATING_SURFACE_VARIANTS,
  FLOATING_SURFACE_VARIANT_CONFIG,
  getFloatingSurfaceVariantConfig,
  resolveFloatingSurfaceVariant
} from './floating-surface-controller'
export type {
  GreenhouseFloatingSurfaceDensity,
  GreenhouseFloatingSurfaceInteraction,
  GreenhouseFloatingSurfaceKind,
  GreenhouseFloatingSurfaceMotion,
  GreenhouseFloatingSurfaceRole,
  GreenhouseFloatingSurfaceVariant,
  GreenhouseFloatingSurfaceVariantConfig
} from './floating-surface-controller'

// TASK-1072 — Disclosure Trigger (rotating "+" atom) + Anchored Disclosure (trigger + surface)
export { default as GreenhouseDisclosureTrigger } from './GreenhouseDisclosureTrigger'
export type { GreenhouseDisclosureTriggerProps } from './GreenhouseDisclosureTrigger'
export {
  DISCLOSURE_TRIGGER_VARIANT_CONFIG,
  getDisclosureTriggerVariantConfig,
  resolveDisclosureTriggerVariant
} from './disclosure-trigger-controller'
export type {
  GreenhouseDisclosureTriggerKind,
  GreenhouseDisclosureTriggerVariant,
  GreenhouseDisclosureTriggerVariantConfig
} from './disclosure-trigger-controller'
export { default as GreenhouseAnchoredDisclosure } from './GreenhouseAnchoredDisclosure'
export type {
  GreenhouseAnchoredDisclosureContentProps,
  GreenhouseAnchoredDisclosureProps
} from './GreenhouseAnchoredDisclosure'
export {
  ANCHORED_DISCLOSURE_VARIANT_CONFIG,
  getAnchoredDisclosureVariantConfig,
  resolveAnchoredDisclosureVariant
} from './anchored-disclosure-controller'
export type {
  GreenhouseAnchoredDisclosureKind,
  GreenhouseAnchoredDisclosureVariant,
  GreenhouseAnchoredDisclosureVariantConfig
} from './anchored-disclosure-controller'

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
export { default as GreenhouseChartCard } from './GreenhouseChartCard'
export { GREENHOUSE_CHART_CHROME_TOKENS } from './greenhouse-chart-controller'
export type {
  GreenhouseChartCardKind,
  GreenhouseChartCardProps,
  GreenhouseChartCardVariant,
  GreenhouseChartDatum,
  GreenhouseChartTab,
  GreenhouseChartTone
} from './GreenhouseChartCard'
export { default as GreenhouseStackedDistributionChartCard } from './GreenhouseStackedDistributionChartCard'
export type {
  GreenhouseStackedDistributionChartCardProps,
  GreenhouseStackedDistributionKind,
  GreenhouseStackedDistributionSegment,
  GreenhouseStackedDistributionTone,
  GreenhouseStackedDistributionVariant
} from './GreenhouseStackedDistributionChartCard'
export { default as GreenhouseMetricBreakdownChartCard } from './GreenhouseMetricBreakdownChartCard'
export type {
  GreenhouseMetricBreakdownChartCardKind,
  GreenhouseMetricBreakdownChartCardProps,
  GreenhouseMetricBreakdownChartCardVariant,
  GreenhouseMetricBreakdownDeltaTone,
  GreenhouseMetricBreakdownMetric,
  GreenhouseMetricBreakdownPoint,
  GreenhouseMetricBreakdownTone
} from './GreenhouseMetricBreakdownChartCard'
export { default as GreenhouseFunnelChartCard } from './GreenhouseFunnelChartCard'
export {
  GreenhouseFunnelDiagnosticsGrid,
  GreenhouseFunnelHeaderControls,
  GreenhouseFunnelKpiStrip,
  GreenhouseFunnelStageRail,
  GreenhouseFunnelStageSegment
} from './GreenhouseFunnelChartCard'
export {
  GREENHOUSE_FUNNEL_CHART_KIND_DEFAULT_VARIANT,
  GREENHOUSE_FUNNEL_CHART_TOKENS,
  GREENHOUSE_FUNNEL_CHART_ZONE_PRIMITIVES,
  GREENHOUSE_FUNNEL_CHART_VARIANTS,
  resolveGreenhouseFunnelChartVariant
} from './greenhouse-funnel-chart-controller'
export type {
  GreenhouseFunnelChartKind,
  GreenhouseFunnelChartVariant
} from './greenhouse-funnel-chart-controller'
export type {
  GreenhouseFunnelChartCardProps,
  GreenhouseFunnelDiagnosticsGridProps,
  GreenhouseFunnelDiagnosticTone,
  GreenhouseFunnelHeaderControlsProps,
  GreenhouseFunnelInsight,
  GreenhouseFunnelKpiStripProps,
  GreenhouseFunnelMetric,
  GreenhouseFunnelResolvedStage,
  GreenhouseFunnelStage,
  GreenhouseFunnelStageDiagnostic,
  GreenhouseFunnelStageRailProps,
  GreenhouseFunnelStageSegmentProps,
  GreenhouseFunnelTone
} from './GreenhouseFunnelChartCard'
export { default as GreenhouseActivityTimeline } from './GreenhouseActivityTimeline'
export { GREENHOUSE_ACTIVITY_TIMELINE_TOKENS } from './greenhouse-activity-timeline-controller'
export type {
  GreenhouseActivityTimelineAttachment,
  GreenhouseActivityTimelineAvatar,
  GreenhouseActivityTimelineItem,
  GreenhouseActivityTimelineKind,
  GreenhouseActivityTimelinePerson,
  GreenhouseActivityTimelineProps,
  GreenhouseActivityTimelineTone,
  GreenhouseActivityTimelineVariant
} from './GreenhouseActivityTimeline'
