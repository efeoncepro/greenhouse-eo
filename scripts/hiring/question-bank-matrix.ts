/**
 * TASK-1384 — Matriz de cobertura del banco de preguntas (SoT del criterio "banco listo").
 *
 * Lote 1 = Account Manager L2 (la vacante real publicada EO-OPN-0009 define la prioridad).
 * Target por módulo: 3 preguntas activas en módulos core (weight ≥ 10) y 2 en módulos de
 * soporte — mezcla work-sample/situational primero (doctrina en la guía de autoría:
 * docs/documentation/hr/assessment-question-authoring-guide.md).
 *
 * Lotes 2+ agregan filas aquí (el reporte de cobertura lee esta matriz).
 */

export interface CoverageTarget {
  batch: string
  roleTemplateId: string
  competencyKey: string
  level: 'nociones' | 'intermedio' | 'avanzado'
  targetActive: number
}

export const QUESTION_BANK_MATRIX: CoverageTarget[] = [
  // ── Lote 1 — Account Manager L2 (atpl-account-manager-l2) ──
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'client_relationship_comm', level: 'intermedio', targetActive: 3 },
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'commercial_acumen', level: 'intermedio', targetActive: 3 },
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'copywriting', level: 'intermedio', targetActive: 3 },
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'composure_pressure', level: 'intermedio', targetActive: 3 },
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'leadership', level: 'intermedio', targetActive: 3 },
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'ownership', level: 'intermedio', targetActive: 3 },
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'seo', level: 'nociones', targetActive: 2 },
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'vendor_management', level: 'nociones', targetActive: 2 },
  { batch: 'lote-1-account-manager', roleTemplateId: 'atpl-account-manager-l2', competencyKey: 'delivery_coordination', level: 'intermedio', targetActive: 2 },
]
