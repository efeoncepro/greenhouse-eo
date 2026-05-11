export type QueueFilter = 'all' | 'attention' | 'ready' | 'documents' | 'noSettlement'

export type QueueTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export type QueueStage =
  | 'missing_prerequisites'
  | 'ready_to_calculate'
  | 'ready_to_issue'
  | 'issued_pending_ratification'
  | 'no_labor_settlement'

export interface QueueChecklistItem {
  id: string
  label: string
  state: 'done' | 'warning' | 'pending' | 'blocked'
}

export interface OffboardingQueueItem {
  id: string
  publicId: string
  collaborator: {
    name: string
    role: string
    initials: string
  }
  lane: string
  causal: string
  effectiveDate: string
  lastWorkingDay: string
  stage: QueueStage
  statusLabel: string
  statusTone: QueueTone
  nextStep: string
  blockerCopy: string | null
  primaryAction: string
  secondaryActions: string[]
  progress: {
    filled: number
    total: number
    readyLabel: string
    nextStepHint: string
  }
  amountLabel: string | null
  filters: QueueFilter[]
  checklist: QueueChecklistItem[]
}

export const queueTabs: Array<{ value: QueueFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'attention', label: 'Requieren acción' },
  { value: 'ready', label: 'Listos para cálculo' },
  { value: 'documents', label: 'Documentos' },
  { value: 'noSettlement', label: 'Sin finiquito laboral' }
]

