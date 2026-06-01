// Nexa home greeting catalog + selector.
//
// Voice: Nexa greeting the operator — warm, helpful, es-CL tuteo, sentence case,
// tied to "tu operación", no forced humor. `{name}` is optional: the loader
// drops the ", {name}" segment cleanly when there's no real first name.
//
// Variety is *context-aware*, not flat-random: a time-of-day backbone always
// applies, and contextual layers (weekday, month moment, southern-hemisphere
// season, Chilean holidays) surface occasionally so the greeting feels aware
// without being gimmicky. `pickHomeGreeting` is pure (injectable rng) → testable.

export type HomeGreetingTimeOfDay = 'madrugada' | 'manana' | 'tarde' | 'noche'
export type HomeGreetingSeason = 'verano' | 'otono' | 'invierno' | 'primavera'

export interface HomeGreetingCatalog {
  // Time-of-day backbone (always in the pool).
  madrugada: string[]
  manana: string[]
  tarde: string[]
  noche: string[]
  // Weekday flavor.
  lunes: string[]
  viernes: string[]
  finDeSemana: string[]
  // Operational month moment.
  inicioDeMes: string[]
  cierreDeMes: string[]
  // Southern-hemisphere season (Chile).
  verano: string[]
  otono: string[]
  invierno: string[]
  primavera: string[]
  // Chilean special dates (strong weight when active).
  anoNuevo: string[]
  fiestasPatrias: string[]
  navidad: string[]
}

export const HOME_GREETING_CATALOG: HomeGreetingCatalog = {
  madrugada: [
    'Trabajando hasta tarde, {name}. ¿En qué te ayudo?',
    '¿Qué necesitas a esta hora, {name}?',
    'Aquí estoy, aunque sea de madrugada, {name}.',
    'La operación nunca duerme, {name}. ¿Qué revisamos?',
    '¿Una última consulta antes de descansar, {name}?',
    'De turno contigo, {name}. ¿Qué buscas?'
  ],
  manana: [
    'Buenos días, {name}. ¿Empezamos?',
    '¿Qué priorizamos hoy, {name}?',
    '¿Con qué arrancamos, {name}?',
    'Tu operación te espera, {name}.',
    'Buen día, {name}. ¿Qué revisamos primero?',
    '¿Qué tienes en mente para hoy, {name}?',
    'Listo para arrancar, {name}. ¿Por dónde partimos?',
    '¿Cómo amanece la operación, {name}?',
    'A darle a la mañana, {name}. ¿En qué te ayudo?',
    'Café en mano, {name}. ¿Qué necesitas?',
    '¿Qué quieres resolver esta mañana, {name}?',
    'Arrancamos el día, {name}. Pregúntame lo que necesites.'
  ],
  tarde: [
    '¿Cómo va la tarde, {name}?',
    'Sigamos avanzando, {name}.',
    '¿En qué te ayudo esta tarde, {name}?',
    '¿Qué falta para hoy, {name}?',
    'A media jornada, {name}. ¿Qué revisamos?',
    '¿Cómo viene el día, {name}?',
    'Aquí seguimos, {name}. ¿Qué necesitas?',
    '¿Retomamos algo pendiente, {name}?',
    '¿Qué quieres cerrar esta tarde, {name}?',
    'Buena tarde, {name}. ¿En qué andamos?',
    '¿Avanzamos con algo, {name}?',
    'Tu operación al día, {name}. ¿Qué consultas?'
  ],
  noche: [
    'Cerrando el día, {name}. ¿Algo pendiente?',
    '¿Última consulta del día, {name}?',
    'Buenas noches, {name}. ¿En qué te ayudo?',
    '¿Cómo cerramos la jornada, {name}?',
    '¿Quedó algo por revisar, {name}?',
    'Recta final del día, {name}. ¿Qué necesitas?',
    '¿Repasamos antes de cerrar, {name}?',
    'Buena noche, {name}. ¿Qué te quedó pendiente?',
    '¿Algo más antes de terminar, {name}?',
    'Cerrando con calma, {name}. ¿En qué te ayudo?'
  ],
  lunes: [
    'Arranca la semana, {name}. ¿Por dónde partimos?',
    'Nuevo lunes, {name}. ¿Qué priorizamos?',
    '¿Cómo se ve la semana, {name}?',
    'A planear la semana, {name}. ¿En qué te ayudo?',
    'Lunes de operación, {name}. ¿Qué revisamos?',
    'Empezamos semana, {name}. ¿Qué tienes en mente?'
  ],
  viernes: [
    'Viernes, {name}. ¿Qué cerramos antes del fin de semana?',
    'Recta final de la semana, {name}. ¿En qué te ayudo?',
    '¿Qué dejamos listo para el lunes, {name}?',
    'Cerrando la semana, {name}. ¿Algo pendiente?',
    'Casi fin de semana, {name}. ¿Qué revisamos?',
    '¿Cómo terminamos la semana, {name}?'
  ],
  finDeSemana: [
    'Fin de semana, {name}. Aquí sigo si me necesitas.',
    '¿Trabajando el finde, {name}? Cuéntame en qué te ayudo.',
    'Día de descanso, {name}, pero aquí estoy. ¿Qué buscas?',
    '¿Una vuelta rápida a la operación, {name}?',
    'Ritmo tranquilo hoy, {name}. ¿Qué necesitas?',
    'Aquí estoy aunque sea finde, {name}.'
  ],
  inicioDeMes: [
    'Nuevo mes, {name}. ¿Por dónde empezamos?',
    'Arranca el mes, {name}. ¿Qué planificamos?',
    'Mes nuevo, metas nuevas, {name}. ¿En qué te ayudo?',
    '¿Cómo abrimos el mes, {name}?',
    'Empezamos mes, {name}. ¿Qué revisamos primero?'
  ],
  cierreDeMes: [
    'Cierre de mes, {name}. ¿Qué falta por cuadrar?',
    '¿Cómo viene el cierre, {name}?',
    'Recta final del mes, {name}. ¿En qué te ayudo?',
    '¿Listos para cerrar el mes, {name}?',
    'A cuadrar el mes, {name}. ¿Qué revisamos?',
    '¿Qué dejamos cerrado este mes, {name}?'
  ],
  verano: [
    'Verano en marcha, {name}. ¿En qué te ayudo?',
    'Ritmo de verano, {name}. ¿Qué revisamos?',
    'Con calor y todo, aquí seguimos, {name}.',
    '¿Cómo va la operación de verano, {name}?',
    'Días largos, {name}. ¿Qué priorizamos?'
  ],
  otono: [
    'Otoño, {name}. ¿Por dónde seguimos?',
    'A retomar el ritmo, {name}. ¿En qué te ayudo?',
    '¿Cómo va todo este otoño, {name}?',
    'Temporada de avanzar, {name}. ¿Qué revisamos?',
    'Buen otoño, {name}. ¿Qué tienes en mente?'
  ],
  invierno: [
    'Invierno, {name}. ¿Qué revisamos hoy?',
    'Con frío afuera, operación adentro, {name}.',
    '¿Cómo va todo este invierno, {name}?',
    'Día de invierno, {name}. ¿En qué te ayudo?',
    'A mantener el ritmo, {name}. ¿Qué necesitas?'
  ],
  primavera: [
    'Primavera, {name}. ¿Con qué seguimos?',
    'Buen aire de primavera, {name}. ¿En qué te ayudo?',
    '¿Cómo va la operación esta primavera, {name}?',
    'Temporada de empuje, {name}. ¿Qué revisamos?',
    'Buena primavera, {name}. ¿Qué tienes en mente?'
  ],
  anoNuevo: [
    'Feliz año nuevo, {name}. ¿Arrancamos el año?',
    'Año nuevo, operación nueva, {name}. ¿Por dónde partimos?',
    '¿Cómo empezamos el año, {name}?'
  ],
  fiestasPatrias: [
    '¡Felices Fiestas Patrias, {name}! ¿En qué te ayudo?',
    'Semana dieciochera, {name}. ¿Qué dejamos listo?',
    '¿Algo que cerrar antes del 18, {name}?',
    'Fiestas Patrias, {name}. Aquí sigo si me necesitas.'
  ],
  navidad: [
    'Feliz Navidad, {name}. ¿En qué te ayudo?',
    'Tiempo de Navidad, {name}. ¿Algo pendiente?',
    'Felices fiestas, {name}. Aquí estoy si me necesitas.'
  ]
}

