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

/* ─────────────────── Workforce Intake (TASK-873) ─────────────────── */
// Copy canónico para el workflow de Workforce Intake (member.workforce_intake_status
// pending_intake | in_review → completed). Surfaces consumidores:
// - Badge en PeopleListTable (Slice 2)
// - Botón "Completar ficha" en PersonView + drawer compartido (Slice 3)
// - Admin queue /admin/workforce/activation (Slice 4 — Workforce Activation workspace V1)
// - Link CTA en /admin/operations dashboard (Slice 5)
// Operador objetivo: HR (HR_PAYROLL, HR_MANAGER), FINANCE_ADMIN, EFEONCE_ADMIN.
// Tono: es-CL, tuteo, sentence case. Mirror de GH_RELEASE_ADMIN shape.
// V1.0: validación pre-flight queda como TASK-874. El operador confirma
// manualmente que la ficha está completa antes de completar — la copy lo
// explicita en el banner del drawer.

export const GH_WORKFORCE_INTAKE = {
  // ── Badges (PeopleListTable + PersonView) ─────────────────────────────
  badge_pending_intake: 'Ficha pendiente',
  badge_in_review: 'Ficha en revisión',
  badge_pending_intake_aria: 'Colaborador con ficha laboral pendiente de completar',
  badge_in_review_aria: 'Colaborador con ficha laboral en revisión',

  // ── Status labels (queue + drawer) ────────────────────────────────────
  status_pending_intake: 'Pendiente',
  status_in_review: 'En revisión',
  status_completed: 'Completada',

  // ── Action button (PersonView + queue row) ────────────────────────────
  button_complete_intake: 'Completar ficha',
  button_complete_intake_aria: 'Completar ficha laboral del colaborador',

  // ── Complete intake drawer ────────────────────────────────────────────
  drawer_title: 'Completar ficha laboral',
  drawer_subtitle_template: (displayName: string) =>
    `${displayName} dejará de aparecer como pendiente y entrará al flujo operativo de payroll.`,
  drawer_close_aria: 'Cerrar drawer',
  drawer_section_member: 'Colaborador',
  drawer_section_action: 'Confirmar acción',
  drawer_field_display_name: 'Nombre',
  drawer_field_email: 'Correo',
  drawer_field_status: 'Estado actual',
  drawer_field_age_days: 'Antigüedad',
  drawer_field_identity_profile: 'Identity profile',
  drawer_age_days_template: (n: number) =>
    `${n} día${n === 1 ? '' : 's'} desde creación SCIM`,
  drawer_warning_title: 'Verifica antes de completar',
  drawer_warning_body:
    'El guard valida contrato, cargo, compensación, perfil legal y datos de pago antes de completar. Si hay blockers, resuélvelos desde Workforce Activation.',
  drawer_reason_label: 'Notas (opcional)',
  drawer_reason_placeholder: 'Contexto u observación para el registro de auditoría.',
  drawer_reason_helper: 'Queda registrado en el outbox event y audit log.',
  drawer_submit: 'Marcar como completada',
  drawer_submit_loading: 'Completando…',
  drawer_cancel: 'Cancelar',

  // ── Toasts ────────────────────────────────────────────────────────────
  toast_submit_success: 'Ficha completada',
  toast_submit_error: 'No fue posible completar la ficha. Revisa los logs.',
  toast_submit_forbidden: 'No tienes permiso para completar esta ficha.',
  toast_submit_not_found: 'No se encontró el colaborador.',
  toast_submit_conflict: 'La ficha tiene blockers de activación o está en un estado que no permite la transición.',

  // ── Admin queue page ──────────────────────────────────────────────────
  // Copy alineado con mockup aprobado Codex 2026-05-14 (TASK-874 visual target).
  queue_page_title: 'Workforce Activation',
  queue_page_subtitle:
    'Habilitación laboral completa antes de cerrar intake: relación, cargo, compensación, pago y onboarding.',
  queue_filter_all: 'Todos',
  queue_filter_pending: 'Pendientes',
  queue_filter_in_review: 'En revisión',
  queue_filter_aria: 'Filtrar por estado de ficha',

  queue_column_name: 'Colaborador',
  queue_column_email: 'Correo',
  queue_column_status: 'Estado',
  queue_column_created: 'Creado',
  queue_column_age: 'Antigüedad',
  queue_column_actions: 'Acciones',
  queue_column_actions_aria: 'Acciones del colaborador',

  queue_load_more: 'Cargar más colaboradores',
  queue_loading: 'Cargando colaboradores…',
  queue_load_error: 'No fue posible cargar más colaboradores. Intenta de nuevo.',

  queue_empty_title: 'Sin fichas pendientes',
  queue_empty_body:
    'No hay colaboradores con ficha laboral pendiente o en revisión. Todo el equipo está al día.',

  // ── Banner (queue + admin operations link) ────────────────────────────
  banner_warning_template: (count: number, maxAgeDays: number) =>
    count === 0
      ? 'Sin colaboradores con ficha pendiente.'
      : `${count} colaborador${count === 1 ? '' : 'es'} con ficha pendiente > 7 días${maxAgeDays >= 30 ? ` (máx ${maxAgeDays} días — escalar)` : ''}.`,
  banner_link_to_queue: 'Ver fichas pendientes',
  banner_link_to_queue_aria: 'Ir al workspace de fichas laborales pendientes',

  // ── Header / breadcrumb ───────────────────────────────────────────────
  page_breadcrumb_admin: 'Admin',
  page_breadcrumb_workforce: 'Workforce'
} as const

