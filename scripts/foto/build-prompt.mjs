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
import { createHash } from 'node:crypto'
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
export const PERSONAS = {
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

// ── Objetos de marca con kit 3D propio ──────────────────────────────────────────────────────────
// Mismo problema que la identidad: describir un logo o una prenda con palabras hace que el modelo lo
// dibuje de memoria, y un logo dibujado de memoria sale deformado. El kit aprobado entra como
// REFERENCIA DE FORMA y el prompt aporta la intención. Agregar un kit nuevo es una entrada acá, no
// un cambio de lógica: base + patrón + vistas.
export const OBJETOS = {
  'sprocket-hubspot': {
    etiqueta: 'the official 3D sculpture of the HubSpot sprocket symbol',
    // El LEEME del kit es explícito y el aviso viaja con el objeto, no en la memoria de quien lo use.
    aviso:
      'marca registrada de un tercero: uso INTERNO hasta aprobación escrita de HubSpot (formulario con boceto, 7–10 días hábiles). No publicar ni pautar con esta pieza.',
    instruccion:
      'Reproduce EXACTLY this object — same silhouette and same proportions: a ring at the lower right, a short bar going up from it, a long bar at the upper left ending in the larger node, and a short bar at the lower left ending in the smaller node. Solid extrusion of uniform thickness (about a quarter of the ring width), minimal bevel, matte enamel finish in its exact orange with no colour variation. Do NOT add teeth, gears, text or extra parts, do NOT re-proportion it, and do NOT rotate it into an unreadable angle.',
    base: 'ai-generations/2026-09-17_sprocket-3d/final/',
    patron: 'efeonce-sprocket-hubspot-3d-<V>-1x1-1600x1600-v01-transparente.png',
    vistas: {
      frente: '01-frente-heroe',
      'tres-cuartos-izq': '02-tres-cuartos-izquierda',
      lateral: '03-lateral-pronunciado',
      contrapicado: '04-contrapicado-monumental',
      cenital: '05-cenital-plano',
      flotando: '06-flotando',
      rodando: '07-rodando-sobre-canto',
      'tres-cuartos-trasero': '08-tres-cuartos-trasero'
    },
    vistaDefecto: 'tres-cuartos-izq'
  },
  'nave-efeonce': {
    etiqueta: 'the official white 3D model of the Efeonce ship emblem',
    instruccion:
      'Reproduce EXACTLY this object — same silhouette, the ring/orbit with its cuts, the three small windows, same proportions. Do not redraw, simplify or add parts.',
    base: 'ai-generations/2026-09-17_efeonce-ship-3d/final/',
    patron: 'efeonce-nave-3d-blanco-<V>-1x1-1600x1600-v01-transparente.png',
    vistas: { frente: '01-frente-heroe', 'tres-cuartos-izq': '02-tres-cuartos-izquierda', perfil: '03-perfil' },
    vistaDefecto: 'tres-cuartos-izq'
  },
  clawd: {
    etiqueta: 'the official 3D figure of Clawd, the Claude mascot',
    instruccion:
      'Reproduce EXACTLY this figure as a real, physical, finely made small collectible figure about 25 cm tall, at correct scale with contact shadows. Do not redraw it, do not restyle it and do not change its proportions.',
    base: 'ai-generations/2026-09-17_clawd-poses-3d/final/',
    patron: 'efeonce-clawd-3d-<V>-1x1-1600x1600-v01-transparente.png',
    vistas: { frente: '01-frente-heroe', saludo: '02-saludo-tres-cuartos-izquierda', perfil: '03-perfil-caminando' },
    vistaDefecto: 'frente'
  },
  codex: {
    etiqueta: 'the official 3D figure of Codex, the OpenAI mascot',
    instruccion:
      'Reproduce EXACTLY this figure as a real, physical, finely made small collectible figure about 25 cm tall, at correct scale with contact shadows. Do not redraw it, do not restyle it and do not change its proportions.',
    base: 'ai-generations/2026-09-17_codex-poses-3d/final/',
    patron: 'efeonce-codex-3d-<V>-1x1-1600x1600-v01-transparente.png',
    vistas: { frente: '01-frente-heroe', saludo: '02-saludo-tres-cuartos-izquierda', perfil: '03-perfil-caminando' },
    vistaDefecto: 'frente'
  },
  'chaqueta-softshell-efeonce': {
    etiqueta: 'the Efeonce team softshell jacket',
    tipo: 'prenda',
    instruccion:
      'THIS GARMENT IS ALREADY FINISHED and already carries its embroidered Efeonce mark: copy it AS IT IS — ' +
      'same navy colour, cut, collar, zip and pockets, and the mark exactly where and as it appears here. Do NOT redraw, restyle or reinterpret ' +
      'the mark: it is not yours to design, only to copy. Do not copy its studio background.',
    base: 'ai-generations/2026-09-17_chaqueta-efeonce/final/',
    patron: 'efeonce-chaqueta-softshell-<V>-1600x1600-v01-transparente.png',
    vistas: {
      frente: '01-frente',
      espalda: '02-espalda',
      'tres-cuartos-izq': '03-tres-cuartos-izquierda',
      'tres-cuartos-der': '04-tres-cuartos-derecha',
      lateral: '05-lateral',
      abierta: '06-cierre-abierto'
    },
    vistaDefecto: 'frente',
    macroEmblema: 'efeonce-chaqueta-softshell-11-macro-bordado-1600x1600-v01-fondo-estudio.png',
    tipoEmblema: 'isotipo',
  },
  'chaqueta-bomber-efeonce': {
    etiqueta: 'the Efeonce team bomber jacket',
    tipo: 'prenda',
    instruccion:
      'THIS GARMENT IS ALREADY FINISHED and already carries its embroidered Efeonce mark: copy it AS IT IS — ' +
      'same colour, cut, ribbed collar and cuffs, and the mark exactly where and as it appears here. Do NOT redraw, restyle or ' +
      'reinterpret the mark: it is not yours to design, only to copy. Do not copy its studio background.',
    base: 'ai-generations/2026-09-17_chaqueta-efeonce/final/',
    patron: 'efeonce-chaqueta-bomber-<V>-1600x1600-v01-transparente.png',
    vistas: { frente: '01-frente', espalda: '02-espalda', 'tres-cuartos-izq': '03-tres-cuartos-izquierda' },
    vistaDefecto: 'frente',
    macroEmblema: 'efeonce-chaqueta-bomber-11-macro-bordado-1600x1600-v01-fondo-estudio.png',
    tipoEmblema: 'isotipo',
  },
  'gorra-efeonce': {
    etiqueta: 'the Efeonce cap',
    tipo: 'prenda',
    instruccion:
      'THIS GARMENT IS ALREADY FINISHED and already carries its embroidered Efeonce mark: copy it AS IT IS — ' +
      'same colour, crown shape and brim, and the mark exactly where and as it appears here. Do NOT redraw, restyle or reinterpret ' +
      'the mark: it is not yours to design, only to copy. Do not copy its studio background.',
    base: 'ai-generations/2026-09-17_gorra-efeonce/final/',
    patron: 'efeonce-gorra-<V>-1600x1600-v01-transparente.png',
    // La gorra tiene variantes de diseño además de ángulos: v2 es la canónica.
    vistas: {
      frente: 'v2-01-frente',
      lateral: 'v2-02-lateral',
      trasera: 'v2-03-trasera',
      cenital: 'v2-05-cenital',
      'navy-logotipo': 'v2-navy-logotipo',
      'navy-isotipo': 'v3-navy-isotipo',
      'trucker-navy': 'v5-trucker-navy'
    },
    vistaDefecto: 'frente',
    // La gorra existe en dos marcas distintas: el logotipo completo y el isotipo solo. El tipo va por
    // VISTA, no por kit — declararlo arriba hacía que pedir la v3 heredara la descripción del logotipo
    // y el modelo terminara construyendo una marca a mitad de camino (2026-09-20).
    tipoPorVista: {
      frente: 'logotipo',
      lateral: 'logotipo',
      trasera: 'sin-marca',
      cenital: 'sin-marca',
      'navy-logotipo': 'logotipo',
      'navy-isotipo': 'isotipo',
      'trucker-navy': 'isotipo'
    },
  },
  'lanyard-efeonce': {
    etiqueta: 'the Efeonce lanyard with its retractable reel and rigid-frame badge holder',
    tipo: 'merch',
    instruccion:
      'Reproduce EXACTLY this piece: same ribbon artwork and colour, same reel, and the RIGID-FRAME badge holder that grips the card by its edges and leaves the card face exposed — it is not a vinyl sleeve or a soft pouch. Do not restyle it and do not change its proportions.',
    // El carnet NO se le pide al modelo: se compone con el generador del kit.
    nota:
      'el carnet se genera determinísticamente con `node ai-generations/2026-09-17_lanyard-efeonce/arte-carnet.mjs <foto.png> "<Nombre>" "<Cargo>" <salida.png>` y se compone después; al modelo nunca se le pide escribir el nombre ni el cargo',
    base: 'ai-generations/2026-09-17_lanyard-efeonce/final/',
    patron: 'efeonce-lanyard-<V>-1200x1600-v01-transparente.png',
    vistas: { conjunto: '01-conjunto', colgado: '12-conjunto-colgado', 'portacarnet-vacio': '10-portacarnet-vacio' },
    vistaDefecto: 'colgado'
  },
  'polo-efeonce': {
    etiqueta: 'the Efeonce team polo',
    tipo: 'prenda',
    instruccion:
      'THIS GARMENT IS ALREADY FINISHED and already carries its embroidered Efeonce mark: copy the garment AS IT IS — ' +
      'same colour, collar, fabric, and the mark exactly where and as it appears here. Do NOT redraw, restyle or ' +
      'reinterpret the mark: it is not yours to design, only to copy. Do not copy its studio background.',
    base: 'ai-generations/2026-09-17_polo-efeonce/final/',
    patron: 'efeonce-polo-blanco-<V>-1600x1600-v01-transparente.png',
    vistas: { frente: '01-frente', espalda: '02-espalda', 'tres-cuartos-izq': '03-tres-cuartos-izquierda' },
    vistaDefecto: 'frente',
    macroEmblema: 'efeonce-polo-blanco-10-detalle-bordado-1600x1600-v01-fondo-estudio.png',
    tipoEmblema: 'isotipo',
  },
  'hoodie-efeonce': {
    etiqueta: 'the Efeonce team hoodie',
    tipo: 'prenda',
    instruccion:
      'THIS GARMENT IS ALREADY FINISHED and already carries its embroidered Efeonce mark: copy it AS IT IS — ' +
      'same colour, cut, fabric, and the mark exactly where and as it appears here. Do NOT redraw, restyle or ' +
      'reinterpret the mark: it is not yours to design, only to copy. Do not copy its studio background.',
    base: 'ai-generations/2026-09-17_hoodie-efeonce/final/',
    patron: 'efeonce-hoodie-<V>-1600x1600-v01-transparente.png',
    vistas: { frente: '01-frente', espalda: '02-espalda', 'tres-cuartos-izq': '03-tres-cuartos-izquierda' },
    vistaDefecto: 'frente',
    macroEmblema: 'efeonce-hoodie-09-detalle-pecho-1600x1600-v01-fondo-estudio.png',
    tipoEmblema: 'isotipo',
  }
}

// La vista se elige por el ÁNGULO DE LA TOMA, no por costumbre: de espaldas → vista de espalda.
// La marca NO es la misma en todas las prendas, y describirla igual fue el error del 2026-09-20: el
// polo y las chaquetas llevan el ISOTIPO (la nave sola); la GORRA lleva el LOGOTIPO COMPLETO —«efeonce»
// con la nave en el lugar de la «o»—. El bloque genérico decía «do NOT substitute it with letters» y le
// prohibía al modelo exactamente lo que la gorra lleva.
// Geometría VERBATIM de `garment-reference-kit.md` §«El emblema bordado también lleva su propia
// referencia»: la imagen sola no basta y el emblema se espeja con facilidad — 6 de 21 vistas del polo
// volvieron con la nave apuntando al lado contrario. Reconstruirla de memoria fue el error del
// 2026-09-20; esta descripción ya estaba escrita y medida.
const ISOTIPO =
  'the rocket points to the RIGHT with its rounded nose on the right and its two fins low on the left, the orbit ' +
  'is a wide ellipse with breaks where it passes behind the rocket, the planet dot sits above, and there are THREE ' +
  'round windows along the body. It carries NO letters and NO words.'

const LOGOTIPO =
  'the full Efeonce wordmark: the letters e-f-e-o-n-c-e in a rounded sans, where the "o" is REPLACED by the ' +
  'rocket-and-orbit mark — the rocket sits inside the elliptical orbit, in the position the letter "o" would ' +
  'occupy, with the filled dot above it. The letters and the mark are ONE single lockup.'

const formaDeLaMarca = tipo => (tipo === 'logotipo' ? LOGOTIPO : ISOTIPO)

function resolverObjetos(ficha, desde) {
  const pedidos = ficha.objetos ?? []

  if (!Array.isArray(pedidos)) throw new Error('`objetos` debe ser una lista, por ejemplo ["sprocket-hubspot"].')
  if (!pedidos.length) return null

  const imagenes = []
  const bloques = []
  const avisos = []

  for (const pedido of pedidos) {
    const clave = typeof pedido === 'string' ? pedido : pedido?.objeto
    const objeto = OBJETOS[clave]

    if (!objeto) {
      throw new Error(`Objeto "${clave}" desconocido. Kits disponibles: ${Object.keys(OBJETOS).join(', ')}.`)
    }

    const vista = (typeof pedido === 'string' ? null : pedido?.vista) ?? objeto.vistaDefecto
    const sufijo = objeto.vistas[vista]

    if (!sufijo) {
      throw new Error(
        `La vista "${vista}" no existe para "${clave}". Vistas del kit: ${Object.keys(objeto.vistas).join(', ')}.`
      )
    }

    const ref = objeto.base + objeto.patron.replace('<V>', sufijo)

    if (!existsSync(path.join(raiz, ref))) {
      throw new Error(
        `El kit de "${clave}" no tiene la vista "${vista}" en disco: ${ref}. ` +
          'Sin el render, el modelo dibuja la marca de memoria y sale deformada.'
      )
    }

    const n = desde + imagenes.length + 1

    imagenes.push(ref)

    // Cómo se pide un bordado y por qué no se redimensiona: ambas de `garment-reference-kit.md`
    // (§«Cómo se pide un bordado» y §4 «Proporciones declaradas», corrección expresa del operador).
    const tipoDeMarca = objeto.tipoPorVista?.[vista] ?? objeto.tipoEmblema

    const queMarca = tipoDeMarca && tipoDeMarca !== 'sin-marca'
      ? ` The mark it carries is ${formaDeLaMarca(tipoDeMarca)} Render it as satin-stitch embroidery with visible ` +
        'stitch direction, slightly raised over the knit — never flat ink. Do not resize or move it: it keeps ' +
        'exactly the size and position it has in the reference.'
      : ''

    bloques.push(`IMAGE ${n} (object reference): Image ${n} is ${objeto.etiqueta}. ${objeto.instruccion}${queMarca} Ignore its studio background.`)

    // El MACRO DEL BORDADO va como referencia aparte. En la vista de la prenda entera el emblema
    // mide unos pocos píxeles: el modelo lo lee como una mancha y la reinventa. Medido el
    // 2026-09-20: tres prendas dieron tres emblemas distintos y ninguno era el de Efeonce. Los kits
    // YA traían su macro; lo que faltaba era exponerlo. No se compone encima —probado y rechazado
    // por el operador: se ve impreso, no bordado—: se le da al modelo el emblema en grande.
    if (objeto.macroEmblema) {
      const macro = objeto.base + objeto.macroEmblema

      if (!existsSync(path.join(raiz, macro))) {
        throw new Error(
          `El kit de "${clave}" declara macro del bordado pero no está en disco: ${macro}. ` +
            'Sin el emblema en grande, el modelo lo inventa.'
        )
      }

      const nm = desde + imagenes.length + 1

      imagenes.push(macro)
      bloques.push(
        `IMAGE ${nm} (detail reference): Image ${nm} shows, in macro, the mark THAT IS ALREADY ON that garment — ${formaDeLaMarca(objeto.tipoPorVista?.[vista] ?? objeto.tipoEmblema)} ` +
          `It is here only so the small mark in the previous image is not lost or reinterpreted at its real scale. ` +
          'Keep its proportions, its thread colour and its embroidered relief exactly as in the macro. Do NOT invent, ' +
          'simplify, redraw or substitute it with a spiral, an @ or any other shape, and do NOT change which of the ' +
          'two forms it is. It sits at the scale it has in the real garment. Ignore its studio background.'
      )
    }

    if (objeto.aviso) avisos.push(`"${clave}" es ${objeto.aviso}`)
    if (objeto.nota) avisos.push(`"${clave}": ${objeto.nota}`)
  }

  return { imagenes, bloque: bloques.join('\n\n'), avisos }
}

// ── Atmósfera y acción suspendida ───────────────────────────────────────────────────────────────
// Las dos palancas que el bloque de impacto NO tenía y que el operador aprobó el 2026-09-20: son lo
// que separa una foto correcta de una que parece un fotograma. Van por ficha y NO en el bloque fijo,
// porque el bloque se emite en todos los prompts y la dosis se perdería: si en cada pieza vuela algo,
// deja de ser un momento y pasa a ser un truco reconocible.
//
// ATMÓSFERA = aire con materia. Su función es hacer VISIBLE la luz: sin un haz con dirección no tiene
// dónde vivir y se lee pegada. Por eso exige que la escena declare la fuente.
const ATMOSFERAS = {
  polvo:
    'ATMOSPHERE: the air inside the beam is alive with fine floating dust motes drifting slowly, so the shaft of light itself becomes visible; the dust exists ONLY inside the light, never as dirt on surfaces.',
  bruma:
    'ATMOSPHERE: a low even haze hangs in the air of the space, so the shafts of light stand as solid visible columns and distance reads in layers; the haze is clean and thin, never fog, never smog.',
  vapor:
    'ATMOSPHERE: a faint wisp of warm steam rises through the light and catches it, soft and short-lived, never a cloud that hides the subject.',
  humo:
    'ATMOSPHERE: a low veil of atmospheric haze catches the backlight so the beam is visible and the figures are rimmed with light; it is clean stage haze, never smoke from burning, never dirty air.'
}

// ACCIÓN SUSPENDIDA = congelar lo que está en vuelo. La dosis la fijó el operador: 1 de cada 4 piezas.
const DOSIS_SUSPENDIDO = 4

// ACENTO cálido (naranja/lima): puntuación, no estructura. Dosis nacida de la auditoría ciega del
// 2026-09-20, donde el acento aparecía en 9 de cada 12 piezas y se leyó como un tic de producción.
const DOSIS_ACENTO = 2

function bloqueAtmosfera(ficha) {
  const pedida = ficha.atmosfera

  if (!pedida) return null

  const texto = ATMOSFERAS[pedida]

  if (!texto) {
    throw new Error(`Atmósfera "${pedida}" desconocida. Tipos: ${Object.keys(ATMOSFERAS).join(', ')}.`)
  }

  // Sin haz declarado, la atmósfera no tiene qué revelar: el modelo la pinta encima y se ve puesta.
  if (!LUZ.test(ficha.escena ?? '')) {
    throw new Error(
      `La ficha pide atmósfera "${pedida}" pero su escena no declara una FUENTE DE LUZ con dirección. ` +
        'La atmósfera existe para hacer visible un haz: sin haz se lee pegada. Declara la luz o saca la atmósfera.'
    )
  }

  return texto
}

function bloqueSuspendido(ficha) {
  const que = ficha.suspendido

  if (!que) return null

  if (typeof que !== 'string' || que.trim().length < 8) {
    throw new Error(
      '`suspendido` debe decir QUÉ está en el aire, por ejemplo "the coffee beans tipped from the scoop". ' +
        'Un valor vacío o genérico deja que el modelo elija, y elige confeti.'
    )
  }

  return `SUSPENDED ACTION: ${que} is FROZEN IN MID-AIR at the peak of its arc — every piece sharp and clearly in flight, caught at a frozen shutter speed, with its real weight and trajectory. It is a single decisive instant, not a decorative scatter and never confetti.`
}

// ── Palancas de encuadre y punto de vista ───────────────────────────────────────────────────────
// Probadas el 2026-09-20 en `ai-generations/2026-09-20_palancas-nuevas/`. Se piden UNA por pieza:
// medido en B6, combinar dos las diluye — cada palanca pide el control de la escena y el resultado
// tiene un poco de cada una y lo mejor de ninguna.
//
// Todas se escriben con MARCADORES VERIFICABLES, no con nombres de estilo: al modelo «tres cuartos»
// o «punto de vista subjetivo» no le dicen nada, «la oreja lejana no se ve» sí.
// Las 20 TOMAS del catálogo de cámara NO son palancas: una toma dice CON QUÉ se fotografía (lente, altura,
// distancia) y una palanca QUÉ HACE la foto. Se combinan —`fragmento` sobre un retrato de 85 mm— y se escriben
// en la escena, no en un campo. Están acá sólo para que pedir una en `palanca` dé un error que lo explique:
// el operador pidió «ojo de pez» como palanca el 2026-09-20 y la lista de quince nombres no se lo aclaraba.
const TOMAS_DE_CAMARA = new Set([
  'ojo-de-pez',
  'ojo-de-pez-fuerte',
  'ojo-de-pez-grupo',
  'dron-cenital',
  'tilt-shift',
  'contrapicado',
  'reflejo-en-vidrio',
  'tele-200',
  'macro',
  'retrato',
  'marco-en-marco',
  'escala',
  'barrido',
  'noche',
  'asiento-en-la-mesa',
  'por-encima-del-respaldo',
  'mesa-larga',
  'por-encima-del-hombro',
  'picado-60',
  'respaldo-del-espectador'
])

export const PALANCAS = {
  pov: {
    etiqueta: 'punto de vista subjetivo',
    // El Why de Efeonce hecho encuadre: la cámara ocupa el lugar de la persona con la que se trabaja.
    bloque:
      'POINT OF VIEW (this is the frame, not a detail): the photograph is taken FROM THE PLACE OF THE PERSON BEING TALKED TO — the empty seat at the table, the visitor\'s chair, the side of the desk where the client sits. The camera is at SEATED EYE LEVEL, the subjects are on the far side facing it, and they address that place: they look at the work between them or slightly past the lens at the person sitting there, never into the lens itself. The nearest part of the viewer\'s own seat is visible at the bottom of the frame.',
    requiere: null
  },
  manos: {
    etiqueta: 'manos como sujeto',
    // Resuelve piezas sin depender de identidad y mata el casting de modelo.
    bloque:
      'HANDS AS SUBJECT (no faces at all): the frame is filled by HANDS working on the craft — only hands and forearms enter the frame. NO faces, NO heads, NO bodies, not even out of focus in the background. The hands are real and unretouched: visible skin texture and pores, short clean nails, fine creases across the knuckles, a worn ring if any. They are doing something specific and mid-action, not posing.',
    requiere: null
  },
  'luz-motivada': {
    etiqueta: 'luz motivada por una fuente en cuadro',
    // La diferencia entre luz real y un grade —que el operador rechazó— es que la fuente se ve.
    bloque:
      'MOTIVATED LIGHT — verify it by these landmarks: the light on the subject comes from a SOURCE THAT IS VISIBLE IN THE FRAME — a monitor, a screen, a practical lamp, a window — and that source is what lights them. The fall-off is visible: the side of the face nearest the source is lit and the far side drops into darkness, with the direction reading unmistakably from the source. Colour comes from the real source, never from a colour filter or a grade over the whole image.',
    requiere: null
  },
  'larga-exposicion': {
    etiqueta: 'larga exposición',
    bloque:
      'LONG EXPOSURE on a tripod: moving people and moving lights dissolve into soft translucent streaks and continuous light trails across the frame, while ONE chosen element stays perfectly sharp and still, anchoring the picture. The motion reads as accumulated time, not as camera shake, and nobody in motion is recognisable.',
    // Una larga exposición NO tiene momento decisivo: su tensión es duración acumulada. Pedirle
    // ambas cosas es contradictorio, así que esta palanca desactiva ese aviso [medido en B4].
    sinMomento: true,
    requiere: null
  },
  instrumento: {
    etiqueta: 'a través del instrumento del oficio',
    // La que mejor pasa el test de sustitución: sólo la toma quien usa esa herramienta.
    bloque:
      'THROUGH THE INSTRUMENT: the photograph is taken LOOKING THROUGH <QUE> — the glass of the instrument fills the centre of the frame and what is seen inside it is razor sharp and magnified or distorted, while everything outside its barrel falls away into soft blur. The barrel itself is real, with a visible edge and a thin reflection. This is REAL optical distortion through a real piece of glass — not a digital effect, not a vignette, not a circular crop.',
    requiere: 'instrumento'
  },
  cenital: {
    etiqueta: 'cenital de oficio en curso',
    bloque:
      'OVERHEAD, PERPENDICULAR: the camera looks STRAIGHT DOWN from about two metres, exactly perpendicular, so the work surface becomes a flat graphic plane with no perspective on its edges. What is on it is caught MID-PROCESS, not tidily arranged. HANDS enter from different edges of the frame — reaching in, holding down, pulling out — and no faces, heads or bodies appear at all.',
    requiere: null
  },
  silueta: {
    etiqueta: 'contraluz y silueta',
    // La otra vía a piezas sin identidad: el gesto carga todo el sentido.
    bloque:
      'BACKLIT SILHOUETTE: the camera faces straight into the light source and the subject is between it and the lens. Verify it by these landmarks: the figure reads as a NEARLY BLACK SILHOUETTE with NO facial features visible at all — no eyes, no mouth, only the outline; the edges of shoulders, hair and limbs are rimmed by a bright line of light; the background behind is blown to clean white. The gesture alone carries the meaning, so the pose must be legible as a shape.',
    requiere: null
  },
  reflejo: {
    etiqueta: 'reflejo como capa',
    // Dos realidades en un cuadro: es «construimos contigo» dicho en imagen.
    bloque:
      'REFLECTION AS A LAYER: the photograph is taken through glass so TWO REALITIES OVERLAP in one frame. Verify it by these landmarks: what is beyond the glass is sharp and clearly readable; and ACROSS THE SAME GLASS the reflection of what is behind the camera is superimposed over it, both visible AT THE SAME TIME, neither hiding the other. The light behind the camera is strong enough to make the reflection hold.',
    requiere: null
  },
  ausencia: {
    etiqueta: 'presencia por ausencia',
    bloque:
      'NOBODY IN FRAME: there is not a single person, hand or body anywhere in the picture — verify it. What remains is the TRACE of the work that just happened: a chair pushed back at an angle, things left where they were set down, a cap off a marker, one lamp still on. The room must read as if the people stepped out a minute ago, not as a tidy empty room.',
    // No hay acción porque el punto es que nadie está: pedirle momento es contradictorio.
    sinMomento: true,
    // El bloque de arriba YA pedía la huella —silla empujada en ángulo, cosas donde se dejaron, una
    // lámpara encendida— desde `0012e6c4b`, el mismo commit que produjo el plate que la auditoría
    // ciega reprobó. No faltaban marcadores: faltaba impedir que la ESCENA los contradiga. Medido en
    // `ai-generations/2026-09-20_palancas-con-color/fichas/F4-ausencia.json`, cuya escena decía dos
    // veces «the empty chair» contra el «chair pushed back at an angle» del bloque. Cuando las dos
    // instrucciones se pelean gana la escena, por más específica, y salió exactamente la sala
    // ordenada y vacía que el contrato prohíbe: los dos evaluadores ciegos la llamaron la peor de las
    // doce, «foto de inmobiliaria», «no hay oficio, no hay persona, no hay decisión: hay mobiliario».
    // Primera versión de este patrón: «la escena nombra el mueble vacío». Probada contra las dos
    // fichas reales de `ausencia`, dio un FALSO POSITIVO en `C4`, que también dice «the empty chair»
    // y sin embargo salió bien. Nombrar el vacío no es el defecto: las dos lo nombran. La diferencia
    // medida es la SILLA — `C4` dice «a chair pushed back at an angle from the table» y `F4` sólo
    // «the empty chair», dos veces, y es además donde pone el foco. La silla es el sujeto de esta
    // palanca; si se la nombra sin su huella, la palanca ya se anuló.
    contradice: [
      {
        patron: /\b(the |an? )?(empty|unoccupied|vacant|deserted|abandoned)\s+(chair|seat|desk|workstation)\b/i,
        salvo: /\bchair\b[^.]*\b(pushed back|pulled out|shoved|swivell?ed|turned (away|aside)|at an angle|askew|half.?turned)\b|\b(pushed back|pulled out|swivell?ed|turned)\b[^.]*\bchair\b/i,
        porque:
          'la escena nombra la silla VACÍA y en ningún momento la deja EMPUJADA, corrida o girada. El bloque ' +
          'pide la huella del trabajo —la silla empujada en ángulo, las cosas donde se dejaron, el marcador ' +
          'destapado, una lámpara encendida— y una silla simplemente vacía dice lo contrario: sala ordenada. ' +
          'Medido: es la diferencia exacta entre la ficha que funcionó y la que dos evaluadores ciegos ' +
          'llamaron la peor de las doce, «foto de inmobiliaria»'
      }
    ],
    requiere: null
  },
  fragmento: {
    etiqueta: 'fragmento radical',
    // «Radical» no significa nada para el modelo: hay que decirle POR DÓNDE corta el borde.
    bloque:
      'EXTREME CROP — verify it by the cut, not by feeling: <QUE>. The face or object fills the entire frame at this crop: no shoulders, no body, no room around it, at most a sliver of light at one edge. The frame must read as if the photographer was too close for the subject to fit.',
    requiere: 'corta'
  },
  'suelo-oblicuo': {
    etiqueta: 'cámara en el suelo, oblicua',
    bloque:
      'CAMERA ON THE GROUND, TILTED: the camera body actually RESTS ON THE FLOOR, tilted up about 30 degrees AND rotated so the horizon runs DIAGONALLY across the frame. Verify it by these landmarks: the floor fills the entire bottom third, out of focus and enormous, with its grain and grit right at the lens; legs and objects rise like columns out of it; the ceiling converges steeply overhead; and every vertical in the room leans because of the tilt.',
    requiere: null
  },
  'little-planet': {
    etiqueta: 'little planet (proyección estereográfica)',
    bloque:
      'LITTLE PLANET stereographic projection of a full 360-degree panorama — verify it by these landmarks: the ground curves into a COMPLETE SPHERE at the centre of the frame, so the whole place wraps around a round floor that reads like a small planet; walls and objects radiate OUTWARD from that sphere like spokes, leaning away in every direction; the sky fills all four corners; and the horizon is a CLOSED CIRCLE with no beginning or end. This is a real stereographic reprojection of a spherical panorama — NOT a fisheye rectangle and NOT a circular crop.',
    requiere: null
  },
  sombra: {
    etiqueta: 'la sombra es el sujeto',
    bloque:
      'THE SHADOW IS THE SUBJECT, not the person casting it — verify it: a hard low light throws a LONG, SHARP, GRAPHIC shadow that occupies the centre and most of the frame, and it is the clearest, most detailed shape in the image: the tool, the arms and the stance can be read in it. Of the person themselves only a fragment enters at the very edge of the picture — feet, or nothing at all.',
    requiere: null
  },
  'dentro-del-objeto': {
    etiqueta: 'desde dentro del objeto',
    bloque:
      'THE CAMERA IS INSIDE <QUE>, LOOKING OUT — verify it by these landmarks: its inner walls frame the picture on all four sides, dark and slightly out of focus, forming a rectangular window. Through that opening the lit scene is seen from an unusual low or enclosed angle, and someone reaches TOWARDS the lens. The inside is dark and the world beyond is bright, so the opening reads as a bright rectangle inside blackness.',
    requiere: 'objetoContenedor'
  },
  oclusion: {
    etiqueta: 'oclusión',
    // Medido en B5: pedida «a medias» se lee como «hay algo delante» y no como punto de vista.
    // Por eso exige declarar QUÉ tapa y obliga a que tape de verdad.
    bloque:
      'OCCLUSION — verify it by what it covers (the camera watched from where it stood and moved nothing): <QUE> sits in the near ground and PARTIALLY COVERS the subject — it must cover a real part of them, roughly a third of the frame and clearly overlapping their body or face edge, not merely sit beside them. It is closer to the lens than the subject and falls out of focus. The effect is of having watched past something, not of an object placed in the corner.',
    requiere: 'ocluye'
  },

  // ── Ronda podcast, 2026-09-20 ────────────────────────────────────────────────────────────────
  // El estudio de podcast fue el laboratorio, no el tema: es el único set donde el momento real NO
  // es hablar. Las cuatro son domain-free y se probaron en `ai-generations/2026-09-20_palancas-podcast/`.
  escucha: {
    etiqueta: 'el momento de recibir',
    // Igual que `pov`, es el Why de Efeonce hecho encuadre: la agencia que escucha antes de proponer.
    bloque:
      'LISTENING, NOT SPEAKING (this is the frame, not a detail): the subject is RECEIVING — verify it by these landmarks, not by mood: their MOUTH IS CLOSED and relaxed, with no teeth showing and no mid-word shape; their gaze is lowered or slightly unfocused and goes OUT of the frame towards whoever is speaking, never into the lens; their body is still and leaned very slightly forward, one hand resting near the ear or the jaw. The tool they would use to speak — microphone, pen, keyboard — is in the frame and UNUSED. The tension of the picture is attention, not action.',
    requiere: null
  },
  atraviesa: {
    etiqueta: 'un objeto del oficio cruza el cuadro',
    bloque:
      'AN OBJECT OF THE CRAFT CUTS THE FRAME (this is the composition, not a detail): a long rigid object of the trade — a boom arm, a rail, a ruler, a cable run, a beam — runs as a hard DIAGONAL from one corner of the picture towards the opposite one, IN FOCUS and sharp along its whole length so its joints and material are legible. It passes BETWEEN the lens and the person but it does NOT cover their face or body: it crosses the empty air in front of them and splits the picture into two zones. The composition is governed by that diagonal, not by the face.',
    requiere: null
  },
  'entre-dos': {
    etiqueta: 'la cámara entre dos que trabajan juntos',
    bloque:
      'BETWEEN THE TWO (this is the frame, not a detail): the camera sits IN THE SPACE BETWEEN two people who are talking TO EACH OTHER — verify it by these landmarks: one person at the LEFT edge of the frame and another at the RIGHT edge, both cut by the frame edges, both at the same distance from the lens, and the whole CENTRE of the picture is the empty air between them; NEITHER of them looks at the camera — they look ACROSS it at one another, so their eyelines cross in front of the lens; one has just stopped and the other is beginning. The subject of the photograph is the exchange, not either face.',
    requiere: null
  },
  'quien-sostiene': {
    etiqueta: 'quien hace posible el momento, no quien lo protagoniza',
    // La inversión ES la palanca: el ojo llega primero a quien opera y último a quien luce.
    bloque:
      'THE ONE WHO MAKES IT POSSIBLE (this is the frame, not a detail): the person IN FOCUS is the one OPERATING — at the desk, the console, the panel, the rig — seen in three-quarter view with a hand on a control, watching a readout. The people who are actually performing are BEHIND them, SMALL, SOFT and OUT OF FOCUS, seen from behind, and no feature of them is legible. The eye must land on the operator FIRST and on the talent LAST: that inversion is the point of the picture.',
    requiere: null
  },

  // ── Ronda oficio digital, 2026-09-20 ─────────────────────────────────────────────────────────
  // Tesis: el oficio con IA no está en la máquina, está en la decisión. Generar es barato y no se ve;
  // elegir, descartar, corregir y dirigir es el trabajo. Fotografiar la máquina —robots, circuitos,
  // interfaces flotantes— es fotografiar la parte que no vale nada, y además es lo que hace todo el mundo.
  // Probadas en `ai-generations/2026-09-20_palancas-oficio-digital/`.
  variantes: {
    etiqueta: 'la misma cosa repetida, y una elegida',
    // Reescrita el 2026-09-21 tras la auditoría ciega. Los dos evaluadores se CONTRADIJERON en el dato
    // y coincidieron en el veredicto: uno vio nueve copias idénticas («no es un proceso de decisión,
    // es un patrón decorativo») y el otro vio que NO lo eran («el ángulo del muro y la proporción del
    // cielo cambian de copia en copia; nueve impresiones del mismo archivo no pueden diferir entre
    // sí»). Las dos lecturas son el mismo defecto: el contrato pedía variar TRES ejes a la vez —peso,
    // recorte y color— así que o la diferencia no se veía, o se veía donde ninguna impresión puede
    // diferir y delataba la generación. Ahora el eje es UNO y se declara; lo demás queda prohibido
    // explícitamente. Y vuelven el número y la rejilla, que la destilación del texto probado había
    // perdido: lo que se generó decía «NINE printed sheets pinned in a grid on a pale studio wall» y
    // el bloque había quedado en «repeated many times».
    bloque:
      'THE SUBJECT IS THE CHOICE (this is the frame, not a detail): the picture is filled with NINE TO TWELVE copies of THE SAME piece, pinned or laid out in a REGULAR GRID that fills the frame. Every copy is identical in every single respect EXCEPT ONE declared axis: <QUE>. NOTHING else varies between them — not the angle they are seen at, not the crop, not the proportions, not the light falling on them, not the distance from the camera: these are prints of ONE file, so no difference the camera itself did not cause may appear anywhere except in that one axis. ONE copy is physically SET APART from the rest: pulled forward, lifted, turned, or carrying a mark. The near-identical repetition IS what the photograph is about: not the piece, but the decision between versions of it. A hand and forearm may enter from the frame edge, never a face.',
    requiere: 'eje',
    // UN eje y sólo uno. El error tiene que enseñar la forma, porque el defecto medido fue
    // justamente declarar tres a la vez. Los tres ejemplos son ejes que el modelo SOSTIENE: por
    // debajo de cierto umbral —«un encuadre unos milímetros más cerrado»— no reproduce la diferencia
    // sino que introduce deriva, y sale ruido en vez de un eje. Es lo que vio el evaluador que juró
    // que las nueve copias no eran idénticas: tenía razón, y no estaba viendo el eje pedido.
    ejemplo:
      '"the weight of the type, and nothing else" · "the warmth of one colour field, and nothing else" · ' +
      '"the size of the logo, and nothing else"'
  },
  descarte: {
    etiqueta: 'lo que no se eligió',
    bloque:
      'THE SUBJECT IS WHAT WAS NOT CHOSEN (this is the frame, not a detail): a deep, untidy PILE of rejected work fills the centre and lower half of the picture — dozens of sheets, prints or parts overlapping at every angle, some creased, some face-down, some crossed out. That pile is the LARGEST and most detailed thing in the frame. What WAS chosen is NOT in the picture: only the place it left behind — an empty pin, a cleared space, a gap. NOBODY is present. A low hard light rakes across the pile so every single edge casts its own shadow and the real depth of the stack is legible.',
    requiere: null
  },
  marcado: {
    etiqueta: 'la corrección es el sujeto, no la mano',
    bloque:
      'THE SUBJECT IS THE CORRECTION, NOT THE HAND THAT MADE IT (this is the frame, not a detail): the work fills the whole picture, seen at a steep angle so its material and texture are razor sharp; drawn ON TOP of it are the marks of a review — a circle around one element, an arrow dragging it across, a firm crossing-out, a bracket in the margin. Those marks are the SHARPEST, most deliberate and most contrasted thing in the picture and the eye lands on them FIRST. The tool that made them lies where it was put down. ANY hand is at most a blurred fragment leaving the frame at the far edge, NEVER the subject. Raking light makes the physical ridge of each stroke throw its own small shadow, so the marks read as material, not as graphics added afterwards.',
    requiere: null
  },
  proyeccion: {
    etiqueta: 'la obra proyectada sobre materia física',
    bloque:
      'THE WORK IS PROJECTED ONTO PHYSICAL MATTER (this is the frame, not a detail): a beam from behind the camera throws the work itself onto a rough physical surface — plaster, brick, cloth, timber — and that surface\'s grain, cracks and unevenness SHOW THROUGH the projected image, bending and breaking it. The projection is the ONLY light in the room. A person stands INSIDE the beam with their back to the camera and the work FALLS ACROSS their shoulders and body, so part of the image is on the surface and part is on them; their own shadow punches a hard black hole through it. NO screen and NO monitor anywhere: the image lives on material, not on glass.',
    requiere: null
  }
}

function bloquePalanca(ficha) {
  const pedida = ficha.palanca

  if (!pedida) return null

  if (Array.isArray(pedida)) {
    throw new Error(
      'Declara UNA palanca dominante por pieza, no una lista. Medido el 2026-09-20: combinar dos las diluye — ' +
        'cada una pide el control de la escena y el resultado tiene un poco de cada una y lo mejor de ninguna.'
    )
  }

  const palanca = PALANCAS[pedida]

  if (!palanca) {
    if (TOMAS_DE_CAMARA.has(pedida)) {
      throw new Error(
        `"${pedida}" es una TOMA del catálogo de cámara, no una palanca de encuadre. ` +
          'Una toma dice CON QUÉ se fotografía (lente, altura, distancia) y se escribe en la escena; ' +
          'una palanca dice QUÉ HACE la foto y va en `palanca`. Se combinan: `palanca: "fragmento"` ' +
          'con un retrato de 85 mm en la escena. Las 20 tomas con su ficha: ' +
          'docs/operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md'
      )
    }

    throw new Error(
      `Palanca de encuadre "${pedida}" desconocida. Disponibles: ${Object.keys(PALANCAS).join(', ')}. ` +
        'La atmósfera va en `atmosfera` y la acción suspendida en `suspendido`: son otras familias. ' +
        'Catálogo: docs/operations/brand-photography/EFEONCE_PHOTO_LEVERS_CATALOG_V1.md'
    )
  }

  let texto = palanca.bloque

  if (palanca.requiere) {
    const valor = ficha[palanca.requiere]

    if (typeof valor !== 'string' || valor.trim().length < 8) {
      throw new Error(
        `La palanca "${pedida}" exige el campo \`${palanca.requiere}\` diciendo QUÉ, en concreto ` +
          `(por ejemplo ${palanca.ejemplo ?? '"the dark back of a monitor"'}). ` +
          'Sin eso el modelo la aplica a medias y la palanca se anula.'
      )
    }

    texto = texto.replace('<QUE>', valor.trim())
  }

  return { texto, sinMomento: Boolean(palanca.sinMomento) }
}


// ── Deriva de assets ────────────────────────────────────────────────────────────────────────────
// Los binarios viven fuera de git, así que una copia local puede diferir de la aprobada sin que nada
// lo note, y la pieza saldría con una referencia que el equipo no aprobó. Se comprueban SÓLO los
// assets que esta ficha usa (3 a 5), no los 54: es barato y ataja el caso real.
function derivaDeAssets(imagenes) {
  const lockPath = path.join(raiz, 'scripts/foto/assets.lock.json')

  if (!imagenes.length || !existsSync(lockPath)) return []

  let lock

  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  } catch {
    return []
  }

  const derivados = []

  for (const ref of imagenes) {
    const esperado = lock.assets?.[ref]?.sha256
    const abs = path.join(raiz, ref)

    if (!esperado || !existsSync(abs)) continue

    const real = createHash('sha256').update(readFileSync(abs)).digest('hex')

    if (real !== esperado) derivados.push(ref)
  }

  return derivados
}


