/**
 * Recorder — orquesta el lifecycle de captura sobre un scenario:
 *
 * 1. Inicio: marca timestamp, prepara dirs
 * 2. Para cada step: ejecuta + log
 * 3. Para cada step `mark`: page.screenshot sync + entry frame en manifest
 * 4. Final: cierra context (que dispara escritura del .webm), finaliza manifest
 *
 * El recording webm es continuo (todo el lifetime del context). Los frames
 * marker-based son páginas estáticas tomadas con page.screenshot() en momentos
 * específicos del scenario.
 *
 * Frame filename: `<NN>-<label>.png` numerado con zero-pad para orden
 * alfabético = orden temporal.
 */

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import type { Page } from 'playwright'

import {
  runStep,
  runAssertion,
  runReadiness,
  validateScenario,
  type CaptureScenario,
  type ScenarioRunContext
} from './scenario'
import type { AssertionResult, CaptureFinding, FrameMaskRect, FrameRecord, InteractionSegment, ReadinessResult } from './manifest'
import { analyzeFrameQuality } from './quality'
import { resolveMaskRects } from './capture-masks'
import { analyzeEnterpriseRubric } from './enterprise-rubric'
import { FINDING_CODES } from './failure-taxonomy'
import { runKeyboardGate } from './keyboard-gate'

export interface RecorderOutcome {
  frames: FrameRecord[]
  startedAt: number
  finishedAt: number
  error?: { message: string; stepIndex: number }
  readiness?: ReadinessResult
  assertions: AssertionResult[]
  qualityFindings: CaptureFinding[]
  interactions: InteractionSegment[]
}

