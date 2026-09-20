// Estos tests existen por un bug concreto, no por cobertura: el bloque de realismo terminaba con
// «Vertical 4:5.» y la plantilla del lecho traía «bottom 18%». Los dos vivieron dentro de bloques que
// se reusan en TODOS los formatos, el doc decía otra cosa que el archivo, y nadie lo vio hasta medir
// 80 prompts. Cada `it` de acá es una de esas puertas cerrada con llave.
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

// @ts-expect-error -- .mjs sin tipos, a propósito: es una herramienta de corrida, no código de producto.
import { construirPrompt } from './build-prompt.mjs'

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
    ['1:1', '1152x1152', 'bottom 20%', 'SQUARE 1:1 composition.']
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
  it('aborta si un bloque compartido trae un valor de un formato adentro', () => {
    // Simula la regresión exacta: alguien vuelve a pegar «Vertical 4:5.» en el bloque reusado.
    const archivo = path.join(BLOQUES, 'bloque-realismo-v2.txt')
    const original = readFileSync(archivo, 'utf8')

    expect(original).not.toMatch(/\b(?:Vertical|Horizontal|Square)\s+\d+:\d+/i)
    expect(original).not.toMatch(/bottom\s+\d+%/i)
  })

  it('aborta si se pide una reserva en una toma que no la admite', () => {
    expect(() =>
      construirPrompt({ ...fichaBase, toma: 10, reservas: { margen: { superficie: 'a wall', tinta: 'blanca' } } })
    ).toThrow(/toma 10 no admite la reserva "margen"/)
  })

  it('deja pasar la misma reserva en una toma que sí la admite', () => {
    expect(() =>
      construirPrompt({ ...fichaBase, toma: 12, reservas: { margen: { superficie: 'a wall', tinta: 'blanca' } } })
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
  // Regla medida entre las dos sesiones el 2026-09-20 con tres plates: el lecho falla cuando el
  // verbatim NO pone nada cerca del lente, en cualquier formato y cualquier ángulo. Picado 60° con el
  // verbatim explícito da nitidez 0,0002 en 4:5 y 0,0035 en 16:9; sin él, 0,0043. El ángulo nunca fue
  // la causa. Por eso la frase no es opcional: la emite el comando, no la escribe quien pide la foto.
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
