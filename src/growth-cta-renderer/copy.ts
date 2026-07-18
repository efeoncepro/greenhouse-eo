/**
 * TASK-1340 — Growth CTA renderer: copy de SISTEMA del bundle público (es-CL).
 *
 * SOLO strings estructurales del renderer (aria/estados internos). TODO el copy de
 * campaña (eyebrow/headline/body/ctaLabel/dismissLabel/footnote) viene del render
 * contract publicado — el renderer NUNCA hardcodea copy de campaña. Patrón calcado
 * de `src/growth-forms-renderer/copy.ts` (el paquete es browser-only; no puede
 * importar `src/lib/copy/**` del portal).
 */

export interface CtaSystemCopy {
  /** aria-label de la región del CTA (ElementInternals role). */
  ctaRegionAria: string
  /** aria-label del botón de dismiss cuando el contrato no trae `dismissLabel`. */
  dismissAria: string
  /** Texto sr-only del skeleton de carga. */
  loadingAria: string
  /** aria-live al montar el form (feedback perceptible sin animación). */
  formOpeningAria: string
}

const ES_CL: CtaSystemCopy = {
  ctaRegionAria: 'Invitación de Efeonce',
  dismissAria: 'Cerrar este aviso',
  loadingAria: 'Cargando contenido…',
  formOpeningAria: 'Abriendo el formulario…',
}

/** Default es-CL; el hook de locale queda para cuando exista contrato multi-locale. */
export const resolveCtaSystemCopy = (locale?: string): CtaSystemCopy => {
  void locale

  return ES_CL
}
