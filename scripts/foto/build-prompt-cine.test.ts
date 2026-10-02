// Registro cine en la ficha (casebook 2026-10-02). Dos cosas se cierran con llave acá:
// 1. Los campos del oficio (`llave`, `primerPlano`, `fondo`, `fenomeno`, `alcance`) se compilan en el prompt y su
//    ausencia AVISA, porque cada uno es una falla medida que las sesiones repetían.
// 2. Nada de esto toca a los demás registros: una ficha sin `registro: "cine"` produce el mismo prompt de siempre.
//    La prueba fuerte de eso es `scripts/foto/regresion-prompt.mjs` sobre todas las fichas en disco; acá queda la
//    versión mínima que corre en CI.
import { describe, expect, it } from 'vitest'

import { AJUSTES_CINE, ALCANCES_CINE, ajustarParaCine, auditarCine, bloqueCine, construirPrompt, esObjetoPersonaje } from './build-prompt.mjs'

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
    expect(prompt).toContain('DEPTH: in the immediate foreground, very close to the lens: the dark corner of the meeting table. It is soft and out of focus')
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

// Prueba ciega del 2026-10-02: las tres sesiones salieron con la cara rellena y una con el fondo ámbar porque
// los bloques compartidos piden «documentary», «shadows open», «real sunlight» y «warm-neutral».
describe('bloques compartidos en cine', () => {
  it('ninguna frase documental sobrevive en un prompt cine', () => {
    const { prompt } = construirPrompt(completa)

    for (const [de, a] of AJUSTES_CINE) {
      expect(prompt).not.toContain(de)
      if (prompt.includes(a.slice(0, 20))) expect(prompt).toContain(a)
    }

    expect(prompt).toContain('a real cinematic film still')
    expect(prompt).toContain('white balance cool-neutral')
    expect(prompt).toContain('never as a flat horizontal band')
  })

  it('fuera de cine los bloques quedan intactos', () => {
    const { prompt } = construirPrompt(base)

    expect(prompt).toContain('a real candid documentary photograph')
    expect(prompt).toContain('shadows open')
    expect(prompt).toContain('white balance warm-neutral')
    expect(ajustarParaCine('sin frases')).toBe('sin frases')
  })

  it('en vertical también el fondo queda bajo el 36 %', () => {
    expect(construirPrompt({ ...completa, formato: '9:16' }).prompt).toContain('Every background light and figure stays BELOW 36%')
    expect(construirPrompt(completa).prompt).not.toContain('Every background light')
  })

  it('la sección partida 1:1 reserva la izquierda sólo si la ficha lo pide', () => {
    const izquierda = construirPrompt({ ...completa, formato: '1:1', alcance: 'deck-seccion', reservas: { texto: { muro: 'the dark studio wall', tinta: 'blanca', lado: 'izquierda' } } }).prompt

    expect(izquierda).toContain('the LEFT 40% of the frame is the dark studio wall')
    expect(izquierda).not.toContain('the TOP 28%')

    const arriba = { ...completa, formato: '1:1', alcance: 'deck-seccion', reservas: { texto: { muro: 'the dark studio wall', tinta: 'blanca' } } }

    expect(construirPrompt(arriba).prompt).toContain('the TOP 28%')
    expect(auditarCine(arriba).join('\n')).toContain('"lado": "izquierda"')
  })

  it('una ficha con __completar avisa', () => {
    expect(auditarCine({ ...completa, __completar: ['llave'] }).join('\n')).toContain('__completar')
  })
})

describe('decisiones del operador 2026-10-02 en cine', () => {
  const conPersona = { ...completa, identidad: [{ persona: 'nexa', expresion: 'conviccion' }] }

  it('en vertical la escala se pide por encuadre; en 16:9 no', () => {
    expect(bloqueCine(conPersona, '9:16')).toContain('framed from the waist up')
    expect(bloqueCine(conPersona, '4:5')).toContain('framed from the chest up')
    expect(bloqueCine(conPersona, '16:9')).not.toContain('SUBJECT SCALE')
    expect(bloqueCine(completa, '9:16')).not.toContain('SUBJECT SCALE')
  })

  it('en la sección partida la mirada va al lado del texto', () => {
    expect(bloqueCine({ ...completa, alcance: 'deck-seccion' }, '1:1')).toContain('never into the lens')
    expect(bloqueCine(completa, '16:9')).not.toContain('GAZE')
  })

  it('los aros de Nexa salen dorados en cine', () => {
    expect(ajustarParaCine('small silver earrings, geometric studs or medium hoops depending on context, never gold and never ornate')).toContain('small gold earrings')
  })
})

describe('prueba ciega 2 (2026-10-02)', () => {
  it('el hoodie conserva su azul royal; las demás prendas van navy', () => {
    expect(construirPrompt({ ...completa, objetos: [{ objeto: 'hoodie-efeonce' }] }).prompt).toContain('the hoodie keeps the exact royal blue')
    expect(construirPrompt({ ...completa, objetos: [{ objeto: 'hoodie-efeonce' }] }).prompt).not.toContain('never royal blue')
    expect(construirPrompt({ ...completa, objetos: [{ objeto: 'polo-efeonce' }] }).prompt).toContain('deep navy, never royal blue')
  })

  it('una ficha con __revisar avisa', () => {
    expect(auditarCine({ ...completa, __revisar: ['suspendido'] }).join('\n')).toContain('__revisar')
  })
})