export interface RecorderArgs {
  page: Page
  scenario: CaptureScenario
  outputDir: string
  log: (msg: string) => void
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

export const runScenario = async ({
  page,
  scenario,
  outputDir,
  log
}: RecorderArgs): Promise<RecorderOutcome> => {
  validateScenario(scenario)

  const framesDir = join(outputDir, 'frames')

  mkdirSync(framesDir, { recursive: true })

  const frames: FrameRecord[] = []
  const assertions: AssertionResult[] = []
  const qualityFindings: CaptureFinding[] = []
  const interactions: InteractionSegment[] = []
  const startedAt = Date.now()

  const onMark: ScenarioRunContext['onMark'] = async (label, note, options): Promise<void> => {
    const tMs = Date.now() - startedAt
    const index = frames.length + 1
    const safeLabel = label.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
    const fileName = `${pad2(index)}-${safeLabel}.png`
    const absPath = join(framesDir, fileName)

    if (options?.clipSelector) {
      const locator = page.locator(options.clipSelector).first()

      await locator.waitFor({ state: 'visible', timeout: options.timeout ?? 5000 })
      await locator.screenshot({ path: absPath })
    } else {
      await page.screenshot({ path: absPath, fullPage: options?.fullPage ?? false })
    }

    const frameQualityFindings = await analyzeFrameQuality(page, {
      frameLabel: label,
      framePath: absPath,
      allowEmpty: scenario.quality?.allowEmpty,
      allowLoading: scenario.quality?.allowLoading,
      allowLogin: scenario.quality?.allowLogin,
      allowErrorBoundary: scenario.quality?.allowErrorBoundary,
      fullPage: options?.fullPage,
      accessibility: scenario.quality?.accessibility,
      layout: scenario.quality?.layout
    })

    qualityFindings.push(...frameQualityFindings)

    let maskRects: FrameMaskRect[] | undefined

    if (scenario.baseline?.maskSelectors?.length) {
      const resolution = await resolveMaskRects(page, scenario.baseline.maskSelectors, {
        clipSelector: options?.clipSelector,
        fullPage: options?.fullPage
      })

      if (resolution.rects.length) maskRects = resolution.rects

      for (const missing of resolution.missingSelectors) {
        qualityFindings.push({
          severity: 'warning',
          category: 'baseline',
          code: FINDING_CODES.mask_selector_missing,
          message: `Mask selector "${missing}" no matcheó nodos en el frame "${label}"; el diff no enmascarará esa región.`,
          frameLabel: label,
          selector: missing
        })
      }
    }

    frames.push({
      index,
      label,
      path: `frames/${fileName}`,
      tMs,
      note,
      interactionName: options?.interactionName,
      qualityFindings: frameQualityFindings.length ? frameQualityFindings : undefined,
      maskRects
    })

    log(`  ✓ mark[${index}] "${label}" (+${tMs}ms)`)
  }

  const ctx: ScenarioRunContext = {
    page,
    outputDir,
    log,
    onMark,
    addFinding: finding => qualityFindings.push(finding),
    addAssertionResult: result => assertions.push(result),
    addInteractionSegment: segment => interactions.push(segment),
    getElapsedMs: () => Date.now() - startedAt
  }

  // Initial hold for hydration
  if (scenario.initialHoldMs && scenario.initialHoldMs > 0) {
    await page.waitForTimeout(scenario.initialHoldMs)
  }

  const readiness = await runReadiness(scenario, page)

  if (readiness.status === 'failed') {
    const message = `Readiness failed: ${readiness.error ?? 'unknown'}`

    log(`  ✗ ${message}`)

    return {
      frames,
      startedAt,
      finishedAt: Date.now(),
      readiness,
      assertions,
      qualityFindings,
      interactions,
      error: { message, stepIndex: -1 }
    }
  }

  for (const assertion of scenario.assertions ?? []) {
    const result = await runAssertion(assertion, page)

    assertions.push(result)

    if (result.status === 'failed') {
      const message = `Assertion failed (${result.kind}): ${result.message}`

      log(`  ✗ ${message}`)

      return {
        frames,
        startedAt,
        finishedAt: Date.now(),
        readiness,
        assertions,
        qualityFindings,
        interactions,
        error: { message, stepIndex: -1 }
      }
    }
  }

  // Run each step
  for (const [index, step] of scenario.steps.entries()) {
    try {
      await runStep(step, index, ctx)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      log(`  ✗ step ${index} failed: ${message}`)

      // Capture failure frame for debug
      try {
        const failPath = join(framesDir, `99-step-${pad2(index)}-failed.png`)

        await page.screenshot({ path: failPath, fullPage: true })
        log(`  💡 debug screenshot: frames/99-step-${pad2(index)}-failed.png`)
      } catch {
        // ignore secondary failure
      }

      return {
        frames,
        startedAt,
        finishedAt: Date.now(),
        readiness,
        assertions,
        qualityFindings,
        interactions,
        error: { message, stepIndex: index }
      }
    }
  }

  // Baseline contract: required regions must render (live-page check).
  for (const region of scenario.baseline?.requiredRegions ?? []) {
    const visible = await page
      .locator(region)
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false)

    if (!visible) {
      qualityFindings.push({
        severity: 'error',
        category: 'baseline',
        code: FINDING_CODES.required_region_missing,
        message: `Región requerida "${region}" no está visible al cierre de la captura (baseline ${scenario.baseline?.surfaceId ?? '—'}).`,
        selector: region
      })
    }
  }

  // Keyboard / focus / reduced-motion gate (opt-in, runs after the timeline).
  if (scenario.quality?.keyboard?.enabled && scenario.quality.keyboard.probes.length) {
    await runKeyboardGate({
      page,
      options: scenario.quality.keyboard,
      mark: (label, note) => onMark(label, note),
      addFinding: finding => qualityFindings.push(finding)
    })
  }

  // Enterprise rubric (opt-in, advisory) — corre una vez sobre el estado final.
  if (scenario.quality?.enterpriseRubric?.enabled) {
    const rubricFindings = await analyzeEnterpriseRubric(page, scenario.quality.enterpriseRubric)

    qualityFindings.push(...rubricFindings)
  }

  // Final hold for last state capture in the .webm
  if (scenario.finalHoldMs !== undefined ? scenario.finalHoldMs > 0 : true) {
    await page.waitForTimeout(scenario.finalHoldMs ?? 500)
  }

  return { frames, startedAt, finishedAt: Date.now(), readiness, assertions, qualityFindings, interactions }
}
