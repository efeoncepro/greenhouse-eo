export type AssignedTeamHealth = 'healthy' | 'watch' | 'critical'
export type AssignedTeamScope = 'client' | 'space' | 'squad'
export type AssignedTeamRoleFamily = 'strategy' | 'design' | 'development' | 'media' | 'operations' | 'data'

export type AssignedTeamMember = {
  id: string
  name: string
  initials: string
  role: string
  roleFamily: AssignedTeamRoleFamily
  space: string
  allocationFte: number
  coveragePct: number
  deliveryConfidence: number
  health: AssignedTeamHealth
  backupDepth: string
  skills: string[]
  certifications: string[]
  languages: string[]
  currentFocus: string
  lastSignal: string
}

export type CapabilityCoverage = {
  id: string
  label: string
  coveredPct: number
  atRiskPct: number
  deficitPct: number
}

export type AttentionItem = {
  id: string
  title: string
  detail: string
  freshness: string
  tone: Exclude<AssignedTeamHealth, 'healthy'>
}

export const assignedTeamMembers: AssignedTeamMember[] = [
  {
    id: 'maria-fernanda-ruiz',
    name: 'María Fernanda Ruiz',
    initials: 'MR',
    role: 'Tech Lead',
    roleFamily: 'development',
    space: 'Plataforma Digital',
    allocationFte: 1,
    coveragePct: 100,
    deliveryConfidence: 94,
    health: 'healthy',
    backupDepth: '2.4x',
    skills: ['React', 'Node.js', 'AWS'],
    certifications: ['AWS Certified SA'],
    languages: ['ES', 'EN'],
    currentFocus: 'Arquitectura frontend y gobierno de releases',
    lastSignal: 'Cobertura confirmada para Q3'
  },
  {
    id: 'diego-alejandro-perez',
    name: 'Diego Alejandro Pérez',
    initials: 'DP',
    role: 'Backend Engineer',
    roleFamily: 'development',
    space: 'Productos & Pagos',
    allocationFte: 1,
    coveragePct: 90,
    deliveryConfidence: 88,
    health: 'healthy',
    backupDepth: '2.1x',
    skills: ['Java', 'Spring Boot', 'Kafka'],
    certifications: ['Spring Professional'],
    languages: ['ES', 'EN'],
    currentFocus: 'Integraciones transaccionales y confiabilidad',
    lastSignal: 'Entrega estable en las últimas 4 semanas'
  },
  {
    id: 'laura-mendez',
    name: 'Laura Méndez',
    initials: 'LM',
    role: 'Product Designer',
    roleFamily: 'design',
    space: 'Experiencia de Cliente',
    allocationFte: 0.8,
    coveragePct: 80,
    deliveryConfidence: 82,
    health: 'watch',
    backupDepth: '1.6x',
    skills: ['Figma', 'Design System', 'UX'],
    certifications: ['Google UX Design Cert.'],
    languages: ['ES', 'EN'],
    currentFocus: 'Sistema de diseño y research de portal',
    lastSignal: 'Backup parcial en UX Research'
  },
  {
    id: 'carlos-andres-lopez',
    name: 'Carlos Andrés López',
    initials: 'CL',
    role: 'QA Engineer',
    roleFamily: 'operations',
    space: 'Plataforma Digital',
    allocationFte: 1.1,
    coveragePct: 110,
    deliveryConfidence: 86,
    health: 'healthy',
    backupDepth: '2.0x',
    skills: ['Test Automation', 'Cypress', 'Jenkins'],
    certifications: ['ISTQB Advanced'],
    languages: ['ES', 'EN'],
    currentFocus: 'Automatización visual y smoke gates',
    lastSignal: 'Capacidad sobre 100% con cobertura estable'
  },
  {
    id: 'valentina-gomez',
    name: 'Valentina Gómez',
    initials: 'VG',
    role: 'Data Engineer',
    roleFamily: 'data',
    space: 'Datos & Analítica',
    allocationFte: 0.9,
    coveragePct: 85,
    deliveryConfidence: 79,
    health: 'watch',
    backupDepth: '1.4x',
    skills: ['Python', 'dbt', 'Snowflake'],
    certifications: ['Databricks Associate'],
    languages: ['ES', 'EN'],
    currentFocus: 'Modelos de serving y pipelines de métricas',
    lastSignal: 'Refuerzo recomendado para proyección Q3'
  },
  {
    id: 'javier-morales',
    name: 'Javier Morales',
    initials: 'JM',
    role: 'DevOps Engineer',
    roleFamily: 'operations',
    space: 'Plataforma Digital',
    allocationFte: 1,
    coveragePct: 95,
    deliveryConfidence: 91,
    health: 'healthy',
    backupDepth: '2.2x',
    skills: ['AWS', 'Terraform', 'Kubernetes'],
    certifications: ['AWS Solutions Architect'],
    languages: ['ES', 'EN'],
    currentFocus: 'Plataforma cloud y observabilidad',
    lastSignal: 'Backups técnicos activos'
  },
  {
    id: 'camila-restrepo',
    name: 'Camila Restrepo',
    initials: 'CR',
    role: 'Business Analyst',
    roleFamily: 'strategy',
    space: 'Productos & Pagos',
    allocationFte: 0.7,
    coveragePct: 70,
    deliveryConfidence: 68,
    health: 'critical',
    backupDepth: '1.0x',
    skills: ['BPMN', 'Jira', 'Confluence'],
    certifications: ['Product Analytics'],
    languages: ['ES', 'EN'],
    currentFocus: 'Discovery operativo y seguimiento de riesgo',
    lastSignal: 'Dependencia crítica sin backup suficiente'
  }
]

export const capabilityCoverage: CapabilityCoverage[] = [
  { id: 'software', label: 'Desarrollo de Software', coveredPct: 92, atRiskPct: 5, deficitPct: 3 },
  { id: 'platform', label: 'Plataforma & DevOps', coveredPct: 88, atRiskPct: 8, deficitPct: 4 },
  { id: 'data', label: 'Datos & Analítica', coveredPct: 79, atRiskPct: 14, deficitPct: 7 },
  { id: 'design', label: 'Diseño & UX', coveredPct: 83, atRiskPct: 12, deficitPct: 5 },
  { id: 'qa', label: 'QA & Calidad', coveredPct: 90, atRiskPct: 7, deficitPct: 3 },
  { id: 'product', label: 'Gestión & Producto', coveredPct: 75, atRiskPct: 18, deficitPct: 7 }
]

export const attentionItems: AttentionItem[] = [
  {
    id: 'data-capacity',
    title: 'Capacidad ajustada en Datos & Analítica',
    detail: 'Cobertura al 79%. Requiere +0.3 FTE para proyecciones Q3.',
    freshness: 'Hoy',
    tone: 'watch'
  },
  {
    id: 'devops-dependency',
    title: 'Dependencia crítica en Plataforma & DevOps',
    detail: 'Kubernetes concentra conocimiento en 2 personas.',
    freshness: 'Ayer',
    tone: 'watch'
  },
  {
    id: 'payments-risk',
    title: 'Riesgo de entrega en Productos & Pagos',
    detail: '3 iniciativas con probabilidad de atraso sobre 30%.',
    freshness: 'Ayer',
    tone: 'critical'
  }
]

export const scopeLabels: Record<AssignedTeamScope, string> = {
  client: 'Cliente completo',
  space: 'Space',
  squad: 'Squad'
}
