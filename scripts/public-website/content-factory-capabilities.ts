#!/usr/bin/env tsx
/**
 * Print governed Content Factory Gutenberg block capabilities.
 *
 * This command is read-only. It never calls WordPress and never writes unless
 * explicitly asked to store local evidence.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { getEfeonceGutenbergBlockCapabilityRegistry } from '../../src/lib/public-site/content-factory/gutenberg-capability-registry'

type CliOptions = {
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory-catalogs'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    write: false,
    help: false
  }

  for (const arg of normalizedArgv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true
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
  pnpm public-website:content-factory:capabilities
  pnpm public-website:content-factory:capabilities -- --write

Output:
  gutenbergBlockCapabilityRegistry.v1 for Efeonce blogpost generation/refresh/fix.
  With --write, stores block-capability-registry-*.json under ${REPORTS_ROOT}.`)
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  const generatedAt = new Date().toISOString()
  const registry = getEfeonceGutenbergBlockCapabilityRegistry({ generatedAt })

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
    const outputPath = join(reportsRoot, `block-capability-registry-${generatedAt.replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(registry, null, 2)}\n`)
    console.log(`Wrote Public Site Content Factory block capability registry: ${outputPath}`)
  }

  console.log(JSON.stringify(registry, null, 2))
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:capabilities failed: ${message}`)
  process.exit(1)
}
