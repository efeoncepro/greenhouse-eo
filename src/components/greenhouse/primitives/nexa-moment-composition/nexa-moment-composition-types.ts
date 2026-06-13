import type { ReactNode } from 'react'

/**
 * NexaMomentComposition — primitive de COMPOSICIÓN del Nexa Moment Fabric (GAP A / TASK-1102 frontera).
 *
 * Patrón propio de Greenhouse (Google AI Overviews/AI Mode como norte, NO copia): un Momento Nexa que
 * COMPONE con una superficie operativa existente (el host) sin reemplazarla. La respuesta lidera, el host
 * persiste como contexto vivo, y — lo que lo hace propio — (1) las citas ANCLAN a los ítems reales del host
 * (`data-nexa-anchor`), (2) el Momento trae un next-step GOBERNADO (action boundary), (3) un puente
 * "Seguir con Nexa" abre la lente conversacional dedicada (AI Mode) llevándose el contexto.
 *
 * Es una LAYOUT primitive (hermana de AdaptiveSidecarLayout): posee el grid + el morph + el anclaje. NO
 * conoce el dominio ni renderiza la respuesta: el consumer pasa el `host`, el `moment` (típicamente un
 * NexaAnswersCanvas) y el `composer` por slot. Reuse-not-fork: el canvas no cambia.
 */

/** Variants funcionales — CÓMO compone el Momento con el host (no son skins). */
export type NexaMomentCompositionVariant =
  /** AI Overviews-style: el Momento lidera arriba, el host reflowea debajo como contexto vivo. */
  | 'leadOverlay'
  /** Split: el Momento se acopla al lado y las citas resaltan los ítems anclados del host (tablas/charts). */
  | 'anchoredAside'
  /** El composer se expande en su lugar hacia el Momento sin relocar el host (superficies densas). */
  | 'inlineExpand'

/** Kinds semánticos de dominio/workflow → resuelven a un variant existente (NUNCA variant nuevo por dominio). */
export type NexaMomentCompositionKind =
  | 'knowledgeOverview'
  | 'financeMetricExplain'
  | 'agencyAccountBrief'
  | 'listAssist'
  | 'custom'

/**
 * Estado de la superficie compuesta. `dormant` = solo host (sin Momento elegible — eligibility del Fabric);
 * `composing` = morph en curso; `composed` = Momento + host. El host conduce el estado (igual que la lente).
 */
export type NexaMomentCompositionState = 'dormant' | 'composing' | 'composed'

export interface NexaMomentCompositionVariantConfig {
  variant: NexaMomentCompositionVariant
  /** El Momento lidera arriba (overlay) vs al lado (aside). */
  layout: 'stack' | 'split'
  /** El host se condensa cuando el Momento toma espacio. */
  condensesHost: boolean
}

export interface NexaMomentCompositionProps {
  variant?: NexaMomentCompositionVariant
  kind?: NexaMomentCompositionKind
  state: NexaMomentCompositionState
  /** Contenido operativo de la superficie (lista/tabla/chart/cards). Persiste; nunca se reemplaza. */
  host: ReactNode
  /** El Momento Nexa (típicamente un `<NexaAnswersCanvas>`). Solo se monta en `composing`/`composed`. */
  moment?: ReactNode
  /** El composer "con Nexa adentro". Queda arriba (refinar / nueva pregunta) — patrón AI Overviews. */
  composer: ReactNode
  /**
   * Next-step GOBERNADO (action boundary): el affordance de acción operativa que Nexa propone anclado al
   * contexto (Recomendar / Preparar borrador / Ejecutar con aprobación). Diferenciador propio vs Google.
   */
  nextStep?: ReactNode
  /** Puente "Seguir con Nexa →" hacia la lente dedicada (AI Mode); el consumer transfiere el contexto. */
  bridge?: ReactNode
  /**
   * Anclaje cita↔host: id del ítem del host actualmente resaltado (el consumer lo setea al hover/click de
   * una cita del Momento). La primitive resalta `[data-nexa-anchor="<id>"]` dentro del host + scrollIntoView.
   * La evidencia ES el contenido operativo — no se va a la web.
   */
  activeAnchorId?: string | null
  /** Etiqueta accesible de la región del Momento (a11y). */
  momentLabel?: string
  /** sx passthrough opcional para el contenedor raíz. */
  className?: string
}
