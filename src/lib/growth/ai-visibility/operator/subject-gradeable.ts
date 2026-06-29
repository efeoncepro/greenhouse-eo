import 'server-only'

/**
 * TASK-1291 Slice 1 — Gate de validación pre-run/pre-envío del operador (defense-in-depth).
 *
 * `assertSubjectGradeable` es la FUENTE ÚNICA de la pregunta "¿se puede correr/enviar el grader
 * sobre esta marca sin repetir el falso-0?" (ISSUE-110). Aunque el motor (TASK-1288/1289/1290)
 * genere prompts correctos, este gate impide la acción cuando la marca no está resuelta:
 *
 *   - categoría canónica resuelta (`resolveRunCategory().resolved` — mismo predicado que TASK-1288,
 *     incluye umbral de confianza; NO una noción paralela);
 *   - para un PROSPECTO, además el `business_model` confirmado (≠ `unknown`) — el eje buyer-intent
 *     que define el arquetipo de prompts (TASK-1289/1290). Para un CLIENTE contratado basta la
 *     categoría (la relación ya legitima el envío como servicio).
 *
 * "Confirmado" = `business_model != unknown`, venga del grounded read o del override gobernado del
 * operador (`overrideProfileBusinessModel`, source `operator_override`). NO hay marca booleana
 * paralela en DB: la provenance + confianza de TASK-1289 ya lo codifican (SSOT, no se duplica).
 *
 * Función PURA (sin DB): los chokepoints (`requestGraderRunAsOperator`, `sendAeoReportAndCreateLead`)
 * derivan `audience` server-side desde `getOrganizationCommercialFacts` y pasan los campos del perfil.
 * Always-on en el surface operador (sin flag): a diferencia del guard de categoría público
 * (flag-gated por la cola de `unknown` legacy del lead magnet), el cross-sell operador NUNCA debe
 * salir sobre una marca no resuelta — enviar un informe falso a un prospecto destruye credibilidad.
 */

import { resolveRunCategory, type RunCategoryInput } from '../category-guard'
import { UNKNOWN_BUSINESS_MODEL } from '../taxonomy/business-model'

/** Audiencia del subject: prospecto (estricto: categoría + modelo) vs cliente (categoría basta). */
export type GradeableAudience = 'prospect' | 'client'

/** Razón por la que un subject NO es graduable. Mapea 1:1 a error canónico es-CL. */
export type SubjectUngradeableReason = 'category_unresolved' | 'business_model_unconfirmed'

export interface SubjectGradeabilityInput extends RunCategoryInput {
  /** `business_model` del perfil (TASK-1289). NULL/'unknown' = sin confirmar. */
  businessModel: string | null
  /** Derivada server-side desde el tipo real de la org (NUNCA del operador). */
  audience: GradeableAudience
}

export type SubjectGradeabilityResult = { ok: true } | { ok: false; reason: SubjectUngradeableReason }

/** True cuando el modelo de negocio está confirmado (resuelto a un arquetipo real). */
export const isBusinessModelConfirmed = (businessModel: string | null | undefined): boolean => {
  const value = businessModel?.trim() ?? ''

  return value.length > 0 && value !== UNKNOWN_BUSINESS_MODEL
}

/**
 * SoT del gate del operador. Pura y total: misma respuesta para el run y el envío.
 * Prospecto ungradeable hasta categoría resuelta Y modelo confirmado; cliente, hasta categoría.
 */
export const assertSubjectGradeable = (input: SubjectGradeabilityInput): SubjectGradeabilityResult => {
  const category = resolveRunCategory({
    categoryNodeId: input.categoryNodeId,
    categoryLabel: input.categoryLabel,
    categoryConfidence: input.categoryConfidence,
    rawCategory: input.rawCategory
  })

  if (!category.resolved) {
    return { ok: false, reason: 'category_unresolved' }
  }

  if (input.audience === 'prospect' && !isBusinessModelConfirmed(input.businessModel)) {
    return { ok: false, reason: 'business_model_unconfirmed' }
  }

  return { ok: true }
}
