import type { GutenbergBlockPatternCatalog, GutenbergBlockPatternCatalogEntry } from './contracts'
import { renderHeadingBlock, renderYoastTableOfContents } from './gutenberg-blocks'
import { renderGlitchDropBlock } from './gutenberg-glitch-drop'

// Examples are generated from the canonical block builders so they are always
// anchored + populated by construction (regression guard for the 250748 defect).
const headingExample = renderHeadingBlock({ level: 2, text: 'Que cambia para el equipo comercial' })

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

const detailsExample = [
  '<!-- wp:details {"summary":"¿Qué decide una persona?"} -->',
  '<details class="wp-block-details"><summary>¿Qué decide una persona?</summary>',
  '<!-- wp:paragraph -->',
  '<p>La persona conserva intención, criterio, excepciones y aprobación final.</p>',
  '<!-- /wp:paragraph -->',
  '</details>',
  '<!-- /wp:details -->'
].join('\n')

const faqJsonLdExample = [
  '<!-- wp:html -->',
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"¿Qué decide una persona?","acceptedAnswer":{"@type":"Answer","text":"La persona conserva intención, criterio, excepciones y aprobación final."}}]}</script>',
  '<!-- /wp:html -->'
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

const tocExample = renderYoastTableOfContents([
  { level: 2, text: 'Que cambia para el equipo comercial' },
  { level: 3, text: 'Como aterrizarlo' }
])

const glitchDropExample = renderGlitchDropBlock([
  'El modelo del medio dejó de ser el plan B.',
  'La pregunta ya no es cuál es el mejor modelo, sino para qué tarea necesitas de verdad el más caro.'
])

const stripedTableExample = [
  '<!-- wp:table {"className":"is-style-stripes"} -->',
  '<figure class="wp-block-table is-style-stripes"><table><thead><tr><th scope="col">Modelo</th><th scope="col">Precio</th></tr></thead><tbody><tr><td>Medio</td><td>Mitad</td></tr></tbody></table><figcaption class="wp-element-caption">Fuente: anuncio del proveedor.</figcaption></figure>',
  '<!-- /wp:table -->'
].join('\n')

const buttonsExample = [
  '<!-- wp:buttons -->',
  '<div class="wp-block-buttons"><!-- wp:button -->',
  '<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://efeoncepro.com/contacto/">Conversemos</a></div>',
  '<!-- /wp:button -->',
  '',
  '<!-- wp:button {"className":"is-style-outline"} -->',
  '<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="https://efeoncepro.com/glitch/">Leer Glitch</a></div>',
  '<!-- /wp:button --></div>',
  '<!-- /wp:buttons -->'
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
      'Do not jump from H2 directly to H4.',
      'Emit via renderHeadingBlock(): every heading needs class="wp-block-heading" + an id="h-{slug}" anchor so the TOC can link to it.'
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
    constraints: [
      'Place after intro/TL;DR and before the body outline.',
      'Preserve if present in existing posts.',
      'Must be populated with anchor links via renderYoastTableOfContents(outline); an empty TOC (title only) renders as a dead heading.'
    ],
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
    blockName: 'core/details',
    role: 'disclosure',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description:
      'Native disclosure block for compact FAQs or optional editorial detail when the answer should remain in the HTML without custom JavaScript.',
    constraints: [
      'Use for local question/answer or optional detail inside a section, not as a replacement for major H2/H3 article structure.',
      'Keep the summary visible, specific and concise.',
      'Do not put heading blocks inside the disclosure unless the TOC/outline decision explicitly owns that navigation change.'
    ],
    example: detailsExample
  },
  {
    blockName: 'core/html',
    role: 'structured_data',
    generationPolicy: 'allowed',
    refreshPolicy: 'preserve',
    description:
      'Governed JSON-LD structured data generated by semantic Content Factory capabilities such as kind="faq". Not a freeform HTML escape hatch.',
    requires: ['A semantic source block that owns the visible content, such as kind="faq"'],
    constraints: [
      'Only generate application/ld+json scripts from governed semantic blocks.',
      'For FAQPage, every schema Question must match a visible core/details summary.',
      'Do not use core/html for layout, arbitrary embeds, custom JavaScript or hand-authored schema.'
    ],
    example: faqJsonLdExample
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
    blockName: 'core/table',
    role: 'structure',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Native comparison/data table with optional caption and the core-registered stripes style (spec kind="table", style="stripes").',
    constraints: [
      'Every row keeps the header column count.',
      'Only the core-registered is-style-stripes style; no inline colors.',
      'Check Ohio at 390 px before using stripes on wide tables.'
    ],
    example: stripedTableExample
  },
  {
    blockName: 'efeoncepro/glitch-drop',
    role: 'editorial_aside',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description:
      'Efeonce POV callout for Glitch posts. Dynamic block: text in the content attribute of a self-closing comment (spec kind="glitchDrop").',
    requires: ['Glitch post (weekly edition or Glitch Flash)', 'plugin efeonce-editorial-blocks active'],
    constraints: [
      '1-4 plain-text lines joined by <br>; no links or other HTML.',
      'The source link goes in the next paragraph.',
      'Do not repeat the drop sentences in the paragraph before or after it.',
      'Never hand-write the block comment; renderGlitchDropBlock serializes it like WordPress.'
    ],
    example: glitchDropExample
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
      'Preserve existing embeds unless refresh scope explicitly changes them.',
      'Credit the source with embed.caption («Fuente: <medio>»), rendered as a real figcaption.'
    ],
    example: youtubeExample
  },
  {
    blockName: 'core/buttons',
    role: 'conversion',
    generationPolicy: 'allowed',
    refreshPolicy: 'patch_carefully',
    description: 'Button group for governed CTA blocks when a conversion target is known (spec kind="buttons").',
    requires: ['CTA target', 'reviewed visible label'],
    constraints: [
      'Prefer paragraph CTA until the exact HubSpot/external target is known.',
      'Never publish unreviewed CTA links.',
      '1-3 buttons; variants fill (core default, no class) or outline (is-style-outline); no literal colors or unregistered classes.'
    ],
    example: buttonsExample
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
    observedRuntimeSample:
      'WP-CLI read-only sample of six latest published efeoncepro.com posts on 2026-06-14 plus Creative Workflows FAQ block registry inspection on 2026-07-15 and the runtime inventory of 2026-09-28'
  },
  entries: EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES
})

export const listAllowedGeneratedGutenbergPatternBlocks = () =>
  EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES.filter(entry => entry.generationPolicy !== 'inspect_only').map(
    entry => entry.blockName
  )