// ── Sistema de color: el azul en todas, un acento único ─────────────────────────────────────────
// El canon es explícito —«Azul activo: la casa, EN TODAS» y «un solo acento (naranja o lima) por
// pieza, 1–5%, nacido de la situación»— pero al probar palancas nuevas es fácil concentrarse en la
// geometría y dejar la paleta fuera: pasó en las tres rondas del 2026-09-20 y las piezas salieron
// como buena fotografía genérica en vez de Efeonce. El portador se declara en la escena; un HEX en
// un bloque genérico no basta.
const PORTADOR_AZUL =
  /\b(azure|cobalt|ink[- ]blue|blue (?:screen|monitor|display|panel|light|glow|sign|folder|case|wall|door|tarp|crate|cloth))|blue[- ](?:lit|edged|rimmed)|glowing (?:cool )?(?:azure|blue)/i

const ACENTO =
  /\b(orange|lime|lime-green|amber)\b/i

// Reserva de texto: el campo `reservas` es OPT-IN y por eso se apagó solo. Medido el 2026-09-20 sobre
// las doce piezas de la auditoría ciega: NINGUNA la declaró y las doce reprobaron la banda de texto (la
// mejor llegó a 0,10 del alto contra un mínimo de 0,28). Una pieza sin texto es legítima; una que va a
// llevar titular y no reservó espacio ya nació sin él, y eso no se arregla en composición.
// CÓDIGO DE VESTUARIO [operador, 2026-09-20]: la prenda dice el REGISTRO de la escena y no es
// intercambiable. Una reunión importante en hoodie dice lo contrario de lo que la foto cuenta.
// El polo vive en dos registros: solo es oficina casual, con gorra es terreno.
// El lanyard y el carnet son TRANSVERSALES: marcan pertenencia, no registro.
const REGISTRO_PRENDA = {
  'polo-efeonce': ['oficina', 'terreno'],
  'chaqueta-softshell-efeonce': ['reunion'],
  'chaqueta-bomber-efeonce': ['reunion'],
  'gorra-efeonce': ['terreno'],
  'hoodie-efeonce': ['terreno'],
  'lanyard-efeonce': ['oficina', 'reunion', 'terreno']
}