const resolveSouthernSeason = (month0: number): HomeGreetingSeason => {
  if (month0 === 11 || month0 <= 1) return 'verano' // dic–feb
  if (month0 <= 4) return 'otono' // mar–may
  if (month0 <= 7) return 'invierno' // jun–ago

  return 'primavera' // sep–nov
}

/**
 * Picks a context-aware greeting template (still containing `{name}`).
 *
 * Selection is weighted: the time-of-day pool is the backbone, season +
 * weekday + month-moment layers surface occasionally, and Chilean holidays
 * weigh strongly on their day. `rng` is injectable for deterministic tests.
 *
 * NOTE: uses the local fields of the passed `Date`. Callers that need
 * America/Santiago semantics should pass an appropriately-resolved date.
 */
export const pickHomeGreeting = (now: Date, rng: () => number = Math.random): string => {
  const hour = now.getHours()
  const month0 = now.getMonth()
  const day = now.getDate()
  const weekday = now.getDay()

  const timeOfDay: HomeGreetingTimeOfDay =
    hour < 5 ? 'madrugada' : hour < 12 ? 'manana' : hour < 19 ? 'tarde' : 'noche'

  const candidates: string[] = []

  const add = (pool: string[], weight: number) => {
    for (let i = 0; i < weight; i++) candidates.push(...pool)
  }

  // Backbone + ambient season flavor.
  add(HOME_GREETING_CATALOG[timeOfDay], 3)
  add(HOME_GREETING_CATALOG[resolveSouthernSeason(month0)], 1)

  // Weekday flavor.
  if (weekday === 1) add(HOME_GREETING_CATALOG.lunes, 2)
  else if (weekday === 5) add(HOME_GREETING_CATALOG.viernes, 2)
  else if (weekday === 0 || weekday === 6) add(HOME_GREETING_CATALOG.finDeSemana, 2)

  // Operational month moment.
  const lastDay = new Date(now.getFullYear(), month0 + 1, 0).getDate()

  if (day <= 3) add(HOME_GREETING_CATALOG.inicioDeMes, 2)
  else if (day >= lastDay - 2) add(HOME_GREETING_CATALOG.cierreDeMes, 2)

  // Chilean special dates — strong (but not guaranteed) when active.
  if (month0 === 0 && day <= 2) add(HOME_GREETING_CATALOG.anoNuevo, 8)
  else if (month0 === 8 && day >= 17 && day <= 19) add(HOME_GREETING_CATALOG.fiestasPatrias, 8)
  else if (month0 === 11 && (day === 24 || day === 25)) add(HOME_GREETING_CATALOG.navidad, 8)

  const index = Math.floor(rng() * candidates.length)

  return candidates[index] ?? HOME_GREETING_CATALOG[timeOfDay][0]
}

export const HOME_SUBTITLE = 'Tu operación al alcance de una pregunta.'

export const HOME_DISCLAIMER = 'Nexa usa IA generativa. Verifica la información importante.'
