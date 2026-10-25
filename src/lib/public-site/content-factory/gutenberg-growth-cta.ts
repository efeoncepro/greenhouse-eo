/**
 * Governed builder + checks for the dynamic `efeoncepro/growth-cta` block (efeonce-editorial-blocks ≥ 0.7.0).
 *
 * The block only PLACES a Growth CTA of Greenhouse in a post: copy, action, versions, kill switch and measurement
 * live in the Growth CTA engine (`src/lib/growth/ctas/`), never in the post. The spec declares
 * `{ kind: 'growthCta', cta, location?, emphasis? }` and this module serializes the self-closing block exactly as
 * WordPress stores it. The CTA slug must be one the blog surface allows (option `eo_growth_cta_blog`); otherwise the
 * block prints nothing on the public page — fail-closed, never a broken card.
 *
 * Contract: `docs/public-site/BLOG_EDITORIAL_BLOCK_STYLES_V1.md` §Growth CTA.
 */

import { serializeGutenbergBlockAttributes } from './gutenberg-blocks'

export const GROWTH_CTA_BLOCK_NAME = 'efeoncepro/growth-cta'

export const GROWTH_CTA_ALLOWED_ATTRIBUTES = ['cta', 'location', 'emphasis'] as const

const SLUG_PATTERN = /^[a-z0-9-]{3,80}$/
const LOCATION_PATTERN = /^[a-z0-9_]{3,60}$/

export type GrowthCtaBlockInput = {
  /** Slug of a published Growth CTA allowed by the blog surface. */
  cta: string
  /** `cta_location` measurement param (default `blog_article`). */
  location?: string
  /** One exact phrase of the governed headline to set in bold (AXIS `headlineEmphasis`). */
  emphasis?: string
}

export const isGrowthCtaSlug = (value: unknown): value is string => typeof value === 'string' && SLUG_PATTERN.test(value)

export const isGrowthCtaLocation = (value: unknown): value is string =>
  typeof value === 'string' && LOCATION_PATTERN.test(value)

/**
 * Render `<!-- wp:efeoncepro/growth-cta {"cta":"…","location":"…","emphasis":"…"} /-->`. Throws on an invalid slug
 * or location so a malformed spec never reaches a draft.
 */
export const renderGrowthCtaBlock = (input: GrowthCtaBlockInput): string => {
  if (!isGrowthCtaSlug(input.cta)) throw new Error(`content_factory_article_growth_cta_slug_invalid:${input.cta}`)

  const location = input.location ?? 'blog_article'

  if (!isGrowthCtaLocation(location)) throw new Error(`content_factory_article_growth_cta_location_invalid:${location}`)

  const emphasis = (input.emphasis ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

  const attrs: Record<string, string> = { cta: input.cta, location }

  if (emphasis) attrs.emphasis = emphasis

  return `<!-- wp:${GROWTH_CTA_BLOCK_NAME} ${serializeGutenbergBlockAttributes(attrs)} /-->`
}
