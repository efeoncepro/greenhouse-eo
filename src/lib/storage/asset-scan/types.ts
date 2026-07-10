/**
 * TASK-1362 — Contrato del escaneo de assets antes de que queden `attached`.
 *
 * El puerto es provider-neutral (mismo patrón que la signature platform de
 * TASK-490): el dominio pide un veredicto, no habla con ClamAV ni con ningún
 * proveedor concreto. Cambiar de scanner es cambiar el adapter, no el caller.
 */

/**
 * `suspicious` es lo que emite un scanner estructural: sabe que el archivo NO
 * es lo que dice ser, pero no puede afirmar que contenga malware conocido.
 * `infected` sólo lo emite un scanner con base de firmas (ClamAV).
 *
 * Ambos son bloqueantes: fail-closed. La distinción existe para el triage
 * humano y para el signal, no para decidir si se adjunta.
 */
export type AssetScanVerdict =
  | 'clean'
  | 'suspicious'
  | 'infected'
  | 'error'
  /** Sólo para el backfill: assets que entraron antes de que existiera el scan. */
  | 'legacy_unscanned'

export type AssetScanFindingSeverity = 'blocking' | 'advisory'

export type AssetScanFinding = {
  /** Identificador estable (snake_case), consumible por triage/signal. */
  code: string
  severity: AssetScanFindingSeverity
  /** Detalle sin PII ni contenido del archivo. NUNCA bytes del documento. */
  detail: string
}

export type AssetScanInput = {
  bytes: Buffer
  /** MIME declarado por el cliente. NO es confiable: es justo lo que se verifica. */
  declaredMimeType: string
  fileName: string
}

export type AssetScanResult = {
  verdict: AssetScanVerdict
  /** Identidad del scanner que emitió el veredicto, ej. `structural`. */
  scanner: string
  scannerVersion: string
  findings: AssetScanFinding[]
  /** MIME inferido de los magic bytes; `null` si no se pudo reconocer. */
  detectedMimeType: string | null
  durationMs: number
}

/**
 * Un scanner es una función pura sobre bytes. No escribe en DB, no publica
 * eventos, no autoriza: eso es responsabilidad del caller (`scanAssetBytes`).
 */
export type AssetScanner = {
  readonly name: string
  readonly version: string
  scan: (input: AssetScanInput) => Promise<Omit<AssetScanResult, 'durationMs'>>
}

export const isBlockingVerdict = (verdict: AssetScanVerdict) =>
  verdict === 'suspicious' || verdict === 'infected' || verdict === 'error'
