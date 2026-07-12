import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { compileBrandPack, contrastRatio, BrandPackContrastError } from '../brand-pack'
import { buildAxisBrandPack } from '../brand-packs/axis'
import { deckAxisCatalogDir } from '../catalogs/deck-axis'

const TOKENS_PATH = path.join(deckAxisCatalogDir, 'deck-tokens.css')
const LEDGER_PATH = path.join(deckAxisCatalogDir, 'brand', 'color-ledger.json')

/**
 * TASK-1393 Slice 3b — dos gates mecánicos del brand pack:
 *
 * 1. SINCRONÍA: el CSS committeado ES la compilación del pack (mismo byte). Editar deck-tokens.css
 *    a mano, o cambiar el pack sin recompilar, rompe el build.
 * 2. **0e — el token resuelve al literal EXACTO que reemplaza** (acceptance del gate estético):
 *    para cada base del ledger, `--nombre: #base` y `--nombre-rgb: R, G, B` aparecen VERBATIM en el
 *    CSS compilado. Un token que resuelve a otro valor rompe el build, sin depender de que alguien
 *    mire el píxel. (El diff de píxel y este test se cubren mutuamente: esto atrapa el color corrido
 *    aunque el diff tuviera ruido; el diff atrapa blend/stacking/reflow que ningún test de valores ve.)
 */
describe('brand pack axis — sincronía + igualdad token↔literal (0e)', () => {
  const pack = buildAxisBrandPack()
  const compiled = compileBrandPack(pack, { rolePrefix: 'axis-deck' })
  const committed = fs.readFileSync(TOKENS_PATH, 'utf8')

  it('deck-tokens.css committeado === compilación del pack (byte a byte)', () => {
    expect(committed).toBe(compiled.css)
  })

  it('0e: cada base del ledger resuelve a su literal exacto (hex y triple RGB)', () => {
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) as {
      bases: Record<string, { classification: string; name: string | null }>
    }

    for (const [hex, entry] of Object.entries(ledger.bases)) {
      const cssVar =
        entry.classification === 'ppt-primitive' ? `--axis-ppt-${entry.name!.replace(/\//g, '-')}` : entry.name!

      expect(committed, `${cssVar} debe declarar exactamente ${hex}`).toContain(`${cssVar}: ${hex};`)

      const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map(pair => Number.parseInt(pair, 16))

      expect(committed).toContain(`${cssVar}-rgb: ${r}, ${g}, ${b};`)
    }
  })

  it('los 12 roles emiten custom property y apuntan a un color declarado', () => {
    for (const role of pack.roles) {
      expect(committed).toContain(`--axis-deck-role-${role.name}: var(${role.colorVar});`)
    }
  })

  it('el guard de contraste corre SIEMPRE y hoy axis no tiene violaciones declaradas', () => {
    expect(compiled.contrastFindings).toEqual([])
  })

  it('un pack blocking con un par imposible ABORTA al compilar, no en la lámina', () => {
    expect(() =>
      compileBrandPack(
        {
          name: 'cliente-probe',
          version: '0',
          contrastEnforcement: 'blocking',
          colors: [
            { cssVar: '--x-bg', hex: '#f0f0f0', source: { collection: 'probe', nodeId: null, status: 'proposed' } },
            { cssVar: '--x-fg', hex: '#e8e8e8', source: { collection: 'probe', nodeId: null, status: 'proposed' } }
          ],
          roles: [
            { name: 'surface', colorVar: '--x-bg' },
            { name: 'ink', colorVar: '--x-fg' }
          ],
          contrastPairs: [{ fg: 'ink', bg: 'surface', min: 4.5, context: 'texto ilegible a propósito' }]
        },
        { rolePrefix: 'probe' }
      )
    ).toThrow(BrandPackContrastError)
  })

  it('contrastRatio implementa WCAG (blanco/negro = 21)', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0)
  })
})
