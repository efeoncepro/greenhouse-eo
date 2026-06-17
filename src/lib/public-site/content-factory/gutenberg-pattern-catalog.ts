import type { GutenbergBlockPatternCatalog, GutenbergBlockPatternCatalogEntry } from './contracts'

const headingExample = [
  '<!-- wp:heading {"level":2} -->',
  '<h2>Que cambia para el equipo comercial</h2>',
  '<!-- /wp:heading -->'
].join('\n')

const paragraphExample = [
  '<!-- wp:paragraph -->',
  '<p>El punto no es producir mas piezas, sino producir piezas que una persona pueda revisar y mejorar con trazabilidad.</p>',
  '<!-- /wp:paragraph -->'
].join('\n')

const listExample = [
  '<!-- wp:list -->',
  '<ul>',
  '<li>Definir el objetivo comercial antes del prompt.</li>',
  '<li>Separar borrador, validacion y aprobacion.</li>',
  '</ul>',
  '<!-- /wp:list -->'
].join('\n')

const quoteExample = [
  '<!-- wp:quote -->',
  '<blockquote class="wp-block-quote"><p>La AI aporta valor cuando trabaja con contexto, restricciones y evidencia.</p></blockquote>',
  '<!-- /wp:quote -->'
].join('\n')

const pullquoteExample = [
  '<!-- wp:pullquote -->',
  '<figure class="wp-block-pullquote"><blockquote><p>El loop no es una campana: es un sistema que aprende en cada vuelta.</p></blockquote></figure>',
  '<!-- /wp:pullquote -->'
].join('\n')

const tocExample = [
  '<!-- wp:yoast-seo/table-of-contents -->',
  '<div class="wp-block-yoast-seo-table-of-contents yoast-table-of-contents"><h2>Tabla de contenidos</h2></div>',
  '<!-- /wp:yoast-seo/table-of-contents -->'
].join('\n')

const youtubeExample = [
  '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=VIDEO_ID","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->',
  '<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=VIDEO_ID</div></figure>',
  '<!-- /wp:embed -->'
].join('\n')

