import type { FailureCategory } from './manifest'

/**
 * SSOT de finding codes de GVC.
 *
 * Regla canónica (TASK-1018): cualquier `CaptureFinding.code` nuevo se declara
 * acá, NO inline por callsite. Mantiene un único lugar para auditar la
 * taxonomía de hallazgos, su categoría y su intención.
 *
 * Los códigos legacy (frame_quality / auth / microinteraction / accessibility)
 * preceden a este registry; se enumeran aquí para tener la foto completa, pero
 * sus callsites históricos no se refactorizan en esta task.
 */
export const FINDING_CODES = {
  // --- legacy: frame quality + auth (quality.ts) ---
  frame_small_file: 'frame_small_file',
  frame_stat_failed: 'frame_stat_failed',
  full_page_without_scroll: 'full_page_without_scroll',
  login_route_captured: 'login_route_captured',
  login_ui_visible: 'login_ui_visible',
  error_boundary_visible: 'error_boundary_visible',
  loading_visible: 'loading_visible',
  // --- legacy: accessibility (quality.ts) ---
  axe_violations: 'axe_violations',
  axe_run_failed: 'axe_run_failed',
  // --- legacy: microinteraction (scenario.ts) ---
  interaction_missing_intent: 'interaction_missing_intent',
  interaction_target_not_visible: 'interaction_target_not_visible',
  interaction_without_keyboard_equivalent: 'interaction_without_keyboard_equivalent',
  // --- Slice 1: baseline visual contract ---
  baseline_missing: 'baseline_missing',
  baseline_stale: 'baseline_stale',
  frame_label_missing: 'frame_label_missing',
  visual_diff_exceeded: 'visual_diff_exceeded',
  visual_diff_dimension_mismatch: 'visual_diff_dimension_mismatch',
  visual_diff_failed: 'visual_diff_failed',
  required_region_missing: 'required_region_missing',
  mask_selector_missing: 'mask_selector_missing',
  // --- Slice 2: layout integrity ---
  layout_horizontal_overflow: 'layout_horizontal_overflow',
  layout_element_overflow: 'layout_element_overflow',
  layout_target_too_small: 'layout_target_too_small',
  layout_text_clipped: 'layout_text_clipped',
  layout_scroll_region_unlabeled: 'layout_scroll_region_unlabeled',
  layout_nested_cards: 'layout_nested_cards',
  layout_probe_failed: 'layout_probe_failed'
} as const

export type FindingCode = (typeof FINDING_CODES)[keyof typeof FINDING_CODES]

export const classifyCaptureFailure = (message?: string): FailureCategory | undefined => {
  if (!message) return undefined

  const normalized = message.toLowerCase()

  if (normalized.startsWith('readiness failed')) {
    return 'visual_timeout'
  }

  if (
    normalized.includes('/login') ||
    normalized.includes('/signin') ||
    normalized.includes('/auth/') ||
    normalized.includes('agent session') ||
    normalized.includes('storage')
  ) {
    return 'auth_redirect'
  }

  if (normalized.includes('assertion failed') || normalized.includes('assertion')) {
    return 'assertion_failed'
  }

  if (normalized.includes('quality') || normalized.includes('frame')) {
    return 'frame_quality'
  }

  if (normalized.includes('error boundary') || normalized.includes('application error') || normalized.includes('app error')) {
    return 'app_error'
  }

  if (normalized.includes('timeout') && (normalized.includes('selector') || normalized.includes('locator'))) {
    return 'selector_timeout'
  }

  if (normalized.includes('timeout') || normalized.includes('ready')) {
    return 'visual_timeout'
  }

  return 'helper_error'
}
