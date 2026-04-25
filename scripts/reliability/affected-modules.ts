#!/usr/bin/env tsx

/**
 * TASK-633 — CLI invocado por `.github/workflows/reliability-verify.yml`.
 *
 * Lee los archivos cambiados de un PR y emite la lista de módulos afectados
 * + smoke specs a ejecutar. Diseñado para correr en GitHub Actions.
 *
 * Modos de input (en orden de precedencia):
 *   1) `--files <archivo1> <archivo2> ...` (lista explícita)
 *   2) `--from-git --base <ref>` (default: origin/develop) → ejecuta
 *      `git diff --name-only <base>...HEAD` y consume el resultado.
 *   3) Default: `--from-git --base origin/develop`.
 *
 * Output:
 *  - stdout legible (detalle por línea)
 *  - si `$GITHUB_OUTPUT` está definido, escribe `modules=` y `specs=` ahí
 *    para que el workflow las consuma en steps posteriores.
 *
 * Exit codes:
 *  - 0 siempre que el script corra. Si no hay módulos afectados, escribe
 *    `modules=` (vacío) y el workflow detecta para skipear el job de specs.
 *  - 1 solo si hay error real (git diff falla, args inválidos).
 */

import { execSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'

import { getAffectedModules, mapModulesToSmokeSpecs } from '@/lib/reliability/affected-modules'

interface ParsedArgs {
  files: string[] | null
  base: string
  fromGit: boolean
}

const parseArgs = (argv: string[]): ParsedArgs => {
  const args: ParsedArgs = { files: null, base: 'origin/develop', fromGit: false }
  let collectingFiles = false
  const collectedFiles: string[] = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--files') {
      collectingFiles = true

      continue
    }

    if (arg === '--base') {
      collectingFiles = false
      args.base = argv[i + 1] ?? args.base
      i += 1

      continue
    }

    if (arg === '--from-git') {
      collectingFiles = false
      args.fromGit = true

      continue
    }

    if (collectingFiles) {
      collectedFiles.push(arg)
    }
  }

  if (collectedFiles.length > 0) {
    args.files = collectedFiles
  }

  if (!args.files && !args.fromGit) {
    args.fromGit = true
  }

  return args
}

const readChangedFilesFromGit = (base: string): string[] => {
  try {
    const output = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' })

    return output
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  } catch (error) {
    process.stderr.write(`[reliability] git diff failed against base=${base}: ${(error as Error).message}\n`)
    process.exit(1)
  }
}

const writeGithubOutput = (modules: string[], specs: string[]) => {
  const githubOutput = process.env.GITHUB_OUTPUT

  if (!githubOutput) return

  const payload =
    `modules=${modules.join(',')}\n` +
    `modules_count=${modules.length}\n` +
    `specs=${specs.join(' ')}\n` +
    `specs_count=${specs.length}\n`

  appendFileSync(githubOutput, payload, 'utf8')
}

const main = () => {
  const args = parseArgs(process.argv.slice(2))

  const changedFiles = args.files ?? readChangedFilesFromGit(args.base)

  if (changedFiles.length === 0) {
    process.stdout.write('No changed files detected.\n')
    writeGithubOutput([], [])

    return
  }

  process.stdout.write(`Changed files (${changedFiles.length}):\n`)

  for (const file of changedFiles) {
    process.stdout.write(`  ${file}\n`)
  }

  const modules = getAffectedModules(changedFiles)
  const specs = mapModulesToSmokeSpecs(modules)

  process.stdout.write(`\nAffected modules (${modules.length}): ${modules.join(', ') || '<none>'}\n`)
  process.stdout.write(`Smoke specs to run (${specs.length}): ${specs.join(' ') || '<none>'}\n`)

  writeGithubOutput(modules, specs)
}

main()
