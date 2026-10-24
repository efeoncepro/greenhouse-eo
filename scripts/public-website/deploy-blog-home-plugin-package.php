<?php
/**
 * Guarded scoped deployment of the eo-blog-home plugin (contract eo-blog-home-release.v1, TASK-2051): allowlist,
 * package hashes, previous-SHA drift guard, backup tar, main file written last, opcache invalidation and activation.
 * Installing it changes no page: /blog/ switches only with blog-v3/publish-blog-home-page.php (separate approval).
 * Inputs: package.zip and manifest.json from build-blog-home-plugin-package.cjs.
 * Rollback: undo the page cutover first if it ran, then `wp plugin deactivate eo-blog-home` and restore the printed tar
 * (or delete the created paths it lists).
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected ZIP and manifest inputs.' ); }
$manifest = json_decode( file_get_contents( $args[1] ), true );
if ( ( $manifest['contract'] ?? '' ) !== 'eo-blog-home-release.v1' ) { WP_CLI::error( 'Invalid release contract.' ); }
$zip = new ZipArchive();
if ( true !== $zip->open( $args[0] ) ) { WP_CLI::error( 'Invalid ZIP.' ); }
$root    = WP_PLUGIN_DIR . '/eo-blog-home/';
$allowed = '#^(eo-blog-home\.php|includes/class-eobh-[a-z]+\.php|assets/js/(dc-runtime|boot)\.js|assets/css/eobh-host\.css|assets/generated/(portada|tablet|movil)\.(js|css|ast\.json)|assets/generated/(blog-home-base\.css|manifest\.json|fixture\.(portada|movil)\.json)|assets/img/[0-9a-f]{32}\.(svg|webp|png))$#';
$main    = 'eo-blog-home.php';
$files   = array();
foreach ( $manifest['files'] as $entry ) {
	$path = $entry['path'];
	if ( strpos( $path, '..' ) !== false || ! preg_match( $allowed, $path ) ) { WP_CLI::error( 'Path outside the eo-blog-home release scope: ' . $path ); }
	$content = $zip->getFromName( $path );
	if ( false === $content || ! hash_equals( $entry['sha256'], hash( 'sha256', $content ) ) ) { WP_CLI::error( 'Package hash mismatch: ' . $path ); }
	$exists = file_exists( $root . $path );
	if ( $exists && ! hash_equals( $entry['previousSha256'] ?? '', hash_file( 'sha256', $root . $path ) ) ) { WP_CLI::error( 'Live drift: ' . $path ); }
	if ( ! $exists && ! empty( $entry['previousSha256'] ) ) { WP_CLI::error( 'Expected live file missing: ' . $path ); }
	$files[ $path ] = $content;
}
if ( ! isset( $files[ $main ] ) ) { WP_CLI::error( 'Package lacks the plugin main file.' ); }
$backup_path = sys_get_temp_dir() . '/eo-blog-home-before-' . gmdate( 'Ymd-His' ) . '.tar';
$backup      = new PharData( $backup_path );
$created     = array();
foreach ( $files as $path => $content ) {
	if ( file_exists( $root . $path ) ) { $backup->addFile( $root . $path, $path ); } else { $created[] = $path; }
}
$backup->addFromString( 'release-manifest.json', wp_json_encode( $manifest ) );
$backup->addFromString( 'created-paths.json', wp_json_encode( $created ) );
// The main file requires the includes and schema: write it last so WordPress never loads a half-written plugin.
$files = array_diff_key( $files, array( $main => true ) ) + array( $main => $files[ $main ] );
foreach ( $files as $path => $content ) {
	$target = $root . $path;
	if ( ! wp_mkdir_p( dirname( $target ) ) ) { WP_CLI::error( 'Cannot create scoped directory. Backup: ' . $backup_path ); }
	$temp = $target . '.eobh-new';
	if ( false === file_put_contents( $temp, $content ) || ! rename( $temp, $target ) ) { WP_CLI::error( 'Write failed. Restore backup: ' . $backup_path ); }
	if ( function_exists( 'opcache_invalidate' ) && substr( $path, -4 ) === '.php' ) { opcache_invalidate( $target, true ); }
}
$zip->close();
require_once ABSPATH . 'wp-admin/includes/plugin.php';
// WP-CLI read the plugin list when it booted, before these files existed: without this, activation says «invalid header».
wp_cache_delete( 'plugins', 'plugins' );
$was_active = is_plugin_active( 'eo-blog-home/eo-blog-home.php' );
if ( ! $was_active ) {
	$activated = activate_plugin( 'eo-blog-home/eo-blog-home.php' );
	if ( is_wp_error( $activated ) ) { WP_CLI::error( 'Activation failed: ' . $activated->get_error_message() . ' Backup: ' . $backup_path ); }
}
echo wp_json_encode(
	array(
		'status'       => 'eo_blog_home_installed',
		'backup'       => $backup_path,
		'files'        => count( $files ),
		'created'      => count( $created ),
		'was_active'   => $was_active,
		'active'       => is_plugin_active( 'eo-blog-home/eo-blog-home.php' ),
		'runtime'      => $manifest['runtimeCommit'] ?? null,
		'page'         => 'unchanged: /blog/ switches only with blog-v3/publish-blog-home-page.php',
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
) . PHP_EOL;
