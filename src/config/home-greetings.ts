export interface HomeGreeting {
  morning: string[]
  afternoon: string[]
  evening: string[]
  default: string[]
}

export const HOME_GREETINGS: HomeGreeting = {
  morning: [
    '¿Qué revisamos hoy, {name}?',
    'Buenos días, {name}. ¿Empezamos?',
    'Tu operación te espera, {name}.'
  ],
  afternoon: [
    '¿Cómo va la tarde, {name}?',
    '¿En qué te ayudo, {name}?',
    'Sigamos avanzando, {name}.'
  ],
  evening: [
    'Cerrando el día, {name}. ¿Algo pendiente?',
    '¿Última consulta del día, {name}?'
  ],
  default: [
    '¿En qué te ayudo, {name}?',
    'Tu operación al alcance, {name}.'
  ]
}

export const HOME_SUBTITLE = 'Tu operación al alcance de una pregunta.'

export const HOME_DISCLAIMER = 'Nexa usa IA generativa. Verifica la información importante.'
