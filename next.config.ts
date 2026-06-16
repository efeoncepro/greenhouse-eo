import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

import { runSentrySourcemapUploadWithTimeout } from './src/lib/sentry-build/sourcemap-upload-timeout'

type ProductionCompileContext = {
  distDir: string
}

type NextConfigWithProductionCompileHook = NextConfig & {
  compiler?: {
    runAfterProductionCompile?: (context: ProductionCompileContext) => Promise<void> | void
  }
}

const sourcemapsReady =
  Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
  Boolean(process.env.SENTRY_ORG?.trim()) &&
  Boolean(process.env.SENTRY_PROJECT?.trim())

// TASK-1157 — el `next build` (Turbopack) OOM-ea de forma flaky en el builder
// default de Vercel (~8 GB): el pico de RAM queda al borde del techo del container
// y a veces se pasa → SIGKILL. Causa estructural (1106 entrypoints + dos picos:
// compilación de Turbopack y los workers de static-generation = os.cpus().length).
// Capamos AMBOS picos SOLO en el build de Vercel (`VERCEL=1`), para no ralentizar
// el build local ni el de CI (que no OOM-ean). Costo $0, cero impacto en runtime.
const isVercelBuild = process.env.VERCEL === '1'

const vercelBuildMemoryCaps = isVercelBuild
  ? {
      // Static-generation: de `os.cpus().length` (los "9 workers" del builder) a 2.
      // Baja el pico de esa fase ~4.5x a cambio de algunos minutos de build.
      cpus: 2,
      // Presupuesto de memoria de Turbopack (en bytes, por el contrato de Next 16):
      // 6 GiB en un container de ~8 GB → Turbopack hace GC antes del techo, dejando
      // headroom para el resto del proceso. Ataca la fase que OOM-eó (compilación).
      turbopackMemoryLimit: 6 * 1024 * 1024 * 1024
    }
  : {}

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // TASK-1152 — el Roadmap work item index reader lee el backlog Markdown
  // (`docs/{epics,tasks,mini-tasks,issues}/**`) en runtime. Next.js solo bundlea
  // archivos importados; estos `.md` no se importan, así que se incluyen
  // explícitamente en el trace de la serverless function de la ruta del reader.
  // Sin esto, el reader rompería en Vercel (los docs no existirían en runtime).
  outputFileTracingIncludes: {
    '/api/roadmap/work-items': [
      './docs/epics/**/*.md',
      './docs/tasks/**/*.md',
      './docs/mini-tasks/**/*.md',
      './docs/issues/**/*.md'
    ],
    // TASK-1153 follow-up — el endpoint dinámico "Abrir task" lee el Markdown
    // crudo por id; necesita los mismos docs bundleados en su propia función.
    '/api/roadmap/work-items/[id]': [
      './docs/epics/**/*.md',
      './docs/tasks/**/*.md',
      './docs/mini-tasks/**/*.md',
      './docs/issues/**/*.md'
    ]
  },

  // TASK-525: enable native browser View Transitions for App Router same-document
  // navigation. Requires Chrome 111+ / Safari 18+; Firefox falls back to instant
  // navigation. Reduced-motion is honored via the global keyframes guard in
  // src/app/globals.css.
  experimental: {
    viewTransition: true,
    // TASK-1157 — caps de memoria del build, solo en Vercel (ver arriba).
    ...vercelBuildMemoryCaps
  }
}

const withNextIntl = createNextIntlPlugin()

const sentryNextConfig = withSentryConfig(withNextIntl(nextConfig), {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !sourcemapsReady
  },
  errorHandler: err => {
    console.warn(`[sentry-build] Source-map upload failed: ${err.message}. Continuing deployment.`)
  }
}) as NextConfigWithProductionCompileHook

const runAfterProductionCompile = sentryNextConfig.compiler?.runAfterProductionCompile

if (typeof runAfterProductionCompile === 'function') {
  sentryNextConfig.compiler = {
    ...sentryNextConfig.compiler,
    runAfterProductionCompile: async context => {
      await runSentrySourcemapUploadWithTimeout(() => runAfterProductionCompile(context))
    }
  }
}

export default sentryNextConfig
