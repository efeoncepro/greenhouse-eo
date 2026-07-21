#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { parseTaskMarkdown } from './task-lint/parser.mjs'

const repoRoot = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
const taskIndex = args.findIndex(arg => arg === '--task')
const taskId = taskIndex >= 0 ? args[taskIndex + 1] : args.find(arg => arg.startsWith('--task='))?.slice(7)
const contractOnly = args.includes('--contract-only')

if (!taskId || !/^TASK-\d{3,}$/.test(taskId)) {
  throw new Error('Usage: ui-visual-gate --task TASK-### [--contract-only]')
}

const walk = dir => {
  if (!existsSync(dir)) return []

  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)

    
return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const taskPath = walk(resolve(repoRoot, 'docs/tasks')).find(path => path.endsWith('.md') && path.includes(`/${taskId}-`))

if (!taskPath) throw new Error(`Task not found: ${taskId}`)

const taskSource = readFileSync(taskPath, 'utf8')
const task = parseTaskMarkdown({ filePath: taskPath.replace(`${repoRoot}/`, ''), repoRoot, source: taskSource })
const wireframePath = (task.status.fields.Wireframe ?? '').replace(/^`(.+)`$/, '$1').trim()
const wireframe = existsSync(resolve(repoRoot, wireframePath)) ? readFileSync(resolve(repoRoot, wireframePath), 'utf8') : ''
const scenarioPath = wireframe.match(/Scenario file:\s*`?([^`\n]+\.scenario\.ts)`?/i)?.[1]?.trim()
const findings = []

if (!scenarioPath || !existsSync(resolve(repoRoot, scenarioPath))) {
  findings.push('wireframe must reference an existing GVC scenario file')
} else {
  const scenarioSource = readFileSync(resolve(repoRoot, scenarioPath), 'utf8')

  if (!/qualityProfile:\s*['\"]premium['\"]/.test(scenarioSource)) findings.push('scenario must declare qualityProfile: premium')

  if (!/name:\s*['\"]desktop['\"][\s\S]{0,100}(?:width:\s*(?:1280|1440|2048)|device:)/.test(scenarioSource)) {
    findings.push('scenario must declare a desktop viewport variant')
  }

  if (!/name:\s*['\"]mobile['\"][\s\S]{0,100}(?:width:\s*390|device:)/.test(scenarioSource)) {
    findings.push('scenario must declare a 390px mobile viewport variant')
  }

  if (!/reducedMotionCheck:\s*true/.test(scenarioSource)) findings.push('premium scenario must capture reduced-motion keyboard evidence')
}

if (!contractOnly && scenarioPath) {
  const scenarioName = readFileSync(resolve(repoRoot, scenarioPath), 'utf8').match(/name:\s*['\"]([^'\"]+)['\"]/)?.[1]

  const manifests = walk(resolve(repoRoot, '.captures'))
    .filter(path => path.endsWith('/manifest.json'))
    .map(path => ({ path, stat: statSync(path) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)

  const match = manifests.find(item => {
    try {
      return JSON.parse(readFileSync(item.path, 'utf8')).scenarioName === scenarioName
    } catch {
      return false
    }
  })

  if (!match) {
    findings.push(`no GVC capture found for scenario ${scenarioName ?? 'unknown'}`)
  } else {
    const manifest = JSON.parse(readFileSync(match.path, 'utf8'))
    const captureDir = resolve(match.path, '..')

    if (manifest.exitCode !== 0) findings.push(`latest capture failed: ${match.path.replace(`${repoRoot}/`, '')}`)
    if (manifest.qualityProfile !== 'premium') findings.push('capture manifest is not premium')
    if (manifest.enterpriseRubric?.verdict !== 'pass') findings.push('enterprise rubric did not pass')
    if (!manifest.variants?.some(variant => variant.viewport?.width === 390 || variant.name === 'mobile')) findings.push('capture lacks mobile variant evidence')
    if (!existsSync(join(captureDir, 'review-dossier.md'))) findings.push('capture review-dossier.md is missing')

    const uiRigor = taskSource.match(/UI rigor:\s*`?(ui-[a-z]+)`?/i)?.[1]

    if (uiRigor === 'ui-platform') {
      const surfaceId = manifest.baseline?.surfaceId

      if (!surfaceId) findings.push('ui-platform premium capture requires baseline.surfaceId')
      else if (!existsSync(resolve(repoRoot, 'scripts/frontend/baselines', surfaceId))) {
        findings.push(`durable baseline missing for ${surfaceId}`)
      }
    }
  }
}

if (findings.length) {
  console.error(`UI visual gate: BLOCK (${taskId})`)
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`UI visual gate: PASS (${taskId}${contractOnly ? ', contract-only' : ''})`)
