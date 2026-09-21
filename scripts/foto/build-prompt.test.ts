// Estos tests existen por un bug concreto, no por cobertura: el bloque de realismo terminaba con
// «Vertical 4:5.» y la plantilla del lecho traía «bottom 18%». Los dos vivieron dentro de bloques que
// se reusan en TODOS los formatos, el doc decía otra cosa que el archivo, y nadie lo vio hasta medir
// 80 prompts. Cada `it` de acá es una de esas puertas cerrada con llave.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

// El .mjs no lleva tipos a propósito: es una herramienta de corrida, no código de producto. Ya no
// hace falta `@ts-expect-error` — al exportar OBJETOS y PALANCAS, TS resuelve el módulo y la
// directiva quedaría sin uso (TS2578 rompe el pre-push).
import {
  auditarAcentoDeTanda,
  auditarColor,
  auditarContradicciones,
  auditarEmblema,
  auditarEscena,
  auditarLechoDeTanda,
  auditarRegistroVestuario,
  auditarReservas,
  auditarVestuario,
  construirPrompt,
  detectarValorDeFormato,
  familiaDeLecho,
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

  // Agujero real medido el 2026-09-21: con dos personas el cupo baja a 2 y se tomaban las dos primeras
  // referencias de la lista. Las dos primeras de Julio son AMBAS de rostro, así que se quedaba sin
  // cuerpo entero y el modelo le inventaba la silueta. Pasaba en silencio: la pieza salía, sólo que
  // con un cuerpo que no era el suyo.
  // La ruta la declara el catálogo, no este test: escribirla a mano lo rompía cada vez que el set de
  // identidad se movía, y un test que hay que editar tras cada mudanza deja de vigilar nada.
  const CUERPOS = Object.fromEntries(
    Object.entries(PERSONAS as Record<string, { cuerpo?: string }>).map(([clave, p]) => [clave, p.cuerpo])
  ) as Record<string, string>

  it('cada persona con identidad declara cuál de sus referencias es la de cuerpo entero', () => {
    for (const [clave, ruta] of Object.entries(CUERPOS)) {
      expect(ruta, `${clave} no declara \`cuerpo\``).toBeDefined()
      expect((PERSONAS as Record<string, { refs: string[] }>)[clave].refs).toContain(ruta)
    }
  })

  it('una persona sola lleva su cuerpo entero', () => {
    const r = construirPrompt({ ...fichaBase, identidad: ['julio'] })

    expect(r.imagenes).toContain(CUERPOS.julio)
  })

  it('con dos personas CADA UNA conserva su cuerpo entero', () => {
    const r = construirPrompt({ ...fichaBase, identidad: ['julio', 'nexa'] })

    expect(r.imagenes).toContain(CUERPOS.julio)
    expect(r.imagenes).toContain(CUERPOS.nexa)
  })

  it('una vista pedida no desplaza al cuerpo entero: la vista va primera y el cuerpo entra igual', () => {
    const r = construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', vista: 'perfil-izq' }, 'julio'] })

    expect(r.imagenes[0]).toContain('nexa-perfil-izq.png')
    expect(r.imagenes).toContain(CUERPOS.nexa)
    expect(r.imagenes).toContain(CUERPOS.julio)
  })

  // La otra cara de la misma regla: si la vista YA es de cuerpo entero, añadir el cuerpo frontal
  // dejaría la toma con dos cuerpos y ningún rostro cercano, que es justo lo que hace derivar la cara.
  it('una vista que ya es de cuerpo entero conserva el rostro en vez de duplicar cuerpo', () => {
    const r = construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', vista: 'cuerpo-perfil-izq' }, 'julio'] })

    expect(r.imagenes[0]).toContain('nexa-cuerpo-perfil-izq.png')
    expect(r.imagenes).toContain((PERSONAS as Record<string, { refs: string[] }>).nexa.refs[0])
    expect(r.imagenes).not.toContain(CUERPOS.nexa)
  })
})

const CUERPOS_NEXA = (PERSONAS as Record<string, { cuerpo: string }>).nexa.cuerpo

