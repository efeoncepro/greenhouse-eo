<?php
/** Publish the Pipeline refresh into 246045 and move its URL. Inputs: content HTML, meta JSON (mode dry-run|apply).
 * Writes: title, content, excerpt, slug (→ pipeline-de-ventas) and Yoast metas; one plain 301 from the old path to the new one.
 * Snapshots the post first in _gh_post_refresh_246045_<UTC>. Keeps publication date, categories, tags and featured image. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
[$cf, $mf] = [$args[0] ?? '', $args[1] ?? ''];
foreach ([$cf, $mf] as $f) { if (!is_readable($f)) { WP_CLI::error('Missing inputs.'); } }
$content = file_get_contents($cf); $m = json_decode(file_get_contents($mf), true);
if (!is_array($m) || hash('sha256', $content) !== $m['contentSha256']) { WP_CLI::error('Payload integrity failed.'); }
$apply = ($m['mode'] ?? 'dry-run') === 'apply';
$id = (int) $m['id']; $p = get_post($id);
$mgr = (class_exists('WPSEO_Redirect_Manager') && class_exists('WPSEO_Redirect')) ? new WPSEO_Redirect_Manager() : null;
$old = $m['oldPath']; $new = $m['newPath'];
$get = static fn($x) => $mgr ? ($mgr->get_redirect($x) ?: $mgr->get_redirect(untrailingslashit($x)) ?: $mgr->get_redirect(ltrim(untrailingslashit($x), '/'))) : null;
$norm = static fn($x) => trim((string) $x, '/');
$pointingToOld = [];
if ($mgr) { foreach ($mgr->get_all_redirects() as $r) { if ($norm($r->get_target()) === $norm($old)) { $pointingToOld[] = $r->get_origin(); } } }
$guard = [
  'published' => $p && $p->post_type === 'post' && $p->post_status === 'publish',
  'slug' => $p && $p->post_name === $m['oldSlug'],
  'modified' => $p && $p->post_modified_gmt === $m['expectModified'],
  'content' => $p && hash('sha256', $p->post_content) === $m['expectContentSha256'],
  'path' => wp_parse_url(get_permalink($id), PHP_URL_PATH) === $old,
  'newPathFree' => !get_page_by_path($m['newSlug'], OBJECT, ['post', 'page']),
  'redirectClasses' => (bool) $mgr,
  'noRedirectAtOld' => $mgr && !$get($old),
  'noRedirectAtNew' => $mgr && !$get($new),
  'noRedirectPointsToOld' => $mgr && !$pointingToOld,
];
if (!$apply) { echo wp_json_encode(['mode' => 'dry-run', 'guard' => $guard, 'pointingToOld' => $pointingToOld, 'allOk' => !in_array(false, $guard, true)], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL; return; }
if (in_array(false, $guard, true)) { WP_CLI::error('Precondition failed: ' . wp_json_encode($guard)); }
$opt = '_gh_post_refresh_' . $id . '_' . gmdate('Ymd_His');
if (!add_option($opt, ['post' => get_post($id, ARRAY_A), 'meta' => get_post_meta($id), 'permalink' => get_permalink($id)], '', false)) { WP_CLI::error("Snapshot failed: $opt"); }
$cats = wp_get_post_categories($id); $tags = wp_get_post_tags($id, ['fields' => 'ids']); $thumb = get_post_thumbnail_id($id); $date = $p->post_date_gmt;
$r = wp_update_post(wp_slash(['ID' => $id, 'post_title' => $m['title'], 'post_content' => $content, 'post_excerpt' => $m['excerpt'], 'post_name' => $m['newSlug']]), true);
if (is_wp_error($r)) { WP_CLI::error('Update failed: ' . $r->get_error_message() . " (snapshot $opt)"); }
$metas = ['_yoast_wpseo_title' => $m['seoTitle'], '_yoast_wpseo_metadesc' => $m['seoDescription'], '_yoast_wpseo_focuskw' => $m['focusKw'],
  '_yoast_wpseo_estimated-reading-time-minutes' => (string) $m['readingMinutes']];
foreach ($metas as $k => $v) { update_post_meta($id, $k, $v); }
clean_post_cache($id);
// One plain 301 old → new. Yoast Premium may already have created it on the slug change: reuse it only if it points to the new path.
$existing = $get($old);
if ($existing) { $redirect = $norm($existing->get_target()) === $norm($new) ? 'existing-ok' : 'existing-other:' . $existing->get_target(); }
else { $redirect = $mgr->create_redirect(new WPSEO_Redirect($old, $new, 301, 'plain')) ? 'created' : 'failed'; }
if (function_exists('YoastSEO')) { YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id, 'post'); }
$a = get_post($id); $stored = $get($old);
$checks = ['status' => $a->post_status === 'publish', 'slug' => $a->post_name === $m['newSlug'], 'title' => $a->post_title === $m['title'],
  'excerpt' => $a->post_excerpt === $m['excerpt'], 'path' => wp_parse_url(get_permalink($id), PHP_URL_PATH) === $new,
  'date' => $a->post_date_gmt === $date, 'categories' => wp_get_post_categories($id) == $cats, 'tags' => wp_get_post_tags($id, ['fields' => 'ids']) == $tags,
  'thumbnail' => get_post_thumbnail_id($id) == $thumb, 'content' => hash('sha256', $a->post_content) === $m['contentSha256']
    || str_replace(['&#x1f34f;', '&#x1F34F;'], '🍏', $a->post_content) === $content,
  'redirect' => $stored instanceof WPSEO_Redirect && $norm($stored->get_target()) === $norm($new) && (int) $stored->get_type() === 301];
foreach ($metas as $k => $v) { $checks[$k] = get_post_meta($id, $k, true) === $v; }
WP_CLI::runcommand('cache flush', ['return' => true]);
echo wp_json_encode(['status' => in_array(false, $checks, true) ? 'readback_mismatch' : 'saved', 'snapshot' => $opt, 'redirect' => $redirect,
  'checks' => $checks, 'modifiedGmt' => $a->post_modified_gmt], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
