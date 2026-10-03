import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1964 — Login V4 premium («La órbita»): formulario sobre papel + escenario con la Lente y el carrusel de
 * novedades (TASK-1963). Superficie pública: corre anónima (sin sesión, sin bypass), porque con sesión `/login`
 * redirige a `/auth/landing`.
 *
 * Uso: `pnpm fe:capture auth-login-v4 --env=local`
 */
export const scenario: CaptureScenario = {
  name: 'auth-login-v4',
  route: '/login',
  authentication: 'anonymous',
  viewport: { width: 1440, height: 960 },
  viewports: [
    { name: 'desktop', width: 1440, height: 960 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="login-form"]',
    waitForFonts: true,
    postReadyDelayMs: 2600,
    timeout: 20000
  },
  assertions: [
    { kind: 'visible', selector: '[data-capture="login-form"]', reason: 'El formulario es la prioridad del login.' },
    { kind: 'noErrorBoundary', reason: 'Un error no acredita el primer pliegue.' }
  ],
  quality: {
    allowLogin: true,
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: true },
    layout: { enabled: true, includeSelector: 'body', minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHttpStatus: true }
  },
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Primer pliegue: Entrar debe verse sin scroll en 390×844.' },
    { kind: 'mark', label: 'full-page', fullPage: true, note: 'Página completa: en móvil la novedad baja como tarjeta.' }
  ]
}
