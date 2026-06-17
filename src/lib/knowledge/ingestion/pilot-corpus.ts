/**
 * TASK-1082 — Pilot corpus manifest (declarativo, pure).
 *
 * Los 15 documentos internos del MVP (TASK-1080 → arquitectura Delta tabla C +
 * TASK-1092 coverage readiness) más el paquete de manuales operativos
 * (TASK-1140), mapeados a sus archivos markdown del repo. La metadata de
 * gobernanza (audience/sensitivity/agentic_policy/approver) es decisión editorial
 * declarada aquí — NO se infiere del contenido.
 *
 * `sourceFiles: null` = documento "to-author" (aún no existe como fuente única);
 * el connector lo reporta `unavailable` (skipped honesto) hasta que se escriba.
 *
 * Reglas de la aceptación TASK-1080:
 *  - MVP solo interno: audience='internal'.
 *  - #13 (períodos de nómina, MANUAL legacy) nace `agent_excluded` y se deja igual.
 *  - #14 (política de secretos) nace `agent_excluded` + `restricted` (humanos-only).
 *  - #15 (modo mantenimiento) se agrega por TASK-1092 para cerrar K5 de QA.
 *
 * TASK-1140 — paquete de manuales operativos end-to-end (Finance, People/Workforce/
 * Payroll/Contractors, Comercial, Agency, Identity, My Space, Portal Cliente,
 * Integraciones/Sync, Comunicaciones, AI Tooling, Admin Center, Public Site, UI
 * Platform). Decisión del operador (governance, opción A): los manuales operativos
 * de TODOS los dominios — incluidos HR/Payroll/Contractors — nacen `agent_allowed`
 * para que Nexa los cite en modo agentic; la seguridad legal/tributaria + "Nexa no
 * ejecuta acciones" se gobierna en la capa de respuesta (Answer Rules de Nexa), NO
 * por exclusión del corpus. El doc `restricted` de secretos sigue `agent_excluded`
 * (humanos-only) — esa es la exclusión durable. Todo interno; sensibilidad interna.
 * No se ingiere data de runtime ni perfiles/cuentas: son manuales de cómo opera el
 * sistema, no datos sensibles.
 */

import type { KnowledgeDocCandidate } from './connector'

export interface PilotCorpusEntry extends Omit<KnowledgeDocCandidate, 'sourceLocator'> {
  /** Rutas markdown del repo (relativas a la raíz). null = to-author. */
  sourceFiles: string[] | null
}

const humanUrl = (slug: string): string => `/knowledge/${slug}`

const PILOT_CORPUS_BASE: readonly PilotCorpusEntry[] = [
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
  },
  {
    slug: 'modo-mantenimiento',
    title: 'Modo mantenimiento: activar y desactivar',
    documentType: 'runbook',
    ownerDomain: 'platform',
    approverRole: 'efeonce_admin',
    audience: 'internal',
    sensitivity: 'internal',
    agenticPolicy: 'agent_allowed',
    docLayer: 'manual',
    humanUrl: humanUrl('modo-mantenimiento'),
    sourceFiles: ['docs/manual-de-uso/plataforma/modo-mantenimiento.md']
  }
] as const

/**
 * TASK-1140 — builder de manuales operativos. Toda entrada es interna, sensibilidad
 * interna y `agent_allowed` (decisión del operador, opción A). `docLayer` y
 * `documentType` derivan de la capa documental: `functional` → `manual`,
 * `manual` (operador) → `how_to`. El connector reporta `unavailable` si el archivo
 * no existe (skipped honesto) — los 67 paths se verificaron presentes al ingerir.
 */
const operatingManual = (
  layer: 'functional' | 'manual',
  slug: string,
  title: string,
  ownerDomain: string,
  approverRole: string,
  sourceFile: string
): PilotCorpusEntry => ({
  slug,
  title,
  documentType: layer === 'functional' ? 'manual' : 'how_to',
  ownerDomain,
  approverRole,
  audience: 'internal',
  sensitivity: 'internal',
  agenticPolicy: 'agent_allowed',
  docLayer: layer,
  humanUrl: humanUrl(slug),
  sourceFiles: [sourceFile]
})

