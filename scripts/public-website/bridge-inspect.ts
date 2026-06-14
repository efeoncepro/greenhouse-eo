#!/usr/bin/env tsx
/**
 * Inspect the active greenhouse-wp-bridge REST endpoints.
 *
 * This command is read-only. It resolves the WordPress Application Password
 * through Secret Manager, calls authenticated inspection endpoints, and never
 * prints credentials or Authorization headers.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  DEFAULT_PUBLIC_SITE_WORDPRESS_BASE_URL,
  inspectPublicSiteBridge
} from '../../src/lib/public-site/bridge-inspection'

type CliOptions = {
  pageId: number | null
  includeCatalog: boolean
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-bridge-inspections'

const loadEnvFile = (relativePath: string) => {
  try {
    const contents = readFileSync(resolve(process.cwd(), relativePath), 'utf8')

    for (const rawLine of contents.split('\n')) {
      const line = rawLine.trim()

      if (!line || line.startsWith('#')) continue

      const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line
      const eq = normalizedLine.indexOf('=')

      if (eq <= 0) continue

      const key = normalizedLine.slice(0, eq).trim()

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue

      let value = normalizedLine.slice(eq + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }

    return true
  } catch {
    return false
  }
}

const loadedEnvFiles = ['.env.local', '.env'].filter(loadEnvFile)

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    pageId: null,
    includeCatalog: true,
    write: false,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--page-id') {
      const pageId = Number(normalizedArgv[i + 1])

      options.pageId = Number.isInteger(pageId) && pageId > 0 ? pageId : null
      i += 1
      continue
    }

    if (arg === '--no-catalog') {
      options.includeCatalog = false
      continue
    }

    if (arg === '--write') {
      options.write = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:bridge-inspect -- --page-id 244079
  pnpm public-website:bridge-inspect -- --page-id 244079 --write
  pnpm public-website:bridge-inspect -- --page-id 244079 --no-catalog

Required env:
  PUBLIC_WEBSITE_WORDPRESS_BASE_URL (optional, defaults to ${DEFAULT_PUBLIC_SITE_WORDPRESS_BASE_URL})
  PUBLIC_WEBSITE_WORDPRESS_USERNAME
  PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF

Loaded env files: ${loadedEnvFiles.length ? loadedEnvFiles.join(', ') : '(none)'}`)
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  if (!options.pageId) {
    throw new Error('--page-id is required and must be a positive integer')
  }

  const report = await inspectPublicSiteBridge({
    pageId: options.pageId,
    includeCatalog: options.includeCatalog
  })

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)

    const outputPath = join(
      reportsRoot,
      `inspection-page-${options.pageId}-${report.generatedAt.replace(/[:.]/g, '-')}.json`
    )

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Wrote Public Site bridge inspection: ${outputPath}`)
  }

  console.log(
    JSON.stringify(
      {
        baseUrl: report.baseUrl,
        pageId: report.pageId,
        health: {
          status: report.endpoints.health.status,
          ok: report.endpoints.health.ok,
          mode: report.endpoints.health.summary.plugin?.mode,
          writesEnabled: report.endpoints.health.summary.security?.writesEnabled
        },
        elementorDocument: {
          status: report.endpoints.elementorDocument.status,
          ok: report.endpoints.elementorDocument.ok,
          post: report.endpoints.elementorDocument.summary.post,
          elementsSummary: report.endpoints.elementorDocument.summary.elementsSummary,
          semanticAnchorsCount: report.endpoints.elementorDocument.summary.semanticAnchors.length
        },
        ohioWidgetCatalog: report.endpoints.ohioWidgetCatalog
          ? {
              status: report.endpoints.ohioWidgetCatalog.status,
              ok: report.endpoints.ohioWidgetCatalog.ok,
              totalWidgets: report.endpoints.ohioWidgetCatalog.summary.totalWidgets,
              ohioCount: report.endpoints.ohioWidgetCatalog.summary.ohioCount,
              hubspotCount: report.endpoints.ohioWidgetCatalog.summary.hubspotCount
            }
          : null
      },
      null,
      2
    )
  )

  if (
    !report.endpoints.health.ok ||
    !report.endpoints.elementorDocument.ok ||
    (report.endpoints.ohioWidgetCatalog && !report.endpoints.ohioWidgetCatalog.ok)
  ) {
    process.exitCode = 2
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:bridge-inspect failed: ${message}`)
  process.exit(1)
})
