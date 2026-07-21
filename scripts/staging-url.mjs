#!/usr/bin/env node

/**
 * staging-url — imprime la URL del deployment staging VIGENTE (ISSUE-123).
 *
 * Resuelve el último deployment staging READY vía Vercel API (el alias
 * `greenhouse-eo-env-staging-….vercel.app` puede quedar rezagado si alguien lo
 * fijó con `vercel alias set`). Pensado para componer con herramientas que
 * aceptan `STAGING_URL`:
 *
 *   STAGING_URL=$(pnpm --silent staging:url) pnpm fe:capture <scenario> --env=staging
 *   STAGING_URL=$(pnpm --silent staging:url) pnpm staging:request /api/...
 *
 * Sin token de Vercel o con API caída imprime el alias canónico (fallback) y
 * avisa por stderr. Data a stdout, logs a stderr (pipe-friendly).
 */

import { DEFAULT_STAGING_URL, resolveLatestStagingDeploymentUrl } from './lib/vercel-staging-access.mjs'

const log = (...args) => console.error(...args)

const resolved = await resolveLatestStagingDeploymentUrl({ log })

if (resolved) {
  log(`  staging: deployment vigente ${resolved.uid ?? ''} (READY más reciente vía API)`)
  console.log(resolved.url)
} else {
  log('  staging: ⚠️ no se pudo resolver el deployment vigente — imprimiendo el alias (puede estar REZAGADO, ISSUE-123)')
  console.log(DEFAULT_STAGING_URL)
}
