// Estos tests existen por un bug concreto, no por cobertura: el bloque de realismo terminaba con
// «Vertical 4:5.» y la plantilla del lecho traía «bottom 18%». Los dos vivieron dentro de bloques que
// se reusan en TODOS los formatos, el doc decía otra cosa que el archivo, y nadie lo vio hasta medir
// 80 prompts. Cada `it` de acá es una de esas puertas cerrada con llave.
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

// @ts-expect-error -- .mjs sin tipos, a propósito: es una herramienta de corrida, no código de producto.
import { auditarEscena, auditarVestuario, construirPrompt, detectarValorDeFormato } from './build-prompt.mjs'

const raiz = path.resolve(__dirname, '../..')
const BLOQUES = path.join(raiz, 'scripts/foto/bloques')
const DOC = path.join(raiz, 'docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md')

const fichaBase = {
  id: 'test',
  formato: '4:5',
  escena: 'SCENE (test): una escena cualquiera. 50mm at f/4.',
  lecho: { objeto: 'the near edge of the table', tono: 'DARK near black' }
}

describe('foto:prompt · la tabla de formatos es la única fuente', () => {
  // El lecho NO mide igual en los tres formatos [medido en rondas/texto/bv2-{45,916,169}.json].
  it.each([
    ['4:5', '1152x1440', 'bottom 18%', 'VERTICAL 4:5 composition.'],
    ['9:16', '1152x2048', 'bottom 22%', 'VERTICAL 9:16 composition for Stories/Reels.'],
    ['16:9', '2048x1152', 'bottom 16%', 'HORIZONTAL 16:9 composition.'],
    ['1:1', '1152x1152', 'bottom 18%', 'SQUARE 1:1 composition.']
  ])('%s emite %s, lecho %s y declara su formato una sola vez', (formato, size, lecho, declara) => {
    const { prompt, size: emitido } = construirPrompt({ ...fichaBase, formato })

    expect(emitido).toBe(size)
    expect(prompt).toContain(lecho)
    expect(prompt).toContain(declara)

    // Una sola declaración de formato en todo el prompt: dos se contradicen entre sí.
    const declaraciones = prompt.match(/\b(?:VERTICAL|HORIZONTAL|SQUARE)\s+\d+:\d+/g) ?? []

    expect(declaraciones).toHaveLength(1)
  })

  it('el límite de sujetos es por eje, no el mismo en vertical y horizontal', () => {
    // En vertical protege la banda superior; en 16:9 el sujeto vive a la derecha.
    expect(construirPrompt({ ...fichaBase, formato: '4:5' }).prompt).toContain('BELOW 36% of the frame height')
    expect(construirPrompt({ ...fichaBase, formato: '16:9' }).prompt).toContain('inside the RIGHT 55% of the frame')
  })

  it('1:1 se marca como no validado para que nadie cite sus números como medidos', () => {
    expect(construirPrompt({ ...fichaBase, formato: '1:1' }).sinValidar).toBe(true)
    expect(construirPrompt({ ...fichaBase, formato: '4:5' }).sinValidar).toBe(false)
  })
})