const F = (...a: [string, string, string, string, string]) => operatingManual('functional', ...a)
const M = (...a: [string, string, string, string, string]) => operatingManual('manual', ...a)

/**
 * Paquete operativo TASK-1140 (67 docs). Cada doc normativo es su propia entrada
 * (slug + título) para que una pregunta pueda recuperar el funcional y el manual del
 * dominio correcto por separado. NO se re-ingieren docs ya cubiertos por el corpus
 * base: `manual-de-uso/hr/periodos-de-nomina.md` (→ `periodos-de-nomina`) ni
 * `manual-de-uso/operations/notion-bq-sync-operacion.md` (→ `conexion-notion-cliente`).
 */
const OPERATING_MANUALS_CORPUS: readonly PilotCorpusEntry[] = [
  // ── Finance (14) ──────────────────────────────────────────────────────────
  F('finance-operacion-end-to-end', 'Operación de Finance end-to-end', 'finance', 'finance_admin', 'docs/documentation/finance/operacion-finance-end-to-end.md'),
  M('finance-registrar-ingresos-egresos-ordenes-pago', 'Registrar ingresos, egresos, pagos y órdenes de pago', 'finance', 'finance_admin', 'docs/manual-de-uso/finance/registrar-ingresos-egresos-y-ordenes-de-pago.md'),
  M('finance-caja-cobros-pagos-liquidaciones', 'Caja: cobros, pagos y liquidaciones', 'finance', 'finance_admin', 'docs/manual-de-uso/finance/caja-cobros-pagos-y-liquidaciones.md'),
  M('finance-conciliacion-bancaria-operacion', 'Conciliación bancaria operativa', 'finance', 'finance_admin', 'docs/manual-de-uso/finance/conciliacion-bancaria-operacion.md'),
  M('finance-instrumentos-de-pago-y-banco', 'Instrumentos de pago y Banco', 'finance', 'finance_admin', 'docs/manual-de-uso/finance/instrumentos-de-pago-y-banco.md'),
  F('finance-modulos-caja-cobros-pagos', 'Módulos de Caja: cobros, pagos, Banco y posición de caja', 'finance', 'finance_admin', 'docs/documentation/finance/modulos-caja-cobros-pagos.md'),
  F('finance-ordenes-de-pago', 'Órdenes de pago en Finanzas', 'finance', 'finance_admin', 'docs/documentation/finance/ordenes-de-pago.md'),
  M('finance-ordenes-de-pago-manual', 'Órdenes de pago: manual de uso', 'finance', 'finance_admin', 'docs/manual-de-uso/finance/ordenes-de-pago.md'),
  F('finance-pagos-a-contractors', 'Pagos a contractors: workbench de Finanzas', 'finance', 'finance_admin', 'docs/documentation/finance/pagos-a-contractors.md'),
  M('finance-pagos-a-contractors-manual', 'Pagos a contractors: manual de Finanzas', 'finance', 'finance_admin', 'docs/manual-de-uso/finance/pagos-a-contractors.md'),
  F('finance-conciliacion-bancaria', 'Conciliación bancaria', 'finance', 'finance_admin', 'docs/documentation/finance/conciliacion-bancaria.md'),
  M('finance-sugerencias-asistidas-conciliacion', 'Sugerencias asistidas de conciliación', 'finance', 'finance_admin', 'docs/manual-de-uso/finance/sugerencias-asistidas-conciliacion.md'),
  F('finance-distribucion-costos-pnl', 'Distribución de costos para P&L operativo', 'finance', 'finance_admin', 'docs/documentation/finance/distribucion-costos-pnl.md'),
  M('finance-distribucion-costos-pnl-manual', 'Distribución de costos para P&L: manual', 'finance', 'finance_admin', 'docs/manual-de-uso/finance/distribucion-costos-pnl.md'),

  // ── People / Workforce / Payroll / Contractors (22) ───────────────────────
  F('hr-people-workforce-payroll-contractors-end-to-end', 'People, Workforce, Payroll y Contractors end-to-end', 'hr', 'hr_manager', 'docs/documentation/hr/people-workforce-payroll-contractors-end-to-end.md'),
  M('hr-operar-workforce-payroll-contractors-end-to-end', 'Operar Workforce, Payroll y Contractors end-to-end', 'hr', 'hr_manager', 'docs/manual-de-uso/hr/operar-workforce-payroll-contractors-end-to-end.md'),
  F('workforce-activation-readiness', 'Workforce Activation Readiness', 'workforce', 'hr_manager', 'docs/documentation/hr/workforce-activation-readiness.md'),
  M('workforce-habilitar-colaborador', 'Habilitar un colaborador en Workforce Activation', 'workforce', 'hr_manager', 'docs/manual-de-uso/hr/habilitar-colaborador-workforce.md'),
  M('workforce-completar-ficha-laboral', 'Completar la ficha laboral de un colaborador', 'workforce', 'hr_manager', 'docs/manual-de-uso/hr/completar-ficha-laboral.md'),
  F('payroll-periodos-de-nomina-funcional', 'Períodos de nómina: cómo funcionan', 'payroll', 'hr_payroll', 'docs/documentation/hr/periodos-de-nomina.md'),
  F('payroll-recibos-reporte-mensual', 'Recibos y reporte mensual de nómina', 'payroll', 'hr_payroll', 'docs/documentation/hr/recibos-y-reporte-mensual.md'),
  M('payroll-descargar-reconciliar-nomina', 'Descargar y reconciliar la nómina mensual', 'payroll', 'hr_payroll', 'docs/manual-de-uso/hr/descargar-y-reconciliar-nomina.md'),
  F('payroll-compliance-exports-chile', 'Exports de compliance de payroll (Chile): Previred y LRE', 'payroll', 'hr_payroll', 'docs/documentation/hr/payroll-compliance-exports-chile.md'),
  M('payroll-compliance-exports-chile-manual', 'Exportar Previred y LRE desde Payroll', 'payroll', 'hr_payroll', 'docs/manual-de-uso/hr/payroll-compliance-exports-chile.md'),
  F('payroll-reliquidacion-de-nomina', 'Reliquidación de nómina', 'payroll', 'hr_payroll', 'docs/documentation/hr/reliquidacion-de-nomina.md'),
  F('payroll-ajustes-de-pago', 'Ajustes de pago en nómina', 'payroll', 'hr_payroll', 'docs/documentation/hr/ajustes-de-pago-en-nomina.md'),
  M('payroll-ajustar-pago-manual', 'Ajustar el pago de un colaborador en una nómina', 'payroll', 'hr_payroll', 'docs/manual-de-uso/hr/ajustar-pago-de-nomina.md'),
  F('payroll-finiquitos-chile', 'Finiquitos (Chile)', 'payroll', 'hr_payroll', 'docs/documentation/hr/finiquitos.md'),
  M('payroll-finiquitos-chile-manual', 'Finiquitos (Chile): manual de uso', 'payroll', 'hr_payroll', 'docs/manual-de-uso/hr/finiquitos.md'),
  F('workforce-offboarding', 'Offboarding laboral y contractual', 'workforce', 'hr_manager', 'docs/documentation/hr/offboarding.md'),
  M('workforce-offboarding-manual', 'Offboarding: manual de uso', 'workforce', 'hr_manager', 'docs/manual-de-uso/hr/offboarding.md'),
  F('contractor-self-service', 'Contractors: self-service y workbench HR', 'contractor', 'hr_payroll', 'docs/documentation/hr/contratistas-self-service.md'),
  F('contractor-engagement-ciclo-de-vida', 'Engagement de contractor: ciclo de vida y clasificación', 'contractor', 'hr_payroll', 'docs/documentation/hr/contratistas-engagement-ciclo-de-vida.md'),
  F('contractor-onboarding', 'Onboarding de contractor: crear un engagement', 'contractor', 'hr_payroll', 'docs/documentation/hr/contratistas-onboarding.md'),
  M('contractor-self-service-manual', 'Contractors: self-service y revisión HR', 'contractor', 'hr_payroll', 'docs/manual-de-uso/hr/contratistas.md'),
  F('contractor-flujo-de-pago-completo', 'Contractors: flujo de pago completo y convergencia con la nómina', 'contractor', 'hr_payroll', 'docs/documentation/hr/contratistas-flujo-de-pago-completo.md'),

  // ── Comercial / Quote-to-Cash (3) ─────────────────────────────────────────
  F('commercial-quote-to-cash-end-to-end', 'Comercial y Quote-to-Cash end-to-end', 'commercial', 'efeonce_account', 'docs/documentation/comercial/quote-to-cash-comercial-end-to-end.md'),
  M('commercial-operar-quote-to-cash', 'Operar Comercial y Quote-to-Cash', 'commercial', 'efeonce_account', 'docs/manual-de-uso/comercial/operar-quote-to-cash-comercial.md'),
  F('commercial-servicios-engagement', 'Servicios y engagements: modelo comercial y catálogo', 'commercial', 'efeonce_account', 'docs/documentation/comercial/servicios-engagement.md'),

  // ── Agency / Delivery / Account 360 (2) ───────────────────────────────────
  F('agency-delivery-account-360-end-to-end', 'Agency, Delivery y Account 360 end-to-end', 'agency', 'efeonce_operations', 'docs/documentation/agency/agency-delivery-account-360-end-to-end.md'),
  M('agency-operar-delivery-account-360', 'Operar Agency, Delivery y Account 360', 'agency', 'efeonce_operations', 'docs/manual-de-uso/agency/operar-agency-delivery-account-360.md'),

  // ── Identity / Access / Admin Center (3) ──────────────────────────────────
  F('identity-access-admin-center-end-to-end', 'Identity, Access y Admin Center end-to-end', 'identity', 'efeonce_admin', 'docs/documentation/identity/identity-access-admin-center-end-to-end.md'),
  M('identity-operar-access-admin-center', 'Operar Identity, Access y Admin Center', 'identity', 'efeonce_admin', 'docs/manual-de-uso/identity/operar-identity-access-admin-center.md'),
  F('identity-scim-entra-provisioning', 'SCIM con Entra: aprovisionamiento de identidades', 'identity', 'efeonce_admin', 'docs/documentation/identity/scim-entra-provisioning.md'),

  // ── Personas / My Space (2) ───────────────────────────────────────────────
  F('personas-my-space-self-service-end-to-end', 'Mi Espacio y self-service end-to-end', 'personas', 'efeonce_admin', 'docs/documentation/personas/my-space-self-service-end-to-end.md'),
  M('personas-operar-mi-espacio-self-service', 'Usar Mi Espacio self-service', 'personas', 'efeonce_admin', 'docs/manual-de-uso/personas/operar-mi-espacio-self-service.md'),

  // ── Public Site / Content Factory (2) ─────────────────────────────────────
  F('public-site-content-factory-end-to-end', 'Public Site y Content Factory end-to-end', 'public-site', 'efeonce_admin', 'docs/documentation/public-site/public-site-content-factory-end-to-end.md'),
  M('public-site-operar-content-factory', 'Operar Public Site y Content Factory', 'public-site', 'efeonce_admin', 'docs/manual-de-uso/public-site/operar-public-site-content-factory.md'),

  // ── UI Platform / Design System (2) ───────────────────────────────────────
  F('ui-platform-design-system-end-to-end', 'UI Platform y Design System end-to-end', 'ui-platform', 'designer', 'docs/documentation/plataforma/ui-platform-design-system-end-to-end.md'),
  M('ui-platform-operar-design-system', 'Operar UI Platform y Design System', 'ui-platform', 'designer', 'docs/manual-de-uso/plataforma/operar-ui-platform-design-system.md'),

  // ── Portal Cliente / Customer Experience (4) ──────────────────────────────
  F('client-portal-customer-experience-end-to-end', 'Portal Cliente y Customer Experience end-to-end', 'client-portal', 'efeonce_account', 'docs/documentation/client-portal/portal-cliente-customer-experience-end-to-end.md'),
  M('client-portal-operar-customer-experience', 'Operar Portal Cliente y Customer Experience', 'client-portal', 'efeonce_account', 'docs/manual-de-uso/client-portal/operar-portal-cliente-customer-experience.md'),
  F('client-portal-menu-dinamico-acceso-modulos', 'Menú dinámico y acceso a módulos del Portal Cliente', 'client-portal', 'efeonce_account', 'docs/documentation/client-portal/menu-dinamico-y-acceso-a-modulos.md'),
  M('client-portal-menu-dinamico-empty-states', 'Menú dinámico y empty states del Portal Cliente', 'client-portal', 'efeonce_account', 'docs/manual-de-uso/client-portal/menu-dinamico-y-empty-states.md'),

  // ── Integraciones / Sync (3) ──────────────────────────────────────────────
  F('integrations-sync-end-to-end', 'Integraciones y Sync end-to-end', 'integrations', 'efeonce_operations', 'docs/documentation/operations/integraciones-y-sync-end-to-end.md'),
  M('integrations-operar-sync', 'Operar Integraciones y Sync', 'integrations', 'efeonce_operations', 'docs/manual-de-uso/operations/operar-integraciones-y-sync.md'),
  F('sync-notion-bigquery', 'Sincronización Notion → BigQuery (notion-bq-sync)', 'sync', 'efeonce_operations', 'docs/documentation/operations/notion-bigquery-sync.md'),

  // ── Comunicaciones / Notificaciones (4) ───────────────────────────────────
  F('communications-notificaciones-end-to-end', 'Comunicaciones y Notificaciones end-to-end', 'communications', 'efeonce_admin', 'docs/documentation/plataforma/comunicaciones-notificaciones-end-to-end.md'),
  M('communications-operar-notificaciones', 'Operar Comunicaciones y Notificaciones', 'communications', 'efeonce_admin', 'docs/manual-de-uso/plataforma/operar-comunicaciones-notificaciones.md'),
  F('communications-sistema-email-templates', 'Sistema de Email: entrega, templates y protección', 'communications', 'efeonce_admin', 'docs/documentation/plataforma/sistema-email-templates.md'),
  F('communications-preview-de-correos', 'Preview de correos: vista previa y prueba de emails', 'communications', 'efeonce_admin', 'docs/documentation/admin-center/preview-de-correos.md'),

  // ── AI Tooling / Content / Assets (3) ─────────────────────────────────────
  F('ai-tooling-content-assets-end-to-end', 'AI Tooling, Content y Assets end-to-end', 'ai-tooling', 'ai_tooling_admin', 'docs/documentation/ai-tooling/ai-tooling-content-assets-end-to-end.md'),
  M('ai-tooling-operar-content-assets', 'Operar AI Tooling, Content y Assets', 'ai-tooling', 'ai_tooling_admin', 'docs/manual-de-uso/ai-tooling/operar-ai-tooling-content-assets.md'),
  F('ai-tooling-generador-visual-assets', 'Generador visual de assets con IA', 'ai-tooling', 'ai_tooling_admin', 'docs/documentation/ai-tooling/generador-visual-assets.md'),

  // ── Admin Center (3) ──────────────────────────────────────────────────────
  F('admin-center-operacion-end-to-end', 'Admin Center end-to-end', 'admin', 'efeonce_admin', 'docs/documentation/admin-center/admin-center-operacion-end-to-end.md'),
  M('admin-center-operar', 'Operar Admin Center', 'admin', 'efeonce_admin', 'docs/manual-de-uso/admin-center/operar-admin-center.md'),
  F('admin-center-sets-de-permisos', 'Sets de permisos: gobierno de acceso por conjuntos', 'admin', 'efeonce_admin', 'docs/documentation/admin-center/sets-de-permisos.md')
] as const

export const PILOT_CORPUS: readonly PilotCorpusEntry[] = [...PILOT_CORPUS_BASE, ...OPERATING_MANUALS_CORPUS]

/** Slug estable del source repo_docs piloto (idempotencia de get-or-create). */
export const PILOT_REPO_DOCS_SOURCE_NAME = 'Greenhouse Knowledge Pilot (repo_docs)'
