export type ContractingMode = 'command' | 'builder' | 'review'

export type ContractingTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export type ContractingStatus =
  | 'ai_drafted'
  | 'blocked'
  | 'pending_review'
  | 'ready_for_signature'
  | 'signature_pending'
  | 'completed'

export type ContractingCase = {
  id: string
  publicId: string
  personName: string
  personEmail: string
  initials: string
  role: string
  area: string
  documentKind: 'Carta oferta' | 'Contrato laboral'
  jurisdictionPack: string
  status: ContractingStatus
  statusLabel: string
  statusTone: ContractingTone
  parityStatus: 'ok' | 'warning' | 'blocked'
  riskLabel: string
  riskTone: ContractingTone
  nextAction: string
  dueDate: string
  startDate: string
  compensation: string
  entity: string
  workMode: string
  owner: string
  missingFacts: string[]
  timeline: Array<{
    label: string
    detail: string
    actor: string
    tone: ContractingTone
  }>
}

export type BuilderFact = {
  icon: string
  label: string
  value: string
  helper: string
  state: 'complete' | 'warning' | 'blocked'
}

export type ReadinessItem = {
  label: string
  helper: string
  state: 'complete' | 'warning' | 'blocked'
}

export type ReviewSection = {
  code: string
  spanishHeading: string
  spanishBody: string
  englishHeading: string
  englishBody: string
  parity: 'ok' | 'warning' | 'blocked'
  note: string
}

export type CollaboratorDocument = {
  title: string
  status: string
  helper: string
  action: string
  tone: ContractingTone
}

export const contractingMetrics = [
  { label: 'Borradores por revisar', value: 12, icon: 'tabler-file-pencil', tone: 'warning' as ContractingTone },
  { label: 'Bloqueados por datos', value: 4, icon: 'tabler-alert-triangle', tone: 'error' as ContractingTone },
  { label: 'Listos para firma', value: 18, icon: 'tabler-writing-sign', tone: 'success' as ContractingTone },
  { label: 'Firmas pendientes', value: 27, icon: 'tabler-clock', tone: 'info' as ContractingTone },
  { label: 'Completados 30 días', value: 56, icon: 'tabler-circle-check', tone: 'success' as ContractingTone }
]

