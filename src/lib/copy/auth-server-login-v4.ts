/** TASK-2064: issuer-specific copy for the approved V4 presentation. */
export const AUTH_LOGIN_V4_COPY = {
  neutralTitle: 'Entra a Efeonce',
  productTitle: (name: string) => `Entra a ${name}`,
  intro: 'Una cuenta para tus espacios de trabajo.',
  contextualIntro: 'Accede con tu cuenta Efeonce.',
  emailDivider: 'o recibe un enlace por correo',
  emailLabel: 'Email',
  emailPlaceholder: 'nombre@empresa.com',
  accessNote: 'El acceso a cada espacio depende de los permisos de tu cuenta.',
  footer: 'Identidad protegida por Efeonce ID',
  returnTo: (name: string) => `Volver a ${name}`,
  stageAlt: 'Dos personas trazan un plan sobre un vidrio',
  announcements: 'Novedades de Efeonce',
  pause: 'Pausar novedades',
  play: 'Reanudar novedades',
  slide: (index: number, count: number) => `Novedad ${index} de ${count}`
} as const
