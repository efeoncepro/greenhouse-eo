// Utilidades de los gates del workbench. Sin dependencias: corren con Node puro en el CI.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const sha256 = buf => createHash('sha256').update(buf).digest('hex')

export function readJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'))
}

export function readLock() {
  const file = path.join(ROOT, '.workbench/sync.lock.json')

  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}

/** Archivos versionados en git (lo que el PR realmente trae), no lo que hay en disco. */
export function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean)
}

export function report(name, problems) {
  if (!problems.length) {
    console.log(`✓ ${name}`)

    return true
  }

  console.log(`✗ ${name} (${problems.length})`)
  for (const p of problems.slice(0, 40)) console.log(`   - ${p}`)
  if (problems.length > 40) console.log(`   … y ${problems.length - 40} más`)

  return false
}
