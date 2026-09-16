/**
 * TASK-1846 Slice 1 — contrato del consumer de render.
 *
 * El worker es la COMPOSITION ROOT: conoce a los dominios, los dominios no lo conocen a él. Por eso
 * este contrato vive acá y no en `src/lib/**` (un `src/lib` que importara de `services/` invertiría
 * la dependencia y rompería el boundary del build).
 *
 * Reemplaza las SEIS costuras que ataban el worker a Proposal, ninguna de las cuales era lógica de
 * negocio: `attachProposalAsset`, el store completo de proposals, `ownerAggregateType`,
 * `ownerAggregateId`, el dominio de observabilidad fijo en 'commercial' y el flag único.
 *
 * Proposal conserva su comportamiento EXACTO: su adapter delega en los mismos commands de siempre.
 */

import type { ArtifactCatalog } from '@/lib/artifact-composer/catalog'

/** Vista mínima que el worker necesita de un job, sea del dominio que sea. */
export interface RenderJobView {
  /** Id del job en su dominio (para logs, eventos y transiciones). */
  jobId: string
  ownerOrgId: string
  catalogName: string
  manifestHash: string
  /** Id del artefacto dentro del manifest (nombre de archivo, claves del composer). */
  artifactId: string
  outputTarget: string
  constraints: Record<string, unknown> | null
}

export interface RenderedArtifact {
  pdfPath: string | null
  slidePaths: string[]
  pdfBytes: number
  warnings: string[]
  slideCount: number
}

/**
 * Un consumer del motor de render. Cada dominio implementa el suyo; el worker no sabe de propuestas
 * ni de ediciones, sólo de jobs.
 */
export interface RenderConsumer {
  /** Clave estable para logs y métricas. */
  readonly key: string

  /** Dominio de observabilidad de `captureWithDomain` — NO se hardcodea en el worker. */
  readonly observabilityDomain: string

  /** Flag propio. Encender un consumer jamás enciende a otro. */
  isEnabled(): boolean

  /** Claim atómico del próximo job de ESTE dominio, o null si no hay cola. */
  claimNext(): Promise<RenderJobView | null>

  /** Job dirigido por id (modo replay manual del operador). */
  claimById(jobId: string): Promise<RenderJobView | null>

  /** Manifest completo persistido al encolar (no viaja en la vista). */
  getManifest(jobId: string): Promise<Record<string, unknown> | null>

  /** Catálogos empaquetados en ESTA imagen del worker. */
  getCatalog(catalogName: string): ArtifactCatalog | null

  /**
   * Persiste los bytes producidos como assets privados del dominio y los vincula
   * semánticamente. Devuelve el id del asset principal (null si el target no produce PDF).
   */
  storeOutputs(
    job: RenderJobView,
    rendered: RenderedArtifact
  ): Promise<{ primaryAssetId: string | null; previewAssetIds: string[] }>

  markCompleted(job: RenderJobView, input: {
    primaryAssetId: string | null
    previewAssetIds: string[]
    report: Record<string, unknown>
  }): Promise<void>

  markFailed(job: RenderJobView, input: { failureCode: string; failureDetail: string }): Promise<void>
}