// EMBLEMA EN PRENDA: el modelo NO lo reproduce fiel. Lo sabe el canon desde el principio —por eso la
// firma se COMPONE y no se genera, y por eso el carnet del lanyard sale de `arte-carnet.mjs`—, y cada
// kit de prenda ya lo dice en su instrucción («never let the model spell the emblem by itself —
// inspect it at 100% before publishing»). Pero decirlo en el prompt sólo se lo dice AL MODELO.
//
// Caso fuente 2026-09-20: cinco piezas con polo, gorra y chaqueta salieron con una espiral inventada
// en lugar del emblema —sin «e», sin «f», sin nave ni órbita— y se reportaron como «coherentes y
// reconocibles» porque el QA se hizo sobre una hoja de contacto de 520 px, donde un bordado no se lee.
// La instrucción existía; lo que faltaba era que ALGUIEN la pusiera delante de quien cierra.
const PRENDAS_CON_EMBLEMA = ['polo-efeonce', 'hoodie-efeonce', 'gorra-efeonce', 'chaqueta-softshell-efeonce', 'chaqueta-bomber-efeonce']

export const auditarEmblema = objetos => {
  const prendas = (objetos ?? []).filter(o => PRENDAS_CON_EMBLEMA.includes(o))

  if (prendas.length === 0) return []

  return [
    `lleva emblema bordado (${prendas.join(', ')}) y el modelo NO lo reproduce fiel: inventa una forma parecida. ` +
      'ANTES de dar la pieza por buena, amplía el bordado con `pnpm foto:emblema <plate.png>` y compáralo ' +
      'letra por letra contra el kit: «e», «f», nave, órbita con sus cortes, tres ventanas. Una letra distinta ' +
      'obliga a regenerar. Si el emblema no se puede sostener, muestra la prenda donde no se lea (de espaldas, ' +
      'en sombra, a escala pequeña) en vez de publicar un logo inventado.'
  ]
}

