import 'server-only'

/**
 * Flag de cutover de PRESENTACIÓN del lens Nexa de `/knowledge` (TASK-1101): el `NexaAnswersCanvas` rico
 * vs el answer-trace legacy. Default OFF → al merge la superficie viva queda exactamente como hoy.
 *
 * Ortogonal a `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (TASK-1085, que habilita el RETRIEVAL de Nexa): esto solo
 * decide QUÉ UI renderiza la lente, no si Nexa puede recuperar. No conflar ambos flags.
 */
export const isKnowledgeCanvasLensEnabled = (): boolean => process.env.NEXA_ANSWERS_CANVAS_LENS_ENABLED === 'true'
