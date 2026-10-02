/**
 * Tender Deck Composer — contratos del motor de composición.
 *
 * ADR: `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §5-ter.
 *
 * Invariante central: el artefacto auditable son los SLOTS, no el PDF. Dados los mismos slots y la
 * misma versión de plantilla, el render es una función pura → mismo PDF. Por eso NADA en este
 * módulo puede consultar un LLM, la red o el reloj.
 */

/** Los 25 tipos de contenido de la taxonomía (SoT: `registry.json`). */
export type ContentType = string

/** Nombre de plantilla (`CoverFull`, `StatSplit`, …). Es la clave del registry. */
export type TemplateName = string

export type SlotType =
  | 'string'
  | 'rich-string'
  | 'array'
  | 'object'
  | 'enum'
  | 'asset'
  | 'asset-ref'
  | 'paired-array'
  // `fixed-*` = **template-owned**: el chrome del deck (logo, burbuja de URL, redes, contacto). El
  // contrato los declara para ser completo, pero NO se le exigen al plan ni el autor los sobreescribe
  // — viven en el HTML. El composer sólo verifica que su ancla exista.
  | 'fixed-asset'
  | 'fixed-social-set'
  | 'fixed-contact-set'

/**
 * Qué hacer cuando el valor excede la constraint.
 *
 * `reject` es el ÚNICO modo soportado hoy, y es deliberado: truncar el copy de una oferta
 * contractual en silencio es peor que fallar. Si el texto no cabe, lo corrige un humano (o el
 * chapter-author en el reintento), no el renderer.
 */
export type OverflowPolicy = 'reject'

export interface SlotConstraints {
  maxCharacters?: number
  maxLines?: number
  minItems?: number
  maxItems?: number
  maxCharactersPerItem?: number
  allowedTags?: string[]
  allowedKinds?: string[]
  overflow?: OverflowPolicy
  /** El asset NO puede ser un retrato humano (guardrail de honestidad: las personas son fotos reales). */
  noHumanPortrait?: boolean
  /** Una cifra sólo se acepta si viene acompañada de su `evidenceRef`. Anti-fabricación. */
  quantifiedClaimsRequireEvidenceRef?: boolean
}

export interface SlotFieldContract {
  type: SlotType
  required?: boolean
  maxCharacters?: number
  constraints?: SlotConstraints
  allowedTags?: string[]
  values?: string[]
  item?: SlotItemContract
  shape?: Record<string, SlotFieldContract>
  /** Campos que DEBEN venir si éste viene (ej. `metric` requiere `evidenceRef`). */
  requires?: string[]
  /** Traduce el valor semántico a presentación (ej. `kind` → ícono). Ver `resolvers.ts`. */
  resolver?: string
  /**
   * `validation-only`: se exige pero NUNCA se pinta (ej. `evidenceRef`).
   * `resolver-only`: es semántica que sólo consume un resolver; tampoco busca un ancla de copy.
   */
  consumer?: 'validation-only' | 'resolver-only'
  /** Valor de muestra para el probe del gate visual cuando el relleno de texto no ejerce el campo. */
  example?: unknown
}

export interface SlotItemContract {
  type: SlotType
  allowedTags?: string[]
  shape?: Record<string, SlotFieldContract>
}

export interface SlotContract {
  /** Selector CSS dentro de la plantilla. El HTML es el contrato: el slot se ancla al DOM real. */
  selector: string
  type: SlotType
  required?: boolean
  constraints?: SlotConstraints
  item?: SlotItemContract
  shape?: Record<string, SlotFieldContract>
  /** Selector del blueprint de un item repetido; evita depender del orden casual de hijos del HTML. */
  itemSelector?: string
  /** Hijos fijos del host de repetición que se preservan al reconstruir los items (ej. una refline). */
  fixedChildren?: string[]
  defaultAsset?: string
  resolver?: string
  /**
   * `validation-only` = **munición interna**: se exige para validar (una cifra sin fuente no se
   * compone), pero **NUNCA se pinta**. La fuente de un dato no es copy para el comité.
   *
   * Se honra en los TRES niveles —slot, campo de objeto y campo de item—. Honrarlo sólo en los
   * arrays fue el bug que dejó a `CaseStudySplit` sin componer y, peor, hizo que el `sourceRef` de
   * `QuoteSplit` se escribiera sobre el nodo de la lámina entera y la borrara.
   */
  consumer?: 'validation-only'
  /** Valor de muestra para el probe del gate visual (figuras cuya geometría sale de cifras). */
  example?: unknown
  /**
   * Etiquetas de un slot `enum`: el plan declara la CLAVE (`combined`) y la lámina muestra su
   * ETIQUETA (`Propuesta Técnica y Económica`). El autor elige de un conjunto cerrado; el copy
   * visible es del contrato, no suyo — así la portada no puede decir cualquier cosa.
   */
  values?: Record<string, string>
}

/**
 * Cómo se imprime la lámina. `transparent` sólo aplica al PNG: la captura sale sin fondo (canal alfa),
 * para capas que otra herramienta monta encima de un video o de una foto (zócalo, cartela, subtítulos).
 * El HTML de la plantilla tiene que dejar `html` y `body` sin fondo; lo que no pinte, queda transparente.
 * Un PDF siempre imprime el fondo que la plantilla pinte.
 */
export interface TemplateRenderOptions {
  background?: 'opaque' | 'transparent'
  /**
   * Piso de «tinta» de la lámina (fracción de tiles de 16 px con un borde real). Por defecto 1,5 %. Una capa
   * transparente pequeña por diseño (un zócalo de una línea sobre un lienzo 9:16) lo declara más bajo; nunca por debajo
   * de `MIN_INK_TILE_RATIO_FLOOR`, así una lámina que sale vacía sigue fallando.
   */
  minInkTileRatio?: number
}

/** Ninguna plantilla puede bajar el gate de lámina en blanco más allá de esto. */
export const MIN_INK_TILE_RATIO_FLOOR = 0.003

export interface TemplateContract {
  template: TemplateName
  version: string
  viewport: { width: number; height: number }
  render?: TemplateRenderOptions
  slots: Record<string, SlotContract>
}

/** Valor de un slot: lo que el chapter-author produce. JSON puro, serializable, auditable. */
export type SlotValue = string | string[] | Record<string, unknown> | Record<string, unknown>[] | null

export type SlotValues = Record<string, SlotValue>

/** Una lámina resuelta: qué plantilla, con qué contenido. Es la unidad reproducible. */
export interface SlideSpec {
  slideId: string
  contentType: ContentType
  template: TemplateName
  slots: SlotValues
}

/** El deck completo, listo para renderizar. Serializable → es el artefacto que se audita y se replaya. */
export interface DeckPlan {
  tenderId: string
  slides: SlideSpec[]
}

/** Un problema de validación. Nunca se "arregla" en silencio: se reporta y frena el render. */
export interface SlotViolation {
  slideId: string
  template: TemplateName
  slot: string
  code:
    | 'missing_required'
    | 'too_long'
    | 'too_many_items'
    | 'too_few_items'
    | 'item_too_long'
    | 'unknown_slot'
    | 'wrong_type'
    | 'disallowed_enum'
    | 'invalid_value'
    | 'missing_evidence_ref'
    | 'missing_required_field'
  message: string
}

/**
 * Prefijo de una referencia a un asset EXTERNO al catálogo (`asset-ref:<clave>`, TASK-1889). El plan
 * sella la referencia; los bytes los entrega quien compone en `ComposeOptions.externalAssets`.
 */
export const EXTERNAL_ASSET_PREFIX = 'asset-ref:'
