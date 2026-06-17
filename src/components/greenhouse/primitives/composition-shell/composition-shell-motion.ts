import { MOTION_DURATION_S, MOTION_EASE } from '@/components/greenhouse/motion/core/tokens'

/**
 * Composition Shell — fluidity motion bindings (TASK-1117). PURE + testeable sin DOM.
 *
 * Deriva duraciones/easing de los motion tokens canónicos (`motion/core/tokens`, cero hardcode) y produce
 * los props declarativos que el componente pasa a framer-motion. Frontera dura (motion-design skill +
 * ADR §Delta interrumpibilidad): View Transitions hace el morph ESTRUCTURAL de regiones; framer-motion
 * `layout` hace el morph INTERRUMPIBLE; el reveal con stagger es la ENTRADA del contenido — nunca animan
 * la misma propiedad sobre el mismo nodo a la vez. `prefers-reduced-motion` → instantáneo (sin transform,
 * sin delay), nunca oculta contenido (never-hidden).
 */

/** Paso de stagger entre regiones (skill canónico: 50–80 ms). Derivado en segundos para framer-motion. */
export const COMPOSITION_STAGGER_STEP_S = 0.06

/** Cubic-bézier mutable (framer-motion exige tuple `[n,n,n,n]`, no `number[]`). Derivado del token. */
type EaseTuple = [number, number, number, number]

const EMPHASIZED_EASE: EaseTuple | undefined = MOTION_EASE.emphasized.cubicBezier
  ? [
      MOTION_EASE.emphasized.cubicBezier[0],
      MOTION_EASE.emphasized.cubicBezier[1],
      MOTION_EASE.emphasized.cubicBezier[2],
      MOTION_EASE.emphasized.cubicBezier[3]
    ]
  : undefined

export interface CompositionRegionRevealMotion {
  /** `false` = montar en estado final sin animar (reduced-motion). */
  initial: false | { opacity: number; y: number }
  animate: { opacity: number; y: number }
  transition: { duration: number; ease?: EaseTuple; delay?: number }
}

/**
 * Reveal de entrada de una región de contenido. El `animate` opacity target respeta el condense (0.92)
 * para que la región que cede espacio entre directo a su estado condensado (sin doble animación con el sx).
 * `index` da el beat del stagger. Reduced-motion → estado final inmediato.
 */
export const compositionRegionReveal = (
  index: number,
  condense: boolean,
  reduced: boolean
): CompositionRegionRevealMotion => {
  const targetOpacity = condense ? 0.92 : 1

  if (reduced) {
    return { initial: false, animate: { opacity: targetOpacity, y: 0 }, transition: { duration: 0 } }
  }

  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: targetOpacity, y: 0 },
    transition: {
      duration: MOTION_DURATION_S.standard, // 200 ms — superficie chica (skill)
      ease: EMPHASIZED_EASE,
      delay: Math.max(0, index) * COMPOSITION_STAGGER_STEP_S
    }
  }
}

// Nota (TASK-1117 follow-up): se evaluó orquestar el stagger de regiones con el patrón framer
// `parent variants + staggerChildren` (el shell como dueño único). Se descartó: `staggerChildren` exige
// variant inheritance, que NO SSR-renderiza los estilos de los hijos → hydration mismatch + viola never-hidden.
// La secuencia SÍ es dueña del shell, pero SSR-safe: el shell asigna el índice central (orden de DOM) y cada
// región revela explícito con `compositionRegionReveal(index, …)`. El reveal explícito SSR-renderiza el estado
// final en server + cliente sin mismatch. (Re-coreografiar en cada morph sería un trigger post-mount aparte.)

/**
 * Transición del morph INTERRUMPIBLE (framer-motion `layout`): redirigible a media animación (drag, cambio
 * de idea). Solo se usa cuando `morphStrategy='interruptible'` — coexiste con VT, nunca sobre el mismo morph.
 * Reduced-motion → snap (duration 0).
 */
export const compositionInterruptibleLayoutTransition = (
  reduced: boolean
): { duration: number; ease?: EaseTuple } =>
  reduced
    ? { duration: 0 }
    : { duration: MOTION_DURATION_S.medium, ease: EMPHASIZED_EASE } // 300 ms — reflow de región
