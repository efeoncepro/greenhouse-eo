// Estos tests existen por un bug concreto, no por cobertura: el bloque de realismo terminaba con
// «Vertical 4:5.» y la plantilla del lecho traía «bottom 18%». Los dos vivieron dentro de bloques que
// se reusan en TODOS los formatos, el doc decía otra cosa que el archivo, y nadie lo vio hasta medir
// 80 prompts. Cada `it` de acá es una de esas puertas cerrada con llave.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

// El .mjs no lleva tipos a propósito: es una herramienta de corrida, no código de producto. Ya no
// hace falta `@ts-expect-error` — al exportar OBJETOS y PALANCAS, TS resuelve el módulo y la
// directiva quedaría sin uso (TS2578 rompe el pre-push).
import {
  auditarAcentoDeTanda,
  auditarColor,
  auditarEscena,
  auditarReservas,
  auditarVestuario,
  construirPrompt,
  detectarValorDeFormato,
  OBJETOS,
  PALANCAS,
  PERSONAS
} from './build-prompt.mjs'

const raiz = path.resolve(__dirname, '../..')
const BLOQUES = path.join(raiz, 'scripts/foto/bloques')
const DOC = path.join(raiz, 'docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md')

// Los renders de referencia y los kits viven FUERA de git (`.gitignore`: `/ai-generations/**/*.png`):
// son pesados y algunos son material de marca. En CI no existen, y las guardas de `existsSync` del
// comando —que en producción son correctas— abortan. Los tests que necesitan esos archivos se saltan
// donde no están, declarándolo; la lógica que no depende del disco se sigue verificando siempre.
// `FOTO_TEST_SIN_ASSETS=1` reproduce el entorno de CI en local. Existe porque verificar «pasa en mi
// máquina» fue exactamente el error que dejó CI en rojo: los assets están acá y allá no.
const HAY_ASSETS =
  !process.env.FOTO_TEST_SIN_ASSETS &&
  existsSync(path.join(raiz, 'ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png'))

