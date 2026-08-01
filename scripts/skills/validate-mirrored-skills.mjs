#!/usr/bin/env node
/**
 * Fails when a versioned Codex/Claude skill mirror drifts.
 *
 * Keep the manifest intentionally small: an entry means the two complete bundles
 * are a shared contract, not merely similarly named skills.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const repo = resolve(new URL('../..', import.meta.url).pathname)
const mirroredSkills = ['efeonce-mcp-platform']

const filesIn = root => {
  if (!existsSync(root)) return null

  const visit = directory =>
    readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return visit(path)
      
return entry.isFile() ? [relative(root, path)] : []
    })

  return visit(root).sort()
}

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const failures = []

for (const skill of mirroredSkills) {
  const codexRoot = join(repo, '.codex', 'skills', skill)
  const claudeRoot = join(repo, '.claude', 'skills', skill)
  const codexFiles = filesIn(codexRoot)
  const claudeFiles = filesIn(claudeRoot)

  if (!codexFiles || !claudeFiles) {
    failures.push(`${skill}: mirror directory missing`)
    continue
  }

  const paths = [...new Set([...codexFiles, ...claudeFiles])].sort()

  for (const path of paths) {
    if (!codexFiles.includes(path) || !claudeFiles.includes(path)) {
      failures.push(`${skill}: ${path} exists in only one mirror`)
      continue
    }

    if (digest(join(codexRoot, path)) !== digest(join(claudeRoot, path))) {
      failures.push(`${skill}: ${path} content differs`)
    }
  }
}

if (failures.length) {
  console.error(`✗ Mirrored skill drift (${failures.length})`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`✓ Mirrored skills are identical: ${mirroredSkills.join(', ')}`)
