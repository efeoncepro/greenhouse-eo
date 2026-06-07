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

import type { AssertionResult, CaptureBaselineMeta, CaptureFinding, InteractionSegment, ReadinessResult } from './manifest'

export interface CaptureReadiness {
  /** Selector estable que representa que la pantalla ya está lista para evidencia visual. */
  selector?: string
  /** Selectores que deben estar visibles/listos. Se suma a `selector` si ambos existen. */
  selectors?: string[]
  /** Selectores que NO deben estar visibles al capturar. */
  absentSelectors?: string[]
  /** Espera `document.fonts.ready` cuando el browser lo soporta. Default true. */
  waitForFonts?: boolean
  /** Delay corto post-ready para estabilizar layout/transiciones. */
  postReadyDelayMs?: number
  /** Timeout por condición. Default 10000. */
  timeout?: number
  note?: string
}

export interface CaptureAssertion {
  kind: 'visible' | 'notVisible' | 'noLoginRedirect' | 'noErrorBoundary' | 'noCriticalToast'
  selector?: string
  timeout?: number
  reason?: string
}

export interface CaptureInteractionAction {
  kind: 'hover' | 'click' | 'focus' | 'press'
  selector?: string
  key?: string
}

export interface CaptureInteractionFrame {
  label: string
  /** ms relativo al momento inmediatamente posterior a la acción principal. */
  atMs: number
  note?: string
  fullPage?: boolean
  clipSelector?: string
}

export interface CaptureInteractionStep {
  kind: 'interaction'
  name: string
  action: CaptureInteractionAction
  intent: string
  frames: CaptureInteractionFrame[]
  timeout?: number
  keyboardEquivalent?: {
    action: CaptureInteractionAction
    expected?: string
  }
  reducedMotion?: 'capture' | 'skip'
}

export interface CaptureViewportVariant {
  name: string
  width?: number
  height?: number
  device?: string
}

export interface CaptureAccessibilityQualityOptions {
  /** Ejecuta axe-core sobre cada frame marcado. Default false. */
  enabled?: boolean
  /** Limita el audit a un contenedor estable para evitar ruido del shell global. */
  includeSelector?: string
  /** Tags axe/WCAG a evaluar. Default: WCAG 2.0/2.1/2.2 A y AA. */
  tags?: string[]
  /** Si es true/default, cualquier violation hace fallar la captura. */
  failOnViolations?: boolean
}

export interface CaptureLayoutQualityOptions {
  /** Corre el layout integrity gate sobre cada frame marcado. Default false. */
  enabled?: boolean
  /** Acota el scan a un contenedor estable (default: body). */
  includeSelector?: string
  /** Selectores a ignorar por completo (overlays legítimos, devtools, etc.). */
  ignoreSelectors?: string[]
  /** Selectores donde el scroll horizontal es esperado (carruseles, tablas anchas). */
  allowHorizontalScrollSelectors?: string[]
  /** Tamaño mínimo de target interactivo en CSS px. Default 24 (WCAG 2.2 AA 2.5.8). */
  minTargetSize?: number
  /** Si true, los hallazgos de layout son `error`. Default false (warning-first). */
  failOnViolations?: boolean
}

export interface CaptureRuntimeQualityOptions {
  /** console.error → finding error (default) o warning si false. */
  failOnConsoleError?: boolean
  /** pageerror (excepción no capturada) → finding error. */
  failOnPageError?: boolean
  /** Warning de hydration React/Next (best-effort por pattern) → finding error. */
  failOnHydrationWarning?: boolean
  /** Responses 4xx/5xx de document/xhr/fetch → finding error. */
  failOnHttpStatus?: boolean
  /** Regex (string) de URLs a ignorar en el gate de red. */
  ignoreUrlPatterns?: string[]
  /** Regex (string) de mensajes de consola a ignorar. */
  ignoreConsolePatterns?: string[]
}