const conAssets = HAY_ASSETS ? describe : describe.skip

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
    for (const f of ['bloque-realismo-v3.txt', 'bloque-impacto-v1.txt']) {
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
    ['bloque-realismo-v3.txt', '### 3.1 Realismo v3', '#### 3.1.1'],
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
conAssets('foto:prompt · identidad', () => {
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

// Las referencias frontales no cubren perfil ni espalda. Pedir una toma de perfil con sólo retratos
// frontales obliga al modelo a inventar el giro, y lo que inventa ensancha la cara [medido 2026-09-20].
conAssets('foto:prompt · vistas de identidad', () => {
  it('antepone la vista pedida a las referencias frontales', () => {
    const r = construirPrompt({ ...fichaBase, identidad: [{ persona: 'julio', vista: 'perfil-izq' }] })

    expect(r.imagenes).toHaveLength(3)
    expect(r.imagenes[0]).toContain('julio-perfil-izq.png')
  })

  it('sin vista usa las referencias frontales tal cual', () => {
    expect(construirPrompt({ ...fichaBase, identidad: ['julio'] }).imagenes[0]).toContain('julio-ap-04.png')
  })

  it('aborta con una vista inexistente y dice cuáles hay', () => {
    expect(() => construirPrompt({ ...fichaBase, identidad: [{ persona: 'julio', vista: 'cenital' }] })).toThrow(/Vistas disponibles/)
  })

  it('el bloque IDENTITY declara la proporción del rostro, no adjetivos', () => {
    const p = construirPrompt({ ...fichaBase, identidad: ['julio'] }).prompt

    expect(p).toContain('1.5 times TALLER than it is WIDE')
    expect(p).toContain('GREY IS CONCENTRATED THERE')
  })
})

// Segundo falso negativo del detector de luz, misma clase que `daylight`: una escena de escenario
// declara la luz con «stage spot» y «rakes», y el aviso saltaba igual [2026-09-20].
describe('foto:prompt · el detector de luz cubre el vocabulario real', () => {
  it.each([
    'SCENE: a single hard stage spot rakes onto the man at the moment he names it.',
    'SCENE: hard midday daylight pours through the glass as she seats the divider.',
    'SCENE: only the neon sign lights the room as he turns mid-sentence.'
  ])('reconoce la fuente en %s', escena => {
    // Comprueba SOLO el aviso de luz: estas frases no siempre declaran momento, y mezclar ambos
    // chequeos hacía fallar el test por una razón distinta de la que decía verificar.
    expect(auditarEscena(escena)).not.toContainEqual(expect.stringContaining('FUENTE DE LUZ'))
  })
})

// ── Objetos de marca ─────────────────────────────────────────────────────────────────────────────
// Un logo descrito con palabras se dibuja de memoria y sale deformado. El kit aprobado entra como
// referencia de forma, y su numeración tiene que calzar con el orden real de los --image.
conAssets('foto:prompt · objetos de marca', () => {
  it('sin objetos no emite bloque ni pide referencias extra', () => {
    const r = construirPrompt(fichaBase)

    expect(r.prompt).not.toContain('object reference')
    expect(r.imagenes).toEqual([])
  })

  it('numera el objeto DESPUÉS de las referencias de identidad', () => {
    const r = construirPrompt({ ...fichaBase, identidad: ['julio'], objetos: ['sprocket-hubspot'] })

    expect(r.imagenes).toHaveLength(4)
    expect(r.prompt).toContain('IMAGE 4 (object reference)')
  })

  it('sin identidad el objeto es la imagen 1', () => {
    const r = construirPrompt({ ...fichaBase, objetos: ['nave-efeonce'] })

    expect(r.imagenes).toHaveLength(1)
    expect(r.prompt).toContain('IMAGE 1 (object reference)')
  })

  it('acepta varios objetos y los numera en orden', () => {
    const r = construirPrompt({ ...fichaBase, objetos: ['clawd', 'codex'] })

    expect(r.prompt).toContain('IMAGE 1 (object reference)')
    expect(r.prompt).toContain('IMAGE 2 (object reference)')
    expect(r.imagenes[0]).toContain('clawd')
    expect(r.imagenes[1]).toContain('codex')
  })

  it('elige la vista pedida del kit', () => {
    const r = construirPrompt({ ...fichaBase, objetos: [{ objeto: 'sprocket-hubspot', vista: 'cenital' }] })

    expect(r.imagenes[0]).toContain('05-cenital-plano')
  })

  it('aborta con una vista que el kit no tiene y lista las que hay', () => {
    expect(() => construirPrompt({ ...fichaBase, objetos: [{ objeto: 'sprocket-hubspot', vista: 'submarina' }] })).toThrow(
      /Vistas del kit/
    )
  })

  it('aborta con un kit desconocido', () => {
    expect(() => construirPrompt({ ...fichaBase, objetos: ['logo-de-otra-marca'] })).toThrow(/Kits disponibles/)
  })

  // El derecho de uso viaja con el kit: quien lo tome recibe el aviso sin tener que recordarlo.
  it('propaga el aviso de derechos de una marca de tercero', () => {
    const r = construirPrompt({ ...fichaBase, objetos: ['sprocket-hubspot'] })

    expect(r.avisosObjeto[0]).toMatch(/uso INTERNO hasta aprobación escrita/)
  })

  it('un kit propio no arrastra aviso de derechos', () => {
    expect(construirPrompt({ ...fichaBase, objetos: ['nave-efeonce'] }).avisosObjeto).toEqual([])
  })
})

// Guarda de integridad del catálogo: si alguien agrega un kit con una ruta mal escrita, o alguien
// mueve/renombra una corrida, el fallo aparece acá y no a mitad de una tanda ya pagada.
conAssets('foto:prompt · el catálogo de kits apunta a archivos reales', () => {
  const pares = Object.entries(OBJETOS as Record<string, { base: string; patron: string; vistas: Record<string, string>; vistaDefecto: string }>)

  it.each(pares.flatMap(([clave, o]) => Object.keys(o.vistas).map(v => [clave, v] as const)))(
    '%s · vista %s existe en disco',
    (clave, vista) => {
      const o = (OBJETOS as Record<string, { base: string; patron: string; vistas: Record<string, string> }>)[clave]

      expect(existsSync(path.join(raiz, o.base + o.patron.replace('<V>', o.vistas[vista])))).toBe(true)
    }
  )

  it.each(pares)('%s declara una vista por defecto que existe', (_clave, o) => {
    expect(Object.keys(o.vistas)).toContain(o.vistaDefecto)
  })
})

// El detector de momento tenía el mismo problema de vocabulario que el de luz: reconocía unas pocas
// formas y llamaba «pose de stock» a escenas que sí declaran el instante.
describe('foto:prompt · el detector de momento cubre el vocabulario real', () => {
  it.each([
    'SCENE: hard sun. She draws, caught at the instant the marker lifts off the glass.',
    'SCENE: hard sun. The beans are frozen in mid-air at the top of their arc.',
    'SCENE: hard sun. A grip tosses a coil of tape upward to a colleague.'
  ])('reconoce el momento en %s', escena => {
    expect(auditarEscena(escena)).not.toContainEqual(expect.stringContaining('MOMENTO'))
  })

  it('sigue avisando cuando de verdad no hay momento', () => {
    expect(auditarEscena('SCENE: hard sun on a table with papers and two people sitting.')).toContainEqual(
      expect.stringContaining('MOMENTO')
    )
  })
})

// ── Atmósfera y acción suspendida ────────────────────────────────────────────────────────────────
// Las dos palancas que el bloque de impacto no tenía. Van por ficha, no en el bloque fijo: si el
// bloque las emitiera siempre, en cada pieza volaría algo y el momento se volvería un truco.
describe('foto:prompt · atmósfera', () => {
  const conLuz = { ...fichaBase, escena: 'SCENE (test): a hard shaft of sun cuts the room as she turns mid-step.' }

  it('no emite nada si la ficha no la pide', () => {
    expect(construirPrompt(conLuz).prompt).not.toContain('ATMOSPHERE:')
  })

  it.each(['polvo', 'bruma', 'vapor', 'humo'])('emite el bloque de %s', tipo => {
    expect(construirPrompt({ ...conLuz, atmosfera: tipo }).prompt).toContain('ATMOSPHERE:')
  })

  it('el polvo vive sólo dentro de la luz, nunca como suciedad', () => {
    expect(construirPrompt({ ...conLuz, atmosfera: 'polvo' }).prompt).toContain('never as dirt on surfaces')
  })

  // Sin haz que revelar, el modelo pinta la atmósfera encima y se ve puesta.
  it('aborta si la escena no declara fuente de luz', () => {
    expect(() =>
      construirPrompt({ ...fichaBase, escena: 'SCENE (test): two people at a table as she turns.', atmosfera: 'bruma' })
    ).toThrow(/no declara una FUENTE DE LUZ/)
  })

  it('aborta con un tipo desconocido y lista los válidos', () => {
    expect(() => construirPrompt({ ...conLuz, atmosfera: 'niebla-espesa' })).toThrow(/Tipos:/)
  })
})

describe('foto:prompt · acción suspendida', () => {
  it('no emite nada si la ficha no la pide', () => {
    expect(construirPrompt(fichaBase).prompt).not.toContain('SUSPENDED ACTION')
    expect(construirPrompt(fichaBase).llevaSuspendido).toBe(false)
  })

  it('emite qué está en el aire y prohíbe el confeti decorativo', () => {
    const p = construirPrompt({ ...fichaBase, suspendido: 'the coffee beans tipped from the scoop' }).prompt

    expect(p).toContain('the coffee beans tipped from the scoop is FROZEN IN MID-AIR')
    expect(p).toContain('never confetti')
  })

  // Un valor vago deja que el modelo elija qué vuela, y elige adorno.
  it.each(['algo', '   ', 'x'])('aborta con el valor genérico "%s"', v => {
    expect(() => construirPrompt({ ...fichaBase, suspendido: v })).toThrow(/debe decir QUÉ está en el aire/)
  })

  it('marca la pieza para que la tanda pueda medir la dosis', () => {
    expect(construirPrompt({ ...fichaBase, suspendido: 'the loose sheets of paper' }).llevaSuspendido).toBe(true)
  })
})

// La luz motivada —una pantalla o un monitor visible en cuadro que ilumina al sujeto— es la fuente
// que más realismo da, y el detector no la reconocía [cuarto falso negativo, 2026-09-20].
describe('foto:prompt · luz motivada por una fuente en cuadro', () => {
  it.each([
    'SCENE: the ONLY light is the calibration monitor in frame, and that screen is what lights her as she turns.',
    'SCENE: the wide display glowing cool blue lights him as he leans in at the instant it swings into view.'
  ])('la reconoce como fuente declarada', escena => {
    expect(auditarEscena(escena)).not.toContainEqual(expect.stringContaining('FUENTE DE LUZ'))
  })
})

// ── Palancas de encuadre ─────────────────────────────────────────────────────────────────────────
// Probadas el 2026-09-20. Se piden UNA por pieza: combinar dos las diluye, porque cada una pide el
// control de la escena.
describe('foto:prompt · palancas de encuadre', () => {
  it('sin palanca no emite ninguna', () => {
    const p = construirPrompt(fichaBase).prompt

    for (const clave of Object.keys(PALANCAS as Record<string, unknown>)) expect(p).not.toContain(clave.toUpperCase())
  })

  it.each(['pov', 'manos', 'luz-motivada', 'larga-exposicion'])('emite el bloque de %s', palanca => {
    expect(construirPrompt({ ...fichaBase, palanca }).prompt.length).toBeGreaterThan(construirPrompt(fichaBase).prompt.length)
  })

  it('el POV pone la cámara en el lugar de la persona con la que se trabaja', () => {
    expect(construirPrompt({ ...fichaBase, palanca: 'pov' }).prompt).toContain('FROM THE PLACE OF THE PERSON BEING TALKED TO')
  })

  it('las manos prohíben rostros incluso fuera de foco', () => {
    expect(construirPrompt({ ...fichaBase, palanca: 'manos' }).prompt).toContain('not even out of focus in the background')
  })

  it('la luz motivada exige que la fuente se vea, no un filtro', () => {
    const p = construirPrompt({ ...fichaBase, palanca: 'luz-motivada' }).prompt

    expect(p).toContain('SOURCE THAT IS VISIBLE IN THE FRAME')
    expect(p).toContain('never from a colour filter or a grade')
  })

  // El hallazgo de B6: no se suman, compiten.
  it('rechaza una lista de palancas y explica por qué', () => {
    expect(() => construirPrompt({ ...fichaBase, palanca: ['pov', 'luz-motivada'] })).toThrow(/UNA palanca dominante/)
  })

  // Ojo con el ejemplo: `dron-cenital` servía acá hasta que el comando aprendió a reconocer las TOMAS
  // de cámara y a explicar la diferencia (ver el describe `palanca vs toma de cámara`). Un nombre que no
  // sea ni palanca ni toma es lo que prueba esta rama.
  it('aborta con una palanca desconocida y lista las válidas', () => {
    expect(() => construirPrompt({ ...fichaBase, palanca: 'no-existe-en-ningun-catalogo' })).toThrow(/Disponibles:/)
  })

  // El hallazgo de B5: pedida a medias, la oclusión se anula.
  it('la oclusión exige declarar QUÉ tapa', () => {
    expect(() => construirPrompt({ ...fichaBase, palanca: 'oclusion' })).toThrow(/exige el campo/)
  })

  it('la oclusión inserta el objeto declarado y pide que tape de verdad', () => {
    const p = construirPrompt({ ...fichaBase, palanca: 'oclusion', ocluye: 'the dark back of a monitor' }).prompt

    expect(p).toContain('the dark back of a monitor sits in the near ground')
    expect(p).toContain('not merely sit beside them')
  })

  // Una larga exposición no tiene instante: su tensión es duración acumulada.
  it('la larga exposición marca que el aviso de momento no aplica', () => {
    expect(construirPrompt({ ...fichaBase, palanca: 'larga-exposicion' }).sinMomento).toBe(true)
    expect(construirPrompt({ ...fichaBase, palanca: 'pov' }).sinMomento).toBe(false)
  })
})

// ── Integridad del catálogo sin los binarios ─────────────────────────────────────────────────────
// Esta es la verificación que se perdió al saltar los tests que tocan disco: los assets pesan 640 MB
// y viven fuera de git, así que CI no los tiene. El lock de huellas SÍ está versionado, y con él se
// comprueba que cada vista declarada por el catálogo exista de verdad — sin descargar un byte.
describe('foto:prompt · el catálogo coincide con el lock de assets', () => {
  const lock = JSON.parse(readFileSync(path.join(raiz, 'scripts/foto/assets.lock.json'), 'utf8')) as {
    assets: Record<string, { rol: string; sha256: string }>
  }

  it('el lock no está vacío', () => {
    expect(Object.keys(lock.assets).length).toBeGreaterThan(40)
  })

  it.each(
    Object.entries(OBJETOS as Record<string, { base: string; patron: string; vistas: Record<string, string> }>).flatMap(
      ([clave, o]) => Object.entries(o.vistas).map(([vista, sufijo]) => [clave, vista, o.base + o.patron.replace('<V>', sufijo)] as const)
    )
  )('kit %s · vista %s está en el lock', (_clave, _vista, ruta) => {
    expect(lock.assets[ruta]).toBeDefined()
  })

  it.each(
    Object.entries(PERSONAS as Record<string, { refs: string[]; vistas?: Record<string, string> }>).flatMap(([clave, p]) => [
      ...p.refs.map(r => [clave, r] as const),
      ...Object.values(p.vistas ?? {}).map(r => [clave, r] as const)
    ])
  )('referencia de %s está en el lock', (_clave, ruta) => {
    expect(lock.assets[ruta]).toBeDefined()
  })

  it('cada huella es un sha256 con forma válida', () => {
    for (const entrada of Object.values(lock.assets)) expect(entrada.sha256).toMatch(/^[0-9a-f]{64}$/)
  })
})

// ── Las quince palancas ──────────────────────────────────────────────────────────────────────────
// Probadas en tres rondas el 2026-09-20. Las que fallaron NO están en el catálogo y su razón vive en
// el catálogo maestro: baño de color (el modelo se niega a teñir la piel), split diopter (devuelve
// profundidad de campo normal), clave baja (duplica luz con carácter + lecho oscuro).
describe('foto:prompt · el catálogo de palancas', () => {
  const claves = Object.keys(PALANCAS as Record<string, unknown>)

  it('tiene las veintitrés aprobadas y ninguna descartada ni pendiente', () => {
    expect(claves).toHaveLength(23)

    // `doble-exposicion` no está descartada: quedó pendiente de un intento (el modelo produjo la
    // superposición, pero con un borde duro que su propio contrato prohíbe). Hasta que pase su
    // comprobación no entra al catálogo: aprobar una que falla su marcador vacía el criterio de todas.
    for (const fuera of ['bano-de-color', 'split-diopter', 'clave-baja', 'flash-duro', 'trama', 'doble-exposicion']) {
      expect(claves).not.toContain(fuera)
    }
  })

  // Se mide el BLOQUE DE LA PALANCA, no el prompt entero: medir el prompt dejaba pasar una palanca sin
  // marcadores propios, porque el bloque de realismo compartido ya trae un «not a…» y aprobaba por él.
  it.each(claves)('%s emite un bloque con marcadores verificables', clave => {
    const p = PALANCAS as Record<string, { bloque: string; requiere: string | null }>

    // «verify it», «NOT a…», «no faces»: la marca de que el bloque describe qué se ve, no una intención.
    expect(p[clave].bloque).toMatch(/verify it|NOT a|NO facial|not a digital effect|nobody|no faces|does NOT|NEITHER/i)
  })

  it.each(claves.filter(c => (PALANCAS as Record<string, { requiere: string | null }>)[c].requiere))(
    '%s aborta si falta su campo obligatorio',
    clave => {
      expect(() => construirPrompt({ ...fichaBase, palanca: clave })).toThrow(/exige el campo/)
    }
  )

  // La ausencia y la larga exposición no tienen instante por naturaleza.
  it('las palancas sin momento están marcadas', () => {
    expect(construirPrompt({ ...fichaBase, palanca: 'ausencia' }).sinMomento).toBe(true)
    expect(construirPrompt({ ...fichaBase, palanca: 'larga-exposicion' }).sinMomento).toBe(true)
    expect(construirPrompt({ ...fichaBase, palanca: 'silueta' }).sinMomento).toBe(false)
  })

  it('el instrumento inserta la herramienta declarada', () => {
    const p = construirPrompt({ ...fichaBase, palanca: 'instrumento', instrumento: 'a chrome loupe resting on a printed proof' }).prompt

    expect(p).toContain('LOOKING THROUGH a chrome loupe resting on a printed proof')
  })

  it('el fragmento inserta por dónde corta el borde', () => {
    const p = construirPrompt({
      ...fichaBase,
      palanca: 'fragmento',
      corta: 'the right edge cuts through her face just past the bridge of her nose'
    }).prompt

    expect(p).toContain('the right edge cuts through her face just past the bridge of her nose')
  })
})


describe('palanca vs toma de cámara', () => {
  const base = {
    id: 'x',
    formato: '4:5',
    escena: 'SCENE: a hard sunlight beam rakes across a real walnut worktop',
    lecho: { objeto: 'the near edge of a real walnut worktop', tono: 'DARK walnut in shadow, matte' }
  }

  // El operador pidió «ojo de pez» como palanca el 2026-09-20: listarle quince nombres no le aclaraba
  // que estaba pidiendo otra cosa. El error tiene que enseñar la distinción, no sólo rechazar.
  it('una TOMA pedida como palanca explica la diferencia y apunta a su catálogo', () => {
    expect(() => construirPrompt({ ...base, palanca: 'ojo-de-pez' })).toThrow(/es una TOMA del catálogo de cámara/)
    expect(() => construirPrompt({ ...base, palanca: 'tilt-shift' })).toThrow(/se escribe en la escena/)
    expect(() => construirPrompt({ ...base, palanca: 'dron-cenital' })).toThrow(/CAMERA_LENS_ANGLE_CATALOG/)
  })

  it('una palanca inventada lista las de encuadre y nombra las otras familias', () => {
    expect(() => construirPrompt({ ...base, palanca: 'inventada' })).toThrow(/Palanca de encuadre "inventada" desconocida/)
    expect(() => construirPrompt({ ...base, palanca: 'inventada' })).toThrow(/`atmosfera`/)
  })
})

describe('palancas de la ronda podcast', () => {
  const base = {
    id: 'g',
    formato: '4:5',
    escena: 'SCENE: a hard directional beam rakes across a real walnut worktop',
    lecho: { objeto: 'the near edge of a real walnut worktop', tono: 'DARK walnut in shadow, matte' }
  }

  // `escucha` se define por lo que NO pasa: si el bloque no dice «boca cerrada» ni «nunca al lente»,
  // el modelo devuelve un retrato hablando, que es justo lo que el operador no quiere.
  it('escucha pide boca cerrada y mirada fuera del cuadro', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'escucha' })

    expect(p).toMatch(/MOUTH IS CLOSED/)
    expect(p).toMatch(/never into the lens/)
    expect(p).toMatch(/UNUSED/)
  })

  it('atraviesa cruza en diagonal SIN cubrir al sujeto (si cubre, es oclusion)', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'atraviesa' })

    expect(p).toMatch(/does NOT cover their face or body/)
  })

  it('entre-dos deja el centro vacío y prohíbe la mirada al lente', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'entre-dos' })

    expect(p).toMatch(/CENTRE of the picture is the empty air/)
    expect(p).toMatch(/NEITHER of them looks at the camera/)
  })

  // La inversión de foco ES la palanca: sin ella queda un retrato de operador cualquiera.
  it('quien-sostiene invierte el foco y lo declara como el punto', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'quien-sostiene' })

    expect(p).toMatch(/OUT OF FOCUS/)
    expect(p).toMatch(/operator FIRST and on the talent LAST/)
  })
})


