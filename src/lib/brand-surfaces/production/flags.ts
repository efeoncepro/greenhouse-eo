/**
 * TASK-1921 — flag del render gobernado de piezas de marca (default OFF; fila en
 * `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`). Se lee en TRES runtimes y debe estar igual en los tres:
 *   - Vercel: el command de encolado (`requestBrandRender`, endpoint y MCP). OFF ⇒ `render_disabled` (503).
 *   - ops-worker: el despachador `/artifact-render/dispatch`. OFF ⇒ no lanza el Job por esta cola.
 *   - Job `artifact-worker`: `isEnabled()` del consumer. OFF ⇒ no reclama jobs.
 * Separado de `ARTIFACT_RENDER_JOBS_ENABLED` (Proposal) e `INSIGHTS_RENDER_ENABLED`: encender uno nunca enciende otro.
 * En Cloud Run el SoT es `deploy.sh` de cada servicio (`--set-env-vars` es destructivo).
 */
const isOn = (value: string | undefined): boolean => value === 'true'

export const isBrandRenderEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isOn(env.BRAND_RENDER_ENABLED)
