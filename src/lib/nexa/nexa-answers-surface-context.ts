/**
 * Nexa Answers — contrato de surface CANÓNICO (SSOT). TASK-1095 A1 / decisión del operador 2026-06-13.
 *
 * `NexaAnswersSurfaceContext` (y los tipos del contrato answer-surface) son el **único contrato
 * canónico** de la surface conversacional de Nexa. La decisión del operador (2026-06-13) eligió
 * `NexaAnswersCanvas` como la surface canónica de la lente Nexa por ser la más rica; el answer-trace
 * de TASK-1089/1090 (que ni siquiera modela un `surfaceContext`) **converge hacia este contrato**.
 *
 * Este módulo en `src/lib/nexa/` es el **punto de import canónico** del contrato — espeja el patrón
 * de `conversational-evidence.ts` (que el canvas ya consume). Las definiciones viven hoy en la capa
 * de primitives (`nexa-answers-canvas-types.ts`) por su acoplamiento a tipos de render; este re-export
 * las bendice como SSOT sin moverlas (cero churn del barrel, cero riesgo al render). La promoción física
 * de las definiciones + el split dominio/UI de los campos (A1 "merge allowedRenderers/allowedActions" +
 * A2 descomposición de estados) es el siguiente slice de TASK-1095, gateado por `fe:capture:diff`.
 *
 * Regla: consumidores NUEVOS (incluida la convergencia de answer-trace y el runtime de TASK-1101)
 * importan el contrato desde acá. NO crear un `surfaceContext` paralelo en otra surface.
 */
export type {
  NexaAnswersSurfaceContext,
  NexaAnswersCanvasState,
  NexaAnswersCanvasKind,
  NexaAnswersCanvasVariant,
  NexaAnswersCanvasDensity,
  NexaAnswersRendererKind,
  NexaAnswersIntent,
  NexaAnswersAutonomyTier,
  NexaAnswersActionRiskLevel,
  NexaAnswersResponseControl,
  NexaAnswersAction,
  NexaAnswersRenderPlan,
  NexaAnswersProofSpec,
  NexaAnswersReasoningStep,
  NexaAnswersSuggestedFollowUp
} from '@/components/greenhouse/primitives/nexa-answers-canvas/nexa-answers-canvas-types'
