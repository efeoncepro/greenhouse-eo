import { MOTION_DURATION_S, MOTION_EASE } from '@/components/greenhouse/motion/core/tokens'

/**
 * TASK-1115 — transición canónica del cambio de densidad de un card (`full`↔`condensed`↔`peek`).
 *
 * Cuando un card adaptable cambia de fit mode (porque su región del Composition Shell se estrechó), el
 * cambio de tamaño + reflow se anima con framer-motion `layout` usando esta transición → el morph del card
 * es fluido (no un salto). Derivada de los motion tokens (cero hardcode). Reduced-motion → snap (duration 0).
 */
type EaseTuple = [number, number, number, number]

const EMPHASIZED_EASE: EaseTuple | undefined = MOTION_EASE.emphasized.cubicBezier
  ? [
      MOTION_EASE.emphasized.cubicBezier[0],
      MOTION_EASE.emphasized.cubicBezier[1],
      MOTION_EASE.emphasized.cubicBezier[2],
      MOTION_EASE.emphasized.cubicBezier[3]
    ]
  : undefined

export const cardDensityLayoutTransition = (reduced: boolean): { duration: number; ease?: EaseTuple } =>
  reduced ? { duration: 0 } : { duration: MOTION_DURATION_S.standard, ease: EMPHASIZED_EASE }

/**
 * TASK-1115 (reveal/unfold) — desplegado/plegado del contenido que entra o sale entre densidades (subtitle,
 * status, chart, metadatos). En vez de popear, el bloque **se despliega desde altura 0** (`height: 0↔auto` +
 * opacity, con `overflow: hidden` clipando durante el crecimiento) — el mismo "unfold" de la card de referencia.
 * Se consume en un `AnimatePresence` (default mode, NO popLayout: popLayout posiciona absoluto al item que sale
 * y la animación de height no podría plegar el flujo). Reduced-motion → snap (duration 0).
 *
 * **Coreografía (efecto Transformer):** la caja morfea con `cardDensityLayoutTransition` (`standard` = 200ms) y
 * el contenido se despliega con ESTA transición (`medium` = 300ms). El desync intencional (la caja asienta
 * mientras el contenido sigue desplegándose) da la sensación de partes moviéndose en secuencia, no al unísono.
 *
 * `cardDensityRevealOffsetPx` (legacy) se mantiene por compat; el unfold usa `height`, no `y`.
 */
export const cardDensityRevealOffsetPx = 4

/**
 * Desplazamiento (rise) del contenido que se desvela en **modo fade** (ej. el chart, que NO puede animar
 * `height` por el ResizeObserver de Recharts). El bloque entra subiendo desde +N px + opacity → trayectoria
 * "el dato sube a escena", distinta del unfold de altura del texto. Es transform de COMPOSITOR (translateY),
 * no toca el content-box → no re-dispara el ResizeObserver (respeta el anti-loop de `useContainerDensity`).
 */
export const cardDensityRevealRisePx = 10

/**
 * Paso de stagger (segundos) entre piezas que se revelan/colapsan a la vez (ej. metricName + período al cruzar
 * a `condensed`). Cada pieza arranca con un `delay = index * este_paso` en orden de lectura (arriba→abajo) →
 * cascada escalonada en vez de todas al unísono (la secuencia "coreografiada" del efecto Transformer).
 * Rango canónico de stagger entre hermanos (motion-design): 50–80ms. Reduced-motion → sin delay (lo aplica el
 * consumer guardando con `reduced`).
 */
export const cardDensityRevealStaggerSec = 0.06

export const cardDensityRevealTransition = (reduced: boolean): { duration: number; ease?: EaseTuple } =>
  reduced ? { duration: 0 } : { duration: MOTION_DURATION_S.medium, ease: EMPHASIZED_EASE }

/**
 * TASK-1110 — capacidad de ENTRADA "al armarse" (sibling de la densidad). Cuando una card se materializa en
 * una respuesta de Nexa moment, su contenido **se ARMA frente al usuario** en vez de aparecer de golpe:
 * el número cuenta (0 → valor, vía `AnimatedCounter animateFrom`), el chart se dibuja (Recharts area draw-in),
 * el contenido sube + aparece.
 *
 * - `'none'` (default) = sin entrada — **legacy byte-idéntico** (el contenido se monta en su estado final).
 * - `'assemble'` = el dato se construye a la vista (enhancement client-side, opt-in).
 *
 * Es la ENTRADA del contenido (frontera de motion: distinta del morph estructural de regiones por View
 * Transitions y del morph de densidad por framer `layout`). reduced-motion lo hornea cada consumer (valor final
 * visible, chart estático, never-hidden). Solo propiedades de compositor (transform/opacity).
 */
export type CardEntrance = 'none' | 'assemble'

/** Rise (px) del bloque de contenido que se materializa al armarse (transform de compositor — translateY). */
export const cardAssembleRisePx = 8

/** Transición de entrada "al armarse" — derivada de los motion tokens (`medium` = 300ms). Reduced-motion → snap. */
export const cardAssembleTransition = (reduced: boolean): { duration: number; ease?: EaseTuple } =>
  reduced ? { duration: 0 } : { duration: MOTION_DURATION_S.medium, ease: EMPHASIZED_EASE }
