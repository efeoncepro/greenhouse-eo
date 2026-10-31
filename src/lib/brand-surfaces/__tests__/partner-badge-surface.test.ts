/**
 * La insignia de partner se elige por CONTRASTE con la superficie donde se posa (operador, 2026-10-31): la placa crema
 * de HubSpot se disuelve sobre papel. Sobre azul noche se toma la que AXIS declara para fondo oscuro; sobre papel, si
 * AXIS no publica una que contraste, la pieza no compone en vez de pintar la que no se ve.
 */

import { describe, expect, it } from 'vitest'

import { SurfacePieceError } from '../index'
import { partnerBadge } from '../recipes/frame'

const HUBSPOT = 'hubspot-partner-readback-2026-10-06'
const SALESFORCE = 'salesforce-partner-authorization-2026-09-29'

describe('insignia de partner por contraste de superficie', () => {
  it('sobre azul noche toma la variante que se lee en oscuro', () => {
    expect(partnerBadge('revenue-hubspot', HUBSPOT).ref).toBe('asset-ref:file:hubspot-solutions-partner-gold-light')
    expect(partnerBadge('revenue-salesforce', SALESFORCE, 'dark').ref).toBe('asset-ref:file:salesforce-partner-badge-horizontal')
  })

  it('sobre papel no compone con una insignia hecha para fondo oscuro', () => {
    expect(() => partnerBadge('revenue-salesforce', SALESFORCE, 'light')).toThrow(SurfacePieceError)
    expect(() => partnerBadge('revenue-salesforce', SALESFORCE, 'light')).toThrow(/contraste con una superficie clara/)
  })
})
