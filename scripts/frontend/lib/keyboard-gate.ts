/**
 * Keyboard / focus / reduced-motion gate (TASK-1018 Slice 5).
 *
 * Corre rutas de teclado declarativas (Tab/Enter/Space/Escape/Arrows) sobre la
 * página viva, captura un frame por probe y verifica:
 *  - foco esperado (`document.activeElement` matchea el selector);
 *  - focus ring visible (outline o box-shadow);
 *  - estado esperado tras la acción (selector visible/oculto);
 *  - bajo reduced-motion, que el feedback esencial NO se pierda.
 *
 * No exige animación; exige feedback usable. Warning-first salvo `failOnViolations`.
 */

import type { Page } from 'playwright'

import { FINDING_CODES } from './failure-taxonomy'
import type { CaptureFinding } from './manifest'
import type { CaptureKeyboardProbe, CaptureKeyboardQualityOptions } from './scenario'

export interface KeyboardGateContext {
  page: Page
  options: CaptureKeyboardQualityOptions
  mark: (label: string, note?: string) => Promise<void>
  addFinding: (finding: CaptureFinding) => void
}

const isVisible = async (page: Page, selector: string): Promise<boolean> => {
  try {
    return await page.locator(selector).first().isVisible({ timeout: 500 })
  } catch {
    return false
  }
}

const activeElementMatches = async (page: Page, selector: string): Promise<boolean> =>
  page.evaluate(sel => {
    const active = document.activeElement

    return Boolean(active && active.matches(sel))
  }, selector)

const activeElementHasFocusRing = async (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const active = document.activeElement

    if (!active || active === document.body) return false

    const style = getComputedStyle(active)
    const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') > 0
    const hasShadow = style.boxShadow !== 'none' && style.boxShadow !== ''

    return hasOutline || hasShadow
  })

const runProbeKeys = async (page: Page, probe: CaptureKeyboardProbe): Promise<void> => {
  if (probe.startSelector) {
    await page.locator(probe.startSelector).first().focus({ timeout: 2000 })
  }

  for (const key of probe.keys) {
    await page.keyboard.press(key === 'Space' ? ' ' : key)
    await page.waitForTimeout(60)
  }
}

export const runKeyboardGate = async (ctx: KeyboardGateContext): Promise<void> => {
  const { page, options, mark, addFinding } = ctx
  const severity: CaptureFinding['severity'] = options.failOnViolations ? 'error' : 'warning'

  for (const probe of options.probes) {
    try {
      await runProbeKeys(page, probe)
      await mark(`keyboard-${probe.name}`, `Keyboard route: ${probe.keys.join(' → ')}`)

      if (probe.expectedFocusSelector) {
        const focused = await activeElementMatches(page, probe.expectedFocusSelector)

        if (!focused) {
          addFinding({
            severity,
            category: 'keyboard',
            code: FINDING_CODES.keyboard_focus_mismatch,
            message: `Tras "${probe.keys.join(' → ')}" el foco no quedó en "${probe.expectedFocusSelector}".`,
            selector: probe.expectedFocusSelector
          })
        }
      }

      if (probe.requireVisibleFocusRing !== false) {
        const hasRing = await activeElementHasFocusRing(page)

        if (!hasRing) {
          addFinding({
            severity,
            category: 'keyboard',
            code: FINDING_CODES.keyboard_focus_ring_missing,
            message: `El elemento enfocado tras "${probe.name}" no tiene focus ring visible (outline/box-shadow).`
          })
        }
      }

      let expectedVisibleHeldNormally = false

      if (probe.expectedVisibleSelector) {
        expectedVisibleHeldNormally = await isVisible(page, probe.expectedVisibleSelector)

        if (!expectedVisibleHeldNormally) {
          addFinding({
            severity,
            category: 'keyboard',
            code: FINDING_CODES.keyboard_expected_state_missing,
            message: `Tras "${probe.name}" no quedó visible "${probe.expectedVisibleSelector}".`,
            selector: probe.expectedVisibleSelector
          })
        }
      }

      if (probe.expectedHiddenSelector && (await isVisible(page, probe.expectedHiddenSelector))) {
        addFinding({
          severity,
          category: 'keyboard',
          code: FINDING_CODES.keyboard_expected_state_missing,
          message: `Tras "${probe.name}" "${probe.expectedHiddenSelector}" debía estar oculto pero sigue visible.`,
          selector: probe.expectedHiddenSelector
        })
      }

      if (options.reducedMotionCheck && probe.expectedVisibleSelector && expectedVisibleHeldNormally) {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await runProbeKeys(page, probe)
        await mark(`keyboard-${probe.name}-reduced-motion`, 'Reduced-motion feedback evidence')

        const stillVisible = await isVisible(page, probe.expectedVisibleSelector)

        await page.emulateMedia({ reducedMotion: 'no-preference' })

        if (!stillVisible) {
          addFinding({
            severity,
            category: 'keyboard',
            code: FINDING_CODES.keyboard_reduced_motion_feedback_lost,
            message: `Bajo reduced-motion el feedback "${probe.expectedVisibleSelector}" se perdió — la UI depende de animación para comunicar el cambio.`,
            selector: probe.expectedVisibleSelector
          })
        }
      }
    } catch (err) {
      addFinding({
        severity: 'warning',
        category: 'keyboard',
        code: FINDING_CODES.keyboard_probe_failed,
        message: `Keyboard probe "${probe.name}" falló: ${err instanceof Error ? err.message : String(err)}`
      })
    }
  }
}