export type GhWorkforceIntakeCopy = typeof GH_WORKFORCE_INTAKE

export const GH_WORKFORCE_ACTIVATION = {
  page_title: 'Workforce Activation',
  page_subtitle:
    'Habilitación laboral completa antes de cerrar intake: relación, cargo, compensación, pago y onboarding.',
  guard_active: 'Guard activo',
  export_blockers: 'Exportar blockers',
  new_activation: 'Nueva habilitación',
  control_ready: 'Listos',
  control_people: 'Personas por habilitar',
  control_relationship: 'Sin relación',
  control_compensation: 'Sin compensación',
  control_blocker_hint: 'El guard bloquea completar ficha hasta que las lanes críticas estén listas.',
  filter_all: 'Todos',
  filter_ready: 'Listos',
  filter_compensation: 'Sin compensación',
  filter_hire_date: 'Sin ingreso',
  filter_relationship: 'Sin relación legal',
  filter_payment: 'Sin pago',
  filter_contractor: 'Contractors',
  queue_title: 'Cola priorizada',
  queue_subtitle: 'Personas ordenadas por riesgo de activación incompleta.',
  queue_count: (count: number) => `${count} en vista`,
  readiness_label: 'Readiness',
  blockers_none: 'Sin blockers',
  blockers_count: (count: number) => `${count} blocker${count === 1 ? '' : 's'}`,
  ready_detail: 'Lista para completar',
  inspector_ready: 'Ficha lista para completar.',
  inspector_blocked: (items: string) => `Resolver primero: ${items}.`,
  resolve_blockers: 'Resolver blockers',
  resolver_title: 'Resolver blockers de activación',
  resolver_subtitle: (displayName: string) => `Completa los datos que faltan para habilitar a ${displayName}.`,
  resolver_labor_section: 'Datos laborales',
  resolver_compensation_section: 'Compensación',
  resolver_payment_section: 'Pago',
  resolver_current_blockers: 'Blockers actuales',
  resolver_hire_date: 'Fecha de ingreso',
  resolver_employment_type: 'Tipo de empleo',
  resolver_contract_type: 'Tipo de contrato',
  resolver_contract_end_date: 'Fin de contrato',
  resolver_deel_contract_id: 'Contrato Deel',
  resolver_daily_required: 'Requiere asistencia diaria',
  resolver_reason: 'Motivo del cambio',
  resolver_reason_placeholder: 'Ej: alta laboral revisada por HR.',
  resolver_save: 'Guardar datos laborales',
  resolver_saving: 'Guardando…',
  resolver_saved: 'Datos laborales guardados',
  resolver_save_error: 'No fue posible guardar los datos laborales.',
  resolver_open_compensation: 'Abrir compensación',
  resolver_payment_hint: 'Si el pago es interno, crea o aprueba un perfil de pago para este colaborador.',
  resolver_no_blockers: 'Sin blockers críticos en este carril.',
  critical_lanes: 'Lanes críticas',
  complete: 'Completar ficha',
  unblock_route: 'Ruta de desbloqueo',
  age_days: (count: number) => `${count} día${count === 1 ? '' : 's'}`,
  empty_title: 'Sin personas en esta vista',
  empty_body: 'Ajusta el filtro o revisa si la cola ya quedó despejada.'
} as const

export type GhWorkforceActivationCopy = typeof GH_WORKFORCE_ACTIVATION

/* ─────────────────── Commercial Pricing ─────────────────── */
// Copy canónico para el programa de pricing comercial (TASK-463..468).
// Inventariado y especificado en docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md §4.
// No usar copy hardcoded en componentes de src/components/greenhouse/pricing/ — siempre desde aquí.
