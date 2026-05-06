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
  auth: {
    verifyEmail: {
      heading: 'Confirma tu correo electrónico',
      greeting: name => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
      body: 'necesitamos verificar que esta dirección de correo te pertenece para completar la configuración de tu cuenta en Greenhouse.',
      validityPrefix: 'Haz clic en el siguiente botón para confirmar. El enlace es válido por ',
      validityBold: '24 horas',
      validitySuffix: '.',
      cta: 'Confirmar mi correo',
      disclaimer: 'Si no creaste una cuenta en Greenhouse, puedes ignorar este correo de forma segura.',
      fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
      previewText: 'Confirma tu correo para completar tu registro en Greenhouse'
    },
    magicLink: {
      heading: 'Acceso a Greenhouse',
      greeting: name => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
      body: 'usa el botón abajo para entrar a Greenhouse. Este enlace funciona una sola vez y expira en',
      validityBold: expiresInMinutes => `${expiresInMinutes} minutos`,
      cta: 'Entrar a Greenhouse',
      disclaimer: 'Si no solicitaste este correo, puedes ignorarlo. Tu cuenta sigue siendo segura.',
      fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
      previewText: expiresInMinutes => `Enlace de acceso mágico — válido por ${expiresInMinutes} minutos`
    },
    passwordReset: {
      heading: 'Restablece tu contraseña',
      greeting: name => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
      body: 'recibimos tu solicitud para cambiar la contraseña de tu cuenta en Greenhouse.',
      validityPrefix: 'Haz clic en el siguiente botón para elegir una nueva contraseña. El enlace es válido por ',
      validityBold: '1 hora',
      validitySuffix: ' y solo puede usarse una vez.',
      cta: 'Cambiar mi contraseña',
      disclaimer: 'Si no realizaste esta solicitud, no te preocupes — tu contraseña actual sigue siendo segura y no se ha modificado. Puedes ignorar este correo.',
      fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
      previewText: 'Solicitud de cambio de contraseña — enlace válido por 1 hora'
    },
    invitation: {
      heading: 'Te han invitado a Greenhouse',
      greeting: name => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
      bodyPrefix: 'te invitó a unirte al equipo de',
      bodySuffix: ' en Efeonce Greenhouse™, la plataforma de gestión y operaciones.',
      validityPrefix: 'Solo necesitas crear tu contraseña para activar tu cuenta. El enlace es válido por ',
      validityBold: '72 horas',
      validitySuffix: '.',
      cta: 'Activar mi cuenta',
      disclaimer: 'Si no esperabas esta invitación, puedes ignorar este correo de forma segura.',
      fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
      previewText: (inviter, client) => `${inviter} te invitó a ${client} en Greenhouse`
    }
  },
  genericNotification: {
    greeting: name => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
    defaultAction: 'Ver en Greenhouse',
    fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:'
  },
  notificationCategories: {
    delivery_update: {
      label: 'Delivery updates',
      description: 'Asset aprobado, entregado o con cambios solicitados'
    },
    sprint_milestone: {
      label: 'Hitos de ciclo',
      description: 'Inicio, cierre y alertas de ciclos de producción'
    },
    feedback_requested: {
      label: 'Feedback solicitado',
      description: 'Se necesita tu revisión o aprobación'
    },
    report_ready: {
      label: 'Reporte disponible',
      description: 'Tu reporte programado está listo para descargar'
    },
    leave_status: {
      label: 'Permisos',
      description: 'Solicitud de permiso aprobada o rechazada'
    },
    leave_review: {
      label: 'Revisión de permisos',
      description: 'Solicitudes pendientes de revisión por supervisor o HR'
    },
    payroll_ready: {
      label: 'Liquidación disponible',
      description: 'Tu liquidación del período está lista para revisión'
    },
    assignment_change: {
      label: 'Asignaciones',
      description: 'Nueva asignación o cambio de proyecto'
    },
    ico_alert: {
      label: 'Alertas ICO',
      description: 'Métrica ICO cruzó umbral de semáforo'
    },
    capacity_warning: {
      label: 'Capacidad del equipo',
      description: 'Utilización sobre 90% o riesgo de sobreasignación'
    },
    payroll_ops: {
      label: 'Operación de nómina',
      description: 'Hitos operativos de cálculo y revisión del período oficial'
    },
    finance_alert: {
      label: 'Alertas financieras',
      description: 'Pagos registrados, gastos significativos y cierre de período'
    },
    system_event: {
      label: 'Eventos del sistema',
      description: 'Nuevo usuario, sync fallido, cambio de configuración'
    }
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