export const contractingCases: ContractingCase[] = [
  {
    id: 'case-juan-rojas',
    publicId: 'WC-10234',
    personName: 'Juan Pablo Rojas',
    personEmail: 'juan.rojas@greenhouse.com',
    initials: 'JR',
    role: 'Data Engineer',
    area: 'Engineering',
    documentKind: 'Contrato laboral',
    jurisdictionPack: 'Chile - Indefinido v3.2',
    status: 'ready_for_signature',
    statusLabel: 'Listo para firma',
    statusTone: 'success',
    parityStatus: 'ok',
    riskLabel: 'Medio',
    riskTone: 'warning',
    nextAction: 'Enviar a firma',
    dueDate: '24 mayo 2026',
    startDate: '2 junio 2026',
    compensation: '$2.850.000 CLP',
    entity: 'Efeonce Group SpA',
    workMode: 'Santiago, híbrido',
    owner: 'María González',
    missingFacts: ['Previsión de asignación de equipo', 'Jefe directo por confirmar'],
    timeline: [
      { label: 'Borrador creado', detail: 'Claude generó ES+EN con pack Chile v3.2', actor: 'IA', tone: 'info' },
      { label: 'Revisión legal', detail: 'Paridad validada, 1 alerta menor resuelta', actor: 'Legal', tone: 'success' },
      { label: 'Pendiente firma', detail: 'Esperando generación de PDF EPIC-001', actor: 'Sistema', tone: 'warning' }
    ]
  },
  {
    id: 'case-camila-torres',
    publicId: 'WC-10231',
    personName: 'Camila Torres',
    personEmail: 'camila.torres@greenhouse.com',
    initials: 'CT',
    role: 'UX Designer',
    area: 'Product',
    documentKind: 'Contrato laboral',
    jurisdictionPack: 'Chile - Plazo fijo v3.2',
    status: 'blocked',
    statusLabel: 'Bloqueado',
    statusTone: 'error',
    parityStatus: 'blocked',
    riskLabel: 'Alto',
    riskTone: 'error',
    nextAction: 'Resolver paridad',
    dueDate: '21 mayo 2026',
    startDate: '3 junio 2026',
    compensation: '$1.950.000 CLP',
    entity: 'Efeonce Group SpA',
    workMode: 'Remoto Chile',
    owner: 'María Paz',
    missingFacts: ['Variable anual sin criterio objetivo', 'Período de prueba requiere revisión'],
    timeline: [
      { label: 'Borrador IA', detail: 'Divergencia en cláusula 4.1', actor: 'Claude', tone: 'warning' },
      { label: 'Bloqueo legal', detail: 'Derecho a bonificación vs discrecionalidad', actor: 'Legal', tone: 'error' },
      { label: 'Siguiente paso', detail: 'Solicitar cambios al borrador bilingüe', actor: 'HR', tone: 'warning' }
    ]
  },
  {
    id: 'case-maria-lopez',
    publicId: 'WC-10233',
    personName: 'María Fernanda López',
    personEmail: 'maria.lopez@greenhouse.com',
    initials: 'ML',
    role: 'Product Manager',
    area: 'Product',
    documentKind: 'Carta oferta',
    jurisdictionPack: 'Chile - Indefinido v3.2',
    status: 'ai_drafted',
    statusLabel: 'Borrador IA',
    statusTone: 'info',
    parityStatus: 'warning',
    riskLabel: 'Bajo',
    riskTone: 'success',
    nextAction: 'Revisar borrador',
    dueDate: '22 mayo 2026',
    startDate: '10 junio 2026',
    compensation: '$3.100.000 CLP',
    entity: 'Efeonce Group SpA',
    workMode: 'Providencia, híbrido',
    owner: 'People Ops',
    missingFacts: ['Beneficio seguro complementario por confirmar'],
    timeline: [
      { label: 'Oferta creada', detail: 'Datos importados desde requisición', actor: 'HR', tone: 'info' },
      { label: 'Borrador bilingüe', detail: 'ES+EN generado; 1 alerta de beneficio', actor: 'Claude', tone: 'warning' }
    ]
  },
  {
    id: 'case-chris-muller',
    publicId: 'WC-10232',
    personName: 'Chris Muller',
    personEmail: 'chris.muller@greenhouse.com',
    initials: 'CM',
    role: 'DevOps Engineer',
    area: 'Platform',
    documentKind: 'Contrato laboral',
    jurisdictionPack: 'Alemania - Internal v2.1',
    status: 'signature_pending',
    statusLabel: 'Firma pendiente',
    statusTone: 'info',
    parityStatus: 'ok',
    riskLabel: 'Bajo',
    riskTone: 'success',
    nextAction: 'Recordar firmante',
    dueDate: '23 mayo 2026',
    startDate: '17 junio 2026',
    compensation: 'EUR 6.700',
    entity: 'Efeonce Group SpA',
    workMode: 'Berlín, remoto',
    owner: 'Legal Ops',
    missingFacts: [],
    timeline: [
      { label: 'PDF generado', detail: 'Versión bilingüe v2.1', actor: 'Sistema', tone: 'success' },
      { label: 'Firma enviada', detail: 'ZapSign espera colaborador', actor: 'Sistema', tone: 'info' }
    ]
  },
  {
    id: 'case-diego-santander',
    publicId: 'WC-10230',
    personName: 'Diego Santander',
    personEmail: 'diego.santander@greenhouse.com',
    initials: 'DS',
    role: 'Sales Executive',
    area: 'Revenue',
    documentKind: 'Carta oferta',
    jurisdictionPack: 'Chile - Indefinido v3.2',
    status: 'ready_for_signature',
    statusLabel: 'Listo para firma',
    statusTone: 'success',
    parityStatus: 'ok',
    riskLabel: 'Medio',
    riskTone: 'warning',
    nextAction: 'Enviar oferta',
    dueDate: '25 mayo 2026',
    startDate: '12 junio 2026',
    compensation: '$1.700.000 CLP + variable',
    entity: 'Efeonce Group SpA',
    workMode: 'Santiago, presencial',
    owner: 'Revenue Ops',
    missingFacts: [],
    timeline: [
      { label: 'Oferta aprobada', detail: 'Comisión y OTE validados', actor: 'Finance', tone: 'success' },
      { label: 'Lista para envío', detail: 'Paridad ES+EN sin divergencias', actor: 'Legal', tone: 'success' }
    ]
  }
]

export const builderFacts: BuilderFact[] = [
  { icon: 'tabler-user', label: 'Persona', value: 'Camila Torres Muñoz', helper: 'RUT 19.876.543-2', state: 'complete' },
  { icon: 'tabler-briefcase', label: 'Cargo', value: 'UX Designer', helper: 'Nivel 3 · Product', state: 'complete' },
  { icon: 'tabler-building-bank', label: 'Entidad legal', value: 'Efeonce Group SpA', helper: 'Chile · Providencia', state: 'complete' },
  { icon: 'tabler-currency-dollar', label: 'Compensación', value: '$1.950.000 CLP', helper: 'Bruto mensual + variable anual', state: 'warning' },
  { icon: 'tabler-clock-hour-4', label: 'Jornada', value: '44 horas semanales', helper: 'Lunes a viernes', state: 'complete' },
  { icon: 'tabler-home', label: 'Modalidad', value: 'Remota Chile', helper: 'Lugar principal por definir', state: 'blocked' },
  { icon: 'tabler-gavel', label: 'Jurisdicción', value: 'Chile dependiente', helper: 'Código del Trabajo', state: 'complete' }
]

