/**
 * TASK-1804 — El manifiesto de MANUALES de uso de la superficie MCP: hermano del de tools.
 *
 * ═══ Para qué existe ═══
 *
 * Todo lo que un agente sabe sobre cómo operar las tools de Greenhouse cabía en un párrafo: las
 * `instructions` del handshake, que viajan en CADA request y por eso no pueden crecer, y las
 * `description` de cada tool, que están siempre en contexto y sirven para DISPARAR, no para
 * ENSEÑAR. Este manifiesto abre el segundo canal: manuales curados que el agente carga sólo
 * cuando los necesita, por la tool `get_greenhouse_skill` y por el recurso
 * `skill://efeonce/<name>/SKILL.md`.
 *
 * ═══ Qué declara y qué NO ═══
 *
 * Declara QUÉ manuales existen, para QUIÉN (`audience`), DÓNDE vive su cuerpo y QUÉ tools
 * gobierna cada uno (`appliesTo`, validado contra el manifiesto de tools: si la tool que un manual
 * enseña desaparece o se renombra, el servidor no construye — un manual que enseña un
 * procedimiento muerto es peor que ninguno).
 *
 * 🔴 NO transcribe `description`. El frontmatter YAML de cada `SKILL.md` (`name` + `description`,
 * el mismo contrato de Agent Skills / SEP-2640) es la fuente del catálogo; copiarlo acá
 * reintroduce exactamente el drift que un manifiesto existe para impedir. `name` es la CLAVE y se
 * verifica igual en los dos lados.
 *
 * 🔴 Este módulo es PURO (sin filesystem) a propósito: `tool-manifest.ts` lo importa para derivar
 * la línea de ruteo de las `instructions`, y un import de `node:fs` ahí arrastraría el
 * filesystem a todo consumidor del inventario. La lectura de los cuerpos vive en
 * `skill-catalog.ts`.
 *
 * Publicar es un acto explícito: manual declarado sin archivo, o archivo bajo `docs/mcp/skills/`
 * sin entrada acá, hace fallar la construcción del servidor — mismo contrato que
 * `GREENHOUSE_MCP_TOOL_MANIFEST`.
 */
import type { GreenhouseMcpToolManifestEntry } from './tool-manifest'

/**
 * A quién se le sirve el manual.
 *
 * `internal`: sólo bindings de scope `internal` del lane ecosystem. Para cualquier otro binding el
 * manual NO EXISTE — `404` anti-oráculo en catálogo y detalle, nunca `403` (un 403 confirma que
 * hay algo que no se puede leer).
 *
 * `client`: reservado. Ningún manual nace con este valor hasta que existan grants por tenant
 * (`TASK-1631`); el tipo se define hoy para que el gating exista desde el día uno.
 */
export type GreenhouseMcpSkillAudience = 'internal' | 'client'

export interface GreenhouseMcpSkillManifestEntry {
  /** Nombre exacto: clave del catálogo, segmento del URI `skill://` y `name` del frontmatter. */
  name: string
  audience: GreenhouseMcpSkillAudience
  /** Ruta del cuerpo relativa a la raíz del repo. Siempre bajo `docs/mcp/skills/`. */
  sourcePath: string
  /** Tools que este manual gobierna. Cada una DEBE existir en el manifiesto de tools. */
  appliesTo: readonly string[]
}

/** Directorio raíz de los manuales publicables, relativo a la raíz del repo. */
export const GREENHOUSE_MCP_SKILLS_ROOT = 'docs/mcp/skills'

/** El nombre de un manual: kebab-case, sin puntos ni barras — es segmento de URI y de ruta. */
export const GREENHOUSE_MCP_SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Esquema del recurso MCP que sirve el cuerpo. Se mantiene compatible con SEP-2640 (`skill://`). */
export const GREENHOUSE_MCP_SKILL_URI_PREFIX = 'skill://efeonce/'

export const buildGreenhouseMcpSkillUri = (name: string): string =>
  `${GREENHOUSE_MCP_SKILL_URI_PREFIX}${name}/SKILL.md`

