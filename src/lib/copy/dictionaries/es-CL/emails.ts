import type { EmailsCopy } from '../../types'

export const emails: EmailsCopy = {
  layout: {
    logoAlt: 'Efeonce Greenhouse — Plataforma de gestión',
    tagline: 'Efeonce Greenhouse™ · Empower your Growth',
    automatedDisclaimer: 'Este es un correo automático. Si tienes dudas, contacta a tu administrador.',
    unsubscribe: 'Dejar de recibir estos correos'
  },
  common: {
    brandSignature: '— Greenhouse by Efeonce Group',
    linkLabel: 'Enlace'
  },
  subjects: {
    passwordReset: 'Restablece tu contraseña — Greenhouse',
    magicLink: minutes => `Acceso a Greenhouse — enlace válido ${minutes} min`,
    invitation: 'Te invitaron a Greenhouse — Efeonce',
    verifyEmail: 'Confirma tu correo — Greenhouse',
    payrollExport: (periodLabel, entryCount) => `Nómina cerrada — ${periodLabel} · ${entryCount} colaboradores`,
    payrollReceipt: periodLabel => `Tu recibo de nómina — ${periodLabel}`,
    payrollLiquidacionV2: periodLabel => `Tu liquidación de ${periodLabel} fue actualizada`,
    payrollPaymentCommitted: periodLabel => `Tu pago de ${periodLabel} está programado`,
    payrollPaymentCancelled: periodLabel => `Actualización sobre tu pago de ${periodLabel}`,
    beneficiaryPaymentProfileChanged: {
      created: 'Solicitud de cambio de cuenta de pago registrada',
      approved: 'Tu cuenta de pago fue aprobada',
      superseded: 'Tu cuenta de pago fue reemplazada',
      cancelled: 'Tu solicitud de cambio fue cancelada'
    },
    weeklyExecutiveDigest: periodLabel => `Digest ejecutivo — ${periodLabel}`,
    leaveRequestDecision: leaveTypeName => `Actualización de permiso — ${leaveTypeName}`,
    leaveReviewConfirmation: leaveTypeName => `Revisión registrada — ${leaveTypeName}`,
    leaveRequestSubmitted: leaveTypeName => `Solicitud de permiso enviada — ${leaveTypeName}`,
    leaveRequestPendingReview: (memberName, leaveTypeName) => `${memberName} — ${leaveTypeName}`,
    quoteShare: quotationNumber => `Propuesta ${quotationNumber} lista para revisión`
  }
}
