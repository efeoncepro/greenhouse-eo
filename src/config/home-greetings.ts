export interface HomeGreeting {
  morning: string[]
  afternoon: string[]
  evening: string[]
  default: string[]
}

export const HOME_GREETINGS: HomeGreeting = {
  morning: [
    'Buenos días, {name}. Rechequeemos juntos el pulso de hoy.',
    'Hola {name}, ¡qué gusto verte de nuevo! Listos para arrancar con todo.',
    'Buen día. Aquí tienes el panorama de tu operación.'
  ],
  afternoon: [
    'Buenas tardes, {name}. ¿Cómo va el ritmo del día?',
    'Hola {name}, aquí tienes tu Snapshot ejecutivo actualizado.',
    'Buenas tardes. Sigamos moviendo la aguja.'
  ],
  evening: [
    'Buenas noches, {name}. Repasemos el cierre de hoy.',
    'Hola {name}, un vistazo rápido a los últimos movimientos antes de cerrar.',
    'Casi terminando el día. Aquí tienes el resumen final.'
  ],
  default: [
    'Hola {name}, bienvenido a Greenhouse.',
    'Todo listo para seguir operando, {name}.'
  ]
}
