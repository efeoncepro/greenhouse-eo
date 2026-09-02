/**
 * TASK-1805 — Policy ETV: vive SOBRE el transporte, no dentro de él.
 *
 * `src/lib/ai/dataforseo.ts` serializa `tasks` tal cual: no tiene hook por request y no debe tenerlo
 * (inyectar `use_improved_etv` globalmente lo enviaría a familias que no lo soportan y ocultaría la
 * decisión). Esta policy es la ÚNICA que traduce configuración → parámetro del proveedor → método
 * efectivo, y lo hace por endpoint:
 *
 *   - `etv_consumed`               → construye `{ use_improved_etv: boolean }` SIEMPRE explícito.
 *   - `etv_ignored`                → lanza: el caller no lee ETV; reclasificar y versionar antes.
 *   - `provider_supported_not_enabled` → lanza: sólo la task dueña habilita la familia.
 *   - endpoint desconocido         → lanza: fail-closed, jamás un default silencioso.
 *
 * Omitir el parámetro NO es una tercera policy: sólo cabe en una prueba controlada que mida el default
 * del proveedor, y esa prueba no pasa por esta función.
 *
 * ═══ Contrato temporal (respuesta del proveedor 2026-09-02) ═══
 *
 * Antes del corte: `false` = legacy, `true` = improved. Desde `2026-11-01T00:00:00Z`: `false` se IGNORA,
 * no hay fallback. Por eso una configuración legacy con `now >= corte` lanza ANTES de la request, y el
 * método efectivo se deriva del instante: nunca se atribuye legacy porque se envió un `false`.
 */

import {
  ETV_IMPROVED_METHODOLOGY,
  ETV_LEGACY_METHODOLOGY,
  ETV_METHODOLOGY_POLICY_VERSION,
  ETV_METHODOLOGY_VERSIONS,
  ETV_PROVIDER_CUTOFF_ISO,
  ETV_PROVIDER_CUTOFF_MS,
  ETV_PROVIDER_REQUEST_PARAM,
  EtvMethodologyPolicyError,
  GROWTH_SEO_ETV_METHODOLOGY_ENV,
  GROWTH_SEO_ETV_READ_METHODOLOGY_ENV,
  isEtvMethodologyVersion,
  type EtvFamilyClassification,
  type EtvHistoricalCalculationBasis,
  type EtvMethodologyEvidence,
  type EtvMethodologyReadState,
  type EtvMethodologyVersion
} from './contracts'
import { resolveEtvLabsFamilyByEndpoint, type EtvLabsFamilySlug } from './families'

export type EtvMethodologyConfigSource = 'env' | 'default'

export type EtvConfiguredMethodology = {
  version: EtvMethodologyVersion
  /** `env` cuando la variable estaba presente y válida; `default` cuando se usó el legacy explícito. */
  source: EtvMethodologyConfigSource
  envName: string
  policyVersion: string
}

const parseClosedVersion = (envName: string, raw: string | undefined): EtvConfiguredMethodology => {
  const trimmed = raw?.trim().toLowerCase()

  if (!trimmed) {
    return { version: ETV_LEGACY_METHODOLOGY, source: 'default', envName, policyVersion: ETV_METHODOLOGY_POLICY_VERSION }
  }

  if (!isEtvMethodologyVersion(trimmed)) {
    throw new EtvMethodologyPolicyError(
      'invalid_etv_methodology_config',
      `${envName} tiene un valor fuera del vocabulario cerrado; se rechaza antes de tocar al proveedor.`,
      { envName, allowed: ETV_METHODOLOGY_VERSIONS.join('|') }
    )
  }

  return { version: trimmed, source: 'env', envName, policyVersion: ETV_METHODOLOGY_POLICY_VERSION }
}

/**
 * Selector productivo de ESCRITURA (qué fórmula se compra). Parser cerrado: ausente → legacy explícito
 * (`source: 'default'`, visible en el readback), inválido → lanza. Nunca devuelve `unknown`.
 */
export const resolveConfiguredEtvMethodology = (env: NodeJS.ProcessEnv = process.env): EtvConfiguredMethodology =>
  parseClosedVersion(GROWTH_SEO_ETV_METHODOLOGY_ENV, env[GROWTH_SEO_ETV_METHODOLOGY_ENV])

/** Selector de LECTURA (qué fórmula sirven readers/API/MCP). Independiente del de escritura. */
export const resolveEtvReadMethodology = (env: NodeJS.ProcessEnv = process.env): EtvConfiguredMethodology =>
  parseClosedVersion(GROWTH_SEO_ETV_READ_METHODOLOGY_ENV, env[GROWTH_SEO_ETV_READ_METHODOLOGY_ENV])

export const isAfterEtvProviderCutoff = (at: Date): boolean => at.getTime() >= ETV_PROVIDER_CUTOFF_MS

/**
 * Método EFECTIVO derivado del contrato temporal. No es un campo leído de la respuesta: es lo que el
 * proveedor aplica dado lo solicitado y el instante. Desde el corte, todo es improved.
 */
export const deriveProviderEffectiveEtvMethodology = (
  requested: EtvMethodologyVersion,
  requestedAt: Date
): EtvMethodologyVersion => (isAfterEtvProviderCutoff(requestedAt) ? ETV_IMPROVED_METHODOLOGY : requested)

