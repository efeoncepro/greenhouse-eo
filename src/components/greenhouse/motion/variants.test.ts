import { describe, expect, it, vi } from 'vitest'

import type { GreenhouseGsapContext } from './core'
import { VARIANT_BUILDERS, type ResolvedMotionOptions } from './variants'

const OPTIONS: ResolvedMotionOptions = {
  duration: 0.3,
  ease: 'gh-emphasized',
  delay: 0,
  distance: 8,
  stagger: 0.06,
  start: 'top 85%',
  reducedDuration: 0.075
}

const makeCtx = (reduced: boolean) => {
  const fromTo = vi.fn()
  const set = vi.fn()
  const tl = { from: vi.fn(), to: vi.fn() }
  const timeline = vi.fn(() => tl)

  const ctx = {
    gsap: { fromTo, set, timeline },
    reduced,
    conditions: { reduced }
  } as unknown as GreenhouseGsapContext

  return { ctx, fromTo, timeline, tl }
}

describe('variant builders — reduced-motion + never-hidden contract', () => {
  it('entrance: fromTo → visible with clearProps; y normally, opacity-only + snap when reduced', () => {
    const normal = makeCtx(false)

    VARIANT_BUILDERS.entrance({ ctx: normal.ctx, scope: {} as Element, options: OPTIONS })
    // [target, fromVars, toVars]
    expect(normal.fromTo.mock.calls[0][1]).toMatchObject({ autoAlpha: 0, y: 8 })
    expect(normal.fromTo.mock.calls[0][2]).toMatchObject({
      autoAlpha: 1,
      y: 0,
      duration: 0.3,
      ease: 'gh-emphasized',
      clearProps: 'opacity,visibility,transform',
      overwrite: 'auto'
    })

    const reduced = makeCtx(true)

    VARIANT_BUILDERS.entrance({ ctx: reduced.ctx, scope: {} as Element, options: OPTIONS })
    expect(reduced.fromTo.mock.calls[0][1]).not.toHaveProperty('y')
    expect(reduced.fromTo.mock.calls[0][2]).toMatchObject({ autoAlpha: 1, duration: 0.075, ease: 'none', clearProps: 'opacity,visibility,transform' })
  })

  it('stagger: fromTo → visible with clearProps; stagger normally, stagger 0 + snap when reduced', () => {
    const scope = { children: [{}, {}, {}] } as unknown as Element

    const normal = makeCtx(false)

    VARIANT_BUILDERS.stagger({ ctx: normal.ctx, scope, options: OPTIONS })
    expect(normal.fromTo.mock.calls[0][1]).toMatchObject({ autoAlpha: 0, y: 8 })
    expect(normal.fromTo.mock.calls[0][2]).toMatchObject({ autoAlpha: 1, y: 0, stagger: 0.06, clearProps: 'opacity,visibility,transform', overwrite: 'auto' })

    const reduced = makeCtx(true)

    VARIANT_BUILDERS.stagger({ ctx: reduced.ctx, scope, options: OPTIONS })
    expect(reduced.fromTo.mock.calls[0][2]).toMatchObject({ stagger: 0, duration: 0.075, ease: 'none', clearProps: 'opacity,visibility,transform' })
  })

  it('stagger: no-op when there are no children', () => {
    const empty = { children: [] } as unknown as Element
    const { ctx, fromTo } = makeCtx(false)

    VARIANT_BUILDERS.stagger({ ctx, scope: empty, options: OPTIONS })
    expect(fromTo).not.toHaveBeenCalled()
  })

  it('scrollReveal: builds a ScrollTrigger (fromTo + clearProps) normally, does nothing when reduced', () => {
    const normal = makeCtx(false)

    VARIANT_BUILDERS.scrollReveal({ ctx: normal.ctx, scope: {} as Element, options: OPTIONS })
    expect(normal.fromTo.mock.calls[0][2]).toMatchObject({
      clearProps: 'opacity,visibility,transform',
      scrollTrigger: expect.objectContaining({ start: 'top 85%', once: true })
    })

    const reduced = makeCtx(true)

    VARIANT_BUILDERS.scrollReveal({ ctx: reduced.ctx, scope: {} as Element, options: OPTIONS })
    expect(reduced.fromTo).not.toHaveBeenCalled()
  })

  it('timeline: collapses durations under reduced-motion via timeline defaults', () => {
    const build = vi.fn()

    const normal = makeCtx(false)

    VARIANT_BUILDERS.timeline({ ctx: normal.ctx, scope: {} as Element, options: OPTIONS, build })
    expect((normal.timeline.mock.calls[0] as unknown[])[0]).toMatchObject({
      defaults: { duration: 0.3, ease: 'gh-emphasized' }
    })
    expect(build).toHaveBeenCalledWith(normal.ctx, normal.tl)

    const reduced = makeCtx(true)

    VARIANT_BUILDERS.timeline({ ctx: reduced.ctx, scope: {} as Element, options: OPTIONS, build })
    expect((reduced.timeline.mock.calls[0] as unknown[])[0]).toMatchObject({
      defaults: { duration: 0.075, ease: 'none' }
    })
  })

  it('timeline: no-op without a build callback', () => {
    const { ctx, timeline } = makeCtx(false)

    VARIANT_BUILDERS.timeline({ ctx, scope: {} as Element, options: OPTIONS })
    expect(timeline).not.toHaveBeenCalled()
  })
})
