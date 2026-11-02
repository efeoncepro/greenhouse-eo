import { GH_AUTH_SERVER } from './auth-server'

/**
 * Titulares y textos de las pantallas de Efeonce ID con la órbita (canvas aprobado por el operador, 2026-11-02).
 *
 * Cada titular va en Bricolage con contraste de pesos: `lead` liviano introduce y `key` manda. El punto final no se
 * escribe: lo pone el render (punto tipeado con panel, esfera en móvil). Los textos que no cambian siguen saliendo
 * de `GH_AUTH_SERVER`; acá sólo vive lo que el rediseño agregó o reescribió.
 */
export type OrbitHeading = { readonly lead: string; readonly key: string }

export const headingText = (heading: OrbitHeading): string => `${heading.lead} ${heading.key}`

export const AUTH_ORBIT_COPY = {
  brand: 'Efeonce ID',
  footnoteNotInitiated: 'Si no iniciaste esta conexión, cierra esta pestaña: nadie recibe acceso sin tu confirmación.',

  loginRequired: {
    heading: { lead: 'Primero,', key: 'entra a tu cuenta' },
    body: 'Para autorizar esta aplicación necesitas iniciar sesión con tu identidad de Efeonce. Después revisas los permisos que pide, antes de conceder nada.'
  },
  stepUpRequired: {
    heading: { lead: 'Confirma', key: 'que eres tú' },
    body: GH_AUTH_SERVER.step_up_required_body,
    hint: 'Es un paso extra porque escribir es más delicado que leer. Después revisas uno por uno los permisos que pide.',
    cta: 'Verificar con mi segundo factor',
    footnote: 'Si no iniciaste esta conexión, cancela: nadie recibe acceso sin tu confirmación.'
  },
  consent: {
    heading: { lead: 'Autoriza', key: 'el acceso' },
    clientLabel: 'Aplicación que pide acceso',
    unverifiedBadge: 'No verificada',
    scopesTitle: (count: number) => `Permisos que pide · ${count}`
  },
  error: {
    heading: { lead: 'No pudimos', key: 'completar la autorización' },
    recovery: 'Vuelve a la aplicación e inténtalo de nuevo. Si sigue pasando, avisa a quien la administra y comparte el código de abajo.'
  },
  internalError: {
    heading: { lead: 'No pudimos', key: 'completar el acceso corporativo' }
  },
  totp: {
    heading: { lead: 'Escribe', key: 'tu código' },
    body: 'Abre tu aplicación de autenticación y escribe el código de 6 dígitos que muestra ahora.',
    digitsLabel: 'Código de 6 dígitos',
    useBackup: 'Usar un código de respaldo',
    useDigits: 'Usar el código de la aplicación',
    backupLabel: 'Código de respaldo',
    or: 'o con un código',
    digit: (index: number) => `Dígito ${index} de 6`
  },
  enroll: {
    heading: { lead: 'Activa', key: 'tu segundo factor' },
    body: 'Tres pasos y queda listo. A partir de ahora, Efeonce ID te lo pedirá antes de conceder permisos de escritura.',
    step1: 'Escanea el código',
    step1Body: 'Con Microsoft Authenticator, Google Authenticator u otra aplicación de autenticación.',
    step2: 'Guarda tus códigos de respaldo',
    step2Body: 'Te sirven si pierdes el teléfono. Cada uno funciona una sola vez.',
    step3: 'Confirma con un código',
    step3Body: 'Escribe el código que muestra la aplicación ahora.'
  },
  magicSent: {
    heading: { lead: 'Revisa', key: 'tu correo' },
    footnote: '¿No te llegó? Revisa la carpeta de spam antes de pedir otro enlace.'
  },
  magicConfirm: {
    heading: { lead: 'Confirma', key: 'tu acceso' },
    footnote: 'Si no pediste este enlace, cierra esta pestaña: sin presionar el botón no pasa nada.'
  },
  linkProblem: {
    heading: { lead: 'Este enlace', key: 'ya no es válido' },
    footnote: 'Por seguridad, cada enlace funciona una sola vez y por poco tiempo.'
  },
  invitationConfirm: { heading: { lead: 'Activa', key: 'tu acceso' } },
  invitationAccepted: { heading: { lead: 'Revisa', key: 'tu correo' } },
  revoked: { heading: { lead: 'Tu acceso', key: 'ya no está activo' } },
  rateLimited: {
    heading: { lead: 'Demasiados', key: 'intentos' },
    footnote: 'Lo limitamos para proteger tu cuenta de intentos automáticos.'
  },
  sessionStarted: { heading: { lead: 'Listo,', key: 'ya entraste' }, word: ['Listo'] },
  sessionClosed: {
    heading: { lead: 'Cerraste', key: 'tu sesión' },
    body: 'Tu sesión de Efeonce ID terminó en este navegador. Ya puedes cerrar esta pestaña.',
    word: ['Hasta', 'pronto'],
    cta: 'Volver a entrar'
  },
  errorWord: ['De', 'nuevo']
} as const
