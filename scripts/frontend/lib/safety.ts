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
 */
export const enforceProductionGate = (env: string, prodFlag: boolean): void => {
  if (env !== 'production') return

  const allowProd = process.env.GREENHOUSE_CAPTURE_ALLOW_PROD === 'true'

  if (!allowProd) {
    throw new Error(
      'Production captures bloqueadas.\n' +
        'Triple gate requerido:\n' +
        '  1. GREENHOUSE_CAPTURE_ALLOW_PROD=true en .env.local\n' +
        '  2. --prod flag en CLI\n' +
        '  3. Capability platform.frontend.capture_prod (futuro slice 2.1)'
    )
  }

  if (!prodFlag) {
    throw new Error('Production captures requieren --prod flag explícito (defense-in-depth, no solo env var)')
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