export interface CaptureKeyboardProbe {
  /** kebab-case; nombra el frame keyboard-<name>. */
  name: string
  /** Selector a enfocar antes de la secuencia (click/focus). */
  startSelector?: string
  /** Secuencia de teclas: 'Tab' | 'Enter' | 'Space' | 'Escape' | 'ArrowDown'… */
  keys: string[]
  /** Tras la secuencia, `document.activeElement` debe matchear este selector. */
  expectedFocusSelector?: string
  /** Exige focus ring visible en el elemento enfocado. Default true. */
  requireVisibleFocusRing?: boolean
  /** Selector que DEBE quedar visible tras la secuencia (e.g. menú abierto). */
  expectedVisibleSelector?: string
  /** Selector que DEBE quedar oculto tras la secuencia (e.g. Escape cierra). */
  expectedHiddenSelector?: string
}

export interface CaptureKeyboardQualityOptions {
  enabled?: boolean
  /** Si true, los hallazgos de teclado son `error`. Default false (warning-first). */
  failOnViolations?: boolean
  /** Re-corre cada probe bajo prefers-reduced-motion y verifica que el feedback no se pierda. */
  reducedMotionCheck?: boolean
  probes: CaptureKeyboardProbe[]
}

export interface CaptureQualityOptions {
  allowEmpty?: boolean
  allowLoading?: boolean
  allowLogin?: boolean
  allowErrorBoundary?: boolean
  accessibility?: CaptureAccessibilityQualityOptions
  layout?: CaptureLayoutQualityOptions
  runtime?: CaptureRuntimeQualityOptions
  keyboard?: CaptureKeyboardQualityOptions
}

export interface CaptureScenarioStep {
  /** Tipo de step (state machine cerrado) */
  kind: 'wait' | 'mark' | 'hover' | 'click' | 'scroll' | 'fill' | 'press' | 'sleep' | 'assert' | 'interaction'

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

  /** Para `scroll`: y offset en px (positivo down, negativo up). Con selector, se aplica como ajuste post-scrollIntoView. */
  scrollY?: number

  /** Para `scroll`: destino absoluto de la pagina. Evita offsets para top/bottom. */
  scrollTo?: 'top' | 'bottom'

  /** Para `scroll` con selector: alineación vertical del elemento. Default `center`. */
  scrollBlock?: ScrollLogicalPosition

  /** Para `scroll` con selector: alineación horizontal del elemento. Default `nearest`. */
  scrollInline?: ScrollLogicalPosition

  /** Para `mark`: captura toda la página, incluyendo contenido fuera del viewport. */
  fullPage?: boolean

  /** Para `mark`: captura solo un elemento/section después de esperar que exista. */
  clipSelector?: string

  /** Comentario opcional, va a manifest.json */
  note?: string

  /** Para `assert`: assertion embebida en el timeline. */
  assertion?: CaptureAssertion

  /** Para `interaction`: payload declarativo V2. */
  interaction?: Omit<CaptureInteractionStep, 'kind'>
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

  /** Readiness explícito antes de steps/marks. */
  readiness?: CaptureReadiness

  /** Assertions ligeros de evidencia, no suite E2E de negocio. */
  assertions?: CaptureAssertion[]

  /** Viewports declarativos para una corrida multi-variante. */
  viewports?: CaptureViewportVariant[]

  /** Quality guard de frames. Opt-out explícito por scenario. */
  quality?: CaptureQualityOptions

  /** Metadata + contrato de visual diff para flujo mockup aprobado -> runtime. */
  baseline?: CaptureBaselineMeta

  /** Steps en orden */
  steps: CaptureScenarioStep[]
}

export interface ScenarioRunContext {
  page: Page
  outputDir: string
  log: (msg: string) => void
  /** Llamado por step `mark` — captura sync PNG + agrega entry a manifest */
  onMark: (
    label: string,
    note?: string,
    options?: {
      fullPage?: boolean
      clipSelector?: string
      timeout?: number
      interactionName?: string
    }
  ) => Promise<void>
  addFinding?: (finding: CaptureFinding) => void
  addAssertionResult?: (result: AssertionResult) => void
  addInteractionSegment?: (segment: InteractionSegment) => void
  getElapsedMs?: () => number
}

