import registryJson from '../../../data/dataforseo/cli-versions.json'

export type DataForSeoCliVersionBump = 'initial' | 'major' | 'minor' | 'patch'

export interface DataForSeoCliVersionRelease {
  version: string
  date: string
  bump: DataForSeoCliVersionBump
  summary: string
  changes: string[]
  sourceRefs: string[]
}

export interface DataForSeoCliVersionRegistry {
  schemaVersion: 1
  currentVersion: string
  sourceDigest: string
  governedPaths: string[]
  releases: DataForSeoCliVersionRelease[]
}

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const parseSemver = (version: string) => {
  const match = SEMVER_PATTERN.exec(version)

  if (!match) throw new Error(`Versión inválida: ${version}. Usa SemVer X.Y.Z sin prefijos ni prerelease.`)

  return match.slice(1).map(Number) as [number, number, number]
}

const compareSemver = (left: string, right: string) => {
  const a = parseSemver(left)
  const b = parseSemver(right)

  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }

  return 0
}

const expectedBump = (previous: string, next: string): Exclude<DataForSeoCliVersionBump, 'initial'> => {
  const [previousMajor, previousMinor, previousPatch] = parseSemver(previous)
  const [nextMajor, nextMinor, nextPatch] = parseSemver(next)

  if (nextMajor === previousMajor + 1 && nextMinor === 0 && nextPatch === 0) return 'major'
  if (nextMajor === previousMajor && nextMinor === previousMinor + 1 && nextPatch === 0) return 'minor'
  if (nextMajor === previousMajor && nextMinor === previousMinor && nextPatch === previousPatch + 1) return 'patch'

  throw new Error(`El salto ${previous} → ${next} debe incrementar exactamente major, minor o patch.`)
}

export const validateDataForSeoCliVersionRegistry = (input: unknown): DataForSeoCliVersionRegistry => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Registro de versiones inválido.')

  const registry = input as Partial<DataForSeoCliVersionRegistry>

  if (registry.schemaVersion !== 1) throw new Error('schemaVersion del registro debe ser 1.')

  if (!Array.isArray(registry.governedPaths) || registry.governedPaths.length === 0) {
    throw new Error('El registro debe declarar governedPaths.')
  }

  if (new Set(registry.governedPaths).size !== registry.governedPaths.length) {
    throw new Error('governedPaths no admite duplicados.')
  }

  if (!Array.isArray(registry.releases) || registry.releases.length === 0) {
    throw new Error('El registro debe contener al menos una release.')
  }

  registry.releases.forEach((release, index) => {
    parseSemver(release.version)
    if (!DATE_PATTERN.test(release.date)) throw new Error(`Fecha inválida para ${release.version}.`)
    if (!release.summary.trim()) throw new Error(`Falta summary para ${release.version}.`)

    if (!Array.isArray(release.changes) || release.changes.length === 0 || release.changes.some(item => !item.trim())) {
      throw new Error(`Faltan changes para ${release.version}.`)
    }

    if (!Array.isArray(release.sourceRefs) || release.sourceRefs.length === 0) {
      throw new Error(`Faltan sourceRefs para ${release.version}.`)
    }

    if (index === 0) {
      if (release.bump !== 'initial') throw new Error('La primera release debe usar bump=initial.')

      return
    }

    const previous = registry.releases![index - 1]

    if (compareSemver(previous.version, release.version) >= 0) {
      throw new Error(`Las releases deben estar ordenadas sin duplicados: ${previous.version}, ${release.version}.`)
    }

    const expected = expectedBump(previous.version, release.version)

    if (release.bump !== expected) {
      throw new Error(`${release.version} declara bump=${release.bump}; corresponde ${expected}.`)
    }
  })

  const latest = registry.releases.at(-1)!

  if (registry.currentVersion !== latest.version) {
    throw new Error(`currentVersion ${registry.currentVersion ?? '(vacía)'} no coincide con ${latest.version}.`)
  }

  if (typeof registry.sourceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(registry.sourceDigest)) {
    throw new Error('sourceDigest debe ser un SHA-256 hexadecimal.')
  }

  return registry as DataForSeoCliVersionRegistry
}

export const DATAFORSEO_CLI_VERSION_REGISTRY = validateDataForSeoCliVersionRegistry(registryJson)
export const DATAFORSEO_CLI_VERSION = DATAFORSEO_CLI_VERSION_REGISTRY.currentVersion