describe('palancas del oficio digital', () => {
  const base = {
    id: 'h',
    formato: '4:5',
    escena: 'SCENE: a hard directional beam rakes across a real walnut worktop',
    lecho: { objeto: 'the near edge of a real walnut worktop', tono: 'DARK walnut in shadow, matte' }
  }

  // Sin «diferencias mínimas» el modelo devuelve nueve piezas distintas, que es un muro de trabajo,
  // no una decisión: la repetición casi idéntica ES el tema.
  it('variantes exige repetición casi idéntica y una apartada', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'variantes' })

    expect(p).toMatch(/MINIMAL differences/)
    expect(p).toMatch(/SET APART/)
  })

  it('descarte deja fuera lo elegido y a todo el mundo', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'descarte' })

    expect(p).toMatch(/NOT in the picture/)
    expect(p).toMatch(/NOBODY is present/)
  })

  // La trampa de `marcado` es volverse un plano de manos: la regla de la mano es lo que la separa
  // de `manos` y de `instrumento`.
  it('marcado hace de la marca el sujeto y saca la mano del cuadro', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'marcado' })

    expect(p).toMatch(/NEVER the subject/)
    expect(p).toMatch(/eye lands on them FIRST/)
  })

  it('proyeccion pide materia atravesando la obra y prohíbe la pantalla', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'proyeccion' })

    expect(p).toMatch(/SHOW THROUGH the projected image/)
    expect(p).toMatch(/NO screen and NO monitor/)
  })
})

