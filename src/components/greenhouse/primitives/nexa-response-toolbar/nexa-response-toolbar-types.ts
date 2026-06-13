/**
 * NexaResponseToolbar — primitiva canónica del chrome meta de confianza de una respuesta de Nexa
 * (TASK-1104, fase "settle" estilo AI Overview). Feedback ¿útil? (colapsa a acuse tras votar) + copiar
 * (clipboard self-contained, optimista) / compartir / regenerar. Transversal: la consumen el answer
 * canvas (embedded), Nexa chat (floating) y barras de surface (docked). Opt-in vía `onControl`.
 */
export type NexaResponseToolbarVariant = 'embedded' | 'floating' | 'docked'

/** Kind semántico → variant. `responseSettle` (en-flow del answer) / `chatMessage` (anclada a un mensaje) / `surfaceBar` (barra fija). */
export type NexaResponseToolbarKind = 'responseSettle' | 'chatMessage' | 'surfaceBar' | 'custom'

/** Controles emitidos al host. `copy` se resuelve self-contained (clipboard); el resto lo maneja el host. */
export type NexaResponseToolbarControl = 'copy' | 'share' | 'helpful' | 'unhelpful' | 'regenerate'

export interface NexaResponseToolbarLabels {
  helpfulPrompt: string
  helpfulYesLabel: string
  helpfulNoLabel: string
  /** Acuse inline tras votar. */
  helpfulThanksLabel: string
  copyLabel: string
  /** Estado transitorio tras copiar. */
  copiedLabel: string
  shareLabel: string
  regenerateLabel: string
}

export interface NexaResponseToolbarProps {
  variant?: NexaResponseToolbarVariant
  kind?: NexaResponseToolbarKind
  /** Texto plano de la respuesta para el botón "Copiar" (clipboard self-contained). */
  plainText: string
  /** El host reacciona a los controles (analítica, share real, regenerar). `copy` ya copió al clipboard. */
  onControl: (control: NexaResponseToolbarControl) => void
  /** Overrides de labels; la primitiva trae defaults es-CL. */
  labels?: Partial<NexaResponseToolbarLabels>
}