export const EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES: GutenbergBlockPatternCatalogEntry[] = [
  {
    blockName: 'core/paragraph',
    role: 'body',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Body copy block for argument, context and transitions.',
    constraints: [
      'Do not generate paragraph-only posts.',
      'Escape generated text and avoid inline event handlers, scripts, iframes and javascript: URLs.'
    ],
    example: paragraphExample
  },
  {
    blockName: 'core/heading',
    role: 'structure',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Editorial outline block. WordPress owns the post title H1, so body content starts at H2.',
    constraints: [
      'Never generate H1 in post_content.',
      'Use H2 for major sections and H3 for children.',
      'Do not jump from H2 directly to H4.'
    ],
    example: headingExample
  },
  {
    blockName: 'yoast-seo/table-of-contents',
    role: 'navigation',
    generationPolicy: 'recommended',
    refreshPolicy: 'preserve',
    description: 'Yoast table of contents block used by long Efeonce editorial posts.',
    requires: ['Multiple H2/H3 sections'],
    constraints: ['Place after intro/TL;DR and before the body outline.', 'Preserve if present in existing posts.'],
    example: tocExample
  },
  {
    blockName: 'core/list',
    role: 'structure',
    generationPolicy: 'recommended',
    refreshPolicy: 'patch_carefully',
    description: 'List block for TL;DR, checklists, steps, evidence and comparisons.',
    constraints: ['Use for scannability, not as a substitute for all body copy.', 'Prefer concise list items.'],
    example: listExample
  },
  {
    blockName: 'core/list-item',
    role: 'structure',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Nested list item parsed by WordPress inside core/list in recent posts.',
    constraints: ['Usually generated implicitly by core/list markup.', 'Keep item text concise and semantically related.']
  },
  {
    blockName: 'core/quote',
    role: 'structure',
    generationPolicy: 'recommended',
    refreshPolicy: 'preserve',
    description: 'POV or principle block for strong editorial claims.',
    constraints: ['Use for substantive POV, not decorative pull text.', 'Preserve attribution if present.'],
    example: quoteExample
  },
  {
    blockName: 'core/pullquote',
    role: 'structure',
    generationPolicy: 'allowed',
    refreshPolicy: 'preserve',
    description: 'Highlighted editorial pullquote or evidence callout observed in strong Efeonce posts.',
    constraints: [
      'Use only when the claim deserves visual emphasis.',
      'Keep it short and preserve surrounding section rhythm.',
      'Do not use as a replacement for body explanation.'
    ],
    example: pullquoteExample
  },
  {
    blockName: 'core/separator',
    role: 'structure',
    generationPolicy: 'recommended',
    refreshPolicy: 'preserve',
    description: 'Section break used to separate CTA, final reflection or major editorial blocks.',
    constraints: ['Use sparingly.', 'Do not replace headings with separators.'],
    example: '<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->'
  },
  {
    blockName: 'core/image',
    role: 'media',
    generationPolicy: 'requires_source_asset',
    refreshPolicy: 'preserve',
    description: 'Image block backed by a real WordPress media attachment.',
    requires: ['WordPress attachment id', 'media URL', 'alt text'],
    constraints: [
      'Do not invent media IDs.',
      'Do not use decorative placeholder images for production drafts.',
      'Preserve existing media unless the task explicitly asks to replace it.'
    ]
  },
  {
    blockName: 'core/gallery',
    role: 'media',
    generationPolicy: 'requires_source_asset',
    refreshPolicy: 'preserve',
    description: 'Gallery block observed in richer Efeonce posts.',
    requires: ['Resolved WordPress media attachment ids', 'alt text per image'],
    constraints: ['Use only when the source material calls for multiple related images.', 'Preserve existing galleries by default.']
  },
  {
    blockName: 'core/embed',
    role: 'media',
    generationPolicy: 'requires_source_asset',
    refreshPolicy: 'preserve',
    description: 'Embed block for YouTube/video or other supported oEmbed sources.',
    requires: ['Source URL from brief or source inspection'],
    constraints: [
      'Do not invent YouTube/video URLs.',
      'Use providerNameSlug when known.',
      'Preserve existing embeds unless refresh scope explicitly changes them.'
    ],
    example: youtubeExample
  },
  {
    blockName: 'core/buttons',
    role: 'conversion',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Button group for governed CTA blocks when a conversion target is known.',
    requires: ['CTA target', 'reviewed visible label'],
    constraints: ['Prefer paragraph CTA until the exact HubSpot/external target is known.', 'Never publish unreviewed CTA links.']
  },
  {
    blockName: 'core/button',
    role: 'conversion',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Individual CTA button inside core/buttons.',
    requires: ['CTA target', 'reviewed visible label'],
    constraints: ['Keep label short.', 'Use only inside governed CTA context.']
  },
  {
    blockName: 'core/group',
    role: 'layout',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Grouping block for related editorial or CTA modules.',
    constraints: ['Use native block grouping before custom HTML.', 'Avoid using group as a CSS workaround.']
  },
  {
    blockName: 'core/columns',
    role: 'layout',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Column layout observed in richer Efeonce posts.',
    constraints: ['Use only when comparison or side-by-side evidence benefits from columns.', 'Ensure mobile reading order remains coherent.']
  },
  {
    blockName: 'core/column',
    role: 'layout',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Column child block inside core/columns.',
    constraints: ['Usually generated as part of a core/columns structure.']
  },
  {
    blockName: 'core/spacer',
    role: 'layout',
    generationPolicy: 'allowed',
    refreshPolicy: 'replace_with_review',
    description: 'Spacing block sometimes needed for legacy content, but fragile for generated posts.',
    constraints: ['Avoid spacer-driven layout in new generated posts.', 'Prefer semantic sections and native theme spacing.']
  },
  {
    blockName: 'core/freeform',
    role: 'legacy',
    generationPolicy: 'inspect_only',
    refreshPolicy: 'inspect_only',
    description: 'Legacy/freeform HTML fragments observed in existing posts.',
    constraints: [
      'Do not generate for new drafts.',
      'Do not aggressively convert during refresh unless a migration task owns the change.',
      'Patch around it and preserve when inspecting existing posts.'
    ]
  },
  {
    blockName: 'essential-blocks/testimonial',
    role: 'third_party',
    generationPolicy: 'inspect_only',
    refreshPolicy: 'preserve',
    description: 'Third-party testimonial block observed in a recent Efeonce post.',
    constraints: ['Preserve if present.', 'Do not generate until the plugin contract and serialization are inspected.']
  }
]

export const getEfeonceGutenbergBlockPatternCatalog = (
  options: { generatedAt?: string } = {}
): GutenbergBlockPatternCatalog => ({
  contractVersion: 'gutenbergBlockPatternCatalog.v1',
  key: 'efeonce_gutenberg_blogpost',
  generatedAt: options.generatedAt,
  source: {
    recipePath: 'docs/documentation/public-site/gutenberg-post-authoring-recipes.md',
    validatorProfile: 'EFEONCE_BLOGPOST_COMPOSITION_PROFILE',
    observedRuntimeSample: 'WP-CLI read-only sample of six latest published efeoncepro.com posts on 2026-06-14'
  },
  entries: EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES
})

export const listAllowedGeneratedGutenbergPatternBlocks = () =>
  EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES.filter(entry => entry.generationPolicy !== 'inspect_only').map(
    entry => entry.blockName
  )