export const readinessItems: ReadinessItem[] = [
  { label: 'Identidad de las partes', helper: 'Persona y entidad legal completas', state: 'complete' },
  { label: 'Descripción de funciones', helper: 'Cargo y anexo de responsabilidades listos', state: 'complete' },
  { label: 'Remuneración y forma de pago', helper: 'Variable anual requiere criterio objetivo', state: 'blocked' },
  { label: 'Lugar de prestación de servicios', helper: 'Falta ciudad/lugar principal', state: 'blocked' },
  { label: 'Distribución y duración de jornada', helper: '44 horas semanales declaradas', state: 'complete' },
  { label: 'Idiomas obligatorios', helper: 'ES + EN generados en un mismo draft', state: 'complete' },
  { label: 'Revisión legal requerida', helper: 'Pendiente por divergencia material', state: 'warning' }
]

export const reviewSections: ReviewSection[] = [
  {
    code: '1.1',
    spanishHeading: 'Partes',
    spanishBody: 'El presente contrato se celebra entre Efeonce Group SpA y Camila Torres, en adelante la Trabajadora.',
    englishHeading: 'Parties',
    englishBody: 'This agreement is entered into between Efeonce Group SpA and Camila Torres, hereinafter the Employee.',
    parity: 'ok',
    note: 'Mismas partes y entidad legal.'
  },
  {
    code: '2.1',
    spanishHeading: 'Cargo y funciones',
    spanishBody: 'La Trabajadora será contratada como UX Designer para desempeñar funciones descritas en el Anexo 1.',
    englishHeading: 'Role and responsibilities',
    englishBody: 'The Employee shall be hired as UX Designer, performing the duties described in Annex 1.',
    parity: 'ok',
    note: 'Cargo y anexo alineados.'
  },
  {
    code: '3.1',
    spanishHeading: 'Lugar de trabajo',
    spanishBody: 'El lugar principal de trabajo será Santiago, Chile, pudiendo prestar servicios remotos según política interna.',
    englishHeading: 'Place of work',
    englishBody: 'The main place of work shall be Santiago, Chile, with remote services according to internal policy.',
    parity: 'warning',
    note: 'Validar lugar principal antes de PDF.'
  },
  {
    code: '4.1',
    spanishHeading: 'Remuneración variable',
    spanishBody: 'La Trabajadora podrá recibir una bonificación anual discrecional de hasta el 20% de su remuneración bruta anual.',
    englishHeading: 'Variable compensation',
    englishBody: 'The Employee shall be eligible for an annual bonus of up to 20% of annual base salary, based on performance achievement.',
    parity: 'blocked',
    note: 'Divergencia material: discrecionalidad vs elegibilidad por desempeño.'
  },
  {
    code: '5.1',
    spanishHeading: 'Horas de trabajo',
    spanishBody: 'La jornada ordinaria de trabajo será de 44 horas semanales, de lunes a viernes.',
    englishHeading: 'Working hours',
    englishBody: 'The standard working hours shall be 44 hours per week, from Monday to Friday.',
    parity: 'ok',
    note: 'Jornada equivalente.'
  },
  {
    code: '6.1',
    spanishHeading: 'Vacaciones',
    spanishBody: 'La Trabajadora tendrá derecho a 15 días hábiles de feriado legal por cada año de servicio.',
    englishHeading: 'Vacation',
    englishBody: 'The Employee shall be entitled to 15 business days of annual vacation for each year of service.',
    parity: 'ok',
    note: 'Derecho legal reflejado.'
  }
]

export const collaboratorDocuments: CollaboratorDocument[] = [
  {
    title: 'Carta oferta · Product Manager',
    status: 'Aceptada',
    helper: 'Versión bilingüe ES+EN aceptada el 31 mayo 2026.',
    action: 'Ver oferta',
    tone: 'success'
  },
  {
    title: 'Contrato laboral · Chile indefinido',
    status: 'Pendiente de firma',
    helper: 'La empresa generó el PDF bilingüe. Falta tu firma en ZapSign.',
    action: 'Firmar ahora',
    tone: 'warning'
  }
]
