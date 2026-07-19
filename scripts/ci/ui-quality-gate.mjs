#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REQUIRED_VISUAL_DIMENSIONS = [
  'hierarchy',
  'proportions',
  'rhythm',
  'density',
  'depth',
  'surfaceEconomy',
  'visualImpact',
  'typography',
  'color',
  'iconography',
  'responsive',
  'motion',
  'fidelity',
  'genericTemplateResistance'
]

export const validateVisualScorecard = (scorecard, { evidenceExists = () => true } = {}) => {
  const findings = []
  const scores = []

  for (const dimension of REQUIRED_VISUAL_DIMENSIONS) {
    const entry = scorecard.dimensions?.[dimension]

    if (!entry || !Number.isFinite(entry.score) || entry.score < 1 || entry.score > 5) {
      findings.push(`${dimension}: score must be 1..5`)
      continue
    }

    scores.push(entry.score)
    if (!entry.rationale || entry.rationale.trim().length < 24) findings.push(`${dimension}: rationale is too short`)
    if (!entry.evidence || entry.evidence.trim().length < 3) findings.push(`${dimension}: evidence reference is required`)

    if (entry.score < 4.5 && (!entry.nextAction || entry.nextAction.trim().length < 12)) {
      findings.push(`${dimension}: score below 4.5 requires nextAction`)
    }
  }

  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
  const floor = scores.length ? Math.min(...scores) : 0

  if (average < 4.5) findings.push(`average ${average.toFixed(2)} is below 4.50`)
  if (floor < 4) findings.push(`dimension floor ${floor.toFixed(1)} is below 4`)
  if ((scorecard.dimensions?.hierarchy?.score ?? 0) < 4.5) findings.push('hierarchy must be at least 4.5')
  if ((scorecard.dimensions?.fidelity?.score ?? 0) < 4.5) findings.push('fidelity must be at least 4.5')
  if ((scorecard.dimensions?.genericTemplateResistance?.score ?? 0) < 4.5) findings.push('genericTemplateResistance must be at least 4.5')
  if ((scorecard.dimensions?.surfaceEconomy?.score ?? 0) < 4.5) findings.push('surfaceEconomy must be at least 4.5')
  if ((scorecard.dimensions?.visualImpact?.score ?? 0) < 4.5) findings.push('visualImpact must be at least 4.5')

  for (const viewport of ['desktop', 'mobile']) {
    const evidence = scorecard.evidence?.[viewport]

    if (!evidence) findings.push(`${viewport} evidence is required`)
    else if (!evidenceExists(evidence)) findings.push(`${viewport} evidence does not exist: ${evidence}`)
  }

  if (!scorecard.evidence?.dossier) findings.push('review dossier evidence is required')
  else if (!evidenceExists(scorecard.evidence.dossier)) findings.push(`review dossier does not exist: ${scorecard.evidence.dossier}`)

  return { findings, average, floor }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) {
  const args = process.argv.slice(2)
  const taskIndex = args.findIndex(arg => arg === '--task')
  const taskId = taskIndex >= 0 ? args[taskIndex + 1] : args.find(arg => arg.startsWith('--task='))?.slice(7)

  if (!taskId || !/^TASK-\d{3,}$/.test(taskId)) throw new Error('Usage: ui-quality --task TASK-###')

  const repoRoot = resolve(import.meta.dirname, '../..')
  const reviewsDir = resolve(repoRoot, 'docs/ui/reviews')
  const scorecardName = readdirSync(reviewsDir).find(name => name.startsWith(`${taskId}-`) && name.endsWith('.scorecard.json'))

  if (!scorecardName) {
    console.error(`UI quality gate: BLOCK (${taskId})`)
    console.error(`- missing docs/ui/reviews/${taskId}-*.scorecard.json`)
    process.exit(1)
  }

  const scorecard = JSON.parse(readFileSync(resolve(reviewsDir, scorecardName), 'utf8'))

  const result = validateVisualScorecard(scorecard, {
    evidenceExists: path => existsSync(resolve(repoRoot, path))
  })

  if (result.findings.length) {
    console.error(`UI quality gate: BLOCK (${taskId}) average=${result.average.toFixed(2)} floor=${result.floor.toFixed(1)}`)
    for (const finding of result.findings) console.error(`- ${finding}`)
    process.exit(1)
  }

  console.log(`UI quality gate: PASS (${taskId}) average=${result.average.toFixed(2)} floor=${result.floor.toFixed(1)}`)
}
