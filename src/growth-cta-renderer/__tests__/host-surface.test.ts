// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { resolveHostSurfaceScheme, surfaceLuminance } from '../host-surface'

/**
 * ISSUE-168 — El CTA hereda la superficie del anfitrión, no la del sistema operativo.
 *
 * Caso fuente medido en producción: página blanca + navegador en modo oscuro + host sin
 * declarar nada = tarjeta navy pegada sobre página blanca. Los tests fijan la decisión,
 * no la implementación.
 */

const mount = (chain: Array<string | null>) => {
  // chain[0] es el ancestro más lejano; el CTA cuelga del último.
  let parent: HTMLElement = document.body

  for (const bg of chain) {
    const node = document.createElement('div')

    if (bg) node.style.background = bg
    parent.appendChild(node)
    parent = node
  }

  const cta = document.createElement('greenhouse-cta')

  parent.appendChild(cta)

  return cta
}

afterEach(() => {
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
})

describe('surfaceLuminance', () => {
  it('entiende las dos escalas: rgb() en 0-255 y color(srgb …) en 0-1', () => {
    expect(surfaceLuminance('rgb(255, 255, 255)')).toBeCloseTo(1, 3)
    expect(surfaceLuminance('color(srgb 1 1 1)')).toBeCloseTo(1, 3)
    expect(surfaceLuminance('rgb(0, 0, 0)')).toBeCloseTo(0, 3)
  })

  it('un fondo TRANSLÚCIDO no define la superficie: deja ver el de abajo', () => {
    expect(surfaceLuminance('rgba(255, 255, 255, 0.4)')).toBeNull()
    expect(surfaceLuminance('transparent')).toBeNull()
    expect(surfaceLuminance('rgba(0, 0, 0, 0)')).toBeNull()
  })

  it('prefiere no saber a adivinar mal ante una notación desconocida', () => {
    expect(surfaceLuminance('')).toBeNull()
    expect(surfaceLuminance(null)).toBeNull()
    expect(surfaceLuminance('lch(50% 40 200)')).toBeNull()
  })
})

describe('resolveHostSurfaceScheme (ISSUE-168)', () => {
  it('página blanca → claro, aunque el sistema del visitante esté en oscuro', () => {
    const cta = mount(['rgb(255, 255, 255)'])

    expect(resolveHostSurfaceScheme(cta)).toBe('light')
  })

  it('anfitrión genuinamente oscuro → oscuro (el dock del informe de Think)', () => {
    const cta = mount(['rgb(15, 20, 28)'])

    expect(resolveHostSurfaceScheme(cta)).toBe('dark')
  })

  it('atraviesa contenedores transparentes hasta el primer fondo opaco', () => {
    const cta = mount(['rgb(255, 255, 255)', null, 'rgba(0, 0, 0, 0.05)', null])

    expect(resolveHostSurfaceScheme(cta)).toBe('light')
  })

  it('una declaración explícita del host MANDA sobre la medición', () => {
    const cta = mount(['rgb(255, 255, 255)'])

    expect(resolveHostSurfaceScheme(cta, 'dark')).toBe('dark')

    const oscuro = mount(['rgb(15, 20, 28)'])

    expect(resolveHostSurfaceScheme(oscuro, 'light')).toBe('light')
  })

  it('un valor declarado basura NO manda: se cae a la medición', () => {
    const cta = mount(['rgb(15, 20, 28)'])

    expect(resolveHostSurfaceScheme(cta, 'auto')).toBe('dark')
    expect(resolveHostSurfaceScheme(cta, '')).toBe('dark')
  })

  it('sin nada medible devuelve null — NO fuerza nada y deja decidir a prefers-color-scheme', () => {
    const suelto = document.createElement('greenhouse-cta')

    expect(resolveHostSurfaceScheme(suelto)).toBeNull()
  })
})
