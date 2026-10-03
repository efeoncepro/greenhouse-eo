import { describe, expect, it } from 'vitest'

import { bindUnitSpaces } from './composition-helpers'

describe('bindUnitSpaces', () => {
  it('une la cifra a «%» y «pp» con espacio duro en todo el árbol de slots (lead de Berel 2026-10-03)', () => {
    const slots = {
      lead: 'Los clics bajaron a 13.606 (−17,0 %) y el CTR cayó 0,4 pp.',
      items: [{ value: '98 %' }, { value: '<1 %' }],
      folio: { page: '07', total: '22' },
      asset: 'assets/channels/chatgpt.svg'
    }

    expect(bindUnitSpaces(slots)).toEqual({
      lead: 'Los clics bajaron a 13.606 (−17,0 %) y el CTR cayó 0,4 pp.',
      items: [{ value: '98 %' }, { value: '<1 %' }],
      folio: { page: '07', total: '22' },
      asset: 'assets/channels/chatgpt.svg'
    })
  })

  it('no toca una palabra que empieza por «pp» ni un espacio que no sigue a una cifra', () => {
    expect(bindUnitSpaces('3 ppts y el % del total')).toBe('3 ppts y el % del total')
  })
})
