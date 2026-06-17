#!/usr/bin/env tsx
/**
 * High-level editorial operations for Efeonce WordPress posts.
 *
 * MVP scope: clone a live Gutenberg post to a private draft and replace one
 * pullquote selected by nearby heading context. The published source is never
 * mutated.
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

type CliOptions = {
  command: 'edit-pullquote' | null
  postId: number | null
  postUrl: string | null
  nearHeading: string | null
  replacement: string | null
  manifestId: string | null
  slug: string | null
  status: 'private' | 'draft'
  apply: boolean
  json: boolean
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    command: null,
    postId: null,
    postUrl: null,
    nearHeading: null,
    replacement: null,
    manifestId: null,
    slug: null,
    status: 'private',
    apply: false,
    json: false,
    write: false,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (i === 0 && arg === 'edit-pullquote') {
      options.command = 'edit-pullquote'
      continue
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--post-id') {
      const value = Number(normalizedArgv[i + 1])

      if (!Number.isInteger(value) || value <= 0) throw new Error('--post-id requires a positive integer')
      options.postId = value
      i += 1
      continue
    }

    if (arg === '--post-url') {
      options.postUrl = normalizedArgv[i + 1] ?? null
      if (!options.postUrl) throw new Error('--post-url requires a value')
      i += 1
      continue
    }

    if (arg === '--near-heading') {
      options.nearHeading = normalizedArgv[i + 1] ?? null
      if (!options.nearHeading) throw new Error('--near-heading requires a value')
      i += 1
      continue
    }

    if (arg === '--replacement') {
      options.replacement = normalizedArgv[i + 1] ?? null
      if (!options.replacement) throw new Error('--replacement requires a value')
      i += 1
      continue
    }

    if (arg === '--manifest-id') {
      options.manifestId = normalizedArgv[i + 1] ?? null
      if (!options.manifestId) throw new Error('--manifest-id requires a value')
      i += 1
      continue
    }

    if (arg === '--slug') {
      options.slug = normalizedArgv[i + 1] ?? null
      if (!options.slug) throw new Error('--slug requires a value')
      i += 1
      continue
    }

    if (arg === '--draft') {
      options.status = 'draft'
      continue
    }

    if (arg === '--private') {
      options.status = 'private'
      continue
    }

    if (arg === '--apply') {
      options.apply = true
      continue
    }

    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--write') {
      options.write = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:content-factory:post-tool -- edit-pullquote --post-url https://efeoncepro.com/... --near-heading "El funnel = linealidad muerta" --replacement "..." --apply --write

Commands:
  edit-pullquote  Clone a Gutenberg post to draft/private and replace one core/pullquote by heading context.

Safety:
  Dry-run by default. Use --apply to create a draft/private clone. The published source is never updated.`)
}

const phpString = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

const buildEvalPhp = (options: CliOptions) => `<?php
$params = json_decode('${phpString(
  JSON.stringify({
    postId: options.postId,
    postUrl: options.postUrl,
    nearHeading: options.nearHeading,
    replacement: options.replacement,
    manifestId: options.manifestId,
    slug: options.slug,
    status: options.status,
    apply: options.apply
  })
)}', true);
$params = json_decode($params, true);

function gh_cf_post_tool_finish($payload, $exit_code = 0) {
  echo wp_json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
  exit($exit_code);
}

function gh_cf_post_tool_text($html) {
  $text = html_entity_decode(trim(wp_strip_all_tags((string) $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  return preg_replace('/\\s+/u', ' ', $text);
}

function gh_cf_post_tool_norm($value) {
  $value = remove_accents((string) $value);
  $value = strtolower($value);
  $value = preg_replace('/[^a-z0-9]+/u', ' ', $value);
  return trim(preg_replace('/\\s+/u', ' ', $value));
}

function gh_cf_post_tool_block_name($block) {
  return !empty($block['blockName']) ? (string) $block['blockName'] : 'core/freeform';
}

function gh_cf_post_tool_flatten($blocks, $prefix, &$flat) {
  foreach ($blocks as $index => $block) {
    if (!is_array($block)) {
      continue;
    }

    $path = $prefix === '' ? (string) $index : $prefix . '.' . $index;
    $inner_html = (string) ($block['innerHTML'] ?? '');
    $flat[] = [
      'path' => $path,
      'blockName' => gh_cf_post_tool_block_name($block),
      'text' => gh_cf_post_tool_text($inner_html),
      'innerHTML' => $inner_html,
    ];

    if (!empty($block['innerBlocks']) && is_array($block['innerBlocks'])) {
      gh_cf_post_tool_flatten($block['innerBlocks'], $path, $flat);
    }
  }
}

function gh_cf_post_tool_set_block_at_path(&$blocks, $path, $replacement_block) {
  $parts = array_map('intval', explode('.', (string) $path));
  $cursor =& $blocks;

  foreach ($parts as $depth => $index) {
    if (!isset($cursor[$index]) || !is_array($cursor[$index])) {
      return false;
    }

    if ($depth === count($parts) - 1) {
      $cursor[$index] = $replacement_block;
      return true;
    }

    if (!isset($cursor[$index]['innerBlocks']) || !is_array($cursor[$index]['innerBlocks'])) {
      return false;
    }

    $cursor =& $cursor[$index]['innerBlocks'];
  }

  return false;
}

function gh_cf_post_tool_patch_text_block($block, $replacement) {
  $block_name = gh_cf_post_tool_block_name($block);
  $inner_html = (string) ($block['innerHTML'] ?? '');
  $escaped = esc_html((string) $replacement);

  if ($block_name !== 'core/pullquote') {
    return new WP_Error('unsupported_block', 'Only core/pullquote is supported by this MVP.');
  }

  if (preg_match('/<p\\b[^>]*>.*?<\\/p>/is', $inner_html)) {
    $patched_html = preg_replace('/<p\\b([^>]*)>.*?<\\/p>/is', '<p$1>' . $escaped . '</p>', $inner_html, 1);
  } else {
    $patched_html = '<figure class="wp-block-pullquote"><blockquote><p>' . $escaped . '</p></blockquote></figure>';
  }

  $block['innerHTML'] = $patched_html;
  $block['innerContent'] = [$patched_html];

  return $block;
}

function gh_cf_post_tool_copy_context($source_post_id, $draft_post_id) {
  $thumbnail_id = get_post_thumbnail_id($source_post_id);

  if ($thumbnail_id) {
    set_post_thumbnail($draft_post_id, $thumbnail_id);
  }

  foreach (get_object_taxonomies('post') as $taxonomy) {
    $term_ids = wp_get_object_terms($source_post_id, $taxonomy, ['fields' => 'ids']);

    if (!is_wp_error($term_ids)) {
      wp_set_object_terms($draft_post_id, array_map('intval', $term_ids), $taxonomy);
    }
  }

  foreach (['_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_primary_category'] as $meta_key) {
    $value = get_post_meta($source_post_id, $meta_key, true);

    if ($value !== '') {
      update_post_meta($draft_post_id, $meta_key, $value);
    }
  }
}

$post_id = intval($params['postId'] ?? 0);
if ($post_id <= 0 && !empty($params['postUrl'])) {
  $post_id = url_to_postid((string) $params['postUrl']);
}

if ($post_id <= 0) {
  gh_cf_post_tool_finish(['ok' => false, 'code' => 'post_not_resolved', 'message' => 'Could not resolve a WordPress post id.'], 1);
}

$post = get_post($post_id);
if (!$post || $post->post_type !== 'post') {
  gh_cf_post_tool_finish(['ok' => false, 'code' => 'post_not_found', 'postId' => $post_id], 1);
}

$near_heading = (string) ($params['nearHeading'] ?? '');
$replacement = trim((string) ($params['replacement'] ?? ''));
if ($replacement === '') {
  gh_cf_post_tool_finish(['ok' => false, 'code' => 'replacement_required'], 1);
}

$blocks = parse_blocks($post->post_content);
$flat = [];
gh_cf_post_tool_flatten($blocks, '', $flat);

$near_norm = gh_cf_post_tool_norm($near_heading);
$last_heading = null;
$candidates = [];

foreach ($flat as $entry) {
  if ($entry['blockName'] === 'core/heading') {
    $last_heading = [
      'path' => $entry['path'],
      'text' => $entry['text'],
      'norm' => gh_cf_post_tool_norm($entry['text']),
    ];
    continue;
  }

  if ($entry['blockName'] === 'core/pullquote') {
    $heading_match = $near_norm === '' || ($last_heading && strpos($last_heading['norm'], $near_norm) !== false);
    $candidates[] = [
      'path' => $entry['path'],
      'text' => $entry['text'],
      'nearHeading' => $last_heading ? ['path' => $last_heading['path'], 'text' => $last_heading['text']] : null,
      'matchesNearHeading' => $heading_match,
    ];
  }
}

$matches = array_values(array_filter($candidates, function ($candidate) {
  return !empty($candidate['matchesNearHeading']);
}));

if (count($matches) !== 1) {
  gh_cf_post_tool_finish([
    'ok' => false,
    'code' => count($matches) === 0 ? 'pullquote_not_found' : 'pullquote_ambiguous',
    'message' => 'Expected exactly one pullquote for the provided heading context.',
    'source' => ['postId' => $post->ID, 'title' => get_the_title($post), 'status' => $post->post_status],
    'nearHeading' => $near_heading,
    'candidates' => $candidates,
  ], 1);
}

$target = $matches[0];
$target_block = null;
foreach ($flat as $entry) {
  if ($entry['path'] === $target['path']) {
    $target_block = $entry;
    break;
  }
}

$target_parts = array_map('intval', explode('.', (string) $target['path']));
$cursor = $blocks;
foreach ($target_parts as $depth => $index) {
  if (!isset($cursor[$index]) || !is_array($cursor[$index])) {
    $target_block = null;
    break;
  }

  if ($depth === count($target_parts) - 1) {
    $target_block = $cursor[$index];
    break;
  }

  $cursor = $cursor[$index]['innerBlocks'] ?? [];
}

if ($target_block === null) {
  gh_cf_post_tool_finish(['ok' => false, 'code' => 'target_block_missing', 'target' => $target], 1);
}

$patched_block = gh_cf_post_tool_patch_text_block($target_block, $replacement);
if (is_wp_error($patched_block)) {
  gh_cf_post_tool_finish(['ok' => false, 'code' => $patched_block->get_error_code(), 'message' => $patched_block->get_error_message()], 1);
}

if (!gh_cf_post_tool_set_block_at_path($blocks, $target['path'], $patched_block)) {
  gh_cf_post_tool_finish(['ok' => false, 'code' => 'target_block_writeback_failed', 'target' => $target], 1);
}

$generated_at = gmdate('c');
$manifest_id = sanitize_key((string) ($params['manifestId'] ?? ''));
if ($manifest_id === '') {
  $manifest_id = 'content-factory-editorial-' . $post->ID . '-' . gmdate('YmdHis');
}

$status = sanitize_key((string) ($params['status'] ?? 'private'));
if (!in_array($status, ['private', 'draft'], true)) {
  $status = 'private';
}

$slug = sanitize_title((string) ($params['slug'] ?? ''));
if ($slug === '') {
  $slug = sanitize_title($post->post_name . '-gh-editorial-' . gmdate('YmdHis'));
}

$result = [
  'ok' => true,
  'contractVersion' => 'publicSiteEditorialPostTool.v1',
  'generatedAt' => $generated_at,
  'mode' => !empty($params['apply']) ? 'apply_private_clone' : 'dry_run',
  'modifiesPublishedSource' => false,
  'operation' => 'edit_pullquote',
  'source' => [
    'postId' => $post->ID,
    'title' => get_the_title($post),
    'status' => $post->post_status,
    'slug' => $post->post_name,
    'permalink' => get_permalink($post),
  ],
  'selection' => $target,
  'replacement' => $replacement,
  'draft' => null,
  'candidates' => $candidates,
];

if (empty($params['apply'])) {
  gh_cf_post_tool_finish($result);
}

$draft_id = wp_insert_post([
  'post_type' => 'post',
  'post_status' => $status,
  'post_title' => $post->post_title,
  'post_name' => $slug,
  'post_excerpt' => $post->post_excerpt,
  'post_content' => serialize_blocks($blocks),
  'post_author' => get_current_user_id(),
], true);

if (is_wp_error($draft_id)) {
  gh_cf_post_tool_finish(['ok' => false, 'code' => $draft_id->get_error_code(), 'message' => $draft_id->get_error_message()], 1);
}

gh_cf_post_tool_copy_context($post->ID, $draft_id);
update_post_meta($draft_id, '_greenhouse_manifest_id', $manifest_id);
update_post_meta($draft_id, '_greenhouse_source_post_id', (string) $post->ID);
update_post_meta($draft_id, '_greenhouse_editorial_operation', wp_json_encode([
  'operation' => 'edit_pullquote',
  'targetPath' => $target['path'],
  'nearHeading' => $near_heading,
  'generatedAt' => $generated_at,
]));

$result['draft'] = [
  'postId' => $draft_id,
  'status' => get_post_status($draft_id),
  'slug' => get_post_field('post_name', $draft_id),
  'editUrl' => get_edit_post_link($draft_id, ''),
  'previewUrl' => get_preview_post_link($draft_id),
  'manifestId' => $manifest_id,
];

gh_cf_post_tool_finish($result);
`

const runWpCli = (options: CliOptions) => {
  const tempDir = mkdtempSync(join(tmpdir(), 'greenhouse-post-tool-'))
  const evalFile = join(tempDir, 'content-factory-post-tool.php')

  try {
    writeFileSync(evalFile, buildEvalPhp(options))

    const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/public-website/wpcli-remote.ts', '--eval-file', evalFile], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`

    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`wp_cli_exit_${result.status}: ${output.slice(0, 4000).trim()}`)

    const markerIndex = output.indexOf('"contractVersion"')
    const jsonStart = markerIndex >= 0 ? output.lastIndexOf('{', markerIndex) : output.indexOf('{')

    if (jsonStart < 0) throw new Error(`wp_cli_output_missing_json: ${output.slice(0, 1000)}`)

    return JSON.parse(output.slice(jsonStart))
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

const writeEvidence = (result: any) => {
  const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
  const generatedAt = String(result.generatedAt ?? new Date().toISOString()).replace(/[:.]/g, '-')
  const postId = Number(result.source?.postId ?? 0) || 'unknown'
  const outputPath = join(reportsRoot, `post-tool-${postId}-${generatedAt}.json`)

  mkdirSync(reportsRoot, { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)

  return outputPath
}

const summarize = (result: any) => ({
  ok: result.ok,
  contractVersion: result.contractVersion,
  generatedAt: result.generatedAt,
  mode: result.mode,
  modifiesPublishedSource: result.modifiesPublishedSource,
  operation: result.operation,
  source: result.source,
  selection: result.selection,
  draft: result.draft
})

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    
return
  }

  if (options.command !== 'edit-pullquote') throw new Error('Command is required: edit-pullquote')
  if (!options.postId && !options.postUrl) throw new Error('--post-id or --post-url is required')
  if (!options.replacement) throw new Error('--replacement is required')

  const result = runWpCli(options)

  if (options.write) {
    console.log(`Wrote Public Site editorial post tool evidence: ${writeEvidence(result)}`)
  }

  console.log(JSON.stringify(options.json ? result : summarize(result), null, 2))
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:post-tool failed: ${message}`)
  process.exit(1)
}
