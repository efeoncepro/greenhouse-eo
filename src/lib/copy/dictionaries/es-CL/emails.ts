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
