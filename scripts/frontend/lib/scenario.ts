/**
 * Scenario DSL canónico para capturas visuales.
 *
 * Un scenario describe una secuencia lineal de pasos que actuán sobre la UI
 * y emiten frames PNG en puntos clave (`mark`). El runtime ejecuta los steps
 * en orden, respeta timeouts, y produce el manifest.json final.
 *
 * Mutating vs read-only:
 * - Por default `mutating: false` — solo hover / click / wait / mark / scroll /
 *   keyboard en UI no-mutating (tabs, filters, drawers, accordions).
 * - Si el scenario necesita mutar (form submit, API write), debe declarar
 *   `mutating: true` Y `safeForCapture: true`. Esto previene capturas que
 *   accidentalmente creen entidades reales en staging.
 */

import type { Page } from 'playwright'

export interface CaptureScenarioStep {
  /** Tipo de step (state machine cerrado) */
  kind: 'wait' | 'mark' | 'hover' | 'click' | 'scroll' | 'fill' | 'press' | 'sleep'

  /** Selector Playwright (CSS / role= / text= / xpath=) */
  selector?: string

  /** Para `mark`: label del frame (formará parte del filename). Snake_case-ish */
  label?: string

  /** Timeout en ms para `wait` step (espera selector). Default 5000 */
  timeout?: number

  /** Duración en ms para `sleep` step (delay puro, no espera selector) */
  ms?: number

  /** Para `fill`: valor a tipear. NO usar para passwords/secrets (masked) */
  value?: string

  /** Para `press`: key sequence (e.g. 'Enter', 'Escape', 'Control+K') */
  key?: string

  /** Para `scroll`: y offset en px (positivo down, negativo up) */
  scrollY?: number

  /** Comentario opcional, va a manifest.json */
  note?: string
}

export interface CaptureScenario {
  /** Nombre canónico (kebab-case) — usado en path output */
  name: string

  /** Ruta del portal a capturar */
  route: string

  /** Viewport por default. V1.1 puede aceptar `device` */
  viewport: { width: number; height: number }

  /** Permite steps mutating (fill + click submit, etc.) */
  mutating?: boolean

  /** Confirmación explícita opt-in cuando mutating=true */
  safeForCapture?: boolean

  /** Hold ms post-mount antes de step 0 (default 1500 — aguarda hydration) */
  initialHoldMs?: number

  /** Hold ms al final (default 500 — captura el último estado) */
  finalHoldMs?: number

  /** Lista de selectores extra a enmascarar en el recording (passwords ya masked por default) */
  extraMaskSelectors?: string[]

  /** Steps en orden */
  steps: CaptureScenarioStep[]
}

export interface ScenarioRunContext {
  page: Page
  outputDir: string
  log: (msg: string) => void
  /** Llamado por step `mark` — captura sync PNG + agrega entry a manifest */
  onMark: (label: string, note?: string) => Promise<void>
}

const DEFAULT_TIMEOUT = 5000

export const validateScenario = (s: CaptureScenario): void => {
  if (!s.name || !/^[a-z0-9-]+$/.test(s.name)) {
    throw new Error(`scenario.name inválido (kebab-case requerido): "${s.name}"`)
  }

  if (!s.route.startsWith('/')) {
    throw new Error(`scenario.route debe empezar con /: "${s.route}"`)
  }

  if (s.mutating && !s.safeForCapture) {
    throw new Error(`scenario "${s.name}" marcado mutating:true requiere safeForCapture:true explícito`)
  }

  const usedLabels = new Set<string>()

  for (const [index, step] of s.steps.entries()) {
    if (step.kind === 'mark') {
      if (!step.label) throw new Error(`step ${index} (mark) requiere label`)

      if (usedLabels.has(step.label)) {
        throw new Error(`step ${index}: label "${step.label}" duplicado`)
      }

      usedLabels.add(step.label)
    }

    const mutatingKinds = new Set(['fill', 'press'])
    const mutatingClick = step.kind === 'click' && s.mutating

    if ((mutatingKinds.has(step.kind) || mutatingClick) && !s.mutating) {
      // hover + non-mutating click + wait + mark + sleep + scroll permitidos siempre.
      // fill / press / click-when-mutating requieren scenario.mutating=true.
      if (step.kind === 'fill' || step.kind === 'press') {
        throw new Error(`step ${index} (${step.kind}) requiere scenario.mutating:true + safeForCapture:true`)
      }
    }
  }
}

export const runStep = async (
  step: CaptureScenarioStep,
  index: number,
  ctx: ScenarioRunContext
): Promise<void> => {
  const stepLabel = `step ${index} (${step.kind}${step.label ? `: ${step.label}` : ''})`

  ctx.log(`→ ${stepLabel}`)

  switch (step.kind) {
    case 'wait': {
      if (!step.selector) throw new Error(`${stepLabel} requiere selector`)
      await ctx.page.waitForSelector(step.selector, { timeout: step.timeout ?? DEFAULT_TIMEOUT })
      break
    }

    case 'mark': {
      await ctx.onMark(step.label as string, step.note)
      break
    }

    case 'hover': {
      if (!step.selector) throw new Error(`${stepLabel} requiere selector`)
      await ctx.page.locator(step.selector).first().hover({ timeout: step.timeout ?? DEFAULT_TIMEOUT })
      break
    }

    case 'click': {
      if (!step.selector) throw new Error(`${stepLabel} requiere selector`)
      await ctx.page.locator(step.selector).first().click({ timeout: step.timeout ?? DEFAULT_TIMEOUT })
      break
    }

    case 'scroll': {
      const y = step.scrollY ?? 0

      await ctx.page.evaluate(offset => window.scrollBy(0, offset), y)
      break
    }

    case 'fill': {
      if (!step.selector) throw new Error(`${stepLabel} requiere selector`)
      if (step.value === undefined) throw new Error(`${stepLabel} requiere value`)
      await ctx.page.locator(step.selector).first().fill(step.value, { timeout: step.timeout ?? DEFAULT_TIMEOUT })
      break
    }

    case 'press': {
      if (!step.key) throw new Error(`${stepLabel} requiere key`)

      if (step.selector) {
        await ctx.page.locator(step.selector).first().press(step.key)
      } else {
        await ctx.page.keyboard.press(step.key)
      }

      break
    }

    case 'sleep': {
      await ctx.page.waitForTimeout(step.ms ?? 250)
      break
    }

    default: {
      const exhaustive: never = step.kind

      throw new Error(`Unknown step kind: ${exhaustive as string}`)
    }
  }
}
