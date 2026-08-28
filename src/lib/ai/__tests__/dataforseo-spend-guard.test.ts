import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1300 Slice 2 — el transporte no deja gastar sin contabilizar.
 *
 * Estos tests protegen el modo de falla más caro del cliente: una familia que cuesta dinero
 * llamada desde un runtime que no registró el contador. El resultado sería gasto real con el
 * gate de presupuesto leyendo cero para siempre. Preferimos romper fuerte en la primera
 * llamada (lección de TASK-1302, donde un runtime sin su config degradó en silencio).
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: () => undefined }))
vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: async () => ({ value: 'pw', source: 'env' })
}))

import { postDataForSeoTask, setDataForSeoSpendRecorder } from '../dataforseo'
import { dataForSeoBreaker } from '../dataforseo-breaker'

const originalFetch = globalThis.fetch

beforeEach(() => {
  process.env.DATAFORSEO_API_LOGIN = 'login'
  setDataForSeoSpendRecorder(null)
  dataForSeoBreaker.reset()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  setDataForSeoSpendRecorder(null)
  dataForSeoBreaker.reset()
})

describe('postDataForSeoTask — guardas antes de gastar', () => {
  it('LANZA si una familia que gasta corre sin contador registrado', async () => {
    await expect(
      postDataForSeoTask({
        family: 'labs',
        consumer: 'seo',
        endpoint: '/v3/dataforseo_labs/google/keyword_ideas/live',
        tasks: [{ keyword: 'x' }],
        organizationId: 'org-1'
      })
    ).rejects.toThrow(/no registró el contador/)
  })

  it('LANZA si falta organizationId en una familia que gasta', async () => {
    setDataForSeoSpendRecorder(async () => undefined)

    await expect(
      // @ts-expect-error — el tipo ya lo prohíbe; se prueba la defensa de runtime para callers JS.
      postDataForSeoTask({ family: 'backlinks', consumer: 'seo', endpoint: '/v3/backlinks/summary/live', tasks: [] })
    ).rejects.toThrow(/exige organizationId/)
  })

  it('LANZA en `serp` CON organización y sin contador — el caso destructivo', async () => {
    // Este es el agujero que el guard cerró: `serp` no "exige" organización, pero si el
    // caller la declara, el gasto ES atribuible y omitirlo lo perdería en silencio. Es
    // exactamente lo que haría un rank capture (TASK-1303) desde un cron.
    await expect(
      postDataForSeoTask({
        family: 'serp',
        consumer: 'seo',
        endpoint: '/v3/serp/google/organic/live/advanced',
        tasks: [{ keyword: 'x' }],
        organizationId: 'org-1'
      })
    ).rejects.toThrow(/no registró el contador/)
  })

  it('deja pasar `serp` sin contador ni organización — el AEO corre sobre prospectos', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ tasks: [{ id: '1' }], cost: 0.002 }), { status: 200 })) as typeof fetch

    const result = await postDataForSeoTask({
      family: 'serp',
      consumer: 'seo',
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: [{ keyword: 'x' }]
    })

    expect(result.ok).toBe(true)
    expect(result.family).toBe('serp')
  })

  it('valida el endpoint ANTES de tocar credenciales o red', async () => {
    let fetched = false

    globalThis.fetch = (async () => {
      fetched = true

      return new Response('{}', { status: 200 })
    }) as typeof fetch

    await expect(
      postDataForSeoTask({ family: 'serp', consumer: 'seo', endpoint: '/v3/dataforseo_labs/x', tasks: [] })
    ).rejects.toThrow(/familia "serp"/)

    expect(fetched).toBe(false)
  })
})