conAssets('foto:prompt · expresiones y vestuario de Nexa', () => {
  // Las 8 expresiones y los 17 vestuarios existían en disco desde el 2026-09-21 y NO eran direccionables:
  // `vistas` sólo declaraba anclas y ángulos. Los nombres de las expresiones son los del Character Bible
  // §6, que pide usarlos como shorthand de producción.
  it('antepone la expresión pedida a las referencias frontales', () => {
    const r = construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', expresion: 'the-read' }] })

    expect(r.imagenes[0]).toContain('nexa-pose-the-read.png')
  })

  it('antepone el vestuario pedido', () => {
    const r = construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', vestuario: 'speaker-1' }] })

    expect(r.imagenes[0]).toContain('nexa-vest-speaker-1.png')
  })

  // Cada dimensión dice su propio error: antes, pedir una expresión inexistente habría listado las 12
  // vistas y no se entendía qué falló.
  it('una expresión inexistente lista las expresiones, no las vistas', () => {
    expect(() => construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', expresion: 'the-smirk' }] })).toThrow(
      /Expresiones disponibles/
    )
  })

  // El nombre de ejemplo tiene que ser uno que NO vaya a existir: la primera versión de este test usaba
  // `lifestyle-1` y se invalidó sola en cuanto se produjo ese contexto, cuatro horas después.
  it('un vestuario inexistente lista los vestuarios', () => {
    expect(() => construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', vestuario: 'submarino-9' }] })).toThrow(
      /Vestuarios disponibles/
    )
  })

  // Las tres dimensiones ocupan la MISMA ranura —la referencia que se antepone— así que pedir dos es
  // ambiguo y el comando tiene que decirlo en vez de elegir por su cuenta.
  it('aborta si se piden dos dimensiones a la vez', () => {
    expect(() =>
      construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', vista: 'perfil-izq', expresion: 'the-read' }] })
    ).toThrow(/MISMA ranura/)
  })

  it('un vestuario que ya es de cuerpo entero no duplica cuerpo', () => {
    const r = construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', vestuario: 'prof-1' }, 'julio'] })

    expect(r.imagenes[0]).toContain('nexa-vest-prof-1.png')
    expect(r.imagenes).not.toContain(CUERPOS_NEXA)
  })

  it('un vestuario de medio cuerpo sí trae la referencia de cuerpo entero', () => {
    const r = construirPrompt({ ...fichaBase, identidad: [{ persona: 'nexa', vestuario: 'home-1' }, 'julio'] })

    expect(r.imagenes).toContain(CUERPOS_NEXA)
  })
})

