import type {
  GutenbergBlockCapabilityEntry,
  GutenbergBlockCapabilityRegistry,
  GutenbergBlockSemanticOperation
} from './contracts'

const draftOnlyPolicy = (notes: string, requiresHumanReview = true): GutenbergBlockCapabilityEntry['applyPolicy'] => ({
  directPublishedMutation: false,
  requiresDraftClone: true,
  requiresHumanReview,
  notes
})

const previewRequired = (...checks: string[]): GutenbergBlockCapabilityEntry['previewPolicy'] => ({
  required: true,
  checks
})

const baseEvidence = ['fresh_deep_inspection', 'source_fingerprint', 'block_fingerprint'] as const

export const EFEONCE_GUTENBERG_BLOCK_CAPABILITIES: GutenbergBlockCapabilityEntry[] = [
  {
    blockName: 'core/paragraph',
    semanticKind: 'editorial_body',
    agentRole: 'Body paragraph for argument, context, transitions and explanation.',
    freedomLevel: 'guided',
    editableSurfaces: ['text', 'link'],
    semanticOperations: ['refresh_body_copy'],
    compilesTo: ['update_text', 'review_link'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('Refresh body copy on a draft/private clone after matching path and fingerprint.'),
    previewPolicy: previewRequired('Text remains readable in the surrounding section.', 'Links still point to reviewed destinations.'),
    guardrails: [
      'Do not flatten the post into paragraphs only.',
      'Preserve surrounding block order unless a structure plan explicitly owns the change.',
      'Do not introduce scripts, iframes, inline event handlers or javascript: URLs.'
    ],
    exampleIntent: 'Clarify this paragraph so it connects the buyer journey with Loop Marketing.'
  },
  {
    blockName: 'core/heading',
    semanticKind: 'editorial_heading',
    agentRole: 'Outline heading for the article hierarchy. The post title owns H1.',
    freedomLevel: 'guided',
    editableSurfaces: ['text', 'attrs'],
    semanticOperations: ['rewrite_heading', 'adjust_heading_level'],
    compilesTo: ['update_text', 'update_attrs'],
    requiredEvidence: [...baseEvidence, 'heading_outline'],
    applyPolicy: draftOnlyPolicy('Heading changes must preserve a coherent H2/H3 hierarchy and regenerate/review TOC when needed.'),
    previewPolicy: previewRequired('No H1 appears inside post_content.', 'Heading hierarchy has no H2-to-H4 jumps.'),
    guardrails: [
      'Use H2 for major sections and H3 for children.',
      'If heading text changes, review internal anchors and table of contents.',
      'Do not turn headings into decorative typography.'
    ],
    exampleIntent: 'Make this H2 more specific without changing the section promise.'
  },
  {
    blockName: 'core/list',
    semanticKind: 'editorial_list',
    agentRole: 'Structured list for TL;DR, steps, checks, risks or comparisons.',
    freedomLevel: 'constrained',
    editableSurfaces: ['children', 'structure'],
    semanticOperations: ['refresh_list_items'],
    compilesTo: ['preserve', 'update_text'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('List structure should be preserved unless the semantic plan owns item-level changes.'),
    previewPolicy: previewRequired('List remains scannable and semantically grouped.', 'Mobile reading order remains coherent.'),
    guardrails: [
      'Patch list-item children rather than replacing the parent list when possible.',
      'Do not use lists as a substitute for all body explanation.',
      'Preserve nested structure unless a reviewed outline diff owns the change.'
    ],
    exampleIntent: 'Tighten this checklist while keeping the same number of practical steps.'
  },
  {
    blockName: 'core/list-item',
    semanticKind: 'editorial_list',
    agentRole: 'Individual item inside a native Gutenberg list.',
    freedomLevel: 'guided',
    editableSurfaces: ['text'],
    semanticOperations: ['refresh_list_items'],
    compilesTo: ['update_text'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('Item text can be refreshed when the parent list stays structurally stable.'),
    previewPolicy: previewRequired('List item stays concise and related to sibling items.'),
    guardrails: ['Keep item text concise.', 'Do not move items across sections without a structure plan.'],
    exampleIntent: 'Make this item more concrete for a marketing operator.'
  },
  {
    blockName: 'core/quote',
    semanticKind: 'editorial_quote',
    agentRole: 'Editorial principle or point-of-view quote inside the article flow.',
    freedomLevel: 'guided',
    editableSurfaces: ['text', 'children'],
    semanticOperations: ['refresh_editorial_quote'],
    compilesTo: ['update_text', 'preserve'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('Quote text can be refreshed when attribution and surrounding context are preserved.'),
    previewPolicy: previewRequired('Quote supports the current section.', 'Attribution is preserved when present.'),
    guardrails: [
      'Use quotes for substantive POV, not decoration.',
      'Do not invent third-party attribution.',
      'Prefer original Efeonce POV when source evidence is unavailable.'
    ],
    exampleIntent: 'Replace this generic quote with a sharper Efeonce point of view.'
  },
  {
    blockName: 'core/pullquote',
    semanticKind: 'editorial_pullquote',
    agentRole: 'Highlighted editorial pullquote or evidence callout.',
    freedomLevel: 'guided',
    editableSurfaces: ['text'],
    semanticOperations: ['refresh_editorial_pullquote'],
    compilesTo: ['update_text'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('Pullquote can be rewritten on a draft clone while preserving block type and visual rhythm.'),
    previewPolicy: previewRequired('Pullquote remains short enough for desktop and mobile.', 'Visual emphasis still matches the section argument.'),
    guardrails: [
      'Do not use fragile external statistics without source validation.',
      'Do not replace body explanation with a pullquote.',
      'Preserve the surrounding separators and section rhythm unless explicitly changing structure.'
    ],
    exampleIntent: 'Refresh this pullquote so it connects Loop Marketing with faster learning cycles.'
  },
  {
    blockName: 'yoast-seo/table-of-contents',
    semanticKind: 'navigation_toc',
    agentRole: 'Yoast-generated navigation for long editorial posts.',
    freedomLevel: 'preserve_only',
    editableSurfaces: ['structure'],
    semanticOperations: ['preserve_or_regenerate_toc'],
    compilesTo: ['preserve'],
    requiredEvidence: ['fresh_deep_inspection', 'source_fingerprint', 'heading_outline'],
    applyPolicy: draftOnlyPolicy('Preserve by default; regenerate/review only after heading changes.', true),
    previewPolicy: previewRequired('TOC reflects the heading outline.', 'Internal anchors resolve after heading changes.'),
    guardrails: [
      'Do not delete TOC from long posts.',
      'If headings change, validate TOC and anchors before review.',
      'Do not hand-author fake TOC links without WordPress/Yoast verification.'
    ],
    exampleIntent: 'Preserve the TOC while refreshing the section headings.'
  },
  {
    blockName: 'core/image',
    semanticKind: 'media_asset',
    agentRole: 'WordPress media-backed image block.',
    freedomLevel: 'constrained',
    editableSurfaces: ['media', 'attrs'],
    semanticOperations: ['review_image_asset'],
    compilesTo: ['reconcile_media', 'update_attrs'],
    requiredEvidence: [...baseEvidence, 'media_reconciliation'],
    applyPolicy: draftOnlyPolicy('Image changes require asset reconciliation before any draft patch.'),
    previewPolicy: previewRequired('Image renders from a real WordPress attachment.', 'Alt text and dimensions are preserved or reviewed.'),
    guardrails: [
      'Do not invent media IDs.',
      'Do not replace production media with placeholders.',
      'Preserve existing image unless the brief explicitly requests a replacement.'
    ],
    exampleIntent: 'Review whether this image still supports the section and propose an alt-text improvement.'
  },
  {
    blockName: 'core/embed',
    semanticKind: 'media_embed',
    agentRole: 'oEmbed/video source such as YouTube.',
    freedomLevel: 'constrained',
    editableSurfaces: ['attrs', 'media'],
    semanticOperations: ['review_embed_source'],
    compilesTo: ['reconcile_media', 'update_attrs'],
    requiredEvidence: [...baseEvidence, 'media_reconciliation', 'link_destination_review'],
    applyPolicy: draftOnlyPolicy('Embed updates require validated source URL and preview readback.'),
    previewPolicy: previewRequired('Embed resolves in WordPress preview.', 'Provider/source URL is approved.'),
    guardrails: ['Do not invent video URLs.', 'Preserve existing embeds unless the refresh brief explicitly changes them.'],
    exampleIntent: 'Check whether this YouTube embed is still current before recommending a replacement.'
  },
  {
    blockName: 'core/group',
    semanticKind: 'layout_group',
    agentRole: 'Native grouping for related editorial or CTA content.',
    freedomLevel: 'constrained',
    editableSurfaces: ['children', 'attrs', 'structure'],
    semanticOperations: ['adjust_layout_settings'],
    compilesTo: ['preserve', 'update_attrs'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('Group structure changes need a reviewed structure diff and draft preview.'),
    previewPolicy: previewRequired('Child content remains in expected order.', 'Layout does not create mobile overflow.'),
    guardrails: ['Prefer native grouping over custom HTML.', 'Do not use group blocks as CSS hacks.'],
    exampleIntent: 'Preserve this group while refreshing child copy only.'
  },
  {
    blockName: 'core/columns',
    semanticKind: 'layout_columns',
    agentRole: 'Side-by-side comparison or evidence layout.',
    freedomLevel: 'constrained',
    editableSurfaces: ['children', 'attrs', 'structure'],
    semanticOperations: ['adjust_layout_settings'],
    compilesTo: ['preserve', 'update_attrs'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('Column layout changes require mobile preview and reviewed reading order.'),
    previewPolicy: previewRequired('Columns stack coherently on mobile.', 'Each column keeps its intended meaning.'),
    guardrails: ['Use only when side-by-side comparison helps.', 'Do not reorder columns without a structure plan.'],
    exampleIntent: 'Keep the two-column comparison but tighten the text in each column.'
  },
  {
    blockName: 'core/column',
    semanticKind: 'layout_columns',
    agentRole: 'Child lane inside a columns layout.',
    freedomLevel: 'constrained',
    editableSurfaces: ['children', 'attrs'],
    semanticOperations: ['adjust_layout_settings'],
    compilesTo: ['preserve', 'update_attrs'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('Column child changes inherit the parent columns preview requirement.'),
    previewPolicy: previewRequired('Column child content remains readable after stacking.'),
    guardrails: ['Patch child text blocks when possible.', 'Do not detach from parent columns without a structure plan.']
  },
  {
    blockName: 'core/buttons',
    semanticKind: 'conversion_cta',
    agentRole: 'CTA button group for governed conversion moments.',
    freedomLevel: 'constrained',
    editableSurfaces: ['children', 'link', 'attrs'],
    semanticOperations: ['refresh_cta'],
    compilesTo: ['preserve', 'review_link', 'update_attrs'],
    requiredEvidence: [...baseEvidence, 'cta_target', 'link_destination_review'],
    applyPolicy: draftOnlyPolicy('CTA changes require reviewed destination and campaign/HubSpot intent.'),
    previewPolicy: previewRequired('CTA label and link match the approved offer.', 'Button remains readable and clickable.'),
    guardrails: ['Never publish unreviewed CTA links.', 'Prefer existing CTA target unless the brief changes the offer.'],
    exampleIntent: 'Review this CTA against the current HubSpot campaign target.'
  },
  {
    blockName: 'core/button',
    semanticKind: 'conversion_cta',
    agentRole: 'Individual CTA button inside a button group.',
    freedomLevel: 'constrained',
    editableSurfaces: ['text', 'link', 'attrs'],
    semanticOperations: ['refresh_cta'],
    compilesTo: ['update_text', 'review_link', 'update_attrs'],
    requiredEvidence: [...baseEvidence, 'cta_target', 'link_destination_review'],
    applyPolicy: draftOnlyPolicy('Button text/link updates require destination review and draft preview.'),
    previewPolicy: previewRequired('Label fits inside the button.', 'Destination is approved.'),
    guardrails: ['Keep labels short.', 'Do not alter conversion destination without explicit approval.'],
    exampleIntent: 'Make this CTA label more specific without changing the destination.'
  },
  {
    blockName: 'core/separator',
    semanticKind: 'section_break',
    agentRole: 'Visual section break used for rhythm between editorial modules.',
    freedomLevel: 'preserve_only',
    editableSurfaces: ['attrs', 'structure'],
    semanticOperations: ['adjust_layout_settings'],
    compilesTo: ['preserve', 'update_attrs'],
    requiredEvidence: [...baseEvidence],
    applyPolicy: draftOnlyPolicy('Preserve separators unless a structure plan owns section rhythm changes.'),
    previewPolicy: previewRequired('Section rhythm remains intentional.'),
    guardrails: ['Do not use separators instead of headings.', 'Do not delete separators casually in existing posts.']
  },
  {
    blockName: 'core/freeform',
    semanticKind: 'legacy_html',
    agentRole: 'Legacy HTML fragment observed in existing posts.',
    freedomLevel: 'preserve_only',
    editableSurfaces: ['structure'],
    semanticOperations: ['preserve_legacy_html'],
    compilesTo: ['preserve'],
    requiredEvidence: ['fresh_deep_inspection', 'source_fingerprint', 'plugin_serialization_policy'],
    applyPolicy: draftOnlyPolicy('Legacy HTML is preserve-only until a dedicated migration owns conversion.', true),
    previewPolicy: previewRequired('Legacy fragment remains visually unchanged.'),
    guardrails: [
      'Do not generate new core/freeform blocks.',
      'Do not convert legacy HTML aggressively during refresh.',
      'Patch around it unless a migration task owns the change.'
    ],
    exampleIntent: 'Preserve this legacy fragment and refresh the Gutenberg blocks around it.'
  },
  {
    blockName: 'essential-blocks/testimonial',
    semanticKind: 'third_party_module',
    agentRole: 'Third-party testimonial module observed in richer posts.',
    freedomLevel: 'preserve_only',
    editableSurfaces: ['structure'],
    semanticOperations: ['preserve_third_party_module'],
    compilesTo: ['preserve'],
    requiredEvidence: ['fresh_deep_inspection', 'source_fingerprint', 'plugin_serialization_policy'],
    applyPolicy: draftOnlyPolicy('Third-party blocks stay preserve-only until serialization and plugin behavior are inspected.', true),
    previewPolicy: previewRequired('Third-party module renders unchanged.'),
    guardrails: ['Do not generate until plugin contract is inspected.', 'Preserve existing module by default.']
  }
]

export const getEfeonceGutenbergBlockCapabilityRegistry = (
  options: { generatedAt?: string } = {}
): GutenbergBlockCapabilityRegistry => ({
  contractVersion: 'gutenbergBlockCapabilityRegistry.v1',
  key: 'efeonce_gutenberg_blogpost_capabilities',
  generatedAt: options.generatedAt,
  source: {
    patternCatalog: 'gutenbergBlockPatternCatalog.v1',
    deepInspectionContract: 'contentFactoryPostDeepInspection.v1',
    refreshPlanContract: 'contentFactoryRefreshPlan.v1',
    observedRuntimeSample:
      'WP-CLI read-only samples of recent efeoncepro.com posts plus guided inspection of post 248398 on 2026-06-14'
  },
  entries: EFEONCE_GUTENBERG_BLOCK_CAPABILITIES
})

export const getGutenbergCapabilityForBlock = (blockName: string) =>
  EFEONCE_GUTENBERG_BLOCK_CAPABILITIES.find(entry => entry.blockName === blockName)

export const listGutenbergSemanticOperations = () =>
  Array.from(
    new Set(
      EFEONCE_GUTENBERG_BLOCK_CAPABILITIES.flatMap(entry => entry.semanticOperations)
    )
  ).sort() as GutenbergBlockSemanticOperation[]