/**
 * El inventario de manuales. Los tres primeros ya existían como conocimiento mal alojado (en las
 * `instructions`, repartidos entre descripciones, o dentro de la `description` de una sola tool); los
 * tres siguientes cubren los caminos SEO federados que quedaban sin manual: discovery→tracking,
 * salud técnica/off-page y diagnóstico de prospecto.
 *
 * Techo declarado: si el catálogo pasa de ~12 manuales se particiona por dominio antes de seguir
 * agregando (estimación, no medición — se revisa al pasar de 6).
 */
export const GREENHOUSE_MCP_SKILL_MANIFEST: readonly GreenhouseMcpSkillManifestEntry[] = [
  {
    name: 'seo-spend-discipline',
    audience: 'internal',
    sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/seo-spend-discipline/SKILL.md`,
    appliesTo: [
      'track_seo_keywords',
      'untrack_seo_keywords',
      'declare_seo_competitors',
      'retire_seo_competitors',
      'discover_seo_keywords',
      'run_seo_prospect_diagnostic',
      'get_seo_entitlement'
    ]
  },
  {
    name: 'seo-visibility-reading',
    audience: 'internal',
    sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/seo-visibility-reading/SKILL.md`,
    appliesTo: [
      'get_seo_overview_kpis',
      'get_seo_keyword_opportunities',
      'get_seo_performance',
      'get_seo_performance_catalog',
      'get_seo_rank_evolution',
      'get_seo_dual_lens_visibility',
      'get_seo_visibility_360',
      'get_seo_domain_overview',
      'get_seo_url_visibility',
      'get_seo_keyword_market_data',
      'get_seo_serp_top_results',
      'get_seo_work_queue'
    ]
  },
  {
    name: 'competitor-loop',
    audience: 'internal',
    sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/competitor-loop/SKILL.md`,
    appliesTo: [
      'get_seo_competitor_candidates',
      'declare_seo_competitors',
      'retire_seo_competitors',
      'get_seo_keyword_gap',
      'get_seo_serp_top_results'
    ]
  },
  {
    name: 'seo-discovery-to-tracking',
    audience: 'internal',
    sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/seo-discovery-to-tracking/SKILL.md`,
    appliesTo: ['discover_seo_keywords', 'get_seo_keyword_discovery', 'track_seo_keywords', 'get_seo_performance_catalog']
  },
  {
    name: 'seo-technical-health',
    audience: 'internal',
    sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/seo-technical-health/SKILL.md`,
    appliesTo: ['get_seo_site_audit_report', 'get_seo_backlink_profile', 'get_seo_backlink_detail', 'get_seo_entitlement']
  },
  {
    name: 'seo-prospect-diagnostic',
    audience: 'internal',
    sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/seo-prospect-diagnostic/SKILL.md`,
    appliesTo: ['run_seo_prospect_diagnostic', 'get_seo_prospect_diagnostic']
  }
] as const

export const GREENHOUSE_MCP_SKILL_MANIFEST_BY_NAME: ReadonlyMap<string, GreenhouseMcpSkillManifestEntry> =
  new Map(GREENHOUSE_MCP_SKILL_MANIFEST.map(entry => [entry.name, entry]))

/**
 * Los modos en que el manifiesto de manuales y la realidad se separan. Función PURA para que el
 * test inyecte estados sintéticos: un guard cuyo poder de detección nunca se ejercita tampoco
 * prueba nada (misma doctrina que `computeGreenhouseMcpToolCoverage`).
 */
export interface GreenhouseMcpSkillCoverageFinding {
  code:
    | 'declared_without_file'
    | 'file_without_declaration'
    | 'invalid_name'
    | 'source_path_outside_root'
    | 'frontmatter_name_mismatch'
    | 'frontmatter_description_missing'
    | 'applies_to_unknown_tool'
    | 'applies_to_empty'
    | 'duplicate_name'
  skill: string
  message: string
}

export interface GreenhouseMcpSkillFileObservation {
  /** Ruta relativa a la raíz del repo, tal como se encontró en el filesystem. */
  sourcePath: string
  /** `name` del frontmatter, o null si no se pudo leer. */
  frontmatterName: string | null
  /** `description` del frontmatter, o null si falta o está vacía. */
  frontmatterDescription: string | null
}