export type EtvMethodologyRequest = {
  familySlug: EtvLabsFamilySlug
  classification: Extract<EtvFamilyClassification, 'etv_consumed'>
  configured: EtvMethodologyVersion
  configuredSource: EtvMethodologyConfigSource
  requested: EtvMethodologyVersion
  providerEffective: EtvMethodologyVersion
  requestedAt: string
  policyVersion: string
  evidence: Extract<EtvMethodologyEvidence, 'explicit_request'>
  /** Parámetros a MEZCLAR en el task del proveedor. Siempre explícitos. */
  requestParams: { [ETV_PROVIDER_REQUEST_PARAM]: boolean }
}

export type BuildEtvMethodologyRequestInput = {
  endpoint: string
  env?: NodeJS.ProcessEnv
  now?: Date
  /** Override interno (evaluador/shadow). Los callers productivos NO lo pasan. */
  methodologyOverride?: EtvMethodologyVersion
}

/**
 * Construye la selección metodológica para UNA request a un endpoint ETV-capable consumido.
 * Lanza (fail-closed) ante endpoint desconocido/ignorado/no habilitado, configuración inválida o legacy
 * solicitado desde el corte. El resultado se persiste junto a la fila (provenance) y se loggea.
 */
export const buildEtvMethodologyRequest = ({
  endpoint,
  env = process.env,
  now = new Date(),
  methodologyOverride
}: BuildEtvMethodologyRequestInput): EtvMethodologyRequest => {
  const family = resolveEtvLabsFamilyByEndpoint(endpoint)

  if (!family) {
    throw new EtvMethodologyPolicyError(
      'unsupported_etv_methodology',
      'El endpoint no está en la matriz ETV-capable confirmada; no recibe el flag.',
      { endpoint }
    )
  }

  if (family.classification !== 'etv_consumed') {
    throw new EtvMethodologyPolicyError(
      'unsupported_etv_methodology',
      family.classification === 'etv_ignored'
        ? 'El caller de esta familia no consume ETV; reclasificar y versionar antes de pedir fórmula.'
        : 'Familia sin caller: sólo su task dueña puede habilitarla como consumidora de ETV.',
      { endpoint, familySlug: family.slug, classification: family.classification, ownerTask: family.ownerTask }
    )
  }

  const configured = resolveConfiguredEtvMethodology(env)
  const requested = methodologyOverride ?? configured.version

  if (requested === ETV_LEGACY_METHODOLOGY && isAfterEtvProviderCutoff(now)) {
    throw new EtvMethodologyPolicyError(
      'legacy_requested_after_cutoff',
      'Desde el corte del proveedor no existe legacy: la captura se congela en vez de enviar un false que se ignora.',
      { endpoint, familySlug: family.slug, cutoffAt: ETV_PROVIDER_CUTOFF_ISO, requestedAt: now.toISOString() }
    )
  }

  return {
    familySlug: family.slug,
    classification: 'etv_consumed',
    configured: configured.version,
    configuredSource: configured.source,
    requested,
    providerEffective: deriveProviderEffectiveEtvMethodology(requested, now),
    requestedAt: now.toISOString(),
    policyVersion: configured.policyVersion,
    evidence: 'explicit_request',
    requestParams: { [ETV_PROVIDER_REQUEST_PARAM]: requested === ETV_IMPROVED_METHODOLOGY }
  }
}

/**
 * Base de cálculo histórica para una fila improved de un mes dado (`YYYY-MM` o `YYYY-MM-DD`).
 * Legacy → null (nunca hubo dos bases). Improved → recomputado desde 2026-07, aproximación antes.
 */
export const resolveEtvHistoricalCalculationBasis = (
  methodology: EtvMethodologyVersion,
  captureMonth: string
): EtvHistoricalCalculationBasis | null => {
  if (methodology !== ETV_IMPROVED_METHODOLOGY) return null

  const month = captureMonth.slice(0, 7)

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new EtvMethodologyPolicyError('invalid_etv_methodology_config', 'Mes de captura inválido para derivar la base histórica.', {
      captureMonth
    })
  }

  return month >= '2026-07' ? 'fully_recomputed' : 'calibrated_approximation'
}

export type EtvMethodologyRow = { etv_methodology_version: string | null }

/**
 * Defensa en profundidad del reader: después de filtrar por método, la serie NO puede contener dos
 * fórmulas. Si las contiene, se lanza `mixed_etv_methodology` en vez de servir una trayectoria mixta.
 */
export const assertSingleEtvMethodology = <T extends EtvMethodologyRow>(
  rows: readonly T[],
  expected: EtvMethodologyVersion
): T[] => {
  const foreign = rows.filter(row => row.etv_methodology_version !== expected)

  if (foreign.length > 0) {
    const found = Array.from(new Set(foreign.map(row => row.etv_methodology_version ?? 'null'))).sort()

    throw new EtvMethodologyPolicyError('mixed_etv_methodology', 'La serie mezcla metodologías ETV; se rechaza en vez de servirla.', {
      expected,
      found: found.join('|'),
      rows: rows.length
    })
  }

  return [...rows]
}

/** Normaliza el valor persistido a un estado de lectura: cualquier cosa fuera del vocabulario es `unknown`. */
export const toEtvMethodologyReadState = (value: unknown): EtvMethodologyReadState =>
  isEtvMethodologyVersion(value) ? value : 'unknown_methodology'
