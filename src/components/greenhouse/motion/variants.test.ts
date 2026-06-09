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
  const from = vi.fn()
  const set = vi.fn()
  const tl = { from: vi.fn(), to: vi.fn() }
  const timeline = vi.fn(() => tl)

  const ctx = {
    gsap: { from, set, timeline },
    reduced,
    conditions: { reduced }
  } as unknown as GreenhouseGsapContext

  return { ctx, from, timeline, tl }
}

describe('variant builders — reduced-motion contract', () => {
  it('entrance: translates on y normally, opacity-only + snap when reduced', () => {
    const normal = makeCtx(false)

    VARIANT_BUILDERS.entrance({ ctx: normal.ctx, scope: {} as Element, options: OPTIONS })
    expect(normal.from).toHaveBeenCalledWith({} as Element, expect.objectContaining({ y: 8, duration: 0.3, ease: 'gh-emphasized' }))

    const reduced = makeCtx(true)

    VARIANT_BUILDERS.entrance({ ctx: reduced.ctx, scope: {} as Element, options: OPTIONS })
    const vars = reduced.from.mock.calls[0][1]

    expect(vars).not.toHaveProperty('y')
    expect(vars).toMatchObject({ autoAlpha: 0, duration: 0.075, ease: 'none' })
  })

  it('stagger: animates direct children with a stagger, snaps with stagger 0 when reduced', () => {
    const scope = { children: [{}, {}, {}] } as unknown as Element

    const normal = makeCtx(false)

    VARIANT_BUILDERS.stagger({ ctx: normal.ctx, scope, options: OPTIONS })
    expect(normal.from.mock.calls[0][1]).toMatchObject({ y: 8, stagger: 0.06 })

    const reduced = makeCtx(true)

    VARIANT_BUILDERS.stagger({ ctx: reduced.ctx, scope, options: OPTIONS })
    expect(reduced.from.mock.calls[0][1]).toMatchObject({ stagger: 0, duration: 0.075, ease: 'none' })
  })

  it('stagger: no-op when there are no children', () => {
    const empty = { children: [] } as unknown as Element
    const { ctx, from } = makeCtx(false)

    VARIANT_BUILDERS.stagger({ ctx, scope: empty, options: OPTIONS })
    expect(from).not.toHaveBeenCalled()
  })

  it('scrollReveal: builds a ScrollTrigger normally, does nothing when reduced (content stays visible)', () => {
    const normal = makeCtx(false)

    VARIANT_BUILDERS.scrollReveal({ ctx: normal.ctx, scope: {} as Element, options: OPTIONS })
    expect(normal.from.mock.calls[0][1]).toMatchObject({
      scrollTrigger: expect.objectContaining({ start: 'top 85%', once: true })
    })

    const reduced = makeCtx(true)

    VARIANT_BUILDERS.scrollReveal({ ctx: reduced.ctx, scope: {} as Element, options: OPTIONS })
    expect(reduced.from).not.toHaveBeenCalled()
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
