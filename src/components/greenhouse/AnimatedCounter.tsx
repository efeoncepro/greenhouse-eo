'use client'

import { useEffect, useRef } from 'react'

import { useInView, useMotionValue, useSpring } from 'framer-motion'

import useReducedMotion from '@/hooks/useReducedMotion'

type Format = 'currency' | 'percentage' | 'integer'

interface AnimatedCounterProps {
  value: number
  format?: Format
  currency?: string
  duration?: number
  locale?: string
}

const formatNumber = (n: number, format: Format, currency: string, locale: string): string => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.round(n))
    case 'percentage':
      return `${n.toFixed(1)}%`
    case 'integer':
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(n))
    default:
      return String(n)
  }
}

const AnimatedCounter = ({
  value,
  format = 'integer',
  currency = 'CLP',
  duration = 0.8,
  locale = 'es-CL'
}: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const prefersReduced = useReducedMotion()

  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 })

  useEffect(() => {
    if (isInView && !prefersReduced) {
      motionValue.set(value)
    }
  }, [isInView, value, prefersReduced, motionValue])

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatNumber(latest, format, currency, locale)
      }
    })

    return unsubscribe
  }, [spring, format, currency, locale])

  // Render the final value immediately if reduced motion or not yet animated
  return <span ref={ref}>{formatNumber(prefersReduced ? value : 0, format, currency, locale)}</span>
}

export default AnimatedCounter
