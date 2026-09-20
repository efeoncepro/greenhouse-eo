// Matriz de pruebas de capa gráfica sobre fotografía de marca Efeonce.
//
// La retícula sale medida de «¿Claude o Codex?» (2026-09-17), la pieza que el operador señala como
// bien resuelta y que además es sobre foto. Lo medido y lo decidido van separados en `preset`.
// Cada variante cambia UNA familia de decisiones a la vez: número de voces, pesos, caja de selección,
// cursor local, multiplayer, `moving` standalone, acento y gesto Guttery.
//
// Colores de cursor: los del lenguaje fotográfico aprobado (§3), no inventados.
//   Arte #F55D01 · Cliente #6EC207 (aprueba) · Efeonce/RevOps #0375DB · Nexa #d6246e · SEO #12afa2

const P = {
  panaderia45: '../2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S1-panaderia-45-plate.png',
  equipo45: '../2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S3v2-julio-nexa-45-plate.png',
  estudio45: '../2026-09-17_claude-o-codex/plates/plate-v11.png',
  pipeline45: '../2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S2v2-45-plate.png',
  panaderia916: '../2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S1v2-916-plate.png',
  equipo916: '../2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S3v2-julio-nexa-916-plate.png',
  estudio916: '../2026-09-17_claude-o-codex/plates/plate-9x16.png',
  pipeline916: '../2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S2v2-916-plate.png',
  panaderia169: '../2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S1v2-169-plate.png',
  estudio169: '../2026-09-17_claude-o-codex/plates/plate-16x9.png',
  pipeline169: '../2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S2-pipeline-169-plate.png'
}

const CURSOR = { arte: '#F55D01', cliente: '#6EC207', efeonce: '#0375DB', nexa: '#d6246e', seo: '#12afa2' }

// ── piezas de capa reutilizables ─────────────────────────────────────────────────────────────────
// `acento` nombra el TOKEN de la tinta de `[[…]]`. Sin declararlo cae al acento del campo (naranja),
// que es lo que quiero cuando el acento es «la idea», pero no cuando la prueba es otro color.
const titular = ({ texto, receta = 'ideaImpact', ancho, peso, objetivo = 0.58, top = 0.135, x = 'eje', min = 0.06, max = 0.10, acento }) => ({
  id: 'titular', tipo: 'texto', rol: 'titular', receta, ...(ancho ? { ancho } : {}), ...(peso ? { peso } : {}),
  texto, ajuste: { modo: 'ancho', objetivo, minAlto: min, maxAlto: max }, x, y: { frac: top },
  tinta: 'fuerte', ...(acento ? { acento } : {}), piso: 4.5
})

// Etiqueta: Poppins mayúsculas con el tracking abierto de structureLabel. Va ARRIBA del titular y se
// separa de él en familia, peso, escala y tinta — cuatro ejes, no dos.
const etiqueta = ({ texto, peso = 600, top = 0.085, x = 'eje', alto = 0.018 }) => ({
  id: 'etiqueta', tipo: 'texto', rol: 'etiqueta', familia: 'poppins', peso, receta: 'structureLabel',
  texto, ajuste: { modo: 'fijo', alto }, x, y: { frac: top }, tinta: 'suave', piso: 4.5
})

const cita = ({ texto, peso = 500, x = 0.055, factor = 0.34, gap = 1.05 }) => ({
  id: 'cita', tipo: 'texto', rol: 'cita', familia: 'poppins', peso, receta: 'structureTagline', texto,
  ajuste: { modo: 'relativo', a: 'titular', factor },
  x: { frac: x }, y: { ref: 'titular', borde: 'bottom', gapDe: 'titular', gapFactor: gap },
  tinta: 'suave', piso: 4.5, aireAbajo: 3
})

// Guttery: gesto, máximo uno por pieza, <= 3 palabras. Si el archivo no está, la capa se omite sola.
// Guttery es escritura a mano: admite rotación, que es justo lo que una anotación real tiene.
// `rotacion` gira alrededor del centro de la caja de tinta y el motor recalcula la caja alineada a
// ejes para MEDIR sobre los píxeles donde el texto quedó, no donde estaba antes de girar.
const gesto = ({ texto, x = { ref: 'titular', borde: 'right' }, y, alto = 0.038, gap = 0.4, rotacion, tinta = 'fuerte', proposito, voz }) => ({
  id: 'gesto', tipo: 'texto', rol: 'gesto', familia: 'guttery', receta: 'gesture', texto, proposito, voz,
  ajuste: { modo: 'fijo', alto }, x,
  y: y ?? { ref: 'titular', borde: 'bottom', gapDe: 'titular', gapFactor: gap },
  ...(rotacion ? { rotacion } : {}), tinta, piso: 4.5
})

const firma = (y = 0.935, ancho = 0.15) => ({ id: 'firma', tipo: 'firma', ancho, x: 'eje', y: { frac: y }, piso: 4.5 })

