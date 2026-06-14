'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { resolveCardDensityRequest, type CardDensity, type CardDensityRequest } from './card-density'

/**
 * TASK-1115 — `useContainerDensity`: resuelve el fit mode de un card desde SU PROPIO ancho.
 *
 * El card se adapta a su contenedor (región del Composition Shell, drawer, dashboard grid, mobile) SIN
 * conocer el shell — el seam es la container query. Espeja el patrón `size → behavior` de
 * `resolveAdaptiveSidecarMode` (TASK-1028) y la resolución por ancho de `degradeDensityForWidth` (TASK-743).
 *
 * - `request` fijo (`full`/`condensed`/`peek`) → modo fijo, sin medir (override).
 * - `request='auto'` → mide el ancho con ResizeObserver y resuelve.
 * - `request` undefined → `full` (default: el card no adopta densidad, comportamiento legacy intacto).
 *
 * SSR-safe: el modo inicial es `full` (server + primer paint coinciden → sin hydration mismatch). La
 * adaptación ocurre post-mount al medir; el contenido rico se monta y luego condensa, nunca al revés
 * (never-hidden). `container-type: inline-size` se aplica solo en `'auto'` (habilita `@container` interno;
 * `inline-size` NO exige altura explícita, a diferencia de `size`).
 */
export interface UseContainerDensityResult {
  /** Attach al elemento raíz del card (el que mide su ancho). */
  ref: RefObject<HTMLDivElement | null>
  /** Fit mode efectivo. */
  density: CardDensity
  /** `sx.containerType` para el root: `'inline-size'` en `'auto'`, sino `undefined`. */
  containerType: 'inline-size' | undefined
}

export const useContainerDensity = (request?: CardDensityRequest): UseContainerDensityResult => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)
  const isAuto = request === 'auto'

  useEffect(() => {
    if (!isAuto || typeof ResizeObserver === 'undefined') return

    const node = ref.current

    if (!node) return

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width

      if (typeof width === 'number') setMeasuredWidth(width)
    })

    observer.observe(node)

    return () => observer.disconnect()
  }, [isAuto])

  const density = resolveCardDensityRequest(request, isAuto ? measuredWidth : null)

  return { ref, density, containerType: isAuto ? 'inline-size' : undefined }
}
