/**
 * TASK-1845 — flags de runtime de Efeonce Insights (default OFF; fila en
 * `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`). Cada runtime declara su lectura:
 * hoy sólo Vercel (commands/API/MCP); el worker de render (TASK-1846) declarará la suya.
 * No interpretar NODE_ENV como entorno.
 */

const isOn = (value: string | undefined): boolean => value === 'true'

/** Habilita crear ediciones y recolectar evidencia (createEdition/revise). */
export const isInsightsGenerationEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_GENERATION_ENABLED)

/** Habilita cruzar el gate humano de emisión (issue). Independiente de generación. */
export const isInsightsIssuanceEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_ISSUANCE_ENABLED)

/** Habilita la autoría IA acotada del plan editorial; OFF ⇒ fallback determinista. */
export const isInsightsAuthoringAiEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_AUTHORING_AI_ENABLED)
