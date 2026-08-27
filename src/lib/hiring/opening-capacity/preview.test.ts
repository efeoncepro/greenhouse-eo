import { describe, expect, it } from 'vitest'

import { computeEffectDigest } from './preview'

import type { ClosureCohortMember } from './types'

/**
 * TASK-1762 Slice 2 — el digest es la única guarda que impide cerrar una cohorte distinta de la que
 * el humano aprobó. Estos tests fijan sus dos propiedades, y las dos importan por razones opuestas.
 */

const member = (applicationId: string, category: ClosureCohortMember['category'] = 'eligible'): ClosureCohortMember => ({
  applicationId,
  category,
  stage: 'screening'
})

const base = {
  openingId: 'opng-1',
  targetSeats: 2,
  occupiedSeats: 2,
  members: [member('app-1'), member('app-2')]
}

describe('computeEffectDigest', () => {
  it('es estable ante el orden: la misma cohorte da la misma huella', () => {
    // Importa porque el orden de las filas de PG no está garantizado sin ORDER BY estable. Si el
    // digest dependiera del orden, el operador vería su confirmación rechazada al azar y aprendería
    // a reintentar a ciegas — que es exactamente la conducta que esta guarda existe para evitar.
    const forward = computeEffectDigest(base)
    const reversed = computeEffectDigest({ ...base, members: [...base.members].reverse() })

    expect(forward).toBe(reversed)
  })

  it('cambia si entra alguien nuevo a la cohorte', () => {
    expect(computeEffectDigest({ ...base, members: [...base.members, member('app-3')] })).not.toBe(
      computeEffectDigest(base)
    )
  })

  it('cambia si alguien sale de la cohorte', () => {
    expect(computeEffectDigest({ ...base, members: [member('app-1')] })).not.toBe(computeEffectDigest(base))
  })

  it('cambia si la MISMA persona cambia de categoría', () => {
    // El caso sutil: la cohorte tiene los mismos ids, pero alguien pasó a `backup_selected` — o sea
    // adquirió un compromiso abierto — y por eso ya no debería cerrarse por defecto. Si el digest
    // sólo mirara los ids, el confirm pasaría y le cerraríamos a alguien cuya situación cambió.
    const promoted = [member('app-1'), member('app-2', 'backup')]

    expect(computeEffectDigest({ ...base, members: promoted })).not.toBe(computeEffectDigest(base))
  })

  it('cambia si se movieron los cupos', () => {
    // Una selección nueva mueve `occupiedSeats`: la vacante puede haber dejado de estar llena.
    expect(computeEffectDigest({ ...base, occupiedSeats: 1 })).not.toBe(computeEffectDigest(base))
  })

  it('no colisiona entre vacantes distintas con cohorte idéntica', () => {
    expect(computeEffectDigest({ ...base, openingId: 'opng-2' })).not.toBe(computeEffectDigest(base))
  })
})
