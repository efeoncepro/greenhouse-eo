/**
 * TASK-1804 — El reader canónico de los manuales MCP: UN primitive, tres consumidores.
 *
 * La tool `get_greenhouse_skill`, el recurso `skill://efeonce/<name>/SKILL.md` y la lane
 * `GET /api/platform/ecosystem/mcp/skills[/{name}]` leen de ACÁ. Ningún consumidor abre los `.md`
 * por su cuenta: el gateway federado delega en la lane, y la lane en este módulo.
 *
 * ═══ Contrato ═══
 *
 * - El catálogo se construye desde el filesystem (`docs/mcp/skills/**`) y se VALIDA contra el
 *   manifiesto declarativo (`skill-manifest.ts`) y contra el manifiesto de tools. Cualquier
 *   finding de cobertura LANZA: manual declarado sin archivo, archivo sin declarar, frontmatter que
 *   no coincide, tool gobernada que no existe. No hay publicación silenciosa.
 * - El cuerpo servido es el archivo VERBATIM (frontmatter incluido): es el formato de Agent Skills
 *   y de SEP-2640, y así tool, recurso y lane son byte-idénticos por construcción.
 * - `name` y `description` del catálogo vienen del frontmatter; el manifiesto sólo aporta
 *   `audience` y `appliesTo`.
 *
 * ═══ Runtime ═══
 *
 * Los `.md` son FILESYSTEM INPUT del runtime de Vercel: `next.config.ts` los incluye en el bundle
 * de las rutas que los sirven (`outputFileTracingIncludes`). Si el bundling no los incluye, este
 * reader lanza `declared_without_file` — la lane responde 500 y no un catálogo vacío en verde. Un
 * catálogo vacío con manifiesto no vacío es imposible por construcción.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { parse as parseYaml } from 'yaml'

import {
  buildGreenhouseMcpSkillUri,
  computeGreenhouseMcpSkillCoverage,
  GREENHOUSE_MCP_SKILL_MANIFEST,
  GREENHOUSE_MCP_SKILLS_ROOT,
  type GreenhouseMcpSkillAudience,
  type GreenhouseMcpSkillFileObservation,
  type GreenhouseMcpSkillManifestEntry
} from './skill-manifest'
import { GREENHOUSE_MCP_TOOL_MANIFEST, type GreenhouseMcpToolManifestEntry } from './tool-manifest'

export interface GreenhouseMcpSkill {
  name: string
  description: string
  audience: GreenhouseMcpSkillAudience
  appliesTo: readonly string[]
  uri: string
  sourcePath: string
  /** El archivo completo, verbatim. */
  body: string
  /** SHA-256 del cuerpo: ETag de la lane y prueba de byte-identidad entre consumidores. */
  contentHash: string
}

/** Lo que el catálogo ANUNCIA: nunca cuerpos — el catálogo existe para no inflar el contexto. */
export interface GreenhouseMcpSkillSummary {
  name: string
  description: string
  audience: GreenhouseMcpSkillAudience
  appliesTo: readonly string[]
  uri: string
}

export interface GreenhouseMcpSkillCatalog {
  skills: readonly GreenhouseMcpSkill[]
  byName: ReadonlyMap<string, GreenhouseMcpSkill>
  /** SHA-256 de los hashes de todos los manuales, en orden del manifiesto: ETag del catálogo. */
  catalogHash: string
}

export class GreenhouseMcpSkillCatalogError extends Error {
  readonly findings: ReturnType<typeof computeGreenhouseMcpSkillCoverage>

  constructor(findings: ReturnType<typeof computeGreenhouseMcpSkillCoverage>) {
    super(findings.map(finding => finding.message).join(' '))
    this.name = 'GreenhouseMcpSkillCatalogError'
    this.findings = findings
  }
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/

/** Lee `name` + `description` del frontmatter YAML. Tolerante a archivos sin frontmatter (→ null). */
export const parseGreenhouseMcpSkillFrontmatter = (
  markdown: string
): { name: string | null; description: string | null } => {
  const match = FRONTMATTER_PATTERN.exec(markdown)

  if (!match) {
    return { name: null, description: null }
  }

  let parsed: unknown

  try {
    parsed = parseYaml(match[1])
  } catch {
    return { name: null, description: null }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { name: null, description: null }
  }

  const record = parsed as Record<string, unknown>
  const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : null

  const description =
    typeof record.description === 'string' && record.description.trim() ? record.description.trim() : null

  return { name, description }
}

const walkMarkdownFiles = (dir: string): string[] => {
  let entries: string[]

  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }

  const files: string[] = []

  for (const entry of entries.sort()) {
    const full = join(dir, entry)
    const stats = statSync(full)

    if (stats.isDirectory()) {
      files.push(...walkMarkdownFiles(full))
    } else if (stats.isFile() && entry.toLowerCase().endsWith('.md')) {
      files.push(full)
    }
  }

  return files
}

/**
 * Observa el filesystem: todo `.md` bajo `docs/mcp/skills/` con lo que su frontmatter dice.
 * Es la mitad "realidad" de la cobertura; la otra mitad es el manifiesto.
 */
