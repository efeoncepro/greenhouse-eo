'use client'

import { useEffect, useRef } from 'react'

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

const AnimatedCounter = ({
  value,
  format = 'integer',
  currency = 'CLP',
  duration = 0.8,
  locale = 'es-CL',
  formatter
}: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const prefersReduced = useReducedMotion()
  const isFirstMountRef = useRef(true)

  const fmt = (n: number) => (formatter ? formatter(n) : formatNumber(n, format, currency, locale))

  // Inicia motion value al valor actual en el primer mount — evita la animación
  // "0 → value" cuando el componente aparece con datos ya presentes.
  // En actualizaciones posteriores (value cambia), spring interpola del valor
  // anterior al nuevo naturalmente.
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 })

  useEffect(() => {
    if (!isInView || prefersReduced) return

    if (isFirstMountRef.current) {
      // Primer render: fija el valor sin animación
      motionValue.jump(value)
      isFirstMountRef.current = false

      return
    }

    // Actualización: spring interpola desde el valor actual
    motionValue.set(value)
  }, [isInView, value, prefersReduced, motionValue])

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.textContent = fmt(latest)
      }
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spring, format, currency, locale, formatter])

  return <span ref={ref}>{fmt(value)}</span>
}

export default AnimatedCounter
