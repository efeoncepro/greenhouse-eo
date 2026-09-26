// MATERIA DE LA RESERVA, por toma. Propuesta para revisión del operador (2026-09-20).
//
// Regla, tras la corrección del operador: el tono no se decide por regla global. Se elige una
// SUPERFICIE REAL de la escena y el tono sale de ella. Una reserva oscura está perfecta cuando
// la superficie oscura existe; lo prohibido es la reserva sin materia, en cualquier tono.
//
// `origen` dice de dónde sale la materia:
//   ya-en-la-ficha  → la escena ya la nombra; sólo hay que citarla
//   escrita         → hay que AÑADIRLA a la escena con un motivo por el que está ahí
//   sin-reserva     → esta toma no admite reserva lateral (el catálogo ya lo dice)
export const MATERIAS = {
  1: { estado: 'identidad', claro: 'the bare warm oak tabletop beside the storyboard frames', oscuro: 'the side of the oak table that the low raking sun does not reach, in warm shadow', origen: 'ya-en-la-ficha', nota: 'la luz rasante de lado ya parte la mesa en dos: las dos materias existen' },
  2: { estado: 'identidad', claro: 'the plain pale studio ceiling curving above the round table', origen: 'ya-en-la-ficha', nota: 'ojo de pez: la reserva es la banda superior, no el costado' },
  3: { estado: 'identidad', claro: 'the plain pale studio ceiling curving above the round table', origen: 'ya-en-la-ficha' },
  4: { sinMargen: true, claro: 'the plain pale studio ceiling above the group', origen: 'ya-en-la-ficha', nota: 'el catálogo la excluye de MARGIN FIELD; sólo banda superior' },
  5: { sinMargen: true, claro: 'the bare pale paving of the plaza with nothing standing on it', origen: 'ya-en-la-ficha', nota: 'cenital; la reserva es suelo vacío, no un costado' },
  6: { oscuro: 'the crisp hard-edged shadow the building casts across the pale pavement', claro: 'the bare sunlit pale pavement', origen: 'ya-en-la-ficha', nota: 'la ficha ya pide «crisp graphic black shadows»: la sombra ES la toma' },
  7: { estado: 'identidad', oscuro: 'the plain dark-painted industrial ceiling between the skylights', origen: 'ya-en-la-ficha', nota: 'contrapicado: la reserva es el techo' },
  8: { oscuro: 'the matte charcoal mullion and glass of the meeting-room wall in shadow', origen: 'ya-en-la-ficha', estado: 'probada-ok' },
  9: { oscuro: 'the creamy compressed shadow of the far building across the street', origen: 'escrita', nota: 'tele 200: el fondo cremoso ya está; hay que decir que ese lado está en sombra' },
  10: { sinMargen: true, claro: 'the clean dry white wall the roller has not painted yet', origen: 'ya-en-la-ficha', nota: 'macro; la mitad seca del muro ES la reserva, ya existe' },
  11: { estado: 'identidad', oscuro: 'the plain wall beside the window that the blind slats leave in one unbroken band of shadow', origen: 'escrita', nota: 'RIESGO: las franjas de persiana cruzan la banda; hay que pedir explícito que ahí caiga una sola sombra continua' },
  12: { oscuro: 'the dark corridor wall beside the open doorway', origen: 'ya-en-la-ficha', estado: 'probada-ok' },
  13: { claro: 'the bare pale polished concrete wall of the gallery', oscuro: 'the shadowed side of a deep concrete structural pier that the gallery daylight does not reach', origen: 'escrita', estado: 'probada-ok', nota: 'las dos versiones probadas hoy; la oscura fue la contraprueba de que el arreglo es la materia' },
  14: { sinMargen: true, sinReserva: true, origen: 'sin-reserva', nota: 'barrido: todo el costado es blur en movimiento, no hay superficie pareja. El catálogo ya la excluye. La voz secundaria va en otra parte o no va' },
  15: { oscuro: 'the unlit interior studio wall beside the night window, in deep shadow but keeping visible texture (never pure black)', origen: 'ya-en-la-ficha', estado: 'probada-ok' },
  16: { oscuro: 'the plain dark felt of the presentation board where nothing is pinned yet', origen: 'ya-en-la-ficha' },
  17: { claro: 'the bare pale oak tabletop running away from the lens', origen: 'ya-en-la-ficha', nota: 'la sujeto vive en el tercio derecho: el costado izquierdo ya es mesa vacía' },
  18: { claro: 'the plain pale office wall beside the window', origen: 'escrita', nota: 'oficina luminosa de Miami; el muro liso hay que nombrarlo, la ficha sólo habla de ventana' },
  19: { claro: 'the empty warm-white surface of the light table', origen: 'ya-en-la-ficha', estado: 'probada-ok' },
  20: { estado: 'sin-verbatim', origen: 'sin-reserva', nota: 'su ficha no trae bloque SCENE, sólo cámara y primer plano: no se puede componer sin escribirle la escena' }
}

if (process.argv[1].endsWith('materias.mjs')) {
  const M = { claro: '☀ claro', oscuro: '☾ oscuro' }
  console.log('\n  toma  tono(s)            origen           materia propuesta\n')
  for (const [n, e] of Object.entries(MATERIAS)) {
    const tonos = ['oscuro', 'claro'].filter(t => e[t]).map(t => M[t]).join(' + ') || '—'
    const txt = e.oscuro ?? e.claro ?? '(ninguna)'
    console.log(
      ` T${n}`.padEnd(6), tonos.padEnd(19), e.origen.padEnd(16),
      txt.slice(0, 74) + (txt.length > 74 ? '…' : '')
    )
    if (e.nota) console.log(' '.repeat(43) + '↳ ' + e.nota)
  }
  const c = o => Object.values(MATERIAS).filter(e => e.origen === o).length
  console.log(
    `\n  ya-en-la-ficha ${c('ya-en-la-ficha')} · escrita ${c('escrita')} · sin-reserva ${c('sin-reserva')}`,
    `\n  con variante oscura: ${Object.values(MATERIAS).filter(e => e.oscuro).length} · sólo clara: ${Object.values(MATERIAS).filter(e => e.claro && !e.oscuro).length}`,
    `\n  identidad real (necesitan referencias, no se generan aún): ${Object.values(MATERIAS).filter(e => e.estado === 'identidad').length}`
  )
}