describe('reserva de texto — el mecanismo que estaba apagado', () => {
  const base = {
    id: 'r',
    formato: '4:5',
    escena: 'SCENE: a hard beam rakes across a real walnut worktop at the instant she lifts it',
    lecho: { objeto: 'the near edge of a real walnut worktop', tono: 'DARK walnut in shadow, matte' }
  }

  // Medido el 2026-09-20: las doce piezas de la auditoría ciega reprobaron la banda de texto (la mejor
  // 0,10 del alto contra un mínimo de 0,28) porque NINGUNA declaró `reservas` y el campo es opt-in.
  it('avisa cuando la ficha no reserva espacio para la capa gráfica', () => {
    const avisos = auditarReservas(base)

    expect(avisos.join(' ')).toMatch(/sin `reservas`/)
    expect(avisos.join(" ")).toMatch(/o está en la toma, o no cabe/)
  })

  // `reservas` es un OBJETO con claves, no un array. El test anterior le pasaba un array y por eso
  // aprobaba una guarda que nunca habría reconocido una ficha real. La forma correcta es la que el
  // resolvedor consume (`r.texto` → `fmt.zonaTexto`), y esa es la que se ejercita acá.
  it('no avisa cuando la ficha sí la declara, con la forma que el comando consume', () => {
    const reservas = { texto: { muro: 'a wall of board-formed concrete', tinta: 'blanca' } }

    expect(auditarReservas({ ...base, reservas })).toHaveLength(0)
    expect(construirPrompt({ ...base, reservas }).prompt).toMatch(/TEXT SPACE \(planned, essential\)/)
  })

  // El aviso no vale por existir en la función: vale si llega a quien corre el comando. Quien lo
  // enciende de verdad es `pnpm foto:prompt`, y ahí se ejercita — el verificador real de que el
  // mecanismo está cableado es la corrida del CLI, no esta aserción.
  it('el CLI lo emite: `auditarReservas` está cableado en el bucle de avisos', () => {
    const fuente = readFileSync(path.join(raiz, 'scripts/foto/build-prompt.mjs'), 'utf8')

    expect(fuente).toMatch(/avisos\.push\(\.\.\.auditarReservas\(ficha\)\)/)
  })
})

