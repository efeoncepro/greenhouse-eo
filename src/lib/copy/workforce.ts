/**
 * TASK-811 — domain microcopy extracted from src/config/greenhouse-nomenclature.ts.
 *
 * This module keeps domain-specific visible copy out of the product
 * nomenclature/navigation contract while preserving type-safe GH_* ergonomics.
 * Do not rewrite strings in this file as part of trim-only work.
 */

export const GH_SKILLS_CERTS = {
  tab_label: 'Skills y certificaciones',
  tab_label_short: 'Skills',

  // Section headings
  section_skills: 'Skills',
  section_tools: 'Herramientas',
  section_certifications: 'Certificaciones',
  section_languages: 'Idiomas',
  section_professional_links: 'Links profesionales',
  section_about_me: 'Sobre mí',
  section_headline: 'Titular profesional',
  section_contact: 'Contacto',

  // Skills
  skill_add: 'Agregar skill',
  skill_edit: 'Editar skill',
  skill_remove: 'Eliminar skill',
  skill_seniority: 'Nivel',
  skill_category: 'Categoría',
  skill_status_self_declared: 'Autodeclarada',
  skill_status_verified: 'Verificada',
  skill_visibility_internal: 'Interna',
  skill_visibility_client: 'Visible para cliente',

  // Certifications
  cert_add: 'Agregar certificación',
  cert_edit: 'Editar certificación',
  cert_remove: 'Eliminar certificación',
  cert_issuer: 'Emisor',
  cert_issued_date: 'Fecha de emisión',
  cert_expiry_date: 'Fecha de vencimiento',
  cert_validation_url: 'Link de validación',
  cert_view: 'Ver certificado',
  cert_upload: 'Subir evidencia',
  cert_upload_helper: 'PDF, JPG, PNG o WebP. Máximo 10 MB.',
  cert_status_self_declared: 'Autodeclarada',
  cert_status_pending_review: 'Por revisar',
  cert_status_verified: 'Verificada',
  cert_status_rejected: 'Rechazada',
  cert_expired: 'Vencida',

  // Verification
  verify_action: 'Verificar',
  unverify_action: 'Quitar verificación',
  reject_action: 'Rechazar',
  verified_badge_label: 'Verificado por Efeonce',
  verification_date: 'Verificado el',

  // Links
  link_linkedin: 'LinkedIn',
  link_portfolio: 'Portfolio',
  link_twitter: 'X / Twitter',
  link_threads: 'Threads',
  link_behance: 'Behance',
  link_github: 'GitHub',
  link_dribbble: 'Dribbble',

  // Tools
  tool_add: 'Agregar herramienta',
  tool_edit: 'Editar herramienta',
  tool_remove: 'Eliminar herramienta',
  tool_proficiency: 'Dominio',
  tool_proficiency_beginner: 'Basico',
  tool_proficiency_intermediate: 'Intermedio',
  tool_proficiency_advanced: 'Avanzado',
  tool_proficiency_expert: 'Experto',

  // Languages
  lang_add: 'Agregar idioma',
  lang_edit: 'Editar idioma',
  lang_remove: 'Eliminar idioma',
  lang_proficiency: 'Nivel',
  lang_proficiency_basic: 'Basico',
  lang_proficiency_conversational: 'Conversacional',
  lang_proficiency_professional: 'Profesional',
  lang_proficiency_fluent: 'Fluido',
  lang_proficiency_native: 'Nativo',

  // Headline
  headline_placeholder: 'Ej: Senior UX Designer | Motion & Brand',

  // About me
  about_me_placeholder: 'Describe tu perfil profesional, especialidades y experiencia relevante.',

  // Summary counters
  summary_skills: (n: number) => `${n} skill${n === 1 ? '' : 's'}`,
  summary_certs_active: (n: number) => `${n} certificación${n === 1 ? '' : 'es'} activa${n === 1 ? '' : 's'}`,
  summary_verified: (n: number) => `${n} verificada${n === 1 ? '' : 's'}`,
  summary_expiring_soon: (n: number) => `${n} por vencer`,

  // Summary counters (tools + languages)
  summary_tools: (n: number) => `${n} herramienta${n === 1 ? '' : 's'}`,
  summary_languages: (n: number) => `${n} idioma${n === 1 ? '' : 's'}`,

  // Empty states
  empty_skills_title: 'Sin skills registradas',
  empty_skills_description: 'Agrega tus capacidades profesionales para que sean visibles en tu perfil.',
  empty_tools_title: 'Sin herramientas registradas',
  empty_tools_description: 'Agrega las herramientas y plataformas que dominas.',
  empty_certs_title: 'Sin certificaciones',
  empty_certs_description: 'Agrega tus certificaciones profesionales y sube la evidencia para que puedan ser verificadas.',
  empty_languages_title: 'Sin idiomas registrados',
  empty_languages_description: 'Agrega los idiomas que dominas y tu nivel de competencia.',
  empty_links_title: 'Sin links profesionales',
  empty_links_description: 'Agrega tus perfiles en plataformas profesionales.',
  empty_about_me: 'Aún no has escrito tu biografía profesional.',

  // Evidence
  section_evidence: 'Evidencia y portafolio',
  evidence_add: 'Agregar evidencia',
  evidence_view: 'Ver',
  evidence_remove: 'Eliminar evidencia',
  evidence_type_project_highlight: 'Proyecto',
  evidence_type_work_sample: 'Muestra',
  evidence_type_case_study: 'Caso',
  evidence_type_publication: 'Publicación',
  evidence_type_award: 'Premio',
  evidence_type_other: 'Otro',
  empty_evidence_title: 'Sin evidencia registrada',
  empty_evidence_description: 'Agrega proyectos, casos o muestras de trabajo para enriquecer tu perfil.',

  // Evidence dialog
  evidence_dialog_title: 'Agregar evidencia',
  evidence_field_title: 'Título',
  evidence_field_description: 'Descripción',
  evidence_field_type: 'Tipo de evidencia',
  evidence_field_skill: 'Skill relacionada',
  evidence_field_tool: 'Herramienta relacionada',
  evidence_field_url: 'URL externa',
  evidence_field_url_placeholder: 'https://...',

  // Endorsements
  section_endorsements: 'Endorsements',
  endorsement_empty_title: 'Sin endorsements',
  endorsement_empty_description: 'Tus colegas pueden respaldar tus skills y herramientas.',
  endorsement_moderate: 'Moderar',
  endorsement_remove: 'Eliminar',

  // Summary (evidence + endorsements)
  summary_evidence: (n: number) => `${n} evidencia${n === 1 ? '' : 's'}`,
  summary_endorsements: (n: number) => `${n} endorsement${n === 1 ? '' : 's'}`
} as const

