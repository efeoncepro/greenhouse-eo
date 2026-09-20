// `pnpm foto:prompt` — arma el prompt de una foto de marca Efeonce desde una ficha de toma.
//
// Existe por una razón concreta: mientras armar un prompt sea copiar y pegar bloques, un valor de UN
// formato se cuela dentro de un bloque que corre en TODOS. Pasó dos veces y ninguna se vio:
//   · el bloque de realismo terminaba con «Vertical 4:5.» — habría contradicho al --size en 9:16 y 16:9;
//   · la plantilla del lecho traía «bottom 18%» — el valor de 4:5, dentro de la plantilla compartida.
// Acá el formato, el porcentaje del lecho y el límite de sujetos salen de UNA tabla. No se pueden pegar mal.
//
// Uso:
//   pnpm foto:prompt <ficha.json>                    → imprime el prompt
//   pnpm foto:prompt <ficha.json> --batch <out.json> → escribe el batch para `pnpm ai:image --batch`
//   pnpm foto:prompt --ficha-ejemplo                 → imprime una ficha de ejemplo comentada
//
// Canon: docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md (bloques)
//        docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md (reservas)
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
// Los bloques viven AL LADO del comando, no en una carpeta de corrida fechada. La copia de
// `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/prompts/` queda como evidencia histórica de
// esa corrida; si se archiva, este comando sigue funcionando.
const BLOQUES = path.join(raiz, 'scripts/foto/bloques')

// ── La tabla. Única fuente del formato. ──────────────────────────────────────────────────────────
// `size` es lo que se le pasa a `pnpm ai:image --size`. `lecho` y `limite` están medidos en
// rondas/texto/bv2-{45,916,169}.json; 1:1 hereda el vertical y está SIN VALIDAR.
const FORMATOS = {
  '4:5': {
    size: '1152x1440',
    declara: 'VERTICAL 4:5 composition.',
    lecho: '18%',
    limite: 'All heads and hands stay BELOW 36% of the frame height.',
    zonaTexto: ({ muro, tinta }) =>
      `TEXT SPACE (planned, essential): the TOP 30% of the frame is ${muro}, ${tinta}, with no objects, windows, light beams or bright spots in it, reserved for a headline.`
  },
  '9:16': {
    size: '1152x2048',
    declara: 'VERTICAL 9:16 composition for Stories/Reels.',
    lecho: '22%',
    limite: 'All heads and hands stay BELOW 36% of the frame height.',
    zonaTexto: ({ muro, tinta }) =>
      `TEXT SPACE (planned, essential): the band between 10% and 32% of the frame height is ${muro}, ${tinta}, with no objects, windows, light beams or bright spots in it, reserved for a headline.`
  },
  '16:9': {
    size: '2048x1152',
    declara: 'HORIZONTAL 16:9 composition.',
    lecho: '16%',
    limite: 'All people and objects stay entirely inside the RIGHT 55% of the frame.',
    zonaTexto: ({ muro, tinta }) =>
      `TEXT SPACE (planned, essential): the LEFT 42% of the frame is ${muro}, ${tinta}, with no objects, windows, light beams or bright spots in it, reserved for a headline; the subject sits in the right half.`
  },
  '1:1': {
    size: '1152x1152',
    declara: 'SQUARE 1:1 composition.',
    // 18% y no 20%: ninguno de los dos está medido, pero 18% es el que ya se usó en las fichas 1:1
    // reales (`2026-09-20_formatos-catalogo/brief/batch-11.json`). Entre dos números sin medición,
    // gana el que ya existe en un archivo; dos verdades para el mismo formato es peor que un número
    // imperfecto. Queda `sinValidar` hasta que haya una ronda 1:1 con lecho medido.
    lecho: '18%',
    limite: 'All heads and hands stay BELOW 40% of the frame height.',
    sinValidar: true,
    zonaTexto: ({ muro, tinta }) =>
      `TEXT SPACE (planned, essential): the TOP 28% of the frame is ${muro}, ${tinta}, with no objects, windows, light beams or bright spots in it, reserved for a headline.`
  }
}

const TINTA = {
  blanca: 'a DEEP, warm, evenly toned shadow dark enough for white text',
  oscura: 'plain, evenly lit and VERY LIGHT, almost white, light enough for dark ink text'
}

// ── Los bloques que sí son reusables tal cual ────────────────────────────────────────────────────
// Exportada para poder ejercitarla sobre strings. Un test que sólo afirme que el archivo de hoy está
// limpio verifica el archivo, no el mecanismo: si alguien afloja esta expresión, el archivo sigue
// limpio, el test sigue verde y la puerta queda abierta.
export const detectarValorDeFormato = texto =>
  (texto.match(/\b(?:Vertical|Horizontal|Square)\s+\d+:\d+/i) ?? texto.match(/bottom\s+\d+%/i))?.[0] ?? null