// `anclas: 'auto'` es la ÚNICA forma de que el motor elija anclas. Sin eso, manda lo que declara el
// autor —como pide el contrato— y si no pasa la evidencia, la pieza falla e informa alternativas.
const seleccion = ({ cursores, presentacion = {}, sobre = 'titular', region, aire = 'standard', anclas }) => ({
  id: 'seleccion', tipo: 'seleccion', ...(anclas ? { anclas } : {}),
  ...(region ? { sobreRegion: region, tipoObjetivo: 'object' } : { sobre, tipoObjetivo: 'text' }),
  variante: 'eight-handles', aire, overlay: 'subtle',
  cursores, presentacion
})

// Regiones de OBJETOS reales, leídas sobre una grilla en décimas de cada plate (scripts/grilla.mjs),
// no estimadas. La caja enmarca «la obra en revisión» o «el resultado», que es el uso que el canon
// prefiere sobre enmarcar el titular.
const OBJETO = {
  pruebasImpresas: { x0: 0.28, y0: 0.705, x1: 0.90, y1: 0.80 },   // equipo 4:5 · la obra en revisión
  masas: { x0: 0.12, y0: 0.715, x1: 0.72, y1: 0.80 },             // panadería 4:5 · la obra
  clawd: { x0: 0.165, y0: 0.35, x1: 0.335, y1: 0.495 },           // estudio 4:5
  codex: { x0: 0.625, y0: 0.33, x1: 0.805, y1: 0.505 }            // estudio 4:5
}

// Sin ancla declarada, el motor la BUSCA entre las combinaciones del contrato y se queda con la
// primera que pasa la evidencia: dentro del lienzo con margen, cuerpo del colaborador fuera del
// límite, placa próxima al cursor y ningún control sobre el sujeto. Declarar un ancla es afirmar una
// intención posicional; yo no la tenía en la mayoría de estas piezas y declararla igual sólo servía
// para que el gate reprobara mi capricho. Donde sí hay intención, se declara y entonces manda.
const local = (ancla = null) => ({ id: 'local', kind: 'local', ancla })
const colab = (id, label, ancla = null) => ({ id, kind: 'collaborator', label, ancla })
// Un `moving` es un COLABORADOR en estado moving: presencia sin selección. `kind` sigue siendo
// 'collaborator' y no lleva targetId ni ancla; su sitio se declara por región del lienzo.
const moving = (id, label, region = null, direccion = 'east') =>
  ({ id, kind: 'collaborator', estado: 'moving', label, ...(region ? { region } : {}), direccion, accion: 'move' })

// ── helpers de la capa gráfica (declarados antes de cualquier pieza que los use) ──

// 🔴 Los helpers de Guttery se retiraron. Decisión del operador (2026-09-19): la jerarquía se
// resuelve con Poppins y Bricolage —sus pesos y sus tamaños—; Guttery volverá cuando él indique
// dónde y cómo. El motor conserva la familia y sus puertas, pero exige `autorizadoPorElOperador`.
//
// Por qué quedó fuera, para que no vuelva por inercia: la usé como etiqueta chica al costado
// (0.22–0.33× el titular), que rompe la composición por asimetría; sin salto de tinta contra el
// titular, o sea sin contraste tipográfico; y con textos que no eran voces sino etiquetas de estado
// y consignas. Una prueba con GPT Image 2.5 —dándole el espécimen— mostró que el modelo la coloca
// siempre en renglón propio alineado a la izquierda bajo el titular, nunca al costado. Esa señal
// queda anotada para cuando se retome.

const enfasis = ({ capa = 'titular', indice = 0, cursores, presentacion = {}, anclas }) => ({
  id: 'seleccion', tipo: 'seleccion', ...(anclas ? { anclas } : {}), sobreAcento: { capa, indice }, tipoObjetivo: 'text',
  variante: 'eight-handles', aire: 'standard', overlay: 'subtle',
  cursores, presentacion
})

// ── matriz ───────────────────────────────────────────────────────────────────────────────────────
export const preset = {
  fuente: 'Medido sobre ai-generations/2026-09-17_claude-o-codex/componer.mjs (pieza señalada como bien resuelta, sobre fotografía).',
  medido: {
    tituloAnchoDeTinta: 0.58, tituloAnchoDeTinta16x9: 0.36,
    tituloTopDeTinta: 0.135, tituloTopDeTinta16x9: 0.09,
    tamañoResultante: '98 px = 0.068 del alto con 16 caracteres',
    citaTamaño: '0.34 x el titular', citaMargen: 0.055, citaGap: '1.05 x el titular',
    citaTinta: 'color.softOnDark — el caso separa la cita también por TINTA, no sólo por familia, peso y escala'
  },
  decidido: {
    bandaDeTamañoDelTitular: '0.06–0.10 del alto. El ajuste al ancho fija el px; la banda impide que un copy largo lo hunda o uno corto lo dispare. A VALIDAR.',
    logoAncho: '0.15 del ancho, por el contrato fotográfico aprobado §5. «Claude o Codex» usó 0.26: divergencia registrada.',
    aireAbajo: 'La cita exige 3x el alto de su tinta de campo libre debajo, en tono y calma. Validado: el caso aprobado da 10.09:1 ahí; la versión que el operador rechazó daba 1.71:1.'
  }
}

