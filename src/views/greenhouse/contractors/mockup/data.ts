import type { ContractorScenario } from './types'

export const contractorScenarios: ContractorScenario[] = [
  {
    id: 'honorarios_ready',
    label: 'Honorarios CL',
    eyebrow: 'Acción pendiente',
    title: 'Sube tu boleta y la evidencia del servicio',
    summary: 'El engagement está activo. Falta adjuntar la boleta y el soporte del periodo para enviarlo a revisión.',
    primaryAction: 'Preparar envío',
    primaryActionIcon: 'tabler-upload',
    secondaryAction: 'Ver cuenta de pago',
    secondaryHref: '/my/payment-profile',
    contractorName: 'Valentina Hoyos',
    engagementPublicId: 'CTR-2026-0048',
    relationshipSubtype: 'Honorarios Chile',
    country: 'Chile',
    currency: 'CLP',
    paymentCurrency: 'CLP',
    servicePeriod: '04 may - 31 may 2026',
    paymentModel: 'On invoice',
    paymentCadence: 'Mensual',
    taxResponsable: 'Política Greenhouse: retención SII 15.25%',
    readinessLabel: 'Falta soporte',
    readinessTone: 'warning',
    readinessDetail: 'Se puede enviar cuando exista boleta principal y evidencia del servicio.',
    paymentProfileLabel: 'Cuenta activa',
    paymentProfileDetail: 'Banco de Chile, cuenta terminada en 3182. Los cambios se solicitan en Mi cuenta de pago.',
    kpis: [
      { id: 'gross', title: 'Monto bruto', value: '$1.250.000', subtitle: 'Antes de retención SII', tone: 'info', icon: 'tabler-file-invoice' },
      { id: 'withholding', title: 'Retención estimada', value: '$190.625', subtitle: 'Snapshot 2026: 15.25%', tone: 'warning', icon: 'tabler-percentage' },
      { id: 'net', title: 'Neto estimado', value: '$1.059.375', subtitle: 'Sujeto a revisión', tone: 'success', icon: 'tabler-wallet' }
    ],
    supportItems: [
      { id: 'invoice', label: 'Boleta principal', kind: 'invoice', status: 'Pendiente', tone: 'warning' },
      { id: 'evidence', label: 'Evidencia de entregable', kind: 'evidence', status: 'Pendiente', tone: 'warning' }
    ],
    submissions: [],
    blockers: [
      {
        id: 'missing_invoice',
        title: 'Boleta pendiente',
        detail: 'El pago no pasa a Finance hasta que exista un asset privado adjunto.',
        tone: 'warning',
        responsable: 'Contractor'
      }
    ],
    timeline: [
      { id: 'engagement', label: 'Engagement activo', detail: 'Relación contractor separada de la relación laboral cerrada.', status: 'done', timestamp: '04 may' },
      { id: 'support', label: 'Soporte del periodo', detail: 'Boleta y evidencia aun no enviadas.', status: 'current' },
      { id: 'review', label: 'Revisión operacional', detail: 'HR revisa evidencia y puede aprobar o disputar.', status: 'upcoming' },
      { id: 'finance', label: 'Obligación Finance', detail: 'Se crea solo cuando el payable queda listo.', status: 'upcoming' },
      { id: 'paid', label: 'Pago', detail: 'Finance ejecuta y concilia el pago.', status: 'upcoming' }
    ]
  },
  {
    id: 'submitted_review',
    label: 'En revisión',
    eyebrow: 'Seguimiento',
    title: 'Tu envío esta en revisión operacional',
    summary: 'La evidencia ya fue enviada. El siguiente paso depende del aprobador del servicio.',
    primaryAction: 'Ver envío',
    primaryActionIcon: 'tabler-eye',
    secondaryAction: 'Ver cuenta de pago',
    secondaryHref: '/my/payment-profile',
    contractorName: 'Valentina Hoyos',
    engagementPublicId: 'CTR-2026-0048',
    relationshipSubtype: 'Honorarios Chile',
    country: 'Chile',
    currency: 'CLP',
    paymentCurrency: 'CLP',
    servicePeriod: '04 may - 31 may 2026',
    paymentModel: 'On invoice',
    paymentCadence: 'Mensual',
    taxResponsable: 'Política Greenhouse: retención SII 15.25%',
    readinessLabel: 'En revisión',
    readinessTone: 'info',
    readinessDetail: 'No necesitas reenviar archivos mientras la revisión este abierta.',
    paymentProfileLabel: 'Cuenta activa',
    paymentProfileDetail: 'Banco de Chile, cuenta terminada en 3182.',
    kpis: [
      { id: 'gross', title: 'Monto enviado', value: '$1.250.000', subtitle: 'Boleta BHE-18291', tone: 'info', icon: 'tabler-file-check' },
      { id: 'age', title: 'Tiempo en revisión', value: '18 h', subtitle: 'Dentro del SLA interno', tone: 'success', icon: 'tabler-clock' },
      { id: 'net', title: 'Neto estimado', value: '$1.059.375', subtitle: 'No es pago ejecutado', tone: 'secondary', icon: 'tabler-wallet' }
    ],
    supportItems: [
      { id: 'invoice', label: 'Boleta principal', kind: 'invoice', status: 'Adjunta', tone: 'success', filename: 'BHE-18291.pdf' },
      { id: 'evidence', label: 'Evidencia de entregable', kind: 'evidence', status: 'Adjunta', tone: 'success', filename: 'entregable-mayo.pdf' }
    ],
    submissions: [
      {
        id: 'SUB-1261',
        title: 'Entregable mayo',
        period: '04 may - 31 may 2026',
        amount: 1250000,
        currency: 'CLP',
        status: 'Enviado',
        tone: 'info',
        responsable: 'Revisor HR',
        nextAction: 'Revisión de evidencia'
      }
    ],
    blockers: [],
    timeline: [
      { id: 'engagement', label: 'Engagement activo', detail: 'Contrato operativo vigente.', status: 'done', timestamp: '04 may' },
      { id: 'support', label: 'Soporte enviado', detail: 'Boleta y evidencia recibidas.', status: 'done', timestamp: '29 may' },
      { id: 'review', label: 'Revisión operacional', detail: 'Aprobador revisando evidencia.', status: 'current' },
      { id: 'finance', label: 'Obligación Finance', detail: 'Pendiente de aprobación operacional.', status: 'upcoming' },
      { id: 'paid', label: 'Pago', detail: 'Pendiente de Finance.', status: 'upcoming' }
    ]
  },
  {
    id: 'disputed',
    label: 'Disputa',
    eyebrow: 'Requiere acción',
    title: 'Corrige la evidencia solicitada',
    summary: 'El aprobador pidio aclarar el periodo de servicio antes de liberar el payable.',
    primaryAction: 'Responder disputa',
    primaryActionIcon: 'tabler-message-reply',
    secondaryAction: 'Ver cuenta de pago',
    secondaryHref: '/my/payment-profile',
    contractorName: 'Valentina Hoyos',
    engagementPublicId: 'CTR-2026-0048',
    relationshipSubtype: 'Honorarios Chile',
    country: 'Chile',
    currency: 'CLP',
    paymentCurrency: 'CLP',
    servicePeriod: '04 may - 31 may 2026',
    paymentModel: 'On invoice',
    paymentCadence: 'Mensual',
    taxResponsable: 'Política Greenhouse: retención SII 15.25%',
    readinessLabel: 'Disputado',
    readinessTone: 'error',
    readinessDetail: 'El pago está bloqueado hasta responder la observación.',
    paymentProfileLabel: 'Cuenta activa',
    paymentProfileDetail: 'Banco de Chile, cuenta terminada en 3182.',
    kpis: [
      { id: 'gross', title: 'Monto observado', value: '$1.250.000', subtitle: 'Requiere aclaracion', tone: 'error', icon: 'tabler-alert-triangle' },
      { id: 'days', title: 'Días abiertos', value: '2', subtitle: 'Desde la observación', tone: 'warning', icon: 'tabler-calendar-time' },
      { id: 'net', title: 'Pago', value: 'Bloqueado', subtitle: 'No enviado a Finance', tone: 'error', icon: 'tabler-ban' }
    ],
    supportItems: [
      { id: 'invoice', label: 'Boleta principal', kind: 'invoice', status: 'Adjunta', tone: 'success', filename: 'BHE-18291.pdf' },
      { id: 'evidence', label: 'Evidencia de entregable', kind: 'evidence', status: 'Observada', tone: 'error', filename: 'entregable-mayo.pdf' }
    ],
    submissions: [
      {
        id: 'SUB-1261',
        title: 'Entregable mayo',
        period: '04 may - 31 may 2026',
        amount: 1250000,
        currency: 'CLP',
        status: 'Disputed',
        tone: 'error',
        responsable: 'Contractor',
        nextAction: 'Adjuntar evidencia corregida'
      }
    ],
    blockers: [
      {
        id: 'dispute_reason',
        title: 'Periodo de servicio ambiguo',
        detail: 'La evidencia debe indicar que el entregable corresponde al periodo enviado.',
        tone: 'error',
        responsable: 'Contractor'
      }
    ],
    timeline: [
      { id: 'engagement', label: 'Engagement activo', detail: 'Contrato operativo vigente.', status: 'done', timestamp: '04 may' },
      { id: 'support', label: 'Soporte enviado', detail: 'Boleta y evidencia recibidas.', status: 'done', timestamp: '29 may' },
      { id: 'review', label: 'Disputa abierta', detail: 'Se requiere aclaración de evidencia.', status: 'blocked', timestamp: '30 may' },
      { id: 'finance', label: 'Obligación Finance', detail: 'Bloqueada por disputa.', status: 'upcoming' },
      { id: 'paid', label: 'Pago', detail: 'Pendiente.', status: 'upcoming' }
    ]
  },
  {
    id: 'international_blocked',
    label: 'Internacional',
    eyebrow: 'Bloqueo de preparación',
    title: 'Falta política FX antes de enviar a Finance',
    summary: 'El contrato esta en USD y el pago se hara en CLP. La tasa y el responsable del spread deben quedar definidos.',
    primaryAction: 'Ver bloqueo',
    primaryActionIcon: 'tabler-lock',
    primaryActionDisabled: true,
    primaryActionReason: 'Este bloqueo lo resuelve HR/Finance, no el contractor.',
    secondaryAction: 'Ver cuenta de pago',
    secondaryHref: '/my/payment-profile',
    contractorName: 'Daniela Ferreira',
    engagementPublicId: 'CTR-2026-0052',
    relationshipSubtype: 'International contractor',
    country: 'Colombia',
    currency: 'USD',
    paymentCurrency: 'CLP',
    servicePeriod: '01 may - 31 may 2026',
    paymentModel: 'Milestone',
    paymentCadence: 'Milestone',
    taxResponsable: 'Revisión manual requerida',
    readinessLabel: 'FX bloqueado',
    readinessTone: 'error',
    readinessDetail: 'La obligación no puede generarse sin política FX confiable.',
    paymentProfileLabel: 'Cuenta pendiente',
    paymentProfileDetail: 'El contractor solicito una cuenta USD. Finance debe aprobarla.',
    kpis: [
      { id: 'gross', title: 'Monto contractual', value: 'USD 1,800.00', subtitle: 'Milestone aprobado', tone: 'info', icon: 'tabler-file-dollar' },
      { id: 'fx', title: 'FX policy', value: 'Pendiente', subtitle: 'Bloquea Finance', tone: 'error', icon: 'tabler-currency-dollar' },
      { id: 'profile', title: 'Cuenta de pago', value: 'En revisión', subtitle: 'Solicitud pendiente', tone: 'warning', icon: 'tabler-credit-card' }
    ],
    supportItems: [
      { id: 'invoice', label: 'Invoice principal', kind: 'invoice', status: 'Adjunta', tone: 'success', filename: 'invoice-1048.pdf' },
      { id: 'tax', label: 'Tax residency', kind: 'tax', status: 'Revisión manual', tone: 'warning' }
    ],
    submissions: [
      {
        id: 'SUB-1290',
        title: 'Milestone landing pages',
        period: '01 may - 31 may 2026',
        amount: 1800,
        currency: 'USD',
        status: 'Approved',
        tone: 'success',
        responsable: 'Finance',
        nextAction: 'Definir FX policy'
      }
    ],
    blockers: [
      {
        id: 'fx_policy',
        title: 'Política FX faltante',
        detail: 'Debe declarar fecha de tasa, fuente y quien absorbe spread.',
        tone: 'error',
        responsable: 'Finance'
      },
      {
        id: 'payment_profile',
        title: 'Cuenta de pago pendiente',
        detail: 'La solicitud self-service esta en maker-checker.',
        tone: 'warning',
        responsable: 'Finance'
      }
    ],
    timeline: [
      { id: 'engagement', label: 'Engagement activo', detail: 'Contrato internacional directo.', status: 'done', timestamp: '01 may' },
      { id: 'support', label: 'Invoice enviada', detail: 'Invoice y milestone aprobados.', status: 'done', timestamp: '28 may' },
      { id: 'readiness', label: 'Preparación bloqueada', detail: 'Falta política FX y cuenta aprobada.', status: 'blocked' },
      { id: 'finance', label: 'Obligación Finance', detail: 'No generada.', status: 'upcoming' },
      { id: 'paid', label: 'Pago', detail: 'Pendiente.', status: 'upcoming' }
    ]
  },
  {
    id: 'paid',
    label: 'Pagado',
    eyebrow: 'Historial',
    title: 'El pago del periodo fue ejecutado',
    summary: 'El envío fue aprobado, convertido en obligación Finance y pagado por la orden correspondiente.',
    primaryAction: 'Ver comprobante',
    primaryActionIcon: 'tabler-receipt',
    secondaryAction: 'Ver cuenta de pago',
    secondaryHref: '/my/payment-profile',
    contractorName: 'Valentina Hoyos',
    engagementPublicId: 'CTR-2026-0048',
    relationshipSubtype: 'Honorarios Chile',
    country: 'Chile',
    currency: 'CLP',
    paymentCurrency: 'CLP',
    servicePeriod: '01 abr - 30 abr 2026',
    paymentModel: 'On invoice',
    paymentCadence: 'Mensual',
    taxResponsable: 'Política Greenhouse: retención SII 15.25%',
    readinessLabel: 'Pagado',
    readinessTone: 'success',
    readinessDetail: 'El estado de pago viene de Finance, no de la aprobación operacional.',
    paymentProfileLabel: 'Cuenta usada',
    paymentProfileDetail: 'Banco de Chile, cuenta terminada en 3182.',
    kpis: [
      { id: 'gross', title: 'Monto bruto', value: '$1.250.000', subtitle: 'Boleta BHE-17902', tone: 'info', icon: 'tabler-file-invoice' },
      { id: 'net', title: 'Neto pagado', value: '$1.059.375', subtitle: 'Orden PO-2026-0931', tone: 'success', icon: 'tabler-circle-check' },
      { id: 'paid', title: 'Fecha de pago', value: '08 may', subtitle: 'Conciliado por Finance', tone: 'success', icon: 'tabler-building-bank' }
    ],
    supportItems: [
      { id: 'invoice', label: 'Boleta principal', kind: 'invoice', status: 'Adjunta', tone: 'success', filename: 'BHE-17902.pdf' },
      { id: 'evidence', label: 'Evidencia de entregable', kind: 'evidence', status: 'Adjunta', tone: 'success', filename: 'entregable-abril.pdf' }
    ],
    submissions: [
      {
        id: 'SUB-1188',
        title: 'Entregable abril',
        period: '01 abr - 30 abr 2026',
        amount: 1250000,
        currency: 'CLP',
        status: 'Paid',
        tone: 'success',
        responsable: 'Finance',
        nextAction: 'Sin acciónes pendientes'
      }
    ],
    blockers: [],
    timeline: [
      { id: 'engagement', label: 'Engagement activo', detail: 'Contrato operativo vigente.', status: 'done', timestamp: '01 abr' },
      { id: 'support', label: 'Soporte enviado', detail: 'Boleta y evidencia recibidas.', status: 'done', timestamp: '30 abr' },
      { id: 'review', label: 'Aprobación operacional', detail: 'Evidencia aprobada.', status: 'done', timestamp: '02 may' },
      { id: 'finance', label: 'Obligación Finance', detail: 'Orden PO-2026-0931 programada.', status: 'done', timestamp: '06 may' },
      { id: 'paid', label: 'Pago ejecutado', detail: 'Pago conciliado.', status: 'done', timestamp: '08 may' }
    ]
  },
  {
    id: 'closure_pending',
    label: 'Cierre proximo',
    eyebrow: 'Cierre contractor',
    title: 'Hay items abiertos antes del cierre',
    summary: 'El engagement termina pronto. El cierre contractor revisa pagos y evidencias pendientes sin usar finiquito.',
    primaryAction: 'Ver pendientes',
    primaryActionIcon: 'tabler-list-check',
    secondaryAction: 'Ver cuenta de pago',
    secondaryHref: '/my/payment-profile',
    contractorName: 'Valentina Hoyos',
    engagementPublicId: 'CTR-2026-0048',
    relationshipSubtype: 'Honorarios Chile',
    country: 'Chile',
    currency: 'CLP',
    paymentCurrency: 'CLP',
    servicePeriod: '01 jun - 15 jun 2026',
    paymentModel: 'On invoice',
    paymentCadence: 'Off-cycle',
    taxResponsable: 'Política Greenhouse: retención SII 15.25%',
    readinessLabel: 'Cierre con pendientes',
    readinessTone: 'warning',
    readinessDetail: 'Puede existir invoice post-cierre solo con evidencia y periodo explícito.',
    paymentProfileLabel: 'Cuenta activa',
    paymentProfileDetail: 'Banco de Chile, cuenta terminada en 3182.',
    kpis: [
      { id: 'open', title: 'Items abiertos', value: '2', subtitle: 'Un envío y una boleta', tone: 'warning', icon: 'tabler-alert-circle' },
      { id: 'end', title: 'Termino pactado', value: '15 jun', subtitle: 'No es finiquito laboral', tone: 'info', icon: 'tabler-calendar-event' },
      { id: 'post', title: 'Post-cierre', value: 'Permitido', subtitle: 'Solo con evidencia', tone: 'secondary', icon: 'tabler-file-plus' }
    ],
    supportItems: [
      { id: 'invoice', label: 'Boleta final', kind: 'invoice', status: 'Pendiente', tone: 'warning' },
      { id: 'evidence', label: 'Evidencia final', kind: 'evidence', status: 'Pendiente', tone: 'warning' }
    ],
    submissions: [
      {
        id: 'SUB-1324',
        title: 'Cierre de entregables',
        period: '01 jun - 15 jun 2026',
        amount: 620000,
        currency: 'CLP',
        status: 'Draft',
        tone: 'secondary',
        responsable: 'Contractor',
        nextAction: 'Completar soporte'
      }
    ],
    blockers: [
      {
        id: 'final_invoice',
        title: 'Soporte final pendiente',
        detail: 'El cierre contractor no bloquea pago legitimo post-cierre, pero exige periodo y evidencia.',
        tone: 'warning',
        responsable: 'Contractor'
      }
    ],
    timeline: [
      { id: 'engagement', label: 'Engagement activo', detail: 'Contrato vigente hasta 15 jun.', status: 'done', timestamp: '01 jun' },
      { id: 'closure', label: 'Cierre planificado', detail: 'Se revisan items abiertos y acceso.', status: 'current', timestamp: '15 jun' },
      { id: 'support', label: 'Soporte final', detail: 'Pendiente de envío.', status: 'blocked' },
      { id: 'finance', label: 'Obligación Finance', detail: 'Pendiente de soporte final.', status: 'upcoming' },
      { id: 'paid', label: 'Pago', detail: 'Pendiente.', status: 'upcoming' }
    ]
  }
]

