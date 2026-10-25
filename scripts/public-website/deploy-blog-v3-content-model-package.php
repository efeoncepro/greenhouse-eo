<?php
/**
 * Guarded scoped deployment of efeonce-editorial-blocks 0.2.0 with the blog home content model
 * (contract eo-blog-v3-content-model-release.v1, TASK-2050, PDR-029): allowlist, package hashes, previous-SHA drift
 * guard, backup tar, main file written last, opcache invalidation, and the flag forced off.
 *
 * Installing it changes nothing a visitor sees: types, taxonomy and metas get registered, the `eo_content_model_enabled`
 * option stays 0 (created at 0 if missing), so /blog/ keeps its content and events have no public URL. The plugin is
 * already active on the live site; this script refuses to activate it (activation is not part of this release).
 *
 * Inputs: package.zip and manifest.json from build-blog-v3-content-model-package.cjs. Dry run: add a third input with
 * the literal text `dry-run` (any file whose content is `dry-run`) to run every guard and write nothing.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-blog-v3-content-model-package.php \
 *     --input-file tmp/blog-v3-content-model-release/package.zip \
 *     --input-file tmp/blog-v3-content-model-release/manifest.json [--input-file tmp/dry-run.txt]
 *
 * Rollback: restore the printed tar over wp-content/plugins/efeonce-editorial-blocks/ (and delete the created paths
 * it lists), or, faster and with no file change, keep the files and leave the option at 0.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) < 2 ) { WP_CLI::error( 'Expected ZIP and manifest inputs.' ); }
$dry      = isset( $args[2] ) && 'dry-run' === trim( (string) file_get_contents( $args[2] ) );
$manifest = json_decode( file_get_contents( $args[1] ), true );
if ( ( $manifest['contract'] ?? '' ) !== 'eo-blog-v3-content-model-release.v1' ) { WP_CLI::error( 'Invalid release contract.' ); }
$zip = new ZipArchive();
if ( true !== $zip->open( $args[0] ) ) { WP_CLI::error( 'Invalid ZIP.' ); }
require_once ABSPATH . 'wp-admin/includes/plugin.php';
if ( ! is_plugin_active( 'efeonce-editorial-blocks/efeonce-editorial-blocks.php' ) ) { WP_CLI::error( 'efeonce-editorial-blocks is not active on this site: this release only updates an active plugin.' ); }
$root    = WP_PLUGIN_DIR . '/efeonce-editorial-blocks/';
$allowed = '#^(efeonce-editorial-blocks\.php|readme\.txt|src/glitch-drop/(block\.json|index\.js|render\.php|style\.css|glitch-mark\.svg)|includes/content-model/(bootstrap\.php|class-eo-[a-z-]+\.php|assets/[a-z-]+\.(js|css))|includes/faq/(class-eo-faq\.php|faq\.css|faq\.js)|includes/editorial/(class-eo-editorial-styles\.php|editorial\.css|ohio-host\.css)|includes/social/class-eo-og-alt\.php|includes/growth-cta/class-eo-growth-cta\.php|src/growth-cta/(block\.json|index\.js|render\.php|style\.css|host\.js|marks/[a-z0-9-]+\.svg))$#';
$main    = 'efeonce-editorial-blocks.php';
$files   = array();
foreach ( $manifest['files'] as $entry ) {
	$path = $entry['path'];
	if ( strpos( $path, '..' ) !== false || ! preg_match( $allowed, $path ) ) { WP_CLI::error( 'Path outside the content model release scope: ' . $path ); }
	$content = $zip->getFromName( $path );
	if ( false === $content || ! hash_equals( $entry['sha256'], hash( 'sha256', $content ) ) ) { WP_CLI::error( 'Package hash mismatch: ' . $path ); }
	$exists = file_exists( $root . $path );
	if ( $exists && ! hash_equals( $entry['previousSha256'] ?? '', hash_file( 'sha256', $root . $path ) ) ) { WP_CLI::error( 'Live drift: ' . $path ); }
	if ( ! $exists && ! empty( $entry['previousSha256'] ) ) { WP_CLI::error( 'Expected live file missing: ' . $path ); }
	$files[ $path ] = $content;
}
if ( ! isset( $files[ $main ], $files['includes/content-model/bootstrap.php'] ) ) { WP_CLI::error( 'Package lacks the plugin main file or the content model bootstrap.' ); }
$created = array_values( array_filter( array_keys( $files ), static fn( $p ) => ! file_exists( $root . $p ) ) );
$changed = array_values( array_filter( array_keys( $files ), static fn( $p ) => file_exists( $root . $p ) && ! hash_equals( hash( 'sha256', $files[ $p ] ), hash_file( 'sha256', $root . $p ) ) ) );
if ( $dry ) {
	echo wp_json_encode( array( 'status' => 'dry_run_ok', 'files' => count( $files ), 'created' => $created, 'changed' => $changed, 'flag' => get_option( 'eo_content_model_enabled', 'missing' ), 'runtime' => $manifest['runtimeCommit'] ?? null ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
	return;
}
// The visitor-facing part stays off until the operator turns it on with the published home (TASK-2051).
if ( false === get_option( 'eo_content_model_enabled', false ) ) { add_option( 'eo_content_model_enabled', 0, '', true ); }
if ( (int) get_option( 'eo_content_model_enabled' ) ) { WP_CLI::error( 'eo_content_model_enabled is already on: refusing to change code under a live model without a fresh review.' ); }
$backup_path = sys_get_temp_dir() . '/efeonce-editorial-blocks-before-' . gmdate( 'Ymd-His' ) . '.tar';
$backup      = new PharData( $backup_path );
foreach ( $files as $path => $content ) {
	if ( file_exists( $root . $path ) ) { $backup->addFile( $root . $path, $path ); }
}
$backup->addFromString( 'release-manifest.json', wp_json_encode( $manifest ) );
$backup->addFromString( 'created-paths.json', wp_json_encode( $created ) );
// The main file requires the content model bootstrap: write it last so WordPress never loads a half-written plugin.
$files = array_diff_key( $files, array( $main => true ) ) + array( $main => $files[ $main ] );
foreach ( $files as $path => $content ) {
	$target = $root . $path;
	if ( ! wp_mkdir_p( dirname( $target ) ) ) { WP_CLI::error( 'Cannot create scoped directory. Backup: ' . $backup_path ); }
	$temp = $target . '.eocm-new';
	if ( false === file_put_contents( $temp, $content ) || ! rename( $temp, $target ) ) { WP_CLI::error( 'Write failed. Restore backup: ' . $backup_path ); }
	if ( function_exists( 'opcache_invalidate' ) && substr( $path, -4 ) === '.php' ) { opcache_invalidate( $target, true ); }
}
$zip->close();
echo wp_json_encode(
	array(
		'status'  => 'eo_content_model_installed',
		'backup'  => $backup_path,
		'files'   => count( $files ),
		'created' => $created,
		'changed' => $changed,
		'flag'    => (int) get_option( 'eo_content_model_enabled' ),
		'runtime' => $manifest['runtimeCommit'] ?? null,
		'next'    => 'verify with scripts/public-website/blog-v3/verify-content-model.php (read-only); visitors see nothing until the flag is turned on',
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
) . PHP_EOL;
