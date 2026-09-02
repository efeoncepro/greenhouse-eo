/**
 * TASK-1804 — Genera y verifica el artefacto del catálogo de manuales MCP.
 *
 * ═══ Por qué un artefacto generado y no filesystem en runtime ═══
 *
 * La primera versión leía `docs/mcp/skills/**` con `readFileSync` en runtime y declaraba los
 * `.md` en `outputFileTracingIncludes`. El build de Vercel lo rechazó: al recibir includes propios,
 * la ruta deja de agruparse con las demás y la función sola (runtime de Next + dependencias) pesó
 * **397 MB** contra un techo de 250 MB (deploy `greenhouse-oib3ykjp0`, 2026-09-02). No era un
 * problema de tamaño de los manuales: era la clase de problema "filesystem input del runtime".
 *
 * Este artefacto la cierra en vez de vigilarla: los cuerpos viajan DENTRO del bundle como JSON
 * importado, sin `fs` ni tracing. Y no es una copia a mano —es el molde de `TASK-1780`—:
 *
 *   - se GENERA desde el filesystem con el mismo reader que valida la cobertura bidireccional
 *     (manual declarado sin archivo, archivo sin declarar, frontmatter, appliesTo);
 *   - lleva `catalogHash` de su propio contenido; el runtime lo re-verifica al cargar;
 *   - `pnpm mcp:skills:check` (en `local:check` y en CI) falla si el artefacto committeado
 *     difiere del filesystem, así que un manual editado sin regenerar rompe el push, no producción.
 *
 * Uso:
 *   pnpm mcp:skills:check      # gate
 *   pnpm mcp:skills:generate   # regenera
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildGreenhouseMcpSkillCatalogArtifact, GREENHOUSE_MCP_SKILL_CATALOG_ARTIFACT_PATH } from '@/mcp/greenhouse/skill-catalog'
import { loadGreenhouseMcpSkillCatalogFromFilesystem } from '@/mcp/greenhouse/skill-catalog-fs'

const ARTIFACT_PATH = join(process.cwd(), GREENHOUSE_MCP_SKILL_CATALOG_ARTIFACT_PATH)

const catalog = loadGreenhouseMcpSkillCatalogFromFilesystem()
const artifact = buildGreenhouseMcpSkillCatalogArtifact(catalog)
const next = `${JSON.stringify(artifact, null, 2)}\n`
const shortHash = artifact.catalogHash.slice(0, 12)

if (process.argv.includes('--write')) {
  writeFileSync(ARTIFACT_PATH, next, 'utf8')
  console.log(`mcp:skills — artefacto regenerado (${artifact.skillCount} manuales, hash ${shortHash}).`)
} else {
  let current: string | null = null

  try {
    current = readFileSync(ARTIFACT_PATH, 'utf8')
  } catch {
    console.error(
      `mcp:skills — falta ${GREENHOUSE_MCP_SKILL_CATALOG_ARTIFACT_PATH}. Genera con: pnpm mcp:skills:generate`
    )
    process.exit(1)
  }

  if (current !== next) {
    console.error(
      'mcp:skills — el artefacto committeado NO coincide con docs/mcp/skills/** ni con el manifiesto. ' +
        'Un manual editado sin regenerar serviría texto viejo en producción sin que nada falle. ' +
        'Regenera con: pnpm mcp:skills:generate'
    )
    process.exit(1)
  }

  console.log(`mcp:skills — artefacto al dia (${artifact.skillCount} manuales, hash ${shortHash}).`)
}
