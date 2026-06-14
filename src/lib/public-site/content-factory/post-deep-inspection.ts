import type {
  ContentFactoryPostBlockEditability,
  ContentFactoryPostDeepInspection,
  ContentFactoryPostDeepInspectionBlock
} from './contracts'

export const CONTENT_FACTORY_POST_DEEP_INSPECTION_CONTRACT_VERSION =
  'contentFactoryPostDeepInspection.v1' as const

const EDITABILITY_BY_BLOCK: Record<string, ContentFactoryPostBlockEditability> = {
  'core/button': 'safe_attrs_edit',
  'core/buttons': 'preserve_structure',
  'core/column': 'preserve_structure',
  'core/columns': 'preserve_structure',
  'core/embed': 'media_requires_reconcile',
  'core/freeform': 'inspect_only',
  'core/gallery': 'media_requires_reconcile',
  'core/group': 'preserve_structure',
  'core/heading': 'safe_text_edit',
  'core/image': 'media_requires_reconcile',
  'core/list': 'preserve_structure',
  'core/list-item': 'safe_text_edit',
  'core/paragraph': 'safe_text_edit',
  'core/pullquote': 'safe_text_edit',
  'core/quote': 'safe_text_edit',
  'core/separator': 'preserve_structure',
  'core/spacer': 'safe_attrs_edit',
  'yoast-seo/table-of-contents': 'preserve_structure'
}

export const getPostBlockEditability = (blockName: string): ContentFactoryPostBlockEditability =>
  EDITABILITY_BY_BLOCK[blockName] ?? (blockName.startsWith('core/') ? 'inspect_only' : 'inspect_only')

export const getPostBlockRisks = ({
  blockName,
  editability,
  text,
  media
}: Pick<ContentFactoryPostDeepInspectionBlock, 'blockName' | 'editability' | 'text' | 'media'>): string[] => {
  const risks: string[] = []

  if (blockName === 'core/freeform' && text.trim()) {
    risks.push('legacy_freeform_has_content')
  }

  if (!blockName.startsWith('core/') && blockName !== 'yoast-seo/table-of-contents') {
    risks.push('third_party_block_preserve_until_serialization_known')
  }

  if (editability === 'media_requires_reconcile') {
    risks.push('media_refs_must_be_reconciled_before_write')

    if (media?.id && !media.attachmentUrl) {
      risks.push('attachment_url_missing')
    }

    if (media?.id && media.renderedSrc && media.attachmentUrl && !String(media.renderedSrc).includes(String(media.id))) {
      risks.push('media_id_not_visible_in_rendered_src')
    }
  }

  return risks
}

export const summarizePostDeepInspection = (inspection: ContentFactoryPostDeepInspection) => ({
  contractVersion: inspection.contractVersion,
  scannedAt: inspection.scannedAt,
  source: inspection.source,
  post: inspection.post,
  seo: inspection.seo,
  summary: inspection.summary,
  headingOutline: inspection.headingOutline,
  topBlocks: inspection.blocks.slice(0, 80).map(block => ({
    path: block.path,
    depth: block.depth,
    blockName: block.blockName,
    text: block.text,
    editability: block.editability,
    risks: block.risks,
    attrs: block.attrs,
    media: block.media,
    href: block.href
  })),
  mediaIssues: inspection.mediaIssues,
  links: inspection.links.slice(0, 80),
  safetyPolicy: inspection.safetyPolicy
})

