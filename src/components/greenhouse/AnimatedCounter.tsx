'use client'

import { useEffect, useRef, useState } from 'react'

import useReducedMotion from '@/hooks/useReducedMotion'
import { useInView, useMotionValue, useSpring } from '@/libs/FramerMotion'
import { formatCurrency as formatGreenhouseCurrency, formatNumber as formatGreenhouseNumber } from '@/lib/format'

type Format = 'currency' | 'percentage' | 'integer'

interface AnimatedCounterProps {
  value: number
  format?: Format
  currency?: string
  duration?: number
  locale?: string
  formatter?: (n: number) => string
  /**
   * Conteo de ENTRADA "al armarse" (Nexa moments / `entrance='assemble'`): cuando se define, el número
   * CUENTA desde `animateFrom` → `value` al montar — el dato se construye frente al usuario, no aparece de golpe.
   *
   * A diferencia del path por defecto (que SALTA al valor en el primer mount y solo anima en cambios de `value`,
   * gateado por `isInView`), el conteo de entrada **NO depende del IntersectionObserver**: corre al montar, de
   * forma confiable, sin la race del IO frío que hacía saltar el número en flujos de re-monte/composición.
   *
   * SSR / no-JS / `prefers-reduced-motion` muestran el **valor final** de una (never-hidden, honesto): el conteo
   * es un enhancement client-side que arranca después de hidratar. Default `undefined` = legacy byte-idéntico.
   */
  animateFrom?: number
}

const formatNumber = (n: number, format: Format, currency: string, locale: string): string => {
  switch (format) {
    case 'currency':
      return formatGreenhouseCurrency(Math.round(n), currency, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}, locale)
    case 'percentage':
      return `${n.toFixed(1)}%`
    case 'integer':
      return formatGreenhouseNumber(Math.round(n), {
  maximumFractionDigits: 0
}, locale)
    default:
      return String(n)
  }
}

// reduced-motion leído de forma SÍNCRONA al disparar la entrada. El hook `useReducedMotion` resuelve un render
// tarde → la entrada arrancaría antes de saber la preferencia; matchMedia da el valor exacto en el momento.
const prefersReducedMotionNow = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const AnimatedCounter = ({
  value,
  format = 'integer',
  currency = 'CLP',
  duration = 0.8,
  locale = 'es-CL',
  formatter,
  animateFrom
}: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const prefersReduced = useReducedMotion()
  const isFirstMountRef = useRef(true)

  const fmt = (n: number) => (formatter ? formatter(n) : formatNumber(n, format, currency, locale))

  const hasEntrance = animateFrom != null

  // `hasEntered` decide qué renderiza el span (el spring gobierna el textContent durante el conteo, pero el
  // render es el fallback SSR/no-JS y el estado entre frames). Contrato:
  //  - SSR / no-JS  → `value` (honesto, never-hidden) — el conteo es client-only.
  //  - cliente con reduced-motion → `value` (sin conteo).
  //  - cliente con motion → `animateFrom` (arranca en 0 y cuenta; el render inicial en 0 evita el flash).
  // El mismatch SSR(value) vs cliente-motion(animateFrom) es intencional (entrada client-only) → `suppressHydrationWarning`.
  const [hasEntered, setHasEntered] = useState(() => {
    if (!hasEntrance) return true
    if (typeof window === 'undefined') return true

    return prefersReducedMotionNow()
  })

  // Source del spring: arranca en `animateFrom` cuando hay entrada (el spring sube 0 → value); sino en el valor
  // actual (legacy: evita el "0 → value" cuando el componente aparece con datos ya presentes).
  const motionValue = useMotionValue(hasEntrance ? (animateFrom as number) : value)
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 })

  useEffect(() => {
    // Entrada "al armarse": al MONTAR, sin gate de isInView (opt-in explícito, la card materializa a la vista) →
    // evita la race del IO frío que hacía saltar el número.
    if (hasEntrance && isFirstMountRef.current) {
      isFirstMountRef.current = false

      if (prefersReducedMotionNow()) {
        // reduced-motion: sin conteo. Fija source + spring en `value` para que el textContent no caiga a 0.
        motionValue.jump(value)
        spring.jump(value)
        setHasEntered(true)

        return
      }

      // motion: el source arranca en `animateFrom` → contar es llevar el source a `value` (el spring sube).
      motionValue.set(value)
      setHasEntered(true)

      return
    }

    if (!isInView || prefersReduced) return

    if (isFirstMountRef.current) {
      // Primer render legacy: fija el valor sin animación
      motionValue.jump(value)
      isFirstMountRef.current = false

      return
    }

    // Actualización: spring interpola desde el valor actual
    motionValue.set(value)
  }, [hasEntrance, isInView, value, prefersReduced, motionValue, spring])

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.textContent = fmt(latest)
      }
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spring, format, currency, locale, formatter])

  return (
    <span ref={ref} suppressHydrationWarning>
      {fmt(hasEntered ? value : (animateFrom as number))}
    </span>
  )
}

export default AnimatedCounter
