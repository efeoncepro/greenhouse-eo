/**
 * TASK-1082 — Pilot corpus manifest (declarativo, pure).
 *
 * Los 14 documentos internos del MVP (TASK-1080 → arquitectura Delta tabla C),
 * mapeados a sus archivos markdown del repo. La metadata de gobernanza
 * (audience/sensitivity/agentic_policy/approver) es decisión editorial declarada
 * aquí — NO se infiere del contenido.
 *
 * `sourceFiles: null` = documento "to-author" (aún no existe como fuente única);
 * el connector lo reporta `unavailable` (skipped honesto) hasta que se escriba.
 *
 * Reglas de la aceptación TASK-1080:
 *  - MVP solo interno: audience='internal'.
 *  - #13 (períodos de nómina) nace `agent_excluded` hasta firma de hr_payroll.
 *  - #14 (política de secretos) nace `agent_excluded` + `restricted` (humanos-only).
 */

import type { KnowledgeDocCandidate } from './connector'

export interface PilotCorpusEntry extends Omit<KnowledgeDocCandidate, 'sourceLocator'> {
  /** Rutas markdown del repo (relativas a la raíz). null = to-author. */
  sourceFiles: string[] | null
}

const humanUrl = (slug: string): string => `/knowledge/${slug}`

export const PILOT_CORPUS: readonly PilotCorpusEntry[] = [
  {
    slug: 'como-preguntar-a-nexa',
    title: 'Qué es y cómo preguntar a Nexa',
    documentType: 'how_to',
    ownerDomain: 'platform',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'functional',
    humanUrl: humanUrl('como-preguntar-a-nexa'),
    sourceFiles: ['docs/documentation/plataforma/saludo-nexa-home.md']
  },
  {
    slug: 'interpretar-fuentes-citas-nexa',
    title: 'Cómo interpretar fuentes y citas en respuestas de Nexa',
    documentType: 'how_to',
    ownerDomain: 'platform',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'functional',
    humanUrl: humanUrl('interpretar-fuentes-citas-nexa'),
    sourceFiles: null // to-author (deriva de la arquitectura §12.4)
  },
  {
    slug: 'diferencia-efeonce-greenhouse-nexa',
    title: 'Diferencia Efeonce / Greenhouse / Nexa',
    documentType: 'glossary',
    ownerDomain: 'platform',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'functional',
    humanUrl: humanUrl('diferencia-efeonce-greenhouse-nexa'),
    sourceFiles: ['docs/context/03_ecosistema-producto.md', 'docs/context/04_greenhouse-producto.md']
  },
  {
    slug: 'glosario-ico',
    title: 'Glosario ICO (RpA, OTD, FTR, Cycle Time, CSC)',
    documentType: 'glossary',
    ownerDomain: 'delivery',
    approverRole: 'efeonce_operations',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'functional',
    humanUrl: humanUrl('glosario-ico'),
    sourceFiles: ['docs/context/07_ico.md', 'docs/context/06_glosario-metricas.md']
  },
  {
    slug: 'motor-ico-metricas-operativas',
    title: 'Motor ICO: métricas operativas',
    documentType: 'manual',
    ownerDomain: 'delivery',
    approverRole: 'efeonce_operations',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'functional',
    humanUrl: humanUrl('motor-ico-metricas-operativas'),
    sourceFiles: ['docs/documentation/delivery/motor-ico-metricas-operativas.md']
  },
  {
    slug: 'roles-acceso-basicos',
    title: 'Roles y acceso básicos en Greenhouse',
    documentType: 'manual',
    ownerDomain: 'identity',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'functional',
    humanUrl: humanUrl('roles-acceso-basicos'),
    sourceFiles: ['docs/documentation/identity/sistema-identidad-roles-acceso.md']
  },
  {
    slug: 'accesos-rapidos',
    title: 'Accesos rápidos (atajos)',
    documentType: 'how_to',
    ownerDomain: 'platform',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'manual',
    humanUrl: humanUrl('accesos-rapidos'),
    sourceFiles: ['docs/manual-de-uso/plataforma/accesos-rapidos.md']
  },
  {
    slug: 'conexion-notion-cliente',
    title: 'Conexión Notion de un cliente',
    documentType: 'runbook',
    ownerDomain: 'operations',
    approverRole: 'efeonce_operations',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'manual',
    humanUrl: humanUrl('conexion-notion-cliente'),
    sourceFiles: ['docs/manual-de-uso/operations/notion-bq-sync-operacion.md']
  },
  {
    slug: 'reliability-control-plane',
    title: 'Reliability Control Plane: leer /admin/operations',
    documentType: 'manual',
    ownerDomain: 'platform',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'functional',
    humanUrl: humanUrl('reliability-control-plane'),
    sourceFiles: ['docs/documentation/plataforma/reliability-control-plane.md']
  },
  {
    slug: 'degradacion-honesta',
    title: 'Degradación honesta: cómo leer estados degradados',
    documentType: 'policy',
    ownerDomain: 'platform',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'functional',
    humanUrl: humanUrl('degradacion-honesta'),
    sourceFiles: null // to-author (deriva de reliability-control-plane)
  },
  {
    slug: 'alta-de-cliente',
    title: 'Alta de cliente (onboarding)',
    documentType: 'how_to',
    ownerDomain: 'commercial',
    approverRole: 'efeonce_account',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'manual',
    humanUrl: humanUrl('alta-de-cliente'),
    sourceFiles: ['docs/manual-de-uso/agency/alta-de-cliente.md']
  },
  {
    slug: 'mcp-greenhouse-read-only',
    title: 'MCP Greenhouse read-only: cómo usarlo',
    documentType: 'manual',
    ownerDomain: 'platform',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'manual',
    humanUrl: humanUrl('mcp-greenhouse-read-only'),
    sourceFiles: ['docs/manual-de-uso/plataforma/mcp-greenhouse-read-only.md']
  },
  {
    slug: 'periodos-de-nomina',
    title: 'Períodos de nómina: cómo funcionan',
    documentType: 'manual',
    ownerDomain: 'payroll',
    approverRole: 'hr_payroll',
    audience: 'internal',
    sensitivity: 'internal',
    // Nace excluido de Nexa hasta firma de hr_payroll (toca payroll).
    agenticPolicy: 'agent_excluded',
    docLayer: 'manual',
    humanUrl: humanUrl('periodos-de-nomina'),
    sourceFiles: ['docs/manual-de-uso/hr/periodos-de-nomina.md']
  },
  {
    slug: 'politica-secretos-acceso',
    title: 'Política interna de secretos y acceso sensible',
    documentType: 'policy',
    ownerDomain: 'security',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'restricted',
    agenticPolicy: 'agent_excluded', // humanos-only
    docLayer: 'technical',
    humanUrl: humanUrl('politica-secretos-acceso'),
    sourceFiles: null // to-author (extracto curado; NO ingerir CLAUDE.md crudo)
  }
] as const

/** Slug estable del source repo_docs piloto (idempotencia de get-or-create). */
export const PILOT_REPO_DOCS_SOURCE_NAME = 'Greenhouse Knowledge Pilot (repo_docs)'