export const buildPostDeepInspectionEvalPhp = (postId: number) => {
  if (!Number.isInteger(postId) || postId <= 0) {
    throw new Error('post_id_invalid')
  }

  return `<?php
$post_id = ${postId};
$post = get_post($post_id);

if (!$post) {
  fwrite(STDERR, "post_not_found\\n");
  exit(1);
}

function gh_cf_text($html, $limit = 260) {
  $text = html_entity_decode(trim(wp_strip_all_tags($html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  $text = preg_replace('/\\s+/u', ' ', $text);

  return mb_strlen($text) > $limit ? mb_substr($text, 0, $limit) . '…' : $text;
}

function gh_cf_starts_with($value, $prefix) {
  return substr((string) $value, 0, strlen((string) $prefix)) === (string) $prefix;
}

function gh_cf_selected_attrs($block) {
  $attrs = is_array($block['attrs'] ?? null) ? $block['attrs'] : [];
  $keep = [];
  $keys = [
    'level',
    'columns',
    'linkTo',
    'id',
    'ids',
    'sizeSlug',
    'linkDestination',
    'url',
    'type',
    'providerNameSlug',
    'responsive',
    'className',
    'style',
    'layout',
    'width',
    'height',
    'align',
    'anchor',
    'metadata',
    'textAlign',
    'backgroundColor',
    'fontSize'
  ];

  foreach ($keys as $key) {
    if (array_key_exists($key, $attrs)) {
      $keep[$key] = $attrs[$key];
    }
  }

  return empty($keep) ? (object) [] : $keep;
}

function gh_cf_editability($block_name) {
  $map = [
    'core/button' => 'safe_attrs_edit',
    'core/buttons' => 'preserve_structure',
    'core/column' => 'preserve_structure',
    'core/columns' => 'preserve_structure',
    'core/embed' => 'media_requires_reconcile',
    'core/freeform' => 'inspect_only',
    'core/gallery' => 'media_requires_reconcile',
    'core/group' => 'preserve_structure',
    'core/heading' => 'safe_text_edit',
    'core/image' => 'media_requires_reconcile',
    'core/list' => 'preserve_structure',
    'core/list-item' => 'safe_text_edit',
    'core/paragraph' => 'safe_text_edit',
    'core/pullquote' => 'safe_text_edit',
    'core/quote' => 'safe_text_edit',
    'core/separator' => 'preserve_structure',
    'core/spacer' => 'safe_attrs_edit',
    'yoast-seo/table-of-contents' => 'preserve_structure',
  ];

  return $map[$block_name] ?? 'inspect_only';
}

function gh_cf_extract_href($html) {
  if (preg_match('/<a\\s+[^>]*href=["\\']([^"\\']+)["\\']/i', $html, $match)) {
    return $match[1];
  }

  return null;
}

function gh_cf_extract_img_src($html) {
  if (preg_match('/<img\\s+[^>]*src=["\\']([^"\\']+)["\\']/i', $html, $match)) {
    return $match[1];
  }

  return null;
}

function gh_cf_media_payload($block_name, $block, $inner_html) {
  $attrs = is_array($block['attrs'] ?? null) ? $block['attrs'] : [];

  if (!in_array($block_name, ['core/image', 'core/gallery', 'core/embed', 'core/video'], true)) {
    return null;
  }

  $id = isset($attrs['id']) ? intval($attrs['id']) : null;
  $attachment_url = $id ? wp_get_attachment_url($id) : null;

  return [
    'id' => $id,
    'attachmentUrl' => $attachment_url,
    'renderedSrc' => gh_cf_extract_img_src($inner_html),
    'alt' => $id ? get_post_meta($id, '_wp_attachment_image_alt', true) : '',
    'width' => $attrs['width'] ?? null,
    'height' => $attrs['height'] ?? null,
  ];
}

function gh_cf_risks($block_name, $editability, $text, $media) {
  $risks = [];

  if ($block_name === 'core/freeform' && trim($text) !== '') {
    $risks[] = 'legacy_freeform_has_content';
  }

  if (!gh_cf_starts_with($block_name, 'core/') && $block_name !== 'yoast-seo/table-of-contents') {
    $risks[] = 'third_party_block_preserve_until_serialization_known';
  }

  if ($editability === 'media_requires_reconcile') {
    $risks[] = 'media_refs_must_be_reconciled_before_write';

    if (is_array($media) && !empty($media['id']) && empty($media['attachmentUrl'])) {
      $risks[] = 'attachment_url_missing';
    }
  }

  return $risks;
}

function gh_cf_walk_blocks($blocks, $prefix = '', &$flat = [], $depth = 0) {
  foreach ($blocks as $index => $block) {
    $path = $prefix === '' ? (string) $index : $prefix . '.' . $index;
    $block_name = $block['blockName'] ?: 'core/freeform';
    $inner_html = $block['innerHTML'] ?? '';
    $attrs = gh_cf_selected_attrs($block);
    $text = gh_cf_text($inner_html);
    $editability = gh_cf_editability($block_name);
    $media = gh_cf_media_payload($block_name, $block, $inner_html);
    $entry = [
      'path' => $path,
      'depth' => $depth,
      'blockName' => $block_name,
      'attrs' => $attrs,
      'text' => $text,
      'innerBlockCount' => is_array($block['innerBlocks'] ?? null) ? count($block['innerBlocks']) : 0,
      'fingerprint' => hash('sha256', wp_json_encode([
        'path' => $path,
        'blockName' => $block_name,
        'attrs' => $attrs,
        'text' => $text,
      ])),
      'editability' => $editability,
      'risks' => gh_cf_risks($block_name, $editability, $text, $media),
    ];
    $href = gh_cf_extract_href($inner_html);

    if (is_array($media)) {
      $entry['media'] = $media;
    }

    if ($href) {
      $entry['href'] = $href;
    }

    $flat[] = $entry;

    if (!empty($block['innerBlocks'])) {
      gh_cf_walk_blocks($block['innerBlocks'], $path, $flat, $depth + 1);
    }
  }
}

function gh_cf_link_kind($href) {
  if (gh_cf_starts_with($href, '#')) {
    return 'internal_anchor';
  }

  if (gh_cf_starts_with($href, home_url())) {
    return 'internal_url';
  }

  if (preg_match('/^https?:\\/\\//i', $href)) {
    return 'external_url';
  }

  return 'unknown';
}

$blocks = parse_blocks($post->post_content);
$flat = [];
gh_cf_walk_blocks($blocks, '', $flat);

$counts = [];
foreach ($flat as $entry) {
  $counts[$entry['blockName']] = ($counts[$entry['blockName']] ?? 0) + 1;
}
ksort($counts);

$heading_outline = [];
$non_empty_freeform_count = 0;
$media_issues = [];
$max_depth = 0;

foreach ($flat as $entry) {
  $max_depth = max($max_depth, intval($entry['depth']));

  if ($entry['blockName'] === 'core/heading') {
    $heading_outline[] = [
      'path' => $entry['path'],
      'level' => is_array($entry['attrs']) && isset($entry['attrs']['level']) ? intval($entry['attrs']['level']) : 2,
      'text' => $entry['text'],
    ];
  }

  if ($entry['blockName'] === 'core/freeform' && trim($entry['text']) !== '') {
    $non_empty_freeform_count += 1;
  }

  if (isset($entry['media']) && is_array($entry['media'])) {
    $media = $entry['media'];

    if (!empty($media['id']) && empty($media['attachmentUrl'])) {
      $media_issues[] = [
        'path' => $entry['path'],
        'blockName' => $entry['blockName'],
        'code' => 'attachment_url_missing',
        'message' => 'Block references a WordPress attachment id but wp_get_attachment_url() returned empty.',
      ];
    }

    if (empty($media['id']) && empty($media['renderedSrc'])) {
      $media_issues[] = [
        'path' => $entry['path'],
        'blockName' => $entry['blockName'],
        'code' => 'rendered_src_missing',
        'message' => 'Media block has no attachment id and no rendered image source in innerHTML.',
      ];
    }
  }
}

$links = [];
if (preg_match_all('/<a\\s+[^>]*href=["\\']([^"\\']+)["\\'][^>]*>(.*?)<\\/a>/is', $post->post_content, $matches, PREG_SET_ORDER)) {
  foreach ($matches as $match) {
    $href = $match[1];
    $links[] = [
      'href' => $href,
      'text' => gh_cf_text($match[2], 140),
      'kind' => gh_cf_link_kind($href),
    ];
  }
}

$payload = [
  'contractVersion' => 'contentFactoryPostDeepInspection.v1',
  'scannedAt' => gmdate('c'),
  'source' => 'wp_cli_parse_blocks',
  'safetyPolicy' => [
    'writesWordPressContent' => false,
    'publishesContent' => false,
    'clearsCache' => false,
    'createsBackup' => false,
    'sendsSecretsToOutput' => false,
  ],
  'post' => [
    'id' => $post->ID,
    'type' => $post->post_type,
    'status' => $post->post_status,
    'slug' => $post->post_name,
    'title' => get_the_title($post),
    'modified' => get_post_modified_time('c', false, $post),
    'permalink' => get_permalink($post),
    'contentLength' => strlen($post->post_content),
  ],
  'seo' => [
    'yoastTitle' => get_post_meta($post->ID, '_yoast_wpseo_title', true),
    'yoastDescription' => get_post_meta($post->ID, '_yoast_wpseo_metadesc', true),
    'primaryCategory' => get_post_meta($post->ID, '_yoast_wpseo_primary_category', true),
  ],
  'summary' => [
    'totalBlocks' => count($flat),
    'topLevelBlocks' => count($blocks),
    'counts' => $counts,
    'maxDepth' => $max_depth,
    'linkCount' => count($links),
    'nonEmptyFreeformCount' => $non_empty_freeform_count,
    'mediaIssueCount' => count($media_issues),
  ],
  'headingOutline' => $heading_outline,
  'blocks' => $flat,
  'links' => $links,
  'mediaIssues' => $media_issues,
  'editabilityLegend' => [
    'safe_text_edit' => 'Agent may propose text changes while preserving block type, path and surrounding structure.',
    'safe_attrs_edit' => 'Agent may propose constrained attribute changes after validating the native block setting.',
    'media_requires_reconcile' => 'Agent must reconcile WordPress media id, rendered src, alt text and source brief before write.',
    'preserve_structure' => 'Agent should preserve structure and patch child blocks or attrs only with explicit intent.',
    'inspect_only' => 'Agent should preserve by default until serialization/plugin behavior is understood.',
  ],
];

echo wp_json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
`
}