describe('postDataForSeoTask — contabilización', () => {
  it('registra el gasto en el transporte, sin que el caller tenga que acordarse', async () => {
    const recorded: Array<{ organizationId: string; family: string; cost: number; consumer: string }> = []

    setDataForSeoSpendRecorder(async input => {
      recorded.push(input)
    })

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ tasks: [{ id: '1' }], cost: 0.0125 }), { status: 200 })) as typeof fetch

    await postDataForSeoTask({
      family: 'labs',
      consumer: 'seo',
      endpoint: '/v3/dataforseo_labs/google/keyword_ideas/live',
      tasks: [{ keyword: 'x' }],
      organizationId: 'org-42'
    })

    expect(recorded).toEqual([{ organizationId: 'org-42', family: 'labs', cost: 0.0125, consumer: 'seo' }])
  })

  it('un fallo al contabilizar NO invalida el resultado que el proveedor ya cobró', async () => {
    setDataForSeoSpendRecorder(async () => {
      throw new Error('PG caído')
    })

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ tasks: [{ id: '1' }], cost: 0.01 }), { status: 200 })) as typeof fetch

    const result = await postDataForSeoTask({
      family: 'labs',
      consumer: 'seo',
      endpoint: '/v3/dataforseo_labs/google/keyword_ideas/live',
      tasks: [{ keyword: 'x' }],
      organizationId: 'org-1'
    })

    // Perder el contador es malo; perder además el resultado ya pagado es peor.
    expect(result.ok).toBe(true)
    expect(result.cost).toBe(0.01)
  })

  it('no contabiliza cuando el proveedor no declara costo', async () => {
    const recorded: unknown[] = []

    setDataForSeoSpendRecorder(async input => {
      recorded.push(input)
    })

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ tasks: [], cost: 0 }), { status: 200 })) as typeof fetch

    await postDataForSeoTask({
      family: 'labs',
      consumer: 'seo',
      endpoint: '/v3/dataforseo_labs/google/keyword_ideas/live',
      tasks: [],
      organizationId: 'org-1'
    })

    expect(recorded).toHaveLength(0)
  })
})

describe('postDataForSeoTask — degradación honesta', () => {
  it('un HTTP no-ok degrada sin fabricar tasks ni costo', async () => {
    setDataForSeoSpendRecorder(async () => undefined)
    globalThis.fetch = (async () => new Response('nope', { status: 402 })) as typeof fetch

    const result = await postDataForSeoTask({
      family: 'labs',
      consumer: 'seo',
      endpoint: '/v3/dataforseo_labs/google/keyword_ideas/live',
      tasks: [],
      organizationId: 'org-1'
    })

    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(402)
    expect(result.tasks).toEqual([])
    expect(result.cost).toBeNull()
    expect(result.breakerOpen).toBe(false)
  })

  it('con el breaker abierto NO llama al proveedor y lo declara', async () => {
    setDataForSeoSpendRecorder(async () => undefined)

    let fetched = false

    globalThis.fetch = (async () => {
      fetched = true

      return new Response('nope', { status: 500 })
    }) as typeof fetch

    // Abre el breaker de `labs` con el umbral por defecto (5 fallos consecutivos).
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await postDataForSeoTask({
        family: 'labs',
        consumer: 'seo',
        endpoint: '/v3/dataforseo_labs/google/keyword_ideas/live',
        tasks: [],
        organizationId: 'org-1'
      })
    }

    fetched = false

    const result = await postDataForSeoTask({
      family: 'labs',
      consumer: 'seo',
      endpoint: '/v3/dataforseo_labs/google/keyword_ideas/live',
      tasks: [],
      organizationId: 'org-1'
    })

    expect(fetched).toBe(false)
    expect(result.ok).toBe(false)
    // `breakerOpen` distingue "no se intentó" de "se intentó y falló".
    expect(result.breakerOpen).toBe(true)

    // Y el aislamiento sostiene: el AEO sigue pasando.
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ tasks: [{ id: '1' }], cost: 0.001 }), { status: 200 })) as typeof fetch

    const serp = await postDataForSeoTask({
      family: 'serp',
      consumer: 'seo',
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: [{ keyword: 'x' }]
    })

    expect(serp.ok).toBe(true)
  })
})

describe('el consumidor declarado por el caller llega al contador (TASK-1696)', () => {
  it('una llamada `serp` del grader se contabiliza como AEO, no como SEO', async () => {
    // Es el hecho que cierra el punto ciego: la familia `serp` la compran los dos servicios, y sin
    // esta propagación el gasto del grader se descontaría del presupuesto SEO del cliente.
    const recorded: Array<{ consumer: string; family: string }> = []

    setDataForSeoSpendRecorder(async input => {
      recorded.push({ consumer: input.consumer, family: input.family })
    })

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ tasks: [{ id: '1' }], cost: 0.004 }), { status: 200 })) as typeof fetch

    await postDataForSeoTask({
      family: 'serp',
      consumer: 'aeo',
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: [{ keyword: 'pinturas' }],
      organizationId: 'org-cliente'
    })

    expect(recorded).toEqual([{ consumer: 'aeo', family: 'serp' }])
  })
})
