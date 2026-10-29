<?php
/**
 * Guarded scoped deployment of the eo-portfolio plugin (contract eo-portfolio-release.v1, TASK-2047): allowlist,
 * package hashes, previous-SHA drift guard, backup tar, main file written last, opcache invalidation and activation.
 * Refuses before writing when the portfolio page (/portafolio/) has child pages: the entry URL rule
 * /portafolio/<slug>/ would shadow them. It never writes a project: the plugin starts with none.
 * Inputs: package.zip and manifest.json from build-portfolio-plugin-package.cjs.
 * Rollback: `wp plugin deactivate eo-portfolio` (its rewrite rules leave with it), then restore the printed tar (or
 * delete the created paths it lists).
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected ZIP and manifest inputs.' ); }
$manifest = json_decode( file_get_contents( $args[1] ), true );
if ( ( $manifest['contract'] ?? '' ) !== 'eo-portfolio-release.v1' ) { WP_CLI::error( 'Invalid release contract.' ); }
$zip = new ZipArchive();
if ( true !== $zip->open( $args[0] ) ) { WP_CLI::error( 'Invalid ZIP.' ); }

$index = get_page_by_path( 'portafolio' );
if ( $index ) {
	$children = get_pages( array( 'child_of' => $index->ID, 'post_status' => array( 'publish', 'draft', 'private', 'pending', 'future' ) ) );
	if ( $children ) {
		WP_CLI::error( 'The portfolio page has child pages that /portafolio/<slug>/ would shadow: ' . wp_json_encode( wp_list_pluck( $children, 'post_name', 'ID' ) ) );
	}
}

$root    = WP_PLUGIN_DIR . '/eo-portfolio/';
$allowed = '#^(eo-portfolio\.php|includes/class-eop-[a-z]+\.php|schema/[A-Za-z0-9.-]+\.json|assets/admin\.(css|js))$#';
$main    = 'eo-portfolio.php';
$files   = array();
foreach ( $manifest['files'] as $entry ) {
	$path = $entry['path'];
	if ( strpos( $path, '..' ) !== false || ! preg_match( $allowed, $path ) ) { WP_CLI::error( 'Path outside the eo-portfolio release scope: ' . $path ); }
	$content = $zip->getFromName( $path );
	if ( false === $content || ! hash_equals( $entry['sha256'], hash( 'sha256', $content ) ) ) { WP_CLI::error( 'Package hash mismatch: ' . $path ); }
	$exists = file_exists( $root . $path );
	if ( $exists && ! hash_equals( $entry['previousSha256'] ?? '', hash_file( 'sha256', $root . $path ) ) ) { WP_CLI::error( 'Live drift: ' . $path ); }
	if ( ! $exists && ! empty( $entry['previousSha256'] ) ) { WP_CLI::error( 'Expected live file missing: ' . $path ); }
	$files[ $path ] = $content;
}
if ( ! isset( $files[ $main ] ) ) { WP_CLI::error( 'Package lacks the plugin main file.' ); }
$backup_path = sys_get_temp_dir() . '/eo-portfolio-before-' . gmdate( 'Ymd-His' ) . '.tar';
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
	$temp = $target . '.eop-new';
	if ( false === file_put_contents( $temp, $content ) || ! rename( $temp, $target ) ) { WP_CLI::error( 'Write failed. Restore backup: ' . $backup_path ); }
	if ( function_exists( 'opcache_invalidate' ) && substr( $path, -4 ) === '.php' ) { opcache_invalidate( $target, true ); }
}
$zip->close();
require_once ABSPATH . 'wp-admin/includes/plugin.php';
// WP-CLI read the plugin list when it booted, before these files existed: without this, activation says «invalid header».
wp_cache_delete( 'plugins', 'plugins' );
$was_active = is_plugin_active( 'eo-portfolio/eo-portfolio.php' );
if ( ! $was_active ) {
	// Activation registers the post type and flushes the rewrite rules once (eop_activate).
	$activated = activate_plugin( 'eo-portfolio/eo-portfolio.php' );
	if ( is_wp_error( $activated ) ) { WP_CLI::error( 'Activation failed: ' . $activated->get_error_message() . ' Backup: ' . $backup_path ); }
}
echo wp_json_encode(
	array(
		'status'     => 'eo_portfolio_installed',
		'backup'     => $backup_path,
		'files'      => count( $files ),
		'created'    => count( $created ),
		'was_active' => $was_active,
		'active'     => is_plugin_active( 'eo-portfolio/eo-portfolio.php' ),
		'runtime'    => $manifest['runtimeCommit'] ?? null,
		'projects'   => 'none written',
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
) . PHP_EOL;