export const auditarRegistroVestuario = objetos => {
  const prendas = (objetos ?? []).filter(o => REGISTRO_PRENDA[o])

  if (prendas.length < 2) return []

  // Compatible si queda al menos un registro que TODAS las prendas admiten.
  const comun = prendas.reduce((acc, o) => acc.filter(r => REGISTRO_PRENDA[o].includes(r)), REGISTRO_PRENDA[prendas[0]])

  if (comun.length > 0) return []

  return [
    `mezcla registros de vestuario: ${prendas.map(o => `${o} (${REGISTRO_PRENDA[o].join('/')})`).join(' + ')}. ` +
      'La prenda dice el registro de la escena — polo=oficina casual · chaqueta=reunión · gorra+polo y hoodie=terreno · ' +
      'lanyard=transversal — y se elige por lo que la escena ES, nunca por variedad visual.'
  ]
}

export const auditarReservas = ficha => {
  // `reservas` es un OBJETO con claves (`texto`, `margen`, `seleccion`), no un array: comprobar
  // `Array.isArray` daba el aviso incluso a una ficha que SÍ reservaba. Error propio del 2026-09-20,
  // y el test lo confirmó porque le pasaba un array — una guarda que afirma la forma equivocada.
  if (ficha?.reservas && Object.keys(ficha.reservas).length > 0) return []

  return [
    'sin `reservas`: esta pieza es MUDA (sólo foto y firma), lo cual es una categoría legítima y sirve de ' +
      'descanso visual. Si va a llevar titular, copy o cursores, decláralo ahora — ' +
      '`"reservas": { "texto": { "muro": "<materia con nombre>", "tinta": "blanca|oscura" } }` — y valida con ' +
      '`pnpm foto:validar <plate> --zona-texto`. Reservar después de generar no existe: o está en la toma, o no cabe.'
  ]
}