const DEFAULT_TIMEOUT = 5000
const DEFAULT_READINESS_TIMEOUT = 10000
const SCROLL_POSITIONS = new Set<ScrollLogicalPosition>(['start', 'center', 'end', 'nearest'])

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

      if (step.fullPage && step.clipSelector) {
        throw new Error(`step ${index}: mark no puede combinar fullPage con clipSelector`)
      }

      usedLabels.add(step.label)
    } else if (step.kind === 'assert') {
      if (!step.assertion) throw new Error(`step ${index} (assert) requiere assertion`)
    } else if (step.kind === 'interaction') {
      const interaction = step.interaction

      if (!interaction) throw new Error(`step ${index} (interaction) requiere interaction`)

      if (!interaction.name || !/^[a-z0-9-]+$/.test(interaction.name)) {
        throw new Error(`step ${index}: interaction.name inválido (kebab-case requerido)`)
      }

      if (!interaction.intent || interaction.intent.trim().length < 8) {
        throw new Error(`step ${index}: interaction "${interaction.name}" requiere intent descriptivo`)
      }

      if (!interaction.frames.length) {
        throw new Error(`step ${index}: interaction "${interaction.name}" requiere frames`)
      }

      if (interaction.action.kind === 'press' && !interaction.action.key) {
        throw new Error(`step ${index}: interaction "${interaction.name}" action press requiere key`)
      }

      if (interaction.action.kind !== 'press' && !interaction.action.selector) {
        throw new Error(`step ${index}: interaction "${interaction.name}" action requiere selector`)
      }

      for (const frame of interaction.frames) {
        const label = `${interaction.name}-${frame.label}`

        if (usedLabels.has(label)) throw new Error(`step ${index}: interaction frame label "${label}" duplicado`)

        if (frame.fullPage && frame.clipSelector) {
          throw new Error(`step ${index}: interaction frame "${label}" no puede combinar fullPage con clipSelector`)
        }

        usedLabels.add(label)
      }
    } else if (step.fullPage || step.clipSelector) {
      throw new Error(`step ${index}: fullPage/clipSelector solo aplican a mark`)
    }

    if (step.scrollBlock && !SCROLL_POSITIONS.has(step.scrollBlock)) {
      throw new Error(`step ${index}: scrollBlock inválido "${step.scrollBlock}"`)
    }

    if (step.scrollInline && !SCROLL_POSITIONS.has(step.scrollInline)) {
      throw new Error(`step ${index}: scrollInline inválido "${step.scrollInline}"`)
    }

    if ((step.scrollBlock || step.scrollInline || step.scrollTo) && step.kind !== 'scroll') {
      throw new Error(`step ${index}: scrollBlock/scrollInline/scrollTo solo aplican a scroll`)
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

  if (s.viewports) {
    const names = new Set<string>()

    for (const [index, viewport] of s.viewports.entries()) {
      if (!viewport.name || !/^[a-z0-9-]+$/.test(viewport.name)) {
        throw new Error(`viewport ${index}: name inválido (kebab-case requerido)`)
      }

      if (names.has(viewport.name)) throw new Error(`viewport "${viewport.name}" duplicado`)

      if (!viewport.device && (!viewport.width || !viewport.height)) {
        throw new Error(`viewport "${viewport.name}" requiere width/height o device`)
      }

      names.add(viewport.name)
    }
  }

  const baseline = s.baseline

  if (baseline) {
    if (baseline.maxDiffRatio !== undefined && (baseline.maxDiffRatio < 0 || baseline.maxDiffRatio > 1)) {
      throw new Error(`baseline.maxDiffRatio debe estar en [0,1]: ${baseline.maxDiffRatio}`)
    }

    if (baseline.maxChangedPixels !== undefined && (!Number.isFinite(baseline.maxChangedPixels) || baseline.maxChangedPixels < 0)) {
      throw new Error(`baseline.maxChangedPixels debe ser un entero >= 0: ${baseline.maxChangedPixels}`)
    }

    if ((baseline.requiredFrameLabels?.length || baseline.maskSelectors?.length || baseline.requiredRegions?.length) && !baseline.surfaceId) {
      throw new Error('baseline con requiredFrameLabels/maskSelectors/requiredRegions requiere baseline.surfaceId (home durable)')
    }

    if (baseline.surfaceId && !/^[a-z0-9][a-z0-9._-]*$/i.test(baseline.surfaceId)) {
      throw new Error(`baseline.surfaceId inválido (alfanumérico + . _ -): "${baseline.surfaceId}"`)
    }
  }

  const keyboard = s.quality?.keyboard

  if (keyboard?.enabled) {
    if (!keyboard.probes?.length) {
      throw new Error('quality.keyboard.enabled requiere al menos un probe')
    }

    const probeNames = new Set<string>()

    for (const [index, probe] of keyboard.probes.entries()) {
      if (!probe.name || !/^[a-z0-9-]+$/.test(probe.name)) {
        throw new Error(`quality.keyboard.probes[${index}].name inválido (kebab-case requerido)`)
      }

      if (probeNames.has(probe.name)) throw new Error(`quality.keyboard probe "${probe.name}" duplicado`)

      if (!probe.keys?.length) throw new Error(`quality.keyboard probe "${probe.name}" requiere keys`)

      probeNames.add(probe.name)
    }
  }
}