export const adminQueue = contractorScenarios.map((scenario, index) => ({
  id: scenario.engagementPublicId,
  contractorName: scenario.contractorName,
  subtype: scenario.relationshipSubtype,
  country: scenario.country,
  status: scenario.readinessLabel,
  tone: scenario.readinessTone,
  amount: scenario.kpis[0]?.value ?? 'Sin monto',
  nextAction: scenario.blockers[0]?.title ?? 'Sin bloqueos',
  responsable: scenario.blockers[0]?.responsable ?? (scenario.id === 'submitted_review' ? 'Revisor HR' : 'Finance'),
  age: ['4 h', '18 h', '2 d', '3 d', 'cerrado', '5 d'][index] ?? '1 d',
  scenarioId: scenario.id
}))

export const adminSignals = [
  {
    id: 'classification',
    title: 'Riesgo de clasificacion',
    description: 'Los engagements activos no deben parecer relación laboral dependiente sin revisión legal.',
    statusLabel: '0 abiertos',
    statusTone: 'success' as const,
    statusIcon: 'tabler-shield-check',
    code: 'hr.contractor_engagement.classification_risk_open'
  },
  {
    id: 'review',
    title: 'Envíos vencidos',
    description: 'Envíos enviados sin revisión dentro del SLA operacional.',
    statusLabel: '1 warning',
    statusTone: 'warning' as const,
    statusIcon: 'tabler-clock',
    code: 'hr.contractor_work_submission.review_overdue'
  },
  {
    id: 'assets',
    title: 'Evidencia rota',
    description: 'Assets adjuntos que no resuelven contra el registro privado.',
    statusLabel: 'Estable',
    statusTone: 'success' as const,
    statusIcon: 'tabler-file-check',
    code: 'hr.contractor_invoice_assets.broken_evidence'
  },
  {
    id: 'finance',
    title: 'Paso a Finance',
    description: 'Payables listos que aun no generan obligation idempotente.',
    statusLabel: 'Pendiente',
    statusTone: 'info' as const,
    statusIcon: 'tabler-building-bank',
    code: 'workforce.contractor_payable.ready_for_finance.v1'
  }
]