export const observeGreenhouseMcpSkillFiles = (root: string = process.cwd()): GreenhouseMcpSkillFileObservation[] => {
  const skillsRoot = join(root, GREENHOUSE_MCP_SKILLS_ROOT)

  return walkMarkdownFiles(skillsRoot).map(file => {
    const markdown = readFileSync(file, 'utf8')
    const frontmatter = parseGreenhouseMcpSkillFrontmatter(markdown)

    return {
      sourcePath: relative(root, file).split(sep).join('/'),
      frontmatterName: frontmatter.name,
      frontmatterDescription: frontmatter.description
    }
  })
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex')

/**
 * Construye el catálogo validado. LANZA `GreenhouseMcpSkillCatalogError` con todos los findings si
 * el manifiesto y el filesystem no coinciden en las dos direcciones.
 *
 * Parametrizado (root/manifest/tools) para que el test pueda ejercitar estados sintéticos sobre un
 * directorio temporal sin tocar el repo.
 */
export const loadGreenhouseMcpSkillCatalog = (
  options: {
    root?: string
    manifest?: readonly GreenhouseMcpSkillManifestEntry[]
    tools?: readonly Pick<GreenhouseMcpToolManifestEntry, 'name'>[]
  } = {}
): GreenhouseMcpSkillCatalog => {
  const root = options.root ?? process.cwd()
  const manifest = options.manifest ?? GREENHOUSE_MCP_SKILL_MANIFEST
  const tools = options.tools ?? GREENHOUSE_MCP_TOOL_MANIFEST

  const files = observeGreenhouseMcpSkillFiles(root)
  const findings = computeGreenhouseMcpSkillCoverage({ manifest, files, tools })

  if (findings.length > 0) {
    throw new GreenhouseMcpSkillCatalogError(findings)
  }

  const skills: GreenhouseMcpSkill[] = manifest.map(entry => {
    const body = readFileSync(join(root, entry.sourcePath), 'utf8')
    const frontmatter = parseGreenhouseMcpSkillFrontmatter(body)

    return {
      name: entry.name,
      // La cobertura ya garantizó que existe: si no, no llegamos acá.
      description: frontmatter.description ?? '',
      audience: entry.audience,
      appliesTo: entry.appliesTo,
      uri: buildGreenhouseMcpSkillUri(entry.name),
      sourcePath: entry.sourcePath,
      body,
      contentHash: sha256(body)
    }
  })

  return {
    skills,
    byName: new Map(skills.map(skill => [skill.name, skill])),
    catalogHash: sha256(skills.map(skill => skill.contentHash).join('\n'))
  }
}

let cachedCatalog: GreenhouseMcpSkillCatalog | null = null

/**
 * Catálogo memoizado por proceso sobre el repo real. El contenido es estático y versionado en git:
 * releerlo por request sería gasto sin información nueva. Los tests con estados sintéticos usan
 * `loadGreenhouseMcpSkillCatalog({ root })` y no pasan por acá.
 */
export const getGreenhouseMcpSkillCatalog = (): GreenhouseMcpSkillCatalog => {
  if (!cachedCatalog) {
    cachedCatalog = loadGreenhouseMcpSkillCatalog()
  }

  return cachedCatalog
}

/** Sólo para tests. */
export const resetGreenhouseMcpSkillCatalogCache = (): void => {
  cachedCatalog = null
}

export const toGreenhouseMcpSkillSummary = (skill: GreenhouseMcpSkill): GreenhouseMcpSkillSummary => ({
  name: skill.name,
  description: skill.description,
  audience: skill.audience,
  appliesTo: skill.appliesTo,
  uri: skill.uri
})

/**
 * Qué audiencias puede ver un consumidor según su binding. La regla es del lane ecosystem:
 * `internal` ve todo; cualquier otro scope ve sólo `client` (y hoy no hay ninguno, así que ve
 * vacío — y un manual `internal` para él NO EXISTE, anti-oráculo).
 */
export const resolveGreenhouseMcpSkillAudiences = (
  greenhouseScopeType: string
): ReadonlySet<GreenhouseMcpSkillAudience> =>
  greenhouseScopeType === 'internal' ? new Set(['internal', 'client']) : new Set(['client'])

/** El catálogo VISIBLE para un conjunto de audiencias: resúmenes, nunca cuerpos. */
export const listGreenhouseMcpSkills = (
  catalog: GreenhouseMcpSkillCatalog,
  audiences: ReadonlySet<GreenhouseMcpSkillAudience>
): GreenhouseMcpSkillSummary[] =>
  catalog.skills.filter(skill => audiences.has(skill.audience)).map(toGreenhouseMcpSkillSummary)

/**
 * Un manual por nombre, o `null` si no existe O no es visible — indistinguibles a propósito: el
 * consumidor que no puede leerlo tampoco puede saber que existe.
 */
export const readGreenhouseMcpSkill = (
  catalog: GreenhouseMcpSkillCatalog,
  name: string,
  audiences: ReadonlySet<GreenhouseMcpSkillAudience>
): GreenhouseMcpSkill | null => {
  const skill = catalog.byName.get(name)

  if (!skill || !audiences.has(skill.audience)) {
    return null
  }

  return skill
}