const isVisible = async (page: Page, selector: string, timeout: number): Promise<boolean> => {
  try {
    return await page.locator(selector).first().isVisible({ timeout })
  } catch {
    return false
  }
}

export const runReadiness = async (scenario: CaptureScenario, page: Page): Promise<ReadinessResult> => {
  const readiness = scenario.readiness
  const startedAt = Date.now()

  if (!readiness) {
    return { status: 'skipped', durationMs: 0 }
  }

  const timeout = readiness.timeout ?? DEFAULT_READINESS_TIMEOUT
  const selectors = [...(readiness.selector ? [readiness.selector] : []), ...(readiness.selectors ?? [])]

  try {
    for (const selector of selectors) {
      await page.locator(selector).first().waitFor({ state: 'visible', timeout })
    }

    for (const selector of readiness.absentSelectors ?? []) {
      await page.locator(selector).first().waitFor({ state: 'hidden', timeout })
    }

    if (readiness.waitForFonts !== false) {
      await page.evaluate(async () => {
        if ('fonts' in document) await document.fonts.ready
      })
    }

    if (readiness.postReadyDelayMs && readiness.postReadyDelayMs > 0) {
      await page.waitForTimeout(readiness.postReadyDelayMs)
    }

    return {
      status: 'passed',
      selector: readiness.selector,
      absentSelectors: readiness.absentSelectors,
      waitForFonts: readiness.waitForFonts !== false,
      durationMs: Date.now() - startedAt
    }
  } catch (err) {
    return {
      status: 'failed',
      selector: readiness.selector,
      absentSelectors: readiness.absentSelectors,
      waitForFonts: readiness.waitForFonts !== false,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const runAssertion = async (assertion: CaptureAssertion, page: Page): Promise<AssertionResult> => {
  const timeout = assertion.timeout ?? DEFAULT_TIMEOUT

  const pass = (message?: string): AssertionResult => ({
    kind: assertion.kind,
    status: 'passed',
    selector: assertion.selector,
    reason: assertion.reason,
    message
  })

  const fail = (message: string): AssertionResult => ({
    kind: assertion.kind,
    status: 'failed',
    selector: assertion.selector,
    reason: assertion.reason,
    message
  })

  if (assertion.kind === 'noLoginRedirect') {
    const url = new URL(page.url())
    const isLogin = url.pathname.startsWith('/login') || url.pathname.startsWith('/signin') || url.pathname.startsWith('/auth/')

    return isLogin ? fail(`URL actual ${url.pathname} parece login/auth`) : pass()
  }

  if (assertion.kind === 'noErrorBoundary') {
    const selectors = [
      assertion.selector,
      '[data-nextjs-error-overlay]',
      '[data-testid="error-boundary"]',
      '[role="alert"][data-severity="error"]',
      'text=/Application error|Unhandled Runtime Error|Something went wrong|Error inesperado/i'
    ].filter(Boolean) as string[]

    for (const selector of selectors) {
      if (await isVisible(page, selector, Math.min(timeout, 500))) {
        return fail(`Selector de error visible: ${selector}`)
      }
    }

    return pass()
  }

  if (assertion.kind === 'noCriticalToast') {
    const selector = assertion.selector ?? '[role="alert"][data-severity="error"], [role="alert"]:has-text("Error")'

    return await isVisible(page, selector, Math.min(timeout, 500))
      ? fail(`Toast/alert crítico visible: ${selector}`)
      : pass()
  }

  if (!assertion.selector) return fail(`Assertion ${assertion.kind} requiere selector`)

  const visible = await isVisible(page, assertion.selector, timeout)

  if (assertion.kind === 'visible') return visible ? pass() : fail(`Selector no visible: ${assertion.selector}`)
  if (assertion.kind === 'notVisible') return visible ? fail(`Selector visible: ${assertion.selector}`) : pass()

  return fail(`Assertion no soportada: ${assertion.kind}`)
}

const runInteractionAction = async (
  page: Page,
  action: CaptureInteractionAction,
  timeout: number
): Promise<void> => {
  switch (action.kind) {
    case 'hover': {
      if (!action.selector) throw new Error('interaction action hover requiere selector')
      await page.locator(action.selector).first().hover({ timeout })

return
    }

    case 'click': {
      if (!action.selector) throw new Error('interaction action click requiere selector')
      await page.locator(action.selector).first().click({ timeout })

return
    }

    case 'focus': {
      if (!action.selector) throw new Error('interaction action focus requiere selector')
      await page.locator(action.selector).first().focus({ timeout })

return
    }

    case 'press': {
      if (!action.key) throw new Error('interaction action press requiere key')
      if (action.selector) await page.locator(action.selector).first().press(action.key)
      else await page.keyboard.press(action.key)

return
    }

    default: {
      const exhaustive: never = action.kind

      throw new Error(`Unknown interaction action: ${exhaustive as string}`)
    }
  }
}

const runInteractionStep = async (
  step: CaptureScenarioStep,
  index: number,
  ctx: ScenarioRunContext
): Promise<void> => {
  const interaction = step.interaction

  if (!interaction) throw new Error(`step ${index} (interaction) requiere interaction`)

  if (!interaction.intent) {
    ctx.addFinding?.({
      severity: 'warning',
      category: 'microinteraction',
      code: 'interaction_missing_intent',
      message: `Interaction "${interaction.name}" no declara intent.`,
      stepIndex: index
    })
  }

  const timeout = interaction.timeout ?? DEFAULT_TIMEOUT
  const relativeStart = ctx.getElapsedMs?.() ?? 0

  if (interaction.action.selector && !await isVisible(ctx.page, interaction.action.selector, timeout)) {
    ctx.addFinding?.({
      severity: 'error',
      category: 'microinteraction',
      code: 'interaction_target_not_visible',
      message: `Target no visible para interaction "${interaction.name}".`,
      selector: interaction.action.selector,
      stepIndex: index
    })
  }

  await runInteractionAction(ctx.page, interaction.action, timeout)

  const frameLabels: string[] = []

  for (const frame of [...interaction.frames].sort((a, b) => a.atMs - b.atMs)) {
    const elapsed = (ctx.getElapsedMs?.() ?? 0) - relativeStart
    const waitMs = Math.max(0, frame.atMs - elapsed)

    if (waitMs > 0) await ctx.page.waitForTimeout(waitMs)

    const label = `${interaction.name}-${frame.label}`

    await ctx.onMark(label, frame.note ?? interaction.intent, {
      fullPage: frame.fullPage,
      clipSelector: frame.clipSelector,
      timeout,
      interactionName: interaction.name
    })
    frameLabels.push(label)
  }

  if (interaction.keyboardEquivalent) {
    await runInteractionAction(ctx.page, interaction.keyboardEquivalent.action, timeout)
    await ctx.onMark(`${interaction.name}-keyboard`, interaction.keyboardEquivalent.expected ?? 'Keyboard/focus evidence', {
      interactionName: interaction.name
    })
    frameLabels.push(`${interaction.name}-keyboard`)
  } else if (interaction.action.kind === 'hover' || interaction.action.kind === 'click') {
    ctx.addFinding?.({
      severity: 'warning',
      category: 'microinteraction',
      code: 'interaction_without_keyboard_equivalent',
      message: `Interaction "${interaction.name}" no declara evidencia keyboard/focus equivalente.`,
      selector: interaction.action.selector,
      stepIndex: index
    })
  }

  if (interaction.reducedMotion === 'capture') {
    await ctx.page.emulateMedia({ reducedMotion: 'reduce' })
    await runInteractionAction(ctx.page, interaction.action, timeout)
    await ctx.page.waitForTimeout(150)
    await ctx.onMark(`${interaction.name}-reduced-motion`, 'Reduced-motion feedback evidence', {
      interactionName: interaction.name
    })
    await ctx.page.emulateMedia({ reducedMotion: 'no-preference' })
    frameLabels.push(`${interaction.name}-reduced-motion`)
  }

  ctx.addInteractionSegment?.({
    name: interaction.name,
    intent: interaction.intent,
    actionKind: interaction.action.kind,
    selector: interaction.action.selector,
    startMs: relativeStart,
    endMs: ctx.getElapsedMs?.() ?? relativeStart,
    frameLabels,
    keyboardEquivalent: interaction.keyboardEquivalent
      ? `${interaction.keyboardEquivalent.action.kind}${interaction.keyboardEquivalent.action.key ? `:${interaction.keyboardEquivalent.action.key}` : ''}`
      : undefined,
    reducedMotion: interaction.reducedMotion
  })
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
      await ctx.onMark(step.label as string, step.note, {
        fullPage: step.fullPage,
        clipSelector: step.clipSelector,
        timeout: step.timeout
      })
      break
    }

    case 'assert': {
      if (!step.assertion) throw new Error(`${stepLabel} requiere assertion`)
      const result = await runAssertion(step.assertion, ctx.page)

      ctx.addAssertionResult?.(result)

      if (result.status === 'failed') {
        throw new Error(`Assertion failed (${result.kind}): ${result.message}`)
      }

      break
    }

    case 'interaction': {
      await runInteractionStep(step, index, ctx)
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

      if (step.scrollTo) {
        await ctx.page.evaluate(target => {
          window.scrollTo({
            top: target === 'top' ? 0 : document.documentElement.scrollHeight,
            behavior: 'instant'
          })
        }, step.scrollTo)
      } else if (step.selector) {
        const locator = ctx.page.locator(step.selector).first()

        await locator.waitFor({ state: 'attached', timeout: step.timeout ?? DEFAULT_TIMEOUT })
        await locator.evaluate((element, options) => {
          element.scrollIntoView({
            block: options.block,
            inline: options.inline,
            behavior: 'instant'
          })
        }, {
          block: step.scrollBlock ?? 'center',
          inline: step.scrollInline ?? 'nearest'
        })
      }

      if (y !== 0 || (!step.selector && !step.scrollTo)) {
        await ctx.page.evaluate(offset => window.scrollBy(0, offset), y)
      }

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
