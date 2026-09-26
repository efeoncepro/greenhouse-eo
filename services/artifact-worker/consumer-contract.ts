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
   * Drift check, propio de cada dominio porque cada uno sella una cosa distinta:
   * Proposal sella el MANIFEST RESUELTO (lo compuso un CLI, posiblemente días antes, con otra copia
   * del catálogo) e Insights sella el INPUT canónico (el catálogo vive sólo acá, así que comparar el
   * manifest resuelto contra sí mismo sería tautológico; lo que importa es que se compongan
   * EXACTAMENTE las láminas selladas).
   *
   * Devuelve el detalle del drift, o `null` si el artefacto emitido corresponde a lo encolado.
   */
  verifyEmittedManifest(job: RenderJobView, emittedManifest: Record<string, unknown>): string | null

  /**
   * TASK-1889 — assets EXTERNOS al catálogo que el input sellado referencia como `asset-ref:<clave>`
   * (hoy: el logo privado de la organización cliente). El consumer los lee con SU autorización —sólo
   * lo que pertenece al dueño del job— y los entrega como data URI. Opcional: un dominio sin assets
   * externos no lo implementa y cualquier referencia falla el render (fail-closed del motor).
   */
  resolveExternalAssets?(job: RenderJobView, input: Record<string, unknown>): Promise<Record<string, string>>

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
