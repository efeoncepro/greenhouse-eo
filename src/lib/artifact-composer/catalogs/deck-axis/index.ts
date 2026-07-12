/**
 * Catálogo `deck-axis` — el deck de propuestas 16:9 (1920×1080) → PDF (TASK-1393 Slice 1b).
 *
 * Un catálogo es DATO, no una rama del motor: plantillas `.html` + `registry.json` + contratos
 * `*.slots.json` + `deck-signature.css` + `assets/` (íconos Solar, clay 3D, squad, chrome SVG).
 * Este módulo sólo publica DÓNDE vive ese dato, resuelto relativo al módulo — NUNCA relativo al
 * `cwd` del proceso (la fragilidad que tenía `solar-icons.ts` leyendo desde `docs/`, que además
 * era una inversión de capas: documentación leída con `fs` en runtime).
 *
 * ⚠️ Los retratos de `assets/squad/` son FOTOS REALES de colaboradores (PII):
 *   - Se usan EXCLUSIVAMENTE para componer láminas de equipo (`TeamSplit`) de propuestas
 *     client-facing que el squad ya aprobó — nunca caras generadas por IA (tergiversación).
 *   - Viven en este repo privado como parte del catálogo de Efeonce. Si el día de mañana el motor
 *     se extrae a `packages/artifact-composer` (EPIC-027) o Creative Studio lo consume, el
 *     CATÁLOGO no viaja por defecto: es dato de la org dueña (`ownerOrgId=efeonce`), no del
 *     paquete. NUNCA replicarlos a un paquete/artefacto público "porque estaban en la carpeta".
 *
 * Slice 2 convierte esto en el contrato completo del catálogo (registry + resolvers + iconSet +
 * canvas + outputTarget + ownerOrgId). Hasta entonces, la constante del dir es la costura.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import { deckAxisResolvers } from './resolvers'
import { deckAxisSemanticValidators } from './semantic-validators'
import { timelineLayoutHook, timelineSlideValidator } from './timeline-hooks'

/**
 * Home del catálogo, resuelto module-relative. Nota para el worker de TASK-1391: un bundle que
 * reubique este módulo debe INYECTAR el dir del catálogo explícitamente (el contrato lo recibe
 * como dato); esta constante es el default correcto para CLI/tests/gate del repo.
 */
export const deckAxisCatalogDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * El catálogo completo, como DATO: esto es lo que un consumer (CLI, gate, worker de TASK-1391) le
 * pasa a `composeArtifact`/`resolvePlan`. El motor no sabe nada de esto — y esa es la regla.
 */
export const deckAxisCatalog: ArtifactCatalog = {
  name: 'deck-axis',
  // Dueño explícito (costura ASaaS): el deck AXIS es de Efeonce. "global" jamás es un default.
  ownerOrgId: 'efeonce',
  templatesDir: deckAxisCatalogDir,
  outputTarget: 'pdf-merged',
  resolvers: deckAxisResolvers,
  slideValidators: { TimelineFull: timelineSlideValidator },
  layoutHooks: { TimelineFull: timelineLayoutHook },
  semanticValidators: deckAxisSemanticValidators,
  // La marca que gobierna el render, sellable en el manifest: el pack axis compilado + su font pack.
  brand: {
    packName: 'axis',
    compiledFiles: ['deck-tokens.css', 'deck-fonts.css'],
    fontsManifestPath: path.join(axisPackDir, 'fonts.json')
  }
}
