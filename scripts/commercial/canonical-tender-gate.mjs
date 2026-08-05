#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { evaluateTenderWorkspace } from './lib/tender-closure-gate.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const printHelp = () => {
  console.log(`Gate canónico de cierre de una licitación

Uso:
  pnpm tender:canonical-gate <slug>
  pnpm tender:canonical-gate --all
  pnpm tender:canonical-gate --json <slug>

El gate solo pasa con status=verified en docs/commercial/tenders/<slug>/proposal-studio.json.
La salida de pnpm deck:compose es taller local y no cuenta como Proposal ni como asset versionado.`)
}

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  printHelp()
  process.exit(0)
}

const json = args.includes('--json')
const all = args.includes('--all')
const slugs = args.filter(arg => !arg.startsWith('--'))

const resolveSlugs = () => {
  if (!all) {
    if (slugs.length === 0) {
      printHelp()
      process.exit(2)
    }

    return slugs
  }

  const tendersDir = path.join(repoRoot, 'docs', 'commercial', 'tenders')

  return fs.readdirSync(tendersDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort()
}

const results = resolveSlugs().map(slug => evaluateTenderWorkspace({ repoRoot, slug }))
const passed = results.every(result => result.passed)

if (json) {
  console.log(JSON.stringify({ passed, results }, null, 2))
} else {
  console.log('Gate canónico de cierre de licitaciones')

  for (const result of results) {
    const verdict = result.passed ? 'PASS' : 'BLOCK'
    const stage = result.status ? ` · status=${result.status}` : ''

    console.log(`\n${verdict} ${result.slug}${stage}`)

    if (result.proposalId) {
      console.log(`  Proposal: ${result.proposalId}`)
    }

    for (const issue of result.issues) {
      console.log(`  - ${issue.code}: ${issue.message}`)
    }
  }

  if (passed) {
    console.log('\nPASS: Proposal Studio, render productivo, asset versionado y verificación autenticada están registrados.')
  } else {
    console.log('\nBLOCK: no cierres la licitación como canónica mientras falte alguno de los checks anteriores.')
  }
}

process.exitCode = passed ? 0 : 1
