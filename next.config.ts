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

// TASK-1157 Slice 2 — los sourcemaps de Sentry se procesan/suben DURANTE el build
// y suman RAM + tiempo. En staging no hacen falta (debugging de prod). Solo
// subimos sourcemaps en PRODUCCIÓN (`VERCEL_ENV === 'production'`); en staging el
// gate queda en false → `sourcemaps.disable: true` → menos pico de RAM en el build.
// El build local (sin VERCEL_ENV) también queda sin upload, como antes.
const isProductionDeploy = process.env.VERCEL_ENV === 'production'

const sourcemapsReady =
  isProductionDeploy &&
  Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
  Boolean(process.env.SENTRY_ORG?.trim()) &&
  Boolean(process.env.SENTRY_PROJECT?.trim())

// TASK-1157 — el `next build` (Turbopack) OOM-ea de forma flaky en el builder
// default de Vercel (~8 GB): el pico de RAM queda al borde del techo del container
// y a veces se pasa → SIGKILL. Causa estructural (1106 entrypoints). Dos picos:
// compilación de Turbopack y los workers de static-generation (= os.cpus().length).
//
// Slice 3 — capamos los workers de static-generation: de `os.cpus().length` a 4 → baja
// ese pico ~2x con poca penalidad de tiempo. NO usamos `turbopackMemoryLimit`: medido en
// Vercel, un tope por debajo del working set de Turbopack fuerza GC agresivo (thrashing) y el
// build se cuelga 25 min+ en "Creating an optimized production build" — peor que el OOM flaky.
//
// ISSUE-109 (2026-06-28) — el cap se aplica AHORA TAMBIÉN EN LOCAL, no solo en Vercel. En una
// máquina de pocos cores/RAM (ej. 10c/16GB), `os.cpus().length` workers de static-generation, cada
// uno heredando `--max-old-space-size=8192` (run-next-build.mjs) + Turbopack compilando, sobre-
// suscriben la RAM → swap → la máquina entera se congela durante `pnpm build`. Capar a 4 workers
// corta el pico ~2x. Override por env `NEXT_BUILD_CPUS` (ej. `build:fast` usa 2 para impacto mínimo).
const resolveBuildCpus = (): number => {
  const explicit = Number.parseInt(process.env.NEXT_BUILD_CPUS ?? '', 10)

  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit
  }

  // Default conservador (Vercel + local): 4 workers. Valor medido (~2x menos pico de RAM).
  return 4
}

const buildMemoryCaps = { cpus: resolveBuildCpus() }

// TASK-1324 — redirect puente para links YA ENVIADOS con el path viejo del portal.
// El render público del informe migró al hub headless `efeonce-think`
// (`think.efeoncepro.com/brand-visibility/r/<token>`, ADR
// GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1). El helper `buildPublicReportUrl`
// ya genera la URL del hub para los correos nuevos; este redirect recupera los correos
// viejos cuyo botón apunta a `greenhouse.efeoncepro.com/grader/r/<token>` (hoy 404).
// Mismo host canónico que el helper (env var `PUBLIC_GRADER_HUB_URL`). `permanent: false`
// (307) — reversible por rollback (revert + redeploy), sin caché dura del navegador.
const GRADER_HUB_URL = (process.env.PUBLIC_GRADER_HUB_URL?.trim() || 'https://think.efeoncepro.com').replace(/\/+$/, '')

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  distDir: process.env.NEXT_DIST_DIR || '.next',

  async redirects() {
    return [
      {
        source: '/grader/r/:token',
        destination: `${GRADER_HUB_URL}/brand-visibility/r/:token`,
        permanent: false,
      },
    ]
  },

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
    // TASK-1157 + ISSUE-109 — cap de workers de static-generation (Vercel + local; ver arriba).
    ...buildMemoryCaps
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
