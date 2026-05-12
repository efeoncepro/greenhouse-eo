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
  validateScenario,
  type CaptureScenario,
  type ScenarioRunContext
} from './scenario'
import type { FrameRecord } from './manifest'

export interface RecorderOutcome {
  frames: FrameRecord[]
  startedAt: number
  finishedAt: number
  error?: { message: string; stepIndex: number }
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
  const startedAt = Date.now()

  const onMark = async (label: string, note?: string): Promise<void> => {
    const tMs = Date.now() - startedAt
    const index = frames.length + 1
    const safeLabel = label.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
    const fileName = `${pad2(index)}-${safeLabel}.png`
    const absPath = join(framesDir, fileName)

    await page.screenshot({ path: absPath, fullPage: false })

    frames.push({
      index,
      label,
      path: `frames/${fileName}`,
      tMs,
      note
    })

    log(`  ✓ mark[${index}] "${label}" (+${tMs}ms)`)
  }

  const ctx: ScenarioRunContext = {
    page,
    outputDir,
    log,
    onMark
  }

  // Initial hold for hydration
  if (scenario.initialHoldMs && scenario.initialHoldMs > 0) {
    await page.waitForTimeout(scenario.initialHoldMs)
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
        error: { message, stepIndex: index }
      }
    }
  }

  // Final hold for last state capture in the .webm
  if (scenario.finalHoldMs !== undefined ? scenario.finalHoldMs > 0 : true) {
    await page.waitForTimeout(scenario.finalHoldMs ?? 500)
  }

  return { frames, startedAt, finishedAt: Date.now() }
}
