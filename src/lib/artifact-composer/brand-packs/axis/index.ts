/**
 * Brand pack `axis` — el pack de presentación de Efeonce (TASK-1393 Slice 3b).
 *
 * AXIS es *el brand pack de Efeonce*, no *el* brand pack: el motor recibe cualquier `BrandPack` y
 * este módulo sólo construye el de la casa, desde sus DOS fuentes verificables:
 *
 *   1. `axis-ppt-snapshot.json` — las 68 Color Primitives del Figma `Sistema Axis - PPT`
 *      (committeadas con fileKey/nodeId/checksum; el build nunca llama a Figma).
 *   2. El ledger del catálogo deck-axis (`catalogs/deck-axis/brand/color-ledger.json`) — las altas
 *      `deck-primitive`/`recipe-token` que EXTIENDEN la colección Deck del mismo Figma. ⚠️ Mientras
 *      su `figma.status` sea `proposed`, la fuente transitoria es el ledger: cuando el operador
 *      valide las variables en el Sistema Axis - PPT, se registra su nodeId y el snapshot pasa a
 *      ser la única fuente. Esa transición NO cambia valores (igualdad exacta o nada).
 *
 * `contrastEnforcement: 'advisory'`: el pack de hoy está afinado a mano y nadie había medido su
 * contraste — un guard bloqueante acá impediría cerrar el refactor hasta rediseñar la paleta, que
 * es exactamente la regresión estética prohibida. Las violaciones se REPORTAN siempre y salen como
 * follow-up de diseño. Un pack de cliente nace `blocking`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { BrandPack, BrandPackColor } from '../../brand-pack'

const PACK_DIR = path.dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_PATH = path.join(PACK_DIR, 'axis-ppt-snapshot.json')
const ROLES_PATH = path.join(PACK_DIR, 'roles.json')
const LEDGER_PATH = path.resolve(PACK_DIR, '../../catalogs/deck-axis/brand/color-ledger.json')

interface SnapshotFile {
  source: { fileKey: string; nodeId: string }
  primitives: Record<string, string>
}

interface LedgerFile {
  bases: Record<
    string,
    {
      classification: string
      name: string | null
      figma: { collection: string; status: 'exists' | 'proposed'; nodeId: string | null } | null
    }
  >
}

interface RolesFile {
  roles: Record<string, string>
  contrastPairs: Array<{ fg: string; bg: string; min: number; context: string }>
}

/** `blue/800` (nombre Figma) → `--axis-ppt-blue-800` (custom property). */
export const pptCssVar = (figmaName: string): string => `--axis-ppt-${figmaName.replace(/\//g, '-')}`

export const buildAxisBrandPack = (): BrandPack => {
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')) as SnapshotFile
  const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) as LedgerFile
  const rolesFile = JSON.parse(fs.readFileSync(ROLES_PATH, 'utf8')) as RolesFile

  const colors = new Map<string, BrandPackColor>()

  // 1 · Las 68 primitives PPT — existen en Figma, con node conocido.
  for (const [figmaName, hex] of Object.entries(snapshot.primitives)) {
    const cssVar = pptCssVar(figmaName)

    colors.set(cssVar, {
      cssVar,
      hex: hex.toLowerCase(),
      source: { collection: 'Color Primitives', figmaName, nodeId: snapshot.source.nodeId, status: 'exists' }
    })
  }

  // 2 · Las altas del ledger (deck-primitive + recipe-token) — proposed hasta validación en Figma.
  for (const [hex, entry] of Object.entries(ledger.bases)) {
    if (entry.classification === 'ppt-primitive') continue

    if (!entry.name || !entry.figma) {
      throw new Error(`Ledger inconsistente: la base ${hex} no tiene nombre/figma (¿quedó pending?).`)
    }

    colors.set(entry.name, {
      cssVar: entry.name,
      hex,
      source: {
        collection: entry.figma.collection,
        nodeId: entry.figma.nodeId,
        status: entry.figma.status
      }
    })
  }

  return {
    name: 'axis',
    version: '1.0.0',
    contrastEnforcement: 'advisory',
    colors: [...colors.values()],
    roles: Object.entries(rolesFile.roles).map(([name, colorVar]) => ({ name, colorVar })),
    contrastPairs: rolesFile.contrastPairs
  }
}
