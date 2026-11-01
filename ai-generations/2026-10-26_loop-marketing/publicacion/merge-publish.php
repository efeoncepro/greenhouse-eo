<?php
/** Publish the Loop Marketing pillar into 248398 and merge 248483 into it. Inputs: content HTML, meta JSON (mode dry-run|apply).
 * Writes: 248398 title, content, excerpt and Yoast metas (slug unchanged); 248483 to draft (kept, recoverable); one plain 301
 * from 248483's path to 248398. Snapshots both posts first. Does not purge the cache (that runs after the cover). */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
[$cf, $mf] = [$args[0] ?? '', $args[1] ?? ''];
foreach ([$cf, $mf] as $f) { if (!is_readable($f)) { WP_CLI::error('Missing inputs.'); } }
$content = file_get_contents($cf); $m = json_decode(file_get_contents($mf), true);
if (!is_array($m) || hash('sha256', $content) !== $m['contentSha256']) { WP_CLI::error('Payload integrity failed.'); }
$apply = ($m['mode'] ?? 'dry-run') === 'apply';
$id = (int) $m['id']; $mid = (int) $m['mergedId'];
$p = get_post($id); $q = get_post($mid);
$mgr = (class_exists('WPSEO_Redirect_Manager') && class_exists('WPSEO_Redirect')) ? new WPSEO_Redirect_Manager() : null;
$oldPath = $m['oldPath']; $target = $m['targetPath'];
$has = static fn($path) => $mgr && ($mgr->get_redirect($path) || $mgr->get_redirect(untrailingslashit($path)));
$guard = [
  'pillarPublished' => $p && $p->post_type === 'post' && $p->post_status === 'publish',
  'pillarSlug' => $p && $p->post_name === $m['slug'],
  'pillarModified' => $p && $p->post_modified_gmt === $m['expectModified'],
  'pillarContent' => $p && hash('sha256', $p->post_content) === $m['expectContentSha256'],
  'pillarYoastTitle' => get_post_meta($id, '_yoast_wpseo_title', true) === $m['expectYoastTitle'],
  'pillarPath' => wp_parse_url(get_permalink($id), PHP_URL_PATH) === $target,
  'mergedPublished' => $q && $q->post_type === 'post' && $q->post_status === 'publish',
  'mergedSlug' => $q && $q->post_name === $m['mergedSlug'],
  'mergedModified' => $q && $q->post_modified_gmt === $m['mergedModified'],
  'mergedContent' => $q && hash('sha256', $q->post_content) === $m['mergedContentSha256'],
  'mergedPath' => wp_parse_url(get_permalink($mid), PHP_URL_PATH) === $oldPath,
  'redirectClasses' => (bool) $mgr,
  'noRedirectAtOrigin' => $mgr && !$has($oldPath),
  'noRedirectAtTarget' => $mgr && !$has($target),
];
if (!$apply) { echo wp_json_encode(['mode' => 'dry-run', 'guard' => $guard, 'allOk' => !in_array(false, $guard, true)], JSON_PRETTY_PRINT) . PHP_EOL; return; }
if (in_array(false, $guard, true)) { WP_CLI::error('Precondition failed: ' . wp_json_encode($guard)); }
$stamp = gmdate('Ymd_His');
$snap = ['_gh_post_refresh_' . $id . '_' . $stamp => $id, '_gh_post_merge_' . $mid . '_' . $stamp => $mid];
foreach ($snap as $opt => $sid) {
  if (!add_option($opt, ['post' => get_post($sid, ARRAY_A), 'meta' => get_post_meta($sid), 'permalink' => get_permalink($sid)], '', false)) { WP_CLI::error("Snapshot failed: $opt"); }
}
$cats = wp_get_post_categories($id); $tags = wp_get_post_tags($id, ['fields' => 'ids']); $thumb = get_post_thumbnail_id($id);
$r = wp_update_post(wp_slash(['ID' => $id, 'post_title' => $m['title'], 'post_content' => $content, 'post_excerpt' => $m['excerpt']]), true);
if (is_wp_error($r)) { WP_CLI::error('Pillar update failed: ' . $r->get_error_message() . ' (snapshots ' . implode(', ', array_keys($snap)) . ')'); }
$metas = ['_yoast_wpseo_title' => $m['seoTitle'], '_yoast_wpseo_metadesc' => $m['seoDescription'], '_yoast_wpseo_focuskw' => $m['focusKw'],
  '_yoast_wpseo_estimated-reading-time-minutes' => (string) $m['readingMinutes']];
foreach ($metas as $k => $v) { update_post_meta($id, $k, $v); }
clean_post_cache($id);
// Merge: 248483 goes to draft (out of the index and the sitemap, recoverable), then its path redirects to the pillar.
$d = wp_update_post(['ID' => $mid, 'post_status' => 'draft'], true);
if (is_wp_error($d)) { WP_CLI::error('Merged post to draft failed: ' . $d->get_error_message()); }
clean_post_cache($mid);
$redirect = $mgr->create_redirect(new WPSEO_Redirect($oldPath, $target, 301, 'plain')) ? 'created' : 'failed';
if (function_exists('YoastSEO')) { foreach ([$id, $mid] as $x) { YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($x, 'post'); } }
$a = get_post($id); $b = get_post($mid); $stored = $mgr->get_redirect($oldPath);
$checks = ['status' => $a->post_status === 'publish', 'slug' => $a->post_name === $m['slug'], 'title' => $a->post_title === $m['title'],
  'excerpt' => $a->post_excerpt === $m['excerpt'], 'path' => wp_parse_url(get_permalink($id), PHP_URL_PATH) === $target,
  'categories' => wp_get_post_categories($id) == $cats, 'tags' => wp_get_post_tags($id, ['fields' => 'ids']) == $tags,
  'thumbnail' => get_post_thumbnail_id($id) == $thumb, 'content' => hash('sha256', $a->post_content) === $m['contentSha256'],
  'mergedDraft' => $b->post_status === 'draft', 'mergedSlugKept' => $b->post_name === $m['mergedSlug'],
  'redirect' => $stored instanceof WPSEO_Redirect && trim($stored->get_target(), '/') === trim($target, '/') && (int) $stored->get_type() === 301];
foreach ($metas as $k => $v) { $checks[$k] = get_post_meta($id, $k, true) === $v; }
WP_CLI::runcommand('cache flush', ['return' => true]);
echo wp_json_encode(['status' => in_array(false, $checks, true) ? 'readback_mismatch' : 'saved', 'snapshots' => array_keys($snap), 'redirect' => $redirect,
  'checks' => $checks, 'modifiedGmt' => $a->post_modified_gmt], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