describe('acento cálido — la dosis vive en la tanda, no en la pieza', () => {
  const conAcento = 'SCENE: an ORANGE strip of marking tape runs along the floor'
  const sinAcento = 'SCENE: a blue screen lights the room'

  // Pedir acento pieza por pieza contradecía la dosis: el mismo aviso empujaba al tic que la dosis
  // existe para evitar. Por eso `auditarColor` ya no lo reclama y la decisión se toma sobre la tanda.
  it('auditarColor no reclama el acento por pieza', () => {
    expect(auditarColor(sinAcento).join(' ')).not.toMatch(/ACENTO/)
  })

  it('falla en las dos direcciones: ninguna lo lleva, o casi todas', () => {
    expect(auditarAcentoDeTanda([sinAcento, sinAcento, sinAcento]).join(' ')).toMatch(/ninguna de las 3/)
    expect(auditarAcentoDeTanda([conAcento, conAcento, conAcento]).join(' ')).toMatch(/dosis: 1 de cada 2/)
  })

  it('una tanda con la dosis correcta pasa sin avisos', () => {
    expect(auditarAcentoDeTanda([conAcento, sinAcento, sinAcento, conAcento])).toHaveLength(0)
  })

  // Una pieza suelta no es una tanda: no hay dosis que medir sobre una sola.
  it('no opina sobre una pieza suelta', () => {
    expect(auditarAcentoDeTanda([sinAcento])).toHaveLength(0)
  })
})