/* ─────────────────── Talent Discovery ─────────────────── */

export const GH_TALENT_DISCOVERY = {
  page_title: 'Descubrimiento de talento',
  page_subtitle: 'Busca y filtra personas por skills, herramientas, certificaciones e idiomas',

  // Search & filters
  search_placeholder: 'Buscar por nombre, cargo o titular...',
  filter_skills: 'Skills',
  filter_tools: 'Herramientas',
  filter_verification: 'Verificación',
  filter_sort: 'Ordenar por',

  // Sort options
  sort_relevance: 'Relevancia',
  sort_availability: 'Mayor disponibilidad',
  sort_verified: 'Más verificados',

  // Verification filter options
  verification_all: 'Todos',
  verification_only_verified: 'Solo verificados',
  verification_with_verifications: 'Con verificaciones',

  // Summary cards
  summary_total: 'Total personas',
  summary_verified: 'Con skills verificadas',
  summary_availability: 'Disponibilidad promedio',
  summary_categories: 'Categorías',

  // Card labels
  card_available: 'disponibles',
  card_skills: 'skills',
  card_tools: 'herramientas',
  card_certifications: 'certificaciones',
  card_languages: 'idiomas',
  card_view_profile: 'Ver perfil',

  // Discovery score
  score_label: 'Score',

  // Empty state
  empty_title: 'No se encontraron personas con los filtros aplicados',
  empty_description: 'Ajusta los filtros o amplía tu búsqueda para encontrar talento.',

  // Loading
  loading: 'Cargando talento...',

  // Error
  error_message: 'No pudimos cargar los datos de talento. Verifica tu conexión e intenta de nuevo.'
} as const

/* ─────────────────── Client Talent Profile ─────────────────── */

export const GH_CLIENT_TALENT = {
  // Dialog / actions
  btn_view_profile: 'Ver perfil profesional',
  dialog_title: 'Perfil profesional verificado',
  empty_no_profile: 'Sin perfil profesional disponible',

  // Counter labels
  label_verified_items: 'habilidades verificadas',
  label_certifications: 'certificaciones activas',
  label_tools: 'herramientas',

  // Section headings (inside dossier)
  section_about_me: 'Sobre mi',
  section_skills: 'Habilidades',
  section_tools: 'Herramientas',
  section_certifications: 'Certificaciones',
  section_languages: 'Idiomas',
  section_links: 'Links profesionales',

  // Certification details
  cert_evidence_available: 'Evidencia disponible',
  cert_verify_link: 'Verificar certificado',

  // Loading / error
  loading_profiles: 'Cargando perfiles...',
  error_profiles: 'No pudimos cargar los perfiles del equipo. Intenta de nuevo.'
} as const

/* ─────────────────── Commercial Pricing ─────────────────── */
// Copy canónico para el programa de pricing comercial (TASK-463..468).
// Inventariado y especificado en docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md §4.
// No usar copy hardcoded en componentes de src/components/greenhouse/pricing/ — siempre desde aquí.
