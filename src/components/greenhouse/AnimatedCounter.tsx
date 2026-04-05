'use client'

import { useEffect, useRef } from 'react'

import useReducedMotion from '@/hooks/useReducedMotion'
import { useInView, useMotionValue, useSpring } from '@/libs/FramerMotion'

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
  locale = 'es-CL',
  formatter
}: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const prefersReduced = useReducedMotion()

  const fmt = (n: number) => (formatter ? formatter(n) : formatNumber(n, format, currency, locale))

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
        ref.current.textContent = fmt(latest)
      }
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spring, format, currency, locale, formatter])

  return <span ref={ref}>{fmt(prefersReduced ? value : 0)}</span>
}

export default AnimatedCounter