// Una palanca puede declarar qué NO puede decir la escena que la acompaña. Nace del hallazgo de
// raíz del 2026-09-21: el bloque de la palanca y el campo `escena` se concatenan en el mismo prompt
// sin que nada verifique que no se peleen, y cuando se pelean gana la escena por ser más específica.
// Así reprobó `ausencia` en la auditoría ciega —bloque «chair pushed back at an angle», escena «the
// empty chair»— y así puede reprobar cualquier otra: el aviso es por palanca, no un caso especial.
export const auditarContradicciones = ficha => {
  const palanca = PALANCAS[ficha?.palanca]
  const escena = ficha?.escena ?? ''

  if (!palanca?.contradice) return []

  return palanca.contradice
    .filter(({ patron, salvo }) => patron.test(escena) && !(salvo && salvo.test(escena)))
    .map(
      ({ porque }) =>
        `CONTRADICE a su propia palanca "${ficha.palanca}": ${porque}. ` +
        'El bloque de la palanca y la escena viajan juntos en el mismo prompt: cuando se pelean gana ' +
        'la escena, por más específica, y la palanca se anula sin que nada lo delate.'
    )
}

// El lecho es la firma —es donde va el logo— así que no se puede quitar sin más. Pero la auditoría
// ciega lo leyó como muletilla en siete de doce: «es el mismo recurso de profundidad siete veces».
// Contar OBJETOS no lo detecta: los doce lechos de la serie eran literalmente distintos, 12 de 12.
// Lo que se repetía era la GRAMÁTICA —el borde o la esquina de una superficie, desenfocado, abajo—
// en 8 de 12 con este criterio, y el material «dark walnut» en 3. El catálogo tiene 21 lechos
// medidos (EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md §2) y la serie usó una sola familia: no falta
// repertorio, faltaba que alguien contara. Mismo mecanismo que la dosis del acento cálido.
export const FAMILIAS_DE_LECHO = [
  ['borde de superficie', /\b(near |out-of-focus |nearest )*(edge|corner|lip|rim) of (the |a |an )?[a-z ]*\b(table|desk|worktop|counter|console|bench|sill|plinth|shelf|surface|top)\b/i],
  ['suelo a ras del lente', /\b(floor|ground|pavement|concrete|asphalt)\b/i],
  ['equipo de rodaje', /\b(matte box|camera rig|studio camera|projector|mixing desk|grading|tripod|light panel|softbox)\b/i],
  ['respaldo o asiento', /\b(backrest|headrest|chair back|seat back|upholstery)\b/i],
  ['cuerpo o persona', /\b(shoulder|head|back of the|audience|hair|arm)\b/i],
  ['objeto del oficio', /\b(bottle|can|cart handle|fruit|stall|proof sheet|print|foam|microphone|case|cable)\b/i],
  ['vehículo', /\b(car|van|roof of)\b/i]
]

