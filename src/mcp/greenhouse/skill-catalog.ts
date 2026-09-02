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
 * ═══ Runtime: artefacto generado, NUNCA filesystem ═══
 *
 * La primera versión leía `docs/mcp/skills/**` en runtime y declaraba los `.md` en
 * `outputFileTracingIncludes`. Vercel rechazó el build: una ruta con includes propios deja de
 * agruparse con las demás y la función sola pesó 397 MB (techo 250 MB). La clase de problema es
 * "filesystem input del runtime", y se cierra en vez de vigilarse: el catálogo viaja como
 * `skill-catalog.generated.json` importado en el bundle. Se GENERA con este mismo reader
 * (`pnpm mcp:skills:generate`), lleva `catalogHash`, y `pnpm mcp:skills:check` (en `local:check` y
 * CI) falla si difiere del filesystem. Al cargar, el runtime re-verifica el hash y la coincidencia
 * con el manifiesto: un artefacto viejo o editado a mano LANZA, nunca sirve texto viejo en verde.
 *
 * 🔴 Este módulo NO importa `node:fs`. La lectura de filesystem vive en `skill-catalog-fs.ts`
 * (generador + tests): Turbopack analiza estáticamente las lecturas de `fs` con rutas dinámicas
 * (`readdirSync`/`readFileSync` sobre `process.cwd()`) y, al no poder resolverlas, incluyó el
 * proyecto ENTERO en la función — 397 MB — aunque el código no se ejecutara en runtime. Un `fs`
 * en un módulo alcanzable desde una ruta es una regresión de esta clase.
 */
import { createHash } from 'node:crypto'

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
import generatedSkillCatalog from './skill-catalog.generated.json'
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

/** SHA-256 del cuerpo de un manual: `contentHash` del catálogo y ETag de la lane. */
export const hashGreenhouseMcpSkillBody = (value: string): string => createHash('sha256').update(value).digest('hex')

const sha256 = hashGreenhouseMcpSkillBody

/** Ruta del artefacto generado, relativa a la raíz del repo. */
export const GREENHOUSE_MCP_SKILL_CATALOG_ARTIFACT_PATH = 'src/mcp/greenhouse/skill-catalog.generated.json'

export interface GreenhouseMcpSkillCatalogArtifact {
  $comment: string
  source: string
  generator: string
  catalogHash: string
  skillCount: number
  skills: Array<{
    name: string
    description: string
    audience: GreenhouseMcpSkillAudience
    appliesTo: string[]
    uri: string
    sourcePath: string
    body: string
    contentHash: string
  }>
}

/** La forma exacta que `pnpm mcp:skills:generate` escribe. Determinista: mismo catálogo ⇒ mismos bytes. */
export const buildGreenhouseMcpSkillCatalogArtifact = (
  catalog: GreenhouseMcpSkillCatalog
): GreenhouseMcpSkillCatalogArtifact => ({
  $comment:
    'GENERADO por pnpm mcp:skills:generate (TASK-1804). NO editar a mano: el hash y el gate de ' +
    'Greenhouse lo detectan. La fuente es docs/mcp/skills/**/SKILL.md + skill-manifest.ts.',
  source: `greenhouse-eo/${GREENHOUSE_MCP_SKILLS_ROOT}`,
  generator: 'pnpm mcp:skills:generate',
  catalogHash: catalog.catalogHash,
  skillCount: catalog.skills.length,
  skills: catalog.skills.map(skill => ({
    name: skill.name,
    description: skill.description,
    audience: skill.audience,
    appliesTo: [...skill.appliesTo],
    uri: skill.uri,
    sourcePath: skill.sourcePath,
    body: skill.body,
    contentHash: skill.contentHash
  }))
})

/**
 * Reconstruye el catálogo desde el artefacto y lo RE-VERIFICA: hash por manual y del catálogo,
 * coincidencia exacta con el manifiesto (nombres, orden, audiencia, appliesTo, sourcePath) y
 * frontmatter presente. Un artefacto viejo, truncado o editado a mano LANZA nombrando el manual.
 */