describe('foto:prompt · las guardas', () => {
  // El MECANISMO, ejercitado sobre strings. Afirmar que el archivo de hoy está limpio verifica el
  // archivo, no la guarda: si alguien afloja la expresión, el archivo sigue limpio, el test sigue
  // verde y la puerta queda abierta. El verificador real es `detectarValorDeFormato`, que es lo que
  // `leerBloque` llama antes de devolver el bloque.
  it.each([
    ['Vertical 4:5.', 'Vertical 4:5'],
    ['HORIZONTAL 16:9 composition.', 'HORIZONTAL 16:9'],
    ['spanning the bottom 18% of the frame', 'bottom 18%']
  ])('detecta un valor de formato colado: %s', (texto, esperado) => {
    expect(detectarValorDeFormato(`un bloque cualquiera. ${texto}`)).toBe(esperado)
  })

  it('no dispara con los bloques legítimos que se usan hoy', () => {
    for (const f of ['bloque-realismo-v2.txt', 'bloque-impacto-v1.txt']) {
      expect(detectarValorDeFormato(readFileSync(path.join(BLOQUES, f), 'utf8'))).toBeNull()
    }
  })

  it('aborta si se pide una reserva en una toma que no la admite', () => {
    expect(() =>
      construirPrompt({ ...fichaBase, toma: 10, reservas: { margen: { superficie: 'the unlit plaster wall', tinta: 'blanca' } } })
    ).toThrow(/toma 10 no admite la reserva "margen"/)
  })

  it('deja pasar la misma reserva en una toma que sí la admite', () => {
    // Materia real, no «a wall»: la guarda de materia rechaza lo genérico y tiene razón.
    expect(() =>
      construirPrompt({
        ...fichaBase,
        toma: 12,
        reservas: { margen: { superficie: 'the unlit plaster wall of the corridor', tinta: 'blanca' } }
      })
    ).not.toThrow()
  })

  it('exige escena y lecho: sin ellos el modelo improvisa y la firma no tiene dónde ir', () => {
    expect(() => construirPrompt({ ...fichaBase, escena: undefined })).toThrow(/necesita `escena`/)
    expect(() => construirPrompt({ ...fichaBase, lecho: undefined })).toThrow(/necesita `lecho/)
  })

  it('rechaza un formato que no está en la tabla en vez de inventarle valores', () => {
    expect(() => construirPrompt({ ...fichaBase, formato: '21:9' })).toThrow(/Formato "21:9" desconocido/)
  })

  it('rechaza una reserva que no existe en vez de ignorarla en silencio', () => {
    expect(() => construirPrompt({ ...fichaBase, reservas: { inventada: {} } })).toThrow(/Reserva "inventada" desconocida/)
  })
})

describe('foto:prompt · el lecho siempre pide algo cerca del lente', () => {
  // PRECAUCIÓN, no regla medida. Llegué a escribir que el lecho falla sin esta frase, citando tres
  // plates; el prompt de la corrida que supuestamente NO la tenía nunca se versionó, y las dos franjas
  // salen estadísticamente iguales, así que la diferencia era de FORMATO y no de verbatim. Ver §3.8.3.
  // La frase se emite igual porque no cuesta nada y describe lo que un lecho ES, no porque esté
  // demostrada como causa. NUNCA la cites como evidencia.
  it.each(['4:5', '9:16', '16:9', '1:1'])('en %s', formato => {
    expect(construirPrompt({ ...fichaBase, formato }).prompt).toContain('so close to the lens that it dissolves')
  })
})

describe('doc ↔ archivo · la deriva que nadie vio', () => {
  // El doc presentaba el bloque como canónico mientras el .txt tenía una frase de más. Los prompts se
  // arman desde el .txt, así que el doc mentía y la medición decía la verdad. Esto los ata.
  const bloqueDelDoc = (encabezado: string, siguiente: string) => {
    const doc = readFileSync(DOC, 'utf8')
    const seccion = doc.slice(doc.indexOf(encabezado), doc.indexOf(siguiente))
    const fences = [...seccion.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map(m => m[1])

    return fences.join(' ').replace(/\s+/g, ' ').trim()
  }

  it.each([
    ['bloque-realismo-v2.txt', '### 3.1 Realismo v2', '#### 3.1.1'],
    ['bloque-impacto-v1.txt', '### 3.2 Impacto v1', '### 3.3']
  ])('%s: el archivo que se usa y el texto del doc son idénticos', (archivo, desde, hasta) => {
    const enDisco = readFileSync(path.join(BLOQUES, archivo), 'utf8').replace(/\s+/g, ' ').trim()

    expect(bloqueDelDoc(desde, hasta)).toBe(enDisco)
  })
})

describe('foto:prompt · la materia de la superficie no es opcional', () => {
  // El fallo que la sesión de capa gráfica encontró en su propio armador: rellenaba el tono y borraba
  // la materia. El modelo entonces inventa un panel liso — la «losa» que el operador rechazó por
  // «extremadamente forzado». Mi herramienta tenía el mismo riesgo por diseño.
  const conMargen = (superficie: string) => ({
    ...fichaBase,
    reservas: { margen: { superficie, tinta: 'blanca' } }
  })

  it('aborta si falta la materia', () => {
    expect(() => construirPrompt(conMargen(''))).toThrow(/necesita `superficie`/)
  })

  it.each(['a wall', 'the surface', 'background', 'a panel'])('aborta si la materia es genérica: %s', generica => {
    expect(() => construirPrompt(conMargen(generica))).toThrow(/es genérico/)
  })

  it('deja pasar una materia real de la escena', () => {
    const { prompt } = construirPrompt(conMargen('the bare pale polished concrete wall of the gallery'))

    expect(prompt).toContain('the bare pale polished concrete wall of the gallery')
  })
})

describe('foto:prompt · anclas prohibidas y auditoría de escena', () => {
  // La regla «nosotros NO somos Berel» estaba escrita en los docs desde el 19/09 y una sesión igual
  // generó un macro de un rodillo de pintura el 20/09. Un doc no impide nada; esto sí.
  it('aborta con el ancla real que se coló (rodillo de pintura)', () => {
    expect(() =>
      construirPrompt({
        ...fichaBase,
        escena:
          'SCENE (craft macro): extreme macro of a paint roller at the exact moment it lays fresh, glossy azure-blue paint over a clean white wall.'
      })
    ).toThrow(/ancla prohibida.*categoría de Berel/s)
  })

  it('no dispara con una escena legítima del oficio', () => {
    expect(() => construirPrompt(fichaBase)).not.toThrow()
  })

  // Avisos, no bloqueos: la medición es débil (la ronda aprobada da 100/100, mis pilotos aprobados
  // 66/33), así que bloquear por esto tiraría trabajo bueno.
  it('avisa cuando la escena no declara luz ni momento', () => {
    expect(auditarEscena('SCENE: a table with papers and two people sitting.')).toEqual([
      expect.stringContaining('FUENTE DE LUZ'),
      expect.stringContaining('MOMENTO')
    ])
  })

  it('admite un campo azul integrado en una escena con luz y momento', () => {
    expect(
      auditarEscena('SCENE: a grid of large azure-blue floor panels forming a geometric installation at midday sun, people mid-stride.')
    ).toEqual([])
  })

  it('no avisa sobre una escena que sí declara luz y momento', () => {
    expect(
      auditarEscena('SCENE: a single hard shaft of low sun crosses the room as she throws the proof onto the table mid-sentence.')
    ).toEqual([])
  })
})

// ── Identidad ────────────────────────────────────────────────────────────────────────────────────
// Antes de esto, una toma con Julio o Nexa se armaba a mano: exactamente lo que este comando existe
// para impedir. El modo de falla es silencioso y facturable — un prompt sin IDENTITY ni REFERENCES
// devuelve una cara inventada que en la hoja de contacto pasa por buena.
describe('foto:prompt · identidad', () => {
  it('sin identidad no emite IDENTITY ni REFERENCES, y no pide referencias', () => {
    const r = construirPrompt(fichaBase)

    expect(r.prompt).not.toContain('IDENTITY')
    expect(r.prompt).not.toContain('REFERENCES')
    expect(r.imagenes).toEqual([])
  })

  it('una persona sola lleva 3 referencias y el "ignore" en la misma frase', () => {
    const r = construirPrompt({ ...fichaBase, identidad: ['julio'] })

    expect(r.imagenes).toHaveLength(3)
    expect(r.prompt).toContain('REFERENCES: Images 1-3 are Julio (identity only; ignore their clothing and backgrounds).')
  })

  it('dos personas llevan 2 referencias cada una, numeradas por tramo', () => {
    const r = construirPrompt({ ...fichaBase, identidad: ['julio', 'nexa'] })

    expect(r.imagenes).toHaveLength(4)
    expect(r.prompt).toContain(
      'REFERENCES: Images 1-2 are Julio (identity only). Images 3-4 are Nexa (identity only). Ignore the clothing and backgrounds of all references.'
    )
  })

  // El orden del canon (§3.6/§3.7) no es decorativo: IDENTITY y REFERENCES condicionan la escena que
  // viene después, y FOREGROUND cierra siempre.
  it('respeta el orden canónico realismo → impacto → IDENTITY → REFERENCES → SCENE → FOREGROUND', () => {
    const p = construirPrompt({ ...fichaBase, identidad: ['julio'] }).prompt

    expect(p.indexOf('IDENTITY (critical)')).toBeGreaterThan(p.indexOf('THREE distinct depth planes'))
    expect(p.indexOf('REFERENCES:')).toBeGreaterThan(p.indexOf('IDENTITY (critical)'))
    expect(p.indexOf('SCENE (test)')).toBeGreaterThan(p.indexOf('REFERENCES:'))
    expect(p.indexOf('FOREGROUND (planned)')).toBeGreaterThan(p.indexOf('SCENE (test)'))
  })

  // El bloque tiene que ser el del canon, letra por letra: si el doc cambia y el comando no, la
  // identidad deriva sin que nadie lo note.
  it('el bloque IDENTITY es verbatim el del canon', () => {
    const doc = readFileSync(DOC, 'utf8')

    for (const persona of ['julio', 'nexa']) {
      const emitido = construirPrompt({ ...fichaBase, identidad: [persona] })
        .prompt.split('\n\n')
        .find((b: string) => b.startsWith('IDENTITY (critical)'))

      expect(doc).toContain(emitido)
    }
  })

  it('aborta con una persona desconocida en vez de generar un desconocido', () => {
    expect(() => construirPrompt({ ...fichaBase, identidad: ['juan'] })).toThrow(/desconocida/)
  })

  it('aborta sobre dos personas: el tope está medido, no supuesto', () => {
    expect(() => construirPrompt({ ...fichaBase, identidad: ['julio', 'nexa', 'julio'] })).toThrow(/no está medido/)
  })

  it('exige que `identidad` sea una lista', () => {
    expect(() => construirPrompt({ ...fichaBase, identidad: 'julio' })).toThrow(/debe ser una lista/)
  })
})

describe('foto:prompt · avisos que faltaban', () => {
  // Falso negativo real: la escena declaraba "hard midday daylight pours in through the storefront
  // glass" y el aviso saltaba igual.
  it('reconoce la luz de día y de mediodía como fuente declarada', () => {
    expect(auditarEscena('SCENE: hard midday daylight pours through the glass as she seats the divider at the moment it clicks.')).toEqual([])
  })

  // El aviso que habría evitado dos piezas en navy.
  it('avisa cuando hay identidad y la escena no declara vestuario', () => {
    expect(auditarVestuario('SCENE: she crouches at the end of the aisle in hard daylight.', ['nexa'])).toMatch(/VESTUARIO/)
  })

  it('no avisa si la escena declara la prenda', () => {
    expect(auditarVestuario('SCENE: she crouches in a faded grey cotton work t-shirt.', ['nexa'])).toBeNull()
  })

  it('no avisa de vestuario cuando no hay identidad', () => {
    expect(auditarVestuario('SCENE: an empty studio at dawn.', [])).toBeNull()
  })
})