export const offboardingQueueItems: OffboardingQueueItem[] = [
  {
    id: 'case-01',
    publicId: 'EO-OFF-2026-45EC8688',
    collaborator: {
      name: 'Valentina Hoyos',
      role: 'People Operations Lead',
      initials: 'VH'
    },
    lane: 'Payroll interno · Finiquito laboral',
    causal: 'Renuncia voluntaria',
    effectiveDate: '30/04/2026',
    lastWorkingDay: '30/04/2026',
    stage: 'missing_prerequisites',
    statusLabel: 'Faltan prerequisitos',
    statusTone: 'warning',
    nextStep: 'Sube carta de renuncia y declara pensión de alimentos antes de calcular.',
    blockerCopy: 'El cálculo está bloqueado hasta completar 2 respaldos legales.',
    primaryAction: 'Subir carta',
    secondaryActions: ['Declarar pensión', 'Editar fechas'],
    progress: {
      filled: 2,
      total: 4,
      readyLabel: 'Lista para calcular',
      nextStepHint: 'Faltan 2 respaldos'
    },
    amountLabel: null,
    filters: ['all', 'attention'],
    checklist: [
      { id: 'case-created', label: 'Caso creado', state: 'done' },
      { id: 'dates', label: 'Fechas de salida confirmadas', state: 'done' },
      { id: 'letter', label: 'Carta de renuncia ratificada', state: 'warning' },
      { id: 'maintenance', label: 'Declaración de pensión de alimentos', state: 'pending' }
    ]
  },
  {
    id: 'case-02',
    publicId: 'EO-OFF-2026-BD1840C7',
    collaborator: {
      name: 'Nicolás Araya',
      role: 'Automation Engineer',
      initials: 'NA'
    },
    lane: 'Payroll interno · Finiquito laboral',
    causal: 'Renuncia voluntaria',
    effectiveDate: '15/05/2026',
    lastWorkingDay: '15/05/2026',
    stage: 'ready_to_calculate',
    statusLabel: 'Listo para calcular',
    statusTone: 'success',
    nextStep: 'Calcula el finiquito con los prerequisitos completos.',
    blockerCopy: null,
    primaryAction: 'Calcular',
    secondaryActions: ['Ver respaldos', 'Editar pensión'],
    progress: {
      filled: 4,
      total: 4,
      readyLabel: 'Lista para calcular',
      nextStepHint: 'Sin pendientes'
    },
    amountLabel: null,
    filters: ['all', 'ready'],
    checklist: [
      { id: 'case-created', label: 'Caso creado', state: 'done' },
      { id: 'letter', label: 'Carta de renuncia ratificada', state: 'done' },
      { id: 'maintenance', label: 'Pensión declarada: No afecto', state: 'done' },
      { id: 'calculation', label: 'Cálculo pendiente', state: 'pending' }
    ]
  },
  {
    id: 'case-03',
    publicId: 'EO-OFF-2026-9A0136B2',
    collaborator: {
      name: 'Camila Rojas',
      role: 'Finance Analyst',
      initials: 'CR'
    },
    lane: 'Payroll interno · Finiquito laboral',
    causal: 'Mutuo acuerdo',
    effectiveDate: '10/05/2026',
    lastWorkingDay: '10/05/2026',
    stage: 'ready_to_issue',
    statusLabel: 'Cálculo aprobado',
    statusTone: 'info',
    nextStep: 'Emite el documento legal para revisión y firma.',
    blockerCopy: null,
    primaryAction: 'Emitir',
    secondaryActions: ['Revisar cálculo', 'Descargar borrador'],
    progress: {
      filled: 5,
      total: 5,
      readyLabel: 'Lista para emitir',
      nextStepHint: 'Sin pendientes'
    },
    amountLabel: 'Neto $874.320',
    filters: ['all', 'documents'],
    checklist: [
      { id: 'calculation', label: 'Cálculo aprobado por HR', state: 'done' },
      { id: 'legal-copy', label: 'Documento renderizado', state: 'done' },
      { id: 'issue', label: 'Emisión pendiente', state: 'pending' }
    ]
  },
  {
    id: 'case-04',
    publicId: 'EO-OFF-2026-C3131DD',
    collaborator: {
      name: 'Luis Reyes',
      role: 'Consultor honorarios',
      initials: 'LR'
    },
    lane: 'No payroll · Cierre contractual',
    causal: 'Término de servicios',
    effectiveDate: '30/04/2026',
    lastWorkingDay: '30/04/2026',
    stage: 'no_labor_settlement',
    statusLabel: 'Sin finiquito laboral',
    statusTone: 'secondary',
    nextStep: 'Revisa el pago pendiente y cierra la relación contractual.',
    blockerCopy: 'Honorarios no genera finiquito laboral ni descuentos previsionales.',
    primaryAction: 'Revisar pago',
    secondaryActions: ['Cerrar contrato', 'Ver respaldo'],
    progress: {
      filled: 3,
      total: 3,
      readyLabel: 'Cierre listo',
      nextStepHint: 'Sin pendientes'
    },
    amountLabel: 'Pago $121.963',
    filters: ['all', 'noSettlement'],
    checklist: [
      { id: 'classification', label: 'Clasificación contractual confirmada', state: 'done' },
      { id: 'payment', label: 'Pago pendiente revisado', state: 'warning' },
      { id: 'close', label: 'Cierre contractual pendiente', state: 'pending' }
    ]
  },
  {
    id: 'case-05',
    publicId: 'EO-OFF-2026-D85FFAC2',
    collaborator: {
      name: 'Daniela Ferreira',
      role: 'Product Designer',
      initials: 'DF'
    },
    lane: 'Payroll interno · Finiquito laboral',
    causal: 'Renuncia voluntaria',
    effectiveDate: '08/05/2026',
    lastWorkingDay: '08/05/2026',
    stage: 'issued_pending_ratification',
    statusLabel: 'Emitido',
    statusTone: 'primary',
    nextStep: 'Registra la ratificación ante ministro de fe cuando vuelva firmada.',
    blockerCopy: 'El PDF emitido aún no produce cierre liberatorio.',
    primaryAction: 'Registrar ratificación',
    secondaryActions: ['Reemitir', 'PDF'],
    progress: {
      filled: 5,
      total: 6,
      readyLabel: 'Ratificado',
      nextStepHint: 'Falta ministro de fe'
    },
    amountLabel: 'Neto $432.180',
    filters: ['all', 'documents', 'attention'],
    checklist: [
      { id: 'issued', label: 'Documento emitido', state: 'done' },
      { id: 'delivery', label: 'PDF entregado al trabajador', state: 'done' },
      { id: 'ratification', label: 'Ratificación ante ministro de fe', state: 'warning' }
    ]
  }
]