export const piezas = [
  // ══ 4:5 ════════════════════════════════════════════════════════════════════════════════════════
  { id: 'V01-45-una-voz', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Base: una sola voz. Referencia contra la que se juzga si una segunda voz aporta.',
    capas: [titular({ texto: 'El oficio manda.' }), firma()] },

  { id: 'V02-45-etiqueta', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Dos voces por ETIQUETA arriba (Poppins 600 tracking abierto) en vez de cita abajo.',
    capas: [etiqueta({ texto: 'EL OFICIO A LA VISTA' }), titular({ texto: 'El oficio manda.', top: 0.155 }), firma()] },

  { id: 'V04-45-caja-local', formato: '4:5', plate: P.equipo45, campo: 'oscuro',
    nota: 'Caja de selección sobre el titular + cursor local solo (sin multiplayer).',
    capas: [titular({ texto: 'Lo hacemos contigo.' }), seleccion({ cursores: [local()] }), firma()] },

  { id: 'V05-45-caja-1colab', formato: '4:5', plate: P.equipo45, campo: 'oscuro',
    nota: 'Caja + local + UN colaborador. Con uno solo, el aire lateral se paga una vez.',
    capas: [titular({ texto: 'Lo hacemos contigo.' }),
      seleccion({ cursores: [colab('arte', 'Arte', 'top-end'), local()], presentacion: { participantColors: { arte: CURSOR.arte } } }), firma()] },

  { id: 'V06-45-caja-2colab', formato: '4:5', plate: P.estudio45, campo: 'oscuro',
    nota: 'Caja + local + DOS colaboradores: el aire lateral se paga dos veces. Titular más corto.',
    capas: [titular({ texto: 'Aquí se decide.', objetivo: 0.54 }),
      seleccion({ cursores: [colab('arte', 'Arte'), colab('cliente', 'Cliente', 'top-end'), local()],
        presentacion: { participantColors: { arte: CURSOR.arte, cliente: CURSOR.cliente } } }), firma()] },

  { id: 'V07-45-moving', formato: '4:5', plate: P.estudio45, campo: 'oscuro',
    nota: 'Caja + local + un cursor MOVING standalone: presencia sin selección, sin targetId ni ancla.',
    capas: [titular({ texto: 'Aquí se decide.', objetivo: 0.54 }),
      seleccion({ cursores: [local(), moving('nexa', 'Nexa')],
        presentacion: { participantColors: { nexa: CURSOR.nexa } } }), firma()] },

  { id: 'V08-45-claro', formato: '4:5', plate: P.pipeline45, campo: 'claro',
    nota: 'Campo CLARO con tinta navy. Titular desplazado a la izquierda: el centro tiene ventana.',
    capas: [etiqueta({ texto: 'DELIVERY', x: { frac: 0.075 }, top: 0.09 }),
      titular({ texto: 'Pipeline en vivo.', x: { frac: 0.075 }, objetivo: 0.5, top: 0.145 }), firma()] },

  // ══ 9:16 ═══════════════════════════════════════════════════════════════════════════════════════
  { id: 'V09-916-una-voz', formato: '9:16', plate: P.panaderia916, campo: 'oscuro',
    nota: 'Vertical alto: el titular baja a 0.16 para quedar bajo la barra de la red.',
    capas: [titular({ texto: 'El oficio manda.', top: 0.16, objetivo: 0.62 }), firma(0.875)] },

  { id: 'V10-916-tres-voces', formato: '9:16', plate: P.panaderia916, campo: 'oscuro',
    nota: 'Tres voces: etiqueta + titular + cita. El 9:16 es el único formato con alto para las tres.',
    capas: [etiqueta({ texto: 'EL OFICIO A LA VISTA', top: 0.115 }),
      titular({ texto: 'El oficio manda.', top: 0.175, objetivo: 0.62 }),
      cita({ texto: '“Nadie lo apura”' }), firma(0.875)] },

  { id: 'V11-916-caja-local', formato: '9:16', plate: P.equipo916, campo: 'oscuro',
    nota: 'Caja + local en vertical alto.',
    capas: [titular({ texto: 'Lo hacemos contigo.', top: 0.115, objetivo: 0.6 }),
      seleccion({ cursores: [local()] }), firma(0.875)] },

  { id: 'V12-916-caja-2colab', formato: '9:16', plate: P.estudio916, campo: 'oscuro',
    nota: 'Caja + local + dos colaboradores en vertical: más alto disponible para las placas.',
    capas: [titular({ texto: 'Aquí se decide.', top: 0.175, objetivo: 0.34 }),
      seleccion({ anclas: 'auto', cursores: [colab('efeonce', 'Efeonce', null), colab('cliente', 'Cliente', null), local(null)],
        presentacion: { participantColors: { efeonce: CURSOR.efeonce, cliente: CURSOR.cliente } } }), firma(0.875)] },

  { id: 'V13-916-caja-sola', formato: '9:16', plate: P.estudio916, campo: 'oscuro',
    nota: 'Era gesto Guttery + caja. Guttery quedó fuera por decisión del operador, así que la pieza conserva sólo la caja con cursor local.',
    capas: [titular({ texto: 'Aquí se decide.', top: 0.155, objetivo: 0.58 }),
      seleccion({ cursores: [local()] }), firma(0.875)] },

  { id: 'V14-916-claro', formato: '9:16', plate: P.pipeline916, campo: 'claro',
    nota: 'Campo claro vertical, dos voces, tinta navy.',
    capas: [etiqueta({ texto: 'DELIVERY', x: { frac: 0.075 }, top: 0.115 }),
      titular({ texto: 'Pipeline en vivo.', x: { frac: 0.075 }, top: 0.165, objetivo: 0.5 }), firma(0.875)] },

  { id: 'V15-916-acento', formato: '9:16', plate: P.panaderia916, campo: 'oscuro',
    nota: 'Jerarquía DENTRO de la línea: una palabra en acento naranja, medida aparte.',
    capas: [titular({ texto: 'El oficio [[manda]].', top: 0.16, objetivo: 0.62, acento: 'lima' }), firma(0.875)] },

  // ══ 16:9 ═══════════════════════════════════════════════════════════════════════════════════════
  { id: 'V16-169-una-voz', formato: '16:9', plate: P.panaderia169, campo: 'oscuro',
    nota: 'Horizontal: el sujeto vive a la derecha, el titular ocupa el costado izquierdo.',
    capas: [titular({ texto: 'El oficio manda.', x: { frac: 0.06 }, objetivo: 0.32, top: 0.28, min: 0.08, max: 0.16 }), firma(0.92)] },

  { id: 'V17-169-dos-voces', formato: '16:9', plate: P.panaderia169, campo: 'oscuro',
    nota: 'Costado izquierdo con etiqueta + titular, ambos alineados al mismo margen.',
    capas: [etiqueta({ texto: 'EL OFICIO A LA VISTA', x: { frac: 0.06 }, top: 0.22 }),
      titular({ texto: 'El oficio manda.', x: { frac: 0.06 }, objetivo: 0.32, top: 0.28, min: 0.08, max: 0.16 }), firma(0.92)] },

  { id: 'V18-169-caja-local', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'Caja + local en horizontal, titular centrado como en el caso de referencia 16:9.',
    capas: [titular({ texto: 'Aquí se decide.', objetivo: 0.36, top: 0.09, min: 0.07, max: 0.14 }),
      seleccion({ cursores: [local()] }), firma(0.92)] },

  { id: 'V19-169-caja-2colab', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'Caja + local + dos colaboradores en horizontal: es donde más aire lateral hay.',
    capas: [titular({ texto: 'Aquí se decide.', objetivo: 0.28, top: 0.14, min: 0.07, max: 0.14 }),
      seleccion({ cursores: [colab('arte', 'Arte'), colab('cliente', 'Cliente', 'top-end'), local()],
        presentacion: { participantColors: { arte: CURSOR.arte, cliente: CURSOR.cliente } } }), firma(0.92)] },

  { id: 'V20-169-claro', formato: '16:9', plate: P.pipeline169, campo: 'claro',
    nota: 'Campo claro horizontal con etiqueta y titular al costado.',
    capas: [etiqueta({ texto: 'DELIVERY', x: { frac: 0.06 }, top: 0.1 }),
      titular({ texto: 'Pipeline en vivo.', x: { frac: 0.06 }, objetivo: 0.32, top: 0.16, min: 0.08, max: 0.16 }), firma(0.92)] },

  { id: 'V21-169-gesto', formato: '16:9', plate: P.panaderia169, campo: 'oscuro',
    nota: 'Gesto Guttery bajo el titular en horizontal.',
    capas: [titular({ texto: 'El oficio manda.', x: { frac: 0.06 }, objetivo: 0.32, top: 0.26, min: 0.08, max: 0.16 }),
      firma(0.92)] },

  { id: 'V22-169-acento-moving', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'Acento dentro de la línea + caja + cursor moving standalone.',
    capas: [titular({ texto: '[[Aquí]] se decide.', objetivo: 0.36, top: 0.09, min: 0.07, max: 0.14 }),
      seleccion({ cursores: [local(), moving('nexa', 'Nexa')],
        presentacion: { participantColors: { nexa: CURSOR.nexa } } }), firma(0.92)] },

  // ── registro de peso: mismo copy y plate, distinta receta Bricolage ──
  { id: 'V23-45-peso-short', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Prueba de peso exigida por el gate: ideaShort 740 contra ideaImpact 780 de V01.',
    capas: [titular({ texto: 'El oficio manda.', receta: 'ideaShort' }), firma()] },

  { id: 'V24-45-peso-condensado', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Mismo peso, ancho condensado 78 (eje autorizado 75–100): registro de cartel.',
    capas: [titular({ texto: 'El oficio manda.', ancho: 78 }), firma()] }
]

