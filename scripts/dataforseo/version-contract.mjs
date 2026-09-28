#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'data/dataforseo/cli-versions.json')
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

const loadRegistry = async () => JSON.parse(await readFile(REGISTRY_PATH, 'utf8'))

const parseSemver = version => {
  const match = SEMVER_PATTERN.exec(version)

  if (!match) throw new Error(`Versión inválida: ${version}.`)

  return match.slice(1).map(Number)
}

const calculateDigest = async governedPaths => {
  const hash = createHash('sha256')

  for (const relativePath of [...governedPaths].sort()) {
    const content = await readFile(path.join(REPO_ROOT, relativePath))

    hash.update(relativePath)
    hash.update('\0')
    hash.update(content)
    hash.update('\0')
  }

  return hash.digest('hex')
}

const validateRegistryShape = registry => {
  if (registry.schemaVersion !== 1) throw new Error('schemaVersion debe ser 1.')

  if (!Array.isArray(registry.governedPaths) || registry.governedPaths.length === 0) {
    throw new Error('Faltan governedPaths.')
  }

  if (new Set(registry.governedPaths).size !== registry.governedPaths.length) {
    throw new Error('governedPaths contiene duplicados.')
  }

  if (!Array.isArray(registry.releases) || registry.releases.length === 0) throw new Error('Faltan releases.')

  let previous = null

  for (const [index, release] of registry.releases.entries()) {
    const current = parseSemver(release.version)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date)) throw new Error(`Fecha inválida en ${release.version}.`)

    if (!release.summary || !Array.isArray(release.changes) || release.changes.length === 0) {
      throw new Error(`Release incompleta: ${release.version}.`)
    }

    if (!Array.isArray(release.sourceRefs) || release.sourceRefs.length === 0) {
      throw new Error(`Faltan sourceRefs en ${release.version}.`)
    }

    if (index === 0 && release.bump !== 'initial') throw new Error('La primera release debe ser initial.')

    if (previous) {
      const [major, minor, patch] = current
      const [previousMajor, previousMinor, previousPatch] = previous

      const actualBump =
        major === previousMajor + 1 && minor === 0 && patch === 0
          ? 'major'
          : major === previousMajor && minor === previousMinor + 1 && patch === 0
            ? 'minor'
            : major === previousMajor && minor === previousMinor && patch === previousPatch + 1
              ? 'patch'
              : null

      if (!actualBump) throw new Error(`Salto SemVer inválido antes de ${release.version}.`)

      if (release.bump !== actualBump) {
        throw new Error(`${release.version} declara ${release.bump}; corresponde ${actualBump}.`)
      }
    }

    previous = current
  }

  const latest = registry.releases.at(-1)

  if (registry.currentVersion !== latest.version) {
    throw new Error(`currentVersion ${registry.currentVersion} no coincide con ${latest.version}.`)
  }
}

const flagValues = (args, name) => {
  const values = []

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]

    if (token === `--${name}` && args[index + 1]) values.push(args[++index])
    else if (token.startsWith(`--${name}=`)) values.push(token.slice(name.length + 3))
  }

  return values
}

const bumpVersion = (version, bump) => {
  const [major, minor, patch] = parseSemver(version)

  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`

  throw new Error('El bump debe ser major, minor o patch.')
}

export const checkDataForSeoCliVersion = async () => {
  const registry = await loadRegistry()

  validateRegistryShape(registry)
  const actualDigest = await calculateDigest(registry.governedPaths)

  if (registry.sourceDigest !== actualDigest) {
    throw new Error(
      `La implementación DataForSEO CLI cambió sin versionarse. Registrado=${registry.sourceDigest}; actual=${actualDigest}. ` +
        'Ejecuta pnpm dataforseo:version:bump -- <major|minor|patch> --summary "..." --change "..." --ref "TASK/commit".'
    )
  }

  return { version: registry.currentVersion, sourceDigest: actualDigest, releaseCount: registry.releases.length }
}

const bumpDataForSeoCliVersion = async args => {
  const bump = args[1]
  const summary = flagValues(args, 'summary').at(-1)
  const changes = flagValues(args, 'change')
  const sourceRefs = flagValues(args, 'ref')

  if (!summary || changes.length === 0 || sourceRefs.length === 0) {
    throw new Error('bump exige --summary, al menos un --change y al menos un --ref.')
  }

  const registry = await loadRegistry()

  validateRegistryShape(registry)
  const sourceDigest = await calculateDigest(registry.governedPaths)

  if (registry.sourceDigest === sourceDigest) {
    throw new Error('No hay cambios en las fuentes gobernadas; no se crea una versión vacía.')
  }

  const version = bumpVersion(registry.currentVersion, bump)
  const date = new Date().toISOString().slice(0, 10)

  const next = {
    ...registry,
    currentVersion: version,
    sourceDigest,
    releases: [...registry.releases, { version, date, bump, summary, changes, sourceRefs }]
  }

  await writeFile(REGISTRY_PATH, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8' })

  return { version, sourceDigest: next.sourceDigest }
}

const main = async () => {
  const args = process.argv.slice(2).filter(token => token !== '--')
  const command = args[0] ?? 'check'

  if (command === 'digest') {
    const registry = await loadRegistry()

    console.log(await calculateDigest(registry.governedPaths))

    return
  }

  if (command === 'check') {
    console.log(JSON.stringify(await checkDataForSeoCliVersion()))

    return
  }

  if (command === 'bump') {
    console.log(JSON.stringify(await bumpDataForSeoCliVersion(args)))

    return
  }

  throw new Error(`Comando desconocido: ${command}. Usa check, digest o bump.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
