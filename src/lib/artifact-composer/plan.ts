/**
 * Artifact Composer — el plan AUTORABLE vs el plan RESUELTO (TASK-1393 Slice 1).
 *
 * La regla que este módulo materializa: **el autor (humano o agente) declara INTENCIÓN
 * (`contentType` + slots), nunca AUTORIDAD DE PRESENTACIÓN (`template`)**. La plantilla la elige el
 * catálogo vía su selector determinista, y esa elección queda sellada — con hashes — en un manifest
 * inmutable que es lo ÚNICO que puede persistirse, confirmarse o renderizarse productivamente.
 *
 * Dos tipos, dos autoridades:
 *
 *   `CompositionPlanInput`        lo produce el AUTOR. No tiene campo `template`: elegir plantilla
 *                                 semánticamente incorrecta (aunque sus slots pasen validación de
 *                                 forma) deja de ser expresable.
 *   `ResolvedCompositionManifest` lo produce el CATÁLOGO. Input canónico + template seleccionado +
 *                                 hashes de catálogo/contratos/brand pack/fuentes + validadores
 *                                 ejecutados. Permite explicar y REPETIR el mismo artefacto sin
 *                                 consultar el reloj, Figma, red ni una base de datos.
 *
 * Browser-safe a propósito: sólo tipos — sin `node:*`, sin Playwright — para que un futuro editor
 * de planes pueda importarlos en cliente sin arrastrar el runtime del motor.
 *
 * Estado por slice (los campos nacen acá para que el contrato sea estable, se llenan por etapas):
 *   - Slice 1: tipos + adaptador del `DeckPlan` histórico (el CLI verifica template ≡ selector).
 *   - Slice 2: el catálogo produce el manifest (registry/contract hashes + validadores semánticos).
 *   - Slice 3: `brandPack` (hash del pack compilado).
 *   - Slice 4: `fonts` (checksums del font pack) + hash integral del manifest.
 */

import type { ContentType, SlotValues, TemplateName } from './contracts'

/** Una lámina como la escribe el AUTOR: intención semántica, sin plantilla. */
export interface CompositionSlideInput {
  slideId: string
  contentType: ContentType
  slots: SlotValues
}

/** El plan autorable completo. Es la única forma que un autor/agente puede producir. */
export interface CompositionPlanInput {
  /** Identidad del artefacto (ej. `SKY-BLOG-2026`). Domain-free: el consumer decide qué nombra. */
  artifactId: string
  slides: CompositionSlideInput[]
}

/** Resultado de un validador semántico de catálogo sobre el plan resuelto. */
export interface ManifestValidatorRun {
  /** Nombre estable del validador (declarado y versionado por el catálogo). */
  name: string
  version: string
  result: 'pass' | 'fail'
  /** Violaciones tipadas y serializables (vacío si `pass`). */
  violations: string[]
}

/** Una lámina RESUELTA: la intención del autor + la autoridad de presentación del catálogo. */
export interface ResolvedCompositionSlide extends CompositionSlideInput {
  /** Elegida por el selector del catálogo — NUNCA por el autor. */
  template: TemplateName
  /** sha256 del `*.slots.json` que gobernó la validación. */
  contractHash: string
  /** sha256 del `.html` de la plantilla que renderiza. */
  templateHash: string
}

/**
 * El manifest inmutable — la ÚNICA forma que puede persistirse, confirmarse o renderizarse.
 * Un renderer productivo (TASK-1391) consume esto, jamás un `DeckPlan` mutable.
 */
export interface ResolvedCompositionManifest {
  manifestVersion: 1
  artifactId: string
  /** El input canónico del autor, verbatim — el manifest siempre puede explicar de dónde salió. */
  input: CompositionPlanInput
  catalog: {
    /** Nombre del catálogo que resolvió (ej. `deck-axis`). */
    name: string
    /** Versión declarada por el registry del catálogo. */
    version: string
    /** sha256 del `registry.json` completo. */
    registryHash: string
    /** Dueño del catálogo — "global" es un valor explícito, no la ausencia de dato (ASaaS seam). */
    ownerOrgId: string
  }
  slides: ResolvedCompositionSlide[]
  /** Pack de marca compilado que gobernó el render. `null` hasta que Slice 3 lo materialice. */
  brandPack: { name: string; hash: string } | null
  /** Font pack hermético (familia/variante/checksum). `null` hasta que Slice 4 lo materialice. */
  fonts: Array<{ family: string; variant: string; checksum: string }> | null
  /** Validadores semánticos ejecutados por el catálogo, con su resultado. */
  validators: ManifestValidatorRun[]
}