export const computeGreenhouseMcpSkillCoverage = (input: {
  manifest: readonly GreenhouseMcpSkillManifestEntry[]
  files: readonly GreenhouseMcpSkillFileObservation[]
  tools: readonly Pick<GreenhouseMcpToolManifestEntry, 'name'>[]
}): GreenhouseMcpSkillCoverageFinding[] => {
  const findings: GreenhouseMcpSkillCoverageFinding[] = []
  const toolNames = new Set(input.tools.map(tool => tool.name))
  const filesByPath = new Map(input.files.map(file => [file.sourcePath, file]))
  const declaredPaths = new Set<string>()
  const seenNames = new Set<string>()

  for (const entry of input.manifest) {
    if (seenNames.has(entry.name)) {
      findings.push({
        code: 'duplicate_name',
        skill: entry.name,
        message: `Greenhouse MCP skills: "${entry.name}" está declarado dos veces en el manifiesto.`
      })
    }

    seenNames.add(entry.name)
    declaredPaths.add(entry.sourcePath)

    if (!GREENHOUSE_MCP_SKILL_NAME_PATTERN.test(entry.name)) {
      findings.push({
        code: 'invalid_name',
        skill: entry.name,
        message:
          `Greenhouse MCP skills: "${entry.name}" no es un nombre válido (kebab-case). ` +
          'Es segmento del URI skill:// y de la ruta de la lane: sin puntos, barras ni mayúsculas.'
      })
    }

    if (!entry.sourcePath.startsWith(`${GREENHOUSE_MCP_SKILLS_ROOT}/`)) {
      findings.push({
        code: 'source_path_outside_root',
        skill: entry.name,
        message:
          `Greenhouse MCP skills: "${entry.name}" apunta a "${entry.sourcePath}", fuera de ` +
          `${GREENHOUSE_MCP_SKILLS_ROOT}/. Sólo se publica lo que vive ahí — nunca .claude/skills/**.`
      })
    }

    if (entry.appliesTo.length === 0) {
      findings.push({
        code: 'applies_to_empty',
        skill: entry.name,
        message: `Greenhouse MCP skills: "${entry.name}" no gobierna ninguna tool. Un manual sin tool no tiene disparador.`
      })
    }

    for (const tool of entry.appliesTo) {
      if (!toolNames.has(tool)) {
        findings.push({
          code: 'applies_to_unknown_tool',
          skill: entry.name,
          message:
            `Greenhouse MCP skills: "${entry.name}" gobierna "${tool}", que no existe en el manifiesto ` +
            'de tools. O la tool se renombró y el manual enseña un procedimiento muerto, o es un typo.'
        })
      }
    }

    const file = filesByPath.get(entry.sourcePath)

    if (!file) {
      findings.push({
        code: 'declared_without_file',
        skill: entry.name,
        message:
          `Greenhouse MCP skills: el manifiesto declara "${entry.name}" y no existe ${entry.sourcePath}. ` +
          'Escribe el manual, o quita la entrada del manifiesto. No hay publicación silenciosa.'
      })

      continue
    }

    if (file.frontmatterName !== entry.name) {
      findings.push({
        code: 'frontmatter_name_mismatch',
        skill: entry.name,
        message:
          `Greenhouse MCP skills: ${entry.sourcePath} declara name="${String(file.frontmatterName)}" y el ` +
          `manifiesto "${entry.name}". El nombre es la clave y tiene que ser el mismo en los dos lados.`
      })
    }

    if (!file.frontmatterDescription) {
      findings.push({
        code: 'frontmatter_description_missing',
        skill: entry.name,
        message:
          `Greenhouse MCP skills: ${entry.sourcePath} no tiene description en el frontmatter. ` +
          'El catálogo la LEE de ahí; sin ella el manual no se puede anunciar.'
      })
    }
  }

  for (const file of input.files) {
    if (!declaredPaths.has(file.sourcePath)) {
      findings.push({
        code: 'file_without_declaration',
        skill: file.frontmatterName ?? file.sourcePath,
        message:
          `Greenhouse MCP skills: ${file.sourcePath} existe sin entrada en el manifiesto. ` +
          'Publicar es un acto explícito: declara el manual o retira el archivo.'
      })
    }
  }

  return findings
}
