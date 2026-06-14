#!/usr/bin/env tsx
/**
 * Build the Greenhouse AI Content Factory inspection map from live bridge reads.
 *
 * This command is read-only. It calls authenticated inspection endpoints through
 * the existing WordPress bridge and writes only local evidence JSON.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  buildContentFactoryInspectionMapFromBridgeReports,
  getDefaultContentFactoryInspectionTargets,
  inspectContentFactoryInspectionMap,
  type ContentFactoryInspectionTarget
} from '../../src/lib/public-site/content-factory/intelligence-map'
import type { PublicSiteBridgeInspectionReport } from '../../src/lib/public-site/bridge-inspection'

type CliOptions = {
  targets: ContentFactoryInspectionTarget[]
  bridgeInspectionPaths: string[]
  includeCatalog: boolean
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory-catalogs'

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

const parseTarget = (rawValue: string): ContentFactoryInspectionTarget => {
  const [idValue, label] = rawValue.split(':')
  const wordpressPostId = Number(idValue)

  if (!Number.isInteger(wordpressPostId) || wordpressPostId <= 0) {
    throw new Error(`Invalid --target value: ${rawValue}`)
  }

  return {
    wordpressPostId,
    ...(label?.trim() ? { label: label.trim() } : {})
  }
}

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    targets: [],
    bridgeInspectionPaths: [],
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

    if (arg === '--target') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--target requires a value')

      options.targets.push(parseTarget(value))
      i += 1
      continue
    }

    if (arg === '--targets') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--targets requires a comma-separated value')

      options.targets.push(...value.split(',').map(parseTarget))
      i += 1
      continue
    }

    if (arg === '--no-catalog') {
      options.includeCatalog = false
      continue
    }

    if (arg === '--from-bridge-inspection') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--from-bridge-inspection requires a path')

      options.bridgeInspectionPaths.push(value)
      i += 1
      continue
    }

    if (arg === '--write') {
      options.write = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!options.targets.length && !options.bridgeInspectionPaths.length) {
    options.targets = getDefaultContentFactoryInspectionTargets()
  }

  return options
}

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:content-factory:inspect
  pnpm public-website:content-factory:inspect -- --write
  pnpm public-website:content-factory:inspect -- --target 249766:latest_post --target 244079:hubspot_landing --write
  pnpm public-website:content-factory:inspect -- --targets 249766,244079 --no-catalog
  pnpm public-website:content-factory:inspect -- --from-bridge-inspection docs/operations/public-site-bridge-inspections/inspection-page-249766-2026-06-14T17-37-08-688Z.json --write

Default targets:
${getDefaultContentFactoryInspectionTargets()
  .map(target => `  - ${target.wordpressPostId}${target.label ? `:${target.label}` : ''}`)
  .join('\n')}

Required env:
  PUBLIC_WEBSITE_WORDPRESS_BASE_URL (optional)
  PUBLIC_WEBSITE_WORDPRESS_USERNAME
  PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF

Loaded env files: ${loadedEnvFiles.length ? loadedEnvFiles.join(', ') : '(none)'}`)
}

const loadBridgeInspectionReport = (path: string): PublicSiteBridgeInspectionReport => {
  const absolutePath = resolve(process.cwd(), path)
  const report = JSON.parse(readFileSync(absolutePath, 'utf8')) as PublicSiteBridgeInspectionReport

  if (report.contractVersion !== 'public-site-bridge-inspection.v1') {
    throw new Error(`Unsupported bridge inspection report: ${path}`)
  }

  return report
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  const map = options.bridgeInspectionPaths.length
    ? buildContentFactoryInspectionMapFromBridgeReports(options.bridgeInspectionPaths.map(loadBridgeInspectionReport), {
        targets: options.targets.length ? options.targets : undefined
      })
    : await inspectContentFactoryInspectionMap({
        targets: options.targets,
        includeCatalog: options.includeCatalog
      })

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
    const outputPath = join(reportsRoot, `content-intelligence-map-${map.scannedAt.replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(map, null, 2)}\n`)
    console.log(`Wrote Public Site Content Intelligence Map: ${outputPath}`)
  }

  console.log(
    JSON.stringify(
      {
        contractVersion: map.contractVersion,
        scannedAt: map.scannedAt,
        source: map.source,
        bridgeVersion: map.bridgeVersion,
        baseUrl: map.baseUrl,
        objectCount: map.objects.length,
        objects: map.objects.map(object => ({
          wordpressPostId: object.wordpressPostId,
          slug: object.slug,
          postType: object.postType,
          status: object.status,
          editorModel: object.editorModel,
          modifiedGmt: object.modifiedGmt,
          moduleCount: object.modules.length,
          summary: object.summary,
          accessIssues: object.accessIssues
        })),
        catalog: map.catalog
          ? {
              totalWidgets: map.catalog.totalWidgets,
              ohioCount: map.catalog.ohioCount,
              hubspotCount: map.catalog.hubspotCount
            }
          : null,
        safetyPolicy: map.safetyPolicy
      },
      null,
      2
    )
  )

  if (map.objects.some(object => object.accessIssues.length > 0)) {
    process.exitCode = 2
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:inspect failed: ${message}`)
  process.exit(1)
})