export const buildGreenhouseMcpSkillCatalogFromArtifact = (
  artifact: GreenhouseMcpSkillCatalogArtifact,
  manifest: readonly GreenhouseMcpSkillManifestEntry[] = GREENHOUSE_MCP_SKILL_MANIFEST,
  tools: readonly Pick<GreenhouseMcpToolManifestEntry, 'name'>[] = GREENHOUSE_MCP_TOOL_MANIFEST
): GreenhouseMcpSkillCatalog => {
  const files: GreenhouseMcpSkillFileObservation[] = artifact.skills.map(skill => {
    const frontmatter = parseGreenhouseMcpSkillFrontmatter(skill.body)

    return {
      sourcePath: skill.sourcePath,
      frontmatterName: frontmatter.name,
      frontmatterDescription: frontmatter.description
    }
  })

  const findings = computeGreenhouseMcpSkillCoverage({ manifest, files, tools })

  if (findings.length > 0) {
    throw new GreenhouseMcpSkillCatalogError(findings)
  }

  const byName = new Map(artifact.skills.map(skill => [skill.name, skill]))

  const skills: GreenhouseMcpSkill[] = manifest.map(entry => {
    const skill = byName.get(entry.name)

    // La cobertura ya cruzó rutas y frontmatter; acá se cruza lo que el artefacto AFIRMA del
    // manifiesto y del cuerpo, porque un JSON no se valida solo.
    if (!skill) {
      throw new Error(`Greenhouse MCP skills: el artefacto no contiene "${entry.name}". Regenera con pnpm mcp:skills:generate.`)
    }

    if (
      skill.audience !== entry.audience ||
      skill.sourcePath !== entry.sourcePath ||
      skill.uri !== buildGreenhouseMcpSkillUri(entry.name) ||
      skill.appliesTo.length !== entry.appliesTo.length ||
      skill.appliesTo.some((tool, index) => tool !== entry.appliesTo[index])
    ) {
      throw new Error(
        `Greenhouse MCP skills: el artefacto de "${entry.name}" no coincide con el manifiesto ` +
          '(audience/sourcePath/uri/appliesTo). Regenera con pnpm mcp:skills:generate.'
      )
    }

    if (sha256(skill.body) !== skill.contentHash) {
      throw new Error(`Greenhouse MCP skills: el cuerpo de "${entry.name}" no coincide con su contentHash — artefacto editado a mano o corrupto.`)
    }

    return {
      name: entry.name,
      description: parseGreenhouseMcpSkillFrontmatter(skill.body).description ?? '',
      audience: entry.audience,
      appliesTo: entry.appliesTo,
      uri: skill.uri,
      sourcePath: skill.sourcePath,
      body: skill.body,
      contentHash: skill.contentHash
    }
  })

  const catalogHash = sha256(skills.map(skill => skill.contentHash).join('\n'))

  if (catalogHash !== artifact.catalogHash) {
    throw new Error('Greenhouse MCP skills: el catalogHash del artefacto no coincide con su contenido — editado a mano o corrupto.')
  }

  return {
    skills,
    byName: new Map(skills.map(skill => [skill.name, skill])),
    catalogHash
  }
}

let cachedCatalog: GreenhouseMcpSkillCatalog | null = null

/**
 * Catálogo de RUNTIME, memoizado por proceso: se construye desde el artefacto generado que viaja
 * en el bundle (cero filesystem, cero tracing). Un artefacto que no coincide con el manifiesto
 * LANZA al primer uso — la construcción del servidor MCP y la lane fallan loud, nunca sirven un
 * catálogo vacío ni texto viejo en verde.
 */
export const getGreenhouseMcpSkillCatalog = (): GreenhouseMcpSkillCatalog => {
  if (!cachedCatalog) {
    cachedCatalog = buildGreenhouseMcpSkillCatalogFromArtifact(
      generatedSkillCatalog as unknown as GreenhouseMcpSkillCatalogArtifact
    )
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
