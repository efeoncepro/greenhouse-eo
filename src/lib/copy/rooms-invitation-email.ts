/** TASK-2067: one invitation email, one channel; never describes email OTP as MFA. */
export const ROOMS_INVITATION_EMAIL_COPY = {
  subject: 'Tu invitación a Rooms — Efeonce',
  heading: 'Te invitaron a Rooms',
  body: (room: string) => `Abre la sala «${room}» e introduce este código para continuar.`,
  codeLabel: 'Tu código de acceso',
  validity: (minutes: number) => `El código vence en ${minutes} minutos y sólo se puede usar una vez.`,
  cta: 'Abrir Rooms',
  fallback: 'Si el botón no funciona, copia esta dirección en tu navegador:',
  disclaimer: 'Esta invitación es personal. No compartas el enlace ni el código. Si no esperabas este correo, puedes ignorarlo.',
  preview: 'Entra a tu sala con el enlace y el código de este correo.'
} as const