conAssets('foto:prompt · signature elements de Nexa', () => {
  // Bible §5.1. No viajaban al prompt, y por eso el material los perdía: medido sobre 7 imágenes, anillo
  // correcto en 0 de 5 con manos visibles y aretes dorados en 5 de 5 donde la ficha pide plata.
  it('el bloque de accesorios viaja con Nexa', () => {
    const p = construirPrompt({ ...fichaBase, identidad: ['nexa'] }).prompt

    expect(p).toContain('SIGNATURE ACCESSORIES')
    expect(p).toContain('INDEX finger of her right hand')
  })

  it('Julio no hereda los accesorios de Nexa', () => {
    expect(construirPrompt({ ...fichaBase, identidad: ['julio'] }).prompt).not.toContain('SIGNATURE ACCESSORIES')
  })

  // Van como bloque APARTE: si se pegaran al IDENTITY con un espacio, el bloque dejaría de existir
  // verbatim en el canon y de ser citable como unidad.
  it('los accesorios son su propio bloque, no parte de IDENTITY', () => {
    const bloques = construirPrompt({ ...fichaBase, identidad: ['nexa'] }).prompt.split('\n\n')

    expect(bloques.find(b => b.startsWith('IDENTITY (critical)'))).not.toContain('SIGNATURE ACCESSORIES')
    expect(bloques.some(b => b.startsWith('SIGNATURE ACCESSORIES'))).toBe(true)
  })

  // 🔴 «Incluir en cada prompt» no es físicamente sostenible: la marca se pierde por el ENCUADRE. La cinta
  // del lanyard falla a ~12 px de ancho y se lee a ~40; un anillo en plano entero tiene menos píxeles que
  // esa cinta fallida. El texto tiene que decir la condición o alguien va a medir «el anillo falló» y
  // culpar al prompt.
  it('el bloque condiciona el render a que la parte del cuerpo se resuelva', () => {
    expect(construirPrompt({ ...fichaBase, identidad: ['nexa'] }).prompt).toContain('large enough to resolve')
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

  // Las TRES dimensiones, no sólo `vistas`: una expresión o un vestuario se antepone a las referencias
  // igual que un ángulo, así que sustituirlos cambia la pieza lo mismo. Recorrer sólo `vistas` dejaba 25
  // referencias de Nexa fuera de todo gate desde el momento en que se declararon.
  it.each(
    Object.entries(
      PERSONAS as Record<
        string,
        { refs: string[]; vistas?: Record<string, string>; expresiones?: Record<string, string>; vestuario?: Record<string, string> }
      >
    ).flatMap(([clave, p]) => [
      ...p.refs.map(r => [clave, r] as const),
      ...Object.values(p.vistas ?? {}).map(r => [clave, r] as const),
      ...Object.values(p.expresiones ?? {}).map(r => [clave, r] as const),
      ...Object.values(p.vestuario ?? {}).map(r => [clave, r] as const)
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

  it('tiene las veinticuatro aprobadas y ninguna descartada ni pendiente', () => {
    // 24 desde el 2026-09-21: entra `copiloto` (la criatura de un partner comparte el gesto con la persona).
    expect(claves).toHaveLength(24)

    // Se nombra para que quitarla del catálogo ponga el test en rojo, no sólo cambiar la cuenta.
    expect(claves).toContain('copiloto')

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
  // no una decisión: la repetición casi idéntica ES el tema. Desde el 2026-09-21 esas diferencias
  // viven en UN eje declarado y el resto queda prohibido — la auditoría ciega midió que pedir tres
  // ejes a la vez producía el doble filo: o no se veía la diferencia, o se veía donde dos copias del
  // mismo archivo no pueden diferir. El contrato completo se verifica en el describe de palancas
  // corregidas; acá sólo queda que la palanca siga pidiendo sus dos piezas irrenunciables.
  it('variantes exige repetición casi idéntica y una apartada', () => {
    const { prompt: p } = construirPrompt({ ...base, palanca: 'variantes', eje: 'the weight of the type, and nothing else' })

    expect(p).toMatch(/identical in every single respect EXCEPT ONE declared axis/)
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

describe('código de vestuario — la prenda dice el registro', () => {
  // Dictado por el operador el 2026-09-20. No es variedad visual: una reunión importante en hoodie
  // dice lo contrario de lo que la escena cuenta.
  it('avisa cuando se mezclan registros incompatibles', () => {
    expect(auditarRegistroVestuario(['chaqueta-softshell-efeonce', 'gorra-efeonce']).join(' ')).toMatch(/mezcla registros/)
    expect(auditarRegistroVestuario(['hoodie-efeonce', 'chaqueta-bomber-efeonce'])).toHaveLength(1)
  })

  // El polo vive en DOS registros: solo es oficina casual, con gorra es terreno.
  it('el polo con gorra es terreno, y no avisa', () => {
    expect(auditarRegistroVestuario(['polo-efeonce', 'gorra-efeonce'])).toHaveLength(0)
  })

  // El lanyard marca pertenencia, no registro: acompaña a cualquier prenda.
  it('el lanyard es transversal: va en casual y en reunión por igual', () => {
    expect(auditarRegistroVestuario(['polo-efeonce', 'lanyard-efeonce'])).toHaveLength(0)
    expect(auditarRegistroVestuario(['chaqueta-softshell-efeonce', 'lanyard-efeonce'])).toHaveLength(0)
  })

  it('una sola prenda nunca se contradice a sí misma', () => {
    expect(auditarRegistroVestuario(['hoodie-efeonce'])).toHaveLength(0)
    expect(auditarRegistroVestuario([])).toHaveLength(0)
  })
})

describe('emblema bordado — el modelo no lo reproduce', () => {
  // 2026-09-20: tres prendas dieron tres emblemas distintos y ninguno era el de Efeonce. La
  // instrucción del kit existía y se emitía en el prompt, pero eso se lo dice AL MODELO: quien
  // cierra necesitaba el aviso delante. El verificador real es mirar el bordado ampliado
  // (`pnpm foto:emblema`), que este aviso es el que lo pone en el camino.
  it('avisa por cada prenda con emblema y manda a ampliarlo', () => {
    const aviso = auditarEmblema(['polo-efeonce']).join(' ')

    expect(aviso).toMatch(/NO lo reproduce fiel/)
    expect(aviso).toMatch(/pnpm foto:emblema/)
    expect(aviso).toMatch(/letra por letra/)
  })

  it('cubre las cinco prendas con bordado', () => {
    for (const p of ['polo-efeonce', 'hoodie-efeonce', 'gorra-efeonce', 'chaqueta-softshell-efeonce', 'chaqueta-bomber-efeonce']) {
      expect(auditarEmblema([p])).toHaveLength(1)
    }
  })

  it('no opina sobre objetos sin bordado', () => {
    expect(auditarEmblema(['nave-efeonce', 'lanyard-efeonce'])).toHaveLength(0)
  })
})

describe('la prenda se copia tal cual; el macro sólo refuerza el detalle', () => {
  const base = {
    id: 'k',
    formato: '4:5',
    escena: 'SCENE: a hard beam at the instant she lifts it. an azure screen. a real walnut worktop',
    lecho: { objeto: 'the near edge of a real walnut worktop', tono: 'DARK walnut in shadow, matte' }
  }

  // 2026-09-20: tres prendas dieron tres emblemas distintos porque en la vista de la prenda entera
  // el bordado mide unos pocos píxeles y el modelo lo lee como una mancha. Los kits YA traían su
  // macro; lo que faltaba era exponerlo. El verificador real sigue siendo mirar el bordado ampliado.
  it('una prenda con emblema aporta DOS referencias: la prenda y el macro', () => {
    const { imagenes, prompt } = construirPrompt({ ...base, objetos: [{ objeto: 'polo-efeonce', vista: 'frente' }] })

    expect(imagenes).toHaveLength(2)
    expect(imagenes[1]).toMatch(/detalle-bordado/)
    expect(prompt).toMatch(/ALREADY FINISHED/)
    expect(prompt).toMatch(/not yours to design, only to copy/)
    expect(prompt).toMatch(/THREE\s+round windows/)
    expect(prompt).toMatch(/satin-stitch embroidery/)
    expect(prompt).toMatch(/Do not resize or move it/)
  })

  // La gorra lleva el LOGOTIPO completo («efeonce» con la nave en la «o»), no el isotipo. Describir
  // una sola forma para las cinco prendas fue el error del 2026-09-20: el bloque genérico decía
  // «do NOT substitute it with letters» y le prohibía al modelo exactamente lo que la gorra lleva.
  it('cada prenda declara QUÉ marca lleva y el bloque la describe', () => {
    const gorra = construirPrompt({ ...base, objetos: [{ objeto: 'gorra-efeonce', vista: 'frente' }] }).prompt
    const polo = construirPrompt({ ...base, objetos: [{ objeto: 'polo-efeonce', vista: 'frente' }] }).prompt

    expect(gorra).toMatch(/letters e-f-e-o-n-c-e/)
    expect(polo).toMatch(/carries NO letters and NO words/)
    // La geometría es verbatim del kit: el emblema se espeja si no se declara el lado.
    expect(polo).toMatch(/rocket points to the RIGHT/)
  })

  // Su logotipo ya es grande y legible en la vista frontal: pasarle además el macro lo empujaba a
  // redibujarlo en vez de copiarlo.
  it('la gorra va sin macro: su marca ya se lee en la prenda', () => {
    expect(construirPrompt({ ...base, objetos: [{ objeto: 'gorra-efeonce', vista: 'frente' }] }).imagenes).toHaveLength(1)
  })

  it('las prendas de emblema pequeño declaran su macro', () => {
    for (const p of ['polo-efeonce', 'hoodie-efeonce', 'chaqueta-softshell-efeonce', 'chaqueta-bomber-efeonce']) {
      expect(construirPrompt({ ...base, objetos: [{ objeto: p, vista: 'frente' }] }).imagenes).toHaveLength(2)
    }
  })

  it('un objeto sin bordado sigue aportando una sola', () => {
    expect(construirPrompt({ ...base, objetos: ['nave-efeonce'] }).imagenes).toHaveLength(1)
  })
})

// Las tres palancas que la auditoría ciega del 2026-09-20 reprobó, corregidas el 2026-09-21. Cada
// `it` de acá está anclado a una ficha REAL de la corrida auditada, no a un caso inventado: es la
// única forma de saber que la corrección ataja el defecto que ocurrió y no un primo suyo.
describe('palancas corregidas tras la auditoría ciega', () => {
  const base = {
    id: 'test',
    formato: '4:5',
    escena: 'SCENE (test): una escena cualquiera. 50mm at f/4.',
    lecho: { objeto: 'the near edge of the table', tono: 'DARK near black' }
  }

  // El hallazgo de raíz: el bloque de la palanca y el campo `escena` viajan juntos en el mismo
  // prompt y nada verificaba que no se peleen. Cuando se pelean gana la escena, por más específica,
  // y la palanca se anula en silencio. `ausencia` no reprobó por falta de marcadores —los tenía
  // desde `0012e6c4b`, el mismo commit que produjo el plate— sino porque su escena los contradecía.
  describe('una escena no puede contradecir a su propia palanca', () => {
    // Verbatim de `ai-generations/2026-09-20_palancas-con-color/fichas/F4-ausencia.json`, la que los
    // dos evaluadores ciegos llamaron la peor de las doce: «foto de inmobiliaria», «hay mobiliario».
    const F4 =
      'SCENE (after the session, studio in Miami, late afternoon): a hard low sun beam comes through ' +
      'the window and lands across the empty chair. On the table, an ink-blue folder lies open where ' +
      'it was left. A marker with its cap off, a half-drunk glass, one lamp still on. 35mm at f/2.8, ' +
      'focus on the empty chair.'

    // Verbatim de `…_palancas-complemento/fichas/C4-ausencia.json`, la que sí funcionó. Nombra el
    // vacío IGUAL que la otra: por eso un patrón que sólo busque «empty chair» da falso positivo.
    const C4 =
      'SCENE (after the session, studio in Miami, NOBODY IN FRAME): what remains is the trace of the ' +
      'work that just happened: a chair pushed back at an angle from the table, printed layouts still ' +
      'spread where they were left, a marker with its cap off, one lamp still on. A hard low sun beam ' +
      'lands across the empty chair. The room reads as if the people stepped out a minute ago.'

    it('atrapa la ficha que reprobó', () => {
      const avisos = auditarContradicciones({ palanca: 'ausencia', escena: F4 })

      expect(avisos).toHaveLength(1)
      expect(avisos[0]).toMatch(/CONTRADICE a su propia palanca "ausencia"/)
    })

    it('deja pasar la que describía la huella, aunque nombre el vacío igual', () => {
      expect(auditarContradicciones({ palanca: 'ausencia', escena: C4 })).toHaveLength(0)
    })

    it('la silla empujada es la diferencia, no la palabra «empty»', () => {
      // Las dos dicen «the empty chair»; sólo una deja la silla corrida. Si este test se cae porque
      // alguien simplificó el patrón a «busca empty», el falso positivo volvió.
      expect(F4).toMatch(/empty chair/)
      expect(C4).toMatch(/empty chair/)
      expect(auditarContradicciones({ palanca: 'ausencia', escena: F4 })).toHaveLength(1)
      expect(auditarContradicciones({ palanca: 'ausencia', escena: C4 })).toHaveLength(0)
    })

    // Tercer caso en dos días de la MISMA clase: lo que queda fijo en el kit —la variante de marca de
    // la gorra, su vista, el color del polo— se impone sobre lo que pide la escena, en silencio. Acá
    // gana la REFERENCIA y no la escena, al revés que con la palanca: una imagen pesa más que una frase.
    describe('una escena no puede pedir un color que la referencia no tiene', () => {
      const escenaCon = (color: string) =>
        `SCENE (Run and Gun at a roastery): she wears the navy Efeonce trucker cap and the ${color} ` +
        'Efeonce pique polo, sharp at the monitor cart. A hard shaft of window light with dust.'

      it('atrapa el caso medido: escena navy con el kit resuelto en blanco', () => {
        const avisos = auditarContradicciones({
          objetos: [{ objeto: 'polo-efeonce', color: 'blanco' }],
          escena: escenaCon('deep navy')
        })

        expect(avisos).toHaveLength(1)
        expect(avisos[0]).toMatch(/resuelve "polo-efeonce" en BLANCO y la escena lo describe en NAVY/)
      })

      it('atrapa el inverso, con el color por defecto', () => {
        expect(auditarContradicciones({ objetos: ['polo-efeonce'], escena: escenaCon('white') })).toHaveLength(1)
      })

      it('deja pasar la ficha coherente', () => {
        expect(auditarContradicciones({ objetos: ['polo-efeonce'], escena: escenaCon('deep navy') })).toHaveLength(0)
      })

      // El detector exige que el color esté PEGADO al nombre de la prenda. Sin eso, cualquier escena
      // con el azul portador de marca al fondo —que el canon pide en TODAS— daría falso positivo.
      it('un panel azul al fondo no es el color del polo', () => {
        const avisos = auditarContradicciones({
          objetos: [{ objeto: 'polo-efeonce', color: 'blanco' }],
          escena:
            'SCENE: she wears the white Efeonce pique polo. Far behind her a large navy blue panel glows on the wall.'
        })

        expect(avisos).toHaveLength(0)
      })

      it('nombra los colores que el kit sí tiene cuando se pide uno inexistente', () => {
        const avisos = auditarContradicciones({
          objetos: ['polo-efeonce'],
          escena: 'SCENE: he wears the black Efeonce pique polo at his desk.'
        })

        expect(avisos[0]).toMatch(/El kit no tiene ese color: navy, blanco/)
      })

      it('no opina sobre un kit sin variantes de color', () => {
        expect(
          auditarContradicciones({ objetos: ['hoodie-efeonce'], escena: 'SCENE: he wears the white hoodie.' })
        ).toHaveLength(0)
      })
    })

    it('una palanca sin contrato de contradicción no inventa avisos', () => {
      expect(auditarContradicciones({ palanca: 'manos', escena: F4 })).toHaveLength(0)
      expect(auditarContradicciones({ escena: F4 })).toHaveLength(0)
    })
  })

  // Los dos evaluadores se contradijeron en el dato y coincidieron en el veredicto: uno vio nueve
  // copias idénticas («un patrón decorativo»), el otro vio que NO lo eran («nueve impresiones del
  // mismo archivo no pueden diferir entre sí»). Las dos lecturas son el mismo defecto: el contrato
  // pedía mover TRES ejes a la vez.
  describe('`variantes` exige UN eje declarado', () => {
    it('sin `eje` no se puede construir el prompt', () => {
      expect(() => construirPrompt({ ...base, palanca: 'variantes' })).toThrow(/exige el campo `eje`/)
    })

    it('el error enseña la forma: un eje «y nada más»', () => {
      expect(() => construirPrompt({ ...base, palanca: 'variantes' })).toThrow(/and nothing else/)
    })

    it('con el eje declarado, prohíbe explícitamente que varíe cualquier otra cosa', () => {
      const { prompt } = construirPrompt({
        ...base,
        palanca: 'variantes',
        eje: 'the weight of the type, and nothing else'
      })

      expect(prompt).toMatch(/EXCEPT ONE declared axis: the weight of the type, and nothing else/)
      expect(prompt).toMatch(/NOTHING else varies between them/)
      // El número y la rejilla se habían perdido al destilar el texto que de verdad se probó
      // («NINE printed sheets pinned in a grid on a pale studio wall» → «repeated many times»).
      expect(prompt).toMatch(/NINE TO TWELVE copies/)
      expect(prompt).toMatch(/REGULAR GRID/)
    })
  })

  // El lecho ES la firma y no se puede quitar, pero se leyó como muletilla. Contar OBJETOS no lo
  // detecta: los doce lechos de la serie auditada eran literalmente distintos, 12 de 12. Lo que se
  // repetía era la forma.
  describe('el lecho se cuenta por familia, no por objeto', () => {
    // Las fichas REALES de la corrida que la auditoría ciega miró, leídas del disco. La primera
    // versión de este test transcribía los textos a mano y recortaba: el recorte cambió la
    // clasificación de `G1` y el conteo cayó de 7 a 6, con el detector intacto. Una guarda que
    // copia el dato codifica un modelo del dato; ésta lee la evidencia.
    const DOCE = ['F1', 'F2', 'F4', 'F5', 'F7', 'G1', 'G3', 'G4', 'H1', 'H2', 'H3', 'H4'].map(id => {
      const dir = ['con-color', 'podcast', 'oficio-digital']
        .map(r => path.join(raiz, `ai-generations/2026-09-20_palancas-${r}/fichas`))
        .find(d => existsSync(d) && readdirSync(d).some(n => n.startsWith(`${id}-`)))

      if (!dir) throw new Error(`Ficha ${id} no encontrada: son la evidencia del test y están versionadas`)

      const archivo = readdirSync(dir).find(n => n.startsWith(`${id}-`)) as string

      return { ...JSON.parse(readFileSync(path.join(dir, archivo), 'utf8')), id }
    })

    it('los doce objetos son distintos: contar objetos no habría detectado nada', () => {
      const objetos = DOCE.map(f => (typeof f.lecho === 'string' ? f.lecho : f.lecho.objeto))

      expect(new Set(objetos).size).toBe(12)
    })

    it('reproduce el conteo del evaluador ciego: siete de doce', () => {
      const avisos = auditarLechoDeTanda(DOCE)

      expect(avisos).toHaveLength(1)
      expect(avisos[0]).toMatch(/"borde de superficie" en 7 de 12/)
    })

    it('el cuerpo de un proyector no es una superficie', () => {
      // El conteo a mano daba 8 justamente por meter esto entre las mesas.
      expect(familiaDeLecho('the out-of-focus corner of the projector body at the bottom')).toBe('equipo de rodaje')
      expect(familiaDeLecho('the near edge of the mixing desk immediately under the lens')).toBe('borde de superficie')
    })

    it('una tanda variada no dispara el aviso', () => {
      const variada = [
        { id: 'a', lecho: { objeto: 'the near edge of the pale oak table', tono: 'VERY LIGHT' } },
        { id: 'b', lecho: { objeto: 'the pale polished concrete floor close to the lens', tono: 'VERY LIGHT' } },
        { id: 'c', lecho: { objeto: 'the matte-black matte box of the cinema camera rig', tono: 'DARK' } },
        { id: 'd', lecho: { objeto: 'the heads and shoulders of the audience in the front rows', tono: 'DARK' } }
      ]

      expect(auditarLechoDeTanda(variada)).toHaveLength(0)
    })

    it('una tanda de menos de tres no se audita: no hay serie que leer', () => {
      expect(auditarLechoDeTanda(DOCE.slice(0, 2))).toHaveLength(0)
    })
  })
})

describe('el polo existe en dos colores y la principal es la navy', () => {
  const base = {
    id: 'c',
    formato: '4:5',
    escena: 'SCENE: a hard beam at the instant she lifts it. an azure screen. a real walnut worktop',
    lecho: { objeto: 'the near edge of a real walnut worktop', tono: 'DARK walnut in shadow, matte' }
  }

  // El patrón estaba fijo en la variante SECUNDARIA. Como la referencia gana sobre la escena, una
  // escena que pedía «deep navy polo» salía en BLANCO (medido 2026-09-21). La navy es la principal:
  // 15 vistas contra 6, y es la referencia del uniforme en EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.
  it('sin declarar color, usa la navy', () => {
    const { imagenes } = construirPrompt({ ...base, objetos: [{ objeto: 'polo-efeonce', vista: 'frente' }] })

    expect(imagenes[0]).toMatch(/polo-navy/)
    expect(imagenes[1]).toMatch(/polo-navy-10-detalle-bordado/)
  })

  it('la blanca se puede pedir, y arrastra su propio macro', () => {
    const { imagenes } = construirPrompt({ ...base, objetos: [{ objeto: 'polo-efeonce', color: 'blanco', vista: 'frente' }] })

    expect(imagenes[0]).toMatch(/polo-blanco/)
    expect(imagenes[1]).toMatch(/polo-blanco-10-detalle-bordado/)
  })

  it('un color que no existe se rechaza en vez de caer en silencio a otro', () => {
    expect(() => construirPrompt({ ...base, objetos: [{ objeto: 'polo-efeonce', color: 'verde' }] })).toThrow(
      /El color "verde" no existe/
    )
  })

  // El emblema sobredimensionado es el fallo más común del kit y su ancla vivía sólo en la doc.
  it('el bloque lleva el ancla de tamaño, no sólo la doc', () => {
    expect(construirPrompt({ ...base, objetos: [{ objeto: 'polo-efeonce', vista: 'frente' }] }).prompt).toMatch(/NO WIDER THAN A THIRD/)
  })
})


describe('el asset de USO es la prenda puesta, y es el defecto', () => {
  const base = {
    id: 'u',
    formato: '4:5',
    escena: 'SCENE: a hard beam at the instant she lifts it. an azure screen. a real walnut worktop',
    lecho: { objeto: 'the near edge of a real walnut worktop', tono: 'DARK walnut in shadow, matte' }
  }

  // Contrato EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1: arte plano → producir vistas · prenda aislada
  // → construir · prenda PUESTA → usar en escena. Medido: con la prenda puesta el logotipo sale legible
  // a la primera en las dos personas; con la prenda aislada falló cuatro veces seguidas.
  it('sin vista declarada usa la prenda PUESTA, y entonces el macro sobra', () => {
    const { imagenes, prompt } = construirPrompt({ ...base, objetos: ['polo-efeonce'] })

    expect(imagenes).toHaveLength(1)
    expect(imagenes[0]).toMatch(/puesto-frente/)
    expect(prompt).toMatch(/ALREADY WORN/)
  })

  // La prenda puesta trae una persona que NO es la de la escena: si no se dice, el modelo mezcla.
  it('declara que la persona de la referencia no cuenta', () => {
    const { prompt } = construirPrompt({ ...base, objetos: ['polo-efeonce'] })

    expect(prompt).toMatch(/PERSON in that image is NOT the person in this scene/)
  })

  it('pedir la vista explícita devuelve la prenda aislada, para construir', () => {
    const { imagenes } = construirPrompt({ ...base, objetos: [{ objeto: 'polo-efeonce', vista: 'frente' }] })

    expect(imagenes[0]).toMatch(/01-frente/)
    expect(imagenes).toHaveLength(2)
  })

  // La gorra tiene prueba en persona, así que su asset de uso se elige por persona.
  it('la gorra resuelve su asset de uso por persona', () => {
    expect(construirPrompt({ ...base, objetos: [{ objeto: 'gorra-efeonce', usoDe: 'julio' }] }).imagenes[0]).toMatch(/prueba-julio/)
    expect(() => construirPrompt({ ...base, objetos: [{ objeto: 'gorra-efeonce', usoDe: 'pedro' }] })).toThrow(/no tiene prueba en persona/)
  })
})
