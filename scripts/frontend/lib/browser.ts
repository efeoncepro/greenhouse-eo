/**
 * Browser / context setup canónico — Chromium + agent storage state +
 * bypass headers (cuando aplica) + viewport del scenario + video recording.
 *
 * Decisión: SIEMPRE Chromium (consistencia con Greenhouse smoke E2E
 * canon). Firefox/WebKit fuera de scope V1; agregables como flag futuro.
 */

import { chromium, devices, type Browser, type BrowserContext, type Page } from 'playwright'

import type { EnvConfig } from './env'

export interface LaunchOptions {
  envConfig: EnvConfig
  viewport: { width: number; height: number }
  deviceScaleFactor?: number
  headed?: boolean
  recordVideoDir: string
  /**
   * Optional Playwright device descriptor name (e.g. "iPhone 13", "Pixel 7",
   * "iPad Pro 11"). Cuando se setea, overridea viewport + userAgent +
   * deviceScaleFactor con el preset oficial de Playwright. Lista completa:
   * https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json
   */
  deviceName?: string
}

export const isKnownDevice = (name: string): boolean => Object.prototype.hasOwnProperty.call(devices, name)

export interface LaunchedSession {
  browser: Browser
  context: BrowserContext
  page: Page
  /**
   * Detiene el Playwright trace. Si `savePath` se provee (captura fallida),
   * persiste `trace.zip`; si es null (captura OK), descarta — retain-on-failure.
   * Debe llamarse ANTES de finalizeRecording (que cierra el context).
   * Devuelve true si se guardó el trace.
   */
  stopTracing: (savePath: string | null) => Promise<boolean>
  /** Llamado al final — devuelve la ruta absoluta del .webm o null si no se grabó */
  finalizeRecording: () => Promise<string | null>
}

export const launchCaptureSession = async (opts: LaunchOptions): Promise<LaunchedSession> => {
  const browser = await chromium.launch({ headless: opts.headed !== true })

  const devicePreset = opts.deviceName ? devices[opts.deviceName] : undefined

  if (opts.deviceName && !devicePreset) {
    throw new Error(
      `Device "${opts.deviceName}" no es un preset Playwright válido. ` +
        `Ejemplos: "iPhone 13", "iPhone 13 Pro", "Pixel 7", "iPad Pro 11", "Galaxy S9+". ` +
        `Lista completa: playwright-core deviceDescriptorsSource.json`
    )
  }

  const effectiveViewport = devicePreset?.viewport ?? opts.viewport

  const context = await browser.newContext({
    ...(devicePreset ?? {}),
    storageState: opts.envConfig.storageStatePath,
    viewport: effectiveViewport,
    deviceScaleFactor: devicePreset?.deviceScaleFactor ?? opts.deviceScaleFactor ?? 2,
    extraHTTPHeaders: opts.envConfig.bypassSecret
      ? { 'x-vercel-protection-bypass': opts.envConfig.bypassSecret }
      : undefined,
    recordVideo: {
      dir: opts.recordVideoDir,
      size: effectiveViewport
    }
  })

  // esbuild keepNames shim: los bodies de page.evaluate compilados por tsx pueden
  // referenciar el helper `__name`, que no existe en el contexto del browser.
  // Lo definimos como passthrough antes de cualquier navegación (defense-in-depth
  // para todos los gates que usan page.evaluate).
  await context.addInitScript(() => {
    const g = globalThis as unknown as { __name?: (fn: unknown) => unknown }

    if (!g.__name) g.__name = fn => fn
  })

  let tracingActive = false

  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
    tracingActive = true
  } catch {
    // Tracing es defense-in-depth; si el runtime no lo soporta, seguimos sin él.
    tracingActive = false
  }

  const page = await context.newPage()

  const stopTracing = async (savePath: string | null): Promise<boolean> => {
    if (!tracingActive) return false

    tracingActive = false

    try {
      await context.tracing.stop(savePath ? { path: savePath } : undefined)

      return Boolean(savePath)
    } catch {
      return false
    }
  }

  const finalizeRecording = async (): Promise<string | null> => {
    const video = page.video()

    if (!video) {
      await context.close()
      await browser.close()

      return null
    }

    await context.close()
    await browser.close()

    return video.path()
  }

  return { browser, context, page, stopTracing, finalizeRecording }
}

/**
 * Verifica que la navegación inicial no terminó en /login (storage state stale).
 * Llamarlo justo después de page.goto(route).
 */
export const assertNotRedirectedToLogin = (page: Page, intendedPath: string): void => {
  const url = new URL(page.url())

  if (url.pathname.startsWith('/login') || url.pathname.startsWith('/signin') || url.pathname.startsWith('/auth/')) {
    throw new Error(
      `Captura redirigida a ${url.pathname} en lugar de ${intendedPath}.\n` +
        `Probable causa: agent session expirada o storageState inválido.\n` +
        `Workaround: corre el setup canónico:\n` +
        `  AGENT_AUTH_BASE_URL=... AGENT_AUTH_EMAIL=... node scripts/playwright-auth-setup.mjs\n`
    )
  }
}
