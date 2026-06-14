#!/usr/bin/env tsx
/**
 * Print governed Content Factory patterns for agents and future MCP resources.
 *
 * This command is read-only. It never calls WordPress and never writes unless
 * explicitly asked to store local evidence.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { getEfeonceGutenbergBlockPatternCatalog } from '../../src/lib/public-site/content-factory/gutenberg-pattern-catalog'

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
  pnpm public-website:content-factory:patterns
  pnpm public-website:content-factory:patterns -- --write

Output:
  gutenbergBlockPatternCatalog.v1 for Efeonce blogpost generation/refresh.
  With --write, stores block-pattern-catalog-*.json under ${REPORTS_ROOT}.`)
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  const generatedAt = new Date().toISOString()
  const catalog = getEfeonceGutenbergBlockPatternCatalog({ generatedAt })

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
    const outputPath = join(reportsRoot, `block-pattern-catalog-${generatedAt.replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
    console.log(`Wrote Public Site Content Factory block pattern catalog: ${outputPath}`)
  }

  console.log(JSON.stringify(catalog, null, 2))
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:patterns failed: ${message}`)
  process.exit(1)
}
