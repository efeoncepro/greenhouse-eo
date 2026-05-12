/**
 * Safety helpers — 5 capas de defense-in-depth (Slice 2 enforcement).
 *
 * 1. Production triple gate (env var + flag + capability futuro)
 * 2. Auth gate (solo agent storage states)
 * 3. Output gate (siempre bajo .captures/)
 * 4. Secret mask (passwords + custom mask selectors)
 * 5. Audit log (append JSONL)
 */

import type { Page } from 'playwright'

/**
 * Selectores enmascarados por default durante el recording.
 * Playwright recordVideo no soporta `mask` directo; en su lugar usamos
 * page.locator(...).evaluate para aplicar CSS visibility:hidden a estos
 * elementos durante recording (limpio al final).
 *
 * Si la página NO tiene password inputs, los selectores no matchean → no-op.
 */
const DEFAULT_SECRET_MASK_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
  '[data-capture-mask="true"]'
]

export const applySecretMask = async (page: Page, extraSelectors: string[] = []): Promise<void> => {
  const all = [...DEFAULT_SECRET_MASK_SELECTORS, ...extraSelectors]

  await page.addStyleTag({
    content: `
      ${all.join(', ')} {
        filter: blur(8px) !important;
        color: transparent !important;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.55) !important;
      }
    `
  })
}

/**
 * Verifica triple gate para production. Llamado por env.ts pero también
 * desde el CLI como segundo check defense-in-depth.
 *
 * Triple gate canónico (V1.1):
 *   1. GREENHOUSE_CAPTURE_ALLOW_PROD=true (env var, .env.local)
 *   2. --prod flag (CLI)
 *   3. GREENHOUSE_CAPTURE_ACTOR_CAPABILITY=platform.frontend.capture_prod
 *      Actor debe haber confirmado capability vía export antes del run.
 *
 * Nota OQ-6: el check #3 NO valida PG runtime (la captura es local). El
 * operador exporta la env var asumiendo responsabilidad. El audit log
 * registra al actor y el run para forensic. PG-backed validation real
 * llega en V1.2 cuando integremos con `tenants/access.ts`.
 */
export const PRODUCTION_CAPABILITY = 'platform.frontend.capture_prod'

export const enforceProductionGate = (env: string, prodFlag: boolean): void => {
  if (env !== 'production') return

  const allowProd = process.env.GREENHOUSE_CAPTURE_ALLOW_PROD === 'true'

  if (!allowProd) {
    throw new Error(
      'Production captures bloqueadas — Triple Gate requerido:\n' +
        '  1. GREENHOUSE_CAPTURE_ALLOW_PROD=true en .env.local\n' +
        '  2. --prod flag en CLI\n' +
        `  3. GREENHOUSE_CAPTURE_ACTOR_CAPABILITY=${PRODUCTION_CAPABILITY}`
    )
  }

  if (!prodFlag) {
    throw new Error('Production captures requieren --prod flag explícito (defense-in-depth)')
  }

  const actorCap = process.env.GREENHOUSE_CAPTURE_ACTOR_CAPABILITY

  if (actorCap !== PRODUCTION_CAPABILITY) {
    throw new Error(
      `Production captures requieren capability declarada por el actor.\n` +
        `export GREENHOUSE_CAPTURE_ACTOR_CAPABILITY=${PRODUCTION_CAPABILITY}\n` +
        `Es responsabilidad del operador asegurarse de poseer la capability vigente.\n` +
        `El audit log queda registrado para forensic post-hoc.`
    )
  }
}

/**
 * Output gate: previene escapes del path canónico .captures/.
 */
export const assertSafeOutputPath = (path: string, repoRoot: string): void => {
  const normalized = path.replace(/\\/g, '/')
  const expectedPrefix = `${repoRoot.replace(/\\/g, '/')}/.captures/`

  if (!normalized.startsWith(expectedPrefix)) {
    throw new Error(
      `Output path inseguro: ${path}\n` +
        `Las capturas SIEMPRE deben ir bajo .captures/ (gitignored). Path canónico:\n` +
        `  ${expectedPrefix}<timestamp>_<scenario>/`
    )
  }
}
