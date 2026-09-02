/**
 * TASK-1805 — La metodología de ETV es una DIMENSIÓN DEL HECHO, no un detalle del proveedor.
 *
 * DataForSEO cambia el cálculo detrás del mismo campo `etv` (aviso 2026-09-01; contrato confirmado
 * 2026-09-02). El shape no cambia, el parser no falla y los tests siguen verdes — y por eso una
 * revisión del modelo entraría a la trayectoria como si fuera performance SEO. Este módulo fija el
 * vocabulario cerrado con el que Greenhouse persiste, lee y sirve la fórmula detrás de cada cifra
 * ETV. ADR: `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`.
 *
 * Módulo PURO (sin `server-only`, sin runtime): lo importan writers/readers de servidor, el lane
 * ecosystem, las tools MCP, el ops-worker y los tests. Cero dependencias.
 *
 * ═══ Invariantes que este archivo hace verificables ═══
 *
 * - Los nombres internos son ESTABLES aunque DataForSEO renombre el producto comercial.
 * - `unknown_methodology` es un estado de LECTURA/degradación. NUNCA es válido para una escritura
 *   nueva: el CHECK de la columna sólo admite las dos versiones reales.
 * - El corte del proveedor es un INSTANTE UTC fijo, no una fecha local ni un "a partir de noviembre".
 * - `provider_effective_method` se DERIVA del contrato temporal (lo solicitado + el instante de la
 *   request): la respuesta del proveedor no expone la versión aplicada.
 */

/** Versiones metodológicas REALES (las únicas que una escritura puede persistir). */
export const ETV_METHODOLOGY_VERSIONS = ['legacy_static_v1', 'improved_layout_clickstream_v2'] as const

export type EtvMethodologyVersion = (typeof ETV_METHODOLOGY_VERSIONS)[number]

export const ETV_LEGACY_METHODOLOGY: EtvMethodologyVersion = 'legacy_static_v1'
export const ETV_IMPROVED_METHODOLOGY: EtvMethodologyVersion = 'improved_layout_clickstream_v2'

/**
 * Estado de lectura: una versión real o `unknown_methodology` cuando la evidencia no permite
 * atribuir con certeza. Los readers lo devuelven; los writers NO lo aceptan.
 */
export type EtvMethodologyReadState = EtvMethodologyVersion | 'unknown_methodology'

export const ETV_UNKNOWN_METHODOLOGY: EtvMethodologyReadState = 'unknown_methodology'

/**
 * Cómo se determinó la metodología de una fila. Es la diferencia entre "lo pedimos" y "lo asumimos":
 *
 * - `explicit_request`: la request llevó `use_improved_etv` explícito y quedaron `etv_requested_at` +
 *   `etv_policy_version`. Toda escritura del código formula-aware.
 * - `contract_default_pre_cutoff`: la fila se atribuye por CONTRATO (cuenta registrada antes del
 *   2026-09-01 → default legacy durante la transición) y por REQUEST SHAPE (el código nunca envió el
 *   flag, verificable en git), SIEMPRE con `captured_at` anterior al corte. Es la evidencia de las
 *   filas preexistentes al expand y de lo que el código viejo escriba hasta el release. Después del
 *   corte esta evidencia es IMPOSIBLE (el default del proveedor ya es improved) y la base la rechaza.
 */
export const ETV_METHODOLOGY_EVIDENCE_KINDS = ['explicit_request', 'contract_default_pre_cutoff'] as const

export type EtvMethodologyEvidence = (typeof ETV_METHODOLOGY_EVIDENCE_KINDS)[number]

/**
 * Base de cálculo del histórico improved, confirmada por el proveedor:
 * - `fully_recomputed`: julio de 2026 en adelante se recomputa keyword por keyword.
 * - `calibrated_approximation`: antes de julio de 2026 se convierte con el ratio legacy/improved de
 *   julio POR DOMINIO. Es una aproximación, no una recomputación — nunca sirve para YoY sin disclosure.
 * Legacy no tiene base histórica (siempre fue una sola fórmula): la columna queda NULL.
 */
export const ETV_HISTORICAL_CALCULATION_BASES = ['fully_recomputed', 'calibrated_approximation'] as const

export type EtvHistoricalCalculationBasis = (typeof ETV_HISTORICAL_CALCULATION_BASES)[number]

/** Primer mes (inclusive) recomputado completamente bajo improved. */
export const ETV_IMPROVED_FULL_RECOMPUTE_FROM_MONTH = '2026-07'

/**
 * Corte global del proveedor: desde este instante `use_improved_etv: false` SE IGNORA y no existe
 * fallback legacy. Una configuración legacy debe fallar ANTES de la request; nunca se atribuye
 * legacy porque se envió un `false` que el proveedor ignora.
 */
export const ETV_PROVIDER_CUTOFF_ISO = '2026-11-01T00:00:00.000Z'
export const ETV_PROVIDER_CUTOFF_MS = Date.parse(ETV_PROVIDER_CUTOFF_ISO)

/**
 * Versión de la POLICY (no de la fórmula). Sube cuando cambia cómo Greenhouse traduce configuración
 * → request → método efectivo (por ejemplo, si el proveedor publica un identificador de fórmula en la
 * respuesta). Se persiste por fila para que una fila vieja pueda reinterpretarse con su policy.
 */
