<?php
/**
 * Guarded scoped deployment of the shared source-led widget base (contract source-led-core-release.v1): allowlist,
 * package hashes, previous-SHA drift guard, backup tar, shared base written before the landing bases, opcache reset.
 * Inputs: package.zip and manifest.json from build-source-led-core-package.cjs. Rollback: restore the printed tar.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected ZIP and manifest inputs.' ); }
$manifest = json_decode( file_get_contents( $args[1] ), true );
if ( ( $manifest['contract'] ?? '' ) !== 'source-led-core-release.v1' ) { WP_CLI::error( 'Invalid release contract.' ); }
$zip = new ZipArchive();
if ( true !== $zip->open( $args[0] ) ) { WP_CLI::error( 'Invalid ZIP.' ); }
$root = WP_PLUGIN_DIR . '/eo-elementor-widgets/';
$allowed = '#^includes/widgets/class-eo-(source-led|medios|performance)-landing-base\.php$#';
$files = array();
foreach ( $manifest['files'] as $entry ) {
	$path = $entry['path'];
	if ( strpos( $path, '..' ) !== false || ! preg_match( $allowed, $path ) ) { WP_CLI::error( 'Path outside the source-led core release scope.' ); }
	$content = $zip->getFromName( $path );
	if ( false === $content || ! hash_equals( $entry['sha256'], hash( 'sha256', $content ) ) ) { WP_CLI::error( 'Package hash mismatch: ' . $path ); }
	$exists = file_exists( $root . $path );
	if ( $exists && ! hash_equals( $entry['previousSha256'] ?? '', hash_file( 'sha256', $root . $path ) ) ) { WP_CLI::error( 'Live drift: ' . $path ); }
	if ( ! $exists && ! empty( $entry['previousSha256'] ) ) { WP_CLI::error( 'Expected live file missing: ' . $path ); }
	$files[ $path ] = $content;
}
$backup_path = sys_get_temp_dir() . '/eo-source-led-core-before-' . gmdate( 'Ymd-His' ) . '.tar';
$backup = new PharData( $backup_path );
$created = array();
foreach ( $files as $path => $content ) {
	if ( file_exists( $root . $path ) ) { $backup->addFile( $root . $path, $path ); } else { $created[] = $path; }
}
$backup->addFromString( 'release-manifest.json', wp_json_encode( $manifest ) );
$backup->addFromString( 'created-paths.json', wp_json_encode( $created ) );
// The landing bases require the shared base: write it first so no request ever loads a base without its parent.
$shared = 'includes/widgets/class-eo-source-led-landing-base.php';
if ( ! isset( $files[ $shared ] ) ) { WP_CLI::error( 'Package lacks the shared base.' ); }
$files = array( $shared => $files[ $shared ] ) + $files;
foreach ( $files as $path => $content ) {
	$target = $root . $path;
	if ( ! wp_mkdir_p( dirname( $target ) ) ) { WP_CLI::error( 'Cannot create scoped directory. Backup: ' . $backup_path ); }
	$temp = $target . '.source-led-new';
	if ( false === file_put_contents( $temp, $content ) || ! rename( $temp, $target ) ) { WP_CLI::error( 'Write failed. Restore backup: ' . $backup_path ); }
	if ( function_exists( 'opcache_invalidate' ) && substr( $path, -4 ) === '.php' ) { opcache_invalidate( $target, true ); }
}
$zip->close();
if ( class_exists( '\Elementor\Plugin' ) ) { \Elementor\Plugin::$instance->files_manager->clear_cache(); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'source_led_core_installed', 'backup' => $backup_path, 'files' => count( $files ) ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