// ══ Segunda tanda: rotación, tintas de paleta, caja sobre objeto real y escala ═════════════════
export const piezas2 = [
  // ── Guttery rotado: la anotación a mano que el titular no puede dar ──
  { id: 'V29-45-enfasis-obra', formato: '4:5', plate: P.equipo45, campo: 'oscuro',
    nota: 'Era caja sobre las pruebas impresas. MEDIDO: en este plate el trazo no llega al piso en ningún objeto (1.0–2.5:1 bajo la franja de texto). La caja pasa a enfatizar la palabra «obra», que es donde vive el sentido.',
    capas: [titular({ texto: 'La obra, a la [[vista]].', objetivo: 0.56, acento: 'fuerte' }),
      enfasis({ cursores: [colab('arte', 'Arte', 'top-end'), local()],
        presentacion: { participantColors: { arte: CURSOR.arte } } }), firma()] },

  { id: 'V30-45-enfasis-aprueba', formato: '4:5', plate: P.equipo45, campo: 'oscuro',
    nota: 'Cliente (lima = el resultado) actuando sobre la palabra «Aprobado», más el gesto que lo confirma. La caja se mudó del objeto al texto por la misma medición.',
    capas: [titular({ texto: '[[Aprobado]] aquí.', objetivo: 0.5, acento: 'fuerte' }),
      enfasis({ cursores: [colab('cliente', 'Cliente', 'top-end'), local()],
        presentacion: { participantColors: { cliente: CURSOR.cliente } } }), firma()] },

  { id: 'V31-45-caja-objeto-clawd', formato: '4:5', plate: P.estudio45, campo: 'oscuro',
    nota: 'Era caja sobre Clawd. MEDIDO: el perímetro de la mascota da 1.06–1.18:1 contra el trazo — está sobre el set encendido. La caja enmarca «herramienta», que es la decisión.',
    capas: [titular({ texto: 'Elegimos la [[herramienta]].', objetivo: 0.56, acento: 'fuerte' }),
      enfasis({ cursores: [colab('arte', 'Arte', 'top-end'), local()],
        presentacion: { participantColors: { arte: CURSOR.arte } } }), firma()] },

  { id: 'V32-45-caja-objeto-masas', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Era caja sobre las masas. MEDIDO: 1.6–1.84:1; probé además el rig de cámara (2.58) y el canasto (1.12) y ninguno llega. En este plate no hay objeto sobre campo oscuro: la caja va al texto.',
    capas: [titular({ texto: 'El [[oficio]] manda.', objetivo: 0.52, acento: 'fuerte' }),
      enfasis({ cursores: [local()] }), firma()] },

  { id: 'V33-916-enfasis-obra', formato: '9:16', plate: P.equipo916, campo: 'oscuro',
    nota: 'Vertical: la caja enfatiza «obra» y el cursor moving da presencia del equipo sin una segunda selección. El objeto no podía llevarla por la misma medición del plate.',
    capas: [titular({ texto: 'La obra, a la [[vista]].', top: 0.115, objetivo: 0.6, acento: 'fuerte' }),
      // El magenta de Nexa es identidad y no se cambia; lo que se busca es DÓNDE cabe. Probadas las
      // nueve regiones del contrato sobre este plate, sólo `center-end` lo sostiene (4.05:1); el
      // resto cae entre 1.77 y 2.77 sobre la escena cálida.
      enfasis({ anclas: 'auto', cursores: [local(null), moving('nexa', 'Nexa', 'center-end')],
        presentacion: { participantColors: { nexa: CURSOR.nexa } } }), firma(0.875)] },

  { id: 'V34-169-enfasis-decide', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'Era el último caja-sobre-objeto en pie. Al medir el perímetro COMPLETO (y no sólo arriba y abajo) su costado cae a 1.81:1: el objeto está recortado contra el set encendido. Pasa a énfasis de texto.',
    capas: [titular({ texto: 'Aquí se [[decide]].', objetivo: 0.34, top: 0.13, min: 0.07, max: 0.14, acento: 'fuerte' }),
      enfasis({ cursores: [colab('efeonce', 'Efeonce', 'top-end'), local()],
        presentacion: { participantColors: { efeonce: CURSOR.efeonce } } }), firma(0.92)] },

  // ── Tintas de la paleta Efeonce dentro del texto ──
  { id: 'V35-45-acento-azul', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Acento en AZUL CASA (#0375db, «la casa»): el único color de marca que puede ir en todas las piezas.',
    capas: [titular({ texto: 'El [[oficio]] manda.', objetivo: 0.56, acento: 'azulClaro' }), firma()] },

  { id: 'V36-916-acento-lima', formato: '9:16', plate: P.panaderia916, campo: 'oscuro',
    nota: 'Acento en LIMA («el resultado»): acento único de la pieza, medido aparte sobre campo oscuro.',
    capas: [titular({ texto: 'El oficio [[manda]].', top: 0.16, objetivo: 0.62, acento: 'lima' }), firma(0.875)] },

  { id: 'V37-45-acento-teal', formato: '4:5', plate: P.estudio45, campo: 'oscuro',
    nota: 'Sobre el set azul, el acento sale de la rampa secundaria (teal claro): no compite con el campo.',
    capas: [titular({ texto: '[[Aquí]] se decide.', objetivo: 0.54, acento: 'tealClaro' }), firma()] },

  { id: 'V38-169-acento-y-gesto', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'Acento naranja en el titular + gesto en AZUL CASA rotado: dos colores, pero uno es «la casa», que no cuenta como segundo acento.',
    capas: [titular({ texto: '[[Aquí]] se decide.', objetivo: 0.34, top: 0.1, min: 0.07, max: 0.14 }),

  // ── Escala y composición ──,
      firma(0.92)] },

  { id: 'V39-45-escala-extrema', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Escala extrema: dos palabras al tope de la banda medida (0.181 del alto, el máximo del archivo aprobado).',
    capas: [titular({ texto: 'Se nota.', objetivo: 0.62, max: 0.181, top: 0.115 }), firma()] },

  { id: 'V40-916-dos-lineas', formato: '9:16', plate: P.estudio916, campo: 'oscuro',
    nota: 'Titular en dos líneas con alineación propia por línea: apilado de cartel, medido línea por línea.',
    capas: [{ ...titular({ texto: 'Aquí|se decide.', top: 0.13, objetivo: 0.52 }),
      alinearLineas: 'propia', xLineas: [null, { frac: 0.18 }] }, firma(0.875)] },

  { id: 'V41-169-dos-lineas', formato: '16:9', plate: P.panaderia169, campo: 'oscuro',
    nota: 'Horizontal en dos líneas al costado, con la segunda sangrada.',
    capas: [{ ...titular({ texto: 'El oficio|manda.', x: { frac: 0.06 }, objetivo: 0.26, top: 0.2, min: 0.08, max: 0.16 }),
      alinearLineas: 'propia', xLineas: [null, { frac: 0.1 }] }, firma(0.92)] },

  { id: 'V42-45-todo-junto', formato: '4:5', plate: P.equipo45, campo: 'oscuro',
    nota: 'Recursos apilados SIN gesto. «en revisión» se retiró por decisión del operador: no aportaba a la narrativa y generaba asimetría. Y en rigor nunca fue un gesto, era una etiqueta de estado sin hablante. El canon respalda retirarla: «la omisión de Guttery es una decisión positiva».',
    capas: [
      titular({ texto: 'La obra, a la [[vista]].', x: { frac: 0.075 }, objetivo: 0.56, top: 0.125, acento: 'fuerte' }),
      enfasis({ cursores: [colab('cliente', 'Cliente', 'top-end'), local()],
        presentacion: { participantColors: { cliente: CURSOR.cliente } } }),
      firma()] },

  // ── Riesgo declarado ──
  { id: 'V43-916-titular-rot4', formato: '9:16', plate: P.panaderia916, campo: 'oscuro',
    nota: 'RIESGO: el titular rotado −4°. Se prueba porque el operador pidió rotación; si se lee como error de montaje, se descarta.',
    capas: [{ ...titular({ texto: 'El oficio manda.', top: 0.15, objetivo: 0.6 }), rotacion: -4 }, firma(0.875)] },

  { id: 'V44-45-titular-vertical', formato: '4:5', plate: P.estudio45, campo: 'oscuro',
    nota: 'RIESGO: titular vertical a −90° en el costado. Registro editorial de cartel; se descarta si compite con el sujeto.',
    capas: [{ ...titular({ texto: 'Aquí se decide.', objetivo: 0.44, top: 0.3, x: { frac: -0.06 } }), rotacion: -90 }, firma()] }
]

// ══ Tercera tanda ═════════════════════════════════════════════════════════════════════════════
// Directiva del operador: si la caja sobre un objeto de la foto no selecciona nada legible, entonces
// la caja, el cursor local, el multiplayer y el standalone se usan para **enfatizar texto y guiar la
// vista del lector**. Acá la caja envuelve UNA PALABRA marcada con `[[…]]`.
//
// La palabra enmarcada NO se recolorea (`acento: 'fuerte'`): el énfasis lo carga la caja, no la tinta.
// Doble énfasis (caja + color) se prueba una sola vez, en V58, para comparar.
//
// Guttery va bajo contrato medido en el caso aprobado: 0.039–0.050 del alto, rotada −6° a −10°,
// SIEMPRE blanca, reacción humana de hasta 3 palabras. El motor lo exige.

export const piezas3 = [
  // ── 4:5 ──
  { id: 'V45-45-enfasis-local', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'La caja envuelve la palabra «oficio» y el cursor local apunta a ella: el énfasis lo carga la caja, no el color.',
    capas: [titular({ texto: 'El [[oficio]] manda.', objetivo: 0.58, acento: 'fuerte' }),
      enfasis({ cursores: [local()] }), firma()] },

  { id: 'V46-45-enfasis-1colab', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Misma palabra enmarcada, con un colaborador actuando sobre ella: dos puntos de atención en el mismo lugar.',
    capas: [titular({ texto: 'El oficio [[manda]].', objetivo: 0.5, acento: 'fuerte' }),
      enfasis({ cursores: [colab('arte', 'Arte', 'top-end'), local()],
        presentacion: { participantColors: { arte: CURSOR.arte } } }), firma()] },

  { id: 'V47-45-enfasis-escala', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Escala grande con una sola palabra enmarcada y un cursor standalone en movimiento abajo.',
    capas: [titular({ texto: 'Se [[nota]].', objetivo: 0.6, max: 0.181, top: 0.115, acento: 'fuerte' }),
      enfasis({ cursores: [local(), moving('nexa', 'Nexa')],
        presentacion: { participantColors: { nexa: CURSOR.nexa } } }), firma()] },

  { id: 'V48-45-enfasis-2colab', formato: '4:5', plate: P.equipo45, campo: 'oscuro',
    nota: 'Dos colaboradores sobre la misma palabra: el aire lateral se paga dos veces, por eso el titular se angosta.',
    capas: [titular({ texto: 'La obra, a la [[vista]].', objetivo: 0.5, acento: 'fuerte' }),
      enfasis({ cursores: [colab('arte', 'Arte'), colab('cliente', 'Cliente', 'top-end'), local()],
        presentacion: { participantColors: { arte: CURSOR.arte, cliente: CURSOR.cliente } } }), firma()] },

  { id: 'V49-45-enfasis-guttery', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'Caja de énfasis + Guttery bajo contrato: reacción humana de dos palabras, 0.045 del alto, −8°, blanca.',
    capas: [titular({ texto: 'El [[oficio]] manda.', objetivo: 0.52, acento: 'fuerte' }),
      enfasis({ cursores: [local()] }), firma()] },

  // ── 9:16 ──
  { id: 'V50-916-enfasis-local', formato: '9:16', plate: P.panaderia916, campo: 'oscuro',
    nota: 'Vertical: palabra enmarcada con cursor local.',
    capas: [titular({ texto: 'El [[oficio]] manda.', top: 0.16, objetivo: 0.62, acento: 'fuerte' }),
      enfasis({ cursores: [local()] }), firma(0.875)] },

  { id: 'V51-916-enfasis-moving', formato: '9:16', plate: P.estudio916, campo: 'oscuro',
    nota: 'Palabra enmarcada + cursor standalone en movimiento: presencia del equipo sin una segunda selección.',
    capas: [titular({ texto: 'Aquí se [[decide]].', top: 0.15, objetivo: 0.6, acento: 'fuerte' }),
      enfasis({ cursores: [local(), moving('nexa', 'Nexa')],
        presentacion: { participantColors: { nexa: CURSOR.nexa } } }), firma(0.875)] },

  { id: 'V52-916-enfasis-dos-lineas', formato: '9:16', plate: P.estudio916, campo: 'oscuro',
    nota: 'Apilado de cartel con la palabra de la segunda línea enmarcada: la caja marca dónde termina la frase.',
    capas: [{ ...titular({ texto: 'Aquí|se [[decide]].', top: 0.13, objetivo: 0.52, acento: 'fuerte' }),
      alinearLineas: 'propia', xLineas: [null, { frac: 0.18 }] },
      enfasis({ cursores: [local()] }), firma(0.875)] },

  { id: 'V53-916-enfasis-guttery', formato: '9:16', plate: P.panaderia916, campo: 'oscuro',
    nota: 'Vertical con caja de énfasis y Guttery bajo contrato.',
    capas: [titular({ texto: 'El [[oficio]] manda.', top: 0.145, objetivo: 0.58, acento: 'fuerte' }),
      enfasis({ cursores: [local()] }), firma(0.875)] },

  // ── 16:9 ──
  { id: 'V54-169-enfasis-local', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'Horizontal: palabra enmarcada, cursor local.',
    capas: [titular({ texto: 'Aquí se [[decide]].', objetivo: 0.36, top: 0.12, min: 0.07, max: 0.14, acento: 'fuerte' }),
      enfasis({ cursores: [local()] }), firma(0.92)] },

  { id: 'V55-169-enfasis-2colab', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'El horizontal es donde más aire lateral hay: dos colaboradores sobre la misma palabra.',
    capas: [titular({ texto: 'Aquí se [[decide]].', objetivo: 0.3, top: 0.13, min: 0.07, max: 0.14, acento: 'fuerte' }),
      enfasis({ cursores: [colab('arte', 'Arte'), colab('cliente', 'Cliente', 'top-end'), local()],
        presentacion: { participantColors: { arte: CURSOR.arte, cliente: CURSOR.cliente } } }), firma(0.92)] },

  { id: 'V56-169-enfasis-costado', formato: '16:9', plate: P.panaderia169, campo: 'oscuro',
    nota: 'Titular al costado izquierdo con la palabra enmarcada: el sujeto vive a la derecha.',
    capas: [titular({ texto: 'El [[oficio]] manda.', x: { frac: 0.06 }, objetivo: 0.3, top: 0.28, min: 0.08, max: 0.16, acento: 'fuerte' }),
      enfasis({ cursores: [local()] }), firma(0.92)] },

  { id: 'V57-169-enfasis-completo', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'Caja de énfasis + Guttery bajo contrato + cursor standalone: los tres recursos apuntando al mismo lugar.',
    capas: [titular({ texto: 'Aquí se [[decide]].', objetivo: 0.34, top: 0.14, min: 0.07, max: 0.14, acento: 'fuerte' }),
      enfasis({ cursores: [local(), moving('nexa', 'Nexa', 'lower-end')],
        presentacion: { participantColors: { nexa: CURSOR.nexa } } }), firma(0.92)] },

  { id: 'V58-169-enfasis-doble', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'CONTRASTE DE MÉTODO: la misma palabra con caja Y color naranja. Sirve para decidir si el doble énfasis suma o compite.',
    capas: [titular({ texto: 'Aquí se [[decide]].', objetivo: 0.36, top: 0.12, min: 0.07, max: 0.14 }),
      enfasis({ cursores: [local()] }), firma(0.92)] }
]

// ══ Cuarta tanda ══════════════════════════════════════════════════════════════════════════════
// Demuestra dos cosas en vez de afirmarlas:
//  1. Guttery NO tiene que ser siempre blanca. Sobre campo claro toma tinta de la paleta, y puede
//     crecer o rotar más de lo observado, siempre que pase contraste y declare su propósito.
//  2. La caja tiene más variantes en el contrato que los ocho tiradores. `open-brackets` es la más
//     liviana y la que menos compite con la tinta: para enfatizar UNA PALABRA debería ganar.
export const piezas4 = [
  { id: 'V61-45-brackets', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'La MISMA palabra enmarcada con `open-brackets` en vez de ocho tiradores: menos aparato, misma guía de lectura.',
    capas: [titular({ texto: 'El [[oficio]] manda.', objetivo: 0.58, acento: 'fuerte' }),
      { ...enfasis({ cursores: [local()] }), variante: 'open-brackets' }, firma()] },

  { id: 'V62-45-four-corners', formato: '4:5', plate: P.panaderia45, campo: 'oscuro',
    nota: 'La misma palabra con `four-corners`: el punto medio entre brackets y ocho tiradores.',
    capas: [titular({ texto: 'El [[oficio]] manda.', objetivo: 0.58, acento: 'fuerte' }),
      { ...enfasis({ cursores: [local()] }), variante: 'four-corners' }, firma()] },

  { id: 'V63-916-brackets-colab', formato: '9:16', plate: P.estudio916, campo: 'oscuro',
    nota: 'Brackets sobre la palabra con un colaborador actuando; el motor elige las anclas que pasan la evidencia.',
    capas: [titular({ texto: 'Aquí se [[decide]].', top: 0.15, objetivo: 0.58, acento: 'fuerte' }),
      { ...enfasis({ cursores: [colab('arte', 'Arte', null), local()], presentacion: { participantColors: { arte: CURSOR.arte } } }), variante: 'open-brackets' },
      firma(0.875)] },

  { id: 'V64-169-brackets-moving', formato: '16:9', plate: P.estudio169, campo: 'oscuro',
    nota: 'Brackets sobre la palabra + cursor standalone en movimiento, en horizontal.',
    capas: [titular({ texto: 'Aquí se [[decide]].', objetivo: 0.36, top: 0.12, min: 0.07, max: 0.14, acento: 'fuerte' }),
      { ...enfasis({ cursores: [local(), moving('nexa', 'Nexa')], presentacion: { participantColors: { nexa: CURSOR.nexa } } }), variante: 'open-brackets' },
      firma(0.92)] }
]

// ══ Estudio de Guttery ════════════════════════════════════════════════════════════════════════
// Corrección del operador: «ese tipo de fuentes son de expresión o gesto; si están muy pequeñas o
// en un costado solas pequeñas tienden a dañar la composición por asimetría».
//
// Eso invalida cómo la venía usando: 0.25–0.30× el titular, colgada al margen opuesto. Un gesto
// expresivo necesita MASA y necesita estar DENTRO de la composición, encajado en el hueco que deja
// la bandera del titular, no huérfano en una esquina.
//
// El estudio cambia una variable a la vez sobre el mismo plate y el mismo titular: tamaño relativo
// al titular (0.30 → 0.75) y encaje (costado suelto · mellado en el hueco · bajo el titular centrado
// · cruzando el eje). El tamaño se declara RELATIVO al titular, no fijo: así el gesto conserva su
// peso frente a la voz que acompaña, en cualquier formato.

export const piezasG = [
]

// Confirmación del principio que ganó el estudio: el gesto no va «al lado», va en el HUECO que deja
// la bandera de un titular de dos líneas, a la altura óptica de la última. Con eso el bloque se lee
// como una sola mancha y desaparece la asimetría de la nota huérfana.
export const piezasG2 = [

]

// ══ V42: tres salidas ═════════════════════════════════════════════════════════════════════════
// El operador: «el texto en Guttery no funciona ni en esa posición ni el color».
// Diagnóstico: al pasar el titular a UNA línea desapareció el hueco de la bandera, que era la única
// razón por la que el gesto funcionaba. Volvió a ser una etiqueta al costado, el error original.
// Y hay una tensión estructural medida: el gesto-en-hueco necesita DOS líneas; el colaborador
// necesita la palabra enmarcada al final de línea con aire lateral. En 4:5 con este copy no caben
// los dos. Se construyen las tres salidas para decidir con el frame delante.
export const piezasV42 = [

]

