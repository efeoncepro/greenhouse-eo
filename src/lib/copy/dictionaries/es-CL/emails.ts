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
  leave: {
    requestDecision: {
      heading: {
        approved: 'Solicitud aprobada',
        rejected: 'Solicitud no aprobada',
        cancelled: 'Solicitud cancelada'
      },
      greeting: name => `Hola ${name},`,
      body: {
        approved: (actor, type, days) => `${actor} aprobó tu solicitud de ${type} por ${days} ${days === 1 ? 'día' : 'días'}. Ya está registrada en el calendario del equipo.`,
        rejected: (actor, type) => `${actor} revisó tu solicitud de ${type} y no pudo aprobarla en esta oportunidad. Revisa las observaciones y, si lo necesitas, puedes enviar una nueva solicitud.`,
        cancelled: type => `Tu solicitud de ${type} fue cancelada. Los días reservados volvieron a tu saldo disponible.`
      },
      cardType: 'Tipo',
      cardFrom: 'Desde',
      cardTo: 'Hasta',
      cardDays: 'Días',
      statusBadge: {
        approved: 'Aprobado',
        rejected: 'Rechazado',
        cancelled: 'Cancelado'
      },
      notesHeader: 'Observaciones del revisor',
      cta: 'Ver mis permisos',
      fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
      daysUnit: days => days === 1 ? 'día' : 'días'
    },
    requestSubmitted: {
      heading: 'Solicitud enviada',
      greeting: name => `Hola ${name},`,
      body: (type, days) => `Tu solicitud de ${type} por ${days} ${days === 1 ? 'día' : 'días'} fue enviada y está pendiente de revisión. Te avisaremos cuando haya una decisión.`,
      cardType: 'Tipo',
      cardFrom: 'Desde',
      cardTo: 'Hasta',
      cardDays: 'Días',
      cardStatus: 'Estado',
      statusPending: 'Pendiente de revisión',
      reasonHeader: 'Tu motivo',
      cta: 'Ver mis permisos',
      fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
      daysUnit: days => days === 1 ? 'día' : 'días'
    },
    requestPendingReview: {
      heading: 'Solicitud de permiso por revisar',
      greeting: name => `Hola ${name},`,
      body: (member, type, days) => `${member} envió una solicitud de ${type} por ${days} ${days === 1 ? 'día' : 'días'} y necesita tu revisión. Aprueba o rechaza desde el panel de permisos.`,
      cardMember: 'Colaborador',
      cardType: 'Tipo',
      cardPeriod: 'Periodo',
      cardDays: 'Días',
      reasonHeader: 'Motivo de la solicitud',
      cta: 'Revisar solicitud',
      fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
      disclaimer: 'Recibes este correo porque eres revisor de solicitudes de permisos en Greenhouse.',
      daysUnit: days => days === 1 ? 'día' : 'días'
    },
    reviewConfirmation: {
      heading: {
        approved: 'Permiso aprobado',
        rejected: 'Permiso rechazado',
        cancelled: 'Permiso cancelado'
      },
      greeting: name => `Hola ${name},`,
      body: {
        approved: (member, type, days) => `Registramos tu aprobación de la solicitud de ${type} de ${member} por ${days} ${days === 1 ? 'día' : 'días'}. El colaborador ya fue notificado y el permiso aparece en el calendario del equipo.`,
        rejected: (member, type) => `Registramos tu decisión sobre la solicitud de ${type} de ${member}. El colaborador fue notificado y puede enviar una nueva solicitud si lo requiere.`,
        cancelled: (member, type) => `La solicitud de ${type} de ${member} fue cancelada. Los días reservados volvieron al saldo disponible del colaborador.`
      },
      cardMember: 'Colaborador',
      cardType: 'Tipo',
      cardPeriod: 'Periodo',
      cardDays: 'Días',
      cardStatus: 'Estado',
      statusBadge: {
        approved: 'Aprobado',
        rejected: 'Rechazado',
        cancelled: 'Cancelado'
      },
      notesHeader: 'Tus observaciones',
      reasonHeader: 'Motivo de la solicitud',
      cta: 'Ver permisos del equipo',
      fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
      disclaimer: 'Este correo confirma una acción que realizaste en Greenhouse. Si no reconoces esta acción, contacta al administrador de la plataforma de inmediato.',
      daysUnit: days => days === 1 ? 'día' : 'días'
    }
  },
  payroll: {
    exportReady: {
      previewText: (periodLabel, netTotalDisplay) => `Nómina ${periodLabel} cerrada — neto total ${netTotalDisplay}`,
      kickerPrefix: 'NÓMINA · ',
      heading: 'Nómina cerrada y lista para revisión',
      bodyPrefix: 'El período ',
      bodyEntryCountPrefix: ' fue cerrado con',
      bodyEntryCountLabel: 'colaboradores',
      bodyEntryCountStrongSuffix: ' colaboradores',
      bodyEntryCountSuffix: '. Adjuntamos el reporte y el detalle para tu revisión.',
      collaboratorsLabel: 'Colaboradores',
      grossLabel: 'Bruto',
      netLabel: 'Neto',
      netTotalLabel: 'Neto total a pagar',
      attachmentsHeading: 'Adjuntos incluidos',
      payrollReportTitle: 'Reporte de nómina (PDF)',
      payrollReportSubtitle: 'Resumen por colaborador en formato imprimible',
      payrollReportPlainTextSubtitle: 'resumen por colaborador',
      payrollDetailTitle: 'Detalle de nómina (CSV)',
      payrollDetailSubtitle: 'Desglose completo para contabilidad',
      payrollDetailPlainTextSubtitle: 'desglose completo para contabilidad',
      exportedByPrefix: 'Exportado por ',
      exportedByFallback: 'Greenhouse',
      exportedAtLabel: 'Fecha',
      cta: 'Ver nómina en Greenhouse',
      automatedFooter: 'Efeonce Group SpA · efeoncepro.com',
      plainTextSeparator: '═══════════════════',
      plainTextAttachments: 'ADJUNTOS',
      plainTextCta: 'Ver nómina en Greenhouse'
    },
    receipt: {
      previewText: periodLabel => `Tu recibo de nómina de ${periodLabel} ya está disponible`,
      heading: 'Liquidación de remuneraciones',
      greetingPrefix: 'Hola ',
      greetingPeriodPrefix: ', tu recibo de nómina de ',
      greetingSuffix: ' ya está listo. Te dejamos el resumen y adjuntamos el PDF para que puedas revisarlo cuando quieras.',
      regimeLabel: 'Régimen',
      regimeValue: 'Chile',
      currencyLabel: 'Moneda',
      grossLabel: 'Bruto',
      deductionsLabel: 'Descuentos',
      netLabel: 'Líquido',
      cta: 'Abrir mi nómina',
      pdfHelp: 'Si no ves el PDF adjunto, revisa la carpeta de descargas de tu correo o ingresa a Greenhouse desde el botón anterior.',
      automatedFooter: appUrl => `Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde ${appUrl}`
    },
    paymentCommitted: {
      previewText: periodLabel => `Tu pago de ${periodLabel} está programado`,
      heading: 'Tu pago está programado',
      greetingPrefix: 'Hola ',
      greetingPeriodPrefix: ', tu pago de ',
      greetingSuffix: ' fue aprobado por Tesorería y está programado para ejecutarse próximamente. Te enviaremos el recibo definitivo apenas se confirme el pago.',
      periodLabel: 'Período',
      scheduledForLabel: 'Fecha programada',
      processorLabel: 'Procesador',
      netLabel: 'Monto neto',
      cta: 'Ver mi nómina',
      informationalNotice: 'Esta notificación es solo informativa. El recibo formal con detalle de bruto, descuentos y neto se enviará cuando el pago se ejecute.',
      automatedFooter: appUrl => `Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde ${appUrl}`,
      fallbackScheduledFor: 'En los próximos días'
    },
    paymentCancelled: {
      previewText: periodLabel => `Actualización sobre tu pago de ${periodLabel}`,
      heading: 'Actualización sobre tu pago',
      bodyPrefix: 'Hola ',
      bodyPeriodPrefix: ', queremos avisarte que detectamos un problema con el pago programado de',
      bodyAmountPrefix: ' (',
      bodyAmountSuffix: '). Lo estamos resolviendo y te contactaremos en los próximos días con la actualización.',
      reasonLabel: 'Motivo:',
      apology: 'Disculpa el inconveniente. Tu equipo de operaciones ya está al tanto.',
      cta: 'Ver mi nómina',
      automatedFooter: appUrl => `Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde ${appUrl}`
    },
    liquidacionV2: {
      previewText: periodLabel => `Tu liquidación de ${periodLabel} fue actualizada`,
      heading: 'Actualizamos tu liquidación',
      bodyPrefix: 'Hola ',
      bodyPeriodPrefix: ', tu liquidación de ',
      bodySuffix: ' fue actualizada con una versión nueva. Esta versión reemplaza a la anterior y ya está disponible para que la revises en Greenhouse.',
      periodLabel: 'Período',
      currencyLabel: 'Moneda',
      previousNetLabel: 'Líquido anterior',
      updatedNetLabel: 'Líquido actualizado',
      differenceLabel: 'Diferencia',
      noNetChange: 'Sin cambios netos',
      cta: 'Ver liquidación actualizada',
      supportNote: 'Si tienes dudas sobre este ajuste, contacta al equipo de Personas — quedamos atentos para ayudarte a revisar los detalles.',
      automatedFooterPrefix: 'Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde '
    }
  },
  beneficiaryPaymentProfileChanged: {
    heading: {
      created: 'Solicitud de cambio registrada',
      approved: 'Tu cuenta de pago fue aprobada',
      superseded: 'Tu cuenta de pago fue reemplazada',
      cancelled: 'Tu solicitud de cambio fue cancelada'
    },
    previewText: {
      created: 'Tu solicitud está en revisión por finance',
      approved: 'Tu cuenta de pago quedó activa',
      superseded: 'Tu cuenta activa fue reemplazada por una nueva',
      cancelled: 'Tu solicitud fue cancelada'
    },
    intro: {
      created: (firstName, requestedByMember) =>
        requestedByMember
          ? `Hola ${firstName}, registramos tu solicitud de cambio de cuenta de pago. Finance la revisará en las próximas horas y recibirás otro mail cuando quede activa.`
          : `Hola ${firstName}, finance registró una nueva cuenta de pago para ti. Verifica que los datos sean correctos. Si no reconoces este cambio, responde este mail al equipo de finance de inmediato.`,
      approved: firstName =>
        `Hola ${firstName}, tu cuenta de pago quedó activa. Los próximos pagos se ejecutarán a esta cuenta.`,
      superseded: firstName =>
        `Hola ${firstName}, tu cuenta de pago activa fue reemplazada por una nueva. La cuenta anterior queda fuera de uso.`,
      cancelled: firstName =>
        `Hola ${firstName}, tu solicitud de cambio de cuenta de pago fue cancelada. Si no fuiste tú, contacta a finance.`
    },
    missingDate: 'Sin fecha registrada',
    providerLabel: 'Proveedor',
    bankLabel: 'Banco',
    accountLabel: 'Cuenta',
    currencyLabel: 'Moneda',
    cancelledDateLabel: 'Fecha de cancelación',
    effectiveDateLabel: 'Fecha efectiva',
    reasonLabel: 'Motivo',
    maskedFallback: '—',
    cta: 'Ver mi cuenta de pago',
    securityNotice: 'Por seguridad, NUNCA mostramos el número completo de tu cuenta. Si necesitas verificar el dato, ingresa al portal con tu sesión.',
    unrecognizedChangeNotice: 'Si no reconoces este cambio, responde este mail o contacta a finance de inmediato.',
    automatedFooterPrefix: 'Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde ',
    automatedFooter: appUrl => `Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde ${appUrl}`,
    plainText: {
      created: firstName => `Hola ${firstName}, registramos una solicitud de cambio en tu cuenta de pago. Finance la revisará pronto.`,
      approved: (firstName, accountNumberMasked) => `Hola ${firstName}, tu cuenta de pago (${accountNumberMasked}) quedó activa.`,
      superseded: (firstName, accountNumberMasked) => `Hola ${firstName}, tu cuenta de pago activa fue reemplazada por una nueva (${accountNumberMasked}).`,
      cancelled: firstName => `Hola ${firstName}, tu solicitud de cambio fue cancelada.`
    }
  },
  weeklyExecutiveDigest: {
    subject: 'Resumen semanal — Nexa Insights',
    previewText: (periodLabel, totalInsights, spacesAffected) => `${periodLabel} · ${totalInsights} insights · ${spacesAffected} espacios`,
    kickerPrefix: 'NEXA INSIGHTS · ',
    heading: 'Resumen semanal para liderazgo',
    intro: 'Lo más relevante de la semana, ordenado por impacto y listo para lectura rápida.',
    includedInsightsLabel: 'Insights incluidos',
    severityDistributionLabel: 'Distribución por severidad',
    affectedSpacesLabel: 'Espacios afectados',
    severitySummary: (criticalCount, warningCount, infoCount) => `${criticalCount} críticos · ${warningCount} en seguimiento · ${infoCount} informativos`,
    severityLabels: {
      critical: 'Crítico',
      warning: 'Seguimiento',
      info: 'Informativo'
    },
    spaceLabel: 'Espacio',
    insightsUnit: count => count === 1 ? 'insight' : 'insights',
    emptySpaceInsights: 'No hubo insights materializados para este espacio en el período.',
    rootCauseLabel: 'Causa probable',
    defaultInsightAction: 'Abrir detalle',
    emptyHeading: 'Sin insights para mostrar',
    emptyBody: 'No se materializaron insights en este período. Cuando haya novedades, aparecerán aquí con enlaces directos al portal.',
    cta: 'Abrir Greenhouse',
    closingLink: 'Ver en Greenhouse',
    defaultClosingNote: 'Resumen automático basado en los insights materializados del período. Abre Greenhouse para ver el detalle completo.',
    plainTextOpenPortal: 'Abre el portal para ver el detalle completo.'
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
    weeklyExecutiveDigest: () => 'Resumen semanal — Nexa Insights',
    leaveRequestDecision: leaveTypeName => `Actualización de permiso — ${leaveTypeName}`,
    leaveReviewConfirmation: leaveTypeName => `Revisión registrada — ${leaveTypeName}`,
    leaveRequestSubmitted: leaveTypeName => `Solicitud de permiso enviada — ${leaveTypeName}`,
    leaveRequestPendingReview: (memberName, leaveTypeName) => `${memberName} — ${leaveTypeName}`,
    quoteShare: quotationNumber => `Propuesta ${quotationNumber} lista para revisión`
  }
}