export const familiaDeLecho = objeto => {
  const texto = String(objeto ?? '')

  for (const [nombre, patron] of FAMILIAS_DE_LECHO) if (patron.test(texto)) return nombre

  return 'sin clasificar'
}

// Umbral: más de la mitad de la tanda compartiendo familia es lo que se lee desde fuera como
// «el mismo recurso otra vez». La serie auditada estaba en 8 de 12.
const DOSIS_LECHO = 2

export const auditarLechoDeTanda = fichas => {
  if (fichas.length < 3) return []

  const cuenta = new Map()

  for (const f of fichas) {
    const l = f?.lecho

    if (!l || l === 'sin-lecho') continue

    const fam = familiaDeLecho(typeof l === 'string' ? l : l.objeto)

    cuenta.set(fam, [...(cuenta.get(fam) ?? []), f.id ?? 'ficha'])
  }

  const avisos = []

  for (const [fam, ids] of cuenta) {
    if (ids.length * DOSIS_LECHO > fichas.length) {
      avisos.push(
        `el lecho repite la familia "${fam}" en ${ids.length} de ${fichas.length} fichas (${ids.join(', ')}). ` +
          'Medido desde fuera: leído como «el mismo recurso de profundidad» otra vez. Contar objetos no lo ' +
          'detecta —los doce lechos de la serie auditada eran literalmente distintos— porque lo que se repite ' +
          'es la forma, no la palabra. El catálogo tiene 21 lechos medidos: ' +
          'docs/operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md §2'
      )
    }
  }

  return avisos
}

