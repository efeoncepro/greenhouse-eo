// Registro cine en la ficha (casebook 2026-10-02). Dos cosas se cierran con llave acá:
// 1. Los campos del oficio (`llave`, `primerPlano`, `fondo`, `fenomeno`, `alcance`) se compilan en el prompt y su
//    ausencia AVISA, porque cada uno es una falla medida que las sesiones repetían.
// 2. Nada de esto toca a los demás registros: una ficha sin `registro: "cine"` produce el mismo prompt de siempre.
//    La prueba fuerte de eso es `scripts/foto/regresion-prompt.mjs` sobre todas las fichas en disco; acá queda la
//    versión mínima que corre en CI.
import { describe, expect, it } from 'vitest'

import { ALCANCES_CINE, auditarCine, bloqueCine, construirPrompt, esObjetoPersonaje } from './build-prompt.mjs'

const base = {
  id: 'cine-prueba',
  formato: '16:9',
  impacto: true,
  palanca: 'luz-motivada',
  atmosfera: 'bruma',
  escena:
    'SCENE (cinematic still, a dark studio at night): a strategist stands on the RIGHT half of the frame, a hard beam of light cuts through the haze. 85mm lens at f/2, about two meters away.',
  lecho: { objeto: 'the near edge of a dark meeting table', tono: 'DARK near black' },
  reservas: { texto: { muro: 'the calm dark space on the left half', tinta: 'blanca' } }
}

const completa = {
  ...base,
  registro: 'cine',
  alcance: 'proposal-cinematic',
  llave: { fuente: 'a fist-sized core of azure light', lado: 'below and to the right of her face', distancia: 'about 30 cm away' },
  primerPlano: 'the dark corner of the meeting table',
  fondo: 'a row of large cold practical lights melted into bokeh',
  fenomeno: { que: 'one azure beam picks a single card out of thousands', esServicio: 'AEO: la IA te elige a ti' }
}

describe('registro cine en la ficha', () => {
  it('una ficha sin registro cine no recibe ningún bloque ni aviso de cine', () => {
    expect(bloqueCine(base, base.formato)).toBeNull()
    expect(auditarCine(base)).toEqual([])

    const { prompt } = construirPrompt(base)

    expect(prompt).not.toContain('CINEMATIC CRAFT')
    expect(prompt).not.toContain('matte and non-reflective')
  })

  it('los campos del oficio entran al prompt, y el lecho sale mate', () => {
    const { prompt } = construirPrompt(completa)

    expect(prompt).toContain('KEY LIGHT: a fist-sized core of azure light, below and to the right of her face, about 30 cm away.')
    expect(prompt).toContain('NO fill light, NO front light')
    expect(prompt).toContain('DEPTH: in the immediate foreground, very close to the lens, the dark corner of the meeting table')
    expect(prompt).toContain('BACKGROUND: a row of large cold practical lights melted into bokeh.')
    expect(prompt).toContain('THE LIGHT PHENOMENON: one azure beam picks a single card out of thousands.')
    expect(prompt).toContain('matte and non-reflective, outside the reach of the key light')
    expect(auditarCine(completa)).toEqual([])
  })

  it('en vertical el fenómeno se baja del 36 % por nombre', () => {
    const { prompt } = construirPrompt({ ...completa, formato: '4:5' })

    expect(prompt).toContain('stays entirely BELOW 36% of the frame height')
    expect(construirPrompt(completa).prompt).not.toContain('BELOW 36% of the frame height')
  })

  it('una prenda del uniforme pide navy, nunca azul rey', () => {
    const { prompt } = construirPrompt({ ...completa, objetos: [{ objeto: 'polo-efeonce' }] })

    expect(prompt).toContain('deep navy, never royal blue')
  })

  it('cada campo faltante avisa con su falla del casebook', () => {
    const avisos = auditarCine({ ...base, registro: 'cine' }).join('\n')

    for (const campo of ['alcance', 'llave', 'primerPlano', 'fondo', 'fenomeno.que']) expect(avisos).toContain(campo)
    expect(avisos).toContain('cine-reviewer')
  })

  it('el fenómeno sin «por qué es el servicio» avisa', () => {
    const avisos = auditarCine({ ...completa, fenomeno: { que: 'a ring of light' } }).join('\n')

    expect(avisos).toContain('esServicio')
  })

  it('más de dos personajes con referencia avisa (stickers en abanico)', () => {
    const objetos = ['spark-reportes', 'spark-contenido', 'spark-servicio'].map(objeto => ({ objeto }))
    const avisos = auditarCine({ ...completa, objetos }).join('\n')

    expect(avisos).toContain('3 personajes con referencia propia')
    expect(auditarCine({ ...completa, objetos: objetos.slice(0, 2) })).toEqual([])
  })

  it('la publicidad con equipo queda marcada en prueba', () => {
    expect(auditarCine({ ...completa, alcance: 'publicidad-prueba' }).join('\n')).toContain('EN PRUEBA')
  })

  it('un alcance que no existe aborta', () => {
    expect(() => construirPrompt({ ...completa, alcance: 'instagram-equipo' })).toThrow(/alcance/)
    expect(ALCANCES_CINE).toContain('proposal-cinematic')
  })

  it('reconoce a los personajes del catálogo, no a las prendas', () => {
    expect(esObjetoPersonaje('spark-reportes')).toBe(true)
    expect(esObjetoPersonaje('codex')).toBe(true)
    expect(esObjetoPersonaje('polo-efeonce')).toBe(false)
    expect(esObjetoPersonaje('traje-bionico-nexa')).toBe(false)
  })
})