export const ETV_METHODOLOGY_POLICY_VERSION = 'etv-policy.v1'

/**
 * Cómo se reparte el ETV de una referencia de AI Overview según el proveedor: uniformemente entre
 * los dominios únicos citados. Es atribución MODELADA, nunca clics observados por cita: los
 * consumers lo rotulan así y no lo suman al tráfico orgánico.
 */
export const AI_OVERVIEW_ETV_ATTRIBUTION = 'modeled_uniform_share_among_cited_domains'

/** Parámetro EXACTO del contrato del proveedor. Sólo lo construye la policy; ningún caller lo escribe. */
export const ETV_PROVIDER_REQUEST_PARAM = 'use_improved_etv'

/** Env var del selector productivo de ESCRITURA/request. Parser cerrado; valor inicial legacy explícito. */
export const GROWTH_SEO_ETV_METHODOLOGY_ENV = 'GROWTH_SEO_ETV_METHODOLOGY_VERSION'

/**
 * Env var del selector de LECTURA. Separado del de escritura porque el cutover es writer-primero,
 * reader-después (ADR §8 / TASK-1806 Slice 3). Mismo parser cerrado; mismo default legacy.
 */
export const GROWTH_SEO_ETV_READ_METHODOLOGY_ENV = 'GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION'

/**
 * Clasificación de las 14 familias Labs ETV-capable confirmadas por el proveedor.
 *
 * - `etv_consumed`: el repo llama la familia Y persiste/deriva ETV → la policy construye el flag.
 * - `etv_ignored`: el repo llama la familia pero el parser NO lee ETV → guard conductual: no se envía
 *   el flag y no puede proyectarse ETV sin reclasificar y versionar primero.
 * - `provider_supported_not_enabled`: sin caller. Sólo su task dueña la pasa a `etv_consumed`; esta
 *   foundation transversal NUNCA la habilita.
 */
export const ETV_FAMILY_CLASSIFICATIONS = ['etv_consumed', 'etv_ignored', 'provider_supported_not_enabled'] as const

export type EtvFamilyClassification = (typeof ETV_FAMILY_CLASSIFICATIONS)[number]

/** Códigos de error canónicos del dominio (cerrados; los routes los mapean a `canonicalErrorResponse`). */
export const ETV_METHODOLOGY_ERROR_CODES = [
  'unsupported_etv_methodology',
  'methodology_not_available',
  'mixed_etv_methodology',
  'etv_methodology_drift',
  'legacy_requested_after_cutoff',
  'invalid_etv_methodology_config'
] as const

export type EtvMethodologyErrorCode = (typeof ETV_METHODOLOGY_ERROR_CODES)[number]

/**
 * Error de policy. Se LANZA (fail-closed) en el borde de adquisición: una captura que no puede fijar
 * su método no debe llegar al proveedor. Sin PII, sin payloads: sólo código + detalle estructural.
 */
export class EtvMethodologyPolicyError extends Error {
  readonly code: EtvMethodologyErrorCode
  readonly details: Readonly<Record<string, string | number | boolean | null>>

  constructor(code: EtvMethodologyErrorCode, message: string, details: Record<string, string | number | boolean | null> = {}) {
    super(message)
    this.name = 'EtvMethodologyPolicyError'
    this.code = code
    this.details = details
  }
}

export const isEtvMethodologyVersion = (value: unknown): value is EtvMethodologyVersion =>
  typeof value === 'string' && (ETV_METHODOLOGY_VERSIONS as readonly string[]).includes(value)

export const isEtvMethodologyEvidence = (value: unknown): value is EtvMethodologyEvidence =>
  typeof value === 'string' && (ETV_METHODOLOGY_EVIDENCE_KINDS as readonly string[]).includes(value)

export const isEtvHistoricalCalculationBasis = (value: unknown): value is EtvHistoricalCalculationBasis =>
  typeof value === 'string' && (ETV_HISTORICAL_CALCULATION_BASES as readonly string[]).includes(value)

/**
 * Provenance metodológica que viaja en TODO DTO que sirva una cifra ETV (readers → lane → MCP → Nexa).
 * Es provenance de una métrica, NO una lente (`SeoLens`) ni una fuente de verdad nueva.
 */
export type EtvMethodologyProvenance = {
  /** Método servido por este DTO. Un DTO sirve UNA metodología o degrada con etiqueta. */
  version: EtvMethodologyReadState
  /** Policy con la que se interpretó/escribió la evidencia. */
  policyVersion: string
  /** Cómo quedó determinado el método de la fila principal servida. */
  evidence: EtvMethodologyEvidence | 'unknown'
  /** Métodos con al menos una fila persistida para el sujeto (para compare interno, sin gasto). */
  availableMethodologies: EtvMethodologyVersion[]
  /** Comparabilidad declarada: una sola fórmula en toda la serie servida. */
  comparability: 'single_methodology' | 'not_available_for_method'
  /**
   * Fecha desde la cual la serie servida cambia de fórmula. NULL mientras el reader sirva una sola
   * metodología (siempre, por construcción, en esta foundation). Lo llena TASK-1806 si elige breakpoint.
   */
  breakpointDate: string | null
  /** Corte del proveedor, para que el consumer explique por qué legacy no continúa. */
  providerCutoffAt: string
}