export const auditarColor = escena => {
  const avisos = []

  if (!PORTADOR_AZUL.test(escena ?? '')) {
    avisos.push(
      'no declara un PORTADOR del azul de marca (el canon lo pide en todas: una pantalla, un panel, una luz, un objeto azul de la escena). Un HEX suelto no basta: el azul tiene que estar en algo'
    )
  }

  // El ACENTO no se audita por pieza: tiene DOSIS (1 de cada 2, auditoría ciega 2026-09-20) y pedirlo
  // en cada una contradecía la dosis — el mismo aviso empujaba al tic que la dosis existe para evitar.
  // Su decisión vive en la TANDA y se resuelve en `auditarAcentoDeTanda`.
  return avisos
}

// El acento falla en las DOS direcciones y las dos importan: si no lo lleva ninguna se pierde la
// puntuación de marca; si lo llevan casi todas se lee como un tic de producción y delata la receta.
export const auditarAcentoDeTanda = escenas => {
  if (escenas.length < 2) return []

  const con = escenas.filter(e => ACENTO.test(e ?? '')).length

  if (con === 0) {
    return [
      `ninguna de las ${escenas.length} fichas declara el ACENTO cálido (naranja o lima, 1–5%, nacido de la situación). ` +
        'El azul portador es estructura y va en todas; el acento es la puntuación de marca y la tanda se queda sin ella.'
    ]
  }

  if (con * DOSIS_ACENTO > escenas.length) {
    return [
      `acento cálido en ${con} de ${escenas.length} fichas (dosis: 1 de cada ${DOSIS_ACENTO}). ` +
        'Medido desde fuera: repetido en casi todas deja de leerse como identidad y delata que la serie se armó ' +
        'con una receta en vez de a lo largo de proyectos reales.'
    ]
  }

  return []
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
// Cuarto falso negativo del día: la LUZ MOTIVADA por una pantalla o un monitor visible en cuadro es
// una fuente legítima —de hecho es la que más realismo da— y el detector no la conocía.
const LUZ =
  /\b(sun|sunlight|sunbeam|daylight|midday|noon|beam|backlit|rim-?lit|lit only|only light|lamp|window light|golden hour|hard light|directional|shaft|raking|rakes|silhouett|spot|spotlight|stage light|practical|key light|candlelit|firelight|neon|monitor|screen|display|glow|glowing|flash|strobe|lights? (?:her|him|them|his|the)\b)/i

// Tercer falso negativo de vocabulario en un día (tras `daylight` y `stage spot`): una escena decía
// «at the instant the marker lifts off the glass» y el aviso saltaba igual. Un aviso que grita donde
// no debe deja de leerse justo cuando acierta.
const MOMENTO =
  /\b(mid-|at the peak|at the instant|the exact moment|the moment|split second|frozen|caught at|caught in|throws|tosses|laughing|reaching|turning|lifting|lifts|just as|catches)/i

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

  // El canon contempla tomas SIN lecho —dron y todo-enfocadas— y el comando no lo sabía: abortaba
  // una toma legítima (caso: cenital perpendicular, 2026-09-20). Se declara `lecho: "sin-lecho"` con
  // la razón, y esas piezas resuelven la firma aparte (pavimento sereno, url-lum), no se quedan sin.
  if (ficha.lecho === 'sin-lecho') {
    if (typeof ficha.sinLechoPorque !== 'string' || ficha.sinLechoPorque.trim().length < 10) {
      throw new Error(
        'Una toma `sin-lecho` debe declarar `sinLechoPorque` (por ejemplo "cenital perpendicular: no hay primer ' +
          'plano posible"). El lecho no es opcional por comodidad: sólo por geometría de la toma.'
      )
    }
  } else if (!ficha.lecho?.objeto || !ficha.lecho?.tono) {
    throw new Error(
      'La ficha necesita `lecho.objeto` y `lecho.tono`. La firma SIEMPRE necesita su lecho: no es opcional. ' +
        'Si la geometría de la toma no admite primer plano (cenital, dron, todo-enfocada), usa `lecho: "sin-lecho"` ' +
        'y declara `sinLechoPorque`.'
    )
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

  const partes = [leerBloque('bloque-realismo-v3.txt')]

  if (ficha.impacto !== false) partes.push(leerBloque('bloque-impacto-v1.txt'))

  // Atmósfera y suspendido van juntas al bloque de impacto: son palancas de la misma familia, pero
  // se piden por pieza para conservar la dosis.
  const atmosfera = bloqueAtmosfera(ficha)
  const suspendido = bloqueSuspendido(ficha)

  const palanca = bloquePalanca(ficha)

  if (palanca) partes.push(palanca.texto)
  if (atmosfera) partes.push(atmosfera)
  if (suspendido) partes.push(suspendido)

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

  // Los objetos se numeran DESPUÉS de las referencias de identidad: si el número no calza con el
  // orden real de los --image, el modelo aplica la instrucción a la imagen equivocada.
  const objetos = resolverObjetos(ficha, identidad?.imagenes.length ?? 0)

  if (objetos) partes.push(objetos.bloque)

  partes.push(ficha.escena)

  // El lecho, con el porcentaje del formato. Nunca escrito a mano.
  if (ficha.lecho === 'sin-lecho') {
    return {
      prompt: partes.join('\n\n'),
      size: fmt.size,
      sinValidar: Boolean(fmt.sinValidar),
      imagenes: [...(identidad?.imagenes ?? []), ...(objetos?.imagenes ?? [])],
      avisosObjeto: objetos?.avisos ?? [],
      llevaSuspendido: Boolean(suspendido),
      sinMomento: Boolean(palanca?.sinMomento),
      sinLecho: true
    }
  }

  partes.push(
    `FOREGROUND (planned): ${ficha.lecho.objeto}, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom ${fmt.lecho} of the frame (never a hard band), ${ficha.lecho.tono}; its center calm and even.`
  )

  return {
    prompt: partes.join('\n\n'),
    size: fmt.size,
    sinValidar: Boolean(fmt.sinValidar),
    imagenes: [...(identidad?.imagenes ?? []), ...(objetos?.imagenes ?? [])],
    avisosObjeto: objetos?.avisos ?? [],
    llevaSuspendido: Boolean(suspendido),
    sinMomento: Boolean(palanca?.sinMomento)
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
  // Dosis de la acción suspendida: la regla vive en la TANDA, no en la pieza. Una pieza con algo
  // volando está bien; una serie donde vuela algo en todas convierte el momento en un truco. Avisa
  // en vez de bloquear porque una tanda temática puede justificarlo — pero lo dice con el número.
  const conSuspendido = resueltas.filter(r => r.llevaSuspendido).length

  // Dosis del ACENTO. Hallazgo de la auditoría ciega del 2026-09-20: dos evaluadores que no sabían nada
  // del canon contaron el naranja en 9 de 12 y en 12 de 12 piezas, y los dos lo leyeron igual — «la
  // primera vez es identidad, a la octava se siente forzado» y «la taza y el post-it están puestos ahí
  // sólo para cumplir la cuota de naranja». El azul portador es estructura y va en todas; el ACENTO es
  // puntuación y necesita dosis, igual que la acción suspendida.
  for (const aviso of auditarAcentoDeTanda(resueltas.map(r => r.ficha.escena))) {
    console.error(`  ⚠ ${aviso}`)
  }

  // El lecho se cuenta por FAMILIA, no por objeto: los doce lechos de la serie auditada eran
  // literalmente distintos y aun así se leyó «el mismo recurso de profundidad siete veces».
  for (const aviso of auditarLechoDeTanda(resueltas.map(r => r.ficha))) {
    console.error(`  ⚠ ${aviso}`)
  }

  if (conSuspendido * DOSIS_SUSPENDIDO > resueltas.length && resueltas.length > 1) {
    console.error(
      `  ⚠ acción suspendida en ${conSuspendido} de ${resueltas.length} fichas (dosis: 1 de cada ${DOSIS_SUSPENDIDO}). ` +
        'Si vuela algo en casi todas, deja de leerse como un momento y se lee como un recurso repetido.'
    )
  }

  for (const { ficha, avisosObjeto, sinMomento } of resueltas) {
    // Una larga exposición no tiene momento decisivo y pedirle ambos es contradictorio: la palanca
    // apaga ese aviso concreto, no todos.
    const avisos = auditarEscena(ficha.escena).filter(a => !(sinMomento && a.includes('MOMENTO')))
    const vestuario = auditarVestuario(ficha.escena, ficha.identidad)

    avisos.push(...auditarColor(ficha.escena))

    avisos.push(...auditarReservas(ficha))
    avisos.push(...auditarRegistroVestuario(ficha.objetos))
    avisos.push(...auditarEmblema(ficha.objetos))
    avisos.push(...auditarContradicciones(ficha))

    if (vestuario) avisos.push(vestuario)

    for (const a of avisos) console.error(`  ⚠ ${ficha.id ?? 'ficha'}: la escena ${a}`)

    // El aviso de derechos viaja con el kit, no con la memoria de quien lo usa.
    for (const a of avisosObjeto ?? []) console.error(`  ⚠ ${ficha.id ?? 'ficha'}: ${a}`)
  }

  for (const { ficha, imagenes } of resueltas) {
    const derivados = derivaDeAssets(imagenes)

    for (const d of derivados) {
      console.error(
        `  ⚠ ${ficha.id ?? 'ficha'}: "${d}" NO coincide con el asset aprobado (assets.lock.json). ` +
          'Generar con él usaría una referencia distinta de la que el equipo aprobó. ' +
          'Restaura la copia buena, o si el cambio es intencional corre `pnpm foto:assets:lock` y commitea.'
      )
    }
  }

  // `pnpm ai:image --batch` NO transporta `--image`: un batch con identidad genera caras inventadas
  // —y con un kit de marca, logos dibujados de memoria—, se ve plausible en la hoja de contacto y se
  // paga igual. Abortar es la única salida honesta.
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
