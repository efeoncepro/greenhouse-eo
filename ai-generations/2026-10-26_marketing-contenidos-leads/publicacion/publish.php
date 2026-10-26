<?php
/** Publish the «Marketing de contenidos para generar leads» refresh into 244883, same URL (no slug change, no redirect).
 * Inputs: content HTML, meta JSON (mode dry-run|apply). Writes: title, content, excerpt and Yoast metas (title, description,
 * focus keyword, reading time, Open Graph title and description). The content must equal the private review copy Julio
 * reviewed (252171), with WordPress' emoji entities normalised. Snapshots the post first in _gh_post_refresh_244883_<UTC>.
 * Keeps slug, publication date, categories, tags and featured image (the cover goes later with blog-post-cover-apply.php). */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
[$cf, $mf] = [$args[0] ?? '', $args[1] ?? ''];
foreach ([$cf, $mf] as $f) { if (!is_readable($f)) { WP_CLI::error('Missing inputs.'); } }
$content = file_get_contents($cf); $m = json_decode(file_get_contents($mf), true);
if (!is_array($m) || hash('sha256', $content) !== $m['contentSha256']) { WP_CLI::error('Payload integrity failed.'); }
$apply = ($m['mode'] ?? 'dry-run') === 'apply';
$id = (int) $m['id']; $p = get_post($id); $copy = get_post((int) $m['reviewCopy']);
$emoji = static fn($x) => str_replace(['&#x1f34f;', '&#x1F34F;'], '🍏', (string) $x);
$guard = [
  'published' => $p && $p->post_type === 'post' && $p->post_status === 'publish',
  'slug' => $p && $p->post_name === $m['slug'],
  'modified' => $p && $p->post_modified_gmt === $m['expectModified'],
  'content' => $p && hash('sha256', $p->post_content) === $m['expectContentSha256'],
  'path' => wp_parse_url(get_permalink($id), PHP_URL_PATH) === $m['path'],
  'reviewCopy' => $copy && $copy->post_status === 'private' && (string) get_post_meta($copy->ID, '_eo_review_copy_of', true) === (string) $id,
  'sameAsReviewed' => $copy && $emoji($copy->post_content) === $content,
];
if (!$apply) { echo wp_json_encode(['mode' => 'dry-run', 'guard' => $guard, 'allOk' => !in_array(false, $guard, true)], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL; return; }
if (in_array(false, $guard, true)) { WP_CLI::error('Precondition failed: ' . wp_json_encode($guard)); }
$opt = '_gh_post_refresh_' . $id . '_' . gmdate('Ymd_His');
if (!add_option($opt, ['post' => get_post($id, ARRAY_A), 'meta' => get_post_meta($id), 'permalink' => get_permalink($id)], '', false)) { WP_CLI::error("Snapshot failed: $opt"); }
$cats = wp_get_post_categories($id); $tags = wp_get_post_tags($id, ['fields' => 'ids']); $thumb = get_post_thumbnail_id($id); $date = $p->post_date_gmt;
$r = wp_update_post(wp_slash(['ID' => $id, 'post_title' => $m['title'], 'post_content' => $content, 'post_excerpt' => $m['excerpt']]), true);
if (is_wp_error($r)) { WP_CLI::error('Update failed: ' . $r->get_error_message() . " (snapshot $opt)"); }
$metas = ['_yoast_wpseo_title' => $m['seoTitle'], '_yoast_wpseo_metadesc' => $m['seoDescription'], '_yoast_wpseo_focuskw' => $m['focusKw'],
  '_yoast_wpseo_estimated-reading-time-minutes' => (string) $m['readingMinutes'],
  '_yoast_wpseo_opengraph-title' => $m['ogTitle'], '_yoast_wpseo_opengraph-description' => $m['ogDescription']];
foreach ($metas as $k => $v) { update_post_meta($id, $k, $v); }
clean_post_cache($id);
if (function_exists('YoastSEO')) { YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id, 'post'); }
$a = get_post($id);
$checks = ['status' => $a->post_status === 'publish', 'slug' => $a->post_name === $m['slug'], 'title' => $a->post_title === $m['title'],
  'excerpt' => $a->post_excerpt === $m['excerpt'], 'path' => wp_parse_url(get_permalink($id), PHP_URL_PATH) === $m['path'],
  'date' => $a->post_date_gmt === $date, 'categories' => wp_get_post_categories($id) == $cats, 'tags' => wp_get_post_tags($id, ['fields' => 'ids']) == $tags,
  'thumbnail' => get_post_thumbnail_id($id) == $thumb, 'content' => $emoji($a->post_content) === $content];
foreach ($metas as $k => $v) { $checks[$k] = get_post_meta($id, $k, true) === $v; }
WP_CLI::runcommand('cache flush', ['return' => true]);
echo wp_json_encode(['status' => in_array(false, $checks, true) ? 'readback_mismatch' : 'saved', 'snapshot' => $opt,
  'checks' => $checks, 'modifiedGmt' => $a->post_modified_gmt], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
