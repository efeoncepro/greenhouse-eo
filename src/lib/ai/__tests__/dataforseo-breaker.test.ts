import { describe, expect, it } from 'vitest'

/**
 * TASK-1300 Slice 2 — circuit breaker por familia.
 *
 * El invariante que importa es el AISLAMIENTO: el AEO (`serp`) y el módulo SEO comparten
 * credenciales y transporte, así que una familia caída no puede arrastrar a las demás.
 */

import { createDataForSeoBreaker } from '../dataforseo-breaker'

describe('createDataForSeoBreaker — aislamiento entre familias', () => {
  it('abrir una familia NO bloquea a las demás', () => {
    const breaker = createDataForSeoBreaker({ failureThreshold: 2 })

    breaker.recordFailure('backlinks')
    breaker.recordFailure('backlinks')

    expect(breaker.state('backlinks')).toBe('open')
    expect(breaker.canAttempt('backlinks')).toBe(false)

    // Lo que esta task existe para garantizar: el grader AEO sigue pasando.
    expect(breaker.canAttempt('serp')).toBe(true)
    expect(breaker.canAttempt('labs')).toBe(true)
    expect(breaker.state('serp')).toBe('closed')
  })

  it('cuenta fallos CONSECUTIVOS: un éxito intermedio reinicia', () => {
    const breaker = createDataForSeoBreaker({ failureThreshold: 3 })

    breaker.recordFailure('labs')
    breaker.recordFailure('labs')
    breaker.recordSuccess('labs')
    breaker.recordFailure('labs')
    breaker.recordFailure('labs')

    // Sin el reinicio, un proveedor intermitente abriría el breaker por acumulación.
    expect(breaker.state('labs')).toBe('closed')
  })
})

describe('createDataForSeoBreaker — cooldown', () => {
  it('pasa a half-open recién cumplido el cooldown', () => {
    let clock = 1_000
    const breaker = createDataForSeoBreaker({ failureThreshold: 1, cooldownMs: 500, now: () => clock })

    breaker.recordFailure('onpage')
    expect(breaker.state('onpage')).toBe('open')
    expect(breaker.canAttempt('onpage')).toBe(false)

    clock += 499
    expect(breaker.state('onpage')).toBe('open')

    clock += 1
    expect(breaker.state('onpage')).toBe('half-open')
    // half-open deja pasar UNA sonda: sin eso el breaker no se cerraría nunca.
    expect(breaker.canAttempt('onpage')).toBe(true)
  })

  it('un éxito en half-open cierra el breaker', () => {
    let clock = 0
    const breaker = createDataForSeoBreaker({ failureThreshold: 1, cooldownMs: 100, now: () => clock })

    breaker.recordFailure('domain')
    clock += 100
    breaker.recordSuccess('domain')

    expect(breaker.state('domain')).toBe('closed')
  })

  it('un fallo en half-open reinicia el cooldown desde ahora', () => {
    let clock = 0
    const breaker = createDataForSeoBreaker({ failureThreshold: 1, cooldownMs: 100, now: () => clock })

    breaker.recordFailure('domain')
    clock += 100
    expect(breaker.state('domain')).toBe('half-open')

    breaker.recordFailure('domain')
    // Sin reiniciar el reloj, un proveedor caído recibiría una sonda por llamada.
    expect(breaker.state('domain')).toBe('open')

    clock += 100
    expect(breaker.state('domain')).toBe('half-open')
  })

  it('reset limpia una familia sin tocar las otras', () => {
    const breaker = createDataForSeoBreaker({ failureThreshold: 1 })

    breaker.recordFailure('labs')
    breaker.recordFailure('serp')
    breaker.reset('labs')

    expect(breaker.state('labs')).toBe('closed')
    expect(breaker.state('serp')).toBe('open')
  })
})
