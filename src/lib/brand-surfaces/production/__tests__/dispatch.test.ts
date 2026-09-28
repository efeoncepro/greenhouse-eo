import { beforeEach, describe, expect, it, vi } from 'vitest'

const runner = vi.hoisted(() => ({ runArtifactWorkerJob: vi.fn() }))
const store = vi.hoisted(() => ({ hasDispatchableBrandRenderJob: vi.fn() }))
const capture = vi.hoisted(() => ({ captureWithDomain: vi.fn() }))

vi.mock('@/lib/render-dispatch/job-runner', () => runner)
vi.mock('../store', () => store)
vi.mock('@/lib/observability/capture', () => capture)

import { dispatchNextBrandRender } from '../dispatch'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.BRAND_RENDER_ENABLED = 'true'
})

describe('dispatchNextBrandRender', () => {
  it('flag OFF → no consulta la cola ni lanza el Job', async () => {
    process.env.BRAND_RENDER_ENABLED = 'false'

    expect(await dispatchNextBrandRender()).toEqual({ skipped: 'flag_off', hasWork: false, executionName: null })
    expect(store.hasDispatchableBrandRenderJob).not.toHaveBeenCalled()
    expect(runner.runArtifactWorkerJob).not.toHaveBeenCalled()
  })

  it('cola vacía → no lanza', async () => {
    store.hasDispatchableBrandRenderJob.mockResolvedValueOnce(false)

    expect(await dispatchNextBrandRender()).toMatchObject({ skipped: 'empty_queue' })
    expect(runner.runArtifactWorkerJob).not.toHaveBeenCalled()
  })

  it('con trabajo lanza UNA ejecución', async () => {
    store.hasDispatchableBrandRenderJob.mockResolvedValueOnce(true)
    runner.runArtifactWorkerJob.mockResolvedValueOnce('exec-1')

    expect(await dispatchNextBrandRender()).toEqual({ hasWork: true, executionName: 'exec-1' })
    expect(runner.runArtifactWorkerJob).toHaveBeenCalledTimes(1)
  })

  it('un fallo del despacho no marca el job: se captura y el próximo tick reintenta', async () => {
    store.hasDispatchableBrandRenderJob.mockResolvedValueOnce(true)
    runner.runArtifactWorkerJob.mockRejectedValueOnce(new Error('jobs api'))

    expect(await dispatchNextBrandRender()).toEqual({ hasWork: true, executionName: null })
    expect(capture.captureWithDomain).toHaveBeenCalledWith(expect.any(Error), 'brand_render', expect.anything())
  })
})
