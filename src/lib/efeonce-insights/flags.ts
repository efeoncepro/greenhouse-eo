/**
 * TASK-1845 — flags de runtime de Efeonce Insights (default OFF; fila en
 * `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`). Cada runtime declara su lectura:
 * Vercel (commands/API/MCP) y el artifact-worker (Cloud Run Job) para el render (TASK-1846):
 * `INSIGHTS_RENDER_ENABLED` se declara en `services/artifact-worker/deploy.sh` (SoT) y en Vercel.
 * No interpretar NODE_ENV como entorno.
 */

const isOn = (value: string | undefined): boolean => value === 'true'

/** Habilita crear ediciones y recolectar evidencia (createEdition/revise). */
export const isInsightsGenerationEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_GENERATION_ENABLED)

/** Habilita cruzar el gate humano de emisión (issue). Independiente de generación. */
export const isInsightsIssuanceEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_ISSUANCE_ENABLED)

/** Habilita la autoría IA acotada del plan editorial; OFF ⇒ fallback determinista. */
export const isInsightsAuthoringAiEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_AUTHORING_AI_ENABLED)

/**
 * Habilita el render durable (encolar outputs y que el artifact-worker los reclame). SEPARADO de
 * `ARTIFACT_RENDER_JOBS_ENABLED`: encender Insights jamás enciende Proposal ni al revés. Se lee en
 * DOS runtimes — Vercel (command de encolado) y el artifact-worker (claim) — y debe estar ON en ambos.
 */
export const isInsightsRenderEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_RENDER_ENABLED)

/**
 * TASK-1848 — habilita crear/revocar enlaces compartidos y servir el reader público por token.
 * Se lee SÓLO en Vercel (commands + `/api/public/insights/shared/**`). Con el flag OFF el reader
 * público responde 404 (no revela que el token existió) y los commands `sharing_disabled` (503).
 */
export const isInsightsSharingEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_SHARING_ENABLED)

/**
 * TASK-1848 — habilita solicitar envíos por correo (Vercel: `requestInsightDelivery`) y DESPACHARLOS
 * (`ops-worker`: projection reactiva). Se lee en DOS runtimes y debe estar ON en ambos; el EmailType
 * tiene además su kill switch propio en `email_type_config` (nace apagado).
 */
export const isInsightsDeliveryEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.INSIGHTS_DELIVERY_ENABLED)
