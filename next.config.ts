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
    viewTransition: true
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