const leerBloque = f => {
  const t = readFileSync(path.join(BLOQUES, f), 'utf8').trim()

  // Guardia: el bug que este comando existe para evitar. Si alguien vuelve a meter el formato dentro
  // de un bloque compartido, esto lo detiene acá y no en 51 plates ya pagados.
  const colado = detectarValorDeFormato(t)

  if (colado) {
    throw new Error(
      `El bloque compartido "${f}" contiene un valor de un formato concreto ("${colado}"). ` +
        `El formato y el lecho salen de la tabla de este comando, nunca de un bloque reusado. Saca esa frase del archivo.`
    )
  }

  return t
}

// ── Reservas opcionales ──────────────────────────────────────────────────────────────────────────
// Guarda contra el fallo que la sesión de capa gráfica encontró en su propio armador: rellenaba el
// tono y BORRABA la materia. Un prompt que pide un tono sin decir de qué está hecha la cosa obliga al
// modelo a inventar el objeto, y lo que inventa es un panel liso — la «losa» que el operador rechazó
// por «extremadamente forzado». La materia no es opcional y no puede ser genérica.
const GENERICAS = /^(a |the )?(surface|background|area|field|wall|panel|zone|space|plane)\.?$/i

const exigirMateria = (valor, campo, reserva) => {
  if (!valor || !String(valor).trim()) {
    throw new Error(
      `La reserva "${reserva}" necesita \`${campo}\`: de qué está hecha la superficie en la escena. ` +
        `Sin materia el modelo inventa un panel liso y la pieza se siente forzada.`
    )
  }

  if (GENERICAS.test(String(valor).trim())) {
    throw new Error(
      `\`${campo}\` de "${reserva}" es genérico ("${valor}"). Nombrá la materia real de la escena: ` +
        `«the bare pale polished concrete wall of the gallery», «dark walnut worktop in shadow», no «a wall».`
    )
  }

  return valor
}

const RESERVAS = {
  seleccion: ({ objeto, campo }) =>
    exigirMateria(campo, 'campo', 'seleccion') &&
    `SELECTION TARGET (planned): ${objeto}, complete and unobstructed, sitting clearly SEPARATED from everything else, with generous empty room on ALL FOUR sides of it. On every side of that object — above, below, left and right — the scene itself is a DEEP, evenly toned dark field (${campo}), dark enough for a light blue outline to read against it; no bright surface, no window, no lamp, no pale tabletop and no light-coloured object touches or crosses that perimeter. The object itself has NO bright white paper margin around it: it is full-bleed, so its own edge is as dark as the field around it.`,
  margen: ({ superficie, tinta }) =>
    exigirMateria(superficie, 'superficie', 'margen') &&
    `MARGIN FIELD (planned): down the LEFT side of the frame, a continuous vertical band about 30% of the frame width runs unbroken from the top of the frame to BELOW the 40% mark of the frame height. That whole band is one single surface of the scene itself (${superficie}), ${TINTA[tinta]}, even in tone from top to bottom, with NOTHING crossing it: no person, no furniture edge, no window, no cable, no light beam, no bright highlight and no change of material anywhere inside it.`
}

// ── Incompatibilidades conocidas toma ↔ reserva ─────────────────────────────────────────────────
// Una reserva no se puede pedir en cualquier toma. Pedirla igual produce cobertura nominal: el plate
// existe y no sirve. Se declara en la ficha con `toma: <n>` (número del catálogo de cámaras).
const INCOMPATIBLES = {
  margen: {
    tomas: [4, 5, 10, 14],
    porque:
      'no tienen margen vertical libre: ojo de pez de grupo mira al centro, el dron es cenital, el macro está a centímetros y el barrido es movimiento [criterio, leído del catálogo]'
  },
  seleccion: {
    tomas: [5, 10, 14],
    porque: 'no hay perímetro alrededor de un objeto aislado: el dron no tiene objeto, el macro ES el objeto y el barrido lo arrastra [criterio]'
  }
}

// En disputa, NO bloqueante: la sesión de capa gráfica midió la toma 19 (picado 60°) fallando el lecho
// en 16:9 con nitidez 0.0043 y concluyó que el ángulo no disuelve la mesa. Pero el piloto de esta
// sesión, P1, ES picado 60° en 4:5 y su lecho pasó con nitidez 0.0002 [medido]. Dos mediciones opuestas
// sobre el mismo ángulo: la diferencia está en el formato o en el verbatim, no en el ángulo. Hasta
// resolverlo con una tercera medición, la 19 NO entra en la lista: bloquear por una sola observación
// tira una toma que ya demostró funcionar.

