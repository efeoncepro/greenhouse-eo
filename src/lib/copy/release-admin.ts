/**
 * TASK-854 Slice 1 — Domain microcopy for /admin/releases dashboard.
 *
 * Operator-facing copy (EFEONCE_ADMIN + DEVOPS_OPERATOR). Spanish (es-CL),
 * tuteo, sentence case. Tone: profesional + claro + accionable.
 *
 * Pattern canonical: domain copy module per CLAUDE.md "Copy reutilizable
 * por dominio" rule. Mirror de GH_AGENCY, GH_FINANCE shape.
 */

export const GH_RELEASE_ADMIN = {
  page_title: 'Releases producción',
  page_subtitle: 'Histórico de promociones develop → main',

  banner_degraded_template: (state: string, ageLabel: string) =>
    `Último release en estado ${state} hace ${ageLabel}. Operador debe inspeccionar manifest.`,
  banner_cta: 'Ver detalle',

  column_sha: 'SHA',
  column_state: 'Estado',
  column_started_at: 'Inicio',
  column_completed_at: 'Completado',
  column_duration: 'Duración',
  column_operator: 'Operador',
  column_attempt: 'Intento',
  column_actions_aria: 'Acciones del release',

  state_label_preflight: 'Preflight',
  state_label_ready: 'Listo',
  state_label_deploying: 'Desplegando',
  state_label_verifying: 'Verificando',
  state_label_released: 'Released',
  state_label_degraded: 'Degraded',
  state_label_aborted: 'Abortado',
  state_label_rolled_back: 'Revertido',

  empty_title: 'Sin releases aún',
  empty_body:
    'Cuando se promueva el primer release develop → main vía orquestador, aparecerá aquí.',
  empty_cta_runbook: 'Ver runbook',

  loading_text: 'Cargando releases...',
  load_more: 'Cargar más releases',

  drawer_title_template: (sha: string) => `Release ${sha.slice(0, 12)}`,
  drawer_close_aria: 'Cerrar detalle del release',
  drawer_state: 'Estado',
  drawer_started: 'Inicio',
  drawer_completed: 'Completado',
  drawer_duration: 'Duración',
  drawer_triggered_by: 'Iniciado por',
  drawer_attempt: 'Intento',
  drawer_target_branch: 'Branch destino',
  drawer_source_branch: 'Branch origen',
  drawer_release_id: 'Release ID',
  drawer_target_sha: 'SHA target',
  drawer_vercel_url: 'Vercel deployment',

  drawer_section_metadata: 'Metadata',
  drawer_section_rollback: 'Comando rollback',
  drawer_section_links: 'Enlaces',

  rollback_command_template: (releaseId: string) =>
    `pnpm release:rollback --release-id=${releaseId}`,
  rollback_copy_aria: 'Copiar comando rollback al portapapeles',
  rollback_copy_success: 'Comando copiado al portapapeles',
  rollback_explainer:
    'Ejecuta este comando localmente para revertir el release. Requiere capability platform.release.rollback (EFEONCE_ADMIN).',

  inflight_chip_label: 'En vuelo',

  duration_pending: '—',
  operator_pending: '—'
} as const

export type GhReleaseAdminCopy = typeof GH_RELEASE_ADMIN
