import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { deckAxisCatalogDir } from '../catalogs/deck-axis'

const template = fs.readFileSync(path.join(deckAxisCatalogDir, 'cover-full.html'), 'utf8')

const contract = JSON.parse(fs.readFileSync(path.join(deckAxisCatalogDir, 'cover-full.slots.json'), 'utf8')) as {
  slots: { clientLogo: { constraints: { normalization: string } } }
}

const skyOnDark = fs.readFileSync(path.join(deckAxisCatalogDir, 'assets/clients/sky-on-dark.svg'), 'utf8')

describe('CoverFull — marcas nativas sobre fondo oscuro', () => {
  it('preserva el color del asset del cliente y no aplica filtros de recoloración', () => {
    expect(template).not.toMatch(/\.logo-client[^}]*filter\s*:/s)
    expect(contract.slots.clientLogo.constraints.normalization).toBe('native-on-dark')
  })

  it('usa la geometría oficial compacta de SKY y conserva su verde en la variante on-dark', () => {
    expect(skyOnDark).toContain('viewBox="0 0 68 26"')
    expect(skyOnDark).toContain('fill="#46DC28"')
    expect(skyOnDark).toContain('fill="#FFFFFF"')
    expect(skyOnDark).not.toContain('#78028A')
  })
})
