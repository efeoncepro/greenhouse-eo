<?php
/** Guarded two-file release for the approved HubSpot consent bridge. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
if (!current_user_can('activate_plugins')) { WP_CLI::error('Plugin activation permission required.'); }
if (home_url('/') !== 'https://efeoncepro.com/') { WP_CLI::error('Wrong WordPress site.'); }
if (count($args ?? array()) !== 2) { WP_CLI::error('Expected ZIP and manifest.'); }
$manifest = json_decode(file_get_contents($args[1]), true);
if (($manifest['contract'] ?? '') !== 'efeonce-hubspot-consent-release.v1' || count($manifest['files'] ?? array()) !== 2) { WP_CLI::error('Invalid consent release manifest.'); }
$zip = new ZipArchive();
if (true !== $zip->open($args[0])) { WP_CLI::error('Invalid ZIP.'); }
$root = WP_PLUGIN_DIR . '/eo-measurement-consent/';
$files = array();
foreach ($manifest['files'] as $entry) {
    $path = $entry['path'];
    if (!in_array($path, array('eo-measurement-consent.php', 'assets/consent-bridge.v1.js'), true)) { WP_CLI::error('Path outside consent release scope.'); }
    $content = $zip->getFromName($path);
    if (false === $content || !hash_equals($entry['sha256'], hash('sha256', $content))) { WP_CLI::error('Package hash mismatch.'); }
    if (file_exists($root . $path)) {
        if (!hash_equals($entry['previousSha256'] ?? '', hash_file('sha256', $root . $path))) { WP_CLI::error('Live consent file drift.'); }
    } elseif (!empty($entry['previousSha256'])) { WP_CLI::error('Expected consent file missing.'); }
    $files[$path] = $content;
}
$backup_path = sys_get_temp_dir() . '/efeonce-consent-before-' . gmdate('Ymd-His') . '.tar';
$backup = new PharData($backup_path);
$created = array();
foreach ($files as $path => $content) {
    if (file_exists($root . $path)) { $backup->addFile($root . $path, $path); } else { $created[] = $path; }
}
$backup->addFromString('release-manifest.json', wp_json_encode($manifest));
$backup->addFromString('created-paths.json', wp_json_encode($created));
// Asset first; plugin entry last. No unrelated file or option is overwritten.
foreach (array('assets/consent-bridge.v1.js', 'eo-measurement-consent.php') as $path) {
    $target = $root . $path;
    if (!wp_mkdir_p(dirname($target))) { WP_CLI::error('Cannot create consent directory.'); }
    $temp = $target . '.consent-new';
    if (file_put_contents($temp, $files[$path]) === false || !rename($temp, $target)) { WP_CLI::error('Consent write failed; backup ' . $backup_path); }
    if (function_exists('opcache_invalidate') && substr($path, -4) === '.php') { opcache_invalidate($target, true); }
}
require_once ABSPATH . 'wp-admin/includes/plugin.php';
wp_clean_plugins_cache();
$result = activate_plugin('eo-measurement-consent/eo-measurement-consent.php');
if (is_wp_error($result)) { WP_CLI::error('Consent plugin activation failed.'); }
WP_CLI::runcommand('cache flush', array('return' => true));
WP_CLI::runcommand('kinsta cache purge --all', array('return' => true));
echo wp_json_encode(array('status' => 'consent_bridge_installed', 'files' => count($files), 'backup' => $backup_path, 'serverRouting' => get_option('eo_measurement_server_routing', false), 'active' => is_plugin_active('eo-measurement-consent/eo-measurement-consent.php')), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
