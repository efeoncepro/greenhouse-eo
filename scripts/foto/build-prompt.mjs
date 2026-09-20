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
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
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

// La cláusula de textura NO es decorativa: es la regla anti-losa. Un tono oscuro pedido sin ella sale
// como un panel plano flotante — lo que el operador rechazó por «extremadamente forzado». Ya vivía
// escrita en la ficha de la toma 15 y en el bloque de impacto («rich but detailed darks, never flat,
// never evenly lit»); acá deja de depender de que alguien se acuerde de copiarla. [2026-09-20]
const TINTA = {
  blanca:
    'a DEEP, warm, evenly toned shadow, deep but ALWAYS keeping visible texture and detail of the material — never a flat pure-black panel, never an evenly filled shape — dark enough for white text',
  oscura:
    'plain, evenly lit and VERY LIGHT, almost white, keeping the visible grain and detail of the material — never a flat blank panel — light enough for dark ink text'
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

// ── Personas con identidad. Bloques verbatim del canon §3.6; rutas reales de §3.7. ──────────────
// Sin esto, una toma con Julio o Nexa se armaba a mano — justo lo que este comando existe para
// impedir. El modo de falla no era estético: un prompt sin IDENTITY ni REFERENCES genera una cara
// inventada, se ve "bien" en la hoja de contacto y se paga igual.
const PERSONAS = {
  julio: {
    etiqueta: 'Julio',
    // Geometría, no adjetivos. Cuatro iteraciones el 2026-09-20 probaron que «cara delgada» no
    // significa nada para el modelo y «óvalo 1,5 veces más alto que ancho, frente con entradas,
    // mejillas planas, barba por debajo del mentón» sí. Lo mismo vale para el pelo: los laterales
    // cortos con el gris concentrado son lo que lo hace reconocible, no «pelo entrecano».
    identity:
      'IDENTITY (critical): the man is the SAME real person shown in the reference images. His face is LONG AND LEAN: measured from hairline to the bottom of the beard it is roughly 1.5 times TALLER than it is WIDE at the cheekbones — a long vertical oval, NOT round, NOT square, NOT chubby. If in doubt make it longer and narrower, never wider. FOREHEAD tall and open, with a RECEDING HAIRLINE pulling back at both temples into bare corners. CHEEKS flat and slightly hollow under the cheekbones. BEARD full and LONG, extending well BELOW the jawline past the chin, with heavy grey in the moustache, chin and lower beard, darker at the sideburns and a clean cheek line — never a short beard hugging the jaw. JAW narrowing to the chin, separated from a visible slim neck; no double chin, no jowls. GLASSES rectangular metal-rim with a THICK brushed-silver bar across the TOP of both lenses and wide flat temple arms — never rimless, thin-wire, round or plastic. HAIR cut SHORT and close at the sides and around the ears, almost faded, and the GREY IS CONCENTRATED THERE so the sides read clearly lighter than the top; on top, defined curls of MODERATE volume, dominant tone dark with scattered grey — never a tall voluminous hairstyle and never uniformly grey. BROWS thick and fairly straight. EXPRESSION a slight closed-mouth smile, eyes engaged. Warm brown skin with visible pores, mid-forties: do not rejuvenate, beautify or soften. Broad-shouldered and solid in the body, while the FACE stays long and lean.',
    // Set aprobado por el operador el 2026-09-20 (hoja de contacto). Reemplaza al set de
    // `2026-09-17_equipo-vestuario/refs/`, que idealizaba el rostro y arrastraba deriva.
    refs: [
      'ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png',
      'ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-08.png',
      'ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-11.png'
    ],
    // Vistas que las referencias frontales NO cubren. Derivadas por EDICIÓN desde julio-ap-08,
    // no generadas de cero: generar reconstruye el rostro y lo redondea.
    vistas: {
      '45-izq': 'ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/julio-45-izq.png',
      '45-der': 'ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/julio-45-der.png',
      'perfil-izq': 'ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/julio-perfil-izq.png',
      'perfil-der': 'ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/julio-perfil-der.png',
      trasero: 'ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/julio-135-trasero.png',
      espalda: 'ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/julio-espalda.png'
    }
  },
  nexa: {
    etiqueta: 'Nexa',
    identity:
      'IDENTITY (critical): the woman is NEXA, the SAME person shown in the Nexa reference images: a woman in her early thirties with long dark wavy hair, fair olive skin, dark eyes and defined brows. Preserve her face and hair EXACTLY as in the references; only pose, clothing, light and setting change.',
    refs: [
      'ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-cuerpo-completo-v2.png',
      'ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-the-point.png',
      'ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-the-listen.png'
    ]
  }
}

// Una persona sola lleva 3 referencias; dos personas llevan 2 cada una (medido en la ronda de
// personas: 6 referencias sostuvieron identidad de dos personas y dos mascotas).
const REFS_POR_PERSONA = { 1: 3, 2: 2 }

function resolverIdentidad(ficha) {
  const pedidas = ficha.identidad ?? []

  if (!Array.isArray(pedidas)) {
    throw new Error(
      '`identidad` debe ser una lista, por ejemplo ["julio"], ["julio", "nexa"] o [{ "persona": "julio", "vista": "perfil-izq" }].'
    )
  }

  if (!pedidas.length) return null

  if (pedidas.length > 2) {
    throw new Error(
      'Más de dos personas con identidad en una toma no está medido: la ronda de personas llegó a dos personas ' +
        '(más dos mascotas con su propio bloque). Divide la pieza o documenta la medición antes de subir el tope.'
    )
  }

  const cupo = REFS_POR_PERSONA[pedidas.length]
  const imagenes = []
  const tramos = []

  for (const pedido of pedidas) {
    // Una entrada puede ser "julio" (vista frontal) o { persona: 'julio', vista: 'perfil-izq' }.
    const clave = typeof pedido === 'string' ? pedido : pedido?.persona
    const vista = typeof pedido === 'string' ? null : pedido?.vista
    const persona = PERSONAS[clave]

    if (!persona) {
      throw new Error(`Persona "${clave}" desconocida. Personas con identidad canónica: ${Object.keys(PERSONAS).join(', ')}.`)
    }

    // La vista manda: si la toma es de perfil, mandar sólo retratos frontales obliga al modelo a
    // inventar el giro, y lo que inventa ensancha la cara. La vista va PRIMERA por ser la decisiva.
    let refs = persona.refs.slice(0, cupo)

    if (vista) {
      const disponibles = persona.vistas ?? {}

      if (!disponibles[vista]) {
        throw new Error(
          `La vista "${vista}" no existe para ${persona.etiqueta}. Vistas disponibles: ${Object.keys(disponibles).join(', ') || 'ninguna'}.`
        )
      }

      refs = [disponibles[vista], ...persona.refs.slice(0, Math.max(0, cupo - 1))]
    }

    for (const ref of refs) {
      if (!existsSync(path.join(raiz, ref))) {
        throw new Error(
          `La referencia de ${persona.etiqueta} no existe en disco: ${ref}. ` +
            'Sin ella el modelo inventa la cara y la corrida se paga igual.'
        )
      }
    }

    const desde = imagenes.length + 1
    const hasta = imagenes.length + refs.length

    imagenes.push(...refs)
    tramos.push({ persona, desde, hasta })
  }

  // Texto verbatim de §3.7: una persona lo lleva todo en una frase; dos lo dicen por tramo y cierran
  // con el "ignore" común.
  const rango = t => (t.desde === t.hasta ? `Image ${t.desde}` : `Images ${t.desde}-${t.hasta}`)

  const references =
    tramos.length === 1
      ? `REFERENCES: ${rango(tramos[0])} are ${tramos[0].persona.etiqueta} (identity only; ignore their clothing and backgrounds).`
      : `REFERENCES: ${tramos
          .map(t => `${rango(t)} are ${t.persona.etiqueta} (identity only).`)
          .join(' ')} Ignore the clothing and backgrounds of all references.`

  return { identity: tramos.map(t => t.persona.identity).join('\n\n'), references, imagenes }
}

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
// ── Anclas prohibidas: la categoría de un cliente no es el oficio de Efeonce ─────────────────────
// **[decisión del operador, 2026-09-19]** «nosotros NO somos Berel». Una sesión igual generó, el
// 2026-09-20, un macro de un rodillo aplicando pintura azul: la regla estaba escrita en los docs y no
// la ejecutaba nada. Tabla extensible; se agrega sólo lo que el operador declare, nunca por inferencia.
const ANCLAS_PROHIBIDAS = [
  {
    patron: /\b(paint roller|rodillo|fresh paint|wet paint|painting the wall|paint(s|ing)? (a|the) wall)\b/i,
    porque: 'la pintura es la categoría de Berel, un cliente. La fotografía de Efeonce NUNCA se ancla en el rubro de un cliente'
  }
]

// Vocabulario con el que una escena declara LUZ y MOMENTO. La ronda que el operador aprobó el 19/09
// los tiene en el 100% de sus escenas; la tanda de 34 que perdió calidad, en 64% y 26%. No es una
// medición fuerte —mis propios pilotos aprobados sacan 66/33— así que AVISA, no bloquea. [medido]
// `daylight` y `midday` faltaban y marcaban falso negativo en una escena que SÍ declaraba luz dura
// de vitrina a mediodía [medido 2026-09-20]. Un aviso que grita donde no debe se vuelve ruido y deja
// de leerse justo cuando acierta.
const LUZ =
  /\b(sun|sunlight|sunbeam|daylight|midday|noon|beam|backlit|rim-?lit|lit only|lamp|window light|golden hour|hard light|directional|shaft|raking|silhouett)/i

const MOMENTO = /\b(mid-|at the peak|throws|laughing|mid-sentence|reaching|turning|just as|the moment|catches)/i

export const auditarEscena = escena => {
  const avisos = []

  if (!LUZ.test(escena)) avisos.push('no declara la FUENTE DE LUZ ni su calidad (sol duro, contraluz, una sola lámpara…)')
  if (!MOMENTO.test(escena)) avisos.push('no declara un MOMENTO (algo ocurriendo), y sin momento salen poses de foto de stock')
  
return avisos
}

// `ignore their clothing` NO alcanza [medido 2026-09-20]: las referencias de Nexa la muestran con
// blazer navy y el modelo lo copió en las dos piezas, pese a la instrucción explícita del canon §3.7.
// Choca con dos reglas duras a la vez — «azul nunca intermedio en ropa grande» y «la colorimetría no
// es vestir de navy» — y de paso empuja la escena al arquetipo consultora. Con identidad, el
// vestuario se declara en la escena o lo decide la referencia por nosotros.
const VESTUARIO =
  /\b(wear|wearing|dressed|shirt|t-?shirt|sweater|jumper|hoodie|polo|blouse|apron|overall|coverall|jacket|vest|linen|denim|cotton|knit|sleeves?)\b/i

export const auditarVestuario = (escena, identidad) =>
  identidad?.length && !VESTUARIO.test(escena)
    ? 'no declara el VESTUARIO y hay identidad: el modelo copia la ropa de las referencias aunque el prompt diga "ignore their clothing"'
    : null

export const construirPrompt = ficha => {
  const fmt = FORMATOS[ficha.formato]

  if (!fmt) throw new Error(`Formato "${ficha.formato}" desconocido. Usa uno de: ${Object.keys(FORMATOS).join(', ')}.`)
  if (!ficha.escena) throw new Error('La ficha necesita `escena`: el modelo no inventa la escena por vos.')

  const ancla = ANCLAS_PROHIBIDAS.find(a => a.patron.test(ficha.escena))

  if (ancla) {
    throw new Error(
      `La escena de "${ficha.id ?? 'esta ficha'}" usa un ancla prohibida: ${ancla.porque}. ` +
        `Cambia la materia de la escena; esto no se corrige regenerando.`
    )
  }

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

  // Orden canónico: realismo → impacto → IDENTITY → REFERENCES → SCENE → FOREGROUND.
  const identidad = resolverIdentidad(ficha)

  if (identidad) {
    partes.push(identidad.identity)
    partes.push(identidad.references)
  }

  partes.push(ficha.escena)

  // El lecho, con el porcentaje del formato. Nunca escrito a mano.
  partes.push(
    `FOREGROUND (planned): ${ficha.lecho.objeto}, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom ${fmt.lecho} of the frame (never a hard band), ${ficha.lecho.tono}; its center calm and even.`
  )

  return {
    prompt: partes.join('\n\n'),
    size: fmt.size,
    sinValidar: Boolean(fmt.sinValidar),
    imagenes: identidad?.imagenes ?? []
  }
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

  // ── Tope de tanda sin piloto ───────────────────────────────────────────────────────────────────
  // La calidad no vino nunca de un prompt mejor: vino de generar poco y MIRAR cada plate. Con 34 de
  // una sola vez nadie mira ninguna —se mira una hoja de contacto, que es donde una cara de stock o
  // un fondo plano pasan desapercibidos—. El canon ya decía «piloto antes de la tanda» y se saltó,
  // costando 34 planchas sin dirección fotográfica. Acá deja de ser un consejo. [2026-09-20]
  const TOPE_SIN_PILOTO = 6

  if (fichas.length > TOPE_SIN_PILOTO) {
    const sinPiloto = resueltas
      .map(r => r.ficha)
      .filter(f => !f.piloto || !existsSync(path.resolve(path.dirname(fichaPath), f.piloto)))

    if (sinPiloto.length) {
      throw new Error(
        `Tanda de ${fichas.length} fichas (tope sin piloto: ${TOPE_SIN_PILOTO}) y ${sinPiloto.length} no declaran un piloto ya generado: ` +
          `${sinPiloto.map(f => f.id ?? '<sin id>').join(', ')}.\n` +
          `Cada ficha necesita \`piloto: "<ruta a un plate de esa misma ficha>"\` que exista en disco.\n` +
          `Por qué: la calidad sale de mirar cada plate, y con más de ${TOPE_SIN_PILOTO} nadie mira ninguna. ` +
          `Genera primero unas pocas, míralas, y recién entonces la tanda.`
      )
    }
  }

  // Aviso de escena (no bloquea): luz, momento y azul como tema.
  for (const { ficha } of resueltas) {
    const avisos = auditarEscena(ficha.escena)
    const vestuario = auditarVestuario(ficha.escena, ficha.identidad)

    if (vestuario) avisos.push(vestuario)

    for (const a of avisos) console.error(`  ⚠ ${ficha.id ?? 'ficha'}: la escena ${a}`)
  }

  // `pnpm ai:image --batch` NO transporta `--image`: un batch con identidad genera caras inventadas,
  // se ve plausible en la hoja de contacto y se paga igual. Abortar es la única salida honesta.
  const conIdentidad = resueltas.filter(r => r.imagenes.length)

  if (i >= 0 && conIdentidad.length) {
    throw new Error(
      `Estas fichas declaran identidad y NO pueden ir en un --batch: ${conIdentidad.map(r => r.ficha.id ?? '<sin id>').join(', ')}.\n` +
        '`pnpm ai:image --batch` no transporta `--image`, así que el modelo generaría una cara inventada ' +
        'con el prompt de identidad adentro: plausible en la hoja de contacto y facturado igual.\n' +
        'Emití cada una sin --batch y usá el comando que imprime este mismo comando.'
    )
  }

  if (i >= 0) {
    const out = args[i + 1]
    const batch = resueltas.map(r => ({ filename: `${r.ficha.id}-plate.png`, prompt: r.prompt }))

    writeFileSync(out, JSON.stringify(batch, null, 1))
    console.log(`${batch.length} prompt(s) → ${out}`)
    console.log(`\nAhora:\n  pnpm ai:image --batch ${out} --out <dir> --model gpt-image-2.5-flare --quality high --size ${size}`)
  } else {
    for (const r of resueltas) {
      console.log(`${r.prompt}\n\n─── size: ${r.size} ───\n`)

      // Con identidad el motor es Sunburst y las referencias van en orden: el comando sale armado
      // para que nadie lo reconstruya de memoria ni olvide una referencia.
      if (r.imagenes.length) {
        const imgs = r.imagenes.map(ref => `--image ${ref}`).join(' ')

        console.log(
          `  pnpm ai:image --model gpt-image-2.5-sunburst --quality high --size ${r.size} \\\n` +
            `    ${imgs} \\\n    --prompt-file <ruta al prompt> --out <dir>/${r.ficha.id ?? 'plate'}-plate.png\n`
        )
      }
    }
  }

  // Las piezas que el operador aprobó son el estándar, y hoy ninguna sesión las tiene delante al
  // armar. Recordarlas cuesta dos líneas y evita reconstruir de memoria lo que ya existe medido.
  console.log(
    '\n  Antes de gastar, mirá el estándar aprobado:\n' +
      '    ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/  (la ronda que el operador aprobó)\n' +
      '    ai-generations/2026-09-20_piloto-reservas/rondas/p1/                  (piloto de las reservas nuevas)'
  )

  if (resueltas.some(r => r.sinValidar)) {
    console.log('⚠ El formato 1:1 no tiene ronda validada: sus números son criterio, no medición.')
  }
}
