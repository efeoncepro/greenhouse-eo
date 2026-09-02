/**
 * TASK-1804 — Lectura de FILESYSTEM del catálogo de manuales. SÓLO para el generador del artefacto
 * (`scripts/ci/mcp-skill-catalog-artifact.ts`) y los tests.
 *
 * 🔴 NUNCA importar este módulo desde código alcanzable por una ruta de Next. Turbopack analiza
 * estáticamente las lecturas de `fs` con rutas dinámicas y, al no poder resolverlas, incluye el
 * proyecto ENTERO en la función (medido: 397 MB contra un techo de 250 MB, deploys
 * `greenhouse-oib3ykjp0` y `greenhouse-ril6rq7xs`, 2026-09-02) aunque la función nunca se ejecute.
 * El runtime consume `skill-catalog.generated.json` a través de `skill-catalog.ts`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import {
  buildGreenhouseMcpSkillUri,
  computeGreenhouseMcpSkillCoverage,
  GREENHOUSE_MCP_SKILL_MANIFEST,
  GREENHOUSE_MCP_SKILLS_ROOT,
  type GreenhouseMcpSkillFileObservation,
  type GreenhouseMcpSkillManifestEntry
} from './skill-manifest'
import {
  GreenhouseMcpSkillCatalogError,
  hashGreenhouseMcpSkillBody,
  parseGreenhouseMcpSkillFrontmatter,
  type GreenhouseMcpSkill,
  type GreenhouseMcpSkillCatalog
} from './skill-catalog'
import { GREENHOUSE_MCP_TOOL_MANIFEST, type GreenhouseMcpToolManifestEntry } from './tool-manifest'

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

/**
 * Construye el catálogo validado DESDE EL FILESYSTEM. LANZA `GreenhouseMcpSkillCatalogError` con
 * todos los findings si el manifiesto y los archivos no coinciden en las dos direcciones.
 *
 * Es la fuente del generador del artefacto y de los tests (parametrizado en root/manifest/tools
 * para ejercitar estados sintéticos sobre un directorio temporal). El runtime NO la usa.
 */
export const loadGreenhouseMcpSkillCatalogFromFilesystem = (
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
      contentHash: hashGreenhouseMcpSkillBody(body)
    }
  })

  return {
    skills,
    byName: new Map(skills.map(skill => [skill.name, skill])),
    catalogHash: hashGreenhouseMcpSkillBody(skills.map(skill => skill.contentHash).join('\n'))
  }
}

