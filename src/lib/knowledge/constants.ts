/**
 * TASK-1081 — Knowledge Platform canonical enums (pure, client + server safe).
 *
 * Mirror 1:1 de los CHECK constraints de la migración
 * `greenhouse_knowledge` (20260611200140700). Si cambia el enum en DB, cambia aquí.
 */

export const KNOWLEDGE_SOURCE_SYSTEMS = ['notion', 'repo_docs'] as const

export const KNOWLEDGE_SOURCE_KINDS = [
  'notion_page_tree',
  'notion_data_source',
  'markdown_collection'
] as const

export const KNOWLEDGE_SOURCE_STATUSES = ['active', 'paused', 'archived'] as const

export const KNOWLEDGE_PUBLICATION_POLICIES = ['manual_review', 'auto_publish'] as const

export const KNOWLEDGE_TENANT_SCOPE_TYPES = ['global', 'tenant'] as const

export const KNOWLEDGE_AUDIENCES = ['internal', 'client', 'mixed'] as const

/** MVP solo interno: `client_safe` diferido a la fase cliente (TASK-1080 D-2). */
export const KNOWLEDGE_SENSITIVITIES = ['internal', 'restricted'] as const

export const KNOWLEDGE_DOCUMENT_TYPES = [
  'manual',
  'how_to',
  'sop',
  'runbook',
  'faq',
  'glossary',
  'troubleshooting',
  'policy',
  'onboarding_path'
] as const

/** Lifecycle editorial. `quarantined` = bloqueo (gana sobre todo). */
export const KNOWLEDGE_PUBLICATION_STATUSES = [
  'draft',
  'review',
  'published',
  'stale',
  'deprecated',
  'quarantined'
] as const

/** Compuerta de retrieval — ORTOGONAL a publication_status (TASK-1080 D-3). */
export const KNOWLEDGE_AGENTIC_POLICIES = ['agent_allowed', 'agent_excluded'] as const

export const KNOWLEDGE_DOC_LAYERS = ['technical', 'functional', 'manual'] as const

export const KNOWLEDGE_VERSION_STATUSES = ['draft', 'published', 'superseded'] as const

export const KNOWLEDGE_FRESHNESS = ['current', 'stale', 'deprecated', 'unknown'] as const

export const KNOWLEDGE_RUN_KINDS = [
  'sync',
  'publish',
  'quarantine',
  'deprecate',
  'stale_mark',
  'feedback'
] as const

export const KNOWLEDGE_RUN_STATUSES = ['running', 'succeeded', 'failed', 'skipped'] as const

export const KNOWLEDGE_FEEDBACK_KINDS = [
  'useful',
  'not_useful',
  'wrong_source',
  'stale',
  'missing_doc'
] as const
