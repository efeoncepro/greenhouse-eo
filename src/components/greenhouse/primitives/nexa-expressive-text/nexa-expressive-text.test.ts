/**
 * NexaExpressiveText plain-text contract (TASK-1096).
 *
 * Lockea la derivación de texto plano de `getNexaExpressiveTextPlainText` — el camino que NO se ve
 * en GVC: lo que termina en el portapapeles (botón "Copiar" de la response toolbar) y lo que anuncia
 * un lector de pantalla. En particular el segmento `citation` debe aportar su marcador `[n]` para que
 * la cita sea audible/copiable, no se pierda en el render visual del superscript.
 */
import { describe, expect, it } from 'vitest'

import { getNexaExpressiveTextPlainText, hasExpressiveTextSegments } from './NexaExpressiveText'
import type { NexaCitationSource, NexaExpressiveTextValue } from './nexa-expressive-text-types'

const source = (overrides: Partial<NexaCitationSource> & { id: string; label: string }): NexaCitationSource => ({
  title: 'Fuente',
  excerpt: 'Fragmento citado.',
  ...overrides
})

describe('hasExpressiveTextSegments', () => {
  it('discrimina string vs array de segmentos', () => {
    expect(hasExpressiveTextSegments('texto plano')).toBe(false)
    expect(hasExpressiveTextSegments([])).toBe(true)
    expect(hasExpressiveTextSegments([{ text: 'a' }])).toBe(true)
  })
})

describe('getNexaExpressiveTextPlainText', () => {
  it('pasa el string crudo tal cual (sin segmentos)', () => {
    expect(getNexaExpressiveTextPlainText('Impacto sube sin aislarse.')).toBe('Impacto sube sin aislarse.')
  })

  it('concatena segmentos de texto (con y sin type explícito), ignorando el style visual', () => {
    const value: NexaExpressiveTextValue = [
      { text: 'Impacto ' },
      { type: 'text', text: 'sube ', style: 'strong' },
      { text: 'con cuidado.', style: 'emphasis' }
    ]

    expect(getNexaExpressiveTextPlainText(value)).toBe('Impacto sube con cuidado.')
  })

  it('emoji: prefiere el label accesible; cae al glyph cuando no hay label', () => {
    expect(getNexaExpressiveTextPlainText([{ type: 'emoji', value: '📈', label: 'tendencia al alza' }])).toBe('tendencia al alza')
    expect(getNexaExpressiveTextPlainText([{ type: 'emoji', value: '📈' }])).toBe('📈')
  })

  it('break aporta un salto de línea', () => {
    expect(getNexaExpressiveTextPlainText([{ text: 'a' }, { type: 'break' }, { text: 'b' }])).toBe('a\nb')
  })

  it('citation aporta el marcador [n] (contrato clipboard + screen-reader)', () => {
    const value: NexaExpressiveTextValue = [{ type: 'citation', source: source({ id: 'c1', label: '1' }) }]

    // Espacio inicial + corchetes: la cita queda audible/copiable, no se pierde con el superscript visual.
    expect(getNexaExpressiveTextPlainText(value)).toBe(' [1]')
  })

  it('arma la prosa completa con citas inline en el span exacto (caso mockup)', () => {
    const value: NexaExpressiveTextValue = [
      { text: 'La lectura útil está en la relación entre señales' },
      { type: 'citation', source: source({ id: 'chunk-impacto-01', label: '1' }) },
      { text: '; abre la base solo si es una decisión sensible' },
      { type: 'citation', source: source({ id: 'chunk-calibration-01', label: '3' }) },
      { text: '.' }
    ]

    expect(getNexaExpressiveTextPlainText(value)).toBe(
      'La lectura útil está en la relación entre señales [1]; abre la base solo si es una decisión sensible [3].'
    )
  })

  it('el array vacío produce string vacío (degradación honesta, no throw)', () => {
    expect(getNexaExpressiveTextPlainText([])).toBe('')
  })
})