const FICHA_EJEMPLO = {
  id: 'ejemplo-picado-mesa-oscura',
  formato: '4:5',
  impacto: true,
  escena:
    'SCENE (art direction review, Santiago studio, late afternoon): seen from about 60 degrees above a matt ink-blue worktop; two art directors lean in from the far side, only their forearms in frame. 50mm lens at f/4, focus on the proof.',
  lecho: { objeto: 'the near edge of the ink-blue worktop', tono: 'DARK near black' },
  reservas: {
    seleccion: { objeto: 'a single printed proof lying on the worktop', campo: 'a matt ink-blue worktop in shadow' }
  }
}

// ── Armado ───────────────────────────────────────────────────────────────────────────────────────
export const construirPrompt = ficha => {
  const fmt = FORMATOS[ficha.formato]

  if (!fmt) throw new Error(`Formato "${ficha.formato}" desconocido. Usa uno de: ${Object.keys(FORMATOS).join(', ')}.`)
  if (!ficha.escena) throw new Error('La ficha necesita `escena`: el modelo no inventa la escena por vos.')

  if (!ficha.lecho?.objeto || !ficha.lecho?.tono) {
    throw new Error('La ficha necesita `lecho.objeto` y `lecho.tono`. La firma SIEMPRE necesita su lecho: no es opcional.')
  }

  if (ficha.toma) {
    for (const [reserva, regla] of Object.entries(INCOMPATIBLES)) {
      if (ficha.reservas?.[reserva] && regla.tomas.includes(ficha.toma)) {
        throw new Error(
          `La toma ${ficha.toma} no admite la reserva "${reserva}": ${regla.porque}. ` +
            `Cambiá de toma o sacá la reserva; forzarlo produce un plate que existe y no sirve.`
        )
      }
    }
  }

  const partes = [leerBloque('bloque-realismo-v2.txt')]

  if (ficha.impacto !== false) partes.push(leerBloque('bloque-impacto-v1.txt'))

  // Composición: el formato se declara UNA vez, acá, con el texto de la tabla.
  const comp = [fmt.declara, fmt.limite]
  const r = ficha.reservas ?? {}

  if (r.texto) comp.push(fmt.zonaTexto({ muro: r.texto.muro ?? 'a plain wall', tinta: TINTA[r.texto.tinta ?? 'blanca'] }))

  for (const [k, args] of Object.entries(r)) {
    if (k !== 'texto') {
      if (!RESERVAS[k]) throw new Error(`Reserva "${k}" desconocida. Usa: texto, ${Object.keys(RESERVAS).join(', ')}.`)
      comp.push(RESERVAS[k](args))
    }
  }

  partes.push(comp.join(' '))
  partes.push(ficha.escena)

  // El lecho, con el porcentaje del formato. Nunca escrito a mano.
  partes.push(
    `FOREGROUND (planned): ${ficha.lecho.objeto}, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom ${fmt.lecho} of the frame (never a hard band), ${ficha.lecho.tono}; its center calm and even.`
  )

  return { prompt: partes.join('\n\n'), size: fmt.size, sinValidar: Boolean(fmt.sinValidar) }
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const args = process.argv.slice(2)

  if (args.includes('--ficha-ejemplo')) {
    console.log(JSON.stringify(FICHA_EJEMPLO, null, 2))
    process.exit(0)
  }

  const fichaPath = args[0]

  if (!fichaPath) {
    console.error('Uso: pnpm foto:prompt <ficha.json> [--batch <out.json>]   ·   pnpm foto:prompt --ficha-ejemplo')
    process.exit(2)
  }

  const crudo = JSON.parse(readFileSync(fichaPath, 'utf8'))
  const fichas = Array.isArray(crudo) ? crudo : [crudo]
  const resueltas = fichas.map(f => ({ ficha: f, ...construirPrompt(f) }))
  const sizes = new Set(resueltas.map(r => r.size))

  if (sizes.size > 1) {
    throw new Error(
      `Las fichas piden tamaños distintos (${[...sizes].join(', ')}) y \`pnpm ai:image --batch\` toma un solo --size. ` +
        `Separalas en un batch por formato.`
    )
  }

  const size = [...sizes][0]
  const i = args.indexOf('--batch')

  if (i >= 0) {
    const out = args[i + 1]
    const batch = resueltas.map(r => ({ filename: `${r.ficha.id}-plate.png`, prompt: r.prompt }))

    writeFileSync(out, JSON.stringify(batch, null, 1))
    console.log(`${batch.length} prompt(s) → ${out}`)
    console.log(`\nAhora:\n  pnpm ai:image --batch ${out} --out <dir> --model gpt-image-2.5-flare --quality high --size ${size}`)
  } else {
    for (const r of resueltas) console.log(`${r.prompt}\n\n─── size: ${r.size} ───\n`)
  }

  if (resueltas.some(r => r.sinValidar)) {
    console.log('⚠ El formato 1:1 no tiene ronda validada: sus números son criterio, no medición.')
  }
}
