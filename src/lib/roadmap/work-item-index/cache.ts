/**
 * TASK-1152 — In-process cache for the parsed work item index.
 *
 * El parseo de ~1300+ archivos Markdown por request es caro; la lectura de
 * metadata (mtime/size) NO. La estrategia: fingerprint barato por `mtime+size`
 * de todos los archivos elegibles; si el fingerprint no cambió, devolvemos el
 * índice ya parseado. Read-only, sin writes concurrentes (mitiga el riesgo
 * "parseo por request degrada performance" de la risk matrix).
 *
 * Cache por proceso (módulo singleton). En serverless cada instancia tibia
 * reusa su índice; un cold start lo reconstruye. No persiste nada.
 */
import type { WorkItem } from './types'

export interface CachedWorkItemIndex {
  /** Hash barato de mtime+size de todos los archivos elegibles. */
  fingerprint: string
  items: WorkItem[]
  generatedAt: string
}

let cached: CachedWorkItemIndex | null = null

export const readCachedWorkItemIndex = (): CachedWorkItemIndex | null => cached

export const writeCachedWorkItemIndex = (next: CachedWorkItemIndex): void => {
  cached = next
}

/** Solo para tests: limpia el cache singleton. */
export const __resetWorkItemIndexCache = (): void => {
  cached = null
}
