#!/usr/bin/env node

import path from 'node:path'

import { buildLayoutPlan, compileLayoutCampaign, verifyCompiledCampaign } from './compiler.mjs'

const usage = `Campaign Layout Compiler V1

Usage:
  pnpm creative:layout -- --contract <file.yaml> --mode plan|compile|check

Modes:
  plan     Validate the contract and write a checkpoint/input plan. Never calls a model.
  compile  Render editable SVG sources, masters, manifests, contact sheet and QA. Never calls a model.
  check    Re-verify existing compiled outputs and hashes.
`

const args = process.argv.slice(2)

const readArg = name => {
  const index = args.indexOf(name)

  return index === -1 ? null : args[index + 1]
}

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(usage)
  process.exit(0)
}

const contractValue = readArg('--contract')
const mode = readArg('--mode') ?? 'plan'

if (!contractValue || !['plan', 'compile', 'check'].includes(mode)) {
  process.stderr.write(usage)
  process.exit(2)
}

const contractPath = path.resolve(contractValue)

try {
  if (mode === 'plan') {
    const result = await buildLayoutPlan(contractPath)

    process.stdout.write(
      `${JSON.stringify(
        {
          mode,
          status: result.plan.status,
          plan: result.planPath,
          missingRequiredInputs: result.plan.missingRequiredInputs,
          checkpoints: result.plan.checkpoints
        },
        null,
        2
      )}\n`
    )
  } else if (mode === 'compile') {
    const result = await compileLayoutCampaign(contractPath)

    process.stdout.write(
      `${JSON.stringify(
        {
          mode,
          status: result.manifest.status,
          formats: result.manifest.results.length,
          pass: result.qa.pass,
          manifest: result.manifestPath
        },
        null,
        2
      )}\n`
    )
  } else {
    const qa = await verifyCompiledCampaign(contractPath)

    process.stdout.write(`${JSON.stringify({ mode, pass: qa.pass, formats: qa.checks.length }, null, 2)}\n`)
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
